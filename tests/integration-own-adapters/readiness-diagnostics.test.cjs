'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { NAMES, processSummary, adapterSnapshot } = require('./readiness-diagnostics.cjs');
test('startup diagnostics identify fixed adapter failures without exporting private log contents', () => {
    const output = processSummary('\x1b[31merror: host.private instance system.adapter.eebus.0 terminated with code: 1\n' +
        'error: nexowatt-backup.0 Cannot find module /private/token/secret\n' +
        'error: unknown-adapter.0 private password\nError: MODULE_NOT_FOUND private/key\n');
    assert.deepEqual(output.adapters.find(row => row.name === 'eebus').indicators, ['PROCESS_TERMINATED', 'RUNTIME_ERROR_LOGGED']);
    assert.deepEqual(output.adapters.find(row => row.name === 'nexowatt-backup').indicators, ['MODULE_NOT_FOUND', 'RUNTIME_ERROR_LOGGED']);
    assert.deepEqual(output.unscoped, ['MODULE_NOT_FOUND', 'RUNTIME_ERROR_LOGGED']);
    assert.doesNotMatch(JSON.stringify(output), /private|secret|password|unknown-adapter/);
});
test('readiness evidence distinguishes fresh heartbeat, stale heartbeat and dead process using only Booleans', async () => {
    const rows = await adapterSnapshot({ getState: async id => {
        if (id.endsWith('.sigKill')) return { val: 42, ack: true };
        return { val: true, ack: true, ts: id.includes('eebus.0') ? 99 : 101, private: 'secret' };
    } }, 100, () => false);
    assert.deepEqual(rows.map(row => row.name), NAMES);
    assert.equal(rows.find(row => row.name === 'eebus').aliveFresh, false);
    assert.equal(rows.find(row => row.name === 'ocpp21').aliveFresh, true);
    assert.equal(rows.every(row => row.processAlive === false), true);
    assert.doesNotMatch(JSON.stringify(rows), /secret|42|101/);
});
test('malformed and unacknowledged state values cannot become positive readiness evidence', async () => {
    for (const state of [{ val: 'true', ack: true, ts: 101 }, { val: true, ack: false, ts: 101 },
        { val: true, ack: true, ts: '101' }, { val: 42, ack: false }, null]) {
        const rows = await adapterSnapshot({ getState: async () => state }, 100, () => true);
        assert.ok(rows.every(row => !row.aliveFresh && !row.connectedFresh && !row.processAlive));
    }
});
