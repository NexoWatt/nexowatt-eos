'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const helper = require('./helpers/compatibilityHarness.cjs');
const DeviceRuntime = helper.loadDeviceRuntime(path.join(root, 'lib/deviceRuntime.js'));
const templatesDoc = JSON.parse(fs.readFileSync(path.join(root, 'lib/templates.json'), 'utf8'));

function templateById(id) {
  const template = templatesDoc.templates.find((entry) => entry && entry.id === id);
  assert.ok(template, `missing template ${id}`);
  return template;
}

function createRuntime() {
  const states = new Map();
  let writeCalls = 0;
  const adapter = {
    namespace: 'nexowatt-devices.0',
    log: { debug() {}, info() {}, warn() {}, error() {} },
    async setStateAsync(id, state) {
      states.set(id, { ...state });
    },
  };
  const template = templateById('evcs.abl.emh1.evcc2_3.modbusAscii');
  const runtime = new DeviceRuntime(adapter, {
    id: 'evcs1',
    templateId: template.id,
    category: template.category,
    manufacturer: template.manufacturer,
    connection: {},
  }, template, {});
  for (const dp of template.datapoints || []) {
    runtime.dpById.set(dp.id, dp);
    runtime.dpByStateRelId.set(runtime.relStateId(dp), dp);
  }
  for (const def of runtime._buildAliasDefinitions()) {
    runtime.aliasByStateRelId.set(def.relId, def);
    runtime.aliasDefs.push(def);
  }
  runtime.driver = {
    async writeDatapoint(dp, value) {
      writeCalls += 1;
      if (dp.id === 'sET_ICMAX_DUTY_CYCLE_PCT' && (Number(value) < 8 || Number(value) > 100)) {
        const error = new Error(
          `Invalid Modbus write value for ${dp.id}: ${value}. Allowed values/ranges: 8..100`,
        );
        error.nexowattOperation = 'write';
        error.nexowattDpId = dp.id;
        throw error;
      }
    },
  };
  return { runtime, states, getWriteCalls: () => writeCalls };
}

test('invalid Modbus writes are surfaced in info.lastError without rejecting the ioBroker state callback', async () => {
  const { runtime, states, getWriteCalls } = createRuntime();
  const rawDp = runtime._getDpById('sET_ICMAX_DUTY_CYCLE_PCT');
  assert.ok(rawDp);
  const fullId = `nexowatt-devices.0.${runtime.relStateId(rawDp)}`;

  // The driver rejects. DeviceRuntime catches that rejection deliberately so the
  // ioBroker state-change event loop cannot crash, and publishes the exact error.
  await assert.doesNotReject(() => runtime.handleStateChange(fullId, { val: 101, ack: false }));
  assert.equal(getWriteCalls(), 1);

  const lastError = states.get('devices.evcs1.info.lastError');
  assert.ok(lastError, 'info.lastError was not written');
  assert.equal(lastError.ack, true);
  assert.match(String(lastError.val), /Invalid Modbus write value/);
  assert.match(String(lastError.val), /Allowed values\/ranges: 8\.\.100/);

  const acknowledgedRawState = states.get(runtime.relStateId(rawDp));
  assert.equal(acknowledgedRawState, undefined, 'invalid raw command was acknowledged');
});

test('legacy and v1 ABL current aliases still target the same PWM datapoint and conversion', () => {
  const { runtime } = createRuntime();
  const legacy = runtime.aliasByStateRelId.get('devices.evcs1.aliases.ctrl.currentLimitA');
  const standard = runtime.aliasByStateRelId.get('devices.evcs1.aliases.v1.ctrl.currentLimitA');
  assert.ok(legacy);
  assert.ok(standard);
  assert.equal(legacy.writeDpId, 'sET_ICMAX_DUTY_CYCLE_PCT');
  assert.equal(standard.writeDpId, legacy.writeDpId);
  for (const ampere of [0, 6, 10, 16, 32]) {
    assert.equal(standard.toDevice(ampere), legacy.toDevice(ampere), `${ampere} A`);
  }
});
