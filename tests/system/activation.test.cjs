'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { activateRelease, validateAdditive, PROFILE_FILE } = require('../../tools/system/activate-release.cjs');
const OLD = '1'.repeat(64), NEXT = '2'.repeat(64), KEY = '3'.repeat(64);
const oldPath = `/opt/nexowatt/eos/releases/${OLD}`, nextPath = `/opt/nexowatt/eos/releases/${NEXT}`;
function descriptors() {
    const core = { id: 'js-controller', package: 'iobroker.js-controller', version: '7.2.2', sha256: 'a'.repeat(64), kind: 'core', required: true };
    const adapter = { id: 'sample', package: 'iobroker.sample', version: '1.0.0', sha256: 'b'.repeat(64), kind: 'adapter', required: false };
    const row = (path, sha = 'a'.repeat(64)) => ({ path, size: 1, sha256: sha, mode: 0o644 });
    const files = ['runtime/bootstrap/initialize.cjs', 'runtime/controller-profile/guard.cjs', 'app/package.json', 'app/package-lock.json', 'catalog.json', 'sbom.cdx.json', PROFILE_FILE,
        'app/node_modules/iobroker.js-controller/package.json', 'app/node_modules/iobroker.js-controller/controller.js', 'app/node_modules/dependency/package.json',
        'system/test-base/systemd/nexowatt-eos-controller.service'].map(p => row(p));
    const old = {
        manifest: { profile: 'test', sequence: 1, nodeVersion: process.versions.node, platforms: ['linux-x64'], files },
        catalog: { catalogRevision: 1, entries: [core] },
        app: { name: 'eos-test-base', dependencies: { 'iobroker.js-controller': '7.2.2' } },
        lock: { lockfileVersion: 3, packages: { '': { dependencies: { 'iobroker.js-controller': '7.2.2' } }, 'node_modules/iobroker.js-controller': { version: '7.2.2', integrity: 'fixed' }, 'node_modules/dependency': { version: '1.0.0' } } },
        profile: { schemaVersion: 1, kind: 'eos-controller-test-profile', controllerVersion: '7.2.2', adapters: [] }
    };
    const next = structuredClone(old); next.manifest.sequence = 2;
    next.catalog.catalogRevision = 2; next.catalog.entries.push(adapter); next.catalog.entries[0].sha256 = 'c'.repeat(64);
    next.app.dependencies['iobroker.sample'] = '1.0.0'; next.lock.packages[''].dependencies['iobroker.sample'] = '1.0.0';
    next.lock.packages['node_modules/iobroker.sample'] = { version: '1.0.0' };
    next.manifest.files.find(f => f.path === PROFILE_FILE).sha256 = 'b'.repeat(64);
    next.manifest.files.push(row('app/node_modules/iobroker.sample/package.json'), row('app/node_modules/iobroker.sample/main.js'));
    next.profile.adapters.push({ package: 'iobroker.sample', version: '1.0.0', main: 'main.js' });
    return { old, next };
}
test('additive validation admits exact new adapter and profile only', () => {
    const { old, next } = descriptors(); assert.deepEqual(validateAdditive(old, next).added, [{ id: 'sample', package: 'iobroker.sample', version: '1.0.0' }]);
});
for (const [name, change, code] of [
    ['sequence downgrade', d => d.next.manifest.sequence = 1, 'ACTIVATION_RELEASE_SCOPE'],
    ['Node change', d => d.next.manifest.nodeVersion = '26.0.0', 'ACTIVATION_RELEASE_SCOPE'],
    ['core version change', d => d.next.catalog.entries[0].version = '7.2.3', 'ACTIVATION_CORE_CHANGE'],
    ['dependency version change', d => d.next.lock.packages['node_modules/dependency'].version = '2.0.0', 'ACTIVATION_EXISTING_DEPENDENCY_CHANGE'],
    ['controller code change', d => d.next.manifest.files.find(f => f.path.endsWith('/controller.js')).sha256 = '0'.repeat(64), 'ACTIVATION_EXISTING_CODE_CHANGE'],
    ['missing old file', d => d.next.manifest.files.shift(), 'ACTIVATION_FILE_REMOVAL'],
    ['extra core file', d => d.next.manifest.files.push({ path: 'app/node_modules/iobroker.js-controller/extra.js', size: 1, sha256: '0'.repeat(64), mode: 0o644 }), 'ACTIVATION_NON_ADDITIVE_FILE'],
    ['service code replacement', d => d.next.manifest.files.find(f => f.path.endsWith('.service')).sha256 = '0'.repeat(64), 'ACTIVATION_EXISTING_CODE_CHANGE'],
    ['unadmitted profile entry', d => d.next.profile.adapters.push({ package: 'iobroker.extra', version: '1.0.0', main: 'main.js' }), 'ACTIVATION_PROFILE_CATALOG_MISMATCH']
]) {
    test(`rejects ${name} before service operations`, () => { const d = descriptors(); change(d); assert.throws(() => validateAdditive(d.old, d.next), new RegExp(code)); });
}
test('existing admitted adapter bytes, version and permissions cannot change', () => {
    const d = descriptors();
    d.old.catalog.entries.push({ id: 'prior', package: 'iobroker.prior', version: '1.0.0', sha256: 'd'.repeat(64), kind: 'adapter', required: false });
    d.next.catalog.entries.push({ ...d.old.catalog.entries.at(-1), sha256: 'e'.repeat(64) });
    assert.throws(() => validateAdditive(d.old, d.next), /ACTIVATION_EXISTING_ADAPTER_CHANGE/);
});
function fixture(t, behavior = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-activation-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const at = p => path.join(root, p), calls = [], checked = [];
    fs.mkdirSync(at('/etc/nexowatt-eos'), { recursive: true });
    fs.mkdirSync(at('/var/lib/nexowatt-eos'), { recursive: true });
    fs.mkdirSync(at('/opt/nexowatt/eos/releases'), { recursive: true });
    const state = { schemaVersion: 1, releaseId: OLD, sequence: 1, nodeVersion: process.versions.node, publicKeySha256: KEY, profile: 'test' };
    fs.writeFileSync(at('/etc/nexowatt-eos/release-state.json'), JSON.stringify(state) + '\n');
    fs.writeFileSync(at('/var/lib/nexowatt-eos/.initialized'), '{}');
    fs.symlinkSync(oldPath, at('/opt/nexowatt/eos/current'));
    const d = descriptors();
    let trialAllowed = false;
    const maintenance = { authorizeStart() { trialAllowed = true; }, blockStart() { trialAllowed = false; } };
    const exec = (file, args) => {
        if (args[0] === 'start') assert.equal(trialAllowed, true, 'controlled start must have a live maintenance permit');
        calls.push({ file, args, target: fs.readlinkSync(at('/opt/nexowatt/eos/current')) });
        const target = fs.readlinkSync(at('/opt/nexowatt/eos/current'));
        const fail = args[0] === 'start' && (behavior.failAllStarts || behavior.failNewStart && target === nextPath);
        return { status: fail ? 1 : 0, stdout: '', stderr: '' };
    };
    return { root, at, calls, checked, state, d,
        options: { releaseId: NEXT, releasePath: nextPath, publicKeySha256: KEY },
        dependencies: { root, uid: 0, exec, maintenance, ownerCheck: () => {}, loadDescriptor(id) { checked.push(id); return id === OLD ? d.old : d.next; } } };
}
test('successful transaction verifies both releases, starts through systemd and commits pointer/state', t => {
    const f = fixture(t); const result = activateRelease(f.options, f.dependencies);
    assert.equal(result.phase, 'ADDITIVE_RELEASE_ACTIVE'); assert.equal(result.adapterInstancesCreated, 0);
    assert.deepEqual(f.checked, [OLD, NEXT]);
    assert.deepEqual(f.calls.map(c => c.args[0]), ['is-active', 'stop', 'reset-failed', 'start', 'is-active']);
    assert.equal(fs.readlinkSync(f.at('/opt/nexowatt/eos/current')), nextPath);
    assert.equal(JSON.parse(fs.readFileSync(f.at('/etc/nexowatt-eos/release-state.json'))).sequence, 2);
    assert.equal(JSON.parse(fs.readFileSync(f.at('/etc/nexowatt-eos/activation-status.json'))).phase, 'ACTIVE');
    assert.equal(fs.existsSync(f.at('/etc/nexowatt-eos/.activation.lock')), false);
});
test('new startup failure restores old pointer, verifies old startup and keeps original sequence', t => {
    const f = fixture(t, { failNewStart: true });
    assert.throws(() => activateRelease(f.options, f.dependencies), /ACTIVATION_ROLLED_BACK/);
    assert.equal(fs.readlinkSync(f.at('/opt/nexowatt/eos/current')), oldPath);
    assert.equal(JSON.parse(fs.readFileSync(f.at('/etc/nexowatt-eos/release-state.json'))).sequence, 1);
    assert.equal(JSON.parse(fs.readFileSync(f.at('/etc/nexowatt-eos/activation-status.json'))).phase, 'ROLLED_BACK');
    assert.equal(fs.existsSync(f.at('/etc/nexowatt-eos/.activation.lock')), false);
    assert.equal(f.calls.filter(c => c.args[0] === 'start').at(-1).target, oldPath);
});
test('failed recovery keeps operation lock and reports manual recovery required', t => {
    const f = fixture(t, { failAllStarts: true });
    assert.throws(() => activateRelease(f.options, f.dependencies), /ACTIVATION_RECOVERY_FAILED/);
    assert.equal(fs.existsSync(f.at('/etc/nexowatt-eos/.activation.lock')), true);
    assert.equal(JSON.parse(fs.readFileSync(f.at('/etc/nexowatt-eos/activation-status.json'))).phase, 'RECOVERY_FAILED');
});
test('concurrent or interrupted operation lock rejects new activation without commands', t => {
    const f = fixture(t); fs.writeFileSync(f.at('/etc/nexowatt-eos/.activation.lock'), 'existing-operation');
    assert.throws(() => activateRelease(f.options, f.dependencies), /ACTIVATION_IN_PROGRESS/);
    assert.equal(f.calls.length, 0); assert.equal(fs.readFileSync(f.at('/etc/nexowatt-eos/.activation.lock'), 'utf8'), 'existing-operation');
});
test('wrong signing identity and state/pointer mismatch reject before stop', t => {
    const f = fixture(t);
    assert.throws(() => activateRelease({ ...f.options, publicKeySha256: 'f'.repeat(64) }, f.dependencies), /ACTIVATION_STATE_INVALID/);
    fs.unlinkSync(f.at('/opt/nexowatt/eos/current')); fs.symlinkSync(nextPath, f.at('/opt/nexowatt/eos/current'));
    assert.throws(() => activateRelease(f.options, f.dependencies), /ACTIVATION_CURRENT_STATE_MISMATCH/);
    assert.equal(f.calls.length, 0);
});
test('unprivileged activation and arbitrary stage paths are refused', t => {
    const f = fixture(t);
    assert.throws(() => activateRelease(f.options, { ...f.dependencies, uid: 1000 }), /ROOT_OPERATOR_REQUIRED/);
    assert.throws(() => activateRelease({ ...f.options, releasePath: '/tmp/code' }, f.dependencies), /ACTIVATION_STAGED_RELEASE_REQUIRED/);
});
test('state commit failure triggers verified rollback rather than accepting split state', t => {
    const f = fixture(t); const { atomicWrite } = require('../../tools/system/activate-release.cjs'); let once = true;
    f.dependencies.atomicWrite = (file, bytes) => {
        if (once && file.endsWith('release-state.json')) { once = false; const e = new Error('disk fixture'); e.code = 'ENOSPC'; throw e; }
        atomicWrite(file, bytes);
    };
    assert.throws(() => activateRelease(f.options, f.dependencies), /ACTIVATION_ROLLED_BACK/);
    assert.equal(fs.readlinkSync(f.at('/opt/nexowatt/eos/current')), oldPath);
    assert.equal(JSON.parse(fs.readFileSync(f.at('/etc/nexowatt-eos/release-state.json'))).releaseId, OLD);
});

