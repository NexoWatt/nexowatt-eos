// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-evcs-energy-unit-conversion.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-evcs-energy-unit-conversion.js
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
 * Original-Hash: 0b5fdf00af9cc038a21162e70c43d8d8299767ae84852c8fec46460956cc1f8d
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
 * Regression 0.8.153: EVCS-Energieeinheiten pro Ladepunkt.
 *
 * Verbindliche Regeln:
 * - Interner EVCS-Energiezaehler bleibt kWh.
 * - Wh-Eingaenge werden nur bei aktivem Ladepunkt-Haken durch 1000 geteilt.
 * - kWh-Eingaenge bleiben unveraendert.
 * - Initialwert, Live-Update, eigener EVCS-State, Sessionlogger und History
 *   muessen denselben normalisierten kWh-Wert verwenden.
 * - NexoWatt-Devices aliases.v1.r.energyTotal wird anhand common.unit=Wh
 *   automatisch mit aktivierter Umrechnung vorbelegt.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const { normalizeEvcsEnergyTotalKwh } = require(path.join(root, 'ems', 'services', 'evcs-unit-conversion.js'));

assert.strictEqual(typeof normalizeEvcsEnergyTotalKwh, 'function', 'EVCS unit helper missing');
assert.strictEqual(normalizeEvcsEnergyTotalKwh(12345, { inputIsWh: true }), 12.345, 'Wh must be divided by 1000');
assert.strictEqual(normalizeEvcsEnergyTotalKwh(12.345, { inputIsWh: false }), 12.345, 'kWh must remain unchanged');
assert.strictEqual(normalizeEvcsEnergyTotalKwh('2500', { inputIsWh: true }), 2.5, 'numeric string Wh must be supported');
assert.strictEqual(normalizeEvcsEnergyTotalKwh('invalid', { inputIsWh: true }), 'invalid', 'non-numeric values must fail open');

const mainSource = fs.readFileSync(path.join(root, 'src-ts', 'runtime-executables', 'main.ts'), 'utf8');
const appCenterSource = fs.readFileSync(path.join(root, 'src-ts', 'runtime-executables', 'www', 'ems-apps.ts'), 'utf8');

for (const needle of [
  'energyTotalInputIsWh',
  'normalizeEvcsEnergyTotalKwh',
  "await this.setStateAsync(binding.key, { val: mirrorValue, ack: true })",
  "const normalized = this._nwScaleMappedValue(binding.key, configuredId, state.val)",
]) {
  assert.ok(mainSource.includes(needle), `main runtime contract missing: ${needle}`);
}

for (const needle of [
  'Energie-DP liefert Wh → in kWh umrechnen',
  "_updateEvcsField(i, 'energyTotalInputIsWh'",
  "out.energyTotalInputIsWh = unit === 'wh'",
  'energyMappingWasApplied',
]) {
  assert.ok(appCenterSource.includes(needle), `AppCenter contract missing: ${needle}`);
}

assert.ok(mainSource.includes("const energyTotalInputIsWh = energyUnit === 'wh'"), 'OCPP discovery must derive Wh conversion from common.unit');

console.log('EVCS energy unit conversion regression passed.');
