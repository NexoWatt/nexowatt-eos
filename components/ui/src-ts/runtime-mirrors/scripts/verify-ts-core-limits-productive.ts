// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-core-limits-productive.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-core-limits-productive.js
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
 * Original-Hash: 97841d1dd89039e96b72b592199b937d7dd415f881ffa11ea2174abc36ebebcd
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
 * Datei: scripts/verify-ts-core-limits-productive.js
 *
 * Zweck:
 * Prüft den 0.7.105-Schritt: Core-Limits nutzt den TypeScript-Spiegel produktiv für
 * zentrale Budget-Gates, bleibt aber bei Fehlern/Abweichungen auf JavaScript-Fallback.
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
function fail(msg) { console.error('[ts-core-limits-productive] ERROR: ' + msg); process.exit(1); }
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
/**
 * Code-Teil: has
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function has(rel, marker, label) { must(read(rel), marker, label); }

const core = read('ems/modules/core-limits.js');
must(core, '_applyCoreBudgetTsProductiveSnapshot', 'produktive TS-Übernahmefunktion');
must(core, "mode: 'central-background-ts-core'", 'TS-Core-Budget-Modus');
must(core, "source: 'ts-core-budget'", 'TS-Core-Budget-Quelle');
must(core, "reason: 'shadow-ok'", 'TS wird nur nach Shadow-OK aktiv');
must(core, "fallback: true", 'JS-Fallback-Status');
must(core, "let budgetSnapshot = this._makeBudgetSnapshot", 'BudgetSnapshot ist für TS-Übernahme ersetzbar');
must(core, "budgetSnapshot = this._applyCoreBudgetTsProductiveSnapshot", 'produktive TS-Übernahme wird vor makeBudgetRuntime angewendet');
must(core, "ems.budget.source", 'Budget-Quelle-State');
must(core, "ems.budget.tsProductiveJson", 'TS-Produktivdiagnose-State');
must(core, "JSON.stringify(b.tsProductive || {})", 'TS-Produktivdiagnose wird geschrieben');

const mainText = read('main.js');
must(mainText, 'emsBudgetTsProductiveJson', 'App-Center-Diagnose liest Core-Limits TS-Produktivstatus');
must(mainText, 'emsBudgetSource', 'App-Center-Diagnose liest Budget-Quelle');

const mirror = require(path.join(root, 'lib/ts-mirrors/ems/core-limits/core-budget.js'));
if (!mirror || typeof mirror.buildCoreBudgetSnapshot !== 'function') fail('TS-Core-Budget-Mirror exportiert buildCoreBudgetSnapshot nicht.');
const sample = mirror.buildCoreBudgetSnapshot({
  ts: 1,
  pvSurplusW: 2400,
  storageReserveW: 400,
  alreadyReservedW: 0,
  storageSocPct: 0,
  storageReserveSocPct: 100,
  allowStorageDischarge: false,
  gridImportW: 1000,
  gridImportLimitW: 5000,
  allowGridImport: true,
  totalBudgetCapW: 3000,
});
if (!sample || !sample.pv || sample.pv.effectiveW !== 2000) fail('TS-Core-Budget PV-Gate liefert unerwarteten Wert.');
if (!sample.total || sample.total.effectiveW !== 3000) fail('TS-Core-Budget Total-Cap wird nicht korrekt angewendet.');
console.log('[ts-core-limits-productive] OK: Core-Limits TS-Produktivpfad ist vorbereitet und abgesichert.');
