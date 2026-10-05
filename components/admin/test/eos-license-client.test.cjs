'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
    createLicenseGuard, LicenseError, COMMAND, MAX_TIMEOUT_MS, MAX_LEASE_MS,
} = require('./lib/load-eos-license-module.cjs')(require.resolve('../packages/eos-license-client'));

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function grant(request, changes = {}) {
    const now = Date.now();
    return {
        v: 1, nonce: request.nonce, valid: true, code: 'LICENSE_VALID', edition: 'home',
        features: ['energy', 'wallet', 'smartHome', 'microgridSlave'],
        limits: { chargePoints: 3, batteries: 2 }, checkedAt: now,
        validUntil: now + 1000, ...changes,
    };
}
function setup(t, handler, options = {}) {
    const losses = [];
    const messages = [];
    const errors = [];
    const adapter = {
        name: 'nexowatt-ui', namespace: 'nexowatt-ui.0', log: { error: message => errors.push(message) },
        sendTo(target, command, request, callback) {
            messages.push({ target, command, request });
            return handler(request, callback);
        },
    };
    const guard = createLicenseGuard(adapter, { onLost: event => losses.push(event), ...options });
    t.after(() => guard.stop());
    return { guard, adapter, losses, messages, errors };
}

test('starts denied, permits signed-service decision and sends no license key', async t => {
    const { guard, messages } = setup(t, (request, callback) => callback(grant(request)), {
        required: { chargePoints: 3, batteries: 2 },
    });
    assert.equal(guard.isAllowed(), false);
    assert.throws(() => guard.assertAllowed(), LicenseError);
    assert.equal(await guard.start(), true);
    assert.doesNotThrow(() => guard.assertAllowed());
    assert.equal(messages[0].target, 'eos-admin.0');
    assert.equal(messages[0].command, COMMAND);
    assert.deepEqual(Object.keys(messages[0].request).sort(), ['adapter', 'feature', 'nonce', 'required', 'v']);
    assert.match(messages[0].request.nonce, /^[a-f0-9]{32}$/);
    assert.equal(guard.getStatus().edition, 'home');
});

test('a new request uses a new nonce and rejects replay from an older request', async t => {
    let first;
    const { guard, messages, losses } = setup(t, (request, callback) => {
        first ||= grant(request);
        callback(first);
    });
    assert.equal(await guard.refresh(), true);
    assert.equal(await guard.refresh(), false);
    assert.notEqual(messages[0].request.nonce, messages[1].request.nonce);
    assert.equal(guard.getStatus().code, 'INVALID_RESPONSE');
    assert.equal(losses.length, 1);
});

test('Home and Pro quantity limits and features are checked independently', async t => {
    const variants = [
        { changes: {}, options: { required: { chargePoints: 4 } }, allowed: false },
        { changes: {}, options: { required: { batteries: 3 } }, allowed: false },
        { changes: { limits: { chargePoints: 4, batteries: 2 } }, allowed: false },
        { changes: { limits: { chargePoints: 3, batteries: 3 } }, allowed: false },
        { changes: { features: ['energy', 'billing'] }, allowed: false },
        { changes: {}, options: { feature: 'microgridMaster' }, allowed: false },
        { changes: { edition: 'pro', features: ['energy', 'billing'], limits: { chargePoints: 20, batteries: 10 } },
            options: { feature: 'billing', required: { chargePoints: 20, batteries: 10 } }, allowed: true },
        { changes: { edition: 'pro', limits: { chargePoints: 1001, batteries: 10 } }, allowed: false },
        { changes: { edition: 'pro', limits: { chargePoints: 20, batteries: 11 } }, allowed: false },
    ];
    for (const variant of variants) {
        const { guard } = setup(t, (request, callback) => callback(grant(request, variant.changes)), variant.options);
        assert.equal(await guard.refresh(), variant.allowed, JSON.stringify(variant));
        await guard.stop();
    }
});

