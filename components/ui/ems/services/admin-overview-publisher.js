/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/services/admin-overview-publisher.ts
 * Quell-Hash: sha256:2adef843d22b19c510588d86e45ca7e29df743b94d47f31780b5463fae2f0c6f
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/admin-overview-publisher.js.
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
 * Aufgabe: Veröffentlicht eine lesbare EMS-Übersicht und einen von langen Regelzyklen unabhängigen Diagnose-Heartbeat.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/admin-overview-publisher.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
const DEFAULT_PUBLISH_INTERVAL_MS = 5000;
// EOS Admin treats an instance without fresh liveness data after roughly
// 20 seconds as unavailable. A dedicated four-second heartbeat therefore runs
// independently from the potentially longer diagnostic collection cycle.
const DEFAULT_HEARTBEAT_INTERVAL_MS = 4000;
const DEFAULT_STATE_READ_TIMEOUT_MS = 1200;
const DEFAULT_STATE_WRITE_TIMEOUT_MS = 1200;
const DEFAULT_OBJECT_TIMEOUT_MS = 2500;
const DEFAULT_IO_CONCURRENCY = 8;
// The EMS normally publishes every few seconds. A 30-second window tolerates a
// short controller or database delay without incorrectly calling the complete
// adapter "offline". Tick freshness is still exposed separately and becomes a
// visible warning once this threshold is exceeded.
const DEFAULT_TICK_FRESH_THRESHOLD_MS = 30000;
const DEFAULT_SCHEDULER_FRESH_THRESHOLD_MS = 12000;
class AdminOverviewTimeoutError extends Error {
    constructor(label, timeoutMs) {
        super(`${label} timed out after ${timeoutMs} ms`);
        this.name = 'AdminOverviewTimeoutError';
        this.label = label;
    }
}
/**
 * Waits for an ioBroker operation without allowing a missing callback to block
 * the read-only overview forever. The underlying Promise is deliberately not
 * discarded here; the publisher keeps one in-flight operation per label and
 * therefore never starts an unbounded number of duplicate reads or writes.
 */
function waitWithTimeout(operation, timeoutMs, label) {
    return new Promise((resolve, reject) => {
        let settled = false;
        const timer = setTimeout(() => {
            if (settled)
                return;
            settled = true;
            reject(new AdminOverviewTimeoutError(label, timeoutMs));
        }, Math.max(1, timeoutMs));
        // Do not `unref()` this short watchdog timer: initialization can run before
        // the regular adapter interval exists, and the timeout must still settle the
        // awaited operation deterministically in tests and during early startup.
        operation.then((value) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            resolve(value);
        }, (error) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            reject(error);
        });
    });
}
/**
 * Runs a bounded number of state/database operations in parallel. This avoids
 * the former long sequential refresh chain while still protecting the ioBroker
 * state backend from a burst of dozens of simultaneous requests.
 */
async function mapWithConcurrency(items, concurrency, worker) {
    const results = new Array(items.length);
    let nextIndex = 0;
    const workers = Array.from({ length: Math.max(1, Math.min(items.length || 1, concurrency)) }, async () => {
        while (nextIndex < items.length) {
            const index = nextIndex;
            nextIndex += 1;
            results[index] = await worker(items[index]);
        }
    });
    await Promise.all(workers);
    return results;
}
function finite(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}
function nullableNumber(value) {
    if (value === null || value === undefined || value === '')
        return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}
function bool(value, fallback = false) {
    if (value === true || value === false)
        return value;
    if (typeof value === 'number')
        return value !== 0;
    const normalized = String(value ?? '').trim().toLowerCase();
    if (['1', 'true', 'on', 'yes', 'ja', 'an', 'active', 'aktiv', 'enabled', 'online'].includes(normalized))
        return true;
    if (['0', 'false', 'off', 'no', 'nein', 'aus', 'inactive', 'inaktiv', 'disabled', 'offline'].includes(normalized))
        return false;
    return fallback;
}
function text(value, fallback = '', maxLength = 320) {
    const normalized = String(value ?? fallback).replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength)
        return normalized;
    return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}
function parseJson(value, fallback) {
    if (value && typeof value === 'object')
        return value;
    try {
        return JSON.parse(String(value ?? ''));
    }
    catch (_error) {
        return fallback;
    }
}
function stateValue(adapter, key, fallback = null) {
    try {
        const entry = adapter && adapter.stateCache && adapter.stateCache[key];
        if (entry && Object.prototype.hasOwnProperty.call(entry, 'value'))
            return entry.value;
    }
    catch (_error) { }
    return fallback;
}
function firstValue(adapter, keys, fallback = null) {
    for (const key of keys) {
        const value = stateValue(adapter, key, undefined);
        if (value !== undefined && value !== null && value !== '')
            return value;
    }
    return fallback;
}
/**
 * Returns the newest numeric timestamp instead of the first populated state.
 * A running EMS tick can have an older start timestamp while another module or
 * the scheduler has already published newer activity. Choosing the first key
 * caused a healthy installation to oscillate between online and stale.
 */
function newestTimestamp(adapter, keys, fallback = 0) {
    let newest = Math.max(0, Math.round(finite(fallback, 0)));
    for (const key of keys) {
        const candidate = Math.max(0, Math.round(finite(stateValue(adapter, key, 0), 0)));
        if (candidate > newest)
            newest = candidate;
    }
    return newest;
}
function severityRank(value) {
    return value === 'error' ? 3 : value === 'warning' ? 2 : value === 'info' ? 1 : 0;
}
function maxSeverity(...values) {
    return values.reduce((current, value) => severityRank(value) > severityRank(current) ? value : current, 'ok');
}
function normalizeLimiter(value) {
    const raw = text(value, 'none', 80).toLowerCase();
    if (!raw || raw === 'none' || raw === 'normal' || raw === 'unlimited')
        return 'none';
    return raw;
}
/**
 * These tokens describe an enabled monitor or a normal waiting state. They do
 * not mean that EOS is currently reducing power. Keeping this distinction in
 * the read-only overview prevents a permanently yellow UI while the NVP import
 * guard continues to run on every EMS cycle.
 */
