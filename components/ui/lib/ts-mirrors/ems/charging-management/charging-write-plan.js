'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/ems/charging-management/charging-write-plan.ts
 * Quell-Hash: sha256:94a6fd0889aec78af0c0e42b2fc1737a99c74ec7f90712c7828474e31742e78c
 * Erzeugung: npm run sync:ts-ems-mirrors
 *
 * Zweck:
 * EVCS-Setpoint-Write-Plan-Shadow ohne produktive ioBroker-Schreiboperationen.
 *
 * Zusammenhang:
 * Dieser Spiegel ist die sichere Vorstufe für spätere Core-Limits-/Heizstab-
 * Shadow-Vergleiche. In 0.7.76 bleibt die produktive Runtime unverändert.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/ vornehmen.
 * 2. npm run sync:ts-ems-mirrors ausführen.
 * 3. npm run test:ems-mirrors prüfen.
 */
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Erzeugt aus dem freigegebenen Ladeplan einen typisierten Schreibplan; die tatsächlichen Hardware-Schreiboperationen führt der Laufzeit-Executor aus.
 * Daten und Wirkung: Erhält den begrenzten Allocation-Plan; liefert geplante Datenpunktwerte und Sperrgründe. Der Aufrufer bleibt für die endgültige Sicherheitsprüfung und den Schreibvorgang verantwortlich.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/ems/charging-management/charging-write-plan.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Datei: src-ts/ems/charging-management/charging-write-plan.ts
 *
 * Zweck:
 * TypeScript-Shadow und produktiver Vertrag für den EVCS-Setpoint-Write-Plan.
 * Die Datei erstellt einen typisierten Schreibplan aus dem Allocation-Plan, führt
 * aber selbst keine ioBroker-Schreiboperation aus. Ab 0.7.126 darf der JS-Executor
 * diesen geprüften TS-Plan ausführen.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildChargingSetpointWritePlan = buildChargingSetpointWritePlan;
exports.buildChargingSetpointWritePlanProductivePrep = buildChargingSetpointWritePlanProductivePrep;
exports.buildChargingSetpointWritePlanProductive = buildChargingSetpointWritePlanProductive;
function finiteOrNull(value) {
    if (typeof value === 'number')
        return Number.isFinite(value) ? value : null;
    if (typeof value === 'string') {
        const s = value.trim().replace(',', '.');
        if (!s)
            return null;
        const n = Number(s);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}
function nonNegative(value) {
    const n = finiteOrNull(value);
    return n === null || n <= 0 ? 0 : Math.round(n);
}
function nonNegativeFloat(value) {
    const n = finiteOrNull(value);
    return n === null || n <= 0 ? 0 : Number(n.toFixed(3));
}
function boolValue(value, fallback = false) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'number' && Number.isFinite(value))
        return value !== 0;
    if (typeof value === 'string') {
        const s = value.trim().toLowerCase();
        if (['true', '1', 'on', 'yes', 'ja', 'enabled', 'active'].includes(s))
            return true;
        if (['false', '0', 'off', 'no', 'nein', 'disabled', 'inactive'].includes(s))
            return false;
    }
    return fallback;
}
function str(value, fallback = '') {
    const s = String(value ?? '').trim();
    return s || fallback;
}
function safeKey(value, fallbackIndex = 0) {
    const raw = str(value, `wallbox_${fallbackIndex + 1}`);
    const safe = raw.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
    return safe || `wallbox_${fallbackIndex + 1}`;
}
function buildAllocationMap(input) {
    const map = new Map();
    const fromPlan = input.allocationPlan && Array.isArray(input.allocationPlan.wallboxes) ? input.allocationPlan.wallboxes : [];
    const fromAlloc = Array.isArray(input.allocations) ? input.allocations : [];
    // Legacy-/Runtime-Zeilen sind nur Fallback. Der final geprüfte Allocation-Plan
    // wird bewusst zuletzt eingetragen und überschreibt bei gleichem Ladepunkt alle
    // älteren Zielwerte. Andernfalls könnten Stations- oder Budget-Caps im Write-Plan
    // wieder durch die vorgelagerte Diagnose-Allocation ausgehebelt werden.
    [...fromAlloc, ...fromPlan].forEach((entry, index) => {
        if (!entry || typeof entry !== 'object' || String(entry.type || '') === 'budget')
            return;
        const safe = safeKey(entry.safe ?? entry.key ?? entry.id ?? entry.name, index);
        map.set(safe, entry);
    });
    return map;
}
/**
 * Code-Teil: buildChargingSetpointWritePlan
 * Zweck: Erstellt einen sicheren Write-Intent-Plan, ohne ihn auszuführen.
 */
