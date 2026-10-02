/**
 * NexoWatt EOS operating-strategy Auto arbitration.
 *
 * SAFETY CONTRACT
 * - This module never writes hardware states.
 * - It only produces a time-limited planner request for the existing
 *   load-management / device writer.
 * - Strategy ownership is possible only for an explicitly opted-in resource
 *   in operating mode Auto with autoSource === "strategy".
 * - Shadow and commissioning stages never permit a productive handover.
 * - Existing safety, grid, §14a, station and device limits remain authoritative.
 */

export type StrategyRequirementClass = 'must' | 'should' | 'may';
export type StrategyAutoSource = 'standard' | 'strategy';
export type StrategyControlStage = 'shadow' | 'commissioning' | 'active';
export type StrategyFallback = 'standardAuto' | 'pause';
export type StrategyEligibilityReason =
    | 'eligible'
    | 'app-not-installed'
    | 'app-disabled'
    | 'profile-inactive'
    | 'resource-disabled'
    | 'resource-not-opted-in'
    | 'mode-not-auto'
    | 'standard-auto-selected'
    | 'shadow-stage'
    | 'commissioning-stage'
    | 'commissioning-not-confirmed'
    | 'resource-offline'
    | 'resource-alarm'
    | 'telemetry-stale'
    | 'no-fresh-request'
    | 'safety-stop';

export interface StrategyPowerRequest {
    id: string;
    resourceId: string;
    ruleId?: string;
    requirementClass: StrategyRequirementClass;
    priority: number;
    issuedAtMs: number;
    expiresAtMs: number;
    minPowerW?: number;
    targetPowerW: number;
    maxPowerW?: number;
    reason: string;
}

export interface StrategyControlContext {
    nowMs: number;
    appInstalled: boolean;
    appEnabled: boolean;
    profileActive: boolean;
    resourceId: string;
    resourceEnabled: boolean;
    strategyParticipationEnabled: boolean;
    operatingMode: string;
    autoSource: StrategyAutoSource;
    controlStage: StrategyControlStage;
    commissioningConfirmed: boolean;
    online: boolean;
    alarmActive: boolean;
    telemetryFresh: boolean;
    fallback: StrategyFallback;
}

export interface StrategySafetyEnvelope {
    minPowerW: number;
    maxPowerW: number;
    forceStop?: boolean;
    limitingReason?: string;
}

export interface StrategyEligibility {
    eligible: boolean;
    handoverPermitted: boolean;
    shadowEvaluation: boolean;
    reason: StrategyEligibilityReason;
}

export interface StrategyArbitrationResult {
    owner: 'standardAuto' | 'strategy' | 'pause';
    handoverPermitted: boolean;
    shadowEvaluation: boolean;
    reason: StrategyEligibilityReason;
    selectedRequestId?: string;
    selectedRuleId?: string;
    requestedPowerW?: number;
    finalPlannerPowerW?: number;
    requestExpiresAtMs?: number;
    limitingReason?: string;
    diagnostic: string;
}

const CLASS_RANK: Readonly<Record<StrategyRequirementClass, number>> = {
    must: 3,
    should: 2,
    may: 1,
};

