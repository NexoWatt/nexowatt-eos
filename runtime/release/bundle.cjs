'use strict';

// This module handles offline files only. It never downloads or executes packages.
// The verification key must be provisioned separately by a trusted administrator.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const LIMITS = Object.freeze({ files: 60000, entries: 120000, bytes: 1024 * 1024 * 1024,
    fileBytes: 128 * 1024 * 1024, manifestBytes: 16 * 1024 * 1024, depth: 48 });
const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
class BundleError extends Error {
    constructor(code) { super(code); this.name = 'BundleError'; this.code = code; }
}
function fail(code) { throw new BundleError(code); }
function exactKeys(value, keys) {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        ![Object.prototype, null].includes(Object.getPrototypeOf(value)) ||
        Object.keys(value).sort().join('|') !== [...keys].sort().join('|')) fail('BUNDLE_SHAPE');
}
function safeRelative(value) {
    if (typeof value !== 'string' || !value || value.length > 1024 || value.includes('\\') ||
        /[\x00-\x1f\x7f]/.test(value) || path.posix.isAbsolute(value) || value.includes(':')) fail('BUNDLE_PATH');
    const parts = value.split('/');
    if (parts.length > LIMITS.depth || parts.some(p => !p || p === '.' || p === '..' ||
        ['__proto__', 'prototype', 'constructor'].includes(p))) fail('BUNDLE_PATH');
    return value;
}
// lstat every component, not just the final leaf; a symlink must never redirect an install.
function trustedDirectory(directory) {
    const absolute = path.resolve(directory);
    let cursor = path.parse(absolute).root;
    for (const component of absolute.slice(cursor.length).split(path.sep).filter(Boolean)) {
        cursor = path.join(cursor, component);
        const stat = fs.lstatSync(cursor);
        if (!stat.isDirectory() || stat.isSymbolicLink()) fail('BUNDLE_DIRECTORY');
    }
    return absolute;
}
function readFileLimited(file, max = LIMITS.fileBytes) {
    trustedDirectory(path.dirname(file));
    let fd;
    try {
        fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
        const before = fs.fstatSync(fd);
        if (!before.isFile() || before.size > max || before.nlink !== 1) fail('BUNDLE_FILE');
        const bytes = Buffer.alloc(before.size);
        let offset = 0;
        while (offset < bytes.length) {
            const n = fs.readSync(fd, bytes, offset, bytes.length - offset, offset);
            if (!n) fail('BUNDLE_CHANGED');
            offset += n;
        }
        const after = fs.fstatSync(fd);
        if (after.size !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs) fail('BUNDLE_CHANGED');
        return { bytes, mode: before.mode & 0o7777 };
    } catch (error) {
        if (error instanceof BundleError) throw error;
        fail('BUNDLE_FILE');
    } finally { if (fd !== undefined) fs.closeSync(fd); }
}
function inventory(directory) {
    const root = trustedDirectory(directory), rows = [];
    let total = 0, count = 0;
    function walk(relative = '') {
        const directory = fs.opendirSync(path.join(root, relative));
        try { for (let entry; (entry = directory.readSync()) !== null;) {
            if (++count > LIMITS.entries) fail('BUNDLE_SIZE');
            const name = safeRelative(relative ? `${relative}/${entry.name}` : entry.name);
            if (entry.isDirectory()) walk(name);
            else if (entry.isFile()) {
                if (rows.length >= LIMITS.files) fail('BUNDLE_SIZE');
                const { bytes, mode } = readFileLimited(path.join(root, name));
                total += bytes.length;
                if (total > LIMITS.bytes || (mode & 0o7000)) fail('BUNDLE_SIZE');
                rows.push({ path: name, size: bytes.length, sha256: sha256(bytes), mode: mode & 0o111 ? 0o755 : 0o644 });
            } else fail('BUNDLE_FILE');
        } } finally { directory.closeSync(); }
    }
    walk();
    return rows.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}
