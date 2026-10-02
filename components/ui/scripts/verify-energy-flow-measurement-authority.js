#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-energy-flow-measurement-authority.js
 *
 * Zweck:
 * Prüft zwei Feldfehler gemeinsam:
 * 1. Ein explizit im Energiefluss zugeordneter Speicher-SoC muss auch ohne
 *    aktive Speicherregelung in die kanonische Historie geschrieben werden.
 * 2. Beim Heizstab ist der manuell zugeordnete Leistungs-DP die primaere
 *    Istwertquelle (inklusive gueltigem 0-W-Wert). Stufen-/Sollwerte bleiben
 *    ausschliesslich Fallback bzw. Budgetreservierung.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
}

function extractBalancedFunction(source, needle) {
  const start = source.indexOf(needle);
  assert.ok(start >= 0, `Funktion/Methode fehlt: ${needle}`);
  const brace = source.indexOf('{', start);
  assert.ok(brace >= 0, `Oeffnende Klammer fehlt: ${needle}`);
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = brace; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1] || '';
    if (lineComment) {
      if (ch === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === '*' && next === '/') { blockComment = false; i++; }
      continue;
    }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === '/' && next === '/') { lineComment = true; i++; continue; }
    if (ch === '/' && next === '*') { blockComment = true; i++; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Funktion/Methode nicht abgeschlossen: ${needle}`);
}

async function verifyStorageSocHistory() {
  const mainTs = read('src-ts/runtime-executables/main.ts');
  const methodText = extractBalancedFunction(mainTs, 'async updateHistorieExportStates(');
  const holder = Function(`return ({${methodText}});`)(); // eslint-disable-line no-new-func

  const writes = new Map();
  const fake = {
    config: {
      datapoints: { storageSoc: 'vendor.0.storage.soc' },
      settings: {},
      peakShaving: {},
    },
    stateCache: {},
    evcsCount: 0,
    _nwResolveGridImportExportFromCache: () => ({ gridBuyW: 0, gridSellW: 0 }),
    _nwGetNumberFromCacheFresh: () => null,
    _nwGetNumberFromCache: (key) => key === 'storageSoc' ? 73 : null,
    _nwGetStorageControlAuthority: () => ({ selectedTopology: 'none', writerActive: false }),
    _nwResolveBatteryFlowFromCache: () => ({ chargeW: 0, dischargeW: 0 }),
    _nwResolveStorageFarmMetricsFromCache: () => null,
    _nwGetFlowSlotInfo: () => null,
    _nwSetHistorieValue: (id, val) => writes.set(id, val),
    setLocalStateWithCache: async () => {},
  };
  await holder.updateHistorieExportStates.call(fake, 'test-display-only-storage');
  assert.strictEqual(
    writes.get('historie.core.storage.socPct'),
    73,
    'Expliziter Energiefluss-SoC muss ohne aktive Speicherregelung geloggt werden',
  );

  // Ohne Mapping und ohne aktive Topologie darf kein erfundener SoC entstehen.
  const writesNoMapping = new Map();
  const noMapping = {
    ...fake,
    config: { datapoints: {}, settings: {}, peakShaving: {} },
    _nwSetHistorieValue: (id, val) => writesNoMapping.set(id, val),
  };
  await holder.updateHistorieExportStates.call(noMapping, 'test-no-storage-source');
  assert.ok(!writesNoMapping.has('historie.core.storage.socPct'));

  assert.ok(
    mainTs.includes("'batteryPower',\n        'storageSoc'"),
    'storageSoc muss im fokussierten Live-Refreshplan enthalten sein',
  );
}

function verifyHeatingRodFrontend() {
  const appTs = read('src-ts/runtime-executables/www/app.ts');
  const fnText = extractBalancedFunction(appTs, 'function resolveHeatingRodFlowPower(');
  const resolveHeatingRodFlowPower = Function(`return (${fnText});`)(); // eslint-disable-line no-new-func

  const baseStates = {
    'heatingRod.devices.c1.measuredW': 0,
    'heatingRod.devices.c1.appliedW': 6000,
    'heatingRod.devices.c1.targetW': 6000,
    'heatingRod.devices.c1.maxPowerW': 12000,
  };
  const d = (key) => baseStates[key];
  const item = { idx: 1, consumerType: 'heatingRod' };

  assert.strictEqual(
    resolveHeatingRodFlowPower(item, d, 0).valueW,
    0,
    'Expliziter gemappter 0-W-DP darf nicht durch Stufenleistung ersetzt werden',
  );
  assert.strictEqual(
    resolveHeatingRodFlowPower(item, d, 1375).valueW,
    1375,
    'Expliziter gemappter Leistungs-DP muss vor Soll-/Stufenwerten gewinnen',
  );
  assert.strictEqual(
    resolveHeatingRodFlowPower(item, d, Number.NaN).valueW,
    0,
    'Interner gemessener 0-W-Wert ist ebenfalls autoritativ',
  );
  const noMeasured = (key) => key.endsWith('.measuredW') ? undefined : baseStates[key];
  assert.strictEqual(
    resolveHeatingRodFlowPower(item, noMeasured, Number.NaN).valueW,
    6000,
    'Stufen-/Applied-Wert bleibt Fallback, wenn kein Messwert existiert',
  );

  assert.ok(appTs.includes('const rawCandidate = d(it.stateKey);'));
  assert.ok(!appTs.includes('const rawBase = Number(d(it.stateKey)) || 0;'));
}

function verifyHeatingRodBudgetSeparation() {
  const { HeatingRodControlModule } = require(path.join(root, 'ems/modules/heating-rod-control'));
  const adapter = {
    namespace: 'nexowatt-ui.0',
    config: { heatingRod: {}, datapoints: {}, vis: { flowSlots: { consumers: [] } } },
    stateCache: {},
    log: { warn() {}, info() {}, debug() {}, error() {} },
    setStateAsync: async () => {},
  };
  const mod = new HeatingRodControlModule(adapter, null);
  const device = { id: 'c1', maxPowerW: 12000, stages: [{ powerW: 3000 }] };
  const feedback = { anyKnown: true, appliedPowerW: 6000, currentStage: 2 };

  assert.strictEqual(mod._resolveObservedPowerW(device, 0, feedback, 6000), 0);
  assert.strictEqual(mod._resolveObservedPowerW(device, 1250, feedback, 6000), 1250);
  assert.strictEqual(mod._resolveObservedPowerW(device, null, feedback, 6000), 6000);
  assert.strictEqual(mod._resolveObservedPowerW(device, null, { anyKnown: false }, 3000), 3000);

  const heatingTs = read('src-ts/runtime-executables/ems/modules/heating-rod-control.ts');
  assert.ok(
    heatingTs.includes('const usedW = consumeHeatingRodW(Math.max(observedW, res.accepted ? targetW : 0), d.enabled === true);')
      && heatingTs.includes('budgetUsedW += Math.round(usedW);'),
    'Akzeptierte Stufe muss im Budgetpfad reserviert werden, ohne den beobachteten Istwert zu faelschen',
  );
  assert.ok(
    heatingTs.includes('actualW: Math.max(0, Math.round(Number.isFinite(Number(currentHeatingRodW)) ? Number(currentHeatingRodW) : 0))'),
    'Budgetdiagnose muss die beobachtete Istleistung inklusive 0 W verwenden',
  );

  const coreTs = read('src-ts/runtime-executables/ems/modules/core-limits.ts');
  assert.ok(
    coreTs.includes('const flexUsedW = Math.max(0, evcsUsedW + thermalUsedW + heatingRodUsedW);'),
    'Heizstabreservierung muss genau einmal in das zentrale Flex-Budget eingehen',
  );
  assert.ok(
    coreTs.includes('const pvFlexUsedW = Math.max(0, evcsPvUsedW + thermalUsedW + heatingRodUsedW);'),
    'PV-Budget muss denselben zentralen Heizstab-Budgetwert verwenden',
  );
}

(async () => {
  await verifyStorageSocHistory();
  verifyHeatingRodFrontend();
  verifyHeatingRodBudgetSeparation();
  console.log('[energy-flow-measurement-authority] OK: SoC-Historie und Heizstab-Istleistung sind von der Regel-App getrennt; Budgetreservierung bleibt sicher und einfach gezaehlt.');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
