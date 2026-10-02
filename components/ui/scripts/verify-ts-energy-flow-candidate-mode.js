#!/usr/bin/env node
'use strict';
/**
 * Code-Teil: verify-ts-energy-flow-candidate-mode
 * Zweck: Prüft den sicheren TS-Kandidatenmodus mit Warmup und Auto-Fallback.
 * Zusammenhang: Verhindert, dass Energiefluss-TS ohne mehrfache saubere Shadow-Ticks produktiv genutzt wird.
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const mustContain = (rel, needle) => {
  const text = read(rel);
  if (!text.includes(needle)) throw new Error(`${rel} enthält erwarteten Text nicht: ${needle}`);
};
const mustNotContain = (rel, needle) => {
  const text = read(rel);
  if (text.includes(needle)) throw new Error(`${rel} enthält entfernten sichtbaren Text noch: ${needle}`);
};
for (const needle of ['energyFlowCandidateWarmupTicks','energyFlowCandidateAutoFallback','ts-candidate-warmup','ts-candidate-active','_energyFlowTsCandidateState']) mustContain('main.js', needle);
for (const needle of ['energyFlowTsWarmupTicks','energyFlowTsAutoFallback']) mustNotContain('www/ems-apps.html', needle);
for (const needle of ['energyFlowCandidateWarmupTicks','energyFlowCandidateAutoFallback']) mustContain('www/ems-apps.js', needle);
console.log('[ts-energy-flow-candidate-mode] OK: Kandidatenmodus mit Warmup/Fallback bleibt intern vorhanden, sichtbare Migrationsfelder sind entfernt.');
