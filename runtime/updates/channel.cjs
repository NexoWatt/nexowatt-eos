'use strict';
// The installed public key is the authority. HTTPS/GitHub metadata alone never
// authorizes execution; paths, deadlines and sizes are bounded independently.
const crypto = require('node:crypto');
const { TextDecoder } = require('node:util');
const nodePolicy = require('./node-policy.cjs');
const FEED_URL = 'https://raw.githubusercontent.com/NexoWatt/nexowatt-eos/main/delivery/update-channel/test.json';
const MAX_FEED = 65536;
const fail = code => { throw Object.assign(new Error(code), { code }); };
const exact = (v, keys) => v && typeof v === 'object' && !Array.isArray(v)
    && Object.keys(v).sort().join('|') === [...keys].sort().join('|');
const hash = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const iso = v => typeof v === 'string' && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
function publicKey(bytes) {
    let key;
    try { key = crypto.createPublicKey(bytes); } catch { fail('UPDATE_TRUST'); }
    if (key.asymmetricKeyType !== 'ed25519') fail('UPDATE_TRUST');
    return key;
}
function archiveUrl(value, release) {
    if (typeof value !== 'string') return false;
    if (/^https:\/\/raw\.githubusercontent\.com\/NexoWatt\/nexowatt-eos\/[a-f0-9]{40}\/delivery\/managed-test-[1-9][0-9]{0,8}\/eos-linux-arm64\.tar\.gz$/.test(value)) return true;
    const match = /^https:\/\/github\.com\/NexoWatt\/nexowatt-eos\/releases\/download\/managed-test-([1-9][0-9]{0,8})-([a-f0-9]{64})\/eos-linux-arm64\.tar\.gz$/.exec(value);
    return !!match && (!release || Number(match[1]) === release.sequence && match[2] === release.releaseId);
}
function verifyFeed(bytes, trust, { now = Date.now() } = {}) {
    if (!Buffer.isBuffer(bytes) || bytes.length > MAX_FEED) fail('UPDATE_FEED');
    let envelope, body, payload;
    try {
        envelope = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
        if (!exact(envelope, ['payload', 'signature']) || typeof envelope.payload !== 'string'
            || typeof envelope.signature !== 'string') fail('UPDATE_FEED');
        payload = Buffer.from(envelope.payload, 'base64');
        const signature = Buffer.from(envelope.signature, 'base64');
        if (payload.toString('base64') !== envelope.payload || signature.toString('base64') !== envelope.signature
            || signature.length !== 64 || !crypto.verify(null, payload, publicKey(trust), signature)) fail('UPDATE_SIGNATURE');
        body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(payload));
    } catch (error) { fail(error?.code === 'UPDATE_SIGNATURE' ? error.code : 'UPDATE_FEED'); }
    if (!exact(body, ['schemaVersion', 'channel', 'issuedAt', 'expiresAt', 'releases']) || body.schemaVersion !== 1
        || body.channel !== 'eos-managed-test-v1' || !iso(body.issuedAt) || !iso(body.expiresAt)
        || Date.parse(body.issuedAt) > now + 300000 || Date.parse(body.expiresAt) <= now
        || Date.parse(body.expiresAt) <= Date.parse(body.issuedAt)
        || Date.parse(body.expiresAt) - Date.parse(body.issuedAt) > 31 * 86400000
        || !Array.isArray(body.releases) || body.releases.length > 32) fail('UPDATE_FEED');
    const ids = new Set(), sequences = new Set();
    for (const release of body.releases) {
        if (!exact(release, ['releaseId', 'sequence', 'version', 'nodeVersion', 'platform', 'fromReleaseIds', 'url', 'bytes', 'sha256', 'notes'])
            || !hash(release.releaseId) || !hash(release.sha256) || ids.has(release.releaseId)
            || !Number.isSafeInteger(release.sequence) || release.sequence < 16 || sequences.has(release.sequence)
            || release.version !== '0.2.0-test.3' || !nodePolicy.supportedVersion(release.nodeVersion) || release.platform !== 'linux-arm64'
            || !Array.isArray(release.fromReleaseIds) || !release.fromReleaseIds.length || release.fromReleaseIds.length > 32
            || !release.fromReleaseIds.every(hash) || new Set(release.fromReleaseIds).size !== release.fromReleaseIds.length
            || release.fromReleaseIds.includes(release.releaseId) || !archiveUrl(release.url, release)
            || !Number.isSafeInteger(release.bytes) || release.bytes < 1 || release.bytes > nodePolicy.MAX_ARCHIVE_BYTES
            || typeof release.notes !== 'string' || release.notes.length > 2000 || /[\x00-\x08\x0b-\x1f\x7f]/.test(release.notes)) fail('UPDATE_FEED');
        ids.add(release.releaseId); sequences.add(release.sequence);
    }
    return body;
}
function selectRelease(feed, state) {
    if (!state || !hash(state.releaseId) || state.profile !== 'test' || !nodePolicy.supportedVersion(state.nodeVersion)
        || !Number.isSafeInteger(state.sequence) || state.sequence < 15) fail('UPDATE_BASELINE');
    return feed.releases.filter(r => r.sequence > state.sequence && r.fromReleaseIds.includes(state.releaseId)
        && nodePolicy.compareVersions(r.nodeVersion, state.nodeVersion) >= 0)
        .sort((a, b) => b.sequence - a.sequence)[0] || null;
}
module.exports = { FEED_URL, MAX_FEED, fail, exact, hash, publicKey, archiveUrl, verifyFeed, selectRelease };
