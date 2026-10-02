// @runtime-transpile
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Kapselt Laufzeitgrenzen, Fehlerisolation und Schutzmechanismen für Regelmodule und Speicherverbrauch.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/rc85-runtime-hardening.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/* RC85: shared stability and charging-control hardening. */
import { getHeapStatistics } from 'node:v8';

export type Rc85Log = { debug?: (msg: string) => void; info?: (msg: string) => void; warn?: (msg: string) => void; error?: (msg: string) => void };

type Rc88Work<T> = ((signal: AbortSignal) => Promise<T> | T) | (() => Promise<T> | T);
interface Rc88InFlightEntry {
    startedAt: number;
    token: symbol;
    controller: AbortController;
    timeoutAt: number;
    timedOutAt: number;
}

const inFlight = new Map<string, Rc88InFlightEntry>();
const timeoutLogAt = new Map<string, number>();
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

export interface Rc85IsolatedResult<T> {
    ok: boolean;
    value?: T;
    error?: Error;
    timedOut: boolean;
    skipped: boolean;
    durationMs: number;
}

export interface Rc88RuntimeHardeningSnapshot {
    active: number;
    oldestActiveAgeMs: number;
    labels: string[];
    started: number;
    completed: number;
    failed: number;
    timedOut: number;
    skippedInFlight: number;
    rejectedAtCapacity: number;
    activeMax: number;
    lateSettled: number;
    lastTimeoutLabel: string;
    lastTimeoutAt: number;
}

function boundedMapSet<K, V>(map: Map<K, V>, key: K, value: V, max = 512): void {
    map.set(key, value);
    while (map.size > max) {
        const oldest = map.keys().next().value as K | undefined;
        if (oldest === undefined) break;
        map.delete(oldest);
    }
}

function logWatchdogOnce(label: string, message: string, log: Rc85Log, now = Date.now()): void {
    const last = timeoutLogAt.get(label) ?? 0;
    if (now - last < 60_000) return;
    boundedMapSet(timeoutLogAt, label, now, 512);
    log.warn?.(`[RC88 watchdog] ${label}: ${message}`);
}

export function rc88RuntimeHardeningSnapshot(now = Date.now()): Rc88RuntimeHardeningSnapshot {
    let oldestStartedAt = now;
    const labels: string[] = [];
    for (const [label, entry] of inFlight) {
        labels.push(label);
        if (entry.startedAt < oldestStartedAt) oldestStartedAt = entry.startedAt;
    }
    return {
        active: inFlight.size,
        oldestActiveAgeMs: inFlight.size ? Math.max(0, now - oldestStartedAt) : 0,
        labels: labels.slice(0, 32),
        ...hardeningStats,
    };
}

export function rc88ClearRuntimeHardening(): void {
    for (const entry of inFlight.values()) {
        try { entry.controller.abort(new Error('RC88_ADAPTER_UNLOAD')); } catch (_error) {}
    }
    inFlight.clear();
    timeoutLogAt.clear();
}

export async function rc85RunIsolatedResult<T>(
    label: string,
    timeoutMs: number,
    work: Rc88Work<T>,
    log: Rc85Log = console,
): Promise<Rc85IsolatedResult<T>> {
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

    const safeTimeoutMs = Math.max(100, Math.min(120_000, Number(timeoutMs) || 10_000));
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    let entry: Rc88InFlightEntry;
    const token = Symbol(normalizedLabel);
    const task = Promise.resolve().then(() => (work as (signal: AbortSignal) => Promise<T> | T)(controller.signal));
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
    void task.then(
        () => { if (entry.timedOutAt > 0) hardeningStats.lateSettled += 1; },
        () => { if (entry.timedOutAt > 0) hardeningStats.lateSettled += 1; },
    ).finally(() => {
        const current = inFlight.get(normalizedLabel);
        if (current?.token === token) inFlight.delete(normalizedLabel);
    }).catch(() => undefined);
    hardeningStats.started += 1;
    hardeningStats.activeMax = Math.max(hardeningStats.activeMax, inFlight.size);

    try {
        const timeout = new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
                timedOut = true;
                entry.timedOutAt = Date.now();
                hardeningStats.timedOut += 1;
                hardeningStats.lastTimeoutLabel = normalizedLabel;
                hardeningStats.lastTimeoutAt = entry.timedOutAt;
                try { controller.abort(new Error(`RC88_TIMEOUT:${normalizedLabel}:${safeTimeoutMs}ms`)); } catch (_error) {}
                reject(new Error(`RC88_TIMEOUT:${normalizedLabel}:${safeTimeoutMs}ms`));
            }, safeTimeoutMs);
            (timer as any).unref?.();
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
    } catch (error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        if (!timedOut) hardeningStats.failed += 1;
        logWatchdogOnce(normalizedLabel, normalizedError.message, log, now);
        return {
            ok: false,
            error: normalizedError,
            timedOut: timedOut || normalizedError.message.startsWith('RC88_TIMEOUT:'),
            skipped: false,
            durationMs: Math.max(0, Date.now() - now),
        };
    } finally {
        if (timer) clearTimeout(timer);
    }
}

