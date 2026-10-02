#!/usr/bin/env node
'use strict';

// EOS-CERT-LIFECYCLE-01. Privileged, offline trust rotation. This module never
// grants a runtime process privileges or relaxes TLS during expiry/recovery.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { provision, PROFILE } = require('./redis-tls.cjs');
const { validateConfig } = require('../../security/verify-runtime-tls.cjs');
const { parseBoundedJson } = require('../policy/admission.cjs');
const SCOPES = ['objects', 'states'];
const FILES = ['manifest.json', 'certs/ca.crt', ...SCOPES.flatMap(s => [`certs/${s}.crt`, `certs/${s}.key`, `redis/${s}.conf`]), 'credentials/iobroker-databases.json'];
const DAY = 86400000;
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const fail = code => { const e = new Error(code); e.code = code; throw e; };
const plain = value => value && typeof value === 'object' && !Array.isArray(value);
function rootOnly() { if (process.getuid?.() !== 0) fail('ROOT_OPERATOR_REQUIRED'); }
function absolute(value) {
    if (typeof value !== 'string' || !path.isAbsolute(value) || /[\x00-\x1f\x7f]/u.test(value) || path.resolve(value) !== value) fail('INVALID_PATH');
    return value;
}
function protectedPath(file, allowMissing = false) {
    absolute(file);
    let cursor = file;
    while (true) {
        let st;
        try { st = fs.lstatSync(cursor); } catch (e) { if (!allowMissing || e.code !== 'ENOENT' || cursor !== file) throw e; }
        if (st && (st.isSymbolicLink() || st.uid !== 0 || (st.mode & 0o022) !== 0)) fail('UNTRUSTED_CERTIFICATE_PATH');
        if (path.dirname(cursor) === cursor) break;
        cursor = path.dirname(cursor);
    }
}
function bytes(file, maximum = 1048576) {
    protectedPath(file);
    const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    try {
        const st = fs.fstatSync(fd);
        if (!st.isFile() || st.nlink !== 1 || st.size > maximum) fail('CERTIFICATE_FILE_REJECTED');
        return fs.readFileSync(fd);
    } finally { fs.closeSync(fd); }
}
function json(file) { return JSON.parse(JSON.stringify(parseBoundedJson(bytes(file).toString('utf8')))); }
function syncDirectory(directory) {
    const fd = fs.openSync(directory, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
    try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function write(file, content, mode = 0o600, gid = 0) {
    const fd = fs.openSync(file, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, mode);
    try { fs.writeFileSync(fd, content); fs.fchownSync(fd, 0, gid); fs.fchmodSync(fd, mode); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function atomic(file, content, mode = 0o600, gid = 0) {
    const next = `${file}.next-${crypto.randomBytes(12).toString('hex')}`;
    try { write(next, content, mode, gid); fs.renameSync(next, file); syncDirectory(path.dirname(file)); }
    finally { if (fs.existsSync(next)) fs.unlinkSync(next); }
}
function digestTree(directory) {
    return hash(JSON.stringify(FILES.map(name => [name, hash(bytes(path.join(directory, name)))])));
}
function checkPair(directory, scope, ca) {
    const cert = new crypto.X509Certificate(bytes(path.join(directory, 'certs', `${scope}.crt`), 16384));
    const key = crypto.createPrivateKey(bytes(path.join(directory, 'certs', `${scope}.key`), 8192));
    if (cert.ca || !cert.verify(ca.publicKey) || !cert.checkIssued(ca) || cert.subjectAltName !== `DNS:eos-${scope}.internal` ||
        !cert.keyUsage?.includes('1.3.6.1.5.5.7.3.1') || cert.publicKey.asymmetricKeyType !== 'ec' ||
        cert.publicKey.asymmetricKeyDetails?.namedCurve !== 'prime256v1' ||
        !cert.checkPrivateKey(key)) fail('CERTIFICATE_IDENTITY_REJECTED');
    return cert;
}
function snapshot({ directory, configPath, nowMs = Date.now(), warningDays = 30 }) {
    rootOnly();
    protectedPath(directory); protectedPath(configPath);
    if (path.dirname(directory) !== path.dirname(configPath) || !Number.isFinite(nowMs) ||
        !Number.isInteger(warningDays) || warningDays < 1 || warningDays > 60) fail('INVALID_LIFECYCLE_OPTIONS');
    const config = json(configPath);
    const fragment = json(path.join(directory, 'credentials/iobroker-databases.json'));
    const manifest = json(path.join(directory, 'manifest.json'));
    for (const secret of [configPath, path.join(directory, 'credentials/iobroker-databases.json'),
        ...SCOPES.map(scope => path.join(directory, 'certs', `${scope}.key`))]) {
        if ((fs.statSync(secret).mode & 0o007) !== 0) fail('SECRET_FILE_PERMISSIONS_REJECTED');
    }
    if (!validateConfig(config).configurationMatchesProfile || !validateConfig(fragment).configurationMatchesProfile ||
        manifest.profile !== PROFILE || manifest.bind !== '127.0.0.1' || manifest.tls !== 'TLSv1.3' || manifest.caKeyRetained !== false ||
        !plain(manifest.ports) || manifest.ports.objects === manifest.ports.states || !path.isAbsolute(manifest.dataDirectory || '') ||
        fs.existsSync(path.join(directory, 'authority'))) fail('TRANSPORT_POLICY_DRIFT');
    absolute(manifest.dataDirectory);
    if (manifest.dataDirectory === directory || manifest.dataDirectory.startsWith(directory + path.sep) ||
        manifest.dataDirectory.includes(`${path.sep}.eos-transport-rotation`)) fail('EXTERNAL_DATABASE_DIRECTORY_REQUIRED');
    const ca = new crypto.X509Certificate(bytes(path.join(directory, 'certs/ca.crt'), 16384));
    if (!ca.ca || !ca.verify(ca.publicKey) || ca.publicKey.asymmetricKeyType !== 'ec' ||
        ca.publicKey.asymmetricKeyDetails?.namedCurve !== 'prime256v1') fail('CERTIFICATE_AUTHORITY_REJECTED');
    const certs = { ca };
    for (const scope of SCOPES) {
        if (!isDeepStrictEqual(fragment[scope], config[scope]) || config[scope].host !== '127.0.0.1' ||
            config[scope].port !== manifest.ports[scope] || config[scope].options.username !== 'eos-runtime' ||
            !/^[a-f0-9]{64}$/.test(config[scope].options.auth_pass || '') ||
            config[scope].options.tls.servername !== `eos-${scope}.internal` ||
            config[scope].options.tls.ca !== ca.toString()) fail('TRANSPORT_CONFIGURATION_MISMATCH');
        certs[scope] = checkPair(directory, scope, ca);
        if (certs[scope].fingerprint256 !== manifest.fingerprints?.[scope]) fail('CERTIFICATE_MANIFEST_MISMATCH');
        const lines = bytes(path.join(directory, 'redis', `${scope}.conf`), 65536).toString('utf8').trimEnd().split('\n');
        const expected = ['bind 127.0.0.1', 'protected-mode yes', 'port 0', `tls-port ${manifest.ports[scope]}`,
            `tls-cert-file ${JSON.stringify(path.join(directory, 'certs', `${scope}.crt`))}`,
            `tls-key-file ${JSON.stringify(path.join(directory, 'certs', `${scope}.key`))}`,
            `tls-ca-cert-file ${JSON.stringify(path.join(directory, 'certs/ca.crt'))}`,
            `dir ${JSON.stringify(path.join(manifest.dataDirectory, scope))}`,
            'tls-protocols "TLSv1.3"', 'tls-auth-clients no', 'tls-session-caching no', 'user default off',
            `user eos-runtime on #${hash(config[scope].options.auth_pass)} ~* &* +@all -@dangerous +info +keys +client|setname +script|load +script|exists`];
        for (const item of expected) if (lines.filter(line => line === item).length !== 1) fail('REDIS_CERTIFICATE_POLICY_DRIFT');
        // A duplicate directive or ACL declaration could override an apparently safe line.
        const directives = lines.filter(line => line.trim() && !line.startsWith('#')).map(line => line.split(/\s+/)[0]);
        const unique = directives.filter(name => name !== 'user');
        if (new Set(unique).size !== unique.length || directives.filter(name => name === 'user').length !== 2 ||
            directives.some(name => ['include', 'loadmodule', 'aclfile'].includes(name))) fail('REDIS_CERTIFICATE_POLICY_DRIFT');
    }
    const records = Object.fromEntries(Object.entries(certs).map(([name, cert]) => [name, {
        fingerprintSha256: cert.fingerprint256, validFrom: cert.validFromDate.toISOString(), validTo: cert.validToDate.toISOString(),
        remainingDays: Math.floor((cert.validToDate.getTime() - nowMs) / DAY),
    }]));
    const valid = Object.values(certs).every(cert => nowMs >= cert.validFromDate.getTime() && nowMs < cert.validToDate.getTime());
    const renewalDue = Object.values(certs).some(cert => cert.validToDate.getTime() - nowMs <= warningDays * DAY);
    return { config, manifest, records, valid, renewalDue, status: valid ? renewalDue ? 'RENEWAL_DUE' : 'CERTIFICATES_VALID' : 'CERTIFICATES_INVALID',
        directory, configPath, nowMs, warningDays };
}
function inspect(options) {
    const value = snapshot(options);
    return { schemaVersion: 1, kind: 'eos-transport-certificate-status', status: value.status,
        checkedAt: new Date(value.nowMs).toISOString(), warningDays: value.warningDays, certificates: value.records,
        transportReady: value.valid, renewalDue: value.renewalDue, onlineSigningKey: false };
}
function paths(directory, configPath) {
    absolute(directory); absolute(configPath);
    if (path.dirname(directory) !== path.dirname(configPath)) fail('INVALID_LIFECYCLE_OPTIONS');
    const work = path.join(path.dirname(directory), '.eos-transport-rotation');
    if ([directory, configPath].includes(work)) fail('INVALID_LIFECYCLE_OPTIONS');
    return { directory, configPath, work, next: path.join(work, 'next'), previous: path.join(work, 'previous'),
        oldConfig: path.join(work, 'previous-config.json'), newConfig: path.join(work, 'next-config.json'), journal: path.join(work, 'journal.json') };
}
function journalWrite(p, value) { atomic(p.journal, `${JSON.stringify(value)}\n`); }
function prepareRotation(options) {
    rootOnly();
    const before = snapshot(options);
    const p = paths(options.directory, options.configPath);
    // The exclusive directory is both a transaction lock and recovery evidence.
    protectedPath(p.work, true);
    try { fs.mkdirSync(p.work, { mode: 0o700 }); } catch (e) { if (e.code === 'EEXIST') fail('ROTATION_ALREADY_PENDING'); throw e; }
    syncDirectory(path.dirname(p.work));
    try {
        const oldBytes = bytes(p.configPath);
        write(p.oldConfig, oldBytes);
        const generated = provision({ directory: p.next, dataDirectory: before.manifest.dataDirectory, ports: before.manifest.ports });
        const nextFragment = json(path.join(p.next, 'credentials/iobroker-databases.json'));
        const nextConfig = structuredClone(before.config);
        for (const scope of SCOPES) {
            nextConfig[scope].options.tls.ca = nextFragment[scope].options.tls.ca;
            nextFragment[scope] = structuredClone(nextConfig[scope]);
            // Keep the authenticated account, ACL, data locations and Redis tuning.
            atomic(path.join(p.next, 'redis', `${scope}.conf`), bytes(path.join(p.directory, 'redis', `${scope}.conf`)));
        }
        atomic(path.join(p.next, 'credentials/iobroker-databases.json'), `${JSON.stringify(nextFragment, null, 2)}\n`);
        generated.rotation = { schemaVersion: 1, previousCaFingerprintSha256: before.records.ca.fingerprintSha256 };
        atomic(path.join(p.next, 'manifest.json'), `${JSON.stringify(generated, null, 2)}\n`);
        const st = fs.statSync(p.configPath);
        write(p.newConfig, `${JSON.stringify(nextConfig, null, 2)}\n`, st.mode & 0o777, st.gid);
        // Preserve host-specific read/traversal permissions, never widen them.
        for (const relative of ['', 'certs', 'redis', 'credentials', ...FILES]) {
            const original = fs.lstatSync(path.join(p.directory, relative));
            fs.chownSync(path.join(p.next, relative), 0, original.gid);
            fs.chmodSync(path.join(p.next, relative), original.mode & 0o777);
        }
        for (const relative of FILES) {
            const fd = fs.openSync(path.join(p.next, relative), fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
            try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
        }
        for (const relative of ['certs', 'redis', 'credentials', '']) syncDirectory(path.join(p.next, relative));
        const journal = { schemaVersion: 1, kind: 'eos-transport-certificate-rotation', state: 'prepared',
            directory: p.directory, configPath: p.configPath, createdAt: new Date().toISOString(),
            oldConfigSha256: hash(oldBytes), nextConfigSha256: hash(bytes(p.newConfig)),
            oldTreeSha256: digestTree(p.directory), nextTreeSha256: digestTree(p.next),
            oldConfigMode: st.mode & 0o777, oldConfigGid: st.gid };
        journalWrite(p, journal);
        return { status: 'ROTATION_PREPARED', currentServicesChanged: false, authorityRotated: true, credentialsPreserved: true };
    } catch (error) {
        // No live path was changed during preparation.
        fs.rmSync(p.work, { recursive: true, force: true }); syncDirectory(path.dirname(p.work));
        throw error;
    }
}
function readJournal(p) {
    rootOnly(); protectedPath(p.work);
    const j = json(p.journal);
    if (j.schemaVersion !== 1 || j.kind !== 'eos-transport-certificate-rotation' || j.directory !== p.directory ||
        j.configPath !== p.configPath || !['prepared', 'switching', 'switched', 'marker-rebound', 'complete', 'restored'].includes(j.state) ||
        ['oldConfigSha256', 'nextConfigSha256', 'oldTreeSha256', 'nextTreeSha256'].some(k => !/^[a-f0-9]{64}$/.test(j[k] || '')) ||
        !Number.isInteger(j.oldConfigMode) || (j.oldConfigMode & 0o022) || j.oldConfigMode > 0o777 ||
        !Number.isSafeInteger(j.oldConfigGid) || j.oldConfigGid < 0 || hash(bytes(p.oldConfig)) !== j.oldConfigSha256 ||
        hash(bytes(p.newConfig)) !== j.nextConfigSha256) fail('ROTATION_JOURNAL_REJECTED');
    return j;
}
function restoreFiles(p, j) {
    // Caller must have stopped all consumers. On a crash, path presence plus
    // exact old/new tree digests identifies every rename boundary unambiguously.
    if (fs.existsSync(p.previous)) {
        if (digestTree(p.previous) !== j.oldTreeSha256) fail('ROTATION_BACKUP_REJECTED');
        if (fs.existsSync(p.directory)) {
            if (digestTree(p.directory) !== j.nextTreeSha256) fail('ROTATION_LIVE_TREE_REJECTED');
            if (fs.existsSync(p.next)) fail('ROTATION_AMBIGUOUS_STATE');
            fs.renameSync(p.directory, p.next);
        }
        fs.renameSync(p.previous, p.directory); syncDirectory(path.dirname(p.directory)); syncDirectory(p.work);
    } else if (!fs.existsSync(p.directory) || digestTree(p.directory) !== j.oldTreeSha256) fail('ROTATION_BACKUP_MISSING');
    if (fs.existsSync(p.configPath) && ![j.oldConfigSha256, j.nextConfigSha256].includes(hash(bytes(p.configPath)))) fail('ROTATION_CONFIG_DRIFT');
    atomic(p.configPath, bytes(p.oldConfig), j.oldConfigMode, j.oldConfigGid);
    j.state = 'restored'; journalWrite(p, j);
}
function clean(p) {
    // Release the transaction lock atomically before best-effort erasure. A
    // partial erasure must never turn a committed generation into a rollback.
    const retired = `${p.work}-retired-${crypto.randomBytes(12).toString('hex')}`;
    fs.renameSync(p.work, retired); syncDirectory(path.dirname(p.work));
    try { fs.rmSync(retired, { recursive: true }); syncDirectory(path.dirname(retired)); return true; }
    catch { return false; }
}
function requireHooks(hooks) {
    for (const key of ['stop', 'startStores', 'rebindMarker', 'startController', 'probe']) if (typeof hooks?.[key] !== 'function') fail('ROTATION_HOST_HOOKS_REQUIRED');
}
async function recoverRotation(options, hooks) {
    rootOnly(); requireHooks(hooks);
    const p = paths(options.directory, options.configPath); const j = readJournal(p);
    const oldConfig = json(p.oldConfig);
    const newConfig = json(p.newConfig);
    await hooks.stop();
    if (j.state === 'complete') {
        // The commit was durable before retirement. Do not undo a successful
        // rotation simply because cleanup was interrupted (old leaves may expire).
        if (digestTree(p.directory) !== j.nextTreeSha256 || hash(bytes(p.configPath)) !== j.nextConfigSha256 ||
            !snapshot(options).valid) fail('COMMITTED_CERTIFICATE_GENERATION_REJECTED');
        await hooks.startStores(); await hooks.probe(newConfig);
        await hooks.rebindMarker(oldConfig, newConfig);
        await hooks.startController(); await hooks.probe(newConfig);
        const retiredSecretsRemoved = clean(p);
        return { status: 'COMMITTED_TRANSPORT_CONFIRMED', credentialsPreserved: true, retiredSecretsRemoved };
    }
    restoreFiles(p, j);
    const restored = snapshot(options);
    if (!restored.valid) fail('EXPIRED_PREVIOUS_CERTIFICATES_SERVICES_STOPPED');
    await hooks.startStores(); await hooks.probe(oldConfig);
    // Idempotent rebind accepts either complete old or complete new binding;
    // no unrelated marker/config mutation is accepted.
    await hooks.rebindMarker(newConfig, oldConfig);
    await hooks.startController(); await hooks.probe(oldConfig);
    const retiredSecretsRemoved = clean(p);
    return { status: 'PREVIOUS_TRANSPORT_RESTORED', credentialsPreserved: true, retiredSecretsRemoved };
}
async function activateRotation(options, hooks) {
    rootOnly(); requireHooks(hooks);
    const p = paths(options.directory, options.configPath); const j = readJournal(p);
    if (j.state !== 'prepared' || digestTree(p.directory) !== j.oldTreeSha256 || digestTree(p.next) !== j.nextTreeSha256 ||
        hash(bytes(p.configPath)) !== j.oldConfigSha256 || hash(bytes(p.newConfig)) !== j.nextConfigSha256) fail('ROTATION_PREPARED_STATE_CHANGED');
    const oldConfig = json(p.oldConfig); const newConfig = json(p.newConfig);
    try {
        await hooks.stop();
        j.state = 'switching'; journalWrite(p, j);
        fs.renameSync(p.directory, p.previous); syncDirectory(path.dirname(p.directory)); syncDirectory(p.work);
        fs.renameSync(p.next, p.directory); syncDirectory(path.dirname(p.directory)); syncDirectory(p.work);
        atomic(p.configPath, bytes(p.newConfig), j.oldConfigMode, j.oldConfigGid);
        j.state = 'switched'; journalWrite(p, j);
        const after = snapshot(options); if (!after.valid) fail('NEW_CERTIFICATES_INVALID');
        await hooks.startStores(); await hooks.probe(newConfig);
        await hooks.rebindMarker(oldConfig, newConfig);
        j.state = 'marker-rebound'; journalWrite(p, j);
        await hooks.startController(); await hooks.probe(newConfig);
        j.state = 'complete'; journalWrite(p, j);
        const retiredSecretsRemoved = clean(p);
        return { status: 'TRANSPORT_CERTIFICATES_ROTATED', credentialsPreserved: true, authorityRotated: true, retiredSecretsRemoved };
    } catch (error) {
        // Best effort physical recovery must not be prevented by a diagnostic
        // write failure. A retained work directory keeps restart fail-closed.
        try { await recoverRotation(options, hooks); }
        catch { fail('ROTATION_FAILED_RECOVERY_REQUIRED'); }
        fail('ROTATION_FAILED_PREVIOUS_TRANSPORT_RESTORED');
    }
}
function rebindMarker(marker, oldConfig, newConfig) {
    if (!validateConfig(oldConfig).configurationMatchesProfile || !validateConfig(newConfig).configurationMatchesProfile) fail('MARKER_TLS_CONFIG_REJECTED');
    const permitted = structuredClone(oldConfig);
    for (const scope of SCOPES) permitted[scope].options.tls.ca = newConfig[scope].options.tls.ca;
    if (!isDeepStrictEqual(permitted, newConfig)) fail('MARKER_CONFIG_CHANGE_REJECTED');
    const native = marker?.native;
    if (!plain(marker) || marker._id !== 'system.meta.eosTestBase' || marker.type !== 'meta' || !plain(native) ||
        native.profile !== 'eos-core-only-bootstrap-v1' || native.coreControllerVersion !== '7.2.2' || native.bootstrapPolicyVersion !== 1 ||
        native.state !== 'complete' || !/^[a-f0-9]{64}$/.test(native.creationAppLockSha256 || '') ||
        ![hash(JSON.stringify(oldConfig)), hash(JSON.stringify(newConfig))].includes(native.runtimeConfigSha256)) fail('BOOTSTRAP_MARKER_REBIND_REJECTED');
    const result = structuredClone(marker);
    result.native.runtimeConfigSha256 = hash(JSON.stringify(newConfig));
    return result;
}
function main(argv = process.argv.slice(2)) {
    try {
        const command = argv.shift(); const args = {};
        while (argv.length) {
            const key = argv.shift(); const value = argv.shift();
            if (!['--directory', '--config'].includes(key) || Object.hasOwn(args, key) || value === undefined) fail('USAGE');
            args[key] = value;
        }
        const options = { directory: args['--directory'], configPath: args['--config'] };
        let result;
        if (command === 'status') result = inspect(options);
        else if (command === 'prepare') result = prepareRotation(options);
        else fail('USAGE');
        process.stdout.write(`${JSON.stringify(result)}\n`);
        return result.status === 'CERTIFICATES_INVALID' ? 2 : result.status === 'RENEWAL_DUE' ? 3 : 0;
    } catch (e) {
        const code = /^[A-Z_]{3,80}$/.test(e.code || '') ? e.code : 'CERTIFICATE_LIFECYCLE_REJECTED';
        process.stdout.write(`${JSON.stringify({ status: 'REJECTED', code })}\n`); return 1;
    }
}
if (require.main === module) process.exitCode = main();
module.exports = { inspect, prepareRotation, activateRotation, recoverRotation, rebindMarker, main };