test('malformed, stale, future, oversized and missing entitlements fail closed', async t => {
    const now = Date.now();
    const variations = [
        null, 'valid', [], { valid: 'true' }, { v: 2 }, { nonce: 'wrong' },
        { code: 'OK' }, { edition: 'enterprise' }, { valid: false },
        { features: [] }, { features: ['energy', 'energy'] }, { features: ['energy', 'other'] },
        { limits: { chargePoints: '3', batteries: 2 } }, { limits: { chargePoints: 3 } },
        { limits: { chargePoints: 3, batteries: 2, extra: 1 } }, { limits: null },
        { checkedAt: now - 3000 }, { checkedAt: now + 3000 },
        { validUntil: now - 1 }, { validUntil: now + MAX_LEASE_MS + 5000 },
        { checkedAt: 'today' }, { validUntil: Infinity }, { license: 'MUST_NOT_BE_RETURNED' },
    ];
    for (const change of variations) {
        const { guard } = setup(t, (request, callback) => callback(
            change === null || typeof change !== 'object' || Array.isArray(change) ? change : grant(request, change),
        ));
        assert.equal(await guard.refresh(), false, JSON.stringify(change));
        assert.equal(guard.isAllowed(), false);
        await guard.stop();
    }
});

test('timeout invalidates an existing lease; late and duplicate callbacks cannot reopen it', async t => {
    let answer;
    let request;
    let calls = 0;
    const { guard, losses } = setup(t, (input, callback) => {
        request = input;
        if (calls++ === 0) callback(grant(input));
        else answer = callback;
    }, { timeoutMs: 20 });
    assert.equal(await guard.refresh(), true);
    assert.equal(await guard.refresh(), false);
    assert.equal(guard.getStatus().code, 'TIMEOUT');
    answer(grant(request));
    answer(grant(request));
    assert.equal(guard.isAllowed(), false);
    assert.equal(losses.length, 1);
});

test('throws and rejected transport promises settle denied without an unhandled rejection', async t => {
    for (const handler of [() => { throw Error('transport'); }, () => Promise.reject(Error('transport'))]) {
        const { guard, losses } = setup(t, handler);
        assert.equal(await guard.refresh(), false);
        assert.equal(guard.getStatus().code, 'TRANSPORT_ERROR');
        assert.equal(losses.length, 1);
        await guard.stop();
    }
});

test('lease expires autonomously, onLost is once per denial episode, then recovery is possible', async t => {
    let permitted = true;
    const { guard, losses } = setup(t, (request, callback) => callback(grant(request, {
        valid: permitted, validUntil: Date.now() + 20,
    })));
    assert.equal(await guard.refresh(), true);
    await delay(35);
    assert.equal(losses.length, 1);
    assert.equal(guard.isAllowed(), false);
    permitted = false;
    assert.equal(await guard.refresh(), false);
    assert.equal(losses.length, 1);
    permitted = true;
    assert.equal(await guard.refresh(), true);
    await guard.stop();
    assert.equal(losses.length, 2);
    assert.equal(await guard.start(), false, 'stopped guard is terminal');
});

test('wall clock rollback does not extend monotonic lease and a forward jump immediately denies', async t => {
    const { guard, losses } = setup(t, (request, callback) => callback(grant(request, { validUntil: Date.now() + 20 })));
    const realNow = Date.now;
    assert.equal(await guard.refresh(), true);
    try {
        Date.now = () => realNow() - 3_600_000;
        await delay(35);
        assert.equal(guard.isAllowed(), false);
        assert.equal(losses.length, 1);
    } finally {
        Date.now = realNow;
    }
    assert.equal(await guard.refresh(), true);
    try {
        Date.now = () => realNow() + 3_600_000;
        assert.equal(guard.isAllowed(), false);
        assert.equal(losses.length, 2);
    } finally {
        Date.now = realNow;
    }
});

test('stop cancels in-flight request and prevents late callback activation', async t => {
    let answer;
    let request;
    const { guard, losses } = setup(t, (input, callback) => { answer = callback; request = input; });
    const pending = guard.start();
    await guard.stop();
    assert.equal(await pending, false);
    answer(grant(request));
    assert.equal(guard.isAllowed(), false);
    assert.equal(losses.length, 1);
});

test('concurrent callers coalesce safely and status mutation cannot change entitlement', async t => {
    let answer;
    let request;
    const { guard, messages } = setup(t, (input, callback) => { answer = callback; request = input; });
    const first = guard.refresh();
    const second = guard.refresh();
    assert.equal(first, second);
    assert.equal(messages.length, 1);
    answer(grant(request));
    assert.equal(await first, true);
    const status = guard.getStatus();
    status.limits.chargePoints = 900;
    status.features.push('billing');
    assert.equal(guard.getStatus().limits.chargePoints, 3);
    assert.equal(guard.getStatus().features.includes('billing'), false);
    answer(grant(request, { valid: false }));
    assert.equal(guard.isAllowed(), true, 'duplicate callback has no effect');
});

