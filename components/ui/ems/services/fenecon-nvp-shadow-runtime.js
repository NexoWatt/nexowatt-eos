/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/services/fenecon-nvp-shadow-runtime.ts
 * Quell-Hash: sha256:4e753d75bf8f6f545ca3339057910b074d164f1714fd7f474f16cb4bb826ede6
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/fenecon-nvp-shadow-runtime.js.
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
 * Aufgabe: Vergleicht Fenecon-bezogene Netzverknüpfungspunkt-Werte im Diagnose-/Shadow-Kontext.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/fenecon-nvp-shadow-runtime.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
const { calculateFeneconNvpShadow, isFeneconHybrid, } = require('./fenecon-hybrid-control');
function strictFiniteNumber(value, fallback = null) {
    if (value === null || value === undefined)
        return fallback;
    if (typeof value === 'string' && !value.trim())
        return fallback;
    if (typeof value !== 'number' && typeof value !== 'string')
        return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}
function num(value, fallback = 0) {
    return strictFiniteNumber(value, null) ?? fallback;
}
function clamp(value, minValue, maxValue) {
    return Math.max(minValue, Math.min(maxValue, value));
}
const FENECON_NVP_SHADOW_STATE_DEFINITIONS = [
    ['speicher.regelung.feneconNvpShadowAktiv', 'FENECON NVP-Shadow aktiv', 'boolean', 'indicator', false],
    ['speicher.regelung.feneconNvpShadowReadOnly', 'FENECON NVP-Shadow nur lesend', 'boolean', 'indicator', true],
    ['speicher.regelung.feneconNvpShadowSchreibversuch', 'FENECON NVP-Shadow Hardware-Schreibversuch', 'boolean', 'indicator', false],
    ['speicher.regelung.feneconNvpShadowGueltig', 'FENECON NVP-Shadow Eingaben gültig', 'boolean', 'indicator', false],
    ['speicher.regelung.feneconNvpShadowBereit', 'FENECON NVP-Shadow für späteren Feldtest bereit', 'boolean', 'indicator', false],
    ['speicher.regelung.feneconNvpShadowModus', 'FENECON NVP-Shadow Vorschlagsmodus', 'string', 'text', 'inactive'],
    ['speicher.regelung.feneconNvpShadowGrund', 'FENECON NVP-Shadow Statusgrund', 'string', 'text', ''],
    ['speicher.regelung.feneconNvpShadowNativeTargetMapped', 'FENECON echter FEMS-NVP-Zieldatenpunkt gemappt', 'boolean', 'indicator', false],
    ['speicher.regelung.feneconNvpShadowNvpW', 'FENECON NVP-Shadow Netzpunkt-Istleistung', 'number', 'value.power', null],
    ['speicher.regelung.feneconNvpShadowNvpQuelle', 'FENECON NVP-Shadow Netzpunktquelle', 'string', 'text', ''],
    ['speicher.regelung.feneconNvpShadowNvpAlterMs', 'FENECON NVP-Shadow Alter der Netzpunktmessung', 'number', 'value.interval', null],
    ['speicher.regelung.feneconNvpShadowZentralNvpW', 'FENECON NVP-Shadow zentrale Safety-NVP-Referenz', 'number', 'value.power', null],
    ['speicher.regelung.feneconNvpShadowNvpAbweichungW', 'FENECON NVP-Shadow Abweichung FENECON zu zentralem NVP', 'number', 'value.power', null],
    ['speicher.regelung.feneconNvpShadowEssIstW', 'FENECON NVP-Shadow ESS-Aktor-Istleistung', 'number', 'value.power', null],
    ['speicher.regelung.feneconNvpShadowRestlastOhneSpeicherW', 'FENECON NVP-Shadow Restlast ohne Speicher', 'number', 'value.power', null],
    ['speicher.regelung.feneconNvpShadowBatterieSollW', 'FENECON NVP-Shadow finaler EOS-Batteriesollwert', 'number', 'value.power', null],
    ['speicher.regelung.feneconNvpShadowEosUebersetzungW', 'FENECON NVP-Shadow Übersetzung der EOS-Batteriepolicy', 'number', 'value.power', null],
    ['speicher.regelung.feneconNvpShadowFemsSollW', 'FENECON NVP-Shadow vorgeschlagener FEMS-Netzsollwert', 'number', 'value.power', null],
    ['speicher.regelung.feneconNvpShadowNullEinspeisungZielW', 'FENECON NVP-Shadow Zielbezug für 0-Einspeisung', 'number', 'value.power', 80],
    ['speicher.regelung.feneconNvpShadowNullEinspeisungBatterieSollW', 'FENECON NVP-Shadow benötigter Batteriesollwert für 0-Einspeisung', 'number', 'value.power', null],
    ['speicher.regelung.feneconNvpShadowNullEinspeisungErwarteterNvpW', 'FENECON NVP-Shadow erwarteter NVP nach Batteriegrenzen', 'number', 'value.power', null],
    ['speicher.regelung.feneconNvpShadowNullEinspeisungErreichbar', 'FENECON NVP-Shadow 0-Einspeisungsziel erreichbar', 'boolean', 'indicator', null],
    ['speicher.regelung.feneconNvpShadowBatterieAnpassungW', 'FENECON NVP-Shadow erforderliche Batterieanpassung zur 0-Einspeisung', 'number', 'value.power', null],
    ['speicher.regelung.feneconNvpShadowZusatzsenkeW', 'FENECON NVP-Shadow zusätzliche Senke oder PV-Abregelung', 'number', 'value.power', null],
    ['speicher.regelung.feneconNvpShadowImportReduktionW', 'FENECON NVP-Shadow mögliches Importreduktionspotenzial', 'number', 'value.power', null],
    ['speicher.regelung.feneconNvpShadowPlausibilitaetVerfuegbar', 'FENECON NVP-Shadow Last/PV-Plausibilisierung verfügbar', 'boolean', 'indicator', false],
    ['speicher.regelung.feneconNvpShadowPlausibel', 'FENECON NVP-Shadow Last/PV-Bilanz plausibel', 'boolean', 'indicator', null],
    ['speicher.regelung.feneconNvpShadowPlausibilitaetAbweichungW', 'FENECON NVP-Shadow Bilanzabweichung', 'number', 'value.power', null],
    ['speicher.regelung.feneconNvpShadowLastW', 'FENECON NVP-Shadow direkt gemessener Gesamtverbrauch', 'number', 'value.power', null],
    ['speicher.regelung.feneconNvpShadowLastQuelle', 'FENECON NVP-Shadow Gesamtverbrauchsquelle', 'string', 'text', ''],
    ['speicher.regelung.feneconNvpShadowLastAlterMs', 'FENECON NVP-Shadow Alter des Gesamtverbrauchs', 'number', 'value.interval', null],
    ['speicher.regelung.feneconNvpShadowPvW', 'FENECON NVP-Shadow gesamte PV-Erzeugung', 'number', 'value.power', null],
    ['speicher.regelung.feneconNvpShadowPvQuelle', 'FENECON NVP-Shadow PV-Quelle', 'string', 'text', ''],
    ['speicher.regelung.feneconNvpShadowPvAlterMs', 'FENECON NVP-Shadow Alter der PV-Messung', 'number', 'value.interval', null],
    ['speicher.regelung.feneconNvpShadowJson', 'FENECON NVP-Shadow Gesamtdiagnose (JSON)', 'string', 'json', ''],
];
async function ensureFeneconNvpShadowStates(mk) {
    for (const definition of FENECON_NVP_SHADOW_STATE_DEFINITIONS) {
        await mk(definition[0], definition[1], definition[2], definition[3], definition[4]);
    }
}
async function updateFeneconNvpShadowRuntime(host, ctx = {}) {
    const safeSet = async (id, value) => {
        try {
            await host._setIfChanged(id, value);
        }
        catch {
            // Shadow-Diagnose darf die produktive Regelung nie beeinflussen.
        }
    };
    const clearNumericStates = async () => {
        for (const id of [
            'speicher.regelung.feneconNvpShadowNvpW',
            'speicher.regelung.feneconNvpShadowNvpAlterMs',
            'speicher.regelung.feneconNvpShadowZentralNvpW',
            'speicher.regelung.feneconNvpShadowNvpAbweichungW',
            'speicher.regelung.feneconNvpShadowEssIstW',
            'speicher.regelung.feneconNvpShadowRestlastOhneSpeicherW',
            'speicher.regelung.feneconNvpShadowBatterieSollW',
            'speicher.regelung.feneconNvpShadowEosUebersetzungW',
            'speicher.regelung.feneconNvpShadowFemsSollW',
            'speicher.regelung.feneconNvpShadowNullEinspeisungBatterieSollW',
            'speicher.regelung.feneconNvpShadowNullEinspeisungErwarteterNvpW',
            'speicher.regelung.feneconNvpShadowBatterieAnpassungW',
            'speicher.regelung.feneconNvpShadowZusatzsenkeW',
            'speicher.regelung.feneconNvpShadowImportReduktionW',
            'speicher.regelung.feneconNvpShadowPlausibilitaetAbweichungW',
            'speicher.regelung.feneconNvpShadowLastW',
            'speicher.regelung.feneconNvpShadowLastAlterMs',
            'speicher.regelung.feneconNvpShadowPvW',
            'speicher.regelung.feneconNvpShadowPvAlterMs',
        ])
            await safeSet(id, null);
    };
    const setInactive = async (reason, extra = {}) => {
        const inactiveSignature = `inactive:${String(reason || 'inactive')}`;
        if (ctx.force !== true
            && host._feneconNvpShadowLastSignature === inactiveSignature
            && host._feneconNvpShadowLastDiag) {
            return host._feneconNvpShadowLastDiag;
        }
        host._feneconNvpShadowWasActive = false;
        const diag = {
            ts: Date.now(),
            version: 'rc42-shadow-v1',
            active: false,
            readOnly: true,
            writeAttempted: false,
            writePermitted: false,
            writesHardware: false,
            valid: false,
            readyForFutureWrite: false,
            productWriterChanged: false,
            reason: String(reason || 'inactive'),
            ...extra,
        };
        host._feneconNvpShadowLastRunMs = Number(diag.ts);
        host._feneconNvpShadowLastSignature = inactiveSignature;
        host._feneconNvpShadowLastDiag = diag;
        await safeSet('speicher.regelung.feneconNvpShadowAktiv', false);
        await safeSet('speicher.regelung.feneconNvpShadowReadOnly', true);
        await safeSet('speicher.regelung.feneconNvpShadowSchreibversuch', false);
        await safeSet('speicher.regelung.feneconNvpShadowGueltig', false);
        await safeSet('speicher.regelung.feneconNvpShadowBereit', false);
        await safeSet('speicher.regelung.feneconNvpShadowModus', 'inactive');
        await safeSet('speicher.regelung.feneconNvpShadowGrund', String(reason || 'inactive'));
        await safeSet('speicher.regelung.feneconNvpShadowNativeTargetMapped', false);
        await safeSet('speicher.regelung.feneconNvpShadowNvpQuelle', '');
        await safeSet('speicher.regelung.feneconNvpShadowLastQuelle', '');
        await safeSet('speicher.regelung.feneconNvpShadowPvQuelle', '');
        await safeSet('speicher.regelung.feneconNvpShadowNullEinspeisungErreichbar', null);
        await safeSet('speicher.regelung.feneconNvpShadowPlausibilitaetVerfuegbar', false);
        await safeSet('speicher.regelung.feneconNvpShadowPlausibel', null);
        await clearNumericStates();
        await safeSet('speicher.regelung.feneconNvpShadowJson', JSON.stringify(diag));
        return diag;
    };
    try {
        if (ctx && ctx.forceInactiveReason) {
            return setInactive(String(ctx.forceInactiveReason));
        }
        const cfg = ctx.cfg && typeof ctx.cfg === 'object' ? ctx.cfg : host._getCfg();
        const storageAuthority = ctx.storageAuthority && typeof ctx.storageAuthority === 'object'
            ? ctx.storageAuthority
            : host._getStorageControlAuthority();
        const selectedTopology = String(storageAuthority && storageAuthority.selectedTopology || 'none');
        const vendorProfile = host._getStorageVendorProfile(cfg);
        const hybridEligible = isFeneconHybrid({
            vendorProfile,
            coupling: cfg.coupling,
        });
        if (!hybridEligible)
            return setInactive('not-fenecon-dc-hybrid');
        if (selectedTopology !== 'single') {
            return setInactive('exclusive-single-storage-required', { selectedTopology });
        }
        const nowMs = Date.now();
        const intervalMs = Math.max(1000, Math.round(num(cfg.feneconNvpShadowIntervalSec, 5) * 1000));
        const shadowSignature = [
            selectedTopology,
            String(vendorProfile || ''),
            String(ctx.currentAuthority || host._feneconHybridAuthority || ''),
            String(ctx.commandFamily || ''),
            String(ctx.source || ''),
            strictFiniteNumber(ctx.targetW, null) === null
                ? 'target-missing'
                : String(Math.round(Number(ctx.targetW))),
        ].join('|');
        if (ctx.force !== true
            && host._feneconNvpShadowLastSignature === shadowSignature
            && host._feneconNvpShadowLastDiag
            && nowMs - Number(host._feneconNvpShadowLastRunMs || 0) < intervalMs) {
            return host._feneconNvpShadowLastDiag;
        }
        const staleMs = Math.max(1000, Math.round(num(cfg.staleTimeoutSec, 15) * 1000));
        const readFresh = (key) => {
            try {
                const entry = host.dp && typeof host.dp.getEntry === 'function'
                    ? host.dp.getEntry(key)
                    : null;
                if (!entry)
                    return { key, mapped: false, value: null, ageMs: null, fresh: false };
                const ageMs = host.dp && typeof host.dp.getAgeMs === 'function'
                    ? strictFiniteNumber(host.dp.getAgeMs(key), null)
                    : null;
                const value = host.dp && typeof host.dp.getNumberFresh === 'function'
                    ? strictFiniteNumber(host.dp.getNumberFresh(key, staleMs, null), null)
                    : null;
                const fresh = value !== null && (ageMs === null || ageMs <= staleMs);
                return {
                    key,
                    mapped: true,
                    value: fresh ? value : null,
                    rawValue: value,
                    ageMs,
                    fresh,
                };
            }
            catch {
                return { key, mapped: false, value: null, ageMs: null, fresh: false };
            }
        };
        // Der neue Device-Alias ist die bevorzugte FENECON-Regelpunktmessung.
        // Die zentrale Safety-NVP-Messung bleibt davon getrennt und wird als
        // unabhaengige Referenz gelesen; der Shadow ersetzt sie niemals.
        const mappedFeneconNvp = readFresh('st.feneconNvpPowerW');
        let centralNvp = readFresh('grid.powerRawW');
        if (!centralNvp.fresh)
            centralNvp = readFresh('grid.powerW');
        if (!centralNvp.fresh) {
            const latestNvpW = strictFiniteNumber(host._latestNvpRawW, null);
            const latestNvpTs = strictFiniteNumber(host._latestNvpSampleTs, null);
            const latestAgeMs = latestNvpTs === null ? null : Math.max(0, nowMs - latestNvpTs);
            if (latestNvpW !== null && latestAgeMs !== null && latestAgeMs <= staleMs) {
                centralNvp = {
                    key: '_latestNvpRawW',
                    mapped: true,
                    value: latestNvpW,
                    ageMs: latestAgeMs,
                    fresh: true,
                };
            }
        }
        if (!centralNvp.fresh) {
            const ctxNvpW = strictFiniteNumber(ctx.nvpW, null);
            const ctxNvpAgeMs = strictFiniteNumber(ctx.nvpAgeMs, null);
            if (ctxNvpW !== null && (ctxNvpAgeMs === null || ctxNvpAgeMs <= staleMs)) {
                centralNvp = {
                    key: 'shadow-context',
                    mapped: true,
                    value: ctxNvpW,
                    ageMs: ctxNvpAgeMs,
                    fresh: true,
                };
            }
        }
        const nvp = mappedFeneconNvp.fresh ? mappedFeneconNvp : centralNvp;
        const essActual = readFresh('st.feneconEssActualPowerW');
        const minBattery = readFresh('st.feneconMinPowerW');
        const maxBattery = readFresh('st.feneconMaxPowerW');
        const nativeGridEntry = host.dp && typeof host.dp.getEntry === 'function'
            ? host.dp.getEntry('st.feneconGridSetpointW')
            : null;
        // Fuer die unabhaengige Plausibilitaet wird bevorzugt die vom
        // FENECON-/Device-Adapter gelieferte Gesamt-PV verwendet. Falls sie
        // fehlt, nutzt der bestehende Helfer die normalen globalen PV-Aliase.
        const totalPv = readFresh('st.feneconPvTotalPowerW');
        const dcPv = readFresh('st.feneconPvDcPowerW');
        const acPv = readFresh('st.feneconPvAcPowerW');
        let selectedPvW = null;
        let selectedPvAgeMs = null;
        let selectedPvSource = '';
        if (totalPv.fresh) {
            selectedPvW = Math.max(0, Math.abs(totalPv.value));
            selectedPvAgeMs = totalPv.ageMs;
            selectedPvSource = totalPv.key;
        }
        else if (dcPv.fresh || acPv.fresh) {
            selectedPvW = Math.max(0, (dcPv.fresh ? Math.abs(dcPv.value) : 0)
                + (acPv.fresh ? Math.abs(acPv.value) : 0));
            selectedPvAgeMs = Math.max(dcPv.fresh && Number.isFinite(Number(dcPv.ageMs)) ? Number(dcPv.ageMs) : 0, acPv.fresh && Number.isFinite(Number(acPv.ageMs)) ? Number(acPv.ageMs) : 0);
            selectedPvSource = dcPv.fresh && acPv.fresh
                ? `${dcPv.key}+${acPv.key}`
                : (dcPv.fresh ? dcPv.key : acPv.key);
        }
        else {
            const hybridCtx = ctx.feneconHybridCtx && typeof ctx.feneconHybridCtx === 'object'
                ? ctx.feneconHybridCtx
                : {};
            const hybridPvW = strictFiniteNumber(hybridCtx.pvW, null);
            const hybridPvAgeMs = strictFiniteNumber(hybridCtx.pvAgeMs, null);
            if (hybridCtx.pvFresh === true && hybridPvW !== null) {
                selectedPvW = Math.max(0, Math.abs(hybridPvW));
                selectedPvAgeMs = hybridPvAgeMs;
                selectedPvSource = String(hybridCtx.pvSource || 'fenecon-hybrid-context');
            }
        }
        const zeroExportTargetW = clamp(strictFiniteNumber(cfg.feneconNvpShadowZeroExportTargetW
            ?? cfg.feneconZeroExportTargetW, 80) ?? 80, 0, 1000);
        // Der neue direkte Gesamtverbrauchs-DP hat Vorrang. Er darf nicht
        // aus NVP/PV/ESS zurueckgerechnet sein, sonst entstuende eine
        // zirkulaere Plausibilitaet. Ist er nicht verfuegbar, bleibt der
        // bestehende strikt direkte globale Last-Fallback erlaubt.
        const directConsumption = readFresh('st.feneconConsumptionTotalW');
        let feedForward = null;
        if (directConsumption.fresh
            && Number(directConsumption.value) >= 0
            && selectedPvW !== null
            && nvp.fresh) {
            const ages = [directConsumption.ageMs, selectedPvAgeMs, nvp.ageMs]
                .filter((value) => strictFiniteNumber(value, null) !== null)
                .map(Number);
            const measurementSkewMs = ages.length >= 2
                ? Math.max(...ages) - Math.min(...ages)
                : 0;
            const maxSkewMs = Math.max(1000, num(cfg.feneconNvpShadowMaxSkewMs, staleMs));
            const aligned = measurementSkewMs <= maxSkewMs;
            feedForward = {
                active: aligned,
                usable: aligned,
                reason: aligned
                    ? 'fenecon-direct-consumption-pv-plausibility'
                    : 'fenecon-consumption-pv-nvp-not-aligned',
                loadW: Math.max(0, Number(directConsumption.value)),
                loadSource: directConsumption.key,
                loadAgeMs: directConsumption.ageMs,
                pvW: selectedPvW,
                pvSource: selectedPvSource,
                pvAgeMs: selectedPvAgeMs,
                measurementSkewMs,
                aligned,
                nvpW: nvp.value,
                nvpAgeMs: nvp.ageMs,
                targetNvpW: zeroExportTargetW,
            };
        }
        if (!feedForward || feedForward.usable !== true) {
            const fallback = host._buildIndependentPvLoadFeedForward({
                nowMs,
                staleMs,
                maxSkewMs: Math.max(1000, num(cfg.feneconNvpShadowMaxSkewMs, staleMs)),
                targetNvpW: zeroExportTargetW,
                rawNvpW: nvp.fresh ? nvp.value : null,
                nvpAgeMs: nvp.ageMs,
                protectedEvcsLoadW: 0,
                coupling: cfg.coupling,
                dcPvPowerW: selectedPvW,
                dcPvPowerAgeMs: selectedPvAgeMs,
            });
            if (!feedForward || fallback.usable === true || !directConsumption.mapped) {
                feedForward = fallback;
            }
        }
        const shadow = calculateFeneconNvpShadow({
            enabled: true,
            eligible: hybridEligible,
            exclusiveSingleStorage: selectedTopology === 'single',
            nativeTargetMapped: !!(nativeGridEntry && nativeGridEntry.objectId),
            nvpW: nvp.fresh ? nvp.value : null,
            nvpFresh: nvp.fresh,
            nvpAgeMs: nvp.ageMs,
            safetyNvpFresh: centralNvp.fresh,
            referenceNvpW: centralNvp.fresh ? centralNvp.value : null,
            referenceNvpFresh: centralNvp.fresh,
            nvpReferenceToleranceW: Math.max(100, num(cfg.feneconNvpShadowNvpToleranceW, 300)),
            essActualW: essActual.fresh ? essActual.value : null,
            essFresh: essActual.fresh,
            essAgeMs: essActual.ageMs,
            batteryTargetW: strictFiniteNumber(ctx.targetW, null),
            minBatteryW: minBattery.fresh ? minBattery.value : null,
            maxBatteryW: maxBattery.fresh ? maxBattery.value : null,
            zeroExportTargetW,
            plausibilityToleranceW: Math.max(100, num(cfg.feneconNvpShadowPlausibilityToleranceW, 500)),
            feedForwardUsable: feedForward && feedForward.usable === true,
            loadW: feedForward && feedForward.loadW,
            loadSource: feedForward && feedForward.loadSource,
            loadAgeMs: feedForward && feedForward.loadAgeMs,
            pvW: feedForward && feedForward.pvW,
            pvSource: feedForward && feedForward.pvSource,
            pvAgeMs: feedForward && feedForward.pvAgeMs,
            measurementSkewMs: feedForward && feedForward.measurementSkewMs,
            source: String(ctx.source || ''),
            reason: String(ctx.reason || ''),
            currentAuthority: String(ctx.currentAuthority || host._feneconHybridAuthority || ''),
            commandFamily: String(ctx.commandFamily || ''),
        });
        const diag = {
            ts: nowMs,
            version: 'rc42-shadow-v1',
            productWriterChanged: false,
            ...shadow,
            inputSources: {
                nvp: nvp.key,
                centralNvp: centralNvp.key,
                ess: essActual.key,
                pv: String(feedForward && feedForward.pvSource || selectedPvSource || ''),
                load: String(feedForward && feedForward.loadSource || ''),
            },
            feneconNvpMapped: mappedFeneconNvp.mapped === true,
            feneconNvpFresh: mappedFeneconNvp.fresh === true,
            centralSafetyNvpFresh: centralNvp.fresh === true,
            feedForwardReason: String(feedForward && feedForward.reason || ''),
            feedForwardUsable: !!(feedForward && feedForward.usable),
        };
        host._feneconNvpShadowWasActive = shadow.active === true;
        host._feneconNvpShadowLastRunMs = nowMs;
        host._feneconNvpShadowLastSignature = shadowSignature;
        host._feneconNvpShadowLastDiag = diag;
        const n = (value) => strictFiniteNumber(value, null) === null
            ? null
            : Math.round(Number(value));
        await safeSet('speicher.regelung.feneconNvpShadowAktiv', shadow.active === true);
        await safeSet('speicher.regelung.feneconNvpShadowReadOnly', true);
        await safeSet('speicher.regelung.feneconNvpShadowSchreibversuch', false);
        await safeSet('speicher.regelung.feneconNvpShadowGueltig', shadow.valid === true);
        await safeSet('speicher.regelung.feneconNvpShadowBereit', shadow.readyForFutureWrite === true);
        await safeSet('speicher.regelung.feneconNvpShadowModus', String(shadow.proposalMode || ''));
        await safeSet('speicher.regelung.feneconNvpShadowGrund', String(shadow.reason || ''));
        await safeSet('speicher.regelung.feneconNvpShadowNativeTargetMapped', shadow.nativeTargetMapped === true);
        await safeSet('speicher.regelung.feneconNvpShadowNvpW', n(shadow.nvpW));
        await safeSet('speicher.regelung.feneconNvpShadowNvpQuelle', String(nvp.key || ''));
        await safeSet('speicher.regelung.feneconNvpShadowNvpAlterMs', n(nvp.ageMs));
        await safeSet('speicher.regelung.feneconNvpShadowZentralNvpW', n(shadow.referenceNvpW));
        await safeSet('speicher.regelung.feneconNvpShadowNvpAbweichungW', n(shadow.nvpReferenceDeltaW));
        await safeSet('speicher.regelung.feneconNvpShadowEssIstW', n(shadow.essActualW));
        await safeSet('speicher.regelung.feneconNvpShadowRestlastOhneSpeicherW', n(shadow.residualWithoutStorageW));
        await safeSet('speicher.regelung.feneconNvpShadowBatterieSollW', n(shadow.effectiveBatteryTargetW));
        await safeSet('speicher.regelung.feneconNvpShadowEosUebersetzungW', n(shadow.translatedGridTargetW));
        await safeSet('speicher.regelung.feneconNvpShadowFemsSollW', n(shadow.proposedGridTargetW));
        await safeSet('speicher.regelung.feneconNvpShadowNullEinspeisungZielW', n(shadow.zeroExportTargetW));
        await safeSet('speicher.regelung.feneconNvpShadowNullEinspeisungBatterieSollW', n(shadow.zeroExportBatteryTargetW));
        await safeSet('speicher.regelung.feneconNvpShadowNullEinspeisungErwarteterNvpW', n(shadow.predictedNvpAtZeroExportW));
        await safeSet('speicher.regelung.feneconNvpShadowNullEinspeisungErreichbar', shadow.zeroExportAchievable === null ? null : shadow.zeroExportAchievable === true);
        await safeSet('speicher.regelung.feneconNvpShadowBatterieAnpassungW', n(shadow.batteryAdjustmentToZeroExportW));
        await safeSet('speicher.regelung.feneconNvpShadowZusatzsenkeW', n(shadow.additionalSinkOrCurtailmentW));
        await safeSet('speicher.regelung.feneconNvpShadowImportReduktionW', n(shadow.importReductionPotentialW));
        await safeSet('speicher.regelung.feneconNvpShadowPlausibilitaetVerfuegbar', shadow.plausibilityAvailable === true);
        await safeSet('speicher.regelung.feneconNvpShadowPlausibel', shadow.plausible === null ? null : shadow.plausible === true);
        await safeSet('speicher.regelung.feneconNvpShadowPlausibilitaetAbweichungW', n(shadow.plausibilityDeltaW));
        await safeSet('speicher.regelung.feneconNvpShadowLastW', n(shadow.loadW));
        await safeSet('speicher.regelung.feneconNvpShadowLastQuelle', String(shadow.loadSource || ''));
        await safeSet('speicher.regelung.feneconNvpShadowLastAlterMs', n(shadow.loadAgeMs));
        await safeSet('speicher.regelung.feneconNvpShadowPvW', n(shadow.pvW));
        await safeSet('speicher.regelung.feneconNvpShadowPvQuelle', String(shadow.pvSource || ''));
        await safeSet('speicher.regelung.feneconNvpShadowPvAlterMs', n(shadow.pvAgeMs));
        await safeSet('speicher.regelung.feneconNvpShadowJson', JSON.stringify(diag));
        return diag;
    }
    catch (error) {
        const caught = error;
        const reason = `shadow-error:${String(caught?.message ?? error)}`;
        return setInactive(reason, { error: String(caught?.stack ?? error) });
    }
}
module.exports = {
    FENECON_NVP_SHADOW_STATE_DEFINITIONS,
    ensureFeneconNvpShadowStates,
    updateFeneconNvpShadowRuntime,
};
