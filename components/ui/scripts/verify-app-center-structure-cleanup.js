#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-app-center-structure-cleanup.js
 * Zweck: Regressionstest für das App-Center-Schema ab 0.8.33.
 * Hintergrund: Der Apps-Reiter darf nur Funktionsmodule anzeigen. Reine Zuordnung
 * wie Marktprofil/NL-P1 gehört in den Reiter Zuordnung; DC-Stationsseiten gehören
 * in den Reiter Ladepunkte. Dieser Test verhindert, dass spätere Features wieder
 * ungeordnet vorne unter „Apps“ abgelegt werden.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'www', 'ems-apps.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'www', 'ems-apps.js'), 'utf8');
const ts = fs.readFileSync(path.join(root, 'src-ts', 'runtime-executables', 'www', 'ems-apps.ts'), 'utf8');

function fail(message) {
  console.error(`[app-center-structure] ERROR: ${message}`);
  process.exit(1);
}
function mustContain(text, needle, label) {
  if (!text.includes(needle)) fail(`${label} fehlt: ${needle}`);
}
function mustNotContain(text, needle, label) {
  if (text.includes(needle)) fail(`${label} darf nicht enthalten: ${needle}`);
}

mustContain(html, 'id="systemProfileMappingSlot"', 'Zuordnung-Slot Marktprofil');
mustContain(html, 'id="nlP1MappingSlot"', 'Zuordnung-Slot NL P1/DSMR');
mustContain(html, 'id="chargeKioskEvcsSlot"', 'Ladepunkte-Slot DC Station Display');
mustContain(html, 'id="meshMicrogridConfigSlot"', 'separater Mesh/Microgrid-Reiter-Slot');
mustContain(html, 'data-tab="meshmicrogrid"', 'separater Mesh/Microgrid-Reiter');
mustContain(html, 'Dieser Reiter wird nur eingeblendet, wenn die App installiert ist.', 'Mesh/Microgrid-Reiter-Installationshinweis');
mustContain(html, 'id="nw-emsapps-back-installer"', 'Zurück-zum-Installer-Button');

// 0.8.34: Der Zurück-Button muss auf den Admin-Tab zeigen, nicht auf tab.html
// des Adapter-Webservers. Der Test schützt vor dem konkreten Fehlerbild
// „Die Datei /tab.html konnte nicht abgerufen werden“.
mustContain(html, 'href="/#tab-nexowatt-ui-0"', 'Zurück-Link Admin-Hash-Fallback');
mustContain(ts, 'tab-nexowatt-ui-', 'Zurück-Button Admin-Hash im TS');
mustContain(ts, 'detectAdminOrigin', 'Zurück-Button Admin-Origin-Erkennung');
mustNotContain(ts, "return 'tab.html'", 'alter relativer tab.html-Fallback');
mustNotContain(js, "return 'tab.html'", 'alter relativer tab.html-Fallback Runtime');
mustContain(html, 'href="/#tab-nexowatt-ui-0"', 'statischer Fallback für Admin-Tab-Rücksprung');
mustContain(ts, 'function getInstallerAdminUrl()', 'TS Admin-Rücksprung-URL-Resolver');
mustContain(ts, '#tab-nexowatt-ui-0', 'TS Admin-Tab-Ziel');
mustContain(ts, 'adminPort', 'TS Admin-Port-Fallback');
mustContain(js, 'function getInstallerAdminUrl()', 'Runtime Admin-Rücksprung-URL-Resolver');
mustContain(js, '#tab-nexowatt-ui-0', 'Runtime Admin-Tab-Ziel');

mustContain(ts, 'function buildAppCenterStructurePanels()', 'TS-Struktur-Renderer');
mustContain(js, 'function buildAppCenterStructurePanels()', 'Runtime-Struktur-Renderer');
mustContain(ts, 'meshMicrogridMount', 'TS Mesh/Microgrid-Mount');
mustContain(js, 'meshMicrogridMount', 'Runtime Mesh/Microgrid-Mount');
mustContain(ts, "{ tab: 'meshmicrogrid', app: 'meshMicrogrid' }", 'TS Mesh/Microgrid-Reiter abhängig von Installation');
mustContain(js, "{ tab: 'meshmicrogrid', app: 'meshMicrogrid' }", 'Runtime Mesh/Microgrid-Reiter abhängig von Installation');
mustNotContain(ts, 'els.appsList.appendChild(buildMeshMicrogridCard())', 'Apps-Reiter darf keine Mesh/Microgrid-Konfigurationskarte rendern');
mustNotContain(js, 'els.appsList.appendChild(buildMeshMicrogridCard())', 'Apps-Reiter Runtime darf keine Mesh/Microgrid-Konfigurationskarte rendern');

mustNotContain(ts, "{ id: 'nlP1'", 'APP_CATALOG');
mustNotContain(ts, "{ id: 'chargeKiosk'", 'APP_CATALOG');
mustNotContain(js, "{ id: 'nlP1'", 'APP_CATALOG Runtime');
mustNotContain(js, "{ id: 'chargeKiosk'", 'APP_CATALOG Runtime');



