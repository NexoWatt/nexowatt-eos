'use strict';
// EOS-INTEGRATION-ENROLLMENT-01: a fixed UI laboratory profile. No physical
// adapter is enrolled. The root orchestration verifies the signed code first;
// these database assertions are drift checks, not isolation from this shared UID.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { isDeepStrictEqual } = require('node:util');
const { validateProfile } = require('../controller-profile/guard.cjs');
const accountsPolicy = require('./accounts.cjs');
const MARKER = 'system.meta.eosEnrollment';
const PROFILE = 'eos-integrated-ui-lab-v1';
const FIRST_START_MARKER = 'system.meta.eosFirstStart';
const SPECS = Object.freeze([
    Object.freeze({ name: 'eos-admin', version: '7.10.11', main: 'build/main.js', port: 8081 }),
    Object.freeze({ name: 'nexowatt-ui', version: '1.0.21', main: 'main.js', port: 8188 }),
]);
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail = code => { throw Object.assign(new Error(code), { code }); };
function validatePassword(value) {
    if (typeof value !== 'string' || [...value].length < 15 || [...value].length > 128 ||
        Buffer.byteLength(value) > 256 || /[\x00-\x1f\x7f]/.test(value)) fail('ENROLLMENT_PASSWORD_POLICY');
    return value;
}
async function passwordHash(value) {
    validatePassword(value);
    const salt = crypto.randomBytes(16).toString('hex');
    // Retain the upstream password format for interoperable login verification.
    // 600k PBKDF2-HMAC-SHA256 iterations; upstream expects a 256-byte derived key.
    const key = await promisify(crypto.pbkdf2)(value, salt, 600000, 256, 'sha256');
    return `pbkdf2$600000$${key.toString('hex')}$${salt}`;
}
function strongHash(value) {
    if (typeof value !== 'string' || !/^pbkdf2\$(600000|[6-9][0-9]{5}|1[0-9]{6}|2000000)\$[a-f0-9]{512}\$[a-f0-9]{32,128}$/.test(value)) fail('ENROLLMENT_ADMIN_PASSWORD');
}
function pinnedAdapters(app) {
    const profile = validateProfile(JSON.parse(fs.readFileSync(path.join(app, 'node_modules/iobroker.js-controller/eos-test-profile.json'))));
    for (const spec of SPECS) {
        const row = profile.adapters?.find(a => a.package === `iobroker.${spec.name}`);
        if (!row || row.version !== spec.version || row.main !== spec.main) fail('ENROLLMENT_ADAPTER_NOT_ADMITTED');
    }
    // This development profile has precisely two executable adapters.
    if (profile.adapters.length !== SPECS.length) fail('ENROLLMENT_PROFILE_SCOPE');
    return SPECS.map(spec => {
        const root = path.join(app, 'node_modules', `iobroker.${spec.name}`);
        const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
        const io = JSON.parse(fs.readFileSync(path.join(root, 'io-package.json')));
        if (pkg.name !== `iobroker.${spec.name}` || pkg.version !== spec.version || pkg.main !== spec.main ||
            io.common?.name !== spec.name || io.common.version !== spec.version) fail('ENROLLMENT_PACKAGE_IDENTITY');
        return { spec, io };
    });
}
function instanceDocument({ spec, io }, hostname) {
    const common = { ...structuredClone(io.common), name: spec.name, version: spec.version,
        main: spec.main, host: hostname, enabled: false, mode: 'daemon', runAsCompactMode: false, nodeProcessParams: [] };
    const native = { ...structuredClone(io.native), bind: '0.0.0.0', port: spec.port };
    if (spec.name === 'eos-admin') Object.assign(native, {
        auth: true, secure: true, noBasicAuth: true, autoUpdate: 0, disableMcp: true,
        eosAutoAssignStandardAccounts: false, eosAutoAssignDefaultRoleUsers: false,
        eosPasswordlessFirstLogin: false, eosAllowPasswordlessFirstLogin: false,
        eosNexoWattAutoUpdate: false,
    });
    else Object.assign(native, {
        auth: { ...native.auth, enabled: true, protectWrites: true },
        accessControl: { ...native.accessControl, enabled: true, trustedHeaderEnabled: false, customerWritePolicy: 'session' },
        eosLicenseAdminInstance: 'eos-admin.0',
        eosTls: { certificatePath: '/etc/nexowatt-eos/web/ui.crt', privateKeyPath: '/etc/nexowatt-eos/web/ui.key' },
        licenseKey: '',
    });
    return { _id: `system.adapter.${spec.name}.0`, type: 'instance', common, native,
        from: 'system.host.eos-enrollment', ts: Date.now() };
}
function assertInstance(doc, spec, hostname) {
    if (doc?._id !== `system.adapter.${spec.name}.0` || doc.type !== 'instance' ||
        doc.common?.name !== spec.name || doc.common.version !== spec.version || doc.common.host !== hostname ||
        doc.common.main !== spec.main || doc.common.mode !== 'daemon' || doc.common.runAsCompactMode !== false ||
        !Array.isArray(doc.common.nodeProcessParams) || doc.common.nodeProcessParams.length ||
        typeof doc.common.enabled !== 'boolean') fail('ENROLLMENT_INSTANCE_DRIFT');
    if (doc.native?.port !== spec.port || !['0.0.0.0', '::'].includes(doc.native.bind)) fail('ENROLLMENT_LISTENER_DRIFT');
    if (spec.name === 'eos-admin') {
        if (doc.native.auth !== true || doc.native.secure !== true || doc.native.disableMcp !== true ||
            doc.native.autoUpdate !== 0 || doc.native.eosAutoAssignStandardAccounts !== false ||
            doc.native.eosAutoAssignDefaultRoleUsers !== false || doc.native.eosPasswordlessFirstLogin !== false ||
            doc.native.eosAllowPasswordlessFirstLogin !== false) fail('ENROLLMENT_ADMIN_DRIFT');
    } else if (doc.native.auth?.enabled !== true || doc.native.auth.protectWrites !== true ||
        doc.native.accessControl?.enabled !== true || doc.native.accessControl.trustedHeaderEnabled !== false ||
        doc.native.eosLicenseAdminInstance !== 'eos-admin.0' ||
        doc.native.eosTls?.certificatePath !== '/etc/nexowatt-eos/web/ui.crt' ||
        doc.native.eosTls.privateKeyPath !== '/etc/nexowatt-eos/web/ui.key' || doc.native.licenseKey) fail('ENROLLMENT_UI_DRIFT');
}
async function verify({ objects, config, app, allowPending = false }) {
    pinnedAdapters(app);
    const marker = await objects.getObjectAsync(MARKER);
    if (marker?.native?.profile !== PROFILE || marker.native.version !== 2 ||
        marker.native.runtimeConfigSha256 !== digest(config) || marker.native.physicalControlEnabled !== false ||
        !(marker.native.state === 'complete' || allowPending && marker.native.state === 'pending')) fail('ENROLLMENT_MARKER');
    if (marker.native.firstRunPolicyVersion !== undefined) {
        if (marker.native.firstRunPolicyVersion !== 1) fail('ENROLLMENT_FIRST_START');
        await verifyFirstRun({ objects, allowPending });
    }
    const core = await objects.getObjectAsync('system.meta.eosTestBase');
    if (core?.native?.state !== 'complete' || core.native.profile !== 'eos-core-only-bootstrap-v1' ||
        core.native.coreControllerVersion !== '7.2.2' || core.native.bootstrapPolicyVersion !== 1 ||
        core.native.runtimeConfigSha256 !== digest(config)) fail('ENROLLMENT_CORE_BINDING');
    const system = await objects.getObjectAsync('system.config');
    const repos = await objects.getObjectAsync('system.repositories');
    if (system?.common?.diag !== 'none' || !Array.isArray(system.common.activeRepo) || system.common.activeRepo.length ||
        system.common.adapterAutoUpgrade?.defaultPolicy !== 'none' ||
        Object.keys(system.common.adapterAutoUpgrade.repositories || { invalid: true }).length ||
        Object.keys(repos?.native?.repositories || { invalid: true }).length ||
        Object.keys(repos?.native?.oldRepositories || { invalid: true }).length) fail('ENROLLMENT_REPOSITORY_DRIFT');
    const admin = await objects.getObjectAsync('system.user.admin');
    if (admin?.type !== 'user' || admin.common?.enabled !== true) fail('ENROLLMENT_ADMIN_DISABLED');
    strongHash(admin.common.password);
    if (!isDeepStrictEqual(admin.acl, accountsPolicy.PRIVATE_ACL)) fail('ENROLLMENT_SERVICE_ACL');
    await accountsPolicy.verifyAccounts(objects, marker, strongHash);
    // Query executable objects, not every measurement and UI asset. ioBroker's
    // view client materializes the response; this count is a post-read limit.
    const result = await objects.getObjectViewAsync('system', 'instance', { startkey: 'system.adapter.', endkey: 'system.adapter.\u9999' });
    if (!Array.isArray(result?.rows) || result.rows.length !== SPECS.length) fail('ENROLLMENT_UNEXPECTED_INSTANCE');
    const seen = new Set();
    for (const row of result.rows) {
        const doc = row.value || row.doc;
        const spec = SPECS.find(s => doc?._id === `system.adapter.${s.name}.0`);
        if (!spec || seen.has(spec.name)) fail('ENROLLMENT_UNEXPECTED_INSTANCE');
        seen.add(spec.name); assertInstance(doc, spec, config.system.hostname);
    }
    return { status: 'INTEGRATED_UI_LAB_VERIFIED', profile: PROFILE, adaptersEnabled: result.rows.filter(r => (r.value || r.doc).common.enabled).length,
        physicalControlEnabled: false, productionReleaseApproved: false };
}
async function verifyFirstRun({ objects, allowPending = false }) {
    const marker = await objects.getObjectAsync(FIRST_START_MARKER);
    const { validateSettings } = require('../onboarding/policy.cjs');
    if (marker?.native?.schemaVersion !== 1 || marker.native.configurationValidated !== true ||
        marker.native.physicalControlEnabled !== false ||
        !(marker.native.state === 'complete' || allowPending && marker.native.state === 'pending')) fail('ENROLLMENT_FIRST_START');
    validateSettings(marker.native.settings);
    if (marker.native.settingsSha256 !== digest(marker.native.settings)) fail('ENROLLMENT_FIRST_START');
    const expected = require('../onboarding/configuration.cjs').summarize(marker.native.settings,
        { mode: marker.native.settings.licenseMode === 'verified' ? 'activate' : 'unlicensed' });
    if (!isDeepStrictEqual(marker.native.commissioning, expected)) fail('ENROLLMENT_FIRST_START');
    const common = (await objects.getObjectAsync('system.config'))?.common;
    // This marker records the accepted initial configuration, not an immutable
    // forever-snapshot: authorized setting changes must survive later reboots.
    if (marker.native.settings.schemaVersion !== 3) {
        validateSettings({ ...marker.native.settings, siteName: common?.siteName, language: common?.language, timeZone: common?.timeZone });
    }
    return { state: marker.native.state, configurationValidated: true, physicalControlEnabled: false };
}
async function enrollFirstRun({ objects, states, config, app, passwordHash: hashed, settings, verifyFresh }) {
    if (typeof verifyFresh !== 'function') fail('ENROLLMENT_FRESH_GATE_REQUIRED');
    strongHash(hashed);
    settings = require('../onboarding/policy.cjs').validateSettings(settings);
    const packages = pinnedAdapters(app);
    const binding = digest({ passwordHash: hashed, settings, config });
    const previous = await objects.getObjectAsync(MARKER);
    // Only an already finished identical handoff is idempotent. An interrupted
    // multi-object write stays blocked; replaying it could erase foreign edits.
    if (previous) {
        if (previous.native?.firstRunPolicyVersion === 1 && previous.native.state === 'complete' && previous.native.firstRunBinding === binding) {
            return verify({ objects, config, app });
        }
        fail('ENROLLMENT_ALREADY_ATTEMPTED');
    }
    if (await objects.getObjectAsync(FIRST_START_MARKER)) fail('ENROLLMENT_ALREADY_ATTEMPTED');
    await verifyFresh();
    if ((await states.getState(`system.host.${config.system.hostname}.alive`))?.val === true) fail('ENROLLMENT_CONTROLLER_RUNNING');
    const admin = structuredClone(await objects.getObjectAsync('system.user.admin'));
    const system = structuredClone(await objects.getObjectAsync('system.config'));
    if (!admin || admin.common?.enabled !== false || admin.common.password !== '' || !system) fail('ENROLLMENT_FRESH_ADMIN_REQUIRED');
    if (system.common?.diag !== 'none') fail('ENROLLMENT_REPOSITORY_DRIFT');
    const marker = { _id: MARKER, type: 'meta', common: { name: 'EOS browser first-start enrollment', type: 'meta.user' },
        native: { profile: PROFILE, version: 2, state: 'pending', runtimeConfigSha256: digest(config), physicalControlEnabled: false,
            accountPolicyVersion: accountsPolicy.ACCOUNT_POLICY_VERSION, accounts: [], firstRunPolicyVersion: 1, firstRunBinding: binding },
        from: 'system.host.eos-enrollment', ts: Date.now() };
    const configuration = require('../onboarding/configuration.cjs');
    const firstStart = { _id: FIRST_START_MARKER, type: 'meta', common: { name: 'EOS first-start configuration', type: 'meta.user' },
        native: { schemaVersion: 1, state: 'pending', configurationValidated: true, physicalControlEnabled: false,
            settings, settingsSha256: digest(settings),
            commissioning: configuration.summarize(settings, { mode: settings.licenseMode === 'verified' ? 'activate' : 'unlicensed' }) }, acl: { ...accountsPolicy.PRIVATE_ACL },
        from: 'system.host.eos-enrollment', ts: Date.now() };
    await objects.setObjectAsync(MARKER, marker);
    await objects.setObjectAsync(FIRST_START_MARKER, firstStart);
    for (const item of packages) {
        const doc = instanceDocument(item, config.system.hostname);
        if (item.spec.name === 'nexowatt-ui' && settings.schemaVersion !== 3) configuration.applyPlant(doc.native, settings.plant);
        await objects.setObjectAsync(doc._id, doc);
    }
    if (settings.schemaVersion !== 3) {
        Object.assign(system.common, { siteName: settings.siteName, language: settings.language, timeZone: settings.timeZone });
    }
    // EOS already provisions the service password and management policy. This
    // upstream compatibility flag suppresses its duplicate setup wizard; it is
    // not telemetry consent or an EOS product license. diag remains 'none'.
    system.common.licenseConfirmed = true;
    await objects.setObjectAsync('system.config', system);
    admin.common = { ...admin.common, enabled: true, password: hashed, name: 'NexoWatt Service' };
    admin.acl = { ...accountsPolicy.PRIVATE_ACL };
    await objects.setObjectAsync(admin._id, admin);
    for (const role of Object.keys(accountsPolicy.ROLES)) await objects.setObjectAsync(accountsPolicy.ROLES[role], accountsPolicy.groupDocument(role, []));
    await verify({ objects, config, app, allowPending: true });
    firstStart.native.state = 'complete'; await objects.setObjectAsync(FIRST_START_MARKER, firstStart);
    marker.native.state = 'complete'; await objects.setObjectAsync(MARKER, marker);
    return verify({ objects, config, app });
}
async function enroll({ objects, states, config, app, password, accounts, verifyFresh }) {
    if (typeof verifyFresh !== 'function') fail('ENROLLMENT_FRESH_GATE_REQUIRED');
    validatePassword(password);
    const users = accountsPolicy.validateAccounts(accounts, password, validatePassword);
    const packages = pinnedAdapters(app);
    if (await objects.getObjectAsync(MARKER)) fail('ENROLLMENT_ALREADY_ATTEMPTED');
    await verifyFresh();
    if ((await states.getState(`system.host.${config.system.hostname}.alive`))?.val === true) fail('ENROLLMENT_CONTROLLER_RUNNING');
    const hashed = await passwordHash(password);
    // Sequential derivation bounds bootstrap CPU/memory; no secret enters the
    // marker, console, command line or generated installation evidence.
    const userDocs = [];
    for (const row of users) userDocs.push(accountsPolicy.userDocument(row, await passwordHash(row.password)));
    const admin = structuredClone(await objects.getObjectAsync('system.user.admin'));
    const system = structuredClone(await objects.getObjectAsync('system.config'));
    if (!admin || admin.common?.enabled !== false || admin.common.password !== '') fail('ENROLLMENT_FRESH_ADMIN_REQUIRED');
    if (system?.common?.diag !== 'none') fail('ENROLLMENT_REPOSITORY_DRIFT');
    const marker = { _id: MARKER, type: 'meta', common: { name: 'EOS integrated UI laboratory enrollment', type: 'meta.user' },
        native: { profile: PROFILE, version: 2, state: 'pending', runtimeConfigSha256: digest(config), physicalControlEnabled: false,
            accountPolicyVersion: accountsPolicy.ACCOUNT_POLICY_VERSION, accounts: accountsPolicy.inventory(users) },
        from: 'system.host.eos-enrollment', ts: Date.now() };
    await objects.setObjectAsync(MARKER, marker);
    // Write disabled instances first. A partial operation cannot be restarted
    // through the host readiness gate; operator restores the fresh snapshot.
    for (const item of packages) {
        const doc = instanceDocument(item, config.system.hostname);
        await objects.setObjectAsync(doc._id, doc);
    }
    // The laboratory enrollment also supplies a complete authenticated setup.
    // Preserve telemetry policy and all unrelated system configuration.
    system.common.licenseConfirmed = true;
    await objects.setObjectAsync('system.config', system);
    admin.common = { ...admin.common, enabled: true, password: hashed };
    admin.common.name = 'NexoWatt Service';
    admin.acl = { ...accountsPolicy.PRIVATE_ACL };
    await objects.setObjectAsync(admin._id, admin);
    for (const doc of userDocs) await objects.setObjectAsync(doc._id, doc);
    for (const role of Object.keys(accountsPolicy.ROLES)) {
        const doc = accountsPolicy.groupDocument(role, users);
        await objects.setObjectAsync(doc._id, doc);
    }
    await verify({ objects, config, app, allowPending: true });
    marker.native.state = 'complete';
    await objects.setObjectAsync(MARKER, marker);
    return verify({ objects, config, app });
}
module.exports = { MARKER, PROFILE, FIRST_START_MARKER, SPECS, validatePassword, passwordHash, strongHash, pinnedAdapters, instanceDocument, assertInstance, verify, verifyFirstRun, enroll, enrollFirstRun };
