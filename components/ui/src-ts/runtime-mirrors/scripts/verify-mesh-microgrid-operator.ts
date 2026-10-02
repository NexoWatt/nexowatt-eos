// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-mesh-microgrid-operator.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-mesh-microgrid-operator.js
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
 * Original-Hash: a876889ab64a96126120b7eb3fefc341469ee0020cd629cd863802365826e8bf
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
 * Regressionstest für 0.8.35 Mesh/Microgrid Betreiberansicht.
 * Der Test schützt die Architekturregel: Betreiberansicht, JSON-API und CSV-API
 * nutzen denselben read-only Mesh/Microgrid-Statebaum und bauen keine zweite
 * Steuer-/Clusterlogik auf.
 */
const fs = require('fs');
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
function read(p){ return fs.readFileSync(p,'utf8'); }
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
function fail(msg){ console.error('[mesh-operator] ERROR: ' + msg); process.exit(1); }
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
function has(file, needle, label){ if (!file.includes(needle)) fail(label + ' fehlt: ' + needle); }
const main = read('src-ts/runtime-executables/main.ts');
const mod = read('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts');
const html = read('www/mesh-microgrid.html');
const pageTs = read('src-ts/runtime-executables/www/mesh-microgrid.ts');
const appsTs = read('src-ts/runtime-executables/www/ems-apps.ts');
const sw = read('src-ts/runtime-executables/www/sw.ts');
has(main, "'/mesh/microgrid'", 'Betreiberansicht Route');
has(main, "'/api/mesh/microgrid'", 'JSON API Route');
has(main, "'/api/mesh/microgrid.csv'", 'CSV API Route');
has(main, '_nwMeshMicrogridBuildPayload', 'gemeinsamer Payload-Builder');
has(main, 'meshMicrogrid.export.snapshotJson', 'State-Snapshot als Quelle');
has(main, 'keine zweite Clusterlogik', 'Architekturkommentar');
has(mod, 'meshMicrogrid.export.snapshotJson', 'Export Snapshot State');
has(mod, 'meshMicrogrid.operator.viewUrl', 'Operator View State');
has(mod, 'Keine weitere Berechnungsschicht zählt Werte erneut', 'keine doppelte Logik Kommentar');
has(html, 'NexoWatt EOS – Mesh/Microgrid', 'HTML Titel');
has(html, '/api/mesh/microgrid.csv', 'CSV Link');
has(pageTs, "fetch('/api/mesh/microgrid'", 'Frontend API Fetch');
has(pageTs, 'keine eigene Mesh-Logik', 'Frontend Architekturkommentar');
has(appsTs, "meshMicrogrid: { tab: 'meshmicrogrid'", 'App-Center Mesh-Konfigurationsnavigation');
has(appsTs, "Mesh/Microgrid konfigurieren", 'App-Center Mesh-Navigationslabel');
has(sw, "url.pathname.startsWith('/ems/microgrid')", 'EMS-Seite umgeht den Offline-Cache für frische Rollen-/Installationsprüfung');
if (sw.includes("  'mesh-microgrid.html',")) fail('Geschützte Legacy-HTML darf nicht vorab zwischengespeichert werden');
has(sw, 'mesh-microgrid.js', 'Service Worker JS Cache');
console.log('[mesh-operator] OK: Betreiberansicht, JSON-/CSV-API und read-only State-Snapshot sind abgesichert.');
