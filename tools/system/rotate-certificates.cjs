#!/usr/bin/env node
'use strict';
// Root-operator maintenance only. No privileged HTTP/adapter endpoint is exposed.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { isDeepStrictEqual } = require('node:util');
const { command } = require('./host-preflight.cjs');
const { rootOwned, checkInstalled } = require('../../runtime/release/installed-check.cjs');
const { readFileLimited } = require('../../runtime/release/bundle.cjs');
const { parseBoundedJson } = require('../../runtime/policy/admission.cjs');
const lifecycle = require('../../runtime/transport/certificate-lifecycle.cjs');
const { probeConfig } = require('../../runtime/transport/redis-tls.cjs');
const { validateProfile } = require('../../runtime/controller-profile/guard.cjs');
const { strongHash, PROFILE: ENROLLMENT_PROFILE } = require('../../runtime/bootstrap/enrollment.cjs');
const accountsPolicy = require('../../runtime/bootstrap/accounts.cjs');
const { authorizeStart, blockStart } = require('../../runtime/release/maintenance.cjs');
const { inspectWeb, probeWeb } = require('../../runtime/transport/web-certificates.cjs');
const webRenewal = require('../../runtime/transport/web-renewal.cjs');
const CONTROLLER = 'nexowatt-eos-controller.service';
const STORES = ['nexowatt-eos-redis@objects.service', 'nexowatt-eos-redis@states.service'];
const MARKERS = ['system.meta.eosTestBase', 'system.meta.eosEnrollment'];
const fail = code => { throw Object.assign(new Error(code), { code }); };
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function load(file) { rootOwned(file); return JSON.parse(JSON.stringify(parseBoundedJson(readFileLimited(file, 1048576).bytes.toString('utf8')))); }
function sync(directory) { const fd = fs.openSync(directory, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW); try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); } }
function rebindEnrollmentMarker(marker, oldConfig, newConfig) {
    if (marker == null) return null;
    // Re-use the same strict "CA-only" difference check as core binding.
    lifecycle.rebindMarker({ _id: MARKERS[0], type: 'meta', native: { profile: 'eos-core-only-bootstrap-v1',
        coreControllerVersion: '7.2.2', bootstrapPolicyVersion: 1, creationAppLockSha256: '0'.repeat(64), state: 'complete',
        runtimeConfigSha256: hash(JSON.stringify(oldConfig)) } }, oldConfig, newConfig);
    if (marker._id !== MARKERS[1] || marker.type !== 'meta' || marker.native?.profile !== ENROLLMENT_PROFILE ||
        marker.native.version !== 2 || marker.native.state !== 'complete' || marker.native.physicalControlEnabled !== false ||
        ![hash(JSON.stringify(oldConfig)), hash(JSON.stringify(newConfig))].includes(marker.native.runtimeConfigSha256)) fail('ENROLLMENT_MARKER_REBIND_REJECTED');
    const result = structuredClone(marker); result.native.runtimeConfigSha256 = hash(JSON.stringify(newConfig)); return result;
}
function verifyHost(root = '/', overrides = {}) {
    const at = name => path.join(root, name);
    const state = load(at('/etc/nexowatt-eos/release-state.json'));
    if (state.schemaVersion !== 1 || state.profile !== 'test' || state.nodeVersion !== process.versions.node ||
        !/^[a-f0-9]{64}$/.test(state.releaseId || '') || !/^[a-f0-9]{64}$/.test(state.publicKeySha256 || '') ||
        !Number.isSafeInteger(state.sequence) || state.sequence < 1) fail('CERTIFICATE_RELEASE_STATE_REJECTED');
    const target = `/opt/nexowatt/eos/releases/${state.releaseId}`, current = at('/opt/nexowatt/eos/current');
    rootOwned(path.dirname(current));
    const st = fs.lstatSync(current);
    if (!st.isSymbolicLink() || st.uid !== 0 || fs.readlinkSync(current) !== target) fail('CERTIFICATE_CURRENT_RELEASE_REJECTED');
    const release = at(target), evidence = at(`/opt/nexowatt/eos/verified/${state.releaseId}`);
    rootOwned(at('/var/lib/nexowatt-eos/.initialized'));
    const result = (overrides.checkInstalled || checkInstalled)({ releasePath: release, evidencePath: evidence });
    if (!result.ok || result.sequence !== state.sequence || result.releaseId !== state.releaseId) fail('CERTIFICATE_RELEASE_BINDING_REJECTED');
    if (hash(readFileLimited(path.join(evidence, 'release-public.pem'), 16384).bytes) !== state.publicKeySha256) fail('CERTIFICATE_RELEASE_KEY_REJECTED');
    const profile = load(path.join(release, 'app/node_modules/iobroker.js-controller/eos-test-profile.json'));
    if (profile.schemaVersion !== 1 || profile.kind !== 'eos-controller-test-profile' || profile.controllerVersion !== '7.2.2' ||
        !Array.isArray(profile.adapters)) fail('CERTIFICATE_CONTROLLER_PROFILE_REJECTED');
    validateProfile(profile);
    return { release, state, profile };
}
async function updateMarkers(objects, oldConfig, newConfig) {
    const original = await Promise.all(MARKERS.map(id => objects.getObjectAsync(id)));
    const updated = [lifecycle.rebindMarker(original[0], oldConfig, newConfig), rebindEnrollmentMarker(original[1], oldConfig, newConfig)];
    async function verifyAccounts() {
        if (!original[1]) return; // The core-only profile has no enrolled users.
        const admin = await objects.getObjectAsync('system.user.admin');
        if (admin?._id !== 'system.user.admin' || admin.type !== 'user' || admin.common?.enabled !== true) fail('ENROLLMENT_ADMIN_DISABLED');
        strongHash(admin.common.password);
        if (!isDeepStrictEqual(admin.acl, accountsPolicy.PRIVATE_ACL)) fail('ENROLLMENT_SERVICE_ACL');
        // EOS-CERT-ACCOUNT-02: CA rotation preserves the existing enrollment
        // authority. Reuse its exact role, group, object-ACL and password-setup
        // invariants; rotation never migrates or repairs accounts implicitly.
        await accountsPolicy.verifyAccounts(objects, original[1], strongHash);
    }
    await verifyAccounts();
    // Validate both before writing either. Recovery tolerates a crash between
    // writes by accepting only each marker's exact old or new complete binding.
    for (let i = 0; i < MARKERS.length; i++) if (updated[i]) await objects.setObjectAsync(MARKERS[i], updated[i]);
    for (let i = 0; i < MARKERS.length; i++) if (updated[i] && !isDeepStrictEqual(await objects.getObjectAsync(MARKERS[i]), updated[i])) fail('CERTIFICATE_MARKER_WRITE_REJECTED');
    await verifyAccounts();
    return { status: 'CERTIFICATE_MARKERS_REBOUND', enrollmentPresent: !!updated[1] };
}
async function markerWorker(direction) {
    if (process.getuid?.() !== 0 || !['forward', 'backward'].includes(direction)) fail('ROOT_OPERATOR_REQUIRED');
    const lock = load('/etc/nexowatt-eos/.activation.lock');
    if (lock.operation !== 'certificate-rotation' || lock.pid !== process.ppid) fail('CERTIFICATE_WORKER_CONTEXT_REJECTED');
    const { release } = verifyHost();
    const directory = '/etc/nexowatt-eos/.eos-transport-rotation';
    const oldConfig = load(path.join(directory, direction === 'forward' ? 'previous-config.json' : 'next-config.json'));
    const newConfig = load(path.join(directory, direction === 'forward' ? 'next-config.json' : 'previous-config.json'));
    const current = load('/etc/nexowatt-eos/iobroker.json');
    if (!isDeepStrictEqual(current, newConfig)) fail('CERTIFICATE_WORKER_CONFIG_REJECTED');
    const requireApp = createRequire(path.join(release, 'app/package.json'));
    const Client = requireApp('@iobroker/db-objects-redis').Client;
    const logger = Object.fromEntries(['silly', 'debug', 'info', 'warn', 'error'].map(k => [k, () => {}]));
    let client;
    // Hard process budget also bounds DB cleanup. Parent additionally kills this
    // isolated worker after 25s; there is no detached network operation.
    const deadline = setTimeout(() => { process.stdout.write('{"status":"REJECTED","code":"CERTIFICATE_DB_TIMEOUT"}\n'); process.exit(1); }, 20000);
    try {
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('DATABASE_CONNECT_TIMEOUT')), 5000);
            client = new Client({ connection: structuredClone(current.objects), logger,
                connected: () => { clearTimeout(timeout); resolve(); }, disconnected: () => {}, change: () => {} });
        });
        return await updateMarkers(client, oldConfig, newConfig);
    } finally { if (client) await client.destroy(); clearTimeout(deadline); }
}
function acquire(lockPath, mode, pidAlive = pid => { try { process.kill(pid, 0); return true; } catch (e) { if (e.code === 'ESRCH') return false; throw e; } }, operation = 'certificate-rotation') {
    rootOwned(path.dirname(lockPath));
    let recoveryGuard;
    const guardPath = `${lockPath}.recovery`;
    if (mode === 'recover') {
        try { recoveryGuard = fs.openSync(guardPath, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600); }
        catch (e) { if (e.code === 'EEXIST') fail('EOS_MAINTENANCE_RECOVERY_IN_PROGRESS'); throw e; }
    }
    try {
    if (fs.existsSync(lockPath)) {
        if (mode !== 'recover') fail('EOS_MAINTENANCE_IN_PROGRESS');
        const previous = load(lockPath);
        if (previous.operation !== operation || !Number.isInteger(previous.pid) || previous.pid < 2 || pidAlive(previous.pid)) fail('EOS_MAINTENANCE_LOCK_LIVE_OR_FOREIGN');
        // Recovery never deletes a live/foreign operation lock. Rename evidence
        // then create a fresh exclusive lock while the stale lock is held by no process.
        const retired = `${lockPath}.recovered-${crypto.randomBytes(12).toString('hex')}`;
        fs.renameSync(lockPath, retired); sync(path.dirname(lockPath));
    }
    let fd;
    try { fd = fs.openSync(lockPath, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600); }
    catch (e) { if (e.code === 'EEXIST') fail('EOS_MAINTENANCE_IN_PROGRESS'); throw e; }
    fs.writeFileSync(fd, JSON.stringify({ schemaVersion: 1, operation, pid: process.pid, at: new Date().toISOString() }) + '\n');
    fs.fsyncSync(fd); fs.closeSync(fd); sync(path.dirname(lockPath));
    } finally {
        if (recoveryGuard !== undefined) { fs.closeSync(recoveryGuard); fs.unlinkSync(guardPath); sync(path.dirname(guardPath)); }
    }
}
async function runOperation(mode, dependencies = {}) {
    if ((dependencies.uid ?? process.getuid?.()) !== 0) fail('ROOT_OPERATOR_REQUIRED');
    if (!['status', 'rotate', 'recover', 'rotate-web', 'recover-web'].includes(mode)) fail('USAGE');
    const root = dependencies.root || '/', at = name => path.join(root, name);
    const exec = dependencies.exec || command;
    const permitStart = dependencies.authorizeStart || authorizeStart, denyStart = dependencies.blockStart || blockStart;
    const options = { directory: at('/etc/nexowatt-eos/transport'), configPath: at('/etc/nexowatt-eos/iobroker.json') };
    const work = at('/etc/nexowatt-eos/.eos-transport-rotation'), webWork = at('/etc/nexowatt-eos/.eos-web-renewal');
    const lock = at('/etc/nexowatt-eos/.activation.lock'), etc = at('/etc/nexowatt-eos'), web = at('/etc/nexowatt-eos/web');
    const operation = mode.endsWith('-web') ? 'web-certificate-rotation' : 'certificate-rotation';
    acquire(lock, mode.startsWith('recover') ? 'recover' : mode, dependencies.pidAlive, operation);
    let retain = false, verified;
    const run = args => {
        const result = exec('/usr/bin/systemctl', args, { timeout: 90000 });
        if (result.error || result.status !== 0) fail('CERTIFICATE_SERVICE_COMMAND_FAILED'); return result.stdout.trim();
    };
    const rebind = dependencies.rebind || ((oldConfig, newConfig) => {
        const next = load(path.join(work, 'next-config.json'));
        const direction = isDeepStrictEqual(newConfig, next) ? 'forward' : 'backward';
        const result = exec('/usr/bin/node', [path.join(verified.release, 'tools/system/rotate-certificates.cjs'), 'rebind', direction], { timeout: 25000 });
        if (result.error || result.status !== 0) fail('CERTIFICATE_DB_REBIND_FAILED');
        try { if (JSON.parse(result.stdout).status !== 'CERTIFICATE_MARKERS_REBOUND') fail('CERTIFICATE_DB_REBIND_FAILED'); }
        catch { fail('CERTIFICATE_DB_REBIND_FAILED'); }
    });
    function stopManaged(includeStores) {
        let error;
        try { denyStart(etc); } catch (e) { error = e; }
        // A failed permit/journal write must not prevent attempts to stop every
        // affected physical service. No file swap follows any stop uncertainty.
        for (const group of includeStores ? [[CONTROLLER], STORES] : [[CONTROLLER]]) {
            try { run(['stop', ...group]); } catch (e) { error ||= e; }
        }
        for (const service of includeStores ? [CONTROLLER, ...STORES] : [CONTROLLER]) {
            try {
                if (!['inactive', 'failed'].includes(run(['show', service, '--property=ActiveState', '--value'])) ||
                    run(['show', service, '--property=MainPID', '--value']) !== '0') fail('CERTIFICATE_CONSUMERS_NOT_STOPPED');
            } catch (e) { error ||= e; }
        }
        if (error) throw error;
    }
    const hooks = {
        stop: async () => stopManaged(true),
        startStores: async () => { run(['reset-failed', ...STORES]); run(['start', ...STORES]); run(['is-active', '--quiet', ...STORES]); },
        startController: async () => { permitStart(etc, operation); run(['reset-failed', CONTROLLER]); run(['start', CONTROLLER]); run(['is-active', '--quiet', CONTROLLER]); },
        probe: dependencies.probe || probeConfig,
        rebindMarker: rebind,
    };
    try {
        verified = (dependencies.verifyHost || verifyHost)(root);
        if (mode === 'status') {
            if (fs.existsSync(work) || fs.existsSync(webWork)) return { status: 'CERTIFICATE_ROTATION_RECOVERY_REQUIRED', transportReady: false };
            const internal = lifecycle.inspect(options);
            if (!fs.existsSync(web)) {
                if (verified.profile?.adapters.some(adapter => ['iobroker.eos-admin', 'iobroker.nexowatt-ui'].includes(adapter.package))) fail('WEB_CERTIFICATE_MISSING');
                return internal;
            }
            const https = inspectWeb({ directory: web });
            return { ...internal, status: internal.status === 'CERTIFICATES_INVALID' ? internal.status :
                internal.status === 'RENEWAL_DUE' || https.status !== 'VALID' ? 'RENEWAL_DUE' : 'CERTIFICATES_VALID', web: https };
        }
        if (mode.endsWith('-web')) {
            if (fs.existsSync(work)) fail('TRANSPORT_ROTATION_RECOVERY_REQUIRED');
            const webHooks = { stop: async () => stopManaged(false), start: hooks.startController,
                probe: dependencies.webProbe || (() => probeWeb({ directory: web })) };
            if (mode === 'recover-web') return await webRenewal.recoverRenewal({ directory: web }, webHooks);
            webRenewal.prepareRenewal({ directory: web });
            return await webRenewal.activateRenewal({ directory: web }, webHooks);
        }
        if (fs.existsSync(webWork)) fail('WEB_ROTATION_RECOVERY_REQUIRED');
        if (mode === 'recover') return await lifecycle.recoverRotation(options, hooks);
        lifecycle.prepareRotation(options);
        return await lifecycle.activateRotation(options, hooks);
    } catch (e) { retain = fs.existsSync(work) || fs.existsSync(webWork); throw e; }
    finally { denyStart(etc); if (!retain) { fs.unlinkSync(lock); sync(path.dirname(lock)); } }
}
async function main(argv = process.argv.slice(2)) {
    let deadline;
    try {
        if (argv[0] === 'rebind' && argv.length === 2) {
            const result = await markerWorker(argv[1]); process.stdout.write(`${JSON.stringify(result)}\n`); return 0;
        }
        if (argv.length !== 1) fail('USAGE');
        // Fixed subprocess operations have their own shorter kill deadlines.
        // A killed process leaves lock+journal for explicit recovery, not auto-start.
        deadline = setTimeout(() => { process.stdout.write('{"status":"REJECTED","code":"CERTIFICATE_OPERATION_TIMEOUT"}\n'); process.exit(1); }, 600000);
        const result = await runOperation(argv[0]); process.stdout.write(`${JSON.stringify(result)}\n`);
        if (result.status === 'RENEWAL_DUE') return 3;
        if (['CERTIFICATES_INVALID', 'CERTIFICATE_ROTATION_RECOVERY_REQUIRED'].includes(result.status)) return 2;
        return 0;
    } catch (e) {
        process.stdout.write(`${JSON.stringify({ status: 'REJECTED', code: /^[A-Z_]{3,80}$/.test(e.code || '') ? e.code : 'CERTIFICATE_OPERATION_REJECTED' })}\n`); return 1;
    } finally { if (deadline) clearTimeout(deadline); }
}
if (require.main === module) main().then(code => { process.exitCode = code; });
module.exports = { runOperation, verifyHost, rebindEnrollmentMarker, updateMarkers, main, CONTROLLER, STORES };
