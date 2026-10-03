'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DEADLINE_MS, invocationIdentity, quiesceIncomplete: quiesce, dispatch } = require('../../tools/system/finalize-onboarding.cjs');
const INVOCATION = 'a'.repeat(32);
const quiesceIncomplete = effects => quiesce(effects, INVOCATION);
function effects(lock, failure) {
    const calls = [];
    const call = name => { calls.push(name); if (failure === name) throw new Error('sensitive fixture details'); };
    return { calls, api: { readLock: () => { call('readLock'); return lock ? { invocationId: INVOCATION, ...lock } : lock; }, block: () => call('block'), stop: () => call('stop') } };
}
test('a crashed or timed-out first-start trial revokes its permit and stops its controller', () => {
    const f = effects({ operation: 'ui-onboarding', pid: 999999 });
    assert.equal(quiesceIncomplete(f.api).status, 'FIRST_START_INCOMPLETE_TRIAL_STOPPED');
    assert.deepEqual(f.calls, ['readLock', 'block', 'stop']);
});
test('successful lock removal leaves the completed controller running', () => {
    const f = effects(null);
    assert.equal(quiesceIncomplete(f.api).status, 'FIRST_START_NO_INCOMPLETE_TRIAL');
    assert.deepEqual(f.calls, ['readLock']);
});
test('known independent maintenance does not lose its trial permit', () => {
    for (const operation of ['additive-release', 'certificate-rotation', 'web-certificate-rotation']) {
        const f = effects({ operation });
        assert.equal(quiesceIncomplete(f.api).status, 'FIRST_START_OTHER_MAINTENANCE');
        assert.deepEqual(f.calls, ['readLock']);
    }
});
test('another first-start invocation or legacy coordinator keeps its already-owned lock', () => {
    for (const lock of [{ operation: 'ui-onboarding', invocationId: 'b'.repeat(32) },
        { operation: 'ui-onboarding', invocationId: undefined }, { operationId: 'legacy-additive-release', invocationId: undefined }]) {
        const f = effects(lock);
        assert.equal(quiesceIncomplete(f.api).status, 'FIRST_START_OTHER_MAINTENANCE');
        assert.deepEqual(f.calls, ['readLock']);
    }
});
test('missing or invalid systemd invocation cannot run either privileged coordinator context', () => {
    for (const value of ['', null, 'a'.repeat(31), 'g'.repeat(32), 'a'.repeat(32) + '\n']) {
        assert.throws(() => invocationIdentity(value), /FIRST_START_SYSTEMD_INVOCATION/);
        const f = effects({ operation: 'ui-onboarding' });
        assert.throws(() => quiesce(f.api, value), /FIRST_START_SYSTEMD_INVOCATION/);
        assert.deepEqual(f.calls, []);
    }
});
test('permit removal error still attempts a stop and reports only a generic code', () => {
    const f = effects({ operation: 'ui-onboarding' }, 'block');
    assert.throws(() => quiesceIncomplete(f.api), error => error.message === 'FIRST_START_QUIESCE_STATE_FAILED');
    assert.deepEqual(f.calls, ['readLock', 'block', 'stop']);
});
test('unreadable or unknown maintenance state attempts fail-closed quiescence', () => {
    for (const f of [effects(null, 'readLock'), effects({ operation: 'unknown' }), effects(undefined)]) {
        assert.throws(() => quiesceIncomplete(f.api), /FIRST_START_QUIESCE_STATE_FAILED/);
        assert.deepEqual(f.calls, ['readLock', 'block', 'stop']);
    }
});
test('a stop failure remains a failing service result', () => {
    const f = effects({ operation: 'ui-onboarding' }, 'stop');
    assert.throws(() => quiesceIncomplete(f.api), error => error.message === 'FIRST_START_QUIESCE_STOP_FAILED');
    assert.deepEqual(f.calls, ['readLock', 'block', 'stop']);
});
test('only the fixed stop-post selector is accepted; caller paths and commands are rejected', () => {
    for (const args of [['--quiesce-incomplete', '/tmp/other'], ['--stop', 'other.service'], ['--config', '/tmp/x'], ['--quiesce-incomplete=/tmp/x']]) {
        assert.throws(() => dispatch(args), /FIRST_START_USAGE/);
    }
});
test('real systemd unit installs independent stop-post and budgets beyond coordinator deadline', () => {
    const unit = fs.readFileSync(path.resolve(__dirname, '../../system/postgresql-test/systemd/nexowatt-eos-setup-finalize.service'), 'utf8');
    assert.match(unit, /^ExecStopPost=\/usr\/bin\/node \/opt\/nexowatt\/eos\/current\/tools\/system\/finalize-onboarding.cjs --quiesce-incomplete$/m);
    const start = Number(/^TimeoutStartSec=(\d+)$/m.exec(unit)?.[1]);
    const stop = Number(/^TimeoutStopSec=(\d+)$/m.exec(unit)?.[1]);
    assert.equal(DEADLINE_MS, 840000);
    assert.ok(start * 1000 > DEADLINE_MS);
    assert.ok(stop > 90);
    assert.match(unit, /^CapabilityBoundingSet=CAP_DAC_READ_SEARCH$/m);
    assert.doesNotMatch(unit, /CAP_(?:SYS_ADMIN|SETUID|SETGID|CHOWN|DAC_OVERRIDE)/);
});
