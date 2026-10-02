'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  sanitizeStationIdentity,
  heartbeatTimeoutMs,
  activityTimeoutMs,
  deriveConnectionHealth,
  commandTimeoutMs,
  buildTriggerPayload,
  statusImpliesZero,
  chargingStateImpliesZero,
  isActualPowerOrCurrentId,
  dataFreshForEos,
  shouldRepublishCachedState,
  selectCachedStatesForRepublish,
  takeRotatingItems,
  parseDeviceModelValue,
} = require('../ocpp/freshness');
const { applyMeterValues, createAutoResponder, normalizeKey } = require('../ocpp/common');
const {
  measurementDefinition,
  canonicalMeasurand,
  canonicalPhase,
  canonicalUnitForMeasurand,
  aggregatePhaseValues,
  normalizeChargingLimit,
  chargingLimitChanged,
  deterministicInt,
  deterministicChargingProfileIds,
} = require('../ocpp/compact');
const { registerHandlers: register16 } = require('../ocpp/v16');
const { registerHandlers: register201 } = require('../ocpp/v201');
const { registerHandlers: register21 } = require('../ocpp/v21');

test('station identities are deterministic and safe for ioBroker object IDs', () => {
  assert.equal(sanitizeStationIdentity('DC_FAST_01'), 'DC_FAST_01');
  const sanitized = sanitizeStationIdentity('DC.Fast/01 West');
  assert.match(sanitized, /^DC_Fast_01_West_[0-9a-f]{8}$/);
  assert.equal(sanitized, sanitizeStationIdentity('DC.Fast/01 West'));
  assert.equal(/[.\s/]/.test(sanitized), false);
});

test('heartbeat timeout applies a bounded safety factor', () => {
  assert.equal(heartbeatTimeoutMs(60, 2.5), 150000);
  assert.equal(heartbeatTimeoutMs(0, 0), 750000);
  assert.equal(heartbeatTimeoutMs(10, 99), 100000);
  assert.equal(activityTimeoutMs(10, 1.2, 90), 90000);
  assert.equal(activityTimeoutMs(300, 2.5, 90), 750000);
});

test('socket, OCPP activity and heartbeat health remain independent', () => {
  const now = 1_000_000;
  const recentMeterValues = deriveConnectionHealth({
    now,
    socketConnected: true,
    connectedAt: now - 500_000,
    lastMessageAt: now - 10_000,
    lastHeartbeatAt: now - 200_000,
    heartbeatIntervalSec: 60,
    heartbeatTimeoutFactor: 2.5,
    activityTimeoutSec: 90,
  });
  assert.equal(recentMeterValues.socketConnected, true);
  assert.equal(recentMeterValues.activityFresh, true);
  assert.equal(recentMeterValues.online, true);
  assert.equal(recentMeterValues.heartbeatAlive, false);

  const silentButConnected = deriveConnectionHealth({
    now,
    socketConnected: true,
    connectedAt: now - 500_000,
    lastMessageAt: now - 200_000,
    lastHeartbeatAt: now - 200_000,
    heartbeatIntervalSec: 30,
    heartbeatTimeoutFactor: 2.5,
    activityTimeoutSec: 90,
  });
  assert.equal(silentButConnected.socketConnected, true);
  assert.equal(silentButConnected.activityFresh, false);
  assert.equal(silentButConnected.online, false);
  assert.equal(silentButConnected.heartbeatAlive, false);

  const disconnected = deriveConnectionHealth({
    now,
    socketConnected: false,
    lastMessageAt: now - 1_000,
    lastHeartbeatAt: now - 1_000,
    heartbeatIntervalSec: 60,
  });
  assert.deepEqual(
    { socketConnected: disconnected.socketConnected, activityFresh: disconnected.activityFresh, online: disconnected.online, heartbeatAlive: disconnected.heartbeatAlive },
    { socketConnected: false, activityFresh: false, online: false, heartbeatAlive: false },
  );
});