test('rate limited controller is reset specifically before trial and recovery starts', t => {
    const f = fixture(t, { failNewStart: true }); const original = f.dependencies.exec; let reset = false;
    f.dependencies.exec = (file, args) => {
        if (args[0] === 'reset-failed') { assert.deepEqual(args, ['reset-failed', 'nexowatt-eos-controller.service']); reset = true; }
        if (args[0] === 'start') { assert.equal(reset, true, 'start limit must be reset before this specific start'); reset = false; }
        return original(file, args);
    };
    assert.throws(() => activateRelease(f.options, f.dependencies), /ACTIVATION_ROLLED_BACK/);
    assert.equal(f.calls.filter(c => c.args[0] === 'reset-failed').length, 2);
});
test('persistent journal write failure cannot block old pointer and controller restoration', t => {
    const f = fixture(t); const { atomicWrite } = require('../../tools/system/activate-release.cjs'); let switched = false;
    f.dependencies.atomicWrite = (file, bytes) => {
        if (file.endsWith('activation-status.json')) {
            const phase = JSON.parse(bytes).phase;
            if (switched) { const e = new Error('persistent journal ENOSPC fixture'); e.code = 'ENOSPC'; throw e; }
            if (phase === 'SWITCHING') switched = true;
        }
        atomicWrite(file, bytes);
    };
    assert.throws(() => activateRelease(f.options, f.dependencies), /ACTIVATION_RECOVERY_FAILED/);
    assert.equal(fs.readlinkSync(f.at('/opt/nexowatt/eos/current')), oldPath);
    assert.ok(f.calls.some(c => c.args[0] === 'start' && c.target === oldPath));
    assert.equal(JSON.parse(fs.readFileSync(f.at('/etc/nexowatt-eos/release-state.json'))).releaseId, OLD);
    assert.equal(fs.existsSync(f.at('/etc/nexowatt-eos/.activation.lock')), true);
});
test('permit revocation I/O failure still restores the previous release and retains a stopped maintenance gate', t => {
    const f = fixture(t, { failNewStart: true });
    f.dependencies.maintenance.blockStart = () => { const error = new Error('I/O fixture'); error.code = 'EIO'; throw error; };
    assert.throws(() => activateRelease(f.options, f.dependencies), /ACTIVATION_CLEANUP_INCOMPLETE/);
    assert.equal(fs.readlinkSync(f.at('/opt/nexowatt/eos/current')), oldPath);
    assert.equal(JSON.parse(fs.readFileSync(f.at('/etc/nexowatt-eos/release-state.json'))).releaseId, OLD);
    assert.ok(f.calls.some(c => c.args[0] === 'start' && c.target === oldPath));
    assert.deepEqual(f.calls.at(-1).args, ['stop', 'nexowatt-eos-controller.service']);
    assert.equal(fs.existsSync(f.at('/etc/nexowatt-eos/.activation.lock')), true);
});
test('successful trial with failed final gate cleanup is stopped and cannot report success', t => {
    const f = fixture(t);
    f.dependencies.maintenance.blockStart = () => { throw new Error('persistent EIO'); };
    assert.throws(() => activateRelease(f.options, f.dependencies), /ACTIVATION_CLEANUP_INCOMPLETE/);
    assert.equal(fs.existsSync(f.at('/etc/nexowatt-eos/.activation.lock')), true);
    assert.deepEqual(f.calls.at(-1).args, ['stop', 'nexowatt-eos-controller.service']);
});
