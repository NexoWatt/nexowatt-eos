'use strict';

// Route/middleware harness, not a live Express/network/session test. It executes
// the actual registered handlers; parser faults are explicit injected fixtures.
// Full Express integration, TLS and ioBroker session behavior remain target tests.
const test = require('node:test');
const assert = require('node:assert/strict');
const { registerLicenseRoutes, sameOrigin, isLocal } = require('../src/lib/eosLicenseHttp');

function harness(options = {}) {
    const routes = new Map();
    const errors = [];
    const order = [];
    const calls = [];
    const publicStatus = { v: 1, valid: true, edition: 'home', limits: { chargePoints: 3, batteries: 2 }, features: ['energy'], expiresAt: null };
    const app = {
        get(url, ...handlers) { routes.set(`GET ${url}`, handlers); },
        post(url, ...handlers) { routes.set(`POST ${url}`, handlers); },
        use(url, handler) { errors.push({ url, handler }); },
    };
    registerLicenseRoutes(app, {
        secure: options.secure ?? true,
        authorize: async req => {
            order.push('authorize');
            if (options.authorize) return options.authorize(req);
            return req.authorized === true;
        },
        jsonParser(req, _res, next) {
            order.push('parse');
            if (req.parserError) next(req.parserError);
            else next();
        },
        service: options.service || {
            async status() { calls.push(['status']); return publicStatus; },
            async activate(token) { calls.push(['activate', token]); return publicStatus; },
            async remove() { calls.push(['remove']); return { ...publicStatus, valid: false }; },
        },
        pagePath: '/test/license-page.html',
        scriptPath: '/test/license-app.js',
    });
    async function dispatch(method, url, overrides = {}) {
        const req = {
            authorized: true,
            headers: { host: 'eos.test:8081', origin: 'https://eos.test:8081', 'x-eos-license': '1', 'sec-fetch-site': 'same-origin' },
            socket: { remoteAddress: '192.0.2.40' },
            body: method === 'POST' ? {} : undefined,
            ...overrides,
        };
        req.headers = {
            host: 'eos.test:8081', origin: 'https://eos.test:8081', 'x-eos-license': '1', 'sec-fetch-site': 'same-origin',
            ...overrides.headers,
        };
        const handlers = routes.get(`${method} ${url}`);
        assert.ok(handlers, `route exists: ${method} ${url}`);
        const headers = {};
        return new Promise((resolve, reject) => {
            let index = 0;
            let finished = false;
            const res = {
                statusCode: 200,
                setHeader(name, value) { headers[name.toLowerCase()] = value; return res; },
                status(value) { res.statusCode = value; return res; },
                json(body) { complete({ body }); return res; },
                sendFile(file) { complete({ file }); return res; },
            };
            function complete(value) {
                assert.equal(finished, false, 'only one HTTP response');
                finished = true;
                resolve({ status: res.statusCode, headers, ...value });
            }
            function next(error) {
                try {
                    if (error) {
                        const entry = errors.find(item => url.startsWith(item.url));
                        if (!entry) return reject(error);
                        const result = entry.handler(error, req, res, reject);
                        if (result?.then) result.catch(reject);
                        return;
                    }
                    const handler = handlers[index++];
                    if (!handler) return reject(Error('handler chain ended without response'));
                    const result = handler(req, res, next);
                    if (result?.then) result.catch(reject);
                } catch (failure) { reject(failure); }
            }
            next();
        });
    }
    return { dispatch, calls, order };
}

function denied(response, code, status = 403) {
    assert.equal(response.status, status);
    assert.deepEqual(response.body, { error: code });
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(response.headers.pragma, 'no-cache');
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
}