test('OCPP command timeout uses seconds and remains bounded', () => {
  assert.equal(commandTimeoutMs(20), 20000);
  assert.equal(commandTimeoutMs(1), 5000);
  assert.equal(commandTimeoutMs(999), 120000);
});

test('TriggerMessage payloads are protocol-correct', () => {
  assert.deepEqual(buildTriggerPayload('ocpp1.6', 'MeterValues', 2, 3), {
    requestedMessage: 'MeterValues', connectorId: 3,
  });
  assert.deepEqual(buildTriggerPayload('ocpp2.1', 'StatusNotification', 2, 3), {
    requestedMessage: 'StatusNotification', evse: { id: 2, connectorId: 3 },
  });
});

test('compact measurement names replace protocol-direction names and vendor typos', () => {
  assert.equal(measurementDefinition('Power.Active.Import').key, 'powerW');
  assert.equal(measurementDefinition('ActivePowerImport').key, 'powerW');
  assert.equal(measurementDefinition('ActivePowerInport').key, 'powerW');
  assert.equal(canonicalMeasurand('ImportActivePower'), 'Power.Active.Import');
  assert.equal(measurementDefinition('Power.Active.Import', 'L2').key, 'powerWL2');
  assert.equal(measurementDefinition('Power.Active.Import', 'L1-L2').key, 'powerWL1L2');
  assert.equal(measurementDefinition('Current.Import').key, 'currentA');
  assert.equal(measurementDefinition('Energy.Active.Import.Register').kwhKey, 'energyKWh');
  assert.equal(canonicalPhase('L1-N'), 'L1');
  assert.equal(canonicalUnitForMeasurand('ActivePowerImport'), 'W');
  assert.equal(normalizeKey('Power.Active.Import', 'L1-N', 'Cable', 'Transaction.Begin'), 'Power_Active_Import_L1_Cable_Transaction_Begin');
  assert.equal(normalizeKey('Power.Active.Import').includes('.'), false);
});

test('zero and sub-minimum charging limits cannot accidentally interrupt charging', () => {
  const previous = { requestedLimit: 11000, effectiveLimit: 11000, rateUnit: 'W', phases: 3, action: 'set' };
  const held = normalizeChargingLimit(0, 'W', 3, { zeroLimitBehavior: 'keepLast', minimumChargingCurrentA: 6, nominalVoltageV: 230 }, previous);
  assert.equal(held.action, 'hold');
  assert.equal(held.effectiveLimit, 11000);
  assert.match(held.reason, /prevent-unintended-interruption/);

  const clampedA = normalizeChargingLimit(3, 'A', 3, { minimumChargingCurrentA: 6 }, previous);
  assert.equal(clampedA.effectiveLimit, 6);
  const clampedW = normalizeChargingLimit(1000, 'W', 3, { minimumChargingCurrentA: 6, nominalVoltageV: 230 }, previous);
  assert.equal(clampedW.effectiveLimit, 4140);
  assert.equal(chargingLimitChanged(previous, { ...previous, effectiveLimit: 11050 }, { smartChargingDeadbandW: 100 }), false);
  assert.equal(deterministicInt('station-1', 'profile'), deterministicInt('station-1', 'profile'));
  const idsA = deterministicChargingProfileIds('station-1', 'eos-charge-limit', 'connector-1');
  const idsB = deterministicChargingProfileIds('station-1', 'eos-charge-limit', 'connector-1');
  const idsOtherFunction = deterministicChargingProfileIds('station-1', 'pv-emergency-limit', 'connector-1');
  assert.deepEqual(idsA, idsB);
  assert.notEqual(idsA.chargingProfileId, idsOtherFunction.chargingProfileId);
});

