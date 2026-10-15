'use strict';
// Fixed six-own-adapter TEST commissioning. Not a generic adapter installer or a
// host privilege boundary. The caller verifies both signed releases, holds the
// root maintenance lock and stops ALL runtime processes before plan/apply/rollback.
// Persist the returned plan in the protected host journal BEFORE calling apply.
// No credentials, license values or user password hashes are copied into it.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { validateProfile, createGuard } = require('../controller-profile/guard.cjs');
const { parseBoundedJson } = require('../policy/admission.cjs');
const { PRIVATE_ACL } = require('./accounts.cjs');
const management = () => require('./enrollment.cjs');
const MARKER = 'system.meta.eosOwnAdapterEnrollment';
const PROFILE = 'eos-six-own-adapters-test-v1';
const EXTRA_SPECS = Object.freeze([
    { name: 'nexowatt-devices', version: '0.5.169', main: 'bootstrap.js' },
    { name: 'eebus', version: '0.3.0', main: 'build/main.js' },
    { name: 'ocpp21', version: '0.4.0', main: 'main.js' },
    { name: 'nexowatt-backup', version: '1.0.10', main: 'build/main.js' },
].map(Object.freeze));
const SPECS = Object.freeze([
    { name: 'eos-admin', version: '7.10.11', main: 'build/main.js', port: 8081 },
    { name: 'nexowatt-ui', version: '1.0.21', main: 'main.js', port: 8188 },
    ...EXTRA_SPECS,
].map(Object.freeze));
const id = spec => `system.adapter.${spec.name}.0`;
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail = code => { throw Object.assign(new Error(code), { code }); };
const hex = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exact = (value, keys) => record(value) && isDeepStrictEqual(Object.keys(value).sort(), [...keys].sort());
const profileValue = () => ({ schemaVersion: 1, kind: 'eos-controller-test-profile', controllerVersion: '7.2.2',
    adapters: SPECS.map(spec => ({ package: `iobroker.${spec.name}`, version: spec.version, main: spec.main })) });

function pinnedAdapters(app) {
    const profile = validateProfile(JSON.parse(fs.readFileSync(path.join(app, 'node_modules/iobroker.js-controller/eos-test-profile.json'), 'utf8')));
    const expected = profileValue();
    if (profile.adapters.length !== SPECS.length || expected.adapters.some(spec => !profile.adapters.some(row => isDeepStrictEqual(row, spec)))) fail('OWN_ENROLLMENT_PROFILE_SCOPE');
    return SPECS.map(spec => {
        const directory = path.join(app, 'node_modules', `iobroker.${spec.name}`);
        const pkg = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
        const io = JSON.parse(fs.readFileSync(path.join(directory, 'io-package.json'), 'utf8'));
        if (pkg.name !== `iobroker.${spec.name}` || pkg.version !== spec.version || pkg.main !== spec.main ||
            io.common?.name !== spec.name || io.common.version !== spec.version) fail('OWN_ENROLLMENT_PACKAGE_IDENTITY');
        return { spec, io };
    });
}

