'use strict';
// Separate PostgreSQL admission; the historical Redis security hold is untouched.
const fs = require('node:fs');
const path = require('node:path');
const osInfo = require('node:os');
const { command, toolTrust, parseOsRelease, OS_UPDATE_PACKAGES } = require('./host-preflight.cjs');
const ACCOUNTS = Object.freeze(['eos-runtime', 'eos-postgres', 'eos-setup']);
const UNITS = Object.freeze(['nexowatt-eos.target', 'nexowatt-eos-controller.service', 'nexowatt-eos-initialize.service',
    'nexowatt-eos-postgresql.service', 'nexowatt-eos-upload.service', 'nexowatt-eos-pg-certificates.service',
    'nexowatt-eos-pg-certificates.timer', 'nexowatt-eos-os-updates.service', 'nexowatt-eos-os-updates.timer',
    'nexowatt-eos-setup.target', 'nexowatt-eos-setup.service', 'nexowatt-eos-setup-finalize.path', 'nexowatt-eos-setup-finalize.service', 'nexowatt-eos-setup-license.service']);
const REQUIRED = Object.freeze(['/usr/bin/node', '/usr/bin/systemctl', '/usr/sbin/useradd', '/usr/sbin/groupadd',
    '/usr/sbin/getcap', '/usr/bin/openssl', '/usr/bin/getent', '/usr/bin/chown', '/usr/bin/ss', '/usr/bin/id', '/usr/sbin/nologin',
    '/usr/sbin/runuser', '/usr/lib/postgresql/17/bin/postgres', '/usr/lib/postgresql/17/bin/initdb', '/usr/lib/postgresql/17/bin/psql', '/usr/lib/postgresql/17/bin/pg_isready',
    '/usr/bin/python3', '/usr/bin/apt-get', '/usr/bin/apt-mark', '/usr/bin/dpkg', '/usr/bin/dpkg-query',
    '/usr/bin/unattended-upgrade', '/usr/sbin/needrestart', '/usr/bin/pg_lsclusters']);
const FRESH_PATHS = Object.freeze(['/etc/nexowatt-eos', '/var/lib/nexowatt-eos', '/var/log/nexowatt-eos',
    '/opt/nexowatt/eos/current', '/opt/nexowatt-eos', '/opt/iobroker', '/etc/nexowatt-eos-os-updates',
    '/var/lib/nexowatt-eos-os-updates', '/etc/systemd/system/nexowatt-eos.service', '/run/nexowatt-eos-postgresql',
    ...UNITS.map(name => `/etc/systemd/system/${name}`)]);
