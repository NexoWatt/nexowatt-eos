#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-heating-rod-legacy-pruned.js
 *
 * Zweck:
 * Prüft den 0.7.117-Cleanup-Schritt: doppelte JS-Referenzdetails des Heizstabs
 * werden weiter aus dem normalen Diagnosepfad entfernt und in einen kompakten
 * Pruned-Status verschoben.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function need(file, marker, label) {
  const text = read(file);
  if (!text.includes(marker)) {
    console.error(`[heating-rod-legacy-pruned] ${file}: missing ${label || marker}`);
    process.exit(1);
  }
}
need('ems/modules/heating-rod-control.js', "heatingRod.summary.tsLegacyPrunedJson", 'new pruned state');
need('ems/modules/heating-rod-control.js', '_buildHeatingRodTsLegacyPrunedState', 'pruned builder');
need('ems/modules/heating-rod-control.js', 'heating-rod-legacy-js-reference-pruned-v1', 'pruned JSON source');
need('ems/modules/heating-rod-control.js', 'duplicateReferenceDetailsRemoved', 'duplicate detail reduction marker');
need('ems/modules/heating-rod-control.js', 'fullReferenceDetailsRetained', 'full details retention flag');
need('ems/modules/heating-rod-control.js', 'pruned-counts-only', 'pruned payload mode');
need('ems/modules/heating-rod-control.js', 'legacy-reference-pruned-debug-bridge', 'cleanup stage');
need('www/ems-apps.js', 'JS-Referenzdetails', 'App-Center row');
need('www/ems-apps.js', 'JS-Details reduziert', 'App-Center reduction row');
need('www/ems-apps.js', 'legacyPruned', 'App-Center reads pruned object');
console.log('[heating-rod-legacy-pruned] OK: JS-Referenzdetails werden kompakt/pruned geführt.');
