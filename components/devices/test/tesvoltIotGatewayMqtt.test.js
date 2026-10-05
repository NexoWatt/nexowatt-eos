'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const root = path.resolve(__dirname, '..');
const runtimeTemplatesRaw = fs.readFileSync(path.join(root, 'lib/templates.json'), 'utf8');
const adminTemplatesRaw = fs.readFileSync(path.join(root, 'admin/templates.json'), 'utf8');
const adminHtmlRaw = fs.readFileSync(path.join(root, 'admin/index_m.html'), 'utf8');
const adminJsRaw = fs.readFileSync(path.join(root, 'admin/index_m.js'), 'utf8');
const templates = JSON.parse(runtimeTemplatesRaw).templates;
const helper = require('./helpers/compatibilityHarness.cjs');

function loadMqttDriver() {
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'mqtt') return { connect() { throw new Error('connect not used in unit test'); } };
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    const modulePath = require.resolve('../lib/drivers/mqtt');
    delete require.cache[modulePath];
    return require('../lib/drivers/mqtt').MqttDriver;
  } finally {
    Module._load = originalLoad;
  }
}

function loadMqttDriverWithMock(mqttMock) {
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'mqtt') return mqttMock;
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    const modulePath = require.resolve('../lib/drivers/mqtt');
    delete require.cache[modulePath];
    return require('../lib/drivers/mqtt').MqttDriver;
  } finally {
    Module._load = originalLoad;
  }
}

const MqttDriver = loadMqttDriver();
const screenshotMessages = require('./fixtures/tesvolt-ems-screenshot.json').messages;
const DeviceRuntime = helper.loadDeviceRuntime(path.join(root, 'lib/deviceRuntime.js'));

function templateById(id) {
  const template = templates.find((entry) => entry && entry.id === id);
  assert.ok(template, `missing template ${id}`);
  return template;
}

function createHarness() {
  const states = new Map();
  const stateWrites = [];
  const published = [];
  const subscriptions = [];
  const snapshots = [];
  const connectionEvents = [];
  const logs = [];
  const client = {
    subscribe(topic, options, callback) {
      subscriptions.push({ topic, options });
      if (callback) callback(null);
    },
    publish(topic, payload, options, callback) {
      published.push({ topic, payload: String(payload), options });
      if (callback) callback(null);
    },
    end(force, options, callback) {
      if (typeof options === 'function') options();
      else if (callback) callback();
    },
  };
  const adapter = {
    _licenseGuard: { assertAllowed() {} }, log: {
      debug(message) { logs.push({ level: 'debug', message }); },
      info(message) { logs.push({ level: 'info', message }); },
      warn(message) { logs.push({ level: 'warn', message }); },
      error(message) { logs.push({ level: 'error', message }); },
    },
    async setStateAsync(id, state) {
      const copy = { ...state };
      states.set(id, copy);
      stateWrites.push({ id, state: copy });
    },
  };
  return { states, stateWrites, published, subscriptions, snapshots, connectionEvents, logs, client, adapter };
}

function createDriver(template, harness, connectionOverrides) {
  const driver = new MqttDriver(
    harness.adapter,
    { id: 'tesvolt1', connection: { url: 'mqtt://127.0.0.1:1884', tesvoltTopicMode: 'v2', tesvoltControlEnabled: true, ...(connectionOverrides || {}) } },
    template,
    {},
    (dp) => `devices.tesvolt1.${dp.id}`,
    () => null,
    () => {},
    async (values, meta) => { harness.snapshots.push({ values, meta }); },
    async (connected, error) => { harness.connectionEvents.push({ connected, error }); },
  );
  driver.client = harness.client;
  driver.connected = true;
  driver._subscribeAll();
  return driver;
}

async function feed(driver, topic, object) {
  const payload = Buffer.from(typeof object === 'string' ? object : JSON.stringify(object));
  await driver._handleMessage(topic, payload);
}

function stateValue(harness, dpId) {
  const state = harness.states.get(`devices.tesvolt1.${dpId}`);
  return state && state.val;
}

function aliasByPath(template, wantedPath) {
  const runtime = helper.buildRuntime(DeviceRuntime, template, 'tesvolt1');
  const prefix = 'devices.tesvolt1.aliases.';
  const definition = runtime._buildAliasDefinitions().find((entry) =>
    entry && String(entry.relId).startsWith(prefix) && String(entry.relId).slice(prefix.length) === wantedPath
  );
  assert.ok(definition, `missing alias ${wantedPath}`);
  return { runtime, definition };
}

function createRuntimeHarness(template) {
  const states = new Map();
  const adapter = {
    namespace: 'nexowatt-devices.0',
    _licenseGuard: { assertAllowed() {} }, log: { debug() {}, info() {}, warn() {}, error() {} },
    async setStateAsync(id, state) { states.set(id, { ...state }); },
    async getStateAsync() { return null; },
  };
  const runtime = new DeviceRuntime(adapter, {
    id: 'tesvolt1',
    templateId: template.id,
    category: template.category,
    manufacturer: template.manufacturer,
    protocol: 'mqtt',
    connection: {},
  }, template, {});

  for (const dp of template.datapoints || []) {
    runtime.dpById.set(dp.id, dp);
    runtime.dpByStateRelId.set(runtime.relStateId(dp), dp);
  }
  runtime.aliasDefs = runtime._buildAliasDefinitions();
  runtime.aliasByStateRelId = new Map(runtime.aliasDefs.map((definition) => [definition.relId, definition]));
  return { runtime, adapter, states };
}

test('TESVOLT IoT Gateway MQTT V2 template is additive, synchronized and exposes documented topics', () => {
  assert.equal(runtimeTemplatesRaw, adminTemplatesRaw);
  const template = templateById('ess.tesvolt.iotGateway.mqttV2');
  assert.deepEqual(template.protocols, ['mqtt']);
  assert.equal(template.category, 'ESS');
  assert.equal(template.aliasContract.deviceClass, 'storageSystem');
  assert.equal(template.driverHints.heartbeatTimeoutMs, 5000);
  assert.equal(template.driverHints.mqtt.defaultUrl, 'mqtt://<TESVOLT-IOT-GATEWAY-IP>:1884');
  assert.equal(template.driverHints.mqtt.defaultTransport, 'mqtt');
  assert.equal(template.driverHints.mqtt.defaultPort, 1884);
  assert.equal(template.driverHints.mqtt.defaultClientId, 'nexowatt-tesvolt-{namespace}-{deviceId}');

  assert.deepEqual(template.driverHints.mqtt.subscriptionFilters, [
    { topic: 'EMS/APIVersion', qos: 0, required: true },
    { topic: 'EMS/V2/#', qos: 0, required: true, fallbackExactPrefix: 'EMS/V2/' },
  ]);
  assert.deepEqual(template.driverHints.mqtt.bootstrapPublishes, [
    { topic: 'EMS/V2/Parameters', qos: 0, retain: true, profile: 'tesvoltEmsParameters' },
  ]);
  assert.equal(template.driverHints.mqtt.noDataTimeoutMs, 10000);

  const byId = new Map(template.datapoints.map((dp) => [dp.id, dp]));
  assert.equal(byId.get('aPI_VERSION').source.topic, 'EMS/APIVersion');
  assert.equal(byId.get('aCTIVE_POWER').source.topic, 'EMS/V2/Inverter/Measurements');
  assert.equal(byId.get('aCTIVE_POWER').source.invert, true);
  assert.equal(byId.get('bATTERY_SOC').source.topic, 'EMS/V2/Battery/Energy');
  assert.equal(byId.get('bATTERY_SYSTEM_STATE_TEXT').source.topic, 'EMS/V2/Battery/SystemState');
  assert.equal(byId.get('sET_ACTIVE_POWER').source.topic, 'EMS/V2/Inverter/Control');
  assert.equal(byId.has('dC_CONNECTION_REQUEST'), false, 'DC contactor control stays disabled until semantics are confirmed');

  const group = template.driverHints.mqtt.writeGroups.inverterControl;
  assert.equal(group.topic, 'EMS/V2/Inverter/Control');
  assert.equal(group.qos, 0);
  assert.equal(group.retain, false);
  assert.equal(group.refreshIntervalMs, 5000);
  assert.equal(group.commandFreshnessMs, 20000);
  assert.equal(group.safeValue, 0);
  assert.equal(group.safeOnInitialConnect, true);
  assert.equal(group.safeOnDisconnect, true);
  assert.equal(group.requireFreshCommandAfterReconnect, true);
  assert.equal(group.fields.Power.invert, true);
  assert.equal(group.fields.Reactive_Power.value, 0);
  assert.equal(group.fields.Reactive_Power.includeIfSupported, undefined, 'reactive power must always be sent');
  assert.equal(group.fields.State.value, 'grid_connected');
  assert.equal(byId.has('cOMMANDED_ACTIVE_POWER'), true);
  assert.equal(byId.has('sETPOINT_TRACKING_STATUS'), true);
  assert.equal(byId.has('sETPOINT_TRACKING_OK'), true);
  assert.equal(byId.has('mQTT_SUBSCRIPTION_OK'), true);
  assert.equal(byId.has('mQTT_BOOTSTRAP_STATUS'), true);
  assert.equal(byId.has('mQTT_LAST_TOPIC'), true);
  assert.equal(byId.has('mQTT_TELEMETRY_MESSAGE_COUNT'), true);
});

