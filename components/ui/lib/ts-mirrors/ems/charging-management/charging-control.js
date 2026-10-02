'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/ems/charging-management/charging-control.ts
 * Quell-Hash: sha256:a371663a9dbb6f21fc1646208e952503cd41f57e6d030c11fed0de9bc22e29df
 * Erzeugung: npm run sync:ts-ems-mirrors
 *
 * Zweck:
 * EVCS-/Charging-Management-Control-Shadow für die spätere TypeScript-Übernahme.
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
 * Aufgabe: Berechnet den für einen Ladepunkt geltenden Modus- und Bedarfsrahmen vor der Verteilung des Ladebudgets.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/ems/charging-management/charging-control.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildChargingControlShadowPlan = buildChargingControlShadowPlan;
exports.compareChargingControlShadowPlan = compareChargingControlShadowPlan;
exports.buildChargingControlProductivePrep = buildChargingControlProductivePrep;
exports.buildChargingControlProductive = buildChargingControlProductive;
/** Code-Teil: toNumber. Zweck: Wandelt unbekannte Werte robust in Zahlen um und erhält 0 als gültigen Wert. */
function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}
/** Code-Teil: nonNegative. Zweck: Klemmt Leistungs-/Zählerwerte auf >= 0. */
function nonNegative(value) {
    const n = toNumber(value, 0);
    return n > 0 ? Math.round(n) : 0;
}
/** Code-Teil: toBool. Zweck: Normalisiert booleans, ohne false als fehlend zu behandeln. */
function toBool(value) {
    if (value === true)
        return true;
    if (value === false)
        return false;
    if (typeof value === 'number')
        return Number.isFinite(value) && value !== 0;
    const s = String(value ?? '').trim().toLowerCase();
    return ['true', '1', 'on', 'yes', 'ja', 'active'].includes(s);
}
/**
 * Code-Teil: buildChargingControlShadowPlan
 *
 * Zweck:
 * Baut aus den aktuellen JavaScript-Controlwerten einen typisierten TS-Shadow-Plan.
 * Der Plan ist in 0.7.122 ausdrücklich noch nicht produktiv, sondern die sichere
 * Vorstufe für die spätere EVCS-/Charging-Management-TS-Übernahme.
 */
function buildChargingControlShadowPlan(input) {
    const wallboxCount = nonNegative(input.wallboxCount);
    const onlineWallboxes = nonNegative(input.onlineWallboxes);
    const connectedCount = nonNegative(input.connectedCount);
    const status = String(input.status || (String(input.mode || '') === 'off' ? 'off' : 'ok'));
    const active = typeof input.active === 'boolean' ? input.active : String(input.mode || '') !== 'off';
    const budgetW = nonNegative(input.budgetW);
    const usedW = nonNegative(input.usedW);
    const remainingW = nonNegative(input.remainingW);
    const warnings = [];
    const blockers = [];
    if (wallboxCount === 0)
        warnings.push('no-wallboxes-configured');
    if (toBool(input.staleMeter))
        blockers.push('stale-meter');
    if (toBool(input.staleBudget))
        blockers.push('stale-budget');
    if (usedW > budgetW && budgetW > 0)
        warnings.push('used-over-budget');
    return {
        source: 'ts-charging-control-shadow-v1',
        available: true,
        ok: blockers.length === 0,
        productive: false,
        control: {
            active,
            mode: String(input.mode || ''),
            status,
            budgetMode: String(input.budgetMode || ''),
            budgetW,
            usedW,
            remainingW,
            totalPowerW: nonNegative(input.totalPowerW),
            totalTargetPowerW: nonNegative(input.totalTargetPowerW),
            totalTargetCurrentA: Math.max(0, toNumber(input.totalTargetCurrentA, 0)),
        },
        visibility: {
            hasEvcs: wallboxCount > 0,
            onlineWallboxes,
            wallboxCount,
            connectedCount,
        },
        gates: {
            pausedByPeakShaving: toBool(input.pausedByPeakShaving),
            staleMeter: toBool(input.staleMeter),
            staleBudget: toBool(input.staleBudget),
            pvAvailable: toBool(input.pvAvailable),
            gridCapBinding: toBool(input.gridCapBinding),
            phaseCapBinding: toBool(input.phaseCapBinding),
            para14aActive: toBool(input.para14aActive),
            para14aBinding: toBool(input.para14aBinding),
            storageAssistActive: toBool(input.storageAssistActive),
        },
        caps: {
            gridImportLimitW: nonNegative(input.gridImportLimitW),
            gridImportLimitEffW: nonNegative(input.gridImportLimitEffW),
            gridImportW: Math.round(toNumber(input.gridImportW, 0)),
            gridCapEvcsW: nonNegative(input.gridCapEvcsW),
            phaseCapEvcsW: nonNegative(input.phaseCapEvcsW),
            para14aCapEvcsW: nonNegative(input.para14aCapEvcsW),
            storageAssistW: nonNegative(input.storageAssistW),
        },
        warnings,
        blockers,
    };
}
/**
 * Code-Teil: compareChargingControlShadowPlan
 * Zweck: Vergleicht die JS-Controlwerte mit dem TS-Shadow-Plan für Diagnose und spätere Umschaltung.
 */
