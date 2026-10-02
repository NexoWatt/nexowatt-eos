/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/rc85-runtime-hardening.ts
 * Quell-Hash: sha256:cdd1c7a8580efdb001135715b724b656df3b307a56b18e6b8b8c266d7e4eb4da
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/rc85-runtime-hardening.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rc85EvcsDecisionGuard = void 0;
exports.rc88RuntimeHardeningSnapshot = rc88RuntimeHardeningSnapshot;
exports.rc88ClearRuntimeHardening = rc88ClearRuntimeHardening;
exports.rc85RunIsolatedResult = rc85RunIsolatedResult;
exports.rc85RunIsolated = rc85RunIsolated;
exports.rc85IsHardReason = rc85IsHardReason;
exports.rc85IsSoftEconomicReason = rc85IsSoftEconomicReason;
exports.rc85GridEnvelope = rc85GridEnvelope;
exports.rc86GridBinding = rc86GridBinding;
exports.rc85OfflineReserveW = rc85OfflineReserveW;
exports.rc88ClassifyHeapPressure = rc88ClassifyHeapPressure;
exports.startRc85HeapMonitor = startRc85HeapMonitor;
exports.stopRc85HeapMonitor = stopRc85HeapMonitor;
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Kapselt Laufzeitgrenzen, Fehlerisolation und Schutzmechanismen für Regelmodule und Speicherverbrauch.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/rc85-runtime-hardening.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/* RC85: shared stability and charging-control hardening. */
const node_v8_1 = require("node:v8");
const inFlight = new Map();
const timeoutLogAt = new Map();
const MAX_IN_FLIGHT = 256;
const hardeningStats = {
    started: 0,
    completed: 0,
    failed: 0,
    timedOut: 0,
    skippedInFlight: 0,
    rejectedAtCapacity: 0,
    activeMax: 0,
    lateSettled: 0,
    lastTimeoutLabel: '',
    lastTimeoutAt: 0,
};
function boundedMapSet(map, key, value, max = 512) {
    map.set(key, value);
    while (map.size > max) {
        const oldest = map.keys().next().value;
        if (oldest === undefined)
            break;
        map.delete(oldest);
    }
}
function logWatchdogOnce(label, message, log, now = Date.now()) {
    const last = timeoutLogAt.get(label) ?? 0;
    if (now - last < 60000)
        return;
    boundedMapSet(timeoutLogAt, label, now, 512);
    log.warn?.(`[RC88 watchdog] ${label}: ${message}`);
}
function rc88RuntimeHardeningSnapshot(now = Date.now()) {
    let oldestStartedAt = now;
    const labels = [];
    for (const [label, entry] of inFlight) {
        labels.push(label);
        if (entry.startedAt < oldestStartedAt)
            oldestStartedAt = entry.startedAt;
    }
    return {
        active: inFlight.size,
        oldestActiveAgeMs: inFlight.size ? Math.max(0, now - oldestStartedAt) : 0,
        labels: labels.slice(0, 32),
        ...hardeningStats,
    };
}
function rc88ClearRuntimeHardening() {
    for (const entry of inFlight.values()) {
        try {
            entry.controller.abort(new Error('RC88_ADAPTER_UNLOAD'));
        }
        catch (_error) { }
    }
    inFlight.clear();
    timeoutLogAt.clear();
}
async function rc85RunIsolatedResult(label, timeoutMs, work, log = console) {
    const now = Date.now();
    const normalizedLabel = String(label || 'unknown').slice(0, 240);
    const active = inFlight.get(normalizedLabel);
    if (active) {
        // RC88_NO_DUPLICATE_HUNG_WORK: A timed-out operation stays quarantined
        // until the original Promise really settles. Deleting it merely because
        // it is old would start another unresolved hardware/module call and is a
        // direct route to a growing V8 heap.
        hardeningStats.skippedInFlight += 1;
        const ageMs = Math.max(0, now - active.startedAt);
        logWatchdogOnce(normalizedLabel, `still in flight for ${ageMs} ms; duplicate suppressed`, log, now);
        return {
            ok: false,
            timedOut: active.timedOutAt > 0,
            skipped: true,
            durationMs: ageMs,
            error: new Error(`RC88_IN_FLIGHT:${normalizedLabel}`),
        };
    }
    if (inFlight.size >= MAX_IN_FLIGHT) {
        hardeningStats.rejectedAtCapacity += 1;
        logWatchdogOnce(normalizedLabel, `in-flight capacity ${MAX_IN_FLIGHT} reached; work rejected fail-closed`, log, now);
        return {
            ok: false,
            timedOut: false,
            skipped: true,
            durationMs: 0,
            error: new Error(`RC88_IN_FLIGHT_CAPACITY:${normalizedLabel}`),
        };
    }
    const safeTimeoutMs = Math.max(100, Math.min(120000, Number(timeoutMs) || 10000));
    const controller = new AbortController();
    let timer;
    let timedOut = false;
    let entry;
    const token = Symbol(normalizedLabel);
    const task = Promise.resolve().then(() => work(controller.signal));
    // RC88_LIGHTWEIGHT_QUARANTINE: The map keeps only a token/controller, not
    // the complete unresolved Promise chain. This still suppresses duplicate
    // hardware work until true settlement, without making the watchdog map an
    // additional strong root for all captured module state.
    entry = {
        startedAt: now,
        token,
        controller,
        timeoutAt: now + safeTimeoutMs,
        timedOutAt: 0,
    };
    inFlight.set(normalizedLabel, entry);
    void task.then(() => { if (entry.timedOutAt > 0)
        hardeningStats.lateSettled += 1; }, () => { if (entry.timedOutAt > 0)
        hardeningStats.lateSettled += 1; }).finally(() => {
        const current = inFlight.get(normalizedLabel);
        if (current?.token === token)
            inFlight.delete(normalizedLabel);
    }).catch(() => undefined);
    hardeningStats.started += 1;
    hardeningStats.activeMax = Math.max(hardeningStats.activeMax, inFlight.size);
    try {
        const timeout = new Promise((_, reject) => {
            timer = setTimeout(() => {
                timedOut = true;
                entry.timedOutAt = Date.now();
                hardeningStats.timedOut += 1;
                hardeningStats.lastTimeoutLabel = normalizedLabel;
                hardeningStats.lastTimeoutAt = entry.timedOutAt;
                try {
                    controller.abort(new Error(`RC88_TIMEOUT:${normalizedLabel}:${safeTimeoutMs}ms`));
                }
                catch (_error) { }
                reject(new Error(`RC88_TIMEOUT:${normalizedLabel}:${safeTimeoutMs}ms`));
            }, safeTimeoutMs);
            timer.unref?.();
        });
        const value = await Promise.race([task, timeout]);
        hardeningStats.completed += 1;
        return {
            ok: true,
            value,
            timedOut: false,
            skipped: false,
            durationMs: Math.max(0, Date.now() - now),
        };
    }
    catch (error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        if (!timedOut)
            hardeningStats.failed += 1;
        logWatchdogOnce(normalizedLabel, normalizedError.message, log, now);
        return {
            ok: false,
            error: normalizedError,
            timedOut: timedOut || normalizedError.message.startsWith('RC88_TIMEOUT:'),
            skipped: false,
            durationMs: Math.max(0, Date.now() - now),
        };
    }
    finally {
        if (timer)
            clearTimeout(timer);
    }
}
async function rc85RunIsolated(label, timeoutMs, work, log = console) {
    const result = await rc85RunIsolatedResult(label, timeoutMs, work, log);
    return result.ok ? result.value : undefined;
}
function rc85IsHardReason(reasonValue) {
    const reason = String(reasonValue ?? '').toLowerCase();
    return /(?:grid[-_ ]?hard|hard[-_ ]?limit|safety[-_ ]?stop|safe[-_ ]?zero|§?14a|emergency|not[-_ ]?aus|fuse|sicherung|phase|cable|leitung|overload|nvp.*(?:invalid|stale|offline)|central.*(?:fault|error)|writer[-_ ]?error|device[-_ ]?safety|rfid[-_ ]?stop|manual[-_ ]?stop|unplug|finished|finish)/i.test(reason);
}
function rc85IsSoftEconomicReason(reasonValue) {
    const reason = String(reasonValue ?? '').toLowerCase();
    return /(?:tarif|tariff|price|strompreis|economic|neutral|teuer|günstig|guenstig|forecast|prognose|pv|grid[-_ ]?soft|soft[-_ ]?limit|budget|redistribut|allocation|auto|storage|speicher)/i.test(reason);
}
class Rc85EvcsDecisionGuard {
    constructor() {
        this.states = new Map();
    }
    evaluate(input) {
        const now = Number.isFinite(input.nowMs) ? Number(input.nowMs) : Date.now();
        const key = input.key || 'unknown';
        const requested = Math.max(0, Number.isFinite(input.requested) ? Number(input.requested) : 0);
        const unit = input.unit === 'A' ? 'A' : 'W';
        const minActive = Math.max(0, input.minActive ?? (unit === 'A' ? 6 : 4140));
        const minRunMs = Math.max(0, input.minRunMs ?? 120000);
        const minPauseMs = Math.max(0, input.minPauseMs ?? 30000);
        const debounceMs = Math.max(0, input.economicDebounceMs ?? 25000);
        const rampUp = Math.max(0.1, input.rampUpPerStep ?? (unit === 'A' ? 1 : 2300));
        const rampDown = Math.max(0.1, input.rampDownPerStep ?? (unit === 'A' ? 2 : 4600));
        const hard = input.hardSafety === true || rc85IsHardReason(input.reason);
        const soft = input.priceUpdatePending === true || rc85IsSoftEconomicReason(input.reason);
        const previous = this.states.get(key) ?? { approved: 0, startedAt: 0, stoppedAt: 0, stoppedSoftEconomic: false, zeroCandidateAt: 0, lastSeenAt: now };
        let approved = requested;
        let held = false;
        let decisionReason = hard ? 'hard-safety' : 'normal';
        if (!hard) {
            // RC85_EVCS_SOFT_GUARD: Price/tariff refreshes must never inject a
            // single temporary zero command. The hold is deliberately bounded by
            // the economic debounce period; a permanently stale tariff can
            // therefore not keep an economically blocked charge alive forever.
            if (input.priceUpdatePending && previous.approved > 0) {
                const zeroCandidateAt = previous.zeroCandidateAt || now;
                previous.zeroCandidateAt = zeroCandidateAt;
                if (now - zeroCandidateAt < debounceMs) {
                    approved = previous.approved;
                    held = true;
                    decisionReason = 'price-update-hold';
                }
            }
            if (!held && requested <= 0 && previous.approved > 0 && soft) {
                const runtime = previous.startedAt > 0 ? now - previous.startedAt : Number.POSITIVE_INFINITY;
                const zeroCandidateAt = previous.zeroCandidateAt || now;
                previous.zeroCandidateAt = zeroCandidateAt;
                if (runtime < minRunMs || now - zeroCandidateAt < debounceMs) {
                    approved = Math.max(previous.approved, minActive);
                    held = true;
                    decisionReason = runtime < minRunMs ? 'minimum-run-hold' : 'economic-debounce-hold';
                }
                else if (previous.approved > minActive) {
                    approved = Math.max(minActive, previous.approved - rampDown);
                    held = true;
                    decisionReason = 'soft-ramp-down';
                }
                else {
                    approved = 0;
                    decisionReason = 'stable-economic-stop';
                }
            }
            else if (requested > 0
                && previous.approved <= 0
                && previous.stoppedSoftEconomic === true
                && previous.stoppedAt > 0
                && now - previous.stoppedAt < minPauseMs) {
                approved = 0;
                held = true;
                decisionReason = 'minimum-pause-hold';
            }
            else if (requested > previous.approved) {
                // A first positive command must reach the technical minimum in a
                // single step. Otherwise an AC wallbox would repeatedly receive
                // sub-minimum targets which are quantized back to 0 W, causing the
                // exact start/stop oscillation this guard is intended to prevent.
                const nextUp = previous.approved <= 0
                    ? Math.max(minActive, rampUp)
                    : previous.approved + rampUp;
                approved = Math.min(requested, nextUp);
                held = approved !== requested;
                decisionReason = held ? 'soft-ramp-up' : 'normal';
            }
            else if (requested < previous.approved && requested > 0) {
                approved = Math.max(requested, previous.approved - rampDown);
                held = approved !== requested;
                decisionReason = held ? 'soft-ramp-down' : 'normal';
            }
        }
        if (hard)
            approved = requested;
        if (previous.approved <= 0 && approved > 0)
            previous.startedAt = now;
        if (previous.approved > 0 && approved <= 0) {
            previous.stoppedAt = now;
            // RC86_SOFT_PAUSE_ONLY_AFTER_ECONOMIC_STOP: technical start-probe
            // timeouts, unplugging and hard safety already have their own cooldown
            // and must not receive a second hidden 30-second pause.
            previous.stoppedSoftEconomic = !hard && soft;
        }
        if (approved > 0 || requested > 0)
            previous.zeroCandidateAt = requested <= 0 ? previous.zeroCandidateAt : 0;
        previous.approved = approved;
        previous.lastSeenAt = now;
        boundedMapSet(this.states, key, previous, 512);
        this.prune(now);
        return { approved, held, reason: decisionReason };
    }
    prune(now = Date.now()) {
        for (const [key, state] of this.states)
            if (now - state.lastSeenAt > 6 * 60 * 60 * 1000)
                this.states.delete(key);
        while (this.states.size > 512) {
            const oldest = this.states.keys().next().value;
            if (oldest === undefined)
                break;
            this.states.delete(oldest);
        }
    }
    clear() { this.states.clear(); }
}
exports.Rc85EvcsDecisionGuard = Rc85EvcsDecisionGuard;
function rc85GridEnvelope(input) {
    const hardLimitW = Math.max(0, Number(input.hardLimitW) || 0);
    const softLimitW = hardLimitW * 0.9;
    const reserveW = hardLimitW * 0.1;
    const signedNvpW = Number(input.signedNvpW) || 0;
    const current = Math.max(0, Number(input.currentControlledLoadW) || 0);
    const offlineReserveW = Math.max(0, Number(input.offlineReserveW) || 0);
    const pendingIncreaseW = Math.max(0, Number(input.pendingIncreaseW) || 0);
    const hardHeadroomRawW = hardLimitW - signedNvpW - offlineReserveW - pendingIncreaseW;
    const hardHeadroomW = Math.max(0, hardHeadroomRawW);
    const softHeadroomW = Math.max(0, softLimitW - signedNvpW - offlineReserveW - pendingIncreaseW);
    const span = Math.max(1, hardLimitW - softLimitW);
    const softRampFactor = hardLimitW <= 0
        ? 0
        : (signedNvpW <= softLimitW
            ? 1
            : Math.max(0, Math.min(1, (hardLimitW - signedNvpW) / span)));
    // RC85_SOFT_PROGRESSIVE: 90 % is the beginning of a progressive ramp
    // restriction, never an absolute 90-% load ceiling. Below the soft limit the
    // full headroom up to the hard NVP import limit is available. Inside the
    // soft band only positive increases are tapered. Above the hard limit the
    // signed negative correction remains intact and actively reduces running
    // controlled load.
    const progressiveIncrementW = hardHeadroomRawW <= 0
        ? hardHeadroomRawW
        : hardHeadroomRawW * softRampFactor;
    const maxControlledLoadW = Math.max(0, current + progressiveIncrementW);
    return {
        hardLimitW,
        softLimitW,
        reserveW,
        hardHeadroomW,
        hardHeadroomRawW,
        softHeadroomW,
        progressiveIncrementW,
        maxControlledLoadW,
        softRampFactor,
        predictedNvpAtMaximumW: signedNvpW + (maxControlledLoadW - current),
        offlineReserveW,
        pendingIncreaseW,
    };
}
/**
 * RC86: Ein konfiguriertes Netz-Gate ist nur dann "bindend", wenn es eine
 * reale EVCS-Anforderung tatsächlich reduziert. Ein endliches Hard-Headroom
 * bei 0 W Nachfrage ist reine Überwachung und darf weder GRID-IMPORT-LIMIT noch
 * einen globalen Safety-Status auslösen.
 */