test('custom Admin device dialog exposes fixed Client-ID, explicit transport/port, TLS and TESVOLT timing fields', () => {
  for (const id of [
    'mqtt_transport',
    'mqtt_url',
    'mqtt_port',
    'mqtt_clientId',
    'mqtt_verifyTls',
    'mqtt_servername',
    'mqtt_caFile',
    'mqtt_connectTimeout',
    'mqtt_reconnectPeriod',
    'mqtt_keepalive',
    'mqtt_cleanSession',
    'mqtt_tesvoltSetpointInterval',
    'mqtt_tesvoltCommandTimeout',
    'mqtt_tesvoltTelemetryStale',
    'mqtt_tesvoltTrackingDelay',
  ]) {
    assert.match(adminHtmlRaw, new RegExp(`id=["']${id}["']`), `missing Admin field ${id}`);
  }
  assert.match(adminJsRaw, /defaultMqttPort/);
  assert.match(adminJsRaw, /buildMqttUrlFromForm/);
  assert.match(adminJsRaw, /d\.connection\.clientId/);
  assert.match(adminJsRaw, /d\.connection\.rejectUnauthorized/);
  const mqttBranch = adminJsRaw.match(/\}\s*else if \(d\.protocol === 'mqtt'\) \{([\s\S]*?)\}\s*else if \(d\.protocol === 'canbus'\)/);
  assert.ok(mqttBranch, 'MQTT collection branch not found');
  assert.doesNotMatch(
    mqttBranch[1],
    /mqtt_pass[^\n]+\.trim\(\)/,
    'MQTT passwords must not be trimmed because whitespace may be part of the credential',
  );
});


test('MQTT TLS configuration supports mqtts, certificate verification, custom CA and SNI', async () => {
  let captured;
  const SecureMqttDriver = loadMqttDriverWithMock({
    connect(url, options) {
      captured = { url, options };
      return {
        on() {},
        end(force, endOptions, callback) { if (callback) callback(); },
      };
    },
  });
  const harness = createHarness();
  const template = templateById('ess.tesvolt.iotGateway.mqttV2');
  const driver = new SecureMqttDriver(
    harness.adapter,
    {
      id: 'tesvolt1',
      connection: {
        url: 'mqtts://tesvolt-gateway.local:1884',
        username: 'ems-user',
        password: 'secret',
        rejectUnauthorized: true,
        servername: 'tesvolt-gateway.local',
        caCertificate: '-----BEGIN CERTIFICATE-----\\nTEST\\n-----END CERTIFICATE-----',
      },
    },
    template,
    {},
    (dp) => `devices.tesvolt1.${dp.id}`,
    () => null,
  );
  await driver.connect();
  assert.equal(captured.url, 'mqtts://tesvolt-gateway.local:1884');
  assert.equal(captured.options.username, 'ems-user');
  assert.equal(captured.options.password, 'secret');
  assert.equal(captured.options.clientId, 'nexowatt-tesvolt-nexowatt-devices-tesvolt1');
  assert.equal(captured.options.rejectUnauthorized, true);
  assert.equal(captured.options.minVersion, 'TLSv1.3');
  assert.equal(captured.options.servername, 'tesvolt-gateway.local');
  assert.equal(captured.options.ca.includes('\nTEST\n'), true);
});

test('MQTT connection diagnostics preserve the primary authorization rejection across close and heartbeat events', async () => {
  const handlers = new Map();
  let captured;
  const DiagnosticDriver = loadMqttDriverWithMock({
    connect(url, options) {
      captured = { url, options };
      return {
        on(event, callback) { handlers.set(event, callback); },
        end(force, endOptions, callback) { if (callback) callback(); },
      };
    },
  });
  const harness = createHarness();
  const template = templateById('ess.tesvolt.iotGateway.mqttV2');
  const driver = new DiagnosticDriver(
    harness.adapter,
    {
      id: 'tesvolt1',
      connection: {
        url: 'mqtts://192.168.1.50:1884',
        username: 'ems-user',
        password: 'secret',
        clientId: 'nexowatt-fieldtest-1',
      },
    },
    template,
    {},
    (dp) => `devices.tesvolt1.${dp.id}`,
    () => null,
    () => {},
    async (values, meta) => { harness.snapshots.push({ values, meta }); },
    async (connected, error) => { harness.connectionEvents.push({ connected, error }); },
  );

  await driver.connect();
  assert.equal(captured.options.clientId, 'nexowatt-fieldtest-1');
  assert.ok(harness.logs.some((entry) => entry.level === 'info' && entry.message.includes('clientId="nexowatt-fieldtest-1"')));

  const authError = Object.assign(new Error('Connection refused: Not authorized'), { returnCode: 5 });
  handlers.get('error')(authError);
  handlers.get('close')();
  await driver.handleOffline('MQTT heartbeat timeout');

  const primary = harness.connectionEvents.find((entry) => entry.error && entry.error.includes('authorization rejected'));
  assert.ok(primary, 'primary CONNACK authorization error must be exposed');
  assert.match(primary.error, /CONNACK\/reason=5/);
  assert.match(primary.error, /clientId="nexowatt-fieldtest-1"/);
  assert.match(primary.error, /broker=mqtts:\/\/192\.168\.1\.50:1884/);
  assert.equal(
    harness.connectionEvents.at(-1).error.includes('authorization rejected'),
    true,
    'generic close must not replace the primary authorization diagnosis',
  );
  assert.equal(
    harness.snapshots.at(-1).meta.error.includes('authorization rejected'),
    true,
    'heartbeat/offline processing must retain the primary authorization diagnosis',
  );
  assert.ok(harness.logs.some((entry) => entry.level === 'warn' && entry.message.includes('broker is reachable')));
});

test('MQTT fallback Client-ID is deterministic instead of changing randomly on every adapter restart', async () => {
  const captures = [];
  const StableDriver = loadMqttDriverWithMock({
    connect(url, options) {
      captures.push({ url, options });
      return { on() {}, end(force, endOptions, callback) { if (callback) callback(); } };
    },
  });
  const harness = createHarness();
  const genericTemplate = templateById('generic.mqtt');
  for (let index = 0; index < 2; index += 1) {
    const driver = new StableDriver(
      { ...harness.adapter, namespace: 'nexowatt-devices.0', instance: 0 },
      { id: 'mqtt1', connection: { url: 'mqtt://127.0.0.1:1883' } },
      genericTemplate,
      {},
      (dp) => `devices.mqtt1.${dp.id}`,
      () => null,
    );
    await driver.connect();
  }
  assert.equal(captures[0].options.clientId, 'nexowatt-0-mqtt1');
  assert.equal(captures[1].options.clientId, captures[0].options.clientId);
});