// 0.8.37: Mesh/Microgrid darf keine Detailkonfiguration mehr im Apps-Reiter
// rendern. Es gibt stattdessen einen eigenen Reiter, der nur bei installierter
// EOS-App sichtbar wird.
mustContain(html, 'data-tab="meshmicrogrid"', 'Mesh/Microgrid eigener Reiter');
mustContain(html, 'id="meshMicrogridConfigSlot"', 'Mesh/Microgrid Konfigurations-Slot');
mustContain(ts, 'mount(els.meshMicrogridMount, isMeshInstalled ? buildMeshMicrogridCard() : null)', 'Mesh/Microgrid Mount nur bei installierter App');
mustContain(js, 'mount(els.meshMicrogridMount, isMeshInstalled ? buildMeshMicrogridCard() : null)', 'Mesh/Microgrid Runtime-Mount nur bei installierter App');
mustNotContain(ts, 'els.appsList.appendChild(buildMeshMicrogridCard())', 'Mesh/Microgrid darf nicht im Apps-Reiter gerendert werden');
mustNotContain(js, 'els.appsList.appendChild(buildMeshMicrogridCard())', 'Mesh/Microgrid darf nicht im Apps-Reiter gerendert werden Runtime');
mustContain(ts, "{ tab: 'meshmicrogrid', app: 'meshMicrogrid' }", 'Mesh/Microgrid Tab-Visibility-Mapping');

mustContain(ts, 'nw-storagefarm-master-detail', 'Speicherfarm Master-Detail TS');
mustContain(js, 'nw-storagefarm-master-detail', 'Speicherfarm Master-Detail Runtime');


// 0.8.37: Mesh/Microgrid ist zwar eine Funktions-App, aber die Detailkonfiguration
// darf nicht mehr auf der Apps-Startseite stehen. Installiert/Aktiv bleibt dort,
// Details liegen in einem eigenen Reiter, der nur bei installierter App sichtbar wird.
mustContain(html, 'data-tab="meshmicrogrid"', 'eigener Mesh/Microgrid-Reiter');
mustContain(html, 'id="meshMicrogridConfigSlot"', 'Mesh/Microgrid-Konfigurationsslot');
mustContain(ts, 'meshMicrogridMount', 'TS Mesh/Microgrid-Mount');
mustContain(ts, "{ tab: 'meshmicrogrid', app: 'meshMicrogrid' }", 'Mesh/Microgrid-Tab-Installationsgate');
mustContain(ts, 'separate Mesh/Microgrid-Reiter wird erst sichtbar', 'TS-Kommentar eigene Mesh-App/Reiter');
mustNotContain(ts, 'els.appsList.appendChild(buildMeshMicrogridCard());', 'Mesh/Microgrid-Konfiguration im Apps-Reiter');
mustNotContain(js, 'els.appsList.appendChild(buildMeshMicrogridCard());', 'Mesh/Microgrid-Konfiguration im Apps-Reiter Runtime');


// 0.8.38: Apps-Reiter bleibt Katalog. Er darf nur Installiert/Aktiv und
// Navigationshinweise zu passenden Reitern/Betreiberansichten enthalten, aber
// keine Detailkonfiguration. Konfigurationsziele sind zentral in TypeScript
// dokumentiert und die Runtime muss synchron sein.
mustContain(ts, 'const appConfigTargets = {', 'TS App-Konfigurationsziel-Mapping');
mustContain(js, 'const appConfigTargets = {', 'Runtime App-Konfigurationsziel-Mapping');
mustContain(ts, 'function appendAppConfigNavigation(body, app, st)', 'TS App-Katalog-Navigationshelfer');
mustContain(js, 'function appendAppConfigNavigation(body, app, st)', 'Runtime App-Katalog-Navigationshelfer');
mustContain(ts, 'data-app-config-nav', 'TS App-Konfigurationsnavigation-Datenattribut');
mustContain(js, 'data-app-config-nav', 'Runtime App-Konfigurationsnavigation-Datenattribut');
mustContain(ts, "meshMicrogrid: { tab: 'meshmicrogrid'", 'Mesh/Microgrid Zielreiter statt Detailkarte im Apps-Reiter');
mustContain(ts, "charging: { tab: 'evcs'", 'Lademanagement Zielreiter Ladepunkte');
mustContain(ts, "peak: { tab: 'peakconfig'", 'Peak-Shaving Zielreiter');
mustContain(ts, "storagefarm: { tab: 'storagefarm'", 'Speicherfarm Zielreiter');
mustContain(ts, "energyLedger: { tab: 'ledger'", 'Ledger Konfiguration aus App-Katalog');
mustNotContain(ts, 'id="meshMicrogridEnabled"</span>', 'Apps-Reiter darf keine Mesh-Aktiv-Detailkonfiguration enthalten');


