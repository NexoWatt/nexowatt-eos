import type { CoreBudgetInput, CoreBudgetSnapshot } from '../contracts/ems-budget';
import type { HeatingRodDecision, HeatingRodDecisionInput } from '../contracts/heating-rod';
import { buildCoreBudgetSnapshot } from '../ems/core-limits/core-budget';
import { evaluateHeatingRodDecision } from '../ems/heating-rod/heating-rod-decision';

/**
 * Datei: src-ts/tests/ems-budget-heating-rod-smoke.ts
 *
 * Zweck:
 * Compile-only-Smoke-Test für die neuen TypeScript-Verträge aus 0.7.62.
 *
 * Zusammenhang:
 * Der Test zeigt, wie Core-Limits und Heizstab später typisiert zusammenarbeiten sollen:
 * Budget berechnen, daraus Heizstabentscheidung ableiten, Ergebnis typisiert weitergeben.
 */

/** Code-Teil: Beispielbudget erzeugen. */
const budgetInput: CoreBudgetInput = {
  ts: 1718000000000,
  pvSurplusW: 3200,
  gridImportW: 0,
  gridImportLimitW: 30000,
  storageSocPct: 65,
  storageReserveSocPct: 30,
  storageReserveW: 1000,
  allowStorageDischarge: true,
  allowGridImport: false,
};
const budget: CoreBudgetSnapshot = buildCoreBudgetSnapshot(budgetInput);

/** Code-Teil: Heizstabentscheidung aus Beispielbudget erzeugen. */
const decisionInput: HeatingRodDecisionInput = {
  ts: budget.ts,
  availablePvW: budget.pv.effectiveW,
  availableTotalW: budget.total.effectiveW,
  storageSocPct: budget.storageSocPct,
  device: {
    id: 'heater-1',
    name: 'Heizstab 1',
    enabled: true,
    mode: 'pvAuto',
    storageReserveW: 1000,
    storageReserveSocPct: 30,
    allowGridImport: false,
    allowStorageDischarge: true,
    stages: [
      { stage: 1, powerW: 1000 },
      { stage: 2, powerW: 2000 },
    ],
  },
};
const decision: HeatingRodDecision = evaluateHeatingRodDecision(decisionInput);

/** Code-Teil: Typen exportieren, damit der Compiler die Beispiele vollständig prüft. */
export const EMS_BUDGET_HEATING_ROD_SMOKE = { budget, decision };