function rc86GridBinding(input) {
    let requestedBeforeGridW = Math.max(0, Number(input.requestedW) || 0);
    const hasPhaseCap = input.phaseCapW !== null && input.phaseCapW !== undefined;
    const phaseCapW = hasPhaseCap ? Number(input.phaseCapW) : Number.NaN;
    if (Number.isFinite(phaseCapW) && phaseCapW >= 0) {
        requestedBeforeGridW = Math.min(requestedBeforeGridW, phaseCapW);
    }
    const hasPara14aCap = input.para14aCapW !== null && input.para14aCapW !== undefined;
    const para14aCapW = hasPara14aCap ? Number(input.para14aCapW) : Number.NaN;
    if (Number.isFinite(para14aCapW) && para14aCapW >= 0) {
        requestedBeforeGridW = Math.min(requestedBeforeGridW, para14aCapW);
    }
    const rawGridCapW = Number(input.gridCapW);
    if (!Number.isFinite(rawGridCapW)) {
        return {
            binding: false,
            requestedBeforeGridW,
            allowedW: requestedBeforeGridW,
            reductionW: 0,
            quantizationToleranceW: 0,
            finalPlanTouchesGridEdge: false,
        };
    }
    const gridCapW = Math.max(0, rawGridCapW);
    const allowedW = Math.min(requestedBeforeGridW, gridCapW);
    const candidateReductionW = Math.max(0, requestedBeforeGridW - allowedW);
    const activePoints = Math.max(0, Math.round(Number(input.activePoints) || 0));
    const quantizationToleranceW = Math.max(100, Math.min(4000, activePoints * 800));
    const finalTargetW = Math.max(0, Number(input.finalTargetW) || 0);
    const finalPlanTouchesGridEdge = allowedW <= 0
        ? finalTargetW <= quantizationToleranceW
        : finalTargetW + quantizationToleranceW >= allowedW;
    const binding = candidateReductionW > 50 && finalPlanTouchesGridEdge;
    return {
        binding,
        requestedBeforeGridW,
        allowedW,
        reductionW: binding ? candidateReductionW : 0,
        quantizationToleranceW,
        finalPlanTouchesGridEdge,
    };
}
function rc85OfflineReserveW(points) {
    let total = 0;
    for (const point of points ?? []) {
        const status = String(point?.status ?? point?.availability ?? '').toLowerCase();
        if (!/(?:offline|unavailable|stale|fault|error)/.test(status))
            continue;
        const actual = Math.max(0, Number(point?.actualW ?? point?.lastActualW ?? point?.powerW) || 0);
        const vehicle = Boolean(point?.vehicleConnected ?? point?.connected ?? point?.plugged);
        const fallback = vehicle ? Math.max(0, Number(point?.minPowerW ?? point?.minimumW) || 4140) : 0;
        total += actual > 0 ? actual : fallback;
    }
    return total;
}
let heapTimer;
let heapRestartTimer;
let heapMonitorLog = console;
let heapMonitorOptions = {};
let criticalHeapSamples = 0;
let heapRestartScheduled = false;
let lastHeapWarnAt = 0;
let lastPressureActionAt = 0;
const heapSamples = [];
function clampRatio(value, fallback, min, max) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}
/**
 * Classifies one heap sample without side effects.
 *
 * A rapid ten-minute increase remains useful telemetry, but is deliberately not
 * a pressure signal on its own. V8 may grow a young process, caches and compiled
 * code quickly while the absolute heap ratio is still low. Treating that normal
 * warm-up as pressure used to close healthy SSE clients and made the overview
 * appear stale although the adapter and EMS loop were running normally.
 */
