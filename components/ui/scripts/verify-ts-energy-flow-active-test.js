#!/usr/bin/env node
'use strict';

/**
 * Prüft den kontrollierten Energiefluss-TS-Aktivtest. Seit 0.8.3 bleibt die
 * Diagnose intern/API-seitig vorhanden, wird aber nicht mehr als eigene
 * sichtbare App-Center-Kachel gerendert.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const errors = [];
function must(file, needle, label) {
  const text = read(file);
  if (!text.includes(needle)) errors.push(`${file}: fehlt ${label}`);
}
function mustNot(file, needle, label) {
  const text = read(file);
  if (text.includes(needle)) errors.push(`${file}: sichtbar geblieben ${label}`);
}

must('main.js', '_nwRecordEnergyFlowTsActiveTestSample', 'Backend-Aufzeichnung des Aktivtests');
must('main.js', '_nwSummarizeEnergyFlowTsActiveTestSamples', 'Backend-Zusammenfassung des Aktivtests');
must('main.js', 'control.energyFlowTsActiveTest', 'Diagnose-API-Feld energyFlowTsActiveTest');
must('main.js', 'tsActiveTest: effectiveEnergyFlow.activeTest', 'Energiefluss-Debugfeld tsActiveTest');
must('www/ems-apps.js', '_renderEnergyFlowTsActiveTestCard', 'interner Aktivtest-Renderer');
mustNot('www/ems-apps.html', 'Energiefluss TS‑Aktivtest', 'eigener sichtbarer App-Center Titel');

if (errors.length) {
  console.error('[energy-flow-active-test] Fehler:\n' + errors.map((x) => ' - ' + x).join('\n'));
  process.exit(1);
}
console.log('[energy-flow-active-test] OK: Energiefluss-TS-Aktivtest bleibt intern verdrahtet, UI-Kachel ist entfernt.');