test('MQTT driver processes every JSON datapoint sharing one topic instead of only the last one', async () => {
  const harness = createHarness();
  const driver = createDriver(templateById('evcs.openwb.lp1.mqtt.v1'), harness);

  const topic = 'openWB/internal_chargepoint/lp1/get/voltages';
  assert.equal(driver.dpsByTopic.get(topic).length, 3);
  await feed(driver, topic, [231.1, 232.2, 233.3]);
  await feed(driver, topic, [231.1, 232.2, 233.3]);

  assert.equal(stateValue(harness, 'vOLTAGE_L1'), 231.1);
  assert.equal(stateValue(harness, 'vOLTAGE_L2'), 232.2);
  assert.equal(stateValue(harness, 'vOLTAGE_L3'), 233.3);
  assert.equal(
    harness.stateWrites.filter((entry) => entry.id === 'devices.tesvolt1.vOLTAGE_L1').length,
    2,
    'unchanged MQTT samples must still refresh the raw ioBroker state timestamp',
  );
});

test('TESVOLT MQTT JSON topics update all fields, invert power sign and ignore older timestamps', async () => {
  const harness = createHarness();
  const driver = createDriver(templateById('ess.tesvolt.iotGateway.mqttV2'), harness);

  await feed(driver, 'EMS/V2/Inverter/Measurements', {
    ts_create: new Date(Date.now() - 1000).toISOString(),
    U_DC: 992.1,
    U_L1: 242.3,
    U_L2: 243.2,
    U_L3: 243.2,
    Power: -12000,
    Reactive_Power: 360,
  });

  assert.equal(stateValue(harness, 'iNVERTER_DC_VOLTAGE'), 992.1);
  assert.equal(stateValue(harness, 'aC_VOLTAGE_L1'), 242.3);
  assert.equal(stateValue(harness, 'aC_VOLTAGE_L2'), 243.2);
  assert.equal(stateValue(harness, 'aC_VOLTAGE_L3'), 243.2);
  assert.equal(stateValue(harness, 'aCTIVE_POWER'), 12000, 'TESVOLT negative discharge becomes NexoWatt positive discharge');
  assert.equal(stateValue(harness, 'rEACTIVE_POWER'), 360);

  await feed(driver, 'EMS/V2/Inverter/Measurements', {
    ts_create: new Date(Date.now() - 2000).toISOString(),
    U_DC: 100,
    U_L1: 100,
    U_L2: 100,
    U_L3: 100,
    Power: 99999,
    Reactive_Power: 0,
  });
  assert.equal(stateValue(harness, 'aCTIVE_POWER'), 12000, 'older source timestamp must not overwrite newer data');
});

test('TESVOLT canonical ESS aliases expose SOC, signed power, split directions, limits and fault state', () => {
  const template = templateById('ess.tesvolt.iotGateway.mqttV2');
  const runtime = helper.buildRuntime(DeviceRuntime, template, 'tesvolt1');
  const definitions = runtime._buildAliasDefinitions();
  const prefix = 'devices.tesvolt1.aliases.';
  const byPath = new Map(definitions.map((entry) => [String(entry.relId).slice(prefix.length), entry]));

  assert.deepEqual(runtime.aliasContractInfo.missingRequired, []);
  assert.equal(byPath.get('v1.r.soc').get({ bATTERY_SOC: 55.5 }), 55.5);
  assert.equal(byPath.get('v1.r.power').get({ aCTIVE_POWER: 12000 }), 12000);
  assert.equal(byPath.get('v1.r.powerCharge').get({ aCTIVE_POWER: -5000 }), 5000);
  assert.equal(byPath.get('v1.r.powerDischarge').get({ aCTIVE_POWER: 5000 }), 5000);
  assert.equal(byPath.get('v1.r.allowedChargePower').dpId, 'aLLOWED_CHARGE_POWER');
  assert.equal(byPath.get('v1.r.allowedDischargePower').dpId, 'aLLOWED_DISCHARGE_POWER');
  assert.equal(byPath.get('v1.alarm.fault').get({ sYSTEM_FAULT_COUNTERS: 1 }), true);
  assert.equal(byPath.get('v1.ctrl.chargePowerW').toDevice(10000), -10000);
  assert.equal(byPath.get('v1.ctrl.dischargePowerW').toDevice(10000), 10000);
});

test('TESVOLT active-power control publishes documented JSON with sign conversion and dynamic limit clamp', async () => {
  const harness = createHarness();
  const template = templateById('ess.tesvolt.iotGateway.mqttV2');
  const driver = createDriver(template, harness);
  const setpoint = template.datapoints.find((dp) => dp.id === 'sET_ACTIVE_POWER');

  await feed(driver, 'EMS/APIVersion', { APIVersion: 'V2' });
  await feed(driver, 'EMS/V2/Inverter/Parameters', {
    ts_create: new Date(Date.now() - 1000).toISOString(),
    serial_number: 'INV-1',
    supported_measurements: ['Power'],
    supported_states: ['standby', 'grid_connected', 'fault'],
    supported_control: ['Power', 'Reactive_Power', 'State'],
    nominal_charge_power: 92000,
    nominal_discharge_power: 92000,
  });
  await feed(driver, 'EMS/V2/Inverter/Limits', {
    ts_create: new Date(Date.now() - 500).toISOString(),
    P_Max_Charge: 45000,
    P_Max_Discharge: 45000,
    Q_Max_Q1: 45000,
    Q_Max_Q2: 45000,
    Q_Max_Q3: 45000,
    Q_Max_Q4: 45000,
    S_Max_In: 45000,
    S_Max_Out: 45000,
  });
  await feed(driver, 'EMS/V2/Inverter/State', {
    ts_create: new Date(Date.now() - 200).toISOString(),
    State: 'grid_connected',
  });
  await feed(driver, 'EMS/V2/Battery/SystemState', {
    ts_create: new Date(Date.now() - 200).toISOString(),
    System_State: 'normal',
  });

  const discharge = await driver.writeDatapoint(setpoint, 50000);
  assert.equal(discharge.effectiveValue, 45000);
  assert.deepEqual(JSON.parse(harness.published.at(-1).payload), {
    Power: -45000,
    Reactive_Power: 0,
    State: 'grid_connected',
  });
  assert.deepEqual(harness.published.at(-1).options, { qos: 0, retain: false });

  const charge = await driver.writeDatapoint(setpoint, -60000);
  assert.equal(charge.effectiveValue, -45000);
  assert.equal(JSON.parse(harness.published.at(-1).payload).Power, 45000);
  assert.ok(harness.logs.some((entry) => entry.level === 'warn' && entry.message.includes('limited to')));
});