function inspectPostgresqlHost({ expectedNodeVersion, platform = process.arch, root = '/', exec = command,
    uid = process.getuid?.(), hostname = osInfo.hostname().split('.')[0] } = {}) {
    const at = name => path.join(root, name), checks = [];
    const add = (id, ok, detail) => checks.push({ id, status: ok ? 'pass' : 'fail', detail });
    let os = {};
    try { os = parseOsRelease(fs.readFileSync(at('/etc/os-release'), 'utf8')); } catch { /* failed below */ }
    add('os', ['debian', 'raspbian'].includes(os.ID) && /^13(?:\.\d+)*$/.test(os.VERSION_ID || ''),
        { id: os.ID || null, version: os.VERSION_ID || null, supportedProfile: 'Debian13-Lite-PostgreSQL17-isolated-test' });
    add('root', uid === 0, 'Root operator only; controller and PostgreSQL use separate unprivileged accounts.');
    add('architecture', ['arm64', 'x64'].includes(platform), platform);
    add('systemd-running', fs.existsSync(at('/run/systemd/system')), 'Booted host required, not a container shell.');
    add('hostname', typeof hostname === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,62}$/.test(hostname), 'Explicit safe hostname.');
    const trusted = new Map(REQUIRED.map(file => [file, toolTrust(file, root)]));
    for (const [file, result] of trusted) add(`tool:${file}`, result.trusted, result.resolved);
    const run = (file, args) => trusted.get(file)?.trusted ? exec(file, args) : { status: null, stdout: '', error: 'UNTRUSTED_TOOL' };
    const node = run('/usr/bin/node', ['--version']);
    add('node-exact-version', expectedNodeVersion === '24.21.0' && node.status === 0 && !node.error &&
        node.stdout.trim() === `v${expectedNodeVersion}`, { expected: expectedNodeVersion || null, observed: node.stdout.trim() });
    const manager = run('/usr/bin/systemctl', ['show', '--property=Version', '--property=SystemState']);
    add('systemd-manager', manager.status === 0 && !manager.error && Number(/^Version=(\d+)/m.exec(manager.stdout)?.[1] || 0) >= 257 &&
        /^SystemState=(?:running|degraded)$/m.test(manager.stdout), 'systemd257+ manager must answer.');
    const clusters = run('/usr/bin/pg_lsclusters', ['--no-header']);
    add('no-distribution-clusters', clusters.status === 0 && !clusters.error && !clusters.stdout.trim(),
        'Dedicated fresh host only. Preserve existing PostgreSQL clusters; do not delete them to pass this check.');
    for (const name of ['postgres', 'psql']) {
        const result = run(`/usr/lib/postgresql/17/bin/${name}`, ['--version']);
        const match = /\(PostgreSQL\) 17\.(\d+)(?:\s|$)/.exec(result.stdout);
        add(`postgresql:${name}`, result.status === 0 && !result.error && Boolean(match) && Number(match[1]) >= 11,
            { observed: result.stdout.trim().slice(0, 160), minimumMinor: '17.11', patchSecurityClearance: false });
    }
    let pi = os.ID === 'raspbian' || fs.existsSync(at('/etc/rpi-issue'));
    try { pi ||= fs.readFileSync(at('/proc/device-tree/model'), 'utf8').startsWith('Raspberry Pi'); } catch { /* non-Pi */ }
    for (const name of [...OS_UPDATE_PACKAGES, 'postgresql-17', 'postgresql-client-17', ...(pi ? ['raspberrypi-archive-keyring'] : [])]) {
        const result = run('/usr/bin/dpkg-query', ['-W', '-f=${Status}\t${Version}\n', name]);
        const match = /^install ok installed\t([^\s]+)\n?$/.exec(result.stdout);
        add(`package:${name}`, result.status === 0 && !result.error && Boolean(match), { installedVersion: match?.[1] || null });
    }
    for (const keyring of ['/usr/share/keyrings/debian-archive-keyring.gpg', ...(pi ? ['/usr/share/keyrings/raspberrypi-archive-keyring.gpg'] : [])]) {
        add(`keyring:${keyring}`, toolTrust(keyring, root, { executable: false }).trusted, 'Distribution update trust, no added repositories.');
    }
    const ciphers = run('/usr/bin/openssl', ['ciphers', '-s', '-tls1_3']);
    add('openssl-tls13', ciphers.status === 0 && !ciphers.error && /^TLS_/.test(ciphers.stdout.trim()), 'Real database TLS handshakes run before controller startup.');
    for (const file of ['/usr/bin/node', '/usr/lib/postgresql/17/bin/postgres']) {
        const resolved = trusted.get(file)?.resolved;
        const caps = resolved ? run('/usr/sbin/getcap', [resolved]) : { status: null, stdout: '' };
        add(`no-capabilities:${file}`, caps.status === 0 && !caps.error && !caps.stdout.trim(), 'No file capabilities.');
    }
    const listeners = run('/usr/bin/ss', ['-H', '-ltn']);
    const rows = listeners.stdout.split('\n').filter(line => line.trim()).map(line => line.trim().split(/\s+/));
    add('ports-free', listeners.status === 0 && !listeners.error && rows.every(row => row.length >= 5 && row[0] === 'LISTEN' && /:\d+$/.test(row[3])) &&
        !rows.some(row => /:(?:15432|8081|8188|8443)$/.test(row[3] || '')), 'PostgreSQL15432, Admin8081, UI8188, Setup8443 must be unused.');
    for (const account of ACCOUNTS) for (const table of ['passwd', 'group']) {
        const result = run('/usr/bin/getent', [table, account]);
        add(`fresh-${table}:${account}`, result.status === 2 && !result.error && !result.stdout, 'No account takeover or migration.');
    }
    for (const file of FRESH_PATHS) {
        let exists = true; try { fs.lstatSync(at(file)); } catch (e) { if (e.code === 'ENOENT') exists = false; }
        add(`fresh-path:${file}`, !exists, 'Existing installation must be preserved; use a fresh test image.');
    }
    const units = run('/usr/bin/systemctl', ['list-unit-files', '--no-legend', '--no-pager', 'nexowatt-eos*', 'iobroker*']);
    add('fresh-unit-namespace', units.status === 0 && !units.error && units.stdout.trim() === '', 'No existing EOS/ioBroker unit may be replaced.');
    let space = 0; try { const stat = fs.statfsSync(at('/')); space = Number(stat.bavail) * Number(stat.bsize); } catch { /* fail */ }
    add('free-space', space >= 6 * 1024 ** 3, { bytes: space, minimumBytes: 6 * 1024 ** 3 });
    const ready = checks.every(row => row.status === 'pass');
    return { schemaVersion: 1, kind: 'eos-postgresql-test-host-preflight', ready, prerequisitesReady: ready,
        checks, changesPerformed: false, backend: 'postgresql', redisRequired: false,
        targetHardwareAccepted: false, productionReleaseApproved: false,
        scope: 'Read-only fresh Debian13 test-host admission. Live TLS/schema/controller/HTTPS gates must still pass on the target.' };
}
module.exports = { ACCOUNTS, UNITS, REQUIRED, FRESH_PATHS, inspectPostgresqlHost };
