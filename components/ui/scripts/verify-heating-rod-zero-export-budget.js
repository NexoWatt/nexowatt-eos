#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-heating-rod-zero-export-budget.js
 *
 * Zweck:
 * Prüft die 0-W-Einspeise-Heizstablogik gegen die zentrale Budgetlogik.
 * Wichtig: Die Stufenleistung kommt aus der bestehenden Heizstab-Konfiguration;
 * NVP, EVCS-Priorität und Speicherflüsse werden über die vorhandene EMS-/Lastmanagement-
 * Messbasis genutzt. Es darf keine separate 0-W-Stufen- oder EVCS-Sonderlogik entstehen.
 */

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const { HeatingRodControlModule } = require(path.join(root, 'ems/modules/heating-rod-control'));

function fail(msg, data) {
  console.error(`[heating-rod-zero-export-budget] ${msg}`);
  if (data !== undefined) console.error(JSON.stringify(data, null, 2));
  process.exit(1);
}

function makeModule() {
  const adapter = {
    namespace: 'nexowatt-ui.0',
    config: {
      enableHeatingRodControl: true,
      heatingRod: {
        autoMode: 'zeroExportForecast',
        storageTargetSocPct: 90,
        storageReserveW: 1000,
        zeroExport: {
          requireForecast: true,
          minPvPowerW: 1000,
          minForecastPeakW: 1000,
          minForecastKwh6h: 0.1,
          stepUpDelaySec: 0,
          probeObserveSec: 1,
          probeMinPvRiseW: 150,
          probeMinPvRisePct: 20,
        },
      },
    },
    stateCache: {},
    log: { warn() {}, info() {}, debug() {}, error() {} },
  };
  const mod = new HeatingRodControlModule(adapter, null);
  mod._readPvNowW = () => 0;
  mod._readForecastSnapshot = () => ({ valid: true, peakW: 12000, kwh6h: 6, kwh12h: 8, kwh24h: 12 });
  return mod;
}

function makePvBase(overrides = {}) {
  return Object.assign({
    gridKnown: true,
    exportW: 0,
    importW: 0,
    currentHeatingRodW: 0,
    evcsUsedW: 3000,
    storageReserveMissingW: 1000,
    storageChargeUsableW: 0,
    storageChargeW: 0,
    storageDischargeW: 0,
    storageSocPct: 80,
    nvpAvailableW: 0,
    budgetGateRemainingW: 10000,
    forecastStepCapW: 12000,
    gateCfg: {
      budgetSafetyReserveW: 200,
      maxGridImportW: 250,
      hardGridImportW: 1500,
      storageDischargeToleranceW: 300,
      hardStorageDischargeW: 2000,
    },
  }, overrides);
}

function makeDevice() {
  return {
    id: 'testRod',
    stageCount: 4,
    wiredStages: 4,
    maxPowerW: 12400,
    stages: [
      { powerW: 3100 },
      { powerW: 3100 },
      { powerW: 3100 },
      { powerW: 3100 },
    ],
  };
}

// 1) Bei 0 W sichtbarer Einspeisung darf Forecast + zentrales Restbudget ein Probe-Budget erzeugen.
{
  const mod = makeModule();
  const info = mod._computeZeroExportInfo(makePvBase());
  if (!info.canProbe) fail('Forecast/zentraler Rest nach EVCS muss eine 0-W-Probe erlauben.', info);
  if (info.zeroPotentialW !== 7800) fail('Zero-Potential muss Forecast minus EVCS, Speicherreserve und Reserve sein.', info);
  if (info.storageReady === false) fail('SoC unter Ziel darf im 0-W-Modus keine harte Sperre mehr sein.', info);
}

// 2) Wenn EVCS das Forecast-Potential bereits verbraucht, darf der Heizstab nicht nachziehen.
{
  const mod = makeModule();
  const info = mod._computeZeroExportInfo(makePvBase({ evcsUsedW: 11000 }));
  if (info.canProbe) fail('EVCS-Priorität muss über das Budget den Heizstab blockieren.', info);
  if (info.zeroPotentialW !== 0) fail('Zero-Potential muss 0 sein, wenn EVCS/Reserve das Forecast-Budget verbrauchen.', info);
}

// 3) Die erste Stufe nutzt die vorhandene Heizstab-Stufenleistung; keine separate 0-W-Stufe.
{
  const mod = makeModule();
  const d = makeDevice();
  const pvBase = makePvBase();
  const info = mod._computeZeroExportInfo(pvBase);
  const dec = mod._applyZeroExportStageStrategy(d, 0, 0, pvBase, info, Date.now(), null);
  if (dec.targetStage !== 1 || dec.reason !== 'probe_step_up_budget_ok') {
    fail('0-W-Probe muss genau eine vorhandene physische Stufe zuschalten.', dec);
  }
}

// 4) Bei Hybridanlagen darf eine Probe auch ohne sichtbaren PV-DP-Anstieg bestehen,
// wenn NVP, Speicherentladung und Budget nach der Beobachtungszeit stabil sind.
{
  const mod = makeModule();
  const d = makeDevice();
  const now = Date.now();
  mod._stageCtl.set(d.id, {
    targetStage: 1,
    zeroProbe: { stage: 1, baseStage: 0, basePvW: 2000, addedPowerW: 3100, startMs: now - 2000 },
  });
  mod._readPvNowW = () => 2000;
  const pvBase = makePvBase({ currentHeatingRodW: 3100, evcsUsedW: 0, storageReserveMissingW: 0, forecastStepCapW: 6000, budgetGateRemainingW: 6000 });
  const info = Object.assign(mod._computeZeroExportInfo(pvBase), { zeroPotentialW: 6000, canProbe: true, pvNowW: 2000 });
  const dec = mod._applyZeroExportStageStrategy(d, 1, 1, pvBase, info, now, null);
  if (dec.reduceNow || dec.targetStage !== 1 || dec.reason !== 'probe_nvp_budget_ok') {
    fail('Hybrid-Probe muss NVP-/Budget-stabil ohne separaten PV-Anstieg akzeptieren.', dec);
  }
}

// 5) Statische Anker: Runtime muss die neuen Diagnosewerte veröffentlichen.
const src = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/heating-rod-control.ts'), 'utf8');
for (const needle of [
  'zeroExportPotentialW',
  'zeroPotentialSource',
  'forecast+central-budget-after-priority',
  'probe_nvp_budget_ok',
  'zero_budget_stage_cap',
]) {
  if (!src.includes(needle)) fail(`Fehlender Codeanker: ${needle}`);
}

console.log('[heating-rod-zero-export-budget] OK: 0-W-Heizstab nutzt Forecast + zentrale Budgetlogik ohne separate Stufen-/EVCS-Logik.');
