'use strict';

// Behavioral service tests: real verifier and encrypted filesystem store with a
// fake ioBroker object API. No live ioBroker bus, web server or device is tested.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { EosLicenseService, LEASE_MS } = require('../src/lib/eosLicenseService');

const UUID = '12345678-1234-4234-8234-123456789abc';
const OTHER_UUID = '87654321-1234-4234-8234-123456789abc';
const BASE_TIME = Date.UTC(2026, 8, 30, 12);
const SENDER = 'system.adapter.nexowatt-ui.0';
const deferred = () => {
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    return { promise, resolve };
};

async function fixture(t, options = {}) {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'eos-license-service-'));
    const pair = crypto.generateKeyPairSync('ed25519');
    const publicKeys = { test_issuer: pair.publicKey.export({ type: 'spki', format: 'pem' }).toString() };
    const clock = { wall: BASE_TIME, mono: 1000 };
    const objects = new Map([
        ['system.meta.uuid', { native: { uuid: UUID } }],
        [SENDER, { type: 'instance', common: { name: 'nexowatt-ui', enabled: true } }],
        ['system.adapter.nexowatt-devices.0', { type: 'instance', common: { name: 'nexowatt-devices', enabled: true } }],
    ]);
    const logs = [];
    const adapter = {
        getAbsoluteInstanceDataDir: () => directory,
        getForeignObjectAsync: async id => structuredClone(objects.get(id)),
        log: { info: message => logs.push(message), warn: message => logs.push(message), error: message => logs.push(message) },
    };
    const serviceOptions = { directory, publicKeys, now: () => clock.wall, monotonic: () => clock.mono, ...options };
    const services = [];
    const createService = () => {
        const service = new EosLicenseService(adapter, serviceOptions);
        services.push(service);
        return service;
    };
    const service = createService();
    const token = (overrides = {}) => {
        const edition = overrides.edition || 'home';
        const payload = {
            v: 2, kid: 'test_issuer', licenseId: 'test-license', uuid: UUID, edition,
            issuedAt: BASE_TIME - 1000, notBefore: BASE_TIME - 1000,
            expiresAt: null, adapters: ['nexowatt-ui'],
            limits: edition === 'pro' ? { chargePoints: 8, batteries: 10 } : { chargePoints: 3, batteries: 2 },
            ...overrides,
        };
        const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
        const signed = `NWL2.${body}`;
        return `${signed}.${crypto.sign(null, Buffer.from(signed), pair.privateKey).toString('base64url')}`;
    };
    const request = (overrides = {}) => ({ v: 1, nonce: crypto.randomBytes(16).toString('hex'), adapter: 'nexowatt-ui', feature: 'energy', ...overrides });
    const systemToken = (overrides = {}) => {
        const payload = { v: 3, kid: 'test_issuer', licenseId: 'system-license', uuid: UUID, edition: 'home',
            issuedAt: BASE_TIME - 1000, notBefore: BASE_TIME - 1000, expiresAt: null, scope: 'system', ...overrides };
        const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
        const signed = `NWL3.${body}`;
        return `${signed}.${crypto.sign(null, Buffer.from(signed), pair.privateKey).toString('base64url')}`;
    };
    const advance = milliseconds => { clock.wall += milliseconds; clock.mono += milliseconds; };
    t.after(async () => {
        for (const item of services) item.stop();
        await fs.rm(directory, { recursive: true, force: true });
    });
    return { directory, publicKeys, clock, objects, adapter, logs, service, createService, token, systemToken, request, advance };
}

test('NWL3 system grant uses edition policy and enabled sender checks without an adapter claim list', async t => {
    const f = await fixture(t); await f.service.start();
    const second = 'system.adapter.nexowatt-devices.0';
    await f.service.activate(f.systemToken());
    const request = () => f.request({ adapter: 'nexowatt-devices', required: { chargePoints: 3, batteries: 2 } });
    assert.equal((await f.service.check(second, request())).valid, true);
    denied(await f.service.check(second, { ...request(), feature: 'billing' }), 'LICENSE_FEATURE');
    denied(await f.service.check(second, { ...request(), required: { chargePoints: 4 } }), 'LICENSE_LIMIT');
    f.objects.get(second).common.enabled = false;
    denied(await f.service.check(second, request()), 'LICENSE_ADAPTER_DISABLED');
    f.objects.get(second).common.enabled = true;
    await f.service.activate(f.systemToken({ edition: 'pro' }));
    const pro = await f.service.check(second, { ...request(), feature: 'billing', required: { chargePoints: 50, batteries: 10 } });
    assert.equal(pro.valid, true); assert.deepEqual(pro.limits, { chargePoints: 50, batteries: 10 });
    denied(await f.service.check(second, { ...request(), required: { chargePoints: 51 } }), 'LICENSE_LIMIT');
    denied(await f.service.check('system.adapter.unknown.0', f.request({ adapter: 'unknown' })), 'LICENSE_ADAPTER_DISABLED');
});

