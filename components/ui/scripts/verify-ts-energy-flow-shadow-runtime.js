#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-energy-flow-shadow-runtime.js
 *
 * Zweck:
 * Prüft, ob der TypeScript-Energiefluss-Resolver als Shadow-/Vergleichsmodus in
 * `main.js` vorbereitet ist.
 *
 * Zusammenhang:
 * Dieser Check schützt die schrittweise Migration. Der TS-Resolver darf in 0.7.75
 * nur vergleichen und diagnostizieren, aber keine produktiven Werte ersetzen.
 */

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');

const requiredMarkers = [
  '_nwGetEnergyFlowTsMirrorResolver',
  '_nwBuildEnergyFlowTsShadowInput',
  '_nwRunEnergyFlowTsShadowComparison',
  'ts-mirror-shadow',
  'Runtime/TS mismatch',
  'tsShadow',
];

const missing = requiredMarkers.filter((m) => !main.includes(m));
if (missing.length) {
  console.error('[ts-energy-flow-shadow] FAILED: missing markers: ' + missing.join(', '));
  process.exit(1);
}

const resolverPath = path.join(root, 'lib', 'ts-mirrors', 'energy-flow', 'resolvers', 'energy-flow-resolver.js');
const resolver = require(resolverPath);
if (!resolver || typeof resolver.buildEnergyFlowSnapshot !== 'function') {
  console.error('[ts-energy-flow-shadow] FAILED: resolver mirror does not export buildEnergyFlowSnapshot');
  process.exit(1);
}

const snapshot = resolver.buildEnergyFlowSnapshot({
  ts: 1,
  pvW: 2800,
  buildingLoadW: undefined,
  grid: { hasConfiguredSplitDp: true, hasConfiguredSignedDp: false, importW: 0, exportW: 2400 },
  storage: { hasConfiguredSplitDp: true, hasConfiguredSignedDp: false, chargeW: 0, dischargeW: 0, socPct: 44 },
  evcsW: 0,
  heatingRodW: 0,
  thermalW: 0,
});

if (!snapshot || !snapshot.grid || !snapshot.storage) {
  console.error('[ts-energy-flow-shadow] FAILED: resolver mirror did not return expected snapshot shape');
  process.exit(1);
}

console.log('[ts-energy-flow-shadow] OK: Shadow-Vergleich ist vorbereitet und Resolver-Spiegel ist lauffähig.');