function finiteOr(value: number | undefined, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

export function normalizeOperatingMode(mode: string): string {
    return String(mode ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
}

export function isAutoOperatingMode(mode: string): boolean {
    const normalized = normalizeOperatingMode(mode);
    return normalized === 'auto' || normalized === 'automatik' || normalized === 'automatic';
}

export function evaluateStrategyEligibility(context: StrategyControlContext): StrategyEligibility {
    if (!context.appInstalled) return { eligible: false, handoverPermitted: false, shadowEvaluation: false, reason: 'app-not-installed' };
    if (!context.appEnabled) return { eligible: false, handoverPermitted: false, shadowEvaluation: false, reason: 'app-disabled' };
    if (!context.profileActive) return { eligible: false, handoverPermitted: false, shadowEvaluation: false, reason: 'profile-inactive' };
    if (!context.resourceEnabled) return { eligible: false, handoverPermitted: false, shadowEvaluation: false, reason: 'resource-disabled' };
    if (!context.strategyParticipationEnabled) return { eligible: false, handoverPermitted: false, shadowEvaluation: false, reason: 'resource-not-opted-in' };
    if (!isAutoOperatingMode(context.operatingMode)) return { eligible: false, handoverPermitted: false, shadowEvaluation: false, reason: 'mode-not-auto' };
    if (context.autoSource !== 'strategy') return { eligible: false, handoverPermitted: false, shadowEvaluation: false, reason: 'standard-auto-selected' };
    if (!context.online) return { eligible: false, handoverPermitted: false, shadowEvaluation: false, reason: 'resource-offline' };
    if (context.alarmActive) return { eligible: false, handoverPermitted: false, shadowEvaluation: false, reason: 'resource-alarm' };
    if (!context.telemetryFresh) return { eligible: false, handoverPermitted: false, shadowEvaluation: false, reason: 'telemetry-stale' };
    if (context.controlStage === 'shadow') return { eligible: true, handoverPermitted: false, shadowEvaluation: true, reason: 'shadow-stage' };
    if (context.controlStage === 'commissioning') return { eligible: true, handoverPermitted: false, shadowEvaluation: true, reason: 'commissioning-stage' };
    if (!context.commissioningConfirmed) return { eligible: true, handoverPermitted: false, shadowEvaluation: true, reason: 'commissioning-not-confirmed' };
    return { eligible: true, handoverPermitted: true, shadowEvaluation: false, reason: 'eligible' };
}

function requestComparator(a: StrategyPowerRequest, b: StrategyPowerRequest): number {
    const classDelta = CLASS_RANK[b.requirementClass] - CLASS_RANK[a.requirementClass];
    if (classDelta !== 0) return classDelta;
    const priorityDelta = finiteOr(b.priority, 0) - finiteOr(a.priority, 0);
    if (priorityDelta !== 0) return priorityDelta;
    const issuedDelta = finiteOr(b.issuedAtMs, 0) - finiteOr(a.issuedAtMs, 0);
    if (issuedDelta !== 0) return issuedDelta;
    return a.id.localeCompare(b.id);
}

function fallbackOwner(fallback: StrategyFallback): 'standardAuto' | 'pause' {
    return fallback === 'pause' ? 'pause' : 'standardAuto';
}

/**
 * Selects a strategy planner request. The return value is still subject to the
 * existing load-management, station, §14a, grid and hardware safety layers.
 */
export function arbitrateStrategyPowerRequests(
    requests: readonly StrategyPowerRequest[],
    context: StrategyControlContext,
    safetyEnvelope: StrategySafetyEnvelope,
): StrategyArbitrationResult {
    const eligibility = evaluateStrategyEligibility(context);
    const fallback = fallbackOwner(context.fallback);

    if (safetyEnvelope.forceStop) {
        return {
            owner: 'pause',
            handoverPermitted: false,
            shadowEvaluation: false,
            reason: 'safety-stop',
            finalPlannerPowerW: 0,
            limitingReason: safetyEnvelope.limitingReason ?? 'safety-stop',
            diagnostic: `Strategy blocked by safety envelope: ${safetyEnvelope.limitingReason ?? 'force stop'}`,
        };
    }

    if (!eligibility.eligible) {
        return {
            owner: fallback,
            handoverPermitted: false,
            shadowEvaluation: false,
            reason: eligibility.reason,
            diagnostic: `Strategy ownership denied: ${eligibility.reason}`,
        };
    }

    const fresh = requests
        .filter((request) => request.resourceId === context.resourceId)
        .filter((request) => Number.isFinite(request.targetPowerW))
        .filter((request) => request.issuedAtMs <= context.nowMs && request.expiresAtMs > context.nowMs)
        .slice()
        .sort(requestComparator);

    if (fresh.length === 0) {
        return {
            owner: fallback,
            handoverPermitted: false,
            shadowEvaluation: eligibility.shadowEvaluation,
            reason: 'no-fresh-request',
            diagnostic: 'No fresh strategy request; fallback selected.',
        };
    }

    const selected = fresh[0];
    const envelopeMin = Math.max(0, finiteOr(safetyEnvelope.minPowerW, 0));
    const envelopeMax = Math.max(envelopeMin, finiteOr(safetyEnvelope.maxPowerW, envelopeMin));
    const requestMin = Math.max(envelopeMin, finiteOr(selected.minPowerW, envelopeMin));
    const requestMax = Math.min(envelopeMax, Math.max(requestMin, finiteOr(selected.maxPowerW, envelopeMax)));
    const finalPlannerPowerW = clamp(Math.max(0, selected.targetPowerW), requestMin, requestMax);
    const limited = finalPlannerPowerW !== selected.targetPowerW;

    return {
        owner: eligibility.handoverPermitted ? 'strategy' : fallback,
        handoverPermitted: eligibility.handoverPermitted,
        shadowEvaluation: eligibility.shadowEvaluation,
        reason: eligibility.reason,
        selectedRequestId: selected.id,
        selectedRuleId: selected.ruleId,
        requestedPowerW: selected.targetPowerW,
        finalPlannerPowerW,
        requestExpiresAtMs: selected.expiresAtMs,
        limitingReason: limited ? (safetyEnvelope.limitingReason ?? 'planner-envelope') : undefined,
        diagnostic: eligibility.handoverPermitted
            ? `Strategy request ${selected.id} selected; execution remains with the existing load-management writer.`
            : `Strategy request ${selected.id} evaluated in ${context.controlStage} mode; no productive handover.`,
    };
}

export interface StrategyAutoControlDefaults {
    enabled: boolean;
    stage: StrategyControlStage;
    defaultAutoSource: StrategyAutoSource;
    requirePerResourceOptIn: boolean;
    requireCommissioningConfirmation: boolean;
    requestTtlSeconds: number;
    fallback: StrategyFallback;
}

export const SAFE_STRATEGY_AUTO_DEFAULTS: Readonly<StrategyAutoControlDefaults> = Object.freeze({
    enabled: true,
    stage: 'shadow',
    defaultAutoSource: 'standard',
    requirePerResourceOptIn: true,
    requireCommissioningConfirmation: true,
    requestTtlSeconds: 15,
    fallback: 'standardAuto',
});
