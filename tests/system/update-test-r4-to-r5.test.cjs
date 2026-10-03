'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const repair = require('../../tools/system/update-test-r4-to-r5.cjs');
const { sha256 } = require('../../runtime/release/bundle.cjs');
const { atomicWrite } = require('../../tools/system/activate-release.cjs');
const ID = 'a'.repeat(64);
function descriptors() {
    const manifest = sequence => ({ sequence, profile: 'test', releaseVersion: '0.2.0-test.3', nodeVersion: '24.21.0',
        platforms: ['linux-arm64'], files: [{ path: 'runtime/postgresql/schema.sql', size: 4, sha256: sha256('sql\n'), mode: 0o644 },
            { path: 'system/postgresql-test/systemd/nexowatt-eos-controller.service', size: 5, sha256: sha256('unit\n'), mode: 0o644 }] });
    const catalog = { entries: [{ id: 'js-controller', package: 'iobroker.js-controller', version: '7.2.2', sha256: '1'.repeat(64),
        kind: 'core', required: true, review: { status: 'approved-test' }, permissions: { shellExec: false } },
    { id: 'nexowatt-devices', package: 'iobroker.nexowatt-devices', version: '0.5.169', sha256: '2'.repeat(64),
        kind: 'adapter', required: false, review: { status: 'pending' }, permissions: { shellExec: false } }] };
    return { old: { releaseId: repair.BASE.releaseId, manifest: manifest(7), catalog },
        next: { releaseId: ID, manifest: manifest(8), catalog: structuredClone(catalog) } };
}
function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-r4-repair-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const at = name => path.join(root, name);
    for (const dir of ['/etc/nexowatt-eos/web', '/etc/systemd/system', '/opt/nexowatt/eos/releases/' + repair.BASE.releaseId,
        '/opt/nexowatt/eos/verified', '/var/lib/nexowatt-eos', '/import/bundle/payload']) fs.mkdirSync(at(dir), { recursive: true });
    const state = Buffer.from(JSON.stringify({ schemaVersion: 1, ...repair.BASE }) + '\n');
    fs.writeFileSync(at('/etc/nexowatt-eos/release-state.json'), state);
    for (const name of repair.PRESERVED) fs.writeFileSync(at('/etc/nexowatt-eos/' + name), 'preserved-' + name);
    fs.writeFileSync(at('/etc/nexowatt-eos/first-start-complete.json'), JSON.stringify({ schemaVersion: 1,
        releaseId: repair.BASE.releaseId, physicalControlEnabled: false }));
    fs.writeFileSync(at('/var/lib/nexowatt-eos/.initialized'), 'installed');
    fs.writeFileSync(at('/etc/systemd/system/nexowatt-eos-controller.service'), 'unit\n');
    fs.symlinkSync('/opt/nexowatt/eos/releases/' + repair.BASE.releaseId, at('/opt/nexowatt/eos/current'));
    const publicKey = crypto.generateKeyPairSync('ed25519').publicKey.export({ format: 'pem', type: 'spki' });
    fs.writeFileSync(at('/import/release-public.pem'), publicKey);
    fs.writeFileSync(at('/import/bundle/manifest.json'), '{}\n');
    fs.writeFileSync(at('/import/bundle/manifest.sig'), Buffer.alloc(64));
    const options = { bundleDirectory: at('/import/bundle'), publicKeyFile: at('/import/release-public.pem'),
        expectedReleaseId: ID, expectedKeySha256: sha256(publicKey) };
    const desc = descriptors(); desc.next.payloadPath = at('/import/bundle/payload');
    const events = []; let active = 'active';
    const dependencies = { root, uid: 0, ownerUid: process.getuid(), invocationId: '3'.repeat(32), nodeVersion: '24.21.0', platform: 'linux-arm64',
        ownerCheck: () => {}, toolTrust: () => ({ trusted: true }), trustedImport: () => {},
        inspectInstalled: release => path.basename(release) === repair.BASE.releaseId ? desc.old : desc.next,
        verifyBundle: () => desc.next, validatePayload: () => ({ catalog: desc.next.catalog }),
        stageBundle: () => { events.push('stage'); fs.mkdirSync(at('/opt/nexowatt/eos/releases/' + ID)); },
        nativeProbe: () => { events.push('native'); return { passed: true, deviceIoPerformed: false }; },
        readiness: async () => { events.push('readiness'); },
        atomicWrite: (file, bytes) => atomicWrite(file, bytes),
        exec: (file, args) => {
            assert.equal(file, '/usr/bin/systemctl'); events.push(args.join(' '));
            if (args[0] === 'show') return { status: 0, stdout: active };
            if (args[0] === 'stop') active = 'inactive';
            if (args[0] === 'start') active = 'active';
            if (args[0] === 'is-active' && args.includes('nexowatt-eos-controller.service') && active !== 'active') return { status: 3, stdout: '' };
            return { status: 0, stdout: '' };
        }, maintenance: {
            authorizeStart: (dir, operation) => { assert.equal(operation, 'test-release-repair'); events.push('permit'); fs.writeFileSync(path.join(dir, 'maintenance-start.json'), 'permit'); },
            blockStart: dir => { events.push('revoke'); const p = path.join(dir, 'maintenance-start.json'); if (fs.existsSync(p)) fs.unlinkSync(p); },
        } };
    return { at, state, options, dependencies, events, desc, active: () => active, setActive: value => { active = value; },
        current: () => fs.readlinkSync(at('/opt/nexowatt/eos/current')), journal: () => JSON.parse(fs.readFileSync(at('/etc/nexowatt-eos/test-repair-status.json'))),
        locked: () => fs.existsSync(at('/etc/nexowatt-eos/.activation.lock')) };
}
const expect = code => error => error.code === code;
test('CLI requires explicit absolute input paths and both independent new trust pins', () => {
    assert.throws(() => repair.parseArgs([]), expect('REPAIR_USAGE'));
    assert.throws(() => repair.parseArgs(['--bundle','/b','--public-key','/k','--expected-release-id',ID,'--expected-key-sha256',repair.BASE.publicKeySha256]), expect('REPAIR_EXPLICIT_NEW_TRUST_REQUIRED'));
    assert.throws(() => repair.parseArgs(['--bundle','relative','--public-key','/k','--expected-release-id',ID,'--expected-key-sha256','b'.repeat(64)]), expect('REPAIR_INPUT_PATH'));
});
test('baseline must exactly match R4 release, sequence, key, runtime, profile and schema', () => {
    const state = { schemaVersion: 1, ...repair.BASE }; repair.validateState(state);
    for (const [name, value] of Object.entries({ sequence: 6, releaseId: ID, publicKeySha256: 'b'.repeat(64), nodeVersion: '24.19.0', profile: 'production', extra: 1 }))
        assert.throws(() => repair.validateState({ ...state, [name]: value }), expect('REPAIR_R4_BASELINE_REQUIRED'));
});
test('transition rejects schema/unit mutation, new service, admission expansion and stale sequence', () => {
    const options = { expectedReleaseId: ID };
    for (const change of [d => d.next.manifest.sequence = 7,
        d => d.next.manifest.files[0].sha256 = 'f'.repeat(64),
        d => d.next.manifest.files.push({ path: 'system/postgresql-test/systemd/extra.service', size: 1, sha256: 'c'.repeat(64), mode: 0o644 }),
        d => d.next.catalog.entries[1].review.status = 'approved-test']) {
        const d = descriptors(); change(d); assert.throws(() => repair.validateTransition(d.old, d.next, options));
    }
});
test('successful update preserves configuration, first-start provenance and old release; checks readiness before unlock', async t => {
    const f = fixture(t), before = repair.PRESERVED.map(name => fs.readFileSync(f.at('/etc/nexowatt-eos/' + name)));
    const result = await repair.update(f.options, f.dependencies);
    assert.equal(result.phase, 'TEST_REPAIR_ACTIVE'); assert.equal(result.productionReleaseApproved, false);
    assert.equal(f.current(), '/opt/nexowatt/eos/releases/' + ID); assert.equal(f.locked(), false);
    assert.equal(f.journal().phase, 'ACTIVE'); assert.equal(f.active(), 'active');
    assert.ok(fs.existsSync(f.at('/opt/nexowatt/eos/releases/' + repair.BASE.releaseId)));
    for (const [i, name] of repair.PRESERVED.entries()) assert.deepEqual(fs.readFileSync(f.at('/etc/nexowatt-eos/' + name)), before[i]);
    assert.equal(JSON.parse(fs.readFileSync(f.at('/etc/nexowatt-eos/release-state.json'))).publicKeySha256, f.options.expectedKeySha256);
    assert.ok(f.events.indexOf('native') < f.events.indexOf('stop nexowatt-eos-controller.service'));
    assert.ok(f.events.indexOf('readiness') < f.events.indexOf('revoke'));
    assert.ok(!f.events.some(row => /postgresql.*stop|daemon-reload|enable|initialize|setup/.test(row)));
});
test('wrong new key pin fails before stage or stop', async t => {
    const f = fixture(t); f.options.expectedKeySha256 = 'd'.repeat(64);
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_NEW_KEY_PIN'));
    assert.deepEqual(f.events, []); assert.equal(f.locked(), false);
});
test('installed unit drift fails before runtime mutation', async t => {
    const f = fixture(t); fs.writeFileSync(f.at('/etc/systemd/system/nexowatt-eos-controller.service'), 'changed');
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_INSTALLED_UNIT_CHANGED'));
    assert.ok(!f.events.includes('stage')); assert.equal(f.active(), 'active');
});
test('existing maintenance lock is not removed or overwritten', async t => {
    const f = fixture(t), lock = f.at('/etc/nexowatt-eos/.activation.lock'); fs.writeFileSync(lock, 'another-operation');
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_MAINTENANCE_IN_PROGRESS'));
    assert.equal(fs.readFileSync(lock, 'utf8'), 'another-operation'); assert.ok(!f.events.includes('stage'));
});
test('native failure removes only its own pre-transition lock and does not stop running controller', async t => {
    const f = fixture(t); f.dependencies.nativeProbe = () => { throw new Error('native failed'); };
    await assert.rejects(repair.update(f.options, f.dependencies));
    assert.equal(f.locked(), false); assert.equal(f.active(), 'active');
    assert.equal(f.current(), '/opt/nexowatt/eos/releases/' + repair.BASE.releaseId);
});
test('readiness failure restores only old pointer/state, retains lock, never restarts old controller', async t => {
    const f = fixture(t); f.dependencies.readiness = async () => { throw new Error('Admin unavailable'); };
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_TRIAL_FAILED_RESTORED_STOPPED'));
    assert.equal(f.current(), '/opt/nexowatt/eos/releases/' + repair.BASE.releaseId);
    assert.deepEqual(fs.readFileSync(f.at('/etc/nexowatt-eos/release-state.json')), f.state);
    assert.equal(f.locked(), true); assert.equal(f.active(), 'inactive'); assert.equal(f.journal().phase, 'RESTORED_STOPPED');
    assert.equal(f.events.filter(row => row === 'start nexowatt-eos-controller.service').length, 1);
    assert.equal(fs.existsSync(f.at('/etc/nexowatt-eos/maintenance-start.json')), false);
});
test('foreign state change during trial is not overwritten; stop and retain lock', async t => {
    const f = fixture(t), changed = Buffer.from('{"foreign":"do not overwrite"}\n');
    f.dependencies.readiness = async () => fs.writeFileSync(f.at('/etc/nexowatt-eos/release-state.json'), changed);
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_RECOVERY_REQUIRED'));
    assert.deepEqual(fs.readFileSync(f.at('/etc/nexowatt-eos/release-state.json')), changed);
    assert.equal(f.current(), '/opt/nexowatt/eos/releases/' + ID); assert.equal(f.locked(), true); assert.equal(f.active(), 'inactive');
});
test('foreign pointer during trial is not overwritten', async t => {
    const f = fixture(t); f.dependencies.readiness = async () => {
        fs.unlinkSync(f.at('/opt/nexowatt/eos/current')); fs.symlinkSync('/foreign/operator-release', f.at('/opt/nexowatt/eos/current'));
    };
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_RECOVERY_REQUIRED'));
    assert.equal(f.current(), '/foreign/operator-release'); assert.equal(f.locked(), true); assert.equal(f.active(), 'inactive');
});
test('initial failed controller is repairable without database reinitialization', async t => {
    const f = fixture(t); f.setActive('failed'); await repair.update(f.options, f.dependencies);
    assert.equal(f.active(), 'active'); assert.equal(f.journal().previousControllerState, 'failed');
});
test('pre-activation configuration race is detected; credentials are not written back', async t => {
    const f = fixture(t); f.dependencies.nativeProbe = () => { fs.writeFileSync(f.at('/etc/nexowatt-eos/license-device.json'), 'concurrent-change'); return { passed: true }; };
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_TRIAL_FAILED_RESTORED_STOPPED'));
    assert.equal(fs.readFileSync(f.at('/etc/nexowatt-eos/license-device.json'), 'utf8'), 'concurrent-change');
    assert.equal(f.current(), '/opt/nexowatt/eos/releases/' + repair.BASE.releaseId); assert.equal(f.locked(), true);
});
test('failed stop leaves lock and reports recovery required without claiming restored service', async t => {
    const f = fixture(t), exec = f.dependencies.exec;
    f.dependencies.exec = (file, args) => args[0] === 'stop' ? { status: 1, stdout: '' } : exec(file, args);
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_RECOVERY_REQUIRED'));
    assert.equal(f.current(), '/opt/nexowatt/eos/releases/' + repair.BASE.releaseId);
    assert.equal(f.locked(), true); assert.equal(f.active(), 'active'); assert.equal(f.journal().phase, 'RECOVERY_REQUIRED');
    assert.deepEqual(fs.readFileSync(f.at('/etc/nexowatt-eos/release-state.json')), f.state);
});
test('journal failure during trial still attempts physical restoration and preserves the lock', async t => {
    const f = fixture(t);
    f.dependencies.atomicWrite = (file, bytes) => {
        if (file.endsWith('test-repair-status.json') && JSON.parse(bytes).phase !== 'PREPARED') throw new Error('journal I/O');
        atomicWrite(file, bytes);
    };
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_TRIAL_FAILED_RESTORED_STOPPED'));
    assert.equal(f.locked(), true); assert.equal(f.active(), 'inactive');
    assert.equal(f.current(), '/opt/nexowatt/eos/releases/' + repair.BASE.releaseId);
    assert.deepEqual(fs.readFileSync(f.at('/etc/nexowatt-eos/release-state.json')), f.state);
});
test('signature rejection does not acquire maintenance lock or execute candidate code', async t => {
    const f = fixture(t); f.dependencies.verifyBundle = () => { throw new Error('bad signature'); };
    await assert.rejects(repair.update(f.options, f.dependencies));
    assert.equal(f.locked(), false); assert.deepEqual(f.events, []);
});
test('directory fsync failure after successful unlock recreates gate before restoring old release', async t => {
    const f = fixture(t), unlink = fs.unlinkSync, fsync = fs.fsyncSync;
    let arm = false, injected = false;
    fs.unlinkSync = file => { const result = unlink(file); if (file === f.at('/etc/nexowatt-eos/.activation.lock')) arm = true; return result; };
    fs.fsyncSync = fd => { if (arm && !injected) { injected = true; throw new Error('unlock fsync failed'); } return fsync(fd); };
    try {
        await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_TRIAL_FAILED_RESTORED_STOPPED'));
        assert.equal(injected, true); assert.equal(f.locked(), true); assert.equal(f.active(), 'inactive');
        assert.equal(f.current(), '/opt/nexowatt/eos/releases/' + repair.BASE.releaseId);
        assert.deepEqual(fs.readFileSync(f.at('/etc/nexowatt-eos/release-state.json')), f.state);
        assert.equal(f.journal().phase, 'RESTORED_STOPPED');
    } finally { fs.unlinkSync = unlink; fs.fsyncSync = fsync; }
});
test('repair requires systemd invocation identity; unsupervised CLI cannot start maintenance', async t => {
    const f = fixture(t); f.dependencies.invocationId = 'invalid';
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_SYSTEMD_INVOCATION_REQUIRED'));
    assert.deepEqual(f.events, []); assert.equal(f.locked(), false);
});
test('false executable trust result is rejected before any service command or staging', async t => {
    const f = fixture(t); f.dependencies.toolTrust = () => ({ trusted: false, resolved: null });
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_UNTRUSTED_TOOL'));
    assert.deepEqual(f.events, []); assert.equal(f.locked(), false);
});
test('ExecStopPost quiesces only its own incomplete repair, including a failed permit revocation', () => {
    const invocation = '3'.repeat(32); let blocks = 0, stops = 0;
    const effects = { readLock: () => ({ operation: 'test-release-repair', invocationId: invocation }),
        block: () => { blocks++; }, stop: () => { stops++; } };
    assert.equal(repair.quiesceIncomplete(effects, invocation).status, 'REPAIR_INCOMPLETE_TRIAL_STOPPED');
    assert.equal(stops, 1); assert.equal(blocks, 1);
    assert.equal(repair.quiesceIncomplete({ ...effects, readLock: () => null }, invocation).status, 'REPAIR_NO_INCOMPLETE_TRIAL');
    assert.equal(repair.quiesceIncomplete({ ...effects, readLock: () => ({ operation: 'test-release-repair', invocationId: '4'.repeat(32) }) }, invocation).status, 'REPAIR_OTHER_MAINTENANCE');
    assert.equal(repair.quiesceIncomplete({ ...effects, readLock: () => ({ operation: 'certificate-rotation', invocationId: invocation }) }, invocation).status, 'REPAIR_OTHER_MAINTENANCE');
    assert.equal(stops, 1); assert.equal(blocks, 1);
    assert.throws(() => repair.quiesceIncomplete({ ...effects, block: () => { throw new Error('permit I/O'); } }, invocation), expect('REPAIR_QUIESCE_PERMIT_FAILED'));
    assert.equal(stops, 2);
});
test('malformed protected lock falls back only to its own bounded journal; valid foreign lock wins', () => {
    const invocation = '3'.repeat(32); let stopped = 0;
    const journal = { operation: 'test-release-repair', invocationId: invocation, operationId: crypto.randomUUID(),
        previousReleaseId: repair.BASE.releaseId, targetReleaseId: ID, phase: 'ACTIVE' };
    const effects = { readLock: () => repair.MALFORMED_PROTECTED_LOCK, readJournal: () => journal,
        block: () => {}, stop: () => { stopped++; } };
    assert.equal(repair.quiesceIncomplete(effects, invocation).status, 'REPAIR_INCOMPLETE_TRIAL_STOPPED');
    assert.equal(stopped, 1);
    assert.throws(() => repair.quiesceIncomplete({ ...effects, readJournal: () => ({ ...journal, invocationId: '4'.repeat(32) }) }, invocation), { code: 'REPAIR_QUIESCE_LOCK' });
    assert.equal(stopped, 1);
    assert.equal(repair.quiesceIncomplete({ ...effects, readLock: () => ({ operation: 'certificate-rotation', invocationId: '4'.repeat(32) }),
        readJournal: () => { throw new Error('foreign lock must prevent journal read'); } }, invocation).status, 'REPAIR_OTHER_MAINTENANCE');
    assert.equal(stopped, 1);
});
