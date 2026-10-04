'use strict';
// Retry only the authenticated R4 state restored by the published R7 attempt.
// Existing password, UUID, license, database and handoff remain unchanged.
// The separate immutable entry must pin the new signed release AND its key.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const bundle = require('../../runtime/release/bundle.cjs');
const { rootOwned, checkInstalled } = require('../../runtime/release/installed-check.cjs');
const { trustedImport, probeNativeForInstallation } = require('./eos-base.cjs');
const { validatePayload } = require('./build-bundle.cjs');
const { command, toolTrust } = require('./host-preflight.cjs');
const { privateWrite } = require('./install-host.cjs');
const historical = require('./recover-r4-first-start-to-r7.cjs');
const { BASES, PRESERVED, MALFORMED_PROTECTED_LOCK, validateState, validateBaselineDescription,
    validateFirstStartLock, invocationIdentity, verifyFirstStart } = historical;
const RETAINED_R7 = Object.freeze({
    releaseId: 'd400cab68939e60e22b619b78b3ecc4a4043afbfe6e21696934db42ba586d5a3',
    publicKeySha256: 'a6a11d0d02b058a15d78a1aa81a22e488d120ee3ab9f11e1bd35a3aafad6d522', sequence: 10, revision: 7, phase: 'RESTORED_STOPPED',
});
const NODE_VERSION = '24.21.0';
const TARGET_SEQUENCE = 11;
const SERVICE = 'nexowatt-eos-controller.service';
const PREVIOUS_SERVICE = 'nexowatt-eos-first-start-recovery-r7.service';
const DIRECTORY = '/etc/nexowatt-eos';
const FAILURE_STAGES = new Set(['PREFLIGHT', 'SOURCE_VERIFY', 'STAGE', 'NATIVE_PROBE', 'PREPARED', 'ADOPT_LOCK', 'STOP',
    'TRIAL', 'CONTROLLER_START', 'DB_CONNECT', 'DB_CLOSE', 'ADAPTER_HEARTBEAT', 'WEB_HTTPS', 'ADMIN_HTTPS', 'UI_HTTPS', 'VERIFY_LIVE', 'COMPLETION',
    'BOOT_CONFIGURATION', 'ACTIVE_REPORT', 'UNLOCK']);
