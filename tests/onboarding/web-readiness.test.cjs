'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const https = require('node:https');
const net = require('node:net');
const { execFileSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');
const { probeWeb, waitAdapters } = require('../../tools/system/onboard-ui.cjs');
const UI = { ok: true, enabled: true, strict: true, authed: false, protectWrites: true, isAdmin: false };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const listen = (server, port) => new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => { server.removeListener('error', reject); resolve(); });
});
async function freePort(port) {
    const server = net.createServer(); await listen(server, port);
    await new Promise(resolve => server.close(resolve));
}
function certificate(directory, name) {
    const keyPath = path.join(directory, `${name}.key`), certPath = path.join(directory, `${name}.crt`);
    execFileSync('/usr/bin/openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes',
        '-keyout', keyPath, '-out', certPath, '-days', '1', '-subj', '/CN=localhost',
        '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1'], { stdio: 'ignore', timeout: 15000 });
    fs.chmodSync(keyPath, 0o600);
    return { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
}
function fixture(identity, handler, options = {}) {
    const sockets = new Set(); let connections = 0, requests = 0;
    const server = https.createServer({ ...identity, minVersion: 'TLSv1.3', maxVersion: 'TLSv1.3', ...options },
        (request, response) => { requests++; handler(request, response); });
    server.on('connection', socket => { connections++; sockets.add(socket); socket.once('close', () => sockets.delete(socket)); });
    server.on('tlsClientError', () => {});
    return { server, sockets, connections: () => connections, requests: () => requests,
        close: async () => {
            for (const socket of sockets) socket.destroy();
            await new Promise(resolve => server.close(() => resolve()));
        } };
}
const uiResponse = (_request, response) => { response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(UI)); };
async function rejectsOnce(identity, ca, handler, options = {}) {
    const f = fixture(identity, handler, options); await listen(f.server, 8188);
    try {
        const start = performance.now();
        await assert.rejects(probeWeb(8188, ca), error => error.code === 'ONBOARD_HTTPS_NOT_READY' && error.stage === 'https-probe');
        assert.ok(performance.now() - start < 1500, 'permanent rejection must not consume the retry budget');
        await delay(250);
        assert.equal(f.connections(), 1, 'permanent failures are not retried');
        assert.equal(f.sockets.size, 0, 'rejected peer is closed');
    } finally { await f.close(); }
}

// Ports are the fixed product endpoints, not configurable test bypasses.
// Keep these subtests sequential; a conflicting listener fails explicitly.
test('HTTPS readiness uses strict contracts within one listener-start budget', { timeout: 30000 }, async t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-web-ready-')); fs.chmodSync(directory, 0o700);
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const identity = certificate(directory, 'listener'), other = certificate(directory, 'other');
    await freePort(8081); await freePort(8188);

    await t.test('fresh adapter heartbeats before a delayed real TLS listener now pass', async () => {
        const f = fixture(identity, uiResponse);
        const startedAt = Date.now(), seen = [];
        await waitAdapters({ getState: async id => { seen.push(id); return { val: true, ack: true, ts: Date.now() }; } }, startedAt);
        assert.deepEqual(seen, ['system.adapter.eos-admin.0.alive', 'system.adapter.nexowatt-ui.0.alive']);
        const opening = delay(350).then(() => listen(f.server, 8188));
        const start = performance.now();
        try {
            await probeWeb(8188, identity.cert);
            assert.ok(performance.now() - start >= 350);
            assert.ok(performance.now() - start < 2000);
            assert.equal(f.requests(), 1);
        } finally { await opening; await f.close(); }
    });

    await t.test('pre-response connection reset is retried and then strict TLS succeeds', async () => {
        const reset = net.createServer(socket => socket.destroy()); await listen(reset, 8188);
        const f = fixture(identity, uiResponse);
        const switching = delay(350).then(async () => {
            await new Promise(resolve => reset.close(resolve)); await listen(f.server, 8188);
        });
        try { await probeWeb(8188, identity.cert); assert.equal(f.requests(), 1); }
        finally { await switching; await f.close(); }
    });

    await t.test('Admin requires its exact local login redirect', async () => {
        const f = fixture(identity, (request, response) => {
            assert.equal(request.url, '/nexowatt/license/status');
            response.writeHead(302, { Location: '/index.html?login&href=%2Fnexowatt%2Flicense%2Fstatus' }); response.end();
        });
        await listen(f.server, 8081);
        try { await probeWeb(8081, identity.cert); assert.equal(f.requests(), 1); }
        finally { await f.close(); }
    });

    await t.test('wrong CA is rejected once', () => rejectsOnce(identity, other.cert, uiResponse));
    await t.test('TLS 1.2 is rejected once', () => rejectsOnce(identity, identity.cert, uiResponse,
        { minVersion: 'TLSv1.2', maxVersion: 'TLSv1.2' }));
    await t.test('HTTP error is rejected once', () => rejectsOnce(identity, identity.cert, (_request, response) => {
        response.writeHead(503); response.end(JSON.stringify(UI));
    }));
    await t.test('weakened anonymous authorization is rejected once', () => rejectsOnce(identity, identity.cert, (_request, response) => {
        response.writeHead(200); response.end(JSON.stringify({ ...UI, protectWrites: false }));
    }));
    await t.test('oversized body is rejected once and the socket is closed', () => rejectsOnce(identity, identity.cert, (_request, response) => {
        response.writeHead(200); response.write('x'.repeat(16385));
    }));
    await t.test('connection reset after HTTP headers is not retried', () => rejectsOnce(identity, identity.cert, (_request, response) => {
        response.writeHead(200, { 'Content-Length': 1000 }); response.write('{');
        setTimeout(() => response.destroy(), 25);
    }));
    await t.test('invalid port creates no connection', async () => {
        await assert.rejects(probeWeb(8189, identity.cert), error => error.reason === 'input' && error.port === undefined);
    });

    await t.test('never-listening endpoint exhausts one five-second budget and leaves no retries', async () => {
        await freePort(8188);
        const start = performance.now();
        await assert.rejects(probeWeb(8188, identity.cert), error => error.code === 'ONBOARD_HTTPS_NOT_READY' && error.reason === 'deadline');
        const elapsed = performance.now() - start;
        assert.ok(elapsed >= 4750 && elapsed < 6000, `bounded deadline, measured ${elapsed} ms`);
        const f = fixture(identity, uiResponse); await listen(f.server, 8188);
        try { await delay(300); assert.equal(f.connections(), 0, 'no retry may survive the deadline'); }
        finally { await f.close(); }
    });
    await t.test('a delayed listener that never responds shares the original deadline and closes', async () => {
        const f = fixture(identity, () => {});
        const opening = delay(900).then(() => listen(f.server, 8188));
        const start = performance.now();
        try {
            await assert.rejects(probeWeb(8188, identity.cert), error => error.reason === 'deadline');
            const elapsed = performance.now() - start;
            assert.ok(elapsed >= 4750 && elapsed < 5500, `listener wait and response share one budget, measured ${elapsed} ms`);
            await delay(100); assert.equal(f.connections(), 1); assert.equal(f.sockets.size, 0);
        } finally { await opening; await f.close(); }
    });
});
