#!/usr/bin/env node
'use strict';
// Asset-only upload for the fixed six-own-adapter TEST profile. The service's
// installed-check authenticates the payload; this helper rechecks admission,
// stopped state and protected source paths. It never upgrades instance objects,
// restarts adapters, removes a file namespace or reads another credentials file.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { isDeepStrictEqual } = require('node:util');
const bootstrap = require('./initialize.cjs');
const own = require('./own-adapter-enrollment.cjs');
const enrollment = require('./enrollment.cjs');
const { PRIVATE_ACL } = require('./accounts.cjs');
const { rootOwned, checkInstalled } = require('../release/installed-check.cjs');
const { readConfig } = require('../../security/verify-runtime-tls.cjs');
const databases = require('../transport/databases.cjs');
const CURRENT = '/opt/nexowatt/eos/current';
const CONFIG = '/etc/nexowatt-eos/iobroker.json';
const DATA = '/var/lib/nexowatt-eos/iobroker-data';
const LIMITS = Object.freeze({ fileBytes: 16 * 1024 * 1024, totalBytes: 256 * 1024 * 1024,
    files: 4096, entries: 8192, pathBytes: 512, depth: 20, uploadMs: 180000, connectMs: 5000, processMs: 210000 });
const CODES = new Set(['OWN_ASSETS_USAGE', 'OWN_ASSETS_RUNTIME', 'OWN_ASSETS_RELEASE', 'OWN_ASSETS_CONFIG',
    'OWN_ASSETS_SOURCE', 'OWN_ASSETS_LIMIT', 'OWN_ASSETS_ADMISSION', 'OWN_ASSETS_RUNNING',
    'OWN_ASSETS_NAMESPACE', 'OWN_ASSETS_READBACK', 'OWN_ASSETS_DOCUMENT_CHANGED', 'OWN_ASSETS_DATABASE',
    'OWN_ASSETS_CONNECT_TIMEOUT', 'OWN_ASSETS_TIMEOUT', 'OWN_ASSETS_FAILED']);
const fail = code => { throw Object.assign(new Error(code), { code }); };
const safeCode = error => CODES.has(error?.code) ? error.code : 'OWN_ASSETS_FAILED';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const silent = Object.fromEntries(['silly', 'debug', 'info', 'warn', 'error'].map(key => [key, () => {}]));

function trusted(file, kind, ownerCheck) {
    try {
        ownerCheck(file);
        const stat = fs.lstatSync(file);
        if (stat.isSymbolicLink() || (stat.mode & 0o022) ||
            (kind === 'directory' ? !stat.isDirectory() : !stat.isFile() || stat.nlink !== 1)) fail('OWN_ASSETS_SOURCE');
        return stat;
    } catch { fail('OWN_ASSETS_SOURCE'); }
}
function readAsset(file, expected, ownerCheck) {
    const stat = trusted(file, 'file', ownerCheck);
    if (stat.size > LIMITS.fileBytes) fail('OWN_ASSETS_LIMIT');
    let fd;
    try {
        fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
        const opened = fs.fstatSync(fd);
        if (!opened.isFile() || opened.dev !== stat.dev || opened.ino !== stat.ino || opened.size !== stat.size) fail('OWN_ASSETS_SOURCE');
        // Read at most the prechecked size plus one byte: even an unexpected
        // privileged concurrent file growth cannot turn this into an unbounded read.
        const buffer = Buffer.alloc(stat.size + 1); let size = 0;
        while (size < buffer.length) {
            const count = fs.readSync(fd, buffer, size, buffer.length - size, null);
            if (!count) break;
            size += count;
        }
        const bytes = buffer.subarray(0, size);
        if (bytes.length !== stat.size || expected && (bytes.length !== expected.bytes || sha(bytes) !== expected.sha256)) fail('OWN_ASSETS_SOURCE');
        return bytes;
    } finally { if (fd !== undefined) fs.closeSync(fd); }
}

