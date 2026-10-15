'use strict';
const nodeTest = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const repair = require('../../tools/system/update-test-own-adapters.cjs');
const { sha256 } = require('../../runtime/release/bundle.cjs');
const { atomicWrite } = require('../../tools/system/activate-release.cjs');
const ID = 'a'.repeat(64);
// Real temporary files, fsync, atomic state writes and symlink switching run below.
// Services, baseline inventory verification and native probing are explicit doubles.
const base = repair.BASES[0];
const test = nodeTest;
function provenance() {
    return { schemaVersion: 1, operation: 'test-release-repair', operationId: crypto.randomUUID(), invocationId: '4'.repeat(32),
        phase: 'ACTIVE', failureStage: null, failureCode: null, failureReason: null, previousReleaseId: repair.COMPLETION_RELEASE,
        targetSequence: 12, targetReleaseId: base.releaseId, at: '2026-10-07T12:00:00.000Z', previousControllerState: 'active',
        physicalControlEnabled: false, productionReleaseApproved: false };
}
function descriptors() {
    const product = require('../../runtime/product/scope.cjs');
    const unit = fs.readFileSync(path.join(__dirname, '../../system/postgresql-test/systemd/nexowatt-eos-upload.service'));
    const manifest = sequence => ({ sequence, profile: 'test', releaseVersion: '0.2.0-test.3', nodeVersion: '24.21.0',
        platforms: ['linux-arm64'], files: [{ path: 'runtime/postgresql/schema.sql', size: 4, sha256: sha256('sql\\n'), mode: 0o644 },
            { path: 'system/postgresql-test/systemd/nexowatt-eos-controller.service', size: 5, sha256: sha256('unit\\n'), mode: 0o644 },
            sequence === 13 ? repair.expectedProfileRow() : { path: repair.PROFILE_PATH, size: 3, sha256: sha256('{}\\n'), mode: 0o644 },
            sequence === 13 ? repair.expectedUploadRow() : { path: repair.UPLOAD_PATH, size: unit.length, sha256: sha256(unit), mode: 0o644 },
            ...(sequence === 13 ? [repair.expectedUploadRow(repair.UPLOAD_TEMPLATE_PATH)] : [])] });
    const catalog = { catalogRevision: 8, entries: product.SPECS.map(spec => ({ id: spec.id, package: spec.package,
        version: spec.version, sha256: '1'.repeat(64), kind: spec.kind, required: spec.execute,
        review: { status: spec.execute ? 'approved-test' : 'pending', evidenceId: spec.execute ? 'old-evidence' : null },
        permissions: { shellExec: false } })) };
    const incoming = structuredClone(catalog); incoming.catalogRevision = 9;
    for (const row of incoming.entries.filter(row => !row.required)) { row.required = true; row.review.status = 'approved-test'; row.review.evidenceId = 'eos-own-adapters-native-20261015'; }
    return { old: { releaseId: base.releaseId, manifest: manifest(base.sequence), catalog },
        next: { releaseId: ID, manifest: manifest(13), catalog: incoming } };
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
    fs.writeFileSync(at('/etc/nexowatt-eos/test-update-r9-status.json'), JSON.stringify(provenance()));
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
    fs.mkdirSync(path.dirname(path.join(desc.next.payloadPath, repair.UPLOAD_PATH)), { recursive: true });
    fs.writeFileSync(path.join(desc.next.payloadPath, repair.UPLOAD_PATH), fs.readFileSync(path.join(__dirname, '../../', repair.UPLOAD_TEMPLATE_PATH)));
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
        current: () => fs.readlinkSync(at('/opt/nexowatt/eos/current')), journal: () => JSON.parse(fs.readFileSync(at('/etc/nexowatt-eos/test-own-adapters-status.json'))),
        locked: () => fs.existsSync(at('/etc/nexowatt-eos/.activation.lock')) };
}
const expect = code => error => error.code === code;
const oldTarget = '/opt/nexowatt/eos/releases/' + base.releaseId;
const controller = 'nexowatt-eos-controller.service';
const stateFile = '/etc/nexowatt-eos/release-state.json';
const lockFile = '/etc/nexowatt-eos/.activation.lock';
const guardFile = '/etc/nexowatt-eos/.test-own-adapters.guard';
function assertStopped(f) {
    assert.equal(f.active(), 'inactive'); assert.equal(f.locked(), true);
    assert.equal(fs.existsSync(f.at('/etc/nexowatt-eos/maintenance-start.json')), false);
}
test('CLI requires explicit new trust, absolute paths and supervised invocation', async t => {
    assert.throws(() => repair.parseArgs([]), expect('REPAIR_USAGE'));
    for (const changes of [{ expectedReleaseId: base.releaseId }, { expectedKeySha256: base.publicKeySha256 }, { bundleDirectory: 'relative' }]) {
        assert.throws(() => repair.validatePins({ expectedReleaseId: ID, expectedKeySha256: 'd'.repeat(64), bundleDirectory: '/b', publicKeyFile: '/k', ...changes }));
    }
    const f = fixture(t); f.dependencies.invocationId = 'invalid';
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_SYSTEMD_INVOCATION_REQUIRED'));
    assert.deepEqual(f.events, []); assert.equal(f.locked(), false);
});
test('only exact healthy R9 baseline state and exact historical R8 completion are accepted', async t => {
    for (const changes of [{ sequence: 10 }, { releaseId: ID }, { publicKeySha256: '1'.repeat(64) },
        { profile: 'production' }, { nodeVersion: '24.19.0' }, { extra: 1 }]) {
        assert.throws(() => repair.validateState({ schemaVersion: 1, ...base, ...changes }), expect('REPAIR_R9_BASELINE_REQUIRED'));
    }
    for (const changes of [{ releaseId: ID }, { physicalControlEnabled: true }, { completedAt: 'yesterday' }, { extra: 1 }]) {
        const f = fixture(t), file = f.at('/etc/nexowatt-eos/first-start-complete.json');
        fs.writeFileSync(file, JSON.stringify({ ...JSON.parse(fs.readFileSync(file)), ...changes }));
        await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_COMPLETED_FIRST_START_REQUIRED'));
        assert.deepEqual(f.events, []); assert.equal(f.locked(), false);
    }
    for (const state of ['inactive', 'failed', 'activating']) {
        const f = fixture(t); f.setActive(state);
        await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_CONTROLLER_BUSY'));
        assert.ok(!f.events.includes('stage')); assert.equal(f.locked(), false);
    }
});
test('transition permits only fixed own-adapter admission, reviewed upload unit and source digest changes', () => {
    const d = descriptors(); d.next.catalog.entries[1].sha256 = 'e'.repeat(64);
    assert.equal(repair.validateTransition(d.old, d.next, { expectedReleaseId: ID }), true);
    for (const mutate of [x => x.next.manifest.sequence = 11, x => x.next.manifest.sequence = 14,
        x => x.next.manifest.profile = 'production', x => x.next.manifest.platforms = ['linux-x64'],
        x => x.next.manifest.nodeVersion = '24.19.0', x => x.next.manifest.releaseVersion = '0.2.0-test.4',
        x => x.next.manifest.files[0].sha256 = 'f'.repeat(64), x => x.next.manifest.files[2].sha256 = 'f'.repeat(64), x => x.next.manifest.files.pop(),
        x => x.next.manifest.files.push({ path: 'system/new.service', size: 1, mode: 0o644, sha256: 'f'.repeat(64) }),
        x => x.next.catalog.entries[1].review.status = 'pending', x => x.next.catalog.entries[1].permissions.shellExec = true,
        x => x.next.catalog.entries.pop()]) {
        const x = descriptors(); mutate(x); assert.throws(() => repair.validateTransition(x.old, x.next, { expectedReleaseId: ID }));
    }
});
test('successful own-adapter trial installs state before start and preserves historical R8 completion/configuration', async t => {
    const f = fixture(t), before = repair.PRESERVED.map(name => fs.readFileSync(f.at('/etc/nexowatt-eos/' + name)));
    const result = await repair.update(f.options, f.dependencies);
    assert.equal(result.sequence, 13); assert.equal(result.phase, 'SIX_OWN_ADAPTER_TEST_ACTIVE');
    assert.equal(result.physicalControlEnabled, false); assert.equal(result.productionReleaseApproved, false);
    assert.equal(f.current(), '/opt/nexowatt/eos/releases/' + ID); assert.equal(f.active(), 'active');
    assert.equal(f.locked(), false); assert.equal(fs.existsSync(f.at(guardFile)), false); assert.equal(f.journal().phase, 'ACTIVE');
    for (const [i, name] of repair.PRESERVED.entries()) assert.deepEqual(fs.readFileSync(f.at('/etc/nexowatt-eos/' + name)), before[i]);
    const current = JSON.parse(fs.readFileSync(f.at(stateFile)));
    assert.equal(current.releaseId, ID); assert.equal(current.sequence, 13); assert.equal(current.publicKeySha256, f.options.expectedKeySha256);
    assert.ok(f.events.indexOf('readiness:' + base.releaseId) < f.events.indexOf('stage'));
    assert.ok(f.events.indexOf('native') < f.events.indexOf('stop ' + controller));
    assert.ok(f.events.indexOf('readiness:' + ID) < f.events.indexOf('revoke'));
    assert.ok(!f.events.some(row => /postgresql.*stop|enable|initialize|setup/.test(row)));
});
test('only the exact fixed upload start waits beyond its systemd oneshot bound', async t => {
    const f = fixture(t), exec = f.dependencies.exec, calls = [];
    f.dependencies.exec = (file, args, options) => {
        calls.push({ file, args: [...args], timeout: options.timeout });
        return exec(file, args, options);
    };
    await repair.update(f.options, f.dependencies);
    assert.deepEqual(calls.filter(row => row.timeout !== 90000), [{ file: '/usr/bin/systemctl',
        args: ['start', 'nexowatt-eos-upload.service'], timeout: 270000 }]);
    const template = fs.readFileSync(path.join(__dirname, '../../', repair.UPLOAD_TEMPLATE_PATH), 'utf8');
    const seconds = Number(/^TimeoutStartSec=(\d+)$/m.exec(template)?.[1]);
    assert.equal(seconds, 240); assert.ok(calls.find(row => row.timeout === 270000).timeout > seconds * 1000);
    assert.ok(calls.some(row => row.args.join(' ') === 'start ' + controller && row.timeout === 90000));
});
test('baseline readiness failure never stages, locks or stops an unhealthy controller', async t => {
    const f = fixture(t); f.dependencies.readiness = async () => { throw Object.assign(Error('PRIVATE'), { code: 'ONBOARD_HTTPS_NOT_READY', failureStage: 'UI_HTTPS', reason: 'tls' }); };
    await assert.rejects(repair.update(f.options, f.dependencies), error => {
        assert.deepEqual(repair.failureOutput(error), { ok: false, code: 'ONBOARD_HTTPS_NOT_READY', failureStage: 'UI_HTTPS',
            failureCode: 'ONBOARD_HTTPS_NOT_READY', failureReason: 'tls', manualRecoveryRequired: true, restoredPreviousActive: false });
        assert.equal(error.message.includes('PRIVATE'), false); return true;
    });
    assert.equal(f.locked(), false); assert.equal(f.active(), 'active'); assert.ok(!f.events.includes('stage'));
});
test('trust, signature, owner, linked state and installed-unit drift fail before mutation', async t => {
    for (const kind of ['key', 'signature', 'owner', 'symlink', 'hardlink', 'unit', 'tool']) {
        const f = fixture(t), file = f.at(stateFile);
        if (kind === 'key') f.options.expectedKeySha256 = 'd'.repeat(64);
        if (kind === 'signature') f.dependencies.verifyBundle = () => { throw Object.assign(Error('PRIVATE'), { code: 'BUNDLE_SIGNATURE' }); };
        if (kind === 'owner') f.dependencies.ownerCheck = () => { throw Error('PRIVATE'); };
        if (kind === 'tool') f.dependencies.toolTrust = () => ({ trusted: false });
        if (kind === 'unit') fs.writeFileSync(f.at('/etc/systemd/system/' + controller), 'changed');
        if (kind === 'symlink' || kind === 'hardlink') { fs.renameSync(file, file + '.saved'); fs[kind === 'symlink' ? 'symlinkSync' : 'linkSync'](file + '.saved', file); }
        await assert.rejects(repair.update(f.options, f.dependencies));
        assert.deepEqual(f.events, []); assert.equal(f.locked(), false); assert.equal(f.active(), 'active');
    }
});
test('pre-existing foreign coordinator lock and guard survive unmodified', async t => {
    for (const file of [lockFile, guardFile]) {
        const f = fixture(t); fs.writeFileSync(f.at(file), 'foreign', { mode: 0o600 });
        await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_MAINTENANCE_IN_PROGRESS'));
        assert.equal(fs.readFileSync(f.at(file), 'utf8'), 'foreign'); assert.ok(!f.events.includes('stage'));
    }
});
test('staging/native/report failure before stop leaves old controller running and removes only own gates', async t => {
    for (const kind of ['stage', 'native-throw', 'native-false', 'prepared']) {
        const f = fixture(t);
        if (kind === 'stage') f.dependencies.stageBundle = () => { throw Error('stage'); };
        if (kind === 'native-throw') f.dependencies.nativeProbe = () => { throw Error('native'); };
        if (kind === 'native-false') f.dependencies.nativeProbe = () => ({ passed: false });
        if (kind === 'prepared') f.dependencies.atomicWrite = (file, bytes) => { if (file.endsWith('test-own-adapters-status.json')) throw Error('report'); atomicWrite(file, bytes); };
        await assert.rejects(repair.update(f.options, f.dependencies));
        assert.equal(f.locked(), false); assert.equal(fs.existsSync(f.at(guardFile)), false);
        assert.equal(f.active(), 'active'); assert.equal(f.current(), oldTarget); assert.ok(!f.events.includes('stop ' + controller));
    }
});
test('trial failure restarts only authenticated healthy R9 and unlocks after readiness', async t => {
    const f = fixture(t), normal = f.dependencies.readiness;
    f.dependencies.readiness = async (release, ...args) => {
        if (path.basename(release) === ID) throw Object.assign(Error('PRIVATE'), { code: 'ONBOARD_HTTPS_NOT_READY', failureStage: 'ADMIN_HTTPS', reason: 'response' });
        return normal(release, ...args);
    };
    await assert.rejects(repair.update(f.options, f.dependencies), error => {
        assert.equal(error.code, 'REPAIR_TRIAL_FAILED_RESTORED_ACTIVE');
        const out = repair.failureOutput(error); assert.equal(out.manualRecoveryRequired, false); assert.equal(out.restoredPreviousActive, true);
        assert.equal(out.failureStage, 'ADMIN_HTTPS'); assert.equal(out.failureCode, 'ONBOARD_HTTPS_NOT_READY'); assert.equal(out.failureReason, 'response'); return true;
    });
    assert.equal(f.current(), oldTarget); assert.deepEqual(fs.readFileSync(f.at(stateFile)), f.state);
    assert.equal(f.active(), 'active'); assert.equal(f.locked(), false); assert.equal(f.journal().phase, 'RESTORED_ACTIVE');
    assert.equal(f.events.filter(x => x === 'start ' + controller).length, 2);
});
test('fallback readiness failure leaves exact R9 stopped and locked', async t => {
    const f = fixture(t); let calls = 0;
    f.dependencies.readiness = async () => { if (++calls > 1) throw Error('readiness'); };
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_TRIAL_FAILED_RESTORED_STOPPED'));
    assertStopped(f); assert.equal(f.current(), oldTarget); assert.deepEqual(fs.readFileSync(f.at(stateFile)), f.state);
    assert.equal(f.journal().phase, 'RESTORED_STOPPED');
});
test('foreign state, current, completion and coordinator bytes are never overwritten', async t => {
    for (const kind of ['state', 'pointer', 'completion', 'lock', 'guard']) {
        const f = fixture(t), normal = f.dependencies.readiness;
        const target = kind === 'completion' ? '/etc/nexowatt-eos/first-start-complete.json' : kind === 'lock' ? lockFile : kind === 'guard' ? guardFile : stateFile;
        f.dependencies.readiness = async (release, ...args) => {
            if (path.basename(release) !== ID) return normal(release, ...args);
            if (kind === 'pointer') { fs.unlinkSync(f.at('/opt/nexowatt/eos/current')); fs.symlinkSync('/foreign/release', f.at('/opt/nexowatt/eos/current')); }
            else fs.writeFileSync(f.at(target), 'foreign');
        };
        await assert.rejects(repair.update(f.options, f.dependencies));
        if (kind === 'pointer') assert.equal(f.current(), '/foreign/release');
        else assert.equal(fs.readFileSync(f.at(target), 'utf8'), 'foreign');
        assert.equal(f.locked(), true);
    }
});
test('failed controller stop never claims restored state or unlocks', async t => {
    const f = fixture(t), original = f.dependencies.exec;
    f.dependencies.exec = (file, args) => args[0] === 'stop' ? { status: 1, stdout: '' } : original(file, args);
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_RECOVERY_REQUIRED'));
    assert.equal(f.locked(), true); assert.equal(f.active(), 'active'); assert.equal(f.current(), oldTarget);
    assert.equal(f.journal().phase, 'RECOVERY_REQUIRED');
});
test('state, trial report, permit, start, active report and unlock faults exercise rollback boundaries', async t => {
    for (const kind of ['state', 'trial-report', 'permit', 'start', 'active-report', 'unlock']) {
        const f = fixture(t), exec = f.dependencies.exec, permit = f.dependencies.maintenance.authorizeStart;
        let injected = false;
        f.dependencies.atomicWrite = (file, bytes) => {
            const hit = kind === 'state' && file.endsWith('/release-state.json') && JSON.parse(bytes).sequence === 13
                || kind === 'trial-report' && file.endsWith('test-own-adapters-status.json') && JSON.parse(bytes).phase === 'TRIAL'
                || kind === 'active-report' && file.endsWith('test-own-adapters-status.json') && JSON.parse(bytes).phase === 'ACTIVE';
            if (hit && !injected) { injected = true; throw Error('fault'); } atomicWrite(file, bytes);
        };
        f.dependencies.maintenance.authorizeStart = (...args) => { if (kind === 'permit' && !injected) { injected = true; throw Error('permit'); } return permit(...args); };
        f.dependencies.exec = (file, args) => { if (kind === 'start' && args[0] === 'start' && !injected) { injected = true; return { status: 1, stdout: '' }; } return exec(file, args); };
        const unlink = fs.unlinkSync, fsync = fs.fsyncSync; let arm = false;
        if (kind === 'unlock') {
            fs.unlinkSync = file => { const result = unlink(file); if (file === f.at(lockFile)) arm = true; return result; };
            fs.fsyncSync = fd => { if (arm && !injected) { injected = true; throw Error('fsync'); } return fsync(fd); };
        }
        try {
            await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_TRIAL_FAILED_RESTORED_ACTIVE'));
            assert.equal(injected, true); assert.equal(f.active(), 'active'); assert.equal(f.locked(), false);
            assert.equal(f.current(), oldTarget); assert.deepEqual(fs.readFileSync(f.at(stateFile)), f.state);
        } finally { fs.unlinkSync = unlink; fs.fsyncSync = fsync; }
    }
});
test('failure to record durable rollback leaves old release stopped and locked', async t => {
    const f = fixture(t), normal = f.dependencies.readiness;
    f.dependencies.readiness = async (release, ...args) => { if (path.basename(release) === ID) throw Error('trial'); return normal(release, ...args); };
    f.dependencies.atomicWrite = (file, bytes) => { if (file.endsWith('test-own-adapters-status.json') && JSON.parse(bytes).phase === 'RESTORED_ACTIVE') throw Error('journal'); atomicWrite(file, bytes); };
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_TRIAL_FAILED_RESTORED_STOPPED'));
    assertStopped(f); assert.equal(f.current(), oldTarget);
});
test('ExecStopPost only quiesces same invocation seq13; malformed protected lock requires matching journal', () => {
    const invocation = '3'.repeat(32); let stops = 0;
    const lock = { operation: 'test-release-repair', invocationId: invocation, targetSequence: 13 };
    const effects = { readLock: () => lock, block() {}, stop() { stops++; } };
    assert.equal(repair.quiesceIncomplete(effects, invocation).status, 'REPAIR_INCOMPLETE_TRIAL_STOPPED');
    assert.equal(repair.quiesceIncomplete({ ...effects, readLock: () => null }, invocation).status, 'REPAIR_NO_INCOMPLETE_TRIAL');
    for (const foreign of [{ ...lock, invocationId: '4'.repeat(32) }, { ...lock, targetSequence: 11 }, { ...lock, operation: 'certificate-rotation' }])
        assert.equal(repair.quiesceIncomplete({ ...effects, readLock: () => foreign }, invocation).status, 'REPAIR_OTHER_MAINTENANCE');
    const journal = { ...lock, operationId: crypto.randomUUID(), previousReleaseId: base.releaseId, targetReleaseId: ID, phase: 'TRIAL' };
    assert.equal(repair.quiesceIncomplete({ ...effects, readLock: () => repair.MALFORMED_PROTECTED_LOCK, readJournal: () => journal }, invocation).status, 'REPAIR_INCOMPLETE_TRIAL_STOPPED');
    assert.throws(() => repair.quiesceIncomplete({ ...effects, readLock: () => repair.MALFORMED_PROTECTED_LOCK, readJournal: () => ({ ...journal, invocationId: '4'.repeat(32) }) }, invocation), expect('REPAIR_QUIESCE_LOCK'));
    assert.equal(stops, 2);
    assert.throws(() => repair.quiesceIncomplete({ ...effects, block() { throw Error('permit'); } }, invocation), expect('REPAIR_QUIESCE_PERMIT_FAILED'));
    assert.equal(stops, 3);
});
test('failure serializer exposes only fixed codes, stages and reasons', () => {
    const out = repair.failureOutput({ code: 'PRIVATE_secret', failureStage: 'PRIVATE_path', failureCode: 'PRIVATE_token', failureReason: 'PRIVATE_url' });
    assert.equal(out.code, 'REPAIR_FAILED'); assert.equal(out.failureStage, 'PREFLIGHT'); assert.equal(out.failureCode, 'REPAIR_FAILED'); assert.equal(out.failureReason, null);
    assert.doesNotMatch(JSON.stringify(out), /PRIVATE/);
});

