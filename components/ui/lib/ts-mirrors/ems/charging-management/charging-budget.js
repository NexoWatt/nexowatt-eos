'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/ems/charging-management/charging-budget.ts
 * Quell-Hash: sha256:d169f3c02447dc1428b4fa2e57fd29bda80df2db1e044064961655b39ce8f484
 * Erzeugung: npm run sync:ts-ems-mirrors
 *
 * Zweck:
 * Charging-Management-/EVCS-Budget-Caps für Shadow-Vergleich und spätere produktive TS-Übernahme.
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
 * Aufgabe: Berechnet den zwischen freigegebenen Ladepunkten verteilbaren Leistungsrahmen.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/ems/charging-management/charging-budget.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Datei: src-ts/ems/charging-management/charging-budget.ts
 *
 * Zweck:
 * TypeScript-Helfer für den ersten kontrollierten EVCS-/Charging-Management-Schritt.
 * Diese Datei berechnet noch keine komplette Ladepunktverteilung, sondern nur die
 * sicherheitsrelevanten Budget-/Cap-Gates, die aktuell in `ems/modules/charging-management.js`
 * inline entstehen.
 *
 * Zusammenhang:
 * Die Ergebnisse hängen fachlich an Core-Limits, Peak-Shaving, §14a, Netzanschlussgrenzen,
 * Phasenstromgrenzen und EVCS-High-Level-Caps. Sie beeinflussen später Ladefreigabe,
 * Budgetverteilung und History/PDF-Sichtbarkeit.
 *
 * Wichtig:
 * 0 W ist ein gültiger, sicherer Cap-Wert. Unendliche Budgets bedeuten „nicht begrenzt“
 * und dürfen nicht versehentlich als 0 behandelt werden.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeChargingBudgetSafetyCaps = computeChargingBudgetSafetyCaps;
exports.compareChargingBudgetSafetyCaps = compareChargingBudgetSafetyCaps;
exports.buildChargingBudgetSafetyCapsProductive = buildChargingBudgetSafetyCapsProductive;
exports.buildChargingBudgetProductiveDecision = buildChargingBudgetProductiveDecision;
/**
 * Code-Teil: finiteOrNull
 * Zweck: Wandelt unbekannte Werte in finite Zahlen oder null um. 0 bleibt gültig.
 */
function finiteOrNull(value) {
    if (value === null || value === undefined || value === '')
        return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}
/**
 * Code-Teil: applyMinCap
 * Zweck: Wendet eine obere Leistungsgrenze an. Unbegrenztes Budget bleibt nur dann
 * unbegrenzt, wenn kein Cap vorhanden ist.
 */
function applyMinCap(current, cap) {
    if (cap === null || !Number.isFinite(cap) || cap < 0)
        return { value: current, applied: false };
    if (current === null || !Number.isFinite(current))
        return { value: Math.max(0, cap), applied: true };
    const next = Math.max(0, Math.min(current, cap));
    return { value: next, applied: next !== current };
}
/**
 * Code-Teil: appendBudgetModeSuffix
 * Zweck: Spiegelt die JS-Runtime-Konvention, aktive Begrenzungen im budgetMode zu markieren.
 */
function appendBudgetModeSuffix(mode, suffix) {
    const m = String(mode || 'unlimited');
    return m.includes(suffix) ? m : `${m}+${suffix}`;
}
/**
 * Code-Teil: computeChargingBudgetSafetyCaps
 *
 * Zweck:
 * Berechnet die sicherheitsrelevanten EVCS-Budget-Caps in TypeScript parallel zur
 * bestehenden JavaScript-Runtime.
 *
 * Zusammenhang:
 * 0.7.123 nutzt diesen Helfer produktiv für die sicherheitsrelevanten EVCS-Budget-Caps.
 * Die Ladepunktverteilung selbst bleibt weiterhin JavaScript. Falls TS und JS abweichen
 * oder der Spiegel fehlschlägt, bleibt die bestehende JavaScript-Logik Fallback.
 */
function computeChargingBudgetSafetyCaps(input) {
    let budget = finiteOrNull(input.budgetW);
    let mode = String(input.budgetMode || 'unlimited');
    const before = budget;
    const gridCap = finiteOrNull(input.gridCapEvcsW);
    const phaseCap = finiteOrNull(input.phaseCapEvcsW);
    const p14aCap = finiteOrNull(input.para14aTotalCapW);
    let gridApplied = false;
    let phaseApplied = false;
    let p14aApplied = false;
    if (gridCap !== null && input.gridCapBinding === true) {
        const r = applyMinCap(budget, gridCap);
        budget = r.value;
        gridApplied = r.applied;
        // JS marks an active grid-import safety cap in effectiveBudgetMode even when it does not
        // further reduce an already lower PV/engine budget. Keep that diagnostic parity.
        mode = appendBudgetModeSuffix(mode, 'gridImport');
    }
    if (phaseCap !== null && input.phaseCapBinding === true) {
        const r = applyMinCap(budget, phaseCap);
        budget = r.value;
        phaseApplied = r.applied;
        // Same convention as JS: mode suffix means the cap participated, not only that it bound.
        mode = appendBudgetModeSuffix(mode, 'phaseCap');
    }
    if (input.para14aActive === true && p14aCap !== null && p14aCap > 0) {
        const r = applyMinCap(budget, p14aCap);
        budget = r.value;
        p14aApplied = r.applied;
        // §14a is visible in budgetMode whenever the active cap participates.
        mode = appendBudgetModeSuffix(mode, '14a');
    }
    let finalStatus = 'ok';
    if (gridApplied && phaseApplied)
        finalStatus = 'limited_grid_import_and_phase';
    else if (gridApplied)
        finalStatus = 'limited_grid_import';
    else if (phaseApplied)
        finalStatus = 'limited_phase_cap';
    if (p14aApplied && finalStatus === 'ok')
        finalStatus = 'limited_14a';
    return {
        source: 'ts-charging-budget-safety-caps-v1',
        budgetBeforeW: before === null ? null : Math.round(before),
        budgetAfterW: budget === null ? null : Math.round(budget),
        effectiveBudgetMode: mode,
        gridCapApplied: gridApplied,
        phaseCapApplied: phaseApplied,
        para14aApplied: p14aApplied,
        finalStatus,
        caps: {
            gridCapEvcsW: gridCap === null ? null : Math.round(gridCap),
            phaseCapEvcsW: phaseCap === null ? null : Math.round(phaseCap),
            para14aTotalCapW: p14aCap === null ? null : Math.round(p14aCap),
        },
    };
}
/**
 * Code-Teil: compareChargingBudgetSafetyCaps
 * Zweck: Vergleicht JS-Runtime-Werte mit der TS-Budget-Cap-Berechnung.
 */
