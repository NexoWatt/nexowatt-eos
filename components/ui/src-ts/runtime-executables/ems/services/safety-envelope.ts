// @runtime-transpile
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Prüft Leistungsanforderungen an der gemeinsamen Sicherheitsgrenze und dokumentiert die tatsächlich freigegebene Anforderung.
 * Daten und Wirkung: Erhält Verbraucheranforderung und gemeinsamen Netzzustand; begrenzt die Anforderung vor dem Schreibpfad und hält Freigabe/Diagnose fest.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/safety-envelope.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';

/**
 * Zentrale, fail-closed Sicherheitsfreigabe fuer alle flexiblen Verbraucher.
 *
 * Sicherheitsvertrag:
 * - Jeder produktive EMS-Zyklus beginnt mit einem ungueltigen Envelope.
 * - Core-Limits darf ihn erst nach gueltiger Inbetriebnahme, frischem NVP,
 *   vollstaendigen Phasenwerten (wenn Phasenlimit aktiv) und gesundem §14a
 *   freigeben.
 * - Jeder finale Hardware-Writer prueft denselben Envelope unmittelbar vor dem
 *   Schreiben erneut. Ein alter Plan kann dadurch keine aktuelle Grenze umgehen.
 * - 0 W / AUS bleibt auch bei ungueltigem Envelope immer schreibbar.
 */

const { resolveCurrentNvpSnapshot } = require('./measurement-freshness');

const SCHEMA_VERSION = 1;
const DEFAULT_NVP_STALE_MS = 30000;
const DEFAULT_ENVELOPE_MAX_AGE_MS = 5000;
const DEFAULT_VOLTAGE_V = 230;


type AnyRecord = Record<string, any>;

type SafetyConfig = {
    staleMs: number;
    envelopeMaxAgeMs: number;
    gridPhaseCount: number;
    voltageV: number;
    para14aEnabled: boolean;
    diagnosticsOnly: boolean;
};

type SafetyCycle = {
    generation: number;
    startedAt: number;
    moduleHealth: Record<string, AnyRecord>;
    errors: string[];
    safetyFaults: string[];
};

type InvalidateOptions = {
    now?: number;
    generation?: number | string;
    latch?: boolean;
    emergencyStop?: boolean;
};

type BuildSafetyEnvelopeOptions = {
    adapter?: AnyRecord | null | undefined;
    dp?: AnyRecord | null | undefined;
    coreSnapshot?: AnyRecord | null | undefined;
    budgetSnapshot?: AnyRecord | null | undefined;
    now?: number;
    generation?: number | string;
};

type PhaseSample = {
    mapped: boolean;
    fresh: boolean;
    valueA: number | null;
    ageMs: number | null;
    connected: boolean | null;
    reason: string;
};

type SafetyRuntime = {
    generation: number;
    targetsByKey: Record<string, number>;
    deltasByKey: Record<string, number>;
    phaseDeltasByKey: Record<string, number>;
    appByKey: Record<string, string>;
    decisions: AnyRecord[];
};

type FlexibleLoadRequest = {
    now?: number;
    requestedW?: unknown;
    currentActualFresh?: boolean;
    currentActualW?: unknown;
    key?: unknown;
    app?: unknown;
    voltageV?: unknown;
    phaseCount?: unknown;
    deviceKey?: unknown;
    deviceCapW?: unknown;
    [key: string]: unknown;
};

type SafetyCommandRequest = {
    now?: number;
    requestedActive?: boolean;
    key?: unknown;
    app?: unknown;
    [key: string]: unknown;
};

type SafetyDecision = AnyRecord & {
    ok: boolean;
    bypassed: boolean;
    blocked: boolean;
    forceZero: boolean;
    key: string;
    app: string;
    reason: string;
    envelopeGeneration: number;
    evaluatedAt: number;
    allowedW?: number;
    reservation?: AnyRecord | null;
};

type TargetOptions = {
    phaseCount?: unknown;
    voltageV?: unknown;
};

