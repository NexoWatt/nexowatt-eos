/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/services/storage-self-consumption-policy.ts
 * Quell-Hash: sha256:95d517d5041679b3d24603c33a71a1fbf57f112cd90d37dc682e6584b4f3d3e6
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/storage-self-consumption-policy.js.
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
 * Aufgabe: Bestimmt die SOC- und NVP-Zielvorgaben der aktiven Einzel-/Farm-Topologie und trennt Standalone-Einstellungen von aktivem MultiUse.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/storage-self-consumption-policy.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
function isRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}
function finiteOrNull(value) {
    if (value === null || value === undefined || value === '')
        return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}
function boolOrNull(value) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'number')
        return value !== 0;
    if (typeof value === 'string') {
        const text = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'ja', 'on', 'an'].includes(text))
            return true;
        if (['false', '0', 'no', 'nein', 'off', 'aus'].includes(text))
            return false;
    }
    return null;
}
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
function firstFinite(values, fallback) {
    for (const value of values) {
        const n = finiteOrNull(value);
        if (n !== null)
            return n;
    }
    return fallback;
}
function firstBoolean(values, fallback) {
    for (const value of values) {
        const b = boolOrNull(value);
        if (b !== null)
            return b;
    }
    return fallback;
}
function normalizeStorageTopology(value) {
    const topology = String(value || '').trim().toLowerCase();
    if (topology === 'farm')
        return 'farm';
    if (topology === 'none')
        return 'none';
    return 'single';
}
/**
 * Loest einen signierten NVP-Wert gegen genau eine Zielmitte mit kleiner
 * Messtoleranz auf.
 *
 * Beispiel: Zielmitte +50 W, Messtoleranz +/-20 W, NVP +250 W
 * -> ausserhalb der Toleranz, aktives Regelziel +50 W, Regelfehler +200 W.
 *
 * Die Toleranz verhindert ausschliesslich ein Nachregeln auf Messrauschen. Sie
 * bildet KEINE zweite Zielkante. Sobald der NVP ausserhalb der Toleranz liegt,
 * regeln Einzelspeicher und Speicherfarm immer direkt zur Zielmitte. Dadurch
 * bleibt kein kuenstlicher Restbezug bzw. Restexport an einer Hysteresegrenze
 * stehen.
 *
 * Diese Funktion ist die einzige fachliche Definition der NVP-Messtoleranz fuer
 * Einzelspeicher, Speicherfarm, MultiUse-Diagnose, Herstellerprofile und den
 * nachgelagerten NVP-Koordinator. Dadurch koennen keine unterschiedlichen
 * Totbaender oder Zieldefinitionen zwischen den Apps entstehen.
 */
function resolveNvpBandTarget(nvpValue, targetValue = 0, hysteresisValue = 0) {
    const nvpW = finiteOrNull(nvpValue);
    const targetNvpW = finiteOrNull(targetValue) ?? 0;
    const hysteresisW = Math.max(0, finiteOrNull(hysteresisValue) ?? 0);
    const lowerBandW = targetNvpW - hysteresisW;
    const upperBandW = targetNvpW + hysteresisW;
    if (nvpW === null) {
        return {
            nvpW: null,
            targetNvpW,
            hysteresisW,
            lowerBandW,
            upperBandW,
            activeTargetNvpW: targetNvpW,
            centerErrorW: 0,
            bandErrorW: 0,
            outsideBand: false,
            side: 'unknown',
        };
    }
    const centerErrorW = nvpW - targetNvpW;
    let activeTargetNvpW = targetNvpW;
    let bandErrorW = 0;
    let side = 'inside';
    if (nvpW < lowerBandW) {
        // Ausserhalb der Toleranz wird immer zur Zielmitte geregelt. Die untere
        // Bandkante bleibt nur Diagnose-/Freigabeschwelle und ist kein Regelziel.
        bandErrorW = centerErrorW;
        side = 'below';
    }
    else if (nvpW > upperBandW) {
        // Ausserhalb der Toleranz wird immer zur Zielmitte geregelt. Die obere
        // Bandkante bleibt nur Diagnose-/Freigabeschwelle und ist kein Regelziel.
        bandErrorW = centerErrorW;
        side = 'above';
    }
    return {
        nvpW,
        targetNvpW,
        hysteresisW,
        lowerBandW,
        upperBandW,
        activeTargetNvpW,
        centerErrorW,
        bandErrorW,
        outsideBand: bandErrorW !== 0,
        side,
        controlMode: 'center-outside-tolerance',
    };
}
/**
 * Liefert genau eine NVP-Abstimmung fuer die aktuell ausgewaehlte
 * Speicher-Topologie.
 *
 * Fachlicher Vertrag:
 * - Die Einzel-Speicher-App besitzt ihre Zielmitte/Messtoleranz unter `storage.*`.
 * - Die Speicherfarm besitzt ihre Zielmitte/Messtoleranz unter `storageFarm.*`.
 * - MultiUse liefert ausschliesslich SoC-/Reserve-/LSK-Zonen und darf niemals
 *   eine zweite NVP-Abstimmung ueberlagern.
 * - Bei einer bestehenden Farm ohne eigene Werte wird einmalig der bisherige
 *   Einzel-Speicher-Wert als migrationssicherer Fallback verwendet. Sobald die
 *   Farm-Werte gespeichert sind, sind sie autoritativ.
 */