function durableWrite(file, bytes, mode) {
    const fd = fs.openSync(file, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, mode);
    try { fs.writeFileSync(fd, bytes); fs.fchmodSync(fd, mode); fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
}
function syncDirectories(root) {
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
        if (entry.isDirectory()) syncDirectories(path.join(root, entry.name));
    }
    const fd = fs.openSync(root, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
    try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function validateManifest(manifest) {
    exactKeys(manifest, ['schemaVersion', 'product', 'releaseVersion', 'sequence', 'profile', 'nodeVersion', 'platforms', 'files']);
    if (manifest.schemaVersion !== 1 || manifest.product !== 'nexowatt-eos' || manifest.profile !== 'test' ||
        typeof manifest.releaseVersion !== 'string' || typeof manifest.nodeVersion !== 'string' ||
        !/^\d+\.\d+\.\d+-test\.\d+$/.test(manifest.releaseVersion) ||
        !Number.isSafeInteger(manifest.sequence) || manifest.sequence < 1 ||
        !/^\d+\.\d+\.\d+$/.test(manifest.nodeVersion) ||
        !Array.isArray(manifest.platforms) || !manifest.platforms.length || manifest.platforms.length > 2 ||
        new Set(manifest.platforms).size !== manifest.platforms.length ||
        manifest.platforms.some(p => !['linux-x64', 'linux-arm64'].includes(p)) ||
        !Array.isArray(manifest.files) || !manifest.files.length || manifest.files.length > LIMITS.files) fail('BUNDLE_MANIFEST');
    let previous = '', total = 0;
    const seen = new Set();
    for (const row of manifest.files) {
        exactKeys(row, ['path', 'size', 'sha256', 'mode']);
        safeRelative(row.path);
        if (row.path <= previous || seen.has(row.path) || !Number.isSafeInteger(row.size) || row.size < 0 ||
            row.size > LIMITS.fileBytes || typeof row.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(row.sha256) || ![0o644, 0o755].includes(row.mode)) fail('BUNDLE_MANIFEST');
        for (let p = path.posix.dirname(row.path); p !== '.'; p = path.posix.dirname(p)) {
            if (seen.has(p)) fail('BUNDLE_PATH');
        }
        previous = row.path; seen.add(row.path); total += row.size;
    }
    if (total > LIMITS.bytes) fail('BUNDLE_SIZE');
    return manifest;
}
function edKey(input, type) {
    let key;
    // createPublicKey also accepts a PRIVATE PEM and derives its public key.
    // Explicitly refuse that convenience: install evidence is publicly readable
    // and must never accidentally persist the manufacturer's private signing key.
    if (type === 'public' && (!(typeof input === 'string' || Buffer.isBuffer(input)) ||
        !/^-----BEGIN PUBLIC KEY-----\r?\n[A-Za-z0-9+/=\r\n]+-----END PUBLIC KEY-----\s*$/.test(input.toString()))) fail('BUNDLE_KEY');
    try { key = type === 'private' ? crypto.createPrivateKey(input) : crypto.createPublicKey(input); }
    catch { fail('BUNDLE_KEY'); }
    if (key.asymmetricKeyType !== 'ed25519') fail('BUNDLE_KEY');
    return key;
}
function validatePublicKey(input) { edKey(input, 'public'); return input; }
function createBundle({ sourceDirectory, bundleDirectory, metadata, privateKey }) {
    const root = trustedDirectory(sourceDirectory);
    const target = path.resolve(bundleDirectory);
    trustedDirectory(path.dirname(target));
    if (target === root || target.startsWith(root + path.sep)) fail('BUNDLE_PATH');
    const manifest = validateManifest({ ...metadata, files: inventory(root) });
    const bytes = Buffer.from(`${JSON.stringify(manifest)}\n`);
    if (bytes.length > LIMITS.manifestBytes) fail('BUNDLE_SIZE');
    const signature = crypto.sign(null, bytes, edKey(privateKey, 'private'));
    fs.mkdirSync(target, { mode: 0o700 }); // exclusive: never replace a previously signed bundle
    const payload = path.join(target, 'payload'); fs.mkdirSync(payload, { mode: 0o700 });
    try {
        for (const row of manifest.files) {
            const source = readFileLimited(path.join(root, row.path));
            if (source.bytes.length !== row.size || sha256(source.bytes) !== row.sha256) fail('BUNDLE_CHANGED');
            const destination = path.join(payload, row.path);
            fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o755 });
            fs.writeFileSync(destination, source.bytes, { flag: 'wx', mode: row.mode });
            fs.chmodSync(destination, row.mode);
        }
        fs.writeFileSync(path.join(target, 'manifest.json'), bytes, { flag: 'wx', mode: 0o644 });
        fs.writeFileSync(path.join(target, 'manifest.sig'), signature, { flag: 'wx', mode: 0o644 });
        return { releaseId: sha256(bytes), files: manifest.files.length, sequence: manifest.sequence };
    } catch (error) {
        fs.rmSync(target, { recursive: true, force: true });
        throw error;
    }
}
function verifyBundle({ bundleDirectory, publicKey, minimumSequence = 0, platform, nodeVersion }) {
    if (!Number.isSafeInteger(minimumSequence) || minimumSequence < 0) fail('BUNDLE_SEQUENCE');
    const root = trustedDirectory(bundleDirectory);
    if (fs.readdirSync(root).sort().join('|') !== 'manifest.json|manifest.sig|payload') fail('BUNDLE_EXTRA_FILE');
    const bytes = readFileLimited(path.join(root, 'manifest.json'), LIMITS.manifestBytes).bytes;
    const signature = readFileLimited(path.join(root, 'manifest.sig'), 64).bytes;
    if (signature.length !== 64 || !crypto.verify(null, bytes, edKey(publicKey, 'public'), signature)) fail('BUNDLE_SIGNATURE');
    let manifest;
    try { manifest = JSON.parse(bytes); } catch { fail('BUNDLE_MANIFEST'); }
    validateManifest(manifest);
    if (manifest.sequence <= minimumSequence) fail('BUNDLE_ROLLBACK');
    if (platform && !manifest.platforms.includes(platform)) fail('BUNDLE_PLATFORM');
    if (nodeVersion && manifest.nodeVersion !== nodeVersion) fail('BUNDLE_NODE_VERSION');
    const actual = inventory(path.join(root, 'payload'));
    if (JSON.stringify(actual) !== JSON.stringify(manifest.files)) fail('BUNDLE_CONTENT');
    return { releaseId: sha256(bytes), manifest, payloadPath: path.join(root, 'payload') };
}
// Copy only authenticated bytes to a newly-created directory, then verify the copy.
// Source staging must be owned by the administrator and not concurrently writable
// by an adversary; hash rechecks nevertheless detect ordinary staging changes.
function stageBundle(options) {
    const verified = verifyBundle(options);
    const releases = trustedDirectory(options.releasesDirectory);
    const releasesStat = fs.statSync(releases);
    if ((releasesStat.mode & 0o022) || releasesStat.uid !== process.getuid()) fail('BUNDLE_UNTRUSTED_DESTINATION');
    const destination = path.join(releases, verified.releaseId);
    if (fs.existsSync(destination)) fail('BUNDLE_EXISTS');
    const temporary = fs.mkdtempSync(path.join(releases, '.stage-'));
    try {
        for (const row of verified.manifest.files) {
            const { bytes } = readFileLimited(path.join(verified.payloadPath, row.path));
            if (bytes.length !== row.size || sha256(bytes) !== row.sha256) fail('BUNDLE_CHANGED');
            const target = path.join(temporary, row.path);
            fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o755 });
            durableWrite(target, bytes, row.mode);
        }
        if (JSON.stringify(inventory(temporary)) !== JSON.stringify(verified.manifest.files)) fail('BUNDLE_CHANGED');
        fs.chmodSync(temporary, 0o755);
        syncDirectories(temporary);
        fs.renameSync(temporary, destination);
        const dirfd = fs.openSync(releases, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
        try { fs.fsyncSync(dirfd); } finally { fs.closeSync(dirfd); }
        return { ...verified, releasePath: destination };
    } catch (error) { fs.rmSync(temporary, { recursive: true, force: true }); throw error; }
}
module.exports = { LIMITS, BundleError, sha256, safeRelative, readFileLimited,
    trustedDirectory, inventory, validateManifest, validatePublicKey, createBundle, verifyBundle, stageBundle };
