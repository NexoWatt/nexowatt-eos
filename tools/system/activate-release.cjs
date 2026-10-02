'use strict';
// Root-only, additive TEST release activation. No npm, database migration,
// adapter instance creation, Redis restart, config rewrite or remote API.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { command } = require('./host-preflight.cjs');
const { readFileLimited, sha256 } = require('../../runtime/release/bundle.cjs');
const { rootOwned, checkInstalled } = require('../../runtime/release/installed-check.cjs');
const { validatePayload } = require('./build-bundle.cjs');
const { validateProfile } = require('../../runtime/controller-profile/guard.cjs');
const PROFILE_FILE = 'app/node_modules/iobroker.js-controller/eos-test-profile.json';
const MUTABLE_METADATA = new Set(['catalog.json', 'sbom.cdx.json', 'app/package.json', 'app/package-lock.json',
    'app/node_modules/.package-lock.json', PROFILE_FILE]);
const SERVICE = 'nexowatt-eos-controller.service';
function reject(code) { const error = new Error(code); error.code = code; throw error; }
function canonical(value) {
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
    return JSON.stringify(value);
}
const same = (a, b) => canonical(a) === canonical(b);
function without(value, keys) { return Object.fromEntries(Object.entries(value).filter(([k]) => !keys.includes(k))); }
function modulePrefix(file) {
    if (!file.startsWith('app/node_modules/')) return null;
    const parts = file.slice('app/node_modules/'.length).split('/');
    if (parts[0].startsWith('@')) return parts.length >= 3 ? `app/node_modules/${parts[0]}/${parts[1]}/` : null;
    return parts.length >= 2 ? `app/node_modules/${parts[0]}/` : null;
}
function validateAdditive(old, next) {
    if (old.manifest.profile !== 'test' || next.manifest.profile !== 'test' ||
        next.manifest.sequence <= old.manifest.sequence || old.manifest.nodeVersion !== next.manifest.nodeVersion ||
        !same(old.manifest.platforms, next.manifest.platforms)) reject('ACTIVATION_RELEASE_SCOPE');
    const existing = new Map(old.catalog.entries.map(e => [e.id, e]));
    const incoming = new Map(next.catalog.entries.map(e => [e.id, e]));
    const core = existing.get('js-controller'), newCore = incoming.get('js-controller');
    if (core?.kind !== 'core' || !core.required || core.version !== '7.2.2' || !newCore ||
        !same(without(core, ['sha256']), without(newCore, ['sha256']))) reject('ACTIVATION_CORE_CHANGE');
    if (next.catalog.catalogRevision <= old.catalog.catalogRevision) reject('ACTIVATION_CATALOG_SEQUENCE');
    for (const [id, item] of existing) {
        if (id !== 'js-controller' && !same(item, incoming.get(id))) reject('ACTIVATION_EXISTING_ADAPTER_CHANGE');
    }
    const added = next.catalog.entries.filter(e => !existing.has(e.id));
    if (!added.length || added.some(e => e.kind !== 'adapter' || e.required)) reject('ACTIVATION_ADDITIVE_ONLY');
    if (!same(without(old.app, ['dependencies']), without(next.app, ['dependencies']))) reject('ACTIVATION_APP_CHANGE');
    for (const [name, version] of Object.entries(old.app.dependencies || {})) {
        if (next.app.dependencies?.[name] !== version) reject('ACTIVATION_DEPENDENCY_CHANGE');
    }
    if (!same(without(old.lock, ['packages']), without(next.lock, ['packages'])) ||
        !same(without(old.lock.packages?.[''] || {}, ['dependencies']), without(next.lock.packages?.[''] || {}, ['dependencies']))) reject('ACTIVATION_LOCK_CHANGE');
    for (const [name, spec] of Object.entries(old.lock.packages || {})) {
        if (name && !same(spec, next.lock.packages?.[name])) reject('ACTIVATION_EXISTING_DEPENDENCY_CHANGE');
    }
    const oldRows = new Map(old.manifest.files.map(f => [f.path, f]));
    const nextRows = new Map(next.manifest.files.map(f => [f.path, f]));
    const oldModules = new Set(old.manifest.files.map(f => modulePrefix(f.path)).filter(Boolean));
    for (const [name, row] of oldRows) {
        if (!nextRows.has(name)) reject('ACTIVATION_FILE_REMOVAL');
        if (!MUTABLE_METADATA.has(name) && !same(row, nextRows.get(name))) reject('ACTIVATION_EXISTING_CODE_CHANGE');
    }
    for (const name of nextRows.keys()) {
        if (oldRows.has(name) || MUTABLE_METADATA.has(name)) continue;
        const prefix = modulePrefix(name);
        if (!prefix || oldModules.has(prefix)) reject('ACTIVATION_NON_ADDITIVE_FILE');
    }
    const previousProfile = validateProfile(old.profile), profile = validateProfile(next.profile);
    const profiles = new Map(profile.adapters.map(e => [e.package, e]));
    for (const spec of previousProfile.adapters) if (!same(spec, profiles.get(spec.package))) reject('ACTIVATION_PROFILE_CHANGE');
    const expected = next.catalog.entries.filter(e => e.kind === 'adapter');
    if (profile.adapters.length !== expected.length || expected.some(e => profiles.get(e.package)?.version !== e.version)) reject('ACTIVATION_PROFILE_CATALOG_MISMATCH');
    return { added: added.map(e => ({ id: e.id, package: e.package, version: e.version })) };
}
function syncDirectory(directory) {
    const fd = fs.openSync(directory, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
    try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function atomicWrite(file, content) {
    const directory = path.dirname(file), temp = path.join(directory, `.eos-write-${crypto.randomBytes(12).toString('hex')}`);
    let fd;
    try {
        fd = fs.openSync(temp, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o644);
        fs.writeFileSync(fd, content); fs.fsyncSync(fd); fs.closeSync(fd); fd = undefined;
        fs.renameSync(temp, file); syncDirectory(directory);
    } finally { if (fd !== undefined) fs.closeSync(fd); if (fs.existsSync(temp)) fs.unlinkSync(temp); }
}
function activateRelease(options, dependencies = {}) {
    const uid = dependencies.uid ?? process.getuid?.();
    if (uid !== 0) reject('ROOT_OPERATOR_REQUIRED');
    if (!options || !/^[a-f0-9]{64}$/.test(options.releaseId || '') || !/^[a-f0-9]{64}$/.test(options.publicKeySha256 || '') ||
        options.releasePath !== `/opt/nexowatt/eos/releases/${options.releaseId}`) reject('ACTIVATION_STAGED_RELEASE_REQUIRED');
    const root = dependencies.root || '/', at = p => path.join(root, p);
    const maintenance = dependencies.maintenance || require('../../runtime/release/maintenance.cjs');
    const exec = dependencies.exec || command, ownerCheck = dependencies.ownerCheck || rootOwned;
    const stateFile = at('/etc/nexowatt-eos/release-state.json');
    const current = at('/opt/nexowatt/eos/current');
    const lockPath = at('/etc/nexowatt-eos/.activation.lock');
    const journal = at('/etc/nexowatt-eos/activation-status.json');
    const writeAtomic = dependencies.atomicWrite || atomicWrite;
    ownerCheck(path.dirname(stateFile)); ownerCheck(path.dirname(current));
    let lock;
    try { lock = fs.openSync(lockPath, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600); }
    catch (e) { if (e.code === 'EEXIST') reject('ACTIVATION_IN_PROGRESS'); throw e; }
    const operationId = crypto.randomUUID();
    let retainLock = false, transition = false, original, state, oldTarget;
    const report = (phase, fields = {}) => writeAtomic(journal, JSON.stringify({ schemaVersion: 1, kind: 'eos-additive-activation',
        operationId, phase, targetReleaseId: options.releaseId, previousReleaseId: state?.releaseId || null,
        at: new Date().toISOString(), ...fields }) + '\n');
    const run = args => { const r = exec('/usr/bin/systemctl', args, { timeout: 90000 }); if (r.status !== 0 || r.error) reject('ACTIVATION_SERVICE_COMMAND_FAILED'); return r.stdout; };
    function pointer(target, expected) {
        if (!fs.lstatSync(current).isSymbolicLink() || fs.readlinkSync(current) !== expected) reject('ACTIVATION_CURRENT_CHANGED');
        const temp = at(`/opt/nexowatt/eos/.current-${crypto.randomBytes(12).toString('hex')}`);
        try { fs.symlinkSync(target, temp); fs.renameSync(temp, current); syncDirectory(path.dirname(current)); }
        finally { try { fs.unlinkSync(temp); } catch (error) { if (error.code !== 'ENOENT') throw error; } }
    }
    const loadDescriptor = dependencies.loadDescriptor || ((id, nodeVersion) => {
        const release = at(`/opt/nexowatt/eos/releases/${id}`), evidence = at(`/opt/nexowatt/eos/verified/${id}`);
        checkInstalled({ releasePath: release, evidencePath: evidence, expectedNodeVersion: nodeVersion, ownerCheck });
        const load = name => JSON.parse(readFileLimited(path.join(release, name), 16 * 1024 * 1024).bytes);
        const key = readFileLimited(path.join(evidence, 'release-public.pem'), 16384).bytes;
        if (sha256(key) !== state.publicKeySha256) reject('ACTIVATION_KEY_CHANGE');
        const manifest = JSON.parse(readFileLimited(path.join(evidence, 'manifest.json'), 16 * 1024 * 1024).bytes);
        const { catalog } = validatePayload(release, manifest);
        return { manifest, catalog, app: load('app/package.json'), lock: load('app/package-lock.json'), profile: load(PROFILE_FILE) };
    });
    try {
        fs.writeFileSync(lock, JSON.stringify({ operationId, pid: process.pid, targetReleaseId: options.releaseId }) + '\n'); fs.fsyncSync(lock); syncDirectory(path.dirname(lockPath));
        ownerCheck(stateFile);
        original = readFileLimited(stateFile, 65536).bytes;
        state = JSON.parse(original);
        if (state.schemaVersion !== 1 || state.profile !== 'test' || !/^[a-f0-9]{64}$/.test(state.releaseId || '') ||
            !Number.isSafeInteger(state.sequence) || state.sequence < 1 || state.publicKeySha256 !== options.publicKeySha256 ||
            !/^\d+\.\d+\.\d+$/.test(state.nodeVersion || '') || state.nodeVersion !== (dependencies.nodeVersion || process.versions.node)) reject('ACTIVATION_STATE_INVALID');
        oldTarget = `/opt/nexowatt/eos/releases/${state.releaseId}`;
        if (!fs.lstatSync(current).isSymbolicLink() || fs.lstatSync(current).uid !== 0 || fs.readlinkSync(current) !== oldTarget) reject('ACTIVATION_CURRENT_STATE_MISMATCH');
        ownerCheck(at('/var/lib/nexowatt-eos/.initialized'));
        const old = loadDescriptor(state.releaseId, state.nodeVersion), next = loadDescriptor(options.releaseId, state.nodeVersion);
        if (old.manifest.sequence !== state.sequence) reject('ACTIVATION_SEQUENCE_STATE_MISMATCH');
        const delta = validateAdditive(old, next);
        run(['is-active', '--quiet', SERVICE]); // Activation requires a healthy running baseline.
        report('PREPARED', { newSequence: next.manifest.sequence, added: delta.added });
        transition = true;
        run(['stop', SERVICE]);
        report('SWITCHING');
        pointer(options.releasePath, oldTarget);
        report('VERIFYING_START');
        maintenance.authorizeStart(at('/etc/nexowatt-eos'), 'additive-release');
        run(['reset-failed', SERVICE]); // Reset only this explicitly managed controller's prior start budget.
        run(['start', SERVICE]); // blocks through installed-check, TLS and actual controller readiness ExecStartPost.
        run(['is-active', '--quiet', SERVICE]);
        writeAtomic(stateFile, JSON.stringify({ ...state, releaseId: options.releaseId, sequence: next.manifest.sequence }) + '\n');
        report('ACTIVE', { sequence: next.manifest.sequence, added: delta.added, adapterInstancesCreated: 0 });
        return { ok: true, phase: 'ADDITIVE_RELEASE_ACTIVE', releaseId: options.releaseId, sequence: next.manifest.sequence,
            added: delta.added, adapterInstancesCreated: 0, productionReleaseApproved: false };
    } catch (error) {
        if (!transition) throw error;
        // Permit revocation I/O can fail too. Still attempt to stop the trial
        // and restore the previous release; final cleanup keeps the gate shut.
        try { maintenance.blockStart(at('/etc/nexowatt-eos')); } catch { /* recovery must still run */ }
        // Evidence I/O must never prevent attempting physical restoration. The
        // final state/journal still have to be durable before releasing the lock.
        try { report('RECOVERING_PREVIOUS_RELEASE'); } catch { /* continue recovery */ }
        try {
            run(['stop', SERVICE]);
            const target = fs.readlinkSync(current);
            if (target === options.releasePath) pointer(oldTarget, options.releasePath);
            else if (target !== oldTarget) reject('ACTIVATION_CURRENT_CHANGED');
            maintenance.authorizeStart(at('/etc/nexowatt-eos'), 'additive-release');
            run(['reset-failed', SERVICE]);
            run(['start', SERVICE]); run(['is-active', '--quiet', SERVICE]);
            writeAtomic(stateFile, original);
            report('ROLLED_BACK', { restoredReleaseId: state.releaseId });
        } catch {
            retainLock = true;
            try { report('RECOVERY_FAILED', { manualRecoveryRequired: true }); } catch { /* locked state still signals interruption */ }
            reject('ACTIVATION_RECOVERY_FAILED');
        }
        reject('ACTIVATION_ROLLED_BACK');
    } finally {
        fs.closeSync(lock);
        try { maintenance.blockStart(at('/etc/nexowatt-eos')); }
        catch {
            retainLock = true;
            // Do not leave a controller running after incomplete gate cleanup.
            if (transition) { try { run(['stop', SERVICE]); } catch { /* manual recovery is required */ } }
            reject('ACTIVATION_CLEANUP_INCOMPLETE');
        }
        if (!retainLock) { fs.unlinkSync(lockPath); syncDirectory(path.dirname(lockPath)); }
    }
}
module.exports = { activateRelease, validateAdditive, PROFILE_FILE, MUTABLE_METADATA, atomicWrite };
if (require.main === module) { process.stderr.write('Use the signed EOS release orchestrator for activation.\n'); process.exitCode = 2; }
