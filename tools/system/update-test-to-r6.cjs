'use strict';
// Narrow operator-authorized R4/R5 -> R6 TEST update, not a general migration API.
// The immutable download command must independently pin the new release AND key.
// No account, database, license, certificate, unit or onboarding migration occurs.
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
const BASES = Object.freeze([
    Object.freeze({ releaseId: '15d65328b06e5d4d3a72b2ee440159aa36e07ce300d45888762519b66652ffa8',
        publicKeySha256: 'd35d09a005703eecf1b5a8843b553064c5ab90758cfc71a634599459cda6e8b3',
        sequence: 7, nodeVersion: '24.21.0', profile: 'test' }),
    Object.freeze({ releaseId: '6afb22793667514f76bbcceb785ba84b00757105577a9909c182f8fc41e45061',
        publicKeySha256: 'dc73b3399c8c3790051d86461588f4cd716cd44aec1b64f70aa121f0175ab082',
        sequence: 8, nodeVersion: '24.21.0', profile: 'test' }),
]);
const NODE_VERSION = '24.21.0';
const TARGET_SEQUENCE = 9;
const SERVICE = 'nexowatt-eos-controller.service';
const DIRECTORY = '/etc/nexowatt-eos';
const MALFORMED_PROTECTED_LOCK = Symbol('malformed-protected-lock');
const PRESERVED = Object.freeze(['iobroker.json', 'first-start-complete.json', 'license-device.json', 'license-trust.json',
    'web/ca.crt', 'web/admin.crt', 'web/admin.key', 'web/ui.crt', 'web/ui.key']);
