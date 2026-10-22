'use strict';
const nodeTest = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const repair = require('../../tools/system/update-r8-to-managed.cjs');
const { sha256 } = require('../../runtime/release/bundle.cjs');
const { atomicWrite } = require('../../tools/system/activate-release.cjs');
const ID = 'a'.repeat(64);
// Real temporary files, fsync, atomic state writes and symlink switching run below.
// Services, baseline inventory verification and native probing are explicit doubles.
const base = repair.BASES[0];
const test = nodeTest;
function descriptors() {
    const product = require('../../runtime/product/scope.cjs');
    const catalog = scope => ({ entries: product.specsFor(scope).map(spec => ({ id: spec.id, package: spec.package,
        version: spec.version, kind: spec.kind, required: spec.execute, review: { status: spec.execute ? 'approved-test' : 'pending' } })) });
    const manifest = (sequence, nodeVersion) => ({ sequence, profile: 'test', releaseVersion: '0.2.0-test.3', nodeVersion,
        platforms: ['linux-arm64'], files: [{ path: 'runtime/postgresql/schema.sql', size: 4, sha256: sha256('sql\\n'), mode: 0o644 },
            { path: 'system/postgresql-test/systemd/nexowatt-eos-controller.service', size: 5, sha256: sha256('unit\\n'), mode: 0o644 }] });
    return { old: { releaseId: base.releaseId, manifest: manifest(11, '24.21.0'), catalog: catalog(product.MANAGEMENT_TEST) },
        next: { releaseId: ID, manifest: manifest(15, '24.22.1'), catalog: catalog(product.SECURITY_REFRESH_TEST) } };
}
function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-own-update-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const at = name => path.join(root, name);
    for (const dir of ['/etc/nexowatt-eos/web', '/etc/systemd/system', '/opt/nexowatt/eos/releases/' + base.releaseId,
        '/opt/nexowatt/eos/verified', '/var/lib/nexowatt-eos', '/import/bundle/payload']) fs.mkdirSync(at(dir), { recursive: true });
    const state = Buffer.from(JSON.stringify({ schemaVersion: 1, ...base }) + '\n');
    fs.writeFileSync(at('/etc/nexowatt-eos/release-state.json'), state);
    for (const name of repair.PRESERVED) fs.writeFileSync(at('/etc/nexowatt-eos/' + name), 'preserved-' + name);
    fs.writeFileSync(at('/etc/nexowatt-eos/first-start-complete.json'), JSON.stringify({ schemaVersion: 1,
        releaseId: repair.COMPLETION_RELEASE, setupId: 'f'.repeat(32), completedAt: '2026-10-03T12:00:00.000Z',
        licenseConfigured: false, physicalControlEnabled: false }));
    fs.mkdirSync(at('/opt/nexowatt/eos/releases/' + repair.BASES[0].releaseId), { recursive: true });
    fs.writeFileSync(at('/var/lib/nexowatt-eos/.initialized'), 'installed');
    fs.writeFileSync(at('/etc/systemd/system/nexowatt-eos-controller.service'), 'unit\\n');
    fs.writeFileSync(at('/etc/systemd/system/nexowatt-eos-upload.service'), fs.readFileSync(path.join(__dirname, '../../system/postgresql-test/systemd/nexowatt-eos-upload.service')));
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
        assertRuntimeStopped: () => { events.push('assert-stopped'); assert.equal(active, 'inactive'); },
        withEnrollmentDatabase: async (_release, action) => action({ objects: {}, states: {}, config: {} }),
        ownEnrollment: {
            planMigration: async input => { events.push('plan'); return { operationId: input.operationId, sourceReleaseId: input.sourceReleaseId, targetReleaseId: input.targetReleaseId }; },
            applyMigration: async input => { await input.checkpoint(structuredClone(input.plan)); events.push('apply'); },
            rollbackMigration: async () => { events.push('rollback-enrollment'); },
        },
        ownReadiness: async (...args) => dependencies.readiness(...args),
        validateRuntime: () => {}, acquireMaintenanceLease: async () => { events.push('lease'); return { assert() {}, release() { events.push('lease-release'); } }; },
        hostMigration: { prepare: () => { events.push('host-plan'); return { kind: 'host' }; },
            apply: () => { events.push('host-apply'); }, activate: () => { events.push('host-activate'); }, rollback: () => { events.push('host-rollback'); }, restoreCertificateTimer: () => { events.push('certificate-timer-restored'); } },
        osMigration: { prepare: () => { events.push('os-plan'); return { kind: 'os' }; },
            apply: () => { events.push('os-apply'); }, rollback: () => { events.push('os-rollback'); } },
        ownerCheck: () => {}, toolTrust: () => ({ trusted: true }), trustedImport: () => {},
        inspectInstalled: (release, key) => {
            const id = path.basename(release), expected = repair.BASES.find(row => row.releaseId === id);
            assert.equal(key, expected ? expected.publicKeySha256 : options.expectedKeySha256);
            if (id === base.releaseId) return desc.old;
            return desc.next;
        },
        verifyBundle: () => desc.next, validatePayload: () => ({ catalog: desc.next.catalog }),
        stageBundle: () => { events.push('stage'); fs.mkdirSync(at('/opt/nexowatt/eos/releases/' + ID)); },
        nativeProbe: () => { events.push('native'); return { passed: true, deviceIoPerformed: false }; },
        readiness: async release => { events.push('readiness:' + path.basename(release)); },
        atomicWrite: (file, bytes) => atomicWrite(file, bytes),
        exec: (file, args) => {
            assert.equal(file, '/usr/bin/systemctl'); events.push(args.join(' '));
            if (args[0] === 'show') return { status: 0, stdout: args[1] === 'nexowatt-eos-upload.service' ? 'inactive' : active };
            if (args[0] === 'stop') active = 'inactive';
            if (args[0] === 'start' && args[1] === 'nexowatt-eos-controller.service') {
                const actualState = JSON.parse(fs.readFileSync(at('/etc/nexowatt-eos/release-state.json')));
                assert.equal(fs.readlinkSync(at('/opt/nexowatt/eos/current')), '/opt/nexowatt/eos/releases/' + actualState.releaseId, 'state and current must match before start');
                active = 'active';
            }
            if (args[0] === 'is-active' && args.includes('nexowatt-eos-controller.service') && active !== 'active') return { status: 3, stdout: '' };
            return { status: 0, stdout: '' };
        }, maintenance: {
            authorizeStart: (dir, operation) => { assert.equal(operation, 'test-release-repair'); events.push('permit'); fs.writeFileSync(path.join(dir, 'maintenance-start.json'), 'permit'); },
            blockStart: dir => { events.push('revoke'); const p = path.join(dir, 'maintenance-start.json'); if (fs.existsSync(p)) fs.unlinkSync(p); },
        } };
    return { at, state, options, dependencies, events, desc, active: () => active, setActive: value => { active = value; },
        current: () => fs.readlinkSync(at('/opt/nexowatt/eos/current')), journal: () => JSON.parse(fs.readFileSync(at('/etc/nexowatt-eos/r8-managed-status.json'))),
        locked: () => fs.existsSync(at('/etc/nexowatt-eos/.activation.lock')) };
}
const expect = code => error => error.code === code;
const oldTarget = '/opt/nexowatt/eos/releases/' + base.releaseId;
const controller = 'nexowatt-eos-controller.service';
const stateFile = '/etc/nexowatt-eos/release-state.json';
const lockFile = '/etc/nexowatt-eos/.activation.lock';
const guardFile = '/etc/nexowatt-eos/.r8-managed.guard';
function assertStopped(f) {
    assert.equal(f.active(), 'inactive'); assert.equal(f.locked(), true);
    assert.equal(fs.existsSync(f.at('/etc/nexowatt-eos/maintenance-start.json')), false);
}
test('only exact authenticated R8 and independently pinned new release/key are accepted', async t => {
    assert.throws(() => repair.parseArgs([]), expect('REPAIR_USAGE'));
    for (const changes of [{ sequence: 12 }, { releaseId: ID }, { publicKeySha256: '1'.repeat(64) },
        { nodeVersion: '24.22.1' }, { profile: 'production' }, { extra: 1 }])
        assert.throws(() => repair.validateState({ schemaVersion: 1, ...base, ...changes }), expect('REPAIR_R8_BASELINE_REQUIRED'));
    for (const changes of [{ expectedReleaseId: base.releaseId }, { expectedKeySha256: base.publicKeySha256 }, { bundleDirectory: 'relative' }])
        assert.throws(() => repair.validatePins({ expectedReleaseId: ID, expectedKeySha256: 'd'.repeat(64), bundleDirectory: '/b', publicKeyFile: '/k', ...changes }));
    const f = fixture(t); f.dependencies.invocationId = 'invalid';
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_SYSTEMD_INVOCATION_REQUIRED'));
    assert.deepEqual(f.events, []);
});
test('direct transition permits controller7.2.5 Node24.22.1 with unchanged PostgreSQL schema only', () => {
    const d = descriptors(); assert.equal(repair.validateTransition(d.old, d.next, { expectedReleaseId: ID }), true);
    for (const mutate of [d => d.next.manifest.sequence = 12, d => d.next.manifest.sequence = 16,
        d => d.next.manifest.nodeVersion = '26.12.1', d => d.next.manifest.nodeVersion = '24.21.0',
        d => d.next.manifest.files[0].sha256 = 'd'.repeat(64), d => d.next.manifest.files.shift(),
        d => d.next.catalog.entries[0].version = '8.0.0', d => d.next.catalog.entries.pop(),
        d => d.next.manifest.profile = 'production', d => d.next.manifest.platforms = ['linux-x64']]) {
        const value = descriptors(); mutate(value); assert.throws(() => repair.validateTransition(value.old, value.next, { expectedReleaseId: ID }));
    }
});
test('healthy R8 migrates directly once, preserves protected files and activates automatic services last', async t => {
    const f = fixture(t), before = repair.PRESERVED.map(name => fs.readFileSync(f.at('/etc/nexowatt-eos/' + name)));
    const result = await repair.update(f.options, f.dependencies);
    assert.equal(result.sequence, 15); assert.equal(result.nodeVersion, '24.22.1'); assert.equal(result.directFromR8, true);
    assert.equal(result.intermediateReleasesInstalled, 0); assert.equal(result.phase, 'R8_MANAGED_TEST_ACTIVE');
    assert.equal(f.current(), '/opt/nexowatt/eos/releases/' + ID); assert.equal(f.active(), 'active'); assert.equal(f.locked(), false);
    for (const [i, name] of repair.PRESERVED.entries()) assert.deepEqual(fs.readFileSync(f.at('/etc/nexowatt-eos/' + name)), before[i]);
    const state = JSON.parse(fs.readFileSync(f.at(stateFile))); assert.equal(state.sequence, 15); assert.equal(state.nodeVersion, '24.22.1');
    const order = ['native', 'host-plan', 'os-plan', 'os-apply', 'lease', 'stop ' + controller, 'plan', 'apply', 'host-apply',
        'start nexowatt-eos-upload.service', 'readiness:' + ID, 'host-activate', 'lease-release'];
    for (let i = 1; i < order.length; i++) assert.ok(f.events.indexOf(order[i - 1]) < f.events.indexOf(order[i]), order[i]);
    assert.ok(!f.events.some(e => /initdb|setup|r9|r10|r11|npm|apt-get/.test(e)));
});
test('baseline readiness, unit drift and wrong trust fail before maintenance mutations', async t => {
    for (const problem of ['readiness', 'unit', 'key', 'signature', 'native', 'host-plan', 'os-plan']) {
        const f = fixture(t);
        if (problem === 'readiness') f.dependencies.readiness = async () => { throw Error('private failure'); };
        if (problem === 'unit') fs.writeFileSync(f.at('/etc/systemd/system/' + controller), 'foreign');
        if (problem === 'key') f.options.expectedKeySha256 = 'c'.repeat(64);
        if (problem === 'signature') f.dependencies.verifyBundle = () => { throw Error('private failure'); };
        if (problem === 'native') f.dependencies.nativeProbe = () => ({ passed: false });
        if (problem === 'host-plan') f.dependencies.hostMigration.prepare = () => { throw Error('missing network tool'); };
        if (problem === 'os-plan') f.dependencies.osMigration.prepare = () => { throw Error('apt active'); };
        await assert.rejects(repair.update(f.options, f.dependencies));
        assert.equal(f.active(), 'active'); assert.equal(f.current(), oldTarget); assert.equal(f.locked(), false);
        assert.ok(!f.events.includes('os-apply')); assert.ok(!f.events.includes('stop ' + controller));
    }
});
test('all mutation phases restore authenticated R8 and never require intermediate releases', async t => {
    for (const phase of ['os', 'lease', 'enrollment', 'host', 'upload', 'readiness', 'activate']) {
        const f = fixture(t);
        if (phase === 'os') f.dependencies.osMigration.apply = () => { f.events.push('os-apply'); throw Error('private'); };
        if (phase === 'lease') f.dependencies.acquireMaintenanceLease = async () => { throw Error('lock busy'); };
        if (phase === 'enrollment') f.dependencies.ownEnrollment.applyMigration = async input => { await input.checkpoint(input.plan); throw Error('partial db'); };
        if (phase === 'host') f.dependencies.hostMigration.apply = () => { f.events.push('host-apply'); throw Error('partial host'); };
        if (phase === 'upload') { const exec = f.dependencies.exec; let failed = false; f.dependencies.exec = (file, args) => {
            if (args.join(' ') === 'start nexowatt-eos-upload.service' && !failed) { failed = true; return { status: 1, stdout: '' }; } return exec(file, args); }; }
        if (phase === 'readiness') f.dependencies.ownReadiness = async () => { throw Error('trial readiness'); };
        if (phase === 'activate') f.dependencies.hostMigration.activate = () => { throw Error('activation'); };
        await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_TRIAL_FAILED_RESTORED_ACTIVE'));
        assert.equal(f.current(), oldTarget, phase); assert.deepEqual(fs.readFileSync(f.at(stateFile)), f.state, phase);
        assert.equal(f.active(), 'active', phase); assert.equal(f.locked(), false, phase);
        assert.equal(f.journal().phase, 'RESTORED_ACTIVE');
        assert.ok(f.events.includes('os-rollback'));
        if (['host', 'upload', 'readiness', 'activate'].includes(phase)) assert.ok(f.events.includes('host-rollback'));
    }
});
test('rollback restores host units before old pointer and old assets before R8 controller start', async t => {
    const f = fixture(t);
    f.dependencies.ownReadiness = async () => { throw Error('trial readiness'); };
    f.dependencies.hostMigration.rollback = () => { assert.equal(f.current(), '/opt/nexowatt/eos/releases/' + ID); f.events.push('host-rollback'); };
    f.dependencies.osMigration.rollback = () => { assert.equal(f.current(), oldTarget); assert.deepEqual(fs.readFileSync(f.at(stateFile)), f.state); f.events.push('os-rollback'); };
    await assert.rejects(repair.update(f.options, f.dependencies));
    const rollback = f.events.indexOf('host-rollback');
    assert.ok(f.events.indexOf('rollback-enrollment') < rollback);
    assert.ok(rollback < f.events.lastIndexOf('start nexowatt-eos-upload.service'));
    assert.ok(f.events.lastIndexOf('start nexowatt-eos-upload.service') < f.events.indexOf('os-rollback'));
    assert.ok(f.events.indexOf('os-rollback') < f.events.lastIndexOf('start ' + controller));
});
test('unknown host, database, lease or restored readiness failure keeps runtime stopped and gated', async t => {
    for (const failure of ['host', 'db', 'os', 'readiness', 'lease']) {
        const f = fixture(t);
        f.dependencies.ownReadiness = async () => { throw Error('trial'); };
        if (failure === 'host') f.dependencies.hostMigration.rollback = () => { throw Error('foreign unit'); };
        if (failure === 'db') f.dependencies.ownEnrollment.rollbackMigration = async () => { throw Error('foreign instance'); };
        if (failure === 'os') f.dependencies.osMigration.rollback = () => { throw Error('foreign policy'); };
        if (failure === 'readiness') { let calls = 0; f.dependencies.readiness = async () => { if (++calls > 1) throw Error('old not ready'); }; }
        if (failure === 'lease') { let broken = false; f.dependencies.acquireMaintenanceLease = async () => ({ assert() { if (broken) throw Error('lease lost'); }, release() {} });
            f.dependencies.ownReadiness = async () => { broken = true; throw Error('trial'); }; }
        await assert.rejects(repair.update(f.options, f.dependencies), e => ['REPAIR_TRIAL_FAILED_RESTORED_STOPPED', 'REPAIR_RECOVERY_REQUIRED'].includes(e.code));
        assertStopped(f);
    }
});
test('tampered private host/enrollment plans never authorize rollback over unknown state', async t => {
    for (const file of ['r8-managed-host-plan.json', 'r8-managed-plan.json']) {
        const f = fixture(t); f.dependencies.ownReadiness = async () => { fs.writeFileSync(f.at('/etc/nexowatt-eos/' + file), 'foreign'); throw Error('trial'); };
        await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_RECOVERY_REQUIRED')); assertStopped(f);
        assert.equal(fs.readFileSync(f.at('/etc/nexowatt-eos/' + file), 'utf8'), 'foreign');
    }
});
test('foreign lock or prior journal prevents repeated migration and remains untouched', async t => {
    for (const file of [lockFile, guardFile, '/etc/nexowatt-eos/r8-managed-plan.json', '/etc/nexowatt-eos/r8-managed-host-plan.json']) {
        const f = fixture(t); fs.writeFileSync(f.at(file), 'foreign', { mode: 0o600 });
        await assert.rejects(repair.update(f.options, f.dependencies)); assert.equal(fs.readFileSync(f.at(file), 'utf8'), 'foreign');
        assert.ok(!f.events.includes('os-apply')); assert.equal(f.active(), 'active');
    }
});
test('supervisor quiesce is bound to own invocation and sequence15 only', () => {
    const events = [], effects = { readLock: () => ({ operation: 'test-release-repair', invocationId: 'c'.repeat(32), targetSequence: 15 }),
        block: () => events.push('block'), stop: () => events.push('stop') };
    assert.equal(repair.quiesceIncomplete(effects, 'c'.repeat(32)).manualRecoveryRequired, true); assert.deepEqual(events, ['block', 'stop']);
    events.length = 0; assert.equal(repair.quiesceIncomplete(effects, 'd'.repeat(32)).status, 'REPAIR_OTHER_MAINTENANCE'); assert.deepEqual(events, []);
});

test('release state remains readable with a restrictive root supervisor umask', t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-r8-mode-')); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const before = process.umask(0o077);
    try { const file = path.join(root, 'state.json'); repair.metadataWrite(file, '{}\n');
        assert.equal(fs.statSync(file).mode & 0o7777, 0o644); repair.metadataWrite(file, '{"sequence":15}\n');
        assert.equal(fs.statSync(file).mode & 0o7777, 0o644); }
    finally { process.umask(before); }
});