test('TESVOLT non-zero control is gated by API, supported_control and fresh inverter/battery state; zero stays fail-safe', async () => {
  const harness = createHarness();
  const template = templateById('ess.tesvolt.iotGateway.mqttV2');
  const driver = createDriver(template, harness);
  const setpoint = template.datapoints.find((dp) => dp.id === 'sET_ACTIVE_POWER');

  await assert.rejects(() => driver.writeDatapoint(setpoint, 1000), /API V2 required/);
  await assert.rejects(() => driver.writeDatapoint(setpoint, 0), /API V2 required/);

  await feed(driver, 'EMS/APIVersion', { APIVersion: 'V2' });
  const zero = await driver.writeDatapoint(setpoint, 0);
  assert.equal(zero.effectiveValue, 0);
  assert.equal(JSON.parse(harness.published.at(-1).payload).Power, 0);
  await feed(driver, 'EMS/V2/Inverter/Parameters', {
    supported_measurements: ['Power'],
    supported_states: ['grid_connected'],
    supported_control: ['Reactive_Power', 'State'],
  });
  await assert.rejects(() => driver.writeDatapoint(setpoint, 1000), /does not advertise Power/);

  await feed(driver, 'EMS/V2/Inverter/Parameters', {
    supported_measurements: ['Power'],
    supported_states: ['grid_connected'],
    supported_control: ['Power', 'Reactive_Power', 'State'],
  });
  await feed(driver, 'EMS/V2/Inverter/Limits', { P_Max_Charge: 45000, P_Max_Discharge: 45000 });
  await assert.rejects(() => driver.writeDatapoint(setpoint, 1000), /inverter state is stale or missing/);
  await feed(driver, 'EMS/V2/Inverter/State', { State: 'grid_connected' });
  await feed(driver, 'EMS/V2/Battery/SystemState', { System_State: 'restricted' });
  await assert.rejects(() => driver.writeDatapoint(setpoint, 1000), /battery state restricted/);
});

test('TESVOLT power values fail safe to zero on stale data and MQTT heartbeat/offline handling', async () => {
  const harness = createHarness();
  const driver = createDriver(templateById('ess.tesvolt.iotGateway.mqttV2'), harness);

  await feed(driver, 'EMS/V2/Inverter/Measurements', {
    ts_create: new Date(Date.now() - 1000).toISOString(),
    Power: -12000,
    U_DC: 900,
    U_L1: 230,
    U_L2: 230,
    U_L3: 230,
    Reactive_Power: 0,
  });
  assert.equal(stateValue(harness, 'aCTIVE_POWER'), 12000);

  driver.updatedAtByDpId.set('aCTIVE_POWER', Date.now() - 6000);
  await feed(driver, 'EMS/V2/Battery/SystemState', {
    ts_create: '2026-08-08T08:00:10.000+02:00',
    System_State: 'normal',
  });
  assert.equal(stateValue(harness, 'aCTIVE_POWER'), 0, 'stale AC power must be cleared while other topics continue');

  driver.valueCache.aCTIVE_POWER = 8000;
  driver.lastStateWriteByDpId.set('aCTIVE_POWER', 8000);
  await driver.handleOffline('test offline');
  assert.equal(stateValue(harness, 'aCTIVE_POWER'), 0);
  assert.equal(stateValue(harness, 'bATTERY_DC_POWER'), 0);
  assert.equal(harness.snapshots.at(-1).meta.connected, false);
});

test('TESVOLT event-driven snapshots update legacy and v1 storage aliases without polling', async () => {
  const template = templateById('ess.tesvolt.iotGateway.mqttV2');
  const { runtime, states } = createRuntimeHarness(template);

  await runtime._handleMqttSnapshot({
    aCTIVE_POWER: 12000,
    bATTERY_SOC: 55.5,
    aLLOWED_CHARGE_POWER: 45000,
    aLLOWED_DISCHARGE_POWER: 46000,
    sYSTEM_FAULT_COUNTERS: 0,
  }, { connected: true });

  assert.equal(states.get('devices.tesvolt1.aliases.r.power').val, 12000);
  assert.equal(states.get('devices.tesvolt1.aliases.v1.r.power').val, 12000);
  assert.equal(states.get('devices.tesvolt1.aliases.r.soc').val, 55.5);
  assert.equal(states.get('devices.tesvolt1.aliases.v1.r.allowedChargePower').val, 45000);
  assert.equal(states.get('devices.tesvolt1.aliases.comm.connected').val, true);
  assert.equal(states.get('devices.tesvolt1.aliases.v1.alarm.offline').val, false);
});

test('TESVOLT runtime acknowledges the effective clamped value on direct and split power aliases', async () => {
  const template = templateById('ess.tesvolt.iotGateway.mqttV2');
  const { runtime, states } = createRuntimeHarness(template);
  const writes = [];
  runtime.driver = {
    async writeDatapoint(dp, value) {
      writes.push({ dpId: dp.id, value });
      const effectiveValue = Math.sign(value) * Math.min(Math.abs(value), 45000);
      return { effectiveValue };
    },
  };

  const dischargeRel = 'devices.tesvolt1.aliases.v1.ctrl.dischargePowerW';
  await runtime.handleStateChange(`nexowatt-devices.0.${dischargeRel}`, { val: 50000, ack: false });
  assert.deepEqual(writes.at(-1), { dpId: 'sET_ACTIVE_POWER', value: 50000 });
  assert.equal(states.get(dischargeRel).val, 45000);
  assert.equal(states.get('devices.tesvolt1.sET_ACTIVE_POWER').val, 45000);

  const chargeRel = 'devices.tesvolt1.aliases.v1.ctrl.chargePowerW';
  await runtime.handleStateChange(`nexowatt-devices.0.${chargeRel}`, { val: 50000, ack: false });
  assert.deepEqual(writes.at(-1), { dpId: 'sET_ACTIVE_POWER', value: -50000 });
  assert.equal(states.get(chargeRel).val, 45000);
  assert.equal(states.get('devices.tesvolt1.sET_ACTIVE_POWER').val, -45000);
});


test('TESVOLT cyclic control refreshes the full command and switches to 0 W when EOS command updates stop', async () => {
  const harness = createHarness();
  const template = templateById('ess.tesvolt.iotGateway.mqttV2');
  const driver = createDriver(template, harness, {
    tesvoltSetpointIntervalMs: 5000,
    tesvoltCommandSourceTimeoutMs: 20000,
  });
  const setpoint = template.datapoints.find((dp) => dp.id === 'sET_ACTIVE_POWER');

  await feed(driver, 'EMS/APIVersion', { APIVersion: 'V2' });
  await feed(driver, 'EMS/V2/Inverter/Parameters', {
    supported_control: ['Power', 'Reactive_Power', 'State'],
  });
  await feed(driver, 'EMS/V2/Inverter/Limits', { P_Max_Charge: 50000, P_Max_Discharge: 50000 });
  await feed(driver, 'EMS/V2/Inverter/State', { State: 'grid_connected' });
  await feed(driver, 'EMS/V2/Battery/SystemState', { System_State: 'normal' });

  harness.published.length = 0;
  await driver.writeDatapoint(setpoint, 12000);
  await driver._refreshWriteGroup('inverterControl', 'test_refresh');
  assert.equal(harness.published.length, 2);
  assert.deepEqual(JSON.parse(harness.published[0].payload), {
    Power: -12000,
    Reactive_Power: 0,
    State: 'grid_connected',
  });
  assert.deepEqual(JSON.parse(harness.published[1].payload), JSON.parse(harness.published[0].payload));

  const state = driver.writeGroupStates.get('inverterControl');
  state.lastExternalWriteAt = Date.now() - 21000;
  await driver._refreshWriteGroup('inverterControl', 'test_stale');
  assert.deepEqual(JSON.parse(harness.published.at(-1).payload), {
    Power: 0,
    Reactive_Power: 0,
    State: 'grid_connected',
  });
  assert.equal(stateValue(harness, 'sETPOINT_TRACKING_STATUS'), 'safe_stale');
});

