'use strict';

// Executes actual registered updates handlers with injected authorization,
// parser and host boundary. This is an isolated route contract, not a real
// Express/TLS/Pi/firewall or central-session integration result.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { registerUpdateRoutes } = require('../build/lib/eosUpdateHttp');

const BASE = '/nexowatt/managed-updates';
const ID = 'a'.repeat(64);
const BODY = { releaseId: ID, maintenanceConfirmed: true };
const REQUESTS = [['GET', 'status', undefined], ['POST', 'check', {}], ['POST', 'install', BODY]];

function harness(options = {}) {
    const routes = new Map();
    const errors = [];
    const order = [];
    const calls = [];
    const osReads = [];
    const app = {
        get(url, ...handlers) { routes.set(`GET ${url}`, handlers); },
        post(url, ...handlers) { routes.set(`POST ${url}`, handlers); },
        use(url, handler) { errors.push({ url, handler }); },
    };
    registerUpdateRoutes(app, {
        secure: options.secure ?? true,
        authorize: async req => {
            order.push('authorize');
            if (options.authorize) return options.authorize(req);
            return req.access;
        },
        jsonParser(req, _res, next) {
            order.push('parse');
            if (req.parserError) next(req.parserError);
            else {
                options.afterParse?.(req);
                next();
            }
        },
        getOsUpdateStatus: async () => {
            osReads.push(true);
            if (options.getOsUpdateStatus) return options.getOsUpdateStatus();
            return { schemaVersion: 1, availability: 'unavailable', health: 'warning', summary: null };
        },
        requestUpdate: async (...args) => {
            calls.push(args);
            if (options.requestUpdate) return options.requestUpdate(...args);
            return { ok: true, phase: 'AVAILABLE', candidate: null, busy: false };
        },
    });
    async function dispatch(method, operation, overrides = {}) {
        const url = `${BASE}/${operation}`;
        const req = {
            method, path: url, url, originalUrl: url,
            access: { userId: 'system.user.technician', role: 'installer' },
            socket: { remoteAddress: '192.0.2.40' },
            body: method === 'POST' ? {} : undefined,
            ...overrides,
        };
        req.headers = {
            host: 'eos.test:8081', origin: 'https://eos.test:8081',
            'content-type': 'application/json', 'x-nexowatt-eos-updates': '1',
            'sec-fetch-site': 'same-origin', ...overrides.headers,
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
                json(body) {
                    assert.equal(finished, false, 'one HTTP response only');
                    finished = true;
                    resolve({ status: res.statusCode, headers, body });
                    return res;
                },
            };
            function next(error) {
                try {
                    if (error) {
                        const entry = errors.find(item => typeof item.url === 'string' && url.startsWith(item.url));
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
    return { dispatch, routes, calls, order, osReads };
}

function denied(response, status = 403) {
    assert.equal(response.status, status);
    assert.equal(typeof response.body?.error, 'string');
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.ok(!JSON.stringify(response).includes('PRIVATE_FIXTURE'));
}


test('all update routes require current installer/service authority before parsing', async () => {
    for (const access of [null, false, {}, { role: 'admin' }, { userId: 'user', role: 'enduser' }]) {
        const h = harness();
        for (const [method, operation, body] of REQUESTS) denied(await h.dispatch(method, operation, { access, body }));
        assert.deepEqual(h.calls, []); assert.deepEqual(h.osReads, []); assert.ok(!h.order.includes('parse'));
    }
});
test('same-origin custom header and HTTPS cannot be bypassed with forwarding headers', async () => {
    for (const headers of [{ origin: undefined }, { origin: 'https://evil.test' }, { 'sec-fetch-site': 'cross-site' },
        { 'x-nexowatt-eos-updates': undefined }, { origin: 'http://eos.test:8081' }]) {
        const h = harness(); denied(await h.dispatch('POST', 'install', { headers, body: BODY })); assert.deepEqual(h.calls, []);
    }
    const h = harness({ secure: false }); denied(await h.dispatch('POST', 'install', { body: BODY, headers: { 'x-forwarded-proto': 'https' } }));
});
test('revoked session between authorization and JSON parsing cannot start update', async () => {
    const h = harness({ afterParse: req => { req.access = null; } });
    denied(await h.dispatch('POST', 'install', { body: BODY })); assert.deepEqual(h.calls, []); assert.deepEqual(h.osReads, []);
});
test('only fixed operations, release identity and maintenance confirmation reach host', async () => {
    const h = harness();
    for (const body of [{}, { ...BODY, maintenanceConfirmed: false }, { ...BODY, url: 'https://evil.test' }, { ...BODY, releaseId: '../x' }])
        denied(await h.dispatch('POST', 'install', { body }), 400);
    for (const [method, operation, body] of REQUESTS) assert.equal((await h.dispatch(method, operation, { body })).status, 200);
    assert.deepEqual(h.calls, [['status', {}], ['check', {}], ['install', BODY]]);
});
test('source/build route and client stay identical; current web binds protected update prefix', () => {
    for (const file of ['eosUpdateHttp.js', 'eosUpdateClient.js', 'eosOsUpdateStatus.js']) assert.equal(fs.readFileSync(path.join(__dirname, '../src/lib', file), 'utf8'), fs.readFileSync(path.join(__dirname, '../build/lib', file), 'utf8'));
    for (const file of ['../src/lib/web.ts', '../build/lib/web.js']) {
        const text = fs.readFileSync(path.join(__dirname, file), 'utf8'); assert.match(text, /license\|network\|updates\|managed-updates/); assert.match(text, /registerUpdateRoutes/);
    }
});

test('OS maintenance status is independent of EOS success and available when its host socket restarts', async () => {
    const os = { schemaVersion: 1, availability: 'stale', health: 'warning', summary: { state: 'attention' } };
    const good = harness({ getOsUpdateStatus: async () => os });
    const result = await good.dispatch('GET', 'status');
    assert.deepEqual(result.body.osUpdates, os); assert.equal(result.body.ok, true);
    const offline = harness({ getOsUpdateStatus: async () => os, requestUpdate: async () => { throw Object.assign(Error('PRIVATE_FIXTURE'), { code: 'UPDATE_UNAVAILABLE' }); } });
    const failure = await offline.dispatch('GET', 'status');
    assert.equal(failure.status, 503); assert.deepEqual(failure.body.osUpdates, os); assert.equal(failure.body.error, 'UPDATE_UNAVAILABLE');
    assert.doesNotMatch(JSON.stringify(failure), /PRIVATE_FIXTURE/);
});
test('OS read failure cannot block signed EOS updates or leak filesystem details', async () => {
    const h = harness({ getOsUpdateStatus: async () => { throw Error('PRIVATE_FIXTURE'); } });
    const result = await h.dispatch('POST', 'install', { body: BODY });
    assert.equal(result.status, 200); assert.equal(result.body.osUpdates.availability, 'unavailable');
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE_FIXTURE/);
});
test('authorization failures after guard do not read the OS status', async () => {
    let checks = 0;
    const h = harness({ authorize: async () => { if (++checks === 1) return { userId: 'tech', role: 'installer' }; throw Error('PRIVATE_FIXTURE'); } });
    const result = await h.dispatch('GET', 'status');
    assert.equal(result.status, 503); assert.deepEqual(h.osReads, []); assert.deepEqual(h.calls, []);
});
test('shared Linux/EOS maintenance contention returns a retryable conflict', async () => {
    const h = harness({ requestUpdate: async () => { throw Object.assign(Error(), { code: 'UPDATE_MAINTENANCE_BUSY' }); } });
    const result = await h.dispatch('POST', 'install', { body: BODY });
    assert.equal(result.status, 429); assert.equal(result.body.error, 'UPDATE_MAINTENANCE_BUSY');
});
