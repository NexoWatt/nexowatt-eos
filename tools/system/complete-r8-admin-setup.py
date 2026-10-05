#!/usr/bin/python3
"""Complete only the legacy Admin wizard on an already enrolled R8 test Pi.

Run the commit/hash-pinned helper and sibling SQL from a private root directory.
No runtime files, credentials, license data or service configuration are changed.
"""
import hashlib
import datetime
import json
import os
import re
from pathlib import Path
import signal
import stat
import subprocess
import sys

RELEASE = 'eb3d1747c35988bdf8785e7a5cdfc786ab356fa87149054767d7c0ed211b7ea7'
KEY = 'bc104daef9346ef31fe7b51d447bc8d3c5103aa5e6cf532e7a83ea17551280c5'
SQL_SHA256 = '091406fd74dd9a1814c5c20d0f588ae7dc97f1020609ac581612bdfd0b79d8b3'
DIRECTORY = Path('/etc/nexowatt-eos')
ENV = {'PATH': '/usr/sbin:/usr/bin:/sbin:/bin', 'LC_ALL': 'C'}
SERVICES = ['nexowatt-eos-controller.service', 'nexowatt-eos-postgresql.service']


def require(condition, code):
    if not condition:
        raise ValueError(code)


def trusted(path):
    path = Path(path)
    require(path.is_absolute(), 'ADMIN_SETUP_PATH')
    for part in list(reversed(path.parents)) + [path]:
        info = part.lstat()
        require(info.st_uid == 0 and not info.st_mode & 0o022 and
                not stat.S_ISLNK(info.st_mode), 'ADMIN_SETUP_OWNER')
    return info


def read(path, limit=16384):
    info = trusted(path)
    require(stat.S_ISREG(info.st_mode) and info.st_nlink == 1 and
            info.st_size <= limit, 'ADMIN_SETUP_FILE')
    with open(path, 'rb') as stream:
        data = stream.read(limit + 1)
    require(len(data) <= limit, 'ADMIN_SETUP_SIZE')
    return data


def validate_records(state, completion):
    require(type(state.get('schemaVersion')) is int and state['schemaVersion'] == 1 and state.get('sequence') == 11 and
            state.get('releaseId') == RELEASE and state.get('publicKeySha256') == KEY,
            'ADMIN_SETUP_R8_REQUIRED')
    require(set(completion) == {'schemaVersion', 'releaseId', 'setupId', 'completedAt', 'licenseConfigured', 'physicalControlEnabled'} and
            type(completion.get('schemaVersion')) is int and completion['schemaVersion'] == 1 and completion.get('releaseId') == RELEASE and
            completion.get('physicalControlEnabled') is False and
            isinstance(completion.get('setupId'), str) and re.fullmatch(r'[a-f0-9]{32}', completion['setupId']) and
            type(completion.get('licenseConfigured')) is bool and
            isinstance(completion.get('completedAt'), str) and
            re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z', completion['completedAt']),
            'ADMIN_SETUP_COMPLETED_FIRST_START_REQUIRED')
    try:
        datetime.datetime.strptime(completion['completedAt'], '%Y-%m-%dT%H:%M:%S.%fZ')
    except ValueError:
        raise ValueError('ADMIN_SETUP_COMPLETED_FIRST_START_REQUIRED') from None


def check_release():
    state = read(DIRECTORY / 'release-state.json')
    completion = read(DIRECTORY / 'first-start-complete.json')
    validate_records(json.loads(state), json.loads(completion))
    current = Path('/opt/nexowatt/eos/current')
    trusted(current.parent)
    info = current.lstat()
    target = '/opt/nexowatt/eos/releases/' + RELEASE
    require(stat.S_ISLNK(info.st_mode) and info.st_uid == 0 and
            os.readlink(current) == target, 'ADMIN_SETUP_R8_POINTER')
    trusted(Path(target))
    require(not os.path.lexists(DIRECTORY / 'maintenance-start.json'), 'ADMIN_SETUP_MAINTENANCE')
    return state, completion


def run(command, **kwargs):
    return subprocess.run(command, env=ENV, capture_output=True, timeout=30, check=False, **kwargs)


def check_services():
    result = run(['/usr/bin/systemctl', 'is-active', *SERVICES])
    require(result.returncode == 0 and result.stdout.splitlines() == [b'active', b'active'],
            'ADMIN_SETUP_SERVICES_REQUIRED')


def interrupted(_signum, _frame):
    raise ValueError('ADMIN_SETUP_INTERRUPTED')


def main():
    require(os.geteuid() == 0 and len(sys.argv) == 1, 'ADMIN_SETUP_ROOT_NO_ARGUMENTS')
    os.umask(0o077)
    for name in ('SIGTERM', 'SIGHUP'):
        signal.signal(getattr(signal, name), interrupted)
    script = Path(__file__).absolute()
    read(script, 16384)
    require(not script.parent.stat().st_mode & 0o077, 'ADMIN_SETUP_PRIVATE_DIRECTORY')
    sql = read(script.with_suffix('.sql'), 32768)
    require(hashlib.sha256(sql).hexdigest() == SQL_SHA256, 'ADMIN_SETUP_SQL_HASH')
    trusted(DIRECTORY)
    for tool in ['/usr/bin/systemctl', '/usr/sbin/runuser', '/usr/lib/postgresql/17/bin/psql']:
        trusted(Path(tool))
    original = check_release()
    check_services()
    lock_path = DIRECTORY / '.activation.lock'
    # Same exclusive lock used by release/onboarding coordinators. A process
    # crash leaves a boot-blocking lock; never remove another operation's lock.
    fd = os.open(lock_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    identity = os.fstat(fd)
    try:
        os.write(fd, (json.dumps({'operation': 'complete-r8-admin-setup', 'pid': os.getpid()}) + '\n').encode())
        os.fsync(fd)
        require(check_release() == original, 'ADMIN_SETUP_RELEASE_CHANGED')
        check_services()
        result = run(['/usr/sbin/runuser', '-u', 'eos-postgres', '--',
                      '/usr/lib/postgresql/17/bin/psql', '-X', '-w', '-q', '-t', '-A',
                      '--set=ON_ERROR_STOP=1', '-h', '/run/nexowatt-eos-postgresql',
                      '-p', '15432', '-U', 'eos_bootstrap', '-d', 'eos'], input=sql)
        # Never echo psql diagnostics: SQL errors can contain object contents.
        require(result.returncode == 0 and result.stdout.strip() == b'EOS_R8_ADMIN_SETUP_COMPLETE',
                'ADMIN_SETUP_DATABASE_REJECTED')
        require(check_release() == original, 'ADMIN_SETUP_RELEASE_CHANGED')
    finally:
        os.close(fd)
        current = lock_path.lstat()
        require((current.st_dev, current.st_ino) == (identity.st_dev, identity.st_ino),
                'ADMIN_SETUP_LOCK_CHANGED')
        lock_path.unlink()
    print('{"ok":true,"status":"ADMIN_SETUP_COMPLETED","restartRequired":false}')


if __name__ == '__main__':
    try:
        main()
    except (Exception, KeyboardInterrupt) as error:
        code = str(error) if isinstance(error, ValueError) and str(error).startswith('ADMIN_SETUP_') else 'ADMIN_SETUP_FAILED'
        print(json.dumps({'ok': False, 'code': code}), file=sys.stderr)
        sys.exit(1)
