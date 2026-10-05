'use strict';

// Native R9 laboratory client only. Credentials, issuer material, tokens and
// cookies remain in memory; neither exceptions nor returned evidence carry them.
const crypto = require('node:crypto');
const https = require('node:https');
const { performance } = require('node:perf_hooks');

const DEADLINE_MS = 5000;
const KID = 'nativeManagementLab';
// NWL3 capacities are trusted product policy, never issuer-supplied claims.
const LIMITS = Object.freeze({ home: Object.freeze({ chargePoints: 3, batteries: 2 }), pro: Object.freeze({ chargePoints: 50, batteries: 10 }) });
const FEATURES = Object.freeze({
    home: Object.freeze(['energy', 'wallet', 'smartHome', 'microgridSlave']),
    pro: Object.freeze(['energy', 'wallet', 'smartHome', 'microgridSlave', 'microgridMaster', 'multisite', 'billing']),
});
const UI_FEATURES = Object.freeze(['chargingManagement', 'storageControl', 'energyWallet', 'smartHome', 'mesh', 'billingExport']);
const fail = code => { throw Object.assign(new Error(code), { code }); };
const plain = value => !!value && typeof value === 'object' && !Array.isArray(value);
const exact = (value, keys) => plain(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const sameList = (actual, expected) => Array.isArray(actual) && actual.length === expected.length && expected.every((value, index) => actual[index] === value);
function checkDeadline(deadline) {
    if (performance.now() >= deadline) fail('R9_LICENSE_DEADLINE');
}

function adminToken(result) {
    const token = result?.data?.access_token;
    if (result?.status !== 200 || typeof token !== 'string' || !/^[\x21-\x7e]{16,8192}$/.test(token)) fail('R9_LICENSE_ADMIN_LOGIN');
    return token;
}

function uiCookie(result) {
    const data = result?.data;
    if (result?.status !== 200 || data?.ok !== true || data.strict !== true || data.authed !== true ||
        data.user !== 'admin' || data.role !== 'admin' || data.isAdmin !== true || data.passwordChangeRequired !== false) fail('R9_LICENSE_UI_LOGIN');
    const values = result.cookies;
    if (!Array.isArray(values)) fail('R9_LICENSE_UI_COOKIE');
    const matches = values.filter(value => typeof value === 'string' && value.startsWith('nw_session='));
    if (matches.length !== 1 || matches[0].length > 8192) fail('R9_LICENSE_UI_COOKIE');
    const pieces = matches[0].split(';').map(value => value.trim());
    const cookie = pieces.shift();
    const attributes = pieces.map(value => value.toLowerCase());
    if (!/^nw_session=[A-Za-z0-9_%.-]{16,4096}$/.test(cookie) || !attributes.includes('secure') ||
        !attributes.includes('httponly') || !attributes.includes('samesite=lax') || !attributes.includes('path=/') ||
        !attributes.some(value => /^max-age=[1-9][0-9]*$/.test(value))) fail('R9_LICENSE_UI_COOKIE');
    return cookie;
}

function statusSummary(result, uuid, expectedEdition) {
    const data = result?.data;
    if (result?.status !== 200 || !exact(data, ['v', 'valid', 'code', 'uuid', 'edition', 'expiresAt', 'limits', 'features']) ||
        data.v !== 1 || data.uuid !== uuid || typeof data.valid !== 'boolean' ||
        data.expiresAt !== null) fail('R9_LICENSE_STATUS');
    if (!data.valid) {
        if (expectedEdition || data.code !== 'LICENSE_MISSING' || data.edition !== null || data.expiresAt !== null ||
            !exact(data.limits, []) || !sameList(data.features, [])) fail('R9_LICENSE_STATUS');
    } else {
        if (!Object.hasOwn(LIMITS, data.edition) || (expectedEdition && data.edition !== expectedEdition) || data.code !== 'LICENSE_VALID' ||
            !exact(data.limits, ['chargePoints', 'batteries']) || data.limits.chargePoints !== LIMITS[data.edition].chargePoints ||
            data.limits.batteries !== LIMITS[data.edition].batteries || !sameList(data.features, FEATURES[data.edition])) fail('R9_LICENSE_STATUS');
    }
    return Object.freeze({ authenticated: true, uuidMatched: true, valid: data.valid, code: data.code, edition: data.edition,
        limits: Object.freeze({ ...data.limits }), features: Object.freeze([...data.features]) });
}

function uiSummary(result, { info = true, expectedEdition } = {}) {
    const data = result?.data;
    if (result?.status !== 200 || !plain(data) || data.ok !== true || typeof data.valid !== 'boolean' || data.type !== 'central' ||
        data.expiresAt !== 0 || data.expiryManagedBy !== 'eos-admin.0' || !Number.isSafeInteger(data.validUntil) ||
        !plain(data.features) || (info && (data.managedBy !== 'eos-admin.0' || data.centralManagement !== true)) ||
        ['uuid', 'token', 'key', 'licenseKey', 'access_token'].some(key => Object.hasOwn(data, key))) fail('R9_LICENSE_UI_STATUS');
    const edition = data.valid ? ({ hems: 'home', eos: 'pro' })[data.edition] : null;
    if ((data.valid && !edition) || (!data.valid && (data.edition !== 'none' || data.validUntil !== 0)) ||
        (expectedEdition && edition !== expectedEdition) ||
        data.maxWallboxes !== (edition ? LIMITS[edition].chargePoints : 0) || data.maxStorages !== (edition ? LIMITS[edition].batteries : 0) ||
        (data.valid && data.validUntil <= Date.now()) || UI_FEATURES.some(name => typeof data.features[name] !== 'boolean') ||
        UI_FEATURES.some(name => data.features[name] !== (edition ? (!['mesh', 'billingExport'].includes(name) || edition === 'pro') : false))) fail('R9_LICENSE_UI_STATUS');
    return Object.freeze({ authenticated: true, valid: data.valid, edition: data.edition,
        maxWallboxes: data.maxWallboxes, maxStorages: data.maxStorages,
        ...(info ? { centralManagement: true, managedBy: 'eos-admin.0' } : {}),
        features: Object.freeze(Object.fromEntries(UI_FEATURES.map(name => [name, data.features[name]]))) });
}

function issueToken({ core, issuer, uuid, edition }) {
    if (!Object.hasOwn(LIMITS, edition)) fail('R9_LICENSE_EDITION');
    try {
        const now = Date.now();
        const claims = { v: 3, kid: KID, licenseId: `ephemeral-native-r9-${edition}`, uuid, edition,
            issuedAt: now - 1000, notBefore: now - 1000, expiresAt: null, scope: 'system' };
        const message = 'NWL3.' + Buffer.from(JSON.stringify(claims)).toString('base64url');
        const token = message + '.' + crypto.sign(null, Buffer.from(message, 'ascii'), issuer).toString('base64url');
        const publicKeys = { [KID]: crypto.createPublicKey(issuer).export({ type: 'spki', format: 'pem' }).toString() };
        const verified = core.verifyLicense(token, { uuid, publicKeys, now });
        if (verified.v !== 3 || verified.scope !== 'system' || verified.expiresAt !== null || !sameList(verified.adapters, []) ||
            verified.edition !== edition || verified.uuid !== uuid || !sameList(verified.features, FEATURES[edition]) ||
            verified.limits.chargePoints !== LIMITS[edition].chargePoints || verified.limits.batteries !== LIMITS[edition].batteries) fail('R9_LICENSE_FIXTURE');
        return token;
    } catch { fail('R9_LICENSE_FIXTURE'); }
}

function exchange({ ca, port, route, body, form = false, token, cookie, write = false, deadline }) {
    return new Promise((resolve, reject) => {
        const remaining = deadline - performance.now();
        if (remaining <= 0) return reject(Object.assign(new Error('R9_LICENSE_DEADLINE'), { code: 'R9_LICENSE_DEADLINE' }));
        let request, response, done = false, timer;
        const finish = (code, result) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            request?.destroy();
            response?.destroy();
            if (code) reject(Object.assign(new Error(code), { code }));
            else resolve(result);
        };
        timer = setTimeout(() => finish('R9_LICENSE_DEADLINE'), remaining);
        try {
            const host = `localhost:${port}`;
            request = https.request({ host: '127.0.0.1', port, servername: 'localhost', ca,
                minVersion: 'TLSv1.3', maxVersion: 'TLSv1.3', rejectUnauthorized: true, agent: false,
                method: body === undefined ? 'GET' : 'POST', path: route, maxHeaderSize: 16384,
                headers: { Host: host, Accept: 'application/json',
                    ...(body === undefined ? {} : { 'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json', 'Content-Length': Buffer.byteLength(body) }),
                    ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(cookie ? { Cookie: cookie } : {}),
                    ...(write ? { Origin: 'https://' + host, 'x-eos-license': '1', 'Sec-Fetch-Site': 'same-origin' } : {}) } });
            request.once('error', () => finish('R9_LICENSE_TRANSPORT'));
            request.once('response', incoming => {
                response = incoming;
                if (!incoming.socket?.authorized || incoming.socket.getProtocol() !== 'TLSv1.3') return finish('R9_LICENSE_TLS');
                let size = 0;
                const chunks = [];
                incoming.on('data', chunk => {
                    size += chunk.length;
                    if (size > 32768) finish('R9_LICENSE_RESPONSE_LIMIT');
                    else chunks.push(chunk);
                });
                incoming.once('error', () => finish('R9_LICENSE_TRANSPORT'));
                incoming.once('aborted', () => finish('R9_LICENSE_TRANSPORT'));
                incoming.once('end', () => {
                    if (performance.now() >= deadline) return finish('R9_LICENSE_DEADLINE');
                    if (!/^application\/json(?:\s*;|$)/i.test(incoming.headers['content-type'] || '')) return finish('R9_LICENSE_RESPONSE');
                    try { finish(null, { status: incoming.statusCode, data: JSON.parse(Buffer.concat(chunks).toString('utf8')), cookies: incoming.headers['set-cookie'] }); }
                    catch { finish('R9_LICENSE_RESPONSE'); }
                });
            });
            if (body !== undefined) request.write(body);
            request.end();
        } catch { finish('R9_LICENSE_TRANSPORT'); }
    });
}

