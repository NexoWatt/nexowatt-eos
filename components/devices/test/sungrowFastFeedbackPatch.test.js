'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  isSungrowResidentialRuntime,
  configureSungrowRuntime,
  pollSungrowFeedbackOnce,
} = require('../lib/sungrowFastFeedbackPatch');

function makeRuntime(rawValue) {
  const states = new Map();
  const batteryDp = {
    id: 'bATTERY_POWER',
    unit: 'W',
    source: {
      kind: 'modbus',
      fc: 3,
      address: 13020,
      length: 1,
      dataType: 'int16',
    },
  };
  const runtime = {
    started: true,
    cfg: { enabled: true, id: 'ess1', templateId: 'ess.sungrow.ResidentialHybridV119', protocol: 'modbusTcp', pollIntervalMs: 5000, connection: {} },
    template: {
      id: 'ess.sungrow.ResidentialHybridV119',
      manufacturer: 'Sungrow',
      model: 'Residential Hybrid Inverter',
      driverHints: { polling: { fastIntervalMs: 2000 }, modbus: { commandCadenceMs: 250, writeThrottleMs: 1000, minCommandIntervalMs: 1000 } },
    },
    dpById: new Map([['bATTERY_POWER', batteryDp]]),
    aliasDefs: [
      { relId: 'devices.ess1.aliases.r.power', kind: 'dp', dpId: 'bATTERY_POWER' },
      {
        relId: 'devices.ess1.aliases.r.powerCharge',
        kind: 'computed',
        get: values => Math.max(0, -Number(values.bATTERY_POWER || 0)),
      },
      {
        relId: 'devices.ess1.aliases.r.powerDischarge',
        kind: 'computed',
        get: values => Math.max(0, Number(values.bATTERY_POWER || 0)),
      },
    ],
    _getDpById(id) { return this.dpById.get(id); },
    getDatapoints() { return [...this.dpById.values()]; },
    relStateId(dp) { return `devices.ess1.${dp.id}`; },
    _getRoundingDecimals() { return 0; },
    async _setStateCached(id, value) { states.set(id, value); },
    async _tickHeartbeatFromIncomingData() {},
    driver: {
      wordOrder: 'be',
      byteOrder: 'be',
      _addr(src) { return src.address; },
      _sourceUnitId() { return 1; },
      async _mbReadHoldingRegisters() { return { data: [rawValue & 0xffff] }; },
      _applyTransforms(value) { return value; },
    },
    states,
  };
  return runtime;
}

test('detects only the Sungrow residential hybrid runtime', () => {
  const runtime = makeRuntime(500);
  assert.equal(isSungrowResidentialRuntime(runtime), true);
  runtime.template.manufacturer = 'Other';
  assert.equal(isSungrowResidentialRuntime(runtime), false);
});

test('enforces Sungrow one-second polling and separates writes from full polls', () => {
  const runtime = makeRuntime(500);
  assert.equal(configureSungrowRuntime(runtime), true);
  assert.equal(runtime.cfg.pollIntervalMs, 1000);
  assert.equal(runtime.cfg.connection.minCommandIntervalMs, 200);
  assert.equal(runtime.template.driverHints.polling.fastIntervalMs, 1000);
  assert.equal(runtime.template.driverHints.polling.forceFastIntervalMs, 1000);
  assert.equal(runtime.template.driverHints.polling.fixedFastCadence, true);
  assert.equal(runtime.template.driverHints.modbus.commandCadenceMs, 0);
  assert.equal(runtime.template.driverHints.modbus.writeThrottleMs, 250);
  assert.equal(runtime.template.driverHints.modbus.minCommandIntervalMs, 200);
  assert.equal(runtime.template.driverHints.modbus.sungrowFastFeedback.intervalMs, 1000);
  assert.equal(runtime.template.driverHints.modbus.sungrowFastFeedback.afterWriteOnly, true);
});

test('priority feedback updates exact power without 500 W quantisation', async () => {
  const runtime = makeRuntime(2733);
  await pollSungrowFeedbackOnce(runtime);
  assert.equal(runtime.states.get('devices.ess1.bATTERY_POWER'), 2733);
  assert.equal(runtime.states.get('devices.ess1.aliases.r.power'), 2733);
  assert.equal(runtime.states.get('devices.ess1.aliases.r.powerDischarge'), 2733);
});

