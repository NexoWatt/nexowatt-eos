'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const { gzipSync } = require('node:zlib');
const base = path.resolve(__dirname, '..', process.env.EOS_TEST_RUNTIME === 'build' ? 'build/lib' : 'src/lib');
function load(name, mocks = {}, globals = {}) {
    const module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(path.join(base, name), 'utf8'), {
        module, exports: module.exports, require: name => name in mocks ? mocks[name] : require(name),
        process, Buffer, URL, setTimeout, clearTimeout, ...globals,
    }, { filename: name });
    return module.exports;
}
function httpsFixture(reply) {
    let requestOptions, destroyed = false, calls = 0;
    const api = load('eosHttpsClient.js', { 'node:https': { request(url, options, callback) {
        calls++; requestOptions = options;
        const request = new EventEmitter();
        request.destroy = () => { destroyed = true; };
        request.end = () => { if (reply) queueMicrotask(() => reply(callback)); };
        return request;
    } } });
    return { api, get options() { return requestOptions; }, get calls() { return calls; }, get destroyed() { return destroyed; } };
}
function response(callback, headers = {}, status = 200) {
    const incoming = new PassThrough(); incoming.statusCode = status; incoming.headers = headers;
    callback(incoming); return incoming;
}
const opts = { allowedHosts: ['example.invalid'], maxBytes: 64, budgetMs: 100 };
test('HTTPS accepts bounded JSON with explicit TLS verification, identity encoding and no pooling', async () => {
    const fixture = httpsFixture(cb => response(cb).end('{"ok":true}'));
    const result = await fixture.api.requestHttpsJson('https://example.invalid/data', opts);
    assert.equal(result.ok, true);
    assert.equal(fixture.options.rejectUnauthorized, true);
    assert.equal(fixture.options.minVersion, 'TLSv1.2');
    assert.equal(fixture.options.agent, false);
    assert.equal(fixture.options.headers['Accept-Encoding'], 'identity');
});
test('HTTPS rejects scheme, credentials, fragments, alternate port and non-allowlisted host before transport', async () => {
    const fixture = httpsFixture();
    for (const url of ['http://example.invalid/x', 'https://secret:pass@example.invalid/x', 'https://example.invalid/#x', 'https://example.invalid:8443/x', 'https://elsewhere.invalid']) {
        await assert.rejects(fixture.api.requestHttpsJson(url, opts), /EOS_HTTPS_INVALID_OPTIONS/);
    }
    assert.equal(fixture.calls, 0);
});
test('HTTPS rejects redirects without contacting redirect targets', async () => {
    const fixture = httpsFixture(cb => response(cb, { location: 'https://elsewhere.invalid/secret' }, 302));
    await assert.rejects(fixture.api.requestHttpsJson('https://example.invalid', opts), /EOS_HTTPS_STATUS/);
    assert.equal(fixture.calls, 1); assert.equal(fixture.destroyed, true);
});
test('HTTPS rejects oversized declared and streamed responses and compressed bodies', async () => {
    for (const [headers, body, code] of [[{ 'content-length': '65' }, '', 'TOO_LARGE'], [{}, 'x'.repeat(65), 'TOO_LARGE'], [{ 'content-encoding': 'gzip' }, '', 'ENCODING']]) {
        const fixture = httpsFixture(cb => response(cb, headers).end(body));
        await assert.rejects(fixture.api.requestHttpsJson('https://example.invalid', opts), new RegExp(`EOS_HTTPS_${code}`));
        assert.equal(fixture.destroyed, true);
    }
});
test('HTTPS rejects malformed or primitive JSON without exposing body/error text', async () => {
    for (const body of ['secret-content-not-json', '"secret-content"']) {
        const fixture = httpsFixture(cb => response(cb).end(body));
        await assert.rejects(fixture.api.requestHttpsJson('https://example.invalid', opts), error => error.message === 'EOS_HTTPS_JSON');
    }
});
test('HTTPS hard deadline destroys a request before response including DNS/connect stalls', async () => {
    const fixture = httpsFixture();
    const start = performance.now();
    await assert.rejects(fixture.api.requestHttpsJson('https://example.invalid', { ...opts, budgetMs: 20 }), /EOS_HTTPS_DEADLINE/);
    assert.equal(fixture.destroyed, true); assert.ok(performance.now() - start < 300);
});
test('HTTPS hard deadline also bounds slow response bodies', async () => {
    let incoming;
    const fixture = httpsFixture(cb => { incoming = response(cb); incoming.write('{'); });
    await assert.rejects(fixture.api.requestHttpsJson('https://example.invalid', { ...opts, budgetMs: 20 }), /EOS_HTTPS_DEADLINE/);
    assert.equal(incoming.destroyed, true);
});
test('HTTP bind is literal loopback unless TLS enabled; nonloopback Host and peer are rejected', () => {
    const { safeWebBind, loopbackHttpGuard } = load('eosWebResources.js');
    assert.equal(safeWebBind({ bind: '0.0.0.0', secure: false }), '127.0.0.1');
    assert.equal(safeWebBind({ bind: 'localhost', secure: false }), '127.0.0.1');
    assert.equal(safeWebBind({ bind: '::1', secure: false }), '::1');
    assert.equal(safeWebBind({ bind: '0.0.0.0', secure: true }), '0.0.0.0');
    for (const [host, peer, site, expected] of [['127.0.0.1:8188','127.0.0.1','same-origin',true], ['localhost:8188','::1','none',true], ['[::1]:8188','::1','same-origin',true], ['attacker.invalid:8188','127.0.0.1','same-origin',false], ['localhost:8188','192.0.2.1','none',false], ['localhost:8188','127.0.0.1','cross-site',false]]) {
        let next = false; let code;
        const res = { status(value) { code=value; return this; }, json() {} };
        loopbackHttpGuard(false)({ headers: { host, 'sec-fetch-site': site }, socket: { remoteAddress: peer } }, res, () => { next=true; });
        assert.equal(next, expected); if (!expected) assert.equal(code, 403);
    }
});
test('gzip preview returns text but rejects bombs, oversized input, and invalid gzip', async () => {
    const { inflateLog } = load('eosWebResources.js');
    assert.equal(await inflateLog(gzipSync('safe log')), 'safe log');
    await assert.rejects(inflateLog(gzipSync(Buffer.alloc(5 * 1024 * 1024))), /EOS_LOG_LIMIT/);
    await assert.rejects(inflateLog(Buffer.alloc(1024 * 1024 + 1)), /EOS_LOG_LIMIT/);
    await assert.rejects(inflateLog(Buffer.from('invalid')), /EOS_LOG_INVALID/);
});
test('gzip preview concurrency is bounded independently of compressed size', async () => {
    const { inflateLog } = load('eosWebResources.js');
    const input = gzipSync(Buffer.alloc(3 * 1024 * 1024));
    const first = inflateLog(input); const second = inflateLog(input);
    await assert.rejects(inflateLog(input), /EOS_LOG_LIMIT/);
    await Promise.all([first, second]);
});
test('system-info calls coalesce and cache npm version; no shell is used', async () => {
    let calls = 0;
    const { readSystemInfo } = load('eosWebResources.js', { 'node:child_process': { execFile(binary, args, options, callback) {
        calls++; assert.equal(binary, 'npm'); assert.equal(options.shell, undefined); assert.equal(options.timeout, 1500); assert.equal(options.maxBuffer, 1024);
        queueMicrotask(() => callback(null, '11.9.0\n'));
    } } });
    const results = await Promise.all([readSystemInfo(), readSystemInfo(), readSystemInfo()]);
    assert.equal(calls, 1); assert.equal(results[0].npm, '11.9.0');
    results[0].npm = 'tampered'; assert.equal((await readSystemInfo()).npm, '11.9.0'); assert.equal(calls, 1);
});
function uploadRequest() {
    const req = new EventEmitter(); req.aborted = false; req.destroy = () => { req.aborted=true; req.emit('aborted'); };
    const res = new EventEmitter(); res.status = value => { res.code=value; return res; }; res.json = value => { res.body=value; res.writableEnded=true; res.writableFinished=true; res.emit('finish'); };
    return { req, res };
}
async function uploadFixture(mocks = {}, globals = {}) {
    const temporary = await fsp.mkdtemp(path.join(os.tmpdir(), 'eos-upload-test-'));
    const api = load('eosUploadGuard.js', { 'node:os': { tmpdir: () => temporary }, ...mocks }, globals);
    return { temporary, api, cleanup: () => fsp.rm(temporary, { recursive:true, force:true }) };
}
async function enter(api, pair, parser = options => (_req, _res, next) => next()) {
    await new Promise((resolve, reject) => {
        pair.res.once('finish', resolve);
        api.createUploadMiddleware(parser, { warn() {} })(pair.req, pair.res, error => error ? reject(error) : resolve());
    });
}
async function drained() { await new Promise(resolve => setTimeout(resolve, 30)); }
test('upload budget admits two across routes; third denied and aborted temporary files cleaned', async () => {
    const fixture = await uploadFixture();
    try {
        const pairs = [uploadRequest(), uploadRequest(), uploadRequest()];
        await enter(fixture.api, pairs[0]); await enter(fixture.api, pairs[1]);
        const one = fixture.api.getUploadDirectory(pairs[0].req);
        await fsp.writeFile(path.join(one, 'partial'), 'partial');
        await enter(fixture.api, pairs[2]); assert.equal(pairs[2].res.code, 503);
        pairs[0].req.destroy(); pairs[1].req.destroy(); await drained();
        assert.equal(fs.existsSync(one), false);
        const fourth = uploadRequest(); await enter(fixture.api, fourth);
        assert.ok(fixture.api.getUploadDirectory(fourth.req)); fourth.req.destroy(); await drained();
    } finally { await fixture.cleanup(); }
});
test('upload parser receives actual total/file/part limits and private temporary directory', async () => {
    const fixture = await uploadFixture(); const pair = uploadRequest();
    try {
        await enter(fixture.api, pair, options => {
            assert.equal(options.limits.fileSize, 200 * 1024 * 1024); assert.equal(options.limits.files, 1);
            assert.equal(options.limits.fields, 4); assert.equal(options.limits.parts, 5); assert.equal(options.uploadTimeout, 30000);
            assert.equal(fs.statSync(options.tempFileDir).mode & 0o777, 0o700);
            return (_req, _res, next) => next();
        });
        pair.req.destroy(); await drained();
    } finally { await fixture.cleanup(); }
});
test('restore storage does not follow existing destination symlink and persists restrictive permissions', async () => {
    const fixture = await uploadFixture(); const pair = uploadRequest();
    try {
        await enter(fixture.api, pair);
        const source = path.join(fixture.api.getUploadDirectory(pair.req), 'source');
        const outside = path.join(fixture.temporary, 'unrelated'); const target = path.join(fixture.temporary, 'restore.iob');
        await fsp.writeFile(source, 'restoredata'); await fsp.writeFile(outside, 'untouched'); await fsp.symlink(outside, target);
        await fixture.api.storeRestoreUpload(pair.req, source, target);
        assert.equal(await fsp.readFile(outside, 'utf8'), 'untouched'); assert.equal(await fsp.readFile(target, 'utf8'), 'restoredata');
        assert.equal((await fsp.stat(target)).mode & 0o777, 0o600);
        pair.req.destroy(); await drained();
    } finally { await fixture.cleanup(); }
});
test('retained upload data counts against shared quota at the next admission', async () => {
    const fixture = await uploadFixture(); const first = uploadRequest();
    try {
        await enter(fixture.api, first);
        const file = path.join(fixture.api.getUploadDirectory(first.req), 'sparse.tgz');
        const handle = await fsp.open(file, 'w'); await handle.truncate(201 * 1024 * 1024); await handle.close();
        fixture.api.retainUpload(first.req); first.res.json({ ok:true }); await drained();
        const next = uploadRequest(); await enter(fixture.api, next); assert.equal(next.res.code, 503);
    } finally { await fixture.cleanup(); }
});

