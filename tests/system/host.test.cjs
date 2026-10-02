'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const { inspectHost, parseOsRelease, REQUIRED, OS_UPDATE_PACKAGES, webPortsForCatalog } = require('../../tools/system/host-preflight.cjs');
const { installHost, mergeControllerConfig, privateWrite, UNITS } = require('../../tools/system/install-host.cjs');
const REPO = path.resolve(__dirname, '../..');
const RELEASE = '1'.repeat(64);
const releasePath = `/opt/nexowatt/eos/releases/${RELEASE}`;
function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-host-test-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    function write(name, data = '', mode = 0o644) {
        const file = path.join(root, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, data, { mode }); return file;
    }
    return { root, write, at: name => path.join(root, name) };
}
function goodExec(file, args) {
    let stdout = '';
    let status = 0;
    if (file.endsWith('/node')) stdout = 'v24.19.0\n';
    if (file.endsWith('/systemctl')) stdout = args[0] === '--version' ? 'systemd 252\n' : 'Version=252\nSystemState=running\n';
    if (file.endsWith('/openssl')) stdout = 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256\n';
    if (file.endsWith('/redis-server')) stdout = 'Redis server v=7.0.15 sha=00000000\n';
    if (file.endsWith('/getent')) status = 2;
    if (file.endsWith('/dpkg-query')) stdout = 'install ok installed\t1.0-fixture\n';
    return { status, stdout, stderr: '' };
}
function hostFixture(t) {
    const f = fixture(t); fs.chmodSync(f.root, 0o755);
    f.write('/etc/os-release', 'ID=debian\nVERSION_ID="12"\n');
    fs.mkdirSync(f.at('/run/systemd/system'), { recursive: true });
    REQUIRED.forEach(p => f.write(p, '', 0o755));
    f.write('/usr/share/keyrings/debian-archive-keyring.gpg', 'fixture-keyring');
    return f;
}
test('OS parser never evaluates shell substitutions or accepts malformed assignments', () => {
    const result = parseOsRelease('ID=debian\nVERSION_ID="12"\nX=$(touch /tmp/injected)\nexport ID=wrong\n');
    assert.equal(result.ID, 'debian'); assert.equal(result.VERSION_ID, '12'); assert.equal(result.X, undefined);
});
test('fresh supported fixture matches prerequisites but cannot bypass Redis security admission', t => {
    const f = hostFixture(t);
    const r = inspectHost({ root: f.root, expectedNodeVersion: '24.19.0', platform: 'arm64', uid: 0, exec: goodExec });
    assert.equal(r.prerequisitesReady, true, JSON.stringify(r.checks.filter(c => c.id !== 'redis-security-admission' && c.status === 'fail')));
    assert.equal(r.ready, false);
    assert.deepEqual(r.checks.filter(c => c.status === 'fail').map(c => c.id), ['redis-security-admission']);
});
test('preflight rejects wrong OS and exact Node drift', t => {
    const f = hostFixture(t); f.write('/etc/os-release', 'ID=ubuntu\nVERSION_ID="24.04"\n');
    const r = inspectHost({ root: f.root, expectedNodeVersion: '24.19.1', platform: 'arm64', uid: 0, exec: goodExec });
    assert.equal(r.ready, false); assert.equal(r.checks.find(x => x.id === 'os').status, 'fail');
    assert.equal(r.checks.find(x => x.id === 'node-exact-version').status, 'fail');
});
function trixieExec(file, args) {
    if (file.endsWith('/systemctl')) return { status: 0, stdout: args[0] === '--version' ? 'systemd 257 (257.13-1~deb13u1)\n' : 'Version=257.13-1~deb13u1\nSystemState=running\n' };
    if (file.endsWith('/redis-server')) return { status: 0, stdout: 'Redis server v=8.0.2 sha=00000000:0 malloc=jemalloc-5.3.0 bits=64 build=fixture\n' };
    return goodExec(file, args);
}
test('Debian 13 ARM64 fixture requires its reviewed Redis/systemd profile without claiming hardware acceptance', t => {
    const f = hostFixture(t);
    for (const id of ['debian', 'raspbian']) {
        f.write('/etc/os-release', `ID=${id}\nVERSION_ID="13"\nDEBIAN_VERSION_FULL=13.4\n`);
        if (id === 'raspbian') f.write('/usr/share/keyrings/raspberrypi-archive-keyring.gpg', 'fixture-pi-keyring');
        const report = inspectHost({ root: f.root, expectedNodeVersion: '24.19.0', platform: 'arm64', uid: 0, exec: trixieExec });
        assert.equal(report.prerequisitesReady, true, JSON.stringify(report.checks.filter(x => x.id !== 'redis-security-admission' && x.status === 'fail')));
        assert.equal(report.ready, false);
        assert.deepEqual(report.hostProfile, { osMajor: '13', minimumSystemd: 257, redisMajor: 8, testOnly: true, targetHardwareAccepted: false });
        assert.equal(report.redisTlsVerified, false);
    }
});
test('unknown OS versions and malformed release suffixes are rejected without broad family matching', t => {
    const f = hostFixture(t);
    for (const version of ['11', '14', '130', '13rolling', '13.x', '13.', '12.unreviewed', '']) {
        f.write('/etc/os-release', `ID=debian\nVERSION_ID="${version}"\n`);
        const r = inspectHost({ root: f.root, expectedNodeVersion: '24.19.0', uid: 0, exec: trixieExec });
        assert.equal(r.ready, false, version); assert.equal(r.checks.find(x => x.id === 'os').status, 'fail', version);
    }
});
test('Debian 13 rejects Debian 12 daemon versions and unexpected Redis major or malformed version output', t => {
    const f = hostFixture(t); f.write('/etc/os-release', 'ID=debian\nVERSION_ID="13"\n');
    const inspect = exec => inspectHost({ root: f.root, expectedNodeVersion: '24.19.0', uid: 0, exec });
    const old = inspect(goodExec);
    for (const id of ['systemd-version', 'systemd-manager', 'redis-profile-version']) assert.equal(old.checks.find(x => x.id === id).status, 'fail');
    for (const stdout of ['Redis server v=7.2.10\n', 'Redis server v=9.0.0\n', 'Redis server v=8\n', 'prefix Redis server v=8.0.2\n', 'Redis server v=8.0.2-unreviewed\n']) {
        const r = inspect((file, args) => file.endsWith('/redis-server') ? { status: 0, stdout } : trixieExec(file, args));
        assert.equal(r.checks.find(x => x.id === 'redis-profile-version').status, 'fail', stdout);
    }
    const timeout = inspect((file, args) => ({ ...trixieExec(file, args), error: 'ETIMEDOUT' }));
    assert.equal(timeout.checks.find(x => x.id === 'redis-profile-version').status, 'fail');
});
test('Debian 13 preserves architecture, port, runtime privilege and fresh-host gates', t => {
    const f = hostFixture(t); f.write('/etc/os-release', 'ID=debian\nVERSION_ID="13"\n');
    f.write('/opt/iobroker/existing-data', 'fixture');
    const exec = (file, args) => {
        if (file.endsWith('/ss')) return { status: 0, stdout: 'LISTEN 0 128 [::]:8188 *:*\n' };
        if (file.endsWith('/getcap')) return { status: 0, stdout: '/usr/bin/node cap_net_admin=ep\n' };
        return trixieExec(file, args);
    };
    const report = inspectHost({ root: f.root, expectedNodeVersion: '24.19.0', platform: 'arm', uid: 0, exec, webPorts: [8081, 8188] });
    for (const id of ['architecture', 'web-ports-free', 'node-no-file-capabilities', 'fresh-path:/opt/iobroker']) assert.equal(report.checks.find(x => x.id === id).status, 'fail');
    assert.equal(fs.readFileSync(f.at('/opt/iobroker/existing-data'), 'utf8'), 'fixture');
});
test('preflight rejects privileged Node, existing identity and occupied database ports', t => {
    const f = hostFixture(t);
    const exec = (file, args) => {
        if (file.endsWith('getcap')) return { status: 0, stdout: '/usr/bin/node cap_net_admin=ep\n' };
        if (file.endsWith('getent') && args[1] === 'eos-runtime') return { status: 0, stdout: 'existing\n' };
        if (file.endsWith('/ss')) return { status: 0, stdout: 'LISTEN 0 128 127.0.0.1:16379 0.0.0.0:*\n' };
        return goodExec(file, args);
    };
    const r = inspectHost({ root: f.root, expectedNodeVersion: '24.19.0', platform: 'x64', uid: 0, exec });
    for (const id of ['node-no-file-capabilities', 'fresh-account:eos-runtime', 'database-ports-free']) assert.equal(r.checks.find(x => x.id === id).status, 'fail');
});
test('fresh-path check catches a dangling symlink instead of overwriting it', t => {
    const f = hostFixture(t); fs.symlinkSync('/unavailable', f.at('/etc/nexowatt-eos'));
    const r = inspectHost({ root: f.root, expectedNodeVersion: '24.19.0', uid: 0, exec: goodExec });
    assert.equal(r.checks.find(x => x.id === 'fresh-path:/etc/nexowatt-eos').status, 'fail');
});
test('merge disables shell, multihost, compact and diagnostics plugin without downgrading TLS fields', () => {
    const databases = { objects: { type: 'redis', options: { tls: { minVersion: 'TLSv1.3' } } }, states: { type: 'redis' } };
    const input = { system: { allowShellCommands: true, compact: true, statisticsInterval: 15000 }, plugins: { sentry: { enabled: true } }, dnsResolution: 'ipv4first' };
    const result = mergeControllerConfig(input, databases);
    assert.equal(result.system.allowShellCommands, false); assert.equal(result.system.compact, false);
    assert.equal(result.multihostService.enabled, false); assert.equal(result.plugins.sentry.enabled, false);
    assert.equal(result.objects.options.tls.minVersion, 'TLSv1.3'); assert.equal(result.dnsResolution, 'ipv4first');
    assert.equal(input.system.allowShellCommands, true);
});
test('generated host config passes real transport and bootstrap validators', t => {
    const f = fixture(t);
    const { provision } = require('../../runtime/transport/redis-tls.cjs');
    const { assertRuntimeConfig } = require('../../runtime/bootstrap/initialize.cjs');
    provision({ directory: f.at('/transport') });
    const fragment = JSON.parse(fs.readFileSync(f.at('/transport/credentials/iobroker-databases.json')));
    const config = mergeControllerConfig({ system: {}, plugins: {} }, fragment, 'eos-test-host');
    assert.doesNotThrow(() => assertRuntimeConfig(config));
    assert.equal(config.system.hostname, 'eos-test-host');
    assert.throws(() => mergeControllerConfig({}, fragment, '_bad'), /INVALID_HOSTNAME/);
});
test('private writes reject replacement and symlink targets', t => {
    const f = fixture(t); const p = f.write('/config', 'original');
    assert.throws(() => privateWrite(p, 'overwrite')); assert.equal(fs.readFileSync(p, 'utf8'), 'original');
    fs.symlinkSync(p, f.at('/link')); assert.throws(() => privateWrite(f.at('/link'), 'overwrite'));
});
function installationFixture(t, { failAt = null, privileged = false } = {}) {
    const f = fixture(t); const calls = [];
    const defaults = { system: {}, objects: {}, states: {}, plugins: {} };
    for (const name of ['app/package.json', 'app/node_modules/iobroker.js-controller/controller.js', 'app/node_modules/iobroker.js-controller/iobroker.js', 'runtime/transport/redis-tls.cjs', 'runtime/bootstrap/initialize.cjs', 'runtime/release/installed-check.cjs']) f.write(`${releasePath}/${name}`, '{}');
    f.write(`${releasePath}/app/node_modules/iobroker.js-controller/conf/iobroker-dist.json`, JSON.stringify(defaults));
    for (const unit of UNITS) f.write(`${releasePath}/system/test-base/systemd/${unit}`, fs.readFileSync(path.join(REPO, 'system/test-base/systemd', unit)));
    for (const name of ['runtime/os-updates/runner.py', 'system/test-base/os-updates/policy.json', 'system/test-base/os-updates/initial-status.json'])
        f.write(`${releasePath}/${name}`, fs.readFileSync(path.join(REPO, name)));
    const exec = (file, args, options) => {
        calls.push({ file, args, options });
        if (failAt && args[0] !== 'stop' && args.includes(failAt)) return { status: 1, stdout: '', stderr: 'injected failure' };
        if (file === '/usr/bin/id') return { status: 0, stdout: `${args.at(-1)}${privileged ? ' docker' : ''}\n` };
        if (args.includes('provision')) {
            for (const d of ['certs', 'credentials', 'redis']) fs.mkdirSync(f.at(`/etc/nexowatt-eos/transport/${d}`), { recursive: true, mode: 0o700 });
            for (const scope of ['objects', 'states']) {
                f.write(`/etc/nexowatt-eos/transport/redis/${scope}.conf`);
                f.write(`/etc/nexowatt-eos/transport/certs/${scope}.key`);
                f.write(`/etc/nexowatt-eos/transport/certs/${scope}.crt`);
            }
            f.write('/etc/nexowatt-eos/transport/certs/ca.crt');
            f.write('/etc/nexowatt-eos/transport/credentials/iobroker-databases.json', JSON.stringify({ objects: { type: 'redis' }, states: { type: 'redis' } }));
        }
        return { status: 0, stdout: args[0] === 'show' ? 'success\n' : '', stderr: '' };
    };
    return { ...f, calls, dependencies: { root: f.root, exec, uid: 0, skipOwnershipFixture: true, preflight: () => ({ ready: true }) }, options: { profile: 'test', releaseId: RELEASE, releasePath, expectedNodeVersion: '24.19.0', publicKeySha256: 'a'.repeat(64), sequence: 1, platform: 'arm64', start: false } };
}
test('installer refuses bypass profile, unverified stage path, nonroot and implicit start before commands', t => {
    const f = installationFixture(t);
    for (const changes of [{ profile: 'production' }, { releasePath: '/tmp/untrusted' }, { start: undefined }, { sequence: 0 }, { publicKeySha256: undefined }]) assert.throws(() => installHost({ ...f.options, ...changes }, f.dependencies));
    assert.throws(() => installHost(f.options, { ...f.dependencies, uid: 1000 })); assert.equal(f.calls.length, 0);
});
test('installer repeats the verified integrated port profile before persistent changes', t => {
    const f = installationFixture(t); let observed;
    f.dependencies.preflight = options => { observed = options; return { ready: false }; };
    assert.throws(() => installHost({ ...f.options, webPorts: [8081, 8188] }, f.dependencies), /HOST_PREFLIGHT_REJECTED/);
    assert.deepEqual(observed.webPorts, [8081, 8188]); assert.equal(f.calls.length, 0);
    assert.equal(fs.existsSync(f.at('/etc/nexowatt-eos')), false);
    assert.throws(() => installHost(f.options, f.dependencies), /HOST_PREFLIGHT_REJECTED/);
    assert.deepEqual(observed.webPorts, []);
});
test('verified catalog selects web port checks without changing core-only prerequisites', () => {
    assert.deepEqual(webPortsForCatalog({ entries: [{ package: 'iobroker.js-controller' }] }), []);
    for (const name of ['iobroker.eos-admin', 'iobroker.nexowatt-ui']) assert.deepEqual(webPortsForCatalog({ entries: [{ package: name }] }), [8081, 8188]);
    assert.throws(() => webPortsForCatalog(null), /PREFLIGHT_CATALOG_REQUIRED/);
});
test('disabled install writes restricted config and units but never enables or starts services', t => {
    const f = installationFixture(t); const result = installHost(f.options, f.dependencies);
    assert.equal(result.phase, 'INSTALLED_DISABLED');
    assert.deepEqual(JSON.parse(fs.readFileSync(f.at('/etc/nexowatt-eos/release-state.json'))), { schemaVersion: 1, releaseId: RELEASE, sequence: 1, nodeVersion: '24.19.0', publicKeySha256: 'a'.repeat(64), profile: 'test' });
    assert.equal(f.calls.some(c => c.file === '/usr/bin/systemctl' && ['enable', 'start'].includes(c.args[0])), false);
    assert.equal(fs.lstatSync(f.at('/var/lib/nexowatt-eos/iobroker-data/iobroker.json')).isSymbolicLink(), false);
    assert.equal(fs.statSync(f.at('/etc/nexowatt-eos/iobroker.json')).mode & 0o777, 0o640);
    assert.equal(fs.readlinkSync(f.at('/opt/nexowatt/eos/current')), releasePath);
    assert.equal(fs.existsSync(f.at('/var/lib/nexowatt-eos/.initialized')), false);
});
test('pinned release state write failure prevents every service start or enable', t => {
    const f = installationFixture(t);
    f.dependencies.privateWrite = (file) => {
        assert.ok(file.endsWith('/release-state.json'));
        const error = new Error('disk full fixture'); error.code = 'ENOSPC'; throw error;
    };
    assert.throws(() => installHost({ ...f.options, start: true }, f.dependencies), error => error.code === 'ENOSPC' && error.phase === 'release-state');
    assert.equal(f.calls.some(c => c.file === '/usr/bin/systemctl' && ['start', 'enable'].includes(c.args[0])), false);
    assert.equal(fs.existsSync(f.at('/etc/nexowatt-eos/release-state.json')), false);
    assert.equal(fs.existsSync(f.at('/etc/systemd/system/nexowatt-eos-controller.service')), false);
});
test('privileged group detected after identity creation stops before provisioning', t => {
    const f = installationFixture(t, { privileged: true });
    assert.throws(() => installHost(f.options, f.dependencies), /RUNTIME_GROUP_POLICY_REJECTED/);
    assert.equal(f.calls.some(c => c.args.includes('provision')), false);
});
test('start follows TLS databases then init then controller and writes root marker', t => {
    const f = installationFixture(t); const r = installHost({ ...f.options, start: true }, f.dependencies);
    assert.equal(r.phase, 'TEST_SERVICES_STARTED');
    const c = f.calls.filter(c => c.file === '/usr/bin/systemctl');
    assert.deepEqual(c.map(x => x.args[0]), ['daemon-reload', 'start', 'start', 'show', 'enable', 'is-active', 'enable', 'enable']);
    assert.deepEqual(c.at(-2).args, ['enable', '--now', 'nexowatt-eos-certificates.timer']);
    assert.deepEqual(c.at(-1).args, ['enable', '--now', 'nexowatt-eos-os-updates.timer']);
    assert.ok(fs.existsSync(f.at('/var/lib/nexowatt-eos/.initialized')));
});
test('initialization failure stops and disables units without starting controller', t => {
    const f = installationFixture(t, { failAt: 'nexowatt-eos-initialize.service' });
    assert.throws(() => installHost({ ...f.options, start: true }, f.dependencies), /HOST_COMMAND_FAILED/);
    assert.ok(f.calls.some(c => JSON.stringify(c.args) === JSON.stringify(['disable', 'nexowatt-eos.target', 'nexowatt-eos-certificates.timer', 'nexowatt-eos-os-updates.timer'])));
    assert.ok(f.calls.some(c => c.args[0] === 'stop'));
    assert.equal(f.calls.some(c => c.args[0] === 'enable'), false);
    assert.equal(fs.existsSync(f.at('/var/lib/nexowatt-eos/.initialized')), false);
});
test('cleanup failure is reported rather than claimed as a stopped installation', t => {
    const f = installationFixture(t, { failAt: 'nexowatt-eos-initialize.service' });
    const initialExec = f.dependencies.exec;
    f.dependencies.exec = (file, args, options) => args[0] === 'stop'
        ? { status: 1, stdout: '', stderr: 'failed stop fixture' }
        : initialExec(file, args, options);
    assert.throws(() => installHost({ ...f.options, start: true }, f.dependencies), error =>
        error.code === 'HOST_CLEANUP_INCOMPLETE' && error.cleanupIncomplete === true && error.originalCode === 'HOST_COMMAND_FAILED');
});
test('unit security boundaries and network compatibility remain explicit', () => {
    const read = name => fs.readFileSync(path.join(REPO, 'system/test-base/systemd', name), 'utf8');
    const controller = read('nexowatt-eos-controller.service');
    assert.match(controller, /User=eos-runtime/); assert.match(controller, /NoNewPrivileges=yes/);
    assert.match(controller, /ProtectSystem=strict/); assert.match(controller, /BindReadOnlyPaths=.*iobroker.json:/);
    assert.match(controller, /ExecStartPre=.*installed-check.cjs/);
    assert.match(controller, /UnsetEnvironment=NODE_OPTIONS NODE_PATH/);
    assert.match(controller, /ExecStartPre=.*redis-tls.cjs probe --config/);
    assert.match(controller, /ExecStartPost=.*--wait-controller --controller-pid \$\{MAINPID\}/); assert.match(controller, /StartLimitBurst=3/);
    assert.doesNotMatch(controller, /IPAddressDeny|PrivateNetwork|CAP_NET_ADMIN|docker|sudo/);
    const init = read('nexowatt-eos-initialize.service');
    assert.match(init, /iobroker.js setup\n/); assert.doesNotMatch(init, /setup first/);
    assert.match(init, /runtime\/bootstrap\/initialize.cjs/);
});
test('systemd-analyze accepts complete unit grammar in isolated root fixture', t => {
    if (!fs.existsSync('/usr/bin/systemd-analyze')) return t.skip('systemd-analyze missing; no grammar verification claimed');
    const f = fixture(t);
    f.write('/etc/os-release', 'ID=debian\nVERSION_ID=12\n');
    for (const tool of ['node', 'redis-server', 'python3']) f.write(`/usr/bin/${tool}`, '#!/bin/sh\nexit 0\n', 0o755);
    for (const name of ['sysinit.target', 'basic.target', 'shutdown.target', 'network.target', 'network-online.target', 'timers.target', 'time-sync.target', 'multi-user.target']) f.write(`/etc/systemd/system/${name}`, '[Unit]\nDescription=Fixture target\n');
    for (const unit of UNITS) f.write(`/etc/systemd/system/${unit}`, fs.readFileSync(path.join(REPO, 'system/test-base/systemd', unit)));
    const r = cp.spawnSync('/usr/bin/systemd-analyze', ['verify', '--man=no', '--generators=no', `--root=${f.root}`, ...UNITS.filter(x => !x.includes('@')) , 'nexowatt-eos-redis@objects.service', 'nexowatt-eos-redis@states.service'], { encoding: 'utf8', timeout: 10000 });
    assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
});

