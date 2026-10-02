#!/usr/bin/env node
/**
 * Prüfskript: Energiefluss-TS produktiv aktivieren (0.7.101).
 *
 * Zweck:
 * Dieses Skript stellt sicher, dass der produktive Energiefluss-TS-Pfad wirklich vorbereitet
 * ist, aber weiterhin die Sicherheitsgates enthält. Es prüft keine reale Anlage, sondern
 * verhindert, dass die Version nur kosmetisch auf TS gestellt wird oder versehentlich ohne
 * Shadow-/Kandidaten-/Anlagen-Gate produktiv schaltet.
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function must(rel, token, desc) {
  const txt = read(rel);
  if (!txt.includes(token)) {
    console.error(`[energy-flow-ts-productive] FEHLT in ${rel}: ${desc}`);
    process.exit(1);
  }
}
function mustNot(rel, token, desc) {
  const txt = read(rel);
  if (txt.includes(token)) {
    console.error(`[energy-flow-ts-productive] VERBOTEN in ${rel}: ${desc}`);
    process.exit(1);
  }
}

must('main.js', "energyFlowMode: 'ts'", 'Standardmodus TS-Kandidat');
must('main.js', 'energyFlowProductionAllowed: true', 'produktive TS-Freigabe als Default mit Gates');
must('main.js', '_nwEvaluateEnergyFlowTsSwitch', 'zentrale Schaltentscheidung vorhanden');
must('main.js', '_nwValidateEnergyFlowTsCandidate', 'Kandidatenprüfung vorhanden');
must('main.js', '_nwEvaluateEnergyFlowPlantGate', 'reale Anlagen-Gate vorhanden');
must('main.js', 'energyFlowTsDefaultActivated07101', 'Migration/Marker für 0.7.101 vorhanden');
must('main.js', 'effectiveEnergyFlow', 'publizierte Werte laufen über effectiveEnergyFlow');
must('main.js', 'publishedSource', 'Diagnose der tatsächlich genutzten Quelle vorhanden');
must('www/ems-apps.js', "tm.energyFlowMode || 'ts'", 'App-Center zeigt TS als neuen Default');
must('www/ems-apps.js', 'tm.energyFlowProductionAllowed !== false', 'App-Center Freigabe defaultet aktiv, kann aber abgeschaltet werden');

// Der alte Default shadow/false darf in den zentralen Defaultblöcken nicht mehr stehen.
mustNot('main.js', "energyFlowMode: 'shadow',\n      energyFlowProductionAllowed: false", 'alter shadow/false Default');

console.log('[energy-flow-ts-productive] OK: Energiefluss-TS ist produktiv vorbereitet und durch Gates abgesichert.');
