#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-ems-budget-heating-rod.js
 *
 * Zweck:
 * Prüft den TypeScript-Migrationsschritt 0.7.62 für Core-Limits und Heizstab.
 *
 * Zusammenhang:
 * `publish:check` soll weiterhin ohne TypeScript-Compiler laufen. Dieser Check liest
 * deshalb nur Dateien und sucht nach fachlich wichtigen Kommentar- und Funktionsankern.
 * Der eigentliche Compiler-/Runtime-Test läuft separat über
 * `npm run test:ems-budget-heating-rod-runtime`.
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

/** Code-Teil: readRequiredFile. Zweck: Bricht verständlich ab, wenn ein Migrationsartefakt fehlt. */
function readRequiredFile(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    console.error(`[ts-ems-budget-heating-rod] Missing file: ${rel}`);
    process.exit(1);
  }
  return fs.readFileSync(file, 'utf8');
}

const files = {
  emsBudgetContract: readRequiredFile('src-ts/contracts/ems-budget.ts'),
  heatingContract: readRequiredFile('src-ts/contracts/heating-rod.ts'),
  coreBudget: readRequiredFile('src-ts/ems/core-limits/core-budget.ts'),
  heatingDecision: readRequiredFile('src-ts/ems/heating-rod/heating-rod-decision.ts'),
  cases: readRequiredFile('src-ts/quality/ems-budget-heating-rod-cases.ts'),
  runtime: readRequiredFile('src-ts/tests/ems-budget-heating-rod-runtime.ts'),
  smoke: readRequiredFile('src-ts/tests/ems-budget-heating-rod-smoke.ts'),
  tsconfig: readRequiredFile('tsconfig.ems-budget-heating-rod.json'),
  packageJson: readRequiredFile('package.json'),
};

const combined = Object.values(files).join('\n');

/** Code-Teil: requireAnchor. Zweck: Stellt sicher, dass fachliche Regeln dokumentiert bleiben. */
function requireAnchor(anchor, description) {
  if (!combined.includes(anchor)) {
    console.error(`[ts-ems-budget-heating-rod] Missing ${description}: ${anchor}`);
    process.exit(1);
  }
}

for (const [anchor, description] of [
  ['CoreBudgetInput', 'Core-Limits-Vertrag'],
  ['CoreBudgetSnapshot', 'Core-Limits-Ergebnisvertrag'],
  ['HeatingRodDecisionInput', 'Heizstab-Eingabevertrag'],
  ['HeatingRodDecision', 'Heizstab-Entscheidungsvertrag'],
  ['buildCoreBudgetSnapshot', 'Core-Budget-Resolver'],
  ['evaluateHeatingRodDecision', 'Heizstab-Entscheidungsresolver'],
  ['pv-budget-keeps-storage-reserve', 'Regression: Speicherreserve reduziert PV-Budget'],
  ['heating-rod-storage-reserve-blocks', 'Regression: Speicherreserve blockiert Heizstab'],
  ['heating-rod-zero-budget-is-valid', 'Regression: 0 W Budget bleibt gültig'],
  ['Code-Teil: buildCoreBudgetSnapshot', 'deutscher Kommentar für Budget-Snapshot'],
  ['Code-Teil: evaluateHeatingRodDecision', 'deutscher Kommentar für Heizstabentscheidung'],
  ['test:ems-budget-heating-rod-runtime', 'npm-Runtime-Testskript'],
]) {
  requireAnchor(anchor, description);
}

console.log('[ts-ems-budget-heating-rod] OK: TypeScript EMS-Budget-/Heizstabstruktur und Kommentare vorhanden.');
