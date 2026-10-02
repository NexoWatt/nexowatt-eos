// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-energy-flow-regressions.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-energy-flow-regressions.js
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
 * Original-Hash: 261773f49473e3ac055c833d5dbfa61b4af56de06af5f82e38a7bdf443df3e93
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
 * Datei: scripts/verify-ts-energy-flow-regressions.js
 *
 * Zweck:
 * Prüft den neuen produktionsnahen Energiefluss-Regressionskatalog aus Version 0.7.61.
 *
 * Zusammenhang:
 * Das Skript ist bewusst normales JavaScript und benötigt kein `tsc`. Es kontrolliert,
 * dass die wichtigen Testfälle und erklärenden deutschen Kommentaranker vorhanden sind.
 * Die eigentliche Typprüfung der Datei erfolgt zusätzlich über `npm run typecheck`.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const matrixPath = path.join(root, 'src-ts', 'tests', 'energy-flow-regression-matrix.ts');

/**
 * Code-Teil: readMatrix
 * Zweck: Lädt die TypeScript-Testmatrix und liefert den Dateiinhalt für Strukturprüfungen.
 */
function readMatrix() {
  if (!fs.existsSync(matrixPath)) {
    throw new Error('Datei fehlt: src-ts/tests/energy-flow-regression-matrix.ts');
  }
  return fs.readFileSync(matrixPath, 'utf8');
}

/**
 * Code-Teil: requiredAnchors
 *
 * Zweck:
 * Enthält die fachlichen Mindestfälle, die beim Speicher-/Netzresolver nie wieder fehlen
 * dürfen. Wenn einer dieser Anker fehlt, wäre der TypeScript-Migrationsschritt nicht
 * vollständig dokumentiert.
 */
const requiredAnchors = [
  'Testfall: Split-DPs mit 0 W',
  'Testfall: Signed Speicher-DP mit positiver Entladung',
  'Testfall: Signed Speicher-DP mit negativer Ladeleistung',
  'Testfall: Bilanz-Fallback ohne Speicher-DP',
  'Testfall: Quellenpriorität Split schlägt Fallback',
  'Testfall: Quellenpriorität signed schlägt Fallback',
  'Testfall: Signed Netz-DP bei Einspeisung',
  'Testfall: Split-Netz-DPs',
  '0 W ist ein gültiger Messwert',
  'Diese Rechnung ist aber nur Fallback',
];

/**
 * Code-Teil: main
 * Zweck: Prüft die Anker und beendet den Prozess mit Fehlercode, falls etwas fehlt.
 */
function main() {
  const text = readMatrix();
  const missing = requiredAnchors.filter((anchor) => !text.includes(anchor));
  if (missing.length) {
    console.error('[ts-energy-flow-regressions] Fehlende Test-/Kommentaranker:');
    for (const item of missing) console.error(`- ${item}`);
    process.exit(1);
  }
  console.log('[ts-energy-flow-regressions] OK: Energiefluss-Regressionsmatrix vorhanden und kommentiert.');
}

main();