test('TESVOLT reconnect never resumes a cached non-zero command without a fresh EOS write', async () => {
  const harness = createHarness();
  const template = templateById('ess.tesvolt.iotGateway.mqttV2');
  const driver = createDriver(template, harness);
  const setpoint = template.datapoints.find((dp) => dp.id === 'sET_ACTIVE_POWER');

  await feed(driver, 'EMS/APIVersion', { APIVersion: 'V2' });
  await feed(driver, 'EMS/V2/Inverter/Parameters', { supported_control: ['Power', 'Reactive_Power', 'State'] });
  await feed(driver, 'EMS/V2/Inverter/Limits', { P_Max_Charge: 50000, P_Max_Discharge: 50000 });
  await feed(driver, 'EMS/V2/Inverter/State', { State: 'grid_connected' });
  await feed(driver, 'EMS/V2/Battery/SystemState', { System_State: 'normal' });
  await driver.writeDatapoint(setpoint, 10000);

  driver._markWriteGroupsDisconnected('test');
  driver.connected = true;
  driver._markWriteGroupsConnected();
  harness.published.length = 0;
  await driver._refreshWriteGroup('inverterControl', 'test_reconnect');
  assert.equal(JSON.parse(harness.published.at(-1).payload).Power, 0);

  await driver.writeDatapoint(setpoint, 5000);
  assert.equal(JSON.parse(harness.published.at(-1).payload).Power, -5000);
});

test('TESVOLT setpoint feedback is derived from Measurements because the interface has no separate acknowledgement', async () => {
  const harness = createHarness();
  const template = templateById('ess.tesvolt.iotGateway.mqttV2');
  const driver = createDriver(template, harness, { tesvoltTrackingDelayMs: 500 });
  const setpoint = template.datapoints.find((dp) => dp.id === 'sET_ACTIVE_POWER');

  await feed(driver, 'EMS/APIVersion', { APIVersion: 'V2' });
  await feed(driver, 'EMS/V2/Inverter/Parameters', { supported_control: ['Power', 'Reactive_Power', 'State'] });
  await feed(driver, 'EMS/V2/Inverter/Limits', { P_Max_Charge: 50000, P_Max_Discharge: 50000 });
  await feed(driver, 'EMS/V2/Inverter/State', { State: 'grid_connected' });
  await feed(driver, 'EMS/V2/Battery/SystemState', { System_State: 'normal' });
  await driver.writeDatapoint(setpoint, 10000);
  const groupState = driver.writeGroupStates.get('inverterControl');
  groupState.lastCommandChangedAt = Date.now() - 1000;

  await feed(driver, 'EMS/V2/Inverter/Measurements', {
    ts_create: new Date(Date.now() - 1000).toISOString(),
    Power: -10000,
    Reactive_Power: 0,
  });
  assert.equal(stateValue(harness, 'cOMMANDED_ACTIVE_POWER'), 10000);
  assert.equal(stateValue(harness, 'sETPOINT_TRACKING_ERROR'), 0);
  assert.equal(stateValue(harness, 'sETPOINT_TRACKING_STATUS'), 'following');
  assert.equal(stateValue(harness, 'sETPOINT_TRACKING_OK'), true);

  await feed(driver, 'EMS/V2/Inverter/Measurements', {
    ts_create: new Date(Date.now() - 0).toISOString(),
    Power: -4000,
    Reactive_Power: 0,
  });
  assert.equal(stateValue(harness, 'sETPOINT_TRACKING_ERROR'), -6000);
  assert.equal(stateValue(harness, 'sETPOINT_TRACKING_STATUS'), 'deviating');
  assert.equal(stateValue(harness, 'sETPOINT_TRACKING_OK'), false);
});

test('TESVOLT controlled disconnect sends a final full 0 W command', async () => {
  const harness = createHarness();
  const template = templateById('ess.tesvolt.iotGateway.mqttV2');
  const driver = createDriver(template, harness);
  const setpoint = template.datapoints.find((dp) => dp.id === 'sET_ACTIVE_POWER');

  await feed(driver, 'EMS/APIVersion', { APIVersion: 'V2' });
  await feed(driver, 'EMS/V2/Inverter/Parameters', { supported_control: ['Power', 'Reactive_Power', 'State'] });
  await feed(driver, 'EMS/V2/Inverter/Limits', { P_Max_Charge: 50000, P_Max_Discharge: 50000 });
  await feed(driver, 'EMS/V2/Inverter/State', { State: 'grid_connected' });
  await feed(driver, 'EMS/V2/Battery/SystemState', { System_State: 'normal' });
  await driver.writeDatapoint(setpoint, 10000);
  harness.published.length = 0;
  await driver.disconnect();
  assert.deepEqual(JSON.parse(harness.published.at(-1).payload), {
    Power: 0,
    Reactive_Power: 0,
    State: 'grid_connected',
  });
});

test('generic MQTT writes keep the established client queue behaviour while TESVOLT groups require a live connection', async () => {
  const genericHarness = createHarness();
  const genericTemplate = templateById('generic.mqtt');
  const genericDriver = createDriver(genericTemplate, genericHarness);
  genericDriver.connected = false;
  const genericSetpoint = genericTemplate.datapoints.find((dp) => dp.id === 'set');
  await genericDriver.writeDatapoint(genericSetpoint, 12.5);
  assert.equal(genericHarness.published.at(-1).topic, 'device/set');
  assert.equal(genericHarness.published.at(-1).payload, '12.5');

  const tesvoltHarness = createHarness();
  const tesvoltTemplate = templateById('ess.tesvolt.iotGateway.mqttV2');
  const tesvoltDriver = createDriver(tesvoltTemplate, tesvoltHarness);
  tesvoltDriver.connected = false;
  const tesvoltSetpoint = tesvoltTemplate.datapoints.find((dp) => dp.id === 'sET_ACTIVE_POWER');
  await assert.rejects(() => tesvoltDriver.writeDatapoint(tesvoltSetpoint, 0), /MQTT not connected/);
});


test('TESVOLT MQTT bootstrap subscribes the documented filters and publishes EMS identity retained', async () => {
  const handlers = new Map();
  const subscriptions = [];
  const published = [];
  const BootstrapDriver = loadMqttDriverWithMock({
    connect() {
      return {
        on(event, callback) { handlers.set(event, callback); },
        subscribe(topic, options, callback) {
          subscriptions.push({ topic, options });
          callback(null, [{ topic, qos: options.qos }]);
        },
        publish(topic, payload, options, callback) {
          published.push({ topic, payload: String(payload), options });
          callback(null);
        },
        end(force, options, callback) { if (callback) callback(); },
      };
    },
  });
  const harness = createHarness();
  const template = templateById('ess.tesvolt.iotGateway.mqttV2');
  const driver = new BootstrapDriver(
    harness.adapter,
    {
      id: 'tesvolt1',
      connection: {
        url: 'mqtt://192.168.1.50:1884',
        username: 'nexowatt',
        password: 'secret',
        clientId: 'nexowatt-tesvolt1',
        tesvoltTopicMode: 'v2',
        tesvoltControlEnabled: true,
      },
    },
    template,
    {},
    (dp) => `devices.tesvolt1.${dp.id}`,
    () => null,
    () => {},
    async (values, meta) => { harness.snapshots.push({ values, meta }); },
    async (connected, error) => { harness.connectionEvents.push({ connected, error }); },
  );

  await driver.connect();
  handlers.get('connect')({ sessionPresent: false });
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(subscriptions.map((entry) => entry.topic).sort(), ['EMS/APIVersion', 'EMS/V2/#']);
  const identity = published.find((entry) => entry.topic === 'EMS/V2/Parameters');
  assert.ok(identity, 'EMS identity message must be published after successful subscribe');
  assert.deepEqual(identity.options, { qos: 0, retain: true });
  const payload = JSON.parse(identity.payload);
  assert.equal(payload.SerialNumber, 'NEXOWATT-tesvolt1');
  assert.equal(payload.SoftwareVersion, require('../package.json').version);
  assert.equal(Number.isFinite(Date.parse(payload.ts_create)), true);
  assert.equal(stateValue(harness, 'mQTT_SUBSCRIPTION_OK'), true);
  assert.equal(stateValue(harness, 'mQTT_EMS_PARAMETERS_PUBLISHED'), true);
  assert.match(stateValue(harness, 'mQTT_BOOTSTRAP_STATUS'), /EMS\/V2\/Parameters published retained/);

  driver._stopNoDataWatch();
  driver._stopWriteGroupTimers();
});

