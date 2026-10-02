// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-heating-rod-emergency-fallback.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-heating-rod-emergency-fallback.js
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
 * Original-Hash: 231a9a95ca181da694f4e9a7c35c9a539bc6becf5b976becbbe0820f1456baea
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
 * Datei: scripts/verify-ts-heating-rod-emergency-fallback.js
 *
 * Zweck:
 * Prüft 0.7.112: Der alte Heizstab-JS-Pfad ist im stabilen TS-Normalpfad nur noch
 * Notfallback bei harten Sicherheitsblockern. Alte JS/TS-Referenzabweichungen bleiben
 * Diagnose und blockieren den TS-Normalpfad nicht mehr.
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
function fail(msg) { console.error('[heating-rod-emergency-fallback] ERROR: ' + msg); process.exit(1); }
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
const ui = read('www/ems-apps.js');
const mirror = read('src-ts/runtime-mirrors/ems/modules/heating-rod-control.ts');

for (const [marker, label] of [
  ['_isHeatingRodHardFallbackReason', 'harte Fallback-Klassifizierung'],
  ['_getHeatingRodTsFallbackPolicy', 'Fallback-Policy'],
  ['referenceMismatches', 'getrennte JS-Referenzmismatches'],
  ['legacyJsPathRole', 'Rolle des alten JS-Pfads'],
  ['emergency-fallback-only', 'JS nur noch Notfallback'],
  ['jsReferenceDecisionMode', 'JS-Referenz-Entscheidungsmodus'],
  ['diagnostic-only', 'JS-Referenz nur Diagnose'],
  ['previous.ready === true && !emergencyFallback', 'Normalpfad bleibt bereit ohne harten Fallback'],
  ['jsReferenceBlockingCount', 'blockierende JS-Referenzzählung'],
  ['jsFallbackLimitedToHardBlockers', 'Normalpfad begrenzt JS-Fallback auf harte Blocker'],
]) must(js, marker, 'runtime');

for (const [marker, label] of [
  ['JS-Fallback-Modus', 'UI zeigt JS-Fallback-Modus'],
  ['JS-Pfad Rolle', 'UI zeigt JS-Pfad-Rolle'],
  ['JS-Referenz', 'UI zeigt JS-Referenzmodus'],
]) must(ui, marker, 'ui');

must(mirror, 'Heating-Rod Runtime-Migrationshinweis (DE)', 'mirror: Migrationskommentar');
if (js.includes("if (mismatches.length && normalPathReady)")) {
  fail('JS/TS-Mismatch darf im TS-Normalpfad keinen eigenen Fallbackzweig mehr haben.');
}
console.log('[heating-rod-emergency-fallback] OK: Heizstab-JS-Pfad ist auf Notfallback begrenzt.');
