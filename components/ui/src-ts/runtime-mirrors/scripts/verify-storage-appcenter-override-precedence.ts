// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-storage-appcenter-override-precedence.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-storage-appcenter-override-precedence.js
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
 * Original-Hash: 3509e7baaddc562c2454766c42eeac8bf5baadf9e665e10a309fee6f2299f283
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
 * Regression 0.8.135: Explizite Speicher-Reiter-Messwerte bleiben vor globalen
 * Energiefluss-Fallbacks autoritativ. Globale signed/split Werte dürfen weiterhin
 * zur Laufzeit einspringen, aber niemals adapter.config mutieren.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const bridge = require(path.join(root, 'ems/services/storage-override-bridge.js'));
const { SpeicherMappingModule } = require(path.join(root, 'ems/modules/storage-mapping.js'));

/**
 * Code-Teil: read
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

/**
 * Code-Teil: adapterWith
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
async function adapterWith(units = {}, settings = {}, storageDatapoints = {}) {
  return {
    config: { settings, storage: { datapoints: { ...storageDatapoints } }, datapoints: {} },
    async getForeignObjectAsync(id) {
      return units[id] ? { common: { unit: units[id] } } : null;
    },
  };
}

/**
 * Code-Teil: FakeRegistry
 *
 * Zweck:
 * Automatisch markierter Klasse-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
class FakeRegistry {
  constructor(rows) { this.rows = rows || {}; }
  getEntry(key) { return this.rows[key] || null; }
  getNumber(key, fallback = null) {
    const row = this.rows[key];
    const n = row ? Number(row.val) : NaN;
    return Number.isFinite(n) ? n : fallback;
  }
  getAgeMs(key) {
    const row = this.rows[key];
    return row && Number.isFinite(Number(row.ageMs)) ? Number(row.ageMs) : null;
  }
}

(async () => {
  // Manuelle Speicher-Zuordnung gewinnt und bleibt unverändert.
  let adapter = await adapterWith(
    { 'meter.global.signed': 'kW' },
    {},
    { socObjectId: 'storage.manual.soc', batteryPowerObjectId: 'storage.manual.actual' },
  );
  const before = JSON.stringify(adapter.config);
  let result = await bridge.applyStorageMeasurementOverrides(adapter, {
    storageSoc: 'meter.global.soc',
    batteryPower: 'meter.global.signed',
    storageChargePower: 'meter.global.charge',
    storageDischargePower: 'meter.global.discharge',
  });
  assert.strictEqual(JSON.stringify(adapter.config), before, 'Bridge darf persistierte Config nicht verändern');
  assert.strictEqual(result.source, 'storage-tab-signed');
  assert.strictEqual(result.socId, 'storage.manual.soc');
  assert.strictEqual(result.signedPowerId, 'storage.manual.actual');
  assert.strictEqual(new SpeicherMappingModule(adapter, null)._getCfg().dp.batteryPowerObjectId, 'storage.manual.actual');

  // Ohne manuelle Leistung bleibt signed global als Runtime-Fallback nutzbar.
  adapter = await adapterWith({ 'meter.signed': 'kW' });
  result = await bridge.applyStorageMeasurementOverrides(adapter, {
    storageSoc: 'meter.soc',
    batteryPower: 'meter.signed',
    storageChargePower: 'meter.charge',
    storageDischargePower: 'meter.discharge',
  });
  assert.strictEqual(result.source, 'appcenter-signed-fallback');
  assert.strictEqual(result.socId, 'meter.soc');
  assert.strictEqual(result.signedPowerId, 'meter.signed');
  assert.strictEqual(adapter._nwStorageMeasurementFallback.datapoints.batteryPowerScale, 1000);
  assert.deepStrictEqual(adapter.config.storage.datapoints, {});

  // Split-Fallback bleibt möglich und korrekt skaliert.
  adapter = await adapterWith({ 'meter.charge': 'W', 'meter.discharge': 'kW' });
  result = await bridge.applyStorageMeasurementOverrides(adapter, {
    storageChargePower: 'meter.charge',
    storageDischargePower: 'meter.discharge',
  });
  assert.strictEqual(result.source, 'appcenter-split-fallback');
  assert.strictEqual(result.chargePowerId, 'meter.charge');
  assert.strictEqual(result.dischargePowerId, 'meter.discharge');
  assert.strictEqual(adapter._nwStorageMeasurementFallback.datapoints.batteryDischargePowerScale, 1000);
  assert.deepStrictEqual(adapter.config.storage.datapoints, {});

  const split = bridge.resolveSplitBatteryFeedback(new FakeRegistry({
    'st.batteryChargePowerW': { objectId: 'meter.charge', val: 2900, ageMs: 100 },
    'st.batteryDischargePowerW': { objectId: 'meter.discharge', val: 400, ageMs: 120 },
    'st.targetPowerW': { objectId: 'ctrl.target', val: 0, ageMs: 0 },
  }), { datapoints: { batteryFeedbackSource: 'appcenter-split-fallback' } }, 15000);
  assert.ok(split && split.trusted, 'Split-Istleistung muss vertrauenswürdig sein');
  assert.strictEqual(split.observedW, -2500, 'Entladen minus Laden muss signed Feedback ergeben');

  const rejected = bridge.resolveSplitBatteryFeedback(new FakeRegistry({
    'st.batteryChargePowerW': { objectId: 'device.aliases.ctrl.chargePowerW', val: 3000, ageMs: 100 },
    'st.targetChargePowerW': { objectId: 'device.aliases.ctrl.chargePowerW', val: 3000, ageMs: 100 },
  }), { datapoints: {} }, 15000);
  assert.strictEqual(rejected, null, 'Steuer-/Sollwert-DP darf nie Istfeedback werden');

  const freeNamedFeedback = bridge.resolveSplitBatteryFeedback(new FakeRegistry({
    'st.batteryChargePowerW': { objectId: 'vendor.free.ctrl.actualChargePower', val: 1700, ageMs: 100 },
    'st.targetChargePowerW': { objectId: 'vendor.free.command.chargeTarget', val: 0, ageMs: 100 },
  }), { datapoints: {} }, 15000);
  assert.ok(freeNamedFeedback && freeNamedFeedback.trusted, 'frei benannter .ctrl.-Istwert muss zulässig bleiben');
  assert.strictEqual(freeNamedFeedback.observedW, -1700);

  const main = read('src-ts/runtime-executables/main.ts');
  const engine = read('src-ts/runtime-executables/ems/engine.ts');
  const storage = read('src-ts/runtime-executables/ems/modules/storage-control.ts');
  assert.ok(engine.includes('applyStorageMeasurementOverrides(adapter, dps)'), 'Engine muss Runtime-Fallback-Bridge aufrufen');
  assert.ok(engine.includes('manuelle Zuordnungen im Speicher-Reiter bleiben immer autoritativ'), 'Engine-Vertrag muss die Speicher-Reiter-Priorität dokumentieren');
  assert.ok(main.includes('return nwNormalizeStorageDatapointsConfig(storageIn);'), 'Persistenznormalisierung muss globale Fallbacks ausschließen');
  assert.ok(storage.includes('mergeStorageMeasurementFallback(storage, runtimeFallback)'), 'Speicherregelung muss runtime-only Fallback sauber ergänzen');
  assert.ok(storage.includes('resolveSplitBatteryFeedback'), 'Speicherregelung muss Split-Istwerte nutzen');

  console.log('[storage-appcenter-override-precedence] OK: Speicher-Reiter bleibt autoritativ; globale signed/split Werte sind ausschließlich Runtime-Fallbacks.');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
