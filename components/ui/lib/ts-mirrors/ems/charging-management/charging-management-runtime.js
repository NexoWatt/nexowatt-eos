'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/ems/charging-management/charging-management-runtime.ts
 * Quell-Hash: sha256:9075c56342c1d575ac6dd610b1325adfea6f44284fbfae161160e3ae05543c95
 * Erzeugung: npm run sync:ts-ems-mirrors
 *
 * Zweck:
 * EVCS-/Charging-Management-TS-Vorbereitung für Sichtbarkeit, Budgetreservierung und Shadow-Vergleich.
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
 * Aufgabe: Verbindet die typisierten Ladeentscheidungs-Helfer in einer auswertbaren Laufzeitstruktur.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/ems/charging-management/charging-management-runtime.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Datei: src-ts/ems/charging-management/charging-management-runtime.ts
 *
 * Zweck:
 * Erste echte TypeScript-Helfer für EVCS / Charging-Management.
 * Diese Datei übernimmt in 0.7.122 noch keine produktive Ladeentscheidung, sondern
 * baut einen geprüften TS-Vorbereitungs- und Vergleichsplan für Ladeleistung,
 * Budgetreservierung und Feature-Sichtbarkeit.
 *
 * Zusammenhang:
 * Charging-Management hängt an Core-Limits, Restgates, Consumer-Reservierungen,
 * EVCS-Datenpunkten, History/PDF-Sichtbarkeit und KI-Berater. Deshalb wird dieser
 * Bereich zuerst in klaren, kleinen Helfern vorbereitet.
 *
 * Wichtig:
 * - 0 W ist gültig und darf nicht als fehlend gelten.
 * - 0 Ladepunkte bedeutet „keine EVCS-Anlage“ und darf keine Wallbox sichtbar machen.
 * - TypeScript schreibt in 0.7.122 noch keine Ladeleistung produktiv.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toFiniteNumber = toFiniteNumber;
exports.toNonNegativeWatt = toNonNegativeWatt;
exports.normalizeChargingMode = normalizeChargingMode;
exports.buildChargingReservationPlan = buildChargingReservationPlan;
exports.buildChargingVisibilityPlan = buildChargingVisibilityPlan;
exports.buildChargingManagementRuntimePrep = buildChargingManagementRuntimePrep;
exports.compareChargingManagementRuntimePrep = compareChargingManagementRuntimePrep;
/**
 * Code-Teil: toFiniteNumber
 * Zweck: Normalisiert unbekannte Eingabewerte auf eine endliche Zahl oder Fallback.
 * Zusammenhang: Viele EVCS-Werte kommen aus States/Config; 0 ist gültig.
 */
function toFiniteNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}
/**
 * Code-Teil: toNonNegativeWatt
 * Zweck: Normalisiert Leistungswerte auf Watt >= 0.
 * Zusammenhang: Ziel-/Budget-/Reservierungswerte dürfen nie negativ in die Budgetkette laufen.
 */
function toNonNegativeWatt(value, fallback = 0) {
    const n = toFiniteNumber(value, fallback);
    return Math.max(0, Math.round(Number(n ?? fallback)));
}
/**
 * Code-Teil: normalizeChargingMode
 * Zweck: Hält die bekannten EVCS-Modi stabil zwischen JS- und TS-Welt.
 */
function normalizeChargingMode(mode) {
    const s = String(mode || '').trim().toLowerCase();
    if (!s)
        return 'auto';
    if (s === 'pvonly' || s === 'pv_only' || s === 'pvsurplus')
        return 'pv';
    if (s === 'min_pv' || s === 'min+pv' || s === 'min_plus_pv')
        return 'minpv';
    if (s === 'turbo')
        return 'boost';
    if (['auto', 'pv', 'minpv', 'boost'].includes(s))
        return s;
    return s;
}
/**
 * Code-Teil: buildChargingReservationPlan
 * Zweck: Baut den zentralen Core-Limits-Reservierungsplan für EVCS.
 * Zusammenhang: Entspricht fachlich dem JS-Block `rt.reserve({ key: 'evcs', ... })`.
 */
function buildChargingReservationPlan(input) {
    const usedW = toNonNegativeWatt(input.usedW ?? input.totalTargetPowerW ?? 0);
    const targetW = toNonNegativeWatt(input.totalTargetPowerW ?? usedW);
    const reserveW = Math.max(usedW, targetW);
    const pvReserveW = Math.max(0, Math.min(reserveW, toNonNegativeWatt(input.pvEvcsUsedWForBudget ?? 0)));
    return {
        key: 'evcs',
        app: 'chargingManagement',
        label: 'Ladepunkte',
        priority: 100,
        requestedW: reserveW,
        reserveW,
        pvReserveW,
        pvOnly: false,
        mode: normalizeChargingMode(input.mode || 'auto'),
    };
}
/**
 * Code-Teil: buildChargingVisibilityPlan
 * Zweck: Bewertet, ob EVCS/Wallbox-Funktionen sichtbar sein dürfen.
 * Zusammenhang: Später relevant für App, History, PDF und KI-Berater.
 */
