'use strict';
// Trusted gateway: TLS terminates here. This is not end-to-end encryption
// against the gateway and is not a transparent ioBroker adapter-core replacement.
const https = require('node:https');
const { randomUUID } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const { fail, ensure, shape, compilePolicy, identify, validateWrite } = require('./policy.cjs');
const { parseBoundedJson } = require('../policy/admission.cjs');
const LIMITS = Object.freeze({ body: 16384, response: 65536, deadline: 5000, connections: 64, active: 32,
    perPeer: 2, messages: 256, mailbox: 32, messageBytes: 8192, replay: 1024, rate: 20, burst: 40 });
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
function tlsOptions(input) {
    shape(input, ['ca', 'cert', 'key'], 'EOS_CHANNEL_TLS');
    for (const name of ['ca', 'cert', 'key']) ensure(typeof input[name] === 'string' && input[name].length > 0 && Buffer.byteLength(input[name]) <= 65536, 'EOS_CHANNEL_TLS');
    ensure(process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0', 'EOS_CHANNEL_TLS');
    return { ...input, minVersion: 'TLSv1.3', maxVersion: 'TLSv1.3', requestCert: true, rejectUnauthorized: true };
}
function readBody(request, signal) {
    return new Promise((resolve, reject) => {
        let size = 0, chunks = [], settled = false;
        const finish = (error, value) => {
            if (settled) return; settled = true;
            signal.removeEventListener('abort', abort); request.removeListener('data', data);
            request.removeListener('end', end); request.removeListener('error', errorHandler); request.removeListener('aborted', abort);
            chunks = []; error ? reject(error) : resolve(value);
        };
        const abort = () => finish(fail('EOS_CHANNEL_DEADLINE'));
        const errorHandler = () => finish(fail('EOS_CHANNEL_REQUEST'));
        const data = chunk => { size += chunk.length; if (size > LIMITS.body) { finish(fail('EOS_CHANNEL_SIZE')); request.resume(); } else chunks.push(chunk); };
        const end = () => { try { finish(null, parseBoundedJson(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)))); } catch { finish(fail('EOS_CHANNEL_REQUEST')); } };
        request.on('data', data); request.once('end', end); request.once('error', errorHandler); request.once('aborted', abort);
        signal.addEventListener('abort', abort, { once: true }); if (signal.aborted) abort();
    });
}
function safeState(value) {
    if (value === null) return null;
    ensure(value && typeof value === 'object' && (value.val === null || ['number', 'boolean', 'string'].includes(typeof value.val)), 'EOS_CHANNEL_STATE_FORMAT');
    ensure(typeof value.ack === 'boolean' && Number.isFinite(value.ts) && Number.isFinite(value.lc) && Number.isFinite(value.q), 'EOS_CHANNEL_STATE_FORMAT');
    ensure(typeof value.val !== 'number' || Number.isFinite(value.val), 'EOS_CHANNEL_STATE_FORMAT');
    ensure(typeof value.val !== 'string' || Buffer.byteLength(value.val) <= 4096, 'EOS_CHANNEL_STATE_FORMAT');
    return { val: value.val, ack: value.ack, ts: value.ts, lc: value.lc, q: value.q };
}
function createGateway({ tls, policy: initialPolicy, backend }) {
    ensure(backend && typeof backend.getState === 'function' && typeof backend.setState === 'function', 'EOS_CHANNEL_BACKEND');
    let policy = compilePolicy(initialPolicy), epoch = randomUUID(), active = 0;
    let baseWall = Date.now(), baseMono = performance.now();
    const stats = new Map(), mail = new Map();
    function resetEpoch() { epoch = randomUUID(); mail.clear(); for (const stat of stats.values()) stat.seen.clear(); }
    function clock() {
        const now = Date.now(), mono = performance.now();
        if (Math.abs(now - (baseWall + mono - baseMono)) > 1000) { resetEpoch(); baseWall = now; baseMono = mono; }
        return now;
    }
    function context(peer) {
        if (!stats.has(peer.id)) stats.set(peer.id, { active: 0, tokens: LIMITS.burst, at: performance.now(), seen: new Map() });
        const state = stats.get(peer.id), now = performance.now();
        state.tokens = Math.min(LIMITS.burst, state.tokens + (now - state.at) / 1000 * LIMITS.rate); state.at = now;
        ensure(state.tokens >= 1, 'EOS_CHANNEL_RATE'); state.tokens--;
        for (const [id, at] of state.seen) if (now - at > LIMITS.deadline + 1000) state.seen.delete(id);
        return state;
    }
    function pruneMail(now) {
        let total = 0;
        for (const [id, queue] of mail) { const retained = queue.filter(m => m.expiresAt > now); if (retained.length) { mail.set(id, retained); total += retained.length; } else mail.delete(id); }
        return total;
    }
    function respond(response, status, value) {
        if (response.destroyed || response.writableEnded) return;
        let body = JSON.stringify(value);
        if (Buffer.byteLength(body) > LIMITS.response) { status = 503; body = '{"ok":false,"code":"EOS_CHANNEL_SIZE"}'; }
        response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(body), 'Connection': 'close' });
        response.end(body);
    }
    const server = https.createServer({ ...tlsOptions(tls), handshakeTimeout: LIMITS.deadline, maxHeaderSize: 4096 }, (request, response) => {
        const aborter = new AbortController(), { signal } = aborter, arrived = performance.now();
        request.on('error', () => aborter.abort());
        request.on('aborted', () => aborter.abort());
        let timer = setTimeout(() => { aborter.abort(); respond(response, 503, { ok: false, code: 'EOS_CHANNEL_DEADLINE' }); request.destroy(); }, LIMITS.deadline);
        const disconnected = () => { if (!response.writableFinished) aborter.abort(); };
        response.once('close', disconnected);
        const run = async () => {
            clock(); let peer = identify(request.socket, policy); const state = context(peer);
            if (request.method === 'GET' && request.url === '/v1/session') {
                ensure(!request.headers['transfer-encoding'] && (!request.headers['content-length'] || request.headers['content-length'] === '0'), 'EOS_CHANNEL_REQUEST');
                return respond(response, 200, { ok: true, epoch, peer: peer.id, revision: policy.revision });
            }
            ensure(request.method === 'POST' && request.url === '/v1/rpc' && request.headers['content-type'] === 'application/json' && !request.headers['content-encoding'], 'EOS_CHANNEL_REQUEST');
            ensure(!request.headers['content-length'] || /^\d+$/.test(request.headers['content-length']) && Number(request.headers['content-length']) <= LIMITS.body, 'EOS_CHANNEL_SIZE');
            const envelope = await readBody(request, signal);
            peer = identify(request.socket, policy);
            shape(envelope, ['v', 'epoch', 'id', 'issuedAt', 'expiresAt', 'op', 'payload'], 'EOS_CHANNEL_REQUEST');
            const now = clock(), requestEpoch = epoch, revision = policy.revision;
            const check = () => {
                ensure(!signal.aborted && performance.now() - arrived < LIMITS.deadline && clock() < envelope.expiresAt, 'EOS_CHANNEL_DEADLINE');
                ensure(epoch === requestEpoch && revision === policy.revision && identify(request.socket, policy).id === peer.id, 'EOS_CHANNEL_REVOKED');
            };
            ensure(envelope.v === 1 && uuid(envelope.id) && envelope.epoch === epoch, 'EOS_CHANNEL_SESSION');
            ensure(Number.isSafeInteger(envelope.issuedAt) && Number.isSafeInteger(envelope.expiresAt) && envelope.issuedAt <= now + 1000 && envelope.expiresAt > now &&
                envelope.expiresAt > envelope.issuedAt && envelope.expiresAt - envelope.issuedAt <= LIMITS.deadline && envelope.expiresAt <= now + LIMITS.deadline, 'EOS_CHANNEL_DEADLINE');
            ensure(!state.seen.has(envelope.id), 'EOS_CHANNEL_REPLAY');
            ensure(state.seen.size < LIMITS.replay && active < LIMITS.active && state.active < LIMITS.perPeer, 'EOS_CHANNEL_BUSY');
            state.seen.set(envelope.id, performance.now()); active++; state.active++;
            clearTimeout(timer);
            timer = setTimeout(() => { aborter.abort(); respond(response, 503, { ok: false, code: 'EOS_CHANNEL_DEADLINE' }); request.destroy(); }, Math.max(1, Math.min(LIMITS.deadline - (performance.now() - arrived), envelope.expiresAt - now)));
            try {
                check(); let result;
                if (envelope.op === 'state.read') {
                    shape(envelope.payload, ['id'], 'EOS_CHANNEL_REQUEST'); ensure(peer.read.includes(envelope.payload.id), 'EOS_CHANNEL_DENIED');
                    result = safeState(await backend.getState(envelope.payload.id, { signal, check }));
                } else if (envelope.op === 'state.write') {
                    const rule = validateWrite(peer, envelope.payload);
                    await backend.setState(envelope.payload.id, { val: envelope.payload.value, ack: rule.mode === 'telemetry', from: `system.adapter.${peer.id}` }, { signal, check });
                    result = { written: true };
                } else if (envelope.op === 'message.send') {
                    shape(envelope.payload, ['to', 'command', 'data'], 'EOS_CHANNEL_REQUEST');
                    ensure(peer.send.some(r => r.to === envelope.payload.to && r.command === envelope.payload.command), 'EOS_CHANNEL_DENIED');
                    ensure(Buffer.byteLength(JSON.stringify(envelope.payload.data)) <= LIMITS.messageBytes, 'EOS_CHANNEL_SIZE');
                    const count = pruneMail(now), queue = mail.get(envelope.payload.to) || [];
                    ensure(count < LIMITS.messages && queue.length < LIMITS.mailbox, 'EOS_CHANNEL_BUSY');
                    queue.push({ id: envelope.id, from: peer.id, command: envelope.payload.command, data: envelope.payload.data, expiresAt: envelope.expiresAt });
                    mail.set(envelope.payload.to, queue); result = { queued: true, executed: false };
                } else if (envelope.op === 'message.receive') {
                    shape(envelope.payload, [], 'EOS_CHANNEL_REQUEST'); pruneMail(now);
                    const queue = mail.get(peer.id) || [], batch = []; let size = 2;
                    while (queue.length && batch.length < 16 && size + Buffer.byteLength(JSON.stringify(queue[0])) < 60000) {
                        const message = queue.shift(); size += Buffer.byteLength(JSON.stringify(message)) + 1; batch.push(message);
                    }
                    if (!queue.length) mail.delete(peer.id); result = batch;
                } else throw fail('EOS_CHANNEL_OPERATION');
                check(); respond(response, 200, { ok: true, id: envelope.id, result });
            } finally { active--; state.active--; }
        };
        run().catch(error => {
            const code = /^EOS_CHANNEL_[A-Z_]+$/.test(error?.code || '') ? error.code : 'EOS_CHANNEL_BACKEND_UNAVAILABLE';
            respond(response, ['EOS_CHANNEL_DENIED', 'EOS_CHANNEL_PEER', 'EOS_CHANNEL_REVOKED'].includes(code) ? 403 : 503, { ok: false, code });
        }).finally(() => { clearTimeout(timer); response.removeListener('close', disconnected); });
    });
    server.headersTimeout = LIMITS.deadline; server.requestTimeout = LIMITS.deadline; server.timeout = LIMITS.deadline;
    server.maxConnections = LIMITS.connections; server.maxRequestsPerSocket = 1;
    server.on('tlsClientError', () => {});
    server.on('clientError', (_error, socket) => socket.destroy());
    return {
        server,
        replacePolicy(next) {
            const replacement = compilePolicy(next); ensure(replacement.revision > policy.revision, 'EOS_CHANNEL_REVISION');
            policy = replacement; resetEpoch();
            for (const [id, state] of stats) if (!state.active && ![...policy.peers.values()].some(p => p.id === id)) stats.delete(id);
        },
    };
}
module.exports = { createGateway, LIMITS, tlsOptions, safeState };
