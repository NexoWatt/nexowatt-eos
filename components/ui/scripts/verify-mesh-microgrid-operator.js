#!/usr/bin/env node
'use strict';
/**
 * Regressionstest für 0.8.35 Mesh/Microgrid Betreiberansicht.
 * Der Test schützt die Architekturregel: Betreiberansicht, JSON-API und CSV-API
 * nutzen denselben read-only Mesh/Microgrid-Statebaum und bauen keine zweite
 * Steuer-/Clusterlogik auf.
 */
const fs = require('fs');
function read(p){ return fs.readFileSync(p,'utf8'); }
function fail(msg){ console.error('[mesh-operator] ERROR: ' + msg); process.exit(1); }
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
