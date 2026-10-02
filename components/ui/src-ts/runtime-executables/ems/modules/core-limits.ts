// @ts-nocheck
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Stellt das zentrale Leistungsbudget und gemeinsame Netzgrenzen bereit, damit Verbraucher dieselbe Messbasis und Reservierungen verwenden.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/modules/core-limits.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: ems/modules/core-limits.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `ems/modules/core-limits.js`.
 *
 * Build-Regel:
 * `npm run sync:ts-runtime-executables` erzeugt daraus die auslieferbare
 * JavaScript-Datei. Änderungen an der Runtime sollen hier vorgenommen werden;
 * die JS-Datei ist nur noch Build-Artefakt für Node.js/ioBroker bzw. den Browser.
 *
 * Sicherheit:
 * Der Inhalt basiert auf der bisher produktiven JavaScript-Runtime und bleibt
 * vorübergehend mit `@ts-nocheck` ausführbar. Fachliche TS-Helfer wie EVCS,
 * Energiefluss, Core-Limits und Heizstab bleiben die bereits typisierten Quellen.
 */

/**
 * NexoWatt Detail-Kommentar (DE)
 * Zweck dieser Ergänzung:
 * - Jede relevante Funktion, Methode, Route und UI-Ereignisbindung erhält einen eigenen Erklärungskommentar.
 * - Die Kommentare beschreiben Aufgabe, Daten-/API-Zusammenhang und TypeScript-Migrationshinweise.
 * - Es wurde keine Programmlogik geändert; diese Datei wurde nur für Wartbarkeit und spätere Typisierung dokumentiert.
 */

/**
 * Datei: ems/modules/core-limits.js
 * Rolle im Projekt: Zentrale Messbasis / Budgets.
 * Zweck: Berechnet EMS-Grundwerte, PV-Budget, Netzbudget und Speicher-/Lastflüsse.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Zentrale EMS-Budget- und Limitberechnung für PV, Netzanschluss, Speicher, §14a, Peak-Shaving und Verbraucherbudgets.
 * Zusammenhänge:
 * - Erzeugt Basiswerte, die Heizstab, EVCS, KI-Berater und LIVE-Dashboard verwenden.
 * - Muss dieselbe Speicher-/Netz-DP-Auflösung wie main.js/www/app.js berücksichtigen.
 * Wartungshinweise:
 * - Sehr kritisch für History und Regelungslogik; Änderungen immer mit Split-DP, Signed-DP und Fallback testen.
 */

'use strict';


/**
 * Datenvertrag: CoreLimitSnapshot
 * Zweck: Fachlicher Vertrag der zentralen EMS-Messbasis.
 * Zusammenhang: Heizstab, EVCS, Peak-Shaving, KI-Berater und Dashboard verlassen sich auf diese Werte.
 * TypeScript-Ziel: CoreLimitSnapshot mit Wattwerten, Prozentwerten und Source-Informationen anlegen.
 */

/**
 * Vertragsstelle: Speicherauflösung
 * Zweck: core-limits.js muss Split-DPs, signed Speicher-DP und Fallback exakt so behandeln wie Frontend und main.js.
 * Wichtig: 0 W ist gültig; ein gemappter Speicher-DP darf nicht durch Bilanzrechnung überschrieben werden.
 */


const { BaseModule } = require('./base');
const { readZeroExportMode, measuredFlexibleLoadW, collectZeroExportSample, updateZeroExportProbe, unconfirmedZeroExportW } = require('../services/zero-export-pv-coordinator');
const { normalizePvSurplusPriority, buildPvSurplusAllocation } = require('../services/pv-surplus-allocation');
const { resolveCurrentNvpSnapshot } = require('../services/measurement-freshness');
const { resolveStorageOperatingPolicy } = require('../services/storage-self-consumption-policy');
const { liveSafetyEnvelope, invalidateSafetyEnvelope } = require('../services/safety-envelope');
let resolvePara14aAppCap = () => null;
try {
    ({ resolvePara14aAppCap } = require('../../lib/ts-mirrors/ems/para14a/para14a-constraint'));
} catch (_ePara14aMirror) {
    // Older runtime/package fallback: no app-specific §14a cap.
}


/**
 * Code-Teil: requireCoreBudgetTsMirror
 *
 * Zweck:
 * Lädt den aus TypeScript erzeugten CommonJS-Spiegel für Core-Limits/Budget.
 *
 * Zusammenhang:
 * In 0.7.77 wird der Spiegel nur im Shadow-Modus genutzt. Die produktive
 * `core-limits.js`-Logik bleibt führend. Der Mirror darf hier keine States
 * überschreiben und keine Verbraucher schalten.
 *
 * Wartung:
 * Wenn der Pfad oder die Exportnamen geändert werden, müssen `test:ems-shadow`
 * und die Mirror-Checks mit angepasst werden.
 */
function requireCoreBudgetTsMirror() {
    try {
        return require('../../lib/ts-mirrors/ems/core-limits/core-budget');
    } catch (_e) {
        return null;
    }
}

/**
 * Code-Teil: requireCoreRuntimeTsMirror
 * Zweck: Lädt die typisierte, seiteneffektfreie Core-Runtime für PV-, Grant-
 * und Budget-Snapshot-Berechnungen. Die große Adapter-/ioBroker-Datei bleibt
 * zunächst I/O-Hülle und harter Fallback.
 */
function requireCoreRuntimeTsMirror() {
    try {
        return require('../../lib/ts-mirrors/ems/core-limits/core-runtime');
    } catch (_e) {
        return null;
    }
}

/**
 * Code-Teil: compareShadowWatt
 *
 * Zweck:
 * Vergleicht einen JavaScript-Runtime-Wert mit einem TypeScript-Shadow-Wert.
 * Kleine Rundungsabweichungen werden toleriert, damit Diagnose nicht rauscht.
 *
 * Zusammenhang:
 * Core-Limits-/Heizstab-Shadow-Vergleiche nutzen diese Struktur, damit spätere
 * Auswertung im App-Center nicht jedes Feld anders interpretieren muss.
 */
function compareShadowWatt(field, jsValue, tsValue, toleranceW = 5) {
    const js = Number(jsValue);
    const ts = Number(tsValue);
    if (!Number.isFinite(js) && !Number.isFinite(ts)) return null;
    const ok = Number.isFinite(js) && Number.isFinite(ts) && Math.abs(js - ts) <= toleranceW;
    return ok ? null : { field, js: Number.isFinite(js) ? Math.round(js) : null, ts: Number.isFinite(ts) ? Math.round(ts) : null };
}
/**
 * Code-Teil: num
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function num(v, fallback = null) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}
/**
 * Code-Teil: clamp
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function clamp(v, minV, maxV, fallback = null) {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    let x = n;
    if (Number.isFinite(minV)) x = Math.max(minV, x);
    if (Number.isFinite(maxV)) x = Math.min(maxV, x);
    return x;
}
/**
 * Code-Teil: roundW
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function roundW(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n) : fallback;
}
/**
 * Code-Teil: isFiniteNumber
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function isFiniteNumber(v) {
    return typeof v === 'number' && Number.isFinite(v);
}

/**
 * Code-Teil: computePvBudgetFlowRawW
 * Zweck: Rekonstruiert das physikalische PV-Budget fuer flexible Verbraucher
 * und Speicher aus dem signierten NVP-Wert. Netzbezug muss dabei abgezogen
 * werden; nur den Exportanteil zu addieren wuerde bei gleichzeitigem Netzbezug
 * ein zu grosses PV-Budget erzeugen und die Speicher-/EVCS-Prioritaet aushebeln.
 *
 * Vorzeichen:
 * - gridW > 0: Netzbezug
 * - gridW < 0: Einspeisung
 * - storageChargeW > 0: Speicher nimmt Leistung auf
 * - storageDischargeW > 0: Speicher gibt Leistung ab
 */
function legacyComputePvBudgetFlowRawW({ gridW = 0, flexUsedW = 0, storageChargeW = 0, storageDischargeW = 0 } = {}) {
    const signedGridW = Number.isFinite(Number(gridW)) ? Number(gridW) : 0;
    const flexW = Math.max(0, Number(flexUsedW) || 0);
    const chargeW = Math.max(0, Number(storageChargeW) || 0);
    const dischargeW = Math.max(0, Number(storageDischargeW) || 0);
    return Math.max(0, (-signedGridW) + flexW + chargeW - dischargeW);
}

/**
 * Code-Teil: computeCentralBudgetGrant
 * Zweck: Berechnet einen unverbindlichen Grant aus dem aktuellen zentralen
 * Gesamt-/PV-Restbudget. Alle flexiblen Verbraucher verwenden damit dieselbe
 * Quelle, bevor sie ihren finalen Sollwert bilden und anschließend reservieren.
 *
 * Wichtig:
 * - Die Funktion verändert das Budget nicht.
 * - `pvOnly=true` begrenzt zugleich auf Gesamt- und PV-Restbudget.
 * - Ein unendliches Gesamtbudget bleibt zulässig; das PV-Budget bleibt immer
 *   eine endliche physikalische Größe.
 */
function legacyComputeCentralBudgetGrant(runtime = {}, request = {}) {
    const requestedRawW = Number(request && request.requestedW);
    const requestedW = Number.isFinite(requestedRawW)
        ? Math.max(0, requestedRawW)
        : Number.MAX_SAFE_INTEGER;
    const pvOnly = request && request.pvOnly === true;
    // Pure PV charging uses the customer allocation cap; Min+PV may request the physical PV remainder for extra power.
    const applyEvcsAllocationCap = !(request && request.applyEvcsAllocationCap === false);
    const key = String((request && (request.key || request.consumer || request.app)) || '').trim().toLowerCase();
    const remainingTotalRaw = Number(runtime && runtime.remainingTotalW);
    const remainingTotalW = Number.isFinite(remainingTotalRaw)
        ? Math.max(0, remainingTotalRaw)
        : Number.POSITIVE_INFINITY;
    const remainingPvW = Math.max(0, Number(runtime && runtime.remainingPvW) || 0);
    const requestCapRaw = Number(request && request.maxW);
    let requestCapW = Number.isFinite(requestCapRaw)
        ? Math.max(0, requestCapRaw)
        : Number.POSITIVE_INFINITY;

    // Der EVCS-Anteil wird nur hier im zentralen Budget begrenzt. Nach der
    // EVCS-Reservierung sehen Speicher, Thermik und Heizstab automatisch nur
    // noch den Rest. Damit darf kein Herstellerpfad die Kundenvorgabe (z. B.
    // 80 % E-Mobilitaet / 20 % Speicher) spaeter wieder aushebeln.
    const allocation = runtime
        && runtime.gates
        && runtime.gates.pvAllocation
        && typeof runtime.gates.pvAllocation === 'object'
        ? runtime.gates.pvAllocation
        : null;
    if (pvOnly && key === 'evcs' && applyEvcsAllocationCap && allocation && Number.isFinite(Number(allocation.evcsCapW))) {
        requestCapW = Math.min(requestCapW, Math.max(0, Number(allocation.evcsCapW)));
    }

    const para14aGate = runtime && runtime.gates && runtime.gates.para14a && typeof runtime.gates.para14a === 'object'
        ? runtime.gates.para14a
        : null;
    const para14aCapW = para14aGate && para14aGate.active === true
        ? resolvePara14aAppCap(para14aGate.appCapsW, key, request && request.app)
        : null;
    const para14aLocalPvGrantW = para14aGate && para14aGate.active === true && Number.isFinite(Number(para14aGate.localPvGrantW))
        ? Math.max(0, Number(para14aGate.localPvGrantW))
        : 0;
    if (para14aCapW !== null && para14aCapW !== undefined && Number.isFinite(Number(para14aCapW))) {
        // §14a begrenzt den netzwirksamen App-Anteil. Das zentrale lokale
        // PV-Budget darf auch bei Auto/Boost/Min+PV zusätzlich genutzt werden.
        requestCapW = Math.min(requestCapW, Math.max(0, Number(para14aCapW)) + para14aLocalPvGrantW);
    }

    const availableW = pvOnly
        ? Math.min(remainingTotalW, remainingPvW, requestCapW)
        : Math.min(remainingTotalW, requestCapW);
    const grantW = Math.max(0, Math.min(requestedW, availableW));

    return {
        requestedW: Number.isFinite(requestedRawW) ? roundW(requestedW) : null,
        grantW: roundW(grantW),
        availableW: Number.isFinite(availableW) ? roundW(availableW) : null,
        remainingTotalW: Number.isFinite(remainingTotalW) ? roundW(remainingTotalW) : null,
        remainingPvW: roundW(remainingPvW),
        allocationMode: allocation ? String(allocation.mode || '') : '',
        allocationEvcsCapW: allocation && Number.isFinite(Number(allocation.evcsCapW))
            ? roundW(Math.max(0, Number(allocation.evcsCapW)))
            : null,
        allocationCapApplied: !!(pvOnly && key === 'evcs' && applyEvcsAllocationCap),
        para14aCapW: para14aCapW !== null && para14aCapW !== undefined && Number.isFinite(Number(para14aCapW)) ? roundW(Math.max(0, Number(para14aCapW))) : null,
        para14aLocalPvGrantW: roundW(para14aLocalPvGrantW),
        para14aCapApplied: para14aCapW !== null && para14aCapW !== undefined && Number.isFinite(Number(para14aCapW)),
        pvOnly,
        key,
        source: 'central-ems-budget',
    };
}


/**
 * Code-Teil: resolvePvBudgetPhysicalCapW
 * Zweck: Ermittelt die physikalisch belegte Obergrenze des zentralen PV-Budgets.
 *
 * Hintergrund:
 * Ein einzelner veralteter oder herstellerspezifisch kurzzeitig 0 W meldender
 * PV-Datenpunkt darf eine gleichzeitig klar gemessene NVP-Einspeisung nicht auf
 * 0 W Budget klemmen. Umgekehrt dürfen Ladepunkt- oder Speicher-Sollwerte bei
 * Nacht kein künstliches PV-Budget erzeugen.
 *
 * Regeln:
 * - Frische direkte PV-Leistung bleibt die bevorzugte Quelle.
 * - Reale NVP-Einspeisung ist ein unabhängiger physikalischer Beleg. In diesem
 *   Fall darf die aus NVP + laufenden flexiblen Lasten rekonstruierte Leistung
 *   die direkte PV-Messung überstimmen.
 * - Bei 0-Einspeisung darf ein kurz zuvor vertrauenswürdiger Wert nur solange
 *   gehalten werden, wie weiterhin eine reale PV-Senke (Speicher/EVCS/etc.)
 *   aktiv ist und kein deutlicher Netzbezug besteht.
 * - Ohne irgendeinen physikalischen Beleg bleibt die Obergrenze 0 W.
 */
function legacyResolvePvBudgetPhysicalCapW({
    measuredPvW = 0,
    measuredPvFresh = false,
    flowRawW = 0,
    gridExportW = 0,
    gridImportW = 0,
    activePvSinkW = 0,
    lastTrustedW = 0,
    lastTrustedAgeMs = null,
    holdMs = 30000,
    exportEvidenceThresholdW = 250,
    importToleranceW = 250,
} = {}) {
    const measuredW = Math.max(0, Number(measuredPvW) || 0);
    const flowW = Math.max(0, Number(flowRawW) || 0);
    const exportW = Math.max(0, Number(gridExportW) || 0);
    const importW = Math.max(0, Number(gridImportW) || 0);
    const sinkW = Math.max(0, Number(activePvSinkW) || 0);
    const lastW = Math.max(0, Number(lastTrustedW) || 0);
    const ageMs = Number(lastTrustedAgeMs);
    const trustedAgeOk = Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= Math.max(0, Number(holdMs) || 0);

    // Eine frische positive PV-Messung darf durch die NVP-Bilanz nach oben
    // plausibilisiert werden, weil bereits laufende Speicher-/EVCS-Lasten den
    // sichtbaren Export reduzieren. Bei einer frischen 0-W-PV-Messung darf ein
    // alter/fremder flexibler Verbraucher dagegen kein künstliches PV-Budget
    // erzeugen; dafür ist ausschließlich der begrenzte Trusted-Hold vorgesehen.
    if (measuredPvFresh && measuredW > 0) {
        return {
            capW: exportW >= Math.max(0, Number(exportEvidenceThresholdW) || 0) && flowW > 0
                ? Math.max(measuredW, flowW)
                : measuredW,
            source: exportW >= Math.max(0, Number(exportEvidenceThresholdW) || 0) && flowW > measuredW
                ? 'direct-pv+nvp-flow-confirmed'
                : 'direct-pv-fresh',
            trusted: true,
            held: false,
        };
    }

    // Fehlt jede frische direkte PV-Messung, ist ein realer NVP-Export ein
    // unabhängiger physikalischer Beleg. Das ist ein Kompatibilitätsfallback
    // für Anlagen ohne vollständiges PV-Mapping, kein Parallelbudget.
    if (!measuredPvFresh && exportW >= Math.max(0, Number(exportEvidenceThresholdW) || 0) && flowW > 0) {
        return {
            capW: flowW,
            source: 'nvp-export-flow-fallback',
            trusted: true,
            held: false,
        };
    }

    if (trustedAgeOk && lastW > 0 && flowW > 0 && sinkW > 0 && importW <= Math.max(0, Number(importToleranceW) || 0)) {
        return {
            capW: Math.min(lastW, flowW),
            source: 'trusted-pv-hold-with-active-sink',
            trusted: true,
            held: true,
        };
    }

    // Ein klarer realer Export am NVP ist auch dann mindestens als Exportbetrag
    // nutzbar, wenn ein direkt gemappter PV-DP frisch aber offensichtlich falsch
    // 0 W meldet. Wir verwenden in diesem Konflikt bewusst nur den gemessenen
    // Export und NICHT `flowW`: So kann eine alte flexible Last kein kuenstliches
    // Zusatzbudget erzeugen, waehrend eine reale Einspeisung dennoch nicht die
    // gesamte EVCS-/Speicherfreigabe auf 0 klemmt.
    if (measuredPvFresh && measuredW <= 0 && exportW >= Math.max(0, Number(exportEvidenceThresholdW) || 0)) {
        return {
            capW: exportW,
            source: 'nvp-export-minimum-despite-zero-pv',
            trusted: true,
            held: false,
        };
    }

    return {
        capW: 0,
        source: 'no-physical-pv-evidence',
        trusted: false,
        held: false,
    };
}

/**
 * Code-Teil: computePvBudgetFlowRawW
 * Zweck: Nutzt die typisierte Core-Runtime produktiv. Die bisherige Rechnung
 * bleibt als harter Fallback aktiv, falls Spiegel oder Ergebnis ungültig sind.
 */
function computePvBudgetFlowRawW(input = {}) {
    const legacy = legacyComputePvBudgetFlowRawW(input);
    try {
        const mirror = requireCoreRuntimeTsMirror();
        const compute = mirror && typeof mirror.computeCorePvBudgetFlowRawW === 'function'
            ? mirror.computeCorePvBudgetFlowRawW
            : null;
        if (!compute) return legacy;
        const typed = Number(compute(input));
        if (!Number.isFinite(typed) || typed < 0 || Math.abs(typed - legacy) > 1) return legacy;
        return typed;
    } catch (_e) {
        return legacy;
    }
}

/**
 * Code-Teil: computeCentralBudgetGrant
 * Zweck: Produktive typisierte Grant-Berechnung mit exakter JS-Fallback-Parität.
 * Verbraucher dürfen bei einer TS-Abweichung nie mehr Leistung erhalten als der
 * bewährte Legacy-Pfad erlaubt.
 */
function computeCentralBudgetGrant(runtime = {}, request = {}) {
    const legacy = legacyComputeCentralBudgetGrant(runtime, request);
    try {
        const mirror = requireCoreRuntimeTsMirror();
        const compute = mirror && typeof mirror.computeCoreCentralBudgetGrant === 'function'
            ? mirror.computeCoreCentralBudgetGrant
            : null;
        if (!compute) return legacy;
        const typed = compute(runtime, request);
        if (!typed || typeof typed !== 'object') return legacy;
        const fields = ['grantW', 'availableW', 'remainingTotalW', 'remainingPvW', 'allocationEvcsCapW', 'para14aCapW'];
        for (const field of fields) {
            const a = legacy[field];
            const b = typed[field];
            const aNull = a === null || a === undefined;
            const bNull = b === null || b === undefined;
            if (aNull !== bNull) return legacy;
            if (!aNull && (!Number.isFinite(Number(b)) || Math.abs(Number(a) - Number(b)) > 1)) return legacy;
        }
        if (!!legacy.pvOnly !== !!typed.pvOnly || String(legacy.key || '') !== String(typed.key || '')) return legacy;
        return {
            ...typed,
            source: 'ts-core-runtime-grant',
        };
    } catch (_e) {
        return legacy;
    }
}

/**
 * Code-Teil: resolvePvBudgetPhysicalCapW
 * Zweck: Produktive typisierte PV-Plausibilisierung mit Legacy-Fallback. Damit
 * bleiben Export-Fallback, Trusted-Hold und Null-PV-Schutz exakt kompatibel.
 */
function resolvePvBudgetPhysicalCapW(input = {}) {
    const legacy = legacyResolvePvBudgetPhysicalCapW(input);
    try {
        const mirror = requireCoreRuntimeTsMirror();
        const compute = mirror && typeof mirror.resolveCorePvBudgetPhysicalCap === 'function'
            ? mirror.resolveCorePvBudgetPhysicalCap
            : null;
        if (!compute) return legacy;
        const typed = compute(input);
        if (!typed || typeof typed !== 'object') return legacy;
        if (!Number.isFinite(Number(typed.capW)) || Number(typed.capW) < 0) return legacy;
        if (Math.abs(Number(typed.capW) - Number(legacy.capW)) > 1) return legacy;
        if (String(typed.source || '') !== String(legacy.source || '')) return legacy;
        if (!!typed.trusted !== !!legacy.trusted || !!typed.held !== !!legacy.held) return legacy;
        return typed;
    } catch (_e) {
        return legacy;
    }
}

