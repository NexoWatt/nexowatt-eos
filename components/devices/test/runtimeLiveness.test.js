'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { loadDeviceRuntime } = require('./helpers/compatibilityHarness.cjs');
const DeviceRuntime = loadDeviceRuntime(path.join(__dirname, '../lib/deviceRuntime.js'));

function createRuntime(protocol, driver) {
  const states = new Map();
  const adapter = {
    namespace: 'nexowatt-devices.0',
    log: { debug() {}, info() {}, warn() {}, error() {} },
    async setStateAsync(id, state) { states.set(id, { ...state }); },
    async getStateAsync() { return null; },
  };
  const template = {
    id: 'generic.test', category: 'GENERIC',
    datapoints: [{ id: 'power', type: 'number', rw: 'ro', source: { kind: protocol } }],
  };
  const runtime = new DeviceRuntime(adapter, { id: 'test', protocol, connection: {} }, template, { pollIntervalMs: 60000 });
  for (const dp of template.datapoints) runtime.dpById.set(dp.id, dp);
  runtime._createDriver = () => driver;
  return { runtime, states };
}

for (const values of [{}, { power: undefined }, { power: null }, { power: NaN }]) {
  test(`poll without usable measurements does not manufacture liveness: ${Object.keys(values).length ? String(values.power) : 'empty response'}`, async () => {
    const { runtime, states } = createRuntime('http', { async readDatapoints() { return values; }, async disconnect() {} });
    try {
      await runtime.start();
      assert.equal(runtime._hbLastSeen, 0);
      assert.equal(runtime._hbOnline, false);
      assert.equal(states.get('devices.test.info.connection')?.val, false);
    } finally { await runtime.stop(); }
  });
}

test('MQTT subscription diagnostic arriving during connect is not overwritten at startup', async () => {
  let runtime;
  const harness = createRuntime('mqtt', {
    async connect() {
      await runtime._handleMqttSnapshot({}, { connected: true, error: 'Subscription denied: EMS/#' });
    },
    async disconnect() {},
  });
  runtime = harness.runtime;
  try {
    await runtime.start();
    assert.equal(harness.states.get('devices.test.info.connection').val, true);
    assert.equal(harness.states.get('devices.test.info.lastError').val, 'Subscription denied: EMS/#');
    assert.equal(runtime._hbOnline, false);
  } finally { await runtime.stop(); }
});

test('MQTT diagnostic-only snapshots update aliases without clearing errors or fabricating liveness', async () => {
  const { runtime, states } = createRuntime('mqtt', {});
  await runtime._setStateCached('devices.test.info.connection', false, true);
  await runtime._setStateCached('devices.test.info.lastError', 'No current telemetry', true);
  let received;
  runtime._updateAliases = async (values, context) => { received = { values, context }; };
  await runtime._handleMqttSnapshot({ errors: 2 }, { connected: true, diagnosticsOnly: true });
  assert.equal(states.get('devices.test.info.connection').val, false);
  assert.equal(states.get('devices.test.info.lastError').val, 'No current telemetry');
  assert.deepEqual(received, { values: { errors: 2 }, context: { connected: false, lastError: 'No current telemetry' } });
  assert.equal(runtime._hbLastSeen, 0);
});

test('a valid zero measurement establishes liveness', async () => {
  const { runtime, states } = createRuntime('http', { async readDatapoints() { return { power: 0 }; }, async disconnect() {} });
  try {
    await runtime.start();
    assert.ok(runtime._hbLastSeen > 0);
    assert.equal(runtime._hbOnline, true);
    assert.equal(states.get('devices.test.info.connection')?.val, true);
  } finally { await runtime.stop(); }
});

for (const protocol of ['mqtt', 'canbus']) {
  test(`${protocol} startup preserves a connection failure diagnostic`, async () => {
    const { runtime, states } = createRuntime(protocol, {
      async connect() { throw new Error('connect failed: test failure'); }, async disconnect() {},
    });
    try {
      await runtime.start();
      assert.equal(states.get('devices.test.info.connection')?.val, false);
      assert.match(String(states.get('devices.test.info.lastError')?.val), /connect failed: test failure/);
    } finally { await runtime.stop(); }
  });
}
