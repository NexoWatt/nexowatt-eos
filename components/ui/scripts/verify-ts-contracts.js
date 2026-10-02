#!/usr/bin/env node
'use strict';

/**
 * Code-Teil: TypeScript-Vertragsprüfung.
 * Zweck: Stellt sicher, dass die angelegten TS-Vertragsdateien vorhanden sind
 *        und zentrale Schnittstellen nicht versehentlich entfernt wurden.
 * Zusammenhang: Diese Prüfung ist bewusst leichtgewichtig und läuft auch ohne
 *        echte ioBroker-Instanz. Die eigentliche Typprüfung macht ts-doctor.
 * Wichtig: Wenn später Logik nach TypeScript migriert wird, werden hier neue
 *        Pflichtverträge ergänzt, damit Regressionen früh auffallen.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const required = [
  ['src-ts/contracts/energy-flow.ts', ['StorageFlowResult', 'EnergyFlowSnapshot', 'GridFlowResult', 'StorageFlowResolverInput', 'GridFlowResolverInput']],
  ['src-ts/contracts/datapoints.ts', ['DatapointDefinition', 'DatapointReadResult']],
  ['src-ts/contracts/features.ts', ['FeatureVisibilityState', 'EvcsPresenceProof', 'StorageFarmPresenceProof']],
  ['src-ts/contracts/ai-advisor.ts', ['AiAdvisorSuggestion', 'DailyPlanEntry']],
  ['src-ts/contracts/license.ts', ['LicenseState', 'LicenseValidationResult']],
  ['src-ts/contracts/iobroker-states.ts', ['AdapterStateValue', 'ApiStateResponse']],
  ['src-ts/utils/energy-flow.ts', ['SplitSignedStorageInput', 'SplitStorageDpInput', 'CalculatedStorageInput', 'splitSignedStoragePower', 'resolveSplitStorageDps', 'calculateStorageFromBalance', 'chooseStorageFlowResult', 'splitSignedGridPower', 'resolveSplitGridDps']],
];
let failed = false;
for (const [file, symbols] of required) {
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) {
    console.error(`[ts-contracts] fehlt: ${file}`);
    failed = true;
    continue;
  }
  const text = fs.readFileSync(abs, 'utf8');
  for (const sym of symbols) {
    if (!new RegExp(`\\b${sym}\\b`).test(text)) {
      console.error(`[ts-contracts] Symbol fehlt in ${file}: ${sym}`);
      failed = true;
    }
  }
}
const tsconfig = path.join(root, 'tsconfig.json');
if (!fs.existsSync(tsconfig)) {
  console.error('[ts-contracts] tsconfig.json fehlt');
  failed = true;
}
if (failed) process.exit(1);
console.log('[ts-contracts] OK: TypeScript-Vertragsdateien vorhanden.');