function instanceDocument({ spec, io }, hostname, timestamp) {
    if (!EXTRA_SPECS.includes(spec) && !EXTRA_SPECS.some(row => isDeepStrictEqual(row, spec))) fail('OWN_ENROLLMENT_INSTANCE_SCOPE');
    const common = { ...structuredClone(io.common), name: spec.name, version: spec.version, main: spec.main,
        host: hostname, mode: 'daemon', enabled: false, runAsCompactMode: false, nodeProcessParams: [] };
    const native = structuredClone(io.native || {});
    // No existing plant configuration is migrated or guessed by this operation.
    if (spec.name === 'nexowatt-devices') Object.assign(native, { devices: [], devicesJson: '[]' });
    if (spec.name === 'eebus') Object.assign(native, { eosCommissioningEnabled: false,
        discoveryEnabled: false, shipServerEnabled: false,
        announceShipService: false, autoConnectEnabled: false, autoAcceptNewDevices: false,
        allowCommandsToUntrustedDevices: false, commandDryRun: true, nexowattBridgeEnabled: false,
        autoApplyClsLimits: false, certificate: '', privateKey: '', pairingPin: '' });
    if (spec.name === 'ocpp21') Object.assign(native, { eosCommissioningEnabled: false,
        chargePointInventory: [], identityAllowlist: [], activeRefresh: false });
    if (spec.name === 'nexowatt-backup') {
        // Disable every shipped storage/backup enable flag, including optional
        // future ones, until a destination has deliberately been configured.
        for (const key of Object.keys(native)) if (key.endsWith('Enabled')) native[key] = false;
        Object.assign(native, { minimalEnabled: false, ccuEnabled: false, hostType: 'Single',
            iobrokerCron: false, ccuCron: false, startAllRestore: false, wakeOnLAN: false,
            sudoMount: false, expertMount: '', eosProfileEnabled: true, eosIncludeVendorSecret: false });
    }
    const doc = { _id: id(spec), type: 'instance', common, native, acl: { ...PRIVATE_ACL },
        from: 'system.host.eos-own-adapter-enrollment', ts: timestamp };
    assertInstance(doc, spec, hostname);
    return doc;
}

function assertInstance(doc, spec, hostname) {
    if (doc?._id !== id(spec) || doc.type !== 'instance' || doc.common?.name !== spec.name ||
        doc.common.version !== spec.version || doc.common.main !== spec.main || doc.common.host !== hostname ||
        doc.common.mode !== 'daemon' || doc.common.runAsCompactMode !== false ||
        !Array.isArray(doc.common.nodeProcessParams) || doc.common.nodeProcessParams.length ||
        typeof doc.common.enabled !== 'boolean' || !record(doc.native)) fail('OWN_ENROLLMENT_INSTANCE_DRIFT');
    createGuard(profileValue(), '/unused-build-path').assertInstance(doc);
    if (['eebus', 'ocpp21'].includes(spec.name) && typeof doc.native.eosCommissioningEnabled !== 'boolean') fail('OWN_ENROLLMENT_COMMISSIONING_DRIFT');
    // Commissioning changes to device addresses/trust are deliberately not frozen
    // forever. Adapter protocol policies enforce them; this is execution scope.
    if (spec.port) management().assertInstance(doc, spec, hostname);
}

async function instances(objects) {
    const result = await objects.getObjectViewAsync('system', 'instance', { startkey: 'system.adapter.', endkey: 'system.adapter.\u9999' });
    if (!Array.isArray(result?.rows) || result.rows.length > SPECS.length) fail('OWN_ENROLLMENT_INSTANCE_SCOPE');
    const rows = result.rows.map(row => row.value || row.doc);
    if (new Set(rows.map(row => row?._id)).size !== rows.length) fail('OWN_ENROLLMENT_INSTANCE_SCOPE');
    return rows;
}
function assertMarker(marker, config, allowPending = false) {
    if (!exact(marker, ['_id', 'type', 'common', 'native', 'acl', 'from', 'ts']) || marker._id !== MARKER || marker.type !== 'meta' ||
        !isDeepStrictEqual(marker.acl, PRIVATE_ACL) ||
        !exact(marker.native, ['schemaVersion', 'profile', 'state', 'operationId', 'sourceReleaseId', 'targetReleaseId',
            'sourceEnrollmentSha256', 'runtimeConfigSha256', 'controllerProfileSha256', 'initialConfiguration', 'productionReleaseApproved']) ||
        marker.native.schemaVersion !== 1 || marker.native.profile !== PROFILE ||
        !['complete', ...(allowPending ? ['pending'] : [])].includes(marker.native.state) ||
        !/^[a-f0-9]{32}$/.test(marker.native.operationId || '') || !hex(marker.native.sourceReleaseId) || !hex(marker.native.targetReleaseId) ||
        marker.native.sourceReleaseId === marker.native.targetReleaseId || !hex(marker.native.sourceEnrollmentSha256) ||
        marker.native.runtimeConfigSha256 !== digest(config) || marker.native.controllerProfileSha256 !== digest(profileValue()) ||
        marker.native.initialConfiguration !== 'unconfigured-no-physical-targets' || marker.native.productionReleaseApproved !== false ||
        marker.from !== 'system.host.eos-own-adapter-enrollment' || !Number.isSafeInteger(marker.ts) || marker.ts < 1 ||
        !isDeepStrictEqual(marker.common, { name: 'EOS six-own-adapter test enrollment', type: 'meta.user' })) fail('OWN_ENROLLMENT_MARKER');
}
async function verify({ objects, config, app, allowPending = false }) {
    pinnedAdapters(app);
    const marker = await objects.getObjectAsync(MARKER);
    assertMarker(marker, config, allowPending);
    // The old marker's initial digest is migration evidence, not an immutable
    // account list: authorized invitations/password changes must survive reboot.
    await management().verifyManagementPolicy({ objects, config });
    const rows = await instances(objects);
    if (rows.length !== SPECS.length) fail('OWN_ENROLLMENT_INSTANCE_SCOPE');
    for (const row of rows) {
        const spec = SPECS.find(spec => id(spec) === row?._id);
        if (!spec) fail('OWN_ENROLLMENT_INSTANCE_SCOPE');
        assertInstance(row, spec, config.system.hostname);
    }
    return { status: 'SIX_OWN_ADAPTER_TEST_ENROLLMENT_VERIFIED', profile: PROFILE,
        adaptersEnabled: rows.filter(row => row.common.enabled).length,
        physicalDeviceAcceptance: 'NOT_PERFORMED', productionReleaseApproved: false };
}

