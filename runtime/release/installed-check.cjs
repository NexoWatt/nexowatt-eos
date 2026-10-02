'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { readFileLimited, inventory, validateManifest, sha256, trustedDirectory, validatePublicKey } = require('./bundle.cjs');
function reject(code) { const error = new Error(code); error.code = code; throw error; }
function rootOwned(file) {
    const absolute = path.resolve(file);
    let cursor = path.parse(absolute).root;
    for (const part of absolute.slice(cursor.length).split(path.sep).filter(Boolean)) {
        cursor = path.join(cursor, part);
        const st = fs.lstatSync(cursor);
        if (st.isSymbolicLink() || st.uid !== 0 || (st.mode & 0o022)) reject('INSTALLED_UNTRUSTED_PATH');
    }
}
function checkInstalled({ releasePath, evidencePath, expectedNodeVersion = process.versions.node, expectedPlatform = `${process.platform}-${process.arch}`, ownerCheck = rootOwned }) {
    // This function is read-only. The caller cannot replace ownership checks via
    // the CLI; ownerCheck exists solely for tests on unprivileged build runners.
    ownerCheck(releasePath); ownerCheck(evidencePath);
    trustedDirectory(releasePath); trustedDirectory(evidencePath);
    const releaseId = path.basename(releasePath);
    if (!/^[a-f0-9]{64}$/.test(releaseId) || path.basename(evidencePath) !== releaseId) reject('INSTALLED_RELEASE_ID');
    const load = (name, max) => {
        const file = path.join(evidencePath, name); ownerCheck(file);
        return readFileLimited(file, max).bytes;
    };
    const bytes = load('manifest.json', 16 * 1024 * 1024), signature = load('manifest.sig', 64);
    let key;
    try { key = crypto.createPublicKey(validatePublicKey(load('release-public.pem', 16384))); } catch { reject('INSTALLED_KEY'); }
    if (sha256(bytes) !== releaseId || key.asymmetricKeyType !== 'ed25519' || signature.length !== 64 ||
        !crypto.verify(null, bytes, key, signature)) reject('INSTALLED_SIGNATURE');
    const manifest = validateManifest(JSON.parse(bytes));
    if (manifest.nodeVersion !== expectedNodeVersion || !manifest.platforms.includes(expectedPlatform)) reject('INSTALLED_PLATFORM');
    const rows = inventory(releasePath);
    if (JSON.stringify(rows) !== JSON.stringify(manifest.files)) reject('INSTALLED_CONTENT');
    // Root ownership and no group/world writes apply to every payload file and
    // parent, not just the signed metadata. Signatures alone cannot stop a live
    // attacker changing a writable file immediately after verification.
    for (const row of rows) ownerCheck(path.join(releasePath, row.path));
    return { ok: true, profile: 'test', releaseId, files: rows.length, sequence: manifest.sequence };
}
module.exports = { rootOwned, checkInstalled };
if (require.main === module) {
    try {
        if (process.argv.length !== 2) reject('INSTALLED_USAGE');
        // Node resolves this script's symlinked module path to the real release.
        const releasePath = path.resolve(__dirname, '../..');
        const evidencePath = path.join('/opt/nexowatt/eos/verified', path.basename(releasePath));
        process.stdout.write(`${JSON.stringify(checkInstalled({ releasePath, evidencePath }))}\n`);
    } catch (error) {
        process.stderr.write(`${JSON.stringify({ ok: false, code: /^[A-Z_]+$/.test(error.code || '') ? error.code : 'INSTALLED_CHECK_FAILED' })}\n`);
        process.exitCode = 1;
    }
}
