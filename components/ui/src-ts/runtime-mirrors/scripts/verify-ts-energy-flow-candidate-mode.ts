// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-energy-flow-candidate-mode.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-energy-flow-candidate-mode.js
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
 * Original-Hash: a180889f0987ee69f2464a75dc605d6a9d04c0274033b95a62d40ddcb9c8fbff
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
 * Code-Teil: verify-ts-energy-flow-candidate-mode
 * Zweck: Prüft den sicheren TS-Kandidatenmodus mit Warmup und Auto-Fallback.
 * Zusammenhang: Verhindert, dass Energiefluss-TS ohne mehrfache saubere Shadow-Ticks produktiv genutzt wird.
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
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
 * Code-Teil: mustContain
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const mustContain = (rel, needle) => {
  const text = read(rel);
  if (!text.includes(needle)) throw new Error(`${rel} enthält erwarteten Text nicht: ${needle}`);
};
/**
 * Code-Teil: mustNotContain
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const mustNotContain = (rel, needle) => {
  const text = read(rel);
  if (text.includes(needle)) throw new Error(`${rel} enthält entfernten sichtbaren Text noch: ${needle}`);
};
for (const needle of ['energyFlowCandidateWarmupTicks','energyFlowCandidateAutoFallback','ts-candidate-warmup','ts-candidate-active','_energyFlowTsCandidateState']) mustContain('main.js', needle);
for (const needle of ['energyFlowTsWarmupTicks','energyFlowTsAutoFallback']) mustNotContain('www/ems-apps.html', needle);
for (const needle of ['energyFlowCandidateWarmupTicks','energyFlowCandidateAutoFallback']) mustContain('www/ems-apps.js', needle);
console.log('[ts-energy-flow-candidate-mode] OK: Kandidatenmodus mit Warmup/Fallback bleibt intern vorhanden, sichtbare Migrationsfelder sind entfernt.');