export async function rc85RunIsolated<T>(
    label: string,
    timeoutMs: number,
    work: Rc88Work<T>,
    log: Rc85Log = console,
): Promise<T | undefined> {
    const result = await rc85RunIsolatedResult(label, timeoutMs, work, log);
    return result.ok ? result.value : undefined;
}

export function rc85IsHardReason(reasonValue: unknown): boolean {
    const reason = String(reasonValue ?? '').toLowerCase();
    return /(?:grid[-_ ]?hard|hard[-_ ]?limit|safety[-_ ]?stop|safe[-_ ]?zero|§?14a|emergency|not[-_ ]?aus|fuse|sicherung|phase|cable|leitung|overload|nvp.*(?:invalid|stale|offline)|central.*(?:fault|error)|writer[-_ ]?error|device[-_ ]?safety|rfid[-_ ]?stop|manual[-_ ]?stop|unplug|finished|finish)/i.test(reason);
}

export function rc85IsSoftEconomicReason(reasonValue: unknown): boolean {
    const reason = String(reasonValue ?? '').toLowerCase();
    return /(?:tarif|tariff|price|strompreis|economic|neutral|teuer|günstig|guenstig|forecast|prognose|pv|grid[-_ ]?soft|soft[-_ ]?limit|budget|redistribut|allocation|auto|storage|speicher)/i.test(reason);
}

export interface Rc85DecisionInput {
    key: string;
    requested: number;
    reason?: unknown;
    unit?: 'W' | 'A';
    nowMs?: number;
    hardSafety?: boolean;
    priceUpdatePending?: boolean;
    minActive?: number;
    minRunMs?: number;
    minPauseMs?: number;
    economicDebounceMs?: number;
    rampUpPerStep?: number;
    rampDownPerStep?: number;
}
export interface Rc85DecisionResult { approved: number; held: boolean; reason: string; }
interface GuardState {
    approved: number;
    startedAt: number;
    stoppedAt: number;
    stoppedSoftEconomic: boolean;
    zeroCandidateAt: number;
    lastSeenAt: number;
}

export class Rc85EvcsDecisionGuard {
    private readonly states = new Map<string, GuardState>();
    evaluate(input: Rc85DecisionInput): Rc85DecisionResult {
        const now = Number.isFinite(input.nowMs) ? Number(input.nowMs) : Date.now();
        const key = input.key || 'unknown';
        const requested = Math.max(0, Number.isFinite(input.requested) ? Number(input.requested) : 0);
        const unit = input.unit === 'A' ? 'A' : 'W';
        const minActive = Math.max(0, input.minActive ?? (unit === 'A' ? 6 : 4_140));
        const minRunMs = Math.max(0, input.minRunMs ?? 120_000);
        const minPauseMs = Math.max(0, input.minPauseMs ?? 30_000);
        const debounceMs = Math.max(0, input.economicDebounceMs ?? 25_000);
        const rampUp = Math.max(0.1, input.rampUpPerStep ?? (unit === 'A' ? 1 : 2_300));
        const rampDown = Math.max(0.1, input.rampDownPerStep ?? (unit === 'A' ? 2 : 4_600));
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
                } else if (previous.approved > minActive) {
                    approved = Math.max(minActive, previous.approved - rampDown);
                    held = true;
                    decisionReason = 'soft-ramp-down';
                } else {
                    approved = 0;
                    decisionReason = 'stable-economic-stop';
                }
            } else if (requested > 0
                && previous.approved <= 0
                && previous.stoppedSoftEconomic === true
                && previous.stoppedAt > 0
                && now - previous.stoppedAt < minPauseMs) {
                approved = 0;
                held = true;
                decisionReason = 'minimum-pause-hold';
            } else if (requested > previous.approved) {
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
            } else if (requested < previous.approved && requested > 0) {
                approved = Math.max(requested, previous.approved - rampDown);
                held = approved !== requested;
                decisionReason = held ? 'soft-ramp-down' : 'normal';
            }
        }

        if (hard) approved = requested;
        if (previous.approved <= 0 && approved > 0) previous.startedAt = now;
        if (previous.approved > 0 && approved <= 0) {
            previous.stoppedAt = now;
            // RC86_SOFT_PAUSE_ONLY_AFTER_ECONOMIC_STOP: technical start-probe
            // timeouts, unplugging and hard safety already have their own cooldown
            // and must not receive a second hidden 30-second pause.
            previous.stoppedSoftEconomic = !hard && soft;
        }
        if (approved > 0 || requested > 0) previous.zeroCandidateAt = requested <= 0 ? previous.zeroCandidateAt : 0;
        previous.approved = approved;
        previous.lastSeenAt = now;
        boundedMapSet(this.states, key, previous, 512);
        this.prune(now);
        return { approved, held, reason: decisionReason };
    }
    prune(now = Date.now()): void {
        for (const [key, state] of this.states) if (now - state.lastSeenAt > 6 * 60 * 60 * 1000) this.states.delete(key);
        while (this.states.size > 512) {
            const oldest = this.states.keys().next().value as string | undefined;
            if (oldest === undefined) break;
            this.states.delete(oldest);
        }
    }
    clear(): void { this.states.clear(); }
}

