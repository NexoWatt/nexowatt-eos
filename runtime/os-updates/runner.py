#!/usr/bin/python3
"""Fixed, root-only EOS OS maintenance; not an adapter command execution API.

APT verifies each release against the distro-specific Signed-By keyring. The
separate list cache/config excludes unsigned host sources and arbitrary hooks.
Package maintainer scripts remain privileged and can restart services.
"""
import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import signal
import stat
import subprocess
import sys
import tempfile
import time
import uuid
from urllib.parse import quote

STATE = Path('/var/lib/nexowatt-eos-os-updates')
POLICY = Path('/etc/nexowatt-eos-os-updates/policy.json')
UNIT = 'nexowatt-eos-os-updates.timer'
MAX_STATUS = 65536
MAX_CAPTURE = 4 * 1024 * 1024
RUNTIME_PINS = {'nodejs', 'npm'}
ERRORS = {
    'configuration-invalid', 'prerequisite-missing', 'unsupported-host',
    'apt-refresh-failed', 'upgrade-failed', 'upgrade-interrupted',
    'upgrade-timeout', 'pending-scan-failed', 'inventory-failed',
    'status-write-failed', 'internal-error',
}
TOOLS = ('/usr/bin/apt-get', '/usr/bin/apt-mark', '/usr/bin/dpkg',
         '/usr/bin/dpkg-query', '/usr/bin/unattended-upgrade',
         '/usr/sbin/needrestart', '/usr/bin/systemctl')
STOP_REQUESTED = False
ACTIVE_CHILD = None

class MaintenanceError(Exception):
    def __init__(self, code):
        self.code = code if code in ERRORS else 'internal-error'
        super().__init__(self.code)


def timestamp():
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')


def initial_status():
    return {
        'schemaVersion': 1, 'generatedAt': None, 'state': 'never-run',
        'lastAttemptAt': None, 'lastSuccessAt': None, 'lastError': None,
        'freshness': {'maxAgeSeconds': 129600},
        'policy': {'automatic': True, 'rebootAutomatic': False,
                   'schedule': '*-*-* 02:00:00 Europe/Berlin',
                   'randomizedDelaySeconds': 900, 'debianMajor': None,
                   'origins': [], 'serviceRestartsPossible': True},
        'timers': {'enabled': None, 'active': None, 'checkedAt': None},
        'pending': {'securityCount': None, 'heldSecurityCount': None,
                    'blockedSecurityCount': None, 'availableCount': None,
                    'vendorCount': None, 'packages': [], 'truncated': False},
        'reboot': {'state': 'unknown', 'evidence': []},
        'activation': {'state': 'unknown', 'serviceRestartCount': None,
                       'sessionRestartCount': None},
        'coverage': {'state': 'unknown', 'gaps': ['not-yet-checked']},
        'sbom': None,
    }


def trusted_path(path, directory=False):
    """Reject writable/symlinked trust boundaries, including ancestors.

    Root-controlled tool symlinks are resolved by callers; data/config writes
    never follow symlinks. A compromised EOS uid cannot redirect root writes.
    """
    path = Path(path)
    for item in [*reversed(path.parents), path]:
        s = item.lstat()
        if stat.S_ISLNK(s.st_mode) or s.st_uid != 0 or s.st_mode & 0o022:
            raise MaintenanceError('configuration-invalid')
        if item != path and not stat.S_ISDIR(s.st_mode):
            raise MaintenanceError('configuration-invalid')
    if directory != stat.S_ISDIR(s.st_mode):
        raise MaintenanceError('configuration-invalid')
    if not directory and not stat.S_ISREG(s.st_mode):
        raise MaintenanceError('configuration-invalid')
    return path


def read_json(path, limit=MAX_STATUS):
    trusted_path(path)
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    with os.fdopen(fd, 'rb') as f:
        data = f.read(limit + 1)
    if len(data) > limit:
        raise MaintenanceError('configuration-invalid')
    return json.loads(data)


def atomic_json(path, obj, limit=None):
    raw = (json.dumps(obj, ensure_ascii=True, sort_keys=True, separators=(',', ':')) + '\n').encode()
    if limit and len(raw) > limit:
        raise MaintenanceError('status-write-failed')
    trusted_path(path.parent, directory=True)
    if path.exists() or path.is_symlink():
        trusted_path(path)
    fd, tmp = tempfile.mkstemp(prefix='.eos-', dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as f:
            os.fchmod(f.fileno(), 0o644)
            f.write(raw)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
        dfd = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
        try:
            os.fsync(dfd)
        finally:
            os.close(dfd)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)
    return hashlib.sha256(raw).hexdigest()


