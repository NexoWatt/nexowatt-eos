'use strict';
// Real Express/body-parser transport; the exact compiled route is evaluated so
// parser failures cannot accidentally fall through to Express journal logging.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const { randomBytes } = require('node:crypto');
const { createRequire } = require('node:module');
const dependencyRequire = process.env.EOS_PARSER_TEST_DEPENDENCIES
    ? createRequire(path.resolve(process.env.EOS_PARSER_TEST_DEPENDENCIES, 'package.json')) : require;
const express = dependencyRequire('express');
const bodyParser = dependencyRequire('body-parser');
const { isEosSameOriginRequest } = require('../build/lib/eosRequestSecurity');
const web = fs.readFileSync(path.join(__dirname, '../build/lib/web.js'), 'utf8');
const start = web.indexOf('const invitationGuard =');
const end = web.indexOf("this.server.app.get('/nexowatt/account/accept'", start);
assert.ok(start > 0 && end > start);
const route = web.slice(start, end);

async function fixture(t) {
    const app = express(); const fallback = []; let accepted = 0;
    const context = { server: { app }, isEosSameOriginWrite: req => isEosSameOriginRequest(req.headers, 'https:'),
        eosInvitations: { async accept() { accepted++; return { success: true }; } } };
    vm.runInNewContext(`(function () { ${route} }).call(context)`, { context, bodyParser });
    // A default error renderer/logger would run here without the scoped handler.
    app.use((error, _req, res, _next) => { fallback.push(error); res.status(500).json({ error: 'fallbackReached' }); });
    const server = http.createServer(app); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const port = server.address().port;
    const post = (body, headers = {}) => new Promise((resolve, reject) => {
        const req = http.request({ host: '127.0.0.1', port, path: '/nexowatt/account/accept', method: 'POST', headers: {
            host: `eos.local:${port}`, origin: `https://eos.local:${port}`, 'content-type': 'application/json',
            'content-length': Buffer.byteLength(body), 'x-nexowatt-eos-invitation': '1', ...headers,
        } }, res => {
            let text = ''; res.setEncoding('utf8'); res.on('data', chunk => { text += chunk; });
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text }));
        });
        req.on('error', reject); req.end(body);
    });
    return { post, fallback, accepted: () => accepted };
}
test('malformed JSON containing a password stays generic and never reaches default error logging', async t => {
    const x = await fixture(t); const secret = randomBytes(32).toString('hex');
    const result = await x.post(`{"password":"${secret}", BROKEN`);
    assert.equal(result.status, 400); assert.equal(result.headers['cache-control'], 'no-store');
    assert.deepEqual(JSON.parse(result.text), { error: 'invitationUnavailable' });
    assert.equal(result.text.includes(secret), false); assert.equal(x.fallback.length, 0); assert.equal(x.accepted(), 0);
});
test('oversized and unsupported-charset password bodies terminate in the same scoped error handler', async t => {
    const x = await fixture(t);
    for (const [body, headers] of [[JSON.stringify({ password: 'x'.repeat(5000) }), {}], ['{"password":"synthetic"}', { 'content-type': 'application/json; charset=iso-8859-1' }]]) {
        const result = await x.post(body, headers);
        assert.equal(result.status, 400); assert.deepEqual(JSON.parse(result.text), { error: 'invitationUnavailable' });
    }
    assert.equal(x.fallback.length, 0); assert.equal(x.accepted(), 0);
});
test('foreign Origin and Host fail before parsing a malformed password body', async t => {
    const x = await fixture(t);
    for (const headers of [{ origin: 'https://foreign.example' }, { host: 'foreign.example' }, { 'x-nexowatt-eos-invitation': '0' }]) {
        const result = await x.post('{"password":"synthetic",BROKEN', headers);
        assert.equal(result.status, 403); assert.deepEqual(JSON.parse(result.text), { error: 'invalidRequestOrigin' });
    }
    assert.equal(x.fallback.length, 0); assert.equal(x.accepted(), 0);
});
test('valid JSON still reaches invitation policy exactly once', async t => {
    const x = await fixture(t); const result = await x.post('{}');
    assert.equal(result.status, 200); assert.deepEqual(JSON.parse(result.text), { success: true });
    assert.equal(x.accepted(), 1); assert.equal(x.fallback.length, 0);
});
