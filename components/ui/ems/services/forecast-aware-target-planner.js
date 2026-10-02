/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/services/forecast-aware-target-planner.ts
 * Quell-Hash: sha256:ee4fd5dd67fc68dccfb265b2810f22df3802767dd20f72e084a4c3b5f5ad71ea
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/forecast-aware-target-planner.js.
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
 * Aufgabe: Berechnet zeitbezogene Ladeziele aus Bedarf, Prognosen und verfügbaren Zeit-/Leistungsgrenzen.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/forecast-aware-target-planner.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildForecastAwareTargetPlans = buildForecastAwareTargetPlans;
const HOUR_MS = 3600000;
function finite(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}
function clamp(value, min, max, fallback = min) {
    return Math.min(max, Math.max(min, finite(value, fallback)));
}
function overlapMs(aStart, aEnd, bStart, bEnd) {
    return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}
function requirementRank(value) {
    return value === 'must' ? 3 : value === 'should' ? 2 : 1;
}
function segmentBounds(segment) {
    const startMs = finite(segment.startMs ?? segment.t, Number.NaN);
    const endMs = finite(segment.endMs, startMs + finite(segment.dtMs, 0));
    const powerW = Math.max(0, finite(segment.powerW ?? segment.w, 0));
    return Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs
        ? { startMs, endMs, powerW }
        : null;
}
function averagePower(curve, startMs, endMs) {
    if (!Array.isArray(curve) || endMs <= startMs)
        return 0;
    let weighted = 0;
    for (const segment of curve) {
        const normalized = segmentBounds(segment);
        if (!normalized)
            continue;
        const overlap = overlapMs(startMs, endMs, normalized.startMs, normalized.endMs);
        if (overlap > 0)
            weighted += normalized.powerW * overlap;
    }
    return weighted / Math.max(1, endMs - startMs);
}
function averagePrice(curve, startMs, endMs) {
    if (!Array.isArray(curve) || endMs <= startMs)
        return null;
    let weighted = 0;
    let covered = 0;
    for (const segment of curve) {
        const segmentStart = finite(segment?.startMs, Number.NaN);
        const segmentEnd = finite(segment?.endMs, Number.NaN);
        const price = finite(segment?.priceEurKwh, Number.NaN);
        if (!Number.isFinite(segmentStart) || !Number.isFinite(segmentEnd) || segmentEnd <= segmentStart || !Number.isFinite(price))
            continue;
        const overlap = overlapMs(startMs, endMs, segmentStart, segmentEnd);
        if (overlap <= 0)
            continue;
        weighted += price * overlap;
        covered += overlap;
    }
    return covered >= (endMs - startMs) * 0.5 ? weighted / covered : null;
}
function percentile(values, quantile) {
    const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
    if (sorted.length === 0)
        return null;
    const position = clamp(quantile, 0, 1, 0.35) * (sorted.length - 1);
    const low = Math.floor(position);
    const high = Math.ceil(position);
    const lowValue = sorted[low];
    const highValue = sorted[high];
    if (typeof lowValue !== 'number' || typeof highValue !== 'number')
        return null;
    return low === high ? lowValue : lowValue + (highValue - lowValue) * (position - low);
}
function createSlots(input, horizonEndMs) {
    const nowMs = finite(input.nowMs, Date.now());
    const slotMs = Math.round(clamp(input.slotMinutes, 5, 60, 15) * 60000);
    const siteCapW = Math.max(0, finite(input.siteCapW, 0));
    const baseLoadW = Math.max(0, finite(input.baseLoadW, 0));
    const pvSafety = clamp(input.pvPlanningSafetyPct, 30, 100, 85) / 100;
    const slots = [];
    const currentPvSurplusW = Math.max(0, finite(input.currentPvSurplusW, 0));
    let cursor = nowMs;
    let index = 0;
    while (cursor < horizonEndMs && index < 500) {
        const nextBoundary = Math.floor(cursor / slotMs) * slotMs + slotMs;
        const endMs = Math.min(horizonEndMs, Math.max(cursor + 1, nextBoundary));
        const forecastPvW = averagePower(input.pvCurve, cursor, endMs);
        slots.push({
            index,
            startMs: cursor,
            endMs,
            durationH: (endMs - cursor) / HOUR_MS,
            siteCapW,
            siteUsedW: 0,
            stationUsedW: new Map(),
            pvAvailableW: Math.max(0, index === 0
                ? Math.max(currentPvSurplusW, forecastPvW * pvSafety - baseLoadW)
                : forecastPvW * pvSafety - baseLoadW),
            pvUsedW: 0,
            priceEurKwh: averagePrice(input.priceCurve, cursor, endMs),
            allocations: new Map(),
        });
        cursor = endMs;
        index += 1;
    }
    return slots;
}
function stationRemaining(slot, goal) {
    const key = String(goal.stationKey || '').trim();
    const cap = finite(goal.stationCapW, Number.POSITIVE_INFINITY);
    return !key || !Number.isFinite(cap) || cap <= 0
        ? Number.POSITIVE_INFINITY
        : Math.max(0, cap - (slot.stationUsedW.get(key) || 0));
}
function availablePower(slot, goal, source) {
    const siteRemaining = Math.max(0, slot.siteCapW - slot.siteUsedW);
    const stationCap = stationRemaining(slot, goal);
    let available = Math.min(siteRemaining, stationCap, Math.max(0, finite(goal.maxPowerW, 0)));
    if (typeof goal.maxGridPowerW === 'number') {
        const assigned = slot.allocations.get(goal.id);
        available = Math.min(available, Math.max(0, goal.maxPowerW - (assigned?.totalW || 0)));
        if (source === 'grid')
            available = Math.min(available, Math.max(0, goal.maxGridPowerW - (assigned?.gridW || 0)));
    }
    if (source === 'pv')
        available = Math.min(available, Math.max(0, slot.pvAvailableW - slot.pvUsedW));
    return Math.max(0, available);
}
function allocate(slot, goal, source) {
    const effectiveEndMs = Math.min(slot.endMs, finite(goal.request.deadlineMs, slot.endMs));
    const durationH = Math.max(0, effectiveEndMs - slot.startMs) / HOUR_MS;
    if (goal.remainingWh <= 0 || durationH <= 0)
        return 0;
    if (source === 'grid' && typeof goal.request.maxGridPowerW === 'number')
        return allocateLimitedGrid(slot, goal, durationH);
    const availableW = availablePower(slot, goal.request, source);
    const minimumW = Math.max(0, finite(goal.request.minPowerW, 0));
    if (availableW <= 0 || (minimumW > 0 && availableW + 1 < minimumW))
        return 0;
    let requestedW = Math.min(availableW, goal.remainingWh / durationH);
    if (requestedW > 0 && requestedW < minimumW)
        requestedW = minimumW;
    if (requestedW <= 0)
        return 0;
    const deliveredWh = Math.min(goal.remainingWh, requestedW * durationH);
    requestedW = deliveredWh / durationH;
    if (requestedW > 0 && requestedW < minimumW && availableW >= minimumW)
        requestedW = minimumW;
    const allocatedWh = Math.min(goal.remainingWh, requestedW * durationH);
    slot.siteUsedW += requestedW;
    const stationKey = String(goal.request.stationKey || '').trim();
    if (stationKey)
        slot.stationUsedW.set(stationKey, (slot.stationUsedW.get(stationKey) || 0) + requestedW);
    if (source === 'pv')
        slot.pvUsedW += requestedW;
    const slotAllocation = slot.allocations.get(goal.request.id) || { totalW: 0, pvW: 0, gridW: 0 };
    slotAllocation.totalW += requestedW;
    if (source === 'pv')
        slotAllocation.pvW += requestedW;
    else
        slotAllocation.gridW += requestedW;
    slot.allocations.set(goal.request.id, slotAllocation);
    const goalAllocation = goal.allocations.get(slot.index) || { totalW: 0, pvW: 0, gridW: 0 };
    goalAllocation.totalW += requestedW;
    if (source === 'pv')
        goalAllocation.pvW += requestedW;
    else
        goalAllocation.gridW += requestedW;
    goal.allocations.set(slot.index, goalAllocation);
    goal.remainingWh = Math.max(0, goal.remainingWh - allocatedWh);
    goal.plannedWh += allocatedWh;
    if (source === 'pv')
        goal.plannedPvWh += allocatedWh;
    else
        goal.plannedGridWh += allocatedWh;
    return allocatedWh;
}
/**
 * Nur für den neuen LP-Netzvertrag: kombiniert unzugeteiltes Prognose-PV mit
 * dem erlaubten Netzanteil. So sind z.B. 3,7 kW Netz + 1 kW PV trotz eines
 * 4,14-kW-Minimums planbar. Beide Quellen, Stations-/Gesamtbudget und bestehende
 * Slot-Belegung werden einmalig abgebucht. Dieser Plan ist keine Schreibfreigabe.
 */
