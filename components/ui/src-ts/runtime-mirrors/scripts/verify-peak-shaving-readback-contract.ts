// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-peak-shaving-readback-contract.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-peak-shaving-readback-contract.js
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
 * Original-Hash: e62e58a165c79c0437a6ac5db54ed8f72ded25f62662649c1d0a1fd0a9c85bbd
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
 * Regression 0.8.117: Peak-Shaving darf nur bestätigte Aktorwirkung als
 * Lastreduktion verbuchen. Fehlgeschlagene oder noch nicht rückgemeldete Writes
 * bleiben als offener Bedarf sichtbar; Restore-Baselines werden erst nach einer
 * erfolgreichen Freigabe entfernt.
 */
const assert = require('assert');
const { PeakShavingModule } = require('../ems/modules/peak-shaving');

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
  constructor() {
    this.entries = new Map();
    this.values = new Map();
    this.ages = new Map();
    this.writes = [];
    this.writeOk = true;
  }
  async upsert(entry) { this.entries.set(entry.key, { ...entry }); }
  getEntry(key) { return this.entries.get(key) || null; }
  getNumber(key, fallback = null) { const v = this.values.get(key); return Number.isFinite(Number(v)) ? Number(v) : fallback; }
  getNumberFresh(key, maxAgeMs, fallback = null) {
    const age = this.ages.has(key) ? this.ages.get(key) : 0;
    if (Number.isFinite(Number(age)) && Number(age) > maxAgeMs) return fallback;
    return this.getNumber(key, fallback);
  }
  getBoolean(key, fallback = false) { return this.values.has(key) ? !!this.values.get(key) : fallback; }
  getAgeMs(key) { return this.ages.has(key) ? this.ages.get(key) : 0; }
  async writeNumber(key, value) { this.writes.push({ key, value: Number(value) }); return this.writeOk; }
  async writeBoolean(key, value) { this.writes.push({ key, value: !!value }); return this.writeOk; }
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
  return {
    namespace: 'nexowatt-ui.0',
    config: { enablePeakShaving: true, peakShaving: {} },
    log: { debug() {}, info() {}, warn() {}, error() {} },
    async setObjectNotExistsAsync() {},
    async setStateAsync(id, value) { states.set(id, { val: value, ts: Date.now(), lc: Date.now() }); },
    async getStateAsync(id) { return states.get(id) || null; },
    _states: states,
  };
}
/**
 * Code-Teil: actuator
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function actuator(extra = {}) {
  return {
    id: 'load1', name: 'Load 1', mode: 'limitW', phases: 3, priority: 100,
    measurePowerId: 'load.actualW', setpointId: 'load.setW', min: 0, max: 10000,
    readbackTimeoutSec: 0.25, retryDelaySec: 0.25, maxRetries: 2, faultLockSec: 1,
    ...extra,
  };
}

(async () => {
  // 1) Failed write: no reduction may be claimed.
  {
    const dp = new FakeDp();
    const adapter = makeAdapter();
    const module = new PeakShavingModule(adapter, dp);
    dp.values.set('ps.act.load1.measureW', 10000);
    dp.writeOk = false;
    const result = await module._applyActuators([actuator()], 3000, 230);
    assert.strictEqual(result.acceptedReductionW, 0);
    assert.strictEqual(result.confirmedReductionW, 0);
    assert.strictEqual(result.unmetReductionW, 3000);
    assert.strictEqual(adapter._states.get('peakShaving.actuators.load1.appliedReductionW').val, 0);
  }

  // 2) Accepted write without mandatory readback: reduction is confirmed.
  {
    const dp = new FakeDp();
    const adapter = makeAdapter();
    const module = new PeakShavingModule(adapter, dp);
    dp.values.set('ps.act.load1.measureW', 10000);
    const result = await module._applyActuators([actuator()], 3000, 230);
    assert.strictEqual(result.acceptedReductionW, 3000);
    assert.strictEqual(result.confirmedReductionW, 3000);
    assert.strictEqual(result.unmetReductionW, 0);
    assert.strictEqual(dp.writes.at(-1).value, 7000);
  }

  // 3) Mandatory readback mismatch: accepted but not applied; matching readback confirms later.
  {
    const dp = new FakeDp();
    const adapter = makeAdapter();
    const module = new PeakShavingModule(adapter, dp);
    const row = actuator({ readbackId: 'load.readbackW', requireReadback: true, readbackTolerance: 50 });
    dp.values.set('ps.act.load1.measureW', 10000);
    dp.values.set('ps.act.load1.readback', 10000);
    let result = await module._applyActuators([row], 3000, 230);
    assert.strictEqual(result.acceptedReductionW, 3000);
    assert.strictEqual(result.confirmedReductionW, 0);
    assert.strictEqual(result.unmetReductionW, 3000);
    assert.strictEqual(result.pendingCount, 1);

    dp.values.set('ps.act.load1.readback', 7000);
    result = await module._applyActuators([row], 3000, 230);
    assert.strictEqual(result.confirmedReductionW, 3000);
    assert.strictEqual(result.unmetReductionW, 0);
  }

  // 4) Restore failure retains baseline; successful retry releases it.
  {
    const dp = new FakeDp();
    const adapter = makeAdapter();
    const module = new PeakShavingModule(adapter, dp);
    const row = actuator();
    dp.values.set('ps.act.load1.measureW', 10000);
    await module._applyActuators([row], 2000, 230);
    assert.strictEqual(module._baselines.has('load1'), true);
    dp.writeOk = false;
    let restored = await module._restoreActuators([row]);
    assert.strictEqual(restored.complete, false);
    assert.strictEqual(module._baselines.has('load1'), true);
    await new Promise(resolve => setTimeout(resolve, 280));
    dp.writeOk = true;
    restored = await module._restoreActuators([row]);
    assert.strictEqual(restored.complete, true);
    assert.strictEqual(module._baselines.has('load1'), false);
  }

  console.log('[peak-shaving-readback-contract] OK: Peak-Shaving verbucht nur bestätigte Reduktion und hält fehlgeschlagene Restores offen.');
})().catch((error) => {
  console.error('[peak-shaving-readback-contract] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
