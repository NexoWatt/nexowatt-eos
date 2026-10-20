'use strict';

// Executes actual registered network handlers with injected authorization,
// parser and host boundary. This is an isolated route contract, not a real
// Express/TLS/Pi/firewall or central-session integration result.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { registerNetworkRoutes } = require('../build/lib/eosNetworkHttp');

const BASE = '/nexowatt/network';
const MAC = '02:00:00:00:00:02';
const IP = '192.168.50.20';
const ID = 'a'.repeat(32);
const CONFIG = { interface: 'enx020000000002', mac: MAC, address: '192.168.50.1', prefixLength: 24,
    dhcpStart: '192.168.50.20', dhcpEnd: '192.168.50.200', dnsServers: ['1.1.1.1'], reservations: [], listeners: [] };
const REQUESTS = [
    ['GET', 'status', undefined],
    ['POST', 'preview', { config: CONFIG }],
    ['POST', 'apply', { config: CONFIG }],
    ['POST', 'confirm', { transactionId: ID }],
    ['POST', 'reservation', { mac: MAC, ip: IP, reserved: true }],
    ['POST', 'grant', { mac: MAC, ip: IP, durationSeconds: 600 }],
    ['POST', 'revoke', { mac: MAC, ip: IP }],
];

function harness(options = {}) {
    const routes = new Map();
    const errors = [];
    const order = [];
    const calls = [];
    const app = {
        get(url, ...handlers) { routes.set(`GET ${url}`, handlers); },
        post(url, ...handlers) { routes.set(`POST ${url}`, handlers); },
        use(url, handler) { errors.push({ url, handler }); },
    };
    registerNetworkRoutes(app, {
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
        requestNetwork: async (...args) => {
            calls.push(args);
            if (options.requestNetwork) return options.requestNetwork(...args);
            return { ok: true, configured: false, interfaces: [], leases: [], grants: [], pending: null };
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
            'content-type': 'application/json', 'x-nexowatt-eos-network': '1',
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
    return { dispatch, routes, calls, order };
}

function denied(response, status = 403) {
    assert.equal(response.status, status);
    assert.equal(typeof response.body?.error, 'string');
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.ok(!JSON.stringify(response).includes('PRIVATE_FIXTURE'));
}

test('all network routes require authenticated installer/service before parsing or host calls', async () => {
    for (const access of [null, false, {}, { role: 'admin' }, { userId: 'system.user.customer', role: 'enduser' },
        { userId: 'system.user.customer', role: 'unknown' }]) {
        const h = harness();
        for (const [method, operation, body] of REQUESTS) {
            denied(await h.dispatch(method, operation, { access, body, parserError: Error('PRIVATE_FIXTURE') }));
        }
        assert.ok(!h.order.includes('parse'));
        assert.deepEqual(h.calls, []);
    }
});

test('existing installer and service identities can inspect network status without cached authority', async () => {
    for (const role of ['installer', 'admin']) {
        const h = harness();
        const response = await h.dispatch('GET', 'status', { access: { userId: 'system.user.technician', role } });
        assert.equal(response.status, 200);
        assert.equal(response.body.configured, false);
        assert.equal(h.calls.length, 1);
        assert.equal(h.calls[0][0], 'status');
        denied(await h.dispatch('GET', 'status', { access: null }));
        assert.equal(h.calls.length, 1, 'revoked identity cannot reuse earlier route authorization');
    }
});

test('cross-origin, missing Origin/header and cross-site writes are denied before JSON parsing', async () => {
    for (const headers of [
        { origin: 'https://evil.test' }, { origin: undefined }, { origin: 'null' },
        { origin: 'http://eos.test:8081' }, { origin: 'https://eos.test:8188' },
        { 'x-nexowatt-eos-network': undefined }, { 'x-nexowatt-eos-network': 'true' },
        { 'sec-fetch-site': 'cross-site' }, { 'sec-fetch-site': 'same-site' },
        { host: 'evil.test', 'x-forwarded-host': 'eos.test:8081' },
    ]) {
        const h = harness();
        denied(await h.dispatch('POST', 'grant', { headers, body: { mac: MAC, ip: IP, durationSeconds: 60 } }));
        assert.ok(!h.order.includes('parse'));
        assert.deepEqual(h.calls, []);
    }
});

test('plaintext management is denied even with forged forwarding metadata or loopback address', async () => {
    for (const address of ['192.0.2.40', '127.0.0.1']) {
        const h = harness({ secure: false });
        denied(await h.dispatch('GET', 'status', { socket: { remoteAddress: address }, headers: { 'x-forwarded-proto': 'https' } }));
        assert.deepEqual(h.calls, []);
    }
});

test('accepted reservation, confirmation, grant and revoke retain their bounded structured payloads', async () => {
    for (const [method, operation, body] of REQUESTS.filter(row => row[1] !== 'status')) {
        const h = harness();
        const response = await h.dispatch(method, operation, { body });
        assert.equal(response.status, 200, operation);
        assert.ok(h.order.indexOf('authorize') < h.order.indexOf('parse'));
        assert.equal(h.calls.length, 1);
        assert.deepEqual(h.calls[0].slice(0, 2), [operation, body]);
    }
});

test('malformed envelope and unexpected fields cannot choose socket, shell, operation or root path', async () => {
    for (const operation of ['preview', 'apply', 'confirm', 'reservation', 'grant', 'revoke']) {
        const valid = REQUESTS.find(row => row[1] === operation)[2];
        for (const body of [undefined, null, [], 'PRIVATE_FIXTURE', 0, false,
            { ...valid, operation: 'exec' }, { ...valid, path: '/etc/shadow' },
            { ...valid, command: 'PRIVATE_FIXTURE' }, { ...valid, socket: '/run/other.sock' },
            { ...valid, __proto__: { injected: true } }]) {
            const h = harness();
            denied(await h.dispatch('POST', operation, { body }), 400);
            assert.deepEqual(h.calls, []);
        }
    }
});

test('reservation needs a real Boolean, MAC and IPv4 address without type coercion', async () => {
    for (const body of [
        { mac: MAC, ip: IP }, { mac: MAC, ip: IP, reserved: 'true' }, { mac: MAC, ip: IP, reserved: 1 },
        { mac: 12, ip: IP, reserved: true }, { mac: 'not-a-mac', ip: IP, reserved: true },
        { mac: MAC, ip: '192.168.50.999', reserved: true }, { mac: MAC, ip: '::1', reserved: true },
        { mac: MAC, ip: ['192.168.50.20'], reserved: true },
    ]) {
        const h = harness();
        denied(await h.dispatch('POST', 'reservation', { body }), 400);
        assert.deepEqual(h.calls, []);
    }
    const h = harness();
    assert.equal((await h.dispatch('POST', 'reservation', { body: { mac: MAC, ip: IP, reserved: false } })).status, 200);
});

test('internet grants enforce whole seconds from one minute through one hour', async () => {
    for (const durationSeconds of [-1, 0, 59, 3601, 600.5, '600', null, true, NaN, Infinity]) {
        const h = harness();
        denied(await h.dispatch('POST', 'grant', { body: { mac: MAC, ip: IP, durationSeconds } }), 400);
        assert.deepEqual(h.calls, []);
    }
    for (const durationSeconds of [60, 3600]) {
        const h = harness();
        assert.equal((await h.dispatch('POST', 'grant', { body: { mac: MAC, ip: IP, durationSeconds } })).status, 200);
    }
});

test('invalid transaction and non-object configurations do not reach host helper', async () => {
    for (const transactionId of [undefined, null, 123, '', '../etc/passwd', 'a'.repeat(4096)]) {
        const h = harness();
        denied(await h.dispatch('POST', 'confirm', { body: { transactionId } }), 400);
        assert.deepEqual(h.calls, []);
    }
    for (const config of [undefined, null, [], 'text', 0, false]) {
        for (const operation of ['preview', 'apply']) {
            const h = harness();
            denied(await h.dispatch('POST', operation, { body: { config } }), 400);
            assert.deepEqual(h.calls, []);
        }
    }
});

test('parser errors return bounded generic responses without forwarding input or exception text', async () => {
    for (const [parserError, status] of [
        [Object.assign(Error('PRIVATE_FIXTURE'), { type: 'entity.too.large', body: 'PRIVATE_FIXTURE' }), 413],
        [Object.assign(Error('PRIVATE_FIXTURE'), { type: 'entity.parse.failed', body: 'PRIVATE_FIXTURE' }), 400],
    ]) {
        const h = harness();
        denied(await h.dispatch('POST', 'grant', { parserError }), status);
        assert.deepEqual(h.calls, []);
    }
});

test('authorization errors and host I/O exceptions are sanitized with no retry', async () => {
    const auth = harness({ authorize: async () => { throw Error('PRIVATE_FIXTURE_AUTH'); } });
    denied(await auth.dispatch('GET', 'status'), 503);
    assert.deepEqual(auth.calls, []);
    const host = harness({ requestNetwork: async () => { throw Error('PRIVATE_FIXTURE_HOST'); } });
    denied(await host.dispatch('GET', 'status'), 503);
    assert.equal(host.calls.length, 1);
});

test('network handlers and client ship the exact reviewed JavaScript sources', () => {
    for (const name of ['eosNetworkHttp.js', 'eosNetworkClient.js']) {
        assert.deepEqual(fs.readFileSync(path.join(__dirname, '../build/lib', name)),
            fs.readFileSync(path.join(__dirname, '../src/lib', name)), name);
    }
});

test('authority revoked during JSON parsing is rechecked before a host mutation', async () => {
    let reads = 0;
    const h = harness({ authorize: async () => ++reads === 1 ? { userId: 'system.user.technician', role: 'installer' } : null });
    denied(await h.dispatch('POST', 'grant', { body: { mac: MAC, ip: IP, durationSeconds: 60 } }));
    assert.deepEqual(h.order, ['authorize', 'parse', 'authorize']);
    assert.deepEqual(h.calls, []);
});

test('authenticated read and write limits share the user identity across source addresses', async () => {
    const reads = harness();
    for (let count = 0; count < 60; count++) {
        assert.equal((await reads.dispatch('GET', 'status', { socket: { remoteAddress: `192.0.2.${count + 1}` } })).status, 200);
    }
    denied(await reads.dispatch('GET', 'status'), 429);
    assert.equal(reads.calls.length, 60);
    const writes = harness();
    for (let count = 0; count < 30; count++) {
        assert.equal((await writes.dispatch('POST', 'revoke', { body: { mac: MAC, ip: IP } })).status, 200);
    }
    denied(await writes.dispatch('POST', 'revoke', { body: { mac: MAC, ip: IP } }), 429);
    assert.equal(writes.calls.length, 30);
    assert.equal(writes.order.filter(entry => entry === 'parse').length, 30);
});

test('configuration envelope bounds lists, rejects unrecognized options and prevents silent coercion', async () => {
    for (const patch of [
        { interface: '../eth0' }, { interface: 'x'.repeat(16) }, { prefixLength: '24' }, { prefixLength: 0 },
        { dnsServers: ['1.1.1.1', '8.8.8.8', '9.9.9.9', '1.0.0.1'] }, { dnsServers: ['https://evil.test'] },
        { reservations: Array(254).fill({ mac: MAC, ip: IP }) }, { reservations: [{ mac: MAC, ip: IP, permanent: true }] },
        { listeners: [{ protocol: 'icmp', port: 12 }] }, { listeners: [{ protocol: 'tcp', port: '8081' }] },
        { listeners: [{ protocol: 'tcp', port: 65536 }] }, { listeners: Array(6).fill({ protocol: 'tcp', port: 1883 }) },
        { shell: 'PRIVATE_FIXTURE' },
    ]) {
        const h = harness();
        denied(await h.dispatch('POST', 'apply', { body: { config: { ...CONFIG, ...patch } } }), 400);
        assert.deepEqual(h.calls, []);
    }
});

test('API reservation capacity agrees with the /24 host policy at 201 and 253 entries', async () => {
    for (const length of [201, 253]) {
        const reservations = Array.from({ length }, (_, index) => ({
            mac: `02:00:00:00:00:${(index + 2).toString(16).padStart(2, '0')}`,
            ip: `192.168.50.${index + 2}`,
        }));
        const h = harness();
        const body = { config: { ...CONFIG, reservations } };
        assert.ok(Buffer.byteLength(JSON.stringify(body)) < 16384, 'valid maximum fits dedicated JSON parser budget');
        assert.equal((await h.dispatch('POST', 'preview', { body })).status, 200);
        assert.equal(h.calls[0][1].config.reservations.length, length);
    }
});

test('device listener allowlist cannot expose management, database, SSH or arbitrary host ports', async () => {
    for (const [protocol, port] of [['tcp', 22], ['tcp', 53], ['tcp', 8081], ['tcp', 8188], ['tcp', 8443],
        ['tcp', 5432], ['tcp', 16379], ['tcp', 16380], ['tcp', 9999], ['udp', 1883], ['tcp', 5353]]) {
        const h = harness();
        denied(await h.dispatch('POST', 'apply', { body: { config: { ...CONFIG, listeners: [{ protocol, port }] } } }), 400);
        assert.equal(h.calls.length, 0);
    }
    for (const [protocol, port] of [['tcp', 1883], ['tcp', 8883], ['tcp', 4712], ['tcp', 9220], ['udp', 5353]]) {
        const h = harness();
        assert.equal((await h.dispatch('POST', 'preview', { body: { config: { ...CONFIG, listeners: [{ protocol, port }] } } })).status, 200);
    }
});

function loadWebPrototype() {
    const exported = {};
    const filename = path.join(__dirname, '../build/lib/web.js');
    vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
        exports: exported, module: { exports: exported }, __dirname: path.dirname(filename), __filename: filename,
        require: name => name.startsWith('node:') ? require(name)
            : name === './eosApplianceProfile' ? require('../build/lib/eosApplianceProfile')
                : name === './eosSessionSecurity' ? require('../build/lib/eosSessionSecurity') : {},
        Buffer, URL, console, process: { env: {} },
        setTimeout() { throw Error('Unexpected server/timer startup in route fixture'); },
        setInterval() { throw Error('Unexpected server/timer startup in route fixture'); },
        clearTimeout() {}, clearInterval() {},
    }, { filename, timeout: 5000 });
    assert.equal(typeof exported.default, 'function');
    return exported.default.prototype;
}

async function liveSessionFixture(t) {
    const { EosSessionSecurity } = require('../build/lib/eosSessionSecurity');
    const web = Object.create(loadWebPrototype());
    const sessions = new Map();
    const userId = 'system.user.technician';
    const token = 'network-actual-stamped-session-token';
    const users = { [userId]: { _id: userId, type: 'user', common: { enabled: true, password: 'test-only-existing-hash' },
        native: { nexowattEosAccount: { passwordInitialized: true, forcePasswordChange: false } } } };
    const groups = [{ _id: 'system.group.installateur', type: 'group', common: { name: 'Installateur', members: [userId] }, native: {} }];
    const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
    web.settings = { auth: true, secure: true };
    web.adapter = {
        config: web.settings, namespace: 'eos-admin.0', log: { debug() {}, info() {}, warn() {}, error() {} },
        getSession(id, cb) { cb(clone(sessions.get(id))); },
        setSession(id, _ttl, value, cb) { sessions.set(id, clone(value)); cb?.(null); },
        async getForeignObjectAsync(id) { return clone(users[id]); },
        async getObjectViewAsync() { return { rows: groups.map(group => ({ id: group._id, value: clone(group) })) }; },
    };
    const security = new EosSessionSecurity(web.adapter);
    web.adapter.eosSessionSecurity = security;
    t.after(() => security.stop());
    const issue = async () => {
        const proof = await security.snapshot(userId);
        await security.context.run(proof, () => web.adapter.setSession(`a:${token}`, 60,
            { user: 'technician', aExp: Date.now() + 60000 }));
    };
    await issue();
    const request = () => ({ headers: { authorization: `Bearer ${token}` }, query: {}, user: 'technician' });
    assert.equal(typeof web.getEosNetworkAccess, 'function', 'actual shipped current-session boundary exists');
    return { web, sessions, users, userId, groups, security, token, issue, request };
}

test('network access ignores cached upstream user and URL tokens, requiring a live stamped header/cookie session', async t => {
    const x = await liveSessionFixture(t);
    for (const request of [
        { headers: {}, query: {}, user: 'technician' },
        { headers: {}, query: { token: x.token }, user: 'technician' },
        { headers: { authorization: 'Bearer unknown-network-session' }, query: { token: x.token }, user: 'technician' },
    ]) assert.equal(await x.web.getEosNetworkAccess(request), null);
    const access = await x.web.getEosNetworkAccess(x.request());
    assert.equal(access.userId, x.userId);
    assert.equal(access.role, 'installer');
    const cookie = await x.web.getEosNetworkAccess({ headers: { cookie: `access_token=${x.token}` }, query: {}, user: 'technician' });
    assert.equal(cookie.userId, x.userId);
});

test('expired, missing, unbound and revoked access tokens cannot use cached upstream identity', async t => {
    const x = await liveSessionFixture(t);
    const session = x.sessions.get(`a:${x.token}`);
    x.sessions.set(`a:${x.token}`, { ...session, aExp: Date.now() - 1 });
    assert.equal(await x.web.getEosNetworkAccess(x.request()), null);
    x.sessions.delete(`a:${x.token}`);
    assert.equal(await x.web.getEosNetworkAccess(x.request()), null);
    x.sessions.set(`a:${x.token}`, { user: 'technician', aExp: Date.now() + 60000 });
    assert.equal(await x.web.getEosNetworkAccess(x.request()), null);
    await x.issue();
    assert.equal((await x.web.getEosNetworkAccess(x.request())).userId, x.userId);
    x.security.revoke();
    assert.equal(await x.web.getEosNetworkAccess(x.request()), null);
});

test('current password, account and role changes invalidate network access without a delivered object event', async t => {
    for (const change of [
        x => { x.users[x.userId].common.password = 'new-test-only-hash'; },
        x => { x.users[x.userId].common.enabled = false; },
        x => { x.groups[0].common.members = []; },
        x => { x.users[x.userId].native.nexowattEosAccount.forcePasswordChange = true; },
    ]) {
        const x = await liveSessionFixture(t);
        change(x);
        assert.equal(await x.web.getEosNetworkAccess(x.request()), null);
    }
});

test('freshly stamped installer session still requires completion of the mandatory password flow', async t => {
    const x = await liveSessionFixture(t);
    x.users[x.userId].native.nexowattEosAccount.forcePasswordChange = true;
    await x.issue();
    assert.equal(await x.web.getEosNetworkAccess(x.request()), null);
});

test('actual session/role/password revocation while parser runs prevents the root-helper call', async t => {
    for (const change of [
        x => x.security.revoke(),
        x => { x.users[x.userId].common.password = 'new-test-only-hash'; },
        x => { x.groups[0].common.members = []; },
    ]) {
        const x = await liveSessionFixture(t);
        const h = harness({ authorize: req => x.web.getEosNetworkAccess(req), afterParse: () => change(x) });
        const response = await h.dispatch('POST', 'grant', {
            user: 'technician', headers: { authorization: `Bearer ${x.token}` },
            body: { mac: MAC, ip: IP, durationSeconds: 600 },
        });
        denied(response);
        assert.deepEqual(h.order, ['authorize', 'parse', 'authorize']);
        assert.equal(h.calls.length, 0);
    }
});

function clientHarness() {
    const sockets = [];
    const timers = [];
    class FakeSocket extends EventEmitter {
        end(bytes) { this.request = bytes; }
        destroy() { this.destroyed = true; this.emit('close'); }
    }
    const module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../build/lib/eosNetworkClient.js'), 'utf8'), {
        module, exports: module.exports, Buffer,
        require(name) {
            assert.equal(name, 'node:net', 'client must not acquire shell or filesystem tooling');
            return { createConnection(options) {
                const socket = new FakeSocket();
                socket.options = options;
                sockets.push(socket);
                return socket;
            } };
        },
        setTimeout(callback, delay) { const timer = { callback, delay, cleared: false }; timers.push(timer); return timer; },
        clearTimeout(timer) { timer.cleared = true; },
    }, { filename: 'eosNetworkClient.js', timeout: 1000 });
    const respond = (socket, text) => {
        socket.emit('connect');
        socket.emit('data', Buffer.from(text));
        socket.emit('end');
    };
    return { client: module.exports, sockets, timers, respond };
}

