'use strict';
const https = require('node:https');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { fail, exact, validateOrigin, validateFinish, validateConfiguration } = require('./policy.cjs');
const configuration = require('./configuration.cjs');
const storage = require('./state.cjs');
const { passwordHash } = require('../bootstrap/enrollment.cjs');
const SESSION_TTL = 15 * 60 * 1000;
const MAX_BODY = 65536;
const cookieName = '__Host-eos-setup';
function validateTls(tls, origin, now = Date.now()) {
    const url = validateOrigin(origin);
    const cert = new crypto.X509Certificate(tls.cert); const ca = new crypto.X509Certificate(tls.ca);
    const host = url.hostname.replace(/^\[|\]$/g, '');
    if (!ca.ca || !ca.verify(ca.publicKey) || cert.ca || !cert.checkIssued(ca) || !cert.verify(ca.publicKey) ||
        !cert.checkPrivateKey(crypto.createPrivateKey(tls.key)) || !cert.keyUsage?.includes('1.3.6.1.5.5.7.3.1') ||
        ![cert, ca].every(row => now >= Date.parse(row.validFrom) && now < Date.parse(row.validTo)) ||
        !(net.isIP(host) ? cert.checkIP(host) : cert.checkHost(host, { wildcards: false }))) fail('SETUP_TLS');
}
function createSetupServer({ stateDirectory, releaseId, origin, completionFile, tls, licenseContext, now = Date.now, hashPassword = passwordHash }) {
    const url = validateOrigin(origin); validateTls(tls, origin, now());
    const initial = storage.readState(stateDirectory);
    if (initial.releaseId !== releaseId || initial.origin !== origin) fail('SETUP_BINDING');
    let session = null; let inflight = false;
    function verifySelection(selection, settings) {
        const result = require('../bootstrap/first-start-configuration.cjs').validateLicenseSelection(selection, { ...licenseContext, now: now() });
        if (settings && settings.schemaVersion !== 3 && selection.mode === 'activate') configuration.licenseCapacity(settings.devicePlan, result);
        return result;
    }
    let budgetAt = now(), budget = 0;
    const assets = new Map([['/', ['text/html; charset=utf-8', fs.readFileSync(path.join(__dirname, 'public/index.html'))]],
        ['/app.js', ['application/javascript; charset=utf-8', fs.readFileSync(path.join(__dirname, 'public/app.js'))]],
        ['/style.css', ['text/css; charset=utf-8', fs.readFileSync(path.join(__dirname, 'public/style.css'))]]]);
    const headers = { 'cache-control': 'no-store', 'pragma': 'no-cache', 'x-content-type-options': 'nosniff',
        'strict-transport-security': 'max-age=31536000', 'referrer-policy': 'no-referrer', 'x-frame-options': 'DENY',
        'content-security-policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" };
    function send(res, status, data, extra = {}) {
        res.writeHead(status, { ...headers, 'content-type': 'application/json; charset=utf-8', ...extra });
        res.end(typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data));
    }
    function authenticated(req) {
        if (!session || now() < session.issuedAt || now() >= session.expiresAt || session.setupId !== storage.readState(stateDirectory).setupId) { session = null; return false; }
        const cookie = req.headers.cookie;
        if (typeof cookie !== 'string' || cookie.length > 4096) return false;
        const rows = cookie.split(';').map(row => row.trim()).filter(row => row.startsWith(cookieName + '='));
        return rows.length === 1 && storage.hash(rows[0].slice(cookieName.length + 1)) === session.hash;
    }
    async function body(req) {
        if (req.headers['content-type'] !== 'application/json' || req.headers['content-encoding'] ||
            req.headers['content-length'] && (!/^\d{1,5}$/.test(req.headers['content-length']) || Number(req.headers['content-length']) > MAX_BODY)) fail('SETUP_BODY');
        const chunks = []; let size = 0;
        for await (const chunk of req) { size += chunk.length; if (size > MAX_BODY) fail('SETUP_BODY'); chunks.push(chunk); }
        try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))); }
        catch { fail('SETUP_BODY'); }
    }
    const server = https.createServer({ ...tls, minVersion: 'TLSv1.3', maxVersion: 'TLSv1.3', maxHeaderSize: 8192,
        requestTimeout: 10000, headersTimeout: 10000, keepAliveTimeout: 1000 }, async (req, res) => {
        try {
            if (req.headers.host !== url.host || req.headers['x-forwarded-host'] || req.headers['x-forwarded-proto'] ||
                req.headers.forwarded || req.url.length > 128 || req.url.includes('?') || req.url.includes('#')) return send(res, 421, { code: 'SETUP_REQUEST_REJECTED' });
            if (now() - budgetAt >= 60000) { budgetAt = now(); budget = 0; }
            if (++budget > 90) return send(res, 429, { code: 'SETUP_RATE_LIMIT' }, { 'retry-after': '60' });
            if (completionFile && fs.existsSync(completionFile)) { session = null; return send(res, 410, { code: 'SETUP_CLOSED' }); }
            let state = storage.readState(stateDirectory);
            if (state.releaseId !== releaseId || state.origin !== origin) fail('SETUP_BINDING');
            if (req.method === 'GET' && assets.has(req.url)) {
                const [type, bytes] = assets.get(req.url); return send(res, 200, bytes, { 'content-type': type });
            }
            if (req.method === 'GET' && req.url === '/api/session') {
                const authed = authenticated(req);
                return send(res, 200, { state: state.state, authenticated: authed, csrf: authed ? session.csrf : null,
                    account: 'admin', role: 'service', physicalControlEnabled: false, releaseId });
            }
            if (req.method === 'GET' && req.url === '/api/catalog') {
                if (!authenticated(req) || state.state !== 'claimed') return send(res, 403, { code: 'SETUP_SESSION' });
                return send(res, 200, { templates: configuration.catalog.templates, uuid: licenseContext?.uuid, physicalControlEnabled: false });
            }
            if (req.method !== 'POST' || !['/api/claim', '/api/finish', '/api/license/verify', '/api/configuration/check'].includes(req.url)) return send(res, 404, { code: 'SETUP_NOT_FOUND' });
            if (req.headers.origin !== origin || req.headers['x-eos-setup'] !== '1' ||
                req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin') return send(res, 403, { code: 'SETUP_ORIGIN' });
            if (inflight) return send(res, 409, { code: 'SETUP_BUSY' });
            inflight = true;
            let unlock;
            try {
                unlock = storage.lock(stateDirectory);
                state = storage.readState(stateDirectory);
                const input = await body(req);
                if (req.url === '/api/claim') {
                    if (!exact(input, ['code']) || typeof input.code !== 'string' || input.code.length > 128) fail('SETUP_INPUT');
                    if (state.state !== 'awaiting-code' || state.attempts >= 8 || now() >= state.expiresAt || state.expiresAt - now() > storage.CODE_TTL) return send(res, 403, { code: 'SETUP_CODE_REJECTED' });
                    state.attempts++;
                    const accepted = /^[A-Za-z0-9_-]{32}$/.test(input.code) && storage.hash(input.code) === state.codeHash;
                    if (!accepted) { storage.write(stateDirectory, 'state.json', state); return send(res, 403, { code: 'SETUP_CODE_REJECTED' }); }
                    state.state = 'claimed'; state.codeHash = null; storage.write(stateDirectory, 'state.json', state);
                    const token = crypto.randomBytes(32).toString('base64url');
                    session = { hash: storage.hash(token), csrf: crypto.randomBytes(32).toString('base64url'), issuedAt: now(), expiresAt: now() + SESSION_TTL, setupId: state.setupId };
                    return send(res, 200, { authenticated: true, csrf: session.csrf }, {
                        'set-cookie': `${cookieName}=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL / 1000}` });
                }
                if (state.state !== 'claimed' || !authenticated(req) || req.headers['x-eos-csrf'] !== session.csrf) return send(res, 403, { code: 'SETUP_SESSION' });
                if (req.url === '/api/license/verify') {
                    if (!exact(input, ['token'])) fail('SETUP_INPUT');
                    return send(res, 200, verifySelection(configuration.licenseInput({ mode: 'activate', token: input.token })));
                }
                if (req.url === '/api/configuration/check') {
                    const { settings, license } = validateConfiguration(input);
                    const licenseStatus = verifySelection(license, settings);
                    return send(res, 200, { ...configuration.summarize(settings, license), license: licenseStatus });
                }
                const { password, settings, license } = validateFinish(input);
                verifySelection(license, settings);
                // Durable exclusion precedes expensive derivation and all handoff writes.
                // A restart after this point never reopens commissioning automatically.
                fs.mkdirSync(path.join(stateDirectory, 'commit.lock'), { mode: 0o700 });
                state.state = 'committing'; storage.write(stateDirectory, 'state.json', state); session = null;
                // A bounded KDF on Raspberry Pi can outlast the body/header
                // timeout. This extended deadline applies only after ownership,
                // session, CSRF, schema and exclusive commit have all passed.
                res.setTimeout(120000, () => res.destroy());
                const hashed = await hashPassword(password);
                const handoff = { schemaVersion: settings.schemaVersion === 3 ? 3 : 2, releaseId, setupId: state.setupId, passwordHash: hashed, settings, license };
                require('./policy.cjs').validateHandoff(handoff, releaseId);
                storage.write(stateDirectory, 'handoff.json', handoff);
                return send(res, 202, { state: 'committing', ...configuration.summarize(settings, license) }, {
                    'set-cookie': `${cookieName}=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0` });
            } finally { if (unlock) unlock(); inflight = false; }
        } catch (error) {
            // Never reflect request values, exception messages, passwords or codes.
            const inputError = ['SETUP_BODY', 'SETUP_INPUT', 'SETUP_SETTINGS', 'SETUP_CONFIGURATION', 'SETUP_TIMEZONE', 'ENROLLMENT_PASSWORD_POLICY'].includes(error.code) || /^LICENSE_|^FIRST_START_LICENSE_/.test(error.code || '');
            if (!res.headersSent) send(res, inputError ? 400 : 503, { code: inputError ? 'SETUP_INPUT_REJECTED' : 'SETUP_UNAVAILABLE' });
            else res.destroy();
        }
    });
    server.maxConnections = 32; server.maxRequestsPerSocket = 20; server.setTimeout(10000, socket => socket.destroy());
    server.on('clientError', (_error, socket) => socket.destroy());
    server.on('tlsClientError', () => {});
    return server;
}
module.exports = { createSetupServer, validateTls, MAX_BODY, SESSION_TTL };