/**
 * Code-Teil: isPeakShavingRuntimeEnabled
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function isPeakShavingRuntimeEnabled(config) {
    const cfg = (config && typeof config === 'object') ? config : {};
    if (cfg.enablePeakShaving === true) return true;
    const ps = (cfg.peakShaving && typeof cfg.peakShaving === 'object') ? cfg.peakShaving : {};
    const atypical = (ps.atypical && typeof ps.atypical === 'object') ? ps.atypical : {};
    return atypical.enabled === true;
}
/**
 * Code-Teil: readStateNumber
 * Zweck: Liest Werte mit Fallbacks aus Cache/State/Config.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function readStateNumber(adapter, id, fallback = null) {
    try {
        const st = await adapter.getStateAsync(id);
        const n = st ? Number(st.val) : NaN;
        return Number.isFinite(n) ? n : fallback;
    } catch {
        return fallback;
    }
}
/**
 * Code-Teil: readStateBool
 * Zweck: Liest Werte mit Fallbacks aus Cache/State/Config.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function readStateBool(adapter, id, fallback = null) {
    try {
        const st = await adapter.getStateAsync(id);
        if (!st) return fallback;
        if (st.val === null || st.val === undefined) return fallback;
        if (typeof st.val === 'boolean') return st.val;
        if (typeof st.val === 'number') return st.val !== 0;
        if (typeof st.val === 'string') {
            const s = st.val.trim().toLowerCase();
            if (s === 'true' || s === '1' || s === 'on' || s === 'yes' || s === 'active' || s === 'ja') return true;
            if (s === 'false' || s === '0' || s === 'off' || s === 'no' || s === 'inactive' || s === 'nein') return false;
        }
        return !!st.val;
    } catch {
        return fallback;
    }
}
/**
 * Code-Teil: readStateString
 * Zweck: Liest Werte mit Fallbacks aus Cache/State/Config.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function readStateString(adapter, id, fallback = '') {
    try {
        const st = await adapter.getStateAsync(id);
        if (!st) return fallback;
        const s = String(st.val ?? '').trim();
        return s;
    } catch {
        return fallback;
    }
}
/**
 * Code-Teil: makeBudgetRuntime
 * Zweck: Verarbeitet Energiefluss-/Budgetwerte und beeinflusst Live-Anzeige sowie History.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function makeBudgetRuntime(adapter, snapshot) {
    const ts = Number(snapshot && snapshot.ts) || Date.now();
    const totalEffRaw = snapshot && snapshot.gates && snapshot.gates.total ? snapshot.gates.total.effectiveW : Number.POSITIVE_INFINITY;
    const totalEff = (totalEffRaw === null || totalEffRaw === undefined) ? Number.POSITIVE_INFINITY : Number(totalEffRaw);
    const pvEff = snapshot && snapshot.gates && snapshot.gates.pv ? snapshot.gates.pv.effectiveW : 0;

    let typedInitialState = null;
    let typedInitialError = '';
    try {
        const mirror = requireCoreRuntimeTsMirror();
        const createState = mirror && typeof mirror.createCoreRuntimeReservationState === 'function'
            ? mirror.createCoreRuntimeReservationState
            : null;
        if (createState) typedInitialState = createState(snapshot || {});
    } catch (e) {
        typedInitialError = e && e.message ? e.message : String(e);
    }
    const legacyInitialTotalW = Number.isFinite(totalEff) ? Math.max(0, totalEff) : Number.POSITIVE_INFINITY;
    const legacyInitialPvW = Math.max(0, Number(pvEff) || 0);
    const typedInitialTotalRaw = typedInitialState ? typedInitialState.remainingTotalW : undefined;
    const typedInitialTotalW = typedInitialTotalRaw === null
        ? Number.POSITIVE_INFINITY
        : Number(typedInitialTotalRaw);
    const typedInitialPvW = typedInitialState ? Number(typedInitialState.remainingPvW) : NaN;
    const typedInitialOk = !!(
        typedInitialState
        && !typedInitialError
        && ((Number.isFinite(legacyInitialTotalW) && Number.isFinite(typedInitialTotalW) && Math.abs(legacyInitialTotalW - typedInitialTotalW) <= 1)
            || (!Number.isFinite(legacyInitialTotalW) && !Number.isFinite(typedInitialTotalW)))
        && Number.isFinite(typedInitialPvW)
        && Math.abs(legacyInitialPvW - typedInitialPvW) <= 1
    );

    let typedPhase3Runtime = null;
    let typedPhase3Error = '';
    if (typedInitialOk) {
        try {
            const mirror = requireCoreRuntimeTsMirror();
            const createPhase3 = mirror && typeof mirror.createCoreRuntimePhase3State === 'function'
                ? mirror.createCoreRuntimePhase3State
                : null;
            if (createPhase3) {
                const candidate = createPhase3(snapshot || {});
                const state = candidate && candidate.reservationState;
                const totalRaw = state ? state.remainingTotalW : undefined;
                const totalW = totalRaw === null ? Number.POSITIVE_INFINITY : Number(totalRaw);
                const pvW = state ? Number(state.remainingPvW) : NaN;
                const parity = candidate && candidate.ok === true
                    && ((Number.isFinite(legacyInitialTotalW) && Number.isFinite(totalW) && Math.abs(legacyInitialTotalW - totalW) <= 1)
                        || (!Number.isFinite(legacyInitialTotalW) && !Number.isFinite(totalW)))
                    && Number.isFinite(pvW)
                    && Math.abs(legacyInitialPvW - pvW) <= 1;
                if (parity) typedPhase3Runtime = candidate;
                else typedPhase3Error = 'phase3-initial-state-mismatch';
            } else typedPhase3Error = 'phase3-runtime-unavailable';
        } catch (e) {
            typedPhase3Error = e && e.message ? e.message : String(e);
        }
    } else typedPhase3Error = typedInitialError || 'phase2-initial-state-unavailable';

    const rt = {
        ts,
        version: 3,
        gates: typedInitialOk && typedInitialState && typedInitialState.gates
            ? typedInitialState.gates
            : (snapshot.gates || {}),
        raw: snapshot.raw || {},
        remainingTotalW: typedInitialOk ? typedInitialTotalW : legacyInitialTotalW,
        remainingPvW: typedInitialOk ? Math.max(0, typedInitialPvW) : legacyInitialPvW,
        consumers: {},
        order: [],
        sequence: 0,
        phase2: {
            active: typedInitialOk,
            fallback: !typedInitialOk,
            source: typedInitialOk ? 'ts-core-runtime-input-v2' : 'legacy-js-runtime',
            reason: typedInitialOk ? 'typed-initial-state-parity-ok' : (typedInitialError || 'typed-initial-state-unavailable-or-mismatch'),
        },
        phase3Runtime: typedPhase3Runtime,
        phase3: {
            active: !!typedPhase3Runtime,
            fallback: !typedPhase3Runtime,
            source: typedPhase3Runtime ? 'ts-core-runtime-phase3' : 'legacy-js-runtime',
            reason: typedPhase3Runtime ? 'single-typed-runtime-state' : (typedPhase3Error || 'phase3-runtime-unavailable'),
            revision: typedPhase3Runtime ? Number(typedPhase3Runtime.revision) || 0 : 0,
        },
        // 0.7.106: Letzter TS-Shadow für Consumer-Reservierungen.
        // Zweck: makeBudgetRuntime.reserve später aus TypeScript übernehmen, ohne die produktive Reservierung sofort zu riskieren.
        tsReservationLast: null,

        /**
         * Code-Teil: grant
         * Zweck: Liefert einem Modul den aktuell zulässigen zentralen Grant, ohne
         * das Budget zu verändern. Erst der tatsächlich gewählte Sollwert wird
         * anschließend über `reserve()` verbucht. Damit arbeiten EVCS, Speicher,
         * Thermik und Heizstab über denselben Budgetstand.
         */
        grant(req) {
            return computeCentralBudgetGrant(this, req);
        },

        /**
         * Code-Teil: getPvGrant
         * Zweck: Explizite API fuer alle PV-gesteuerten Verbraucher. Sie ist
         * absichtlich nur lesend; erst `reserve()` reduziert das gemeinsame
         * Restbudget. So verwenden EVCS, Speicher, Thermik und Heizstab exakt
         * denselben Budget-Snapshot und dieselbe Prioritaetsreihenfolge.
         */
        getPvGrant(req) {
            return computeCentralBudgetGrant(this, { ...(req || {}), pvOnly: true });
        },

        /**
         * Code-Teil: getTotalGrant
         * Zweck: Explizite API fuer Gesamt-/Netzbudget-Pfade, etwa Tarifladung.
         * PV- und Gesamtbudget bleiben dadurch sauber getrennt.
         */
        getTotalGrant(req) {
            return computeCentralBudgetGrant(this, { ...(req || {}), pvOnly: false });
        },

        /**
         * Code-Teil: Methode `reserve`
         * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: reserve
         * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        reserve(req) {
            const r = (req && typeof req === 'object') ? req : {};
            const key = String(r.key || r.consumer || r.app || 'unknown').trim() || 'unknown';
            const app = String(r.app || key).trim() || key;
            const priority = Number.isFinite(Number(r.priority)) ? Number(r.priority) : 999;
            const requestedW = Math.max(0, Number.isFinite(Number(r.requestedW)) ? Number(r.requestedW) : 0);
            const reserveW = Math.max(0, Number.isFinite(Number(r.reserveW)) ? Number(r.reserveW) : requestedW);
            const pvReserveW = Math.max(0, Number.isFinite(Number(r.pvReserveW)) ? Number(r.pvReserveW) : (r.pvOnly ? reserveW : 0));
            const actualW = Math.max(0, Number.isFinite(Number(r.actualW)) ? Number(r.actualW) : reserveW);

            /**
             * Code-Teil: jsReferenceBeforeTsCommit
             *
             * Zweck:
             * Berechnet die alte JavaScript-Reservierung lokal als Referenz, bevor die
             * produktive Runtime auf den TypeScript-Helfer umschaltet.
             *
             * Zusammenhang:
             * 0.7.107 stellt Consumer-Reservierungen produktiv auf TypeScript um. Damit
             * Heizstab, EVCS, Peak-Shaving und Speicherreserve nicht durch eine verdeckte
             * Abweichung beeinflusst werden, wird die alte JS-Rechnung weiterhin parallel
             * als Notfallback berechnet.
             *
             * Wichtig:
             * 0 W ist gültig. Keine Defaultleistung darf hier künstlich entstehen.
             */
            const jsRemainingTotalBefore = Number.isFinite(this.remainingTotalW) ? this.remainingTotalW : Number.POSITIVE_INFINITY;
            const jsRemainingPvBefore = Math.max(0, this.remainingPvW);
            const jsGrant = legacyComputeCentralBudgetGrant(this, {
                ...r,
                requestedW,
            });
            const jsGrantW = Math.max(0, Number(jsGrant.grantW) || 0);
            const jsNextRemainingTotalW = Number.isFinite(jsRemainingTotalBefore) ? Math.max(0, jsRemainingTotalBefore - reserveW) : Number.POSITIVE_INFINITY;
            const jsNextRemainingPvW = Math.max(0, jsRemainingPvBefore - pvReserveW);
            const jsEntry = {
                key,
                app,
                label: String(r.label || key),
                priority,
                requestedW: roundW(requestedW),
                grantW: roundW(jsGrantW),
                // Public display/API aliases: diagnostics and UIs expect usedW/pvUsedW.
                // Runtime reservations also keep reserveW/pvReserveW for internal clarity.
                usedW: roundW(reserveW),
                pvUsedW: roundW(pvReserveW),
                reserveW: roundW(reserveW),
                pvReserveW: roundW(pvReserveW),
                actualW: roundW(actualW),
                pvOnly: !!r.pvOnly,
                mode: String(r.mode || ''),
                ts: Date.now(),
                remainingTotalW: Number.isFinite(jsNextRemainingTotalW) ? roundW(jsNextRemainingTotalW) : null,
                remainingPvW: roundW(jsNextRemainingPvW),
            };

            /**
             * Code-Teil: tsReservationProductiveCandidate
             *
             * Zweck:
             * Berechnet dieselbe Reservierung über den TypeScript-Helfer. Wenn Ergebnis
             * und JS-Referenz übereinstimmen, wird TS produktiv übernommen. Bei Fehlern
             * oder Abweichungen bleibt JS als Sicherheitsfallback aktiv.
             */
            let tsReservationResult = null;
            let tsPhase3Result = null;
            let tsReservationError = '';
            try {
                const mirror = requireCoreRuntimeTsMirror();
                const computeV3 = mirror && typeof mirror.applyCoreRuntimePhase3Reservation === 'function'
                    ? mirror.applyCoreRuntimePhase3Reservation
                    : null;
                const computeV2 = mirror && typeof mirror.applyCoreRuntimeReservation === 'function'
                    ? mirror.applyCoreRuntimeReservation
                    : null;
                if (computeV3 && this.phase3Runtime && this.phase3 && this.phase3.fallback !== true) {
                    tsPhase3Result = computeV3(this.phase3Runtime, r, Date.now());
                    tsReservationResult = tsPhase3Result && tsPhase3Result.reservation;
                } else if (computeV2) {
                    tsReservationResult = computeV2({
                        remainingTotalW: Number.isFinite(this.remainingTotalW) ? this.remainingTotalW : null,
                        remainingPvW: this.remainingPvW,
                        gates: this.gates,
                        consumers: this.consumers,
                        order: this.order,
                        sequence: this.sequence,
                    }, r, Date.now());
                }
            } catch (e) {
                tsReservationError = e && e.message ? e.message : String(e);
            }

            const tsEntry = tsReservationResult && tsReservationResult.entry ? tsReservationResult.entry : null;
            const mismatches = tsEntry ? [
                compareShadowWatt('entry.requestedW', jsEntry.requestedW, tsEntry.requestedW),
                compareShadowWatt('entry.grantW', jsEntry.grantW, tsEntry.grantW),
                compareShadowWatt('entry.usedW', jsEntry.usedW, tsEntry.usedW),
                compareShadowWatt('entry.pvUsedW', jsEntry.pvUsedW, tsEntry.pvUsedW),
                compareShadowWatt('entry.actualW', jsEntry.actualW, tsEntry.actualW),
                compareShadowWatt('entry.remainingTotalW', jsEntry.remainingTotalW, tsEntry.remainingTotalW),
                compareShadowWatt('entry.remainingPvW', jsEntry.remainingPvW, tsEntry.remainingPvW),
            ].filter(Boolean) : [];
            const tsOk = !!(
                tsReservationResult
                && tsReservationResult.ok
                && tsReservationResult.source === 'ts-core-runtime-reservation-v2'
                && tsEntry
                && !tsReservationError
                && mismatches.length === 0
            );
            const fallbackReason = tsOk
                ? ''
                : (tsReservationError || (!tsEntry ? 'missing-ts-entry' : (mismatches.length ? 'ts-js-mismatch' : 'ts-result-not-ok')));

            /**
             * Code-Teil: productiveTsReservationCommit
             *
             * Zweck:
             * Übernimmt ab 0.7.107 die TS-Reservierung produktiv, wenn der Vergleich sauber
             * war. Dadurch werden `remainingTotalW`, `remainingPvW`, `consumers`, `order`
             * und `flexUsedW` schrittweise aus der TypeScript-Quelle geführt.
             *
             * Notfallback:
             * Bei Abweichung oder Fehler wird exakt die lokal berechnete JS-Referenz
             * geschrieben. So bleibt der Adapter auch bei Fehlern im TS-Spiegel betriebsfähig.
             */
            let entry = jsEntry;
            let flexUsedW = 0;
            if (tsOk) {
                entry = {
                    ...tsEntry,
                    label: String(tsEntry.label || r.label || key),
                    mode: String(tsEntry.mode || r.mode || ''),
                    ts: Number(tsEntry.ts) || Date.now(),
                };
                this.remainingTotalW = tsReservationResult.nextRemainingTotalW === null
                    ? Number.POSITIVE_INFINITY
                    : Math.max(0, Number(tsReservationResult.nextRemainingTotalW) || 0);
                this.remainingPvW = Math.max(0, Number(tsReservationResult.nextRemainingPvW) || 0);
                this.consumers = (tsReservationResult.consumers && typeof tsReservationResult.consumers === 'object')
                    ? tsReservationResult.consumers
                    : { ...this.consumers, [key]: entry };
                this.order = Array.isArray(tsReservationResult.order) ? Array.from(tsReservationResult.order) : this.order.slice();
                if (!this.order.includes(key)) this.order.push(key);
                this.consumers[key] = entry;
                this.sequence = tsReservationResult.state && Number.isFinite(Number(tsReservationResult.state.sequence))
                    ? Math.max(0, Math.round(Number(tsReservationResult.state.sequence)))
                    : Math.max(0, Number(this.sequence) || 0) + 1;
                flexUsedW = Math.max(0, Number(tsReservationResult.flexUsedW) || 0);
                if (tsPhase3Result && tsPhase3Result.ok === true && tsPhase3Result.runtime) {
                    this.phase3Runtime = tsPhase3Result.runtime;
                    this.phase3.active = true;
                    this.phase3.fallback = false;
                    this.phase3.source = 'ts-core-runtime-phase3';
                    this.phase3.reason = 'phase3-reservation-parity-ok';
                    this.phase3.revision = Math.max(0, Number(tsPhase3Result.runtime.revision) || 0);
                }
            } else {
                this.remainingTotalW = jsNextRemainingTotalW;
                this.remainingPvW = jsNextRemainingPvW;
                this.consumers[key] = entry;
                if (!this.order.includes(key)) this.order.push(key);
                this.sequence = Math.max(0, Number(this.sequence) || 0) + 1;
                const liveConsumersForFlex = this.order.map(k => this.consumers[k] || null).filter(Boolean);
                flexUsedW = liveConsumersForFlex.reduce((sum, c) => sum + Math.max(0, Number(c.usedW ?? c.reserveW) || 0), 0);
                if (tsPhase3Result || (this.phase3 && this.phase3.active)) {
                    this.phase3Runtime = null;
                    this.phase3.active = false;
                    this.phase3.fallback = true;
                    this.phase3.source = 'legacy-js-runtime';
                    this.phase3.reason = fallbackReason || 'phase3-reservation-fallback';
                }
            }

            this.tsReservationLast = {
                ts: Date.now(),
                source: tsPhase3Result ? 'ts-core-runtime-phase3-reservation' : 'ts-core-runtime-reservation-v2',
                available: !!tsEntry,
                ok: tsOk,
                productive: tsOk,
                fallback: !tsOk,
                fallbackReason,
                key,
                js: {
                    requestedW: jsEntry.requestedW,
                    grantW: jsEntry.grantW,
                    usedW: jsEntry.usedW,
                    pvUsedW: jsEntry.pvUsedW,
                    actualW: jsEntry.actualW,
                    remainingTotalW: jsEntry.remainingTotalW,
                    remainingPvW: jsEntry.remainingPvW,
                },
                tsValues: tsEntry ? {
                    requestedW: tsEntry.requestedW,
                    grantW: tsEntry.grantW,
                    usedW: tsEntry.usedW,
                    pvUsedW: tsEntry.pvUsedW,
                    actualW: tsEntry.actualW,
                    remainingTotalW: tsEntry.remainingTotalW,
                    remainingPvW: tsEntry.remainingPvW,
                } : null,
                mismatches,
                error: tsReservationError,
            };

            try {
                const pfx = `ems.budget.consumers.${key}`;
                const liveConsumers = this.order.map(k => this.consumers[k] || null).filter(Boolean);
                const reserveRoundedW = roundW(entry.reserveW ?? entry.usedW);
                const pvReserveRoundedW = roundW(entry.pvReserveW ?? entry.pvUsedW);
                const actualRoundedW = roundW(entry.actualW);
                if (adapter && typeof adapter.setStateAsync === 'function') {
                    adapter.setStateAsync(`${pfx}.usedW`, reserveRoundedW, true).catch(() => {});
                    adapter.setStateAsync(`${pfx}.pvUsedW`, pvReserveRoundedW, true).catch(() => {});
                    adapter.setStateAsync(`${pfx}.actualW`, actualRoundedW, true).catch(() => {});
                    adapter.setStateAsync(`${pfx}.priority`, roundW(entry.priority ?? priority), true).catch(() => {});
                    adapter.setStateAsync(`${pfx}.mode`, String(entry.mode || ''), true).catch(() => {});
                    adapter.setStateAsync('ems.budget.flexUsedW', roundW(flexUsedW), true).catch(() => {});
                    adapter.setStateAsync('ems.budget.remainingTotalW', Number.isFinite(this.remainingTotalW) ? roundW(this.remainingTotalW) : 0, true).catch(() => {});
                    adapter.setStateAsync('ems.budget.remainingPvW', roundW(this.remainingPvW), true).catch(() => {});
                    adapter.setStateAsync('ems.budget.consumersJson', JSON.stringify(liveConsumers), true).catch(() => {});
                    adapter.setStateAsync('ems.budget.tsReservationJson', JSON.stringify(this.tsReservationLast || {}), true).catch(() => {});
                }
                if (adapter && typeof adapter.updateValue === 'function') {
                    const now = Date.now();
                    adapter.updateValue(`${pfx}.usedW`, reserveRoundedW, now);
                    adapter.updateValue(`${pfx}.pvUsedW`, pvReserveRoundedW, now);
                    adapter.updateValue(`${pfx}.actualW`, actualRoundedW, now);
                    adapter.updateValue('ems.budget.flexUsedW', roundW(flexUsedW), now);
                    adapter.updateValue('ems.budget.remainingTotalW', Number.isFinite(this.remainingTotalW) ? roundW(this.remainingTotalW) : 0, now);
                    adapter.updateValue('ems.budget.remainingPvW', roundW(this.remainingPvW), now);
                    adapter.updateValue('ems.budget.consumersJson', JSON.stringify(liveConsumers), now);
                    adapter.updateValue('ems.budget.tsReservationJson', JSON.stringify(this.tsReservationLast || {}), now);
                }
            } catch (_e) {
                // Diagnose-/State-Schreibfehler dürfen Budgetreservierungen nicht abbrechen.
            }

            return entry;
        },

        /**
         * Code-Teil: reserveSequence
         * Zweck: Führt mehrere zentrale Grants/Reservierungen deterministisch in
         * der übergebenen Reihenfolge aus. Die normale EMS-Engine reserviert
         * weiterhin Modul für Modul; Tests und künftige Orchestratoren können damit
         * dieselbe Reihenfolge als atomaren Rechenplan prüfen.
         */
        reserveSequence(requests) {
            const list = Array.isArray(requests) ? requests : [];
            try {
                const mirror = requireCoreRuntimeTsMirror();
                const runV3 = mirror && typeof mirror.applyCoreRuntimePhase3Sequence === 'function'
                    ? mirror.applyCoreRuntimePhase3Sequence
                    : null;
                const runV2 = mirror && typeof mirror.applyCoreRuntimeReservationSequence === 'function'
                    ? mirror.applyCoreRuntimeReservationSequence
                    : null;
                let result = null;
                let phase3 = null;
                if (runV3 && this.phase3Runtime && this.phase3 && this.phase3.fallback !== true) {
                    phase3 = runV3(this.phase3Runtime, list, Date.now());
                    result = phase3 && phase3.sequence;
                } else if (runV2) {
                    result = runV2({
                        remainingTotalW: Number.isFinite(this.remainingTotalW) ? this.remainingTotalW : null,
                        remainingPvW: this.remainingPvW,
                        gates: this.gates,
                        consumers: this.consumers,
                        order: this.order,
                        sequence: this.sequence,
                    }, list, Date.now());
                }
                if (!result || !result.ok || result.source !== 'ts-core-runtime-sequence-v2' || !result.state) {
                    return list.map(req => this.reserve(req));
                }
                this.remainingTotalW = result.state.remainingTotalW === null
                    ? Number.POSITIVE_INFINITY
                    : Math.max(0, Number(result.state.remainingTotalW) || 0);
                this.remainingPvW = Math.max(0, Number(result.state.remainingPvW) || 0);
                this.consumers = result.state.consumers && typeof result.state.consumers === 'object'
                    ? result.state.consumers
                    : this.consumers;
                this.order = Array.isArray(result.state.order) ? Array.from(result.state.order) : this.order;
                this.sequence = Math.max(0, Math.round(Number(result.state.sequence) || 0));
                if (phase3 && phase3.runtime) {
                    this.phase3Runtime = phase3.runtime;
                    this.phase3.active = true;
                    this.phase3.fallback = false;
                    this.phase3.source = 'ts-core-runtime-phase3';
                    this.phase3.reason = 'phase3-sequence-ok';
                    this.phase3.revision = Math.max(0, Number(phase3.runtime.revision) || 0);
                }
                return Array.isArray(result.entries) ? result.entries : [];
            } catch (_e) {
                if (this.phase3) {
                    this.phase3Runtime = null;
                    this.phase3.active = false;
                    this.phase3.fallback = true;
                    this.phase3.source = 'legacy-js-runtime';
                    this.phase3.reason = 'phase3-sequence-error';
                }
                return list.map(req => this.reserve(req));
            }
        },

        /**
         * Code-Teil: Methode `peek`
         * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: peek
         * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        peek() {
            return {
                ts: this.ts,
                gates: this.gates,
                raw: this.raw,
                remainingTotalW: Number.isFinite(this.remainingTotalW) ? roundW(this.remainingTotalW) : null,
                remainingPvW: roundW(this.remainingPvW),
                consumers: this.consumers,
                order: this.order.slice(),
                sequence: Math.max(0, Math.round(Number(this.sequence) || 0)),
                phase2: this.phase2,
                phase3: this.phase3,
            };
        },
    };

    return rt;
}

/**
 * Phase 4.0/4.8: zentrale Cap-/Budget-/Gate-Snapshot-Schicht.
 *
 * Ziele:
 * - EIN zentraler, pro Tick deterministischer Snapshot für Limits/Budgets.
 * - Gate A/B/C laufen immer im Hintergrund, unabhängig davon, welche App gerade aktiv ist.
 * - Apps können das zentrale Budget lesen/reservieren und regeln dadurch nicht mehr gegeneinander.
 *
 * Wichtiger Grundsatz:
 * - Dieser Core schreibt KEINE Geräte-Setpoints.
 * - Er stellt nur konsistente Caps/Budgets bereit, die andere Module nutzen.
 */