test('failed safe-state callback latches denial and sanitizes logs', async t => {
    for (const onLost of [() => { throw Error('SECRET'); }, async () => { throw Error('SECRET'); }]) {
        let permitted = false;
        const { guard, errors } = setup(t, (request, callback) => callback(grant(request, { valid: permitted })), { onLost });
        assert.equal(await guard.refresh(), false);
        await delay(0);
        permitted = true;
        assert.equal(await guard.refresh(), false);
        assert.equal(guard.getStatus().code, 'SAFE_STATE_FAILED');
        assert.equal(errors.length, 1);
        assert.equal(errors[0].includes('SECRET'), false);
        await guard.stop();
    }
});

test('asynchronous safe-state transition must finish before a fresh grant is accepted', async t => {
    let finishSafeState;
    let permitted = false;
    const { guard } = setup(t, (request, callback) => callback(grant(request, { valid: permitted })), {
        onLost: () => new Promise(resolve => { finishSafeState = resolve; }),
    });
    assert.equal(await guard.refresh(), false);
    permitted = true;
    assert.equal(await guard.refresh(), false);
    assert.equal(guard.getStatus().code, 'SAFE_STATE_PENDING');
    finishSafeState();
    await delay(0);
    assert.equal(await guard.refresh(), true);
    const stop = guard.stop();
    finishSafeState();
    await stop;
});

test('invalid configuration cannot create a permissive guard', () => {
    const adapter = { name: 'nexowatt-ui', namespace: 'nexowatt-ui.0', sendTo() {} };
    assert.throws(() => createLicenseGuard(adapter), /onLost/);
    for (const options of [
        { timeoutMs: MAX_TIMEOUT_MS + 1 }, { timeoutMs: 0 }, { feature: 'all' },
        { adminInstance: 'evil.0' }, { required: { batteries: 11 } },
        { required: { chargePoints: -1 } }, { required: { chargePoints: '3' } },
        { required: { unknown: 1 } }, { required: null },
    ]) {
        assert.throws(() => createLicenseGuard(adapter, { onLost() {}, ...options }), TypeError);
    }
    assert.throws(() => createLicenseGuard({ ...adapter, namespace: 'another.0' }, { onLost() {} }), TypeError);
    assert.throws(() => createLicenseGuard({ ...adapter, name: '[a-z]*' }, { onLost() {} }), TypeError);
});

test('one shared lease gates each Home/Pro feature without extra messages or rights after loss', async t => {
    for (const edition of ['home', 'pro']) {
        let permitted = true;
        const { guard, messages } = setup(t, (request, callback) => callback(grant(request, {
            edition,
            valid: permitted,
            features: edition === 'home' ? ['energy', 'microgridSlave'] : ['energy', 'microgridSlave', 'microgridMaster', 'billing'],
        })));
        assert.equal(guard.isFeatureAllowed('energy'), false);
        assert.equal(await guard.refresh(), true);
        assert.equal(guard.isFeatureAllowed('energy'), true);
        assert.equal(guard.isFeatureAllowed('microgridSlave'), true);
        assert.equal(guard.isFeatureAllowed('billing'), edition === 'pro');
        assert.equal(guard.isFeatureAllowed('microgridMaster'), edition === 'pro');
        assert.equal(guard.isFeatureAllowed('unknown'), false);
        assert.equal(guard.isFeatureAllowed(null), false);
        assert.throws(() => guard.assertFeatureAllowed('unknown'), { code: 'FEATURE_NOT_LICENSED' });
        if (edition === 'home') {
            assert.throws(() => guard.assertFeatureAllowed('billing'), { code: 'FEATURE_NOT_LICENSED' });
        } else {
            assert.doesNotThrow(() => guard.assertFeatureAllowed('billing'));
        }
        assert.equal(guard.isAllowed(), true, 'denying an unlicensed optional feature preserves licensed base operation');
        assert.equal(messages.length, 1, 'feature checks reuse the validated lease');
        permitted = false;
        assert.equal(await guard.refresh(), false);
        assert.equal(guard.isFeatureAllowed('energy'), false);
        assert.equal(guard.isFeatureAllowed('billing'), false);
        assert.throws(() => guard.assertFeatureAllowed('billing'), LicenseError);
        await guard.stop();
    }
});
