'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/ems/charging-management/charging-management.ts
 * Quell-Hash: sha256:82e5fef8fb31c0ee984f733eb0b8707de5154cf69e138f5b2735da30e15a538b
 * Erzeugung: npm run sync:ts-ems-mirrors
 *
 * Zweck:
 * EVCS-/Charging-Management-TS-Vorbereitung für Ladepunkte, Sichtbarkeit und Budgetreservierung.
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
 * Aufgabe: Verknüpft Fahrzeugbedarf, Lademodus, Stationsgrenzen und verfügbares Netz-/PV-Budget zu begrenzten Lade-Sollwerten.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/ems/charging-management/charging-management.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Datei: src-ts/ems/charging-management/charging-management.ts
 *
 * Zweck:
 * TypeScript-Vorbereitung für EVCS / Charging-Management. Diese Datei ersetzt in
 * 0.7.122 noch keine produktive Ladelogik, sondern liefert sichere Verträge und
 * Diagnose-Helfer für Ladepunkte, Sichtbarkeit, Setpoint-Mapping und Budgetvorbereitung.
 *
 * Zusammenhang:
 * Charging-Management hängt an Core-Limits, EVCS-Feature-Sichtbarkeit, History/PDF,
 * App-Center-Konfiguration und Verbraucherreservierungen. Fehler hier können echte
 * Wallboxen falsch anzeigen oder Ladeleistungen falsch begrenzen.
 *
 * Wichtig:
 * - 0 W ist gültig und darf nicht als fehlend gelten.
 * - Anlagen ohne EVCS dürfen keine Wallbox-Sichtbarkeit vortäuschen.
 * - TypeScript bleibt in 0.7.122 Vorbereitungs-/Shadow-Helfer; die produktive JS-
 *   Ladelogik bleibt weiterhin führend.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toSafeWallboxKey = toSafeWallboxKey;
exports.normalizeChargingWallbox = normalizeChargingWallbox;
exports.buildChargingBudgetReservationPrep = buildChargingBudgetReservationPrep;
exports.buildChargingManagementPrep = buildChargingManagementPrep;
exports.compareChargingPrepWithRuntime = compareChargingPrepWithRuntime;
/**
 * Code-Teil: toNumberOrNull
 * Zweck: Zahlen robust normalisieren. 0 bleibt gültig.
 */
function toNumberOrNull(value) {
    if (typeof value === 'number')
        return Number.isFinite(value) ? value : null;
    if (typeof value === 'string') {
        const normalized = value.trim().replace(',', '.');
        if (!normalized)
            return null;
        const n = Number(normalized);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}
/** Code-Teil: positiveNumber. Zweck: Negative/ungültige Werte sicher auf 0 begrenzen. */
function positiveNumber(value) {
    const n = toNumberOrNull(value);
    return n === null ? 0 : Math.max(0, Math.round(n));
}
/** Code-Teil: toBoolean. Zweck: false als gültigen Wert erhalten. */
function toBoolean(value, fallback = false) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'number' && Number.isFinite(value))
        return value !== 0;
    if (typeof value === 'string') {
        const s = value.trim().toLowerCase();
        if (['true', '1', 'on', 'yes', 'ja', 'enabled'].includes(s))
            return true;
        if (['false', '0', 'off', 'no', 'nein', 'disabled'].includes(s))
            return false;
    }
    return fallback;
}
/**
 * Code-Teil: toSafeWallboxKey
 * Zweck: Ladepunkt-Keys wie die JS-Runtime in sichere ID-Bestandteile wandeln.
 */
function toSafeWallboxKey(input, fallbackIndex = 0) {
    const raw = String(input ?? '').trim() || `wallbox_${fallbackIndex + 1}`;
    const safe = raw.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
    return safe || `wallbox_${fallbackIndex + 1}`;
}
/**
 * Code-Teil: normalizeChargingWallbox
 * Zweck: Wallbox-Konfiguration für TS-Diagnose und spätere produktive Migration normalisieren.
 */