test('host client uses fixed Unix socket and one bounded newline JSON request', async () => {
    const h = clientHarness();
    const result = h.client.requestNetwork('grant', { mac: MAC, ip: IP, durationSeconds: 600 });
    assert.equal(h.sockets.length, 1);
    assert.equal(h.sockets[0].options.path, '/run/nexowatt-eos-network/control.sock');
    h.respond(h.sockets[0], '{"ok":true,"grants":[]}\n');
    assert.equal((await result).ok, true);
    assert.deepEqual(JSON.parse(h.sockets[0].request.toString()), { operation: 'grant', mac: MAC, ip: IP, durationSeconds: 600 });
    assert.equal(h.sockets[0].request.toString().endsWith('\n'), true);
    assert.equal(h.timers.length, 1);
    assert.equal(h.timers[0].delay, 5000);
    assert.equal(h.timers[0].cleared, true);
    assert.equal(h.sockets[0].destroyed, true);
});

test('host client rejects unknown operations, operation overrides, cyclic and oversized requests', async () => {
    const h = clientHarness();
    const cyclic = {}; cyclic.self = cyclic;
    for (const [operation, payload] of [['exec', {}], ['grant', null], ['grant', []], ['status', { operation: 'exec' }],
        ['status', cyclic], ['status', { text: 'x'.repeat(65536) }]]) {
        await assert.rejects(h.client.requestNetwork(operation, payload), { code: 'NETWORK_REQUEST' });
    }
    assert.equal(h.sockets.length, 0);
});