test('replacement by old NWL2 restores its narrower list and quotas after a system license', async t => {
    const f = await fixture(t); await f.service.start();
    await f.service.activate(f.systemToken({ edition: 'pro' }));
    assert.equal((await f.service.check('system.adapter.nexowatt-devices.0', f.request({ adapter: 'nexowatt-devices' }))).valid, true);
    await f.service.activate(f.token({ edition: 'pro', limits: { chargePoints: 1, batteries: 0 } }));
    denied(await f.service.check('system.adapter.nexowatt-devices.0', f.request({ adapter: 'nexowatt-devices' })), 'LICENSE_ADAPTER');
    denied(await f.service.check(SENDER, f.request({ required: { chargePoints: 2 } })), 'LICENSE_LIMIT');
    assert.equal((await f.service.check(SENDER, f.request({ required: { chargePoints: 1 } }))).valid, true);
});

test('NWL3 activation survives service restart and rejects forged upgrades without replacing stored rights', async t => {
    const f = await fixture(t); await f.service.start();
    const raw = f.systemToken(); await f.service.activate(raw);
    f.service.stop(); const restarted = f.createService();
    assert.equal((await restarted.start()).edition, 'home');
    const before = await fs.readFile(path.join(f.directory, 'license.enc'));
    const [prefix, body, signature] = raw.split('.');
    const payload = JSON.parse(Buffer.from(body, 'base64url')); payload.edition = 'pro';
    await assert.rejects(restarted.activate(`${prefix}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${signature}`), { code: 'LICENSE_SIGNATURE_INVALID' });
    await assert.rejects(restarted.activate(f.systemToken({ uuid: OTHER_UUID })), { code: 'LICENSE_UUID_MISMATCH' });
    assert.deepEqual(await fs.readFile(path.join(f.directory, 'license.enc')), before);
    assert.equal((await restarted.status()).edition, 'home');
    assert.ok(!JSON.stringify(f.logs).includes(raw));
});

function denied(response, code) {
    assert.equal(response.valid, false);
    if (code) assert.equal(response.code, code);
    assert.equal(response.edition, null);
    assert.deepEqual(response.features, []);
    assert.deepEqual(response.limits, {});
    assert.ok(response.validUntil <= response.checkedAt);
}

test('startup without provisioned trust denies and creates no license', async t => {
    const f = await fixture(t, { publicKeys: undefined });
    const previous = process.env.NEXOWATT_LICENSE_TRUST_FILE;
    process.env.NEXOWATT_LICENSE_TRUST_FILE = path.join(f.directory, 'missing-trust.json');
    try {
        const status = await f.service.start();
        assert.equal(status.valid, false);
        denied(await f.service.check(SENDER, f.request()));
        await assert.rejects(f.service.activate(f.token()));
        await assert.rejects(fs.access(path.join(f.directory, 'license.enc')));
    } finally {
        if (previous === undefined) delete process.env.NEXOWATT_LICENSE_TRUST_FILE;
        else process.env.NEXOWATT_LICENSE_TRUST_FILE = previous;
    }
});

test('startup with empty trust configuration denies', async t => {
    const f = await fixture(t, { publicKeys: {} });
    const status = await f.service.start();
    assert.equal(status.valid, false);
    assert.equal(status.code, 'TRUST_INVALID');
    denied(await f.service.check(SENDER, f.request()));
});

test('trusted service without stored license denies', async t => {
    const f = await fixture(t);
    const status = await f.service.start();
    assert.equal(status.valid, false);
    assert.equal(status.code, 'LICENSE_MISSING');
    denied(await f.service.check(SENDER, f.request()), 'LICENSE_MISSING');
});