// 0.8.38: Der Apps-Reiter ist ein strikter Katalog. Es dürfen dort keine
// langen App-spezifischen Einstellungs-/Mappingtexte mehr gerendert werden.
// Fachliche Konfiguration liegt in Reitern oder externen Betreiber-/Nutzerseiten.
mustContain(ts, 'function appendAppConfigNavigation(body, app, st)', 'TS App-Katalog-Navigation');
mustContain(js, 'function appendAppConfigNavigation(body, app, st)', 'Runtime App-Katalog-Navigation');
mustContain(ts, 'data-app-config-target', 'TS Reiter-Sprung aus App-Katalog');
mustContain(js, 'data-app-config-target', 'Runtime Reiter-Sprung aus App-Katalog');
mustContain(ts, 'Der Apps-Reiter ist strikt ein Katalog', 'TS Kommentar strikter Apps-Katalog');
mustNotContain(ts, 'Konfiguration: Reiter „Ladepunkte“. Datenpunkte: pro Ladepunkt.', 'alter Lademanagement-Detailtext im Apps-Reiter');
mustNotContain(ts, 'Kostenannahmen und An/Aus-Schalter pflegt der Betreiber', 'alter Energie-Wertkonto-Detailtext im Apps-Reiter');
mustNotContain(ts, 'Cluster und Diagnose.', 'alter Mesh/Microgrid-Detailtext im Apps-Reiter');
mustNotContain(js, 'Konfiguration: Reiter „Ladepunkte“. Datenpunkte: pro Ladepunkt.', 'alter Lademanagement-Detailtext im Apps-Reiter Runtime');
mustNotContain(js, 'Kostenannahmen und An/Aus-Schalter pflegt der Betreiber', 'alter Energie-Wertkonto-Detailtext im Apps-Reiter Runtime');
mustNotContain(js, 'Cluster und Diagnose.', 'alter Mesh/Microgrid-Detailtext im Apps-Reiter Runtime');

// 0.8.38: Der Apps-Reiter ist nur App-Katalog. Schnell-Inbetriebnahme
// gehört fachlich zu Zuordnung, weil dort Geräte-/Datenpunktmapping vorbereitet wird.
const appsPanel = html.slice(html.indexOf('id="nw-tabpanel-apps"'), html.indexOf('id="nw-tabpanel-peakconfig"'));
const mappingPanel = html.slice(html.indexOf('id="nw-tabpanel-mapping"'), html.indexOf('id="nw-tabpanel-storagefarm"'));
if (!appsPanel.includes('data-appcenter-role="app-catalog"')) fail('Apps-Reiter braucht data-appcenter-role="app-catalog" als Schema-Marker.');
if (appsPanel.includes('id="nwDevicesQuickSetup"')) fail('Schnell-Inbetriebnahme darf nicht im Apps-Reiter liegen.');
if (!mappingPanel.includes('id="nwDevicesQuickSetup"')) fail('Schnell-Inbetriebnahme muss im Reiter Zuordnung liegen.');
if (!appsPanel.includes('Nur App-Katalog')) fail('Apps-Reiter muss den Katalog-Hinweis anzeigen.');
mustContain(ts, 'App-Center-Struktur ab 0.8.38', 'TS-Kommentar App-Center-Strukturhärtung');
mustContain(js, 'App-Center-Struktur ab 0.8.38', 'Runtime-Kommentar App-Center-Strukturhärtung');
mustContain(ts, 'appendAppConfigNavigation', 'TS App-Konfigurationsnavigation');
mustContain(js, 'appendAppConfigNavigation', 'Runtime App-Konfigurationsnavigation');


// 0.8.38 Härtung: Apps-Karten dürfen keine erklärenden Detail-/Konfigurationsblöcke
// mehr enthalten. Sie zeigen nur noch Katalogstatus und optionalen Navigationssprung.
mustNotContain(ts, 'Optional quick hints', 'Apps-Reiter darf keine alten Quick-Hints rendern');
mustNotContain(js, 'Optional quick hints', 'Apps-Reiter Runtime darf keine alten Quick-Hints rendern');
mustNotContain(ts, 'Kostenannahmen und An/Aus-Schalter pflegt der Betreiber', 'Energy-Wallet-Einstellungen gehören nicht in Apps-Karten');
mustNotContain(js, 'Kostenannahmen und An/Aus-Schalter pflegt der Betreiber', 'Energy-Wallet-Einstellungen Runtime gehören nicht in Apps-Karten');
mustContain(ts, 'Fachliche Einstellungen, Mappingfelder', 'TS Kommentar: Apps-Reiter bleibt reiner Katalog');
mustContain(js, 'Fachliche Einstellungen, Mappingfelder', 'Runtime Kommentar: Apps-Reiter bleibt reiner Katalog');
mustContain(ts, 'if (body.childElementCount > 0) card.appendChild(body)', 'Apps-Karte hängt Body nur bei Navigationsinhalt an');
mustContain(js, 'if (body.childElementCount > 0) card.appendChild(body)', 'Runtime Apps-Karte hängt Body nur bei Navigationsinhalt an');

console.log('[app-center-structure] OK: App-Center-Schema, Admin-Rücksprung, Speicherfarm-Master-Detail und Mesh/Microgrid-Reiter sind abgesichert.');
