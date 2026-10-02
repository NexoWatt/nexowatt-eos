#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = (msg) => {
  console.error(`[ts-charging-storage-assist-policy] ${msg}`);
  process.exit(1);
};
const mustContain = (rel, needle, label = needle) => {
  const text = read(rel);
  if (!text.includes(needle)) fail(`${rel}: fehlt ${label}`);
};

mustContain('src-ts/runtime-executables/www/ems-apps.ts', 'storageAssistCustomerAllowed', 'Installer-Freigabe storageAssistCustomerAllowed');
mustContain('src-ts/runtime-executables/www/ems-apps.ts', 'Kunde darf Speicher-Mitnutzung bedienen', 'Installer-UI Haken');

mustContain('src-ts/runtime-executables/www/ems-apps.ts', "storageAssistAllowedInp.className = 'nw-config-checkbox'", 'Installer-Haken kompakt gestylt');
mustContain('src-ts/runtime-executables/www/ems-apps.ts', 'nw-config-field-control--checkbox', 'Konfigurationszeile erkennt Checkboxen');
mustContain('www/styles.css', 'App-Center: kompakte Checkboxen in Konfigurationszeilen', 'CSS-Fix gegen übergroße Checkboxen');
mustContain('www/styles.css', 'input.nw-config-checkbox', 'Checkbox-Größe im App-Center begrenzt');
mustContain('src-ts/runtime-executables/www/ems-apps.ts', "storageAssistAllowedInp.className = 'nw-config-checkbox'", 'kompakte Installer-Checkbox');
mustContain('www/styles.css', '.nw-config-checkbox', 'kompakte Checkbox-CSS-Klasse');
mustContain('src-ts/runtime-executables/www/app.ts', 'evcsStorageAssistRow', 'LIVE Speicher-Row');
mustContain('src-ts/runtime-executables/www/app.ts', 'data-storage-assist', 'LIVE Speicher-Buttons');
mustContain('www/index.html', 'evcsStorageAssistRow', 'LIVE Modal HTML Speicher-Row');
mustContain('src-ts/runtime-executables/www/evcs.ts', 'data-ems-storage-assist-btn', 'EVCS Detail Speicher-Buttons');
mustContain('src-ts/runtime-executables/www/evcs.ts', 'evcsStorageAssistCustomerAllowed', 'EVCS Detail Installer-Sichtbarkeit');
mustContain('src-ts/runtime-executables/main.ts', 'storage_assist_locked', 'Backend-Sperre bei fehlender Installer-Freigabe');
mustContain('src-ts/runtime-executables/main.ts', 'userStorageAssistEnabled', 'Backend User-State');
mustContain('src-ts/runtime-executables/ems/modules/charging-management.ts', 'storageAssistCustomerAllowed', 'Runtime Installer-Freigabe');
mustContain('src-ts/runtime-executables/ems/modules/charging-management.ts', 'effectiveStorageAssist', 'Runtime effektive Speicher-Mitnutzung');
mustContain('src-ts/runtime-executables/ems/modules/charging-management.ts', 'batteryContributionW', 'Runtime Batterieanteil');
mustContain('src-ts/runtime-executables/ems/modules/charging-management.ts', 'storageProtectionRequested', 'Runtime expliziter Speicher-Schutz');
mustContain('src-ts/runtime-executables/ems/modules/charging-management.ts', 'normal-self-consumption', 'Runtime Default Eigenverbrauch ohne Schutzfreigabe');
mustContain('src-ts/runtime-executables/ems/modules/charging-management.ts', "mode: assist ? 'assist' : (protect ? 'protect' : 'normal')", 'Keine implizite Schutzaktivierung ohne Installer-Freigabe');
mustContain('src-ts/runtime-executables/ems/modules/charging-management.ts', 'installer-locked', 'Runtime Sperrgrund');
mustContain('src-ts/ems/charging-management/charging-allocation.ts', 'storageAssistCustomerAllowed', 'TS Allocation Storage-Felder');
mustContain('src-ts/ems/charging-management/charging-allocation.ts', 'batteryContributionW', 'TS Allocation Batterieanteil');

console.log('[ts-charging-storage-assist-policy] OK: Installer-Freigabe, Kundenwahl, Backend-Gate und EVCS-Storage-Policy sind verdrahtet.');