test('Home allows licensed adapter and published Home limits with bounded lease', async t => {
    const f = await fixture(t);
    await f.service.start();
    const raw = f.token();
    const status = await f.service.activate(raw);
    assert.equal(status.valid, true);
    assert.equal(status.edition, 'home');
    const request = f.request({ required: { chargePoints: 3, batteries: 2 } });
    const response = await f.service.check(SENDER, request);
    assert.equal(response.valid, true);
    assert.equal(response.nonce, request.nonce);
    assert.equal(response.edition, 'home');
    assert.equal(response.validUntil - response.checkedAt, LEASE_MS);
    assert.ok(response.features.includes('microgridSlave'));
    assert.ok(!response.features.includes('microgridMaster'));
    const outward = JSON.stringify({ status, response, logs: f.logs });
    assert.ok(!outward.includes(raw));
    assert.ok(!outward.includes('test-license'));
    assert.ok(!outward.includes('PRIVATE KEY'));
    assert.ok(!(await fs.readFile(path.join(f.directory, 'license.enc'), 'utf8')).includes(raw));
});

test('Home rejects Pro feature and over-limit resource counts', async t => {
    const f = await fixture(t);
    await f.service.start();
    await f.service.activate(f.token());
    for (const feature of ['microgridMaster', 'multisite', 'billing']) {
        denied(await f.service.check(SENDER, f.request({ feature })), 'LICENSE_FEATURE');
    }
    for (const required of [{ chargePoints: 4 }, { batteries: 3 }]) {
        denied(await f.service.check(SENDER, f.request({ required })), 'LICENSE_LIMIT');
    }
});

test('Pro grants its feature set only to listed adapter and within signed limits', async t => {
    const f = await fixture(t);
    await f.service.start();
    await f.service.activate(f.token({ edition: 'pro' }));
    for (const feature of ['energy', 'microgridMaster', 'multisite', 'billing']) {
        const response = await f.service.check(SENDER, f.request({ feature, required: { chargePoints: 8, batteries: 10 } }));
        assert.equal(response.valid, true);
        assert.equal(response.edition, 'pro');
    }
    denied(await f.service.check(SENDER, f.request({ required: { chargePoints: 9 } })), 'LICENSE_LIMIT');
    denied(await f.service.check('system.adapter.nexowatt-devices.0', f.request({ adapter: 'nexowatt-devices' })), 'LICENSE_ADAPTER');
});

test('licensed second adapter receives grants only when enabled', async t => {
    const f = await fixture(t);
    await f.service.start();
    await f.service.activate(f.token({ adapters: ['nexowatt-ui', 'nexowatt-devices'] }));
    const sender = 'system.adapter.nexowatt-devices.0';
    const request = () => f.request({ adapter: 'nexowatt-devices' });
    assert.equal((await f.service.check(sender, request())).valid, true);
    f.objects.get(sender).common.enabled = false;
    denied(await f.service.check(sender, request()), 'LICENSE_ADAPTER_DISABLED');
});

test('missing, disabled, renamed or non-instance senders cannot obtain grants', async t => {
    const f = await fixture(t);
    await f.service.start();
    await f.service.activate(f.token());
    for (const object of [undefined, { type: 'instance', common: { enabled: false, name: 'nexowatt-ui' } },
        { type: 'instance', common: { enabled: true, name: 'different' } },
        { type: 'state', common: { enabled: true, name: 'nexowatt-ui' } }]) {
        f.objects.set(SENDER, object);
        denied(await f.service.check(SENDER, f.request()), 'LICENSE_ADAPTER_DISABLED');
    }
});

test('sender mismatch, unknown feature, extra keys and invalid quota types reject', async t => {
    const f = await fixture(t);
    await f.service.start();
    await f.service.activate(f.token());
    for (const overrides of [{ adapter: 'nexowatt-devices' }, { feature: 'unknown' }, { v: 2 },
        { nonce: 'bad' }, { token: 'not-permitted' }, { required: { chargePoints: '3' } },
        { required: { batteries: -1 } }, { required: { chargePoints: 1.5 } }, { required: { batteries: 1001 } },
        { required: { anything: 1 } }, { required: [] }]) {
        denied(await f.service.check(SENDER, f.request(overrides)), 'LICENSE_REQUEST');
    }
    for (const sender of ['', 'nexowatt-ui.0', 'system.adapter.nexowatt-ui.01', 'system.adapter.nexowatt-ui.100000']) {
        denied(await f.service.check(sender, f.request()), 'LICENSE_REQUEST');
    }
});

