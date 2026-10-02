// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-pv-source-dedup-cap.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-pv-source-dedup-cap.js
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
 * Original-Hash: 91052c1e2644de679dc847b47328a3476bc139ae2560da2efb49541d4efd752d
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

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { physicalPvSourceKey, dedupePvSourceRows, applyPvCapacityPlausibility } = require('../ems/services/pv-source-identity');

const a = 'nexowatt-devices.0.devices.pv1.aliases.r.power';
const b = 'nexowatt-devices.0.devices.pv1.aliases.r.pvPower';
const c = 'nexowatt-devices.0.devices.pv2.aliases.r.power';
assert.strictEqual(physicalPvSourceKey(a), physicalPvSourceKey(b), 'Aliase desselben WR müssen dieselbe physische Quelle sein');
assert.notStrictEqual(physicalPvSourceKey(a), physicalPvSourceKey(c), 'verschiedene WR dürfen nicht zusammenfallen');

const dedupe = dedupePvSourceRows([
  { id: a, powerW: 20000, ageMs: 4000, coupling: 'ac' },
  { id: b, powerW: 20500, ageMs: 1000, coupling: 'dc' },
  { id: c, powerW: 8500, ageMs: 1000, coupling: 'ac' },
]);
assert.strictEqual(dedupe.rows.length, 2);
assert.strictEqual(dedupe.uniqueTotalW, 29000);
assert.strictEqual(dedupe.rawTotalW, 49000);
assert.strictEqual(dedupe.duplicateSuppressedW, 20000);

const cap = applyPvCapacityPlausibility(42000, 30000, 0.15);
assert.strictEqual(cap.outputW, 34500, '30-kWp-Anlage darf mit 15 % Toleranz höchstens 34,5 kW veröffentlichen');
assert.strictEqual(cap.capped, true);
assert.strictEqual(applyPvCapacityPlausibility(29500, 30000, 0.15).outputW, 29500);

const main = fs.readFileSync(path.resolve(__dirname, '../src-ts/runtime-executables/main.ts'), 'utf8');
assert(main.includes('nwDedupePvSourceRows'), 'Farm-Aggregation muss physische PV-Quellen deduplizieren');
assert(main.includes('const pvPlausibility = pvFarmMerge'), 'Farm-Plausibilisierung muss zentral wiederverwendet werden');
assert(main.includes('if (!pvFarmMerge && pvPlausibility.capped)'), 'Farm-PV darf nicht ein zweites Mal skaliert werden');
assert(main.includes('derived.core.pv.rawTotalW'), 'PV-Rohwertdiagnose fehlt');
assert(main.includes('derived.core.pv.duplicateSuppressedW'), 'PV-Doppelzählungsdiagnose fehlt');

console.log('[pv-source-dedup-cap] OK: physische WR-Quellen werden dedupliziert und konfigurierte Anlagenleistung plausibilisiert.');
