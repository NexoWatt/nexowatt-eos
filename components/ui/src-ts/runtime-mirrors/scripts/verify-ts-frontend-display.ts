// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-frontend-display.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-frontend-display.js
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
 * Original-Hash: 92b0c4f5a7dabc50f5633b7ed9942f214328b298adcbe5864b96493554868e98
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
 * Datei: scripts/verify-ts-frontend-display.js
 *
 * Zweck:
 * Prüft, ob der TypeScript-Schritt 0.7.65 für Frontend-Anzeigehelfer vollständig
 * vorhanden ist.
 *
 * Zusammenhang:
 * Dieser Check ist bewusst ein schneller Strukturtest ohne TypeScript-Compiler. Er stellt
 * sicher, dass die neuen Frontend-Helfer, History-Toolbar-Regeln, Dashboard-Zeilen und
 * deutschen Kommentaranker im Git-Stand enthalten bleiben.
 */

const fs = require('fs');
const path = require('path');

/** Code-Teil: readText – liest eine Pflichtdatei und meldet klar, wenn sie fehlt. */
function readText(file) {
  const abs = path.join(__dirname, '..', file);
  if (!fs.existsSync(abs)) throw new Error(`Pflichtdatei fehlt: ${file}`);
  return fs.readFileSync(abs, 'utf8');
}

/** Code-Teil: requireContains – prüft wichtige Kommentar- und Funktionsanker. */
function requireContains(file, text, label) {
  const content = readText(file);
  if (!content.includes(text)) throw new Error(`${label} fehlt in ${file}`);
}

try {
  requireContains('src-ts/frontend/display-format.ts', 'Code-Teil: formatPowerValue', 'Leistungsformatierer-Kommentar');
  requireContains('src-ts/frontend/dashboard-display.ts', 'Code-Teil: buildDashboardValueRows', 'Dashboard-Anzeigezeilen');
  requireContains('src-ts/frontend/history-controls.ts', 'Code-Teil: buildHistoryToolbarState', 'History-Toolbar-Logik');
  requireContains('src-ts/frontend/customer-feature-visibility.ts', 'Code-Teil: buildCustomerFeatureVisibility', 'Feature-Sichtbarkeitslogik');
  requireContains('src-ts/quality/frontend-display-cases.ts', 'dashboardWithoutEvcs', 'Dashboard-Testfall ohne EVCS');
  requireContains('src-ts/tests/frontend-display-runtime.ts', 'EVCS PDF darf ohne Wallbox nicht sichtbar sein', 'History-EVCS-Regression');
  requireContains('tsconfig.frontend-display.json', 'frontend-display', 'Frontend-Display-tsconfig');
  console.log('[ts-frontend-display-check] OK: Frontend-TS-Helfer und Kommentare vorhanden.');
} catch (err) {
  console.error(`[ts-frontend-display-check] Fehler: ${err && err.message ? err.message : err}`);
  process.exit(1);
}