/**
 * Ablauf und Zusammenhang: Erzeugt pro Ladepunkt die vorgesehenen Sollwert-Schreibschritte aus dem Allocation-Plan. Einträge enthalten Strom-/Leistungsbezug und Sperr-/Phaseninformationen; diese reine Planerstellung führt keine ioBroker-Schreiboperation aus.
 */
function buildChargingSetpointWritePlan(input) {
    const blockers = [];
    const warnings = [];
    const safetyStop = boolValue(input.safetyStop, false);
    const safetyReason = safetyStop ? str(input.safetyReason, boolValue(input.staleMeter) ? 'stale-meter-safety-stop' : 'evcs-safety-stop') : '';
    if (safetyStop)
        warnings.push(safetyReason);
    if (boolValue(input.staleMeter) && !safetyStop)
        blockers.push('stale-meter');
    else if (boolValue(input.staleMeter) && safetyStop)
        warnings.push('stale-meter-bypassed-for-zero-safety-stop');
    if (boolValue(input.staleBudget) && !safetyStop)
        blockers.push('stale-budget');
    else if (boolValue(input.staleBudget) && safetyStop)
        warnings.push('stale-budget-bypassed-for-zero-safety-stop');
    const allocationBySafe = buildAllocationMap(input);
    const wallboxes = Array.isArray(input.wallboxes) ? input.wallboxes : [];
    const allSafes = new Set();
    wallboxes.forEach((wb, index) => allSafes.add(safeKey(wb.safe ?? wb.name, index)));
    for (const safe of allocationBySafe.keys())
        allSafes.add(safe);
    if (!allSafes.size)
        warnings.push('no-wallboxes-configured');
    const entries = [];
    let index = 0;
    for (const safe of allSafes) {
        const wb = wallboxes.find((candidate, candidateIndex) => safeKey(candidate.safe ?? candidate.name, candidateIndex) === safe) || { safe };
        const alloc = allocationBySafe.get(safe) || {};
        const basisRaw = str(wb.controlBasis ?? alloc.controlBasis, 'power').toLowerCase();
        let basis = ['current', 'currenta', 'current_a', 'a', 'amp', 'amps'].includes(basisRaw) ? 'current' : 'power';
        const setW = str(wb.setWKey ?? alloc.setWKey);
        const setA = str(wb.setAKey ?? alloc.setAKey);
        if (safetyStop && basis === 'current' && !setA && setW)
            basis = 'power';
        if (safetyStop && basis === 'power' && !setW && setA)
            basis = 'current';
        const targetPowerW = safetyStop ? 0 : nonNegative(alloc.targetPowerW ?? alloc.targetW ?? wb.targetPowerW ?? wb.targetW);
        const targetCurrentA = safetyStop ? 0 : nonNegativeFloat(alloc.targetCurrentA ?? alloc.targetA ?? wb.targetCurrentA ?? wb.targetA);
        const online = boolValue(wb.online ?? alloc.online, false);
        const enabled = boolValue(wb.enabled ?? alloc.enabled, false);
        const setpointKey = basis === 'current' ? setA : setW;
        const targetValue = basis === 'current' ? targetCurrentA : targetPowerW;
        let reason = safetyStop ? safetyReason : str(alloc.reason ?? wb.reason);
        let blocked = false;
        if (!online) {
            blocked = true;
            reason = reason || 'offline';
        }
        if (!enabled && targetValue > 0) {
            blocked = true;
            reason = reason || 'disabled';
        }
        if (!setpointKey) {
            blocked = true;
            reason = reason || `missing-${basis}-setpoint`;
        }
        if (safetyStop && targetValue !== 0) {
            blocked = true;
            reason = 'non-zero-safety-stop-target';
        }
        if (blockers.length) {
            blocked = true;
            reason = reason || String(blockers[0] || 'blocked');
        }
        const writeRequired = !blocked && Number.isFinite(targetValue) && targetValue >= 0 && setpointKey.length > 0;
        entries.push({
            safe,
            name: str(wb.name ?? alloc.name, safe),
            type: 'setpoint',
            basis,
            setpointKey,
            targetPowerW,
            targetCurrentA,
            targetValue,
            targetPhaseCount: nonNegative(alloc.targetPhaseCount ?? wb.targetPhaseCount),
            ack: false,
            deadband: basis === 'current' ? 0.1 : 5,
            writeRequired,
            allocationRank: nonNegative(alloc.allocationRank ?? wb.allocationRank),
            pvUsedW: nonNegative(alloc.pvUsedW ?? wb.pvUsedW),
            stationKey: str(alloc.stationKey ?? wb.stationKey),
            stationMaxPowerW: nonNegative(alloc.stationMaxPowerW ?? wb.stationMaxPowerW),
            stationAllocatedW: nonNegative(alloc.stationAllocatedW ?? wb.stationAllocatedW),
            stationRemainingW: nonNegative(alloc.stationRemainingW ?? wb.stationRemainingW),
            allocationSafetyCapped: boolValue(alloc.allocationSafetyCapped ?? wb.allocationSafetyCapped, false),
            allocationSafetyReason: str(alloc.allocationSafetyReason ?? wb.allocationSafetyReason),
            blocked,
            reason: reason || (writeRequired ? 'write-planned' : 'no-write'),
        });
        const phaseSwitchRequired = boolValue(alloc.phaseSwitchRequired ?? wb.phaseSwitchRequired, false);
        const phaseSwitchSafetyStopRequired = boolValue(alloc.phaseSwitchSafetyStopRequired ?? wb.phaseSwitchSafetyStopRequired, false);
        const phaseSwitchCommandAllowed = boolValue(alloc.phaseSwitchCommandAllowed ?? wb.phaseSwitchCommandAllowed, false);
        const phaseSwitchKey = str(alloc.phaseSwitchKey ?? wb.phaseSwitchKey);
        const phaseSwitchValueRaw = (alloc.phaseSwitchValue ?? wb.phaseSwitchValue);
        const phaseSwitchValue = typeof phaseSwitchValueRaw === 'boolean'
            ? phaseSwitchValueRaw
            : (typeof phaseSwitchValueRaw === 'number' && Number.isFinite(phaseSwitchValueRaw)
                ? phaseSwitchValueRaw
                : (() => {
                    const raw = str(phaseSwitchValueRaw);
                    if (!raw)
                        return nonNegative(alloc.targetPhaseCount ?? wb.targetPhaseCount);
                    const low = raw.toLowerCase();
                    if (low === 'true' || low === 'false')
                        return low === 'true';
                    const n = Number(raw.replace(',', '.'));
                    return Number.isFinite(n) ? n : raw;
                })());
        if (phaseSwitchRequired || phaseSwitchSafetyStopRequired || phaseSwitchCommandAllowed) {
            const phaseReason = str(alloc.phaseSwitchReason ?? wb.phaseSwitchReason, phaseSwitchCommandAllowed ? 'phase-switch-command-ready' : 'phase-switch-waiting-for-safe-stop');
            let phaseBlocked = false;
            let phaseBlockedReason = phaseReason;
            if (!online) {
                phaseBlocked = true;
                phaseBlockedReason = 'offline';
            }
            if (!phaseSwitchKey) {
                phaseBlocked = true;
                phaseBlockedReason = 'missing-phase-switch-setpoint';
            }
            if (!phaseSwitchCommandAllowed) {
                phaseBlocked = true;
                phaseBlockedReason = phaseReason || 'phase-switch-command-not-ready';
            }
            if (blockers.length && !phaseSwitchSafetyStopRequired) {
                phaseBlocked = true;
                phaseBlockedReason = phaseBlockedReason || String(blockers[0] || 'blocked');
            }
            const phaseWriteRequired = !phaseBlocked && phaseSwitchKey.length > 0;
            entries.push({
                safe,
                name: str(wb.name ?? alloc.name, safe),
                type: 'phaseSwitch',
                basis: 'phase',
                setpointKey: phaseSwitchKey,
                targetPowerW: 0,
                targetCurrentA: 0,
                targetValue: phaseSwitchValue,
                targetPhaseCount: nonNegative(alloc.targetPhaseCount ?? wb.targetPhaseCount),
                ack: false,
                deadband: 0,
                writeRequired: phaseWriteRequired,
                allocationRank: nonNegative(alloc.allocationRank ?? wb.allocationRank),
                pvUsedW: 0,
                stationKey: str(alloc.stationKey ?? wb.stationKey),
                stationMaxPowerW: nonNegative(alloc.stationMaxPowerW ?? wb.stationMaxPowerW),
                stationAllocatedW: nonNegative(alloc.stationAllocatedW ?? wb.stationAllocatedW),
                stationRemainingW: nonNegative(alloc.stationRemainingW ?? wb.stationRemainingW),
                allocationSafetyCapped: false,
                allocationSafetyReason: '',
                blocked: phaseBlocked,
                reason: phaseBlockedReason || (phaseWriteRequired ? 'phase-switch-write-planned' : 'phase-switch-no-write'),
            });
            warnings.push('phase-switch-write-plan-present');
        }
        index++;
    }
    const writeCount = entries.filter((entry) => entry.writeRequired).length;
    const blockedCount = entries.filter((entry) => entry.blocked).length;
    return {
        source: 'ts-charging-setpoint-write-plan-shadow-v1',
        available: true,
        ok: blockers.length === 0,
        productive: false,
        ts: finiteOrNull(input.ts) ?? Date.now(),
        writeCount,
        blockedCount,
        entries,
        blockers,
        warnings,
        safety: {
            doesNotWriteIoBrokerStates: true,
            javascriptExecutorStillRequired: true,
            validatesOnlyWriteIntent: true,
            allowsSafeStopWhileMeterStale: true,
            forceZeroTargetsOnSafetyStop: true,
            nonZeroSafetyStopRejected: true,
        },
    };
}
function cloneWriteEntries(plan) {
    return Array.isArray(plan.entries) ? plan.entries.map((entry) => ({ ...entry })) : [];
}
/**
 * Code-Teil: buildChargingSetpointWritePlanProductivePrep
 * Zweck: Bereitet den TS-Write-Plan als Executor-Vertrag vor, ohne ihn freizuschalten.
 */