test('safe-zero rules only match states with no energy transfer', () => {
  assert.equal(statusImpliesZero('ocpp1.6', 'Available'), true);
  assert.equal(statusImpliesZero('ocpp1.6', 'SuspendedEVSE'), true);
  assert.equal(statusImpliesZero('ocpp1.6', 'Charging'), false);
  assert.equal(statusImpliesZero('ocpp2.1', 'Available'), true);
  assert.equal(statusImpliesZero('ocpp2.1', 'Occupied'), false);
  assert.equal(chargingStateImpliesZero('SuspendedEV'), true);
  assert.equal(chargingStateImpliesZero('Charging'), false);
  assert.equal(isActualPowerOrCurrentId('station.measurements.powerW'), true);
  assert.equal(isActualPowerOrCurrentId('station.connectors.1_1.currentA'), true);
  assert.equal(isActualPowerOrCurrentId('station.measurements.offeredPowerW'), false);
});

test('EOS freshness requires canonical active-import power or a safe zero', () => {
  assert.equal(dataFreshForEos(true, true, false), true);
  assert.equal(dataFreshForEos(true, false, true), true);
  assert.equal(dataFreshForEos(true, false, false), false);
  assert.equal(dataFreshForEos(false, true, true), false);
});

test('cached telemetry is republished per datapoint and never by unrelated freshness', () => {
  const now = 1_000_000;
  const options = { now, telemetryMaxAgeSec: 90, socMaxAgeSec: 300, safeZero: false };
  assert.equal(shouldRepublishCachedState({ category: 'realtime', updatedAt: now - 20_000 }, options), true);
  assert.equal(shouldRepublishCachedState({ category: 'realtime', updatedAt: now - 91_000 }, options), false);
  assert.equal(shouldRepublishCachedState({ category: 'soc', updatedAt: now - 299_000 }, options), true);
  assert.equal(shouldRepublishCachedState({ category: 'soc', updatedAt: now - 301_000 }, options), false);
  assert.equal(shouldRepublishCachedState({ category: 'safeZero', updatedAt: now - 500_000 }, options), false);
  assert.equal(shouldRepublishCachedState({ category: 'safeZero', updatedAt: now - 500_000 }, { ...options, safeZero: true }), true);
  assert.equal(shouldRepublishCachedState({ category: 'status', updatedAt: 0 }, options), true);
});

test('republish and connector limits rotate fairly instead of starving later entries', () => {
  const now = 1_000_000;
  const cache = new Map(Array.from({ length: 7 }, (_, index) => [
    `station.state${index}`, { category: 'status', updatedAt: now, val: index, ack: true },
  ]));
  const first = selectCachedStatesForRepublish(cache.entries(), { now, cursor: 0, limit: 3 });
  const second = selectCachedStatesForRepublish(cache.entries(), { now, cursor: first.nextCursor, limit: 3 });
  const third = selectCachedStatesForRepublish(cache.entries(), { now, cursor: second.nextCursor, limit: 3 });
  assert.deepEqual(first.entries.map(([id]) => id), ['station.state0', 'station.state1', 'station.state2']);
  assert.deepEqual(second.entries.map(([id]) => id), ['station.state3', 'station.state4', 'station.state5']);
  assert.deepEqual(third.entries.map(([id]) => id), ['station.state6', 'station.state0', 'station.state1']);

  const connectors = ['1:1', '2:1', '3:1', '4:1', '5:1'];
  const connectorsFirst = takeRotatingItems(connectors, 0, 2);
  const connectorsSecond = takeRotatingItems(connectors, connectorsFirst.nextCursor, 2);
  const connectorsThird = takeRotatingItems(connectors, connectorsSecond.nextCursor, 2);
  assert.deepEqual(connectorsFirst.items, ['1:1', '2:1']);
  assert.deepEqual(connectorsSecond.items, ['3:1', '4:1']);
  assert.deepEqual(connectorsThird.items, ['5:1', '1:1']);
});

