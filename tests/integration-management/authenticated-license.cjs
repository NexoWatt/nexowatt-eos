'use strict';
const https = require('node:https');
const { performance } = require('node:perf_hooks');
const fail = code => { throw Object.assign(new Error(code), { code }); };
function loginToken(result) {
    const token = result?.data?.access_token;
    if (result?.status !== 200 || typeof token !== 'string' || !/^[\x21-\x7e]{16,8192}$/.test(token)) fail('MANAGEMENT_ADMIN_LOGIN_FAILED');
    return token;
}
function licenseSummary(result, expectedUuid) {
    if (result?.status !== 200 || result.data?.v !== 1 || result.data.valid !== true || result.data.code !== 'LICENSE_VALID' ||
        result.data.uuid !== expectedUuid || result.data.edition !== 'home') fail('MANAGEMENT_LICENSE_STATUS_FAILED');
    return { authenticated: true, licenseValid: true, code: 'LICENSE_VALID', uuidMatched: true };
}
function exchange({ ca, route, body, token, deadline }) {
    return new Promise((resolve, reject) => {
        const remaining = deadline - performance.now();
        if (remaining <= 0) return reject(new Error('MANAGEMENT_AUTH_DEADLINE'));
        let request, response, done = false, timer;
        const finish = (code, result) => {
            if (done) return; done = true; clearTimeout(timer); request?.destroy(); response?.destroy();
            code ? reject(new Error(code)) : resolve(result);
        };
        timer = setTimeout(() => finish('MANAGEMENT_AUTH_DEADLINE'), remaining);
        try {
            request = https.request({ host: '127.0.0.1', port: 8081, servername: 'localhost', ca,
                minVersion: 'TLSv1.3', maxVersion: 'TLSv1.3', rejectUnauthorized: true, agent: false,
                method: body === undefined ? 'GET' : 'POST', path: route,
                headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }),
                    ...(token ? { Authorization: 'Bearer ' + token } : {}) } });
            request.once('error', () => finish('MANAGEMENT_AUTH_TRANSPORT'));
            request.once('response', incoming => {
                response = incoming;
                if (!incoming.socket?.authorized || incoming.socket.getProtocol() !== 'TLSv1.3') return finish('MANAGEMENT_AUTH_TLS');
                let size = 0; const chunks = [];
                incoming.on('data', chunk => { size += chunk.length; if (size > 32768) finish('MANAGEMENT_AUTH_RESPONSE_LIMIT'); else chunks.push(chunk); });
                incoming.once('error', () => finish('MANAGEMENT_AUTH_TRANSPORT')); incoming.once('aborted', () => finish('MANAGEMENT_AUTH_TRANSPORT'));
                incoming.once('end', () => {
                    if (performance.now() >= deadline) return finish('MANAGEMENT_AUTH_DEADLINE');
                    try { finish(null, { status: incoming.statusCode, data: JSON.parse(Buffer.concat(chunks).toString('utf8')) }); }
                    catch { finish('MANAGEMENT_AUTH_RESPONSE'); }
                });
            });
            if (body !== undefined) request.write(body);
            request.end();
        } catch { finish('MANAGEMENT_AUTH_TRANSPORT'); }
    });
}
async function verifyLicenseOverHttps({ ca, password, uuid }) {
    const deadline = performance.now() + 5000;
    const body = new URLSearchParams({ grant_type: 'password', client_id: 'ioBroker', username: 'admin', password }).toString();
    const token = loginToken(await exchange({ ca, route: '/oauth/token', body, deadline }));
    return licenseSummary(await exchange({ ca, route: '/nexowatt/license/status', token, deadline }), uuid);
}
module.exports = { verifyLicenseOverHttps, loginToken, licenseSummary };
