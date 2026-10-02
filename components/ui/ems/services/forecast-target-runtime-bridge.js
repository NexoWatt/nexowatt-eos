/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/services/forecast-target-runtime-bridge.ts
 * Quell-Hash: sha256:510ff41519a20d0db0851b15f717019bfd8c99199627ae7fe6923432ccd75480
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/forecast-target-runtime-bridge.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Überführt gespeicherte Ladeziele und Planungsergebnisse in Laufzeit-Modi, Status und begrenzte Zielanforderungen.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/forecast-target-runtime-bridge.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveZeroExportChargingPolicy = resolveZeroExportChargingPolicy;
exports.runtimeChargingMaximumW = runtimeChargingMaximumW;
exports.buildRuntimeGoalPlanMap = buildRuntimeGoalPlanMap;
exports.goalPlanStateRows = goalPlanStateRows;
exports.resolvePlanEffectiveMode = resolvePlanEffectiveMode;
exports.applyGoalPlan = applyGoalPlan;
exports.applyStrategyOverlay = applyStrategyOverlay;
exports.resolveGoalCommandStatus = resolveGoalCommandStatus;
const { buildForecastAwareTargetPlans } = require('./forecast-aware-target-planner');
function finite(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}
function normalizeMode(value) {
    const mode = String(value || '').trim().toLowerCase();
    if (['auto', 'default', 'global', ''].includes(mode))
        return 'auto';
    if (['minpv', 'min_pv', 'min+pv', 'min_plus_pv'].includes(mode))
        return 'minpv';
    if (['pv', 'pvsurplus', 'pv_surplus', 'pvonly', 'pv_only'].includes(mode))
        return 'pv';
    if (['boost', 'turbo'].includes(mode))
        return 'boost';
    return mode || 'auto';
}
/**
 * Nulleinspeise-Ergänzung ohne Eingriff in Bestandsanlagen: Nur die vom
 * zentralen Exportregler tatsächlich freigegebene 0-W-Betriebsart darf Auto
 * auf Mindestleistung + gemessenes PV setzen. Ein gültiges günstiges Tarif-
 * fenster, ein aktives Ladeziel oder eine explizite Betriebsstrategie bleiben
 * beim vorhandenen Entscheider; dessen Warte-/PV-Sperren werden nie aufgehoben.
 * Der historisch boostMaxPowerW benannte LP-Wert begrenzt den Netzanteil in W
 * in ALLEN Modi. Gemessenes PV darf zusätzlich genutzt werden. Leer bedeutet
 * keine zusätzliche Netzgrenze; 0/ungültig bedeutet kein Netzanteil, nicht Aus.
 * Rein funktional; Ergebnis geht an Planung, Allokator, Phasenwahl und Writer.
 */