test('license endpoints authorize before body parser, service calls and static files', async () => {
    const h = harness();
    for (const [method, url] of [
        ['GET', '/nexowatt/license'], ['GET', '/nexowatt/license/app.js'], ['GET', '/nexowatt/license/status'],
        ['POST', '/nexowatt/license/activate'], ['POST', '/nexowatt/license/remove'],
    ]) {
        denied(await h.dispatch(method, url, { authorized: false, parserError: Error('SECRET_BODY') }), 'LICENSE_ADMIN_REQUIRED');
    }
    assert.deepEqual(h.order, Array(5).fill('authorize'));
    assert.deepEqual(h.calls, []);
});

test('secure admin activation invokes parser after authorization and returns no submitted token', async () => {
    const h = harness();
    const response = await h.dispatch('POST', '/nexowatt/license/activate', { body: { token: '  NWL2.private-test-input.signature  ' } });
    assert.equal(response.status, 200);
    assert.deepEqual(h.order, ['authorize', 'parse']);
    assert.deepEqual(h.calls, [['activate', 'NWL2.private-test-input.signature']]);
    assert.equal(response.body.valid, true);
    assert.ok(!JSON.stringify(response).includes('private-test-input'));
    assert.equal(response.headers['cache-control'], 'no-store');
});

test('cross-origin, missing origin/header and cross-site writes fail before parser', async () => {
    for (const headers of [
        { origin: 'https://evil.test' }, { origin: undefined }, { origin: 'null' },
        { 'x-eos-license': undefined }, { 'x-eos-license': 'yes' },
        { 'sec-fetch-site': 'cross-site' }, { 'sec-fetch-site': 'same-site' },
    ]) {
        const h = harness();
        denied(await h.dispatch('POST', '/nexowatt/license/activate', { headers, body: { token: 'SECRET' } }), 'LICENSE_ORIGIN');
        assert.deepEqual(h.order, ['authorize']);
        assert.deepEqual(h.calls, []);
    }
});

test('forwarded host/proto headers do not establish origin or TLS trust', async () => {
    const h = harness();
    denied(await h.dispatch('POST', '/nexowatt/license/activate', {
        headers: { origin: 'https://evil.test', 'x-forwarded-host': 'evil.test', 'x-forwarded-proto': 'https' }, body: { token: 'SECRET' },
    }), 'LICENSE_ORIGIN');
    const plain = harness({ secure: false });
    denied(await plain.dispatch('POST', '/nexowatt/license/activate', {
        headers: { origin: 'http://eos.test:8081', 'x-forwarded-for': '127.0.0.1', 'x-forwarded-proto': 'https' }, body: { token: 'SECRET' },
    }), 'LICENSE_HTTPS_REQUIRED');
    assert.deepEqual(plain.order, ['authorize']);
    assert.deepEqual(plain.calls, []);
});

test('plaintext LAN is denied for every route; explicit socket loopback can perform setup', async () => {
    const plain = harness({ secure: false });
    for (const url of ['/nexowatt/license', '/nexowatt/license/app.js', '/nexowatt/license/status']) {
        denied(await plain.dispatch('GET', url), 'LICENSE_HTTPS_REQUIRED');
    }
    const allowed = await plain.dispatch('POST', '/nexowatt/license/activate', {
        socket: { remoteAddress: '127.0.0.1' }, headers: { origin: 'http://eos.test:8081' }, body: { token: 'NWL2.test.test' },
    });
    assert.equal(allowed.status, 200);
    for (const address of ['127.0.0.1', '::1', '::ffff:127.0.0.1']) assert.equal(isLocal(address), true);
    for (const address of ['192.168.1.1', '127.0.0.1.evil.test', undefined, '']) assert.equal(isLocal(address), false);
});

test('malformed activation/removal bodies are rejected without reaching service', async () => {
    for (const body of [undefined, null, [], 'text', {}, { token: 123 }, { token: null }, { token: 'x', extra: true }, { token: 'x'.repeat(16385) }]) {
        const h = harness();
        denied(await h.dispatch('POST', '/nexowatt/license/activate', { body }), 'LICENSE_FORMAT', 400);
        assert.deepEqual(h.calls, []);
    }
    for (const body of [undefined, null, [], 'text', { token: 'x' }, { confirm: true }]) {
        const h = harness();
        denied(await h.dispatch('POST', '/nexowatt/license/remove', { body }), 'LICENSE_FORMAT', 400);
        assert.deepEqual(h.calls, []);
    }
    const h = harness();
    assert.equal((await h.dispatch('POST', '/nexowatt/license/remove', { body: {} })).status, 200);
    assert.deepEqual(h.calls, [['remove']]);
});

