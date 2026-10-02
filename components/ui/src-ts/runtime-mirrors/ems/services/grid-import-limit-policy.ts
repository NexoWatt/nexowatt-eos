// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: ems/services/grid-import-limit-policy.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * ems/services/grid-import-limit-policy.js
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
 * Original-Hash: af29e3732bad3e4613f3e55447705098b5fe9b7b6491def8cbcc1c3dc02a9b11
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
 * Quelle: src-ts/runtime-executables/ems/services/grid-import-limit-policy.ts
 * Quell-Hash: sha256:7e452f1b365cd3bc2405f27db55869bf955504d6be8d15246d395b96db5463db
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/grid-import-limit-policy.js.
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
 * Aufgabe: Löst das konfigurierte Netzbezugslimit und dessen feste Soft-Reserve in einheitliche Grenzwerte auf.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/grid-import-limit-policy.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
/**
 * Code-Teil: finiteOrNull
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function finiteOrNull(value) {
    if (value === null || value === undefined || value === '' || typeof value === 'boolean')
        return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}
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
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
/**
 * Code-Teil: resolveAutoReserveW
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function resolveAutoReserveW(hardLimitW, _configuredReserveW) {
    // RC80: Die Soft-Reserve ist verbindlich immer exakt 10 % der wirksamen
    // NVP-/Hard-Limit-Vorgabe. Frühere Mindest-/Maximalgrenzen sowie manuelle
    // Reservewerte werden aus Kompatibilitätsgründen noch angenommen, aber
    // bewusst ignoriert.
    const hard = Math.max(0, Math.round(finiteOrNull(hardLimitW) ?? 0));
    if (!(hard > 0))
        return 0;
    return Math.min(hard, Math.max(0, Math.round(hard * 0.1)));
}
/**
 * Code-Teil: resolveGridImportLimitPolicy
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function resolveGridImportLimitPolicy(input = {}) {
    const nowMs = Math.max(0, Math.round(finiteOrNull(input.nowMs) ?? Date.now()));
    const hardLimitW = Math.max(0, Math.round(finiteOrNull(input.hardLimitW) ?? 0));
    // RC80: Sobald ein Hard-Limit vorhanden ist, ist das Soft-Limit immer aktiv.
    // softLimitEnabled, softLimitW und reserveW bleiben nur als tolerierte
    // Legacy-Eingaben im Vertrag, beeinflussen die Regelung aber nicht mehr.
    const enabled = hardLimitW > 0;
    const reserveW = resolveAutoReserveW(hardLimitW);
    const hysteresisW = Math.max(0, finiteOrNull(input.hysteresisW) ?? 500);
    const releaseDelayMs = Math.max(0, (finiteOrNull(input.releaseDelaySec) ?? 10) * 1000);
    const nvpUsable = input.nvpUsable === true;
    const signedNvpW = nvpUsable ? finiteOrNull(input.signedNvpW) : null;
    let softLimitW = hardLimitW;
    let softLimitMode = 'disabled';
    if (hardLimitW > 0) {
        softLimitW = Math.max(0, hardLimitW - reserveW);
        softLimitMode = 'fixed-10-percent';
    }
    const planningLimitW = softLimitW;
    const rawPreviousStage = String(input.previousStage || '');
    const previousStage = rawPreviousStage === 'soft' || rawPreviousStage === 'hard'
        ? rawPreviousStage
        : 'normal';
    let releaseCandidateAtMs = Math.max(0, finiteOrNull(input.releaseCandidateAtMs) ?? 0);
    let stage = 'normal';
    let reason = 'below-soft-limit';
    let releasePending = false;
    if (!(hardLimitW > 0)) {
        stage = 'unconfigured';
        reason = 'hard-limit-missing';
        releaseCandidateAtMs = 0;
    }
    else if (!nvpUsable || signedNvpW === null) {
        stage = 'stale';
        reason = 'nvp-not-usable';
        releaseCandidateAtMs = 0;
    }
    else if (signedNvpW >= hardLimitW) {
        stage = 'hard';
        reason = 'hard-limit-reached';
        releaseCandidateAtMs = 0;
    }
    else if (enabled && planningLimitW > 0 && signedNvpW >= planningLimitW) {
        stage = 'soft';
        reason = 'soft-limit-reached';
        releaseCandidateAtMs = 0;
    }
    else if (enabled && previousStage !== 'normal') {
        const releaseThresholdW = Math.max(0, planningLimitW - hysteresisW);
        if (signedNvpW <= releaseThresholdW) {
            if (!(releaseCandidateAtMs > 0))
                releaseCandidateAtMs = nowMs;
            if (nowMs - releaseCandidateAtMs >= releaseDelayMs) {
                stage = 'normal';
                reason = 'soft-limit-released';
                releaseCandidateAtMs = 0;
            }
            else {
                stage = 'soft';
                reason = 'soft-release-delay';
                releasePending = true;
            }
        }
        else {
            stage = 'soft';
            reason = 'soft-hysteresis-hold';
            releaseCandidateAtMs = 0;
        }
    }
    else {
        releaseCandidateAtMs = 0;
    }
    const hardHeadroomW = signedNvpW === null || !(hardLimitW > 0)
        ? null
        : hardLimitW - signedNvpW;
    const softHeadroomW = signedNvpW === null || !(planningLimitW > 0)
        ? null
        : planningLimitW - signedNvpW;
    const softExcessW = signedNvpW === null || !(planningLimitW > 0)
        ? 0
        : Math.max(0, signedNvpW - planningLimitW);
    const hardExcessW = signedNvpW === null || !(hardLimitW > 0)
        ? 0
        : Math.max(0, signedNvpW - hardLimitW);
    return {
        enabled,
        hardLimitW: Math.round(hardLimitW),
        softLimitW: Math.round(softLimitW),
        planningLimitW: Math.round(planningLimitW),
        reserveW: Math.round(Math.max(0, hardLimitW - softLimitW)),
        configuredReserveW: Math.round(reserveW),
        softLimitMode,
        hysteresisW: Math.round(hysteresisW),
        releaseDelayMs: Math.round(releaseDelayMs),
        signedNvpW: signedNvpW === null ? null : Math.round(signedNvpW),
        hardHeadroomW: hardHeadroomW === null ? null : Math.round(hardHeadroomW),
        softHeadroomW: softHeadroomW === null ? null : Math.round(softHeadroomW),
        hardExcessW: Math.round(hardExcessW),
        softExcessW: Math.round(softExcessW),
        requiredReductionW: Math.round(stage === 'hard' ? Math.max(softExcessW, hardExcessW) : (stage === 'soft' ? softExcessW : 0)),
        stage,
        reason,
        releasePending,
        releaseCandidateAtMs: Math.round(releaseCandidateAtMs),
        nowMs,
    };
}
/**
 * Feed-forward PV-Ziel fuer 0-Einspeisung.
 *
 * Aus NVP = lokale Aufnahme - PV folgt:
 *   PV_Ziel = PV_Ist + NVP_prognose - NVP_Ziel
 *
 * `projectedNvpW` enthaelt bereits akzeptierte Speicher- und Flex-Aenderungen.
 */
