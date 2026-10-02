// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-evcs-global-storage-station-pages.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-evcs-global-storage-station-pages.js
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
 * Original-Hash: 83bf3afb79758a7ef743b8e6eb530770f76711f178bfa22feb7b9c8cc8615964
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
function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}
/**
 * Code-Teil: mustContain
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function mustContain(rel, needle, message) {
  const text = read(rel);
  if (!text.includes(needle)) {
    console.error(`[evcs-global-station-pages] FEHLER: ${message || needle} fehlt in ${rel}`);
    process.exit(1);
  }
}
/**
 * Code-Teil: mustMatch
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function mustMatch(rel, regex, message) {
  const text = read(rel);
  if (!regex.test(text)) {
    console.error(`[evcs-global-station-pages] FEHLER: ${message || regex} fehlt in ${rel}`);
    process.exit(1);
  }
}
/**
 * Code-Teil: assert
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function assert(condition, message) {
  if (!condition) {
    console.error(`[evcs-global-station-pages] FEHLER: ${message}`);
    process.exit(1);
  }
}

// Installerfreigabe und Kundenbedienung.
mustContain('www/ems-apps.html', 'id="evcsGlobalStorageAssistCustomerAllowed"', 'globale Installerfreigabe');
mustContain('src-ts/runtime-executables/www/ems-apps.ts', 'evcsGlobalStorageAssistCustomerAllowed', 'AppCenter-Persistenz');
mustContain('www/evcs.html', 'id="evcsGlobalStorageAssist"', 'globaler EVCS-Kundenschalter');
mustContain('src-ts/runtime-executables/www/evcs.ts', "key: 'evcs.global.storageAssistEnabled'", 'globaler EVCS-API-Aufruf');
mustContain('src-ts/runtime-executables/main.ts', 'global_storage_assist_locked', 'serverseitige Installerfreigabe');
mustContain('src-ts/runtime-executables/main.ts', 'storage_assist_global_control_required', 'kein inkonsistenter Einzel-LP-Schreibweg');
mustContain('src-ts/runtime-executables/main.ts', '_nwActiveEvcsControlRows', 'gemeinsame Ermittlung aktiver Ladepunkte');
mustContain('src-ts/runtime-executables/main.ts', 'global_storage_assist_partial_write', 'atomare Fehlerbehandlung bei Teilwrites');
mustContain('src-ts/runtime-executables/main.ts', 'rolledBack', 'Rollback bei teilweise geschriebenem globalem Zustand');
mustMatch('src-ts/runtime-executables/main.ts', /for \(const entry of active\)[\s\S]*userStorageAssistEnabled/, 'globaler Write auf alle aktiven Ladepunkte');
mustContain('src-ts/runtime-executables/www/ems-apps.ts', 'zwei aktiven Ladepunkten', 'Installerhinweis zur Mindestanzahl aktiver Ladepunkte');
mustMatch('src-ts/runtime-executables/www/ems-apps.ts', /globalStorageAssistControl = sc\.evcsGlobalStorageAssistCustomerAllowed === true && activeCount >= 2/, 'per-LP-Freigaben werden nur bei zwei aktiven Ladepunkten global gesperrt');
mustMatch('src-ts/runtime-executables/www/evcs.ts', /evcsGlobalStorageAssistIndices\(\)\.length >= 2/, 'Kundenschalter nur bei mindestens zwei aktiven Ladepunkten');

// Stationsebene statt einzelner manueller LP-Zuordnung.
mustContain('src-ts/runtime-executables/www/ems-apps.ts', 'data-ck-field="stationKey"', 'Stationsgruppen-Verknüpfung');
mustContain('src-ts/runtime-executables/www/ems-apps.ts', 'data-ck-field="assignmentMode"', 'automatische/manuelle Zuordnungswahl');
mustContain('src-ts/runtime-executables/www/ems-apps.ts', '_chargeKioskAssignedForStation', 'automatische Portvorschau');
mustContain('src-ts/runtime-executables/main.ts', 'portsByStation', 'serverseitige Ableitung aller Stationsports');
mustContain('src-ts/runtime-executables/main.ts', 'assignmentSource', 'Diagnose der Zuordnungsquelle');
mustMatch('src-ts/runtime-executables/main.ts', /ports\.sort\(\(a, b\) => \(a\.connectorNo/, 'Sortierung nach Connectornummer');
mustContain('src-ts/runtime-executables/main.ts', 'station-fallback-manual', 'Legacy-Fallback für bestehende Stationsseiten');

// Separates Stationsdisplay bleibt stationsbezogen und beliebig skalierbar.
mustContain('src-ts/runtime-executables/www/dc-station-display.ts', "layout.count >= 5 ? 'many'", 'Layoutklasse für fünf und mehr Ports');
mustContain('www/dc-station-display.css', '.nw-connectors--count-many', 'responsive 5+-Port-Ansicht');
mustContain('www/dc-station-display.css', '@media (min-width:1101px) and (max-height:840px)', 'Landscape-Kiosk-Optimierung');
mustContain('src-ts/runtime-executables/www/dc-station-display.ts', 'storageCentral', 'zentraler Speicherschutz-Hinweis auf Stationsseiten');
mustContain('src-ts/runtime-executables/main.ts', 'global_storage_control_required', 'Stationsdisplay darf globalen Schalter nicht pro LP umgehen');

// Die normale EVCS-Seite bleibt Gesamtübersicht; das Stationsdisplay filtert weiterhin token-/stationsbezogen.
mustContain('src-ts/runtime-executables/www/evcs.ts', 'for (let i = 1; i <= count; i++)', 'Hauptseite rendert alle Ladepunkte');
mustMatch('src-ts/runtime-executables/main.ts', /assignedSet\.has\(`lp\$\{Number\(wb\.index\)/, 'Stationspayload filtert auf Stationsports');

// Kleine reine Vertragsprüfung: automatische Station-Zuordnung muss mehrere Ports in Connector-Reihenfolge liefern.
const sample = [
  { index: 1, enabled: true, stationKey: 'dc-a', connectorNo: 2 },
  { index: 2, enabled: true, stationKey: 'dc-a', connectorNo: 1 },
  { index: 3, enabled: true, stationKey: 'dc-b', connectorNo: 1 },
];
const derived = sample
  .filter(row => row.enabled !== false && row.stationKey === 'dc-a')
  .sort((a, b) => (a.connectorNo || 999) - (b.connectorNo || 999) || a.index - b.index)
  .map(row => `lp${row.index}`);
assert(JSON.stringify(derived) === JSON.stringify(['lp2', 'lp1']), 'automatische Stationszuordnung liefert nicht alle Ports in Connector-Reihenfolge');

console.log('[evcs-global-station-pages] OK: globaler Speicherschutz, Stationsgruppen-Verknüpfung und responsive Multi-Port-Stationsseiten sind verdrahtet.');