test('TESVOLT wildcard subscription falls back to concrete V2 topics when the broker ACL rejects wildcards', async () => {
  const harness = createHarness();
  const subscriptions = [];
  harness.client.subscribe = (topic, options, callback) => {
    subscriptions.push(topic);
    if (topic === 'EMS/V2/#') callback(null, [{ topic, qos: 128 }]);
    else callback(null, [{ topic, qos: options.qos }]);
  };
  const driver = new MqttDriver(
    harness.adapter,
    { id: 'tesvolt1', connection: { url: 'mqtt://127.0.0.1:1884', tesvoltTopicMode: 'v2' } },
    templateById('ess.tesvolt.iotGateway.mqttV2'),
    {},
    (dp) => `devices.tesvolt1.${dp.id}`,
    () => null,
  );
  driver.client = harness.client;
  driver.connected = true;
  const summary = await driver._subscribeAll();

  assert.equal(summary.ok, true);
  assert.equal(stateValue(harness, 'mQTT_SUBSCRIPTION_OK'), true);
  assert.match(stateValue(harness, 'mQTT_SUBSCRIPTION_STATUS'), /exact-topic fallback/);
  assert.ok(subscriptions.includes('EMS/V2/Inverter/Measurements'));
  assert.ok(subscriptions.includes('EMS/V2/Battery/SystemState'));
  driver._stopWriteGroupTimers();
});

test('TESVOLT subscription denial is visible even when MQTT CONNACK succeeded', async () => {
  const harness = createHarness();
  harness.client.subscribe = (topic, options, callback) => {
    callback(null, [{ topic, qos: 128 }]);
  };
  const driver = new MqttDriver(
    harness.adapter,
    { id: 'tesvolt1', connection: { url: 'mqtt://127.0.0.1:1884' } },
    templateById('ess.tesvolt.iotGateway.mqttV2'),
    {},
    (dp) => `devices.tesvolt1.${dp.id}`,
    () => null,
    () => {},
    async (values, meta) => { harness.snapshots.push({ values, meta }); },
  );
  driver.client = harness.client;
  driver.connected = true;
  const summary = await driver._subscribeAll();

  assert.equal(summary.ok, false);
  assert.equal(stateValue(harness, 'mQTT_SUBSCRIPTION_OK'), false);
  assert.match(stateValue(harness, 'mQTT_SUBSCRIPTION_STATUS'), /denied\/failed/);
  assert.ok(harness.logs.some((entry) => entry.level === 'warn' && entry.message.includes('required subscriptions were not granted')));
  assert.equal(harness.snapshots.at(-1).meta.subscriptionError, true);
  driver._stopWriteGroupTimers();
});

test('TESVOLT precise subscription errors are not replaced by a secondary no-data warning', async () => {
  const handlers = new Map();
  const DeniedDriver = loadMqttDriverWithMock({
    connect() {
      return {
        on(event, callback) { handlers.set(event, callback); },
        subscribe(topic, options, callback) { callback(null, [{ topic, qos: 128 }]); },
        publish(topic, payload, options, callback) { callback(null); },
        end(force, options, callback) { if (callback) callback(); },
      };
    },
  });
  const harness = createHarness();
  const driver = new DeniedDriver(
    harness.adapter,
    { id: 'tesvolt1', connection: { url: 'mqtt://127.0.0.1:1884' } },
    templateById('ess.tesvolt.iotGateway.mqttV2'),
    {},
    (dp) => `devices.tesvolt1.${dp.id}`,
    () => null,
    () => {},
    async (values, meta) => { harness.snapshots.push({ values, meta }); },
  );
  let noDataWatchStarted = false;
  driver._startNoDataWatch = () => { noDataWatchStarted = true; };

  await driver.connect();
  handlers.get('connect')({ sessionPresent: false });
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(noDataWatchStarted, false);
  assert.equal(stateValue(harness, 'mQTT_SUBSCRIPTION_OK'), false);
  assert.ok(harness.snapshots.some((entry) => entry.meta && entry.meta.subscriptionError));
  assert.equal(harness.snapshots.some((entry) => entry.meta && entry.meta.noData), false);
  driver._stopWriteGroupTimers();
});

test('TESVOLT topic discovery records evolving V2 topics while local publish echoes do not prove gateway telemetry', async () => {
  const harness = createHarness();
  const driver = createDriver(templateById('ess.tesvolt.iotGateway.mqttV2'), harness);
  await driver._subscribeAll();

  await feed(driver, 'EMS/V2/Parameters', {
    ts_create: '2026-09-07T10:00:00.000+02:00',
    SerialNumber: 'NEXOWATT-tesvolt1',
    SoftwareVersion: '0.5.160',
  });
  assert.equal(stateValue(harness, 'mQTT_MESSAGE_COUNT'), 1);
  assert.equal(stateValue(harness, 'mQTT_GATEWAY_MESSAGE_COUNT'), 0);
  assert.equal(stateValue(harness, 'mQTT_TELEMETRY_MESSAGE_COUNT'), 0);

  await feed(driver, 'EMS/V2/Inverter/NewDiagnosticValue', { value: 1 });
  assert.equal(stateValue(harness, 'mQTT_MESSAGE_COUNT'), 2);
  assert.equal(stateValue(harness, 'mQTT_GATEWAY_MESSAGE_COUNT'), 1);
  assert.equal(stateValue(harness, 'mQTT_TELEMETRY_MESSAGE_COUNT'), 1);
  assert.equal(stateValue(harness, 'mQTT_UNKNOWN_TOPIC_COUNT'), 1);
  assert.match(stateValue(harness, 'mQTT_DISCOVERED_TOPICS_JSON'), /NewDiagnosticValue/);
  assert.equal(harness.snapshots.at(-1).meta.unknownTopic, true);
  driver._stopWriteGroupTimers();
});

test('MQTT protocol errors remain visible while transport connection stays true', async () => {
  const template = templateById('ess.tesvolt.iotGateway.mqttV2');
  const { runtime, states } = createRuntimeHarness(template);
  await runtime._handleMqttSnapshot({}, {
    connected: true,
    error: 'MQTT connected, but required subscriptions were not granted',
    subscriptionError: true,
  });
  assert.equal(states.get('devices.tesvolt1.info.connection').val, true);
  assert.match(states.get('devices.tesvolt1.info.lastError').val, /subscriptions were not granted/);
});

function monitorDriver(harness, overrides = {}) {
  return createDriver(templateById('ess.tesvolt.iotGateway.mqttV2'), harness, {
    tesvoltTopicMode: 'auto', tesvoltControlEnabled: false, ...overrides,
  });
}

async function replayScreenshot(driver, live = true) {
  for (const [topic, original] of Object.entries(screenshotMessages)) {
    const object = { ...original };
    if (live && object.ts_create) object.ts_create = new Date().toISOString();
    await feed(driver, topic, object);
  }
}

