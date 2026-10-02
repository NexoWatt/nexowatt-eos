#!/usr/bin/env node
'use strict';

/**
 * Regression C3.5 – BHKW/Generator:
 * - eindeutige Owner und Arbiter-Schreibpfade,
 * - Pulse, 2-Draht-Level und einzelner Run-Level,
 * - frischer SoC/NVP und rekonstruierte Mindestlaufzeiten,
 * - Laufstatus-Fallback aus Leistung,
 * - Readback/Retry/Fault-Vertrag ohne Endlosschleife,
 * - Erzeuger reservieren kein Verbrauchsbudget.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { BhkwControlModule } = require('../ems/modules/bhkw-control');
const { GeneratorControlModule } = require('../ems/modules/generator-control');
const {
  installActuatorShadowArbiter,
  withActuatorShadowContext,
  priorityForOwner,
} = require('../ems/services/actuator-shadow-arbiter');

class FakeAdapter {
  constructor({ kind = 'bhkw', devices = [], soc = 20, nvpW = 1000, topology = 'single', farmSoc = null, farmSocAgeMs = 0 } = {}) {
    this.namespace = 'nexowatt-ui.0';
    this.config = {
      diagnostics: { actuatorArbiterMode: 'enforce-safety' },
      datapoints: { storageSoc: 'storage.soc' },
      storage: { datapoints: {} },
      [kind]: { devices },
    };
    this.local = new Map();
    this.foreign = new Map();
    this.storageTopology = topology;
    this.storageAuthorityReason = topology === 'farm'
      ? 'writable-farm-active'
      : (topology === 'single' ? 'single-active' : 'no-active-storage-output');
    if (farmSoc !== null && farmSoc !== undefined) {
      const now = Date.now();
      this.local.set('storageFarm.totalSocOnline', { val: farmSoc, ack: true, ts: now - farmSocAgeMs, lc: now - farmSocAgeMs });
      this.local.set('storageFarm.totalSoc', { val: farmSoc, ack: true, ts: now - farmSocAgeMs, lc: now - farmSocAgeMs });
    }
    this.objects = new Map();
    this.writes = [];
    this.timers = [];
    this.log = { debug() {}, info() {}, warn() {}, error() {} };
    this._nwShuttingDown = false;
    this.soc = soc;
    this.reserveCalls = [];
    this._emsBudget = { reserve: (row) => { this.reserveCalls.push(row); return row; } };
    this._nvpFreshnessSnapshot = {
      ts: Date.now(), usable: true, connected: true, netW: nvpW,
      status: 'ok', source: 'signed', measurementAgeMs: 0, heartbeatAgeMs: 0,
    };
    this._stageAActuatorOwnerById = {};
  }
  async setObjectNotExistsAsync(id, object) { if (!this.objects.has(id)) this.objects.set(id, object); }
  async setStateAsync(id, value, ack) {
    const now = Date.now();
    const row = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val')
      ? { ...value, ts: value.ts || now, lc: value.lc || now }
      : { val: value, ack: ack === true, ts: now, lc: now };
    this.local.set(id, row);
    return true;
  }
  async getStateAsync(id) { return this.local.get(id) || null; }
  async setForeignStateAsync(id, value, ack) {
    const now = Date.now();
    const row = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val')
      ? { ...value, ts: value.ts || now, lc: value.lc || now }
      : { val: value, ack: ack === true, ts: now, lc: now };
    this.foreign.set(id, row);
    this.writes.push({ id, value: row.val, ack: row.ack, ts: now });
    return true;
  }
  async getForeignStateAsync(id) { return this.foreign.get(id) || null; }
  updateValue() {}
  _nwGetCacheAgeMs(key) { return key === 'storageSoc' ? 0 : null; }
  _nwGetNumberFromCacheFresh(key, maxAge, fallback) { return key === 'storageSoc' ? this.soc : fallback; }
  _nwGetStorageFarmRuntimeInfo() {
    const active = this.storageTopology === 'farm';
    return { active, dispatchActive: active, configuredCount: active ? 2 : 0, writableCount: active ? 2 : 0 };
  }
  _nwGetStorageControlAuthority() {
    return {
      selectedTopology: this.storageTopology,
      writerActive: this.storageTopology !== 'none',
      reason: this.storageAuthorityReason,
    };
  }
  _nwSetTimeout(fn, ms) { const timer = { fn, ms }; this.timers.push(timer); return timer; }
  _nwClearTimeout(timer) { this.timers = this.timers.filter((row) => row !== timer); }
}

function state(value, { ageMs = 0, changeAgeMs = ageMs, ack = true } = {}) {
  const now = Date.now();
  return { val: value, ack, ts: now - ageMs, lc: now - changeAgeMs };
}

function device(overrides = {}) {
  return {
    idx: 1,
    enabled: true,
    name: 'Testquelle',
    showInLive: true,
    userCanControl: true,
    startWriteId: 'device.start',
    stopWriteId: 'device.stop',
    runWriteId: '',
    runningReadId: 'device.running',
    powerReadId: 'device.power',
    powerScale: 1,
    socStartPct: 25,
    socStopPct: 60,
    minRunMin: 0,
    minOffMin: 0,
    maxAgeSec: 30,
    socMaxAgeSec: 60,
    gridMaxAgeSec: 15,
    commandType: 'pulse',
    pulseMs: 800,
    requireReadback: false,
    commandTimeoutSec: 1,
    retryDelaySec: 1,
    maxRetries: 1,
    faultLockSec: 10,
    requireGridImportForAutoStart: false,
    gridImportStartW: 0,
    stopOnGridExportW: 0,
    runningPowerThresholdW: 100,
    ...overrides,
  };
}

async function makeModule(kind, row, options = {}) {
  const adapter = new FakeAdapter({
    kind,
    devices: [row],
    soc: options.soc ?? 20,
    nvpW: options.nvpW ?? 1000,
    topology: options.topology ?? 'single',
    farmSoc: options.farmSoc ?? null,
    farmSocAgeMs: options.farmSocAgeMs ?? 0,
  });
  adapter.foreign.set('device.running', state(options.running ?? false, { changeAgeMs: options.runningSinceMs ?? 0 }));
  adapter.foreign.set('device.power', state(options.powerW ?? 0));
  adapter.local.set(`${kind}.user.${kind === 'bhkw' ? 'b1' : 'g1'}.mode`, state(options.mode || 'auto'));
  const owner = `${kind}.${kind === 'bhkw' ? 'b1' : 'g1'}`;
  for (const id of [row.startWriteId, row.stopWriteId, row.runWriteId].filter(Boolean)) {
    adapter._stageAActuatorOwnerById[id] = { activeOwners: [owner], owners: [owner] };
  }
  installActuatorShadowArbiter(adapter);
  const module = kind === 'bhkw' ? new BhkwControlModule(adapter, null) : new GeneratorControlModule(adapter, null);
  await module.init();
  return { adapter, module };
}

(async () => {
  // 1) BHKW run-level: frischer Override-SoC fuehrt zu Start, hoher SoC zu Stop.
  {
    const row = device({ commandType: 'runLevel', startWriteId: '', stopWriteId: '', runWriteId: 'device.run' });
    const { adapter, module } = await makeModule('bhkw', row, { soc: 20, running: false });
    await module.tick();
    assert(adapter.writes.some((write) => write.id === 'device.run' && write.value === true), 'BHKW muss bei niedrigem frischem SoC starten');
    assert.strictEqual(adapter.reserveCalls.length, 0, 'Erzeuger darf kein Verbrauchsbudget reservieren');
    adapter.soc = 70;
    adapter.foreign.set('device.running', state(true, { changeAgeMs: 15 * 60 * 1000 }));
    await module.tick();
    assert(adapter.writes.some((write) => write.id === 'device.run' && write.value === false), 'BHKW muss bei hohem SoC stoppen');
  }

  // 1b) Neue AppCenter-Felder muessen alte Aliaswerte uebersteuern, damit eine
  // geaenderte Installer-Konfiguration nach dem Speichern wirklich wirksam wird.
  {
    const row = device({
      commandType: 'runLevel', commandProfile: 'pulse',
      startWriteId: '', stopWriteId: '', runWriteId: 'device.run',
      commandTimeoutSec: 7, readbackTimeoutSec: 30,
      requireGridImportForAutoStart: false, requireFreshNvpForStart: true,
      gridImportStartW: 700, minGridImportWForStart: 1900,
      gridMaxAgeSec: 5, nvpMaxAgeSec: 60,
    });
    const { module } = await makeModule('bhkw', row, { soc: 50, running: false });
    const configured = module.devices[0];
    assert.strictEqual(configured.commandProfile, 'run-level');
    assert.strictEqual(configured.commandTimeoutMs, 7000);
    assert.strictEqual(configured.requireGridImportForAutoStart, false);
    assert.strictEqual(configured.gridImportStartW, 700);
    assert.strictEqual(configured.gridMaxAgeMs, 5000);
  }

  // 2) Rekonstruierte Mindestlaufzeit verhindert einen zu fruehen Stop nach Neustart.
  {
    const row = device({ commandType: 'runLevel', startWriteId: '', stopWriteId: '', runWriteId: 'device.run', minRunMin: 10 });
    const { adapter, module } = await makeModule('generator', row, { soc: 80, running: true, runningSinceMs: 2 * 60 * 1000 });
    await module.tick();
    assert(!adapter.writes.some((write) => write.id === 'device.run' && write.value === false), 'Mindestlaufzeit muss nach Neustart rekonstruiert werden');
    const reason = adapter.local.get('generator.devices.g1.reason');
    assert(reason && reason.val === 'auto:stop_blocked_min_run');
  }

  // 3) Staler SoC oder stale NVP-Freigabe darf keinen automatischen Start ausloesen.
  {
    const row = device({ commandType: 'runLevel', startWriteId: '', stopWriteId: '', runWriteId: 'device.run', requireGridImportForAutoStart: true, gridImportStartW: 500 });
    const { adapter, module } = await makeModule('bhkw', row, { soc: 20, running: false, nvpW: 1000 });
    adapter._nvpFreshnessSnapshot.ts = Date.now() - 60000;
    await module.tick();
    assert(!adapter.writes.some((write) => write.id === 'device.run' && write.value === true), 'Staler NVP darf Auto-Start nicht erlauben');
    assert.strictEqual(adapter.local.get('bhkw.devices.b1.reason').val, 'auto:start_blocked_stale_nvp');
  }

  {
    const row = device({ commandType: 'runLevel', startWriteId: '', stopWriteId: '', runWriteId: 'device.run' });
    const { adapter, module } = await makeModule('generator', row, { soc: 20, running: false });
    adapter._nwGetCacheAgeMs = () => 120000;
    adapter._nwGetNumberFromCacheFresh = () => null;
    await module.tick();
    assert(!adapter.writes.some((write) => write.id === 'device.run' && write.value === true), 'Staler SoC darf Auto-Start nicht erlauben');
    assert.strictEqual(adapter.local.get('generator.devices.g1.reason').val, 'auto:stale_soc');
  }

  // 4) Laufstatus kann aus frischer Erzeugerleistung abgeleitet werden.
  {
    const row = device({ commandType: 'runLevel', startWriteId: '', stopWriteId: '', runWriteId: 'device.run', runningReadId: '', powerScale: 1000, runningPowerThresholdW: 500 });
    const { adapter, module } = await makeModule('generator', row, { soc: 40, powerW: 1.2 });
    adapter.foreign.set('device.power', state(1.2));
    await module.tick();
    assert.strictEqual(adapter.local.get('generator.devices.g1.running').val, true, '1,2 kW muss mit Faktor 1000 als laufender Generator erkannt werden');
    assert.strictEqual(adapter.local.get('generator.devices.g1.powerW').val, 1200);
    assert.strictEqual(adapter.local.get('generator.devices.g1.runningSource').val, 'power-threshold');
  }

  // 5) Zwei-Draht-Level neutralisiert die Gegenrichtung und setzt danach die Zielrichtung.
  {
    const row = device({ commandType: 'level', requireReadback: false });
    const { adapter, module } = await makeModule('bhkw', row, { mode: 'manual', running: false });
    adapter.local.set('bhkw.user.b1.command', state('start'));
    await module.tick();
    const startWrites = adapter.writes.filter((write) => write.id === 'device.start' || write.id === 'device.stop');
    assert.deepStrictEqual(startWrites.slice(-2).map((write) => [write.id, write.value]), [['device.stop', false], ['device.start', true]]);
    adapter.foreign.set('device.running', state(true));
    adapter.local.set('bhkw.user.b1.command', state('stop'));
    await module.tick();
    const stopWrites = adapter.writes.filter((write) => write.id === 'device.start' || write.id === 'device.stop');
    assert.deepStrictEqual(stopWrites.slice(-2).map((write) => [write.id, write.value]), [['device.start', false], ['device.stop', true]]);
  }

  // 6) Pulse wird nur nach akzeptiertem Start-Write zurueckgesetzt.
  {
    const row = device({ commandType: 'pulse', requireReadback: false });
    const { adapter, module } = await makeModule('generator', row, { mode: 'manual', running: false });
    adapter.local.set('generator.user.g1.command', state('start'));
    await module.tick();
    assert(adapter.writes.some((write) => write.id === 'device.start' && write.value === true));
    assert.strictEqual(adapter.timers.length, 1, 'Pulse-Reset muss sicher geplant werden');
    adapter.timers[0].fn();
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert(adapter.writes.some((write) => write.id === 'device.start' && write.value === false));
  }

  // 6b) Ein akzeptierter Auto-Puls wird waehrend der Einschwingzeit nicht in jedem Tick wiederholt.
  {
    const row = device({ commandType: 'pulse', requireReadback: false, commandTimeoutSec: 10 });
    const { adapter, module } = await makeModule('bhkw', row, { soc: 20, running: false });
    await module.tick();
    await module.tick();
    const starts = adapter.writes.filter((write) => write.id === 'device.start' && write.value === true);
    assert.strictEqual(starts.length, 1, 'Akzeptierter Auto-Puls darf vor Ablauf der Einschwingzeit nicht wiederholt werden');
    assert.strictEqual(adapter.local.get('bhkw.devices.b1.writeContractStatus').val, 'command-settle-wait');
  }

  // 7) Eine hoeher priorisierte Safety-Lease blockiert einen Generatorstart ohne Timer/Erfolgssimulation.
  {
    const row = device({ commandType: 'pulse', requireReadback: false });
    const { adapter, module } = await makeModule('generator', row, { mode: 'manual', running: false });
    await withActuatorShadowContext(adapter, {
      owner: 'para14a.test', module: 'para14a', priority: priorityForOwner('para14a.test'), reason: 'test-safety', leaseMs: 60000, enforceAuthority: true,
    }, () => adapter.setForeignStateAsync('device.start', { val: false, ack: false }));
    const writesBefore = adapter.writes.length;
    adapter.local.set('generator.user.g1.command', state('start'));
    await module.tick();
    assert.strictEqual(adapter.timers.length, 0, 'Blockierter Puls darf keinen Reset-Timer starten');
    assert.strictEqual(adapter.writes.length, writesBefore, 'Blockierter Start darf Hardware nicht beschreiben');
    assert.strictEqual(adapter.local.get('generator.devices.g1.writeContractStatus').val, 'blocked-by-authority');
  }

  // 8) Abhaengige Erzeuger verwenden ausschliesslich den SoC der zentral
  // ausgewaehlten Speichertopologie. Ein alter Einzel-SoC darf eine Farm nicht
  // zum Start zwingen und ein fehlender Farm-SoC darf nicht kaschiert werden.
  {
    const row = device({ commandType: 'runLevel', startWriteId: '', stopWriteId: '', runWriteId: 'device.run' });
    const { adapter, module } = await makeModule('bhkw', row, {
      topology: 'farm',
      farmSoc: 70,
      soc: 20,
      running: false,
    });
    await module.tick();
    assert(!adapter.writes.some((write) => write.id === 'device.run' && write.value === true), 'Farm-SoC 70 % muss alten Einzel-SoC 20 % ueberstimmen');
    assert.strictEqual(adapter.local.get('bhkw.devices.b1.socSource').val, 'storage-farm-online');
    assert.strictEqual(adapter.local.get('bhkw.devices.b1.socPct').val, 70);
  }

  {
    const row = device({ commandType: 'runLevel', startWriteId: '', stopWriteId: '', runWriteId: 'device.run' });
    const { adapter, module } = await makeModule('generator', row, {
      topology: 'farm',
      farmSoc: null,
      soc: 20,
      running: false,
    });
    await module.tick();
    assert(!adapter.writes.some((write) => write.id === 'device.run' && write.value === true), 'Fehlender Farm-SoC darf nicht auf Einzel-SoC zurueckfallen');
    assert.strictEqual(adapter.local.get('generator.devices.g1.reason').val, 'auto:stale_soc');
    assert(String(adapter.local.get('generator.devices.g1.socSource').val).startsWith('storage-farm-missing:'));
  }

  // 9) Stufe A kennt die stabilen Owner und Run-Write-Felder; keine doppelte Altimplementierung bleibt.
  const stageA = fs.readFileSync(path.join(__dirname, '../src-ts/runtime-executables/ems/modules/stage-a-diagnostics.ts'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '../src-ts/runtime-executables/ems/modules/prime-mover-control.ts'), 'utf8');
  const ui = fs.readFileSync(path.join(__dirname, '../src-ts/runtime-executables/www/ems-apps.ts'), 'utf8');
  assert(stageA.includes("return index > 0 ? `bhkw.b${index}`"));
  assert(stageA.includes("return index > 0 ? `generator.g${index}`"));
  assert(stageA.includes("'runWriteId'"));
  assert(source.includes('ActuatorCommandContract'));
  assert(source.includes("'producer-via-nvp'"));
  assert(source.includes('power-threshold'));
  assert(source.includes('writeConfirmed'));
  assert(source.includes('minRunRemainingSec'));
  assert(source.includes('command-settle-wait'));
  assert(!source.includes('else if (!this.adapter?._nwShuttingDown) setTimeout'));
  assert(ui.includes("value: 'runLevel'"));
  assert(ui.includes('Stop bei Einspeisung ab (W)'));
  assert(!fs.existsSync(path.join(__dirname, '../src-ts/runtime-executables/ems/services/dispatchable-source-control.ts')));

  console.log('[actuator-c3-prime-movers] OK');
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
