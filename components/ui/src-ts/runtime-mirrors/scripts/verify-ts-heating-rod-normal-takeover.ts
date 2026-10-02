// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-heating-rod-normal-takeover.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-heating-rod-normal-takeover.js
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
 * Original-Hash: 15de1f1c3217b27aa10d77eca0ed77ebd2dc22c30d5785a1884fa2712ad3bde6
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
 * Datei: scripts/verify-ts-heating-rod-normal-takeover.js
 *
 * Zweck:
 * Prüft 0.7.111: Der Heizstab-TS-Normalpfad darf nach stabiler Phase die alte
 * JS-Referenz als Normalquelle übernehmen. JS bleibt nur bei harten Sicherheitsblockern
 * als Notfallback aktiv.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
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
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
/**
 * Code-Teil: fail
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function fail(msg) { console.error('[heating-rod-normal-takeover] ERROR: ' + msg); process.exit(1); }
/**
 * Code-Teil: must
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function must(text, marker, label) { if (!text.includes(marker)) fail(`${label} fehlt: ${marker}`); }
const js = read('ems/modules/heating-rod-control.js');
const tsMirror = read('src-ts/runtime-mirrors/ems/modules/heating-rod-control.ts');

// Produktive Runtime muss die 0.7.111-Normalpfad-Übernahme wirklich enthalten.
for (const [marker, label] of [
  ['_isHeatingRodTsNormalPathReady', 'Normalpfad-Bereitschaft'],
  ['_isHeatingRodTsHardSafetyBlock', 'harte Sicherheitsblocker'],
  ["source: normalPathReady ? 'ts-heating-rod-normal'", 'TS-Normalquelle wird übernommen'],
  ['jsReferenceReduced', 'JS-Referenzabbau wird dokumentiert'],
  ['normalPathTakenOver', 'Übernahmestatus wird gespeichert'],
  ['hard-blockers-only', 'JS-Fallback nur noch harte Blocker'],
]) must(js, marker, 'runtime: ' + label);

// Der TS-Spiegel bleibt ein manuell typisierter Migrationsspiegel. Die produktive Logik
// liegt weiterhin in ems/modules/heating-rod-control.js; wichtig ist, dass der Spiegel
// nicht durch einen rohen Sync überschrieben wurde.
must(tsMirror, 'Heating-Rod Runtime-Migrationshinweis (DE)', 'runtime mirror: Migrationskommentar');
must(tsMirror, 'type HeatingRodAdapterLike', 'runtime mirror: Adapter-Vertrag');
must(tsMirror, 'class HeatingRodControlModule extends BaseModule', 'runtime mirror: Klassenanker');

if (js.includes("label: 'Heizstab',\n                    label: 'Heizstab',")) fail('runtime: doppeltes Label in Budgetreservierung gefunden.');
console.log('[heating-rod-normal-takeover] OK: Heizstab-TS-Normalpfad übernimmt, JS bleibt Notfallback.');
