// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-energy-flow-productive-activation.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-energy-flow-productive-activation.js
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
 * Original-Hash: 855974fc9d992e7f10a04a9153308c5d27bcf43cad40234a7b6f47550be1db8c
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

/**
 * Prüfskript: Energiefluss-TS produktiv aktivieren (0.7.101).
 *
 * Zweck:
 * Dieses Skript stellt sicher, dass der produktive Energiefluss-TS-Pfad wirklich vorbereitet
 * ist, aber weiterhin die Sicherheitsgates enthält. Es prüft keine reale Anlage, sondern
 * verhindert, dass die Version nur kosmetisch auf TS gestellt wird oder versehentlich ohne
 * Shadow-/Kandidaten-/Anlagen-Gate produktiv schaltet.
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
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
function must(rel, token, desc) {
  const txt = read(rel);
  if (!txt.includes(token)) {
    console.error(`[energy-flow-ts-productive] FEHLT in ${rel}: ${desc}`);
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
function mustNot(rel, token, desc) {
  const txt = read(rel);
  if (txt.includes(token)) {
    console.error(`[energy-flow-ts-productive] VERBOTEN in ${rel}: ${desc}`);
    process.exit(1);
  }
}

must('main.js', "energyFlowMode: 'ts'", 'Standardmodus TS-Kandidat');
must('main.js', 'energyFlowProductionAllowed: true', 'produktive TS-Freigabe als Default mit Gates');
must('main.js', '_nwEvaluateEnergyFlowTsSwitch', 'zentrale Schaltentscheidung vorhanden');
must('main.js', '_nwValidateEnergyFlowTsCandidate', 'Kandidatenprüfung vorhanden');
must('main.js', '_nwEvaluateEnergyFlowPlantGate', 'reale Anlagen-Gate vorhanden');
must('main.js', 'energyFlowTsDefaultActivated07101', 'Migration/Marker für 0.7.101 vorhanden');
must('main.js', 'effectiveEnergyFlow', 'publizierte Werte laufen über effectiveEnergyFlow');
must('main.js', 'publishedSource', 'Diagnose der tatsächlich genutzten Quelle vorhanden');
must('www/ems-apps.js', "tm.energyFlowMode || 'ts'", 'App-Center zeigt TS als neuen Default');
must('www/ems-apps.js', 'tm.energyFlowProductionAllowed !== false', 'App-Center Freigabe defaultet aktiv, kann aber abgeschaltet werden');

// Der alte Default shadow/false darf in den zentralen Defaultblöcken nicht mehr stehen.
mustNot('main.js', "energyFlowMode: 'shadow',\n      energyFlowProductionAllowed: false", 'alter shadow/false Default');

console.log('[energy-flow-ts-productive] OK: Energiefluss-TS ist produktiv vorbereitet und durch Gates abgesichert.');