function rc88ClassifyHeapPressure(input) {
    const ratio = Math.max(0, Number(input.ratio) || 0);
    const growthBytes = Number(input.growthBytes) || 0;
    const warnRatio = clampRatio(input.warnRatio, 0.65, 0.4, 0.9);
    const pressureRatio = clampRatio(input.pressureRatio, 0.75, warnRatio, 0.92);
    const restartRatio = clampRatio(input.restartRatio, 0.86, pressureRatio, 0.95);
    const emergencyRatio = clampRatio(input.emergencyRatio, 0.92, restartRatio, 0.98);
    return {
        ratio,
        growthBytes,
        fastGrowth: growthBytes >= 128 * 1048576,
        warn: ratio >= warnRatio,
        pressure: ratio >= pressureRatio,
        restart: ratio >= restartRatio,
        emergency: ratio >= emergencyRatio,
    };
}
function safeDiagnosticsJson() {
    try {
        const diagnostics = heapMonitorOptions.getDiagnostics?.();
        const json = JSON.stringify(diagnostics ?? {});
        return json.length > 4000 ? `${json.slice(0, 4000)}…` : json;
    }
    catch (error) {
        return JSON.stringify({ diagnosticsError: error instanceof Error ? error.message : String(error) });
    }
}
function scheduleControlledRestart(sample, reason) {
    if (heapRestartScheduled)
        return;
    heapRestartScheduled = true;
    try {
        heapMonitorOptions.onBeforeRestart?.(sample);
    }
    catch (_error) { }
    heapMonitorLog.error?.(`[memory-guard] ${reason}; controlled adapter restart requested before V8 OOM. `
        + `heap=${(sample.heapUsed / 1048576).toFixed(0)}/${(sample.heapLimit / 1048576).toFixed(0)} MiB `
        + `rss=${(sample.rss / 1048576).toFixed(0)} MiB diagnostics=${safeDiagnosticsJson()}`);
    heapRestartTimer = setTimeout(() => process.exit(11), 1500);
    heapRestartTimer.unref?.();
}
function runHeapMonitorSample() {
    const now = Date.now();
    const memory = process.memoryUsage();
    const heapLimit = (0, node_v8_1.getHeapStatistics)().heap_size_limit;
    const ratio = heapLimit > 0 ? memory.heapUsed / heapLimit : 0;
    const comparison = heapSamples.find((sample) => now - sample.ts <= 10 * 60000) ?? heapSamples[0];
    const growthBytes = comparison ? memory.heapUsed - comparison.heapUsed : 0;
    const sample = {
        ts: now,
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        heapLimit,
        rss: memory.rss,
        external: memory.external,
        arrayBuffers: memory.arrayBuffers ?? 0,
        ratio,
        growthBytes,
    };
    heapSamples.push(sample);
    while (heapSamples.length > 24)
        heapSamples.shift();
    const warnRatio = clampRatio(heapMonitorOptions.warnRatio, 0.65, 0.4, 0.9);
    const pressureRatio = clampRatio(heapMonitorOptions.pressureRatio, 0.75, warnRatio, 0.92);
    const restartRatio = clampRatio(heapMonitorOptions.restartRatio, 0.86, pressureRatio, 0.95);
    const emergencyRatio = clampRatio(heapMonitorOptions.emergencyRatio, 0.92, restartRatio, 0.98);
    const sustainedSamples = Math.max(1, Math.min(5, Math.round(Number(heapMonitorOptions.sustainedSamples) || 2)));
    const classification = rc88ClassifyHeapPressure({
        ratio,
        growthBytes,
        warnRatio,
        pressureRatio,
        restartRatio,
        emergencyRatio,
    });
    if (classification.warn && now - lastHeapWarnAt >= 5 * 60000) {
        lastHeapWarnAt = now;
        heapMonitorLog.warn?.(`[memory-guard] ${(memory.heapUsed / 1048576).toFixed(0)} MiB / ${(heapLimit / 1048576).toFixed(0)} MiB `
            + `(${(ratio * 100).toFixed(1)}%), rss ${(memory.rss / 1048576).toFixed(0)} MiB, `
            + `10-min growth ${(growthBytes / 1048576).toFixed(0)} MiB; diagnostics=${safeDiagnosticsJson()}`);
    }
    if (classification.pressure && now - lastPressureActionAt >= 30000) {
        lastPressureActionAt = now;
        try {
            heapMonitorOptions.onPressure?.(sample);
        }
        catch (error) {
            heapMonitorLog.warn?.(`[memory-guard] pressure mitigation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    criticalHeapSamples = classification.restart ? criticalHeapSamples + 1 : 0;
    if (classification.emergency) {
        scheduleControlledRestart(sample, `emergency heap pressure ${(ratio * 100).toFixed(1)}%`);
    }
    else if (criticalHeapSamples >= sustainedSamples) {
        scheduleControlledRestart(sample, `sustained heap pressure ${(ratio * 100).toFixed(1)}% for ${criticalHeapSamples} samples`);
    }
}
function startRc85HeapMonitor(log = console, options = {}) {
    heapMonitorLog = log || console;
    heapMonitorOptions = { ...heapMonitorOptions, ...options };
    if (!heapTimer) {
        const intervalMs = Math.max(10000, Math.min(120000, Number(heapMonitorOptions.intervalMs) || 30000));
        heapTimer = setInterval(runHeapMonitorSample, intervalMs);
        heapTimer.unref?.();
    }
    return stopRc85HeapMonitor;
}
function stopRc85HeapMonitor() {
    if (heapTimer)
        clearInterval(heapTimer);
    if (heapRestartTimer)
        clearTimeout(heapRestartTimer);
    heapTimer = undefined;
    heapRestartTimer = undefined;
    criticalHeapSamples = 0;
    heapRestartScheduled = false;
    lastHeapWarnAt = 0;
    lastPressureActionAt = 0;
    heapSamples.length = 0;
    heapMonitorOptions = {};
    heapMonitorLog = console;
}
