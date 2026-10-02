/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Normalisiert die Mess- und Konfigurationsbasis, aus der die typisierte Ladeplanung ihre Werte erhält.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/ems/charging-management/charging-normal-source.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Datei: src-ts/ems/charging-management/charging-normal-source.ts
 *
 * Zweck:
 * Verdichtet die produktiven EVCS-TypeScript-Verträge zu einem einzigen Normalquellen-Gate.
 * Das Gate sagt nicht nur, ob ein einzelner Shadow sauber ist, sondern ob Budget, Control,
 * Allocation, Write-Plan und der JS/ioBroker-Executor im selben Tick als TypeScript-geführter
 * Runtime-Pfad zusammenpassen.
 *
 * Wichtig:
 * TypeScript bleibt die fachliche Normalquelle. JavaScript darf im grünen Gate nur noch den
 * ioBroker-SetState-Executor ausführen. Bei harten Blockern bleibt JavaScript Notfallback.
 */

export type ChargingNormalSourceRuntimeSource = 'typescript' | 'javascript-hard-fallback';
export type ChargingNormalSourceJsRole = 'executor-only' | 'executor-and-hard-fallback';

export interface ChargingNormalSourceInput {
  context?: unknown;
  mode?: unknown;
  status?: unknown;
  safetyStop?: unknown;
  safetyReason?: unknown;
  budget?: Record<string, unknown> | null;
  control?: Record<string, unknown> | null;
  allocation?: Record<string, unknown> | null;
  writePlan?: Record<string, unknown> | null;
  executor?: Record<string, unknown> | null;
  legacy?: Record<string, unknown> | null;
  ts?: unknown;
}

export interface ChargingNormalSourceDecision {
  source: 'ts-charging-normal-source-lockdown-v1';
  available: true;
  ok: boolean;
  productive: boolean;
  tsNormalSource: boolean;
  readyForJavascriptRemoval: boolean;
  fallback: boolean;
  fallbackReason: string;
  runtimeSource: ChargingNormalSourceRuntimeSource;
  normalSource: ChargingNormalSourceRuntimeSource;
  jsRole: ChargingNormalSourceJsRole;
  context: string;
  mode: string;
  status: string;
  safetyStop: boolean;
  safetyReason: string;
  blockers: string[];
  warnings: string[];
  components: {
    budgetProductive: boolean;
    budgetSource: string;
    controlProductive: boolean;
    controlSource: string;
    allocationProductive: boolean;
    allocationSource: string;
    writePlanProductive: boolean;
    writePlanSource: string;
    executorOk: boolean;
    executorSource: string;
    executorAppliedCount: number;
    executorFailedCount: number;
    executorSkippedCount: number;
    legacyFallbackActive: boolean;
    legacySource: string;
  };
  apply: null | {
    source: 'ts-normal-source';
    executor: 'javascript-iobroker-setState';
    decisionSource: 'typescript';
    setpointWriter: 'javascript-executor-only';
  };
  safety: {
    typescriptIsNormalDecisionSource: true;
    javascriptSetpointWritesOnly: true;
    javascriptLegacyDecisionTreeHardFallbackOnly: true;
    noJavascriptNormalSetpointDecision: true;
    fallbackOnlyForHardBlockers: true;
    requiresBudgetControlAllocationWritePlan: true;
    completeEvcsTsHandoverGate: true;
  };
  nextAction: string;
  ts: number;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function str(value: unknown, fallback = ''): string {
  const s = String(value ?? '').trim();
  return s || fallback;
}

function boolValue(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value !== 0;
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'ja', 'on', 'ok', 'productive', 'active'].includes(s)) return true;
    if (['false', '0', 'no', 'nein', 'off', 'fallback', 'inactive'].includes(s)) return false;
  }
  return fallback;
}

function finiteNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function isProductive(component: Record<string, unknown> | null): boolean {
  return !!component && boolValue(component.productive, false) === true && boolValue(component.fallback, false) !== true;
}

function componentSource(component: Record<string, unknown> | null, fallback: string): string {
  return component ? str(component.source, fallback) : fallback;
}

function componentFallbackReason(component: Record<string, unknown> | null, fallback: string): string {
  if (!component) return fallback;
  return str(component.fallbackReason, fallback);
}