test('Device Model values are parsed strictly', () => {
  assert.deepEqual(parseDeviceModelValue('true', 'boolean'), { type: 'boolean', val: true });
  assert.deepEqual(parseDeviceModelValue('0', 'boolean'), { type: 'boolean', val: false });
  assert.deepEqual(parseDeviceModelValue('not-boolean', 'boolean'), { type: 'boolean', val: undefined });
  assert.deepEqual(parseDeviceModelValue('12', 'integer'), { type: 'number', val: 12 });
  assert.deepEqual(parseDeviceModelValue('12.5', 'integer'), { type: 'number', val: undefined });
  assert.deepEqual(parseDeviceModelValue('12foo', 'decimal'), { type: 'number', val: undefined });
});

function createMeterContext(options = {}) {
  const connectorDetails = options.connectorDetails !== false;
  const writes = [];
  const phaseCache = new Map();
  const meterNotes = [];
  const socNotes = [];
  const connectorBase = (identity, evseId, connectorId) => `${identity}.connectors.${evseId}_${connectorId}`;
  const ctx = {
    setStateFreshAsync: async (id, val, ack, category) => writes.push({ id, val, ack, category }),
    states: {
      connectorBase,
      ensureConnectorStructure: async (identity, evseId, connectorId) => connectorDetails ? connectorBase(identity, evseId, connectorId) : undefined,
      ensureTextMeasurementState: async (identity, key) => `${identity}.measurements.${key}`,
      ensureMeasurementState: async (identity, key) => `${identity}.measurements.${key}`,
      ensureMetricState: async (identity, evseId, connectorId, key, unit, meta) => {
        if (!connectorDetails) return undefined;
        const compactKey = meta && meta.definition && !meta.definition.extra ? meta.definition.key : `extra_${key}`;
        return `${identity}.connectors.${evseId}_${connectorId}.${compactKey}`;
      },
      ensureAggState: async (identity, key) => `${identity}.measurements.${key}`,
    },
    runtime: {
      recordPhaseMetric(identity, evseId, connectorId, measurand, phase, value, unit, ts) {
        const key = `${identity}|${evseId}|${connectorId}|${canonicalMeasurand(measurand)}`;
        if (!phaseCache.has(key)) phaseCache.set(key, new Map());
        phaseCache.get(key).set(canonicalPhase(phase), { value, unit, ts });
      },
      getPhaseMetricTotal(identity, evseId, connectorId, measurand) {
        const key = `${identity}|${evseId}|${connectorId}|${canonicalMeasurand(measurand)}`;
        const samples = phaseCache.get(key);
        if (!samples || samples.size === 0) return undefined;
        return {
          value: aggregatePhaseValues(measurand, [...samples.values()].map((sample) => sample.value)),
          unit: [...samples.values()][0].unit,
        };
      },
      async noteMeterValue(identity, evseId, connectorId, timestamp, flags) { meterNotes.push({ identity, evseId, connectorId, timestamp, flags }); },
      async noteSoc(identity, timestamp) { socNotes.push({ identity, timestamp }); },
    },
  };
  return { ctx, writes, meterNotes, socNotes };
}

function lastWrite(writes, id) {
  return [...writes].reverse().find((entry) => entry.id === id);
}

