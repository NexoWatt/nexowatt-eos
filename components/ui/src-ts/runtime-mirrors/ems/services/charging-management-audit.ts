// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: ems/services/charging-management-audit.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * ems/services/charging-management-audit.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Produktive Originalquellen liegen unter
 * src-ts/runtime-executables/ bzw. den im generierten JS genannten TS-Pfaden.
 * Dort ändern, Laufzeit erzeugen und danach die Spiegel synchronisieren.
 * Build-/Prüfskripte ohne TS-Original werden weiterhin unter scripts/ gepflegt.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: d085363339a94ff291010d938c706923c36f8e56caea8e370960422ac2e22d69
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/services/charging-management-audit.ts
 * Quell-Hash: sha256:6674e82ead2d3644635adf3a027e032626b6b4b21a8e2ab15d623624f217b4ee
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/charging-management-audit.js.
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
 * Aufgabe: Erfasst Ladeentscheidungen und deren begrenzende Ursachen für die Lademanagement-Diagnose.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/charging-management-audit.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
/**
 * Code-Teil: finiteChargingAuditNumber
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function finiteChargingAuditNumber(value, fallback = null) {
    if (value === null || value === undefined)
        return fallback;
    if (typeof value === 'string' && value.trim() === '')
        return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}
/**
 * Code-Teil: compactChargingAuditText
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function compactChargingAuditText(value, maxLen = 240) {
    const text = value === null || value === undefined ? '' : String(value).trim();
    if (!text)
        return '';
    return text.length > maxLen ? `${text.slice(0, Math.max(0, maxLen - 3))}...` : text;
}
/**
 * Informational operating states are useful per charging point, but they are
 * not active power limitations. In particular, a connected vehicle without a
 * current charging request and an unplugged vehicle must never turn the global
 * EMS status yellow. The NVP import guard remains active in the background and
 * is represented separately through `snapshot.grid.monitoring`.
 */
