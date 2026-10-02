'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const root = path.resolve(__dirname, '..');
const runtimeTemplatesRaw = fs.readFileSync(path.join(root, 'lib/templates.json'), 'utf8');
const adminTemplatesRaw = fs.readFileSync(path.join(root, 'admin/templates.json'), 'utf8');
const runtimeContractRaw = fs.readFileSync(path.join(root, 'lib/alias-contract-v1.json'), 'utf8');
const adminContractRaw = fs.readFileSync(path.join(root, 'admin/alias-contract-v1.json'), 'utf8');
const templatesDoc = JSON.parse(runtimeTemplatesRaw);
const contract = JSON.parse(runtimeContractRaw);

function loadDeviceRuntime() {
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'modbus-serial') return class ModbusRTU {};
    if (request === 'serialport') return { SerialPort: class SerialPort {} };
    if (request === 'mqtt') return { connect() { throw new Error('not used in alias contract test'); } };
    if (request === 'axios') return {};
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const modulePath = require.resolve('../lib/deviceRuntime');
    delete require.cache[modulePath];
    return require('../lib/deviceRuntime').DeviceRuntime;
  } finally {
    Module._load = originalLoad;
  }
}

const DeviceRuntime = loadDeviceRuntime();
const {
  getAliasSpec,
  getDeviceClass,
  legacyAliasPath,
} = require('../lib/aliasContract');

function logStub() {
  return { debug() {}, info() {}, warn() {}, error() {} };
}

function buildRuntime(template, id = 'device1', adapter = { log: logStub() }) {
  const runtime = new DeviceRuntime(adapter, {
    id,
    templateId: template.id,
    category: template.category,
    manufacturer: template.manufacturer,
    connection: {},
  }, template, {});

  for (const dp of template.datapoints || []) {
    runtime.dpById.set(dp.id, dp);
    runtime.dpByStateRelId.set(runtime.relStateId(dp), dp);
  }
  return runtime;
}

function buildAliases(template, id = 'device1') {
  const runtime = buildRuntime(template, id);
  const definitions = runtime._buildAliasDefinitions();
  const prefix = `devices.${id}.aliases.`;
  const byPath = new Map();
  for (const def of definitions) {
    if (def && String(def.relId).startsWith(prefix)) {
      byPath.set(String(def.relId).slice(prefix.length), def);
    }
  }
  return { runtime, definitions, byPath };
}

function templateById(id) {
  const template = templatesDoc.templates.find(item => item && item.id === id);
  assert.ok(template, `missing template ${id}`);
  return template;
}

function alias(byPath, aliasPath) {
  const def = byPath.get(aliasPath);
  assert.ok(def, `missing alias ${aliasPath}`);
  return def;
}

function mergeObject(existing, update) {
  const base = existing || {};
  return {
    ...base,
    ...update,
    common: { ...(base.common || {}), ...(update.common || {}) },
    native: { ...(base.native || {}), ...(update.native || {}) },
  };
}

function createAdapterHarness() {
  const objects = new Map();
  const states = new Map();
  return {
    objects,
    states,
    log: logStub(),
    async setObjectNotExistsAsync(id, object) {
      if (!objects.has(id)) objects.set(id, structuredClone(object));
    },
    async extendObjectAsync(id, object) {
      objects.set(id, mergeObject(objects.get(id), structuredClone(object)));
    },
    async setStateAsync(id, state) {
      states.set(id, { ...state });
    },
    async getStateAsync(id) {
      return states.get(id) || null;
    },
  };
}

test('Alias Contract v1 files are synchronized and every template declares an explicit device class', () => {
  assert.equal(runtimeTemplatesRaw, adminTemplatesRaw);
  assert.equal(runtimeContractRaw, adminContractRaw);
  assert.equal(contract.contractId, 'nexowatt-device-alias-contract');
  assert.equal(contract.schemaVersion, 1);
  assert.equal(contract.status, 'stable');
  assert.equal(contract.namespace, 'v1');
  assert.equal(contract.standardPath, 'aliases.v1');
  assert.equal(contract.legacyAliasesPreserved, true);
  assert.equal(templatesDoc.templates.length, 195); // 192 existing profiles + 3 DEYE families

  for (const template of templatesDoc.templates) {
    const expectedClass = contract.categoryToDeviceClass[String(template.category || '').toUpperCase()] || 'generic';
    assert.deepEqual(template.aliasContract, {
      schemaVersion: 1,
      namespace: 'v1',
      deviceClass: expectedClass,
    }, template.id);
    assert.equal(getDeviceClass(template, {}), expectedClass, template.id);
  }
});

