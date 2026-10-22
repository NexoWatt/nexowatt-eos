'use strict';
// Direct, exact R8 -> managed sequence-15 database transition. The root
// coordinator authenticates both releases, holds maintenance gates and stops
// all runtime processes. Only hashes of existing documents enter the journal.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { validateProfile } = require('../controller-profile/profile-validation.cjs');
const { parseBoundedJson } = require('../policy/admission.cjs');
const { PRIVATE_ACL } = require('./accounts.cjs');
const own = require('./own-adapter-enrollment.cjs');
const { MARKER, PROFILE, SPECS, EXTRA_SPECS, profileValue, pinnedAdapters, instanceDocument, verify } = own;
const management = () => require('./enrollment.cjs');
const SOURCE_RELEASE_ID = 'eb3d1747c35988bdf8785e7a5cdfc786ab356fa87149054767d7c0ed211b7ea7';
const CORE = 'system.meta.eosTestBase';
const id = spec => `system.adapter.${spec.name}.0`;
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail = code => { throw Object.assign(new Error(code), { code }); };
const hex = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const exact = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value) && isDeepStrictEqual(Object.keys(value).sort(), [...keys].sort());
const controllerVersion = app => validateProfile(JSON.parse(fs.readFileSync(path.join(app, 'node_modules/iobroker.js-controller/eos-test-profile.json'), 'utf8'))).controllerVersion;
const coreVersion = (doc, version) => ({ ...structuredClone(doc), native: { ...structuredClone(doc.native), coreControllerVersion: version } });
async function writeCore(objects, doc) {
    await objects.setObjectAsync(CORE, structuredClone(doc));
    await assertExact(objects, CORE, doc, 'R8_ENROLLMENT_WRITE_MISMATCH');
}
async function instances(objects) {
    const result = await objects.getObjectViewAsync('system', 'instance', { startkey: 'system.adapter.', endkey: 'system.adapter.\u9999' });
    if (!Array.isArray(result?.rows) || result.rows.length > SPECS.length) fail('R8_ENROLLMENT_INSTANCE_SCOPE');
    const rows = result.rows.map(row => row.value || row.doc);
    if (new Set(rows.map(row => row?._id)).size !== rows.length) fail('R8_ENROLLMENT_INSTANCE_SCOPE');
    return rows;
}
async function stopped(states, config) {
    if (!states || typeof states.getState !== 'function' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,62}$/.test(config?.system?.hostname || '')) fail('R8_ENROLLMENT_INPUT');
    const state = await states.getState(`system.host.${config.system.hostname}.alive`);
    if (state != null && state.val !== false) fail('R8_ENROLLMENT_CONTROLLER_RUNNING');
}
function boundedPlan(value) {
    let parsed;
    try { parsed = parseBoundedJson(JSON.stringify(value)); } catch { fail('R8_ENROLLMENT_PLAN'); }
    if (!exact(parsed, ['schemaVersion', 'kind', 'operationId', 'sourceReleaseId', 'targetReleaseId', 'timestamp',
        'runtimeConfigSha256', 'sourceEnrollmentSha256', 'sourceCoreSha256', 'targetCoreSha256', 'sourceInstances', 'documents', 'marker']) ||
        parsed.schemaVersion !== 1 || parsed.kind !== 'eos-r8-managed-enrollment-plan' ||
        !/^[a-f0-9]{32}$/.test(parsed.operationId || '') || !hex(parsed.sourceReleaseId) || !hex(parsed.targetReleaseId) ||
        parsed.sourceReleaseId === parsed.targetReleaseId || !Number.isSafeInteger(parsed.timestamp) || parsed.timestamp < 1 ||
        !hex(parsed.runtimeConfigSha256) || !hex(parsed.sourceEnrollmentSha256) || !hex(parsed.sourceCoreSha256) || !hex(parsed.targetCoreSha256) || parsed.sourceReleaseId !== SOURCE_RELEASE_ID ||
        !Array.isArray(parsed.documents) || parsed.documents.length !== EXTRA_SPECS.length ||
        !Array.isArray(parsed.sourceInstances) || parsed.sourceInstances.length !== 2 ||
        parsed.sourceInstances.some((row, n) => !exact(row, ['id', 'sha256']) || row.id !== id(SPECS[n]) || !hex(row.sha256))) fail('R8_ENROLLMENT_PLAN');
    return JSON.parse(JSON.stringify(parsed));
}
function markerFor(plan) {
    return { _id: MARKER, type: 'meta', common: { name: 'EOS six-own-adapter test enrollment', type: 'meta.user' },
        native: { schemaVersion: 1, profile: PROFILE, state: 'pending', operationId: plan.operationId,
            sourceReleaseId: plan.sourceReleaseId, targetReleaseId: plan.targetReleaseId,
            sourceEnrollmentSha256: plan.sourceEnrollmentSha256, runtimeConfigSha256: plan.runtimeConfigSha256,
            controllerProfileSha256: digest(profileValue('7.2.5')), initialConfiguration: 'unconfigured-no-physical-targets',
            productionReleaseApproved: false }, acl: { ...PRIVATE_ACL }, from: 'system.host.eos-own-adapter-enrollment', ts: plan.timestamp };
}
function validatePlan(value, config, targetApp) {
    const plan = boundedPlan(value);
    if (controllerVersion(targetApp) !== '7.2.5') fail('R8_ENROLLMENT_PROFILE_SCOPE');
    if (plan.runtimeConfigSha256 !== digest(config) || !isDeepStrictEqual(plan.marker, markerFor(plan))) fail('R8_ENROLLMENT_PLAN_BINDING');
    const expected = pinnedAdapters(targetApp).filter(row => !row.spec.port)
        .map(row => instanceDocument(row, config.system.hostname, plan.timestamp));
    if (!isDeepStrictEqual(plan.documents, expected)) fail('R8_ENROLLMENT_PLAN_BINDING');
    return plan;
}
async function unchangedBaseline(objects, config, plan, sourceApp, targetApp) {
    const core = await objects.getObjectAsync(CORE);
    const before = digest(core) === plan.sourceCoreSha256;
    const after = digest(core) === plan.targetCoreSha256;
    if (!before && !after) fail('R8_ENROLLMENT_CORE_CHANGED');
    await management().verifyManagementPolicy({ objects, config, app: before ? sourceApp : targetApp });
    if (digest(await objects.getObjectAsync(management().MARKER)) !== plan.sourceEnrollmentSha256) fail('R8_ENROLLMENT_BASELINE_CHANGED');
    for (const row of plan.sourceInstances) if (digest(await objects.getObjectAsync(row.id)) !== row.sha256) fail('R8_ENROLLMENT_BASELINE_CHANGED');
}
async function planMigration({ objects, states, config, sourceApp, targetApp, sourceReleaseId, targetReleaseId,
    operationId = crypto.randomBytes(16).toString('hex'), timestamp = Date.now() }) {
    await stopped(states, config);
    // The original verifier still requires exactly the two historical instances.
    if (await objects.getObjectAsync(MARKER)) fail('R8_ENROLLMENT_ALREADY_ATTEMPTED');
    await management().verify({ objects, config, app: sourceApp });
    if (controllerVersion(sourceApp) !== '7.2.2' || controllerVersion(targetApp) !== '7.2.5' || sourceReleaseId !== SOURCE_RELEASE_ID) fail('R8_ENROLLMENT_PROFILE_SCOPE');
    // A healthy R8 Admin has already applied this startup projection. Refuse
    // an incomplete baseline before planning, instead of allowing the trial
    // Admin to rewrite preserved management configuration during activation.
    const admin = await objects.getObjectAsync('system.adapter.eos-admin.0');
    if (admin?.native?._nexowattEosRoleReadableAclManaged !== true || !isDeepStrictEqual(admin.acl,
        { owner: 'system.user.admin', ownerGroup: 'system.group.administrator', object: 0x664 })) fail('R8_ENROLLMENT_ADMIN_NOT_READY');
    const originalCore = await objects.getObjectAsync(CORE);
    const nextCore = coreVersion(originalCore, '7.2.5');
    const packages = pinnedAdapters(targetApp);
    for (const spec of EXTRA_SPECS) if (await objects.getObjectAsync(id(spec))) fail('R8_ENROLLMENT_EXISTING_INSTANCE');
    const plan = { schemaVersion: 1, kind: 'eos-r8-managed-enrollment-plan', operationId, sourceReleaseId, targetReleaseId,
        timestamp, sourceCoreSha256: digest(originalCore), targetCoreSha256: digest(nextCore), runtimeConfigSha256: digest(config), sourceEnrollmentSha256: digest(await objects.getObjectAsync(management().MARKER)),
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
    await assertExact(objects, doc._id, doc, 'R8_ENROLLMENT_WRITE_MISMATCH');
}
async function applyMigration({ objects, states, config, sourceApp, targetApp, plan: input, checkpoint }) {
    const plan = validatePlan(input, config, targetApp);
    if (typeof checkpoint !== 'function') fail('R8_ENROLLMENT_JOURNAL_REQUIRED');
    await stopped(states, config); await unchangedBaseline(objects, config, plan, sourceApp, targetApp);
    await assertExact(objects, MARKER, null, 'R8_ENROLLMENT_ALREADY_ATTEMPTED');
    const existing = await instances(objects);
    if (existing.length !== 2 || existing.some(doc => !plan.sourceInstances.some(row => row.id === doc._id))) fail('R8_ENROLLMENT_INSTANCE_SCOPE');
    for (const doc of plan.documents) await assertExact(objects, doc._id, null, 'R8_ENROLLMENT_EXISTING_INSTANCE');
    // A durable root-owned journal callback must succeed before the first DB
    // mutation. Its complete before/after plan covers partial writes/read failures.
    await checkpoint(structuredClone(plan));
    await stopped(states, config); await unchangedBaseline(objects, config, plan, sourceApp, targetApp);
    await assertExact(objects, MARKER, null, 'R8_ENROLLMENT_ALREADY_ATTEMPTED');
    const originalCore = await objects.getObjectAsync(CORE);
    if (digest(originalCore) !== plan.sourceCoreSha256 || digest(coreVersion(originalCore, '7.2.5')) !== plan.targetCoreSha256) fail('R8_ENROLLMENT_CORE_CHANGED');
    await writeExact(objects, plan.marker);
    await assertExact(objects, CORE, originalCore, 'R8_ENROLLMENT_CORE_CHANGED');
    await writeCore(objects, coreVersion(originalCore, '7.2.5'));
    for (const doc of plan.documents) {
        await assertExact(objects, doc._id, null, 'R8_ENROLLMENT_EXISTING_INSTANCE');
        await writeExact(objects, doc);
    }
    await verify({ objects, config, app: targetApp, allowPending: true });
    for (const doc of plan.documents) {
        await assertExact(objects, doc._id, doc, 'R8_ENROLLMENT_INSTANCE_CHANGED');
        await writeExact(objects, enabled(doc));
    }
    await unchangedBaseline(objects, config, plan, sourceApp, targetApp);
    await assertExact(objects, MARKER, plan.marker, 'R8_ENROLLMENT_MARKER_CHANGED');
    await writeExact(objects, completed(plan.marker));
    return verify({ objects, config, app: targetApp });
}
async function rollbackMigration({ objects, states, config, sourceApp, targetApp, plan: input }) {
    const plan = validatePlan(input, config, targetApp);
    await stopped(states, config); await unchangedBaseline(objects, config, plan, sourceApp, targetApp);
    const marker = (await objects.getObjectAsync(MARKER)) ?? null;
    const matchesMarker = isDeepStrictEqual(marker, plan.marker) || isDeepStrictEqual(marker, completed(plan.marker));
    if (marker !== null && !matchesMarker) fail('R8_ENROLLMENT_MARKER_CHANGED');
    if (marker === null && digest(await objects.getObjectAsync(CORE)) !== plan.sourceCoreSha256) fail('R8_ENROLLMENT_CORE_CHANGED');
    const rows = await instances(objects);
    if (rows.some(doc => !SPECS.some(spec => id(spec) === doc?._id))) fail('R8_ENROLLMENT_INSTANCE_SCOPE');
    // Validate ALL remaining docs before deleting any; never use namespace-wide
    // cleanup. Unknown configuration edits require explicit recovery instead.
    for (const doc of plan.documents) {
        const current = (await objects.getObjectAsync(doc._id)) ?? null;
        if (current !== null && (!matchesMarker || !isDeepStrictEqual(current, doc) && !isDeepStrictEqual(current, enabled(doc)))) fail('R8_ENROLLMENT_INSTANCE_CHANGED');
    }
    for (const doc of [...plan.documents].reverse()) {
        const current = (await objects.getObjectAsync(doc._id)) ?? null;
        if (current === null) continue;
        if (!isDeepStrictEqual(current, doc) && !isDeepStrictEqual(current, enabled(doc))) fail('R8_ENROLLMENT_INSTANCE_CHANGED');
        await objects.delObjectAsync(doc._id);
        await assertExact(objects, doc._id, null, 'R8_ENROLLMENT_DELETE_MISMATCH');
    }
    await unchangedBaseline(objects, config, plan, sourceApp, targetApp);
    const core = await objects.getObjectAsync(CORE);
    if (digest(core) === plan.targetCoreSha256) {
        const originalCore = coreVersion(core, '7.2.2');
        if (digest(originalCore) !== plan.sourceCoreSha256) fail('R8_ENROLLMENT_CORE_CHANGED');
        await writeCore(objects, originalCore);
    }
    if (marker !== null) {
        await assertExact(objects, MARKER, marker, 'R8_ENROLLMENT_MARKER_CHANGED');
        await objects.delObjectAsync(MARKER);
        await assertExact(objects, MARKER, null, 'R8_ENROLLMENT_DELETE_MISMATCH');
    }
    // All original marker/account/config bytes remain untouched. Only restore
    // the release pointer and start the old controller after this has passed.
    await management().verify({ objects, config, app: sourceApp });
    return { status: 'R8_MANAGED_ENROLLMENT_ROLLED_BACK', originalManagementEnrollmentPreserved: true };
}
module.exports = { SOURCE_RELEASE_ID, CORE, planMigration, validatePlan, applyMigration, rollbackMigration };