function allocateLimitedGrid(slot, goal, durationH) {
    const current = slot.allocations.get(goal.request.id) || { totalW: 0, pvW: 0, gridW: 0 };
    const roomW = Math.max(0, Math.min(slot.siteCapW - slot.siteUsedW, stationRemaining(slot, goal.request), goal.request.maxPowerW - current.totalW));
    const pvAvailableW = Math.min(roomW, Math.max(0, slot.pvAvailableW - slot.pvUsedW));
    const gridAvailableW = Math.min(roomW, Math.max(0, finite(goal.request.maxGridPowerW, 0) - current.gridW));
    const availableW = Math.min(roomW, pvAvailableW + gridAvailableW);
    const minimumExtraW = Math.max(0, goal.request.minPowerW - current.totalW);
    if (availableW <= 0 || availableW + 1e-6 < minimumExtraW)
        return 0;
    const requestedW = Math.min(availableW, Math.max(minimumExtraW, goal.remainingWh / durationH));
    const pvW = Math.min(requestedW, pvAvailableW);
    const gridW = Math.max(0, requestedW - pvW);
    const allocatedWh = Math.min(goal.remainingWh, requestedW * durationH);
    slot.siteUsedW += requestedW;
    const key = String(goal.request.stationKey || '');
    if (key)
        slot.stationUsedW.set(key, (slot.stationUsedW.get(key) || 0) + requestedW);
    slot.pvUsedW += pvW;
    const combined = { totalW: current.totalW + requestedW, pvW: current.pvW + pvW, gridW: current.gridW + gridW };
    slot.allocations.set(goal.request.id, combined);
    goal.allocations.set(slot.index, { ...combined });
    goal.remainingWh = Math.max(0, goal.remainingWh - allocatedWh);
    goal.plannedWh += allocatedWh;
    goal.plannedPvWh += allocatedWh * (pvW / Math.max(1, requestedW));
    goal.plannedGridWh += allocatedWh * (gridW / Math.max(1, requestedW));
    return allocatedWh;
}
function currentAllocation(goal, slots, nowMs) {
    const slot = slots.find((entry) => entry.startMs <= nowMs && entry.endMs > nowMs);
    return slot ? goal.allocations.get(slot.index) || { totalW: 0, pvW: 0, gridW: 0 } : { totalW: 0, pvW: 0, gridW: 0 };
}
function nextWindow(goal, slots, nowMs, priceUsed) {
    const selected = slots
        .map((slot) => ({ slot, allocation: goal.allocations.get(slot.index) }))
        .filter((entry) => entry.allocation && entry.allocation.totalW > 0 && entry.slot.endMs > nowMs);
    const first = selected[0];
    if (!first?.allocation)
        return null;
    let endMs = Math.min(first.slot.endMs, goal.request.deadlineMs);
    let plannedPowerW = first.allocation.totalW;
    let hasPv = first.allocation.pvW > 0;
    let hasGrid = first.allocation.gridW > 0;
    let previousIndex = first.slot.index;
    for (let index = 1; index < selected.length; index += 1) {
        const current = selected[index];
        if (!current?.allocation || current.slot.index !== previousIndex + 1)
            break;
        endMs = Math.min(current.slot.endMs, goal.request.deadlineMs);
        plannedPowerW = Math.max(plannedPowerW, current.allocation.totalW);
        hasPv = hasPv || current.allocation.pvW > 0;
        hasGrid = hasGrid || current.allocation.gridW > 0;
        previousIndex = current.slot.index;
    }
    return {
        startMs: Math.max(nowMs, first.slot.startMs),
        endMs,
        source: hasPv && hasGrid ? 'mixed' : hasPv ? 'pv' : priceUsed ? 'price' : 'deadline',
        plannedPowerW: Math.round(plannedPowerW),
    };
}
function buildForecastAwareTargetPlans(input) {
    const nowMs = finite(input.nowMs, Date.now());
    const safetyFactor = clamp(input.energySafetyFactor, 1, 1.5, 1.05);
    const reserveMs = Math.max(0, finite(input.reserveMs, 10 * 60000));
    const goals = (Array.isArray(input.goals) ? input.goals : [])
        .filter((goal) => goal && goal.enabled !== false)
        .map((goal) => ({
        ...goal,
        id: String(goal.id || '').trim(),
        deadlineMs: Math.max(0, finite(goal.deadlineMs, 0)),
        requiredWh: Math.max(0, finite(goal.requiredWh, 0)) * safetyFactor,
        minPowerW: Math.max(0, finite(goal.minPowerW, 0)),
        maxPowerW: Math.max(0, finite(goal.maxPowerW, 0)),
        priority: Math.round(clamp(goal.priority, 0, 100, 50)),
        requirement: (goal.requirement === 'must' || goal.requirement === 'can' ? goal.requirement : 'should'),
    }))
        .filter((goal) => goal.id && goal.deadlineMs > nowMs && goal.maxPowerW > 0);
    if (goals.length === 0)
        return [];
    const horizonEndMs = Math.max(...goals.map((goal) => goal.deadlineMs));
    const slots = createSlots(input, horizonEndMs);
    const tariff = {
        active: input.tariff?.active === true,
        fresh: input.tariff?.fresh === true,
        mode: input.tariff?.mode === 'manual' || input.tariff?.mode === 'automatic' ? input.tariff.mode : 'none',
        priority: input.tariff?.priority === 1 || input.tariff?.priority === 3 ? input.tariff.priority : 2,
        manualCheapThresholdEurKwh: input.tariff?.manualCheapThresholdEurKwh ?? null,
        automaticCheapThresholdEurKwh: input.tariff?.automaticCheapThresholdEurKwh ?? null,
    };
    const priceValues = slots.map((slot) => slot.priceEurKwh).filter((value) => Number.isFinite(value));
    const fallbackThreshold = percentile(priceValues, 0.35);
    const threshold = tariff.mode === 'manual'
        ? (Number.isFinite(Number(tariff.manualCheapThresholdEurKwh)) ? Number(tariff.manualCheapThresholdEurKwh) : fallbackThreshold)
        : (Number.isFinite(Number(tariff.automaticCheapThresholdEurKwh)) ? Number(tariff.automaticCheapThresholdEurKwh) : fallbackThreshold);
    const gridPlanningAllowed = input.gridPlanningAllowed !== false;
    const priceForecastUsed = gridPlanningAllowed && tariff.active && tariff.fresh && tariff.mode !== 'none' && priceValues.length > 0;
    const pvForecastUsed = slots.some((slot) => slot.pvAvailableW > 1);
    const mutableGoals = goals
        .sort((a, b) => requirementRank(b.requirement) - requirementRank(a.requirement)
        || a.deadlineMs - b.deadlineMs
        || finite(b.priority, 50) - finite(a.priority, 50))
        .map((request) => ({ request, requiredWh: request.requiredWh, remainingWh: request.requiredWh, plannedWh: 0, plannedPvWh: 0, plannedGridWh: 0, allocations: new Map() }));
    for (const goal of mutableGoals) {
        const candidates = slots.filter((slot) => slot.startMs < goal.request.deadlineMs);
        for (const slot of [...candidates].sort((a, b) => b.pvAvailableW - a.pvAvailableW || a.startMs - b.startMs)) {
            if (goal.remainingWh <= 0)
                break;
            allocate(slot, goal, 'pv');
        }
        if (gridPlanningAllowed && goal.remainingWh > 0 && priceForecastUsed && tariff.priority !== 1) {
            const cheap = candidates
                .filter((slot) => slot.priceEurKwh !== null && threshold !== null && slot.priceEurKwh <= threshold + 1e-9)
                .sort((a, b) => Number(a.priceEurKwh) - Number(b.priceEurKwh) || b.startMs - a.startMs);
            for (const slot of cheap) {
                if (goal.remainingWh <= 0)
                    break;
                allocate(slot, goal, 'grid');
            }
        }
        if (gridPlanningAllowed && goal.remainingWh > 0) {
            const remaining = [...candidates].sort((a, b) => {
                if (priceForecastUsed && tariff.priority === 3) {
                    const priceDelta = (a.priceEurKwh ?? Number.POSITIVE_INFINITY) - (b.priceEurKwh ?? Number.POSITIVE_INFINITY);
                    return priceDelta || b.startMs - a.startMs;
                }
                return b.startMs - a.startMs;
            });
            for (const slot of remaining) {
                if (goal.remainingWh <= 0)
                    break;
                allocate(slot, goal, 'grid');
            }
        }
    }
    return mutableGoals.map((goal) => {
        const current = currentAllocation(goal, slots, nowMs);
        const economicPriceUsed = priceForecastUsed && tariff.priority !== 1;
        const window = nextWindow(goal, slots, nowMs, economicPriceUsed);
        const toleranceWh = Math.max(50, goal.requiredWh * 0.005);
        const unscheduledWh = Math.max(0, goal.remainingWh);
        const targetReachable = unscheduledWh <= toleranceWh;
        const gridLimited = typeof goal.request.maxGridPowerW === 'number';
        // PV ist bereits in den Slots eingeplant. Die verbleibende Netzenergie
        // muss mit dem kleineren LP-Netzanteil rechtzeitig beginnen können.
        const latestStartEnergyWh = gridLimited ? Math.max(0, goal.requiredWh - goal.plannedPvWh) : goal.requiredWh;
        const latestStartPowerW = gridLimited ? Math.min(goal.request.maxPowerW, goal.request.maxGridPowerW) : goal.request.maxPowerW;
        const latestStartMs = goal.request.deadlineMs - Math.ceil((latestStartEnergyWh / Math.max(1, latestStartPowerW)) * HOUR_MS) - reserveMs;
        const deadlineOverride = nowMs >= latestStartMs || !targetReachable;
        const fallbackMaxW = gridLimited
            ? Math.min(goal.request.maxPowerW, Math.max(0, goal.request.maxGridPowerW)) : goal.request.maxPowerW;
        const plannedNowW = current.totalW > 0
            ? current.totalW
            : deadlineOverride && gridPlanningAllowed
                ? (gridLimited && fallbackMaxW + 1e-6 < goal.request.minPowerW ? 0 : Math.min(fallbackMaxW, Math.max(goal.request.minPowerW, goal.requiredWh / Math.max(0.05, (goal.request.deadlineMs - nowMs) / HOUR_MS))))
                : 0;
        const action = goal.requiredWh <= 1
            ? 'complete'
            : plannedNowW > 0
                ? 'charge'
                : !targetReachable && !window
                    ? 'blocked'
                    : 'wait';
        const source = current.pvW > 0 && current.gridW > 0
            ? 'mixed'
            : current.pvW > 0
                ? 'pv'
                : current.gridW > 0
                    ? economicPriceUsed ? 'price' : 'deadline'
                    : deadlineOverride ? 'deadline' : 'none';
        const reason = action === 'complete'
            ? 'target-reached'
            : action === 'blocked'
                ? gridPlanningAllowed ? 'insufficient-capacity-before-deadline' : 'insufficient-pv-before-deadline'
                : action === 'charge'
                    ? deadlineOverride ? 'latest-safe-start' : source === 'pv' ? 'planned-pv-window' : source === 'mixed' ? 'planned-pv-and-price-window' : priceForecastUsed ? 'planned-price-window' : 'planned-deadline-window'
                    : window?.source === 'pv' ? 'wait-for-pv-window' : tariff.priority === 1 && priceForecastUsed ? 'wait-for-storage-priority-or-latest-start' : economicPriceUsed ? 'wait-for-cheaper-price-window' : 'wait-until-latest-start';
        return {
            id: goal.request.id,
            active: true,
            action,
            reason,
            source,
            plannedNowW: Math.round(Math.max(0, plannedNowW)),
            requiredWh: Math.round(goal.requiredWh),
            plannedWh: Math.round(goal.plannedWh),
            plannedPvWh: Math.round(goal.plannedPvWh),
            plannedGridWh: Math.round(goal.plannedGridWh),
            unscheduledWh: Math.round(unscheduledWh),
            latestStartMs: Math.max(nowMs, latestStartMs),
            nextWindow: window,
            targetReachable,
            targetAtRisk: !targetReachable || deadlineOverride,
            deadlineOverride,
            pvForecastUsed,
            priceForecastUsed,
            tariffMode: tariff.mode,
            tariffPriority: tariff.priority,
            fallbackMode: !gridPlanningAllowed ? 'pv-only-policy' : tariff.priority === 1 && priceForecastUsed ? 'storage-priority-plus-latest-start' : pvForecastUsed && priceForecastUsed ? 'pv-and-price' : pvForecastUsed ? 'pv-plus-latest-start' : priceForecastUsed ? 'price-plus-latest-start' : 'latest-start-only',
        };
    });
}