def parse_os_release(text):
    values = {}
    for line in text.splitlines():
        match = re.fullmatch(r'(ID|VERSION_ID|VERSION_CODENAME)=(?:"([a-z0-9.]+)"|([a-z0-9.]+))', line)
        if match:
            values[match[1]] = match[2] or match[3]
    version_id = values.get('VERSION_ID', '')
    if not re.fullmatch(r'(12|13)(?:\.\d+)*', version_id):
        raise MaintenanceError('unsupported-host')
    major = version_id.split('.')[0]
    codename = {'12': 'bookworm', '13': 'trixie'}.get(major)
    if values.get('ID') not in {'debian', 'raspbian'} or not codename or values.get('VERSION_CODENAME') != codename:
        raise MaintenanceError('unsupported-host')
    return major, codename


def origin_allowed(origin, codename, raspberry_pi):
    if not origin.trusted:
        return False
    if origin.origin == 'Debian' and origin.label == 'Debian-Security':
        return origin.codename == codename + '-security'
    if origin.origin == 'Debian' and origin.label == 'Debian':
        return origin.codename in {codename, codename + '-updates'}
    return bool(raspberry_pi and origin.origin == 'Raspberry Pi Foundation'
                and origin.label == 'Raspberry Pi Foundation'
                and origin.codename == codename and origin.component == 'main')


def security_origin(origin, codename):
    return bool(origin.trusted and origin.origin == 'Debian'
                and origin.label == 'Debian-Security'
                and origin.codename == codename + '-security')


def apt_configuration(private, codename, arch, raspberry_pi):
    """Only fixed release identifiers can enter APT syntax; no user arguments."""
    if codename not in {'bookworm', 'trixie'} or arch not in {'arm64', 'amd64'}:
        raise MaintenanceError('unsupported-host')
    if not re.fullmatch(r'/[a-zA-Z0-9_./-]+', str(private)):
        raise MaintenanceError('configuration-invalid')
    sources = (
        f'Types: deb\nURIs: https://deb.debian.org/debian\nSuites: {codename} {codename}-updates\n'
        'Components: main contrib non-free non-free-firmware\n'
        f'Architectures: {arch}\nSigned-By: /usr/share/keyrings/debian-archive-keyring.gpg\n\n'
        f'Types: deb\nURIs: https://security.debian.org/debian-security\nSuites: {codename}-security\n'
        'Components: main contrib non-free non-free-firmware\n'
        f'Architectures: {arch}\nSigned-By: /usr/share/keyrings/debian-archive-keyring.gpg\n'
    )
    origins = [f'origin=Debian,codename={codename},label=Debian',
               f'origin=Debian,codename={codename}-updates,label=Debian',
               f'origin=Debian,codename={codename}-security,label=Debian-Security']
    if raspberry_pi:
        sources += ('\nTypes: deb\nURIs: https://archive.raspberrypi.com/debian\n'
                    f'Suites: {codename}\nComponents: main\nArchitectures: {arch}\n'
                    'Signed-By: /usr/share/keyrings/raspberrypi-archive-keyring.gpg\n')
        origins.append(f'origin=Raspberry Pi Foundation,codename={codename},label=Raspberry Pi Foundation,component=main')
    config = f'''// EOS fixed signed public origins. Do not include host apt.conf.d hooks.
Dir::Etc::parts "-";
Dir::Etc::main "-";
Dir::Etc::sourcelist "{private}/eos.sources";
Dir::Etc::sourceparts "-";
Dir::Etc::netrc "-";
Dir::Etc::netrcparts "-";
Dir::State::lists "{private}/lists";
Dir::Cache::archives "{private}/archives";
Dir::Cache::pkgcache "";
Dir::Cache::srcpkgcache "";
APT::Get::AllowUnauthenticated "false";
Acquire::AllowInsecureRepositories "false";
Acquire::AllowDowngradeToInsecureRepositories "false";
Acquire::Check-Valid-Until "true";
Acquire::Check-Date "true";
Acquire::https::Verify-Peer "true";
Acquire::https::Verify-Host "true";
Acquire::https::Timeout "60";
Acquire::Retries "2";
APT::Update::Error-Mode "any";
DPkg::Lock::Timeout "120";
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::AutoFixInterruptedDpkg "false";
Unattended-Upgrade::Remove-Unused-Dependencies "false";
Unattended-Upgrade::Remove-New-Unused-Dependencies "false";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "false";
Unattended-Upgrade::Allow-downgrade "false";
Unattended-Upgrade::Package-Blacklist {{ "^nodejs$"; "^npm$"; }};
Unattended-Upgrade::Origins-Pattern {{
'''
    config += ''.join(f'  "{origin}";\n' for origin in origins) + '};\n'
    return config, sources, origins


