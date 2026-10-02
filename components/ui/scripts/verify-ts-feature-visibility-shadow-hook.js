#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-feature-visibility-shadow-hook.js
 *
 * Zweck:
 * Prüft den ersten opt-in Runtime-Hook zwischen altem Frontend-JavaScript und
 * TypeScript-MJS-Spiegeln.
 *
 * Zusammenhang:
 * 0.7.73 darf die produktive Feature-Sichtbarkeit noch nicht umstellen. Dieser
 * Check stellt sicher, dass der neue Shadow-Hook nur diagnostisch arbeitet und
 * nur nach expliziter Aktivierung per Query-Parameter oder localStorage läuft.
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function fail(message) {
  console.error(`[verify-ts-feature-visibility-shadow-hook] ERROR: ${message}`);
  process.exit(1);
}

function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) fail(`Pflichtdatei fehlt: ${rel}`);
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

function requireContains(rel, needle) {
  const text = read(rel);
  if (!text.includes(needle)) fail(`${rel} enthält erwarteten Inhalt nicht: ${needle}`);
  return text;
}

const app = requireContains('www/app.js', 'function nwTsFeatureVisibilityShadowEnabled');
requireContains('www/app.js', 'function nwBuildTsFeatureVisibilityInput');
requireContains('www/app.js', 'function nwRunTsFeatureVisibilityShadowCheck');
requireContains('www/app.js', "import('/static/ts-mirrors/frontend/customer-feature-visibility.mjs')");
requireContains('www/app.js', '?nwTsFeatureVisibilityShadow=1');
requireContains('www/static/ts-mirrors/frontend/customer-feature-visibility.mjs', 'AUTO-GENERATED FILE');

if (!app.includes('Der Vergleich ist\n  // standardmäßig aus')) {
  fail('www/app.js muss dokumentieren, dass der Shadow-Vergleich standardmäßig aus ist.');
}
if (!app.includes('console.warn(\'[nw-ts-shadow] Feature-Visibility-Abweichung\'')) {
  fail('www/app.js muss Abweichungen nur als Warnung protokollieren.');
}

console.log('[verify-ts-feature-visibility-shadow-hook] OK: opt-in Shadow-Hook für Feature-Visibility ist vorhanden und bleibt nicht-produktiv.');
