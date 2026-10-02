#!/usr/bin/env node
'use strict';
/**
 * Regression/App-Center-Struktur 0.8.83: Einzel-Speicher sauber aus Zuordnung trennen.
 *
 * Zweck:
 * - Die Speicherregelungs-App bekommt einen eigenen App-Center-Reiter „Speicher“.
 * - Einzel-Speicher unterscheiden AC und DC/Hybrid; DC/Hybrid zeigt einen separaten
 *   PV-Erzeugungs-Messdatenpunkt.
 * - Backend-Mapping und Regelung behandeln diesen PV-DP als Messwert/Kontext, nicht als Sollwert.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const html = read('www/ems-apps.html');
const uiTs = read('src-ts/runtime-executables/www/ems-apps.ts');
const mappingTs = read('src-ts/runtime-executables/ems/modules/storage-mapping.ts');
const controlTs = read('src-ts/runtime-executables/ems/modules/storage-control.ts');
const mainTs = read('src-ts/runtime-executables/main.ts');

assert(html.includes('data-tab="storageconfig"'), 'App-Center muss einen eigenen Speicher-Reiter enthalten');
assert(html.includes('id="nw-tabpanel-storageconfig"'), 'Speicher-Reiter braucht ein eigenes Tabpanel');
assert(html.includes('id="storageCouplingMode"'), 'Speicher-Typ AC/DC muss im Speicher-Reiter auswählbar sein');
assert.strictEqual((html.match(/data-card="storage"/g) || []).length, 1, 'Speicher-Karte darf nur einmal gerendert werden');
assert(html.indexOf('id="nw-tabpanel-storageconfig"') < html.indexOf('data-card="storage"'), 'Speicher-Karte muss im Speicher-Tabpanel liegen');
assert(html.indexOf('data-card="storage"') < html.indexOf('id="nw-tabpanel-storagefarm"'), 'Speicher-Karte darf nicht mehr im Zuordnung-Block bleiben');

assert(uiTs.includes("storage: { tab: 'storageconfig'"), 'Storage-App muss im App-Katalog auf den Speicher-Reiter verlinken');
assert(uiTs.includes("{ tab: 'storageconfig', app: 'storage' }"), 'Speicher-Reiter muss abhängig von der Speicher-App sichtbar werden');
assert(uiTs.includes('function getStorageCoupling()'), 'UI braucht AC/DC-Coupling-Helfer');
assert(uiTs.includes('patch.storage.coupling = getStorageCoupling();'), 'Speicher-Typ muss gespeichert werden');
assert(uiTs.includes("showForCoupling: ['dc']"), 'DC-/Hybrid-PV-Feld darf nur bei DC sichtbar sein');
assert(uiTs.includes('dcPvPowerObjectId'), 'DC-/Hybrid-PV-DP muss in der Einzel-Speicher-Zuordnung existieren');

assert(mappingTs.includes("key: 'st.dcPvPowerW'"), 'Mapping muss st.dcPvPowerW registrieren');
assert(mappingTs.includes("coupling === 'dc' && dcPvId"), 'DC-PV-DP darf nur bei DC-/Hybrid-Kopplung registriert werden');
assert(mappingTs.includes('speicher.mapping.kopplung'), 'Mapping muss die Speicher-Kopplung diagnostizieren');
assert(mappingTs.includes('speicher.dcPvPowerW'), 'Mapping muss den DC-PV-Messwert spiegeln');
assert(mappingTs.includes("dcPvMapped = cfg.coupling === 'dc'"), 'Mapping darf alte DC-PV-Reste bei AC nicht weiter nutzen');

assert(controlTs.includes("coupling: (String(storage.coupling"), 'Speicherregelung muss AC/DC aus der Config lesen');
assert(controlTs.includes('dcPvPowerObjectId'), 'Speicherregelung muss erkennen, ob DC-PV wirklich gemappt ist');
assert(controlTs.includes('speicher.regelung.speicherKopplung'), 'Speicherregelung muss die Kopplung diagnostizieren');
assert(controlTs.includes('speicher.regelung.dcPvPowerW'), 'Speicherregelung muss DC-PV diagnostizieren');
assert(controlTs.includes("pushPv(ctx.dcPvPowerW, 'st.dcPvPowerW'"), 'FENECON-/0-Einspeise-Kontext muss DC-PV als Tages-/PV-Signal nutzen können');

assert(mainTs.includes("this.config.storage.coupling || '').trim().toLowerCase() === 'dc'"), 'Energiefluss/Historie muss Einzel-DC-Speicher erkennen');
assert(mainTs.includes("this._nwGetNumberFromCache('speicher.dcPvPowerW')"), 'Energiefluss/Historie muss den Einzel-DC-PV-Mirror lesen');
assert(mainTs.includes('singleStorageDcEnabled'), 'Diagnose muss Einzel-DC-Speicher sichtbar machen');

console.log('OK storage single tab/coupling checks passed');