/**
 * Code-Teil: Klasse `CoreLimitsModule`
 * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
 * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
// Klassen-Kommentar: Klasse: CoreLimitsModule. Aufgabe: kapselt eine fachliche Teilaufgabe dieser Datei. Beim TypeScript-Umbau Eingaben, Rückgaben und Seiteneffekte typisieren. Zusammenhang: Zentrale Leistungsbudgets, PV-/Netz-/Speicherbasis und EMS-Limits.
/**
 * Klasse: CoreLimitsModule
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
class CoreLimitsModule extends BaseModule {
    /**
     * Code-Teil: constructor
     * Zweck: Bereitet eine Instanz vor, legt interne Felder an und verbindet spätere Methoden mit dem Objektzustand.
     * Zusammenhang: Gehört zu EMS-Modul (Regelungs-, Diagnose- oder Beratungslogik innerhalb der EMS-Engine) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
     * Wartung/TypeScript: Änderungen an Signatur oder Rückgabe können abhängige Aufrufer beeinflussen; Aufrufstellen mitprüfen. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
     */
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);
        this._inited = false;
        // Letzte physikalisch belegte PV-Obergrenze. Dieser kurze Hold ist nur
        // für asynchrone Hybrid-/Gateway-Telemetrie gedacht; er erzeugt ohne
        // aktive PV-Senke und ohne plausiblen NVP keinen neuen Überschuss.
        this._lastTrustedPvPhysicalCapW = 0;
        this._lastTrustedPvPhysicalCapTs = 0;
        // Diagnose des neuen typisierten Core-Runtime-Snapshots. Die Runtime-
        // I/O-Hülle bleibt vorerst JavaScript-kompatibel; die fachliche Budget-
        // Berechnung läuft produktiv über TypeScript mit harter Legacy-Fallback-
        // Parität.
        this._coreRuntimeTsLast = null;
    }
    /**
     * Code-Teil: init
     * Zweck: Initialisiert diesen Bereich und verbindet abhängige Startlogik.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async init() {
        await this.adapter.setObjectNotExistsAsync('ems.core', {
            type: 'channel',
            common: { name: 'EMS Core' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('ems.safety', {
            type: 'channel',
            common: { name: 'EMS Safety Envelope' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('ems.budget', {
            type: 'channel',
            common: { name: 'EMS Budget & Gates' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('ems.budget.gates', {
            type: 'channel',
            common: { name: 'Budget Gates' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('ems.budget.consumers', {
            type: 'channel',
            common: { name: 'Budget Consumers' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('ems.budget.forecast', {
            type: 'channel',
            common: { name: 'Budget Gate D - PV Forecast' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('ems.budget.tariff', {
            type: 'channel',
            common: { name: 'Budget Gate E - Tarif / Negativpreis' },
            native: {},
        });

        /**
         * Code-Teil: Arrow-Funktion `mk`
         * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        const mk = async (id, name, type, role, unit = undefined, write = false) => {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: 'state',
                common: {
                    name,
                    type,
                    role,
                    read: true,
                    write: !!write,
                    ...(unit ? { unit } : {}),
                },
                native: {},
            });
        };

        await mk('ems.core.lastUpdate', 'Last update (ts)', 'number', 'value.time');

        // Grid/Plant Caps
        await mk('ems.core.gridConnectionLimitW_cfg', 'Grid connection limit (W) configured', 'number', 'value.power', 'W');
        await mk('ems.core.gridSafetyMarginW', 'Grid safety margin (W)', 'number', 'value.power', 'W');
        await mk('ems.core.gridConstraintsCapW', 'Grid constraints hard cap (W) (RLM/EVU)', 'number', 'value.power', 'W');
        await mk('ems.core.gridConstraintsPlanningCapW', 'Grid constraints soft planning cap (W)', 'number', 'value.power', 'W');
        await mk('ems.core.gridImportLimitW_effective', 'Grid import hard limit effective (W)', 'number', 'value.power', 'W');
        await mk('ems.core.gridImportLimitW_planning', 'Grid import soft planning limit effective (W)', 'number', 'value.power', 'W');
        await mk('ems.core.gridImportSoftLimitW', 'Grid import soft limit (W)', 'number', 'value.power', 'W');
        await mk('ems.core.gridImportHardLimitW', 'Grid import hard limit (W)', 'number', 'value.power', 'W');
        await mk('ems.core.gridImportStage', 'Grid import limit stage', 'string', 'text');
        await mk('ems.core.gridImportRequiredReductionW', 'Grid import required flexible-load reduction (W)', 'number', 'value.power', 'W');
        await mk('ems.core.gridImportLimitW_physical', 'Grid import limit physical (W) (cfg/EVU minus margin)', 'number', 'value.power', 'W');
        await mk('ems.core.gridImportLimitW_peakShaving', 'Grid import limit from Peak-Shaving (W)', 'number', 'value.power', 'W');
        await mk('ems.core.gridImportLimitW_source', 'Grid import limit binding source', 'string', 'text');
        await mk('ems.core.gridMaxPhaseA_cfg', 'Grid max phase current (A) configured', 'number', 'value.current', 'A');

        // Peak
        await mk('ems.core.peakActive', 'Peak active', 'boolean', 'indicator');
        await mk('ems.core.peakBudgetW', 'Peak budget for controlled loads (W)', 'number', 'value.power', 'W');

        // Tariff
        await mk('ems.core.tariffBudgetW', 'Tariff cap for controlled loads (W)', 'number', 'value.power', 'W');
        await mk('ems.core.gridChargeAllowed', 'Grid charge allowed', 'boolean', 'indicator');
        await mk('ems.core.dischargeAllowed', 'Discharge allowed', 'boolean', 'indicator');

        // §14a
        await mk('ems.core.para14aActive', '§14a active', 'boolean', 'indicator');
        await mk('ems.core.para14aMode', '§14a mode', 'string', 'text');
        await mk('ems.core.para14aEvcsCapW', '§14a EVCS cap (W)', 'number', 'value.power', 'W');
        await mk('ems.core.para14aTotalCapW', '§14a total controlled-load cap (W)', 'number', 'value.power', 'W');
        await mk('ems.core.para14aSignalFresh', '§14a signal fresh', 'boolean', 'indicator');
        await mk('ems.core.para14aSignalStatus', '§14a signal status', 'string', 'text');
        await mk('ems.core.para14aStorageCapW', '§14a storage charge cap (W)', 'number', 'value.power', 'W');
        await mk('ems.core.para14aThermalCapW', '§14a thermal cap (W)', 'number', 'value.power', 'W');
        await mk('ems.core.para14aHeatingRodCapW', '§14a heating rod cap (W)', 'number', 'value.power', 'W');
        await mk('ems.core.controlledHighLevelCapW', 'Controlled-load high level cap (W)', 'number', 'value.power', 'W');
        await mk('ems.core.controlledHighLevelBinding', 'Controlled-load high level binding sources', 'string', 'text');

        // Result (high-level)
        await mk('ems.core.evcsHighLevelCapW', 'EVCS high level cap (W) (min of peak/tariff/14a)', 'number', 'value.power', 'W');
        await mk('ems.core.evcsHighLevelBinding', 'EVCS high level binding sources', 'string', 'text');
        await mk('ems.core.snapshot', 'Snapshot (JSON)', 'string', 'text');

        // Fail-closed Safety Envelope
        await mk('ems.safety.lastUpdate', 'Safety envelope last update', 'number', 'value.time');
        await mk('ems.safety.generation', 'Safety envelope generation', 'number', 'value');
        await mk('ems.safety.valid', 'Safety envelope valid', 'boolean', 'indicator');
        await mk('ems.safety.commissioned', 'Safety commissioning complete', 'boolean', 'indicator');
        await mk('ems.safety.forceZero', 'Safety force zero active', 'boolean', 'indicator');
        await mk('ems.safety.emergencyStop', 'Safety emergency stop active', 'boolean', 'indicator');
        await mk('ems.safety.reason', 'Safety status reason', 'string', 'text');
        await mk('ems.safety.gridConnectionPowerW', 'Configured grid connection power', 'number', 'value.power', 'W');
        await mk('ems.safety.gridImportLimitW', 'Effective grid import safety limit', 'number', 'value.power', 'W');
        await mk('ems.safety.gridImportW', 'Current grid import', 'number', 'value.power', 'W');
        await mk('ems.safety.gridHeadroomW', 'Current grid headroom', 'number', 'value.power', 'W');
        await mk('ems.safety.phaseComplete', 'All required phase measurements available', 'boolean', 'indicator');
        await mk('ems.safety.para14aReady', '§14a safety input ready', 'boolean', 'indicator');
        await mk('ems.safety.evcsCapW', 'Final EVCS safety cap', 'number', 'value.power', 'W');
        await mk('ems.safety.snapshot', 'Safety envelope snapshot', 'string', 'json');

        // Central gates. These are app-independent and intentionally live under ems.budget.
        await mk('ems.budget.lastUpdate', 'Budget last update (ts)', 'number', 'value.time');
        await mk('ems.budget.active', 'Budget coordinator active', 'boolean', 'indicator');
        await mk('ems.budget.mode', 'Budget coordinator mode', 'string', 'text');
        await mk('ems.budget.source', 'Budget source (js-runtime / ts-core-budget)', 'string', 'text');
        await mk('ems.budget.totalBudgetW', 'Total controlled-load budget (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.remainingTotalW', 'Remaining controlled-load budget (W)', 'number', 'value.power', 'W');
        await this.adapter.setObjectNotExistsAsync('ems.zeroExportPv', { type: 'channel', common: { name: 'Zentrale PV-Nulleinspeisestrategie' }, native: {} });
        for (const field of ['status', 'reason', 'owner', 'snapshotJson']) await mk(`ems.zeroExportPv.${field}`, field, 'string', 'text');
        await mk('ems.zeroExportPv.active', 'Zentrale Nulleinspeisestrategie aktiv', 'boolean', 'indicator');
        for (const field of ['probeW', 'energyWh', 'validUntil', 'operatingMarginW', 'evcsHoldW']) await mk(`ems.zeroExportPv.${field}`, field, 'number', 'value');
        await mk('ems.budget.pvBudgetRawW', 'PV budget raw before reserve (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.pvBudgetW', 'PV budget effective (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.remainingPvW', 'Remaining PV budget (W)', 'number', 'value.power', 'W');
        // Kundenseitige PV-Ueberschuss-Prioritaet. Diese States zeigen transparent,
        // welcher Anteil des zentralen PV-Budgets in diesem Tick fuer E-Mobilitaet
        // freigegeben bzw. fuer den Speicher vorgehalten wird.
        await mk('ems.budget.pvAllocationEnabled', 'Fixed PV surplus allocation enabled', 'boolean', 'indicator');
        await mk('ems.budget.pvAllocationMode', 'PV surplus allocation mode', 'string', 'text');
        await mk('ems.budget.pvAllocationEvcsSharePct', 'PV surplus EVCS share (%)', 'number', 'value.percent', '%');
        await mk('ems.budget.pvAllocationEvcsCapW', 'PV surplus EVCS cap (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.pvAllocationStorageGuaranteedW', 'PV surplus storage guaranteed share (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.pvAllocationStorageEligible', 'Storage eligible for PV surplus allocation', 'boolean', 'indicator');
        await mk('ems.budget.pvAllocationStorageMaxChargeW', 'Storage max charge power used for allocation (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.pvAllocationReason', 'PV surplus allocation reason', 'string', 'text');
        await mk('ems.budget.gridW', 'Grid power signed (W) (+ import / - export)', 'number', 'value.power', 'W');
        await mk('ems.budget.gridExportW', 'Grid export (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.gridImportW', 'Grid import (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.storageChargeW', 'Storage charge power (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.storageDischargeW', 'Storage discharge power (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.pvPowerW', 'PV production power (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.pvBudgetFlowRawW', 'PV budget flow reconstruction raw (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.pvBudgetPhysicalCapW', 'PV budget physical PV cap (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.pvBudgetPhysicalSource', 'PV budget physical evidence source', 'string', 'text');
        await mk('ems.budget.pvBudgetPhysicalHeld', 'PV budget uses short trusted hold', 'boolean', 'indicator');
        await mk('ems.budget.pvBudgetDirectSource', 'Direct PV source used by central budget', 'string', 'text');
        await mk('ems.budget.pvBudgetDirectFresh', 'Direct PV source is fresh', 'boolean', 'indicator');
        await mk('ems.budget.pvBudgetPvFlexUsedW', 'Physical PV flexible load used for reconstruction (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.pvBudgetClampedW', 'PV budget clamped by physical PV (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.flexUsedW', 'Already active/reserved flexible load (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.binding', 'Budget binding source', 'string', 'text');
        await mk('ems.budget.consumersJson', 'Budget consumers (JSON)', 'string', 'text');
        await mk('ems.budget.snapshot', 'Budget snapshot (JSON)', 'string', 'text');
        await mk('ems.budget.tsShadowJson', 'TypeScript Core-Budget Shadow-Vergleich (JSON)', 'string', 'json');
        await mk('ems.budget.tsProductiveJson', 'TypeScript Core-Budget Produktivstatus (JSON)', 'string', 'json');
        await mk('ems.budget.tsReservationJson', 'TypeScript Consumer-Reservierung Shadow-Vergleich (JSON)', 'string', 'json');
        await mk('ems.budget.tsCoreRuntimeMode', 'TypeScript Core-Runtime Modus', 'string', 'text');
        await mk('ems.budget.tsCoreRuntimeFallback', 'TypeScript Core-Runtime Fallback aktiv', 'boolean', 'indicator');
        await mk('ems.budget.tsCoreRuntimeMismatchCount', 'TypeScript Core-Runtime Abweichungen', 'number', 'value');
        await mk('ems.budget.tsCoreRuntimeJson', 'TypeScript Core-Runtime Produktivstatus (JSON)', 'string', 'json');
        await mk('ems.budget.tsRestGatesJson', 'TypeScript Forecast-/Tarif-/Peak-Gates produktiv/Fallback (JSON)', 'string', 'json');
        await mk('ems.budget.phase2PublicationMode', 'TypeScript Core-Runtime Publikationsmodus', 'string', 'text');
        await mk('ems.budget.phase3RuntimeMode', 'TypeScript Core Phase-3 Laufzeitmodus', 'string', 'text');
        await mk('ems.budget.phase3RuntimeFallback', 'TypeScript Core Phase-3 Fallback aktiv', 'boolean', 'indicator');
        await mk('ems.budget.phase3RuntimeRevision', 'TypeScript Core Phase-3 Revision', 'number', 'value');
        await mk('ems.budget.phase3RuntimeReason', 'TypeScript Core Phase-3 Statusgrund', 'string', 'text');

        // §14a publication contract of the typed Core runtime. These objects must
        // exist independently of whether the optional §14a app is currently active:
        // the central budget publishes the neutral/inactive snapshot every cycle.
        // Keeping the object catalog beside the other ems.budget states prevents
        // ioBroker's "has no existing object" warning loop after an update.
        await mk('ems.budget.para14aActive', '§14a central constraint active', 'boolean', 'indicator');
        await mk('ems.budget.para14aMode', '§14a central constraint mode', 'string', 'text');
        await mk('ems.budget.para14aEvcsCapW', '§14a EVCS cap in central budget (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.para14aTotalCapW', '§14a total controlled-load cap in central budget (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.para14aAppCapsJson', '§14a app-specific caps in central budget (JSON)', 'string', 'json');
        await mk('ems.budget.para14aSignalFresh', '§14a signal fresh in central budget', 'boolean', 'indicator');
        await mk('ems.budget.para14aSignalStatus', '§14a signal status in central budget', 'string', 'text');
        await mk('ems.budget.para14aConstraintOnly', '§14a operates as central constraint only', 'boolean', 'indicator');

        // Gate D - PV Forecast. Advisory background gate for forecast-aware app decisions.
        // It does not write setpoints and does not change the instantaneous PV budget by itself.
        await mk('ems.budget.forecast.valid', 'PV forecast valid', 'boolean', 'indicator');
        await mk('ems.budget.forecast.usable', 'PV forecast usable for app decisions', 'boolean', 'indicator');
        await mk('ems.budget.forecast.ageMs', 'PV forecast age (ms)', 'number', 'value', 'ms');
        await mk('ems.budget.forecast.points', 'PV forecast points', 'number', 'value');
        await mk('ems.budget.forecast.confidencePct', 'PV forecast confidence (%)', 'number', 'value', '%');
        await mk('ems.budget.forecast.nowW', 'PV forecast now (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.forecast.avgNext1hW', 'PV forecast average next 1h (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.forecast.avgNext3hW', 'PV forecast average next 3h (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.forecast.peakNext6hW', 'PV forecast peak next 6h (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.forecast.peakNext24hW', 'PV forecast peak next 24h (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.forecast.kwhNext1h', 'PV forecast energy next 1h (kWh)', 'number', 'value.energy', 'kWh');
        await mk('ems.budget.forecast.kwhNext3h', 'PV forecast energy next 3h (kWh)', 'number', 'value.energy', 'kWh');
        await mk('ems.budget.forecast.kwhNext6h', 'PV forecast energy next 6h (kWh)', 'number', 'value.energy', 'kWh');
        await mk('ems.budget.forecast.kwhNext12h', 'PV forecast energy next 12h (kWh)', 'number', 'value.energy', 'kWh');
        await mk('ems.budget.forecast.kwhNext24h', 'PV forecast energy next 24h (kWh)', 'number', 'value.energy', 'kWh');
        await mk('ems.budget.forecast.status', 'PV forecast gate status', 'string', 'text');
        await mk('ems.budget.forecast.source', 'PV forecast source', 'string', 'text');
        await mk('ems.budget.forecast.snapshotJson', 'PV forecast gate snapshot (JSON)', 'string', 'json');

        // Gate E - Tarif / Negativpreis. Advisory + permission gate for price-aware control.
        // It does not bypass hard grid/phase/§14a/peak limits; it only tells apps that
        // grid import is economically preferred during negative effective prices.
        await mk('ems.budget.tariff.active', 'Tariff gate active', 'boolean', 'indicator');
        await mk('ems.budget.tariff.state', 'Tariff state', 'string', 'text');
        await mk('ems.budget.tariff.currentPriceEurKwh', 'Current tariff price (€/kWh)', 'number', 'value');
        await mk('ems.budget.tariff.negativeActive', 'Negative price active', 'boolean', 'indicator');
        await mk('ems.budget.tariff.gridImportPreferred', 'Grid import preferred', 'boolean', 'indicator');
        await mk('ems.budget.tariff.storageGridChargeAllowed', 'Storage grid charge allowed by tariff', 'boolean', 'indicator');
        await mk('ems.budget.tariff.evcsGridChargeAllowed', 'EVCS grid charge allowed by tariff', 'boolean', 'indicator');
        await mk('ems.budget.tariff.dischargeAllowed', 'Discharge allowed by tariff', 'boolean', 'indicator');
        await mk('ems.budget.tariff.pvCurtailRecommended', 'PV curtailment recommended by tariff', 'boolean', 'indicator');
        await mk('ems.budget.tariff.negativeMinPriceEurKwh', 'Minimum negative price in horizon (€/kWh)', 'number', 'value');
        await mk('ems.budget.tariff.nextNegativeFrom', 'Next negative price window from (ISO)', 'string', 'text');
        await mk('ems.budget.tariff.nextNegativeTo', 'Next negative price window to (ISO)', 'string', 'text');
        await mk('ems.budget.tariff.status', 'Tariff gate status', 'string', 'text');
        await mk('ems.budget.tariff.snapshotJson', 'Tariff gate snapshot (JSON)', 'string', 'json');

        // Per-consumer diagnostics for currently supported app families.
        for (const key of ['evcs', 'storage', 'thermal', 'heatingRod', 'generic']) {
            await this.adapter.setObjectNotExistsAsync(`ems.budget.consumers.${key}`, {
                type: 'channel',
                common: { name: `Budget consumer ${key}` },
                native: {},
            });
            await mk(`ems.budget.consumers.${key}.usedW`, `${key} used (W)`, 'number', 'value.power', 'W');
            await mk(`ems.budget.consumers.${key}.pvUsedW`, `${key} PV used (W)`, 'number', 'value.power', 'W');
            await mk(`ems.budget.consumers.${key}.actualW`, `${key} actual power (W)`, 'number', 'value.power', 'W');
            await mk(`ems.budget.consumers.${key}.priority`, `${key} priority`, 'number', 'value');
            await mk(`ems.budget.consumers.${key}.mode`, `${key} mode`, 'string', 'text');
        }

        this._inited = true;
    }

    /**
     * Code-Teil: Methode `_readDpNumberFresh`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readDpNumberFresh
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _readDpNumberFresh(keys, maxAgeMs, fallback = null) {
        if (!this.dp || !Array.isArray(keys)) return fallback;
        for (const k of keys) {
            if (!k) continue;
            try {
                const v = this.dp.getNumberFresh(String(k), maxAgeMs, null);
                if (typeof v === 'number' && Number.isFinite(v)) return v;
            } catch (_e) {}
        }
        return fallback;
    }

    /**
     * Code-Teil: Methode `_readCacheNumber`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readCacheNumber
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _readCacheNumber(keys, fallback = null) {
        const cache = this.adapter && this.adapter.stateCache ? this.adapter.stateCache : null;
        if (!cache || !Array.isArray(keys)) return fallback;
        for (const k of keys) {
            if (!k) continue;
            try {
                const rec = cache[String(k)];
                const raw = rec && typeof rec === 'object' && Object.prototype.hasOwnProperty.call(rec, 'value') ? rec.value : rec;
                const v = Number(raw);
                if (Number.isFinite(v)) return v;
            } catch (_e) {}
        }
        return fallback;
    }


    /**
     * Code-Teil: _readCacheNumberFresh
     * Zweck: Liest einen Zahlenwert nur dann aus dem Adapter-Cache, wenn dessen
     * Zeitstempel innerhalb des vorgegebenen Fensters liegt. Damit kann das
     * zentrale Budget direkte PV-/NVP-Werte herstellerübergreifend nutzen, ohne
     * einen alten Cachewert als aktuellen Überschuss zu behandeln.
     */
    _readCacheNumberFresh(keys, maxAgeMs, fallback = null) {
        const cache = this.adapter && this.adapter.stateCache ? this.adapter.stateCache : null;
        if (!cache || !Array.isArray(keys)) return fallback;
        const now = Date.now();
        const maxAge = Number(maxAgeMs);
        for (const k of keys) {
            if (!k) continue;
            try {
                const rec = cache[String(k)];
                if (!rec) continue;
                const raw = rec && typeof rec === 'object' && Object.prototype.hasOwnProperty.call(rec, 'value') ? rec.value : rec;
                const v = Number(raw);
                if (!Number.isFinite(v)) continue;
                if (Number.isFinite(maxAge) && maxAge > 0 && rec && typeof rec === 'object') {
                    const ts = Number(rec.ts);
                    if (Number.isFinite(ts) && ts > 0 && Math.max(0, now - ts) > maxAge) continue;
                }
                return v;
            } catch (_e) {}
        }
        return fallback;
    }

    /**
     * Code-Teil: _resolveDirectPvPower
     * Zweck: Vergleicht alle frischen direkten PV-Quellen und verwendet die
     * höchste plausible Messung. Ein vorhandener, aber 0 W meldender Alias darf
     * dadurch eine gleichzeitig frische `derived.core.pv.totalW`-Messung nicht
     * mehr verdecken. Es wird bewusst nicht summiert, damit dieselbe PV-Anlage
     * über mehrere Aliase niemals doppelt gezählt wird.
     */
    _resolveDirectPvPower(maxAgeMs) {
        const candidates = [];
        const push = (key, value, sourceType) => {
            if (value === null || value === undefined || value === '') return;
            const n = Number(value);
            if (!Number.isFinite(n)) return;
            candidates.push({ key: String(key || ''), valueW: Math.max(0, n), sourceType: String(sourceType || '') });
        };

        if (this.dp) {
            for (const key of ['ps.pvW', 'cm.pvPowerW']) {
                try {
                    push(key, this.dp.getNumberFresh(String(key), maxAgeMs, null), 'dp-registry');
                } catch (_e) {}
            }
        }

        for (const key of [
            'derived.core.pv.totalW',
            'pvPower',
            'productionTotal',
            'storageFarm.totalPvPowerW',
            'speicher.dcPvPowerW',
        ]) {
            push(key, this._readCacheNumberFresh([key], maxAgeMs, null), 'adapter-cache');
        }

        if (!candidates.length) {
            return { powerW: 0, fresh: false, source: 'missing-or-stale', candidates: [] };
        }

        candidates.sort((a, b) => {
            const diff = Number(b.valueW) - Number(a.valueW);
            if (Math.abs(diff) > 0.001) return diff;
            // Bei gleichem Wert ist die zentrale abgeleitete PV-Summe die beste
            // herstellerübergreifende Quelle; danach folgen direkte Registry-DPs.
            const score = (row) => row.key === 'derived.core.pv.totalW'
                ? 3
                : (row.sourceType === 'dp-registry' ? 2 : 1);
            return score(b) - score(a);
        });
        const selected = candidates[0];
        return {
            powerW: Math.max(0, Number(selected.valueW) || 0),
            fresh: true,
            source: `${selected.sourceType}:${selected.key}`,
            candidates,
        };
    }

    /**
     * Code-Teil: Methode `_readCacheNumberMax`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readCacheNumberMax
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _readCacheNumberMax(keys, fallback = null) {
        const cache = this.adapter && this.adapter.stateCache ? this.adapter.stateCache : null;
        if (!cache || !Array.isArray(keys)) return fallback;
        let best = null;
        for (const k of keys) {
            if (!k) continue;
            try {
                const rec = cache[String(k)];
                const raw = rec && typeof rec === 'object' && Object.prototype.hasOwnProperty.call(rec, 'value') ? rec.value : rec;
                const v = Number(raw);
                if (Number.isFinite(v)) best = best === null ? v : Math.max(best, v);
            } catch (_e) {}
        }
        return best === null ? fallback : best;
    }

    /**
     * Code-Teil: Methode `_readRuntimeOrStateNumber`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readRuntimeOrStateNumber
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _readRuntimeOrStateNumber(keys, fallback = null) {
        const a = this.adapter || {};
        for (const k of keys || []) {
            if (!k) continue;
            try {
                const v = a[String(k)];
                const n = Number(v);
                if (Number.isFinite(n)) return n;
            } catch (_e) {}
        }
        return fallback;
    }

    /**
     * Code-Teil: Methode `_forecastPowerAt`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _forecastPowerAt
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _forecastPowerAt(curve, ts) {
        if (!Array.isArray(curve) || !curve.length) return 0;
        const t = Number(ts);
        if (!Number.isFinite(t)) return 0;
        let bestFuture = null;
        for (const s of curve) {
            if (!s || typeof s !== 'object') continue;
            const t0 = Number(s.t);
            const dt = Number(s.dtMs);
            const w = Math.max(0, Number(s.w) || 0);
            if (!Number.isFinite(t0) || !Number.isFinite(dt) || dt <= 0) continue;
            const t1 = t0 + dt;
            if (t >= t0 && t < t1) return w;
            if (t0 > t && (bestFuture === null || t0 < bestFuture.t)) bestFuture = { t: t0, w };
        }
        // If there is no segment exactly covering now but the next segment starts soon,
        // expose it as a cautious now-value. Forecast sources sometimes publish anchors
        // on 15/30/60 minute boundaries while the EMS tick is in between.
        if (bestFuture && (bestFuture.t - t) <= 30 * 60 * 1000) return bestFuture.w;
        return 0;
    }

    /**
     * Code-Teil: Methode `_forecastIntegrateKwh`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _forecastIntegrateKwh
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _forecastIntegrateKwh(curve, fromMs, toMs) {
        if (!Array.isArray(curve) || !curve.length) return 0;
        const a = Number(fromMs);
        const b = Number(toMs);
        if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
        let wh = 0;
        for (const s of curve) {
            if (!s || typeof s !== 'object') continue;
            const t0 = Number(s.t);
            const dt = Number(s.dtMs);
            let w = Number(s.w);
            if (!Number.isFinite(t0) || !Number.isFinite(dt) || dt <= 0 || !Number.isFinite(w)) continue;
            if (w < 0) w = 0;
            const t1 = t0 + dt;
            if (t1 <= a || t0 >= b) continue;
            const ov0 = Math.max(a, t0);
            const ov1 = Math.min(b, t1);
            const ovMs = ov1 - ov0;
            if (ovMs > 0) wh += w * (ovMs / 3600000);
        }
        return wh / 1000;
    }

    /**
     * Code-Teil: Methode `_forecastPeakW`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _forecastPeakW
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _forecastPeakW(curve, fromMs, toMs) {
        if (!Array.isArray(curve) || !curve.length) return 0;
        const a = Number(fromMs);
        const b = Number(toMs);
        if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
        let peak = 0;
        for (const s of curve) {
            if (!s || typeof s !== 'object') continue;
            const t0 = Number(s.t);
            const dt = Number(s.dtMs);
            const w = Math.max(0, Number(s.w) || 0);
            if (!Number.isFinite(t0) || !Number.isFinite(dt) || dt <= 0) continue;
            const t1 = t0 + dt;
            if (t1 <= a || t0 >= b) continue;
            peak = Math.max(peak, w);
        }
        return peak;
    }

    /**
     * Code-Teil: Methode `_forecastConfidencePct`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _forecastConfidencePct
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _forecastConfidencePct(valid, ageMs, points) {
        if (!valid) return 0;
        const p = Number(points);
        if (!Number.isFinite(p) || p <= 0) return 0;
        const age = Number(ageMs);
        if (!Number.isFinite(age) || age < 0) return 90;
        if (age <= 2 * 3600000) return 100;
        if (age <= 6 * 3600000) return 85;
        if (age <= 12 * 3600000) return 70;
        if (age <= 24 * 3600000) return 50;
        return 20;
    }

    /**
     * Code-Teil: Methode `_makeForecastGate`
     * Zweck: baut aus Rohdaten eine strukturierte Konfiguration, Liste oder Empfehlung.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _makeForecastGate
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _makeForecastGate(now) {
        const pf = (this.adapter && this.adapter._pvForecast && typeof this.adapter._pvForecast === 'object')
            ? this.adapter._pvForecast
            : null;
        const curve = (pf && Array.isArray(pf.curve)) ? pf.curve : [];
        const pointsRaw = pf ? pf.points : null;
        const points = Number.isFinite(Number(pointsRaw)) ? Number(pointsRaw) : curve.length;
        const valid = !!(pf && pf.valid && points > 0);
        const ageMs = (pf && pf.ageMs !== null && pf.ageMs !== undefined && Number.isFinite(Number(pf.ageMs)))
            ? Math.max(0, Number(pf.ageMs))
            : null;
        const confidencePct = this._forecastConfidencePct(valid, ageMs, points);

        const kwh1 = valid ? this._forecastIntegrateKwh(curve, now, now + 1 * 3600000) : 0;
        const kwh3 = valid ? this._forecastIntegrateKwh(curve, now, now + 3 * 3600000) : 0;
        const kwh6 = valid ? Math.max(0, Number(pf.kwhNext6h) || 0, this._forecastIntegrateKwh(curve, now, now + 6 * 3600000)) : 0;
        const kwh12 = valid ? Math.max(0, Number(pf.kwhNext12h) || 0, this._forecastIntegrateKwh(curve, now, now + 12 * 3600000)) : 0;
        const kwh24 = valid ? Math.max(0, Number(pf.kwhNext24h) || 0, this._forecastIntegrateKwh(curve, now, now + 24 * 3600000)) : 0;
        const nowW = valid ? this._forecastPowerAt(curve, now) : 0;
        const avgNext1hW = Math.max(0, kwh1 * 1000);
        const avgNext3hW = Math.max(0, (kwh3 * 1000) / 3);
        const peakNext6hW = valid ? this._forecastPeakW(curve, now, now + 6 * 3600000) : 0;
        const peakNext24hW = valid ? Math.max(0, Number(pf.peakWNext24h) || 0, this._forecastPeakW(curve, now, now + 24 * 3600000)) : 0;
        const ageOk = (ageMs === null) || ageMs <= 24 * 3600000;
        const hasFutureYield = (kwh1 > 0.001) || (kwh3 > 0.001) || (kwh6 > 0.001) || peakNext24hW > 0;
        const usable = !!(valid && ageOk && confidencePct >= 40 && hasFutureYield);

        let status = 'missing';
        if (pf && !valid) status = 'invalid';
        if (valid && !ageOk) status = 'stale';
        if (valid && ageOk && !hasFutureYield) status = 'no_future_yield';
        if (usable) status = 'ok';

        return {
            valid,
            usable,
            ageMs: ageMs === null ? null : roundW(ageMs),
            points: roundW(points),
            confidencePct: roundW(confidencePct),
            nowW: roundW(nowW),
            avgNext1hW: roundW(avgNext1hW),
            avgNext3hW: roundW(avgNext3hW),
            peakNext6hW: roundW(peakNext6hW),
            peakNext24hW: roundW(peakNext24hW),
            kwhNext1h: Number.isFinite(kwh1) ? Number(kwh1.toFixed(3)) : 0,
            kwhNext3h: Number.isFinite(kwh3) ? Number(kwh3.toFixed(3)) : 0,
            kwhNext6h: Number.isFinite(kwh6) ? Number(kwh6.toFixed(3)) : 0,
            kwhNext12h: Number.isFinite(kwh12) ? Number(kwh12.toFixed(3)) : 0,
            kwhNext24h: Number.isFinite(kwh24) ? Number(kwh24.toFixed(3)) : 0,
            status,
            source: pf ? 'forecast.pv' : '',
        };
    }

    /**
     * Code-Teil: _publishCoreRuntimeBudgetPlan
     * Zweck: Veröffentlicht Budget-Snapshot, Restbudgets und Verbraucherstände
     * produktiv aus dem typisierten Phase-2-Plan. Bei fehlendem Spiegel oder
     * inkonsistenten Kernwerten bleibt der bestehende JS-Publikationspfad aktiv.
     */
    async _publishCoreRuntimeBudgetPlan(now, budgetSnapshot, budgetRuntime, coreTsShadow, coreRestGatesTsShadow) {
        const markFallback = (reason) => {
            if (budgetRuntime && budgetRuntime.phase2 && typeof budgetRuntime.phase2 === 'object') {
                budgetRuntime.phase2.publication = 'legacy-js-publication';
                budgetRuntime.phase2.publicationFallback = true;
                budgetRuntime.phase2.publicationReason = String(reason || 'typed-publication-unavailable');
            }
            if (budgetRuntime && budgetRuntime.phase3 && typeof budgetRuntime.phase3 === 'object') {
                budgetRuntime.phase3.fallback = true;
                budgetRuntime.phase3.active = false;
                budgetRuntime.phase3.source = 'legacy-js-runtime';
                budgetRuntime.phase3.reason = String(reason || 'typed-publication-unavailable');
            }
            return false;
        };
        try {
            const mirror = requireCoreRuntimeTsMirror();
            const buildV3 = mirror && typeof mirror.buildCoreRuntimePhase3PublicationPlan === 'function'
                ? mirror.buildCoreRuntimePhase3PublicationPlan
                : null;
            const buildV2 = mirror && typeof mirror.buildCoreRuntimePublicationPlan === 'function'
                ? mirror.buildCoreRuntimePublicationPlan
                : null;
            if (!buildV3 && !buildV2) return markFallback('typed-publication-unavailable');

            const b = budgetSnapshot && typeof budgetSnapshot === 'object' ? budgetSnapshot : {};
            const coreRuntimeStatus = (b.tsCoreRuntime && typeof b.tsCoreRuntime === 'object')
                ? b.tsCoreRuntime
                : ((this._coreRuntimeTsLast && typeof this._coreRuntimeTsLast === 'object') ? this._coreRuntimeTsLast : {});
            const sharedPublicationInput = {
                tsRestGates: b.tsRestGatesProductive || b.tsRestGatesShadow || coreRestGatesTsShadow || null,
                tsShadow: b.tsShadow || coreTsShadow || null,
                tsProductive: b.tsProductive || null,
                coreRuntimeStatus,
            };
            const usePhase3 = !!(buildV3 && budgetRuntime && budgetRuntime.phase3Runtime && budgetRuntime.phase3 && budgetRuntime.phase3.fallback !== true);
            const plan = usePhase3
                ? buildV3({ ...sharedPublicationInput, runtime: budgetRuntime.phase3Runtime })
                : buildV2({
                    ...sharedPublicationInput,
                    snapshot: b,
                    runtime: budgetRuntime ? {
                        remainingTotalW: Number.isFinite(budgetRuntime.remainingTotalW) ? budgetRuntime.remainingTotalW : null,
                        remainingPvW: budgetRuntime.remainingPvW,
                        gates: budgetRuntime.gates,
                        consumers: budgetRuntime.consumers,
                        order: budgetRuntime.order,
                        sequence: budgetRuntime.sequence,
                    } : null,
                    tsReservation: (budgetRuntime && budgetRuntime.tsReservationLast) || null,
                });
            const validSource = plan && (plan.source === 'ts-core-runtime-publication-v3' || plan.source === 'ts-core-runtime-publication-v2');
            if (!plan || plan.ok !== true || !validSource) return markFallback('typed-publication-invalid');
            const states = plan.states && typeof plan.states === 'object' ? plan.states : null;
            if (!states) return markFallback('typed-publication-states-missing');

            const expectedTotalW = b.gates && b.gates.total && b.gates.total.effectiveW !== null
                ? roundW(b.gates.total.effectiveW)
                : 0;
            const expectedPvW = b.gates && b.gates.pv ? roundW(b.gates.pv.effectiveW) : 0;
            const expectedGridW = b.raw ? roundW(b.raw.gridW) : 0;
            const expectedRemainingTotalW = budgetRuntime && Number.isFinite(budgetRuntime.remainingTotalW)
                ? roundW(budgetRuntime.remainingTotalW)
                : 0;
            const expectedRemainingPvW = budgetRuntime ? roundW(budgetRuntime.remainingPvW) : expectedPvW;
            const critical = [
                ['ems.budget.totalBudgetW', expectedTotalW],
                ['ems.budget.pvBudgetW', expectedPvW],
                ['ems.budget.gridW', expectedGridW],
                ['ems.budget.remainingTotalW', expectedRemainingTotalW],
                ['ems.budget.remainingPvW', expectedRemainingPvW],
            ];
            for (const [id, expected] of critical) {
                const actual = Number(states[id]);
                if (!Number.isFinite(actual) || Math.abs(actual - Number(expected)) > 1) {
                    return markFallback(`typed-publication-mismatch:${id}`);
                }
            }

            for (const [id, value] of Object.entries(states)) {
                await this.adapter.setStateAsync(id, value, true);
            }
            if (this.adapter && typeof this.adapter.updateValue === 'function') {
                const cache = plan.cache && typeof plan.cache === 'object' ? plan.cache : {};
                for (const [id, value] of Object.entries(cache)) this.adapter.updateValue(id, value, now);
            }
            if (budgetRuntime && budgetRuntime.phase2 && typeof budgetRuntime.phase2 === 'object') {
                budgetRuntime.phase2.publication = String(plan.source || 'typed-core-runtime-publication-v2');
                budgetRuntime.phase2.publicationFallback = false;
            }
            if (budgetRuntime && budgetRuntime.phase3 && typeof budgetRuntime.phase3 === 'object') {
                budgetRuntime.phase3.publication = String(plan.source || '');
                budgetRuntime.phase3.publicationFallback = false;
                budgetRuntime.phase3.revision = Math.max(0, Number(plan.runtimeRevision ?? budgetRuntime.phase3.revision) || 0);
            }
            return true;
        } catch (_e) {
            return markFallback(_e && _e.message ? _e.message : 'typed-publication-error');
        }
    }

    /**
     * Code-Teil: Methode `_makeBudgetSnapshot`
     * Zweck: baut aus Rohdaten eine strukturierte Konfiguration, Liste oder Empfehlung.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _makeBudgetSnapshot
     * Zweck: Verarbeitet Energiefluss-/Budgetwerte und beeinflusst Live-Anzeige sowie History.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _makeBudgetSnapshot(now, coreSnapshot) {
        const cfg = (this.adapter && this.adapter.config) ? this.adapter.config : {};
        const cmCfg = (cfg.chargingManagement && typeof cfg.chargingManagement === 'object') ? cfg.chargingManagement : {};
        const staleTimeoutSec = clamp(num(cmCfg.staleTimeoutSec, 15), 1, 3600, 15) || 15;
        const staleMs = Math.max(1, Math.round(staleTimeoutSec * 1000));
        /**
         * Code-Teil: gridW
         * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const centralNvp = resolveCurrentNvpSnapshot(this.adapter && this.adapter._nvpFreshnessSnapshot, now, Math.max(staleMs, 10000));
        let gridW = centralNvp.usable ? centralNvp.netW : null;
        let gridMeasurementUsable = centralNvp.usable;
        let gridMeasurementStatus = centralNvp.current ? centralNvp.status : 'legacy-fallback';
        let gridMeasurementSource = centralNvp.current ? centralNvp.source : 'legacy-fallback';
        let gridMeasurementReason = centralNvp.current ? centralNvp.reason : '';
        if (!centralNvp.current) {
            const dpVal = this._readDpNumberFresh(['grid.powerRawW', 'ems.gridPowerRawW', 'grid.powerW', 'ems.gridPowerW', 'ps.gridPowerW'], staleMs, null);
            const cacheVal = isFiniteNumber(dpVal) ? dpVal : this._readCacheNumberFresh(['grid.powerRawW', 'ems.gridPowerRawW', 'grid.powerW', 'ems.gridPowerW', 'gridPower', 'gridPowerW'], staleMs, null);
            if (isFiniteNumber(cacheVal)) {
                gridW = Number(cacheVal);
                gridMeasurementUsable = true;
                gridMeasurementStatus = 'legacy-fresh';
                gridMeasurementSource = 'legacy-fresh';
            } else {
                gridMeasurementStatus = 'stale';
                gridMeasurementReason = 'no-fresh-canonical-nvp';
            }
        }
        const gridControlW = gridMeasurementUsable && isFiniteNumber(gridW) ? Number(gridW) : 0;

        const gridImportW = Math.max(0, gridControlW);
        const gridExportW = Math.max(0, -gridControlW);

        /**
         * Code-Teil: Arrow-Funktion `pvPowerW`
         * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: pvPowerW
         * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        // PV-/Hybrid-Messwerte kommen bei manchen Herstellern deutlich langsamer
        // als der NVP. Das zentrale Budget darf deshalb nicht nach 15 s auf 0 W
        // fallen, während der Energiefluss weiterhin eine klare Einspeisung zeigt.
        const pvSourceMaxAgeMs = Math.max(staleMs * 3, 45000);
        const pvPowerInfo = this._resolveDirectPvPower(pvSourceMaxAgeMs);
        const pvPowerW = Math.max(0, Number(pvPowerInfo.powerW) || 0);

        // Eine einzige Speichertopologie ist fuer Messung, Budget und Hardwareausgang
        // autoritativ. Auch der Kompatibilitaets-Fallback darf Farm- und Einzelwerte
        // niemals mischen, weil sonst eine alte Messung der nicht ausgewaehlten
        // Topologie ein fiktives PV-/Leistungsbudget erzeugen kann.
        const fallbackFarmInfo = (this.adapter && typeof this.adapter._nwGetStorageFarmRuntimeInfo === 'function')
            ? this.adapter._nwGetStorageFarmRuntimeInfo()
            : null;
        const fallbackFarmDispatchActive = !!(fallbackFarmInfo && fallbackFarmInfo.dispatchActive);
        const fallbackSingleActive = cfg.enableStorageControl === true;
        const storageAuthority = (this.adapter && typeof this.adapter._nwGetStorageControlAuthority === 'function')
            ? this.adapter._nwGetStorageControlAuthority()
            : {
                selectedTopology: fallbackFarmDispatchActive ? 'farm' : (fallbackSingleActive ? 'single' : 'none'),
                writerActive: fallbackFarmDispatchActive || fallbackSingleActive,
                reason: fallbackFarmDispatchActive
                    ? 'legacy-writable-farm-active'
                    : (fallbackSingleActive ? 'legacy-single-active' : 'no-active-storage-output'),
            };
        const storageTopology = String(storageAuthority.selectedTopology || 'none');
        const storageControlEnabled = !!storageAuthority.writerActive;

        // Speicherleistung wird zentral wie im Energiefluss aufgelöst:
        // - getrennte Lade-/Entlade-DPs bleiben vollständig gültig
        // - signed Batterie-DP bleibt gültig (- = Laden, + = Entladen; invertierbar)
        // - die nicht ausgewaehlte Topologie ist in jedem Fall ausgeschlossen
        let storageChargeW = 0;
        let storageDischargeW = 0;
        let usedCentralStorageFlow = false;
        try {
            const flow = (this.adapter && typeof this.adapter._nwResolveBatteryFlowFromCache === 'function')
                ? this.adapter._nwResolveBatteryFlowFromCache({ maxAgeMs: staleMs, deadbandW: 25 })
                : null;
            if (flow && typeof flow === 'object') {
                usedCentralStorageFlow = true;
                storageChargeW = Math.max(0, Math.round(Number(flow.chargeW) || 0));
                storageDischargeW = Math.max(0, Math.round(Number(flow.dischargeW) || 0));
            }
        } catch (_eFlow) {}

        if (!usedCentralStorageFlow && storageTopology === 'farm') {
            // Kompatibilitaets-Fallback fuer Laufzeiten ohne zentralen Resolver:
            // bei ausgewaehlter Farm sind ausschliesslich Farmaggregate zulaessig.
            storageChargeW = Math.max(0, this._readCacheNumberMax(['storageFarm.totalChargePowerW'], 0) || 0);
            storageDischargeW = Math.max(0, this._readCacheNumberMax(['storageFarm.totalDischargePowerW'], 0) || 0);
        } else if (!usedCentralStorageFlow && storageTopology === 'single') {
            // Beim Einzelpfad duerfen keine alten Farmwerte in das Budget einfließen.
            storageChargeW = Math.max(0, this._readCacheNumberMax(['storageChargePower'], 0) || 0);
            storageDischargeW = Math.max(0, this._readCacheNumberMax(['storageDischargePower'], 0) || 0);
            const batteryPowerW = this._readCacheNumber(['batteryPower'], null);
            if (isFiniteNumber(batteryPowerW)) {
                const flowBatteryMapped = !!(cfg.datapoints && String(cfg.datapoints.batteryPower || '').trim());
                const invBattery = flowBatteryMapped && !!(cfg.settings && cfg.settings.flowInvertBattery);
                const signed = Math.round(invBattery ? -batteryPowerW : batteryPowerW);
                if (signed < -25) {
                    storageChargeW = Math.max(storageChargeW, Math.abs(signed));
                    storageDischargeW = 0;
                } else if (signed > 25) {
                    storageDischargeW = Math.max(storageDischargeW, signed);
                    storageChargeW = 0;
                }
            }
        }

        const evcsEnabled = cfg.enableChargingManagement !== false;
        const thermalEnabled = cfg.enableThermalControl === true;
        const heatingRodEnabled = cfg.enableHeatingRodControl === true;

        // Der Core nutzt den letzten Ist-/Intentstand der später laufenden Verbraucher.
        // Das begrenzte Frischefenster verhindert Ghost-Lasten nach Deaktivierung.
        const flexibleFlowMaxAgeMs = Math.max(staleMs * 3, 45000);
        const evcsUsedRawW = Math.max(0, this._readCacheNumberFresh(['chargingManagement.control.usedW', 'evcs.totalPowerW'], flexibleFlowMaxAgeMs, 0) || 0);
        const evcsActualRawW = Math.max(0, this._readCacheNumberFresh(['chargingManagement.control.actualW', 'chargingManagement.summary.totalPowerW', 'evcs.totalPowerW'], flexibleFlowMaxAgeMs, 0) || 0);
        const evcsPvUsedRawW = Math.max(0, this._readCacheNumberFresh(['chargingManagement.control.pvEvcsPhysicalPvManagedW', 'chargingManagement.control.pvEvcsUsedW'], flexibleFlowMaxAgeMs, 0) || 0);
        const thermalRuntimeW = this._readRuntimeOrStateNumber(['_thermalBudgetUsedW'], null);
        const heatingRodRuntimeW = this._readRuntimeOrStateNumber(['_heatingRodBudgetUsedW'], null);
        const thermalUsedRawW = Math.max(0, Number.isFinite(Number(thermalRuntimeW))
            ? Number(thermalRuntimeW)
            : (this._readCacheNumberFresh(['thermal.summary.budgetUsedW'], flexibleFlowMaxAgeMs, 0) || 0));
        const heatingRodUsedRawW = Math.max(0, Number.isFinite(Number(heatingRodRuntimeW))
            ? Number(heatingRodRuntimeW)
            : (this._readCacheNumberFresh(['heatingRod.summary.budgetUsedW'], flexibleFlowMaxAgeMs, 0) || 0));
        const thermalActualRawW = Math.max(0, this._readCacheNumberFresh(['thermal.summary.appliedTotalW', 'thermal.summary.budgetUsedW'], flexibleFlowMaxAgeMs, 0) || 0);
        const heatingRodActualRawW = Math.max(0, this._readCacheNumberFresh(['heatingRod.summary.currentHeatingRodW', 'heatingRod.summary.appliedTotalW', 'heatingRod.summary.budgetUsedW'], flexibleFlowMaxAgeMs, 0) || 0);

        // Nur aktive EMS-Apps dürfen alte Runtimewerte in Budget/Diagnose übernehmen.
        const evcsUsedW = evcsEnabled ? evcsUsedRawW : 0;
        const evcsActualW = evcsEnabled ? evcsActualRawW : 0;
        const zeroExportMode = readZeroExportMode(this.adapter);
        const zeroExportMeasurementIds = new Set();
        // Bei Nulleinspeisung die vollständige FRISCHE EV-Aufnahme rekonstruieren,
        // einschließlich Boost/Auto-Netzanteil. Der signierte NVP zieht Netzbezug
        // bereits ab; ein zweiter Abzug am LP würde PV bei jedem Tick verlieren.
        const evcsPvUsedW = evcsEnabled ? (zeroExportMode.active
            ? measuredFlexibleLoadW(this.adapter, this.dp, 'evcs', zeroExportMeasurementIds, now) : evcsPvUsedRawW) : 0;
        // Bei Nulleinspeisung zählt nur gemessene Aufnahme, kein letzter Sollwert.
        const thermalUsedW = thermalEnabled ? (zeroExportMode.active ? measuredFlexibleLoadW(this.adapter, this.dp, 'thermal', zeroExportMeasurementIds, now) : thermalUsedRawW) : 0, thermalActualW = thermalEnabled ? thermalActualRawW : 0;
        const heatingRodUsedW = heatingRodEnabled ? (zeroExportMode.active ? measuredFlexibleLoadW(this.adapter, this.dp, 'heatingRod', zeroExportMeasurementIds, now) : heatingRodUsedRawW) : 0, heatingRodActualW = heatingRodEnabled ? heatingRodActualRawW : 0;
        const flexUsedW = Math.max(0, evcsUsedW + thermalUsedW + heatingRodUsedW);
        const flexActualW = Math.max(0, evcsActualW + thermalActualW + heatingRodActualW), storageControlledChargeW = storageControlEnabled ? storageChargeW : 0;
        const currentControlledLoadW = Math.max(0, flexActualW + storageControlledChargeW);

        // Physikalisches PV-Budget: frische PV begrenzt die NVP-Rekonstruktion.
        // Reservierungen erzeugen kein PV-Potential; nur realer/plausibilisierter
        // EVCS-PV-Fluss zählt. Netzbezug wird über den signierten NVP abgezogen.
        const pvFlexUsedW = Math.max(0, evcsPvUsedW + thermalUsedW + heatingRodUsedW);
        const unconfirmedProbeW = zeroExportMode.active ? unconfirmedZeroExportW(this.adapter) : 0;
        const pvBudgetFlowRawW = Math.max(0, computePvBudgetFlowRawW({
            gridW: gridControlW,
            flexUsedW: pvFlexUsedW,
            storageChargeW,
            storageDischargeW,
        }) - unconfirmedProbeW);
        const activePvSinkW = Math.max(0, pvFlexUsedW + storageChargeW);
        const previousTrustedPvPhysicalCapW = this._lastTrustedPvPhysicalCapW;
        const lastTrustedAgeMs = this._lastTrustedPvPhysicalCapTs > 0
            ? Math.max(0, now - this._lastTrustedPvPhysicalCapTs)
            : null;
        const pvPhysicalResolution = resolvePvBudgetPhysicalCapW({
            measuredPvW: pvPowerW,
            measuredPvFresh: pvPowerInfo.fresh === true,
            flowRawW: pvBudgetFlowRawW,
            gridExportW,
            gridImportW,
            activePvSinkW,
            lastTrustedW: previousTrustedPvPhysicalCapW,
            lastTrustedAgeMs,
            holdMs: Math.max(30000, pvSourceMaxAgeMs),
        });
        const pvPhysicalCapW = Math.max(0, Number(pvPhysicalResolution.capW) || 0);
        if (pvPhysicalResolution.trusted === true && pvPhysicalCapW > 0) {
            this._lastTrustedPvPhysicalCapW = pvPhysicalCapW;
            this._lastTrustedPvPhysicalCapTs = now;
        }
        const pvBudgetRawW = gridMeasurementUsable ? Math.min(pvBudgetFlowRawW, pvPhysicalCapW) : 0;
        const pvBudgetClampedW = Math.max(0, pvBudgetFlowRawW - pvBudgetRawW);
        // Eine Exportreserve würde laufende Nulleinspeise-Lasten bei jedem Tick
        // wieder abwürgen. Hier schützt die signierte Istbilanz; Export-Guard
        // behält seinen eigenen Importbias und alle Netzgrenzen.
        const pvReserveW = zeroExportMode.active ? 0 : (clamp(num(cmCfg.pvChargeReserveW, 500), 0, 1e12, 500) || 0);
        const pvBudgetEffectiveW = Math.max(0, pvBudgetRawW - pvReserveW);
        const pvAvailable = pvBudgetEffectiveW > 0;

        // Kundenseitige PV-Ueberschuss-Prioritaet. Die Verteilung bleibt Teil der
        // zentralen Budgetlogik: EVCS laeuft zuerst und wird auf seinen Anteil
        // begrenzt, der Speicher reserviert danach den tatsaechlich verbleibenden
        // Rest. Dynamische Tarife sind hiervon bewusst getrennt.
        const readCacheValue = (key, fallback = null) => {
            try {
                const cache = this.adapter && this.adapter.stateCache ? this.adapter.stateCache : null;
                const rec = cache ? cache[String(key)] : null;
                if (rec === null || rec === undefined) return fallback;
                if (typeof rec === 'object' && Object.prototype.hasOwnProperty.call(rec, 'value')) {
                    return rec.value === null || rec.value === undefined ? fallback : rec.value;
                }
                return rec;
            } catch (_e) {
                return fallback;
            }
        };
        const storageCfg = (cfg.storage && typeof cfg.storage === 'object') ? cfg.storage : {};
        const storageSocPct = storageTopology === 'farm'
            ? this._readCacheNumber([
                'storageFarm.totalSocOnline',
                'storageFarm.totalSoc',
            ], null)
            : (storageTopology === 'single'
                ? this._readCacheNumber([
                    'speicher.regelung.socPct',
                    'storageSoc',
                ], null)
                : null);
        const installerCfg = (cfg.installerConfig && typeof cfg.installerConfig === 'object') ? cfg.installerConfig : {};
        const storageMultiUseCfg = (installerCfg.storageMultiUse && typeof installerCfg.storageMultiUse === 'object')
            ? installerCfg.storageMultiUse
            : null;
        const storageMultiUseActive = !!(cfg.enableMultiUse === true && storageMultiUseCfg && storageMultiUseCfg.enabled === true);
        const storageOperatingPolicy = resolveStorageOperatingPolicy({
            storageConfig: storageCfg,
            multiUseConfig: storageMultiUseCfg,
            multiUseActive: storageMultiUseActive,
            storageFarmConfig: (cfg.storageFarm && typeof cfg.storageFarm === 'object') ? cfg.storageFarm : {},
            selectedTopology: storageTopology,
            standaloneDefaultEnabled: true,
            standaloneDefaultMinSocPct: 10,
            standaloneDefaultMaxSocPct: 100,
            standaloneDefaultTargetGridImportW: 50,
            standaloneDefaultImportThresholdW: 20,
        });
        const storageMaxSocPct = clamp(num(storageOperatingPolicy.self.maxSocPct, 100), 0, 100, 100);
        const storageEligible = !!(
            storageControlEnabled
            && storageCfg.pvEnabled !== false
            && (!isFiniteNumber(storageSocPct) || storageSocPct < (storageMaxSocPct - 0.1))
        );
        const configuredStorageMaxChargeW = Math.max(
            0,
            num(storageCfg.selfMaxChargeW, 0) || 0,
            num(storageCfg.maxChargeW, 0) || 0,
        );
        const farmAvailableChargeW = storageTopology === 'farm'
            ? Math.max(0, this._readCacheNumber(['storageFarm.availableChargePowerW'], 0) || 0)
            : 0;
        const storageMaxChargeForAllocationW = configuredStorageMaxChargeW > 0
            ? configuredStorageMaxChargeW
            : (storageTopology === 'farm' && farmAvailableChargeW > 0 ? farmAvailableChargeW : 0);
        const allocationEnabledRaw = readCacheValue('settings.pvSurplusAllocationEnabled', true);
        const allocationEnabled = !(allocationEnabledRaw === false || allocationEnabledRaw === 0 || String(allocationEnabledRaw).trim().toLowerCase() === 'false');
        const pvAllocationGate = buildPvSurplusAllocation(
            pvBudgetEffectiveW,
            readCacheValue('settings.pvSurplusPriority', 'both'),
            readCacheValue('settings.pvSurplusEvcsSharePct', 50),
            {
                allocationEnabled,
                storageEligible,
                storageMaxChargeW: storageMaxChargeForAllocationW,
            },
        );
        pvAllocationGate.storageSocPct = isFiniteNumber(storageSocPct) ? Number(storageSocPct) : null;
        pvAllocationGate.storageMaxSocPct = storageMaxSocPct;

        // Total controlled-load budget for grid-cap/§14a/peak/tariff layer.
        const gridHardLimitW = coreSnapshot && coreSnapshot.grid ? Number(coreSnapshot.grid.gridImportLimitW_effective || 0) : 0;
        const gridPlanningLimitW = coreSnapshot && coreSnapshot.grid ? Number(coreSnapshot.grid.gridImportLimitW_planning || 0) : 0;
        // RC86: Die 90-%-Schwelle ist keine absolute Lastobergrenze. Das
        // zentrale Budget bildet deshalb den vollen signierten Headroom bis zur
        // Hard-Importgrenze ab. `gridPlanningLimitW` bleibt als Soft-Schwelle fuer
        // progressive Rampen und Diagnose erhalten.
        const gridLimitW = gridHardLimitW > 0 ? gridHardLimitW : gridPlanningLimitW;
        const gridImportStage = coreSnapshot && coreSnapshot.grid ? String(coreSnapshot.grid.gridImportStage || '') : '';
        const gridImportRequiredReductionW = coreSnapshot && coreSnapshot.grid
            ? Math.max(0, Number(coreSnapshot.grid.gridImportRequiredReductionW || 0))
            : 0;
        // RC78: reine Bezugsgrenze bei signiertem NVP (Import +, Export -).
        // Gesamtziel = reale geregelte Istlast + Limit - NVP; Reservierungen werden
        // erst danach abgezogen. Überbezug erzwingt dadurch weiterhin Lastabwurf.
        const gridIncrementHeadroomW = gridMeasurementUsable
            ? (gridLimitW > 0 ? gridLimitW - gridControlW : Number.POSITIVE_INFINITY)
            : 0;
        const gridHeadroomRawW = gridMeasurementUsable
            ? (gridLimitW > 0 ? Math.max(0, currentControlledLoadW + gridIncrementHeadroomW) : Number.POSITIVE_INFINITY)
            : 0;
        const gridHeadroomW = gridHeadroomRawW;
        const peakHighLevelCapW = coreSnapshot && coreSnapshot.peak && isFiniteNumber(coreSnapshot.peak.budgetW)
            ? Math.max(0, Number(coreSnapshot.peak.budgetW))
            : Number.POSITIVE_INFINITY;
        const para14aNetCapW = coreSnapshot && coreSnapshot.para14a && coreSnapshot.para14a.active === true && isFiniteNumber(coreSnapshot.para14a.totalCapW)
            ? Math.max(0, Number(coreSnapshot.para14a.totalCapW))
            : Number.POSITIVE_INFINITY;
        const para14aTotalAllowanceW = Number.isFinite(para14aNetCapW)
            ? para14aNetCapW + pvBudgetEffectiveW
            : Number.POSITIVE_INFINITY;
        const highLevelCapW = Math.min(peakHighLevelCapW, para14aTotalAllowanceW);
        const highLevelBindingParts = [];
        if (Number.isFinite(peakHighLevelCapW) && Math.abs(highLevelCapW - peakHighLevelCapW) <= 1) highLevelBindingParts.push('peak');
        if (Number.isFinite(para14aTotalAllowanceW) && Math.abs(highLevelCapW - para14aTotalAllowanceW) <= 1) highLevelBindingParts.push('14a+local-pv');
        const highLevelBinding = highLevelBindingParts.join('+') || 'highLevel';
        const totalBudgetW = gridMeasurementUsable ? Math.max(0, Math.min(gridHeadroomW, highLevelCapW)) : 0;

        const bindings = [];
        if (!gridMeasurementUsable) bindings.push(`nvp_${gridMeasurementStatus || 'stale'}`);
        if (gridMeasurementUsable && Number.isFinite(highLevelCapW) && Math.abs(totalBudgetW - highLevelCapW) <= 1) {
            bindings.push(highLevelBinding);
        } else if (gridMeasurementUsable && gridLimitW > 0 && Math.abs(totalBudgetW - gridHeadroomW) <= 1) {
            // `grid-monitor` means the import guard defines the available headroom
            // but is not currently reducing a consumer. Only the live soft/hard
            // stages are actual interventions.
            bindings.push(gridImportRequiredReductionW > 0
                ? (gridImportStage === 'hard' ? 'grid-hard' : 'grid-soft')
                : 'grid-monitor');
        }
        if (!bindings.length) bindings.push('unlimited');

        // Gate D: PV forecast is an advisory gate. It is published centrally so apps
        // can later reserve/shift loads based on prognosis without each app parsing
        // provider JSON separately. It does not alter instantaneous PV budget here.
        const forecastGate = this._makeForecastGate(now);

        // Gate E: tariff/negative-price gate. This is advisory for all apps and
        // permission-like for modules that already consume tariff flags.
        const tSrc = (coreSnapshot && coreSnapshot.tariff && typeof coreSnapshot.tariff === 'object') ? coreSnapshot.tariff : {};
        const tariffGate = {
            active: !!tSrc.active,
            state: String(tSrc.state || ''),
            currentPriceEurKwh: isFiniteNumber(tSrc.currentPriceEurKwh) ? Number(tSrc.currentPriceEurKwh) : null,
            negativeActive: !!tSrc.negativeActive,
            gridImportPreferred: !!tSrc.gridImportPreferred,
            storageGridChargeAllowed: !!tSrc.storageGridChargeAllowed,
            evcsGridChargeAllowed: !!tSrc.evcsGridChargeAllowed,
            dischargeAllowed: tSrc.dischargeAllowed !== false,
            pvCurtailRecommended: !!tSrc.pvCurtailRecommended,
            negativeMinPriceEurKwh: isFiniteNumber(tSrc.negativeMinPriceEurKwh) ? Number(tSrc.negativeMinPriceEurKwh) : null,
            nextNegativeFrom: String(tSrc.nextNegativeFrom || ''),
            nextNegativeTo: String(tSrc.nextNegativeTo || ''),
            status: String(tSrc.status || (tSrc.gridImportPreferred ? 'grid_import_preferred' : (tSrc.active ? 'active' : 'inactive'))),
        };

        const legacySnapshot = {
            ts: now,
            active: true,
            mode: 'central-background',
            raw: {
                gridW: roundW(gridControlW),
                gridMeasurementUsable,
                gridMeasurementStatus,
                gridMeasurementSource,
                gridMeasurementReason,
                gridMeasurementAgeMs: centralNvp.current && isFiniteNumber(Number(centralNvp.measurementAgeMs)) ? roundW(Number(centralNvp.measurementAgeMs)) : null,
                gridImportW: roundW(gridImportW),
                gridExportW: roundW(gridExportW),
                pvPowerW: roundW(pvPowerW),
                storageChargeW: roundW(storageChargeW),
                storageDischargeW: roundW(storageDischargeW),
                evcsUsedW: roundW(evcsUsedW),
                evcsActualW: roundW(evcsActualW),
                evcsPvUsedW: roundW(evcsPvUsedW),
                thermalUsedW: roundW(thermalUsedW),
                thermalActualW: roundW(thermalActualW),
                heatingRodUsedW: roundW(heatingRodUsedW),
                heatingRodActualW: roundW(heatingRodActualW),
                flexUsedW: roundW(flexUsedW),
                flexActualW: roundW(flexActualW),
                storageControlledChargeW: roundW(storageControlledChargeW),
                currentControlledLoadW: roundW(currentControlledLoadW),
                pvFlexUsedW: roundW(pvFlexUsedW),
                pvReserveW: roundW(pvReserveW),
                pvBudgetFlowRawW: roundW(pvBudgetFlowRawW),
                pvBudgetPhysicalCapW: roundW(pvPhysicalCapW),
                pvBudgetPhysicalSource: String(pvPhysicalResolution.source || ''),
                pvBudgetPhysicalHeld: pvPhysicalResolution.held === true,
                pvBudgetDirectSource: String(pvPowerInfo.source || ''),
                pvBudgetDirectFresh: pvPowerInfo.fresh === true,
                pvBudgetClampedW: roundW(pvBudgetClampedW),
            },
            gates: {
                grid: {
                    importLimitW: roundW(gridLimitW),
                    planningImportLimitW: roundW(gridPlanningLimitW > 0 ? gridPlanningLimitW : gridLimitW),
                    hardImportLimitW: roundW(gridHardLimitW),
                    limitStage: gridImportStage,
                    importW: roundW(gridImportW),
                    exportW: roundW(gridExportW),
                    measurementUsable: gridMeasurementUsable,
                    measurementStatus: gridMeasurementStatus,
                    measurementSource: gridMeasurementSource,
                    measurementReason: gridMeasurementReason,
                    incrementHeadroomW: Number.isFinite(gridIncrementHeadroomW) ? roundW(gridIncrementHeadroomW) : null,
                    currentControlledLoadW: roundW(currentControlledLoadW),
                    headroomW: Number.isFinite(gridHeadroomW) ? roundW(gridHeadroomW) : null,
                    headroomRawW: Number.isFinite(gridHeadroomRawW) ? roundW(gridHeadroomRawW) : null,
                },
                pv: {
                    available: !!pvAvailable,
                    rawW: roundW(pvBudgetRawW),
                    flowRawW: roundW(pvBudgetFlowRawW),
                    physicalCapW: roundW(pvPhysicalCapW),
                    clampedW: roundW(pvBudgetClampedW),
                    reserveW: roundW(pvReserveW),
                    effectiveW: roundW(pvBudgetEffectiveW),
                    source: String(pvPhysicalResolution.source || 'central-physical-budget'),
                    directPvSource: String(pvPowerInfo.source || ''),
                    directPvFresh: pvPowerInfo.fresh === true,
                    physicalHeld: pvPhysicalResolution.held === true,
                    clampReason: pvBudgetClampedW > 0 ? 'physical_pv_cap' : '',
                },
                storage: {
                    chargeW: roundW(storageChargeW),
                    dischargeW: roundW(storageDischargeW),
                    topology: storageTopology,
                    writerActive: storageControlEnabled,
                    authorityReason: String(storageAuthority.reason || ''),
                },
                pvAllocation: pvAllocationGate,
                forecast: forecastGate,
                tariff: tariffGate,
                para14a: coreSnapshot && coreSnapshot.para14a && typeof coreSnapshot.para14a === 'object'
                    ? {
                        ...coreSnapshot.para14a,
                        localPvGrantW: roundW(pvBudgetEffectiveW),
                        totalAllowanceW: Number.isFinite(para14aNetCapW) ? roundW(para14aTotalAllowanceW) : null,
                    }
                    : { active: false, appCapsW: {}, localPvGrantW: 0, totalAllowanceW: null },
                total: {
                    effectiveW: Number.isFinite(totalBudgetW) ? roundW(totalBudgetW) : null,
                    binding: bindings.join('+'),
                },
            },
            consumers: (() => {
                const out = {};
                if (evcsUsedW > 0 || evcsActualW > 0 || evcsPvUsedW > 0) {
                    out.evcs = { priority: 100, usedW: roundW(evcsUsedW), pvUsedW: roundW(evcsPvUsedW), mode: 'charging' };
                }
                if (thermalUsedW > 0 || thermalActualW > 0) {
                    out.thermal = { priority: 200, usedW: roundW(thermalUsedW), pvUsedW: roundW(thermalUsedW), mode: 'pvAuto' };
                }
                if (heatingRodUsedW > 0 || heatingRodActualW > 0) {
                    out.heatingRod = { priority: 300, usedW: roundW(heatingRodUsedW), pvUsedW: roundW(heatingRodUsedW), mode: 'pvAuto' };
                }
                return out;
            })(),
        };

        const typedInput = {
            ts: now,
            grid: {
                netW: gridControlW,
                usable: gridMeasurementUsable,
                status: gridMeasurementStatus,
                source: gridMeasurementSource,
                reason: gridMeasurementReason,
                measurementAgeMs: centralNvp.current && isFiniteNumber(Number(centralNvp.measurementAgeMs))
                    ? Number(centralNvp.measurementAgeMs)
                    : null,
                importLimitW: gridLimitW,
                planningImportLimitW: gridPlanningLimitW > 0 ? gridPlanningLimitW : gridLimitW,
                hardImportLimitW: gridHardLimitW,
                limitStage: gridImportStage,
                requiredReductionW: gridImportRequiredReductionW,
                highLevelCapW,
                highLevelBinding,
            },
            pv: {
                measuredW: pvPowerW,
                measuredFresh: pvPowerInfo.fresh === true,
                measuredSource: String(pvPowerInfo.source || ''),
                reserveW: pvReserveW,
                unconfirmedProbeW,
                lastTrustedW: previousTrustedPvPhysicalCapW,
                lastTrustedAgeMs,
                holdMs: Math.max(30000, pvSourceMaxAgeMs),
                exportEvidenceThresholdW: 250,
                importToleranceW: 250,
            },
            storage: {
                chargeW: storageChargeW,
                dischargeW: storageDischargeW,
                eligible: storageEligible,
                maxChargeW: storageMaxChargeForAllocationW,
                socPct: storageSocPct,
                maxSocPct: storageMaxSocPct,
                topology: storageTopology,
                writerActive: storageControlEnabled,
                authorityReason: String(storageAuthority.reason || ''),
            },
            consumers: {
                evcsUsedW,
                evcsActualW,
                evcsPvUsedW,
                thermalUsedW,
                thermalActualW,
                heatingRodUsedW,
                heatingRodActualW,
            },
            allocation: {
                enabled: allocationEnabled,
                mode: readCacheValue('settings.pvSurplusPriority', 'both'),
                evcsSharePct: readCacheValue('settings.pvSurplusEvcsSharePct', 50),
            },
            forecast: forecastGate,
            tariff: tariffGate,
            para14a: coreSnapshot && coreSnapshot.para14a && typeof coreSnapshot.para14a === 'object'
                ? { ...coreSnapshot.para14a }
                : { active: false, appCapsW: {} },
        };

        return this._applyCoreRuntimeTsSnapshot(legacySnapshot, typedInput);
    }

    /**
     * Code-Teil: _applyCoreRuntimeTsSnapshot
     * Zweck: Übernimmt den vollständig typisierten zentralen Budget-Snapshot,
     * wenn er mit der bewährten Legacy-Rechnung übereinstimmt. Bei fehlendem
     * Spiegel, Runtimefehler oder Abweichung bleibt die Legacy-Hülle aktiv.
     */
    _applyCoreRuntimeTsSnapshot(legacySnapshot, typedInput) {
        const fallback = (reason, extra = {}) => {
            const status = {
                ts: Date.now(),
                active: false,
                productive: false,
                fallback: true,
                mode: 'legacy-js-fallback',
                reason,
                mismatchCount: Array.isArray(extra.mismatches) ? extra.mismatches.length : 0,
                ...extra,
            };
            this._coreRuntimeTsLast = status;
            try { legacySnapshot.tsCoreRuntime = status; } catch (_e) {}
            return legacySnapshot;
        };

        try {
            const mirror = requireCoreRuntimeTsMirror();
            const build = mirror && typeof mirror.buildCoreRuntimeBudgetSnapshot === 'function'
                ? mirror.buildCoreRuntimeBudgetSnapshot
                : null;
            const prepare = mirror && typeof mirror.prepareCoreRuntimeSnapshotInput === 'function'
                ? mirror.prepareCoreRuntimeSnapshotInput
                : null;
            const compare = mirror && typeof mirror.compareCoreRuntimeBudgetSnapshots === 'function'
                ? mirror.compareCoreRuntimeBudgetSnapshots
                : null;
            if (!build || !prepare || !compare) return fallback('typed-core-runtime-unavailable');

            const prepared = prepare(typedInput || {});
            if (!prepared || prepared.ok !== true || !prepared.input) return fallback('typed-core-input-invalid');
            const typedSnapshot = build(prepared.input);
            if (!typedSnapshot || typeof typedSnapshot !== 'object') return fallback('typed-core-runtime-empty');
            const mismatches = compare(legacySnapshot, typedSnapshot, 1);
            if (Array.isArray(mismatches) && mismatches.length) {
                return fallback('typed-core-runtime-mismatch', { mismatches: mismatches.slice(0, 20) });
            }

            const status = {
                ts: Date.now(),
                active: true,
                productive: true,
                fallback: false,
                mode: 'typed-core-runtime',
                reason: 'parity-ok',
                mismatchCount: 0,
                contractVersion: typedSnapshot.typedRuntime && typedSnapshot.typedRuntime.contractVersion
                    ? String(typedSnapshot.typedRuntime.contractVersion)
                    : 'core-runtime-v2',
                inputContractVersion: prepared.contractVersion || 'core-runtime-input-v2',
                inputSource: prepared.source || 'ts-core-runtime-input-v2',
                inputDiagnostics: prepared.diagnostics || {},
            };
            typedSnapshot.tsCoreRuntime = status;
            this._coreRuntimeTsLast = status;
            return typedSnapshot;
        } catch (e) {
            return fallback('typed-core-runtime-error', {
                error: e && e.message ? e.message : String(e),
            });
        }
    }

    /**
     * Code-Teil: Methode `tick`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: tick
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */

    /**
     * Code-Teil: _runCoreBudgetTsShadowComparison
     *
     * Zweck:
     * Berechnet aus den bereits vorhandenen JavaScript-Runtimewerten zusätzlich
     * einen TypeScript-Shadow-Snapshot und vergleicht zentrale Budgetfelder.
     *
     * Zusammenhang:
     * Dieser Shadow-Vergleich ist die sichere Vorstufe, bevor Core-Limits später
     * produktiv aus TypeScript kommen dürfen. Die produktive Runtime bleibt in
     * 0.7.77 vollständig bei der bestehenden JavaScript-Logik.
     *
     * Wichtig:
     * - Es werden keine produktiven Werte überschrieben.
     * - Abweichungen werden nur im Diagnose-JSON und als gedrosselte Warnung sichtbar.
     * - Die Eingaben sind so gewählt, dass der TS-Spiegel die aktuelle JS-Budgetregel
     *   nachbildet, inklusive PV-Reserve-Abzug.
     */
    _runCoreBudgetTsShadowComparison(budgetSnapshot) {
        const mirror = requireCoreBudgetTsMirror();
        const build = mirror && typeof mirror.buildCoreBudgetSnapshot === 'function' ? mirror.buildCoreBudgetSnapshot : null;
        if (!build || !budgetSnapshot || typeof budgetSnapshot !== 'object') {
            return { available: false, ok: false, source: 'missing-ts-mirror', mismatches: [] };
        }
        try {
            const raw = budgetSnapshot.raw || {};
            const gates = budgetSnapshot.gates || {};
            const pv = gates.pv || {};
            const grid = gates.grid || {};
            const total = gates.total || {};
            const reserveW = Number(raw.pvReserveW || pv.reserveW || 0);
            const importForGridHeadroom = Math.max(0, Number(raw.gridImportW || 0) - Number(raw.flexUsedW || 0));
            const ts = build({
                ts: budgetSnapshot.ts || Date.now(),
                pvSurplusW: Number(pv.rawW || 0),
                storageReserveW: Number.isFinite(reserveW) ? reserveW : 0,
                alreadyReservedW: 0,
                // Die aktuelle JS-Logik zieht pvReserveW immer vom PV-Budget ab. Für den
                // Vergleich erzwingen wir daher eine aktive Reserve, ohne Runtime-Verhalten
                // zu ändern. Spätere produktive TS-Logik darf hier fachlich verfeinert werden.
                storageSocPct: 0,
                storageReserveSocPct: 100,
                allowStorageDischarge: false,
                gridImportW: importForGridHeadroom,
                gridImportLimitW: Number(grid.importLimitW || 0),
                // Shadow-Abgleich: Die bestehende JS-Runtime begrenzt das Gesamtbudget
                // teilweise über zusätzliche High-Level-Caps. Dieser Deckel wird nur für
                // den Vergleich an den TS-Spiegel übergeben, damit nicht unterschiedliche
                // Budgetbegriffe fälschlich als Fehler angezeigt werden.
                totalBudgetCapW: total.effectiveW === null || total.effectiveW === undefined ? null : Number(total.effectiveW),
                allowGridImport: true,
                peakShavingActive: false,
                externalLimitActive: false,
            });
            const modernTypedRuntime = budgetSnapshot && budgetSnapshot.tsCoreRuntime && typeof budgetSnapshot.tsCoreRuntime === 'object'
                ? budgetSnapshot.tsCoreRuntime
                : null;
            const modernTypedRuntimeActive = !!(
                modernTypedRuntime
                && modernTypedRuntime.active === true
                && modernTypedRuntime.productive === true
                && modernTypedRuntime.fallback !== true
            );
            const mismatches = [
                compareShadowWatt('pv.rawW', pv.rawW, ts && ts.pv ? ts.pv.rawW : null),
                compareShadowWatt('pv.effectiveW', pv.effectiveW, ts && ts.pv ? ts.pv.effectiveW : null),
                // Der alte `core-budget`-Spiegel kennt weder den vollständigen signierten
                // NVP-Vertrag noch die bereits laufende geregelte Istlast. Diese beiden
                // Felder bleiben deshalb als Migrationsdiagnose sichtbar, dürfen aber die
                // Betriebslogs nicht im Minutentakt füllen. Der produktive Core-Runtime-v2-
                // Vergleich läuft bereits vorher über den vollständigen Snapshotvertrag.
                compareShadowWatt('grid.effectiveW', grid.headroomW, ts && ts.grid ? ts.grid.effectiveW : null),
                compareShadowWatt('total.effectiveW', total.effectiveW, ts && ts.total ? ts.total.effectiveW : null),
            ].filter(Boolean).map((m) => {
                if (m && m.field === 'grid.effectiveW' && modernTypedRuntimeActive) {
                    return { ...m, diagnosticOnly: true, severity: 'diagnostic', reason: 'grid-headroom-vs-ts-effective-budget · legacy-grid-shadow-superseded-by-core-runtime-v2' };
                }
                if (m && m.field === 'total.effectiveW' && modernTypedRuntimeActive) {
                    return { ...m, diagnosticOnly: true, severity: 'diagnostic', reason: 'legacy-total-shadow-superseded-by-core-runtime-v2' };
                }
                return { ...m, diagnosticOnly: false, severity: 'warn' };
            });
            const warningMismatches = mismatches.filter((m) => !(m && m.diagnosticOnly === true));
            const diagnosticOnlyMismatches = mismatches.filter((m) => m && m.diagnosticOnly === true);
            const result = {
                available: true,
                ok: warningMismatches.length === 0,
                exactMatch: mismatches.length === 0,
                source: modernTypedRuntimeActive ? 'legacy-ts-shadow-superseded' : 'ts-mirror-shadow',
                supersededByTypedCoreRuntime: modernTypedRuntimeActive,
                modernTypedRuntime: modernTypedRuntime || null,
                mismatches,
                warningMismatches,
                diagnosticOnlyMismatches,
                logSuppressed: warningMismatches.length === 0 && diagnosticOnlyMismatches.length > 0,
                js: {
                    pvRawW: roundW(pv.rawW),
                    pvEffectiveW: roundW(pv.effectiveW),
                    gridHeadroomW: grid.headroomW === null || grid.headroomW === undefined ? null : roundW(grid.headroomW),
                    totalEffectiveW: total.effectiveW === null || total.effectiveW === undefined ? null : roundW(total.effectiveW),
                },
                ts: {
                    pvRawW: ts && ts.pv ? roundW(ts.pv.rawW) : null,
                    pvEffectiveW: ts && ts.pv ? roundW(ts.pv.effectiveW) : null,
                    gridEffectiveW: ts && ts.grid ? roundW(ts.grid.effectiveW) : null,
                    totalEffectiveW: ts && ts.total ? roundW(ts.total.effectiveW) : null,
                },
                // 0.7.105: Der vollständige TS-Snapshot bleibt für die produktive Gate-
                // Übernahme verfügbar. Er wird nur genutzt, wenn der Shadow-Vergleich OK ist.
                tsSnapshot: ts || null,
            };
            if (warningMismatches.length > 0) {
                const signature = warningMismatches
                    .map((m) => String((m && m.field) || 'unknown'))
                    .sort()
                    .join('|');
                if (!this._coreTsShadowWarnedSignatures) this._coreTsShadowWarnedSignatures = new Set();
                if (!this._coreTsShadowWarnedSignatures.has(signature)) {
                    this._coreTsShadowWarnedSignatures.add(signature);
                    try {
                        this.adapter.log && this.adapter.log.warn && this.adapter.log.warn(`[core-limits-ts-shadow] Einmalige JS/TS-Diagnoseabweichung: ${warningMismatches.map(m => m.field).join(', ')}`);
                    } catch (_eLog) {}
                }
            }
            return result;
        } catch (e) {
            return { available: true, ok: false, source: 'ts-mirror-shadow', error: e && e.message ? e.message : String(e), mismatches: [] };
        }
    }


    /**
     * Code-Teil: _runCoreRestGatesTsShadowComparison
     *
     * Zweck:
     * Vergleicht Forecast-, Tarif-, Peak-/Netz- und §14a-Gates aus der bestehenden
     * JavaScript-Runtime mit dem neuen TypeScript-Helfer.
     *
     * Zusammenhang:
     * Diese Gates beeinflussen EVCS-Budgets, Heizstabfreigaben, Peak-Shaving, §14a und
     * KI-Hinweise. Deshalb werden sie in 0.7.120 nur vorbereitet und als Shadow geprüft;
     * produktiv bleibt die bestehende JS-Runtime.
     *
     * Sicherheitsregel:
     * Der Vergleich schreibt keine Produktivwerte. Abweichungen werden nur in
     * `ems.budget.tsRestGatesJson` sichtbar gemacht.
     */
    _runCoreRestGatesTsShadowComparison(budgetSnapshot, coreSnapshot) {
        const mirror = requireCoreBudgetTsMirror();
        const build = mirror && typeof mirror.buildCoreRestGatesShadow === 'function' ? mirror.buildCoreRestGatesShadow : null;
        const now = Date.now();
        if (!build || !budgetSnapshot || typeof budgetSnapshot !== 'object') {
            return { source: 'ts-core-rest-gates-shadow', available: false, ok: false, reason: !build ? 'missing-ts-helper' : 'missing-js-budget-snapshot', mismatches: [], ts: now };
        }
        const compareValue = (mismatches, field, jsValue, tsValue, tolerance = 0) => {
            const numLike = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
            if (numLike(jsValue) || numLike(tsValue)) {
                const jsNum = numLike(jsValue) ? Number(jsValue) : null;
                const tsNum = numLike(tsValue) ? Number(tsValue) : null;
                if (jsNum === null || tsNum === null || Math.abs(jsNum - tsNum) > tolerance) mismatches.push({ field, js: jsNum, ts: tsNum, diff: (jsNum !== null && tsNum !== null) ? Math.round((tsNum - jsNum) * 1000) / 1000 : null, tolerance });
                return;
            }
            const jsText = String(jsValue === undefined || jsValue === null ? '' : jsValue);
            const tsText = String(tsValue === undefined || tsValue === null ? '' : tsValue);
            if (jsText !== tsText) mismatches.push({ field, js: jsText, ts: tsText, tolerance });
        };
        try {
            const js = {
                forecast: budgetSnapshot.gates && budgetSnapshot.gates.forecast ? budgetSnapshot.gates.forecast : {},
                tariff: budgetSnapshot.gates && budgetSnapshot.gates.tariff ? budgetSnapshot.gates.tariff : {},
                peak: coreSnapshot && coreSnapshot.peak ? coreSnapshot.peak : {},
                para14a: coreSnapshot && coreSnapshot.para14a ? coreSnapshot.para14a : {},
                evcsHighLevel: coreSnapshot && coreSnapshot.evcsHighLevel ? coreSnapshot.evcsHighLevel : {},
                controlledHighLevel: coreSnapshot && coreSnapshot.controlledHighLevel ? coreSnapshot.controlledHighLevel : {},
                grid: coreSnapshot && coreSnapshot.grid ? coreSnapshot.grid : {},
            };
            const tsResult = build({ ...js, ts: now });
            const ts = tsResult && tsResult.gates ? tsResult.gates : {};
            const mismatches = [];
            [
                ['forecast.valid', js.forecast.valid, ts.forecast && ts.forecast.valid, 0],
                ['forecast.usable', js.forecast.usable, ts.forecast && ts.forecast.usable, 0],
                ['forecast.nowW', js.forecast.nowW, ts.forecast && ts.forecast.nowW, 1],
                ['forecast.avgNext1hW', js.forecast.avgNext1hW, ts.forecast && ts.forecast.avgNext1hW, 1],
                ['forecast.status', js.forecast.status, ts.forecast && ts.forecast.status, 0],
                ['tariff.active', js.tariff.active, ts.tariff && ts.tariff.active, 0],
                ['tariff.negativeActive', js.tariff.negativeActive, ts.tariff && ts.tariff.negativeActive, 0],
                ['tariff.gridImportPreferred', js.tariff.gridImportPreferred, ts.tariff && ts.tariff.gridImportPreferred, 0],
                ['tariff.currentPriceEurKwh', js.tariff.currentPriceEurKwh, ts.tariff && ts.tariff.currentPriceEurKwh, 0.0001],
                ['tariff.status', js.tariff.status, ts.tariff && ts.tariff.status, 0],
                ['peak.active', js.peak.active, ts.peak && ts.peak.active, 0],
                ['peak.budgetW', js.peak.budgetW, ts.peak && ts.peak.budgetW, 1],
                ['para14a.active', js.para14a.active, ts.para14a && ts.para14a.active, 0],
                ['para14a.evcsCapW', js.para14a.evcsCapW, ts.para14a && ts.para14a.evcsCapW, 1],
                ['para14a.totalCapW', js.para14a.totalCapW, ts.para14a && ts.para14a.totalCapW, 1],
                ['controlledHighLevel.capW', js.controlledHighLevel.capW, ts.controlledHighLevel && ts.controlledHighLevel.capW, 1],
                ['controlledHighLevel.binding', js.controlledHighLevel.binding, ts.controlledHighLevel && ts.controlledHighLevel.binding, 0],
                ['evcsHighLevel.capW', js.evcsHighLevel.capW, ts.evcsHighLevel && ts.evcsHighLevel.capW, 1],
                ['evcsHighLevel.binding', js.evcsHighLevel.binding, ts.evcsHighLevel && ts.evcsHighLevel.binding, 0],
                ['grid.gridImportLimitW_effective', js.grid.gridImportLimitW_effective, ts.grid && ts.grid.gridImportLimitW_effective, 1],
                ['grid.gridImportLimitW_source', js.grid.gridImportLimitW_source, ts.grid && ts.grid.gridImportLimitW_source, 0],
            ].forEach(([field, jsValue, tsValue, tolerance]) => compareValue(mismatches, field, jsValue, tsValue, tolerance));
            return { source: 'ts-core-rest-gates-shadow', available: true, ok: mismatches.length === 0, productive: false, reason: mismatches.length ? 'ts-rest-gates-mismatch' : 'shadow-ok', comparedFields: 21, mismatchCount: mismatches.length, mismatches: mismatches.slice(0, 12), js, tsGates: ts, tsResult, ts: now };
        } catch (e) {
            return { source: 'ts-core-rest-gates-shadow', available: true, ok: false, productive: false, reason: 'ts-runtime-error', error: e && e.message ? e.message : String(e), mismatches: [], ts: now };
        }
    }

    /**
     * Code-Teil: _applyCoreRestGatesTsProductiveSnapshot
     *
     * Zweck:
     * Übernimmt Forecast-, Tarif-, Peak-/Netz- und §14a-Restgates produktiv aus dem
     * TypeScript-Spiegel, wenn der Shadow-Vergleich ohne Abweichungen war.
     *
     * Zusammenhang:
     * Diese Restgates beeinflussen EVCS-High-Level-Caps, Heizstabfreigaben,
     * Speicherreserve, Peak-Shaving und KI-Hinweise. Deshalb bleibt bei jedem Fehler
     * oder Mismatch die bisherige JavaScript-Runtime als Fallback aktiv.
     *
     * Sicherheitsregel:
     * Produktive TS-Übernahme nur bei `restShadow.ok === true`. Ansonsten werden die
     * bisherigen JS-Snapshots unverändert zurückgegeben und `tsRestGatesProductive`
     * dokumentiert den Fallback-Grund.
     */
    _applyCoreRestGatesTsProductiveSnapshot(jsBudgetSnapshot, coreSnapshot, restShadow) {
        const now = Date.now();
        const fallbackBudget = jsBudgetSnapshot && typeof jsBudgetSnapshot === 'object' ? jsBudgetSnapshot : {};
        const fallbackCore = coreSnapshot && typeof coreSnapshot === 'object' ? coreSnapshot : {};
        const fallback = (reason, extra = {}) => {
            const status = {
                ts: now,
                active: false,
                productive: false,
                source: 'js-runtime',
                fallback: true,
                reason,
                ...extra,
            };
            try { fallbackBudget.tsRestGatesProductive = status; } catch (_e) {}
            return { budgetSnapshot: fallbackBudget, coreSnapshot: fallbackCore, status };
        };

        if (!fallbackBudget || !fallbackBudget.gates || typeof fallbackBudget.gates !== 'object') return fallback('missing-js-budget-snapshot');
        if (!restShadow || typeof restShadow !== 'object') return fallback('missing-ts-rest-shadow');
        if (restShadow.available !== true) return fallback('ts-rest-helper-unavailable', { shadow: restShadow });
        if (restShadow.ok !== true) return fallback('ts-rest-gates-mismatch', { mismatches: restShadow.mismatches || [] });

        const tsGates = restShadow.tsGates || (restShadow.tsResult && restShadow.tsResult.gates) || null;
        if (!tsGates || typeof tsGates !== 'object') return fallback('missing-ts-rest-gates', { shadow: restShadow });
        const required = ['forecast', 'tariff', 'peak', 'para14a', 'evcsHighLevel', 'controlledHighLevel', 'grid'];
        for (const key of required) {
            if (!tsGates[key] || typeof tsGates[key] !== 'object') return fallback('missing-ts-rest-gate-' + key, { shadow: restShadow });
        }

        const nextCore = {
            ...fallbackCore,
            grid: { ...((fallbackCore && fallbackCore.grid) || {}), ...(tsGates.grid || {}), source: 'ts-core-rest-gates' },
            peak: { ...((fallbackCore && fallbackCore.peak) || {}), ...(tsGates.peak || {}), source: 'ts-core-rest-gates' },
            tariff: { ...((fallbackCore && fallbackCore.tariff) || {}), ...(tsGates.tariff || {}), source: 'ts-core-rest-gates' },
            para14a: { ...((fallbackCore && fallbackCore.para14a) || {}), ...(tsGates.para14a || {}), source: 'ts-core-rest-gates' },
            evcsHighLevel: { ...((fallbackCore && fallbackCore.evcsHighLevel) || {}), ...(tsGates.evcsHighLevel || {}), source: 'ts-core-rest-gates' },
            controlledHighLevel: { ...((fallbackCore && fallbackCore.controlledHighLevel) || {}), ...(tsGates.controlledHighLevel || {}), source: 'ts-core-rest-gates' },
        };
        const nextBudget = {
            ...fallbackBudget,
            gates: {
                ...(fallbackBudget.gates || {}),
                forecast: { ...(((fallbackBudget.gates || {}).forecast) || {}), ...(tsGates.forecast || {}), source: 'ts-core-rest-gates' },
                tariff: { ...(((fallbackBudget.gates || {}).tariff) || {}), ...(tsGates.tariff || {}), source: 'ts-core-rest-gates' },
            },
            tsRestGatesShadow: restShadow,
        };
        const status = {
            ts: now,
            active: true,
            productive: true,
            source: 'ts-core-rest-gates',
            fallback: false,
            reason: 'shadow-ok',
            fields: [
                'forecast',
                'tariff',
                'peak',
                'grid',
                'para14a',
                'evcsHighLevel',
                'controlledHighLevel',
            ],
            tsGates,
            shadow: restShadow,
        };
        nextBudget.tsRestGatesProductive = status;
        return { budgetSnapshot: nextBudget, coreSnapshot: nextCore, status };
    }

    /**
     * Code-Teil: _applyCoreBudgetTsProductiveSnapshot
     *
     * Zweck:
     * Übernimmt die von TypeScript berechneten Core-Budget-Gates produktiv, aber nur
     * wenn der vorherige JS/TS-Shadow-Vergleich ohne Abweichungen war.
     *
     * Zusammenhang:
     * Core-Limits sind kritisch für Heizstab, EVCS, Peak-Shaving, KI und Speicherreserve.
     * Darum wird in 0.7.105 nicht die ganze `core-limits.js`-Datei ersetzt, sondern zuerst
     * der bereits geprüfte Gate-Teil: PV-Budget, Grid-Headroom und Gesamtbudget.
     *
     * Sicherheitsregel:
     * - Wenn der TS-Spiegel fehlt, Abweichungen meldet oder unvollständige Daten liefert,
     *   bleibt die bestehende JS-Budgetlogik produktiv.
     * - JS bleibt Fallback/Notbremse.
     * - Forecast-, Tarif-, Consumer- und Raw-Felder bleiben aus der bestehenden JS-Runtime.
     */
    _applyCoreBudgetTsProductiveSnapshot(jsSnapshot, coreTsShadow) {
        const fallback = jsSnapshot && typeof jsSnapshot === 'object' ? jsSnapshot : {};
        const fallbackStatus = (reason, extra = {}) => {
            const status = {
                ts: Date.now(),
                active: false,
                source: 'js-runtime',
                fallback: true,
                reason,
                ...extra,
            };
            try { fallback.tsProductive = status; } catch (_e) {}
            return fallback;
        };

        if (!fallback || !fallback.gates || typeof fallback.gates !== 'object') return fallbackStatus('missing-js-snapshot');
        const modernTypedRuntime = fallback.tsCoreRuntime && typeof fallback.tsCoreRuntime === 'object'
            ? fallback.tsCoreRuntime
            : null;
        if (modernTypedRuntime && modernTypedRuntime.active === true && modernTypedRuntime.productive === true && modernTypedRuntime.fallback !== true) {
            fallback.tsProductive = {
                ts: Date.now(),
                active: false,
                source: 'ts-core-runtime',
                fallback: false,
                superseded: true,
                reason: 'typed-core-runtime-v2-authoritative',
                contractVersion: String(modernTypedRuntime.contractVersion || 'core-runtime-v2'),
            };
            return fallback;
        }
        if (!coreTsShadow || typeof coreTsShadow !== 'object') return fallbackStatus('missing-ts-shadow');
        if (coreTsShadow.available !== true) return fallbackStatus('ts-mirror-unavailable', { shadow: coreTsShadow });
        if (coreTsShadow.ok !== true) return fallbackStatus('shadow-mismatch', { mismatches: coreTsShadow.mismatches || [] });

        const ts = coreTsShadow.tsSnapshot || {};
        const tsPv = ts && ts.pv ? ts.pv : null;
        const tsGrid = ts && ts.grid ? ts.grid : null;
        const tsTotal = ts && ts.total ? ts.total : null;
        if (!tsPv || !tsGrid || !tsTotal) return fallbackStatus('missing-ts-gates', { shadow: coreTsShadow });

        const next = {
            ...fallback,
            mode: 'central-background-ts-core',
            gates: {
                ...(fallback.gates || {}),
                pv: {
                    ...((fallback.gates && fallback.gates.pv) || {}),
                    rawW: roundW(tsPv.rawW),
                    effectiveW: roundW(tsPv.effectiveW),
                    reason: tsPv.reason || ((fallback.gates && fallback.gates.pv && fallback.gates.pv.reason) || ''),
                    source: 'ts-core-budget',
                },
                grid: {
                    ...((fallback.gates && fallback.gates.grid) || {}),
                    headroomW: roundW(tsGrid.effectiveW),
                    reason: tsGrid.reason || ((fallback.gates && fallback.gates.grid && fallback.gates.grid.reason) || ''),
                    source: 'ts-core-budget',
                },
                total: {
                    ...((fallback.gates && fallback.gates.total) || {}),
                    effectiveW: roundW(tsTotal.effectiveW),
                    reason: tsTotal.reason || ((fallback.gates && fallback.gates.total && fallback.gates.total.reason) || ''),
                    source: 'ts-core-budget',
                },
            },
            tsShadow: coreTsShadow,
        };
        const status = {
            ts: Date.now(),
            active: true,
            source: 'ts-core-budget',
            fallback: false,
            reason: 'shadow-ok',
            fields: ['gates.pv.rawW', 'gates.pv.effectiveW', 'gates.grid.headroomW', 'gates.total.effectiveW'],
            js: coreTsShadow.js || null,
            tsValues: coreTsShadow.ts || null,
        };
        next.tsProductive = status;
        return next;
    }

    /**
     * Ablauf und Zusammenhang: Aktualisiert aus NVP-Messung, Anschlussgrenze und Reservierungen den gemeinsamen Leistungsrahmen. Verbraucher erhalten daraus denselben Netzbezugsspielraum; Export ist bei der signierten Messbasis vom Bezug zu unterscheiden.
     */
    async tick() {
        if (!this._inited) {
            try { await this.init(); } catch { /* ignore */ }
        }

        const now = Date.now();
        const cfg = (this.adapter && this.adapter.config) ? this.adapter.config : {};
        const psCfg = (cfg && cfg.peakShaving && typeof cfg.peakShaving === 'object') ? cfg.peakShaving : {};

        // ------------------------------------------------------------
        // Grid connection / physical caps
        // ------------------------------------------------------------
        const gridConnectionLimitW_cfg = clamp(num(cfg?.installerConfig?.gridConnectionPower, 0), 0, 1e12, 0) || 0;
        const gridSafetyMarginW = clamp(num(psCfg?.safetyMarginW, 0), 0, 1e12, 0) || 0;
        const gridMaxPhaseA_cfg = clamp(num(psCfg?.maxPhaseA, 0), 0, 20000, 0) || 0;

        const gridConstraintsCapW = await readStateNumber(this.adapter, 'gridConstraints.control.maxImportW_final', null);
        const gridConstraintsPlanningCapW = await readStateNumber(this.adapter, 'gridConstraints.control.maxImportW_planning', null);
        const importPolicy = this.adapter && this.adapter._gridImportLimitPolicy && typeof this.adapter._gridImportLimitPolicy === 'object'
            ? this.adapter._gridImportLimitPolicy
            : {};

        let gridImportLimitW_physical = 0;
        {
            let base = (gridConnectionLimitW_cfg > 0) ? gridConnectionLimitW_cfg : 0;
            if (typeof gridConstraintsCapW === 'number' && Number.isFinite(gridConstraintsCapW) && gridConstraintsCapW > 0) {
                base = (base > 0) ? Math.min(base, gridConstraintsCapW) : gridConstraintsCapW;
            }
            if (base > 0) gridImportLimitW_physical = Math.max(0, base - gridSafetyMarginW);
        }

        const peakEnabledCfg = isPeakShavingRuntimeEnabled(cfg);
        const peakShavingLimitW_raw = await readStateNumber(this.adapter, 'peakShaving.control.limitW', null);
        const gridImportLimitW_peakShaving = (peakEnabledCfg && typeof peakShavingLimitW_raw === 'number' && Number.isFinite(peakShavingLimitW_raw) && peakShavingLimitW_raw > 0)
            ? peakShavingLimitW_raw
            : 0;

        let gridImportLimitW_effective = 0;
        let gridImportLimitW_source = '';
        {
            const cands = [];
            if (typeof gridImportLimitW_peakShaving === 'number' && gridImportLimitW_peakShaving > 0) cands.push({ k: 'peak', w: gridImportLimitW_peakShaving });
            if (typeof gridImportLimitW_physical === 'number' && gridImportLimitW_physical > 0) cands.push({ k: 'physical', w: gridImportLimitW_physical });

            if (cands.length) {
                let minW = Number.POSITIVE_INFINITY;
                for (const c of cands) {
                    const w = Number(c.w);
                    if (Number.isFinite(w)) minW = Math.min(minW, w);
                }
                gridImportLimitW_effective = Number.isFinite(minW) ? Math.max(0, minW) : 0;

                const eps = 0.001;
                gridImportLimitW_source = cands
                    .filter(c => Number.isFinite(Number(c.w)) && Math.abs(Number(c.w) - Number(gridImportLimitW_effective)) <= eps)
                    .map(c => c.k)
                    .join('+');
            }
        }

        // Der Master begrenzt den gesamten Hausbezug. Auch 0 W ist verbindlich;
        // Ablauf wird monoton lokal geprüft und kann nicht durch Boost überstimmt werden.
        const meshLimit = this.adapter?._meshCoordinator?.currentLimits();
        if (meshLimit?.required) {
            gridImportLimitW_effective = Math.min(gridImportLimitW_effective, meshLimit.limits.importW);
            gridImportLimitW_source += '+mesh';
        }

        // Soft-Limit fuer vorausschauende Lastplanung. Die physische/effective
        // Grenze oben bleibt das Hard-Limit fuer SafetyEnvelope und Final-Writer.
        let gridImportLimitW_planning = gridImportLimitW_effective;
        if (typeof gridConstraintsPlanningCapW === 'number' && Number.isFinite(gridConstraintsPlanningCapW) && gridConstraintsPlanningCapW > 0) {
            gridImportLimitW_planning = gridImportLimitW_effective > 0
                ? Math.min(gridImportLimitW_effective, gridConstraintsPlanningCapW)
                : gridConstraintsPlanningCapW;
        }
        if (meshLimit?.required) gridImportLimitW_planning = Math.min(gridImportLimitW_planning, meshLimit.limits.importW);
        const gridImportHardLimitW = Math.max(0, Number(gridImportLimitW_effective) || 0);
        const gridImportSoftLimitW = Math.max(0, Number(gridImportLimitW_planning) || 0);
        const gridImportStage = String(importPolicy.stage || (gridImportSoftLimitW < gridImportHardLimitW - 1 ? 'normal' : 'hard-only'));
        const gridImportRequiredReductionW = Math.max(0, Number(importPolicy.requiredReductionW) || 0);

        // ------------------------------------------------------------
        // Peak / Tariff / §14a caps
        // ------------------------------------------------------------
        const peakActive = await readStateBool(this.adapter, 'peakShaving.control.active', false);
        const peakBudgetW_raw = await readStateNumber(this.adapter, 'peakShaving.dynamic.availableForControlledW', null);
        const peakBudgetW = (peakActive && typeof peakBudgetW_raw === 'number' && Number.isFinite(peakBudgetW_raw) && peakBudgetW_raw > 0)
            ? peakBudgetW_raw
            : null;

        const tariffBudgetW_raw = await readStateNumber(this.adapter, 'tarif.ladeparkLimitW', null);
        const tariffBudgetW = (typeof tariffBudgetW_raw === 'number' && Number.isFinite(tariffBudgetW_raw) && tariffBudgetW_raw > 0)
            ? tariffBudgetW_raw
            : null;

        const gridChargeAllowed = await readStateBool(this.adapter, 'tarif.netzLadenErlaubt', true);
        const dischargeAllowed = await readStateBool(this.adapter, 'tarif.entladenErlaubt', true);

        const tariffActive = await readStateBool(this.adapter, 'tarif.aktiv', false);
        const tariffState = await readStateString(this.adapter, 'tarif.state', '');
        const tariffCurrentPrice = await readStateNumber(this.adapter, 'tarif.preisAktuellEurProKwh', null);
        const tariffNegativeActive = await readStateBool(this.adapter, 'tarif.negativpreisAktiv', false);
        const tariffGridImportPreferred = await readStateBool(this.adapter, 'tarif.netzbezugBevorzugt', tariffNegativeActive);
        const tariffNegativeMinPrice = await readStateNumber(this.adapter, 'tarif.negativPreisMinEurProKwh', null);
        const tariffNextNegativeFrom = await readStateString(this.adapter, 'tarif.naechstesNegativVon', '');
        const tariffNextNegativeTo = await readStateString(this.adapter, 'tarif.naechstesNegativBis', '');
        const tariffStatus = await readStateString(this.adapter, 'tarif.negativpreisStatus', '');

        const p14a = (this.adapter && this.adapter._para14a && typeof this.adapter._para14a === 'object') ? this.adapter._para14a : null;
        const para14aActive = !!(p14a && p14a.active === true);
        const para14aMode = para14aActive ? String(p14a.mode || '') : '';
        const para14aEvcsCapW = para14aActive && Number.isFinite(Number(p14a && p14a.evcsTotalCapW))
            ? Math.max(0, Number(p14a.evcsTotalCapW))
            : null;
        const para14aTotalCapW = para14aActive && Number.isFinite(Number(p14a && p14a.totalCapW))
            ? Math.max(0, Number(p14a.totalCapW))
            : null;
        const para14aAppCapsW = para14aActive && p14a && p14a.appCapsW && typeof p14a.appCapsW === 'object'
            ? { ...p14a.appCapsW }
            : {};
        const para14aSignalFresh = !!(p14a && p14a.signalFresh === true);
        const para14aSignalStatus = String((p14a && p14a.signalStatus) || '');

        const evcsComponents = [];
        if (typeof peakBudgetW === 'number') evcsComponents.push({ k: 'peak', w: peakBudgetW });
        if (typeof tariffBudgetW === 'number') evcsComponents.push({ k: 'tariff', w: tariffBudgetW });
        if (typeof para14aEvcsCapW === 'number') evcsComponents.push({ k: '14a', w: para14aEvcsCapW });
        const controlledComponents = [];
        if (typeof peakBudgetW === 'number') controlledComponents.push({ k: 'peak', w: peakBudgetW });
        if (typeof para14aTotalCapW === 'number') controlledComponents.push({ k: '14a', w: para14aTotalCapW });

        const minComponent = (components) => {
            if (!components.length) return { capW: null, binding: '' };
            const finite = components.filter((component) => Number.isFinite(Number(component.w)));
            if (!finite.length) return { capW: null, binding: '' };
            const capW = Math.max(0, Math.min(...finite.map((component) => Number(component.w))));
            const binding = finite.filter((component) => Math.abs(Number(component.w) - capW) <= 0.001).map((component) => component.k).join('+');
            return { capW, binding };
        };
        const evcsHighLevel = minComponent(evcsComponents);
        const controlledHighLevel = minComponent(controlledComponents);

        let snapshot = {
            ts: now,
            grid: {
                gridConnectionLimitW_cfg,
                gridSafetyMarginW,
                gridConstraintsCapW: (typeof gridConstraintsCapW === 'number') ? gridConstraintsCapW : null,
                gridConstraintsPlanningCapW: (typeof gridConstraintsPlanningCapW === 'number') ? gridConstraintsPlanningCapW : null,
                gridImportLimitW_physical,
                gridImportLimitW_peakShaving,
                gridImportLimitW_effective,
                gridImportLimitW_planning,
                gridImportSoftLimitW,
                gridImportHardLimitW,
                gridImportStage,
                gridImportRequiredReductionW,
                gridImportLimitW_source,
                gridMaxPhaseA_cfg,
            },
            peak: {
                active: !!peakActive,
                budgetW: (typeof peakBudgetW === 'number') ? peakBudgetW : null,
            },
            tariff: {
                budgetW: (typeof tariffBudgetW === 'number') ? tariffBudgetW : null,
                gridChargeAllowed: !!gridChargeAllowed,
                dischargeAllowed: !!dischargeAllowed,
                active: !!tariffActive,
                state: tariffState || '',
                currentPriceEurKwh: isFiniteNumber(tariffCurrentPrice) ? Number(tariffCurrentPrice) : null,
                negativeActive: !!tariffNegativeActive,
                gridImportPreferred: !!tariffGridImportPreferred,
                storageGridChargeAllowed: !!(tariffGridImportPreferred && gridChargeAllowed),
                evcsGridChargeAllowed: !!(tariffGridImportPreferred && gridChargeAllowed),
                pvCurtailRecommended: !!tariffGridImportPreferred,
                negativeMinPriceEurKwh: isFiniteNumber(tariffNegativeMinPrice) ? Number(tariffNegativeMinPrice) : null,
                nextNegativeFrom: tariffNextNegativeFrom || '',
                nextNegativeTo: tariffNextNegativeTo || '',
                status: tariffStatus || (tariffGridImportPreferred ? 'active_grid_import_preferred' : (tariffNegativeActive ? 'negative_detected' : 'inactive')),
            },
            para14a: {
                active: para14aActive,
                mode: para14aMode,
                evcsCapW: para14aEvcsCapW,
                totalCapW: para14aTotalCapW,
                appCapsW: para14aAppCapsW,
                signalFresh: para14aSignalFresh,
                signalStatus: para14aSignalStatus,
                constraintOnly: !!(p14a && p14a.constraintOnly === true),
            },
            evcsHighLevel,
            controlledHighLevel,
        };

        let budgetSnapshot = this._makeBudgetSnapshot(now, snapshot);
        const coreRestGatesTsShadow = this._runCoreRestGatesTsShadowComparison(budgetSnapshot, snapshot);
        if (budgetSnapshot && typeof budgetSnapshot === 'object') budgetSnapshot.tsRestGatesShadow = coreRestGatesTsShadow;
        try { this._coreRestGatesTsShadowLast = coreRestGatesTsShadow; } catch (_eRestShadow) {}

        // 0.7.121: Forecast-/Tarif-/Peak-/§14a-Restgates dürfen produktiv aus TS
        // übernommen werden, wenn der Shadow-Vergleich sauber ist. Danach wird der
        // Budget-Snapshot neu aufgebaut, damit Grid-/EVCS-High-Level-Caps auch in
        // remainingTotalW und Verbraucherreservierungen wirken.
        let coreRestGatesProductive = this._applyCoreRestGatesTsProductiveSnapshot(budgetSnapshot, snapshot, coreRestGatesTsShadow);
        if (coreRestGatesProductive && coreRestGatesProductive.status && coreRestGatesProductive.status.active) {
            snapshot = coreRestGatesProductive.coreSnapshot || snapshot;
            budgetSnapshot = this._makeBudgetSnapshot(now, snapshot);
            coreRestGatesProductive = this._applyCoreRestGatesTsProductiveSnapshot(budgetSnapshot, snapshot, coreRestGatesTsShadow);
            budgetSnapshot = (coreRestGatesProductive && coreRestGatesProductive.budgetSnapshot) || budgetSnapshot;
            snapshot = (coreRestGatesProductive && coreRestGatesProductive.coreSnapshot) || snapshot;
        } else if (coreRestGatesProductive && coreRestGatesProductive.budgetSnapshot) {
            budgetSnapshot = coreRestGatesProductive.budgetSnapshot;
        }
        if (budgetSnapshot && typeof budgetSnapshot === 'object') {
            budgetSnapshot.tsRestGatesShadow = coreRestGatesTsShadow;
            budgetSnapshot.tsRestGatesProductive = (coreRestGatesProductive && coreRestGatesProductive.status) || budgetSnapshot.tsRestGatesProductive || null;
        }
        try { this._coreRestGatesTsProductiveLast = (coreRestGatesProductive && coreRestGatesProductive.status) || null; } catch (_eRestProd) {}

        let coreTsShadow = this._runCoreBudgetTsShadowComparison(budgetSnapshot);
        if (budgetSnapshot && typeof budgetSnapshot === 'object') budgetSnapshot.tsShadow = coreTsShadow;
        // 0.7.105: Der geprüfte TS-Core-Budget-Spiegel darf die zentralen Budget-Gates
        // produktiv setzen. Bei jeder Abweichung bleibt die alte JS-Runtime Fallback.
        budgetSnapshot = this._applyCoreBudgetTsProductiveSnapshot(budgetSnapshot, coreTsShadow);
        const budgetRuntime = makeBudgetRuntime(this.adapter, budgetSnapshot);
        try { if (budgetRuntime) budgetRuntime.tsRestGatesLast = coreRestGatesTsShadow; } catch (_eRestAssign) {}
        try { if (budgetRuntime) budgetRuntime.tsRestGatesProductiveLast = (budgetSnapshot && budgetSnapshot.tsRestGatesProductive) || null; } catch (_eRestProdAssign) {}

        const effectiveCoreGrid = (snapshot && snapshot.grid && typeof snapshot.grid === 'object') ? snapshot.grid : {};
        const effectiveCorePeak = (snapshot && snapshot.peak && typeof snapshot.peak === 'object') ? snapshot.peak : {};
        const effectiveCoreTariff = (snapshot && snapshot.tariff && typeof snapshot.tariff === 'object') ? snapshot.tariff : {};
        const effectiveCorePara14a = (snapshot && snapshot.para14a && typeof snapshot.para14a === 'object') ? snapshot.para14a : {};
        const effectiveCoreEvcsHighLevel = (snapshot && snapshot.evcsHighLevel && typeof snapshot.evcsHighLevel === 'object') ? snapshot.evcsHighLevel : {};

        let safetyEnvelope = null;
        try {
            this.adapter._emsCaps = snapshot;
            this.adapter._emsBudget = budgetRuntime;
            this.adapter._emsForecastGate = budgetSnapshot && budgetSnapshot.gates ? budgetSnapshot.gates.forecast : null;
            this.adapter._emsTariffGate = budgetSnapshot && budgetSnapshot.gates ? budgetSnapshot.gates.tariff : null;
            safetyEnvelope = liveSafetyEnvelope(this.adapter, this.dp, {
                now,
                generation: this.adapter && this.adapter._emsSafetyCycle && this.adapter._emsSafetyCycle.generation,
            });
        } catch (error) {
            safetyEnvelope = invalidateSafetyEnvelope(this.adapter, 'core-safety-envelope-build-failed', {
                now,
                generation: this.adapter && this.adapter._nwActiveEmsCycleId,
                emergencyStop: true,
            });
            try { this.adapter.log.warn(`[SafetyEnvelope] Aufbau fehlgeschlagen: ${error && error.message ? error.message : error}`); } catch (_logError) {}
        }

        // Ein gemeinsamer Messzyklus für alle nachfolgenden Verbraucher.
        // Die Instanz schreibt keine Aktoren; jeder Writer prüft seine Grenzen erneut.
        const zeroExportStatus = updateZeroExportProbe(this.adapter, collectZeroExportSample(this.adapter, this.dp, budgetRuntime, now));
        for (const [field, value] of Object.entries(zeroExportStatus)) {
            await this.adapter.setStateAsync(`ems.zeroExportPv.${field}`, value, true);
            if (typeof this.adapter.updateValue === 'function') this.adapter.updateValue(`ems.zeroExportPv.${field}`, value, now);
        }
        await this.adapter.setStateAsync('ems.zeroExportPv.snapshotJson', JSON.stringify(zeroExportStatus), true);

        try {
            await this.adapter.setStateAsync('ems.core.lastUpdate', now, true);
            await this.adapter.setStateAsync('ems.core.gridConnectionLimitW_cfg', Math.round(Number(effectiveCoreGrid.gridConnectionLimitW_cfg || 0)), true);
            await this.adapter.setStateAsync('ems.core.gridSafetyMarginW', Math.round(Number(effectiveCoreGrid.gridSafetyMarginW || 0)), true);
            await this.adapter.setStateAsync('ems.core.gridConstraintsCapW', Math.round(Number(effectiveCoreGrid.gridConstraintsCapW || 0)), true);
            await this.adapter.setStateAsync('ems.core.gridConstraintsPlanningCapW', Math.round(Number(effectiveCoreGrid.gridConstraintsPlanningCapW || 0)), true);
            await this.adapter.setStateAsync('ems.core.gridImportLimitW_planning', Math.round(Number(effectiveCoreGrid.gridImportLimitW_planning || 0)), true);
            await this.adapter.setStateAsync('ems.core.gridImportSoftLimitW', Math.round(Number(effectiveCoreGrid.gridImportSoftLimitW || 0)), true);
            await this.adapter.setStateAsync('ems.core.gridImportHardLimitW', Math.round(Number(effectiveCoreGrid.gridImportHardLimitW || effectiveCoreGrid.gridImportLimitW_effective || 0)), true);
            await this.adapter.setStateAsync('ems.core.gridImportStage', String(effectiveCoreGrid.gridImportStage || ''), true);
            await this.adapter.setStateAsync('ems.core.gridImportRequiredReductionW', Math.round(Number(effectiveCoreGrid.gridImportRequiredReductionW || 0)), true);
            await this.adapter.setStateAsync('ems.core.gridImportLimitW_physical', Math.round(Number(effectiveCoreGrid.gridImportLimitW_physical || 0)), true);
            await this.adapter.setStateAsync('ems.core.gridImportLimitW_peakShaving', Math.round(Number(effectiveCoreGrid.gridImportLimitW_peakShaving || 0)), true);
            await this.adapter.setStateAsync('ems.core.gridImportLimitW_source', String(effectiveCoreGrid.gridImportLimitW_source || ''), true);
            await this.adapter.setStateAsync('ems.core.gridImportLimitW_effective', Math.round(Number(effectiveCoreGrid.gridImportLimitW_effective || 0)), true);
            await this.adapter.setStateAsync('ems.core.gridMaxPhaseA_cfg', Math.round(Number(effectiveCoreGrid.gridMaxPhaseA_cfg || 0)), true);

            await this.adapter.setStateAsync('ems.core.peakActive', !!effectiveCorePeak.active, true);
            await this.adapter.setStateAsync('ems.core.peakBudgetW', Math.round(Number(effectiveCorePeak.budgetW || 0)), true);

            await this.adapter.setStateAsync('ems.core.tariffBudgetW', Math.round(Number(effectiveCoreTariff.budgetW || 0)), true);
            await this.adapter.setStateAsync('ems.core.gridChargeAllowed', effectiveCoreTariff.gridChargeAllowed !== false, true);
            await this.adapter.setStateAsync('ems.core.dischargeAllowed', effectiveCoreTariff.dischargeAllowed !== false, true);

            await this.adapter.setStateAsync('ems.core.para14aActive', !!effectiveCorePara14a.active, true);
            await this.adapter.setStateAsync('ems.core.para14aMode', String(effectiveCorePara14a.mode || ''), true);
            await this.adapter.setStateAsync('ems.core.para14aEvcsCapW', Math.round(Number(effectiveCorePara14a.evcsCapW || 0)), true);

            await this.adapter.setStateAsync('ems.core.evcsHighLevelCapW', Math.round(Number(effectiveCoreEvcsHighLevel.capW || 0)), true);
            await this.adapter.setStateAsync('ems.core.evcsHighLevelBinding', String(effectiveCoreEvcsHighLevel.binding || ''), true);
            const effectiveControlled = snapshot && snapshot.controlledHighLevel && typeof snapshot.controlledHighLevel === 'object' ? snapshot.controlledHighLevel : {};
            const effectiveP14a = snapshot && snapshot.para14a && typeof snapshot.para14a === 'object' ? snapshot.para14a : {};
            const effectiveP14aApps = effectiveP14a.appCapsW && typeof effectiveP14a.appCapsW === 'object' ? effectiveP14a.appCapsW : {};
            await this.adapter.setStateAsync('ems.core.para14aTotalCapW', Math.round(Number(effectiveP14a.totalCapW || 0)), true);
            await this.adapter.setStateAsync('ems.core.para14aSignalFresh', effectiveP14a.signalFresh === true, true);
            await this.adapter.setStateAsync('ems.core.para14aSignalStatus', String(effectiveP14a.signalStatus || ''), true);
            await this.adapter.setStateAsync('ems.core.para14aStorageCapW', Math.round(Number(effectiveP14aApps.storage || 0)), true);
            await this.adapter.setStateAsync('ems.core.para14aThermalCapW', Math.round(Number(effectiveP14aApps.thermal || 0)), true);
            await this.adapter.setStateAsync('ems.core.para14aHeatingRodCapW', Math.round(Number(effectiveP14aApps.heatingRod || 0)), true);
            await this.adapter.setStateAsync('ems.core.controlledHighLevelCapW', Math.round(Number(effectiveControlled.capW || 0)), true);
            await this.adapter.setStateAsync('ems.core.controlledHighLevelBinding', String(effectiveControlled.binding || ''), true);
            await this.adapter.setStateAsync('ems.core.snapshot', JSON.stringify(snapshot), true);

            const safety = safetyEnvelope || this.adapter._emsSafetyEnvelope || {};
            await this.adapter.setStateAsync('ems.safety.lastUpdate', Math.round(Number(safety.timestamp || safety.ts || now)), true);
            await this.adapter.setStateAsync('ems.safety.generation', Math.max(0, Math.round(Number(safety.generation) || 0)), true);
            await this.adapter.setStateAsync('ems.safety.valid', safety.valid === true, true);
            await this.adapter.setStateAsync('ems.safety.commissioned', safety.commissioned === true, true);
            await this.adapter.setStateAsync('ems.safety.forceZero', safety.forceZero === true, true);
            await this.adapter.setStateAsync('ems.safety.emergencyStop', safety.emergencyStop === true, true);
            await this.adapter.setStateAsync('ems.safety.reason', String(safety.invalidReason || safety.reason || ''), true);
            await this.adapter.setStateAsync('ems.safety.gridConnectionPowerW', Math.round(Number(safety.grid && safety.grid.connectionPowerW || 0)), true);
            await this.adapter.setStateAsync('ems.safety.gridImportLimitW', Math.round(Number(safety.grid && safety.grid.maxImportW || 0)), true);
            await this.adapter.setStateAsync('ems.safety.gridImportW', Math.round(Math.max(0, Number(safety.grid && safety.grid.nvpW || 0))), true);
            await this.adapter.setStateAsync('ems.safety.gridHeadroomW', Math.round(Number(safety.grid && safety.grid.availableHeadroomW || 0)), true);
            await this.adapter.setStateAsync('ems.safety.phaseComplete', safety.phase ? safety.phase.valid === true : true, true);
            await this.adapter.setStateAsync('ems.safety.para14aReady', safety.para14a && safety.para14a.ready === true, true);
            await this.adapter.setStateAsync('ems.safety.evcsCapW', Math.round(Number(safety.caps && safety.caps.evcsW || 0)), true);
            await this.adapter.setStateAsync('ems.safety.snapshot', JSON.stringify(safety), true);

            const b = budgetSnapshot;
            const typedBudgetPublished = await this._publishCoreRuntimeBudgetPlan(
                now,
                b,
                budgetRuntime,
                coreTsShadow,
                coreRestGatesTsShadow,
            );
            if (!typedBudgetPublished) {
            const coreRuntimeStatus = (b && b.tsCoreRuntime && typeof b.tsCoreRuntime === 'object')
                ? b.tsCoreRuntime
                : ((this._coreRuntimeTsLast && typeof this._coreRuntimeTsLast === 'object') ? this._coreRuntimeTsLast : {});
            const sourceParts = [];
            if (coreRuntimeStatus.active === true) sourceParts.push('ts-core-runtime');
            if (b.tsProductive && b.tsProductive.active) sourceParts.push('ts-core-budget');
            if (b.tsRestGatesProductive && b.tsRestGatesProductive.active) sourceParts.push('rest-gates');
            if (!sourceParts.length) sourceParts.push('js-runtime');
            await this.adapter.setStateAsync('ems.budget.lastUpdate', now, true);
            await this.adapter.setStateAsync('ems.budget.active', true, true);
            await this.adapter.setStateAsync('ems.budget.mode', b.mode || 'central-background', true);
            await this.adapter.setStateAsync('ems.budget.source', sourceParts.join('+'), true);
            await this.adapter.setStateAsync('ems.budget.tsCoreRuntimeMode', String(coreRuntimeStatus.mode || 'legacy-js-fallback'), true);
            await this.adapter.setStateAsync('ems.budget.tsCoreRuntimeFallback', coreRuntimeStatus.fallback === true, true);
            await this.adapter.setStateAsync('ems.budget.tsCoreRuntimeMismatchCount', Math.max(0, Math.round(Number(coreRuntimeStatus.mismatchCount) || 0)), true);
            await this.adapter.setStateAsync('ems.budget.tsCoreRuntimeJson', JSON.stringify(coreRuntimeStatus || {}), true);
            const phase3Status = (budgetRuntime && budgetRuntime.phase3 && typeof budgetRuntime.phase3 === 'object')
                ? budgetRuntime.phase3
                : { active: false, fallback: true, reason: 'legacy-js-publication', revision: 0 };
            await this.adapter.setStateAsync('ems.budget.phase3RuntimeMode', phase3Status.active === true ? 'typed-core-runtime-v3' : 'legacy-js-fallback', true);
            await this.adapter.setStateAsync('ems.budget.phase3RuntimeFallback', phase3Status.fallback !== false, true);
            await this.adapter.setStateAsync('ems.budget.phase3RuntimeRevision', Math.max(0, Math.round(Number(phase3Status.revision) || 0)), true);
            await this.adapter.setStateAsync('ems.budget.phase3RuntimeReason', String(phase3Status.reason || 'legacy-js-publication'), true);
            await this.adapter.setStateAsync('ems.budget.totalBudgetW', b.gates.total.effectiveW === null ? 0 : roundW(b.gates.total.effectiveW), true);
            await this.adapter.setStateAsync('ems.budget.remainingTotalW', b.gates.total.effectiveW === null ? 0 : roundW(b.gates.total.effectiveW), true);
            await this.adapter.setStateAsync('ems.budget.pvBudgetRawW', roundW(b.gates.pv.rawW), true);
            await this.adapter.setStateAsync('ems.budget.pvBudgetW', roundW(b.gates.pv.effectiveW), true);
            await this.adapter.setStateAsync('ems.budget.remainingPvW', roundW(b.gates.pv.effectiveW), true);
            const pvAllocation = (b.gates && b.gates.pvAllocation && typeof b.gates.pvAllocation === 'object')
                ? b.gates.pvAllocation
                : {};
            await this.adapter.setStateAsync('ems.budget.pvAllocationEnabled', pvAllocation.allocationEnabled !== false, true);
            await this.adapter.setStateAsync('ems.budget.pvAllocationMode', String(pvAllocation.mode || 'both'), true);
            await this.adapter.setStateAsync('ems.budget.pvAllocationEvcsSharePct', roundW(pvAllocation.evcsSharePct), true);
            await this.adapter.setStateAsync('ems.budget.pvAllocationEvcsCapW', roundW(pvAllocation.evcsCapW), true);
            await this.adapter.setStateAsync('ems.budget.pvAllocationStorageGuaranteedW', roundW(pvAllocation.storageGuaranteedW), true);
            await this.adapter.setStateAsync('ems.budget.pvAllocationStorageEligible', pvAllocation.storageEligible === true, true);
            await this.adapter.setStateAsync(
                'ems.budget.pvAllocationStorageMaxChargeW',
                pvAllocation.storageMaxChargeW === null || pvAllocation.storageMaxChargeW === undefined
                    ? 0
                    : roundW(pvAllocation.storageMaxChargeW),
                true,
            );
            await this.adapter.setStateAsync('ems.budget.pvAllocationReason', String(pvAllocation.reason || ''), true);
            await this.adapter.setStateAsync('ems.budget.gridW', roundW(b.raw.gridW), true);
            await this.adapter.setStateAsync('ems.budget.gridExportW', roundW(b.raw.gridExportW), true);
            await this.adapter.setStateAsync('ems.budget.gridImportW', roundW(b.raw.gridImportW), true);
            await this.adapter.setStateAsync('ems.budget.storageChargeW', roundW(b.raw.storageChargeW), true);
            await this.adapter.setStateAsync('ems.budget.storageDischargeW', roundW(b.raw.storageDischargeW), true);
            await this.adapter.setStateAsync('ems.budget.pvPowerW', roundW(b.raw.pvPowerW), true);
            await this.adapter.setStateAsync('ems.budget.pvBudgetFlowRawW', roundW(b.raw.pvBudgetFlowRawW), true);
            await this.adapter.setStateAsync('ems.budget.pvBudgetPhysicalCapW', roundW(b.raw.pvBudgetPhysicalCapW), true);
            await this.adapter.setStateAsync('ems.budget.pvBudgetPhysicalSource', String(b.raw.pvBudgetPhysicalSource || ''), true);
            await this.adapter.setStateAsync('ems.budget.pvBudgetPhysicalHeld', b.raw.pvBudgetPhysicalHeld === true, true);
            await this.adapter.setStateAsync('ems.budget.pvBudgetDirectSource', String(b.raw.pvBudgetDirectSource || ''), true);
            await this.adapter.setStateAsync('ems.budget.pvBudgetDirectFresh', b.raw.pvBudgetDirectFresh === true, true);
            await this.adapter.setStateAsync('ems.budget.pvBudgetPvFlexUsedW', roundW(b.raw.pvFlexUsedW), true);
            await this.adapter.setStateAsync('ems.budget.pvBudgetClampedW', roundW(b.raw.pvBudgetClampedW), true);
            await this.adapter.setStateAsync('ems.budget.flexUsedW', roundW(b.raw.flexUsedW), true);
            await this.adapter.setStateAsync('ems.budget.binding', b.gates.total.binding || '', true);
            const consumersInit = Object.keys(b.consumers || {}).map(k => ({ key: k, ...(b.consumers[k] || {}) }));
            await this.adapter.setStateAsync('ems.budget.consumersJson', JSON.stringify(consumersInit), true);
            await this.adapter.setStateAsync('ems.budget.snapshot', JSON.stringify(b), true);
            await this.adapter.setStateAsync('ems.budget.tsShadowJson', JSON.stringify(b.tsShadow || coreTsShadow || {}), true);
            await this.adapter.setStateAsync('ems.budget.tsProductiveJson', JSON.stringify(b.tsProductive || {}), true);
            await this.adapter.setStateAsync('ems.budget.tsReservationJson', JSON.stringify((budgetRuntime && budgetRuntime.tsReservationLast) || {}), true);
            await this.adapter.setStateAsync('ems.budget.tsRestGatesJson', JSON.stringify(b.tsRestGatesProductive || b.tsRestGatesShadow || coreRestGatesTsShadow || {}), true);

            const fg = (b.gates && b.gates.forecast) ? b.gates.forecast : {};
            await this.adapter.setStateAsync('ems.budget.forecast.valid', !!fg.valid, true);
            await this.adapter.setStateAsync('ems.budget.forecast.usable', !!fg.usable, true);
            await this.adapter.setStateAsync('ems.budget.forecast.ageMs', fg.ageMs === null || fg.ageMs === undefined ? null : roundW(fg.ageMs), true);
            await this.adapter.setStateAsync('ems.budget.forecast.points', roundW(fg.points), true);
            await this.adapter.setStateAsync('ems.budget.forecast.confidencePct', roundW(fg.confidencePct), true);
            await this.adapter.setStateAsync('ems.budget.forecast.nowW', roundW(fg.nowW), true);
            await this.adapter.setStateAsync('ems.budget.forecast.avgNext1hW', roundW(fg.avgNext1hW), true);
            await this.adapter.setStateAsync('ems.budget.forecast.avgNext3hW', roundW(fg.avgNext3hW), true);
            await this.adapter.setStateAsync('ems.budget.forecast.peakNext6hW', roundW(fg.peakNext6hW), true);
            await this.adapter.setStateAsync('ems.budget.forecast.peakNext24hW', roundW(fg.peakNext24hW), true);
            await this.adapter.setStateAsync('ems.budget.forecast.kwhNext1h', Number.isFinite(Number(fg.kwhNext1h)) ? Number(fg.kwhNext1h) : 0, true);
            await this.adapter.setStateAsync('ems.budget.forecast.kwhNext3h', Number.isFinite(Number(fg.kwhNext3h)) ? Number(fg.kwhNext3h) : 0, true);
            await this.adapter.setStateAsync('ems.budget.forecast.kwhNext6h', Number.isFinite(Number(fg.kwhNext6h)) ? Number(fg.kwhNext6h) : 0, true);
            await this.adapter.setStateAsync('ems.budget.forecast.kwhNext12h', Number.isFinite(Number(fg.kwhNext12h)) ? Number(fg.kwhNext12h) : 0, true);
            await this.adapter.setStateAsync('ems.budget.forecast.kwhNext24h', Number.isFinite(Number(fg.kwhNext24h)) ? Number(fg.kwhNext24h) : 0, true);
            await this.adapter.setStateAsync('ems.budget.forecast.status', String(fg.status || ''), true);
            await this.adapter.setStateAsync('ems.budget.forecast.source', String(fg.source || ''), true);
            await this.adapter.setStateAsync('ems.budget.forecast.snapshotJson', JSON.stringify(fg), true);

            const tg = (b.gates && b.gates.tariff) ? b.gates.tariff : {};
            await this.adapter.setStateAsync('ems.budget.tariff.active', !!tg.active, true);
            await this.adapter.setStateAsync('ems.budget.tariff.state', String(tg.state || ''), true);
            await this.adapter.setStateAsync('ems.budget.tariff.currentPriceEurKwh', tg.currentPriceEurKwh === null || tg.currentPriceEurKwh === undefined ? null : Number(tg.currentPriceEurKwh), true);
            await this.adapter.setStateAsync('ems.budget.tariff.negativeActive', !!tg.negativeActive, true);
            await this.adapter.setStateAsync('ems.budget.tariff.gridImportPreferred', !!tg.gridImportPreferred, true);
            await this.adapter.setStateAsync('ems.budget.tariff.storageGridChargeAllowed', !!tg.storageGridChargeAllowed, true);
            await this.adapter.setStateAsync('ems.budget.tariff.evcsGridChargeAllowed', !!tg.evcsGridChargeAllowed, true);
            await this.adapter.setStateAsync('ems.budget.tariff.dischargeAllowed', tg.dischargeAllowed !== false, true);
            await this.adapter.setStateAsync('ems.budget.tariff.pvCurtailRecommended', !!tg.pvCurtailRecommended, true);
            await this.adapter.setStateAsync('ems.budget.tariff.negativeMinPriceEurKwh', tg.negativeMinPriceEurKwh === null || tg.negativeMinPriceEurKwh === undefined ? null : Number(tg.negativeMinPriceEurKwh), true);
            await this.adapter.setStateAsync('ems.budget.tariff.nextNegativeFrom', String(tg.nextNegativeFrom || ''), true);
            await this.adapter.setStateAsync('ems.budget.tariff.nextNegativeTo', String(tg.nextNegativeTo || ''), true);
            await this.adapter.setStateAsync('ems.budget.tariff.status', String(tg.status || ''), true);
            await this.adapter.setStateAsync('ems.budget.tariff.snapshotJson', JSON.stringify(tg), true);

            for (const key of ['evcs', 'storage', 'thermal', 'heatingRod']) {
                const c = b.consumers[key] || {};
                await this.adapter.setStateAsync(`ems.budget.consumers.${key}.usedW`, roundW(c.usedW), true);
                await this.adapter.setStateAsync(`ems.budget.consumers.${key}.pvUsedW`, roundW(c.pvUsedW), true);
                await this.adapter.setStateAsync(`ems.budget.consumers.${key}.actualW`, roundW(c.actualW), true);
                await this.adapter.setStateAsync(`ems.budget.consumers.${key}.priority`, roundW(c.priority), true);
                await this.adapter.setStateAsync(`ems.budget.consumers.${key}.mode`, String(c.mode || ''), true);
            }

            if (this.adapter && typeof this.adapter.updateValue === 'function') {
                this.adapter.updateValue('ems.budget.remainingPvW', roundW(b.gates.pv.effectiveW), now);
                this.adapter.updateValue('ems.budget.pvBudgetW', roundW(b.gates.pv.effectiveW), now);
                this.adapter.updateValue('ems.budget.pvBudgetRawW', roundW(b.gates.pv.rawW), now);
                this.adapter.updateValue('ems.budget.pvAllocationEnabled', pvAllocation.allocationEnabled !== false, now);
                this.adapter.updateValue('ems.budget.pvAllocationMode', String(pvAllocation.mode || 'both'), now);
                this.adapter.updateValue('ems.budget.pvAllocationEvcsSharePct', roundW(pvAllocation.evcsSharePct), now);
                this.adapter.updateValue('ems.budget.pvAllocationEvcsCapW', roundW(pvAllocation.evcsCapW), now);
                this.adapter.updateValue('ems.budget.pvAllocationStorageGuaranteedW', roundW(pvAllocation.storageGuaranteedW), now);
                this.adapter.updateValue('ems.budget.pvAllocationStorageEligible', pvAllocation.storageEligible === true, now);
                this.adapter.updateValue(
                    'ems.budget.pvAllocationStorageMaxChargeW',
                    pvAllocation.storageMaxChargeW === null || pvAllocation.storageMaxChargeW === undefined
                        ? 0
                        : roundW(pvAllocation.storageMaxChargeW),
                    now,
                );
                this.adapter.updateValue('ems.budget.pvAllocationReason', String(pvAllocation.reason || ''), now);
                this.adapter.updateValue('ems.budget.pvBudgetFlowRawW', roundW(b.raw.pvBudgetFlowRawW), now);
                this.adapter.updateValue('ems.budget.pvBudgetPhysicalCapW', roundW(b.raw.pvBudgetPhysicalCapW), now);
                this.adapter.updateValue('ems.budget.pvBudgetPhysicalSource', String(b.raw.pvBudgetPhysicalSource || ''), now);
                this.adapter.updateValue('ems.budget.pvBudgetPhysicalHeld', b.raw.pvBudgetPhysicalHeld === true, now);
                this.adapter.updateValue('ems.budget.pvBudgetDirectSource', String(b.raw.pvBudgetDirectSource || ''), now);
                this.adapter.updateValue('ems.budget.pvBudgetDirectFresh', b.raw.pvBudgetDirectFresh === true, now);
                this.adapter.updateValue('ems.budget.pvBudgetPvFlexUsedW', roundW(b.raw.pvFlexUsedW), now);
                this.adapter.updateValue('ems.budget.pvBudgetClampedW', roundW(b.raw.pvBudgetClampedW), now);
                this.adapter.updateValue('ems.budget.gridW', roundW(b.raw.gridW), now);
                this.adapter.updateValue('ems.budget.flexUsedW', roundW(b.raw.flexUsedW), now);
                this.adapter.updateValue('ems.budget.consumersJson', JSON.stringify(consumersInit), now);
                this.adapter.updateValue('ems.budget.tsReservationJson', JSON.stringify((budgetRuntime && budgetRuntime.tsReservationLast) || {}), now);
                const coreRuntimeStatus = (b && b.tsCoreRuntime && typeof b.tsCoreRuntime === 'object')
                    ? b.tsCoreRuntime
                    : ((this._coreRuntimeTsLast && typeof this._coreRuntimeTsLast === 'object') ? this._coreRuntimeTsLast : {});
                this.adapter.updateValue('ems.budget.tsCoreRuntimeMode', String(coreRuntimeStatus.mode || 'legacy-js-fallback'), now);
                this.adapter.updateValue('ems.budget.tsCoreRuntimeFallback', coreRuntimeStatus.fallback === true, now);
                this.adapter.updateValue('ems.budget.tsCoreRuntimeMismatchCount', Math.max(0, Math.round(Number(coreRuntimeStatus.mismatchCount) || 0)), now);
                this.adapter.updateValue('ems.budget.tsCoreRuntimeJson', JSON.stringify(coreRuntimeStatus || {}), now);
                const phase3Status = (budgetRuntime && budgetRuntime.phase3 && typeof budgetRuntime.phase3 === 'object')
                    ? budgetRuntime.phase3
                    : { active: false, fallback: true, reason: 'legacy-js-publication', revision: 0 };
                this.adapter.updateValue('ems.budget.phase3RuntimeMode', phase3Status.active === true ? 'typed-core-runtime-v3' : 'legacy-js-fallback', now);
                this.adapter.updateValue('ems.budget.phase3RuntimeFallback', phase3Status.fallback !== false, now);
                this.adapter.updateValue('ems.budget.phase3RuntimeRevision', Math.max(0, Math.round(Number(phase3Status.revision) || 0)), now);
                this.adapter.updateValue('ems.budget.phase3RuntimeReason', String(phase3Status.reason || 'legacy-js-publication'), now);
                this.adapter.updateValue('ems.budget.tsRestGatesJson', JSON.stringify(b.tsRestGatesProductive || b.tsRestGatesShadow || coreRestGatesTsShadow || {}), now);
                if (b.gates && b.gates.forecast) {
                    this.adapter.updateValue('ems.budget.forecast.nowW', roundW(b.gates.forecast.nowW), now);
                    this.adapter.updateValue('ems.budget.forecast.avgNext1hW', roundW(b.gates.forecast.avgNext1hW), now);
                    this.adapter.updateValue('ems.budget.forecast.kwhNext6h', Number.isFinite(Number(b.gates.forecast.kwhNext6h)) ? Number(b.gates.forecast.kwhNext6h) : 0, now);
                    this.adapter.updateValue('ems.budget.forecast.usable', !!b.gates.forecast.usable, now);
                }
                if (b.gates && b.gates.tariff) {
                    this.adapter.updateValue('ems.budget.tariff.negativeActive', !!b.gates.tariff.negativeActive, now);
                    this.adapter.updateValue('ems.budget.tariff.gridImportPreferred', !!b.gates.tariff.gridImportPreferred, now);
                    this.adapter.updateValue('ems.budget.tariff.currentPriceEurKwh', b.gates.tariff.currentPriceEurKwh, now);
                    this.adapter.updateValue('ems.budget.tariff.status', String(b.gates.tariff.status || ''), now);
                }
            }
            await this.adapter.setStateAsync('ems.budget.phase2PublicationMode', 'legacy-js-publication', true);
            if (this.adapter && typeof this.adapter.updateValue === 'function') {
                this.adapter.updateValue('ems.budget.phase2PublicationMode', 'legacy-js-publication', now);
            }
            }
        } catch {
            // ignore
        }
    }
}

module.exports = {
    CoreLimitsModule,
    makeBudgetRuntime,
    computeCentralBudgetGrant,
    normalizePvSurplusPriority,
    buildPvSurplusAllocation,
    computePvBudgetFlowRawW,
    resolvePvBudgetPhysicalCapW,
};
