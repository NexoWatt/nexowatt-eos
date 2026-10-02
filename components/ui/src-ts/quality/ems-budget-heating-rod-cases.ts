import type { CoreBudgetInput } from '../contracts/ems-budget';
import type { HeatingRodDecisionInput, HeatingRodDeviceConfig } from '../contracts/heating-rod';
import { buildCoreBudgetSnapshot } from '../ems/core-limits/core-budget';
import { evaluateHeatingRodDecision } from '../ems/heating-rod/heating-rod-decision';

/**
 * Datei: src-ts/quality/ems-budget-heating-rod-cases.ts
 *
 * Zweck:
 * Produktionsnahe Regressionen für die nächste TypeScript-Schicht um Core-Limits und
 * Heizstab. Diese Fälle laufen noch nicht gegen die produktive Runtime, sondern gegen
 * die vorbereiteten TS-Resolver aus `src-ts/ems/*`.
 *
 * Zusammenhang:
 * Die Fälle schützen genau die Fehlerklassen, die bei Heizstab und Budget gefährlich
 * sind: Speicherreserve darf nicht verschwinden, PV-Budget darf nicht falsch hochlaufen,
 * Netzlimit muss begrenzen und Stufen müssen deterministisch ausgewählt werden.
 */

/** Erwartete Felder für einen Budgetfall. */
export interface EmsBudgetRegressionCase {
  id: string;
  description: string;
  input: CoreBudgetInput;
  actual: Record<string, unknown>;
  expected: Record<string, unknown>;
  relatedRuntimeFiles: string[];
}

/** Erwartete Felder für einen Heizstabfall. */
export interface HeatingRodRegressionCase {
  id: string;
  description: string;
  input: HeatingRodDecisionInput;
  actual: Record<string, unknown>;
  expected: Record<string, unknown>;
  relatedRuntimeFiles: string[];
}

const baseTs = 1718000000000;

/**
 * Code-Teil: heatingRodDevice
 * Zweck: Standardgerät für Regressionen. Die Stufen 1000/2000/3000 W bilden typische
 * Heizstab-Konfigurationen ab und zeigen, ob die größte passende Stufe gewählt wird.
 */
const heatingRodDevice: HeatingRodDeviceConfig = {
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
    { stage: 3, powerW: 3000 },
  ],
};

/**
 * Code-Teil: budgetCase
 * Zweck: Baut einen Core-Budget-Fall und reduziert das Ergebnis auf fachlich wichtige
 * Felder. So bleiben Diagnoseerweiterungen möglich, ohne den Test unnötig spröde zu machen.
 */
function budgetCase(id: string, description: string, input: CoreBudgetInput, expected: Record<string, unknown>): EmsBudgetRegressionCase {
  const result = buildCoreBudgetSnapshot(input);
  return {
    id,
    description,
    input,
    actual: {
      pvEffectiveW: result.pv.effectiveW,
      gridEffectiveW: result.grid.effectiveW,
      totalEffectiveW: result.total.effectiveW,
      storageReserveActive: result.storageReserveActive,
      appliedStorageReserveW: result.appliedStorageReserveW,
      pvReason: result.pv.reason,
      gridReason: result.grid.reason,
    },
    expected,
    relatedRuntimeFiles: [
      'ems/modules/core-limits.js',
      'ems/modules/heating-rod-control.js',
      'www/app.js',
      'www/history.js',
    ],
  };
}

/**
 * Code-Teil: heatingCase
 * Zweck: Baut einen Heizstab-Entscheidungsfall und prüft nur Zielstufe, Zielleistung,
 * erlaubtes Budget und Grund. Das reicht, um die kritische Reserve-/Stufenlogik abzusichern.
 */
function heatingCase(id: string, description: string, input: HeatingRodDecisionInput, expected: Record<string, unknown>): HeatingRodRegressionCase {
  const result = evaluateHeatingRodDecision(input);
  return {
    id,
    description,
    input,
    actual: {
      targetStage: result.targetStage,
      targetPowerW: result.targetPowerW,
      allowedW: result.allowedW,
      reason: result.reason,
      storageReserveActive: result.storageReserveActive,
    },
    expected,
    relatedRuntimeFiles: [
      'ems/modules/heating-rod-control.js',
      'www/ems-apps.js',
      'ems/modules/core-limits.js',
    ],
  };
}

/**
 * Code-Teil: EMS_BUDGET_REGRESSION_CASES
 * Zweck: Prüft Core-Limit-/Budgetfälle, bevor diese Logik produktiv nach TypeScript wandert.
 */
