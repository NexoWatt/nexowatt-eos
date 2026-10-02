#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function requireToken(file, token) {
  const txt = read(file);
  if (!txt.includes(token)) throw new Error(`${file}: missing token ${token}`);
}
const grid = 'src-ts/runtime-executables/ems/modules/grid-constraints.ts';
const wallet = 'src-ts/runtime-executables/ems/modules/energy-wallet.ts';
const app = 'src-ts/runtime-executables/www/app.ts';
['gridConstraints.exportLimit.currentExportW','gridConstraints.exportLimit.effectiveMaxFeedInW','gridConstraints.exportLimit.estimatedCurtailmentW','gridConstraints.exportLimit.missingWriteDatapointsJson','gridConstraints.exportLimit.negativePriceStrategy','_exportWriteDiagnostics','_publishExportLimitStates','_estimateCurtailmentW'].forEach(t => requireToken(grid, t));
['energyWallet.exportGuardBridge.summaryJson','curtailedKwh','curtailedValueEur','unusedPvValueEur','_exportGuardBridge'].forEach(t => requireToken(wallet, t));
['energyWalletExportGuardGrid','energyWallet.today.curtailedKwh','energyWallet.today.curtailedValueEur','energyWallet.today.unusedPvValueEur'].forEach(t => requireToken(app, t));
const appTxt = read(app);
if (appTxt.includes('curtailedPvKwh') || appTxt.includes('curtailedPvValueEur')) throw new Error('app.ts contains obsolete curtailedPv* state names');
console.log('Export Guard diagnostics / Energy Wallet curtailment checks passed.');