function isChargingAuditInformationalLimiter(value) {
    const limiter = String(value || 'none').trim().toLowerCase();
    return ['none', 'no-vehicle', 'no-charge-demand', 'pv-surplus', 'grid-monitor', 'export-monitor'].includes(limiter);
}
/** True only when a limiter is currently reducing or blocking a request. */
function isChargingAuditActiveLimiter(value) {
    return !isChargingAuditInformationalLimiter(value);
}
/**
 * Code-Teil: deriveChargingAuditLimiter
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function deriveChargingAuditLimiter(entry = {}, global = {}) {
    const safetyBinding = String(entry.safetyBinding || '').trim().toLowerCase();
    const reason = String(entry.safetyReason || entry.reason || '').trim().toUpperCase();
    const applyStatus = String(entry.applyStatus || '').trim().toLowerCase();
    if (global.safetyStop === true || global.safetyValid === false || global.safetyEmergencyStop === true)
        return 'eos-safety-stop';
    if (entry.faultActive === true || reason.includes('FAULT'))
        return 'fault';
    if (entry.unavailableActive === true || reason.includes('UNAVAILABLE'))
        return 'unavailable';
    if (entry.online === false || reason.includes('OFFLINE'))
        return 'offline';
    if (entry.enabled === false || reason === 'DISABLED' || reason.includes('CONTROL_DISABLED'))
        return 'disabled';
    if (entry.meterStale === true || reason.includes('STALE_METER') || reason.includes('STALE-METER'))
        return 'stale-meter-failsafe';
    if (safetyBinding.includes('grid') && safetyBinding.includes('phase'))
        return 'grid-and-phase';
    if (safetyBinding.includes('grid'))
        return 'grid-import';
    if (safetyBinding.includes('phase'))
        return 'phase';
    if (safetyBinding.includes('14') || safetyBinding.includes('para'))
        return 'para14a';
    if (safetyBinding.includes('station'))
        return 'station';
    if (safetyBinding.includes('device') || safetyBinding.includes('user'))
        return 'device';
    if (reason.includes('LIMITED_BY_GRID_IMPORT'))
        return 'grid-import';
    if (reason.includes('LIMITED_BY_PHASE_CAP') || reason.includes('LIMIT_PHASE'))
        return 'phase';
    if (reason.includes('LIMITED_BY_14A') || reason.includes('PARA14A'))
        return 'para14a';
    if (reason.includes('LIMITED_BY_STATION_CAP'))
        return 'station';
    if (reason.includes('LIMITED_BY_USER_LIMIT') || reason.includes('SAFETY-CLAMPED:DEVICE'))
        return 'device';
    if (reason.includes('PAUSED_BY_PEAK_SHAVING') || String(global.status || '').includes('peak'))
        return 'peak-shaving';
    if (reason.includes('NO_PV_SURPLUS'))
        return 'pv-surplus';
    if (reason.includes('NO_BUDGET') || reason.includes('LIMITED_BY_BUDGET') || reason.includes('BELOW_MIN'))
        return 'budget';
    if (reason.includes('NO_VEHICLE'))
        return 'no-vehicle';
    if (entry.vehicleDemandConfirmed === false && entry.connected === true && Number(entry.targetW || 0) <= 0)
        return 'no-charge-demand';
    if (reason.includes('NO_SETPOINT'))
        return 'no-setpoint';
    if (applyStatus.includes('write_failed') || applyStatus.includes('executor_error') || applyStatus.includes('unreachable'))
        return 'write-error';
    return 'none';
}
/**
 * Code-Teil: deriveChargingAuditGlobalLimiter
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function deriveChargingAuditGlobalLimiter(input = {}, wallboxes = []) {
    const status = String(input.status || '').toLowerCase();
    if (input.safetyStop === true || input.safetyValid === false || input.safetyEmergencyStop === true)
        return 'eos-safety-stop';
    if (status.includes('failsafe') || status.includes('stale'))
        return 'stale-meter-failsafe';
    if (input.pausedByPeakShaving === true || status.includes('peak'))
        return 'peak-shaving';
    if (input.para14aBinding === true)
        return 'para14a';
    if (input.gridCapBinding === true && input.phaseCapBinding === true)
        return 'grid-and-phase';
    if (input.gridCapBinding === true)
        return 'grid-import';
    if (input.phaseCapBinding === true)
        return 'phase';
    const perLp = Array.isArray(wallboxes) ? wallboxes.map((row) => String(row.limiter || 'none')) : [];
    for (const limiter of ['grid-and-phase', 'grid-import', 'phase', 'para14a', 'station', 'device', 'write-error', 'no-setpoint', 'budget', 'peak-shaving']) {
        if (perLp.includes(limiter))
            return limiter;
    }
    return 'none';
}
/**
 * Code-Teil: buildChargingAuditSnapshot
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function buildChargingAuditSnapshot(input = {}) {
    const ts = Math.max(0, Math.round(finiteChargingAuditNumber(input.ts, Date.now())));
    const debugRows = Array.isArray(input.allocations) ? input.allocations : [];
    const runtimeRows = Array.isArray(input.wallboxes) ? input.wallboxes : [];
    const debugBySafe = new Map();
    for (const row of debugRows) {
        if (!row || typeof row !== 'object' || row.type === 'budget')
            continue;
        const safe = String(row.safe || '').trim();
        if (safe)
            debugBySafe.set(safe, row);
    }
    const runtimeBySafe = new Map();
    for (const row of runtimeRows) {
        if (!row || typeof row !== 'object')
            continue;
        const safe = String(row.safe || '').trim();
        if (safe)
            runtimeBySafe.set(safe, row);
    }
    const safes = Array.from(new Set([...debugBySafe.keys(), ...runtimeBySafe.keys()])).sort();
    const safetyEnvelope = input.safetyEnvelope && typeof input.safetyEnvelope === 'object' ? input.safetyEnvelope : {};
    const globalBase = {
        safetyStop: input.safetyStop === true,
        safetyValid: safetyEnvelope.valid !== false,
        safetyEmergencyStop: safetyEnvelope.emergencyStop === true,
        status: String(input.status || ''),
    };
    const wallboxes = safes.map((safe) => {
        const dbg = debugBySafe.get(safe) || {};
        const rt = runtimeBySafe.get(safe) || {};
        const row = { ...rt, ...dbg };
        const requestedW = finiteChargingAuditNumber(row.safetyRequestedW, finiteChargingAuditNumber(row.rawTargetW, finiteChargingAuditNumber(row.requestedTargetW, finiteChargingAuditNumber(row.targetW, 0))));
        const requestedA = finiteChargingAuditNumber(row.rawTargetA, finiteChargingAuditNumber(row.requestedTargetA, finiteChargingAuditNumber(row.targetA, 0)));
        const targetW = Math.max(0, finiteChargingAuditNumber(row.targetW, 0));
        const targetA = Math.max(0, finiteChargingAuditNumber(row.targetA, 0));
        const actualW = Math.max(0, finiteChargingAuditNumber(row.actualPowerW, finiteChargingAuditNumber(row.powerEffectiveW, 0)));
        const record = {
            safe,
            name: compactChargingAuditText(row.name || safe, 120),
            mode: compactChargingAuditText(row.effectiveMode || row.userMode || '', 64),
            userMode: compactChargingAuditText(row.userMode || '', 64),
            chargerType: compactChargingAuditText(row.chargerType || '', 32),
            stationKey: compactChargingAuditText(row.stationKey || '', 120),
            connectorNo: Math.max(0, Math.round(finiteChargingAuditNumber(row.connectorNo, 0))),
            online: row.online === true,
            enabled: row.enabled !== false,
            controlAvailable: row.controlAvailable === true,
            connected: row.connected === true || row.vehiclePlugged === true,
            vehicleDemandConfirmed: row.vehicleDemandConfirmed === true,
            vehicleDemandSource: compactChargingAuditText(row.vehicleDemandSource || '', 120),
            vehicleDemandReason: compactChargingAuditText(row.vehicleDemandReason || '', 180),
            charging: row.charging === true,
            meterStale: row.meterStale === true || row.staleAny === true,
            statusClass: compactChargingAuditText(row.statusClass || '', 80),
            statusEffective: compactChargingAuditText(row.statusEffective || '', 120),
            faultActive: row.faultActive === true,
            faultReason: compactChargingAuditText(row.faultReason || '', 180),
            unavailableActive: row.unavailableActive === true,
            unavailableReason: compactChargingAuditText(row.unavailableReason || '', 180),
            minimumPowerW: Math.max(0, finiteChargingAuditNumber(row.minPW, finiteChargingAuditNumber(row.minPowerW, 0))),
            phaseCount: Math.max(1, Math.min(3, finiteChargingAuditNumber(row.phases, finiteChargingAuditNumber(row.phaseCount, 1)))),
            actualPowerW: Math.round(actualW),
            requestedPowerW: Math.max(0, Math.round(requestedW || 0)),
            requestedCurrentA: Math.max(0, Math.round((requestedA || 0) * 10) / 10),
            targetPowerW: Math.round(targetW),
            targetCurrentA: Math.round(targetA * 10) / 10,
            reservedPowerW: Math.max(0, Math.round(finiteChargingAuditNumber(row.demandReserveW, targetW))),
            pvShareW: Math.max(0, Math.round(finiteChargingAuditNumber(row.pvUsedW, 0))),
            storageShareW: Math.max(0, Math.round(finiteChargingAuditNumber(row.batteryContributionW, 0))),
            stationAllocatedW: finiteChargingAuditNumber(row.stationAllocatedW, null) === null
                ? null
                : Math.max(0, Math.round(finiteChargingAuditNumber(row.stationAllocatedW, 0))),
            stationRemainingW: finiteChargingAuditNumber(row.stationRemainingW, null) === null
                ? null
                : Math.max(0, Math.round(finiteChargingAuditNumber(row.stationRemainingW, 0))),
            safetyRequestedW: finiteChargingAuditNumber(row.safetyRequestedW, null),
            safetyAllowedW: finiteChargingAuditNumber(row.safetyAllowedW, null),
            safetyBinding: compactChargingAuditText(row.safetyBinding || '', 80),
            safetyReason: compactChargingAuditText(row.safetyReason || '', 180),
            reason: compactChargingAuditText(row.reason || '', 180),
            applied: row.applied === true,
            applyStatus: compactChargingAuditText(row.applyStatus || '', 180),
            executorSource: compactChargingAuditText(row.executorSource || '', 80),
            setpointKey: compactChargingAuditText(row.executorSetpointKey || row.setpointKey || row.setWKey || row.setAKey || '', 220),
            allocationRank: Math.max(0, Math.round(finiteChargingAuditNumber(row.allocationRank, 0))),
        };
        record.limiter = deriveChargingAuditLimiter(record, globalBase);
        return record;
    });
    const snapshot = {
        schemaVersion: 1,
        ts,
        context: compactChargingAuditText(input.context || 'normal', 80),
        mode: compactChargingAuditText(input.mode || '', 64),
        budgetMode: compactChargingAuditText(input.budgetMode || '', 80),
        status: compactChargingAuditText(input.status || '', 160),
        controlActive: input.controlActive === true,
        pausedByPeakShaving: input.pausedByPeakShaving === true,
        safetyStop: input.safetyStop === true,
        safetyReason: compactChargingAuditText(input.safetyReason || '', 220),
        budgetW: Math.max(0, Math.round(finiteChargingAuditNumber(input.budgetW, 0))),
        actualPowerW: Math.max(0, Math.round(finiteChargingAuditNumber(input.actualPowerW, 0))),
        reservedPowerW: Math.max(0, Math.round(finiteChargingAuditNumber(input.reservedPowerW, 0))),
        targetPowerW: Math.max(0, Math.round(finiteChargingAuditNumber(input.targetPowerW, 0))),
        remainingPowerW: Math.max(0, Math.round(finiteChargingAuditNumber(input.remainingPowerW, 0))),
        grid: {
            importW: finiteChargingAuditNumber(input.gridImportW, null),
            limitW: finiteChargingAuditNumber(input.gridImportLimitW, null),
            effectiveLimitW: finiteChargingAuditNumber(input.gridImportLimitEffW, null),
            evcsCapW: finiteChargingAuditNumber(input.gridCapEvcsW, null),
            hardHeadroomRawW: finiteChargingAuditNumber(input.gridHardHeadroomRawW, null),
            progressiveIncrementW: finiteChargingAuditNumber(input.gridIncrementHeadroomW, null),
            softRampFactor: finiteChargingAuditNumber(input.gridSoftRampFactor, null),
            offlineReserveW: Math.max(0, Math.round(finiteChargingAuditNumber(input.gridOfflineReserveW, 0))),
            requestedW: Math.max(0, Math.round(finiteChargingAuditNumber(input.gridDemandRequestedW, 0))),
            allowedW: Math.max(0, Math.round(finiteChargingAuditNumber(input.gridAllowedDemandW, 0))),
            reductionW: Math.max(0, Math.round(finiteChargingAuditNumber(input.gridReductionW, 0))),
            monitoring: finiteChargingAuditNumber(input.gridImportLimitEffW, 0) > 0,
            binding: input.gridCapBinding === true,
        },
        phase: {
            evcsCapW: finiteChargingAuditNumber(input.phaseCapEvcsW, null),
            binding: input.phaseCapBinding === true,
        },
        para14a: {
            active: input.para14aActive === true,
            capW: finiteChargingAuditNumber(input.para14aCapEvcsW, null),
            binding: input.para14aBinding === true,
        },
        storageAssist: {
            active: input.storageAssistActive === true,
            requestedW: Math.max(0, Math.round(finiteChargingAuditNumber(input.storageAssistRequestedW, 0))),
            acceptedW: Math.max(0, Math.round(finiteChargingAuditNumber(input.storageAssistAcceptedW, 0))),
        },
        safety: {
            valid: safetyEnvelope.valid !== false,
            emergencyStop: safetyEnvelope.emergencyStop === true,
            invalidReason: compactChargingAuditText(safetyEnvelope.invalidReason || '', 220),
            generation: Math.max(0, Math.round(finiteChargingAuditNumber(safetyEnvelope.generation, 0))),
            timestamp: Math.max(0, Math.round(finiteChargingAuditNumber(safetyEnvelope.timestamp || safetyEnvelope.ts, 0))),
        },
        wallboxes,
    };
    snapshot.activeLimiter = deriveChargingAuditGlobalLimiter({
        ...input,
        safetyValid: snapshot.safety.valid,
        safetyEmergencyStop: snapshot.safety.emergencyStop,
    }, wallboxes);
    const safetyStageByLimiter = Object.freeze({
        'stale-meter-failsafe': 'STALE-METER-FAILSAFE',
        'grid-and-phase': 'GRID-AND-PHASE-LIMIT',
        'grid-import': 'GRID-IMPORT-LIMIT',
        phase: 'PHASE-LIMIT',
        para14a: 'PARA14A-LIMIT',
        station: 'STATION-LIMIT',
        device: 'DEVICE-LIMIT',
        'write-error': 'WRITE-FAILSAFE',
        fault: 'DEVICE-FAULT',
        unavailable: 'DEVICE-UNAVAILABLE',
        offline: 'DEVICE-OFFLINE',
        'no-setpoint': 'NO-SETPOINT-FAILSAFE',
    });
    snapshot.safetyStage = snapshot.safetyStop || snapshot.safety.emergencyStop || snapshot.safety.valid === false
        ? 'EOS-SAFETY-STOP'
        : (safetyStageByLimiter[snapshot.activeLimiter] || 'NORMAL');
    snapshot.safetyActive = snapshot.safetyStage !== 'NORMAL';
    snapshot.limitActive = isChargingAuditActiveLimiter(snapshot.activeLimiter);
    snapshot.problemCount = wallboxes.filter((row) => !['none', 'no-vehicle', 'no-charge-demand', 'pv-surplus'].includes(row.limiter)).length
        + (snapshot.safety.valid === false || snapshot.safety.emergencyStop ? 1 : 0);
    return snapshot;
}
/**
 * Code-Teil: chargingAuditEventSignature
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function chargingAuditEventSignature(snapshot) {
    if (!snapshot || typeof snapshot !== 'object')
        return '';
    const wallboxBits = (Array.isArray(snapshot.wallboxes) ? snapshot.wallboxes : []).map((row) => [
        row.safe,
        row.mode,
        row.online ? 1 : 0,
        row.connected ? 1 : 0,
        row.vehicleDemandConfirmed ? 1 : 0,
        Math.round(Number(row.actualPowerW || 0) / 100) * 100,
        Math.round(Number(row.requestedPowerW || 0) / 50) * 50,
        Math.round(Number(row.targetPowerW || 0) / 50) * 50,
        Math.round(Number(row.targetCurrentA || 0) * 10) / 10,
        Math.round(Number(row.reservedPowerW || 0) / 50) * 50,
        row.limiter,
        row.reason,
        row.applyStatus,
        row.safetyBinding,
    ].join('|')).join('||');
    return [
        snapshot.context,
        snapshot.mode,
        snapshot.status,
        snapshot.activeLimiter,
        snapshot.safetyStage,
        Math.round(Number(snapshot.budgetW || 0) / 100) * 100,
        Math.round(Number(snapshot.actualPowerW || 0) / 100) * 100,
        Math.round(Number(snapshot.reservedPowerW || 0) / 50) * 50,
        Math.round(Number(snapshot.targetPowerW || 0) / 50) * 50,
        Math.round(Number(snapshot.remainingPowerW || 0) / 100) * 100,
        snapshot.grid && snapshot.grid.binding ? 1 : 0,
        snapshot.phase && snapshot.phase.binding ? 1 : 0,
        snapshot.para14a && snapshot.para14a.binding ? 1 : 0,
        snapshot.safety && snapshot.safety.valid === false ? 0 : 1,
        snapshot.safety && snapshot.safety.emergencyStop ? 1 : 0,
        wallboxBits,
    ].join('::');
}
/**
 * Code-Teil: buildChargingAuditEvents
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function buildChargingAuditEvents(previousSnapshot, snapshot, options = {}) {
    if (!snapshot || typeof snapshot !== 'object')
        return [];
    const now = Math.max(0, Math.round(finiteChargingAuditNumber(snapshot.ts, Date.now())));
    const previousBySafe = new Map((previousSnapshot && Array.isArray(previousSnapshot.wallboxes) ? previousSnapshot.wallboxes : [])
        .filter((row) => row && row.safe)
        .map((row) => [String(row.safe), row]));
    const events = [];
    const globalChanged = !previousSnapshot
        || previousSnapshot.activeLimiter !== snapshot.activeLimiter
        || previousSnapshot.safetyStage !== snapshot.safetyStage
        || previousSnapshot.status !== snapshot.status
        || previousSnapshot.mode !== snapshot.mode;
    if (globalChanged) {
        const severity = snapshot.safetyStage === 'EOS-SAFETY-STOP' ? 'error'
            : (snapshot.limitActive === true ? 'warn' : 'info');
        const globalStateText = snapshot.limitActive === true
            ? `aktive Begrenzung: ${snapshot.activeLimiter}`
            : (snapshot.grid && snapshot.grid.monitoring
                ? 'NVP-Bezug wird überwacht; keine aktive Begrenzung'
                : 'keine aktive Begrenzung');
        events.push({
            ts: now,
            type: 'global',
            severity,
            safe: '',
            name: 'Lademanagement',
            mode: snapshot.mode,
            actualPowerW: snapshot.actualPowerW,
            requestedPowerW: snapshot.targetPowerW,
            targetPowerW: snapshot.targetPowerW,
            targetCurrentA: 0,
            reservedPowerW: snapshot.reservedPowerW,
            pvShareW: 0,
            limiter: snapshot.activeLimiter,
            reason: snapshot.safetyReason || snapshot.status,
            applyStatus: '',
            safetyStage: snapshot.safetyStage,
            budgetW: snapshot.budgetW,
            remainingPowerW: snapshot.remainingPowerW,
            message: compactChargingAuditText(`Globaler Zustand: ${snapshot.status || snapshot.mode || 'aktualisiert'}; ${globalStateText}`, 320),
        });
    }
    for (const row of Array.isArray(snapshot.wallboxes) ? snapshot.wallboxes : []) {
        const previous = previousBySafe.get(String(row.safe)) || null;
        const changed = !previous || [
            'mode', 'online', 'enabled', 'connected', 'vehicleDemandConfirmed', 'charging',
            'actualPowerW', 'requestedPowerW', 'targetPowerW', 'targetCurrentA',
            'reservedPowerW', 'pvShareW', 'storageShareW', 'limiter', 'reason',
            'applyStatus', 'safetyBinding', 'safetyReason', 'stationRemainingW',
        ].some((key) => previous[key] !== row[key]);
        if (!changed)
            continue;
        const severity = ['eos-safety-stop', 'fault', 'write-error', 'offline', 'unavailable', 'stale-meter-failsafe', 'no-setpoint'].includes(row.limiter)
            ? 'error'
            : (row.limiter !== 'none' && !['no-vehicle', 'no-charge-demand', 'pv-surplus'].includes(row.limiter) ? 'warn' : 'info');
        const deltas = [];
        if (previous) {
            if (previous.targetPowerW !== row.targetPowerW)
                deltas.push(`Soll ${previous.targetPowerW}→${row.targetPowerW} W`);
            if (previous.actualPowerW !== row.actualPowerW)
                deltas.push(`Ist ${previous.actualPowerW}→${row.actualPowerW} W`);
            if (previous.limiter !== row.limiter)
                deltas.push(`Limit ${previous.limiter}→${row.limiter}`);
            if (previous.applyStatus !== row.applyStatus)
                deltas.push(`Write ${previous.applyStatus || '—'}→${row.applyStatus || '—'}`);
        }
        events.push({
            ts: now,
            type: 'wallbox',
            severity,
            safe: row.safe,
            name: row.name,
            mode: row.mode,
            actualPowerW: row.actualPowerW,
            requestedPowerW: row.requestedPowerW,
            targetPowerW: row.targetPowerW,
            targetCurrentA: row.targetCurrentA,
            reservedPowerW: row.reservedPowerW,
            pvShareW: row.pvShareW,
            storageShareW: row.storageShareW,
            limiter: row.limiter,
            reason: row.safetyReason || row.reason,
            applyStatus: row.applyStatus,
            applied: row.applied,
            safetyBinding: row.safetyBinding,
            safetyStage: snapshot.safetyStage,
            budgetW: snapshot.budgetW,
            remainingPowerW: snapshot.remainingPowerW,
            setpointKey: row.setpointKey,
            message: compactChargingAuditText(deltas.length ? deltas.join('; ') : `Soll ${row.targetPowerW} W / ${row.targetCurrentA} A; ${row.limiter}`, 320),
        });
    }
    if (!events.length && options.heartbeat === true) {
        events.push({
            ts: now,
            type: 'heartbeat',
            severity: 'info',
            safe: '',
            name: 'Lademanagement',
            mode: snapshot.mode,
            actualPowerW: snapshot.actualPowerW,
            requestedPowerW: snapshot.targetPowerW,
            targetPowerW: snapshot.targetPowerW,
            targetCurrentA: 0,
            reservedPowerW: snapshot.reservedPowerW,
            pvShareW: 0,
            limiter: snapshot.activeLimiter,
            reason: snapshot.status,
            applyStatus: '',
            safetyStage: snapshot.safetyStage,
            budgetW: snapshot.budgetW,
            remainingPowerW: snapshot.remainingPowerW,
            message: 'Periodischer Lademanagement-Snapshot',
        });
    }
    return events;
}
/**
 * Code-Teil: ChargingManagementAuditStore
 *
 * Zweck:
 * Automatisch markierter Klasse-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
class ChargingManagementAuditStore {
    constructor(adapter, queueState, flushQueue) {
        this.events = [];
        this.snapshot = null;
        this.lastSignature = '';
        this.lastEventMs = 0;
        this.eventSeq = 0;
        this.maxEvents = 240;
        this.heartbeatMs = 60000;
        this.adapter = adapter;
        this.queueState = queueState;
        this.flushQueue = flushQueue;
    }
    async initialize() {
/**
 * Code-Teil: ensureState
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
        const ensureState = async (id, name, type, role) => {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: 'state',
                common: { name, type, role, read: true, write: false },
                native: {},
            });
        };
        await this.adapter.setObjectNotExistsAsync('chargingManagement.audit', {
            type: 'channel', common: { name: 'Lademanagement Audit / Ereignislog' }, native: {},
        });
        await ensureState('chargingManagement.audit.snapshotJson', 'Aktueller Lademanagement-Snapshot (JSON)', 'string', 'json');
        await ensureState('chargingManagement.audit.recentEventsJson', 'Letzte Lademanagement-Ereignisse (JSON)', 'string', 'json');
        await ensureState('chargingManagement.audit.lastEventJson', 'Letztes Lademanagement-Ereignis (JSON)', 'string', 'json');
        await ensureState('chargingManagement.audit.eventCount', 'Anzahl Ereignisse im Ringpuffer', 'number', 'value');
        await ensureState('chargingManagement.audit.lastEventTs', 'Zeitpunkt letztes Ereignis', 'number', 'value.time');
        await ensureState('chargingManagement.audit.activeLimiter', 'Aktive Begrenzung / Gate', 'string', 'text');
        await ensureState('chargingManagement.audit.safetyStage', 'Aktive Sicherungsstufe', 'string', 'text');
        await ensureState('chargingManagement.audit.safetyActive', 'Sicherheits- oder Begrenzungsstufe aktiv', 'boolean', 'indicator');
        await ensureState('chargingManagement.audit.problemCount', 'Aktuelle Diagnoseprobleme', 'number', 'value');
        await this.restore();
        this.adapter._nwChargingManagementAudit = {
            schemaVersion: 1,
            getSnapshot: () => this.getSnapshot(),
            getEvents: (limit) => this.getPayload(limit),
            clear: () => this.clear(),
        };
    }
    async restore() {
        try {
            const state = await this.adapter.getStateAsync('chargingManagement.audit.recentEventsJson');
            const parsed = state && typeof state.val === 'string' && state.val.trim() ? JSON.parse(state.val) : [];
            this.events = Array.isArray(parsed) ? parsed.slice(-this.maxEvents) : [];
        }
        catch {
            this.events = [];
        }
        try {
            const state = await this.adapter.getStateAsync('chargingManagement.audit.snapshotJson');
            const parsed = state && typeof state.val === 'string' && state.val.trim() ? JSON.parse(state.val) : null;
            this.snapshot = parsed && typeof parsed === 'object' ? parsed : null;
            this.lastSignature = this.snapshot ? chargingAuditEventSignature(this.snapshot) : '';
        }
        catch {
            this.snapshot = null;
            this.lastSignature = '';
        }
        const last = this.events.length ? this.events[this.events.length - 1] : null;
        this.lastEventMs = last && Number.isFinite(Number(last.ts)) ? Number(last.ts) : 0;
    }
    getSnapshot() { return this.snapshot; }
    getPayload(limit = 200) {
        const safeLimit = Math.max(1, Math.min(this.maxEvents, Math.round(Number(limit) || 200)));
        return { schemaVersion: 1, snapshot: this.snapshot, events: this.events.slice(-safeLimit),
            eventCount: this.events.length, maxEvents: this.maxEvents, lastEventTs: this.lastEventMs || 0 };
    }
    async clear() {
        this.events = [];
        this.lastEventMs = 0;
        this.eventSeq = 0;
        try {
            await this.queueState('chargingManagement.audit.recentEventsJson', '[]', true);
            await this.queueState('chargingManagement.audit.lastEventJson', '{}', true);
            await this.queueState('chargingManagement.audit.eventCount', 0, true);
            await this.queueState('chargingManagement.audit.lastEventTs', 0, true);
            await this.flushQueue();
        }
        catch { /* Diagnostics must not affect control. */ }
        return { ok: true, cleared: true };
    }
    async record(input = {}) {
        try {
            const snapshot = buildChargingAuditSnapshot({ ...input, ts: input.ts || Date.now(),
                safetyEnvelope: input.safetyEnvelope || this.adapter._emsSafetyEnvelope });
            const signature = chargingAuditEventSignature(snapshot);
            const now = Number(snapshot.ts) || Date.now();
            const active = snapshot.actualPowerW > 0 || snapshot.targetPowerW > 0 || snapshot.reservedPowerW > 0
                || snapshot.limitActive === true || snapshot.safetyStage !== 'NORMAL';
            const heartbeat = active && (now - (this.lastEventMs || 0)) >= this.heartbeatMs;
            let created = [];
            if (signature !== this.lastSignature)
                created = buildChargingAuditEvents(this.snapshot, snapshot, { heartbeat: false });
            else if (heartbeat)
                created = buildChargingAuditEvents(snapshot, snapshot, { heartbeat: true });
            for (const event of created) {
                this.eventSeq += 1;
                event.id = `${now}-${this.eventSeq}`;
                this.events.push(event);
                this.lastEventMs = now;
            }
            if (this.events.length > this.maxEvents)
                this.events.splice(0, this.events.length - this.maxEvents);
            this.snapshot = snapshot;
            this.lastSignature = signature;
            const last = this.events.length ? this.events[this.events.length - 1] : null;
            await this.queueState('chargingManagement.audit.snapshotJson', JSON.stringify(snapshot), true);
            if (created.length) {
                await this.queueState('chargingManagement.audit.recentEventsJson', JSON.stringify(this.events), true);
                await this.queueState('chargingManagement.audit.lastEventJson', last ? JSON.stringify(last) : '{}', true);
                await this.queueState('chargingManagement.audit.eventCount', this.events.length, true);
                await this.queueState('chargingManagement.audit.lastEventTs', this.lastEventMs || 0, true);
            }
            await this.queueState('chargingManagement.audit.activeLimiter', snapshot.activeLimiter || 'none', true);
            await this.queueState('chargingManagement.audit.safetyStage', snapshot.safetyStage || 'NORMAL', true);
            await this.queueState('chargingManagement.audit.safetyActive', snapshot.safetyActive === true, true);
            await this.queueState('chargingManagement.audit.problemCount', snapshot.problemCount || 0, true);
        }
        catch { /* Read-only audit must never abort a charging cycle. */ }
    }
}
module.exports = {
    finiteChargingAuditNumber, compactChargingAuditText, deriveChargingAuditLimiter,
    isChargingAuditInformationalLimiter, isChargingAuditActiveLimiter,
    deriveChargingAuditGlobalLimiter, buildChargingAuditSnapshot, chargingAuditEventSignature,
    buildChargingAuditEvents, ChargingManagementAuditStore,
};
