'use strict';
const nodeTest = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const repair = require('../../tools/system/recover-r4-restored-r7-to-r8.cjs');
const { sha256 } = require('../../runtime/release/bundle.cjs');
const { atomicWrite } = repair;
const ID = 'a'.repeat(64);
// Real temporary files, fsync, atomic state writes and symlink switching run below.
// Services, baseline inventory verification and native probing are explicit doubles.
const base = repair.BASES[0];
const test = (name, fn) => nodeTest(`R8 retry: ${name}`, fn);
function descriptors() {
    const manifest = sequence => ({ sequence, profile: 'test', releaseVersion: '0.2.0-test.3', nodeVersion: '24.21.0',
        platforms: ['linux-arm64'], files: [{ path: 'runtime/postgresql/schema.sql', size: 4, sha256: sha256('sql\n'), mode: 0o644 },
            { path: 'system/postgresql-test/systemd/nexowatt-eos-controller.service', size: 5, sha256: sha256('unit\n'), mode: 0o644 }] });
    const catalog = { entries: [{ id: 'js-controller', package: 'iobroker.js-controller', version: '7.2.2', sha256: '1'.repeat(64),
        kind: 'core', required: true, review: { status: 'approved-test' }, permissions: { shellExec: false } },
    { id: 'nexowatt-devices', package: 'iobroker.nexowatt-devices', version: '0.5.169', sha256: '2'.repeat(64),
        kind: 'adapter', required: false, review: { status: 'pending' }, permissions: { shellExec: false } }] };
    return { old: { releaseId: base.releaseId, manifest: manifest(base.sequence), catalog },
        r7: { releaseId: repair.RETAINED_R7.releaseId, manifest: manifest(10), catalog: structuredClone(catalog) },
        next: { releaseId: ID, manifest: manifest(11), catalog: structuredClone(catalog) } };
}
function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-r8-retry-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const at = name => path.join(root, name);
    for (const dir of ['/etc/nexowatt-eos/web', '/etc/systemd/system', '/opt/nexowatt/eos/releases/' + base.releaseId,
        '/opt/nexowatt/eos/releases/' + repair.RETAINED_R7.releaseId, '/opt/nexowatt/eos/verified', '/var/lib/nexowatt-eos', '/import/bundle/payload']) fs.mkdirSync(at(dir), { recursive: true });
    const state = Buffer.from(JSON.stringify({ schemaVersion: 1, ...base }) + '\n');
    fs.writeFileSync(at('/etc/nexowatt-eos/release-state.json'), state);
    for (const name of repair.PRESERVED) fs.writeFileSync(at('/etc/nexowatt-eos/' + name), 'preserved-' + name);
    const initialLock = Buffer.from(JSON.stringify({ operation: 'ui-onboarding', releaseId: base.releaseId,
        invocationId: '1'.repeat(32), pid: 100 }) + '\n');
    const retainedLock = { operation: 'test-release-repair', operationId: '11111111-2222-4333-8444-555555555555',
        invocationId: '2'.repeat(32), pid: 101, previousReleaseId: base.releaseId,
        targetSequence: repair.RETAINED_R7.sequence, targetReleaseId: repair.RETAINED_R7.releaseId };
    const retainedLockBytes = Buffer.from(JSON.stringify(retainedLock) + '\n');
    const retainedJournal = { schemaVersion: 1, operation: retainedLock.operation, operationId: retainedLock.operationId,
        invocationId: retainedLock.invocationId, phase: 'RESTORED_STOPPED', originalLockBase64: initialLock.toString('base64'),
        originalStateBase64: state.toString('base64'), previousReleaseId: base.releaseId,
        targetSequence: repair.RETAINED_R7.sequence, targetReleaseId: repair.RETAINED_R7.releaseId,
        at: '2026-10-04T10:45:37.000Z', previousControllerState: 'failed', physicalControlEnabled: false, productionReleaseApproved: false };
    for (const name of ['.activation.lock', '.first-start-recovery-r7.guard']) fs.writeFileSync(at('/etc/nexowatt-eos/' + name), retainedLockBytes, { mode: 0o600 });
    fs.writeFileSync(at('/etc/nexowatt-eos/first-start-recovery-r7.json'), JSON.stringify(retainedJournal) + '\n', { mode: 0o600 });
    const sourceRecords = new Map(['first-start-recovery-r7.json', '.first-start-recovery-r7.guard'].map(name => [name, fs.readFileSync(at('/etc/nexowatt-eos/' + name))]));
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
    const events = []; let active = 'inactive';
    const dependencies = { root, uid: 0, ownerUid: process.getuid(), invocationId: '3'.repeat(32), nodeVersion: '24.21.0', platform: 'linux-arm64',
        ownerCheck: () => {}, toolTrust: () => ({ trusted: true }), trustedImport: () => {}, processExists: () => false,
        verifyFirstStart: async () => ({ setupId: 'f'.repeat(32), licenseConfigured: true, assertPreserved: () => {}, verifyLive: async () => { events.push('verify-live'); } }),
        inspectInstalled: (release, key) => {
            const id = path.basename(release), expected = [...repair.BASES, repair.RETAINED_R7].find(row => row.releaseId === id);
            assert.equal(key, expected ? expected.publicKeySha256 : options.expectedKeySha256);
            if (id === base.releaseId) return desc.old;
            if (id === repair.RETAINED_R7.releaseId) return desc.r7;
            return desc.next;
        },
        verifyBundle: () => desc.next, validatePayload: () => ({ catalog: desc.next.catalog }),
        stageBundle: () => { events.push('stage'); fs.mkdirSync(at('/opt/nexowatt/eos/releases/' + ID)); },
        nativeProbe: () => { events.push('native'); return { passed: true, deviceIoPerformed: false }; },
        readiness: async () => { events.push('readiness'); },
        atomicWrite: (file, bytes) => atomicWrite(file, bytes),
        exec: (file, args) => {
            assert.equal(file, '/usr/bin/systemctl'); events.push(args.join(' '));
            if (args[0] === 'show' && args[1] === 'nexowatt-eos-first-start-recovery-r7.service') return { status: 0, stdout: 'MainPID=0\nControlPID=0\nActiveState=failed\n' };
            if (args[0] === 'show') return { status: 0, stdout: args[1] === 'nexowatt-eos-controller.service' ? active : 'inactive' };
            if (args[0] === 'stop' && args.includes('nexowatt-eos-controller.service')) active = 'inactive';
            if (args[0] === 'start') active = 'active';
            if (args[0] === 'is-active' && args.includes('nexowatt-eos-controller.service') && active !== 'active') return { status: 3, stdout: '' };
            return { status: 0, stdout: '' };
        }, maintenance: {
            authorizeStart: (dir, operation) => { assert.equal(operation, 'test-release-repair'); events.push('permit'); fs.writeFileSync(path.join(dir, 'maintenance-start.json'), 'permit'); },
            blockStart: dir => { events.push('revoke'); const p = path.join(dir, 'maintenance-start.json'); if (fs.existsSync(p)) fs.unlinkSync(p); },
        } };
    return { at, state, options, dependencies, events, desc, sourceRecords, retainedLock, retainedJournal, active: () => active, setActive: value => { active = value; },
        current: () => fs.readlinkSync(at('/opt/nexowatt/eos/current')), journal: () => JSON.parse(fs.readFileSync(at('/etc/nexowatt-eos/first-start-recovery-r8.json'))),
        locked: () => fs.existsSync(at('/etc/nexowatt-eos/.activation.lock')) };
}
const expect = code => error => error.code === code;
test('successful recovery creates completion after readiness and preserves existing config/old release', async t => {
    const f = fixture(t), files = repair.PRESERVED.map(name => fs.readFileSync(f.at('/etc/nexowatt-eos/' + name)));
    const lock = fs.readFileSync(f.at('/etc/nexowatt-eos/.activation.lock'));
    const result = await repair.update(f.options, f.dependencies);
    assert.equal(result.phase, 'FIRST_START_RECOVERED'); assert.equal(result.sequence, 11);
    assert.equal(f.current(), '/opt/nexowatt/eos/releases/' + ID); assert.equal(f.active(), 'active'); assert.equal(f.locked(), false);
    assert.equal(f.journal().phase, 'ACTIVE'); assert.equal(Buffer.from(f.journal().originalLockBase64, 'base64').equals(lock), true);
    assert.equal(fs.statSync(f.at('/etc/nexowatt-eos/first-start-recovery-r8.json')).mode & 0o777, 0o600);
    const complete = JSON.parse(fs.readFileSync(f.at('/etc/nexowatt-eos/first-start-complete.json')));
    assert.equal(complete.releaseId, ID); assert.equal(complete.physicalControlEnabled, false); assert.equal(complete.licenseConfigured, true);
    for (const [i, name] of repair.PRESERVED.entries()) assert.deepEqual(fs.readFileSync(f.at('/etc/nexowatt-eos/' + name)), files[i]);
    assert.ok(f.events.indexOf('readiness') < f.events.indexOf('enable nexowatt-eos.target'));
    assert.ok(f.events.indexOf('verify-live') > f.events.indexOf('readiness'));
    assert.ok(!fs.existsSync(f.at('/etc/nexowatt-eos/.first-start-recovery-r8.guard')));
    for (const [name, bytes] of f.sourceRecords) assert.deepEqual(fs.readFileSync(f.at('/etc/nexowatt-eos/' + name)), bytes);
    assert.deepEqual(Buffer.from(f.journal().retainedR7JournalBase64, 'base64'), f.sourceRecords.get('first-start-recovery-r7.json'));
    assert.deepEqual(Buffer.from(f.journal().retainedR7GuardBase64, 'base64'), f.sourceRecords.get('.first-start-recovery-r7.guard'));
});
for (const [name, edit] of [
    ['completed first-start', f => fs.writeFileSync(f.at('/etc/nexowatt-eos/first-start-complete.json'), '{}')],
    ['prior R8 recovery', f => fs.writeFileSync(f.at('/etc/nexowatt-eos/first-start-recovery-r8.json'), '{}')],
    ['R6 attempt', f => fs.writeFileSync(f.at('/etc/nexowatt-eos/test-update-r6-status.json'), '{}')],
    ['existing permit', f => fs.writeFileSync(f.at('/etc/nexowatt-eos/maintenance-start.json'), '{}')],
    ['foreign lock', f => fs.writeFileSync(f.at('/etc/nexowatt-eos/.activation.lock'), '{"operation":"other"}')],
    ['live old coordinator', f => f.dependencies.processExists = () => true],
    ['wrong key pin', f => f.options.expectedKeySha256 = 'b'.repeat(64)],
    ['wrong release sequence', f => f.desc.next.manifest.sequence = 9],
    ['installed unit drift', f => fs.writeFileSync(f.at('/etc/systemd/system/nexowatt-eos-controller.service'), 'drift')],
    ['DB enrollment rejected', f => f.dependencies.verifyFirstStart = async () => { throw new Error('unsafe'); }],
    ['active controller', f => f.setActive('active')],
]) test(name + ' refuses before stage/stop and retains original lock', async t => {
    const f = fixture(t); edit(f); const lock = fs.readFileSync(f.at('/etc/nexowatt-eos/.activation.lock'));
    await assert.rejects(repair.update(f.options, f.dependencies));
    assert.deepEqual(fs.readFileSync(f.at('/etc/nexowatt-eos/.activation.lock')), lock);
    assert.ok(!f.events.includes('stage')); assert.ok(!f.events.some(event => event.startsWith('stop ')));
});
for (const phase of ['stage', 'native', 'readiness', 'verify-live', 'enable nexowatt-eos.target', 'disable nexowatt-eos-setup.target', 'ACTIVE-journal']) {
    test('fault at ' + phase + ' retains locked stopped R4 and never reports success', async t => {
        const f = fixture(t), reject = () => { throw Object.assign(new Error('injected'), { code: 'REPAIR_INJECTED' }); };
        if (phase === 'stage') f.dependencies.stageBundle = reject;
        else if (phase === 'native') f.dependencies.nativeProbe = reject;
        else if (phase === 'readiness') f.dependencies.readiness = reject;
        else if (phase === 'verify-live') f.dependencies.verifyFirstStart = async () => ({ setupId: 'f'.repeat(32), licenseConfigured: true, assertPreserved: () => {}, verifyLive: reject });
        else if (phase === 'ACTIVE-journal') f.dependencies.atomicWrite = (file, bytes) => {
            if (file.endsWith('first-start-recovery-r8.json') && JSON.parse(bytes).phase === 'ACTIVE') reject();
            atomicWrite(file, bytes);
        };
        else { const exec = f.dependencies.exec; f.dependencies.exec = (file, args) => args.join(' ') === phase ? { status: 1, stdout: '' } : exec(file, args); }
        await assert.rejects(repair.update(f.options, f.dependencies));
        assert.equal(f.current(), '/opt/nexowatt/eos/releases/' + base.releaseId); assert.equal(f.active(), 'inactive'); assert.equal(f.locked(), true);
        assert.deepEqual(fs.readFileSync(f.at('/etc/nexowatt-eos/release-state.json')), f.state);
        assert.equal(fs.existsSync(f.at('/etc/nexowatt-eos/first-start-complete.json')), false);
        assert.equal(fs.existsSync(f.at('/etc/nexowatt-eos/maintenance-start.json')), false);
        assert.equal(fs.existsSync(f.at('/etc/nexowatt-eos/.first-start-recovery-r8.guard')), true);
        for (const [name, bytes] of f.sourceRecords) assert.deepEqual(fs.readFileSync(f.at('/etc/nexowatt-eos/' + name)), bytes);
        assert.equal(typeof f.journal().failureCode, 'string'); assert.equal(typeof f.journal().failureStage, 'string');
    });
}
function rewrite(f, name, mutate) {
    const file = f.at('/etc/nexowatt-eos/' + name), value = JSON.parse(fs.readFileSync(file));
    mutate(value); fs.writeFileSync(file, JSON.stringify(value) + '\n');
}
for (const [name, mutate] of [
    ['unrestored phase', j => { j.phase = 'RECOVERY_REQUIRED'; }],
    ['active phase', j => { j.phase = 'ACTIVE'; }],
    ['foreign target', j => { j.targetReleaseId = ID; }],
    ['wrong sequence', j => { j.targetSequence = 9; }],
    ['wrong operation ID', j => { j.operationId = '22222222-2222-4333-8444-555555555555'; }],
    ['wrong invocation ID', j => { j.invocationId = '4'.repeat(32); }],
    ['unknown fields', j => { j.additional = true; }],
    ['noncanonical original bytes', j => { j.originalStateBase64 += '\n'; }],
    ['different original state bytes', j => { j.originalStateBase64 = Buffer.from(Buffer.from(j.originalStateBase64, 'base64').toString().trim()).toString('base64'); }],
    ['foreign original onboarding', j => { const l = JSON.parse(Buffer.from(j.originalLockBase64, 'base64')); l.operation = 'other'; j.originalLockBase64 = Buffer.from(JSON.stringify(l)).toString('base64'); }],
    ['physical control flag', j => { j.physicalControlEnabled = true; }],
    ['production flag', j => { j.productionReleaseApproved = true; }],
]) test(name + ' rejects retained R7 history before any mutations', async t => {
    const f = fixture(t); rewrite(f, 'first-start-recovery-r7.json', mutate);
    const before = fs.readFileSync(f.at('/etc/nexowatt-eos/first-start-recovery-r7.json'));
    await assert.rejects(repair.update(f.options, f.dependencies));
    assert.deepEqual(fs.readFileSync(f.at('/etc/nexowatt-eos/first-start-recovery-r7.json')), before);
    assert.equal(fs.existsSync(f.at('/etc/nexowatt-eos/.first-start-recovery-r8.guard')), false);
    assert.equal(fs.existsSync(f.at('/etc/nexowatt-eos/first-start-recovery-r8.json')), false);
    assert.ok(!f.events.some(event => /^(stage|stop|start|permit)/.test(event)));
});
for (const [name, change] of [
    ['changed guard bytes', (f, p) => fs.appendFileSync(p, ' ')],
    ['readable guard', (f, p) => fs.chmodSync(p, 0o644)],
    ['symlink guard', (f, p) => { fs.unlinkSync(p); fs.symlinkSync(f.at('/etc/nexowatt-eos/.activation.lock'), p); }],
    ['hardlink guard', (f, p) => { fs.unlinkSync(p); fs.linkSync(f.at('/etc/nexowatt-eos/.activation.lock'), p); }],
    ['oversized guard', (f, p) => fs.writeFileSync(p, Buffer.alloc(16385))],
    ['missing guard', (f, p) => fs.unlinkSync(p)],
]) test(name + ' refuses without deleting the R7 gate', async t => {
    const f = fixture(t); change(f, f.at('/etc/nexowatt-eos/.first-start-recovery-r7.guard'));
    await assert.rejects(repair.update(f.options, f.dependencies));
    assert.equal(f.locked(), true); assert.equal(f.current(), '/opt/nexowatt/eos/releases/' + base.releaseId);
    assert.ok(!f.events.includes('stage'));
});
for (const pid of [100, 101]) test('live retained coordinator PID ' + pid + ' rejects before changes', async t => {
    const f = fixture(t); f.dependencies.processExists = value => value === pid;
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_OLD_COORDINATOR_LIVE'));
    assert.ok(!f.events.includes('stage'));
});
for (const fields of ['ActiveState=active\nMainPID=0\nControlPID=0', 'ActiveState=failed\nMainPID=51\nControlPID=0',
    'ActiveState=inactive\nMainPID=0\nControlPID=52', 'ActiveState=inactive']) test('unquiesced/incomplete previous service evidence rejects: ' + fields.replaceAll('\n', ','), async t => {
    const f = fixture(t), exec = f.dependencies.exec;
    f.dependencies.exec = (file, args) => args[0] === 'show' && args[1] === 'nexowatt-eos-first-start-recovery-r7.service'
        ? { status: 0, stdout: fields } : exec(file, args);
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_OLD_COORDINATOR_LIVE'));
    assert.ok(!f.events.includes('stage'));
});
test('R7 installed authentication is mandatory and scoped before stage', async t => {
    const f = fixture(t), inspect = f.dependencies.inspectInstalled; let checked = false;
    f.dependencies.inspectInstalled = (release, key) => {
        if (path.basename(release) === repair.RETAINED_R7.releaseId) { checked = true; assert.equal(key, repair.RETAINED_R7.publicKeySha256); throw new Error('PRIVATE_SIGNATURE_DETAIL'); }
        return inspect(release, key);
    };
    await assert.rejects(repair.update(f.options, f.dependencies), error => error.code === 'REPAIR_FAILED' && !error.message.includes('PRIVATE'));
    assert.equal(checked, true); assert.ok(!f.events.includes('stage'));
});
for (const source of ['first-start-recovery-r7.json', '.first-start-recovery-r7.guard']) test('changed historical ' + source + ' before adoption is not overwritten', async t => {
    const f = fixture(t); f.dependencies.nativeProbe = () => {
        fs.writeFileSync(f.at('/etc/nexowatt-eos/' + source), 'foreign-private-history'); return { passed: true };
    };
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_RETAINED_CHANGED'));
    assert.equal(fs.readFileSync(f.at('/etc/nexowatt-eos/' + source), 'utf8'), 'foreign-private-history');
    assert.equal(JSON.parse(fs.readFileSync(f.at('/etc/nexowatt-eos/.activation.lock'))).targetSequence, 10);
    assert.equal(f.current(), '/opt/nexowatt/eos/releases/' + base.releaseId);
});
for (const target of ['pointer', 'state', 'completion', 'lock', 'guard']) test('foreign ' + target + ' during trial remains untouched behind recovery-required gate', async t => {
    const f = fixture(t);
    f.dependencies.readiness = async () => {
        if (target === 'pointer') { fs.unlinkSync(f.at('/opt/nexowatt/eos/current')); fs.symlinkSync('/opt/nexowatt/eos/releases/' + 'b'.repeat(64), f.at('/opt/nexowatt/eos/current')); }
        else fs.writeFileSync(f.at('/etc/nexowatt-eos/' + ({ state: 'release-state.json', completion: 'first-start-complete.json', lock: '.activation.lock', guard: '.first-start-recovery-r8.guard' }[target])), 'foreign-record');
    };
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_RECOVERY_REQUIRED'));
    if (target === 'pointer') assert.equal(f.current(), '/opt/nexowatt/eos/releases/' + 'b'.repeat(64));
    else assert.equal(fs.readFileSync(f.at('/etc/nexowatt-eos/' + ({ state: 'release-state.json', completion: 'first-start-complete.json', lock: '.activation.lock', guard: '.first-start-recovery-r8.guard' }[target])), 'utf8'), 'foreign-record');
    assert.equal(f.journal().phase, 'RECOVERY_REQUIRED'); assert.equal(f.active(), 'inactive'); assert.equal(f.locked(), true);
    for (const [name, bytes] of f.sourceRecords) assert.deepEqual(fs.readFileSync(f.at('/etc/nexowatt-eos/' + name)), bytes);
});
test('HTTPS cause/stage survives rollback while raw details never leave the exception boundary', async t => {
    const f = fixture(t);
    f.dependencies.readiness = async (_, __, setStage) => { setStage('UI_HTTPS'); throw Object.assign(new Error('PRIVATE_ADDRESS_TOKEN'), { code: 'ONBOARD_HTTPS_NOT_READY', reason: 'transport', stack: 'PRIVATE_STACK' }); };
    await assert.rejects(repair.update(f.options, f.dependencies), error => {
        assert.deepEqual(repair.failureOutput(error), { ok: false, code: 'REPAIR_TRIAL_FAILED_RESTORED_STOPPED', failureStage: 'UI_HTTPS', failureCode: 'ONBOARD_HTTPS_NOT_READY', failureReason: 'transport', manualRecoveryRequired: true });
        assert.ok(!JSON.stringify(error).includes('PRIVATE')); return true;
    });
    assert.equal(f.journal().failureStage, 'UI_HTTPS'); assert.equal(f.journal().failureCode, 'ONBOARD_HTTPS_NOT_READY'); assert.equal(f.journal().failureReason, 'transport');
    assert.ok(!fs.readFileSync(f.at('/etc/nexowatt-eos/first-start-recovery-r8.json'), 'utf8').includes('PRIVATE'));
});
test('stop failure preserves original cause and does not claim RESTORED_STOPPED', async t => {
    const f = fixture(t), exec = f.dependencies.exec;
    f.dependencies.readiness = async (_, __, stage) => { stage('ADMIN_HTTPS'); throw Object.assign(new Error('private'), { code: 'ONBOARD_HTTPS_NOT_READY' }); };
    f.dependencies.exec = (file, args) => f.active() === 'active' && args[0] === 'stop' ? { status: 1, stdout: '' } : exec(file, args);
    await assert.rejects(repair.update(f.options, f.dependencies), error => error.code === 'REPAIR_RECOVERY_REQUIRED' && error.failureCode === 'ONBOARD_HTTPS_NOT_READY');
    assert.equal(f.journal().phase, 'RECOVERY_REQUIRED'); assert.equal(f.journal().failureStage, 'ADMIN_HTTPS');
    assert.equal(f.locked(), true); assert.equal(f.active(), 'active');
});
test('unknown error code and stage are reduced to fixed output', () => {
    assert.deepEqual(repair.failureOutput({ code: 'REPAIR_PRIVATE_TOKEN', failureCode: 'SECRET', failureStage: 'PRIVATE_PATH', failureReason: 'PRIVATE_TOKEN' }),
        { ok: false, code: 'REPAIR_FAILED', failureStage: 'PREFLIGHT', failureCode: 'REPAIR_FAILED', failureReason: null, manualRecoveryRequired: true });
});
test('crash quiesce belongs only to the same R8 invocation and never adopts retained R7', () => {
    const events = [], id = '3'.repeat(32);
    const effects = { readLock: () => ({ operation: 'test-release-repair', invocationId: id, targetSequence: 11 }), block: () => events.push('block'), stop: () => events.push('stop') };
    assert.equal(repair.quiesceIncomplete(effects, id).status, 'REPAIR_INCOMPLETE_TRIAL_STOPPED');
    assert.deepEqual(events, ['block', 'stop']); events.length = 0;
    assert.equal(repair.quiesceIncomplete(effects, '4'.repeat(32)).status, 'REPAIR_OTHER_MAINTENANCE');
    effects.readLock = () => ({ operation: 'test-release-repair', invocationId: id, targetSequence: 10 });
    assert.equal(repair.quiesceIncomplete(effects, id).status, 'REPAIR_OTHER_MAINTENANCE'); assert.deepEqual(events, []);
});
test('crash quiesce still stops if permit revocation fails', () => {
    const events = [], id = '3'.repeat(32);
    const effects = { readLock: () => ({ operation: 'test-release-repair', invocationId: id, targetSequence: 11 }), block: () => { events.push('block'); throw new Error('private'); }, stop: () => events.push('stop') };
    assert.throws(() => repair.quiesceIncomplete(effects, id), expect('REPAIR_QUIESCE_PERMIT_FAILED')); assert.deepEqual(events, ['block', 'stop']);
});
test('CLI accepts only pinned R8 options and exposes no force/root or retained-key override', t => {
    const f = fixture(t), args = ['--bundle', f.options.bundleDirectory, '--public-key', f.options.publicKeyFile, '--expected-release-id', ID, '--expected-key-sha256', f.options.expectedKeySha256];
    assert.deepEqual(repair.parseArgs(args), f.options);
    assert.throws(() => repair.parseArgs([...args, '--force'])); assert.throws(() => repair.parseArgs([...args, '--root', '/tmp']));
    assert.throws(() => repair.validatePins({ ...f.options, expectedKeySha256: repair.RETAINED_R7.publicKeySha256 }));
    assert.throws(() => repair.validatePins({ ...f.options, expectedReleaseId: repair.RETAINED_R7.releaseId }));
});
for (const name of ['.activation.lock', '.first-start-recovery-r8.guard']) test('directory fsync failure after own ' + name + ' unlink rebuilds both gates before restoring', async t => {
    const f = fixture(t), unlink = fs.unlinkSync, fsync = fs.fsyncSync; let failNextSync = false, injected = false;
    t.mock.method(fs, 'unlinkSync', file => {
        const result = unlink(file);
        if (file === f.at('/etc/nexowatt-eos/' + name) && !injected) failNextSync = true;
        return result;
    });
    t.mock.method(fs, 'fsyncSync', fd => {
        if (failNextSync) { failNextSync = false; injected = true; throw new Error('PRIVATE_FILESYSTEM_DETAIL'); }
        return fsync(fd);
    });
    await assert.rejects(repair.update(f.options, f.dependencies), error => error.code === 'REPAIR_TRIAL_FAILED_RESTORED_STOPPED' && error.failureStage === 'UNLOCK');
    assert.equal(injected, true); assert.equal(f.locked(), true); assert.equal(f.active(), 'inactive');
    assert.equal(f.journal().phase, 'RESTORED_STOPPED'); assert.equal(f.journal().failureCode, 'REPAIR_FAILED');
    assert.equal(fs.existsSync(f.at('/etc/nexowatt-eos/.first-start-recovery-r8.guard')), true);
    assert.equal(fs.existsSync(f.at('/etc/nexowatt-eos/first-start-complete.json')), false);
    assert.deepEqual(fs.readFileSync(f.at('/etc/nexowatt-eos/release-state.json')), f.state);
    assert.equal(f.current(), '/opt/nexowatt/eos/releases/' + base.releaseId);
    for (const [file, bytes] of f.sourceRecords) assert.deepEqual(fs.readFileSync(f.at('/etc/nexowatt-eos/' + file)), bytes);
});
for (const point of ['lock-before', 'state-after', 'TRIAL-report']) test('fault at atomic ' + point + ' boundary retains gates and original evidence', async t => {
    const f = fixture(t); let injected = false;
    f.dependencies.atomicWrite = (file, bytes) => {
        const trigger = !injected && (point === 'lock-before' && file.endsWith('/.activation.lock') ||
            point === 'state-after' && file.endsWith('/release-state.json') ||
            point === 'TRIAL-report' && file.endsWith('/first-start-recovery-r8.json') && JSON.parse(bytes).phase === 'TRIAL');
        if (trigger && point === 'lock-before') { injected = true; throw new Error('private'); }
        atomicWrite(file, bytes);
        if (trigger) { injected = true; throw new Error('private'); }
    };
    await assert.rejects(repair.update(f.options, f.dependencies));
    assert.equal(injected, true); assert.equal(f.locked(), true); assert.equal(f.active(), 'inactive');
    assert.equal(f.current(), '/opt/nexowatt/eos/releases/' + base.releaseId);
    assert.deepEqual(fs.readFileSync(f.at('/etc/nexowatt-eos/release-state.json')), f.state);
    for (const [file, bytes] of f.sourceRecords) assert.deepEqual(fs.readFileSync(f.at('/etc/nexowatt-eos/' + file)), bytes);
});
test('source-verification stage and signature code survive pre-mutation rejection', async t => {
    const f = fixture(t); f.dependencies.inspectInstalled = () => { throw Object.assign(new Error('private-path'), { code: 'INSTALLED_SIGNATURE' }); };
    await assert.rejects(repair.update(f.options, f.dependencies), error => {
        assert.deepEqual(repair.failureOutput(error), { ok: false, code: 'INSTALLED_SIGNATURE', failureStage: 'SOURCE_VERIFY', failureCode: 'INSTALLED_SIGNATURE', failureReason: null, manualRecoveryRequired: true });
        return true;
    });
    assert.ok(!f.events.includes('stage'));
});
function readinessFixture(t, failProbe) {
    const stages = [], calls = [];
    const databases = require('../../runtime/transport/databases.cjs');
    const tls = require('../../security/verify-runtime-tls.cjs');
    const bootstrap = require('../../runtime/bootstrap/initialize.cjs');
    const onboard = require('../../tools/system/onboard-ui.cjs');
    const bundle = require('../../runtime/release/bundle.cjs');
    t.mock.method(tls, 'readConfig', () => ({ states: {} }));
    t.mock.method(bootstrap, 'assertRuntimeConfig', config => config);
    t.mock.method(databases, 'clients', () => ({ States: class {
        constructor(options) { queueMicrotask(options.connected); }
        async destroy() { calls.push('destroy'); throw new Error('PRIVATE_CLOSE_FAILURE'); }
    } }));
    t.mock.method(onboard, 'waitAdapters', async () => { calls.push('adapters'); });
    t.mock.method(onboard, 'probeWeb', async port => {
        calls.push(port);
        if (failProbe && port === 8188) throw Object.assign(new Error('PRIVATE_WEB_FAILURE'), { code: 'ONBOARD_HTTPS_NOT_READY' });
    });
    t.mock.method(bundle, 'readFileLimited', () => ({ bytes: Buffer.from('fixture-ca') }));
    return { stages, calls, run: () => repair.readiness('/test-release', Date.now(), stage => stages.push(stage)) };
}
test('real readiness coordinator preserves failed UI probe when client cleanup also fails', async t => {
    const f = readinessFixture(t, true);
    await assert.rejects(f.run(), error => error.code === 'ONBOARD_HTTPS_NOT_READY' && error.failureStage === 'UI_HTTPS');
    assert.deepEqual(f.stages, ['DB_CONNECT', 'ADAPTER_HEARTBEAT', 'WEB_HTTPS']);
    assert.deepEqual(f.calls, ['adapters', 8081, 8188, 'destroy']);
});
test('client cleanup failure after healthy probes has a distinct fixed stage/code', async t => {
    const f = readinessFixture(t, false);
    await assert.rejects(f.run(), expect('REPAIR_DB_CLOSE_FAILED'));
    assert.equal(f.stages.at(-1), 'DB_CLOSE');
});
test('persistent directory fsync failure after guard removal still reconstructs the activation gate', async t => {
    const f = fixture(t), unlink = fs.unlinkSync, fsync = fs.fsyncSync; let removed = false;
    t.mock.method(fs, 'unlinkSync', file => {
        const result = unlink(file);
        if (file === f.at('/etc/nexowatt-eos/.first-start-recovery-r8.guard')) removed = true;
        return result;
    });
    t.mock.method(fs, 'fsyncSync', fd => {
        if (removed && fs.readlinkSync('/proc/self/fd/' + fd) === f.at('/etc/nexowatt-eos')) throw Object.assign(new Error('private'), { code: 'EIO' });
        return fsync(fd);
    });
    await assert.rejects(repair.update(f.options, f.dependencies), error => error.code === 'REPAIR_RECOVERY_REQUIRED' && error.failureStage === 'UNLOCK');
    assert.equal(removed, true); assert.equal(f.locked(), true); assert.equal(f.active(), 'inactive');
    assert.equal(fs.existsSync(f.at('/etc/nexowatt-eos/.first-start-recovery-r8.guard')), true);
    assert.equal(JSON.parse(fs.readFileSync(f.at('/etc/nexowatt-eos/.activation.lock'))).targetSequence, 11);
    assert.equal(f.journal().phase, 'RECOVERY_REQUIRED');
});
test('partial own guard recreation never prevents rebuilding the boot activation gate', async t => {
    const f = fixture(t), unlink = fs.unlinkSync, fsync = fs.fsyncSync, write = fs.writeFileSync;
    let removed = false, syncFailed = false, guardWriteFailed = false;
    t.mock.method(fs, 'unlinkSync', file => {
        const result = unlink(file);
        if (file === f.at('/etc/nexowatt-eos/.first-start-recovery-r8.guard')) removed = true;
        return result;
    });
    t.mock.method(fs, 'fsyncSync', fd => {
        if (removed && !syncFailed && fs.readlinkSync('/proc/self/fd/' + fd) === f.at('/etc/nexowatt-eos')) { syncFailed = true; throw new Error('private'); }
        return fsync(fd);
    });
    t.mock.method(fs, 'writeFileSync', (file, ...args) => {
        if (removed && typeof file === 'number' && fs.readlinkSync('/proc/self/fd/' + file) === f.at('/etc/nexowatt-eos/.first-start-recovery-r8.guard')) {
            guardWriteFailed = true; throw new Error('private');
        }
        return write(file, ...args);
    });
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_RECOVERY_REQUIRED'));
    assert.equal(guardWriteFailed, true); assert.equal(f.locked(), true); assert.equal(f.active(), 'inactive');
    assert.equal(JSON.parse(fs.readFileSync(f.at('/etc/nexowatt-eos/.activation.lock'))).targetSequence, 11);
    assert.equal(f.journal().phase, 'RECOVERY_REQUIRED');
});
test('non-Error readiness rejection still stops and restores behind both gates', async t => {
    const f = fixture(t); f.dependencies.readiness = async () => { throw null; };
    await assert.rejects(repair.update(f.options, f.dependencies), error => error.code === 'REPAIR_TRIAL_FAILED_RESTORED_STOPPED' && error.failureCode === 'REPAIR_FAILED');
    assert.equal(f.locked(), true); assert.equal(f.active(), 'inactive'); assert.equal(f.journal().phase, 'RESTORED_STOPPED');
});