test('meter values stay fresh, aggregate phases across messages and mirror Wh to kWh', async () => {
  const { ctx, writes, meterNotes, socNotes } = createMeterContext();
  const station = 'DC_01';
  const timestamp = '2026-08-12T08:00:00.000Z';

  for (const [phase, power, current] of [['L1', 1000, 4], ['L2', 1200, 5], ['L3', 1300, 6]]) {
    await applyMeterValues(ctx, station, 1, 1, [{ timestamp, sampledValue: [
      { measurand: 'Power.Active.Import', phase, value: power, unitOfMeasure: { unit: 'W' } },
      { measurand: 'Current.Import', phase, value: current, unitOfMeasure: { unit: 'A' } },
    ] }], 'ocpp2.1');
  }

  await applyMeterValues(ctx, station, 1, 1, [{ timestamp, sampledValue: [
    { measurand: 'Energy.Active.Import.Register', value: 12345, unitOfMeasure: { unit: 'Wh' } },
    { measurand: 'SoC', value: 57, unitOfMeasure: { unit: '%' } },
  ] }], 'ocpp2.1');

  assert.equal(lastWrite(writes, `${station}.measurements.powerW`).val, 3500);
  assert.equal(lastWrite(writes, `${station}.measurements.currentA`).val, 6);
  assert.equal(lastWrite(writes, `${station}.measurements.energyKWh`).val, 12.345);
  assert.equal(lastWrite(writes, `${station}.measurements.socPercent`).val, 57);
  assert.equal(lastWrite(writes, `${station}.connectors.1_1.energyKWh`).val, 12.345);
  assert.equal(meterNotes.length, 4);
  assert.equal(meterNotes.slice(0, 3).every((note) => note.flags.hasPower && note.flags.hasCurrent), true);
  assert.equal(meterNotes[3].flags.hasPower, false);
  assert.equal(meterNotes[3].flags.hasNonZeroActualFlow, false);
  assert.equal(socNotes.length, 1);

  const before = writes.filter((entry) => entry.id === `${station}.measurements.socPercent`).length;
  await applyMeterValues(ctx, station, 1, 1, [{ timestamp, sampledValue: [{ measurand: 'SoC', value: 57, unitOfMeasure: { unit: '%' } }] }], 'ocpp2.1');
  const after = writes.filter((entry) => entry.id === `${station}.measurements.socPercent`).length;
  assert.equal(after, before + 1, 'unchanged values must still be written to refresh their timestamp');
  assert.equal(meterNotes.length, 5);
  assert.equal(socNotes.length, 2);
});

test('empty or malformed MeterValues do not falsely mark telemetry as fresh', async () => {
  const { ctx, meterNotes } = createMeterContext();
  await applyMeterValues(ctx, 'DC_02', 1, 1, [{ timestamp: '2026-08-12T08:00:00.000Z', sampledValue: [
    { measurand: 'Power.Active.Import', value: 'not-a-number', unitOfMeasure: { unit: 'W' } },
  ] }], 'ocpp2.1');
  assert.equal(meterNotes.length, 0);
});

test('current or reactive power cannot falsely mark EOS active-import power as fresh', async () => {
  const { ctx, meterNotes } = createMeterContext();
  await applyMeterValues(ctx, 'DC_03', 1, 1, [{ timestamp: '2026-08-12T08:00:00.000Z', sampledValue: [
    { measurand: 'Current.Import', value: 30, unitOfMeasure: { unit: 'A' } },
    { measurand: 'Power.Reactive.Import', value: 100, unitOfMeasure: { unit: 'var' } },
  ] }], 'ocpp2.1');
  assert.equal(meterNotes.length, 1);
  assert.equal(meterNotes[0].flags.hasPower, false);
  assert.equal(meterNotes[0].flags.hasCurrent, true);
  assert.equal(meterNotes[0].flags.hasNonZeroActualFlow, true);
});

test('OCPP SampledValue defaults are mapped to energyWh and energyKWh in all versions', async () => {
  for (const [protocol, station, value] of [
    ['ocpp1.6', 'AC_16', 1234], ['ocpp2.0.1', 'DC_201', 2500], ['ocpp2.1', 'DC_21', 2500],
  ]) {
    const { ctx, writes, meterNotes } = createMeterContext();
    await applyMeterValues(ctx, station, 1, 1, [{ timestamp: '2026-08-12T08:00:00.000Z', sampledValue: [{ value }] }], protocol);
    assert.equal(lastWrite(writes, `${station}.measurements.energyWh`).val, value);
    assert.equal(lastWrite(writes, `${station}.measurements.energyKWh`).val, value / 1000);
    assert.equal(meterNotes.length, 1);
    assert.equal(meterNotes[0].flags.hasPower, false);
  }
});