test('all 195 templates satisfy the canonical path, type, role and unit contract', () => {
  let standardAliasCount = 0;
  const classCounts = new Map();

  for (const template of templatesDoc.templates) {
    const { runtime, definitions } = buildAliases(template, 'audit');
    assert.deepEqual(runtime.aliasContractInfo.missingRequired, [], template.id);

    const standardDefs = definitions.filter(def => String(def.relId).includes('.aliases.v1.'));
    standardAliasCount += standardDefs.length;
    classCounts.set(runtime.aliasDeviceClass, (classCounts.get(runtime.aliasDeviceClass) || 0) + 1);

    const seen = new Set();
    for (const def of standardDefs) {
      assert.ok(!seen.has(def.relId), `${template.id}: duplicate ${def.relId}`);
      seen.add(def.relId);

      const canonicalPath = legacyAliasPath(def.relId);
      const spec = getAliasSpec(runtime.aliasDeviceClass, canonicalPath);
      assert.ok(spec, `${template.id}: no contract definition for ${canonicalPath}`);
      assert.equal(def.aliasContractVersion, 1, `${template.id}: ${canonicalPath}`);
      assert.equal(def.aliasContractPath, canonicalPath, `${template.id}: ${canonicalPath}`);
      assert.equal(def.type, spec.type, `${template.id}: type ${canonicalPath}`);
      assert.equal(def.role, spec.role, `${template.id}: role ${canonicalPath}`);
      assert.equal(def.unit || '', spec.unit || '', `${template.id}: unit ${canonicalPath}`);
      assert.equal(def.capability, spec.capability, `${template.id}: capability ${canonicalPath}`);
    }
  }

  assert.equal(standardAliasCount, 2463); // 2454 existing + 7 VARTA error codes + 2 temperatures
  assert.deepEqual(Object.fromEntries([...classCounts.entries()].sort()), {
    battery: 12,
    batteryInverter: 3,
    evCharger: 31,
    generic: 4,
    heat: 6,
    io: 14,
    meter: 55,
    pvInverter: 31,
    solarCharger: 2,
    storageSystem: 37,
  });
});

test('the v1 namespace converts vendor units to W, Wh, A, V, °C, seconds, percent and Hz', () => {
  const { byPath } = buildAliases(templateById('ess.fenecon.FeneconHomeEssImpl'));

  assert.equal(alias(byPath, 'v1.r.voltage').unit, 'V');
  assert.equal(alias(byPath, 'v1.r.voltage').fromDevice(52000), 52);
  assert.equal(alias(byPath, 'v1.r.pvPower').fromDevice(1.5), 1500);
  assert.equal(alias(byPath, 'v1.r.energyCharge').fromDevice(1.25), 1250);

  assert.equal(alias(byPath, 'v1.ctrl.powerSetpointW').toDevice(2500), 2.5);
  assert.equal(alias(byPath, 'v1.ctrl.powerSetpointW').toDevice(-2500), -2.5);
  assert.equal(alias(byPath, 'v1.ctrl.chargePowerW').toDevice(2500), -2.5);
  assert.equal(alias(byPath, 'v1.ctrl.dischargePowerW').toDevice(2500), 2.5);
  assert.equal(alias(byPath, 'v1.ctrl.gridSetpointW').toDevice(5000), 5);
  assert.equal(alias(byPath, 'v1.ctrl.gridSetpointW').toDevice(-5000), -5);
  assert.equal(alias(byPath, 'v1.ctrl.napSetpointW').writeDpId, 'sET_GRID_ACTIVE_POWER');
});

test('manufacturer-specific EV control semantics remain intact behind canonical aliases', () => {
  const { byPath } = buildAliases(templateById('evcs.abl.emh1.evcc2_3.modbusAscii'));
  const control = alias(byPath, 'v1.ctrl.currentLimitA');
  const readback = alias(byPath, 'v1.r.currentLimitA');

  assert.equal(control.unit, 'A');
  assert.equal(control.writeDpId, 'sET_ICMAX_DUTY_CYCLE_PCT');
  assert.equal(control.toDevice(0), 100);
  assert.equal(control.toDevice(6), 10);
  assert.equal(control.toDevice(16), 26.6);
  assert.equal(readback.fromDevice(26.6), 16);
  assert.equal(readback.fromDevice(100), 0);
});

test('CHARGER and DC_CHARGER are solar chargers and can never appear as EV wallboxes', () => {
  for (const id of [
    'charger.goodwe.AbstractGoodWeEtCharger',
    'dc_charger.victron.VictronDcChargerImpl',
  ]) {
    const { runtime, byPath } = buildAliases(templateById(id));
    assert.equal(runtime.aliasDeviceClass, 'solarCharger');
    assert.ok(byPath.has('v1.r.power'), id);
    assert.ok(byPath.has('v1.r.voltage'), id);
    assert.ok(byPath.has('v1.r.current'), id);
    assert.ok(!byPath.has('v1.ctrl.currentLimitA'), id);
    assert.ok(!byPath.has('v1.ctrl.run'), id);
    assert.ok(!runtime.aliasContractInfo.capabilities.includes('write.currentLimitA'), id);
  }
});