function buildChargingSetpointWritePlanProductivePrep(input, plan = buildChargingSetpointWritePlan(input)) {
    const blockers = Array.isArray(plan.blockers) ? [...plan.blockers] : [];
    if (plan.ok !== true) {
        for (const blocker of plan.blockers || []) {
            if (!blockers.includes(blocker))
                blockers.push(blocker);
        }
    }
    const entries = cloneWriteEntries(plan);
    const prepared = plan.ok === true && blockers.length === 0;
    const writeEntries = prepared ? entries.filter((entry) => entry.writeRequired && !entry.blocked) : [];
    const fallbackReason = prepared ? '' : (blockers[0] || 'ts-write-plan-not-ready');
    return {
        source: 'ts-charging-setpoint-write-plan-productive-prep-v1',
        available: true,
        ok: prepared,
        productive: false,
        prepared,
        fallback: !prepared,
        fallbackReason,
        ts: finiteOrNull(input.ts) ?? plan.ts ?? Date.now(),
        writeCount: writeEntries.length,
        blockedCount: entries.filter((entry) => entry.blocked).length,
        entries,
        blockers,
        warnings: Array.isArray(plan.warnings) ? [...plan.warnings] : [],
        apply: prepared ? {
            executor: 'javascript-iobroker-setState',
            entries: writeEntries,
            writeCount: writeEntries.length,
        } : null,
        safety: {
            doesNotWriteIoBrokerStates: true,
            javascriptExecutorStillRequired: true,
            validatesOnlyWriteIntent: true,
            javascriptExecutorOnly: true,
            executorUsesTsPlannedBasis: true,
            executorUsesTsPlannedSetpointKey: true,
            fallbackOnExecutorError: true,
            allowsSafeStopWhileMeterStale: true,
            forceZeroTargetsOnSafetyStop: true,
            nonZeroSafetyStopRejected: true,
        },
        nextAction: prepared
            ? 'Write-Plan-Executor-Vertrag ist vorbereitet; Freigabe erfolgt nur durch den produktiven TS-Allocation-Pfad.'
            : 'JavaScript bleibt Executor/Fallback; erst Write-Plan-Blocker bereinigen.',
    };
}
/**
 * Code-Teil: buildChargingSetpointWritePlanProductive
 *
 * Zweck:
 * Gibt den Setpoint-Write-Plan als produktiven Vertrag für den JavaScript-Executor frei.
 * TypeScript validiert Zielwerte, Datenpunktwahl, Deadbands und Blocker; die eigentliche
 * ioBroker-Operation bleibt absichtlich im JS-Executor.
 */