test('parser size/syntax errors are sanitized and cannot reach activation', async () => {
    for (const [error, expected] of [
        [Object.assign(Error('SECRET_OVERSIZED_BODY'), { type: 'entity.too.large', body: 'SECRET' }), 413],
        [Object.assign(Error('SECRET_INVALID_JSON'), { type: 'entity.parse.failed', body: 'SECRET' }), 400],
    ]) {
        const h = harness();
        const response = await h.dispatch('POST', '/nexowatt/license/activate', { parserError: error });
        denied(response, 'LICENSE_REQUEST', expected);
        assert.ok(!JSON.stringify(response).includes('SECRET'));
        assert.deepEqual(h.calls, []);
    }
});

test('authorization and asynchronous service failures return sanitized bounded errors', async () => {
    const auth = harness({ authorize: async () => { throw Error('SECRET_SESSION'); } });
    denied(await auth.dispatch('GET', '/nexowatt/license/status'), 'SERVICE_UNAVAILABLE', 503);
    const unknown = harness({ service: { status: async () => { throw Error('SECRET_STORAGE'); } } });
    denied(await unknown.dispatch('GET', '/nexowatt/license/status'), 'SERVICE_UNAVAILABLE', 400);
    const known = harness({ service: { activate: async () => { throw Object.assign(Error('SECRET_TOKEN'), { code: 'LICENSE_SIGNATURE_INVALID' }); } } });
    denied(await known.dispatch('POST', '/nexowatt/license/activate', { body: { token: 'NWL2.test.test' } }), 'LICENSE_SIGNATURE_INVALID', 400);
});

test('per-address write and read rate budgets deny excess operations', async () => {
    const write = harness();
    for (let count = 0; count < 10; count++) assert.equal((await write.dispatch('POST', '/nexowatt/license/remove')).status, 200);
    denied(await write.dispatch('POST', '/nexowatt/license/remove'), 'LICENSE_RATE_LIMIT', 429);
    assert.equal(write.calls.length, 10);
    assert.equal(write.order.filter(item => item === 'parse').length, 10);
    const read = harness();
    for (let count = 0; count < 60; count++) assert.equal((await read.dispatch('GET', '/nexowatt/license/status')).status, 200);
    denied(await read.dispatch('GET', '/nexowatt/license/status'), 'LICENSE_RATE_LIMIT', 429);
    assert.equal(read.calls.length, 60);
});

test('license page has restrictive CSP and safe no-cache headers', async () => {
    const h = harness();
    const response = await h.dispatch('GET', '/nexowatt/license');
    assert.equal(response.file, '/test/license-page.html');
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.match(response.headers['content-security-policy'], /default-src 'none'/);
    assert.match(response.headers['content-security-policy'], /script-src 'self'/);
    assert.match(response.headers['content-security-policy'], /frame-ancestors 'self'/);
    const script = await h.dispatch('GET', '/nexowatt/license/app.js');
    assert.equal(script.file, '/test/license-app.js');
    assert.equal(script.headers['x-content-type-options'], 'nosniff');
});

test('origin matching uses scheme, hostname and port exactly', () => {
    const req = { headers: { host: 'eos.test:8081', origin: 'https://eos.test:8081', 'x-eos-license': '1' } };
    assert.equal(sameOrigin(req, true), true);
    for (const origin of ['http://eos.test:8081', 'https://eos.test:8082', 'https://evil.test:8081', 'https://eos.test.evil.test:8081']) {
        assert.equal(sameOrigin({ headers: { ...req.headers, origin } }, true), false);
    }
});
