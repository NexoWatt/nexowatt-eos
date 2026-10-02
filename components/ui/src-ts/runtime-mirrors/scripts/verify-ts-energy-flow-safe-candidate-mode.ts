// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-energy-flow-safe-candidate-mode.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-energy-flow-safe-candidate-mode.js
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
 * Original-Hash: 225c233bd461eac51ccbaf0097d8e1e418b66fc0b43a7cb3277a1520ee0240f5
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
 * Datei: scripts/verify-ts-energy-flow-safe-candidate-mode.js
 *
 * Zweck:
 * Prüft die Umsetzung von 0.7.82: Der Energiefluss darf TS-Kandidatenwerte nur
 * nutzen, wenn Modus `ts`, Sicherheitsfreigabe, Shadow-OK und Kandidatenprüfung OK sind.
 *
 * Zusammenhang:
 * Dieser Check verhindert, dass eine spätere Änderung den Sicherheitsgurt entfernt
 * und dadurch History oder Energiefluss versehentlich mit ungültigen TS-Werten schreibt.
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

const checks = [
  ['main.js', '_nwValidateEnergyFlowTsCandidate'],
  ['main.js', 'ts-candidate-active'],
  ['main.js', 'ts-candidate-warmup'],
  ['main.js', 'candidateSafety'],
  ['main.js', 'Kandidatenprüfung'],
  ['www/ems-apps.js', 'Kandidatenprüfung'],
  ['www/ems-apps.js', 'energyFlowCandidateSafety'],
  ['www/ems-apps.js', 'candidateSafety vor der Anzeige berechnen'],
  ['main.js', 'publishDischargeRound - publishChargeRound'],
];

const missing = [];
for (const [file, needle] of checks) {
  const text = read(file);
  if (!text.includes(needle)) missing.push(`${file}: ${needle}`);
}

if (missing.length) {
  console.error('[ts-energy-flow-safe-candidate-mode] FEHLER: fehlende Anker:\n' + missing.join('\n'));
  process.exit(1);
}
console.log('[ts-energy-flow-safe-candidate-mode] OK: sicherer Energiefluss-TS-Kandidatenmodus ist vorhanden.');