test('zero remains zero and is never replaced by a fallback', async () => {
  const runtime = makeRuntime(0);
  await pollSungrowFeedbackOnce(runtime);
  assert.equal(runtime.states.get('devices.ess1.bATTERY_POWER'), 0);
  assert.equal(runtime.states.get('devices.ess1.aliases.r.power'), 0);
  assert.equal(runtime.states.get('devices.ess1.aliases.r.powerCharge'), 0);
  assert.equal(runtime.states.get('devices.ess1.aliases.r.powerDischarge'), 0);
});

test('negative charge feedback remains exact', async () => {
  const raw = (-731) & 0xffff;
  const runtime = makeRuntime(raw);
  await pollSungrowFeedbackOnce(runtime);
  assert.equal(runtime.states.get('devices.ess1.bATTERY_POWER'), -731);
  assert.equal(runtime.states.get('devices.ess1.aliases.r.powerCharge'), 731);
  assert.equal(runtime.states.get('devices.ess1.aliases.r.powerDischarge'), 0);
});

test('packaged Sungrow template keeps 0.5.133 direction mapping and one-second fast profile', () => {
  const root = path.resolve(__dirname, '..');
  const runtimeTemplates = JSON.parse(fs.readFileSync(path.join(root, 'lib', 'templates.json'), 'utf8'));
  const adminTemplates = fs.readFileSync(path.join(root, 'admin', 'templates.json'), 'utf8');
  assert.equal(fs.readFileSync(path.join(root, 'lib', 'templates.json'), 'utf8'), adminTemplates);

  const template = runtimeTemplates.templates.find(t => t.id === 'ess.sungrow.ResidentialHybridV119');
  assert.ok(template);
  const polling = template.driverHints.polling;
  const modbus = template.driverHints.modbus;
  assert.equal(polling.fastIntervalMs, 1000);
  assert.equal(polling.forceFastIntervalMs, 1000);
  assert.equal(polling.fixedFastCadence, true);
  assert.equal(modbus.minCommandIntervalMs, 200);

  const controls = [...modbus.sungrowSignedPowerControls, modbus.sungrowSignedPowerControl];
  for (const control of controls) {
    assert.equal(control.chargeValue, 170);
    assert.equal(control.dischargeValue, 187);
    assert.equal(control.stopValue, 204);
    assert.equal(control.positiveIsCharge, false);
  }
});

test('Sungrow fast datapoints form four register groups for a one-second TCP snapshot', () => {
  const root = path.resolve(__dirname, '..');
  const data = JSON.parse(fs.readFileSync(path.join(root, 'lib', 'templates.json'), 'utf8'));
  const template = data.templates.find(t => t.id === 'ess.sungrow.ResidentialHybridV119');
  const ids = new Set(template.driverHints.polling.fastDpIds);
  const items = template.datapoints
    .filter(dp => ids.has(dp.id))
    .map(dp => {
      const src = dp.source.read || dp.source;
      return { id: dp.id, addr: Number(src.address), end: Number(src.address) + Number(src.length || 1) - 1 };
    })
    .sort((a, b) => a.addr - b.addr);

  const groups = [];
  let current = null;
  for (const item of items) {
    if (!current) {
      current = { start: item.addr, end: item.end, ids: [item.id] };
      continue;
    }
    const newEnd = Math.max(current.end, item.end);
    const span = newEnd - current.start + 1;
    if (span <= 40) {
      current.end = newEnd;
      current.ids.push(item.id);
    } else {
      groups.push(current);
      current = { start: item.addr, end: item.end, ids: [item.id] };
    }
  }
  if (current) groups.push(current);

  assert.equal(groups.length, 4);
  assert.deepEqual(groups.map(g => [g.start, g.end]), [
    [5016, 5017],
    [5213, 5214],
    [5600, 5601],
    [12999, 13034],
  ]);
  // Four request starts at 0/200/400/600 ms leave margin inside the 1000 ms target.
  assert.equal((groups.length - 1) * template.driverHints.modbus.minCommandIntervalMs, 600);
});

