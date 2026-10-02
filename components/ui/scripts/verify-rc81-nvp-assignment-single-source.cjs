#!/usr/bin/env node
'use strict';

/**
 * RC81 – versionsneutraler Sicherheitsvertrag
 * Single Source of Truth fuer Netzanschlussleistung und NVP:
 * - installerConfig.gridConnectionPower aus Zuordnung -> Allgemein = statisches Hard-Limit
 * - datapoints.gridPointPower aus Zuordnung -> Allgemein = alleinige signierte NVP-Messung
 * - Soft = 90 %, Reserve = 10 % der wirksamen Hard-Grenze
 * - alte gridConstraints.importHardLimitW/gridImportHardLimitW/gridPowerId werden ignoriert
 * - RLM darf eine vorhandene Anschlussgrenze nur absenken, nicht ersetzen oder erhoehen
 */
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const readFirst = (...rels) => {
  for (const rel of rels) {
    const abs = path.join(root, rel);
    if (fs.existsSync(abs)) return fs.readFileSync(abs, 'utf8');
  }
  throw new Error(`Keine der erwarteten Dateien vorhanden: ${rels.join(', ')}`);
};
const { GridConstraintsModule } = require(path.join(root, 'ems/modules/grid-constraints.js'));

function createAdapter({ connectionW, legacyHardW = 0, peakLegacyW = 0, rlmEnabled = false }) {
  const states = new Map();
  return {
    states,
    config: {
      enableGridConstraints: true,
      installerConfig: { gridConnectionPower: connectionW },
      peakShaving: { maxPowerW: peakLegacyW },
      gridConstraints: {
        importHardLimitW: legacyHardW,
        gridImportHardLimitW: legacyHardW + 111,
        gridPowerId: 'legacy.0.hidden.nvp',
        importSoftHysteresisW: 500,
        importSoftReleaseDelaySec: 10,
        rlmEnabled,
      },
    },
    async setStateAsync(id, val) {
      states.set(id, val);
    },
  };
}

async function runPlanning({ connectionW, legacyHardW, peakLegacyW, rlmEnabled = false, rlmCapW = null, nvpW = -10100 }) {
  const adapter = createAdapter({ connectionW, legacyHardW, peakLegacyW, rlmEnabled });
  const module = new GridConstraintsModule(adapter, {});
  module._isStaleGrid = () => false;
  module._getGridW = () => nvpW;
  module._tickRlm = async () => ({ enabled: rlmEnabled, capNowW: rlmCapW });
  module._tickPvEvu = async () => null;
  await module.tickPlanning();
  return adapter.states;
}

