'use strict';
const https = require('node:https');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { FEED_URL, MAX_FEED, archiveUrl, fail } = require('./channel.cjs');
const { MAX_ARCHIVE_BYTES } = require('./node-policy.cjs');
// A release asset is initially selected only by the signed feed. GitHub's
// expiring CDN location may redirect within this fixed host boundary; it never
// supplies authority for bytes, which remain bound by signed length and SHA256.
function redirectTarget(location, current, initial, redirects) {
    if (!initial.startsWith('https://github.com/NexoWatt/nexowatt-eos/releases/download/') ||
        redirects >= 2 || typeof location !== 'string' || location.length > 8192 || /[\x00-\x20\x7f]/.test(location)) fail('UPDATE_DOWNLOAD_RESPONSE');
    let url;
    try { url = new URL(location); } catch { fail('UPDATE_DOWNLOAD_RESPONSE'); }
    const from = new URL(current);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash ||
        url.hostname !== 'release-assets.githubusercontent.com' || !url.pathname.startsWith('/github-production-release-asset/') ||
        !['github.com', 'release-assets.githubusercontent.com'].includes(from.hostname)) fail('UPDATE_DOWNLOAD_RESPONSE');
    return url.href;
}
// One absolute 5 s budget includes DNS, TLS, redirects, headers and body.
function request(url, { start, end, total, requestImpl = https.get } = {}) {
    const ranged = start !== undefined;
    if (ranged ? !archiveUrl(url) || ![start, end, total].every(Number.isSafeInteger)
        || start < 0 || end < start || end >= total || end - start + 1 > 1048576 : url !== FEED_URL) fail('UPDATE_URL');
    const maximum = ranged ? end - start + 1 : MAX_FEED;
    return new Promise((resolve, reject) => {
        let req, response, done = false, size = 0, redirects = 0, generation = 0; const chunks = [];
        const finish = (code, value) => {
            if (done) return; done = true; clearTimeout(timer); response?.destroy(); req?.destroy();
            if (code) reject(Object.assign(new Error(code), { code })); else resolve(value);
        };
        const timer = setTimeout(() => finish('UPDATE_DOWNLOAD_TIMEOUT'), 5000);
        function attempt(address) {
            if (done) return;
            const token = ++generation;
            try {
                const outgoing = requestImpl(address, { rejectUnauthorized: true, minVersion: 'TLSv1.2', agent: false,
                    headers: { 'Accept-Encoding': 'identity', ...(ranged ? { Range: `bytes=${start}-${end}` } : {}) } }, res => {
                    if (done || token !== generation) { res.destroy(); return; }
                    response = res;
                    if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
                        let target;
                        try { if (!ranged) fail('UPDATE_DOWNLOAD_RESPONSE'); target = redirectTarget(res.headers.location, address, url, redirects++); }
                        catch { return finish('UPDATE_DOWNLOAD_RESPONSE'); }
                        // Invalidate events from this request before destroying it.
                        generation++; res.destroy(); req?.destroy(); attempt(target); return;
                    }
                    if (res.statusCode !== (ranged ? 206 : 200) || res.headers.location
                        || res.headers['content-encoding'] && res.headers['content-encoding'] !== 'identity'
                        || ranged && res.headers['content-range'] !== `bytes ${start}-${end}/${total}`) return finish('UPDATE_DOWNLOAD_RESPONSE');
                    if (res.headers['content-length'] !== undefined && (!/^[0-9]+$/.test(res.headers['content-length'])
                        || Number(res.headers['content-length']) > maximum
                        || ranged && Number(res.headers['content-length']) !== maximum)) return finish('UPDATE_DOWNLOAD_SIZE');
                    res.on('data', part => { if (done) return; size += part.length; if (size > maximum) finish('UPDATE_DOWNLOAD_SIZE'); else chunks.push(part); });
                    res.once('error', () => finish('UPDATE_DOWNLOAD_FAILED'));
                    res.once('aborted', () => finish('UPDATE_DOWNLOAD_FAILED'));
                    res.once('end', () => ranged && size !== maximum ? finish('UPDATE_DOWNLOAD_SIZE') : finish(null, Buffer.concat(chunks)));
                });
                req = outgoing;
                outgoing.once('error', () => { if (token === generation) finish('UPDATE_DOWNLOAD_FAILED'); });
            } catch { finish('UPDATE_DOWNLOAD_FAILED'); }
        }
        attempt(url);
    });
}
async function downloadArchive(release, file, { fetchRange = request, progress = () => {}, now = Date.now } = {}) {
    if (!archiveUrl(release.url, release) || !Number.isSafeInteger(release.bytes) || release.bytes < 1
        || release.bytes > MAX_ARCHIVE_BYTES) fail('UPDATE_ARCHIVE');
    const fd = fs.openSync(file, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
    const digest = crypto.createHash('sha256'), deadline = now() + 600000;
    let completed = false;
    try {
        for (let start = 0; start < release.bytes; start += 1048576) {
            if (now() > deadline) fail('UPDATE_DOWNLOAD_TIMEOUT');
            const end = Math.min(start + 1048575, release.bytes - 1);
            const bytes = await fetchRange(release.url, { start, end, total: release.bytes });
            if (!Buffer.isBuffer(bytes) || bytes.length !== end - start + 1) fail('UPDATE_DOWNLOAD_SIZE');
            fs.writeFileSync(fd, bytes); digest.update(bytes); progress(end + 1, release.bytes);
        }
        if (digest.digest('hex') !== release.sha256) fail('UPDATE_ARCHIVE_HASH');
        fs.fsyncSync(fd); completed = true;
    } finally { fs.closeSync(fd); if (!completed) fs.unlinkSync(file); }
}
module.exports = { request, downloadArchive, redirectTarget };
