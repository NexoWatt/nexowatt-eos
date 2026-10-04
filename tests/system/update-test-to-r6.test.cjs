'use strict';
const nodeTest = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const repair = require('../../tools/system/update-test-to-r6.cjs');
const { sha256 } = require('../../runtime/release/bundle.cjs');
const { atomicWrite } = require('../../tools/system/activate-release.cjs');
const ID = 'a'.repeat(64);
// Real temporary files, fsync, atomic state writes and symlink switching run below.
// Services, baseline inventory verification and native probing are explicit doubles.
for (const base of repair.BASES) {
const test = (name, fn) => nodeTest(`R${base.sequence - 3}: ${name}`, fn);
function descriptors() {
    const manifest = sequence => ({ sequence, profile: 'test', releaseVersion: '0.2.0-test.3', nodeVersion: '24.21.0',
        platforms: ['linux-arm64'], files: [{ path: 'runtime/postgresql/schema.sql', size: 4, sha256: sha256('sql\n'), mode: 0o644 },
            { path: 'system/postgresql-test/systemd/nexowatt-eos-controller.service', size: 5, sha256: sha256('unit\n'), mode: 0o644 }] });
    const catalog = { entries: [{ id: 'js-controller', package: 'iobroker.js-controller', version: '7.2.2', sha256: '1'.repeat(64),
        kind: 'core', required: true, review: { status: 'approved-test' }, permissions: { shellExec: false } },
    { id: 'nexowatt-devices', package: 'iobroker.nexowatt-devices', version: '0.5.169', sha256: '2'.repeat(64),
        kind: 'adapter', required: false, review: { status: 'pending' }, permissions: { shellExec: false } }] };
    return { old: { releaseId: base.releaseId, manifest: manifest(base.sequence), catalog },
        next: { releaseId: ID, manifest: manifest(9), catalog: structuredClone(catalog) } };
}
function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-r6-update-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const at = name => path.join(root, name);
    for (const dir of ['/etc/nexowatt-eos/web', '/etc/systemd/system', '/opt/nexowatt/eos/releases/' + base.releaseId,
        '/opt/nexowatt/eos/verified', '/var/lib/nexowatt-eos', '/import/bundle/payload']) fs.mkdirSync(at(dir), { recursive: true });
    const state = Buffer.from(JSON.stringify({ schemaVersion: 1, ...base }) + '\n');
    fs.writeFileSync(at('/etc/nexowatt-eos/release-state.json'), state);
    for (const name of repair.PRESERVED) fs.writeFileSync(at('/etc/nexowatt-eos/' + name), 'preserved-' + name);
    fs.writeFileSync(at('/etc/nexowatt-eos/first-start-complete.json'), JSON.stringify({ schemaVersion: 1,
        releaseId: repair.BASES[0].releaseId, setupId: 'f'.repeat(32), completedAt: '2026-10-03T12:00:00.000Z',
        licenseConfigured: false, physicalControlEnabled: false }));
    fs.mkdirSync(at('/opt/nexowatt/eos/releases/' + repair.BASES[0].releaseId), { recursive: true });
    const priorRepair = { schemaVersion: 1, operation: 'test-release-repair', operationId: crypto.randomUUID(),
        invocationId: '2'.repeat(32), phase: 'ACTIVE', previousReleaseId: repair.BASES[0].releaseId, targetReleaseId: repair.BASES[1].releaseId,
        at: '2026-10-03T14:00:00.000Z', previousControllerState: 'active', physicalControlEnabled: false, productionReleaseApproved: false };
    if (base.sequence === 8) fs.writeFileSync(at('/etc/nexowatt-eos/test-repair-status.json'), JSON.stringify(priorRepair) + '\n');
    fs.writeFileSync(at('/var/lib/nexowatt-eos/.initialized'), 'installed');
    fs.writeFileSync(at('/etc/systemd/system/nexowatt-eos-controller.service'), 'unit\n');
    fs.symlinkSync('/opt/nexowatt/eos/releases/' + base.releaseId, at('/opt/nexowatt/eos/current'));
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
        inspectInstalled: (release, key) => {
            const id = path.basename(release), expected = repair.BASES.find(row => row.releaseId === id);
            assert.equal(key, expected ? expected.publicKeySha256 : options.expectedKeySha256);
            if (id === base.releaseId) return desc.old;
            if (id === repair.BASES[0].releaseId) return { ...desc.old, releaseId: id, manifest: { ...desc.old.manifest, sequence: 7 } };
            return desc.next;
        },
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
        current: () => fs.readlinkSync(at('/opt/nexowatt/eos/current')), journal: () => JSON.parse(fs.readFileSync(at('/etc/nexowatt-eos/test-update-r6-status.json'))),
        locked: () => fs.existsSync(at('/etc/nexowatt-eos/.activation.lock')) };
}
const expect = code => error => error.code === code;
test('CLI requires explicit absolute input paths and both independent new trust pins', () => {
    assert.throws(() => repair.parseArgs([]), expect('REPAIR_USAGE'));
    assert.throws(() => repair.parseArgs(['--bundle','/b','--public-key','/k','--expected-release-id',ID,'--expected-key-sha256',base.publicKeySha256]), expect('REPAIR_EXPLICIT_NEW_TRUST_REQUIRED'));
    assert.throws(() => repair.parseArgs(['--bundle','relative','--public-key','/k','--expected-release-id',ID,'--expected-key-sha256','b'.repeat(64)]), expect('REPAIR_INPUT_PATH'));
});
test('baseline must exactly match allowed release, sequence, key, runtime, profile and schema', () => {
    const state = { schemaVersion: 1, ...base }; repair.validateState(state);
    for (const [name, value] of Object.entries({ sequence: 6, releaseId: ID, publicKeySha256: 'b'.repeat(64), nodeVersion: '24.19.0', profile: 'production', extra: 1 }))
        assert.throws(() => repair.validateState({ ...state, [name]: value }), expect('REPAIR_R4_R5_BASELINE_REQUIRED'));
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
    assert.ok(fs.existsSync(f.at('/opt/nexowatt/eos/releases/' + base.releaseId)));
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
    assert.equal(f.current(), '/opt/nexowatt/eos/releases/' + base.releaseId);
});
test('readiness failure restores only old pointer/state, retains lock, never restarts old controller', async t => {
    const f = fixture(t); f.dependencies.readiness = async () => { throw new Error('Admin unavailable'); };
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_TRIAL_FAILED_RESTORED_STOPPED'));
    assert.equal(f.current(), '/opt/nexowatt/eos/releases/' + base.releaseId);
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
    assert.equal(f.current(), '/opt/nexowatt/eos/releases/' + base.releaseId); assert.equal(f.locked(), true);
});
test('failed stop leaves lock and reports recovery required without claiming restored service', async t => {
    const f = fixture(t), exec = f.dependencies.exec;
    f.dependencies.exec = (file, args) => args[0] === 'stop' ? { status: 1, stdout: '' } : exec(file, args);
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_RECOVERY_REQUIRED'));
    assert.equal(f.current(), '/opt/nexowatt/eos/releases/' + base.releaseId);
    assert.equal(f.locked(), true); assert.equal(f.active(), 'active'); assert.equal(f.journal().phase, 'RECOVERY_REQUIRED');
    assert.deepEqual(fs.readFileSync(f.at('/etc/nexowatt-eos/release-state.json')), f.state);
});
test('journal failure during trial still attempts physical restoration and preserves the lock', async t => {
    const f = fixture(t);
    f.dependencies.atomicWrite = (file, bytes) => {
        if (file.endsWith('test-update-r6-status.json') && JSON.parse(bytes).phase !== 'PREPARED') throw new Error('journal I/O');
        atomicWrite(file, bytes);
    };
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_TRIAL_FAILED_RESTORED_STOPPED'));
    assert.equal(f.locked(), true); assert.equal(f.active(), 'inactive');
    assert.equal(f.current(), '/opt/nexowatt/eos/releases/' + base.releaseId);
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
        assert.equal(f.current(), '/opt/nexowatt/eos/releases/' + base.releaseId);
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
    const effects = { readLock: () => ({ operation: 'test-release-repair', invocationId: invocation, targetSequence: 9 }),
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
        previousReleaseId: base.releaseId, targetReleaseId: ID, targetSequence: 9, phase: 'ACTIVE' };
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


test('both prior release IDs and keys are refused as target trust', () => {
    for (const prior of repair.BASES) {
        assert.throws(() => repair.validatePins({ expectedReleaseId: prior.releaseId, expectedKeySha256: 'd'.repeat(64), bundleDirectory: '/b', publicKeyFile: '/k' }), expect('REPAIR_EXPLICIT_NEW_TRUST_REQUIRED'));
        assert.throws(() => repair.validatePins({ expectedReleaseId: ID, expectedKeySha256: prior.publicKeySha256, bundleDirectory: '/b', publicKeyFile: '/k' }), expect('REPAIR_EXPLICIT_NEW_TRUST_REQUIRED'));
    }
});
test('wrong or unknown installed baseline is rejected without effects', async t => {
    const f = fixture(t), state = JSON.parse(f.state); state.publicKeySha256 = '1'.repeat(64);
    fs.writeFileSync(f.at('/etc/nexowatt-eos/release-state.json'), JSON.stringify(state));
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_R4_R5_BASELINE_REQUIRED'));
    assert.deepEqual(f.events, []); assert.equal(f.locked(), false);
});
test('completion marker rejects foreign origin or physical-control admission before mutation', async t => {
    for (const mutate of [x => x.releaseId = ID, x => x.physicalControlEnabled = true, x => x.extra = true, x => x.setupId = 'wrong']) {
        const f = fixture(t), file = f.at('/etc/nexowatt-eos/first-start-complete.json');
        const value = JSON.parse(fs.readFileSync(file)); mutate(value); fs.writeFileSync(file, JSON.stringify(value));
        await assert.rejects(repair.update(f.options, f.dependencies));
        assert.deepEqual(f.events, []); assert.equal(f.locked(), false);
    }
});
test('root ownership denial, source symlinks and hardlinks fail before mutation', async t => {
    for (const kind of ['owner', 'symlink', 'hardlink']) {
        const f = fixture(t), file = f.at('/etc/nexowatt-eos/release-state.json');
        if (kind === 'owner') f.dependencies.ownerCheck = () => { throw new Error('untrusted owner'); };
        else { fs.renameSync(file, file + '.kept'); if (kind === 'symlink') fs.symlinkSync(file + '.kept', file); else fs.linkSync(file + '.kept', file); }
        await assert.rejects(repair.update(f.options, f.dependencies));
        assert.deepEqual(f.events, []); assert.equal(f.locked(), false);
    }
});
test('candidate payload and signature tampering hit the real verifier before lock or staging', async t => {
    const { createBundle } = require('../../runtime/release/bundle.cjs');
    for (const kind of ['signature', 'payload']) {
        const f = fixture(t), source = f.at('/signed-source'); fs.mkdirSync(source);
        fs.writeFileSync(path.join(source, 'fixture.txt'), 'non-secret signed fixture');
        const pair = crypto.generateKeyPairSync('ed25519');
        const publicKey = pair.publicKey.export({ format: 'pem', type: 'spki' });
        f.options.expectedKeySha256 = sha256(publicKey); fs.writeFileSync(f.options.publicKeyFile, publicKey);
        f.options.bundleDirectory = f.at('/signed-bundle');
        createBundle({ sourceDirectory: source, bundleDirectory: f.options.bundleDirectory,
            metadata: { schemaVersion: 1, product: 'nexowatt-eos', releaseVersion: '0.2.0-test.3', sequence: 9,
                profile: 'test', nodeVersion: '24.21.0', platforms: ['linux-arm64'] },
            privateKey: pair.privateKey.export({ format: 'pem', type: 'pkcs8' }) });
        f.options.expectedReleaseId = sha256(fs.readFileSync(path.join(f.options.bundleDirectory, 'manifest.json')));
        if (kind === 'signature') fs.writeFileSync(path.join(f.options.bundleDirectory, 'manifest.sig'), Buffer.alloc(64));
        else fs.writeFileSync(path.join(f.options.bundleDirectory, 'payload/fixture.txt'), 'changed');
        delete f.dependencies.verifyBundle;
        await assert.rejects(repair.update(f.options, f.dependencies), error => /^BUNDLE_/.test(error.code || ''));
        assert.deepEqual(f.events, []); assert.equal(f.locked(), false);
    }
});
test('candidate may only use seq9, test3, ARM64, exact node and unchanged catalog admission', () => {
    for (const change of [d => d.next.manifest.sequence = 8, d => d.next.manifest.sequence = 10,
        d => d.next.manifest.profile = 'production', d => d.next.manifest.releaseVersion = '0.2.0-test.4',
        d => d.next.manifest.platforms = ['linux-x64'], d => d.next.manifest.nodeVersion = '24.19.0',
        d => d.next.catalog.entries[1].permissions.shellExec = true, d => d.next.catalog.entries.pop(),
        d => d.next.manifest.files = d.next.manifest.files.filter(row => !row.path.startsWith('system/'))]) {
        const d = descriptors(); change(d); assert.throws(() => repair.validateTransition(d.old, d.next, { expectedReleaseId: ID }));
    }
});
test('successful state changes to seq9 while all baseline bytes and provenance stay intact', async t => {
    const f = fixture(t), journal = f.at('/etc/nexowatt-eos/test-repair-status.json');
    const prior = fs.existsSync(journal) ? fs.readFileSync(journal) : null;
    const out = await repair.update(f.options, f.dependencies);
    assert.equal(out.sequence, 9); assert.equal(out.physicalControlEnabled, false);
    assert.equal(JSON.parse(fs.readFileSync(f.at('/etc/nexowatt-eos/release-state.json'))).sequence, 9);
    if (prior) assert.deepEqual(fs.readFileSync(journal), prior);
});
if (base.sequence === 8) {
    test('R5-native completion does not require an R4 migration journal', async t => {
        const f = fixture(t), file = f.at('/etc/nexowatt-eos/first-start-complete.json');
        const complete = JSON.parse(fs.readFileSync(file)); complete.releaseId = base.releaseId; fs.writeFileSync(file, JSON.stringify(complete));
        fs.unlinkSync(f.at('/etc/nexowatt-eos/test-repair-status.json'));
        assert.equal((await repair.update(f.options, f.dependencies)).ok, true);
    });
    test('inherited R4 completion requires exact successful protected R4-to-R5 provenance', async t => {
        for (const mutate of [j => j.phase = 'TRIAL', j => j.previousReleaseId = ID, j => j.targetReleaseId = ID,
            j => j.physicalControlEnabled = true, j => j.productionReleaseApproved = true, j => j.extra = true]) {
            const f = fixture(t), file = f.at('/etc/nexowatt-eos/test-repair-status.json');
            const journal = JSON.parse(fs.readFileSync(file)); mutate(journal); fs.writeFileSync(file, JSON.stringify(journal));
            await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_FIRST_START_PROVENANCE'));
            assert.deepEqual(f.events, []); assert.equal(f.locked(), false);
        }
        const f = fixture(t); fs.unlinkSync(f.at('/etc/nexowatt-eos/test-repair-status.json'));
        await assert.rejects(repair.update(f.options, f.dependencies)); assert.deepEqual(f.events, []);
    });
    test('inherited R4 completion refuses unavailable authenticated historical release', async t => {
        const f = fixture(t), inspect = f.dependencies.inspectInstalled;
        f.dependencies.inspectInstalled = (release, key) => {
            if (path.basename(release) === repair.BASES[0].releaseId) throw new Error('historical signature unavailable');
            return inspect(release, key);
        };
        await assert.rejects(repair.update(f.options, f.dependencies));
        assert.deepEqual(f.events, []); assert.equal(f.locked(), false);
    });
    test('legacy provenance race after validation aborts without overwriting foreign journal', async t => {
        const f = fixture(t), file = f.at('/etc/nexowatt-eos/test-repair-status.json'), altered = 'changed legacy journal';
        f.dependencies.nativeProbe = () => { fs.writeFileSync(file, altered); return { passed: true }; };
        await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_TRIAL_FAILED_RESTORED_STOPPED'));
        assert.equal(fs.readFileSync(file, 'utf8'), altered); assert.equal(f.locked(), true); assert.equal(f.active(), 'inactive');
    });
}
} // baseline loop
