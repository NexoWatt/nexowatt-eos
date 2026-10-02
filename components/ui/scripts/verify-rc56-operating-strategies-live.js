#!/usr/bin/env node
'use strict';

/**
 * RC56 – Live-Koordination der EOS-Betriebsstrategien.
 *
 * Prüft:
 * - ausschließlich aktive/zugeordnete native EOS-Ressourcen,
 * - doppelte Ladepunkt-Freigabe (Auto + Auto-Quelle Betriebsstrategie),
 * - TTL/fail-closed Rückfall,
 * - Single-Writer-Overlays für Ladepunkt, Speicher, Thermik und Heizstab,
 * - keine freie Custom-DP-Ausführung,
 * - Planner-Reihenfolge vor den Fachmodulen.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const service = require(path.join(root, 'ems/services/operating-strategy-runtime.js'));
const { OperatingStrategiesModule } = require(path.join(root, 'ems/modules/operating-strategies.js'));

const now = Date.now();
const baseConfig = {
  emsApps: { apps: { operatingStrategies: { installed: true, enabled: true } } },
  operatingStrategies: {
    enabled: true,
    mode: 'active',
    commissioningConfirmed: true,
    controlTakeoverEnabled: true,
    writeExecutionEnabled: true,
    autoControl: { enabled: true, stage: 'active', requestTtlSeconds: 15, fallback: 'standardAuto' },
    resourceLinks: [
      { sourceId: 'evcs:lp1', enabled: true, controlMode: 'active', commissioningConfirmed: true, writeEnabled: true, observeOnly: false, autoSource: 'strategy', fallback: 'standardAuto' },
      { sourceId: 'storagefarm:1', enabled: true, controlMode: 'active', commissioningConfirmed: true, writeEnabled: true, observeOnly: false },
      { sourceId: 'storagefarm:2', enabled: true, controlMode: 'active', commissioningConfirmed: true, writeEnabled: true, observeOnly: false },
      { sourceId: 'thermal:1', enabled: true, controlMode: 'active', commissioningConfirmed: true, writeEnabled: true, observeOnly: false, fallback: 'standardAuto' },
      { sourceId: 'heatingRod:1', enabled: true, controlMode: 'active', commissioningConfirmed: true, writeEnabled: true, observeOnly: false, fallback: 'standardAuto' },
    ],
  },
};
const adapter = {
  config: structuredClone(baseConfig),
  _nwOperatingStrategyRuntime: {
    activeControl: true,
    appEnabled: true,
    controlReason: 'active',
    resourceAliases: {},
    requestsByResource: {
      'evcs:lp1': { selected: true, controlEligible: true, issuedAt: now, expiresAt: now + 15000, action: 'target-power', requestedPowerW: 8000, minPowerW: 4200, maxPowerW: 11000, targetSocPct: 70, reason: 'Fahrzeugziel' },
      'thermal:1': { selected: true, controlEligible: true, issuedAt: now, expiresAt: now + 15000, action: 'pause', requestedPowerW: 0, reason: 'Kühlhaus-Nachtpause' },
      'heatingRod:1': { selected: true, controlEligible: true, issuedAt: now, expiresAt: now + 15000, action: 'target-power', requestedPowerW: 4000, reason: 'Überschusskaskade' },
    },
    storageOverlaysByResource: {
      'storagefarm:1': { selected: true, controlEligible: true, issuedAt: now, expiresAt: now + 15000, minSocPct: 40, targetSocPct: 40, absoluteMinSocPct: 10, phase: 'day-protect', reason: 'Winterreserve' },
      'storagefarm:2': { selected: true, controlEligible: true, issuedAt: now, expiresAt: now + 15000, minSocPct: 60, targetSocPct: 60, absoluteMinSocPct: 15, phase: 'day-protect', reason: 'Sommerreserve' },
    },
    decisionsByResource: {},
  },
};
adapter._nwOperatingStrategiesRuntime = adapter._nwOperatingStrategyRuntime;

// Ladepunkt: beide Opt-ins plus Auto sind zwingend.
let charging = service.resolveChargingStrategyOverlay(adapter, ['evcs:lp1'], { now, userMode: 'auto', autoSource: 'strategy' });
assert.equal(charging.eligible, true);
assert.equal(charging.active, true);
assert.equal(charging.targetPowerW, 8000);
assert.equal(charging.targetSocPct, 70);
assert.equal(service.resolveChargingStrategyOverlay(adapter, ['evcs:lp1'], { now, userMode: 'boost', autoSource: 'strategy' }).active, false);
assert.equal(service.resolveChargingStrategyOverlay(adapter, ['evcs:lp1'], { now, userMode: 'auto', autoSource: 'standard' }).reason, 'charging-auto-source-standard');
adapter.config.operatingStrategies.resourceLinks[0].autoSource = 'standard';
assert.equal(service.resolveChargingStrategyOverlay(adapter, ['evcs:lp1'], { now, userMode: 'auto', autoSource: 'strategy' }).reason, 'strategy-link-auto-source-standard');
adapter.config.operatingStrategies.resourceLinks[0].autoSource = 'strategy';

// Ablaufzeit: kein alter Sollwert bleibt aktiv.
adapter._nwOperatingStrategyRuntime.requestsByResource['evcs:lp1'].expiresAt = now - 1;
charging = service.resolveChargingStrategyOverlay(adapter, ['evcs:lp1'], { now, userMode: 'auto', autoSource: 'strategy' });
assert.equal(charging.active, false);
assert.equal(charging.action, 'standard');
adapter._nwOperatingStrategyRuntime.requestsByResource['evcs:lp1'].expiresAt = now + 15000;

// Speicherfarm: strengste aktive Reserve gewinnt; abgelaufene Overlays werden ignoriert.
let storage = service.resolveStorageStrategyOverlay(adapter, ['storagefarm:1', 'storagefarm:2'], { now });
assert.equal(storage.active, true);
assert.equal(storage.minSocPct, 60);
adapter._nwOperatingStrategyRuntime.storageOverlaysByResource['storagefarm:2'].expiresAt = now - 1;
storage = service.resolveStorageStrategyOverlay(adapter, ['storagefarm:1', 'storagefarm:2'], { now });
assert.equal(storage.minSocPct, 40);
adapter._nwOperatingStrategyRuntime.storageOverlaysByResource['storagefarm:2'].expiresAt = now + 15000;

// Thermik/Heizstab greifen ausschließlich im bestehenden PV-Auto-Modus.
const thermalAuto = service.resolveThermalStrategyOverlay(adapter, ['thermal:1'], { now, effectiveMode: 'pvAuto' });
assert.equal(thermalAuto.active, true);
assert.equal(thermalAuto.action, 'pause');
assert.equal(service.resolveThermalStrategyOverlay(adapter, ['thermal:1'], { now, effectiveMode: 'manual' }).active, false);
const rodAuto = service.resolveHeatingRodStrategyOverlay(adapter, ['heatingRod:1'], { now, effectiveMode: 'pvAuto' });
assert.equal(rodAuto.active, true);
assert.equal(rodAuto.maxPowerW, 4000);
assert.equal(service.resolveHeatingRodStrategyOverlay(adapter, ['heatingRod:1'], { now, effectiveMode: 'off' }).active, false);

// Ressourcenableitung: keine inaktiven/leer zugeordneten Slots und keine leeren Custom-Entwürfe.
const deriveConfig = {
  emsApps: { apps: {
    storagefarm: { installed: true, enabled: true },
    storage: { installed: true, enabled: true },
    charging: { installed: true, enabled: true },
    thermal: { installed: true, enabled: true },
    heatingrod: { installed: true, enabled: true },
  } },
  enableStorageFarm: true,
  enableStorageControl: true,
  enableChargingManagement: true,
  enableThermalControl: true,
  enableHeatingRodControl: true,
  storageFarm: { storages: [
    { enabled: true, name: 'Aktiver Farmspeicher', socId: 'farm.1.soc', setSignedPowerId: 'farm.1.set' },
    { enabled: false, name: 'Inaktiver Farmspeicher', socId: 'farm.2.soc', setSignedPowerId: 'farm.2.set' },
    { enabled: true, name: 'Leerer Farmspeicher' },
  ] },
  storage: { enabled: true, name: 'Einzelspeicher-Duplikat', datapoints: { socObjectId: 'single.soc', targetPowerObjectId: 'single.set' } },
  settingsConfig: { evcsList: [
    { enabled: true, name: 'Aktiver Ladepunkt', powerId: 'ev.1.power', setPowerWId: 'ev.1.set' },
    { enabled: false, name: 'Inaktiver Ladepunkt', powerId: 'ev.2.power', setPowerWId: 'ev.2.set' },
    { enabled: true, name: 'Leerer Ladepunkt' },
  ] },
  thermal: { devices: [
    { enabled: true, name: 'Aktives Kühlhaus', slot: 1, temperatureReadId: 'cold.temp' },
    ...Array.from({ length: 9 }, (_, i) => ({ enabled: false, name: `Thermisches Gerät ${i + 2}`, slot: i + 2 })),
  ] },
  heatingRod: { devices: [
    { enabled: true, name: 'Aktiver Heizstab', slot: 2, stages: [{ writeId: 'rod.1' }] },
    { enabled: false, name: 'Heizstab 2', slot: 3, stages: [{ writeId: 'rod.2' }] },
  ] },
  datapoints: { consumer1Power: 'cold.power', consumer2Power: 'rod.power', consumer4Power: 'generic.power' },
  vis: { flowSlots: { consumers: [
    { enabled: true, name: 'Kühlhaus Slot', consumerType: 'cooling', ctrl: { switchWriteId: 'cold.enable' } },
    { enabled: true, name: 'Heizstab Slot', consumerType: 'heatingRod', ctrl: { stage1WriteId: 'rod.1' } },
    { enabled: false, name: 'Inaktiver Verbraucher', consumerType: 'generic', ctrl: { switchWriteId: 'off.write' } },
    { enabled: true, name: 'Aktiver Allgemeinverbraucher', consumerType: 'generic', ctrl: {} },
  ] } },
  operatingStrategies: { customResources: [
    { id: 'mapped', enabled: true, name: 'Zugeordnet Custom', mappings: { powerReadId: 'custom.power' } },
    { id: 'empty', enabled: true, name: 'Leerer Custom-Entwurf', mappings: {} },
  ] },
};
const planner = new OperatingStrategiesModule({ config: deriveConfig }, {});
const derived = planner._deriveResources(deriveConfig).resources;
const names = derived.map((r) => r.name);
assert.deepEqual(names.filter((n) => /Farmspeicher/.test(n)), ['Aktiver Farmspeicher']);
assert.equal(names.includes('Einzelspeicher-Duplikat'), false);
assert.equal(names.includes('Aktiver Ladepunkt'), true);
assert.equal(names.includes('Inaktiver Ladepunkt'), false);
assert.equal(names.some((n) => /^Thermisches Gerät /.test(n)), false);
assert.equal(names.includes('Aktives Kühlhaus'), true);
assert.equal(names.includes('Aktiver Heizstab'), true);
assert.equal(names.includes('Heizstab 2'), false);
assert.equal(names.includes('Aktiver Allgemeinverbraucher'), true);
assert.equal(names.includes('Zugeordnet Custom'), true);
assert.equal(names.includes('Leerer Custom-Entwurf'), false);

// Statische Architekturverträge.
const plannerTs = read('src-ts/runtime-executables/ems/modules/operating-strategies.ts');
const runtimeTs = read('src-ts/runtime-executables/ems/services/operating-strategy-runtime.ts');
const moduleManagerTs = read('src-ts/runtime-executables/ems/module-manager.ts');
const chargingTs = read('src-ts/runtime-executables/ems/modules/charging-management.ts');
const storageTs = read('src-ts/runtime-executables/ems/modules/storage-control.ts');
const thermalTs = read('src-ts/runtime-executables/ems/modules/thermal-control.ts');
const rodTs = read('src-ts/runtime-executables/ems/modules/heating-rod-control.ts');
const mainTs = read('src-ts/runtime-executables/main.ts');
const uiTs = read('src-ts/runtime-executables/www/operating-strategies-appcenter.ts');

assert.equal(/setForeignState|writeForeignState|setForeignObject|sendToHost/.test(plannerTs), false, 'Strategy Planner darf keine Geräte-/Foreign-Writer enthalten');
assert.match(plannerTs, /hardwareWrites:\s*0/);
assert.ok(moduleManagerTs.indexOf("key: 'operatingStrategies'") < moduleManagerTs.indexOf("key: 'chargingManagement'"));
assert.ok(moduleManagerTs.indexOf("key: 'operatingStrategies'") < moduleManagerTs.indexOf("key: 'thermalControl'"));
assert.match(runtimeTs, /strategy-link-auto-source-standard/);
assert.match(runtimeTs, /charging-auto-source-standard/);
assert.match(chargingTs, /strategyOwnsAutoTarget/);
assert.match(chargingTs, /normalizeWallboxModeOverride\(w\.userMode\) === 'auto'/);
assert.match(storageTs, /selfMinSoc = Math\.max\(selfMinSoc/);
assert.match(thermalTs, /requestedPowerW = Math\.min\(requestedPowerW/);
assert.match(rodTs, /_maxStageForStrategyPower/);
assert.match(mainTs, /customResources:[\s\S]*normalizeCustomResource/);
assert.match(mainTs, /controlMode:\s*'observe'/);
assert.match(mainTs, /writeEnabled:\s*false/);
assert.match(uiTs, /device\.enabled !== true/);
assert.match(uiTs, /Keine aktiven und zugeordneten EOS-Geräte erkannt/);
assert.match(uiTs, /<details class="nw-os-resource nw-os-compact"/);
assert.match(uiTs, /nativeLiveSupported = \/\^\(evcs:\|thermal:\|heatingRod:\|storage:\|storagefarm:\)\//);

console.log('[rc56-operating-strategies-live] OK: aktive Ressourcenfilterung, doppelte Auto-Freigabe, TTL-Fail-safe und Single-Writer-Overlays verifiziert.');
