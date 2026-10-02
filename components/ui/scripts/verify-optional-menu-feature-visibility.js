#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-optional-menu-feature-visibility.js
 * Zweck: Regressionstest für optionale Kunden-Unterseiten im Burger-Menü.
 *
 * SmartHome und Speicherfarm dürfen auf LIVE/History/EVCS/Reports nur sichtbar werden,
 * wenn /config.featureVisibility sie ausdrücklich freigibt. Alte Root-Fallbacks wie
 * smartHomeEnabled, storageFarmEnabled oder ems.storageFarmEnabled haben in der
 * Kundennavigation nichts mehr zu suchen, weil sie alte Runtime-/Patch-Zustände wieder
 * sichtbar machen können.
 */

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function fail(msg) { console.error(`[optional-menu-feature-visibility] FEHLER: ${msg}`); process.exit(1); }
function mustContain(rel, needle, label) { if (!read(rel).includes(needle)) fail(`${label || needle} fehlt in ${rel}`); }
function mustContainAny(rel, needles, label) { const text = read(rel); if (!needles.some((needle) => text.includes(needle))) fail(`${label || needles.join(' / ')} fehlt in ${rel}`); }
function mustNotContain(rel, needle, label) { if (read(rel).includes(needle)) fail(`${label || needle} darf nicht in ${rel} stehen`); }

for (const rel of [
  'src-ts/runtime-executables/www/app.ts',
  'src-ts/runtime-executables/www/cockpit-shell.ts',
  'src-ts/runtime-executables/www/history.ts',
  'src-ts/runtime-executables/www/evcs.ts',
  'src-ts/runtime-executables/www/report-common.ts',
  'src-ts/runtime-executables/www/smarthome.ts',
  'src-ts/runtime-executables/www/storagefarm.ts',
  'src-ts/runtime-executables/www/year-report.ts',
]) {
  mustContainAny(rel, ['featureVisibility.hasSmartHome', 'fv.hasSmartHome', "'hasSmartHome'", 'nwSmartHomeFeatureFromConfig'], `SmartHome featureVisibility in ${rel}`);
  mustContainAny(rel, ['featureVisibility.hasStorageFarm', 'fv.hasStorageFarm', "'hasStorageFarm'", 'nwStorageFarmFeatureFromConfig'], `Speicherfarm featureVisibility in ${rel}`);
}

for (const rel of [
  'src-ts/runtime-executables/www/app.ts',
  'src-ts/runtime-executables/www/cockpit-shell.ts',
  'src-ts/runtime-executables/www/history.ts',
  'src-ts/runtime-executables/www/evcs.ts',
  'src-ts/runtime-executables/www/report-common.ts',
  'src-ts/runtime-executables/www/storagefarm.ts',
]) {
  mustNotContain(rel, 'cfg.smartHomeEnabled || (cfg.smartHome && cfg.smartHome.enabled)', `SmartHome Legacy-Fallback in ${rel}`);
  mustNotContain(rel, 'cfg.storageFarmEnabled || (cfg.ems && cfg.ems.storageFarmEnabled)', `Speicherfarm Legacy-Fallback in ${rel}`);
  mustNotContain(rel, 'ems.storageFarmEnabled || cfg.storageFarmEnabled', `Speicherfarm EMS-Fallback in ${rel}`);
}

mustContain('src-ts/runtime-executables/main.ts', 'const smartHomeForConfig', 'Backend überschreibt SmartHome-Config-Sichtbarkeit');
mustContain('src-ts/runtime-executables/main.ts', 'storageFarmConfiguredCount >= 2', 'Backend blendet Farm erst ab zwei Speichern ein');

mustContain('www/app.js', 'nwSmartHomeFeatureFromConfig', 'Runtime-LIVE SmartHome-Helfer');
mustContain('www/cockpit-shell.js', 'fv.hasSmartHome === true', 'Runtime-Shell nutzt featureVisibility für SmartHome');
mustContain('www/cockpit-shell.js', 'fv.hasStorageFarm === true', 'Runtime-Shell nutzt featureVisibility für Speicherfarm');

console.log('[optional-menu-feature-visibility] OK: optionale Burger-Menüpunkte hängen an /config.featureVisibility.');