export const EMS_BUDGET_REGRESSION_CASES: EmsBudgetRegressionCase[] = [
  budgetCase(
    'pv-budget-keeps-storage-reserve',
    'PV-Überschuss wird um aktive Speicherreserve reduziert.',
    {
      ts: baseTs,
      pvSurplusW: 3500,
      gridImportW: 0,
      gridImportLimitW: 30000,
      storageSocPct: 25,
      storageReserveSocPct: 30,
      storageReserveW: 1000,
      alreadyReservedW: 0,
      allowStorageDischarge: true,
      allowGridImport: false,
    },
    {
      pvEffectiveW: 2500,
      gridEffectiveW: 0,
      totalEffectiveW: 2500,
      storageReserveActive: true,
      appliedStorageReserveW: 1000,
      pvReason: 'storage-reserve',
      gridReason: 'manual-limit',
    },
  ),
  budgetCase(
    'pv-budget-zero-is-valid',
    '0 W PV-Budget ist gültig und darf nicht als fehlend behandelt werden.',
    {
      ts: baseTs,
      pvSurplusW: 0,
      gridImportW: 0,
      gridImportLimitW: 30000,
      storageSocPct: 60,
      storageReserveSocPct: 30,
      storageReserveW: 1000,
      alreadyReservedW: 0,
      allowStorageDischarge: true,
      allowGridImport: false,
    },
    {
      pvEffectiveW: 0,
      gridEffectiveW: 0,
      totalEffectiveW: 0,
      storageReserveActive: false,
      appliedStorageReserveW: 0,
      pvReason: 'pv-surplus',
      gridReason: 'manual-limit',
    },
  ),
  budgetCase(
    'grid-limit-remaining-budget',
    'Netzlimit begrenzt zusätzliche flexible Verbraucherleistung.',
    {
      ts: baseTs,
      pvSurplusW: 500,
      gridImportW: 27000,
      gridImportLimitW: 30000,
      storageSocPct: 80,
      storageReserveSocPct: 30,
      storageReserveW: 0,
      alreadyReservedW: 0,
      allowStorageDischarge: true,
      allowGridImport: true,
    },
    {
      pvEffectiveW: 500,
      gridEffectiveW: 3000,
      totalEffectiveW: 3500,
      storageReserveActive: false,
      appliedStorageReserveW: 0,
      pvReason: 'pv-surplus',
      gridReason: 'grid-limit',
    },
  ),
];

/**
 * Code-Teil: HEATING_ROD_REGRESSION_CASES
 * Zweck: Prüft Heizstab-Stufen und Speicherreserve, ohne die produktive Runtime zu verändern.
 */
export const HEATING_ROD_REGRESSION_CASES: HeatingRodRegressionCase[] = [
  heatingCase(
    'heating-rod-chooses-largest-stage',
    'Heizstab wählt die größte Stufe, die in das PV-Budget passt.',
    {
      ts: baseTs,
      device: heatingRodDevice,
      availablePvW: 2500,
      availableTotalW: 2500,
      storageSocPct: 80,
      storageDischargeW: 0,
      gridImportW: 0,
    },
    {
      targetStage: 2,
      targetPowerW: 2000,
      allowedW: 2500,
      reason: 'pv-budget',
      storageReserveActive: false,
    },
  ),
  heatingCase(
    'heating-rod-storage-reserve-blocks',
    'Aktive Speicherreserve blockiert Heizstab trotz PV-Budget.',
    {
      ts: baseTs,
      device: heatingRodDevice,
      availablePvW: 3500,
      availableTotalW: 3500,
      storageSocPct: 25,
      storageDischargeW: 0,
      gridImportW: 0,
    },
    {
      targetStage: 0,
      targetPowerW: 0,
      allowedW: 0,
      reason: 'storage-reserve',
      storageReserveActive: true,
    },
  ),
  heatingCase(
    'heating-rod-zero-budget-is-valid',
    '0 W Budget führt sauber zu Aus, nicht zu Default/1000-W-Rückfall.',
    {
      ts: baseTs,
      device: heatingRodDevice,
      availablePvW: 0,
      availableTotalW: 0,
      storageSocPct: 80,
      storageDischargeW: 0,
      gridImportW: 0,
    },
    {
      targetStage: 0,
      targetPowerW: 0,
      allowedW: 0,
      reason: 'grid-blocked',
      storageReserveActive: false,
    },
  ),
];