function compareChargingControlShadowPlan(input, plan) {
    const pairs = [
        ['budgetW', nonNegative(input.budgetW), plan.control.budgetW],
        ['usedW', nonNegative(input.usedW), plan.control.usedW],
        ['remainingW', nonNegative(input.remainingW), plan.control.remainingW],
        ['wallboxCount', nonNegative(input.wallboxCount), plan.visibility.wallboxCount],
        ['onlineWallboxes', nonNegative(input.onlineWallboxes), plan.visibility.onlineWallboxes],
        ['status', String(input.status || ''), plan.control.status],
    ];
    const mismatches = pairs
        .filter(([, js, ts]) => js !== ts)
        .map(([field, js, ts]) => ({ field, js, ts }));
    return {
        source: 'ts-charging-control-shadow-comparison-v1',
        ok: mismatches.length === 0,
        mismatchCount: mismatches.length,
        mismatches,
    };
}
/**
 * Code-Teil: buildChargingControlProductiveApply
 * Zweck: Extrahiert nur die künftig sicher übernehmbaren Control-/Summary-Werte.
 * Wichtig: Diese Struktur enthält bewusst keine Wallbox-Verteilung und keine Setpoint-Schreibbefehle.
 */
function buildChargingControlProductiveApply(plan) {
    return {
        active: plan.control.active,
        mode: plan.control.mode,
        status: plan.control.status,
        budgetMode: plan.control.budgetMode,
        budgetW: plan.control.budgetW,
        usedW: plan.control.usedW,
        remainingW: plan.control.remainingW,
        totalPowerW: plan.control.totalPowerW,
        totalTargetPowerW: plan.control.totalTargetPowerW,
        totalTargetCurrentA: plan.control.totalTargetCurrentA,
        wallboxCount: plan.visibility.wallboxCount,
        onlineWallboxes: plan.visibility.onlineWallboxes,
        connectedCount: plan.visibility.connectedCount,
        pausedByPeakShaving: plan.gates.pausedByPeakShaving,
        staleMeter: plan.gates.staleMeter,
        staleBudget: plan.gates.staleBudget,
        pvAvailable: plan.gates.pvAvailable,
        gridCapBinding: plan.gates.gridCapBinding,
        phaseCapBinding: plan.gates.phaseCapBinding,
        para14aActive: plan.gates.para14aActive,
        para14aBinding: plan.gates.para14aBinding,
        storageAssistActive: plan.gates.storageAssistActive,
        gridImportLimitW: plan.caps.gridImportLimitW,
        gridImportLimitEffW: plan.caps.gridImportLimitEffW,
        gridImportW: plan.caps.gridImportW,
        gridCapEvcsW: plan.caps.gridCapEvcsW,
        phaseCapEvcsW: plan.caps.phaseCapEvcsW,
        para14aCapEvcsW: plan.caps.para14aCapEvcsW,
        storageAssistW: plan.caps.storageAssistW,
    };
}
/**
 * Code-Teil: buildChargingControlProductivePrep
 *
 * Zweck:
 * Bereitet den EVCS-/Charging-Control-Shadow als produktiven TS-Kandidaten vor,
 * ohne ihn in 0.7.124 schon auf echte Control-States anzuwenden.
 *
 * Zusammenhang:
 * Die bisherige JS-Runtime bleibt führend für Ladepunktverteilung, Failsafe,
 * Boost, PV-/Min+PV-Logik und Setpoint-Schreiben. TypeScript liefert nur einen
 * geprüften Apply-Vertrag für Control-/Summary-Werte, damit der nächste Schritt
 * gezielt und rückfallfähig produktiv geschaltet werden kann.
 *
 * Sicherheitsregel:
 * Ein Apply-Vertrag wird nur vorbereitet, wenn der JS/TS-Control-Vergleich sauber
 * ist und keine harten Control-Blocker wie stale meter/budget aktiv sind.
 */