function isInformationalLimiter(value) {
    const limiter = normalizeLimiter(value);
    return ['none', 'no-charge-demand', 'no-vehicle', 'pv-surplus', 'grid-monitor', 'import-monitor', 'grid-import-monitor', 'export-monitor', 'grid-export-monitor'].includes(limiter);
}
function activeLimiterForDisplay(value) {
    const limiter = normalizeLimiter(value);
    return isInformationalLimiter(limiter) ? 'none' : limiter;
}
function humanizeLimiter(value) {
    const limiter = normalizeLimiter(value);
    const map = {
        'none': 'Keine Begrenzung',
        'eos-safety-stop': 'EOS Safety',
        'stale-meter-failsafe': 'Messwert-Failsafe',
        'peak-shaving': 'Peak-Shaving',
        'para14a': '§14a',
        'grid-and-phase': 'Netz- und Phasenlimit',
        'grid-import': 'Netzanschlusslimit',
        'grid-soft': 'Netzanschluss-Softlimit',
        'grid-hard': 'Netzanschluss-Hardlimit',
        'grid-monitor': 'Netzschutz überwacht',
        'export-limit': 'Export-Limit',
        'grid-export': 'Export-Limit',
        'zero-export': '0-Einspeiselimit',
        'export-monitor': 'Export-Limit überwacht',
        'phase': 'Phasenlimit',
        'station': 'Stationslimit',
        'device': 'Gerätelimit',
        'budget': 'EMS-Budget',
        'pv-surplus': 'PV-Überschuss',
        'no-charge-demand': 'Kein Fahrzeug-Ladebedarf',
        'no-vehicle': 'Kein Fahrzeug verbunden',
        'no-setpoint': 'Keine sichere Sollwertfreigabe',
        'write-error': 'Schreibfehler',
        'fault': 'Gerätestörung',
        'offline': 'Ladepunkt offline',
        'unavailable': 'Ladepunkt nicht verfügbar',
    };
    return map[limiter] || text(value, 'Unbekannte Begrenzung', 100);
}
function statusFromAudit(audit, paraFallback, storageWriteOk, forecastFresh) {
    const safetyStage = text(audit && audit.safetyStage, '').toUpperCase();
    const limiter = activeLimiterForDisplay(audit && audit.activeLimiter);
    const wallboxes = Array.isArray(audit && audit.wallboxes) ? audit.wallboxes : [];
    if (safetyStage === 'EOS-SAFETY-STOP'
        || limiter === 'eos-safety-stop'
        || wallboxes.some((row) => ['fault', 'write-error', 'stale-meter-failsafe'].includes(normalizeLimiter(row && row.limiter))))
        return 'error';
    if (limiter !== 'none' || paraFallback || storageWriteOk === false || forecastFresh === false)
        return 'warning';
    return 'ok';
}
function compactWallbox(row) {
    return {
        id: text(row && (row.safe || row.id), '', 80),
        name: text(row && (row.name || row.safe || row.id), 'Ladepunkt', 100),
        mode: text(row && (row.userMode || row.mode), '', 40),
        online: row && row.online === true,
        connected: row && row.connected === true,
        charging: row && row.charging === true,
        actualW: Math.max(0, Math.round(finite(row && row.actualPowerW, 0))),
        targetW: Math.max(0, Math.round(finite(row && row.targetPowerW, 0))),
        requestedW: Math.max(0, Math.round(finite(row && row.requestedPowerW, 0))),
        limiter: normalizeLimiter(row && row.limiter),
        limiterText: humanizeLimiter(row && row.limiter),
        reason: text(row && (row.safetyReason || row.reason || row.vehicleDemandReason), '', 180),
        applyStatus: text(row && row.applyStatus, '', 80),
    };
}
function buildOverviewContract(adapter, now = Date.now()) {
    const audit = parseJson(stateValue(adapter, 'chargingManagement.audit.snapshotJson', '{}'), {});
    const auditWallboxes = Array.isArray(audit && audit.wallboxes) ? audit.wallboxes.map(compactWallbox) : [];
    const configuredWallboxCount = Math.max(0, Math.round(finite(firstValue(adapter, ['chargingManagement.wallboxCount'], auditWallboxes.length), auditWallboxes.length)));
    const chargingActualW = Math.max(0, Math.round(finite(firstValue(adapter, [
        'chargingManagement.summary.totalPowerW',
        'chargingManagement.control.actualW',
    ], audit && audit.actualPowerW), finite(audit && audit.actualPowerW, 0))));
    const chargingTargetW = Math.max(0, Math.round(finite(firstValue(adapter, [
        'chargingManagement.summary.totalTargetPowerW',
        'chargingManagement.control.targetSumW',
    ], audit && audit.targetPowerW), finite(audit && audit.targetPowerW, 0))));
    const chargingReservedW = Math.max(0, Math.round(finite(firstValue(adapter, [
        'chargingManagement.summary.totalReservedPowerW',
        'chargingManagement.control.usedW',
    ], audit && audit.reservedPowerW), finite(audit && audit.reservedPowerW, 0))));
    const chargingActiveCount = auditWallboxes.filter((row) => row.charging || row.actualW >= 100).length;
    const chargingFaultCount = auditWallboxes.filter((row) => ['fault', 'write-error', 'stale-meter-failsafe', 'offline', 'unavailable'].includes(row.limiter)).length;
    const chargingWaitingCount = auditWallboxes.filter((row) => row.connected && !row.charging && !['fault', 'write-error', 'offline', 'unavailable'].includes(row.limiter)).length;
    const budgetTotalW = Math.max(0, Math.round(finite(firstValue(adapter, [
        'ems.budget.totalBudgetW',
        'chargingManagement.control.budgetW',
        'chargingManagement.control.infrastructureHardCapW',
        'chargingManagement.control.infrastructureCapacityW',
    ], audit && audit.budgetW), finite(audit && audit.budgetW, 0))));
    const budgetRemainingW = Math.max(0, Math.round(finite(firstValue(adapter, [
        'ems.budget.remainingTotalW',
        'chargingManagement.control.remainingW',
    ], audit && audit.remainingPowerW), finite(audit && audit.remainingPowerW, 0))));
    const budgetUsedW = Math.max(0, Math.round(finite(firstValue(adapter, [
        'ems.budget.flexUsedW',
        'chargingManagement.control.usedW',
    ], chargingReservedW), chargingReservedW)));
    const pvBudgetW = Math.max(0, Math.round(finite(firstValue(adapter, [
        'ems.budget.pvBudgetW',
        'chargingManagement.control.pvCapEffectiveW',
    ], 0), 0)));
    const remainingPvW = Math.max(0, Math.round(finite(firstValue(adapter, [
        'ems.budget.remainingPvW',
        'chargingManagement.control.pvCentralRemainingAfterEvcsW',
    ], 0), 0)));
    const centralBudgetBindingRaw = normalizeLimiter(firstValue(adapter, [
        'ems.budget.binding',
        'chargingManagement.audit.activeLimiter',
    ], audit && audit.activeLimiter));
    const centralBudgetBinding = activeLimiterForDisplay(centralBudgetBindingRaw);
    const centralBudgetMode = text(stateValue(adapter, 'ems.budget.mode', ''), '', 80);
    const centralBudgetSource = text(stateValue(adapter, 'ems.budget.source', ''), '', 100);
    const centralBudgetActive = bool(stateValue(adapter, 'ems.budget.active', budgetTotalW > 0), budgetTotalW > 0);
    const centralBudgetUpdatedAt = Math.max(0, Math.round(finite(stateValue(adapter, 'ems.budget.lastUpdate', 0), 0)));
    const gridPowerW = nullableNumber(stateValue(adapter, 'ems.budget.gridW', null));
    const gridImportW = nullableNumber(stateValue(adapter, 'ems.budget.gridImportW', null));
    const gridExportW = nullableNumber(stateValue(adapter, 'ems.budget.gridExportW', null));
    const pvPowerW = nullableNumber(stateValue(adapter, 'ems.budget.pvPowerW', null));
    const exportLimitEnabled = bool(stateValue(adapter, 'gridConstraints.exportLimit.enabled', false), false);
    const exportLimitOverW = Math.max(0, Math.round(finite(stateValue(adapter, 'gridConstraints.exportLimit.exportOverLimitW', 0), 0)));
    const exportLimitStatus = text(stateValue(adapter, 'gridConstraints.exportLimit.statusLabel', ''), '', 120);
    const exportLimitDiagnosticOnly = bool(stateValue(adapter, 'gridConstraints.exportLimit.diagnosticOnly', false), false);
    const exportLimitExceeded = exportLimitEnabled && exportLimitOverW > 0;
    const exportLimitActive = exportLimitExceeded && !exportLimitDiagnosticOnly;
    const safetyValid = bool(stateValue(adapter, 'ems.safety.valid', true), true);
    const safetyEmergencyStop = bool(stateValue(adapter, 'ems.safety.emergencyStop', false), false);
    const safetyReason = text(stateValue(adapter, 'ems.safety.reason', ''), '', 220);
    const safetyGridHeadroomW = nullableNumber(stateValue(adapter, 'ems.safety.gridHeadroomW', null));
    const safetyEvcsCapW = nullableNumber(stateValue(adapter, 'ems.safety.evcsCapW', null));
    const paraFallback = bool(stateValue(adapter, 'para14a.communicationFallbackActive', false), false);
    const paraFallbackCapW = Math.max(0, Math.round(finite(firstValue(adapter, [
        'para14a.fallbackEvcsCapW',
        'para14a.evcsTotalCapW',
        'chargingManagement.control.para14aCapEvcsW',
    ], 0), 0)));
    const paraBinding = bool(firstValue(adapter, [
        'chargingManagement.control.para14aBinding',
        'para14a.binding',
    ], false), false);
    const paraActive = bool(firstValue(adapter, [
        'chargingManagement.control.para14aActive',
        'para14a.active',
    ], false), false);
    const storageTopology = text(stateValue(adapter, 'speicher.regelung.topologie', 'none'), 'none', 40).toLowerCase();
    const storageAvailable = storageTopology !== 'none'
        || bool(stateValue(adapter, 'speicher.regelung.aktivKonfig', false), false)
        || nullableNumber(stateValue(adapter, 'storageSoc', null)) !== null;
    const storageTargetW = Math.round(finite(firstValue(adapter, [
        'speicher.regelung.acceptedSollW',
        'speicher.regelung.sollW',
        'speicher.regelung.requestW',
    ], 0), 0));
    const storageActualW = Math.round(finite(firstValue(adapter, [
        'speicher.regelung.batteryPowerFeedbackMeasuredW',
        'speicher.regelung.batteryPowerFeedbackBasisW',
        'storagePower',
    ], 0), 0));
    const storageSocPct = nullableNumber(firstValue(adapter, [
        'speicher.regelung.socPct',
        'storageSoc',
    ], null));
    const storageWriteStatus = text(stateValue(adapter, 'speicher.regelung.schreibStatus', ''), '', 100);
    const storageWriteToken = storageWriteStatus.toLowerCase();
    const storageWriteOk = storageWriteToken
        ? (/(failed|error|fehler|rejected|unreachable)/.test(storageWriteToken)
            ? false
            : (/(ok|applied|written|success|unchanged|held)/.test(storageWriteToken) ? true : null))
        : null;
    const storageReason = text(firstValue(adapter, [
        'speicher.regelung.safetyReason',
        'speicher.regelung.grund',
        'speicher.regelung.requestGrund',
        'speicher.regelung.topologieGrund',
    ], ''), '', 220);
    const tariffActive = bool(stateValue(adapter, 'tarif.aktiv', false), false);
    const tariffState = text(stateValue(adapter, 'tarif.state', tariffActive ? 'unknown' : 'off'), tariffActive ? 'unknown' : 'off', 40);
    const tariffFresh = bool(stateValue(adapter, 'tarif.currentPriceFresh', !tariffActive), !tariffActive);
    const tariffPrice = nullableNumber(firstValue(adapter, [
        'tarif.preisAktuellEurProKwh',
        'tariffProvider.currentPriceEurPerKwh',
    ], null));
    const forecastSource = text(firstValue(adapter, [
        'forecast.effective.source',
        'forecast.pv.source',
    ], 'none'), 'none', 80);
    const forecastFreshRaw = firstValue(adapter, ['forecast.effective.fresh', 'forecast.pv.valid'], null);
    const forecastFresh = forecastFreshRaw === null ? null : bool(forecastFreshRaw, false);
    const forecastPowerNowW = Math.max(0, Math.round(finite(firstValue(adapter, [
        'forecast.effective.powerNowW',
        'forecast.pv.powerNowW',
    ], 0), 0)));
    const forecastUpdatedAt = Math.max(0, Math.round(finite(firstValue(adapter, [
        'forecast.effective.updatedAt',
        'forecast.pv.updatedAt',
    ], 0), 0)));
    const forecastError = text(stateValue(adapter, 'forecast.effective.error', ''), '', 180);
    const peakStatus = text(stateValue(adapter, 'peakShaving.control.status', 'off'), 'off', 80);
    const peakActive = !['', 'off', 'inactive', 'disabled', 'idle', 'none'].includes(peakStatus.toLowerCase());
    const controlStatus = text(firstValue(adapter, ['chargingManagement.control.status'], audit && audit.status), '', 160);
    const controlMode = text(firstValue(adapter, ['chargingManagement.control.mode'], audit && audit.mode), '', 60);
    const publisherHealth = adapter && adapter._nwAdminOverviewPublisherHealth && typeof adapter._nwAdminOverviewPublisherHealth === 'object'
        ? adapter._nwAdminOverviewPublisherHealth
        : {};
    const tickFreshThresholdMs = Math.max(10000, Math.round(finite(publisherHealth.tickFreshThresholdMs, DEFAULT_TICK_FRESH_THRESHOLD_MS)));
    const schedulerFreshThresholdMs = Math.max(8000, Math.round(finite(publisherHealth.schedulerFreshThresholdMs, DEFAULT_SCHEDULER_FRESH_THRESHOLD_MS)));
    const adapterOnline = bool(firstValue(adapter, ['info.connection'], true), true);
    const schedulerHealth = adapter && adapter._nwEmsSchedulerHealth && typeof adapter._nwEmsSchedulerHealth === 'object'
        ? adapter._nwEmsSchedulerHealth
        : {};
    const schedulerHeartbeatAt = Math.max(newestTimestamp(adapter, ['ems.core.schedulerHeartbeatAt'], 0), Math.max(0, Math.round(finite(schedulerHealth.heartbeatAt, 0))));
    const schedulerHeartbeatAgeMs = schedulerHeartbeatAt > 0 ? Math.max(0, now - schedulerHeartbeatAt) : null;
    const schedulerKnown = schedulerHeartbeatAgeMs !== null;
    const schedulerFresh = !schedulerKnown
        || (schedulerHeartbeatAgeMs !== null && schedulerHeartbeatAgeMs <= schedulerFreshThresholdMs);
    const lastTickStartTs = newestTimestamp(adapter, ['ems.core.lastTickStart'], schedulerHealth.lastTickStartMs);
    const lastTickEndTs = newestTimestamp(adapter, ['ems.core.lastTickEnd'], schedulerHealth.lastTickEndMs);
    const lastTickTs = newestTimestamp(adapter, [
        'ems.core.lastTickStart',
        'ems.core.lastTickEnd',
        'ems.core.lastModuleStartedAt',
        'ems.core.lastModuleCompletedAt',
        'chargingManagement.summary.lastUpdate',
        'ems.budget.lastUpdate',
    ], audit && audit.ts);
    const tickRunning = bool(firstValue(adapter, ['ems.core.tickRunning'], schedulerHealth.tickRunning), Boolean(schedulerHealth.tickRunning));
    const activeTickAgeMs = tickRunning && lastTickStartTs > 0 ? Math.max(0, now - lastTickStartTs) : 0;
    const tickStalled = tickRunning && activeTickAgeMs > tickFreshThresholdMs;
    const lastTickDurationMs = Math.max(0, Math.round(finite(stateValue(adapter, 'ems.core.lastTickDurationMs', 0), 0)));
    const lastTickError = text(stateValue(adapter, 'ems.core.lastTickError', ''), '', 220);
    const lastTickAgeMs = lastTickTs > 0 ? Math.max(0, now - lastTickTs) : null;
    const lastCompletedTickAgeMs = lastTickEndTs > 0 ? Math.max(0, now - lastTickEndTs) : null;
    const tickKnown = lastTickAgeMs !== null;
    // A currently running cycle remains healthy until the EMS watchdog threshold.
    // Scheduler liveness is assessed independently, so a 20–30 s cycle is never
    // mislabelled as an offline adapter.
    const tickFresh = !tickKnown
        || (tickRunning ? !tickStalled : (lastTickAgeMs !== null && lastTickAgeMs <= tickFreshThresholdMs));
    const publisherStatus = text(publisherHealth.status, 'ok', 40).toLowerCase();
    const publisherDegraded = !['', 'ok', 'healthy'].includes(publisherStatus);
    const auditLimiterRaw = normalizeLimiter(firstValue(adapter, [
        'chargingManagement.audit.activeLimiter',
    ], audit && audit.activeLimiter));
    const auditLimiter = activeLimiterForDisplay(auditLimiterRaw);
    const chargingInformationalState = auditWallboxes.some((row) => row.limiter === 'no-charge-demand')
        ? 'no-charge-demand'
        : (auditWallboxes.some((row) => row.limiter === 'no-vehicle')
            ? 'no-vehicle'
            : (auditWallboxes.some((row) => row.limiter === 'pv-surplus') ? 'pv-surplus' : 'none'));
    const auditGrid = audit && audit.grid && typeof audit.grid === 'object' ? audit.grid : {};
    const effectiveImportLimitW = nullableNumber(auditGrid.effectiveLimitW ?? auditGrid.limitW);
    const currentImportW = Math.max(0, Math.round(finite(auditGrid.importW ?? gridImportW ?? (gridPowerW !== null && gridPowerW > 0 ? gridPowerW : 0), 0)));
    const gridSoftRampFactor = nullableNumber(auditGrid.softRampFactor);
    const gridReductionW = Math.max(0, Math.round(finite(auditGrid.reductionW, 0)));
    const gridControlBinding = bool(firstValue(adapter, [
        'chargingManagement.control.gridCapBinding',
    ], auditGrid.binding), false);
    const gridHardActive = effectiveImportLimitW !== null && effectiveImportLimitW > 0
        && currentImportW >= effectiveImportLimitW;
    const gridSoftActive = !gridHardActive && (gridControlBinding
        || gridReductionW > 0
        || (gridSoftRampFactor !== null && gridSoftRampFactor < 0.999));
    const gridLimitActive = gridHardActive || gridSoftActive;
    const gridMonitoring = effectiveImportLimitW !== null && effectiveImportLimitW > 0;
    const safetyStage = text(firstValue(adapter, [
        'chargingManagement.audit.safetyStage',
    ], audit && audit.safetyStage), 'NORMAL', 80);
    const safetyActive = safetyStage.toUpperCase() !== 'NORMAL'
        || bool(firstValue(adapter, ['chargingManagement.audit.safetyActive'], audit && audit.safetyActive), false);
    const safetyStop = safetyStage.toUpperCase() === 'EOS-SAFETY-STOP';
    const status = maxSeverity(statusFromAudit({ ...audit, activeLimiter: auditLimiter, safetyStage }, paraFallback, storageWriteOk, forecastFresh), (!adapterOnline || !safetyValid || safetyEmergencyStop || safetyStop || lastTickError)
        ? 'error'
        : (!schedulerFresh || tickStalled || !tickFresh || publisherDegraded || safetyActive ? 'warning' : (!tickKnown ? 'info' : 'ok')), 
    // A single unavailable charge point is a local partial fault. It remains
    // visible in the charge-point tile but must not label the complete EMS as
    // offline while NVP monitoring and the remaining devices continue safely.
    chargingFaultCount > 0 ? 'warning' : 'ok', gridHardActive ? 'error' : (gridSoftActive || exportLimitExceeded ? 'warning' : 'ok'));
    let binding = centralBudgetBinding !== 'none' ? centralBudgetBinding : auditLimiter;
    if (binding === 'none' && gridHardActive)
        binding = 'grid-hard';
    if (binding === 'none' && gridSoftActive)
        binding = 'grid-soft';
    if (binding === 'none' && exportLimitActive)
        binding = 'export-limit';
    if (binding === 'none' && paraFallback)
        binding = 'para14a';
    if (binding === 'none' && peakActive)
        binding = 'peak-shaving';
    if (binding === 'none' && storageWriteOk === false)
        binding = 'storage-write';
    let headline = 'EMS arbeitet normal';
    if (!adapterOnline)
        headline = 'NexoWatt UI ist offline';
    else if (schedulerKnown && !schedulerFresh)
        headline = 'Adapter online – EMS-Scheduler reagiert nicht';
    else if (tickStalled)
        headline = 'Adapter online – EMS-Regelzyklus überschreitet Zeitlimit';
    else if (!tickKnown)
        headline = 'EMS-Diagnose bereit – noch kein aktiver Regeltick';
    else if (!tickFresh)
        headline = 'Adapter online – EMS-Regelschleife verzögert';
    else if (publisherDegraded)
        headline = 'Adapter online – Diagnoseaktualisierung verzögert';
    else if (gridHardActive && safetyValid && !safetyEmergencyStop && !safetyStop)
        headline = 'Netzanschluss-Hardlimit aktiv';
    else if (status === 'error')
        headline = (!safetyValid || safetyEmergencyStop || safetyStop) ? 'EOS Safety überwacht – Regelung sicher eingeschränkt' : 'EMS-Teilstörung erkannt';
    else if (paraFallback)
        headline = '§14a-Kommunikationsfallback aktiv';
    else if (gridSoftActive)
        headline = gridReductionW > 0 ? 'Netzanschluss-Softlimit begrenzt aktuell die Regelung' : 'Netzanschluss-Softlimit aktiv';
    else if (exportLimitActive)
        headline = 'Export-Limit begrenzt aktuell die Einspeisung';
    else if (exportLimitExceeded)
        headline = 'Export-Limit überschritten – Diagnosemodus';
    else if (auditLimiter !== 'none')
        headline = `${humanizeLimiter(auditLimiter)} begrenzt aktuell die Regelung`;
    else if (chargingActiveCount > 0)
        headline = `${chargingActiveCount} Ladepunkt${chargingActiveCount === 1 ? '' : 'e'} aktiv`;
    else if (chargingWaitingCount > 0 && chargingInformationalState === 'no-charge-demand')
        headline = 'Kein aktiver Ladebedarf – Netzschutz überwacht';
    else if (chargingWaitingCount > 0)
        headline = `${chargingWaitingCount} Fahrzeug${chargingWaitingCount === 1 ? '' : 'e'} wartet${chargingWaitingCount === 1 ? '' : 'en'} – Netzschutz überwacht`;
    else if (storageAvailable && Math.abs(storageTargetW) > 50)
        headline = storageTargetW < 0 ? 'Speicherladung aktiv' : 'Speicherentladung aktiv';
    else if (gridMonitoring)
        headline = 'EMS arbeitet normal – NVP-Bezug wird überwacht';
    const adapterVersion = text(adapter && adapter.version, text(adapter && adapter.packageVersion, '', 32), 32)
        || text(adapter && adapter.ioPack && adapter.ioPack.common && adapter.ioPack.common.version, '', 32);
    const port = Math.max(1, Math.round(finite(adapter && adapter.config && adapter.config.port, 8188)));
    // Keep the health explanation as an explicit decision tree. This is easier
    // to audit than a deeply nested ternary and documents why "adapter online",
    // "EMS tick stale" and "diagnostic publisher delayed" are different states.
    let overviewReason = audit && (audit.status || audit.mode);
    if (!adapterOnline) {
        overviewReason = 'Die Adapterinstanz meldet info.connection=false. Diagnose- und Regelwerte sind deshalb nicht als aktuell zu behandeln.';
    }
    else if (schedulerKnown && !schedulerFresh) {
        overviewReason = `Der Adapter ist online, aber das unabhängige EMS-Scheduler-Lebenszeichen ist älter als ${Math.round(schedulerFreshThresholdMs / 1000)} Sekunden.`;
    }
    else if (tickStalled) {
        overviewReason = `Der Adapter und Scheduler sind online, aber der aktuelle EMS-Regelzyklus läuft seit mehr als ${Math.round(tickFreshThresholdMs / 1000)} Sekunden.`;
    }
    else if (tickKnown && !tickFresh) {
        overviewReason = `Der Adapter ist online, aber der letzte EMS-Regelzyklus ist älter als ${Math.round(tickFreshThresholdMs / 1000)} Sekunden.`;
    }
    else if (publisherDegraded) {
        overviewReason = 'Der Adapter und die EMS-Regelung sind erreichbar; mindestens ein rein diagnostischer Lese- oder Schreibzugriff war verzögert.';
    }
    else if (!tickKnown) {
        overviewReason = 'Noch kein Regeltick veröffentlicht; optionale EMS-Module dürfen deaktiviert sein.';
    }
    else if (status === 'error') {
        overviewReason = safetyReason || lastTickError || (audit && (audit.safetyReason || audit.status));
    }
    else if (binding !== 'none') {
        overviewReason = humanizeLimiter(binding);
    }
    else if (gridMonitoring) {
        overviewReason = `NVP-Bezug wird dauerhaft überwacht und liegt aktuell unter Soft- und Hardlimit. ${exportLimitEnabled ? 'Die Einspeisung wird über das konfigurierte Export-Limit überwacht.' : 'Die Einspeisung wird ohne aktiviertes Export-Limit nicht begrenzt.'}`;
    }
    return {
        schemaVersion: 1,
        generatedAt: now,
        updatedAt: now,
        adapterVersion,
        available: true,
        status,
        headline,
        reason: text(overviewReason, status === 'ok'
            ? (gridMonitoring ? 'NVP-Bezug überwacht – keine aktive Begrenzung.' : 'EMS arbeitet innerhalb aller aktiven Grenzen.')
            : humanizeLimiter(binding), 260),
        binding,
        details: { port, path: '/ems-apps.html?tab=status' },
        adapter: {
            online: adapterOnline,
            connectionState: adapterOnline ? 'online' : 'offline',
        },
        publisher: {
            status: publisherStatus || 'ok',
            healthy: !publisherDegraded,
            heartbeatAt: Math.max(0, Math.round(finite(publisherHealth.heartbeatAt, 0))),
            lastSuccessAt: Math.max(0, Math.round(finite(publisherHealth.lastSuccessAt, 0))),
            fullSnapshotAt: Math.max(0, Math.round(finite(publisherHealth.fullSnapshotAt, now))),
            snapshotAgeMs: Math.max(0, now - Math.max(0, Math.round(finite(publisherHealth.fullSnapshotAt, now)))),
            cycleDurationMs: Math.max(0, Math.round(finite(publisherHealth.cycleDurationMs, 0))),
            readTimeouts: Math.max(0, Math.round(finite(publisherHealth.readTimeouts, 0))),
            writeTimeouts: Math.max(0, Math.round(finite(publisherHealth.writeTimeouts, 0))),
            readErrors: Math.max(0, Math.round(finite(publisherHealth.readErrors, 0))),
            writeErrors: Math.max(0, Math.round(finite(publisherHealth.writeErrors, 0))),
            pendingOperations: Math.max(0, Math.round(finite(publisherHealth.pendingOperations, 0))),
            lastError: text(publisherHealth.lastError, '', 220),
        },
        ems: {
            active: adapterOnline && bool(firstValue(adapter, ['chargingManagement.control.active', 'ems.budget.active'], true), true),
            online: adapterOnline,
            schedulerKnown,
            schedulerFresh,
            schedulerFreshThresholdMs,
            schedulerHeartbeatAt,
            schedulerHeartbeatAgeMs,
            tickRunning,
            tickFresh,
            tickKnown,
            tickStalled,
            tickFreshThresholdMs,
            activeTickAgeMs,
            health: !adapterOnline
                ? 'offline'
                : (!schedulerFresh ? 'scheduler-stale' : (tickStalled ? 'tick-stalled' : (tickFresh ? 'ok' : 'tick-stale'))),
            mode: controlMode || centralBudgetMode,
            status: controlStatus,
            lastTickTs,
            lastTickStartTs,
            lastTickEndTs,
            lastTickAgeMs,
            lastCompletedTickAgeMs,
            cycleMs: lastTickDurationMs,
            lastError: lastTickError,
            safetyStage,
            safetyValid,
            safetyEmergencyStop,
            safetyActive,
            safetyReason,
            problemCount: Math.max(0, Math.round(finite(firstValue(adapter, ['chargingManagement.audit.problemCount'], audit && audit.problemCount), 0))),
            decision: headline,
        },
        budget: {
            available: centralBudgetActive || budgetTotalW > 0 || budgetRemainingW > 0,
            active: centralBudgetActive,
            mode: centralBudgetMode,
            source: centralBudgetSource,
            updatedAt: centralBudgetUpdatedAt,
            totalW: budgetTotalW,
            usedW: budgetUsedW,
            remainingW: budgetRemainingW,
            pvBudgetW,
            remainingPvW,
            gridW: gridPowerW,
            gridImportW,
            gridExportW,
            pvPowerW,
            gridHeadroomW: safetyGridHeadroomW,
            evcsSafetyCapW: safetyEvcsCapW,
            binding,
            bindingText: binding === 'storage-write'
                ? 'Speicher-Schreibstatus'
                : (binding === 'none' && gridMonitoring ? 'NVP-Bezug überwacht – keine aktive Begrenzung' : humanizeLimiter(binding)),
            rawBinding: centralBudgetBindingRaw,
            gridMonitoring,
            gridSoftActive,
            gridHardActive,
            gridBinding: gridLimitActive,
            phaseBinding: bool(firstValue(adapter, ['chargingManagement.control.phaseCapBinding'], audit && audit.phase && audit.phase.binding), false),
            para14aBinding: paraBinding,
            exportLimitEnabled,
            exportLimitDiagnosticOnly,
            exportLimitExceeded,
            exportLimitActive,
            exportLimitOverW,
            exportLimitStatus,
        },
        charging: {
            available: configuredWallboxCount > 0 || auditWallboxes.length > 0,
            configuredCount: Math.max(configuredWallboxCount, auditWallboxes.length),
            activeCount: chargingActiveCount,
            waitingCount: chargingWaitingCount,
            faultCount: chargingFaultCount,
            actualW: chargingActualW,
            targetW: chargingTargetW,
            reservedW: chargingReservedW,
            limiter: auditLimiter,
            limiterText: humanizeLimiter(auditLimiter),
            informationalState: chargingInformationalState !== 'none'
                ? chargingInformationalState
                : (isInformationalLimiter(auditLimiterRaw) && auditLimiterRaw !== 'none' ? auditLimiterRaw : 'none'),
            status: controlStatus,
            wallboxes: auditWallboxes.slice(0, 12),
        },
        storage: {
            available: storageAvailable,
            active: bool(stateValue(adapter, 'speicher.regelung.aktiv', false), false),
            topology: storageTopology,
            socPct: storageSocPct,
            actualW: storageActualW,
            targetW: storageTargetW,
            writeOk: storageWriteOk,
            writeStatus: storageWriteStatus,
            reason: storageReason,
        },
        para14a: {
            available: paraActive || paraFallback || paraBinding,
            active: paraActive,
            binding: paraBinding,
            communicationFallbackActive: paraFallback,
            fallbackCapW: paraFallbackCapW,
            fallbackReason: text(stateValue(adapter, 'para14a.communicationFallbackReason', ''), '', 180),
            signalFresh: bool(stateValue(adapter, 'para14a.signalFresh', false), false),
            signalStatus: text(stateValue(adapter, 'para14a.signalStatus', ''), '', 80),
        },
        peakShaving: {
            available: peakStatus !== 'off' && peakStatus !== '',
            active: peakActive,
            status: peakStatus,
        },
        tariff: {
            available: tariffActive,
            active: tariffActive,
            state: tariffState,
            fresh: tariffFresh,
            priceEurPerKwh: tariffPrice,
            netFeeMode: text(stateValue(adapter, 'tarif.netFeeMode', ''), '', 40),
            statusText: text(stateValue(adapter, 'tarif.statusText', ''), '', 180),
        },
        forecast: {
            available: forecastSource !== 'none' || forecastFresh === true,
            source: forecastSource,
            fresh: forecastFresh,
            updatedAt: forecastUpdatedAt,
            powerNowW: forecastPowerNowW,
            energy6hWh: Math.max(0, Math.round(finite(stateValue(adapter, 'forecast.effective.energy6hWh', 0), 0))),
            energy12hWh: Math.max(0, Math.round(finite(stateValue(adapter, 'forecast.effective.energy12hWh', 0), 0))),
            energy24hWh: Math.max(0, Math.round(finite(stateValue(adapter, 'forecast.effective.energy24hWh', 0), 0))),
            error: forecastError,
        },
        modules: {
            charging: configuredWallboxCount > 0 || auditWallboxes.length > 0,
            storage: storageAvailable,
            para14a: paraActive || paraFallback || paraBinding,
            peakShaving: peakStatus !== 'off' && peakStatus !== '',
            tariff: tariffActive,
            forecast: forecastSource !== 'none' || forecastFresh === true,
        },
        currentDecisions: [
            {
                subsystem: 'charging',
                severity: chargingFaultCount > 0 ? 'error' : (chargingWaitingCount > 0 ? 'info' : 'ok'),
                title: configuredWallboxCount || auditWallboxes.length
                    ? `${chargingActiveCount} lädt · ${chargingWaitingCount} wartet · ${chargingFaultCount} gestört`
                    : 'Keine aktiven Ladepunkte',
                reason: text((audit && (audit.safetyReason || audit.status)) || humanizeLimiter(auditLimiter), '', 180),
                details: `Ist ${chargingActualW} W · Soll ${chargingTargetW} W · reserviert ${chargingReservedW} W`,
            },
            ...(storageAvailable ? [{
                    subsystem: 'storage',
                    severity: storageWriteOk === false ? 'error' : 'ok',
                    title: `Speicher ${storageTopology}${storageSocPct !== null ? ` · SoC ${Math.round(storageSocPct)} %` : ''}`,
                    reason: storageReason,
                    details: `Ist ${storageActualW} W · Soll ${storageTargetW} W${storageWriteStatus ? ` · ${storageWriteStatus}` : ''}`,
                }] : []),
            ...(centralBudgetActive || budgetTotalW > 0 ? [{
                    subsystem: 'budget',
                    severity: binding !== 'none' ? 'warning' : 'ok',
                    title: `Restbudget ${budgetRemainingW} W`,
                    reason: binding !== 'none'
                        ? humanizeLimiter(binding)
                        : (gridMonitoring ? 'NVP-Bezug überwacht – aktuell keine aktive Begrenzung' : (centralBudgetMode || 'Zentrale Budgetkoordination')),
                    details: `Gesamt ${budgetTotalW} W · genutzt ${budgetUsedW} W · PV-Rest ${remainingPvW} W`,
                }] : []),
        ].slice(0, 6),
    };
}
function eventSignature(contract) {
    return JSON.stringify({
        status: contract.status,
        headline: contract.headline,
        binding: contract.binding,
        budget: [contract.budget.gridSoftActive, contract.budget.gridHardActive, contract.budget.exportLimitExceeded, contract.budget.exportLimitActive],
        charging: [contract.charging.activeCount, contract.charging.waitingCount, contract.charging.faultCount, contract.charging.limiter, contract.charging.informationalState],
        storage: [contract.storage.available, contract.storage.topology, contract.storage.writeOk, contract.storage.reason],
        para14a: [contract.para14a.active, contract.para14a.binding, contract.para14a.communicationFallbackActive, contract.para14a.fallbackCapW],
        tariff: [contract.tariff.active, contract.tariff.state, contract.tariff.fresh],
        forecast: [contract.forecast.available, contract.forecast.source, contract.forecast.fresh],
    });
}
function overviewEvent(contract, now) {
    const messageParts = [];
    if (contract.charging.available)
        messageParts.push(`EVCS Ist ${contract.charging.actualW} W / Soll ${contract.charging.targetW} W`);
    if (contract.storage.available)
        messageParts.push(`Speicher Ist ${contract.storage.actualW} W / Soll ${contract.storage.targetW} W`);
    if (contract.budget.totalW > 0)
        messageParts.push(`Restbudget ${contract.budget.remainingW} W`);
    return {
        id: `overview-${now}`,
        ts: now,
        severity: contract.status,
        subsystem: contract.binding !== 'none' ? contract.binding : 'ems',
        title: contract.headline,
        message: messageParts.join(' · ') || contract.ems.status || 'EMS-Zustand aktualisiert',
        reason: contract.budget.bindingText,
        actualW: contract.charging.actualW,
        targetW: contract.charging.targetW,
    };
}
function normalizeAuditEvent(event) {
    if (!event || typeof event !== 'object')
        return null;
    const ts = Math.max(0, Math.round(finite(event.ts, 0)));
    if (!ts)
        return null;
    const severityRaw = text(event.severity, 'info', 20).toLowerCase();
    const eventLimiter = normalizeLimiter(event.limiter);
    const normalizedSeverity = ['error', 'warning', 'warn', 'info', 'ok'].includes(severityRaw)
        ? (severityRaw === 'warn' ? 'warning' : severityRaw)
        : 'info';
    const informational = isInformationalLimiter(eventLimiter);
    const severity = informational && normalizedSeverity === 'warning' ? 'info' : normalizedSeverity;
    const legacyNoDemandMessage = eventLimiter === 'no-charge-demand'
        && /aktive begrenzung|begrenzt aktuell/i.test(String(event.message || event.reason || ''));
    return {
        id: `audit-${ts}-${text(event.safe || event.type, 'global', 40)}-${text(event.limiter, 'none', 40)}`,
        ts,
        severity,
        subsystem: text(event.type, 'charging', 40),
        title: text(event.name, 'Lademanagement', 100),
        message: legacyNoDemandMessage
            ? 'Fahrzeug wartet ohne aktiven Ladebedarf; der NVP-Bezug wird weiterhin überwacht.'
            : text(event.message || event.reason, '', 280),
        reason: informational
            ? (eventLimiter === 'no-charge-demand' ? 'Keine aktive Begrenzung' : humanizeLimiter(eventLimiter))
            : text(event.reason || event.limiter, '', 160),
        actualW: nullableNumber(event.actualPowerW) ?? undefined,
        targetW: nullableNumber(event.targetPowerW) ?? undefined,
    };
}
class AdminOverviewPublisher {
    constructor(adapter, options = {}) {
        this.timer = null;
        this.heartbeatTimer = null;
        this.heartbeatRunning = false;
        this.running = false;
        this.runningSince = 0;
        this.stopped = false;
        this.lastSignature = '';
        this.lastValues = new Map();
        this.events = [];
        this.maxEvents = 60;
        this.inFlight = new Map();
        this.lastSuccessAt = 0;
        this.fullSnapshotAt = 0;
        this.lastHeartbeatAt = 0;
        this.lastSummaryRefreshAt = 0;
        this.lastContract = null;
        this.lastWarningAt = 0;
        this.cycleReadTimeouts = 0;
        this.cycleWriteTimeouts = 0;
        this.cycleReadErrors = 0;
        this.cycleWriteErrors = 0;
        this.cycleLastError = '';
        this.adapter = adapter;
        this.intervalMs = Math.max(1000, Math.round(finite(options.intervalMs, DEFAULT_PUBLISH_INTERVAL_MS)));
        this.heartbeatIntervalMs = Math.max(500, Math.round(finite(options.heartbeatIntervalMs, DEFAULT_HEARTBEAT_INTERVAL_MS)));
        this.readTimeoutMs = Math.max(20, Math.round(finite(options.readTimeoutMs, DEFAULT_STATE_READ_TIMEOUT_MS)));
        this.writeTimeoutMs = Math.max(20, Math.round(finite(options.writeTimeoutMs, DEFAULT_STATE_WRITE_TIMEOUT_MS)));
        this.objectTimeoutMs = Math.max(50, Math.round(finite(options.objectTimeoutMs, DEFAULT_OBJECT_TIMEOUT_MS)));
        this.ioConcurrency = Math.max(1, Math.min(16, Math.round(finite(options.ioConcurrency, DEFAULT_IO_CONCURRENCY))));
        this.tickFreshThresholdMs = Math.max(10000, Math.round(finite(options.tickFreshThresholdMs, DEFAULT_TICK_FRESH_THRESHOLD_MS)));
        this.schedulerFreshThresholdMs = Math.max(8000, Math.round(finite(options.schedulerFreshThresholdMs, DEFAULT_SCHEDULER_FRESH_THRESHOLD_MS)));
    }
    async initialize() {
        await this.ensureStates();
        this.updateInternalHealth(Date.now(), 'initializing');
        await this.heartbeat('startup', true);
        this.startHeartbeatTimer();
        await this.restoreEvents();
        for (const pattern of [
            'chargingManagement.audit.*',
            'chargingManagement.control.*',
            'chargingManagement.summary.*',
            'ems.core.*',
            'ems.budget.*',
            'speicher.regelung.*',
            'para14a.*',
            'peakShaving.control.*',
            'tarif.*',
            'forecast.*',
            'gridConstraints.exportLimit.*',
        ]) {
            try {
                await this.adapter.subscribeForeignStatesAsync(`${this.adapter.namespace}.${pattern}`);
            }
            catch (_error) { }
        }
        await this.primeStates();
        await this.tick('startup');
        const callback = () => { this.tick('timer').catch(() => { }); };
        this.timer = typeof this.adapter._nwSetInterval === 'function'
            ? this.adapter._nwSetInterval(callback, this.intervalMs)
            : (typeof this.adapter.setInterval === 'function' ? this.adapter.setInterval(callback, this.intervalMs) : setInterval(callback, this.intervalMs));
    }
    startHeartbeatTimer() {
        if (this.stopped || this.heartbeatTimer || this.adapter._nwShuttingDown)
            return;
        const callback = () => { this.heartbeat('timer').catch(() => { }); };
        this.heartbeatTimer = typeof this.adapter._nwSetInterval === 'function'
            ? this.adapter._nwSetInterval(callback, this.heartbeatIntervalMs)
            : (typeof this.adapter.setInterval === 'function' ? this.adapter.setInterval(callback, this.heartbeatIntervalMs) : setInterval(callback, this.heartbeatIntervalMs));
    }
    clearTimer(timer) {
        if (!timer)
            return;
        try {
            if (typeof this.adapter._nwClearInterval === 'function')
                this.adapter._nwClearInterval(timer);
            else if (typeof this.adapter.clearInterval === 'function')
                this.adapter.clearInterval(timer);
            else
                clearInterval(timer);
        }
        catch (_error) { }
    }
    stop() {
        this.stopped = true;
        this.clearTimer(this.timer);
        this.clearTimer(this.heartbeatTimer);
        this.timer = null;
        this.heartbeatTimer = null;
        // In-flight ioBroker Promises cannot always be cancelled. Clearing our
        // bounded registry removes the publisher's own references during adapter
        // shutdown; no follow-up operation is started because `stopped` is true.
        this.inFlight.clear();
    }
    async tick(reason = 'manual') {
        if (this.stopped || this.running || this.adapter._nwShuttingDown)
            return;
        this.running = true;
        this.runningSince = Date.now();
        this.resetCycleDiagnostics();
        try {
            // Independent liveness heartbeat: this call is not tied to the full
            // diagnostic refresh and therefore remains current even when a module or
            // ioBroker read takes longer than the Admin stale window.
            await this.heartbeat(`cycle-${reason}`, false);
            await this.primeVolatileStates();
            const now = Date.now();
            this.updateInternalHealth(now, this.cycleReadTimeouts || this.cycleReadErrors ? 'degraded' : 'ok');
            const contract = buildOverviewContract(this.adapter, now);
            this.fullSnapshotAt = now;
            this.lastContract = contract;
            this.ingestAuditEvents();
            const signature = eventSignature(contract);
            if (signature !== this.lastSignature) {
                this.events.push(overviewEvent(contract, now));
                this.lastSignature = signature;
            }
            this.dedupeAndTrimEvents();
            const published = await this.publish(contract);
            if (published)
                this.lastSuccessAt = Date.now();
        }
        catch (error) {
            this.cycleLastError = text(error && error.message, String(error || 'unknown overview error'), 220);
            this.noteCycleFailure('write', false, this.cycleLastError);
        }
        finally {
            const finishedAt = Date.now();
            const cycleDurationMs = Math.max(0, finishedAt - this.runningSince);
            const healthStatus = this.cycleReadTimeouts || this.cycleWriteTimeouts || this.cycleReadErrors || this.cycleWriteErrors
                ? 'degraded'
                : 'ok';
            this.updateInternalHealth(finishedAt, healthStatus, cycleDurationMs);
            await this.publishHealthStates(finishedAt, healthStatus, cycleDurationMs, reason);
            await this.heartbeat(`cycle-finished-${reason}`, false);
            this.logCycleDegradation(finishedAt, healthStatus, reason);
            this.running = false;
            this.runningSince = 0;
        }
    }
    /**
     * Independent compatibility heartbeat for EOS Admin.
     *
     * It deliberately does not use the full-cycle `running` lock. This prevents a
     * healthy adapter from becoming "Offline / veraltet" while a legitimate EMS
     * cycle or a bounded diagnostic read is still in progress. A dead process or
     * stopped HTTP server still stops this heartbeat and is therefore detected.
     */
    async heartbeat(reason = 'manual', forceSummary = false) {
        if (this.stopped || this.heartbeatRunning || this.adapter._nwShuttingDown)
            return;
        this.heartbeatRunning = true;
        const now = Date.now();
        this.lastHeartbeatAt = now;
        try {
            const currentStatus = text(this.adapter?._nwAdminOverviewPublisherHealth?.status, this.running ? 'refreshing' : 'ok', 40);
            this.updateInternalHealth(now, currentStatus, this.running && this.runningSince > 0 ? now - this.runningSince : 0);
            const health = buildOverviewContract(this.adapter, now);
            health.updatedAt = now;
            health.generatedAt = now;
            if (health.publisher && typeof health.publisher === 'object') {
                health.publisher.heartbeatAt = now;
                health.publisher.fullSnapshotAt = this.fullSnapshotAt;
                health.publisher.snapshotAgeMs = this.fullSnapshotAt > 0 ? Math.max(0, now - this.fullSnapshotAt) : 0;
            }
            this.lastContract = health;
            try {
                this.adapter._nwAdminOverview = health;
            }
            catch (_error) { }
            const adapterOnline = health.adapter?.online === true;
            const values = [
                ['updatedAt', now, true],
                ['publisherHeartbeatAt', now, true],
                ['adapterOnline', adapterOnline, true],
                ['emsSchedulerFresh', health.ems?.schedulerFresh !== false, true],
                ['emsSchedulerHeartbeatAt', finite(health.ems?.schedulerHeartbeatAt, 0), true],
                ['emsSchedulerHeartbeatAgeMs', finite(health.ems?.schedulerHeartbeatAgeMs, 0), true],
                ['emsTickRunning', health.ems?.tickRunning === true, true],
                ['emsTickStalled', health.ems?.tickStalled === true, true],
                ['emsTickFresh', health.ems?.tickFresh !== false, true],
                ['emsTickAgeMs', finite(health.ems?.lastTickAgeMs, 0), true],
            ];
            await mapWithConcurrency(values, Math.min(4, this.ioConcurrency), async ([id, value, force]) => (this.setIfChanged(`info.adminOverview.${id}`, value, Boolean(force))));
            // Normally the full five-second snapshot refreshes summaryJson. Only when
            // that cycle is delayed do we refresh the compact payload from the live
            // state cache. This keeps compatibility with Admin versions that inspect
            // the JSON timestamp, without doubling normal state traffic.
            const summaryRefreshThresholdMs = Math.max(7000, this.heartbeatIntervalMs * 2);
            if (forceSummary || this.lastSummaryRefreshAt <= 0 || now - this.lastSummaryRefreshAt >= summaryRefreshThresholdMs) {
                const summaryWritten = await this.setIfChanged('info.adminOverview.summaryJson', JSON.stringify(health), true);
                if (summaryWritten)
                    this.lastSummaryRefreshAt = now;
            }
            await this.setIfChanged('info.adminOverview.publisherLastReason', text(`heartbeat-${reason}`, 'heartbeat', 40));
        }
        finally {
            this.heartbeatRunning = false;
        }
    }
    resetCycleDiagnostics() {
        this.cycleReadTimeouts = 0;
        this.cycleWriteTimeouts = 0;
        this.cycleReadErrors = 0;
        this.cycleWriteErrors = 0;
        this.cycleLastError = '';
    }
    noteCycleFailure(kind, timedOut, message) {
        if (kind === 'read') {
            if (timedOut)
                this.cycleReadTimeouts += 1;
            else
                this.cycleReadErrors += 1;
        }
        else if (timedOut)
            this.cycleWriteTimeouts += 1;
        else
            this.cycleWriteErrors += 1;
        if (!this.cycleLastError)
            this.cycleLastError = text(message, 'diagnostic I/O failed', 220);
    }
    updateInternalHealth(now, status, cycleDurationMs = 0) {
        // This object is local process telemetry only. `buildOverviewContract` reads
        // it synchronously, so no additional database request is needed merely to
        // describe the publisher that is already running inside this adapter.
        this.adapter._nwAdminOverviewPublisherHealth = {
            status,
            heartbeatAt: now,
            lastSuccessAt: this.lastSuccessAt,
            cycleDurationMs,
            readTimeouts: this.cycleReadTimeouts,
            writeTimeouts: this.cycleWriteTimeouts,
            readErrors: this.cycleReadErrors,
            writeErrors: this.cycleWriteErrors,
            pendingOperations: this.inFlight.size,
            lastError: this.cycleLastError,
            tickFreshThresholdMs: this.tickFreshThresholdMs,
            schedulerFreshThresholdMs: this.schedulerFreshThresholdMs,
            fullSnapshotAt: this.fullSnapshotAt,
        };
    }
    logCycleDegradation(now, status, reason) {
        if (status === 'ok' || now - this.lastWarningAt < 60000)
            return;
        this.lastWarningAt = now;
        try {
            this.adapter.log?.warn?.(`[admin-overview] Diagnosezyklus ${reason} verzögert: `
                + `readTimeouts=${this.cycleReadTimeouts}, writeTimeouts=${this.cycleWriteTimeouts}, `
                + `readErrors=${this.cycleReadErrors}, writeErrors=${this.cycleWriteErrors}, `
                + `pending=${this.inFlight.size}${this.cycleLastError ? `, last=${this.cycleLastError}` : ''}`);
        }
        catch (_error) { }
    }
    async runOperation(kind, label, timeoutMs, task) {
        const operationKey = `${kind}:${label}`;
        let operation = this.inFlight.get(operationKey);
        const reused = Boolean(operation);
        if (!operation) {
            operation = Promise.resolve().then(task);
            this.inFlight.set(operationKey, operation);
            const cleanup = () => {
                if (this.inFlight.get(operationKey) === operation)
                    this.inFlight.delete(operationKey);
            };
            // Both fulfillment and rejection must release the bounded registry. The
            // second callback also consumes a late rejection after our timeout, so it
            // can never surface as an unhandled Promise rejection.
            operation.then(cleanup, cleanup);
        }
        try {
            const value = await waitWithTimeout(operation, timeoutMs, operationKey);
            return { ok: true, value, timedOut: false, reused, error: '' };
        }
        catch (error) {
            const timedOut = error instanceof AdminOverviewTimeoutError;
            const message = text(error && error.message, String(error || `${operationKey} failed`), 220);
            this.noteCycleFailure(kind, timedOut, message);
            return { ok: false, timedOut, reused, error: message };
        }
    }
    async readState(id) {
        return this.runOperation('read', `state:${id}`, this.readTimeoutMs, async () => this.adapter.getStateAsync(id));
    }
    async writeState(id, value) {
        return this.runOperation('write', `state:${id}`, this.writeTimeoutMs, async () => (this.adapter.setStateAsync(id, { val: value, ack: true })));
    }
    async ensureObject(id, object) {
        const result = await this.runOperation('write', `object:${id}`, this.objectTimeoutMs, async () => this.adapter.setObjectNotExistsAsync(id, object));
        if (!result.ok)
            throw new Error(`Admin overview object ${id} could not be ensured: ${result.error}`);
    }
    async publishHealthStates(now, status, cycleDurationMs, reason) {
        const health = buildOverviewContract(this.adapter, now);
        const lastTickTs = Math.max(0, Math.round(finite(health.ems?.lastTickTs, 0)));
        const tickAgeMs = lastTickTs > 0 ? Math.max(0, now - lastTickTs) : 0;
        const adapterOnline = health.adapter?.online === true;
        const values = [
            ['publisherHeartbeatAt', now, true],
            ['publisherLastSuccessAt', this.lastSuccessAt, true],
            ['publisherStatus', status],
            ['publisherCycleDurationMs', cycleDurationMs, true],
            ['publisherReadTimeoutCount', this.cycleReadTimeouts, true],
            ['publisherWriteTimeoutCount', this.cycleWriteTimeouts, true],
            ['publisherPendingOperationCount', this.inFlight.size, true],
            ['publisherLastError', this.cycleLastError],
            ['publisherLastReason', text(reason, 'timer', 40)],
            ['adapterOnline', adapterOnline, true],
            ['emsSchedulerFresh', health.ems?.schedulerFresh !== false, true],
            ['emsSchedulerHeartbeatAt', finite(health.ems?.schedulerHeartbeatAt, 0), true],
            ['emsSchedulerHeartbeatAgeMs', finite(health.ems?.schedulerHeartbeatAgeMs, 0), true],
            ['emsTickRunning', health.ems?.tickRunning === true, true],
            ['emsTickStalled', health.ems?.tickStalled === true, true],
            ['emsTickFresh', health.ems?.tickFresh !== false, true],
            ['emsTickAgeMs', tickAgeMs, true],
        ];
        await mapWithConcurrency(values, Math.min(4, this.ioConcurrency), async ([id, value, force]) => (this.setIfChanged(`info.adminOverview.${id}`, value, Boolean(force))));
    }
    async ensureStates() {
        await this.ensureObject('info.adminOverview', {
            type: 'channel', common: { name: 'NexoWatt EMS Live-Diagnose für EOS Admin' }, native: {},
        });
        const ensure = async (id, name, type, role, def) => {
            await this.ensureObject(`info.adminOverview.${id}`, {
                type: 'state',
                common: { name, type, role, read: true, write: false, def },
                native: {},
            });
        };
        await ensure('schemaVersion', 'EMS-Übersichtsvertrag Version', 'number', 'value', 1);
        await ensure('available', 'EMS-Übersicht verfügbar', 'boolean', 'indicator', false);
        await ensure('status', 'EMS-Gesamtstatus', 'string', 'text', 'info');
        await ensure('headline', 'EMS-Statusüberschrift', 'string', 'text', 'EMS wird initialisiert');
        await ensure('reason', 'EMS-Entscheidungsgrund', 'string', 'text', '');
        await ensure('binding', 'Aktiv bindende Begrenzung', 'string', 'text', 'none');
        await ensure('updatedAt', 'EMS-Übersicht aktualisiert', 'number', 'value.time', 0);
        await ensure('summaryJson', 'EMS-Übersicht kompakt (JSON)', 'string', 'json', '{}');
        await ensure('eventsJson', 'Letzte EMS-Entscheidungen (JSON)', 'string', 'json', '[]');
        await ensure('eventCount', 'Anzahl EMS-Entscheidungen im Ringpuffer', 'number', 'value', 0);
        // Separate health states keep adapter connectivity, EMS tick freshness and
        // the read-only publisher lifecycle distinguishable for current and future
        // EOS-Admin versions. None of these states participates in EMS arbitration.
        await ensure('adapterOnline', 'Adapter/Web-API online', 'boolean', 'indicator.connected', false);
        await ensure('emsSchedulerFresh', 'EMS-Scheduler-Lebenszeichen aktuell', 'boolean', 'indicator', false);
        await ensure('emsSchedulerHeartbeatAt', 'Letztes EMS-Scheduler-Lebenszeichen', 'number', 'value.time', 0);
        await ensure('emsSchedulerHeartbeatAgeMs', 'Alter des EMS-Scheduler-Lebenszeichens', 'number', 'value.interval', 0);
        await ensure('emsTickRunning', 'EMS-Regelzyklus läuft', 'boolean', 'indicator.working', false);
        await ensure('emsTickStalled', 'EMS-Regelzyklus überschreitet Zeitlimit', 'boolean', 'indicator', false);
        await ensure('emsTickFresh', 'EMS-Regeltick aktuell', 'boolean', 'indicator', false);
        await ensure('emsTickAgeMs', 'Alter der jüngsten EMS-Aktivität', 'number', 'value.interval', 0);
        await ensure('publisherHeartbeatAt', 'Diagnose-Publisher Heartbeat', 'number', 'value.time', 0);
        await ensure('publisherLastSuccessAt', 'Letzte vollständig veröffentlichte Diagnose', 'number', 'value.time', 0);
        await ensure('publisherStatus', 'Status des Diagnose-Publishers', 'string', 'text', 'initializing');
        await ensure('publisherCycleDurationMs', 'Laufzeit des Diagnosezyklus', 'number', 'value.interval', 0);
        await ensure('publisherReadTimeoutCount', 'Diagnose-Lesezeitüberschreitungen im letzten Zyklus', 'number', 'value', 0);
        await ensure('publisherWriteTimeoutCount', 'Diagnose-Schreibzeitüberschreitungen im letzten Zyklus', 'number', 'value', 0);
        await ensure('publisherPendingOperationCount', 'Noch offene Diagnoseoperationen', 'number', 'value', 0);
        await ensure('publisherLastError', 'Letzter Diagnosefehler', 'string', 'text', '');
        await ensure('publisherLastReason', 'Auslöser des letzten Diagnosezyklus', 'string', 'text', 'startup');
    }
    async restoreEvents() {
        try {
            const read = await this.readState('info.adminOverview.eventsJson');
            if (!read.ok)
                return;
            const state = read.value;
            const parsed = parseJson(state && state.val, []);
            if (Array.isArray(parsed)) {
                this.events = parsed.filter((event) => event && typeof event === 'object')
                    .map((event) => {
                    const title = text(event.title, 'EMS', 120);
                    const legacyFalseNoDemand = /kein fahrzeug-ladebedarf.*begrenzt aktuell/i.test(title);
                    return {
                        id: text(event.id, `restored-${event.ts}`, 120),
                        ts: Math.max(0, Math.round(finite(event.ts, 0))),
                        severity: legacyFalseNoDemand
                            ? 'info'
                            : (['ok', 'info', 'warning', 'error'].includes(String(event.severity)) ? event.severity : 'info'),
                        subsystem: text(event.subsystem, 'ems', 60),
                        title: legacyFalseNoDemand ? 'Kein aktiver Ladebedarf – Netzschutz überwacht' : title,
                        message: text(event.message, '', 280),
                        reason: legacyFalseNoDemand ? 'Keine aktive Begrenzung' : text(event.reason, '', 160),
                        actualW: nullableNumber(event.actualW) ?? undefined,
                        targetW: nullableNumber(event.targetW) ?? undefined,
                    };
                })
                    .filter((event) => event.ts > 0)
                    .slice(-this.maxEvents);
            }
        }
        catch (_error) { }
    }
    async primeStates() {
        const keys = [
            'chargingManagement.audit.snapshotJson', 'chargingManagement.audit.recentEventsJson',
            'chargingManagement.audit.activeLimiter', 'chargingManagement.audit.safetyStage', 'chargingManagement.audit.safetyActive', 'chargingManagement.audit.problemCount',
            'chargingManagement.wallboxCount', 'chargingManagement.summary.totalPowerW', 'chargingManagement.summary.totalTargetPowerW', 'chargingManagement.summary.totalReservedPowerW', 'chargingManagement.summary.lastUpdate',
            'chargingManagement.control.active', 'chargingManagement.control.status', 'chargingManagement.control.mode', 'chargingManagement.control.budgetW', 'chargingManagement.control.usedW', 'chargingManagement.control.remainingW',
            'chargingManagement.control.gridCapBinding', 'chargingManagement.control.phaseCapBinding', 'chargingManagement.control.para14aActive', 'chargingManagement.control.para14aBinding',
            'info.connection', 'ems.core.schedulerHeartbeatAt', 'ems.core.schedulerHeartbeatSequence', 'ems.core.schedulerAlive',
            'ems.core.tickRunning', 'ems.core.lastTickStart', 'ems.core.lastTickEnd', 'ems.core.lastTickDurationMs', 'ems.core.lastTickError',
            'ems.safety.valid', 'ems.safety.emergencyStop', 'ems.safety.reason', 'ems.safety.gridHeadroomW', 'ems.safety.evcsCapW',
            'ems.budget.active', 'ems.budget.mode', 'ems.budget.source', 'ems.budget.lastUpdate', 'ems.budget.totalBudgetW', 'ems.budget.remainingTotalW', 'ems.budget.flexUsedW',
            'ems.budget.binding', 'ems.budget.gridW', 'ems.budget.gridImportW', 'ems.budget.gridExportW', 'ems.budget.pvPowerW',
            'ems.budget.pvBudgetW', 'ems.budget.remainingPvW',
            'gridConstraints.exportLimit.enabled', 'gridConstraints.exportLimit.diagnosticOnly', 'gridConstraints.exportLimit.exportOverLimitW', 'gridConstraints.exportLimit.statusLabel',
            'speicher.regelung.aktiv', 'speicher.regelung.aktivKonfig', 'speicher.regelung.topologie', 'speicher.regelung.topologieGrund', 'speicher.regelung.socPct',
            'speicher.regelung.sollW', 'speicher.regelung.acceptedSollW', 'speicher.regelung.batteryPowerFeedbackMeasuredW', 'speicher.regelung.batteryPowerFeedbackBasisW',
            'speicher.regelung.schreibOk', 'speicher.regelung.schreibStatus', 'speicher.regelung.safetyReason', 'speicher.regelung.grund', 'speicher.regelung.requestGrund',
            'para14a.active', 'para14a.communicationFallbackActive', 'para14a.communicationFallbackReason', 'para14a.fallbackEvcsCapW', 'para14a.evcsTotalCapW', 'para14a.signalFresh', 'para14a.signalStatus',
            'peakShaving.control.status', 'tarif.aktiv', 'tarif.state', 'tarif.currentPriceFresh', 'tarif.preisAktuellEurProKwh', 'tarif.netFeeMode', 'tarif.statusText',
            'forecast.effective.source', 'forecast.effective.fresh', 'forecast.effective.powerNowW', 'forecast.effective.energy6hWh', 'forecast.effective.energy12hWh', 'forecast.effective.energy24hWh', 'forecast.effective.error',
            'forecast.pv.source', 'forecast.pv.valid', 'storageSoc', 'storagePower',
        ];
        await mapWithConcurrency(keys, this.ioConcurrency, async (key) => this.prime(key));
    }
    async primeVolatileStates() {
        const keys = [
            'chargingManagement.audit.snapshotJson', 'chargingManagement.audit.recentEventsJson',
            'info.connection', 'ems.core.schedulerHeartbeatAt', 'ems.core.schedulerHeartbeatSequence', 'ems.core.schedulerAlive',
            'ems.core.tickRunning', 'ems.core.lastTickStart', 'ems.core.lastTickEnd', 'ems.core.lastTickDurationMs', 'ems.core.lastTickError',
            'ems.safety.valid', 'ems.safety.emergencyStop', 'ems.safety.reason',
            'ems.budget.totalBudgetW', 'ems.budget.remainingTotalW', 'ems.budget.flexUsedW', 'ems.budget.binding', 'ems.budget.remainingPvW',
            'gridConstraints.exportLimit.enabled', 'gridConstraints.exportLimit.diagnosticOnly', 'gridConstraints.exportLimit.exportOverLimitW', 'gridConstraints.exportLimit.statusLabel',
            'speicher.regelung.sollW', 'speicher.regelung.acceptedSollW', 'speicher.regelung.batteryPowerFeedbackMeasuredW',
            'forecast.effective.source', 'forecast.effective.fresh', 'forecast.effective.powerNowW',
        ];
        await mapWithConcurrency(keys, this.ioConcurrency, async (key) => this.prime(key, 7000));
    }
    async prime(key, maxAgeMs = Number.POSITIVE_INFINITY) {
        try {
            const cached = this.adapter.stateCache && this.adapter.stateCache[key];
            const ageMs = cached && Number.isFinite(Number(cached.ts)) ? Date.now() - Number(cached.ts) : Number.POSITIVE_INFINITY;
            if (cached && ageMs <= maxAgeMs)
                return;
            const read = await this.readState(key);
            if (!read.ok)
                return;
            const state = read.value;
            if (state && state.val !== undefined) {
                if (typeof this.adapter.updateValue === 'function')
                    this.adapter.updateValue(key, state.val, state.ts || Date.now());
                else {
                    if (!this.adapter.stateCache)
                        this.adapter.stateCache = {};
                    this.adapter.stateCache[key] = { value: state.val, ts: state.ts || Date.now() };
                }
            }
        }
        catch (_error) { }
    }
    ingestAuditEvents() {
        const parsed = parseJson(stateValue(this.adapter, 'chargingManagement.audit.recentEventsJson', '[]'), []);
        if (!Array.isArray(parsed))
            return;
        for (const raw of parsed.slice(-20)) {
            const event = normalizeAuditEvent(raw);
            if (event)
                this.events.push(event);
        }
    }
    dedupeAndTrimEvents() {
        const seen = new Set();
        this.events = this.events
            .filter((event) => event && event.ts > 0)
            .sort((a, b) => a.ts - b.ts)
            .filter((event) => {
            if (seen.has(event.id))
                return false;
            seen.add(event.id);
            return true;
        })
            .slice(-this.maxEvents);
    }
    async publish(contract) {
        contract.updatedAt = Math.max(contract.updatedAt, this.lastHeartbeatAt);
        if (contract.publisher && typeof contract.publisher === 'object') {
            contract.publisher.heartbeatAt = Math.max(finite(contract.publisher.heartbeatAt, 0), this.lastHeartbeatAt);
            contract.publisher.fullSnapshotAt = this.fullSnapshotAt || contract.generatedAt;
            contract.publisher.snapshotAgeMs = 0;
        }
        this.lastContract = contract;
        try {
            this.adapter._nwAdminOverview = contract;
        }
        catch (_error) { }
        const values = {
            schemaVersion: contract.schemaVersion,
            available: contract.available,
            status: contract.status,
            headline: contract.headline,
            reason: contract.reason,
            binding: contract.binding,
            summaryJson: JSON.stringify(contract),
            eventsJson: JSON.stringify(this.events.slice(-8).reverse()),
            eventCount: this.events.length,
        };
        const entries = Object.entries(values);
        const results = await mapWithConcurrency(entries, Math.min(4, this.ioConcurrency), async ([key, value]) => ({
            key,
            ok: await this.setIfChanged(`info.adminOverview.${key}`, value),
        }));
        // `summaryJson` is the transactional payload used by EOS Admin. Only after
        // it was accepted do we mark the cycle as a complete snapshot. The separate
        // `updatedAt` heartbeat has already proven publisher liveness at cycle start.
        const summaryWritten = results.some((entry) => entry.key === 'summaryJson' && entry.ok);
        if (summaryWritten) {
            const completedAt = Date.now();
            this.lastSummaryRefreshAt = completedAt;
            await this.setIfChanged('info.adminOverview.publisherLastSuccessAt', completedAt, true);
        }
        return summaryWritten;
    }
    async setIfChanged(id, value, force = false) {
        if (this.stopped || this.adapter._nwShuttingDown)
            return false;
        const signature = typeof value === 'string' ? value : JSON.stringify(value);
        if (!force && this.lastValues.get(id) === signature)
            return true;
        const write = await this.writeState(id, value);
        // Cache the signature only after a confirmed write. A timed-out write must
        // be retried later instead of being mistaken for an already published value.
        if (write.ok)
            this.lastValues.set(id, signature);
        return write.ok;
    }
}
module.exports = {
    AdminOverviewPublisher,
    buildOverviewContract,
    eventSignature,
    normalizeAuditEvent,
    isInformationalLimiter,
    activeLimiterForDisplay,
    humanizeLimiter,
    newestTimestamp,
};
