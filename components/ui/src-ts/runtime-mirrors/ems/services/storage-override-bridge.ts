// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: ems/services/storage-override-bridge.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * ems/services/storage-override-bridge.js
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
 * Original-Hash: 057d2442295708898623864cf741c78a2c4212c1639cdaaaa48f2d2fcfb7db5d
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
 * Quelle: src-ts/runtime-executables/ems/services/storage-override-bridge.ts
 * Quell-Hash: sha256:ebb9ff44f3d31cf980d10f6b5e3aa90d05397a53544daa3007a00832d287bf39
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/storage-override-bridge.js.
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
 * Aufgabe: Übernimmt freigegebene Speicher-Messwertüberlagerungen in den von der Engine verwendeten Kontext.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/storage-override-bridge.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
const { normalizeStorageDatapointsConfig, buildStorageMeasurementFallbackFromGlobal, mergeStorageMeasurementFallback, } = require('./storage-datapoint-config');
/**
 * Code-Teil: text
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function text(value) {
    return String(value === undefined || value === null ? '' : value).trim();
}
/**
 * Code-Teil: finite
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function finite(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}
/** Ermittelt den Faktor, mit dem ein AppCenter-Leistungswert nach Watt skaliert wird. */
async function resolvePowerScale(adapter, key, objectId) {
    const settings = adapter.config?.settings && typeof adapter.config.settings === 'object'
        ? adapter.config.settings
        : {};
    const perDp = settings.flowPowerDpIsW && typeof settings.flowPowerDpIsW === 'object'
        ? settings.flowPowerDpIsW
        : null;
    if (perDp && Object.prototype.hasOwnProperty.call(perDp, key))
        return perDp[key] ? 1 : 1000;
    if (typeof settings.flowPowerInputIsW === 'boolean')
        return settings.flowPowerInputIsW ? 1 : 1000;
    if (settings.flowAutoScalePower === false || !objectId || typeof adapter.getForeignObjectAsync !== 'function')
        return 1;
    try {
        const object = await adapter.getForeignObjectAsync(objectId);
        const unit = text(object?.common?.unit).toLowerCase();
        if (unit === 'kw' || unit === 'kilowatt')
            return 1000;
        if (unit === 'mw' || unit === 'megawatt')
            return 1000000;
    }
    catch (_error) {
        // Fehlende optionale Metadaten dürfen den EMS-Start nicht blockieren.
    }
    return 1;
}
/**
 * Bereitet globale AppCenter-Messwerte ausschließlich als privaten Runtime-
 * Fallback vor. Die dauerhaft gespeicherte `storage.datapoints`-Zuordnung wird
 * niemals verändert. Dadurch kann ein kurzer Energieflusswert wie `r` nach einem
 * EMS-Neustart nicht mehr in das Speicherformular zurücklaufen.
 */
async function applyStorageMeasurementOverrides(adapter, datapoints) {
    const config = adapter.config && typeof adapter.config === 'object' ? adapter.config : {};
    const storage = config.storage && typeof config.storage === 'object' ? config.storage : {};
    const local = normalizeStorageDatapointsConfig(storage);
    const fallbackWrapper = buildStorageMeasurementFallbackFromGlobal({
        ...config,
        datapoints: datapoints && typeof datapoints === 'object' ? datapoints : {},
    });
    const fallback = fallbackWrapper.datapoints && typeof fallbackWrapper.datapoints === 'object'
        ? fallbackWrapper.datapoints
        : {};
    // Explizite W/kW-Schalter bleiben führend. Wenn keine feste Einheit gesetzt
    // wurde, kann die Bridge die Objekt-Metadaten asynchron auswerten.
    const signedId = text(fallback.batteryPowerObjectId);
    const chargeId = text(fallback.batteryChargePowerObjectId);
    const dischargeId = text(fallback.batteryDischargePowerObjectId);
    const dcPvId = text(fallback.dcPvPowerObjectId);
    if (signedId) {
        fallback.batteryPowerScale = await resolvePowerScale(adapter, text(fallback.batteryFeedbackSource) === 'appcenter-same-split-fallback' ? 'storageChargePower' : 'batteryPower', signedId);
    }
    if (chargeId)
        fallback.batteryChargePowerScale = await resolvePowerScale(adapter, 'storageChargePower', chargeId);
    if (dischargeId)
        fallback.batteryDischargePowerScale = await resolvePowerScale(adapter, 'storageDischargePower', dischargeId);
    if (dcPvId)
        fallback.dcPvPowerScale = await resolvePowerScale(adapter, 'storagePvPower', dcPvId);
    // Nur dieser private Runtime-Snapshot darf von Mapping/Regelung als Fallback
    // gelesen werden. Er ist absichtlich nicht Teil von adapter.config und damit
    // weder persistierbar noch über /api/installer/config sichtbar.
    adapter._nwStorageMeasurementFallback = {
        schema: 'nexowatt.storage-measurement-fallback.v1',
        ts: Date.now(),
        datapoints: { ...fallback },
        source: text(fallback.batteryFeedbackSource) || text(fallback.socFeedbackSource) || '',
    };
    const effective = mergeStorageMeasurementFallback({ ...storage, datapoints: local }, adapter._nwStorageMeasurementFallback);
    const effectiveSignedId = text(effective.batteryPowerObjectId);
    const effectiveChargeId = text(effective.batteryChargePowerObjectId);
    const effectiveDischargeId = text(effective.batteryDischargePowerObjectId);
    let source = text(effective.batteryFeedbackSource);
    if (!source) {
        if (effectiveSignedId)
            source = 'storage-tab-signed';
        else if (effectiveChargeId || effectiveDischargeId)
            source = 'storage-tab-split';
        else
            source = 'storage-tab';
    }
    return {
        source,
        socId: text(effective.socObjectId),
        signedPowerId: effectiveSignedId,
        chargePowerId: effectiveChargeId,
        dischargePowerId: effectiveDischargeId,
    };
}
/**
 * Code-Teil: objectIdOf
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function objectIdOf(entry) {
    return text(entry?.objectId);
}
/**
 * Bildet aus positiven Split-Istwerten die interne signed Speicherleistung:
 * +W = Entladen, -W = Laden. Nur ein exakt identisch als Sollwert gemapptes
 * Objekt wird als Feedback verworfen; freie Objektpfade/Namen bleiben zulässig.
 */
