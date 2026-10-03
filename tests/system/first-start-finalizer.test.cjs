'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { completeSequence } = require('../../tools/system/finalize-onboarding.cjs');
const names = ['acquire', 'stop', 'enroll', 'verify', 'configureLicense', 'upload', 'enableWebInstances', 'authorize', 'start', 'probe', 'persist', 'enableBoot', 'disableSetup', 'release', 'quiesce'];
function effects(fault) {
    const calls = [], error = new Error('SIMULATED_INTERRUPTION');
    return { calls, error, api: Object.fromEntries(names.map(name => [name, async () => { calls.push(name); if (name === fault) throw error; }])) };
}
test('finalizer verifies before starting; persists only after authenticated TLS probes', async () => {
    const e = effects(); const result = await completeSequence(e.api);
    assert.deepEqual(e.calls, ['acquire', 'stop', 'enroll', 'verify', 'configureLicense', 'upload', 'enableWebInstances', 'verify', 'authorize', 'start', 'probe', 'persist', 'enableBoot', 'disableSetup', 'release']);
    assert.equal(result.configured, true); assert.equal(result.physicalControlEnabled, false);
});
test('parallel attempt failing exclusive lock never stops the owning finalizer', async () => {
    const e = effects('acquire'); await assert.rejects(completeSequence(e.api), e.error);
    assert.deepEqual(e.calls, ['acquire']);
});
for (const phase of names.filter(name => !['acquire', 'quiesce'].includes(name))) {
    test(`interruption at ${phase} always blocks restart and stops controller`, async () => {
        const e = effects(phase); await assert.rejects(completeSequence(e.api), e.error);
        assert.equal(e.calls.at(-1), 'quiesce');
        if (!['release'].includes(phase)) assert.equal(e.calls.includes('release'), false);
        if (['stop', 'enroll', 'verify', 'configureLicense', 'upload', 'enableWebInstances', 'authorize'].includes(phase)) assert.equal(e.calls.includes('start'), false);
        if (!['persist', 'enableBoot', 'disableSetup', 'release'].includes(phase)) assert.equal(e.calls.includes('persist'), false);
    });
}