function resolveStorageNvpTuning(input = {}) {
    const storage = isRecord(input.storageConfig) ? input.storageConfig : {};
    const farm = isRecord(input.storageFarmConfig) ? input.storageFarmConfig : {};
    const topology = normalizeStorageTopology(input.selectedTopology);
    const defaultTargetGridImportW = Math.max(0, firstFinite([
        input.standaloneDefaultTargetGridImportW,
    ], 50));
    const defaultImportThresholdW = Math.max(0, firstFinite([
        input.standaloneDefaultImportThresholdW,
    ], 20));
    const multiUsePolicySourceMarker = String(storage.multiUsePolicySource || '').trim().toLowerCase();
    const previouslyMirroredByMultiUse = boolOrNull(storage.multiUsePolicyApplied) === true
        || multiUsePolicySourceMarker === 'installerconfig.storagemultiuse'
        || multiUsePolicySourceMarker.includes('multiuse-applied');
    const standaloneTarget = finiteOrNull(storage.standaloneSelfTargetGridImportW);
    const standaloneDeadband = finiteOrNull(storage.standaloneSelfImportThresholdW);
    const legacyTarget = finiteOrNull(storage.selfTargetGridImportW);
    const legacyDeadband = finiteOrNull(storage.selfImportThresholdW);
    const useLegacyStandaloneTarget = standaloneTarget === null && !previouslyMirroredByMultiUse;
    const useLegacyStandaloneDeadband = standaloneDeadband === null && !previouslyMirroredByMultiUse;
    const singleTargetGridImportW = Math.max(0, standaloneTarget !== null
        ? standaloneTarget
        : (useLegacyStandaloneTarget && legacyTarget !== null ? legacyTarget : defaultTargetGridImportW));
    const singleImportThresholdW = Math.max(0, standaloneDeadband !== null
        ? standaloneDeadband
        : (useLegacyStandaloneDeadband && legacyDeadband !== null ? legacyDeadband : defaultImportThresholdW));
    const singleSource = standaloneTarget !== null || standaloneDeadband !== null
        ? 'storage.standaloneSelf'
        : ((useLegacyStandaloneTarget && legacyTarget !== null) || (useLegacyStandaloneDeadband && legacyDeadband !== null)
            ? 'storage.self-legacy'
            : (previouslyMirroredByMultiUse ? 'storage.default-after-multiuse' : 'storage.default'));
    const farmTarget = finiteOrNull(farm.selfTargetGridImportW !== undefined ? farm.selfTargetGridImportW : farm.nvpTargetGridImportW);
    const farmDeadband = finiteOrNull(farm.selfImportThresholdW !== undefined ? farm.selfImportThresholdW : farm.nvpDeadbandW);
    const farmOwnTarget = farmTarget !== null;
    const farmOwnDeadband = farmDeadband !== null;
    const farmTargetGridImportW = Math.max(0, farmOwnTarget ? farmTarget : singleTargetGridImportW);
    const farmImportThresholdW = Math.max(0, farmOwnDeadband ? farmDeadband : singleImportThresholdW);
    const selectedIsFarm = topology === 'farm';
    const targetGridImportW = selectedIsFarm ? farmTargetGridImportW : singleTargetGridImportW;
    const importThresholdW = selectedIsFarm ? farmImportThresholdW : singleImportThresholdW;
    const source = selectedIsFarm
        ? ((farmOwnTarget && farmOwnDeadband)
            ? 'storageFarm'
            : ((farmOwnTarget || farmOwnDeadband) ? 'storageFarm+storage-fallback' : 'storageFarm.legacy-storage-fallback'))
        : singleSource;
    const multiUse = isRecord(input.multiUseConfig) ? input.multiUseConfig : null;
    const ignoredMultiUseTargetW = multiUse ? finiteOrNull(multiUse.selfTargetGridImportW) : null;
    const ignoredMultiUseDeadbandW = multiUse ? finiteOrNull(multiUse.selfImportThresholdW) : null;
    return {
        topology,
        source,
        targetGridImportW,
        importThresholdW,
        single: {
            targetGridImportW: singleTargetGridImportW,
            importThresholdW: singleImportThresholdW,
            source: singleSource,
        },
        farm: {
            targetGridImportW: farmTargetGridImportW,
            importThresholdW: farmImportThresholdW,
            source: (farmOwnTarget || farmOwnDeadband) ? 'storageFarm' : 'storageFarm.legacy-storage-fallback',
            ownTargetConfigured: farmOwnTarget,
            ownDeadbandConfigured: farmOwnDeadband,
            fallbackFromSingle: !(farmOwnTarget && farmOwnDeadband),
        },
        multiUseTuningIgnored: ignoredMultiUseTargetW !== null || ignoredMultiUseDeadbandW !== null,
        ignoredMultiUseTargetW,
        ignoredMultiUseDeadbandW,
    };
}
function normalizeMultiUsePolicy(multiUse, defaults, nvpTuning) {
    const reserveEnabled = firstBoolean([multiUse.reserveEnabled], true);
    const peakEnabled = firstBoolean([multiUse.peakEnabled], true);
    const selfEnabled = firstBoolean([multiUse.selfEnabled], true);
    const legacyReserveTo = clamp(firstFinite([multiUse.reserveToSocPct], 10), 0, 100);
    const legacyPeakTo = clamp(firstFinite([multiUse.peakToSocPct], 50), legacyReserveTo, 100);
    const legacySelfTo = clamp(firstFinite([multiUse.selfToSocPct], 100), legacyPeakTo, 100);
    const reserveMinSocPct = clamp(firstFinite([
        multiUse.reserveMinSocPct,
        multiUse.reserveToSocPct,
    ], legacyReserveTo), 0, 100);
    const reserveTargetSocPct = clamp(firstFinite([
        multiUse.reserveTargetSocPct,
    ], reserveMinSocPct), reserveMinSocPct, 100);
    const reserveBaseMin = reserveEnabled ? reserveMinSocPct : 0;
    const lskMinSocPct = clamp(firstFinite([
        multiUse.lskMinSocPct,
    ], reserveBaseMin), reserveBaseMin, 100);
    const lskMaxSocPct = clamp(firstFinite([
        multiUse.lskMaxSocPct,
        multiUse.peakToSocPct,
    ], legacyPeakTo), lskMinSocPct, 100);
    const selfBaseMin = peakEnabled ? lskMaxSocPct : reserveBaseMin;
    const selfMinSocPct = clamp(firstFinite([
        multiUse.selfMinSocPct,
    ], selfBaseMin), selfBaseMin, 100);
    const selfMaxSocPct = clamp(firstFinite([
        multiUse.selfMaxSocPct,
        multiUse.selfToSocPct,
    ], legacySelfTo), selfMinSocPct, 100);
    return {
        mode: 'multiuse',
        source: 'installerConfig.storageMultiUse',
        multiUseConfigured: true,
        multiUseActive: true,
        staleMultiUseIgnored: false,
        legacyStorageValuesIgnored: true,
        reserve: {
            enabled: reserveEnabled,
            minSocPct: reserveMinSocPct,
            targetSocPct: reserveTargetSocPct,
        },
        lsk: {
            enabled: peakEnabled,
            dischargeEnabled: peakEnabled && firstBoolean([multiUse.lskDischargeEnabled], true),
            chargeEnabled: peakEnabled && firstBoolean([multiUse.lskChargeEnabled], true),
            minSocPct: lskMinSocPct,
            maxSocPct: lskMaxSocPct,
        },
        self: {
            enabled: selfEnabled,
            minSocPct: selfMinSocPct,
            maxSocPct: selfMaxSocPct,
            // MultiUse erweitert nur die SoC-/Reserve-Policy. Zielmitte und
            // Hysterese stammen immer aus der aktuell aktiven Speicher-App.
            targetGridImportW: Math.max(0, Number(nvpTuning.targetGridImportW) || 0),
            importThresholdW: Math.max(0, Number(nvpTuning.importThresholdW) || 0),
            nvpTuningSource: String(nvpTuning.source || ''),
        },
    };
}
function resolveStorageSocPolicy(input = {}) {
    const storage = isRecord(input.storageConfig) ? input.storageConfig : {};
    const multiUse = isRecord(input.multiUseConfig) ? input.multiUseConfig : null;
    const multiUseConfigured = !!multiUse;
    const multiUseActive = input.multiUseActive === true && !!multiUse;
    const defaultEnabled = firstBoolean([input.standaloneDefaultEnabled], true);
    const defaultMinSocPct = clamp(firstFinite([input.standaloneDefaultMinSocPct], 10), 0, 100);
    const defaultMaxSocPct = clamp(firstFinite([input.standaloneDefaultMaxSocPct], 100), defaultMinSocPct, 100);
    const defaultTargetGridImportW = Math.max(0, firstFinite([
        input.standaloneDefaultTargetGridImportW,
    ], 50));
    const defaultImportThresholdW = Math.max(0, firstFinite([
        input.standaloneDefaultImportThresholdW,
    ], 20));
    const defaults = {
        enabled: defaultEnabled,
        minSocPct: defaultMinSocPct,
        maxSocPct: defaultMaxSocPct,
        targetGridImportW: defaultTargetGridImportW,
        importThresholdW: defaultImportThresholdW,
    };
    const nvpTuning = resolveStorageNvpTuning(input);
    if (multiUseActive && multiUse) {
        const policy = normalizeMultiUsePolicy(multiUse, defaults, nvpTuning);
        return { ...policy, nvpTuning };
    }
    // Nur ein nachweislich frueher *aktives* MultiUse darf storage.self* als
    // historisch gespiegelt markieren. Eine reine Schema-/Versionsmarke oder ein
    // vorhandener, aber nie aktivierter MultiUse-Datensatz ist kein Beweis dafuer
    // und darf die Standalone-Konfiguration nicht veraendern.
    const multiUsePolicySourceMarker = String(storage.multiUsePolicySource || '').trim().toLowerCase();
    const previouslyMirroredByMultiUse = boolOrNull(storage.multiUsePolicyApplied) === true
        || multiUsePolicySourceMarker === 'installerconfig.storagemultiuse'
        || multiUsePolicySourceMarker.includes('multiuse-applied');
    const standaloneEnabled = boolOrNull(storage.standaloneSelfDischargeEnabled);
    const standaloneMin = finiteOrNull(storage.standaloneSelfMinSocPct);
    const standaloneMax = finiteOrNull(storage.standaloneSelfMaxSocPct);
    const standaloneTarget = finiteOrNull(storage.standaloneSelfTargetGridImportW);
    const standaloneDeadband = finiteOrNull(storage.standaloneSelfImportThresholdW);
    const hasStandaloneSocSnapshot = standaloneEnabled !== null
        || standaloneMin !== null
        || standaloneMax !== null;
    const hasStandaloneTuningSnapshot = standaloneTarget !== null
        || standaloneDeadband !== null;
    const hasStandaloneSnapshot = hasStandaloneSocSnapshot || hasStandaloneTuningSnapshot;
    const legacyEnabled = boolOrNull(storage.selfDischargeEnabled);
    const legacyMin = finiteOrNull(storage.selfMinSocPct);
    const legacyMax = finiteOrNull(storage.selfMaxSocPct);
    const legacyTarget = finiteOrNull(storage.selfTargetGridImportW);
    const legacyDeadband = finiteOrNull(storage.selfImportThresholdW);
    // SoC-/Freigabewerte sind bei vorhandenem, aber deaktiviertem MultiUse
    // historisch nicht eindeutig: fruehere Versionen haben genau diese Felder
    // aus MultiUse nach storage.* kopiert. Ohne expliziten Standalone-Snapshot
    // gelten deshalb sichere 10..100-%-Defaults. Zielimport und Deadband sind
    // dagegen normale Standalone-Tuningwerte und duerfen weiter genutzt werden,
    // solange kein frueherer MultiUse-Spiegel markiert ist.
    // Die alten storage.self*-SoC-/Freigabefelder sind bei vorhandenem MultiUse-
    // Datensatz historisch mehrdeutig, weil fruehere Versionen sie direkt aus
    // MultiUse gespiegelt haben. Solange kein expliziter Standalone-Snapshot
    // existiert, werden sie bei einem vorhandenen (auch deaktivierten) MultiUse
    // deshalb nicht als eigenstaendige Policy uebernommen. Ein reiner Versions-
    // marker ohne MultiUse-Datensatz reicht dagegen nicht aus, sie zu verwerfen.
    const useLegacyStandaloneSoc = !hasStandaloneSocSnapshot
        && !multiUseConfigured
        && !previouslyMirroredByMultiUse;
    const useLegacyStandaloneTuning = !hasStandaloneTuningSnapshot
        && !previouslyMirroredByMultiUse;
    const selfEnabled = standaloneEnabled !== null
        ? standaloneEnabled
        : (useLegacyStandaloneSoc && legacyEnabled !== null ? legacyEnabled : defaultEnabled);
    const selfMinSocPct = clamp(standaloneMin !== null
        ? standaloneMin
        : (useLegacyStandaloneSoc && legacyMin !== null ? legacyMin : defaultMinSocPct), 0, 100);
    const selfMaxSocPct = clamp(standaloneMax !== null
        ? standaloneMax
        : (useLegacyStandaloneSoc && legacyMax !== null ? legacyMax : defaultMaxSocPct), selfMinSocPct, 100);
    // NVP-Ziel und Hysterese werden getrennt von der SoC-Policy aufgeloest.
    // Dadurch kann MultiUse diese Werte weder aktiv noch als Altlast ueberlagern.
    const targetGridImportW = Math.max(0, Number(nvpTuning.targetGridImportW) || 0);
    const importThresholdW = Math.max(0, Number(nvpTuning.importThresholdW) || 0);
    let source = 'standalone-default';
    if (hasStandaloneSocSnapshot)
        source = 'storage.standaloneSelf';
    else if (useLegacyStandaloneSoc)
        source = multiUseConfigured
            ? 'storage.self-legacy;inactive-multiuse-ignored'
            : 'storage.self-legacy';
    // Der Migrationsgrund ist aussagekraeftiger als das weiterhin vorhandene,
    // aber deaktivierte MultiUse-Objekt. So ist in Diagnose und Feldtest direkt
    // erkennbar, dass ein historischer Spiegel bewusst verworfen wurde.
    else if (previouslyMirroredByMultiUse)
        source = 'standalone-default-after-multiuse';
    else if (multiUseConfigured)
        source = 'standalone-default-inactive-multiuse';
    return {
        mode: 'standalone',
        source,
        multiUseConfigured,
        multiUseActive: false,
        staleMultiUseIgnored: multiUseConfigured || previouslyMirroredByMultiUse,
        previousMultiUseMirrorDetected: previouslyMirroredByMultiUse,
        legacyStorageValuesIgnored: !useLegacyStandaloneSoc,
        legacyTuningValuesUsed: useLegacyStandaloneTuning,
        standaloneSnapshotAvailable: hasStandaloneSnapshot,
        standaloneSocSnapshotAvailable: hasStandaloneSocSnapshot,
        standaloneTuningSnapshotAvailable: hasStandaloneTuningSnapshot,
        nvpTuning,
        reserve: {
            enabled: false,
            minSocPct: 0,
            targetSocPct: 0,
        },
        lsk: {
            enabled: false,
            dischargeEnabled: false,
            chargeEnabled: false,
            minSocPct: 0,
            maxSocPct: 100,
        },
        self: {
            enabled: selfEnabled,
            minSocPct: selfMinSocPct,
            maxSocPct: selfMaxSocPct,
            targetGridImportW,
            importThresholdW,
            nvpTuningSource: String(nvpTuning.source || ''),
        },
    };
}
// Rueckwaertskompatible Aliasnamen fuer bestehende Test-/Migrationshelfer.
function resolveStorageSelfConsumptionPolicy(input = {}) {
    return resolveStorageSocPolicy(input);
}
function resolveStorageOperatingPolicy(input = {}) {
    return resolveStorageSocPolicy(input);
}
module.exports = {
    resolveStorageSocPolicy,
    resolveStorageSelfConsumptionPolicy,
    resolveStorageOperatingPolicy,
    resolveStorageNvpTuning,
    resolveNvpBandTarget,
};
