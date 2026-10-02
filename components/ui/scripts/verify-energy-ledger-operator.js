#!/usr/bin/env node
'use strict';
const fs = require('fs');
function read(path) { return fs.readFileSync(path, 'utf8'); }
function must(path, needle, label) {
  const text = read(path);
  if (!text.includes(needle)) {
    console.error(`[FAIL] ${label}: missing ${needle} in ${path}`);
    process.exit(1);
  }
  console.log(`[OK] ${label}`);
}
function file(path) {
  if (!fs.existsSync(path)) {
    console.error(`[FAIL] missing ${path}`);
    process.exit(1);
  }
  console.log(`[OK] ${path}`);
}
file('src-ts/runtime-executables/ems/modules/energy-ledger.ts');
file('src-ts/runtime-executables/www/energy-ledger.ts');
file('src-ts/runtime-executables/www/energy-origin-ledger-view.ts');
file('src-ts/runtime-executables/lib/energy-origin-api.ts');
file('www/energy-ledger.html');
must('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'buildKwhSourceMix', 'Quelle je kWh helper');
must('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'energyLedger.operator.viewJson', 'Betreiberansicht state');
must('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'energyLedger.walletBridge.summaryJson', 'Energy Wallet Bridge state');
must('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'csvFoundationForPeriod', 'Monats-/Jahres-Exportbasis helper');
must('src-ts/runtime-executables/main.ts', '/api/ledger/local-kwh.csv', 'CSV API route');
must('src-ts/runtime-executables/main.ts', '/ledger/local-kwh', 'Betreiberansicht route');
must('src-ts/runtime-executables/main.ts', 'keine doppelte Zählung', 'No-duplicate comment');
must('src-ts/runtime-executables/www/energy-origin-ledger-view.ts', '/api/ledger/energy-origin?period=', 'Operator view origin API usage');
must('src-ts/runtime-executables/lib/energy-origin-api.ts', '/api/ledger/energy-origin.csv', 'Origin CSV API route');
must('src-ts/runtime-executables/lib/energy-origin-api.ts', 'cp.energyKwh !== undefined ? cp.energyKwh : cp.totalKwh', 'Origin CSV charge-point energy field');
must('src-ts/runtime-executables/lib/energy-origin-api.ts', '/ledger/energy-origin', 'Origin operator route');
console.log('Energy Ledger operator/export checks passed.');
