'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const enrollment = require('../../runtime/bootstrap/enrollment.cjs');
const policy = require('../../runtime/bootstrap/accounts.cjs');
const hashed = `pbkdf2$600000$${'ab'.repeat(256)}$${'12'.repeat(16)}`;
const { settings, configuredSettings } = require('./fixtures.cjs');
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
let app;
before(() => {
    app = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-first-run-enroll-'));
    const controller = path.join(app, 'node_modules/iobroker.js-controller'); fs.mkdirSync(controller, { recursive: true });
    fs.writeFileSync(path.join(controller, 'eos-test-profile.json'), JSON.stringify({ schemaVersion: 1, kind: 'eos-controller-test-profile', controllerVersion: '7.2.2',
        adapters: enrollment.SPECS.map(s => ({ package: `iobroker.${s.name}`, version: s.version, main: s.main })) }));
    for (const spec of enrollment.SPECS) {
        const directory = path.join(app, 'node_modules', `iobroker.${spec.name}`); fs.mkdirSync(directory);
        fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ name: `iobroker.${spec.name}`, version: spec.version, main: spec.main }));
        fs.writeFileSync(path.join(directory, 'io-package.json'), JSON.stringify({ common: { name: spec.name, version: spec.version }, native: {} }));
    }
});
after(() => fs.rmSync(app, { recursive: true, force: true }));
function fixture() {
    const config = { system: { hostname: 'first-run-fixture' } };
    const docs = new Map([
        ['system.meta.eosTestBase', { native: { state: 'complete', profile: 'eos-core-only-bootstrap-v1', coreControllerVersion: '7.2.2', bootstrapPolicyVersion: 1, runtimeConfigSha256: digest(config) } }],
        ['system.config', { _id: 'system.config', common: { diag: 'none', activeRepo: [], adapterAutoUpgrade: { defaultPolicy: 'none', repositories: {} } } }],
        ['system.repositories', { native: { repositories: {}, oldRepositories: {} } }],
        ['system.group.administrator', { _id: 'system.group.administrator', type: 'group', common: { members: ['system.user.admin'] } }],
        ['system.user.admin', { _id: 'system.user.admin', type: 'user', common: { enabled: false, password: '' } }],
    ]);
    const context = { app, config, docs, passwordHash: hashed, settings, writes: 0, fresh: 0,
        states: { getState: async () => ({ val: false }) }, verifyFresh: async () => { context.fresh++; },
        objects: { getObjectAsync: async id => structuredClone(docs.get(id)),
            setObjectAsync: async (id, doc) => { assert.equal(typeof id, 'string'); context.writes++; docs.set(id, structuredClone(doc)); },
            getObjectViewAsync: async (_design, view) => ({ rows: [...docs.values()].filter(row => row.type === view).map(value => ({ value })) }) } };
    return context;
}
test('first account is fixed service role, frontend hash accepted, no default personal passwords or active physical devices', async () => {
    const c = fixture(); const result = await enrollment.enrollFirstRun(c);
    assert.equal(result.adaptersEnabled, 0); assert.equal(result.physicalControlEnabled, false);
    assert.equal(c.docs.get('system.user.admin').common.password, hashed);
    assert.deepEqual(c.docs.get(enrollment.MARKER).native.accounts, []);
    assert.equal(c.docs.get(enrollment.FIRST_START_MARKER).native.state, 'complete');
    assert.deepEqual(c.docs.get(enrollment.FIRST_START_MARKER).native.settings, settings);
    const writes = c.writes; await enrollment.enrollFirstRun(c); assert.equal(c.writes, writes);
    for (const role of Object.keys(policy.ROLES)) assert.deepEqual(c.docs.get(policy.ROLES[role]).common.members, []);
    assert.equal([...c.docs.values()].filter(doc => doc.type === 'user').length, 1);
});
test('configured handoff maps measured-plant inputs into disabled UI instance and retains private device plan', async () => {
    const c = fixture(); c.settings = configuredSettings; await enrollment.enrollFirstRun(c);
    const ui = c.docs.get('system.adapter.nexowatt-ui.0');
    assert.equal(ui.native.installerConfig.gridConnectionPower, configuredSettings.plant.gridConnectionPowerW);
    assert.equal(ui.native.peakShaving.l1CurrentId, configuredSettings.plant.measurements.phaseCurrents[0]);
    assert.equal(ui.common.enabled, false);
    const marker = c.docs.get(enrollment.FIRST_START_MARKER);
    assert.equal(marker.native.commissioning.plantConfigurationComplete, true);
    assert.equal(marker.native.commissioning.devicesConfigurationComplete, true);
    assert.equal(marker.native.commissioning.liveMeasurementsVerified, false);
    assert.equal(marker.native.commissioning.physicalControlEnabled, false);
    assert.deepEqual(marker.native.settings.devicePlan, configuredSettings.devicePlan);
    assert.deepEqual(marker.acl, policy.PRIVATE_ACL);
    assert.equal([...c.docs.values()].filter(doc => doc.type === 'instance').length, 2);
    marker.native.commissioning.physicalControlEnabled = true;
    await assert.rejects(enrollment.verify(c), /ENROLLMENT_FIRST_START/);
});
test('every partial object-store write keeps the start gate closed and refuses unsafe replay', async () => {
    const reference = fixture(); await enrollment.enrollFirstRun(reference);
    for (let failAt = 1; failAt <= reference.writes; failAt++) {
        const c = fixture(); const write = c.objects.setObjectAsync; let index = 0;
        c.objects.setObjectAsync = async (id, doc) => { if (++index === failAt) throw new Error('simulated DB interruption'); return write(id, doc); };
        await assert.rejects(enrollment.enrollFirstRun(c), /simulated DB interruption/);
        await assert.rejects(enrollment.verify(c));
        for (const doc of c.docs.values()) if (doc.type === 'instance') assert.equal(doc.common.enabled, false);
        if (c.docs.has(enrollment.MARKER)) await assert.rejects(enrollment.enrollFirstRun(c), /ENROLLMENT_ALREADY_ATTEMPTED/);
    }
});
test('configuration, running controller, unknown password hash and different replay handoff are rejected before mutation', async () => {
    for (const mutate of [c => c.passwordHash = 'plaintext', c => c.settings = { ...settings, role: 'admin' },
        c => c.states.getState = async () => ({ val: true })]) {
        const c = fixture(); mutate(c); await assert.rejects(enrollment.enrollFirstRun(c)); assert.equal(c.writes, 0);
    }
    const c = fixture(); await enrollment.enrollFirstRun(c); const writes = c.writes;
    await assert.rejects(enrollment.enrollFirstRun({ ...c, settings: { ...settings, siteName: 'Changed handoff' } }), /ENROLLMENT_ALREADY_ATTEMPTED/);
    assert.equal(c.writes, writes);
});
test('first-run marker and safety policy drift block subsequent enrollment verification', async () => {
    for (const mutate of [c => c.docs.get(enrollment.FIRST_START_MARKER).native.state = 'pending',
        c => c.docs.get(enrollment.FIRST_START_MARKER).native.physicalControlEnabled = true,
        c => c.docs.get(enrollment.FIRST_START_MARKER).native.settings.timeZone = 'Forged/Zone',
        c => c.docs.get('system.config').common.timeZone = 'Forged/Zone',
        c => c.docs.get(enrollment.MARKER).native.firstRunPolicyVersion = 2]) {
        const c = fixture(); await enrollment.enrollFirstRun(c); mutate(c); await assert.rejects(enrollment.verify(c));
    }
    const c = fixture(); await enrollment.enrollFirstRun(c);
    c.docs.get('system.config').common.siteName = 'Authorized later site';
    assert.equal((await enrollment.verify(c)).physicalControlEnabled, false);
});