def pending_packages(cache, compare_versions, held, codename, raspberry_pi):
    details, security_count, held_count, blocked_count, available, vendor_count = [], 0, 0, 0, 0, 0
    outside = 0
    for package in cache:
        if not package.is_installed:
            continue
        installed = package.installed.version
        permitted = [v for v in package.versions if any(origin_allowed(o, codename, raspberry_pi) for o in v.origins)]
        if not any(compare_versions(v.version, installed) >= 0 for v in permitted):
            outside += 1
        newer = [v for v in permitted if compare_versions(v.version, installed) > 0]
        if not newer:
            continue
        available += 1
        security = [v for v in newer if any(security_origin(o, codename) for o in v.origins)]
        vendor = any(any(o.origin == 'Raspberry Pi Foundation' for o in v.origins) for v in newer)
        vendor_count += int(vendor)
        version = newer[0]
        for candidate in newer[1:]:
            if compare_versions(candidate.version, version.version) > 0:
                version = candidate
        name = package.name
        qualified_name = getattr(package, 'fullname', name)
        installed_arch = getattr(package.installed, 'architecture', '')
        held_package = any(n in held for n in {name, qualified_name, name.split(':')[0], name.split(':')[0] + ':' + installed_arch})
        candidate = package.candidate
        candidate_allowed = bool(candidate and any(origin_allowed(o, codename, raspberry_pi) for o in candidate.origins)
                                 and compare_versions(candidate.version, version.version) >= 0)
        reason = ('runtime-version-pin' if name.split(':')[0] in RUNTIME_PINS else
                  'package-held' if held_package else
                  'candidate-pinned-or-untrusted' if not candidate_allowed else
                  'remaining-after-maintenance')
        if security:
            security_count += 1
            held_count += int(held_package)
            blocked_count += 1  # remaining security packages are never reported as fixed
        if len(details) < 50:
            details.append({'name': name, 'installedVersion': installed,
                            'securityVersion': version.version, 'held': held_package,
                            'blockedReason': reason, 'securityClassified': bool(security)})
    return {'securityCount': security_count, 'heldSecurityCount': held_count,
            'blockedSecurityCount': blocked_count, 'availableCount': available,
            'vendorCount': vendor_count, 'packages': details, 'truncated': available > len(details)}, outside


def restart_status(text, marker_exists=False):
    """Absence of /run/reboot-required alone is never evidence of no reboot."""
    kernel = re.findall(r'^NEEDRESTART-KSTA: ([0-3])$', text, re.M)
    microcode = re.findall(r'^NEEDRESTART-UCSTA: ([0-3])$', text, re.M)
    valid = bool(re.search(r'^NEEDRESTART-VER: [0-9][^\n]*$', text, re.M))
    services = len(re.findall(r'^NEEDRESTART-SVC: .+$', text, re.M))
    sessions = len(re.findall(r'^NEEDRESTART-(?:SESS|CONT): .+$', text, re.M))
    reboot = 'unknown'
    evidence = []
    if marker_exists or any(k in {'2', '3'} for k in kernel + microcode):
        reboot = 'required'
        evidence = ['reboot-marker' if marker_exists else 'needrestart-kernel-or-microcode']
    elif valid and kernel == ['1'] and all(m == '1' for m in microcode):
        reboot = 'not-required'
        evidence = ['needrestart-kernel-current']
    activation = 'unknown' if not valid else 'required' if services or sessions else 'not-required'
    return {'state': reboot, 'evidence': evidence}, {
        'state': activation, 'serviceRestartCount': services if valid else None,
        'sessionRestartCount': sessions if valid else None}


