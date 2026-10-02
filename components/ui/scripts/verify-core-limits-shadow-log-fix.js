#!/usr/bin/env node
'use strict';
/**
 * Regressionstest 0.8.60: Core-Limits TS-Shadow Log-Fix.
 *
 * Hintergrund:
 * `grid.effectiveW` kann im TypeScript-Spiegel ein engerer Netzbudgetbegriff sein
 * als das historische JS-Feld `grid.headroomW`. Ein einzelner Unterschied an diesem
 * Feld darf nicht minütlich als Warnung gespammt werden. Er bleibt im Diagnose-JSON,
 * wird aber als diagnosticOnly markiert.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
function must(file, needle, label) {
  const text = read(file);
  if (!text.includes(needle)) {
    console.error(`[core-limits-shadow-log-fix] ERROR: ${label} fehlt: ${needle}`);
    process.exit(1);
  }
}
function mustNot(file, needle, label) {
  const text = read(file);
  if (text.includes(needle)) {
    console.error(`[core-limits-shadow-log-fix] ERROR: ${label} darf nicht enthalten sein: ${needle}`);
    process.exit(1);
  }
}
for (const file of ['src-ts/runtime-executables/ems/modules/core-limits.ts', 'ems/modules/core-limits.js']) {
  must(file, "field === 'grid.effectiveW'", 'Grid-Mismatch-Klassifizierung');
  must(file, 'diagnosticOnly: true', 'diagnosticOnly-Markierung');
  must(file, 'warningMismatches', 'Warn-Mismatch-Filter');
  must(file, 'diagnosticOnlyMismatches', 'Diagnose-Mismatch-Liste');
  must(file, 'logSuppressed', 'Log-Suppression Diagnosefeld');
  must(file, 'grid-headroom-vs-ts-effective-budget', 'Grid-Reason');
  must(file, 'warningMismatches.length > 0', 'Warnung nur für echte Warnfelder');
  must(file, 'warningMismatches.map(m => m.field)', 'Warnmeldung enthält nur Warnfelder');
  mustNot(file, 'mismatches.map(m => m.field).join', 'alter Log-Spam über alle Mismatches');
}
console.log('[core-limits-shadow-log-fix] OK: grid.effectiveW wird diagnostisch geführt, aber nicht mehr als einzelner Warn-Log gespammt.');