test('malformed or untrusted import preserves existing encrypted license', async t => {
    const f = await fixture(t);
    await f.service.start();
    await f.service.activate(f.token());
    const before = await fs.readFile(path.join(f.directory, 'license.enc'));
    await assert.rejects(f.service.activate('malformed'), { code: 'LICENSE_FORMAT_INVALID' });
    await assert.rejects(f.service.activate(f.token({ uuid: OTHER_UUID })), { code: 'LICENSE_UUID_MISMATCH' });
    assert.deepEqual(await fs.readFile(path.join(f.directory, 'license.enc')), before);
    assert.equal((await f.service.check(SENDER, f.request())).valid, true);
});

test('explicit license removal denies checks and remains removed after restart', async t => {
    const f = await fixture(t);
    await f.service.start();
    await f.service.activate(f.token());
    assert.equal((await f.service.remove()).valid, false);
    denied(await f.service.check(SENDER, f.request()), 'LICENSE_MISSING');
    f.service.stop();
    const restarted = f.createService();
    assert.equal((await restarted.start()).valid, false);
    denied(await restarted.check(SENDER, f.request()), 'LICENSE_MISSING');
});

test('external license deletion invalidates previously cached grant eligibility', async t => {
    const f = await fixture(t);
    await f.service.start();
    await f.service.activate(f.token());
    await fs.unlink(path.join(f.directory, 'license.enc'));
    denied(await f.service.check(SENDER, f.request()), 'LICENSE_MISSING');
});

test('tampered authenticated ciphertext invalidates cached license', async t => {
    const f = await fixture(t);
    await f.service.start();
    await f.service.activate(f.token());
    const filename = path.join(f.directory, 'license.enc');
    const envelope = JSON.parse(await fs.readFile(filename, 'utf8'));
    const ciphertext = Buffer.from(envelope.ciphertext, 'base64url');
    ciphertext[0] ^= 1;
    envelope.ciphertext = ciphertext.toString('base64url');
    await fs.writeFile(filename, JSON.stringify(envelope), { mode: 0o600 });
    denied(await f.service.check(SENDER, f.request()), 'STORAGE_AUTH_FAILED');
});

test('encrypted license and edition persist over clean service restart', async t => {
    const f = await fixture(t);
    await f.service.start();
    await f.service.activate(f.token({ edition: 'pro' }));
    f.service.stop();
    f.advance(1000);
    const restarted = f.createService();
    const status = await restarted.start();
    assert.equal(status.valid, true);
    assert.equal(status.edition, 'pro');
    assert.equal((await restarted.check(SENDER, f.request({ feature: 'billing' }))).valid, true);
});

test('changed system UUID denies while running', async t => {
    const f = await fixture(t);
    await f.service.start();
    await f.service.activate(f.token());
    f.objects.get('system.meta.uuid').native.uuid = OTHER_UUID;
    denied(await f.service.check(SENDER, f.request()), 'LICENSE_UUID_CHANGED');
});

test('lease is capped at expiry and license expires at exact boundary', async t => {
    const f = await fixture(t);
    await f.service.start();
    await f.service.activate(f.token({ expiresAt: BASE_TIME + 5000 }));
    const response = await f.service.check(SENDER, f.request());
    assert.equal(response.validUntil, BASE_TIME + 5000);
    f.advance(5000);
    denied(await f.service.check(SENDER, f.request()), 'LICENSE_EXPIRED');
});

test('expiry is rechecked after delayed adapter object lookup', async t => {
    const f = await fixture(t);
    await f.service.start();
    await f.service.activate(f.token({ expiresAt: BASE_TIME + 5000 }));
    const originalRead = f.adapter.getForeignObjectAsync;
    f.adapter.getForeignObjectAsync = async id => {
        const result = await originalRead(id);
        if (id === SENDER) f.advance(5000);
        return result;
    };
    denied(await f.service.check(SENDER, f.request()), 'LICENSE_EXPIRED');
});

test('wall clock rollback relative to monotonic time fails closed until restart', async t => {
    const f = await fixture(t);
    await f.service.start();
    await f.service.activate(f.token());
    f.clock.mono += 5000;
    f.clock.wall -= 1;
    denied(await f.service.check(SENDER, f.request()), 'LICENSE_CLOCK_ROLLBACK');
    f.clock.wall += 100000;
    denied(await f.service.check(SENDER, f.request()), 'LICENSE_CLOCK_ROLLBACK');
});