test('upload total deadline aborts a still-active parser and removes its partial directory', async () => {
    const fixture = await uploadFixture({}, { setTimeout: (fn, ms) => setTimeout(fn, ms === 60000 ? 20 : ms) });
    const pair = uploadRequest(); let directory;
    try {
        await enter(fixture.api, pair, options => {
            directory = options.tempFileDir;
            fs.writeFileSync(path.join(directory, 'partial'), 'partial');
            return () => {}; // simulated parser waiting forever despite a connected client
        });
        assert.equal(pair.res.code, 408); assert.equal(pair.req.aborted, true);
        await drained(); assert.equal(fs.existsSync(directory), false);
    } finally { await fixture.cleanup(); }
});
test('upload admission rejects low disk space before constructing parser', async () => {
    const fixture = await uploadFixture({ 'node:fs/promises': { ...fsp, statfs: async () => ({ bavail:1, bsize:4096 }) } });
    const pair = uploadRequest(); let called = false;
    try {
        await enter(fixture.api, pair, () => { called=true; throw new Error('must not parse'); });
        assert.equal(pair.res.code, 503); assert.equal(called, false);
    } finally { await fixture.cleanup(); }
});
test('synchronous parser initialization failure releases reserved capacity', async () => {
    const fixture = await uploadFixture(); const pair = uploadRequest();
    try {
        await assert.rejects(enter(fixture.api, pair, () => { throw new Error('parser failure'); }), /parser failure/);
        await drained();
        const next = uploadRequest(); await enter(fixture.api, next); assert.ok(fixture.api.getUploadDirectory(next.req));
        next.req.destroy(); await drained();
    } finally { await fixture.cleanup(); }
});
