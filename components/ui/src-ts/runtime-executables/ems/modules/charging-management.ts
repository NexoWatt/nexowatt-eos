// @ts-nocheck
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Verknüpft Fahrzeugbedarf, Lademodus, Stationsgrenzen und verfügbares Netz-/PV-Budget zu begrenzten Lade-Sollwerten.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/modules/charging-management.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Canonical TypeScript source for the productive NexoWatt EOS EVCS charging-management runtime.
 */

'use strict';

const { BaseModule } = require('./base');
const { resolveCurrentNvpSnapshot } = require('../services/measurement-freshness');
const { confirmedZeroExportPvW, measuredFlexibleLoadW, requestZeroExportProbe, requestZeroExportHold, zeroExportEvcsPauseUntil, noteZeroExportEvcsCommand, readZeroExportMode, isZeroExportGrantValid } = require('../services/zero-export-pv-coordinator');
const { resolveZeroExportStorageCredit } = require('../services/zero-export-storage-credit');
const { applySetpoint } = require('../consumers');
const { ReasonCodes } = require('../reasons');
const { computeChargingMinimumServicePlan, resolveAcChargingLimits } = require('../charging-budget-helpers');
const { resolveEvcsControlBasis, validateEvcsElectricalConfig, resolveDcElectricalLimits } = require('../../lib/evcs-electrical-limits');
const { recordAcceptedPowerTarget } = require('../services/accepted-power-effects');
const { buildAutoPvPriorityReservation } = require('../services/pv-surplus-allocation');
const { ChargingManagementAuditStore, finiteChargingAuditNumber, deriveChargingAuditLimiter, deriveChargingAuditGlobalLimiter, buildChargingAuditSnapshot, chargingAuditEventSignature, buildChargingAuditEvents } = require('../services/charging-management-audit');
const { Rc85EvcsDecisionGuard, rc85GridEnvelope, rc85OfflineReserveW, rc85IsHardReason, rc85RunIsolatedResult, rc86GridBinding } = require('../rc85-runtime-hardening');
const {
    evaluateFlexibleLoadRequest,
    commitFlexibleLoadDecision,
    safetyTargetFromPowerDecision,
    invalidateSafetyEnvelope,
    liveSafetyEnvelope,
} = require('../services/safety-envelope');
const {
    normalizeStrategyAutoSource,
    resolveChargingStrategyOverlay,
} = require('../services/operating-strategy-runtime');
const { buildRuntimeGoalPlanMap, goalPlanStateRows, resolvePlanEffectiveMode, applyGoalPlan, applyStrategyOverlay, resolveGoalCommandStatus, resolveZeroExportChargingPolicy, runtimeChargingMaximumW } = require('../services/forecast-target-runtime-bridge');

/**
 * Estimates the power the currently eligible EVCS fleet would request before
 * the NVP grid envelope is applied. This is deliberately demand based: an
 * online but unplugged connector contributes 0 W and therefore cannot make the
 * grid gate appear as an active limiter.
 */
/**
 * Ablauf und Zusammenhang: Schätzt nur den tatsächlich relevanten Ladebedarf in W vor Anwendung der Netzgrenze. Ein erreichbarer, aber unbelegter Ladepunkt darf dadurch keine aktive Netzbegrenzung vortäuschen.
 */
function estimateGridRelevantEvcsDemandW(points, lastCommandMap, activityThresholdW = 100) {
    let totalW = 0;
    let activePoints = 0;
    for (const point of Array.isArray(points) ? points : []) {
        if (!point || point.online !== true || point.controlAvailable !== true || point.enabled === false) continue;
        if (point.faultActive === true || point.unavailableActive === true || point.operationalBlocked === true) continue;
        const mode = String(point.effectiveMode || point.userMode || 'auto').trim().toLowerCase();
        if (mode === 'off') continue;
        const actualW = Math.max(0, Number(point.actualPowerW) || 0);
        const lastCommandW = lastCommandMap && typeof lastCommandMap.get === 'function'
            ? Math.max(0, Number(lastCommandMap.get(point.safe)) || 0)
            : 0;
        const vehicleConnected = point.vehiclePlugged === true || point.connected === true;
        // A historical command must not turn an unplugged connector into demand.
        // Only an actually measured load is allowed to override a stale/incorrect
        // plug state for fail-safe accounting.
        if (!vehicleConnected && point.charging !== true && actualW < activityThresholdW) continue;
        const demandConfirmed = point.vehicleDemandConfirmed === true
            || point.charging === true
            || actualW >= activityThresholdW
            || (vehicleConnected && lastCommandW >= activityThresholdW)
            || (mode === 'boost' && vehicleConnected && point.vehicleStartEligible === true);
        if (!demandConfirmed) continue;

        const maxPowerW = Math.max(0, Number(point.maxPW) || 0);
        const minimumW = Math.max(0, Number(point.minPW) || 0);
        const goalW = point.goalActive === true ? Math.max(0, Number(point.goalDesiredW) || 0) : 0;
        const strategyW = point.strategyOverlay && point.strategyOverlay.active === true
            ? Math.max(0, Number(point.strategyOverlay.targetPowerW) || 0)
            : 0;
        let desiredW;
        if (goalW > 0) desiredW = goalW;
        else if (strategyW > 0) desiredW = strategyW;
        else if (mode === 'pv') desiredW = Math.max(actualW, lastCommandW, minimumW);
        else if (mode === 'minpv') desiredW = Math.max(actualW, lastCommandW, minimumW);
        else desiredW = Math.max(actualW, lastCommandW, maxPowerW);
        if (maxPowerW > 0) desiredW = Math.min(desiredW, maxPowerW);
        desiredW = Math.max(0, desiredW);
        if (desiredW <= 0) continue;
        totalW += desiredW;
        activePoints += 1;
    }
    return { totalW, activePoints };
}

/** Code-Teil: chargingManagementTsRuntimeMirror – Dokumentiert diesen Regelungs- oder Diagnosebaustein. */
let chargingManagementTsRuntimeMirror = null;
try {
    chargingManagementTsRuntimeMirror = require('../../lib/ts-mirrors/ems/charging-management/charging-management-runtime');
} catch (_eChargingTsMirror) {
    chargingManagementTsRuntimeMirror = null;
}

/** Code-Teil: requireChargingControlTsMirror – Dokumentiert diesen Regelungs- oder Diagnosebaustein. */
function requireChargingControlTsMirror() {
    try {
        return require('../../lib/ts-mirrors/ems/charging-management/charging-control');
    } catch (_e) {
        return null;
    }
}

/** Code-Teil: requireChargingAllocationTsMirror – Lädt den TS-Shadow für Wallbox-Allocation. Der Spiegel berechnet in diesem */
function requireChargingAllocationTsMirror() {
    try {
        return require('../../lib/ts-mirrors/ems/charging-management/charging-allocation');
    } catch (_e) {
        return null;
    }
}

/** Code-Teil: requireChargingPhaseSelectionTsMirror – Lädt die TS-Entscheidungsschicht für AC-1p/3p-Auto-Phasenwahl im PV-Überschussladen. */
function requireChargingPhaseSelectionTsMirror() {
    try {
        return require('../../lib/ts-mirrors/ems/charging-management/charging-phase-selection');
    } catch (_e) {
        return null;
    }
}

/** Code-Teil: requireChargingWritePlanTsMirror – Lädt den TS-Shadow für den späteren Setpoint-Write-Plan. JavaScript bleibt */
function requireChargingWritePlanTsMirror() {
    try {
        return require('../../lib/ts-mirrors/ems/charging-management/charging-write-plan');
    } catch (_e) {
        return null;
    }
}

/** Code-Teil: requireChargingNormalSourceTsMirror – Lädt den TS-Lockdown für den EVCS-Normalpfad. Dieser Vertrag bündelt */
function requireChargingNormalSourceTsMirror() {
    try {
        return require('../../lib/ts-mirrors/ems/charging-management/charging-normal-source');
    } catch (_e) {
        return null;
    }
}

let chargingBudgetTsMirror = null;
try {
    chargingBudgetTsMirror = require('../../lib/ts-mirrors/ems/charging-management/charging-budget');
} catch (_eChargingBudgetTsMirror) {
    chargingBudgetTsMirror = null;
}
/** Code-Teil: toSafeIdPart – Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen. */
function toSafeIdPart(input) {
    const s = String(input || '').trim();
    if (!s) return '';
    return s.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
}
/** Code-Teil: num – Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen. */
function num(v, fallback = null) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}
/** Code-Teil: clamp – Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen. */
function clamp(n, min, max) {
    if (!Number.isFinite(n)) return n;
    if (Number.isFinite(min)) n = Math.max(min, n);
    if (Number.isFinite(max)) n = Math.min(max, n);
    return n;
}

/** Code-Teil: computePvManagedDemandIntentW – Ermittelt den PV-Anteil eines aktiven Ladebedarfs unabhaengig von */
function computePvManagedDemandIntentW(modeRaw, demandReserveW, minPowerW = 0) {
    const mode = String(modeRaw || '').trim().toLowerCase();
    const demandW = Math.max(0, Number(demandReserveW) || 0);
    const minW = Math.max(0, Number(minPowerW) || 0);
    if (mode === 'pv') return demandW;
    if (mode === 'minpv') return Math.max(0, demandW - Math.min(demandW, minW));
    return 0;
}

/** Code-Teil: computeEvcsPvBudgetReservationW – Vereint tatsaechlich verwendeten PV-Anteil und aktiven PV-Ladeintent */
function computeEvcsPvBudgetReservationW({
    reserveW = 0,
    demandW = null,
    pendingDemandW = 0,
    actualPvW = 0,
    intentPvW = 0,
    pendingIntentPvW = 0,
    allocationCapW = 0,
} = {}) {
    // `reserveW` bildet die bereits physisch/kommandierte Ladeleistung ab.
    // `demandW` darf zusätzlich einen verbundenen, noch wartenden PV-Ladepunkt
    // enthalten. So kann die zentrale Budgetierung den EVCS-Anteil schon waehrend
    // Startverzoegerung oder Wallbox-Telemetrie-Lag reservieren, ohne ihn als
    // reale Netz-/Gesamtlast zu verbuchen.
    const activeDemandW = Math.max(
        0,
        Number(reserveW) || 0,
        Number.isFinite(Number(demandW)) ? Number(demandW) : 0,
    );
    const pendingW = Math.max(0, Number(pendingDemandW) || 0);
    const totalDemandW = activeDemandW + pendingW;
    const activePvDemandW = Math.max(0, Number(actualPvW) || 0, Number(intentPvW) || 0);
    const pvDemandW = activePvDemandW + Math.max(0, Number(pendingIntentPvW) || 0);
    const capW = Number.isFinite(Number(allocationCapW))
        ? Math.max(0, Number(allocationCapW))
        : totalDemandW;
    return Math.max(0, Math.min(totalDemandW, capW, pvDemandW));
}

/** Freie Herstellerwerte aus AppCenter in stabile Vergleichstokens zerlegen. */
function parseEvcsSemanticValues(raw) {
    if (raw === null || raw === undefined) return [];
    let values = raw;
    if (typeof raw === 'string') {
        const text = raw.trim();
        if (!text) return [];
        if ((text.startsWith('[') && text.endsWith(']')) || (text.startsWith('{') && text.endsWith('}'))) {
            try {
                const parsed = JSON.parse(text);
                values = Array.isArray(parsed) ? parsed : Object.values(parsed || {});
            } catch {
                values = text.split(/[\n,;|]+/g);
            }
        } else {
            values = text.split(/[\n,;|]+/g);
        }
    }
    if (!Array.isArray(values)) values = [values];
    return values
        .map((value) => String(value ?? '').trim())
        .filter(Boolean)
        .map((value) => ({
            raw: value,
            token: normalizeEvcsStatusToken(value.replace(/^\*|\*$/g, '')),
            startsWildcard: value.startsWith('*'),
            endsWildcard: value.endsWith('*'),
        }))
        .filter((entry) => entry.token);
}

/** Einen beliebigen booleschen/enumartigen Herstellerwert anhand freier AppCenter-Wertelisten auswerten. */
function resolveEvcsSemanticFlag(value, trueValuesRaw = '', falseValuesRaw = '') {
    if (value === null || value === undefined || String(value).trim() === '') {
        return { known: false, value: null, source: 'missing', token: '' };
    }
    const token = normalizeEvcsStatusToken(value);
    const matches = (entries) => entries.some((entry) => {
        if (!entry || !entry.token) return false;
        if (entry.startsWildcard && entry.endsWildcard) return token.includes(entry.token);
        if (entry.startsWildcard) return token.endsWith(entry.token);
        if (entry.endsWildcard) return token.startsWith(entry.token);
        return token === entry.token;
    });
    const falseEntries = parseEvcsSemanticValues(falseValuesRaw);
    if (matches(falseEntries)) return { known: true, value: false, source: 'configured-false-value', token };
    const trueEntries = parseEvcsSemanticValues(trueValuesRaw);
    if (matches(trueEntries)) return { known: true, value: true, source: 'configured-true-value', token };
    const bool = toBool(value);
    if (bool !== null) return { known: true, value: bool, source: 'boolean-normalization', token };
    return { known: false, value: null, source: 'unmapped-value', token };
}

/** Freie Status-Mappinglisten gegen einen Rohstatus prüfen. */
function matchesEvcsSemanticStatus(value, mappingRaw) {
    const token = normalizeEvcsStatusToken(value);
    if (!token) return false;
    return parseEvcsSemanticValues(mappingRaw).some((entry) => {
        if (entry.startsWildcard && entry.endsWildcard) return token.includes(entry.token);
        if (entry.startsWildcard) return token.endsWith(entry.token);
        if (entry.endsWildcard) return token.startsWith(entry.token);
        return token === entry.token;
    });
}

/**
 * Erkennt alte/irrtuemliche Zuordnungen, die lediglich den aktuellen Lade- oder
 * Transaktionszustand beobachten. `charging=false` vor der ersten EMS-Freigabe
 * ist kein ausdruecklicher Fahrzeugwunsch gegen das Laden und darf deshalb
 * Auto/PV/Min+PV/Zeit-Ziel nicht blockieren. Echte, separat ausgewiesene
 * `chargeDemand`-/`readyToCharge`-Datenpunkte bleiben davon unberuehrt.
 */
function isObservationOnlyEvcsDemandObjectId(objectId) {
    const id = String(objectId || '').trim().toLowerCase();
    if (!id) return false;
    return /(?:^|\.)(?:aliases(?:\.v1)?\.)?r\.(?:charging|active)$/.test(id)
        || /(?:^|\.)transactions\.(?:transactionactive|chargingstate)$/.test(id)
        || /(?:^|\.)(?:transactionactive|chargingactive|chargeactive|ischarging)$/.test(id);
}

/**
 * Herstellerunabhängige semantische EVCS-Zwischenschicht.
 * Sie bildet OCPP-, CP-/IEC- sowie frei konfigurierte Herstellerwerte auf
 * einen stabilen Fahrzeug-/Ladebedarfszustand ab.
 */
function classifyUniversalEvcsVehicleStatus({
    status = '',
    statusFresh = false,
    statusDemandValues = '',
    statusReadyValues = '',
    statusConnectedValues = '',
    statusDisconnectedValues = '',
    statusNoDemandValues = '',
} = {}) {
    const raw = String(status ?? '').trim();
    const token = normalizeEvcsStatusToken(raw);
    const result = {
        raw,
        token,
        fresh: !!statusFresh,
        state: 'unknown',
        plugged: false,
        demandConfirmed: false,
        startEligible: false,
        source: statusFresh ? 'fresh-status' : 'stale-or-missing-status',
        reason: statusFresh ? 'status-not-classified' : 'no-fresh-status',
    };
    if (!raw || !statusFresh) return result;

    const includesAny = (...needles) => needles.some((needle) => token.includes(needle));

    // Harte Sicherheits-/Erreichbarkeitszustände haben Vorrang vor allen
    // Hersteller- und Installer-Mappings.
    if (includesAny('offline', 'unreachable', 'notreachable', 'communicationlost', 'connectionlost')) {
        return { ...result, state: 'offline', reason: `status-${token}-offline` };
    }
    if (token === 'disconnected' || includesAny('notconnected', 'vehiclenotconnected', 'evnotconnected')) {
        return { ...result, state: 'disconnected', reason: `status-${token}-disconnected` };
    }
    const explicitlyHealthy = includesAny('noerror', 'nofault', 'faultfree', 'oknostoerung');
    if (!explicitlyHealthy && includesAny('faulted', 'fault', 'error', 'failed', 'failure', 'stoerung')) {
        return { ...result, state: 'faulted', reason: `status-${token}-faulted` };
    }
    if (includesAny('unavailable', 'outofservice', 'inoperative', 'notavailable')) {
        return { ...result, state: 'unavailable', reason: `status-${token}-unavailable` };
    }

    // Frei konfigurierbare Herstellerwerte. Eine explizite Kein-Bedarf-Klasse
    // bleibt autoritativ und verhindert auch einen Startversuch.
    if (matchesEvcsSemanticStatus(raw, statusDisconnectedValues)) {
        return { ...result, state: 'disconnected', reason: 'configured-status-disconnected' };
    }
    const effectiveStatusDemandValues = String(statusDemandValues || statusReadyValues || '');
    if (matchesEvcsSemanticStatus(raw, effectiveStatusDemandValues)) {
        return { ...result, state: 'ready_to_charge', plugged: true, demandConfirmed: true, startEligible: true, reason: 'configured-status-ready' };
    }
    if (matchesEvcsSemanticStatus(raw, statusNoDemandValues)) {
        return { ...result, state: 'paused_by_vehicle', plugged: true, reason: 'configured-status-no-demand' };
    }
    if (matchesEvcsSemanticStatus(raw, statusConnectedValues)) {
        return { ...result, state: 'connected', plugged: true, startEligible: true, reason: 'configured-status-connected' };
    }

    // IEC 61851 / Mode 3 vor generischen Texttreffern auswerten. Texte wie
    // "Vehicle connected, waiting for charging (C1)" enthalten "charging",
    // obwohl die Wallbox physikalisch noch nicht lädt. Der CP-Code ist daher
    // autoritativ. B1/B2 dürfen einen begrenzten Startversuch erhalten;
    // C1/D1 bestätigen Fahrzeugbedarf; C2/D2 bestätigen reale Ladebereitschaft.
    const upperRaw = raw.toUpperCase();
    const mode3Match = upperRaw.match(/(?:^|[^A-Z0-9])(A1|A2|A|B1|B2|C1|C2|D1|D2|E|F)(?=$|[^A-Z0-9])/);
    const mode3 = mode3Match ? mode3Match[1] : '';
    if (mode3) {
        if (mode3 === 'E' || mode3 === 'F') {
            return { ...result, state: 'faulted', source: 'iec61851-mode3', reason: `mode3-${mode3.toLowerCase()}-fault` };
        }
        if (mode3 === 'A' || mode3 === 'A1' || mode3 === 'A2') {
            return { ...result, state: 'disconnected', source: 'iec61851-mode3', reason: `mode3-${mode3.toLowerCase()}-disconnected` };
        }
        if (mode3 === 'B1') {
            return { ...result, state: 'connected', plugged: true, startEligible: true, source: 'iec61851-mode3', reason: 'mode3-b1-connected-startable' };
        }
        if (mode3 === 'B2') {
            return { ...result, state: 'ready_to_charge', plugged: true, startEligible: true, source: 'iec61851-mode3', reason: 'mode3-b2-pwm-startable' };
        }
        if (mode3 === 'C1' || mode3 === 'D1') {
            return { ...result, state: 'ready_to_charge', plugged: true, demandConfirmed: true, startEligible: true, source: 'iec61851-mode3', reason: `mode3-${mode3.toLowerCase()}-vehicle-demand` };
        }
        if (mode3 === 'C2' || mode3 === 'D2') {
            return { ...result, state: 'charging', plugged: true, demandConfirmed: true, startEligible: true, source: 'iec61851-mode3', reason: `mode3-${mode3.toLowerCase()}-charging` };
        }
    }

    // OCPP 1.6 / 2.x und herstellerübergreifende Zustände.
    if (token.includes('suspendedevse')) {
        return { ...result, state: 'paused_by_evse', plugged: true, demandConfirmed: true, startEligible: true, reason: 'suspended-evse-waits-for-ems' };
    }
    if (token.includes('suspendedev') && !token.includes('suspendedevse')) {
        return { ...result, state: 'paused_by_vehicle', plugged: true, reason: 'vehicle-not-requesting' };
    }

    // Negative/terminale Herstellertexte muessen vor dem generischen Wort
    // `charging` ausgewertet werden. Sonst wuerden z. B. KEBA-Texte wie
    // `Not ready for charging` oder `Charging interrupted / rejected`
    // faelschlich als aktiver Ladebedarf gelten.
    if (includesAny(
        'waitingforev', 'waitingforvehicle', 'waitforev', 'waitforvehicle',
        'novehiclepresent', 'readyforchargingwaitingforev',
    )) {
        return { ...result, state: 'disconnected', reason: `status-${token}-waiting-for-vehicle` };
    }
    if (includesAny(
        'notreadyforcharging', 'notreadytocharge', 'notcharging', 'nocharging',
        'chargingpaused', 'chargepaused', 'chargingblocked', 'chargeblocked',
        'charginginterrupted', 'chargerejected', 'chargingrejected',
        'chargecomplete', 'chargingcomplete', 'fullycharged', 'batteryfull',
        'vehiclefull', 'evfull', 'chargingstopped', 'chargestopped', 'terminated',
    )) {
        return { ...result, state: 'paused_by_vehicle', plugged: true, reason: `status-${token}-no-demand` };
    }
    if (includesAny(
        'waitingforcurrent', 'waitingforpower', 'waitingforcharging',
        'chargerequested', 'chargingrequested', 'requestingcharge',
        'requestingcharging', 'evrequestscharge', 'vehicleasksforcharge',
    )) {
        return { ...result, state: 'ready_to_charge', plugged: true, demandConfirmed: true, startEligible: true, reason: `status-${token}-vehicle-demand` };
    }
    if (token.includes('charging')) {
        return { ...result, state: 'charging', plugged: true, demandConfirmed: true, startEligible: true, reason: `status-${token}` };
    }
    if (token.includes('preparing')) {
        return { ...result, state: 'ready_to_charge', plugged: true, startEligible: true, reason: `status-${token}-startable` };
    }
    if (token.includes('evconnected') || token.includes('occupied')) {
        return { ...result, state: 'connected', plugged: true, startEligible: true, reason: `status-${token}-startable` };
    }
    if (token.includes('finishing')) {
        return { ...result, state: 'finishing', plugged: true, reason: `status-${token}-no-demand` };
    }
    if (token.includes('reserved')) {
        return { ...result, state: 'reserved', reason: 'status-reserved-no-vehicle' };
    }

    // Herstellertexte ohne expliziten CP-Code.
    const vendorReady = includesAny(
        'permissiontocharge', 'hasthepermissiontocharge', 'allowedtocharge',
        'authorisedtocharge', 'authorizedtocharge', 'readytocharge',
        'chargepermission', 'chargingpermission', 'ladefreigabe',
        'fahrzeugdarfladen', 'toestemmingomteladen', 'klaaromteladen',
    );
    if (vendorReady) {
        return {
            ...result,
            state: 'ready_to_charge',
            plugged: true,
            demandConfirmed: true,
            startEligible: true,
            source: 'vendor-status-normalizer',
            reason: `vendor-status-${token}-ready`,
        };
    }
    if (includesAny('noevconnected', 'novehicle', 'keinfahrzeug', 'geenautoverbonden')) {
        return { ...result, state: 'disconnected', source: 'vendor-status-normalizer', reason: `vendor-status-${token}-disconnected` };
    }
    if (includesAny('evconnected', 'vehicleconnected', 'carconnected', 'fahrzeugverbunden', 'autoverbonden')) {
        return { ...result, state: 'connected', plugged: true, startEligible: true, source: 'vendor-status-normalizer', reason: `vendor-status-${token}-startable` };
    }

    // Konservative Fallbacks. Plain `Ready` bleibt wie OCPP `Available` frei;
    // eindeutig verbunden/plugged darf dagegen einen zeitlich begrenzten
    // technischen Startversuch erhalten.
    if (['available', 'idle', 'unplugged', 'free', 'ready'].includes(token)) {
        return { ...result, state: 'disconnected', reason: `status-${token}-not-connected` };
    }
    if (['stopping', 'stopped', 'ending'].includes(token)) {
        return { ...result, state: 'finishing', plugged: true, reason: `status-${token}-no-demand` };
    }
    if (['plugged', 'connected', 'starting'].includes(token)) {
        return { ...result, state: 'connected', plugged: true, startEligible: true, reason: `status-${token}-startable` };
    }
    return result;
}

/**
 * Mehrere frische Zustandsquellen derselben Wallbox deterministisch
 * zusammenführen. Das ist insbesondere bei OCPP erforderlich, weil
 * `transactions.chargingState` und `info.status` zeitversetzt aktualisiert
 * werden können. Sicherheits- und Fahrzeug-Pausenzustände dürfen dabei nicht
 * von einem schwächeren `Occupied`/`Connected` überschrieben werden; ein
 * startbarer Kontakt darf umgekehrt ein bloßes `Idle`/`Available` ergänzen.
 */
function mergeUniversalEvcsStatusEvidence({
    evidence = [],
    statusDemandValues = '',
    statusReadyValues = '',
    statusConnectedValues = '',
    statusDisconnectedValues = '',
    statusNoDemandValues = '',
} = {}) {
    const candidates = (Array.isArray(evidence) ? evidence : [])
        .map((item, index) => {
            const entry = item && typeof item === 'object' ? item : {};
            const raw = String(entry.status ?? '').trim();
            const fresh = entry.fresh === true && !!raw;
            const classified = classifyUniversalEvcsVehicleStatus({
                status: raw,
                statusFresh: fresh,
                statusDemandValues,
                statusReadyValues,
                statusConnectedValues,
                statusDisconnectedValues,
                statusNoDemandValues,
            });
            return {
                index,
                raw,
                fresh,
                evidenceSource: String(entry.source || `status-evidence-${index + 1}`),
                classified,
            };
        })
        .filter((item) => item.fresh);

    if (!candidates.length) {
        return {
            ...classifyUniversalEvcsVehicleStatus({ status: '', statusFresh: false }),
            evidenceSource: '',
            evidenceSummary: '',
        };
    }

    const priorityForState = (state) => {
        const token = String(state || 'unknown');
        if (['offline', 'faulted', 'unavailable'].includes(token)) return 100;
        if (['paused_by_vehicle', 'finishing'].includes(token)) return 90;
        if (token === 'charging') return 80;
        if (token === 'paused_by_evse') return 75;
        if (token === 'ready_to_charge') return 70;
        if (token === 'connected') return 60;
        if (token === 'disconnected') return 30;
        if (token === 'reserved') return 20;
        return 0;
    };

    let selected = candidates[0];
    let selectedPriority = priorityForState(selected.classified.state);
    for (const candidate of candidates.slice(1)) {
        const priority = priorityForState(candidate.classified.state);
        if (priority > selectedPriority) {
            selected = candidate;
            selectedPriority = priority;
        }
    }

    return {
        ...selected.classified,
        evidenceSource: selected.evidenceSource,
        evidenceSummary: candidates
            .map((item) => `${item.evidenceSource}:${item.classified.state}`)
            .join('|'),
    };
}

/** Eventbasierte Fahrzeugzustände dürfen bei frischem Geräte-Heartbeat bestehen bleiben. */
function isPersistentEvcsVehicleState(state) {
    return new Set([
        'disconnected', 'connected', 'ready_to_charge',
        'paused_by_evse', 'paused_by_vehicle', 'finishing', 'reserved',
    ]).has(String(state || ''));
}

/**
 * Alle verfügbaren Beweise zusammenführen. Frische harte Fehler sowie
 * ausdrückliche Fahrzeug-Pausen-/Endzustände sind autoritativ; danach folgen
 * reale Leistung, expliziter Ladebedarf, Fahrzeugkontakt und Statussemantik.
 */
function resolveUniversalEvcsVehicleDemand({
    actualPowerW = 0,
    activityThresholdW = 100,
    status = '',
    statusFresh = false,
    explicitConnected = null,
    explicitConnectedKnown = false,
    explicitDemand = null,
    explicitDemandKnown = false,
    statusDemandValues = '',
    statusReadyValues = '',
    statusConnectedValues = '',
    statusDisconnectedValues = '',
    statusNoDemandValues = '',
    classifiedStatus = null,
} = {}) {
    const thresholdW = Math.max(1, Number(activityThresholdW) || 100);
    const actualW = Math.max(0, Number(actualPowerW) || 0);
    const classified = classifiedStatus && typeof classifiedStatus === 'object'
        ? classifiedStatus
        : classifyUniversalEvcsVehicleStatus({
            status,
            statusFresh,
            statusDemandValues,
            statusReadyValues,
            statusConnectedValues,
            statusDisconnectedValues,
            statusNoDemandValues,
        });

    // Frische harte Fehler sowie ausdrückliche Fahrzeug-Pausen-/Endzustände
    // sind für die Sollwertbildung autoritativ. Ein noch nachlaufender oder
    // verspätet gemeldeter Leistungswert darf keinen neuen Start erzwingen.
    if (['offline', 'faulted', 'unavailable', 'paused_by_vehicle', 'finishing', 'reserved'].includes(classified.state)) {
        return {
            plugged: classified.plugged === true,
            demandConfirmed: false,
            startEligible: false,
            state: classified.state,
            source: classified.evidenceSource || classified.source,
            reason: classified.reason,
            normalizedStatus: classified.token,
        };
    }

    if (actualW >= thresholdW) {
        return {
            plugged: true,
            demandConfirmed: true,
            startEligible: true,
            state: 'charging',
            source: 'fresh-power',
            reason: 'fresh-power-flow',
            normalizedStatus: classified.token,
        };
    }

    // Ein expliziter Unplug-/Kein-Bedarf-DP ist autoritativ. Das verhindert,
    // dass ein generischer Status einen vollgeladenen oder pausierenden EV
    // wiederholt anstartet.
    if (explicitConnectedKnown && explicitConnected === false) {
        return {
            plugged: false,
            demandConfirmed: false,
            startEligible: false,
            state: 'disconnected',
            source: 'explicit-connected-dp',
            reason: 'explicit-unplugged',
            normalizedStatus: classified.token,
        };
    }

    if (explicitDemandKnown) {
        if (explicitDemand === true) {
            return {
                plugged: true,
                demandConfirmed: true,
                startEligible: true,
                state: 'ready_to_charge',
                source: 'explicit-demand-dp',
                reason: 'explicit-charge-demand',
                normalizedStatus: classified.token,
            };
        }
        const connected = explicitConnectedKnown
            ? explicitConnected === true
            : classified.plugged === true;
        return {
            plugged: connected,
            demandConfirmed: false,
            startEligible: false,
            state: connected ? 'paused_by_vehicle' : 'disconnected',
            source: 'explicit-demand-dp',
            reason: connected ? 'explicit-no-charge-demand' : 'explicit-no-demand-no-vehicle',
            normalizedStatus: classified.token,
        };
    }

    // Ein expliziter Fahrzeugkontakt ist fuer generische/mehrdeutige Statuswerte
    // (z. B. `Ready` oder `Available`) der staerkere Anschlussbeweis. Harte
    // Sicherheitszustaende wurden bereits oben abgefangen; ein ausdruecklicher
    // Kein-Ladebedarf-DP bleibt ebenfalls autoritativ.
    if (explicitConnectedKnown && explicitConnected === true && classified.state === 'disconnected') {
        return {
            plugged: true,
            demandConfirmed: false,
            startEligible: true,
            state: 'connected',
            source: 'explicit-connected-dp',
            reason: `explicit-connected-overrides-${classified.reason || 'ambiguous-status'}`,
            normalizedStatus: classified.token,
        };
    }

    if (classified.state !== 'unknown') {
        return {
            plugged: classified.plugged === true,
            demandConfirmed: classified.demandConfirmed === true,
            startEligible: classified.startEligible === true || classified.demandConfirmed === true,
            state: classified.state,
            source: classified.evidenceSource || classified.source,
            reason: classified.reason,
            normalizedStatus: classified.token,
        };
    }

    if (explicitConnectedKnown && explicitConnected === true) {
        return {
            plugged: true,
            demandConfirmed: false,
            startEligible: true,
            state: 'connected',
            source: 'explicit-connected-dp',
            reason: 'explicit-connected-startable',
            normalizedStatus: classified.token,
        };
    }

    return {
        plugged: false,
        demandConfirmed: false,
        startEligible: false,
        state: 'unknown',
        source: statusFresh ? 'status-unknown' : 'stale-or-missing-status',
        reason: statusFresh ? 'status-not-classified' : 'no-fresh-vehicle-proof',
        normalizedStatus: classified.token,
    };
}

/**
 * Code-Teil: resolveConfirmedEvcsVehicleDemand
 * Zweck: Trennt den physischen Anschlusszustand von einem tatsaechlich
 * bestaetigten Ladebedarf. Ein alter Sollwert, ein stale Status oder OCPP
 * `Reserved` darf weder Gesamt- noch PV-Budget blockieren.
 *
 * Regeln:
 * - frische reale Leistung ist immer ein bestaetigter Bedarf,
 * - `Charging` und `SuspendedEVSE` bestaetigen Bedarf,
 * - `Preparing`, `Occupied`, IEC-B1/B2 sowie explizit verbundene Fahrzeuge
 *   duerfen einen zeitlich begrenzten Mindestleistungs-Startversuch erhalten,
 * - `SuspendedEV`, `Finishing` und `Reserved` fordern keine neue EMS-Leistung an,
 * - stale/unklare Stati erzeugen ohne explizit positives Plug-Signal keinen
 *   Ladebedarf.
 */
function resolveConfirmedEvcsVehicleDemand({
    actualPowerW = 0,
    activityThresholdW = 100,
    status = '',
    statusFresh = false,
    explicitPlug = null,
    explicitPlugKnown = false,
} = {}) {
    // Legacy-Vertrag: Ein alter expliziter Plug-DP bedeutete bisher gleichzeitig
    // „Fahrzeug vorhanden“ und „Ladebedarf“. Neue Runtime-Aufrufer nutzen die
    // getrennten vehicleConnected-/chargeDemand-DPs über den universellen Resolver.
    return resolveUniversalEvcsVehicleDemand({
        actualPowerW,
        activityThresholdW,
        status,
        statusFresh,
        explicitConnected: explicitPlug,
        explicitConnectedKnown: explicitPlugKnown,
        explicitDemand: explicitPlug,
        explicitDemandKnown: explicitPlugKnown,
    });
}

/**
 * Code-Teil: computePendingPvStartIntentW
 * Zweck: Reserviert fuer einen verbundenen PV-/Min+PV-Ladepunkt nur den
 * technisch erforderlichen Startbedarf, bevor dessen reale Leistung oder
 * Sollwert wegen Start-Hysterese, Rampenbegrenzung oder traeger
 * Wallbox-Telemetrie sichtbar wird. Nicht genutzte prozentuale EVCS-Anteile
 * bleiben dadurch im selben EMS-Zyklus fuer den Speicher verfuegbar.
 * Der Wert reduziert nur das zentrale PV-Restbudget; er wird nicht als bereits
 * bezogene Netz-/Gesamtleistung verbucht.
 *
 * Sicherheitsregeln:
 * - Nur installierte, online erreichbare und wirklich verbundene Ladepunkte mit
 *   einem beschreibbaren Sollwert duerfen einen Intent erzeugen.
 * - Ein Start-Cooldown oder eine wartende Ziel-SoC-Freigabe blockiert den Intent.
 * - Stations-, Anschluss-, Wallbox- und zentraler PV-Cap bleiben verbindlich.
 * - Bei PV-only muss die technische Mindestleistung aus dem PV-Grant voll
 *   erreichbar sein; Teilreservierungen unterhalb des fahrbaren Minimums sind
 *   verboten.
 * - Bei Min+PV wird vor dem Start nur die Mindest-/Netzgrundlast im Gesamtbudget
 *   reserviert. PV-Zusatzleistung wird erst bei realem/kommandiertem Ladebetrieb
 *   reserviert; dadurch blockiert ein wartender Ladepunkt keinen Speicheranteil.
 */

/**
 * Code-Teil: computeMinPvAllocationW
 * Zweck: Berechnet den verbindlichen Min+PV-Zielwert aus zwei strikt getrennten
 * Leistungstöpfen. Die technische Mindestleistung kommt aus dem normalen
 * Gesamt-/Netzbudget; ausschließlich die Leistung oberhalb dieser Basis darf den
 * zentralen PV-Grant verbrauchen.
 *
 * Dadurch gilt für Min+PV auch bei 0 W PV-Überschuss:
 * - harte Anschluss-, Phasen-, §14a- und Stationslimits bleiben verbindlich,
 * - ist die Mindestleistung innerhalb dieser Limits möglich, startet bzw. hält
 *   der Ladepunkt seine Mindestladung,
 * - fehlender PV-Überschuss reduziert nur die Zusatzleistung und stoppt nicht die
 *   netzgestützte Mindestladung.
 */
/**
 * Ablauf und Zusammenhang: Berechnet die im Modus Min+PV verfügbare Ladeleistung unter Berücksichtigung der technischen Mindestleistung und des zusätzlichen PV-Anteils. Das Ergebnis bleibt eine Anforderung und muss Stations- und Netzgrenzen noch einhalten.
 */
function computeMinPvAllocationW({
    minPowerW = 0,
    technicalMinW = 0,
    maxPowerW = 0,
    totalAvailableW = Number.POSITIVE_INFINITY,
    stationAvailableW = Number.POSITIVE_INFINITY,
    pvAvailableW = 0,
} = {}) {
    const maxW = Math.max(0, Number(maxPowerW) || 0);
    const configuredMinW = Math.max(0, Number(minPowerW) || 0);
    const technicalW = Math.max(0, Number(technicalMinW) || 0);
    const baseW = Math.max(0, Math.min(maxW, Math.max(configuredMinW, technicalW)));
    const totalW = Number.isFinite(Number(totalAvailableW))
        ? Math.max(0, Number(totalAvailableW))
        : Number.POSITIVE_INFINITY;
    const stationW = Number.isFinite(Number(stationAvailableW))
        ? Math.max(0, Number(stationAvailableW))
        : Number.POSITIVE_INFINITY;
    const hardAvailableW = Math.max(0, Math.min(maxW, totalW, stationW));
    const pvW = Math.max(0, Number(pvAvailableW) || 0);

    if (!(maxW > 0) || !(hardAvailableW > 0)) {
        return {
            targetW: 0,
            baseW,
            pvExtraW: 0,
            hardAvailableW,
            reason: 'no-total-capacity',
        };
    }
    if (baseW > 0 && hardAvailableW + 1e-6 < baseW) {
        return {
            targetW: 0,
            baseW,
            pvExtraW: 0,
            hardAvailableW,
            reason: 'below-minpv-base',
        };
    }

    const baseTargetW = baseW > 0 ? baseW : 0;
    const pvExtraW = Math.max(0, Math.min(pvW, hardAvailableW - baseTargetW));
    const targetW = Math.max(0, Math.min(hardAvailableW, baseTargetW + pvExtraW));
    return {
        targetW,
        baseW: baseTargetW,
        pvExtraW,
        hardAvailableW,
        reason: targetW > 0
            ? (pvExtraW > 0 ? 'minpv-base-plus-pv' : 'minpv-grid-base')
            : 'no-pv-and-no-base',
    };
}

/**
 * Code-Teil: computeGoalPowerCapW
 * Zweck: Uebersetzt die Zeit-/Zielladeleistung in einen technisch fahrbaren
 * oberen Ladepunkt-Cap. Im Modus Min+PV darf ein positiver Ziel-Ladewunsch die
 * netzgestuetzte Mindestleistung nicht unterbieten; sonst wuerde ein rechnerisch
 * kleiner Durchschnittswert (z. B. 2 kW) nach der 6-A-Quantisierung zu 0 W und
 * die gewollte unterbrechungsfreie Mindestladung stoppen.
 *
 * Harte Anschluss-, Phasen-, §14a-, Stations- und Wallbox-Caps werden bereits
 * vor beziehungsweise nach diesem Ziel-Cap angewendet und bleiben verbindlich.
 */
function computeGoalPowerCapW({
    mode = '',
    desiredW = 0,
    minPvBaseW = 0,
    maxPowerW = Number.POSITIVE_INFINITY,
} = {}) {
    const normalizedMode = String(mode || '').trim().toLowerCase();
    const maxW = Number.isFinite(Number(maxPowerW))
        ? Math.max(0, Number(maxPowerW))
        : Number.POSITIVE_INFINITY;
    let capW = Math.max(0, Number(desiredW) || 0);
    if (normalizedMode === 'minpv' && capW > 0) {
        capW = Math.max(capW, Math.max(0, Number(minPvBaseW) || 0));
    }
    return Math.max(0, Math.min(maxW, capW));
}

function computePendingPvStartIntentW({
    mode = '',
    enabled = false,
    online = false,
    connected = false,
    startEligible = false,
    controlBasis = 'none',
    status = '',
    normalizedVehicleState = '',
    startCooldownActive = false,
    goalBlocked = false,
    currentPowerW = 0,
    currentPvIntentW = 0,
    minPowerW = 0,
    technicalMinW = 0,
    maxPowerW = 0,
    totalRemainingW = Number.POSITIVE_INFINITY,
    stationRemainingW = Number.POSITIVE_INFINITY,
    pvRemainingW = 0,
    activityThresholdW = 100,
} = {}) {
    const normalizedMode = String(mode || '').trim().toLowerCase();
    const isPvOnly = normalizedMode === 'pv';
    const isMinPv = normalizedMode === 'minpv';
    const validControl = String(controlBasis || '').trim().toLowerCase() !== 'none';
    const mayStart = startEligible === true || connected === true;
    if ((!isPvOnly && !isMinPv) || !enabled || !online || !mayStart || !validControl || startCooldownActive || goalBlocked) {
        return { intentW: 0, totalDemandW: 0, reason: 'not-eligible' };
    }

    // OCPP/Herstellerstatus trennt ein wartendes EVSE von einem Fahrzeug, das
    // selbst keine Energie anfordert. `SuspendedEVSE` darf reservieren, weil die
    // Wallbox typischerweise auf EMS-Leistung wartet. `SuspendedEV` darf dagegen
    // keinen PV-Anteil fuer ein gerade nicht ladewilliges Fahrzeug blockieren.
    const normalizedState = String(normalizedVehicleState || '').trim().toLowerCase();
    if (normalizedState) {
        if (['paused_by_vehicle', 'finishing', 'disconnected', 'faulted', 'offline', 'unavailable', 'reserved'].includes(normalizedState)) {
            return { intentW: 0, totalDemandW: 0, reason: normalizedState === 'paused_by_vehicle' ? 'vehicle-not-requesting' : 'status-not-requesting' };
        }
        if (!['connected', 'ready_to_charge', 'charging', 'paused_by_evse'].includes(normalizedState)) {
            return { intentW: 0, totalDemandW: 0, reason: 'status-not-requesting' };
        }
    } else {
        // Legacy-Fallback für ältere Aufrufer ohne semantischen Zustand.
        const normalizedStatus = String(status || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
        const suspendedByEvse = normalizedStatus.includes('suspendedevse');
        const suspendedByVehicle = normalizedStatus.includes('suspendedev') && !suspendedByEvse;
        if (suspendedByVehicle) {
            return { intentW: 0, totalDemandW: 0, reason: 'vehicle-not-requesting' };
        }
        const statusCanRequestPower = !normalizedStatus
            || suspendedByEvse
            || normalizedStatus.includes('preparing')
            || normalizedStatus.includes('occupied')
            || normalizedStatus.includes('charging')
            || normalizedStatus.includes('permissiontocharge')
            || normalizedStatus.startsWith('b2')
            || normalizedStatus.startsWith('c1')
            || normalizedStatus.startsWith('c2');
        if (!statusCanRequestPower) {
            return { intentW: 0, totalDemandW: 0, reason: 'status-not-requesting' };
        }
    }

    const maxW = Math.max(0, Number(maxPowerW) || 0);
    const currentW = Math.max(0, Math.min(maxW, Number(currentPowerW) || 0));
    const currentIntentW = Math.max(0, Number(currentPvIntentW) || 0);
    const minW = Math.max(0, Number(minPowerW) || 0);
    const technicalW = Math.max(minW, Number(technicalMinW) || 0);
    const thresholdW = Math.max(1, Number(activityThresholdW) || 100);
    const totalAvailW = Number.isFinite(Number(totalRemainingW))
        ? Math.max(0, Number(totalRemainingW))
        : Number.POSITIVE_INFINITY;
    const stationAvailW = Number.isFinite(Number(stationRemainingW))
        ? Math.max(0, Number(stationRemainingW))
        : Number.POSITIVE_INFINITY;
    const pvAvailW = Math.max(0, Number(pvRemainingW) || 0);
    if (maxW <= 0 || (isPvOnly && pvAvailW <= 0)) {
        return { intentW: 0, totalDemandW: 0, reason: 'no-capacity' };
    }

    // Das verbleibende Gesamt-/Stationsbudget beschreibt nur zusaetzliche
    // Leistung, weil die bereits kommandierte Leistung im Hauptlauf zuvor
    // abgezogen wurde. So kann kein Ladepunkt denselben Anschlussanteil doppelt
    // fuer einen aktiven Sollwert und einen Start-Intent verwenden.
    const additionalConnectorW = Math.max(0, maxW - currentW);
    const additionalTotalW = Math.max(0, Math.min(additionalConnectorW, totalAvailW, stationAvailW));
    const potentialTotalW = currentW + additionalTotalW;

    if (isPvOnly) {
        const isAlreadyActive = currentW >= thresholdW;

        // Ein noch nicht gestarteter reiner PV-Ladepunkt darf nicht vorsorglich
        // seinen kompletten prozentualen EVCS-Anteil blockieren. Fuer den Start
        // wird nur die technisch wirklich benoetigte Mindestleistung reserviert.
        // Ist selbst diese Mindestleistung im zentralen PV-Grant nicht vorhanden,
        // entsteht bewusst gar kein Pending-Intent. Der ungenutzte PV-Anteil bleibt
        // dadurch im selben EMS-Zyklus fuer Speicher und nachgelagerte Verbraucher
        // verfuegbar, statt als nicht fahrbare Teilreservierung liegen zu bleiben.
        const startMinimumW = technicalW > 0 ? technicalW : Math.max(thresholdW, minW);
        if (maxW + 1e-6 < startMinimumW) {
            return { intentW: 0, totalDemandW: 0, reason: 'below-technical-minimum' };
        }
        if (!isAlreadyActive) {
            const startAvailableW = Math.max(0, Math.min(potentialTotalW, pvAvailW));
            if (startMinimumW > 0 && startAvailableW + 1e-6 < startMinimumW) {
                return { intentW: 0, totalDemandW: 0, reason: 'below-technical-minimum' };
            }
            const desiredStartW = Math.max(0, Math.min(potentialTotalW, pvAvailW, startMinimumW || pvAvailW));
            const intentW = Math.max(0, desiredStartW - Math.min(desiredStartW, currentIntentW));
            return {
                intentW,
                totalDemandW: intentW,
                reason: intentW > 0 ? 'pv-start-minimum-intent' : 'covered',
            };
        }

        // Sobald ein Ladepunkt wirklich kommandiert/laedt, darf sein aktiver
        // Rampenbedarf bis zum zentralen PV-Cap reserviert werden. Dann handelt es
        // sich nicht mehr um eine vorsorgliche Startreservierung, sondern um realen
        // beziehungsweise unmittelbar wirksamen Ladebedarf.
        const desiredPvTotalW = Math.max(0, potentialTotalW);
        const intentGapW = Math.max(0, desiredPvTotalW - currentIntentW);
        const intentW = Math.max(0, Math.min(intentGapW, pvAvailW));
        return {
            intentW,
            totalDemandW: intentW,
            reason: intentW > 0 ? 'pv-ramp-intent' : 'covered',
        };
    }

    // Min+PV benoetigt zunaechst seine technische Mindestleistung aus dem
    // normalen Gesamtbudget. Fehlender PV-Ueberschuss darf nur die Zusatzleistung
    // begrenzen, niemals die netzgestuetzte Mindestladung selbst blockieren.
    const minPvBaseW = Math.max(0, Math.min(maxW, Math.max(minW, technicalW)));
    if (minPvBaseW > 0 && potentialTotalW + 1e-6 < minPvBaseW) {
        return { intentW: 0, totalDemandW: 0, reason: 'below-minpv-base' };
    }
    const missingBaseW = currentW >= minPvBaseW ? 0 : Math.max(0, minPvBaseW - currentW);
    // Vor dem tatsaechlichen/kommandierten Start reserviert Min+PV ausschliesslich
    // seine netzgestuetzte Mindestleistung im Gesamtbudget. Ein zusaetzlicher
    // PV-Anteil wird erst reserviert, sobald die Mindestladung wirklich steht.
    // So kann ein idle oder noch wartender Min+PV-Ladepunkt keinen PV-Ueberschuss
    // blockieren, den der Speicher in diesem Moment sinnvoll aufnehmen kann.
    const baseEstablished = currentW >= Math.max(thresholdW, Math.max(0, minPvBaseW - 1));
    const desiredPvTotalW = baseEstablished
        ? Math.max(0, potentialTotalW - Math.min(minPvBaseW, potentialTotalW))
        : 0;
    const intentGapW = Math.max(0, desiredPvTotalW - currentIntentW);
    const intentW = Math.max(0, Math.min(intentGapW, pvAvailW));
    const totalDemandW = Math.max(0, missingBaseW + intentW);
    if (totalDemandW <= 0) {
        return { intentW: 0, totalDemandW: 0, reason: 'covered' };
    }
    return {
        intentW,
        totalDemandW,
        reason: currentW >= thresholdW
            ? (intentW > 0 ? 'minpv-ramp-intent' : 'minpv-grid-base-hold-intent')
            : (intentW > 0 ? 'minpv-start-intent' : 'minpv-grid-base-start-intent'),
    };
}

/**
 * Code-Teil: computePendingPvStartTotalBudgetW
 * Zweck: Loest den Start-Deadlock zwischen PV-Hysterese und zentraler
 * Budgetreservierung auf.
 *
 * Hintergrund:
 * Der normale EVCS-Sollwert darf waehrend der PV-Startverzoegerung noch 0 W
 * sein. Dadurch kann auch das lokale `remainingW` voruebergehend 0 W melden,
 * obwohl das zentrale EMS bereits einen gueltigen PV- und Gesamt-Grant sieht.
 * Wuerde der Pending-Intent dieses lokale 0-W-Ergebnis verwenden, koennte der
 * Speicher den kompletten PV-Anteil uebernehmen und die Wallbox kaeme nie aus
 * `SuspendedEVSE` heraus.
 *
 * Die Funktion verwendet deshalb fuer den noch nicht gestarteten Ladeanteil
 * den groesseren Wert aus:
 * - lokal verbleibendem Anschluss-/Stationsbudget und
 * - zentralem Gesamt-Grant nach Abzug bereits aktiver EVCS-Leistung.
 *
 * Stations-, Wallbox-, Phasen- und technische Mindestgrenzen werden danach im
 * Pending-Intent weiterhin separat angewendet. Der Wert reserviert nur einen
 * Startwunsch; er wird nicht als bereits gemessener Netzbezug verbucht.
 */
function computePendingPvStartTotalBudgetW({
    localRemainingW = 0,
    centralTotalGrantW = null,
    activeDemandW = 0,
} = {}) {
    const localRaw = Number(localRemainingW);
    const localW = localRaw === Number.POSITIVE_INFINITY
        ? Number.POSITIVE_INFINITY
        : (Number.isFinite(localRaw) ? Math.max(0, localRaw) : 0);
    const centralRaw = Number(centralTotalGrantW);
    if (!Number.isFinite(centralRaw)) return localW;

    const centralAdditionalW = Math.max(0, centralRaw - Math.max(0, Number(activeDemandW) || 0));
    return Math.max(localW, centralAdditionalW);
}

/**
 * Code-Teil: resolveChargingPvBudgetControl
 * Zweck: Macht das zentrale EMS-PV-Budget zur autoritativen Quelle fuer PV-
 * und Min+PV-Ladepunkte. Die lokale EVCS-Rekonstruktion bleibt nur Diagnose-
 * und Rueckwaertskompatibilitaets-Fallback, damit Speicher, Wallboxen,
 * Heizstaebe und weitere Verbraucher niemals mit getrennten PV-Budgets regeln.
 */
function resolveChargingPvBudgetControl({
    centralBudget = null,
    now = Date.now(),
    maxAgeMs = 30000,
    localRawW = 0,
    localEffectiveW = 0,
} = {}) {
    const localRaw = Math.max(0, Number(localRawW) || 0);
    const localEffective = Math.max(0, Number(localEffectiveW) || 0);
    const rt = centralBudget && typeof centralBudget === 'object' ? centralBudget : null;
    const ts = rt ? Number(rt.ts) : NaN;
    const ageMs = Number.isFinite(ts) && ts > 0 ? Math.max(0, Number(now) - ts) : null;
    const fresh = ageMs !== null && ageMs <= Math.max(1000, Number(maxAgeMs) || 30000);
    const pvGate = rt && rt.gates && rt.gates.pv && typeof rt.gates.pv === 'object'
        ? rt.gates.pv
        : null;
    const allocation = rt && rt.gates && rt.gates.pvAllocation && typeof rt.gates.pvAllocation === 'object'
        ? rt.gates.pvAllocation
        : null;

    if (fresh && pvGate) {
        const gateEffectiveW = Math.max(0, Number(pvGate.effectiveW) || 0);
        const allocationTotalW = allocation && Number.isFinite(Number(allocation.totalW))
            ? Math.max(0, Number(allocation.totalW))
            : gateEffectiveW;
        const allocationCapW = allocation && Number.isFinite(Number(allocation.evcsCapW))
            ? Math.max(0, Number(allocation.evcsCapW))
            : allocationTotalW;
        const allocationLimitedW = Math.max(0, Math.min(allocationTotalW, allocationCapW));

        // Zwei zentrale PV-Grants sind absichtlich getrennt:
        // - physicalGrantW: gesamtes aktuell physikalisch verfuegbares PV-Budget.
        //   Dieses darf Min+PV fuer seine Zusatzleistung verwenden, weil seine
        //   Mindestleistung bereits aus dem normalen Gesamt-/Netzbudget kommt.
        // - priorityGrantW: kundenseitiger Speicher/E-Mobilitaets-Anteil. Dieser
        //   begrenzt ausschliesslich reine PV-Ladepunkte.
        // Beide Werte stammen aus derselben Core-Budget-Runtime; es entsteht kein
        // lokales Parallelbudget im Lademanagement.
        const physicalGrant = typeof rt.getPvGrant === 'function'
            ? rt.getPvGrant({
                key: 'evcs',
                requestedW: allocationTotalW,
                maxW: allocationTotalW,
                applyEvcsAllocationCap: false,
            })
            : (typeof rt.grant === 'function'
                ? rt.grant({
                    key: 'evcs',
                    requestedW: allocationTotalW,
                    maxW: allocationTotalW,
                    pvOnly: true,
                    applyEvcsAllocationCap: false,
                })
                : null);
        const physicalGrantW = physicalGrant && Number.isFinite(Number(physicalGrant.grantW))
            ? Math.max(0, Math.min(allocationTotalW, Number(physicalGrant.grantW)))
            : allocationTotalW;

        const priorityGrant = typeof rt.getPvGrant === 'function'
            ? rt.getPvGrant({ key: 'evcs', requestedW: allocationLimitedW, maxW: allocationLimitedW })
            : (typeof rt.grant === 'function'
                ? rt.grant({ key: 'evcs', requestedW: allocationLimitedW, maxW: allocationLimitedW, pvOnly: true })
                : null);
        const evcsCapW = priorityGrant && Number.isFinite(Number(priorityGrant.grantW))
            ? Math.max(0, Math.min(physicalGrantW, allocationLimitedW, Number(priorityGrant.grantW)))
            : Math.max(0, Math.min(physicalGrantW, allocationLimitedW));
        return {
            authoritative: true,
            source: 'central-ems-budget',
            ageMs,
            rawW: Math.max(0, Number(pvGate.rawW) || 0),
            totalW: physicalGrantW,
            evcsCapW,
            allocation: allocation || {},
            localRawW: localRaw,
            localEffectiveW: localEffective,
            mismatchW: evcsCapW - localEffective,
            centralGrantW: evcsCapW,
            physicalGrantW,
            priorityGrantW: evcsCapW,
        };
    }

    // In der aktuellen Adaptergeneration ist Core-Limits immer vor dem
    // Lademanagement aktiv. Existiert die zentrale Runtime, ist sie daher auch
    // bei einem kurzzeitig fehlenden/stalen Snapshot die einzige Quelle. Ein
    // Rueckfall auf die lokale EVCS-PV-Rekonstruktion wuerde genau das zweite
    // Parallelbudget erzeugen, das Speicher und Wallbox gegeneinander regeln
    // laesst. In diesem Fehlerfall wird PV-Laden sicher blockiert, bis der Core
    // wieder einen frischen Grant liefert.
    if (rt) {
        return {
            authoritative: true,
            blocked: true,
            source: fresh ? 'central-ems-budget-missing-pv-gate' : 'central-ems-budget-stale-blocked',
            ageMs,
            rawW: 0,
            totalW: 0,
            evcsCapW: 0,
            allocation: allocation || null,
            localRawW: localRaw,
            localEffectiveW: localEffective,
            mismatchW: -localEffective,
            centralGrantW: 0,
        };
    }

    // Nur fuer sehr alte Laufzeiten ohne Core-Limits bleibt der lokale Wert als
    // Kompatibilitaetsfallback erhalten. Im regulaeren NexoWatt-EMS wird dieser
    // Zweig wegen der festen Modulreihenfolge nicht verwendet.
    return {
        authoritative: false,
        source: 'local-fallback-no-central-budget',
        ageMs,
        rawW: localRaw,
        totalW: localEffective,
        evcsCapW: localEffective,
        allocation: null,
        localRawW: localRaw,
        localEffectiveW: localEffective,
        mismatchW: 0,
    };
}
/** Code-Teil: toBool – Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen. */
function toBool(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') {
        if (!Number.isFinite(v)) return null;
        return v !== 0;
    }
    const s = String(v).trim().toLowerCase();
    if (!s) return null;
    if (s === 'true' || s === 'on' || s === 'yes' || s === 'ja' || s === '1' || s === 'plugged' || s === 'connected') return true;
    if (s === 'false' || s === 'off' || s === 'no' || s === 'nein' || s === '0' || s === 'unplugged' || s === 'disconnected') return false;
    return null;
}

// --- Tarif forecast helpers ------------------------------------------------

/**
 * Normalizes either €/kWh or ct/kWh into €/kWh.
 * Heuristic: values with |v| > 2 are interpreted as ct/kWh (common sources: 31.5, 40, ...).
 * Allows small negative prices.
 *
 * @param {any} v
 * @param {number|null} [fallback=null]
 * @returns {number|null}
 */
/** Code-Teil: normalizePriceEurPerKwh – Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen. */
function normalizePriceEurPerKwh(v, fallback = null) {
    let n = (typeof v === 'number') ? v : num(v, fallback);
    if (!Number.isFinite(n)) return fallback;

    // Auto-convert ct/kWh -> €/kWh
    const abs = Math.abs(n);
    if (abs > 2 && abs <= 500) {
        n = n / 100;
    }

    // Plausibility (allow small negative prices)
    if (!Number.isFinite(n) || n < -2 || n > 2) return fallback;
    return n;
}

/**
 * Parse an hourly price curve from either JSON string or already-parsed array/object.
 * Expected (tibber-like) schema: [{ total: 0.318, startsAt: "...", endsAt: "..." }, ...]
 * Also supports a plain numeric array (e.g. [32.1, 30.8, ...]) interpreted as ct/kWh per hour
 * starting at the current full hour.
 *
 * @param {any} raw
 * @returns {Array<{startMs:number,endMs:number,priceEurKwh:number}>}
 */
/** Code-Teil: parsePriceCurve – Parst Rohdaten in ein sicheres internes Format. */
function parsePriceCurve(raw) {
    if (raw === null || raw === undefined) return [];

    let data = raw;
    if (typeof raw === 'string') {
        const s = raw.trim();
        if (!s) return [];
        try {
            data = JSON.parse(s);
        } catch {
            return [];
        }
    }

    // Some providers wrap the array
    if (data && typeof data === 'object' && !Array.isArray(data)) {
        const arr = data.prices || data.data || data.items || data.values || null;
        if (Array.isArray(arr)) {
            data = arr;
        } else {
            return [];
        }
    }

    if (!Array.isArray(data)) return [];

    // Numeric array without timestamps → assume hourly from current full hour
    try {
        /** Code-Teil: Arrow-Funktion `isNumLike` – enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden. */
        /** Code-Teil: isNumLike – Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen. */
        const isNumLike = (v) => {
            if (typeof v === 'number') return Number.isFinite(v);
            if (typeof v === 'string') {
                const s = v.trim();
                if (!s) return false;
                const n = Number(s);
                return Number.isFinite(n);
            }
            return false;
        };
        const hasObject = data.some((it) => it && typeof it === 'object' && !Array.isArray(it));
        const hasNum = data.some((it) => isNumLike(it));

        if (hasNum && !hasObject) {
            const out = [];
            const base = new Date();
            base.setMinutes(0, 0, 0);
            const baseMs = base.getTime();

            let idx = 0;
            for (const it of data) {
                if (!isNumLike(it)) {
                    idx++;
                    continue;
                }
                const rawN = (typeof it === 'number') ? it : Number(String(it).trim());
                const priceEurKwh = normalizePriceEurPerKwh(rawN, null);
                if (!Number.isFinite(priceEurKwh)) {
                    idx++;
                    continue;
                }
                const startMs = baseMs + idx * 3600 * 1000;
                const endMs = startMs + 3600 * 1000;
                out.push({ startMs, endMs, priceEurKwh });
                idx++;
            }
            return out;
        }
    } catch (_e) {}

    const out = [];
    for (const it of data) {
        if (!it || typeof it !== 'object') continue;

        // Price field heuristics
        let pRaw = null;
        if (it.total !== undefined) pRaw = it.total;
        else if (it.price !== undefined) pRaw = it.price;
        else if (it.value !== undefined) pRaw = it.value;
        else if (it.marketprice !== undefined) pRaw = it.marketprice;
        else if (it.marketPrice !== undefined) pRaw = it.marketPrice;
        else if (it.energyPrice !== undefined) pRaw = it.energyPrice;

        if (pRaw === null && it.price && typeof it.price === 'object') {
            if (it.price.total !== undefined) pRaw = it.price.total;
            else if (it.price.value !== undefined) pRaw = it.price.value;
        }

        const price = normalizePriceEurPerKwh(pRaw, null);
        if (typeof price !== 'number' || !Number.isFinite(price)) continue;

        // Time field heuristics
        const startRaw = (it.startsAt !== undefined) ? it.startsAt
            : (it.start !== undefined) ? it.start
                : (it.startTime !== undefined) ? it.startTime
                    : (it.from !== undefined) ? it.from
                        : (it.begin !== undefined) ? it.begin
                            : (it.timestamp !== undefined) ? it.timestamp
                                : (it.time !== undefined) ? it.time
                                    : null;

        let startMs = null;
        if (typeof startRaw === 'number' && Number.isFinite(startRaw)) {
            startMs = (startRaw < 1e12) ? startRaw * 1000 : startRaw;
        } else if (typeof startRaw === 'string') {
            const t = Date.parse(startRaw);
            if (Number.isFinite(t)) startMs = t;
        }
        if (!startMs) continue;

        const endRaw = (it.endsAt !== undefined) ? it.endsAt
            : (it.end !== undefined) ? it.end
                : (it.endTime !== undefined) ? it.endTime
                    : (it.to !== undefined) ? it.to
                        : (it.until !== undefined) ? it.until
                            : null;

        let endMs = null;
        if (typeof endRaw === 'number' && Number.isFinite(endRaw)) {
            endMs = (endRaw < 1e12) ? endRaw * 1000 : endRaw;
        } else if (typeof endRaw === 'string') {
            const t = Date.parse(endRaw);
            if (Number.isFinite(t)) endMs = t;
        }

        // Default: 1 hour
        if (!endMs) endMs = startMs + 60 * 60 * 1000;
        if (endMs <= startMs) endMs = startMs + 60 * 60 * 1000;

        out.push({ startMs, endMs, priceEurKwh: price });
    }

    out.sort((a, b) => a.startMs - b.startMs);
    return out;
}

// --- Time helpers (Goal-Charging) -------------------------------------------

/**
 * Snap a unix timestamp to a 15‑minute grid (00/15/30/45) in local time.
 * Keeps the date, but may roll over to next hour/day when rounding minutes.
 *
 * @param {number} ts
 * @returns {number}
 */
/** Code-Teil: quantizeTsTo15Min – Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen. */
function quantizeTsTo15Min(ts) {
    const n = Number(ts);
    if (!Number.isFinite(n) || n <= 0) return 0;
    try {
        const dt = new Date(n);
        dt.setSeconds(0, 0);
        const m = dt.getMinutes();
        const snapped = Math.round(m / 15) * 15;
        dt.setMinutes(snapped, 0, 0);
        return dt.getTime();
    } catch {
        return Math.round(n);
    }
}

/**
 * Given an existing goal deadline timestamp, compute the next upcoming occurrence
 * of the same local HH:MM (today or next days), at least 1 minute in the future.
 * This keeps the goal schedule repeating daily ("finish by 06:00 every day").
 *
 * @param {number} deadlineTs
 * @param {number} nowMs
 * @returns {number}
 */
/** Code-Teil: nextOccurrenceSameClock – Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen. */
function nextOccurrenceSameClock(deadlineTs, nowMs) {
    const n = Number(deadlineTs);
    const now = Number(nowMs);
    if (!Number.isFinite(n) || n <= 0) return 0;
    if (!Number.isFinite(now) || now <= 0) return n;
    try {
        const base = new Date(n);
        const hh = base.getHours();
        const mm = base.getMinutes();

        const cur = new Date(now);
        const d = new Date(cur);
        d.setHours(hh, mm, 0, 0);

        // If the selected time is in the past (or within 1 minute), schedule for the next day.
        if (d.getTime() <= now + 60000) d.setDate(d.getDate() + 1);
        return d.getTime();
    } catch {
        return n;
    }
}
/** Code-Teil: floorToStep – Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen. */
function floorToStep(value, step) {
    const v = Number(value);
    const s = Number(step);
    if (!Number.isFinite(v)) return value;
    if (!Number.isFinite(s) || s <= 0) return v;
    // Always round DOWN to avoid budget overshoot / limit violations
    return Math.floor(v / s) * s;
}
/** Code-Teil: rampUp – Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen. */
function rampUp(prevValue, targetValue, maxDeltaUp) {
    const t = Number(targetValue);
    const p = Number(prevValue);
    const d = Number(maxDeltaUp);
    if (!Number.isFinite(t)) return targetValue;
    if (!Number.isFinite(d) || d <= 0) return t;
    if (!Number.isFinite(p)) return t;
    if (t <= p) return t; // never limit ramp-down (safety)
    return (t > (p + d)) ? (p + d) : t;
}
/** Code-Teil: choosePositiveMin – Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen. */
function choosePositiveMin(...values) {
    let best = 0;
    for (const raw of values) {
        const n = Number(raw);
        if (!Number.isFinite(n) || n <= 0) continue;
        if (!(best > 0) || n < best) best = n;
    }
    return best > 0 ? best : 0;
}
/** Code-Teil: availabilityReason – trennt Erreichbarkeit von einem frischen Betriebsfehler. */
function availabilityReason(cfgEnabled, userStationEnabled, userEnabled, online, faultActive = false, unavailableActive = false, rfidLockActive = false) {
    if (!cfgEnabled || !userStationEnabled || rfidLockActive) return ReasonCodes.DISABLED;
    if (!userEnabled) return ReasonCodes.CONTROL_DISABLED;
    if (!online) return ReasonCodes.OFFLINE;
    if (faultActive) return ReasonCodes.FAULTED;
    if (unavailableActive) return ReasonCodes.UNAVAILABLE;
    return ReasonCodes.SKIPPED;
}

/**
 * Hardware-Verfügbarkeit einer Wallbox ist eine Zugangsentscheidung – keine
 * Leistungsentscheidung. Normale 0-W-Situationen (Ladeende, Stecker gezogen,
 * PV-/Tarifpause, §14a, Netz-/Safety-Gate oder Regelung aus) dürfen die OCPP-
 * Station deshalb niemals auf Inoperative setzen. Gesperrt wird ausschließlich
 * durch die ausdrückliche Kundensperre oder eine aktive RFID-Whitelist-Sperre.
 */
function resolveEvcsAvailabilityRequest({
    userStationEnabled = true,
    rfidEnforced = false,
    rfidAuthorized = true,
} = {}) {
    const customerLockActive = userStationEnabled === false;
    const rfidLockActive = rfidEnforced === true && rfidAuthorized !== true;
    if (customerLockActive) {
        return {
            requested: false,
            owner: 'customer',
            reason: 'customer-station-lock',
            customerLockActive: true,
            rfidLockActive: false,
        };
    }
    if (rfidLockActive) {
        return {
            requested: false,
            owner: 'rfid',
            reason: 'rfid-not-authorized',
            customerLockActive: false,
            rfidLockActive: true,
        };
    }
    return {
        requested: true,
        owner: 'charging-management',
        reason: 'station-operative',
        customerLockActive: false,
        rfidLockActive: false,
    };
}

/** Code-Teil: normalizeEvcsOnlineFlag – Normalisiert echte Wallbox-Erreichbarkeit aus bool/number/string Datenpunkten. */
function normalizeEvcsOnlineFlag(value, fallback = null) {
    if (value === true || value === false) return value;
    if (typeof value === 'number' && Number.isFinite(value)) return value !== 0;
    if (typeof value === 'string') {
        const s = value.trim().toLowerCase();
        if (!s) return fallback;
        if (['true', '1', 'on', 'yes', 'ja', 'online', 'connected', 'available', 'reachable', 'ready'].includes(s)) return true;
        if (['false', '0', 'off', 'no', 'nein', 'offline', 'disconnected', 'unreachable'].includes(s)) return false;
        // OCPP `Faulted` / `Unavailable` sind Betriebszustaende eines erreichbaren
        // Connectors und keine belastbare Aussage ueber die Netzwerk-Erreichbarkeit.
        // Diese Werte werden separat ueber operationalBlocked/statusEffective bewertet.
        if (['unavailable', 'faulted', 'fault', 'error', 'failed', 'outofservice', 'inoperative'].includes(s.replace(/[^a-z0-9]+/g, ''))) return fallback;
    }
    return fallback;
}

/** Statuswerte stabil normalisieren, ohne `Unavailable` als `Available` zu missdeuten. */
function normalizeEvcsStatusToken(value) {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .replace(/[^a-z0-9]+/g, '');
}

/**
 * OCPP `Available` sowie die herstelleroffenen Synonyme `Ready` und `Idle`
 * sind stabile Bereitschaftszustaende. Ereignisbasierte Adapter aktualisieren
 * deren Zeitstempel oft erst beim naechsten Zustandswechsel. Ein hohes Alter
 * allein darf deshalb weder die UI mit "Status veraltet" warnen noch den
 * Ladepunkt als unbestaetigt behandeln.
 *
 * Transiente oder sicherheitsrelevante Stati wie Charging, Preparing,
 * Unavailable, Faulted und Offline bleiben weiterhin freshness-pflichtig.
 */
function isPersistentEvcsReadyStatus(value) {
    const token = normalizeEvcsStatusToken(value);
    return token === 'available' || token === 'ready' || token === 'idle';
}

/** Zentrale Altersregel fuer connectorbezogene EVCS-Stati. */
function resolveEvcsStatusAgePolicy(value, ageMs, maxAgeMs) {
    const ageKnown = typeof ageMs === 'number' && Number.isFinite(ageMs) && ageMs >= 0;
    const age = ageKnown ? ageMs : Number.NaN;
    const limit = Math.max(1000, Number.isFinite(Number(maxAgeMs)) ? Number(maxAgeMs) : 1000);
    const ageExceeded = !ageKnown || age > limit;
    const persistentReady = isPersistentEvcsReadyStatus(value);
    return {
        ageMs: ageKnown ? Math.round(age) : 0,
        ageExceeded,
        persistentReady,
        stale: ageExceeded && !persistentReady,
    };
}

/**
 * Frischen, connectorbezogenen Wallboxstatus fachlich klassifizieren.
 * `Faulted` und `Unavailable` bestaetigen Erreichbarkeit, blockieren aber positive
 * Ladesollwerte. Nur echte Offline-Werte gelten als nicht erreichbar.
 */
function classifyEvcsConnectorStatus(value, fresh = true) {
    const raw = (value === null || value === undefined) ? '' : String(value).trim();
    const token = normalizeEvcsStatusToken(raw);
    const result = {
        raw,
        token,
        fresh: !!fresh,
        statusClass: 'unknown',
        reachable: null,
        faultActive: false,
        unavailableActive: false,
        operationalBlocked: false,
    };
    if (!raw || !fresh) return result;

    const offlineTokens = new Set(['offline', 'disconnected', 'unreachable', 'notconnected']);
    const faultTokens = new Set(['faulted', 'fault', 'error', 'failed', 'failure', 'stoerung']);
    const unavailableTokens = new Set(['unavailable', 'outofservice', 'inoperative', 'notavailable']);
    const chargingTokens = new Set(['charging']);
    const pluggedTokens = new Set(['preparing', 'plugged', 'occupied', 'suspendedevse', 'suspendedev', 'finishing', 'reserved']);
    const availableTokens = new Set(['available', 'ready', 'idle', 'connected', 'starting', 'stopping']);

    if (offlineTokens.has(token)) {
        result.statusClass = 'offline';
        result.reachable = false;
        return result;
    }
    if (faultTokens.has(token) || token.startsWith('faulted') || token.startsWith('error')) {
        result.statusClass = 'faulted';
        result.reachable = true;
        result.faultActive = true;
        result.operationalBlocked = true;
        return result;
    }
    if (unavailableTokens.has(token) || token.startsWith('unavailable') || token.startsWith('outofservice')) {
        result.statusClass = 'unavailable';
        result.reachable = true;
        result.unavailableActive = true;
        result.operationalBlocked = true;
        return result;
    }
    if (chargingTokens.has(token)) result.statusClass = 'charging';
    else if (pluggedTokens.has(token)) result.statusClass = 'plugged';
    else if (availableTokens.has(token)) result.statusClass = 'available';
    else result.statusClass = 'status';
    result.reachable = true;
    return result;
}

/**
 * Frische OCPP-/Wallbox-Statuswerte bestaetigen grundsaetzlich, dass die Gegenstelle
 * erreichbar ist. Nur ausdrueckliche Offline-/Disconnect-Werte gelten als offline.
 */
function normalizeEvcsStatusReachability(value, fallback = null) {
    const classified = classifyEvcsConnectorStatus(value, true);
    return classified.reachable === null ? fallback : classified.reachable;
}

/** OCPP-Connectornummer aus typischen ioBroker-Objektpfaden ableiten. */
function inferOcppConnectorNoFromObjectId(objectId) {
    const id = String(objectId || '').trim();
    if (!id) return null;
    const parts = id.split('.');
    // Legacy ioBroker OCPP: ocpp.<Instanz>.<Ladestation>.<Connector>....
    if (parts.length >= 4 && parts[0].toLowerCase() === 'ocpp' && /^\d+$/.test(parts[1]) && /^\d+$/.test(parts[3])) {
        return Number(parts[3]);
    }
    // NexoWatt OCPP 0.4 compact optional connector details:
    // ...connectors.<evse>_<connector>....
    for (let i = 0; i < parts.length - 1; i++) {
        const token = String(parts[i] || '').toLowerCase();
        if (token === 'connectors') {
            const compact = String(parts[i + 1] || '').match(/^(\d+)_(\d+)$/);
            if (compact) return Number(compact[2]);
        }
    }
    // Native/alternative Adapterstrukturen: ...connector.<n>... / ...port.<n>...
    for (let i = 0; i < parts.length - 1; i++) {
        const token = String(parts[i] || '').toLowerCase();
        if ((token === 'connector' || token === 'connectors' || token === 'port') && /^\d+$/.test(parts[i + 1])) {
            return Number(parts[i + 1]);
        }
    }
    // Stabiler NexoWatt-Alias: ...connector1Status / ...connector2Status
    for (const part of parts) {
        const aliasMatch = String(part || '').match(/^connector(\d+)status$/i);
        if (aliasMatch) return Number(aliasMatch[1]);
    }
    return null;
}

/** Fehlende/leer gelassene Telemetriewerte dürfen niemals als echte 0 interpretiert werden. */
function strictFiniteEvcsNumber(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string' && value.trim() === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

/**
 * Erkennt OCPP ausschließlich über eindeutige Objektbaum-Verträge. Ein
 * numerischer Leistungswert allein reicht nicht, weil Modbus/HTTP/MQTT dieselben
 * Datentypen verwenden.
 */
function inferIoBrokerOcppConnectorContext(...objectIds) {
    const candidates = objectIds.flat ? objectIds.flat(Infinity) : objectIds;

    const buildNexoWattContext = ({ objectId, instance, station, layout }) => {
        const nativeDeviceRoot = `ocpp21.${instance}.${station}`;
        const parts = String(objectId || '').split('.');
        const lower = parts.map(part => String(part || '').toLowerCase());
        let evseNo = 1;
        let connectorNo = inferOcppConnectorNoFromObjectId(objectId) || 1;
        let connectorDetails = false;
        for (let i = 0; i < lower.length - 1; i++) {
            if (lower[i] === 'evse' && /^\d+$/.test(String(parts[i + 1] || ''))) evseNo = Math.max(0, Number(parts[i + 1]) || 1);
            if (lower[i] === 'connector' && /^\d+$/.test(String(parts[i + 1] || ''))) connectorNo = Math.max(0, Number(parts[i + 1]) || 1);
            if (lower[i] === 'connectors') {
                const compact = String(parts[i + 1] || '').match(/^(\d+)_(\d+)$/);
                if (compact) {
                    evseNo = Math.max(0, Number(compact[1]) || 1);
                    connectorNo = Math.max(0, Number(compact[2]) || 1);
                    connectorDetails = true;
                }
            }
        }
        const nativeCompactConnectorRoot = `${nativeDeviceRoot}.connectors.${evseNo}_${connectorNo}`;
        const nativeLegacyConnectorRoot = `${nativeDeviceRoot}.evse.${evseNo}.connector.${connectorNo}`;
        const nativeConnectorRoot = connectorDetails ? nativeCompactConnectorRoot : nativeDeviceRoot;
        const statusId = connectorDetails ? `${nativeCompactConnectorRoot}.status` : `${nativeDeviceRoot}.info.status`;
        return {
            detected: true,
            profile: 'ocpp-1.6-event-driven',
            layout,
            adapterKind: layout,
            contractVersion: 'nexowatt-ocpp21-0.4-native',
            sourceObjectId: objectId,
            adapterInstance: `ocpp21.${instance}`,
            // The NexoWatt UI uses only the native OCPP21 datapoint contract.
            // Alias paths are accepted solely as a one-time migration input and
            // are immediately canonicalised back to this native station root.
            deviceRoot: nativeDeviceRoot,
            nativeDeviceRoot,
            connectorRoot: nativeConnectorRoot,
            nativeConnectorRoot,
            nativeCompactConnectorRoot,
            nativeLegacyConnectorRoot,
            connectorDetails,
            evseNo,
            connectorNo,
            statusId,
            chargingStateId: `${nativeDeviceRoot}.transactions.chargingState`,
            transactionActiveId: `${nativeDeviceRoot}.transactions.transactionActive`,
            connectedId: `${nativeDeviceRoot}.info.connection`,
            socketConnectedId: `${nativeDeviceRoot}.info.socketConnected`,
            activityFreshId: `${nativeDeviceRoot}.health.activityFresh`,
            dataFreshId: `${nativeDeviceRoot}.health.dataFresh`,
            powerFreshId: `${nativeDeviceRoot}.health.powerFresh`,
            heartbeatAliveId: `${nativeDeviceRoot}.health.heartbeatAlive`,
            heartbeatId: `${nativeDeviceRoot}.health.lastSeenMs`,
            actualPowerId: `${nativeDeviceRoot}.measurements.powerW`,
            actualCurrentId: `${nativeDeviceRoot}.measurements.currentA`,
            energyTotalId: `${nativeDeviceRoot}.measurements.energyKWh`,
            energyTotalWhId: `${nativeDeviceRoot}.measurements.energyWh`,
            energyTotalInputIsWh: false,
            vehicleSocId: `${nativeDeviceRoot}.measurements.socPercent`,
            vehicleNeedsSocId: `${nativeDeviceRoot}.vehicle.socPercent`,
            rfidId: `${nativeDeviceRoot}.info.rfid`,
            setPowerId: `${nativeDeviceRoot}.control.chargeLimit`,
            availabilityId: `${nativeDeviceRoot}.control.availability`,
            numberPhasesId: `${nativeDeviceRoot}.control.numberOfPhases`,
            lastCommandId: `${nativeDeviceRoot}.control.lastCommand`,
            lastCommandAtId: `${nativeDeviceRoot}.control.lastCommandAt`,
            lastCommandSuccessId: `${nativeDeviceRoot}.control.lastSuccess`,
            lastCommandErrorId: `${nativeDeviceRoot}.control.lastError`,
            requestedChargeLimitId: `${nativeDeviceRoot}.control.requestedChargeLimit`,
            appliedChargeLimitId: `${nativeDeviceRoot}.control.appliedChargeLimit`,
            chargeLimitReasonId: `${nativeDeviceRoot}.control.chargeLimitReason`,
            chargeLimitClampedId: `${nativeDeviceRoot}.control.chargeLimitClamped`,
            adapterAliveId: `system.adapter.ocpp21.${instance}.alive`,
        };
    };

    for (const candidate of candidates) {
        const objectId = String(candidate || '').trim();
        if (!objectId) continue;
        const parts = objectId.split('.');
        const lower = parts.map(part => String(part || '').toLowerCase());

        // NexoWatt OCPP native compact tree: ocpp21.<Instanz>.<Station>....
        if (parts.length >= 3 && lower[0] === 'ocpp21' && /^\d+$/.test(String(parts[1] || '')) && parts[2]) {
            return buildNexoWattContext({ objectId, instance: parts[1], station: parts[2], layout: 'nexowatt-ocpp21-native-compact' });
        }

        // Stabiler öffentlicher Alias: alias.0.nexowatt.ocpp.<Instanz>.<Station>....
        if (
            parts.length >= 6
            && lower[0] === 'alias'
            && lower[1] === '0'
            && lower[2] === 'nexowatt'
            && lower[3] === 'ocpp'
            && /^\d+$/.test(String(parts[4] || ''))
            && parts[5]
        ) {
            return buildNexoWattContext({
                objectId,
                instance: parts[4],
                station: parts[5],
                layout: 'nexowatt-ocpp21-alias-migration',
            });
        }

        // Optionaler technischer Kompatibilitätsalias: alias.0.ocpp21.<Instanz>.<Station>....
        if (
            parts.length >= 5
            && lower[0] === 'alias'
            && lower[1] === '0'
            && lower[2] === 'ocpp21'
            && /^\d+$/.test(String(parts[3] || ''))
            && parts[4]
        ) {
            return buildNexoWattContext({
                objectId,
                instance: parts[3],
                station: parts[4],
                layout: 'nexowatt-ocpp21-alias-migration',
            });
        }

        // Legacy ioBroker OCPP: ocpp.<Instanz>.<Station>.<Connector>....
        if (
            parts.length >= 5
            && lower[0] === 'ocpp'
            && /^\d+$/.test(String(parts[1] || ''))
            && /^\d+$/.test(String(parts[3] || ''))
        ) {
            const deviceRoot = parts.slice(0, 3).join('.');
            const connectorRoot = parts.slice(0, 4).join('.');
            return {
                detected: true,
                profile: 'ocpp-1.6-event-driven',
                layout: 'legacy-iobroker-ocpp',
                adapterKind: 'legacy-iobroker-ocpp',
                contractVersion: 'legacy-iobroker-ocpp',
                sourceObjectId: objectId,
                adapterInstance: parts.slice(0, 2).join('.'),
                deviceRoot,
                nativeDeviceRoot: deviceRoot,
                connectorRoot,
                nativeConnectorRoot: connectorRoot,
                nativeCompactConnectorRoot: '',
                nativeLegacyConnectorRoot: connectorRoot,
                connectorDetails: true,
                evseNo: 1,
                connectorNo: Number(parts[3]),
                statusId: `${connectorRoot}.status`,
                chargingStateId: '',
                transactionActiveId: Number(parts[3]) > 0 ? `${connectorRoot}.transactionActive` : '',
                connectedId: `${deviceRoot}.connected`,
                socketConnectedId: `${deviceRoot}.connected`,
                activityFreshId: '',
                dataFreshId: '',
                powerFreshId: '',
                heartbeatAliveId: '',
                heartbeatId: '',
                actualPowerId: '',
                actualCurrentId: '',
                energyTotalId: '',
                energyTotalWhId: '',
                energyTotalInputIsWh: false,
                vehicleSocId: '',
                vehicleNeedsSocId: '',
                rfidId: '',
                setPowerId: '',
                availabilityId: '',
                numberPhasesId: '',
                lastCommandId: '',
                lastCommandAtId: '',
                lastCommandSuccessId: '',
                lastCommandErrorId: '',
                adapterAliveId: `system.adapter.${parts[0]}.${parts[1]}.alive`,
            };
        }
    }

    return {
        detected: false,
        profile: 'generic',
        layout: '',
        adapterKind: '',
        contractVersion: '',
        sourceObjectId: '',
        adapterInstance: '',
        deviceRoot: '',
        nativeDeviceRoot: '',
        connectorRoot: '',
        nativeConnectorRoot: '',
        nativeCompactConnectorRoot: '',
        nativeLegacyConnectorRoot: '',
        connectorDetails: false,
        evseNo: null,
        connectorNo: null,
        statusId: '',
        chargingStateId: '',
        transactionActiveId: '',
        connectedId: '',
        socketConnectedId: '',
        activityFreshId: '',
        dataFreshId: '',
        powerFreshId: '',
        heartbeatAliveId: '',
        heartbeatId: '',
        actualPowerId: '',
        actualCurrentId: '',
        energyTotalId: '',
        energyTotalWhId: '',
        energyTotalInputIsWh: false,
        vehicleSocId: '',
        vehicleNeedsSocId: '',
        rfidId: '',
        setPowerId: '',
        availabilityId: '',
        numberPhasesId: '',
        lastCommandId: '',
        lastCommandAtId: '',
        lastCommandSuccessId: '',
        lastCommandErrorId: '',
        adapterAliveId: '',
    };
}

/**
 * Prüft, ob ein Datenpunkt zum bereits erkannten OCPP-Gerät gehört. Dadurch
 * werden generische Fremd-Datenpunkte wie `mqtt.0.wallbox.connected` niemals
 * nur wegen ihres Namens in einen OCPP-Verbindungs-Datenpunkt umgeschrieben.
 */
function belongsToOcppConnectorContext(objectId, ocppContext) {
    const id = String(objectId || '').trim();
    if (!id || !ocppContext || ocppContext.detected !== true) return false;
    const roots = [
        ocppContext.deviceRoot,
        ocppContext.nativeDeviceRoot,
        ocppContext.connectorRoot,
        ocppContext.nativeConnectorRoot,
    ].map(root => String(root || '').trim()).filter(Boolean);
    if (roots.some(root => id === root || id.startsWith(`${root}.`))) return true;

    // Native- und Alias-Pfade derselben Station dürfen gemischt zugeordnet sein.
    const inferred = inferIoBrokerOcppConnectorContext(id);
    return !!(
        inferred.detected === true
        && String(inferred.nativeDeviceRoot || '')
        && String(inferred.nativeDeviceRoot || '') === String(ocppContext.nativeDeviceRoot || '')
    );
}

/** OCPP freshness is data quality, never physical reachability. */
function isOcppDataFreshObjectId(objectId, ocppContext = null) {
    const id = String(objectId || '').trim();
    const lower = id.toLowerCase();
    if (!id || !(lower.endsWith('.health.datafresh') || lower.endsWith('.datafresh'))) return false;
    if (ocppContext && ocppContext.detected === true) return belongsToOcppConnectorContext(id, ocppContext);
    return inferIoBrokerOcppConnectorContext(id).detected === true;
}

/** Aktivität/Freshness eines OCPP-Geräts ist keine physische WebSocket-Verbindung. */
function isOcppVolatileOnlineObjectId(objectId, ocppContext = null) {
    const id = String(objectId || '').trim();
    const lower = id.toLowerCase();
    if (!id || lower.endsWith('.socketconnected')) return false;
    const volatileSuffix = lower.endsWith('.connected')
        || lower.endsWith('.info.connection')
        || lower.endsWith('.health.online')
        || lower.endsWith('.datafresh')
        || lower.endsWith('.powerfresh')
        || lower.endsWith('.meterfresh')
        || lower.endsWith('.activityfresh');
    if (!volatileSuffix) return false;
    if (ocppContext && ocppContext.detected === true) return belongsToOcppConnectorContext(id, ocppContext);
    return inferIoBrokerOcppConnectorContext(id).detected === true;
}

/** Für NexoWatt OCPP gewinnt der echte WebSocket-Zustand vor Aktivitäts-/Messwert-Freshness. */
function resolveOcppOnlineObjectId(configuredOnlineId, ocppContext) {
    const configured = String(configuredOnlineId || '').trim();
    const socketId = String(ocppContext && ocppContext.socketConnectedId || '').trim();
    if (!ocppContext || ocppContext.detected !== true || !socketId) return configured;
    if (!configured || isOcppVolatileOnlineObjectId(configured, ocppContext)) return socketId;
    return configured;
}

/**
 * Erkennt ausschließlich bekannte OCPP-Datenpunktverträge derselben Station.
 * Dadurch können Alias- und ältere OCPP-Pfade sicher auf den nativen OCPP21-Vertrag migriert werden,
 * ohne kundenspezifische MQTT-/Modbus-Zuordnungen anzutasten.
 */
function isKnownOcppSemanticObjectId(objectId, ocppContext, semantic) {
    const id = String(objectId || '').trim();
    if (!id || !ocppContext || ocppContext.detected !== true || !belongsToOcppConnectorContext(id, ocppContext)) return false;
    const lower = id.toLowerCase();
    const suffixes = {
        power: ['.metervalues.power_active_import', '.measurements.powerw', '.powerw'],
        current: ['.metervalues.current_import', '.measurements.currenta', '.currenttotala'],
        energy: ['.metervalues.energy_active_import_register', '.metervalues.energy_active_import_register_kwh', '.measurements.energywh', '.measurements.energykwh', '.energywh', '.energykwh'],
        status: ['.info.status', '.status', '.connector1status'],
        chargingState: ['.transactions.chargingstate'],
        transactionActive: ['.transactions.transactionactive', '.transactionactive', '.txactive'],
        dataFresh: ['.health.datafresh', '.datafresh'],
        heartbeat: ['.health.lastseenms', '.lastseenms', '.health.lastheartbeatms', '.info.lastheartbeat', '.heartbeat'],
        setPower: ['.control.chargelimit', '.chargelimit'],
        enable: ['.control.availability', '.availability'],
        vehicleSoc: ['.metervalues.soc', '.measurements.socpercent', '.vehicle.socpercent', '.soc'],
        rfid: ['.info.rfid', '.rfid'],
    };
    if (semantic === 'online') return lower.endsWith('.socketconnected') || isOcppVolatileOnlineObjectId(id, ocppContext);
    if (semantic === 'status' && (/\.evse\.\d+\.connector\.\d+\.status$/i.test(id) || /\.connectors\.\d+_\d+\.status$/i.test(id))) return true;
    return (suffixes[semantic] || []).some(suffix => lower.endsWith(suffix));
}

/** Liefert den kanonischen nativen OCPP21-Datenpunkt für dieselbe Station. */
function resolveOcppCanonicalObjectId(configuredObjectId, ocppContext, semantic) {
    const configured = String(configuredObjectId || '').trim();
    if (!ocppContext || ocppContext.detected !== true) return configured;
    const targets = {
        power: ocppContext.actualPowerId,
        current: ocppContext.actualCurrentId,
        energy: ocppContext.energyTotalId || ocppContext.energyTotalWhId,
        status: ocppContext.statusId,
        chargingState: ocppContext.chargingStateId,
        transactionActive: ocppContext.transactionActiveId,
        online: ocppContext.socketConnectedId,
        dataFresh: ocppContext.dataFreshId,
        heartbeat: ocppContext.heartbeatId,
        setPower: ocppContext.setPowerId,
        enable: ocppContext.availabilityId,
        vehicleSoc: ocppContext.vehicleSocId,
        rfid: ocppContext.rfidId,
    };
    const target = String(targets[semantic] || '').trim();
    if (!target) return configured;
    if (!configured) return target;
    if (configured === target) return configured;
    if (!isKnownOcppSemanticObjectId(configured, ocppContext, semantic)) return configured;
    return target;
}

/** Explizite Installerwahl gewinnt; sonst wird der Datenpunkt-Ursprung verwendet. */
function resolveEvcsTelemetryProfile(configuredProfile, ocppContext) {
    const token = normalizeEvcsStatusToken(configuredProfile);
    if (['iobrokerocpp', 'iobrokerocpp16', 'ocpp', 'ocpp16', 'ocpp20', 'ocpp201', 'ocpp21', 'nexowattocpp'].includes(token)) return 'ocpp-1.6-event-driven';
    if (['generic', 'polling', 'modbus', 'http', 'mqtt', 'udp'].includes(token)) return 'generic';
    return ocppContext && ocppContext.detected ? 'ocpp-1.6-event-driven' : 'generic';
}

/**
 * Gerätespezifischer Sollwert-Keepalive. Lokale Modbus-/Device-Wallboxen wie
 * Alfen erwarten typischerweise deutlich häufiger einen gültigen Sollwert als
 * OCPP-Ladestationen. Ein expliziter Installerwert gewinnt immer.
 */
function resolveEvcsSetpointRefreshMs(wb = {}, telemetryProfile = 'generic', ...objectIds) {
    const explicitSec = Number(
        wb.setpointKeepaliveSec
        ?? wb.setpointRefreshSec
        ?? wb.commandKeepaliveSec
        ?? wb.refreshSetpointSec,
    );
    if (Number.isFinite(explicitSec) && explicitSec > 0) {
        return Math.max(5000, Math.min(300000, Math.round(explicitSec * 1000)));
    }
    if (String(telemetryProfile || '') === 'ocpp-1.6-event-driven') return 45000;
    const fingerprint = [
        wb.name,
        wb.manufacturer,
        wb.vendor,
        wb.model,
        wb.deviceType,
        wb.template,
        wb.profile,
        wb.adapter,
        ...objectIds,
    ].map(value => String(value || '').trim().toLowerCase()).filter(Boolean).join('|');
    if (fingerprint.includes('alfen')) return 15000;
    if (
        fingerprint.includes('modbus')
        || fingerprint.includes('nexowatt-devices')
        || fingerprint.includes('nexowatt.devices')
        || fingerprint.includes('device-adapter')
        || fingerprint.includes('devices.')
    ) return 20000;
    return 30000;
}

function parseEvcsCommandTimestamp(value) {
    if (value === null || value === undefined || value === '') return 0;
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) return numeric < 100000000000 ? numeric * 1000 : numeric;
    const parsed = Date.parse(String(value));
    return Number.isFinite(parsed) ? parsed : 0;
}

function evaluateOcppCommandConfirmation({
    targetW = null,
    requestedW = null,
    appliedW = null,
    lastSuccess = null,
    lastError = '',
    reason = '',
    commandAt = 0,
    now = Date.now(),
} = {}) {
    const target = strictFiniteEvcsNumber(targetW);
    const requested = strictFiniteEvcsNumber(requestedW);
    const applied = strictFiniteEvcsNumber(appliedW);
    const successKnown = typeof lastSuccess === 'boolean';
    const reasonText = String(reason || '').trim();
    const errorText = String(lastError || '').trim();
    const ageMs = commandAt > 0 ? Math.max(0, now - commandAt) : null;
    const toleranceW = target !== null && target <= 0 ? 1 : 150;
    const requestMatches = target !== null && requested !== null && Math.abs(target - requested) <= toleranceW;
    const appliedMatches = target !== null && applied !== null && Math.abs(target - applied) <= toleranceW;
    const zeroHeld = target !== null && target <= 0 && reasonText === 'zero-held-to-prevent-unintended-interruption';
    const confirmed = successKnown && lastSuccess === true && requestMatches && appliedMatches && !zeroHeld;
    let state = 'unknown';
    if (zeroHeld) state = 'zero-held-not-applied';
    else if (successKnown && lastSuccess === false) state = errorText ? `failed:${errorText}` : 'failed';
    else if (confirmed) state = 'confirmed';
    else if (target !== null && commandAt > 0 && ageMs !== null && ageMs <= 30000) state = 'pending';
    else if (target !== null && requestMatches && !appliedMatches) state = 'requested-not-applied';
    return {
        known: successKnown || requested !== null || applied !== null || !!reasonText,
        confirmed,
        state,
        targetW: target,
        requestedW: requested,
        appliedW: applied,
        requestMatches,
        appliedMatches,
        zeroHeld,
        ageMs,
        reason: reasonText,
        error: errorText,
    };
}

/** OCPP-Zustände, bei denen physikalisch aktuell keine Fahrzeugleistung fließen darf. */
function isOcppAuthoritativeZeroState(state) {
    return new Set([
        'disconnected', 'connected', 'ready_to_charge',
        'paused_by_evse', 'paused_by_vehicle', 'finishing', 'reserved',
        'faulted', 'unavailable', 'offline',
    ]).has(String(state || '').trim().toLowerCase());
}

/** OCPP-Zustände, die während einer aktiven Transaktion eventbasiert bestehen bleiben dürfen. */
function isOcppSessionPersistentState(state) {
    return new Set([
        'charging', 'ready_to_charge', 'connected',
        'paused_by_evse', 'paused_by_vehicle', 'finishing',
    ]).has(String(state || '').trim().toLowerCase());
}

/**
 * Der OCPP-Adapter schreibt Connector-Stati ereignisbasiert. Solange
 * Adapter und Ladestation verbunden sind, bleibt deshalb auch ein unveränderter
 * Zustand fachlich gültig. Sicherheitszustände werden dabei bewusst gehalten,
 * statt nach Ablauf eines generischen Timers wieder freigegeben zu werden.
 */
function isOcppEventStatusPersistentState(state) {
    return new Set([
        'disconnected', 'connected', 'ready_to_charge', 'charging',
        'paused_by_evse', 'paused_by_vehicle', 'finishing', 'reserved',
        'faulted', 'unavailable', 'offline',
    ]).has(String(state || '').trim().toLowerCase());
}

/**
 * Trennt OCPP-Rohwert, effektive Istleistung und Sollwert/Reservierung.
 *
 * Der OCPP-Adapter schreibt bei StopTransaction zuverlässig
 * `transactionActive=false`, setzt aber einen zuvor empfangenen MeterValues-
 * Leistungswert nicht automatisch auf 0. Deshalb darf der letzte OCPP-Rohwert
 * bei Finishing/Available/Transaktionsende nicht als aktuelle Leistung gelten.
 */

/**
 * OCPP `transactionActive=false` bedeutet zunächst nur, dass aktuell keine
 * Transaktion läuft. Ein frischer `Preparing`-/`SuspendedEVSE`-Status darf
 * trotzdem Ladebedarf melden, damit Min+PV/Auto die Transaktion überhaupt
 * starten können. Terminale oder widersprüchliche Zustände bleiben dagegen
 * sicher ohne Ladebedarf.
 */
function reconcileOcppTransactionDemand({
    telemetryProfile = 'generic',
    transactionKnown = false,
    transactionActive = null,
    vehicleDemand = null,
    actualPowerW = 0,
    activityThresholdW = 250,
} = {}) {
    const demand = vehicleDemand && typeof vehicleDemand === 'object'
        ? vehicleDemand
        : { plugged: false, demandConfirmed: false, startEligible: false, state: 'unknown', source: 'missing', reason: 'missing' };
    if (
        String(telemetryProfile || '').trim().toLowerCase() !== 'ocpp-1.6-event-driven'
        || transactionKnown !== true
        || transactionActive === true
    ) {
        return demand;
    }

    const state = String(demand.state || 'unknown').trim().toLowerCase();
    const measuredW = Math.max(0, Number(actualPowerW) || 0);
    const thresholdW = Math.max(1, Number(activityThresholdW) || 250);

    // StatusNotification, MeterValues und TransactionEvent dürfen zeitversetzt
    // eintreffen. Reale Leistung bleibt autoritativ, auch wenn der Transaktions-
    // Flag noch hinterherläuft.
    if (measuredW >= thresholdW || (state === 'charging' && measuredW > 0)) {
        return {
            ...demand,
            plugged: true,
            demandConfirmed: true,
            startEligible: true,
            state: 'charging',
            source: String(demand.source || 'ocpp-status'),
            reason: `${String(demand.reason || 'charging')}:transaction-event-delayed`,
        };
    }

    // Vor Transaktionsstart sind Connected/Occupied/Preparing gueltige
    // Startkandidaten. Auch ein frischer Charging-Zustand kann dem Transaction-
    // Flag kurz vorauslaufen. Diese Zustaende bestaetigen noch keinen dauerhaften
    // Leistungsfluss, duerfen aber einen zeitlich begrenzten Mindestleistungs-
    // Startversuch ausloesen. SuspendedEVSE bleibt ein bestaetigter Bedarf, weil
    // die EVSE gerade auf die externe Leistungsfreigabe wartet.
    if (['connected', 'ready_to_charge', 'paused_by_evse', 'charging'].includes(state) || demand.startEligible === true) {
        const waitsForEvse = state === 'paused_by_evse';
        return {
            ...demand,
            demandConfirmed: waitsForEvse ? true : false,
            startEligible: true,
            state: state === 'charging' ? 'ready_to_charge' : state,
            source: String(demand.source || 'ocpp-status'),
            reason: `${String(demand.reason || state)}:transaction-not-started`,
        };
    }

    // Terminale bzw. fahrzeugseitige Pause bleibt ohne Startfreigabe.
    return {
        ...demand,
        demandConfirmed: false,
        startEligible: false,
        source: 'ocpp-transaction-state',
        reason: 'ocpp-transaction-inactive',
        state: state === 'charging' ? 'finishing' : state,
    };
}

function resolveEvcsEffectivePower({
    telemetryProfile = 'generic',
    rawPowerW = null,
    rawMeterStale = false,
    online = false,
    enabled = false,
    normalizedState = 'unknown',
    statusAuthoritative = false,
    transactionActive = null,
    transactionKnown = false,
    lastCommandW = null,
} = {}) {
    const profile = String(telemetryProfile || 'generic').trim().toLowerCase();
    const raw = strictFiniteEvcsNumber(rawPowerW);
    const command = strictFiniteEvcsNumber(lastCommandW);
    const state = String(normalizedState || 'unknown').trim().toLowerCase();
    const isOcpp = profile === 'ocpp-1.6-event-driven';
    const base = {
        profile,
        eventDriven: isOcpp,
        rawPowerW: raw === null ? 0 : raw,
        effectivePowerW: 0,
        powerSource: 'missing',
        effectiveMeterStale: true,
        authoritativeZero: false,
        sessionEnded: false,
        transactionKnown: transactionKnown === true,
        transactionActive: transactionKnown === true ? transactionActive === true : null,
    };

    if (!enabled) {
        return { ...base, powerSource: 'disabled-zero', effectiveMeterStale: false, authoritativeZero: true, sessionEnded: true };
    }
    if (!online) {
        return { ...base, powerSource: 'offline-zero', effectiveMeterStale: false, authoritativeZero: true, sessionEnded: true };
    }

    // Der bisherige generische Vertrag bleibt für zyklisch abgefragte Geräte
    // unverändert: bei stale Telemetrie dient der letzte Sollwert weiterhin nur
    // dort als konservativer Regel-/Reservierungsfallback.
    if (!isOcpp) {
        if (raw !== null && !rawMeterStale) {
            return { ...base, effectivePowerW: raw, powerSource: 'measured', effectiveMeterStale: false };
        }
        if (rawMeterStale && command !== null) {
            return { ...base, effectivePowerW: command, powerSource: 'generic-command-fallback', effectiveMeterStale: true };
        }
        return { ...base, effectivePowerW: raw === null ? 0 : raw, powerSource: raw === null ? 'missing' : 'stale-meter', effectiveMeterStale: true };
    }

    // OCPP status and transaction events can arrive in either order. A fresh
    // Charging status with a non-zero meter value must not be zeroed merely
    // because transactionActive is still delayed by a few seconds.
    if (
        transactionKnown === true
        && transactionActive !== true
        && statusAuthoritative
        && state === 'charging'
        && raw !== null
        && raw > 0
    ) {
        return {
            ...base,
            effectivePowerW: raw,
            powerSource: 'ocpp-meter-charging-status-held',
            effectiveMeterStale: false,
        };
    }

    // Before the transaction starts, Preparing/SuspendedEVSE are valid start
    // states. They confirm 0 W physically, but not a terminal session end.
    if (
        transactionKnown === true
        && transactionActive !== true
        && statusAuthoritative
        && ['ready_to_charge', 'paused_by_evse'].includes(state)
    ) {
        return {
            ...base,
            effectivePowerW: 0,
            powerSource: 'ocpp-awaiting-transaction-zero',
            effectiveMeterStale: false,
            authoritativeZero: false,
            sessionEnded: false,
        };
    }

    // StopTransaction is otherwise the strongest session truth.
    if (transactionKnown === true && transactionActive !== true) {
        return {
            ...base,
            effectivePowerW: 0,
            powerSource: 'ocpp-transaction-ended-zero',
            effectiveMeterStale: false,
            authoritativeZero: true,
            sessionEnded: true,
        };
    }

    // Ein frischer bzw. durch die aktive Transaktion gehaltener Connectorstatus
    // ist autoritativ. MeterValues dürfen dabei als Rohdiagnose positiv stehen bleiben.
    if (statusAuthoritative && isOcppAuthoritativeZeroState(state)) {
        const sessionEnded = ['disconnected', 'finishing', 'faulted', 'unavailable', 'offline'].includes(state);
        return {
            ...base,
            effectivePowerW: 0,
            powerSource: `ocpp-status-${state}-zero`,
            effectiveMeterStale: false,
            authoritativeZero: true,
            sessionEnded,
        };
    }

    if (raw !== null && !rawMeterStale) {
        return { ...base, effectivePowerW: raw, powerSource: 'ocpp-meter', effectiveMeterStale: false };
    }

    // OCPP-MeterValues sind push-/ereignisbasiert. Solange Transaktion und
    // Connectorstatus den Ladebetrieb bestätigen, bleibt ein unveränderter
    // Rohwert als Istwert verwendbar. Der letzte EMS-Sollwert wird dafür nie benutzt.
    if (
        raw !== null
        && (
            (transactionKnown === true && transactionActive === true)
            || (statusAuthoritative && state === 'charging')
        )
    ) {
        return {
            ...base,
            effectivePowerW: raw,
            powerSource: 'ocpp-meter-event-held',
            effectiveMeterStale: false,
        };
    }

    return {
        ...base,
        effectivePowerW: 0,
        powerSource: transactionKnown === true && transactionActive === true
            ? 'ocpp-active-without-power'
            : 'ocpp-power-unknown',
        effectiveMeterStale: true,
    };
}

/**
 * EVCS darf eine stationaere Speicherunterstuetzung erst als zusaetzliches
 * Ladebudget verwenden, nachdem genau dieser Speicherbefehl vom aktiven Writer
 * akzeptiert wurde. Der Request bleibt davon getrennt und wird im vorherigen
 * EMS-Schritt an die Speicherregelung uebergeben.
 */
/**
 * Ablauf und Zusammenhang: Ermittelt den belastbaren Speicher-Unterstützungsanteil für die Ladebudgetrechnung. Eine bloß angeforderte Speicherleistung darf keine unbestätigte zusätzliche Netzreserve vortäuschen.
 */
function resolveAcceptedStorageAssistBudget(input = {}) {
    const now = Number.isFinite(Number(input.now)) ? Number(input.now) : Date.now();
    const requestedW = Math.max(0, Number.isFinite(Number(input.requestedW)) ? Number(input.requestedW) : 0);
    const acceptedWRaw = Math.max(0, Number.isFinite(Number(input.acceptedW)) ? Number(input.acceptedW) : 0);
    const acceptedTs = Number.isFinite(Number(input.acceptedTs)) ? Number(input.acceptedTs) : 0;
    const maxAgeMs = Math.max(500, Number.isFinite(Number(input.maxAgeMs)) ? Number(input.maxAgeMs) : 5000);
    const ageMs = acceptedTs > 0 ? Math.max(0, now - acceptedTs) : null;
    const requestedTopology = String(input.requestedTopology || 'none').trim().toLowerCase();
    const acceptedTopology = String(input.acceptedTopology || '').trim().toLowerCase();
    const acceptedSource = String(input.acceptedSource || '').trim().toLowerCase();
    const commandEffective = input.commandEffective === true;
    const fresh = ageMs !== null && ageMs <= maxAgeMs;
    const topologyMatches = requestedTopology !== 'none' && acceptedTopology === requestedTopology;
    const sourceMatches = acceptedSource === 'evcs' || acceptedSource.startsWith('evcs:');

    let status = 'accepted';
    if (!(requestedW > 0)) status = 'no-request';
    else if (!commandEffective) status = 'storage-command-not-effective';
    else if (!fresh) status = acceptedTs > 0 ? 'accepted-command-stale' : 'no-accepted-command';
    else if (!topologyMatches) status = 'storage-topology-mismatch';
    else if (!sourceMatches) status = 'storage-source-mismatch';
    else if (!(acceptedWRaw > 0)) status = 'accepted-zero';

    const valid = status === 'accepted';
    return {
        requestedW: Math.round(requestedW),
        acceptedW: valid ? Math.round(Math.min(requestedW, acceptedWRaw)) : 0,
        acceptedRawW: Math.round(acceptedWRaw),
        acceptedTs,
        ageMs,
        fresh,
        commandEffective,
        topologyMatches,
        sourceMatches,
        status,
        valid,
    };
}

/** Fahrbares LP-Minimum in W einschließlich Strom-/Leistungsschritt; nur für neue Nulleinspeise-Quellenrechnung. */
function zeroExportStorageMinimumW(w) {
    if (w.controlBasis === 'currentA') {
        const stepA = Math.max(0.01, Number(w.stepA) || 0.1);
        const minA = Math.ceil((Math.max(0, Number(w.minA) || 0) - 1e-9) / stepA) * stepA;
        return Math.max(Number(w.minPW) || 0, minA * Math.max(0, Number(w.vFactor) || 0));
    }
    const minW = Math.max(0, Number(w.minPW) || 0, w.chargerType === 'AC' && Number(w.phases) === 3 ? 4200 : 0);
    const stepW = Math.max(1, Number(w.stepW) || 1);
    return Math.ceil((minW - 1e-9) / stepW) * stepW;
}
/** Code-Teil: normalizeChargerType – Verarbeitet Wallbox-/Ladepunktdaten und Feature-Sichtbarkeit. */
function normalizeChargerType(v) {
    const s = String(v || 'AC').trim().toUpperCase();
    return (s === 'DC') ? 'DC' : 'AC';
}
/** Code-Teil: normalizeControlBasis – Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen. */
function normalizeControlBasis(v) {
    const s = String(v || 'auto').trim().toLowerCase();
    if (s === 'currenta' || s === 'a' || s === 'current') return 'currentA';
    if (s === 'powerw' || s === 'w' || s === 'power') return 'powerW';
    return 'auto';
}
/** Code-Teil: normalizeWallboxModeOverride – Verarbeitet Wallbox-/Ladepunktdaten und Feature-Sichtbarkeit. */
function normalizeWallboxModeOverride(v) {
    const raw = (v === null || v === undefined) ? '' : String(v);
    const s = raw.trim().toLowerCase();
    if (!s) return 'auto';
    if (s === 'auto' || s === 'default' || s === 'global') return 'auto';

    // PV only
    if (s === 'pv' || s === 'pvsurplus' || s === 'pv_surplus' || s === 'pvonly' || s === 'pv_only') return 'pv';

    // Min + PV (allow grid for min, PV for the rest)
    if (s === 'minpv' || s === 'min_pv' || s === 'min+pv' || s === 'min_plus_pv') return 'minpv';

    // Boost (allow grid, prefer allocation)
    if (s === 'boost' || s === 'turbo') return 'boost';

    return 'auto';
}

/**
 * Ein expliziter Boost-Befehl darf die Wallbox vorladen/vorrüsten, auch wenn
 * der Herstelleradapter noch keinen separaten Fahrzeug- oder Ladebedarf-DP
 * bestätigt. Die Wallbox selbst bleibt dabei die elektrische Freigabeinstanz:
 * Ohne angeschlossenes/freigegebenes Fahrzeug fließt trotz positivem Sollwert
 * keine Fahrzeugleistung. Auto, PV, Min+PV und Zeit-Ziel duerfen zusaetzlich
 * einen semantisch bestaetigten, zeitlich begrenzten Mindestleistungs-
 * Startversuch ausgeben. Ohne positiven Modus-/Tarif-/PV-/Zielwunsch bleibt
 * die Ausgabe weiterhin fail-closed bei 0.
 */
function isChargingCommandDemandAllowed(
    effectiveMode,
    vehicleDemandConfirmed,
    vehicleStartEligible = false,
    positiveIntent = false,
) {
    if (vehicleDemandConfirmed === true) return true;
    if (normalizeWallboxModeOverride(effectiveMode) === 'boost') return true;
    return vehicleStartEligible === true && positiveIntent === true;
}

/**
 * Zeit-Ziel-SoC-Wartezustände dürfen nur den Auto-/PV-Plan pausieren. Boost ist
 * eine unmittelbare Kundenanforderung und übersteuert diese Optimierungswartezeit;
 * harte Netz-, Stations-, Phasen-, §14a- und Fehlergrenzen bleiben nachgelagert.
 */
function shouldPauseChargingForGoalSoc(effectiveMode, goalEnabled, goalStatus) {
    if (normalizeWallboxModeOverride(effectiveMode) === 'boost') return false;
    const status = String(goalStatus || '').trim().toLowerCase();
    return goalEnabled === true && (status === 'waiting_soc' || status === 'soc_stale');
}

/**
 * Boost fährt den bereits durch alle harten Caps begrenzten Sollwert unmittelbar
 * an. Andere Modi behalten die konfigurierte Hochlauframpe. Ramp-down wird wie
 * bisher niemals verzögert.
 */
function applyChargingModeRamp(prevValue, targetValue, maxDeltaUp, effectiveMode) {
    if (normalizeWallboxModeOverride(effectiveMode) === 'boost') return Number(targetValue) || 0;
    return rampUp(prevValue, targetValue, maxDeltaUp);
}

/**
 * Trennt normal, expliziten Schutz und Assist.
 *
 * Fachlicher Vertrag:
 * - Reine PV-Ueberschussladung (`pv`) darf weder Speicherschutz noch
 *   Speicher-Assist aktivieren. Der PV-Regler verwendet ausschliesslich den
 *   physikalisch verfuegbaren PV-Ueberschuss und rechnet eine Batterieentladung
 *   bereits aus dem PV-Budget heraus. Eine zusaetzliche Speicherpolicy waere
 *   dort redundant und kann den normalen Hauslastausgleich unnoetig begrenzen.
 * - In `auto`, `boost` und `minpv` bleibt die Kundenwahl wirksam, weil diese
 *   Betriebsarten Netzleistung enthalten koennen.
 * - Die gespeicherte Kundenwahl bleibt erhalten und wird beim Wechsel aus `pv`
 *   automatisch wieder wirksam; nur die Laufzeitpolicy wird neutralisiert.
 */
/**
 * Ablauf und Zusammenhang: Verknüpft Kundenfreigabe zur Speichermitnutzung mit Ladepunktmodus und Assistenzfreigabe. Diese Entscheidung wird an die Speicher-/Ladebudget-Abstimmung weitergegeben.
 */
function resolveEvcsStoragePolicy(customerAllowed, userAssistEnabled, wallboxMode = 'auto') {
    const allowed = customerAllowed === true;
    const normalizedMode = normalizeWallboxModeOverride(wallboxMode);
    const modeAllowsStoragePolicy = normalizedMode === 'auto'
        || normalizedMode === 'boost'
        || normalizedMode === 'minpv';
    const assist = allowed && modeAllowsStoragePolicy && userAssistEnabled === true;
    const protect = allowed && modeAllowsStoragePolicy && !assist;
    return { mode: assist ? 'assist' : (protect ? 'protect' : 'normal'), assistRequested: assist, protectionRequested: protect };
}

/**
 * Trennt echte Fahrzeugladeleistung von Wallbox-Eigenverbrauch/Standby.
 *
 * Der Speicherschutz darf nur den tatsaechlich vom Fahrzeug aufgenommenen,
 * frischen Leistungsanteil aus dem Hauslastausgleich entfernen. Eine ladebereite
 * Wallbox mit z. B. 69 W Elektronikverbrauch bleibt normale Gebaeudelast und darf
 * keinen 0-W-Impuls der Speicherregelung ausloesen.
 */
function resolveEvcsStoragePolicyActualLoad({
    actualPowerW = 0,
    meterFresh = false,
    online = false,
    enabled = false,
    vehicleDemandConfirmed = false,
    vehicleStateNormalized = 'unknown',
    activityThresholdW = 100,
    storageProtectionRequested = false,
    storageAssistRequested = false,
    physicalIdleConfirmed = false,
} = {}) {
    const actualValid = actualPowerW !== null && actualPowerW !== undefined
        && typeof actualPowerW !== 'boolean' && String(actualPowerW).trim() !== ''
        && Number.isFinite(Number(actualPowerW));
    const actualW = actualValid ? Math.max(0, Math.abs(Number(actualPowerW))) : 0;
    const thresholdW = Math.max(1, Number(activityThresholdW) || 100);
    const state = String(vehicleStateNormalized || 'unknown');
    const demandConfirmed = vehicleDemandConfirmed === true || state === 'charging';
    const operational = online === true && enabled === true;
    const measurementUsable = operational && meterFresh === true && actualValid;
    const assistRequested = storageAssistRequested === true;
    const protectionRequested = storageProtectionRequested === true && !assistRequested;
    // A missing measurement is not permission to discharge into the vehicle.
    // Never substitute an old reading or an unacknowledged charging command.
    // Only an independently confirmed physical idle reading may clear uncertainty
    // while the charging control itself is disabled/offline.
    const protectedLoadUnknown = protectionRequested && !measurementUsable && physicalIdleConfirmed !== true;
    const actualVehicleLoadW = measurementUsable && demandConfirmed && actualW >= thresholdW
        ? actualW
        : 0;

    let reason = 'policy-normal';
    if (protectionRequested || assistRequested) {
        if (!operational) reason = 'wallbox-not-operational';
        else if (!meterFresh) reason = 'meter-not-fresh';
        else if (!actualValid) reason = 'meter-invalid';
        else if (!demandConfirmed) reason = 'no-confirmed-vehicle-demand';
        else if (actualW < thresholdW) reason = 'standby-below-activity-threshold';
        else reason = assistRequested ? 'assist-actual-vehicle-load' : 'protect-actual-vehicle-load';
    }

    return {
        actualPowerW: actualW,
        thresholdW,
        meterFresh: meterFresh === true,
        online: online === true,
        enabled: enabled === true,
        demandConfirmed,
        vehicleStateNormalized: state,
        actualVehicleLoadW,
        protectionRequested,
        protectedLoadUnknown,
        protectedLoadW: protectionRequested ? actualVehicleLoadW : 0,
        assistRequestedLoadW: assistRequested ? actualVehicleLoadW : 0,
        protectedWallbox: protectionRequested && actualVehicleLoadW > 0,
        active: actualVehicleLoadW > 0,
        reason,
    };
}

/** Code-Teil: Klasse `ChargingManagementModule` – enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden. */
// Klassen-Kommentar: Klasse: ChargingManagementModule. Aufgabe: kapselt eine fachliche Teilaufgabe dieser Datei. Beim TypeScript-Umbau Eingaben, Rückgaben und Seiteneffekte typisieren. Zusammenhang: Wallbox-/EVCS-Lademanagement und Zielladen.
/**
 * Klasse: ChargingManagementModule
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
class ChargingManagementModule extends BaseModule {
    /** Code-Teil: constructor – Bereitet eine Instanz vor, legt interne Felder an und verbindet spätere Methoden mit dem Objektzustand. */
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);
        this._known = new Set(); // wallbox channels created
        this._knownStations = new Set(); // station channels created
        this._stationRoundRobinOffset = new Map(); // stationKey -> next offset for round-robin fairness
        this._stationRoundRobinLastRotateMs = new Map(); // stationKey -> ms of last rotation (avoid per-tick flapping)
        this._chargingSinceMs = new Map(); // safeKey -> ms since epoch
        this._chargingLastActiveMs = new Map(); // safeKey -> ms of last detected activity
        this._chargingLastSeenMs = new Map(); // safeKey -> ms of last processing (cleanup)
        this._boostSinceMs = new Map(); // safeKey -> ms since epoch (boost start)

        // EV connection tracking (for Zielladen + safe setpoints)
        this._vehiclePluggedPrev = new Map(); // safeKey -> boolean
        this._vehiclePluggedSinceMs = new Map(); // safeKey -> ms of last plug-in (rising edge)
        // Gate B: PV hysteresis state (global, for PV-only modes)
        this._pvAvailable = false;
        this._pvAboveSinceMs = 0;
        this._pvBelowSinceMs = 0;
        // Gate C: Speicher-Unterstützung (Hysterese)
        this._storageAssistActive = false;
        // Gate T: Tarif-Freigaben (Debounce gegen Flattern)
        this._tariffGridChargeAllowed = true;
        this._tariffGridChargeAllowedTrueSinceMs = 0;
        this._tariffDischargeAllowed = true;
        this._tariffDischargeAllowedTrueSinceMs = 0;
        this._restoredRuntime = new Set(); // safeKey -> restored persisted session/boost state
        this._lastCmdTargetW = new Map(); // safeKey -> last commanded target power (for ramp limiting)
        this._lastCmdTargetA = new Map(); // safeKey -> last commanded target current (for ramp limiting)
        this._rc85EvcsDecisionGuard = new Rc85EvcsDecisionGuard(); // soft auto/tariff smoothing; hard safety bypasses immediately
        this._lastDiagLogMs = 0; // MU6.2: rate limit diagnostics log
        // TS-Migration 0.7.122: letzte EVCS-/Charging-Management-TS-Vorbereitungsdiagnose.
        this._chargingManagementTsRuntimePrepLast = null;

        // Fast local state publisher (performance):
        // With many EVCS (e.g. 50+), awaiting hundreds of setStateAsync calls per tick can
        // easily push the tick time into seconds. We therefore de-duplicate and batch
        // local state writes and flush them asynchronously with limited concurrency.
        this._pubQueue = new Map(); // id -> {val:any, ack:boolean}
        this._pubCache = new Map(); // id -> {val:any, ts:number}
        this._pubFlushTimer = null;
        this._pubFlushInFlight = false;
        this._pubLastFlushMs = 0;
        this._pubFlushIntervalMs = 50; // do not flush more often than this

        // PV-Überschuss Glättung:
        // - fast5s: aktive Regelung (reagiert deutlich schneller auf Änderungen)
        // - slow5m: Diagnose/Referenz (glättet Langzeitverlauf für Transparenz)
        // Hintergrund: Der 5-Minuten-Mittelwert ist für eine Live-Regelung zu träge
        // und kann unnötigen Netzbezug bzw. späte Reaktionen verursachen.
        this._pvSurplusAvg = {
            fast5s: { windowMs: 5 * 1000, samples: [], head: 0, sumW: 0 },
            slow5m: { windowMs: 5 * 60 * 1000, samples: [], head: 0, sumW: 0 },
        };
        this._pvStartupUntilMs = new Map(); // safeKey -> ms until PV start settle hold is active
        this._pvStartReadySinceMs = new Map(); // safeKey -> ms since PV-only start conditions are continuously satisfied
        this._pvBelowMinSinceMs = new Map(); // safeKey -> ms since a running PV-only session is continuously below the technical minimum
        this._pvMinRunUntilMs = new Map(); // safeKey -> ms until a freshly started PV-only session should be kept stable
        this._pvStartCooldownUntilMs = new Map(); // safeKey -> ms until a failed PV-only start may be retried
        this._pvStartAttemptSinceMs = new Map(); // Legacy/PV compatibility: safeKey -> ms since PV start command
        this._vehicleStartAttemptSinceMs = new Map(); // safeKey -> ms since universal minimum-power start probe began
        this._vehicleStartCooldownUntilMs = new Map(); // safeKey -> ms until a failed universal start probe may be retried
        // TS-Migration 0.7.124: letzter EVCS-/Charging-Control-Shadow und Produktiv-Kandidat.
        this._chargingControlTsShadowLast = null;
        this._chargingControlTsProductivePrepLast = null;
        this._chargingControlTsProductiveLast = null;
        this._chargingAllocationTsShadowLast = null;
        this._chargingAllocationTsProductivePrepLast = null;
        this._chargingAllocationTsProductiveLast = null;
        this._chargingAllocationTsNormalSourceLast = null;
        this._chargingWritePlanTsShadowLast = null;
        this._chargingWritePlanTsProductivePrepLast = null;
        this._chargingWritePlanTsProductiveLast = null;
        this._chargingWritePlanExecutorLast = null;
        this._chargingBudgetTsProductiveLast = null;
        this._chargingNormalSourceTsLockdownLast = null;
        this._chargingTsNormalSourceLast = null;
        this._chargingLegacyDecisionTreeLast = null;
        this._chargingEvcsJsRemovalTsLast = null;
        this._adapterTsRuntimeHandoverLast = null;
        // EVCS AC-Phasenautomatik (1p/3p PV-Überschuss): Zustandsmarker für Hysterese, Cooldown und Settle-Zeit.
        this._chargingPhaseHighSinceMs = new Map();
        this._chargingPhaseLowSinceMs = new Map();
        this._chargingPhaseCooldownUntilMs = new Map();
        this._chargingPhaseSettleUntilMs = new Map();
        this._chargingPhaseAssumedBySafe = new Map();
        this._zeroExportPhaseAtMaxSince = new Map();
        this._zeroExportPhaseLeaseBySafe = new Map();
        this._chargingPhaseSelectionTsLast = null;
        this._chargingAudit = new ChargingManagementAuditStore(this.adapter, (id, value, ack) => this._queueState(id, value, ack), () => this._flushPubQueue());
    }

    async _restoreChargingAuditState() { return this._chargingAudit.restore(); }
    _getChargingAuditPayload(limit = 200) { return this._chargingAudit.getPayload(limit); }
    async _clearChargingAudit() { return this._chargingAudit.clear(); }
    async _recordChargingAudit(input = {}) { return this._chargingAudit.record({ ...input, safetyEnvelope: this.adapter && this.adapter._emsSafetyEnvelope }); }

    /** Code-Teil: _publishChargingControlTsShadow – Dokumentiert diesen Regelungs- oder Diagnosebaustein. */
    async _publishChargingControlTsShadow(input) {
        const mirror = requireChargingControlTsMirror();
        let status;
        let productivePrep = null;
        let productiveDecision = null;
        try {
            if (!mirror || typeof mirror.buildChargingControlShadowPlan !== 'function') {
                productivePrep = {
                    source: 'ts-charging-control-productive-prep-v1',
                    available: false,
                    ok: false,
                    productive: false,
                    prepared: false,
                    fallback: true,
                    fallbackReason: 'missing-ts-mirror',
                    apply: null,
                    ts: Date.now(),
                };
                productiveDecision = {
                    source: 'ts-charging-control-productive-v1',
                    available: false,
                    ok: false,
                    productive: false,
                    prepared: false,
                    fallback: true,
                    fallbackReason: 'missing-ts-mirror',
                    apply: null,
                    ts: Date.now(),
                };
                status = {
                    source: 'ts-charging-control-shadow-v1',
                    available: false,
                    ok: false,
                    productive: false,
                    productivePrep,
                    productiveDecision,
                    productivePrepared: false,
                    fallback: true,
                    fallbackReason: 'missing-ts-mirror',
                    ts: Date.now(),
                };
            } else {
                const plan = mirror.buildChargingControlShadowPlan(input || {});
                const comparison = (typeof mirror.compareChargingControlShadowPlan === 'function')
                    ? mirror.compareChargingControlShadowPlan(input || {}, plan)
                    : { ok: true, mismatchCount: 0, mismatches: [] };
                productivePrep = (typeof mirror.buildChargingControlProductivePrep === 'function')
                    ? mirror.buildChargingControlProductivePrep(input || {}, plan, comparison)
                    : {
                        source: 'ts-charging-control-productive-prep-v1',
                        available: false,
                        ok: false,
                        productive: false,
                        prepared: false,
                        fallback: true,
                        fallbackReason: 'missing-ts-productive-prep-helper',
                        comparison,
                        plan,
                        apply: null,
                    };
                productiveDecision = (typeof mirror.buildChargingControlProductive === 'function')
                    ? mirror.buildChargingControlProductive(input || {}, plan, comparison)
                    : {
                        source: 'ts-charging-control-productive-v1',
                        available: false,
                        ok: false,
                        productive: false,
                        prepared: false,
                        fallback: true,
                        fallbackReason: 'missing-ts-productive-helper',
                        comparison,
                        plan,
                        apply: null,
                    };
                status = {
                    ...plan,
                    comparison,
                    productivePrep,
                    productiveDecision,
                    ok: !!(plan && plan.ok && comparison && comparison.ok),
                    mismatchCount: comparison && Number.isFinite(Number(comparison.mismatchCount)) ? Number(comparison.mismatchCount) : 0,
                    productive: !!(productiveDecision && productiveDecision.productive),
                    productivePrepared: !!(productivePrep && productivePrep.prepared),
                    fallback: !(productiveDecision && productiveDecision.productive),
                    fallbackReason: productiveDecision && productiveDecision.fallbackReason ? productiveDecision.fallbackReason : '',
                    nextAction: productiveDecision && productiveDecision.nextAction
                        ? productiveDecision.nextAction
                        : 'EVCS/Charging-Management TS-Control ist aktivierbar; Ladepunktverteilung und Setpoint-Schreiben bleiben getrennt abgesichert.',
                    ts: Date.now(),
                };
            }
        } catch (e) {
            productivePrep = {
                source: 'ts-charging-control-productive-prep-v1',
                available: false,
                ok: false,
                productive: false,
                prepared: false,
                fallback: true,
                fallbackReason: 'ts-runtime-error',
                error: e && e.message ? e.message : String(e),
                apply: null,
                ts: Date.now(),
            };
            productiveDecision = {
                source: 'ts-charging-control-productive-v1',
                available: false,
                ok: false,
                productive: false,
                prepared: false,
                fallback: true,
                fallbackReason: 'ts-runtime-error',
                error: e && e.message ? e.message : String(e),
                apply: null,
                ts: Date.now(),
            };
            status = {
                source: 'ts-charging-control-shadow-v1',
                available: false,
                ok: false,
                productive: false,
                productivePrep,
                productiveDecision,
                productivePrepared: false,
                fallback: true,
                fallbackReason: 'ts-runtime-error',
                error: e && e.message ? e.message : String(e),
                ts: Date.now(),
            };
        }
        this._chargingControlTsShadowLast = status;
        this._chargingControlTsProductivePrepLast = productivePrep;
        this._chargingControlTsProductiveLast = productiveDecision;
        try {
            await this._queueState('chargingManagement.control.tsControlShadowJson', JSON.stringify(status), true);
            await this._queueState('chargingManagement.control.tsControlProductivePrepJson', JSON.stringify(productivePrep || {}), true);
            await this._queueState('chargingManagement.control.tsControlProductiveJson', JSON.stringify(productiveDecision || {}), true);
            await this._queueState('chargingManagement.control.tsControlSource', productiveDecision && productiveDecision.productive ? 'ts-control' : (productivePrep && productivePrep.prepared ? 'ts-control-prepared' : 'js-runtime'), true);

            // TS-Migration 0.7.125: Control-/Summary-Werte werden bei sauberem
            // Shadow-Vergleich produktiv aus dem TS-Vertrag übernommen. Das ist
            // bewusst nur die Control-Ebene; Ladepunktverteilung, Boost/PV/Min+PV,
            // Failsafe-Stopps und Setpoint-Schreiben bleiben weiterhin JavaScript.
            const apply = productiveDecision && productiveDecision.productive ? productiveDecision.apply : null;
            if (apply && typeof apply === 'object') {
                await this._queueState('chargingManagement.control.active', !!apply.active, true);
                await this._queueState('chargingManagement.control.mode', String(apply.mode || ''), true);
                await this._queueState('chargingManagement.control.status', String(apply.status || ''), true);
                await this._queueState('chargingManagement.control.budgetMode', String(apply.budgetMode || ''), true);
                await this._queueState('chargingManagement.control.budgetW', Number.isFinite(Number(apply.budgetW)) ? Number(apply.budgetW) : 0, true);
                await this._queueState('chargingManagement.control.usedW', Number.isFinite(Number(apply.usedW)) ? Number(apply.usedW) : 0, true);
                await this._queueState('chargingManagement.control.remainingW', Number.isFinite(Number(apply.remainingW)) ? Number(apply.remainingW) : 0, true);
                await this._queueState('chargingManagement.wallboxCount', Number.isFinite(Number(apply.wallboxCount)) ? Number(apply.wallboxCount) : 0, true);
                await this._queueState('chargingManagement.summary.onlineWallboxes', Number.isFinite(Number(apply.onlineWallboxes)) ? Number(apply.onlineWallboxes) : 0, true);
                // 0.8.64: TS-Control darf EVCS Ist nicht aus Reserve/Setpoint überschreiben.
                // Summary-Ist wird im JS-Hauptpfad aus frischer Messleistung `totalFreshActualPowerW`
                // gesetzt. Nur wenn der TS-Plan später ausdrücklich `actualW`/`measuredPowerW`
                // liefert, darf er hier die Summary-Istleistung schreiben.
                const applyActualW = Number.isFinite(Number(apply.actualW)) ? Number(apply.actualW) : (Number.isFinite(Number(apply.measuredPowerW)) ? Number(apply.measuredPowerW) : null);
                if (applyActualW !== null) await this._queueState('chargingManagement.summary.totalPowerW', Math.max(0, applyActualW), true);
                await this._queueState('chargingManagement.summary.totalTargetPowerW', Number.isFinite(Number(apply.totalTargetPowerW)) ? Number(apply.totalTargetPowerW) : 0, true);
                await this._queueState('chargingManagement.summary.totalTargetCurrentA', Number.isFinite(Number(apply.totalTargetCurrentA)) ? Number(apply.totalTargetCurrentA) : 0, true);
                await this._queueState('chargingManagement.control.pausedByPeakShaving', !!apply.pausedByPeakShaving, true);
                await this._queueState('chargingManagement.control.pvAvailable', !!apply.pvAvailable, true);
                await this._queueState('chargingManagement.control.gridCapBinding', !!apply.gridCapBinding, true);
                await this._queueState('chargingManagement.control.phaseCapBinding', !!apply.phaseCapBinding, true);
                await this._queueState('chargingManagement.control.para14aBinding', !!apply.para14aBinding, true);
                await this._queueState('chargingManagement.control.storageAssistActive', !!apply.storageAssistActive, true);
                await this._queueState('chargingManagement.control.storageAssistW', Number.isFinite(Number(apply.storageAssistW)) ? Number(apply.storageAssistW) : 0, true);
            }
        } catch (_eWrite) {}
        return status;
    }

    /** Code-Teil: _publishChargingAllocationTsShadow – Dokumentiert diesen Regelungs- oder Diagnosebaustein. */
    async _publishChargingAllocationTsShadow(input) {
        const allocationMirror = requireChargingAllocationTsMirror();
        const writePlanMirror = requireChargingWritePlanTsMirror();
        const phaseMirror = requireChargingPhaseSelectionTsMirror();
        let phasePlan = null;
        let allocationInput = input || {};
        let shadow = null;
        let productivePrep = null;
        let productiveDecision = null;
        let normalSourceDecision = null;
        let writePlan = null;
        let writePlanProductivePrep = null;
        let writePlanProductive = null;
        try {
            if (phaseMirror && typeof phaseMirror.buildChargingPhaseSelectionPlan === 'function') {
                phasePlan = phaseMirror.buildChargingPhaseSelectionPlan((input && input.phaseSelection) ? input.phaseSelection : (input || {}));
            } else {
                phasePlan = {
                    source: 'ts-charging-phase-selection-v1',
                    available: false,
                    ok: false,
                    productive: false,
                    fallback: true,
                    fallbackReason: 'missing-ts-phase-selection-mirror',
                    wallboxes: [],
                    blockers: ['missing-ts-phase-selection-mirror'],
                    warnings: [],
                    ts: Date.now(),
                };
            }
        } catch (e) {
            phasePlan = {
                source: 'ts-charging-phase-selection-v1',
                available: false,
                ok: false,
                productive: false,
                fallback: true,
                fallbackReason: 'ts-phase-selection-runtime-error',
                error: e && e.message ? e.message : String(e),
                wallboxes: [],
                blockers: ['ts-phase-selection-runtime-error'],
                warnings: [],
                ts: Date.now(),
            };
        }
        allocationInput = { ...(input || {}), phasePlan };
        try {
            if (!allocationMirror || typeof allocationMirror.buildChargingAllocationShadowPlan !== 'function') {
                shadow = {
                    source: 'ts-charging-allocation-shadow-v1',
                    available: false,
                    ok: false,
                    productive: false,
                    fallback: true,
                    fallbackReason: 'missing-ts-allocation-mirror',
                    ts: Date.now(),
                };
                productivePrep = {
                    source: 'ts-charging-allocation-productive-prep-v1',
                    available: false,
                    ok: false,
                    productive: false,
                    prepared: false,
                    fallback: true,
                    fallbackReason: 'missing-ts-allocation-mirror',
                    apply: null,
                    ts: Date.now(),
                };
                productiveDecision = {
                    source: 'ts-charging-allocation-productive-v1',
                    available: false,
                    ok: false,
                    productive: false,
                    prepared: false,
                    fallback: true,
                    fallbackReason: 'missing-ts-allocation-mirror',
                    apply: null,
                    ts: Date.now(),
                };
                normalSourceDecision = {
                    source: 'ts-charging-allocation-normal-source-v1',
                    available: false,
                    ok: false,
                    productive: false,
                    normalSource: false,
                    prepared: false,
                    fallback: true,
                    fallbackReason: 'missing-ts-allocation-mirror',
                    apply: null,
                    ts: Date.now(),
                };
            } else {
                const plan = allocationMirror.buildChargingAllocationShadowPlan(allocationInput || {});
                const comparison = (typeof allocationMirror.compareChargingAllocationShadowPlan === 'function')
                    ? allocationMirror.compareChargingAllocationShadowPlan(allocationInput || {}, plan)
                    : { ok: true, mismatchCount: 0, mismatches: [] };
                productivePrep = (typeof allocationMirror.buildChargingAllocationProductivePrep === 'function')
                    ? allocationMirror.buildChargingAllocationProductivePrep(allocationInput || {}, plan, comparison)
                    : {
                        source: 'ts-charging-allocation-productive-prep-v1',
                        available: false,
                        ok: false,
                        productive: false,
                        prepared: false,
                        fallback: true,
                        fallbackReason: 'missing-ts-allocation-prep-helper',
                        comparison,
                        plan,
                        apply: null,
                    };
                productiveDecision = (typeof allocationMirror.buildChargingAllocationProductive === 'function')
                    ? allocationMirror.buildChargingAllocationProductive(allocationInput || {}, plan, comparison)
                    : {
                        source: 'ts-charging-allocation-productive-v1',
                        available: false,
                        ok: false,
                        productive: false,
                        prepared: false,
                        fallback: true,
                        fallbackReason: 'missing-ts-allocation-productive-helper',
                        comparison,
                        plan,
                        apply: null,
                    };
                normalSourceDecision = (typeof allocationMirror.buildChargingAllocationNormalSource === 'function')
                    ? allocationMirror.buildChargingAllocationNormalSource(allocationInput || {}, plan, comparison)
                    : {
                        source: 'ts-charging-allocation-normal-source-v1',
                        available: false,
                        ok: false,
                        productive: false,
                        normalSource: false,
                        prepared: false,
                        fallback: true,
                        fallbackReason: 'missing-ts-allocation-normal-source-helper',
                        diagnosticComparison: comparison,
                        diagnosticMismatchCount: comparison && Number.isFinite(Number(comparison.mismatchCount)) ? Number(comparison.mismatchCount) : 0,
                        plan,
                        apply: null,
                    };
                shadow = {
                    ...plan,
                    phasePlan,
                    comparison,
                    productivePrep,
                    productiveDecision,
                    normalSourceDecision,
                    ok: !!(plan && plan.ok && (normalSourceDecision && normalSourceDecision.normalSource ? true : (comparison && comparison.ok))),
                    mismatchCount: comparison && Number.isFinite(Number(comparison.mismatchCount)) ? Number(comparison.mismatchCount) : 0,
                    productive: !!((normalSourceDecision && normalSourceDecision.normalSource) || (productiveDecision && productiveDecision.productive)),
                    normalSource: !!(normalSourceDecision && normalSourceDecision.normalSource),
                    productivePrepared: !!(productivePrep && productivePrep.prepared),
                    fallback: !((normalSourceDecision && normalSourceDecision.normalSource) || (productiveDecision && productiveDecision.productive)),
                    fallbackReason: normalSourceDecision && normalSourceDecision.fallbackReason ? normalSourceDecision.fallbackReason : (productiveDecision && productiveDecision.fallbackReason ? productiveDecision.fallbackReason : ''),
                    ts: Date.now(),
                };
            }
        } catch (e) {
            shadow = {
                source: 'ts-charging-allocation-shadow-v1',
                available: false,
                ok: false,
                productive: false,
                fallback: true,
                fallbackReason: 'ts-runtime-error',
                error: e && e.message ? e.message : String(e),
                ts: Date.now(),
            };
            productivePrep = {
                source: 'ts-charging-allocation-productive-prep-v1',
                available: false,
                ok: false,
                productive: false,
                prepared: false,
                fallback: true,
                fallbackReason: 'ts-runtime-error',
                error: e && e.message ? e.message : String(e),
                apply: null,
                ts: Date.now(),
            };
            productiveDecision = {
                source: 'ts-charging-allocation-productive-v1',
                available: false,
                ok: false,
                productive: false,
                prepared: false,
                fallback: true,
                fallbackReason: 'ts-runtime-error',
                error: e && e.message ? e.message : String(e),
                apply: null,
                ts: Date.now(),
            };
            normalSourceDecision = {
                source: 'ts-charging-allocation-normal-source-v1',
                available: false,
                ok: false,
                productive: false,
                normalSource: false,
                prepared: false,
                fallback: true,
                fallbackReason: 'ts-runtime-error',
                error: e && e.message ? e.message : String(e),
                apply: null,
                ts: Date.now(),
            };
        }

        try {
            if (!writePlanMirror || typeof writePlanMirror.buildChargingSetpointWritePlan !== 'function') {
                writePlan = {
                    source: 'ts-charging-setpoint-write-plan-shadow-v1',
                    available: false,
                    ok: false,
                    productive: false,
                    fallback: true,
                    fallbackReason: 'missing-ts-write-plan-mirror',
                    entries: [],
                    ts: Date.now(),
                };
                writePlanProductivePrep = {
                    source: 'ts-charging-setpoint-write-plan-productive-prep-v1',
                    available: false,
                    ok: false,
                    productive: false,
                    prepared: false,
                    fallback: true,
                    fallbackReason: 'missing-ts-write-plan-mirror',
                    entries: [],
                    apply: null,
                    ts: Date.now(),
                };
                writePlanProductive = {
                    source: 'ts-charging-setpoint-write-plan-productive-v1',
                    available: false,
                    ok: false,
                    productive: false,
                    prepared: false,
                    fallback: true,
                    fallbackReason: 'missing-ts-write-plan-mirror',
                    entries: [],
                    apply: null,
                    ts: Date.now(),
                };
            } else {
                const allocationDecisionForWritePlan = normalSourceDecision && normalSourceDecision.normalSource ? normalSourceDecision : productiveDecision;
                const productiveAllocationPlan = allocationDecisionForWritePlan && allocationDecisionForWritePlan.apply
                    ? { wallboxes: allocationDecisionForWritePlan.apply.wallboxes || [] }
                    : (productivePrep && productivePrep.plan ? productivePrep.plan : shadow);
                writePlan = writePlanMirror.buildChargingSetpointWritePlan({
                    ...(allocationInput || {}),
                    allocationPlan: productiveAllocationPlan,
                    allowWrites: false,
                });
                writePlanProductivePrep = (typeof writePlanMirror.buildChargingSetpointWritePlanProductivePrep === 'function')
                    ? writePlanMirror.buildChargingSetpointWritePlanProductivePrep({
                        ...(allocationInput || {}),
                        allocationPlan: productiveAllocationPlan,
                        allowWrites: false,
                    }, writePlan)
                    : {
                        source: 'ts-charging-setpoint-write-plan-productive-prep-v1',
                        available: false,
                        ok: false,
                        productive: false,
                        prepared: false,
                        fallback: true,
                        fallbackReason: 'missing-ts-write-plan-productive-prep-helper',
                        entries: writePlan && Array.isArray(writePlan.entries) ? writePlan.entries : [],
                        apply: null,
                        ts: Date.now(),
                    };
                writePlanProductive = (typeof writePlanMirror.buildChargingSetpointWritePlanProductive === 'function')
                    ? writePlanMirror.buildChargingSetpointWritePlanProductive({
                        ...(allocationInput || {}),
                        allocationPlan: productiveAllocationPlan,
                        allowWrites: !!(allocationDecisionForWritePlan && (allocationDecisionForWritePlan.normalSource || allocationDecisionForWritePlan.productive)),
                    }, writePlan)
                    : {
                        source: 'ts-charging-setpoint-write-plan-productive-v1',
                        available: false,
                        ok: false,
                        productive: false,
                        prepared: false,
                        fallback: true,
                        fallbackReason: 'missing-ts-write-plan-productive-helper',
                        entries: writePlan && Array.isArray(writePlan.entries) ? writePlan.entries : [],
                        apply: null,
                        ts: Date.now(),
                    };
            }
        } catch (e) {
            writePlan = {
                source: 'ts-charging-setpoint-write-plan-shadow-v1',
                available: false,
                ok: false,
                productive: false,
                fallback: true,
                fallbackReason: 'ts-runtime-error',
                error: e && e.message ? e.message : String(e),
                entries: [],
                ts: Date.now(),
            };
            writePlanProductivePrep = {
                source: 'ts-charging-setpoint-write-plan-productive-prep-v1',
                available: false,
                ok: false,
                productive: false,
                prepared: false,
                fallback: true,
                fallbackReason: 'ts-runtime-error',
                error: e && e.message ? e.message : String(e),
                entries: [],
                apply: null,
                ts: Date.now(),
            };
            writePlanProductive = {
                source: 'ts-charging-setpoint-write-plan-productive-v1',
                available: false,
                ok: false,
                productive: false,
                prepared: false,
                fallback: true,
                fallbackReason: 'ts-runtime-error',
                error: e && e.message ? e.message : String(e),
                entries: [],
                apply: null,
                ts: Date.now(),
            };
        }

        this._chargingPhaseSelectionTsLast = phasePlan;
        this._chargingAllocationTsShadowLast = shadow;
        this._chargingAllocationTsProductivePrepLast = productivePrep;
        this._chargingAllocationTsProductiveLast = productiveDecision;
        this._chargingAllocationTsNormalSourceLast = normalSourceDecision;
        this._chargingWritePlanTsShadowLast = writePlan;
        this._chargingWritePlanTsProductivePrepLast = writePlanProductivePrep;
        this._chargingWritePlanTsProductiveLast = writePlanProductive;
        try {
            await this._queueState('chargingManagement.control.phaseSelectionJson', JSON.stringify(phasePlan || {}), true);
            await this._queueState('chargingManagement.control.phaseSelectionSource', phasePlan && phasePlan.available !== false ? 'ts-phase-selection' : 'unavailable', true);
            await this._queueState('chargingManagement.control.tsAllocationShadowJson', JSON.stringify(shadow || {}), true);
            await this._queueState('chargingManagement.control.tsAllocationProductivePrepJson', JSON.stringify(productivePrep || {}), true);
            await this._queueState('chargingManagement.control.tsAllocationProductiveJson', JSON.stringify(productiveDecision || {}), true);
            await this._queueState('chargingManagement.control.tsAllocationNormalSourceJson', JSON.stringify(normalSourceDecision || {}), true);
            await this._queueState('chargingManagement.control.tsAllocationSource', normalSourceDecision && normalSourceDecision.normalSource ? 'ts-normal-source' : (productiveDecision && productiveDecision.productive ? 'ts-allocation' : (productivePrep && productivePrep.prepared ? 'ts-allocation-prepared' : 'js-runtime')), true);
            await this._queueState('chargingManagement.control.tsWritePlanShadowJson', JSON.stringify(writePlan || {}), true);
            await this._queueState('chargingManagement.control.tsWritePlanProductivePrepJson', JSON.stringify(writePlanProductivePrep || {}), true);
            await this._queueState('chargingManagement.control.tsWritePlanProductiveJson', JSON.stringify(writePlanProductive || {}), true);
            await this._queueState('chargingManagement.control.tsWritePlanSource', writePlanProductive && writePlanProductive.productive ? 'ts-write-plan' : (writePlanProductivePrep && writePlanProductivePrep.prepared ? 'ts-write-plan-prepared' : (writePlan && writePlan.available !== false ? 'ts-write-plan-shadow' : 'js-runtime')), true);
        } catch (_eWrite) {}
        return { phasePlan, shadow, productivePrep, productiveDecision, normalSourceDecision, writePlan, writePlanProductivePrep, writePlanProductive };
    }

    /** Code-Teil: _mapChargingWallboxesForTsAllocation – Normalisiert die aktuelle Runtime-Wallboxliste für den TypeScript-Allocation-/Write-Plan. */
    _mapChargingWallboxesForTsAllocation(wbList) {
        return (Array.isArray(wbList) ? wbList : []).map(w => ({
            safe: w && w.safe,
            key: w && w.key,
            name: w && w.name,
            enabled: !!(w && w.enabled && w.electricalLimitsValid !== false),
            online: !!(w && w.online),
            cfgEnabled: !!(w && w.cfgEnabled),
            userStationEnabled: !!(w && w.userStationEnabled),
            stationEnabled: !!(w && w.stationEnabled),
            userEnabled: !!(w && w.userEnabled),
            // Physischer Anschlusszustand und bestätigter Ladebedarf bleiben
            // getrennt. Boost darf den Ladepunkt bewusst vorladen/vorrüsten,
            // ohne die UI fälschlich als „Fahrzeug verbunden“ zu markieren.
            vehiclePlugged: !!(w && w.vehiclePlugged === true),
            vehicleDemandConfirmed: !!(w && w.vehicleDemandConfirmed === true),
            vehicleStartEligible: !!(w && w.vehicleStartEligible === true),
            vehicleStartProbeActive: !!(w && w.vehicleStartProbeActive === true),
            vehicleStartCooldownActive: !!(w && w.vehicleStartCooldownActive === true),
            vehicleStartCooldownUntilMs: w && Number.isFinite(Number(w.vehicleStartCooldownUntilMs)) ? Number(w.vehicleStartCooldownUntilMs) : 0,
            boostPrearmAllowed: !!(w && normalizeWallboxModeOverride(w.effectiveMode) === 'boost'),
            charging: !!(w && w.charging),
            effectiveMode: w && w.effectiveMode,
            userMode: w && w.userMode,
            chargerType: w && w.chargerType,
            dcCurrentReference: w && w.dcCurrentReference,
            controlBasis: w && w.controlBasis,
            phases: w && w.phases,
            phaseMode: w && w.phaseMode,
            boostMaxPowerW: w && w.boostMaxPowerW,
            zeroExportGridMaxW: w && w.zeroExportGridMaxW,
            zeroExportStorageCreditW: w && w.zeroExportStorageCreditW,
            zeroExportRestartUntilMs: w && w.zeroExportRestartUntilMs,
            zeroExportProbeExtraW: w && w.zeroExportProbeExtraW,
            zeroExportProbeLeaseId: w && w.zeroExportProbeLeaseId,
            zeroExportProbeValidUntil: w && w.zeroExportProbeValidUntil,
            zeroExportPhaseProbe: w && w.zeroExportPhaseProbe,
            configuredPhaseCount: w && w.configuredPhaseCount,
            currentPhaseCount: w && w.currentPhaseCount,
            targetPhaseCount: w && w.targetPhaseCount,
            allocationPhaseCount: w && w.allocationPhaseCount,
            phaseSwitchRequired: w && w.phaseSwitchRequired,
            phaseSwitchAllowed: w && w.phaseSwitchAllowed,
            phaseSwitchCommandAllowed: w && w.phaseSwitchCommandAllowed,
            phaseSwitchKey: w && w.phaseSwitchKey,
            phaseSwitchValue: w && w.phaseSwitchValue,
            // Preserve the actual per-point phase contract, not only global defaults.
            supportsPhaseSwitch: !!(w && w.phaseSwitchKey),
            phaseSwitchValue1p: w && w.phaseSwitchValue1p,
            phaseSwitchValue3p: w && w.phaseSwitchValue3p,
            switchUpThresholdW: w && w.phaseSwitchUpThresholdW,
            switchDownThresholdW: w && w.phaseSwitchDownThresholdW,
            switchUpStableMs: w && w.phaseSwitchUpStableMs,
            switchDownStableMs: w && w.phaseSwitchDownStableMs,
            switchCooldownMs: w && w.phaseSwitchCooldownMs,
            switchSettleMs: w && w.phaseSwitchSettleMs,
            switchSafePowerW: w && w.phaseSwitchSafePowerW,
            highSinceMs: w && w.highSinceMs,
            lowSinceMs: w && w.lowSinceMs,
            cooldownUntilMs: w && w.cooldownUntilMs,
            settleUntilMs: w && w.settleUntilMs,
            phaseSwitchReason: w && w.phaseSwitchReason,
            phaseSwitchSafetyStopRequired: w && w.phaseSwitchSafetyStopRequired,
            phaseSwitchCooldownRemainingMs: w && w.phaseSwitchCooldownRemainingMs,
            stopBeforePhaseSwitch: w && w.stopBeforePhaseSwitch,
            storageAssistCustomerAllowed: !!(w && w.storageAssistCustomerAllowed),
            userStorageAssistEnabled: !!(w && w.userStorageAssistEnabled),
            effectiveStorageAssist: !!(w && w.effectiveStorageAssist),
            storageAssistBlockedReason: w && w.storageAssistBlockedReason,
            batteryContributionW: w && w.batteryContributionW,
            voltageV: w && w.voltageV,
            minPowerW: w && w.minPW,
            maxPowerW: w && w.maxPW,
            minA: w && w.minA,
            maxA: w && w.maxA,
            actualPowerW: w && w.actualPowerW,
            priority: w && w.priority,
            orderIndex: w && w.orderIndex,
            allocationRank: w && w.allocationRank,
            chargingSinceMs: w && w.chargingSinceMs,
            goalActive: !!(w && w.goalActive),
            goalFinishTs: w && w.goalFinishTs,
            goalUrgency: w && w.goalUrgency,
            goalDesiredW: w && w.goalDesiredW,
            goalOverdue: !!(w && w.goalOverdue),
            stationKey: w && w.stationKey,
            stationMaxPowerW: w && w.stationMaxPowerW,
            connectorNo: w && w.connectorNo,
            stepW: w && w.stepW,
            stepA: w && w.stepA,
            maxDeltaWPerTick: w && w.maxDeltaWPerTick,
            maxDeltaAPerTick: w && w.maxDeltaAPerTick,
            pvRampUpWPerTick: w && w.pvRampUpWPerTick,
            pvRampUpAPerTick: w && (w.pvRampUpAPerTick !== undefined ? w.pvRampUpAPerTick : w.pvRampUpAperTick),
            lastCommandPowerW: this._lastCmdTargetW && typeof this._lastCmdTargetW.get === 'function' ? this._lastCmdTargetW.get(w && w.safe) : 0,
            lastCommandCurrentA: this._lastCmdTargetA && typeof this._lastCmdTargetA.get === 'function' ? this._lastCmdTargetA.get(w && w.safe) : 0,
            setAKey: w && w.setAKey,
            setWKey: w && w.setWKey,
            enableKey: w && w.enableKey,
            hasSetpoint: !!(w && (w.hasSetpoint || w.setAKey || w.setWKey)),
            hasSetPower: !!(w && w.setWKey),
            hasSetCurrent: !!(w && w.setAKey),
            staleAny: !!(w && w.staleAny),
        }));
    }

    /** Code-Teil: _publishChargingStationDiagnosticsFromAllocationPlan – Spiegelt Stationsverbrauch und Restleistung aus dem finalen TS-geprueften */
    async _publishChargingStationDiagnosticsFromAllocationPlan(allocationState, wbList) {
        try {
            const normalDecision = allocationState && allocationState.normalSourceDecision;
            const productiveDecision = allocationState && allocationState.productiveDecision;
            const decision = normalDecision && normalDecision.apply
                ? normalDecision
                : (productiveDecision && productiveDecision.apply ? productiveDecision : null);
            const plans = decision && decision.apply && Array.isArray(decision.apply.wallboxes)
                ? decision.apply.wallboxes
                : [];
            const bySafe = new Map((Array.isArray(wbList) ? wbList : []).filter(w => w && w.safe).map(w => [String(w.safe), w]));
            const capByStation = new Map();
            const nameByStation = new Map();
            const connectorsByStation = new Map();
            const targetByStation = new Map();
            const boostByStation = new Map();
            const pvByStation = new Map();

            for (const w of Array.isArray(wbList) ? wbList : []) {
                if (!w) continue;
                const stationKey = String(w.stationKey || '').trim();
                const capW = Number(w.stationMaxPowerW);
                if (!stationKey || !Number.isFinite(capW) || capW <= 0) continue;
                const previousCap = capByStation.get(stationKey);
                capByStation.set(stationKey, Number.isFinite(previousCap) ? Math.min(previousCap, capW) : capW);
                if (!nameByStation.has(stationKey)) nameByStation.set(stationKey, String(w.stationName || w.name || stationKey));
                const set = connectorsByStation.get(stationKey) || new Set();
                set.add(String(w.safe || ''));
                connectorsByStation.set(stationKey, set);
            }

            for (const plan of plans) {
                if (!plan || !plan.safe) continue;
                const w = bySafe.get(String(plan.safe));
                const stationKey = String((plan.stationKey || (w && w.stationKey) || '')).trim();
                if (!stationKey || !capByStation.has(stationKey)) continue;
                const targetW = Math.max(0, Number(plan.targetPowerW || 0));
                targetByStation.set(stationKey, (targetByStation.get(stationKey) || 0) + (Number.isFinite(targetW) ? targetW : 0));
                if (plan.boost === true || String(plan.effectiveMode || '').toLowerCase() === 'boost') {
                    boostByStation.set(stationKey, (boostByStation.get(stationKey) || 0) + 1);
                }
                if (String(plan.effectiveMode || '').toLowerCase().includes('pv')) {
                    pvByStation.set(stationKey, (pvByStation.get(stationKey) || 0) + 1);
                }
            }

            await this._queueState('chargingManagement.stationCount', capByStation.size, true);
            for (const [stationKey, capW] of capByStation.entries()) {
                const targetW = Math.max(0, targetByStation.get(stationKey) || 0);
                const remainingW = Math.max(0, capW - targetW);
                const toleranceW = Math.max(50, capW * 0.005);
                const channel = await this._ensureStationChannel(stationKey);
                const connectors = connectorsByStation.get(stationKey) || new Set();
                await this._queueState(`${channel}.stationKey`, stationKey, true);
                await this._queueState(`${channel}.name`, nameByStation.get(stationKey) || stationKey, true);
                await this._queueState(`${channel}.maxPowerW`, Math.round(capW), true);
                await this._queueState(`${channel}.remainingW`, Math.round(remainingW), true);
                await this._queueState(`${channel}.usedW`, Math.round(targetW), true);
                await this._queueState(`${channel}.binding`, remainingW <= toleranceW, true);
                await this._queueState(`${channel}.headroomW`, Math.round(remainingW), true);
                await this._queueState(`${channel}.targetSumW`, Math.round(targetW), true);
                await this._queueState(`${channel}.connectorCount`, connectors.size, true);
                await this._queueState(`${channel}.boostConnectors`, boostByStation.get(stationKey) || 0, true);
                await this._queueState(`${channel}.pvLimitedConnectors`, pvByStation.get(stationKey) || 0, true);
                await this._queueState(`${channel}.connectors`, Array.from(connectors).filter(Boolean).join(','), true);
                await this._queueState(`${channel}.lastUpdate`, Date.now(), true);

                for (const safe of connectors) {
                    const w = bySafe.get(String(safe));
                    if (!w || !w.ch) continue;
                    await this._queueState(`${w.ch}.stationRemainingW`, Math.round(remainingW), true);
                }
            }
            return true;
        } catch (_eStationDiagnostics) {
            return false;
        }
    }

    /** Code-Teil: _buildChargingFinalAllocationMetrics – Leitet die zentrale EVCS-Reservierung ausschließlich aus dem finalen, */
    _buildChargingFinalAllocationMetrics(allocationState, wbList, activityThresholdW = 100) {
        try {
            const normalDecision = allocationState && allocationState.normalSourceDecision;
            const productiveDecision = allocationState && allocationState.productiveDecision;
            const decision = normalDecision && normalDecision.apply
                ? normalDecision
                : (productiveDecision && productiveDecision.apply ? productiveDecision : null);
            const plans = decision && decision.apply && Array.isArray(decision.apply.wallboxes)
                ? decision.apply.wallboxes
                : [];
            if (!plans.length) return null;

            const bySafe = new Map((Array.isArray(wbList) ? wbList : [])
                .filter(w => w && w.safe)
                .map(w => [String(w.safe), w]));
            const thresholdW = Math.max(1, Number.isFinite(Number(activityThresholdW)) ? Number(activityThresholdW) : 100);
            let totalTargetPowerW = 0;
            let totalTargetCurrentA = 0;
            let reserveW = 0;
            let pvReserveW = 0;
            let pvIntentW = 0;
            let purePvIntentW = 0;
            let activeDemandWallboxes = 0;

            for (const plan of plans) {
                if (!plan || !plan.safe) continue;
                const w = bySafe.get(String(plan.safe)) || null;
                const demandConfirmed = w
                    ? w.vehicleDemandConfirmed === true
                    : (plan.demandConfirmed === true || plan.connected === true);
                const boostPrearmAllowed = !!(
                    (w && normalizeWallboxModeOverride(w.effectiveMode) === 'boost')
                    || plan.boostPrearmAllowed === true
                    || plan.boost === true
                    || normalizeWallboxModeOverride(plan.effectiveMode) === 'boost'
                );
                const requestedTargetW = Math.max(0, Number.isFinite(Number(plan.targetPowerW)) ? Number(plan.targetPowerW) : 0);
                const requestedTargetA = Math.max(0, Number.isFinite(Number(plan.targetCurrentA)) ? Number(plan.targetCurrentA) : 0);
                const startEligible = w ? w.vehicleStartEligible === true : plan.vehicleStartEligible === true;
                const startProbeActive = w ? w.vehicleStartProbeActive === true : plan.vehicleStartProbeActive === true;
                const positiveIntent = requestedTargetW >= thresholdW || requestedTargetA > 0 || startProbeActive;
                const commandDemandAllowed = demandConfirmed || boostPrearmAllowed || (startEligible && positiveIntent);
                const targetW = commandDemandAllowed ? requestedTargetW : 0;
                const targetA = commandDemandAllowed ? requestedTargetA : 0;
                const actualW = demandConfirmed && !(w && w.meterStale)
                    ? Math.max(0, Number.isFinite(Number(w && w.actualPowerW)) ? Math.abs(Number(w.actualPowerW)) : 0)
                    : 0;
                totalTargetPowerW += targetW;
                totalTargetCurrentA += targetA;

                const enabled = w ? w.enabled !== false : plan.enabled !== false;
                const online = w ? w.online === true : plan.online === true;
                const connected = commandDemandAllowed;
                const hasControl = w
                    ? !!(w.setAKey || w.setWKey || w.hasSetpoint || w.controlBasis !== 'none')
                    : plan.hasSetpoint !== false;
                const charging = !!(w && w.charging) || plan.charging === true;
                const goalActive = !!(w && w.goalActive) || plan.goalActive === true;
                const activeDemand = !!(
                    enabled
                    && online
                    && connected
                    && hasControl
                    && (
                        charging
                        || actualW >= thresholdW
                        || targetW >= thresholdW
                        || (goalActive && targetW > 0)
                    )
                );
                if (!activeDemand) continue;

                const reserveThisW = Math.max(actualW, targetW);
                if (!(reserveThisW > 0)) continue;
                const finalPvUsedW = Math.max(0, Number.isFinite(Number(plan.pvUsedW)) ? Number(plan.pvUsedW) : 0);
                if (w && typeof w.zeroExportGridMaxW === 'number') {
                    w.zeroExportPvCreditW = finalPvUsedW;
                    w.zeroExportStorageCreditW = Math.min(Number(w.zeroExportStorageCreditW) || 0, Math.max(0, Number(plan.batteryContributionW) || 0));
                    w.batteryContributionW = w.zeroExportStorageCreditW;
                }
                const minPowerW = Math.max(0, Number.isFinite(Number(plan.minPowerW))
                    ? Number(plan.minPowerW)
                    : (Number.isFinite(Number(w && w.minPW)) ? Number(w.minPW) : 0));
                const effectiveMode = String(plan.effectiveMode || (w && w.effectiveMode) || '');

                reserveW += reserveThisW;
                pvReserveW += Math.min(reserveThisW, finalPvUsedW);
                const confirmedReserveW = Math.max(0, reserveThisW - (Number(plan.zeroExportProbeExtraW) || 0));
                const storageReserveW = w && typeof w.zeroExportGridMaxW === 'number' ? Number(w.zeroExportStorageCreditW) || 0 : 0;
                const legacyPvIntentW = computePvManagedDemandIntentW(effectiveMode, Math.max(0, confirmedReserveW - storageReserveW), minPowerW);
                pvIntentW += w && typeof w.zeroExportGridMaxW === 'number'
                    ? Math.max(legacyPvIntentW, confirmedReserveW - w.zeroExportGridMaxW - storageReserveW, finalPvUsedW) : legacyPvIntentW;
                if (effectiveMode === 'pv') purePvIntentW += confirmedReserveW;
                activeDemandWallboxes += 1;
            }

            return {
                totalTargetPowerW: Math.max(0, Math.round(totalTargetPowerW)),
                totalTargetCurrentA: Math.max(0, Number(totalTargetCurrentA.toFixed(3))),
                reserveW: Math.max(0, Math.round(reserveW)),
                pvReserveW: Math.max(0, Math.round(pvReserveW)),
                pvIntentW: Math.max(0, Math.round(pvIntentW)),
                purePvIntentW: Math.max(0, Math.round(purePvIntentW)),
                activeDemandWallboxes,
            };
        } catch (_eFinalAllocationMetrics) {
            return null;
        }
    }

    /** Attribute only the PV share of final, phase-checked Auto targets. */
    _buildAutoPvPriorityMetrics(allocationState, wbList, options) {
        const decision = allocationState && (allocationState.normalSourceDecision?.apply
            ? allocationState.normalSourceDecision : allocationState.productiveDecision);
        const plans = decision && Array.isArray(decision.apply?.wallboxes) ? decision.apply.wallboxes : [];
        const bySafe = new Map((wbList || []).filter(w => w && w.safe).map(w => [String(w.safe), w]));
        // Netzanteil-begrenzte LP besitzen bereits eine verbindliche PV-Zuteilung
        // im finalen Guard; die ältere Auto-Attribution darf sie nicht verdoppeln.
        const points = plans.filter(plan => typeof bySafe.get(String(plan.safe))?.zeroExportGridMaxW !== 'number').map(plan => {
            const w = bySafe.get(String(plan.safe)) || {};
            const factor = Math.max(1, Number(plan.phases) || 1) * Math.max(1, Number(plan.voltageV) || 230);
            const basisCurrent = ['current', 'currentA'].includes(String(plan.controlBasis));
            const step = basisCurrent ? (Number(plan.stepA) || 0.1) : (Number(plan.stepW) || 1);
            const minRaw = basisCurrent ? Math.max(Number(plan.minA) || 0, (Number(plan.minPowerW) || 0) / factor)
                : Math.max(0, Number(plan.minPowerW) || 0);
            const technicalMinimumW = Math.ceil((minRaw - 1e-9) / step) * step * (basisCurrent ? factor : 1);
            return {
                safe: String(plan.safe), userMode: String(w.userMode || plan.userMode || 'auto'),
                effectiveMode: String(plan.effectiveMode || w.effectiveMode || ''),
                enabled: w.enabled !== false && plan.enabled !== false,
                online: w.online === true && plan.online === true,
                demandConfirmed: w.vehicleDemandConfirmed === true || plan.demandConfirmed === true,
                startProbeActive: w.vehicleStartProbeActive === true || plan.vehicleStartProbeActive === true,
                actualFresh: w.meterStale !== true && plan.staleAny !== true,
                actualW: Math.max(0, Number(w.actualPowerW) || 0),
                finalTargetW: Math.max(0, Number(plan.targetPowerW) || 0),
                technicalMinimumW,
                phaseTransition: plan.phaseSwitchRequired === true || plan.phaseSwitchSafetyStopRequired === true,
            };
        });
        return buildAutoPvPriorityReservation({ ...options, points });
    }

    /** Code-Teil: _publishChargingPhaseSelectionRuntimeStates – Übernimmt Hysterese-/Cooldown-Zustände aus der TS-Phasenwahl und veröffentlicht lesbare Diagnose pro Ladepunkt. */
    async _publishChargingPhaseSelectionRuntimeStates(phasePlan, wbList) {
        const decisions = phasePlan && Array.isArray(phasePlan.wallboxes) ? phasePlan.wallboxes : [];
        const bySafe = new Map((Array.isArray(wbList) ? wbList : []).filter(w => w && w.safe).map(w => [String(w.safe), w]));
        for (const d of decisions) {
            if (!d || typeof d !== 'object') continue;
            const safe = String(d.safe || '').trim();
            if (!safe) continue;
            const w = bySafe.get(safe);
            const high = Number(d.nextHighSinceMs || 0);
            const low = Number(d.nextLowSinceMs || 0);
            if (this._chargingPhaseHighSinceMs) {
                if (Number.isFinite(high) && high > 0) this._chargingPhaseHighSinceMs.set(safe, high);
                else this._chargingPhaseHighSinceMs.delete(safe);
            }
            if (this._chargingPhaseLowSinceMs) {
                if (Number.isFinite(low) && low > 0) this._chargingPhaseLowSinceMs.set(safe, low);
                else this._chargingPhaseLowSinceMs.delete(safe);
            }
            if (!w || !w.ch) continue;
            try { await this._queueState(`${w.ch}.phaseMode`, String(d.mode || w.phaseMode || ''), true); } catch { /* ignore */ }
            try { await this._queueState(`${w.ch}.currentPhaseCount`, Number(d.currentPhaseCount || w.currentPhaseCount || 0), true); } catch { /* ignore */ }
            try { await this._queueState(`${w.ch}.targetPhaseCount`, Number(d.targetPhaseCount || w.targetPhaseCount || 0), true); } catch { /* ignore */ }
            try { await this._queueState(`${w.ch}.phaseSwitchState`, d.switchRequired ? (d.switchCommandAllowed ? 'command-ready' : (d.safetyStopRequired ? 'safe-stop-before-switch' : 'pending')) : 'idle', true); } catch { /* ignore */ }
            try { await this._queueState(`${w.ch}.phaseSwitchReason`, String(d.reason || d.blocker || d.warning || ''), true); } catch { /* ignore */ }
            try { await this._queueState(`${w.ch}.phaseCooldownRemainingMs`, Number(d.cooldownRemainingMs || 0), true); } catch { /* ignore */ }
        }
    }

    /** Code-Teil: _publishChargingNormalSourceState – Veröffentlicht den EVCS-TypeScript-Normalquellen-Lockdown. Dieser Status */
    async _publishChargingNormalSourceState(inputOrTsAllocationState, tsWritePlanProductive = null, tsWritePlanUsed = false, debugAlloc = [], context = 'normal', legacyFallbackReason = '', legacyDecisionTree = null) {
        const mirror = requireChargingNormalSourceTsMirror();
        let payload = null;
        const first = inputOrTsAllocationState && typeof inputOrTsAllocationState === 'object' ? inputOrTsAllocationState : null;
        const objectInput = !!(first && (
            Object.prototype.hasOwnProperty.call(first, 'allocation')
            || Object.prototype.hasOwnProperty.call(first, 'writePlan')
            || Object.prototype.hasOwnProperty.call(first, 'executor')
            || Object.prototype.hasOwnProperty.call(first, 'budget')
            || Object.prototype.hasOwnProperty.call(first, 'control')
        ));
        const tsAllocationState = objectInput ? null : first;
        const candidateCount = Array.isArray(debugAlloc) ? debugAlloc.filter(a => a && typeof a === 'object' && a.type !== 'budget').length : 0;
        const allocationDecision = objectInput
            ? (first.allocation || null)
            : (tsAllocationState && (tsAllocationState.normalSourceDecision || tsAllocationState.productiveDecision) ? (tsAllocationState.normalSourceDecision || tsAllocationState.productiveDecision) : null);
        const executorFallback = {
            used: !!tsWritePlanUsed,
            ok: !!tsWritePlanUsed,
            source: tsWritePlanUsed ? 'ts-write-plan' : 'js-hard-fallback',
            role: tsWritePlanUsed ? 'executor-only' : 'hard-fallback-only',
            appliedCount: 0,
            failedCount: tsWritePlanUsed ? 0 : 1,
            skippedCount: 0,
        };
        const input = objectInput ? {
            context: first.context || context,
            mode: first.mode || '',
            status: first.status || '',
            safetyStop: !!first.safetyStop,
            safetyReason: first.safetyReason || '',
            control: first.control || this._chargingControlTsProductiveLast || null,
            budget: first.budget || this._chargingBudgetTsProductiveLast || null,
            allocation: allocationDecision,
            writePlan: first.writePlan || tsWritePlanProductive || this._chargingWritePlanTsProductiveLast || null,
            executor: first.executor || this._chargingWritePlanExecutorLast || executorFallback,
            legacy: first.legacy || legacyDecisionTree || this._chargingLegacyDecisionTreeLast || null,
            ts: Date.now(),
        } : {
            context,
            mode: '',
            status: '',
            safetyStop: String(context || '').includes('safety') || String(context || '').includes('failsafe') || String(context || '').includes('rampdown'),
            safetyReason: '',
            control: this._chargingControlTsProductiveLast || null,
            budget: this._chargingBudgetTsProductiveLast || null,
            allocation: allocationDecision,
            writePlan: tsWritePlanProductive || this._chargingWritePlanTsProductiveLast || null,
            executor: this._chargingWritePlanExecutorLast || executorFallback,
            legacy: legacyDecisionTree || this._chargingLegacyDecisionTreeLast || null,
            ts: Date.now(),
        };
        try {
            const buildNormalSource = mirror && (
                mirror.buildChargingNormalSourceDecision
                || mirror.buildChargingNormalSourceLockdown
                || mirror.buildChargingTsNormalSourceLockdown
            );
            if (!buildNormalSource) {
                payload = {
                    source: 'ts-charging-normal-source-lockdown-v1',
                    available: false,
                    ok: false,
                    productive: false,
                    tsNormalSource: false,
                    runtimeSource: 'javascript-hard-fallback',
                    normalSource: 'javascript-hard-fallback',
                    jsRole: 'executor-and-hard-fallback',
                    context: String(input.context || 'normal'),
                    fallback: true,
                    fallbackReason: 'missing-ts-normal-source-mirror',
                    blockers: ['missing-ts-normal-source-mirror'],
                    candidateCount,
                    ts: Date.now(),
                };
            } else {
                payload = buildNormalSource(input);
                if (payload && typeof payload === 'object' && candidateCount && payload.candidateCount === undefined) payload.candidateCount = candidateCount;
            }
        } catch (e) {
            payload = {
                source: 'ts-charging-normal-source-lockdown-v1',
                available: false,
                ok: false,
                productive: false,
                tsNormalSource: false,
                runtimeSource: 'javascript-hard-fallback',
                normalSource: 'javascript-hard-fallback',
                jsRole: 'executor-and-hard-fallback',
                context: String(input.context || 'normal'),
                fallback: true,
                fallbackReason: 'ts-normal-source-runtime-error',
                error: e && e.message ? e.message : String(e),
                candidateCount,
                ts: Date.now(),
            };
        }
        this._chargingNormalSourceTsLast = payload;
        this._chargingNormalSourceTsLockdownLast = payload;
        try {
            const runtimeSource = payload && payload.runtimeSource ? String(payload.runtimeSource) : 'javascript-hard-fallback';
            const normalSourceValue = runtimeSource === 'typescript' ? 'ts-normal-source' : 'javascript-hard-fallback';
            await this._queueState('chargingManagement.control.tsNormalSourceJson', JSON.stringify(payload || {}), true);
            await this._queueState('chargingManagement.control.tsNormalSourceLockdownJson', JSON.stringify(payload || {}), true);
            await this._queueState('chargingManagement.control.tsNormalSource', normalSourceValue, true);
            await this._queueState('chargingManagement.control.tsRuntimeSource', runtimeSource, true);
            await this._queueState('chargingManagement.control.tsMigrationReady', runtimeSource === 'typescript', true);
        } catch (_eNormalSource) {}
        try {
            await this._publishChargingEvcsJavascriptRemovalState(payload, input);
        } catch (_eRemovalState) {}
        return payload;
    }

    /** Code-Teil: _publishChargingEvcsJavascriptRemovalState – Veröffentlicht das finale TypeScript-Freigabe-Gate für den Abbau des */
    async _publishChargingEvcsJavascriptRemovalState(normalSourcePayload, input = {}) {
        const mirror = requireChargingNormalSourceTsMirror();
        let payload = null;
        try {
            const buildRemoval = mirror && (
                mirror.buildChargingEvcsJavascriptRemovalDecision
                || mirror.buildChargingJavascriptRemovalDecision
                || mirror.buildChargingTsFinalHandoverDecision
            );
            if (!buildRemoval) {
                payload = {
                    source: 'ts-charging-evcs-js-removal-ready-v1',
                    available: false,
                    ok: false,
                    productive: false,
                    readyForJavascriptRemoval: false,
                    readyForEvcsJsDecisionTreeRemoval: false,
                    readyForAdapterTsRuntime: false,
                    fallback: true,
                    fallbackReason: 'missing-ts-removal-mirror',
                    runtimeSource: 'javascript-hard-fallback',
                    jsRole: 'executor-and-hard-fallback',
                    blockers: ['missing-ts-removal-mirror'],
                    ts: Date.now(),
                };
            } else {
                payload = buildRemoval({
                    context: input.context || (normalSourcePayload && normalSourcePayload.context) || 'normal',
                    normalSource: normalSourcePayload || this._chargingNormalSourceTsLockdownLast || null,
                    allocation: input.allocation || this._chargingAllocationTsNormalSourceLast || this._chargingAllocationTsProductiveLast || null,
                    writePlan: input.writePlan || this._chargingWritePlanTsProductiveLast || null,
                    executor: input.executor || this._chargingWritePlanExecutorLast || null,
                    legacy: input.legacy || this._chargingLegacyDecisionTreeLast || null,
                    budget: input.budget || this._chargingBudgetTsProductiveLast || null,
                    control: input.control || this._chargingControlTsProductiveLast || null,
                    ts: Date.now(),
                });
            }
        } catch (e) {
            payload = {
                source: 'ts-charging-evcs-js-removal-ready-v1',
                available: false,
                ok: false,
                productive: false,
                readyForJavascriptRemoval: false,
                readyForEvcsJsDecisionTreeRemoval: false,
                readyForAdapterTsRuntime: false,
                fallback: true,
                fallbackReason: 'ts-removal-runtime-error',
                error: e && e.message ? e.message : String(e),
                runtimeSource: 'javascript-hard-fallback',
                jsRole: 'executor-and-hard-fallback',
                ts: Date.now(),
            };
        }

        this._chargingEvcsJsRemovalTsLast = payload;
        this._adapterTsRuntimeHandoverLast = payload;
        try {
            const ready = !!(payload && payload.readyForEvcsJsDecisionTreeRemoval);
            const adapterRuntimeSource = ready ? 'typescript-source-with-generated-js-runtime-boundary' : 'javascript-hard-fallback';
            await this._queueState('chargingManagement.control.tsEvcsJsRemovalJson', JSON.stringify(payload || {}), true);
            await this._queueState('chargingManagement.control.tsEvcsJsRemovalReady', ready, true);
            await this._queueState('chargingManagement.control.tsAdapterRuntimeHandoverJson', JSON.stringify(payload || {}), true);
            await this._queueState('chargingManagement.control.tsAdapterRuntimeSource', adapterRuntimeSource, true);
            await this._queueState('chargingManagement.control.tsAdapterMigrationReady', ready, true);
        } catch (_eRemoval) {}
        return payload;
    }

    /** Code-Teil: _publishChargingLegacyDecisionTreeState – Schreibt die kompakte EVCS-Handover-Diagnose für TS-Write-Plan, JS-Executor und JS-Fallback. */
    async _publishChargingLegacyDecisionTreeState(tsAllocationState, tsWritePlanProductive, tsWritePlanUsed, debugAlloc, context = 'normal', legacyFallbackReason = '') {
        const fallbackReason = tsWritePlanUsed ? '' : (legacyFallbackReason || (tsWritePlanProductive && tsWritePlanProductive.fallbackReason) || 'ts-write-plan-not-productive');
        const normalSourceDecision = tsAllocationState && tsAllocationState.normalSourceDecision ? tsAllocationState.normalSourceDecision : null;
        const tsAllocationNormalSource = !!(normalSourceDecision && normalSourceDecision.normalSource);
        const tsAllocationProductive = !!(tsAllocationState && tsAllocationState.productiveDecision && tsAllocationState.productiveDecision.productive);
        const tsNormalSourceActive = !!(tsAllocationNormalSource && tsWritePlanUsed);
        const diagnosticMismatchCount = normalSourceDecision && Number.isFinite(Number(normalSourceDecision.diagnosticMismatchCount)) ? Number(normalSourceDecision.diagnosticMismatchCount) : 0;
        const normalSourceLockdown = {
            source: 'ts-charging-normal-source-lockdown-v1',
            context: String(context || 'normal'),
            ok: tsNormalSourceActive,
            normalSourceActive: tsNormalSourceActive,
            tsAllocationNormalSource,
            tsAllocationProductive,
            tsWritePlanProductive: !!(tsWritePlanProductive && tsWritePlanProductive.productive),
            tsWritePlanUsed: !!tsWritePlanUsed,
            jsRole: tsWritePlanUsed ? 'executor-only' : 'hard-fallback-only',
            normalWritePath: tsNormalSourceActive ? 'ts-normal-source-write-plan-with-js-executor' : (tsWritePlanUsed ? 'ts-write-plan-with-js-executor' : 'js-hard-fallback'),
            jsComparisonMode: tsAllocationNormalSource ? 'diagnostic-only' : 'blocking-until-normal-source',
            diagnosticMismatchCount,
            fallbackReason,
            hardFallbackOnly: !tsWritePlanUsed,
            hardFallbackReasons: [
                'missing-ts-mirror',
                'missing-ts-allocation-mirror',
                'missing-ts-write-plan-mirror',
                'stale-meter',
                'stale-budget',
                'ts-runtime-error',
                'write-plan-not-productive',
                'invalid-apply-plan',
                'executor-error',
            ],
            removedFromNormalPath: [
                'direct-js-setpoint-write-loop',
                'direct-js-failsafe-write-loop',
                'direct-js-peak-rampdown-write-loop',
                'js-only-safety-stop-write-plan',
                'ts-js-allocation-mismatch-as-normal-path-blocker',
            ],
            ts: Date.now(),
        };
        const legacyDecisionTree = {
            // Kompatibilitätsmarker für ältere Checks: source: 'ts-charging-legacy-js-decision-tree-reduction-v4'
            source: 'ts-charging-legacy-js-decision-tree-reduction-v5',
            context: String(context || 'normal'),
            jsRole: tsWritePlanUsed ? 'executor-only' : 'executor-and-hard-fallback',
            normalWritePath: normalSourceLockdown.normalWritePath,
            tsAllocationProductive,
            tsAllocationNormalSource,
            tsNormalSourceActive,
            tsWritePlanProductive: !!(tsWritePlanProductive && tsWritePlanProductive.productive),
            tsAllocationSource: tsAllocationNormalSource ? 'ts-normal-source' : (tsAllocationProductive ? 'ts-allocation' : 'js-runtime-hard-fallback'),
            tsWritePlanSource: tsWritePlanUsed ? 'ts-write-plan' : 'js-runtime-hard-fallback',
            fallbackReason,
            directSetpointLoopsRemoved: true,
            normalSourceLockdownViaTs: true,
            jsComparisonDiagnosticOnly: tsAllocationNormalSource,
            safetyStopHandoverViaTsWritePlan: true,
            staleMeterSafeStopCanUseTsPlan: true,
            peakRampdownSafeStopCanUseTsPlan: true,
            executorOnlySetpointWriter: '_executeChargingSetpointEntries',
            removedFromNormalPath: normalSourceLockdown.removedFromNormalPath,
            retainedAsHardFallback: normalSourceLockdown.hardFallbackReasons,
            diagnosticMismatchCount,
            normalSourceLockdown,
            candidateCount: Array.isArray(debugAlloc) ? debugAlloc.filter(a => a && typeof a === 'object' && a.type !== 'budget').length : 0,
            ts: Date.now(),
        };
        this._chargingLegacyDecisionTreeLast = legacyDecisionTree;
        this._chargingNormalSourceLockdownLast = normalSourceLockdown;
        try {
            await this._queueState('chargingManagement.control.tsLegacyDecisionTreeJson', JSON.stringify(legacyDecisionTree), true);
            await this._queueState('chargingManagement.control.tsNormalSourceLockdownJson', JSON.stringify(normalSourceLockdown), true);
            await this._queueState('chargingManagement.control.tsNormalSourceJson', JSON.stringify(normalSourceLockdown), true);
            await this._queueState('chargingManagement.control.tsNormalSource', normalSourceLockdown.normalSourceActive ? 'ts-normal-source' : (normalSourceLockdown.hardFallbackOnly ? 'hard-fallback-only' : 'ts-write-plan'), true);
        } catch (_eLegacyDecision) {}
        try {
            const safetyStopContext = String(context || '').includes('safety') || String(context || '').includes('rampdown');
            const tsNormalSource = await this._publishChargingTsNormalSourceState(context, tsAllocationState, tsWritePlanProductive, tsWritePlanUsed, legacyFallbackReason, safetyStopContext);
            if (tsNormalSource && typeof tsNormalSource === 'object') {
                legacyDecisionTree.normalSourceLockdown = tsNormalSource;
                legacyDecisionTree.tsNormalSourceActive = tsNormalSource.runtimeSource === 'typescript';
                legacyDecisionTree.tsNormalSourceReadyForJsRemoval = tsNormalSource.runtimeSource === 'typescript';
                await this._queueState('chargingManagement.control.tsLegacyDecisionTreeJson', JSON.stringify(legacyDecisionTree), true);
            }
        } catch (_eNormalSourceLockdown) {}
        return legacyDecisionTree;
    }

    /** Code-Teil: _publishChargingTsNormalSourceState – Verdichtet den EVCS-Handover zu einem TS-Normalquellen-Status. */
    async _publishChargingTsNormalSourceState(context, tsAllocationState, tsWritePlanProductive, tsWritePlanUsed, legacyFallbackReason = '', safetyStop = false) {
        const mirror = requireChargingNormalSourceTsMirror();
        let payload = null;
        try {
            const allocationProductive = tsAllocationState && tsAllocationState.productiveDecision
                ? tsAllocationState.productiveDecision
                : (this._chargingAllocationTsProductiveLast || null);
            const buildNormalSource = mirror && (
                mirror.buildChargingNormalSourceDecision
                || mirror.buildChargingNormalSourceLockdown
                || mirror.buildChargingTsNormalSourceLockdown
            );
            if (!buildNormalSource) {
                payload = {
                    source: 'ts-charging-normal-source-lockdown-v1',
                    available: false,
                    ok: false,
                    productive: false,
                    tsNormalSource: false,
                    runtimeSource: 'javascript-hard-fallback',
                    normalSource: 'javascript-hard-fallback',
                    fallback: true,
                    fallbackReason: 'missing-ts-normal-source-mirror',
                    context: String(context || 'normal'),
                    ts: Date.now(),
                };
            } else {
                const allocationNormalSource = tsAllocationState && tsAllocationState.normalSourceDecision
                    ? tsAllocationState.normalSourceDecision
                    : null;
                payload = buildNormalSource({
                    context,
                    control: this._chargingControlTsProductiveLast || null,
                    budget: this._chargingBudgetTsProductiveLast || null,
                    allocation: allocationNormalSource || allocationProductive || null,
                    writePlan: tsWritePlanProductive || this._chargingWritePlanTsProductiveLast || null,
                    executor: this._chargingWritePlanExecutorLast || null,
                    legacy: this._chargingLegacyDecisionTreeLast || null,
                    tsWritePlanUsed: !!tsWritePlanUsed,
                    fallbackReason: legacyFallbackReason || '',
                    safetyStop: !!safetyStop,
                    ts: Date.now(),
                });
            }
        } catch (e) {
            payload = {
                source: 'ts-charging-normal-source-lockdown-v1',
                available: false,
                ok: false,
                productive: false,
                tsNormalSource: false,
                runtimeSource: 'javascript-hard-fallback',
                normalSource: 'javascript-hard-fallback',
                fallback: true,
                fallbackReason: 'ts-runtime-error',
                error: e && e.message ? e.message : String(e),
                context: String(context || 'normal'),
                ts: Date.now(),
            };
        }
        this._chargingTsNormalSourceLast = payload;
        this._chargingNormalSourceTsLockdownLast = payload;
        try {
            const runtimeSource = payload && payload.runtimeSource ? String(payload.runtimeSource) : 'javascript-hard-fallback';
            const normalSourceValue = runtimeSource === 'typescript' ? 'ts-normal-source' : 'js-hard-fallback';
            await this._queueState('chargingManagement.control.tsNormalSourceJson', JSON.stringify(payload || {}), true);
            await this._queueState('chargingManagement.control.tsNormalSourceLockdownJson', JSON.stringify(payload || {}), true);
            await this._queueState('chargingManagement.control.tsNormalSource', normalSourceValue, true);
            await this._queueState('chargingManagement.control.tsRuntimeSource', runtimeSource, true);
            await this._queueState('chargingManagement.control.tsMigrationReady', runtimeSource === 'typescript', true);
        } catch (_eNormalSource) {}
        try {
            await this._publishChargingEvcsJavascriptRemovalState(payload, {
                context: String(context || 'normal'),
                control: this._chargingControlTsProductiveLast || null,
                budget: this._chargingBudgetTsProductiveLast || null,
                allocation: (tsAllocationState && (tsAllocationState.normalSourceDecision || tsAllocationState.productiveDecision))
                    || this._chargingAllocationTsNormalSourceLast
                    || this._chargingAllocationTsProductiveLast
                    || null,
                writePlan: tsWritePlanProductive || this._chargingWritePlanTsProductiveLast || null,
                executor: this._chargingWritePlanExecutorLast || null,
                legacy: this._chargingLegacyDecisionTreeLast || null,
                safetyStop: !!safetyStop,
            });
        } catch (_eRemovalState) {}
        return payload;
    }

    /**
     * Nulleinspeisung: gemessenen Speicheranteil vor Allokation UND Writer erneut
     * bestimmen (W, maximal 5 s alt). Haus/andere Verbraucher erhalten Vorrang.
     * Das gemeinsame Pool-Budget wird einmal nach vorhandener LP-Istlast verteilt;
     * ein stoppender LP behält seinen Anteil bis zum nächsten Messzyklus. Keine
     * Übertragung seiner noch physisch aufgenommenen Energie an einen zweiten LP.
     */
    _zeroExportStoragePoolW(proof) {
        const a = this.adapter;
        const now = Date.now();
        const cfg = a?.config?.chargingManagement || {};
        if (!proof || cfg.storageAssistEnabled !== true || !readZeroExportMode(a).active
            || proof.sample !== a?._zeroExportPvCoordinator?.sample || proof.budget !== a?._emsBudget) return 0;
        const value = id => a?.stateCache?.[id]?.value;
        const topology = value('speicher.regelung.topologie');
        if (topology !== proof.topology || value('chargingManagement.control.dischargeAllowed') === false
            || (this.dp?.getEntry?.('cm.dischargeAllowed') && this.dp.getBoolean('cm.dischargeAllowed', true) === false)) return 0;
        const stopSoc = Number(cfg.storageAssistStopSocPct ?? 40);
        const soc = topology === 'farm' ? value('storageFarm.totalSocOnline') : this.dp?.getNumberFresh('st.socPct', 5000, null);
        if (soc === null || !Number.isFinite(Number(soc)) || Number(soc) <= stopSoc) return 0;
        if (topology === 'farm') {
            const age = now - Number(a?.stateCache?.['storageFarm.totalSocOnline']?.ts);
            if (!Number.isFinite(age) || age < 0 || age > 5000) return 0;
        }
        let eligibleActualW = 0;
        let eligibleMetersFresh = true;
        for (const w of proof.points) {
            const currentConfig = (Array.isArray(cfg.wallboxes) ? cfg.wallboxes : []).find(row => toSafeIdPart(String(row?.key || '').trim()) === w.safe);
            const currentMode = value(`${w.ch}.userMode`);
            const key = `cm.wb.${w.safe}.pW`;
            const age = this.dp?.getMeasurementAgeMs?.(key) ?? this.dp?.getAgeMs?.(key);
            const actual = this.dp?.getNumberFresh(key, 5000, null);
            if (currentConfig?.storageAssistCustomerAllowed !== true || currentConfig.enabled === false
                || (cfg.storageAssistApply !== 'boostAndAuto' && w.effectiveMode !== 'boost')
                || (currentMode !== undefined && normalizeWallboxModeOverride(currentMode) !== normalizeWallboxModeOverride(w.userMode))
                || value(`${w.ch}.userStorageAssistEnabled`) !== true || !Number.isFinite(age) || age < 0 || age > 5000
                || actual === null || !Number.isFinite(Number(actual))) { eligibleMetersFresh = false; break; }
            // Neue Last darf eine alte Zuteilung nicht nachträglich vergrößern.
            eligibleActualW += Math.min(w.actualPowerW, Math.max(0, Number(actual)));
        }
        const raw = a?._emsBudget?.raw || {};
        const reservations = a?._emsBudget?.consumers || {};
        const reservedW = entry => Number(entry?.usedW ?? entry?.reserveW ?? 0);
        const seen = new Set([...proof.points, ...proof.otherPoints].map(w => {
            const entry = this.dp?.getEntry?.(`cm.wb.${w.safe}.pW`);
            return entry?.srcObjectId || entry?.objectId;
        }).filter(Boolean));
        // Summary-"Actual" darf ein veröffentlichter Sollwert sein. Ausschließlich
        // direkte frische Leistungsmessungen vermindern fremde Reservierungen.
        const thermalActualW = measuredFlexibleLoadW(a, this.dp, 'thermal', seen, now);
        const rodActualW = measuredFlexibleLoadW(a, this.dp, 'heatingRod', seen, now);
        let pendingOtherW = Math.max(0, Math.max(Number(raw.thermalUsedW || 0), reservedW(reservations.thermal)) - thermalActualW)
            + Math.max(0, Math.max(Number(raw.heatingRodUsedW || 0), reservedW(reservations.heatingRod)) - rodActualW);
        // Unbekannte Consumer-Reservierungen besitzen keinen bewiesenen Istanteil.
        // Core kann actualW aus usedW vorbelegen; das ist keine Messbestätigung.
        for (const [key, entry] of Object.entries(reservations)) {
            const reserved = reservedW(entry);
            if (!Number.isFinite(reserved) || reserved < 0) return 0;
            if (!['evcs', 'thermal', 'heatingRod'].includes(key)) pendingOtherW += reserved;
        }
        for (const w of proof.otherPoints) {
            const key = `cm.wb.${w.safe}.pW`;
            const age = this.dp?.getMeasurementAgeMs?.(key) ?? this.dp?.getAgeMs?.(key);
            const actual = this.dp?.getNumberFresh(key, 5000, null);
            const actualFresh = Number.isFinite(age) && age >= 0 && age <= 5000 && actual !== null && Number.isFinite(Number(actual));
            // Ein alter hoher Istwert darf eine neue Sollwertreservierung nicht
            // auslöschen. Ohne Messnachweis wird der gesamte letzte Befehl reserviert.
            pendingOtherW += Math.max(0, Number(this._lastCmdTargetW?.get(w.safe) || 0) - (actualFresh ? Math.max(0, Number(actual)) : 0));
        }
        return resolveZeroExportStorageCredit(a, {
            now, acceptedW: Math.min(proof.requestedW, Math.max(0, Number(value('speicher.regelung.evcsAssistAcceptedW')) || 0)),
            acceptedTs: value('speicher.regelung.evcsAssistAcceptedTs'),
            commandEffective: value('speicher.regelung.commandEffective') === true,
            acceptedTopology: value('speicher.regelung.evcsAssistAcceptedTopology'), requestedTopology: topology,
            acceptedSource: value('speicher.regelung.evcsAssistAcceptedSource'),
            eligibleActualW, eligibleMetersFresh, pendingOtherW,
        });
    }

    /** Code-Teil: _executeChargingSetpointEntries – Führt einen bereits berechneten Setpoint-Plan aus. Die fachliche Zielentscheidung */
    async _executeChargingSetpointEntries(entries, wbList, debugAlloc, executorSource, fallbackReason = '') {
        const result = {
            source: executorSource || 'unknown',
            fallbackReason: fallbackReason || '',
            ok: true,
            executorRole: executorSource === 'ts-write-plan' ? 'javascript-executor-for-ts-plan' : 'javascript-hard-fallback',
            usesTsEntryBasis: executorSource === 'ts-write-plan',
            fallbackOnExecutorError: true,
            appliedCount: 0,
            skippedCount: 0,
            failedCount: 0,
            safetyClampedCount: 0,
            safetyBlockedCount: 0,
            entries: [],
            ts: Date.now(),
        };
        const bySafe = new Map();
        for (const w of Array.isArray(wbList) ? wbList : []) {
            if (w && w.safe) bySafe.set(String(w.safe), w);
        }
        const debugBySafe = new Map();
        for (const item of Array.isArray(debugAlloc) ? debugAlloc : []) {
            if (item && typeof item === 'object' && item.safe) debugBySafe.set(String(item.safe), item);
        }
        const plannedEntries = Array.isArray(entries) ? entries : [];
        const stationTargetsW = new Map();
        for (const entry of plannedEntries) {
            const safe = String(entry && entry.safe ? entry.safe : '').trim();
            if (!safe) continue;
            const w = bySafe.get(safe);
            if (!w) {
                result.skippedCount += 1;
                result.entries.push({ safe, status: 'missing-wallbox', applied: false });
                continue;
            }
            const targetWNum = Number(entry.targetPowerW ?? entry.targetW ?? 0);
            const targetANum = Number(entry.targetCurrentA ?? entry.targetA ?? 0);
            const requestedTargetW = Number.isFinite(targetWNum) && targetWNum > 0 ? Math.round(targetWNum) : 0;
            const requestedTargetA = Number.isFinite(targetANum) && targetANum > 0 ? Number(targetANum) : 0;
            // Die absolute Frist alleine genügt nicht: Ein späterer Verbraucher
            // oder eine neue Sicherheitsmessung kann dieselbe Lease widerrufen.
            // Direkt am Writer deshalb Identität UND aktuellen zentralen Zustand
            // prüfen; ein ungültiger Suchplan fällt sicher auf 0 zurück.
            const zeroProbeExpired = (Number(w.zeroExportProbeExtraW) > 0 || w.zeroExportPhaseProbe === true)
                && (!(Number(w.zeroExportProbeValidUntil) > Date.now())
                    || !isZeroExportGrantValid(this.adapter, `evcs:${safe}`, String(w.zeroExportProbeLeaseId || ''), Date.now()));
            const positiveCommandBlocked = (requestedTargetW > 0 || requestedTargetA > 0)
                && (w.controlAvailable !== true || zeroProbeExpired
                    || ((normalizeWallboxModeOverride(w.effectiveMode) === 'pv' || w.zeroExportPvDependent === true)
                        && zeroExportEvcsPauseUntil(this.adapter, `evcs:${safe}`, Date.now()) > Date.now()));
            let targetW = positiveCommandBlocked ? 0 : requestedTargetW;
            let targetA = positiveCommandBlocked ? 0 : requestedTargetA;
            const rawEntryBasis = String(entry.basis || entry.controlBasis || w.controlBasis || '').trim().toLowerCase();
            const plannedBasis = (rawEntryBasis === 'current' || rawEntryBasis === 'currenta' || rawEntryBasis === 'current_a' || rawEntryBasis === 'a' || rawEntryBasis === 'amp' || rawEntryBasis === 'amps')
                ? 'currentA'
                : ((rawEntryBasis === 'power' || rawEntryBasis === 'powerw' || rawEntryBasis === 'w' || rawEntryBasis === 'watt' || rawEntryBasis === 'watts') ? 'powerW' : (w.controlBasis || 'auto'));
            const plannedSetpointKey = String(entry.setpointKey || '').trim();
            const isPhaseSwitchEntry = String(entry.type || '').trim() === 'phaseSwitch' || rawEntryBasis === 'phase' || rawEntryBasis === 'phasemode';
            const isDc = String(w.chargerType || '').toUpperCase() === 'DC';
            const phaseCount = Math.max(1, Math.min(3, Math.round(Number(isDc
                ? (w.gridPhaseCount || w.configuredPhaseCount || 3)
                : (entry.targetPhaseCount || w.phases || 3)) || 3)));
            const voltageV = Math.max(200, Math.min(260, Number(this.adapter?.config?.chargingManagement?.nominalVoltageV || 230) || 230));
            const dcOutputCurrent = isDc && plannedBasis === 'currentA' && w.dcCurrentReference === 'dc-output';
            const dcVoltageAge = dcOutputCurrent && w.dcVoltageKey && this.dp ? this.dp.getAgeMs(w.dcVoltageKey) : Infinity;
            const dcVoltageNow = dcOutputCurrent && w.dcVoltageKey && this.dp ? this.dp.getNumber(w.dcVoltageKey, null) : null;
            const dcVoltageInvalid = dcOutputCurrent && !(Number.isFinite(dcVoltageNow) && dcVoltageNow >= 50 && dcVoltageNow <= 1500 && Number.isFinite(dcVoltageAge) && dcVoltageAge <= 10000);
            const currentReferenceInvalid = isDc && plannedBasis === 'currentA' && !['ac-input', 'dc-output'].includes(w.dcCurrentReference);
            const controlFactorWPerA = dcOutputCurrent ? (dcVoltageInvalid ? 0 : dcVoltageNow) : voltageV * phaseCount;
            let requestedFlexibleW = isDc ? requestedTargetW : Math.max(
                requestedTargetW,
                requestedTargetA > 0 ? Math.round(requestedTargetA * controlFactorWPerA) : 0,
            );
            if (dcVoltageInvalid || currentReferenceInvalid) { targetW = 0; targetA = 0; requestedFlexibleW = 0; }

            let rc85Decision = null;
            const diagnosticRow = debugBySafe.get(safe) || {};
            const decisionReason = String(entry.reason || diagnosticRow.reason || fallbackReason || 'normal');
            const userMode = String(w.userMode || diagnosticRow.userMode || '').trim().toLowerCase();
            // RC86_AUTO_ONLY_SOFT_GUARD: Economic debounce and soft ramps are
            // deliberately limited to Auto. Explicit Boost/PV/Min+PV/manual modes
            // must never be silently ramped down; final hard safety still applies.
            const softAutoGuardEligible = userMode === 'auto';
            if (!isPhaseSwitchEntry && this._rc85EvcsDecisionGuard && softAutoGuardEligible) {
                const immediateStopRequired = !!(
                    positiveCommandBlocked
                    || dcVoltageInvalid || currentReferenceInvalid
                    || w.online !== true
                    || w.faultActive === true
                    || w.unavailableActive === true
                    || w.operationalBlocked === true
                    || w.userStationEnabled === false
                    || w.userEnabled === false
                    || w.rfidLockActive === true
                    || (w.vehiclePlugged === false && userMode !== 'boost')
                    || rc85IsHardReason(decisionReason)
                );
                const priceUpdatePending = /(?:tarif|tariff|price|preis|strompreis).*(?:pending|update|refresh|loading|recalc|aktual|wechsel)|(?:pending|update|refresh|loading|recalc|aktual|wechsel).*(?:tarif|tariff|price|preis|strompreis)/i.test(decisionReason);
                const minActiveW = Math.max(
                    0,
                    Number(w.minPW) || 0,
                    plannedBasis === 'currentA' && Number(w.minA) > 0 ? Number(w.minA) * controlFactorWPerA : 0,
                );
                rc85Decision = this._rc85EvcsDecisionGuard.evaluate({
                    key: safe,
                    requested: requestedFlexibleW,
                    reason: decisionReason,
                    unit: 'W',
                    hardSafety: immediateStopRequired,
                    priceUpdatePending,
                    minActive: minActiveW,
                    minRunMs: Math.max(0, Number(this.adapter?.config?.chargingManagement?.minimumRunSec ?? 120) * 1000),
                    minPauseMs: Math.max(0, Number(this.adapter?.config?.chargingManagement?.minimumPauseSec ?? 30) * 1000),
                    economicDebounceMs: Math.max(0, Number(this.adapter?.config?.chargingManagement?.economicDebounceSec ?? 25) * 1000),
                    rampUpPerStep: Math.max(minActiveW, Number(this.adapter?.config?.chargingManagement?.maxDeltaWPerTick) || 4600),
                    rampDownPerStep: Math.max(minActiveW, Number(this.adapter?.config?.chargingManagement?.maxDeltaDownWPerTick) || 6900),
                });
                requestedFlexibleW = Math.max(0, Number(rc85Decision.approved) || 0);
                if (plannedBasis === 'currentA') {
                    const stepA = Number.isFinite(Number(w.stepA)) && Number(w.stepA) > 0 ? Number(w.stepA) : 0.1;
                    const minA = Number.isFinite(Number(w.minA)) && Number(w.minA) > 0 ? Number(w.minA) : 0;
                    const maxA = Number.isFinite(Number(w.maxA)) && Number(w.maxA) > 0 ? Number(w.maxA) : Number.POSITIVE_INFINITY;
                    targetA = Math.max(0, Math.min(maxA, Math.floor(((requestedFlexibleW / Math.max(1, controlFactorWPerA)) + 1e-9) / stepA) * stepA));
                    if (targetA > 0 && targetA + 1e-9 < minA) targetA = 0;
                    targetW = targetA > 0 ? Math.floor(targetA * controlFactorWPerA) : 0;
                    requestedFlexibleW = targetW;
                } else {
                    const stepW = Number.isFinite(Number(w.stepW)) && Number(w.stepW) > 0 ? Number(w.stepW) : 1;
                    const minPW = Number.isFinite(Number(w.minPW)) && Number(w.minPW) > 0 ? Number(w.minPW) : 0;
                    const maxPW = Number.isFinite(Number(w.maxPW)) && Number(w.maxPW) > 0 ? Number(w.maxPW) : Number.POSITIVE_INFINITY;
                    targetW = Math.max(0, Math.min(maxPW, Math.floor((requestedFlexibleW + 1e-9) / stepW) * stepW));
                    if (targetW > 0 && targetW + 1e-9 < minPW) targetW = 0;
                    targetA = !isDc && targetW > 0 ? targetW / Math.max(1, controlFactorWPerA) : 0;
                    requestedFlexibleW = targetW;
                }
            }
            let liveEnvelope = null;
            try {
                if (this.adapter && (this.adapter._nwSafetyEnvelopeRequired === true || this.adapter._emsSafetyCycle)) {
                    liveEnvelope = liveSafetyEnvelope(this.adapter, this.dp, {
                        now: Date.now(),
                        generation: this.adapter?._emsSafetyCycle?.generation,
                    });
                }
            } catch (error) {
                liveEnvelope = invalidateSafetyEnvelope(this.adapter, `evcs-live-safety-build-failed:${safe}:${String(error && error.message || error)}`, {
                    generation: this.adapter?._emsSafetyCycle?.generation,
                    now: Date.now(),
                    emergencyStop: true,
                });
            }

            const stationKey = String(entry.stationKey || w.stationKey || '').trim();
            const stationCapCandidates = [entry.stationMaxPowerW, w.stationMaxPowerW]
                .map((value) => Number(value))
                .filter((value) => Number.isFinite(value) && value > 0);
            const stationCapW = stationCapCandidates.length ? Math.min(...stationCapCandidates) : null;
            const stationUsedW = stationKey ? Math.max(0, Number(stationTargetsW.get(stationKey)) || 0) : 0;
            const stationRemainingW = stationCapW === null ? null : Math.max(0, stationCapW - stationUsedW);
            // Eine optionale Stationsgrenze darf nur dann begrenzen, wenn sie
            // tatsächlich vorhanden ist. `Number(null) === 0` hatte zuvor einzelne
            // Wallboxen ohne Stationszuordnung fälschlich als 0-W-Gerätegrenze
            // behandelt. Eine echte berechnete Restleistung von 0 W bleibt dagegen
            // weiterhin ein harter Stationsstopp.
            // Netzanteil + FINAL zugeordnete PV erneut vor dem Writer prüfen.
            // Die Auto-Mindestlaufzeit darf weder verlorenes PV ersetzen noch
            // einen begrenzten Netzanteil erhöhen. Bei geändertem Core-Snapshot
            // erlischt die alte PV-Zuteilung bis zum nächsten Allokationszyklus.
            const zeroGridLimited = typeof w.zeroExportGridMaxW === 'number';
            const gridShareBaseW = normalizeWallboxModeOverride(w.effectiveMode) === 'pv'
                ? Math.min(w.zeroExportGridMaxW ?? Infinity, Number(w.zeroExportProbeExtraW) || 0)
                : normalizeWallboxModeOverride(w.effectiveMode) === 'minpv'
                    ? Math.min(w.zeroExportGridMaxW ?? Infinity, zeroExportStorageMinimumW(w)) : w.zeroExportGridMaxW;
            const livePvCreditW = () => w.zeroExportPvSourceSample === this.adapter?._zeroExportPvCoordinator?.sample
                && w.zeroExportPvSourceBudget === this.adapter?._emsBudget
                ? confirmedZeroExportPvW(this.adapter, Number(w.zeroExportPvCreditW) || 0, Date.now()) : 0;
            const liveStorageCreditW = () => Math.min(Number(w.zeroExportStorageCreditW) || 0,
                this._zeroExportStoragePoolW(w.zeroExportStorageProof) * (Number(w.zeroExportStorageFraction) || 0));
            const zeroWriteCapW = zeroGridLimited ? Math.min(requestedTargetW, gridShareBaseW + livePvCreditW() + liveStorageCreditW()) : null;
            const deviceCaps = [w.maxPW, stationRemainingW, zeroWriteCapW]
                .filter((value) => value !== null && value !== undefined && !(typeof value === 'string' && value.trim() === ''))
                .map((value) => Number(value))
                .filter((value) => Number.isFinite(value) && value >= 0);
            const finalDeviceCapW = deviceCaps.length ? Math.min(...deviceCaps) : null;

            const currentActualW = (!w.meterStale && Number.isFinite(Number(w.actualPowerW)))
                ? Math.max(0, Math.abs(Number(w.actualPowerW)))
                : 0;
            const previousCommandForSafetyW = this._lastCmdTargetW && typeof this._lastCmdTargetW.get === 'function'
                ? Math.max(0, Number(this._lastCmdTargetW.get(w.safe)) || 0)
                : 0;
            const safetyEnvelopeRequired = !!(this.adapter && (
                this.adapter._nwSafetyEnvelopeRequired === true
                || this.adapter._emsSafetyCycle
                || this.adapter.emsEngine
            ));
            const safetyEnvelopeBlocked = !!(
                safetyEnvelopeRequired
                && (!liveEnvelope || liveEnvelope.valid !== true || liveEnvelope.forceZero === true || liveEnvelope.emergencyStop === true)
            );
            const safetyStopExisting = !!(
                !isPhaseSwitchEntry
                && safetyEnvelopeBlocked
                && (requestedFlexibleW > 0 || currentActualW > 0.5 || previousCommandForSafetyW > 0.5)
            );

            let safetyDecision = null;
            if (!isPhaseSwitchEntry) {
                safetyDecision = evaluateFlexibleLoadRequest(this.adapter, {
                    key: `evcs:${safe}`,
                    app: 'evcs',
                    deviceKey: safe,
                    requestedW: positiveCommandBlocked ? 0 : requestedFlexibleW,
                    currentActualW,
                    currentActualFresh: !w.meterStale,
                    phaseCount,
                    voltageV,
                    deviceCapW: finalDeviceCapW,
                    now: Date.now(),
                });
                const safeTarget = safetyTargetFromPowerDecision(
                    { targetW, targetA, basis: plannedBasis },
                    safetyDecision,
                    { phaseCount, voltageV },
                );
                targetW = Math.max(0, Math.floor(Number(safeTarget.targetW) || 0));
                targetA = Math.max(0, Number(safeTarget.targetA) || 0);

                // Die Gerätequantisierung darf den freigegebenen Safety-Cap niemals
                // durch Aufrunden überschreiten. Deshalb wird am finalen Writer immer
                // nach unten auf den konfigurierten Schritt gerundet.
                if (plannedBasis === 'currentA') {
                    const stepA = Number.isFinite(Number(w.stepA)) && Number(w.stepA) > 0 ? Number(w.stepA) : 0.1;
                    const maxA = Number.isFinite(Number(w.maxA)) && Number(w.maxA) > 0 ? Number(w.maxA) : Number.POSITIVE_INFINITY;
                    const minA = Number.isFinite(Number(w.minA)) && Number(w.minA) > 0 ? Number(w.minA) : 0;
                    const allowedA = Math.min(maxA, targetW > 0 ? targetW / Math.max(1, controlFactorWPerA) : 0);
                    targetA = Math.max(0, Math.floor((allowedA + 1e-9) / stepA) * stepA);
                    if (targetA > 0 && targetA + 1e-9 < minA) targetA = 0;
                    targetW = targetA > 0 ? Math.min(targetW, Math.floor(targetA * controlFactorWPerA)) : 0;
                } else {
                    const stepW = Number.isFinite(Number(w.stepW)) && Number(w.stepW) > 0 ? Number(w.stepW) : 1;
                    const maxPW = Number.isFinite(Number(w.maxPW)) && Number(w.maxPW) > 0 ? Number(w.maxPW) : Number.POSITIVE_INFINITY;
                    const minPW = Number.isFinite(Number(w.minPW)) && Number(w.minPW) > 0 ? Number(w.minPW) : 0;
                    targetW = Math.max(0, Math.min(maxPW, Math.floor((targetW + 1e-9) / stepW) * stepW));
                    if (targetW > 0 && targetW + 1e-9 < minPW) targetW = 0;
                    targetA = !isDc && targetW > 0 ? targetW / Math.max(1, controlFactorWPerA) : 0;
                }

                if (safetyStopExisting) {
                    targetW = 0;
                    targetA = 0;
                }
                const quantizedDeltaW = Math.max(0, targetW - currentActualW);
                safetyDecision = {
                    ...safetyDecision,
                    allowedW: targetW,
                    blocked: targetW <= 0 && (requestedFlexibleW > 0 || safetyStopExisting),
                    clamped: targetW < requestedFlexibleW || safetyStopExisting,
                    forceZero: safetyStopExisting || (targetW <= 0 && requestedFlexibleW > 0),
                    reason: safetyStopExisting
                        ? String((liveEnvelope && liveEnvelope.invalidReason) || 'safety-stop-existing-load')
                        : (targetW < requestedFlexibleW
                            ? (targetW <= 0 ? String(safetyDecision.reason || 'safety-safe-stop') : `${String(safetyDecision.reason || 'safety-approved')}:quantized`)
                            : String(safetyDecision.reason || 'safety-approved')),
                    reservation: {
                        targetW,
                        deltaW: quantizedDeltaW,
                        phaseDeltaW: liveEnvelope && liveEnvelope.phase && liveEnvelope.phase.required === true ? quantizedDeltaW : 0,
                        app: 'evcs',
                    },
                };
                if (safetyDecision.clamped) result.safetyClampedCount += 1;
                if (safetyDecision.blocked) result.safetyBlockedCount += 1;
            }
            const safetyCommandBlocked = !!(
                !isPhaseSwitchEntry
                && safetyDecision
                && requestedFlexibleW > 0
                && safetyDecision.allowedW <= 0
            );
            // Ein veralteter positiver Plan muss auch dann aktiv auf 0 geschrieben
            // werden, wenn der alte Plan selbst keinen Write mehr vorgesehen hatte.
            const baseWriteRequired = !!(
                (entry.writeRequired !== false && !entry.blocked)
                || safetyStopExisting
                || (safetyDecision && safetyDecision.clamped === true && requestedFlexibleW > 0)
            );
            const safeStopAllowed = !!(w.online && (!w.cfgEnabled || !w.userStationEnabled || !w.userEnabled || w.rfidLockActive || w.operationalBlocked || w.enabled || w.cfgEnabled));
            const phaseSwitchSafetyReady = !isPhaseSwitchEntry || (!zeroProbeExpired
                && (!liveEnvelope || (liveEnvelope.valid === true && liveEnvelope.forceZero !== true && liveEnvelope.emergencyStop !== true)));
            const shouldWrite = !!(
                baseWriteRequired
                && w.online
                && phaseSwitchSafetyReady
                && (isPhaseSwitchEntry ? w.controlAvailable === true : (w.controlAvailable === true || (targetW <= 0 && targetA <= 0 && safeStopAllowed)))
            );
            let applied = false;
            let hardwareConfirmed = isPhaseSwitchEntry ? false : w.telemetryProfile !== 'ocpp-1.6-event-driven';
            let hardwareCommandState = isPhaseSwitchEntry ? 'phase-switch' : (w.telemetryProfile === 'ocpp-1.6-event-driven' ? 'pending' : 'not-applicable');
            let hardwareCommandAgeMs = 0;
            let hardwareCommandFailure = false;
            let applyStatus = dcVoltageInvalid || currentReferenceInvalid ? 'dc-current-reference-unavailable-safe-stop' : positiveCommandBlocked
                ? (w.faultActive ? 'fault-safe-stop' : (w.unavailableActive ? 'unavailable-safe-stop' : 'blocked-safe-stop'))
                : (safetyCommandBlocked
                    ? String(safetyDecision.reason || 'safety-safe-stop')
                    : (safetyDecision && safetyDecision.clamped
                        ? String(safetyDecision.reason || 'safety-clamped')
                        : (shouldWrite ? 'planned' : (entry && entry.reason ? String(entry.reason) : 'skipped'))));
            let applyWrites = null;
            if (isPhaseSwitchEntry) {
                const phaseValue = entry ? entry.targetValue : undefined;
                if (!phaseSwitchSafetyReady) applyStatus = String((liveEnvelope && liveEnvelope.invalidReason) || 'phase-switch-safety-blocked');
                if (!shouldWrite) {
                    result.skippedCount += 1;
                } else if (!this.dp || !plannedSetpointKey || !(this.dp.getEntry && this.dp.getEntry(plannedSetpointKey))) {
                    applyStatus = 'missing-phase-switch-setpoint';
                    result.failedCount += 1;
                    result.ok = false;
                } else {
                    try {
                        const writeOutcome = await rc85RunIsolatedResult(
                            `evcs-write:${safe}:phase`,
                            5000,
                            async () => {
                                if (w.zeroExportPhaseProbe === true && !isZeroExportGrantValid(
                                    this.adapter, `evcs:${safe}`, String(w.zeroExportProbeLeaseId || ''), Date.now())) return false;
                                let writeResult = false;
                                if (typeof phaseValue === 'boolean' && this.dp.writeBoolean) {
                                    writeResult = await this.dp.writeBoolean(plannedSetpointKey, phaseValue, false);
                                } else {
                                    const n = Number(phaseValue);
                                    if (Number.isFinite(n) && this.dp.writeNumber) {
                                        writeResult = await this.dp.writeNumber(plannedSetpointKey, n, false);
                                    } else {
                                        const dpEntry = this.dp.getEntry(plannedSetpointKey);
                                        const directResult = await this.adapter.setForeignStateAsync(dpEntry.objectId, phaseValue, false);
                                        writeResult = !(directResult && directResult.__nexowattActuatorAuthorityBlocked === true);
                                        if (writeResult && this.dp.lastWriteByObjectId && typeof this.dp.lastWriteByObjectId.set === 'function') {
                                            this.dp.lastWriteByObjectId.set(dpEntry.objectId, { val: phaseValue, ts: Date.now() });
                                        }
                                    }
                                }
                                return writeResult;
                            },
                            this.adapter?.log || console,
                        );
                        if (!writeOutcome.ok) throw writeOutcome.error || new Error('phase-switch-write-timeout');
                        applied = writeOutcome.value !== false;
                        applyStatus = applied ? 'phase-switch-applied' : 'phase-switch-write-skipped';
                        applyWrites = [{ key: plannedSetpointKey, value: phaseValue, basis: 'phase' }];
                        if (applied) {
                            result.appliedCount += 1;
                            const targetPhase = Number(entry.targetPhaseCount || 0);
                            if (targetPhase === 1 || targetPhase === 3) {
                                if (this._chargingPhaseAssumedBySafe && typeof this._chargingPhaseAssumedBySafe.set === 'function') this._chargingPhaseAssumedBySafe.set(w.safe, targetPhase);
                                const cooldownMs = Number(w.phaseSwitchCooldownMs || 15 * 60 * 1000);
                                const settleMs = Number(w.phaseSwitchSettleMs || 30 * 1000);
                                const nowMs = Date.now();
                                if (this._chargingPhaseCooldownUntilMs && typeof this._chargingPhaseCooldownUntilMs.set === 'function') this._chargingPhaseCooldownUntilMs.set(w.safe, nowMs + (Number.isFinite(cooldownMs) && cooldownMs > 0 ? cooldownMs : 15 * 60 * 1000));
                                if (this._chargingPhaseSettleUntilMs && typeof this._chargingPhaseSettleUntilMs.set === 'function') this._chargingPhaseSettleUntilMs.set(w.safe, nowMs + (Number.isFinite(settleMs) && settleMs > 0 ? settleMs : 30 * 1000));
                            }
                        } else {
                            result.skippedCount += 1;
                        }
                    } catch (e) {
                        applyStatus = e && e.message ? `phase_switch_executor_error:${e.message}` : 'phase_switch_executor_error';
                        result.failedCount += 1;
                        result.ok = false;
                    }
                }
            } else if (!shouldWrite) {
                result.skippedCount += 1;
            } else if (!this.dp) {
                applyStatus = 'no_dp_registry';
                result.failedCount += 1;
                result.ok = false;
            } else {
                try {
                    const consumerBase = w.consumer || {
                        type: 'evcs',
                        key: w.safe,
                        name: w.name,
                        controlBasis: w.controlBasis,
                        setAKey: w.setAKey || '',
                        setWKey: w.setWKey || '',
                        enableKey: w.enableKey || '',
                    };
                    const consumer = {
                        ...consumerBase,
                        controlBasis: plannedBasis,
                        setAKey: plannedBasis === 'currentA' && plannedSetpointKey ? plannedSetpointKey : (consumerBase.setAKey || w.setAKey || ''),
                        setWKey: plannedBasis === 'powerW' && plannedSetpointKey ? plannedSetpointKey : (consumerBase.setWKey || w.setWKey || ''),
                    };
                    const setpointTarget = { targetW, targetA, basis: plannedBasis };
                    // Die Hardware-Freigabe folgt ausschliesslich der ausdruecklichen
                    // Kunden-/Sicherheitsfreigabe und niemals dem PV-Sollwert. 0 W im
                    // PV-Modus bedeutet dadurch "Warten bei aktiver Wallbox".
                    if (w.enableKey) {
                        const availability = w.availabilityRequest && typeof w.availabilityRequest === 'object'
                            ? w.availabilityRequest
                            : resolveEvcsAvailabilityRequest({
                                userStationEnabled: w.userStationEnabled,
                                rfidEnforced: w.rfidEnforced,
                                rfidAuthorized: w.rfidAuthorized,
                            });
                        // 0 W steuert die Ladeleistung. Availability steuert nur
                        // den Zugang. Daher bleibt die Station bei Ladeende,
                        // Steckerziehen, PV-/Tarifpause und Safety-Stopp Operative.
                        setpointTarget.enable = availability.requested === true;
                    }
                    const writeOutcome = await rc85RunIsolatedResult(
                        `evcs-write:${safe}:setpoint`,
                        5000,
                        () => {
                            // Letzte asynchrone Lücke: Ein inzwischen ungültiger
                            // PV-Anteil darf nicht als zusätzlicher Netzbezug raus.
                            // Sicherer Stopp; der nächste Tick plant die Netzbasis.
                            if (zeroGridLimited && targetW > gridShareBaseW + livePvCreditW() + liveStorageCreditW() + 1e-6) {
                                targetW = 0; targetA = 0;
                                setpointTarget.targetW = 0; setpointTarget.targetA = 0;
                            }
                            if (Number(w.zeroExportProbeExtraW) > 0 && !isZeroExportGrantValid(
                                this.adapter, `evcs:${safe}`, String(w.zeroExportProbeLeaseId || ''), Date.now())) {
                                targetW = 0; targetA = 0;
                                setpointTarget.targetW = 0; setpointTarget.targetA = 0;
                            }
                            return applySetpoint({ adapter: this.adapter, dp: this.dp }, consumer, setpointTarget);
                        },
                        this.adapter?.log || console,
                    );
                    if (!writeOutcome.ok) throw writeOutcome.error || new Error('setpoint-write-timeout');
                    const res = writeOutcome.value;
                    applied = !!res?.applied;
                    applyStatus = String(res?.status || (applied ? 'applied' : 'write_failed'));
                    applyWrites = res?.writes || null;
                    if (applied) result.appliedCount += 1;
                    else {
                        result.failedCount += 1;
                        result.ok = false;
                    }
                } catch (e) {
                    applyStatus = e && e.message ? `executor_error:${e.message}` : 'executor_error';
                    result.failedCount += 1;
                    result.ok = false;
                }
            }
            if (!isPhaseSwitchEntry && w.telemetryProfile === 'ocpp-1.6-event-driven') {
                const confirmation = evaluateOcppCommandConfirmation({
                    targetW,
                    requestedW: w.ocppRequestedChargeLimitW,
                    appliedW: w.ocppAppliedChargeLimitW,
                    lastSuccess: w.ocppLastCommandSuccess,
                    lastError: w.ocppLastCommandError,
                    reason: w.ocppChargeLimitReason,
                    commandAt: w.ocppLastCommandAtMs,
                    now: Date.now(),
                });
                hardwareConfirmed = confirmation.confirmed === true;
                hardwareCommandAgeMs = confirmation.ageMs === null ? 0 : Math.round(confirmation.ageMs);
                hardwareCommandState = hardwareConfirmed
                    ? 'confirmed'
                    : (applied ? 'pending-after-write' : String(confirmation.state || 'not-written'));
                const confirmationMatchesTarget = confirmation.requestMatches === true;
                hardwareCommandFailure = confirmation.zeroHeld === true
                    || (confirmationMatchesTarget && String(confirmation.state || '').startsWith('failed'))
                    || (confirmationMatchesTarget && confirmation.ageMs !== null && confirmation.ageMs > 30000 && confirmation.confirmed !== true);
                if (hardwareCommandFailure) {
                    hardwareCommandState = String(confirmation.state || 'ocpp-command-not-confirmed');
                    applyStatus = targetW <= 0 && confirmation.zeroHeld
                        ? 'ocpp-zero-held-not-stopped'
                        : `ocpp-command-not-confirmed:${hardwareCommandState}`;
                    result.ok = false;
                    if (applied) result.failedCount += 1;
                }
            } else if (!isPhaseSwitchEntry) {
                hardwareConfirmed = applied;
                hardwareCommandState = applied ? 'write-confirmed-by-local-driver' : 'write-not-confirmed';
            }
            if (!isPhaseSwitchEntry && safetyDecision) {
                const acceptedWithoutWrite = !shouldWrite
                    && !safetyStopExisting
                    && entry.writeRequired === false
                    && entry.blocked !== true
                    && w.online
                    && w.controlAvailable === true;
                const safetyAccepted = (applied && !hardwareCommandFailure) || acceptedWithoutWrite;
                commitFlexibleLoadDecision(this.adapter, safetyDecision, safetyAccepted);
                if (safetyAccepted && stationKey) stationTargetsW.set(stationKey, stationUsedW + Math.max(0, targetW));
                const safetyStopCommandRequired = !!(
                    safetyStopExisting
                    || (
                        targetW <= 0
                        && targetA <= 0
                        && (currentActualW > 0.5 || previousCommandForSafetyW > 0.5)
                        && safetyDecision
                        && (safetyDecision.forceZero === true || safetyDecision.blocked === true)
                    )
                );
                // Fehler beim Starten/Erhöhen eines Ladepunkts bleiben lokal in
                // der EVCS-Domäne. Nur ein nicht bestätigter notwendiger STOPP
                // darf das globale Safety-Envelope und damit weitere flexible
                // Verbraucher/Speicher verriegeln.
                if (safetyStopCommandRequired && (!shouldWrite || !applied || hardwareCommandFailure)) {
                    invalidateSafetyEnvelope(this.adapter, `evcs-write-not-confirmed:${safe}:${applyStatus}`, {
                        generation: this.adapter?._emsSafetyCycle?.generation,
                        now: Date.now(),
                        emergencyStop: true,
                    });
                    try { this.adapter?._nwRequestImmediateEmsTick?.(`safety:evcs-write:${safe}`, 0); } catch (_tickError) {}
                }
            }
            if (safetyStopExisting && !shouldWrite) {
                result.failedCount += 1;
                result.ok = false;
                applyStatus = `safety-stop-unreachable:${String((liveEnvelope && liveEnvelope.invalidReason) || 'no-write-path')}`;
            }
            try { await this._queueState(`${w.ch}.targetCurrentA`, targetA, true); } catch { /* ignore */ }
            try { await this._queueState(`${w.ch}.targetPowerW`, targetW, true); } catch { /* ignore */ }
            // Die Diagnose folgt dem finalen Write-Plan. So bleiben Grund, Rang und
            // Stationsrest identisch zu den tatsächlich geschriebenen Sollwerten.
            try { await this._queueState(`${w.ch}.reason`, String((safetyDecision && safetyDecision.clamped ? safetyDecision.reason : applyStatus) || entry.reason || ''), true); } catch { /* ignore */ }
            try { await this._queueState(`${w.ch}.allocationRank`, Math.max(0, Math.round(Number(entry.allocationRank || 0))), true); } catch { /* ignore */ }
            try { await this._queueState(`${w.ch}.stationRemainingW`, Math.max(0, Math.round(Number(entry.stationRemainingW || 0))), true); } catch { /* ignore */ }
            if (isPhaseSwitchEntry) {
                try { await this._queueState(`${w.ch}.phaseSwitchState`, applyStatus, true); } catch { /* ignore */ }
                try { await this._queueState(`${w.ch}.targetPhaseCount`, Number(entry.targetPhaseCount || 0), true); } catch { /* ignore */ }
            }
            try { await this._queueState(`${w.ch}.applied`, applied, true); } catch { /* ignore */ }
            try { await this._queueState(`${w.ch}.applyStatus`, applyStatus, true); } catch { /* ignore */ }
            try { await this._queueState(`${w.ch}.hardwareCommandConfirmed`, !!hardwareConfirmed, true); } catch { /* ignore */ }
            try { await this._queueState(`${w.ch}.hardwareCommandState`, String(hardwareCommandState || ''), true); } catch { /* ignore */ }
            try { await this._queueState(`${w.ch}.hardwareCommandAgeMs`, Math.max(0, Math.round(Number(hardwareCommandAgeMs) || 0)), true); } catch { /* ignore */ }
            try {
                await this._queueState(`${w.ch}.applyWrites`, applyWrites ? JSON.stringify(applyWrites) : '', true);
            } catch {
                try { await this._queueState(`${w.ch}.applyWrites`, '', true); } catch { /* ignore */ }
            }
            if (!isPhaseSwitchEntry) {
                await this._queueState(`${w.ch}.zeroExportPvCreditW`, typeof w.zeroExportGridMaxW === 'number'
                    ? Math.min(targetW, Number(w.zeroExportPvCreditW) || 0) : 0, true);
                await this._queueState(`${w.ch}.zeroExportStorageCreditW`, zeroGridLimited
                    ? Math.min(targetW, liveStorageCreditW()) : 0, true);
                // Erst der tatsächlich begrenzte Endbefehl entscheidet über eine
                // PV-Pause. Damit kann der TS-Guard die Wiederanlaufsperre nicht umgehen.
                noteZeroExportEvcsCommand(this.adapter, { key: `evcs:${safe}`, now: Date.now(),
                    mode: w.zeroExportPvDependent === true ? 'pv' : normalizeWallboxModeOverride(w.effectiveMode), commandW: targetW,
                    actualW: w.actualPowerW, actualFresh: !w.meterStale && !w.staleAny,
                    technicalMinW: w.minPW,
                    phaseTransition: w.phaseSwitchRequired || w.phaseSwitchSafetyStopRequired || w.zeroExportPhaseProbe
                        || this._chargingPhaseSelectionTsLast?.wallboxes?.some(p => p.safe === safe
                            && (p.switchRequired || p.safetyStopRequired || Number(p.settleUntilMs || 0) > Date.now()))
                        || Number(w.settleUntilMs || 0) > Date.now() });
                const measuredBaselineW = (!w.meterStale && Number.isFinite(Number(w.actualPowerW)))
                    ? Math.max(0, Number(w.actualPowerW))
                    : null;
                const previousCommandW = this._lastCmdTargetW && typeof this._lastCmdTargetW.get === 'function'
                    ? Number(this._lastCmdTargetW.get(w.safe))
                    : NaN;
                const commandChanged = Number.isFinite(previousCommandW)
                    ? Math.abs(previousCommandW - targetW) >= 0.5
                    : (measuredBaselineW === null || Math.abs(measuredBaselineW - targetW) >= 0.5);
                recordAcceptedPowerTarget(this.adapter, {
                    key: `evcs:${w.safe}`,
                    targetW,
                    baselineW: measuredBaselineW,
                    baselineFresh: measuredBaselineW !== null,
                    accepted: applied && !hardwareCommandFailure,
                    commandChanged,
                    kind: 'load',
                    source: 'chargingManagement',
                    reason: String((safetyDecision && safetyDecision.clamped ? safetyDecision.reason : applyStatus) || entry.reason || ''),
                });
            }
            try {
                // Der Command-Cache folgt nur einem akzeptierten Leistungswrite.
                // Fehlgeschlagene Writes duerfen weder die NVP-Prognose noch die
                // naechste Rampenbasis als ausgefuehrt erscheinen lassen.
                if (applied && this._lastCmdTargetW && typeof this._lastCmdTargetW.set === 'function') this._lastCmdTargetW.set(w.safe, targetW);
                if (applied && this._lastCmdTargetA && typeof this._lastCmdTargetA.set === 'function') this._lastCmdTargetA.set(w.safe, targetA);
            } catch {
                // ignore runtime cache errors
            }
            const dbg = debugBySafe.get(safe);
            if (dbg && typeof dbg === 'object') {
                dbg.applied = applied;
                dbg.applyStatus = applyStatus;
                dbg.hardwareCommandConfirmed = hardwareConfirmed;
                dbg.hardwareCommandState = hardwareCommandState;
                dbg.hardwareCommandAgeMs = hardwareCommandAgeMs;
                dbg.applyWrites = applyWrites;
                dbg.executorSource = executorSource || '';
                dbg.writePlanFallbackReason = fallbackReason || '';
                dbg.executorBasis = plannedBasis;
                dbg.executorSetpointKey = plannedSetpointKey || '';
                dbg.targetW = targetW;
                dbg.targetA = targetA;
                dbg.safetyRequestedW = safetyDecision ? safetyDecision.requestedW : null;
                dbg.safetyAllowedW = safetyDecision ? safetyDecision.allowedW : null;
                dbg.safetyBinding = safetyDecision ? String(safetyDecision.binding || '') : '';
                dbg.safetyReason = safetyDecision ? String(safetyDecision.reason || '') : '';
                dbg.reason = String((safetyDecision && safetyDecision.clamped ? safetyDecision.reason : applyStatus) || entry.reason || dbg.reason || '');
                dbg.pvUsedW = Math.max(0, Math.round(Number(entry.pvUsedW || 0)));
                dbg.stationAllocatedW = Math.max(0, Math.round(Number(entry.stationAllocatedW || 0)));
                dbg.stationRemainingW = Math.max(0, Math.round(Number(entry.stationRemainingW || 0)));
                dbg.allocationSafetyCapped = entry.allocationSafetyCapped === true;
                dbg.allocationSafetyReason = String(entry.allocationSafetyReason || '');
                if (isPhaseSwitchEntry) {
                    dbg.phaseSwitchApplied = applied;
                    dbg.phaseSwitchValue = entry.targetValue;
                }
            }
            result.entries.push({
                safe,
                requestedTargetW,
                requestedTargetA,
                targetW,
                targetA,
                safetyRequestedW: safetyDecision ? safetyDecision.requestedW : null,
                safetyAllowedW: safetyDecision ? safetyDecision.allowedW : null,
                safetyBinding: safetyDecision ? String(safetyDecision.binding || '') : '',
                safetyReason: safetyDecision ? String(safetyDecision.reason || '') : '',
                basis: isPhaseSwitchEntry ? 'phase' : plannedBasis,
                setpointKey: plannedSetpointKey || '',
                applied,
                hardwareConfirmed,
                hardwareCommandState,
                hardwareCommandAgeMs,
                status: applyStatus,
                source: executorSource || '',
                reason: String((safetyDecision && safetyDecision.clamped ? safetyDecision.reason : applyStatus) || entry.reason || ''),
                allocationRank: Math.max(0, Math.round(Number(entry.allocationRank || 0))),
                pvUsedW: Math.max(0, Math.round(Number(entry.pvUsedW || 0))),
                stationKey: String(entry.stationKey || ''),
                stationMaxPowerW: Math.max(0, Math.round(Number(entry.stationMaxPowerW || 0))),
                stationAllocatedW: Math.max(0, Math.round(Number(entry.stationAllocatedW || 0))),
                stationRemainingW: Math.max(0, Math.round(Number(entry.stationRemainingW || 0))),
                allocationSafetyCapped: entry.allocationSafetyCapped === true,
                allocationSafetyReason: String(entry.allocationSafetyReason || ''),
                targetPhaseCount: Number(entry.targetPhaseCount || 0),
                targetValue: entry.targetValue,
            });
        }
        this._chargingWritePlanExecutorLast = result;
        try {
            await this._queueState('chargingManagement.control.tsWritePlanExecutorJson', JSON.stringify(result), true);
        } catch {
            // diagnostics only
        }
        return result;
    }

    /** Code-Teil: _executeChargingTsSetpointPlan – Führt den produktiven TypeScript-Write-Plan über den JS/ioBroker-Executor aus. */
    async _executeChargingTsSetpointPlan(writePlanProductive, wbList, debugAlloc) {
        const entries = writePlanProductive && writePlanProductive.productive && writePlanProductive.apply && Array.isArray(writePlanProductive.apply.entries)
            ? writePlanProductive.apply.entries
            : null;
        if (!entries) return false;
        const result = await this._executeChargingSetpointEntries(entries, wbList, debugAlloc, 'ts-write-plan', '');
        return !!(result && result.ok === true);
    }

    /** Code-Teil: _executeChargingLegacySetpointFallback – Nutzt die bisherigen JS-Zielwerte nur noch als Fallback, wenn der TS-Write-Plan */
    async _executeChargingLegacySetpointFallback(wbList, debugAlloc, fallbackReason = 'ts-write-plan-fallback') {
        const bySafe = new Map();
        for (const w of Array.isArray(wbList) ? wbList : []) {
            if (w && w.safe) bySafe.set(String(w.safe), w);
        }
        const entries = [];
        for (const item of Array.isArray(debugAlloc) ? debugAlloc : []) {
            if (!item || typeof item !== 'object' || item.type === 'budget' || !item.safe) continue;
            const safe = String(item.safe);
            const w = bySafe.get(safe);
            if (!w) continue;
            const targetW = Number(item.targetPowerW ?? item.targetW ?? 0);
            const targetA = Number(item.targetCurrentA ?? item.targetA ?? 0);
            const hasSetpoint = !!(w.setAKey || w.setWKey);
            const positiveCommandBlocked = (Number(targetW) > 0 || Number(targetA) > 0) && w.controlAvailable !== true;
            const safeTargetW = positiveCommandBlocked ? 0 : (Number.isFinite(targetW) && targetW > 0 ? targetW : 0);
            const safeTargetA = positiveCommandBlocked ? 0 : (Number.isFinite(targetA) && targetA > 0 ? targetA : 0);
            const shouldWrite = hasSetpoint && !!w.online && (
                !!w.controlAvailable
                || (!!w.cfgEnabled && (!w.userStationEnabled || !w.userEnabled || w.rfidLockActive))
                || !!w.operationalBlocked
            );
            entries.push({
                safe,
                targetPowerW: safeTargetW,
                targetCurrentA: safeTargetA,
                basis: w.controlBasis === 'currentA' ? 'current' : 'power',
                setpointKey: w.controlBasis === 'currentA' ? (w.setAKey || '') : (w.setWKey || ''),
                writeRequired: shouldWrite,
                blocked: !shouldWrite,
                reason: item.reason || fallbackReason,
            });
        }
        await this._executeChargingSetpointEntries(entries, wbList, debugAlloc, 'js-fallback', fallbackReason);
        return true;
    }

    /**
     * Default publishing options for certain "noisy" diagnostic counters.
     * @param {string} id
     * @returns {{deadband?:number,minIntervalMs?:number}}
     */
    /** Code-Teil: Methode `_pubDefaults` – enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden. */
    _pubDefaults(id) {
        const s = String(id || '');
        if (!s) return {};

        // Debug payloads are large and not user-critical → slow down.
        if (s.startsWith('chargingManagement.debug.')) return { minIntervalMs: 5000 };
        if (s === 'chargingManagement.audit.snapshotJson') return { minIntervalMs: 2000 };
        if (s === 'chargingManagement.audit.recentEventsJson') return { minIntervalMs: 1000 };

        // Always-changing counters → update slower to avoid DB spam.
        if (s.endsWith('.idleMs') || s.endsWith('.meterAgeMs') || s.endsWith('.statusAgeMs')) return { minIntervalMs: 5000 };

        // Reduce jitter on live power/current values (UI only, not control).
        if (s.endsWith('.actualPowerW') || s.endsWith('.targetPowerW') || s.endsWith('.stationRemainingW') || s.endsWith('.headroomW') || s.endsWith('.remainingW') || s.endsWith('.usedW') || s.endsWith('.targetSumW')) return { deadband: 5 };
        if (s.endsWith('.actualCurrentA') || s.endsWith('.targetCurrentA') || s.endsWith('.gridWorstPhaseA') || s.endsWith('.gridMaxPhaseA') || s.endsWith('.worstPhaseA')) return { deadband: 0.05 };

        return {};
    }

    /**
     * Rolling-Mean für PV-Überschuss (W) in einem benannten Fenster.
     * @param {'fast5s'|'slow5m'} bucketKey
     * @param {number} nowMs
     * @param {number} sampleW
     * @returns {number} avgW
     */
    /** Code-Teil: Methode `_pvSurplusAvgPush` – enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden. */
    _pvSurplusAvgPush(bucketKey, nowMs, sampleW) {
        const buckets = this._pvSurplusAvg || {};
        const bucket = buckets && Object.prototype.hasOwnProperty.call(buckets, bucketKey) ? buckets[bucketKey] : null;
        const v = (typeof sampleW === 'number' && Number.isFinite(sampleW)) ? sampleW : 0;
        const now = (typeof nowMs === 'number' && Number.isFinite(nowMs)) ? nowMs : Date.now();

        if (!bucket || typeof bucket !== 'object') return v;
        if (!Array.isArray(bucket.samples)) bucket.samples = [];
        if (!Number.isFinite(bucket.head) || bucket.head < 0) bucket.head = 0;
        if (!Number.isFinite(bucket.sumW)) bucket.sumW = 0;

        const windowMs = (typeof bucket.windowMs === 'number' && Number.isFinite(bucket.windowMs) && bucket.windowMs > 0)
            ? bucket.windowMs
            : 0;
        if (!windowMs) return v;

        bucket.samples.push({ t: now, v });
        bucket.sumW += v;

        const cutoff = now - windowMs;
        while (bucket.head < bucket.samples.length && bucket.samples[bucket.head].t < cutoff) {
            bucket.sumW -= bucket.samples[bucket.head].v;
            bucket.head++;
        }

        // gelegentlich kompaktieren (Performance, kein Array.shift)
        if (bucket.head > 100) {
            bucket.samples = bucket.samples.slice(bucket.head);
            bucket.head = 0;
        }

        const count = Math.max(1, bucket.samples.length - bucket.head);
        return bucket.sumW / count;
    }

    /** Code-Teil: Methode `_getAdapterNumberFromCache` – liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik. */
    _getAdapterNumberFromCache(key, fallback = null) {
        const sid = String(key || '').trim();
        if (!sid) return fallback;

        try {
            if (this.adapter && typeof this.adapter._nwGetNumberFromCache === 'function') {
                const n = this.adapter._nwGetNumberFromCache(sid);
                if (typeof n === 'number' && Number.isFinite(n)) return n;
            }
        } catch {
            // ignore
        }

        try {
            const rec = this.adapter && this.adapter.stateCache ? this.adapter.stateCache[sid] : null;
            const n = Number(rec && rec.value);
            if (Number.isFinite(n)) return n;
        } catch {
            // ignore
        }

        return fallback;
    }

    /**
     * Queue a local state update (fast). This avoids awaiting many adapter.setStateAsync calls inside the tick loop.
     * Writes are de-duplicated by id and flushed asynchronously with limited concurrency.
     *
     * @param {string} id
     * @param {any} value
     * @param {boolean} [ack=true]
     * @param {{deadband?:number,minIntervalMs?:number}} [opts]
     * @returns {Promise<true|null>}
     */
    /** Code-Teil: Methode `_queueState` – enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden. */
    async _queueState(id, value, ack = true, opts = null) {
        const sid = String(id || '').trim();
        if (!sid) return null;

        const now = Date.now();
        const o = Object.assign({}, this._pubDefaults(sid), (opts || {}));

        // Normalize value for storage
        let v = value;
        if (v === undefined) v = null;
        if (typeof v === 'number' && !Number.isFinite(v)) v = 0;
        if (v !== null && typeof v === 'object') {
            try {
                v = JSON.stringify(v);
            } catch {
                v = String(v);
            }
        }

        const prev = this._pubCache.get(sid);
        if (prev) {
            // min interval gate (drop until next tick)
            const mi = Number(o.minIntervalMs);
            if (Number.isFinite(mi) && mi > 0 && Number.isFinite(prev.ts) && (now - prev.ts) < mi) {
                return null;
            }

            // equality / deadband
            if (typeof v === 'number' && typeof prev.val === 'number' && Number.isFinite(v) && Number.isFinite(prev.val)) {
                const db = Number(o.deadband);
                if (Number.isFinite(db) && db > 0) {
                    if (Math.abs(v - prev.val) < db) return null;
                } else if (v === prev.val) {
                    return null;
                }
            } else {
                if (v === prev.val) return null;
            }
        }

        // optimistic cache update (we previously ignored setState errors anyway)
        this._pubCache.set(sid, { val: v, ts: now }); if (this._pubCache.size > 1000) { const __rc85Oldest = this._pubCache.keys().next().value; if (__rc85Oldest !== undefined) this._pubCache.delete(__rc85Oldest); } // RC85_BOUNDED_COLLECTION
        this._pubQueue.set(sid, { val: v, ack: !!ack });
        this._schedulePubFlush();
        return true;
    }

    /**
     * Read a local state using the adapter's in-memory stateCache first (fast),
     * falling back to getStateAsync only on cache misses.
     *
     * @param {string} id
     * @returns {Promise<{val:any,ts:number,lc?:number,ack?:boolean}|null>}
     */
    /** Code-Teil: Methode `_getStateCached` – liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik. */
    async _getStateCached(id) {
        const sid = String(id || '').trim();
        if (!sid) return null;

        const a = this.adapter;
        const now = Date.now();

        // Fast path: in-memory stateCache (maintained by main.js onStateChange)
        try {
            const sc = a && a.stateCache;
            if (sc) {
                const e = sc[sid];
                if (e && Object.prototype.hasOwnProperty.call(e, 'value')) {
                    const ts = (typeof e.ts === 'number' && Number.isFinite(e.ts)) ? e.ts : now;
                    return { val: e.value, ts, lc: ts, ack: true };
                }

                // If called with full id, attempt keyFromId mapping
                if (typeof a.keyFromId === 'function' && typeof a.namespace === 'string') {
                    const pref = a.namespace + '.';
                    if (sid.startsWith(pref)) {
                        const k = a.keyFromId(sid);
                        if (k && sc[k] && Object.prototype.hasOwnProperty.call(sc[k], 'value')) {
                            const ts = (typeof sc[k].ts === 'number' && Number.isFinite(sc[k].ts)) ? sc[k].ts : now;
                            return { val: sc[k].value, ts, lc: ts, ack: true };
                        }
                    }
                }
            }
        } catch {
            // ignore
        }

        // Fallback: DB read
        try {
            const st = await a.getStateAsync(sid);
            // Prime cache (best-effort)
            try {
                const sc = a && a.stateCache;
                if (sc) {
                    const ts = st && (typeof st.ts === 'number' ? st.ts : (typeof st.lc === 'number' ? st.lc : now));
                    sc[sid] = { value: st ? st.val : null, ts: ts || now };
                }
            } catch {
                // ignore
            }
            return st || null;
        } catch {
            return null;
        }
    }

    /** Code-Teil: Methode `_setTimeout` – schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen. */
    /** Code-Teil: _setTimeout – Schreibt interne States oder veröffentlichte Runtime-Werte. */
    _setTimeout(fn, ms) {
        const a = this.adapter;
        if (!a || a._nwShuttingDown || typeof fn !== 'function') return null;
        const guarded = (...args) => {
            if (!this.adapter || this.adapter._nwShuttingDown) return;
            return fn(...args);
        };
        return (typeof a._nwSetTimeout === 'function')
            ? a._nwSetTimeout(guarded, ms)
            : ((typeof a.setTimeout === 'function') ? a.setTimeout(guarded, ms) : setTimeout(guarded, ms));
    }
    /** Code-Teil: _clearTimeout – Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen. */
    _clearTimeout(timer) {
        if (!timer) return;
        const a = this.adapter;
        if (a && typeof a.clearTimeout === 'function') a.clearTimeout(timer);
        else clearTimeout(timer);
    }

    /** Code-Teil: Methode `_schedulePubFlush` – enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden. */
    /** Code-Teil: _schedulePubFlush – Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen. */
    _schedulePubFlush() {
        if (!this.adapter || this.adapter._nwShuttingDown) {
            this._pubQueue.clear();
            return;
        }
        if (this._pubFlushTimer) return;

        const now = Date.now();
        const last = Number(this._pubLastFlushMs) || 0;
        const diff = now - last;
        const delay = diff >= this._pubFlushIntervalMs ? 0 : (this._pubFlushIntervalMs - diff);

        this._pubFlushTimer = this._setTimeout(() => {
            this._pubFlushTimer = null;
            this._flushPubQueue().catch(() => {});
        }, delay);
    }

    /** Code-Teil: Methode `_flushPubQueue` – enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden. */
    /** Code-Teil: _flushPubQueue – Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen. */
    async _flushPubQueue() {
        if (!this.adapter || this.adapter._nwShuttingDown) {
            this._pubQueue.clear();
            return;
        }
        if (this._pubFlushInFlight) {
            // A flush is already running; make sure we flush again afterwards.
            this._schedulePubFlush();
            return;
        }

        this._pubFlushInFlight = true;
        try {
            const entries = Array.from(this._pubQueue.entries());
            this._pubQueue.clear();
            if (!entries.length) return;

            this._pubLastFlushMs = Date.now();

            const concurrency = 25;
            for (let i = 0; i < entries.length; i += concurrency) {
                const slice = entries.slice(i, i + concurrency);
                await Promise.all(slice.map(([sid, p]) => {
                    try {
                        return this.adapter.setStateAsync(sid, p.val, p.ack).catch(() => {});
                    } catch {
                        return Promise.resolve();
                    }
                }));
            }
        } finally {
            this._pubFlushInFlight = false;
            // If new entries arrived while flushing, schedule another run.
            if (this._pubQueue.size > 0) this._schedulePubFlush();
        }
    }

    /** Code-Teil: Methode `_isEnabled` – enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden. */
    /** Code-Teil: _isEnabled – Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen. */
    /** Code-Teil: stop – Leert die gebündelte Diagnose-/State-Publish-Queue beim Adapter-Unload. */
    /**
     * Ablauf und Zusammenhang: Beendet die Hintergrundarbeit des Lademanagements. Beim Stoppen dürfen keine neuen Lade-Sollwerte aus später eintreffenden asynchronen Rückmeldungen entstehen.
     */
    stop() {
        if (this._pubFlushTimer) {
            try { this._clearTimeout(this._pubFlushTimer); } catch (_e) {}
            this._pubFlushTimer = null;
        }
        try { this._pubQueue.clear(); } catch (_e) {}
        this._pubFlushInFlight = false;
    }

    _isEnabled() {
        // Backwards compatible default: older configs may not have the new flag stored yet.
        // If the flag is missing, enable the module when at least one chargepoint
        // is configured (EVCS table). This ensures runtime control states exist and
        // the UI doesn't fall back to legacy mode unexpectedly.
        const v = this.adapter && this.adapter.config ? this.adapter.config.enableChargingManagement : undefined;
        if (typeof v === 'boolean') return v;

        try {
            const cnt = Number(this.adapter && this.adapter.config && this.adapter.config.settingsConfig && this.adapter.config.settingsConfig.evcsCount);
            if (Number.isFinite(cnt) && cnt > 0) return true;
        } catch {
            // ignore
        }

        try {
            const list = (this.adapter && Array.isArray(this.adapter.evcsList)) ? this.adapter.evcsList : [];
            if (list && list.length) return true;
        } catch {
            // ignore
        }

        return false;
    }

    /**
     * Fail-closed Lifecycle: Beim AppCenter-AUS, Lizenzverlust oder Adapterstart
     * mit deaktiviertem Lademanagement werden alle konfigurierten Ladepunkt-
     * Stellwerte physisch auf 0/AUS geschrieben. Die direkte Konfiguration wird
     * verwendet, damit der Stopp auch ohne vorherigen Regel-Tick funktioniert.
     */
    async deactivate() {
        const cfg = this.adapter && this.adapter.config && this.adapter.config.chargingManagement
            && typeof this.adapter.config.chargingManagement === 'object'
            ? this.adapter.config.chargingManagement
            : {};
        const configured = Array.isArray(cfg.wallboxes) && cfg.wallboxes.length
            ? cfg.wallboxes
            : (this.adapter && Array.isArray(this.adapter.evcsList) ? this.adapter.evcsList : []);
        let attempted = 0;
        const failures = [];

        for (const row of configured) {
            const wb = row && typeof row === 'object' ? row : {};
            const key = String(wb.key || wb.id || '').trim();
            if (!key) continue;
            const safe = toSafeIdPart(key);
            const mappings = [
                { key: `cm.wb.${safe}.setA`, objectId: String(wb.setCurrentAId || '').trim(), type: 'number', value: 0, unit: 'A' },
                { key: `cm.wb.${safe}.setW`, objectId: String(wb.setPowerWId || '').trim(), type: 'number', value: 0, unit: 'W' },
            ];
            // App-/Modul-Deaktivierung stoppt ausschließlich die Ladeleistung.
            // Die Stationsverfügbarkeit ist eine separate Zugangsentscheidung und
            // darf weder bei Modul-AUS noch bei Ladeende, Tarif-/PV-Pause oder
            // Safety-Stop auf Inoperative gesetzt werden. Eine bestehende Kunden-
            // oder RFID-Sperre bleibt deshalb unangetastet.
            for (const mapping of mappings) {
                if (!mapping.objectId) continue;
                attempted += 1;
                try {
                    if (!this.dp || typeof this.dp.upsert !== 'function') throw new Error('dp-registry-missing');
                    await this.dp.upsert({
                        key: mapping.key,
                        objectId: mapping.objectId,
                        dataType: mapping.type,
                        direction: 'out',
                        unit: mapping.unit,
                    });
                    const result = mapping.type === 'boolean'
                        ? await this._forceWriteBoolean(mapping.key, mapping.value)
                        : await this._forceWriteNumber(mapping.key, mapping.value);
                    if (result !== true) failures.push(`${safe}:${mapping.key}:write-not-accepted`);
                } catch (error) {
                    failures.push(`${safe}:${mapping.key}:${String(error && error.message || error)}`);
                }
            }
            try {
                this._lastCmdTargetW.set(safe, 0);
                this._lastCmdTargetA.set(safe, 0);
                const ch = `chargingManagement.wallboxes.${safe}`;
                await this._queueState(`${ch}.targetPowerW`, 0, true);
                await this._queueState(`${ch}.targetCurrentA`, 0, true);
                await this._queueState(`${ch}.reason`, 'module-disabled-safe-stop', true);
            } catch (_diagnosticError) {
                // Diagnose darf den bereits ausgefuehrten Safe-Stop nicht entwerten.
            }
        }

        try {
            await this._queueState('chargingManagement.control.active', false, true);
            await this._queueState('chargingManagement.control.usedW', 0, true);
            await this._queueState('chargingManagement.control.reserveW', 0, true);
            await this._queueState('chargingManagement.control.remainingW', 0, true);
            await this._queueState('chargingManagement.control.status', attempted ? 'module-disabled-safe-stop' : 'module-disabled-no-actuators', true);
            await this._flushPubQueue();
        } catch (_diagnosticError) {}

        if (failures.length) {
            throw new Error(`charging-safe-stop-failed:${failures.join(',')}`);
        }
        return { ok: true, attempted, stopped: attempted };
    }

    /** Code-Teil: Methode `init` – initialisiert UI/Modul, bindet Events oder bereitet Startzustände vor. */
    /** Code-Teil: init – Initialisiert diesen Bereich und verbindet abhängige Startlogik. */
    async init() {
        if (!this._isEnabled()) return;

        await this.adapter.setObjectNotExistsAsync('chargingManagement', {
            type: 'channel',
            common: { name: 'Charging Management' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('chargingManagement.summary', {
            type: 'channel',
            common: { name: 'Summary' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('chargingManagement.control', {
            type: 'channel',
            common: { name: 'Control' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('chargingManagement.stations', {
            type: 'channel',
            common: { name: 'Stations' },
            native: {},
        });

        /** Code-Teil: Arrow-Funktion `mk` – stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben. */
        /** Code-Teil: mk – Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen. */
        const mk = async (id, name, type, role) => {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: 'state',
                common: { name, type, role, read: true, write: false },
                native: {},
            });
        };

        // Sichtbarer Laufzeitstatus des STALE_METER-Failsafes. In produktiven
        // Anlagen ist der Schutz ab RC39 verpflichtend fail-closed.
        await this.adapter.setObjectNotExistsAsync('chargingManagement.control.failsafeEnabled', {
            type: 'state',
            common: {
                name: 'Failsafe enabled (STALE_METER)',
                type: 'boolean',
                role: 'indicator',
                read: true,
                write: false,
                def: true,
                states: { true: 'Ein', false: 'Aus' },
            },
            native: {},
        });
        try {
            if (typeof this.adapter.extendObjectAsync === 'function') {
                await this.adapter.extendObjectAsync('chargingManagement.control.failsafeEnabled', {
                    common: { role: 'indicator', read: true, write: false, def: true },
                });
            }
            await this.adapter.setStateAsync('chargingManagement.control.failsafeEnabled', { val: true, ack: true });
        } catch {
            // Diagnose-State darf die Initialisierung nicht abbrechen.
        }

        await mk('chargingManagement.wallboxCount', 'Ladepunkt count', 'number', 'value');
        await mk('chargingManagement.stationCount', 'Station count', 'number', 'value');
        await mk('chargingManagement.summary.totalPowerW', 'Total actual power (W)', 'number', 'value.power');
        await mk('chargingManagement.summary.totalReservedPowerW', 'Total reserved/commanded power (W)', 'number', 'value.power');
        await mk('chargingManagement.summary.totalCurrentA', 'Total current (A)', 'number', 'value.current');
        await mk('chargingManagement.summary.onlineWallboxes', 'Online Ladepunkte', 'number', 'value');
        await mk('chargingManagement.summary.totalTargetPowerW', 'Total target power (W)', 'number', 'value.power');
        await mk('chargingManagement.summary.totalTargetCurrentA', 'Total target current (A)', 'number', 'value.current');
        await mk('chargingManagement.summary.lastUpdate', 'Last update', 'number', 'value.time');

        await mk('chargingManagement.control.active', 'Control active', 'boolean', 'indicator');
        await mk('chargingManagement.control.mode', 'Mode', 'string', 'text');
        await mk('chargingManagement.control.status', 'Status', 'string', 'text');
        await mk('chargingManagement.control.budgetMode', 'Budget mode', 'string', 'text');
        await mk('chargingManagement.control.budgetW', 'Budget (W)', 'number', 'value.power');
        await mk('chargingManagement.control.usedW', 'Reserved/used budget (W)', 'number', 'value.power');
        await mk('chargingManagement.control.actualW', 'Actual measured EVCS power (W)', 'number', 'value.power');
        await mk('chargingManagement.control.reserveW', 'Reserved/commanded EVCS power (W)', 'number', 'value.power');
        await mk('chargingManagement.control.activeDemandReserveW', 'Active EVCS demand reserve (W)', 'number', 'value.power');
        await mk('chargingManagement.control.activeDemandWallboxes', 'Active EVCS demand wallboxes', 'number', 'value');
        await mk('chargingManagement.control.gridEvcsActualForCapW', 'EVCS actual used for grid cap (W)', 'number', 'value.power');
        await mk('chargingManagement.control.gridEvcsReserveIgnoredForCapW', 'EVCS reserved ignored for grid cap (W)', 'number', 'value.power');
        await mk('chargingManagement.control.remainingW', 'Remaining (W)', 'number', 'value.power');
        await mk('chargingManagement.control.tsControlShadowJson', 'TypeScript EVCS-Control Shadow / Vorbereitung (JSON)', 'string', 'json');
        await mk('chargingManagement.control.tsControlProductivePrepJson', 'TypeScript EVCS-Control Produktiv-Vorbereitung (JSON)', 'string', 'json');
        await mk('chargingManagement.control.tsControlProductiveJson', 'TypeScript EVCS-Control produktiv (JSON)', 'string', 'json');
        await mk('chargingManagement.control.tsControlSource', 'TypeScript EVCS-Control source/prep state', 'string', 'text');
        await mk('chargingManagement.control.tsAllocationShadowJson', 'TypeScript EVCS-Allocation Shadow (JSON)', 'string', 'json');
        await mk('chargingManagement.control.tsAllocationProductivePrepJson', 'TypeScript EVCS-Allocation Produktiv-Vorbereitung (JSON)', 'string', 'json');
        await mk('chargingManagement.control.tsAllocationProductiveJson', 'TypeScript EVCS-Allocation produktiv (JSON)', 'string', 'json');
        await mk('chargingManagement.control.tsAllocationNormalSourceJson', 'TypeScript EVCS-Allocation Normalquelle (JSON)', 'string', 'json');
        await mk('chargingManagement.control.tsAllocationSource', 'TypeScript EVCS-Allocation source/prep state', 'string', 'text');
        await mk('chargingManagement.control.phaseSelectionJson', 'EVCS AC-Phasenwahl 1p/3p Auto-PV (JSON)', 'string', 'json');
        await mk('chargingManagement.control.phaseSelectionSource', 'EVCS AC-Phasenwahl source', 'string', 'text');
        await mk('chargingManagement.control.tsWritePlanShadowJson', 'TypeScript EVCS-Setpoint Write-Plan Shadow (JSON)', 'string', 'json');
        await mk('chargingManagement.control.tsWritePlanProductivePrepJson', 'TypeScript EVCS-Setpoint Write-Plan Produktiv-Vorbereitung (JSON)', 'string', 'json');
        await mk('chargingManagement.control.tsWritePlanProductiveJson', 'TypeScript EVCS-Setpoint Write-Plan produktiv (JSON)', 'string', 'json');
        await mk('chargingManagement.control.tsWritePlanExecutorJson', 'TypeScript EVCS-Setpoint Write-Plan Executor-Diagnose (JSON)', 'string', 'json');
        await mk('chargingManagement.control.tsNormalSourceLockdownJson', 'TypeScript EVCS-Normalquelle Lockdown / JS-Abbau-Freigabe (JSON)', 'string', 'json');
        await mk('chargingManagement.control.tsNormalSourceJson', 'TypeScript EVCS-Normalquelle Lockdown / JS-Abbau-Freigabe (JSON)', 'string', 'json');
        await mk('chargingManagement.control.tsNormalSource', 'TypeScript EVCS-Normalquelle source/lockdown state', 'string', 'text');
        await mk('chargingManagement.control.tsRuntimeSource', 'TypeScript EVCS runtime source', 'string', 'text');
        await mk('chargingManagement.control.tsMigrationReady', 'TypeScript EVCS migration ready', 'boolean', 'indicator');
        await mk('chargingManagement.control.tsEvcsJsRemovalJson', 'TypeScript EVCS JS-Entscheidungsbaum Abbau-Freigabe (JSON)', 'string', 'json');
        await mk('chargingManagement.control.tsEvcsJsRemovalReady', 'TypeScript EVCS JS decision-tree removal ready', 'boolean', 'indicator');
        await mk('chargingManagement.control.tsAdapterRuntimeHandoverJson', 'TypeScript Adapter Runtime-Handover / generierte JS-Grenze (JSON)', 'string', 'json');
        await mk('chargingManagement.control.tsAdapterRuntimeSource', 'TypeScript Adapter runtime source', 'string', 'text');
        await mk('chargingManagement.control.tsAdapterMigrationReady', 'TypeScript Adapter migration ready', 'boolean', 'indicator');
        await mk('chargingManagement.control.tsLegacyDecisionTreeJson', 'TypeScript EVCS Legacy-JS Executor/Fallback-Reduktion (JSON)', 'string', 'json');
        await mk('chargingManagement.control.tsWritePlanSource', 'TypeScript EVCS-Write-Plan source/prep state', 'string', 'text');
        await mk('chargingManagement.control.pausedByPeakShaving', 'Paused by peak shaving', 'boolean', 'indicator');
        await mk('chargingManagement.control.tsBudgetJson', 'TypeScript charging budget shadow JSON', 'string', 'json');
        await mk('chargingManagement.control.tsBudgetSource', 'TypeScript charging budget source', 'string', 'text');

        // MU6.8: Failsafe diagnostics (Stale Meter/Budget)
        await mk('chargingManagement.control.staleMeter', 'Meter stale (failsafe)', 'boolean', 'indicator');
        await mk('chargingManagement.control.staleBudget', 'Budget stale (failsafe)', 'boolean', 'indicator');
        await mk('chargingManagement.control.failsafeDetails', 'Failsafe details', 'string', 'text');
        await mk('chargingManagement.control.failsafePolicy', 'Failsafe policy (effective)', 'string', 'text');

        // Gate T: Tarif-Freigaben (für Transparenz)
        await mk('chargingManagement.control.gridChargeAllowed', 'Grid charge allowed (Tarif)', 'boolean', 'indicator');
        await mk('chargingManagement.control.dischargeAllowed', 'Discharge allowed (Tarif)', 'boolean', 'indicator');

        // Gate B: PV hysteresis diagnostics
        await mk('chargingManagement.control.pvCapRawW', 'PV surplus raw cap (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvCapEffectiveW', 'Pure-PV customer-priority cap after hysteresis (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvPureCapW', 'Pure-PV customer-priority cap (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvPhysicalCapW', 'Physical PV cap for PV and Min+PV extra power (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvPriorityPurePvOnly', 'Legacy indicator: PV priority restricted to pure PV', 'boolean', 'indicator');
        await mk('chargingManagement.control.pvPriorityIncludesAuto', 'Customer PV priority includes Auto PV share', 'boolean', 'indicator');
        await mk('chargingManagement.control.pvAutoPriorityReservedW', 'PV share reserved by final Auto charging targets (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvEvcsAutoPriorityMeasuredW', 'Fresh Auto power used in physical PV reconstruction (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvAutoPriorityJson', 'Auto PV share and phase-aware start diagnostics', 'string', 'json');
        await mk('chargingManagement.control.pvAvailable', 'PV available (hysteresis)', 'boolean', 'indicator');
        await mk('chargingManagement.control.pvAllocationMode', 'PV surplus allocation mode', 'string', 'text');
        await mk('chargingManagement.control.pvAllocationEvcsSharePct', 'PV surplus EVCS share (%)', 'number', 'value.percent');
        await mk('chargingManagement.control.pvAllocationEvcsCapW', 'PV surplus EVCS allocation cap (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvAllocationUncappedW', 'PV surplus EVCS cap before allocation (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvAllocationStorageActualChargeW', 'Storage actual charge considered for PV allocation (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvBudgetSource', 'Authoritative PV budget source', 'string', 'text');
        await mk('chargingManagement.control.pvBudgetCentralAgeMs', 'Central PV budget age (ms)', 'number', 'value.interval');
        await mk('chargingManagement.control.pvBudgetCentralTotalW', 'Central total PV budget (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvBudgetCentralEvcsCapW', 'Central EVCS PV allocation cap (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvBudgetLocalEstimateW', 'Local EVCS PV estimate for diagnostics (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvBudgetMismatchW', 'Central EVCS cap minus local estimate (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvActiveDemandReserveW', 'Actual PV share reserved by active EVCS demand (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvActiveDemandIntentW', 'PV intent reserved during EVCS ramp/telemetry lag (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvPendingDemandIntentW', 'Connected PV charging demand reserved before power flow starts (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvPendingDemandTotalW', 'Total EVCS demand reserved while PV charging starts or ramps (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvPendingDemandWallboxes', 'Wallboxes with pending central PV demand', 'number', 'value');
        await mk('chargingManagement.control.pvTotalDemandIntentW', 'Total active and pending central EVCS PV demand (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvCentralGrantW', 'Central EMS PV grant available to EVCS (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvCentralReservedW', 'PV budget reserved centrally by EVCS (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvCentralRemainingAfterEvcsW', 'Central PV budget remaining after EVCS reservation (W)', 'number', 'value.power');

        // Debug: PV surplus without EVCS (instant + smoothed)
        // Used to verify sign conventions / smoothing for PV-only charging.
        await mk('chargingManagement.control.pvSurplusNoEvRawW', 'PV surplus (no EVCS) instant (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvSurplusNoEvAvg5mW', 'PV surplus (no EVCS) 5min avg (W)', 'number', 'value.power');

        // PV surplus calc internals: EVCS power used to reconstruct PV surplus without EVCS consumption
        // (helps diagnosing start/stop "hopping" when meters update delayed)
        await mk('chargingManagement.control.pvEvcsActualW', 'EVCS actual power sum (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvEvcsCmdW', 'EVCS last commanded power sum (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvEvcsUsedW', 'EVCS power used for local PV surplus diagnostics (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvEvcsPhysicalPvManagedW', 'Measured PV-managed EVCS power for central PV reconstruction (W)', 'number', 'value.power');

        // Gate A: hard grid safety caps (transparency)
        await mk('chargingManagement.control.gridImportLimitW', 'Grid import hard limit (W) configured', 'number', 'value.power');
        await mk('chargingManagement.control.gridImportLimitW_effective', 'Grid import hard limit (W) effective', 'number', 'value.power');
        await mk('chargingManagement.control.gridImportLimitW_planning', 'Grid import soft planning limit (W)', 'number', 'value.power');
        await mk('chargingManagement.control.gridImportStage', 'Grid import limit stage', 'string', 'text');
        await mk('chargingManagement.control.gridImportW', 'Grid power (W) (import + / export -)', 'number', 'value.power');
        await mk('chargingManagement.control.gridBaseLoadW', 'Estimated base load (W)', 'number', 'value.power');
        await mk('chargingManagement.control.gridBaseLoadRawW', 'Raw base load before clamp (W)', 'number', 'value.power');
        await mk('chargingManagement.control.gridLocalSupportW', 'Local PV/storage support for EVCS (W)', 'number', 'value.power');
        await mk('chargingManagement.control.gridCapEvcsW', 'Grid-based EVCS cap (W)', 'number', 'value.power');
        await mk('chargingManagement.control.gridCapBinding', 'Grid cap actively limiting EVCS demand', 'boolean', 'indicator');
        await mk('chargingManagement.control.gridCapMonitoring', 'Grid import protection monitoring active', 'boolean', 'indicator');
        await mk('chargingManagement.control.gridMeasurementSource', 'Canonical NVP source used by Gate A', 'string', 'text');
        await mk('chargingManagement.control.gridHardHeadroomRawW', 'Signed hard-limit headroom before progressive ramp (W)', 'number', 'value.power');
        await mk('chargingManagement.control.gridProgressiveIncrementW', 'Progressively allowed EVCS increment (W)', 'number', 'value.power');
        await mk('chargingManagement.control.gridSoftRampFactor', 'Soft-limit ramp factor', 'number', 'value');
        await mk('chargingManagement.control.offlineReserveW', 'Conservative reserve for unavailable EVCS (W)', 'number', 'value.power');
        await mk('chargingManagement.control.gridDemandRequestedW', 'EVCS demand before Gate A (W)', 'number', 'value.power');
        await mk('chargingManagement.control.gridAllowedDemandW', 'EVCS demand allowed by Gate A (W)', 'number', 'value.power');
        await mk('chargingManagement.control.gridReductionW', 'EVCS demand actually reduced by the grid gate (W)', 'number', 'value.power');
        await mk('chargingManagement.control.infrastructureRawCapacityW', 'Installed EVCS port capacity before station caps (W)', 'number', 'value.power');
        await mk('chargingManagement.control.infrastructureCapacityW', 'Effective EVCS infrastructure capacity (W)', 'number', 'value.power');
        await mk('chargingManagement.control.infrastructureWallboxCount', 'Controllable EVCS connector count', 'number', 'value');
        await mk('chargingManagement.control.infrastructureHardCapW', 'Optional EVCS infrastructure hard cap (W)', 'number', 'value.power');
        await mk('chargingManagement.control.minimumServicePreserved', 'All grid-capable EVCS minimum services preserved', 'boolean', 'indicator');
        await mk('chargingManagement.control.minimumServiceRequiredW', 'Total technical minimum service required (W)', 'number', 'value.power');
        await mk('chargingManagement.control.minimumServiceConnectorCount', 'Grid-capable connectors included in minimum service', 'number', 'value');
        await mk('chargingManagement.control.minimumServiceReservedFutureW', 'Minimum service reserved for later connectors (W)', 'number', 'value.power');
        await mk('chargingManagement.control.gridMaxPhaseA', 'Grid max phase current (A) configured', 'number', 'value.current');
        await mk('chargingManagement.control.gridWorstPhaseA', 'Grid worst phase current (A)', 'number', 'value.current');
        await mk('chargingManagement.control.gridPhaseCapEvcsW', 'Phase-based EVCS cap (W)', 'number', 'value.power');
        await mk('chargingManagement.control.phaseCapBinding', 'Phase cap binding', 'boolean', 'indicator');

        // Gate A2: §14a EnWG (optional)
        await mk('chargingManagement.control.para14aActive', '§14a active', 'boolean', 'indicator');
        await mk('chargingManagement.control.para14aMode', '§14a mode', 'string', 'text');
        await mk('chargingManagement.control.para14aCapEvcsW', '§14a EVCS cap (W)', 'number', 'value.power');
        await mk('chargingManagement.control.para14aBinding', '§14a binding', 'boolean', 'indicator');

        // Gate C: Speicher-Unterstützung (Transparenz)
        await mk('chargingManagement.control.storageAssistActive', 'Storage assist policy active', 'boolean', 'indicator');
        await mk('chargingManagement.control.storageAssistW', 'Requested stationary storage assist (W)', 'number', 'value.power');
        await mk('chargingManagement.control.storageAssistRequestedW', 'Requested stationary storage assist (W)', 'number', 'value.power');
        await mk('chargingManagement.control.storageAssistAcceptedW', 'Actually accepted stationary storage assist budget (W)', 'number', 'value.power');
        await mk('chargingManagement.control.storageAssistAcceptedRawW', 'Raw accepted stationary storage discharge command (W)', 'number', 'value.power');
        await mk('chargingManagement.control.storageAssistAcceptedTs', 'Accepted stationary storage assist timestamp', 'number', 'value.time');
        await mk('chargingManagement.control.storageAssistAcceptedAgeMs', 'Accepted stationary storage assist age (ms)', 'number', 'value.interval');
        await mk('chargingManagement.control.storageAssistAcceptedFresh', 'Accepted stationary storage assist fresh', 'boolean', 'indicator');
        await mk('chargingManagement.control.storageAssistAcceptedStatus', 'Accepted stationary storage assist status', 'string', 'text');
        await mk('chargingManagement.control.storageAssistSoCPct', 'Stationary storage SoC (%)', 'number', 'value.percent');
        await mk('chargingManagement.control.storageAssistTopology', 'Selected stationary storage topology', 'string', 'text');
        await mk('chargingManagement.control.storageAssistSocSource', 'Stationary storage SoC source', 'string', 'text');
        await mk('chargingManagement.control.storageAssistSocAgeMs', 'Stationary storage SoC age (ms)', 'number', 'value.interval');
        await mk('chargingManagement.control.storageAssistSocFresh', 'Stationary storage SoC fresh', 'boolean', 'indicator');
        await mk('chargingManagement.control.storageAssistAvailableDischargeW', 'Available stationary storage discharge power (W)', 'number', 'value.power');
        await mk('chargingManagement.control.storageAssistPowerSource', 'Stationary storage discharge source', 'string', 'text');
        await mk('chargingManagement.control.storageAssistPowerAgeMs', 'Stationary storage discharge value age (ms)', 'number', 'value.interval');
        await mk('chargingManagement.control.storageAssistPowerFresh', 'Stationary storage discharge value fresh', 'boolean', 'indicator');
        await mk('chargingManagement.control.storageProtectedLoadW', 'EVCS load protected from storage (W)', 'number', 'value.power');
        await mk('chargingManagement.control.storageProtectionRequestedWallboxes', 'Ladepunkte mit gewähltem Speicherschutz', 'number', 'value');
        await mk('chargingManagement.control.storageProtectedUnknownWallboxes', 'Geschützte Ladepunkte mit unbekannter Fahrzeuglast', 'number', 'value');
        await mk('chargingManagement.control.storagePolicyJson', 'Atomarer EVCS-Speicher-Policy-Snapshot', 'string', 'json');
        await mk('chargingManagement.control.storageProtectedWallboxes', 'EVCS wallboxes protected from storage', 'number', 'value');
        await mk('chargingManagement.control.storageProtectedLoadTs', 'EVCS storage-protection timestamp', 'number', 'value.time');
        await mk('chargingManagement.control.storageAssistRequestedLoadW', 'EVCS load allowed to use storage (W)', 'number', 'value.power');
        await this.adapter.setObjectNotExistsAsync('chargingManagement.debug', {
            type: 'channel',
            common: { name: 'Debug' },
            native: {},
        });

        await mk('chargingManagement.debug.lastRun', 'Last run', 'number', 'value.time');
        await mk('chargingManagement.debug.sortedOrder', 'Sorted order (safe keys)', 'string', 'text');
        await mk('chargingManagement.debug.allocations', 'Allocations (JSON)', 'string', 'text');
        await mk('chargingManagement.debug.tsRuntimePrepJson', 'Charging Management TS runtime preparation/shadow (JSON)', 'string', 'json');
        await this._chargingAudit.initialize();
    }

    /** Code-Teil: Methode `_ensureWallboxChannel` – stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben. */
    /** Code-Teil: _ensureWallboxChannel – Verarbeitet Wallbox-/Ladepunktdaten und Feature-Sichtbarkeit. */
    async _ensureWallboxChannel(key) {
        const safe = toSafeIdPart(key);
        const ch = `chargingManagement.wallboxes.${safe}`;
        if (this._known.has(ch)) return ch;

        await this.adapter.setObjectNotExistsAsync('chargingManagement.wallboxes', {
            type: 'channel',
            common: { name: 'Ladepunkte' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync(ch, {
            type: 'channel',
            common: { name: safe },
            native: {},
        });

        /** Code-Teil: Arrow-Funktion `mk` – stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben. */
        const mk = async (id, name, type, role, write = false, extraCommon = null) => {
            const common = Object.assign({ name, type, role, read: true, write: !!write }, extraCommon || {});
            await this.adapter.setObjectNotExistsAsync(`${ch}.${id}`, {
                type: 'state',
                common,
                native: {},
            });
        };

        await mk('name', 'Name', 'string', 'text');
        // Enabled flags
        await mk('cfgEnabled', 'Config enabled', 'boolean', 'indicator');
        await mk('userStationEnabled', 'Ladestation freigegeben (User)', 'boolean', 'switch.enable', true, { def: true, states: { true: 'An', false: 'Gesperrt' } });
        await mk('stationEnabled', 'Ladestation freigegeben (effektiv)', 'boolean', 'indicator');
        await mk('stationEnableControlAvailable', 'Ladestation-Freigabe schreibbar', 'boolean', 'indicator');
        await mk('rfidAuthorized', 'RFID autorisiert', 'boolean', 'indicator');
        await mk('rfidEnforced', 'RFID-Zugangskontrolle aktiv', 'boolean', 'indicator');
        await mk('rfidLockActive', 'RFID-Sperre wirksam', 'boolean', 'indicator');
        await mk('rfidReason', 'RFID-Entscheidungsgrund', 'string', 'text');
        await mk('availabilityOwner', 'Eigentümer der Stationsfreigabe', 'string', 'text');
        await mk('availabilityRequested', 'Angeforderte Stationsfreigabe', 'boolean', 'indicator');
        await mk('availabilityRequestReason', 'Grund der Stationsfreigabe', 'string', 'text');
        await mk('userEnabled', 'Regelung aktiv (User)', 'boolean', 'switch.enable', true, { def: true, states: { true: 'Aktiv', false: 'Aus' } });
        await mk('enabled', 'Enabled (effective)', 'boolean', 'indicator');
        await mk('online', 'Online', 'boolean', 'indicator');

        // Runtime, per-wallbox mode override (writable for VIS)
        // Values: auto | pv | minpv | boost
        await mk(
            'userMode',
            'User mode (auto|pv|minpv|boost)',
            'string',
            'text',
            true,
            {
                states: {
                    auto: 'auto (global)',
                    pv: 'pv surplus only',
                    minpv: 'min + pv',
                    boost: 'boost',
                },
            },
        );

        // Default value for the writable runtime state (do not overwrite user choice)
        try {
            const st = await this.adapter.getStateAsync(`${ch}.userMode`);
            if (!st || st.val === null || st.val === undefined || String(st.val).trim() === '') {
                await this.adapter.setStateAsync(`${ch}.userMode`, 'auto', true);
            }
        } catch {
            // ignore
        }

        // Auto bleibt der einzige Ladebetriebsmodus, in dem eine Betriebsstrategie
        // die Zielplanung übernehmen darf. Standard bleibt der migrationssichere
        // Default; alle anderen Ladebetriebsarten ignorieren diese Auswahl.
        await mk(
            'userAutoSource',
            'Auto-Quelle (standard|strategy)',
            'string',
            'text',
            true,
            {
                def: 'standard',
                states: {
                    standard: 'NexoWatt Standard-Automatik',
                    strategy: 'EOS Betriebsstrategie',
                },
            },
        );
        try {
            const st = await this.adapter.getStateAsync(`${ch}.userAutoSource`);
            if (!st || st.val === null || st.val === undefined || String(st.val).trim() === '') {
                await this.adapter.setStateAsync(`${ch}.userAutoSource`, 'standard', true);
            }
        } catch {
            // ignore
        }

        // Runtime, per-wallbox AC phase mode override (writable for VIS/LIVE UI)
        // Values: fixed-1p | fixed-3p | auto-pv
        await mk(
            'userPhaseMode',
            'User AC phase mode (fixed-1p|fixed-3p|auto-pv)',
            'string',
            'text',
            true,
            {
                states: {
                    'fixed-1p': 'fest 1-phasig',
                    'fixed-3p': 'fest 3-phasig',
                    'auto-pv': 'auto PV 1p/3p',
                },
            },
        );

        // Default value for writable phase-mode state (do not overwrite user choice).
        // Keep it empty here because the config default is known only inside the runtime tick;
        // the tick initializes it once from the configured Ladepunkt-Phasenmodus.
        try {
            const st = await this.adapter.getStateAsync(`${ch}.userPhaseMode`);
            if (!st || st.val === null || st.val === undefined) {
                await this.adapter.setStateAsync(`${ch}.userPhaseMode`, '', true);
            }
        } catch {
            // ignore
        }

        // Default value for userEnabled (writable)
        try {
            const st = await this.adapter.getStateAsync(`${ch}.userEnabled`);
            const cur = st ? st.val : null;
            if (cur === null || cur === undefined || String(cur).trim() === '') {
                await this.adapter.setStateAsync(`${ch}.userEnabled`, true, true);
            }
        } catch {
            // ignore
        }

        // Die Ladestationsfreigabe ist bewusst von der EMS-Regelungsfreigabe
        // getrennt. PV-Warten (Sollwert 0) darf die Wallbox nicht als kundenseitig
        // ausgeschaltet darstellen. Nur eine ausdrueckliche Kundenaktion setzt
        // userStationEnabled=false.
        try {
            const st = await this.adapter.getStateAsync(`${ch}.userStationEnabled`);
            const cur = st ? st.val : null;
            if (cur === null || cur === undefined || String(cur).trim() === '') {
                await this.adapter.setStateAsync(`${ch}.userStationEnabled`, true, true);
            }
        } catch {
            // ignore
        }

        // Zeit-Ziel Laden (Depot-/Deadline-Laden) — optional und im Endkunden-UI steuerbar
        await mk('goalEnabled', 'Zeit-Ziel Laden aktiv (User)', 'boolean', 'switch.enable', true, { def: false, states: { true: 'An', false: 'Aus' } });
        await mk('goalTargetSocPct', 'Ziel-SoC (%)', 'number', 'value.percent', true, { def: 100, min: 0, max: 100, unit: '%' });
        await mk('goalFinishTs', 'Fertig bis (Zeitpunkt ms)', 'number', 'value.time', true, { def: 0 });
        await mk('goalBatteryKwh', 'Akkukapazität (kWh) (optional)', 'number', 'value', true, { def: 0, unit: 'kWh' });

        // Vehicle connection (derived from evcs.<index>.active when mapped via main.js)
        await mk('vehiclePlugged', 'Fahrzeug verbunden', 'boolean', 'indicator');
        await mk('vehiclePluggedSource', 'Fahrzeug verbunden (Quelle)', 'string', 'text');
        await mk('vehicleDemandConfirmed', 'Fahrzeug fordert EMS-Leistung an', 'boolean', 'indicator');
        await mk('vehicleDemandSource', 'Ladebedarf bestätigt (Quelle)', 'string', 'text');
        await mk('vehicleDemandReason', 'Ladebedarf bestätigt (Grund)', 'string', 'text');
        await mk('vehicleStartEligible', 'Fahrzeug darf kontrolliert angestartet werden', 'boolean', 'indicator');
        await mk('vehicleStartEligibilityReason', 'Startfreigabe (Grund)', 'string', 'text');
        await mk('vehicleStartProbeActive', 'Universeller Startversuch aktiv', 'boolean', 'indicator');
        await mk('vehicleStartProbeSince', 'Universeller Startversuch seit (ms)', 'number', 'value.time');
        await mk('vehicleStartCooldownUntil', 'Universeller Start-Cooldown bis (ms)', 'number', 'value.time');
        await mk('vehicleStartResponseTimeoutSec', 'Start-Antwortzeit (s)', 'number', 'value.interval');
        await mk('chargingStateRaw', 'OCPP/Hersteller-Ladezustand Rohwert', 'string', 'text');
        await mk('chargingStateSourceId', 'OCPP/Hersteller-Ladezustand Datenpunkt', 'string', 'text');
        await mk('chargingStateAgeMs', 'OCPP/Hersteller-Ladezustand Alter (ms)', 'number', 'value.time');
        await mk('vehicleStateNormalized', 'Normalisierter Fahrzeug-/Ladezustand', 'string', 'text');
        await mk('vehicleConnectedRaw', 'Fahrzeug verbunden Rohwert', 'string', 'text');
        await mk('vehicleConnectedKnown', 'Fahrzeug verbunden Wert erkannt', 'boolean', 'indicator');
        await mk('vehicleConnectedAgeMs', 'Fahrzeug verbunden Alter (ms)', 'number', 'value.time');
        await mk('vehicleConnectedFresh', 'Fahrzeug verbunden Wert gültig', 'boolean', 'indicator');
        await mk('vehicleConnectedSourceId', 'Fahrzeug verbunden Datenpunkt', 'string', 'text');
        await mk('chargeDemandRaw', 'Ladebedarf Rohwert', 'string', 'text');
        await mk('chargeDemandKnown', 'Ladebedarf Wert erkannt', 'boolean', 'indicator');
        await mk('chargeDemandAgeMs', 'Ladebedarf Alter (ms)', 'number', 'value.time');
        await mk('chargeDemandFresh', 'Ladebedarf Wert gültig', 'boolean', 'indicator');
        await mk('chargeDemandSourceId', 'Ladebedarf Datenpunkt', 'string', 'text');
        await mk('pvStartReservationW', 'PV-Startreservierung (W)', 'number', 'value.power');
        await mk('goalSocAvailable', 'Fahrzeug-SoC verfügbar', 'boolean', 'indicator');

        // Ziel-Laden: berechnete Werte (read-only)
        await mk('goalActive', 'Zeit-Ziel aktiv (berechnet)', 'boolean', 'indicator');
        await mk('goalRemainingMin', 'Restzeit (min)', 'number', 'value');
        await mk('goalRequiredPowerW', 'Benötigte Leistung (W)', 'number', 'value.power');
        await mk('goalRequiredEnergyWh', 'Benötigte Restenergie (Wh)', 'number', 'value.energy');
        await mk('goalDesiredPowerW', 'Ziel-Leistung (W)', 'number', 'value.power');
        await mk('goalShortfallW', 'Leistungsdefizit (W)', 'number', 'value.power');
        await mk('goalStatus', 'Zeit-Ziel Status', 'string', 'text');
        await mk('goalPlanAction', 'Zeit-Ziel Planaktion', 'string', 'text');
        await mk('goalPlanReason', 'Zeit-Ziel Planungsgrund', 'string', 'text');
        await mk('goalPlanSource', 'Zeit-Ziel Planquelle', 'string', 'text');
        await mk('goalPlanTargetPowerW', 'Zeit-Ziel Leistung jetzt (W)', 'number', 'value.power');
        await mk('goalPlanPlannedPvWh', 'Zeit-Ziel geplante PV-Energie (Wh)', 'number', 'value.energy');
        await mk('goalPlanPlannedGridWh', 'Zeit-Ziel geplante Netzenergie (Wh)', 'number', 'value.energy');
        await mk('goalPlanLatestStartTs', 'Zeit-Ziel spätester sicherer Start', 'number', 'value.time');
        await mk('goalPlanNextWindowStartTs', 'Zeit-Ziel nächstes Ladefenster Start', 'number', 'value.time');
        await mk('goalPlanNextWindowEndTs', 'Zeit-Ziel nächstes Ladefenster Ende', 'number', 'value.time');
        await mk('goalPlanDeadlineOverride', 'Zeit-Ziel Deadline-Override', 'boolean', 'indicator');
        await mk('goalPlanTargetReachable', 'Zeit-Ziel erreichbar', 'boolean', 'indicator');
        await mk('goalPlanPvForecastUsed', 'Zeit-Ziel PV-Prognose verwendet', 'boolean', 'indicator');
        await mk('goalPlanPriceForecastUsed', 'Zeit-Ziel Preisprognose verwendet', 'boolean', 'indicator');
        await mk('goalPlanFallbackMode', 'Zeit-Ziel Fallbackmodus', 'string', 'text');

        // Defaults for writable goal states (do not overwrite user choice)
        try {
            const st = await this.adapter.getStateAsync(`${ch}.goalEnabled`);
            const cur = st ? st.val : null;
            if (cur === null || cur === undefined || String(cur).trim() === '') {
                await this.adapter.setStateAsync(`${ch}.goalEnabled`, false, true);
            }
        } catch {
            // ignore
        }

        try {
            const st = await this.adapter.getStateAsync(`${ch}.goalTargetSocPct`);
            const cur = st ? Number(st.val) : NaN;
            if (!Number.isFinite(cur)) {
                await this.adapter.setStateAsync(`${ch}.goalTargetSocPct`, 100, true);
            }
        } catch {
            // ignore
        }

        try {
            const st = await this.adapter.getStateAsync(`${ch}.goalFinishTs`);
            const cur = st ? Number(st.val) : NaN;
            if (!Number.isFinite(cur)) {
                await this.adapter.setStateAsync(`${ch}.goalFinishTs`, 0, true);
            }
        } catch {
            // ignore
        }

        try {
            const st = await this.adapter.getStateAsync(`${ch}.goalBatteryKwh`);
            const cur = st ? Number(st.val) : NaN;
            if (!Number.isFinite(cur)) {
                await this.adapter.setStateAsync(`${ch}.goalBatteryKwh`, 0, true);
            }
        } catch {
            // ignore
        }

        await mk('effectiveMode', 'Effective mode', 'string', 'text');
        await mk('strategyEligible', 'Betriebsstrategie darf in Auto teilnehmen', 'boolean', 'indicator');
        await mk('strategyActive', 'Betriebsstrategie-Anforderung aktiv', 'boolean', 'indicator');
        await mk('strategyFallbackActive', 'Betriebsstrategie-Rückfall aktiv', 'boolean', 'indicator');
        await mk('strategyAction', 'Betriebsstrategie Aktion', 'string', 'text');
        await mk('strategyRequestedPowerW', 'Betriebsstrategie Zielleistung (W)', 'number', 'value.power');
        await mk('strategyTargetSocPct', 'Betriebsstrategie Ziel-SoC (%)', 'number', 'value.percent');
        await mk('strategyStatus', 'Betriebsstrategie Status', 'string', 'text');
        await mk('strategyReason', 'Betriebsstrategie Grund', 'string', 'text');
        await mk('strategyExpiresAt', 'Betriebsstrategie gültig bis', 'number', 'value.time');
        await mk('goalTariffOverride', 'Ziel: Tarif-Sperre übersteuert', 'boolean', 'indicator');
        await mk('goalTariffOverrideReason', 'Ziel: Tarif-Override Grund', 'string', 'text');
        await mk('priority', 'Priority', 'number', 'value');
        await mk('chargerType', 'Charger type', 'string', 'text');
        await mk('controlBasis', 'Control basis', 'string', 'text');
        await mk('stationKey', 'Station key', 'string', 'text');
        await mk('connectorNo', 'Connector no.', 'number', 'value');
        await mk('stationMaxPowerW', 'Station max power (W)', 'number', 'value.power');
        await mk('stationRemainingW', 'Station remaining (W)', 'number', 'value.power');
        await mk('allowBoost', 'Boost allowed', 'boolean', 'indicator');
        await mk('boostActive', 'Boost active', 'boolean', 'indicator');
        await mk('boostPrearmed', 'Boost setpoint active without confirmed vehicle demand', 'boolean', 'indicator');
        await mk('boostSince', 'Boost since (ms)', 'number', 'value.time');
        await mk('boostUntil', 'Boost until (ms)', 'number', 'value.time');
        await mk('boostRemainingMin', 'Boost remaining (min)', 'number', 'value');
        await mk('boostTimeoutMin', 'Boost timeout (min) (effective)', 'number', 'value');
        await mk('boostMaxPowerW', 'Boost-Netzanteilgrenze bei Nulleinspeisung (W)', 'number', 'value.power');
        await mk('zeroExportGridLimitActive', 'Nulleinspeise-Netzanteilgrenze aktiv', 'boolean', 'indicator');
        await mk('zeroExportGridMaxW', 'Maximaler Netzanteil dieses Ladepunkts (W)', 'number', 'value.power');
        await mk('zeroExportPvCreditW', 'Zugeordneter PV-Anteil des Lade-Sollwerts (W)', 'number', 'value.power');
        await mk('zeroExportStorageCreditW', 'Bestätigter Speicheranteil bei Nulleinspeisung (W)', 'number', 'value.power');
        await mk('pvRestartRemainingSec', 'PV-Wiederanlaufsperre verbleibend (s)', 'number', 'value');
        await mk('pvBridgePowerW', 'Begrenzter Netzanteil zum PV-Taktschutz (W)', 'number', 'value.power');
        await mk('phases', 'Phases', 'number', 'value');
        await mk('phaseMode', 'AC Phasenmodus effektiv (fixed-1p|fixed-3p|auto-pv)', 'string', 'text');
        await mk('phaseSwitchSupported', 'AC Phasenumschaltung unterstützt/zugeordnet', 'boolean', 'indicator');
        await mk('currentPhaseCount', 'Aktuelle AC-Phasen', 'number', 'value');
        await mk('targetPhaseCount', 'Ziel AC-Phasen', 'number', 'value');
        await mk('phaseSwitchState', 'Phasenumschaltung Status', 'string', 'text');
        await mk('phaseSwitchReason', 'Phasenumschaltung Grund', 'string', 'text');
        await mk('phaseCooldownRemainingMs', 'Phasenumschaltung Cooldown Rest (ms)', 'number', 'value.time');

        // Speicher-Mitnutzung pro Ladepunkt: Installer-Freigabe + Kundenwahl + effektive Regelentscheidung
        await mk('storageAssistCustomerAllowed', 'Speicher-Mitnutzung im Kunden-UI freigegeben', 'boolean', 'indicator');
        await mk('userStorageAssistEnabled', 'Speicher für Laden mitnutzen (User)', 'boolean', 'switch.enable', true, { def: false, states: { true: 'Mitnutzen', false: 'Nicht mitnutzen' } });
        await mk('storagePolicyMode', 'Speicher-Policy (normal|protect|assist)', 'string', 'text');
        await mk('storageProtectionRequested', 'Speicher-Schutz für Ladepunkt explizit aktiv', 'boolean', 'indicator');
        await mk('storagePolicyActualLoadW', 'Tatsächliche EV-Fahrzeuglast für Speicher-Policy (W)', 'number', 'value.power');
        await mk('storagePolicyActualLoadActive', 'Tatsächliche EV-Fahrzeuglast für Speicher-Policy aktiv', 'boolean', 'indicator');
        await mk('storagePolicyLoadUnknown', 'Speicherschutz: Fahrzeuglast unbekannt', 'boolean', 'indicator');
        await mk('storagePolicyActualLoadReason', 'Tatsächliche EV-Fahrzeuglast für Speicher-Policy Grund', 'string', 'text');
        await mk('effectiveStorageAssist', 'Speicher-Mitnutzung effektiv', 'boolean', 'indicator');
        await mk('storageAssistBlockedReason', 'Speicher-Mitnutzung Grund', 'string', 'text');
        await mk('batteryContributionW', 'Speicheranteil EVCS (W)', 'number', 'value.power');
        try {
            const st = await this.adapter.getStateAsync(`${ch}.userStorageAssistEnabled`);
            const cur = st ? st.val : null;
            if (cur === null || cur === undefined || String(cur).trim() === '') {
                await this.adapter.setStateAsync(`${ch}.userStorageAssistEnabled`, false, true);
            }
        } catch {
            // ignore
        }

        await mk('minPowerW', 'Min power (W)', 'number', 'value.power');
        await mk('electricalLimitsValid', 'Ladepunkt-Grenzwerte gültig', 'boolean', 'indicator');
        await mk('electricalLimitsError', 'Ladepunkt-Grenzwerte: Diagnose', 'string', 'text');
        await mk('maxPowerW', 'Max power (W)', 'number', 'value.power');
        await mk('para14aCapW', '§14a cap (W)', 'number', 'value.power');
        await mk('para14aCapped', '§14a cap aktiv', 'boolean', 'indicator');
        await mk('actualPowerRawW', 'Rohleistung des Quelladapters (W)', 'number', 'value.power');
        await mk('actualPowerW', 'Effektive aktuelle Ladeleistung (W)', 'number', 'value.power');
        await mk('actualCurrentA', 'Actual current (A)', 'number', 'value.current');
        await mk('charging', 'Charging', 'boolean', 'indicator');
        await mk('chargingSince', 'Charging since (ms)', 'number', 'value.time');
        await mk('chargingRaw', 'Charging raw (threshold)', 'boolean', 'indicator');
        await mk('lastActive', 'Last active (ms)', 'number', 'value.time');
        await mk('idleMs', 'Idle since last active (ms)', 'number', 'value.time');
        await mk('allocationRank', 'Allocation rank', 'number', 'value');
        await mk('targetCurrentA', 'Target current (A)', 'number', 'value.current');
        await mk('targetPowerW', 'Target power (W)', 'number', 'value.power');
        await mk('applied', 'Applied', 'boolean', 'indicator');
        await mk('applyStatus', 'Apply status', 'string', 'text');
        await mk('applyWrites', 'Apply writes (json)', 'string', 'text');
        await mk('reason', 'Reason', 'string', 'text');

        // Diagnostics
        await mk('mappingOk', 'Mapping OK', 'boolean', 'indicator');
        await mk('hasSetpoint', 'Has setpoint', 'boolean', 'indicator');
        await mk('mappingIssues', 'Mapping issues (json)', 'string', 'text');
        await mk('telemetryProfile', 'Erkanntes EVCS-Telemetrieprofil', 'string', 'text');
        await mk('telemetryAutoDetected', 'Telemetrieprofil automatisch erkannt', 'boolean', 'indicator');
        await mk('ocppConnectorRoot', 'Erkannter OCPP-Connectorpfad', 'string', 'text');
        await mk('ocppAdapterKind', 'Erkannte OCPP-Adapterstruktur', 'string', 'text');
        await mk('ocppDatapointContract', 'Erkannter OCPP-Datenpunktvertrag', 'string', 'text');
        await mk('ocppDatapointMappingMigrated', 'Alte OCPP-/Alias-Zuordnung auf nativen OCPP21-Vertrag migriert', 'boolean', 'indicator');
        await mk('ocppDatapointMappingMigrations', 'OCPP-Datenpunktmigrationen (json)', 'string', 'json');
        await mk('setpointRefreshMs', 'Sollwert-Keepalive (ms)', 'number', 'value.interval');
        await mk('ocppLastCommand', 'Letzter OCPP-Befehl', 'string', 'text');
        await mk('ocppLastCommandAt', 'Letzter OCPP-Befehl Zeitpunkt', 'number', 'value.time');
        await mk('ocppLastCommandSuccess', 'Letzter OCPP-Befehl erfolgreich', 'boolean', 'indicator');
        await mk('ocppLastCommandError', 'Letzter OCPP-Befehlsfehler', 'string', 'text');
        await mk('ocppRequestedChargeLimitW', 'OCPP angeforderte Ladegrenze (W)', 'number', 'value.power');
        await mk('ocppAppliedChargeLimitW', 'OCPP angewendete Ladegrenze (W)', 'number', 'value.power');
        await mk('ocppChargeLimitReason', 'OCPP Ladegrenzenentscheidung', 'string', 'text');
        await mk('ocppChargeLimitClamped', 'OCPP Ladegrenze abweichend/begrenzt', 'boolean', 'indicator');
        await mk('hardwareCommandConfirmed', 'Hardwarebefehl bestätigt', 'boolean', 'indicator');
        await mk('hardwareCommandState', 'Hardwarebefehl Status', 'string', 'text');
        await mk('hardwareCommandAgeMs', 'Hardwarebefehl Alter (ms)', 'number', 'value.time');
        await mk('onlineSourceId', 'Verwendeter Online-/Verbindungs-Datenpunkt', 'string', 'text');
        await mk('onlineIdWasDataFresh', 'Fehlzuordnung dataFresh als Online automatisch getrennt', 'boolean', 'indicator');
        await mk('onlineSourceMigrated', 'Volatilen OCPP-Online-Datenpunkt automatisch auf WebSocket-Verbindung migriert', 'boolean', 'indicator');
        await mk('dataFreshSourceId', 'OCPP-Datenaktualitäts-Datenpunkt', 'string', 'text');
        await mk('dataFresh', 'OCPP-Leistungsdaten aktuell', 'boolean', 'indicator');
        await mk('dataFreshKnown', 'OCPP-Datenaktualität bekannt', 'boolean', 'indicator');
        await mk('dataFreshAgeMs', 'OCPP-Datenaktualität Alter (ms)', 'number', 'value.time');
        await mk('powerRawW', 'Rohleistung des Quelladapters (W)', 'number', 'value.power');
        await mk('powerEffectiveW', 'Für EMS verwendete Effektivleistung (W)', 'number', 'value.power');
        await mk('powerSource', 'Quelle der Effektivleistung', 'string', 'text');
        await mk('powerAuthoritativeZero', 'Status/Transaktion bestätigt 0 W', 'boolean', 'indicator');
        await mk('meterAgeMs', 'Meter age (ms)', 'number', 'value');
        await mk('meterRawStale', 'Roh-Leistungswert veraltet', 'boolean', 'indicator');
        await mk('meterStale', 'Effektive Leistung veraltet/unsicher', 'boolean', 'indicator');
        await mk('transactionActive', 'OCPP-Transaktion aktiv', 'boolean', 'indicator');
        await mk('transactionActiveKnown', 'OCPP-Transaktionszustand bekannt', 'boolean', 'indicator');
        await mk('transactionActiveAgeMs', 'OCPP-Transaktionszustand Alter (ms)', 'number', 'value.time');
        await mk('transactionActiveSourceId', 'OCPP-Transaktions-Datenpunkt', 'string', 'text');
        await mk('ocppAdapterAlive', 'OCPP-Adapter aktiv', 'boolean', 'indicator.connected');
        await mk('ocppAdapterAliveKnown', 'OCPP-Adapterstatus bekannt', 'boolean', 'indicator');
        await mk('ocppAdapterAliveSourceId', 'OCPP-Adapter-Lebenszeichen-Datenpunkt', 'string', 'text');
        await mk('statusAgeMs', 'Status age (ms)', 'number', 'value');
        await mk('statusStale', 'Status stale', 'boolean', 'indicator');
        await mk('statusRaw', 'Raw status from assigned AppCenter datapoint', 'string', 'text');
        await mk('statusSourceId', 'Assigned AppCenter status datapoint', 'string', 'text');
        await mk('statusSourceConnectorNo', 'Connector number inferred from status datapoint', 'number', 'value');
        await mk('statusConnectorMismatch', 'Status datapoint belongs to another connector', 'boolean', 'indicator');
        await mk('statusSharedAcrossConnectors', 'Same status datapoint assigned to multiple connectors', 'boolean', 'indicator');
        await mk('statusScope', 'Status datapoint scope', 'string', 'text');
        await mk('statusIgnoredReason', 'Reason why the assigned status is ignored', 'string', 'text');
        await mk('statusFresh', 'Status value fresh', 'boolean', 'indicator');
        await mk('statusFreshReason', 'Status freshness reason', 'string', 'text');
        await mk('heartbeatSourceId', 'Heartbeat datapoint', 'string', 'text');
        await mk('heartbeatRaw', 'Heartbeat / LastSeen raw value', 'string', 'text');
        await mk('heartbeatAgeMs', 'Heartbeat age (ms)', 'number', 'value.time');
        await mk('heartbeatFresh', 'Heartbeat fresh', 'boolean', 'indicator');
        await mk('vehicleLivenessFresh', 'Vehicle-state liveness confirmed', 'boolean', 'indicator');
        await mk('statusEffective', 'Effective fresh connector status', 'string', 'text');
        await mk('statusClass', 'Normalized connector status class', 'string', 'text');
        await mk('onlineSource', 'Source used for wallbox reachability', 'string', 'text');
        await mk('faultActive', 'Current fresh wallbox fault', 'boolean', 'indicator');
        await mk('faultReason', 'Wallbox fault/status detail', 'string', 'text');
        await mk('unavailableActive', 'Current fresh connector unavailable state', 'boolean', 'indicator');
        await mk('unavailableReason', 'Connector unavailable/status detail', 'string', 'text');
        await mk('operationalBlocked', 'Fresh connector state blocks positive charging setpoints', 'boolean', 'indicator');

        this._known.add(ch);
        return ch;
    }

    /** Code-Teil: Methode `_ensureStationChannel` – stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben. */
    /** Code-Teil: _ensureStationChannel – Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen. */
    async _ensureStationChannel(stationKey) {
        const safe = toSafeIdPart(stationKey);
        const ch = `chargingManagement.stations.${safe}`;
        if (this._knownStations.has(ch)) return ch;

        await this.adapter.setObjectNotExistsAsync('chargingManagement.stations', {
            type: 'channel',
            common: { name: 'Stations' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync(ch, {
            type: 'channel',
            common: { name: safe || String(stationKey || '') || 'station' },
            native: {},
        });

        /** Code-Teil: Arrow-Funktion `mk` – stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben. */
        /** Code-Teil: mk – Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen. */
        const mk = async (id, name, type, role) => {
            await this.adapter.setObjectNotExistsAsync(`${ch}.${id}`, {
                type: 'state',
                common: { name, type, role, read: true, write: false },
                native: {},
            });
        };

        await mk('stationKey', 'Station key', 'string', 'text');
        await mk('name', 'Name', 'string', 'text');
        await mk('maxPowerW', 'Max power (W)', 'number', 'value.power');
        await mk('remainingW', 'Remaining (W)', 'number', 'value.power');
        await mk('usedW', 'Used (W)', 'number', 'value.power');
        await mk('binding', 'Binding', 'boolean', 'indicator');
        await mk('headroomW', 'Headroom (W)', 'number', 'value.power');
        await mk('targetSumW', 'Target sum (W)', 'number', 'value.power');
        await mk('connectorCount', 'Connector count', 'number', 'value');
        await mk('boostConnectors', 'Boost connectors', 'number', 'value');
        await mk('pvLimitedConnectors', 'PV-limited connectors', 'number', 'value');
        await mk('connectors', 'Connectors (safe keys)', 'string', 'text');
        await mk('lastUpdate', 'Last update', 'number', 'value.time');

        this._knownStations.add(ch);
        return ch;
    }

    /** Code-Teil: Methode `_getPeakShavingActive` – liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik. */
    /** Code-Teil: _getPeakShavingActive – Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen. */
    async _getPeakShavingActive() {
        // Prefer centralized snapshot (Phase 4.0)
        try {
            const caps = (this.adapter && this.adapter._emsCaps && typeof this.adapter._emsCaps === 'object') ? this.adapter._emsCaps : null;
            if (caps && caps.peak && typeof caps.peak.active === 'boolean') {
                return caps.peak.active;
            }
        } catch {
            // ignore
        }
        try {
            const st = await this.adapter.getStateAsync('peakShaving.control.active');
            return st ? !!st.val : false;
        } catch {
            return false;
        }
    }

    /** Code-Teil: Methode `_getPeakShavingBudgetW` – liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik. */
    /** Code-Teil: _getPeakShavingBudgetW – Verarbeitet Energiefluss-/Budgetwerte und beeinflusst Live-Anzeige sowie History. */
    async _getPeakShavingBudgetW() {
        // Prefer centralized snapshot (Phase 4.0)
        try {
            const caps = (this.adapter && this.adapter._emsCaps && typeof this.adapter._emsCaps === 'object') ? this.adapter._emsCaps : null;
            if (caps && caps.peak && typeof caps.peak.budgetW === 'number' && Number.isFinite(caps.peak.budgetW)) {
                return caps.peak.budgetW;
            }
        } catch {
            // ignore
        }
        try {
            const st = await this.adapter.getStateAsync('peakShaving.dynamic.availableForControlledW');
            const n = st ? Number(st.val) : NaN;
            return Number.isFinite(n) ? n : null;
        } catch {
            return null;
        }
    }

    /** Code-Teil: _runChargingBudgetTsProductive – Dokumentiert diesen Regelungs- oder Diagnosebaustein. */
    async _runChargingBudgetTsProductive(input, jsRuntime) {
        let payload = null;
        try {
            if (!chargingBudgetTsMirror || typeof chargingBudgetTsMirror.buildChargingBudgetProductiveDecision !== 'function') {
                payload = {
                    source: 'ts-charging-budget-productive-v1',
                    available: false,
                    ok: false,
                    productive: false,
                    fallback: true,
                    fallbackReason: 'missing-ts-mirror',
                    shadow: { source: 'ts-charging-budget-shadow-v1', available: false, ok: false, mismatchCount: 0, mismatches: [], ts: null },
                };
            } else {
                payload = chargingBudgetTsMirror.buildChargingBudgetProductiveDecision(jsRuntime || {}, input || {});
            }
        } catch (e) {
            payload = {
                source: 'ts-charging-budget-productive-v1',
                available: false,
                ok: false,
                productive: false,
                fallback: true,
                fallbackReason: 'ts-runtime-error',
                error: e && e.message ? e.message : String(e),
                shadow: { source: 'ts-charging-budget-shadow-v1', available: false, ok: false, mismatchCount: 0, mismatches: [], ts: null },
            };
        }
        this._chargingBudgetTsProductiveLast = payload;
        try {
            await this._queueState('chargingManagement.control.tsBudgetJson', JSON.stringify(payload || {}), true);
            await this._queueState('chargingManagement.control.tsBudgetSource', payload && payload.productive ? 'ts-budget-caps' : 'js-runtime', true);
        } catch (_e) {
            // Diagnose darf die produktive Ladepunktregelung nicht stören.
        }
        return payload;
    }

    /** Code-Teil: _runChargingBudgetTsShadow – Kompatibilitäts-Wrapper für ältere interne Aufrufe. Neue Runtime nutzt */
    async _runChargingBudgetTsShadow(input, jsRuntime) {
        return this._runChargingBudgetTsProductive(input, jsRuntime);
    }

    /**
     * Step 2.2.1:
     * - Mixed AC/DC operation via per-wallbox chargerType + controlBasis
     * - Budget distribution in W (supports DC fast chargers up to 1000 kW and beyond)
     */
    /** Code-Teil: Methode `tick` – enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden. */
    /** Code-Teil: tick – Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen. */
    /**
     * Ablauf und Zusammenhang: Führt die zusammenhängende Ladeentscheidung aus: Konfiguration und Fahrzeugbedarf lesen, Modus/Zielplanung anwenden, Budget verteilen, Grenzen und Phasen prüfen, Sollwerte ausführen und Diagnosen veröffentlichen. Anzeige und Hardwarebestätigung beziehen sich auf diese Entscheidung.
     */
    async tick() {
        if (!this._isEnabled()) return;

        const cfg = this.adapter.config.chargingManagement || {};
        // Alte Gateway-EVCS-vor-Speicher-Priorität deaktiviert.
        // Der Hybrid-/Gateway-Priorität-Haken steuert ab 0.6.255 ausschließlich die
        // Speicher-Sonderpolicy (Gateway-No-Write / Zusatz-PV-Laden / Low-PV-Regelung).
        // Standard-/Farm-/Wallbox-Verhalten bleibt dadurch unverändert.
        const feneconEvPriorityActive = false;

        // NOTE:
        // "off" is not intended to be a user-facing operating mode. On/Off is handled
        // via the App-Center toggle (adapter.config.enableChargingManagement).
        // If we still get "off" here while at least one setpoint is mapped, fall back
        // to "mixed" so Boost/Auto behave as expected.
        let mode = String(cfg.mode || 'off'); // pvSurplus | mixed
        try {
            const hasAnySetpoint = !!(this.adapter && this.adapter.config && this.adapter.config._chargingHasAnySetpoint);
            const cmEnabled = (this.adapter && this.adapter.config && this.adapter.config.enableChargingManagement !== false);
            if (mode === 'off' && cmEnabled && hasAnySetpoint) {
                mode = 'mixed';
            }
        } catch (_e) {}
        const wallboxes = Array.isArray(cfg.wallboxes) ? cfg.wallboxes : [];

        // Ziel‑Laden: "standard" = gleichmäßige Ø‑Leistung, "smart" = nutzt Tarif‑Freigaben (wenn vorhanden)
        // und kann Sperren bei knappen Deadlines automatisch aufheben.
        const goalStrategy = (String(cfg.goalStrategy || 'standard').trim().toLowerCase() === 'smart') ? 'smart' : 'standard';

        // Priorisierung / Tarif‑Bonus (Ziel‑Laden):
        // Zeit‑Ziel Laden muss (wenn möglich) die Deadline erreichen – auch wenn ein dynamischer Tarif
        // das Netzladen gerade sperrt. Gleichzeitig soll der Tarif als Optimierungs‑Bonus wirken:
        // wir laden bevorzugt in günstigen Fenstern und heben die Sperre nur dann auf, wenn es sonst
        // nicht bis zur Deadline reicht (Forecast/Latest‑Start).
        //
        // Policy:
        // - goalTariffOverrideMode = 'forecast' (default): Tarif wirkt; Override nur wenn nötig
        // - goalTariffOverrideMode = 'always': Ziel übersteuert Tarif immer (Legacy)
        // - goalTariffOverrideMode = 'never' : Ziel respektiert Tarif immer (kann Deadline verfehlen)
        //
        // Backwards compat: legacy boolean `goalTariffOverrideAlways`:
        //   true  -> 'always'
        //   false -> 'forecast'
        const goalTariffOverrideModeRaw = String(cfg.goalTariffOverrideMode || '').trim().toLowerCase();
        let goalTariffOverrideMode = (goalTariffOverrideModeRaw === 'always' || goalTariffOverrideModeRaw === 'forecast' || goalTariffOverrideModeRaw === 'never')
            ? goalTariffOverrideModeRaw
            : 'forecast';
        if (cfg.goalTariffOverrideAlways === true) goalTariffOverrideMode = 'always';
        if (cfg.goalTariffOverrideAlways === false) goalTariffOverrideMode = 'forecast';

        // Forecast/Notfall‑Parameter (konservative Defaults; optional über Installer konfigurierbar)
        const goalForecastSafetyFactor = clamp(num(cfg.goalForecastSafetyFactor, 1.10), 1, 2);
        const goalForecastReserveMin = clamp(num(cfg.goalForecastReserveMin, 10), 0, 24 * 60);
        const goalForecastMinCoverage = clamp(num(cfg.goalForecastMinCoverage, 0.75), 0, 1);

        // When a vehicle is plugged in, some EVs/wallboxes update SoC with a delay.
        // We wait briefly for a fresh SoC update (if the stored SoC timestamp predates plug-in) and then
        // fall back to "no-SoC" planning. Keep this short so Zielladen remains responsive on systems
        // that do not provide a real SoC at all (often reporting a static 0%).
        const goalSocWaitFallbackSec = clamp(num(cfg.goalSocWaitFallbackSec, 30), 0, 15 * 60);

        // Smart‑Parameter (Optimierung)
        const goalCheapBoostFactor = clamp(num(cfg.goalCheapBoostFactor, 1.25), 1, 3);
        const goalCheapPriceFactor = clamp(num(cfg.goalCheapPriceFactor, 0.90), 0.1, 2);

        // Legacy Fallback‑Schwellen (wenn kein Forecast verfügbar ist)
        const goalTariffOverrideUrgency = clamp(num(cfg.goalTariffOverrideUrgency, 0.70), 0, 1);
        const goalTariffOverrideMinRemainingMin = clamp(num(cfg.goalTariffOverrideMinRemainingMin, 60), 0, 7 * 24 * 60);

        // -----------------------------------------------------------------
        // §14a EnWG snapshot (provided by Para14aModule)
        // -----------------------------------------------------------------
        const p14a = (this.adapter && this.adapter._para14a && typeof this.adapter._para14a === 'object') ? this.adapter._para14a : null;
        const para14aActive = !!(p14a && p14a.active);
        const para14aMode = para14aActive ? String(p14a.mode || '') : '';
        const para14aCapsBySafe = (para14aActive && p14a && p14a.evcsCapsBySafe && typeof p14a.evcsCapsBySafe === 'object') ? p14a.evcsCapsBySafe : {};
        const para14aTotalCapW = (para14aActive && p14a && typeof p14a.evcsTotalCapW === 'number' && Number.isFinite(p14a.evcsTotalCapW) && p14a.evcsTotalCapW > 0)
            ? p14a.evcsTotalCapW
            : null;

        // Stationsgruppen (optional): gemeinsame Leistungsgrenze pro Station (z. B. DC‑Station mit mehreren Ladepunkten)
        // Hinweis: Stationsgruppen werden im Installer-UI unter settingsConfig gepflegt.
        // Für maximale Robustheit akzeptieren wir beides:
        // - chargingManagement.stationGroups (direktes Modul-Config)
        // - settingsConfig.stationGroups (Installer/EVCS-Konfiguration)
        let stationGroups = Array.isArray(cfg.stationGroups) ? cfg.stationGroups : [];
        if (!stationGroups || !stationGroups.length) {
            const sc = (this.adapter && this.adapter.config && this.adapter.config.settingsConfig && typeof this.adapter.config.settingsConfig === 'object')
                ? this.adapter.config.settingsConfig
                : null;
            if (sc && Array.isArray(sc.stationGroups)) stationGroups = sc.stationGroups;
        }
        if (!stationGroups || !stationGroups.length) {
            if (this.adapter && Array.isArray(this.adapter.stationGroups)) stationGroups = this.adapter.stationGroups;
        }
        /** @type {Map<string, number>} */
        const stationCapByKey = new Map();
        /** @type {Map<string, string>} */
        const stationNameByKey = new Map();
        for (const g of stationGroups) {
            if (!g) continue;
            const sk = String(g.stationKey || '').trim();
            if (!sk) continue;
            const sName = (typeof g.name === 'string' && g.name.trim()) ? g.name.trim() : '';
            if (sName) stationNameByKey.set(sk, sName);

            // Allow config in W (maxPowerW) or kW (maxPowerKw)
            let capW = null;
            if (g.maxPowerW !== undefined && g.maxPowerW !== null && String(g.maxPowerW).trim() !== '' && Number.isFinite(Number(g.maxPowerW))) {
                capW = Number(g.maxPowerW);
            } else if (g.maxPowerKw !== undefined && g.maxPowerKw !== null && String(g.maxPowerKw).trim() !== '' && Number.isFinite(Number(g.maxPowerKw))) {
                capW = Number(g.maxPowerKw) * 1000;
            }
            capW = clamp(num(capW, null), 0, 1e12);

            if (!Number.isFinite(capW) || capW <= 0) continue;

            const prev = stationCapByKey.get(sk);
            stationCapByKey.set(sk, (typeof prev === 'number' && Number.isFinite(prev)) ? Math.min(prev, capW) : capW);
        }

        const voltageV = clamp(num(cfg.voltageV, 230), 50, 400);
        const defaultPhases = Number(cfg.defaultPhases || 3) === 1 ? 1 : 3;
        const defaultMinA = clamp(num(cfg.minCurrentA, 6), 0, 2000);
        const defaultMaxA = clamp(num(cfg.maxCurrentA, 16), 0, 2000);

        const acMinPower3pW = clamp(num(cfg.acMinPower3pW, 4200), 0, 1e12);
        const phaseAutoEnabled = cfg.phaseAutoEnabled !== false;
        const phaseSwitchUpThresholdW = clamp(num(cfg.phaseSwitchUpThresholdW, 4800), 0, 1e12);
        const phaseSwitchDownThresholdW = clamp(num(cfg.phaseSwitchDownThresholdW, 3700), 0, 1e12);
        const phaseSwitchUpStableMs = clamp(num(cfg.phaseSwitchUpStableSec, 300), 0, 86400) * 1000;
        const phaseSwitchDownStableMs = clamp(num(cfg.phaseSwitchDownStableSec, 120), 0, 86400) * 1000;
        const phaseSwitchCooldownMs = clamp(num(cfg.phaseSwitchCooldownSec, 900), 0, 86400) * 1000;
        const phaseSwitchSettleMs = clamp(num(cfg.phaseSwitchSettleSec, 30), 0, 3600) * 1000;
        const phaseSwitchSafePowerW = clamp(num(cfg.phaseSwitchSafePowerW, 150), 0, 10000);
        const activityThresholdW = clamp(num(cfg.activityThresholdW, 200), 0, 1e12);
        const stopGraceSec = clamp(num(cfg.stopGraceSec, 30), 0, 3600);
        const sessionKeepSec = clamp(num(cfg.sessionKeepSec, 300), 0, 86400);
        const stopGraceMs = stopGraceSec * 1000;
        const sessionKeepMs = Math.max(sessionKeepSec, stopGraceSec) * 1000;
        const sessionCleanupStaleMs = Math.max(sessionKeepMs * 2, 30 * 60 * 1000); // avoid memory leaks for removed wallboxes

        // Boost timeouts (minutes). Default: DC=60 (1h), AC=300 (5h). Set to 0 to disable auto-timeout.
        const boostTimeoutMinAc = clamp(num(cfg.boostTimeoutMinAc, 300), 0, 1000000);
        const boostTimeoutMinDc = clamp(num(cfg.boostTimeoutMinDc, 60), 0, 1000000);
        // Budget selection
        const budgetMode = String(cfg.totalBudgetMode || 'unlimited'); // unlimited | static | fromPeakShaving | fromDatapoint
        const staticBudgetW = clamp(num(cfg.staticMaxChargingPowerW, 0), 0, 1e12);
        const budgetPowerId = String(cfg.budgetPowerId || '').trim();
        // Optional: provide grid power / PV surplus as explicit datapoints (avoids global Datapoints tab)
        const gridPowerId = String(cfg.gridPowerId || '').trim();
        const pvSurplusPowerId = String(cfg.pvSurplusPowerId || '').trim();
        const pauseWhenPeakShavingActive = cfg.pauseWhenPeakShavingActive !== false; // default true
        const pauseBehavior = String(cfg.pauseBehavior || 'followPeakBudget'); // rampDownToZero | followPeakBudget

        // MU6.8 / RC39: Der harte Sicherheits-Timeout ist vom alten
        // Diagnosewert getrennt. Ein Bestandswert von 300 s darf die
        // Netzanschluss-Sicherheitskette nicht auf fünf Minuten aufweichen.
        const staleTimeoutSec = clamp(num(
            cfg.safetyMeterTimeoutSec,
            Math.min(30, num(cfg.staleTimeoutSec, 30)),
        ), 5, 120);
        const staleTimeoutMs = staleTimeoutSec * 1000;

        // Smart‑Ziel: Preis‑Signal (optional). Wird nur genutzt, wenn entsprechende Datapoints vorhanden sind.
        // Hinweis: Das Preis‑Signal ist ein reines Optimierungssignal; bei fehlenden Preisen bleibt die Strategie funktionsfähig.
        let priceCurrent = null;
        let priceAverage = null;
        let isCheapNow = false;
        if (goalStrategy === 'smart' && this.dp) {
            const pc = (typeof this.dp.getNumberFresh === 'function') ? this.dp.getNumberFresh('priceCurrent', staleTimeoutMs, null) : this.dp.getNumber('priceCurrent', null);
            const pa = (typeof this.dp.getNumberFresh === 'function') ? this.dp.getNumberFresh('priceAverage', staleTimeoutMs, null) : this.dp.getNumber('priceAverage', null);
            priceCurrent = (typeof pc === 'number' && Number.isFinite(pc)) ? pc : null;
            priceAverage = (typeof pa === 'number' && Number.isFinite(pa) && pa > 0) ? pa : null;
            if (priceCurrent !== null && priceAverage !== null) {
                isCheapNow = priceCurrent <= (priceAverage * goalCheapPriceFactor);
            }
        }

        // MU6.8b: separate stale thresholds for wallbox signals.
        // Many devices update "event-driven" (e.g. power stays 0 for long), so treating them as stale after
        // the global failsafe timeout would disable control incorrectly.
        // - wallboxMeterStaleTimeoutSec: diagnostics only (does NOT disable control), default 300s
        // - wallboxStatusStaleTimeoutSec: diagnostics only, default 86400s (24h)
        const wbMeterStaleTimeoutSec = clamp(num(cfg.wallboxMeterStaleTimeoutSec, 300), 5, 86400);
        const wbStatusStaleTimeoutSec = clamp(num(cfg.wallboxStatusStaleTimeoutSec, 86400), 5, 86400);
        const wbMeterStaleTimeoutMs = wbMeterStaleTimeoutSec * 1000;
        const wbStatusStaleTimeoutMs = wbStatusStaleTimeoutSec * 1000;

        // MU6.11: ramp limiting + setpoint step (anti-flutter, but keep safety by never limiting ramp-down)
        const maxDeltaWPerTick = clamp(num(cfg.maxDeltaWPerTick, 0), 0, 1e12); // 0 = unlimited
        const maxDeltaAPerTick = clamp(num(cfg.maxDeltaAPerTick, 0), 0, 1e6); // 0 = unlimited
        const stepW = clamp(num(cfg.stepW, 0), 0, 1e12); // 0 = no stepping
        const stepA = clamp(num(cfg.stepA, 0.1), 0, 1e6); // 0 = no stepping

        // PV-only Start / Ramp / Stop profile:
        // - require a stable 3-phase capable start budget before enabling charging
        // - start at the technical minimum (6 A / ~4.2 kW three-phase) and ramp up softly
        // - keep a short minimum run / stop debounce so slow wallboxes & vehicles do not flap
        const pvStartStableMs = clamp(num(cfg.pvStartStableSec, 10), 0, 3600) * 1000;
        const pvConnectorStopDelayMs = clamp(num(cfg.pvConnectorStopDelaySec, Math.max(num(cfg.pvStopDelaySec, 30), 45)), 0, 3600) * 1000;
        const pvMinRunMs = clamp(num(cfg.pvMinRunSec, 45), 0, 3600) * 1000;
        const pvRunDeficitToleranceW = clamp(num(cfg.pvRunDeficitToleranceW, 600), 0, 1e12);
        const pvStartRetryCooldownMs = clamp(num(cfg.pvStartRetryCooldownSec, num(cfg.pvRestartCooldownSec, 180)), 0, 3600) * 1000;
        const pvStartResponseTimeoutMs = clamp(num(cfg.pvStartResponseTimeoutSec, 15), 3, 300) * 1000;
        // Universeller Startvertrag fuer IEC-61851/Modbus, Herstelleradapter,
        // OCPP und manuell semantisch zugeordnete Ladepunkte. OCPP erhaelt wegen
        // seiner eventbasierten Rueckmeldungen weiterhin das laengere Mindestfenster.
        const vehicleStartResponseTimeoutMs = clamp(num(cfg.vehicleStartResponseTimeoutSec, 45), 10, 300) * 1000;
        const vehicleStartRetryCooldownMs = clamp(num(cfg.vehicleStartRetryCooldownSec, 60), 0, 3600) * 1000;
        const ocppStartResponseTimeoutMs = clamp(num(cfg.ocppStartResponseTimeoutSec, 75), 30, 300) * 1000;
        const ocppStartSettleMs = clamp(num(cfg.ocppStartSettleSec, 60), 15, 300) * 1000;
        const wbHeartbeatStaleTimeoutMs = clamp(num(cfg.wallboxHeartbeatStaleTimeoutSec, 90), 5, 3600) * 1000;
        const pvRampUpAperTick = clamp(num(cfg.pvRampUpAperTick, 0.5), 0, 1e6);
        const pvRampUpWPerTick = clamp(num(cfg.pvRampUpWPerTick, 350), 0, 1e12);

        if (budgetPowerId && this.dp) {
            await this.dp.upsert({ key: 'cm.budgetPowerW', objectId: budgetPowerId, dataType: 'number', direction: 'in', unit: 'W' });
        }
        if (gridPowerId && this.dp) {
            // IMPORTANT: enable alive-prefix heartbeat for grid metering. Many meters/adapters are event-driven
            // and do not update state.ts while the measurement stays stable.
            await this.dp.upsert({ key: 'cm.gridPowerW', objectId: gridPowerId, dataType: 'number', direction: 'in', unit: 'W', useAliveForStale: true });
        }
        if (pvSurplusPowerId && this.dp) {
            await this.dp.upsert({ key: 'cm.pvSurplusW', objectId: pvSurplusPowerId, dataType: 'number', direction: 'in', unit: 'W' });
        }

        // Gate A: reuse PeakShaving meter phase currents (if configured) as optional hard safety caps.
        // This allows phase protection even when PeakShaving module is disabled.
        const psCfgForPhase = (this.adapter && this.adapter.config && this.adapter.config.peakShaving) ? this.adapter.config.peakShaving : {};
        if (this.dp && psCfgForPhase) {
            if (psCfgForPhase.l1CurrentId) await this.dp.upsert({ key: 'ps.l1A', objectId: String(psCfgForPhase.l1CurrentId).trim(), dataType: 'number', direction: 'in', unit: 'A' });
            if (psCfgForPhase.l2CurrentId) await this.dp.upsert({ key: 'ps.l2A', objectId: String(psCfgForPhase.l2CurrentId).trim(), dataType: 'number', direction: 'in', unit: 'A' });
            if (psCfgForPhase.l3CurrentId) await this.dp.upsert({ key: 'ps.l3A', objectId: String(psCfgForPhase.l3CurrentId).trim(), dataType: 'number', direction: 'in', unit: 'A' });
        }

        // Measurements and object mapping
        let totalPowerW = 0;
        // 0.8.61: Gate-A Netzbudget muss mit frischen realen Ladepunkt-Messwerten rechnen.
        // `totalPowerW` kann wegen Setpoint-Fallbacks bewusst weiter als Reservierung/Regelwert
        // dienen. Für die Netzanschluss-Grenze darf ein alter Ladepunkt-Setpoint aber nicht als
        // aktueller Verbrauch vom Netzanschluss abgezogen werden, sonst entsteht ein zu hoher
        // EVCS-Cap (z.B. 40 kW Anschluss + stale 10.9 kW = falsch 50.9 kW).
        let totalFreshActualPowerW = 0;
        let totalStaleActualIgnoredForGridW = 0;
        let totalCurrentA = 0;
        let onlineCount = 0;

        /** @type {Array<any>} */
        const wbList = [];

        const now = Date.now();
        await this._queueState('chargingManagement.debug.lastRun', now, true);
        await this._queueState('chargingManagement.debug.sortedOrder', '', true);
        await this._queueState('chargingManagement.debug.allocations', '[]', true);

        /** Code-Teil: Arrow-Funktion `publishEvPriorityCaps` – schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen. */
        /** Code-Teil: publishEvPriorityCaps – Veröffentlicht berechnete Werte als State/API-Snapshot. */
        const publishEvPriorityCaps = (patch) => {
            try {
                const caps = (this.adapter && this.adapter._emsCaps && typeof this.adapter._emsCaps === 'object') ? this.adapter._emsCaps : {};
                const prev = (caps && caps.evPriority && typeof caps.evPriority === 'object') ? caps.evPriority : {};
                this.adapter._emsCaps = Object.assign({}, caps, {
                    evPriority: Object.assign({}, prev, patch || {}, { ts: now }),
                });
            } catch {
                // ignore
            }
        };

        /** Same-cycle Policy-Snapshot für das nachfolgende Storage-Control; States bleiben Diagnose/Fallback. */
        const publishEvStoragePolicyCaps = (patch) => {
            try {
                const caps = (this.adapter && this.adapter._emsCaps && typeof this.adapter._emsCaps === 'object') ? this.adapter._emsCaps : {};
                const prev = (caps.evcsStoragePolicy && typeof caps.evcsStoragePolicy === 'object') ? caps.evcsStoragePolicy : {};
                this.adapter._emsCaps = { ...caps, evcsStoragePolicy: { ...prev, ...(patch || {}), ts: Number.isFinite(patch && patch.ts) ? patch.ts : now } };
            } catch { /* diagnostics only */ }
        };

        // Reset the shared EV-priority snapshot on every tick so Storage-Control never sees stale flags
        // when Charging-Management is off or returns early in this cycle.
        publishEvPriorityCaps({
            active: false,
            blockStorageCharge: false,
            requestedCount: 0,
            limitedWallboxes: 0,
            starvedW: 0,
            pendingW: 0,
            storageYieldW: 0,
            storageSource: '',
        });

        // Do not publish a fresh 'no protection' verdict before reading the customer
        // choices. A failed/incomplete tick must discard old watts but retain the
        // protection intent conservatively until a complete snapshot replaces it.
        const pendingProtectedWallboxes = wallboxes.filter(w => w && w.storageAssistCustomerAllowed === true).length;
        publishEvStoragePolicyCaps({ protectedLoadW: 0, protectedWallboxes: 0,
            protectionRequestedWallboxes: pendingProtectedWallboxes,
            protectedUnknownWallboxes: pendingProtectedWallboxes, complete: false,
            assistRequestedLoadW: 0, source: 'charging-tick-reset' });
        let storageProtectedLoadW = 0, storageProtectedWallboxes = 0, storageAssistRequestedLoadW = 0;
        let storageProtectionRequestedWallboxes = 0, storageProtectedUnknownWallboxes = 0;
        try {
            await Promise.all([
                this._queueState('chargingManagement.control.storageProtectedLoadW', 0, true),
                this._queueState('chargingManagement.control.storageProtectedWallboxes', 0, true),
                this._queueState('chargingManagement.control.storageProtectedLoadTs', now, true),
                this._queueState('chargingManagement.control.storageAssistRequestedLoadW', 0, true),
            ]);
        } catch { /* diagnostics only */ }

        // A connector status is connector-specific. If the same manually assigned
        // AppCenter status datapoint is reused for multiple numbered connectors, it
        // is treated as station/shared diagnostics only and must not fault or enable
        // any single connector.
        const statusConnectorUsage = new Map();
        for (let configIndex = 0; configIndex < wallboxes.length; configIndex++) {
            const configWallbox = wallboxes[configIndex] || {};
            const configOcppContext = inferIoBrokerOcppConnectorContext(
                configWallbox.actualPowerWId,
                configWallbox.statusId,
                configWallbox.chargingStateId,
                configWallbox.transactionActiveId,
                configWallbox.onlineId,
                configWallbox.dataFreshId,
                configWallbox.enableId,
                configWallbox.actualCurrentAId,
                configWallbox.setPowerWId,
                configWallbox.setCurrentAId,
            );
            const configTelemetryProfile = resolveEvcsTelemetryProfile(configWallbox.telemetryProfile, configOcppContext);
            const configuredStatusObjectId = String(configWallbox.statusId || '').trim();
            const statusObjectId = String(
                configTelemetryProfile === 'ocpp-1.6-event-driven'
                    ? resolveOcppCanonicalObjectId(configuredStatusObjectId, configOcppContext, 'status')
                    : configuredStatusObjectId,
            ).trim();
            const configuredConnectorNoRaw = clamp(num(configWallbox.connectorNo, 0), 0, 9999);
            const configuredConnectorNo = configuredConnectorNoRaw > 0
                ? configuredConnectorNoRaw
                : (configTelemetryProfile === 'ocpp-1.6-event-driven' && Number.isFinite(configOcppContext.connectorNo)
                    ? Number(configOcppContext.connectorNo)
                    : 0);
            if (!statusObjectId || configuredConnectorNo <= 0) continue;
            if (!statusConnectorUsage.has(statusObjectId)) statusConnectorUsage.set(statusObjectId, new Set());
            statusConnectorUsage.get(statusObjectId).add(`${String(configWallbox.stationKey || '').trim()}|${configuredConnectorNo}|${String(configWallbox.key || configIndex)}`);
        }

        for (let wbIndex = 0; wbIndex < wallboxes.length; wbIndex++) {
            const wb = wallboxes[wbIndex];
            const key = String(wb.key || '').trim();
            if (!key) continue;

            const safe = toSafeIdPart(key);
            const ch = await this._ensureWallboxChannel(key);

            // Serienreife/Robustheit: restore persisted runtime timers after adapter restart.
            // This keeps Boost timeouts + "first-started" charging order stable across restarts.
            if (!this._restoredRuntime.has(safe)) {
                try {
                    const cs = await this._getStateCached(`${ch}.chargingSince`);
                    const csVal = cs ? Number(cs.val) : 0;
                    if (Number.isFinite(csVal) && csVal > 0) this._chargingSinceMs.set(safe, csVal);
                } catch {
                    // ignore
                }
                try {
                    const bs = await this._getStateCached(`${ch}.boostSince`);
                    const bsVal = bs ? Number(bs.val) : 0;
                    if (Number.isFinite(bsVal) && bsVal > 0) this._boostSinceMs.set(safe, bsVal);
                } catch {
                    // ignore
                }
                this._restoredRuntime.add(safe);
            }

            // Runtime mode override (writable state, used by VIS)
            // If the runtime state is empty, initialize it ONCE from config default (userModeDefault).
            let userMode = 'auto';
            try {
                const st = await this._getStateCached(`${ch}.userMode`);
                const cur = st ? st.val : null;
                const def = normalizeWallboxModeOverride(wb.userModeDefault || wb.userMode || 'auto');

                if (cur === null || cur === undefined || String(cur).trim() === '') {
                    try {
                        await this._queueState(`${ch}.userMode`, def, true);
                    } catch {
                        // ignore
                    }
                    userMode = def;
                } else {
                    userMode = normalizeWallboxModeOverride(cur);
                }
            } catch {
                userMode = normalizeWallboxModeOverride(wb.userModeDefault || wb.userMode || 'auto');
            }

            let userAutoSource = 'standard';
            try {
                const st = await this._getStateCached(`${ch}.userAutoSource`);
                const cur = st ? st.val : null;
                const configuredDefault = normalizeStrategyAutoSource(wb.userAutoSource || wb.autoSource || 'standard');
                if (cur === null || cur === undefined || String(cur).trim() === '') {
                    userAutoSource = configuredDefault;
                    await this._queueState(`${ch}.userAutoSource`, configuredDefault, true);
                } else {
                    userAutoSource = normalizeStrategyAutoSource(cur);
                }
            } catch {
                userAutoSource = normalizeStrategyAutoSource(wb.userAutoSource || wb.autoSource || 'standard');
            }
            const strategyOverlay = resolveChargingStrategyOverlay(
                this.adapter,
                [`evcs:lp${wbIndex + 1}`, `evcs:${safe}`],
                { now, userMode, autoSource: userAutoSource },
            );

            const cfgEnabled = wb.enabled !== false;

            // Kundenseitige Ladestationsfreigabe. Sie ist nicht mit der
            // EMS-Regelungsfreigabe (`userEnabled`) identisch: Im PV-Modus darf
            // ein Sollwert von 0 W nur "Warten" bedeuten. Die Wallbox bleibt
            // freigegeben, bis der Kunde sie ausdruecklich sperrt.
            let userStationEnabled = true;
            try {
                const stStation = await this._getStateCached(`${ch}.userStationEnabled`);
                const curStation = stStation ? stStation.val : null;
                if (curStation === null || curStation === undefined || String(curStation).trim() === '') {
                    try { await this._queueState(`${ch}.userStationEnabled`, true, true); } catch { /* ignore */ }
                    userStationEnabled = true;
                } else {
                    userStationEnabled = toBool(curStation) !== false;
                }
            } catch {
                userStationEnabled = true;
            }

            // Runtime: end-customer can disable EMS regulation per charge point
            let userEnabled = true;
            try {
                const stEn = await this._getStateCached(`${ch}.userEnabled`);
                const curEn = stEn ? stEn.val : null;
                if (curEn === null || curEn === undefined || String(curEn).trim() === '') {
                    try { await this._queueState(`${ch}.userEnabled`, true, true); } catch { /* ignore */ }
                    userEnabled = true;
                } else {
                    userEnabled = toBool(curEn) !== false;
                }
            } catch {
                userEnabled = true;
            }

            // RFID ist eine eigenständige Zugangshoheit. Fehlen die lokalen
            // RFID-Zustände, bleibt die Station freigegeben (RFID nicht aktiv).
            let rfidAuthorized = true;
            let rfidEnforced = false;
            let rfidReason = 'rfid_disabled';
            try {
                const rfidIdx = wbIndex + 1;
                const stAuthorized = await this._getStateCached(`evcs.${rfidIdx}.rfidAuthorized`);
                const stEnforced = await this._getStateCached(`evcs.${rfidIdx}.rfidEnforced`);
                const stReason = await this._getStateCached(`evcs.${rfidIdx}.rfidReason`);
                if (stAuthorized && stAuthorized.val !== null && stAuthorized.val !== undefined) {
                    rfidAuthorized = toBool(stAuthorized.val) !== false;
                }
                if (stEnforced && stEnforced.val !== null && stEnforced.val !== undefined) {
                    rfidEnforced = toBool(stEnforced.val) === true;
                }
                if (stReason && stReason.val !== null && stReason.val !== undefined) {
                    rfidReason = String(stReason.val || '').trim() || rfidReason;
                }
            } catch {
                rfidAuthorized = true;
                rfidEnforced = false;
                rfidReason = 'rfid-state-unavailable';
            }
            const availabilityRequest = resolveEvcsAvailabilityRequest({
                userStationEnabled,
                rfidEnforced,
                rfidAuthorized,
            });
            const rfidLockActive = availabilityRequest.rfidLockActive === true;
            const stationEnabled = cfgEnabled && userStationEnabled && !rfidLockActive;
            const enabled = stationEnabled && userEnabled;

            // Ladepunkt-Metadaten (Stationsgruppe / Connector)
            const stationKey = String(wb.stationKey || '').trim();
            const ocppContext = inferIoBrokerOcppConnectorContext(
                wb.actualPowerWId,
                wb.statusId,
                wb.chargingStateId,
                wb.transactionActiveId,
                wb.onlineId,
                wb.dataFreshId,
                wb.enableId,
                wb.actualCurrentAId,
                wb.vehicleConnectedId,
                wb.chargeDemandId,
                wb.setPowerWId,
                wb.setCurrentAId,
            );
            const telemetryProfile = resolveEvcsTelemetryProfile(wb.telemetryProfile, ocppContext);
            const telemetryAutoDetected = !String(wb.telemetryProfile || '').trim() && ocppContext.detected === true;
            const configuredConnectorNo = clamp(num(wb.connectorNo, 0), 0, 9999);
            const connectorNo = configuredConnectorNo > 0
                ? configuredConnectorNo
                : (telemetryProfile === 'ocpp-1.6-event-driven' && Number.isFinite(ocppContext.connectorNo)
                    ? Number(ocppContext.connectorNo)
                    : 0);
            const allowBoost = wb.allowBoost !== false;

            // Optional per-wallbox boost timeout override (minutes). 0/empty = use global default by chargerType
            const boostTimeoutMinOverride = clamp(num(wb.boostTimeoutMin, null), 0, 1000000);
            // Historischer Feldname: Netzanteil in W bei Nulleinspeisung.
            // Leer = keine Zusatzgrenze; 0/ungültig = nur nachgewiesenes PV.
            const boostLimitRaw = wb.boostMaxPowerW;
            const boostMaxPowerW = boostLimitRaw === null || boostLimitRaw === undefined || (typeof boostLimitRaw === 'string' && !boostLimitRaw.trim())
                ? null : (typeof boostLimitRaw !== 'boolean' && Number.isFinite(Number(boostLimitRaw))
                    ? Math.max(0, Number(boostLimitRaw)) : 0);

            const stationMaxPowerW = (stationKey && stationCapByKey.has(stationKey))
                ? stationCapByKey.get(stationKey)
                : clamp(num(wb.stationMaxPowerW, null), 0, 1e12);
            const priority = clamp(num(wb.priority, 999), 1, 999);
            const chargerType = normalizeChargerType(wb.chargerType);
            const controlBasisCfg = normalizeControlBasis(wb.controlBasis);

            // For AC: phases/current bounds apply. For DC: phases are informational; distribution is watt-based.
            const phases = Number(wb.phases || defaultPhases) === 1 ? 1 : 3;
            const normalizePhaseModeRuntime = (value, fallbackPhases) => {
                const raw = String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
                if (raw === 'autopv' || raw === 'pvauto' || raw === 'auto13' || raw === 'auto1p3p' || raw === 'auto') return 'auto-pv';
                if (raw === 'fixed1p' || raw === '1p' || raw === 'onephase' || raw === 'fixed1') return 'fixed-1p';
                if (raw === 'fixed3p' || raw === '3p' || raw === 'threephase' || raw === 'fixed3') return 'fixed-3p';
                return Number(fallbackPhases) === 1 ? 'fixed-1p' : 'fixed-3p';
            };
            let userPhaseMode = normalizePhaseModeRuntime(wb.userPhaseMode || wb.phaseMode, phases);
            try {
                const stPhase = await this._getStateCached(`${ch}.userPhaseMode`);
                const curPhase = stPhase ? stPhase.val : null;
                const defPhase = normalizePhaseModeRuntime(wb.phaseMode, phases);
                if (curPhase === null || curPhase === undefined || String(curPhase).trim() === '') {
                    try { await this._queueState(`${ch}.userPhaseMode`, defPhase, true); } catch { /* ignore */ }
                    userPhaseMode = defPhase;
                } else {
                    userPhaseMode = normalizePhaseModeRuntime(curPhase, phases);
                }
            } catch {
                userPhaseMode = normalizePhaseModeRuntime(wb.userPhaseMode || wb.phaseMode, phases);
            }
            const phaseMode = chargerType === 'AC' ? userPhaseMode : 'fixed-1p';
            const phaseSwitchId = String(wb.phaseSwitchId || wb.phaseSwitchKey || wb.phaseModeWriteId || '').trim();
            const phaseFeedbackId = String(wb.phaseFeedbackId || wb.phaseFeedbackKey || wb.phaseModeReadId || '').trim();
            const phaseSwitchValue1p = (wb.phaseSwitchValue1p !== undefined && wb.phaseSwitchValue1p !== null && String(wb.phaseSwitchValue1p).trim() !== '') ? wb.phaseSwitchValue1p : 1;
            const phaseSwitchValue3p = (wb.phaseSwitchValue3p !== undefined && wb.phaseSwitchValue3p !== null && String(wb.phaseSwitchValue3p).trim() !== '') ? wb.phaseSwitchValue3p : 3;
            const stopBeforePhaseSwitch = wb.stopBeforePhaseSwitch !== false;
            const wbPhaseSwitchUpThresholdW = clamp(num(wb.phaseSwitchUpThresholdW, phaseSwitchUpThresholdW), 0, 1e12);
            const wbPhaseSwitchDownThresholdW = clamp(num(wb.phaseSwitchDownThresholdW, phaseSwitchDownThresholdW), 0, 1e12);
            const wbPhaseSwitchUpStableMs = clamp(num(wb.phaseSwitchUpStableSec, phaseSwitchUpStableMs / 1000), 0, 86400) * 1000;
            const wbPhaseSwitchDownStableMs = clamp(num(wb.phaseSwitchDownStableSec, phaseSwitchDownStableMs / 1000), 0, 86400) * 1000;
            const wbPhaseSwitchCooldownMs = clamp(num(wb.phaseSwitchCooldownSec, phaseSwitchCooldownMs / 1000), 0, 86400) * 1000;
            const wbPhaseSwitchSettleMs = clamp(num(wb.phaseSwitchSettleSec, phaseSwitchSettleMs / 1000), 0, 3600) * 1000;

            const storageAssistCustomerAllowed = wb.storageAssistCustomerAllowed === true;
            let userStorageAssistEnabled = false;
            try {
                const stStorage = await this._getStateCached(`${ch}.userStorageAssistEnabled`);
                const curStorage = stStorage ? stStorage.val : null;
                if (curStorage === null || curStorage === undefined || String(curStorage).trim() === '') {
                    try { await this._queueState(`${ch}.userStorageAssistEnabled`, false, true); } catch { /* ignore */ }
                    userStorageAssistEnabled = false;
                } else {
                    userStorageAssistEnabled = curStorage === true || String(curStorage).trim().toLowerCase() === 'true' || String(curStorage).trim() === '1';
                }
            } catch {
                userStorageAssistEnabled = false;
            }
            // Keine Installer-Freigabe = normaler Eigenverbrauch; nur die sichtbare Kundenwahl aktiviert protect/assist.
            const storagePolicy = resolveEvcsStoragePolicy(storageAssistCustomerAllowed, userStorageAssistEnabled, userMode);
            const storageAssistRequested = storagePolicy.assistRequested;
            const storageProtectionRequested = storagePolicy.protectionRequested;
            try {
                await this._queueState(`${ch}.storageAssistCustomerAllowed`, !!storageAssistCustomerAllowed, true);
                if (!storageAssistCustomerAllowed && userStorageAssistEnabled) {
                    await this._queueState(`${ch}.userStorageAssistEnabled`, false, true);
                    userStorageAssistEnabled = false;
                }
                await this._queueState(`${ch}.storagePolicyMode`, storagePolicy.mode, true);
                await this._queueState(`${ch}.storageProtectionRequested`, storageProtectionRequested, true);
            } catch { /* diagnostics only */ }

            const configuredMinA = clamp(num(wb.minA, null), 0, 2000);
            const configuredMaxA = clamp(num(wb.maxA, null), 0, 2000);
            const minPowerWCfg = clamp(num(wb.minPowerW, null), 0, 1e12);
            const maxPowerWCfg = clamp(num(wb.maxPowerW, null), 0, 1e12);
            // Die wirksamen AC-Grenzen werden nach Auflösung des tatsächlichen
            // Steuerpfads gemeinsam aus Strom- und Leistungsgrenzen abgeleitet.
            // Bis dahin bleiben die globalen Stromwerte nur sichere Fallbacks.
            let minA = clamp(num(configuredMinA, defaultMinA), 0, 2000);
            let maxA = clamp(num(configuredMaxA, defaultMaxA), 0, 2000);

            // Track whether the installer/user explicitly configured local caps (useful for diagnostics/reasons)
            const userLimitSet = (
                (wb && wb.maxA !== undefined && wb.maxA !== null && String(wb.maxA).trim() !== '' && Number.isFinite(Number(wb.maxA)) && Number(wb.maxA) > 0)
                || (wb && wb.maxPowerW !== undefined && wb.maxPowerW !== null && String(wb.maxPowerW).trim() !== '' && Number.isFinite(Number(wb.maxPowerW)) && Number(wb.maxPowerW) > 0)
                || (wb && wb.stationMaxPowerW !== undefined && wb.stationMaxPowerW !== null && String(wb.stationMaxPowerW).trim() !== '' && Number.isFinite(Number(wb.stationMaxPowerW)) && Number(wb.stationMaxPowerW) > 0)
            );

            // Datenpunkt-IDs. Für NexoWatt OCPP werden fehlende Begleitpfade
            // aus jedem bereits zugeordneten Stationspfad sicher ergänzt. Dabei
            // bleibt `socketConnected` die Transportwahrheit; `dataFresh` ist nur
            // die getrennte Messwertqualitaet und darf niemals "offline" bedeuten.
            const configuredActualPowerWId = String(wb.actualPowerWId || '').trim();
            const configuredActualCurrentAId = String(wb.actualCurrentAId || '').trim();
            const configuredSetPowerWId = String(wb.setPowerWId || '').trim();
            const configuredEnableId = String(wb.enableId || '').trim();
            const configuredOnlineId = String(wb.onlineId || '').trim();
            const configuredDataFreshId = String(wb.dataFreshId || '').trim();
            const configuredStatusId = String(wb.statusId || '').trim();
            const configuredChargingStateId = String(wb.chargingStateId || '').trim();
            const configuredTransactionActiveId = String(wb.transactionActiveId || '').trim();
            const configuredHeartbeatId = String(wb.heartbeatId || '').trim();
            const actualPowerWId = String(
                telemetryProfile === 'ocpp-1.6-event-driven'
                    ? resolveOcppCanonicalObjectId(configuredActualPowerWId, ocppContext, 'power')
                    : configuredActualPowerWId,
            ).trim();
            const actualCurrentAId = String(
                telemetryProfile === 'ocpp-1.6-event-driven'
                    ? resolveOcppCanonicalObjectId(configuredActualCurrentAId, ocppContext, 'current')
                    : configuredActualCurrentAId,
            ).trim();
            const setCurrentAId = String(wb.setCurrentAId || '').trim();
            const setPowerWId = String(
                telemetryProfile === 'ocpp-1.6-event-driven'
                    ? resolveOcppCanonicalObjectId(configuredSetPowerWId, ocppContext, 'setPower')
                    : configuredSetPowerWId,
            ).trim();
            const enableId = String(
                telemetryProfile === 'ocpp-1.6-event-driven' && configuredEnableId
                    ? resolveOcppCanonicalObjectId(configuredEnableId, ocppContext, 'enable')
                    : configuredEnableId,
            ).trim();
            const onlineIdWasDataFresh = telemetryProfile === 'ocpp-1.6-event-driven'
                && isOcppDataFreshObjectId(configuredOnlineId, ocppContext);
            const onlineIdWasVolatileOcpp = telemetryProfile === 'ocpp-1.6-event-driven'
                && !!configuredOnlineId
                && isOcppVolatileOnlineObjectId(configuredOnlineId, ocppContext)
                && configuredOnlineId !== String(ocppContext.socketConnectedId || '').trim();
            const onlineId = telemetryProfile === 'ocpp-1.6-event-driven'
                ? resolveOcppOnlineObjectId(configuredOnlineId, ocppContext)
                : configuredOnlineId;
            const onlineSourceMigrated = onlineIdWasVolatileOcpp && onlineId !== configuredOnlineId;
            const dataFreshSeedId = configuredDataFreshId || (onlineIdWasDataFresh ? configuredOnlineId : '');
            const dataFreshId = telemetryProfile === 'ocpp-1.6-event-driven'
                ? resolveOcppCanonicalObjectId(dataFreshSeedId, ocppContext, 'dataFresh')
                : dataFreshSeedId;
            const statusId = telemetryProfile === 'ocpp-1.6-event-driven'
                ? resolveOcppCanonicalObjectId(configuredStatusId, ocppContext, 'status')
                : configuredStatusId;
            const chargingStateId = telemetryProfile === 'ocpp-1.6-event-driven'
                ? resolveOcppCanonicalObjectId(configuredChargingStateId, ocppContext, 'chargingState')
                : configuredChargingStateId;
            const transactionActiveId = telemetryProfile === 'ocpp-1.6-event-driven'
                ? resolveOcppCanonicalObjectId(configuredTransactionActiveId, ocppContext, 'transactionActive')
                : configuredTransactionActiveId;
            const ocppAdapterAliveId = telemetryProfile === 'ocpp-1.6-event-driven'
                ? String(ocppContext.adapterAliveId || '').trim()
                : '';
            const ocppLastCommandId = telemetryProfile === 'ocpp-1.6-event-driven'
                ? String(ocppContext.lastCommandId || '').trim()
                : '';
            const ocppLastCommandAtId = telemetryProfile === 'ocpp-1.6-event-driven'
                ? String(ocppContext.lastCommandAtId || '').trim()
                : '';
            const ocppLastCommandSuccessId = telemetryProfile === 'ocpp-1.6-event-driven'
                ? String(ocppContext.lastCommandSuccessId || '').trim()
                : '';
            const ocppLastCommandErrorId = telemetryProfile === 'ocpp-1.6-event-driven'
                ? String(ocppContext.lastCommandErrorId || '').trim()
                : '';
            const ocppRequestedChargeLimitId = telemetryProfile === 'ocpp-1.6-event-driven'
                ? String(ocppContext.requestedChargeLimitId || '').trim()
                : '';
            const ocppAppliedChargeLimitId = telemetryProfile === 'ocpp-1.6-event-driven'
                ? String(ocppContext.appliedChargeLimitId || '').trim()
                : '';
            const ocppChargeLimitReasonId = telemetryProfile === 'ocpp-1.6-event-driven'
                ? String(ocppContext.chargeLimitReasonId || '').trim()
                : '';
            const ocppChargeLimitClampedId = telemetryProfile === 'ocpp-1.6-event-driven'
                ? String(ocppContext.chargeLimitClampedId || '').trim()
                : '';
            const vehicleConnectedId = String(wb.vehicleConnectedId || '').trim();
            const configuredChargeDemandId = String(wb.chargeDemandId || '').trim();
            const chargeDemandObservationOnly = isObservationOnlyEvcsDemandObjectId(configuredChargeDemandId);
            const chargeDemandId = chargeDemandObservationOnly ? '' : configuredChargeDemandId;
            const heartbeatId = String(
                telemetryProfile === 'ocpp-1.6-event-driven'
                    ? resolveOcppCanonicalObjectId(configuredHeartbeatId, ocppContext, 'heartbeat')
                    : configuredHeartbeatId,
            ).trim();
            const ocppDatapointMigrations = [];
            const noteOcppMigration = (semantic, before, after) => {
                const source = String(before || '').trim();
                const target = String(after || '').trim();
                if (telemetryProfile === 'ocpp-1.6-event-driven' && source && target && source !== target) {
                    ocppDatapointMigrations.push({ semantic, from: source, to: target });
                }
            };
            noteOcppMigration('power', configuredActualPowerWId, actualPowerWId);
            noteOcppMigration('current', configuredActualCurrentAId, actualCurrentAId);
            noteOcppMigration('setPower', configuredSetPowerWId, setPowerWId);
            noteOcppMigration('availability', configuredEnableId, enableId);
            noteOcppMigration('status', configuredStatusId, statusId);
            noteOcppMigration('chargingState', configuredChargingStateId, chargingStateId);
            noteOcppMigration('transactionActive', configuredTransactionActiveId, transactionActiveId);
            noteOcppMigration('dataFresh', dataFreshSeedId, dataFreshId);
            noteOcppMigration('heartbeat', configuredHeartbeatId, heartbeatId);
            const ocppDatapointMappingMigrated = ocppDatapointMigrations.length > 0;

            // phase measurement IDs (optional)
            const l1Id = String(wb.phaseL1AId || '').trim();
            const l2Id = String(wb.phaseL2AId || '').trim();
            const l3Id = String(wb.phaseL3AId || '').trim();
            const setpointRefreshMs = resolveEvcsSetpointRefreshMs(
                wb,
                telemetryProfile,
                actualPowerWId,
                actualCurrentAId,
                setCurrentAId,
                setPowerWId,
                statusId,
            );

            // Register dp mappings
            if (this.dp) {
                if (actualPowerWId) await this.dp.upsert({ key: `cm.wb.${safe}.pW`, objectId: actualPowerWId, dataType: 'number', direction: 'in', unit: 'W' });
                if (actualCurrentAId) await this.dp.upsert({ key: `cm.wb.${safe}.iA`, objectId: actualCurrentAId, dataType: 'number', direction: 'in', unit: 'A' });
                if (setCurrentAId) await this.dp.upsert({ key: `cm.wb.${safe}.setA`, objectId: setCurrentAId, dataType: 'number', direction: 'out', unit: 'A', deadband: 0.1, maxWriteIntervalMs: setpointRefreshMs });
                if (setPowerWId) await this.dp.upsert({ key: `cm.wb.${safe}.setW`, objectId: setPowerWId, dataType: 'number', direction: 'out', unit: 'W', deadband: 25, maxWriteIntervalMs: setpointRefreshMs });
                if (enableId) await this.dp.upsert({ key: `cm.wb.${safe}.en`, objectId: enableId, dataType: 'boolean', direction: 'out' });
                if (onlineId) await this.dp.upsert({ key: `cm.wb.${safe}.onlineRaw`, objectId: onlineId, dataType: 'mixed', direction: 'in' });
                if (dataFreshId) await this.dp.upsert({ key: `cm.wb.${safe}.dataFreshRaw`, objectId: dataFreshId, dataType: 'mixed', direction: 'in' });
                if (statusId) await this.dp.upsert({ key: `cm.wb.${safe}.st`, objectId: statusId, dataType: 'mixed', direction: 'in' });
                if (chargingStateId) await this.dp.upsert({ key: `cm.wb.${safe}.chargingStateRaw`, objectId: chargingStateId, dataType: 'mixed', direction: 'in' });
                if (transactionActiveId) await this.dp.upsert({ key: `cm.wb.${safe}.transactionActiveRaw`, objectId: transactionActiveId, dataType: 'mixed', direction: 'in' });
                if (ocppAdapterAliveId) await this.dp.upsert({ key: `cm.wb.${safe}.ocppAdapterAliveRaw`, objectId: ocppAdapterAliveId, dataType: 'mixed', direction: 'in' });
                if (ocppLastCommandId) await this.dp.upsert({ key: `cm.wb.${safe}.ocppLastCommandRaw`, objectId: ocppLastCommandId, dataType: 'mixed', direction: 'in' });
                if (ocppLastCommandAtId) await this.dp.upsert({ key: `cm.wb.${safe}.ocppLastCommandAtRaw`, objectId: ocppLastCommandAtId, dataType: 'mixed', direction: 'in' });
                if (ocppLastCommandSuccessId) await this.dp.upsert({ key: `cm.wb.${safe}.ocppLastCommandSuccessRaw`, objectId: ocppLastCommandSuccessId, dataType: 'mixed', direction: 'in' });
                if (ocppLastCommandErrorId) await this.dp.upsert({ key: `cm.wb.${safe}.ocppLastCommandErrorRaw`, objectId: ocppLastCommandErrorId, dataType: 'mixed', direction: 'in' });
                if (ocppRequestedChargeLimitId) await this.dp.upsert({ key: `cm.wb.${safe}.ocppRequestedChargeLimitRaw`, objectId: ocppRequestedChargeLimitId, dataType: 'mixed', direction: 'in' });
                if (ocppAppliedChargeLimitId) await this.dp.upsert({ key: `cm.wb.${safe}.ocppAppliedChargeLimitRaw`, objectId: ocppAppliedChargeLimitId, dataType: 'mixed', direction: 'in' });
                if (ocppChargeLimitReasonId) await this.dp.upsert({ key: `cm.wb.${safe}.ocppChargeLimitReasonRaw`, objectId: ocppChargeLimitReasonId, dataType: 'mixed', direction: 'in' });
                if (ocppChargeLimitClampedId) await this.dp.upsert({ key: `cm.wb.${safe}.ocppChargeLimitClampedRaw`, objectId: ocppChargeLimitClampedId, dataType: 'mixed', direction: 'in' });
                if (vehicleConnectedId) await this.dp.upsert({ key: `cm.wb.${safe}.vehicleConnectedRaw`, objectId: vehicleConnectedId, dataType: 'mixed', direction: 'in' });
                if (chargeDemandId) await this.dp.upsert({ key: `cm.wb.${safe}.chargeDemandRaw`, objectId: chargeDemandId, dataType: 'mixed', direction: 'in' });
                if (heartbeatId) await this.dp.upsert({ key: `cm.wb.${safe}.heartbeatRaw`, objectId: heartbeatId, dataType: 'mixed', direction: 'in' });
                if (phaseSwitchId) await this.dp.upsert({ key: `cm.wb.${safe}.phaseSet`, objectId: phaseSwitchId, dataType: 'mixed', direction: 'out' });
                if (phaseFeedbackId) await this.dp.upsert({ key: `cm.wb.${safe}.phaseFb`, objectId: phaseFeedbackId, dataType: 'mixed', direction: 'in' });

                if (l1Id) await this.dp.upsert({ key: `cm.wb.${safe}.l1A`, objectId: l1Id, dataType: 'number', direction: 'in', unit: 'A' });
                if (l2Id) await this.dp.upsert({ key: `cm.wb.${safe}.l2A`, objectId: l2Id, dataType: 'number', direction: 'in', unit: 'A' });
                if (l3Id) await this.dp.upsert({ key: `cm.wb.${safe}.l3A`, objectId: l3Id, dataType: 'number', direction: 'in', unit: 'A' });
            }

            // Read measurements (cache-based)
            const pW = (actualPowerWId && this.dp) ? this.dp.getNumber(`cm.wb.${safe}.pW`, null) : null;
            const iA = (actualCurrentAId && this.dp) ? this.dp.getNumber(`cm.wb.${safe}.iA`, null) : null;
            const onlineRaw = (onlineId && this.dp) ? this.dp.getRaw(`cm.wb.${safe}.onlineRaw`) : null;
            const dataFreshRaw = (dataFreshId && this.dp) ? this.dp.getRaw(`cm.wb.${safe}.dataFreshRaw`) : null;
            const statusRaw = (statusId && this.dp) ? this.dp.getRaw(`cm.wb.${safe}.st`) : null;
            const chargingStateRaw = (chargingStateId && this.dp) ? this.dp.getRaw(`cm.wb.${safe}.chargingStateRaw`) : null;
            const transactionActiveRaw = (transactionActiveId && this.dp) ? this.dp.getRaw(`cm.wb.${safe}.transactionActiveRaw`) : null;
            const ocppAdapterAliveRaw = (ocppAdapterAliveId && this.dp) ? this.dp.getRaw(`cm.wb.${safe}.ocppAdapterAliveRaw`) : null;
            const ocppLastCommandRaw = (ocppLastCommandId && this.dp) ? this.dp.getRaw(`cm.wb.${safe}.ocppLastCommandRaw`) : null;
            const ocppLastCommandAtRaw = (ocppLastCommandAtId && this.dp) ? this.dp.getRaw(`cm.wb.${safe}.ocppLastCommandAtRaw`) : null;
            const ocppLastCommandSuccessRaw = (ocppLastCommandSuccessId && this.dp) ? this.dp.getRaw(`cm.wb.${safe}.ocppLastCommandSuccessRaw`) : null;
            const ocppLastCommandErrorRaw = (ocppLastCommandErrorId && this.dp) ? this.dp.getRaw(`cm.wb.${safe}.ocppLastCommandErrorRaw`) : null;
            const ocppRequestedChargeLimitRaw = (ocppRequestedChargeLimitId && this.dp) ? this.dp.getRaw(`cm.wb.${safe}.ocppRequestedChargeLimitRaw`) : null;
            const ocppAppliedChargeLimitRaw = (ocppAppliedChargeLimitId && this.dp) ? this.dp.getRaw(`cm.wb.${safe}.ocppAppliedChargeLimitRaw`) : null;
            const ocppChargeLimitReasonRaw = (ocppChargeLimitReasonId && this.dp) ? this.dp.getRaw(`cm.wb.${safe}.ocppChargeLimitReasonRaw`) : null;
            const ocppChargeLimitClampedRaw = (ocppChargeLimitClampedId && this.dp) ? this.dp.getRaw(`cm.wb.${safe}.ocppChargeLimitClampedRaw`) : null;
            const vehicleConnectedRaw = (vehicleConnectedId && this.dp) ? this.dp.getRaw(`cm.wb.${safe}.vehicleConnectedRaw`) : null;
            const chargeDemandRaw = (chargeDemandId && this.dp) ? this.dp.getRaw(`cm.wb.${safe}.chargeDemandRaw`) : null;
            const heartbeatRaw = (heartbeatId && this.dp) ? this.dp.getRaw(`cm.wb.${safe}.heartbeatRaw`) : null;
            const ocppLastCommand = ocppLastCommandRaw === null || ocppLastCommandRaw === undefined ? '' : String(ocppLastCommandRaw);
            const ocppLastCommandAtMs = parseEvcsCommandTimestamp(ocppLastCommandAtRaw);
            const ocppLastCommandSuccess = ocppLastCommandSuccessId ? toBool(ocppLastCommandSuccessRaw) : null;
            const ocppLastCommandError = ocppLastCommandErrorRaw === null || ocppLastCommandErrorRaw === undefined ? '' : String(ocppLastCommandErrorRaw);
            const ocppRequestedChargeLimitW = strictFiniteEvcsNumber(ocppRequestedChargeLimitRaw);
            const ocppAppliedChargeLimitW = strictFiniteEvcsNumber(ocppAppliedChargeLimitRaw);
            const ocppChargeLimitReason = ocppChargeLimitReasonRaw === null || ocppChargeLimitReasonRaw === undefined ? '' : String(ocppChargeLimitReasonRaw);
            const ocppChargeLimitClamped = ocppChargeLimitClampedId ? toBool(ocppChargeLimitClampedRaw) : null;

            const normalizePhaseFeedbackRuntime = (value) => {
                const raw = String(value ?? '').trim().toLowerCase();
                if (!raw) return null;
                if (raw === '1' || raw === '1p' || raw === 'one' || raw.includes('1-phase') || raw.includes('single')) return 1;
                if (raw === '3' || raw === '3p' || raw === 'three' || raw.includes('3-phase')) return 3;
                const n = Number(raw.replace(',', '.'));
                if (Number.isFinite(n)) return Math.round(n) === 1 ? 1 : (Math.round(n) === 3 ? 3 : null);
                return null;
            };
            const phaseFeedbackRaw = (phaseFeedbackId && this.dp) ? this.dp.getRaw(`cm.wb.${safe}.phaseFb`) : null;
            const feedbackPhaseCount = normalizePhaseFeedbackRuntime(phaseFeedbackRaw);
            const assumedPhaseCount = this._chargingPhaseAssumedBySafe && this._chargingPhaseAssumedBySafe.has(safe) ? this._chargingPhaseAssumedBySafe.get(safe) : null;
            const currentPhaseCount = chargerType === 'AC'
                ? (feedbackPhaseCount === 1 || feedbackPhaseCount === 3 ? feedbackPhaseCount : ((assumedPhaseCount === 1 || assumedPhaseCount === 3) ? assumedPhaseCount : phases))
                : 1;
            const effectiveRuntimePhaseCount = chargerType === 'AC' ? currentPhaseCount
                : (String(wb.dcCurrentReference || '') === 'dc-output' ? 1 : phases);

            // Diagnostics: freshness + mapping completeness
            const hasSetpoint = !!(setCurrentAId || setPowerWId);
            const mappingIssues = [];
            if (!hasSetpoint) mappingIssues.push('no_setpoint');
            if (!actualPowerWId) mappingIssues.push('no_power_meter');
            if (!statusId && !chargingStateId && !vehicleConnectedId && !chargeDemandId) mappingIssues.push('no_vehicle_state_mapping');
            if (chargeDemandObservationOnly) mappingIssues.push('observation_only_charge_demand_ignored');
            if (telemetryProfile === 'ocpp-1.6-event-driven' && !transactionActiveId) mappingIssues.push('ocpp_no_transaction_state');
            if (onlineIdWasDataFresh) mappingIssues.push('ocpp_online_datafresh_migrated');
            else if (onlineSourceMigrated) mappingIssues.push('ocpp_online_source_migrated');
            if (ocppDatapointMappingMigrated) mappingIssues.push('ocpp21_native_mapping_migrated');

            let meterAgeMs = 0;
            let meterStale = false;
            if (actualPowerWId && this.dp && typeof this.dp.getAgeMs === 'function') {
                const age = this.dp.getAgeMs(`cm.wb.${safe}.pW`);
                meterAgeMs = (Number.isFinite(age) && age >= 0) ? Math.round(age) : 0;
                meterStale = !(Number.isFinite(age)) ? true : (age > wbMeterStaleTimeoutMs);
            }

            let dataFreshAgeMs = null;
            if (dataFreshId && this.dp && typeof this.dp.getAgeMs === 'function') {
                const age = this.dp.getAgeMs(`cm.wb.${safe}.dataFreshRaw`);
                dataFreshAgeMs = Number.isFinite(age) && age >= 0 ? Math.round(age) : null;
            }
            const dataFreshBool = dataFreshId ? toBool(dataFreshRaw) : null;
            const dataFreshKnown = dataFreshBool === true || dataFreshBool === false;
            const dataFresh = dataFreshKnown ? dataFreshBool === true : null;
            // Freshness beeinflusst nur die Verwendbarkeit der Leistung. Die physische
            // OCPP-Verbindung wird ausschließlich ueber socketConnected bewertet.
            if (telemetryProfile === 'ocpp-1.6-event-driven' && dataFreshKnown && dataFresh !== true) {
                meterStale = true;
            }

            let onlineAgeMs = null;
            if (onlineId && this.dp && typeof this.dp.getAgeMs === 'function') {
                const age = this.dp.getAgeMs(`cm.wb.${safe}.onlineRaw`);
                onlineAgeMs = Number.isFinite(age) && age >= 0 ? Math.round(age) : null;
            }
            let chargingStateAgeMs = null;
            if (chargingStateId && this.dp && typeof this.dp.getAgeMs === 'function') {
                const age = this.dp.getAgeMs(`cm.wb.${safe}.chargingStateRaw`);
                chargingStateAgeMs = Number.isFinite(age) && age >= 0 ? Math.round(age) : null;
            }
            let transactionActiveAgeMs = null;
            if (transactionActiveId && this.dp && typeof this.dp.getAgeMs === 'function') {
                const age = this.dp.getAgeMs(`cm.wb.${safe}.transactionActiveRaw`);
                transactionActiveAgeMs = Number.isFinite(age) && age >= 0 ? Math.round(age) : null;
            }
            const transactionActiveBool = transactionActiveId ? toBool(transactionActiveRaw) : null;
            const transactionActiveKnown = transactionActiveBool === true || transactionActiveBool === false;
            const transactionActive = transactionActiveKnown ? transactionActiveBool === true : null;
            const ocppAdapterAliveBool = ocppAdapterAliveId ? toBool(ocppAdapterAliveRaw) : null;
            const ocppAdapterAliveKnown = ocppAdapterAliveBool === true || ocppAdapterAliveBool === false;
            const ocppAdapterAlive = ocppAdapterAliveKnown ? ocppAdapterAliveBool === true : null;

            let heartbeatAgeMs = null;
            if (heartbeatId && this.dp && typeof this.dp.getAgeMs === 'function') {
                const age = this.dp.getAgeMs(`cm.wb.${safe}.heartbeatRaw`);
                heartbeatAgeMs = Number.isFinite(age) && age >= 0 ? Math.round(age) : null;
            }
            const explicitOnlineFlag = onlineId ? normalizeEvcsOnlineFlag(onlineRaw, null) : null;
            const heartbeatFresh = heartbeatId
                ? (heartbeatAgeMs !== null && heartbeatAgeMs <= wbHeartbeatStaleTimeoutMs)
                : false;
            // Für NexoWatt OCPP wird bewusst `socketConnected` verwendet:
            // Messwert-/Heartbeat-Freshness bleibt getrennte Diagnose und darf eine
            // offene WebSocket-Verbindung nicht als offline melden. Der physische
            // Verbindungswert bleibt auch ohne zyklische Timestamp-Aktualisierung wahr.
            const onlineSignalFresh = onlineId
                ? (explicitOnlineFlag === true && (
                    telemetryProfile === 'ocpp-1.6-event-driven'
                    || (onlineAgeMs !== null && onlineAgeMs <= wbHeartbeatStaleTimeoutMs)
                ))
                : false;
            // Eventbasierte Hersteller-/CP-Zustände werden oft nur bei einer Änderung
            // geschrieben. Ein frischer Heartbeat, Online-DP, OCPP-Transaktionszustand
            // oder Leistungsmesswert bestätigt deshalb die Gerätekommunikation.
            const freshPowerMeterLiveness = !!(
                actualPowerWId
                && !meterStale
                && typeof pW === 'number'
                && Number.isFinite(pW)
            );
            const ocppRuntimeAlive = telemetryProfile !== 'ocpp-1.6-event-driven'
                || ocppAdapterAliveKnown !== true
                || ocppAdapterAlive === true;
            const vehicleLivenessFresh = ocppRuntimeAlive && (
                heartbeatFresh
                || onlineSignalFresh
                || freshPowerMeterLiveness
                || (telemetryProfile === 'ocpp-1.6-event-driven' && transactionActiveKnown)
            );

            const semanticAge = (key) => {
                if (!this.dp || typeof this.dp.getAgeMs !== 'function') return null;
                const age = this.dp.getAgeMs(key);
                return Number.isFinite(age) && age >= 0 ? Math.round(age) : null;
            };
            const vehicleConnectedAgeMs = vehicleConnectedId ? semanticAge(`cm.wb.${safe}.vehicleConnectedRaw`) : null;
            const chargeDemandAgeMs = chargeDemandId ? semanticAge(`cm.wb.${safe}.chargeDemandRaw`) : null;
            const vehicleConnectedFresh = !!(vehicleConnectedId && (
                (vehicleConnectedAgeMs !== null && vehicleConnectedAgeMs <= wbStatusStaleTimeoutMs)
                || vehicleLivenessFresh
            ));
            const chargeDemandFresh = !!(chargeDemandId && (
                (chargeDemandAgeMs !== null && chargeDemandAgeMs <= wbStatusStaleTimeoutMs)
                || vehicleLivenessFresh
            ));

            let statusAgeRawMs = null;
            if (statusId && this.dp && typeof this.dp.getAgeMs === 'function') {
                statusAgeRawMs = this.dp.getAgeMs(`cm.wb.${safe}.st`);
            }

            const statusRawText = (() => {
                if (statusRaw === null || statusRaw === undefined) return '';
                if (typeof statusRaw === 'string') return statusRaw.trim();
                try { return JSON.stringify(statusRaw); } catch { return String(statusRaw); }
            })();
            const statusAgePolicy = resolveEvcsStatusAgePolicy(statusRawText, statusAgeRawMs, wbStatusStaleTimeoutMs);
            const statusAgeMs = statusAgePolicy.ageMs;
            // `Available`/`Ready`/`Idle` bleiben als stabile Bereitschaft gueltig.
            // Hersteller-/CP-Zustaende wie ABL B2 duerfen bei frischem Heartbeat
            // ebenfalls weiter als Fahrzeugbeweis gelten. Sicherheitszustaende
            // (Faulted/Unavailable/Offline/Charging) werden dagegen niemals nur
            // wegen eines Heartbeats als aktuell behandelt.
            const statusStale = !!(statusId && statusAgePolicy.stale);
            const statusSourceConnectorNo = inferOcppConnectorNoFromObjectId(statusId);
            const statusConnectorMismatch = !!(
                statusId
                && connectorNo > 0
                && statusSourceConnectorNo !== null
                && Number(statusSourceConnectorNo) !== Number(connectorNo)
            );
            const statusSharedAcrossConnectors = !!(
                statusId
                && connectorNo > 0
                && statusConnectorUsage.has(statusId)
                && statusConnectorUsage.get(statusId).size > 1
            );
            const statusScope = statusSharedAcrossConnectors
                ? 'station-shared'
                : (statusSourceConnectorNo !== null
                    ? `connector-${statusSourceConnectorNo}`
                    : (connectorNo > 0 ? `connector-${connectorNo}-assigned` : 'station-or-unknown'));
            if (statusConnectorMismatch) mappingIssues.push('status_connector_mismatch');
            if (statusSharedAcrossConnectors) mappingIssues.push('status_shared_across_connectors');
            const statusIgnoredReasonBase = statusConnectorMismatch
                ? `status-dp-connector-${statusSourceConnectorNo}-for-connector-${connectorNo}`
                : (statusSharedAcrossConnectors
                    ? `status-dp-shared-by-${statusConnectorUsage.get(statusId).size}-connectors`
                    : '');
            const statusTimestampFresh = !!(statusId && !statusStale && !statusConnectorMismatch && !statusSharedAcrossConnectors && statusRawText);
            const semanticPreview = classifyUniversalEvcsVehicleStatus({
                status: statusRawText,
                statusFresh: true,
                statusDemandValues: wb.statusDemandValues || wb.statusReadyValues || '',
                statusConnectedValues: wb.statusConnectedValues || '',
                statusDisconnectedValues: wb.statusDisconnectedValues || '',
                statusNoDemandValues: wb.statusNoDemandValues || '',
            });
            const statusHeldByLiveness = !!(
                statusId
                && statusRawText
                && !statusConnectorMismatch
                && !statusSharedAcrossConnectors
                && statusStale
                && vehicleLivenessFresh
                && (
                    isPersistentEvcsVehicleState(semanticPreview.state)
                    || (
                        telemetryProfile === 'ocpp-1.6-event-driven'
                        && isOcppEventStatusPersistentState(semanticPreview.state)
                    )
                )
            );
            const statusFresh = statusTimestampFresh || statusHeldByLiveness;
            const statusIgnoredReason = statusIgnoredReasonBase
                || (!statusFresh && statusId && statusRawText ? 'status-stale' : '');
            const statusFreshReason = statusFresh
                ? (
                    statusTimestampFresh
                        ? 'status-timestamp-fresh'
                        : (telemetryProfile === 'ocpp-1.6-event-driven'
                            ? 'status-held-by-ocpp-event-liveness'
                            : 'status-held-by-fresh-device-liveness')
                )
                : (statusIgnoredReason || 'status-missing');
            // Safety classification only trusts the timestamp/persistent OCPP-ready
            // policy. A stale fault/charging state is never revived by heartbeat.
            const safetyStatusFresh = telemetryProfile === 'ocpp-1.6-event-driven'
                ? statusFresh
                : (statusTimestampFresh || statusAgePolicy.persistentReady);
            const classifiedStatus = classifyEvcsConnectorStatus(statusRawText, safetyStatusFresh);
            const faultActive = !!classifiedStatus.faultActive;
            const unavailableActive = !!classifiedStatus.unavailableActive;
            let operationalBlocked = !!classifiedStatus.operationalBlocked;
            const rawStatusClass = classifyEvcsConnectorStatus(statusRawText, true);
            const faultReason = faultActive
                ? statusRawText
                : (rawStatusClass.faultActive && statusIgnoredReason ? `${statusIgnoredReason}:${statusRawText}` : '');
            const unavailableReason = unavailableActive
                ? statusRawText
                : (rawStatusClass.unavailableActive && statusIgnoredReason ? `${statusIgnoredReason}:${statusRawText}` : '');

            let statusClass = classifiedStatus.statusClass;
            if (!statusFresh && statusRawText) statusClass = statusConnectorMismatch
                ? 'ignored-connector-mismatch'
                : (statusSharedAcrossConnectors ? 'ignored-station-shared' : 'stale');
            const statusEffective = statusFresh ? statusRawText : '';

            // Erreichbarkeit und Betriebsstoerung sind getrennte Wahrheiten:
            // - ein expliziter Online-DP ist autoritativ;
            // - ein frischer Connectorstatus bestaetigt Erreichbarkeit, auch bei Faulted;
            // - ein Connector-0-Status darf fuer Connector 1..N weder online noch faulted liefern.
            // Erreichbarkeit hängt nicht von Kundenfreigabe oder EMS-Regelung ab.
            // Sonst könnte ein `userStationEnabled=false` den Ladepunkt künstlich
            // offline machen und genau den Disable-Befehl an `enableWriteId` verhindern.
            let online = cfgEnabled;
            let onlineSource = 'config-fallback';
            if (onlineId) {
                const explicitOnline = explicitOnlineFlag;
                if (explicitOnline === null) {
                    online = statusFresh ? normalizeEvcsStatusReachability(statusRaw, cfgEnabled) : cfgEnabled;
                    onlineSource = statusFresh ? 'status-fallback-after-unknown-online-dp' : 'config-fallback-after-unknown-online-dp';
                } else {
                    online = explicitOnline;
                    onlineSource = 'online-dp';
                }
            } else if (statusFresh) {
                online = normalizeEvcsStatusReachability(statusRaw, true);
                onlineSource = 'fresh-connector-status';
            } else if (actualPowerWId && !meterStale) {
                online = true;
                onlineSource = 'fresh-power-meter';
            }
            if (telemetryProfile === 'ocpp-1.6-event-driven' && ocppAdapterAliveKnown && ocppAdapterAlive !== true) {
                online = false;
                onlineSource = 'ocpp-adapter-not-alive';
            }

            let controlAvailable = !!(enabled && online && !operationalBlocked);
            const previousCommandW = this._lastCmdTargetW.get(safe);
            const effectivePower = resolveEvcsEffectivePower({
                telemetryProfile,
                rawPowerW: pW,
                rawMeterStale: meterStale,
                online,
                enabled,
                normalizedState: statusFresh ? semanticPreview.state : 'unknown',
                statusAuthoritative: statusFresh,
                transactionActive,
                transactionKnown: transactionActiveKnown,
                lastCommandW: previousCommandW,
            });
            const pWRawNum = strictFiniteEvcsNumber(pW);
            const pWNum = Number(effectivePower.effectivePowerW) || 0;
            const pWUsed = pWNum;
            const effectiveMeterStale = effectivePower.effectiveMeterStale === true;
            // Ein optionaler, veralteter oder absichtlich ignorierter Status-DP ist
            // Diagnose, aber kein Messwert-Failsafe. Für OCPP kann ein Status oder
            // StopTransaction einen effektiven 0-W-Wert autoritativ bestätigen.
            const staleAny = !!effectiveMeterStale;
            const priorOcppTargetW = Number.isFinite(Number(previousCommandW))
                ? Number(previousCommandW)
                : ocppRequestedChargeLimitW;
            const ocppCommandConfirmation = telemetryProfile === 'ocpp-1.6-event-driven'
                ? evaluateOcppCommandConfirmation({
                    targetW: priorOcppTargetW,
                    requestedW: ocppRequestedChargeLimitW,
                    appliedW: ocppAppliedChargeLimitW,
                    lastSuccess: ocppLastCommandSuccess,
                    lastError: ocppLastCommandError,
                    reason: ocppChargeLimitReason,
                    commandAt: ocppLastCommandAtMs,
                    now,
                })
                : { known: false, confirmed: true, state: 'not-applicable', ageMs: null, zeroHeld: false };

            // Publish diagnostics (UI)
            try {
                await this._queueState(`${ch}.mappingOk`, hasSetpoint, true);
                await this._queueState(`${ch}.hasSetpoint`, hasSetpoint, true);
                await this._queueState(`${ch}.mappingIssues`, JSON.stringify(mappingIssues), true);
                await this._queueState(`${ch}.telemetryProfile`, telemetryProfile, true);
                await this._queueState(`${ch}.telemetryAutoDetected`, telemetryAutoDetected, true);
                await this._queueState(`${ch}.ocppConnectorRoot`, telemetryProfile === 'ocpp-1.6-event-driven' ? String(ocppContext.connectorRoot || '') : '', true);
                await this._queueState(`${ch}.ocppAdapterKind`, telemetryProfile === 'ocpp-1.6-event-driven' ? String(ocppContext.adapterKind || 'legacy-ocpp') : '', true);
                await this._queueState(`${ch}.ocppDatapointContract`, telemetryProfile === 'ocpp-1.6-event-driven' ? String(ocppContext.contractVersion || '') : '', true);
                await this._queueState(`${ch}.ocppDatapointMappingMigrated`, ocppDatapointMappingMigrated, true);
                await this._queueState(`${ch}.ocppDatapointMappingMigrations`, JSON.stringify(ocppDatapointMigrations), true);
                await this._queueState(`${ch}.setpointRefreshMs`, setpointRefreshMs, true);
                await this._queueState(`${ch}.ocppLastCommand`, telemetryProfile === 'ocpp-1.6-event-driven' ? ocppLastCommand : '', true);
                await this._queueState(`${ch}.ocppLastCommandAt`, telemetryProfile === 'ocpp-1.6-event-driven' ? ocppLastCommandAtMs : 0, true);
                await this._queueState(`${ch}.ocppLastCommandSuccess`, telemetryProfile === 'ocpp-1.6-event-driven' ? ocppLastCommandSuccess === true : true, true);
                await this._queueState(`${ch}.ocppLastCommandError`, telemetryProfile === 'ocpp-1.6-event-driven' ? ocppLastCommandError : '', true);
                await this._queueState(`${ch}.ocppRequestedChargeLimitW`, telemetryProfile === 'ocpp-1.6-event-driven' && ocppRequestedChargeLimitW !== null ? ocppRequestedChargeLimitW : 0, true);
                await this._queueState(`${ch}.ocppAppliedChargeLimitW`, telemetryProfile === 'ocpp-1.6-event-driven' && ocppAppliedChargeLimitW !== null ? ocppAppliedChargeLimitW : 0, true);
                await this._queueState(`${ch}.ocppChargeLimitReason`, telemetryProfile === 'ocpp-1.6-event-driven' ? ocppChargeLimitReason : '', true);
                await this._queueState(`${ch}.ocppChargeLimitClamped`, telemetryProfile === 'ocpp-1.6-event-driven' ? ocppChargeLimitClamped === true : false, true);
                await this._queueState(`${ch}.hardwareCommandConfirmed`, telemetryProfile === 'ocpp-1.6-event-driven' ? ocppCommandConfirmation.confirmed === true : true, true);
                await this._queueState(`${ch}.hardwareCommandState`, telemetryProfile === 'ocpp-1.6-event-driven' ? String(ocppCommandConfirmation.state || 'unknown') : 'not-applicable', true);
                await this._queueState(`${ch}.hardwareCommandAgeMs`, telemetryProfile === 'ocpp-1.6-event-driven' && ocppCommandConfirmation.ageMs !== null ? Math.round(ocppCommandConfirmation.ageMs) : 0, true);
                await this._queueState(`${ch}.onlineSourceId`, onlineId, true);
                await this._queueState(`${ch}.onlineIdWasDataFresh`, onlineIdWasDataFresh, true);
                await this._queueState(`${ch}.onlineSourceMigrated`, onlineSourceMigrated, true);
                await this._queueState(`${ch}.dataFreshSourceId`, dataFreshId, true);
                await this._queueState(`${ch}.dataFresh`, dataFreshKnown ? dataFresh === true : false, true);
                await this._queueState(`${ch}.dataFreshKnown`, dataFreshKnown, true);
                await this._queueState(`${ch}.dataFreshAgeMs`, dataFreshAgeMs === null ? 0 : dataFreshAgeMs, true);
                await this._queueState(`${ch}.powerRawW`, pWRawNum === null ? 0 : pWRawNum, true);
                await this._queueState(`${ch}.powerEffectiveW`, pWNum, true);
                await this._queueState(`${ch}.powerSource`, String(effectivePower.powerSource || ''), true);
                await this._queueState(`${ch}.powerAuthoritativeZero`, effectivePower.authoritativeZero === true, true);
                await this._queueState(`${ch}.meterAgeMs`, meterAgeMs, true);
                await this._queueState(`${ch}.meterRawStale`, !!meterStale, true);
                await this._queueState(`${ch}.meterStale`, !!effectiveMeterStale, true);
                await this._queueState(`${ch}.chargingStateRaw`, chargingStateRaw === null || chargingStateRaw === undefined ? '' : String(chargingStateRaw), true);
                await this._queueState(`${ch}.chargingStateSourceId`, chargingStateId, true);
                await this._queueState(`${ch}.chargingStateAgeMs`, chargingStateAgeMs === null ? 0 : chargingStateAgeMs, true);
                await this._queueState(`${ch}.transactionActive`, transactionActiveKnown ? transactionActive === true : false, true);
                await this._queueState(`${ch}.transactionActiveKnown`, transactionActiveKnown, true);
                await this._queueState(`${ch}.transactionActiveAgeMs`, transactionActiveAgeMs === null ? 0 : transactionActiveAgeMs, true);
                await this._queueState(`${ch}.transactionActiveSourceId`, transactionActiveId, true);
                await this._queueState(`${ch}.ocppAdapterAlive`, ocppAdapterAliveKnown ? ocppAdapterAlive === true : false, true);
                await this._queueState(`${ch}.ocppAdapterAliveKnown`, ocppAdapterAliveKnown, true);
                await this._queueState(`${ch}.ocppAdapterAliveSourceId`, ocppAdapterAliveId, true);
                await this._queueState(`${ch}.statusAgeMs`, statusAgeMs, true);
                await this._queueState(`${ch}.statusStale`, !!statusStale, true);
                await this._queueState(`${ch}.statusRaw`, statusRawText, true);
                await this._queueState(`${ch}.statusSourceId`, statusId, true);
                await this._queueState(`${ch}.statusSourceConnectorNo`, statusSourceConnectorNo === null ? -1 : Number(statusSourceConnectorNo), true);
                await this._queueState(`${ch}.statusConnectorMismatch`, statusConnectorMismatch, true);
                await this._queueState(`${ch}.statusSharedAcrossConnectors`, statusSharedAcrossConnectors, true);
                await this._queueState(`${ch}.statusScope`, statusScope, true);
                await this._queueState(`${ch}.statusIgnoredReason`, statusIgnoredReason, true);
                await this._queueState(`${ch}.statusFresh`, statusFresh, true);
                await this._queueState(`${ch}.statusFreshReason`, statusFreshReason, true);
                await this._queueState(`${ch}.heartbeatSourceId`, heartbeatId, true);
                await this._queueState(`${ch}.heartbeatRaw`, heartbeatRaw === null || heartbeatRaw === undefined ? '' : String(heartbeatRaw), true);
                await this._queueState(`${ch}.heartbeatAgeMs`, heartbeatAgeMs === null ? 0 : heartbeatAgeMs, true);
                await this._queueState(`${ch}.heartbeatFresh`, heartbeatFresh, true);
                await this._queueState(`${ch}.vehicleLivenessFresh`, vehicleLivenessFresh, true);
                await this._queueState(`${ch}.statusEffective`, statusEffective, true);
                await this._queueState(`${ch}.statusClass`, statusClass, true);
                await this._queueState(`${ch}.onlineSource`, onlineSource, true);
                await this._queueState(`${ch}.faultActive`, faultActive, true);
                await this._queueState(`${ch}.faultReason`, faultReason, true);
                await this._queueState(`${ch}.unavailableActive`, unavailableActive, true);
                await this._queueState(`${ch}.unavailableReason`, unavailableReason, true);
                await this._queueState(`${ch}.operationalBlocked`, operationalBlocked, true);
                await this._queueState(`${ch}.rfidAuthorized`, rfidAuthorized, true);
                await this._queueState(`${ch}.rfidEnforced`, rfidEnforced, true);
                await this._queueState(`${ch}.rfidLockActive`, rfidLockActive, true);
                await this._queueState(`${ch}.rfidReason`, rfidReason, true);
                await this._queueState(`${ch}.availabilityOwner`, availabilityRequest.owner, true);
                await this._queueState(`${ch}.availabilityRequested`, availabilityRequest.requested, true);
                await this._queueState(`${ch}.availabilityRequestReason`, availabilityRequest.reason, true);
            } catch {
                // ignore
            }

            // Charging detection uses only the normalized effective power. OCPP
            // MeterValues may remain positive as a raw value after StopTransaction.
            const pWAbs = Math.abs(pWUsed);
            const isChargingRaw = online && enabled && pWAbs >= activityThresholdW;
            
            // Session tracking / stickiness
            this._chargingLastSeenMs.set(safe, now); if (this._chargingLastSeenMs.size > 1000) { const __rc85Oldest = this._chargingLastSeenMs.keys().next().value; if (__rc85Oldest !== undefined) this._chargingLastSeenMs.delete(__rc85Oldest); } // RC85_BOUNDED_COLLECTION
            
            let chargingSince = 0;
            let lastActive = 0;
            const prevSince = this._chargingSinceMs.get(safe);
            if (typeof prevSince === 'number' && Number.isFinite(prevSince) && prevSince > 0) chargingSince = prevSince;
            const prevLastActive = this._chargingLastActiveMs.get(safe);
            if (typeof prevLastActive === 'number' && Number.isFinite(prevLastActive) && prevLastActive > 0) lastActive = prevLastActive;
            
            if (!enabled || effectivePower.sessionEnded === true) {
                // Disabled or OCPP transaction/terminal status ended: clear immediately.
                chargingSince = 0;
                lastActive = 0;
                this._chargingSinceMs.delete(safe);
                this._chargingLastActiveMs.delete(safe);
            } else if (isChargingRaw) {
                // If we were idle longer than sessionKeepMs, start a new session
                if (!chargingSince || !lastActive || (now - lastActive) > sessionKeepMs) chargingSince = now;
                lastActive = now;
                this._chargingSinceMs.set(safe, chargingSince);
                this._chargingLastActiveMs.set(safe, lastActive);
            } else {
                // Not actively charging: keep session for a while to avoid splits on short dips
                if (chargingSince && lastActive) {
                    const idleMs = now - lastActive;
                    const offlineTooLong = (!online && idleMs > stopGraceMs);
                    if (idleMs > sessionKeepMs || offlineTooLong) {
                        chargingSince = 0;
                        lastActive = 0;
                        this._chargingSinceMs.delete(safe);
                        this._chargingLastActiveMs.delete(safe);
                    }
                } else {
                    this._chargingSinceMs.delete(safe);
                    this._chargingLastActiveMs.delete(safe);
                }
            }
            
            // NOTE: JS '&&' returns the last evaluated operand, which can be a number (e.g. 0)
            // -> enforce proper boolean types for ioBroker states (common.type = boolean).
            const inGrace = !!(
                effectivePower.authoritativeZero !== true
                && chargingSince
                && lastActive
                && (now - lastActive) <= stopGraceMs
            );
            const isCharging = !!(online && enabled && (isChargingRaw || inGrace));
            const chargingSinceForState = isCharging ? chargingSince : 0;
            try {
                await this._queueState(`${ch}.phaseMode`, phaseMode, true);
                await this._queueState(`${ch}.currentPhaseCount`, currentPhaseCount, true);
                await this._queueState(`${ch}.targetPhaseCount`, currentPhaseCount, true);
                await this._queueState(`${ch}.phaseSwitchReason`, '', true);
                const cdUntil = this._chargingPhaseCooldownUntilMs && this._chargingPhaseCooldownUntilMs.has(safe) ? Number(this._chargingPhaseCooldownUntilMs.get(safe)) : 0;
                await this._queueState(`${ch}.phaseCooldownRemainingMs`, Math.max(0, cdUntil - now), true);
            } catch {
                // ignore phase diagnostics
            }
            // Determine effective control basis for this device
            const hasSetA = !!setCurrentAId;
            const hasSetW = !!setPowerWId;

            const electricalConfig = { ...wb, chargerType, controlBasis: controlBasisCfg, setCurrentAId, setPowerWId, minA: configuredMinA, maxA: configuredMaxA, stepW: num(wb.stepW, stepW), stepA: num(wb.stepA, stepA) };
            const electricalCheck = validateEvcsElectricalConfig(electricalConfig);
            const resolvedControlBasis = resolveEvcsControlBasis(electricalConfig);
            // A missing preferred channel may use an available channel only for a safe zero.
            const controlBasis = resolvedControlBasis === 'none' ? (hasSetW ? 'powerW' : (hasSetA ? 'currentA' : 'none')) : resolvedControlBasis;
            const dcVoltageId = String(wb.dcVoltageId || '').trim();
            const dcVoltageKey = dcVoltageId ? `cm.wb.${safe}.dcVoltageV` : '';
            if (dcVoltageKey && this.dp) await this.dp.upsert({ key: dcVoltageKey, objectId: dcVoltageId, dataType: 'number', direction: 'in', unit: 'V' });
            const dcVoltageAgeMs = dcVoltageKey && this.dp ? this.dp.getAgeMs(dcVoltageKey) : Infinity;
            const dcVoltageV = dcVoltageKey && this.dp ? this.dp.getNumber(dcVoltageKey, null) : null;
            const dcElectrical = chargerType === 'DC' ? resolveDcElectricalLimits(electricalConfig, {
                voltageV: dcVoltageV, fresh: Number.isFinite(dcVoltageAgeMs) && dcVoltageAgeMs <= 10000,
            }) : null;
            const electricalLimitsValid = dcElectrical ? dcElectrical.valid : electricalCheck.valid;
            const electricalLimitsError = (dcElectrical ? dcElectrical.errors : electricalCheck.errors).join(' ');
            if (!electricalLimitsValid) {
                controlAvailable = false;
                operationalBlocked = true;
                mappingIssues.push('electrical_limits_invalid');
            }
            const acThreePhaseLimits = chargerType === 'AC' ? resolveAcChargingLimits({
                phases: 3, voltageV, minA: configuredMinA, maxA: configuredMaxA,
                minPowerW: minPowerWCfg, maxPowerW: maxPowerWCfg,
                defaultMinA, defaultMaxA, controlBasis, acMinPower3pW,
            }) : null;
            let vFactor = voltageV * effectiveRuntimePhaseCount;
            let minPW = 0;
            let maxPW = 0;
            if (chargerType === 'DC') {
                minPW = dcElectrical.minPowerW;
                maxPW = dcElectrical.maxPowerW;
                minA = dcElectrical.minA;
                maxA = dcElectrical.maxA;
                if (controlBasis === 'currentA') vFactor = dcElectrical.factorWPerA;
            } else {
                // AC: Strom- und Leistungsangaben sind gleichwertige lokale
                // Grenzwerte. Ist nur einer gesetzt, wird der andere daraus
                // abgeleitet; sind beide gesetzt, gilt die strengere Obergrenze.
                // Dadurch erreicht Boost zuverlässig den im AppCenter definierten
                // Maximalwert, ohne eine zweite, unbemerkte Standardgrenze zu
                // überschreiten. Eine Obergrenze unterhalb der technischen
                // Mindestleistung bleibt absichtlich minPW > maxPW und führt später
                // zu einem sauberen 0-A/0-W-Stopp.
                const acLimits = resolveAcChargingLimits({
                    phases: effectiveRuntimePhaseCount,
                    voltageV,
                    minA: configuredMinA,
                    maxA: configuredMaxA,
                    minPowerW: minPowerWCfg,
                    maxPowerW: maxPowerWCfg,
                    defaultMinA,
                    defaultMaxA,
                    controlBasis,
                    acMinPower3pW,
                });
                minA = clamp(num(acLimits.minA, defaultMinA), 0, 2000);
                maxA = clamp(num(acLimits.maxA, defaultMaxA), 0, 2000);
                minPW = Math.max(0, num(acLimits.minPowerW, minA * vFactor));
                maxPW = Math.max(0, num(acLimits.maxPowerW, maxA * vFactor));
            }
            if (!electricalLimitsValid) { minPW = 0; maxPW = 0; }
            await this._queueState(`${ch}.electricalLimitsValid`, electricalLimitsValid, true);
            await this._queueState(`${ch}.electricalLimitsError`, electricalLimitsError, true);

            const maxPWBefore14a = maxPW;
            let para14aCapW = 0;
            let para14aCapped = false;

            // -------------------------------------------------------------
            // §14a EnWG per-wallbox cap (if active)
            // Apply after min/max derivation so we can safely clamp.
            // -------------------------------------------------------------
            if (para14aActive) {
                const capW = (para14aCapsBySafe && typeof para14aCapsBySafe[safe] === 'number' && Number.isFinite(para14aCapsBySafe[safe]))
                    ? Number(para14aCapsBySafe[safe])
                    : null;
                if (typeof capW === 'number' && Number.isFinite(capW) && capW > 0) {
                    para14aCapW = capW;
                    // Mark §14a as binding for this connector only if it reduces the effective max.
                    if (Number.isFinite(maxPWBefore14a) && capW < (maxPWBefore14a - 1)) {
                        para14aCapped = true;
                    }

                    // §14a begrenzt den netzwirksamen Bezug, nicht die physische
                    // Gesamtleistung des Ladepunkts. Der lokale PV-Anteil wird später
                    // zentral zusätzlich freigegeben. Deshalb bleibt `maxPW` hier die
                    // echte Wallbox-/Installationsgrenze; die §14a-Grenze wird in
                    // Budget und finaler Safety-Write-Firewall angewendet.
                }
            }

            const pWFreshActualForGridW = (online && enabled && !effectiveMeterStale)
                ? Math.max(0, Math.abs(pWNum))
                : 0;
            const pWStaleIgnoredForGridW = (online && enabled && effectiveMeterStale && pWRawNum !== null)
                ? Math.max(0, Math.abs(pWRawNum))
                : 0;

            if (typeof pWUsed === 'number' && Number.isFinite(pWUsed)) totalPowerW += pWUsed;
            totalFreshActualPowerW += pWFreshActualForGridW;
            totalStaleActualIgnoredForGridW += pWStaleIgnoredForGridW;
            if (typeof iA === 'number' && !meterStale) totalCurrentA += iA;
            if (online) onlineCount += 1;

            await this._queueState(`${ch}.name`, String(wb.name || key), true);
            await this._queueState(`${ch}.cfgEnabled`, cfgEnabled, true);
            await this._queueState(`${ch}.stationEnabled`, stationEnabled, true);
            await this._queueState(`${ch}.stationEnableControlAvailable`, !!enableId, true);
            await this._queueState(`${ch}.enabled`, enabled, true);
            await this._queueState(`${ch}.online`, online, true);
            await this._queueState(`${ch}.priority`, priority, true);
            await this._queueState(`${ch}.chargerType`, chargerType, true);
            await this._queueState(`${ch}.controlBasis`, controlBasis, true);
            await this._queueState(`${ch}.stationKey`, stationKey || '', true);
            await this._queueState(`${ch}.connectorNo`, connectorNo || 0, true);
            await this._queueState(`${ch}.stationMaxPowerW`, (typeof stationMaxPowerW === 'number' && Number.isFinite(stationMaxPowerW)) ? stationMaxPowerW : 0, true);
            await this._queueState(`${ch}.allowBoost`, !!allowBoost, true);
            await this._queueState(`${ch}.phases`, phases, true);
            await this._queueState(`${ch}.phaseSwitchSupported`, !!phaseSwitchId && chargerType === 'AC', true);
            await this._queueState(`${ch}.phaseMode`, phaseMode, true);
            // userPhaseMode is writable; do NOT overwrite here. phaseMode above is the effective mode.
            await this._queueState(`${ch}.minPowerW`, minPW, true);
            await this._queueState(`${ch}.maxPowerW`, maxPW, true);
            await this._queueState(`${ch}.para14aCapW`, para14aCapW || 0, true);
            await this._queueState(`${ch}.para14aCapped`, !!para14aCapped, true);
            await this._queueState(`${ch}.actualPowerRawW`, pWRawNum === null ? 0 : pWRawNum, true);
            await this._queueState(`${ch}.actualPowerW`, pWNum, true);
            await this._queueState(`${ch}.actualCurrentA`, typeof iA === 'number' ? iA : 0, true);

            await this._queueState(`${ch}.charging`, isCharging, true);
            await this._queueState(`${ch}.chargingSince`, chargingSinceForState, true);
            await this._queueState(`${ch}.chargingRaw`, isChargingRaw, true);
            await this._queueState(`${ch}.lastActive`, lastActive || 0, true);
            await this._queueState(`${ch}.idleMs`, lastActive ? (now - lastActive) : 0, true);
            await this._queueState(`${ch}.allocationRank`, 0, true);
            // userMode is writable; do NOT overwrite here. effectiveMode will be set later.
            // Zeit-Ziel Laden (Depot-/Deadline-Laden)
            let goalEnabled = false;
            let goalTargetSocPct = 100;
            let goalFinishTs = 0;
            let goalBatteryKwhUser = 0;

            try {
                const st = await this._getStateCached(`${ch}.goalEnabled`);
                goalEnabled = !!(st && st.val);
            } catch {
                goalEnabled = false;
            }

            try {
                const st = await this._getStateCached(`${ch}.goalTargetSocPct`);
                const v = st ? Number(st.val) : NaN;
                goalTargetSocPct = Number.isFinite(v) ? clamp(v, 0, 100) : 100;
            } catch {
                goalTargetSocPct = 100;
            }

            try {
                const st = await this._getStateCached(`${ch}.goalFinishTs`);
                const v = st ? Number(st.val) : NaN;
                goalFinishTs = Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0;
            } catch {
                goalFinishTs = 0;
            }

            // UX/Serienreife: Zeit‑Ziel Laden soll wie eine tägliche Uhrzeit funktionieren.
            // 1) Minuten immer auf 15‑Min Raster quantisieren (00/15/30/45).
            // 2) Wenn die Deadline erreicht/überschritten wurde: automatisch auf die nächste
            //    kommende gleiche Uhrzeit (nächster Tag) weiterschieben, damit es täglich weiterläuft.
            if (goalFinishTs > 0) {
                let nextTs = quantizeTsTo15Min(goalFinishTs);
                if (goalEnabled && nextTs > 0 && now >= nextTs) {
                    nextTs = nextOccurrenceSameClock(nextTs, now);
                }
                if (nextTs > 0 && nextTs !== goalFinishTs) {
                    goalFinishTs = nextTs;
                    try { await this._queueState(`${ch}.goalFinishTs`, goalFinishTs, true); } catch {
                        // ignore
                    }
                }
            }

            try {
                const st = await this._getStateCached(`${ch}.goalBatteryKwh`);
                const v = st ? Number(st.val) : NaN;
                goalBatteryKwhUser = Number.isFinite(v) ? Math.max(0, v) : 0;
            } catch {
                goalBatteryKwhUser = 0;
            }

            let goalActive = false;
            let goalStatus = 'inactive';
            let goalVehicleSocPct = null;
            let goalSocAvailable = false;
            let goalRemainingMin = 0;
            let goalRequiredW = 0;
            let goalRequiredWh = 0;
            let goalDesiredW = 0;
            let goalShortfallW = 0;
            let goalUrgency = 0;
            let goalDeltaSocPct = 0;
            let goalOverdue = false;

            // Stable mapping from wallbox to EVCS index (independent from safe key)
            const evcsIndex = (wb && wb.evcsIndex !== undefined && wb.evcsIndex !== null) ? Number(wb.evcsIndex) : NaN;

            // Fahrzeug-/Ladebedarfserkennung. Anschlusszustand und tatsaechlicher
            // Leistungsbedarf werden bewusst getrennt: OCPP `Reserved`, stale Stati
            // oder alte Sollwerte duerfen kein EVCS-Budget blockieren.
            /** @type {boolean|null} */
            let vehiclePlugged = null;
            let vehiclePluggedSinceMs = 0;
            let vehicleDemandConfirmed = false;
            let vehicleStartEligible = false;
            let vehicleStartEligibilityReason = '';
            let vehicleDemandSource = '';
            let vehicleDemandReason = '';

            // `evcs.N.active` ist die Kunden-/RFID-Freigabe der Wallbox und kein
            // Fahrzeugkontakt. Fahrzeug und Ladebedarf kommen ausschließlich aus
            // den neuen semantischen DPs, frischer Leistung oder normalisiertem
            // Connector-/Herstellerstatus.

            // Prefer the dedicated EVCS/OCPP status when it is available. A stale
            // status is diagnostic only and cannot reserve energy.
            const chargingStateText = chargingStateRaw === null || chargingStateRaw === undefined ? '' : String(chargingStateRaw).trim();
            const chargingStateFresh = !!chargingStateText && (
                telemetryProfile === 'ocpp-1.6-event-driven'
                    ? (ocppRuntimeAlive && (chargingStateAgeMs === null || chargingStateAgeMs <= wbStatusStaleTimeoutMs || vehicleLivenessFresh))
                    : (chargingStateAgeMs !== null && chargingStateAgeMs <= wbStatusStaleTimeoutMs)
            );
            let fallbackStatusText = '';
            let fallbackStatusFresh = false;
            if (!statusId && Number.isFinite(evcsIndex) && evcsIndex > 0) {
                try {
                    const stS = await this._getStateCached(`evcs.${Math.round(evcsIndex)}.status`);
                    const vS = stS ? stS.val : null;
                    if (typeof vS === 'string' && vS.trim()) {
                        fallbackStatusText = vS.trim();
                        const tsS = Number(stS && stS.ts);
                        const ageS = Number.isFinite(tsS) && tsS > 0 ? Math.max(0, now - tsS) : Number.POSITIVE_INFINITY;
                        const fallbackAgePolicy = resolveEvcsStatusAgePolicy(vS, ageS, wbStatusStaleTimeoutMs);
                        const fallbackSemantic = classifyUniversalEvcsVehicleStatus({
                            status: vS,
                            statusFresh: true,
                            statusDemandValues: wb.statusDemandValues || wb.statusReadyValues || '',
                            statusConnectedValues: wb.statusConnectedValues || '',
                            statusDisconnectedValues: wb.statusDisconnectedValues || '',
                            statusNoDemandValues: wb.statusNoDemandValues || '',
                        });
                        fallbackStatusFresh = !fallbackAgePolicy.stale
                            || (vehicleLivenessFresh && isPersistentEvcsVehicleState(fallbackSemantic.state));
                    }
                } catch {
                    // keep mapped status evidence
                }
            }

            const mergedStatusEvidence = mergeUniversalEvcsStatusEvidence({
                evidence: [
                    { status: chargingStateText, fresh: chargingStateFresh, source: 'ocpp.transactions.chargingState' },
                    { status: statusEffective, fresh: statusFresh, source: 'wb.status-effective' },
                    { status: fallbackStatusText, fresh: fallbackStatusFresh, source: 'evcs.status' },
                ],
                statusDemandValues: wb.statusDemandValues || wb.statusReadyValues || '',
                statusReadyValues: wb.statusReadyValues || '',
                statusConnectedValues: wb.statusConnectedValues || '',
                statusDisconnectedValues: wb.statusDisconnectedValues || '',
                statusNoDemandValues: wb.statusNoDemandValues || '',
            });
            const statusForPlug = String(mergedStatusEvidence.raw || '');
            const statusForPlugSource = String(mergedStatusEvidence.evidenceSource || '');
            const statusForPlugFresh = mergedStatusEvidence.fresh === true;

            const connectedFlag = vehicleConnectedFresh
                ? resolveEvcsSemanticFlag(
                    vehicleConnectedRaw,
                    wb.vehicleConnectedTrueValues || '',
                    wb.vehicleConnectedFalseValues || '',
                )
                : { known: false, value: null, source: vehicleConnectedId ? 'stale-semantic-dp' : 'missing', token: '' };
            const demandFlag = chargeDemandFresh
                ? resolveEvcsSemanticFlag(
                    chargeDemandRaw,
                    wb.chargeDemandTrueValues || '',
                    wb.chargeDemandFalseValues || '',
                )
                : { known: false, value: null, source: chargeDemandId ? 'stale-semantic-dp' : 'missing', token: '' };
            let vehicleDemand = resolveUniversalEvcsVehicleDemand({
                actualPowerW: (!effectiveMeterStale && online && enabled) ? Math.abs(pWNum) : 0,
                activityThresholdW,
                status: statusForPlug,
                statusFresh: statusForPlugFresh,
                explicitConnected: connectedFlag.value,
                explicitConnectedKnown: connectedFlag.known,
                explicitDemand: demandFlag.value,
                explicitDemandKnown: demandFlag.known,
                statusDemandValues: wb.statusDemandValues || wb.statusReadyValues || '',
                statusReadyValues: wb.statusReadyValues || '',
                statusConnectedValues: wb.statusConnectedValues || '',
                statusDisconnectedValues: wb.statusDisconnectedValues || '',
                statusNoDemandValues: wb.statusNoDemandValues || '',
                classifiedStatus: mergedStatusEvidence,
            });
            vehicleDemand = reconcileOcppTransactionDemand({
                telemetryProfile,
                transactionKnown: transactionActiveKnown,
                transactionActive,
                vehicleDemand,
                actualPowerW: (!effectiveMeterStale && online && enabled) ? Math.abs(pWNum) : 0,
                activityThresholdW,
            });
            vehiclePlugged = vehicleDemand.plugged;
            vehicleDemandConfirmed = vehicleDemand.demandConfirmed === true;
            vehicleStartEligible = vehicleDemand.startEligible === true || vehicleDemandConfirmed;
            vehicleStartEligibilityReason = vehicleStartEligible
                ? String(vehicleDemand.reason || vehicleDemand.source || 'semantic-vehicle-contact')
                : String(vehicleDemand.reason || 'no-start-eligibility');
            vehicleDemandSource = String(vehicleDemand.source || '');
            vehicleDemandReason = String(vehicleDemand.reason || '');
            const vehicleStateNormalized = String(vehicleDemand.state || 'unknown');

            // Only measured vehicle watts are counted. Missing protected watts
            // are published separately as uncertainty, not as a fictitious 0-W load.
            // Wallbox-Eigenverbrauch unterhalb der Aktivitaetsschwelle (z. B. ABL
            // eMH1 mit rund 69 W im B2-Wartezustand) bleibt normale Gebaeudelast.
            const storagePolicyActualLoad = resolveEvcsStoragePolicyActualLoad({
                actualPowerW: pWFreshActualForGridW,
                meterFresh: !effectiveMeterStale,
                online,
                enabled,
                vehicleDemandConfirmed,
                vehicleStateNormalized,
                activityThresholdW,
                storageProtectionRequested,
                storageAssistRequested,
                physicalIdleConfirmed: !meterStale && pWRawNum !== null
                    && Math.abs(pWRawNum) < Math.max(1, activityThresholdW),
            });
            if (storagePolicyActualLoad.protectionRequested) storageProtectionRequestedWallboxes += 1;
            if (storagePolicyActualLoad.protectedLoadUnknown) storageProtectedUnknownWallboxes += 1;
            storageProtectedLoadW += storagePolicyActualLoad.protectedLoadW;
            storageAssistRequestedLoadW += storagePolicyActualLoad.assistRequestedLoadW;
            if (storagePolicyActualLoad.protectedWallbox) storageProtectedWallboxes += 1;
            try {
                await this._queueState(`${ch}.storagePolicyActualLoadW`, Math.round(storagePolicyActualLoad.actualVehicleLoadW), true);
                await this._queueState(`${ch}.storagePolicyActualLoadActive`, storagePolicyActualLoad.active === true, true);
                await this._queueState(`${ch}.storagePolicyLoadUnknown`, storagePolicyActualLoad.protectedLoadUnknown === true, true);
                await this._queueState(`${ch}.storagePolicyActualLoadReason`, String(storagePolicyActualLoad.reason || ''), true);
            } catch { /* diagnostics only */ }

            // Track plug transitions (used for SoC freshness gating)
            if (vehiclePlugged === true || vehiclePlugged === false) {
                const prev = this._vehiclePluggedPrev.get(safe);
                if (prev !== vehiclePlugged) {
                    if (vehiclePlugged === true) {
                        this._vehiclePluggedSinceMs.set(safe, now);
                    } else {
                        this._vehiclePluggedSinceMs.delete(safe);
                    }
                } else if (vehiclePlugged === true) {
                    const have = this._vehiclePluggedSinceMs.get(safe);
                    if (!Number.isFinite(have) || have <= 0) {
                        this._vehiclePluggedSinceMs.set(safe, now);
                    }
                }
                this._vehiclePluggedPrev.set(safe, vehiclePlugged);
            }

            vehiclePluggedSinceMs = this._vehiclePluggedSinceMs.get(safe) || 0;

            const vehicleStartResponseTimeoutForWallboxMs = telemetryProfile === 'ocpp-1.6-event-driven'
                ? Math.max(vehicleStartResponseTimeoutMs, ocppStartResponseTimeoutMs)
                : vehicleStartResponseTimeoutMs;
            let vehicleStartProbeSinceMs = Number(this._vehicleStartAttemptSinceMs.get(safe)) || 0;
            let vehicleStartCooldownUntilMs = Number(this._vehicleStartCooldownUntilMs.get(safe)) || 0;
            const realVehicleResponse = vehicleDemandConfirmed
                || ((!effectiveMeterStale && online && enabled) && Math.abs(pWNum) >= activityThresholdW)
                || vehicleStateNormalized === 'charging';
            if (!enabled || !online || !vehicleStartEligible) {
                this._vehicleStartAttemptSinceMs.delete(safe);
                this._vehicleStartCooldownUntilMs.delete(safe);
                vehicleStartProbeSinceMs = 0;
                vehicleStartCooldownUntilMs = 0;
            } else {
                if (realVehicleResponse) {
                    this._vehicleStartAttemptSinceMs.delete(safe);
                    this._vehicleStartCooldownUntilMs.delete(safe);
                    vehicleStartProbeSinceMs = 0;
                    vehicleStartCooldownUntilMs = 0;
                } else if (vehicleStartCooldownUntilMs > 0 && now >= vehicleStartCooldownUntilMs) {
                    this._vehicleStartCooldownUntilMs.delete(safe);
                    vehicleStartCooldownUntilMs = 0;
                }
            }

            let pvStartupHoldUntilMs = this._pvStartupUntilMs.get(safe) || 0;
            let pvMinRunUntilMs = this._pvMinRunUntilMs.get(safe) || 0;
            let pvStartCooldownUntilMs = this._pvStartCooldownUntilMs.get(safe) || 0;
            if (!enabled || !online || !vehicleStartEligible) {
                this._pvStartupUntilMs.delete(safe);
                this._pvStartReadySinceMs.delete(safe);
                this._pvBelowMinSinceMs.delete(safe);
                this._pvMinRunUntilMs.delete(safe);
                this._pvStartCooldownUntilMs.delete(safe);
                this._pvStartAttemptSinceMs.delete(safe);
                this._vehicleStartAttemptSinceMs.delete(safe);
                this._vehicleStartCooldownUntilMs.delete(safe);
                pvStartupHoldUntilMs = 0;
                pvMinRunUntilMs = 0;
                pvStartCooldownUntilMs = 0;
            } else {
                if (pvStartupHoldUntilMs > 0 && now >= pvStartupHoldUntilMs) {
                    this._pvStartupUntilMs.delete(safe);
                    pvStartupHoldUntilMs = 0;
                }
                if (pvMinRunUntilMs > 0 && now >= pvMinRunUntilMs) {
                    this._pvMinRunUntilMs.delete(safe);
                    pvMinRunUntilMs = 0;
                }
                if (pvStartCooldownUntilMs > 0 && now >= pvStartCooldownUntilMs) {
                    this._pvStartCooldownUntilMs.delete(safe);
                    pvStartCooldownUntilMs = 0;
                }
            }

            try {
                await this._queueState(`${ch}.vehiclePlugged`, vehiclePlugged === true, true);
                await this._queueState(`${ch}.vehiclePluggedSource`, vehicleDemandSource, true);
                await this._queueState(`${ch}.vehicleDemandConfirmed`, vehicleDemandConfirmed, true);
                await this._queueState(`${ch}.vehicleDemandSource`, vehicleDemandSource, true);
                await this._queueState(`${ch}.vehicleDemandReason`, vehicleDemandReason, true);
                await this._queueState(`${ch}.vehicleStartEligible`, vehicleStartEligible, true);
                await this._queueState(`${ch}.vehicleStartEligibilityReason`, vehicleStartEligibilityReason, true);
                await this._queueState(`${ch}.vehicleStartProbeActive`, vehicleStartProbeSinceMs > 0, true);
                await this._queueState(`${ch}.vehicleStartProbeSince`, vehicleStartProbeSinceMs, true);
                await this._queueState(`${ch}.vehicleStartCooldownUntil`, vehicleStartCooldownUntilMs, true);
                await this._queueState(`${ch}.vehicleStartResponseTimeoutSec`, Math.round(vehicleStartResponseTimeoutForWallboxMs / 1000), true);
                await this._queueState(`${ch}.vehicleStateNormalized`, vehicleStateNormalized, true);
                await this._queueState(`${ch}.vehicleConnectedRaw`, vehicleConnectedRaw === null || vehicleConnectedRaw === undefined ? '' : String(vehicleConnectedRaw), true);
                await this._queueState(`${ch}.vehicleConnectedKnown`, connectedFlag.known === true, true);
                await this._queueState(`${ch}.vehicleConnectedAgeMs`, vehicleConnectedAgeMs === null ? 0 : vehicleConnectedAgeMs, true);
                await this._queueState(`${ch}.vehicleConnectedFresh`, vehicleConnectedFresh, true);
                await this._queueState(`${ch}.chargeDemandRaw`, chargeDemandRaw === null || chargeDemandRaw === undefined ? '' : String(chargeDemandRaw), true);
                await this._queueState(`${ch}.chargeDemandKnown`, demandFlag.known === true, true);
                await this._queueState(`${ch}.chargeDemandAgeMs`, chargeDemandAgeMs === null ? 0 : chargeDemandAgeMs, true);
                await this._queueState(`${ch}.chargeDemandFresh`, chargeDemandFresh, true);
                await this._queueState(`${ch}.vehicleConnectedSourceId`, vehicleConnectedId, true);
                await this._queueState(`${ch}.chargeDemandSourceId`, chargeDemandId, true);
            } catch {
                // ignore
            }

            // Goal-Charging (Zielladen) is only supported in AUTO mode.
            if (goalEnabled) {
                if (userMode !== 'auto') {
                    goalStatus = 'auto_only';
                } else
                if (!Number.isFinite(evcsIndex) || evcsIndex <= 0) {
                    goalStatus = 'no_index';
                } else
                if (vehicleStartEligible !== true) {
                    // Zeit-Ziel darf fuer ein sicher angeschlossenes Fahrzeug bereits
                    // vor dem ersten Stromfluss planen. Ein ausdruecklicher Kein-Bedarf-
                    // Zustand (z. B. SuspendedEV / Fahrzeug voll) bleibt gesperrt.
                    goalStatus = vehiclePlugged === true ? 'vehicle_not_requesting' : 'no_vehicle';
                } else {
                    try {
                        const stSoc = await this._getStateCached(`evcs.${Math.round(evcsIndex)}.vehicleSoc`);
                        const socVal = stSoc ? Number(stSoc.val) : NaN;

                        const socIsValid = Number.isFinite(socVal) && socVal >= 0 && socVal <= 100;

                        // Avoid using very old SoC values after long unplugged periods.
                        // On plug-in we wait for a fresh SoC update (if the state timestamp is older than the plug time).
                        const socTs = (stSoc && typeof stSoc.ts === 'number' && Number.isFinite(stSoc.ts)) ? Math.round(stSoc.ts) : 0;
                        const socAgeMs = (socTs > 0 && now >= socTs) ? (now - socTs) : 0;

                        const SOC_STALE_MS = 48 * 3600 * 1000; // 48h
                        const SOC_RECENT_GRACE_MS = 10 * 60 * 1000; // 10 min
                        const SOC_AFTER_PLUG_TOL_MS = 2 * 60 * 1000; // 2 min tolerance
                        const SOC_WAIT_FALLBACK_MS = Math.round(goalSocWaitFallbackSec * 1000); // after plug-in: fall back to no-SoC planning

                        const waitedSincePlugMs = (vehiclePlugged === true && vehiclePluggedSinceMs > 0 && now >= vehiclePluggedSinceMs)
                            ? (now - vehiclePluggedSinceMs)
                            : 0;

                        let canUseSoc = false;

                        if (socIsValid) {
                            if (socAgeMs > SOC_STALE_MS) {
                                // SoC too old -> wait for an update after plug-in; then fall back.
                                if (waitedSincePlugMs > 0 && waitedSincePlugMs >= SOC_WAIT_FALLBACK_MS) {
                                    canUseSoc = false;
                                } else {
                                    goalStatus = 'soc_stale';
                                }
                            } else if (vehiclePlugged === true && vehiclePluggedSinceMs > 0 && socTs > 0
                                && socTs < (vehiclePluggedSinceMs - SOC_AFTER_PLUG_TOL_MS)
                                && socAgeMs > SOC_RECENT_GRACE_MS) {
                                // SoC timestamp predates plug-in -> wait for refresh; then fall back.
                                if (waitedSincePlugMs > 0 && waitedSincePlugMs >= SOC_WAIT_FALLBACK_MS) {
                                    canUseSoc = false;
                                } else {
                                    goalStatus = 'waiting_soc';
                                }
                            } else {
                                canUseSoc = true;
                            }
                        }

                        // If we are waiting for a SoC refresh, do not compute a goal plan yet.
                        if (goalStatus === 'soc_stale' || goalStatus === 'waiting_soc') {
                            // keep goalActive=false
                        } else {
                            if (canUseSoc) {
                                goalSocAvailable = true;
                                goalVehicleSocPct = clamp(socVal, 0, 100);
                                goalDeltaSocPct = Math.max(0, goalTargetSocPct - goalVehicleSocPct);
                            } else {
                                // No SoC available -> still support Zeit-Ziel Laden by planning worst-case from 0% SoC.
                                goalSocAvailable = false;
                                goalVehicleSocPct = null;
                                goalDeltaSocPct = clamp(goalTargetSocPct, 0, 100);
                            }

                            if (goalDeltaSocPct <= 0.01) {
                                goalStatus = 'reached';
                            } else {
                                // Deadline optional: if no timestamp is set, keep the goal configured but do not influence allocation
                                if (!Number.isFinite(goalFinishTs) || goalFinishTs <= 0) {
                                    goalStatus = 'no_deadline';
                                } else {
                                    const remMs = goalFinishTs - now;
                                    goalOverdue = remMs < 0;
                                    const remMsClamped = Math.max(0, remMs);
                                    goalRemainingMin = Math.max(0, Math.round(remMsClamped / 60000));

                                    // Battery capacity: user value wins; otherwise default by charger type.
                                    const defaultBatteryKwh = (chargerType === 'DC') ? 200 : 60;
                                    const batteryKwh = (goalBatteryKwhUser && goalBatteryKwhUser > 0) ? goalBatteryKwhUser : defaultBatteryKwh;

                                    // Required average power to reach target SoC by deadline
                                    const remH = Math.max(0.05, remMsClamped / 3600000); // >= 3 min
                                    const requiredWh = (batteryKwh * 1000) * (goalDeltaSocPct / 100);
                                    goalRequiredWh = requiredWh;
                                    const reqW = requiredWh / remH;
                                    goalRequiredW = clamp(reqW, 0, maxPW);

                                    // Desired command (cap): average required power, but never below technical minimum if we still need energy.
                                    goalDesiredW = (goalRequiredW > 0) ? Math.min(maxPW, Math.max(goalRequiredW, minPW)) : 0;

                                    // Urgency score for sorting (0..1+), based on desired power relative to max.
                                    goalUrgency = (maxPW > 0) ? (goalDesiredW / maxPW) : 0;

                                    goalActive = true;
                                    goalStatus = goalOverdue ? 'overdue' : 'active';
                                }
                            }
                        }
                    } catch {
                        // If SoC is not readable at all, fall back to no-SoC planning.
                        goalSocAvailable = false;
                        goalVehicleSocPct = null;
                        goalDeltaSocPct = clamp(goalTargetSocPct, 0, 100);

                        if (goalDeltaSocPct <= 0.01) {
                            goalStatus = 'reached';
                        } else if (!Number.isFinite(goalFinishTs) || goalFinishTs <= 0) {
                            goalStatus = 'no_deadline';
                        } else {
                            const remMs = goalFinishTs - now;
                            goalOverdue = remMs < 0;
                            const remMsClamped = Math.max(0, remMs);
                            goalRemainingMin = Math.max(0, Math.round(remMsClamped / 60000));

                            const defaultBatteryKwh = (chargerType === 'DC') ? 200 : 60;
                            const batteryKwh = (goalBatteryKwhUser && goalBatteryKwhUser > 0) ? goalBatteryKwhUser : defaultBatteryKwh;

                            const remH = Math.max(0.05, remMsClamped / 3600000); // >= 3 min
                            const requiredWh = (batteryKwh * 1000) * (goalDeltaSocPct / 100);
                            goalRequiredWh = requiredWh;
                            const reqW = requiredWh / remH;
                            goalRequiredW = clamp(reqW, 0, maxPW);

                            goalDesiredW = (goalRequiredW > 0) ? Math.min(maxPW, Math.max(goalRequiredW, minPW)) : 0;
                            goalUrgency = (maxPW > 0) ? (goalDesiredW / maxPW) : 0;

                            goalActive = true;
                            goalStatus = goalOverdue ? 'overdue' : 'active';
                        }
                    }
                }
            }

            // Publish computed goal states (shortfall will be updated after command calculation)
            try {
                await this._queueState(`${ch}.goalSocAvailable`, !!goalSocAvailable, true);
                await this._queueState(`${ch}.goalActive`, !!goalActive, true);
                await this._queueState(`${ch}.goalRemainingMin`, goalRemainingMin || 0, true);
                await this._queueState(`${ch}.goalRequiredPowerW`, Math.round(goalRequiredW || 0), true);
                await this._queueState(`${ch}.goalRequiredEnergyWh`, Math.round(goalRequiredWh || 0), true);
                await this._queueState(`${ch}.goalDesiredPowerW`, Math.round(goalDesiredW || 0), true);
                await this._queueState(`${ch}.goalShortfallW`, Math.round(goalShortfallW || 0), true);
                await this._queueState(`${ch}.goalStatus`, String(goalStatus || 'inactive'), true);
            } catch {
                // ignore
            }

            wbList.push({
                key,
                safe,
                orderIndex: wbIndex,
                ch,
                name: String(wb.name || key),
                cfgEnabled,
                userStationEnabled,
                stationEnabled,
                rfidAuthorized,
                rfidEnforced,
                rfidLockActive,
                rfidReason,
                availabilityRequest,
                availabilityOwner: availabilityRequest.owner,
                availabilityRequested: availabilityRequest.requested,
                availabilityRequestReason: availabilityRequest.reason,
                userEnabled,
                enabled,
                online,
                controlAvailable,
                onlineSource,
                onlineId,
                onlineIdWasDataFresh,
                onlineSourceMigrated,
                ocppDatapointContract: telemetryProfile === 'ocpp-1.6-event-driven' ? String(ocppContext.contractVersion || '') : '',
                ocppDatapointMappingMigrated,
                ocppDatapointMappingMigrations: Array.isArray(ocppDatapointMigrations) ? ocppDatapointMigrations : [],
                setpointRefreshMs,
                ocppLastCommand,
                ocppLastCommandAtMs,
                ocppLastCommandSuccess,
                ocppLastCommandError,
                ocppRequestedChargeLimitW,
                ocppAppliedChargeLimitW,
                ocppChargeLimitReason,
                ocppChargeLimitClamped,
                ocppCommandConfirmation,
                dataFreshId,
                dataFreshKnown,
                dataFresh,
                dataFreshAgeMs,
                staleAny,
                meterStale: effectiveMeterStale,
                meterRawStale: meterStale,
                meterAgeMs,
                actualPowerWId,
                telemetryProfile,
                telemetryAutoDetected,
                ocppConnectorRoot: telemetryProfile === 'ocpp-1.6-event-driven' ? String(ocppContext.connectorRoot || '') : '',
                ocppAdapterKind: telemetryProfile === 'ocpp-1.6-event-driven' ? String(ocppContext.adapterKind || 'legacy-ocpp') : '',
                chargingStateId,
                chargingStateRaw: chargingStateRaw === null || chargingStateRaw === undefined ? '' : String(chargingStateRaw),
                chargingStateAgeMs,
                transactionActiveId,
                transactionActiveKnown,
                transactionActive,
                transactionActiveAgeMs,
                ocppAdapterAliveId,
                ocppAdapterAliveKnown,
                ocppAdapterAlive,
                powerSource: String(effectivePower.powerSource || ''),
                powerAuthoritativeZero: effectivePower.authoritativeZero === true,
                rawActualPowerW: pWRawNum === null ? 0 : pWRawNum,
                statusStale,
                statusAgeMs,
                statusRaw: statusRawText,
                statusSourceId: statusId,
                statusSourceConnectorNo,
                statusConnectorMismatch,
                statusSharedAcrossConnectors,
                statusScope,
                statusIgnoredReason,
                statusFresh,
                statusEffective,
                statusClass,
                faultActive,
                faultReason,
                unavailableActive,
                unavailableReason,
                operationalBlocked,
                hasSetpoint,
                mappingIssues,
                charging: isCharging,
                chargingSinceMs: chargingSinceForState,
                actualPowerW: pWNum,
                pvStartupHoldUntilMs,
                pvMinRunUntilMs,
                pvStartCooldownUntilMs,
                userMode,
                userAutoSource,
                strategyOverlay,
                evcsIndex: (Number.isFinite(evcsIndex) && evcsIndex > 0) ? Math.round(evcsIndex) : 0,
                vehiclePlugged,
                vehicleDemandConfirmed,
                vehicleStartEligible,
                vehicleStartEligibilityReason,
                vehicleStartProbeSinceMs,
                vehicleStartCooldownUntilMs,
                vehicleStartCooldownActive: vehicleStartCooldownUntilMs > now,
                vehicleStartResponseTimeoutMs: vehicleStartResponseTimeoutForWallboxMs,
                vehicleStartProbeActive: vehicleStartProbeSinceMs > 0 && vehicleStartCooldownUntilMs <= now && !vehicleDemandConfirmed,
                vehicleDemandSource,
                vehicleDemandReason,
                vehicleStateNormalized,
                vehicleConnectedId,
                vehicleConnectedFresh,
                vehicleConnectedAgeMs,
                chargeDemandId,
                chargeDemandFresh,
                chargeDemandAgeMs,
                heartbeatId,
                connectorStatus: String(statusForPlug || ''),
                connectorStatusSource: String(statusForPlugSource || ''),
                goalEnabled,
                goalActive,
                goalStatus,
                goalTargetSocPct,
                goalFinishTs,
                goalBatteryKwhUser,
                goalVehicleSocPct,
                goalSocAvailable,
                goalDeltaSocPct,
                goalRemainingMin,
                goalRequiredW,
                goalRequiredWh,
                goalDesiredW,
                goalUrgency,
                goalOverdue,
                stationKey,
                stationName: stationNameByKey.get(stationKey) || '',
                connectorNo,
                stationMaxPowerW,
                allowBoost,
                boostTimeoutMinOverride,
                boostMaxPowerW,
                priority,
                chargerType,
                controlBasis,
                phases: effectiveRuntimePhaseCount,
                configuredPhaseCount: phases,
                zeroExportThreePhaseMinW: acThreePhaseLimits ? acThreePhaseLimits.minPowerW : 0,
                zeroExportThreePhaseMaxW: acThreePhaseLimits ? acThreePhaseLimits.maxPowerW : 0,
                phaseFeedbackFresh: !!phaseFeedbackId && (feedbackPhaseCount === 1 || feedbackPhaseCount === 3)
                    && Number.isFinite(this.dp.getAgeMs(`cm.wb.${safe}.phaseFb`))
                    && this.dp.getAgeMs(`cm.wb.${safe}.phaseFb`) <= wbMeterStaleTimeoutMs,
                currentPhaseCount,
                targetPhaseCount: currentPhaseCount,
                allocationPhaseCount: effectiveRuntimePhaseCount,
                phaseMode,
                phaseSwitchKey: phaseSwitchId ? `cm.wb.${safe}.phaseSet` : '',
                phaseSwitchValue1p,
                phaseSwitchValue3p,
                stopBeforePhaseSwitch,
                phaseSwitchUpThresholdW: wbPhaseSwitchUpThresholdW,
                phaseSwitchDownThresholdW: wbPhaseSwitchDownThresholdW,
                phaseSwitchUpStableMs: wbPhaseSwitchUpStableMs,
                phaseSwitchDownStableMs: wbPhaseSwitchDownStableMs,
                phaseSwitchCooldownMs: wbPhaseSwitchCooldownMs,
                phaseSwitchSettleMs: wbPhaseSwitchSettleMs,
                storageAssistCustomerAllowed,
                userStorageAssistEnabled,
                storageAssistRequested,
                storageProtectionRequested,
                storagePolicyActualLoadW: storagePolicyActualLoad.actualVehicleLoadW,
                storagePolicyActualLoadReason: storagePolicyActualLoad.reason,
                storagePolicyLoadUnknown: storagePolicyActualLoad.protectedLoadUnknown,
                effectiveStorageAssist: false,
                storageAssistBlockedReason: storageAssistCustomerAllowed ? (userStorageAssistEnabled ? 'pending' : 'user-disabled') : 'installer-locked',
                batteryContributionW: 0,
                phaseSwitchSafePowerW,
                highSinceMs: this._chargingPhaseHighSinceMs && this._chargingPhaseHighSinceMs.has(safe) ? this._chargingPhaseHighSinceMs.get(safe) : 0,
                lowSinceMs: this._chargingPhaseLowSinceMs && this._chargingPhaseLowSinceMs.has(safe) ? this._chargingPhaseLowSinceMs.get(safe) : 0,
                cooldownUntilMs: this._chargingPhaseCooldownUntilMs && this._chargingPhaseCooldownUntilMs.has(safe) ? this._chargingPhaseCooldownUntilMs.get(safe) : 0,
                settleUntilMs: this._chargingPhaseSettleUntilMs && this._chargingPhaseSettleUntilMs.has(safe) ? this._chargingPhaseSettleUntilMs.get(safe) : 0,
                voltageV: dcElectrical && controlBasis === 'currentA' ? dcElectrical.controlVoltageV : voltageV,
                gridPhaseCount: phases,
                dcCurrentReference: String(wb.dcCurrentReference || ''),
                dcVoltageKey,
                electricalLimitsValid,
                electricalLimitsError,
                minA,
                maxA,
                minPW,
                maxPW,
                para14aCapW,
                para14aCapped,
                userLimitSet,
                vFactor,
                // Diese Werte werden an den finalen TypeScript-Write-Plan weitergereicht.
                // Dadurch kann der Abschluss-Guard technische Stufen und Rampen prüfen,
                // ohne eine zweite, abweichende Ladepunktverteilung zu erzeugen.
                stepW: clamp(num(wb.stepW, stepW), 0, 1e12),
                stepA: clamp(num(wb.stepA, stepA), 0, 1e6),
                maxDeltaWPerTick: clamp(num(wb.maxDeltaWPerTick, maxDeltaWPerTick), 0, 1e12),
                maxDeltaAPerTick: clamp(num(wb.maxDeltaAPerTick, maxDeltaAPerTick), 0, 1e6),
                pvRampUpWPerTick: clamp(num(wb.pvRampUpWPerTick, pvRampUpWPerTick), 0, 1e12),
                pvRampUpAperTick: clamp(num(wb.pvRampUpAperTick, pvRampUpAperTick), 0, 1e6),
                setAKey: hasSetA ? `cm.wb.${safe}.setA` : null,
                setWKey: hasSetW ? `cm.wb.${safe}.setW` : null,
                enableKey: enableId ? `cm.wb.${safe}.en` : null,
                consumer: {
                    type: 'evcs',
                    key: safe,
                    name: String(wb.name || key),
                    controlBasis,
                    setAKey: hasSetA ? `cm.wb.${safe}.setA` : '',
                    setWKey: hasSetW ? `cm.wb.${safe}.setW` : '',
                    enableKey: enableId ? `cm.wb.${safe}.en` : '',
                },
});
        }

        await this._queueState('chargingManagement.wallboxCount', wbList.length, true);
        await this._queueState('chargingManagement.summary.totalPowerW', totalFreshActualPowerW, true);
        await this._queueState('chargingManagement.summary.totalReservedPowerW', 0, true);
        await this._queueState('chargingManagement.summary.totalCurrentA', totalCurrentA, true);
        await this._queueState('chargingManagement.summary.onlineWallboxes', onlineCount, true);

        // Determine budget
        let budgetW = Number.POSITIVE_INFINITY;
        let effectiveBudgetMode = budgetMode;
        /** @type {any|null} */
        let budgetDebug = null;

        /** Code-Teil: Arrow-Funktion `getFirstDpNumber` – liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik. */
        /** Code-Teil: getFirstDpNumber – Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen. */
        const getFirstDpNumber = (keys) => {
            if (!this.dp) return null;
            for (const k of keys) {
                const v = (typeof this.dp.getNumberFresh === 'function') ? this.dp.getNumberFresh(k, staleTimeoutMs, null) : this.dp.getNumber(k, null);
                if (typeof v === 'number' && Number.isFinite(v)) return v;
            }
            return null;
        };

        /**
         * MU6.8: state staleness helper (uses state.ts / state.lc).
         * @param {string} id
         * @param {number} maxAgeMs
         * @returns {Promise<boolean>}
         */
        /** Code-Teil: Arrow-Funktion `isStateStale` – enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden. */
        /** Code-Teil: isStateStale – Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen. */
        const isStateStale = async (id, maxAgeMs) => {
            try {
                const st = await this._getStateCached(id);
                const ts = st && (typeof st.ts === 'number' ? st.ts : (typeof st.lc === 'number' ? st.lc : 0));
                if (!ts) return true;
                return (Date.now() - ts) > maxAgeMs;
            } catch {
                return true;
            }
        };

        // Tariff-derived permissions (optional; provided by tarif-vis.js)
        // gridChargeAllowed: whether EVCS may use grid import (Tarif-Sperre)
        // dischargeAllowed: whether the storage may discharge for comfort use-cases (EVCS assist, self-consumption)
        let gridChargeAllowedRaw = true;
        if (this.dp && typeof this.dp.getEntry === 'function' && this.dp.getEntry('cm.gridChargeAllowed')) {
            // See storage-control.js: do NOT treat this as "stale" on a short timeout.
            // These flags can remain unchanged for hours (cheap window), but are still valid.
            gridChargeAllowedRaw = this.dp.getBoolean('cm.gridChargeAllowed', true);
        }

        let dischargeAllowedRaw = true;
        if (this.dp && typeof this.dp.getEntry === 'function' && this.dp.getEntry('cm.dischargeAllowed')) {
            dischargeAllowedRaw = this.dp.getBoolean('cm.dischargeAllowed', true);
        }

        // Netzentgelt: HT sperrt; NT überstimmt keinen aktiven stale/teuren/
        // unbekannten Tarif. Bei deaktiviertem Dynamiktarif darf NT allein freigeben.
        // Der Zeit-Ziel-Planer kann die Wirtschaftssperre erst am Latest-Start lösen.
        let tariffDynamicStale = false;
        let tariffCurrentState = 'unknown';
        let tariffCurrentPriceEurKwh = null;
        let tariffCurrentPriceFresh = false;
        try {
            const stNfEn = await this._getStateCached('tarif.netFeeEnabled');
            const stNfMode = await this._getStateCached('tarif.netFeeMode');
            const stTariffActive = await this._getStateCached('tarif.aktiv');
            const stTariffStale = await this._getStateCached('tarif.dynamicTariffStale');
            const stTariffState = await this._getStateCached('tarif.state');
            const stTariffPrice = await this._getStateCached('tarif.preisAktuellEurProKwh');
            const stTariffFresh = await this._getStateCached('tarif.currentPriceFresh');
            const nfEnabled = stNfEn ? !!stNfEn.val : false;
            const nfMode = stNfMode ? String(stNfMode.val || '') : '';
            const tariffActive = stTariffActive ? !!stTariffActive.val : false;
            tariffDynamicStale = stTariffStale ? !!stTariffStale.val : false;
            tariffCurrentState = stTariffState ? String(stTariffState.val || 'unknown').trim().toLowerCase().replace(/ü/g, 'ue') : 'unknown';
            const currentPrice = stTariffPrice ? Number(stTariffPrice.val) : NaN;
            tariffCurrentPriceEurKwh = Number.isFinite(currentPrice) ? currentPrice : null;
            tariffCurrentPriceFresh = stTariffFresh ? !!stTariffFresh.val : (tariffCurrentPriceEurKwh !== null && !tariffDynamicStale);
            if (nfEnabled && nfMode === 'HT') gridChargeAllowedRaw = false;
            else if (nfEnabled && nfMode === 'NT') {
                if (!tariffActive) gridChargeAllowedRaw = true;
                else if (tariffDynamicStale || tariffCurrentState === 'teuer' || !['guenstig', 'neutral'].includes(tariffCurrentState)) gridChargeAllowedRaw = false;
            }
        } catch { /* cm.gridChargeAllowed remains authoritative */ }

        // Gate E – Negativpreis / Netzbezug bevorzugt:
        // Wenn der dynamische effektive Tarif negativ ist, darf das Lade-/Lastmanagement
        // Netzladen freigeben und PV-only nur für Auto/Global-Modi aufheben. Harte Limits
        // (Netzanschluss, Phasen, §14a, Peak-Shaving) bleiben weiter aktiv.
        let tariffNegativeActive = false;
        let tariffGridImportPreferred = false;
        try {
            const stNeg = await this._getStateCached('tarif.negativpreisAktiv');
            const stPref = await this._getStateCached('tarif.netzbezugBevorzugt');
            tariffNegativeActive = stNeg ? !!stNeg.val : false;
            tariffGridImportPreferred = stPref ? !!stPref.val : tariffNegativeActive;
        } catch {
            tariffNegativeActive = false;
            tariffGridImportPreferred = false;
        }

        if (tariffGridImportPreferred && !tariffDynamicStale) {
            gridChargeAllowedRaw = true;
            dischargeAllowedRaw = false;
        }

        // Debounce gegen Flattern:
        // - Sperren (false) wirken sofort (Safety-first)
        // - Freigaben (true) erst nach stabiler True-Phase (hold)
        const permHoldMs = Math.round(clamp(num(cfg.tariffPermissionHoldSec, 10), 0, 3600) * 1000);
        const permNowMs = Date.now();

        let gridChargeAllowed = gridChargeAllowedRaw;
        if (permHoldMs > 0) {
            if (!gridChargeAllowedRaw) {
                this._tariffGridChargeAllowed = false;
                this._tariffGridChargeAllowedTrueSinceMs = 0;
            } else {
                if (this._tariffGridChargeAllowed) {
                    // already enabled
                } else {
                    if (!this._tariffGridChargeAllowedTrueSinceMs) this._tariffGridChargeAllowedTrueSinceMs = permNowMs;
                    if ((permNowMs - this._tariffGridChargeAllowedTrueSinceMs) >= permHoldMs) {
                        this._tariffGridChargeAllowed = true;
                    }
                }
            }
            gridChargeAllowed = !!this._tariffGridChargeAllowed;
        }

        let dischargeAllowed = dischargeAllowedRaw;
        if (permHoldMs > 0) {
            if (!dischargeAllowedRaw) {
                this._tariffDischargeAllowed = false;
                this._tariffDischargeAllowedTrueSinceMs = 0;
            } else {
                if (this._tariffDischargeAllowed) {
                    // already enabled
                } else {
                    if (!this._tariffDischargeAllowedTrueSinceMs) this._tariffDischargeAllowedTrueSinceMs = permNowMs;
                    if ((permNowMs - this._tariffDischargeAllowedTrueSinceMs) >= permHoldMs) {
                        this._tariffDischargeAllowed = true;
                    }
                }
            }
            dischargeAllowed = !!this._tariffDischargeAllowed;
        }

        try {
            await this._queueState('chargingManagement.control.gridChargeAllowed', !!gridChargeAllowed, true);
            await this._queueState('chargingManagement.control.dischargeAllowed', !!dischargeAllowed, true);
        } catch {
            // ignore
        }

        // Global default PV-only behaviour (same as before)
        const pvSurplusOnlyCfgBase = cfg.pvSurplusOnly === true || mode === 'pvSurplus';
        // Bei Negativpreis wird Netzbezug wirtschaftlich bevorzugt. Deshalb darf die
        // globale PV-only-Vorgabe im Automatikpfad temporär aufgehoben werden. Explizite
        // Wallbox-Modi wie "PV" bleiben User-Wunsch und werden weiter respektiert.
        const pvSurplusOnlyCfg = tariffGridImportPreferred ? false : pvSurplusOnlyCfgBase;
        const forcePvSurplusOnly = !gridChargeAllowed;

        // Determine effective per-wallbox mode (runtime override via VIS)
        // effectiveMode values:
        // - normal: budget-based, grid allowed
        // - pv: PV surplus only (no grid import intended)
        // - minpv: always try to keep minPower from grid, but any extra only from PV budget
        // - boost: like normal, but preferred in allocation order
        let anyGridAllowedActive = false;
        let anyPvLimitedActive = false;
        let anyPurePvActive = false;
        let anyMinPvActive = false;
        let anyBoostActive = false;

        // -----------------------------------------------------------------
        // Tarif‑Forecast für Zeit‑Ziel Laden (optional)
        // -----------------------------------------------------------------
        // Wenn der Tarif gerade Netzladung sperrt (forcePvSurplusOnly=true), wollen wir im
        // "forecast"‑Modus NICHT pauschal übersteuern, sondern prüfen:
        // Reichen die erwarteten Tarif‑Freigaben bis zur Deadline aus?
        // Falls nein → Notfall: Override (damit das Ziel trotzdem erreicht wird).

        /** @type {null|{active:boolean,fresh:boolean,modeInt:number|null,prioInt:number|null,allowEvcsCheap:boolean,ref:number|null,exp:number|null,cheap:number|null,cheapManual:number|null,segments:Array<{startMs:number,endMs:number,priceEurKwh:number,state:string,allowGrid:boolean}>}} */
        let tariffForecast = null;
        const goalForecastReserveMs = Math.round(goalForecastReserveMin * 60 * 1000);

        const anyGoal = wbList.some((w) => w && w.controlAvailable && w.goalActive && Number.isFinite(Number(w.goalFinishTs)) && Number(w.goalFinishTs) > now);
        if (anyGoal) {
                const maxGoalFinishTs = wbList.reduce((m, w) => {
                    const ts = (w && w.goalActive) ? Number(w.goalFinishTs) : NaN;
                    return Number.isFinite(ts) ? Math.max(m, ts) : m;
                }, 0);

                const horizonEndMs = (Number.isFinite(maxGoalFinishTs) && maxGoalFinishTs > now) ? maxGoalFinishTs : (now + 48 * 3600 * 1000);

                try {
                    // Tariff meta (produced by tarif-vis.js)
                    const stActive = await this._getStateCached('tarif.aktiv');
                    const active = stActive ? !!stActive.val : false;

                    const stMode = await this._getStateCached('tarif.modus');
                    const modeInt = stMode ? Number(stMode.val) : NaN;

                    const stPrio = await this._getStateCached('tarif.prioritaet');
                    const prioInt = stPrio ? Number(stPrio.val) : NaN;
                    const allowEvcsCheap = (prioInt === 2 || prioInt === 3);

                    const stRef = await this._getStateCached('tarif.preisRefEurProKwh');
                    const priceRef = stRef ? Number(stRef.val) : NaN;
                    const stGrenze = await this._getStateCached('tarif.preisGrenzeEurProKwh');
                    const priceExpensive = stGrenze ? Number(stGrenze.val) : NaN;
                    const stCheap = await this._getStateCached('tarif.preisSchwelleGuensigEurProKwh');
                    const priceCheap = stCheap ? Number(stCheap.val) : NaN;

                    const ref = Number.isFinite(priceRef) ? priceRef : null;
                    const exp = Number.isFinite(priceExpensive) ? priceExpensive : null;
                    const cheap = Number.isFinite(priceCheap) ? priceCheap : null;

                    const delta = (ref !== null && exp !== null) ? Math.max(0, exp - ref) : null;
                    const cheapManual = (ref !== null && delta !== null) ? (ref - delta) : null;

                    // Price curves from provider mapping (via dp registry)
                    let rawToday = null;
                    let rawTomorrow = null;
                    if (this.dp && typeof this.dp.getEntry === 'function') {
                        if (this.dp.getEntry('tarif.pricesTodayJson')) rawToday = this.dp.getRaw('tarif.pricesTodayJson');
                        if (this.dp.getEntry('tarif.pricesTomorrowJson')) rawTomorrow = this.dp.getRaw('tarif.pricesTomorrowJson');
                    }

                    const curve = [
                        ...parsePriceCurve(rawToday),
                        ...parsePriceCurve(rawTomorrow),
                    ].filter((it) => it && Number.isFinite(it.startMs) && Number.isFinite(it.endMs) && Number.isFinite(it.priceEurKwh));
                    curve.sort((a, b) => a.startMs - b.startMs);

                    const segs = [];
                    const eps = 1e-9;
                    for (const it of curve) {
                        const startMs = it.startMs;
                        const endMs = it.endMs;
                        if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= now) continue;
                        if (startMs >= horizonEndMs) break;

                        const p = it.priceEurKwh;

                        // Approximate tariff state for planning (no hysteresis; conservative enough).
                        let state = 'neutral';
                        if (active && exp !== null && p >= (exp - eps)) {
                            state = 'teuer';
                        } else if (active) {
                            if (Number(modeInt) === 2 && cheap !== null && p <= (cheap + eps)) state = 'guenstig';
                            else if (Number(modeInt) !== 2 && cheapManual !== null && p <= (cheapManual + eps)) state = 'guenstig';
                        }

                        let allowGrid = true;
                        if (active) {
                            if (p < -1e-9) allowGrid = true;
                            else if (state === 'teuer') allowGrid = false;
                            else if (state === 'guenstig') allowGrid = !!allowEvcsCheap;
                            else allowGrid = true;
                        }

                        segs.push({ startMs, endMs, priceEurKwh: p, state, allowGrid });
                    }

                    if (active && tariffCurrentPriceFresh && tariffCurrentPriceEurKwh !== null && !segs.some((segment) => segment.startMs <= now && segment.endMs > now)) {
                        segs.unshift({ startMs: now, endMs: Math.min(horizonEndMs, now + 15 * 60000), priceEurKwh: tariffCurrentPriceEurKwh, state: tariffCurrentState, allowGrid: gridChargeAllowedRaw });
                    }
                    tariffForecast = {
                        active,
                        fresh: !tariffDynamicStale,
                        modeInt: Number.isFinite(modeInt) ? Number(modeInt) : null,
                        prioInt: Number.isFinite(prioInt) ? Number(prioInt) : null,
                        allowEvcsCheap: !!allowEvcsCheap,
                        ref,
                        exp,
                        cheap,
                        cheapManual,
                        segments: segs,
                    };
                } catch (_e) {
                    tariffForecast = null;
                }
        }

        /**
         * Compute allowed & covered duration for the given time range based on the forecast segments.
         * @param {Array<{startMs:number,endMs:number,allowGrid:boolean}>} segments
         * @param {number} startMs
         * @param {number} endMs
         * @returns {{allowedMs:number, coveredMs:number}}
         */
        /** Code-Teil: Arrow-Funktion `computeAllowedAndCoverageMs` – berechnet abgeleitete Werte; Änderungen können Energiefluss/History/Regelungen beeinflussen. */
        /** Code-Teil: computeAllowedAndCoverageMs – Berechnet abgeleitete Werte. */
        const computeAllowedAndCoverageMs = (segments, startMs, endMs) => {
            let allowedMs = 0;
            let coveredMs = 0;
            if (!Array.isArray(segments) || segments.length === 0) return { allowedMs, coveredMs };
            for (const seg of segments) {
                if (!seg) continue;
                const s = Math.max(startMs, seg.startMs);
                const e = Math.min(endMs, seg.endMs);
                if (e <= s) continue;
                coveredMs += (e - s);
                if (seg.allowGrid) allowedMs += (e - s);
            }
            return { allowedMs, coveredMs };
        };

        /**
         * Decide whether we must override a tariff grid-charging lock in order to still reach the
         * configured goal deadline.
         *
         * @param {any} w wallbox entry
         * @returns {{override:boolean, reason:string}}
         */
        /** Code-Teil: Arrow-Funktion `decideGoalTariffOverride` – enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden. */
        /** Code-Teil: decideGoalTariffOverride – Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen. */
        const decideGoalTariffOverride = (w) => {
            try {
                if (!w || !w.goalActive) return { override: false, reason: '' };

                if (w.goalOverdue) return { override: true, reason: 'overdue' };

                const finishTs = Number(w.goalFinishTs);
                if (!Number.isFinite(finishTs) || finishTs <= now) return { override: true, reason: 'overdue' };

                const deltaSoc = Number(w.goalDeltaSocPct);
                if (!Number.isFinite(deltaSoc) || deltaSoc <= 0) return { override: false, reason: 'no_need' };

                const maxP = runtimeChargingMaximumW(w);
                if (!Number.isFinite(maxP) || maxP <= 0) return { override: true, reason: 'no_power' };

                const battUser = Number(w.goalBatteryKwhUser);
                const battDefault = (String(w.chargerType || '').toUpperCase() === 'DC') ? 200 : 60;
                const battKwh = (Number.isFinite(battUser) && battUser > 0) ? battUser : battDefault;

                // Energy needed (Wh) with safety factor
                const needWhRaw = battKwh * 1000 * (deltaSoc / 100);
                const needWh = needWhRaw * goalForecastSafetyFactor;

                // Latest possible start time if we charge continuously with max power.
                const requiredMs = (needWh > 0) ? Math.round((needWh * 3600000) / maxP) : 0;
                const latestStart = finishTs - requiredMs;
                if (now >= (latestStart - goalForecastReserveMs)) {
                    return { override: true, reason: 'latest_start' };
                }

                // If we have a tariff forecast, estimate how much "allowed" time remains until the deadline.
                if (tariffForecast && Array.isArray(tariffForecast.segments) && tariffForecast.segments.length > 0) {
                    const { allowedMs, coveredMs } = computeAllowedAndCoverageMs(tariffForecast.segments, now, finishTs);
                    const remMs = finishTs - now;
                    if (remMs > 0 && coveredMs >= (remMs * goalForecastMinCoverage)) {
                        const deliverableWh = maxP * (allowedMs / 3600000);
                        if (deliverableWh + 1e-6 >= needWh) {
                            return { override: false, reason: 'forecast_ok' };
                        }

                        // Ohne Fahrzeug-SoC ist die Energiemenge nur eine konservative Schätzung
                        // (typisch: Ziel-% auf Basis der hinterlegten Akku-Kapazität). In diesem Fall
                        // soll der Tarif nachts weiter den Vorrang behalten und wir warten bis zum
                        // echten Latest-Start, statt schon tagsüber teuer zu laden.
                        if (w.goalSocAvailable !== true) {
                            return { override: false, reason: 'forecast_wait_no_soc' };
                        }

                        return { override: true, reason: 'forecast_insufficient' };
                    }
                    // Forecast exists but doesn't cover the full horizon reliably → fall back to latest-start.
                    return { override: false, reason: 'forecast_unreliable' };
                }

                // No forecast: fall back to legacy urgency thresholds (extra safety) and otherwise wait
                // until latest-start is reached.
                const remMin = (typeof w.goalRemainingMin === 'number' && Number.isFinite(w.goalRemainingMin)) ? w.goalRemainingMin : null;
                const urg = (typeof w.goalUrgency === 'number' && Number.isFinite(w.goalUrgency)) ? w.goalUrgency : null;
                const legacyOverride = (remMin !== null && remMin <= goalTariffOverrideMinRemainingMin)
                    || (urg !== null && urg >= goalTariffOverrideUrgency);
                if (legacyOverride) return { override: true, reason: 'legacy_urgency' };

                return { override: false, reason: 'wait' };
            } catch {
                return { override: false, reason: 'err' };
            }
        };

        const zeroExportChargingActive = readZeroExportMode(this.adapter).active === true;
        // Der nächste Core-Zyklus liest diese ORIGINALEN Leistungsmesswerte.
        // Für PV-Rekonstruktion braucht er die volle Aufnahme, auch im Boost:
        // Der Netzanteil wird bereits einmal über den signierten NVP abgezogen.
        this.adapter._zeroExportEvcsMeters = { ts: now,
            keys: wbList.filter(w => w.controlAvailable === true && w.actualPowerWId).map(w => `cm.wb.${w.safe}.pW`) };
        for (const w of wbList) {
            let override = normalizeWallboxModeOverride(w.userMode);
            // Vor dem Latest-Start-Entscheider bereitstellen; null außerhalb
            // aktiver Nulleinspeisung erhält das bisherige Regelverhalten.
            w.zeroExportGridMaxW = resolveZeroExportChargingPolicy({
                active: zeroExportChargingActive, userMode: override, boostMaxPowerW: w.boostMaxPowerW,
            }).gridMaxW;
            const boostNotAllowed = (override === 'boost' && w.allowBoost === false);
            if (boostNotAllowed) {
                override = 'auto';
                // If boost is disabled for this chargepoint, reset runtime mode to avoid confusing UI
                try {
                    await this._queueState(`${w.ch}.userMode`, 'auto', true);
                } catch {
                    // ignore
                }
            }

            // Effective boost timeout (minutes): per-wallbox override > global by charger type
            const typeDefaultMin = (String(w.chargerType || '').toUpperCase() === 'DC') ? boostTimeoutMinDc : boostTimeoutMinAc;
            const effBoostTimeoutMin = (Number.isFinite(Number(w.boostTimeoutMinOverride)) && Number(w.boostTimeoutMinOverride) > 0)
                ? Number(w.boostTimeoutMinOverride)
                : typeDefaultMin;

            // Ziel‑Laden Priorität / Tarif‑Bonus:
            // - Globale PV‑Only Einstellungen (pvSurplusOnlyCfg/Mode PV) bleiben dominant.
            // - Wenn der Tarif Netzladen sperrt (forcePvSurplusOnly), hängt das Verhalten vom
            //   goalTariffOverrideMode ab:
            //   - always   : Ziel übersteuert sofort (Legacy)
            //   - forecast : Tarif wirkt; Override nur wenn nötig (Forecast/Latest‑Start)
            //   - never    : nie übersteuern (kann Deadline verfehlen)
            let forcePvForW = forcePvSurplusOnly;
            let goalTariffOverrideActive = false;
            let goalTariffOverrideReason = '';
            if (forcePvForW && !pvSurplusOnlyCfg && w.controlAvailable && w.goalActive) {
                if (goalTariffOverrideMode === 'always') {
                    forcePvForW = false;
                    goalTariffOverrideActive = true;
                    goalTariffOverrideReason = 'always';
                } else if (goalTariffOverrideMode === 'never') {
                    goalTariffOverrideReason = 'never';
                } else {
                    const dec = decideGoalTariffOverride(w);
                    if (dec && dec.override) {
                        forcePvForW = false;
                        goalTariffOverrideActive = true;
                    }
                    goalTariffOverrideReason = (dec && dec.reason) ? String(dec.reason) : (goalTariffOverrideActive ? 'override' : 'wait');
                }
            }

            // Boost runtime timer: starts when the chargepoint is actually charging in boost mode
            let boostSince = this._boostSinceMs.get(w.safe) || 0;
            let boostUntil = 0;
            let boostRemainingMin = 0;
            let boostTimedOut = false;

            if (override === 'boost') {
                const timeoutMs = (effBoostTimeoutMin > 0) ? Math.round(effBoostTimeoutMin * 60 * 1000) : 0;

                if ((!boostSince || !Number.isFinite(boostSince)) && w.charging) {
                    boostSince = now;
                }

                if (timeoutMs > 0 && boostSince && Number.isFinite(boostSince)) {
                    boostUntil = boostSince + timeoutMs;
                    boostRemainingMin = Math.max(0, Math.ceil((boostUntil - now) / 60000));

                    if (now >= boostUntil) {
                        boostTimedOut = true;
                        override = 'auto';
                        this._boostSinceMs.delete(w.safe);
                        boostSince = 0;
                        boostUntil = 0;
                        boostRemainingMin = 0;

                        // Switch off boost in runtime state (so VIS toggles back)
                        try {
                            await this._queueState(`${w.ch}.userMode`, 'auto', true);
                        } catch {
                            // ignore
                        }
                    } else {
                        this._boostSinceMs.set(w.safe, boostSince);
                    }
                } else {
                    // No timeout configured (0) or not started yet
                    if (boostSince && Number.isFinite(boostSince)) this._boostSinceMs.set(w.safe, boostSince);
                }
            } else {
                // Not in boost: clear timer state
                this._boostSinceMs.delete(w.safe);
                boostSince = 0;
            }

            // Determine effective per-wallbox mode (after possible timeout/not-allowed handling)
            let eff = 'normal';

            if (override === 'boost') {
                // "Boost" is an explicit user command: always behave as grid-allowed fast charging.
                // (Hard limits like §14a / Grid caps / Phase caps still apply later in the pipeline.)
                eff = 'boost';
            } else if (override === 'pv') {
                // Gate E: Bei negativem dynamischem Tarif wird Netzbezug bewusst bevorzugt.
                // Dann heben wir auch den PV-Modus temporär auf, damit die Ladepunkte
                // wirtschaftlich Netzstrom abnehmen können. Harte Netz-/Phasen-/§14a-
                // Grenzen bleiben weiter aktiv.
                eff = tariffGridImportPreferred ? 'normal' : 'pv';
            } else if (override === 'minpv') {
                // "Min+PV" hält normalerweise die Mindestladung und begrenzt Mehrleistung auf PV.
                // Bei Negativpreis wird daraus temporär ein normaler netzfreigegebener Modus.
                eff = tariffGridImportPreferred ? 'normal' : 'minpv';
            } else {
                // auto: follow global defaults. Nur wenn der Ladepunkt ausdrücklich
                // "Auto → EOS Betriebsstrategie" gewählt hat und eine frische,
                // freigegebene Strategieanforderung vorliegt, darf deren Energiequelle
                // den Auto-Untermodus bestimmen. Alle harten Limits bleiben nachgelagert.
                eff = (forcePvForW || pvSurplusOnlyCfg) ? 'pv' : 'normal';
                const strategy = w.strategyOverlay && typeof w.strategyOverlay === 'object' ? w.strategyOverlay : null;
                if (strategy && strategy.active === true) {
                    const policy = String(strategy.energySourcePolicy || 'pv-preferred').trim().toLowerCase();
                    // Die Strategie darf die vom Nutzer gewählte Energiequelle nicht
                    // heimlich erweitern. "PV-only" bleibt deshalb auch bei Negativpreis
                    // PV-only. "cheap-grid" gibt Netzbezug nur in einem tatsächlich
                    // günstigen/negativen Tarifzeitfenster frei.
                    if (policy === 'pv-only') eff = 'pv';
                    else if (policy === 'grid-allowed') eff = 'normal';
                    else if (policy === 'cheap-grid') eff = tariffGridImportPreferred ? 'normal' : 'pv';
                }
            }

            const zeroPolicy = resolveZeroExportChargingPolicy({
                active: zeroExportChargingActive, userMode: override, effectiveMode: eff,
                boostMaxPowerW: w.boostMaxPowerW, goalActive: w.goalActive,
                strategy: w.strategyOverlay,
                cheapWindow: gridChargeAllowed && !tariffDynamicStale && tariffCurrentPriceFresh
                    && (tariffCurrentState === 'guenstig' || tariffGridImportPreferred),
            });
            eff = zeroPolicy.effectiveMode;
            w.zeroExportGridMaxW = zeroPolicy.gridMaxW;
            w.effectiveMode = eff;
            w._boostTimedOut = boostTimedOut;
            w._boostNotAllowed = boostNotAllowed;
            w._boostTimeoutMinEffective = effBoostTimeoutMin;

            if (w.controlAvailable) {
                if (eff === 'pv') { anyPvLimitedActive = true; anyPurePvActive = true; }
                if (eff === 'minpv') { anyPvLimitedActive = true; anyMinPvActive = true; }
                if (eff === 'boost' || eff === 'minpv' || eff === 'normal') anyGridAllowedActive = true;
                if (eff === 'boost') anyBoostActive = true;
            }

            // Expose effective mode + boost runtime details for VIS/debugging
            try {
                const strategy = w.strategyOverlay && typeof w.strategyOverlay === 'object' ? w.strategyOverlay : {};
                const strategyRequest = strategy.request && typeof strategy.request === 'object' ? strategy.request : {};
                const strategyFallbackActive = strategy.fallbackPause === true || (strategy.eligible === true && strategy.active !== true && strategy.action === 'standard');
                const strategyStatus = strategy.active === true
                    ? 'active'
                    : (strategy.fallbackPause === true ? 'fallback-pause' : (strategy.eligible === true ? 'fallback-standard' : 'not-eligible'));
                await this._queueState(`${w.ch}.effectiveMode`, eff, true);
                await this._queueState(`${w.ch}.strategyEligible`, strategy.eligible === true, true);
                await this._queueState(`${w.ch}.strategyActive`, strategy.active === true, true);
                await this._queueState(`${w.ch}.strategyFallbackActive`, strategyFallbackActive, true);
                await this._queueState(`${w.ch}.strategyAction`, String(strategy.action || 'standard'), true);
                await this._queueState(`${w.ch}.strategyRequestedPowerW`, Math.max(0, Number(strategy.targetPowerW) || 0), true);
                await this._queueState(`${w.ch}.strategyTargetSocPct`, Number.isFinite(Number(strategy.targetSocPct)) ? Number(strategy.targetSocPct) : 0, true);
                await this._queueState(`${w.ch}.strategyStatus`, strategyStatus, true);
                await this._queueState(`${w.ch}.strategyReason`, String(strategy.reason || ''), true);
                await this._queueState(`${w.ch}.strategyExpiresAt`, Math.max(0, Number(strategyRequest.expiresAt) || 0), true);
                await this._queueState(`${w.ch}.goalTariffOverride`, !!goalTariffOverrideActive, true);
                await this._queueState(`${w.ch}.goalTariffOverrideReason`, String(goalTariffOverrideReason || ''), true);
                await this._queueState(`${w.ch}.boostTimeoutMin`, Number.isFinite(effBoostTimeoutMin) ? effBoostTimeoutMin : 0, true);
                await this._queueState(`${w.ch}.boostMaxPowerW`, zeroExportChargingActive && w.boostMaxPowerW !== null ? Math.min(w.maxPW, w.boostMaxPowerW) : w.maxPW, true);
                await this._queueState(`${w.ch}.zeroExportGridLimitActive`, w.zeroExportGridMaxW !== null, true);
                await this._queueState(`${w.ch}.zeroExportGridMaxW`, w.zeroExportGridMaxW === null ? w.maxPW : w.zeroExportGridMaxW, true);
                await this._queueState(`${w.ch}.boostActive`, eff === 'boost', true);
                await this._queueState(`${w.ch}.boostPrearmed`, eff === 'boost' && w.vehicleDemandConfirmed !== true, true);
                await this._queueState(`${w.ch}.boostSince`, boostSince || 0, true);
                await this._queueState(`${w.ch}.boostUntil`, boostUntil || 0, true);
                await this._queueState(`${w.ch}.boostRemainingMin`, boostRemainingMin || 0, true);
            } catch {
                // ignore
            }
        }

        /** Code-Teil: Arrow-Funktion `wallboxHasEvPriorityDemand` – enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden. */
        /** Code-Teil: wallboxHasEvPriorityDemand – Verarbeitet Wallbox-/Ladepunktdaten und Feature-Sichtbarkeit. */
        const wallboxHasEvPriorityDemand = (w) => {
            if (!w || !w.controlAvailable) return false;
            const eff = String(w.effectiveMode || 'normal');
            // Die Kundenprioritaet Speicher/E-Mobilitaet gilt ausschliesslich
            // fuer reine PV-Ladung. Min+PV, Auto und Boost duerfen dadurch weder
            // ihre netzgestuetzte Mindestleistung noch ihren normalen Gesamtgrant
            // verlieren.
            if (eff !== 'pv') return false;
            if (w.charging === true) return true;
            if (w.vehicleDemandConfirmed === true) return true;
            // A merely connected/startable vehicle must not reserve storage output
            // indefinitely. Storage yields only while the bounded technical start
            // probe is actually active; after timeout/cooldown the reservation ends.
            if (w.vehicleStartProbeActive === true) return true;
            return false;
        };

        const evPriorityWallboxes = feneconEvPriorityActive
            ? wbList.filter(w => wallboxHasEvPriorityDemand(w))
            : [];
        const evPriorityRequested = !!(feneconEvPriorityActive && evPriorityWallboxes.length > 0);
        let evPriorityStorageYieldW = 0;
        let evPriorityStorageSource = '';
        let storageFlowTopology = 'none';
        let storageFlowMeasurementSource = '';
        let evPriorityLimitedWallboxes = 0;
        let evPriorityStarvedW = 0;
        let evPriorityPendingW = 0;

        // For backwards compatibility: only cap the *total* budget by PV when
        // (a) PV-only is globally active (config or tariff) AND
        // (b) no active wallbox is in a grid-allowed mode (normal/minpv/boost).
        const capTotalBudgetByPv = (pvSurplusOnlyCfg || forcePvSurplusOnly) && !anyGridAllowedActive;
        const hasZeroExportGridLimit = wbList.some(w => typeof w.zeroExportGridMaxW === 'number');
        const needPvBudget = anyPvLimitedActive || capTotalBudgetByPv || zeroExportChargingActive;
        // Das PV-Gate ist inzwischen ein zentrales Diagnose-/Budget-Signal für nachgelagerte Apps
        // (z. B. Heizstab). Deshalb muss der PV-Überschuss auch dann berechnet und veröffentlicht
        // werden, wenn gerade keine Wallbox im PV-Modus aktiv ist. Wichtig: Das beeinflusst NICHT
        // die EVCS-Budgetbegrenzung; angewendet wird pvCapW weiterhin nur, wenn needPvBudget/capTotalBudgetByPv aktiv ist.
        const needPvDiagnostics = true;

        // PV surplus / cap (used for PV-limited wallboxes; and optionally to cap total budget)
        // Zwei zentrale PV-Grenzen mit unterschiedlicher Bedeutung:
        // - pvCapW: kundenseitig priorisierter Anteil fuer reine PV-Ladepunkte.
        // - pvPhysicalCapW: physikalisch verfuegbarer PV-Rest fuer den Zusatzanteil
        //   von Min+PV. Die netzgestuetzte Mindestleistung nutzt kein PV-Budget.
        let pvCapW = null;
        let pvPhysicalCapW = null;
        let zeroExportPvSourceSample = null;
        let zeroExportPvSourceBudget = null;
        let pvSurplusW = null;
        let gridW = null;
        let gridImportW = 0;
        let gridImportNoEvW = null;
        let pvStartReadyBudgetW = null;

        // Gate B: PV hysteresis diagnostics (defaults)
        let pvCapRawWState = 0;
        let pvCapEffectiveWState = 0;
        let pvPureCapWState = 0;
        let pvPhysicalCapWState = 0;
        let pvAvailableState = false;
        // Debug: PV surplus without EVCS (instant + smoothed)
        let pvSurplusNoEvRawWState = 0;
        let pvSurplusNoEvAvg5mWState = 0;
        // Central EMS budget coordinator: reserve the PV part used by EVCS later in the tick.
        let pvEvcsUsedWForBudget = 0;
        // Kundenauswahl aus dem zentralen EMS-Budget. Diese Diagnose bleibt auch
        // sichtbar, wenn aktuell keine Wallbox im PV-Modus laeuft.
        let pvAllocationModeState = 'both';
        let pvAllocationEvcsSharePctState = 50;
        let pvAllocationEvcsCapWState = 0;
        let pvAllocationUncappedWState = 0;
        let pvAllocationStorageActualChargeWState = 0;
        let pvBudgetSourceState = 'none';
        let pvBudgetCentralAgeMsState = null;
        let pvBudgetCentralTotalWState = 0;
        let pvBudgetCentralEvcsCapWState = 0;
        let pvBudgetLocalEstimateWState = 0;
        let pvBudgetMismatchWState = 0;
        let pvBudgetCentralAuthoritative = false;

        if (needPvBudget || needPvDiagnostics) {
            // PV-Überschuss sauber ermitteln:
            // Problem (vorher): PV-Cap wurde aus dem NVP (grid export) direkt abgeleitet.
            // Sobald die Wallbox startet, sinkt der Export (weil EVCS selbst verbraucht)
            // und der Algorithmus hat die Wallbox wieder abgeschaltet.
            //
            // Lösung: PV-Überschuss OHNE EVCS-Verbrauch berechnen:
            //   pvSurplusNoEv = (-gridW) + evcsW
            //   gridW: Import + / Export -, evcsW: aktuelle EVCS-Leistung (W)
            // => entspricht pvW - (Hauslast ohne EVCS)
            // Zusätzlich: 5-Minuten Durchschnitt für stabilere Regelung.

            const pvSurplusCfgW = getFirstDpNumber(['cm.pvSurplusW']);
            gridW = getFirstDpNumber(['cm.gridPowerW', 'grid.powerW', 'ps.gridPowerW']);

            // EVCS power estimation for PV surplus reconstruction
            // Why: Some wallboxes/meter datapoints update delayed. If we derive PV surplus only from the NVP
            // export (or from grid power + *actual* EVCS power), PV-only charging can "hop" around the AC
            // 3-phase minimum (~4.2kW): EVCS starts -> NVP export drops -> meter still reports 0W EVCS -> PV
            // budget collapses -> EVCS stops -> export rises -> ...
            //
            // Fix: Estimate EVCS consumption per connector using the last commanded setpoint as a fallback
            // whenever the measured power is still below the activity threshold (start-up / meter lag).
            let pvEvcsActualW = 0;
            let pvEvcsCmdW = 0;
            let pvEvcsUsedW = 0;
            let pvEvcsPhysicalPvManagedW = 0;
            let pvEvcsAutoPriorityMeasuredW = 0;

            try {
                for (const w of wbList) {
                    if (!w || !w.safe) continue;
                    if (!w.enabled || !w.online) continue;

                    const a = (typeof w.actualPowerW === 'number' && Number.isFinite(w.actualPowerW))
                        ? Math.max(0, Math.abs(w.actualPowerW))
                        : 0;
                    pvEvcsActualW += a;

                    // Fuer die zentrale physikalische PV-Rekonstruktion zaehlt nur
                    // gemessene Leistung von PV-/Min+PV- sowie Auto-Ladepunkten.
                    // Auto wird danach mit seinem tatsaechlichen PV-Anteil reserviert;
                    // Boost bleibt ausserhalb der Kundenaufteilung. Kommandowerte werden hier bewusst
                    // nicht verwendet; der NVP bildet den realen Leistungsfluss ab.
                    const effectiveMode = String(w.effectiveMode || '').trim().toLowerCase();
                    if ((effectiveMode === 'normal' || effectiveMode === 'auto')
                        && normalizeWallboxModeOverride(w.userMode) === 'auto' && w.meterStale !== true) {
                        pvEvcsPhysicalPvManagedW += a;
                        pvEvcsAutoPriorityMeasuredW += a;
                    } else if (effectiveMode === 'pv') {
                        pvEvcsPhysicalPvManagedW += a;
                    } else if (effectiveMode === 'minpv') {
                        // Min+PV-Grundlast kommt aus dem normalen Gesamt-/Netzbudget.
                        // Nur der Anteil oberhalb der technischen Mindestleistung darf
                        // das zentrale PV-Budget rekonstruieren bzw. reservieren.
                        const minPvPhysicalBaseW = (w.controlBasis === 'currentA')
                            ? Math.max(0, Number(w.minPW) || 0)
                            : Math.max(
                                Math.max(0, Number(w.minPW) || 0),
                                (w.chargerType === 'AC' && Number(w.phases || 0) === 3)
                                    ? Math.max(0, Number(acMinPower3pW) || 0)
                                    : 0,
                            );
                        pvEvcsPhysicalPvManagedW += Math.max(0, a - Math.min(a, minPvPhysicalBaseW));
                    }

                    const prevCmd = (this._lastCmdTargetW && typeof this._lastCmdTargetW.get === 'function')
                        ? this._lastCmdTargetW.get(w.safe)
                        : null;
                    const c = (typeof prevCmd === 'number' && Number.isFinite(prevCmd)) ? Math.max(0, prevCmd) : 0;
                    pvEvcsCmdW += c;

                    // If we recently commanded charging but the meter still reports ~0W, assume meter lag and
                    // use the command as the best available estimate for the current EVCS consumption.
                    let used = a;
                    if (c >= activityThresholdW && a < activityThresholdW) {
                        used = c;
                    }
                    pvEvcsUsedW += used;
                }
            } catch {
                // ignore
            }

            // Fallback (should not happen): use measured total power only
            if (!Number.isFinite(pvEvcsUsedW) || pvEvcsUsedW < 0) pvEvcsUsedW = 0;
            if (pvEvcsUsedW === 0) {
                pvEvcsUsedW = (typeof totalPowerW === 'number' && Number.isFinite(totalPowerW)) ? Math.max(0, totalPowerW) : 0;
                pvEvcsActualW = pvEvcsUsedW;
                pvEvcsCmdW = pvEvcsUsedW;
            }
            pvEvcsUsedWForBudget = Math.max(0, Math.round(pvEvcsPhysicalPvManagedW || 0));

            // Diagnostics (UI)
            try {
                await this._queueState('chargingManagement.control.pvEvcsActualW', Math.round(pvEvcsActualW || 0), true);
                await this._queueState('chargingManagement.control.pvEvcsCmdW', Math.round(pvEvcsCmdW || 0), true);
                await this._queueState('chargingManagement.control.pvEvcsUsedW', Math.round(pvEvcsUsedW || 0), true);
                await this._queueState('chargingManagement.control.pvEvcsPhysicalPvManagedW', Math.round(pvEvcsPhysicalPvManagedW || 0), true);
                await this._queueState('chargingManagement.control.pvEvcsAutoPriorityMeasuredW', Math.round(pvEvcsAutoPriorityMeasuredW || 0), true);
            } catch {
                // ignore
            }

            // EV-Prioritaet und PV-Rekonstruktion muessen dieselbe zentrale
            // Speichertopologie wie Speicherregler und Core-Budget verwenden.
            // Ein Peak-Shaving- oder alter Einzel-DP darf bei ausgewaehlter Farm
            // keine vermeintliche Speicherladung erzeugen.
            const storageAuthority = (this.adapter && typeof this.adapter._nwGetStorageControlAuthority === 'function')
                ? this.adapter._nwGetStorageControlAuthority()
                : {
                    selectedTopology: (this.adapter && this.adapter.config && this.adapter.config.enableStorageControl === true) ? 'single' : 'none',
                    writerActive: !!(this.adapter && this.adapter.config && this.adapter.config.enableStorageControl === true),
                    reason: 'charging-management-legacy-fallback',
                };
            storageFlowTopology = String(storageAuthority.selectedTopology || 'none');
            const storageFlowMaxAgeMs = Math.max(15000, clamp(num(cfg.centralBudgetMaxAgeSec, 30), 5, 120) * 1000);
            let storageChargeNowW = 0;
            let storageDischargeNowW = 0;
            let centralStorageFlowUsed = false;
            try {
                const flow = (this.adapter && typeof this.adapter._nwResolveBatteryFlowFromCache === 'function')
                    ? this.adapter._nwResolveBatteryFlowFromCache({ maxAgeMs: storageFlowMaxAgeMs, deadbandW: 25 })
                    : null;
                if (flow && typeof flow === 'object') {
                    centralStorageFlowUsed = true;
                    storageChargeNowW = Math.max(0, Number(flow.chargeW) || 0);
                    storageDischargeNowW = Math.max(0, Number(flow.dischargeW) || 0);
                    storageFlowMeasurementSource = String(flow.src || 'central-storage-flow');
                }
            } catch {
                centralStorageFlowUsed = false;
            }

            if (!centralStorageFlowUsed && storageFlowTopology === 'farm') {
                storageChargeNowW = Math.max(0, Number(this._getAdapterNumberFromCache('storageFarm.totalChargePowerW', 0)) || 0);
                storageDischargeNowW = Math.max(0, Number(this._getAdapterNumberFromCache('storageFarm.totalDischargePowerW', 0)) || 0);
                storageFlowMeasurementSource = 'storage-farm-fallback';
            } else if (!centralStorageFlowUsed && storageFlowTopology === 'single') {
                storageChargeNowW = Math.max(0, Number(this._getAdapterNumberFromCache('storageChargePower', 0)) || 0);
                storageDischargeNowW = Math.max(0, Number(this._getAdapterNumberFromCache('storageDischargePower', 0)) || 0);
                const battSignedW = getFirstDpNumber(['st.batteryPowerW']);
                if (typeof battSignedW === 'number' && Number.isFinite(battSignedW)) {
                    storageChargeNowW = battSignedW < -25 ? Math.max(storageChargeNowW, -battSignedW) : storageChargeNowW;
                    storageDischargeNowW = battSignedW > 25 ? Math.max(storageDischargeNowW, battSignedW) : storageDischargeNowW;
                    if (battSignedW < -25) storageDischargeNowW = 0;
                    if (battSignedW > 25) storageChargeNowW = 0;
                }
                storageFlowMeasurementSource = 'single-storage-fallback';
            } else if (!centralStorageFlowUsed) {
                storageFlowMeasurementSource = 'storage-none';
            }

            if (evPriorityRequested && storageChargeNowW > 0) {
                try {
                    const stStorageSource = await this._getStateCached('speicher.regelung.quelle');
                    evPriorityStorageSource = stStorageSource && stStorageSource.val !== null && stStorageSource.val !== undefined
                        ? String(stStorageSource.val || '')
                        : '';
                } catch {
                    evPriorityStorageSource = '';
                }

                const storageSourceNorm = String(evPriorityStorageSource || '').trim().toLowerCase();
                const nvpNoImport = (typeof gridW === 'number' && Number.isFinite(gridW) && gridW <= 150);
                const sourceLooksLikePvCharge = storageSourceNorm === 'pv'
                    || storageSourceNorm.includes('pv')
                    || storageSourceNorm.includes('überschuss')
                    || storageSourceNorm.includes('ueberschuss')
                    || storageSourceNorm.includes('nulleinspeisung')
                    || storageSourceNorm.includes('zero')
                    || storageSourceNorm === ''
                    || storageSourceNorm === 'idle'
                    || storageSourceNorm === 'fenecon';

                // EV-Priorität gilt nur für reine PV-Ladepunkte. Wenn der Speicher gerade
                // PV-Überschuss aufnimmt, wird diese Leistung im reinen EVCS-PV-Budget freigegeben.
                // Der Speicher-Regler bekommt im selben Tick das Block-Flag und nimmt seine
                // PV-Ladung zurück, sodass Wallboxen den Überschuss zuerst bekommen.
                if (nvpNoImport && sourceLooksLikePvCharge) {
                    evPriorityStorageYieldW = storageChargeNowW;
                }
            }

            /** Code-Teil: Arrow-Funktion `pvDirectW` – enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden. */
            /** Code-Teil: pvDirectW – Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen. */
            const pvDirectW = (() => {
                const dpPv = getFirstDpNumber(['ps.pvW']);
                if (typeof dpPv === 'number' && Number.isFinite(dpPv)) return Math.max(0, dpPv);

                const cachePv = this._getAdapterNumberFromCache('derived.core.pv.totalW', null);
                if (typeof cachePv === 'number' && Number.isFinite(cachePv)) return Math.max(0, cachePv);

                const cachePvRaw = this._getAdapterNumberFromCache('pvPower', null);
                if (typeof cachePvRaw === 'number' && Number.isFinite(cachePvRaw)) return Math.max(0, cachePvRaw);

                return null;
            })();

            /** Code-Teil: Arrow-Funktion `loadTotalDirectW` – lädt Daten aus API, State-Cache oder Konfiguration und stößt danach Rendering an. */
            /** Code-Teil: loadTotalDirectW – Lädt Daten aus API, States oder Konfiguration. */
            const loadTotalDirectW = (() => {
                const loadDerived = this._getAdapterNumberFromCache('derived.core.building.loadTotalW', null);
                if (typeof loadDerived === 'number' && Number.isFinite(loadDerived)) return Math.max(0, loadDerived);

                const loadMapped = this._getAdapterNumberFromCache('consumptionTotal', null);
                if (typeof loadMapped === 'number' && Number.isFinite(loadMapped)) return Math.max(0, loadMapped);

                return null;
            })();

            let pvSurplusNoEvW = null;
            if (typeof pvDirectW === 'number' && Number.isFinite(pvDirectW)
                && typeof loadTotalDirectW === 'number' && Number.isFinite(loadTotalDirectW)) {
                // Bevorzugte direkte Berechnung des gesamten verteilbaren PV-Potentials:
                //   PV - Verbrauch ohne EVCS
                // Die aktuelle Speicherladung wird hier bewusst NICHT abgezogen. Sonst
                // waere der bereits vom Speicher gebundene PV-Anteil fuer Wallboxen unsichtbar
                // und die neue zentrale Prioritaet koennte ihn nicht zwischen Speicher und
                // E-Mobilitaet verteilen. Wer welchen Anteil bekommt, entscheidet danach
                // ausschliesslich `ems.budget.gates.pvAllocation`.
                const evcsForLoadW = (pvEvcsUsedW > pvEvcsActualW && loadTotalDirectW >= (pvEvcsUsedW - 100))
                    ? pvEvcsUsedW
                    : pvEvcsActualW;
                const baseLoadNoEvW = Math.max(0, loadTotalDirectW - evcsForLoadW);
                pvSurplusNoEvW = Math.max(0, pvDirectW - baseLoadNoEvW);
                gridImportNoEvW = Math.max(0, baseLoadNoEvW - pvDirectW);
            } else if (typeof gridW === 'number' && Number.isFinite(gridW)) {
                // Fallback-Rekonstruktion ohne direkte PV-/Verbrauchs-DPs. Wir rechnen
                // sowohl EVCS als auch die aktuelle Speicherladung zum sichtbaren Export
                // zurueck. Batterie-Entladung wird abgezogen, weil sie kein PV-Ueberschuss
                // ist und das Wallbox-Budget niemals kuenstlich vergroessern darf.
                pvSurplusNoEvW = Math.max(0, (-gridW) + pvEvcsUsedW + storageChargeNowW - storageDischargeNowW);
                gridImportNoEvW = Math.max(0, gridW - pvEvcsUsedW - storageChargeNowW + storageDischargeNowW);
            } else if (typeof pvSurplusCfgW === 'number' && Number.isFinite(pvSurplusCfgW)) {
                // Fallback wenn kein Grid-DP verfügbar (z. B. nur PV-Surplus DP konfiguriert)
                pvSurplusNoEvW = Math.max(0, pvSurplusCfgW);
            }

            // Publish raw value (before smoothing) for debugging
            pvSurplusNoEvRawWState = (typeof pvSurplusNoEvW === 'number' && Number.isFinite(pvSurplusNoEvW)) ? pvSurplusNoEvW : 0;

            const pvSurplusFastW = (typeof pvSurplusNoEvW === 'number' && Number.isFinite(pvSurplusNoEvW))
                ? this._pvSurplusAvgPush('fast5s', now, pvSurplusNoEvW)
                : 0;
            const pvSurplusAvg5mW = (typeof pvSurplusNoEvW === 'number' && Number.isFinite(pvSurplusNoEvW))
                ? this._pvSurplusAvgPush('slow5m', now, pvSurplusNoEvW)
                : 0;

            // Active control must fall FAST when PV collapses, but may rise more smoothly.
            // Therefore we use an asymmetric control value:
            // - rising edge: short rolling mean (avoids start/stop noise)
            // - falling edge: raw surplus immediately clamps the budget
            /** Code-Teil: Arrow-Funktion `pvSurplusControlW` – enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden. */
            /** Code-Teil: pvSurplusControlW – Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen. */
            const pvSurplusControlW = (() => {
                const raw = (typeof pvSurplusNoEvW === 'number' && Number.isFinite(pvSurplusNoEvW)) ? pvSurplusNoEvW : 0;
                const fast = (typeof pvSurplusFastW === 'number' && Number.isFinite(pvSurplusFastW)) ? pvSurplusFastW : raw;
                return Math.max(0, Math.min(raw, fast));
            })();

            // Active control uses the asymmetric fast window; the 5min window stays visible for diagnostics.
            pvSurplusW = pvSurplusControlW;
            pvSurplusNoEvAvg5mWState = (typeof pvSurplusAvg5mW === 'number' && Number.isFinite(pvSurplusAvg5mW)) ? pvSurplusAvg5mW : 0;

            const pvCapRawW = (typeof pvSurplusControlW === 'number' && Number.isFinite(pvSurplusControlW) && pvSurplusControlW > 0) ? pvSurplusControlW : 0;
            // PV-Überschussladen soll etwas ruhiger laufen und nicht auf Kante 0 W Netzbezug regeln.
            // Deshalb rechnen wir standardmäßig eine kleine Reserve auf die EV-Ladeleistung drauf.
            // Effektiv bleibt dadurch im PV-Budget ein Puffer (Default 500 W), der kurze Messwertsprünge,
            // Rundungsfehler und minimale Hauslaständerungen abfedert, ohne die restliche Logik zu ändern.
            const pvChargeReserveW = clamp(num(cfg.pvChargeReserveW, 500), 0, 1e12);
            const pvCapBudgetLocalW = Math.max(0, pvCapRawW - pvChargeReserveW);
            pvBudgetLocalEstimateWState = pvCapBudgetLocalW;
            pvAllocationStorageActualChargeWState = Math.max(0, Math.round(storageChargeNowW || 0));

            // Zentrale Orchestrierung: Core-Limits berechnet EIN physikalisches PV-Budget
            // und teilt es gemaess Kundeneinstellung zwischen EVCS und Speicher. Die lokale
            // EVCS-Rekonstruktion bleibt nur Diagnose/Fallback. Ein `Math.min(local, central)`
            // waere fachlich falsch: Ein kurzzeitig 0 W meldender lokaler PV-/Last-DP wuerde
            // sonst trotz klarer NVP-Einspeisung den zentralen EVCS-Anteil wieder auf 0 setzen.
            const centralBudget = this.adapter && this.adapter._emsBudget;
            const pvBudgetControl = resolveChargingPvBudgetControl({
                centralBudget,
                now,
                maxAgeMs: Math.max(15000, clamp(num(cfg.centralBudgetMaxAgeSec, 30), 5, 120) * 1000),
                localRawW: pvCapRawW,
                localEffectiveW: pvCapBudgetLocalW,
            });
            const allocationGate = pvBudgetControl.allocation;
            pvBudgetCentralAuthoritative = pvBudgetControl.authoritative === true;
            pvBudgetSourceState = String(pvBudgetControl.source || '');
            pvBudgetCentralAgeMsState = pvBudgetControl.ageMs;
            pvBudgetCentralTotalWState = Math.max(0, Number(pvBudgetControl.totalW) || 0);
            pvBudgetCentralEvcsCapWState = Math.max(0, Number(pvBudgetControl.evcsCapW) || 0);
            pvBudgetMismatchWState = Number.isFinite(Number(pvBudgetControl.mismatchW))
                ? Number(pvBudgetControl.mismatchW)
                : 0;

            if (allocationGate) {
                pvAllocationModeState = String(allocationGate.mode || 'both');
                pvAllocationEvcsSharePctState = Number.isFinite(Number(allocationGate.evcsSharePct))
                    ? Math.max(0, Math.min(100, Number(allocationGate.evcsSharePct)))
                    : 50;
            } else {
                pvAllocationModeState = 'legacy-full-evcs';
                pvAllocationEvcsSharePctState = 100;
            }

            // `totalW` ist das zentrale PV-Budget nach zentraler Reserve. `evcsCapW`
            // ist daraus der maximal zulaessige EVCS-Anteil. Beide Werte stammen aus
            // demselben Budget-Snapshot, den Speicher, Heizstab und weitere Verbraucher
            // anschliessend ueber `reserve()` weiter reduzieren.
            pvAllocationUncappedWState = pvBudgetCentralTotalWState;
            pvAllocationEvcsCapWState = pvBudgetCentralEvcsCapWState;
            const pvCapAllocatedW = pvBudgetCentralAuthoritative
                ? pvBudgetCentralEvcsCapWState
                : Math.max(0, pvCapBudgetLocalW);
            const pvPhysicalAllocatedW = pvBudgetCentralAuthoritative
                ? pvBudgetCentralTotalWState
                : Math.max(0, pvCapBudgetLocalW);
            pvStartReadyBudgetW = pvCapAllocatedW;
            pvCapW = pvCapAllocatedW;
            pvPhysicalCapW = pvPhysicalAllocatedW;

            // Pure PV charging keeps the existing start/stop hysteresis. Min+PV
            // skips this gate: its base comes from the total/grid budget and only
            // its extra power follows the physical PV remainder.
            const purePvHysteresisActive = anyPurePvActive || capTotalBudgetByPv;
            const pvStartThresholdW = clamp(num(cfg.pvStartThresholdW, 800), 0, 1e12);
            const pvStopThresholdW = clamp(num(cfg.pvStopThresholdW, 200), 0, 1e12);
            const pvStartDelayMs = clamp(num(cfg.pvStartDelaySec, 10), 0, 3600) * 1000;
            const pvStopDelayMs = clamp(num(cfg.pvStopDelaySec, 30), 0, 3600) * 1000;
            const pvAbortImportW = clamp(num(cfg.pvAbortImportW, 600), 0, 1e12);
            const startW = pvStartThresholdW;
            const stopW = Math.min(pvStopThresholdW, startW > 0 ? startW : pvStopThresholdW);
            const pvStartupHoldActive = purePvHysteresisActive
                && wbList.some((w) => w && w.controlAvailable && w.effectiveMode === 'pv'
                    && Number.isFinite(Number(w.pvStartupHoldUntilMs)) && Number(w.pvStartupHoldUntilMs) > now);

            gridImportW = (typeof gridW === 'number' && Number.isFinite(gridW)) ? Math.max(0, gridW) : 0;
            if (!(typeof gridImportNoEvW === 'number' && Number.isFinite(gridImportNoEvW))) {
                gridImportNoEvW = (typeof gridW === 'number' && Number.isFinite(gridW))
                    ? Math.max(0, gridW - pvEvcsUsedW - storageChargeNowW + storageDischargeNowW)
                    : 0;
            }

            let pvAvail = purePvHysteresisActive ? !!this._pvAvailable : false;
            if (purePvHysteresisActive) {
                const forcedBelow = !pvStartupHoldActive && pvAbortImportW > 0 && gridImportNoEvW > pvAbortImportW;
                const above = !forcedBelow && (startW > 0 ? pvCapAllocatedW >= startW : pvCapAllocatedW > 0);
                const below = !(pvStartupHoldActive && pvCapAllocatedW > 0) && (forcedBelow || pvCapAllocatedW <= stopW);
                if (above) {
                    if (!this._pvAboveSinceMs) this._pvAboveSinceMs = now;
                    this._pvBelowSinceMs = 0;
                    if (!pvAvail && (pvStartDelayMs <= 0 || now - this._pvAboveSinceMs >= pvStartDelayMs)) pvAvail = true;
                } else if (below) {
                    if (!this._pvBelowSinceMs) this._pvBelowSinceMs = now;
                    this._pvAboveSinceMs = 0;
                    if (pvAvail && (pvStopDelayMs <= 0 || now - this._pvBelowSinceMs >= pvStopDelayMs)) pvAvail = false;
                } else {
                    this._pvAboveSinceMs = 0;
                    this._pvBelowSinceMs = 0;
                }
            } else {
                this._pvAboveSinceMs = 0;
                this._pvBelowSinceMs = 0;
            }

            this._pvAvailable = pvAvail;
            // Der neue Netzanteilvertrag darf ausschließlich frische, nachgewiesene
            // PV-Leistung addieren. Kein Rückfall auf lokale Schätzwerte/Prognosen.
            zeroExportPvSourceSample = this.adapter?._zeroExportPvCoordinator?.sample;
            zeroExportPvSourceBudget = this.adapter?._emsBudget;
            const confirmedPvW = hasZeroExportGridLimit
                ? confirmedZeroExportPvW(this.adapter, pvBudgetCentralAuthoritative ? pvPhysicalAllocatedW : 0, now)
                : Number.POSITIVE_INFINITY;
            pvCapW = purePvHysteresisActive && pvAvail ? Math.min(pvCapAllocatedW, confirmedPvW) : 0;
            pvPhysicalCapW = Math.max(0, Math.min(pvPhysicalAllocatedW, confirmedPvW));

            pvCapRawWState = pvBudgetCentralAuthoritative
                ? Math.max(0, Number(pvBudgetControl.rawW) || 0)
                : pvCapRawW;
            pvCapEffectiveWState = (typeof pvCapW === 'number' && Number.isFinite(pvCapW)) ? pvCapW : 0;
            pvPureCapWState = pvCapEffectiveWState;
            pvPhysicalCapWState = (typeof pvPhysicalCapW === 'number' && Number.isFinite(pvPhysicalCapW))
                ? Math.max(0, pvPhysicalCapW)
                : 0;
            pvAvailableState = pvAvail || (anyMinPvActive && pvPhysicalCapWState > 0);

        }

        if (!needPvBudget && !needPvDiagnostics) {
            this._pvAvailable = false;
            this._pvAboveSinceMs = 0;
            this._pvBelowSinceMs = 0;
            pvCapRawWState = 0;
            pvCapEffectiveWState = 0;
            pvPureCapWState = 0;
            pvPhysicalCapWState = 0;
            pvAvailableState = false;
            pvSurplusNoEvRawWState = 0;
            pvSurplusNoEvAvg5mWState = 0;
            pvBudgetSourceState = 'inactive';
            pvBudgetCentralAgeMsState = null;
            pvBudgetCentralTotalWState = 0;
            pvBudgetCentralEvcsCapWState = 0;
            pvBudgetLocalEstimateWState = 0;
            pvBudgetMismatchWState = 0;
            pvBudgetCentralAuthoritative = false;
            pvPhysicalCapW = null;
        }

        // Publish PV diagnostics (even if PV budgeting is not active)
        try {
            await this._queueState('chargingManagement.control.pvCapRawW', pvCapRawWState || 0, true);
            await this._queueState('chargingManagement.control.pvCapEffectiveW', pvCapEffectiveWState || 0, true);
            await this._queueState('chargingManagement.control.pvPureCapW', pvPureCapWState || 0, true);
            await this._queueState('chargingManagement.control.pvPhysicalCapW', pvPhysicalCapWState || 0, true);
            await this._queueState('chargingManagement.control.pvPriorityPurePvOnly', false, true);
            await this._queueState('chargingManagement.control.pvPriorityIncludesAuto', true, true);
            await this._queueState('chargingManagement.control.pvAvailable', !!pvAvailableState, true);
            await this._queueState('chargingManagement.control.pvSurplusNoEvRawW', pvSurplusNoEvRawWState || 0, true);
            await this._queueState('chargingManagement.control.pvSurplusNoEvAvg5mW', pvSurplusNoEvAvg5mWState || 0, true);
            await this._queueState('chargingManagement.control.pvAllocationMode', String(pvAllocationModeState || 'both'), true);
            await this._queueState('chargingManagement.control.pvAllocationEvcsSharePct', Math.round(Number(pvAllocationEvcsSharePctState) || 0), true);
            await this._queueState('chargingManagement.control.pvAllocationEvcsCapW', Math.round(Number(pvAllocationEvcsCapWState) || 0), true);
            await this._queueState('chargingManagement.control.pvAllocationUncappedW', Math.round(Number(pvAllocationUncappedWState) || 0), true);
            await this._queueState('chargingManagement.control.pvAllocationStorageActualChargeW', Math.round(Number(pvAllocationStorageActualChargeWState) || 0), true);
            await this._queueState('chargingManagement.control.pvBudgetSource', String(pvBudgetSourceState || ''), true);
            await this._queueState(
                'chargingManagement.control.pvBudgetCentralAgeMs',
                Number.isFinite(Number(pvBudgetCentralAgeMsState)) ? Math.round(Number(pvBudgetCentralAgeMsState)) : 0,
                true,
            );
            await this._queueState('chargingManagement.control.pvBudgetCentralTotalW', Math.round(Number(pvBudgetCentralTotalWState) || 0), true);
            await this._queueState('chargingManagement.control.pvBudgetCentralEvcsCapW', Math.round(Number(pvBudgetCentralEvcsCapWState) || 0), true);
            await this._queueState('chargingManagement.control.pvBudgetLocalEstimateW', Math.round(Number(pvBudgetLocalEstimateWState) || 0), true);
            await this._queueState('chargingManagement.control.pvBudgetMismatchW', Math.round(Number(pvBudgetMismatchWState) || 0), true);
        } catch {
            // ignore
        }

        if (budgetMode === 'engine') {
            /** @type {Array<{k:string, w:number}>} */
            const components = [];

            // Static hard cap (optional)
            if (staticBudgetW > 0) components.push({ k: 'static', w: staticBudgetW });

            // External cap (optional)
            const ext = (budgetPowerId && this.dp) ? this.dp.getNumber('cm.budgetPowerW', null) : null;
            if (typeof ext === 'number' && Number.isFinite(ext) && ext > 0) components.push({ k: 'external', w: ext });

            // Peak-shaving cap (optional)
            const peak = await this._getPeakShavingBudgetW();
            if (typeof peak === 'number' && Number.isFinite(peak) && peak > 0) components.push({ k: 'peakShaving', w: peak });

            // Tariff cap (optional via globalDatapoints mapping)
            /** Code-Teil: Arrow-Funktion `coreTariffW` – enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden. */
            /** Code-Teil: coreTariffW – Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen. */
            const coreTariffW = (() => {
                try {
                    const caps = (this.adapter && this.adapter._emsCaps && typeof this.adapter._emsCaps === 'object') ? this.adapter._emsCaps : null;
                    const n = caps && caps.tariff ? num(caps.tariff.budgetW, null) : null;
                    return (typeof n === 'number' && Number.isFinite(n) && n > 0) ? n : null;
                } catch {
                    return null;
                }
            })();

            const tariffRaw = (typeof coreTariffW === 'number') ? coreTariffW : getFirstDpNumber(['cm.tariffBudgetW', 'cm.tariffLimitW']);

            // Boost: user explicitly requests full charging -> ignore tariff budget cap.
            if (!anyBoostActive && typeof tariffRaw === 'number' && Number.isFinite(tariffRaw) && tariffRaw > 0) {
                let tariffEff = tariffRaw;
                let tariffKey = 'tariff';

                // If the storage tariff charging is blocked by PV-Reserve (Forecast),
                // do NOT reserve EVCS power for the storage. In that case "tariffBudgetW"
                // can be artificially low (baseW - reserveW) and would block EVCS charging.
                try {
                    const stPvBlock = await this._getStateCached('speicher.regelung.tarifPvBlock');
                    const pvBlock = stPvBlock ? !!stPvBlock.val : false;

                    if (pvBlock) {
                        const stBase = await this._getStateCached('tarif.ladeparkMaxW');
                        const baseW = stBase ? Number(stBase.val) : NaN;

                        if (Number.isFinite(baseW) && baseW > 0 && baseW >= tariffRaw) {
                            tariffEff = baseW;
                            tariffKey = 'tariff(pvReserve)';
                        }
                    }
                } catch {
                    // ignore
                }

                components.push({ k: tariffKey, w: tariffEff });
            }

            // PV-surplus cap (legacy / compatibility): only used to cap the *total* budget when required.
            if (capTotalBudgetByPv && typeof pvCapW === 'number' && Number.isFinite(pvCapW)) {
                components.push({ k: 'pvSurplus', w: pvCapW });
            }

if (components.length) {
                let min = Number.POSITIVE_INFINITY;
                for (const c of components) {
                    const w = Number(c.w);
                    if (Number.isFinite(w)) min = Math.min(min, w);
                }
                budgetW = Number.isFinite(min) ? min : Number.POSITIVE_INFINITY;

                const eps = 0.001;
                const bind = components
                    .filter(c => Number.isFinite(Number(c.w)) && Math.abs(Number(c.w) - budgetW) <= eps)
                    .map(c => c.k);

                effectiveBudgetMode = `engine:${bind.length ? bind.join('+') : 'unlimited'}`;
            } else {
                budgetW = Number.POSITIVE_INFINITY;
                effectiveBudgetMode = 'engine:unlimited';
            }

            budgetDebug = {
                engine: true,
                mode,
                pvSurplusOnlyCfg,
                pvSurplusOnlyCfgBase,
                tariffNegativeActive,
                tariffGridImportPreferred,
                forcePvSurplusOnly,
                gridChargeAllowed,
                dischargeAllowed,
                capTotalBudgetByPv,
                anyPvLimitedActive,
                anyGridAllowedActive,
                pvCapRawW: (typeof pvCapRawWState === 'number' && Number.isFinite(pvCapRawWState)) ? pvCapRawWState : null,
                pvCapW: (typeof pvCapW === 'number' && Number.isFinite(pvCapW)) ? pvCapW : null,
                pvCapEffectiveW: (typeof pvCapEffectiveWState === 'number' && Number.isFinite(pvCapEffectiveWState)) ? pvCapEffectiveWState : null,
                pvPureCapW: (typeof pvPureCapWState === 'number' && Number.isFinite(pvPureCapWState)) ? pvPureCapWState : null,
                pvPhysicalCapW: (typeof pvPhysicalCapWState === 'number' && Number.isFinite(pvPhysicalCapWState)) ? pvPhysicalCapWState : null,
                pvPriorityPurePvOnly: false,
                pvPriorityIncludesAuto: true,
                pvAvailable: !!pvAvailableState,
                gridW: (typeof gridW === 'number' && Number.isFinite(gridW)) ? gridW : null,
                gridImportNoEvW: (typeof gridImportNoEvW === 'number' && Number.isFinite(gridImportNoEvW)) ? gridImportNoEvW : null,
                pvSurplusW: (typeof pvSurplusW === 'number' && Number.isFinite(pvSurplusW)) ? pvSurplusW : null,
                pvSurplusAvg5mW: (typeof pvSurplusNoEvAvg5mWState === 'number' && Number.isFinite(pvSurplusNoEvAvg5mWState)) ? pvSurplusNoEvAvg5mWState : null,
                pvAllocationMode: String(pvAllocationModeState || ''),
                pvAllocationEvcsSharePct: Math.round(Number(pvAllocationEvcsSharePctState) || 0),
                pvAllocationEvcsCapW: Math.round(Number(pvAllocationEvcsCapWState) || 0),
                pvAllocationUncappedW: Math.round(Number(pvAllocationUncappedWState) || 0),
                pvAllocationStorageActualChargeW: Math.round(Number(pvAllocationStorageActualChargeWState) || 0),
                pvBudgetSource: String(pvBudgetSourceState || ''),
                pvBudgetCentralAuthoritative: !!pvBudgetCentralAuthoritative,
                pvBudgetCentralAgeMs: Number.isFinite(Number(pvBudgetCentralAgeMsState)) ? Math.round(Number(pvBudgetCentralAgeMsState)) : null,
                pvBudgetCentralTotalW: Math.round(Number(pvBudgetCentralTotalWState) || 0),
                pvBudgetCentralEvcsCapW: Math.round(Number(pvBudgetCentralEvcsCapWState) || 0),
                pvBudgetLocalEstimateW: Math.round(Number(pvBudgetLocalEstimateWState) || 0),
                pvBudgetMismatchW: Math.round(Number(pvBudgetMismatchWState) || 0),
                evPriorityStorageYieldW: Math.round(evPriorityStorageYieldW || 0),
                storageFlowTopology: String(storageFlowTopology || 'none'),
                storageFlowMeasurementSource: String(storageFlowMeasurementSource || ''),
                components,
            };
        } else if (budgetMode === 'static') {
            budgetW = staticBudgetW > 0 ? staticBudgetW : Number.POSITIVE_INFINITY;
        } else if (budgetMode === 'fromDatapoint') {
            const b = (budgetPowerId && this.dp) ? this.dp.getNumber('cm.budgetPowerW', null) : null;
            budgetW = (typeof b === 'number' && b > 0) ? b : Number.POSITIVE_INFINITY;
        } else if (budgetMode === 'fromPeakShaving') {
            const b = await this._getPeakShavingBudgetW();
            budgetW = (typeof b === 'number' && b > 0) ? b : Number.POSITIVE_INFINITY;
        } else {
            budgetW = Number.POSITIVE_INFINITY;
        }

        // Backwards compatibility: if PV-only is globally active AND no wallbox is grid-allowed,
        // enforce the PV cap for ALL budget modes.
        if (capTotalBudgetByPv && typeof pvCapW === 'number' && Number.isFinite(pvCapW)) {
            const cap = Math.max(0, pvCapW);
            const cur = (typeof budgetW === 'number' && Number.isFinite(budgetW)) ? budgetW : Number.POSITIVE_INFINITY;
            budgetW = Math.max(0, Math.min(cur, cap));

            if (!String(effectiveBudgetMode || '').includes('pvSurplus')) {
                effectiveBudgetMode = `${effectiveBudgetMode}+pvSurplus`;
            }

            if (budgetDebug && typeof budgetDebug === 'object') {
                budgetDebug.pvCapAppliedW = cap;
                budgetDebug.budgetAfterPvCapW = budgetW;
            }
        }

        // ---------------------------------------------------------------------
        // Gate A: HARD GRID SAFETY CAPS (always top priority)
        // - Grid import limit (Netzanschlussleistung) based on live meter (W)
        // - Optional phase current limit (A) based on live meter (L1/L2/L3)
        // These caps apply regardless of Boost/PV modes and regardless of the selected budget mode.
        // ---------------------------------------------------------------------

        // Config sources for the grid connection import limit (W):
        // - installerConfig.gridConnectionPower (single source of truth)
        // - legacy fallback: PeakShaving.maxPowerW (only if EMS limit is not configured)
        // Phase 4.0: prefer centralized caps snapshot (ems.core) if available.
        const coreCaps = (this.adapter && this.adapter._emsCaps && typeof this.adapter._emsCaps === 'object') ? this.adapter._emsCaps : null;
        const coreGridCfgW = coreCaps && coreCaps.grid ? num(coreCaps.grid.gridConnectionLimitW_cfg, null) : null;
        const coreGridEffW = coreCaps && coreCaps.grid ? num(coreCaps.grid.gridImportLimitW_effective, null) : null;
        const coreGridPlanningW = coreCaps && coreCaps.grid ? num(coreCaps.grid.gridImportLimitW_planning, null) : null;
        const coreGridStage = coreCaps && coreCaps.grid ? String(coreCaps.grid.gridImportStage || '') : '';
        const coreGridMarginW = coreCaps && coreCaps.grid ? num(coreCaps.grid.gridSafetyMarginW, null) : null;
        const coreMaxPhaseA = coreCaps && coreCaps.grid ? num(coreCaps.grid.gridMaxPhaseA_cfg, null) : null;

        const instLimitW = clamp(num(this.adapter?.config?.installerConfig?.gridConnectionPower, 0), 0, 1e12);
        const psLimitW = clamp(num(this.adapter?.config?.peakShaving?.maxPowerW, 0), 0, 1e12);
        const gridImportLimitW = (Number.isFinite(coreGridCfgW) && coreGridCfgW > 0)
            ? coreGridCfgW
            : ((typeof instLimitW === 'number' && Number.isFinite(instLimitW) && instLimitW > 0)
                ? instLimitW
                : ((typeof psLimitW === 'number' && Number.isFinite(psLimitW) && psLimitW > 0) ? psLimitW : 0));

        // Safety margin (W): prefer core snapshot, fallback to PeakShaving.safetyMarginW.
        const gridMarginW = (Number.isFinite(coreGridMarginW) && coreGridMarginW >= 0)
            ? coreGridMarginW
            : clamp(num(this.adapter?.config?.peakShaving?.safetyMarginW, 0), 0, 1e12);

        // Effective import cap (W): prefer core snapshot (may include Grid-Constraints / RLM caps).
        const gridImportLimitEffW = (Number.isFinite(coreGridEffW) && coreGridEffW > 0)
            ? coreGridEffW
            : (gridImportLimitW > 0 ? Math.max(0, gridImportLimitW - gridMarginW) : 0);
        // RC86: Das 90-%-Soft-Limit ist nur der Beginn einer progressiven
        // Rampenbegrenzung. Die absolute EVCS-Freigabe bleibt an der wirksamen
        // Hard-Grenze des NVP ausgerichtet. Der finale Safety-Writer prueft jeden
        // Write weiterhin nochmals gegen dieselbe Hard-Grenze.
        const gridImportLimitPlanningW = (Number.isFinite(coreGridPlanningW) && coreGridPlanningW > 0)
            ? Math.min(coreGridPlanningW, gridImportLimitEffW > 0 ? gridImportLimitEffW : coreGridPlanningW)
            : (gridImportLimitEffW > 0 ? gridImportLimitEffW * 0.9 : 0);
        const gridImportStage = coreGridStage || (gridImportLimitEffW > 0 ? 'normal' : 'disabled');

        // Optional phase limit (A): prefer core snapshot.
        const gridMaxPhaseA = (Number.isFinite(coreMaxPhaseA) && coreMaxPhaseA > 0)
            ? coreMaxPhaseA
            : clamp(num(this.adapter?.config?.peakShaving?.maxPhaseA, 0), 0, 20000);

        // Gate A must use exactly the same canonical signed NVP snapshot as the
        // central EMS budget. A second local fallback value caused the two cards
        // to show different NVP values and different caps on the same tick.
        const needGridSafetyCaps = gridImportLimitEffW > 0 || gridMaxPhaseA > 0;
        const canonicalGridNvp = resolveCurrentNvpSnapshot(
            this.adapter && this.adapter._nvpFreshnessSnapshot,
            now,
            Math.max(1000, staleTimeoutMs),
        );
        let gridMeasurementSourceForGate = '';
        if (canonicalGridNvp.current) {
            gridMeasurementSourceForGate = String(canonicalGridNvp.source || 'canonical-nvp');
            gridW = canonicalGridNvp.usable && Number.isFinite(Number(canonicalGridNvp.netW))
                ? Number(canonicalGridNvp.netW)
                : null;
        } else if (needGridSafetyCaps && (typeof gridW !== 'number' || !Number.isFinite(gridW))) {
            // Compatibility fallback is only allowed when the central snapshot is
            // not known yet. A known-but-stale central NVP stays fail-closed and is
            // never replaced by a second, potentially contradictory measurement.
            gridW = getFirstDpNumber(['cm.gridPowerW', 'grid.powerW', 'ps.gridPowerW']);
            gridMeasurementSourceForGate = typeof gridW === 'number' && Number.isFinite(gridW)
                ? 'legacy-local-fallback'
                : 'missing';
        } else if (typeof gridW === 'number' && Number.isFinite(gridW)) {
            gridMeasurementSourceForGate = 'preloaded-local-value';
        }

        // Derive base load and EVCS cap from the signed NVP import limit.
        let gridBaseLoadW = null;
        let gridBaseLoadRawW = null;
        let gridLocalSupportW = null;
        let gridIncrementHeadroomW = null;
        let gridHardHeadroomRawW = null;
        let gridSoftRampFactor = 1;
        let gridCapEvcsW = null;
        let gridCapBinding = false; // true only after real EVCS demand was reduced
        let gridCapBudgetApplied = false; // internal finite allocation envelope
        let gridCapDemandCandidate = false;
        let gridReductionW = 0;
        let gridDemandRequestedW = 0;
        let gridDemandActivePoints = 0;
        let gridAllowedDemandW = 0;
        const budgetBeforeGridCaps = budgetW;
        const budgetModeBeforeGridCaps = String(effectiveBudgetMode || budgetMode || 'unlimited');

        // RC85_OFFLINE_RESERVE_APPLIED: an unavailable point cannot stop all other
        // points. Only its uncertain last/technical power is withheld. An offline
        // point with no vehicle and confirmed 0 W reserves exactly 0 W.
        const offlineReserveW = rc85OfflineReserveW((wbList || []).map((point) => ({
            status: point && point.online === false
                ? 'offline'
                : (point && point.faultActive === true
                    ? 'fault'
                    : (point && point.unavailableActive === true ? 'unavailable' : 'online')),
            actualW: point && Number.isFinite(Number(point.actualPowerW)) ? Math.max(0, Number(point.actualPowerW)) : 0,
            vehicleConnected: point && point.vehiclePlugged === true,
            minPowerW: point && Number.isFinite(Number(point.minPW)) ? Math.max(0, Number(point.minPW)) : 0,
        })));
        const estimatedGridDemand = estimateGridRelevantEvcsDemandW(
            wbList,
            this._lastCmdTargetW,
            Math.max(50, Number(cfg.activityThresholdW) || 100),
        );
        gridDemandRequestedW = Math.max(0, Number(estimatedGridDemand.totalW) || 0);
        gridDemandActivePoints = Math.max(0, Math.round(Number(estimatedGridDemand.activePoints) || 0));

        if (gridImportLimitEffW > 0 && typeof gridW === 'number' && Number.isFinite(gridW)) {
            const gridEvcsActualForCapW = Number.isFinite(totalFreshActualPowerW) ? Math.max(0, Number(totalFreshActualPowerW)) : 0;
            const gridEvcsReserveIgnoredForCapW = Math.max(0, (Number.isFinite(totalPowerW) ? Number(totalPowerW) : 0) - gridEvcsActualForCapW);
            gridBaseLoadRawW = gridW - gridEvcsActualForCapW;
            let derivedBaseLoadW = null;
            let derivedBaseLoadSource = '';
            try {
                const candidates = [
                    ['derived.core.building.loadRestW', 'derived.core.building.loadRestW'],
                    ['historie.core.building.loadRestW', 'historie.core.building.loadRestW'],
                    ['derived.core.building.loadTotalW', 'derived.core.building.loadTotalW'],
                    ['historie.core.building.loadTotalW', 'historie.core.building.loadTotalW'],
                    ['consumptionTotal', 'consumptionTotal'],
                ];
                for (const [id, source] of candidates) {
                    const st = await this._getStateCached(id);
                    const ts = st && Number(st.ts || st.lc || 0);
                    const fresh = !Number.isFinite(ts) || ts <= 0 || (Date.now() - ts) <= Math.max(staleTimeoutMs, 120000);
                    const v = st ? Number(st.val) : NaN;
                    if (fresh && Number.isFinite(v) && v >= 0) {
                        derivedBaseLoadW = Math.max(0, v);
                        derivedBaseLoadSource = source;
                        break;
                    }
                }
            } catch (_eBaseLoad) {}
            gridBaseLoadW = Number.isFinite(Number(derivedBaseLoadW)) ? Math.max(0, Number(derivedBaseLoadW)) : Math.max(0, gridBaseLoadRawW);
            gridLocalSupportW = Math.max(0, gridBaseLoadW - gridBaseLoadRawW);

            const gridEnvelope = rc85GridEnvelope({
                hardLimitW: gridImportLimitEffW,
                signedNvpW: gridW,
                currentControlledLoadW: gridEvcsActualForCapW,
                offlineReserveW,
                pendingIncreaseW: 0,
            });
            gridIncrementHeadroomW = gridEnvelope.progressiveIncrementW;
            gridHardHeadroomRawW = gridEnvelope.hardHeadroomRawW;
            gridSoftRampFactor = gridEnvelope.softRampFactor;
            gridCapEvcsW = clamp(gridEnvelope.maxControlledLoadW, 0, 1e12);
            // `budgetBeforeGridCaps` can already originate from the same central
            // NVP gate. Using it here would hide a real reduction (demand 44 kW,
            // central hard headroom 41 kW). Demand candidacy is therefore based
            // on the EVCS request itself; independent phase/§14a/station limits
            // are resolved after the final allocation below.
            const preGridDemandW = gridDemandRequestedW;
            gridAllowedDemandW = Math.min(preGridDemandW, gridCapEvcsW);
            gridCapDemandCandidate = preGridDemandW > gridAllowedDemandW + 50;

            try {
                budgetDebug = budgetDebug || {};
                budgetDebug.gridBaseLoadSource = derivedBaseLoadSource || 'gridW-minus-fresh-evcs';
                budgetDebug.gridMeasurementSource = gridMeasurementSourceForGate;
                budgetDebug.gridEvcsActualForCapW = gridEvcsActualForCapW;
                budgetDebug.gridEvcsReserveIgnoredForCapW = gridEvcsReserveIgnoredForCapW;
                budgetDebug.gridOfflineReserveW = offlineReserveW;
                budgetDebug.gridHardHeadroomRawW = gridHardHeadroomRawW;
                budgetDebug.gridIncrementHeadroomW = gridIncrementHeadroomW;
                budgetDebug.gridSoftRampFactor = gridSoftRampFactor;
                budgetDebug.gridPredictedNvpAtMaximumW = gridEnvelope.predictedNvpAtMaximumW;
                budgetDebug.gridDemandRequestedW = gridDemandRequestedW;
                budgetDebug.gridAllowedDemandW = gridAllowedDemandW;
                budgetDebug.gridCapDemandCandidate = gridCapDemandCandidate;
            } catch (_eBaseLoadDebug) {}

            const before = budgetW;
            budgetW = !Number.isFinite(budgetW) ? gridCapEvcsW : Math.min(budgetW, gridCapEvcsW);
            gridCapBudgetApplied = Number.isFinite(gridCapEvcsW) && before !== budgetW;

            if (!String(effectiveBudgetMode || '').includes('gridImport')) {
                effectiveBudgetMode = `${effectiveBudgetMode}+gridImport`;
            }
        }

        // Phase-based cap (conservative: assumes additional power may hit the worst phase)
        let worstPhaseA = null;
        let phaseCapEvcsW = null;
        let phaseCapBinding = false;

        if (gridMaxPhaseA > 0) {
            const l1 = getFirstDpNumber(['ps.l1A']);
            const l2 = getFirstDpNumber(['ps.l2A']);
            const l3 = getFirstDpNumber(['ps.l3A']);
            const phases = [l1, l2, l3].filter(v => typeof v === 'number' && Number.isFinite(v));
            if (phases.length) {
                worstPhaseA = Math.max(...phases);
                const slackA = gridMaxPhaseA - worstPhaseA;
                // Conservative conversion: 1-phase equivalent (230V)
                const v = voltageV;
                phaseCapEvcsW = clamp((Number.isFinite(totalPowerW) ? totalPowerW : 0) + (Number.isFinite(slackA) ? slackA : 0) * v, 0, 1e12);

                const before = budgetW;
                if (!Number.isFinite(budgetW)) {
                    budgetW = phaseCapEvcsW;
                } else {
                    budgetW = Math.min(budgetW, phaseCapEvcsW);
                }
                phaseCapBinding = (Number.isFinite(phaseCapEvcsW) && (before !== budgetW));

                if (!String(effectiveBudgetMode || '').includes('phaseCap')) {
                    effectiveBudgetMode = `${effectiveBudgetMode}+phaseCap`;
                }
            } else {
                // No phase readings while a phase limit is configured => treat as stale (handled by stale logic below)
                worstPhaseA = null;
            }
        }

        // ---------------------------------------------------------------------
        // Gate A2: §14a EnWG cap (optional, provided by Para14aModule)
        // If active, cap the EVCS budget in addition to other safety caps.
        // ---------------------------------------------------------------------
        let para14aBinding = false;
        // §14a begrenzt ausschließlich den netzwirksamen Anteil. Das zentral
        // ermittelte physikalische PV-Budget darf zusätzlich genutzt werden.
        // `pvPhysicalCapW` beschreibt dabei das gesamte verfügbare lokale
        // PV-Potential für flexible Verbraucher, nicht nur einen Einzelgrant.
        const para14aLocalPvAllowanceW = (typeof pvPhysicalCapW === 'number' && Number.isFinite(pvPhysicalCapW))
            ? Math.max(0, Number(pvPhysicalCapW))
            : 0;
        const para14aEvcsAllowanceW = (para14aActive && typeof para14aTotalCapW === 'number' && Number.isFinite(para14aTotalCapW) && para14aTotalCapW > 0)
            ? Math.max(0, Number(para14aTotalCapW)) + para14aLocalPvAllowanceW
            : null;
        if (para14aEvcsAllowanceW !== null) {
            const before = budgetW;
            if (!Number.isFinite(budgetW)) {
                budgetW = para14aEvcsAllowanceW;
            } else {
                budgetW = Math.min(budgetW, para14aEvcsAllowanceW);
            }
            para14aBinding = (before !== budgetW);

            if (!String(effectiveBudgetMode || '').includes('14a')) {
                effectiveBudgetMode = `${effectiveBudgetMode}+14a`;
            }
        }

        /**
         * TS-Migration 0.7.123: Budget-Caps produktiv über TypeScript übernehmen.
         *
         * Wichtig:
         * - Der TS-Helfer darf nur Grid-/Phasen-/§14a-Caps übernehmen.
         * - Ladepunktverteilung, Failsafe, Boost und Setpoint-Schreiben bleiben weiterhin JavaScript.
         * - Merksatz für die Migration: Ladepunktverteilung und Setpoint-Schreiben bleiben weiterhin JavaScript.
         * - Ladepunktverteilung, Failsafe, Boost und Setpoint-Schreiben bleiben JS.
         * - PV-/Min+PV-Logik und Wallbox-Verteilung bleiben ebenfalls JS.
         * - Bei Mismatch/Fehler bleibt JS führend.
         */
        const chargingBudgetTsProductive = await this._runChargingBudgetTsProductive({
            budgetW: Number.isFinite(budgetBeforeGridCaps) ? budgetBeforeGridCaps : null,
            budgetMode: budgetModeBeforeGridCaps,
            gridBaseLoadRawW: (typeof gridBaseLoadRawW === 'number' && Number.isFinite(gridBaseLoadRawW)) ? gridBaseLoadRawW : null,
            gridLocalSupportW: (typeof gridLocalSupportW === 'number' && Number.isFinite(gridLocalSupportW)) ? gridLocalSupportW : null,
            gridCapEvcsW: (typeof gridCapEvcsW === 'number' && Number.isFinite(gridCapEvcsW)) ? gridCapEvcsW : null,
            // For TS parity this flag means 'cap is active/available'; the returned apply.gridCapBinding still means 'actually binding'.
            gridCapBinding: (gridImportLimitPlanningW > 0 && typeof gridCapEvcsW === 'number' && Number.isFinite(gridCapEvcsW)),
            phaseCapEvcsW: (typeof phaseCapEvcsW === 'number' && Number.isFinite(phaseCapEvcsW)) ? phaseCapEvcsW : null,
            // For TS parity this flag means 'cap is active/available'; the returned apply.phaseCapBinding still means 'actually binding'.
            phaseCapBinding: (gridMaxPhaseA > 0 && typeof phaseCapEvcsW === 'number' && Number.isFinite(phaseCapEvcsW)),
            para14aActive: !!para14aActive,
            // Der TS-Cap-Helfer erhält die bereits rechtssicher zusammengesetzte
            // Gesamtfreigabe aus §14a-Netzanteil plus lokalem PV-Anteil.
            para14aTotalCapW: (typeof para14aEvcsAllowanceW === 'number' && Number.isFinite(para14aEvcsAllowanceW)) ? para14aEvcsAllowanceW : null,
            para14aMode: para14aMode || '',
        }, {
            budgetAfterW: Number.isFinite(budgetW) ? Math.round(budgetW) : null,
            effectiveBudgetMode: String(effectiveBudgetMode || ''),
            gridCapApplied: !!gridCapBudgetApplied,
            phaseCapApplied: !!phaseCapBinding,
            para14aApplied: !!para14aBinding,
        });
        if (chargingBudgetTsProductive && chargingBudgetTsProductive.productive && chargingBudgetTsProductive.apply) {
            const tsApply = chargingBudgetTsProductive.apply;
            budgetW = (typeof tsApply.budgetW === 'number' && Number.isFinite(tsApply.budgetW)) ? tsApply.budgetW : Number.POSITIVE_INFINITY;
            effectiveBudgetMode = String(tsApply.effectiveBudgetMode || effectiveBudgetMode || 'unlimited');
            gridCapBudgetApplied = !!tsApply.gridCapBinding;
            phaseCapBinding = !!tsApply.phaseCapBinding;
            para14aBinding = !!tsApply.para14aBinding;
            if (typeof tsApply.gridCapEvcsW === 'number' && Number.isFinite(tsApply.gridCapEvcsW)) gridCapEvcsW = tsApply.gridCapEvcsW;
            if (typeof tsApply.phaseCapEvcsW === 'number' && Number.isFinite(tsApply.phaseCapEvcsW)) phaseCapEvcsW = tsApply.phaseCapEvcsW;
            if (budgetDebug && typeof budgetDebug === 'object') {
                budgetDebug.tsBudgetProductive = true;
                budgetDebug.tsBudgetSource = 'ts-budget-productive';
                budgetDebug.tsBudgetFallback = false;
                budgetDebug.budgetAfterSafetyCapsW = Number.isFinite(budgetW) ? budgetW : null;
            }
        } else if (budgetDebug && typeof budgetDebug === 'object') {
            budgetDebug.tsBudgetProductive = false;
            budgetDebug.tsBudgetSource = 'js-runtime';
            budgetDebug.tsBudgetFallback = true;
            budgetDebug.tsBudgetFallbackReason = chargingBudgetTsProductive && chargingBudgetTsProductive.fallbackReason ? chargingBudgetTsProductive.fallbackReason : 'unknown';
        }

        // Publish cap diagnostics (even when caps are not configured)
        try {
            await this._queueState('chargingManagement.control.gridImportLimitW', gridImportLimitW || 0, true);
            await this._queueState('chargingManagement.control.gridImportLimitW_effective', gridImportLimitEffW || 0, true);
            await this._queueState('chargingManagement.control.gridImportLimitW_planning', gridImportLimitPlanningW || 0, true);
            await this._queueState('chargingManagement.control.gridImportStage', gridImportStage, true);
            await this._queueState('chargingManagement.control.gridImportW', (typeof gridW === 'number' && Number.isFinite(gridW)) ? gridW : 0, true);
            await this._queueState('chargingManagement.control.gridBaseLoadW', (typeof gridBaseLoadW === 'number' && Number.isFinite(gridBaseLoadW)) ? gridBaseLoadW : 0, true);
            await this._queueState('chargingManagement.control.gridBaseLoadRawW', (typeof gridBaseLoadRawW === 'number' && Number.isFinite(gridBaseLoadRawW)) ? gridBaseLoadRawW : 0, true);
            await this._queueState('chargingManagement.control.gridLocalSupportW', (typeof gridLocalSupportW === 'number' && Number.isFinite(gridLocalSupportW)) ? gridLocalSupportW : 0, true);
            await this._queueState('chargingManagement.control.gridEvcsActualForCapW', (typeof totalFreshActualPowerW === 'number' && Number.isFinite(totalFreshActualPowerW)) ? totalFreshActualPowerW : 0, true);
            await this._queueState('chargingManagement.control.gridEvcsReserveIgnoredForCapW', Math.max(0, (Number.isFinite(totalPowerW) ? totalPowerW : 0) - (Number.isFinite(totalFreshActualPowerW) ? totalFreshActualPowerW : 0)), true);
            await this._queueState('chargingManagement.control.gridCapEvcsW', (typeof gridCapEvcsW === 'number' && Number.isFinite(gridCapEvcsW)) ? gridCapEvcsW : 0, true);
            await this._queueState('chargingManagement.control.gridCapBinding', false, true);
            await this._queueState('chargingManagement.control.gridCapMonitoring', gridImportLimitEffW > 0, true);
            await this._queueState('chargingManagement.control.gridMeasurementSource', String(gridMeasurementSourceForGate || ''), true);
            await this._queueState('chargingManagement.control.gridHardHeadroomRawW', (typeof gridHardHeadroomRawW === 'number' && Number.isFinite(gridHardHeadroomRawW)) ? gridHardHeadroomRawW : 0, true);
            await this._queueState('chargingManagement.control.gridProgressiveIncrementW', (typeof gridIncrementHeadroomW === 'number' && Number.isFinite(gridIncrementHeadroomW)) ? gridIncrementHeadroomW : 0, true);
            await this._queueState('chargingManagement.control.gridSoftRampFactor', Number.isFinite(Number(gridSoftRampFactor)) ? Number(gridSoftRampFactor) : 1, true);
            await this._queueState('chargingManagement.control.offlineReserveW', Math.max(0, Number(offlineReserveW) || 0), true);
            await this._queueState('chargingManagement.control.gridDemandRequestedW', Math.round(gridDemandRequestedW), true);
            await this._queueState('chargingManagement.control.gridAllowedDemandW', Math.round(gridAllowedDemandW), true);
            await this._queueState('chargingManagement.control.gridReductionW', 0, true);
            await this._queueState('chargingManagement.control.infrastructureRawCapacityW', Math.round(Math.max(0, Number(cfg.infrastructureRawCapacityW) || 0)), true);
            await this._queueState('chargingManagement.control.infrastructureCapacityW', Math.round(Math.max(0, Number(cfg.infrastructureCapacityW ?? staticBudgetW) || 0)), true);
            await this._queueState('chargingManagement.control.infrastructureWallboxCount', Math.round(Math.max(0, Number(cfg.infrastructureWallboxCount) || 0)), true);
            await this._queueState('chargingManagement.control.infrastructureHardCapW', Math.round(Math.max(0, Number(cfg.infrastructureHardCapW) || 0)), true);
            await this._queueState('chargingManagement.control.gridMaxPhaseA', gridMaxPhaseA || 0, true);
            await this._queueState('chargingManagement.control.gridWorstPhaseA', (typeof worstPhaseA === 'number' && Number.isFinite(worstPhaseA)) ? worstPhaseA : 0, true);
            await this._queueState('chargingManagement.control.gridPhaseCapEvcsW', (typeof phaseCapEvcsW === 'number' && Number.isFinite(phaseCapEvcsW)) ? phaseCapEvcsW : 0, true);
            await this._queueState('chargingManagement.control.phaseCapBinding', !!phaseCapBinding, true);

            // §14a transparency
            await this._queueState('chargingManagement.control.para14aActive', !!para14aActive, true);
            await this._queueState('chargingManagement.control.para14aMode', para14aMode || '', true);
            await this._queueState('chargingManagement.control.para14aCapEvcsW', (typeof para14aTotalCapW === 'number' && Number.isFinite(para14aTotalCapW)) ? para14aTotalCapW : 0, true);
            await this._queueState('chargingManagement.control.para14aBinding', !!para14aBinding, true);
        } catch {
            // ignore
        }

        // Extend debug payload
        if (budgetDebug && typeof budgetDebug === 'object') {
            budgetDebug.gridImportLimitW = gridImportLimitW || 0;
            budgetDebug.gridImportLimitEffW = gridImportLimitEffW || 0;
            budgetDebug.gridImportLimitPlanningW = gridImportLimitPlanningW || 0;
            budgetDebug.gridImportStage = gridImportStage;
            budgetDebug.gridW = (typeof gridW === 'number' && Number.isFinite(gridW)) ? gridW : null;
            // 0.8.64: EVCS-Ist darf nie aus Reservierung/Setpoint kommen.
            // Für Gate-/Statusdiagnose ist ausschließlich der frische Messwert gültig;
            // Reservierung bleibt separat als totalReservedPowerW sichtbar.
            // 0.8.65: Die finale EVCS-Reservierung wird nach der Allocation aus aktivem Ladebedarf gesetzt.
            budgetDebug.evcsActualW = (typeof totalFreshActualPowerW === 'number' && Number.isFinite(totalFreshActualPowerW)) ? totalFreshActualPowerW : 0;
            budgetDebug.evcsPotentialReservedW = (typeof totalPowerW === 'number' && Number.isFinite(totalPowerW)) ? totalPowerW : 0;
            budgetDebug.gridBaseLoadW = (typeof gridBaseLoadW === 'number' && Number.isFinite(gridBaseLoadW)) ? gridBaseLoadW : null;
            budgetDebug.gridBaseLoadRawW = (typeof gridBaseLoadRawW === 'number' && Number.isFinite(gridBaseLoadRawW)) ? gridBaseLoadRawW : null;
            budgetDebug.gridLocalSupportW = (typeof gridLocalSupportW === 'number' && Number.isFinite(gridLocalSupportW)) ? gridLocalSupportW : null;
            budgetDebug.gridIncrementHeadroomW = (typeof gridIncrementHeadroomW === 'number' && Number.isFinite(gridIncrementHeadroomW)) ? gridIncrementHeadroomW : null;
            budgetDebug.gridCapEvcsW = (typeof gridCapEvcsW === 'number' && Number.isFinite(gridCapEvcsW)) ? gridCapEvcsW : null;
            budgetDebug.gridCapBudgetApplied = !!gridCapBudgetApplied;
            budgetDebug.gridCapBinding = false;
            budgetDebug.infrastructureRawCapacityW = Math.round(Math.max(0, Number(cfg.infrastructureRawCapacityW) || 0));
            budgetDebug.infrastructureCapacityW = Math.round(Math.max(0, Number(cfg.infrastructureCapacityW ?? staticBudgetW) || 0));
            budgetDebug.infrastructureWallboxCount = Math.round(Math.max(0, Number(cfg.infrastructureWallboxCount) || 0));
            budgetDebug.infrastructureHardCapW = Math.round(Math.max(0, Number(cfg.infrastructureHardCapW) || 0));
            budgetDebug.gridMaxPhaseA = gridMaxPhaseA || 0;
            budgetDebug.worstPhaseA = (typeof worstPhaseA === 'number' && Number.isFinite(worstPhaseA)) ? worstPhaseA : null;
            budgetDebug.phaseCapEvcsW = (typeof phaseCapEvcsW === 'number' && Number.isFinite(phaseCapEvcsW)) ? phaseCapEvcsW : null;
            budgetDebug.phaseCapBinding = !!phaseCapBinding;
            budgetDebug.para14aActive = !!para14aActive;
            budgetDebug.para14aMode = para14aMode || '';
            budgetDebug.para14aCapEvcsW = (typeof para14aTotalCapW === 'number' && Number.isFinite(para14aTotalCapW)) ? para14aTotalCapW : null;
            budgetDebug.para14aLocalPvAllowanceW = Math.round(para14aLocalPvAllowanceW);
            budgetDebug.para14aTotalAllowanceW = (typeof para14aEvcsAllowanceW === 'number' && Number.isFinite(para14aEvcsAllowanceW)) ? Math.round(para14aEvcsAllowanceW) : null;
            budgetDebug.para14aBinding = !!para14aBinding;
            budgetDebug.budgetBeforeSafetyCapsW = Number.isFinite(budgetBeforeGridCaps) ? budgetBeforeGridCaps : null;
            budgetDebug.budgetAfterSafetyCapsW = Number.isFinite(budgetW) ? budgetW : null;
        }

        const peakActive = await this._getPeakShavingActive();
        const pausedByPeakShaving = pauseWhenPeakShavingActive && peakActive;
        let pauseFollowPeakBudget = false;
        let pauseFollowGridCaps = false;

        // Gate C: Speicher-Unterstützung (optional)
        // Ziel: Bei hohem Speicher-SoC kann zusätzliche Ladeleistung durch Batterie-Entladung bereitgestellt werden,
        // ohne den Netzanschluss (Import-Limit) zu überlasten. Die Entladung wird über das Storage-Control-Modul umgesetzt.
        // Fahrzeug-SoC und stationaerer Speicher-SoC bleiben strikt getrennt.
        // Dieser Block nutzt den stationaeren SoC ausschliesslich fuer die optionale
        // Speicherunterstuetzung der EVCS. Ziel-/Zeitladen liest weiterhin nur den
        // Fahrzeug-SoC des jeweiligen Ladepunkts.
        let storageTopology = 'none';
        let storageSoC = null;
        let storageSocSource = '';
        let storageSocAgeMs = null;
        let storageSocFresh = false;
        let storageAvailableDischargeW = 0;
        let storagePowerSource = '';
        let storagePowerAgeMs = null;
        let storagePowerFresh = false;
        const storageAssistFreshMs = Math.max(5000, Number(staleTimeoutMs) || 15000);

        try {
            const topologyState = await this._getStateCached('speicher.regelung.topologie');
            storageTopology = String(topologyState && topologyState.val || 'none').trim().toLowerCase();
            if (!['farm', 'single'].includes(storageTopology)) storageTopology = 'none';

            if (storageTopology === 'farm') {
                const socState = await this._getStateCached('storageFarm.totalSocOnline');
                const powerState = await this._getStateCached('storageFarm.availableDischargePowerW');
                const socValue = socState ? Number(socState.val) : NaN;
                const powerUnlimited = !!(powerState && powerState.val === null);
                const powerValue = powerState && !powerUnlimited ? Number(powerState.val) : NaN;
                storageSocAgeMs = socState && Number.isFinite(Number(socState.ts)) ? Math.max(0, now - Number(socState.ts)) : null;
                storagePowerAgeMs = powerState && Number.isFinite(Number(powerState.ts)) ? Math.max(0, now - Number(powerState.ts)) : null;
                storageSocFresh = Number.isFinite(socValue) && storageSocAgeMs !== null && storageSocAgeMs <= storageAssistFreshMs;
                storagePowerFresh = (powerUnlimited || (Number.isFinite(powerValue) && powerValue >= 0))
                    && storagePowerAgeMs !== null
                    && storagePowerAgeMs <= storageAssistFreshMs;
                storageSoC = storageSocFresh ? socValue : null;
                // `null` ist im Farmvertrag kein fehlender Wert, sondern bedeutet
                // "kein festes Farm-Limit". Intern bleibt das unlimitiert; die
                // explizite EVCS-Speicherassistenzgrenze begrenzt weiterhin hart.
                storageAvailableDischargeW = storagePowerFresh
                    ? (powerUnlimited ? Number.POSITIVE_INFINITY : Math.max(0, powerValue))
                    : 0;
                storageSocSource = 'storageFarm.totalSocOnline';
                storagePowerSource = powerUnlimited
                    ? 'storageFarm.availableDischargePowerW:unlimited'
                    : 'storageFarm.availableDischargePowerW';
            } else if (storageTopology === 'single') {
                const socValue = getFirstDpNumber(['st.socPct']);
                const socAge = (this.dp && typeof this.dp.getAgeMs === 'function') ? this.dp.getAgeMs('st.socPct') : null;
                storageSocAgeMs = Number.isFinite(Number(socAge)) ? Math.max(0, Math.round(Number(socAge))) : null;
                storageSocFresh = Number.isFinite(Number(socValue)) && (storageSocAgeMs === null || storageSocAgeMs <= storageAssistFreshMs);
                storageSoC = storageSocFresh ? Number(socValue) : null;

                const limitState = await this._getStateCached('speicher.regelung.maxDischargeW');
                const stateLimitW = limitState ? Number(limitState.val) : NaN;
                const stateLimitAgeMs = limitState && Number.isFinite(Number(limitState.ts)) ? Math.max(0, now - Number(limitState.ts)) : null;
                const storageCfg = this.adapter && this.adapter.config && this.adapter.config.storageControl && typeof this.adapter.config.storageControl === 'object'
                    ? this.adapter.config.storageControl
                    : (this.adapter && this.adapter.config && this.adapter.config.storage && typeof this.adapter.config.storage === 'object'
                        ? this.adapter.config.storage
                        : {});
                const cfgLimitW = Math.max(0, num(storageCfg.maxDischargeW, 0));
                const hasFreshStateLimit = Number.isFinite(stateLimitW)
                    && stateLimitW >= 0
                    && (stateLimitAgeMs === null || stateLimitAgeMs <= storageAssistFreshMs);
                const selectedLimitW = hasFreshStateLimit ? stateLimitW : cfgLimitW;

                // Im Speicherregler bedeutet 0 bewusst "kein Software-Clamp".
                // Die EVCS-Unterstuetzung bleibt dennoch durch
                // storageAssistMaxDischargeW hart begrenzt.
                storageAvailableDischargeW = selectedLimitW > 0 ? selectedLimitW : Number.POSITIVE_INFINITY;
                storagePowerFresh = hasFreshStateLimit || cfgLimitW >= 0;
                storagePowerAgeMs = hasFreshStateLimit ? stateLimitAgeMs : 0;
                storageSocSource = 'st.socPct';
                storagePowerSource = hasFreshStateLimit
                    ? 'speicher.regelung.maxDischargeW'
                    : (cfgLimitW > 0 ? 'config.storageControl.maxDischargeW' : 'single-storage:unlimited');
            }
        } catch (_eTopology) {
            storageTopology = 'none';
            storageSoC = null;
            storageSocFresh = false;
            storagePowerFresh = false;
            storageAvailableDischargeW = 0;
        }

        let storageAssistW = 0; // Request an die Speicherregelung; kein EVCS-Budget vor Write-Akzeptanz.
        let storageAssistAcceptedW = 0;
        let storageAssistAcceptedDiag = resolveAcceptedStorageAssistBudget({ requestedW: 0 });
        let storageAssistActive = false;
        let storagePolicyGlobalBlocker = '';
        const budgetBeforeStorageAssistW = Number.isFinite(budgetW) ? Math.max(0, budgetW) : budgetW;

        try {
            const saEnabled = cfg.storageAssistEnabled === true;
            const saApply = (typeof cfg.storageAssistApply === 'string') ? cfg.storageAssistApply : 'boostOnly';
            const startSoc = clamp(num(cfg.storageAssistStartSocPct, 60), 0, 100);
            const stopSoc = clamp(num(cfg.storageAssistStopSocPct, 40), 0, 100);

            const maxW_cfg = num(cfg.storageAssistMaxDischargeW, 0);
            const topologyAvailableUnlimited = storageAvailableDischargeW === Number.POSITIVE_INFINITY;
            const topologyAvailableW = Number.isFinite(Number(storageAvailableDischargeW)) ? Math.max(0, Number(storageAvailableDischargeW)) : 0;
            const maxW = (Number.isFinite(maxW_cfg) && maxW_cfg > 0)
                ? (topologyAvailableUnlimited ? maxW_cfg : (topologyAvailableW > 0 ? Math.min(maxW_cfg, topologyAvailableW) : 0))
                : topologyAvailableW;

            const storageAssistWallboxes = wbList.filter(w => w && w.controlAvailable && w.storageAssistRequested === true);
            const anyStorageAssistRequested = storageAssistWallboxes.length > 0;
            const anyStorageBoostActive = storageAssistWallboxes.some(w => String(w.effectiveMode || '').toLowerCase() === 'boost');
            const anyGridAllowedStorageActive = storageAssistWallboxes.some(w => ['normal', 'boost', 'minpv'].includes(String(w.effectiveMode || '').toLowerCase()));
            const allowByMode = (saApply === 'boostAndAuto') ? anyStorageAssistRequested : anyStorageBoostActive;

            if (!anyStorageAssistRequested) storagePolicyGlobalBlocker = 'no-wallbox-request';
            else if (!saEnabled) storagePolicyGlobalBlocker = 'storage-assist-disabled';
            else if (!allowByMode) storagePolicyGlobalBlocker = 'mode-not-allowed';
            else if (!anyGridAllowedStorageActive) storagePolicyGlobalBlocker = 'mode-pv-only';
            else if (storageTopology === 'none') storagePolicyGlobalBlocker = 'no-stationary-storage-topology';
            else if (!storageSocFresh) storagePolicyGlobalBlocker = 'stationary-storage-soc-stale';
            else if (!storagePowerFresh) storagePolicyGlobalBlocker = 'stationary-storage-discharge-cap-stale';
            else if (!dischargeAllowed) storagePolicyGlobalBlocker = 'discharge-not-allowed';
            else if (pausedByPeakShaving) storagePolicyGlobalBlocker = 'paused-by-peak-shaving';
            else if (!(maxW > 0)) storagePolicyGlobalBlocker = 'no-storage-discharge-limit';
            else if (!Number.isFinite(storageSoC)) storagePolicyGlobalBlocker = 'storage-soc-unavailable';
            else storagePolicyGlobalBlocker = '';

            if (!storagePolicyGlobalBlocker) {
                // Hysterese: Start/Stop-Schwellen vermeiden Flattern.
                if (this._storageAssistActive) {
                    if (storageSoC <= stopSoc) this._storageAssistActive = false;
                } else if (storageSoC >= startSoc) {
                    this._storageAssistActive = true;
                }
            } else {
                this._storageAssistActive = false;
            }

            storageAssistActive = !!this._storageAssistActive;
            if (!storageAssistActive && !storagePolicyGlobalBlocker && Number.isFinite(storageSoC)) {
                storagePolicyGlobalBlocker = storageSoC < startSoc ? 'storage-soc-low' : 'storage-assist-idle';
            }

            // Bei Nulleinspeisung darf auch die einzelne LP-Netzgrenze Unterstützung
            // anfordern. Min+PV benötigt Speicher nur für seine Mindestleistung;
            // Boost/Ziel-/Tarifladen dürfen darüber hinaus freigegebene Leistung nutzen.
            // Dies ist ausschließlich ein Request, noch keine gelieferte Energie.
            let zeroLpShortfallW = 0;
            let zeroRequestEligibleActualW = 0;
            let requestPvRemainingW = Math.max(0, Number(pvPhysicalCapW) || 0);
            for (const w of storageAssistWallboxes) {
                const eff = String(w.effectiveMode || '').toLowerCase();
                if (typeof w.zeroExportGridMaxW !== 'number' || !['normal', 'boost', 'minpv'].includes(eff)
                    || (saApply !== 'boostAndAuto' && eff !== 'boost')
                    || !(w.vehicleDemandConfirmed || w.vehicleStartEligible || w.actualPowerW > 100)) continue;
                const desiredW = Math.max(0, (eff === 'minpv' ? zeroExportStorageMinimumW(w) : w.maxPW) - w.zeroExportGridMaxW);
                const pvPartW = Math.min(requestPvRemainingW, desiredW);
                requestPvRemainingW -= pvPartW;
                zeroLpShortfallW += desiredW - pvPartW;
                if (desiredW > 0 && !w.meterStale) zeroRequestEligibleActualW += Math.max(0, Number(w.actualPowerW) || 0);
            }
            // Der Speicherwriter versteht den Request als GESAMTE Entladung.
            // Hausbedarf muss deshalb mit angefordert werden, bevor der danach
            // verbleibende Anteil am LP helfen kann. Dies erweitert keinen Grant:
            // akzeptierte und gemessene Energie werden später separat nachgewiesen.
            let zeroHouseSupportRequestW = 0;
            if (zeroLpShortfallW > 0) {
                const sample = this.adapter?._zeroExportPvCoordinator?.sample;
                const flow = this.adapter?._nwResolveBatteryFlowFromCache?.({ now, maxAgeMs: 5000, strictStale: true, deadbandW: 0 });
                if (sample?.gridFresh && sample.storageFresh && now >= sample.now && now - sample.now <= 5000
                    && Number.isFinite(sample.gridW) && flow?.derived === false && Number.isFinite(flow.dischargeW)) {
                    zeroHouseSupportRequestW = Math.max(0, sample.gridW + Math.max(0, flow.dischargeW) - zeroRequestEligibleActualW);
                }
            }
            // Request nur bilden, wenn Netz-/Phasen-/LP-Limit tatsächlich bindet. Er
            // wird im folgenden Speicher-Tick durch Policy, SoC und Gates geprueft.
            if (storageAssistActive && (gridCapBudgetApplied || phaseCapBinding || zeroLpShortfallW > 0) && maxW > 0) {
                const siteExtra = gridCapBudgetApplied || phaseCapBinding
                    ? (Number.isFinite(budgetBeforeGridCaps) ? Math.max(0, budgetBeforeGridCaps - budgetW) : maxW) : 0;
                const desiredExtra = Math.max(siteExtra, zeroLpShortfallW + zeroHouseSupportRequestW);
                storageAssistW = clamp(Math.min(maxW, desiredExtra), 0, maxW);
                if (!(storageAssistW > 0) && !storagePolicyGlobalBlocker) storagePolicyGlobalBlocker = 'no-storage-budget-needed';
            } else if (storageAssistActive && !(gridCapBudgetApplied || phaseCapBinding || zeroLpShortfallW > 0) && !storagePolicyGlobalBlocker) {
                storagePolicyGlobalBlocker = 'no-grid-or-phase-cap';
            }

            // Das EVCS-Budget wird ausschliesslich mit einer frischen, vom aktiven
            // Speicherwriter akzeptierten EVCS-Entladung erhoeht. Der erste Tick
            // stellt nur den Request; fruehestens im Folgetick entsteht Zusatzbudget.
            const acceptedWState = await this._getStateCached('speicher.regelung.evcsAssistAcceptedW');
            const acceptedTsState = await this._getStateCached('speicher.regelung.evcsAssistAcceptedTs');
            const acceptedTopologyState = await this._getStateCached('speicher.regelung.evcsAssistAcceptedTopology');
            const acceptedSourceState = await this._getStateCached('speicher.regelung.evcsAssistAcceptedSource');
            const commandEffectiveState = await this._getStateCached('speicher.regelung.commandEffective');
            storageAssistAcceptedDiag = resolveAcceptedStorageAssistBudget({
                now,
                requestedW: storageAssistW,
                acceptedW: acceptedWState ? acceptedWState.val : 0,
                acceptedTs: acceptedTsState ? acceptedTsState.val : 0,
                acceptedTopology: acceptedTopologyState ? acceptedTopologyState.val : '',
                acceptedSource: acceptedSourceState ? acceptedSourceState.val : '',
                requestedTopology: storageTopology,
                commandEffective: commandEffectiveState && commandEffectiveState.val === true,
                maxAgeMs: storageAssistFreshMs,
            });
            storageAssistAcceptedW = storageAssistAcceptedDiag.acceptedW;

            // Bei Nulleinspeisung enthält das signierte NVP-Gesamtbudget bereits
            // die GEMESSENE Entladung. Sie nochmals zu addieren wäre Doppelzählung.
            if (!zeroExportChargingActive && storageAssistAcceptedW > 0 && Number.isFinite(budgetW)) {
                budgetW += storageAssistAcceptedW;
                if (!String(effectiveBudgetMode || '').includes('storageAssistAccepted')) {
                    effectiveBudgetMode = `${effectiveBudgetMode}+storageAssistAccepted`;
                }
            } else if (!(storageAssistAcceptedW > 0) && storageAssistW > 0 && !storagePolicyGlobalBlocker) {
                storagePolicyGlobalBlocker = storageAssistAcceptedDiag.status;
            }
        } catch (_e) {
            this._storageAssistActive = false;
            storageAssistW = 0;
            storageAssistAcceptedW = 0;
            storageAssistActive = false;
            storagePolicyGlobalBlocker = 'runtime-error';
            storageAssistAcceptedDiag = resolveAcceptedStorageAssistBudget({ requestedW: 0, now });
        }

        try {
            for (const w of wbList) {
                const effectiveStorageAssist = !!(storageAssistAcceptedW > 0 && w.storageAssistRequested === true);
                let storageReason = '';
                if (!w.storageAssistCustomerAllowed) storageReason = 'normal-self-consumption';
                else if (w.storageProtectionRequested) storageReason = 'storage-protected';
                else if (!w.userStorageAssistEnabled) storageReason = 'normal-self-consumption';
                else if (effectiveStorageAssist) storageReason = 'accepted';
                else storageReason = storagePolicyGlobalBlocker || storageAssistAcceptedDiag.status || 'not-active';
                w.effectiveStorageAssist = effectiveStorageAssist;
                w.storageAssistBlockedReason = storageReason;
                w.batteryContributionW = 0;
                await this._queueState(`${w.ch}.effectiveStorageAssist`, effectiveStorageAssist, true);
                await this._queueState(`${w.ch}.storageAssistBlockedReason`, storageReason, true);
                await this._queueState(`${w.ch}.batteryContributionW`, 0, true);
            }
        } catch {
            // ignore
        }

        // Finaler Same-cycle Stand; persistente States darunter bleiben Diagnose/Fallback.
        // Speicherleistung bleibt eine eigene Quelle. Die feste anteilige
        // Zuordnung nach frischer Istlast verhindert Mehrfachzuteilung sowie eine
        // vorzeitige Freigabe während des Herunterregelns eines anderen LP.
        const zeroStoragePoints = zeroExportChargingActive ? wbList.filter(w => w.controlAvailable
            && w.effectiveStorageAssist && typeof w.zeroExportGridMaxW === 'number'
            && (cfg.storageAssistApply === 'boostAndAuto' || w.effectiveMode === 'boost')
            && ['normal', 'boost', 'minpv'].includes(String(w.effectiveMode))
            && (w.effectiveMode === 'minpv' ? zeroExportStorageMinimumW(w) : w.maxPW) > w.zeroExportGridMaxW) : [];
        const zeroStorageProof = { sample: this.adapter?._zeroExportPvCoordinator?.sample,
            budget: this.adapter?._emsBudget, topology: storageTopology, requestedW: storageAssistW,
            points: zeroStoragePoints, otherPoints: wbList.filter(w => !zeroStoragePoints.includes(w)) };
        const zeroStoragePoolW = this._zeroExportStoragePoolW(zeroStorageProof);
        const zeroStorageActualW = zeroStoragePoints.reduce((sum, w) => sum + Math.max(0, Number(w.actualPowerW) || 0), 0);
        for (const w of wbList) {
            const fraction = zeroStoragePoints.includes(w) && zeroStorageActualW > 0
                ? Math.max(0, Number(w.actualPowerW) || 0) / zeroStorageActualW : 0;
            w.zeroExportStorageFraction = fraction;
            w.zeroExportStorageProof = fraction > 0 ? zeroStorageProof : null;
            w.zeroExportStorageCreditW = Math.min(zeroStoragePoolW * fraction,
                Math.max(0, (w.effectiveMode === 'minpv' ? zeroExportStorageMinimumW(w) : w.maxPW) - (w.zeroExportGridMaxW ?? w.maxPW)));
        }

        const completedStoragePolicy = {
            protectedLoadW: Math.max(0, Math.round(Number(storageProtectedLoadW || 0))),
            protectedWallboxes: Math.max(0, Math.round(Number(storageProtectedWallboxes || 0))),
            protectionRequestedWallboxes: storageProtectionRequestedWallboxes,
            protectedUnknownWallboxes: storageProtectedUnknownWallboxes,
            assistRequestedLoadW: Math.max(0, Math.round(Number(storageAssistRequestedLoadW || 0))),
            complete: true, source: 'charging-runtime', sampledAt: now, ts: Date.now(),
        };
        publishEvStoragePolicyCaps(completedStoragePolicy);
        // One bounded snapshot, no history or new timer. Its embedded timestamp
        // cannot turn old watts into fresh measurements after adapter restart.
        try {
            await this._queueState('chargingManagement.control.storagePolicyJson', JSON.stringify(completedStoragePolicy), true);
            await this._queueState('chargingManagement.control.storageProtectionRequestedWallboxes', storageProtectionRequestedWallboxes, true);
            await this._queueState('chargingManagement.control.storageProtectedUnknownWallboxes', storageProtectedUnknownWallboxes, true);
        } catch { /* runtime snapshot remains authoritative if diagnostic persistence fails */ }

        // Publish diagnostics for UI. `storageAssistW` bleibt der Request an die
        // Speicherregelung; nur `storageAssistAcceptedW` darf das Ladebudget erhoehen.
        try {
            await this._queueState('chargingManagement.control.storageAssistSoCPct', Number.isFinite(storageSoC) ? storageSoC : null, true);
            await this._queueState('chargingManagement.control.storageAssistTopology', storageTopology, true);
            await this._queueState('chargingManagement.control.storageAssistSocSource', storageSocSource, true);
            await this._queueState('chargingManagement.control.storageAssistSocAgeMs', storageSocAgeMs, true);
            await this._queueState('chargingManagement.control.storageAssistSocFresh', !!storageSocFresh, true);
            await this._queueState(
                'chargingManagement.control.storageAssistAvailableDischargeW',
                storageAvailableDischargeW === Number.POSITIVE_INFINITY ? null : Math.max(0, Math.round(Number(storageAvailableDischargeW) || 0)),
                true,
            );
            await this._queueState('chargingManagement.control.storageAssistPowerSource', storagePowerSource, true);
            await this._queueState('chargingManagement.control.storageAssistPowerAgeMs', storagePowerAgeMs, true);
            await this._queueState('chargingManagement.control.storageAssistPowerFresh', !!storagePowerFresh, true);
            await this._queueState('chargingManagement.control.storageAssistActive', !!storageAssistActive, true);
            await this._queueState('chargingManagement.control.storageAssistW', Math.round(storageAssistW), true);
            await this._queueState('chargingManagement.control.storageAssistRequestedW', Math.round(storageAssistW), true);
            await this._queueState('chargingManagement.control.storageAssistAcceptedW', Math.round(storageAssistAcceptedW), true);
            await this._queueState('chargingManagement.control.storageAssistAcceptedRawW', Math.round(storageAssistAcceptedDiag.acceptedRawW || 0), true);
            await this._queueState('chargingManagement.control.storageAssistAcceptedTs', Math.round(storageAssistAcceptedDiag.acceptedTs || 0), true);
            await this._queueState('chargingManagement.control.storageAssistAcceptedAgeMs', storageAssistAcceptedDiag.ageMs, true);
            await this._queueState('chargingManagement.control.storageAssistAcceptedFresh', !!storageAssistAcceptedDiag.fresh, true);
            await this._queueState('chargingManagement.control.storageAssistAcceptedStatus', String(storageAssistAcceptedDiag.status || ''), true);
            await this._queueState('chargingManagement.control.storageProtectedLoadW', Math.max(0, Math.round(Number(storageProtectedLoadW || 0))), true);
            await this._queueState('chargingManagement.control.storageProtectedWallboxes', Math.max(0, Math.round(Number(storageProtectedWallboxes || 0))), true);
            await this._queueState('chargingManagement.control.storageProtectedLoadTs', now, true);
            await this._queueState('chargingManagement.control.storageAssistRequestedLoadW', Math.max(0, Math.round(Number(storageAssistRequestedLoadW || 0))), true);
        } catch {
            // ignore
        }

        // MU6.8: If metering/budget inputs are stale, enforce safe targets (0) to avoid overloading the grid connection.
        let staleMeter = false;
        let staleBudget = false;

        if (!this.dp) {
            staleMeter = true; // cannot validate inputs without DP registry
        } else {
            const gridKeys = ['cm.gridPowerW', 'grid.powerW', 'grid.powerRawW', 'ems.gridPowerW', 'ps.gridPowerW'];
            const configuredGridKeys = gridKeys.filter(k => !!this.dp.getEntry(k));

            const centralNvp = resolveCurrentNvpSnapshot(this.adapter && this.adapter._nvpFreshnessSnapshot, Date.now(), Math.max(staleTimeoutMs, 10000));
            if (centralNvp.current) {
                staleMeter = !centralNvp.usable;
            } else if (configuredGridKeys.length === 0) {
                staleMeter = true;
            } else {
                const connEntry = this.dp.getEntry('cm.gridConnected');
                const wdEntry = this.dp.getEntry('cm.gridWatchdog');
                const connectedRaw = connEntry ? this.dp.getRaw('cm.gridConnected') : null;
                const explicitlyDisconnected = connectedRaw === false || connectedRaw === 0 || connectedRaw === '0' || connectedRaw === 'false';

                let measurementFresh = false;
                let measurementPresent = false;
                for (const key of configuredGridKeys) {
                    const value = this.dp.getNumber(key, null);
                    if (typeof value === 'number' && Number.isFinite(value)) measurementPresent = true;
                    const age = typeof this.dp.getMeasurementAgeMs === 'function'
                        ? this.dp.getMeasurementAgeMs(key)
                        : this.dp.getAgeMs(key);
                    if (Number.isFinite(age) && age <= staleTimeoutMs) measurementFresh = true;
                }

                let watchdogFresh = false;
                if (wdEntry) {
                    const wdId = String(wdEntry.srcObjectId || wdEntry.objectId || '');
                    let watchdogAgeMs = Number.POSITIVE_INFINITY;
                    if (/lastSeenMs$/i.test(wdId)) {
                        const lastSeenMs = this.dp.getNumber('cm.gridWatchdog', null);
                        if (Number.isFinite(Number(lastSeenMs)) && Number(lastSeenMs) > 0) watchdogAgeMs = Math.max(0, Date.now() - Number(lastSeenMs));
                    } else {
                        const ages = [];
                        if (typeof this.dp.getMeasurementAgeMs === 'function') ages.push(this.dp.getMeasurementAgeMs('cm.gridWatchdog'));
                        else ages.push(this.dp.getAgeMs('cm.gridWatchdog'));
                        if (typeof this.dp.getAliveAgeMs === 'function') ages.push(this.dp.getAliveAgeMs('cm.gridWatchdog'));
                        const finiteAges = ages.filter((age) => Number.isFinite(age));
                        if (finiteAges.length) watchdogAgeMs = Math.min(...finiteAges);
                    }
                    watchdogFresh = Number.isFinite(watchdogAgeMs) && watchdogAgeMs <= staleTimeoutMs;
                }

                // Ein Heartbeat darf einen unveränderten Messwert bestätigen, aber
                // nur wenn überhaupt ein plausibler Messwert vorhanden ist. Ein
                // positives Connected-Signal allein reicht ausdrücklich nicht.
                staleMeter = explicitlyDisconnected || !(measurementFresh || (measurementPresent && watchdogFresh));
            }

            // Gate A: If a phase limit is configured, phase current metering must be present and fresh.
            if (!staleMeter && gridMaxPhaseA > 0) {
                const phaseKeys = ['ps.l1A', 'ps.l2A', 'ps.l3A'];
                const configuredPhaseKeys = phaseKeys.filter(k => !!this.dp.getEntry(k));
                // Bei dreiphasigem Anschluss sind alle drei Phasen Pflicht. Eine
                // einzelne frische Phase darf die beiden fehlenden nicht freigeben.
                if (configuredPhaseKeys.length !== phaseKeys.length) {
                    staleMeter = true;
                } else {
                    for (const k of phaseKeys) {
                        if (this.dp.isStale(k, staleTimeoutMs)) {
                            staleMeter = true;
                            break;
                        }
                    }
                }
            }

            // External budget datapoint (if used)
            if (!staleMeter && (budgetMode === 'fromDatapoint' || budgetMode === 'engine') && budgetPowerId && this.dp.getEntry('cm.budgetPowerW')) {
                staleBudget = this.dp.isStale('cm.budgetPowerW', staleTimeoutMs);
            }
        }

        // Peak-shaving-derived budget is a dynamic state; check ts/lc (if used)
        if (!staleMeter && !staleBudget && (budgetMode === 'fromPeakShaving' || budgetMode === 'engine')) {
            const psBudgetStale = await isStateStale('peakShaving.dynamic.availableForControlledW', staleTimeoutMs);
            // Only treat as relevant if peak shaving is active or the user explicitly uses fromPeakShaving.
            const psActive = peakActive;
            if (budgetMode === 'fromPeakShaving' || psActive) staleBudget = !!psBudgetStale;
        }

        // ---------------------------------------------------------------
        // STALE_METER policy
        // ---------------------------------------------------------------
        // The STALE_METER watchdog is meant as a *safety net* to prevent accidental
        // overload if the grid meter stops updating. However, in some environments
        // (aliases / event-driven meters / stable values) false positives can occur.
        //
        // To keep the EMS operational while we refine the watchdog, we support a
        // RC39: produktiv ausschließlich fail-closed. Warn-/Off-Modi bleiben
        // nicht mehr als Umgehung der Netzanschluss-Sicherheit wirksam.
        const failsafeEnabled = true;
        const stalePolicy = 'block';
        try { await this._queueState('chargingManagement.control.failsafeEnabled', true, true); } catch { /* diagnostics only */ }

        // Important: only trigger FAILSAFE on *meter* staleness.
        // Budget signals can stay constant for long periods and may be written "on change",
        // which would falsely trip a stale detector based on timestamps.
        const staleDetected = (mode !== 'off') && staleMeter;
        const staleBlocks = staleDetected && (stalePolicy === 'block');

        // Publish stale diagnostics for UI transparency (even when not in failsafe)
        try {
            let details = '';
            if (this.dp) {
                const parts = [];
                try {
                    const keys = ['cm.gridPowerW', 'grid.powerW', 'grid.powerRawW', 'ems.gridPowerW', 'ps.gridPowerW']
                        .filter(k => !!this.dp.getEntry(k));
                    if (keys.length) {
                        const ages = keys.map(k => {
                            const a = this.dp.getAgeMs(k);
                            const aTxt = (!Number.isFinite(a) || a === Number.POSITIVE_INFINITY) ? '∞' : String(Math.round(a / 1000));
                            return `${k}:${aTxt}s`;
                        });
                        parts.push(`grid=${ages.join(',')}`);
                    } else {
                        parts.push('grid=none');
                    }
                } catch (_e) {
                    // ignore
                }
                details = parts.join(' ');
            }
            await this._queueState('chargingManagement.control.staleMeter', !!staleMeter, true);
            await this._queueState('chargingManagement.control.staleBudget', !!staleBudget, true);
            // Keep the name for backwards compatibility with the UI.
            await this._queueState('chargingManagement.control.failsafeDetails', staleDetected ? details : '', true);
            await this._queueState('chargingManagement.control.failsafePolicy', String(stalePolicy || ''), true);
        } catch {
            // ignore
        }

        // Only enforce failsafe when policy == 'block'.
        if (staleBlocks) {
            const reason = ReasonCodes.STALE_METER;

            await this._queueState('chargingManagement.control.active', true, true);
            await this._queueState('chargingManagement.control.mode', mode, true);
            await this._queueState('chargingManagement.control.budgetMode', effectiveBudgetMode, true);
            await this._queueState('chargingManagement.control.pausedByPeakShaving', false, true);
            await this._queueState('chargingManagement.control.status', 'failsafe_stale_meter', true);
            await this._queueState('chargingManagement.control.budgetW', 0, true);
            await this._queueState('chargingManagement.control.usedW', 0, true);
            await this._queueState('chargingManagement.control.remainingW', 0, true);
            await this._queueState('chargingManagement.control.actualW', Math.max(0, Math.round(Number(totalFreshActualPowerW || 0))), true);
            await this._queueState('chargingManagement.control.reserveW', 0, true);
            await this._queueState('chargingManagement.control.activeDemandReserveW', 0, true);
            await this._queueState('chargingManagement.control.pvActiveDemandReserveW', 0, true);
            await this._queueState('chargingManagement.control.pvActiveDemandIntentW', 0, true);
            await this._queueState('chargingManagement.control.pvPendingDemandIntentW', 0, true);
            await this._queueState('chargingManagement.control.pvPendingDemandTotalW', 0, true);
            await this._queueState('chargingManagement.control.pvPendingDemandWallboxes', 0, true);
            await this._queueState('chargingManagement.control.activeDemandWallboxes', 0, true);

            // Phase 4.2: Even in failsafe, publish Gate A (Netz/Phasen) diagnostics so the
            // App-Center can show the configured grid limits. The control itself is still forced
            // to 0W/0A below.
            try {
                await this._queueState('chargingManagement.control.gridImportLimitW', (typeof gridImportLimitW === 'number' && Number.isFinite(gridImportLimitW)) ? gridImportLimitW : 0, true);
                await this._queueState('chargingManagement.control.gridImportLimitW_effective', (typeof gridImportLimitEffW === 'number' && Number.isFinite(gridImportLimitEffW)) ? gridImportLimitEffW : 0, true);
                await this._queueState('chargingManagement.control.gridImportLimitW_planning', (typeof gridImportLimitPlanningW === 'number' && Number.isFinite(gridImportLimitPlanningW)) ? gridImportLimitPlanningW : 0, true);
                await this._queueState('chargingManagement.control.gridImportStage', gridImportStage, true);
                await this._queueState('chargingManagement.control.gridImportW', (typeof gridW === 'number' && Number.isFinite(gridW)) ? gridW : 0, true);
                await this._queueState('chargingManagement.control.gridBaseLoadW', (typeof gridBaseLoadW === 'number' && Number.isFinite(gridBaseLoadW)) ? gridBaseLoadW : 0, true);
                await this._queueState('chargingManagement.control.gridBaseLoadRawW', (typeof gridBaseLoadRawW === 'number' && Number.isFinite(gridBaseLoadRawW)) ? gridBaseLoadRawW : 0, true);
                await this._queueState('chargingManagement.control.gridLocalSupportW', (typeof gridLocalSupportW === 'number' && Number.isFinite(gridLocalSupportW)) ? gridLocalSupportW : 0, true);
                await this._queueState('chargingManagement.control.gridCapEvcsW', (typeof gridCapEvcsW === 'number' && Number.isFinite(gridCapEvcsW)) ? gridCapEvcsW : 0, true);
                await this._queueState('chargingManagement.control.gridCapBinding', false, true);

                // Use the current (namespaced) diagnostics states to avoid ioBroker "missing object" warnings.
                await this._queueState('chargingManagement.control.gridWorstPhaseA', (typeof worstPhaseA === 'number' && Number.isFinite(worstPhaseA)) ? worstPhaseA : 0, true);
                await this._queueState('chargingManagement.control.gridPhaseCapEvcsW', (typeof phaseCapEvcsW === 'number' && Number.isFinite(phaseCapEvcsW)) ? phaseCapEvcsW : 0, true);
                await this._queueState('chargingManagement.control.phaseCapBinding', false, true);
            } catch {
                // ignore
            }

            // Gate C: Speicher-Unterstützung in Failsafe immer deaktivieren
            this._storageAssistActive = false;
            await this._queueState('chargingManagement.control.storageAssistActive', false, true);
            await this._queueState('chargingManagement.control.storageAssistW', 0, true);
            await this._queueState('chargingManagement.control.storageAssistRequestedW', 0, true);
            await this._queueState('chargingManagement.control.storageAssistAcceptedW', 0, true);
            await this._queueState('chargingManagement.control.storageAssistAcceptedRawW', 0, true);
            await this._queueState('chargingManagement.control.storageAssistAcceptedTs', now, true);
            await this._queueState('chargingManagement.control.storageAssistAcceptedAgeMs', 0, true);
            await this._queueState('chargingManagement.control.storageAssistAcceptedFresh', false, true);
            await this._queueState('chargingManagement.control.storageAssistAcceptedStatus', 'failsafe-disabled', true);

            await this._queueState('chargingManagement.debug.sortedOrder', wbList.map(w => w.safe).join(','), true);

            /** @type {any[]} */
            const debugAlloc = [];
            let totalTargetPowerW = 0;
            let totalTargetCurrentA = 0;

            for (const w of wbList) {
                const targetW = 0;
                const targetA = 0;

                let applied = false;
                let applyStatus = 'skipped';
                /** @type {any|null} */
                let applyWrites = null;

                if (w.online && (w.controlAvailable || (!!w.cfgEnabled && (!w.userStationEnabled || !w.userEnabled || w.rfidLockActive)) || w.operationalBlocked)) {
                    // 0.7.127: Failsafe setzt den sicheren Zielwert nur noch als
                    // Executor-/Fallback-Plan. Der einzige EVCS-Setpoint-Schreiber bleibt
                    // _executeChargingSetpointEntries.
                    applyStatus = 'planned_by_js_safety_executor';
                    const reasonToSet = (!w.cfgEnabled || !w.userStationEnabled || w.rfidLockActive)
                        ? ReasonCodes.DISABLED
                        : ((!w.userEnabled) ? ReasonCodes.CONTROL_DISABLED : reason);
                    await this._queueState(`${w.ch}.reason`, reasonToSet, true);
                } else {
                    await this._queueState(`${w.ch}.reason`, availabilityReason(!!w.cfgEnabled, !!w.userStationEnabled, !!w.userEnabled, !!w.online, !!w.faultActive, !!w.unavailableActive, !!w.rfidLockActive), true);
                }

                await this._queueState(`${w.ch}.targetCurrentA`, 0, true);
                await this._queueState(`${w.ch}.targetPowerW`, 0, true);
                try { await this._queueState(`${w.ch}.stationRemainingW`, 0, true); } catch { /* ignore */ }
                await this._queueState(`${w.ch}.applied`, applied, true);
                await this._queueState(`${w.ch}.applyStatus`, applyStatus, true);
                if (applyWrites) {
                    try {
                        await this._queueState(`${w.ch}.applyWrites`, JSON.stringify(applyWrites), true);
                    } catch {
                        await this._queueState(`${w.ch}.applyWrites`, '{}', true);
                    }
                } else {
                    await this._queueState(`${w.ch}.applyWrites`, '{}', true);
                }

                debugAlloc.push({
                    safe: w.safe,
                    name: w.name,
                    charging: !!w.charging,
                    chargingSinceMs: w.chargingSinceMs || 0,
                    online: !!w.online,
                    userStationEnabled: !!w.userStationEnabled,
                    stationEnabled: !!w.stationEnabled,
                    enabled: !!w.enabled,
                    priority: w.priority,
                    controlBasis: w.controlBasis,
                    chargerType: w.chargerType,
                    stationKey: w.stationKey || '',
                    connectorNo: w.connectorNo || 0,
                    stationMaxPowerW: (typeof w.stationMaxPowerW === 'number' && Number.isFinite(w.stationMaxPowerW)) ? w.stationMaxPowerW : null,
                    targetW,
                    targetA,
                    applied,
                    applyStatus,
                    applyWrites,
                    reason: (w.online && (w.controlAvailable || (!w.cfgEnabled || !w.userStationEnabled || !w.userEnabled || w.rfidLockActive) || w.operationalBlocked))
                        ? ((!w.cfgEnabled || !w.userStationEnabled || w.rfidLockActive) ? ReasonCodes.DISABLED : ((!w.userEnabled) ? ReasonCodes.CONTROL_DISABLED : reason))
                        : (w.staleAny ? ReasonCodes.STALE_METER : availabilityReason(!!w.cfgEnabled, !!w.userStationEnabled, !!w.userEnabled, !!w.online, !!w.faultActive, !!w.unavailableActive, !!w.rfidLockActive)),
                });
            }

            const tsAllocationState = await this._publishChargingAllocationTsShadow({
                mode,
                budgetMode: effectiveBudgetMode,
                budgetW: 0,
                budgetUnlimited: false,
                usedW: 0,
                remainingW: 0,
                totalPowerW,
                totalTargetPowerW: 0,
                totalTargetCurrentA: 0,
                pvAvailableW: 0,
                pvAvailable: false,
                gridCapEvcsW,
                gridCapBinding: false,
                phaseCapEvcsW,
                phaseCapBinding: false,
                para14aActive,
                para14aCapEvcsW: para14aTotalCapW,
                para14aBinding,
                storageAssistActive: false,
                storageAssistW: 0,
                pausedByPeakShaving: false,
                safetyStop: true,
                safetyReason: 'stale-meter-safety-stop',
                staleMeter,
                staleBudget,
                // Eine einzige fachliche Verteilung: Die zentrale Runtime-Allokation
                // (Budget, Modi, Mindestleistungen, Prioritaeten und Stationslimits)
                // liefert den Plan. Der TS-Spiegel validiert und begrenzt ihn nur noch.
                preferTsNativeAllocation: false,
                tsNormalSourceLock: false,
                allowJsComparisonFallback: false,
                wallboxes: this._mapChargingWallboxesForTsAllocation(wbList),
                allocations: debugAlloc,
            });
            await this._publishChargingStationDiagnosticsFromAllocationPlan(tsAllocationState, wbList);
            const tsWritePlanProductive = tsAllocationState && tsAllocationState.writePlanProductive ? tsAllocationState.writePlanProductive : null;
            const tsWritePlanUsed = await this._executeChargingTsSetpointPlan(tsWritePlanProductive, wbList, debugAlloc);
            const legacyFallbackReason = tsWritePlanProductive && tsWritePlanProductive.fallbackReason
                ? tsWritePlanProductive.fallbackReason
                : 'stale-meter-safety-fallback';
            if (!tsWritePlanUsed) {
                await this._executeChargingLegacySetpointFallback(wbList, debugAlloc, legacyFallbackReason);
            }
            await this._publishChargingLegacyDecisionTreeState(tsAllocationState, tsWritePlanProductive, tsWritePlanUsed, debugAlloc, 'stale-meter-safety-fallback', legacyFallbackReason);
            await this._publishChargingTsNormalSourceState('stale-meter-safety-fallback', tsAllocationState, tsWritePlanProductive, tsWritePlanUsed, legacyFallbackReason, true);
            await this._publishChargingNormalSourceState({
                context: 'stale-meter-safety-fallback',
                mode,
                status: 'failsafe_stale_meter',
                safetyStop: true,
                safetyReason: 'stale-meter-safety-stop',
                budget: chargingBudgetTsProductive,
                allocation: tsAllocationState && (tsAllocationState.normalSourceDecision || tsAllocationState.productiveDecision),
                writePlan: tsWritePlanProductive,
                executor: this._chargingWritePlanExecutorLast,
                legacy: this._chargingLegacyDecisionTreeLast,
            });

        publishEvPriorityCaps({
            active: !!evPriorityRequested,
            blockStorageCharge: !!(evPriorityRequested && (evPriorityLimitedWallboxes > 0 || evPriorityPendingW > 0)),
            requestedCount: evPriorityWallboxes.length,
            limitedWallboxes: evPriorityLimitedWallboxes,
            starvedW: Math.round(Math.max(evPriorityStarvedW || 0, evPriorityPendingW || 0)),
            pendingW: Math.round(evPriorityPendingW || 0),
            storageYieldW: Math.round(evPriorityStorageYieldW || 0),
            storageSource: String(evPriorityStorageSource || ''),
        });

        // ---- Stations (DC multi-connector) diagnostics ----
        try {
            const stationKeys = Array.from(stationCapW.keys());
            await this._queueState('chargingManagement.stationCount', stationKeys.length, true);

            for (const sk of stationKeys) {
                const ch = await this._ensureStationChannel(sk);
                const cap = stationCapW.get(sk);
                const rem = stationRemainingW.get(sk);
                const used = (typeof cap === 'number' && Number.isFinite(cap) && typeof rem === 'number' && Number.isFinite(rem))
                    ? Math.max(0, cap - rem)
                    : 0;
                const headroom = (typeof rem === 'number' && Number.isFinite(rem)) ? Math.max(0, rem) : 0;
                let binding = false;
                if (typeof cap === 'number' && Number.isFinite(cap) && cap > 0 && typeof rem === 'number' && Number.isFinite(rem)) {
                    const tol = Math.max(50, cap * 0.005); // 0.5% oder 50W
                    binding = rem <= tol;
                }

                const name = stationNameByKey.get(sk) || '';
                const targetSum = stationTargetSumW.get(sk) || 0;
                const cnt = stationConnectorCount.get(sk) || 0;
                const bc = stationBoostCount.get(sk) || 0;
                const pvc = stationPvLimitedCount.get(sk) || 0;
                const connsSet = stationConnectors.get(sk);
                const conns = connsSet ? Array.from(connsSet).filter(s => s).join(',') : '';

                await this._queueState(`${ch}.stationKey`, sk, true);
                await this._queueState(`${ch}.name`, name, true);
                await this._queueState(`${ch}.maxPowerW`, (typeof cap === 'number' && Number.isFinite(cap)) ? cap : 0, true);
                await this._queueState(`${ch}.remainingW`, (typeof rem === 'number' && Number.isFinite(rem)) ? rem : 0, true);
                await this._queueState(`${ch}.usedW`, used, true);
                await this._queueState(`${ch}.binding`, !!binding, true);
                await this._queueState(`${ch}.headroomW`, headroom, true);
                await this._queueState(`${ch}.targetSumW`, targetSum, true);
                await this._queueState(`${ch}.connectorCount`, cnt, true);
                await this._queueState(`${ch}.boostConnectors`, bc, true);
                await this._queueState(`${ch}.pvLimitedConnectors`, pvc, true);
                await this._queueState(`${ch}.connectors`, conns, true);
                await this._queueState(`${ch}.lastUpdate`, Date.now(), true);
            }
        } catch {
            // ignore
        }

        await this._queueState('chargingManagement.summary.totalPowerW', totalFreshActualPowerW, true);
        await this._queueState('chargingManagement.summary.totalReservedPowerW', 0, true);
        await this._queueState('chargingManagement.summary.totalTargetPowerW', totalTargetPowerW, true);
            await this._queueState('chargingManagement.summary.totalTargetCurrentA', totalTargetCurrentA, true);
            await this._queueState('chargingManagement.summary.lastUpdate', Date.now(), true);

            try {
                const s = JSON.stringify(debugAlloc);
                await this._queueState('chargingManagement.debug.allocations', s, true);
            } catch {
                await this._queueState('chargingManagement.debug.allocations', '[]', true);
            }
            await this._recordChargingAudit({
                ts: now, context: 'stale-meter-safety-fallback', mode, budgetMode: effectiveBudgetMode, status: 'failsafe_stale_meter', controlActive: true, pausedByPeakShaving, safetyStop: true, safetyReason: 'stale-meter-safety-stop',
                budgetW: 0, actualPowerW: totalFreshActualPowerW, reservedPowerW: 0, targetPowerW: totalTargetPowerW, remainingPowerW: 0,
                gridImportW, gridImportLimitW, gridImportLimitEffW, gridCapEvcsW, gridCapBinding: false, phaseCapEvcsW, phaseCapBinding: false, para14aActive, para14aCapEvcsW: para14aTotalCapW, para14aBinding,
                storageAssistActive: false, storageAssistRequestedW: 0, storageAssistAcceptedW: 0, wallboxes: wbList, allocations: debugAlloc,
            });

            // Cleanup session tracking for removed wallboxes (avoid memory leaks)
            for (const [safeKey, lastSeenTs] of this._chargingLastSeenMs.entries()) {
                const ls = (typeof lastSeenTs === 'number' && Number.isFinite(lastSeenTs)) ? lastSeenTs : 0;
                if (!ls || (now - ls) > sessionCleanupStaleMs) {
                    this._chargingLastSeenMs.delete(safeKey);
                    this._chargingLastActiveMs.delete(safeKey);
                    this._chargingSinceMs.delete(safeKey);
                    this._lastCmdTargetW.delete(safeKey);
                    this._lastCmdTargetA.delete(safeKey);
                    this._boostSinceMs.delete(safeKey);
                    this._pvStartAttemptSinceMs.delete(safeKey);
                    this._vehicleStartAttemptSinceMs.delete(safeKey);
                    this._vehicleStartCooldownUntilMs.delete(safeKey);
                }
            }

            return;
        }

        const controlActive = mode !== 'off';
        await this._queueState('chargingManagement.control.active', controlActive, true);
        await this._queueState('chargingManagement.control.mode', mode, true);
        await this._queueState('chargingManagement.control.budgetMode', effectiveBudgetMode, true);
        await this._queueState('chargingManagement.control.pausedByPeakShaving', pausedByPeakShaving, true);

        if (mode === 'off') {
            // Ein ausgeschaltetes Lademanagement darf keinen alten
            // Speicherunterstützungs-Request im Folgemodul stehen lassen.
            this._storageAssistActive = false;
            storageAssistActive = false;
            storageAssistW = 0;
            storageAssistAcceptedW = 0;
            await this._queueState('chargingManagement.control.storageAssistActive', false, true);
            await this._queueState('chargingManagement.control.storageAssistW', 0, true);
            await this._queueState('chargingManagement.control.storageAssistRequestedW', 0, true);
            await this._queueState('chargingManagement.control.storageAssistAcceptedW', 0, true);
            await this._queueState('chargingManagement.control.storageAssistAcceptedRawW', 0, true);
            await this._queueState('chargingManagement.control.storageAssistAcceptedTs', now, true);
            await this._queueState('chargingManagement.control.storageAssistAcceptedAgeMs', 0, true);
            await this._queueState('chargingManagement.control.storageAssistAcceptedFresh', false, true);
            await this._queueState('chargingManagement.control.storageAssistAcceptedStatus', 'control-off', true);
            await this._queueState('chargingManagement.control.status', 'off', true);
            await this._queueState('chargingManagement.control.budgetW', Number.isFinite(budgetW) ? budgetW : 0, true);
            await this._queueState('chargingManagement.control.usedW', 0, true);
            await this._queueState('chargingManagement.control.remainingW', Number.isFinite(budgetW) ? budgetW : 0, true);
            await this._queueState('chargingManagement.control.actualW', Math.max(0, Math.round(Number(totalFreshActualPowerW || 0))), true);
            await this._queueState('chargingManagement.control.reserveW', 0, true);
            await this._queueState('chargingManagement.control.activeDemandReserveW', 0, true);
            await this._queueState('chargingManagement.control.pvActiveDemandReserveW', 0, true);
            await this._queueState('chargingManagement.control.pvActiveDemandIntentW', 0, true);
            await this._queueState('chargingManagement.control.pvPendingDemandIntentW', 0, true);
            await this._queueState('chargingManagement.control.pvPendingDemandTotalW', 0, true);
            await this._queueState('chargingManagement.control.pvPendingDemandWallboxes', 0, true);
            await this._queueState('chargingManagement.control.activeDemandWallboxes', 0, true);
            // Cleanup session tracking for removed wallboxes (avoid memory leaks)
            for (const [safeKey, lastSeenTs] of this._chargingLastSeenMs.entries()) {
                const ls = (typeof lastSeenTs === 'number' && Number.isFinite(lastSeenTs)) ? lastSeenTs : 0;
                if (!ls || (now - ls) > sessionCleanupStaleMs) {
                    this._chargingLastSeenMs.delete(safeKey);
                    this._chargingLastActiveMs.delete(safeKey);
                    this._chargingSinceMs.delete(safeKey);
                    this._lastCmdTargetW.delete(safeKey);
                    this._lastCmdTargetA.delete(safeKey);
                    this._boostSinceMs.delete(safeKey);
                    this._pvStartAttemptSinceMs.delete(safeKey);
                    this._vehicleStartAttemptSinceMs.delete(safeKey);
                    this._vehicleStartCooldownUntilMs.delete(safeKey);
                }
            }

            const tsControlOffState = await this._publishChargingControlTsShadow({ mode, budgetMode: effectiveBudgetMode, status: 'off', active: false, budgetW: Number.isFinite(budgetW) ? budgetW : 0, usedW: 0, remainingW: Number.isFinite(budgetW) ? budgetW : 0, totalPowerW: totalFreshActualPowerW, totalTargetPowerW: 0, totalTargetCurrentA: 0, wallboxCount: wbList.length, onlineWallboxes: onlineCount, connectedCount: wbList.filter(w => w && w.vehiclePlugged === true).length, pausedByPeakShaving, staleMeter, staleBudget, gridImportLimitW, gridImportLimitEffW, gridImportW, gridCapEvcsW, gridCapBinding, phaseCapEvcsW, phaseCapBinding, para14aActive, para14aCapEvcsW: para14aTotalCapW, para14aBinding, storageAssistActive: false, storageAssistW: 0 });
            await this._publishChargingNormalSourceState({
                context: 'mode-off',
                mode,
                status: 'off',
                budget: chargingBudgetTsProductive,
                control: tsControlOffState && tsControlOffState.productiveDecision,
                legacy: this._chargingLegacyDecisionTreeLast,
            });

            await this._queueState('chargingManagement.summary.totalPowerW', Math.max(0, Math.round(Number(totalFreshActualPowerW || 0))), true);
            await this._queueState('chargingManagement.summary.totalReservedPowerW', 0, true);
            await this._queueState('chargingManagement.summary.totalTargetPowerW', 0, true);
            await this._queueState('chargingManagement.summary.totalTargetCurrentA', 0, true);
            await this._queueState('chargingManagement.summary.lastUpdate', Date.now(), true);
            await this._recordChargingAudit({
                ts: now, context: 'mode-off', mode, budgetMode: effectiveBudgetMode, status: 'off', controlActive: false, pausedByPeakShaving, safetyStop: false,
                budgetW: Number.isFinite(budgetW) ? budgetW : 0, actualPowerW: totalFreshActualPowerW, reservedPowerW: 0, targetPowerW: 0, remainingPowerW: Number.isFinite(budgetW) ? budgetW : 0,
                gridImportW, gridImportLimitW, gridImportLimitEffW, gridCapEvcsW, gridCapBinding, phaseCapEvcsW, phaseCapBinding, para14aActive, para14aCapEvcsW: para14aTotalCapW, para14aBinding,
                storageAssistActive: false, storageAssistRequestedW: 0, storageAssistAcceptedW: 0, wallboxes: wbList, allocations: [],
            });
            return;
        }

        if (pausedByPeakShaving) {
            const pb = (pauseBehavior === 'followPeakBudget') ? 'followPeakBudget' : 'rampDownToZero';

            if (pb === 'followPeakBudget') {
                const psBudgetStale = await isStateStale('peakShaving.dynamic.availableForControlledW', staleTimeoutMs);
                const psBudgetRaw = await this._getPeakShavingBudgetW();
                const psBudgetW = (!psBudgetStale && typeof psBudgetRaw === 'number' && Number.isFinite(psBudgetRaw)) ? Math.max(0, psBudgetRaw) : null;

                if (psBudgetW !== null) {
                    budgetW = psBudgetW;
                    effectiveBudgetMode = 'fromPeakShaving';
                    // Ensure control state reflects the effective mode (overrides earlier value)
                    await this._queueState('chargingManagement.control.budgetMode', effectiveBudgetMode, true);
                    pauseFollowPeakBudget = true;
                }

                // Gate A: If PeakShaving is active but no dynamic budget is available (e.g. static mode),
                // fall back to the already computed hard grid safety caps instead of ramping to 0.
                if (!pauseFollowPeakBudget && (typeof gridCapEvcsW === 'number' && Number.isFinite(gridCapEvcsW))) {
                    const before = budgetW;
                    if (!Number.isFinite(budgetW)) budgetW = gridCapEvcsW;
                    else budgetW = Math.min(budgetW, gridCapEvcsW);

                    // Keep effectiveBudgetMode as-is (it already includes +gridImport/+phaseCap when active)
                    await this._queueState('chargingManagement.control.budgetMode', effectiveBudgetMode, true);
                    pauseFollowPeakBudget = true;
                    pauseFollowGridCaps = true;
                }
            }

            // If the user selected rampDownToZero but we can still compute safe hard caps (Gate A),
            // follow those caps instead of forcing 0A. Only ramp down to 0 when no safe budget is available.
            if (!pauseFollowPeakBudget && pb !== 'followPeakBudget' && (typeof gridCapEvcsW === 'number' && Number.isFinite(gridCapEvcsW))) {
                const before = budgetW;
                if (!Number.isFinite(budgetW)) budgetW = gridCapEvcsW;
                else budgetW = Math.min(budgetW, gridCapEvcsW);

                // Keep effectiveBudgetMode as-is (it already includes +gridImport/+phaseCap when active)
                await this._queueState('chargingManagement.control.budgetMode', effectiveBudgetMode, true);
                pauseFollowPeakBudget = true;
                pauseFollowGridCaps = true;
            }

// Default / safe pause behavior: ramp down to 0 (do not keep last setpoints)
            if (!pauseFollowPeakBudget) {
                const reason = ReasonCodes.PAUSED_BY_PEAK_SHAVING;

                await this._queueState('chargingManagement.control.active', true, true);
                await this._queueState('chargingManagement.control.mode', mode, true);
                await this._queueState('chargingManagement.control.budgetMode', effectiveBudgetMode, true);
                await this._queueState('chargingManagement.control.pausedByPeakShaving', true, true);
                await this._queueState('chargingManagement.control.status', 'paused_by_peak_shaving_ramp_down', true);
                await this._queueState('chargingManagement.control.budgetW', 0, true);
                await this._queueState('chargingManagement.control.usedW', 0, true);
                await this._queueState('chargingManagement.control.remainingW', 0, true);
                await this._queueState('chargingManagement.control.actualW', Math.max(0, Math.round(Number(totalFreshActualPowerW || 0))), true);
                await this._queueState('chargingManagement.control.reserveW', 0, true);
                await this._queueState('chargingManagement.control.activeDemandReserveW', 0, true);
                await this._queueState('chargingManagement.control.pvActiveDemandReserveW', 0, true);
                await this._queueState('chargingManagement.control.pvActiveDemandIntentW', 0, true);
                await this._queueState('chargingManagement.control.pvPendingDemandIntentW', 0, true);
                await this._queueState('chargingManagement.control.pvPendingDemandTotalW', 0, true);
                await this._queueState('chargingManagement.control.pvPendingDemandWallboxes', 0, true);
                await this._queueState('chargingManagement.control.activeDemandWallboxes', 0, true);

            // Gate C: Speicher-Unterstützung in Failsafe immer deaktivieren
            this._storageAssistActive = false;
            await this._queueState('chargingManagement.control.storageAssistActive', false, true);
            await this._queueState('chargingManagement.control.storageAssistW', 0, true);
            await this._queueState('chargingManagement.control.storageAssistRequestedW', 0, true);
            await this._queueState('chargingManagement.control.storageAssistAcceptedW', 0, true);
            await this._queueState('chargingManagement.control.storageAssistAcceptedRawW', 0, true);
            await this._queueState('chargingManagement.control.storageAssistAcceptedTs', now, true);
            await this._queueState('chargingManagement.control.storageAssistAcceptedAgeMs', 0, true);
            await this._queueState('chargingManagement.control.storageAssistAcceptedFresh', false, true);
            await this._queueState('chargingManagement.control.storageAssistAcceptedStatus', 'peak-shaving-paused', true);

                await this._queueState('chargingManagement.debug.sortedOrder', wbList.map(w => w.safe).join(','), true);

                /** @type {any[]} */
                const debugAlloc = [];
                let totalTargetPowerW = 0;
                let totalTargetCurrentA = 0;

                for (const w of wbList) {
                    const targetW = 0;
                    const targetA = 0;

                    let applied = false;
                    let applyStatus = 'skipped';
                    /** @type {any|null} */
                    let applyWrites = null;

                    if (w.controlAvailable) {
                        // 0.7.127: Peak-Shaving-Rampdown läuft nicht mehr als eigener
                        // JS-Schreibblock, sondern als Safety-Fallback-Plan über den
                        // zentralen Executor.
                        applyStatus = 'planned_by_js_safety_executor';
                        await this._queueState(`${w.ch}.reason`, reason, true);
                    } else {
                        await this._queueState(`${w.ch}.reason`, availabilityReason(!!w.cfgEnabled, !!w.userStationEnabled, !!w.userEnabled, !!w.online, !!w.faultActive, !!w.unavailableActive, !!w.rfidLockActive), true);
                    }

                    await this._queueState(`${w.ch}.targetCurrentA`, 0, true);
                    await this._queueState(`${w.ch}.targetPowerW`, 0, true);
                    await this._queueState(`${w.ch}.applied`, applied, true);
                    await this._queueState(`${w.ch}.applyStatus`, applyStatus, true);
                    if (applyWrites) {
                        try {
                            await this._queueState(`${w.ch}.applyWrites`, JSON.stringify(applyWrites), true);
                        } catch {
                            await this._queueState(`${w.ch}.applyWrites`, '{}', true);
                        }
                    } else {
                        await this._queueState(`${w.ch}.applyWrites`, '{}', true);
                    }

                    debugAlloc.push({
                        safe: w.safe,
                        name: w.name,
                        charging: !!w.charging,
                        chargingSinceMs: w.chargingSinceMs || 0,
                        online: !!w.online,
                        userStationEnabled: !!w.userStationEnabled,
                        stationEnabled: !!w.stationEnabled,
                        enabled: !!w.enabled,
                        controlAvailable: !!w.controlAvailable,
                        onlineSource: String(w.onlineSource || ''),
                        statusClass: String(w.statusClass || ''),
                        statusEffective: String(w.statusEffective || ''),
                        faultActive: !!w.faultActive,
                        unavailableActive: !!w.unavailableActive,
                        operationalBlocked: !!w.operationalBlocked,
                        faultReason: String(w.faultReason || ''),
                        targetW,
                        targetA,
                        applied,
                        status: applyStatus,
                        reason: w.controlAvailable ? reason : (w.staleAny ? ReasonCodes.STALE_METER : availabilityReason(!!w.cfgEnabled, !!w.userStationEnabled, !!w.userEnabled, !!w.online, !!w.faultActive, !!w.unavailableActive, !!w.rfidLockActive)),
                    });

                    // totals stay 0
                    totalTargetPowerW += targetW;
                    if (Number.isFinite(targetA) && targetA > 0) totalTargetCurrentA += targetA;
                }

                const tsAllocationState = await this._publishChargingAllocationTsShadow({
                    mode,
                    budgetMode: effectiveBudgetMode,
                    budgetW: 0,
                    budgetUnlimited: false,
                    usedW: 0,
                    remainingW: 0,
                    totalPowerW,
                    totalTargetPowerW: 0,
                    totalTargetCurrentA: 0,
                    pvAvailableW: 0,
                    pvAvailable: false,
                    gridCapEvcsW,
                    gridCapBinding: false,
                    phaseCapEvcsW,
                    phaseCapBinding: false,
                    para14aActive,
                    para14aCapEvcsW: para14aTotalCapW,
                    para14aBinding,
                    storageAssistActive: false,
                    storageAssistW: 0,
                    pausedByPeakShaving: true,
                    safetyStop: true,
                    safetyReason: 'peak-shaving-safety-stop',
                    staleMeter,
                    staleBudget,
                    preferTsNativeAllocation: false,
                    tsNormalSourceLock: false,
                    allowJsComparisonFallback: false,
                    wallboxes: this._mapChargingWallboxesForTsAllocation(wbList),
                    allocations: debugAlloc,
                });
                await this._publishChargingStationDiagnosticsFromAllocationPlan(tsAllocationState, wbList);
                const tsWritePlanProductive = tsAllocationState && tsAllocationState.writePlanProductive ? tsAllocationState.writePlanProductive : null;
                const tsWritePlanUsed = await this._executeChargingTsSetpointPlan(tsWritePlanProductive, wbList, debugAlloc);
                const legacyFallbackReason = tsWritePlanProductive && tsWritePlanProductive.fallbackReason
                    ? tsWritePlanProductive.fallbackReason
                    : 'peak-shaving-safety-fallback';
                if (!tsWritePlanUsed) {
                    await this._executeChargingLegacySetpointFallback(wbList, debugAlloc, legacyFallbackReason);
                }
                await this._publishChargingLegacyDecisionTreeState(tsAllocationState, tsWritePlanProductive, tsWritePlanUsed, debugAlloc, 'peak-shaving-safety-fallback', legacyFallbackReason);
                await this._publishChargingTsNormalSourceState('peak-shaving-safety-fallback', tsAllocationState, tsWritePlanProductive, tsWritePlanUsed, legacyFallbackReason, true);
                await this._publishChargingNormalSourceState({
                    context: 'peak-shaving-safety-fallback',
                    mode,
                    status: 'paused_by_peak_shaving_ramp_down',
                    safetyStop: true,
                    safetyReason: 'peak-shaving-safety-stop',
                    budget: chargingBudgetTsProductive,
                    allocation: tsAllocationState && (tsAllocationState.normalSourceDecision || tsAllocationState.productiveDecision),
                    writePlan: tsWritePlanProductive,
                    executor: this._chargingWritePlanExecutorLast,
                    legacy: this._chargingLegacyDecisionTreeLast,
                });

                try {
                    const s = JSON.stringify(debugAlloc);
                    await this._queueState('chargingManagement.debug.allocations', diagMaxJsonLen ? (s.slice(0, diagMaxJsonLen) + '...') : s, true);
                } catch {
                    await this._queueState('chargingManagement.debug.allocations', '[]', true);
                }

                // Cleanup session tracking for removed wallboxes (avoid memory leaks)
                for (const [safeKey, lastSeenTs] of this._chargingLastSeenMs.entries()) {
                    const ls = (typeof lastSeenTs === 'number' && Number.isFinite(lastSeenTs)) ? lastSeenTs : 0;
                    if (!ls || (now - ls) > sessionCleanupStaleMs) {
                        this._chargingLastSeenMs.delete(safeKey);
                        this._chargingLastActiveMs.delete(safeKey);
                        this._chargingSinceMs.delete(safeKey);
                    }
                }

                await this._publishChargingControlTsShadow({ mode, budgetMode: effectiveBudgetMode, status: 'paused_by_peak_shaving_ramp_down', active: true, budgetW: 0, usedW: 0, remainingW: 0, totalPowerW: totalFreshActualPowerW, totalTargetPowerW: 0, totalTargetCurrentA: 0, wallboxCount: wbList.length, onlineWallboxes: onlineCount, connectedCount: wbList.filter(w => w && w.vehiclePlugged === true).length, pausedByPeakShaving: true, staleMeter, staleBudget, gridImportLimitW, gridImportLimitEffW, gridImportW, gridCapEvcsW, gridCapBinding, phaseCapEvcsW, phaseCapBinding, para14aActive, para14aCapEvcsW: para14aTotalCapW, para14aBinding, storageAssistActive: false, storageAssistW: 0 });

                await this._queueState('chargingManagement.summary.totalPowerW', Math.max(0, Math.round(Number(totalFreshActualPowerW || 0))), true);
                await this._queueState('chargingManagement.summary.totalReservedPowerW', 0, true);
                await this._queueState('chargingManagement.summary.totalTargetPowerW', 0, true);
                await this._queueState('chargingManagement.summary.totalTargetCurrentA', 0, true);
                await this._queueState('chargingManagement.summary.lastUpdate', Date.now(), true);
                await this._recordChargingAudit({
                    ts: now, context: 'peak-shaving-safety-fallback', mode, budgetMode: effectiveBudgetMode, status: 'paused_by_peak_shaving_ramp_down', controlActive: true, pausedByPeakShaving: true, safetyStop: true, safetyReason: 'peak-shaving-safety-stop',
                    budgetW: 0, actualPowerW: totalFreshActualPowerW, reservedPowerW: 0, targetPowerW: 0, remainingPowerW: 0,
                    gridImportW, gridImportLimitW, gridImportLimitEffW, gridCapEvcsW, gridCapBinding, phaseCapEvcsW, phaseCapBinding, para14aActive, para14aCapEvcsW: para14aTotalCapW, para14aBinding,
                    storageAssistActive: false, storageAssistRequestedW: 0, storageAssistAcceptedW: 0, wallboxes: wbList, allocations: debugAlloc,
                });
                return;
            }
        }

        // Priority distribution in W across mixed AC/DC chargers
        // Nicht verfügbare Punkte verlassen vor der Allokation sofort ihre Lease;
        // ein Fehler/Abstecken darf keinen anderen Verbraucher bis zum Timeout sperren.
        for (const unavailable of wbList.filter(w => !w.controlAvailable)) {
            requestZeroExportProbe(this.adapter, {key: `evcs:${unavailable.safe}`, now,
                eligible: false, actualFresh: false, actualW: 0, baseW: 0, nextW: 0, maxW: 0});
            this._zeroExportPhaseAtMaxSince.delete(unavailable.safe);
            this._zeroExportPhaseLeaseBySafe.delete(unavailable.safe);
        }
        const sorted = wbList
            .filter(w => w.controlAvailable)
            .sort((a, b) => {
                // Boosted wallboxes first (explicit user choice)
                const ab = a.effectiveMode === 'boost' ? 1 : 0;
                const bb = b.effectiveMode === 'boost' ? 1 : 0;
                if (ab !== bb) return bb - ab;

                // Zeit-Ziel Laden ("Depot-/Deadline-Laden") vor normaler Priorität:
                // - zuerst alle aktiven Ziel-Laden Sessions
                // - innerhalb Ziel-Laden: früheste Deadline zuerst, dann höchste benötigte Leistung
                const ag = a.goalActive ? 1 : 0;
                const bg = b.goalActive ? 1 : 0;
                if (ag !== bg) return bg - ag;
                if (ag && bg) {
                    const af = (Number.isFinite(a.goalFinishTs) && a.goalFinishTs > 0) ? a.goalFinishTs : Infinity;
                    const bf = (Number.isFinite(b.goalFinishTs) && b.goalFinishTs > 0) ? b.goalFinishTs : Infinity;
                    if (af !== bf) return af - bf;
                    const au = Number.isFinite(a.goalUrgency) ? a.goalUrgency : 0;
                    const bu = Number.isFinite(b.goalUrgency) ? b.goalUrgency : 0;
                    if (au !== bu) return bu - au;
                }

                const ac = a.charging ? 1 : 0;
                const bc = b.charging ? 1 : 0;
                if (ac !== bc) return bc - ac; // charging first

                // Earlier charging sessions first (arrival order). Non-charging get Infinity and fall back to priority.
                const as = (Number.isFinite(a.chargingSinceMs) && a.chargingSinceMs > 0) ? a.chargingSinceMs : Infinity;
                const bs = (Number.isFinite(b.chargingSinceMs) && b.chargingSinceMs > 0) ? b.chargingSinceMs : Infinity;
                if (as !== bs) return as - bs;

                const ap = Number.isFinite(a.priority) ? a.priority : 9999;
                const bp = Number.isFinite(b.priority) ? b.priority : 9999;
                if (ap !== bp) return ap - bp;

                // If everything is equal, keep the configured list order stable (installer can reorder in UI)
                const ao = Number.isFinite(a.orderIndex) ? a.orderIndex : 0;
                const bo = Number.isFinite(b.orderIndex) ? b.orderIndex : 0;
                if (ao !== bo) return ao - bo;

                const ask = String(a.safe || '');
                const bsk = String(b.safe || '');
                return ask.localeCompare(bsk);
            });

        // MU3.1.1 (Sprint 3.1): Optional round-robin fairness within station groups.
        // This keeps overall prioritization, but rotates the order of NON-boost connectors inside the same station
        // so that one connector does not always take the full station cap first.
        // Default behavior:
        // - Without stations (no cap): sequential (stable ordering)
        // - With stations (cap present): round-robin (fairness across connectors)
        const _stationAllocModeRaw = (cfg.stationAllocationMode !== undefined && cfg.stationAllocationMode !== null)
            ? String(cfg.stationAllocationMode).trim()
            : '';
        const stationAllocMode = String(_stationAllocModeRaw || (stationCapByKey && stationCapByKey.size ? 'roundrobin' : 'sequential')).trim().toLowerCase();
        if (stationAllocMode === 'roundrobin' || stationAllocMode === 'round_robin' || stationAllocMode === 'rr') {
            /** @type {Map<string, number[]>} */
            const idxByStation = new Map();
            for (let i = 0; i < sorted.length; i++) {
                const w = sorted[i];
                const sk = String(w.stationKey || '').trim();
                if (!sk) continue;
                // Only for real station groups (cap > 0)
                const cap = w.stationMaxPowerW;
                if (typeof cap !== 'number' || !Number.isFinite(cap) || cap <= 0) continue;
                // Keep boost connectors at the top: rotate only non-boost connectors.
                if (String(w.effectiveMode || '') === 'boost') continue;
                // Ziel-Laden soll seine Priorität behalten: nicht in Round-Robin rotieren
                if (w.goalActive) continue;

                // Round-Robin darf nur innerhalb fachlich gleichwertiger Ladepunkte
                // rotieren. Andernfalls könnte ein Connector mit Priorität 200 vor einem
                // Connector mit Priorität 100 oder ein Auto-Ladepunkt vor einem PV-Ladepunkt
                // einsortiert werden. Station, Priorität, Ladezustand und Betriebsart bilden
                // deshalb gemeinsam die Fairness-Gruppe.
                const rrGroupKey = `${sk}|p:${Number.isFinite(Number(w.priority)) ? Number(w.priority) : 9999}|c:${w.charging ? 1 : 0}|m:${String(w.effectiveMode || 'auto')}`;
                const arr = idxByStation.get(rrGroupKey) || [];
                arr.push(i);
                idxByStation.set(rrGroupKey, arr);
            }

            // Stable session fairness: a constrained station must not swap the
            // active connector every few seconds. Rotation is intentionally slow
            // and configurable; already charging connectors therefore keep their
            // allocation through short PV/tariff/budget fluctuations.
            const rrIntervalMs = clamp(num(cfg.stationRoundRobinIntervalSec, 300), 60, 3600) * 1000;
            for (const [rrGroupKey, positions] of idxByStation.entries()) {
                const n = positions.length;
                if (n <= 1) continue;

                const prev = this._stationRoundRobinOffset.get(rrGroupKey);
                let offset = (typeof prev === 'number' && Number.isFinite(prev) ? prev : 0) % n;

                const lastRot = this._stationRoundRobinLastRotateMs.get(rrGroupKey);
                if (typeof lastRot !== 'number' || !Number.isFinite(lastRot) || lastRot <= 0) {
                    // first seen -> keep offset, start timer
                    this._stationRoundRobinLastRotateMs.set(rrGroupKey, now);
                } else if ((now - lastRot) >= rrIntervalMs) {
                    offset = (offset + 1) % n;
                    this._stationRoundRobinOffset.set(rrGroupKey, offset);
                    this._stationRoundRobinLastRotateMs.set(rrGroupKey, now);
                }

                if (offset > 0) {
                    const elems = positions.map(pos => sorted[pos]);
                    const rotated = elems.slice(offset).concat(elems.slice(0, offset));
                    for (let j = 0; j < n; j++) {
                        sorted[positions[j]] = rotated[j];
                    }
                }
            }
        }

        // MU3.1: expose allocation order for transparency
        for (let i = 0; i < sorted.length; i++) {
            const w = sorted[i];
            // Die reife zentrale Runtime-Verteilung bleibt die einzige fachliche
            // Reihenfolge. Der nachgelagerte TS-Guard darf nur begrenzen, nie neu sortieren.
            w.allocationRank = i + 1;
            await this._queueState(`${w.ch}.allocationRank`, i + 1, true);
        }
        await this._queueState('chargingManagement.debug.sortedOrder', sorted.map(w => w.safe).join(','), true);

        // Stationsbudgets (gemeinsame Leistungsgrenzen je Station)
        /** @type {Map<string, number>} */
        const stationRemainingW = new Map();
        for (const w of sorted) {
            const sk = String(w.stationKey || '').trim();
            const cap = w.stationMaxPowerW;
            if (!sk) continue;
            if (typeof cap !== 'number' || !Number.isFinite(cap) || cap <= 0) continue;
            const prev = stationRemainingW.get(sk);
            stationRemainingW.set(sk, (typeof prev === 'number' && Number.isFinite(prev)) ? Math.min(prev, cap) : cap);
        }

        // Ensure all configured station groups exist in the map (even if currently no connector is online)
        for (const [sk, cap] of stationCapByKey.entries()) {
            const prev = stationRemainingW.get(sk);
            if (typeof prev !== 'number' || !Number.isFinite(prev)) {
                stationRemainingW.set(sk, cap);
            }
        }

        // Copy initial station caps for diagnostics (stationCapW remains constant within this tick)
        /** @type {Map<string, number>} */
        const stationCapW = new Map();
        for (const [sk, cap] of stationRemainingW.entries()) {
            if (typeof cap === 'number' && Number.isFinite(cap) && cap > 0) stationCapW.set(sk, cap);
        }

        const goalPlanBySafe = buildRuntimeGoalPlanMap({
            now, wallboxes: sorted, budgetW, staticBudgetW,
            infrastructureCapacityW: cfg.infrastructureCapacityW,
            totalActualW: totalFreshActualPowerW,
            loadRestW: this._getAdapterNumberFromCache('derived.core.building.loadRestW', null),
            loadTotalW: this._getAdapterNumberFromCache('derived.core.building.loadTotalW', null),
            fallbackLoadW: this._getAdapterNumberFromCache('consumptionTotal', 0),
            pvSnapshot: this.adapter && this.adapter._pvForecast,
            currentPvSurplusW: typeof pvPhysicalCapW === 'number' && Number.isFinite(pvPhysicalCapW) ? pvPhysicalCapW : 0,
            economicGateActive: forcePvSurplusOnly && !pvSurplusOnlyCfg, hardPvOnly: pvSurplusOnlyCfg,
            tariffForecast, reserveMs: goalForecastReserveMs,
            energySafetyFactor: goalForecastSafetyFactor,
        });
        for (const w of sorted) {
            const plan = goalPlanBySafe.get(String(w.safe || '')) || null;
            w.goalPlan = plan;
            try {
                for (const [suffix, value] of goalPlanStateRows(plan, w)) await this._queueState(`${w.ch}.${suffix}`, value, true);
            } catch { /* diagnostics must not stop control */ }
        }

        // Solange das bereits durch NVP, Phasen, §14a, Tarif und Peak-Shaving
        // begrenzte EVCS-Budget alle technischen Mindestleistungen tragen kann,
        // reservieren wir diese Basis fuer alle verbundenen Auto-/Boost-/Min+PV-
        // Ladepunkte. Erst der darueber liegende Leistungsanteil wird nach der
        // bestehenden Prioritaet verteilt. Reines PV-Laden bleibt PV-Grant-gefuehrt.
        const minimumServicePlan = computeChargingMinimumServicePlan({
            wallboxes: sorted.map((w) => w.goalPlan && ['wait', 'complete'].includes(String(w.goalPlan.action || ''))
                ? { ...w, vehicleDemandConfirmed: false, vehicleStartEligible: false }
                : w),
            totalBudgetW: budgetW,
            stationCaps: stationCapW,
        });
        let maximumFutureMinimumReservedW = 0;

        // Station diagnostics accumulators
        /** @type {Map<string, number>} */
        const stationTargetSumW = new Map();
        /** @type {Map<string, number>} */
        const stationConnectorCount = new Map();
        /** @type {Map<string, number>} */
        const stationBoostCount = new Map();
        /** @type {Map<string, number>} */
        const stationPvLimitedCount = new Map();
        /** @type {Map<string, Set<string>>} */
        const stationConnectors = new Map();

        const debugAlloc = [];
        // MU4.1: publish budget engine inputs for transparency in debug output
        try {
            debugAlloc.push({
                type: 'budget',
                budgetW: Number.isFinite(budgetW) ? budgetW : null,
                budgetMode: effectiveBudgetMode,
                details: budgetDebug,
            });
        } catch {
            // ignore
        }

        let remainingW = budgetW;
        let nonStorageRemainingW = Number.isFinite(budgetBeforeStorageAssistW) ? Math.max(0, budgetBeforeStorageAssistW) : remainingW;
        let storageAssistRemainingW = Number.isFinite(storageAssistAcceptedW) ? Math.max(0, storageAssistAcceptedW) : 0;
        let usedW = 0;

        // Zwei gemeinsame PV-Budgettoepfe mit klar getrenntem Zweck:
        // - `pvPureRemainingW` ist der kundenseitig priorisierte EVCS-Anteil und
        //   begrenzt ausschliesslich reine PV-Ladepunkte.
        // - `pvPhysicalRemainingW` ist der gesamte physikalische PV-Rest. Dieser
        //   versorgt reine PV-Ladepunkte ebenfalls, darf von Min+PV aber unabhaengig
        //   von der Speicher/E-Mobilitaets-Priorisierung fuer die Zusatzleistung
        //   oberhalb der netzgestuetzten Mindestladung genutzt werden.
        // Beide Werte stammen aus demselben zentralen EMS-Budget-Snapshot.
        let pvPureRemainingW = (!needPvBudget || typeof pvCapW !== 'number' || !Number.isFinite(pvCapW))
            ? Number.POSITIVE_INFINITY
            : Math.max(0, pvCapW);
        let pvPhysicalRemainingW = (!needPvBudget || typeof pvPhysicalCapW !== 'number' || !Number.isFinite(pvPhysicalCapW))
            ? Number.POSITIVE_INFINITY
            : Math.max(0, pvPhysicalCapW);
        let pvUsedW = 0;

        let totalTargetPowerW = 0;
        let totalTargetCurrentA = 0;
        let evcsActiveDemandReserveW = 0;
        let evcsActiveDemandPvReserveW = 0;
        // PV-Intent bleibt waehrend einer bereits wirksamen Wallbox-Rampe und bei
        // zaeher Leistungstelemetrie sichtbar. Ein noch nicht gestarteter Ladepunkt
        // reserviert dagegen nur sein technisch fahrbares Startminimum. So bekommt
        // der Speicher den kompletten ungenutzten PV-Rest, ohne dass ein echter
        // EVCS-Start durch die Speicherladung blockiert wird.
        let evcsActiveDemandPvIntentW = 0;
        let evcsActiveDemandPurePvIntentW = 0;
        let evcsActiveDemandWallboxes = 0;
        // Noch nicht physisch gestartete PV-Ladepunkte erhalten nur die technisch
        // notwendige Startreservierung. Erst hochregelnde/aktive Ladepunkte duerfen
        // ihren realen Rampenbedarf als PV-Intent reservieren. Nicht genutzte
        // Prozentanteile werden dadurch sofort an Speicher und Folgeverbraucher
        // freigegeben, ohne sie als bereits bezogene Netzlast zu verbuchen.
        let evcsPendingDemandPvIntentW = 0;
        let evcsPendingDemandPurePvIntentW = 0;
        let evcsPendingDemandTotalW = 0;
        let evcsPendingDemandWallboxes = 0;
        let evcsPendingCentralTotalGrantW = null;

        // More specific budget limitation reason based on the active caps in this tick.
        // Used for per-connector diagnostics (without changing the underlying allocation math).
        /** Code-Teil: Arrow-Funktion `pickBudgetReason` – enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden. */
        /** Code-Teil: pickBudgetReason – Verarbeitet Energiefluss-/Budgetwerte und beeinflusst Live-Anzeige sowie History. */
        const pickBudgetReason = () => {
            if (para14aActive && para14aBinding) return ReasonCodes.LIMITED_BY_14A;
            if (gridCapDemandCandidate && phaseCapBinding) return ReasonCodes.LIMIT_POWER_AND_PHASE;
            if (gridCapDemandCandidate) return ReasonCodes.LIMITED_BY_GRID_IMPORT;
            if (phaseCapBinding) return ReasonCodes.LIMITED_BY_PHASE_CAP;
            return ReasonCodes.LIMITED_BY_BUDGET;
        };

        for (const w of sorted) {
            const selectedMode = normalizeWallboxModeOverride(w.userMode);
            const goalPlan = w.goalPlan && typeof w.goalPlan === 'object' ? w.goalPlan : null;
            let effMode = resolvePlanEffectiveMode(w.userMode, w.effectiveMode, goalPlan, w.strategyOverlay, w.userAutoSource);
            if (zeroExportChargingActive && selectedMode === 'auto' && goalPlan?.action === 'charge' && goalPlan.source === 'pv') effMode = 'pv';
            // Nur im neuen Zweig den vom Zielplan aufgelösten Untermodus auch
            // an Phasenwahl/TS-Guard/Writer geben. Der Bedienmodus bleibt Auto.
            if (zeroExportChargingActive) w.effectiveMode = effMode;
            const isPvOnly = effMode === 'pv';
            const isMinPv = effMode === 'minpv';
            const isBoost = effMode === 'boost';
            const isPvManaged = isPvOnly || isMinPv;

            const prevCmdW = this._lastCmdTargetW.get(w.safe);
            const prevCmdA = this._lastCmdTargetA.get(w.safe);
            const prevCmdWNorm = (typeof prevCmdW === 'number' && Number.isFinite(prevCmdW)) ? Math.max(0, prevCmdW) : 0;
            const prevCmdANorm = (typeof prevCmdA === 'number' && Number.isFinite(prevCmdA)) ? Math.max(0, prevCmdA) : 0;
            const prevCmdWasActive = prevCmdWNorm >= activityThresholdW || (w.vFactor > 0 && (prevCmdANorm * w.vFactor) >= activityThresholdW);
            const actualNowW = (typeof w.actualPowerW === 'number' && Number.isFinite(w.actualPowerW)) ? Math.max(0, Math.abs(w.actualPowerW)) : 0;
            const actualOrCmdActive = !!w.charging || actualNowW >= activityThresholdW || prevCmdWasActive;
            const startupHoldActive = isPvManaged && Number.isFinite(Number(w.pvStartupHoldUntilMs)) && Number(w.pvStartupHoldUntilMs) > now;
            const minRunActive = isPvOnly && Number.isFinite(Number(w.pvMinRunUntilMs)) && Number(w.pvMinRunUntilMs) > now;
            const startCooldownActive = isPvOnly && !actualOrCmdActive
                && Number.isFinite(Number(w.pvStartCooldownUntilMs))
                && Number(w.pvStartCooldownUntilMs) > now;
            if (isPvOnly) w.zeroExportStorageCreditW = 0;
            w.zeroExportPvDependent = isPvOnly || (typeof w.zeroExportGridMaxW === 'number'
                && w.zeroExportGridMaxW + (Number(w.zeroExportStorageCreditW) || 0) < zeroExportStorageMinimumW(w));
            w.zeroExportRestartUntilMs = w.zeroExportPvDependent ? zeroExportEvcsPauseUntil(this.adapter, `evcs:${w.safe}`, now) : 0;
            const zeroRestartBlocked = w.zeroExportRestartUntilMs > now;
            const vehicleStartCooldownActive = !w.vehicleDemandConfirmed
                && Number.isFinite(Number(w.vehicleStartCooldownUntilMs))
                && Number(w.vehicleStartCooldownUntilMs) > now;
            w.vehicleStartCooldownActive = vehicleStartCooldownActive;
            w.vehicleStartProbeActive = false;
            const pvTechnicalMinW = (w.chargerType === 'AC' && Number(w.phases || 0) === 3)
                ? Math.max(0, Math.max(num(w.minPW, 0), acMinPower3pW))
                : Math.max(0, num(w.minPW, 0));
            // Min+PV-Grundlast: Bei stromgeregelten AC-Wallboxen ist minPW bereits
            // die exakte technische 6-A-Leistung. Bei leistungsgeregelten 3p-Geräten
            // bleibt die konfigurierte 4,2-kW-Untergrenze verbindlich.
            const minPvBaseW = Math.max(
                0,
                Math.min(
                    Number.isFinite(Number(w.maxPW)) ? Number(w.maxPW) : Number.POSITIVE_INFINITY,
                    zeroExportChargingActive ? zeroExportStorageMinimumW(w)
                        : w.controlBasis === 'currentA' ? num(w.minPW, 0) : Math.max(num(w.minPW, 0), pvTechnicalMinW),
                ),
            );
            const pvStartCommandA = (w.controlBasis === 'currentA' && w.setAKey)
                ? Math.max(0, num(w.minA, 0))
                : 0;
            const pvStartCommandW = (w.controlBasis === 'currentA' && w.setAKey)
                ? ((pvStartCommandA > 0 && w.vFactor > 0) ? (pvStartCommandA * w.vFactor) : 0)
                : pvTechnicalMinW;
            const universalTechnicalStartW = Math.max(
                0,
                Math.min(
                    Number.isFinite(Number(w.maxPW)) ? Math.max(0, Number(w.maxPW)) : Number.POSITIVE_INFINITY,
                    Math.max(activityThresholdW, Number(w.minPW) || 0, isMinPv ? minPvBaseW : 0),
                ),
            );

            // Station diagnostics: count active connectors per station (only if station group has a cap)
            const _sk = (w.stationKey && stationCapW && stationCapW.has(w.stationKey)) ? String(w.stationKey) : '';
            if (_sk) {
                stationConnectorCount.set(_sk, (stationConnectorCount.get(_sk) || 0) + 1);
                if (isBoost) stationBoostCount.set(_sk, (stationBoostCount.get(_sk) || 0) + 1);
                if (isPvOnly || isMinPv) stationPvLimitedCount.set(_sk, (stationPvLimitedCount.get(_sk) || 0) + 1);
                const set = stationConnectors.get(_sk) || new Set();
                set.add(String(w.safe || ''));
                stationConnectors.set(_sk, set);
            }

            let targetW = 0;
            let targetA = 0;
            let reason = pickBudgetReason();

            // Budget view for this wallbox
            const storageEligible = !!(storageAssistActive && w.effectiveStorageAssist === true && storageAssistRemainingW > 0);
            const baseAvailW = Number.isFinite(nonStorageRemainingW) ? Math.max(0, nonStorageRemainingW) : (Number.isFinite(remainingW) ? Math.max(0, remainingW) : Number.POSITIVE_INFINITY);
            const storageExtraAvailW = storageEligible && !zeroExportChargingActive ? Math.max(0, storageAssistRemainingW) : 0;
            const totalAvailW = Number.isFinite(remainingW)
                ? Math.max(0, Math.min(remainingW, baseAvailW + storageExtraAvailW))
                : Number.POSITIVE_INFINITY;
            // Reine PV-Ladung ist sowohl durch den priorisierten EVCS-Anteil als
            // auch durch den physikalischen PV-Rest begrenzt. Min+PV verwendet fuer
            // seine Zusatzleistung nur den physikalischen Rest; die Mindestleistung
            // kommt aus dem normalen Gesamt-/Netzbudget.
            const pvAvailW = isPvOnly
                ? Math.min(
                    Number.isFinite(pvPureRemainingW) ? Math.max(0, pvPureRemainingW) : Number.POSITIVE_INFINITY,
                    Number.isFinite(pvPhysicalRemainingW) ? Math.max(0, pvPhysicalRemainingW) : Number.POSITIVE_INFINITY,
                )
                : (isMinPv
                    ? (Number.isFinite(pvPhysicalRemainingW) ? Math.max(0, pvPhysicalRemainingW) : Number.POSITIVE_INFINITY)
                    : Number.POSITIVE_INFINITY);

            // Stationsgruppe (gemeinsame Leistungsgrenze pro Station)
            const stationAvailW = (w.stationKey && stationRemainingW && stationRemainingW.has(w.stationKey))
                ? Math.max(0, stationRemainingW.get(w.stationKey))
                : Number.POSITIVE_INFINITY;

            // Wenn alle verbundenen netzfaehigen Ladepunkte gleichzeitig ihre
            // technische Mindestleistung erhalten koennen, bleibt dieser Anteil
            // fuer spaeter einsortierte Ladepunkte reserviert. Ein frueher Boost-
            // oder Auto-Ladepunkt darf dann nur die echte Zusatzleistung nutzen.
            // Wird die Anschluss-/Stationsgrenze zu klein fuer alle Minima, greift
            // unveraendert die Prioritaets-/Round-Robin-Abschaltung ganzer Punkte.
            // Boost besitzt bewusst Vorrang vor den Mindestreservierungen spaeterer
            // Ladepunkte. Er erhaelt die maximal lokal konfigurierte Leistung innerhalb
            // der harten Anschluss-, Stations-, Phasen- und §14a-Grenzen. Auto und
            // Min+PV bewahren weiterhin die technische Mindestversorgung der restlichen
            // bestaetigten Ladebedarfe.
            const preserveFutureMinimum = minimumServicePlan.preserveAll && !isBoost;
            const futureMinimumW = preserveFutureMinimum
                ? Math.max(0, Number(minimumServicePlan.futureMinimumBySafe.get(w.safe)) || 0)
                : 0;
            const futureStationMinimumW = preserveFutureMinimum
                ? Math.max(0, Number(minimumServicePlan.futureStationMinimumBySafe.get(w.safe)) || 0)
                : 0;
            maximumFutureMinimumReservedW = Math.max(maximumFutureMinimumReservedW, futureMinimumW);
            const fairTotalAvailW = Number.isFinite(totalAvailW)
                ? Math.max(0, totalAvailW - futureMinimumW)
                : Number.POSITIVE_INFINITY;
            const fairStationAvailW = Number.isFinite(stationAvailW)
                ? Math.max(0, stationAvailW - futureStationMinimumW)
                : Number.POSITIVE_INFINITY;

            const modeMaxW = runtimeChargingMaximumW(w, Number.isFinite(pvPhysicalRemainingW) ? pvPhysicalRemainingW : 0);
            const minPvGridBaseW = typeof w.zeroExportGridMaxW === 'number'
                ? Math.min(minPvBaseW, w.zeroExportGridMaxW) : minPvBaseW;
            w.zeroExportPvSourceSample = zeroExportPvSourceSample;
            w.zeroExportPvSourceBudget = zeroExportPvSourceBudget;
            w.zeroExportPvCreditW = 0;
            const availW = isPvOnly
                ? Math.min(fairTotalAvailW, pvAvailW, fairStationAvailW, modeMaxW)
                : Math.min(fairTotalAvailW, fairStationAvailW, modeMaxW);

            // Track which constraint is currently binding (helps to set a meaningful reason code)
            let limiter = 'none'; // 'station' | 'total' | 'pv' | 'none'
            try {
                const tol = 1e-6;
                if (Number.isFinite(availW)) {
                    // Station limit has precedence for diagnostics (hard cap, shared across connectors)
                    if (Number.isFinite(fairStationAvailW) && fairStationAvailW < Number.POSITIVE_INFINITY && fairStationAvailW <= (availW + tol)) {
                        limiter = 'station';
                    } else if (isPvOnly && Number.isFinite(pvAvailW) && pvAvailW < Number.POSITIVE_INFINITY && pvAvailW <= (availW + tol)) {
                        limiter = 'pv';
                    } else if (Number.isFinite(fairTotalAvailW) && fairTotalAvailW < Number.POSITIVE_INFINITY && fairTotalAvailW <= (availW + tol)) {
                        limiter = 'total';
                    }
                }
            } catch {
                limiter = 'none';
            }

            // Helper for minpv diagnostics (we want to know if station/total was the cap)
            let minpvMaxTotal = null;

            // Raw target calculation
            if (w.controlBasis === 'none') {
                reason = ReasonCodes.NO_SETPOINT;
                targetW = 0;
                targetA = 0;
            } else if (isMinPv) {
                // Min+PV: Die technische Mindestleistung kommt immer aus dem normalen
                // Gesamt-/Netzbudget. Nur die Leistung oberhalb dieser Basis verbraucht
                // den zentralen PV-Grant. Ein PV-Grant von 0 W darf deshalb die
                // Mindestladung nicht stoppen, solange die harten Anschluss-, Phasen-,
                // §14a- und Stationslimits die Basis zulassen.
                const minPvPlan = computeMinPvAllocationW({
                    minPowerW: minPvBaseW,
                    technicalMinW: minPvBaseW,
                    maxPowerW: modeMaxW,
                    totalAvailableW: fairTotalAvailW,
                    stationAvailableW: fairStationAvailW,
                    pvAvailableW: pvAvailW,
                });
                minpvMaxTotal = minPvPlan.hardAvailableW;
                targetW = typeof w.zeroExportGridMaxW === 'number'
                    ? Math.max(0, Math.min(minpvMaxTotal, modeMaxW, minPvGridBaseW + (Number(w.zeroExportStorageCreditW) || 0) + pvAvailW))
                    : minPvPlan.targetW;
                if (targetW > 0 && targetW + 1e-6 < minPvBaseW) targetW = 0;
                if (targetW > 0) {
                    reason = ReasonCodes.ALLOCATED;
                } else if (minPvPlan.reason === 'below-minpv-base') {
                    reason = (fairTotalAvailW <= 0) ? ReasonCodes.NO_BUDGET : ReasonCodes.BELOW_MIN;
                } else {
                    reason = ReasonCodes.NO_BUDGET;
                }
            } else if (!Number.isFinite(availW)) {
                // Unlimited for this wallbox (budget-wise)
                targetW = w.maxPW;
                reason = ReasonCodes.UNLIMITED;
            } else if (availW <= 0) {
                targetW = 0;
                // Distinguish PV constraint from total budget constraint
                reason = (isPvOnly && pvAvailW <= 0 && fairTotalAvailW > 0) ? (ReasonCodes.NO_PV_SURPLUS) : ReasonCodes.NO_BUDGET;
            } else if (availW >= w.minPW || w.minPW === 0) {
                targetW = Math.min(availW, w.maxPW);
                reason = ReasonCodes.ALLOCATED;
                if (targetW > 0 && w.minPW > 0 && targetW < w.minPW) {
                    targetW = 0;
                    reason = ReasonCodes.BELOW_MIN;
                }
            } else {
                targetW = 0;
                reason = isPvOnly ? (ReasonCodes.NO_PV_SURPLUS) : ReasonCodes.BELOW_MIN;
            }

            // Refine reason codes for transparency: station caps, grid caps and user-defined limits.
            try {
                const budgetReason = pickBudgetReason();
                const stationFinite = (Number.isFinite(fairStationAvailW) && fairStationAvailW < Number.POSITIVE_INFINITY);
                const totalFinite = (Number.isFinite(fairTotalAvailW) && fairTotalAvailW < Number.POSITIVE_INFINITY);
                const tol = 1e-6;

                if (w.controlBasis !== 'none') {
                    // If we are fully blocked, prefer the hard limiter if it is obvious.
                    if (targetW <= 0) {
                        if (stationFinite && fairStationAvailW <= 0 && fairTotalAvailW > 0 && (!isPvOnly || pvAvailW > 0)) {
                            reason = ReasonCodes.LIMITED_BY_STATION_CAP;
                        } else if (reason === ReasonCodes.NO_BUDGET && limiter === 'total') {
                            // Prefer a more specific budget reason (grid import / phase cap / §14a)
                            reason = budgetReason;
                        }
                    } else {
                        // Station is the binding min (hard shared cap)
                        if (stationFinite && fairStationAvailW < w.maxPW - tol) {
                            const nearStation = Math.abs(targetW - Math.min(fairStationAvailW, w.maxPW)) <= Math.max(1, 0.01 * w.maxPW);
                            if ((limiter === 'station' && nearStation) || (isMinPv && Number.isFinite(minpvMaxTotal) && minpvMaxTotal === fairStationAvailW && nearStation)) {
                                reason = ReasonCodes.LIMITED_BY_STATION_CAP;
                            }
                        }

                        // Total budget is binding (grid/phase/§14a)
                        if (totalFinite && fairTotalAvailW < w.maxPW - tol) {
                            const nearTotal = Math.abs(targetW - Math.min(fairTotalAvailW, w.maxPW)) <= Math.max(1, 0.01 * w.maxPW);
                            if ((limiter === 'total' && nearTotal) || (isMinPv && Number.isFinite(minpvMaxTotal) && minpvMaxTotal === fairTotalAvailW && nearTotal)) {
                                // Do not override a station cap reason if station is already the limiting factor.
                                if (reason !== ReasonCodes.LIMITED_BY_STATION_CAP) {
                                    reason = budgetReason;
                                }
                            }
                        }

                        // User cap: budgets allow more than maxPW, but local limit blocks.
                        if (reason !== ReasonCodes.UNLIMITED && w.userLimitSet && w.maxPW > 0) {
                            const budgetsAllowMore = (!Number.isFinite(availW)) || (availW > (w.maxPW + 1));
                            if (budgetsAllowMore && targetW >= (w.maxPW - Math.max(1, 0.01 * w.maxPW))) {
                                // Only if we are not already clearly limited by station or budget.
                                if (reason !== ReasonCodes.LIMITED_BY_STATION_CAP && reason !== budgetReason) {
                                    reason = ReasonCodes.LIMITED_BY_USER_LIMIT;
                                }
                            }
                        }

                        // §14a per-connector cap: budgets allow more than the effective maxPW, but §14a limits the connector.
                        if (para14aActive && w.para14aCapped && w.maxPW > 0) {
                            const budgetsAllowMore = (!Number.isFinite(availW)) || (availW > (w.maxPW + 1));
                            if (budgetsAllowMore && targetW >= (w.maxPW - Math.max(1, 0.01 * w.maxPW))) {
                                // Only override if station cap is not the dominant limiter.
                                if (reason !== ReasonCodes.LIMITED_BY_STATION_CAP) {
                                    reason = ReasonCodes.LIMITED_BY_14A;
                                }
                            }
                        }
                    }
                }
            } catch {
                // ignore
            }

            const planned = applyGoalPlan({
                plan: goalPlan, userMode: w.userMode, effectiveMode: effMode,
                targetW, targetA, minPowerW: w.minPW, maxPowerW: modeMaxW,
                totalAvailableW: fairTotalAvailW, stationAvailableW: fairStationAvailW,
            });
            targetW = planned.targetW; targetA = planned.targetA;
            if (planned.reasonHint === 'no-setpoint') reason = ReasonCodes.NO_SETPOINT;
            else if (planned.reasonHint === 'allocated') reason = ReasonCodes.ALLOCATED;
            else if (planned.reasonHint === 'below-min') reason = ReasonCodes.BELOW_MIN;
            else if (planned.reasonHint === 'budget') reason = pickBudgetReason();

            if (!goalPlan && w.goalActive && w.goalDesiredW > 0 && effMode !== 'boost') {
                let desired = Math.min(modeMaxW, Math.max(0, w.goalDesiredW));
                if (goalStrategy === 'smart' && isCheapNow && !isPvOnly) desired = Math.min(modeMaxW, desired * goalCheapBoostFactor);
                desired = computeGoalPowerCapW({ mode: effMode, desiredW: desired, minPvBaseW, maxPowerW: modeMaxW });
                if (Number.isFinite(desired) && desired >= 0 && targetW > desired + 1) targetW = desired;
            }

            const strategyApplied = applyStrategyOverlay({
                plan: goalPlan, strategy: w.strategyOverlay,
                userMode: w.userMode, autoSource: w.userAutoSource,
                targetW, targetA, minPowerW: w.minPW,
            });
            targetW = strategyApplied.targetW; targetA = strategyApplied.targetA;
            if (strategyApplied.reasonHint === 'no-setpoint') reason = ReasonCodes.NO_SETPOINT;
            else if (strategyApplied.reasonHint === 'below-min') reason = ReasonCodes.BELOW_MIN;

                        // Zeit‑Ziel Laden: Wenn nach dem Einstecken auf eine frische SoC‑Aktualisierung gewartet wird,
            // pausieren wir die Ladung temporär (verhindert Start mit stalen/falschen Zielwerten).
            if (shouldPauseChargingForGoalSoc(effMode, w.goalEnabled, w.goalStatus)) {
                targetW = 0;
                targetA = 0;
                reason = ReasonCodes.NO_SETPOINT;
            }

            // Zentrale 0-Einspeise-Suche: Die Freigabe gilt nur für diesen Ladepunkt
            // und diesen Zyklus. Sie ist KEIN gemessener PV-Überschuss. Gesamt-,
            // Stations-, Phasen-, §14a-, Kunden- und Fahrzeuggrenzen bleiben davor.
            w.zeroExportProbeExtraW = 0;
            w.zeroExportProbeLeaseId = '';
            w.zeroExportProbeValidUntil = 0;
            w.zeroExportPhaseProbe = false;
            const zeroMode = readZeroExportMode(this.adapter);
            const previousPhaseLease = this._zeroExportPhaseLeaseBySafe.get(w.safe);
            const phaseLeasePending = !!(previousPhaseLease && previousPhaseLease.validUntil > now);
            let probeMaxW = Math.max(0, Math.min(modeMaxW, fairTotalAvailW, fairStationAvailW));
            const probeStrategy = applyStrategyOverlay({
                plan: goalPlan, strategy: w.strategyOverlay, userMode: w.userMode,
                autoSource: w.userAutoSource, targetW: probeMaxW, targetA: 0, minPowerW: w.minPW,
            });
            probeMaxW = Math.min(probeMaxW, probeStrategy.targetW);
            probeMaxW = Math.min(probeMaxW, applyGoalPlan({plan: goalPlan, userMode: w.userMode, effectiveMode: effMode,
                targetW: probeMaxW, targetA: 0, minPowerW: w.minPW, maxPowerW: probeMaxW,
                totalAvailableW: fairTotalAvailW, stationAvailableW: fairStationAvailW}).targetW);
            if (w.goalActive && Number(w.goalDesiredW) > 0) probeMaxW = Math.min(probeMaxW, Number(w.goalDesiredW));
            // Zusätzliche Prüflast verlangt den ORIGINALEN Leistungsmesswert
            // (höchstens 5 s alt). Das normale Lademanagement darf weiterhin seine
            // vorhandene Protokoll-/OCPP-Frische nutzen; Heartbeat oder autoritatives
            // Idle-0 ersetzen hier aber keinen aktuellen Messwert. Fehlt die strikte
            // Messzeit-API, bleibt ausschließlich die neue Prüflast gesperrt.
            const probePowerKey = `cm.wb.${w.safe}.pW`;
            const probeMeasurementAgeMs = this.dp && typeof this.dp.getMeasurementAgeMs === 'function'
                ? this.dp.getMeasurementAgeMs(probePowerKey) : Number.POSITIVE_INFINITY;
            const probeActualFresh = !!(w.actualPowerWId && typeof probeMeasurementAgeMs === 'number'
                && Number.isFinite(probeMeasurementAgeMs) && probeMeasurementAgeMs >= 0
                && probeMeasurementAgeMs <= 5000 && !w.meterStale && !w.staleAny);
            const probeEligible = !!(isPvOnly && zeroMode.active && w.enabled && w.online && w.controlAvailable
                && w.electricalLimitsValid !== false && w.vehiclePlugged === true
                && (w.vehicleDemandConfirmed === true || w.vehicleStartEligible === true)
                && !w.faultActive && !w.unavailableActive && !w.operationalBlocked && !w.rfidLockActive
                && probeActualFresh && !staleMeter && !staleBudget
                && !pausedByPeakShaving && !vehicleStartCooldownActive && !startCooldownActive && !zeroRestartBlocked
                && (!phaseLeasePending || w.phaseFeedbackFresh === true)
                && !shouldPauseChargingForGoalSoc(effMode, w.goalEnabled, w.goalStatus));
            const stepW = w.controlBasis === 'currentA'
                ? Math.max(0.1, Number(w.stepA) || 0.1) * Math.max(1, Number(w.vFactor) || 1)
                : Math.max(1, Number(w.stepW) || 1);
            // Stromgeregelte AC-Punkte verwenden das reale Stromminimum (6 A
            // entsprechen 4140 W bei 3p/230 V). Die zusätzliche 4,2-kW-Vorgabe
            // gilt nur für leistungsgeregelte Punkte, wie im bestehenden Writer.
            const probeMinimumW = w.controlBasis === 'currentA' ? Math.max(0, Number(w.minPW) || 0) : pvTechnicalMinW;
            const technicalProbeMinW = Math.ceil((Math.max(probeMinimumW, universalTechnicalStartW) - 1e-9) / stepW) * stepW;
            // Der physikalische Anteil bleibt auch unter der technischen
            // Mindestleistung erhalten (z.B. 1300 W PV + 80 W Nullabstand).
            // Ein auf 0 quantisierter Normal-Sollwert würde diese echten Watt
            // sonst fälschlich erneut als Prüfleistung anfordern.
            const baseProbeW = Math.max(0, Math.min(pvAvailW, actualNowW, probeMaxW));
            let nextProbeW = Math.max(technicalProbeMinW, Math.ceil((baseProbeW + Math.max(stepW, 500)) / stepW) * stepW);
            let phaseProbe = false;
            let phaseTransition = false;
            // Eine 1p-Ladung erreicht bei 0-Einspeisung oft nie die normale 3p-
            // PV-Schwelle. Nach stabil gemessener 1p-Maximallast darf genau ein
            // zentral begrenzter 3p-Mindestversuch die normale Stop/Umschalt/
            // Einschwingsequenz anfordern. Explizite frische Phasenrückmeldung
            // ist für diesen zusätzlichen Versuch Pflicht.
            const phaseAtMax = probeEligible && phaseAutoEnabled && w.chargerType === 'AC'
                && w.phaseMode === 'auto-pv' && !!w.phaseSwitchKey && w.phaseFeedbackFresh
                && Number(w.currentPhaseCount) === 1 && Number(w.maxPW) > 0
                && actualNowW >= Number(w.maxPW) - Math.max(100, stepW)
                && Number(w.cooldownUntilMs || 0) <= now && Number(w.settleUntilMs || 0) <= now;
            if (!phaseAtMax) this._zeroExportPhaseAtMaxSince.delete(w.safe);
            else if (!this._zeroExportPhaseAtMaxSince.has(w.safe)) this._zeroExportPhaseAtMaxSince.set(w.safe, now);
            const phaseDwellReady = phaseAtMax && now - this._zeroExportPhaseAtMaxSince.get(w.safe) >= Math.max(1000, Number(w.phaseSwitchUpStableMs) || 300000);
            if (probeEligible && (phaseDwellReady || phaseLeasePending)) {
                phaseProbe = true;
                phaseTransition = Number(w.currentPhaseCount) === 1 ? (phaseLeasePending ? 'switching' : 'prepare')
                    : (Number(w.settleUntilMs || 0) > now ? 'switching' : false);
                const threeStepW = w.controlBasis === 'currentA'
                    ? Math.max(0.1, Number(w.stepA) || 0.1) * Math.max(1, Number(w.voltageV) || 230) * 3 : stepW;
                nextProbeW = Math.ceil((Math.max(Number(w.zeroExportThreePhaseMinW) || 0, technicalProbeMinW) - 1e-9) / threeStepW) * threeStepW;
                probeMaxW = Math.min(Number(w.zeroExportThreePhaseMaxW) || 0, fairTotalAvailW, fairStationAvailW);
                probeMaxW = Math.min(probeMaxW, applyStrategyOverlay({plan: goalPlan, strategy: w.strategyOverlay,
                    userMode: w.userMode, autoSource: w.userAutoSource, targetW: probeMaxW, targetA: 0, minPowerW: nextProbeW}).targetW);
                probeMaxW = Math.min(probeMaxW, applyGoalPlan({plan: goalPlan, userMode: w.userMode, effectiveMode: effMode,
                    targetW: probeMaxW, targetA: 0, minPowerW: nextProbeW, maxPowerW: probeMaxW,
                    totalAvailableW: fairTotalAvailW, stationAvailableW: fairStationAvailW}).targetW);
                if (w.goalActive && Number(w.goalDesiredW) > 0) probeMaxW = Math.min(probeMaxW, Number(w.goalDesiredW));
            }
            // Auch Suchlast/Haltebrücke sind Netzanteile. Beim Phasenwechsel
            // ist der alte 1p-PV-Anteil nicht gleichzeitig als 3p-Probe verfügbar.
            if (typeof w.zeroExportGridMaxW === 'number') probeMaxW = Math.min(probeMaxW,
                (phaseTransition ? 0 : baseProbeW) + w.zeroExportGridMaxW);
            const boundedProbeNextW = phaseProbe ? Math.min(nextProbeW, probeMaxW)
                : Math.max(0, Math.floor((Math.min(nextProbeW, probeMaxW) + 1e-9) / stepW) * stepW);
            const zeroHold = requestZeroExportHold(this.adapter, {
                key: `evcs:${w.safe}`, now, baseW: baseProbeW, technicalMinW: technicalProbeMinW,
                maxW: probeMaxW, actualW: actualNowW, actualFresh: probeActualFresh,
                eligible: probeEligible && !phaseProbe, phaseTransition: phaseTransition
                    || Number(w.settleUntilMs || 0) > now,
            });
            // Nach einem Hold-Defizit darf eine neue Prüflast die feste Haltefrist
            // nicht verlängern. Erst echte stabile PV oder ein geregelter Neustart.
            const holdEpisode = this.adapter?._zeroExportPvCoordinator?.evcsRuns?.get(`evcs:${w.safe}`)?.episodeAt > 0;
            const zeroProbe = zeroHold.granted ? zeroHold : requestZeroExportProbe(this.adapter, {
                key: `evcs:${w.safe}`, now, baseW: phaseTransition ? 0 : baseProbeW,
                nextW: boundedProbeNextW, maxW: probeMaxW, priority: 100,
                eligible: probeEligible && !holdEpisode && probeMaxW >= (phaseProbe ? nextProbeW : technicalProbeMinW)
                    && boundedProbeNextW >= (phaseProbe ? nextProbeW : technicalProbeMinW),
                actualW: actualNowW, actualFresh: probeActualFresh,
                technicalMinW: phaseProbe ? nextProbeW : technicalProbeMinW,
                phaseTransition, phaseProbe,
            });
            if (zeroProbe.granted && Number(zeroProbe.validUntil) > now) {
                w.zeroExportProbeExtraW = Math.max(0, Number(zeroProbe.extraW) || 0);
                w.zeroExportProbeLeaseId = String(zeroProbe.leaseId || '');
                w.zeroExportProbeValidUntil = Number(zeroProbe.validUntil);
                w.zeroExportPhaseProbe = phaseProbe && zeroProbe.phaseProbe === true;
                if (w.zeroExportPhaseProbe) this._zeroExportPhaseLeaseBySafe.set(w.safe, {leaseId: zeroProbe.leaseId, validUntil: zeroProbe.validUntil});
                if (!phaseTransition) targetW = Math.max(targetW, Math.min(probeMaxW, Number(zeroProbe.targetW) || 0));
            } else this._zeroExportPhaseLeaseBySafe.delete(w.safe);
            const zeroProbeRunning = w.zeroExportProbeExtraW > 0 && !phaseTransition;
            await this._queueState(`${w.ch}.pvBridgePowerW`, zeroHold.granted ? zeroHold.extraW : 0, true);
            await this._queueState(`${w.ch}.pvRestartRemainingSec`, Math.max(0, Math.ceil((w.zeroExportRestartUntilMs - now) / 1000)), true);

            // Universeller Fahrzeug-Startvertrag für alle Wallbox-Protokolle:
            // Ein semantisch sicher verbundenes/startbares Fahrzeug darf vor dem
            // ersten Stromfluss eine zeitlich begrenzte technische Mindestvorgabe
            // erhalten. Das löst den Zirkelschluss bei Alfen Mode-3 B1/B2, OCPP
            // EVConnected/Occupied/Preparing und vergleichbaren Herstellerzuständen.
            // Ein ausdrücklicher Kein-Bedarf-, Fehler- oder Unplug-Zustand bleibt
            // autoritativ. Boost bleibt die bewusste Kunden-Prearm-Ausnahme.
            const positiveStartIntent = targetW >= Math.max(1, universalTechnicalStartW)
                && !shouldPauseChargingForGoalSoc(effMode, w.goalEnabled, w.goalStatus);
            const universalStartProbeAllowed = !!(
                w.vehicleDemandConfirmed !== true
                && w.vehicleStartEligible === true
                && w.vehiclePlugged === true
                && !vehicleStartCooldownActive
                && w.controlAvailable
                && w.controlBasis !== 'none'
                && effMode !== 'off'
                && positiveStartIntent
            );
            if (!isChargingCommandDemandAllowed(
                effMode,
                w.vehicleDemandConfirmed,
                w.vehicleStartEligible,
                universalStartProbeAllowed,
            )) {
                targetW = 0;
                targetA = 0;
                reason = vehicleStartCooldownActive ? ReasonCodes.NO_VEHICLE : ReasonCodes.NO_VEHICLE;
            } else if (universalStartProbeAllowed && !isBoost) {
                // Vor der ersten bestätigten Fahrzeugreaktion niemals sofort die
                // volle Leistung anfordern. Die technische Mindeststufe ist für
                // AC/Modbus, OCPP und leistungsgeregelte DC-Punkte gleichermaßen
                // kalkulierbar und bleibt innerhalb aller zuvor berechneten Caps.
                targetW = Math.min(targetW, universalTechnicalStartW);
                targetA = 0;
                w.vehicleStartProbeActive = targetW >= Math.max(1, universalTechnicalStartW);
            }

            // Ein frischer, connectorrichtig zugeordneter Fault ist ein echter
            // Aktor-Stopp. Erreichbarkeit bleibt separat online=true, damit ein
            // sicherer 0-W-Write weiterhin möglich ist.
            if (!w.controlAvailable) {
                targetW = 0;
                targetA = 0;
                reason = availabilityReason(!!w.cfgEnabled, !!w.userStationEnabled, !!w.userEnabled, !!w.online, !!w.faultActive, !!w.unavailableActive, !!w.rfidLockActive);
            }

            // PV-only Start / Ramp / Stop state machine
            // Goal:
            // - do not start a 3-phase session until the technical minimum is stably available
            // - after start, keep the session alive briefly so slow wallboxes / vehicles can ramp up
            // - only stop after a sustained deficit (small shortfalls may be bridged briefly)
            if (isPvOnly && !zeroProbeRunning) {
                const startReadyKey = String(w.safe || '');
                const needStartW = Math.max(0, pvTechnicalMinW || pvStartCommandW || 0);
                const startReadyBudgetW = Math.max(0, Math.min(
                    fairTotalAvailW,
                    fairStationAvailW,
                    (typeof pvStartReadyBudgetW === 'number' && Number.isFinite(pvStartReadyBudgetW)) ? pvStartReadyBudgetW : pvAvailW,
                    Number.isFinite(w.maxPW) ? w.maxPW : Number.POSITIVE_INFINITY,
                ));
                const startBudgetW = Math.max(0, Math.min(fairTotalAvailW, fairStationAvailW, pvAvailW, Number.isFinite(w.maxPW) ? w.maxPW : Number.POSITIVE_INFINITY));
                const holdBudgetW = Math.max(0, Math.min(fairTotalAvailW, fairStationAvailW, Number.isFinite(w.maxPW) ? w.maxPW : Number.POSITIVE_INFINITY));
                let startReadySince = this._pvStartReadySinceMs.get(startReadyKey) || 0;
                let belowMinSince = this._pvBelowMinSinceMs.get(startReadyKey) || 0;
                const canTrackPvRun = (w.vehicleDemandConfirmed === true || w.vehicleStartEligible === true) && w.controlAvailable && w.controlBasis !== 'none';

                if (!canTrackPvRun) {
                    this._pvStartReadySinceMs.delete(startReadyKey);
                    this._pvBelowMinSinceMs.delete(startReadyKey);
                } else {
                    if (startCooldownActive) {
                        this._pvStartReadySinceMs.delete(startReadyKey);
                        startReadySince = 0;
                        if (targetW > 0) {
                            targetW = 0;
                            targetA = 0;
                            reason = ReasonCodes.NO_PV_SURPLUS;
                        }
                    } else if (!actualOrCmdActive) {
                        if (needStartW <= 0 || startReadyBudgetW >= needStartW) {
                            if (!startReadySince) {
                                startReadySince = now;
                                this._pvStartReadySinceMs.set(startReadyKey, startReadySince);
                            }
                        } else {
                            this._pvStartReadySinceMs.delete(startReadyKey);
                            startReadySince = 0;
                        }
                    } else {
                        this._pvStartReadySinceMs.delete(startReadyKey);
                        startReadySince = 0;
                    }

                    const startStable = actualOrCmdActive
                        || needStartW <= 0
                        || (startReadySince > 0 && (pvStartStableMs <= 0 || (now - startReadySince) >= pvStartStableMs));

                    if (!actualOrCmdActive && targetW > 0 && !startStable) {
                        targetW = 0;
                        targetA = 0;
                        reason = ReasonCodes.NO_PV_SURPLUS;
                    }

                    if (actualOrCmdActive && needStartW > 0) {
                        const deficitW = Math.max(0, needStartW - startBudgetW);
                        const belowMinNow = deficitW > 1;
                        if (belowMinNow) {
                            if (!belowMinSince) {
                                belowMinSince = now;
                                this._pvBelowMinSinceMs.set(startReadyKey, belowMinSince);
                            }
                        } else {
                            this._pvBelowMinSinceMs.delete(startReadyKey);
                            belowMinSince = 0;
                        }

                        const stopDelayElapsed = belowMinSince > 0
                            && (pvConnectorStopDelayMs <= 0 || (now - belowMinSince) >= pvConnectorStopDelayMs);
                        const canHoldAtMin = holdBudgetW >= Math.max(1, needStartW)
                            && deficitW <= pvRunDeficitToleranceW;
                        const shouldKeepAlive = (startupHoldActive || minRunActive || !stopDelayElapsed) && canHoldAtMin;

                        if ((targetW <= 0 || targetW < needStartW) && belowMinNow && shouldKeepAlive) {
                            targetW = Math.min(Math.max(needStartW, 0), holdBudgetW);
                            targetA = 0;
                            reason = ReasonCodes.ALLOCATED;
                        } else if ((targetW <= 0 || targetW < needStartW) && belowMinNow && stopDelayElapsed) {
                            targetW = 0;
                            targetA = 0;
                            reason = ReasonCodes.NO_PV_SURPLUS;
                        }
                    } else if (!actualOrCmdActive) {
                        this._pvBelowMinSinceMs.delete(startReadyKey);
                    }
                }
            } else {
                this._pvStartReadySinceMs.delete(String(w.safe || ''));
                this._pvBelowMinSinceMs.delete(String(w.safe || ''));
                if (!isPvManaged) this._pvMinRunUntilMs.delete(String(w.safe || ''));
                if (!isPvManaged) this._pvStartCooldownUntilMs.delete(String(w.safe || ''));
            }

            // Der normale PV-Haltepfad darf ohne zentralen Hold keine verdeckte
            // Netzfreigabe erzeugen; Neustarts sind auch bei sofortiger Sonne gesperrt.
            if (w.zeroExportPvDependent && zeroMode.active && zeroRestartBlocked) {
                targetW = 0; targetA = 0; reason = ReasonCodes.NO_PV_SURPLUS;
            }

            // Convert to A for AC current-based control
            if (w.controlBasis === 'currentA' && w.setAKey) {
                const vFactor = w.vFactor;
                const maxA = w.maxA;
                const minA = w.minA;

                // Keep a hard W limit to avoid rounding up above our computed target (PV/budget safety)
                const hardLimitW = clamp(num(targetW, 0), 0, w.maxPW);

                let aRaw = (hardLimitW > 0 && vFactor > 0) ? (hardLimitW / vFactor) : 0;
                aRaw = clamp(aRaw, 0, maxA);

                // round DOWN to 0.1A to avoid budget overshoot
                let aRounded = Math.floor(aRaw * 10) / 10;

                // Apply minA (avoid rounding-down dropping below min)
                if (aRounded > 0 && aRounded < minA) {
                    // try rounding up to the next 0.1A step if that would satisfy minA
                    const aUp = Math.ceil(aRaw * 10) / 10;
                    if (aUp >= minA && aUp <= maxA) {
                        aRounded = aUp;
                    } else {
                        aRounded = 0;
                    }
                }

                // Clamp again to hardLimitW (avoid minA rounding up exceeding targetW)
                if (aRounded > 0 && vFactor > 0) {
                    const wRounded = aRounded * vFactor;
                    if (wRounded > hardLimitW + 0.001) {
                        const aMax = Math.floor((hardLimitW / vFactor) * 10) / 10;
                        aRounded = clamp(aMax, 0, maxA);
                    }
                }

                if (aRounded < minA) aRounded = 0;
                targetA = aRounded;
                targetW = targetA * vFactor;

                // Safety: enforce min power after quantization
                if (targetW > 0 && w.minPW > 0 && targetW < w.minPW) {
                    targetA = 0;
                    targetW = 0;
                    reason = ReasonCodes.BELOW_MIN;
                }
            } else if (w.chargerType === 'AC') {
                // purely informational for power-based AC
                const vFactor = w.vFactor;
                targetA = (targetW > 0 && vFactor > 0) ? (targetW / vFactor) : 0;
            } else {
                // DC: current is not summed
                targetA = 0;
            }

            // MU6.11 + PV-only soft-start:
            // - respect global/per-wallbox ramp limits
            // - for PV / Min+PV prefer a soft ramp profile
            // - on a fresh start jump directly to the technical minimum, then ramp upwards slowly
            let wbMaxDeltaW = clamp(num(w.maxDeltaWPerTick, maxDeltaWPerTick), 0, 1e12);
            let wbMaxDeltaA = clamp(num(w.maxDeltaAPerTick, maxDeltaAPerTick), 0, 1e6);
            if (isPvManaged) {
                wbMaxDeltaW = choosePositiveMin(wbMaxDeltaW, num(w.pvRampUpWPerTick, 0), pvRampUpWPerTick);
                wbMaxDeltaA = choosePositiveMin(wbMaxDeltaA, num(w.pvRampUpAperTick, 0), pvRampUpAperTick);
            }
            const wbStepW = clamp(num(w.stepW, stepW), 0, 1e12);
            const wbStepA = clamp(num(w.stepA, stepA), 0, 1e6);

            let cmdW = targetW;
            let cmdA = targetA;

            // Reaktionszeit beim Moduswechsel:
            // - PV-only startet wie bisher direkt mit seiner technischen Mindeststufe.
            // - Min+PV muss seine netzgestützte Mindestleistung ebenfalls sofort
            //   erreichen, auch wenn ein alter kleiner Sollwert (z. B. 300 W) noch im
            //   Cache steht. Erst die PV-Zusatzleistung oberhalb der Basis wird weich
            //   hochgeregelt. Dadurch entsteht beim Wechsel auf Min+PV kein zusätzlicher
            //   Null-/Rampenzyklus.
            const minPvBaseStartNeeded = isMinPv
                && minPvBaseW > 0
                && cmdW >= minPvBaseW
                && prevCmdWNorm + 1 < minPvBaseW;
            const pvManagedStartNow = isPvManaged
                && cmdW > 0
                && w.enabled
                && w.online
                && (w.vehicleDemandConfirmed === true || w.vehicleStartProbeActive === true)
                && (!prevCmdWasActive || minPvBaseStartNeeded);

            if (w.controlBasis === 'currentA' && w.setAKey) {
                cmdA = floorToStep(cmdA, wbStepA);
                cmdA = clamp(cmdA, 0, w.maxA);
                if (cmdA > 0 && w.minA > 0 && cmdA < w.minA) cmdA = 0;

                if (pvManagedStartNow) {
                    const minPvBaseA = (isMinPv && w.vFactor > 0)
                        ? Math.max(0, minPvBaseW / w.vFactor)
                        : 0;
                    cmdA = clamp(
                        Math.max(pvStartCommandA || w.minA || 0, w.minA || 0, minPvBaseA),
                        0,
                        w.maxA,
                    );
                } else {
                    cmdA = applyChargingModeRamp(prevCmdA, cmdA, wbMaxDeltaA, effMode);
                }

                if (cmdA > 0 && w.minA > 0 && cmdA < w.minA) cmdA = 0;
                cmdW = (cmdA > 0 && w.vFactor > 0) ? (cmdA * w.vFactor) : 0;
            } else {
                cmdW = floorToStep(cmdW, wbStepW);
                if (cmdW > 0 && w.minPW > 0 && cmdW < w.minPW) cmdW = 0;

                if (pvManagedStartNow) {
                    const minStartW = isMinPv
                        ? Math.max(minPvBaseW, w.minPW || 0)
                        : Math.max(pvStartCommandW || w.minPW || 0, w.minPW || 0);
                    cmdW = clamp(minStartW, 0, w.maxPW);
                } else {
                    cmdW = applyChargingModeRamp(prevCmdW, cmdW, wbMaxDeltaW, effMode);
                }

                if (cmdW > 0 && w.minPW > 0 && cmdW < w.minPW) cmdW = 0;

                if (w.chargerType === 'AC') {
                    cmdA = (cmdW > 0 && w.vFactor > 0) ? (cmdW / w.vFactor) : 0;
                } else {
                    cmdA = 0;
                }
            }

            try {
                if (feneconEvPriorityActive && wallboxHasEvPriorityDemand(w)) {
                    const tolW = Math.max(50, (typeof w.maxPW === 'number' && Number.isFinite(w.maxPW) && w.maxPW > 0) ? (w.maxPW * 0.01) : 50);

                    if (isPvOnly) {
                        const pvShortage = reason === ReasonCodes.NO_PV_SURPLUS || limiter === 'pv';
                        if (pvShortage && cmdW < (w.maxPW - tolW)) {
                            evPriorityLimitedWallboxes += 1;
                            evPriorityStarvedW += Math.max(0, w.maxPW - cmdW);
                        }
                    } else if (isMinPv) {
                        const minBaseW = minPvBaseW;
                        const maxTotalW = (typeof minpvMaxTotal === 'number' && Number.isFinite(minpvMaxTotal)) ? Math.max(0, minpvMaxTotal) : 0;
                        const extraPossibleW = Math.max(0, Math.min(w.maxPW, maxTotalW) - Math.min(minBaseW, maxTotalW));
                        const extraDeliveredW = Math.max(0, cmdW - Math.min(minBaseW, cmdW));
                        const pvShortage = Number.isFinite(pvAvailW) && (pvAvailW + tolW) < extraPossibleW;
                        if (pvShortage && (extraDeliveredW + tolW) < extraPossibleW) {
                            evPriorityLimitedWallboxes += 1;
                            evPriorityStarvedW += Math.max(0, extraPossibleW - extraDeliveredW);
                        }
                    }

                    // Prioritätslücke unabhängig vom aktuellen PV-Limiter:
                    // Wenn ein PV-/Min+PV-Ladepunkt noch nicht bis zur nicht-PV-begrenzten
                    // technischen/harten Grenze hochgeregelt ist, darf der Speicher den PV-Überschuss
                    // nicht parallel wegfangen. Erst wenn die Wallbox ihr mögliches Ziel erreicht hat,
                    // darf Rest-PV in den Speicher gehen.
                    const nonPvAvailW = Math.min(
                        w.maxPW,
                        Number.isFinite(fairTotalAvailW) ? fairTotalAvailW : Number.POSITIVE_INFINITY,
                        Number.isFinite(fairStationAvailW) ? fairStationAvailW : Number.POSITIVE_INFINITY,
                    );
                    const nonPvTargetW = Number.isFinite(nonPvAvailW) ? Math.max(0, nonPvAvailW) : Math.max(0, w.maxPW || 0);
                    const evPriorityCanUseNow = (targetW > tolW) || (cmdW > tolW) || actualOrCmdActive;
                    const openW = Math.max(0, nonPvTargetW - Math.max(0, cmdW));
                    if (evPriorityCanUseNow && openW > tolW) {
                        evPriorityPendingW += openW;
                    }
                }
            } catch {
                // ignore
            }

            // Universeller Startprobe-Vertrag für alle steuerbaren Wallboxen.
            // Vor bestätigtem Leistungsfluss wird nur die technische Mindeststufe
            // angefordert. Bleibt die Fahrzeug-/Wallboxreaktion aus, endet der
            // Versuch deterministisch und ein Cooldown verhindert Pendeln. Die
            // Kommunikation selbst verbleibt vollständig beim jeweiligen Adapter.
            try {
                const actualNowForProbeW = Math.max(0, Number(w.actualPowerW) || 0);
                const cmdProbeW = Math.max(0, Number(cmdW) || 0);
                let startAttemptSince = Number(this._vehicleStartAttemptSinceMs.get(w.safe)) || 0;
                const responseTimeoutMs = Math.max(
                    1000,
                    Number(w.vehicleStartResponseTimeoutMs) || vehicleStartResponseTimeoutMs,
                );
                const universalProbeRunning = !!(
                    !isBoost
                    && w.vehicleStartProbeActive === true
                    && w.vehicleDemandConfirmed !== true
                    && w.vehicleStartEligible === true
                    && w.controlAvailable
                    && !vehicleStartCooldownActive
                    && cmdProbeW >= Math.max(1, universalTechnicalStartW)
                    && actualNowForProbeW < activityThresholdW
                );

                if (w.vehicleDemandConfirmed === true || actualNowForProbeW >= activityThresholdW || w.charging === true) {
                    this._vehicleStartAttemptSinceMs.delete(w.safe);
                    this._vehicleStartCooldownUntilMs.delete(w.safe);
                    this._pvStartAttemptSinceMs.delete(w.safe);
                    startAttemptSince = 0;
                    w.vehicleStartProbeActive = false;
                    w.vehicleStartCooldownActive = false;
                    w.vehicleStartCooldownUntilMs = 0;
                } else if (universalProbeRunning) {
                    if (!(startAttemptSince > 0)) {
                        startAttemptSince = now;
                        this._vehicleStartAttemptSinceMs.set(w.safe, startAttemptSince);
                        if (isPvOnly) this._pvStartAttemptSinceMs.set(w.safe, startAttemptSince);
                    } else if ((now - startAttemptSince) >= responseTimeoutMs) {
                        targetW = 0;
                        targetA = 0;
                        cmdW = 0;
                        cmdA = 0;
                        reason = ReasonCodes.NO_VEHICLE;
                        limiter = 'vehicle-start-no-response';
                        const retryMs = Math.max(
                            vehicleStartRetryCooldownMs,
                            isPvOnly ? pvStartRetryCooldownMs : 0,
                        );
                        const retryAt = retryMs > 0 ? now + retryMs : now;
                        if (retryAt > now) this._vehicleStartCooldownUntilMs.set(w.safe, retryAt);
                        else this._vehicleStartCooldownUntilMs.delete(w.safe);
                        if (isPvOnly && retryAt > now) this._pvStartCooldownUntilMs.set(w.safe, retryAt);
                        this._vehicleStartAttemptSinceMs.delete(w.safe);
                        this._pvStartAttemptSinceMs.delete(w.safe);
                        this._pvStartReadySinceMs.delete(w.safe);
                        this._pvBelowMinSinceMs.delete(w.safe);
                        this._pvStartupUntilMs.delete(w.safe);
                        this._pvMinRunUntilMs.delete(w.safe);
                        startAttemptSince = 0;
                        w.vehicleStartProbeActive = false;
                        w.vehicleStartCooldownActive = retryAt > now;
                        w.vehicleStartCooldownUntilMs = retryAt > now ? retryAt : 0;
                    }
                } else {
                    // Kein aktiver positiver Startwunsch (z. B. Tarif/PV/Budget
                    // blockiert): Timer zurücksetzen, aber einen bereits gesetzten
                    // Cooldown nicht umgehen.
                    this._vehicleStartAttemptSinceMs.delete(w.safe);
                    this._pvStartAttemptSinceMs.delete(w.safe);
                    startAttemptSince = 0;
                    w.vehicleStartProbeActive = false;
                }

                w.vehicleStartProbeSinceMs = startAttemptSince;
                if (!Number.isFinite(Number(w.vehicleStartCooldownUntilMs))) {
                    w.vehicleStartCooldownUntilMs = Number(this._vehicleStartCooldownUntilMs.get(w.safe)) || 0;
                }
                await this._queueState(`${w.ch}.vehicleStartProbeActive`, w.vehicleStartProbeActive === true, true);
                await this._queueState(`${w.ch}.vehicleStartProbeSince`, Math.max(0, Number(w.vehicleStartProbeSinceMs) || 0), true);
                await this._queueState(`${w.ch}.vehicleStartCooldownUntil`, Math.max(0, Number(w.vehicleStartCooldownUntilMs) || 0), true);
            } catch {
                // Diagnose-/Startprobe darf die Regelung nicht stoppen.
            }

            // Die neue Netzanteilgrenze gilt auch nach Rampen/Start-Minimum.
            // Rücknahme sofort; Erhöhung bleibt dem vorhandenen Rampenpfad überlassen.
            if (typeof w.zeroExportGridMaxW === 'number') {
                const netBaseW = isPvOnly ? Math.min(w.zeroExportGridMaxW, w.zeroExportProbeExtraW || 0)
                    : isMinPv ? minPvGridBaseW : w.zeroExportGridMaxW;
                const confirmedAvailableW = Number.isFinite(pvPhysicalRemainingW) ? Math.max(0, pvPhysicalRemainingW) : 0;
                const hardModeW = Math.min(w.maxPW, netBaseW + confirmedAvailableW + (Number(w.zeroExportStorageCreditW) || 0));
                if (cmdW > hardModeW) {
                    if (w.controlBasis === 'currentA') {
                        cmdA = floorToStep(hardModeW / Math.max(1, w.vFactor), wbStepA);
                        if (cmdA < w.minA) cmdA = 0;
                        cmdW = cmdA * w.vFactor;
                    } else {
                        cmdW = floorToStep(hardModeW, wbStepW);
                        if (cmdW < w.minPW) cmdW = 0;
                        cmdA = w.chargerType === 'AC' ? cmdW / Math.max(1, w.vFactor) : 0;
                    }
                }
            }

            // Station diagnostics: sum commanded power per station
            if (_sk) {
                stationTargetSumW.set(_sk, (stationTargetSumW.get(_sk) || 0) + cmdW);
            }

            let batteryContributionThisW = 0;

            // Apply total budget accounting (use commanded power). The base pool is available
            // to all wallboxes; the storage-assist pool is only available to wallboxes where
            // installer freigegeben + customer enabled + storage policy is currently allowed.
            if (Number.isFinite(remainingW)) {
                const consumedW = Math.max(0, cmdW);
                let baseConsumedW = 0;
                if (Number.isFinite(nonStorageRemainingW)) {
                    baseConsumedW = Math.min(Math.max(0, nonStorageRemainingW), consumedW);
                    nonStorageRemainingW = Math.max(0, nonStorageRemainingW - baseConsumedW);
                } else {
                    baseConsumedW = consumedW;
                }
                if (!zeroExportChargingActive && storageEligible && storageAssistRemainingW > 0) {
                    const restW = Math.max(0, consumedW - baseConsumedW);
                    batteryContributionThisW = Math.min(storageAssistRemainingW, restW);
                    storageAssistRemainingW = Math.max(0, storageAssistRemainingW - batteryContributionThisW);
                }
                remainingW = Math.max(0, remainingW - consumedW);
                usedW += consumedW;
            }
            if (typeof w.zeroExportGridMaxW === 'number' && !isPvOnly) {
                const netBaseW = isMinPv ? minPvGridBaseW : w.zeroExportGridMaxW;
                batteryContributionThisW = Math.min(Number(w.zeroExportStorageCreditW) || 0, Math.max(0, cmdW - netBaseW));
            }

            try {
                w.batteryContributionW = batteryContributionThisW;
                await this._queueState(`${w.ch}.batteryContributionW`, Math.round(batteryContributionThisW), true);
            } catch {
                // ignore
            }

            // Apply station cap accounting (shared between connectors of same station)
            if (w.stationKey && stationRemainingW && stationRemainingW.has(w.stationKey)) {
                const prev = stationRemainingW.get(w.stationKey);
                if (typeof prev === 'number' && Number.isFinite(prev)) {
                    stationRemainingW.set(w.stationKey, Math.max(0, prev - cmdW));
                }
            }

            // Apply PV budget accounting. Reine PV-Ladung reduziert beide
            // Toepfe; Min+PV reduziert nur den physikalischen PV-Rest oberhalb
            // seiner netzgestuetzten Mindestleistung.
            let pvUsedThisW = 0;
            if (isPvOnly) {
                pvUsedThisW = Math.max(0, cmdW - Math.min(cmdW, w.zeroExportProbeExtraW || 0));
                if (Number.isFinite(pvPureRemainingW)) {
                    pvPureRemainingW = Math.max(0, pvPureRemainingW - pvUsedThisW);
                }
                if (Number.isFinite(pvPhysicalRemainingW)) {
                    pvPhysicalRemainingW = Math.max(0, pvPhysicalRemainingW - pvUsedThisW);
                }
            } else if (isMinPv) {
                const base = minPvGridBaseW > 0 ? Math.min(cmdW, minPvGridBaseW) : 0;
                pvUsedThisW = Math.max(0, cmdW - base - (typeof w.zeroExportGridMaxW === 'number' ? batteryContributionThisW : 0));
                if (Number.isFinite(pvPhysicalRemainingW)) {
                    pvPhysicalRemainingW = Math.max(0, pvPhysicalRemainingW - pvUsedThisW);
                }
            } else if (typeof w.zeroExportGridMaxW === 'number') {
                pvUsedThisW = Math.max(0, cmdW - w.zeroExportGridMaxW - batteryContributionThisW);
                if (Number.isFinite(pvPhysicalRemainingW)) pvPhysicalRemainingW = Math.max(0, pvPhysicalRemainingW - pvUsedThisW);
            }
            w.zeroExportPvCreditW = pvUsedThisW;
            pvUsedW += pvUsedThisW;

            totalTargetPowerW += cmdW;
            if (Number.isFinite(cmdA) && cmdA > 0) totalTargetCurrentA += cmdA;

            // 0.8.65: Zentralbudget nur für echten Ladebedarf reservieren.
            // Online/idle Ladepunkte oder alte Zielwerte dürfen nachgelagerte Verbraucher nicht blockieren.
            const demandActualW = Math.max(0, actualNowW);
            const demandCommandW = Math.max(0, Number.isFinite(cmdW) ? cmdW : 0);
            const demandTargetW = Math.max(0, Number.isFinite(targetW) ? targetW : 0);
            const commandDemandAllowed = isChargingCommandDemandAllowed(effMode, w.vehicleDemandConfirmed, w.vehicleStartEligible, w.vehicleStartProbeActive);
            const activeChargingDemand = !!(
                w.enabled
                && w.online
                && w.controlBasis !== 'none'
                && commandDemandAllowed
                && (
                    w.charging === true
                    || demandActualW >= activityThresholdW
                    || demandCommandW >= activityThresholdW
                    || demandTargetW >= activityThresholdW
                    || (w.goalActive === true && Math.max(demandCommandW, demandTargetW) > 0)
                )
            );
            const demandReserveThisW = activeChargingDemand ? Math.max(demandActualW, demandCommandW, demandTargetW) : 0;
            if (demandReserveThisW > 0) {
                evcsActiveDemandReserveW += demandReserveThisW;

                // PV-Reservierung besteht aus zwei bewusst getrennten Signalen:
                // 1) tatsaechlich im aktuellen Allocation-Schritt genutzter PV-Anteil,
                // 2) aktiver PV-Ladeintent aus Ist-, Kommando- oder Zielwert.
                // Der Intent verhindert eine kurzzeitige Freigabe des EVCS-Anteils an
                // den Speicher, wenn PV-Hysterese oder Wallbox-Telemetrie fuer einen
                // einzelnen Tick noch keinen pvUsedThisW liefern. Der zentrale EVCS-Cap
                // begrenzt diesen Wert spaeter weiterhin strikt auf die Kundenvorgabe.
                const demandPvActualThisW = Math.max(0, Math.min(demandReserveThisW, pvUsedThisW || 0));
                const demandPvIntentThisW = computePvManagedDemandIntentW(effMode, Math.max(0, demandReserveThisW
                    - (w.zeroExportProbeExtraW || 0) - (typeof w.zeroExportGridMaxW === 'number' ? batteryContributionThisW : 0)), isMinPv ? minPvBaseW : w.minPW);
                evcsActiveDemandPvReserveW += demandPvActualThisW;
                evcsActiveDemandPvIntentW += demandPvIntentThisW;
                if (isPvOnly) evcsActiveDemandPurePvIntentW += demandPvIntentThisW;
                evcsActiveDemandWallboxes += 1;
            }

            // Writes (consumer abstraction)
            let applied = false;
            let applyStatus = 'skipped';
            /** @type {any|null} */
            let applyWrites = null;

            // TS-Migration 0.7.126:
            // Die Zielwerte wurden oben weiterhin als Fallback-Referenz berechnet, werden
            // aber nicht mehr direkt hier geschrieben. Nach dem vollständigen Allocation-
            // Snapshot übernimmt der produktive TS-Write-Plan den normalen Schreibpfad;
            // diese JS-Werte dienen nur noch als Executor-Fallback.
            applyStatus = 'planned_by_ts_write_plan';

            // Command-Caches werden ausschliesslich im zentralen Write-Executor
            // nach einem akzeptierten Hardware-Write aktualisiert. Ein geplanter,
            // aber fehlgeschlagener Sollwert darf weder Rampenbasis noch NVP-
            // Prognose als ausgefuehrt erscheinen lassen.

            // If a PV-only start attempt collapses before the wallbox reports real power,
            // wait briefly before trying again. This prevents repeated short start pulses
            // while still allowing the same PV window to recover after a few minutes.
            try {
                if (isPvOnly && actualNowW >= activityThresholdW) {
                    this._pvStartCooldownUntilMs.delete(w.safe);
                } else if (isPvOnly
                    && pvStartRetryCooldownMs > 0
                    && prevCmdWasActive
                    && cmdW < activityThresholdW
                    && actualNowW < activityThresholdW
                    && w.charging !== true
                    && w.controlAvailable
                    && (w.vehicleDemandConfirmed === true || w.vehicleStartEligible === true)
                    && (reason === ReasonCodes.NO_PV_SURPLUS || reason === ReasonCodes.BELOW_MIN || limiter === 'pv')) {
                    this._pvStartCooldownUntilMs.set(w.safe, now + pvStartRetryCooldownMs);
                    this._pvStartReadySinceMs.delete(w.safe);
                    this._pvBelowMinSinceMs.delete(w.safe);
                    this._pvStartupUntilMs.delete(w.safe);
                    this._pvMinRunUntilMs.delete(w.safe);
                } else if (!isPvOnly || (w.vehicleDemandConfirmed !== true && w.vehicleStartEligible !== true) || !w.controlAvailable) {
                    this._pvStartCooldownUntilMs.delete(w.safe);
                }
            } catch {
                // ignore
            }

            // PV-Start Einschwingzeit + Mindestlaufzeit:
            // Einige Wallboxen/Fahrzeuge übernehmen nach der Freigabe die neue Leistung verzögert.
            // Damit wir direkt nach dem Start nicht wieder auf 0 regeln, halten wir eine kurze
            // Settling-Phase offen und merken uns zusätzlich eine kleine Mindestlaufzeit.
            try {
                const genericPvStartSettleMs = clamp(num(cfg.pvStartSettleSec, 20), 0, 3600) * 1000;
                const pvStartSettleMs = w.telemetryProfile === 'ocpp-1.6-event-driven'
                    ? Math.max(genericPvStartSettleMs, ocppStartSettleMs)
                    : genericPvStartSettleMs;
                const cmdStartsNow = isPvManaged
                    && pvStartSettleMs >= 0
                    && w.controlAvailable
                    && (w.vehicleDemandConfirmed === true || w.vehicleStartProbeActive === true)
                    && !prevCmdWasActive
                    && cmdW >= activityThresholdW;

                if (cmdStartsNow) {
                    if (pvStartSettleMs > 0) this._pvStartupUntilMs.set(w.safe, now + pvStartSettleMs);
                    else this._pvStartupUntilMs.delete(w.safe);
                    if (isPvOnly && pvMinRunMs > 0) this._pvMinRunUntilMs.set(w.safe, now + pvMinRunMs);
                    else if (!isPvOnly) this._pvMinRunUntilMs.delete(w.safe);
                    this._pvStartReadySinceMs.delete(w.safe);
                    this._pvBelowMinSinceMs.delete(w.safe);
                } else if (actualNowW >= activityThresholdW || cmdW < activityThresholdW
                    || (w.vehicleDemandConfirmed !== true && w.vehicleStartEligible !== true)
                    || !w.controlAvailable || !isPvManaged) {
                    this._pvStartupUntilMs.delete(w.safe);
                    if (cmdW < activityThresholdW || !isPvOnly) this._pvMinRunUntilMs.delete(w.safe);
                    if (cmdW < activityThresholdW) this._pvBelowMinSinceMs.delete(w.safe);
                } else {
                    const holdUntil = this._pvStartupUntilMs.get(w.safe) || 0;
                    if (holdUntil > 0 && now >= holdUntil) this._pvStartupUntilMs.delete(w.safe);
                    const minRunUntil = this._pvMinRunUntilMs.get(w.safe) || 0;
                    if (minRunUntil > 0 && now >= minRunUntil) this._pvMinRunUntilMs.delete(w.safe);
                }
            } catch {
                // ignore
            }

            // Ziel-Laden: Shortfall & Status Update (nach Quantisierung/Ramp)
            try {
                const goalCommandStatus = resolveGoalCommandStatus({
                    goalEnabled: w.goalEnabled, goalStatus: w.goalStatus,
                    goalActive: w.goalActive, goalDesiredW: w.goalDesiredW,
                    goalOverdue: w.goalOverdue, plan: w.goalPlan, commandW: cmdW,
                });
                await this._queueState(`${w.ch}.goalShortfallW`, goalCommandStatus.shortfallW, true);
                await this._queueState(`${w.ch}.goalStatus`, goalCommandStatus.status, true);
            } catch {
                // ignore
            }

            await this._queueState(`${w.ch}.targetCurrentA`, cmdA, true);
            await this._queueState(`${w.ch}.targetPowerW`, cmdW, true);
            // Stationsgruppe: verbleibendes Stationsbudget (nach Abzug dieses Connectors)
            try {
                const rem = (w.stationKey && stationRemainingW && stationRemainingW.has(w.stationKey))
                    ? stationRemainingW.get(w.stationKey)
                    : null;
                await this._queueState(`${w.ch}.stationRemainingW`, (typeof rem === 'number' && Number.isFinite(rem)) ? rem : 0, true);
            } catch {
                // ignore
            }
            await this._queueState(`${w.ch}.applied`, applied, true);
            await this._queueState(`${w.ch}.applyStatus`, applyStatus, true);
            if (applyWrites) {
                try {
                    await this._queueState(`${w.ch}.applyWrites`, JSON.stringify(applyWrites), true);
                } catch {
                    await this._queueState(`${w.ch}.applyWrites`, '', true);
                }
            } else {
                await this._queueState(`${w.ch}.applyWrites`, '', true);
            }
            await this._queueState(`${w.ch}.reason`, reason, true);

            debugAlloc.push({
                safe: w.safe,
                name: w.name,
                effectiveMode: effMode,
                userMode: w.userMode,
                userAutoSource: w.userAutoSource,
                strategyEligible: !!(w.strategyOverlay && w.strategyOverlay.eligible),
                strategyActive: !!(w.strategyOverlay && w.strategyOverlay.active),
                strategyFallbackPause: !!(w.strategyOverlay && w.strategyOverlay.fallbackPause),
                strategyAction: String(w.strategyOverlay && w.strategyOverlay.action || 'standard'),
                strategyRequestedPowerW: Math.max(0, Number(w.strategyOverlay && w.strategyOverlay.targetPowerW) || 0),
                strategyReason: String(w.strategyOverlay && w.strategyOverlay.reason || ''),
                charging: !!w.charging,
                chargingSinceMs: w.chargingSinceMs || 0,
                actualPowerW: Math.max(0, Math.round(finiteChargingAuditNumber(w.actualPowerW, 0))), actualPowerRawW: Math.max(0, Math.round(finiteChargingAuditNumber(w.actualPowerRawW, finiteChargingAuditNumber(w.actualPowerW, 0)))), meterStale: w.meterStale === true, telemetryProfile: String(w.telemetryProfile || ''),
                online: !!w.online,
                userStationEnabled: !!w.userStationEnabled,
                stationEnabled: !!w.stationEnabled,
                rfidAuthorized: w.rfidAuthorized !== false,
                rfidEnforced: !!w.rfidEnforced,
                rfidLockActive: !!w.rfidLockActive,
                rfidReason: String(w.rfidReason || ''),
                availabilityOwner: String(w.availabilityOwner || ''),
                availabilityRequested: w.availabilityRequested === true,
                availabilityRequestReason: String(w.availabilityRequestReason || ''),
                enabled: !!w.enabled,
                controlAvailable: !!w.controlAvailable,
                onlineSource: String(w.onlineSource || ''),
                statusClass: String(w.statusClass || ''),
                statusEffective: String(w.statusEffective || ''),
                faultActive: !!w.faultActive,
                faultReason: String(w.faultReason || ''),
                unavailableActive: !!w.unavailableActive,
                unavailableReason: String(w.unavailableReason || ''),
                operationalBlocked: !!w.operationalBlocked,
                connected: w.vehiclePlugged === true,
                vehicleDemandConfirmed: w.vehicleDemandConfirmed === true,
                vehicleStartEligible: w.vehicleStartEligible === true,
                vehicleStartProbeActive: w.vehicleStartProbeActive === true,
                vehicleStartCooldownActive: w.vehicleStartCooldownActive === true,
                vehicleStartProbeSinceMs: Math.max(0, Number(w.vehicleStartProbeSinceMs) || 0),
                vehicleStartCooldownUntilMs: Math.max(0, Number(w.vehicleStartCooldownUntilMs) || 0),
                vehicleStateNormalized: String(w.vehicleStateNormalized || 'unknown'),
                vehicleStartEligibilityReason: String(w.vehicleStartEligibilityReason || ''),
                vehicleDemandSource: String(w.vehicleDemandSource || ''),
                vehicleDemandReason: String(w.vehicleDemandReason || ''),
                vehicleStartResponseTimeoutSec: Math.max(0, Number(w.vehicleStartResponseTimeoutSec) || 0),
                priority: w.priority,
                orderIndex: w.orderIndex || 0,
                allocationRank: w.allocationRank || 0,
                goalActive: !!w.goalActive,
                goalFinishTs: w.goalFinishTs || 0,
                goalUrgency: w.goalUrgency || 0,
                goalDesiredW: w.goalDesiredW || 0,
                goalOverdue: !!w.goalOverdue,
                controlBasis: w.controlBasis,
                chargerType: w.chargerType,
                minPowerW: w.minPW,
                maxPowerW: w.maxPW,
                phaseCount: w.phases,
                stationKey: w.stationKey || '',
                stationMaxPowerW: (typeof w.stationMaxPowerW === 'number' && Number.isFinite(w.stationMaxPowerW)) ? w.stationMaxPowerW : 0,
                connectorNo: w.connectorNo || 0,
                rawTargetW: targetW,
                rawTargetA: targetA,
                targetW: cmdW,
                targetA: cmdA,
                activeDemand: !!activeChargingDemand,
                demandReserveW: demandReserveThisW,
                pvUsedW: pvUsedThisW,
                batteryContributionW: batteryContributionThisW,
                storageAssistCustomerAllowed: !!w.storageAssistCustomerAllowed,
                userStorageAssistEnabled: !!w.userStorageAssistEnabled,
                effectiveStorageAssist: !!w.effectiveStorageAssist,
                storageAssistBlockedReason: String(w.storageAssistBlockedReason || ''),
                pvRemainingW: Number.isFinite(pvAvailW) ? pvAvailW : null,
                pvPureRemainingW: Number.isFinite(pvPureRemainingW) ? pvPureRemainingW : null,
                pvPhysicalRemainingW: Number.isFinite(pvPhysicalRemainingW) ? pvPhysicalRemainingW : null,
                applied,
                applyStatus,
                applyWrites,
                reason,
                boost: isBoost,
                boostPrearmed: isBoost && w.vehicleDemandConfirmed !== true,
                pvLimited: isPvOnly || isMinPv,
                hasSetpoint: !!(w.setAKey || w.setWKey),
                setAKey: w.setAKey || '',
                setWKey: w.setWKey || '',
                enableKey: w.enableKey || '',
                writeRequired: !!((w.setAKey || w.setWKey) && !!w.online),
            });
        }

        // Wallboxes without positive control availability expose targets as 0.
        // - userEnabled=false: EMS-Regelung aus, Station bleibt hardwareseitig freigegeben.
        // - userStationEnabled=false: Kunde sperrt die Station, Setpoint 0 und Enable=false.
        // - PV-Warten: controlAvailable bleibt wahr, Setpoint 0 und Enable=true.
        for (const w of wbList) {
            if (w.controlAvailable) continue;

            let applied = false;
            let applyStatus = 'skipped';
            /** @type {any|null} */
            let applyWrites = null;

            // Regelung AUS, Kunden-Sperre oder frischer Betriebsfehler: sicheren 0-Sollwert planen.
            if (!!w.online && (!w.cfgEnabled || !w.userStationEnabled || !w.userEnabled || w.rfidLockActive || w.operationalBlocked)) {
                // TS-Migration 0.7.126: Auch der sichere 0-Wert bei kundenseitig
                // deaktivierter Regelung wird im Normalpfad vom produktiven TS-Write-Plan
                // ausgeführt. JS bleibt Executor/Fallback, schreibt hier aber nicht doppelt.
                applyStatus = 'planned_by_ts_write_plan';
            }

            await this._queueState(`${w.ch}.targetCurrentA`, 0, true);
            await this._queueState(`${w.ch}.targetPowerW`, 0, true);
            await this._queueState(`${w.ch}.applied`, applied, true);
            await this._queueState(`${w.ch}.applyStatus`, applyStatus, true);
            if (applyWrites) {
                try {
                    await this._queueState(`${w.ch}.applyWrites`, JSON.stringify(applyWrites), true);
                } catch {
                    await this._queueState(`${w.ch}.applyWrites`, '', true);
                }
            } else {
                await this._queueState(`${w.ch}.applyWrites`, '', true);
            }
            const offReason = availabilityReason(!!w.cfgEnabled, !!w.userStationEnabled, !!w.userEnabled, !!w.online, !!w.faultActive, !!w.unavailableActive, !!w.rfidLockActive);
            await this._queueState(`${w.ch}.reason`, offReason, true);
            debugAlloc.push({
                safe: w.safe,
                name: w.name,
                effectiveMode: String(w.effectiveMode || 'normal'),
                userMode: w.userMode || '',
                charging: !!w.charging,
                chargingSinceMs: w.chargingSinceMs || 0,
                actualPowerW: Math.max(0, Math.round(finiteChargingAuditNumber(w.actualPowerW, 0))), actualPowerRawW: Math.max(0, Math.round(finiteChargingAuditNumber(w.actualPowerRawW, finiteChargingAuditNumber(w.actualPowerW, 0)))), meterStale: w.meterStale === true, telemetryProfile: String(w.telemetryProfile || ''),
                online: !!w.online,
                userStationEnabled: !!w.userStationEnabled,
                stationEnabled: !!w.stationEnabled,
                rfidAuthorized: w.rfidAuthorized !== false,
                rfidEnforced: !!w.rfidEnforced,
                rfidLockActive: !!w.rfidLockActive,
                rfidReason: String(w.rfidReason || ''),
                availabilityOwner: String(w.availabilityOwner || ''),
                availabilityRequested: w.availabilityRequested === true,
                availabilityRequestReason: String(w.availabilityRequestReason || ''),
                enabled: !!w.enabled,
                controlAvailable: !!w.controlAvailable,
                onlineSource: String(w.onlineSource || ''),
                statusClass: String(w.statusClass || ''),
                statusEffective: String(w.statusEffective || ''),
                faultActive: !!w.faultActive,
                faultReason: String(w.faultReason || ''),
                unavailableActive: !!w.unavailableActive,
                unavailableReason: String(w.unavailableReason || ''),
                operationalBlocked: !!w.operationalBlocked,
                connected: w.vehiclePlugged === true,
                vehicleDemandConfirmed: w.vehicleDemandConfirmed === true,
                vehicleStartEligible: w.vehicleStartEligible === true,
                vehicleStartProbeActive: w.vehicleStartProbeActive === true,
                vehicleStartCooldownActive: w.vehicleStartCooldownActive === true,
                vehicleStartProbeSinceMs: Math.max(0, Number(w.vehicleStartProbeSinceMs) || 0),
                vehicleStartCooldownUntilMs: Math.max(0, Number(w.vehicleStartCooldownUntilMs) || 0),
                vehicleStateNormalized: String(w.vehicleStateNormalized || 'unknown'),
                vehicleStartEligibilityReason: String(w.vehicleStartEligibilityReason || ''),
                vehicleDemandSource: String(w.vehicleDemandSource || ''),
                vehicleDemandReason: String(w.vehicleDemandReason || ''),
                vehicleStartResponseTimeoutSec: Math.max(0, Number(w.vehicleStartResponseTimeoutSec) || 0),
                priority: w.priority,
                orderIndex: w.orderIndex || 0,
                allocationRank: w.allocationRank || 0,
                goalActive: !!w.goalActive,
                goalFinishTs: w.goalFinishTs || 0,
                goalUrgency: w.goalUrgency || 0,
                goalDesiredW: w.goalDesiredW || 0,
                goalOverdue: !!w.goalOverdue,
                controlBasis: w.controlBasis,
                chargerType: w.chargerType,
                minPowerW: w.minPW,
                maxPowerW: w.maxPW,
                phaseCount: w.phases,
                stationKey: w.stationKey || '',
                stationMaxPowerW: (typeof w.stationMaxPowerW === 'number' && Number.isFinite(w.stationMaxPowerW)) ? w.stationMaxPowerW : 0,
                connectorNo: w.connectorNo || 0,
                rawTargetW: 0,
                rawTargetA: 0,
                targetW: 0,
                targetA: 0,
                activeDemand: false,
                demandReserveW: 0,
                pvUsedW: 0,
                pvRemainingW: Number.isFinite(pvPureRemainingW) ? pvPureRemainingW : null,
                pvPureRemainingW: Number.isFinite(pvPureRemainingW) ? pvPureRemainingW : null,
                pvPhysicalRemainingW: Number.isFinite(pvPhysicalRemainingW) ? pvPhysicalRemainingW : null,
                applied,
                applyStatus,
                applyWrites,
                reason: offReason,
                boost: false,
                pvLimited: false,
                hasSetpoint: !!(w.setAKey || w.setWKey),
                setAKey: w.setAKey || '',
                setWKey: w.setWKey || '',
                enableKey: w.enableKey || '',
                writeRequired: !!((w.setAKey || w.setWKey || w.enableKey) && !!w.online && (!w.cfgEnabled || !w.userStationEnabled || !w.userEnabled || w.rfidLockActive || w.operationalBlocked)),
            });
        }

        /**
         * Code-Teil: zentrale PV-Intent-Reservierung vor Speicherregelung
         * Zweck: Ermittelt nach der realen Wallbox-Allokation den noch offenen,
         * technisch nutzbaren PV-Bedarf verbundener Ladepunkte. Dieser zweite
         * Durchlauf ist bewusst nach allen Sollwerten angeordnet: Erst dadurch
         * sind Anschluss-, Stations- und aktive EVCS-Verbraeuche eindeutig
         * abgezogen, sodass mehrere Ladepunkte denselben Rest nicht doppelt
         * reservieren koennen.
         */
        try {
            const centralPurePvCapW = Math.max(0, Number(pvStartReadyBudgetW) || 0);
            const centralPhysicalPvCapW = Math.max(0, Number(pvPhysicalCapW) || 0);
            let pendingPurePvRemainingW = Math.max(
                0,
                centralPurePvCapW - Math.min(
                    centralPurePvCapW,
                    Math.max(0, Number(evcsActiveDemandPurePvIntentW) || 0),
                ),
            );
            let pendingPhysicalPvRemainingW = Math.max(
                0,
                centralPhysicalPvCapW - Math.min(
                    centralPhysicalPvCapW,
                    Math.max(0, Number(evcsActiveDemandPvIntentW) || 0),
                ),
            );
            const centralBudgetRuntime = this.adapter && this.adapter._emsBudget;
            const centralTotalGrant = centralBudgetRuntime && typeof centralBudgetRuntime.getTotalGrant === 'function'
                ? centralBudgetRuntime.getTotalGrant({ key: 'evcs', requestedW: Number.MAX_SAFE_INTEGER })
                : (centralBudgetRuntime && typeof centralBudgetRuntime.grant === 'function'
                    ? centralBudgetRuntime.grant({ key: 'evcs', requestedW: Number.MAX_SAFE_INTEGER, pvOnly: false })
                    : null);
            evcsPendingCentralTotalGrantW = centralTotalGrant && Number.isFinite(Number(centralTotalGrant.grantW))
                ? Math.max(0, Number(centralTotalGrant.grantW))
                : null;
            let pendingTotalRemainingW = computePendingPvStartTotalBudgetW({
                localRemainingW: Number.isFinite(Number(remainingW))
                    ? Math.max(0, Number(remainingW))
                    : Number.POSITIVE_INFINITY,
                centralTotalGrantW: evcsPendingCentralTotalGrantW,
                activeDemandW: evcsActiveDemandReserveW,
            });
            const pendingStationRemainingW = new Map(stationRemainingW);
            const allocationRows = new Map(
                debugAlloc
                    .filter((row) => row && typeof row.safe === 'string')
                    .map((row) => [String(row.safe), row]),
            );

            for (const w of sorted) {
                const row = allocationRows.get(String(w.safe || '')) || {};
                try { await this._queueState(`${w.ch}.pvStartReservationW`, 0, true); } catch { /* diagnostic only */ }
                const effMode = String(w.effectiveMode || row.effectiveMode || '').trim().toLowerCase();
                if (effMode !== 'pv' && effMode !== 'minpv') continue;
                // PV-only kann ohne PV-Grant keinen Start-Intent bilden. Min+PV darf
                // dagegen seine Mindestleistung weiterhin aus dem Gesamtbudget anfordern,
                // selbst wenn der PV-Rest bereits 0 W beträgt.
                const pendingPvAvailableW = effMode === 'pv'
                    ? Math.min(pendingPurePvRemainingW, pendingPhysicalPvRemainingW)
                    : pendingPhysicalPvRemainingW;
                if (effMode === 'pv' && pendingPvAvailableW <= 0) continue;

                const actualNowW = (typeof w.actualPowerW === 'number' && Number.isFinite(w.actualPowerW))
                    ? Math.max(0, Math.abs(w.actualPowerW))
                    : 0;
                const commandNowW = Math.max(0, Number(row.targetW) || 0);
                const demandNowW = Math.max(0, Number(row.demandReserveW) || 0, actualNowW, commandNowW);
                let technicalMinW = (w.chargerType === 'AC' && Number(w.phases || 0) === 3)
                    ? Math.max(0, Math.max(num(w.minPW, 0), acMinPower3pW))
                    : Math.max(0, num(w.minPW, 0));
                // Reserve only a start that can actually be represented by this
                // charger's command step. Rounding down would hold PV for a
                // command which the final technical-minimum guard must stop.
                if (w.controlBasis === 'currentA' && w.chargerType === 'AC') {
                    const factor = Math.max(1, num(w.phases, 3)) * Math.max(1, num(w.voltageV, 230));
                    const stepA = num(w.stepA, 0) > 0 ? num(w.stepA, 0) : 0.1;
                    const startA = Math.max(num(w.minA, 0), technicalMinW / factor);
                    technicalMinW = Math.ceil((startA - 1e-9) / stepA) * stepA * factor;
                } else if (technicalMinW > 0) {
                    const stepW = num(w.stepW, 0) > 0 ? num(w.stepW, 0) : 1;
                    technicalMinW = Math.ceil((technicalMinW - 1e-9) / stepW) * stepW;
                }
                const minPvBaseW = effMode === 'minpv'
                    ? Math.max(
                        0,
                        Math.min(
                            Number.isFinite(Number(w.maxPW)) ? Number(w.maxPW) : Number.POSITIVE_INFINITY,
                            w.controlBasis === 'currentA' ? num(w.minPW, 0) : technicalMinW,
                        ),
                    )
                    : Math.max(0, num(w.minPW, 0));
                const activePvIntentW = computePvManagedDemandIntentW(effMode, demandNowW, minPvBaseW);
                const stationAvailW = w.stationKey && pendingStationRemainingW.has(w.stationKey)
                    ? Math.max(0, Number(pendingStationRemainingW.get(w.stationKey)) || 0)
                    : Number.POSITIVE_INFINITY;
                const pvStartCooldownActive = effMode === 'pv'
                    && Number.isFinite(Number(w.pvStartCooldownUntilMs))
                    && Number(w.pvStartCooldownUntilMs) > now;
                const vehicleStartCooldownActive = Number.isFinite(Number(w.vehicleStartCooldownUntilMs))
                    && Number(w.vehicleStartCooldownUntilMs) > now;
                const startCooldownActive = pvStartCooldownActive || vehicleStartCooldownActive;
                const goalBlocked = w.goalEnabled === true
                    && (String(w.goalStatus || '') === 'waiting_soc' || String(w.goalStatus || '') === 'soc_stale');

                const pending = computePendingPvStartIntentW({
                    mode: effMode,
                    enabled: w.enabled === true,
                    online: w.online === true,
                    connected: w.vehiclePlugged === true,
                    startEligible: w.vehicleStartEligible === true,
                    controlBasis: w.controlBasis,
                    status: w.connectorStatus,
                    normalizedVehicleState: w.vehicleStateNormalized,
                    startCooldownActive,
                    goalBlocked,
                    currentPowerW: demandNowW,
                    currentPvIntentW: activePvIntentW,
                    minPowerW: minPvBaseW,
                    technicalMinW,
                    maxPowerW: w.maxPW,
                    totalRemainingW: pendingTotalRemainingW,
                    stationRemainingW: stationAvailW,
                    pvRemainingW: pendingPvAvailableW,
                    activityThresholdW,
                });
                const pendingIntentW = Math.max(0, Number(pending.intentW) || 0);
                const pendingTotalDemandW = Math.max(pendingIntentW, Number(pending.totalDemandW) || 0);
                if (pendingIntentW <= 0 && pendingTotalDemandW <= 0) {
                    row.pendingPvIntentW = 0;
                    row.pendingPvIntentTotalDemandW = 0;
                    row.pendingPvIntentReason = String(pending.reason || '');
                    try { await this._queueState(`${w.ch}.pvStartReservationW`, 0, true); } catch { /* diagnostic only */ }
                    continue;
                }

                evcsPendingDemandPvIntentW += pendingIntentW;
                if (effMode === 'pv') evcsPendingDemandPurePvIntentW += pendingIntentW;
                evcsPendingDemandTotalW += pendingTotalDemandW;
                evcsPendingDemandWallboxes += 1;
                pendingPhysicalPvRemainingW = Math.max(0, pendingPhysicalPvRemainingW - pendingIntentW);
                if (effMode === 'pv') {
                    pendingPurePvRemainingW = Math.max(0, pendingPurePvRemainingW - pendingIntentW);
                }
                if (Number.isFinite(pendingTotalRemainingW)) {
                    pendingTotalRemainingW = Math.max(0, pendingTotalRemainingW - pendingTotalDemandW);
                }
                if (w.stationKey && pendingStationRemainingW.has(w.stationKey)) {
                    pendingStationRemainingW.set(
                        w.stationKey,
                        Math.max(0, stationAvailW - pendingTotalDemandW),
                    );
                }

                row.pendingPvIntentW = Math.round(pendingIntentW);
                row.pendingPvIntentTotalDemandW = Math.round(pendingTotalDemandW);
                row.pendingPvIntentReason = String(pending.reason || '');
                try { await this._queueState(`${w.ch}.pvStartReservationW`, Math.round(pendingIntentW), true); } catch { /* diagnostic only */ }
            }
        } catch (_ePendingPvIntent) {
            // Sicherheitsfallback: Ein Diagnose-/Intentfehler darf die produktive
            // Wallbox-Allokation nicht unterbrechen. Ohne Intent bleibt nur die
            // bereits aktive EVCS-PV-Reservierung bestehen.
            evcsPendingDemandPvIntentW = 0;
            evcsPendingDemandPurePvIntentW = 0;
            evcsPendingDemandTotalW = 0;
            evcsPendingDemandWallboxes = 0;
        }

        let evcsControlReserveW = Math.max(0, Math.round(evcsActiveDemandReserveW));
        let evcsControlPvReserveW = Math.max(0, Math.round(evcsActiveDemandPvReserveW));
        let evcsControlPvIntentW = Math.max(0, Math.round(evcsActiveDemandPvIntentW));
        let evcsControlPendingPvIntentW = Math.max(0, Math.round(evcsPendingDemandPvIntentW));
        let evcsControlPendingDemandW = Math.max(0, Math.round(evcsPendingDemandTotalW));
        let evcsControlTotalPvIntentW = Math.max(0, evcsControlPvIntentW + evcsControlPendingPvIntentW);
        let evcsControlRemainingW = Number.isFinite(budgetW)
            ? Math.max(0, Math.round(Number(budgetW) - evcsControlReserveW))
            : 0;
        try {
            if (budgetDebug && typeof budgetDebug === 'object') {
                budgetDebug.evcsReservedW = evcsControlReserveW;
                budgetDebug.evcsActiveDemandReserveW = evcsControlReserveW;
                budgetDebug.evcsActiveDemandPvReserveW = evcsControlPvReserveW;
                budgetDebug.evcsActiveDemandPvIntentW = evcsControlPvIntentW;
                budgetDebug.evcsPendingDemandPvIntentW = evcsControlPendingPvIntentW;
                budgetDebug.evcsPendingDemandTotalW = evcsControlPendingDemandW;
                budgetDebug.evcsPendingDemandWallboxes = evcsPendingDemandWallboxes;
                budgetDebug.evcsTotalPvIntentW = evcsControlTotalPvIntentW;
                budgetDebug.evcsPendingCentralTotalGrantW = Number.isFinite(Number(evcsPendingCentralTotalGrantW))
                    ? Math.round(Number(evcsPendingCentralTotalGrantW))
                    : null;
                budgetDebug.evcsActiveDemandWallboxes = evcsActiveDemandWallboxes;
            }
            const budgetEntry = debugAlloc.find(a => a && a.type === 'budget');
            if (budgetEntry && budgetEntry.details && typeof budgetEntry.details === 'object') {
                budgetEntry.details.evcsReservedW = evcsControlReserveW;
                budgetEntry.details.evcsActiveDemandReserveW = evcsControlReserveW;
                budgetEntry.details.evcsActiveDemandPvReserveW = evcsControlPvReserveW;
                budgetEntry.details.evcsActiveDemandPvIntentW = evcsControlPvIntentW;
                budgetEntry.details.evcsPendingDemandPvIntentW = evcsControlPendingPvIntentW;
                budgetEntry.details.evcsPendingDemandTotalW = evcsControlPendingDemandW;
                budgetEntry.details.evcsPendingDemandWallboxes = evcsPendingDemandWallboxes;
                budgetEntry.details.evcsTotalPvIntentW = evcsControlTotalPvIntentW;
                budgetEntry.details.evcsPendingCentralTotalGrantW = Number.isFinite(Number(evcsPendingCentralTotalGrantW))
                    ? Math.round(Number(evcsPendingCentralTotalGrantW))
                    : null;
                budgetEntry.details.evcsActiveDemandWallboxes = evcsActiveDemandWallboxes;
            }
        } catch {
            // diagnostics only
        }

        try {
            await this._queueState('chargingManagement.control.minimumServicePreserved', !!minimumServicePlan.preserveAll, true);
            await this._queueState('chargingManagement.control.minimumServiceRequiredW', Math.round(minimumServicePlan.totalMinimumW || 0), true);
            await this._queueState('chargingManagement.control.minimumServiceConnectorCount', Math.round(minimumServicePlan.eligibleCount || 0), true);
            await this._queueState('chargingManagement.control.minimumServiceReservedFutureW', Math.round(maximumFutureMinimumReservedW || 0), true);
        } catch (_eMinimumServiceDiag) {
            // Diagnose darf den produktiven Ladeplan niemals blockieren.
        }

        const tsWallboxesForAllocation = this._mapChargingWallboxesForTsAllocation(wbList);
        // Phase selection uses the budget that matches each wallbox mode: pure PV
        // gets the customer-priority cap, Min+PV gets the physical PV remainder,
        // and Auto/Boost keep the normal total budget.
        const phaseStablePhysicalPvW = Math.max(0, Math.min(
            Number.isFinite(Number(pvPhysicalCapW)) ? Number(pvPhysicalCapW) : 0,
            Number.isFinite(Number(pvSurplusNoEvAvg5mWState)) ? Number(pvSurplusNoEvAvg5mWState) : 0,
        ));
        const phaseStablePurePvW = Math.max(0, Math.min(
            Number.isFinite(Number(pvCapW)) ? Number(pvCapW) : 0,
            phaseStablePhysicalPvW,
        ));
        const tsAllocationState = await this._publishChargingAllocationTsShadow({
            mode,
            budgetMode: effectiveBudgetMode,
            budgetW,
            budgetUnlimited: !Number.isFinite(budgetW),
            usedW: Number.isFinite(budgetW) ? usedW : totalTargetPowerW,
            remainingW: Number.isFinite(budgetW) ? remainingW : 0,
            totalPowerW: totalFreshActualPowerW,
            totalTargetPowerW,
            totalTargetCurrentA,
            // Rueckwaertskompatibler Hauptwert ist das physikalische PV-Budget.
            // Der typisierte Abschluss-Guard erhaelt zusaetzlich den kleineren
            // kundenseitigen Anteil fuer reine PV-Ladepunkte.
            pvAvailableW: pvPhysicalCapW,
            pvPureAvailableW: pvCapW,
            pvPhysicalAvailableW: pvPhysicalCapW,
            pvAvailable: pvAvailableState,
            gridCapEvcsW,
            gridCapBinding,
            phaseCapEvcsW,
            phaseCapBinding,
            para14aActive,
            para14aCapEvcsW: para14aTotalCapW,
            para14aBinding,
            storageAssistActive,
            storageAssistW,
            pausedByPeakShaving,
            staleMeter,
            staleBudget,
            // Produktiv wird nur der zuvor zentral verteilte Runtime-Plan verwendet.
            // Der zweite TS-Native-Allocator bleibt damit ausserhalb des Feldpfads.
            preferTsNativeAllocation: false,
            tsNormalSourceLock: false,
            allowJsComparisonFallback: false,
            wallboxes: tsWallboxesForAllocation,
            allocations: debugAlloc,
            phaseSelection: {
                now,
                mode,
                budgetMode: effectiveBudgetMode,
                pvAvailableW: pvPhysicalCapW,
                pvPureAvailableW: pvCapW,
                pvPhysicalAvailableW: pvPhysicalCapW,
                stablePvAvailableW: phaseStablePhysicalPvW,
                stablePvPureAvailableW: phaseStablePurePvW,
                stablePvPhysicalAvailableW: phaseStablePhysicalPvW,
                budgetW,
                remainingW: Number.isFinite(budgetW) ? remainingW : budgetW,
                staleMeter,
                staleBudget,
                phaseAutoEnabled,
                switchUpThresholdW: phaseSwitchUpThresholdW,
                switchDownThresholdW: phaseSwitchDownThresholdW,
                switchUpStableMs: phaseSwitchUpStableMs,
                switchDownStableMs: phaseSwitchDownStableMs,
                switchCooldownMs: phaseSwitchCooldownMs,
                switchSettleMs: phaseSwitchSettleMs,
                switchSafePowerW: phaseSwitchSafePowerW,
                wallboxes: tsWallboxesForAllocation,
                ts: now,
            },
        });
        await this._publishChargingPhaseSelectionRuntimeStates(tsAllocationState && tsAllocationState.phasePlan ? tsAllocationState.phasePlan : null, wbList);
        await this._publishChargingStationDiagnosticsFromAllocationPlan(tsAllocationState, wbList);

        // Zentrale Reservierung und nachgelagerte Verbraucher müssen denselben finalen
        // Mehrladepunkt-Plan sehen, der anschließend tatsächlich geschrieben wird. Der
        // Abschluss-Guard kann Rohziele wegen Stationslimit, PV-Grant, Mindestleistung
        // oder Quantisierung reduzieren; deshalb werden alle Summen erst hier verbindlich.
        const finalAllocationMetrics = this._buildChargingFinalAllocationMetrics(tsAllocationState, wbList, activityThresholdW);
        if (finalAllocationMetrics) {
            totalTargetPowerW = finalAllocationMetrics.totalTargetPowerW;
            totalTargetCurrentA = finalAllocationMetrics.totalTargetCurrentA;
            usedW = finalAllocationMetrics.totalTargetPowerW;
            remainingW = Number.isFinite(budgetW)
                ? Math.max(0, Number(budgetW) - finalAllocationMetrics.totalTargetPowerW)
                : remainingW;
            evcsControlReserveW = finalAllocationMetrics.reserveW;
            evcsControlPvReserveW = finalAllocationMetrics.pvReserveW;
            evcsControlPvIntentW = finalAllocationMetrics.pvIntentW;
            // A tentative start was calculated before the final phase plan. It may
            // not reserve PV while the same plan orders stop/switch/settle.
            const phaseBySafe = new Map((tsAllocationState?.phasePlan?.wallboxes || []).map(p => [String(p.safe), p]));
            const finalDecision = tsAllocationState?.normalSourceDecision?.apply
                ? tsAllocationState.normalSourceDecision : tsAllocationState?.productiveDecision;
            const finalBySafe = new Map((finalDecision?.apply?.wallboxes || []).map(p => [String(p.safe), p]));
            for (const row of debugAlloc) {
                if (!row || !(Number(row.pendingPvIntentTotalDemandW) > 0)) continue;
                const phase = phaseBySafe.get(String(row.safe));
                const final = finalBySafe.get(String(row.safe));
                const phaseBlocked = !!(phase && (phase.switchRequired || phase.safetyStopRequired || Number(phase.settleUntilMs) > now));
                // A ramp intent based on a raw command ceases to be real demand
                // when the final phase/technical/cap guard has rejected that start.
                // Preserve genuine start-minimum intents calculated from idle.
                const rawStartRejected = !!(final && Number(row.targetW) >= activityThresholdW
                    && !(Number(final.targetPowerW) > 0)
                    && !(row.meterStale !== true && Number(row.actualPowerW) >= activityThresholdW));
                if (!phaseBlocked && !rawStartRejected) continue;
                evcsControlPendingPvIntentW = Math.max(0, evcsControlPendingPvIntentW - (Number(row.pendingPvIntentW) || 0));
                evcsControlPendingDemandW = Math.max(0, evcsControlPendingDemandW - (Number(row.pendingPvIntentTotalDemandW) || 0));
                if (String(row.effectiveMode || '') === 'pv') {
                    evcsPendingDemandPurePvIntentW = Math.max(0, evcsPendingDemandPurePvIntentW - (Number(row.pendingPvIntentW) || 0));
                }
                row.pendingPvIntentW = 0;
                row.pendingPvIntentTotalDemandW = 0;
                row.pendingPvIntentReason = phaseBlocked ? 'phase-transition-no-start-reservation' : 'final-plan-no-runnable-demand';
                const point = wbList.find(w => String(w.safe) === String(row.safe));
                if (point?.ch) await this._queueState(`${point.ch}.pvStartReservationW`, 0, true);
            }
            const autoPvMetrics = this._buildAutoPvPriorityMetrics(tsAllocationState, wbList, {
                priorityCapW: Math.max(0, Number(pvStartReadyBudgetW) || 0),
                physicalCapW: Math.max(0, Number(pvPhysicalCapW) || 0),
                otherPriorityReservedW: finalAllocationMetrics.purePvIntentW + Math.max(0, evcsPendingDemandPurePvIntentW),
                otherPhysicalReservedW: Math.max(evcsControlPvIntentW, evcsControlPvReserveW) + evcsControlPendingPvIntentW,
            });
            evcsControlPvReserveW += autoPvMetrics.reservedW;
            evcsControlPvIntentW += autoPvMetrics.reservedW;
            evcsControlTotalPvIntentW = Math.max(0, evcsControlPvIntentW + evcsControlPendingPvIntentW);
            await this._queueState('chargingManagement.control.pvAutoPriorityReservedW', autoPvMetrics.reservedW, true);
            await this._queueState('chargingManagement.control.pvAutoPriorityJson', JSON.stringify(autoPvMetrics), true);
            evcsControlRemainingW = Number.isFinite(budgetW)
                ? Math.max(0, Math.round(Number(budgetW) - evcsControlReserveW))
                : 0;
            evcsActiveDemandWallboxes = finalAllocationMetrics.activeDemandWallboxes;

            try {
                if (budgetDebug && typeof budgetDebug === 'object') {
                    budgetDebug.evcsReservedW = evcsControlReserveW;
                    budgetDebug.evcsActiveDemandReserveW = evcsControlReserveW;
                    budgetDebug.evcsActiveDemandPvReserveW = evcsControlPvReserveW;
                    budgetDebug.evcsActiveDemandPvIntentW = evcsControlPvIntentW;
                    budgetDebug.evcsTotalPvIntentW = evcsControlTotalPvIntentW;
                    budgetDebug.evcsActiveDemandWallboxes = evcsActiveDemandWallboxes;
                    budgetDebug.evcsFinalTargetPowerW = totalTargetPowerW;
                    budgetDebug.evcsFinalTargetCurrentA = totalTargetCurrentA;
                    budgetDebug.evcsFinalAllocationSource = 'ts-final-allocation-plan';
                    budgetDebug.evcsPendingDemandPvIntentW = evcsControlPendingPvIntentW;
                    budgetDebug.evcsPendingDemandReserveW = evcsControlPendingDemandW;
                }
                const budgetEntry = debugAlloc.find(a => a && a.type === 'budget');
                if (budgetEntry && budgetEntry.details && typeof budgetEntry.details === 'object') {
                    budgetEntry.details.evcsReservedW = evcsControlReserveW;
                    budgetEntry.details.evcsActiveDemandReserveW = evcsControlReserveW;
                    budgetEntry.details.evcsActiveDemandPvReserveW = evcsControlPvReserveW;
                    budgetEntry.details.evcsActiveDemandPvIntentW = evcsControlPvIntentW;
                    budgetEntry.details.evcsTotalPvIntentW = evcsControlTotalPvIntentW;
                    budgetEntry.details.evcsActiveDemandWallboxes = evcsActiveDemandWallboxes;
                    budgetEntry.details.evcsFinalTargetPowerW = totalTargetPowerW;
                    budgetEntry.details.evcsFinalTargetCurrentA = totalTargetCurrentA;
                    budgetEntry.details.evcsFinalAllocationSource = 'ts-final-allocation-plan';
                    budgetEntry.details.evcsPendingDemandPvIntentW = evcsControlPendingPvIntentW;
                    budgetEntry.details.evcsPendingDemandReserveW = evcsControlPendingDemandW;
                }
            } catch (_eFinalAllocationDiagnostics) {
                // diagnostics only
            }
        }

        // Gate A is an active limiter only when real EVCS demand was actually
        // reduced by the NVP envelope. Merely converting an unlimited budget to
        // a finite safe headroom is monitoring, not a restriction. Independent
        // phase/§14a caps are removed first so Gate A cannot claim a reduction
        // that another harder gate caused.
        const gridBindingDecision = rc86GridBinding({
            requestedW: gridDemandRequestedW,
            gridCapW: gridCapEvcsW,
            finalTargetW: totalTargetPowerW,
            activePoints: gridDemandActivePoints,
            phaseCapW: phaseCapEvcsW,
            para14aCapW: para14aActive ? para14aTotalCapW : null,
        });
        gridCapBinding = gridBindingDecision.binding;
        gridReductionW = gridBindingDecision.reductionW;
        gridAllowedDemandW = gridBindingDecision.allowedW;

        try {
            await this._queueState('chargingManagement.control.gridCapBinding', !!gridCapBinding, true);
            await this._queueState('chargingManagement.control.gridDemandRequestedW', Math.round(gridDemandRequestedW), true);
            await this._queueState('chargingManagement.control.gridAllowedDemandW', Math.round(gridAllowedDemandW), true);
            await this._queueState('chargingManagement.control.gridReductionW', Math.round(gridReductionW), true);
            if (budgetDebug && typeof budgetDebug === 'object') {
                budgetDebug.gridDemandRequestedW = Math.round(gridDemandRequestedW);
                budgetDebug.gridAllowedDemandW = Math.round(gridAllowedDemandW);
                budgetDebug.gridReductionW = Math.round(gridReductionW);
                budgetDebug.gridCapBinding = !!gridCapBinding;
                budgetDebug.gridCapMonitoring = gridImportLimitEffW > 0;
            }
            const budgetEntry = debugAlloc.find(a => a && a.type === 'budget');
            if (budgetEntry && budgetEntry.details && typeof budgetEntry.details === 'object') {
                budgetEntry.details.gridDemandRequestedW = Math.round(gridDemandRequestedW);
                budgetEntry.details.gridAllowedDemandW = Math.round(gridAllowedDemandW);
                budgetEntry.details.gridReductionW = Math.round(gridReductionW);
                budgetEntry.details.gridCapBinding = !!gridCapBinding;
                budgetEntry.details.gridCapMonitoring = gridImportLimitEffW > 0;
            }
        } catch (_eGridBindingDiagnostics) {
            // diagnostics only
        }

        const tsWritePlanProductive = tsAllocationState && tsAllocationState.writePlanProductive ? tsAllocationState.writePlanProductive : null;
        const tsWritePlanUsed = await this._executeChargingTsSetpointPlan(
            tsWritePlanProductive,
            wbList,
            debugAlloc,
        );
        const legacyFallbackReason = tsWritePlanProductive && tsWritePlanProductive.fallbackReason
            ? tsWritePlanProductive.fallbackReason
            : 'ts-write-plan-not-productive';
        if (!tsWritePlanUsed) {
            await this._executeChargingLegacySetpointFallback(wbList, debugAlloc, legacyFallbackReason);
        }
        await this._publishChargingLegacyDecisionTreeState(tsAllocationState, tsWritePlanProductive, tsWritePlanUsed, debugAlloc, 'normal-allocation-write-plan', legacyFallbackReason);
        await this._publishChargingTsNormalSourceState('normal-allocation-write-plan', tsAllocationState, tsWritePlanProductive, tsWritePlanUsed, legacyFallbackReason, false);

        publishEvPriorityCaps({
            active: !!evPriorityRequested,
            blockStorageCharge: !!(evPriorityRequested && (evPriorityLimitedWallboxes > 0 || evPriorityPendingW > 0)),
            requestedCount: evPriorityWallboxes.length,
            limitedWallboxes: evPriorityLimitedWallboxes,
            starvedW: Math.round(Math.max(evPriorityStarvedW || 0, evPriorityPendingW || 0)),
            pendingW: Math.round(evPriorityPendingW || 0),
            storageYieldW: Math.round(evPriorityStorageYieldW || 0),
            storageSource: String(evPriorityStorageSource || ''),
        });

        // MU6.1: diagnostics logging (compact, decision-leading)
        const diagCfg = (this.adapter && this.adapter.config && this.adapter.config.diagnostics) ? this.adapter.config.diagnostics : null;
        const diagEnabled = !!(diagCfg && diagCfg.enabled);
        const diagLevel = (diagCfg && (diagCfg.logLevel === 'info' || diagCfg.logLevel === 'debug')) ? diagCfg.logLevel : 'debug';
        const diagMaxJsonLenNum = diagCfg ? Number(diagCfg.maxJsonLen) : NaN;
        const diagMaxJsonLen = (Number.isFinite(diagMaxJsonLenNum) && diagMaxJsonLenNum >= 1000) ? diagMaxJsonLenNum : 20000;

        if (diagEnabled) {
            const nowDiag = Date.now();
            const logIntSecNum = diagCfg ? Number(diagCfg.logIntervalSec) : NaN;
            const logIntSec = (Number.isFinite(logIntSecNum) && logIntSecNum >= 0) ? logIntSecNum : 10;
            const logIntMs = Math.round(logIntSec * 1000);
            const shouldLog = (logIntMs <= 0) || ((nowDiag - (this._lastDiagLogMs || 0)) >= logIntMs);
            if (!shouldLog) {
                // skip logging this tick
            } else {
                this._lastDiagLogMs = nowDiag;
                try {
                const order = sorted.map(w => w.safe).join('>');
                const top = debugAlloc
                    .filter(a => a && typeof a.safe === 'string')
                    .slice(0, 10)
                    .map(a => `${a.safe}:${Math.round(Number(a.targetW || 0))}W/${(Number.isFinite(Number(a.targetA)) ? Number(a.targetA).toFixed(1) : '0.0')}A(${a.reason || ''})`)
                    .join(' ');
                const msg = `[CM] mode=${mode} budgetMode=${effectiveBudgetMode} budget=${Math.round(Number(budgetW || 0))}W used=${Math.round(Number(usedW || 0))}W reserve=${Math.round(Number(evcsControlReserveW || 0))}W rem=${Math.round(Number(remainingW || 0))}W online=${onlineCount}/${wbList.length} order=${order}` + (top ? (` targets=${top}`) : '');
                const fn = (this.adapter && this.adapter.log && typeof this.adapter.log[diagLevel] === 'function') ? this.adapter.log[diagLevel] : this.adapter.log.debug;
                fn.call(this.adapter.log, msg);
            } catch {
                // ignore
            }
            }
        }

        try {
            const s = JSON.stringify(debugAlloc);
            await this._queueState('chargingManagement.debug.allocations', s.length > diagMaxJsonLen ? (s.slice(0, diagMaxJsonLen) + '...') : s, true);
        } catch {
            await this._queueState('chargingManagement.debug.allocations', '[]', true);
        }

        // Gate A: expose which top-level limiter is active
        let finalStatus = 'ok';
        if (pauseFollowPeakBudget) {
            finalStatus = pauseFollowGridCaps ? 'peak_active_follow_grid_caps' : 'peak_active_follow_peak_budget';
        } else if (gridCapBinding && phaseCapBinding) {
            finalStatus = 'limited_grid_import_and_phase';
        } else if (gridCapBinding) {
            finalStatus = 'limited_grid_import';
        } else if (phaseCapBinding) {
            finalStatus = 'limited_phase_cap';
        }
        const tsControlState = await this._publishChargingControlTsShadow({
            mode,
            budgetMode: effectiveBudgetMode,
            status: finalStatus,
            active: controlActive,
            budgetW,
            usedW: evcsControlReserveW,
            remainingW: evcsControlRemainingW,
            totalPowerW: totalFreshActualPowerW,
            totalTargetPowerW,
            totalTargetCurrentA,
            wallboxCount: wbList.length,
            onlineWallboxes: onlineCount,
            connectedCount: wbList.filter(w => w && w.vehiclePlugged === true).length,
            pausedByPeakShaving,
            staleMeter,
            staleBudget,
            pvAvailable: pvAvailableState,
            gridImportLimitW,
            gridImportLimitEffW,
            gridImportW,
            gridCapEvcsW,
            gridCapBinding,
            phaseCapEvcsW,
            phaseCapBinding,
            para14aActive,
            para14aCapEvcsW: para14aTotalCapW,
            para14aBinding,
            storageAssistActive,
            storageAssistW,
        });
        const tsControlApply = tsControlState && tsControlState.productiveDecision && tsControlState.productiveDecision.productive && tsControlState.productiveDecision.apply
            ? tsControlState.productiveDecision.apply
            : null;
        await this._queueState('chargingManagement.control.active', tsControlApply ? tsControlApply.active : controlActive, true);
        await this._queueState('chargingManagement.control.mode', tsControlApply ? tsControlApply.mode : mode, true);
        await this._queueState('chargingManagement.control.budgetMode', tsControlApply ? tsControlApply.budgetMode : effectiveBudgetMode, true);
        await this._queueState('chargingManagement.control.status', tsControlApply ? tsControlApply.status : finalStatus, true);
        await this._queueState('chargingManagement.control.budgetW', tsControlApply ? tsControlApply.budgetW : (Number.isFinite(budgetW) ? budgetW : 0), true);
        await this._queueState('chargingManagement.control.usedW', tsControlApply ? tsControlApply.usedW : evcsControlReserveW, true);
        await this._queueState('chargingManagement.control.actualW', Math.max(0, Math.round(Number(totalFreshActualPowerW || 0))), true);
        await this._queueState('chargingManagement.control.reserveW', evcsControlReserveW, true);
        await this._queueState('chargingManagement.control.activeDemandReserveW', evcsControlReserveW, true);
        await this._queueState('chargingManagement.control.pvActiveDemandReserveW', evcsControlPvReserveW, true);
        await this._queueState('chargingManagement.control.pvActiveDemandIntentW', evcsControlPvIntentW, true);
        await this._queueState('chargingManagement.control.pvPendingDemandIntentW', evcsControlPendingPvIntentW, true);
        await this._queueState('chargingManagement.control.pvPendingDemandTotalW', evcsControlPendingDemandW, true);
        await this._queueState('chargingManagement.control.pvPendingDemandWallboxes', evcsPendingDemandWallboxes, true);
        await this._queueState('chargingManagement.control.pvTotalDemandIntentW', evcsControlTotalPvIntentW, true);
        await this._queueState('chargingManagement.control.pvCentralGrantW', 0, true);
        await this._queueState('chargingManagement.control.pvCentralReservedW', 0, true);
        await this._queueState('chargingManagement.control.pvCentralRemainingAfterEvcsW', 0, true);
        await this._queueState('chargingManagement.control.activeDemandWallboxes', evcsActiveDemandWallboxes, true);
        await this._queueState('chargingManagement.control.remainingW', tsControlApply ? tsControlApply.remainingW : evcsControlRemainingW, true);

        await this._publishChargingNormalSourceState({
            context: 'normal-allocation-write-plan',
            mode,
            status: finalStatus,
            safetyStop: false,
            budget: chargingBudgetTsProductive,
            control: tsControlState && tsControlState.productiveDecision,
            allocation: tsAllocationState && (tsAllocationState.normalSourceDecision || tsAllocationState.productiveDecision),
            writePlan: tsWritePlanProductive,
            executor: this._chargingWritePlanExecutorLast,
            legacy: this._chargingLegacyDecisionTreeLast,
        });

        // Central EMS Budget & Gates: EVCS is the first flexible consumer group.
        // This does not change EVCS allocation; it only reserves the already decided target/usage
        // for downstream apps (thermal, heating rod, generic loads) in the same tick.
        try {
            const rt = this.adapter && this.adapter._emsBudget;
            if (rt && typeof rt.reserve === 'function') {
                const evcsActualW = Math.max(0, Math.round(Number(totalFreshActualPowerW || 0)));
                const evcsReserveW = evcsControlReserveW;
                const evcsPhysicalPvCapW = Number.isFinite(Number(pvPhysicalCapW))
                    ? Math.max(0, Number(pvPhysicalCapW))
                    : (Number.isFinite(Number(pvBudgetCentralTotalWState))
                        ? Math.max(0, Number(pvBudgetCentralTotalWState))
                        : Math.max(0, Number(pvAllocationEvcsCapWState) || 0));
                // Nicht an pvAvailableState koppeln: Dieses Hysterese-Signal gilt
                // nur fuer reine PV-Ladung. Min+PV darf seine Zusatzleistung aus dem
                // physikalischen PV-Rest nutzen. Die reine PV-Prioritaet wurde bereits
                // im finalen Ladepunktplan mit `pvPureAvailableW` begrenzt.
                const centralGrantFn = typeof rt.getPvGrant === 'function'
                    ? rt.getPvGrant.bind(rt)
                    : (typeof rt.grant === 'function' ? rt.grant.bind(rt) : null);
                const totalPvDemandW = Math.max(0, evcsControlTotalPvIntentW, evcsControlPvReserveW);
                const centralGrant = centralGrantFn
                    ? centralGrantFn({
                        key: 'evcs',
                        requestedW: totalPvDemandW,
                        maxW: evcsPhysicalPvCapW,
                        pvOnly: true,
                        applyEvcsAllocationCap: false,
                    })
                    : null;
                const centralGrantW = centralGrant && Number.isFinite(Number(centralGrant.grantW))
                    ? Math.max(0, Number(centralGrant.grantW))
                    : evcsPhysicalPvCapW;
                const evcsPvReserveW = computeEvcsPvBudgetReservationW({
                    reserveW: evcsReserveW,
                    // Aktive Ladeleistung bleibt reale Gesamtlast. Ein noch nicht
                    // gestarteter PV-Anteil wird ausschließlich als Intent geführt,
                    // damit er das Speicher-PV-Budget reduziert, ohne Netz-/Anschluss-
                    // leistung vorzutäuschen.
                    demandW: evcsReserveW,
                    pendingDemandW: evcsControlPendingDemandW,
                    actualPvW: evcsControlPvReserveW,
                    intentPvW: evcsControlPvIntentW,
                    pendingIntentPvW: evcsControlPendingPvIntentW,
                    allocationCapW: Math.min(evcsPhysicalPvCapW, centralGrantW),
                });
                rt.reserve({
                    key: 'evcs',
                    app: 'chargingManagement',
                    label: 'Ladepunkte',
                    priority: 100,
                    actualW: evcsActualW,
                    requestedW: Math.max(0, evcsReserveW + evcsControlPendingDemandW),
                    reserveW: evcsReserveW,
                    pvReserveW: evcsPvReserveW,
                    pvOnly: false,
                    mode: String(mode || ''),
                });

                // Diagnose nach der Reservierung veröffentlichen. Speicher,
                // Thermik und Heizstab sehen im selben EMS-Zyklus genau diesen
                // Restwert; damit existiert kein paralleles Modulbudget mehr.
                await this._queueState('chargingManagement.control.pvCentralGrantW', Math.round(centralGrantW), true);
                await this._queueState('chargingManagement.control.pvCentralReservedW', Math.round(evcsPvReserveW), true);
                await this._queueState(
                    'chargingManagement.control.pvCentralRemainingAfterEvcsW',
                    Number.isFinite(Number(rt.remainingPvW)) ? Math.round(Math.max(0, Number(rt.remainingPvW))) : 0,
                    true,
                );
            }
        } catch (_e) {
            // budget diagnostics only
        }

            // Cleanup session tracking for removed wallboxes (avoid memory leaks)
            for (const [safeKey, lastSeenTs] of this._chargingLastSeenMs.entries()) {
                const ls = (typeof lastSeenTs === 'number' && Number.isFinite(lastSeenTs)) ? lastSeenTs : 0;
                if (!ls || (now - ls) > sessionCleanupStaleMs) {
                    this._chargingLastSeenMs.delete(safeKey);
                    this._chargingLastActiveMs.delete(safeKey);
                    this._chargingSinceMs.delete(safeKey);
                    this._lastCmdTargetW.delete(safeKey);
                    this._lastCmdTargetA.delete(safeKey);
                    this._boostSinceMs.delete(safeKey);
                    this._pvStartAttemptSinceMs.delete(safeKey);
                    this._vehicleStartAttemptSinceMs.delete(safeKey);
                    this._vehicleStartCooldownUntilMs.delete(safeKey);
                }
            }

        await this._queueState('chargingManagement.summary.totalReservedPowerW', evcsControlReserveW, true);
        await this._queueState('chargingManagement.summary.totalTargetPowerW', totalTargetPowerW, true);
        await this._queueState('chargingManagement.summary.totalTargetCurrentA', totalTargetCurrentA, true);
        await this._queueState('chargingManagement.summary.lastUpdate', Date.now(), true);
        await this._recordChargingAudit({
            ts: now, context: 'normal-allocation-write-plan', mode, budgetMode: effectiveBudgetMode, status: finalStatus, controlActive, pausedByPeakShaving, safetyStop: false, safetyReason: '',
            budgetW, actualPowerW: totalFreshActualPowerW, reservedPowerW: evcsControlReserveW, targetPowerW: totalTargetPowerW, remainingPowerW: evcsControlRemainingW,
            gridImportW, gridImportLimitW, gridImportLimitEffW, gridCapEvcsW, gridCapBinding,
            gridHardHeadroomRawW, gridIncrementHeadroomW, gridSoftRampFactor, gridOfflineReserveW: offlineReserveW,
            gridDemandRequestedW, gridAllowedDemandW, gridReductionW,
            phaseCapEvcsW, phaseCapBinding, para14aActive, para14aCapEvcsW: para14aTotalCapW, para14aBinding,
            storageAssistActive, storageAssistRequestedW: storageAssistW, storageAssistAcceptedW, wallboxes: wbList, allocations: debugAlloc,
        });
    }
}

module.exports = {
    ChargingManagementModule,
    estimateGridRelevantEvcsDemandW,
    resolveConfirmedEvcsVehicleDemand,
    resolveUniversalEvcsVehicleDemand,
    classifyUniversalEvcsVehicleStatus,
    mergeUniversalEvcsStatusEvidence,
    resolveEvcsSemanticFlag,
    parseEvcsSemanticValues,
    matchesEvcsSemanticStatus,
    isObservationOnlyEvcsDemandObjectId,
    isPersistentEvcsVehicleState,
    computeMinPvAllocationW,
    computeGoalPowerCapW,
    computeChargingMinimumServicePlan,
    computePvManagedDemandIntentW,
    computePendingPvStartIntentW,
    computePendingPvStartTotalBudgetW,
    computeEvcsPvBudgetReservationW,
    resolveChargingPvBudgetControl,
    resolveEvcsStoragePolicy,
    resolveEvcsStoragePolicyActualLoad,
    isChargingCommandDemandAllowed,
    shouldPauseChargingForGoalSoc,
    applyChargingModeRamp,
    normalizeEvcsOnlineFlag,
    normalizeEvcsStatusReachability,
    normalizeEvcsStatusToken,
    isPersistentEvcsReadyStatus,
    resolveEvcsStatusAgePolicy,
    classifyEvcsConnectorStatus,
    resolveEvcsAvailabilityRequest,
    inferOcppConnectorNoFromObjectId,
    inferIoBrokerOcppConnectorContext,
    belongsToOcppConnectorContext,
    isOcppDataFreshObjectId,
    isOcppVolatileOnlineObjectId,
    resolveOcppOnlineObjectId,
    isKnownOcppSemanticObjectId,
    resolveOcppCanonicalObjectId,
    resolveEvcsTelemetryProfile,
    resolveEvcsSetpointRefreshMs,
    evaluateOcppCommandConfirmation,
    resolveEvcsEffectivePower,
    reconcileOcppTransactionDemand,
    isOcppAuthoritativeZeroState,
    isOcppSessionPersistentState,
    isOcppEventStatusPersistentState,
    strictFiniteEvcsNumber,
    resolveAcceptedStorageAssistBudget,
    finiteChargingAuditNumber, deriveChargingAuditLimiter, deriveChargingAuditGlobalLimiter, buildChargingAuditSnapshot, chargingAuditEventSignature, buildChargingAuditEvents,
};
