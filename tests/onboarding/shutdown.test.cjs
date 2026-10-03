'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { installShutdown, main } = require('../../runtime/onboarding/main.cjs');
test('ordered SIGTERM shutdown closes listener before cleanup; repeated signals cannot repeat secret deletion', () => {
    const signals = new EventEmitter(), events = [], config = { stateDirectory: '/test/config' };
    let closed;
    const server = { closeAllConnections() { events.push('connections'); }, close(callback) { events.push('listener'); closed = callback; } };
    const stop = installShutdown(server, config, { signals, cleanup: c => { assert.equal(c, config); events.push('cleanup'); }, report() { assert.fail(); } });
    signals.emit('SIGTERM'); stop(); assert.deepEqual(events, ['connections', 'listener']);
    assert.equal(signals.listenerCount('SIGTERM'), 0); assert.equal(signals.listenerCount('SIGINT'), 0);
    closed(); assert.deepEqual(events, ['connections', 'listener', 'cleanup']);
});
test('cleanup failure logs fixed code only and makes shutdown non-successful', () => {
    const signals = new EventEmitter(), reports = [];
    const server = { closeAllConnections() {}, close(callback) { callback(); } };
    installShutdown(server, {}, { signals, cleanup() { throw new Error('private token must not escape'); }, report: code => reports.push(code) });
    signals.emit('SIGINT'); assert.deepEqual(reports, ['SETUP_CLEANUP_FAILED']); assert.equal(signals.exitCode, 1);
});
test('asynchronous main rejects arbitrary config and password CLI arguments', async () => {
    await assert.rejects(main(['--config', '/tmp/browser-controlled.json']), /SETUP_USAGE/);
    await assert.rejects(main(['--password', 'private fixture']), /SETUP_USAGE/);
});