test('explicit power and current measurands infer the correct unit when the station omits it', async () => {
  const { ctx, writes } = createMeterContext({ connectorDetails: false });
  await applyMeterValues(ctx, 'UNITLESS_01', 1, 1, [{ timestamp: '2026-08-12T08:00:00.000Z', sampledValue: [
    { measurand: 'ActivePowerInport', value: 7200 },
    { measurand: 'Current.Import', value: 10.5 },
  ] }], 'ocpp2.1');
  assert.equal(lastWrite(writes, 'UNITLESS_01.measurements.powerW').val, 7200);
  assert.equal(lastWrite(writes, 'UNITLESS_01.measurements.currentA').val, 10.5);
  assert.equal(writes.some((entry) => entry.id.includes('energyWh') && entry.val === 7200), false);
});

test('phase current is the limiting phase value while phase power is summed', () => {
  assert.equal(aggregatePhaseValues('Current.Import', [16, 15.5, 14]), 16);
  assert.equal(aggregatePhaseValues('Power.Active.Import', [3500, 3400, 3300]), 10200);
});

test('connector detail folders can be disabled without losing station measurements', async () => {
  const { ctx, writes } = createMeterContext({ connectorDetails: false });
  await applyMeterValues(ctx, 'COMPACT_01', 1, 1, [{ timestamp: '2026-08-12T08:00:00.000Z', sampledValue: [
    { measurand: 'Power.Active.Import', value: 11000, unitOfMeasure: { unit: 'W' } },
    { measurand: 'Energy.Active.Import.Register', value: 25000, unitOfMeasure: { unit: 'Wh' } },
  ] }], 'ocpp2.1');
  assert.equal(lastWrite(writes, 'COMPACT_01.measurements.powerW').val, 11000);
  assert.equal(lastWrite(writes, 'COMPACT_01.measurements.energyKWh').val, 25);
  assert.equal(writes.some((entry) => entry.id.includes('.connectors.')), false);
});

test('schema fallback responses fail closed instead of reporting unsupported work as accepted', () => {
  const auto201 = createAutoResponder('ocpp2.0.1');
  const auto21 = createAutoResponder('ocpp2.1');
  assert.equal(auto201('TriggerMessage', { preferFailure: true }).status, 'NotImplemented');
  assert.equal(auto21('RequestStartTransaction', { preferFailure: true }).status, 'Rejected');
});

class FakeClient {
  constructor(protocol) {
    this.protocol = protocol;
    this.identity = 'station';
    this.stateIdentity = 'station';
    this.handlers = new Map();
    this.wildcard = undefined;
  }
  handle(method, handler) {
    if (typeof method === 'function') this.wildcard = method;
    else this.handlers.set(method, handler);
  }
}

function createDeferredQueue() {
  let tail = Promise.resolve();
  const labels = [];
  return {
    labels,
    defer(identity, label, task) {
      labels.push({ identity, label });
      tail = tail.then(task);
      return true;
    },
    async flush() { await tail; },
  };
}

function registrationContext() {
  return {
    config: { heartbeatIntervalSec: 300 },
    log: { debug() {}, warn() {} },
    states: {}, runtime: {}, dp: {}, dm: {},
  };
}

test('all supported protocol versions register critical telemetry handlers and a catch-all', () => {
  const clients = [
    ['ocpp1.6', register16, ['BootNotification', 'Heartbeat', 'StatusNotification', 'MeterValues', 'StartTransaction', 'StopTransaction']],
    ['ocpp2.0.1', register201, ['BootNotification', 'Heartbeat', 'StatusNotification', 'MeterValues', 'TransactionEvent', 'NotifyEVChargingNeeds', 'NotifyReport']],
    ['ocpp2.1', register21, ['BootNotification', 'Heartbeat', 'StatusNotification', 'MeterValues', 'TransactionEvent', 'NotifyEVChargingNeeds', 'NotifyReport']],
  ];
  for (const [protocol, register, expected] of clients) {
    const client = new FakeClient(protocol);
    register(client, registrationContext());
    for (const method of expected) assert.equal(client.handlers.has(method), true, `${protocol} missing ${method}`);
    assert.equal(typeof client.wildcard, 'function', `${protocol} missing catch-all handler`);
  }
});