function compareChargingBudgetSafetyCaps(js, input) {
    const ts = computeChargingBudgetSafetyCaps(input);
    const mismatches = [];
    const cmp = (field, jsVal, tsVal) => {
        if (jsVal !== tsVal)
            mismatches.push({ field, js: jsVal, ts: tsVal });
    };
    cmp('budgetAfterW', js.budgetAfterW, ts.budgetAfterW);
    cmp('effectiveBudgetMode', js.effectiveBudgetMode, ts.effectiveBudgetMode);
    cmp('gridCapApplied', !!js.gridCapApplied, ts.gridCapApplied);
    cmp('phaseCapApplied', !!js.phaseCapApplied, ts.phaseCapApplied);
    cmp('para14aApplied', !!js.para14aApplied, ts.para14aApplied);
    return {
        source: 'ts-charging-budget-shadow-v1',
        available: true,
        ok: mismatches.length === 0,
        mismatchCount: mismatches.length,
        mismatches,
        ts,
    };
}
/**
 * Code-Teil: buildChargingBudgetSafetyCapsProductive
 *
 * Zweck:
 * Baut die produktive TS-Entscheidung für EVCS-/Charging-Budget-Caps.
 *
 * Zusammenhang:
 * 0.7.123 übernimmt nur den sicheren Cap-Kern produktiv aus TypeScript:
 * Grid-Cap, Phasen-Cap und §14a-High-Level-Cap. Die eigentliche Ladepunktverteilung
 * und das Setpoint-Schreiben bleiben weiter JavaScript.
 *
 * Sicherheitsregel:
 * TypeScript darf nur angewendet werden, wenn der Vergleich zur bisherigen JS-Runtime
 * sauber ist. Bei Mismatch/Fehler bleibt JS Fallback.
 */
function buildChargingBudgetSafetyCapsProductive(js, input) {
    const comparison = compareChargingBudgetSafetyCaps(js, input);
    const canApply = comparison.available === true && comparison.ok === true && comparison.ts !== null;
    const ts = comparison.ts;
    return {
        source: 'ts-charging-budget-productive-v1',
        available: comparison.available === true,
        ok: canApply,
        productive: canApply,
        fallback: !canApply,
        fallbackReason: canApply ? '' : (comparison.available ? 'ts-js-mismatch' : 'missing-ts-budget'),
        comparison,
        apply: canApply && ts ? {
            budgetW: ts.budgetAfterW,
            effectiveBudgetMode: ts.effectiveBudgetMode,
            gridCapBinding: ts.gridCapApplied,
            phaseCapBinding: ts.phaseCapApplied,
            para14aBinding: ts.para14aApplied,
            gridCapEvcsW: ts.caps.gridCapEvcsW,
            phaseCapEvcsW: ts.caps.phaseCapEvcsW,
            para14aTotalCapW: ts.caps.para14aTotalCapW,
        } : null,
    };
}
/**
 * Code-Teil: buildChargingBudgetProductiveDecision
 *
 * Zweck:
 * Flacher produktiver EVCS-Budget-Cap-Vertrag für die CommonJS-Runtime.
 * `charging-management.js` kann diese Struktur direkt anwenden, ohne tiefe TS-Objekte
 * kennen zu müssen.
 *
 * Zusammenhang:
 * 0.7.123 übernimmt nur Budget-Caps produktiv. Ladepunktverteilung, Failsafe, Boost
 * und Setpoint-Schreiben bleiben JavaScript.
 */
function buildChargingBudgetProductiveDecision(js, input) {
    const base = buildChargingBudgetSafetyCapsProductive(js, input);
    return {
        ...base,
        budgetAfterW: base.apply ? base.apply.budgetW : null,
        effectiveBudgetMode: base.apply ? base.apply.effectiveBudgetMode : String(js.effectiveBudgetMode || ''),
        gridCapApplied: base.apply ? base.apply.gridCapBinding : !!js.gridCapApplied,
        phaseCapApplied: base.apply ? base.apply.phaseCapBinding : !!js.phaseCapApplied,
        para14aApplied: base.apply ? base.apply.para14aBinding : !!js.para14aApplied,
        gridCapEvcsW: base.apply ? base.apply.gridCapEvcsW : null,
        phaseCapEvcsW: base.apply ? base.apply.phaseCapEvcsW : null,
        para14aTotalCapW: base.apply ? base.apply.para14aTotalCapW : null,
    };
}