// ownerCheck is function-only fixture injection; no CLI/env path or bypass exists.
function collectAssets(app, { ownerCheck = rootOwned, mimeLookup } = {}) {
    if (typeof app !== 'string' || !path.isAbsolute(app) || path.resolve(app) !== app || fs.realpathSync(app) !== app) fail('OWN_ASSETS_SOURCE');
    trusted(app, 'directory', ownerCheck);
    const profile = path.join(app, 'node_modules/iobroker.js-controller/eos-test-profile.json');
    readAsset(profile, null, ownerCheck);
    for (const spec of own.SPECS) for (const file of ['package.json', 'io-package.json'])
        readAsset(path.join(app, 'node_modules', 'iobroker.' + spec.name, file), null, ownerCheck);
    let packages;
    try { packages = own.pinnedAdapters(app); } catch { fail('OWN_ASSETS_ADMISSION'); }
    if (!mimeLookup) mimeLookup = createRequire(path.join(app, 'package.json'))('mime-types').lookup;
    const namespaces = []; let count = 0, entries = 0, totalBytes = 0;
    for (const { spec, io } of packages) {
        if (io.common.wwwDontUpload !== undefined && typeof io.common.wwwDontUpload !== 'boolean') fail('OWN_ASSETS_ADMISSION');
        for (const kind of ['admin', 'www']) {
            if (kind === 'www' && io.common.wwwDontUpload === true) continue;
            const base = path.join(app, 'node_modules', 'iobroker.' + spec.name, kind);
            try { fs.lstatSync(base); } catch (error) {
                if (kind === 'www' && error.code === 'ENOENT') continue;
                fail('OWN_ASSETS_SOURCE');
            }
            const rows = [];
            const walk = (directory, relative = '', depth = 0) => {
                if (depth > LIMITS.depth) fail('OWN_ASSETS_LIMIT');
                trusted(directory, 'directory', ownerCheck);
                for (const name of fs.readdirSync(directory).sort()) {
                    if (++entries > LIMITS.entries || !name || /[\\/\x00-\x1f\x7f]/.test(name) || name === '.' || name === '..') fail('OWN_ASSETS_SOURCE');
                    const rel = relative ? relative + '/' + name : name, file = path.join(directory, name);
                    if (Buffer.byteLength(rel) > LIMITS.pathBytes) fail('OWN_ASSETS_LIMIT');
                    const st = fs.lstatSync(file);
                    if (st.isDirectory()) { walk(file, rel, depth + 1); continue; }
                    const bytes = readAsset(file, null, ownerCheck);
                    if (++count > LIMITS.files || (totalBytes += bytes.length) > LIMITS.totalBytes) fail('OWN_ASSETS_LIMIT');
                    const mimeType = mimeLookup(rel) || 'application/octet-stream';
                    if (typeof mimeType !== 'string' || !/^[\w.+-]+\/[\w.+-]+$/.test(mimeType)) fail('OWN_ASSETS_SOURCE');
                    rows.push({ path: rel, file, bytes: bytes.length, sha256: sha(bytes), mimeType });
                }
            };
            walk(base);
            if (kind === 'admin' && !rows.length) fail('OWN_ASSETS_SOURCE');
            namespaces.push({ id: spec.name + (kind === 'admin' ? '.admin' : ''), kind, files: rows });
        }
    }
    return { namespaces, count, totalBytes };
}

async function stopped(states, config) {
    const ids = [`system.host.${config.system.hostname}.alive`, ...own.SPECS.map(spec => `system.adapter.${spec.name}.0.alive`)];
    for (const id of ids) {
        const value = await states.getState(id);
        if (value != null && (value.val !== false || value.ack !== true)) fail('OWN_ASSETS_RUNNING');
    }
}
async function snapshot(objects) {
    const result = await objects.getObjectViewAsync('system', 'instance', { startkey: 'system.adapter.', endkey: 'system.adapter.\u9999' });
    if (!Array.isArray(result?.rows) || result.rows.length !== own.SPECS.length) fail('OWN_ASSETS_DOCUMENT_CHANGED');
    const docs = result.rows.map(row => row.value || row.doc);
    const expected = own.SPECS.map(spec => `system.adapter.${spec.name}.0`).sort();
    if (!isDeepStrictEqual(docs.map(doc => doc?._id).sort(), expected)) fail('OWN_ASSETS_DOCUMENT_CHANGED');
    const markers = [];
    for (const id of [bootstrap.MARKER, enrollment.MARKER, enrollment.FIRST_START_MARKER, own.MARKER])
        markers.push([id, (await objects.getObjectAsync(id)) ?? null]);
    return structuredClone({ docs: docs.sort((a, b) => a._id.localeCompare(b._id)), markers });
}
async function uploadAssets({ objects, states, config, app, ownerCheck = rootOwned, mimeLookup }) {
    let before;
    try {
        try { bootstrap.assertRuntimeConfig(config); databases.validatePostgresql(config); }
        catch { fail('OWN_ASSETS_CONFIG'); }
        const plan = collectAssets(app, { ownerCheck, mimeLookup });
        await stopped(states, config);
        try { await own.verify({ objects, config, app }); } catch { fail('OWN_ASSETS_ADMISSION'); }
        before = await snapshot(objects);
        const deadline = Date.now() + LIMITS.uploadMs;
        const bounded = () => { if (Date.now() >= deadline) fail('OWN_ASSETS_TIMEOUT'); };
        // Check all namespaces before the first write. Existing namespace objects
        // and unrelated/user files are preserved byte-for-byte, never erased.
        const missing = new Set();
        for (const row of plan.namespaces) {
            const meta = await objects.getObjectAsync(row.id);
            if (meta == null) missing.add(row.id);
            else if (meta._id !== row.id || meta.type !== 'meta' || meta.common?.type !== row.kind) fail('OWN_ASSETS_NAMESPACE');
        }
        for (const row of plan.namespaces) {
            bounded(); await stopped(states, config);
            if (missing.has(row.id)) {
                if (await objects.getObjectAsync(row.id) != null) fail('OWN_ASSETS_NAMESPACE');
                await objects.setObjectAsync(row.id, { _id: row.id, type: 'meta', common: { name: row.id, type: row.kind },
                    native: {}, acl: { ...PRIVATE_ACL }, from: 'system.host.eos-own-asset-upload', ts: Date.now() });
            }
            for (const entry of row.files) {
                bounded();
                const bytes = readAsset(entry.file, entry, ownerCheck);
                await objects.writeFileAsync(row.id, entry.path, bytes, { mimeType: entry.mimeType });
            }
        }
        // readFile (without a callback) is the actual R9 client's Promise API;
        // it returns {file,mimeType}. readFileAsync does not exist in that client.
        for (const row of plan.namespaces) for (const entry of row.files) {
            bounded();
            const result = await objects.readFile(row.id, entry.path);
            if (!result || !Buffer.isBuffer(result.file) && typeof result.file !== 'string') fail('OWN_ASSETS_READBACK');
            const bytes = Buffer.from(result.file);
            if (bytes.length !== entry.bytes || sha(bytes) !== entry.sha256 || result.mimeType !== entry.mimeType) fail('OWN_ASSETS_READBACK');
        }
        bounded(); await stopped(states, config);
        if (!isDeepStrictEqual(await snapshot(objects), before)) fail('OWN_ASSETS_DOCUMENT_CHANGED');
        try { await own.verify({ objects, config, app }); } catch { fail('OWN_ASSETS_ADMISSION'); }
        return { ok: true, code: 'OWN_ASSETS_VERIFIED', adapters: own.SPECS.length, files: plan.count,
            bytes: plan.totalBytes, instancesAndMarkersUnchanged: true, unrelatedFilesPreserved: true };
    } catch (error) {
        // Detect even an interrupted write that unexpectedly touched executable
        // objects. Never silently "repair" somebody else's instance change.
        if (before) {
            try { if (!isDeepStrictEqual(await snapshot(objects), before)) fail('OWN_ASSETS_DOCUMENT_CHANGED'); }
            catch { fail('OWN_ASSETS_DOCUMENT_CHANGED'); }
        }
        fail(safeCode(error));
    }
}