function strictFiniteNumber(value: unknown, fallback: number): number;
function strictFiniteNumber(value: unknown, fallback?: null): number | null;
function strictFiniteNumber(value: unknown, fallback: number | null = null): number | null {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string' && !value.trim()) return fallback;
    if (typeof value === 'boolean') return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function nonNegative(value: unknown, fallback = 0): number {
    const parsed = strictFiniteNumber(value, null);
    return parsed === null ? fallback : Math.max(0, parsed);
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
    const parsed = strictFiniteNumber(value, null);
    if (parsed === null) return fallback;
    return Math.min(max, Math.max(min, parsed));
}

function boolValue(value: unknown, fallback = false): boolean {
    if (value === true || value === 1 || value === '1' || value === 'true') return true;
    if (value === false || value === 0 || value === '0' || value === 'false') return false;
    return fallback;
}

function resolveSafetyConfig(adapter: AnyRecord): SafetyConfig {
    const cfg = adapter && adapter.config && typeof adapter.config === 'object' ? adapter.config : {};
    const cm = cfg.chargingManagement && typeof cfg.chargingManagement === 'object' ? cfg.chargingManagement : {};
    const installer = cfg.installerConfig && typeof cfg.installerConfig === 'object' ? cfg.installerConfig : {};
    const peak = cfg.peakShaving && typeof cfg.peakShaving === 'object' ? cfg.peakShaving : {};
    const safety = cfg.safety && typeof cfg.safety === 'object' ? cfg.safety : {};
    // Der bisherige EVCS-Diagnosewert `staleTimeoutSec` kann in Bestandsanlagen
    // 300 s betragen. Er darf die harte Anschluss-Sicherheitskette nicht auf fünf
    // Minuten aufweichen. Dafür gibt es einen eigenen, konservativen Timeout.
    const staleTimeoutSec = clamp(
        installer.safetyMeterTimeoutSec
        ?? cm.safetyMeterTimeoutSec
        ?? safety.meterTimeoutSec,
        5,
        120,
        30,
    );
    const envelopeMaxAgeSec = clamp(cm.safetyEnvelopeMaxAgeSec, 1, 30, 5);
    const gridPhaseCount = Math.max(1, Math.min(3, Math.round(strictFiniteNumber(
        installer.gridPhaseCount
        ?? installer.gridConnectionPhaseCount
        ?? installer.gridConnectionPhases
        ?? peak.phaseCount
        ?? 3,
        3,
    ))));
    return {
        staleMs: Math.round(staleTimeoutSec * 1000),
        envelopeMaxAgeMs: Math.round(envelopeMaxAgeSec * 1000),
        gridPhaseCount,
        voltageV: clamp(cm.nominalVoltageV, 200, 260, DEFAULT_VOLTAGE_V),
        para14aEnabled: installer.para14a === true,
        diagnosticsOnly: cm.safetyDiagnosticsOnly === true || cm.simulationMode === true,
    };
}

function emptyEnvelope(generation: unknown, now: number, reason: unknown = 'cycle-not-authorized'): AnyRecord {
    return {
        schemaVersion: SCHEMA_VERSION,
        generation: Math.max(0, Math.round(Number(generation) || 0)),
        timestamp: now,
        expiresAt: now,
        valid: false,
        commissioned: false,
        emergencyStop: true,
        forceZero: true,
        status: 'BLOCKED_NOT_COMMISSIONED',
        invalidReason: String(reason || 'cycle-not-authorized'),
        invalidReasons: [String(reason || 'cycle-not-authorized')],
        grid: {
            connectionPowerW: null,
            safetyMarginW: 0,
            maxImportW: 0,
            nvpW: null,
            nvpUsable: false,
            nvpAgeMs: null,
            nvpStatus: 'missing',
            nvpSource: '',
            incrementHeadroomW: 0,
            availableHeadroomW: 0,
        },
        phase: {
            required: false,
            requiredCount: 0,
            valid: true,
            maxA: null,
            voltageV: DEFAULT_VOLTAGE_V,
            currentsA: {},
            headroomA: {},
            minHeadroomA: null,
        },
        para14a: {
            enabled: false,
            active: false,
            signalFresh: true,
            signalStatus: 'disabled',
            forceZero: false,
            totalCapW: null,
            appCapsW: {},
            deviceCapsW: {},
        },
        moduleHealth: {},
    };
}

function ensureCycle(adapter: AnyRecord, generation: unknown = 0, now = Date.now()): SafetyCycle {
    const requestedGeneration = Math.max(0, Math.round(Number(generation) || 0));
    const current = adapter._emsSafetyCycle && typeof adapter._emsSafetyCycle === 'object'
        ? adapter._emsSafetyCycle
        : null;
    if (current && Number(current.generation) === requestedGeneration) return current;
    adapter._emsSafetyCycle = {
        generation: requestedGeneration,
        startedAt: now,
        moduleHealth: {},
        errors: [],
        safetyFaults: [],
    };
    return adapter._emsSafetyCycle;
}

function beginSafetyCycle(adapter: AnyRecord | null | undefined, generation: unknown, now = Date.now()): AnyRecord | null {
    if (!adapter) return null;
    const cycle = ensureCycle(adapter, generation, now);
    adapter._nwSafetyEnvelopeRequired = true;
    adapter._emsSafetyReservations = {
        generation: cycle.generation,
        targetsByKey: {},
        deltasByKey: {},
        phaseDeltasByKey: {},
        appByKey: {},
        decisions: [],
    };
    const envelope = emptyEnvelope(cycle.generation, now, 'cycle-start-awaiting-core-limits');
    adapter._emsSafetyEnvelope = envelope;
    adapter._nwSafetyEnvelope = envelope;
    return envelope;
}

function markSafetyModuleStarted(adapter: AnyRecord | null | undefined, key: unknown, generation: unknown, now = Date.now()): void {
    if (!adapter) return;
    const cycle = ensureCycle(adapter, generation, now);
    cycle.moduleHealth[String(key || 'unknown')] = {
        ok: null,
        status: 'running',
        ts: now,
        error: '',
    };
}

function markSafetyModuleResult(adapter: AnyRecord | null | undefined, key: unknown, ok: unknown, error: unknown = '', generation?: unknown, now = Date.now()): void {
    if (!adapter) return;
    const cycle = ensureCycle(adapter, generation ?? adapter?._emsSafetyCycle?.generation ?? 0, now);
    const moduleKey = String(key || 'unknown');
    cycle.moduleHealth[moduleKey] = {
        ok: ok === true,
        status: ok === true ? 'ok' : 'error',
        ts: now,
        error: ok === true ? '' : String(error || 'module-error'),
    };
    if (ok !== true) {
        cycle.errors.push(`${moduleKey}:${String(error || 'module-error')}`);
        // Fehler in einer sicherheitsrelevanten Quelle sperren sofort alle positiven
        // Folgebefehle des laufenden Zyklus. 0-W-Stopps bleiben weiterhin erlaubt.
        if (['para14a', 'coreLimits', 'gridConstraints', 'peakShaving'].includes(moduleKey)) {
            invalidateSafetyEnvelope(adapter, `module-error:${moduleKey}:${String(error || 'unknown')}`, {
                generation: cycle.generation,
                now,
                emergencyStop: true,
            });
        }
    }
}

function invalidateSafetyEnvelope(adapter: AnyRecord | null | undefined, reason: unknown, options: InvalidateOptions = {}): AnyRecord | null {
    if (!adapter) return null;
    const now = Number(options.now) || Date.now();
    const generation = Math.max(0, Math.round(Number(options.generation ?? adapter?._emsSafetyCycle?.generation ?? 0) || 0));
    const previous = adapter._emsSafetyEnvelope && typeof adapter._emsSafetyEnvelope === 'object'
        ? adapter._emsSafetyEnvelope
        : emptyEnvelope(generation, now, reason);
    const text = String(reason || 'safety-invalid');
    const cycle = ensureCycle(adapter, generation, now);
    if (options.latch !== false) {
        if (!Array.isArray(cycle.safetyFaults)) cycle.safetyFaults = [];
        if (!cycle.safetyFaults.includes(text)) cycle.safetyFaults.push(text);
    }
    const reasons = Array.isArray(previous.invalidReasons) ? previous.invalidReasons.slice() : [];
    if (!reasons.includes(text)) reasons.push(text);
    const envelope = {
        ...previous,
        generation,
        timestamp: now,
        expiresAt: now,
        valid: false,
        commissioned: previous.commissioned === true,
        emergencyStop: options.emergencyStop !== false,
        forceZero: true,
        status: previous.commissioned === true ? 'BLOCKED_SAFETY_FAULT' : 'BLOCKED_NOT_COMMISSIONED',
        invalidReason: text,
        invalidReasons: reasons,
    };
    adapter._emsSafetyEnvelope = envelope;
    adapter._nwSafetyEnvelope = envelope;
    return envelope;
}

function phaseAgeMs(dp: AnyRecord | null | undefined, key: string): number | null {
    if (!dp) return null;
    try {
        const age = typeof dp.getMeasurementAgeMs === 'function'
            ? dp.getMeasurementAgeMs(key)
            : (typeof dp.getAgeMs === 'function' ? dp.getAgeMs(key) : null);
        const parsed = strictFiniteNumber(age, null);
        return parsed === null ? null : Math.max(0, parsed);
    } catch (_e) {
        return null;
    }
}

function readPhase(dp: AnyRecord | null | undefined, key: string, staleMs: number): PhaseSample {
    if (!dp || typeof dp.getEntry !== 'function' || !dp.getEntry(key)) {
        return { mapped: false, fresh: false, valueA: null, ageMs: null, connected: null, reason: 'not-mapped' };
    }
    let raw = null;
    try { raw = typeof dp.getRaw === 'function' ? dp.getRaw(key, null) : null; } catch (_e) {}
    const valueA = strictFiniteNumber(raw, null);
    const ageMs = phaseAgeMs(dp, key);
    let connected = null;
    try {
        connected = typeof dp.getConnectionStatus === 'function' ? dp.getConnectionStatus(key) : null;
    } catch (_e) {}
    const fresh = valueA !== null && ageMs !== null && ageMs <= staleMs && connected !== false;
    return {
        mapped: true,
        fresh,
        valueA,
        ageMs,
        connected,
        reason: connected === false
            ? 'disconnected'
            : (valueA === null ? 'missing-value' : (ageMs === null ? 'missing-age' : (ageMs > staleMs ? 'stale' : 'fresh'))),
    };
}

function buildSafetyEnvelope({ adapter, dp, coreSnapshot, budgetSnapshot, now = Date.now(), generation }: BuildSafetyEnvelopeOptions = {}): AnyRecord | null {
    if (!adapter) return null;
    const safetyCfg = resolveSafetyConfig(adapter);
    const cycle = ensureCycle(adapter, generation ?? adapter?._emsSafetyCycle?.generation ?? 0, now);
    const cfg = adapter.config && typeof adapter.config === 'object' ? adapter.config : {};
    const installer = cfg.installerConfig && typeof cfg.installerConfig === 'object' ? cfg.installerConfig : {};
    const core = coreSnapshot && typeof coreSnapshot === 'object' ? coreSnapshot : {};
    const coreGrid = core.grid && typeof core.grid === 'object' ? core.grid : {};
    const p14aRuntime = adapter._para14a && typeof adapter._para14a === 'object' ? adapter._para14a : null;
    const reasons: string[] = [];
    for (const fault of (Array.isArray(cycle.safetyFaults) ? cycle.safetyFaults : [])) {
        const text = String(fault || '').trim();
        if (text && !reasons.includes(text)) reasons.push(text);
    }

    const criticalFault = adapter._nwSafetyCriticalFault && typeof adapter._nwSafetyCriticalFault === 'object'
        ? adapter._nwSafetyCriticalFault
        : null;
    if (criticalFault && Number(criticalFault.generation) === Number(cycle.generation)) {
        reasons.push(`critical-module-fault:${String(criticalFault.key || 'unknown')}`);
    }
    // Fehler sicherheitsrelevanter Module bleiben absichtlich über Zyklusgrenzen
    // verriegelt. Sonst könnte Core-Limits im Folgetick bereits freigeben, bevor
    // ein später laufender Writer seinen eigenen erfolgreichen Recovery-Tick
    // nachgewiesen hat.
    const persistentFaults = adapter._nwSafetyCriticalFaults && typeof adapter._nwSafetyCriticalFaults === 'object'
        ? adapter._nwSafetyCriticalFaults
        : {};
    for (const [key, fault] of Object.entries(persistentFaults)) {
        if (!fault) continue;
        reasons.push(`critical-module-fault-latched:${String(key || 'unknown')}`);
    }

    const connectionPowerW = strictFiniteNumber(installer.gridConnectionPower, null);
    if (connectionPowerW === null || connectionPowerW <= 0) reasons.push('grid-connection-power-missing');
    const safetyMarginW = nonNegative(coreGrid.gridSafetyMarginW, 0);
    const physicalLimitW = strictFiniteNumber(coreGrid.gridImportLimitW_physical, null);
    const effectiveLimitW = strictFiniteNumber(coreGrid.gridImportLimitW_effective, null);
    const derivedPhysicalW = connectionPowerW !== null && connectionPowerW > 0
        ? Math.max(0, connectionPowerW - safetyMarginW)
        : 0;
    const mesh = adapter?._meshCoordinator?.currentLimits();
    let maxImportW = effectiveLimitW !== null && effectiveLimitW > 0
        ? Math.min(effectiveLimitW, derivedPhysicalW > 0 ? derivedPhysicalW : effectiveLimitW)
        : (physicalLimitW !== null && physicalLimitW > 0
            ? Math.min(physicalLimitW, derivedPhysicalW > 0 ? derivedPhysicalW : physicalLimitW)
            : derivedPhysicalW);
    if (mesh?.required) maxImportW = Math.min(maxImportW, mesh.limits.importW);
    if (!(maxImportW > 0) && !mesh?.required) reasons.push('grid-import-limit-unavailable');

    const nvp = resolveCurrentNvpSnapshot(adapter._nvpFreshnessSnapshot, now, safetyCfg.staleMs);
    if (!nvp.current) reasons.push('nvp-snapshot-stale');
    if (!nvp.usable) reasons.push(`nvp-not-usable:${String(nvp.reason || nvp.status || 'unknown')}`);
    const nvpW = nvp.usable ? strictFiniteNumber(nvp.netW, null) : null;
    // RC78 / 0.8.203: Signierter NVP. Die Anschlussgrenze begrenzt nur Bezug;
    // Einspeisung (negativer NVP) ist lokale Deckung und erhöht die noch
    // mögliche Laständerung entsprechend. Ein positiver Überbezug bleibt als
    // negativer Inkrementwert sichtbar und wird im Final-Writer aktiv abgebaut.
    const gridIncrementHeadroomW = nvpW === null || !(maxImportW >= 0)
        ? 0
        : maxImportW - nvpW;
    const availableHeadroomW = nvpW === null || !(maxImportW >= 0)
        ? 0
        : Math.max(0, gridIncrementHeadroomW);

    const maxPhaseA = strictFiniteNumber(coreGrid.gridMaxPhaseA_cfg, null);
    const phaseRequired = !!mesh?.required || (maxPhaseA !== null && maxPhaseA > 0);
    const phaseKeys = ['ps.l1A', 'ps.l2A', 'ps.l3A'].slice(0, mesh?.required ? 3 : safetyCfg.gridPhaseCount);
    const currentsA: Record<string, number | null> = {};
    const headroomA: Record<string, number | null> = {};
    let minHeadroomA: number | null = null;
    let phaseValid = true;
    if (phaseRequired) {
        for (const key of phaseKeys) {
            const sample = readPhase(dp, key, safetyCfg.staleMs);
            const label = key.replace(/^ps\./, '').replace(/A$/i, '').toUpperCase();
            currentsA[label] = sample.valueA;
            // Signed headroom is intentional. If a phase is already above its
            // configured limit, the final writer must actively reduce an
            // existing flexible load instead of merely preventing a further
            // increase. A clamped value of 0 A would otherwise preserve the
            // overload indefinitely.
            const localPhaseCap = maxPhaseA !== null && maxPhaseA > 0 ? maxPhaseA : Infinity;
            const phaseCap = mesh?.required ? Math.min(localPhaseCap, mesh.limits[key.replace('ps.', '')]) : localPhaseCap;
            headroomA[label] = sample.valueA === null ? null : phaseCap - Math.abs(sample.valueA);
            if (!sample.mapped) reasons.push(`phase-${label.toLowerCase()}-not-mapped`);
            else if (!sample.fresh) reasons.push(`phase-${label.toLowerCase()}-${sample.reason}`);
            if (!sample.fresh) phaseValid = false;
            if (sample.fresh) {
                const value = headroomA[label];
                if (value !== null) minHeadroomA = minHeadroomA === null ? value : Math.min(minHeadroomA, value);
            }
        }
        if (!phaseValid || minHeadroomA === null) minHeadroomA = 0;
    }

    const paraEnabled = safetyCfg.para14aEnabled;
    const paraHealth = cycle.moduleHealth && cycle.moduleHealth.para14a;
    const paraFresh = paraEnabled ? !!(p14aRuntime && p14aRuntime.signalFresh === true && p14aRuntime.signalStale !== true) : true;
    const paraLocalFailsafe = !!(paraEnabled
        && p14aRuntime
        && p14aRuntime.localFailsafeActive === true
        && strictFiniteNumber(p14aRuntime.totalCapW, null) !== null);
    const paraFallbackSafe = !!(paraEnabled
        && p14aRuntime
        && p14aRuntime.fallbackSafe === true
        && (p14aRuntime.active !== true || (strictFiniteNumber(p14aRuntime.totalCapW, null) ?? 0) > 0));
    const paraSafetyReady = !paraEnabled || paraFresh || paraLocalFailsafe || paraFallbackSafe;
    const paraActive = !!(paraEnabled && p14aRuntime && p14aRuntime.active === true);
    const paraForceZero = !!(paraEnabled && (
        !paraSafetyReady
        || (p14aRuntime && (p14aRuntime.forceZero === true || p14aRuntime.emergencyStop === true))
        || (paraActive && strictFiniteNumber(p14aRuntime && p14aRuntime.totalCapW, null) === 0)
    ));
    if (paraEnabled && (!paraHealth || paraHealth.ok !== true)) reasons.push('para14a-module-not-healthy');
    if (paraEnabled && !p14aRuntime) reasons.push('para14a-runtime-missing');
    if (paraEnabled && !paraSafetyReady) reasons.push(`para14a-signal-not-fresh:${String(p14aRuntime && p14aRuntime.signalStatus || 'missing')}`);
    const paraTotalCapW = paraActive
        ? nonNegative(p14aRuntime && p14aRuntime.totalCapW, 0)
        : null;
    const paraAppCapsW = paraActive && p14aRuntime && p14aRuntime.appCapsW && typeof p14aRuntime.appCapsW === 'object'
        ? { ...p14aRuntime.appCapsW }
        : {};
    const paraDeviceCapsW = paraActive && p14aRuntime && p14aRuntime.evcsCapsBySafe && typeof p14aRuntime.evcsCapsBySafe === 'object'
        ? { ...p14aRuntime.evcsCapsBySafe }
        : {};
    const budgetGates = budgetSnapshot && budgetSnapshot.gates && typeof budgetSnapshot.gates === 'object'
        ? budgetSnapshot.gates
        : {};
    const pvGate = budgetGates.pv && typeof budgetGates.pv === 'object' ? budgetGates.pv : {};
    // §14a begrenzt nur den netzwirksamen Bezug der SteuVE. Das zentrale,
    // physikalisch validierte PV-Budget darf zusätzlich genutzt werden.
    const paraLocalPvGrantW = Math.max(0, strictFiniteNumber(pvGate.effectiveW, 0));

    const criticalHealth = cycle.moduleHealth || {};
    for (const key of ['gridConstraints', 'peakShaving']) {
        const health = criticalHealth[key];
        if (health && health.ok === false) reasons.push(`module-error:${key}`);
    }

    const commissionedReasons = reasons.filter((reason) => (
        reason.startsWith('grid-connection')
        || reason.startsWith('grid-import')
        || reason.startsWith('phase-')
        || reason === 'para14a-module-not-healthy'
        || reason === 'para14a-runtime-missing'
    ));
    const commissioned = commissionedReasons.length === 0;
    const forceZero = paraForceZero || reasons.length > 0;
    const valid = reasons.length === 0 && !paraForceZero;
    const status = valid
        ? 'READY'
        : (commissioned ? 'BLOCKED_SAFETY_FAULT' : 'BLOCKED_NOT_COMMISSIONED');
    const appCapsW = paraActive ? paraAppCapsW : {};
    const effectiveAppCap = (app: string): number => {
        const explicit = strictFiniteNumber(appCapsW[app], null);
        if (explicit !== null) return Math.max(0, explicit);
        return valid ? Math.max(0, availableHeadroomW) : 0;
    };
    const envelope = {
        schemaVersion: SCHEMA_VERSION,
        generation: cycle.generation,
        ts: now,
        timestamp: now,
        expiresAt: now + Math.min(safetyCfg.staleMs, safetyCfg.envelopeMaxAgeMs),
        valid,
        commissioned,
        emergencyStop: forceZero,
        forceZero,
        status,
        mesh,
        reason: reasons[0] || 'ready',
        invalidReason: reasons[0] || '',
        invalidReasons: reasons,
        grid: {
            connectionPowerW: connectionPowerW !== null ? Math.round(connectionPowerW) : null,
            gridConnectionPowerW: connectionPowerW !== null ? Math.round(connectionPowerW) : null,
            safetyMarginW: Math.round(safetyMarginW),
            maxImportW: Math.round(maxImportW),
            importLimitW: Math.round(maxImportW),
            nvpW: nvpW !== null ? Math.round(nvpW) : null,
            importW: nvpW !== null ? Math.max(0, Math.round(nvpW)) : null,
            nvpUsable: nvp.usable === true,
            nvpAgeMs: nvp.ageMs,
            nvpMeasurementAgeMs: nvp.measurementAgeMs,
            nvpStatus: String(nvp.status || ''),
            nvpSource: String(nvp.source || ''),
            nvpReason: String(nvp.reason || ''),
            incrementHeadroomW: Math.round(gridIncrementHeadroomW),
            availableHeadroomW: Math.round(availableHeadroomW),
            additionalHeadroomW: Math.round(availableHeadroomW),
            staleMs: safetyCfg.staleMs,
        },
        phase: {
            required: phaseRequired,
            requiredCount: phaseRequired ? (mesh?.required ? 3 : safetyCfg.gridPhaseCount) : 0,
            valid: phaseValid,
            maxA: phaseRequired ? maxPhaseA : null,
            voltageV: safetyCfg.voltageV,
            currentsA,
            headroomA,
            minHeadroomA,
        },
        para14a: {
            enabled: paraEnabled,
            active: paraActive,
            ready: !paraEnabled || (!!p14aRuntime && !!paraHealth && paraHealth.ok === true),
            signalFresh: paraFresh,
            safetyReady: paraSafetyReady,
            localFailsafeActive: paraLocalFailsafe,
            fallbackSafe: paraFallbackSafe,
            communicationFallbackActive: !!(p14aRuntime && p14aRuntime.communicationFallbackActive === true),
            communicationFallbackReason: String(p14aRuntime && p14aRuntime.communicationFallbackReason || ''),
            fallbackEvcsCapW: strictFiniteNumber(p14aRuntime && p14aRuntime.fallbackEvcsCapW, null),
            signalStatus: String(p14aRuntime && p14aRuntime.signalStatus || (paraEnabled ? 'missing' : 'disabled')),
            forceZero: paraForceZero,
            totalCapW: paraTotalCapW,
            localPvGrantW: Math.round(paraLocalPvGrantW),
            totalAllowanceW: paraTotalCapW === null ? null : Math.round(Math.max(0, paraTotalCapW) + paraLocalPvGrantW),
            appCapsW: paraAppCapsW,
            deviceCapsW: paraDeviceCapsW,
            validUntilMs: strictFiniteNumber(p14aRuntime && p14aRuntime.directValidUntilMs, null),
        },
        // Kompatibilitaets-/Diagnoseansicht fuer UI und Release-Checks.
        phases: {
            complete: !phaseRequired || phaseValid,
            required: phaseRequired,
            count: phaseRequired ? safetyCfg.gridPhaseCount : 0,
        },
        caps: {
            evcsW: Math.round(effectiveAppCap('evcs')),
            storageChargeW: Math.round(effectiveAppCap('storage')),
            thermalW: Math.round(effectiveAppCap('thermal')),
            heatingRodW: Math.round(effectiveAppCap('heatingRod')),
            customW: Math.round(effectiveAppCap('custom')),
        },
        moduleHealth: { ...criticalHealth },
        budgetGeneration: strictFiniteNumber(budgetSnapshot && budgetSnapshot.ts, null),
    };
    adapter._emsSafetyEnvelope = envelope;
    adapter._nwSafetyEnvelope = envelope;
    adapter._nwSafetyEnvelopeRequired = true;
    if (!adapter._emsSafetyReservations || Number(adapter._emsSafetyReservations.generation) !== cycle.generation) {
        adapter._emsSafetyReservations = {
            generation: cycle.generation,
            targetsByKey: {},
            deltasByKey: {},
            phaseDeltasByKey: {},
            appByKey: {},
            decisions: [],
        };
    }
    return envelope;
}

/**
 * Baut die Sicherheitsfreigabe mit den aktuellsten Messwerten unmittelbar neu
 * auf. Final-Writer verwenden bewusst diese Funktion statt nur den Plan-Snapshot.
 */
function liveSafetyEnvelope(adapter: AnyRecord, dp: AnyRecord | null | undefined, options: Omit<BuildSafetyEnvelopeOptions, 'adapter' | 'dp'> = {}): AnyRecord | null {
    return buildSafetyEnvelope({
        adapter,
        dp,
        coreSnapshot: options.coreSnapshot || adapter?._emsCaps || null,
        budgetSnapshot: options.budgetSnapshot || adapter?._emsBudget || null,
        now: Number(options.now) || Date.now(),
        generation: options.generation ?? adapter?._emsSafetyCycle?.generation ?? 0,
    });
}

function normalizeApp(app: unknown): string {
    const text = String(app || '').trim().toLowerCase();
    if (text.includes('evcs') || text.includes('charging') || text.includes('wallbox')) return 'evcs';
    if (text.includes('storage') || text.includes('speicher') || text.includes('battery')) return 'storage';
    if (text.includes('heatingrod') || text.includes('heizstab')) return 'heatingRod';
    if (text.includes('thermal') || text.includes('heatpump') || text.includes('waerm') || text.includes('wärm') || text.includes('climate') || text.includes('aircondition') || text.includes('klima')) return 'thermal';
    if (text.includes('custom') || text.includes('multiuse') || text.includes('nexologic') || text.includes('threshold') || text.includes('load') || text.includes('relay')) return 'custom';
    return text || 'custom';
}

function sumOther(map: Record<string, unknown> | null | undefined, currentKey: string, appMap?: Record<string, string> | null, appFilter?: string): number {
    let sum = 0;
    for (const [key, value] of Object.entries(map || {})) {
        if (key === currentKey) continue;
        if (appFilter && String(appMap && appMap[key] || '') !== appFilter) continue;
        const parsed = strictFiniteNumber(value, null);
        if (parsed !== null) sum += Math.max(0, parsed);
    }
    return sum;
}

function getSafetyRuntime(adapter: AnyRecord, generation: unknown): SafetyRuntime {
    let runtime = adapter && adapter._emsSafetyReservations && typeof adapter._emsSafetyReservations === 'object'
        ? adapter._emsSafetyReservations
        : null;
    if (!runtime || Number(runtime.generation) !== Number(generation)) {
        runtime = {
            generation,
            targetsByKey: {},
            deltasByKey: {},
            phaseDeltasByKey: {},
            appByKey: {},
            decisions: [],
        };
        if (adapter) adapter._emsSafetyReservations = runtime;
    }
    return runtime;
}

function blockedDecision(request: FlexibleLoadRequest, envelope: AnyRecord | null, reason: unknown, now: number, bypassed = false): SafetyDecision {
    const requestedW = Math.max(0, Math.round(nonNegative(request && request.requestedW, 0)));
    return {
        ok: bypassed,
        bypassed,
        blocked: !bypassed && requestedW > 0,
        clamped: !bypassed && requestedW > 0,
        forceZero: !bypassed,
        requestedW,
        allowedW: bypassed ? requestedW : 0,
        currentActualW: Math.max(0, Math.round(nonNegative(request && request.currentActualW, 0))),
        key: String(request && request.key || ''),
        app: normalizeApp(request && request.app),
        reason: String(reason || 'safety-blocked'),
        binding: String(reason || 'safety-blocked'),
        envelopeGeneration: envelope ? Number(envelope.generation) || 0 : 0,
        evaluatedAt: now,
        reservation: null,
    };
}

/**
 * Ablauf und Zusammenhang: Prüft eine Leistungsanforderung gegen aktuelle Sicherheitsfreigaben, Netz-/Phasengrenzen und bereits berücksichtigte Verbraucher. Liefert erlaubte Leistung und Grund; die Prüfung allein bestätigt noch keinen Hardware-Schreibvorgang.
 */
function evaluateFlexibleLoadRequest(adapter: AnyRecord | null | undefined, request: FlexibleLoadRequest = {}): SafetyDecision {
    const now = Number(request.now) || Date.now();
    const requestedW = Math.max(0, Math.round(nonNegative(request.requestedW, 0)));
    const currentActualFresh = request.currentActualFresh !== false;
    const currentActualW = currentActualFresh
        ? Math.max(0, Math.round(nonNegative(request.currentActualW, 0)))
        : 0;
    const key = String(request.key || '').trim() || `${normalizeApp(request.app)}:anonymous`;
    const app = normalizeApp(request.app);

    // Isolierte Modultests ohne Engine/ModuleManager bleiben kompatibel. In der
    // echten Adapter-Runtime setzt beginSafetyCycle dieses Flag vor jedem Tick.
    const required = !!(adapter && (adapter._nwSafetyEnvelopeRequired === true || adapter._emsSafetyCycle || adapter.emsEngine));
    if (!required) return blockedDecision({ ...request, requestedW, currentActualW, key, app }, null, 'isolated-runtime-no-safety-cycle', now, true);

    const envelope = adapter && adapter._emsSafetyEnvelope && typeof adapter._emsSafetyEnvelope === 'object'
        ? adapter._emsSafetyEnvelope
        : null;
    if (requestedW <= 0) {
        const generation = envelope ? Number(envelope.generation) || 0 : Number(adapter?._emsSafetyCycle?.generation) || 0;
        return {
            ...blockedDecision({ ...request, requestedW: 0, currentActualW, key, app }, envelope, envelope && envelope.valid ? 'safe-zero' : 'safe-zero-without-release', now, true),
            ok: true,
            bypassed: false,
            blocked: false,
            clamped: false,
            forceZero: false,
            requestedW: 0,
            allowedW: 0,
            envelopeGeneration: generation,
        };
    }
    if (!envelope) return blockedDecision({ ...request, requestedW, currentActualW, key, app }, null, 'safety-envelope-missing', now);
    const cycleGeneration = Number(adapter?._emsSafetyCycle?.generation) || 0;
    if (Number(envelope.generation) !== cycleGeneration) return blockedDecision({ ...request, requestedW, currentActualW, key, app }, envelope, 'safety-envelope-generation-mismatch', now);
    if (now > Number(envelope.expiresAt || 0)) return blockedDecision({ ...request, requestedW, currentActualW, key, app }, envelope, 'safety-envelope-expired', now);
    if (envelope.forceZero === true || envelope.emergencyStop === true) return blockedDecision({ ...request, requestedW, currentActualW, key, app }, envelope, envelope.invalidReason || 'safety-force-zero', now);
    if (envelope.valid !== true || envelope.commissioned !== true) return blockedDecision({ ...request, requestedW, currentActualW, key, app }, envelope, envelope.invalidReason || 'safety-envelope-invalid', now);

    // Der NVP wird am finalen Write-Punkt erneut gegen den kanonischen Snapshot
    // geprüft. Dadurch wird auch ein zwischen Planung und Write veralteter Plan
    // sicher auf 0 geklemmt.
    const staleMs = Math.max(1000, Number(envelope.grid && envelope.grid.staleMs) || DEFAULT_NVP_STALE_MS);
    const nvp = resolveCurrentNvpSnapshot(adapter && adapter._nvpFreshnessSnapshot, now, staleMs);
    if (!nvp.usable) return blockedDecision({ ...request, requestedW, currentActualW, key, app }, envelope, `nvp-final-write-not-usable:${String(nvp.reason || nvp.status || 'unknown')}`, now);
    const mesh = adapter?._meshCoordinator?.currentLimits();
    const envelopeImportW = strictFiniteNumber(envelope.grid && envelope.grid.maxImportW, null);
    const maxImportW = mesh?.required && envelopeImportW !== null ? Math.min(envelopeImportW, mesh.limits.importW) : envelopeImportW;
    if (maxImportW === null || maxImportW < 0 || (maxImportW === 0 && !mesh?.required)) return blockedDecision({ ...request, requestedW, currentActualW, key, app }, envelope, 'grid-limit-final-write-missing', now);

    const runtime = getSafetyRuntime(adapter, envelope.generation);
    const signedNvpW = Number(nvp.netW) || 0;
    // Keep this value signed. A negative headroom means the connection is
    // already above its hard import limit and existing flexible loads must be
    // reduced by at least the excess amount. Clamping it to 0 W would permit
    // the currently active target to continue unchanged. Conversely, a
    // negative NVP (export) increases the import-only connection headroom.
    const gridIncrementHeadroomW = maxImportW - signedNvpW;
    const otherDeltaW = sumOther(runtime.deltasByKey, key);
    const gridAllowedW = Math.max(0, currentActualW + gridIncrementHeadroomW - otherDeltaW);

    const candidates = [{ source: 'requested', value: requestedW }, { source: 'grid', value: gridAllowedW }];
    if (mesh?.required) {
        const category = app === 'evcs' ? 'evW' : app === 'storage' ? 'chargeW' : 'flexW';
        const otherTargets = sumOther(runtime.targetsByKey, key, runtime.appByKey, app);
        const allFlexibleOthers = Object.keys(runtime.targetsByKey || {}).filter(k => k !== key && !['evcs', 'storage'].includes(String(runtime.appByKey[k] || ''))).reduce((sum, k) => sum + Number(runtime.targetsByKey[k] || 0), 0);
        candidates.push({ source: 'mesh-category', value: Math.max(0, mesh.limits[category] - (category === 'flexW' ? allFlexibleOthers : otherTargets)) });
        // Eine inzwischen abgelaufene oder abgesenkte Phasenfreigabe verwirft den
        // alten Plan. Der nächste unmittelbare EMS-Tick baut ihn mit Rückfall neu.
        if (!envelope.mesh || ['l1A', 'l2A', 'l3A'].some(k => mesh.limits[k] < envelope.mesh.limits[k])) {
            return blockedDecision({ ...request, requestedW, currentActualW, key, app }, envelope, 'mesh-phase-budget-changed', now);
        }
    }
    const phase = envelope.phase && typeof envelope.phase === 'object' ? envelope.phase : {};
    let phaseAllowedW = Number.POSITIVE_INFINITY;
    let phaseDeltaW = 0;
    if (phase.required === true) {
        if (phase.valid !== true || strictFiniteNumber(phase.minHeadroomA, null) === null) {
            return blockedDecision({ ...request, requestedW, currentActualW, key, app }, envelope, 'phase-final-write-invalid', now);
        }
        const voltageV = clamp(request.voltageV ?? phase.voltageV, 200, 260, DEFAULT_VOLTAGE_V);
        const requestPhases = Math.max(1, Math.min(Number(phase.requiredCount) || 3, Math.round(strictFiniteNumber(request.phaseCount, Number(phase.requiredCount) || 3))));
        // Signed for the same reason as the grid headroom: an already
        // overloaded phase has to shed flexible load, not only block growth.
        const physicalPhaseIncrementW = (Number(phase.minHeadroomA) || 0) * voltageV * requestPhases;
        const otherPhaseDeltaW = sumOther(runtime.phaseDeltasByKey, key);
        phaseAllowedW = Math.max(0, currentActualW + physicalPhaseIncrementW - otherPhaseDeltaW);
        candidates.push({ source: 'phase', value: phaseAllowedW });
    }

    const para = envelope.para14a && typeof envelope.para14a === 'object' ? envelope.para14a : {};
    if (para.enabled === true && para.safetyReady !== true) {
        return blockedDecision({ ...request, requestedW, currentActualW, key, app }, envelope, 'para14a-final-write-signal-stale', now);
    }
    if (para.forceZero === true) {
        return blockedDecision({ ...request, requestedW, currentActualW, key, app }, envelope, 'para14a-final-write-force-zero', now);
    }
    if (para.active === true) {
        const totalCapW = strictFiniteNumber(para.totalCapW, null);
        if (totalCapW === null) return blockedDecision({ ...request, requestedW, currentActualW, key, app }, envelope, 'para14a-total-cap-missing', now);
        const localPvGrantW = Math.max(0, strictFiniteNumber(para.localPvGrantW, 0));
        const otherTargetsW = sumOther(runtime.targetsByKey, key);
        candidates.push({ source: 'para14a-total', value: Math.max(0, totalCapW + localPvGrantW - otherTargetsW) });

        const appCaps = para.appCapsW && typeof para.appCapsW === 'object' ? para.appCapsW : {};
        const appCapRaw = strictFiniteNumber(appCaps[app], null);
        // Bei aktiver §14a-Begrenzung muss jede bekannte flexible App einen
        // expliziten Netzbezugs-Cap besitzen. Lokale PV-Leistung wird zusätzlich
        // freigegeben; das Gesamt-Cap verhindert eine doppelte Nutzung über Apps.
        if (['evcs', 'storage', 'thermal', 'heatingRod', 'custom'].includes(app)) {
            if (appCapRaw === null) return blockedDecision({ ...request, requestedW, currentActualW, key, app }, envelope, `para14a-${app}-cap-missing`, now);
            const otherAppTargetsW = sumOther(runtime.targetsByKey, key, runtime.appByKey, app);
            candidates.push({ source: `para14a-${app}`, value: Math.max(0, appCapRaw + localPvGrantW - otherAppTargetsW) });
        }
        if (app === 'evcs') {
            const deviceCaps = para.deviceCapsW && typeof para.deviceCapsW === 'object' ? para.deviceCapsW : {};
            const deviceKey = String(request.deviceKey || key.replace(/^evcs:/, '')).trim();
            const deviceCap = strictFiniteNumber(deviceCaps[deviceKey], null);
            if (deviceCap === null) return blockedDecision({ ...request, requestedW, currentActualW, key, app }, envelope, `para14a-device-cap-missing:${deviceKey}`, now);
            candidates.push({ source: 'para14a-device', value: Math.max(0, deviceCap + localPvGrantW) });
        }
    }

    const extraCapW = strictFiniteNumber(request.deviceCapW, null);
    if (extraCapW !== null) candidates.push({ source: 'device', value: Math.max(0, extraCapW) });
    let allowedW = requestedW;
    let binding = 'requested';
    for (const candidate of candidates) {
        const value = strictFiniteNumber(candidate.value, null);
        if (value === null) continue;
        if (value < allowedW) {
            allowedW = value;
            binding = candidate.source;
        }
    }
    allowedW = Math.max(0, Math.floor(allowedW));
    const deltaW = Math.max(0, allowedW - currentActualW);
    if (phase.required === true) phaseDeltaW = deltaW;
    const decision = {
        ok: true,
        bypassed: false,
        blocked: allowedW <= 0 && requestedW > 0,
        clamped: allowedW < requestedW,
        forceZero: allowedW <= 0 && requestedW > 0,
        requestedW,
        allowedW,
        currentActualW,
        key,
        app,
        reason: allowedW < requestedW ? `safety-clamped:${binding}` : 'safety-approved',
        binding,
        envelopeGeneration: Number(envelope.generation) || 0,
        evaluatedAt: now,
        nvpW: Math.round(Number(nvp.netW) || 0),
        maxImportW: Math.round(maxImportW),
        gridIncrementHeadroomW: Math.round(gridIncrementHeadroomW),
        otherDeltaW: Math.round(otherDeltaW),
        phaseAllowedW: Number.isFinite(phaseAllowedW) ? Math.round(phaseAllowedW) : null,
        reservation: {
            targetW: allowedW,
            deltaW,
            phaseDeltaW,
            app,
        },
    };
    runtime.decisions.push({ ...decision, reservation: decision.reservation ? { ...decision.reservation } : null });
    if (runtime.decisions.length > 200) runtime.decisions.splice(0, runtime.decisions.length - 200);
    return decision;
}


/**
 * Prüft einen nicht verbrauchserhöhenden, aber weiterhin sicherheitsrelevanten
 * Stellbefehl (z. B. Speicherentladung). Der Befehl verbraucht keinen
 * Netzanschluss-Headroom, darf bei fehlender Inbetriebnahme, abgelaufenem
 * Envelope, Messwertausfall oder §14a-Notstopp aber ebenfalls nicht ausgeführt
 * werden. 0 W bleibt immer zulässig.
 */
function evaluateSafetyCommandPermission(adapter: AnyRecord | null | undefined, request: SafetyCommandRequest = {}): AnyRecord {
    const now = Number(request.now) || Date.now();
    const requestedActive = request.requestedActive === true;
    const key = String(request.key || '').trim() || `${normalizeApp(request.app)}:command`;
    const app = normalizeApp(request.app);
    const required = !!(adapter && (adapter._nwSafetyEnvelopeRequired === true || adapter._emsSafetyCycle || adapter.emsEngine));
    const envelope = adapter && adapter._emsSafetyEnvelope && typeof adapter._emsSafetyEnvelope === 'object'
        ? adapter._emsSafetyEnvelope
        : null;

    if (!requestedActive) {
        return {
            ok: true,
            bypassed: false,
            blocked: false,
            forceZero: false,
            requestedActive: false,
            allowed: true,
            key,
            app,
            reason: 'safe-zero-command',
            envelopeGeneration: envelope ? Number(envelope.generation) || 0 : Number(adapter?._emsSafetyCycle?.generation) || 0,
            evaluatedAt: now,
        };
    }
    if (!required) {
        return {
            ok: true,
            bypassed: true,
            blocked: false,
            forceZero: false,
            requestedActive: true,
            allowed: true,
            key,
            app,
            reason: 'isolated-runtime-no-safety-cycle',
            envelopeGeneration: 0,
            evaluatedAt: now,
        };
    }
    const blocked = (reason: unknown): AnyRecord => ({
        ok: false,
        bypassed: false,
        blocked: true,
        forceZero: true,
        requestedActive: true,
        allowed: false,
        key,
        app,
        reason: String(reason || 'safety-command-blocked'),
        envelopeGeneration: envelope ? Number(envelope.generation) || 0 : 0,
        evaluatedAt: now,
    });
    if (!envelope) return blocked('safety-envelope-missing');
    const cycleGeneration = Number(adapter?._emsSafetyCycle?.generation) || 0;
    if (Number(envelope.generation) !== cycleGeneration) return blocked('safety-envelope-generation-mismatch');
    if (now > Number(envelope.expiresAt || 0)) return blocked('safety-envelope-expired');
    if (envelope.forceZero === true || envelope.emergencyStop === true) return blocked(envelope.invalidReason || 'safety-force-zero');
    if (envelope.valid !== true || envelope.commissioned !== true) return blocked(envelope.invalidReason || 'safety-envelope-invalid');

    const staleMs = Math.max(1000, Number(envelope.grid && envelope.grid.staleMs) || DEFAULT_NVP_STALE_MS);
    const nvp = resolveCurrentNvpSnapshot(adapter && adapter._nvpFreshnessSnapshot, now, staleMs);
    if (!nvp.usable) return blocked(`nvp-final-write-not-usable:${String(nvp.reason || nvp.status || 'unknown')}`);
    const maxImportW = strictFiniteNumber(envelope.grid && envelope.grid.maxImportW, null);
    if (maxImportW === null || maxImportW <= 0) return blocked('grid-limit-final-write-missing');

    const para = envelope.para14a && typeof envelope.para14a === 'object' ? envelope.para14a : {};
    if (para.enabled === true && para.safetyReady !== true) return blocked('para14a-final-write-signal-stale');
    if (para.forceZero === true) return blocked('para14a-final-write-force-zero');

    return {
        ok: true,
        bypassed: false,
        blocked: false,
        forceZero: false,
        requestedActive: true,
        allowed: true,
        key,
        app,
        reason: 'safety-command-approved',
        envelopeGeneration: Number(envelope.generation) || 0,
        evaluatedAt: now,
    };
}

/**
 * Ablauf und Zusammenhang: Übernimmt die Stellentscheidung in den gemeinsamen Sicherheits-Laufzeitzustand. Das applied-Argument unterscheidet eine tatsächlich angewandte Entscheidung von einem bloßen Plan.
 */
function commitFlexibleLoadDecision(adapter: AnyRecord | null | undefined, decision: SafetyDecision | AnyRecord | null | undefined, applied = true): boolean {
    if (!adapter || !decision || decision.bypassed === true || applied !== true) return false;
    const generation = Number(decision.envelopeGeneration) || 0;
    const runtime = getSafetyRuntime(adapter, generation);
    const key = String(decision.key || '').trim();
    if (!key) return false;
    const reservation = decision.reservation && typeof decision.reservation === 'object'
        ? decision.reservation
        : { targetW: decision.allowedW, deltaW: 0, phaseDeltaW: 0, app: decision.app };
    runtime.targetsByKey[key] = Math.max(0, Math.round(nonNegative(reservation.targetW, 0)));
    runtime.deltasByKey[key] = Math.max(0, Math.round(nonNegative(reservation.deltaW, 0)));
    runtime.phaseDeltasByKey[key] = Math.max(0, Math.round(nonNegative(reservation.phaseDeltaW, 0)));
    runtime.appByKey[key] = normalizeApp(reservation.app || decision.app);
    return true;
}

/**
 * Ablauf und Zusammenhang: Überträgt die in W begrenzte Sicherheitsentscheidung auf das konkrete Sollwertobjekt. Dadurch darf der anschließende Strom-/Leistungspfad keine höhere Anforderung als die freigegebene Leistung erzeugen.
 */
function safetyTargetFromPowerDecision(target: AnyRecord | null | undefined, decision: SafetyDecision | AnyRecord | null | undefined, options: TargetOptions = {}): AnyRecord {
    const next = target && typeof target === 'object' ? { ...target } : {};
    const allowedW = Math.max(0, Math.round(nonNegative(decision && decision.allowedW, 0)));
    next.targetW = allowedW;
    const phases = Math.max(1, Math.min(3, Math.round(strictFiniteNumber(options.phaseCount, 3))));
    const voltageV = clamp(options.voltageV, 200, 260, DEFAULT_VOLTAGE_V);
    if (strictFiniteNumber(next.targetA, null) !== null || String(next.basis || '').toLowerCase().includes('current')) {
        next.targetA = allowedW > 0 ? Math.max(0, allowedW / (voltageV * phases)) : 0;
    }
    if (allowedW <= 0 && Object.prototype.hasOwnProperty.call(next, 'enable')) next.enable = false;
    return next;
}

module.exports = {
    SCHEMA_VERSION,
    DEFAULT_NVP_STALE_MS,
    DEFAULT_ENVELOPE_MAX_AGE_MS,
    strictFiniteNumber,
    resolveSafetyConfig,
    beginSafetyCycle,
    markSafetyModuleStarted,
    markSafetyModuleResult,
    invalidateSafetyEnvelope,
    buildSafetyEnvelope,
    liveSafetyEnvelope,
    evaluateFlexibleLoadRequest,
    evaluateSafetyCommandPermission,
    commitFlexibleLoadDecision,
    safetyTargetFromPowerDecision,
};