test('OCPP acknowledgements are returned before datapoint processing runs', async () => {
  const client = new FakeClient('ocpp2.1');
  const pending = [];
  const writes = [];
  const ctx = {
    config: { heartbeatIntervalSec: 300 },
    log: { debug() {}, warn() {} },
    defer(identity, label, task) { pending.push({ identity, label, task }); return true; },
    setStateFreshAsync: async (...args) => writes.push(args),
    states: {
      connectorBase: () => 'station.connectors.1_1',
      ensureConnectorStructure: async () => undefined,
      ensureTextMeasurementState: async () => 'station.measurements.lastUpdate',
      ensureMeasurementState: async (identity, key) => `${identity}.measurements.${key}`,
      ensureMetricState: async () => undefined,
    },
    runtime: { noteMessage() {}, noteMeterValue() {} },
    dp: { async capture() {} }, dm: {},
  };
  register21(client, ctx);
  const response = await client.handlers.get('MeterValues')({ params: {
    evseId: 1, connectorId: 1,
    meterValue: [{ sampledValue: [{ measurand: 'Power.Active.Import', value: 11000, unitOfMeasure: { unit: 'W' } }] }],
  } });
  assert.deepEqual(response, {});
  assert.equal(writes.length, 0, 'no ioBroker write may block the OCPP CALLRESULT');
  assert.equal(pending.some((item) => item.label === 'MeterValues'), true);
  for (const item of pending) await item.task();
  assert.equal(writes.some((args) => args[0] === 'station.measurements.powerW'), true);
});

test('OCPP 1.6 keeps concurrent transactions mapped to their original connector', async () => {
  const client = new FakeClient('ocpp1.6');
  const events = [];
  const writes = [];
  const queue = createDeferredQueue();
  const ctx = {
    config: { heartbeatIntervalSec: 300 }, log: { debug() {}, warn() {} }, defer: queue.defer,
    setStateFreshAsync: async (id, val, ack, category) => writes.push({ id, val, ack, category }),
    states: {
      async pushTransactionEvent(identity, event) { events.push({ identity, ...event }); },
      connectorBase: (identity, evseId, connectorId) => `${identity}.connectors.${evseId}_${connectorId}`,
      ensureConnectorStructure: async (identity, evseId, connectorId) => `${identity}.connectors.${evseId}_${connectorId}`,
    },
    runtime: { noteMessage() {} }, dp: { async capture() {} },
  };
  register16(client, ctx);

  const first = await client.handlers.get('StartTransaction')({ params: { connectorId: 1, idTag: 'RFID-1', meterStart: 1000, timestamp: '2026-08-12T08:00:00.000Z' } });
  const second = await client.handlers.get('StartTransaction')({ params: { connectorId: 2, idTag: 'RFID-2', meterStart: 2000, timestamp: '2026-08-12T08:01:00.000Z' } });
  assert.notEqual(first.transactionId, second.transactionId);
  assert.equal(client._transactions.size, 2);

  await client.handlers.get('StopTransaction')({ params: { transactionId: first.transactionId, meterStop: 1500, reason: 'Local' } });
  assert.equal(client._transactions.has(String(first.transactionId)), false);
  assert.equal(client._transactions.has(String(second.transactionId)), true);
  await queue.flush();

  const stop = events.find((event) => event.type === 'Stop');
  assert.equal(stop.connectorId, 1);
  assert.equal(stop.idTag, 'RFID-1');
  assert.equal(lastWrite(writes, 'station.connectors.1_1.energyKWh').val, 1);
  assert.equal(lastWrite(writes, 'station.connectors.1_2.energyKWh').val, 2);
});