async function createSession({ ca, password, uuid, issuer, core }) {
    if (!(typeof ca === 'string' || Buffer.isBuffer(ca)) || !ca.length || typeof password !== 'string' || !password ||
        Buffer.byteLength(password) > 4096 || typeof uuid !== 'string' || !/^(?:[a-z]{2})?[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(uuid) ||
        typeof core?.verifyLicense !== 'function') fail('R9_LICENSE_OPTIONS');
    const tokens = Object.fromEntries(['home', 'pro'].map(edition => [edition, issueToken({ core, issuer, uuid, edition })]));
    const admin = async (route, body, edition) => {
        // One monotonic budget includes authentication, TLS, headers and body.
        // No redirects, retries or fallback can extend or evade this deadline.
        const deadline = performance.now() + DEADLINE_MS;
        const login = new URLSearchParams({ grant_type: 'password', client_id: 'ioBroker', username: 'admin', password }).toString();
        const token = adminToken(await exchange({ ca, port: 8081, route: '/oauth/token', body: login, form: true, deadline }));
        const result = statusSummary(await exchange({ ca, port: 8081, route, body, token, write: body !== undefined, deadline }), uuid, edition);
        checkDeadline(deadline);
        return result;
    };
    const ui = async (info, expectedEdition) => {
        const deadline = performance.now() + DEADLINE_MS;
        const cookie = uiCookie(await exchange({ ca, port: 8188, route: '/api/strict-auth/login', body: JSON.stringify({ user: 'admin', password }), deadline }));
        const result = uiSummary(await exchange({ ca, port: 8188, route: info ? '/api/license/info' : '/api/license/features', cookie, deadline }), { info, expectedEdition });
        checkDeadline(deadline);
        return result;
    };
    return Object.freeze({
        status: () => admin('/nexowatt/license/status'),
        activate: edition => {
            if (!Object.hasOwn(tokens, edition)) fail('R9_LICENSE_EDITION');
            return admin('/nexowatt/license/activate', JSON.stringify({ token: tokens[edition] }), edition);
        },
        remove: async () => {
            const result = await admin('/nexowatt/license/remove', '{}');
            if (result.valid || result.code !== 'LICENSE_MISSING') fail('R9_LICENSE_REMOVE');
            return result;
        },
        uiInfo: expectedEdition => ui(true, expectedEdition),
        uiFeatures: expectedEdition => ui(false, expectedEdition),
    });
}

module.exports = { createSession, adminToken, uiCookie, statusSummary, uiSummary, issueToken };