async function stopped(states, config) {
    if (!states || typeof states.getState !== 'function' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,62}$/.test(config?.system?.hostname || '')) fail('OWN_ENROLLMENT_INPUT');
    const state = await states.getState(`system.host.${config.system.hostname}.alive`);
    if (state != null && state.val !== false) fail('OWN_ENROLLMENT_CONTROLLER_RUNNING');
}
function boundedPlan(value) {
    let parsed;
    try { parsed = parseBoundedJson(JSON.stringify(value)); } catch { fail('OWN_ENROLLMENT_PLAN'); }
    if (!exact(parsed, ['schemaVersion', 'kind', 'operationId', 'sourceReleaseId', 'targetReleaseId', 'timestamp',
        'runtimeConfigSha256', 'sourceEnrollmentSha256', 'sourceInstances', 'documents', 'marker']) ||
        parsed.schemaVersion !== 1 || parsed.kind !== 'eos-six-own-adapter-enrollment-plan' ||
        !/^[a-f0-9]{32}$/.test(parsed.operationId || '') || !hex(parsed.sourceReleaseId) || !hex(parsed.targetReleaseId) ||
        parsed.sourceReleaseId === parsed.targetReleaseId || !Number.isSafeInteger(parsed.timestamp) || parsed.timestamp < 1 ||
        !hex(parsed.runtimeConfigSha256) || !hex(parsed.sourceEnrollmentSha256) ||
        !Array.isArray(parsed.documents) || parsed.documents.length !== EXTRA_SPECS.length ||
        !Array.isArray(parsed.sourceInstances) || parsed.sourceInstances.length !== 2 ||
        parsed.sourceInstances.some((row, n) => !exact(row, ['id', 'sha256']) || row.id !== id(SPECS[n]) || !hex(row.sha256))) fail('OWN_ENROLLMENT_PLAN');
    return JSON.parse(JSON.stringify(parsed));
}
function markerFor(plan) {
    return { _id: MARKER, type: 'meta', common: { name: 'EOS six-own-adapter test enrollment', type: 'meta.user' },
        native: { schemaVersion: 1, profile: PROFILE, state: 'pending', operationId: plan.operationId,
            sourceReleaseId: plan.sourceReleaseId, targetReleaseId: plan.targetReleaseId,
            sourceEnrollmentSha256: plan.sourceEnrollmentSha256, runtimeConfigSha256: plan.runtimeConfigSha256,
            controllerProfileSha256: digest(profileValue()), initialConfiguration: 'unconfigured-no-physical-targets',
            productionReleaseApproved: false }, acl: { ...PRIVATE_ACL }, from: 'system.host.eos-own-adapter-enrollment', ts: plan.timestamp };
}
function validatePlan(value, config, targetApp) {
    const plan = boundedPlan(value);
    if (plan.runtimeConfigSha256 !== digest(config) || !isDeepStrictEqual(plan.marker, markerFor(plan))) fail('OWN_ENROLLMENT_PLAN_BINDING');
    const expected = pinnedAdapters(targetApp).filter(row => !row.spec.port)
        .map(row => instanceDocument(row, config.system.hostname, plan.timestamp));
    if (!isDeepStrictEqual(plan.documents, expected)) fail('OWN_ENROLLMENT_PLAN_BINDING');
    return plan;
}
async function unchangedBaseline(objects, config, plan) {
    await management().verifyManagementPolicy({ objects, config });
    if (digest(await objects.getObjectAsync(management().MARKER)) !== plan.sourceEnrollmentSha256) fail('OWN_ENROLLMENT_BASELINE_CHANGED');
    for (const row of plan.sourceInstances) if (digest(await objects.getObjectAsync(row.id)) !== row.sha256) fail('OWN_ENROLLMENT_BASELINE_CHANGED');
}
async function planMigration({ objects, states, config, sourceApp, targetApp, sourceReleaseId, targetReleaseId,
    operationId = crypto.randomBytes(16).toString('hex'), timestamp = Date.now() }) {
    await stopped(states, config);
    // The original verifier still requires exactly the two historical instances.
    if (await objects.getObjectAsync(MARKER)) fail('OWN_ENROLLMENT_ALREADY_ATTEMPTED');
    await management().verify({ objects, config, app: sourceApp });
    const packages = pinnedAdapters(targetApp);
    for (const spec of EXTRA_SPECS) if (await objects.getObjectAsync(id(spec))) fail('OWN_ENROLLMENT_EXISTING_INSTANCE');
    const plan = { schemaVersion: 1, kind: 'eos-six-own-adapter-enrollment-plan', operationId, sourceReleaseId, targetReleaseId,
        timestamp, runtimeConfigSha256: digest(config), sourceEnrollmentSha256: digest(await objects.getObjectAsync(management().MARKER)),
        sourceInstances: await Promise.all(SPECS.slice(0, 2).map(async spec => ({ id: id(spec), sha256: digest(await objects.getObjectAsync(id(spec))) }))),
        documents: packages.filter(row => !row.spec.port).map(row => instanceDocument(row, config.system.hostname, timestamp)), marker: null };
    plan.marker = markerFor(plan);
    return validatePlan(plan, config, targetApp);
}
const enabled = doc => ({ ...structuredClone(doc), common: { ...structuredClone(doc.common), enabled: true } });
const completed = marker => ({ ...structuredClone(marker), native: { ...structuredClone(marker.native), state: 'complete' } });
async function assertExact(objects, key, expected, code) {
    if (!isDeepStrictEqual((await objects.getObjectAsync(key)) ?? null, expected)) fail(code);
}
async function writeExact(objects, doc) {
    await objects.setObjectAsync(doc._id, structuredClone(doc));
    await assertExact(objects, doc._id, doc, 'OWN_ENROLLMENT_WRITE_MISMATCH');
}
async function applyMigration({ objects, states, config, targetApp, plan: input, checkpoint }) {
    const plan = validatePlan(input, config, targetApp);
    if (typeof checkpoint !== 'function') fail('OWN_ENROLLMENT_JOURNAL_REQUIRED');
    await stopped(states, config); await unchangedBaseline(objects, config, plan);
    await assertExact(objects, MARKER, null, 'OWN_ENROLLMENT_ALREADY_ATTEMPTED');
    const existing = await instances(objects);
    if (existing.length !== 2 || existing.some(doc => !plan.sourceInstances.some(row => row.id === doc._id))) fail('OWN_ENROLLMENT_INSTANCE_SCOPE');
    for (const doc of plan.documents) await assertExact(objects, doc._id, null, 'OWN_ENROLLMENT_EXISTING_INSTANCE');
    // A durable root-owned journal callback must succeed before the first DB
    // mutation. Its complete before/after plan covers partial writes/read failures.
    await checkpoint(structuredClone(plan));
    await stopped(states, config); await unchangedBaseline(objects, config, plan);
    await assertExact(objects, MARKER, null, 'OWN_ENROLLMENT_ALREADY_ATTEMPTED');
    await writeExact(objects, plan.marker);
    for (const doc of plan.documents) {
        await assertExact(objects, doc._id, null, 'OWN_ENROLLMENT_EXISTING_INSTANCE');
        await writeExact(objects, doc);
    }
    await verify({ objects, config, app: targetApp, allowPending: true });
    for (const doc of plan.documents) {
        await assertExact(objects, doc._id, doc, 'OWN_ENROLLMENT_INSTANCE_CHANGED');
        await writeExact(objects, enabled(doc));
    }
    await unchangedBaseline(objects, config, plan);
    await assertExact(objects, MARKER, plan.marker, 'OWN_ENROLLMENT_MARKER_CHANGED');
    await writeExact(objects, completed(plan.marker));
    return verify({ objects, config, app: targetApp });
}
async function rollbackMigration({ objects, states, config, sourceApp, targetApp, plan: input }) {
    const plan = validatePlan(input, config, targetApp);
    await stopped(states, config); await unchangedBaseline(objects, config, plan);
    const marker = (await objects.getObjectAsync(MARKER)) ?? null;
    const matchesMarker = isDeepStrictEqual(marker, plan.marker) || isDeepStrictEqual(marker, completed(plan.marker));
    if (marker !== null && !matchesMarker) fail('OWN_ENROLLMENT_MARKER_CHANGED');
    const rows = await instances(objects);
    if (rows.some(doc => !SPECS.some(spec => id(spec) === doc?._id))) fail('OWN_ENROLLMENT_INSTANCE_SCOPE');
    // Validate ALL remaining docs before deleting any; never use namespace-wide
    // cleanup. Unknown configuration edits require explicit recovery instead.
    for (const doc of plan.documents) {
        const current = (await objects.getObjectAsync(doc._id)) ?? null;
        if (current !== null && (!matchesMarker || !isDeepStrictEqual(current, doc) && !isDeepStrictEqual(current, enabled(doc)))) fail('OWN_ENROLLMENT_INSTANCE_CHANGED');
    }
    for (const doc of [...plan.documents].reverse()) {
        const current = (await objects.getObjectAsync(doc._id)) ?? null;
        if (current === null) continue;
        if (!isDeepStrictEqual(current, doc) && !isDeepStrictEqual(current, enabled(doc))) fail('OWN_ENROLLMENT_INSTANCE_CHANGED');
        await objects.delObjectAsync(doc._id);
        await assertExact(objects, doc._id, null, 'OWN_ENROLLMENT_DELETE_MISMATCH');
    }
    await unchangedBaseline(objects, config, plan);
    if (marker !== null) {
        await assertExact(objects, MARKER, marker, 'OWN_ENROLLMENT_MARKER_CHANGED');
        await objects.delObjectAsync(MARKER);
        await assertExact(objects, MARKER, null, 'OWN_ENROLLMENT_DELETE_MISMATCH');
    }
    // All original marker/account/config bytes remain untouched. Only restore
    // the release pointer and start the old controller after this has passed.
    await management().verify({ objects, config, app: sourceApp });
    return { status: 'OWN_ADAPTER_ENROLLMENT_ROLLED_BACK', originalManagementEnrollmentPreserved: true };
}
module.exports = { MARKER, PROFILE, SPECS, EXTRA_SPECS, profileValue, pinnedAdapters, instanceDocument,
    assertInstance, verify, planMigration, validatePlan, applyMigration, rollbackMigration };
