#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-feature-visibility-effective-runtime.js
 *
 * Zweck:
 * Prüft den 0.7.74-Migrationsschritt, bei dem die TypeScript-Feature-Sichtbarkeit
 * autoritativ in der /config-Antwort genutzt wird.
 *
 * Zusammenhang:
 * Dieser Check schützt vor Rückfällen, bei denen EVCS/Speicherfarm wieder über alte
 * JavaScript-Flags sichtbar werden könnten. Der Check verändert keine Runtime.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const mainPath = path.join(root, 'main.js');
const mirrorPath = path.join(root, 'lib', 'ts-mirrors', 'backend', 'feature-visibility', 'feature-visibility.js');

function fail(message) {
  console.error(`[ts-feature-visibility-effective] ERROR: ${message}`);
  process.exit(1);
}

function requireText(file) {
  if (!fs.existsSync(file)) fail(`missing file: ${path.relative(root, file)}`);
  return fs.readFileSync(file, 'utf8');
}

const main = requireText(mainPath);
const requiredMainMarkers = [
  'const featureVisibilityEffective =',
  'const evcsAvailableEffective =',
  'const storageFarmAvailableEffective =',
  'featureVisibility: {',
  'source: featureVisibilitySource',
  'evcsCount: evcsCountForConfigEffective',
  'evcsList: evcsAvailableEffective ? evcsListForConfig : []',
  'aiAdvisorEnabled: aiAdvisorEnabledEffective',
];
for (const marker of requiredMainMarkers) {
  if (!main.includes(marker)) fail(`main.js marker missing: ${marker}`);
}

const mirror = require(mirrorPath);
if (!mirror || typeof mirror.buildFeatureVisibilityState !== 'function') {
  fail('backend feature visibility mirror does not export buildFeatureVisibilityState');
}

const noEvcs = mirror.buildFeatureVisibilityState({
  evcsProofs: [],
  storageFarmEnabled: false,
  storageFarmProofs: [],
  smartHomeEnabled: false,
  weatherEnabled: false,
  weatherHasData: false,
  aiAdvisorInstalled: true,
  aiAdvisorCustomerEnabled: false,
});
if (noEvcs.hasEvcs !== false) fail('EVCS must stay hidden without real charging point proofs');
if (noEvcs.hasStorageFarm !== false) fail('Storage farm must stay hidden without farm proofs');
if (noEvcs.hasAiAdvisor !== false) fail('AI advisor must respect customer switch off');

// Eine Einzel-Speicher-Anlage darf die Speicherfarm nicht sichtbar machen.
// Die Farmseite ist erst ab zwei real konfigurierten Farmspeichern zulässig.
const singleStorageFarmProof = mirror.buildFeatureVisibilityState({
  storageFarmEnabled: true,
  storageFarmProofs: [{ socDp: 'system.adapter.x.soc' }],
});
if (singleStorageFarmProof.hasStorageFarm !== false) fail('Storage farm must stay hidden with only one storage proof');

const withFeatures = mirror.buildFeatureVisibilityState({
  evcsProofs: [{ hasAnyRealDatapoint: true }],
  storageFarmEnabled: true,
  storageFarmProofs: [
    { socDp: 'system.adapter.x.soc' },
    { signedPowerDp: 'system.adapter.y.power' },
  ],
  smartHomeEnabled: true,
  weatherEnabled: true,
  weatherHasData: true,
  aiAdvisorInstalled: true,
  aiAdvisorCustomerEnabled: true,
});
if (withFeatures.hasEvcs !== true) fail('EVCS should become visible with real proof');
if (withFeatures.hasStorageFarm !== true) fail('Storage farm should become visible with enabled farm and two real proofs');
if (withFeatures.hasSmartHome !== true) fail('SmartHome should become visible when enabled');
if (withFeatures.hasWeather !== true) fail('Weather should become visible when enabled and data exists');
if (withFeatures.hasAiAdvisor !== true) fail('AI advisor should become visible when installed and customer enabled');

console.log('[ts-feature-visibility-effective] OK: authoritative feature visibility runtime wiring looks valid.');