test('frequent sub-tolerance checks cannot keep a frozen wall clock licensed', async t => {
    const f = await fixture(t);
    await f.service.start();
    await f.service.activate(f.token({ expiresAt: BASE_TIME + 5000 }));
    for (let elapsed = 1000; elapsed <= 3000; elapsed += 1000) {
        f.clock.mono += 1000; // Wall clock remains fixed; each individual gap is < tolerance.
        const response = await f.service.check(SENDER, f.request());
        if (elapsed <= 2000) assert.equal(response.valid, true);
        else denied(response, 'LICENSE_CLOCK_ROLLBACK');
    }
    f.clock.wall += 10000;
    denied(await f.service.check(SENDER, f.request()), 'LICENSE_CLOCK_ROLLBACK');
});

test('small cumulative backward steps cannot reset the monotonic clock anchor', async t => {
    const f = await fixture(t);
    await f.service.start();
    await f.service.activate(f.token());
    f.advance(1000);
    assert.equal((await f.service.check(SENDER, f.request())).valid, true);
    for (let step = 1; step <= 3; step++) {
        f.clock.mono += 1000;
        f.clock.wall += 100; // Nine hundred milliseconds lost per short check.
        const response = await f.service.check(SENDER, f.request());
        if (step < 3) assert.equal(response.valid, true);
        else denied(response, 'LICENSE_CLOCK_ROLLBACK');
    }
});

test('persisted high-water mark detects ordinary rollback across restart', async t => {
    const f = await fixture(t);
    await f.service.start();
    await f.service.activate(f.token());
    f.advance(61000);
    assert.equal((await f.service.status()).valid, true);
    f.service.stop();
    f.clock.wall = BASE_TIME;
    f.clock.mono = 1000;
    const restarted = f.createService();
    const status = await restarted.start();
    assert.equal(status.valid, false);
    assert.equal(status.code, 'LICENSE_CLOCK_ROLLBACK');
});

test('sender rate cap denies excess requests and renews after window', async t => {
    const f = await fixture(t);
    await f.service.start();
    await f.service.activate(f.token());
    for (let i = 0; i < 30; i++) assert.equal((await f.service.check(SENDER, f.request())).valid, true);
    denied(await f.service.check(SENDER, f.request()), 'LICENSE_RATE_LIMIT');
    f.advance(60000);
    assert.equal((await f.service.check(SENDER, f.request())).valid, true);
});

test('queue cap rejects excess work without preventing earlier jobs completing', async t => {
    const f = await fixture(t);
    await f.service.start();
    const gate = deferred();
    const first = f.service.run(() => gate.promise);
    const jobs = Array.from({ length: 31 }, () => f.service.run(() => true));
    await assert.rejects(f.service.run(() => true), { code: 'SERVICE_UNAVAILABLE' });
    gate.resolve();
    await first;
    assert.deepEqual(await Promise.all(jobs), Array(31).fill(true));
    assert.equal(f.service.pending, 0);
});

test('new checks and mutations after stop are denied', async t => {
    const f = await fixture(t);
    await f.service.start();
    await f.service.activate(f.token());
    f.service.stop();
    denied(await f.service.check(SENDER, f.request()), 'SERVICE_UNAVAILABLE');
    await assert.rejects(f.service.activate(f.token()), { code: 'SERVICE_UNAVAILABLE' });
    await assert.rejects(f.service.status(), { code: 'SERVICE_UNAVAILABLE' });
    assert.equal(f.service.statusView().valid, false);
});

test('check queued before stop cannot grant or restore cached validity after stop', async t => {
    const f = await fixture(t);
    await f.service.start();
    await f.service.activate(f.token());
    const gate = deferred();
    const blocking = f.service.run(() => gate.promise).catch(error => error);
    const pending = f.service.check(SENDER, f.request());
    f.service.stop();
    gate.resolve();
    assert.equal((await blocking).code, 'SERVICE_UNAVAILABLE');
    denied(await pending, 'SERVICE_UNAVAILABLE');
    assert.equal(f.service.statusView().valid, false);
});

test('check already in adapter lookup cannot grant after stop', async t => {
    const f = await fixture(t);
    await f.service.start();
    await f.service.activate(f.token());
    const entered = deferred();
    const release = deferred();
    const originalRead = f.adapter.getForeignObjectAsync;
    f.adapter.getForeignObjectAsync = async id => {
        if (id === SENDER) { entered.resolve(); await release.promise; }
        return originalRead(id);
    };
    const pending = f.service.check(SENDER, f.request());
    await entered.promise;
    f.service.stop();
    release.resolve();
    denied(await pending, 'SERVICE_UNAVAILABLE');
    assert.equal(f.service.statusView().valid, false);
});