/**
 * Ablauf und Zusammenhang: Bereitet den geprüften Schreibplan zur produktiven Verwendung durch den Runtime-Executor auf. Diagnose-/Freigabebedingungen bleiben Teil des Ergebnisses und dürfen beim Ausführen nicht übergangen werden.
 */
function buildChargingSetpointWritePlanProductive(input, plan = buildChargingSetpointWritePlan(input)) {
    const prep = buildChargingSetpointWritePlanProductivePrep(input, plan);
    const allowWrites = boolValue(input.allowWrites, false);
    const blockers = Array.isArray(prep.blockers) ? [...prep.blockers] : [];
    if (!allowWrites)
        blockers.push('writes-not-enabled');
    const canApply = allowWrites === true && prep.prepared === true && blockers.length === 0;
    const writeEntries = canApply && prep.apply ? prep.apply.entries.map((entry) => ({ ...entry })) : [];
    const fallbackReason = canApply ? '' : (blockers[0] || prep.fallbackReason || 'ts-write-plan-not-ready');
    return {
        source: 'ts-charging-setpoint-write-plan-productive-v1',
        available: true,
        ok: canApply,
        productive: canApply,
        prepared: prep.prepared,
        fallback: !canApply,
        fallbackReason,
        ts: finiteOrNull(input.ts) ?? plan.ts ?? Date.now(),
        writeCount: writeEntries.length,
        blockedCount: prep.blockedCount,
        entries: prep.entries.map((entry) => ({ ...entry })),
        blockers,
        warnings: Array.isArray(prep.warnings) ? [...prep.warnings] : [],
        apply: canApply ? {
            executor: 'javascript-iobroker-setState',
            entries: writeEntries,
            writeCount: writeEntries.length,
        } : null,
        safety: {
            doesNotWriteIoBrokerStates: true,
            javascriptExecutorStillRequired: true,
            validatesOnlyWriteIntent: true,
            javascriptExecutorOnly: true,
            executorUsesTsPlannedBasis: true,
            executorUsesTsPlannedSetpointKey: true,
            fallbackOnExecutorError: true,
            allowsSafeStopWhileMeterStale: true,
            forceZeroTargetsOnSafetyStop: true,
            nonZeroSafetyStopRejected: true,
        },
        nextAction: canApply
            ? 'Write-Plan wird produktiv vom JavaScript-Executor ausgeführt; TypeScript bleibt die Entscheidungsquelle.'
            : 'JavaScript-Fallback bleibt aktiv; erst Write-Plan-Blocker oder fehlende Freigabe bereinigen.',
    };
}
