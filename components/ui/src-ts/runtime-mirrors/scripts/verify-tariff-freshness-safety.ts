// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-tariff-freshness-safety.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-tariff-freshness-safety.js
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
 * Original-Hash: 1d867928fdfbc2b41e2cae9b57d26cc865170ec55e1f1ebc7be53a158e41d5e1
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
 * Regression 0.8.117: Ein eingefrorener aktueller Tarifpreis darf weder
 * Negativpreis- noch Netzlade-Logik über Stunden aktiv halten. Eine frische
 * Day-Ahead-Kurve darf dagegen den aktuellen Slot sicher ersetzen.
 */
const assert = require('assert');
const { TarifVisModule } = require('../ems/modules/tarif-vis');

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
  constructor() { this.entries = new Map(); this.values = new Map(); this.ages = new Map(); }
  async upsert(entry) { this.entries.set(entry.key, { ...entry }); }
  getEntry(key) { return this.entries.get(key) || null; }
  set(key, value, ageMs = 0) { this.values.set(key, value); this.ages.set(key, ageMs); }
  getAgeMs(key) { return this.ages.has(key) ? this.ages.get(key) : null; }
  getRaw(key) { return this.values.has(key) ? this.values.get(key) : null; }
  getNumber(key, fallback = null) { const value = this.values.get(key); const n = Number(value); return Number.isFinite(n) ? n : fallback; }
  getNumberFresh(key, maxAgeMs, fallback = null) {
    const age = this.getAgeMs(key);
    if (Number.isFinite(Number(age)) && Number(age) > maxAgeMs) return fallback;
    return this.getNumber(key, fallback);
  }
  getBoolean(key, fallback = false) { return this.values.has(key) ? !!this.values.get(key) : fallback; }
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
function makeAdapter(extraTariff = {}) {
  const states = new Map();
  return {
    namespace: 'nexowatt-ui.0',
    config: {
      datapoints: {
        priceCurrent: 'provider.current', priceAverage: 'provider.average',
        priceTodayJson: 'provider.today', priceTomorrowJson: 'provider.tomorrow',
      },
      tariff: { currentPriceMaxAgeMin: 90, averagePriceMaxAgeHours: 36, curveMaxAgeHours: 36, ...extraTariff },
      storage: {},
    },
    log: { debug() {}, info() {}, warn() {}, error() {} },
    async setObjectNotExistsAsync() {},
    async setStateAsync(id, value) { states.set(id, { val: value, ts: Date.now(), lc: Date.now() }); },
    async getStateAsync(id) { return states.get(id) || null; },
    _states: states,
  };
}
/**
 * Code-Teil: baseInputs
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function baseInputs(dp) {
  dp.set('vis.settings.dynamicTariff', true, 0);
  dp.set('vis.settings.tariffMode', 2, 0);
  dp.set('vis.settings.price', 0.30, 0);
  dp.set('vis.settings.priority', 2, 0);
  dp.set('vis.settings.storagePower', 5000, 0);
  dp.set('vis.settings.evcsMaxPower', 22000, 0);
  dp.set('vis.settings.netFeeEnabled', false, 0);
  dp.set('tarif.preisDurchschnittEurProKwh', 0.25, 1000);
}
/**
 * Code-Teil: scenario
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
async function scenario(setup, tariffCfg = {}) {
  const adapter = makeAdapter(tariffCfg);
  const dp = new FakeDp();
  const module = new TarifVisModule(adapter, dp);
  await module.init();
  baseInputs(dp);
  setup(dp);
  await module.tick();
  return { adapter, dp, module };
}

(async () => {
  // 1) A stale negative direct price must not keep grid import/charging alive.
  {
    const { adapter } = await scenario((dp) => {
      dp.set('tarif.preisAktuellEurProKwh', -0.20, 2 * 60 * 60 * 1000);
    });
    assert.strictEqual(adapter._states.get('tarif.dynamicTariffStale').val, true);
    assert.strictEqual(adapter._states.get('tarif.currentPriceFresh').val, false);
    assert.strictEqual(adapter._states.get('tarif.state').val, 'unbekannt');
    assert.strictEqual(adapter._states.get('tarif.negativpreisAktiv').val, false);
    assert.strictEqual(adapter._states.get('tarif.speicherSollW').val, 0, 'stale Preis darf keine Tarif-Speicherladung/-entladung erzwingen');
    assert.strictEqual(adapter._states.get('tarif.netzLadenErlaubt').val, false, 'stale Preis muss wirtschaftliches EVCS-Netzladen fail-closed sperren; ein dringendes Zeit-Ziel übersteuert erst im Lademanagement');
    assert.strictEqual(adapter._states.get('tarif.entladenErlaubt').val, true, 'Eigenverbrauchs-Entladung muss bei stale Tarif weiter erlaubt bleiben');
    assert.strictEqual(adapter._tarifVis.gridImportPreferred, false);
  }

  // 2) A fresh curve may provide the active current slot when direct price is stale.
  {
    const now = Date.now();
    const active = [{ startsAt: new Date(now - 10 * 60 * 1000).toISOString(), endsAt: new Date(now + 50 * 60 * 1000).toISOString(), total: -0.10 }];
    const { adapter } = await scenario((dp) => {
      dp.set('tarif.preisAktuellEurProKwh', 0.40, 2 * 60 * 60 * 1000);
      dp.set('tarif.pricesTodayJson', JSON.stringify(active), 1000);
    });
    assert.strictEqual(adapter._states.get('tarif.currentPriceFresh').val, true);
    assert.strictEqual(adapter._states.get('tarif.currentPriceSource').val, 'curve-current');
    assert.strictEqual(adapter._states.get('tarif.curveFresh').val, true);
    assert.strictEqual(adapter._states.get('tarif.dynamicTariffStale').val, false);
    assert.strictEqual(adapter._states.get('tarif.negativpreisAktiv').val, true);
    assert.strictEqual(adapter._tarifVis.gridImportPreferred, true);
  }

  // 3) A stale curve must not resurrect a stale current price.
  {
    const now = Date.now();
    const active = [{ startsAt: new Date(now - 10 * 60 * 1000).toISOString(), endsAt: new Date(now + 50 * 60 * 1000).toISOString(), total: -0.10 }];
    const { adapter } = await scenario((dp) => {
      dp.set('tarif.preisAktuellEurProKwh', -0.20, 2 * 60 * 60 * 1000);
      dp.set('tarif.pricesTodayJson', JSON.stringify(active), 40 * 60 * 60 * 1000);
    });
    assert.strictEqual(adapter._states.get('tarif.currentPriceFresh').val, false);
    assert.strictEqual(adapter._states.get('tarif.curveFresh').val, false);
    assert.strictEqual(adapter._states.get('tarif.negativpreisAktiv').val, false);
    assert.strictEqual(adapter._states.get('tarif.speicherSollW').val, 0);
  }

  console.log('[tariff-freshness-safety] OK: aktueller Preis ist auf 90 min begrenzt; frische Kurve darf den Slot ersetzen; stale Daten sperren wirtschaftliches Netzladen fail-closed.');
})().catch((error) => {
  console.error('[tariff-freshness-safety] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