function resolveZeroExportPvTarget(input = {}) {
    const ratedPvW = Math.max(0, finiteOrNull(input.ratedPvW) ?? 0);
    const pvActualW = finiteOrNull(input.pvActualW);
    const projectedNvpW = finiteOrNull(input.projectedNvpW);
    const targetNvpW = finiteOrNull(input.targetNvpW) ?? 0;
    const storageActualW = finiteOrNull(input.storageActualW) ?? 0;
    const storageTargetW = finiteOrNull(input.storageTargetW) ?? 0;
    const dischargeDeadbandW = Math.max(0, finiteOrNull(input.storageDischargeDeadbandW) ?? 100);
    const storageDischarging = storageActualW > dischargeDeadbandW || storageTargetW > dischargeDeadbandW;
    const currentLimitW = Math.max(0, finiteOrNull(input.currentLimitW) ?? ratedPvW);
    const pvUsable = pvActualW !== null && pvActualW >= 0 && projectedNvpW !== null;
    const curtailed = ratedPvW > 0 && currentLimitW < ratedPvW - 1;
    if (storageDischarging && curtailed && ratedPvW > 0) {
        return {
            usable: pvUsable,
            targetW: Math.round(ratedPvW),
            localAbsorptionW: pvUsable ? Math.round(Math.max(0, pvActualW + projectedNvpW)) : null,
            feedbackCorrectionW: pvUsable ? Math.round(projectedNvpW - targetNvpW) : null,
            storageDischarging: true,
            storageDischargeConflict: true,
            reason: 'release-for-storage-discharge',
        };
    }
    if (!pvUsable || pvActualW === null || projectedNvpW === null) {
        return {
            usable: false,
            targetW: null,
            localAbsorptionW: null,
            feedbackCorrectionW: null,
            storageDischarging,
            storageDischargeConflict: false,
            reason: 'pv-actual-not-usable',
        };
    }
    const localAbsorptionW = Math.max(0, pvActualW + projectedNvpW);
    const targetW = ratedPvW > 0
        ? clamp(pvActualW + projectedNvpW - targetNvpW, 0, ratedPvW)
        : Math.max(0, pvActualW + projectedNvpW - targetNvpW);
    return {
        usable: true,
        targetW: Math.round(targetW),
        localAbsorptionW: Math.round(localAbsorptionW),
        feedbackCorrectionW: Math.round(projectedNvpW - targetNvpW),
        storageDischarging,
        storageDischargeConflict: false,
        reason: 'consumption-storage-feedforward',
    };
}
module.exports = {
    resolveAutoReserveW,
    resolveGridImportLimitPolicy,
    resolveZeroExportPvTarget,
};