def dpkg_sbom(text, generated_at):
    components = []
    for line in text.splitlines():
        fields = line.split('\t')
        if len(fields) != 4:
            raise MaintenanceError('inventory-failed')
        name, version, arch, status = fields
        if status != 'installed':
            continue
        if not re.fullmatch(r'[a-z0-9][a-z0-9+.-]*(?::[a-z0-9-]+)?', name) or not re.fullmatch(r'[a-z0-9-]+', arch) or not version or len(version) > 256:
            raise MaintenanceError('inventory-failed')
        ref = 'dpkg:' + quote(name, safe='') + ':' + quote(version, safe='') + ':' + arch
        components.append({'type': 'library', 'bom-ref': ref, 'name': name, 'version': version,
                           'properties': [{'name': 'eos:inventory:manager', 'value': 'dpkg'},
                                          {'name': 'eos:inventory:architecture', 'value': arch}]})
    if not components:
        raise MaintenanceError('inventory-failed')
    return {'bomFormat': 'CycloneDX', 'specVersion': '1.5', 'version': 1,
            'serialNumber': 'urn:uuid:' + str(uuid.uuid4()),
            'metadata': {'timestamp': generated_at,
                         'component': {'type': 'operating-system', 'name': 'EOS host installed dpkg inventory'},
                         'properties': [{'name': 'eos:inventory:scope', 'value': 'Installed dpkg packages only; excludes npm, firmware EEPROM, containers and manual software.'}]},
            'components': sorted(components, key=lambda c: c['bom-ref'])}


def signal_stop(_signal, _frame):
    global STOP_REQUESTED
    STOP_REQUESTED = True
    if ACTIVE_CHILD and ACTIVE_CHILD.poll() is None:
        # Signal unattended-upgrade only: its MinimalSteps handler finishes the
        # current dpkg transaction. Never SIGKILL the dpkg process group.
        ACTIVE_CHILD.send_signal(signal.SIGINT)


class Commands:
    def __init__(self, env, private, lock_fd):
        self.env, self.private, self.lock_fd = env, private, lock_fd

    def run(self, args, code, timeout=180, upgrade=False, allow_failure=False):
        global ACTIVE_CHILD
        if STOP_REQUESTED:
            raise MaintenanceError('upgrade-interrupted')
        with tempfile.TemporaryFile(dir=self.private) as capture:
            proc = subprocess.Popen(args, stdin=subprocess.DEVNULL, stdout=capture,
                                    stderr=subprocess.DEVNULL, env=self.env, cwd='/',
                                    pass_fds=(self.lock_fd,), close_fds=True)
            ACTIVE_CHILD = proc
            try:
                proc.wait(timeout=timeout)
            except subprocess.TimeoutExpired:
                proc.send_signal(signal.SIGINT if upgrade else signal.SIGTERM)
                try:
                    proc.wait(timeout=300 if upgrade else 30)
                except subprocess.TimeoutExpired:
                    # Preserve package transaction and inherited maintenance
                    # lock; no competing EOS run starts while child lives.
                    raise MaintenanceError('upgrade-timeout' if upgrade else code)
                raise MaintenanceError('upgrade-timeout' if upgrade else code)
            finally:
                ACTIVE_CHILD = None
            capture.seek(0)
            raw = capture.read(MAX_CAPTURE + 1)
            if len(raw) > MAX_CAPTURE:
                raise MaintenanceError(code)
            if STOP_REQUESTED:
                raise MaintenanceError('upgrade-interrupted')
            if proc.returncode and not allow_failure:
                raise MaintenanceError(code)
            return proc.returncode, raw.decode('utf-8', errors='replace')


def timer_status(commands):
    try:
        _, text = commands.run(['/usr/bin/systemctl', 'show', UNIT,
                                '--property=ActiveState', '--property=UnitFileState'],
                               'internal-error', timeout=30)
        values = dict(line.split('=', 1) for line in text.splitlines() if '=' in line)
        return {'enabled': values.get('UnitFileState') == 'enabled',
                'active': values.get('ActiveState') == 'active', 'checkedAt': timestamp()}
    except (MaintenanceError, OSError):
        return {'enabled': None, 'active': None, 'checkedAt': timestamp()}


