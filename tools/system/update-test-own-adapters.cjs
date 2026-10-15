'use strict';
// Narrow operator-authorized R9 -> six-own-adapter TEST update, not a general migration API.
// The immutable download command must independently pin the new release AND key.
// Adds four unconfigured instances and the exact reviewed upload unit. No account,
// license, certificate, runtime-config, database-schema or hardware migration.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const bundle = require('../../runtime/release/bundle.cjs');
const { rootOwned, checkInstalled } = require('../../runtime/release/installed-check.cjs');
const { trustedImport, probeNativeForInstallation } = require('./eos-base.cjs');
const { validatePayload } = require('./build-bundle.cjs');
const { command, toolTrust } = require('./host-preflight.cjs');
const { atomicWrite } = require('./activate-release.cjs');
const { privateWrite } = require('./install-host.cjs');
const ownEnrollment = require('../../runtime/bootstrap/own-adapter-enrollment.cjs');
const product = require('../../runtime/product/scope.cjs');
const { isDeepStrictEqual } = require('node:util');
const BASES = Object.freeze([
    Object.freeze({ releaseId: '97780e881765e2c9854e81ac7187b3ed120eccc8cc0dea0821492c9a54e23000',
        publicKeySha256: '018e554d65105fa012fcd443f23077018fcd6e6bcf03af8f6fdedffdc4f74b04',
        sequence: 12, nodeVersion: '24.21.0', profile: 'test' }),
]);
const NODE_VERSION = '24.21.0';
const TARGET_SEQUENCE = 13;
const COMPLETION_RELEASE = 'eb3d1747c35988bdf8785e7a5cdfc786ab356fa87149054767d7c0ed211b7ea7';
const PROFILE_PATH = 'app/node_modules/iobroker.js-controller/eos-test-profile.json';
const UPLOAD_PATH = 'system/postgresql-test/systemd/nexowatt-eos-upload.service';
const UPLOAD_TEMPLATE_PATH = 'system/own-adapter-test/systemd/nexowatt-eos-upload.service';
const UPLOAD_SERVICE = 'nexowatt-eos-upload.service';
const SERVICE = 'nexowatt-eos-controller.service';
const DIRECTORY = '/etc/nexowatt-eos';
const MALFORMED_PROTECTED_LOCK = Symbol('malformed-protected-lock');
const PRESERVED = Object.freeze(['iobroker.json', 'first-start-complete.json', 'license-device.json', 'license-trust.json',
    'web/ca.crt', 'web/admin.crt', 'web/admin.key', 'web/ui.crt', 'web/ui.key', 'test-update-r9-status.json']);
const FAILURE_STAGES = new Set(['PREFLIGHT', 'SOURCE_VERIFY', 'STAGE', 'NATIVE_PROBE', 'PREPARED', 'ADOPT_LOCK', 'STOP',
    'TRIAL', 'CONTROLLER_START', 'DB_CONNECT', 'DB_CLOSE', 'ADAPTER_HEARTBEAT', 'WEB_HTTPS', 'ADMIN_HTTPS', 'UI_HTTPS', 'VERIFY_LIVE', 'COMPLETION',
    'BOOT_CONFIGURATION', 'ACTIVE_REPORT', 'UNLOCK', 'BASELINE_READINESS', 'ROLLBACK_START', 'ROLLBACK_READINESS',
    'ENROLLMENT_PLAN', 'ENROLLMENT_APPLY', 'UPLOAD_UNIT', 'ASSET_UPLOAD', 'ENROLLMENT_ROLLBACK', 'UPLOAD_ROLLBACK']);
