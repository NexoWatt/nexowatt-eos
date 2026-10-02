// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-module-lifecycle-para14a.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-module-lifecycle-para14a.js
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
 * Original-Hash: 35603306a0e42bf322153b1cc3ab84cb996c074154270cc5ab83a93584a00e68
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
 * Regression 0.8.121:
 * - optional modules toggled at runtime must init before their first tick;
 * - disabling §14a clears the last central constraint;
 * - §14a must never write a state before its ioBroker object exists.
 */
const assert = require('assert');
const { ModuleManager } = require('../ems/module-manager');
const { Para14aModule } = require('../ems/modules/para14a');

/**
 * Code-Teil: baseAdapter
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function baseAdapter() {
  const objects = new Set();
  const states = new Map();
  const missingWrites = [];
  return {
    namespace: 'nexowatt-ui.0',
    config: { diagnostics: { enabled: false }, installerConfig: {} },
    stateCache: {},
    evcsList: [],
    log: { warn() {}, info() {}, debug() {}, error() {} },
    async setObjectNotExistsAsync(id) { objects.add(String(id)); },
    async setStateAsync(id, value) {
      const key = String(id);
      if (!objects.has(key)) missingWrites.push(key);
      const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val') ? value.val : value;
      states.set(key, { val, ts: Date.now(), ack: true });
    },
    async getStateAsync(id) { return states.get(String(id)) || null; },
    async getForeignObjectAsync() { return null; },
    async getObjectAsync(id) { return objects.has(String(id)) ? { type: 'state' } : null; },
    updateValue() {},
    _objects: objects,
    _states: states,
    _missingWrites: missingWrites,
  };
}

/**
 * Code-Teil: MinimalDp
 *
 * Zweck:
 * Automatisch markierter Klasse-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
class MinimalDp {
  async upsert() {}
  getRaw(_key, fallback = null) { return fallback; }
  getAgeMs() { return null; }
  getNumberFresh(_key, _age, fallback = null) { return fallback; }
  async writeNumber() { return true; }
  async writeBoolean() { return true; }
}

(async () => {
  // Generic module lifecycle: disabled at boot, enabled later, then disabled/re-enabled.
  const adapter = baseAdapter();
  const manager = new ModuleManager(adapter, null);
  let enabled = false;
  let initCount = 0;
  let tickCount = 0;
  let deactivateCount = 0;
  let initialized = false;
  const fake = {
    async init() { initCount += 1; initialized = true; },
    async tick() { assert.strictEqual(initialized, true, 'tick before init'); tickCount += 1; },
    async deactivate() { deactivateCount += 1; initialized = false; },
  };
  manager.modules = [{ key: 'optionalTest', instance: fake, enabledFn: () => enabled, initialized: false, lastEnabled: false }];

  await manager.tick();
  assert.strictEqual(initCount, 0);
  assert.strictEqual(tickCount, 0);

  enabled = true;
  await manager.tick();
  assert.strictEqual(initCount, 1, 'lazy init missing');
  assert.strictEqual(tickCount, 1, 'first enabled tick missing');

  enabled = false;
  await manager.tick();
  assert.strictEqual(deactivateCount, 1, 'disable transition missing');

  enabled = true;
  await manager.tick();
  assert.strictEqual(initCount, 2, 're-enable must refresh config/mappings');
  assert.strictEqual(tickCount, 2);

  // Real §14a path: simulate AppCenter activation without adapter restart.
  const pAdapter = baseAdapter();
  pAdapter.config.installerConfig = {
    para14a: true,
    para14aMode: 'ems',
    para14aSignalMaxAgeSec: 30,
    para14aLegacyDirectWritesEnabled: false,
    para14aConsumers: [],
  };
  const p14a = new Para14aModule(pAdapter, new MinimalDp());
  await p14a.tick(); // must self-initialize before any setState
  assert.strictEqual(pAdapter._missingWrites.length, 0, `state written before object creation: ${pAdapter._missingWrites.join(', ')}`);
  for (const id of [
    'para14a.signalFresh',
    'para14a.signalAgeMs',
    'para14a.signalStatus',
    'para14a.stalePolicy',
    'para14a.constraintOnly',
    'para14a.totalCapW',
    'para14a.evcsTotalCapW',
    'para14a.storageChargeCapW',
    'para14a.thermalCapW',
    'para14a.heatingRodCapW',
  ]) assert(pAdapter._objects.has(id), `missing §14a object ${id}`);

  pAdapter._para14a = { active: true, totalCapW: 4200 };
  await p14a.deactivate();
  assert.strictEqual(pAdapter._para14a.active, false, 'disabled module left active cap behind');
  assert.strictEqual(pAdapter._para14a.totalCapW, null);

  console.log('[module-lifecycle-para14a] OK: lazy init, no missing-object spam, and clean disable transition.');
})().catch((error) => {
  console.error('[module-lifecycle-para14a] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
