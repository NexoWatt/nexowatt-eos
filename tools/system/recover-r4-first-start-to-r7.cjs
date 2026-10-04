'use strict';
// Explicit recovery of the authenticated R4 failed first-start trial to R7.
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
const BASES = Object.freeze([
    Object.freeze({ releaseId: '15d65328b06e5d4d3a72b2ee440159aa36e07ce300d45888762519b66652ffa8',
        publicKeySha256: 'd35d09a005703eecf1b5a8843b553064c5ab90758cfc71a634599459cda6e8b3',
        sequence: 7, nodeVersion: '24.21.0', profile: 'test' })
]);
const NODE_VERSION = '24.21.0';
const TARGET_SEQUENCE = 10;
const SERVICE = 'nexowatt-eos-controller.service';
const DIRECTORY = '/etc/nexowatt-eos';
const MALFORMED_PROTECTED_LOCK = Symbol('malformed-protected-lock');
const PRESERVED = Object.freeze(['iobroker.json', 'license-device.json', 'license-trust.json',
    'web/ca.crt', 'web/admin.crt', 'web/admin.key', 'web/ui.crt', 'web/ui.key']);
const fail = code => { throw Object.assign(new Error(code), { code }); };
const exists = file => { try { fs.lstatSync(file); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join('|') === [...keys].sort().join('|');
function sync(directory) {
    const fd = fs.openSync(directory, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
    try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function atomicWrite(file, content) {
    const temp = path.join(path.dirname(file), '.eos-recovery-' + crypto.randomBytes(12).toString('hex'));
    const privateMode = ['.activation.lock', 'first-start-recovery-r7.json'].includes(path.basename(file));
    const fd = fs.openSync(temp, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, privateMode ? 0o600 : 0o644);
    try { fs.writeFileSync(fd, content); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    try { fs.renameSync(temp, file); sync(path.dirname(file)); }
    finally { if (exists(temp)) fs.unlinkSync(temp); }
}
function validateState(state) {
    const baseline = BASES.find(base => Object.entries(base).every(([key, value]) => state?.[key] === value));
    if (!exact(state, ['schemaVersion', 'releaseId', 'sequence', 'nodeVersion', 'publicKeySha256', 'profile']) ||
        state.schemaVersion !== 1 || !baseline) fail('REPAIR_FAILED_R4_FIRST_START_REQUIRED');
    return baseline;
}
function validateBaselineDescription(row, baseline) {
    if (!row || row.releaseId !== baseline.releaseId || row.manifest.sequence !== baseline.sequence ||
        row.manifest.profile !== 'test' || row.manifest.releaseVersion !== '0.2.0-test.3' ||
        row.manifest.nodeVersion !== NODE_VERSION || JSON.stringify(row.manifest.platforms) !== '["linux-arm64"]') fail('REPAIR_RELEASE_SCOPE');
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
            const file = DIRECTORY + '/first-start-recovery-r7.json'; rootOwned(file);
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
function validateFirstStartLock(value, releaseId) {
    if (!exact(value, ['operation', 'pid', 'invocationId', 'releaseId']) || value.operation !== 'ui-onboarding' ||
        value.releaseId !== releaseId || !/^[a-f0-9]{32}$/.test(value.invocationId || '') ||
        !Number.isSafeInteger(value.pid) || value.pid < 2 || value.pid > 2147483647) fail('REPAIR_ORIGINAL_LOCK');
    return value;
}
function processExists(pid) {
    try { fs.lstatSync('/proc/' + pid); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}
function validateBindings({ handoff, records, config, identity }) {
    const enrollment = records.get('system.meta.eosEnrollment');
    const first = records.get('system.meta.eosFirstStart');
    const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
    // Authenticated R4 policy/server emitted only schema 2. Preserve that exact
    // historical handoff; do not manufacture a newer minimal setup record.
    if (handoff.schemaVersion !== 2 || handoff.settings?.schemaVersion !== undefined || !['activate', 'unlicensed'].includes(handoff.license?.mode) ||
        enrollment?.native?.state !== 'complete' || enrollment.native.firstRunPolicyVersion !== 1 ||
        enrollment.native.firstRunBinding !== digest({ passwordHash: handoff.passwordHash, settings: handoff.settings, config }) ||
        first?.native?.state !== 'complete' || first.native.settingsSha256 !== digest(handoff.settings) ||
        records.get('system.user.admin')?.common?.password !== handoff.passwordHash ||
        identity.schemaVersion !== 1 || identity.releaseId !== BASES[0].releaseId ||
        records.get('system.meta.uuid')?.native?.uuid !== identity.uuid) fail('REPAIR_FIRST_START_BINDING');
    return true;
}
async function readOnlySnapshot(Client, connection) {
    const { validateConnection } = require('../../runtime/postgresql/packages/store/index.cjs');
    const validated = validateConnection(connection, 'objects');
    const client = new Client({ ...validated, options: validated.options + ' -c default_transaction_read_only=on' });
    let rejectFailure;
    const failure = new Promise((_, reject) => { rejectFailure = reject; });
    const close = () => Promise.resolve().then(() => client.end()).catch(() => {});
    const rejectConnection = code => { rejectFailure(Object.assign(new Error(code), { code })); close(); };
    // pg emits an EventEmitter error as well as rejecting pending queries.
    // Handle it explicitly; never let raw database details escape to stderr.
    const onError = () => rejectConnection('REPAIR_DATABASE_CONNECTION');
    client.on('error', onError);
    const timer = setTimeout(() => rejectConnection('REPAIR_DATABASE_TIMEOUT'), 15000);
    const operation = async () => {
        await client.connect();
        const stream = client.connection?.stream;
        if (stream?.encrypted !== true || stream.authorized !== true || stream.getProtocol?.() !== 'TLSv1.3') fail('REPAIR_DATABASE_TLS');
        await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
        const result = await client.query("SELECT key, CASE WHEN octet_length(value)<=131072 AND sum(octet_length(value)) OVER()<=4194304 THEN value ELSE NULL END AS value FROM eos_store.kv WHERE domain=$1 AND key LIKE 'cfg.o.system.%' AND (expires_at IS NULL OR expires_at>clock_timestamp()) ORDER BY key COLLATE \"C\" LIMIT 2049", ['objects']);
        if (!Array.isArray(result.rows) || result.rows.length > 2048) fail('REPAIR_DATABASE_BOUNDS');
        const records = new Map();
        for (const row of result.rows) {
            if (typeof row.key !== 'string' || !row.key.startsWith('cfg.o.system.') || !Buffer.isBuffer(row.value) || row.value.length > 131072) fail('REPAIR_DATABASE_BOUNDS');
            const doc = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(row.value));
            const id = row.key.slice(6);
            if (!doc || Array.isArray(doc) || doc._id !== id || records.has(id)) fail('REPAIR_DATABASE_RECORD');
            records.set(id, doc);
        }
        await client.query('ROLLBACK');
        return records;
    };
    try { return await Promise.race([operation(), failure]); }
    catch (error) { if (/^REPAIR_[A-Z_]+$/.test(error.code || '')) throw error; fail('REPAIR_DATABASE_CONNECTION'); }
    finally {
        clearTimeout(timer);
        let closeTimer;
        try { await Promise.race([close(), new Promise(resolve => { closeTimer = setTimeout(resolve, 5000); })]); }
        finally { clearTimeout(closeTimer); }
        // Keep the sanitized listener installed for any late driver error.
    }
}
async function verifyFirstStart({ at, releasePath, baseline, owner, read }, dependencies = {}) {
    const directory = at('/var/lib/nexowatt-eos/onboarding');
    const passwd = fs.readFileSync('/etc/passwd', 'utf8');
    const accountUid = name => {
        if (dependencies.accountUids && Object.hasOwn(dependencies.accountUids, name)) return dependencies.accountUids[name];
        const rows = passwd.split('\n').filter(row => row.startsWith(name + ':'));
        const id = rows.length === 1 ? rows[0].split(':')[2] : '';
        if (!/^[1-9][0-9]{0,9}$/.test(id)) fail('REPAIR_FIRST_START_OWNER');
        return Number(id);
    };
    const setupUid = accountUid('eos-setup'), runtimeUid = accountUid('eos-runtime');
    const saved = new Map();
    function privateRead(file, uid, limit) {
        // Runtime/setup private subtrees are intentionally not root-owned.
        // Pin all parents by fd to reject symlinks and ancestor replacement.
        const anchor = dependencies.root || '/';
        if (anchor !== '/' && !file.startsWith(anchor + '/')) fail('REPAIR_FIRST_START_PATH');
        const relative = anchor === '/' ? file : file.slice(anchor.length);
        let fd = fs.openSync(anchor, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
        try {
            for (const part of path.dirname(relative).split('/').filter(Boolean)) {
                const next = fs.openSync(`/proc/self/fd/${fd}/${part}`, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
                fs.closeSync(fd); fd = next;
                const stat = fs.fstatSync(fd);
                if (![0, uid].includes(stat.uid) || stat.mode & 0o022) fail('REPAIR_FIRST_START_OWNER');
            }
            const dirStat = fs.fstatSync(fd);
            if (dirStat.uid !== uid || dirStat.mode & 0o077) fail('REPAIR_FIRST_START_OWNER');
            const name = `/proc/self/fd/${fd}/${path.basename(file)}`;
            const input = fs.openSync(name, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
            try {
                const stat = fs.fstatSync(input);
                if (!stat.isFile() || stat.nlink !== 1 || stat.uid !== uid || stat.mode & 0o077 || stat.size > limit) fail('REPAIR_FIRST_START_OWNER');
                const bytes = Buffer.alloc(limit + 1); let count = 0;
                while (count < bytes.length) { const n = fs.readSync(input, bytes, count, bytes.length - count, null); if (!n) break; count += n; }
                const after = fs.fstatSync(input), named = fs.lstatSync(name);
                if (count !== stat.size || count > limit || after.size !== stat.size || after.mtimeMs !== stat.mtimeMs || after.ctimeMs !== stat.ctimeMs ||
                    after.ino !== named.ino || after.dev !== named.dev) fail('REPAIR_FIRST_START_CHANGED');
                return bytes.subarray(0, count);
            } finally { fs.closeSync(input); }
        } finally { fs.closeSync(fd); }
    }
    const capture = (file, uid, limit) => { const bytes = privateRead(file, uid, limit); saved.set(file, { bytes, uid, limit }); return bytes; };
    const state = JSON.parse(capture(path.join(directory, 'state.json'), setupUid, 4096));
    const handoff = JSON.parse(capture(path.join(directory, 'handoff.json'), setupUid, 65536));
    const { validateHandoff } = require('../../runtime/onboarding/policy.cjs');
    require('../../runtime/onboarding/state.cjs').readState(directory);
    validateHandoff(handoff, baseline.releaseId);
    if (state.state !== 'committing' || state.codeHash !== null || state.releaseId !== baseline.releaseId || state.setupId !== handoff.setupId) fail('REPAIR_HANDOFF_STATE');
    const config = require('../../runtime/bootstrap/initialize.cjs').assertRuntimeConfig(JSON.parse(read(at(DIRECTORY + '/iobroker.json'))));
    if (config.objects.type !== 'postgresql' || config.objects.namespace !== undefined ||
        ![undefined, 'cfg'].includes(config.objects.redisNamespace) || config.objects.metaNamespace !== undefined) fail('REPAIR_DATABASE_SCOPE');
    const app = path.join(releasePath, 'app'), requireApp = createRequire(path.join(app, 'package.json'));
    const Client = dependencies.pgClient || requireApp('pg').Client;
    const records = await readOnlySnapshot(Client, config.objects);
    const identity = JSON.parse(read(at(DIRECTORY + '/license-device.json')));
    validateBindings({ handoff, records, config, identity });
    const objects = {
        getObjectAsync: async id => structuredClone(records.get(id) || null),
        getObjectViewAsync: async (design, search, options) => {
            if (design !== 'system' || !['group', 'user', 'instance'].includes(search)) fail('REPAIR_DATABASE_VIEW');
            return { rows: [...records.values()].filter(doc => doc.type === search && doc._id >= options.startkey && doc._id <= options.endkey)
                .map(doc => ({ id: doc._id, value: structuredClone(doc) })) };
        },
    };
    await require('../../runtime/bootstrap/enrollment.cjs').verify({ objects, config, app });
    for (const name of ['eos-admin', 'nexowatt-ui']) if (records.get(`system.adapter.${name}.0`)?.common?.enabled !== true) fail('REPAIR_WEB_INSTANCE_DISABLED');
    const core = requireApp('iobroker.eos-admin/build/lib/eosLicenseCore.js');
    if (core.normalizeUuid(identity.uuid) !== identity.uuid) fail('REPAIR_FIRST_START_BINDING');
    const trust = JSON.parse(read(at(DIRECTORY + '/license-trust.json')));
    const storePath = at('/var/lib/nexowatt-eos/iobroker-data/eos-admin.0/licensing');
    const verifyLive = async () => { const current = await readOnlySnapshot(Client, config.objects); validateBindings({ handoff: JSON.parse(saved.get(path.join(directory, 'handoff.json')).bytes), records: current, config, identity }); };
    if (handoff.license.mode === 'unlicensed') {
        const assertPreserved = () => {
            for (const [file, row] of saved) if (!privateRead(file, row.uid, row.limit).equals(row.bytes)) fail('REPAIR_FIRST_START_CHANGED');
            if (exists(path.join(storePath, 'license.enc')) || exists(path.join(storePath, 'storage.key'))) fail('REPAIR_UNEXPECTED_LICENSE_STORAGE');
        };
        assertPreserved();
        return { setupId: handoff.setupId, licenseConfigured: false, assertPreserved, verifyLive };
    }
    core.verifyLicense(handoff.license.token, { uuid: identity.uuid, publicKeys: trust });
    const encrypted = privateRead(path.join(storePath, 'license.enc'), runtimeUid, 32768);
    const key = capture(path.join(storePath, 'storage.key'), runtimeUid, 32);
    if (key.length !== 32) fail('REPAIR_LICENSE_STORAGE');
    // Decode only existing authenticated bytes. Calling load() could mkdir a
    // missing directory; this narrow read path never generates a storage key.
    const store = new core.EncryptedLicenseStore({ directory: storePath, uuid: identity.uuid });
    const decoded = store._decode(encrypted, key);
    if (decoded.token !== handoff.license.token || decoded.highWaterMark > Date.now()) fail('REPAIR_LICENSE_STORAGE');
    const tokenHash = crypto.createHash('sha256').update(decoded.token).digest('hex');
    const highWaterMark = decoded.highWaterMark;
    const setupId = handoff.setupId;
    handoff.passwordHash = undefined; handoff.license.token = undefined; decoded.token = undefined;
    const assertPreserved = () => {
        for (const [file, row] of saved) if (!privateRead(file, row.uid, row.limit).equals(row.bytes)) fail('REPAIR_FIRST_START_CHANGED');
        // Admin legitimately persists its clock high-water mark on start.
        // Require the same authenticated token/key, not old ciphertext bytes.
        const current = store._decode(privateRead(path.join(storePath, 'license.enc'), runtimeUid, 32768), key);
        if (crypto.createHash('sha256').update(current.token).digest('hex') !== tokenHash || current.highWaterMark < highWaterMark || current.highWaterMark > Date.now()) fail('REPAIR_LICENSE_STORAGE');
        current.token = undefined;
    };
    assertPreserved();
    return { setupId, licenseConfigured: true, assertPreserved, verifyLive };
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
    const lockPath = at(DIRECTORY + '/.activation.lock'), journal = at(DIRECTORY + '/first-start-recovery-r7.json');
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
    const originalLock = read(lockPath);
    const oldLock = validateFirstStartLock(JSON.parse(originalLock), baseline.releaseId);
    const lockStat = fs.lstatSync(lockPath);
    if (!lockStat.isFile() || lockStat.isSymbolicLink() || lockStat.nlink !== 1 || lockStat.mode & 0o077) fail('REPAIR_ORIGINAL_LOCK');
    if ((dependencies.processExists || processExists)(oldLock.pid)) fail('REPAIR_OLD_COORDINATOR_LIVE');
    owner(at('/var/lib/nexowatt-eos/.initialized'));
    const previous = inspect(oldPath, baseline.publicKeySha256);
    validateBaselineDescription(previous, baseline);
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
        firstStart.assertPreserved();
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
    const guard = at(DIRECTORY + '/.first-start-recovery-r7.guard');
    const assertOwnLock = () => {
        if (!read(lockPath).equals(Buffer.from(lockRecord)) || !read(guard).equals(Buffer.from(lockRecord))) fail('REPAIR_COORDINATOR_OWNERSHIP_CHANGED');
    };
    let lock, transitioned = false, retainLock = true, newState, completionBytes;
    if (exists(guard)) fail('REPAIR_PREVIOUS_RECOVERY');
    const report = phase => write(journal, JSON.stringify({ schemaVersion: 1, operation: 'test-release-repair', operationId, invocationId,
        phase, originalLockBase64: originalLock.toString('base64'), originalStateBase64: original.toString('base64'), previousReleaseId: baseline.releaseId, targetSequence: TARGET_SEQUENCE, targetReleaseId: options.expectedReleaseId, at: new Date().toISOString(),
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
        const native = (dependencies.nativeProbe || probeNativeForInstallation)(nextPath, 'linux-arm64');
        write(path.join(proofRoot, options.expectedReleaseId, 'native-acceptance.json'), JSON.stringify(native) + '\n');
        // Save original root state before adopting the existing lock. The
        // original stopped R4 remains blocked through every pretrial failure.
        report('PREPARED');
        run(['stop', 'nexowatt-eos-setup.service', 'nexowatt-eos-setup-finalize.path']);
        if (!read(lockPath).equals(originalLock) || (dependencies.processExists || processExists)(oldLock.pid)) fail('REPAIR_ORIGINAL_LOCK_CHANGED');
        assertPreserved();
        transitioned = true;
        write(lockPath, lockRecord);
        run(['stop', SERVICE]);
        if (!['inactive', 'failed'].includes(run(['show', SERVICE, '--property=ActiveState', '--value']))) fail('REPAIR_STOP_NOT_CONFIRMED');
        assertPreserved(); if (!read(stateFile).equals(original)) fail('REPAIR_STATE_CHANGED');
        switchPointer(oldTarget, nextTarget);
        newState = Buffer.from(JSON.stringify({ ...JSON.parse(original), releaseId: options.expectedReleaseId,
            sequence: TARGET_SEQUENCE, publicKeySha256: options.expectedKeySha256 }) + '\n');
        write(stateFile, newState); report('TRIAL');
        assertOwnLock();
        maintenance.authorizeStart(at(DIRECTORY), 'test-release-repair');
        const startedAt = Date.now();
        run(['reset-failed', SERVICE]); run(['start', SERVICE]); run(['is-active', '--quiet', SERVICE]);
        await (dependencies.readiness || readiness)(nextPath, startedAt);
        await firstStart.verifyLive();
        assertOwnLock();
        assertPointer(nextTarget); assertPreserved();
        if (!read(stateFile).equals(newState)) fail('REPAIR_STATE_CHANGED');
        maintenance.blockStart(at(DIRECTORY));
        completionBytes = Buffer.from(JSON.stringify({ schemaVersion: 1, releaseId: options.expectedReleaseId,
            setupId: firstStart.setupId, completedAt: new Date().toISOString(),
            licenseConfigured: firstStart.licenseConfigured, physicalControlEnabled: false }) + '\n');
        const completeFd = fs.openSync(completionPath, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW, 0o644);
        try { fs.writeFileSync(completeFd, completionBytes); fs.fsyncSync(completeFd); } finally { fs.closeSync(completeFd); }
        sync(path.dirname(completionPath));
        run(['enable', 'nexowatt-eos.target']);
        run(['disable', 'nexowatt-eos-setup.target']);
        assertPreserved(); assertOwnLock();
        report('ACTIVE');
        assertOwnLock();
        fs.unlinkSync(lockPath); sync(path.dirname(lockPath));
        fs.closeSync(lock); lock = undefined; fs.unlinkSync(guard); sync(path.dirname(guard)); retainLock = false;
        return { ok: true, phase: 'FIRST_START_RECOVERED', releaseId: options.expectedReleaseId, sequence: TARGET_SEQUENCE,
            hardwareTested: false, physicalControlEnabled: false, productionReleaseApproved: false };
    } catch (error) {
        if (transitioned) {
            let recovered = false, gatePresent = false, ownLock = false;
            // Unlock's directory fsync can fail after unlink succeeded. Rebuild
            // the gate before restoration, otherwise reboot could start the old
            // known-broken release despite a RESTORED_STOPPED report.
            try {
                if (!exists(lockPath)) {
                    lock = fs.openSync(lockPath, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW, 0o600);
                    fs.writeFileSync(lock, lockRecord); fs.fsyncSync(lock); sync(path.dirname(lockPath));
                }
                owner(lockPath);
                const stat = fs.lstatSync(lockPath);
                if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.mode & 0o022) fail('REPAIR_LOCK_INVALID');
                ownLock = read(lockPath).equals(Buffer.from(lockRecord));
                if (!ownLock) fail('REPAIR_COORDINATOR_OWNERSHIP_CHANGED');
                gatePresent = true;
            } catch { /* stop/restoration remain mandatory; report recovery required */ }
            if (ownLock) try { maintenance.blockStart(at(DIRECTORY)); } catch { /* stop remains mandatory */ }
            try {
                run(['stop', SERVICE]);
                if (!['inactive', 'failed'].includes(run(['show', SERVICE, '--property=ActiveState', '--value']))) fail('REPAIR_STOP_NOT_CONFIRMED');
                if (!ownLock) fail('REPAIR_COORDINATOR_OWNERSHIP_CHANGED');
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
                recovered = gatePresent;
            } catch { /* the retained lock blocks normal start and reboot */ }
            try { report(recovered ? 'RESTORED_STOPPED' : 'RECOVERY_REQUIRED'); } catch { /* lock itself persists */ }
            fail(recovered ? 'REPAIR_TRIAL_FAILED_RESTORED_STOPPED' : 'REPAIR_RECOVERY_REQUIRED');
        }
        throw error;
    } finally {
        if (lock !== undefined) fs.closeSync(lock);
        // A failed attempt retains the private recovery guard and original/trial
        // activation lock. No implicit retry or boot permission is granted.
    }
}
module.exports = { BASES, TARGET_SEQUENCE, PRESERVED, MALFORMED_PROTECTED_LOCK, parseArgs, atomicWrite, validatePins, validateState, validateBaselineDescription, validateFirstStartLock, validateBindings, readOnlySnapshot, validateTransition, invocationIdentity,
    quiesceIncomplete, quiesceHost, readiness, verifyFirstStart, update };
if (require.main === module) {
    const previousUmask = process.umask(0o022);
    const argv = process.argv.slice(2);
    Promise.resolve().then(() => argv.length === 1 && argv[0] === '--quiesce-incomplete' ? quiesceHost() : update(parseArgs(argv)))
        .then(result => process.stdout.write(JSON.stringify(result) + '\n'))
        .catch(error => { process.stderr.write(JSON.stringify({ ok: false, code: /^REPAIR_[A-Z_]+$/.test(error.code || '') ? error.code : 'REPAIR_FAILED',
            manualRecoveryRequired: true }) + '\n'); process.exitCode = 1; })
        .finally(() => process.umask(previousUmask));
}