test('database timeout clears validity, bounds outstanding reads and ignores late results', async t => {
    const f = await fixture(t, { databaseTimeoutMs: 20 });
    await f.service.start();
    await f.service.activate(f.token());
    const gate = deferred();
    const originalRead = f.adapter.getForeignObjectAsync;
    let calls = 0;
    f.adapter.getForeignObjectAsync = async id => {
        calls++;
        await gate.promise;
        return originalRead(id);
    };
    denied(await f.service.check(SENDER, f.request()), 'SERVICE_TIMEOUT');
    assert.equal(f.service.statusView().valid, false);
    for (let i = 0; i < 4; i++) denied(await f.service.check(SENDER, f.request()), 'SERVICE_UNAVAILABLE');
    assert.equal(calls, 1, 'timed-out unresolved DB call must not spawn retries');
    gate.resolve();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(f.service.statusView().valid, false, 'late lookup cannot publish a grant');
    f.adapter.getForeignObjectAsync = originalRead;
    assert.equal((await f.service.check(SENDER, f.request())).valid, true);
});

test('timeout during adapter identity lookup clears a previously valid license view', async t => {
    const f = await fixture(t, { databaseTimeoutMs: 20 });
    await f.service.start();
    await f.service.activate(f.token());
    const gate = deferred();
    const originalRead = f.adapter.getForeignObjectAsync;
    f.adapter.getForeignObjectAsync = async id => {
        if (id === SENDER) await gate.promise;
        return originalRead(id);
    };
    denied(await f.service.check(SENDER, f.request()), 'SERVICE_TIMEOUT');
    assert.equal(f.service.statusView().valid, false);
    gate.resolve();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(f.service.statusView().valid, false);
});

test('serialized deletion ahead of a check prevents an intervening grant', async t => {
    const f = await fixture(t);
    await f.service.start();
    await f.service.activate(f.token());
    const removal = f.service.remove();
    const response = f.service.check(SENDER, f.request());
    assert.equal((await removal).valid, false);
    denied(await response, 'LICENSE_MISSING');
});


test('status rechecks expiry after delayed UUID lookup', async t => {
    const f = await fixture(t);
    await f.service.start();
    await f.service.activate(f.token({ expiresAt: BASE_TIME + 5000 }));
    const originalRead = f.adapter.getForeignObjectAsync;
    f.adapter.getForeignObjectAsync = async id => {
        const result = await originalRead(id);
        if (id === 'system.meta.uuid') f.advance(5000);
        return result;
    };
    const status = await f.service.status();
    assert.equal(status.valid, false);
    assert.equal(status.code, 'LICENSE_EXPIRED');
});

test('import expiring during UUID lookup preserves the previous valid license', async t => {
    const f = await fixture(t);
    await f.service.start();
    await f.service.activate(f.token());
    const before = await fs.readFile(path.join(f.directory, 'license.enc'));
    const expiring = f.token({ edition: 'pro', expiresAt: BASE_TIME + 5000 });
    const originalRead = f.adapter.getForeignObjectAsync;
    f.adapter.getForeignObjectAsync = async id => {
        const result = await originalRead(id);
        if (id === 'system.meta.uuid') f.advance(5000);
        return result;
    };
    await assert.rejects(f.service.activate(expiring), { code: 'LICENSE_EXPIRED' });
    assert.deepEqual(await fs.readFile(path.join(f.directory, 'license.enc')), before);
    f.adapter.getForeignObjectAsync = originalRead;
    assert.equal((await f.service.check(SENDER, f.request())).edition, 'home');
});

test('production directory resolver works without an assumed adapter instance method', async t => {
    const f = await fixture(t);
    delete f.adapter.getAbsoluteInstanceDataDir;
    const service = new EosLicenseService(f.adapter, {
        resolveDirectory: () => f.directory,
        publicKeys: f.publicKeys,
        now: () => f.clock.wall,
        monotonic: () => f.clock.mono,
    });
    t.after(() => service.stop());
    assert.equal((await service.start()).code, 'LICENSE_MISSING');
    assert.equal((await service.activate(f.token())).valid, true);
});

test('directory resolver failure is contained and keeps authority denied', async t => {
    const f = await fixture(t);
    const service = new EosLicenseService(f.adapter, {
        resolveDirectory: () => { throw new Error('private diagnostic must not be logged'); },
        publicKeys: f.publicKeys,
    });
    t.after(() => service.stop());
    const status = await service.start();
    assert.equal(status.valid, false);
    assert.equal(status.code, 'SERVICE_UNAVAILABLE');
    assert.equal(f.logs.some(message => message.includes('private diagnostic')), false);
});
