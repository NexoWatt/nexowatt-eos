'use strict';

// Local, synthetic fixtures only. No adapter/controller or physical control starts.
// Run from the repository root with node --test and an outer process timeout.
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { once } = require('node:events');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const root = path.resolve(__dirname, '../../../..');
const req = name => createRequire(path.join(root, 'components', name, 'package.json'));
const pkg = (request, name) => request(`${name}/package.json`).version;
async function listen(server) {
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    return server.address().port;
}
function close(server) {
    server.closeAllConnections();
    return new Promise(resolve => server.close(resolve));
}

test('UI and backup HTTP consumers resolve the reviewed proxy-addr patch', () => {
    for (const component of ['ui', 'backitup']) {
        const expressReq = createRequire(req(component).resolve('express'));
        assert.equal(pkg(expressReq, 'proxy-addr'), '2.0.8');
        const proxy = expressReq('proxy-addr');
        const trust = proxy.compile(['127.0.0.1/32']);
        assert.equal(trust('127.0.0.1'), true);
        assert.equal(trust('::ffff:127.0.0.1'), true);
        assert.equal(trust('192.0.2.1'), false);
    }
});

test('Devices axios strips synthetic sensitive headers on a redirect to another hostname', { timeout: 5000 }, async () => {
    const axiosReq = createRequire(req('devices').resolve('axios'));
    assert.equal(pkg(axiosReq, 'follow-redirects'), '1.16.1');
    const axios = req('devices')('axios');
    const destination = http.createServer((request, response) => {
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify(request.headers));
    });
    const targetPort = await listen(destination);
    const source = http.createServer((_request, response) => {
        response.writeHead(302, { location: `http://localhost:${targetPort}/final` });
        response.end();
    });
    try {
        const port = await listen(source);
        const response = await axios.get(`http://127.0.0.1:${port}/start`, {
            headers: { Authorization: 'Bearer synthetic-fixture', Cookie: 'fixture=synthetic' },
            timeout: 1000, proxy: false, maxRedirects: 1,
            lookup: (_host, options, callback) => options.all
                ? callback(null, [{ address: '127.0.0.1', family: 4 }])
                : callback(null, '127.0.0.1', 4),
        });
        assert.equal(response.data.authorization, undefined);
        assert.equal(response.data.cookie, undefined);
    } finally {
        await close(source);
        await close(destination);
    }
});

test('Backup legacy request still serializes queries and multipart fields with patched dependencies', { timeout: 5000 }, async () => {
    const requestReq = createRequire(req('backitup').resolve('request'));
    assert.equal(pkg(requestReq, 'qs'), '6.16.1');
    assert.equal(pkg(requestReq, 'form-data'), '2.5.6');
    const request = req('backitup')('request');
    const server = http.createServer((incoming, outgoing) => {
        let body = '';
        incoming.on('data', chunk => { body += chunk; });
        incoming.on('end', () => outgoing.end(JSON.stringify({ url: incoming.url, body })));
    });
    try {
        const port = await listen(server);
        const response = await new Promise((resolve, reject) => request({
            uri: `http://127.0.0.1:${port}/fixture`, method: 'POST',
            qs: { filter: { name: 'synthetic' } }, formData: { field: 'payload' },
            timeout: 1000, followRedirect: false,
        }, (error, _response, body) => error ? reject(error) : resolve(JSON.parse(body))));
        assert.equal(response.url, '/fixture?filter%5Bname%5D=synthetic');
        assert.match(response.body, /name="field"\r\n\r\npayload\r\n/);
    } finally { await close(server); }
});

test('Backup multer rejects oversized uploads and removes disk output', { timeout: 5000 }, async () => {
    const backup = req('backitup');
    assert.equal(pkg(backup, 'multer'), '2.4.0');
    assert.equal(pkg(backup, 'axios'), '1.20.0');
    const express = backup('express');
    const multer = backup('multer');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-upload-regression-'));
    const app = express();
    app.post('/fixture', multer({ dest: dir, limits: { fileSize: 8 } }).single('file'), (_request, response) => response.sendStatus(204));
    app.use((error, _request, response, _next) => response.status(413).json({ code: error.code }));
    const server = http.createServer(app);
    try {
        const port = await listen(server);
        const boundary = 'eos-synthetic-boundary';
        const body = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="fixture.txt"\r\nContent-Type: text/plain\r\n\r\n0123456789abcdef\r\n--${boundary}--\r\n`;
        const result = await backup('axios').post(`http://127.0.0.1:${port}/fixture`, body, {
            headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
            timeout: 1000, maxRedirects: 0, proxy: false, validateStatus: () => true,
        });
        assert.equal(result.status, 413);
        assert.equal(result.data.code, 'LIMIT_FILE_SIZE');
        assert.deepEqual(fs.readdirSync(dir), []);
    } finally { await close(server); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('Unmigrated OCPP validators retain protocol rejection and do not enable $data', { timeout: 5000 }, () => {
    const rpcFile = req('ocpp21').resolve('ocpp-rpc');
    const rpcReq = createRequire(rpcFile);
    assert.equal(pkg(rpcReq, 'ajv'), '8.14.0'); // Open finding, not a patched version.
    const validators = rpcReq('./lib/standard-validators');
    assert.equal(validators.length, 3);
    for (const validator of validators) {
        assert.notEqual(validator._ajv.opts.$data, true);
        const heartbeat = validator.subprotocol === 'ocpp2.1' ? 'urn:HeartbeatRequest' : 'urn:Heartbeat.req';
        assert.equal(validator.validate(heartbeat, {}), true);
        assert.throws(() => validator.validate(heartbeat, { unexpected: true }));
    }
    const { createValidator } = rpcReq('./lib/validator');
    assert.throws(() => createValidator('fixture', {
        $id: 'urn:Fixture.req', type: 'string', pattern: { $data: '1/pattern' },
    }));
});