function connect(Client, connection, clients, timeoutMs = LIMITS.connectMs) {
    return new Promise((resolve, reject) => {
        let client, settled = false;
        const finish = (error, value) => { if (settled) return; settled = true; clearTimeout(timer); error ? reject(error) : resolve(value); };
        const timer = setTimeout(() => finish(Object.assign(new Error('OWN_ASSETS_CONNECT_TIMEOUT'), { code: 'OWN_ASSETS_CONNECT_TIMEOUT' })), timeoutMs);
        try {
            client = new Client({ connection: structuredClone(connection), logger: silent,
                connected: () => queueMicrotask(() => finish(null, client)), disconnected: () => {}, change: () => {} });
            clients.push(client);
        } catch { finish(Object.assign(new Error('OWN_ASSETS_DATABASE'), { code: 'OWN_ASSETS_DATABASE' })); }
    });
}
async function closeClients(clients, originalError) {
    const results = await Promise.allSettled(clients.map(client => Promise.resolve().then(() => client.destroy())));
    // Cleanup is part of success. Keep the first safe failure when an earlier
    // operation has already failed, but never turn failed cleanup into success.
    if (!originalError && results.some(result => result.status === 'rejected')) fail('OWN_ASSETS_DATABASE');
}
async function main(argv = process.argv.slice(2)) {
    const clients = [];
    let failure;
    try {
        if (argv.length) fail('OWN_ASSETS_USAGE');
        if (process.platform !== 'linux' || process.getuid?.() === 0 || process.env.IOBROKER_DATA_DIR !== DATA) fail('OWN_ASSETS_RUNTIME');
        const releasePath = path.resolve(__dirname, '../..');
        if (fs.realpathSync(CURRENT) !== releasePath) fail('OWN_ASSETS_RELEASE');
        checkInstalled({ releasePath, evidencePath: path.join('/opt/nexowatt/eos/verified', path.basename(releasePath)) });
        rootOwned(CONFIG);
        const config = bootstrap.assertRuntimeConfig(readConfig(CONFIG)); databases.validatePostgresql(config);
        const app = path.join(releasePath, 'app'), requireApp = createRequire(path.join(app, 'package.json'));
        const { Objects, States } = databases.clients(requireApp, config);
        const [objects, states] = await Promise.all([connect(Objects, config.objects, clients), connect(States, config.states, clients)]);
        return await uploadAssets({ objects, states, config, app });
    } catch (error) { failure = error; throw error; }
    finally { await closeClients(clients, failure); }
}
module.exports = { collectAssets, uploadAssets, stopped, snapshot, connect, closeClients, main, safeCode, LIMITS, CURRENT, CONFIG };
if (require.main === module) {
    const deadline = setTimeout(() => { process.stderr.write('{"ok":false,"code":"OWN_ASSETS_TIMEOUT"}\n'); process.exit(1); }, LIMITS.processMs);
    main().then(result => process.stdout.write(JSON.stringify(result) + '\n'), error => {
        process.stderr.write(JSON.stringify({ ok: false, code: safeCode(error) }) + '\n'); process.exitCode = 1;
    }).finally(() => clearTimeout(deadline));
}
