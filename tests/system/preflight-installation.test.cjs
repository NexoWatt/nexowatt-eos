'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const vm = require('node:vm');
const { fixture } = require('./fixtures/installation-bundle.cjs');
const { inventory } = require('../../runtime/release/bundle.cjs');
const { parseArgs, inspectInstallation } = require('../../tools/system/preflight-installation.cjs');
const args = options => Object.entries(options).flat();
test('valid signed bundle and commissioning inputs never bypass Redis security hold or mutate the host', t => {
    const f = fixture(t); f.sign(); const before = inventory(f.target);
    const report = inspectInstallation(parseArgs(args(f.options)), f.dependencies);
    assert.equal(report.ready, false); assert.equal(report.host.prerequisitesReady, true);
    assert.equal(report.host.checks.find(row => row.id === 'redis-security-admission').status, 'fail');
    assert.deepEqual(report.nextSteps, []);
    assert.equal(report.changesPerformed, false); assert.equal(report.productionReleaseApproved, false);
    assert.equal(report.redisTlsVerified, false); assert.equal(report.commissioningInputs.installerAccounts, 1); assert.equal(report.commissioningInputs.enduserAccounts, 1);
    assert.deepEqual(inventory(f.target), before);
    for (const password of f.passwords) assert.equal(JSON.stringify(report).includes(password), false);
    assert.equal(f.calls.some(([, argv]) => argv.some(value => ['start', 'enable', 'provision', 'setup'].includes(value))), false);
    assert.equal(report.host.checks.find(row => row.id === 'web-ports-free').status, 'pass');
});
test('tampered signed payload and wrong signer fail before target commands or credential validation', t => {
    const f = fixture(t); f.sign();
    fs.appendFileSync(path.join(f.options['--bundle'], 'payload/app/package.json'), ' ');
    assert.throws(() => inspectInstallation(f.options, f.dependencies), /BUNDLE_/); assert.equal(f.calls.length, 0);
});
test('wrong signing public key is rejected even when all host prerequisites are ready', t => {
    const f = fixture(t); f.sign();
    fs.writeFileSync(f.options['--public-key'], crypto.generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' }));
    assert.throws(() => inspectInstallation(f.options, f.dependencies), /BUNDLE_SIGNATURE/); assert.equal(f.calls.length, 0);
});
test('a valid signature never promotes a pending catalog entry', t => {
    const f = fixture(t); f.catalog.entries[1].review = { status: 'pending', evidenceId: null }; f.write('payload/catalog.json', f.catalog); f.sign();
    assert.throws(() => inspectInstallation(f.options, f.dependencies), /E_NOT_APPROVED/); assert.equal(f.calls.length, 0);
});
test('current release must declare the observed target architecture and exact Node version', t => {
    const f = fixture(t); f.metadata.platforms = [process.arch === 'x64' ? 'linux-arm64' : 'linux-x64']; f.sign();
    assert.throws(() => inspectInstallation(f.options, f.dependencies), /BUNDLE_PLATFORM/); assert.equal(f.calls.length, 0);
});
test('duplicate service and installer credentials or browser-selected admin role fail before target commands', t => {
    const f = fixture(t); f.sign(); f.accounts.accounts[0].password = f.passwords[0]; f.write('accounts.json', f.accounts, 0o600);
    assert.throws(() => inspectInstallation(f.options, f.dependencies), /ENROLLMENT_PASSWORD_REUSED/);
    f.accounts.accounts[0].password = f.passwords[1]; f.accounts.accounts[0].role = 'admin'; f.write('accounts.json', f.accounts, 0o600);
    assert.throws(() => inspectInstallation(f.options, f.dependencies), /ENROLLMENT_ACCOUNTS_SCHEMA/); assert.equal(f.calls.length, 0);
});
test('secret modes, symlinks and invalid certificate hosts are rejected before target commands', t => {
    const f = fixture(t); f.sign(); const secret = f.options['--password-file']; fs.chmodSync(secret, 0o644);
    assert.throws(() => inspectInstallation(f.options, f.dependencies), /ONBOARD_SECRET_PERMISSIONS/); fs.chmodSync(secret, 0o600);
    const link = path.join(f.root, 'password-link'); fs.symlinkSync(secret, link);
    assert.throws(() => inspectInstallation({ ...f.options, '--password-file': link }, f.dependencies), /INSTALLED_UNTRUSTED_PATH/);
    f.write('hosts.json', ['https://not-a-certificate-host.invalid/']);
    assert.throws(() => inspectInstallation(f.options, f.dependencies)); assert.equal(f.calls.length, 0);
});
test('occupied integrated UI port yields a non-mutating rejected report', t => {
    const f = fixture(t); f.sign(); const original = f.dependencies.hostFixture.exec;
    f.dependencies.hostFixture.exec = (file, argv) => file.endsWith('/ss') ? { status: 0, stdout: 'LISTEN 0 128 [::]:8188 *:*\n' } : original(file, argv);
    const before = inventory(f.target); const report = inspectInstallation(f.options, f.dependencies);
    assert.equal(report.ready, false); assert.deepEqual(report.nextSteps, []); assert.deepEqual(inventory(f.target), before);
});
test('CLI bounds exact path-only arguments, requires root, and never dumps raw parser errors', t => {
    const f = fixture(t); f.sign();
    for (const argv of [[], ['--password', 'secret'], args({ ...f.options, '--hosts-file': 'relative' }), [...args(f.options), '--extra', '/root/file']]) assert.throws(() => parseArgs(argv), /PREFLIGHT_INSTALLATION_USAGE/);
    assert.throws(() => inspectInstallation(f.options, { ...f.dependencies, uid: 1000 }), /PREFLIGHT_ROOT_REQUIRED/);
    f.write('accounts.json', '{"password":"never-print-this-fixture-value', 0o600);
    const result = spawnSync(process.execPath, [path.resolve(__dirname, '../../tools/system/preflight-installation.cjs'), ...args(f.options)], { encoding: 'utf8', timeout: 10000 });
    assert.equal(result.status, 1); assert.equal(result.stdout, ''); assert.equal(result.stderr.includes('never-print-this'), false);
    assert.deepEqual(JSON.parse(result.stderr), { ready: false, changesPerformed: false, code: 'PREFLIGHT_INSTALLATION_FAILED' });
});
function orchestratorFixture(ready, targetRoot) {
    // Execute the actual orchestrator and real signature/catalog/SBOM validation.
    // Only privileged write/host command boundaries are mocked; this is not a
    // systemd or installation acceptance test and never touches /opt or /etc.
    const filename = path.resolve(__dirname, '../../tools/system/eos-base.cjs');
    const nativeRequire = createRequire(filename), events = [], module = { exports: {} };
    const customRequire = name => {
        const original = nativeRequire(name);
        if (name === 'node:fs') return { ...original, mkdirSync: target => { events.push({ kind: 'mkdir', target }); } };
        if (name === './host-preflight.cjs') return { ...original, inspectHost: options => {
            events.push({ kind: 'host', options });
            return typeof ready === 'function' ? ready(options) : { ready };
        } };
        if (name === './install-host.cjs') return { ...original,
            assertNoSymlinkAncestors: target => {
                // /opt belongs to the disposable runner, not to this synthetic
                // host. Keep the real guard, but inspect our controlled target.
                if (target === '/opt/nexowatt/eos') {
                    assert.ok(typeof targetRoot === 'string' && targetRoot.startsWith('/root/eos-install-preflight-fixture-'));
                    return original.assertNoSymlinkAncestors(path.join(targetRoot, 'opt/nexowatt/eos'));
                }
                return original.assertNoSymlinkAncestors(target);
            },
            privateWrite: target => { events.push({ kind: 'write', target }); },
            installHost: options => { events.push({ kind: 'installHost', options }); return { phase: 'FIXTURE_ONLY' }; } };
        if (name === '../../runtime/release/bundle.cjs') return { ...original, stageBundle: options => {
            events.push({ kind: 'stage' }); const verified = original.verifyBundle(options);
            return { ...verified, releasePath: `/opt/nexowatt/eos/releases/${verified.releaseId}` };
        } };
        return original;
    };
    vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { require: customRequire, module, exports: module.exports,
        __filename: filename, __dirname: path.dirname(filename), process, Buffer, console });
    return { install: module.exports.install, events };
}
test('direct signed installer cannot skip integrated web port gate by omitting standalone preflight', t => {
    const f = fixture(t); f.sign(); const harness = orchestratorFixture(false);
    assert.throws(() => harness.install({ bundleDirectory: f.options['--bundle'], keyFile: f.options['--public-key'], start: true }), /HOST_PREFLIGHT_REJECTED/);
    assert.equal(harness.events.length, 1); assert.equal(harness.events[0].kind, 'host');
    assert.deepEqual(harness.events[0].options.webPorts, [8081, 8188]);
});
test('actual Redis admission hold prevents direct signed installation before staging, accounts or services', t => {
    const f = fixture(t); f.sign(); const before = inventory(f.target);
    const { inspectHost } = require('../../tools/system/host-preflight.cjs');
    for (const version of ['12', '13']) {
        f.write('target/etc/os-release', `ID=debian\nVERSION_ID="${version}"\n`);
        const exec = (file, argv) => {
            if (version === '13' && file.endsWith('/redis-server')) return { status: 0, stdout: 'Redis server v=8.0.2\n' };
            if (version === '13' && file.endsWith('/systemctl')) return { status: 0, stdout: argv[0] === '--version' ? 'systemd 257\n' : 'Version=257\nSystemState=running\n' };
            return f.dependencies.hostFixture.exec(file, argv);
        };
        const harness = orchestratorFixture(options => {
            const report = inspectHost({ ...f.dependencies.hostFixture, ...options, exec });
            assert.equal(report.prerequisitesReady, true);
            assert.deepEqual(report.checks.filter(row => row.status === 'fail').map(row => row.id), ['redis-security-admission']);
            return report;
        });
        for (const start of [true, false]) {
            harness.events.length = 0;
            assert.throws(() => harness.install({ bundleDirectory: f.options['--bundle'], keyFile: f.options['--public-key'], start }), /HOST_PREFLIGHT_REJECTED/);
            assert.deepEqual(harness.events.map(row => row.kind), ['host']);
        }
    }
    // Only our deliberate OS fixture input changed, never an installation file.
    assert.deepEqual(inventory(f.target).filter(row => row.path !== 'etc/os-release'), before.filter(row => row.path !== 'etc/os-release'));
});
test('verified installer forwards the same catalog port profile to the privileged host recheck', t => {
    const f = fixture(t); f.sign(); const harness = orchestratorFixture(true, f.target);
    const result = harness.install({ bundleDirectory: f.options['--bundle'], keyFile: f.options['--public-key'], start: true });
    assert.equal(result.phase, 'FIXTURE_ONLY');
    const first = harness.events.find(row => row.kind === 'host'), last = harness.events.find(row => row.kind === 'installHost');
    assert.deepEqual(first.options.webPorts, [8081, 8188]); assert.deepEqual(last.options.webPorts, first.options.webPorts);
    assert.equal(harness.events.findIndex(row => row.kind === 'stage') > harness.events.findIndex(row => row.kind === 'host'), true);
});

test('orchestrator fixture keeps the actual ancestor guard and rejects a writable target before staging', t => {
    const f = fixture(t); f.sign(); const harness = orchestratorFixture(true, f.target);
    fs.chmodSync(f.target, 0o777);
    assert.throws(() => harness.install({ bundleDirectory: f.options['--bundle'], keyFile: f.options['--public-key'], start: true }),
        /UNTRUSTED_INSTALL_PARENT/);
    assert.equal(harness.events.some(row => row.kind === 'stage' || row.kind === 'installHost' || row.kind === 'write'), false);
});
