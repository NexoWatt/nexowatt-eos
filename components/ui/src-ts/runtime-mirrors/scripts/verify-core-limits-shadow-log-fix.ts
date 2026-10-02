// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-core-limits-shadow-log-fix.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-core-limits-shadow-log-fix.js
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
 * Original-Hash: 77c3b3b33f1104a3772f0c5585272ea48a6b823958c9ccbde85c69614a0a3ec3
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
 * Regressionstest 0.8.60: Core-Limits TS-Shadow Log-Fix.
 *
 * Hintergrund:
 * `grid.effectiveW` kann im TypeScript-Spiegel ein engerer Netzbudgetbegriff sein
 * als das historische JS-Feld `grid.headroomW`. Ein einzelner Unterschied an diesem
 * Feld darf nicht minütlich als Warnung gespammt werden. Er bleibt im Diagnose-JSON,
 * wird aber als diagnosticOnly markiert.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
/**
 * Code-Teil: read
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
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
function must(file, needle, label) {
  const text = read(file);
  if (!text.includes(needle)) {
    console.error(`[core-limits-shadow-log-fix] ERROR: ${label} fehlt: ${needle}`);
    process.exit(1);
  }
}
/**
 * Code-Teil: mustNot
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function mustNot(file, needle, label) {
  const text = read(file);
  if (text.includes(needle)) {
    console.error(`[core-limits-shadow-log-fix] ERROR: ${label} darf nicht enthalten sein: ${needle}`);
    process.exit(1);
  }
}
for (const file of ['src-ts/runtime-executables/ems/modules/core-limits.ts', 'ems/modules/core-limits.js']) {
  must(file, "field === 'grid.effectiveW'", 'Grid-Mismatch-Klassifizierung');
  must(file, 'diagnosticOnly: true', 'diagnosticOnly-Markierung');
  must(file, 'warningMismatches', 'Warn-Mismatch-Filter');
  must(file, 'diagnosticOnlyMismatches', 'Diagnose-Mismatch-Liste');
  must(file, 'logSuppressed', 'Log-Suppression Diagnosefeld');
  must(file, 'grid-headroom-vs-ts-effective-budget', 'Grid-Reason');
  must(file, 'warningMismatches.length > 0', 'Warnung nur für echte Warnfelder');
  must(file, 'warningMismatches.map(m => m.field)', 'Warnmeldung enthält nur Warnfelder');
  mustNot(file, 'mismatches.map(m => m.field).join', 'alter Log-Spam über alle Mismatches');
}
console.log('[core-limits-shadow-log-fix] OK: grid.effectiveW wird diagnostisch geführt, aber nicht mehr als einzelner Warn-Log gespammt.');
