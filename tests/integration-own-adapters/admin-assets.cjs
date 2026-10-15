'use strict';
// Native test client: one hard five-second HTTPS budget includes authentication
// and all four exact public configuration assets. Secrets remain in memory.
const https = require('node:https');
const crypto = require('node:crypto');
const { performance } = require('node:perf_hooks');
const ASSETS = Object.freeze([
    { name: 'nexowatt-devices', file: 'jsonConfig.json' }, { name: 'eebus', file: 'jsonConfig.json' },
    { name: 'ocpp21', file: 'jsonConfig.json' }, { name: 'nexowatt-backup', file: 'jsonConfig.json5' },
].map(Object.freeze));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fail = () => { throw new Error('OWN_NATIVE_ADMIN_ASSETS'); };
function request({ ca, route, body, token, deadline }) {
    return new Promise((resolve, reject) => {
        let req, res, done = false;
        const finish = (error, result) => {
            if (done) return; done = true; clearTimeout(timer); req?.destroy(); res?.destroy();
            if (error) reject(new Error('OWN_NATIVE_ADMIN_ASSETS')); else resolve(result);
        };
        const timer = setTimeout(() => finish(true), Math.max(1, deadline - performance.now()));
        try {
            if (performance.now() >= deadline) return finish(true);
            req = https.request({ host: '127.0.0.1', port: 8081, servername: 'localhost', ca, rejectUnauthorized: true,
                minVersion: 'TLSv1.3', maxVersion: 'TLSv1.3', path: route, method: body === undefined ? 'GET' : 'POST', agent: false,
                headers: { Host: 'localhost:8081', Connection: 'close', ...(token ? { Authorization: 'Bearer ' + token } : {}),
                    ...(body === undefined ? {} : { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }) } });
            req.once('error', () => finish(true));
            req.once('response', incoming => {
                res = incoming;
                if (res.statusCode !== 200 || !res.socket.authorized || res.socket.getProtocol() !== 'TLSv1.3') return finish(true);
                const chunks = []; let bytes = 0;
                res.on('data', chunk => { bytes += chunk.length; if (bytes > 131072) finish(true); else chunks.push(chunk); });
                res.once('aborted', () => finish(true)); res.once('error', () => finish(true));
                res.once('end', () => finish(performance.now() >= deadline, Buffer.concat(chunks)));
            });
            if (body !== undefined) req.write(body); req.end();
        } catch { finish(true); }
    });
}
async function verifyAdminAssets({ ca, password, expected }) {
    if (!Array.isArray(expected) || expected.length !== ASSETS.length || expected.some((row, n) =>
        row.name !== ASSETS[n].name || row.file !== ASSETS[n].file || !/^[a-f0-9]{64}$/.test(row.sha256 || ''))) fail();
    const deadline = performance.now() + 5000;
    const body = new URLSearchParams({ grant_type: 'password', client_id: 'ioBroker', username: 'admin', password }).toString();
    let token;
    try { token = JSON.parse(await request({ ca, route: '/oauth/token', body, deadline })).access_token; } catch { fail(); }
    if (typeof token !== 'string' || !/^[\x21-\x7e]{16,8192}$/.test(token)) fail();
    const hashes = await Promise.all(expected.map(async row => sha(await request({ ca,
        route: '/adapter/' + row.name + '/' + row.file, token, deadline }))));
    if (hashes.some((hash, n) => hash !== expected[n].sha256)) fail();
    return { count: ASSETS.length, authenticated: true, exactCandidateHashesMatched: true, tls13: true, maximumTotalBudgetMs: 5000 };
}
module.exports = { ASSETS, verifyAdminAssets };