const FAILURE_CODES = new Set([
    'REPAIR_FAILED_R4_FIRST_START_REQUIRED',
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
]);
const FAILURE_REASONS = new Set(['input', 'deadline', 'transport', 'tls', 'response', 'size']);
const safeReason = reason => FAILURE_REASONS.has(reason) ? reason : null;
const safeCode = code => FAILURE_CODES.has(code) ? code : 'REPAIR_FAILED';
function failureOutput(error) {
    return { ok: false, code: safeCode(error?.code),
        failureStage: FAILURE_STAGES.has(error?.failureStage) ? error.failureStage : 'PREFLIGHT',
        failureCode: safeCode(error?.failureCode || error?.code), failureReason: safeReason(error?.failureReason || error?.reason), manualRecoveryRequired: true };
}
const fail = code => { throw Object.assign(new Error(code), { code }); };
const exists = file => { try { fs.lstatSync(file); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join('|') === [...keys].sort().join('|');
function sync(directory) {
    const fd = fs.openSync(directory, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
    try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function atomicWrite(file, content) {
    const temp = path.join(path.dirname(file), '.eos-recovery-' + crypto.randomBytes(12).toString('hex'));
    const privateMode = ['.activation.lock', 'first-start-recovery-r8.json'].includes(path.basename(file));
    const fd = fs.openSync(temp, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, privateMode ? 0o600 : 0o644);
    try { fs.writeFileSync(fd, content); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    try { fs.renameSync(temp, file); sync(path.dirname(file)); }
    finally { if (exists(temp)) fs.unlinkSync(temp); }
}
function validatePins(options) {
    historical.validatePins(options);
    if (options.expectedReleaseId === RETAINED_R7.releaseId || options.expectedKeySha256 === RETAINED_R7.publicKeySha256) fail('REPAIR_EXPLICIT_NEW_TRUST_REQUIRED');
}
function parseArgs(argv) {
    const options = historical.parseArgs(argv);
    validatePins(options); return options;
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
    const protectedFile = name => name === 'runtime/postgresql/schema.sql' || name.startsWith('system/');
    for (const name of new Set([...oldRows.keys(), ...nextRows.keys()])) {
        if (protectedFile(name) && JSON.stringify(oldRows.get(name)) !== JSON.stringify(nextRows.get(name))) fail('REPAIR_HOST_MIGRATION_UNSUPPORTED');
    }
    const scope = catalog => catalog.entries.map(({ sha256, version, ...row }) => row);
    if (JSON.stringify(scope(previous.catalog)) !== JSON.stringify(scope(next.catalog))) fail('REPAIR_ADMISSION_CHANGE');
    return true;
}
function privateRecord(file, owner, limit = 16384) {
    owner(file);
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.mode & 0o077) fail('REPAIR_RETAINED_RECORD');
    return bundle.readFileLimited(file, limit).bytes;
}
function decodeOriginal(value) {
    if (typeof value !== 'string' || value.length > 8192 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) fail('REPAIR_RETAINED_RECORD');
    const bytes = Buffer.from(value, 'base64');
    if (bytes.toString('base64') !== value || bytes.length > 4096) fail('REPAIR_RETAINED_RECORD');
    return bytes;
}
function validateRetainedR7({ journalBytes, guardBytes, lockBytes, stateBytes }, currentInvocation) {
    const journal = JSON.parse(journalBytes), lock = JSON.parse(lockBytes);
    if (!lockBytes.equals(guardBytes) ||
        !exact(lock, ['operation', 'operationId', 'invocationId', 'pid', 'previousReleaseId', 'targetSequence', 'targetReleaseId']) ||
        lock.operation !== 'test-release-repair' || lock.previousReleaseId !== BASES[0].releaseId ||
        lock.targetReleaseId !== RETAINED_R7.releaseId || lock.targetSequence !== RETAINED_R7.sequence ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(lock.operationId || '') ||
        !/^[a-f0-9]{32}$/.test(lock.invocationId || '') || lock.invocationId === currentInvocation ||
        !Number.isSafeInteger(lock.pid) || lock.pid < 2 || lock.pid > 2147483647) fail('REPAIR_RETAINED_LOCK');
    if (!exact(journal, ['schemaVersion', 'operation', 'operationId', 'invocationId', 'phase', 'originalLockBase64',
        'originalStateBase64', 'previousReleaseId', 'targetSequence', 'targetReleaseId', 'at', 'previousControllerState',
        'physicalControlEnabled', 'productionReleaseApproved']) ||
        journal.schemaVersion !== 1 || journal.phase !== RETAINED_R7.phase ||
        !['operation', 'operationId', 'invocationId', 'previousReleaseId', 'targetSequence', 'targetReleaseId'].every(name => journal[name] === lock[name]) ||
        !['inactive', 'failed'].includes(journal.previousControllerState) ||
        journal.physicalControlEnabled !== false || journal.productionReleaseApproved !== false ||
        typeof journal.at !== 'string' || !Number.isFinite(Date.parse(journal.at)) || new Date(journal.at).toISOString() !== journal.at) fail('REPAIR_RETAINED_JOURNAL');
    const originalState = decodeOriginal(journal.originalStateBase64);
    validateState(JSON.parse(originalState));
    if (!originalState.equals(stateBytes)) fail('REPAIR_RETAINED_STATE');
    const originalLock = decodeOriginal(journal.originalLockBase64);
    const onboardingLock = validateFirstStartLock(JSON.parse(originalLock), BASES[0].releaseId);
    if ([lock.invocationId, currentInvocation].includes(onboardingLock.invocationId)) fail('REPAIR_RETAINED_LOCK');
    return { journal, lock, onboardingLock, originalLock, originalState };
}
function processExists(pid) {
    try { fs.lstatSync('/proc/' + pid); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
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
            !['PREPARED', 'TRIAL', 'ACTIVE', 'RESTORED_STOPPED', 'RECOVERY_REQUIRED'].includes(journal.phase)) fail('REPAIR_QUIESCE_LOCK');
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
            const file = DIRECTORY + '/first-start-recovery-r8.json'; rootOwned(file);
            const stat = fs.lstatSync(file);
            if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.mode & 0o022) fail('REPAIR_QUIESCE_LOCK');
            return JSON.parse(bundle.readFileLimited(file, 16384).bytes);
        },
        block: () => maintenance.blockStart(DIRECTORY),
        stop: () => {
            if (!toolTrust('/usr/bin/systemctl').trusted) fail('REPAIR_UNTRUSTED_TOOL');
            const result = command('/usr/bin/systemctl', ['stop', SERVICE], { timeout: 90000 });
            if (result.error || result.status !== 0) fail('REPAIR_QUIESCE_STOP_FAILED');
        },
    }, invocationIdentity());
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
    const lockPath = at(DIRECTORY + '/.activation.lock'), journal = at(DIRECTORY + '/first-start-recovery-r8.json');
    const releaseRoot = at('/opt/nexowatt/eos/releases'), proofRoot = at('/opt/nexowatt/eos/verified');
    const nextPath = path.join(releaseRoot, options.expectedReleaseId);
    const nextTarget = '/opt/nexowatt/eos/releases/' + options.expectedReleaseId;
    const run = args => {
        const result = exec('/usr/bin/systemctl', args, { timeout: 90000 });
        if (result.error || result.status !== 0) fail('REPAIR_SERVICE_COMMAND_FAILED');
        return result.stdout.trim();
    };
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
    if (exists(at(DIRECTORY + '/maintenance-start.json'))) fail('REPAIR_ORPHAN_PERMIT');
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
    if (exists(completionPath) || exists(journal) || exists(at(DIRECTORY + '/test-update-r6-status.json'))) fail('REPAIR_UNKNOWN_FIRST_START_STATE');
    const oldJournalPath = at(DIRECTORY + '/first-start-recovery-r7.json');
    const oldGuardPath = at(DIRECTORY + '/.first-start-recovery-r7.guard');
    const sourceRecords = new Map([oldJournalPath, oldGuardPath].map(file => [file, privateRecord(file, owner)]));
    const originalLock = privateRecord(lockPath, owner, 8192);
    const retained = validateRetainedR7({ journalBytes: sourceRecords.get(oldJournalPath), guardBytes: sourceRecords.get(oldGuardPath),
        lockBytes: originalLock, stateBytes: original }, invocationId);
    const oldLock = retained.lock;
    const assertOldInactive = () => {
        if ([oldLock.pid, retained.onboardingLock.pid].some(dependencies.processExists || processExists)) fail('REPAIR_OLD_COORDINATOR_LIVE');
        const rows = run(['show', PREVIOUS_SERVICE, '--property=ActiveState,MainPID,ControlPID']);
        const record = Object.fromEntries(rows.split('\n').filter(Boolean).map(line => line.split('=')));
        if (!exact(record, ['ActiveState', 'MainPID', 'ControlPID']) || !['inactive', 'failed'].includes(record.ActiveState) ||
            record.MainPID !== '0' || record.ControlPID !== '0') fail('REPAIR_OLD_COORDINATOR_LIVE');
    };
    const assertSourceRecords = () => {
        for (const [file, bytes] of sourceRecords) if (!privateRecord(file, owner).equals(bytes)) fail('REPAIR_RETAINED_CHANGED');
    };
    assertOldInactive();
    owner(at('/var/lib/nexowatt-eos/.initialized'));
    setStage('SOURCE_VERIFY');
    const previous = inspect(oldPath, baseline.publicKeySha256);
    validateBaselineDescription(previous, baseline);
    const r7 = inspect(path.join(releaseRoot, RETAINED_R7.releaseId), RETAINED_R7.publicKeySha256);
    historical.validateTransition(previous, r7, { expectedReleaseId: RETAINED_R7.releaseId });
    const key = bundle.validatePublicKey(read(options.publicKeyFile));
    if (bundle.sha256(key) !== options.expectedKeySha256) fail('REPAIR_NEW_KEY_PIN');
    (dependencies.trustedImport || trustedImport)(options.bundleDirectory);
    const verifyOptions = { bundleDirectory: options.bundleDirectory, publicKey: key, minimumSequence: baseline.sequence,
        platform: 'linux-arm64', nodeVersion: NODE_VERSION };
    const candidate = (dependencies.verifyBundle || bundle.verifyBundle)(verifyOptions);
    const next = { ...candidate, ...(dependencies.validatePayload || validatePayload)(candidate.payloadPath, candidate.manifest) };
    validateTransition(previous, next, options);
    for (const row of previous.manifest.files.filter(item => item.path.startsWith('system/postgresql-test/systemd/'))) {
        if (!row.path.endsWith('.service') && !row.path.endsWith('.timer') && !row.path.endsWith('.target') && !row.path.endsWith('.path')) fail('REPAIR_UNIT_SCOPE');
        const bytes = read(at('/etc/systemd/system/' + path.basename(row.path)));
        if (bundle.sha256(bytes) !== row.sha256) fail('REPAIR_INSTALLED_UNIT_CHANGED');
    }
    const preserved = new Map(PRESERVED.map(name => [at(DIRECTORY + '/' + name), read(at(DIRECTORY + '/' + name))]));
    const firstStart = await (dependencies.verifyFirstStart || verifyFirstStart)({ at, releasePath: oldPath, baseline, owner, read });
    const assertPreserved = () => {
        for (const [file, bytes] of preserved) if (!read(file).equals(bytes)) fail('REPAIR_PRESERVED_CONFIG_CHANGED');
        firstStart.assertPreserved(); assertSourceRecords();
    };
    run(['is-active', '--quiet', 'nexowatt-eos-postgresql.service']);
    const serviceState = run(['show', SERVICE, '--property=ActiveState', '--value']);
    if (!['inactive', 'failed'].includes(serviceState)) fail('REPAIR_CONTROLLER_BUSY');
    for (const service of ['nexowatt-eos-setup-finalize.service', 'nexowatt-eos-setup-license.service', 'nexowatt-eos-upload.service']) {
        if (!['inactive', 'failed'].includes(run(['show', service, '--property=ActiveState', '--value']))) fail('REPAIR_FIRST_START_BUSY');
    }
    const operationId = crypto.randomUUID();
    const lockRecord = JSON.stringify({ operation: 'test-release-repair', operationId, invocationId, pid: process.pid,
        previousReleaseId: baseline.releaseId, targetSequence: TARGET_SEQUENCE, targetReleaseId: options.expectedReleaseId }) + '\n';
    const guard = at(DIRECTORY + '/.first-start-recovery-r8.guard');
    const assertOwnLock = () => {
        if (!privateRecord(lockPath, owner, 8192).equals(Buffer.from(lockRecord)) || !privateRecord(guard, owner, 8192).equals(Buffer.from(lockRecord))) fail('REPAIR_COORDINATOR_OWNERSHIP_CHANGED');
    };
    let lock, transitioned = false, ownGuardRemoved = false, newState, completionBytes;
    if (exists(guard)) fail('REPAIR_PREVIOUS_RECOVERY');
    const report = (phase, failure = null) => write(journal, JSON.stringify({ schemaVersion: 1, operation: 'test-release-repair', operationId, invocationId,
        retainedR7JournalBase64: sourceRecords.get(oldJournalPath).toString('base64'), retainedR7GuardBase64: sourceRecords.get(oldGuardPath).toString('base64'),
        phase, failureStage: failure?.failureStage ?? null, failureCode: failure?.failureCode ?? null, failureReason: failure?.failureReason ?? null, originalLockBase64: originalLock.toString('base64'), originalStateBase64: original.toString('base64'), previousReleaseId: baseline.releaseId, targetSequence: TARGET_SEQUENCE, targetReleaseId: options.expectedReleaseId, at: new Date().toISOString(),
        previousControllerState: serviceState, physicalControlEnabled: false, productionReleaseApproved: false }) + '\n');
    function switchPointer(expected, target) {
        assertPointer(expected);
        const temporary = path.join(path.dirname(current), '.repair-current-' + crypto.randomBytes(12).toString('hex'));
        fs.symlinkSync(target, temporary);
        try { fs.renameSync(temporary, current); sync(path.dirname(current)); }
        finally { try { fs.unlinkSync(temporary); } catch (error) { if (error.code !== 'ENOENT') throw error; } }
    }
    try {
        try { lock = fs.openSync(guard, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW, 0o600); }
        catch (error) { if (error.code === 'EEXIST') fail('REPAIR_MAINTENANCE_IN_PROGRESS'); throw error; }
        fs.writeFileSync(lock, lockRecord); fs.fsyncSync(lock); sync(path.dirname(guard));
        if (!read(lockPath).equals(originalLock)) fail('REPAIR_ORIGINAL_LOCK_CHANGED');
        if (!read(stateFile).equals(original)) fail('REPAIR_STATE_CHANGED');
        assertPointer(oldTarget); assertPreserved();
        setStage('STAGE');
        if (exists(nextPath)) inspect(nextPath, options.expectedKeySha256);
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
        write(path.join(proofRoot, options.expectedReleaseId, 'native-acceptance.json'), JSON.stringify(native) + '\n');
        // Save original root state before adopting the existing lock. The
        // original stopped R4 remains blocked through every pretrial failure.
        setStage('PREPARED'); report('PREPARED');
        run(['stop', 'nexowatt-eos-setup.service', 'nexowatt-eos-setup-finalize.path']);
        if (!privateRecord(lockPath, owner, 8192).equals(originalLock)) fail('REPAIR_ORIGINAL_LOCK_CHANGED');
        assertOldInactive();
        if (!privateRecord(guard, owner, 8192).equals(Buffer.from(lockRecord))) fail('REPAIR_COORDINATOR_OWNERSHIP_CHANGED');
        assertPreserved();
        setStage('ADOPT_LOCK'); transitioned = true;
        write(lockPath, lockRecord);
        setStage('STOP'); run(['stop', SERVICE]);
        if (!['inactive', 'failed'].includes(run(['show', SERVICE, '--property=ActiveState', '--value']))) fail('REPAIR_STOP_NOT_CONFIRMED');
        assertPreserved(); if (!read(stateFile).equals(original)) fail('REPAIR_STATE_CHANGED');
        setStage('TRIAL'); switchPointer(oldTarget, nextTarget);
        newState = Buffer.from(JSON.stringify({ ...JSON.parse(original), releaseId: options.expectedReleaseId,
            sequence: TARGET_SEQUENCE, publicKeySha256: options.expectedKeySha256 }) + '\n');
        write(stateFile, newState); report('TRIAL');
        assertOwnLock();
        maintenance.authorizeStart(at(DIRECTORY), 'test-release-repair');
        const startedAt = Date.now();
        setStage('CONTROLLER_START'); run(['reset-failed', SERVICE]); run(['start', SERVICE]); run(['is-active', '--quiet', SERVICE]);
        setStage('DB_CONNECT'); await (dependencies.readiness || readiness)(nextPath, startedAt, setStage);
        setStage('VERIFY_LIVE'); await firstStart.verifyLive();
        assertOwnLock();
        assertPointer(nextTarget); assertPreserved();
        if (!read(stateFile).equals(newState)) fail('REPAIR_STATE_CHANGED');
        setStage('COMPLETION'); maintenance.blockStart(at(DIRECTORY));
        completionBytes = Buffer.from(JSON.stringify({ schemaVersion: 1, releaseId: options.expectedReleaseId,
            setupId: firstStart.setupId, completedAt: new Date().toISOString(),
            licenseConfigured: firstStart.licenseConfigured, physicalControlEnabled: false }) + '\n');
        const completeFd = fs.openSync(completionPath, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW, 0o644);
        try { fs.writeFileSync(completeFd, completionBytes); fs.fsyncSync(completeFd); } finally { fs.closeSync(completeFd); }
        sync(path.dirname(completionPath));
        setStage('BOOT_CONFIGURATION'); run(['enable', 'nexowatt-eos.target']);
        run(['disable', 'nexowatt-eos-setup.target']);
        assertPreserved(); assertOwnLock();
        setStage('ACTIVE_REPORT'); report('ACTIVE');
        assertOwnLock();
        setStage('UNLOCK'); fs.unlinkSync(lockPath); sync(path.dirname(lockPath));
        fs.closeSync(lock); lock = undefined; fs.unlinkSync(guard); ownGuardRemoved = true; sync(path.dirname(guard));
        return { ok: true, phase: 'FIRST_START_RECOVERED', releaseId: options.expectedReleaseId, sequence: TARGET_SEQUENCE,
            hardwareTested: false, physicalControlEnabled: false, productionReleaseApproved: false };
    } catch (error) {
        const failure = { failureStage: FAILURE_STAGES.has(error?.failureStage) ? error.failureStage : failureStage,
            failureCode: safeCode(error?.code), failureReason: safeReason(error?.failureReason || error?.reason) };
        if (transitioned) {
            let recovered = false, gatePresent = false, ownLock = false, guardOwned = false, gatesDurable = true;
            // Attempt both gates independently. A directory fsync error while
            // rebuilding the guard must never skip the actual activation gate.
            const recreateGate = file => {
                let fd;
                try {
                    fd = fs.openSync(file, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW, 0o600);
                    fs.writeFileSync(fd, lockRecord);
                    try { fs.fsyncSync(fd); } catch { gatesDurable = false; }
                } catch { gatesDurable = false; }
                finally { if (fd !== undefined) try { fs.closeSync(fd); } catch { gatesDurable = false; } }
                try { sync(path.dirname(file)); } catch { gatesDurable = false; }
            };
            try {
                // Reconstruct the boot gate FIRST. Our guard may subsequently
                // fail to write or sync; neither failure may leave boot allowed.
                const mayRebuildGate = ownGuardRemoved && !exists(guard) ||
                    privateRecord(guard, owner, 8192).equals(Buffer.from(lockRecord));
                if (!exists(lockPath) && mayRebuildGate) recreateGate(lockPath);
                ownLock = privateRecord(lockPath, owner, 8192).equals(Buffer.from(lockRecord));
                gatePresent = ownLock;
            } catch { /* stop remains mandatory; never claim durable restoration */ }
            try {
                if (ownGuardRemoved && !exists(guard)) recreateGate(guard);
                guardOwned = privateRecord(guard, owner, 8192).equals(Buffer.from(lockRecord));
            } catch { /* the activation gate was already attempted independently */ }
            if (ownLock) try { maintenance.blockStart(at(DIRECTORY)); } catch { /* stop remains mandatory */ }
            try {
                run(['stop', SERVICE]);
                if (!['inactive', 'failed'].includes(run(['show', SERVICE, '--property=ActiveState', '--value']))) fail('REPAIR_STOP_NOT_CONFIRMED');
                if (!ownLock || !guardOwned) fail('REPAIR_COORDINATOR_OWNERSHIP_CHANGED');
                // Restore only our own exact trial state. Never overwrite another
                // operator's pointer/state or restart the previously failing Admin.
                if (exists(completionPath)) {
                    if (!completionBytes || !read(completionPath).equals(completionBytes)) fail('REPAIR_COMPLETION_CHANGED');
                    fs.unlinkSync(completionPath); sync(path.dirname(completionPath));
                }
                const stateNow = read(stateFile);
                if (!stateNow.equals(original) && (!newState || !stateNow.equals(newState))) fail('REPAIR_STATE_CHANGED');
                const target = fs.readlinkSync(current);
                if (target === nextTarget) switchPointer(nextTarget, oldTarget);
                else assertPointer(oldTarget);
                if (!stateNow.equals(original)) write(stateFile, original);
                assertSourceRecords();
                recovered = gatePresent && guardOwned && gatesDurable;
            } catch { /* the retained lock blocks normal start and reboot */ }
            try { report(recovered ? 'RESTORED_STOPPED' : 'RECOVERY_REQUIRED', failure); } catch { /* lock itself persists */ }
            throw Object.assign(new Error('REPAIR_TRIAL_FAILED'), { code: recovered ? 'REPAIR_TRIAL_FAILED_RESTORED_STOPPED' : 'REPAIR_RECOVERY_REQUIRED', ...failure });
        }
        if (lock !== undefined) {
            try {
                if (privateRecord(guard, owner, 8192).equals(Buffer.from(lockRecord))) report('REJECTED', failure);
            } catch { /* retained original gates remain authoritative */ }
        }
        throw Object.assign(new Error(failure.failureCode), { code: failure.failureCode, ...failure });
    } finally {
        if (lock !== undefined) fs.closeSync(lock);
        // A failed attempt retains the private recovery guard and original/trial
        // activation lock. No implicit retry or boot permission is granted.
    }
    } catch (error) {
        const code = safeCode(error?.code);
        throw Object.assign(new Error(code), { code,
            failureStage: FAILURE_STAGES.has(error?.failureStage) ? error.failureStage : failureStage,
            failureCode: safeCode(error?.failureCode || error?.code), failureReason: safeReason(error?.failureReason || error?.reason) });
    }
}
module.exports = { BASES, RETAINED_R7, TARGET_SEQUENCE, PRESERVED, MALFORMED_PROTECTED_LOCK,
    parseArgs, validatePins, validateTransition, validateRetainedR7, privateRecord, atomicWrite,
    quiesceIncomplete, quiesceHost, readiness, failureOutput, update };
if (require.main === module) {
    const previousUmask = process.umask(0o022);
    const argv = process.argv.slice(2);
    Promise.resolve().then(() => argv.length === 1 && argv[0] === '--quiesce-incomplete' ? quiesceHost() : update(parseArgs(argv)))
        .then(result => process.stdout.write(JSON.stringify(result) + '\n'))
        .catch(error => { process.stderr.write(JSON.stringify(failureOutput(error)) + '\n'); process.exitCode = 1; })
        .finally(() => process.umask(previousUmask));
}