function unique(values: string[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    const v = String(value || '').trim();
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

function collectComponentWarnings(component: Record<string, unknown> | null): string[] {
  const warnings = component && Array.isArray(component.warnings) ? component.warnings : [];
  return warnings.map((entry) => String(entry || '').trim()).filter((entry) => entry.length > 0);
}

/**
 * Code-Teil: buildChargingNormalSourceDecision
 * Zweck: Freigabe-Gate für den vollständigen EVCS-TS-Normalpfad.
 */
export function buildChargingNormalSourceDecision(input: ChargingNormalSourceInput): ChargingNormalSourceDecision {
  const budget = asRecord(input.budget);
  const control = asRecord(input.control);
  const allocation = asRecord(input.allocation);
  const writePlan = asRecord(input.writePlan);
  const executor = asRecord(input.executor);
  const legacy = asRecord(input.legacy);

  const safetyStop = boolValue(input.safetyStop, false);
  const budgetProductive = isProductive(budget);
  const controlProductive = isProductive(control);
  const allocationProductive = isProductive(allocation);
  const writePlanProductive = isProductive(writePlan);
  const executorSourceValue = componentSource(executor, 'missing-executor');
  const executorOk = executor ? (boolValue(executor.ok, false) === true && executorSourceValue === 'ts-write-plan') : false;
  const legacyJsRole = legacy ? str(legacy.jsRole) : '';
  const legacyFallbackActive = legacyJsRole === 'executor-and-hard-fallback' || boolValue(legacy && legacy.fallbackActive, false);

  const blockers: string[] = [];
  if (!safetyStop && !budgetProductive) blockers.push(`budget:${componentFallbackReason(budget, 'budget-not-productive')}`);
  if (!safetyStop && !controlProductive) blockers.push(`control:${componentFallbackReason(control, 'control-not-productive')}`);
  if (safetyStop && !budget) {
    // Safe 0-setpoint handovers may run before the cap diagnostics are published.
  } else if (safetyStop && budget && !budgetProductive) blockers.push(`budget:${componentFallbackReason(budget, 'budget-not-productive')}`);
  if (safetyStop && !control) {
    // Same for control diagnostics: the safety write contract is still TS-valid.
  } else if (safetyStop && control && !controlProductive) blockers.push(`control:${componentFallbackReason(control, 'control-not-productive')}`);
  if (!allocationProductive) blockers.push(`allocation:${componentFallbackReason(allocation, 'allocation-not-productive')}`);
  if (!writePlanProductive) blockers.push(`writePlan:${componentFallbackReason(writePlan, 'write-plan-not-productive')}`);
  if (!executorOk) blockers.push(executor ? `executor:${executorSourceValue === 'ts-write-plan' ? 'not-ok' : `unexpected-source-${executorSourceValue}`}` : 'executor:missing');
  if (legacyFallbackActive) blockers.push(`legacy:${str(legacy && legacy.fallbackReason, 'hard-fallback-active')}`);

  const normalizedBlockers = unique(blockers);
  const ok = normalizedBlockers.length === 0;
  const fallbackReason = ok ? '' : (normalizedBlockers[0] ?? 'ts-normal-source-not-ready');
  const runtimeSource: ChargingNormalSourceRuntimeSource = ok ? 'typescript' : 'javascript-hard-fallback';
  const jsRole: ChargingNormalSourceJsRole = ok ? 'executor-only' : 'executor-and-hard-fallback';

  const warnings = unique([
    ...(safetyStop && !budget ? ['budget-snapshot-not-required-for-safety-stop'] : []),
    ...(safetyStop && !control ? ['control-snapshot-not-required-for-safety-stop'] : []),
    ...collectComponentWarnings(budget),
    ...collectComponentWarnings(control),
    ...collectComponentWarnings(allocation),
    ...collectComponentWarnings(writePlan),
  ]);

  return {
    source: 'ts-charging-normal-source-lockdown-v1',
    available: true,
    ok,
    productive: ok,
    tsNormalSource: ok,
    readyForJavascriptRemoval: ok,
    fallback: !ok,
    fallbackReason,
    runtimeSource,
    normalSource: runtimeSource,
    jsRole,
    context: str(input.context, 'normal'),
    mode: str(input.mode, ''),
    status: str(input.status, ''),
    safetyStop,
    safetyReason: str(input.safetyReason, ''),
    blockers: normalizedBlockers,
    warnings,
    components: {
      budgetProductive,
      budgetSource: componentSource(budget, 'missing-budget'),
      controlProductive,
      controlSource: componentSource(control, 'missing-control'),
      allocationProductive,
      allocationSource: componentSource(allocation, 'missing-allocation'),
      writePlanProductive,
      writePlanSource: componentSource(writePlan, 'missing-write-plan'),
      executorOk,
      executorSource: executorSourceValue,
      executorAppliedCount: Math.max(0, Math.round(finiteNumber(executor && executor.appliedCount, 0))),
      executorFailedCount: Math.max(0, Math.round(finiteNumber(executor && executor.failedCount, 0))),
      executorSkippedCount: Math.max(0, Math.round(finiteNumber(executor && executor.skippedCount, 0))),
      legacyFallbackActive,
      legacySource: componentSource(legacy, 'missing-legacy-diagnostic'),
    },
    apply: ok ? {
      source: 'ts-normal-source',
      executor: 'javascript-iobroker-setState',
      decisionSource: 'typescript',
      setpointWriter: 'javascript-executor-only',
    } : null,
    safety: {
      typescriptIsNormalDecisionSource: true,
      javascriptSetpointWritesOnly: true,
      javascriptLegacyDecisionTreeHardFallbackOnly: true,
      noJavascriptNormalSetpointDecision: true,
      fallbackOnlyForHardBlockers: true,
      requiresBudgetControlAllocationWritePlan: true,
      completeEvcsTsHandoverGate: true,
    },
    nextAction: ok
      ? 'EVCS läuft im TypeScript-Normalpfad; JavaScript führt nur noch ioBroker-Setpoints aus.'
      : 'EVCS bleibt im JavaScript-Hard-Fallback, bis alle TS-Komponenten im selben Tick produktiv sind.',
    ts: finiteNumber(input.ts, Date.now()),
  };
}

/** Kompatibilitätsalias für Runtime-Brücken aus der beschleunigten EVCS-Migration. */
export const buildChargingNormalSourceLockdown = buildChargingNormalSourceDecision;
export const buildChargingTsNormalSourceLockdown = buildChargingNormalSourceDecision;

export interface ChargingEvcsJavascriptRemovalInput {
  context?: unknown;
  normalSource?: Record<string, unknown> | null;
  legacy?: Record<string, unknown> | null;
  executor?: Record<string, unknown> | null;
  allocation?: Record<string, unknown> | null;
  writePlan?: Record<string, unknown> | null;
  budget?: Record<string, unknown> | null;
  control?: Record<string, unknown> | null;
  ts?: unknown;
}

export interface ChargingEvcsJavascriptRemovalDecision {
  source: 'ts-charging-evcs-js-removal-ready-v1';
  available: true;
  ok: boolean;
  productive: boolean;
  readyForJavascriptRemoval: boolean;
  readyForEvcsJsDecisionTreeRemoval: boolean;
  readyForAdapterTsRuntime: boolean;
  fallback: boolean;
  fallbackReason: string;
  runtimeSource: ChargingNormalSourceRuntimeSource;
  jsRole: 'generated-js-runtime-boundary-only' | 'executor-and-hard-fallback';
  remainingJavascriptRole: string;
  context: string;
  blockers: string[];
  warnings: string[];
  components: {
    normalSourceProductive: boolean;
    normalSourceRuntime: string;
    normalSourceJsRole: string;
    allocationNormalSource: boolean;
    writePlanProductive: boolean;
    executorOk: boolean;
    executorSource: string;
    legacyExecutorOnly: boolean;
  };
  removal: {
    evcsDecisionTreeCanBeRemoved: boolean;
    directSetpointLoopsRemoved: true;
    normalJavascriptAllocationRemoved: true;
    legacyJavascriptFallbackHardOnly: boolean;
    javascriptSetStateExecutorBoundaryKept: true;
    generatedJavascriptRuntimeArtifactsKept: true;
  };
  keepJavascriptFor: string[];
  removeJavascriptNormalPath: string[];
  safety: {
    typescriptOwnsEvcsDecisionContracts: true;
    javascriptIsRuntimeBoundaryOnlyWhenOk: true;
    nodeIobrokerStillExecutesGeneratedJavascript: true;
    setStateExecutorRemainsJavascriptUntilAdapterBuildIsTsBootstrap: true;
    noJavascriptEvcsNormalDecisionWhenOk: true;
  };
  nextAction: string;
  ts: number;
}

/**
 * Code-Teil: buildChargingEvcsJavascriptRemovalDecision
 *
 * Zweck:
 * Letztes Freigabe-Gate vor dem Entfernen des alten EVCS-JavaScript-
 * Entscheidungsbaums. Dieses Gate unterscheidet sauber zwischen fachlicher
 * Logik (TypeScript) und der technisch weiterhin nötigen Node/ioBroker-
 * JavaScript-Laufzeitgrenze.
 */
export function buildChargingEvcsJavascriptRemovalDecision(input: ChargingEvcsJavascriptRemovalInput): ChargingEvcsJavascriptRemovalDecision {
  const normalSource = asRecord(input.normalSource);
  const legacy = asRecord(input.legacy);
  const executor = asRecord(input.executor);
  const allocation = asRecord(input.allocation);
  const writePlan = asRecord(input.writePlan);

  const normalSourceRuntime = normalSource ? str(normalSource.runtimeSource, 'javascript-hard-fallback') : 'missing-normal-source';
  const normalSourceJsRole = normalSource ? str(normalSource.jsRole, '') : '';
  const normalSourceProductive = !!normalSource
    && boolValue(normalSource.productive, false) === true
    && boolValue(normalSource.fallback, false) !== true
    && normalSourceRuntime === 'typescript'
    && normalSourceJsRole === 'executor-only';

  const allocationNormalSource = !!(
    (allocation && (boolValue(allocation.normalSource, false) || boolValue(allocation.productive, false)))
    || (normalSource && boolValue((asRecord(normalSource.components) || {}).allocationProductive, false))
  );
  const writePlanProductive = !!(
    (writePlan && boolValue(writePlan.productive, false) && boolValue(writePlan.fallback, false) !== true)
    || (normalSource && boolValue((asRecord(normalSource.components) || {}).writePlanProductive, false))
  );
  const executorSource = executor ? str(executor.source, 'missing-executor') : str((asRecord(normalSource && normalSource.components) || {}).executorSource, 'missing-executor');
  const executorFailedCount = executor ? finiteNumber(executor.failedCount, 0) : finiteNumber((asRecord(normalSource && normalSource.components) || {}).executorFailedCount, 0);
  const executorOk = !!(
    (executor && boolValue(executor.ok, false) && executorSource === 'ts-write-plan' && executorFailedCount <= 0)
    || (normalSource && boolValue((asRecord(normalSource.components) || {}).executorOk, false) && executorSource === 'ts-write-plan')
  );
  const legacyRole = legacy ? str(legacy.jsRole, '') : str((asRecord(normalSource && normalSource.components) || {}).legacySource, '');
  const legacyFallbackActive = !!(
    (legacy && (boolValue(legacy.fallbackActive, false) || str(legacy.jsRole, '') === 'executor-and-hard-fallback' || str(legacy.jsRole, '') === 'hard-fallback-only'))
    || (normalSource && boolValue((asRecord(normalSource.components) || {}).legacyFallbackActive, false))
  );
  const legacyExecutorOnly = !!legacy && str(legacy.jsRole, '') === 'executor-only' && !legacyFallbackActive;

  const blockers: string[] = [];
  if (!normalSource) blockers.push('normal-source:missing');
  else if (!normalSourceProductive) blockers.push(`normal-source:${str(normalSource.fallbackReason, normalSourceRuntime === 'typescript' ? 'not-executor-only' : normalSourceRuntime)}`);
  if (!allocationNormalSource) blockers.push('allocation:not-normal-source');
  if (!writePlanProductive) blockers.push('write-plan:not-productive');
  if (!executorOk) blockers.push(executor ? `executor:${executorSource === 'ts-write-plan' ? 'not-ok' : `unexpected-source-${executorSource}`}` : 'executor:missing');
  if (!legacy) blockers.push('legacy-diagnostic:missing');
  else if (!legacyExecutorOnly) blockers.push(`legacy:${legacyFallbackActive ? str(legacy.fallbackReason, 'hard-fallback-active') : `role-${str(legacy.jsRole, 'unknown')}`}`);

  const normalizedBlockers = unique(blockers);
  const ok = normalizedBlockers.length === 0;
  const fallbackReason = ok ? '' : (normalizedBlockers[0] || 'evcs-js-removal-not-ready');
  const warnings = unique([
    'runtime-javascript-artifacts-remain-required-for-node-iobroker',
    'setState-executor-remains-javascript-boundary',
    ...(normalSource && Array.isArray(normalSource.warnings) ? normalSource.warnings.map((entry) => String(entry || '')) : []),
  ]);

  return {
    source: 'ts-charging-evcs-js-removal-ready-v1',
    available: true,
    ok,
    productive: ok,
    readyForJavascriptRemoval: ok,
    readyForEvcsJsDecisionTreeRemoval: ok,
    readyForAdapterTsRuntime: ok,
    fallback: !ok,
    fallbackReason,
    runtimeSource: ok ? 'typescript' : 'javascript-hard-fallback',
    jsRole: ok ? 'generated-js-runtime-boundary-only' : 'executor-and-hard-fallback',
    remainingJavascriptRole: ok
      ? 'generated CommonJS runtime + ioBroker setState executor only; keine EVCS-Fachentscheidung im JS-Normalpfad'
      : 'hard fallback remains active until blockers are cleared',
    context: str(input.context, str(normalSource && normalSource.context, 'normal')),
    blockers: normalizedBlockers,
    warnings,
    components: {
      normalSourceProductive,
      normalSourceRuntime,
      normalSourceJsRole,
      allocationNormalSource,
      writePlanProductive,
      executorOk,
      executorSource,
      legacyExecutorOnly,
    },
    removal: {
      evcsDecisionTreeCanBeRemoved: ok,
      directSetpointLoopsRemoved: true,
      normalJavascriptAllocationRemoved: true,
      legacyJavascriptFallbackHardOnly: !legacyFallbackActive,
      javascriptSetStateExecutorBoundaryKept: true,
      generatedJavascriptRuntimeArtifactsKept: true,
    },
    keepJavascriptFor: [
      'ioBroker adapter bootstrap / module loading',
      'generated CommonJS artifacts produced from TypeScript',
      'central setStateAsync/applySetpoint runtime executor',
      'hard fallback while live plant validation is still being watched',
    ],
    removeJavascriptNormalPath: ok ? [
      'old EVCS allocation decision tree',
      'old JS/TS mismatch blocker for normal allocation',
      'legacy direct setpoint write loops',
      'duplicated control/budget summary decisions',
    ] : [],
    safety: {
      typescriptOwnsEvcsDecisionContracts: true,
      javascriptIsRuntimeBoundaryOnlyWhenOk: true,
      nodeIobrokerStillExecutesGeneratedJavascript: true,
      setStateExecutorRemainsJavascriptUntilAdapterBuildIsTsBootstrap: true,
      noJavascriptEvcsNormalDecisionWhenOk: true,
    },
    nextAction: ok
      ? 'EVCS-Alt-JS kann aus dem Normalpfad entfernt werden; übrig bleibt nur Runtime-Bootstrap, generiertes JS und der ioBroker-Executor.'
      : 'EVCS-Alt-JS bleibt Hard-Fallback, bis Normalquelle, Write-Plan, Executor und Legacy-Diagnose im selben Tick grün sind.',
    ts: finiteNumber(input.ts, Date.now()),
  };
}

/** Kompatibilitätsalias für finale Umbauprüfungen. */
export const buildChargingJavascriptRemovalDecision = buildChargingEvcsJavascriptRemovalDecision;
export const buildChargingTsFinalHandoverDecision = buildChargingEvcsJavascriptRemovalDecision;