test('TESVOLT screenshot EMS topics populate raw values and existing EOS aliases without API V2', async () => {
  const h = createHarness();
  const d = monitorDriver(h);
  await d._subscribeAll();
  await replayScreenshot(d);
  for (const [id, value] of Object.entries({
    bATTERY_SOC: 34.5, aCTIVE_POWER: -20, bATTERY_DC_POWER: 0,
    aC_VOLTAGE_L1: 230.70000000000002, aC_VOLTAGE_L2: 231.4,
    aC_VOLTAGE_L3: 230.9, iNVERTER_DC_VOLTAGE: 949.2, bATTERY_VOLTAGE: 947.7,
    bATTERY_CAPACITY_WH: 388546.56, bATTERY_ENERGY_CONTENT: 63129.601562,
    aCTIVE_CHARGE_ENERGY: 20808930, aCTIVE_DISCHARGE_ENERGY: 19692690,
    aLLOWED_CHARGE_POWER: 92000, aLLOWED_DISCHARGE_POWER: 92000,
    bATTERY_DC_MAX_CHARGE_POWER: 92100, bATTERY_SYSTEM_STATE_TEXT: 'restricted',
    bATTERY_STATE: 2, iNVERTER_STATE_TEXT: 'grid_connected',
    bIFI_SERIAL_NUMBER: 'TEST-BIFI', eMS_SERIAL_NUMBER: 'TEST-TEM',
    eMS_SOFTWARE_VERSION: '3.3.1', mQTT_ACTIVE_TOPIC_PREFIX: 'EMS/',
    mQTT_CONTROL_STATUS: 'monitoring_only', nOMINAL_POWER: 92000,
  })) assert.equal(stateValue(h, id), value, id);
  assert.equal(stateValue(h, 'aPI_VERSION'), undefined, 'never invent a V2 version');
  assert.equal(stateValue(h, 'iNVERTER_SUPPORTED_CONTROL'), undefined, 'never invent capabilities');
  assert.equal(stateValue(h, 'iOT_GATEWAY_SERIAL_NUMBER'), undefined, 'Bifi is not the gateway identity');
  assert.equal(JSON.parse(stateValue(h, 'bATTERY_CONTROL_JSON')).DC_Connection_Request, true);
  assert.equal(JSON.parse(stateValue(h, 'iNVERTER_CONTROL_JSON')).Power, 0);
  const { runtime, states } = createRuntimeHarness(d.template);
  await runtime._handleMqttSnapshot({ ...d.valueCache }, { connected: true });
  assert.equal(states.get('devices.tesvolt1.aliases.v1.r.soc').val, 34.5);
  assert.equal(states.get('devices.tesvolt1.aliases.v1.r.power').val, -20);
  assert.ok(h.subscriptions.some(s => s.topic === 'EMS/#'));
  assert.equal(h.published.length, 0);
});

test('TESVOLT default and explicit monitoring modes never publish on bootstrap, zero, command, refresh or disconnect', async () => {
  for (const mode of ['auto', 'ems', 'v2']) {
    const h = createHarness();
    const d = monitorDriver(h, { tesvoltTopicMode: mode, tesvoltControlEnabled: undefined });
    await d._subscribeAll();
    d._markWriteGroupsConnected();
    await feed(d, 'EMS/APIVersion', { APIVersion: 'V2' });
    await d._publishBootstrapMessages();
    const dp = d.dpById.get('sET_ACTIVE_POWER');
    await assert.rejects(d.writeDatapoint(dp, 0), /monitoring only/);
    await assert.rejects(d.writeDatapoint(dp, 5000), /monitoring only/);
    await d._refreshWriteGroup('inverterControl', 'test');
    await d.disconnect();
    assert.equal(d.writeGroupTimers.size, 0);
    assert.equal(h.published.length, 0, mode);
  }
});

test('TESVOLT auto detection stays on one namespace and cannot activate control', async () => {
  const h = createHarness();
  const d = monitorDriver(h, { tesvoltControlEnabled: true });
  await feed(d, 'EMS/Inverter/Measurements', { Power: 20 });
  await feed(d, 'EMS/V2/Inverter/Measurements', { Power: 90000 });
  await feed(d, 'EMS/V2/Battery/Energy', { SOC: 99 });
  assert.equal(stateValue(h, 'aCTIVE_POWER'), -20);
  assert.equal(stateValue(h, 'bATTERY_SOC'), undefined);
  await assert.rejects(d.writeDatapoint(d.dpById.get('sET_ACTIVE_POWER'), 0), /explicit topic format/);
  assert.equal(h.published.length, 0);
  assert.equal(d.writeGroupTimers.size, 0);
});

test('TESVOLT EMS command route preserves capability, restricted-state and dynamic-limit checks', async () => {
  const h = createHarness();
  const d = monitorDriver(h, { tesvoltTopicMode: 'ems', tesvoltControlEnabled: true });
  await replayScreenshot(d);
  const dp = d.dpById.get('sET_ACTIVE_POWER');
  await assert.rejects(d.writeDatapoint(dp, 5000), /supported_control/);
  await feed(d, 'EMS/Inverter/Parameters', { supported_control: ['Power', 'Reactive_Power', 'State'] });
  await assert.rejects(d.writeDatapoint(dp, 5000), /restricted/);
  await feed(d, 'EMS/Battery/SystemState', { System_State: 'normal' });
  const result = await d.writeDatapoint(dp, 100000);
  assert.equal(result.topic, 'EMS/Inverter/Control');
  assert.equal(result.effectiveValue, 92000);
  assert.deepEqual(result.payload, { Power: -92000, Reactive_Power: 0, State: 'grid_connected' });
  const charge = await d.writeDatapoint(dp, -100000);
  assert.equal(charge.payload.Power, 92000);
  await d._publishBootstrapMessages();
  await assert.rejects(d._publish('EMS/Battery/Control', '{}', {}, true), /not enabled/);
  await d.disconnect();
  assert.ok(h.published.every(p => p.topic === 'EMS/Inverter/Control' && !p.options.retain));
  assert.equal(JSON.parse(h.published.at(-1).payload).Power, 0);
});

test('TESVOLT retained old telemetry, repeated timestamps, unknown topics and control echoes do not refresh liveness', async () => {
  const h = createHarness();
  const d = monitorDriver(h, { tesvoltTopicMode: 'ems' });
  let alive = 0;
  d.onAlive = () => { alive += 1; };
  await replayScreenshot(d, false);
  assert.equal(alive, 0);
  assert.equal(stateValue(h, 'aCTIVE_POWER'), 0);
  const ts = new Date().toISOString();
  await feed(d, 'EMS/Inverter/Measurements', { Power: -5000, ts_create: ts });
  assert.equal(alive, 1);
  await feed(d, 'EMS/Inverter/Measurements', { Power: -9999, ts_create: ts });
  await feed(d, 'EMS/Inverter/Control', { Power: -9999 });
  await feed(d, 'EMS/Battery/Control', { DC_Connection_Request: true });
  await feed(d, 'EMS/Inverter/Unknown', { value: 1 });
  await feed(d, 'EMS/Inverter/Measurements', { Power: -9999, ts_create: new Date(Date.now() + 60000).toISOString() });
  assert.equal(alive, 1);
  assert.equal(stateValue(h, 'aCTIVE_POWER'), 5000);
  await d._handleMessage('EMS/Inverter/Measurements', Buffer.from('{"Power":123}'), { retain: true });
  assert.equal(alive, 1);
  assert.equal(stateValue(h, 'aCTIVE_POWER'), 0);
});

test('TESVOLT exact-topic fallback accepts readable EMS telemetry without requiring inaccessible V2 or optional metadata', async () => {
  const h = createHarness();
  h.client.subscribe = (topic, options, callback) => {
    const allowed = topic === 'EMS/Battery/Energy' || topic === 'EMS/Inverter/Measurements';
    callback(null, [{ topic, qos: allowed ? 0 : 128 }]);
  };
  const d = monitorDriver(h);
  const summary = await d._subscribeAll();
  assert.equal(summary.ok, true);
  assert.equal(stateValue(h, 'mQTT_SUBSCRIPTION_OK'), true);
  assert.match(stateValue(h, 'mQTT_SUBSCRIPTION_STATUS'), /unavailable topics:.*EMS\/Inverter\/Limits/);
  assert.ok(summary.optionalFailures.some(item => item.topic === 'EMS/Inverter/Limits'));
  await feed(d, 'EMS/Battery/Energy', { SOC: 34.5 });
  assert.equal(stateValue(h, 'bATTERY_SOC'), 34.5);
  assert.equal(h.published.length, 0);
});