function resolveSplitBatteryFeedback(registry, storageConfig, staleMs) {
    if (!registry)
        return null;
    const targetIds = [
        registry.getEntry('st.targetPowerW'),
        registry.getEntry('st.targetChargePowerW'),
        registry.getEntry('st.targetDischargePowerW'),
    ].map(objectIdOf).filter(Boolean);
    const rows = [
        {
            key: 'st.batteryChargePowerW',
            role: 'charge',
            entry: registry.getEntry('st.batteryChargePowerW'),
            value: registry.getNumber('st.batteryChargePowerW', null),
            ageMs: registry.getAgeMs('st.batteryChargePowerW'),
            sampleTs: typeof registry.getMeasurementTimestampMs === 'function'
                ? registry.getMeasurementTimestampMs('st.batteryChargePowerW')
                : null,
        },
        {
            key: 'st.batteryDischargePowerW',
            role: 'discharge',
            entry: registry.getEntry('st.batteryDischargePowerW'),
            value: registry.getNumber('st.batteryDischargePowerW', null),
            ageMs: registry.getAgeMs('st.batteryDischargePowerW'),
            sampleTs: typeof registry.getMeasurementTimestampMs === 'function'
                ? registry.getMeasurementTimestampMs('st.batteryDischargePowerW')
                : null,
        },
    ];
    let chargeW = 0;
    let dischargeW = 0;
    let oldestAgeMs = null;
    let newestSampleTs = null;
    const objectIds = [];
    const sampleParts = [];
    for (const row of rows) {
        const objectId = objectIdOf(row.entry);
        if (!objectId || row.value === null || !Number.isFinite(Number(row.value)))
            continue;
        if (targetIds.includes(objectId))
            continue;
        objectIds.push(objectId);
        const magnitude = Math.max(0, Math.abs(finite(row.value, 0)));
        if (row.role === 'charge')
            chargeW = magnitude;
        else
            dischargeW = magnitude;
        if (typeof row.ageMs === 'number' && Number.isFinite(row.ageMs)) {
            oldestAgeMs = oldestAgeMs === null ? row.ageMs : Math.max(oldestAgeMs, row.ageMs);
        }
        const rowSampleTs = Number(row.sampleTs);
        if (Number.isFinite(rowSampleTs) && rowSampleTs > 0) {
            newestSampleTs = newestSampleTs === null ? rowSampleTs : Math.max(newestSampleTs, rowSampleTs);
            sampleParts.push(`${row.role}:${objectId}@${Math.round(rowSampleTs)}`);
        }
        else {
            sampleParts.push(`${row.role}:${objectId}@age:${Number.isFinite(Number(row.ageMs)) ? Math.round(Number(row.ageMs)) : 'unknown'}`);
        }
    }
    if (!objectIds.length)
        return null;
    const datapointConfig = storageConfig.datapoints && typeof storageConfig.datapoints === 'object'
        ? storageConfig.datapoints
        : {};
    if (datapointConfig.batterySplitInvert === true) {
        const swap = chargeW;
        chargeW = dischargeW;
        dischargeW = swap;
    }
    const trusted = oldestAgeMs === null || oldestAgeMs <= Math.max(1000, finite(staleMs, 60000));
    return {
        trusted,
        observedW: dischargeW - chargeW,
        ageMs: oldestAgeMs,
        sampleTs: newestSampleTs,
        sampleKey: sampleParts.join('|'),
        objectIds,
        source: text(datapointConfig.batteryFeedbackSource) || 'single-storage-split',
        reason: trusted ? 'Split-Istleistung aus AppCenter/Einzel-Speicher' : 'Split-Istleistung vorhanden, aber veraltet',
    };
}
module.exports = { applyStorageMeasurementOverrides, resolvePowerScale, resolveSplitBatteryFeedback };