function normalizeChargingWallbox(raw, index = 0) {
    const key = toSafeWallboxKey(raw.key ?? raw.id ?? raw.name, index);
    const name = String(raw.name ?? raw.key ?? raw.id ?? key).trim() || key;
    const controlBasisRaw = String(raw.controlBasis ?? '').trim().toLowerCase();
    const controlBasis = controlBasisRaw === 'current' || controlBasisRaw === 'a' ? 'current' : 'power';
    const hasSetPower = typeof raw.setPowerId === 'string' && raw.setPowerId.trim().length > 0;
    const hasSetCurrent = (typeof raw.setCurrentId === 'string' && raw.setCurrentId.trim().length > 0)
        || (typeof raw.setAId === 'string' && raw.setAId.trim().length > 0);
    const hasEnable = typeof raw.enableId === 'string' && raw.enableId.trim().length > 0;
    const phases = Math.max(1, Math.min(3, positiveNumber(raw.phases || 3)));
    const voltageV = Math.max(1, positiveNumber(raw.voltageV || 230));
    const maxA = Math.max(0, positiveNumber(raw.maxA || 16));
    const minA = Math.max(0, positiveNumber(raw.minA || 6));
    const derivedMaxPowerW = phases * voltageV * maxA;
    const derivedMinPowerW = phases * voltageV * minA;
    const maxPowerW = positiveNumber(raw.maxPowerW || derivedMaxPowerW);
    const minPowerW = positiveNumber(raw.minPowerW || derivedMinPowerW);
    const evcsIndexRaw = toNumberOrNull(raw.evcsIndex);
    const evcsIndex = evcsIndexRaw === null ? 0 : Math.max(0, Math.round(evcsIndexRaw));
    const mappingIssues = [];
    if (!hasSetPower && !hasSetCurrent)
        mappingIssues.push('missing-setpoint');
    if (controlBasis === 'power' && !hasSetPower && hasSetCurrent)
        mappingIssues.push('power-basis-with-current-only');
    if (controlBasis === 'current' && !hasSetCurrent && hasSetPower)
        mappingIssues.push('current-basis-with-power-only');
    if (maxPowerW > 0 && minPowerW > maxPowerW)
        mappingIssues.push('min-power-above-max-power');
    return {
        key,
        name,
        enabled: toBoolean(raw.enabled, true),
        evcsIndex,
        controlBasis,
        hasSetPower,
        hasSetCurrent,
        hasAnySetpoint: hasSetPower || hasSetCurrent,
        hasEnable,
        minPowerW,
        maxPowerW,
        minA,
        maxA,
        phases,
        voltageV,
        chargerType: String(raw.chargerType ?? '').trim().toLowerCase() || 'ac',
        mappingIssues,
    };
}
/**
 * Code-Teil: buildChargingBudgetReservationPrep
 * Zweck: EVCS-Reservierung für spätere TS-Übernahme vorbereiten; produktiv bleibt JS.
 */
function buildChargingBudgetReservationPrep(input, wallboxes) {
    const budgetRaw = toNumberOrNull(input.budgetW);
    const usedW = positiveNumber(input.usedW ?? input.totalTargetPowerW);
    const actualW = positiveNumber(input.totalPowerW);
    const reserveW = budgetRaw !== null && Number.isFinite(budgetRaw)
        ? Math.max(0, Math.min(positiveNumber(budgetRaw), usedW))
        : Math.max(0, usedW || actualW);
    const pvReserveW = Math.max(0, Math.min(reserveW, positiveNumber(input.pvUsedW)));
    const remainingW = Math.max(0, positiveNumber(input.remainingW));
    const warnings = [];
    if (!wallboxes.length)
        warnings.push('no-wallboxes');
    if (wallboxes.length && !wallboxes.some((w) => w.hasAnySetpoint))
        warnings.push('no-setpoints');
    return {
        source: 'ts-charging-budget-reservation-prep-v1',
        requestedW: reserveW,
        reserveW,
        pvReserveW,
        budgetW: budgetRaw,
        usedW,
        remainingW,
        mode: String(input.mode ?? '').trim() || 'unknown',
        ok: warnings.length === 0,
        warnings,
    };
}
/**
 * Code-Teil: buildChargingManagementPrep
 * Zweck: EVCS-/Charging-Management-TS-Vorbereitung für Diagnose und spätere Produktion bauen.
 */
