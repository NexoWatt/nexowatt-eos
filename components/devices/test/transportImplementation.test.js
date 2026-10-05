'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { EventEmitter } = require('node:events');

const log = { debug() {}, info() {}, warn() {}, error() {} };
const nextTurn = () => new Promise(resolve => setImmediate(resolve));

function loadDriver(name, replacements) {
  const filename = path.join(__dirname, '../lib/drivers', name);
  const nativeRequire = createRequire(filename);
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    module, exports: module.exports, Buffer, URL, setTimeout, clearTimeout,
    require(request) { return Object.hasOwn(replacements, request) ? replacements[request] : nativeRequire(request); },
  }, { filename });
  return module.exports;
}

function httpDriver(request) {
  const { HttpDriver } = loadDriver('http.js', { axios: { create() { return { request }; } } });
  return new HttpDriver({ _licenseGuard: { assertAllowed() {} }, log }, { id: 'http', connection: {} }, {}, {});
}

const httpDp = (id, requestPath) => ({ id, type: 'number', rw: 'ro', source: { kind: 'http', path: requestPath, jsonPath: '$.value' } });

test('HTTP propagates a complete endpoint outage instead of returning healthy empty data', async () => {
  const failure = Object.assign(new Error('connect ECONNREFUSED 192.0.2.1'), { code: 'ECONNREFUSED' });
  const driver = httpDriver(async () => { throw failure; });
  await assert.rejects(driver.readDatapoints([httpDp('power', '/power')]), error => error.code === 'EOS_HTTP_REQUEST_FAILED' && !error.message.includes('192.0.2.1'));
});

test('HTTP retains successful measurements when one optional endpoint fails', async () => {
  const driver = httpDriver(async ({ url }) => {
    if (url === '/optional') throw new Error('HTTP 404');
    return { data: { value: 0 } };
  });
  const result = await driver.readDatapoints([httpDp('power', '/power'), httpDp('optional', '/optional')]);
  assert.deepEqual(Object.entries(result), [['power', 0]]);
});

test('HTTP does not poll write-only commands or publish null and nonfinite measurements', async () => {
  const requested = [];
  const driver = httpDriver(async ({ url }) => {
    requested.push(url);
    return { data: { value: url === '/null' ? null : NaN } };
  });
  const result = await driver.readDatapoints([
    { ...httpDp('command', '/command'), rw: 'wo' }, httpDp('empty', '/null'), httpDp('invalid', '/nan'),
  ]);
  assert.deepEqual(requested, ['/null', '/nan']);
  assert.equal(Object.keys(result).length, 0);
});

function udpDriver() {
  const sockets = [];
  class Socket extends EventEmitter {
    constructor() { super(); this.sent = []; }
    bind(_port, done) { queueMicrotask(done); }
    send(payload, _offset, _length, _port, _host, done) { this.sent.push(payload.toString()); done(); }
    close(done) { queueMicrotask(() => { this.emit('close'); if (done) done(); }); }
    reply(text, port = 7090, address = '192.0.2.1') { this.emit('message', Buffer.from(text), { port, address }); }
  }
  const { UdpDriver } = loadDriver('udp.js', {
    'node:dgram': { createSocket() { const socket = new Socket(); sockets.push(socket); return socket; } },
  });
  const driver = new UdpDriver({ _licenseGuard: { assertAllowed() {} }, log }, { id: 'keba', connection: { host: '192.0.2.1', port: 7090, timeoutMs: 100 } }, {}, {});
  return { driver, sockets };
}

test('UDP serializes polling and simultaneous control writes on the reply socket', async () => {
  const { driver, sockets } = udpDriver();
  try {
    const read = driver.readDatapoints([{ id: 'state', rw: 'ro', source: { kind: 'udp', read: { cmd: 'report 2', jsonPath: '$.State' } } }]);
    const write = driver.writeDatapoint({ source: { kind: 'udp', write: { cmdTemplate: 'curr ${value}' } } }, 6000);
    await nextTurn();
    assert.deepEqual(sockets[0].sent, ['report 2']);
    sockets[0].reply('{"State":3}');
    assert.equal((await read).state, 3);
    await nextTurn();
    assert.deepEqual(sockets[0].sent, ['report 2', 'curr 6000']);
    sockets[0].reply('TCH-OK :done');
    assert.equal(await write, true);
  } finally { await driver.disconnect(); }
});

test('UDP ignores responses from other endpoints', async () => {
  const { driver, sockets } = udpDriver();
  try {
    let resolved = false;
    const pending = driver._sendAndReceive('report 2').then(value => { resolved = true; return value; });
    await nextTurn();
    sockets[0].reply('wrong port', 7091);
    sockets[0].reply('wrong host', 7090, '192.0.2.2');
    await nextTurn();
    assert.equal(resolved, false);
    sockets[0].reply('correct endpoint');
    assert.equal(await pending, 'correct endpoint');
  } finally { await driver.disconnect(); }
});

test('UDP disconnect cancels pending and queued operations without sending stale commands', async () => {
  const { driver, sockets } = udpDriver();
  const pending = driver._sendAndReceive('report 2');
  const queued = driver._sendAndReceive('curr 16000');
  const settled = Promise.allSettled([pending, queued]);
  await nextTurn();
  await driver.disconnect();
  const results = await settled;
  assert.ok(results.every(result => result.status === 'rejected'));
  assert.deepEqual(sockets[0].sent, ['report 2']);
});

test('UDP queue recovers after a timed out request', async () => {
  const { driver, sockets } = udpDriver();
  try {
    await assert.rejects(driver._sendAndReceive('report 2'), /UDP timeout/);
    const next = driver._sendAndReceive('report 3');
    await nextTurn();
    sockets[0].reply('{"P":1200}');
    assert.equal(await next, '{"P":1200}');
  } finally { await driver.disconnect(); }
});
