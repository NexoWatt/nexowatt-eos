// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-multiuse-storage-policy-only.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-multiuse-storage-policy-only.js
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
 * Original-Hash: 5058b2ba7366b8651e42a84795d4e3d05e4ed69101b63e29aa52f72c91b7dbe8
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
 * Regression 0.8.117: MultiUse ist standardmäßig ausschließlich Speicher-Policy.
 * storage-control bleibt der einzige Batteriesollwert-Schreiber; alte flexible
 * Verbraucher werden ohne expliziten Legacy-Schalter weder beschrieben noch budgetiert.
 */
const assert = require('assert');
const { MultiUseModule } = require('../ems/modules/multi-use');

/**
 * Code-Teil: FakeDp
 *
 * Zweck:
 * Automatisch markierter Klasse-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
class FakeDp {
  constructor() { this.entries = new Map(); this.writes = []; }
  async upsert(entry) { this.entries.set(entry.key, { ...entry }); }
  getEntry(key) { return this.entries.get(key) || null; }
  async writeNumber(key, value) { this.writes.push({ key, value: Number(value) }); return true; }
  async writeBoolean(key, value) { this.writes.push({ key, value: !!value }); return true; }
}
/**
 * Code-Teil: makeAdapter
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function makeAdapter() {
  const states = new Map();
  const budget = {
    remainingTotalW: 10000,
    remainingPvW: 10000,
    reserveCalls: [],
    getTotalGrant({ requestedW }) { return { grantW: requestedW }; },
    getPvGrant({ requestedW }) { return { grantW: requestedW }; },
    reserve(req) { this.reserveCalls.push(req); return req; },
  };
  return {
    namespace: 'nexowatt-ui.0',
    config: {
      enableMultiUse: true,
      installerConfig: { storageMultiUse: { enabled: true } },
      storage: {
        reserveEnabled: true, reserveMinSocPct: 15, reserveTargetSocPct: 20,
        lskEnabled: true, lskDischargeEnabled: true, lskMinSocPct: 25, lskMaxSocPct: 60,
        selfDischargeEnabled: true, selfMinSocPct: 20, selfMaxSocPct: 95,
      },
      multiUse: {
        consumers: [{ key: 'legacy', name: 'Legacy consumer', setWId: 'actor.legacy', budgetMode: 'pv' }],
      },
    },
    _emsBudget: budget,
    log: { debug() {}, info() {}, warn() {}, error() {} },
    async setObjectNotExistsAsync() {},
    async setStateAsync(id, value) { states.set(id, { val: value, ts: Date.now(), lc: Date.now() }); },
    async getStateAsync(id) { return states.get(id) || null; },
    _states: states,
  };
}

(async () => {
  const adapter = makeAdapter();
  const dp = new FakeDp();
  const module = new MultiUseModule(adapter, dp);
  await module.init();
  await module.tick();

  assert.strictEqual(dp.writes.length, 0, 'storage-policy-only darf keinen Hardware-DP schreiben');
  assert.strictEqual(adapter._emsBudget.reserveCalls.length, 0, 'storage-policy-only darf kein Verbraucherbudget reservieren');
  assert.strictEqual(adapter._states.get('multiUse.policy.active').val, true);
  assert.strictEqual(adapter._states.get('multiUse.policy.hardwareWriter').val, 'storage-control');
  assert.strictEqual(adapter._states.get('multiUse.policy.legacyConsumersConfigured').val, 1);
  assert.strictEqual(adapter._states.get('multiUse.policy.legacyConsumersEnabled').val, false);
  assert.strictEqual(adapter._states.get('multiUse.policy.legacyConsumersIgnored').val, true);
  assert.strictEqual(adapter._states.get('multiUse.control.status').val, 'storage-policy-only');
  assert.strictEqual(adapter._states.get('multiUse.control.centralReservedW').val, 0);
  assert.strictEqual(adapter._states.get('multiUse.summary.consumerCount').val, 0);

  // Der explizite Legacy-Migrationsmodus muss seine vorhandenen Zustände sauber
  // einlesen können. Er bleibt standardmäßig aus und ist kein Speicherwriter.
  const legacyAdapter = makeAdapter();
  legacyAdapter.config.multiUse.legacyFlexibleConsumersEnabled = true;
  legacyAdapter._states.set('multiUse.consumers.legacy.targetW', { val: 1234, ts: Date.now(), lc: Date.now() });
  const legacyModule = new MultiUseModule(legacyAdapter, new FakeDp());
  legacyModule._loadConsumersFromConfig();
  await legacyModule._seedLastFromStates();
  assert.strictEqual(legacyModule._last.get('legacy').reqTargetW, 1234, 'Legacy-Migrationszustand wird nicht eingelesen');

  console.log('[multiuse-storage-policy-only] OK: MultiUse veröffentlicht ausschließlich SoC-Policy; storage-control bleibt einziger Batterieschreiber.');
})().catch((error) => {
  console.error('[multiuse-storage-policy-only] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