test('real candidate signature and payload tampering are refused before any service effect', async t => {
    const { createBundle } = require('../../runtime/release/bundle.cjs');
    for (const kind of ['signature', 'payload']) {
        const f = fixture(t), source = f.at('/signed-source'); fs.mkdirSync(source);
        fs.writeFileSync(path.join(source, 'fixture.txt'), 'non-secret signed fixture');
        const pair = crypto.generateKeyPairSync('ed25519');
        const publicKey = pair.publicKey.export({ format: 'pem', type: 'spki' });
        f.options.expectedKeySha256 = sha256(publicKey); fs.writeFileSync(f.options.publicKeyFile, publicKey);
        f.options.bundleDirectory = f.at('/signed-bundle');
        createBundle({ sourceDirectory: source, bundleDirectory: f.options.bundleDirectory,
            metadata: { schemaVersion: 1, product: 'nexowatt-eos', releaseVersion: '0.2.0-test.3', sequence: 13,
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

test('second guard durability failure reconstructs activation gate first and stops our trial', async t => {
    const f = fixture(t), unlink = fs.unlinkSync, fsync = fs.fsyncSync, open = fs.openSync;
    let guardUnlinked = false, fsyncInjected = false;
    fs.unlinkSync = file => { const result = unlink(file); if (file === f.at(guardFile)) guardUnlinked = true; return result; };
    fs.fsyncSync = fd => { if (guardUnlinked && !fsyncInjected) { fsyncInjected = true; throw Error('guard directory fsync'); } return fsync(fd); };
    fs.openSync = (file, ...args) => { if (guardUnlinked && file === f.at(guardFile)) throw Error('guard unavailable'); return open(file, ...args); };
    try {
        await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_RECOVERY_REQUIRED'));
        assert.equal(fsyncInjected, true); assert.equal(f.locked(), true); assert.equal(f.active(), 'inactive');
        assert.equal(f.current(), '/opt/nexowatt/eos/releases/' + ID, 'no fallback claimed without own recovery guard');
    } finally { fs.unlinkSync = unlink; fs.fsyncSync = fsync; fs.openSync = open; }
});

test('protected configuration drift before stop aborts without overwriting or stopping healthy R9', async t => {
    const f = fixture(t), file = f.at('/etc/nexowatt-eos/license-device.json');
    f.dependencies.nativeProbe = () => { fs.writeFileSync(file, 'foreign'); return { passed: true }; };
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_PRESERVED_CONFIG_CHANGED'));
    assert.equal(fs.readFileSync(file, 'utf8'), 'foreign'); assert.equal(f.active(), 'active');
    assert.equal(f.current(), oldTarget); assert.equal(f.locked(), false);
});

test('historical R8 completion requires matching successful protected R9 provenance', async t => {
    const valid = provenance(); assert.equal(repair.validateProvenance(valid), true);
    for (const mutation of [row => row.phase = 'RESTORED_ACTIVE', row => row.previousReleaseId = ID,
        row => row.targetReleaseId = ID, row => row.targetSequence = 13, row => row.operation = 'other',
        row => row.failureCode = 'FAILED', row => row.productionReleaseApproved = true,
        row => row.physicalControlEnabled = true, row => row.at = 'yesterday', row => row.extra = true]) {
        const record = structuredClone(valid); mutation(record);
        assert.throws(() => repair.validateProvenance(record), expect('REPAIR_R9_PROVENANCE_REQUIRED'));
        const f = fixture(t); fs.writeFileSync(f.at('/etc/nexowatt-eos/test-update-r9-status.json'), JSON.stringify(record));
        await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_R9_PROVENANCE_REQUIRED'));
        assert.deepEqual(f.events, []); assert.equal(f.active(), 'active');
    }
    const f = fixture(t), file = f.at('/etc/nexowatt-eos/first-start-complete.json');
    fs.writeFileSync(file, JSON.stringify({ ...JSON.parse(fs.readFileSync(file)), releaseId: base.releaseId }));
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_COMPLETED_FIRST_START_REQUIRED'));
});
test('exact six-adapter profile/upload bytes, versions and bounded review delta are required', () => {
    for (const mutate of [x => x.next.manifest.files.find(row => row.path === repair.PROFILE_PATH).mode = 0o666,
        x => x.next.manifest.files.find(row => row.path === repair.UPLOAD_PATH).sha256 = 'a'.repeat(64),
        x => x.next.manifest.files.find(row => row.path === repair.UPLOAD_TEMPLATE_PATH).size++,
        x => x.next.catalog.entries[3].version = '0.5.170', x => x.next.catalog.entries[3].required = false,
        x => x.next.catalog.entries[3].review.evidenceId = 'invented', x => x.next.catalog.entries[3].permissions.shellExec = true,
        x => x.next.catalog.catalogRevision = 10, x => x.old.catalog.catalogRevision = 7,
        x => x.next.catalog.entries.push(structuredClone(x.next.catalog.entries[3]))]) {
        const desc = descriptors(); mutate(desc);
        assert.throws(() => repair.validateTransition(desc.old, desc.next, { expectedReleaseId: ID }));
    }
});
test('Admin/UI complete file prefixes including nested dependencies and modes remain byte-identical to R9', () => {
    for (const prefix of ['app/node_modules/iobroker.eos-admin/', 'app/node_modules/iobroker.nexowatt-ui/']) {
        for (const relative of ['admin/index.html', 'node_modules/dependency/index.js']) {
            for (const scenario of ['add', 'remove', 'bytes', 'mode']) {
                const desc = descriptors(), row = { path: prefix + relative, size: 4, mode: 0o644, sha256: sha256('same') };
                if (scenario !== 'add') desc.old.manifest.files.push(row);
                if (scenario !== 'remove') desc.next.manifest.files.push({ ...row,
                    ...(scenario === 'bytes' ? { sha256: sha256('next') } : {}), ...(scenario === 'mode' ? { mode: 0o600 } : {}) });
                assert.throws(() => repair.validateTransition(desc.old, desc.next, { expectedReleaseId: ID }), expect('REPAIR_ADMISSION_CHANGE'));
            }
        }
    }
    const desc = descriptors(), row = { path: 'app/node_modules/iobroker.eos-admin/admin/index.html', size: 4, mode: 0o644, sha256: sha256('same') };
    desc.old.manifest.files.push(row); desc.next.manifest.files.push(structuredClone(row));
    assert.equal(repair.validateTransition(desc.old, desc.next, { expectedReleaseId: ID }), true);
});
test('upload unit and any existing plan block before staging instead of being overwritten', async t => {
    for (const scenario of ['active-upload', 'existing-plan', 'dangling-plan']) {
        const f = fixture(t), plan = f.at('/etc/nexowatt-eos/test-own-adapters-plan.json');
        if (scenario === 'active-upload') {
            const exec = f.dependencies.exec;
            f.dependencies.exec = (file, args) => args[0] === 'show' && args[1] === 'nexowatt-eos-upload.service' ?
                { status: 0, stdout: 'activating' } : exec(file, args);
        } else if (scenario === 'dangling-plan') fs.symlinkSync('/nonexistent-protected-plan', plan);
        else fs.writeFileSync(plan, 'retained-evidence', { mode: 0o600 });
        await assert.rejects(repair.update(f.options, f.dependencies), expect(scenario === 'active-upload' ? 'REPAIR_UPLOAD_BUSY' : 'REPAIR_ENROLLMENT_PLAN'));
        assert.ok(!f.events.includes('stage')); assert.equal(f.locked(), false); assert.equal(f.active(), 'active');
        if (scenario === 'existing-plan') assert.equal(fs.readFileSync(plan, 'utf8'), 'retained-evidence');
        if (scenario === 'dangling-plan') assert.equal(fs.readlinkSync(plan), '/nonexistent-protected-plan');
    }
});
test('private complete enrollment plan is durable and exact before any DB mutation', async t => {
    const f = fixture(t); let mutated = false;
    const apply = f.dependencies.ownEnrollment.applyMigration;
    f.dependencies.ownEnrollment.applyMigration = async input => {
        const file = f.at('/etc/nexowatt-eos/test-own-adapters-plan.json'), stat = fs.lstatSync(file), record = JSON.parse(fs.readFileSync(file));
        assert.equal(stat.mode & 0o777, 0o600); assert.equal(stat.nlink, 1); assert.equal(stat.isSymbolicLink(), false);
        assert.equal(record.sourceReleaseId, base.releaseId); assert.equal(record.targetReleaseId, ID);
        assert.deepEqual(record.enrollment, input.plan); assert.equal(record.operationId.replace(/-/g, ''), input.plan.operationId);
        const previousUnit = fs.readFileSync(f.at('/etc/systemd/system/nexowatt-eos-upload.service'));
        assert.deepEqual(Buffer.from(record.previousUploadUnitBase64, 'base64'), previousUnit);
        assert.equal(record.previousUploadUnitSha256, sha256(previousUnit));
        assert.equal(record.targetUploadUnitSha256, repair.expectedUploadRow().sha256);
        assert.equal(f.current(), oldTarget); assert.equal(f.active(), 'inactive'); assert.equal(f.locked(), true);
        await apply(input); mutated = true;
    };
    await repair.update(f.options, f.dependencies);
    assert.equal(mutated, true); assert.equal(f.journal().enrollmentPlanSha256, sha256(fs.readFileSync(f.at('/etc/nexowatt-eos/test-own-adapters-plan.json'))));
    assert.ok(f.events.indexOf('apply') < f.events.indexOf('start nexowatt-eos-upload.service'));
    assert.ok(f.events.indexOf('start nexowatt-eos-upload.service') < f.events.indexOf('start ' + controller));
});
test('failed private plan persistence performs no DB writes', async t => {
    const f = fixture(t); f.dependencies.privateWrite = () => { throw Error('disk-full'); };
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_TRIAL_FAILED_RESTORED_ACTIVE'));
    assert.ok(!f.events.includes('apply')); assert.ok(!f.events.includes('rollback-enrollment'));
    assert.equal(f.current(), oldTarget); assert.equal(f.active(), 'active'); assert.equal(f.locked(), false);
});
test('partial enrollment failure rolls back before restoring the source release', async t => {
    const f = fixture(t), originalUnit = fs.readFileSync(f.at('/etc/systemd/system/nexowatt-eos-upload.service'));
    f.dependencies.ownEnrollment.applyMigration = async input => { await input.checkpoint(input.plan); f.events.push('partial-db-write'); throw Error('write-failed'); };
    f.dependencies.ownEnrollment.rollbackMigration = async () => {
        assert.equal(f.active(), 'inactive'); assert.equal(f.locked(), true);
        assert.equal(f.current(), oldTarget); f.events.push('rollback-enrollment');
    };
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_TRIAL_FAILED_RESTORED_ACTIVE'));
    assert.ok(f.events.indexOf('partial-db-write') < f.events.indexOf('rollback-enrollment'));
    assert.ok(f.events.indexOf('rollback-enrollment') < f.events.indexOf('start ' + controller));
    assert.deepEqual(fs.readFileSync(f.at('/etc/systemd/system/nexowatt-eos-upload.service')), originalUnit);
});
test('changed enrollment or failed rollback retains current trial stopped and gated', async t => {
    const f = fixture(t);
    f.dependencies.ownReadiness = async () => { throw Error('failed-new-runtime'); };
    f.dependencies.ownEnrollment.rollbackMigration = async () => { throw Object.assign(Error('private'), { code: 'OWN_ENROLLMENT_INSTANCE_CHANGED' }); };
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_RECOVERY_REQUIRED'));
    assertStopped(f); assert.equal(f.current(), '/opt/nexowatt/eos/releases/' + ID);
    assert.equal(f.events.filter(event => event === 'start ' + controller).length, 1);
});
test('plan replacement, unsafe mode and symlink cannot authorize rollback or delete foreign bytes', async t => {
    for (const scenario of ['changed', 'mode', 'symlink']) {
        const f = fixture(t), file = f.at('/etc/nexowatt-eos/test-own-adapters-plan.json');
        f.dependencies.ownReadiness = async () => {
            if (scenario === 'changed') fs.writeFileSync(file, 'foreign');
            if (scenario === 'mode') fs.chmodSync(file, 0o644);
            if (scenario === 'symlink') { fs.renameSync(file, file + '.retained'); fs.symlinkSync(file + '.retained', file); }
        };
        await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_RECOVERY_REQUIRED'));
        assertStopped(f); assert.ok(!f.events.includes('rollback-enrollment'));
        if (scenario === 'changed') assert.equal(fs.readFileSync(file, 'utf8'), 'foreign');
        if (scenario === 'mode') assert.equal(fs.statSync(file).mode & 0o777, 0o644);
        if (scenario === 'symlink') assert.equal(fs.lstatSync(file).isSymbolicLink(), true);
    }
});
test('asset-upload failure stops the upload service and restores exact old unit before R9 restart', async t => {
    const f = fixture(t), exec = f.dependencies.exec, file = f.at('/etc/systemd/system/nexowatt-eos-upload.service');
    const originalUnit = fs.readFileSync(file); let fault = false;
    f.dependencies.exec = (tool, args) => {
        if (args[0] === 'start' && args[1] === 'nexowatt-eos-upload.service' && !fault) {
            fault = true; assert.equal(sha256(fs.readFileSync(file)), repair.expectedUploadRow().sha256);
            return { status: 1, stdout: '' };
        }
        if (args[0] === 'start' && args[1] === controller) assert.deepEqual(fs.readFileSync(file), originalUnit);
        return exec(tool, args);
    };
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_TRIAL_FAILED_RESTORED_ACTIVE'));
    assert.ok(f.events.includes('stop nexowatt-eos-controller.service nexowatt-eos-upload.service'));
    assert.ok(f.events.includes('rollback-enrollment')); assert.deepEqual(fs.readFileSync(file), originalUnit);
    assert.equal(f.current(), oldTarget); assert.equal(f.locked(), false);
});
test('upload unit drift on trial is never overwritten by rollback', async t => {
    const f = fixture(t), file = f.at('/etc/systemd/system/nexowatt-eos-upload.service');
    f.dependencies.ownReadiness = async () => fs.writeFileSync(file, 'foreign-unit');
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_RECOVERY_REQUIRED'));
    assertStopped(f); assert.equal(fs.readFileSync(file, 'utf8'), 'foreign-unit');
});
test('unit write before/after rename and daemon-reload faults restore exact old unit before R9 restart', async t => {
    for (const scenario of ['before-write', 'after-write', 'daemon-reload']) {
        const f = fixture(t), file = f.at('/etc/systemd/system/nexowatt-eos-upload.service');
        const originalUnit = fs.readFileSync(file), exec = f.dependencies.exec;
        let injected = false;
        f.dependencies.atomicWrite = (target, bytes) => {
            if (target === file && sha256(bytes) === repair.expectedUploadRow().sha256 && !injected && scenario !== 'daemon-reload') {
                injected = true;
                if (scenario === 'after-write') atomicWrite(target, bytes);
                throw Error('unit-write-failure');
            }
            atomicWrite(target, bytes);
        };
        f.dependencies.exec = (tool, args) => {
            if (scenario === 'daemon-reload' && args[0] === 'daemon-reload' && !injected) {
                injected = true; assert.equal(sha256(fs.readFileSync(file)), repair.expectedUploadRow().sha256);
                return { status: 1, stdout: '' };
            }
            if (args[0] === 'start' && args[1] === controller) {
                assert.deepEqual(fs.readFileSync(file), originalUnit);
                assert.ok(f.events.includes('rollback-enrollment'));
            }
            return exec(tool, args);
        };
        await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_TRIAL_FAILED_RESTORED_ACTIVE'));
        assert.equal(injected, true); assert.equal(f.current(), oldTarget); assert.equal(f.active(), 'active');
        assert.equal(f.locked(), false); assert.deepEqual(fs.readFileSync(file), originalUnit);
        assert.ok(f.events.indexOf('rollback-enrollment') < f.events.indexOf('start ' + controller));
        assert.equal(f.journal().phase, 'RESTORED_ACTIVE');
    }
});
test('runtime processes outside the controller service prevent enrollment mutation', async t => {
    const f = fixture(t); f.dependencies.assertRuntimeStopped = () => { throw Object.assign(Error('private-process'), { code: 'REPAIR_RUNTIME_PROCESSES' }); };
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_RECOVERY_REQUIRED'));
    assertStopped(f); assert.ok(!f.events.includes('plan')); assert.ok(!f.events.includes('apply'));
});
test('actual stopped-runtime scanner rejects any runtime UID slot and unavailable/oversized status', t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-own-proc-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const proc = path.join(root, 'proc'), passwd = path.join(root, 'passwd');
    fs.mkdirSync(proc); fs.writeFileSync(passwd, 'eos-runtime:x:970:970::/var/lib/nexowatt-eos/home:/usr/sbin/nologin\n');
    const options = { proc, passwd, owner() {}, exec: () => ({ status: 0, stdout: 'inactive' }) };
    assert.doesNotThrow(() => repair.assertRuntimeStopped(options));
    fs.mkdirSync(path.join(proc, '123')); const status = path.join(proc, '123/status');
    fs.writeFileSync(status, 'Name:\tfixture\nUid:\t0\t0\t0\t0\n');
    assert.doesNotThrow(() => repair.assertRuntimeStopped(options));
    for (const index of [0, 1, 2, 3]) {
        const ids = [0, 0, 0, 0]; ids[index] = 970; fs.writeFileSync(status, 'Uid:\t' + ids.join('\t') + '\n');
        assert.throws(() => repair.assertRuntimeStopped(options), expect('REPAIR_RUNTIME_PROCESSES'));
    }
    for (const text of ['Uid: malformed\n', 'x'.repeat(65537)]) {
        fs.writeFileSync(status, text); assert.throws(() => repair.assertRuntimeStopped(options), expect('REPAIR_RUNTIME_PROCESSES'));
    }
    assert.throws(() => repair.assertRuntimeStopped({ ...options, exec: () => ({ status: 0, stdout: 'active' }) }), expect('REPAIR_RUNTIME_PROCESSES'));
});
test('fresh passive adapter statuses must match both licensed or both unlicensed energy paths', () => {
    const start = 100000, now = 105000;
    const states = values => values.map(val => ({ val, ack: true, ts: 102000 }));
    assert.deepEqual(repair.PASSIVE_HEALTH_KEYS, ['eebus.0.info.commissioningState', 'ocpp21.0.info.runtimeState', 'nexowatt-backup.0.info.runtimeState']);
    assert.equal(repair.passiveHealthReady(states(['waiting', 'awaiting_transport_enrollment', 'ready']), start, now), true);
    assert.equal(repair.passiveHealthReady(states(['waiting', 'awaiting_license', 'waiting_license']), start, now), true);
    for (const values of [
        ['error', 'awaiting_transport_enrollment', 'ready'], ['starting', 'awaiting_transport_enrollment', 'ready'],
        ['ready', 'awaiting_transport_enrollment', 'ready'], ['waiting', 'listening', 'ready'],
        ['waiting', 'configuration_rejected', 'ready'], ['waiting', 'awaiting_transport_enrollment', 'waiting_license'],
        ['waiting', 'awaiting_license', 'ready'], ['waiting', 'awaiting_transport_enrollment', 'error'],
        ['waiting', 'awaiting_transport_enrollment', 'starting'], ['waiting', 'awaiting_transport_enrollment', 'stopped'],
    ]) assert.equal(repair.passiveHealthReady(states(values), start, now), false, values.join('/'));
    for (const index of [0, 1, 2]) for (const mutation of [row => row.ts = start - 1, row => row.ts = now + 1001,
        row => row.ts = NaN, row => row.ack = false]) {
        const rows = states(['waiting', 'awaiting_transport_enrollment', 'ready']); mutation(rows[index]);
        assert.equal(repair.passiveHealthReady(rows, start, now), false);
    }
    for (const input of [null, [], states(['waiting', 'awaiting_license'])])
        assert.equal(repair.passiveHealthReady(input, start, now), false);
    assert.equal(repair.passiveHealthReady(states(['waiting', 'awaiting_license', 'waiting_license']), now + 1, now), false);
});
