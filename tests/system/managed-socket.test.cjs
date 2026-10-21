'use strict';
// Real local Unix socket framing/permissions; injected dispatcher, no service,
// package installation, download, systemd or host mutation.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { once } = require('node:events');
const { serve } = require('../../runtime/updates/service.cjs');
function exchange(socketPath, bytes) {
    return new Promise((resolve, reject) => {
        const client = net.createConnection(socketPath); let data = '';
        client.once('connect', () => client.end(bytes));
        client.on('data', part => { data += part; });
        client.once('close', () => resolve(data)); client.once('error', reject);
    });
}
test('actual UDS is root-owned, group-restricted, finite and framed before dispatch', { skip: process.getuid?.() !== 0 ? 'requires root-owned fixture boundary' : false }, async () => {
    const directory = fs.mkdtempSync('/root/eos-managed-socket-'), socketPath = path.join(directory, 'control.sock'), calls = [];
    let server;
    try {
        server = serve({ dispatch(request) { calls.push(request); return { ok: true, phase: 'IDLE' }; } }, { socketPath, gid: process.getgid() });
        await once(server, 'listening'); const stat = fs.statSync(socketPath);
        assert.equal(stat.uid, 0); assert.equal(stat.mode & 0o777, 0o660);
        assert.deepEqual(JSON.parse(await exchange(socketPath, '{"operation":"status"}\n')), { ok: true, phase: 'IDLE' });
        for (const bytes of ['{}', '{}\n{}\n', 'not-json\n']) assert.equal(JSON.parse(await exchange(socketPath, bytes)).ok, false);
        assert.equal(await exchange(socketPath, 'x'.repeat(1025)), '');
        assert.deepEqual(calls, [{ operation: 'status' }]);
    } finally {
        if (server) await new Promise(resolve => server.close(resolve));
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
