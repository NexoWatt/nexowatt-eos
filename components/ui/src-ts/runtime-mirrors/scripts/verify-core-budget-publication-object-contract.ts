// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-core-budget-publication-object-contract.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-core-budget-publication-object-contract.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Produktive Originalquellen liegen unter
 * src-ts/runtime-executables/ bzw. den im generierten JS genannten TS-Pfaden.
 * Dort ändern, Laufzeit erzeugen und danach die Spiegel synchronisieren.
 * Build-/Prüfskripte ohne TS-Original werden weiterhin unter scripts/ gepflegt.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: 6d1074f15622d27c503efeccc942f10a9af223ef68d9331439365c581b810f48
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

'use strict';

/**
 * Regression 0.8.122:
 * Every state emitted by the typed Core budget publication plan must have an
 * ioBroker object created by CoreLimitsModule.init() before the first write.
 * This specifically prevents inactive §14a diagnostics from flooding the log
 * with "has no existing object" warnings.
 */
const assert = require('assert');
const { CoreLimitsModule } = require('../ems/modules/core-limits');
const mirror = require('../lib/ts-mirrors/ems/core-limits/core-runtime');

/**
 * Code-Teil: fakeAdapter
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function fakeAdapter() {
  const objects = new Set();
  const missingWrites = [];
  return {
    namespace: 'nexowatt-ui.0',
    config: {},
    stateCache: {},
    log: { warn() {}, info() {}, debug() {}, error() {} },
    async setObjectNotExistsAsync(id) { objects.add(String(id)); },
    async setStateAsync(id) {
      const key = String(id);
      if (!objects.has(key)) missingWrites.push(key);
    },
    updateValue() {},
    _objects: objects,
    _missingWrites: missingWrites,
  };
}

/**
 * Code-Teil: inactiveRuntime
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function inactiveRuntime() {
  return mirror.createCoreRuntimePhase3State({
    ts: 1710000000000,
    active: true,
    mode: 'central-background-ts-runtime',
    source: 'ts-core-runtime',
    raw: {
      gridW: 0,
      gridImportW: 0,
      gridExportW: 0,
      pvPowerW: 0,
      storageChargeW: 0,
      storageDischargeW: 0,
      flexUsedW: 0,
      pvFlexUsedW: 0,
      pvBudgetFlowRawW: 0,
      pvBudgetPhysicalCapW: 0,
      pvBudgetPhysicalSource: 'none',
      pvBudgetPhysicalHeld: false,
      pvBudgetDirectSource: '',
      pvBudgetDirectFresh: false,
      pvBudgetClampedW: 0,
    },
    gates: {
      grid: { importLimitW: 40000, importW: 0, exportW: 0, measurementUsable: true },
      pv: { rawW: 0, effectiveW: 0 },
      storage: {},
      total: { effectiveW: 40000, binding: 'grid' },
      forecast: { valid: false, usable: false },
      tariff: { active: false, dischargeAllowed: true },
      pvAllocation: {
        allocationEnabled: false,
        mode: 'dynamic',
        evcsSharePct: 0,
        evcsCapW: 0,
        storageGuaranteedW: 0,
        storageEligible: true,
        storageMaxChargeW: 0,
        reason: 'disabled',
      },
      para14a: {
        active: false,
        mode: '',
        evcsCapW: 0,
        totalCapW: 0,
        appCapsW: {},
        signalFresh: false,
        signalStatus: 'inactive',
        constraintOnly: true,
      },
    },
    consumers: {},
    typedRuntime: { productive: true, fallback: false, contractVersion: 'core-runtime-v2' },
  });
}

(async () => {
  const adapter = fakeAdapter();
  const module = new CoreLimitsModule(adapter, null);
  await module.init();

  const runtime = inactiveRuntime();
  const plan = mirror.buildCoreRuntimePhase3PublicationPlan({
    runtime,
    coreRuntimeStatus: { active: true, fallback: false, mismatchCount: 0 },
  });
  assert.strictEqual(plan.ok, true);
  assert(plan.states && typeof plan.states === 'object');

  const missingObjects = Object.keys(plan.states).filter((id) => !adapter._objects.has(id));
  assert.deepStrictEqual(missingObjects, [], `publication states without objects: ${missingObjects.join(', ')}`);

  for (const id of Object.keys(plan.states)) await adapter.setStateAsync(id, plan.states[id], true);
  assert.deepStrictEqual(adapter._missingWrites, [], `writes before object creation: ${adapter._missingWrites.join(', ')}`);

  for (const id of [
    'ems.budget.para14aActive',
    'ems.budget.para14aMode',
    'ems.budget.para14aEvcsCapW',
    'ems.budget.para14aTotalCapW',
    'ems.budget.para14aAppCapsJson',
    'ems.budget.para14aSignalFresh',
    'ems.budget.para14aSignalStatus',
    'ems.budget.para14aConstraintOnly',
  ]) assert(adapter._objects.has(id), `missing §14a budget object ${id}`);

  assert.strictEqual(plan.states['ems.budget.para14aActive'], false);
  assert.strictEqual(plan.states['ems.budget.para14aSignalFresh'], false);
  assert.strictEqual(plan.states['ems.budget.para14aSignalStatus'], 'inactive');
  assert.strictEqual(plan.states['ems.budget.para14aConstraintOnly'], true);

  console.log('[core-budget-publication-object-contract] OK: every typed publication state exists before write; inactive §14a is log-silent.');
})().catch((error) => {
  console.error('[core-budget-publication-object-contract] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