test('web listeners are reserved only for the verified integrated profile, including IPv6', t => {
    const f = hostFixture(t);
    for (const address of ['0.0.0.0:8081', '[::]:8188']) {
        const exec = (file, args) => file.endsWith('/ss') ? { status: 0, stdout: `LISTEN 0 128 ${address} *:*\n` } : goodExec(file, args);
        assert.equal(inspectHost({ root: f.root, expectedNodeVersion: '24.19.0', uid: 0, exec }).prerequisitesReady, true);
        const report = inspectHost({ root: f.root, expectedNodeVersion: '24.19.0', uid: 0, exec, webPorts: [8081, 8188] });
        assert.equal(report.checks.find(row => row.id === 'web-ports-free').status, 'fail');
    }
    assert.throws(() => inspectHost({ webPorts: [22, 8081] }), /PREFLIGHT_PORT_PROFILE/);
});
test('malformed listener output and missing TLS1.3 ciphers fail without daemon probes', t => {
    const f = hostFixture(t), calls = [];
    const exec = (file, args) => {
        calls.push([file, args]);
        if (file.endsWith('/ss')) return { status: 0, stdout: 'malformed-listener-data\n' };
        if (file.endsWith('/openssl')) return { status: 0, stdout: 'ECDHE-RSA-AES256-GCM-SHA384\n' };
        return goodExec(file, args);
    };
    const report = inspectHost({ root: f.root, expectedNodeVersion: '24.19.0', uid: 0, exec, webPorts: [8081, 8188] });
    for (const id of ['database-ports-free', 'web-ports-free', 'openssl-tls13']) assert.equal(report.checks.find(row => row.id === id).status, 'fail');
    assert.equal(report.redisTlsVerified, false);
    assert.deepEqual(calls.filter(([file]) => file.endsWith('/redis-server')), [['/usr/bin/redis-server', ['--version']]]);
});
test('untrusted or non-executable tools are rejected before executing their bytes', t => {
    const f = hostFixture(t), calls = [];
    fs.chmodSync(f.at('/usr/bin/node'), 0o777);
    fs.chmodSync(f.at('/usr/bin/redis-server'), 0o600);
    const report = inspectHost({ root: f.root, expectedNodeVersion: '24.19.0', uid: 0, exec: (file, args) => { calls.push(file); return goodExec(file, args); } });
    assert.equal(report.ready, false);
    assert.equal(calls.includes('/usr/bin/node'), false); assert.equal(calls.includes('/usr/bin/redis-server'), false);
});
test('protected distribution symlink is allowed, writable target and private runtime traversal are denied', t => {
    const f = hostFixture(t);
    fs.renameSync(f.at('/usr/bin/redis-server'), f.at('/usr/bin/redis-check-rdb'));
    fs.symlinkSync('redis-check-rdb', f.at('/usr/bin/redis-server'));
    const inspect = () => inspectHost({ root: f.root, expectedNodeVersion: '24.19.0', uid: 0, exec: goodExec });
    assert.equal(inspect().prerequisitesReady, true);
    fs.chmodSync(f.at('/usr/bin/redis-check-rdb'), 0o777);
    assert.equal(inspect().checks.find(row => row.id === 'tool:redis-server').status, 'fail');
    fs.chmodSync(f.at('/usr/bin/redis-check-rdb'), 0o755);
    fs.chmodSync(f.at('/usr/bin'), 0o750);
    assert.equal(inspect().checks.find(row => row.id === 'tool:node').status, 'fail');
});
test('nonregular executable path, unavailable manager and invalid hostname fail before installation', t => {
    const f = hostFixture(t); fs.unlinkSync(f.at('/usr/bin/redis-server')); fs.mkdirSync(f.at('/usr/bin/redis-server'));
    const exec = (file, args) => file.endsWith('/systemctl') && args[0] === 'show' ? { status: 1, stdout: '', error: 'ETIMEDOUT' } : goodExec(file, args);
    const report = inspectHost({ root: f.root, expectedNodeVersion: '24.19.0', uid: 0, exec, hostname: '_invalid' });
    for (const id of ['tool:redis-server', 'systemd-manager', 'hostname']) assert.equal(report.checks.find(row => row.id === id).status, 'fail');
});
test('setuid or setgid runtime executables are never executed by the prerequisite checker', t => {
    const f = hostFixture(t);
    for (const mode of [0o4755, 0o2755]) {
        fs.chmodSync(f.at('/usr/bin/node'), mode); const called = [];
        const report = inspectHost({ root: f.root, expectedNodeVersion: '24.19.0', uid: 0,
            exec: (file, args) => { called.push(file); return goodExec(file, args); } });
        assert.equal(report.checks.find(row => row.id === 'tool:node').status, 'fail');
        assert.equal(called.includes('/usr/bin/node'), false);
    }
});
test('execution errors cannot be accepted through otherwise plausible output and exit status', t => {
    const f = hostFixture(t);
    const report = inspectHost({ root: f.root, expectedNodeVersion: '24.19.0', uid: 0,
        exec: (file, args) => ({ ...goodExec(file, args), error: 'ETIMEDOUT' }) });
    for (const id of ['node-exact-version', 'systemd-version', 'systemd-manager', 'openssl-tls13', 'redis-present',
        'node-no-file-capabilities', 'database-ports-free', 'fresh-account:eos-runtime', 'fresh-group:eos-runtime'])
        assert.equal(report.checks.find(row => row.id === id).status, 'fail');
});