const FAILURE_CODES = new Set([
    'REPAIR_R9_BASELINE_REQUIRED', 'REPAIR_COMPLETED_FIRST_START_REQUIRED', 'REPAIR_NATIVE_PROBE_FAILED', 'REPAIR_TRIAL_FAILED_RESTORED_ACTIVE',
    'INSTALLED_SIGNATURE', 'INSTALLED_CONTENT', 'INSTALLED_KEY', 'INSTALLED_PLATFORM', 'INSTALLED_RELEASE_ID', 'INSTALLED_UNTRUSTED_PATH',
    'BUNDLE_CHANGED', 'BUNDLE_CONTENT', 'BUNDLE_DIRECTORY', 'BUNDLE_EXISTS', 'BUNDLE_EXTRA_FILE', 'BUNDLE_FILE', 'BUNDLE_KEY',
    'BUNDLE_MANIFEST', 'BUNDLE_NODE_VERSION', 'BUNDLE_PATH', 'BUNDLE_PLATFORM', 'BUNDLE_ROLLBACK', 'BUNDLE_SEQUENCE',
    'BUNDLE_SHAPE', 'BUNDLE_SIGNATURE', 'BUNDLE_SIZE', 'BUNDLE_UNTRUSTED_DESTINATION',
    'ONBOARD_ADAPTERS_NOT_READY', 'ONBOARD_HTTPS_NOT_READY', 'ONBOARD_READINESS_INPUT',
    'REPAIR_ADMISSION_CHANGE', 'REPAIR_COMPLETION_CHANGED', 'REPAIR_CONTROLLER_BUSY',
    'REPAIR_COORDINATOR_OWNERSHIP_CHANGED', 'REPAIR_CURRENT_CHANGED', 'REPAIR_DATABASE_BOUNDS',
    'REPAIR_DATABASE_CONNECTION', 'REPAIR_DATABASE_RECORD', 'REPAIR_DATABASE_SCOPE',
    'REPAIR_DATABASE_TIMEOUT', 'REPAIR_DATABASE_TLS', 'REPAIR_DATABASE_VIEW',
    'REPAIR_DB_FAILED', 'REPAIR_DB_TIMEOUT', 'REPAIR_DB_CLOSE_FAILED', 'REPAIR_EXPLICIT_NEW_TRUST_REQUIRED',
    'REPAIR_FAILED', 'REPAIR_FIRST_START_BINDING', 'REPAIR_FIRST_START_BUSY',
    'REPAIR_FIRST_START_CHANGED', 'REPAIR_FIRST_START_OWNER', 'REPAIR_FIRST_START_PATH',
    'REPAIR_HANDOFF_STATE', 'REPAIR_HOST_MIGRATION_UNSUPPORTED', 'REPAIR_INCOMPLETE_TRIAL_STOPPED',
    'REPAIR_INPUT_PATH', 'REPAIR_INSTALLED_KEY', 'REPAIR_INSTALLED_UNIT_CHANGED',
    'REPAIR_LICENSE_STORAGE', 'REPAIR_LOCK_INVALID', 'REPAIR_MAINTENANCE_IN_PROGRESS',
    'REPAIR_NEW_KEY_PIN', 'REPAIR_NO_INCOMPLETE_TRIAL', 'REPAIR_OLD_COORDINATOR_LIVE',
    'REPAIR_ORIGINAL_LOCK', 'REPAIR_ORIGINAL_LOCK_CHANGED', 'REPAIR_ORPHAN_PERMIT',
    'REPAIR_OTHER_MAINTENANCE', 'REPAIR_PRESERVED_CONFIG_CHANGED', 'REPAIR_PREVIOUS_RECOVERY',
    'REPAIR_QUIESCE_LOCK', 'REPAIR_QUIESCE_PERMIT_FAILED', 'REPAIR_QUIESCE_STOP_FAILED',
    'REPAIR_RECOVERY_REQUIRED', 'REPAIR_RELEASE_SCOPE', 'REPAIR_RETAINED_CHANGED',
    'REPAIR_RETAINED_JOURNAL', 'REPAIR_RETAINED_LOCK', 'REPAIR_RETAINED_RECORD',
    'REPAIR_RETAINED_STATE', 'REPAIR_SERVICE_COMMAND_FAILED', 'REPAIR_STATE_CHANGED',
    'REPAIR_STOP_NOT_CONFIRMED', 'REPAIR_SYSTEMD_INVOCATION_REQUIRED', 'REPAIR_TARGET_REQUIRED',
    'REPAIR_TRIAL_FAILED_RESTORED_STOPPED', 'REPAIR_UNEXPECTED_LICENSE_STORAGE', 'REPAIR_UNIT_SCOPE',
    'REPAIR_UNKNOWN_FIRST_START_STATE', 'REPAIR_UNTRUSTED_TOOL', 'REPAIR_USAGE',
    'REPAIR_WEB_INSTANCE_DISABLED',
    'REPAIR_R9_PROVENANCE_REQUIRED', 'REPAIR_ENROLLMENT_FAILED', 'REPAIR_ENROLLMENT_PLAN',
    'REPAIR_RUNTIME_PROCESSES', 'REPAIR_UPLOAD_UNIT', 'REPAIR_UPLOAD_BUSY',
]);
const FAILURE_REASONS = new Set(['input', 'deadline', 'transport', 'tls', 'response', 'size']);
const safeReason = reason => FAILURE_REASONS.has(reason) ? reason : null;
const safeCode = code => FAILURE_CODES.has(code) ? code : 'REPAIR_FAILED';
function failureOutput(error) {
    return { ok: false, code: safeCode(error?.code),
        failureStage: FAILURE_STAGES.has(error?.failureStage) ? error.failureStage : 'PREFLIGHT',
        failureCode: safeCode(error?.failureCode || error?.code), failureReason: safeReason(error?.failureReason || error?.reason), manualRecoveryRequired: error?.restoredPreviousActive !== true, restoredPreviousActive: error?.restoredPreviousActive === true };
}
const fail = code => { throw Object.assign(new Error(code), { code }); };
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join('|') === [...keys].sort().join('|');
function sync(directory) {
    const fd = fs.openSync(directory, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
    try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function validateState(state) {
    const baseline = BASES.find(base => Object.entries(base).every(([key, value]) => state?.[key] === value));
    if (!exact(state, ['schemaVersion', 'releaseId', 'sequence', 'nodeVersion', 'publicKeySha256', 'profile']) ||
        state.schemaVersion !== 1 || !baseline) fail('REPAIR_R9_BASELINE_REQUIRED');
    return baseline;
}
function validateBaselineDescription(row, baseline) {
    if (!row || row.releaseId !== baseline.releaseId || row.manifest.sequence !== baseline.sequence ||
        row.manifest.profile !== 'test' || row.manifest.releaseVersion !== '0.2.0-test.3' ||
        row.manifest.nodeVersion !== NODE_VERSION || JSON.stringify(row.manifest.platforms) !== '["linux-arm64"]') fail('REPAIR_RELEASE_SCOPE');
}
const isoDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
function validateCompletion(complete) {
    if (!exact(complete, ['schemaVersion', 'releaseId', 'setupId', 'completedAt', 'licenseConfigured', 'physicalControlEnabled']) ||
        complete.schemaVersion !== 1 || complete.releaseId !== COMPLETION_RELEASE ||
        !/^[a-f0-9]{32}$/.test(complete.setupId || '') || !isoDate(complete.completedAt) ||
        typeof complete.licenseConfigured !== 'boolean' || complete.physicalControlEnabled !== false) fail('REPAIR_COMPLETED_FIRST_START_REQUIRED');
    return true;
}
function validateProvenance(record) {
    if (!exact(record, ['schemaVersion', 'operation', 'operationId', 'invocationId', 'phase', 'failureStage',
        'failureCode', 'failureReason', 'previousReleaseId', 'targetSequence', 'targetReleaseId', 'at',
        'previousControllerState', 'physicalControlEnabled', 'productionReleaseApproved']) ||
        record.schemaVersion !== 1 || record.operation !== 'test-release-repair' || record.phase !== 'ACTIVE' ||
        !/^[a-f0-9-]{36}$/.test(record.operationId || '') || !/^[a-f0-9]{32}$/.test(record.invocationId || '') ||
        record.previousReleaseId !== COMPLETION_RELEASE || record.targetReleaseId !== BASES[0].releaseId ||
        record.targetSequence !== 12 || !isoDate(record.at) || record.previousControllerState !== 'active' ||
        record.failureStage !== null || record.failureCode !== null || record.failureReason !== null ||
        record.physicalControlEnabled !== false || record.productionReleaseApproved !== false) fail('REPAIR_R9_PROVENANCE_REQUIRED');
    return true;
}
function expectedProfileRow() {
    const bytes = Buffer.from(JSON.stringify(ownEnrollment.profileValue(), null, 2) + '\n');
    return { path: PROFILE_PATH, size: bytes.length, mode: 0o644, sha256: bundle.sha256(bytes) };
}
function expectedUploadRow(name = UPLOAD_PATH) {
    const bytes = fs.readFileSync(path.join(__dirname, '../..', UPLOAD_TEMPLATE_PATH));
    return { path: name, size: bytes.length, mode: 0o644, sha256: bundle.sha256(bytes) };
}
function validatePins(options) {
    if (!options || !/^[a-f0-9]{64}$/.test(options.expectedReleaseId || '') || !/^[a-f0-9]{64}$/.test(options.expectedKeySha256 || '') ||
        BASES.some(base => options.expectedReleaseId === base.releaseId || options.expectedKeySha256 === base.publicKeySha256)) fail('REPAIR_EXPLICIT_NEW_TRUST_REQUIRED');
    for (const key of ['bundleDirectory', 'publicKeyFile']) if (typeof options[key] !== 'string' ||
        !path.isAbsolute(options[key]) || path.resolve(options[key]) !== options[key]) fail('REPAIR_INPUT_PATH');
}
function validateTransition(previous, next, options) {
    const baseline = BASES.find(base => base.releaseId === previous?.releaseId);
    if (!baseline) fail('REPAIR_RELEASE_SCOPE');
    validateBaselineDescription(previous, baseline);
    if (next.releaseId !== options.expectedReleaseId || next.manifest.sequence !== TARGET_SEQUENCE ||
        next.manifest.profile !== 'test' || next.manifest.releaseVersion !== '0.2.0-test.3' ||
        next.manifest.nodeVersion !== NODE_VERSION || JSON.stringify(next.manifest.platforms) !== '["linux-arm64"]') fail('REPAIR_RELEASE_SCOPE');
    const oldRows = new Map(previous.manifest.files.map(row => [row.path, row]));
    const nextRows = new Map(next.manifest.files.map(row => [row.path, row]));
    product.assertCatalog(previous.catalog, product.MANAGEMENT_TEST);
    product.assertCatalog(next.catalog, product.OWN_ADAPTER_TEST);
    const expectedRows = new Map([expectedProfileRow(), expectedUploadRow(), expectedUploadRow(UPLOAD_TEMPLATE_PATH)].map(row => [row.path, row]));
    for (const [name, row] of expectedRows) if (!isDeepStrictEqual(nextRows.get(name), row)) fail('REPAIR_HOST_MIGRATION_UNSUPPORTED');
    const protectedFile = name => name === 'runtime/postgresql/schema.sql' || name.startsWith('system/');
    // This narrow R10 changes the four additional adapters, not Admin/UI. Their
    // uploaded asset bytes must remain exactly R9-compatible after a rollback;
    // include nested dependencies, file removal/addition and modes in the guard.
    const managementFile = name => ['app/node_modules/iobroker.eos-admin/', 'app/node_modules/iobroker.nexowatt-ui/']
        .some(prefix => name.startsWith(prefix));
    for (const name of new Set([...oldRows.keys(), ...nextRows.keys()])) {
        if (protectedFile(name) && !expectedRows.has(name) && !isDeepStrictEqual(oldRows.get(name), nextRows.get(name))) fail('REPAIR_HOST_MIGRATION_UNSUPPORTED');
        if (managementFile(name) && !isDeepStrictEqual(oldRows.get(name), nextRows.get(name))) fail('REPAIR_ADMISSION_CHANGE');
    }
    const extras = new Set(ownEnrollment.EXTRA_SPECS.map(row => row.name));
    const normalize = catalog => catalog.entries.map(({ sha256, ...row }) => row);
    const expected = normalize(previous.catalog).map(row => extras.has(row.id) ? { ...row, required: true,
        review: { ...row.review, status: 'approved-test', evidenceId: 'eos-own-adapters-native-20261015' } } : row);
    if (!isDeepStrictEqual(expected, normalize(next.catalog)) || next.catalog.catalogRevision !== 9 || previous.catalog.catalogRevision !== 8)
        fail('REPAIR_ADMISSION_CHANGE');
    return true;
}
function parseArgs(argv) {
    const names = { '--bundle': 'bundleDirectory', '--public-key': 'publicKeyFile',
        '--expected-release-id': 'expectedReleaseId', '--expected-key-sha256': 'expectedKeySha256' };
    if (argv.length !== 8) fail('REPAIR_USAGE');
    const options = {};
    for (let n = 0; n < argv.length; n += 2) {
        if (!Object.hasOwn(names, argv[n]) || Object.hasOwn(options, names[argv[n]]) || !argv[n + 1]) fail('REPAIR_USAGE');
        options[names[argv[n]]] = argv[n + 1];
    }
    validatePins(options); return options;
}
function invocationIdentity(value = process.env.INVOCATION_ID) {
    if (typeof value !== 'string' || !/^[a-f0-9]{32}$/.test(value)) fail('REPAIR_SYSTEMD_INVOCATION_REQUIRED');
    return value;
}
function quiesceIncomplete(effects, invocationId) {
    invocationIdentity(invocationId);
    let lock = effects.readLock();
    if (lock === null) return { status: 'REPAIR_NO_INCOMPLETE_TRIAL' };
    // Only a malformed, already ownership/type/link/mode-checked lock reaches
    // this sentinel. Never let an old journal override a valid foreign lock.
    if (lock === MALFORMED_PROTECTED_LOCK) {
        const journal = effects.readJournal();
        if (journal?.operation !== 'test-release-repair' || journal.invocationId !== invocationId ||
            !/^[a-f0-9-]{36}$/.test(journal.operationId || '') || !BASES.some(base => journal.previousReleaseId === base.releaseId) || journal.targetSequence !== TARGET_SEQUENCE ||
            !/^[a-f0-9]{64}$/.test(journal.targetReleaseId || '') ||
            !['PREPARED', 'ENROLLED', 'TRIAL', 'ACTIVE', 'RESTORED_ACTIVE', 'RESTORED_STOPPED', 'RECOVERY_REQUIRED'].includes(journal.phase)) fail('REPAIR_QUIESCE_LOCK');
        lock = journal;
    }
    // A second failed repair command must not stop another coordinator's trial.
    if (lock.operation !== 'test-release-repair' || lock.invocationId !== invocationId || lock.targetSequence !== TARGET_SEQUENCE) return { status: 'REPAIR_OTHER_MAINTENANCE' };
    let blocked = true;
    try { effects.block(); } catch { blocked = false; }
    try { effects.stop(); } catch { fail('REPAIR_QUIESCE_STOP_FAILED'); }
    if (!blocked) fail('REPAIR_QUIESCE_PERMIT_FAILED');
    return { status: 'REPAIR_INCOMPLETE_TRIAL_STOPPED', manualRecoveryRequired: true };
}
function quiesceHost() {
    if (process.getuid?.() !== 0) fail('REPAIR_TARGET_REQUIRED');
    const maintenance = require('../../runtime/release/maintenance.cjs');
    const lockPath = DIRECTORY + '/.activation.lock';
    return quiesceIncomplete({
        readLock: () => {
            rootOwned(DIRECTORY);
            try { fs.lstatSync(lockPath); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
            rootOwned(lockPath);
            const stat = fs.lstatSync(lockPath);
            if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.mode & 0o022) fail('REPAIR_QUIESCE_LOCK');
            const bytes = bundle.readFileLimited(lockPath, 8192).bytes;
            let lock;
            try { lock = JSON.parse(bytes); } catch { return MALFORMED_PROTECTED_LOCK; }
            if (!lock || Array.isArray(lock) || typeof lock !== 'object') return MALFORMED_PROTECTED_LOCK;
            return lock;
        },
        readJournal: () => {
            const file = DIRECTORY + '/test-own-adapters-status.json'; rootOwned(file);
            const stat = fs.lstatSync(file);
            if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.mode & 0o022) fail('REPAIR_QUIESCE_LOCK');
            return JSON.parse(bundle.readFileLimited(file, 8192).bytes);
        },
        block: () => maintenance.blockStart(DIRECTORY),
        stop: () => {
            if (!toolTrust('/usr/bin/systemctl').trusted) fail('REPAIR_UNTRUSTED_TOOL');
            const result = command('/usr/bin/systemctl', ['stop', SERVICE, UPLOAD_SERVICE], { timeout: 90000 });
            if (result.error || result.status !== 0) fail('REPAIR_QUIESCE_STOP_FAILED');
        },
    }, invocationIdentity());
}
async function readiness(releasePath, startedAt, setStage = () => {}) {
    const { readConfig } = require('../../security/verify-runtime-tls.cjs');
    const { assertRuntimeConfig } = require('../../runtime/bootstrap/initialize.cjs');
    const { clients } = require('../../runtime/transport/databases.cjs');
    const { waitAdapters, probeWeb } = require('./onboard-ui.cjs');
    const config = assertRuntimeConfig(readConfig(DIRECTORY + '/iobroker.json'));
    const requireApp = createRequire(path.join(releasePath, 'app/package.json'));
    const { States } = clients(requireApp, config);
    const silent = Object.fromEntries(['silly', 'debug', 'info', 'warn', 'error'].map(name => [name, () => {}]));
    let client, primaryError;
    try {
        setStage('DB_CONNECT');
        await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(Object.assign(new Error('REPAIR_DB_TIMEOUT'), { code: 'REPAIR_DB_TIMEOUT' })), 5000);
            try { client = new States({ connection: structuredClone(config.states), logger: silent,
                connected: () => { clearTimeout(timer); resolve(); }, disconnected: () => {}, change: () => {} }); }
            catch { clearTimeout(timer); reject(Object.assign(new Error('REPAIR_DB_FAILED'), { code: 'REPAIR_DB_FAILED' })); }
        });
        setStage('ADAPTER_HEARTBEAT');
        await waitAdapters(client, startedAt);
        const ca = bundle.readFileLimited(DIRECTORY + '/web/ca.crt', 16384).bytes;
        setStage('WEB_HTTPS');
        await Promise.all([8081, 8188].map(async port => {
            try { await probeWeb(port, ca); }
            catch (error) {
                const code = safeCode(error?.code);
                throw Object.assign(new Error(code), { code, failureStage: port === 8081 ? 'ADMIN_HTTPS' : 'UI_HTTPS',
                    failureReason: safeReason(error?.reason) });
            }
        }));
    } catch (error) { primaryError = error; throw error; }
    finally {
        if (client) {
            if (!primaryError) setStage('DB_CLOSE');
            try { await client.destroy(); } catch { if (!primaryError) fail('REPAIR_DB_CLOSE_FAILED'); }
        }
    }
}
// Root coordinator imports only the already signature-verified app. Each local
// PostgreSQL operation retains its configured bounded query/connect policy.
// The supervising systemd unit bounds the entire operation; a killed coordinator
// leaves its durable maintenance gate and plan instead of running unjournaled
// background mutations after an application-level Promise.race timeout.
async function withEnrollmentDatabase(releasePath, action) {
    const { readConfig } = require('../../security/verify-runtime-tls.cjs');
    const { assertRuntimeConfig } = require('../../runtime/bootstrap/initialize.cjs');
    const { clients } = require('../../runtime/transport/databases.cjs');
    const config = assertRuntimeConfig(readConfig(DIRECTORY + '/iobroker.json'));
    const selected = clients(createRequire(path.join(releasePath, 'app/package.json')), config);
    const openClients = [], silent = Object.fromEntries(['silly', 'debug', 'info', 'warn', 'error'].map(name => [name, () => {}]));
    const connect = (Client, connection) => new Promise((resolve, reject) => {
        let instance;
        const timer = setTimeout(() => reject(Object.assign(new Error('REPAIR_DB_TIMEOUT'), { code: 'REPAIR_DB_TIMEOUT' })), 5000);
        try {
            instance = new Client({ connection: structuredClone(connection), logger: silent,
                connected: () => { clearTimeout(timer); queueMicrotask(() => resolve(instance)); }, disconnected() {}, change() {} });
            openClients.push(instance);
        } catch { clearTimeout(timer); reject(Object.assign(new Error('REPAIR_DB_FAILED'), { code: 'REPAIR_DB_FAILED' })); }
    });
    let primary;
    try {
        const objects = await connect(selected.Objects, config.objects), states = await connect(selected.States, config.states);
        return await action({ objects, states, config });
    } catch (error) { primary = error; throw error; }
    finally {
        let closeFailed = false;
        for (const client of openClients.reverse()) {
            try { await client.destroy(); } catch { closeFailed = true; }
        }
        if (closeFailed && !primary) fail('REPAIR_DB_CLOSE_FAILED');
    }
}
function assertRuntimeStopped({ exec = command, owner = rootOwned, proc = '/proc', passwd = '/etc/passwd' } = {}) {
    owner(passwd);
    const account = bundle.readFileLimited(passwd, 1024 * 1024).bytes.toString('utf8').split('\n').filter(row => row.startsWith('eos-runtime:'));
    const uid = account.length === 1 ? Number(account[0].split(':')[2]) : NaN;
    if (!Number.isSafeInteger(uid) || uid <= 0) fail('REPAIR_RUNTIME_PROCESSES');
    for (const service of [SERVICE, UPLOAD_SERVICE]) {
        const result = exec('/usr/bin/systemctl', ['show', service, '--property=ActiveState', '--value'], { timeout: 5000 });
        if (result.error || result.status !== 0 || !['inactive', 'failed'].includes(result.stdout.trim())) fail('REPAIR_RUNTIME_PROCESSES');
    }
    const entries = fs.readdirSync(proc).filter(name => /^[0-9]+$/.test(name));
    if (entries.length > 16384) fail('REPAIR_RUNTIME_PROCESSES');
    for (const entry of entries) {
        let text;
        try { text = fs.readFileSync(path.join(proc, entry, 'status'), 'utf8'); }
        catch (error) { if (error.code === 'ENOENT' || error.code === 'ESRCH') continue; fail('REPAIR_RUNTIME_PROCESSES'); }
        if (text.length > 65536) fail('REPAIR_RUNTIME_PROCESSES');
        const row = /^Uid:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*$/m.exec(text);
        if (!row || row.slice(1).some(value => Number(value) === uid)) fail('REPAIR_RUNTIME_PROCESSES');
    }
}
const PASSIVE_HEALTH_KEYS = Object.freeze(['eebus.0.info.commissioningState', 'ocpp21.0.info.runtimeState',
    'nexowatt-backup.0.info.runtimeState']);
