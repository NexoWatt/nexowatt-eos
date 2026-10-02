'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

let lastServer = null;
const fakeResponse = {
  Header: { Version: 8, Device: '87', Timestamp: 1760000000 },
  Data: {
    Inputs: [
      { Designation: 'T.Außen', Number: 1, AD: 'A', Value: { Value: 10.2, Unit: '1' } },
      { Designation: 'Heizfreigabe', Number: 2, AD: 'D', Value: { Value: 1, Unit: '43' } },
    ],
    Outputs: [
      { Designation: 'Heizkreispumpe', Number: 1, AD: 'D', Value: { Value: 1, Unit: '43' } },
      { Designation: 'Mischer', Number: 2, AD: 'A', Value: { Value: 35.5, Unit: '8', State: 1 } },
    ],
  },
  Status: 'OK',
  'Status code': 0,
};

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'axios') {
    return {
      create() {
        return { async get() { return { data: fakeResponse }; } };
      },
    };
  }
  if (request === 'modbus-serial') {
    return {
      ServerTCP: class FakeServerTCP {
        constructor(vector, options) {
          this.vector = vector;
          this.options = options;
          this.handlers = {};
          lastServer = this;
        }
        on(name, fn) { this.handlers[name] = fn; return this; }
        close(cb) { if (cb) cb(); }
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

let api;
try {
  api = require('../lib/drivers/taCmi');
} finally {
  Module._load = originalLoad;
}

const {
  TaCmiDriver,
  parseNodeSpec,
  parseGroups,
  normalizeBridgeEntry,
  encodeInt16,
  decodeInt16,
  unitForId,
} = api;

function makeRuntime() {
  const dpById = new Map();
  const values = new Map();
  const aliases = [];
  return {
    baseId: 'devices.cmi1',
    dpById,
    values,
    aliases,
    async registerDynamicDatapoint(dp) { dpById.set(dp.id, dp); return dp; },
    async registerDynamicAlias(def) { aliases.push(def); return def; },
    _getDpById(id) { return dpById.get(id); },
    relStateId(dp) { return `devices.cmi1.${dp.id}`; },
    async _setStateCached(id, value) { values.set(id, value); },
    async _updateAliases() {},
  };
}

function makeAdapter() {
  return {
    log: { debug() {}, info() {}, warn() {}, error() {} },
    async getStateAsync() { return null; },
  };
}

test('parses all CAN node and API group selection safely', () => {
  assert.deepEqual(parseNodeSpec('1-3, 7; 62'), [1, 2, 3, 7, 62]);
  assert.equal(parseNodeSpec('', true).length, 62);
  assert.deepEqual(parseGroups('I,O,Sp,AM,invalid'), ['I', 'O', 'Sp', 'AM']);
  assert.equal(unitForId(1), '°C');
  assert.equal(unitForId(69), 'W');
});

test('signed bridge encoding and channel map preserve engineering values', () => {
  assert.equal(decodeInt16(encodeInt16(-731)), -731);
  assert.deepEqual(normalizeBridgeEntry({ direction: 'toCmi', type: 'analog', channel: 1, scale: 0.1, alias: 'ctrl.flowSetpointC' }), {
    direction: 'toCmi', type: 'analog', channel: 1, name: '', unit: '', role: '', scale: 0.1,
    alias: 'ctrl.flowSetpointC', min: undefined, max: undefined,
  });
});

test('CMI JSON API dynamically exposes values, designations and node metadata', async () => {
  const runtime = makeRuntime();
  const driver = new TaCmiDriver(makeAdapter(), {
    id: 'cmi1', protocol: 'taCmi',
    connection: { baseUrl: 'http://cmi', username: 'expert', password: 'secret', nodes: '1', bridgeEnabled: false },
  }, {}, {}, runtime);

  const out = await driver.readDatapoints([]);
  assert.equal(out.cMI_API_STATUS_CODE, 0);
  assert.equal(out.cMI_DISCOVERED_NODES, '1');
  assert.equal(out['nodes.1.inputs.01.value'], 10.2);
  assert.equal(out['nodes.1.inputs.02.value'], true);
  assert.equal(out['nodes.1.outputs.01.value'], true);
  assert.equal(out['nodes.1.outputs.02.state'], true);
  assert.equal(out['nodes.1.info.deviceName'], 'UVR16x2');
  assert.equal(runtime.dpById.get('nodes.1.inputs.01.value').role, 'value.temperature');
  assert.equal(runtime.dpById.get('nodes.1.inputs.01.value').unit, '°C');
  await driver.disconnect();
});

test('bidirectional Modbus bridge reads NexoWatt setpoints and accepts CMI feedback', async () => {
  const runtime = makeRuntime();
  const driver = new TaCmiDriver(makeAdapter(), {
    id: 'cmi1', protocol: 'taCmi',
    connection: {
      baseUrl: 'http://cmi', username: 'expert', password: 'secret', nodes: '1',
      bridgeEnabled: true, bridgePort: 1502, bridgeUnitId: 1,
      bridgeMap: [
        { direction: 'toCmi', type: 'analog', channel: 1, name: 'Vorlauf Soll', unit: '°C', scale: 0.1, alias: 'ctrl.flowSetpointC' },
        { direction: 'fromCmi', type: 'analog', channel: 1, name: 'Vorlauf Ist', unit: '°C', scale: 0.1, alias: 'r.flowTemperatureC' },
        { direction: 'toCmi', type: 'digital', channel: 1, name: 'Heizung Freigabe', alias: 'ctrl.heatingEnable' },
      ],
    },
  }, {}, {}, runtime);

  await driver.connect();
  assert.ok(lastServer);
  assert.equal(lastServer.options.port, 1502);
  assert.equal(lastServer.options.unitID, 1);

  await driver.writeDatapoint(runtime.dpById.get('bridge.toCmi.analog.01'), 21.5);
  await driver.writeDatapoint(runtime.dpById.get('bridge.toCmi.digital.01'), true);
  assert.equal(lastServer.vector.getHoldingRegister(0, 1), 215);
  assert.equal(lastServer.vector.getCoil(0, 1), true);

  await lastServer.vector.setRegister(100, encodeInt16(-123), 1);
  await lastServer.vector.setCoil(100, true, 1);
  assert.equal(runtime.values.get('devices.cmi1.bridge.fromCmi.analog.01'), -12.3);
  assert.equal(runtime.values.get('devices.cmi1.bridge.fromCmi.digital.01'), true);
  assert.ok(runtime.aliases.some(a => a.relId.endsWith('.aliases.ctrl.flowSetpointC')));
  assert.ok(runtime.aliases.some(a => a.relId.endsWith('.aliases.r.flowTemperatureC')));
  await driver.disconnect();
});

test('packaged TA CMI template is present and synchronized', () => {
  const root = path.resolve(__dirname, '..');
  const runtimeRaw = fs.readFileSync(path.join(root, 'lib/templates.json'), 'utf8');
  const adminRaw = fs.readFileSync(path.join(root, 'admin/templates.json'), 'utf8');
  assert.equal(runtimeRaw, adminRaw);
  const doc = JSON.parse(runtimeRaw);
  const template = doc.templates.find(t => t.id === 'heat.ta.cmi');
  assert.ok(template);
  assert.equal(template.manufacturer, 'Technische Alternative');
  assert.deepEqual(template.protocols, ['taCmi']);
  assert.equal(template.driverHints.pollIntervalMs, 60000);
});