test('status side effects run in order and are awaited inside the deferred task', async () => {
  const client = new FakeClient('ocpp2.1');
  const pending = [];
  const order = [];
  let releaseStatus;
  const statusGate = new Promise((resolve) => { releaseStatus = resolve; });
  const ctx = {
    config: { heartbeatIntervalSec: 300, captureRawMessages: false },
    log: { debug() {}, warn() {} },
    defer(identity, label, task) { pending.push({ identity, label, task }); return true; },
    states: {
      async upsertEvseState() { order.push('state'); },
    },
    runtime: {
      noteMessage() {},
      async noteStatus() {
        order.push('status-start');
        await statusGate;
        order.push('status-end');
      },
    },
    dp: {}, dm: {},
  };
  register21(client, ctx);
  const response = await client.handlers.get('StatusNotification')({ params: {
    evseId: 1, connectorId: 1, connectorStatus: 'Available', timestamp: '2026-08-12T08:00:00.000Z',
  } });
  assert.deepEqual(response, {});
  assert.deepEqual(order, [], 'CALLRESULT must be returned before ioBroker status processing');
  const deferred = pending.find((item) => item.label === 'StatusNotification');
  assert.ok(deferred);
  const running = deferred.task();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(order, ['state', 'status-start']);
  releaseStatus();
  await running;
  assert.deepEqual(order, ['state', 'status-start', 'status-end']);
});

test('NotifyEVChargingNeeds maps DC SoC into the compact vehicle and measurement tree', async () => {
  const client = new FakeClient('ocpp2.1');
  const writes = [];
  const socNotes = [];
  const ensured = [];
  const queue = createDeferredQueue();
  const ctx = {
    config: { heartbeatIntervalSec: 300 }, log: { debug() {}, warn() {} }, defer: queue.defer,
    setStateFreshAsync: async (id, val, ack, category) => writes.push({ id, val, ack, category }),
    states: {
      ensureStructure: async (...args) => ensured.push(args),
      ensureMeasurementState: async (identity, key) => `${identity}.measurements.${key}`,
      ensureAggState: async (identity, key) => `${identity}.measurements.${key}`,
    },
    runtime: { noteMessage() {}, noteSoc(identity, timestamp) { socNotes.push({ identity, timestamp }); } },
    dp: { async capture() {} }, dm: {},
  };
  register21(client, ctx);

  const response = await client.handlers.get('NotifyEVChargingNeeds')({ params: {
    evseId: 2, maxScheduleTuples: 8, timestamp: '2099-01-01T00:00:00.000Z',
    chargingNeeds: {
      requestedEnergyTransfer: 'DC', departureTime: '2026-08-12T12:00:00.000Z',
      dcChargingParameters: { stateOfCharge: '62', fullSoC: 100, bulkSoC: 80, energyAmount: 25000, evEnergyCapacity: 80000, evMaxPower: 120000, evMaxCurrent: 300, evMaxVoltage: 920 },
      v2xChargingParameters: { targetSoC: 85 },
    },
  } });
  assert.deepEqual(response, { status: 'Accepted' });
  assert.equal(writes.length, 0, 'the protocol response is not delayed by state writes');
  await queue.flush();
  assert.deepEqual(ensured, [['station', 2, 1]]);
  assert.equal(lastWrite(writes, 'station.vehicle.socPercent').val, 62);
  assert.equal(lastWrite(writes, 'station.vehicle.targetSocPercent').val, 85);
  assert.equal(lastWrite(writes, 'station.vehicle.energyRequestWh').val, 25000);
  assert.equal(lastWrite(writes, 'station.measurements.socPercent').val, 62);
  assert.equal(socNotes.length, 1);
});