test('dynamic TA CMI aliases are mirrored into canonical heat paths and refresh the manifest', async () => {
  const adapter = createAdapterHarness();
  const template = templateById('heat.ta.cmi');
  const runtime = buildRuntime(template, 'cmi1', adapter);
  runtime._buildAliasDefinitions();

  const dynamicDps = [
    { id: 'bridge.toCmi.analog.01', type: 'number', role: 'level.temperature', unit: '°C', rw: 'rw' },
    { id: 'bridge.fromCmi.analog.01', type: 'number', role: 'value.temperature', unit: '°C', rw: 'ro' },
    { id: 'bridge.toCmi.digital.01', type: 'boolean', role: 'switch', rw: 'rw' },
  ];
  for (const dp of dynamicDps) {
    runtime.dpById.set(dp.id, dp);
  }

  await runtime.registerDynamicAlias({
    relId: 'devices.cmi1.aliases.ctrl.flowSetpointC',
    name: 'Flow setpoint',
    type: 'number',
    role: 'level.temperature',
    unit: '°C',
    rw: 'rw',
    kind: 'dp',
    dpId: dynamicDps[0].id,
    writeDpId: dynamicDps[0].id,
  });
  await runtime.registerDynamicAlias({
    relId: 'devices.cmi1.aliases.r.flowTemperatureC',
    name: 'Flow temperature',
    type: 'number',
    role: 'value.temperature',
    unit: '°C',
    rw: 'ro',
    kind: 'dp',
    dpId: dynamicDps[1].id,
  });
  await runtime.registerDynamicAlias({
    relId: 'devices.cmi1.aliases.ctrl.heatingEnable',
    name: 'Heating enable',
    type: 'boolean',
    role: 'switch',
    rw: 'rw',
    kind: 'dp',
    dpId: dynamicDps[2].id,
    writeDpId: dynamicDps[2].id,
  });

  const flowSetpoint = runtime.aliasByStateRelId.get('devices.cmi1.aliases.v1.ctrl.flowSetpoint');
  const flowTemperature = runtime.aliasByStateRelId.get('devices.cmi1.aliases.v1.r.flowTemp');
  const run = runtime.aliasByStateRelId.get('devices.cmi1.aliases.v1.ctrl.run');
  assert.ok(flowSetpoint);
  assert.ok(flowTemperature);
  assert.ok(run);
  assert.equal(flowSetpoint.capability, 'write.flowSetpoint');
  assert.equal(flowTemperature.capability, 'read.flowTemp');
  assert.equal(run.capability, 'write.run');

  await new Promise(resolve => setTimeout(resolve, 90));
  const manifestState = adapter.states.get('devices.cmi1.aliases.meta.manifest');
  assert.ok(manifestState);
  const manifest = JSON.parse(manifestState.val);
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.deviceClass, 'heat');
  assert.ok(manifest.capabilities.includes('write.flowSetpoint'));
  assert.ok(manifest.capabilities.includes('read.flowTemp'));
  assert.ok(manifest.capabilities.includes('write.run'));
});

test('device initialization creates v1 objects, heartbeat states and machine-readable metadata', async () => {
  const adapter = createAdapterHarness();
  const template = templateById('evcs.abl.emh1.evcc2_3.modbusAscii');
  const runtime = buildRuntime(template, 'evcs1', adapter);

  await runtime.initObjects();

  const currentLimitObject = adapter.objects.get('devices.evcs1.aliases.v1.ctrl.currentLimitA');
  assert.ok(currentLimitObject);
  assert.equal(currentLimitObject.common.type, 'number');
  assert.equal(currentLimitObject.common.role, 'level.current');
  assert.equal(currentLimitObject.common.unit, 'A');
  assert.equal(currentLimitObject.common.write, true);
  assert.equal(currentLimitObject.native.aliasContractVersion, 1);
  assert.equal(currentLimitObject.native.aliasContractPath, 'ctrl.currentLimitA');
  assert.equal(currentLimitObject.native.capability, 'write.currentLimitA');
  assert.equal(currentLimitObject.native.deviceClass, 'evCharger');

  const heartbeatObject = adapter.objects.get('devices.evcs1.aliases.v1.r.lastSeenMs');
  assert.ok(heartbeatObject);
  assert.equal(heartbeatObject.common.unit, 'ms');
  assert.equal(heartbeatObject.native.aliasContractVersion, 1);

  const namespaceObject = adapter.objects.get('devices.evcs1.aliases.v1');
  assert.ok(namespaceObject);
  assert.equal(namespaceObject.common.name, 'Alias Contract v1');
  assert.equal(namespaceObject.native.deviceClass, 'evCharger');

  const manifestState = adapter.states.get('devices.evcs1.aliases.meta.manifest');
  assert.ok(manifestState);
  const manifest = JSON.parse(manifestState.val);
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.namespace, 'v1');
  assert.equal(manifest.deviceClass, 'evCharger');
  assert.equal(manifest.templateId, template.id);
  assert.deepEqual(manifest.missingRequired, []);
  assert.ok(manifest.capabilities.includes('write.currentLimitA'));
  assert.ok(manifest.capabilities.includes('read.online'));
});