test('host client rejects oversized, malformed and multi-response payloads without leaking bytes', async () => {
    for (const text of ['x'.repeat(65537), '{"ok":true}', '{"ok":true}\n{"ok":true}\n', '[]\n', 'null\n',
        '{"ok":"true"}\n', '{"PRIVATE_FIXTURE"\n', '{"ok":false,"error":"PRIVATE_FIXTURE"}\n']) {
        const h = clientHarness();
        const result = h.client.requestNetwork('status');
        h.respond(h.sockets[0], text);
        await assert.rejects(result, error => {
            assert.ok(['NETWORK_RESPONSE', 'NETWORK_REJECTED'].includes(error.code));
            assert.ok(!error.message.includes('PRIVATE_FIXTURE'));
            return true;
        });
        assert.equal(h.sockets[0].destroyed, true);
        assert.equal(h.timers[0].cleared, true);
    }
});

test('host client permits only public helper error codes and never forwards detail fields', async () => {
    const h = clientHarness();
    const result = h.client.requestNetwork('status');
    h.respond(h.sockets[0], '{"ok":false,"error":"NETWORK_INTERFACE","detail":"PRIVATE_FIXTURE"}\n');
    await assert.rejects(result, error => {
        assert.equal(error.code, 'NETWORK_INTERFACE');
        assert.equal(error.message, 'NETWORK_INTERFACE');
        assert.equal(error.detail, undefined);
        return true;
    });
});

