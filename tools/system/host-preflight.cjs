#!/usr/bin/env node
'use strict';
/** Read-only target check. Version observations are not vulnerability clearance. */
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const osInfo = require('node:os');

const ACCOUNTS = ['eos-runtime', 'eos-redis-objects', 'eos-redis-states'];
const REQUIRED = ['/usr/bin/node', '/usr/bin/redis-server', '/usr/bin/systemctl', '/usr/sbin/useradd', '/usr/sbin/groupadd', '/usr/sbin/getcap', '/usr/bin/openssl', '/usr/bin/getent', '/usr/bin/chown', '/usr/bin/ss', '/usr/bin/id', '/usr/sbin/nologin',
    '/usr/bin/python3', '/usr/bin/apt-get', '/usr/bin/apt-mark', '/usr/bin/dpkg', '/usr/bin/dpkg-query', '/usr/bin/unattended-upgrade', '/usr/sbin/needrestart'];
const OS_UPDATE_PACKAGES = Object.freeze(['python3', 'python3-apt', 'unattended-upgrades', 'needrestart', 'debian-archive-keyring', 'ca-certificates']);
// Reviewed distribution families for isolated test installation. These bounds
// are compatibility contracts, not patch-level security clearance. Keep the
// authenticated Redis TLS probe and target systemd acceptance as separate gates.
const HOST_PROFILES = Object.freeze({
    '12': Object.freeze({ minimumSystemd: 252, redisMajor: 7 }),
    '13': Object.freeze({ minimumSystemd: 257, redisMajor: 8 }),
});
// Fail closed for NEW installations until an exact, remediated Redis artifact
// has been admitted. The previous banner-only presence check did not cover OS
// packages. A signed EOS/npm bundle cannot vouch for a separately installed DB.
// No CLI switch or environment variable can acknowledge this release hold.
const REDIS_SECURITY_HOLD = Object.freeze({
    findingId: 'EOS-HOST-REDIS-20261001',
    status: 'blocked-pending-reviewed-redis-artifact',
    source: 'https://security-tracker.debian.org/tracker/source-package/redis',
    reviewedAt: '2026-10-01',
    advisories: Object.freeze(['CVE-2026-81934', 'CVE-2026-82631']),
    installedPackageAssessment: 'not-established-by-server-version-banner',
});
function parseOsRelease(text) {
    const result = {};
    for (const line of text.split('\n')) {
        const match = /^([A-Z_]+)=(?:"([^"\n]*)"|'([^'\n]*)'|([^\s#]*))$/.exec(line.trim());
        if (match) result[match[1]] = match[2] ?? match[3] ?? match[4];
    }
    return result;
}
function command(file, args, options = {}) {
    const run = cp.spawnSync(file, args, { encoding: 'utf8', timeout: 10000, maxBuffer: 65536,
        env: { PATH: '/usr/sbin:/usr/bin:/sbin:/bin', LANG: 'C', LC_ALL: 'C' }, ...options });
    return { status: run.status, stdout: run.stdout || '', stderr: run.stderr || '', error: run.error?.code || null };
}
function toolTrust(file, root = '/', { executable = true } = {}) {
    // Distribution symlinks are allowed only through protected, root-controlled
    // paths. The alternate root is an internal fixture boundary, never a CLI flag.
    const base = path.resolve(root), requested = path.join(base, file);
    const expectedOwner = base === '/' ? 0 : process.getuid?.();
    const runtimeExecutable = ['/usr/bin/node', '/usr/bin/redis-server'].includes(file);
    const checked = new Set();
    function chain(value, depth = 0) {
        if (depth > 32 || base !== '/' && value !== base && !value.startsWith(base + path.sep)) throw new Error('UNTRUSTED_TOOL_PATH');
        let cursor = base;
        for (const part of [null, ...path.relative(base, value).split(path.sep).filter(Boolean)]) {
            if (part) cursor = path.join(cursor, part);
            if (checked.has(cursor)) continue;
            const stat = fs.lstatSync(cursor);
            if (stat.uid !== expectedOwner) throw new Error('UNTRUSTED_TOOL_OWNER');
            if (stat.isSymbolicLink()) { chain(fs.realpathSync(cursor), depth + 1); checked.add(cursor); continue; }
            if (stat.mode & 0o022 || stat.isFile() && stat.mode & 0o6000 || !(stat.isDirectory() || stat.isFile())) throw new Error('UNTRUSTED_TOOL_MODE');
            if (stat.isDirectory() && runtimeExecutable && !(stat.mode & 0o001)) throw new Error('RUNTIME_TOOL_NOT_TRAVERSABLE');
            checked.add(cursor);
        }
    }
    try {
        chain(requested); const resolved = fs.realpathSync(requested); chain(resolved);
        const stat = fs.statSync(resolved);
        if (!stat.isFile() || executable && !(stat.mode & 0o111) || runtimeExecutable && (stat.mode & 0o005) !== 0o005) throw new Error('TOOL_NOT_EXECUTABLE');
        return { trusted: true, resolved };
    } catch { return { trusted: false, resolved: null }; }
}
function webPortsForCatalog(catalog) {
    // Call only after signature, catalog schema, admission and tree-digest
    // verification. No CLI port override can turn off the integrated gate.
    if (!Array.isArray(catalog?.entries)) throw Object.assign(new Error('PREFLIGHT_CATALOG_REQUIRED'), { code: 'PREFLIGHT_CATALOG_REQUIRED' });
    return catalog.entries.some(entry => ['iobroker.eos-admin', 'iobroker.nexowatt-ui'].includes(entry.package)) ? [8081, 8188] : [];
}
function inspectHost({ expectedNodeVersion, platform, root = '/', exec = command, uid = process.getuid?.(), webPorts = [], hostname = osInfo.hostname().split('.')[0] } = {}) {
    if (!Array.isArray(webPorts) || ![JSON.stringify([]), JSON.stringify([8081, 8188])].includes(JSON.stringify(webPorts))) throw Object.assign(new Error('PREFLIGHT_PORT_PROFILE'), { code: 'PREFLIGHT_PORT_PROFILE' });
    const absolute = name => path.join(root, name);
    const checks = [];
    const add = (id, ok, detail) => checks.push({ id, status: ok ? 'pass' : 'fail', detail });
    let os = {};
    try { os = parseOsRelease(fs.readFileSync(absolute('/etc/os-release'), 'utf8')); } catch { /* explicit failed check below */ }
    const osMajor = /^(12|13)(?:\.\d+)*$/.exec(os.VERSION_ID || '')?.[1];
    const hostProfile = ['debian', 'raspbian'].includes(os.ID) && osMajor ? HOST_PROFILES[osMajor] : null;
    add('os', Boolean(hostProfile), { id: os.ID || null, version: os.VERSION_ID || null });
    add('root', uid === 0, 'Installer requires a root operator; runtime does not run as root.');
    const arch = platform || process.arch;
    add('architecture', ['arm64', 'x64'].includes(arch), arch);
    add('systemd-running', fs.existsSync(absolute('/run/systemd/system')), 'Requires systemd booted test host, not a container shell.');
    const trusted = new Map(REQUIRED.map(file => [file, toolTrust(file, root)]));
    for (const file of REQUIRED) add(`tool:${path.basename(file)}`, trusted.get(file).trusted, { requested: file, resolved: trusted.get(file).resolved });
    const run = (file, args) => trusted.get(file)?.trusted ? exec(file, args) : { status: null, stdout: '', stderr: '', error: 'PREFLIGHT_TOOL_UNTRUSTED' };
    // Read-only package and keyring checks. The installer never runs APT, installs
    // prerequisites, changes host repositories or upgrades an existing machine.
    // Raspberry Pi OS often reports ID=debian, so ID alone is insufficient.
    let piModel = false;
    try { piModel = fs.readFileSync(absolute('/proc/device-tree/model'), 'utf8').startsWith('Raspberry Pi'); } catch { /* absent on non-Pi hosts */ }
    const piProfile = os.ID === 'raspbian' || piModel || fs.existsSync(absolute('/etc/rpi-issue')) || fs.existsSync(absolute('/usr/share/keyrings/raspberrypi-archive-keyring.gpg'));
    const updatePackages = [...OS_UPDATE_PACKAGES, ...(piProfile ? ['raspberrypi-archive-keyring'] : [])];
    for (const name of updatePackages) {
        const result = run('/usr/bin/dpkg-query', ['-W', '-f=${Status}\t${Version}\n', name]);
        const installed = /^install ok installed\t([^\s]+)\n?$/.exec(result.stdout);
        add(`os-update-package:${name}`, result.status === 0 && !result.error && Boolean(installed),
            { package: name, installedVersion: installed?.[1] || null, patchSecurityAssessment: 'not-performed-by-presence-check' });
    }
    for (const keyring of ['/usr/share/keyrings/debian-archive-keyring.gpg', ...(piProfile ? ['/usr/share/keyrings/raspberrypi-archive-keyring.gpg'] : [])]) {
        const trust = toolTrust(keyring, root, { executable: false });
        add(`os-update-keyring:${path.basename(keyring)}`, trust.trusted, { requested: keyring, resolved: trust.resolved });
    }
    add('hostname', typeof hostname === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,62}$/.test(hostname), 'Controller hostname must be valid before persistent host changes.');
    const node = run('/usr/bin/node', ['--version']);
    const version = node.stdout.trim().replace(/^v/, '');
    add('node-exact-version', typeof expectedNodeVersion === 'string' && /^\d+\.\d+\.\d+$/.test(expectedNodeVersion) && node.status === 0 && !node.error && version === expectedNodeVersion && Number(version.split('.')[0]) >= 22, { expected: expectedNodeVersion || null, observed: version || null });
    const systemd = run('/usr/bin/systemctl', ['--version']);
    const minimumSystemd = hostProfile?.minimumSystemd ?? 252;
    add('systemd-version', systemd.status === 0 && !systemd.error && Number(/^systemd (\d+)/.exec(systemd.stdout)?.[1] || 0) >= minimumSystemd, systemd.stdout.split('\n')[0]);
    const manager = run('/usr/bin/systemctl', ['show', '--property=Version', '--property=SystemState']);
    add('systemd-manager', manager.status === 0 && !manager.error && Number(/^Version=(\d+)/m.exec(manager.stdout)?.[1] || 0) >= minimumSystemd && /^SystemState=(?:running|degraded)$/m.test(manager.stdout), 'A running/degraded systemd manager must answer; service acceptance remains a target test.');
    const ciphers = run('/usr/bin/openssl', ['ciphers', '-s', '-tls1_3']);
    const tls13 = ciphers.stdout.trim().split(':').filter(Boolean);
    add('openssl-tls13', ciphers.status === 0 && !ciphers.error && tls13.length > 0 && tls13.every(name => /^TLS_(?:AES_(?:128|256)_GCM_SHA(?:256|384)|CHACHA20_POLY1305_SHA256)$/.test(name)), 'OpenSSL reports enabled TLS1.3 ciphers; this does not prove Redis TLS support.');
    const redis = run('/usr/bin/redis-server', ['--version']);
    add('redis-present', redis.status === 0 && !redis.error && /Redis server v=/.test(redis.stdout), redis.stdout.trim().slice(0, 256));
    const redisVersion = /^Redis server v=(\d+)\.\d+\.\d+(?:\s|$)/.exec(redis.stdout.trim());
    add('redis-profile-version', Boolean(hostProfile) && redis.status === 0 && !redis.error && Number(redisVersion?.[1] || 0) === hostProfile.redisMajor,
        { expectedMajor: hostProfile?.redisMajor ?? null, observedMajor: redisVersion ? Number(redisVersion[1]) : null, patchSecurityAssessment: 'not-performed-by-preflight' });
    let nodeTarget = '/usr/bin/node';
    try { nodeTarget = fs.realpathSync(absolute('/usr/bin/node')); } catch { /* tool check reports missing file */ }
    const caps = run('/usr/sbin/getcap', [nodeTarget]);
    add('node-no-file-capabilities', caps.status === 0 && !caps.error && caps.stdout.trim() === '', 'Node must not grant capabilities to arbitrary adapter code.');
    const listeners = run('/usr/bin/ss', ['-H', '-ltn']);
    const rows = listeners.stdout.split('\n').filter(line => line.trim()).map(line => line.trim().split(/\s+/));
    const validListeners = listeners.status === 0 && !listeners.error && rows.every(row => row.length >= 5 && row[0] === 'LISTEN' && /:\d+$/.test(row[3]));
    const occupied = rows.some(row => /:(?:16379|16380)$/.test(row[3] || ''));
    add('database-ports-free', validListeners && !occupied, '16379/16380 must be unused; no listener or firewall is modified.');
    if (webPorts.length) add('web-ports-free', validListeners && !rows.some(row => /:(?:8081|8188)$/.test(row[3] || '')), '8081/8188 must be unused for the signed integrated Admin/UI profile; this does not configure a firewall.');
    for (const account of ACCOUNTS) {
        const result = run('/usr/bin/getent', ['passwd', account]);
        add(`fresh-account:${account}`, result.status === 2 && !result.error && !result.stdout, 'Existing account requires separately reviewed migration.');
        const group = run('/usr/bin/getent', ['group', account]);
        add(`fresh-group:${account}`, group.status === 2 && !group.error && !group.stdout, 'Existing group requires separately reviewed migration.');
    }
    for (const file of ['/etc/nexowatt-eos', '/var/lib/nexowatt-eos', '/var/log/nexowatt-eos', '/opt/nexowatt/eos/current', '/opt/iobroker', '/etc/nexowatt-eos-os-updates', '/var/lib/nexowatt-eos-os-updates', '/etc/systemd/system/nexowatt-eos.target', '/etc/systemd/system/nexowatt-eos-controller.service', '/etc/systemd/system/nexowatt-eos-initialize.service', '/etc/systemd/system/nexowatt-eos-redis@.service',
        '/etc/systemd/system/nexowatt-eos-upload.service', '/etc/systemd/system/nexowatt-eos-certificates.service', '/etc/systemd/system/nexowatt-eos-certificates.timer', '/etc/systemd/system/nexowatt-eos-os-updates.service', '/etc/systemd/system/nexowatt-eos-os-updates.timer']) {
        let exists = false;
        try { fs.lstatSync(absolute(file)); exists = true; } catch (e) { if (e.code !== 'ENOENT') exists = true; }
        add(`fresh-path:${file}`, !exists, 'Fresh installation only; no overwrite or migration.');
    }
    const prerequisitesReady = checks.every(c => c.status === 'pass');
    add('redis-security-admission', false, REDIS_SECURITY_HOLD);
    return { schemaVersion: 1, kind: 'eos-test-host-preflight', ready: false, prerequisitesReady, checks,
        hostProfile: hostProfile ? { osMajor, ...hostProfile, testOnly: true, targetHardwareAccepted: false } : null,
        redisTlsVerified: false, redisTlsNextGate: 'Authenticated TLS1.3 Redis handshake during bootstrap before controller activation',
        scope: 'Read-only prerequisites; hardware operation, vulnerability state and systemd runtime sandbox not certified.' };
}
module.exports = { ACCOUNTS, REQUIRED, OS_UPDATE_PACKAGES, parseOsRelease, command, toolTrust, webPortsForCatalog, inspectHost };
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length !== 2 || args[0] !== '--node-version') {
        process.stderr.write('Usage: node tools/system/host-preflight.cjs --node-version <exact signed-release Node version>\n');
        process.exitCode = 2;
    } else {
        const report = inspectHost({ expectedNodeVersion: args[1] });
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
        process.exitCode = report.ready ? 0 : 1;
    }
}
