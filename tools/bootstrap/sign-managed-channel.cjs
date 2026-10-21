'use strict';
// Manufacturer-only tool. Input is a reviewed channel document, never a browser
// request. The durable signing key is kept outside the repository and delivery.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { readFileLimited, sha256 } = require('../../runtime/release/bundle.cjs');
const { verifyFeed, fail } = require('../../runtime/updates/channel.cjs');
function signChannel({ input, privateKeyFile, expectedPublicKeySha256, output }) {
    const root = path.resolve(__dirname, '../..');
    for (const name of [input, privateKeyFile, output]) if (typeof name !== 'string' || !path.isAbsolute(name) || path.resolve(name) !== name) fail('UPDATE_SIGN_INPUT');
    if (privateKeyFile === root || privateKeyFile.startsWith(root + path.sep) || input === privateKeyFile || output === privateKeyFile) fail('UPDATE_SIGN_PRIVATE_LOCATION');
    const stat = fs.lstatSync(privateKeyFile);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.uid !== process.getuid?.() || stat.mode & 0o077) fail('UPDATE_SIGN_PRIVATE_MODE');
    let secret = readFileLimited(privateKeyFile, 16384).bytes, key;
    try { key = crypto.createPrivateKey(secret); } finally { secret.fill(0); }
    if (key.asymmetricKeyType !== 'ed25519') fail('UPDATE_SIGN_KEY');
    const publicKey = crypto.createPublicKey(key).export({ format: 'pem', type: 'spki' });
    if (sha256(publicKey) !== expectedPublicKeySha256) fail('UPDATE_SIGN_TRUST');
    const payload = readFileLimited(input, 32768).bytes;
    const result = Buffer.from(JSON.stringify({ payload: payload.toString('base64'), signature: crypto.sign(null, payload, key).toString('base64') }) + '\n');
    const feed = verifyFeed(result, publicKey); // exactly the receiver's schema and expiry rules
    fs.writeFileSync(output, result, { mode: 0o644, flag: 'wx' });
    return { ok: true, publicKeySha256: expectedPublicKeySha256, releases: feed.releases.length,
        published: false, remoteReadbackPerformed: false };
}
module.exports = { signChannel };
if (require.main === module) {
    try {
        const args = process.argv.slice(2), fields = ['--input', '--private-key', '--public-key-sha256', '--output'];
        if (args.length !== 8 || fields.some((field, i) => args[2 * i] !== field)) fail('UPDATE_SIGN_USAGE');
        process.stdout.write(JSON.stringify(signChannel({ input: args[1], privateKeyFile: args[3], expectedPublicKeySha256: args[5], output: args[7] })) + '\n');
    } catch (error) { process.stderr.write((/^UPDATE_[A-Z_]+$/.test(error?.code || '') ? error.code : 'UPDATE_SIGN_FAILED') + '\n'); process.exitCode = 1; }
}