function resolveZeroExportChargingPolicy(input) {
    const selected = normalizeMode(input.userMode);
    let effectiveMode = String(input.effectiveMode || 'normal');
    if (input.active !== true)
        return { effectiveMode, gridMaxW: null };
    const raw = input.boostMaxPowerW;
    const absent = raw === null || raw === undefined || (typeof raw === 'string' && !raw.trim());
    const gridMaxW = absent ? null : typeof raw !== 'boolean' && Number.isFinite(Number(raw)) ? Math.max(0, Number(raw)) : 0;
    const strategy = input.strategy && typeof input.strategy === 'object' ? input.strategy : {};
    if (selected === 'auto' && effectiveMode === 'normal' && input.goalActive !== true
        && input.cheapWindow !== true && strategy.active !== true && strategy.fallbackPause !== true)
        effectiveMode = 'minpv';
    return { effectiveMode, gridMaxW };
}
/** Momentane Grenze in W = Netz + bestätigte PV + separat zugeteilter Speicher; nie Prognose/Request. */
function runtimeChargingMaximumW(wallbox, pvAvailableW = 0) {
    const technical = Math.max(0, finite(wallbox.maxPW, 0));
    const cap = wallbox.zeroExportGridMaxW;
    return typeof cap === 'number' && Number.isFinite(cap)
        ? Math.min(technical, Math.max(0, cap) + Math.max(0, finite(pvAvailableW, 0))
            + (wallbox.effectiveStorageAssist === true && normalizeMode(wallbox.effectiveMode) !== 'pv'
                ? Math.max(0, finite(wallbox.zeroExportStorageCreditW, 0)) : 0)) : technical;
}
function buildRuntimeGoalPlanMap(input) {
    const now = finite(input.now, Date.now());
    const wallboxes = Array.isArray(input.wallboxes) ? input.wallboxes : [];
    const active = wallboxes.filter((wallbox) => wallbox && wallbox.controlAvailable
        && wallbox.goalEnabled === true && wallbox.goalActive === true
        && normalizeMode(wallbox.userMode) === 'auto'
        && finite(wallbox.goalFinishTs, 0) > now && finite(wallbox.goalRequiredWh, 0) > 0);
    const result = new Map();
    if (!active.length)
        return result;
    const aggregateMaxW = active.reduce((sum, wallbox) => sum + Math.max(0, finite(wallbox.maxPW, 0)), 0);
    const configuredInfrastructureW = Math.max(0, finite(input.infrastructureCapacityW, finite(input.staticBudgetW, 0)));
    const physicalCapW = configuredInfrastructureW > 0
        ? Math.min(aggregateMaxW || configuredInfrastructureW, configuredInfrastructureW)
        : aggregateMaxW;
    const budgetW = finite(input.budgetW, Number.POSITIVE_INFINITY);
    // A tariff/NT wait may reduce the current budget to zero, but must not make the
    // future target look physically impossible. In that economic-gate case the
    // planner uses the configured EVCS infrastructure cap. The actual current write
    // remains clamped by the live budget later in charging-management.
    const siteCapW = input.economicGateActive === true
        ? physicalCapW
        : Number.isFinite(budgetW)
            ? Math.max(0, Math.min(physicalCapW || budgetW, budgetW))
            : physicalCapW;
    const loadRestW = finite(input.loadRestW, Number.NaN);
    const loadTotalW = finite(input.loadTotalW, Number.NaN);
    const totalActualW = Math.max(0, finite(input.totalActualW, 0));
    const baseLoadW = Number.isFinite(loadRestW) && loadRestW >= 0
        ? loadRestW
        : Number.isFinite(loadTotalW) && loadTotalW >= 0
            ? Math.max(0, loadTotalW - totalActualW)
            : Math.max(0, finite(input.fallbackLoadW, 0));
    const pvSnapshot = input.pvSnapshot && typeof input.pvSnapshot === 'object' ? input.pvSnapshot : null;
    const pvAgeMs = pvSnapshot && Number.isFinite(Number(pvSnapshot.ageMs))
        ? Math.max(0, Number(pvSnapshot.ageMs))
        : pvSnapshot && Number.isFinite(Number(pvSnapshot.ts)) ? Math.max(0, now - Number(pvSnapshot.ts)) : Number.POSITIVE_INFINITY;
    const pvCurve = pvSnapshot?.valid === true && Array.isArray(pvSnapshot.curve)
        && pvSnapshot.curve.length > 0 && pvAgeMs <= Math.max(60000, finite(input.pvMaxAgeMs, 6 * 3600000))
        ? pvSnapshot.curve : [];
    const tariff = input.tariffForecast && typeof input.tariffForecast === 'object' ? input.tariffForecast : null;
    const priceCurve = tariff?.fresh === true && Array.isArray(tariff.segments)
        ? tariff.segments.map((segment) => ({
            startMs: finite(segment.startMs, Number.NaN),
            endMs: finite(segment.endMs, Number.NaN),
            priceEurKwh: finite(segment.priceEurKwh, Number.NaN),
        })).filter((segment) => Number.isFinite(segment.startMs)
            && Number.isFinite(segment.endMs) && segment.endMs > segment.startMs && Number.isFinite(segment.priceEurKwh))
        : [];
    const tariffMode = tariff?.active === true
        ? Number(tariff.modeInt) === 1 ? 'manual' : 'automatic'
        : 'none';
    const tariffPriority = [1, 2, 3].includes(Number(tariff?.prioInt)) ? Number(tariff.prioInt) : 2;
    const plans = buildForecastAwareTargetPlans({
        nowMs: now,
        slotMinutes: 15,
        reserveMs: Math.max(0, finite(input.reserveMs, 10 * 60000)),
        energySafetyFactor: finite(input.energySafetyFactor, 1.05),
        siteCapW,
        baseLoadW,
        currentPvSurplusW: Math.max(0, finite(input.currentPvSurplusW, 0)),
        pvPlanningSafetyPct: finite(pvSnapshot?.planningSafetyPct, 85),
        pvCurve,
        priceCurve,
        gridPlanningAllowed: input.hardPvOnly !== true,
        tariff: {
            active: tariff?.active === true,
            fresh: tariff?.fresh === true,
            mode: tariffMode,
            priority: tariffPriority,
            manualCheapThresholdEurKwh: tariff?.cheapManual ?? null,
            automaticCheapThresholdEurKwh: tariff?.cheap ?? null,
        },
        goals: active.map((wallbox) => ({
            id: String(wallbox.safe || ''),
            enabled: true,
            deadlineMs: finite(wallbox.goalFinishTs, 0),
            requiredWh: finite(wallbox.goalRequiredWh, 0),
            minPowerW: Math.max(0, finite(wallbox.minPW, 0)),
            maxPowerW: Math.max(0, finite(wallbox.maxPW, 0)),
            // PV-Prognosen dürfen zusätzlich geplant werden, Netzenergie bleibt
            // innerhalb des LP-Vertrags. Der Writer verwendet später nur Ist-PV.
            maxGridPowerW: typeof wallbox.zeroExportGridMaxW === 'number' ? wallbox.zeroExportGridMaxW : undefined,
            stationKey: String(wallbox.stationKey || ''),
            stationCapW: Number.isFinite(Number(wallbox.stationMaxPowerW)) ? Math.max(0, Number(wallbox.stationMaxPowerW)) : undefined,
            priority: Math.round(100 - ((Math.max(1, Math.min(999, finite(wallbox.priority, 999))) - 1) / 998) * 100),
            requirement: 'must',
        })),
    });
    for (const plan of plans)
        if (plan?.id)
            result.set(String(plan.id), plan);
    return result;
}
function goalPlanStateRows(plan, wallbox) {
    const reason = wallbox.goalEnabled !== true
        ? 'disabled' : normalizeMode(wallbox.userMode) !== 'auto' ? 'mode-not-auto' : String(wallbox.goalStatus || 'goal-not-active');
    return [
        ['goalPlanAction', plan ? String(plan.action || 'wait') : 'inactive'],
        ['goalPlanReason', plan ? String(plan.reason || '') : reason],
        ['goalPlanSource', plan ? String(plan.source || 'none') : 'none'],
        ['goalPlanTargetPowerW', plan ? Math.max(0, Math.round(finite(plan.plannedNowW, 0))) : 0],
        ['goalPlanPlannedPvWh', plan ? Math.max(0, Math.round(finite(plan.plannedPvWh, 0))) : 0],
        ['goalPlanPlannedGridWh', plan ? Math.max(0, Math.round(finite(plan.plannedGridWh, 0))) : 0],
        ['goalPlanLatestStartTs', plan ? Math.max(0, Math.round(finite(plan.latestStartMs, 0))) : 0],
        ['goalPlanNextWindowStartTs', plan?.nextWindow ? Math.max(0, Math.round(finite(plan.nextWindow.startMs, 0))) : 0],
        ['goalPlanNextWindowEndTs', plan?.nextWindow ? Math.max(0, Math.round(finite(plan.nextWindow.endMs, 0))) : 0],
        ['goalPlanDeadlineOverride', plan?.deadlineOverride === true],
        ['goalPlanTargetReachable', plan?.targetReachable === true],
        ['goalPlanPvForecastUsed', plan?.pvForecastUsed === true],
        ['goalPlanPriceForecastUsed', plan?.priceForecastUsed === true],
        ['goalPlanFallbackMode', plan ? String(plan.fallbackMode || '') : ''],
    ];
}
function resolvePlanEffectiveMode(userMode, effectiveMode, plan, strategy, autoSource) {
    const selected = normalizeMode(userMode);
    const overlay = strategy && typeof strategy === 'object' ? strategy : {};
    const strategyControls = String(autoSource || '').trim().toLowerCase() === 'strategy'
        && (overlay.active === true || overlay.fallbackPause === true);
    const requirement = String(overlay.requirement || 'should').trim().toLowerCase();
    const policy = String(overlay.energySourcePolicy || 'pv-preferred').trim().toLowerCase();
    const pvStrategy = strategyControls && ['pv-only', 'pv-preferred'].includes(policy);
    const deadlineMayOverride = plan?.deadlineOverride === true && requirement !== 'must';
    return selected === 'auto' && plan?.action === 'charge' && String(plan.source || '') !== 'pv'
        && (!pvStrategy || deadlineMayOverride) ? 'normal' : String(effectiveMode || 'normal');
}
function applyGoalPlan(input) {
    const plan = input.plan && typeof input.plan === 'object' ? input.plan : null;
    if (normalizeMode(input.userMode) !== 'auto' || plan?.active !== true || String(input.effectiveMode) === 'boost') {
        return { targetW: Math.max(0, finite(input.targetW, 0)), targetA: Math.max(0, finite(input.targetA, 0)), reasonHint: null };
    }
    const action = String(plan.action || 'wait');
    if (action === 'wait' || action === 'complete')
        return { targetW: 0, targetA: 0, reasonHint: 'no-setpoint' };
    if (action !== 'charge')
        return { targetW: 0, targetA: 0, reasonHint: 'budget' };
    if (String(input.effectiveMode || '') === 'pv' && String(plan.source || '') !== 'pv') {
        return { targetW: 0, targetA: 0, reasonHint: 'no-setpoint' };
    }
    const maxPowerW = Math.max(0, finite(input.maxPowerW, 0));
    const minPowerW = Math.max(0, finite(input.minPowerW, 0));
    const requestedW = Math.min(maxPowerW, Math.max(minPowerW, finite(plan.plannedNowW, 0)));
    const hardCapW = Math.max(0, Math.min(finite(input.totalAvailableW, Number.POSITIVE_INFINITY), finite(input.stationAvailableW, Number.POSITIVE_INFINITY), maxPowerW || Number.POSITIVE_INFINITY));
    const targetW = Math.min(requestedW, hardCapW);
    if (targetW <= 0)
        return { targetW: 0, targetA: 0, reasonHint: 'budget' };
    if (minPowerW > 0 && targetW + 1 < minPowerW)
        return { targetW: 0, targetA: 0, reasonHint: 'below-min' };
    return { targetW, targetA: 0, reasonHint: 'allocated' };
}
function applyStrategyOverlay(input) {
    let targetW = Math.max(0, finite(input.targetW, 0));
    let targetA = Math.max(0, finite(input.targetA, 0));
    const strategy = input.strategy && typeof input.strategy === 'object' ? input.strategy : {};
    if (normalizeMode(input.userMode) !== 'auto' || String(input.autoSource || '').trim().toLowerCase() !== 'strategy') {
        return { targetW, targetA, reasonHint: null };
    }
    const requirement = String(strategy.requirement || 'should').trim().toLowerCase();
    if (input.plan?.deadlineOverride === true && requirement !== 'must')
        return { targetW, targetA, reasonHint: null };
    const action = String(strategy.action || 'standard').trim().toLowerCase();
    if (strategy.fallbackPause === true || ['pause', 'off', 'block', 'disable', 'stop'].includes(action)) {
        return { targetW: 0, targetA: 0, reasonHint: 'no-setpoint' };
    }
    if (strategy.active !== true)
        return { targetW, targetA, reasonHint: null };
    const requestedCapW = finite(strategy.targetPowerW, Number.NaN);
    const maxCapW = finite(strategy.maxPowerW, Number.NaN);
    let capW = Number.isFinite(requestedCapW) ? Math.max(0, requestedCapW) : null;
    if (Number.isFinite(maxCapW) && maxCapW >= 0)
        capW = capW === null ? maxCapW : Math.min(capW, maxCapW);
    if (capW === null)
        return { targetW, targetA, reasonHint: null };
    const minPowerW = Math.max(0, finite(input.minPowerW, 0));
    if (capW > 0 && minPowerW > 0 && capW + 1 < minPowerW)
        return { targetW: 0, targetA: 0, reasonHint: 'below-min' };
    if (targetW > capW + 1) {
        targetW = capW;
        targetA = 0;
    }
    return { targetW, targetA, reasonHint: null };
}
function resolveGoalCommandStatus(input) {
    if (input.goalEnabled !== true)
        return { status: 'inactive', shortfallW: 0 };
    const existing = String(input.goalStatus || 'active');
    if (['reached', 'no_index', 'no_deadline'].includes(existing))
        return { status: existing, shortfallW: 0 };
    const plan = input.plan && typeof input.plan === 'object' ? input.plan : null;
    if (plan?.targetReachable === false)
        return { status: 'shortfall', shortfallW: Math.max(0, Math.round(finite(plan.plannedNowW, 0) - finite(input.commandW, 0))) };
    if (plan?.action === 'wait')
        return { status: 'waiting_window', shortfallW: 0 };
    if (plan?.action === 'complete')
        return { status: 'reached', shortfallW: 0 };
    if (input.goalActive === true && finite(input.goalDesiredW, 0) > 0) {
        const targetW = plan ? finite(plan.plannedNowW, 0) : finite(input.goalDesiredW, 0);
        const shortfallW = Math.max(0, Math.round(targetW - finite(input.commandW, 0)));
        return { status: input.goalOverdue === true ? 'overdue' : shortfallW > 300 ? 'shortfall' : 'active', shortfallW };
    }
    return { status: existing, shortfallW: 0 };
}