function buildChargingControlProductivePrep(input, plan = buildChargingControlShadowPlan(input), comparison = compareChargingControlShadowPlan(input, plan)) {
    const blockers = Array.isArray(plan.blockers) ? [...plan.blockers] : [];
    if (!comparison.ok)
        blockers.push('ts-js-control-mismatch');
    const prepared = plan.ok === true && comparison.ok === true && blockers.length === 0;
    const fallbackReason = prepared
        ? ''
        : (!comparison.ok ? 'ts-js-control-mismatch' : (blockers[0] || 'ts-control-not-ready'));
    return {
        source: 'ts-charging-control-productive-prep-v1',
        available: true,
        ok: prepared,
        productive: false,
        prepared,
        preparedForProductiveTakeover: prepared,
        fallback: !prepared,
        fallbackReason,
        blockers,
        warnings: Array.isArray(plan.warnings) ? [...plan.warnings] : [],
        comparison,
        plan,
        apply: prepared ? buildChargingControlProductiveApply(plan) : null,
        safety: {
            appliesOnlyToControlSummary: true,
            keepsAllocationInJavascript: true,
            keepsSetpointWritingInJavascript: true,
            keepsFailsafeInJavascript: true,
        },
        nextAction: prepared
            ? 'Control-Summary kann im nächsten Schritt kontrolliert produktiv aus TypeScript übernommen werden; Ladepunktverteilung und Setpoint-Schreiben bleiben JavaScript.'
            : 'JavaScript bleibt führend; erst Shadow-Abweichungen oder Control-Blocker bereinigen.',
    };
}
/**
 * Code-Teil: buildChargingControlProductive
 *
 * Zweck:
 * Übernimmt den sicheren Control-/Summary-Ausschnitt produktiv aus TypeScript,
 * sobald Shadow-Plan und JS/TS-Vergleich sauber sind.
 *
 * Scope-Grenze:
 * Diese Funktion entscheidet bewusst keine Wallbox-Verteilung und erzeugt keine
 * Setpoint-Schreibbefehle. Ladepunkt-Allocation, Boost-/PV-/Min+PV-Logik,
 * Failsafe-Stopps und ioBroker-I/O bleiben weiterhin in der bestehenden Runtime.
 */
function buildChargingControlProductive(input, plan = buildChargingControlShadowPlan(input), comparison = compareChargingControlShadowPlan(input, plan)) {
    const blockers = Array.isArray(plan.blockers) ? [...plan.blockers] : [];
    if (!comparison.ok)
        blockers.push('ts-js-control-mismatch');
    const canApply = plan.ok === true && comparison.ok === true && blockers.length === 0;
    const fallbackReason = canApply
        ? ''
        : (!comparison.ok ? 'ts-js-control-mismatch' : (blockers[0] || 'ts-control-not-ready'));
    return {
        source: 'ts-charging-control-productive-v1',
        available: true,
        ok: canApply,
        productive: canApply,
        prepared: canApply,
        preparedForProductiveTakeover: canApply,
        fallback: !canApply,
        fallbackReason,
        blockers,
        warnings: Array.isArray(plan.warnings) ? [...plan.warnings] : [],
        comparison,
        plan,
        apply: canApply ? buildChargingControlProductiveApply(plan) : null,
        safety: {
            appliesOnlyToControlSummary: true,
            keepsAllocationInJavascript: true,
            keepsSetpointWritingInJavascript: true,
            keepsFailsafeInJavascript: true,
        },
        nextAction: canApply
            ? 'Control-/Summary-Werte werden produktiv aus TypeScript übernommen; Ladepunktverteilung und Setpoint-Schreiben bleiben JavaScript.'
            : 'JavaScript bleibt führend; erst Shadow-Abweichungen oder Control-Blocker bereinigen.',
    };
}
