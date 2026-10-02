'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const templates = require('../lib/templates.json').templates;
const template = templates.find((entry) => entry.id === 'ess.tesvolt.iotGateway.mqttV2');
const screenshot = require('./fixtures/tesvolt-ems-screenshot.json').messages;

function loadDriver() {
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'mqtt') return { connect() { throw new Error('No broker is used by this test'); } };
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    delete require.cache[require.resolve('../lib/drivers/mqtt')];
    return require('../lib/drivers/mqtt').MqttDriver;
  } finally {
    Module._load = originalLoad;
  }
}

const MqttDriver = loadDriver();

async function createDriver(namespace = 'nexowatt-devices.0', topicMode = 'ems') {
  const states = new Map();
  let aliveCount = 0;
  const adapter = {
    namespace,
    log: { info() {}, warn() {}, error() {}, debug() {} },
    async setStateAsync(id, value) { states.set(id, value.val); },
  };
  const driver = new MqttDriver(adapter, {
    id: 'ess1', connection: { tesvoltTopicMode: topicMode, tesvoltControlEnabled: false },
  }, template, {}, (dp) => dp.id, () => null, () => { aliveCount += 1; });
  driver.connected = true;
  driver.client = {
    subscribe(topic, options, callback) { callback(null, [{ topic, qos: options.qos }]); },
    publish() { throw new Error('Monitoring must never publish'); },
  };
  await driver._subscribeAll();
  return { driver, states, alive: () => aliveCount };
}

async function feed(driver, topic, object) {
  await driver._handleMessage(topic, Buffer.from(JSON.stringify(object)));
}

test('TESVOLT complete JSON snapshots retain additional payload fields without changing scalar mappings', async () => {
  const { driver, states } = await createDriver();
  for (const [topic, original] of Object.entries(screenshot)) {
    const payload = {
      ...original,
      ts_create: new Date().toISOString(),
      gateway_extension: { label: 'Preserve unknown gateway data', readings: [0, 1.25, null] },
    };
    await feed(driver, topic, payload);
    const raw = template.datapoints.find((dp) => {
      const source = dp.source || {};
      return source.jsonPath === '$' && source.topic.replace(/^EMS\/V2\//, 'EMS/') === topic;
    });
    assert.ok(raw, `No complete JSON snapshot for ${topic}`);
    assert.equal(raw.rw, 'ro');
    assert.deepEqual(JSON.parse(states.get(raw.id)), payload, topic);
  }
  assert.equal(states.get('bATTERY_SOC'), 34.5);
  assert.equal(states.get('aCTIVE_POWER'), -20, 'Only the numeric AC power mapping inverts the manufacturer sign');
  assert.equal(states.get('bATTERY_CAPACITY_WH'), 388546.56);
  assert.equal(states.get('aLLOWED_CHARGE_POWER'), 92000);
  assert.equal(states.get('aCTIVE_CHARGE_ENERGY'), 20808930);
  assert.equal(states.get('bATTERY_SYSTEM_STATE_TEXT'), 'restricted');
  assert.equal(states.get('bATTERY_STATE'), 2);
  assert.deepEqual(JSON.parse(states.get('iNVERTER_MEASUREMENTS_JSON')).Power, 20);
});

test('TESVOLT raw-only telemetry remains inspectable without claiming live scalar data', async () => {
  const { driver, states, alive } = await createDriver();
  await feed(driver, 'EMS/Inverter/Measurements', { gateway_extension: 123 });
  await feed(driver, 'EMS/Battery/SystemState', { diagnostic_only: 'no mapped state present' });
  assert.deepEqual(JSON.parse(states.get('iNVERTER_MEASUREMENTS_JSON')), { gateway_extension: 123 });
  assert.deepEqual(JSON.parse(states.get('bATTERY_SYSTEM_STATE_JSON')), { diagnostic_only: 'no mapped state present' });
  assert.equal(states.has('aCTIVE_POWER'), false);
  assert.equal(states.has('bATTERY_STATE'), false, 'A missing enum field must not become the unknown-state code');
  assert.equal(alive(), 0);
  assert.equal(driver.liveTelemetryCount, 0);
});

test('TESVOLT raw-only and null measurements cannot select the automatic topic namespace', async () => {
  const { driver, alive } = await createDriver('nexowatt-devices.0', 'auto');
  await feed(driver, 'EMS/V2/Inverter/Measurements', { diagnostic_only: true });
  await feed(driver, 'EMS/V2/Battery/SystemState', { diagnostic_only: true });
  await feed(driver, 'EMS/V2/Inverter/Measurements', { Power: null });
  assert.equal(driver.activeTopicPrefix, '');
  assert.equal(alive(), 0);
  await feed(driver, 'EMS/Inverter/Measurements', { Power: 1250, ts_create: new Date().toISOString() });
  assert.equal(driver.activeTopicPrefix, 'EMS/');
  assert.equal(driver.valueCache.aCTIVE_POWER, -1250);
  assert.equal(alive(), 1);
});

test('TESVOLT default client IDs distinguish ioBroker instances and retain explicit broker ACL IDs', async () => {
  const first = await createDriver('nexowatt-devices.0');
  const second = await createDriver('nexowatt-devices.1');
  assert.equal(first.driver._resolveClientId({}), 'nexowatt-tesvolt-nexowatt-devices-0-ess1');
  assert.equal(second.driver._resolveClientId({}), 'nexowatt-tesvolt-nexowatt-devices-1-ess1');
  assert.notEqual(first.driver._resolveClientId({}), second.driver._resolveClientId({}));
  assert.equal(first.driver._resolveClientId({ clientId: 'site-broker-approved-client' }), 'site-broker-approved-client');
});
