'use strict';
const nodeTest = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const repair = require('../../tools/system/update-managed-release.cjs');
const { sha256 } = require('../../runtime/release/bundle.cjs');
const { atomicWrite } = require('../../tools/system/activate-release.cjs');
const ID = 'a'.repeat(64);
// Real temporary files, fsync, atomic state writes and symlink switching run below.
// Services, baseline inventory verification and native probing are explicit doubles.
const pair = crypto.generateKeyPairSync('ed25519');
const publicKey = pair.publicKey.export({ format: 'pem', type: 'spki' });
const base = { releaseId: 'b'.repeat(64), sequence: 15, nodeVersion: '24.22.1', profile: 'test', publicKeySha256: sha256(publicKey) };
const test = nodeTest;
function descriptors() {
    const manifest = sequence => ({ product: 'nexowatt-eos', sequence, profile: 'test', releaseVersion: '0.2.0-test.3', nodeVersion: '24.22.1',
        platforms: ['linux-arm64'], files: [{ path: 'runtime/postgresql/schema.sql', size: 4, sha256: sha256('sql\n'), mode: 0o644 },
            { path: 'system/postgresql-test/systemd/nexowatt-eos-controller.service', size: 5, sha256: sha256('unit\n'), mode: 0o644 },
            ...['node-runtime/bin/node', 'node-runtime/runtime.json', 'node-runtime/LICENSE'].map(name => ({path:name,size:4,sha256:sha256(name),mode:name.endsWith('/node') ? 0o755 : 0o644})),
            { path: 'app/node_modules/iobroker.js-controller/eos-test-profile.json', size: 3, sha256: sha256('{}\n'), mode: 0o644 }] });
    const product = require('../../runtime/product/scope.cjs');
    const catalog = { catalogRevision: 9, entries: product.specsFor(product.SECURITY_REFRESH_TEST).map(spec => ({ id: spec.id, package: spec.package,
        version: spec.version, sha256: '1'.repeat(64), kind: spec.kind, required: true,
        review: { status: 'approved-test' }, permissions: { shellExec: false } })) };
    return { old: { releaseId: base.releaseId, manifest: manifest(base.sequence), catalog },
        next: { releaseId: ID, manifest: manifest(16), catalog: structuredClone(catalog) } };
}
function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-r11-update-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const at = name => path.join(root, name);
    for (const dir of ['/etc/nexowatt-eos/web', '/etc/systemd/system', '/opt/nexowatt/eos/releases/' + base.releaseId,
        '/opt/nexowatt/eos/verified', '/var/lib/nexowatt-eos', '/import/bundle/payload']) fs.mkdirSync(at(dir), { recursive: true });
    const state = Buffer.from(JSON.stringify({ schemaVersion: 1, ...base }) + '\n');
    fs.writeFileSync(at('/etc/nexowatt-eos/release-state.json'), state);
    for (const name of repair.PRESERVED) fs.writeFileSync(at('/etc/nexowatt-eos/' + name), 'preserved-' + name);
    fs.writeFileSync(at('/etc/nexowatt-eos/first-start-complete.json'), JSON.stringify({ schemaVersion: 1,
        releaseId: base.releaseId, setupId: 'f'.repeat(32), completedAt: '2026-10-03T12:00:00.000Z',
        licenseConfigured: false, physicalControlEnabled: false }));
    fs.writeFileSync(at('/etc/nexowatt-eos/test-own-adapters-status.json'), JSON.stringify({
        schemaVersion: 1, operation: 'test-release-repair', operationId: crypto.randomUUID(), invocationId: '4'.repeat(32),
        phase: 'ACTIVE', failureStage: null, failureCode: null, failureReason: null,
        previousReleaseId: require('../../tools/system/update-test-own-adapters.cjs').BASES[0].releaseId,
        targetSequence: 13, targetReleaseId: base.releaseId, at: '2026-10-15T12:00:00.000Z', previousControllerState: 'active',
        initialConfiguration: 'unconfigured-no-physical-targets', enrollmentPlanSha256: 'f'.repeat(64),
        physicalControlEnabled: false, productionReleaseApproved: false }));
    fs.mkdirSync(at('/opt/nexowatt/eos/releases/' + base.releaseId), { recursive: true });
    fs.writeFileSync(at('/var/lib/nexowatt-eos/.initialized'), 'installed');
    fs.writeFileSync(at('/etc/systemd/system/nexowatt-eos-controller.service'), 'unit\n');
    fs.symlinkSync('/opt/nexowatt/eos/releases/' + base.releaseId, at('/opt/nexowatt/eos/current'));
    fs.writeFileSync(at('/etc/nexowatt-eos/update-trust.pem'), publicKey);
    fs.writeFileSync(at('/import/release-public.pem'), publicKey);
    fs.writeFileSync(at('/import/bundle/manifest.json'), '{}\n');
    fs.writeFileSync(at('/import/bundle/manifest.sig'), Buffer.alloc(64));
    const options = { bundleDirectory: at('/import/bundle'), publicKeyFile: at('/import/release-public.pem'),
        expectedReleaseId: ID, expectedKeySha256: sha256(publicKey) };
    const desc = descriptors(); desc.next.payloadPath = at('/import/bundle/payload');
    const events = []; let active = 'active';
    const dependencies = { root, uid: 0, ownerUid: process.getuid(), invocationId: '3'.repeat(32), nodeVersion: '24.22.1', platform: 'linux-arm64',
        acquireMaintenanceLease: async () => ({assert() {}, release() {}}), validateRuntime: () => ({}),
        assertRuntimeStopped: () => { events.push('assert-stopped'); assert.equal(active, 'inactive'); },
        networkInstaller: (op) => { events.push('network:' + op); return {ok:true}; },
        ownerCheck: () => {}, toolTrust: () => ({ trusted: true }), trustedImport: () => {},
        inspectInstalled: (release, key) => {
            const id = path.basename(release), expected = [base].find(row => row.releaseId === id);
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
        current: () => fs.readlinkSync(at('/opt/nexowatt/eos/current')), journal: () => JSON.parse(fs.readFileSync(at('/etc/nexowatt-eos/managed-update-status.json'))),
        locked: () => fs.existsSync(at('/etc/nexowatt-eos/.activation.lock')) };
}
const expect = code => error => error.code === code;
const oldTarget = '/opt/nexowatt/eos/releases/' + base.releaseId;
const controller = 'nexowatt-eos-controller.service';
const stateFile = '/etc/nexowatt-eos/release-state.json';
const lockFile = '/etc/nexowatt-eos/.activation.lock';
const guardFile = '/etc/nexowatt-eos/.managed-update.guard';
function assertStopped(f) {
    assert.equal(f.active(), 'inactive'); assert.equal(f.locked(), true);
    assert.equal(fs.existsSync(f.at('/etc/nexowatt-eos/maintenance-start.json')), false);
}
test('CLI requires explicit new trust, absolute paths and supervised invocation', async t => {
    assert.throws(() => repair.parseArgs([]), expect('REPAIR_USAGE'));
    for (const changes of [{ expectedReleaseId: 'invalid' }, { expectedKeySha256: 'invalid' }, { bundleDirectory: 'relative' }]) {
        assert.throws(() => repair.validatePins({ expectedReleaseId: ID, expectedKeySha256: 'd'.repeat(64), bundleDirectory: '/b', publicKeyFile: '/k', ...changes }));
    }
    const f = fixture(t); f.dependencies.invocationId = 'invalid';
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_SYSTEMD_INVOCATION_REQUIRED'));
    assert.deepEqual(f.events, []); assert.equal(f.locked(), false);
});
test('only exact healthy managed state and fresh completion are accepted', async t => {
    for (const changes of [{ sequence: 10 }, { releaseId: 'bad' }, { publicKeySha256: 'bad' },
        { profile: 'production' }, { nodeVersion: '24.19.0' }, { extra: 1 }]) {
        assert.throws(() => repair.validateState({ schemaVersion: 1, ...base, ...changes }), expect('REPAIR_MANAGED_BASELINE_REQUIRED'));
    }
    for (const changes of [{ releaseId: 'bad' }, { physicalControlEnabled: true }, { completedAt: 'yesterday' }, { extra: 1 }]) {
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
test('transition allows Admin own-package digests but refuses sequence, system/schema and admission changes', () => {
    const d = descriptors(); d.next.catalog.entries[1].sha256 = 'e'.repeat(64);
    assert.equal(repair.validateTransition(d.old, d.next, { expectedReleaseId: ID }), true);
    for (const mutate of [x => x.next.manifest.sequence = 11, x => x.next.manifest.sequence = 13,
        x => x.next.manifest.profile = 'production', x => x.next.manifest.platforms = ['linux-x64'],
        x => x.next.manifest.nodeVersion = '24.19.0', x => x.next.manifest.releaseVersion = '0.2.0-test.4',
        x => x.next.manifest.files.find(r => r.path === 'runtime/postgresql/schema.sql').sha256 = 'f'.repeat(64), x => x.next.manifest.files.find(r => r.path.includes('eos-test-profile.json')).sha256 = 'f'.repeat(64), x => x.next.manifest.files.pop(),
        x => x.next.manifest.files.push({ path: 'system/new.service', size: 1, mode: 0o644, sha256: 'f'.repeat(64) }),
        x => x.next.catalog.entries[1].review.status = 'pending', x => x.next.catalog.entries[1].permissions.shellExec = true,
        x => x.next.catalog.entries.pop()]) {
        const x = descriptors(); mutate(x); assert.throws(() => repair.validateTransition(x.old, x.next, { expectedReleaseId: ID }));
    }
});
test('managed transition pins controller 7.2.5 and rejects historical or major-8 catalogues', () => {
    for (const version of ['7.2.2', '8.0.0', '8.0.0-alpha.8']) {
        for (const side of ['old', 'next']) {
            const d = descriptors();
            d[side].catalog.entries.find(row => row.id === 'js-controller').version = version;
            assert.throws(() => repair.validateTransition(d.old, d.next, { expectedReleaseId: ID }), /PRODUCT_CATALOG_SCOPE/);
        }
    }
});
test('automatic Node transaction keeps application/catalogue exact and performs no asset database upload', async t => {
    const f = fixture(t); f.options.automaticNodeUpdate = true;
    f.dependencies.now = () => Date.parse('2026-10-22T00:40:00.000Z');
    f.desc.next.manifest.nodeVersion = '24.22.2';
    for (const row of f.desc.next.manifest.files.filter(r => r.path.startsWith('node-runtime/'))) row.sha256 = 'd'.repeat(64);
    const result = await repair.update(f.options, f.dependencies);
    assert.equal(result.nodeVersion, '24.22.2'); assert.equal(f.journal().automaticNodeUpdate, true);
    assert.equal(f.events.includes('start nexowatt-eos-upload.service'), false);
    assert.equal(f.current(), '/opt/nexowatt/eos/releases/' + ID); assert.equal(f.active(), 'active');
});
test('automatic Node denies same-version, app/catalogue changes and closed window before stage or stop', async t => {
    for (const change of ['same-node', 'own-app', 'catalog', 'daytime', 'physical-control']) {
        const f = fixture(t); f.options.automaticNodeUpdate = true;
        f.dependencies.now = () => Date.parse('2026-10-22T00:40:00.000Z');
        if (change !== 'same-node') f.desc.next.manifest.nodeVersion = '24.22.2';
        if (change === 'own-app') {
            const row = { path: 'app/node_modules/iobroker.eos-admin/lib/fixture.js', size: 1, mode: 0o644, sha256: 'a'.repeat(64) };
            f.desc.old.manifest.files.push(row); f.desc.next.manifest.files.push({ ...row, sha256: 'd'.repeat(64) });
        }
        if (change === 'catalog') f.desc.next.catalog.entries[1].sha256 = 'e'.repeat(64);
        if (change === 'daytime') f.dependencies.now = () => Date.parse('2026-10-22T12:00:00.000Z');
        if (change === 'physical-control') {
            const file = f.at('/etc/nexowatt-eos/first-start-complete.json');
            fs.writeFileSync(file, JSON.stringify({ ...JSON.parse(fs.readFileSync(file)), physicalControlEnabled: true }));
        }
        await assert.rejects(repair.update(f.options, f.dependencies), /UPDATE_AUTOMATIC_(?:NODE_REQUIRED|PAYLOAD|WINDOW)|REPAIR_COMPLETED_FIRST_START_REQUIRED/);
        assert.equal(f.events.includes('stage'), false); assert.equal(f.active(), 'active'); assert.equal(f.locked(), false);
    }
});
test('automatic Node respects window again after candidate probe and rolls runtime back on failed startup', async t => {
    for (const expired of [false, true]) {
        const f = fixture(t); f.options.automaticNodeUpdate = true;
        let clock = Date.parse('2026-10-22T00:40:00.000Z'); f.dependencies.now = () => clock;
        f.desc.next.manifest.nodeVersion = '24.22.2';
        f.dependencies.nativeProbe = () => { if (expired) clock = Date.parse('2026-10-22T01:00:00.000Z'); return { passed: true }; };
        if (!expired) f.dependencies.readiness = async payload => { if (path.basename(payload) === ID) throw Object.assign(Error('trial'), { code: 'ONBOARD_HTTPS_NOT_READY' }); };
        await assert.rejects(repair.update(f.options, f.dependencies), expired ? /UPDATE_AUTOMATIC_WINDOW/ : /REPAIR_TRIAL_FAILED_RESTORED_ACTIVE/);
        assert.equal(f.current(), oldTarget); assert.deepEqual(fs.readFileSync(f.at(stateFile)), f.state);
        assert.equal(f.active(), 'active'); assert.equal(f.locked(), false);
        assert.equal(f.events.includes('start nexowatt-eos-upload.service'), false);
        if (expired) assert.equal(f.events.some(e => e.startsWith('stop ')), false);
    }
});
test('successful managed update installs state before trial start and preserves fresh completion/configuration', async t => {
    const f = fixture(t), before = repair.PRESERVED.map(name => fs.readFileSync(f.at('/etc/nexowatt-eos/' + name)));
    const result = await repair.update(f.options, f.dependencies);
    assert.equal(result.sequence, 16); assert.equal(result.phase, 'MANAGED_TEST_ACTIVE');
    assert.equal(result.physicalControlEnabled, false); assert.equal(result.productionReleaseApproved, false);
    assert.equal(f.current(), '/opt/nexowatt/eos/releases/' + ID); assert.equal(f.active(), 'active');
    assert.equal(f.locked(), false); assert.equal(fs.existsSync(f.at(guardFile)), false); assert.equal(f.journal().phase, 'ACTIVE');
    for (const [i, name] of repair.PRESERVED.entries()) assert.deepEqual(fs.readFileSync(f.at('/etc/nexowatt-eos/' + name)), before[i]);
    const current = JSON.parse(fs.readFileSync(f.at(stateFile)));
    assert.equal(current.releaseId, ID); assert.equal(current.sequence, 16); assert.equal(current.publicKeySha256, f.options.expectedKeySha256);
    assert.ok(f.events.indexOf('readiness:' + base.releaseId) < f.events.indexOf('stage'));
    assert.ok(f.events.indexOf('native') < f.events.indexOf('stop ' + controller + ' nexowatt-eos-upload.service'));
    assert.ok(f.events.indexOf('readiness:' + ID) < f.events.indexOf('revoke'));
    assert.ok(!f.events.some(row => /postgresql.*stop|daemon-reload|enable|initialize|setup/.test(row)));
});
test('Node upgrade switches signed runtime and EOS state as one pair and restores both after trial failure', async t => {
    for (const rollback of [false, true]) {
        const f = fixture(t); f.desc.next.manifest.nodeVersion = '24.23.0';
        for (const row of f.desc.next.manifest.files.filter(r => r.path.startsWith('node-runtime/'))) row.sha256 = 'd'.repeat(64);
        f.dependencies.nativeProbe = (payload, platform, exec, options) => {
            assert.equal(options.nodeExecutable, path.join(payload, 'node-runtime/bin/node'));
            assert.equal(options.nodeVersion, '24.23.0'); return { passed: true };
        };
        f.dependencies.readiness = async payload => {
            const current = JSON.parse(fs.readFileSync(f.at(stateFile)));
            assert.equal(path.basename(payload), current.releaseId);
            assert.equal(current.nodeVersion, current.releaseId === ID ? '24.23.0' : '24.22.1');
            if (rollback && current.releaseId === ID) throw Object.assign(Error('trial'), { code: 'ONBOARD_HTTPS_NOT_READY' });
        };
        if (rollback) {
            await assert.rejects(repair.update(f.options, f.dependencies), /REPAIR_TRIAL_FAILED_RESTORED_ACTIVE/);
            assert.equal(f.current(), oldTarget); assert.deepEqual(fs.readFileSync(f.at(stateFile)), f.state);
        } else {
            const result = await repair.update(f.options, f.dependencies);
            assert.equal(result.nodeVersion, '24.23.0'); assert.equal(result.previousNodeVersion, '24.22.1');
            assert.equal(JSON.parse(fs.readFileSync(f.at(stateFile))).nodeVersion, '24.23.0');
        }
        assert.equal(f.active(), 'active'); assert.equal(f.locked(), false);
    }
});
test('shared OS maintenance lease refusal prevents all transaction effects and runtime repacks/downgrades fail', async t => {
    const f = fixture(t); f.dependencies.acquireMaintenanceLease = async () => { throw Object.assign(Error('busy'), { code: 'REPAIR_MAINTENANCE_IN_PROGRESS' }); };
    await assert.rejects(repair.update(f.options, f.dependencies), /REPAIR_MAINTENANCE_IN_PROGRESS/);
    assert.deepEqual(f.events, []); assert.equal(f.locked(), false);
    const d = descriptors(); d.next.manifest.files.find(r => r.path === 'node-runtime/bin/node').sha256 = 'e'.repeat(64);
    assert.throws(() => repair.validateTransition(d.old, d.next, { expectedReleaseId: ID }), /UPDATE_RUNTIME_REPACK/);
    d.old.manifest.nodeVersion = '24.23.0';
    assert.throws(() => repair.validateTransition(d.old, d.next, { expectedReleaseId: ID }), /UPDATE_RUNTIME_DOWNGRADE/);
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
        if (kind === 'prepared') f.dependencies.atomicWrite = (file, bytes) => { if (file.endsWith('managed-update-status.json')) throw Error('report'); atomicWrite(file, bytes); };
        await assert.rejects(repair.update(f.options, f.dependencies));
        assert.equal(f.locked(), false); assert.equal(fs.existsSync(f.at(guardFile)), false);
        assert.equal(f.active(), 'active'); assert.equal(f.current(), oldTarget); assert.ok(!f.events.includes('stop ' + controller + ' nexowatt-eos-upload.service'));
    }
});
test('trial failure restarts only authenticated healthy managed baseline and unlocks after readiness', async t => {
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
test('fallback readiness failure leaves exact managed baseline stopped and locked', async t => {
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
            const hit = kind === 'state' && file.endsWith('/release-state.json') && JSON.parse(bytes).sequence === 16
                || kind === 'trial-report' && file.endsWith('managed-update-status.json') && JSON.parse(bytes).phase === 'TRIAL'
                || kind === 'active-report' && file.endsWith('managed-update-status.json') && JSON.parse(bytes).phase === 'ACTIVE';
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
    f.dependencies.atomicWrite = (file, bytes) => { if (file.endsWith('managed-update-status.json') && JSON.parse(bytes).phase === 'RESTORED_ACTIVE') throw Error('journal'); atomicWrite(file, bytes); };
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_TRIAL_FAILED_RESTORED_STOPPED'));
    assertStopped(f); assert.equal(f.current(), oldTarget);
});
test('ExecStopPost only quiesces same invocation seq16; malformed protected lock requires matching journal', () => {
    const invocation = '3'.repeat(32); let stops = 0;
    const lock = { operation: 'test-release-repair', invocationId: invocation, targetSequence: 16 };
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
        f.options.expectedKeySha256 = sha256(publicKey); fs.writeFileSync(f.options.publicKeyFile, publicKey);
        f.options.bundleDirectory = f.at('/signed-bundle');
        createBundle({ sourceDirectory: source, bundleDirectory: f.options.bundleDirectory,
            metadata: { schemaVersion: 1, product: 'nexowatt-eos', releaseVersion: '0.2.0-test.3', sequence: 16,
                profile: 'test', nodeVersion: '24.22.1', platforms: ['linux-arm64'] },
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

test('protected configuration drift before stop aborts without overwriting or stopping healthy managed baseline', async t => {
    const f = fixture(t), file = f.at('/etc/nexowatt-eos/license-device.json');
    f.dependencies.nativeProbe = () => { fs.writeFileSync(file, 'foreign'); return { passed: true }; };
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_PRESERVED_CONFIG_CHANGED'));
    assert.equal(fs.readFileSync(file, 'utf8'), 'foreign'); assert.equal(f.active(), 'active');
    assert.equal(f.current(), oldTarget); assert.equal(f.locked(), false);
});

test('failed new assets are followed by old signed asset readback before rollback restart', async t => {
    const f = fixture(t), exec = f.dependencies.exec; let uploads=0;
    f.dependencies.exec = (binary,args) => {
        if(args[0] === 'start' && args[1] === 'nexowatt-eos-upload.service') {
            f.events.push('asset-release:' + path.basename(f.current()));
            if(++uploads === 1) return {status:1,stdout:''};
        }
        return exec(binary,args);
    };
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_TRIAL_FAILED_RESTORED_ACTIVE'));
    assert.equal(uploads,2);
    assert.ok(f.events.indexOf('asset-release:' + ID) < f.events.indexOf('asset-release:' + base.releaseId));
    assert.ok(f.events.indexOf('asset-release:' + base.releaseId) < f.events.lastIndexOf('start ' + controller));
});
test('old asset restoration failure prevents a claimed working rollback', async t => {
    const f = fixture(t), exec = f.dependencies.exec;
    f.dependencies.exec = (binary,args) => args[0] === 'start' && args[1] === 'nexowatt-eos-upload.service' ? {status:1,stdout:''} : exec(binary,args);
    await assert.rejects(repair.update(f.options,f.dependencies), expect('REPAIR_RECOVERY_REQUIRED'));
    assertStopped(f); assert.equal(f.current(), oldTarget);
});