test('OS update prerequisite inventory is read-only and rejects absent or partially configured packages', t => {
    const f = hostFixture(t), calls = [];
    const inspected = inspectHost({ root: f.root, expectedNodeVersion: '24.19.0', uid: 0,
        exec: (file, args) => { calls.push({ file, args }); return goodExec(file, args); } });
    for (const name of OS_UPDATE_PACKAGES) assert.equal(inspected.checks.find(row => row.id === `os-update-package:${name}`).status, 'pass');
    assert.equal(calls.some(row => ['apt-get', 'apt-mark', 'dpkg', 'unattended-upgrade', 'python3', 'needrestart'].includes(path.basename(row.file))), false);
    assert.ok(calls.filter(row => row.file === '/usr/bin/dpkg-query').every(row => row.args[0] === '-W'));
    for (const result of [{ status: 1, stdout: '' }, { status: 0, stdout: 'install ok half-configured\t1.0\n' },
        { status: 0, stdout: 'install ok installed\t1.0\nextra\n' }, { status: 0, stdout: 'install ok installed\t1.0\n', error: 'ETIMEDOUT' }]) {
        const report = inspectHost({ root: f.root, expectedNodeVersion: '24.19.0', uid: 0,
            exec: (file, args) => file === '/usr/bin/dpkg-query' && args.at(-1) === 'python3-apt' ? result : goodExec(file, args) });
        assert.equal(report.checks.find(row => row.id === 'os-update-package:python3-apt').status, 'fail');
        assert.equal(report.prerequisitesReady, false);
        assert.equal(report.ready, false);
    }
});
test('OS update trust rejects mutable tools and keyrings before querying package state', t => {
    const f = hostFixture(t), calls = [];
    fs.chmodSync(f.at('/usr/bin/dpkg-query'), 0o777);
    fs.chmodSync(f.at('/usr/bin/python3'), 0o777);
    fs.chmodSync(f.at('/usr/share/keyrings/debian-archive-keyring.gpg'), 0o666);
    const report = inspectHost({ root: f.root, expectedNodeVersion: '24.19.0', uid: 0,
        exec: (file, args) => { calls.push(file); return goodExec(file, args); } });
    for (const id of ['tool:dpkg-query', 'tool:python3', 'os-update-keyring:debian-archive-keyring.gpg', 'os-update-package:python3-apt'])
        assert.equal(report.checks.find(row => row.id === id).status, 'fail');
    assert.equal(calls.includes('/usr/bin/dpkg-query'), false);
});
test('Pi hardware reporting Debian still requires the vendor keyring and package', t => {
    const f = hostFixture(t);
    f.write('/proc/device-tree/model', 'Raspberry Pi 5 Model B Rev 1.0\0');
    const inspect = () => inspectHost({ root: f.root, expectedNodeVersion: '24.19.0', uid: 0, exec: goodExec });
    assert.equal(inspect().checks.find(row => row.id === 'os-update-keyring:raspberrypi-archive-keyring.gpg').status, 'fail');
    f.write('/usr/share/keyrings/raspberrypi-archive-keyring.gpg', 'fixture-pi-keyring');
    assert.equal(inspect().checks.find(row => row.id === 'os-update-package:raspberrypi-archive-keyring').status, 'pass');
    assert.equal(inspect().prerequisitesReady, true);
    assert.equal(inspect().ready, false); // Redis hold is independent of update prerequisites.
});
test('existing updater directories and dangling unit links require migration, never overwrite', t => {
    const f = hostFixture(t);
    for (const p of ['/etc/nexowatt-eos-os-updates', '/var/lib/nexowatt-eos-os-updates']) f.write(`${p}/existing`, 'preserve');
    f.write('/etc/systemd/system/placeholder');
    fs.symlinkSync('/missing', f.at('/etc/systemd/system/nexowatt-eos-os-updates.timer'));
    const report = inspectHost({ root: f.root, expectedNodeVersion: '24.19.0', uid: 0, exec: goodExec });
    for (const p of ['/etc/nexowatt-eos-os-updates', '/var/lib/nexowatt-eos-os-updates', '/etc/systemd/system/nexowatt-eos-os-updates.timer'])
        assert.equal(report.checks.find(row => row.id === `fresh-path:${p}`).status, 'fail');
    assert.equal(fs.readFileSync(f.at('/var/lib/nexowatt-eos-os-updates/existing'), 'utf8'), 'preserve');
});
test('disabled installer copies signed never-run status and protected policy without running package commands', t => {
    const f = installationFixture(t);
    installHost(f.options, f.dependencies);
    for (const p of ['/etc/nexowatt-eos-os-updates', '/var/lib/nexowatt-eos-os-updates']) {
        assert.equal(fs.statSync(f.at(p)).mode & 0o777, 0o755);
        assert.equal(f.calls.some(row => row.file === '/usr/bin/chown' && row.args.at(-1) === f.at(p)), false);
    }
    assert.equal(fs.statSync(f.at('/var/lib/nexowatt-eos-os-updates/private')).mode & 0o777, 0o711);
    for (const [target, source] of [['/etc/nexowatt-eos-os-updates/policy.json', 'policy.json'], ['/var/lib/nexowatt-eos-os-updates/status.json', 'initial-status.json']]) {
        assert.equal(fs.readFileSync(f.at(target), 'utf8'), fs.readFileSync(path.join(REPO, 'system/test-base/os-updates', source), 'utf8'));
        assert.equal(fs.statSync(f.at(target)).mode & 0o777, 0o644);
    }
    const status = JSON.parse(fs.readFileSync(f.at('/var/lib/nexowatt-eos-os-updates/status.json')));
    assert.equal(status.lastSuccessAt, null);
    assert.equal(f.calls.some(row => ['apt-get', 'apt-mark', 'dpkg', 'unattended-upgrade', 'python3'].includes(path.basename(row.file))), false);
});
test('missing or writable updater release files reject installation before account or host writes', t => {
    for (const name of ['runtime/os-updates/runner.py', 'system/test-base/os-updates/policy.json', 'system/test-base/os-updates/initial-status.json']) {
        const f = installationFixture(t);
        fs.chmodSync(f.at(`${releasePath}/${name}`), 0o666);
        assert.throws(() => installHost(f.options, f.dependencies), /INVALID_RELEASE_LAYOUT/);
        assert.equal(f.calls.length, 0);
        assert.equal(fs.existsSync(f.at('/etc/nexowatt-eos-os-updates')), false);
        fs.unlinkSync(f.at(`${releasePath}/${name}`));
        assert.throws(() => installHost(f.options, f.dependencies));
        assert.equal(f.calls.length, 0);
    }
});
test('failed updater timer activation disables future scheduling without killing an APT transaction', t => {
    const f = installationFixture(t);
    const original = f.dependencies.exec;
    f.dependencies.exec = (file, args, options) => {
        const result = original(file, args, options);
        return args[0] === 'enable' && args.includes('nexowatt-eos-os-updates.timer') ? { status: 1, stdout: '', stderr: 'fixture timer failure' } : result;
    };
    assert.throws(() => installHost({ ...f.options, start: true }, f.dependencies), /HOST_COMMAND_FAILED/);
    for (const verb of ['stop', 'disable']) {
        assert.ok(f.calls.some(row => row.args[0] === verb && row.args.includes('nexowatt-eos-os-updates.timer')));
        assert.equal(f.calls.some(row => row.args[0] === verb && row.args.includes('nexowatt-eos-os-updates.service')), false);
    }
    assert.equal(f.calls.some(row => /(?:apt-get|dpkg|unattended-upgrade|kill)$/.test(row.file)), false);
});
