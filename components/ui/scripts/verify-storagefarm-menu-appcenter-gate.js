#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-storagefarm-menu-appcenter-gate.js
 * Zweck: Regressionstest für die Kunden-Navigation der Speicherfarm.
 *
 * Hintergrund:
 * Alte Runtime-States (`storageFarm.*`) oder Legacy-Flags (`enableStorageFarm`) dürfen den
 * Speicherfarm-Link im Burger-Menü nicht mehr allein sichtbar machen. Sichtbar ist die Seite
 * nur, wenn die App-Center-App `storagefarm` installiert UND aktiv ist und echte Farm-DPs
 * in der Konfiguration vorhanden sind.
 */

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function fail(message) {
  console.error(`[storagefarm-menu-appcenter-gate] FEHLER: ${message}`);
  process.exit(1);
}

function mustContain(rel, needle, label) {
  const text = read(rel);
  if (!text.includes(needle)) fail(`${label || needle} fehlt in ${rel}`);
}

function mustNotContain(rel, needle, label) {
  const text = read(rel);
  if (text.includes(needle)) fail(`${label || needle} darf nicht in ${rel} stehen`);
}

// Backend-/Config-Gate: AppCenter installed+enabled ist Pflicht; Legacy-Fallbacks sind verboten.
mustContain('src-ts/runtime-executables/main.ts', 'const appCenterActive = !!(app && app.installed === true && app.enabled === true);', 'AppCenter-Pflicht im Backend');
mustContain('src-ts/runtime-executables/main.ts', "storagefarm', enableFlag: 'enableStorageFarm', noLegacyDefault: true", 'Speicherfarm darf nicht aus Legacy-enableStorageFarm aktiviert werden');
mustContain('src-ts/runtime-executables/main.ts', '_nwStorageFarmRowHasRealDatapoint', 'zentraler echter Farm-DP-Nachweis im Backend');
mustContain('src-ts/runtime-executables/main.ts', 'storageFarmConfiguredCount >= 2', 'Speicherfarm erst ab zwei echten Speichern');
mustContain('src-ts/runtime-executables/main.ts', 'const storageFarmAvailable = !!(storageFarmAppActive && storageFarmConfigured);', 'Kundensichtbarkeit nur bei AppCenter + zwei Speichern');
mustNotContain('src-ts/runtime-executables/main.ts', 'return !!cfg.enableStorageFarm;\n      })();\n      // Stale runtime states', 'Legacy-enableStorageFarm-Fallback für Kundenmenü');
mustNotContain('src-ts/runtime-executables/main.ts', 'out.enableStorageFarm = true;', 'Backend-Hydration darf Farm nicht aktivieren');
mustNotContain('src-ts/runtime-executables/www/ems-apps.ts', 'root.enableStorageFarm = true;', 'AppCenter-Hydration darf Farm nicht aktivieren');

// Frontends müssen die zentrale /config Feature-Sichtbarkeit bevorzugen.
for (const rel of [
  'src-ts/runtime-executables/www/app.ts',
  'src-ts/runtime-executables/www/history.ts',
  'src-ts/runtime-executables/www/evcs.ts',
  'src-ts/runtime-executables/www/report-common.ts',
  'src-ts/runtime-executables/www/smarthome.ts',
  'src-ts/runtime-executables/www/storagefarm.ts',
  'src-ts/runtime-executables/www/year-report.ts',
]) {
  mustContain(rel, 'featureVisibility.hasStorageFarm', `zentrale Feature-Sichtbarkeit in ${rel}`);
}
// cockpit-shell normalisiert /config.featureVisibility lokal als `fv`.
mustContain('src-ts/runtime-executables/www/cockpit-shell.ts', 'fv.hasStorageFarm === true', 'zentrale Feature-Sichtbarkeit in cockpit-shell.ts');

// Nach dem Runtime-Sync muss der gleiche Schutz auch im ausgelieferten JS stehen.
mustContain('main.js', 'const appCenterActive = !!(app && app.installed === true && app.enabled === true);', 'Runtime-Backend AppCenter-Pflicht');
mustNotContain('main.js', 'out.enableStorageFarm = true;', 'Runtime-Backend-Hydration darf Farm nicht aktivieren');
mustNotContain('www/ems-apps.js', 'root.enableStorageFarm = true;', 'Runtime-AppCenter-Hydration darf Farm nicht aktivieren');
mustContain('www/app.js', 'function nwStorageFarmAppCenterActiveFromConfig', 'Runtime-LIVE AppCenter-Helfer');
mustContain('www/app.js', 'featureVisibility.hasStorageFarm', 'Runtime-LIVE autoritative Farm-Sichtbarkeit');
mustContain('www/cockpit-shell.js', 'fv.hasStorageFarm === true', 'Runtime-Shell Feature-Sichtbarkeit');

console.log('[storagefarm-menu-appcenter-gate] OK: Speicherfarm-Menü ist an AppCenter installed+enabled + echte Farm-DPs gebunden.');