test('TESVOLT automatic format waits for live values and replays only metadata from the selected namespace', async () => {
  const h = createHarness();
  const d = monitorDriver(h);
  let alive = 0;
  d.onAlive = () => { alive += 1; };
  await d._handleMessage('EMS/V2/Inverter/Parameters', Buffer.from(JSON.stringify({ serial_number: 'OLD-V2', nominal_power: 50000 })), { retain: true });
  await d._handleMessage('EMS/V2/Battery/Energy', Buffer.from(JSON.stringify({ SOC: 99, ts_create: new Date(Date.now() - 60000).toISOString() })), { retain: true });
  await feed(d, 'EMS/Inverter/Parameters', { serial_number: 'LIVE-EMS', nominal_power: 92000 });
  assert.equal(d.activeTopicPrefix, '');
  assert.equal(stateValue(h, 'iNVERTER_SERIAL_NUMBER'), undefined);
  assert.equal(stateValue(h, 'bATTERY_SOC'), undefined);
  assert.equal(JSON.parse(stateValue(h, 'iNVERTER_PARAMETERS_JSON')).serial_number, 'LIVE-EMS');
  await feed(d, 'EMS/Inverter/Measurements', { Power: -2000, ts_create: new Date().toISOString() });
  assert.equal(d.activeTopicPrefix, 'EMS/');
  assert.equal(stateValue(h, 'iNVERTER_SERIAL_NUMBER'), 'LIVE-EMS');
  assert.equal(stateValue(h, 'nOMINAL_POWER'), 92000);
  assert.equal(stateValue(h, 'bATTERY_SOC'), undefined);
  assert.equal(stateValue(h, 'aCTIVE_POWER'), 2000);
  assert.equal(alive, 1);
  assert.equal(stateValue(h, 'mQTT_MESSAGE_COUNT'), 4, 'buffer replay is not another broker message');
  await feed(d, 'EMS/V2/Parameters', { SerialNumber: 'OTHER-EMS' });
  assert.equal(stateValue(h, 'eMS_SERIAL_NUMBER'), undefined, 'identity must not mix namespaces either');
});

test('TESVOLT missing or null State fields never apply fallback state codes or refresh liveness', async () => {
  const h = createHarness();
  const d = monitorDriver(h, { tesvoltTopicMode: 'ems' });
  let alive = 0;
  d.onAlive = () => { alive += 1; };
  await feed(d, 'EMS/Battery/SystemState', { System_State: 'normal' });
  assert.equal(stateValue(h, 'bATTERY_STATE'), 1);
  const freshAt = d.updatedAtByDpId.get('bATTERY_STATE');
  await feed(d, 'EMS/Battery/SystemState', { ts_create: new Date().toISOString() });
  assert.equal(stateValue(h, 'bATTERY_STATE'), 1);
  assert.equal(d.updatedAtByDpId.get('bATTERY_STATE'), freshAt);
  await feed(d, 'EMS/Inverter/State', { State: null });
  assert.equal(stateValue(h, 'iNVERTER_STATE_CODE'), null);
  assert.equal(alive, 1);
});

test('TESVOLT malformed supplied timestamps cannot make retained or live values fresh', async () => {
  const h = createHarness();
  const d = monitorDriver(h, { tesvoltTopicMode: 'ems' });
  let alive = 0;
  d.onAlive = () => { alive += 1; };
  await feed(d, 'EMS/Inverter/Measurements', { Power: -2000, ts_create: 'invalid-clock' });
  assert.equal(stateValue(h, 'aCTIVE_POWER'), 0);
  assert.equal(alive, 0);
  assert.equal(d.updatedAtByDpId.get('aCTIVE_POWER'), 1);
  await feed(d, 'EMS/Inverter/Measurements', { Power: -2000 });
  assert.equal(stateValue(h, 'aCTIVE_POWER'), 2000, 'missing timestamps remain supported for live EMS samples');
  assert.equal(alive, 1);
});

test('MQTT numeric JSON strings keep sign and scale; empty and structured values are rejected', async () => {
  const h = createHarness();
  const d = monitorDriver(h, { tesvoltTopicMode: 'ems' });
  await feed(d, 'EMS/Inverter/Measurements', { Power: '1e3' });
  assert.equal(stateValue(h, 'aCTIVE_POWER'), -1000);
  for (const invalid of ['', '  ', false, [], {}]) {
    await feed(d, 'EMS/Inverter/Measurements', { Power: invalid });
    assert.equal(stateValue(h, 'aCTIVE_POWER'), -1000, JSON.stringify(invalid));
  }
  const custom = { type: 'number', source: { format: 'json', jsonPath: '$.value', invert: true, multiplier: 2 } };
  assert.equal(d._parsePayload(custom, Buffer.from('{"value":" 1e2 "}')), -200);
});

test('TESVOLT error metadata updates snapshots immediately without refreshing the heartbeat', async () => {
  const h = createHarness();
  const d = monitorDriver(h, { tesvoltTopicMode: 'ems' });
  let alive = 0;
  d.onAlive = () => { alive += 1; };
  await feed(d, 'EMS/Battery/Errors', { Errors: [{ code: 'test-error' }] });
  const snapshot = h.snapshots.at(-1);
  assert.equal(snapshot.values.aCTIVE_ERRORS_COUNT, 1);
  assert.equal(snapshot.meta.diagnosticsOnly, true);
  assert.equal(snapshot.meta.topic, 'EMS/Battery/Errors');
  assert.equal(alive, 0);
  await feed(d, 'EMS/Battery/Errors', { Errors: [] });
  assert.equal(h.snapshots.at(-1).values.aCTIVE_ERRORS_COUNT, 0);
  assert.equal(alive, 0);
});

test('TESVOLT namespace changes clear direct limit aliases as well as raw cache entries', async () => {
  const h = createHarness();
  const d = monitorDriver(h);
  const { runtime, states } = createRuntimeHarness(d.template);
  d.onValues = (values, meta) => runtime._handleMqttSnapshot(values, meta);
  await feed(d, 'EMS/V2/Inverter/Limits', { P_Max_Charge: 12000, P_Max_Discharge: 18000 });
  assert.equal(states.get('devices.tesvolt1.aliases.v1.r.allowedChargePower').val, 12000);
  // connect() resets namespace/freshness, while the last selected namespace is
  // retained solely to detect a version change in the next stream.
  d.activeTopicPrefix = '';
  d.updatedAtByDpId.clear();
  d.lastSourceTimestampByTopic.clear();
  await feed(d, 'EMS/Inverter/Measurements', { Power: -3000 });
  assert.equal(states.get('devices.tesvolt1.aliases.v1.r.allowedChargePower').val, null);
  assert.equal(states.get('devices.tesvolt1.aliases.v1.r.allowedDischargePower').val, null);
  assert.equal(stateValue(h, 'aLLOWED_CHARGE_POWER'), null);
  assert.equal(Object.hasOwn(d.valueCache, 'aLLOWED_CHARGE_POWER'), false);
});

// EOS integrated snapshot: plaintext legacy protocols remain a separate admission risk.
test('MQTT refuses disabling TLS verification before any network connection', async () => {
  let connected = false;
  const Driver = loadMqttDriverWithMock({ connect() { connected = true; throw new Error('must not connect'); } });
  const h = createHarness();
  const driver = new Driver(h.adapter, { id: 'test', connection: { url: 'mqtts://gateway.invalid', rejectUnauthorized: false } },
    templateById('ess.tesvolt.iotGateway.mqttV2'), {}, dp => dp.id, () => null);
  await assert.rejects(driver.connect(), /EOS_MQTT_TLS_VERIFICATION_REQUIRED/);
  assert.equal(connected, false);
});