function passiveHealthReady(rows, startedAt, now = Date.now()) {
    if (!Number.isSafeInteger(startedAt) || !Number.isSafeInteger(now) || startedAt > now || now - startedAt > 300000 ||
        !Array.isArray(rows) || rows.length !== PASSIVE_HEALTH_KEYS.length ||
        rows.some(row => row?.ack !== true || !Number.isFinite(row.ts) || row.ts < startedAt || row.ts > now + 1000)) return false;
    if (rows[0].val !== 'waiting') return false;
    // All three are initially unconfigured and the two license-sensitive paths
    // use the same energy entitlement. Permit a coherently unlicensed test host,
    // never treat a live heartbeat plus a startup error as initialized service.
    return rows[1].val === 'awaiting_transport_enrollment' && rows[2].val === 'ready' ||
        rows[1].val === 'awaiting_license' && rows[2].val === 'waiting_license';
}
async function ownReadiness(releasePath, startedAt, setStage = () => {}) {
    await readiness(releasePath, startedAt, setStage);
    await withEnrollmentDatabase(releasePath, async ({ objects, states, config }) => {
        setStage('ADAPTER_HEARTBEAT');
        const until = Date.now() + 30000;
        do {
            const rows = await Promise.all(ownEnrollment.SPECS.map(spec => states.getState(`system.adapter.${spec.name}.0.alive`)));
            const now = Date.now();
            if (rows.every(row => row?.val === true && row.ack === true && Number.isFinite(row.ts) &&
                row.ts >= startedAt && row.ts <= now + 1000 && now - row.ts < 30000)) {
                const health = await Promise.all(PASSIVE_HEALTH_KEYS.map(key => states.getState(key)));
                if (passiveHealthReady(health, startedAt)) {
                    const result = await ownEnrollment.verify({ objects, config, app: path.join(releasePath, 'app') });
                    if (result.adaptersEnabled !== 6) fail('ONBOARD_ADAPTERS_NOT_READY');
                    return;
                }
            }
            await new Promise(resolve => setTimeout(resolve, 200));
        } while (Date.now() < until);
        fail('ONBOARD_ADAPTERS_NOT_READY');
    });
}
// Dependency boundary is only exported for fault-injection tests. No CLI flag
// changes root paths, service commands, platform, owners or verification logic.
async function update(options, dependencies = {}) {
    let failureStage = 'PREFLIGHT';
    const setStage = value => { if (!FAILURE_STAGES.has(value)) fail('REPAIR_FAILED'); failureStage = value; };
    try {
    validatePins(options);
    const invocationId = invocationIdentity(dependencies.invocationId);
    if ((dependencies.uid ?? process.getuid?.()) !== 0 || (dependencies.platform || `${process.platform}-${process.arch}`) !== 'linux-arm64' ||
        (dependencies.nodeVersion || process.versions.node) !== NODE_VERSION) fail('REPAIR_TARGET_REQUIRED');
    const at = value => path.join(dependencies.root || '/', value);
    const owner = dependencies.ownerCheck || rootOwned;
    const exec = dependencies.exec || command;
    const write = dependencies.atomicWrite || atomicWrite;
    const maintenance = dependencies.maintenance || require('../../runtime/release/maintenance.cjs');
    const stateFile = at(DIRECTORY + '/release-state.json'), current = at('/opt/nexowatt/eos/current');
    const lockPath = at(DIRECTORY + '/.activation.lock'), journal = at(DIRECTORY + '/test-own-adapters-status.json');
    const releaseRoot = at('/opt/nexowatt/eos/releases'), proofRoot = at('/opt/nexowatt/eos/verified');
    const nextPath = path.join(releaseRoot, options.expectedReleaseId);
    const nextTarget = '/opt/nexowatt/eos/releases/' + options.expectedReleaseId;
    const run = args => {
        // The fixed upload oneshot has TimeoutStartSec=240 and performs source
        // verification plus bounded asset readback. Allow systemd to report its
        // own terminal state; do not abort a legitimate Pi upload after 90s.
        const uploadStart = args.length === 2 && args[0] === 'start' && args[1] === UPLOAD_SERVICE;
        const result = exec('/usr/bin/systemctl', args, { timeout: uploadStart ? 270000 : 90000 });
        if (result.error || result.status !== 0) fail('REPAIR_SERVICE_COMMAND_FAILED');
        return result.stdout.trim();
    };
    const database = dependencies.withEnrollmentDatabase || withEnrollmentDatabase;
    const enrollment = dependencies.ownEnrollment || ownEnrollment;
    const stopped = dependencies.assertRuntimeStopped || (() => assertRuntimeStopped({ exec, owner }));
    const read = file => { owner(file); return bundle.readFileLimited(file, 1024 * 1024).bytes; };
    const inspect = dependencies.inspectInstalled || ((releasePath, expectedKey) => {
        const evidencePath = path.join(proofRoot, path.basename(releasePath));
        checkInstalled({ releasePath, evidencePath, expectedNodeVersion: NODE_VERSION, expectedPlatform: 'linux-arm64', ownerCheck: owner });
        if (bundle.sha256(read(path.join(evidencePath, 'release-public.pem'))) !== expectedKey) fail('REPAIR_INSTALLED_KEY');
        const manifestPath = path.join(evidencePath, 'manifest.json'); owner(manifestPath);
        const manifest = JSON.parse(bundle.readFileLimited(manifestPath, 16 * 1024 * 1024).bytes);
        return { releaseId: path.basename(releasePath), manifest, ...validatePayload(releasePath, manifest) };
    });
    for (const file of [at(DIRECTORY), path.dirname(current), releaseRoot, proofRoot]) owner(file);
    if (fs.existsSync(at(DIRECTORY + '/maintenance-start.json'))) fail('REPAIR_ORPHAN_PERMIT');
    for (const file of ['/usr/bin/systemctl', '/usr/bin/node'])
        if (!(dependencies.toolTrust || toolTrust)(file)?.trusted) fail('REPAIR_UNTRUSTED_TOOL');
    const original = read(stateFile), baseline = validateState(JSON.parse(original));
    const oldPath = path.join(releaseRoot, baseline.releaseId);
    const oldTarget = '/opt/nexowatt/eos/releases/' + baseline.releaseId;
    const assertPointer = expected => {
        const stat = fs.lstatSync(current);
        if (!stat.isSymbolicLink() || stat.uid !== (dependencies.ownerUid ?? 0) || fs.readlinkSync(current) !== expected) fail('REPAIR_CURRENT_CHANGED');
    };
    assertPointer(oldTarget);
    const completionPath = at(DIRECTORY + '/first-start-complete.json');
    const completionBytes = read(completionPath), complete = JSON.parse(completionBytes);
    validateCompletion(complete, baseline);
    validateProvenance(JSON.parse(read(at(DIRECTORY + '/test-update-r9-status.json'))));
    owner(at('/var/lib/nexowatt-eos/.initialized'));
    const previous = inspect(oldPath, baseline.publicKeySha256);
    validateBaselineDescription(previous, baseline);
    setStage('SOURCE_VERIFY');
    const key = bundle.validatePublicKey(read(options.publicKeyFile));
    if (bundle.sha256(key) !== options.expectedKeySha256) fail('REPAIR_NEW_KEY_PIN');
    (dependencies.trustedImport || trustedImport)(options.bundleDirectory);
    const verifyOptions = { bundleDirectory: options.bundleDirectory, publicKey: key, minimumSequence: baseline.sequence,
        platform: 'linux-arm64', nodeVersion: NODE_VERSION };
    const candidate = (dependencies.verifyBundle || bundle.verifyBundle)(verifyOptions);
    const next = { ...candidate, ...(dependencies.validatePayload || validatePayload)(candidate.payloadPath, candidate.manifest) };
    validateTransition(previous, next, options);
    const uploadUnitPath = at('/etc/systemd/system/' + UPLOAD_SERVICE);
    const uploadOriginal = read(uploadUnitPath);
    const uploadNext = read(path.join(next.payloadPath, UPLOAD_PATH));
    if (bundle.sha256(uploadNext) !== expectedUploadRow().sha256) fail('REPAIR_UPLOAD_UNIT');
    for (const row of previous.manifest.files.filter(item => item.path.startsWith('system/postgresql-test/systemd/'))) {
        if (!row.path.endsWith('.service') && !row.path.endsWith('.timer') && !row.path.endsWith('.target') && !row.path.endsWith('.path')) fail('REPAIR_UNIT_SCOPE');
        const bytes = read(at('/etc/systemd/system/' + path.basename(row.path)));
        if (bundle.sha256(bytes) !== row.sha256) fail('REPAIR_INSTALLED_UNIT_CHANGED');
    }
    const preserved = new Map(PRESERVED.map(name => [at(DIRECTORY + '/' + name), read(at(DIRECTORY + '/' + name))]));
    preserved.set(completionPath, completionBytes);
    const assertPreserved = () => {
        for (const [file, bytes] of preserved) if (!read(file).equals(bytes)) fail('REPAIR_PRESERVED_CONFIG_CHANGED');
    };
    run(['is-active', '--quiet', 'nexowatt-eos-postgresql.service']);
    const serviceState = run(['show', SERVICE, '--property=ActiveState', '--value']);
    if (serviceState !== 'active') fail('REPAIR_CONTROLLER_BUSY');
    if (!['inactive', 'failed'].includes(run(['show', UPLOAD_SERVICE, '--property=ActiveState', '--value']))) fail('REPAIR_UPLOAD_BUSY');
    setStage('BASELINE_READINESS');
    await (dependencies.readiness || readiness)(oldPath, Date.now(), setStage);
    assertPointer(oldTarget); assertPreserved();
    if (!read(stateFile).equals(original)) fail('REPAIR_STATE_CHANGED');
    const operationId = crypto.randomUUID();
    const lockRecord = JSON.stringify({ operation: 'test-release-repair', operationId, invocationId, pid: process.pid,
        previousReleaseId: baseline.releaseId, targetSequence: TARGET_SEQUENCE, targetReleaseId: options.expectedReleaseId }) + '\n';
    const guardPath = at(DIRECTORY + '/.test-own-adapters.guard');
    const planPath = at(DIRECTORY + '/test-own-adapters-plan.json');
    try { fs.lstatSync(planPath); fail('REPAIR_ENROLLMENT_PLAN'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const privateRecord = file => {
        owner(file);
        const stat = fs.lstatSync(file);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.mode & 0o077) fail('REPAIR_LOCK_INVALID');
        return bundle.readFileLimited(file, 8192).bytes;
    };
    const ownRecord = file => privateRecord(file).equals(Buffer.from(lockRecord));
    const assertOwnLock = () => {
        if (!ownRecord(lockPath) || !ownRecord(guardPath)) fail('REPAIR_COORDINATOR_OWNERSHIP_CHANGED');
    };
    if (fs.existsSync(guardPath)) fail('REPAIR_MAINTENANCE_IN_PROGRESS');
    let lock, guard, transitioned = false, guardRemoved = false, newState, migrationPlan = null, planBytes = null;
    const checkPlan = () => {
        if (!planBytes) fail('REPAIR_ENROLLMENT_PLAN');
        owner(planPath);
        const stat = fs.lstatSync(planPath);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || (stat.mode & 0o077) ||
            !bundle.readFileLimited(planPath, 1024 * 1024).bytes.equals(planBytes)) fail('REPAIR_ENROLLMENT_PLAN');
    };
    const checkUpload = expected => { if (!read(uploadUnitPath).equals(expected)) fail('REPAIR_UPLOAD_UNIT'); };
    const report = (phase, failure = null) => write(journal, JSON.stringify({ schemaVersion: 1, operation: 'test-release-repair', operationId, invocationId,
        phase, failureStage: failure?.failureStage ?? null, failureCode: failure?.failureCode ?? null, failureReason: failure?.failureReason ?? null,
        previousReleaseId: baseline.releaseId, targetSequence: TARGET_SEQUENCE, targetReleaseId: options.expectedReleaseId, at: new Date().toISOString(),
        previousControllerState: serviceState, initialConfiguration: 'unconfigured-no-physical-targets',
        enrollmentPlanSha256: planBytes ? bundle.sha256(planBytes) : null,
        physicalControlEnabled: false, productionReleaseApproved: false }) + '\n');
    function switchPointer(expected, target) {
        assertPointer(expected);
        const temporary = path.join(path.dirname(current), '.repair-current-' + crypto.randomBytes(12).toString('hex'));
        fs.symlinkSync(target, temporary);
        try { fs.renameSync(temporary, current); sync(path.dirname(current)); }
        finally { try { fs.unlinkSync(temporary); } catch (error) { if (error.code !== 'ENOENT') throw error; } }
    }
    function createGate(file) {
        const fd = fs.openSync(file, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW, 0o600);
        try { fs.writeFileSync(fd, lockRecord); fs.fsyncSync(fd); sync(path.dirname(file)); }
        catch (error) { fs.closeSync(fd); throw error; }
        return fd;
    }
    function removeOwnGates() {
        assertOwnLock();
        fs.unlinkSync(lockPath); sync(path.dirname(lockPath));
        if (lock !== undefined) { const fd = lock; lock = undefined; fs.closeSync(fd); }
        if (!ownRecord(guardPath)) fail('REPAIR_COORDINATOR_OWNERSHIP_CHANGED');
        fs.unlinkSync(guardPath); guardRemoved = true; sync(path.dirname(guardPath));
        if (guard !== undefined) { const fd = guard; guard = undefined; fs.closeSync(fd); }
    }
    // Recover a possibly unlinked gate after a directory fsync error. Only our
    // durable guard (or our just-removed guard) authorizes recreating it.
    function ensureOwnGates() {
        let durable = true;
        const mayRebuild = guardRemoved && !fs.existsSync(guardPath) || ownRecord(guardPath);
        if (!mayRebuild) fail('REPAIR_COORDINATOR_OWNERSHIP_CHANGED');
        // Reconstruct the boot gate FIRST. A later guard write/fsync failure
        // must never leave startup permitted after a failed unlock.
        if (!fs.existsSync(lockPath)) {
            if (lock !== undefined) { const fd = lock; lock = undefined; fs.closeSync(fd); }
            try { lock = createGate(lockPath); } catch { durable = false; }
        }
        if (guardRemoved && !fs.existsSync(guardPath)) {
            if (guard !== undefined) { const fd = guard; guard = undefined; fs.closeSync(fd); }
            try { guard = createGate(guardPath); } catch { durable = false; }
        }
        assertOwnLock();
        return durable;
    }
    try {
        try { lock = createGate(lockPath); }
        catch (error) { if (error.code === 'EEXIST') fail('REPAIR_MAINTENANCE_IN_PROGRESS'); throw error; }
        try { guard = createGate(guardPath); }
        catch (error) { if (error.code === 'EEXIST') fail('REPAIR_MAINTENANCE_IN_PROGRESS'); throw error; }
        assertOwnLock();
        if (!read(stateFile).equals(original)) fail('REPAIR_STATE_CHANGED');
        assertPointer(oldTarget); assertPreserved();
        setStage('STAGE');
        if (fs.existsSync(nextPath)) inspect(nextPath, options.expectedKeySha256);
        else {
            (dependencies.stageBundle || bundle.stageBundle)({ ...verifyOptions, releasesDirectory: releaseRoot });
            const proof = path.join(proofRoot, options.expectedReleaseId); fs.mkdirSync(proof, { mode: 0o755 });
            for (const name of ['manifest.json', 'manifest.sig']) {
                const bytes = bundle.readFileLimited(path.join(options.bundleDirectory, name), 16 * 1024 * 1024).bytes;
                privateWrite(path.join(proof, name), bytes, 0o644);
            }
            privateWrite(path.join(proof, 'release-public.pem'), key, 0o644);
            sync(proof); sync(proofRoot);
            inspect(nextPath, options.expectedKeySha256);
        }
        setStage('NATIVE_PROBE');
        const native = (dependencies.nativeProbe || probeNativeForInstallation)(nextPath, 'linux-arm64');
        if (native?.passed !== true) fail('REPAIR_NATIVE_PROBE_FAILED');
        write(path.join(proofRoot, options.expectedReleaseId, 'native-acceptance.json'), JSON.stringify(native) + '\n');
        setStage('PREPARED'); report('PREPARED');
        assertOwnLock(); assertPointer(oldTarget); assertPreserved();
        if (!read(stateFile).equals(original)) fail('REPAIR_STATE_CHANGED');
        if (run(['show', SERVICE, '--property=ActiveState', '--value']) !== 'active') fail('REPAIR_CONTROLLER_BUSY');
        // A failed stop can already alter service state. From here retain the
        // gate until the new release or an authenticated healthy R9 is proven.
        transitioned = true; setStage('STOP');
        run(['stop', SERVICE]);
        if (!['inactive', 'failed'].includes(run(['show', SERVICE, '--property=ActiveState', '--value']))) fail('REPAIR_STOP_NOT_CONFIRMED');
        stopped(); checkUpload(uploadOriginal);
        assertOwnLock(); assertPreserved(); if (!read(stateFile).equals(original)) fail('REPAIR_STATE_CHANGED');
        setStage('ENROLLMENT_PLAN');
        await database(nextPath, async ({ objects, states, config }) => {
            const plan = await enrollment.planMigration({ objects, states, config,
                sourceApp: path.join(oldPath, 'app'), targetApp: path.join(nextPath, 'app'),
                sourceReleaseId: baseline.releaseId, targetReleaseId: options.expectedReleaseId,
                operationId: operationId.replace(/-/g, '') });
            assertOwnLock(); assertPointer(oldTarget); assertPreserved(); stopped(); checkUpload(uploadOriginal);
            const bytes = Buffer.from(JSON.stringify({ schemaVersion: 1, operationId, invocationId,
                sourceReleaseId: baseline.releaseId, targetReleaseId: options.expectedReleaseId,
                previousUploadUnitSha256: bundle.sha256(uploadOriginal), previousUploadUnitBase64: uploadOriginal.toString('base64'),
                targetUploadUnitSha256: bundle.sha256(uploadNext), enrollment: plan }) + '\n');
            if (bytes.length > 1024 * 1024) fail('REPAIR_ENROLLMENT_PLAN');
            (dependencies.privateWrite || privateWrite)(planPath, bytes, 0o600); sync(path.dirname(planPath));
            planBytes = bytes; migrationPlan = plan; checkPlan();
            setStage('ENROLLMENT_APPLY');
            await enrollment.applyMigration({ objects, states, config, targetApp: path.join(nextPath, 'app'), plan,
                checkpoint: async checked => {
                    if (!isDeepStrictEqual(checked, migrationPlan)) fail('REPAIR_ENROLLMENT_PLAN');
                    assertOwnLock(); assertPointer(oldTarget); assertPreserved(); stopped(); checkPlan();
                    if (!read(stateFile).equals(original)) fail('REPAIR_STATE_CHANGED');
                } });
        });
        checkPlan(); report('ENROLLED');
        setStage('UPLOAD_UNIT'); assertOwnLock(); stopped(); checkUpload(uploadOriginal);
        write(uploadUnitPath, uploadNext); checkUpload(uploadNext); run(['daemon-reload']);
        setStage('TRIAL'); switchPointer(oldTarget, nextTarget);
        newState = Buffer.from(JSON.stringify({ ...JSON.parse(original), releaseId: options.expectedReleaseId,
            sequence: TARGET_SEQUENCE, publicKeySha256: options.expectedKeySha256 }) + '\n');
        // Required before any trial start: new adapters validate active state,
        // current pointer and their own actual release entrypoint together.
        if (!read(stateFile).equals(original)) fail('REPAIR_STATE_CHANGED');
        write(stateFile, newState); report('TRIAL');
        assertOwnLock(); assertPointer(nextTarget); assertPreserved();
        checkPlan(); checkUpload(uploadNext); stopped();
        setStage('ASSET_UPLOAD');
        run(['reset-failed', UPLOAD_SERVICE]); run(['start', UPLOAD_SERVICE]); stopped();
        assertOwnLock(); assertPointer(nextTarget); assertPreserved(); checkPlan(); checkUpload(uploadNext);
        maintenance.authorizeStart(at(DIRECTORY), 'test-release-repair');
        const startedAt = Date.now();
        setStage('CONTROLLER_START');
        run(['reset-failed', SERVICE]); run(['start', SERVICE]); run(['is-active', '--quiet', SERVICE]);
        await (dependencies.ownReadiness || ownReadiness)(nextPath, startedAt, setStage);
        setStage('VERIFY_LIVE'); assertOwnLock(); assertPointer(nextTarget); assertPreserved();
        checkPlan(); checkUpload(uploadNext);
        if (!read(stateFile).equals(newState)) fail('REPAIR_STATE_CHANGED');
        maintenance.blockStart(at(DIRECTORY));
        setStage('ACTIVE_REPORT'); report('ACTIVE');
        setStage('UNLOCK'); removeOwnGates();
        return { ok: true, phase: 'SIX_OWN_ADAPTER_TEST_ACTIVE', releaseId: options.expectedReleaseId, sequence: TARGET_SEQUENCE,
            adaptersEnabled: 6, initialConfiguration: 'unconfigured-no-physical-targets',
            hardwareTested: false, physicalControlEnabled: false, productionReleaseApproved: false };
    } catch (error) {
        const failure = { failureStage: FAILURE_STAGES.has(error?.failureStage) ? error.failureStage : failureStage,
            failureCode: safeCode(error?.code), failureReason: safeReason(error?.failureReason || error?.reason) };
        if (transitioned) {
            let restored = false, activeRestored = false, gated = false, gatesDurable = false;
            try { gatesDurable = ensureOwnGates(); gated = true; } catch { /* never replace a foreign coordinator */ }
            if (!gated) {
                // An unavailable recovery guard still must not leave our own
                // trial running when the activation gate is provably ours.
                try {
                    if (ownRecord(lockPath)) {
                        try { maintenance.blockStart(at(DIRECTORY)); } catch { /* still stop */ }
                        run(['stop', SERVICE, UPLOAD_SERVICE]);
                    }
                } catch { /* foreign/unreadable ownership never authorizes changes */ }
            }
            if (gated) {
                try { maintenance.blockStart(at(DIRECTORY)); } catch { /* stop still required */ }
                try {
                    run(['stop', SERVICE, UPLOAD_SERVICE]);
                    if (!['inactive', 'failed'].includes(run(['show', SERVICE, '--property=ActiveState', '--value']))) fail('REPAIR_STOP_NOT_CONFIRMED');
                    assertOwnLock(); stopped(); assertPreserved();
                    const stateNow = read(stateFile);
                    if (!stateNow.equals(original) && (!newState || !stateNow.equals(newState))) fail('REPAIR_STATE_CHANGED');
                    if (migrationPlan) {
                        checkPlan(); setStage('ENROLLMENT_ROLLBACK');
                        await database(nextPath, async ({ objects, states, config }) => {
                            await enrollment.rollbackMigration({ objects, states, config, sourceApp: path.join(oldPath, 'app'),
                                targetApp: path.join(nextPath, 'app'), plan: migrationPlan });
                        });
                        checkPlan(); stopped(); assertOwnLock(); assertPreserved();
                    }
                    setStage('UPLOAD_ROLLBACK');
                    const unitNow = read(uploadUnitPath);
                    if (!unitNow.equals(uploadOriginal) && !unitNow.equals(uploadNext)) fail('REPAIR_UPLOAD_UNIT');
                    if (!unitNow.equals(uploadOriginal)) write(uploadUnitPath, uploadOriginal);
                    checkUpload(uploadOriginal); run(['daemon-reload']);
                    const target = fs.readlinkSync(current);
                    if (target === nextTarget) switchPointer(nextTarget, oldTarget);
                    else assertPointer(oldTarget);
                    if (!read(stateFile).equals(stateNow)) fail('REPAIR_STATE_CHANGED');
                    if (!stateNow.equals(original)) write(stateFile, original);
                    restored = gatesDurable;
                    if (!gatesDurable) fail('REPAIR_LOCK_INVALID');
                    // Restart is allowed only for this authenticated formerly
                    // healthy R9 with all protected configuration still exact.
                    assertPreserved(); assertOwnLock();
                    validateBaselineDescription(inspect(oldPath, baseline.publicKeySha256), baseline);
                    maintenance.authorizeStart(at(DIRECTORY), 'test-release-repair');
                    setStage('ROLLBACK_START');
                    const restoredAt = Date.now();
                    run(['reset-failed', SERVICE]); run(['start', SERVICE]); run(['is-active', '--quiet', SERVICE]);
                    setStage('ROLLBACK_READINESS');
                    await (dependencies.readiness || readiness)(oldPath, restoredAt, setStage);
                    assertOwnLock(); assertPointer(oldTarget); assertPreserved();
                    if (!read(stateFile).equals(original)) fail('REPAIR_STATE_CHANGED');
                    maintenance.blockStart(at(DIRECTORY));
                    report('RESTORED_ACTIVE', failure);
                    removeOwnGates(); activeRestored = true;
                } catch {
                    // No claim of a working fallback on any journal, fsync,
                    // ownership, configuration, startup or readiness failure.
                    try { gatesDurable = ensureOwnGates(); gated = true; } catch { gated = false; }
                    if (gated) {
                        try { maintenance.blockStart(at(DIRECTORY)); } catch { /* still try stopping */ }
                        try {
                            run(['stop', SERVICE, UPLOAD_SERVICE]);
                            if (!['inactive', 'failed'].includes(run(['show', SERVICE, '--property=ActiveState', '--value'])) || !gatesDurable) restored = false;
                        } catch { restored = false; }
                    } else restored = false;
                }
            }
            if (!activeRestored) {
                try { if (gated) report(restored ? 'RESTORED_STOPPED' : 'RECOVERY_REQUIRED', failure); } catch { /* own gate remains */ }
            }
            const code = activeRestored ? 'REPAIR_TRIAL_FAILED_RESTORED_ACTIVE' : restored ? 'REPAIR_TRIAL_FAILED_RESTORED_STOPPED' : 'REPAIR_RECOVERY_REQUIRED';
            throw Object.assign(new Error(code), { code, ...failure, restoredPreviousActive: activeRestored });
        }
        // Pretrial failures leave the active baseline running. Remove only
        // records belonging to this exact invocation; foreign bytes stay intact.
        for (const file of [lockPath, guardPath]) {
            try { if (ownRecord(file)) { fs.unlinkSync(file); sync(path.dirname(file)); } } catch { /* retained gate requires diagnosis */ }
        }
        throw Object.assign(new Error(failure.failureCode), { code: failure.failureCode, ...failure });
    } finally {
        if (lock !== undefined) fs.closeSync(lock);
        if (guard !== undefined) fs.closeSync(guard);
    }
    } catch (error) {
        const code = safeCode(error?.code);
        throw Object.assign(new Error(code), { code, restoredPreviousActive: error?.restoredPreviousActive === true,
            failureStage: FAILURE_STAGES.has(error?.failureStage) ? error.failureStage : failureStage,
            failureCode: safeCode(error?.failureCode || error?.code), failureReason: safeReason(error?.failureReason || error?.reason) });
    }
}
module.exports = { BASES, TARGET_SEQUENCE, COMPLETION_RELEASE, PRESERVED, PROFILE_PATH, UPLOAD_PATH, UPLOAD_TEMPLATE_PATH,
    MALFORMED_PROTECTED_LOCK, parseArgs, validatePins, validateState, expectedProfileRow, expectedUploadRow,
    validateBaselineDescription, validateCompletion, validateProvenance, validateTransition, invocationIdentity, quiesceIncomplete, quiesceHost,
    readiness, ownReadiness, withEnrollmentDatabase, assertRuntimeStopped, PASSIVE_HEALTH_KEYS, passiveHealthReady, failureOutput, update };
if (require.main === module) {
    const previousUmask = process.umask(0o022);
    const argv = process.argv.slice(2);
    Promise.resolve().then(() => argv.length === 1 && argv[0] === '--quiesce-incomplete' ? quiesceHost() : update(parseArgs(argv)))
        .then(result => process.stdout.write(JSON.stringify(result) + '\n'))
        .catch(error => { process.stderr.write(JSON.stringify(failureOutput(error)) + '\n'); process.exitCode = 1; })
        .finally(() => process.umask(previousUmask));
}
