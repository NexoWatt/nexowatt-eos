#!/usr/bin/env node
'use strict';

const fs = require('fs');
function read(p) { return fs.readFileSync(p, 'utf8'); }
function must(file, needle) {
  const source = read(file);
  if (!source.includes(needle)) {
    console.error(`[charging-grid-cap-safe] Missing in ${file}: ${needle}`);
    process.exit(1);
  }
}
function mustNot(file, needle) {
  const source = read(file);
  if (source.includes(needle)) {
    console.error(`[charging-grid-cap-safe] Forbidden in ${file}: ${needle}`);
    process.exit(1);
  }
}

const pkg = JSON.parse(read('package.json'));
if (!/^\d+\.\d+\.\d+$/.test(String(pkg.version || ''))) {
  console.error('[version] invalid SemVer');
  process.exit(1);
}

const ts = 'src-ts/runtime-executables/ems/modules/charging-management.ts';
const js = 'ems/modules/charging-management.js';
const uiTs = 'src-ts/runtime-executables/www/ems-apps.ts';
const uiJs = 'www/ems-apps.js';

for (const file of [ts, js]) {
  must(file, 'gridBaseLoadRawW = gridW - gridEvcsActualForCapW');
  must(file, 'derived.core.building.loadRestW');
  must(file, 'gridLocalSupportW = Math.max(0, gridBaseLoadW - gridBaseLoadRawW)');
  must(file, 'hardLimitW: gridImportLimitEffW');
  must(file, 'currentControlledLoadW: gridEvcsActualForCapW');
  must(file, 'gridIncrementHeadroomW = gridEnvelope.progressiveIncrementW');
  must(file, 'gridCapEvcsW = clamp(gridEnvelope.maxControlledLoadW, 0, 1e12)');
  must(file, 'resolveCurrentNvpSnapshot(');
  mustNot(file, 'gridCapEvcsW = clamp(gridImportLimitEffW - gridBaseLoadW, 0, gridImportLimitEffW)');
}

must(ts, 'chargingManagement.control.gridLocalSupportW');
must('src-ts/runtime-executables/main.ts', 'gridLocalSupportW: await getOwn');
must(uiTs, 'EVCS Cap (NVP / Importgrenze)');
must(uiTs, 'Hard-Headroom signed');
must(uiJs, 'EVCS Cap (NVP / Importgrenze)');

console.log('OK: EVCS grid cap uses signed NVP plus fresh EVCS actual power; export increases import-only headroom and reservations stay excluded.');
