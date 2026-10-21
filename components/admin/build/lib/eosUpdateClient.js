'use strict';

// The browser/adapter receives status and a release ID, never a shell or URL.
// This socket is created by the separately installed root-owned updates service.
const net = require('node:net');
const SOCKET = '/run/nexowatt-eos-updates/control.sock';
const MAX_BYTES = 64 * 1024;
const TIMEOUT_MS = 5000;
const OPERATIONS = new Set(['status', 'check', 'install']);
const failure = code => Object.assign(new Error(code), { code });
let pending = 0;

function requestUpdate(operation, payload = {}) {
    if (!OPERATIONS.has(operation) || !payload || typeof payload !== 'object' || Array.isArray(payload)
        || Object.hasOwn(payload, 'operation')) return Promise.reject(failure('UPDATE_REQUEST'));
    let request;
    try { request = Buffer.from(`${JSON.stringify({ operation, ...payload })}\n`); }
    catch { return Promise.reject(failure('UPDATE_REQUEST')); }
    if (request.length > MAX_BYTES) return Promise.reject(failure('UPDATE_REQUEST'));
    if (pending >= 4) return Promise.reject(failure('UPDATE_BUSY'));
    pending++;
    return new Promise((resolve, reject) => {
        let socket;
        let done = false;
        let total = 0;
        const chunks = [];
        const finish = (error, result) => {
            if (done) return;
            done = true;
            pending--;
            clearTimeout(timer);
            socket?.destroy();
            if (error) reject(error); else resolve(result);
        };
        // One absolute deadline, not an inactivity timeout that a slow peer can extend.
        const timer = setTimeout(() => finish(failure('UPDATE_TIMEOUT')), TIMEOUT_MS);
        try {
            socket = net.createConnection({ path: SOCKET });
            socket.once('connect', () => socket.end(request));
            socket.on('data', chunk => {
                if (done) return;
                total += chunk.length;
                if (total > MAX_BYTES) { finish(failure('UPDATE_RESPONSE')); return; }
                chunks.push(chunk);
            });
            socket.once('end', () => {
                if (done) return;
                try {
                    const text = Buffer.concat(chunks).toString('utf8');
                    // Exactly one JSON response, not an unbounded stream or multiple replies.
                    if (!text.endsWith('\n') || text.slice(0, -1).includes('\n')) throw failure('UPDATE_RESPONSE');
                    const result = JSON.parse(text);
                    if (!result || Array.isArray(result) || typeof result !== 'object' || typeof result.ok !== 'boolean') {
                        throw failure('UPDATE_RESPONSE');
                    }
                    if (!result.ok) {
                        const code = typeof result.error === 'string' && /^UPDATE_[A-Z0-9_]{1,72}$/.test(result.error)
                            ? result.error : 'UPDATE_REJECTED';
                        throw failure(code);
                    }
                    finish(null, result);
                } catch (error) {
                    finish(failure(/^UPDATE_[A-Z0-9_]{1,72}$/.test(error?.code || '') ? error.code : 'UPDATE_RESPONSE'));
                }
            });
            socket.once('error', () => finish(failure('UPDATE_UNAVAILABLE')));
            socket.once('close', () => { if (!done) finish(failure('UPDATE_UNAVAILABLE')); });
        } catch { finish(failure('UPDATE_UNAVAILABLE')); }
    });
}

module.exports = { requestUpdate, SOCKET, MAX_BYTES, TIMEOUT_MS };