const fail = code => { throw Object.assign(new Error(code), { code }); };
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join('|') === [...keys].sort().join('|');
function sync(directory) {
    const fd = fs.openSync(directory, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
    try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function validateState(state) {
    const baseline = BASES.find(base => Object.entries(base).every(([key, value]) => state?.[key] === value));
    if (!exact(state, ['schemaVersion', 'releaseId', 'sequence', 'nodeVersion', 'publicKeySha256', 'profile']) ||
        state.schemaVersion !== 1 || !baseline) fail('REPAIR_R4_R5_BASELINE_REQUIRED');
    return baseline;
}
function validateBaselineDescription(row, baseline) {
    if (!row || row.releaseId !== baseline.releaseId || row.manifest.sequence !== baseline.sequence ||
        row.manifest.profile !== 'test' || row.manifest.releaseVersion !== '0.2.0-test.3' ||
        row.manifest.nodeVersion !== NODE_VERSION || JSON.stringify(row.manifest.platforms) !== '["linux-arm64"]') fail('REPAIR_RELEASE_SCOPE');
}
const isoDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
function validateCompletion(complete, baseline, priorRepair) {
    if (!exact(complete, ['schemaVersion', 'releaseId', 'setupId', 'completedAt', 'licenseConfigured', 'physicalControlEnabled']) ||
        complete.schemaVersion !== 1 || !/^[a-f0-9]{32}$/.test(complete.setupId || '') || !isoDate(complete.completedAt) ||
        typeof complete.licenseConfigured !== 'boolean' || complete.physicalControlEnabled !== false) fail('REPAIR_COMPLETED_FIRST_START_REQUIRED');
    if (complete.releaseId === baseline.releaseId) return false;
    // The R4->R5 updater intentionally preserved first-start-complete.json.
    // Accept that one inherited origin only with its completed protected journal;
    // update() additionally authenticates the retained R4 release and its key.
    if (baseline !== BASES[1] || complete.releaseId !== BASES[0].releaseId ||
        !exact(priorRepair, ['schemaVersion', 'operation', 'operationId', 'invocationId', 'phase', 'previousReleaseId',
            'targetReleaseId', 'at', 'previousControllerState', 'physicalControlEnabled', 'productionReleaseApproved']) ||
        priorRepair.schemaVersion !== 1 || priorRepair.operation !== 'test-release-repair' || priorRepair.phase !== 'ACTIVE' ||
        priorRepair.previousReleaseId !== BASES[0].releaseId || priorRepair.targetReleaseId !== BASES[1].releaseId ||
        !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(priorRepair.operationId || '') ||
        !/^[a-f0-9]{32}$/.test(priorRepair.invocationId || '') || !isoDate(priorRepair.at) ||
        !['active', 'inactive', 'failed'].includes(priorRepair.previousControllerState) ||
        priorRepair.physicalControlEnabled !== false || priorRepair.productionReleaseApproved !== false) fail('REPAIR_FIRST_START_PROVENANCE');
    return true;
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
    const protectedFile = name => name === 'runtime/postgresql/schema.sql' || name.startsWith('system/');
    for (const name of new Set([...oldRows.keys(), ...nextRows.keys()])) {
        if (protectedFile(name) && JSON.stringify(oldRows.get(name)) !== JSON.stringify(nextRows.get(name))) fail('REPAIR_HOST_MIGRATION_UNSUPPORTED');
    }
    const scope = catalog => catalog.entries.map(({ sha256, version, ...row }) => row);
    if (JSON.stringify(scope(previous.catalog)) !== JSON.stringify(scope(next.catalog))) fail('REPAIR_ADMISSION_CHANGE');
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
            const file = DIRECTORY + '/test-update-r6-status.json'; rootOwned(file);
            const stat = fs.lstatSync(file);
            if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.mode & 0o022) fail('REPAIR_QUIESCE_LOCK');
            return JSON.parse(bundle.readFileLimited(file, 8192).bytes);
        },
        block: () => maintenance.blockStart(DIRECTORY),
        stop: () => {
            if (!toolTrust('/usr/bin/systemctl').trusted) fail('REPAIR_UNTRUSTED_TOOL');
            const result = command('/usr/bin/systemctl', ['stop', SERVICE], { timeout: 90000 });
            if (result.error || result.status !== 0) fail('REPAIR_QUIESCE_STOP_FAILED');
        },
    }, invocationIdentity());
}
async function readiness(releasePath, startedAt) {
    const { readConfig } = require('../../security/verify-runtime-tls.cjs');
    const { assertRuntimeConfig } = require('../../runtime/bootstrap/initialize.cjs');
    const { clients } = require('../../runtime/transport/databases.cjs');
    const { waitAdapters, probeWeb } = require('./onboard-ui.cjs');
    const config = assertRuntimeConfig(readConfig(DIRECTORY + '/iobroker.json'));
    const requireApp = createRequire(path.join(releasePath, 'app/package.json'));
    const { States } = clients(requireApp, config);
    const silent = Object.fromEntries(['silly', 'debug', 'info', 'warn', 'error'].map(name => [name, () => {}]));
    let client;
    try {
        await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(Object.assign(new Error('REPAIR_DB_TIMEOUT'), { code: 'REPAIR_DB_TIMEOUT' })), 5000);
            try { client = new States({ connection: structuredClone(config.states), logger: silent,
                connected: () => { clearTimeout(timer); resolve(); }, disconnected: () => {}, change: () => {} }); }
            catch { clearTimeout(timer); reject(Object.assign(new Error('REPAIR_DB_FAILED'), { code: 'REPAIR_DB_FAILED' })); }
        });
        await waitAdapters(client, startedAt);
        const ca = bundle.readFileLimited(DIRECTORY + '/web/ca.crt', 16384).bytes;
        await Promise.all([8081, 8188].map(port => probeWeb(port, ca)));
    } finally { if (client) await client.destroy(); }
}
// Dependency boundary is only exported for fault-injection tests. No CLI flag
// changes root paths, service commands, platform, owners or verification logic.
async function update(options, dependencies = {}) {
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
    const lockPath = at(DIRECTORY + '/.activation.lock'), journal = at(DIRECTORY + '/test-update-r6-status.json');
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
    const inherited = baseline === BASES[1] && complete.releaseId === BASES[0].releaseId;
    const legacyJournalPath = at(DIRECTORY + '/test-repair-status.json');
    const legacyJournalBytes = inherited ? read(legacyJournalPath) : null;
    validateCompletion(complete, baseline, legacyJournalBytes && JSON.parse(legacyJournalBytes));
    owner(at('/var/lib/nexowatt-eos/.initialized'));
    const previous = inspect(oldPath, baseline.publicKeySha256);
    validateBaselineDescription(previous, baseline);
    if (inherited) validateBaselineDescription(inspect(path.join(releaseRoot, BASES[0].releaseId), BASES[0].publicKeySha256), BASES[0]);
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
    preserved.set(completionPath, completionBytes);
    if (legacyJournalBytes) preserved.set(legacyJournalPath, legacyJournalBytes);
    const assertPreserved = () => {
        for (const [file, bytes] of preserved) if (!read(file).equals(bytes)) fail('REPAIR_PRESERVED_CONFIG_CHANGED');
    };
    run(['is-active', '--quiet', 'nexowatt-eos-postgresql.service']);
    const serviceState = run(['show', SERVICE, '--property=ActiveState', '--value']);
    if (!['active', 'inactive', 'failed'].includes(serviceState)) fail('REPAIR_CONTROLLER_BUSY');
    const operationId = crypto.randomUUID();
    const lockRecord = JSON.stringify({ operation: 'test-release-repair', operationId, invocationId, pid: process.pid,
        previousReleaseId: baseline.releaseId, targetSequence: TARGET_SEQUENCE, targetReleaseId: options.expectedReleaseId }) + '\n';
    let lock, transitioned = false, retainLock = false, newState;
    const report = phase => write(journal, JSON.stringify({ schemaVersion: 1, operation: 'test-release-repair', operationId, invocationId,
        phase, previousReleaseId: baseline.releaseId, targetSequence: TARGET_SEQUENCE, targetReleaseId: options.expectedReleaseId, at: new Date().toISOString(),
        previousControllerState: serviceState, physicalControlEnabled: false, productionReleaseApproved: false }) + '\n');
    function switchPointer(expected, target) {
        assertPointer(expected);
        const temporary = path.join(path.dirname(current), '.repair-current-' + crypto.randomBytes(12).toString('hex'));
        fs.symlinkSync(target, temporary);
        try { fs.renameSync(temporary, current); sync(path.dirname(current)); }
        finally { try { fs.unlinkSync(temporary); } catch (error) { if (error.code !== 'ENOENT') throw error; } }
    }
    try {
        try { lock = fs.openSync(lockPath, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW, 0o600); }
        catch (error) { if (error.code === 'EEXIST') fail('REPAIR_MAINTENANCE_IN_PROGRESS'); throw error; }
        fs.writeFileSync(lock, lockRecord); fs.fsyncSync(lock); sync(path.dirname(lockPath));
        if (!read(stateFile).equals(original)) fail('REPAIR_STATE_CHANGED');
        assertPointer(oldTarget); assertPreserved();
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
        const native = (dependencies.nativeProbe || probeNativeForInstallation)(nextPath, 'linux-arm64');
        write(path.join(proofRoot, options.expectedReleaseId, 'native-acceptance.json'), JSON.stringify(native) + '\n');
        report('PREPARED');
        // A failed stop may already have changed runtime state: from this point
        // every failure retains the lock and attempts to leave the controller off.
        transitioned = true; retainLock = true;
        run(['stop', SERVICE]);
        if (!['inactive', 'failed'].includes(run(['show', SERVICE, '--property=ActiveState', '--value']))) fail('REPAIR_STOP_NOT_CONFIRMED');
        assertPreserved(); if (!read(stateFile).equals(original)) fail('REPAIR_STATE_CHANGED');
        switchPointer(oldTarget, nextTarget);
        newState = Buffer.from(JSON.stringify({ ...JSON.parse(original), releaseId: options.expectedReleaseId,
            sequence: TARGET_SEQUENCE, publicKeySha256: options.expectedKeySha256 }) + '\n');
        write(stateFile, newState); report('TRIAL');
        maintenance.authorizeStart(at(DIRECTORY), 'test-release-repair');
        const startedAt = Date.now();
        run(['reset-failed', SERVICE]); run(['start', SERVICE]); run(['is-active', '--quiet', SERVICE]);
        await (dependencies.readiness || readiness)(nextPath, startedAt);
        assertPointer(nextTarget); assertPreserved();
        if (!read(stateFile).equals(newState)) fail('REPAIR_STATE_CHANGED');
        maintenance.blockStart(at(DIRECTORY));
        report('ACTIVE');
        fs.closeSync(lock); lock = undefined; fs.unlinkSync(lockPath); sync(path.dirname(lockPath)); retainLock = false;
        return { ok: true, phase: 'TEST_REPAIR_ACTIVE', releaseId: options.expectedReleaseId, sequence: TARGET_SEQUENCE,
            hardwareTested: false, physicalControlEnabled: false, productionReleaseApproved: false };
    } catch (error) {
        if (transitioned) {
            let recovered = false, gatePresent = false;
            // Unlock's directory fsync can fail after unlink succeeded. Rebuild
            // the gate before restoration, otherwise reboot could start the old
            // known-broken release despite a RESTORED_STOPPED report.
            try {
                if (!fs.existsSync(lockPath)) {
                    lock = fs.openSync(lockPath, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW, 0o600);
                    fs.writeFileSync(lock, lockRecord); fs.fsyncSync(lock); sync(path.dirname(lockPath));
                }
                owner(lockPath);
                const stat = fs.lstatSync(lockPath);
                if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.mode & 0o022) fail('REPAIR_LOCK_INVALID');
                gatePresent = true;
            } catch { /* stop/restoration remain mandatory; report recovery required */ }
            try { maintenance.blockStart(at(DIRECTORY)); } catch { /* stop remains mandatory */ }
            try {
                run(['stop', SERVICE]);
                if (!['inactive', 'failed'].includes(run(['show', SERVICE, '--property=ActiveState', '--value']))) fail('REPAIR_STOP_NOT_CONFIRMED');
                // Restore only our own exact trial state. Never overwrite another
                // operator's pointer/state or restart the previously failing Admin.
                const stateNow = read(stateFile);
                if (!stateNow.equals(original) && (!newState || !stateNow.equals(newState))) fail('REPAIR_STATE_CHANGED');
                const target = fs.readlinkSync(current);
                if (target === nextTarget) switchPointer(nextTarget, oldTarget);
                else assertPointer(oldTarget);
                if (!stateNow.equals(original)) write(stateFile, original);
                recovered = gatePresent;
            } catch { /* the retained lock blocks normal start and reboot */ }
            try { report(recovered ? 'RESTORED_STOPPED' : 'RECOVERY_REQUIRED'); } catch { /* lock itself persists */ }
            fail(recovered ? 'REPAIR_TRIAL_FAILED_RESTORED_STOPPED' : 'REPAIR_RECOVERY_REQUIRED');
        }
        throw error;
    } finally {
        if (lock !== undefined) fs.closeSync(lock);
        if (!retainLock && lock !== undefined) {
            fs.unlinkSync(lockPath); sync(path.dirname(lockPath));
        }
    }
}
module.exports = { BASES, TARGET_SEQUENCE, PRESERVED, MALFORMED_PROTECTED_LOCK, parseArgs, validatePins, validateState, validateBaselineDescription, validateCompletion, validateTransition, invocationIdentity,
    quiesceIncomplete, quiesceHost, readiness, update };
if (require.main === module) {
    const previousUmask = process.umask(0o022);
    const argv = process.argv.slice(2);
    Promise.resolve().then(() => argv.length === 1 && argv[0] === '--quiesce-incomplete' ? quiesceHost() : update(parseArgs(argv)))
        .then(result => process.stdout.write(JSON.stringify(result) + '\n'))
        .catch(error => { process.stderr.write(JSON.stringify({ ok: false, code: /^REPAIR_[A-Z_]+$/.test(error.code || '') ? error.code : 'REPAIR_FAILED',
            manualRecoveryRequired: true }) + '\n'); process.exitCode = 1; })
        .finally(() => process.umask(previousUmask));
}