def distro_automation_gap(commands):
    """Report separate distro automation; never silently disable host policy."""
    try:
        _, text = commands.run(['/usr/bin/systemctl', 'show', 'apt-daily-upgrade.timer',
                                '--property=ActiveState', '--property=UnitFileState'],
                               'internal-error', timeout=30)
        values = dict(line.split('=', 1) for line in text.splitlines() if '=' in line)
        if values.get('ActiveState') == 'active' or values.get('UnitFileState') in {'enabled', 'enabled-runtime'}:
            return 'independent-distro-update-automation-active'
        if values.get('ActiveState') == 'inactive' and values.get('UnitFileState') in {'disabled', 'masked'}:
            return None
    except (MaintenanceError, OSError):
        pass
    return 'independent-distro-update-automation-unknown'


def classify(status):
    if not status['policy']['automatic']:
        return 'disabled'
    if status['lastError']:
        return 'error'
    if (status['coverage']['state'] != 'complete-for-configured-origins'
        or status['pending']['availableCount'] != 0
        or status['reboot']['state'] != 'not-required'
        or status['activation']['state'] != 'not-required'
        or status['timers']['enabled'] is not True
        or status['timers']['active'] is not True):
        return 'attention'
    return 'ok'


def main():
    if os.geteuid() != 0 or len(sys.argv) != 1:
        return 2
    trusted_path(STATE, directory=True)
    private = STATE / 'private'
    trusted_path(private, directory=True)
    if stat.S_IMODE(private.stat().st_mode) != 0o711:
        raise MaintenanceError('configuration-invalid')
    lock_fd = os.open(private / 'maintenance.lock', os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
    try:
        fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        os.close(lock_fd)
        return 3
    previous = read_json(STATE / 'status.json') if (STATE / 'status.json').exists() else initial_status()
    status = initial_status()
    status['lastSuccessAt'] = previous.get('lastSuccessAt')
    status['sbom'] = previous.get('sbom')
    status.update(generatedAt=timestamp(), lastAttemptAt=timestamp(), state='running')
    atomic_json(STATE / 'status.json', status, MAX_STATUS)
    try:
        policy = read_json(POLICY, 4096)
        if set(policy) != {'schemaVersion', 'enabled'} or policy['schemaVersion'] != 1 or type(policy['enabled']) is not bool:
            raise MaintenanceError('configuration-invalid')
        status['policy']['automatic'] = policy['enabled']
        for tool in TOOLS:
            trusted_path(Path(tool).resolve(strict=True))
        env = {'PATH': '/usr/sbin:/usr/bin:/sbin:/bin', 'LANG': 'C.UTF-8',
               'LC_ALL': 'C.UTF-8', 'HOME': '/root', 'DEBIAN_FRONTEND': 'noninteractive',
               'NEEDRESTART_MODE': 'l', 'APT_CONFIG': str(private / 'apt.conf')}
        commands = Commands(env, private, lock_fd)
        status['timers'] = timer_status(commands)
        automation_gap = distro_automation_gap(commands)
        if not policy['enabled']:
            status['state'] = 'disabled'
            status['generatedAt'] = timestamp()
            atomic_json(STATE / 'status.json', status, MAX_STATUS)
            return 0
        os_release = trusted_path(Path('/etc/os-release').resolve(strict=True))
        major, codename = parse_os_release(os_release.read_text())
        status['policy']['debianMajor'] = major
        _, arch_text = commands.run(['/usr/bin/dpkg', '--print-architecture'], 'unsupported-host')
        arch = arch_text.strip()
        pi_keyring = Path('/usr/share/keyrings/raspberrypi-archive-keyring.gpg')
        model = Path('/proc/device-tree/model')
        raspberry_pi = (pi_keyring.exists() or Path('/etc/rpi-issue').exists()
                        or (model.exists() and model.read_bytes()[:64].startswith(b'Raspberry Pi')))
        trusted_path('/usr/share/keyrings/debian-archive-keyring.gpg')
        if raspberry_pi:
            trusted_path(pi_keyring)
        # Honour root-owned APT preferences and dpkg holds. No host APT hooks,
        # credentials, sources or arbitrary acquisition methods are imported.
        for pref in [Path('/etc/apt/preferences'), Path('/etc/apt/preferences.d')]:
            if pref.exists():
                trusted_path(pref, directory=pref.is_dir())
                if pref.is_dir():
                    for child in pref.iterdir():
                        trusted_path(child)
        config, sources, origins = apt_configuration(private, codename, arch, raspberry_pi)
        status['policy']['origins'] = origins
        for name, contents in [('apt.conf', config), ('eos.sources', sources)]:
            target = private / name
            if target.exists() or target.is_symlink():
                trusted_path(target)
            fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW, 0o644)
            with os.fdopen(fd, 'w') as f:
                f.write(contents)
        for name in ['lists', 'archives']:
            folder = private / name
            folder.mkdir(mode=0o755, exist_ok=True)
            trusted_path(folder, directory=True)
        # No --allow-* or signature bypass, and any failed origin refresh fails
        # the entire run rather than accepting stale partial APT results.
        commands.run(['/usr/bin/apt-get', 'update'], 'apt-refresh-failed', timeout=600)
        commands.run(['/usr/bin/unattended-upgrade'], 'upgrade-failed', timeout=5400, upgrade=True)
        os.environ['APT_CONFIG'] = env['APT_CONFIG']
        try:
            import apt
            import apt_pkg
            apt_pkg.init_config()
            apt_pkg.init_system()
            cache = apt.Cache()
            _, held_text = commands.run(['/usr/bin/apt-mark', 'showhold'], 'pending-scan-failed')
            pending, outside = pending_packages(cache, apt_pkg.version_compare,
                                                set(held_text.splitlines()), codename, raspberry_pi)
        except MaintenanceError:
            raise
        except Exception:
            raise MaintenanceError('pending-scan-failed') from None
        status['pending'] = pending
        gaps = [automation_gap] if automation_gap else []
        if raspberry_pi:
            gaps.append('raspberry-pi-main-mixes-security-and-feature-updates')
        if outside:
            gaps.append('installed-packages-outside-configured-origins')
        if any(p['blockedReason'] == 'runtime-version-pin' for p in pending['packages']):
            gaps.append('EOS-OS-UPDATES-RUNTIME-PIN-20261001')
        status['coverage'] = {'state': 'gap' if gaps else 'complete-for-configured-origins',
                              'gaps': gaps, 'outsideConfiguredOriginsCount': outside}
        try:
            _, restart_text = commands.run(['/usr/sbin/needrestart', '-b', '-r', 'l'], 'internal-error')
            status['reboot'], status['activation'] = restart_status(restart_text, Path('/run/reboot-required').exists())
        except MaintenanceError:
            status['reboot'], status['activation'] = restart_status('', Path('/run/reboot-required').exists())
        _, inventory = commands.run(['/usr/bin/dpkg-query', '-W', '-f=${binary:Package}\t${Version}\t${Architecture}\t${db:Status-Status}\n'], 'inventory-failed')
        when = timestamp()
        bom = dpkg_sbom(inventory, when)
        digest = atomic_json(STATE / 'installed-packages.cdx.json', bom)
        status['sbom'] = {'path': 'installed-packages.cdx.json', 'sha256': digest,
                          'generatedAt': when, 'components': len(bom['components'])}
        status['lastSuccessAt'] = when  # execution succeeded; pending/coverage remain independently visible
        status['state'] = classify(status)
    except (FileNotFoundError, PermissionError):
        status['lastError'] = {'code': 'prerequisite-missing', 'message': 'OS maintenance prerequisite missing or inaccessible.'}
        status['state'] = 'error'
    except MaintenanceError as error:
        status['lastError'] = {'code': error.code, 'message': 'OS maintenance did not complete; service investigation required.'}
        status['state'] = 'error'
    except Exception:
        status['lastError'] = {'code': 'internal-error', 'message': 'OS maintenance did not complete; service investigation required.'}
        status['state'] = 'error'
    finally:
        status['generatedAt'] = timestamp()
        atomic_json(STATE / 'status.json', status, MAX_STATUS)
        os.close(lock_fd)
    return 1 if status['state'] == 'error' else 0


if __name__ == '__main__':
    signal.signal(signal.SIGINT, signal_stop)
    signal.signal(signal.SIGTERM, signal_stop)
    try:
        sys.exit(main())
    except Exception:
        # Configuration/path failures before trusted status access must never
        # fall back to an attacker-controlled write destination or dump data.
        print('EOS OS maintenance failed before trusted status publication.', file=sys.stderr)
        sys.exit(2)