(async () => {
  const pkg = JSON.parse(read('package.json'));
  const io = JSON.parse(read('io-package.json'));
  // Der RC-Vertrag gilt auch für spätere Patchstände. Entscheidend ist eine
  // gültige und über alle Release-Metadaten synchronisierte SemVer-Version.
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
  assert.strictEqual(io.common.version, pkg.version);

  // 1) Zuordnung gewinnt gegen alte Netzlimits- und Peak-Shaving-Overrides.
  const assignment = await runPlanning({
    connectionW: 30000,
    legacyHardW: 5000,
    peakLegacyW: 9000,
  });
  assert.strictEqual(assignment.get('gridConstraints.importLimits.baseConnectionPowerW'), 30000);
  assert.strictEqual(assignment.get('gridConstraints.importLimits.hardLimitW'), 30000);
  assert.strictEqual(assignment.get('gridConstraints.importLimits.softLimitW'), 27000);
  assert.strictEqual(assignment.get('gridConstraints.importLimits.reserveW'), 3000);
  assert.strictEqual(assignment.get('gridConstraints.importLimits.source'), 'assignment');
  assert.strictEqual(assignment.get('gridConstraints.importLimits.hardHeadroomW'), 40100);
  assert.strictEqual(assignment.get('gridConstraints.importLimits.softHeadroomW'), 37100);

  // 2) RLM darf nur absenken; die 10-%-Regel wird aus der wirksamen Grenze neu berechnet.
  const rlm = await runPlanning({
    connectionW: 30000,
    legacyHardW: 5000,
    peakLegacyW: 9000,
    rlmEnabled: true,
    rlmCapW: 25000,
    nvpW: 20000,
  });
  assert.strictEqual(rlm.get('gridConstraints.importLimits.baseConnectionPowerW'), 30000);
  assert.strictEqual(rlm.get('gridConstraints.importLimits.hardLimitW'), 25000);
  assert.strictEqual(rlm.get('gridConstraints.importLimits.softLimitW'), 22500);
  assert.strictEqual(rlm.get('gridConstraints.importLimits.reserveW'), 2500);
  assert.strictEqual(rlm.get('gridConstraints.importLimits.source'), 'assignment+rlm');

  // 3) Ohne zentrale Anschlussleistung duerfen Legacy-/RLM-Werte kein verstecktes Limit erzeugen.
  const missing = await runPlanning({
    connectionW: 0,
    legacyHardW: 22000,
    peakLegacyW: 24000,
    rlmEnabled: true,
    rlmCapW: 18000,
    nvpW: 1000,
  });
  assert.strictEqual(missing.get('gridConstraints.importLimits.baseConnectionPowerW'), 0);
  assert.strictEqual(missing.get('gridConstraints.importLimits.hardLimitW'), 0);
  assert.strictEqual(missing.get('gridConstraints.importLimits.softLimitW'), 0);
  assert.strictEqual(missing.get('gridConstraints.importLimits.source'), 'unconfigured');

  // 4) Backend darf die entfernten Quellen nicht mehr lesen oder als DP-Mapping anlegen.
  const backend = readFirst('src-ts/runtime-executables/ems/modules/grid-constraints.ts', 'ems/modules/grid-constraints.js');
  const planningStart = backend.indexOf('// RC81 Single Source of Truth:');
  const planningEnd = backend.indexOf('const importPolicy = resolveGridImportLimitPolicy({', planningStart);
  const planningBlock = backend.slice(planningStart, planningEnd);
  assert(planningStart >= 0 && planningEnd > planningStart);
  assert(planningBlock.includes('installerConfig?.gridConnectionPower'));
  assert(!planningBlock.includes('cfg.importHardLimitW'));
  assert(!planningBlock.includes('cfg.gridImportHardLimitW'));
  assert(!planningBlock.includes('peakShaving?.maxPowerW'));
  assert(backend.includes("const gridW = dp.getNumberFresh('grid.powerW', staleMs, null);"));
  assert(!backend.includes("dp.getNumberFresh('gc.gridPowerW'"));
  assert(!backend.includes("dp.getNumberFresh('ps.gridPowerW'"));
  assert(!backend.includes("key: 'gc.gridPowerW'"));

  // 5) AppCenter hat kein zweites Hard-Limit und kein zweites NVP-DP-Feld mehr.
  const ui = readFirst('src-ts/runtime-executables/www/ems-apps.ts', 'www/ems-apps.js');
  assert(ui.includes('Quelle: Zuordnung → Allgemein. Netzanschlussleistung / Hard‑Limit'));
  assert(ui.includes('Verwendeter NVP-Datenpunkt aus Zuordnung → Allgemein'));
  assert(!ui.includes("mkNum('Hard‑Limit Netzbezug'"));
  assert(!ui.includes("mkDpField('Netzleistung (Fallback)"));
  assert(ui.includes('gc.importHardLimitW = 0;'));
  assert(ui.includes('gc.gridImportHardLimitW = 0;'));
  assert(ui.includes("gc.gridPowerId = '';"));

  // 6) 0-Einspeisung bleibt unter Netzlimits, nutzt aber denselben zentralen NVP.
  assert(ui.includes('0‑Einspeisung / Einspeisebegrenzung aktiv'));
  assert(ui.includes('Führungsgröße ist der signierte NVP aus Zuordnung → Allgemein → Netzpunkt'));

  // 7) Browsercache und Dokumentation gehoeren zum neuen Release.
  assert(readFirst('src-ts/runtime-executables/www/sw.ts', 'www/sw.js').match(/const CACHE_NAME = 'nexowatt-cache-v\d+'/));
  const docs = read('docs/RC81_NVP_ASSIGNMENT_SINGLE_SOURCE_DE.md');
  assert(docs.includes('einzige statische Quelle'));
  assert(docs.includes('Hard-Limit = 30.000 W'));
  assert(docs.includes('Soft-Limit = 27.000 W'));

  console.log('[RC81] OK: Zuordnung ist alleinige Quelle fuer Anschlussleistung und NVP; Legacy-Overrides ignoriert; RLM nur absenkend.');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