export interface Rc85GridEnvelopeInput {
    hardLimitW: number;
    signedNvpW: number;
    currentControlledLoadW?: number;
    offlineReserveW?: number;
    pendingIncreaseW?: number;
}
export interface Rc85GridEnvelope {
    hardLimitW: number; softLimitW: number; reserveW: number;
    hardHeadroomW: number; hardHeadroomRawW: number; softHeadroomW: number;
    progressiveIncrementW: number; maxControlledLoadW: number;
    softRampFactor: number; predictedNvpAtMaximumW: number;
    offlineReserveW: number; pendingIncreaseW: number;
}
export function rc85GridEnvelope(input: Rc85GridEnvelopeInput): Rc85GridEnvelope {
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


export interface Rc86GridBindingInput {
    requestedW: number;
    gridCapW: number | null | undefined;
    finalTargetW: number;
    activePoints?: number;
    phaseCapW?: number | null;
    para14aCapW?: number | null;
}

export interface Rc86GridBindingResult {
    binding: boolean;
    requestedBeforeGridW: number;
    allowedW: number;
    reductionW: number;
    quantizationToleranceW: number;
    finalPlanTouchesGridEdge: boolean;
}

/**
 * RC86: Ein konfiguriertes Netz-Gate ist nur dann "bindend", wenn es eine
 * reale EVCS-Anforderung tatsächlich reduziert. Ein endliches Hard-Headroom
 * bei 0 W Nachfrage ist reine Überwachung und darf weder GRID-IMPORT-LIMIT noch
 * einen globalen Safety-Status auslösen.
 */
export function rc86GridBinding(input: Rc86GridBindingInput): Rc86GridBindingResult {
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
    const quantizationToleranceW = Math.max(100, Math.min(4_000, activePoints * 800));
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

export function rc85OfflineReserveW(points: readonly any[]): number {
    let total = 0;
    for (const point of points ?? []) {
        const status = String(point?.status ?? point?.availability ?? '').toLowerCase();
        if (!/(?:offline|unavailable|stale|fault|error)/.test(status)) continue;
        const actual = Math.max(0, Number(point?.actualW ?? point?.lastActualW ?? point?.powerW) || 0);
        const vehicle = Boolean(point?.vehicleConnected ?? point?.connected ?? point?.plugged);
        const fallback = vehicle ? Math.max(0, Number(point?.minPowerW ?? point?.minimumW) || 4_140) : 0;
        total += actual > 0 ? actual : fallback;
    }
    return total;
}

export interface RC88HeapSample {
    ts: number;
    heapUsed: number;
    heapTotal: number;
    heapLimit: number;
    rss: number;
    external: number;
    arrayBuffers: number;
    ratio: number;
    growthBytes: number;
}

export interface RC88HeapMonitorOptions {
    intervalMs?: number;
    warnRatio?: number;
    pressureRatio?: number;
    restartRatio?: number;
    emergencyRatio?: number;
    sustainedSamples?: number;
    getDiagnostics?: () => unknown;
    onPressure?: (sample: RC88HeapSample) => unknown;
    onBeforeRestart?: (sample: RC88HeapSample) => unknown;
}

let heapTimer: ReturnType<typeof setInterval> | undefined;
let heapRestartTimer: ReturnType<typeof setTimeout> | undefined;
let heapMonitorLog: Rc85Log = console;
let heapMonitorOptions: RC88HeapMonitorOptions = {};
let criticalHeapSamples = 0;
let heapRestartScheduled = false;
let lastHeapWarnAt = 0;
let lastPressureActionAt = 0;
const heapSamples: RC88HeapSample[] = [];

function clampRatio(value: unknown, fallback: number, min: number, max: number): number {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

export interface RC88HeapPressureClassification {
    ratio: number;
    growthBytes: number;
    fastGrowth: boolean;
    warn: boolean;
    pressure: boolean;
    restart: boolean;
    emergency: boolean;
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
export function rc88ClassifyHeapPressure(input: {
    ratio: unknown;
    growthBytes: unknown;
    warnRatio: unknown;
    pressureRatio: unknown;
    restartRatio: unknown;
    emergencyRatio: unknown;
}): RC88HeapPressureClassification {
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

function safeDiagnosticsJson(): string {
    try {
        const diagnostics = heapMonitorOptions.getDiagnostics?.();
        const json = JSON.stringify(diagnostics ?? {});
        return json.length > 4_000 ? `${json.slice(0, 4_000)}…` : json;
    } catch (error) {
        return JSON.stringify({ diagnosticsError: error instanceof Error ? error.message : String(error) });
    }
}

function scheduleControlledRestart(sample: RC88HeapSample, reason: string): void {
    if (heapRestartScheduled) return;
    heapRestartScheduled = true;
    try { heapMonitorOptions.onBeforeRestart?.(sample); } catch (_error) {}
    heapMonitorLog.error?.(
        `[memory-guard] ${reason}; controlled adapter restart requested before V8 OOM. `
        + `heap=${(sample.heapUsed / 1048576).toFixed(0)}/${(sample.heapLimit / 1048576).toFixed(0)} MiB `
        + `rss=${(sample.rss / 1048576).toFixed(0)} MiB diagnostics=${safeDiagnosticsJson()}`,
    );
    heapRestartTimer = setTimeout(() => process.exit(11), 1500);
    (heapRestartTimer as any).unref?.();
}

function runHeapMonitorSample(): void {
    const now = Date.now();
    const memory = process.memoryUsage();
    const heapLimit = getHeapStatistics().heap_size_limit;
    const ratio = heapLimit > 0 ? memory.heapUsed / heapLimit : 0;
    const comparison = heapSamples.find((sample) => now - sample.ts <= 10 * 60_000) ?? heapSamples[0];
    const growthBytes = comparison ? memory.heapUsed - comparison.heapUsed : 0;
    const sample: RC88HeapSample = {
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
    while (heapSamples.length > 24) heapSamples.shift();

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

    if (classification.warn && now - lastHeapWarnAt >= 5 * 60_000) {
        lastHeapWarnAt = now;
        heapMonitorLog.warn?.(
            `[memory-guard] ${(memory.heapUsed / 1048576).toFixed(0)} MiB / ${(heapLimit / 1048576).toFixed(0)} MiB `
            + `(${(ratio * 100).toFixed(1)}%), rss ${(memory.rss / 1048576).toFixed(0)} MiB, `
            + `10-min growth ${(growthBytes / 1048576).toFixed(0)} MiB; diagnostics=${safeDiagnosticsJson()}`,
        );
    }

    if (classification.pressure && now - lastPressureActionAt >= 30_000) {
        lastPressureActionAt = now;
        try { heapMonitorOptions.onPressure?.(sample); } catch (error) {
            heapMonitorLog.warn?.(`[memory-guard] pressure mitigation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    criticalHeapSamples = classification.restart ? criticalHeapSamples + 1 : 0;
    if (classification.emergency) {
        scheduleControlledRestart(sample, `emergency heap pressure ${(ratio * 100).toFixed(1)}%`);
    } else if (criticalHeapSamples >= sustainedSamples) {
        scheduleControlledRestart(sample, `sustained heap pressure ${(ratio * 100).toFixed(1)}% for ${criticalHeapSamples} samples`);
    }
}

export function startRc85HeapMonitor(log: Rc85Log = console, options: RC88HeapMonitorOptions = {}): () => void {
    heapMonitorLog = log || console;
    heapMonitorOptions = { ...heapMonitorOptions, ...options };
    if (!heapTimer) {
        const intervalMs = Math.max(10_000, Math.min(120_000, Number(heapMonitorOptions.intervalMs) || 30_000));
        heapTimer = setInterval(runHeapMonitorSample, intervalMs);
        (heapTimer as any).unref?.();
    }
    return stopRc85HeapMonitor;
}

export function stopRc85HeapMonitor(): void {
    if (heapTimer) clearInterval(heapTimer);
    if (heapRestartTimer) clearTimeout(heapRestartTimer);
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