function buildChargingVisibilityPlan(input) {
    const wallboxCount = Math.max(0, Math.round(Number(toFiniteNumber(input.wallboxCount, 0) || 0)));
    const onlineCount = Math.max(0, Math.round(Number(toFiniteNumber(input.onlineCount, 0) || 0)));
    const hasEvcs = wallboxCount > 0 || onlineCount > 0 || toNonNegativeWatt(input.totalTargetPowerW ?? 0) > 0;
    return {
        hasEvcs,
        reason: hasEvcs ? 'evcs-detected' : 'no-wallbox-configured',
        wallboxCount,
        onlineCount,
    };
}
/**
 * Code-Teil: buildChargingManagementRuntimePrep
 * Zweck: Baut die TS-Vorbereitung für EVCS-Lademanagement.
 * Wichtig: `productive` ist in 0.7.122 bewusst false; die JS-Runtime bleibt führend.
 */
function buildChargingManagementRuntimePrep(input) {
    const reservation = buildChargingReservationPlan(input);
    const visibility = buildChargingVisibilityPlan(input);
    const totalTargetPowerW = toNonNegativeWatt(input.totalTargetPowerW ?? reservation.reserveW);
    const usedW = toNonNegativeWatt(input.usedW ?? totalTargetPowerW);
    const remainingW = toNonNegativeWatt(input.remainingW ?? 0);
    const warnings = [];
    if (!visibility.hasEvcs)
        warnings.push('no-evcs-detected');
    if (reservation.reserveW > 0 && !visibility.hasEvcs)
        warnings.push('reserve-without-wallbox');
    return {
        source: 'ts-charging-management-prep-v1',
        ok: true,
        productive: false,
        mode: reservation.mode,
        budgetMode: String(input.budgetMode || ''),
        status: String(input.status || ''),
        reservation,
        visibility,
        values: {
            wallboxCount: visibility.wallboxCount,
            onlineCount: visibility.onlineCount,
            totalTargetPowerW,
            totalTargetCurrentA: Math.max(0, Number(toFiniteNumber(input.totalTargetCurrentA, 0) || 0)),
            budgetW: toFiniteNumber(input.budgetW, null),
            usedW,
            remainingW,
            pvEvcsUsedWForBudget: toNonNegativeWatt(input.pvEvcsUsedWForBudget ?? 0),
            evcsHighLevelCapW: toFiniteNumber(input.evcsHighLevelCapW, null),
        },
        warnings,
    };
}
/**
 * Code-Teil: compareChargingManagementRuntimePrep
 * Zweck: Vergleicht JS-Laufzeitwerte mit der TS-Vorbereitung.
 * Zusammenhang: Wird in 0.7.122 als Shadow-/Vorbereitungsdiagnose genutzt.
 */
function compareChargingManagementRuntimePrep(input, ts = buildChargingManagementRuntimePrep(input)) {
    const mismatches = [];
    const checkW = (field, js, tv, tolerance = 1) => {
        const j = toFiniteNumber(js, null);
        const t = toFiniteNumber(tv, null);
        if (j === null && t === null)
            return;
        const diff = (j !== null && t !== null) ? Math.abs(j - t) : null;
        if (diff !== null && diff <= tolerance)
            return;
        mismatches.push({ field, js: j, ts: t, diff });
    };
    checkW('reservation.reserveW', input.usedW ?? input.totalTargetPowerW ?? 0, ts.reservation.reserveW, 1);
    checkW('reservation.pvReserveW', Math.min(toNonNegativeWatt(input.usedW ?? input.totalTargetPowerW ?? 0), toNonNegativeWatt(input.pvEvcsUsedWForBudget ?? 0)), ts.reservation.pvReserveW, 1);
    checkW('values.totalTargetPowerW', input.totalTargetPowerW ?? 0, ts.values.totalTargetPowerW, 1);
    checkW('values.usedW', input.usedW ?? ts.values.totalTargetPowerW, ts.values.usedW, 1);
    checkW('values.remainingW', input.remainingW ?? 0, ts.values.remainingW, 1);
    const jsMode = normalizeChargingMode(input.mode || 'auto');
    if (jsMode !== ts.mode)
        mismatches.push({ field: 'mode', js: jsMode, ts: ts.mode });
    return {
        source: 'ts-charging-management-shadow-v1',
        available: true,
        ok: mismatches.length === 0,
        productive: false,
        mismatchCount: mismatches.length,
        mismatches,
        ts,
    };
}