test('minimal first start enrolls admin only and preserves host defaults without inventing plant settings', async () => {
    const c = fixture();
    c.settings = { schemaVersion: 3, licenseMode: 'verified', deviceMode: 'disabled-pending-acceptance',
        commissioning: { status: 'deferred', reason: 'customer-plant-not-connected' } };
    const common = c.docs.get('system.config').common;
    Object.assign(common, { language: 'de', timeZone: 'Europe/Berlin' });
    const before = structuredClone(common);
    const result = await enrollment.enrollFirstRun(c);
    assert.equal(result.physicalControlEnabled, false);
    assert.deepEqual(c.docs.get('system.config').common, { ...before, licenseConfirmed: true });
    assert.equal(c.docs.get('system.config').common.siteName, undefined);
    const ui = c.docs.get('system.adapter.nexowatt-ui.0');
    assert.equal(ui.native.installerConfig, undefined);
    assert.equal(ui.common.enabled, false);
    assert.deepEqual(c.docs.get(enrollment.FIRST_START_MARKER).native.settings, c.settings);
    assert.equal([...c.docs.values()].filter(doc => doc.type === 'user').length, 1);
    assert.equal((await enrollment.verify(c)).physicalControlEnabled, false);
});

test('EOS first start completes the redundant Admin wizard without telemetry consent or identity/configuration changes', async () => {
    const c = fixture();
    const system = c.docs.get('system.config');
    Object.assign(system.common, { licenseConfirmed: false, vendorFlag: 'retain' });
    system.native = { secret: crypto.randomBytes(32).toString('hex') };
    c.docs.set('system.meta.uuid', { _id: 'system.meta.uuid', type: 'meta', native: { uuid: crypto.randomUUID() } });
    const identity = structuredClone(c.docs.get('system.meta.uuid'));
    const native = structuredClone(system.native);
    // Execute the actual Admin gate expression to reproduce the browser decision;
    // this is not a second handwritten implementation of the wizard predicate.
    const adminSource = fs.readFileSync(path.join(__dirname, '../../components/admin/src-admin/src/App.tsx'), 'utf8');
    const match = adminSource.match(/newState\.wizard = ([^;]+);/);
    assert.ok(match, 'Admin wizard decision must remain covered');
    const wizardVisible = common => require('node:vm').runInNewContext(match[1], { newState: { systemConfig: { common } } });
    assert.equal(wizardVisible(system.common), true);
    await enrollment.enrollFirstRun(c);
    const common = c.docs.get('system.config').common;
    assert.equal(wizardVisible(common), false);
    assert.equal(common.licenseConfirmed, true);
    assert.equal(common.diag, 'none');
    assert.equal(common.vendorFlag, 'retain');
    assert.deepEqual(c.docs.get('system.config').native, native);
    assert.deepEqual(c.docs.get('system.meta.uuid'), identity);
    assert.equal(c.docs.get(enrollment.FIRST_START_MARKER).native.settings.licenseMode, c.settings.licenseMode);
    assert.equal(c.docs.get('system.user.admin').common.password, hashed);
    const writes = c.writes;
    await enrollment.enrollFirstRun(c);
    assert.equal(c.writes, writes, 'identical handoff does not write again');
});

test('historical wizard state remains verifiable and never creates a new boot gate or implicit repair', async () => {
    for (const mutate of [c => c.docs.get('system.config').common.licenseConfirmed = false,
        c => delete c.docs.get('system.config').common.licenseConfirmed]) {
        const c = fixture(); await enrollment.enrollFirstRun(c); mutate(c);
        const before = structuredClone(c.docs.get('system.config'));
        const writes = c.writes;
        assert.equal((await enrollment.verify(c)).physicalControlEnabled, false);
        await enrollment.enrollFirstRun(c);
        assert.equal(c.writes, writes, 'verification does not repair unrequested drift');
        assert.deepEqual(c.docs.get('system.config'), before);
    }
});

test('first start never replaces telemetry settings with implicit consent', async () => {
    const c = fixture(); c.docs.get('system.config').common.diag = 'extended';
    await assert.rejects(enrollment.enrollFirstRun(c), /ENROLLMENT_REPOSITORY_DRIFT/);
    assert.equal(c.writes, 0);
});
