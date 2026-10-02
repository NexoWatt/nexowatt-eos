// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: ems/services/pv-surplus-allocation.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * ems/services/pv-surplus-allocation.js
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
 * Original-Hash: ced35922d4dab9cbcf032d11fca5d7ae6e7bdf5547faa94756e4948282186274
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
 * Quelle: src-ts/runtime-executables/ems/services/pv-surplus-allocation.ts
 * Quell-Hash: sha256:859ba823221dd47cdab8032e3ec8e32f740a82fc50ceb717cf232fae8e9b8a13
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/pv-surplus-allocation.js.
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
 * Aufgabe: Teilt verfügbaren PV-Überschuss und reservierten Ladebedarf zwischen den freigegebenen Nutzungen auf.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/pv-surplus-allocation.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePvSurplusPriority = normalizePvSurplusPriority;
exports.buildPvSurplusAllocation = buildPvSurplusAllocation;
exports.buildAutoPvPriorityReservation = buildAutoPvPriorityReservation;
/**
 * Code-Teil: clamp
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function clamp(value, min, max, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}
/**
 * Code-Teil: roundW
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function roundW(value) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n) : 0;
}
/**
 * Code-Teil: normalizePvSurplusPriority
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function normalizePvSurplusPriority(value) {
    const mode = String(value ?? '').trim().toLowerCase();
    if (mode === 'storage' || mode === 'speicher')
        return 'storage';
    if (mode === 'emobility' || mode === 'e-mobility' || mode === 'evcs' || mode === 'wallbox')
        return 'emobility';
    if (mode === 'dynamic' || mode === 'auto' || mode === 'none' || mode === 'off' || mode === 'disabled')
        return 'dynamic';
    return 'both';
}
/**
 * Code-Teil: buildPvSurplusAllocation
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function buildPvSurplusAllocation(totalW, modeRaw, evcsSharePctRaw, options = {}) {
    const total = Math.max(0, Number(totalW) || 0);
    const allocationEnabled = options.allocationEnabled !== false;
    const mode = allocationEnabled ? normalizePvSurplusPriority(modeRaw) : 'dynamic';
    const evcsSharePct = clamp(evcsSharePctRaw, 0, 100, 50);
    const storageEligible = options.storageEligible !== false;
    const storageMaxRaw = Number(options.storageMaxChargeW);
    const storageMaxChargeW = Number.isFinite(storageMaxRaw) && storageMaxRaw > 0 ? storageMaxRaw : Number.POSITIVE_INFINITY;
    let storageWantedW = 0;
    let reason = 'shared';
    if (!storageEligible)
        reason = 'storage-not-eligible';
    else if (mode === 'storage') {
        storageWantedW = total;
        reason = 'storage-first';
    }
    else if (mode === 'emobility')
        reason = 'emobility-first';
    else if (mode === 'dynamic')
        reason = allocationEnabled ? 'dynamic-demand-remainder' : 'fixed-allocation-disabled';
    else
        storageWantedW = total * (1 - evcsSharePct / 100);
    const storageGuaranteedW = storageEligible ? Math.max(0, Math.min(total, storageWantedW, storageMaxChargeW)) : 0;
    return {
        mode,
        allocationEnabled,
        evcsSharePct: Math.round(evcsSharePct),
        totalW: roundW(total),
        evcsCapW: roundW(Math.max(0, total - storageGuaranteedW)),
        storageGuaranteedW: roundW(storageGuaranteedW),
        storageEligible,
        storageMaxChargeW: Number.isFinite(storageMaxChargeW) ? roundW(storageMaxChargeW) : null,
        reason,
    };
}
/**
 * Attribution only: never creates a charging command or a grid permission.
 * PV-driven Auto is already effectiveMode=pv and uses the existing phase-aware
 * PV allocator. Grid-enabled Auto may use a partial PV share, but only after
 * the final safety/phase/minimum guard has approved a runnable target.
 * No provisional Auto start or rated charger power is reserved here.
 */
function buildAutoPvPriorityReservation(input) {
/**
 * Code-Teil: positiveW
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const positiveW = (v) => Math.max(0, Number.isFinite(Number(v)) ? Number(v) : 0);
    let priorityRemainingW = Math.max(0, positiveW(input.priorityCapW) - positiveW(input.otherPriorityReservedW));
    let physicalRemainingW = Math.max(0, positiveW(input.physicalCapW) - positiveW(input.otherPhysicalReservedW));
    let reservedW = 0;
    const rows = [];
    for (const point of input.points) {
        const mode = String(point.effectiveMode || '').toLowerCase();
        const userMode = String(point.userMode || 'auto').toLowerCase();
        const minimumW = positiveW(point.technicalMinimumW);
        let claimW = 0;
        let reason = 'not-auto-grid-mode';
        if (userMode === 'auto' && (mode === 'auto' || mode === 'normal')) {
            reason = 'no-runnable-demand';
            if (point.enabled && point.online) {
                // Real, fresh power continues to occupy PV during a controlled stop.
                // A switch request cannot make an actually flowing load disappear.
                const actualW = point.actualFresh ? positiveW(point.actualW) : 0;
                const targetW = !point.phaseTransition && (point.demandConfirmed || point.startProbeActive)
                    ? positiveW(point.finalTargetW) : 0;
                const runnableTargetW = targetW > 0 && targetW + 1e-6 >= minimumW ? targetW : 0;
                const demandW = Math.max(actualW, runnableTargetW);
                claimW = Math.min(demandW, priorityRemainingW, physicalRemainingW);
                if (claimW > 0)
                    reason = 'auto-pv-share-of-approved-load';
                else if (point.phaseTransition)
                    reason = 'phase-transition-no-start-reservation';
                else if (targetW > 0 && runnableTargetW === 0)
                    reason = 'below-technical-minimum';
                else if (demandW > 0)
                    reason = 'no-pv-priority-remainder';
            }
            else
                reason = 'not-available';
        }
        // Round down so neither the physical nor the customer cap can be exceeded.
        claimW = Math.floor(Math.max(0, claimW));
        priorityRemainingW = Math.max(0, priorityRemainingW - claimW);
        physicalRemainingW = Math.max(0, physicalRemainingW - claimW);
        reservedW += claimW;
        rows.push({ safe: point.safe, reservedW: claimW, minimumW, reason });
    }
    return { reservedW, remainingPriorityW: priorityRemainingW, rows };
}
module.exports = { normalizePvSurplusPriority, buildPvSurplusAllocation, buildAutoPvPriorityReservation };