function buildChargingManagementPrep(input) {
    const wallboxInput = Array.isArray(input.wallboxes) ? input.wallboxes : [];
    const wallboxes = wallboxInput.map((wb, index) => normalizeChargingWallbox(wb, index));
    const enabledWallboxes = wallboxes.filter((w) => w.enabled);
    const blockers = [];
    const warnings = [];
    if (!wallboxes.length)
        warnings.push('no-wallboxes-configured');
    if (enabledWallboxes.length && !enabledWallboxes.some((w) => w.hasAnySetpoint))
        blockers.push('enabled-wallboxes-without-setpoint');
    for (const wb of wallboxes)
        for (const issue of wb.mappingIssues)
            warnings.push(`${wb.key}:${issue}`);
    const totalConfiguredMaxPowerW = wallboxes.reduce((sum, wb) => sum + Math.max(0, wb.maxPowerW || 0), 0);
    const totalRuntimeTargetPowerW = positiveNumber(input.totalTargetPowerW);
    const totalActualPowerW = positiveNumber(input.totalPowerW);
    const onlineWallboxes = positiveNumber(input.onlineWallboxes);
    const visibleEvcs = wallboxes.length > 0 && wallboxes.some((w) => w.enabled || w.hasAnySetpoint);
    const hasAnySetpoint = wallboxes.some((w) => w.hasAnySetpoint);
    const budgetPrep = buildChargingBudgetReservationPrep(input, wallboxes);
    return {
        source: 'ts-charging-management-prep-v1',
        available: true,
        productive: false,
        ok: blockers.length === 0,
        ts: toNumberOrNull(input.ts) ?? Date.now(),
        mode: String(input.mode ?? '').trim() || 'unknown',
        enabled: toBoolean(input.enabled, true),
        wallboxCount: wallboxes.length,
        enabledWallboxCount: enabledWallboxes.length,
        visibleEvcs,
        hasAnySetpoint,
        totalConfiguredMaxPowerW,
        totalRuntimeTargetPowerW,
        totalActualPowerW,
        onlineWallboxes,
        warnings,
        blockers,
        wallboxes,
        budgetPrep,
    };
}
/**
 * Code-Teil: compareChargingPrepWithRuntime
 * Zweck: TS-Vorbereitung mit JS-Runtimewerten vergleichen. Nur Diagnose, kein Blocker in 0.7.122.
 */
function compareChargingPrepWithRuntime(runtime, prep) {
    const mismatches = [];
    const cmp = (field, jsValue, tsValue, tolerance = 0) => {
        const js = toNumberOrNull(jsValue);
        const ts = toNumberOrNull(tsValue);
        if (js === null && ts === null)
            return;
        if (js === null || ts === null) {
            mismatches.push({ field, js, ts, diff: null });
            return;
        }
        const diff = Math.abs(js - ts);
        if (diff > tolerance)
            mismatches.push({ field, js, ts, diff: Math.round(diff) });
    };
    cmp('wallboxCount', runtime.wallboxCount, prep.wallboxCount);
    cmp('onlineWallboxes', runtime.onlineWallboxes, prep.onlineWallboxes);
    cmp('totalTargetPowerW', runtime.totalTargetPowerW, prep.totalRuntimeTargetPowerW, 1);
    cmp('totalPowerW', runtime.totalPowerW, prep.totalActualPowerW, 1);
    return {
        source: 'ts-charging-management-prep-compare-v1',
        ok: mismatches.length === 0,
        mismatchCount: mismatches.length,
        mismatches,
    };
}
