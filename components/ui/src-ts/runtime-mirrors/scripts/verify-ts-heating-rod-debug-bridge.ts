// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-heating-rod-debug-bridge.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-heating-rod-debug-bridge.js
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
 * Original-Hash: 05e2c505eb7b83cc4a5f51504609308d5d41a6594ac5a0b9016e63a17f42d3c3
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
 * Datei: scripts/verify-ts-heating-rod-debug-bridge.js
 *
 * Zweck:
 * Prüft 0.7.116: Der alte Heizstab-JS-Referenzpfad wird nur noch als kompakte
 * Debug-Brücke und harte Notbremse geführt.
 */
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
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
function read(rel){return fs.readFileSync(path.join(root,rel),'utf8');}
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
function fail(msg){console.error('[heating-rod-debug-bridge] ERROR: '+msg);process.exit(1);}
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
function must(file,marker,label){if(!read(file).includes(marker)) fail(`${file}: fehlt ${label||marker}`);}
const js=read('ems/modules/heating-rod-control.js');
const count=(js.match(/_buildHeatingRodTsLegacyDebugBridgeState/g)||[]).length;
if(count < 2) fail('Debug-Bridge-Builder fehlt.');
if(count > 3) fail('Debug-Bridge-Builder ist mehrfach/dupliziert vorhanden.');
must('ems/modules/heating-rod-control.js','heatingRod.summary.tsLegacyDebugBridgeJson','Debug-Bridge State');
must('ems/modules/heating-rod-control.js','heating-rod-legacy-js-debug-bridge-v1','Debug-Bridge Version v1');
must('ems/modules/heating-rod-control.js','debugBridgeActive','Debug-Bridge Aktivmarker');
must('ems/modules/heating-rod-control.js','fullReferencePayloadAllowed','vollständige JS-Referenzpayload-Regel');
must('ems/modules/heating-rod-control.js','debugPayloadSuppressed','Debug-Payload wird komprimiert');
must('ems/modules/heating-rod-control.js','legacy-reference-full-mismatch-list','entfernbare vollständige Mismatchliste');
must('ems/modules/heating-rod-control.js','heatingRod.summary.legacyJsReferenceJson', 'Legacy-Alias bleibt vorhanden');
must('www/ems-apps.js','JS-Debug-Brücke','App-Center zeigt Debug-Brücke');
must('www/ems-apps.js','JS-Debug-Nutzlast','App-Center zeigt Debug-Nutzlast');
console.log('[heating-rod-debug-bridge] OK: Alter JS-Heizstabpfad ist auf Debug-Brücke/Notfallback vorbereitet.');