test('partial host response never extends absolute deadline and timeout destroys the socket', async () => {
    const h = clientHarness();
    const result = h.client.requestNetwork('status');
    const socket = h.sockets[0];
    socket.emit('connect');
    for (const byte of '{"ok":true') socket.emit('data', Buffer.from(byte));
    assert.equal(h.timers.length, 1, 'a data drip does not arm additional timers');
    h.timers[0].callback();
    await assert.rejects(result, { code: 'NETWORK_TIMEOUT' });
    assert.equal(socket.destroyed, true);
    socket.emit('data', Buffer.from('}\n'));
    socket.emit('end');
});

test('host client caps concurrent operations and releases slots after deterministic completion', async () => {
    const h = clientHarness();
    const jobs = Array.from({ length: 4 }, () => h.client.requestNetwork('status'));
    await assert.rejects(h.client.requestNetwork('status'), { code: 'NETWORK_BUSY' });
    assert.equal(h.sockets.length, 4);
    for (const socket of h.sockets) h.respond(socket, '{"ok":true}\n');
    assert.equal((await Promise.all(jobs)).length, 4);
    const next = h.client.requestNetwork('status');
    h.respond(h.sockets[4], '{"ok":true}\n');
    assert.equal((await next).ok, true);
});

test('early peer close and connect errors fail closed without exception text or leaked timer', async () => {
    for (const event of ['close', 'error']) {
        const h = clientHarness();
        const result = h.client.requestNetwork('status');
        h.sockets[0].emit(event, Error('PRIVATE_FIXTURE'));
        await assert.rejects(result, error => {
            assert.equal(error.code, 'NETWORK_UNAVAILABLE');
            assert.ok(!error.message.includes('PRIVATE_FIXTURE'));
            return true;
        });
        assert.equal(h.timers[0].cleared, true);
        assert.equal(h.sockets[0].destroyed, true);
    }
});
