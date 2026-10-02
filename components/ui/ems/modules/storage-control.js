/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/modules/storage-control.ts
 * Quell-Hash: sha256:f5cbe42b911b6931ea6fd11b6784afa10e9394cc68ed91d2f949366fe3c90458
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/modules/storage-control.js.
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
 * Aufgabe: Berechnet Speicher-Laden und -Entladen unter Berücksichtigung von Netzbedarf, SOC, Tarif, Schutzvorgaben und Speicherfarm.
 * Daten und Wirkung: Verarbeitet NVP-, Batterie- und SoC-Messwerte sowie zentrale PV-/Gesamtbudgets. Ein befristeter Nulleinspeise-Test darf ausschließlich über den gemeinsamen Koordinator zusätzliche Ladeleistung anfordern; Tarif-, SoC-, Reglerhoheit- und Hardwaregrenzen bleiben maßgeblich.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/modules/storage-control.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: ems/modules/storage-control.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `ems/modules/storage-control.js`.
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
 * Datei: ems/modules/storage-control.js
 * Rolle im Projekt: Speicherregelung.
 * Zweck: Verwaltet Speicherstrategie, Reserve, Laden/Entladen und Multi-Use-Regeln.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Speichersteuerung/-strategie: verarbeitet Speicher-SoC, Reserve, Lade-/Entladefreigaben und Schutzlogik.
 * Zusammenhänge:
 * - Hängt an Speicher-DPs und zentralen EMS-Budgets.
 * - Muss Split-DP, Signed-DP und Fallback-Werte konsistent verstehen.
 * Wartungshinweise:
 * - Speicherwerte sind historisch kritisch; 0 W ist ein gültiger Zustand und darf nicht als fehlend gelten.
 */

'use strict';

const { BaseModule } = require('./base');
const { resolveCurrentNvpSnapshot } = require('../services/measurement-freshness');
const { resolveStorageStrategyOverlay } = require('../services/operating-strategy-runtime');
const { resolveSplitBatteryFeedback } = require('../services/storage-override-bridge');
const { decideStorageZeroWrite } = require('../services/storage-zero-write-policy');
const { estimateAsyncStorageFeedback } = require('../services/storage-async-feedback-anchor');
const { readZeroExportMode, requestZeroExportProbe, isZeroExportGrantValid } = require('../services/zero-export-pv-coordinator');
const {
    resolveStorageOperatingPolicy,
    resolveNvpBandTarget,
} = require('../services/storage-self-consumption-policy');
const storageFeatureFlags = require('../services/feature-flags');
const {
    buildStorageMeasurementFallbackFromGlobal,
    mergeStorageMeasurementFallback,
} = require('../services/storage-datapoint-config');
const {
    resolveControlMode: resolveFeneconControlMode,
    resolveHybridAuthority: resolveFeneconHybridAuthority,
    validateSingleConfig: validateFeneconSingleConfig,
    calculateFemsGridTargetW,
    isFeneconHybrid,
} = require('../services/fenecon-hybrid-control');
const {
    ensureFeneconNvpShadowStates,
    updateFeneconNvpShadowRuntime,
} = require('../services/fenecon-nvp-shadow-runtime');
const {
    liveSafetyEnvelope,
    evaluateFlexibleLoadRequest,
    evaluateSafetyCommandPermission,
    commitFlexibleLoadDecision,
    invalidateSafetyEnvelope,
} = require('../services/safety-envelope');

/**
 * Strikte Zahlkonvertierung fuer Messwerte und optionale Grenzwerte.
 * JavaScript behandelt null/leere Strings sonst als 0; bei Speicherbefehlen
 * waere das ein realer Stop bzw. eine ungewollte Sollwertklemme.
 */
function strictFiniteNumber(value, fallback = null) {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string' && !value.trim()) return fallback;
    if (typeof value !== 'number' && typeof value !== 'string') return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Prüft den Speicher als präzise regelbare Senke für den zentralen PV-Anlauf.
 * Alle Leistungen sind positive Ladebeträge in W; Batterie-Istwerte haben dagegen
 * das bestehende Vorzeichen (Laden negativ). Unbekannter SoC, gehaltene/alte
 * Telemetrie, Reglerübergaben und Tarifquellen liefern keinen Probe-Antrag.
 * Die Funktion erzeugt weder ein PV-Budget noch einen Hardwarebefehl: Der
 * Koordinator begrenzt danach Zeit/Energie/Gesamtbudget, der bestehende Writer
 * prüft zuletzt Anschluss, Phasen, Geräte und gegebenenfalls Farmmitglieder.
 */
function resolveStorageZeroExportProbeRequest(ctx = {}) {
    const targetW = strictFiniteNumber(ctx.targetW, null);
    const soc = strictFiniteNumber(ctx.soc, null);
    const socAgeMs = strictFiniteNumber(ctx.socAgeMs, null);
    const actualSignedW = strictFiniteNumber(ctx.actualSignedW, null);
    const actualAgeMs = strictFiniteNumber(ctx.actualAgeMs, null);
    const maxSoc = strictFiniteNumber(ctx.maxSoc, null);
    const maxW = strictFiniteNumber(ctx.maxW, null);
    const provenPvW = Math.max(0, strictFiniteNumber(ctx.provenPvW, 0));
    const baseW = Math.min(Math.max(0, -(targetW || 0)), provenPvW);
    const actualFresh = ctx.actualTrusted === true && actualSignedW !== null
        && actualAgeMs !== null && actualAgeMs >= 0 && actualAgeMs <= 5000;
    const allowedSources = ['idle', 'pv', 'zero-export-probe'];
    let reason = '';
    if (ctx.modeActive !== true) reason = 'zero-export-inactive';
    else if (ctx.writerActive !== true || ctx.controlMode !== 'targetPower' || ctx.noWrite === true) reason = 'storage-writer-unavailable';
    else if (ctx.pvEnabled !== true || ctx.policyBlocked === true || ctx.evPriorityBlocked === true) reason = 'storage-policy-blocked';
    else if (targetW === null || targetW > 0 || !allowedSources.includes(String(ctx.source || ''))
        || !allowedSources.includes(String(ctx.policySource || ''))) reason = 'storage-non-pv-policy';
    else if (soc === null || soc < 0 || soc > 100 || socAgeMs === null || socAgeMs < 0 || socAgeMs > 15000
        || maxSoc === null || soc >= maxSoc) reason = 'storage-soc-unavailable-or-full';
    else if (!actualFresh || actualSignedW > 0) reason = 'storage-feedback-unavailable-or-discharging';
    else if (maxW === null || maxW <= 0 || baseW >= maxW) reason = 'storage-no-charge-headroom';
    const stepW = Math.max(1, strictFiniteNumber(ctx.stepW, 1));
    // Abrunden verhindert, dass Quantisierung einen Geräte-/Policy-Cap anhebt.
    const nextW = reason ? baseW : Math.floor(Math.min(maxW, baseW + Math.max(250, stepW)) / stepW) * stepW;
    if (!reason && nextW <= baseW) reason = 'storage-no-quantized-headroom';
    return {
        eligible: !reason,
        baseW,
        nextW: !reason ? nextW : baseW,
        maxW: maxW === null ? 0 : Math.max(0, maxW),
        actualW: actualSignedW === null ? 0 : Math.max(0, -actualSignedW),
        actualFresh,
        technicalMinW: stepW,
        reason,
    };
}

/** Netzladequellen, die niemals ohne den separaten wirtschaftlichen Freigabevertrag schreiben dürfen. */
function isCentralStorageGridChargeSource(src, signedTargetW) {
    if (!(Number(signedTargetW) < 0)) return false;
    const normalized = String(src || '').trim().toLowerCase();
    return normalized === 'tarif'
        || normalized === 'tarif_grid_charge'
        || normalized === 'tarif-netzladen'
        || normalized === 'reserve'
        || normalized === 'reserve_grid'
        || normalized === 'reserve-netzladen'
        || normalized === 'lastspitze_refill'
        || normalized === 'lsk_refill'
        || normalized === 'grid_charge';
}

/**
 * RC83: Unabhängige, fail-closed Prüfung des TarifVis-Snapshots unmittelbar
 * vor der Speicherregelung. Ein altes/persistiertes `true` darf Netzladen nicht
 * freigeben. Zulässig ist ausschließlich ein frischer, aktiver und günstiger
 * dynamischer Tarif; bei aktivem variablem Netzentgelt zusätzlich nur das
 * konfigurierte NT-/Quartalsfenster.
 */
function resolveStrictStorageTariffPermission(snapshot = {}, {
    nowMs = Date.now(),
    snapshotMaxAgeMs = 15000,
} = {}) {
    const snap = snapshot && typeof snapshot === 'object' ? snapshot : {};
    const advertisedAllowed = snap.storageGridChargeAllowed === true;
    const advertisedReason = String(snap.storageGridChargeBlockReason || '').trim();
    const ts = strictFiniteNumber(snap.ts, null);
    const maxAgeMs = Math.max(1000, strictFiniteNumber(snapshotMaxAgeMs, 15000));
    const ageMs = ts === null ? null : Math.max(0, Number(nowMs) - ts);

    if (ts === null || ageMs > maxAgeMs) {
        return {
            allowed: false,
            source: 'snapshot-stale',
            reason: ts === null
                ? 'Tarif-Freigabesnapshot fehlt – Speicher bleibt eigenverbrauchsoptimiert'
                : `Tarif-Freigabesnapshot ist ${Math.round(ageMs / 1000)} s alt – Speicher bleibt eigenverbrauchsoptimiert`,
            ageMs,
        };
    }
    if (!advertisedAllowed) {
        return {
            allowed: false,
            source: String(snap.storageGridChargeSource || 'blocked'),
            reason: advertisedReason || 'Speicher-Netzladen ist nicht freigegeben – Eigenverbrauchsoptimierung aktiv',
            ageMs,
        };
    }
    if (snap.tarifAktiv !== true) {
        return {
            allowed: false,
            source: 'dynamic-tariff',
            reason: 'Dynamischer Tarif ist nicht aktiv – Speicher bleibt eigenverbrauchsoptimiert',
            ageMs,
        };
    }
    if (snap.currentPriceFresh !== true) {
        return {
            allowed: false,
            source: 'dynamic-tariff',
            reason: 'Aktueller Tarifpreis fehlt oder ist veraltet – Speicher bleibt eigenverbrauchsoptimiert',
            ageMs,
        };
    }

    const state = String(snap.state || 'unknown').trim().toLowerCase().replace(/ü/g, 'ue');
    if (state !== 'guenstig') {
        const label = state === 'neutral' ? 'neutral' : state === 'teuer' ? 'teuer' : String(snap.state || 'unbekannt');
        return {
            allowed: false,
            source: 'dynamic-tariff',
            reason: `Tarif ist ${label} – Netzladen gesperrt, Eigenverbrauchsoptimierung aktiv`,
            ageMs,
        };
    }

    const netFeeEnabled = snap.netFeeEnabled === true;
    if (netFeeEnabled) {
        const netFeeMode = String(snap.netFeeMode || '').trim().toUpperCase();
        const manualWindowActive = snap.storageManualWindowActive === true || snap.storageChargeWindowOk === true;
        if (netFeeMode !== 'NT' || !manualWindowActive) {
            return {
                allowed: false,
                source: 'net-fee',
                reason: 'Tarif ist günstig, aber das konfigurierte NT-/Quartalsfenster ist nicht aktiv – Eigenverbrauchsoptimierung aktiv',
                ageMs,
            };
        }
    }

    return {
        allowed: true,
        source: netFeeEnabled ? 'net-fee-nt-cheap' : 'dynamic-tariff-cheap',
        reason: netFeeEnabled
            ? 'Dynamischer Tarif günstig und konfiguriertes NT-/Quartalsfenster aktiv'
            : 'Dynamischer Tarif günstig und frisch',
        ageMs,
    };
}

/**
 * Ermittelt unmittelbar vor dem Hardware-Writer die fachliche Herkunft eines
 * negativen Speicher-Sollwerts. Herstellerprofile und die 0-W-Firewall dürfen
 * den ursprünglichen Tarif-/Reservepfad nicht verdecken. Gleichzeitig hat eine
 * nach der Firewall wiederhergestellte aktuelle Quelle (z. B. `tarif`) Vorrang
 * vor dem vor dem Herstellerprofil gemerkten Wert (z. B. `idle`).
 */
function resolveStorageGridChargeGateSource({
    targetW = 0,
    source = '',
    policySourceBeforeVendor = '',
} = {}) {
    const currentSource = String(source || '').trim();
    const upstreamSource = String(policySourceBeforeVendor || '').trim();

    if (isCentralStorageGridChargeSource(currentSource, targetW)) return currentSource;
    if (isCentralStorageGridChargeSource(upstreamSource, targetW)) return upstreamSource;
    return currentSource || upstreamSource;
}

function resolveStorageGridChargeFinalGate({
    targetW = 0,
    source = '',
    configured = false,
    allowed = false,
    blockReason = '',
} = {}) {
    const gridChargeSource = isCentralStorageGridChargeSource(source, targetW);
    if (!gridChargeSource || allowed === true) {
        return { blocked: false, targetW: Number(targetW) || 0, reason: '', gridChargeSource };
    }
    const reason = configured === true
        ? (String(blockReason || '').trim() || 'Speicher-Netzladen nur bei frischem günstigen dynamischen Tarif und – bei aktivem Netzentgelt – aktivem NT-/Quartalsfenster erlaubt')
        : 'Netzladen deaktiviert (App-Center: „Netzladen erlauben“ ist aus)';
    return { blocked: true, targetW: 0, reason, gridChargeSource: true };
}


/**
 * RC83: Physikalische letzte Ladebegrenzung für alle negativen Speicherziele,
 * deren Herkunft nicht eindeutig als zentraler Tarif-/Reserve-Netzladepfad
 * erkannt wurde. Ist die wirtschaftliche Netzladefreigabe nicht aktiv, darf
 * der Speicher nur so weit laden, wie lokaler PV-Überschuss am NVP vorhanden
 * ist. Damit können weder Hersteller-Assists noch Hold-/Rampenpfade einen alten
 * hohen Ladebefehl weiterführen und dadurch teuren Netzbezug erzeugen.
 *
 * Vorzeichenvertrag:
 * - NVP positiv = Netzbezug, negativ = Einspeisung
 * - Batterie positiv = Entladung, negativ = Beladung
 * - NVP ohne Batterie = gemessener NVP + Batterie-Istleistung
 */
function resolveStoragePvOnlyChargeSafetyGate({
    targetW = 0,
    gridChargeAllowed = false,
    signedNvpW = null,
    batteryPowerW = null,
    batteryPowerTrusted = false,
    targetImportW = 0,
    validatedPvFeedForwardChargeW = null,
    blockReason = '',
} = {}) {
    const requestedTargetW = strictFiniteNumber(targetW, 0);
    if (!(requestedTargetW < 0) || gridChargeAllowed === true) {
        return {
            limited: false,
            blocked: false,
            targetW: requestedTargetW,
            requestedChargeW: Math.max(0, -requestedTargetW),
            allowedChargeW: Math.max(0, -requestedTargetW),
            pvOnlyCapW: null,
            nvpDerivedPvOnlyCapW: null,
            validatedFeedForwardCapW: null,
            capSource: '',
            baseNvpWithoutBatteryW: null,
            targetImportW: Math.max(0, strictFiniteNumber(targetImportW, 0)),
            batteryFeedbackUsed: false,
            reason: '',
        };
    }

    const requestedChargeW = Math.max(0, -requestedTargetW);
    const nvpW = strictFiniteNumber(signedNvpW, null);
    const targetNvpW = Math.max(0, strictFiniteNumber(targetImportW, 0));
    const trustedBatteryW = batteryPowerTrusted === true
        ? strictFiniteNumber(batteryPowerW, null)
        : null;
    const batteryFeedbackUsed = trustedBatteryW !== null;

    // Ohne gültigen NVP wird fail-closed kein negativer Sollwert freigegeben.
    // Ist kein vertrauenswürdiger Batterie-Istwert vorhanden, wird konservativ
    // angenommen, dass die Batterie aktuell 0 W beiträgt. Dadurch kann nur eine
    // tatsächlich gemessene Einspeisung als Ladefreigabe dienen.
    const baseNvpWithoutBatteryW = nvpW === null
        ? null
        : nvpW + (batteryFeedbackUsed ? trustedBatteryW : 0);
    const nvpDerivedPvOnlyCapW = baseNvpWithoutBatteryW === null
        ? 0
        : Math.max(0, targetNvpW - baseNvpWithoutBatteryW);

    // Bei einigen Hybridspeichern ist der Batterie-Istwert kurzzeitig 0 W oder
    // deutlich zeitversetzt, obwohl direkte PV- und Lastmessungen bereits einen
    // stabilen lokalen PV-Ueberschuss bestaetigen. Der gemeinsame NVP-Regler
    // markiert einen solchen Feed-forward nur dann als `used`, wenn PV, Last und
    // NVP direkt gemappt, frisch, zeitlich plausibel und untereinander konsistent
    // sind. Dieser bereits validierte Wert darf deshalb als zweite, physikalisch
    // belastbare Obergrenze dienen. Ein beliebiger Sollwert oder eine ungepruefte
    // PV-Messung wird hier ausdruecklich nicht akzeptiert.
    const feedForwardRawW = strictFiniteNumber(validatedPvFeedForwardChargeW, null);
    const validatedFeedForwardCapW = feedForwardRawW === null
        ? 0
        : Math.max(0, feedForwardRawW);
    const pvOnlyCapW = nvpW === null
        ? 0
        : Math.max(nvpDerivedPvOnlyCapW, validatedFeedForwardCapW);
    const capSource = pvOnlyCapW <= 0
        ? 'none'
        : (validatedFeedForwardCapW > nvpDerivedPvOnlyCapW
            ? 'validated-pv-load-feed-forward'
            : 'nvp-battery-balance');
    const allowedChargeW = Math.min(requestedChargeW, pvOnlyCapW);
    const finalTargetW = allowedChargeW > 0 ? -allowedChargeW : 0;
    const limited = (requestedChargeW - allowedChargeW) > 1;
    const blocked = limited && allowedChargeW <= 1;
    const tariffReason = String(blockReason || '').trim()
        || 'Speicher-Netzladen ist außerhalb eines frischen günstigen Tarifzeitpunkts gesperrt';

    let reason = '';
    if (limited) {
        if (nvpW === null) {
            reason = `${tariffReason} · NVP-Messung fehlt oder ist veraltet; Ladebefehl sicher auf 0 W gesetzt`;
        } else if (blocked) {
            reason = `${tariffReason} · kein lokaler PV-Überschuss für Speicherladung verfügbar`;
        } else if (capSource === 'validated-pv-load-feed-forward') {
            reason = `${tariffReason} · Speicherladung auf validierten lokalen PV-/Last-Überschuss ${Math.round(allowedChargeW)} W begrenzt`;
        } else {
            reason = `${tariffReason} · Speicherladung auf lokalen PV-Überschuss ${Math.round(allowedChargeW)} W begrenzt`;
        }
    }

    return {
        limited,
        blocked,
        targetW: finalTargetW,
        requestedChargeW,
        allowedChargeW,
        pvOnlyCapW,
        nvpDerivedPvOnlyCapW,
        validatedFeedForwardCapW,
        capSource,
        baseNvpWithoutBatteryW,
        targetImportW: targetNvpW,
        batteryFeedbackUsed,
        reason,
    };
}

/**
 * Ermittelt die interne Lizenzedition. `eos` bleibt der Legacy-/Key-Name für
 * das Pro-Profil. Isolierte Modultests ohne Lizenzobjekt laufen weiterhin mit
 * Pro-Fallback; im echten Adapter verhindert der ModuleManager einen Tick ohne
 * gültige Lizenz.
 */
function resolveStorageLicenseEdition(adapter) {
    const info = adapter && adapter._nwLicenseInfo && typeof adapter._nwLicenseInfo === 'object'
        ? adapter._nwLicenseInfo
        : {};
    const raw = String(info.edition || '').trim();
    if (info.ok === true || (adapter && adapter._nwLicenseOk === true) || raw) {
        try { return storageFeatureFlags.normalizeEdition(raw || 'eos'); } catch (_e) {}
        const e = raw.toLowerCase();
        return (e === 'hems' || e === 'home') ? 'hems' : 'eos';
    }
    return 'eos';
}

/**
 * Die Nennleistung ist ein Skalierungsanker, kein zusätzlicher Gerätebefehl.
 * Einzel-Speicher verwenden `storage.ratedPowerW`; bei einer Farm wird – falls
 * kein expliziter Gesamtwert gesetzt ist – die Summe der je Speicher bekannten
 * Lade-/Entladegrenzen verwendet.
 */
function deriveStorageRatedPowerW(cfg = {}, farmRows = [], selectedTopology = 'single') {
    const explicit = Number(cfg && cfg.ratedPowerW);
    if (Number.isFinite(explicit) && explicit > 0) return Math.round(explicit);
    if (String(selectedTopology || '') !== 'farm' || !Array.isArray(farmRows)) return 0;
    return Math.round(farmRows.reduce((sum, row) => {
        if (!row || row.enabled === false) return sum;
        const chargeW = Number(row.maxChargeW);
        const dischargeW = Number(row.maxDischargeW);
        const rowRatedW = Math.max(
            Number.isFinite(chargeW) && chargeW > 0 ? chargeW : 0,
            Number.isFinite(dischargeW) && dischargeW > 0 ? dischargeW : 0,
        );
        return sum + rowRatedW;
    }, 0));
}

function resolveStorageLicensePowerProfile(adapter, cfg = {}, farmRows = [], selectedTopology = 'single') {
    const edition = resolveStorageLicenseEdition(adapter);
    const ratedPowerW = deriveStorageRatedPowerW(cfg, farmRows, selectedTopology);
    try {
        if (storageFeatureFlags && typeof storageFeatureFlags.storagePerformanceProfile === 'function') {
            return storageFeatureFlags.storagePerformanceProfile(edition, ratedPowerW);
        }
    } catch (_e) {}
    return {
        edition,
        id: edition === 'hems' ? 'home' : 'pro',
        label: edition === 'hems' ? 'Home' : 'Pro',
        industrial: edition === 'eos',
        unrestricted: edition === 'eos',
        configuredRatedPowerW: ratedPowerW,
        effectiveRatedPowerW: ratedPowerW,
        maxCommandW: edition === 'hems' ? 50000 : 0,
        defaultStepW: 1,
        defaultMaxDeltaWPerTick: 500,
        defaultPvMaxDeltaWPerTick: 1500,
        defaultBalancePredictionMaxW: 10000,
        energyFlowPlausibilityMaxW: edition === 'eos' ? 100000000 : 1000000,
    };
}

/**
 * Finale Lizenzschranke. `maxCommandW = 0` bedeutet im Pro-Profil ausdrücklich
 * unbegrenzt durch die Lizenz. Geräte-, NVP-, SoC-, Farm- und Safety-Grenzen
 * wirken unabhängig davon weiterhin.
 */
function applyStorageLicensePowerLimit(targetW, profile = {}) {
    const requestedW = Number.isFinite(Number(targetW)) ? Number(targetW) : 0;
    const hardLimitW = Math.max(0, Number(profile && profile.maxCommandW || 0));
    if (hardLimitW <= 0) {
        return {
            requestedW,
            targetW: requestedW,
            limited: false,
            limitW: 0,
            profile: String(profile && profile.id || 'pro'),
            label: String(profile && profile.label || 'Pro'),
        };
    }
    const limitedTargetW = Math.max(-hardLimitW, Math.min(hardLimitW, requestedW));
    return {
        requestedW,
        targetW: limitedTargetW,
        limited: Math.abs(limitedTargetW - requestedW) > 0.5,
        limitW: hardLimitW,
        profile: String(profile && profile.id || 'home'),
        label: String(profile && profile.label || 'Home'),
    };
}

/**
 * EVCS-Speicherschutz als asymmetrische physikalische Schranke.
 *
 * Vorzeichen:
 * - NVP +W = Netzbezug, -W = Einspeisung
 * - Speicher +W = Entladen, -W = Laden
 *
 * Der geschuetzte EVCS-Anteil wird nur aus der Entladeanforderung entfernt.
 * Laden bleibt ausschliesslich aus dem tatsaechlichen Gesamtueberschuss erlaubt.
 * Dadurch kann der Speicher weiterhin den Hausverbrauch ausgleichen, versorgt aber
 * weder die geschuetzte E-Mobilitaet noch laedt er parallel aus dem Netz.
 */
/**
 * A policy's watts expire; a customer's protection request does not expire with
 * them. Fresh, completed snapshots (including a deliberate mode change) replace
 * the old intent. No old EV reading is ever held as a current physical load.
 */
function resolveEvcsStorageProtectionSnapshot(policy, options = {}) {
    const count = value => Math.max(0, Number.isFinite(Number(value)) ? Math.floor(Number(value)) : 0);
    const watts = value => Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0);
    const record = policy && typeof policy === 'object' && !Array.isArray(policy) ? policy : null;
    const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
    const maxAgeMs = Math.max(1000, Number(options.maxAgeMs) || 5000);
    const ts = Number(record && record.ts);
    const validNonNegative = value => value !== null && value !== undefined
        && typeof value !== 'boolean' && String(value).trim() !== ''
        && Number.isFinite(Number(value)) && Number(value) >= 0;
    const payloadValid = !!record && validNonNegative(record.protectedLoadW)
        && validNonNegative(record.protectedWallboxes)
        && (record.protectedUnknownWallboxes === undefined || validNonNegative(record.protectedUnknownWallboxes));
    const fresh = payloadValid && Number.isFinite(ts) && ts > 0 && ts <= now
        && now - ts <= maxAgeMs && record.complete !== false;
    const protectedWallboxes = count(record && record.protectedWallboxes);
    const protectedLoadW = watts(record && record.protectedLoadW);
    const unknown = count(record && record.protectedUnknownWallboxes);
    const requested = Math.max(count(record && record.protectionRequestedWallboxes),
        protectedWallboxes, unknown, protectedLoadW > 0 ? 1 : 0,
        (!record || !payloadValid || (!fresh && !validNonNegative(record.protectionRequestedWallboxes)))
            ? count(options.configuredCandidates) : 0);
    return {
        protectedLoadW: fresh ? protectedLoadW : 0,
        protectedWallboxes: fresh ? protectedWallboxes : 0,
        protectionRequestedWallboxes: requested,
        protectedUnknownWallboxes: fresh ? unknown : requested,
        protectedLoadUnknown: (fresh ? unknown : requested) > 0,
        assistRequestedLoadW: fresh ? watts(record.assistRequestedLoadW) : 0,
        fresh,
        source: String(record && record.source || 'state-fallback') + (fresh || !requested ? '' : '-unconfirmed'),
    };
}

function resolveEvcsProtectedStorageTarget(input = {}) {
    const finite = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
    const requestedW = finite(input.requestedTargetW) ? Number(input.requestedTargetW) : 0;
    const lastTargetW = finite(input.lastTargetW) ? Number(input.lastTargetW) : 0;
    const protectedLoadW = Math.max(0, finite(input.protectedEvcsLoadW) ? Number(input.protectedEvcsLoadW) : 0);
    const protectedLoadUnknown = input.protectedLoadUnknown === true;
    const nvpW = finite(input.nvpW) ? Number(input.nvpW) : null;
    const targetNvpW = finite(input.targetNvpW) ? Number(input.targetNvpW) : 0;
    const storageActualKnown = finite(input.storageActualW);
    const storageActualW = storageActualKnown ? Number(input.storageActualW) : 0;
    const storageDischargeBasisKnown = finite(input.storageDischargeBasisW);
    const storageDischargeBasisW = storageDischargeBasisKnown ? Number(input.storageDischargeBasisW) : 0;
    const storageDischargeBasisSource = String(input.storageDischargeBasisSource || (storageActualKnown ? 'fresh-physical-feedback' : 'missing'));
    const deadbandW = Math.max(0, finite(input.deadbandW) ? Number(input.deadbandW) : 50);
    const activeThresholdW = deadbandW;
    const actualChargeActive = storageActualKnown && storageActualW < -activeThresholdW;
    const actualDischargeActive = storageActualKnown && storageActualW > activeThresholdW;

    if (protectedLoadW <= 0 && !protectedLoadUnknown) {
        return {
            active: false,
            requestedW,
            targetW: requestedW,
            lastTargetW,
            protectedLoadW: 0,
            protectedLoadUnknown,
            nvpW,
            targetNvpW,
            storageActualW: storageActualKnown ? storageActualW : null,
            storageActualKnown,
            storageDischargeBasisW: storageDischargeBasisKnown ? storageDischargeBasisW : null,
            storageDischargeBasisKnown,
            storageDischargeBasisSource,
            totalDesiredW: null,
            houseDesiredW: null,
            chargeAllowanceW: null,
            dischargeAllowanceW: null,
            explicitStop: false,
            chargeStop: false,
            dischargeStop: false,
            chargeFromSurplus: false,
            action: 'inactive',
            reason: '',
        };
    }

    if (nvpW === null) {
        const explicitStop = protectedLoadUnknown || lastTargetW !== 0 || actualChargeActive || actualDischargeActive;
        return {
            active: true,
            requestedW,
            targetW: null,
            lastTargetW,
            protectedLoadW,
            protectedLoadUnknown,
            nvpW: null,
            targetNvpW,
            storageActualW: storageActualKnown ? storageActualW : null,
            storageActualKnown,
            storageDischargeBasisW: storageDischargeBasisKnown ? storageDischargeBasisW : null,
            storageDischargeBasisKnown,
            storageDischargeBasisSource,
            totalDesiredW: null,
            houseDesiredW: null,
            chargeAllowanceW: 0,
            dischargeAllowanceW: 0,
            explicitStop,
            chargeStop: explicitStop && (lastTargetW < 0 || actualChargeActive),
            dischargeStop: explicitStop && (lastTargetW > 0 || actualDischargeActive),
            chargeFromSurplus: false,
            action: explicitStop ? 'stop-missing-nvp' : 'idle-missing-nvp',
            reason: 'EVCS-Speicherschutz: NVP-Messwert fehlt – Speicher sicher stoppen',
        };
    }

    // Physikalische Last hinter dem NVP ohne Speicherwirkung:
    // D = NVP + Speicher-Ist. Daraus entstehen zwei getrennte Ziele:
    // - Gesamtziel: Laden nur bei echtem Gesamtueberschuss.
    // - Hausziel: Entladen nur fuer den Anteil ohne geschuetzte EVCS-Leistung.
    // Fuer die Ladefreigabe darf weiterhin nur ein frischer physischer Istwert
    // beziehungsweise konservativ ein positiver letzter Befehl dienen. Fuer die
    // Entladebegrenzung darf eine kurze asynchrone Telemetrieluecke dagegen nicht
    // auf 0 W fallen: Dort wird der vom Aufrufer bestaetigte physische Messanker oder
    // ein zeitlich begrenzter, per Readback akzeptierter Kommandoanker verwendet.
    // Dadurch entstehen bei aktiver EVCS-Ladung keine Entladen -> 0 W -> Entladen-
    // Pulse zwischen zwei Batterie-Telemetrieproben.
    const chargeBasisStorageW = storageActualKnown ? storageActualW : Math.max(0, lastTargetW);
    const dischargeBasisStorageW = storageActualKnown
        ? storageActualW
        : (storageDischargeBasisKnown ? storageDischargeBasisW : 0);
    const totalDesiredW = chargeBasisStorageW + nvpW - targetNvpW;
    const houseDesiredW = protectedLoadUnknown ? null : dischargeBasisStorageW + nvpW - targetNvpW - protectedLoadW;
    const chargeAllowanceW = Math.max(0, -totalDesiredW);
    // With unknown EV load, NVP cannot distinguish house from protected vehicle.
    // Pause discharge; real net surplus may still charge the storage.
    const dischargeAllowanceW = protectedLoadUnknown ? 0 : Math.max(0, houseDesiredW);
    const actionThresholdW = activeThresholdW;

    let targetW = requestedW;
    let action = 'pass';
    let chargeStop = false;
    let dischargeStop = false;
    let chargeFromSurplus = false;

    const commandEpsilonW = 1;
    const lastChargeCommandW = lastTargetW < -commandEpsilonW ? Math.abs(lastTargetW) : 0;
    const lastDischargeCommandW = lastTargetW > commandEpsilonW ? lastTargetW : 0;

    if (requestedW < 0) {
        const allowedChargeW = chargeAllowanceW > actionThresholdW ? chargeAllowanceW : 0;
        targetW = allowedChargeW > 0 ? -Math.min(Math.abs(requestedW), allowedChargeW) : 0;
        chargeFromSurplus = targetW < 0;
        // Ein nur intern berechneter, aber noch nie geschriebener Lade-Request braucht
        // keinen 0-W-Write. Ein echter Stop ist nur bei aktivem letzten Kommando oder
        // physisch sichtbarer Ladung erforderlich.
        if (targetW === 0) {
            chargeStop = lastChargeCommandW > 0 || actualChargeActive;
            dischargeStop = lastDischargeCommandW > 0 || actualDischargeActive;
        }
        action = chargeStop
            ? 'stop-charge-no-surplus'
            : (dischargeStop
                ? 'stop-discharge-before-blocked-charge'
                : (targetW === 0
                    ? 'suppress-charge-no-surplus'
                    : (Math.abs(targetW - requestedW) > 0.5 ? 'cap-charge-to-surplus' : 'allow-charge-from-surplus')));
    } else if (requestedW > 0) {
        const allowedDischargeW = dischargeAllowanceW > actionThresholdW ? dischargeAllowanceW : 0;
        targetW = allowedDischargeW > 0 ? Math.min(requestedW, allowedDischargeW) : 0;
        if (targetW === 0) {
            chargeStop = lastChargeCommandW > 0 || actualChargeActive;
            dischargeStop = lastDischargeCommandW > 0 || actualDischargeActive;
        }
        action = dischargeStop
            ? 'stop-discharge-evcs-only'
            : (chargeStop
                ? 'stop-charge-before-blocked-discharge'
                : (targetW === 0
                    ? 'suppress-discharge-evcs-only'
                    : (Math.abs(targetW - requestedW) > 0.5 ? 'cap-discharge-to-house' : 'allow-house-discharge')));
    } else if (lastChargeCommandW > 0) {
        const allowedChargeW = chargeAllowanceW > actionThresholdW ? chargeAllowanceW : 0;
        targetW = allowedChargeW > 0 ? -Math.min(lastChargeCommandW, allowedChargeW) : 0;
        chargeFromSurplus = targetW < 0;
        chargeStop = targetW === 0;
        action = chargeStop
            ? 'stop-held-charge-no-surplus'
            : (Math.abs(targetW - lastTargetW) > 0.5 ? 'cap-held-charge-to-surplus' : 'hold-charge-from-surplus');
    } else if (lastDischargeCommandW > 0) {
        const allowedDischargeW = dischargeAllowanceW > actionThresholdW ? dischargeAllowanceW : 0;
        targetW = allowedDischargeW > 0 ? Math.min(lastDischargeCommandW, allowedDischargeW) : 0;
        dischargeStop = targetW === 0;
        action = dischargeStop
            ? 'stop-held-discharge-evcs-only'
            : (Math.abs(targetW - lastTargetW) > 0.5 ? 'cap-held-discharge-to-house' : 'hold-house-discharge');
    } else {
        targetW = 0;
        chargeStop = actualChargeActive && chargeAllowanceW <= actionThresholdW;
        dischargeStop = actualDischargeActive && dischargeAllowanceW <= actionThresholdW;
        if (chargeStop) action = 'stop-untracked-charge-no-surplus';
        else if (dischargeStop) action = 'stop-untracked-discharge-evcs-only';
        else action = 'idle-no-active-command';
    }

    if (protectedLoadUnknown && targetW === 0) {
        // A zero stop must pass the existing no-write/hold firewall, including
        // vendor self-control with no remembered EOS command after a restart.
        dischargeStop = true;
        action = 'stop-discharge-evcs-load-unknown';
    }
    const explicitStop = chargeStop || dischargeStop;
    const reason = protectedLoadUnknown
        ? (targetW < 0
            ? 'EVCS-Speicherschutz: Fahrzeuglast unbekannt – nur echten Gesamtueberschuss laden'
            : 'EVCS-Speicherschutz: Fahrzeuglast unbekannt – Entladung voruebergehend gesperrt')
        : chargeStop
        ? 'EVCS-Speicherschutz: Laden stoppen – kein tatsaechlicher Gesamtueberschuss am NVP'
        : (dischargeStop
            ? 'EVCS-Speicherschutz: Entladen stoppen – nur geschuetzte E-Mobilitaet verursacht den Bedarf'
            : (targetW < 0
                ? 'EVCS-Speicherschutz: Laden nur aus tatsaechlichem Gesamtueberschuss'
                : (targetW > 0
                    ? 'EVCS-Speicherschutz: Entladen nur fuer Haus-/sonstigen Verbrauch ohne E-Mobilitaet'
                    : 'EVCS-Speicherschutz: Speicher wartet')));

    return {
        active: true,
        requestedW,
        targetW,
        lastTargetW,
        protectedLoadW,
        protectedLoadUnknown,
        nvpW,
        targetNvpW,
        storageActualW: storageActualKnown ? storageActualW : null,
        storageActualKnown,
        storageDischargeBasisW: storageDischargeBasisKnown ? storageDischargeBasisW : null,
        storageDischargeBasisKnown,
        storageDischargeBasisSource,
        chargeBasisStorageW,
        dischargeBasisStorageW,
        totalDesiredW,
        houseDesiredW,
        chargeAllowanceW,
        dischargeAllowanceW,
        explicitStop,
        chargeStop,
        dischargeStop,
        chargeFromSurplus,
        action,
        reason,
    };
}

/**
 * Finale herstellerunabhaengige Anti-Export-Regel fuer positive Speicherentladung.
 *
 * Der Regler fuehrt keinen pauschalen Sofort-Stopp aus. Ein frischer NVP-Wert
 * begrenzt die Entladung proportional auf die physikalisch noch benoetigte
 * Leistung. Unterschreitet der NVP das Ziel, wird der Sollwert innerhalb einer
 * kurzen Grace-Zeit (Standard 2 s) gleitend abgesenkt. Bleibt die Einspeisung
 * danach bestehen, darf jede neue NVP-Probe den bereits akzeptierten Befehl um
 * genau die neue NVP-Abweichung weiter reduzieren. Derselbe Messwert wird nicht
 * mehrfach integriert.
 *
 * Vorzeichen:
 * - NVP +W = Netzbezug, -W = Einspeisung
 * - Speicher +W = Entladen, -W = Laden
 */
function resolveStorageAntiExportTarget(input = {}) {
    const finite = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
    const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
    const requestedW = finite(input.requestedTargetW) ? Number(input.requestedTargetW) : 0;
    const requestedDischargeW = Math.max(0, requestedW);
    const commandAnchorW = Math.max(0, finite(input.commandAnchorW) ? Number(input.commandAnchorW) : 0);
    const storageActualKnown = finite(input.storageActualW);
    const storageActualW = storageActualKnown ? Number(input.storageActualW) : null;
    const nvpW = finite(input.nvpW) ? Number(input.nvpW) : null;
    const targetNvpW = finite(input.targetNvpW) ? Number(input.targetNvpW) : 0;
    const deadbandW = Math.max(0, finite(input.deadbandW) ? Number(input.deadbandW) : 50);
    const now = finite(input.now) ? Number(input.now) : Date.now();
    const graceMs = Math.max(500, Math.min(10000, finite(input.graceMs) ? Number(input.graceMs) : 2000));
    const nvpSampleTs = finite(input.nvpSampleTs) && Number(input.nvpSampleTs) > 0 ? Number(input.nvpSampleTs) : 0;
    const epsilonW = Math.max(0.5, finite(input.epsilonW) ? Number(input.epsilonW) : 1);
    const previous = input.state && typeof input.state === 'object' ? input.state : {};
    const resetState = { activeSinceMs: 0, lastProcessedNvpSampleTs: 0, lastOutputW: 0 };

    if (requestedDischargeW <= epsilonW) {
        return {
            active: false,
            requestedW,
            targetW: requestedW,
            status: 'inactive-no-discharge',
            reason: '',
            nvpW,
            targetNvpW,
            deadbandW,
            graceMs,
            exportActive: false,
            belowTarget: false,
            explicitStop: false,
            capped: false,
            capW: null,
            physicalBaseW: storageActualKnown ? storageActualW : commandAnchorW,
            storageActualW,
            storageActualKnown,
            commandAnchorW,
            activeAgeMs: 0,
            nvpSampleTs,
            sampleRatchetApplied: false,
            nextState: resetState,
        };
    }

    if (nvpW === null) {
        return {
            active: false,
            requestedW,
            targetW: requestedW,
            status: 'inactive-missing-nvp',
            reason: 'NVP-Anti-Export: kein frischer signierter NVP-Wert',
            nvpW: null,
            targetNvpW,
            deadbandW,
            graceMs,
            exportActive: false,
            belowTarget: false,
            explicitStop: false,
            capped: false,
            capW: null,
            physicalBaseW: storageActualKnown ? storageActualW : commandAnchorW,
            storageActualW,
            storageActualKnown,
            commandAnchorW,
            activeAgeMs: 0,
            nvpSampleTs,
            sampleRatchetApplied: false,
            nextState: resetState,
        };
    }

    const nvpErrorW = nvpW - targetNvpW;
    const physicalBaseKnown = storageActualKnown || commandAnchorW > epsilonW;
    const physicalBaseW = storageActualKnown ? Number(storageActualW) : commandAnchorW;
    const physicalCapW = physicalBaseKnown ? Math.max(0, physicalBaseW + nvpErrorW) : null;
    const proportionalTargetW = physicalCapW === null
        ? requestedDischargeW
        : Math.min(requestedDischargeW, physicalCapW);
    const belowTarget = nvpW < targetNvpW;
    const exportActive = nvpW < (targetNvpW - deadbandW);

    // Ohne frischen Istwert und ohne bereits akzeptierten Entladebefehl ist bei
    // vorhandenem Netzbezug kein belastbarer physikalischer Ausgangspunkt fuer
    // einen Vorab-Cap vorhanden. Die vorgelagerte NVP-Regelung darf dann ihren
    // ersten absoluten Sollwert setzen. Sobald der Befehl akzeptiert ist, dient
    // er im Folgetick als Kommandoanker. Bei bestehender Einspeisung gilt diese
    // Ausnahme bewusst nicht: Dort darf ohne sicheren Anker keine neue Entladung
    // gestartet werden.
    if (!belowTarget && !physicalBaseKnown) {
        return {
            active: false,
            requestedW,
            targetW: requestedW,
            status: 'pass-no-physical-anchor',
            reason: '',
            nvpW,
            targetNvpW,
            nvpErrorW,
            deadbandW,
            graceMs,
            exportActive: false,
            belowTarget: false,
            explicitStop: false,
            capped: false,
            capW: null,
            proportionalTargetW: requestedW,
            physicalBaseW: null,
            storageActualW,
            storageActualKnown,
            commandAnchorW,
            activeAgeMs: 0,
            nvpSampleTs,
            sampleRatchetApplied: false,
            nextState: resetState,
        };
    }

    // Besteht bereits Einspeisung und gibt es weder einen frischen Istwert noch
    // einen zuvor akzeptierten Entladebefehl, darf kein neuer Entladevorgang
    // gestartet werden. Das ist kein Abbruch einer laufenden Regelung, sondern
    // verhindert einen neuen, physikalisch nicht begruendbaren Exportbefehl.
    if (belowTarget && !physicalBaseKnown) {
        return {
            active: true,
            requestedW,
            targetW: 0,
            status: 'block-new-discharge-without-anchor',
            reason: `NVP-Anti-Export: keine neue Entladung ohne Ist-/Kommandoanker bei NVP ${Math.round(nvpW)} W`,
            nvpW,
            targetNvpW,
            nvpErrorW,
            deadbandW,
            graceMs,
            exportActive,
            belowTarget: true,
            explicitStop: false,
            capped: true,
            capW: 0,
            proportionalTargetW: 0,
            physicalBaseW: null,
            storageActualW,
            storageActualKnown,
            commandAnchorW,
            activeAgeMs: 0,
            nvpSampleTs,
            sampleRatchetApplied: false,
            nextState: resetState,
        };
    }

    if (!belowTarget) {
        const targetW = Math.max(0, proportionalTargetW);
        const capped = targetW + epsilonW < requestedDischargeW;
        return {
            active: capped,
            requestedW,
            targetW,
            status: capped ? 'cap-to-nvp-headroom' : 'pass',
            reason: capped
                ? `NVP-Anti-Export: Entladung auf ${Math.round(targetW)} W begrenzt (NVP ${Math.round(nvpW)} W, Ziel ${Math.round(targetNvpW)} W)`
                : '',
            nvpW,
            targetNvpW,
            nvpErrorW,
            deadbandW,
            graceMs,
            exportActive: false,
            belowTarget: false,
            explicitStop: false,
            capped,
            capW: physicalCapW,
            proportionalTargetW,
            physicalBaseW,
            storageActualW,
            storageActualKnown,
            commandAnchorW,
            activeAgeMs: 0,
            nvpSampleTs,
            sampleRatchetApplied: false,
            nextState: resetState,
        };
    }

    const previousSinceMs = finite(previous.activeSinceMs) && Number(previous.activeSinceMs) > 0
        ? Number(previous.activeSinceMs)
        : now;
    const activeSinceMs = Math.min(previousSinceMs, now);
    const activeAgeMs = Math.max(0, now - activeSinceMs);
    const previousOutputW = finite(previous.lastOutputW) ? Math.max(0, Number(previous.lastOutputW)) : null;
    let lastProcessedNvpSampleTs = finite(previous.lastProcessedNvpSampleTs)
        ? Math.max(0, Number(previous.lastProcessedNvpSampleTs))
        : 0;
    if (!lastProcessedNvpSampleTs && nvpSampleTs > 0) lastProcessedNvpSampleTs = nvpSampleTs;

    // Der Startwert darf den aktuellen Request nie vergroessern. Innerhalb der
    // 2-s-Grace wird gleitend vom zuletzt akzeptierten Befehl zum physikalischen
    // NVP-Cap gefahren. Mindestens 25 % der Korrektur greifen sofort; dadurch
    // wird nicht zwei Sekunden blind weiter entladen, aber auch kein pauschaler
    // Sofort-Stopp erzeugt.
    const startW = Math.min(
        requestedDischargeW,
        commandAnchorW > epsilonW
            ? commandAnchorW
            : (previousOutputW !== null && previousOutputW > epsilonW ? previousOutputW : requestedDischargeW),
    );
    let targetW = proportionalTargetW;
    let sampleRatchetApplied = false;
    let ratchetCapW = null;

    if (activeAgeMs < graceMs) {
        const progress = clamp01(Math.max(0.25, activeAgeMs / graceMs));
        const endW = Math.min(startW, proportionalTargetW);
        targetW = Math.max(0, startW + ((endW - startW) * progress));
    } else {
        // Nach der Grace darf derselbe NVP-Messwert nicht in jedem EMS-Tick erneut
        // abgezogen werden. Nur eine neue Messprobe darf den akzeptierten Befehl
        // weiter absenken. Zwischen zwei Proben wird der letzte Anti-Export-Wert
        // gehalten beziehungsweise durch einen frischeren physischen Cap reduziert.
        let sustainedCapW = proportionalTargetW;
        if (previousOutputW !== null) sustainedCapW = Math.min(sustainedCapW, previousOutputW);
        const newNvpSample = nvpSampleTs > 0 && nvpSampleTs !== lastProcessedNvpSampleTs;
        if (newNvpSample) {
            const ratchetBaseW = commandAnchorW > epsilonW
                ? commandAnchorW
                : (previousOutputW !== null ? previousOutputW : requestedDischargeW);
            ratchetCapW = Math.max(0, ratchetBaseW + nvpErrorW);
            sustainedCapW = Math.min(sustainedCapW, ratchetCapW);
            lastProcessedNvpSampleTs = nvpSampleTs;
            sampleRatchetApplied = true;
        }
        targetW = Math.max(0, Math.min(requestedDischargeW, sustainedCapW));
    }

    if (targetW < epsilonW) targetW = 0;
    const explicitStop = activeAgeMs >= graceMs && targetW === 0;
    const capped = targetW + epsilonW < requestedDischargeW;
    const status = explicitStop
        ? 'stop-after-grace'
        : (activeAgeMs < graceMs
            ? (exportActive ? 'ramp-down-export-grace' : 'ramp-down-below-target-grace')
            : (sampleRatchetApplied
                ? 'ramp-down-new-nvp-sample'
                : (exportActive ? 'hold-ramp-export' : 'hold-ramp-below-target')));
    const reason = explicitStop
        ? `NVP-Anti-Export: Entladung nach ${Math.round(activeAgeMs)} ms unter Ziel/Einspeisung auf 0 W reduziert`
        : `NVP-Anti-Export: Entladung proportional auf ${Math.round(targetW)} W reduziert (NVP ${Math.round(nvpW)} W, Ziel ${Math.round(targetNvpW)} W, aktiv ${Math.round(activeAgeMs)} ms)`;

    return {
        active: true,
        requestedW,
        targetW,
        status,
        reason,
        nvpW,
        targetNvpW,
        nvpErrorW,
        deadbandW,
        graceMs,
        exportActive,
        belowTarget,
        explicitStop,
        capped,
        capW: physicalCapW,
        proportionalTargetW,
        ratchetCapW,
        physicalBaseW,
        storageActualW,
        storageActualKnown,
        commandAnchorW,
        activeSinceMs,
        activeAgeMs,
        nvpSampleTs,
        sampleRatchetApplied,
        nextState: {
            activeSinceMs,
            lastProcessedNvpSampleTs,
            lastOutputW: targetW,
        },
    };
}

/**
 */
/**
 * Klasse: RollingWindow
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
class RollingWindow {
    /**
     */
    constructor(maxSeconds) {
        this.maxSeconds = Math.max(1, Number(maxSeconds) || 120);
        /** @type {Array<{t:number, v:number}>} */
        this.samples = [];
        this.sum = 0;
    }

    /**
     */
    /**
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    setMaxSeconds(maxSeconds) {
        const s = Math.max(1, Number(maxSeconds) || 120);
        if (s !== this.maxSeconds) {
            this.maxSeconds = s;
            // force purge to new horizon
            this._purge(Date.now());
        }
    }

    /**
     */
    /**
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _purge(nowMs) {
        const cutoff = nowMs - this.maxSeconds * 1000;
        while (this.samples.length && this.samples[0].t < cutoff) {
            const s = this.samples.shift();
            this.sum -= s.v;
        }
        if (this.samples.length === 0) this.sum = 0;
    }

    /**
     */
    /**
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    push(v, nowMs) {
        const n = Number(v);
        if (!Number.isFinite(n)) return;
        const t = Number(nowMs) || Date.now();
        this.samples.push({ t, v: n });
        this.sum += n;
        this._purge(t);
    }

    /**
     */
    /**
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    mean() {
        if (!this.samples.length) return null;
        return this.sum / this.samples.length;
    }
    /**
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    count() {
        return this.samples.length;
    }
}

/**
 * Hysterese-Schalter: "eins" erst oberhalb onAbove, "aus" erst unterhalb offBelow.
 * Dazwischen bleibt der vorherige Zustand (prev) erhalten.
 *
 * @param {boolean|null|undefined} prev
 * @param {number} x
 * @param {number} offBelow
 * @param {number} onAbove
 * @returns {boolean}
 */
/**
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function hystAbove(prev, x, offBelow, onAbove) {
    const p = (prev === true);
    if (!Number.isFinite(x)) return p;
    if (x <= offBelow) return false;
    if (x >= onAbove) return true;
    return p;
}

/**
 * Hysterese-Schalter: "eins" erst unterhalb onBelow, "aus" erst oberhalb offAbove.
 * Dazwischen bleibt der vorherige Zustand (prev) erhalten.
 *
 * @param {boolean|null|undefined} prev
 * @param {number} x
 * @param {number} onBelow
 * @param {number} offAbove
 * @returns {boolean}
 */
/**
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function hystBelow(prev, x, onBelow, offAbove) {
    const p = (prev === true);
    if (!Number.isFinite(x)) return p;
    if (x <= onBelow) return true;
    if (x >= offAbove) return false;
    return p;
}

/**
 * Speicher-Regelung (Schritt 2)
 *
 * Ziele:
 * - Lastspitzenkappung über den Speicher (Entladen bei Überlast)
 * - Eigenverbrauchsoptimierung (PV-Überschuss laden; optional Entladen zur Reduktion des Netzbezugs)
 * - Notstrom-Reserve (Entladen unter Mindest-SoC verhindern; optional Reserve über PV/Netz wieder auffüllen)
 * - Zusammenarbeit mit Tarif/VIS (manuelle Speicherleistung aus VIS berücksichtigen)
 *
 * Gate E (Serienreife): Multiuse-Speicherstrategie
 * - getrennte SoC-Bereiche/Schwellen für:
 *   - Notstrom (Reserve)
 *   - Eigenverbrauch (Entladen optional)
 *   - LSK (Lastspitzenkappung / Peak-Shaving)
 * - LSK: separate Limits für Be-/Entladung (maxChargeW/maxDischargeW) möglich
 *
 * Hinweis:
 * - Alle drei AppCenter-Steuerungsarten schreiben produktiv: Sollleistung, Leistungsgrenzen und Freigabe-Flags.
 * - Manuell zugeordnete Objekt-IDs bleiben herstellerunabhaengig und laufen durch dieselben zentralen Gates.
 */
/**
 */
/**
 * Klasse: SpeicherRegelungModule
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
class SpeicherRegelungModule extends BaseModule {
    /**
     */
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);

        /** @type {number|null} */
        this._lastTargetW = null;
        /** @type {number} */
        this._lastTargetWriteMs = 0;
        /** @type {string} */
        this._lastReason = '';
        /** @type {string} */
        this._lastSource = '';
        /** @type {number|null} Final wirksame SoC-Untergrenze fuer optionale Reserve-DPs. */
        this._effectiveReserveSocPct = null;

        // Herstellerunabhaengiger Batterie-Istwert-Puffer fuer das geschlossene
        // NVP-Balancing. Viele Speicher/Adapter aktualisieren NVP und Batterie-
        // Istleistung nicht im selben EMS-Tick. Der letzte valide Messwert bleibt
        // deshalb fuer eine begrenzte Zeit als unveraenderlicher Regelanker erhalten.
        // WICHTIG: Ein geschriebener Sollwert wird niemals als neue Istleistung in
        // diesen Messanker zurueckgefuehrt. Derselbe reale Messwert darf die aktuelle
        // NVP-Abweichung dadurch nur einmal tragen und kann keinen begrenzten oder
        // unbegrenzten Sollwert-Integrator mehr bilden.
        this._batteryBalanceFeedback = {
            key: '',
            objectId: '',
            source: '',
            measuredW: null,
            sampleTs: 0,
            sampleKey: '',
            previousSampleTs: 0,
            sampleIntervalMs: null,
            sampleCadenceMs: null,
        };

        // Kommando-Anker fuer asynchrone Speicher-Telemetrie. Er wird erst nach
        // einem tatsaechlich akzeptierten Hardware-Write gesetzt. Solange derselbe
        // echte Batterie-Messwert gilt, kann die NVP-Bewegung dadurch genau einmal
        // der erwarteten Speicherreaktion zugeordnet werden, ohne denselben
        // NVP-Fehler in jedem EMS-Takt erneut auf den Sollwert zu addieren.
        this._asyncBalanceCommand = null;
        this._pendingAsyncBalanceCommand = null;

        // Exklusive Speicher-Kommandofamilie. Signed-, Split- und herstellerspezifische
        // Sollwertpfade sind Alternativen und duerfen niemals parallel denselben
        // Speicher steuern. Der Marker dient nur der sicheren Uebergabe/Neutralisierung.
        this._lastStorageCommandFamily = '';

        // Finale Anti-Export-Regelung fuer Speicherentladung. Der Zustand merkt
        // ausschliesslich den Beginn einer NVP-Unterschreitung, die zuletzt bereits
        // verarbeitete NVP-Probe und den letzten proportional reduzierten Sollwert.
        // Dadurch kann nach der 2-s-Grace jede neue Messprobe genau einmal weiter
        // abregeln, ohne denselben Exportwert in jedem EMS-Tick zu integrieren.
        this._storageAntiExportState = {
            activeSinceMs: 0,
            lastProcessedNvpSampleTs: 0,
            lastOutputW: 0,
        };

        // --- Anti-Flattern um 0 W ---
        // Richtungswechsel werden bewusst direkt an den jeweils zugeordneten
        // Speicher-/Farm-Ausgang weitergegeben. Die Speichersysteme führen ihren
        // internen Stopp beim Wechsel selbst aus; NexoWatt erzeugt dafür weder eine
        // 0-W-Zwischenrunde noch eine zeitbasierte Vorzeichensperre.

        // Zeitpunkt, wann zuletzt Peak/LSK aktiv entladen hat (für „Refill“/Nachladen-Delay)
        this._lastPeakActiveMs = 0;

        /** @type {number|null} */
        this._lskRefillHeadroomFilteredW = null;
        /** @type {number} */
        this._lskRefillLastTs = 0;

        /** @type {number|null} */
        this._lskRefillHoldW = null;

        /** @type {RollingWindow} */
        this._lskRefillImportWin = new RollingWindow(120);

        // --- SoC-Hysterese gegen Flattern an Grenzwerten ---
        // Default: 0.5 %-Punkte. Ziel: Sobald ein Grenzwert erreicht ist,
        // soll die Regelung sauber bei 0 W „stehen bleiben“ (Ruhephase) und
        // nicht wegen Messrauschen/Quantisierung oder kleiner Gegenregelungen
        // sofort wieder in Laden/Entladen kippen.
        /** @type {number} */
        this._socHystPct = 0.5;

        // Letzte „Enable“-Zustände (Hysterese-Memory)
        /** @type {boolean|null} */
        this._socSelfDischargeEnabled = null;
        /** @type {boolean|null} */
        this._socLskDischargeEnabled = null;
        /** @type {boolean|null} */
        this._socLskRefillEnabled = null;
        /** @type {boolean|null} */
        this._socReserveRefillEnabled = null;

        // --- Tarif-Freigaben (Phase 5): Debounce gegen Flattern ---
        this._tariffGridChargeAllowed = true;
        this._tariffGridChargeAllowedTrueSinceMs = 0;
        this._tariffDischargeAllowed = true;
        this._tariffDischargeAllowedTrueSinceMs = 0;

        // FENECON/OpenEMS-Hybrid besitzt im Automatikmodus eine exklusive,
        // entprellte Reglerumschaltung:
        // - frische PV oberhalb der Freigabeschwelle -> FEMS regelt intern,
        // - frische PV unterhalb der Uebernahmeschwelle -> EOS regelt den Speicher,
        // - fehlende/veraltete PV -> fail-safe FEMS ohne zyklischen EOS-Sollwert.
        // Ein expliziter 0-W-Sicherheits-/Sperrbefehl bleibt jederzeit erlaubt.
        // Der technische EOS-Pfad kann je nach Mapping direkt auf die ESS-Leistung
        // oder nativ auf SetGridActivePower schreiben; beide Pfade bleiben durch
        // den One-Writer-/Watchdog-Handover strikt voneinander getrennt.
        this._feneconGridLastWriteMs = 0;
        this._feneconGridLastSetpointW = null;
        this._feneconGridWasActive = false;
        this._feneconGridReleasedDirectTarget = false;
        this._feneconDirectReleaseUntilMs = 0;
        this._feneconHybridWasExternal = false;
        this._feneconHybridLastMode = '';
        this._feneconHybridAuthority = 'unknown';
        this._feneconHybridPvAboveSinceMs = 0;
        this._feneconHybridPvBelowSinceMs = 0;
        this._feneconHybridPassThroughSinceMs = 0;
        this._feneconHybridHandoverZeroPending = false;

        // RC42: Die vereinfachte NVP-/Gesamtverbrauchsregelung wird zunaechst
        // ausschliesslich als read-only Shadowmodell gerechnet. Dieser Marker
        // dient nur dazu, in inaktiven Profilen alte Diagnosen sauber zu loeschen.
        this._feneconNvpShadowWasActive = false;
        this._feneconNvpShadowLastRunMs = 0;
        this._feneconNvpShadowLastSignature = '';
        this._feneconNvpShadowLastDiag = null;

        // Legacy-Assist-Zustaende bleiben aus Migrationsgruenden vorhanden, werden
        // im neuen FENECON-Hybrid-Automatikmodus aber nicht mehr aktiviert.
        // NVP-Assist-Sollwert erforderlich ist. Unabhängig vom Assist-Modus bleibt
        // der manuell zugeordnete Ausgang watchdog-sicher im zyklischen Schreibpfad.
        this._feneconAssistImportSinceMs = 0;
        this._feneconAssistReleaseSinceMs = 0;
        this._feneconAssistActive = false;

        // Sungrow Hybrid ESS Sondermodus:
        // Der SH/RS/RT/MG-Hybrid wird im externen NexoWatt-Betrieb als geschlossener
        // NVP-Regelkreis gefuehrt. 0 W ist dabei ausschliesslich ein bewusster Stop-
        // oder Wartebefehl. Richtungswechsel werden direkt geschrieben. Kurze
        // NVP-Aussetzer duerfen keinen laufenden
        // Lade-/Entladesollwert durch ein zyklisches 0-W-Schreiben unterbrechen.
        this._sungrowHybridLastMode = '';
        this._sungrowNvpMissingSinceMs = 0;
        // Kurze Inkonsistenzen zwischen zentralem PV-Budget, EVCS-Reservierung
        // und Sungrow-Telemetrie duerfen keinen einzelnen 0-W-Stopp erzeugen.
        // Der Zeitstempel begrenzt den No-Write-Hold auf eine kurze Grace-Zeit.
        this._sungrowPvBudgetZeroSinceMs = 0;
        // Herstellerunabhaengige Grace-Zeit fuer einen einzelnen zentralen
        // PV-/Gesamtbudget-Zyklus mit 0 W. Innerhalb dieser Zeit bleibt ein
        // aktiver Speicherbefehl per No-Write erhalten; 0 W bleibt ein echter Stop.
        this._storageBudgetZeroSinceMs = 0;
        // Herstellerunabhaengige Grace-Zeit fuer eine kurze NVP-/Telemetrieluecke.
        // Innerhalb dieses Fensters bleibt ein aktiver Speicherbefehl erhalten;
        // erst ein anhaltend unbrauchbarer Messwert fuehrt zum Sicherheitsstopp.
        this._storageMeasurementGapSinceMs = 0;

        // Finale Anti-Export-Sicherung fuer Speicherentladung. Ein kurzer
        // Ueberschwinger wird nicht hart auf 0 W gestoppt, sondern innerhalb der
        // konfigurierten Grace-Zeit (Default 2 s) auf einen NVP-kompatiblen
        // Entladesollwert heruntergefuehrt. Die Zustandsmarker sorgen dafuer, dass
        // Hold-/Feed-forward-Pfade den Cap nicht im naechsten Tick wieder aufheben.
        this._storageAntiExportSinceMs = 0;
        this._storageAntiExportReleaseSinceMs = 0;
        this._storageAntiExportStartTargetW = 0;
        this._storageAntiExportLastTargetW = 0;

        // E3/DC RSCP Sondermodus:
        // Der ioBroker.e3dc-rscp Adapter steuert den Speicher ueber zwei gekoppelte
        // EMS-Datenpunkte: SET_POWER_MODE und SET_POWER_VALUE. Dieser Marker dient
        // nur der Diagnose, damit nach Profilwechseln keine alten Statusmeldungen
        // stehen bleiben.
        this._e3dcRscpLastMode = '';

        // NVP-Glättung für die Speicher-Eigenverbrauchsoptimierung:
        // Die Messung am Netzverknüpfungspunkt kann durch Zähler-Latenzen, Speicher-Rampen
        // und Hybrid-Gateways kurz zwischen Bezug und Einspeisung springen. Dieser Filter
        // liefert einen ruhigen Führungswert für die Regelung; harte RAW-Caps bleiben
        // zusätzlich aktiv, damit Anschluss- und 0-Einspeise-Sicherheit erhalten bleiben.
        this._selfNvpFilteredW = null;
        this._selfNvpLastTs = 0;

    }

    /**
     */
    /**
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async init() {
        await this._ensureStates();

        // Optional: zentrale Mess-/Hilfsdatenpunkte registrieren, damit die Regelung auch ohne Peak-Shaving-Modul laufen kann.
        await this._upsertInputsFromConfig();
    }

    /**
     * Fail-closed Lifecycle-Stopp fuer Lizenz-/App-Uebergaenge. Der aktive
     * Einzel- oder Farm-Schreibpfad erhaelt einen echten 0-W-Befehl; ein nicht
     * bestaetigter Stopp wird an den Modulmanager als Fehler zurueckgegeben.
     */
    async deactivate() {
        const outputKeys = [
            'st.targetPowerW', 'st.targetChargePowerW', 'st.targetDischargePowerW',
            'st.maxChargeW', 'st.maxDischargeW', 'st.chargeEnable',
            'st.dischargeEnable', 'st.run', 'st.feneconGridSetpointW',
            'st.e3dcMode', 'st.e3dcValue',
        ];
        const configuredSingleOutput = outputKeys.some((key) => this.dp && typeof this.dp.getEntry === 'function' && this.dp.getEntry(key));
        const authority = this._getStorageControlAuthority();
        const farmConfigured = String(authority && authority.selectedTopology || '') === 'farm'
            && this.adapter && typeof this.adapter.applyStorageFarmTargetW === 'function';
        if (!configuredSingleOutput && !farmConfigured) {
            this._lastTargetW = 0;
            return { ok: true, attempted: 0, stopped: 0 };
        }
        await this._applyTargetW(0, 'module-disabled-safe-stop', 'safety-lifecycle', {
            force: true,
            safetyLifecycle: true,
        });
        const state = await this.adapter.getStateAsync('speicher.regelung.schreibOk').catch(() => null);
        const writeOk = state && state.val === true;
        const acceptedTargetState = await this.adapter.getStateAsync('speicher.regelung.acceptedSollW').catch(() => null);
        const acceptedTargetW = Number(acceptedTargetState && acceptedTargetState.val);
        const stopped = Number.isFinite(acceptedTargetW) ? Math.abs(acceptedTargetW) < 0.5 : Math.abs(Number(this._lastTargetW) || 0) < 0.5;
        if (!writeOk || !stopped) {
            throw new Error(`storage-safe-stop-failed:writeOk=${writeOk}:acceptedW=${Number.isFinite(acceptedTargetW) ? acceptedTargetW : 'unknown'}`);
        }
        return { ok: true, attempted: 1, stopped: 1 };
    }

    /**
     */
    /**
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    /**
     * Ablauf und Zusammenhang: Verknüpft die aktive Speicher-Topologie mit Messwertfrische, SOC, Tarif, Eigenverbrauch, Peak-Shaving und Fahrzeugschutz. Einzelgerät oder Farm besitzt die Stellhoheit; die übrigen Apps liefern Vorgaben und dürfen keinen zweiten Hardware-Schreiber erzeugen.
     */
    async tick() {
        const cfg = this._getCfg();
        const psCfg = this.adapter.config.peakShaving || {};
        const feedbackSource = String(cfg.datapoints && cfg.datapoints.batteryFeedbackSource || '').trim();
        const explicitAppCenterPowerOverride = feedbackSource.startsWith('appcenter-');
        const explicitAppCenterSocOverride = String(cfg.datapoints && cfg.datapoints.socFeedbackSource || '').trim() === 'appcenter-flow-override';

        // Stale-Timeout einmal zentral berechnen (wird für VIS/Tarif und Messwerte genutzt)
        const staleMs = Math.max(1, Math.round(num(cfg.staleTimeoutSec, 15) * 1000));

        // Zentrale Speicher-Steuerhoheit:
        // Tarif, MultiUse, Peak-Shaving und Eigenverbrauch sind ausschliesslich
        // Policies. Sie duerfen niemals selbst einen Hardware-Schreibpfad erzeugen.
        // Genau eine im AppCenter aktive Topologie (`single` oder `farm`) fuehrt.
        const storageAuthorityEarly = this._getStorageControlAuthority();
        const storageFarmCfgEarly = (this.adapter.config && this.adapter.config.storageFarm
            && typeof this.adapter.config.storageFarm === 'object')
            ? this.adapter.config.storageFarm
            : {};
        const gridChargeConfigured = storageAuthorityEarly.selectedTopology === 'farm'
            ? storageFarmCfgEarly.allowGridCharge !== false
            : cfg.allowGridCharge !== false;
        await this._setIfChanged('speicher.regelung.netzLadenKonfiguriert', !!gridChargeConfigured);
        const cfgEnabled = !!storageAuthorityEarly.singleAppActive;
        let autoTarifEnabled = false;
        try {
            // Prefer the already freshness-validated snapshot from the Tarif-Modul.
            const tv = (this.adapter && this.adapter._tarifVis) ? this.adapter._tarifVis : null;
			if (tv && tv.aktiv) {
				// Bugfix (Phase 7/8): Tarif-Modul liefert die VIS-Leistungsgrenze als
				// speicherLeistungW / speicherLeistungAbsW. In manchen Builds fehlte
				// dieses Feld, wodurch Auto-Enable fälschlich deaktiviert wurde.
				let sp = null;
				if (typeof tv.speicherLeistungAbsW === 'number' && Number.isFinite(tv.speicherLeistungAbsW)) {
					sp = Math.abs(tv.speicherLeistungAbsW);
				} else if (typeof tv.speicherLeistungW === 'number' && Number.isFinite(tv.speicherLeistungW)) {
					sp = Math.abs(tv.speicherLeistungW);
				}
				if (typeof sp === 'number') {
					autoTarifEnabled = sp > 0;
				} else if (this.dp) {
					// Fallback: directly read VIS toggle (best-effort).
					const aktiv = this.dp.getBoolean('vis.settings.dynamicTariff', false);
					const age = this.dp.getAgeMs('vis.settings.dynamicTariff');
					if (aktiv && (age === null || age <= staleMs)) {
						const spAbs = Math.abs(this.dp.getNumber('vis.settings.storagePower', 0));
						autoTarifEnabled = spAbs > 0;
					}
				}
			} else if (this.dp) {
                // Fallback: directly read VIS toggle (best-effort).
                const aktiv = this.dp.getBoolean('vis.settings.dynamicTariff', false);
                const age = this.dp.getAgeMs('vis.settings.dynamicTariff');
                if (aktiv && (age === null || age <= staleMs)) {
                    const spAbs = Math.abs(this.dp.getNumber('vis.settings.storagePower', 0));
                    autoTarifEnabled = spAbs > 0;
                }
            }
        } catch {
            autoTarifEnabled = false;
        }

        // Policy-Router: MultiUse erweitert die SoC-/Reserve-Policy, aktiviert aber
        // weder die Einzelregelung noch die Farm. Die Topologie kommt ausschliesslich
        // aus der zentralen AppCenter-Steuerhoheit.
        const installerCfgForMultiUseEarly = (this.adapter && this.adapter.config && this.adapter.config.installerConfig && typeof this.adapter.config.installerConfig === 'object')
            ? this.adapter.config.installerConfig
            : {};
        const storageMultiUseCfgEarly = (installerCfgForMultiUseEarly.storageMultiUse && typeof installerCfgForMultiUseEarly.storageMultiUse === 'object')
            ? installerCfgForMultiUseEarly.storageMultiUse
            : null;
        const multiUsePolicyConfiguredEarly = !!storageMultiUseCfgEarly;
        const multiUseAppPolicyActive = !!storageAuthorityEarly.multiUsePolicyActive;

        const farmRuntimeInfoEarly = (storageAuthorityEarly.farm && typeof storageAuthorityEarly.farm === 'object')
            ? storageAuthorityEarly.farm
            : ((this.adapter && typeof this.adapter._nwGetStorageFarmRuntimeInfo === 'function')
                ? this.adapter._nwGetStorageFarmRuntimeInfo()
                : { active: this._isStorageFarmEnabled(), dispatchActive: false, rows: [] });
        const farmAggregationEnabledEarly = !!storageAuthorityEarly.farmAggregationActive;
        const farmEnabledEarly = storageAuthorityEarly.selectedTopology === 'farm';
        const farmCfgEarly = (this.adapter && this.adapter.config && this.adapter.config.storageFarm && typeof this.adapter.config.storageFarm === 'object')
            ? this.adapter.config.storageFarm
            : {};
        const farmRowsEarly = Array.isArray(farmRuntimeInfoEarly && farmRuntimeInfoEarly.rows) && farmRuntimeInfoEarly.rows.length
            ? farmRuntimeInfoEarly.rows
            : (Array.isArray(farmCfgEarly.storages) ? farmCfgEarly.storages : []);
        const farmAppPolicyActive = !!storageAuthorityEarly.farmDispatchActive;
        const enabled = !!storageAuthorityEarly.writerActive;
        const storageLicensePowerProfile = resolveStorageLicensePowerProfile(
            this.adapter,
            cfg,
            farmRowsEarly,
            storageAuthorityEarly.selectedTopology,
        );
        const storageLicenseHardLimitW = Math.max(0, Number(storageLicensePowerProfile.maxCommandW || 0));

        // Eine einzige NVP-Abstimmung pro aktiver Speicher-Topologie.
        // MultiUse erweitert ausschliesslich SoC-/Reserve-/LSK-Zonen und darf
        // weder fuer den Einzelspeicher noch fuer die Farm ein zweites Zielband
        // einbringen. Der Resolver wird bewusst bereits vor Herstellerprofilen
        // aufgebaut, damit auch Sungrow/FENECON und Feed-forward dieselbe
        // Zielmitte/Messtoleranz verwenden wie der finale Hardwarewriter.
        const storageOperatingPolicy = resolveStorageOperatingPolicy({
            storageConfig: cfg,
            multiUseConfig: storageMultiUseCfgEarly,
            multiUseActive: multiUseAppPolicyActive,
            storageFarmConfig: farmCfgEarly,
            selectedTopology: storageAuthorityEarly.selectedTopology,
            standaloneDefaultEnabled: true,
            standaloneDefaultMinSocPct: 10,
            standaloneDefaultMaxSocPct: 100,
            standaloneDefaultTargetGridImportW: 50,
            standaloneDefaultImportThresholdW: 20,
        });
        const activeStorageNvpTargetW = Math.max(
            0,
            num(storageOperatingPolicy.self && storageOperatingPolicy.self.targetGridImportW, 50),
        );
        const activeStorageNvpHysteresisW = Math.max(
            0,
            num(storageOperatingPolicy.self && storageOperatingPolicy.self.importThresholdW, 20),
        );

        // SoC-Hysterese optional aus Konfig lesen (falls später im Admin ergänzt).
        // Default bleibt 0.5 %-Punkte.
        this._socHystPct = Math.max(0, num(cfg.socHystPct, this._socHystPct));

        // Diagnose: aktiv
        await this._setIfChanged('speicher.regelung.aktiv', enabled);
        await this._setIfChanged('speicher.regelung.aktivKonfig', cfgEnabled);
        await this._setIfChanged('speicher.regelung.aktivAutoTarif', autoTarifEnabled);
        await this._setIfChanged('speicher.regelung.aktivAutoMultiUse', multiUseAppPolicyActive);
        await this._setIfChanged('speicher.regelung.aktivAutoSpeicherfarm', farmAppPolicyActive);
        await this._setIfChanged('speicher.regelung.topologie', String(storageAuthorityEarly.selectedTopology || 'none'));
        await this._setIfChanged('speicher.regelung.topologieGrund', String(storageAuthorityEarly.reason || ''));
        await this._setIfChanged('speicher.regelung.topologieJson', JSON.stringify({
            selectedTopology: storageAuthorityEarly.selectedTopology || 'none',
            writerActive: !!storageAuthorityEarly.writerActive,
            singleAppActive: !!storageAuthorityEarly.singleAppActive,
            singleSuppressedByFarm: !!storageAuthorityEarly.singleSuppressedByFarm,
            farmAggregationActive: !!farmAggregationEnabledEarly,
            farmDispatchActive: !!storageAuthorityEarly.farmDispatchActive,
            multiUsePolicyActive: !!multiUseAppPolicyActive,
            tariffPolicyActive: !!autoTarifEnabled,
            reason: String(storageAuthorityEarly.reason || ''),
        }));
        await this._setIfChanged('speicher.regelung.licensePowerProfile', String(storageLicensePowerProfile.id || 'none'));
        await this._setIfChanged('speicher.regelung.licensePowerLimitW', storageLicenseHardLimitW > 0 ? Math.round(storageLicenseHardLimitW) : 0);
        await this._setIfChanged('speicher.regelung.ratedPowerW', Math.round(Number(storageLicensePowerProfile.configuredRatedPowerW || 0)));

        // Wenn effektiv deaktiviert: nur Diagnose aktualisieren – KEINE Setpoints schreiben.
        // (Wichtig, damit keine "0" als externe Vorgabe an ein Speichersystem gesendet wird.)
        if (!enabled) {
            await this._setIfChanged('speicher.regelung.quelle', 'aus');
            await this._setIfChanged('speicher.regelung.grund', 'Deaktiviert');
            await this._setIfChanged('speicher.regelung.schreibStatus', 'deaktiviert');
            await this._setIfChanged('speicher.regelung.schreibOk', false);
            await this._setIfChanged('speicher.regelung.policyBlocked', false);
            await this._setIfChanged('speicher.regelung.policyBlockReason', '');
            await this._setIfChanged('speicher.regelung.policySource', 'inactive');
            await this._setIfChanged('speicher.regelung.lastWriteRaw', null);
            await this._setIfChanged('speicher.regelung.commandAcceptedTs', null);
            await this._setIfChanged('speicher.regelung.commandAcceptedTargetW', null);
            await this._setIfChanged('speicher.regelung.commandAcceptedSource', '');

            // Phase 2 Diagnose: wenn deaktiviert, Request/Dispatcher auf 0 setzen
            await this._setIfChanged('speicher.regelung.requestW', null);
            await this._setIfChanged('speicher.regelung.requestQuelle', 'aus');
            await this._setIfChanged('speicher.regelung.requestGrund', 'Deaktiviert');
            await this._setIfChanged('speicher.regelung.dispatcherJson', JSON.stringify({ ts: Date.now(), disabled: true, reason: 'Deaktiviert' }));
            await this._setStorageNvpBalanceDiag(null);
            await this._setIfChanged('speicher.regelung.batteryPowerBalanceTrusted', false);
            await this._setIfChanged('speicher.regelung.batteryPowerFeedbackMode', 'inactive');
            await this._setIfChanged('speicher.regelung.batteryPowerFeedbackMeasuredW', null);
            await this._setIfChanged('speicher.regelung.batteryPowerFeedbackBasisW', null);
            await this._setIfChanged('speicher.regelung.batteryPowerFeedbackAgeMs', null);
            await this._setIfChanged('speicher.regelung.batteryPowerFeedbackSampleTs', null);
            await this._setIfChanged('speicher.regelung.batteryPowerFeedbackSampleUpdated', false);
            await this._setIfChanged('speicher.regelung.batteryPowerFeedbackSampleIntervalMs', null);
            await this._setIfChanged('speicher.regelung.batteryPowerFeedbackCadenceMs', null);
            await this._setIfChanged('speicher.regelung.batteryPowerFeedbackHeld', false);
            await this._setIfChanged('speicher.regelung.batteryPowerFeedbackPredicted', false);
            await this._setIfChanged('speicher.regelung.batteryPowerFeedbackPredictionDeltaW', 0);
            await this._setIfChanged('speicher.regelung.pvBudgetAllocationMode', '');
            await this._setIfChanged('speicher.regelung.pvBudgetRemainingBeforeStorageW', 0);
            await this._setIfChanged('speicher.regelung.pvBudgetStorageAvailableW', 0);
            await this._setIfChanged('speicher.regelung.pvBudgetReservedW', 0);
            await this._setIfChanged('speicher.regelung.pvBudgetPostVendorCapW', 0);
            await this._setIfChanged('speicher.regelung.pvBudgetPostVendorCapped', false);
            await this._setIfChanged('speicher.regelung.pvBudgetPostVendorNoWriteHold', false);
            await this._setIfChanged('speicher.regelung.pvBudgetPostVendorNoWriteReason', '');
            await this._setIfChanged('speicher.regelung.pvBudgetRuntimeRemainingW', 0);
            await this._setIfChanged('speicher.regelung.pvBudgetAllocationDerivedW', 0);
            await this._setIfChanged('speicher.regelung.pvBudgetEvcsReservedW', 0);
            await this._setIfChanged('speicher.regelung.pvBudgetResolution', 'disabled');
            await this._setIfChanged('speicher.regelung.totalBudgetStorageAvailableW', 0);
            await this._setIfChanged('speicher.regelung.totalBudgetStorageReservedW', 0);
            await this._setIfChanged('speicher.regelung.totalBudgetStorageCapped', false);
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallAction', 'inactive');
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallReason', '');
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallHeldW', 0);
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallExplicitStop', false);
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallBudgetZeroAgeMs', 0);
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallMeasurementGapAgeMs', 0);
            await this._setIfChanged('speicher.regelung.antiExportStatus', 'inactive');
            await this._setIfChanged('speicher.regelung.antiExportJson', JSON.stringify({ active: false, status: 'inactive' }));
            await this._setIfChanged('speicher.regelung.licensePowerLimited', false);
            await this._setIfChanged('speicher.regelung.licensePowerJson', JSON.stringify({
                ts: Date.now(),
                active: false,
                profile: String(storageLicensePowerProfile.id || 'none'),
                label: String(storageLicensePowerProfile.label || ''),
                configuredRatedPowerW: Math.round(Number(storageLicensePowerProfile.configuredRatedPowerW || 0)),
                maxCommandW: Math.round(Number(storageLicensePowerProfile.maxCommandW || 0)),
                limited: false,
            }));
            this._storageAntiExportState = { activeSinceMs: 0, lastProcessedNvpSampleTs: 0, lastOutputW: 0 };

            // Interne Sollwertprognose beim Deaktivieren verwerfen. Es wird dabei
            // bewusst nichts an den Speicher geschrieben; nur die lokale Regel-
            // erinnerung wird geloescht, damit ein spaeteres Reaktivieren nicht mit
            // einem alten Kommando als vermeintlicher Istleistung startet.
            this._lastTargetW = 0;
            this._lastTargetWriteMs = 0;
            this._lastSource = 'aus';
            this._asyncBalanceCommand = null;
            this._pendingAsyncBalanceCommand = null;
            this._sungrowPvBudgetZeroSinceMs = 0;
            this._storageBudgetZeroSinceMs = 0;
            this._storageAntiExportSinceMs = 0;
            this._storageAntiExportReleaseSinceMs = 0;
            this._storageAntiExportStartTargetW = 0;
            this._storageAntiExportLastTargetW = 0;

            // Hybrid-/Gateway-Priorität: Bei deaktivierter Speicherregelung nicht zyklisch auf den
            // Batterie-Sollleistungs-DP schreiben. Dadurch kann das Gateway nach seinem Watchdog
            // wieder vollständig in den Normalmodus gehen.
            try {
                if (this._isFeneconProfileConfigured(cfg) || this._feneconHybridWasExternal || this._feneconGridWasActive || this._feneconNvpShadowWasActive) {
                    await this._setFeneconHybridDiag({
                        active: false,
                        mode: 'disabled',
                        reason: 'Speicherregelung deaktiviert – keine externe Gateway-Vorgabe',
                        writeMode: 'no-write',
                    });
                    await this._updateFeneconNvpShadow({
                        forceInactiveReason: 'storage-control-disabled',
                    });
                    this._feneconHybridWasExternal = false;
                    this._feneconHybridLastMode = 'disabled';
                    this._feneconHybridAuthority = 'unknown';
                    this._feneconHybridPvAboveSinceMs = 0;
                    this._feneconHybridPvBelowSinceMs = 0;
                    this._feneconHybridPassThroughSinceMs = 0;
                    this._feneconHybridHandoverZeroPending = false;
                    this._feneconNvpShadowWasActive = false;
                    this._feneconGridWasActive = false;
                    this._feneconGridReleasedDirectTarget = false;
                    this._feneconAssistActive = false;
                    this._feneconAssistImportSinceMs = 0;
                    this._feneconAssistReleaseSinceMs = 0;
                }
                if (this._isSungrowHybridControlConfigured(cfg) || this._sungrowHybridLastMode) {
                    await this._setSungrowHybridDiag({
                        active: false,
                        mode: 'disabled',
                        reason: 'Speicherregelung deaktiviert – Sungrow-Herstellerprofil in Ruhe',
                        writeMode: 'disabled',
                    });
                    this._sungrowHybridLastMode = 'disabled';
                }
                if (this._isE3dcRscpControlConfigured(cfg) || this._e3dcRscpLastMode) {
                    await this._setE3dcRscpDiag({
                        active: false,
                        mode: 'disabled',
                        reason: 'Speicherregelung deaktiviert – E3/DC-RSCP-Schreibpfad in Ruhe',
                        writeMode: 'disabled',
                    });
                    this._e3dcRscpLastMode = 'disabled';
                }
            } catch {
                // ignore
            }

            return;
        }

        // Mindestvoraussetzungen / Sonderpfade
        const controlMode = String(cfg.controlMode || 'targetPower');

        // Nur die von der zentralen Steuerhoheit ausgewaehlte Farm ist ein
        // beschreibbarer Ausgang. Eine aktive reine Mess-Farm bleibt fuer Anzeige und
        // Aggregation erhalten, beeinflusst aber weder Messbasis noch Writer.
        const farmCfg = farmCfgEarly;
        const farmEnabled = farmEnabledEarly;
        const farmRows = farmRowsEarly;
        const hasFarmSetpoints = storageAuthorityEarly.selectedTopology === 'farm';
        await this._setIfChanged('speicher.regelung.aktivSpeicherfarm', !!hasFarmSetpoints);

        const hasSignedTarget = this.dp ? !!this.dp.getEntry('st.targetPowerW') : false;
        const hasChargeTarget = this.dp ? !!this.dp.getEntry('st.targetChargePowerW') : false;
        const hasDischargeTarget = this.dp ? !!this.dp.getEntry('st.targetDischargePowerW') : false;
        const hasMaxChargeTarget = this.dp ? !!this.dp.getEntry('st.maxChargeW') : false;
        const hasMaxDischargeTarget = this.dp ? !!this.dp.getEntry('st.maxDischargeW') : false;
        const hasChargeEnableTarget = this.dp ? !!this.dp.getEntry('st.chargeEnable') : false;
        const hasDischargeEnableTarget = this.dp ? !!this.dp.getEntry('st.dischargeEnable') : false;
        // Herstellerprofile koennen entweder einen bidirektionalen signed-Sollwert,
        // getrennte Lade-/Entlade-DPs, Leistungsgrenzen oder Richtungsfreigaben anbieten.
        // Jeder im AppCenter gewaehlte Modus bleibt herstellerunabhaengig; einzelne
        // Richtungen duerfen fehlen und werden dann nur fuer diese Richtung gesperrt.
        const hasSplitTarget = hasChargeTarget || hasDischargeTarget;
        const hasLimitTarget = hasMaxChargeTarget || hasMaxDischargeTarget;
        const hasEnableTarget = hasChargeEnableTarget || hasDischargeEnableTarget;
        const storageVendorProfile = this._getStorageVendorProfile(cfg);
        const e3dcRscpProfileConfigured = this._isE3dcRscpControlConfigured(cfg);
        const e3dcRscpConfigured = !!(e3dcRscpProfileConfigured && !hasFarmSetpoints);
        const hasE3dcSetPowerTarget = e3dcRscpConfigured && this.dp
            ? !!(this.dp.getEntry('st.e3dcSetPowerMode') && this.dp.getEntry('st.e3dcSetPowerValueW'))
            : false;
        const hasFeneconGridTarget = !!(this.dp && this.dp.getEntry('st.feneconGridSetpointW'));
        const feneconHybridEligible = this._isFeneconHybridControlConfigured(cfg);
        // Das bestehende direkte FENECON/OpenEMS-Profil bleibt auch bei AC-Systemen
        // unverändert aktiv. Ausschließlich die native FEMS-NVP-Kommandofamilie ist
        // auf echte DC-/Hybridsysteme begrenzt.
        const feneconHybridConfigured = this._isFeneconProfileConfigured(cfg);
        const feneconDirectTargetAvailable = !!(hasSignedTarget || hasSplitTarget);
        const feneconGridEntryEarly = this.dp ? this.dp.getEntry('st.feneconGridSetpointW') : null;
        const feneconEssActualEntryEarly = this.dp ? this.dp.getEntry('st.feneconEssActualPowerW') : null;
        const feneconSignedEntryEarly = this.dp ? this.dp.getEntry('st.targetPowerW') : null;
        const feneconChargeEntryEarly = this.dp ? this.dp.getEntry('st.targetChargePowerW') : null;
        const feneconDischargeEntryEarly = this.dp ? this.dp.getEntry('st.targetDischargePowerW') : null;
        const feneconControlValidation = validateFeneconSingleConfig({
            vendorProfile: this._getStorageVendorProfile(cfg),
            coupling: cfg.coupling,
            feneconControlMode: cfg.feneconControlMode,
            feneconGridSetpointObjectId: feneconGridEntryEarly && feneconGridEntryEarly.objectId,
            feneconEssActualPowerObjectId: feneconEssActualEntryEarly && feneconEssActualEntryEarly.objectId,
            setSignedPowerId: feneconSignedEntryEarly && feneconSignedEntryEarly.objectId,
            setChargePowerId: feneconChargeEntryEarly && feneconChargeEntryEarly.objectId,
            setDischargePowerId: feneconDischargeEntryEarly && feneconDischargeEntryEarly.objectId,
        }, { writableStorageCount: 1, otherWritableStorageCount: 0, directTargetAvailable: feneconDirectTargetAvailable });
        const feneconControlResolution = feneconControlValidation.resolution || resolveFeneconControlMode({
            vendorProfile: this._getStorageVendorProfile(cfg),
            coupling: cfg.coupling,
            feneconControlMode: cfg.feneconControlMode,
        }, { writableStorageCount: 1, otherWritableStorageCount: 0, directTargetAvailable: feneconDirectTargetAvailable });
        const hasFeneconNativeTarget = !!(feneconHybridEligible && feneconControlResolution.mode === 'fems-grid' && hasFeneconGridTarget);
        const supportedControlMode = controlMode === 'targetPower' || controlMode === 'limits' || controlMode === 'enableFlags';
        const hasTarget = controlMode === 'limits'
            ? hasLimitTarget
            : (controlMode === 'enableFlags' ? hasEnableTarget : (hasSignedTarget || hasSplitTarget || hasE3dcSetPowerTarget || hasFeneconNativeTarget));
        const sungrowHybridConfigured = this._isSungrowHybridControlConfigured(cfg);
        // Herstellerprofile gelten ausschliesslich fuer den ausgewaehlten Einzelpfad.
        // In einer Farm bleiben die pro Speicher manuell zugeordneten DPs fuehrend;
        // ein globales Herstellerprofil darf den gemeinsamen Farm-Sollwert nicht
        // umdeuten oder einen parallelen Einzel-Writer aktivieren.
        const feneconHybridBlockedByFarm = !!hasFarmSetpoints;
        // Nur der direkte FENECON/OpenEMS-Pfad nutzt die ältere herstellerspezifische
        // Zielwertlogik. Der native FEMS-NVP-Regler erhält dagegen den bereits durch
        // alle allgemeinen EOS-Policies begrenzten Batterie-Sollwert und übersetzt ihn
        // erst unmittelbar vor dem Hardware-Write in einen Netzpunkt-Sollwert.
        const feneconNativeActive = !!(hasFeneconNativeTarget && !hasFarmSetpoints);
        const feneconDirectProfileActive = !!(
            feneconHybridConfigured
            && !hasFarmSetpoints
            && !feneconNativeActive
            && feneconControlResolution.mode === 'direct-ess'
        );
        // Die Reglerhoheits-Automatik gilt fuer jeden gueltig konfigurierten,
        // exklusiven FENECON-DC/Hybrid-Einzelspeicher – unabhaengig davon, ob
        // EOS technisch den direkten ESS- oder nativen FEMS-NVP-Pfad nutzt.
        const feneconHybridActive = !!(
            feneconHybridEligible
            && !hasFarmSetpoints
            && feneconControlValidation.ok === true
        );
        const sungrowHybridActive = !!(sungrowHybridConfigured && !hasFarmSetpoints);
        await this._setIfChanged('speicher.regelung.herstellerprofil', hasFarmSetpoints ? 'storage-farm' : storageVendorProfile);

        if (feneconHybridEligible && !hasFarmSetpoints && feneconControlValidation.ok !== true) {
            const invalidReason = `FENECON-Konfiguration ungültig: ${String(feneconControlValidation.reason || feneconControlResolution.reason || 'unbekannt')}`;
            await this._setIfChanged('speicher.regelung.requestW', null);
            await this._setIfChanged('speicher.regelung.requestQuelle', 'fenecon-invalid');
            await this._setIfChanged('speicher.regelung.requestGrund', invalidReason);
            await this._setIfChanged('speicher.regelung.sollW', null);
            await this._setIfChanged('speicher.regelung.acceptedSollW', null);
            await this._setIfChanged('speicher.regelung.schreibOk', false);
            await this._setIfChanged('speicher.regelung.schreibStatus', 'fenecon-config-invalid');
            await this._setIfChanged('speicher.regelung.dispatcherJson', JSON.stringify({
                ts: Date.now(),
                reqW: null,
                reason: invalidReason,
                src: 'fenecon-invalid',
                validation: feneconControlValidation,
            }));
            return;
        }

        if (!supportedControlMode) {
            const unsupportedReason = `Steuerungsart nicht unterstützt: ${controlMode}`;
            await this._setIfChanged('speicher.regelung.requestW', 0);
            await this._setIfChanged('speicher.regelung.requestQuelle', 'aus');
            await this._setIfChanged('speicher.regelung.requestGrund', unsupportedReason);
            await this._setIfChanged('speicher.regelung.dispatcherJson', JSON.stringify({ ts: Date.now(), reqW: 0, reason: unsupportedReason, src: 'aus' }));
            await this._applyTargetW(0, unsupportedReason, 'aus');
            return;
        }

        if (!hasTarget && !hasFarmSetpoints) {
            const missingTargetReason = controlMode === 'limits'
                ? 'Leistungsgrenzen-Datenpunkt fehlt: Max Laden und/oder Max Entladen'
                : (controlMode === 'enableFlags'
                    ? 'Freigabe-Datenpunkt fehlt: Laden erlaubt und/oder Entladen erlaubt'
                    : 'Sollleistung-Datenpunkt fehlt: signed Ziel, getrennte Lade-/Entlade-Sollwerte oder E3/DC SET_POWER_MODE + SET_POWER_VALUE');
            await this._setIfChanged('speicher.regelung.requestW', 0);
            await this._setIfChanged('speicher.regelung.requestQuelle', 'aus');
            await this._setIfChanged('speicher.regelung.requestGrund', missingTargetReason);
            await this._setIfChanged('speicher.regelung.dispatcherJson', JSON.stringify({ ts: Date.now(), reqW: 0, reason: missingTargetReason, src: 'aus' }));
            await this._applyTargetW(0, missingTargetReason, 'aus');
            return;
        }

        // Messwerte lesen
        const now = Date.now();

        // PV‑Forecast / PV‑aware Tarif‑Netzlade-Entscheidung (Debug/Policy)
        // Wird weiter unten im Tarif-Block (want < 0) befüllt.
        let pvAwareTariff = null;

        const centralNvp = resolveCurrentNvpSnapshot(this.adapter && this.adapter._nvpFreshnessSnapshot, now, Math.max(staleMs, 10000));
        const centralNvpCurrent = centralNvp.current;
        let gridW = centralNvpCurrent ? (centralNvp.usable ? centralNvp.netW : null) : (this.dp ? this.dp.getNumberFresh('grid.powerW', staleMs, null) : null);
        let gridRawW = centralNvpCurrent ? (centralNvp.usable ? centralNvp.netW : null) : (this.dp ? this.dp.getNumberFresh('grid.powerRawW', staleMs, null) : null);

        if (!centralNvpCurrent) {
            if (typeof gridRawW !== 'number' && this.dp) gridRawW = this.dp.getNumberFresh('ps.gridPowerW', staleMs, null);
            if (typeof gridW !== 'number') {
                const eff = await this._readOwnNumber('peakShaving.control.effectivePowerW');
                if (typeof eff === 'number') gridW = eff;
            }
            if (typeof gridW !== 'number' && typeof gridRawW === 'number') gridW = gridRawW;
        }

        // Fuer die geschlossene NVP-Regelung brauchen wir nicht nur "irgendein"
        // Alter der Netzleistung, sondern getrennt das Alter des gefilterten und
        // des RAW-Werts. Nur so koennen Batterie-Istleistung und NVP-Messung auf
        // zeitliche Plausibilitaet geprueft werden. Asynchrone Werte sind eine
        // Hauptursache fuer wechselnde Lade-/Entlade-Sollwerte.
        const gridFilteredAge = centralNvpCurrent
            ? (Number.isFinite(Number(centralNvp.measurementAgeMs)) ? Number(centralNvp.measurementAgeMs) : Number.POSITIVE_INFINITY)
            : (this.dp && this.dp.getEntry('grid.powerW') ? this.dp.getAgeMs('grid.powerW') : null);
        const gridRawAge = centralNvpCurrent
            ? gridFilteredAge
            : (this.dp
                ? (this.dp.getEntry('grid.powerRawW')
                    ? this.dp.getAgeMs('grid.powerRawW')
                    : (this.dp.getEntry('ps.gridPowerW') ? this.dp.getAgeMs('ps.gridPowerW') : null))
                : null);
        const gridAge = (typeof gridFilteredAge === 'number') ? gridFilteredAge : gridRawAge;

        // SoC fuer Reserve: Die ausgewaehlte Topologie ist exklusiv. Bei Farm-
        // Steuerung gibt es keinen stillen Rueckfall auf einen alten Einzel-SoC.
        let soc = farmEnabled ? null : (this.dp ? this.dp.getNumberFresh('st.socPct', staleMs, null) : null);
        let socAge = farmEnabled ? null : (this.dp ? this.dp.getAgeMs('st.socPct') : null);

        if (farmEnabled) {
            try {
                const stOnline = await this.adapter.getStateAsync('storageFarm.storagesOnline');
                const stDispatch = await this.adapter.getStateAsync('storageFarm.storagesDispatchAvailable');
                const onlineN = stOnline && stOnline.val !== undefined && stOnline.val !== null ? Number(stOnline.val) : NaN;
                const dispatchN = stDispatch && stDispatch.val !== undefined && stDispatch.val !== null ? Number(stDispatch.val) : NaN;
                const hasOnline = Number.isFinite(onlineN) && onlineN > 0;
                const hasDispatchable = Number.isFinite(dispatchN) && dispatchN > 0;

                if (hasOnline || hasDispatchable) {
                    // Für die aktive Farm-Regelung bevorzugen wir frische Online-SoCs.
                    // Wenn Systeme aber nur degraded/stale sind und trotzdem dispatchbar bleiben
                    // (z.B. selten aktualisierte Signed-DPs), nutzen wir den stabilen Farm-SoC.
                    let stSoc = hasOnline ? await this.adapter.getStateAsync('storageFarm.totalSocOnline') : null;
                    let v = stSoc && stSoc.val !== undefined && stSoc.val !== null ? Number(stSoc.val) : NaN;
                    let age = stSoc && typeof stSoc.ts === 'number' ? (now - Number(stSoc.ts)) : null;

                    if (!Number.isFinite(v)) {
                        stSoc = await this.adapter.getStateAsync('storageFarm.totalSoc');
                        v = stSoc && stSoc.val !== undefined && stSoc.val !== null ? Number(stSoc.val) : NaN;
                        age = stSoc && typeof stSoc.ts === 'number' ? (now - Number(stSoc.ts)) : null;
                    }

                    if (Number.isFinite(v) && (age === null || age <= staleMs)) {
                        soc = v;
                        socAge = age;
                    }
                }
            } catch (_e) {
                // ignore
            }
        }

        // Istleistung Batterie (positiv = Entladung, negativ = Beladung)
        // Wird für eine OpenEMS-ähnliche NVP-Balancing-Regelung genutzt (grid + ess - target).
        //
        // Wichtig (Fehlerquelle): Wenn der Installateur versehentlich den gleichen Datenpunkt
        // für Ist- UND Sollleistung mapped (z. B. beide auf Register 706), würde die Regelung
        // "ihre eigene Vorgabe" als Messwert lesen und dadurch massiv überschwingen.
        // -> Deshalb ignorieren wir st.batteryPowerW, wenn er auf das gleiche Objekt wie st.targetPowerW zeigt.
        // Schutz-/Cap-Pfade verwenden weiterhin nur den innerhalb `staleMs`
        // frischen Istwert (`battPowerW`). Fuer das geschlossene NVP-Balancing
        // lesen wir parallel den letzten rohen Messwert (`battPowerObservedW`).
        // Dieser darf spaeter ueber einen begrenzten, herstellerunabhaengigen
        // Feedback-Puffer gehalten werden, ohne stale Werte pauschal fuer alle
        // Sicherheitsentscheidungen freizugeben.
        const measurementTsFor = (key) => {
            if (!this.dp) return null;
            try {
                if (typeof this.dp.getMeasurementTimestampMs === 'function') {
                    const ts = Number(this.dp.getMeasurementTimestampMs(key));
                    if (Number.isFinite(ts) && ts > 0) return ts;
                }
                const entry = typeof this.dp.getEntry === 'function' ? this.dp.getEntry(key) : null;
                const ts = entry && Number(entry.ts);
                return Number.isFinite(ts) && ts > 0 ? ts : null;
            } catch {
                return null;
            }
        };
        let battPowerObservedW = farmEnabled ? null : (this.dp ? this.dp.getNumber('st.batteryPowerW', null) : null);
        let battPowerAge = farmEnabled ? null : (this.dp ? (this.dp.getEntry('st.batteryPowerW') ? this.dp.getAgeMs('st.batteryPowerW') : null) : null);
        let battPowerSampleTs = farmEnabled ? null : measurementTsFor('st.batteryPowerW');
        let battPowerSampleKey = '';
        let battPowerInvalidReason = '';
        let battPowerObjectId = '';
        let battPowerFeedbackSource = farmEnabled ? 'storage-farm' : 'single-storage';
        let battPowerMappingTrusted = !farmEnabled && !!(this.dp && this.dp.getEntry && this.dp.getEntry('st.batteryPowerW'));
        const battPowerAgeKnown = typeof battPowerAge === 'number' && Number.isFinite(battPowerAge);
        let battPowerW = battPowerMappingTrusted
            && typeof battPowerObservedW === 'number'
            && Number.isFinite(battPowerObservedW)
            && (!battPowerAgeKnown || battPowerAge <= staleMs)
            ? Number(battPowerObservedW)
            : null;
        let battPowerTrusted = (typeof battPowerW === 'number' && Number.isFinite(battPowerW));

        if (!farmEnabled) try {
            const eBatt = this.dp ? this.dp.getEntry('st.batteryPowerW') : null;
            const eTarget = this.dp ? this.dp.getEntry('st.targetPowerW') : null;
            const eChargeTarget = this.dp ? this.dp.getEntry('st.targetChargePowerW') : null;
            const eDischargeTarget = this.dp ? this.dp.getEntry('st.targetDischargePowerW') : null;
            const battObj = eBatt && eBatt.objectId ? String(eBatt.objectId) : '';
            battPowerObjectId = battObj;
            battPowerSampleKey = battObj && Number.isFinite(Number(battPowerSampleTs))
                ? `signed:${battObj}@${Math.round(Number(battPowerSampleTs))}`
                : '';
            const targetObjs = [eTarget, eChargeTarget, eDischargeTarget]
                .map(e => e && e.objectId ? String(e.objectId) : '')
                .filter(Boolean);

            // Wichtig für herstellerneutrale Speicher: Die Ist-Leistung darf niemals
            // exakt dasselbe Objekt wie ein zugeordneter Schreib-/Sollwert-DP sein.
            // Objektpfade und Namen sind dagegen vollständig frei: `.ctrl.`, `setpoint`,
            // `chargePowerW` oder `dischargePowerW` können bei Fremdadaptern legitime
            // Messwerte bezeichnen und dürfen eine manuelle AppCenter-Zuordnung nicht
            // pauschal entwerten.
            const sameAsWriteTarget = !!(battObj && targetObjs.some(t => t === battObj));

            if (sameAsWriteTarget) {
                battPowerObservedW = null;
                battPowerW = null;
                battPowerAge = null;
                battPowerSampleTs = null;
                battPowerSampleKey = '';
                battPowerMappingTrusted = false;
                battPowerTrusted = false;
                battPowerInvalidReason = 'Ist-Leistung verweist auf denselben Datenpunkt wie ein Sollwert (Mapping-Fehler)';
            }
        } catch {
            // ignore
        }

        // FENECON DC/Hybrid: Die echte AC-seitige ESS-Aktorleistung
        // (typisch ess0/ActivePower / 604) bleibt für Anzeige, Schutz, SoC- und
        // Leistungsgrenzen autoritativ. Im direkten SetActivePowerEquals-/706-
        // Regelpfad darf sie jedoch nicht als externe Stellgrößenbasis verwendet
        // werden, weil sie interne DC-PV-Beladung enthalten kann. Der NVP-Servo
        // verwendet dafür weiter unten das Readback der aktiven externen Vorgabe.
        if (!farmEnabled && feneconHybridEligible && this.dp && this.dp.getEntry('st.feneconEssActualPowerW')) {
            const feneconActualEntry = this.dp.getEntry('st.feneconEssActualPowerW');
            const actualObservedW = this.dp.getNumber('st.feneconEssActualPowerW', null);
            const actualAgeMs = this.dp.getAgeMs('st.feneconEssActualPowerW');
            const actualSampleTs = measurementTsFor('st.feneconEssActualPowerW');
            if (typeof actualObservedW === 'number' && Number.isFinite(actualObservedW)) {
                battPowerObservedW = actualObservedW;
                battPowerAge = actualAgeMs;
                battPowerSampleTs = actualSampleTs;
                battPowerObjectId = feneconActualEntry && feneconActualEntry.objectId ? String(feneconActualEntry.objectId) : '';
                battPowerSampleKey = battPowerObjectId && Number.isFinite(Number(actualSampleTs))
                    ? `fenecon-ess-active:${battPowerObjectId}@${Math.round(Number(actualSampleTs))}`
                    : '';
                battPowerFeedbackSource = 'fenecon-ess-active-power';
                battPowerMappingTrusted = true;
                battPowerW = actualAgeMs === null || actualAgeMs === undefined || actualAgeMs <= staleMs
                    ? actualObservedW
                    : null;
                battPowerTrusted = typeof battPowerW === 'number' && Number.isFinite(battPowerW);
                battPowerInvalidReason = battPowerTrusted
                    ? 'FENECON: echte AC-seitige ESS-Aktorleistung'
                    : 'FENECON: ESS-Aktorleistung veraltet';
            } else {
                battPowerObservedW = null;
                battPowerW = null;
                battPowerTrusted = false;
                battPowerMappingTrusted = true;
                battPowerFeedbackSource = 'fenecon-ess-active-power';
                battPowerInvalidReason = 'FENECON: ESS-Aktorleistung fehlt/ungültig';
            }
        }

        // AppCenter kann Lade- und Entlade-Istleistung getrennt zuordnen. Wenn
        // kein vertrauenswürdiger signed Istwert vorliegt, bilden wir daraus
        // dieselbe interne Konvention (+W Entladen, -W Laden). Nur exakt identisch
        // als Sollwert gemappte Objekte werden vom Helfer als Messfeedback abgewiesen.
        if (!farmEnabled && !battPowerTrusted) {
            try {
                const splitFeedback = resolveSplitBatteryFeedback(this.dp, cfg, staleMs);
                if (splitFeedback) {
                    battPowerObservedW = splitFeedback.observedW;
                    battPowerAge = splitFeedback.ageMs;
                    battPowerObjectId = splitFeedback.objectIds.join(' | ');
                    battPowerSampleTs = Number.isFinite(Number(splitFeedback.sampleTs))
                        ? Number(splitFeedback.sampleTs)
                        : null;
                    battPowerSampleKey = String(splitFeedback.sampleKey || '');
                    battPowerFeedbackSource = splitFeedback.source;
                    battPowerMappingTrusted = true;
                    battPowerW = splitFeedback.trusted ? splitFeedback.observedW : null;
                    battPowerTrusted = splitFeedback.trusted;
                    battPowerInvalidReason = splitFeedback.reason;
                }
            } catch (_eSplitFeedback) {
                // Ein optionaler Split-Istwert darf die Speicherregelung nicht stoppen.
            }
        }

        // Einzel-DC-/Hybrid-Speicher: optionaler separater PV-Erzeugungswert.
        // Dieser Messwert wird nur als Kontext/Diagnose genutzt; die Batterie-Sollwerte
        // bleiben weiterhin hart am NVP und an den Speichergrenzen begrenzt.
        const storageCoupling = String(cfg.coupling || 'ac').trim().toLowerCase() === 'dc' ? 'dc' : 'ac';
        const dcPvMapped = storageCoupling === 'dc' && !!String(cfg.dcPvPowerObjectId || '').trim();
        const dcPvPowerW = (dcPvMapped && this.dp) ? this.dp.getNumberFresh('st.dcPvPowerW', staleMs, null) : null;
        const dcPvPowerAge = (dcPvMapped && this.dp && this.dp.getEntry('st.dcPvPowerW')) ? this.dp.getAgeMs('st.dcPvPowerW') : null;
        await this._setIfChanged('speicher.regelung.speicherKopplung', storageCoupling);
        await this._setIfChanged('speicher.regelung.dcPvPowerW', (typeof dcPvPowerW === 'number' && Number.isFinite(dcPvPowerW)) ? Math.round(dcPvPowerW) : 0);
        await this._setIfChanged('speicher.regelung.dcPvPowerAlterMs', (typeof dcPvPowerAge === 'number' && Number.isFinite(dcPvPowerAge)) ? Math.round(dcPvPowerAge) : null);

        // Speicherfarm: aggregierte Ist-Leistung nutzen (Netto: Entladen - Laden).
        //
        // Hintergrund:
        // In Farm-Setups ist st.batteryPowerW häufig nur auf einen Einzel-Speicher gemappt
        // oder (Fehler) sogar auf einen Setpoint. Das führt bei NVP-Balancing zu einem
        // stabilen Fehlpunkt (z. B. ~50% Netzbezug).
        //
        // Daher: wenn Farm aktiv ist und die abgeleiteten Summen vorhanden sind,
        // ueberschreiben wir den beobachteten Einzel-Istwert mit der Farm-
        // Nettoleistung. Der strenge `battPowerW` bleibt weiterhin nur innerhalb
        // staleMs gueltig; der spaetere Feedback-Puffer entscheidet separat ueber
        // eine begrenzte Haltezeit fuer das geschlossene NVP-Balancing.
        if (farmEnabled) {
            try {
                const stOnline = await this.adapter.getStateAsync('storageFarm.storagesOnline');
                const stDispatch = await this.adapter.getStateAsync('storageFarm.storagesDispatchAvailable');
                const onlineN = stOnline && stOnline.val !== undefined && stOnline.val !== null ? Number(stOnline.val) : NaN;
                const dispatchN = stDispatch && stDispatch.val !== undefined && stDispatch.val !== null ? Number(stDispatch.val) : NaN;
                const hasOnline = Number.isFinite(onlineN) && onlineN > 0;
                const hasDispatchable = Number.isFinite(dispatchN) && dispatchN > 0;

                if (hasOnline || hasDispatchable) {
                    // Ab 0.8.101 liefert die Farm einen kanonischen signierten Netto-DP.
                    // Dieser Wert verhindert, dass gleichzeitiges Laden und Entladen
                    // verschiedener Speicher als zwei getrennte Feedbackpfade wirken.
                    const stNet = await this.adapter.getStateAsync('storageFarm.totalPowerW');
                    const net = stNet && stNet.val !== undefined && stNet.val !== null ? Number(stNet.val) : NaN;
                    const ageNet = stNet && typeof stNet.ts === 'number' ? (now - Number(stNet.ts)) : null;

                    if (Number.isFinite(net)) {
                        battPowerObservedW = net;
                        battPowerAge = ageNet;
                        battPowerSampleTs = stNet && typeof stNet.ts === 'number' ? Number(stNet.ts) : null;
                        battPowerSampleKey = Number.isFinite(Number(battPowerSampleTs))
                            ? `farm-net@${Math.round(Number(battPowerSampleTs))}`
                            : '';
                        battPowerObjectId = 'storageFarm.totalPowerW';
                        battPowerFeedbackSource = 'storage-farm-net';
                        battPowerMappingTrusted = true;
                        battPowerW = (ageNet === null || ageNet <= staleMs) ? battPowerObservedW : null;
                        battPowerTrusted = typeof battPowerW === 'number' && Number.isFinite(battPowerW);
                        battPowerInvalidReason = hasOnline
                            ? 'Farm: aggregierte Netto-Istleistung'
                            : 'Farm: aggregierte Netto-Istleistung, degraded/dispatchbar';
                    } else {
                        // Kompatibilitätsfallback für alte Runtime-Stände.
                        const stChg = await this.adapter.getStateAsync('storageFarm.totalChargePowerW');
                        const stDchg = await this.adapter.getStateAsync('storageFarm.totalDischargePowerW');
                        const chg = stChg && stChg.val !== undefined && stChg.val !== null ? Number(stChg.val) : NaN;
                        const dchg = stDchg && stDchg.val !== undefined && stDchg.val !== null ? Number(stDchg.val) : NaN;
                        const ageChg = stChg && typeof stChg.ts === 'number' ? (now - Number(stChg.ts)) : null;
                        const ageDchg = stDchg && typeof stDchg.ts === 'number' ? (now - Number(stDchg.ts)) : null;
                        const age = (ageChg === null && ageDchg === null) ? null : Math.max(ageChg || 0, ageDchg || 0);

                        if (Number.isFinite(chg) && Number.isFinite(dchg)) {
                            battPowerObservedW = dchg - chg;
                            battPowerAge = age;
                            const chargeTs = stChg && typeof stChg.ts === 'number' ? Number(stChg.ts) : null;
                            const dischargeTs = stDchg && typeof stDchg.ts === 'number' ? Number(stDchg.ts) : null;
                            battPowerSampleTs = [chargeTs, dischargeTs]
                                .filter((value) => Number.isFinite(Number(value)) && Number(value) > 0)
                                .reduce((max, value) => Math.max(max, Number(value)), 0) || null;
                            battPowerSampleKey = `farm-gross:charge@${Number.isFinite(Number(chargeTs)) ? Math.round(Number(chargeTs)) : 'unknown'}|discharge@${Number.isFinite(Number(dischargeTs)) ? Math.round(Number(dischargeTs)) : 'unknown'}`;
                            battPowerObjectId = 'storageFarm.totalDischargePowerW-storageFarm.totalChargePowerW';
                            battPowerFeedbackSource = 'storage-farm-gross-fallback';
                            battPowerMappingTrusted = true;
                            battPowerW = (age === null || age <= staleMs) ? battPowerObservedW : null;
                            battPowerTrusted = typeof battPowerW === 'number' && Number.isFinite(battPowerW);
                            battPowerInvalidReason = 'Farm: Brutto-Fallback (Entladen-Laden)';
                        }
                    }
                }
            } catch (_eFarm) {
                // ignore
            }
        }

        await this._setIfChanged('speicher.regelung.batteryPowerTrusted', !!battPowerTrusted);
        await this._setIfChanged('speicher.regelung.batteryPowerIgnoredReason', String(battPowerInvalidReason || ''));

        // Final-Writer-Sicherheitsbasis: positiv = Entladung, negativ = Ladung.
        // Nur ein im aktuellen Regeltakt fachlich als vertrauenswürdig bewerteter
        // Istwert darf als bereits vorhandene Speicherladung angerechnet werden.
        this._safetyStorageActualPowerW = battPowerTrusted ? Number(battPowerW) : null;
        this._safetyStorageActualFresh = battPowerTrusted === true;
        this._safetyStorageActualTs = now;

        // FENECON Hybrid arbeitet kontinuierlich ueber genau eine beim
        // Speichern/Start aufgeloeste Kommandofamilie. PV, Forecast und Tageszeit
        // duerfen keinen No-Write- oder Reglerhoheitswechsel mehr ausloesen.

        // Fehlt die NVP-Messung, darf ein kurzer Telemetrie-Aussetzer bei Sungrow
        // keinen laufenden externen Sollwert durch ein 0-W-Schreiben stoppen. Das
        // Profil haelt deshalb waehrend einer begrenzten Grace-Zeit den letzten
        // erfolgreichen Nicht-Null-Befehl ohne neuen Schreibzugriff. Erst ein
        // anhaltender Messausfall wird als ausdruecklicher Sicherheitsstopp mit
        // 0 W behandelt. FENECON bleibt im normalen zyklischen Ausgangspfad.
        if (typeof gridW !== 'number') {
            const lastTargetW = Number.isFinite(Number(this._lastTargetW)) ? Number(this._lastTargetW) : 0;
            const lastSource = String(this._lastSource || '');
            const sungrowNvpLossGraceMs = Math.max(5000, Math.round(Math.max(0, num(cfg.sungrowNvpLossGraceSec, 30)) * 1000));

            if (sungrowHybridActive) {
                if (!this._sungrowNvpMissingSinceMs) this._sungrowNvpMissingSinceMs = now;
                const missingForMs = Math.max(0, now - this._sungrowNvpMissingSinceMs);
                const graceActive = missingForMs < sungrowNvpLossGraceMs;

                if (graceActive) {
                    const heldW = lastTargetW !== 0 ? lastTargetW : 0;
                    const heldSource = lastSource || 'sungrow-hybrid';
                    const heldReason = lastTargetW !== 0
                        ? `Sungrow Hybrid ESS: NVP kurzzeitig nicht verfuegbar – letzten Sollwert ${Math.round(lastTargetW)} W ohne 0-W-Stopp halten (${Math.round(missingForMs / 1000)} s)`
                        : `Sungrow Hybrid ESS: NVP kurzzeitig nicht verfuegbar – keine neue externe Vorgabe (${Math.round(missingForMs / 1000)} s)`;

                    await this._setSungrowHybridDiag({
                        active: true,
                        mode: 'nvp-missing-grace',
                        reason: heldReason,
                        writeMode: lastTargetW !== 0 ? 'no-write-hold-last-nvp-gap' : 'no-write-idle-nvp-gap',
                        targetW: heldW,
                    });
                    await this._setIfChanged('speicher.regelung.requestW', Math.round(heldW));
                    await this._setIfChanged('speicher.regelung.requestQuelle', heldSource);
                    await this._setIfChanged('speicher.regelung.requestGrund', heldReason);
                    await this._setIfChanged('speicher.regelung.dispatcherJson', JSON.stringify({
                        ts: now,
                        reqW: Math.round(heldW),
                        reason: heldReason,
                        src: heldSource,
                        noWrite: true,
                        nvpMissingForMs: Math.round(missingForMs),
                    }));
                    await this._setHoldNoWriteTargetDiag(heldW, heldReason, heldSource, 'sungrow-hybrid:no-write-nvp-grace');
                    await this._setIfChanged('speicher.regelung.netzLeistungW', null);
                    await this._setIfChanged('speicher.regelung.netzAlterMs', typeof gridAge === 'number' ? Math.round(gridAge) : null);
                    await this._setIfChanged('speicher.regelung.netzLadenErlaubt', null);
                    await this._setIfChanged('speicher.regelung.entladenErlaubt', null);
                    await this._setIfChanged('speicher.regelung.tarifState', '');
                    await this._setStorageNvpBalanceDiag(null);
                    await this._setIfChanged('speicher.regelung.batteryPowerBalanceTrusted', false);
                    await this._setIfChanged('speicher.regelung.batteryPowerFeedbackMode', 'missing-nvp-grace');
                    await this._setIfChanged('speicher.regelung.batteryPowerFeedbackBasisW', null);
                    await this._setIfChanged('speicher.regelung.batteryPowerFeedbackSampleUpdated', false);
                    await this._setIfChanged('speicher.regelung.batteryPowerFeedbackSampleIntervalMs', null);
                    await this._setIfChanged('speicher.regelung.batteryPowerFeedbackCadenceMs', null);
                    await this._setIfChanged('speicher.regelung.batteryPowerFeedbackHeld', lastTargetW !== 0);
                    await this._setIfChanged('speicher.regelung.batteryPowerFeedbackPredicted', false);
                    await this._setIfChanged('speicher.regelung.batteryPowerFeedbackPredictionDeltaW', 0);
                    await this._setIfChanged('speicher.regelung.pvBudgetAllocationMode', '');
                    await this._setIfChanged('speicher.regelung.pvBudgetRemainingBeforeStorageW', 0);
                    await this._setIfChanged('speicher.regelung.pvBudgetStorageAvailableW', 0);
                    await this._setIfChanged('speicher.regelung.pvBudgetReservedW', 0);
                    await this._setIfChanged('speicher.regelung.pvBudgetPostVendorCapW', 0);
                    await this._setIfChanged('speicher.regelung.pvBudgetPostVendorCapped', false);
                    await this._setIfChanged('speicher.regelung.pvBudgetPostVendorNoWriteHold', false);
                    await this._setIfChanged('speicher.regelung.pvBudgetPostVendorNoWriteReason', '');
                    await this._setIfChanged('speicher.regelung.totalBudgetStorageAvailableW', 0);
                    await this._setIfChanged('speicher.regelung.totalBudgetStorageReservedW', 0);
                    await this._setIfChanged('speicher.regelung.totalBudgetStorageCapped', false);
                    await this._setIfChanged('speicher.regelung.policyJson', JSON.stringify({
                        ts: now,
                        disabled: false,
                        noWrite: true,
                        reason: heldReason,
                        sungrowHybrid: true,
                        nvpMissingForMs: Math.round(missingForMs),
                    }));
                    return;
                }

                await this._setSungrowHybridDiag({
                    active: true,
                    mode: 'nvp-missing-safety-stop',
                    reason: `Sungrow Hybrid ESS: NVP seit ${Math.round(missingForMs / 1000)} s nicht verfuegbar – Sicherheitsstopp`,
                    writeMode: 'write-stop-no-grid-after-grace',
                    targetW: 0,
                });
            }

            await this._setIfChanged('speicher.regelung.requestW', 0);
            await this._setIfChanged('speicher.regelung.requestQuelle', 'aus');
            await this._setIfChanged('speicher.regelung.requestGrund', 'Netzleistung fehlt oder zu alt');
            await this._setIfChanged('speicher.regelung.dispatcherJson', JSON.stringify({ ts: now, reqW: 0, reason: 'Netzleistung fehlt oder zu alt', src: 'aus' }));

            // Ein fehlender/veralteter NVP ist ein echter Sicherheitsfall. Auch beim
            // FENECON-/OpenEMS-Profil muss deshalb ein sicherer 0-W-Sollwert ueber den
            // manuell zugeordneten AppCenter-DP geschrieben und zyklisch erneuert werden.
            // Ein Herstellerprofil darf den allgemeinen Sicherheitsgate-/Executor-Pfad
            // niemals umgehen.
            await this._applyTargetW(0, 'Netzleistung fehlt oder zu alt', 'aus');
            if (feneconDirectProfileActive) {
                await this._setFeneconHybridDiag({
                    active: true,
                    mode: 'external-control-safety-zero',
                    reason: 'Netzleistung fehlt oder zu alt – sicherer 0-W-Sollwert wird ueber den AppCenter-DP erneuert',
                    writeMode: 'write-safety-zero',
                    targetW: 0,
                });
                this._feneconHybridWasExternal = true;
            } else if (feneconNativeActive) {
                await this._setFeneconHybridDiag({
                    active: true,
                    mode: 'fems-grid-input-missing',
                    reason: 'Externer NVP-Messwert fehlt – native FEMS-Regelung wird nicht mit einer unplausiblen neuen Vorgabe überschrieben',
                    writeMode: 'native-hold-watchdog',
                    targetW: 0,
                });
            }
            await this._setIfChanged('speicher.regelung.netzLeistungW', null);
            await this._setIfChanged('speicher.regelung.netzAlterMs', typeof gridAge === 'number' ? Math.round(gridAge) : null);
            await this._setIfChanged('speicher.regelung.netzLadenErlaubt', null);
            await this._setIfChanged('speicher.regelung.entladenErlaubt', null);
            await this._setIfChanged('speicher.regelung.tarifState', '');
            await this._setStorageNvpBalanceDiag(null);
            await this._setIfChanged('speicher.regelung.batteryPowerBalanceTrusted', false);
            await this._setIfChanged('speicher.regelung.batteryPowerFeedbackMode', 'missing-nvp');
            await this._setIfChanged('speicher.regelung.batteryPowerFeedbackBasisW', null);
            await this._setIfChanged('speicher.regelung.batteryPowerFeedbackSampleUpdated', false);
            await this._setIfChanged('speicher.regelung.batteryPowerFeedbackSampleIntervalMs', null);
            await this._setIfChanged('speicher.regelung.batteryPowerFeedbackCadenceMs', null);
            await this._setIfChanged('speicher.regelung.batteryPowerFeedbackHeld', false);
            await this._setIfChanged('speicher.regelung.batteryPowerFeedbackPredicted', false);
            await this._setIfChanged('speicher.regelung.batteryPowerFeedbackPredictionDeltaW', 0);
            await this._setIfChanged('speicher.regelung.pvBudgetAllocationMode', '');
            await this._setIfChanged('speicher.regelung.pvBudgetRemainingBeforeStorageW', 0);
            await this._setIfChanged('speicher.regelung.pvBudgetStorageAvailableW', 0);
            await this._setIfChanged('speicher.regelung.pvBudgetReservedW', 0);
            await this._setIfChanged('speicher.regelung.totalBudgetStorageAvailableW', 0);
            await this._setIfChanged('speicher.regelung.totalBudgetStorageReservedW', 0);
            await this._setIfChanged('speicher.regelung.totalBudgetStorageCapped', false);
            if (feneconHybridConfigured || this._feneconNvpShadowWasActive) {
                await this._updateFeneconNvpShadow({
                    forceInactiveReason: 'central-nvp-missing-or-stale',
                });
            }
            await this._setIfChanged('speicher.regelung.policyJson', JSON.stringify({ ts: now, disabled: true, reason: 'Netzleistung fehlt oder zu alt', feneconHybrid: !!feneconHybridConfigured, sungrowHybrid: !!sungrowHybridActive }));
            return;
        }
        this._sungrowNvpMissingSinceMs = 0;
        // Show RAW if available (closer to meter), otherwise show filtered.
        await this._setIfChanged('speicher.regelung.netzLeistungW', Math.round((typeof gridRawW === 'number') ? gridRawW : gridW));
        await this._setIfChanged('speicher.regelung.netzAlterMs', typeof gridAge === 'number' ? Math.round(gridAge) : null);

        // Speicher-Netzladen besitzt einen eigenen fail-closed Vertrag.
        // Das EVCS-Gate `cm.gridChargeAllowed` darf niemals mehr als Speicher-
        // Freigabe interpretiert werden. Fehlt TarifVis oder ist die Freigabe
        // unbekannt, bleibt Netzladen gesperrt; PV-/NVP-Laden bleibt unberührt.
        const tariffSnapshot = (this.adapter && this.adapter._tarifVis && typeof this.adapter._tarifVis === 'object')
            ? this.adapter._tarifVis
            : null;
        const strictTariffPermission = resolveStrictStorageTariffPermission(tariffSnapshot || {}, {
            nowMs: now,
            snapshotMaxAgeMs: Math.round(clamp(num(cfg.tariffPermissionSnapshotMaxAgeSec, 15), 1, 60) * 1000),
        });
        // Kein Fallback mehr auf einen einzelnen persistierten Boolean-State:
        // Ein altes `tarif.speicherNetzLadenErlaubt=true` könnte sonst nach einem
        // Tarifwechsel auf neutral/teuer oder bei ausgefallenem TarifVis weiterwirken.
        const gridChargeAllowedRaw = strictTariffPermission.allowed === true;
        let gridChargeBlockReason = gridChargeAllowedRaw ? '' : String(strictTariffPermission.reason || 'Tarif-Freigabe fehlt');

        let dischargeAllowedRaw = true;
        if (this.dp && typeof this.dp.getEntry === 'function' && this.dp.getEntry('cm.dischargeAllowed')) {
            dischargeAllowedRaw = this.dp.getBoolean('cm.dischargeAllowed', true);
        }

        // Debounce gegen Flattern (Phase 5):
        // - Sperren (false) wirken sofort (Safety-first)
        // - Freigaben (true) erst nach stabiler True-Phase (hold)
        const permHoldMs = Math.round(clamp(num(cfg.tariffPermissionHoldSec, 10), 0, 3600) * 1000);

        let gridChargeAllowed = gridChargeAllowedRaw;
        let dischargeAllowed = dischargeAllowedRaw;

        if (permHoldMs > 0) {
            if (!gridChargeAllowedRaw) {
                this._tariffGridChargeAllowed = false;
                this._tariffGridChargeAllowedTrueSinceMs = 0;
            } else {
                if (!this._tariffGridChargeAllowed) {
                    if (!this._tariffGridChargeAllowedTrueSinceMs) this._tariffGridChargeAllowedTrueSinceMs = now;
                    if ((now - this._tariffGridChargeAllowedTrueSinceMs) >= permHoldMs) {
                        this._tariffGridChargeAllowed = true;
                    }
                }
            }
            gridChargeAllowed = !!this._tariffGridChargeAllowed;

            if (!dischargeAllowedRaw) {
                this._tariffDischargeAllowed = false;
                this._tariffDischargeAllowedTrueSinceMs = 0;
            } else {
                if (!this._tariffDischargeAllowed) {
                    if (!this._tariffDischargeAllowedTrueSinceMs) this._tariffDischargeAllowedTrueSinceMs = now;
                    if ((now - this._tariffDischargeAllowedTrueSinceMs) >= permHoldMs) {
                        this._tariffDischargeAllowed = true;
                    }
                }
            }
            dischargeAllowed = !!this._tariffDischargeAllowed;
        }

        // Der allgemeine App-Center-Haken ist die harte Master-Freigabe. Tarif-
        // Freigaben koennen Netzladen zusaetzlich sperren, aber niemals den bewusst
        // entfernten Installateur-Haken wieder freigeben. PV-/Eigenverbrauchsladen
        // und Entladung werden von diesem Gate nicht beruehrt.
        gridChargeAllowed = !!gridChargeConfigured && !!gridChargeAllowed;
        if (!gridChargeConfigured) {
            gridChargeBlockReason = 'Netzladen im AppCenter nicht freigegeben';
        } else if (!gridChargeAllowed && !gridChargeBlockReason) {
            gridChargeBlockReason = gridChargeAllowedRaw
                ? 'Speicher-Netzladefreigabe wird stabilisiert'
                : 'Kein frischer günstiger dynamischer Tarifpfad freigegeben';
        } else if (gridChargeAllowed) {
            gridChargeBlockReason = '';
        }
        await this._setIfChanged('speicher.regelung.netzLadenErlaubt', !!gridChargeAllowed);
        await this._setIfChanged('speicher.regelung.netzLadenSperrgrund', String(gridChargeBlockReason || ''));
        await this._setIfChanged('speicher.regelung.entladenErlaubt', !!dischargeAllowed);

        // Default-Zielwert (W): Ohne Initialisierung kann es – je nach aktivierten Teil-Logiken –
        // zu ReferenceErrors kommen, wenn am Ende targetW/reason/source verwendet werden.
        // 0 W bedeutet: keine Be-/Entladeleistung vorgeben.
        let targetW = 0;
        let evcsAssistReqW = 0;
        // Harte SoC-Grenzen (werden durch verschiedene Strategien gesetzt/verschärft)
        let hardDischargeMinSoc = 0;
        let hardChargeMaxSoc = 100;
        let reason = 'Keine Aktion';
        let source = 'idle';
        let storagePolicyBlocked = false;
        let storagePolicyBlockReason = '';

        // Harte Entlade-Demand-Cap für NVP-basierte Eigenverbrauchs-/Tarifregelung.
        // Hintergrund: Die Rampe darf einen zuvor korrekt begrenzten Sollwert nicht wieder
        // auf einen alten, zu hohen Wert zurückziehen. Sonst entstehen genau die Feldfehler
        // aus der Praxis: z. B. 2 kW Netzbezug, aber 10 kW Entlade-Sollwert.
        // Der Cap wird nur für positive Entladung gesetzt und nach der Rampenbegrenzung
        // erneut hart angewendet.
        let dischargeDemandHardCapW = null;
        let dischargeDemandHardCapReason = '';

        // Harte Lade-Demand-Cap für PV-/Tarif-/Reserve-Laden.
        // Hintergrund: Auch beim Laden darf die Rampe keinen alten negativen Sollwert weiter
        // halten, wenn PV-Export, Netz-Headroom oder die aktuelle Ladeanforderung bereits
        // kleiner/0 W geworden sind. 0 W heißt dabei bewusst: diese Richtung jetzt stoppen.
        let chargeDemandHardCapW = null;
        let chargeDemandHardCapReason = '';

        // Gemeinsame Diagnose und Rampensteuerung fuer alle NVP-basierten
        // Speicherpfade. Sobald frische Batterie-Istleistung verwendet wird,
        // begrenzt der Balancing-Helfer die Korrektur bereits relativ zur echten
        // Speicherleistung. Eine zweite Rampe relativ zum alten Sollwert wuerde
        // die Werte erneut auseinanderziehen und sichtbares Springen erzeugen.
        let storageNvpBalanceDiag = null;
        let storageNvpBalanceRampManaged = false;
        // Finale asymmetrische EVCS-Schutzmarker. 0 W ist nur dann ein
        // ausdruecklicher Policy-Stop, wenn eine zuvor aktive Lade-/Entladerichtung
        // wegen fehlendem Gesamtueberschuss bzw. reinem EVCS-Bedarf beendet werden muss.
        let evcsProtectedChargeStop = false;
        let evcsProtectedDischargeStop = false;
        let evcsProtectionChargeFromSurplus = false;
        let evcsProtectionDiag = null;

        // Finale proportionale Anti-Export-Diagnose. Sie greift nur fuer positive
        // Entladebefehle und liegt nach allen Hersteller-/Budgetentscheidungen.
        // Ein 0-W-Stop wird erst nach der konfigurierten Grace-Zeit explizit.
        let storageAntiExportDiag = null;
        let storageAntiExportExplicitStop = false;

        // Zentrales PV-Budget fuer die gemeinsame Verteilung zwischen EVCS,
        // Speicher und nachgelagerten Verbrauchern. Das Lademanagement laeuft
        // vor der Speicherregelung und reserviert seinen tatsaechlich benoetigten
        // PV-Anteil. Der Speicher darf danach nur das noch freie PV-Budget nutzen.
        let pvBudgetAllocationMode = '';
        let pvBudgetRemainingBeforeStorageW = 0;
        let pvBudgetStorageAvailableW = 0;
        let pvBudgetReservedW = 0;
        let pvBudgetPostVendorCapW = 0;
        let pvBudgetPostVendorCapped = false;
        let pvBudgetPostVendorNoWriteHold = false;
        let pvBudgetPostVendorNoWriteReason = '';
        let pvBudgetRuntimeRemainingW = 0;
        let pvBudgetAllocationDerivedW = 0;
        let pvBudgetEvcsReservedW = 0;
        let pvBudgetResolution = 'runtime-remaining';
        let totalBudgetStorageAvailableW = 0;
        let totalBudgetStorageReservedW = 0;
        let totalBudgetStorageCapped = false;
        let centralPvBudgetRuntime = null;
        let centralPvAllocationGate = null;

        // PV-Ladequellen werden herstellerunabhaengig markiert. Entscheidend ist
        // die Richtung: Nur negative Sollwerte (Beladung) duerfen das zentrale
        // PV-Restbudget verbrauchen. Tarif-/Reserve-Netzladen bleibt getrennt.
        const isCentralPvChargeSource = (src, signedTargetW) => {
            if (!(Number(signedTargetW) < 0)) return false;
            const normalized = String(src || '').trim().toLowerCase();
            return normalized === 'pv'
                || normalized === 'fenecon-extra-pv'
                || normalized === 'sungrow-assist';
        };

        /**
         * Netz-/Gesamtbudget kommen. Diese Pfade muessen nach der EVCS-
         * Reservierung denselben zentralen Gesamt-Grant verwenden und ihre
         * Leistung fuer Thermik/Heizstab reservieren.
         *
         * PV-/NVP-Laden bleibt davon getrennt und verbraucht ausschliesslich das
         * zentrale PV-Restbudget.
         */
        const isCentralGridChargeSource = isCentralStorageGridChargeSource;

        /**
         * Sungrow-Herstellerberechnung entstehen. Diese Caps duerfen den spaeteren
         * geschlossenen NVP-Regelkreis nicht auf 0 W klemmen; der autoritative
         * EVCS-/Speicher-PV-Cap wird nach der Herstellerlogik erneut angewendet.
         * Echte Schutzstopps wie SoC, Reserve, Tarif oder EV-Prioritaet werden
         * hier bewusst nicht als aufschiebbar markiert. Richtungswechsel sind
         * dagegen direkte Sollwertwechsel und kein 0-W-Schutzstopp.
         */
        const isDeferredSungrowChargeCapReason = (capReason) => {
            const text = String(capReason || '').trim().toLowerCase();
            if (!text) return false;
            return text.includes('eigenverbrauch-nvp-lade-cap')
                || text.includes('pv-nvp-lade-cap')
                || text.includes('nulleinspeisung-nvp-lade-cap')
                || text.includes('zentrales pv-restbudget')
                || text.includes('finales zentrales pv-restbudget')
                || text.includes('keine aktuelle ladeanforderung')
                || text.includes('aktuelle ladeanforderung-cap')
                || text.includes('sungrow nvp-balancing-lade-cap')
                || text.includes('sungrow direkter pv-/last-feed-forward-cap');
        };

        /**
         * Vorlaeufige generische NVP-Entlade-Caps werden vor der eigentlichen
         * Sungrow-Herstellerberechnung erzeugt. Bei asynchroner Telemetrie kann
         * dieser erste Pfad noch den alten Batterie-Istwert sehen und dadurch den
         * im Sungrow-Regelkreis korrekt gehaltenen Sollwert wieder kuerzen. Das
         * fuehrt zu einem 2,50 -> 2,25 -> 2,50-kW-Pendeln, obwohl der NVP bereits
         * im Zielband liegt. Nur diese rein regeltechnischen NVP-Caps werden hier
         * aufgeschoben; SoC-, Reserve-, Tarif-, EVCS-, Peak- und Safety-Grenzen
         * bleiben weiterhin verbindlich.
         */
        const isDeferredSungrowDischargeCapReason = (capReason) => {
            const text = String(capReason || '').trim().toLowerCase();
            if (!text) return false;
            return text.includes('eigenverbrauch-nvp-demand-cap')
                || text.includes('sungrow nvp-balancing-entlade-cap')
                || text.includes('sungrow direkter pv-/last-feed-forward-cap');
        };

        /**
         * EVCS-Reservierung. Die zentrale Runtime ist die einzige autoritative
         * Quelle; Prozentwerte aus dem Allocation-Gate werden hier nicht nochmals
         * zu einem zweiten Speicherbudget rekonstruiert.
         * der Grant bereits exakt der Rest, den der Speicher in diesem Tick nutzen
         * darf. Alte Laufzeiten ohne Grant-API verwenden nur remainingPvW als
         * Kompatibilitaetsfallback.
         */
        const resolveStoragePvBudgetW = (runtime, _allocationGate, fallbackW = 0) => {
            const runtimeTs = runtime ? Number(runtime.ts) : NaN;
            const runtimeAgeMs = Number.isFinite(runtimeTs) && runtimeTs > 0
                ? Math.max(0, now - runtimeTs)
                : null;
            const runtimeMaxAgeMs = Math.max(30000, staleMs * 2);
            const runtimeFresh = !!runtime
                && runtimeAgeMs !== null
                && runtimeAgeMs <= runtimeMaxAgeMs;
            const runtimeRemainingW = runtimeFresh && Number.isFinite(Number(runtime.remainingPvW))
                ? Math.max(0, Number(runtime.remainingPvW))
                : (!runtime ? Math.max(0, Number(fallbackW) || 0) : 0);
            pvBudgetRuntimeRemainingW = runtimeRemainingW;
            pvBudgetAllocationDerivedW = runtimeRemainingW;
            pvBudgetEvcsReservedW = 0;
            pvBudgetResolution = runtime
                ? (runtimeFresh ? 'runtime-remaining-fallback' : 'central-stale-blocked')
                : 'local-fallback-no-central-budget';

            // Eine vorhandene zentrale Runtime bleibt immer autoritativ. Bei
            // einem veralteten Snapshot wird PV-Laden sicher gesperrt, statt aus
            // NVP/Allocation lokal ein zweites Speicherbudget zu rekonstruieren.
            if (runtime && !runtimeFresh) return 0;

            // EVCS laeuft in der zentralen Modulreihenfolge vor dem Speicher und
            // reserviert dort sowohl reale PV-Leistung als auch einen technisch
            // begruendeten Start-Intent. Der Speicher darf deshalb ausschliesslich
            // den danach verbliebenen zentralen Grant verwenden. Eine erneute
            // Rekonstruktion aus Allocation-Prozenten waere ein Parallelbudget und
            // koennte die echte EVCS-Reservierung wieder ueberschreiben.
            if (runtime) {
                const grantFn = typeof runtime.getPvGrant === 'function'
                    ? runtime.getPvGrant.bind(runtime)
                    : (typeof runtime.grant === 'function' ? runtime.grant.bind(runtime) : null);
                if (grantFn) {
                    const grant = grantFn({
                        key: 'storage',
                        requestedW: Number.MAX_SAFE_INTEGER,
                        pvOnly: true,
                    });
                    if (grant && Number.isFinite(Number(grant.grantW))) {
                        const consumers = runtime.consumers && typeof runtime.consumers === 'object'
                            ? runtime.consumers
                            : {};
                        const evcs = consumers.evcs && typeof consumers.evcs === 'object'
                            ? consumers.evcs
                            : null;
                        pvBudgetEvcsReservedW = evcs
                            ? Math.max(0, Number(evcs.pvReserveW ?? evcs.pvUsedW) || 0)
                            : 0;
                        pvBudgetAllocationDerivedW = Math.max(0, Number(grant.grantW) || 0);
                        pvBudgetResolution = 'central-grant-after-evcs';
                        return pvBudgetAllocationDerivedW;
                    }
                }
            }

            return runtimeRemainingW;
        };

        const exportW = Math.max(0, -gridW); // negative Netzleistung = Einspeisung (geglättet)
        const importW = Math.max(0, gridW);  // positive Netzleistung = Bezug (geglättet)
        const nvpRawW = (typeof gridRawW === 'number') ? gridRawW : gridW; // Import + / Export -
        this._latestNvpRawW = (typeof nvpRawW === 'number' && Number.isFinite(nvpRawW)) ? Number(nvpRawW) : null;
        this._latestNvpSampleTs = now;
        const importRawW = Math.max(0, nvpRawW);
        const exportRawW = Math.max(0, -nvpRawW);

        // EVCS-Speicher-Schutz:
        // Die Wallbox-Steuerung veroeffentlicht die aktuelle Ladeleistung der Ladepunkte,
        // bei denen "Speicher schuetzen" aktiv ist. Diese Leistung darf nicht aus dem
        // stationaeren Speicher versorgt werden. Das normale NVP-Ziel bleibt unveraendert:
        // - Entladen wird spaeter auf Haus-/sonstigen Bedarf ohne EVCS begrenzt.
        // - Laden bleibt nur aus einem realen Gesamtueberschuss am NVP erlaubt.
        // Die finale Schranke liegt nach allen Herstellerprofilen und wirkt deshalb
        // identisch fuer Sungrow, FENECON, E3/DC, Signed- und Split-Sollwerte.
        // Der Same-Cycle-Snapshot ist autoritativ. Der ioBroker-State bleibt nur
        // ein sehr kurzer Kompatibilitaetsfallback fuer alte Modulreihenfolgen; ein
        // alter EVCS-Schutzwert darf die Speicherregelung niemals bis zu 60 Sekunden
        // weiter beeinflussen.
        const protectedEvcsMaxAgeMs = Math.max(1000, Math.min(15000, num(cfg.evcsStoragePolicyMaxAgeMs, 5000)));
        const sharedCaps = (this.adapter && this.adapter._emsCaps && typeof this.adapter._emsCaps === 'object') ? this.adapter._emsCaps : null;
        const runtimeEvcsStoragePolicy = (sharedCaps && sharedCaps.evcsStoragePolicy && typeof sharedCaps.evcsStoragePolicy === 'object') ? sharedCaps.evcsStoragePolicy : null;
        let protectionSnapshot = runtimeEvcsStoragePolicy;
        if (!protectionSnapshot) {
            try {
                const json = await this._readOwnString('chargingManagement.control.storagePolicyJson');
                const parsed = json ? JSON.parse(json) : null;
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) protectionSnapshot = parsed;
            } catch { /* malformed persisted diagnostics are not fresh policy */ }
            if (!protectionSnapshot) {
                // Compatibility for 1.0.4 installations: timestamp belongs to the
                // load sample, not to a later read/heartbeat of this state.
                const oldLoad = await this.adapter.getStateAsync('chargingManagement.control.storageProtectedLoadW').catch(() => null);
                if (oldLoad) protectionSnapshot = {
                    protectedLoadW: oldLoad.val,
                    protectedWallboxes: await this._readOwnNumber('chargingManagement.control.storageProtectedWallboxes'),
                    assistRequestedLoadW: await this._readOwnNumberFresh('chargingManagement.control.storageAssistRequestedLoadW', protectedEvcsMaxAgeMs),
                    ts: oldLoad.ts, source: 'state-fallback',
                };
            }
        }
        const configuredWallboxes = this.adapter.config.chargingManagement && this.adapter.config.chargingManagement.wallboxes;
        const policySnapshot = resolveEvcsStorageProtectionSnapshot(protectionSnapshot, {
            // State reads may await I/O while a newer policy completes. Compare
            // against read-time, not an older storage-tick start timestamp.
            now: Date.now(), maxAgeMs: protectedEvcsMaxAgeMs,
            configuredCandidates: Array.isArray(configuredWallboxes)
                ? configuredWallboxes.filter(w => w && w.storageAssistCustomerAllowed === true).length : 0,
        });
        const evcsStorageProtectedLoadW = policySnapshot.protectedLoadW;
        const evcsStorageProtectedWallboxes = policySnapshot.protectedWallboxes;
        const evcsStorageProtectedLoadUnknown = policySnapshot.protectedLoadUnknown;
        const evcsStorageProtectedUnknownWallboxes = policySnapshot.protectedUnknownWallboxes;
        const evcsStorageAssistRequestedLoadW = policySnapshot.assistRequestedLoadW;
        const evcsStoragePolicySource = policySnapshot.source;
        // Seit Baustein 7 wird die EVCS-Leistung nicht mehr als symmetrischer
        // NVP-Zieloffset verwendet. Ein solcher Offset erlaubte bei Teildeckung der
        // Wallbox faelschlich Speicherladung aus dem Netz. Die Schutzwirkung wird
        // spaeter asymmetrisch auf den finalen Sollwert angewendet.
        const evcsStorageProtectedNvpTargetShiftW = 0;
        const importRawWithoutProtectedEvcsW = Math.max(0, importRawW - evcsStorageProtectedLoadW);

        await this._setIfChanged('speicher.regelung.evcsSpeicherSchutzLastW', Math.round(evcsStorageProtectedLoadW));
        await this._setIfChanged('speicher.regelung.evcsSpeicherSchutzWallboxen', evcsStorageProtectedWallboxes);
        await this._setIfChanged('speicher.regelung.evcsSpeicherMitnutzungLastW', Math.round(evcsStorageAssistRequestedLoadW));
        await this._setIfChanged('speicher.regelung.evcsSpeicherSchutzNvpZielOffsetW', Math.round(evcsStorageProtectedNvpTargetShiftW));
        await this._setIfChanged('speicher.regelung.evcsSpeicherSchutzQuelle', evcsStoragePolicySource);
        await this._setIfChanged('speicher.regelung.evcsSpeicherSchutzLastUnbekannt', evcsStorageProtectedLoadUnknown);
        await this._setIfChanged('speicher.regelung.evcsSpeicherSchutzUnbekannteWallboxen', evcsStorageProtectedUnknownWallboxes);

        const stripProtectedEvcsLoadW = (w) => Math.max(0, Math.max(0, Number(w) || 0) - evcsStorageProtectedLoadW);

        // NVP-Balancing-Hilfswerte fuer Eigenverbrauch/PV-Laden.
        // Wichtig: Bei Speicherregelung muss der naechste Sollwert immer aus
        // "aktueller Batterieleistung + aktueller NVP-Abweichung" entstehen.
        // Sonst bleibt bei laufender Ladung z. B. 2,9 kW Export stehen, weil nur
        // der neue NVP-Export geschrieben wird statt "alte Ladung + neuer Export".
        const isStorageBalanceSource = (src) => {
            const x = String(src || '').toLowerCase();
            return x === 'eigenverbrauch' || x === 'pv' || x === 'tarif' || x === 'sungrow-hybrid' || x === 'sungrow-assist' || x === 'fenecon' || x === 'fenecon-assist';
        };
        const getLastStorageBalanceTargetW = () => {
            const last = Number(this._lastTargetW);
            if (!Number.isFinite(last)) return 0;
            return isStorageBalanceSource(this._lastSource) ? last : 0;
        };

        // Gateway AC: Lastreferenz für den AC-Teil des Speichers.
        // Wichtig: Die eigentliche Sollleistung wird weiter unten am NVP bilanziert,
        // damit PV-Überschuss-/EVCS-Situationen nicht zu Batterieentladung in die Einspeisung führen.
        // Priorität der Lastquelle:
        // 1) derived.core.building.loadTotalW (enthält Haus + EV + Zusatzverbraucher)
        // 2) consumptionTotal (direkter Haus-/Gesamtverbrauch)
        // 3) derived.loadRestW + EV + Verbraucher-Slots
        // 4) Fallback aus aktuellem Netzimport + laufender Speicher-Entladung
        /**
         */
        const readCacheNumber = (key, fallback = null) => {
            const sid = String(key || '').trim();
            if (!sid) return fallback;
            try {
                if (this.adapter && typeof this.adapter._nwGetNumberFromCache === 'function') {
                    const n = this.adapter._nwGetNumberFromCache(sid);
                    if (typeof n === 'number' && Number.isFinite(n)) return n;
                }
            } catch {
                // ignore
            }
            try {
                const rec = this.adapter && this.adapter.stateCache ? this.adapter.stateCache[sid] : null;
                const n = Number(rec && rec.value);
                if (Number.isFinite(n)) return n;
            } catch {
                // ignore
            }
            return fallback;
        };

        // Unabhaengiger PV-/Last-Feed-forward fuer den gemeinsamen NVP-Regelkreis.
        // Er wird pro Policy mit deren NVP-Ziel aufgebaut und nur dann verwendet,
        // wenn direkte, frische und zeitlich plausible PV-/Lastmessungen vorliegen.
        // Der normale Regler addiert PV ausdruecklich nicht zur NVP-Differenz; damit
        // bleibt der Feed-forward eine Ersatz-/Plausibilitaetsgroesse ohne Doppelzaehlung.
        const buildStorageFeedForward = (targetNvpW) => this._buildIndependentPvLoadFeedForward({
            nowMs: now,
            staleMs: Math.max(staleMs, num(cfg.balanceFeedForwardMaxAgeMs, staleMs)),
            maxSkewMs: Math.max(0, num(cfg.balanceFeedForwardMaxSkewMs, 15000)),
            rawNvpW: nvpRawW,
            nvpAgeMs: (typeof gridRawAge === 'number') ? gridRawAge : gridAge,
            targetNvpW,
            protectedEvcsLoadW: evcsStorageProtectedLoadW,
            coupling: storageCoupling,
            dcPvPowerW,
            dcPvPowerAgeMs: dcPvPowerAge,
        });
        const balanceFeedForwardPlausibilityW = Math.max(
            200,
            num(cfg.balanceFeedForwardPlausibilityW, Math.max(1000, Math.max(0, num(cfg.maxDeltaWPerTick, 500)) * 2)),
        );

        let feneconAcLoadMemo = null;
        /**
         */
        /**
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const getFeneconAcLoadTargetW = () => {
            if (feneconAcLoadMemo) return feneconAcLoadMemo;

            const loadTotalDerivedW = readCacheNumber('derived.core.building.loadTotalW', null);
            if (typeof loadTotalDerivedW === 'number' && Number.isFinite(loadTotalDerivedW) && loadTotalDerivedW >= 0) {
                feneconAcLoadMemo = { w: stripProtectedEvcsLoadW(loadTotalDerivedW), source: evcsStorageProtectedLoadW > 0 ? 'derived.loadTotalW-evcsProtected' : 'derived.loadTotalW' };
                return feneconAcLoadMemo;
            }

            const loadTotalMappedW = readCacheNumber('consumptionTotal', null);
            if (typeof loadTotalMappedW === 'number' && Number.isFinite(loadTotalMappedW) && loadTotalMappedW >= 0) {
                feneconAcLoadMemo = { w: stripProtectedEvcsLoadW(loadTotalMappedW), source: evcsStorageProtectedLoadW > 0 ? 'consumptionTotal-evcsProtected' : 'consumptionTotal' };
                return feneconAcLoadMemo;
            }

            const loadRestDerivedW = readCacheNumber('derived.core.building.loadRestW', null);
            if (typeof loadRestDerivedW === 'number' && Number.isFinite(loadRestDerivedW) && loadRestDerivedW >= 0) {
                const evTotalW = Math.max(0, Math.abs(num(readCacheNumber('evcs.totalPowerW', 0), 0)));
                let consumersTotalW = 0;
                for (let i = 1; i <= 10; i++) {
                    const c = readCacheNumber(`consumer${i}Power`, null);
                    if (typeof c === 'number' && Number.isFinite(c)) consumersTotalW += Math.abs(c);
                }
                feneconAcLoadMemo = {
                    w: stripProtectedEvcsLoadW(loadRestDerivedW + evTotalW + consumersTotalW),
                    source: evcsStorageProtectedLoadW > 0 ? 'derived.loadRestW+slots-evcsProtected' : 'derived.loadRestW+slots',
                };
                return feneconAcLoadMemo;
            }

            const dischargeNowW = (typeof battPowerW === 'number' && Number.isFinite(battPowerW)) ? Math.max(0, battPowerW) : 0;
            feneconAcLoadMemo = {
                w: Math.max(0, importRawWithoutProtectedEvcsW + dischargeNowW),
                source: evcsStorageProtectedLoadW > 0 ? 'approx.import+battery-evcsProtected' : 'approx.import+battery',
            };
            return feneconAcLoadMemo;
        };

        const feneconHybridCtx = feneconHybridActive
            ? await this._buildFeneconHybridContext({
                cfg,
                staleMs,
                gridW,
                gridRawW,
                dcPvPowerW,
                dcPvPowerAgeMs: dcPvPowerAge,
                resolvedMode: feneconControlResolution.mode,
            })
            : {
                active: false,
                configured: !!feneconHybridConfigured,
                farmBlocked: !!feneconHybridBlockedByFarm,
                mode: feneconHybridBlockedByFarm ? 'blocked-by-farm' : 'standard',
                noWrite: false,
            };

        const sungrowHybridCtx = sungrowHybridActive
            ? await this._buildSungrowHybridContext({
                cfg,
                staleMs,
                gridW,
                gridRawW,
                gridAgeMs: (typeof gridRawAge === 'number') ? gridRawAge : gridAge,
                targetGridImportW: activeStorageNvpTargetW,
                importThresholdW: activeStorageNvpHysteresisW,
                protectedEvcsLoadW: evcsStorageProtectedLoadW,
                coupling: storageCoupling,
                dcPvPowerW,
                dcPvPowerAgeMs: dcPvPowerAge,
            })
            : { active: false, configured: !!sungrowHybridConfigured, mode: 'standard' };

        if (feneconHybridActive) {
            await this._setFeneconHybridDiag({
                active: true,
                mode: feneconHybridCtx.mode,
                reason: feneconHybridCtx.reason,
                writeMode: feneconHybridCtx.writeMode,
                pvW: feneconHybridCtx.pvW,
                additionalPvW: feneconHybridCtx.additionalPvW,
                thresholdW: feneconHybridCtx.thresholdW,
                additionalThresholdW: feneconHybridCtx.additionalThresholdW,
                nvpW: feneconHybridCtx.nvpW,
                forecastW: feneconHybridCtx.forecastW,
                forecastSource: feneconHybridCtx.forecastSource,
                dayOrPvActive: feneconHybridCtx.dayOrPvActive,
                noWrite: feneconHybridCtx.noWrite,
                authority: feneconHybridCtx.authority,
                pvFresh: feneconHybridCtx.pvFresh,
                pvSource: feneconHybridCtx.pvSource,
                releaseThresholdW: feneconHybridCtx.releaseThresholdW,
                releaseDelayMs: feneconHybridCtx.releaseDelayMs,
                pvBelowSinceMs: feneconHybridCtx.pvBelowSinceMs,
                pvBelowForMs: feneconHybridCtx.pvBelowForMs,
                assistActive: feneconHybridCtx.assistActive,
                assistImportThresholdW: feneconHybridCtx.assistImportThresholdW,
            });
        }

        if (sungrowHybridActive) {
            await this._setSungrowHybridDiag({
                active: true,
                mode: sungrowHybridCtx.mode,
                reason: sungrowHybridCtx.reason,
                writeMode: sungrowHybridCtx.writeMode,
                pvW: sungrowHybridCtx.pvW,
                loadW: sungrowHybridCtx.loadW,
                nvpW: sungrowHybridCtx.nvpW,
                importW: sungrowHybridCtx.importW,
                exportW: sungrowHybridCtx.exportW,
                pvCoversLoad: sungrowHybridCtx.pvCoversLoad,
                thresholdW: sungrowHybridCtx.thresholdW,
                loadCoverReserveW: sungrowHybridCtx.loadCoverReserveW,
                dischargeThresholdW: sungrowHybridCtx.dischargeThresholdW,
            });
        }

        // ------------------------------------------------------------
        // Phase 4: Gemeinsame Netzbezug-Caps (Grid-Constraints / Peak-Shaving / Installer)
        // ------------------------------------------------------------
        const coreCaps = (this.adapter && this.adapter._emsCaps && typeof this.adapter._emsCaps === 'object') ? this.adapter._emsCaps : null;
        const evPriorityCaps = (coreCaps && coreCaps.evPriority && typeof coreCaps.evPriority === 'object') ? coreCaps.evPriority : null;
        const evPriorityBlockStorageChargeRaw = !!(evPriorityCaps && evPriorityCaps.blockStorageCharge === true);
        const evPriorityStarvedWRaw = (evPriorityCaps && Number.isFinite(Number(evPriorityCaps.starvedW))) ? Math.max(0, Number(evPriorityCaps.starvedW)) : 0;
        let importLimitW = null;
        let importLimitQuelle = '';

        try {
            if (coreCaps && coreCaps.grid && typeof coreCaps.grid.gridImportLimitW_effective === 'number' && Number.isFinite(coreCaps.grid.gridImportLimitW_effective) && coreCaps.grid.gridImportLimitW_effective > 0) {
                importLimitW = coreCaps.grid.gridImportLimitW_effective;
                importLimitQuelle = String(coreCaps.grid.gridImportLimitW_source || '');
            }
        } catch {
            // ignore
        }

        if (!(typeof importLimitW === 'number' && Number.isFinite(importLimitW) && importLimitW > 0)) {
            // Fallback: states (best-effort)
            const lim = await this._readOwnNumber('ems.core.gridImportLimitW_effective');
            if (typeof lim === 'number' && Number.isFinite(lim) && lim > 0) importLimitW = lim;
            const src = await this._readOwnString('ems.core.gridImportLimitW_source');
            if (src) importLimitQuelle = src;
        }

        let importHeadroomW = null;
        let importHeadroomRawW = null;
        let importHeadroomEffW = null;

        if (typeof importLimitW === 'number' && Number.isFinite(importLimitW) && importLimitW > 0) {
            importHeadroomW = Math.max(0, importLimitW - importW);
            importHeadroomRawW = Math.max(0, importLimitW - importRawW);
            importHeadroomEffW = (typeof importHeadroomRawW === 'number' && typeof importHeadroomW === 'number')
                ? Math.min(importHeadroomW, importHeadroomRawW)
                : (typeof importHeadroomRawW === 'number' ? importHeadroomRawW : importHeadroomW);
        }

        await this._setIfChanged('speicher.regelung.importLimitW', (typeof importLimitW === 'number' && Number.isFinite(importLimitW) && importLimitW > 0) ? Math.round(importLimitW) : null);
        await this._setIfChanged('speicher.regelung.importLimitQuelle', importLimitQuelle || '');
        await this._setIfChanged('speicher.regelung.importHeadroomW', (typeof importHeadroomW === 'number') ? Math.round(importHeadroomW) : null);
        await this._setIfChanged('speicher.regelung.importHeadroomRawW', (typeof importHeadroomRawW === 'number') ? Math.round(importHeadroomRawW) : null);

        // Peak-Shaving Kontexte (Limit/Headroom) – wird für LSK-Entladung und für "Reserve wieder auffüllen" genutzt.
        const peakEnabled = !!this.adapter.config.enablePeakShaving || !!(this.adapter.config.peakShaving && this.adapter.config.peakShaving.atypical && this.adapter.config.peakShaving.atypical.enabled);
        let psLimitW = null;
        let psOverW = null;
        let psReqRedW = null;
        let psHeadroomW = null; // freie Leistung bis zum Peak-Shaving-Limit (nur Import)
        if (peakEnabled) {
            psLimitW = await this._readOwnNumber('peakShaving.control.limitW');
            psOverW = await this._readOwnNumber('peakShaving.control.overW');
            psReqRedW = await this._readOwnNumber('peakShaving.control.requiredReductionW');
            // Phase 4: Wenn Peak-Shaving kein nutzbares Limit liefert, nutze globales Import-Cap (CoreLimits).
            if (!(typeof psLimitW === 'number' && psLimitW > 0) && (typeof importLimitW === 'number' && Number.isFinite(importLimitW) && importLimitW > 0)) {
                psLimitW = importLimitW;
            }
            if (typeof psLimitW === 'number' && psLimitW > 0) {
                // NOTE: psHeadroomW is based on the filtered import signal for stable control.
                psHeadroomW = Math.max(0, psLimitW - importW);
            }
        }

// LSK-Refill Headroom-Filter (langes Mittelwertfenster + Update-Schwelle):
// - Schwankungen im Netzbezug führen sonst zu stark springenden Sollwerten.
// - Ansatz: gleitender Mittelwert am NVP (Import) über ein längeres Zeitfenster (Default 120 s)
//   und erst bei Änderungen >= lskRefillDeadbandW (Default 500 W) den Wert "nachziehen".
// - Für Sicherheit clampen wir später zusätzlich mit dem RAW-Headroom (Import-Spikes => sofort weniger laden).
let psHeadroomFilteredW = null;
let psHeadroomRawW = null;
if (typeof psHeadroomW === 'number') {
    if (typeof psLimitW === 'number' && psLimitW > 0) {
        // RAW headroom based on RAW import (Import + / Export -) -> Import only
        psHeadroomRawW = Math.max(0, psLimitW - Math.max(0, importRawW));
    }

    const avgSec = clamp(num(cfg.lskRefillAvgSeconds, 120), 5, 1800);
    const updateDeltaW = clamp(num(cfg.lskRefillDeadbandW, 500), 0, 1000000);

    // Rolling mean of import (NVP) for stable headroom calculation.
    // We intentionally use RAW import here (Import only) to avoid double-filter artefacts.
    if (this._lskRefillImportWin) {
        this._lskRefillImportWin.setMaxSeconds(avgSec);
        const importSampleW = Math.max(0, (typeof importRawW === 'number') ? importRawW : ((typeof importW === 'number') ? importW : 0));
        this._lskRefillImportWin.push(importSampleW, now);
        const importAvgW = this._lskRefillImportWin.mean();
        const headroomAvgW = (typeof psLimitW === 'number' && psLimitW > 0 && typeof importAvgW === 'number')
            ? Math.max(0, psLimitW - importAvgW)
            : psHeadroomW;

        if (typeof this._lskRefillHeadroomFilteredW !== 'number') {
            this._lskRefillHeadroomFilteredW = headroomAvgW;
        } else {
            const prev = this._lskRefillHeadroomFilteredW;
            if (headroomAvgW < prev) {
                // decrease immediately (safety)
                this._lskRefillHeadroomFilteredW = headroomAvgW;
            } else if (updateDeltaW > 0 && (headroomAvgW - prev) < updateDeltaW) {
                // hold (no update for small upward changes)
                this._lskRefillHeadroomFilteredW = prev;
            } else {
                this._lskRefillHeadroomFilteredW = headroomAvgW;
            }
        }

        psHeadroomFilteredW = this._lskRefillHeadroomFilteredW;
    } else {
        // fallback (should not happen)
        psHeadroomFilteredW = psHeadroomW;
        this._lskRefillHeadroomFilteredW = psHeadroomFilteredW;
    }

    this._lskRefillLastTs = now;

    await this._setIfChanged('speicher.regelung.lskHeadroomW', Math.round(psHeadroomW));
    await this._setIfChanged('speicher.regelung.lskHeadroomFilteredW', Math.round(psHeadroomFilteredW));
} else {
    this._lskRefillHeadroomFilteredW = null;
    this._lskRefillLastTs = now;
    if (this._lskRefillImportWin) {
        this._lskRefillImportWin.samples = [];
        this._lskRefillImportWin.sum = 0;
    }
    psHeadroomRawW = null;
    await this._setIfChanged('speicher.regelung.lskHeadroomW', null);
    await this._setIfChanged('speicher.regelung.lskHeadroomFilteredW', null);
}

if (typeof soc === 'number') {
            await this._setIfChanged('speicher.regelung.socPct', Math.round(soc * 10) / 10);
            await this._setIfChanged('speicher.regelung.socAlterMs', typeof socAge === 'number' ? Math.round(socAge) : null);
        } else {
            await this._setIfChanged('speicher.regelung.socPct', null);
            await this._setIfChanged('speicher.regelung.socAlterMs', typeof socAge === 'number' ? Math.round(socAge) : null);
        }

        // ------------------------------------------------------------
        // Gate E: Multiuse-Speicherstrategie (SoC-Zonen)
        // ------------------------------------------------------------
        // MultiUse liefert seine SoC-Zonen seit 0.8.138 direkt aus
        // installerConfig.storageMultiUse und darf nur fuehren, wenn die App
        // wirklich aktiv ist. Es werden keine Zonen mehr nach storage.* gespiegelt.
        // Ist MultiUse deaktiviert, laeuft die normale Eigenverbrauchs-Policy;
        // alte MultiUse-Werte duerfen dann keine dauerhafte 0-W-Sperre erzeugen.
        const installerCfgForMultiUse = installerCfgForMultiUseEarly;
        const storageMultiUseCfg = storageMultiUseCfgEarly;
        const multiUsePolicyConfigured = !!multiUsePolicyConfiguredEarly;
        const multiUsePolicyActive = !!multiUseAppPolicyActive;
        const ignoreStaleMultiUsePolicy = !!(multiUsePolicyConfigured && !multiUsePolicyActive);
        const storageOnlyPolicyActive = !multiUsePolicyActive;

        // Der gemeinsame Resolver wurde bereits vor den Herstellerprofilen
        // aufgebaut. Hier werden daraus nur noch die SoC-/Reserve-Zonen gelesen.
        // Dadurch arbeiten Einzel-Speicher, Farm und alle Herstellerpfade mit
        // exakt derselben Topologie- und NVP-Policy.
        const multiUseOwnsZones = storageOperatingPolicy.mode === 'multiuse';

        // Notstrom-Reserve und LSK sind reine MultiUse-Zonen. Ohne aktives
        // MultiUse bleiben sie aus; die eigenstaendige Speicherregelung nutzt
        // ausschliesslich ihre Eigenverbrauchs-Min-/Max-SoC-Werte.
        const reserveEnabled = storageOperatingPolicy.reserve.enabled === true;
        const reserveMin = clamp(num(storageOperatingPolicy.reserve.minSocPct, 0), 0, 100);
        const reserveTarget = clamp(num(storageOperatingPolicy.reserve.targetSocPct, reserveMin), reserveMin, 100);
        const reserveActive = reserveEnabled && (typeof soc === 'number') && (soc <= reserveMin);

        // Reserve-Aufladung mit SoC-Hysterese, damit bei Erreichen des Ziel-SoC
        // nicht permanent nachgeregelt wird.
        if (reserveEnabled && (typeof soc === 'number')) {
            const onBelow = Math.max(0, reserveTarget - this._socHystPct);
            this._socReserveRefillEnabled = hystBelow(this._socReserveRefillEnabled, soc, onBelow, reserveTarget);
        } else {
            this._socReserveRefillEnabled = false;
        }
        const reserveChargeWanted = reserveEnabled && (typeof soc === 'number') && !!this._socReserveRefillEnabled;

        await this._setIfChanged('speicher.regelung.reserveAktiv', !!reserveActive);
        await this._setIfChanged('speicher.regelung.reserveMinSocPct', reserveMin);
        await this._setIfChanged('speicher.regelung.reserveZielSocPct', reserveTarget);

        const lskEnabledCfg = storageOperatingPolicy.lsk.enabled === true;
        const lskDischargeEnabledCfg = storageOperatingPolicy.lsk.dischargeEnabled === true;
        const lskChargeEnabledCfg = storageOperatingPolicy.lsk.chargeEnabled === true;
        const lskMinSoc = clamp(num(storageOperatingPolicy.lsk.minSocPct, reserveMin), 0, 100);
        const lskMaxSoc = clamp(num(storageOperatingPolicy.lsk.maxSocPct, 100), lskMinSoc, 100);

        // Eigenverbrauch (Entladen optional)
        // Hybrid-/Gateway-Prioritaet ab 0.6.255: Der Haken aktiviert keine
        // permanente externe AC-Lastfolger-Logik mehr.
        const feneconAcModeConfigured = !!feneconHybridConfigured;
        const feneconAcMode = false;

        const selfDischargeEnabled = storageOperatingPolicy.self.enabled === true;
        const strategyStorageAliases = storageAuthorityEarly.selectedTopology === 'farm'
            ? farmRowsEarly
                .map((row, index) => (row && row.enabled === true ? `storagefarm:${index + 1}` : ''))
                .filter(Boolean)
            : ['storage:primary'];
        const strategyStorageOverlay = resolveStorageStrategyOverlay(this.adapter, strategyStorageAliases, { now });
        let selfMinSoc = clamp(num(storageOperatingPolicy.self.minSocPct, 10), 0, 100);
        if (strategyStorageOverlay.active && Number.isFinite(Number(strategyStorageOverlay.minSocPct))) {
            // Betriebsstrategien dürfen die vorhandene Entladeuntergrenze nur
            // anheben. Sie können niemals eine strengere Speicher-/MultiUse-
            // Reserve oder Herstellergrenze absenken.
            selfMinSoc = Math.max(selfMinSoc, clamp(Number(strategyStorageOverlay.minSocPct), 0, 100));
        }
        const selfMaxSoc = clamp(num(storageOperatingPolicy.self.maxSocPct, 100), selfMinSoc, 100);

        // Alte Gateway-EV-Prioritaets-/PV-Block-Caps werden durch den neuen Modus
        // nicht mehr aktiviert. Flexible Verbraucher bleiben in der Standardlogik.
        const evPriorityBlockStorageCharge = false;
        const evPriorityStarvedW = 0;

        // Zielmitte und Messtoleranz gehoeren ausschliesslich zur aktiven
        // Speicher-Topologie. MultiUse erweitert nur SoC-/Reserve-Zonen und darf
        // keine zweite NVP-Abstimmung ueberlagern.
        const selfTargetGridW = activeStorageNvpTargetW;
        const selfImportThresholdW = activeStorageNvpHysteresisW;

        // NVP-Schnellregler: Die frische RAW-Messung ist die Fuehrungsgroesse der
        // Eigenverbrauchsregelung. Eine langsamere Glättung bleibt ausschliesslich
        // als Diagnose-/Anzeigehilfe erhalten und darf den Speicherwriter nicht
        // mehr um mehrere Sekunden verzoegern.
        const selfNvpBaseW = (typeof gridRawW === 'number' && Number.isFinite(gridRawW))
            ? gridRawW
            : ((typeof gridW === 'number' && Number.isFinite(gridW)) ? gridW : null);
        const selfNvpStabilizer = this._buildSelfNvpControlSignal(
            selfNvpBaseW,
            now,
            cfg,
            selfTargetGridW,
            selfImportThresholdW,
        );
        await this._setIfChanged('speicher.regelung.selfNvpRawW', Number.isFinite(Number(selfNvpStabilizer.rawW)) ? Math.round(Number(selfNvpStabilizer.rawW)) : null);
        await this._setIfChanged('speicher.regelung.selfNvpFilteredW', Number.isFinite(Number(selfNvpStabilizer.filteredW)) ? Math.round(Number(selfNvpStabilizer.filteredW)) : null);
        await this._setIfChanged('speicher.regelung.selfNvpControlW', Number.isFinite(Number(selfNvpStabilizer.controlW)) ? Math.round(Number(selfNvpStabilizer.controlW)) : null);
        await this._setIfChanged('speicher.regelung.selfNvpControlMode', String(selfNvpStabilizer.mode || ''));
        await this._setIfChanged('speicher.regelung.selfNvpFastServoActive', selfNvpStabilizer.fastServoActive === true);
        await this._setIfChanged('speicher.regelung.selfNvpMeasurementToleranceW', Math.max(0, Math.round(selfImportThresholdW)));

        await this._setIfChanged('speicher.regelung.lskMinSocPct', lskMinSoc);
        await this._setIfChanged('speicher.regelung.lskMaxSocPct', lskMaxSoc);
        await this._setIfChanged('speicher.regelung.selfMinSocPct', selfMinSoc);
        await this._setIfChanged('speicher.regelung.selfMaxSocPct', selfMaxSoc);
        await this._setIfChanged('speicher.regelung.strategyActive', strategyStorageOverlay.active === true);
        await this._setIfChanged('speicher.regelung.strategyMinSocPct', strategyStorageOverlay.active ? selfMinSoc : null);
        await this._setIfChanged('speicher.regelung.strategyTargetSocPct', strategyStorageOverlay.active && Number.isFinite(Number(strategyStorageOverlay.targetSocPct)) ? Number(strategyStorageOverlay.targetSocPct) : null);
        await this._setIfChanged('speicher.regelung.strategyAbsoluteMinSocPct', strategyStorageOverlay.active && Number.isFinite(Number(strategyStorageOverlay.absoluteMinSocPct)) ? Number(strategyStorageOverlay.absoluteMinSocPct) : null);
        await this._setIfChanged('speicher.regelung.strategyPhase', String(strategyStorageOverlay.phase || ''));
        await this._setIfChanged('speicher.regelung.strategyReason', String(strategyStorageOverlay.reason || ''));
        await this._setIfChanged('speicher.regelung.strategyExpiresAt', Math.max(0, Math.round(Number(strategyStorageOverlay.request && strategyStorageOverlay.request.expiresAt) || 0)));
        await this._setIfChanged('speicher.regelung.selfSocPolicySource', String(storageOperatingPolicy.source || 'standalone-default'));
        await this._setIfChanged('speicher.regelung.selfSocPolicyJson', JSON.stringify(storageOperatingPolicy));
        await this._setIfChanged('speicher.regelung.selfTargetGridImportW', selfTargetGridW);
        await this._setIfChanged('speicher.regelung.selfImportThresholdW', selfImportThresholdW);
        await this._setIfChanged('speicher.regelung.selfNvpTuningTopology', String(storageOperatingPolicy.nvpTuning && storageOperatingPolicy.nvpTuning.topology || storageAuthorityEarly.selectedTopology || 'none'));
        await this._setIfChanged('speicher.regelung.selfNvpTuningSource', String(storageOperatingPolicy.nvpTuning && storageOperatingPolicy.nvpTuning.source || storageOperatingPolicy.self.nvpTuningSource || ''));
        await this._setIfChanged('speicher.regelung.selfNvpTuningJson', JSON.stringify(storageOperatingPolicy.nvpTuning || {}));
        await this._setIfChanged('speicher.regelung.selfEntladenAktiviert', !!selfDischargeEnabled);
        await this._setIfChanged('speicher.regelung.lskPolicyAktiv', !!lskEnabledCfg);
        await this._setIfChanged('speicher.regelung.lskEntladenAktiviert', !!lskDischargeEnabledCfg);
        await this._setIfChanged('speicher.regelung.lskLadenAktiviert', !!lskChargeEnabledCfg);
        await this._setIfChanged('speicher.regelung.multiUsePolicyActive', !!multiUsePolicyActive);
        await this._setIfChanged('speicher.regelung.multiUsePolicyIgnored', !!ignoreStaleMultiUsePolicy);
        await this._setIfChanged('speicher.regelung.policyMode', multiUsePolicyActive ? 'multiuse' : 'eigenverbrauch');
        await this._setIfChanged('speicher.regelung.policyLayerStorageOnly', !!storageOnlyPolicyActive);

        // Grenzen / Glättung
        // maxChargeW/maxDischargeW sind *optionale* Software-Clamps.
        // 0 => unbegrenzt (kein Geräte-Clamp). Die Home-Lizenz besitzt trotzdem
        // einen finalen 50-kW-Hardcap; Pro bleibt lizenzseitig frei skalierbar.
        const maxChargeLimitW_cfg = Math.max(0, num(cfg.maxChargeW, 0));        // Laden: negativ (Betrag)
        const maxDischargeLimitW_cfg = Math.max(0, num(cfg.maxDischargeW, 0));  // Entladen: positiv
        const maxChargeW = (maxChargeLimitW_cfg > 0) ? maxChargeLimitW_cfg : Number.POSITIVE_INFINITY;
        const maxDischargeW = (maxDischargeLimitW_cfg > 0) ? maxDischargeLimitW_cfg : Number.POSITIVE_INFINITY;

        // Nicht gesetzte Expertenwerte werden lizenz- und nennleistungsabhängig
        // vorbelegt. Ein expliziter Wert – einschließlich 0 zum Abschalten einer
        // Rampe/Quantisierung – bleibt autoritativ.
        const configuredStepW = Number(cfg.stepW);
        const stepW = Number.isFinite(configuredStepW)
            ? Math.max(0, configuredStepW)
            : Math.max(0, Number(storageLicensePowerProfile.defaultStepW || 1));
        const configuredMaxDeltaW = Number(cfg.maxDeltaWPerTick);
        const maxDelta = Number.isFinite(configuredMaxDeltaW)
            ? Math.max(0, configuredMaxDeltaW)
            : Math.max(0, Number(storageLicensePowerProfile.defaultMaxDeltaWPerTick || 500));
        const configuredPvMaxDeltaW = Number(cfg.pvMaxDeltaWPerTick);
        const pvMaxDeltaCfg = Number.isFinite(configuredPvMaxDeltaW)
            ? Math.max(0, configuredPvMaxDeltaW)
            : Math.max(0, Number(storageLicensePowerProfile.defaultPvMaxDeltaWPerTick || 1500)); // 0 => nutzt globale Rampe

        // Herstellerunabhaengiger Istwert-Puffer fuer das geschlossene NVP-
        // Balancing. Der normale staleTimeout bleibt fuer Schutzpfade unveraendert;
        // nur die Regelbasis darf den letzten validen Batterie-Istwert laenger
        // halten, weil viele Speicher NVP und Batterieleistung asynchron melden.
        const legacyFeedbackFreshMs = Math.max(1000, num(cfg.balanceFeedbackMaxAgeMs, 8000));
        const balanceFeedbackFreshMs = Math.min(staleMs, legacyFeedbackFreshMs);
        const balanceFeedbackHoldSec = clamp(num(cfg.balanceFeedbackHoldSec, 45), 1, 300);
        const balanceFeedbackHoldMs = Math.max(balanceFeedbackFreshMs, balanceFeedbackHoldSec * 1000);
        const balanceFeedbackPredictionSteps = clamp(num(cfg.balanceFeedbackPredictionSteps, 4), 0, 20);
        const profilePredictionDefaultW = Math.max(
            0,
            Number(storageLicensePowerProfile.defaultBalancePredictionMaxW || 10000),
        );
        const derivedPredictionLimitW = Math.max(
            500,
            profilePredictionDefaultW,
            (maxDelta > 0 ? maxDelta : Number(storageLicensePowerProfile.defaultMaxDeltaWPerTick || 500)) * balanceFeedbackPredictionSteps,
        );
        const configuredPredictionMaxW = Number(cfg.balanceFeedbackPredictionMaxW);
        const balanceFeedbackPredictionMaxWUncapped = Number.isFinite(configuredPredictionMaxW)
            ? Math.max(0, configuredPredictionMaxW)
            : derivedPredictionLimitW;
        const balanceFeedbackPredictionMaxW = storageLicenseHardLimitW > 0
            ? Math.min(balanceFeedbackPredictionMaxWUncapped, storageLicenseHardLimitW)
            : balanceFeedbackPredictionMaxWUncapped;
        const storageBalanceFeedback = this._resolveBatteryBalanceFeedback({
            nowMs: now,
            measuredW: battPowerObservedW,
            measuredAgeMs: battPowerAge,
            measuredSampleTs: battPowerSampleTs,
            measuredSampleKey: battPowerSampleKey,
            mappingTrusted: battPowerMappingTrusted,
            objectId: battPowerObjectId,
            source: battPowerFeedbackSource,
            freshAgeMs: balanceFeedbackFreshMs,
            holdAgeMs: balanceFeedbackHoldMs,
            lastTargetW: getLastStorageBalanceTargetW(),
            lastTargetWriteMs: this._lastTargetWriteMs,
            lastTargetAllowed: isStorageBalanceSource(this._lastSource),
            maxPredictionDeltaW: balanceFeedbackPredictionMaxW,
            zeroToleranceW: Math.max(100, stepW * 2, selfImportThresholdW),
        });
        const balanceBatteryPowerW = storageBalanceFeedback.usable ? Number(storageBalanceFeedback.feedbackW) : null;
        const balanceBatteryMeasuredW = storageBalanceFeedback.usable ? Number(storageBalanceFeedback.measuredW) : null;
        const balanceBatteryAgeMs = storageBalanceFeedback.usable ? Number(storageBalanceFeedback.sampleAgeMs) : null;
        const balanceBatteryTrusted = storageBalanceFeedback.usable === true;
        const nvpBalanceFeedback = (!farmEnabled && feneconDirectProfileActive)
            ? (this._resolveFeneconDirectNvpFeedback({
                nowMs: now,
                freshAgeMs: balanceFeedbackFreshMs,
                holdAgeMs: balanceFeedbackHoldMs,
            }) || storageBalanceFeedback)
            : storageBalanceFeedback;
        const nvpBalanceBatteryPowerW = nvpBalanceFeedback.usable ? Number(nvpBalanceFeedback.feedbackW) : null;
        const nvpBalanceBatteryMeasuredW = nvpBalanceFeedback.usable ? Number(nvpBalanceFeedback.measuredW) : null;
        const nvpBalanceBatteryAgeMs = nvpBalanceFeedback.usable ? Number(nvpBalanceFeedback.sampleAgeMs) : null;
        const nvpBalanceBatteryTrusted = nvpBalanceFeedback.usable === true;

        await this._setIfChanged('speicher.regelung.batteryPowerBalanceTrusted', balanceBatteryTrusted);
        await this._setIfChanged('speicher.regelung.batteryPowerFeedbackMode', String(storageBalanceFeedback.source || ''));
        await this._setIfChanged('speicher.regelung.batteryPowerFeedbackMeasuredW', Number.isFinite(balanceBatteryMeasuredW) ? Math.round(balanceBatteryMeasuredW) : null);
        await this._setIfChanged('speicher.regelung.batteryPowerFeedbackBasisW', Number.isFinite(balanceBatteryPowerW) ? Math.round(balanceBatteryPowerW) : null);
        await this._setIfChanged('speicher.regelung.batteryPowerFeedbackAgeMs', Number.isFinite(balanceBatteryAgeMs) ? Math.round(balanceBatteryAgeMs) : null);
        await this._setIfChanged('speicher.regelung.batteryPowerFeedbackSampleTs', Number.isFinite(Number(storageBalanceFeedback.sampleTs)) ? Math.round(Number(storageBalanceFeedback.sampleTs)) : null);
        await this._setIfChanged('speicher.regelung.batteryPowerFeedbackSampleUpdated', !!storageBalanceFeedback.sampleUpdated);
        const feedbackSampleIntervalMs = storageBalanceFeedback.sampleIntervalMs !== null
            && storageBalanceFeedback.sampleIntervalMs !== undefined
            && storageBalanceFeedback.sampleIntervalMs !== ''
            && Number.isFinite(Number(storageBalanceFeedback.sampleIntervalMs))
            ? Math.round(Number(storageBalanceFeedback.sampleIntervalMs))
            : null;
        const feedbackSampleCadenceMs = storageBalanceFeedback.sampleCadenceMs !== null
            && storageBalanceFeedback.sampleCadenceMs !== undefined
            && storageBalanceFeedback.sampleCadenceMs !== ''
            && Number.isFinite(Number(storageBalanceFeedback.sampleCadenceMs))
            ? Math.round(Number(storageBalanceFeedback.sampleCadenceMs))
            : null;
        await this._setIfChanged('speicher.regelung.batteryPowerFeedbackSampleIntervalMs', feedbackSampleIntervalMs);
        await this._setIfChanged('speicher.regelung.batteryPowerFeedbackCadenceMs', feedbackSampleCadenceMs);
        await this._setIfChanged('speicher.regelung.batteryPowerFeedbackHeld', !!storageBalanceFeedback.held);
        await this._setIfChanged('speicher.regelung.batteryPowerFeedbackPredicted', !!storageBalanceFeedback.predicted);
        await this._setIfChanged('speicher.regelung.batteryPowerFeedbackPredictionDeltaW', Math.round(Number(storageBalanceFeedback.predictionDeltaW) || 0));
        await this._setIfChanged('speicher.regelung.batteryPowerFeedbackHoldMs', Math.round(balanceFeedbackHoldMs));

        // Policy-spezifische Limits (0 => global)
        const lskMaxChargeW_cfg = Math.max(0, num(cfg.lskMaxChargeW, 0));
        const lskMaxDischargeW_cfg = Math.max(0, num(cfg.lskMaxDischargeW, 0));
        const selfMaxChargeW_cfg = Math.max(0, num(cfg.selfMaxChargeW, 0));
        const selfMaxDischargeW_cfg = Math.max(0, num(cfg.selfMaxDischargeW, 0));
        const reserveGridChargeW = Math.max(0, num(cfg.reserveGridChargeW, 0));

        const lskMaxDischargeEff = Math.min(maxDischargeW, (lskMaxDischargeW_cfg > 0 ? lskMaxDischargeW_cfg : maxDischargeW));
        const lskMaxChargeEff = Math.min(maxChargeW, (lskMaxChargeW_cfg > 0 ? lskMaxChargeW_cfg : maxChargeW));
        const selfMaxDischargeEff = Math.min(maxDischargeW, (selfMaxDischargeW_cfg > 0 ? selfMaxDischargeW_cfg : maxDischargeW));
        const selfMaxChargeEff = Math.min(maxChargeW, (selfMaxChargeW_cfg > 0 ? selfMaxChargeW_cfg : maxChargeW));

        // 1) Lastspitzenkappung: wenn Peak-Shaving aktiv und Grenzwert überschritten → Entladen
        //    Wichtig: Diese Logik darf den Netzanschluss NICHT überlasten. Daher wird hier nicht "absolut" auf
        //    (Import - Limit) gesetzt (das führt zu einem Fixpunkt), sondern als Delta/Integrator auf die bestehende
        //    Sollleistung aufaddiert. Dadurch erreicht der Speicher das Ziel (Import <= Limit) zuverlässig.
        if (peakEnabled && lskDischargeEnabledCfg) {
            const limitW = (typeof psLimitW === 'number' && psLimitW > 0) ? psLimitW : null;

            // Für die Schutzfunktion immer den Rohwert am Netzanschlusspunkt verwenden (keine Mittelwert-Schönung).
            const nvpRawW = (typeof gridRawW === 'number') ? gridRawW : gridW;
            const importNowW = Math.max(0, typeof nvpRawW === 'number' ? nvpRawW : 0);

            const lastWasLsk = (this._lastSource === 'lastspitze');
            const hasLimit = (typeof limitW === 'number');

            if (hasLimit && (importNowW > limitW || lastWasLsk)) {
                // SoC-Fenster für LSK (mit Hysterese gegen Flattern)
                let socOk = true;
                if (typeof soc === 'number') {
                    this._socLskDischargeEnabled = hystAbove(
                        this._socLskDischargeEnabled,
                        soc,
                        lskMinSoc,
                        lskMinSoc + this._socHystPct,
                    );
                    socOk = this._socLskDischargeEnabled;
                }

                if (reserveActive) {
                    targetW = 0;
                    reason = 'Lastspitzenkappung: nötig, aber Notstrom-Reserve aktiv';
                    source = 'lastspitze';
                } else if (!socOk) {
                    targetW = 0;
                    reason = `Lastspitzenkappung: nötig, aber SoC <= LSK-Min (${lskMinSoc}%)`;
                    source = 'lastspitze';
                } else {
                    // Regelfehler bezogen auf Netzimport: Ziel ist importNowW <= limitW
                    const errW = importNowW - limitW;

                    // Delta-Regelung: Korrektur auf bestehende Sollleistung aufaddieren.
                    // Damit vermeiden wir das "Halbierungs"-Problem (Fixpunkt bei (L+T)/2).
                    const curSetW = (lastWasLsk && typeof this._lastTargetW === 'number') ? Math.max(0, this._lastTargetW) : 0;

                    // Release-Hysterese (unter dem Limit) aus Peak-Shaving nutzen, um Flattern zu vermeiden.
                    const relHystW = Math.max(0, num(psCfg.hysteresisW, 200));
                    let nextSetW = curSetW;

                    if (errW > 0) {
                        // Sofort hochregeln (Safety): jedes Watt über Limit muss weg.
                        nextSetW = curSetW + errW;
                    } else if (errW < -relHystW) {
                        // Unter Limit: langsam/gedämpft zurücknehmen.
                        nextSetW = curSetW + errW; // errW negativ => reduziert Entladen
                    } // sonst halten (Anti-Flattern)

                    nextSetW = clamp(nextSetW, 0, lskMaxDischargeEff);

                    // Fast-Trip/Peak-Shaving kann zusätzliche Überlast melden (gefiltert/Trip).
                    // Damit die LSK-Reaktion nicht "zu klein" bleibt, erzwingen wir mindestens diesen Bedarf.
                    const needW = (typeof psReqRedW === 'number' && psReqRedW > 0) ? psReqRedW
                        : ((typeof psOverW === 'number' && psOverW > 0) ? psOverW : 0);
                    if (needW > 0 && nextSetW < needW) nextSetW = clamp(needW, 0, lskMaxDischargeEff);

                    // Feldschutz 0.8.81: Lastspitzenkappung darf nicht über den sichtbaren
                    // Peak-Bedarf hinaus hochintegrieren. Der sichere Bedarf ist hier:
                    // echte Überschreitung am NVP + echte Batterie-Istentladung + Puffer.
                    // Der letzte Sollwert zählt bewusst NICHT als Demand-Basis. Wenn die
                    // Batterie-Istleistung fehlt, bleibt der Regler NVP-basiert konservativ;
                    // dadurch kann ein falscher Modbus-/Setpoint-DP keinen Industrieanschluss
                    // mit einem zu hohen Entladesollwert gefährden.
                    const lskOverLimitW = Math.max(0, importNowW - limitW);
                    const lskMeasuredDischargeW = (battPowerTrusted && typeof battPowerW === 'number' && Number.isFinite(battPowerW))
                        ? Math.max(0, battPowerW)
                        : 0;
                    const lskSafetyMarginW = 200;
                    const lskDemandCapW = Math.max(0, lskOverLimitW + lskMeasuredDischargeW + lskSafetyMarginW);
                    dischargeDemandHardCapW = (typeof dischargeDemandHardCapW === 'number')
                        ? Math.min(dischargeDemandHardCapW, lskDemandCapW)
                        : lskDemandCapW;
                    dischargeDemandHardCapReason = (battPowerTrusted && typeof battPowerW === 'number')
                        ? 'LSK-NVP-Demand-Cap (Peak-Überlast+Batterie)'
                        : 'LSK-NVP-Demand-Cap (Peak-Überlast ohne Batterie-Istleistung)';
                    nextSetW = Math.min(nextSetW, lskDemandCapW);

                    targetW = nextSetW;
                    reason = `Lastspitzenkappung: entladen (Import ${Math.round(importNowW)} W > Limit ${Math.round(limitW)} W)`;
                    source = 'lastspitze';
                    hardDischargeMinSoc = Math.max(hardDischargeMinSoc, lskMinSoc);

                    // Merken: Peak war aktiv (fuer den verzögerten LSK-Refill).
                    this._lastPeakActiveMs = now;
                }
            }
        }

        // 2) Gate C: Ladepark-Unterstützung (EVCS Boost/Auto) via Speicher-Entladung.
        // Rollenmodell 0.8.81: Diese Kopplung gehört zu MultiUse. Die reine
        // Speicherregelungs-App bleibt Eigenverbrauchsoptimierung und darf keine
        // Ladepark-/Komfortentladung aus alten States starten.
        const evcsStorageAssistPolicyAllowed = !!multiUsePolicyActive;
        if (targetW === 0 && !feneconAcMode) {
            const assistW = await this._readOwnNumber('chargingManagement.control.storageAssistW');
            evcsAssistReqW = (typeof assistW === 'number' && Number.isFinite(assistW)) ? assistW : 0;
            if (typeof assistW === 'number' && assistW > 0) {
                if (!evcsStorageAssistPolicyAllowed) {
                    targetW = 0;
                    reason = 'EVCS-Unterstützung blockiert (MultiUse nicht aktiv; Speicherregelung = Eigenverbrauch pur)';
                    source = 'evcs';
                } else {
                    // EVCS-Unterstützung ist MultiUse-Komfort – wenn Reserve wieder aufgefüllt
                    // werden soll, blockieren wir das bewusst.
                    const reserveMinEff = reserveEnabled ? reserveMin : 0;
                    const socOk = (typeof soc !== 'number') ? true : (soc > Math.max(reserveMinEff, selfMinSoc));
                    if (typeof dischargeAllowed === 'boolean' && dischargeAllowed === false) {
                        targetW = 0;
                        reason = 'EVCS-Unterstützung blockiert (Tarif: Entladen gesperrt)';
                        source = 'evcs';
                    } else if (reserveActive) {
                        targetW = 0;
                        reason = 'EVCS-Unterstützung nötig, aber Notstrom-Reserve aktiv';
                        source = 'evcs';
                    } else if (reserveChargeWanted) {
                        targetW = 0;
                        reason = 'EVCS-Unterstützung blockiert (Reserve soll aufgefüllt werden)';
                        source = 'evcs';
                    } else if (!socOk) {
                        targetW = 0;
                        reason = 'EVCS-Unterstützung blockiert (SoC unter Minimum)';
                        source = 'evcs';
                    } else {
                        targetW = clamp(assistW, 0, maxDischargeW);
                        reason = `EVCS-Unterstützung: entladen (${Math.round(assistW)} W angefordert)`;
                        source = 'evcs';
                        hardDischargeMinSoc = Math.max(hardDischargeMinSoc, Math.max(reserveMinEff, selfMinSoc));
                    }
                }
            }
        }

		// 2) Tarif (dynamischer Zeittarif)
		// - Steuerung kommt aus dem TarifVis-Modul (adapter._tarifVis)
		// - Entladen bei "teuer" nur bis NVP = 0 W (kein Export durch Tarif)
		let tarifState = null;
		if (targetW === 0) {
			const tv = (this.adapter && this.adapter._tarifVis) ? this.adapter._tarifVis : null;
			const tvAktiv = !!(tv && tv.aktiv);
			const tariffNegativeImportPreferred = !!(tv && (tv.negativeActive || tv.gridImportPreferred || tv.netzbezugBevorzugt));
			tarifState = (tvAktiv && typeof tv.state === 'string') ? tv.state : null;

			if (tvAktiv) {
				const want = num(tv.speicherSollW, 0); // negativ = Laden, positiv = Entladen

				// Reserve blockiert Entladen
				if (reserveActive && want > 0) {
					targetW = 0;
					reason = 'Tarif: Entladen blockiert (Reserve aktiv)';
					source = 'tarif';
				} else if (want < 0) {
					// Laden (Tarif günstig)
					// PV-Überschuss wird später separat geregelt; hier geht es um Netzladen.
					if (typeof soc === 'number' && soc >= hardChargeMaxSoc) {
						targetW = 0;
						reason = 'Tarif: Laden blockiert (SoC-Max erreicht)';
						source = 'tarif';
					} else {
						let chargeW = Math.min(Math.abs(want), maxChargeW);
						// Gemeinsame Import-Cap: nie über effektives Netzbezugslimit laden
						// OpenEMS-Ansatz: Begrenzung auf Basis der *realen* Netzleistung ohne aktuelle Batterie-Leistung,
						// um ein „Hin-und-her Springen“ (Sollwert folgt eigenem Einfluss auf den NVP) zu vermeiden.
						//
						// realNvpW = NVP + battPowerW  (battPowerW: +Entladen, -Laden)
						// -> ergibt näherungsweise die Last ohne Batterieeinfluss.
						const battSignedW = balanceBatteryTrusted
							? Number(balanceBatteryPowerW)
							: ((typeof battPowerW === 'number' && Number.isFinite(battPowerW)) ? Number(battPowerW) : 0);
						const nvpNowW = (typeof gridRawW === 'number' && Number.isFinite(gridRawW)) ? Number(gridRawW) : num(gridW, 0);
						const realNvpW = nvpNowW + battSignedW;
						const realImportW = Math.max(0, realNvpW);

						let headroomByImportCapW = null;
						if (typeof importLimitW === 'number' && Number.isFinite(importLimitW) && importLimitW > 0) {
							headroomByImportCapW = Math.max(0, importLimitW - realImportW);
						} else if (typeof importHeadroomEffW === 'number') {
							// Fallback: (ältere Builds) – headroom basiert auf NVP inkl. Batterie; kann flappen,
							// aber ist besser als nichts.
							headroomByImportCapW = Math.max(0, importHeadroomEffW);
						}

						if (typeof headroomByImportCapW === 'number') {
							chargeW = Math.min(chargeW, headroomByImportCapW);
						} else if (peakEnabled && isFinite(psLimitW) && psLimitW > 0) {
							const headroomW = Math.max(0, psLimitW - realImportW);
							chargeW = Math.min(chargeW, headroomW);
						}

						// Nicht gegen Einspeisung "anladen" – PV-Überschuss wird unten behandelt.
						// Hinweis: Dadurch wird bei Einspeisung kein zusätzliches Netzladen erzwungen.
						// (Bewusstes Design: PV-Überschuss-Laden übernimmt dann die Regelung.)
						if (nvpNowW < 0 && !tariffNegativeImportPreferred) {
							chargeW = 0;
						}

						// ------------------------------------------------------------
						// PV‑Reserve / PV‑aware Netzladen (Tarif)
						//
						// Ziel: Wenn PV‑Erzeugung zu erwarten ist, soll der Speicher im
						// günstigen Tarif‑Fenster nicht „voll“ aus dem Netz geladen werden.
						// Stattdessen halten wir einen dynamischen Headroom frei, damit PV
						// tagsüber in den Speicher laden kann (weniger unnötige Zyklen).
						//
						// Vorgehen:
						// - Forecast -> PV Charge‑Potential (kWh) im nächsten Horizon (Default 24h)
						// - captureFactor + confidence => erwartbar speicherbare PV‑kWh
						// - Headroom(%) = kWh / Kapazität
						// - Netzlade‑SoC‑Cap = socTarget - Headroom, mindestens minSocForWait
						// - Wenn SoC >= Cap => Netzladen im Tarif blockieren.
						// ------------------------------------------------------------
						let pvBlockGridCharge = false;
						let pvBlockReason = '';
						let pvDebug = null;
						try {
						  const pf = (this.adapter && this.adapter._pvForecast) ? this.adapter._pvForecast : null;
						  const pvReserveEnabled = (cfg.tariffPvReserveEnabled !== false) && !tariffNegativeImportPreferred; // default: ON, bei Negativpreis bewusst aus
						  if (pvReserveEnabled && pf && pf.valid && Array.isArray(pf.curve) && pf.curve.length) {
						    // Bei sehr alten Forecasts lieber keine PV‑Reserve erzwingen.
						    const maxAgeMs = 24 * 3600000;
						    const ageOk = (pf.ageMs === null || pf.ageMs === undefined) ? true : (pf.ageMs <= maxAgeMs);
						    if (ageOk && typeof soc === 'number' && Number.isFinite(soc)) {
						      // Kapazität (kWh):
						      // - Speicherfarm: Summe aus Farm‑Konfig
						      // - Single: installerConfig.storage.capacityKWh (optional)
						      // - Fallback: gemappter DP (st.capacityKwh)
						      //
						      // Hinweis:
						      // Damit PV‑Reserve im Nacht‑Tarif wirklich verhindert, dass der Speicher
						      // „blind“ auf 100% aus dem Netz geladen wird, brauchen wir eine Kapazität.
						      // Wenn sie nicht gemappt/konfiguriert ist, schätzen wir sie konservativ aus
						      // der im Tarif angeforderten Ladeleistung (SoC‑Cap bleibt dadurch trotzdem aktiv).
						      let capKWh = null;
						      let capKWhSource = '';
						      let capKWhEstimated = false;
						      try {
						        const farmCfg2 = (this.adapter && this.adapter.config && this.adapter.config.storageFarm) ? this.adapter.config.storageFarm : null;
						        const farmEnabledForCapacity = this._getStorageControlAuthority().selectedTopology === 'farm';
						        if (farmEnabledForCapacity && farmCfg2 && Array.isArray(farmCfg2.storages)) {
						          let sum = 0;
						          for (const s of farmCfg2.storages) {
						            if (!s || s.enabled === false) continue;
						            const c = Number(s.capacityKWh);
						            if (Number.isFinite(c) && c > 0) sum += c;
						          }
						          if (sum > 0) {
						            capKWh = sum;
						            capKWhSource = 'farm';
						          }
						        }
						      } catch {
						        // ignore
						      }
						
						      if (!(typeof capKWh === 'number' && Number.isFinite(capKWh) && capKWh > 0)) {
						        const capCfg = Number(this.adapter?.config?.storage?.capacityKWh);
						        if (Number.isFinite(capCfg) && capCfg > 0) {
						          capKWh = capCfg;
						          capKWhSource = 'config';
						        }
						      }
						
						      if (!(typeof capKWh === 'number' && Number.isFinite(capKWh) && capKWh > 0) && this.dp) {
						        const capDp = this.dp.getNumber('st.capacityKwh', null);
						        if (typeof capDp === 'number' && Number.isFinite(capDp) && capDp > 0) {
						          capKWh = capDp;
						          capKWhSource = 'dp';
						        }
						      }
						
						      const socTarget = (typeof hardChargeMaxSoc === 'number' && Number.isFinite(hardChargeMaxSoc)) ? hardChargeMaxSoc : 100;
						
						      // Horizon (h) + Heuristik‑Faktoren
						      const horizonH = clamp(num(cfg.tariffPvReserveHorizonHours, 24), 1, 48);
						      const captureFactor = clamp(num(cfg.tariffPvReserveCaptureFactor, 0.6), 0, 1);
						      const confidence = clamp(num(cfg.tariffPvReserveConfidence, 0.85), 0, 1);
						
							      // PV-Reserve: Niemals auf extrem niedrige SoC-Werte deckeln.
							      // Sonst blockiert sie das Tarif-/NT-Laden schon bei sehr niedrigem SoC (z.B. 10%).
							      // Default: mindestens 20% (konfigurierbar via tariffPvReserveMinSocPct).
							      const reserveMinEff = (typeof reserveMin === 'number' && Number.isFinite(reserveMin)) ? reserveMin : 20;
							      const minSocForWaitCfg = num(cfg.tariffPvReserveMinSocPct, NaN);
							      const minSocForWait = (Number.isFinite(minSocForWaitCfg))
							        ? clamp(minSocForWaitCfg, 0, socTarget)
							        : Math.max(reserveMinEff + 2, 20);
						
						      // PV Charge‑Potential (kWh) über den Horizon, limitiert durch maxChargeW (falls gesetzt).
						      let pvChargePotentialKWh = 0;
						      const t0 = now;
						      const t1 = t0 + horizonH * 3600000;
						      const limitW = (typeof maxChargeW === 'number' && Number.isFinite(maxChargeW) && maxChargeW > 0 && maxChargeW !== Number.POSITIVE_INFINITY)
						        ? maxChargeW
						        : null;
						      for (const seg of pf.curve) {
						        if (!seg || typeof seg.t !== 'number' || typeof seg.dtMs !== 'number' || typeof seg.w !== 'number') continue;
						        const s0 = seg.t;
						        const s1 = seg.t + seg.dtMs;
						        if (s1 <= t0) continue;
						        if (s0 >= t1) break;
						        const ov0 = Math.max(s0, t0);
						        const ov1 = Math.min(s1, t1);
						        const ovMs = ov1 - ov0;
						        if (ovMs <= 0) continue;
						        const w = Math.max(0, seg.w);
						        const wEff = (limitW ? Math.min(w, limitW) : w);
						        pvChargePotentialKWh += (wEff * (ovMs / 3600000)) / 1000;
						      }
						
						      // Erwartbar speicherbare PV‑kWh (konservativ)
						      // Saisonfaktor (Quartale) – optional über VIS-Settings
						      let pvSeasonEnabled = false;
						      let pvSeasonQuarter = null;
						      let pvSeasonFactor = 1;

						      // KI-Automatik: passt den Faktor anhand PV-Forecast (Stärke) an,
						      // damit Kunden keine Quartalswerte manuell pflegen müssen.
						      let pvSeasonAiEnabled = false;
						      let pvSeasonAiUsed = false;
						      let pvSeasonBaseFactor = 1;
						      let pvSeasonAiReason = '';
						      try {
						        if (this.dp) {
						          const kEn = 'vis.settings.tariffPvSeasonEnabled';
						          const en = this.dp.getBoolean(kEn, false);
						          const ageEn = this.dp.getAgeMs(kEn);
						          if (en && (ageEn === null || ageEn <= staleMs)) {
						            pvSeasonEnabled = true;
						            const month = new Date(now).getMonth(); // 0..11
						            const q = Math.floor(month / 3) + 1; // 1..4
						            pvSeasonQuarter = q;

						            // Basisfaktor (manuell) je Quartal
						            const kF = `vis.settings.tariffPvSeasonQ${q}Factor`;
						            const ageF = this.dp.getAgeMs(kF);
						            const fRaw = this.dp.getNumber(kF, 1);
						            if ((ageF === null || ageF <= staleMs) && Number.isFinite(fRaw) && fRaw >= 0) {
						              pvSeasonBaseFactor = clamp(fRaw, 0, 2);
						            } else {
						              pvSeasonBaseFactor = 1;
						            }

						            // KI-Automatik ist immer aktiv (Standard).
						            // Manuelle Quartalsfaktoren bleiben optional als Basiswert (Feintuning).
						            pvSeasonAiEnabled = true;

						            // PV-Stärke aus Forecast ableiten:
						            // - Wenn Kapazität bekannt: Verhältnis PV-kWh / Cap-kWh
						            // - Sonst: heuristische Normierung (12 kWh ≈ "voll" in vielen Haushalten)
						            const pvKwh = Math.max(0, Number(pvChargePotentialKWh) || 0);
						            const capRef = (typeof capKWh === 'number' && Number.isFinite(capKWh) && capKWh > 0) ? capKWh : 12;
						            const pvScore = clamp(pvKwh / capRef, 0, 1); // 0..1
						            const adj = clamp(0.85 + 0.30 * pvScore, 0.75, 1.20); // 0.75..1.20
						            const fAuto = clamp(pvSeasonBaseFactor * adj, 0, 2);

						            pvSeasonFactor = fAuto;
						            pvSeasonAiUsed = true;
						            pvSeasonAiReason = `KI: Q${q} Basis ${pvSeasonBaseFactor.toFixed(2)} * Adj ${adj.toFixed(2)} (PV ${pvKwh.toFixed(1)} kWh, Ref ${capRef.toFixed(1)} kWh)`;
						          }
						        }
						      } catch (_e) {
						        pvSeasonEnabled = false;
						        pvSeasonQuarter = null;
						        pvSeasonFactor = 1;
						        pvSeasonAiEnabled = false;
						        pvSeasonAiUsed = false;
						        pvSeasonBaseFactor = 1;
						        pvSeasonAiReason = '';
						      }

						      const pvStorableKWh = pvChargePotentialKWh * captureFactor * confidence * pvSeasonFactor;
						      // Kapazität: wenn unbekannt, grob aus Tarif‑Ladeleistung schätzen (Fallback)
						      let capKWhEff = capKWh;
							      if (!(typeof capKWhEff === 'number' && Number.isFinite(capKWhEff) && capKWhEff > 0)) {
							        // Schätzung (Fallback): bewusst eher "zu groß" wählen, damit PV-Reserve nicht zu aggressiv
							        // wird, wenn die reale Kapazität nicht konfiguriert/ermittelbar ist.
							        // Praxis: viele Systeme liegen eher bei 4–8h @ Nennleistung.
							        const estHours = 6;
						        const reqW = (Number.isFinite(Math.abs(want)) && Math.abs(want) > 0) ? Math.abs(want) : null;
						        let estKWh = (reqW && Number.isFinite(reqW)) ? (reqW / 1000) * estHours : NaN;
						        if (Number.isFinite(estKWh) && estKWh > 0) {
						          // Sane bounds to avoid extreme behaviour on bad configs
							          estKWh = clamp(estKWh, 10, 500);
						          capKWhEff = estKWh;
						          capKWhSource = 'estimated';
						          capKWhEstimated = true;
						        }
						      }
						
						      if (typeof capKWhEff === 'number' && Number.isFinite(capKWhEff) && capKWhEff > 0) {
						        // Headroom in % (clamp auf sinnvolle Range)
						        const headroomSocPctRaw = (pvStorableKWh > 0) ? (pvStorableKWh / capKWhEff) * 100 : 0;
						        const headroomSocPct = clamp(headroomSocPctRaw, 0, socTarget);
						
						        // Netzlade‑SoC‑Cap: Ziel minus Headroom (mindestens minSocForWait)
						        const capSocPct = clamp(socTarget - headroomSocPct, minSocForWait, socTarget);
						
						        const active = (headroomSocPct >= 0.5) && (capSocPct < (socTarget - 0.5));
						        if (active && soc >= (capSocPct - 1e-9)) {
						          pvBlockGridCharge = true;
						          const capNote = capKWhEstimated ? ' (Cap geschätzt)' : '';
						          pvBlockReason = `PV‑Reserve: Netzladen bis max ${capSocPct.toFixed(1)}%${capNote} (Headroom ${headroomSocPct.toFixed(1)}% ≈ ${pvStorableKWh.toFixed(1)} kWh) · Saison ${pvSeasonFactor.toFixed(2)}${pvSeasonAiUsed ? ' (KI)' : ''}`;
						        }
						
						        pvDebug = {
						          mode: 'pvReserveCap',
						          ageMs: (pf.ageMs === null || pf.ageMs === undefined) ? null : Math.round(Number(pf.ageMs)),
						          capKWh: Number(capKWhEff),
						          capKWhSource,
						          capKWhEstimated,
						          socNow: soc,
						          socTarget,
						          horizonH,
						          pvChargePotentialKWh: Number(pvChargePotentialKWh),
						          captureFactor,
						          confidence,
						          pvSeasonEnabled,
						          pvSeasonQuarter,
						          pvSeasonFactor: Number(pvSeasonFactor),
						          pvSeasonAiEnabled,
						          pvSeasonAiUsed,
						          pvSeasonBaseFactor: Number(pvSeasonBaseFactor),
						          pvSeasonAiReason,
						          pvStorableKWh: Number(pvStorableKWh),
						          headroomSocPct: Number(headroomSocPct),
						          capSocPct: Number(capSocPct),
						          minSocForWait,
						          blocked: pvBlockGridCharge,
						          reason: pvBlockGridCharge ? pvBlockReason : '',
						        };
						      } else {
						        // Kapazität nicht ermittelbar -> PV‑Reserve kann nicht sauber rechnen, aber Debug liefern.
						        pvDebug = {
						          mode: 'pvReserveUnavailable',
						          ageMs: (pf.ageMs === null || pf.ageMs === undefined) ? null : Math.round(Number(pf.ageMs)),
						          capKWh: null,
						          capKWhSource: capKWhSource || '',
						          capKWhEstimated: false,
						          socNow: soc,
						          socTarget,
						          horizonH,
						          pvChargePotentialKWh: Number(pvChargePotentialKWh),
						          captureFactor,
						          confidence,
						          pvSeasonEnabled,
						          pvSeasonQuarter,
						          pvSeasonFactor: Number(pvSeasonFactor),
						          pvSeasonAiEnabled,
						          pvSeasonAiUsed,
						          pvSeasonBaseFactor: Number(pvSeasonBaseFactor),
						          pvSeasonAiReason,
						          pvStorableKWh: Number(pvStorableKWh),
						          headroomSocPct: null,
						          capSocPct: null,
						          minSocForWait,
						          blocked: false,
						          reason: 'PV‑Reserve: Kapazität unbekannt',
						        };
						      }
						    }
						  }
						} catch {
						  // ignore
						}

						if (pvDebug) {
						  pvAwareTariff = pvDebug;
						}

						if (pvBlockGridCharge) {
						  chargeW = 0;
						}
						chargeW = Math.max(0, chargeW);
						// Lade-Cap 0.8.80: Der nach Headroom, Importlimit und PV-Reserve erlaubte
						// Netzlade-Wert wird nach der Rampe erneut hart angewendet. Dadurch kann
						// ein alter hoher Lade-Sollwert nicht weiterlaufen, wenn der Tarif-/Headroom
						// Regler im aktuellen Tick nur noch wenig oder 0 W Laden erlaubt.
						chargeDemandHardCapW = chargeW;
						chargeDemandHardCapReason = pvBlockGridCharge ? 'Tarif-PV-Reserve-Lade-Cap' : 'Tarif-Netzlade-Headroom-Cap';
						targetW = -chargeW;
						if (pvBlockGridCharge) {
							reason = pvBlockReason || 'Tarif: günstig – PV Forecast -> Netzladen gesperrt';
						} else if (tariffNegativeImportPreferred) {
							reason = (targetW === 0) ? 'Tarif: Negativpreis – Netzladen nicht möglich' : 'Tarif: Negativpreis – Netzladen bevorzugt';
						} else {
							reason = (targetW === 0) ? 'Tarif: günstig – Netzladen nicht möglich' : 'Tarif: günstig – Netzladen';
						}
						source = 'tarif';
					}
				} else if (want > 0) {
					// Entladen (Tarif teuer/neutral/unbekannt): NVP-Regelung auf kleinen Netzbezug.
					//
					// WICHTIG (Bug-Fix):
					// Eine reine "Sollleistung = aktueller Import" Regelung konvergiert mathematisch auf ~50% der Last
					// (Fixpunkt: Speicher ≈ Netzbezug ≈ Last/2). Das erklärt hohe Bezüge trotz Entladen.
					//
					// Lösung: inkrementelle Regelung (Sollwert = letzter Sollwert + Fehler), mit Deadband.
					// Ziel: Netzbezug nahe Zielwert halten (Default 100 W), ohne Export durch Messrauschen.
					if (typeof soc === 'number' && soc < selfMinSoc) {
						targetW = 0;
						reason = 'Tarif: Entladen blockiert (SoC-Min erreicht)';
						source = 'tarif';
					} else {
						const targetImportW = Math.max(0, num(cfg.tariffTargetGridImportW, selfTargetGridW));
						const deadbandW = Math.max(0, num(cfg.tariffImportThresholdW, selfImportThresholdW));

						// Tarif-Entladung regelt am NVP.
						// Primär nutzen wir den ROH-Wert (NVP), weil eine starke Glättung zu Verzögerungen
						// und damit zu Sollwert-Spikes/Überschwingern führen kann.
						// Stabilisierung erfolgt über Deadband + Dispatcher (Schritt/Rampe).
						const nvpRawW = (typeof gridRawW === 'number') ? gridRawW : gridW;
						const nvpCtrlW = (typeof nvpRawW === 'number') ? nvpRawW : gridW;

						// Auch im teuren Tarif-Fenster gilt dieselbe physikalische Regelung wie
						// bei der reinen Eigenverbrauchsoptimierung: echte Batterie-Istleistung
						// plus NVP-Differenz. So springt die Vorgabe nicht zwischen altem Sollwert
						// und aktuellem Netzbezug, sondern folgt der bereits wirksamen Leistung.
						const lastTariffTargetW = (this._lastSource === 'tarif' && Number.isFinite(Number(this._lastTargetW)))
							? Number(this._lastTargetW)
							: 0;
						const tariffFeedForward = buildStorageFeedForward(targetImportW);
						const balance = this._buildActualAwareNvpBalance({
							rawNvpW: nvpRawW,
							fallbackNvpW: nvpCtrlW,
							nvpAgeMs: (typeof gridRawAge === 'number') ? gridRawAge : gridAge,
							targetNvpW: targetImportW,
							deadbandW,
							batteryPowerW: nvpBalanceBatteryPowerW,
							batteryMeasuredW: nvpBalanceBatteryMeasuredW,
							batteryAgeMs: nvpBalanceBatteryAgeMs,
							batteryPowerTrusted: nvpBalanceBatteryTrusted,
							batteryFeedbackSource: nvpBalanceFeedback.source,
							batteryFeedbackHeld: nvpBalanceFeedback.held,
							batteryFeedbackPredicted: nvpBalanceFeedback.predicted,
							batteryFeedbackPredictionDeltaW: nvpBalanceFeedback.predictionDeltaW,
							batteryFeedbackHoldAgeMs: balanceFeedbackHoldMs,
							batteryFeedbackKey: nvpBalanceFeedback.key,
							batterySampleTs: nvpBalanceFeedback.sampleTs,
							balanceControlKey: 'storage-nvp',
							fastServoActive: true,
							preferRawNvp: true,
							lastTargetW: lastTariffTargetW,
							lastTargetAllowed: this._lastSource === 'tarif',
							maxDischargeCorrectionW: maxDelta,
							maxChargeCorrectionW: pvMaxDeltaCfg > 0 ? pvMaxDeltaCfg : maxDelta,
							feedbackMaxAgeMs: balanceFeedbackHoldMs,
							nvpFeedbackMaxAgeMs: staleMs,
							feedbackMaxSkewMs: Math.max(0, num(cfg.balanceFeedbackMaxSkewMs, 5000)),
							feedbackRequireAligned: false,
							feedForwardUsable: tariffFeedForward.usable === true,
							feedForwardTargetW: tariffFeedForward.targetW,
							feedForwardExpectedActualW: tariffFeedForward.expectedActualW,
							feedForwardPvW: tariffFeedForward.pvW,
							feedForwardLoadW: tariffFeedForward.loadW,
							feedForwardPvSource: tariffFeedForward.pvSource,
							feedForwardLoadSource: tariffFeedForward.loadSource,
							feedForwardReason: tariffFeedForward.reason,
							feedForwardMeasurementSkewMs: tariffFeedForward.measurementSkewMs,
							feedForwardPlausibilityW: balanceFeedForwardPlausibilityW,
							stepW,
						});
						storageNvpBalanceDiag = { ...balance, policy: 'tarif' };
						storageNvpBalanceRampManaged = storageNvpBalanceRampManaged || balance.rampManaged;
						const battW = balance.feedbackUsed ? Math.max(0, Number(balance.baseW) || 0) : null;
						let nextSetW = Math.max(0, Number(balance.targetW) || 0);

						// Safety-Clamp gegen unnötige Export-Spikes:
						// Begrenze die Entladung auf den aktuell am NVP belegbaren Bedarf:
						// echter Import + echte gemessene Batterie-Entladung + kleiner Puffer.
						// WICHTIGER Feldfix 0.8.81: Abgeleitete Gebäudelasten (z. B. derived.loadTotalW)
						// dürfen diesen Cap NICHT vergrößern. Bei gleichzeitiger PV-Erzeugung kann die
						// Gebäudelast deutlich größer als der Netzbezug sein; würde man sie als Cap nutzen,
						// könnte der Speicher trotz nur 2-3 kW Import wieder auf zweistellige kW-Werte laufen.
						const importRawNowW = Math.max(0, (typeof nvpRawW === 'number') ? nvpRawW : 0);
						const measuredDischargeNowW = (typeof battW === 'number') ? Math.max(0, battW) : 0;
						const safetyMarginW = 200;
						const protectedTariffImportW = Math.max(0, importRawNowW - evcsStorageProtectedLoadW);
							const protectedTariffMarginW = protectedTariffImportW > 0 ? safetyMarginW : 0;
							const measuredDemandCapW = Math.max(0, protectedTariffImportW + measuredDischargeNowW + protectedTariffMarginW);
						// Ohne vertrauenswürdige Batterie-Istleistung darf der letzte Sollwert auch in
						// der Deadband nicht als harte Obergrenze weiterleben. Sonst kann ein alter
						// hoher Entladebefehl nach der Rampe erneut durchrutschen.
						const maxByDemandW = measuredDemandCapW;
						if (Number.isFinite(maxByDemandW) && maxByDemandW >= 0) {
							dischargeDemandHardCapW = (typeof dischargeDemandHardCapW === 'number')
								? Math.min(dischargeDemandHardCapW, maxByDemandW)
								: maxByDemandW;
							dischargeDemandHardCapReason = (typeof battW === 'number')
								? 'Tarif-NVP-Demand-Cap (NVP+gemessene Batterie)'
								: 'Tarif-NVP-Demand-Cap (konservativ ohne Batterie-Istleistung)';
							nextSetW = Math.min(nextSetW, maxByDemandW);
						}

						// WICHTIG (Tarif-Logik / Bugfix):
						// Die vom Endkunden in der VIS eingetragene "Speicher-Leistung" (tv.speicherSollW)
						// soll im Tarif-Fenster ausschliesslich die Beladeleistung (Netzladen im guenstigen Fenster)
						// begrenzen. Fuer die Entladung wird am Netzverknuepfungspunkt (NVP) geregelt,
						// damit der Netzbezug gegen ~0 (bzw. targetImportW) faehrt.
						//
						// Technische Limits bleiben natuerlich aktiv (maxDischargeW + Demand-Clamp oben).
						const maxEffW = maxDischargeW;
						nextSetW = clamp(nextSetW, 0, maxEffW);

						targetW = nextSetW;
						reason = (targetW === 0)
							? 'Tarif: teuer – kein Bedarf'
							: `Tarif: teuer – NVP-Regelung (Ziel Import≈${Math.round(targetImportW)}W${(typeof battW === 'number') ? ', Balancing' : ''})`;
						source = 'tarif';
					}
				}
			}
		}
// 3) Eigenverbrauch: Entladen zur Netzbezug-Reduktion (optional)
if (targetW === 0 && selfDischargeEnabled) {
    // Wenn der dynamische Tarif im "günstig"-Fenster ist, kann es gewünscht sein,
    // die Eigenverbrauchs-Entladung zu sperren (z.B. während aktivem Netzladen).
    //
    // BUGFIX (Phase 8+):
    // In Konstellationen, in denen das Tarif-Netzladen zwar "geplant" ist, aber durch
    // PV‑Reserve / PV‑Forecast bewusst blockiert wird (=> targetW bleibt 0), darf die
    // Eigenverbrauchs-Entladung nicht pauschal gesperrt werden. Sonst bleibt der Speicher
    // "eingefroren" und der Kunde zieht unnötig Netzbezug.
    const tariffBlocksDischarge = (typeof dischargeAllowed === 'boolean' && dischargeAllowed === false);
    const reasonTxt = (reason === null || reason === undefined) ? '' : String(reason);
    const pvReserveBlocked = (source === 'tarif') && (
        (reasonTxt.includes('PV') && reasonTxt.toLowerCase().includes('reserve')) ||
        reasonTxt.toLowerCase().includes('pv forecast')
    );

    if (feneconAcMode) {
        let socOk = true;
        if (typeof soc === 'number') {
            this._socSelfDischargeEnabled = hystAbove(
                this._socSelfDischargeEnabled,
                soc,
                selfMinSoc,
                selfMinSoc + this._socHystPct,
            );
            socOk = this._socSelfDischargeEnabled;
        }

        const allow = (!reserveActive && !reserveChargeWanted && socOk);
        const acLoad = getFeneconAcLoadTargetW();
        const acLoadW = (acLoad && typeof acLoad.w === 'number' && Number.isFinite(acLoad.w)) ? Math.max(0, acLoad.w) : 0;

        // Gateway AC darf nicht blind der kompletten AC-Last folgen.
        // Beispiel: PV 10,6 kW, Haus+EVCS 10,3 kW, Speicher entlädt 3,5 kW =>
        // am NVP entstehen ~3,8 kW Export. In diesem Fall muss die AC-Entladung
        // zurückgenommen werden. Deshalb wird der Lastfolger am NVP bilanziert:
        // neue Entladung = aktuelle Entladung + (NVP-Ist - NVP-Ziel).
        const feneconNvpW = (typeof nvpRawW === 'number' && Number.isFinite(nvpRawW))
            ? nvpRawW
            : ((typeof gridW === 'number' && Number.isFinite(gridW)) ? gridW : null);
        const lastWasFenecon = this._lastSource === 'fenecon';
        const currentDischargeW = balanceBatteryTrusted
            ? Math.max(0, Number(balanceBatteryPowerW) || 0)
            : ((battPowerTrusted && typeof battPowerW === 'number' && Number.isFinite(battPowerW))
                ? Math.max(0, battPowerW)
                : 0);
        const feneconTargetNvpW = selfTargetGridW;
        const feneconNvpBand = resolveNvpBandTarget(feneconNvpW, feneconTargetNvpW, selfImportThresholdW);
        const feneconLowerBandW = feneconNvpBand.lowerBandW;
        const feneconUpperBandW = feneconNvpBand.upperBandW;
        const feneconActiveTargetW = feneconNvpBand.outsideBand
            ? feneconNvpBand.activeTargetNvpW
            : null;
        const feneconErrW = feneconNvpBand.bandErrorW;
        const feneconLoadLimitW = acLoadW > 0
            ? acLoadW
            : Math.max(0, importRawW + currentDischargeW);

        // Innerhalb der kleinen Messtoleranz bleibt ein bereits wirksamer Befehl
        // erhalten. Ausserhalb wird direkt zur Zielmitte korrigiert. So verwendet
        // auch der Gateway-/FENECON-Pfad exakt denselben Schnellregler wie
        // Einzelspeicher und Farm.
        let nextSetW = feneconActiveTargetW === null
            ? (lastWasFenecon ? currentDischargeW : 0)
            : (currentDischargeW + feneconErrW);

        // Nicht aus dem Stand auf Messrauschen reagieren. Wenn die Gateway-Regelung
        // bereits aktiv war, darf sie aber weiter fein nachregeln bzw. bei Export
        // schnell zurückfahren.
        if (!lastWasFenecon && feneconActiveTargetW === null) {
            nextSetW = 0;
        }

        const feneconNonEvcsImportW = Math.max(0, (typeof feneconNvpW === 'number' ? Math.max(0, feneconNvpW) : 0) - evcsStorageProtectedLoadW);
        const feneconDemandCapW = Math.max(0, feneconNonEvcsImportW + currentDischargeW + (feneconNonEvcsImportW > 0 ? 200 : 0));
        dischargeDemandHardCapW = (typeof dischargeDemandHardCapW === 'number')
            ? Math.min(dischargeDemandHardCapW, feneconDemandCapW)
            : feneconDemandCapW;
        dischargeDemandHardCapReason = 'Gateway-NVP-Demand-Cap';
        nextSetW = clamp(nextSetW, 0, Math.min(feneconLoadLimitW, selfMaxDischargeEff, feneconDemandCapW));

        if (allow && nextSetW > 0) {
            targetW = nextSetW;
            reason = `Gateway AC: NVP-Balancing (${Math.round(targetW)} W, NVP ${Math.round(feneconNvpW || 0)} W, Ziel ${Math.round(selfTargetGridW)} W, Last ${Math.round(acLoadW)} W, Quelle ${String(acLoad && acLoad.source ? acLoad.source : 'unbekannt')})`;
            source = 'fenecon';
            hardDischargeMinSoc = Math.max(hardDischargeMinSoc, selfMinSoc);
        } else if (acLoadW > 0 && (source === 'idle' || reason === 'Keine Aktion')) {
            if (reserveActive) {
                reason = 'Gateway AC: NVP-Balancing blockiert (Reserve aktiv)';
                source = 'reserve';
            } else if (reserveChargeWanted) {
                reason = 'Gateway AC: NVP-Balancing blockiert (Reserve soll aufgefüllt werden)';
                source = 'reserve';
            } else if (!socOk) {
                reason = `Gateway AC: NVP-Balancing blockiert (SoC <= ${selfMinSoc}%)`;
                source = 'reserve';
            } else if (typeof feneconNvpW === 'number' && feneconNvpW <= feneconUpperBandW) {
                reason = `Gateway AC: keine Entladung nötig (NVP ${Math.round(feneconNvpW)} W im/unter Zielband ${Math.round(feneconLowerBandW)}..${Math.round(feneconUpperBandW)} W inkl. EVCS-Schutz)`;
                source = 'idle';
            }
        }
    } else if (tariffBlocksDischarge && !pvReserveBlocked) {
        if (source === 'idle' || reason === 'Keine Aktion') {
            reason = 'Tarif: günstig – Eigenverbrauchs-Entladung gesperrt';
            source = 'tarif';
            storagePolicyBlocked = true;
            storagePolicyBlockReason = reason;
        }
    } else {
    // Wichtig: Bei Eigenverbrauchs-Entladung regeln wir auf den NVP.
    // Dafür verwenden wir bewusst den ROH-Wert (NVP) ohne Glättung, um Verzögerungen zu vermeiden.
    //
    // Kritischer Punkt (Bug-Fix): Eine reine "Sollleistung = aktueller Import"-Logik konvergiert
    // mathematisch auf ~50% der Last (Fixpunkt), statt den Import wirklich gegen 0 zu drücken.
    // Lösung: Integrations-/Inkrement-Regelung (PI-light): Sollwert wird um den aktuellen Fehler angepasst.

    // Eigenverbrauch regelt am Netzverknüpfungspunkt (NVP).
    // Für die Regelung nutzen wir primär den ROH-Wert (NVP), weil eine starke Glättung
    // (z. B. Peak‑Shaving‑Smoothing) zu Verzögerungen führt und dann genau die beobachteten
    // Sollwert-Spikes/Überschwinger erzeugt.
    // Stabilität kommt hier aus Deadband + Schrittweite/Rampe im Dispatcher.
    const nvpRawW = (typeof gridRawW === 'number') ? gridRawW : gridW;      // roh (Fallback)
    const desiredNvpW = selfTargetGridW; // Laden folgt Gesamtueberschuss; EVCS-Schutz wirkt asymmetrisch im finalen Gate
    const deadbandW = Math.max(0, selfImportThresholdW); // Start-/Stop-Schwelle gegen Flattern
    const nvpCtrlW = (selfNvpStabilizer && typeof selfNvpStabilizer.controlW === 'number' && Number.isFinite(selfNvpStabilizer.controlW))
        ? selfNvpStabilizer.controlW
        : ((typeof nvpRawW === 'number') ? nvpRawW : gridW);       // gefiltert + RAW-Guard für Regelung

    // Eigenverbrauch darf nur seinen eigenen letzten Sollwert als konservativen
    // Fallback verwenden. Der Normalfall nutzt die echte Speicher-Istleistung;
    // damit wird nicht mehr gegen einen alten Sollwert integriert.
    const lastWasSelf = (this._lastSource === 'eigenverbrauch');
    const lastBalanceW = getLastStorageBalanceTargetW();
    const lastWasPvBalance = (String(this._lastSource || '') === 'pv');
    const lastWasAnyBalance = lastWasSelf || lastWasPvBalance;
    const selfFeedForwardRaw = buildStorageFeedForward(desiredNvpW);
    // FENECON Hybrid im direkten ESS-Modus wird aus NVP und der aktuell
    // wirksamen externen SetActivePowerEquals-Vorgabe geregelt. Die physische
    // ESS-Leistung kann interne DC-PV-Beladung enthalten; ein zusätzlicher
    // PV-/Last-Feed-forward würde diese Wirkung erneut einrechnen.
    const selfFeedForward = feneconDirectProfileActive
        ? {
            usable: false,
            targetW: null,
            expectedActualW: null,
            pvW: null,
            loadW: null,
            pvSource: '',
            loadSource: '',
            reason: 'FENECON Hybrid: PV-Feed-forward deaktiviert; NVP + aktive externe Vorgabe sind autoritativ',
            measurementSkewMs: null,
        }
        : selfFeedForwardRaw;
    const balance = this._buildActualAwareNvpBalance({
        rawNvpW: nvpRawW,
        fallbackNvpW: nvpCtrlW,
        nvpAgeMs: (typeof gridRawAge === 'number') ? gridRawAge : gridAge,
        targetNvpW: desiredNvpW,
        deadbandW,
        batteryPowerW: nvpBalanceBatteryPowerW,
        batteryMeasuredW: nvpBalanceBatteryMeasuredW,
        batteryAgeMs: nvpBalanceBatteryAgeMs,
        batteryPowerTrusted: nvpBalanceBatteryTrusted,
        batteryFeedbackSource: nvpBalanceFeedback.source,
        batteryFeedbackHeld: nvpBalanceFeedback.held,
        batteryFeedbackPredicted: nvpBalanceFeedback.predicted,
        batteryFeedbackPredictionDeltaW: nvpBalanceFeedback.predictionDeltaW,
        batteryFeedbackHoldAgeMs: balanceFeedbackHoldMs,
        batteryFeedbackKey: nvpBalanceFeedback.key,
        batterySampleTs: nvpBalanceFeedback.sampleTs,
        balanceControlKey: 'storage-nvp',
        fastServoActive: true,
        preferRawNvp: true,
        lastTargetW: lastBalanceW,
        lastTargetAllowed: lastWasAnyBalance,
        // Eigenverbrauchsoptimierung: 0 W ist ein expliziter STOP-Befehl. Wenn der
        // NVP in der Messtoleranz liegt, hat der zuletzt akzeptierte Lade-/Entladesollwert
        // genau den gewuenschten Zustand hergestellt und muss deshalb weiter aktiv
        // bleiben, statt durch eine neue 0-W-Vorgabe den Speicher abzuschalten.
        holdLastNonZeroInDeadband: true,
        maxDischargeCorrectionW: maxDelta,
        maxChargeCorrectionW: pvMaxDeltaCfg > 0 ? pvMaxDeltaCfg : maxDelta,
        feedbackMaxAgeMs: balanceFeedbackHoldMs,
        nvpFeedbackMaxAgeMs: staleMs,
        feedbackMaxSkewMs: Math.max(0, num(cfg.balanceFeedbackMaxSkewMs, 5000)),
        feedbackRequireAligned: false,
        feedForwardUsable: selfFeedForward.usable === true,
        feedForwardTargetW: selfFeedForward.targetW,
        feedForwardExpectedActualW: selfFeedForward.expectedActualW,
        feedForwardPvW: selfFeedForward.pvW,
        feedForwardLoadW: selfFeedForward.loadW,
        feedForwardPvSource: selfFeedForward.pvSource,
        feedForwardLoadSource: selfFeedForward.loadSource,
        feedForwardReason: selfFeedForward.reason,
        feedForwardMeasurementSkewMs: selfFeedForward.measurementSkewMs,
        feedForwardPlausibilityW: balanceFeedForwardPlausibilityW,
        stepW,
    });
    // Die asymmetrische EVCS-Schutzschranke wird nach allen Herstellerprofilen
    // auf den finalen Sollwert angewendet. Dadurch bleibt laufender Hausausgleich
    // stabil und wird nicht mehr durch eine vorzeitige 0-W-Entladepruefung gepulst.
    storageNvpBalanceDiag = { ...balance, policy: 'eigenverbrauch' };
    storageNvpBalanceRampManaged = storageNvpBalanceRampManaged || balance.rampManaged;

    // Ist-Batterieleistung nur dann fuer harte Caps verwenden, wenn sie auch fuer
    // das NVP-Balancing frisch und zeitlich plausibel war. Ein zwar "nicht stale",
    // aber mehrere Sekunden versetzter Wert darf die Anschluss-Caps nicht aufweiten.
    const battSignedRawW = balance.feedbackUsed ? Number(balance.baseW) : null;
    const battW = (typeof battSignedRawW === 'number') ? Math.max(0, battSignedRawW) : null;
    const battChargeW = (typeof battSignedRawW === 'number') ? Math.max(0, -battSignedRawW) : null;
    const nextSignedW = Number(balance.targetW) || 0;
    let nextSetW = Math.max(0, nextSignedW);

    // Safety-Clamp gegen Überschwingen:
    // WICHTIGER Feldfix 0.8.81: Der letzte eigene Sollwert und derived.loadTotalW
    // duerfen den Entlade-Cap nicht vergroessern; nur NVP plus echte Batterie-Istleistung
    // sind fuer die harte Anschluss-Sicherheit zulaessig.
    // Die Eigenverbrauchsoptimierung darf nur den aktuell am Netzpunkt sichtbaren
    // Restbedarf ausregeln. Der sichere Entlade-Cap ist deshalb: echter NVP-Import +
    // echte gemessene Batterie-Entladung + Puffer. Fuer die Laderichtung gilt analog:
    // laufende reale/zuletzt geschriebene Ladung + aktueller NVP-Export. Genau dieser
    // zweite Teil hat vorher gefehlt und fuehrte zu stabilen Rest-Exporten/-Importen
    // (z. B. 2,9 kW Ladung + 2,9 kW Export => neuer Sollwert muss ca. 5,8 kW Ladung sein).
    const importRawNowW = Math.max(0, (typeof nvpRawW === 'number') ? nvpRawW : 0);
    const measuredDischargeNowW = (typeof battW === 'number') ? Math.max(0, battW) : 0;
    const measuredChargeNowW = (typeof battChargeW === 'number') ? Math.max(0, battChargeW) : 0;
    const lastChargeNowW = (!balance.feedbackUsed && lastBalanceW < 0) ? Math.max(0, -lastBalanceW) : 0;
    const currentChargeForBalancingW = (typeof battChargeW === 'number') ? measuredChargeNowW : lastChargeNowW;
    const safetyMarginW = 200; // bewusst konservativ; Feintuning über selfTargetGridW/Deadband/Rampe
    const protectedSelfImportW = Math.max(0, importRawNowW - evcsStorageProtectedLoadW);
    const protectedSelfMarginW = protectedSelfImportW > 0 ? safetyMarginW : 0;
    const heldDischargeCommandW = balance.holdingLastCommand && nextSignedW > 0
        ? Math.max(0, nextSignedW)
        : 0;
    const feedForwardDischargeW = balance.feedForwardUsed && nextSignedW > 0
        ? Math.max(0, nextSignedW)
        : 0;
    const maxByDemandW = Math.max(
        0,
        protectedSelfImportW + measuredDischargeNowW + protectedSelfMarginW,
        heldDischargeCommandW,
        feedForwardDischargeW,
    );
    if (Number.isFinite(maxByDemandW) && maxByDemandW >= 0) {
        dischargeDemandHardCapW = (typeof dischargeDemandHardCapW === 'number')
            ? Math.min(dischargeDemandHardCapW, maxByDemandW)
            : maxByDemandW;
        dischargeDemandHardCapReason = (typeof battW === 'number')
            ? 'Eigenverbrauch-NVP-Demand-Cap (NVP+gemessene Batterie)'
            : 'Eigenverbrauch-NVP-Demand-Cap (konservativ ohne Batterie-Istleistung)';
        nextSetW = Math.min(nextSetW, maxByDemandW);
    }

    const heldChargeCommandW = balance.holdingLastCommand && nextSignedW < 0
        ? Math.max(0, -nextSignedW)
        : 0;
    const feedForwardChargeW = balance.feedForwardUsed && nextSignedW < 0
        ? Math.max(0, -nextSignedW)
        : 0;
    const chargeBalanceCapWBase = exportRawW > 0
        ? Math.max(0, currentChargeForBalancingW + exportRawW + desiredNvpW)
        : ((typeof battChargeW === 'number' && importRawNowW > desiredNvpW)
            ? Math.max(0, currentChargeForBalancingW)
            : 0);
    const chargeBalanceCapW = Math.max(chargeBalanceCapWBase, heldChargeCommandW, feedForwardChargeW);
    if (nextSignedW < 0) {
        chargeDemandHardCapW = (typeof chargeDemandHardCapW === 'number')
            ? Math.min(chargeDemandHardCapW, chargeBalanceCapW)
            : chargeBalanceCapW;
        chargeDemandHardCapReason = (typeof battChargeW === 'number')
            ? 'Eigenverbrauch-NVP-Lade-Cap (aktuelle Ladung+NVP-Export/Import-Reduktion)'
            : 'Eigenverbrauch-NVP-Lade-Cap (letzter Ladesollwert nur bei aktuellem Export)';
    }

    // Positive Werte in diesem Pfad sind Entladung; negative Werte reduzieren/erhoehen
    // laufende PV-Beladung. Beides bleibt NVP-gefuehrt und wird weiter unten gerampt.
    nextSetW = clamp(nextSetW, 0, selfMaxDischargeEff);

    // SoC-Hysterese: verhindert Flattern um die Untergrenze und sorgt für eine
    // echte Ruhephase (0 W), sobald die SoC-Grenze erreicht ist.
    let socOk = true;
    if (typeof soc === 'number') {
        this._socSelfDischargeEnabled = hystAbove(
            this._socSelfDischargeEnabled,
            soc,
            selfMinSoc,
            selfMinSoc + this._socHystPct,
        );
        socOk = this._socSelfDischargeEnabled;
    }

    const allow = (!reserveActive && !reserveChargeWanted && socOk);

    // Aktivierung: Nur wenn der NVP die obere Bandkante ueberschreitet ODER
    // die Eigenverbrauchsregelung bereits aktiv war. Zielmitte und Hysterese
    // werden damit genau einmal durch den zentralen Band-Resolver bewertet.
    const startCond = (Number(balance.nvpBandErrorW) > 0) || lastWasSelf;

    if (allow && nextSignedW < 0) {
        const maxChargeBySocW = (typeof soc === 'number' && soc >= selfMaxSoc) ? 0 : selfMaxChargeEff;
        const chargeW = clamp(Math.abs(nextSignedW), 0, Math.min(maxChargeBySocW, chargeBalanceCapW));
        hardChargeMaxSoc = Math.max(hardChargeMaxSoc, selfMaxSoc);
        if (chargeW > 0) {
            targetW = -chargeW;
            reason = `Eigenverbrauch: NVP-Balancing laden (${Math.round(chargeW)} W, Ist ${Math.round(Number(balance.baseW) || 0)} W, Banddifferenz ${Math.round(Number(balance.nvpBandErrorW) || 0)} W)`;
            source = 'pv';
        } else if ((source === 'idle' || reason === 'Keine Aktion') && Math.abs(nextSignedW) > 0) {
            reason = (typeof soc === 'number' && soc >= selfMaxSoc)
                ? `Eigenverbrauch: Laden blockiert (SoC >= ${selfMaxSoc}%)`
                : 'Eigenverbrauch: keine NVP-Ladefreigabe';
            source = 'pv';
        }
    } else if (allow && startCond && nextSetW > 0) {
        targetW = nextSetW;
        reason = `Eigenverbrauch: NVP-Balancing entladen (${Math.round(targetW)} W, Ist ${Math.round(Number(balance.baseW) || 0)} W, Banddifferenz ${Math.round(Number(balance.nvpBandErrorW) || 0)} W)`;
        source = 'eigenverbrauch';
        hardDischargeMinSoc = Math.max(hardDischargeMinSoc, selfMinSoc);
    } else if (!allow && (source === 'idle' || reason === 'Keine Aktion')) {
        if (reserveActive) {
            reason = `Eigenverbrauch: Entladen blockiert (Reserve-SoC <= ${reserveMin}%)`;
            source = 'reserve';
        } else if (reserveChargeWanted) {
            reason = `Eigenverbrauch: Entladen blockiert (Reserve wird bis ${reserveTarget}% aufgefuellt)`;
            source = 'reserve';
        } else if (!socOk && typeof soc === 'number') {
            reason = `Eigenverbrauch: Entladen blockiert (SoC ${Math.round(soc * 10) / 10}% <= Min-SoC ${selfMinSoc}%, Policy ${String(storageOperatingPolicy.source || 'unbekannt')})`;
            source = 'eigenverbrauch';
        }
        if (reason !== 'Keine Aktion') {
            storagePolicyBlocked = true;
            storagePolicyBlockReason = reason;
        }
    }
    }
}

// Eine deaktivierte Eigenverbrauchszone ist eine bewusste Policy-Sperre. Sie
// darf bei aktuellem Netzbezug weder als "Keine Aktion" noch spaeter im
// NVP-Koordinator als vermeintlich aktive Korrektur erscheinen.
if (targetW === 0 && !selfDischargeEnabled && (source === 'idle' || reason === 'Keine Aktion')) {
    const policyNvpW = (typeof gridRawW === 'number' && Number.isFinite(gridRawW))
        ? gridRawW
        : ((typeof gridW === 'number' && Number.isFinite(gridW)) ? gridW : null);
    if (typeof policyNvpW === 'number' && policyNvpW > (selfTargetGridW + selfImportThresholdW)) {
        reason = `Eigenverbrauch: Entladen durch Policy deaktiviert (${String(storageOperatingPolicy.source || 'unbekannt')})`;
        source = 'policy';
        storagePolicyBlocked = true;
        storagePolicyBlockReason = reason;
    }
}

// 4) Eigenverbrauch: PV-Überschuss laden (wenn keine Lastspitze/Tarif/EV-Entladung aktiv)
        if (targetW === 0 && cfg.pvEnabled !== false && !feneconAcMode) {
            // Zero-Export (Nulleinspeisung): bei Export möglichst früh (Schwellwert) in den Speicher laden.
            // Hinweis: Extra-Bias nur, wenn Netzladen erlaubt ist (sonst würde der Bias u.U. Netzenergie in den Speicher ziehen).
            const zeCfg = (this.adapter.config && this.adapter.config.gridConstraints) ? (this.adapter.config.gridConstraints || {}) : {};
            const zeEnabled = !!zeCfg.zeroExportEnabled;
            const zeDeadband = Math.max(0, num(zeCfg.zeroExportDeadbandW, 50));
            const zeBias = Math.max(0, num(zeCfg.zeroExportBiasW, 80));

            const thrBase = Math.max(0, num(cfg.pvExportThresholdW, 200));
            const thr = zeEnabled ? Math.min(thrBase, zeDeadband) : thrBase;

            // Max-SoC für Laden: größter Bereich (Self/LSK/Reserve-Ziel)
            const lskMaxSocForCharge = lskChargeEnabledCfg ? lskMaxSoc : selfMaxSoc;
        const maxSocForCharge = clamp(Math.max(selfMaxSoc, lskMaxSocForCharge, reserveTarget), 0, 100);
            hardChargeMaxSoc = maxSocForCharge;

            const canChargeBySoc = (typeof soc !== 'number') ? true : (soc < maxSocForCharge);

            // Bereichsabhängiges Lade-Limit (Self vs LSK)
            let chargeLimitW = maxChargeW;
            if (typeof soc === 'number') {
                if (soc < selfMaxSoc) {
                    chargeLimitW = selfMaxChargeEff;
                } else if (soc < lskMaxSoc) {
                    chargeLimitW = lskMaxChargeEff;
                } else {
                    chargeLimitW = 0;
                }
            }

            const pvChargeWouldBeActive = exportRawW >= thr && canChargeBySoc && chargeLimitW > 0;
            if (pvChargeWouldBeActive && evPriorityBlockStorageCharge) {
                targetW = 0;
                // Lade-Cap 0.8.80: Wenn EV-Priorität den Speicher blockiert, darf ein
                // alter PV-Ladesollwert nicht durch die Rampe weiterlaufen.
                chargeDemandHardCapW = 0;
                chargeDemandHardCapReason = 'EV-Priorität-Lade-Cap';
                reason = evPriorityStarvedW > 0
                    ? `EV-Priorität: PV zuerst an Ladepunkte (${Math.round(evPriorityStarvedW)} W offen)`
                    : 'EV-Priorität: PV zuerst an Ladepunkte';
                source = 'pv';
            } else if (pvChargeWouldBeActive) {
                // Für die eigentliche Sollwert-Berechnung nutzen wir den geglätteten Export,
                // damit die Ladeleistung bei wolkigem Himmel nicht "zittert".
                const exportCtrlW = (typeof exportW === 'number') ? exportW : exportRawW;
                const extraBias = (zeEnabled && gridChargeAllowed) ? zeBias : 0;
                // Der harte Sicherheits-Cap nutzt bewusst den RAW-Export am NVP.
                // Wenn der Export in diesem Tick wegbricht, wird nach der Rampe sofort
                // auf diesen Rohwert begrenzt und nicht erst langsam heruntergefahren.
                // Feldschutz 0.8.81: Der geglättete Export darf nur als ruhiger
                // Regelwunsch dienen. Die aktuelle RAW-Messung bleibt die harte
                // Obergrenze, damit ein alter PV-Ladesollwert bei Netzbezug nicht
                // weiterläuft. Der Zero-Export-Bias wird nur addiert, solange RAW
                // tatsächlich Export zeigt; bei RAW=0/Import darf er keinen Netzbezug
                // in die Batterie ziehen.
                const lastBalanceWForCharge = getLastStorageBalanceTargetW();
                const pvTargetNvpW = selfTargetGridW + extraBias;
                const pvFeedForward = buildStorageFeedForward(pvTargetNvpW);
                const pvBalance = this._buildActualAwareNvpBalance({
                    rawNvpW: nvpRawW,
                    fallbackNvpW: (typeof selfNvpStabilizer.controlW === 'number') ? selfNvpStabilizer.controlW : nvpRawW,
                    nvpAgeMs: (typeof gridRawAge === 'number') ? gridRawAge : gridAge,
                    // Der Zero-Export-Bias wird als etwas hoeherer Zielbezug abgebildet.
                    // Dadurch entsteht mathematisch derselbe Ladeaufschlag, aber in
                    // derselben Istleistung-plus-NVP-Differenz-Regelung wie beim Entladen.
                    targetNvpW: pvTargetNvpW,
                    deadbandW: selfImportThresholdW,
                    batteryPowerW: nvpBalanceBatteryPowerW,
                    batteryMeasuredW: nvpBalanceBatteryMeasuredW,
                    batteryAgeMs: nvpBalanceBatteryAgeMs,
                    batteryPowerTrusted: nvpBalanceBatteryTrusted,
                    batteryFeedbackSource: nvpBalanceFeedback.source,
                    batteryFeedbackHeld: nvpBalanceFeedback.held,
                    batteryFeedbackPredicted: nvpBalanceFeedback.predicted,
                    batteryFeedbackPredictionDeltaW: nvpBalanceFeedback.predictionDeltaW,
                    batteryFeedbackHoldAgeMs: balanceFeedbackHoldMs,
                    batteryFeedbackKey: nvpBalanceFeedback.key,
                    batterySampleTs: nvpBalanceFeedback.sampleTs,
                    balanceControlKey: 'storage-nvp',
                    fastServoActive: true,
                    preferRawNvp: true,
                    lastTargetW: lastBalanceWForCharge,
                    lastTargetAllowed: isStorageBalanceSource(this._lastSource),
                    // Auch im separaten PV-Ladepfad darf das Erreichen des NVP-Ziels
                    // nicht als Stop interpretiert werden. Der letzte nicht-null Sollwert
                    // bleibt aktiv, bis eine echte NVP-Abweichung oder Schutzgrenze eine
                    // Korrektur bzw. einen ausdruecklichen Stop verlangt.
                    holdLastNonZeroInDeadband: true,
                    maxDischargeCorrectionW: maxDelta,
                    maxChargeCorrectionW: pvMaxDeltaCfg > 0 ? pvMaxDeltaCfg : maxDelta,
                    feedbackMaxAgeMs: balanceFeedbackHoldMs,
                    nvpFeedbackMaxAgeMs: staleMs,
                    feedbackMaxSkewMs: Math.max(0, num(cfg.balanceFeedbackMaxSkewMs, 5000)),
                    feedbackRequireAligned: false,
                    feedForwardUsable: pvFeedForward.usable === true,
                    feedForwardTargetW: pvFeedForward.targetW,
                    feedForwardExpectedActualW: pvFeedForward.expectedActualW,
                    feedForwardPvW: pvFeedForward.pvW,
                    feedForwardLoadW: pvFeedForward.loadW,
                    feedForwardPvSource: pvFeedForward.pvSource,
                    feedForwardLoadSource: pvFeedForward.loadSource,
                    feedForwardReason: pvFeedForward.reason,
                    feedForwardMeasurementSkewMs: pvFeedForward.measurementSkewMs,
                    feedForwardPlausibilityW: balanceFeedForwardPlausibilityW,
                    stepW,
                });
                storageNvpBalanceDiag = { ...pvBalance, policy: 'pv' };
                storageNvpBalanceRampManaged = storageNvpBalanceRampManaged || pvBalance.rampManaged;

                const measuredChargeNowW = pvBalance.feedbackUsed
                    ? Math.max(0, -Number(pvBalance.baseW || 0))
                    : 0;
                const lastChargeNowW = (!pvBalance.feedbackUsed && lastBalanceWForCharge < 0)
                    ? Math.max(0, -lastBalanceWForCharge)
                    : 0;
                const currentChargeForBalancingW = pvBalance.feedbackUsed ? measuredChargeNowW : lastChargeNowW;

                // Der Balancing-Helfer liefert bereits "Istleistung + Differenz".
                // Der RAW-Cap bleibt als harte Anschlussgrenze bestehen, damit ein
                // alter Ladesollwert bei wegfallendem Export nicht nachlaufen kann.
                const requestedChargeW = Math.max(0, -Number(pvBalance.targetW || 0));
                const pvTargetImportW = selfTargetGridW + extraBias;
                const exportCtrlCapW = Math.max(0, currentChargeForBalancingW + exportCtrlW + pvTargetImportW);
                const exportRawCapW = exportRawW > 0
                    ? Math.max(0, currentChargeForBalancingW + exportRawW + pvTargetImportW)
                    : currentChargeForBalancingW;
                const pvRawChargeCapW = clamp(Math.min(requestedChargeW, exportCtrlCapW, exportRawCapW), 0, chargeLimitW);
                chargeDemandHardCapW = pvRawChargeCapW;
                chargeDemandHardCapReason = zeEnabled ? 'Nulleinspeisung-NVP-Lade-Cap (aktuelle Ladung+Export)' : 'PV-NVP-Lade-Cap (aktuelle Ladung+Export)';
                targetW = -pvRawChargeCapW;
                reason = zeEnabled
                    ? `Nulleinspeisung: Ist ${Math.round(Number(pvBalance.baseW) || 0)} W plus NVP-Banddifferenz ${Math.round(Number(pvBalance.nvpBandErrorW) || 0)} W`
                    : `Eigenverbrauch PV-Laden: Ist ${Math.round(Number(pvBalance.baseW) || 0)} W plus NVP-Banddifferenz ${Math.round(Number(pvBalance.nvpBandErrorW) || 0)} W`;
                source = 'pv';
            }
        }

        // 5) Notstrom: Reserve ggf. über Netz wieder auffüllen (optional)
        // Hinweis: Standardmäßig AUS (reserveGridChargeW = 0). Aktivieren nur, wenn gewünscht.
        // Wichtig: Bei aktivem Peak-Shaving wird die Netzladung (sofern möglich) innerhalb des Peak-Limits gehalten.
        if (targetW === 0 && reserveChargeWanted && reserveGridChargeW > 0 && gridChargeAllowed) {
            // Nur laden, wenn SoC unter Reserve-Ziel
            // Reserve-Aufladung: SoC-Grenze bereits im Vorfeld mit Hysterese bewertet.
            const canChargeBySoc = (typeof soc === 'number') ? (this._socReserveRefillEnabled === true) : false;
            if (canChargeBySoc) {
                let wantW = clamp(reserveGridChargeW, 0, maxChargeW);
                if (typeof importHeadroomEffW === 'number') {
                    wantW = Math.min(wantW, importHeadroomEffW);
                } else if (typeof psHeadroomFilteredW === 'number') {
                    wantW = Math.min(wantW, psHeadroomFilteredW);
                } else if (typeof psHeadroomW === 'number') {
                    wantW = Math.min(wantW, psHeadroomW);
                }

                // Lade-Cap 0.8.80: Die Reserve-Nachladung darf nach der Rampe nie
                // stärker bleiben als der aktuelle Headroom-/Reserve-Wunsch.
                chargeDemandHardCapW = Math.max(0, wantW);
                chargeDemandHardCapReason = 'Notstrom-Reserve-Lade-Cap';

                if (wantW > 0) {
                    targetW = -wantW;
                    reason = 'Notstrom: Reserve über Netz laden';
                    source = 'reserve';
                    hardChargeMaxSoc = Math.max(hardChargeMaxSoc, reserveTarget);
                }
            }
        }

        // Effective headroom for refill:
        // - Use filtered (average) headroom for stable setpoints
        // - Clamp with RAW headroom for safety (Import spikes)
        let psHeadroomEffW = (typeof psHeadroomFilteredW === 'number') ? psHeadroomFilteredW : psHeadroomW;
        if (typeof psHeadroomEffW === 'number' && typeof psHeadroomRawW === 'number') {
            psHeadroomEffW = Math.min(psHeadroomEffW, psHeadroomRawW);
        }
        // Phase 4: auch globales Import-Headroom beachten (Grid-Constraints / Installateur-Cap)
        if (typeof importHeadroomEffW === 'number') {
            psHeadroomEffW = (typeof psHeadroomEffW === 'number') ? Math.min(psHeadroomEffW, importHeadroomEffW) : importHeadroomEffW;
        }

        // 6) Peak-Shaving: Reserve für nächste Lastspitze aus dem Netz nachladen (Headroom)
        // Ziel: Falls der Speicher für LSK entladen hat (oder generell unter LSK-Max liegt),
        // darf er die "übrige" Leistung bis zum Peak-Limit zum Nachladen nutzen.
        // Dadurch bleibt der Speicher für kommende Peaks verfügbar, ohne die Peak-Grenze zu reißen.
        if (
            targetW === 0 &&
            peakEnabled &&
            lskChargeEnabledCfg &&
            (typeof psHeadroomEffW === 'number' && psHeadroomEffW > 0) &&
            (gridW >= 0)
        ) {
            // SoC-Hysterese: Refill erst wieder starten, wenn der SoC merklich
            // unterhalb der Grenze liegt (sonst pendelt es um den Grenzwert).
            let canChargeBySoc = false;
            if (typeof soc === 'number') {
                const onBelow = Math.max(0, lskMaxSoc - this._socHystPct);
                this._socLskRefillEnabled = hystBelow(this._socLskRefillEnabled, soc, onBelow, lskMaxSoc);
                canChargeBySoc = !!this._socLskRefillEnabled;
            }
            if (canChargeBySoc) {
                let wantW = Math.min(psHeadroomEffW, lskMaxChargeEff);

                // Optional: reduce "flutter" by holding small upward adjustments.
                // We intentionally allow fast decreases (safety), but require a minimal delta to increase.
                const psCfg = (this.adapter.config && this.adapter.config.peakShaving) ? this.adapter.config.peakShaving : {};
                const psReleaseDelaySec = Math.max(0, num(psCfg.releaseDelaySec, 0));
                const psReleaseDelayMs = psReleaseDelaySec * 1000;
                const hysteresisW = Math.max(0, num(psCfg.hysteresisW, 0));
                // Refill nie bis exakt ans Limit fahren (sonst PingPong/Flattern): wir lassen eine Margin frei.
                // Margin: mindestens Hysterese oder Ramp-Step.
                const refillMarginW = Math.max(hysteresisW, stepW, 100);
                const refillDelayActive = (psReleaseDelayMs > 0) && (this._lastPeakActiveMs > 0) && ((now - this._lastPeakActiveMs) < psReleaseDelayMs);

                // Effektives Headroom für Refill (mit Margin). Mit Margin wird verhindert, dass das
                // Nachladen die Netzanschlussgrenze "ausreizt" und dadurch direkt wieder eine LSK-
                // Entladung getriggert wird (Ping-Pong).
                const headroomForRefillW = Math.max(0, psHeadroomEffW - refillMarginW);
                wantW = Math.min(headroomForRefillW, lskMaxChargeEff);

                if (refillDelayActive) {
                    // Direkt nach einem Peak nicht sofort wieder nachladen, sonst pendelt die Regelung.
                    wantW = 0;
                    this._lskRefillHoldW = null;
                }
                const deadbandW = clamp(num(cfg.lskRefillDeadbandW, num(psCfg.hysteresisW, 500)), 0, 5000);
                if (stepW > 0) wantW = Math.round(wantW / stepW) * stepW;

                if (typeof this._lskRefillHoldW === 'number') {
                    const last = this._lskRefillHoldW;
                    if (wantW < last) {
                        // decrease immediately
                        this._lskRefillHoldW = wantW;
                    } else if (deadbandW > 0 && (wantW - last) < deadbandW) {
                        // hold
                        wantW = last;
                    } else {
                        this._lskRefillHoldW = wantW;
                    }
                } else {
                    this._lskRefillHoldW = wantW;
                }

                wantW = (typeof this._lskRefillHoldW === 'number') ? this._lskRefillHoldW : wantW;

                // Lade-Cap 0.8.80: Auch LSK-Refill darf nach der Rampe nicht über dem
                // aktuellen Peak-/Import-Headroom weiterlaufen.
                chargeDemandHardCapW = Math.max(0, wantW);
                chargeDemandHardCapReason = 'LSK-Refill-Lade-Cap';

                if (wantW > 0) {
                    targetW = -wantW;
                    reason = `LSK: Reserve über Netz nachladen (${Math.round(psHeadroomEffW)} W frei)`;
                    source = 'lastspitze_refill';
                    hardChargeMaxSoc = Math.max(hardChargeMaxSoc, lskMaxSoc);
                }
            }
        }

        // 6b) Diagnose: LSK-Refill gewünscht, aber kein Grenzwert/Headroom vorhanden
        // Damit ist im Betrieb sofort sichtbar, warum kein Netzladen erfolgt.
        if (
            targetW === 0 &&
            peakEnabled &&
            lskChargeEnabledCfg &&
            (gridW >= 0) &&
            (typeof soc === 'number') && (this._socLskRefillEnabled === true)
        ) {
            if (!(typeof psLimitW === 'number' && psLimitW > 0)) {
                reason = 'LSK: kein Grenzwert konfiguriert (Netzanschlussleistung im EMS setzen)';
                source = 'lastspitze_refill';
            } else if (!(typeof psHeadroomEffW === 'number' && psHeadroomEffW > 0)) {
                reason = `LSK: kein Headroom frei (${Math.round(importW)} / ${Math.round(psLimitW)} W)`;
                source = 'lastspitze_refill';
            }
        }

        // ------------------------------------------------------------
        // Zentrale PV-Ueberschuss-Verteilung
        // ------------------------------------------------------------
        // Das Lademanagement laeuft vor diesem Modul und reserviert nur den PV-Anteil,
        // den PV-/Min+PV-Wallboxen nach der Kundeneinstellung wirklich nutzen duerfen.
        // Der Speicher bekommt anschliessend das noch freie PV-Budget. Dadurch koennen
        // Speicher und E-Mobilitaet denselben physikalischen PV-Ueberschuss nicht doppelt
        // verplanen. Tarif-/Reserve-Netzladen bleibt davon bewusst unberuehrt.
        try {
            centralPvBudgetRuntime = this.adapter && this.adapter._emsBudget;
            centralPvAllocationGate = centralPvBudgetRuntime
                && centralPvBudgetRuntime.gates
                && centralPvBudgetRuntime.gates.pvAllocation
                ? centralPvBudgetRuntime.gates.pvAllocation
                : null;
            pvBudgetAllocationMode = centralPvAllocationGate ? String(centralPvAllocationGate.mode || '') : '';
            pvBudgetRemainingBeforeStorageW = resolveStoragePvBudgetW(
                centralPvBudgetRuntime,
                centralPvAllocationGate,
                0,
            );
            pvBudgetStorageAvailableW = pvBudgetRemainingBeforeStorageW;

            if (centralPvBudgetRuntime && isCentralPvChargeSource(source, targetW) && !sungrowHybridActive) {
                // Generic/FENECON-Pfade koennen hier bereits begrenzt werden. Sungrow
                // berechnet seinen geschlossenen NVP-Sollwert erst weiter unten neu;
                // ein Vorab-Cap (insbesondere 0 W) wuerde sonst als scheinbarer
                // Schutzstopp in den Herstellerpfad getragen. Fuer Sungrow ist daher
                // ausschliesslich der finale Cap nach der Herstellerberechnung autoritativ.
                const pvCapW = pvBudgetStorageAvailableW;
                if (Math.abs(targetW) > pvCapW) {
                    targetW = -pvCapW;
                    reason = `${reason} (zentrales PV-Restbudget ${Math.round(pvCapW)} W)`;
                }
                chargeDemandHardCapW = (typeof chargeDemandHardCapW === 'number' && Number.isFinite(chargeDemandHardCapW))
                    ? Math.min(chargeDemandHardCapW, pvCapW)
                    : pvCapW;
                chargeDemandHardCapReason = 'Zentrales PV-Restbudget nach E-Mobilitaet';
            }
        } catch {
            // Fehlt die zentrale Budget-Runtime, bleibt die bisherige lokale
            // Speicherregelung als Rueckfall erhalten.
        }

        // ------------------------------------------------------------
        // Phase 2: Dispatcher-Diagnose (Policy-Request vs. finaler Setpoint)
        // ------------------------------------------------------------
        const _reqW = targetW;
        const _reqQuelle = source;
        const _reqGrund = reason;

        // Grenzen anwenden
        targetW = clamp(targetW, -maxChargeW, maxDischargeW);
        const _clampW = targetW;

        // Schrittweite
        if (stepW > 0) {
            targetW = Math.round(targetW / stepW) * stepW;
        }
        const _stepW = targetW;

        // Anti-Flattern um 0 W
        // Ziel: Kleine Messwertschwingungen unterhalb der wirksamen Aufloesung
        // unterdruecken. Ein echter Richtungswechsel wird dagegen ohne 0-W-
        // Zwischenrunde direkt an Einzel-Speicher oder Speicherfarm weitergegeben.
        {
            // WICHTIG: Die Peak-Shaving-Hysterese darf nicht pauschal als Zero-Band
            // fuer alle Speicher-Policies wirken. Sonst wuerden kleine, aber reale
            // Eigenverbrauchs-Sollwerte ungewollt als Wartezustand auf 0 W gesetzt.
            const psRelevant = (source === 'lastspitze' || source === 'lastspitze_refill');
            const psHystW = psRelevant ? Math.max(0, num(psCfg.hysteresisW, 0)) : 0;
            const isNvpBalancing = !!(
                targetW !== 0
                && (
                    (storageNvpBalanceDiag && storageNvpBalanceDiag.active === true)
                    || source === 'eigenverbrauch'
                    || source === 'pv'
                    || source === 'tarif'
                    || source === 'fenecon'
                    || source === 'fenecon-assist'
                    || source === 'sungrow-hybrid'
                    || source === 'sungrow-assist'
                )
            );
            // Die eigentliche NVP-Messtoleranz wurde bereits oberhalb angewendet.
            // Eine zweite 20-/100-W-Nullzone wuerde reale Kleinkorrekturen (z. B.
            // kleine Korrekturen zur Zielmitte) verschlucken. Fuer NVP-Balancing bleibt nur
            // die physische 1-W-Aufloesung; andere Policies behalten ihr Deadband.
            const zeroBandW = isNvpBalancing
                ? Math.max(psHystW, 1)
                : Math.max(psHystW, stepW, 100);

            // Lastspitzenkappung ist eine Sicherheitsfunktion und darf nicht von
            // einem allgemeinen Kleinsignal-Deadband blockiert werden.
            const emergencyDischarge = (source === 'lastspitze') && (targetW > 0);

            if (!emergencyDischarge) {
                // Ein im NVP-Zielband bewusst gehaltener Lade-/Entladesollwert darf
                // nicht durch das allgemeine Anti-Flatter-Deadband auf 0 W fallen.
                const heldTargetW = storageNvpBalanceDiag && Number.isFinite(Number(storageNvpBalanceDiag.heldTargetW))
                    ? Number(storageNvpBalanceDiag.heldTargetW)
                    : 0;
                const preserveHeldNvpCommand = !!(
                    storageNvpBalanceDiag
                    && (
                        storageNvpBalanceDiag.holdingLastCommand === true
                        || storageNvpBalanceDiag.feedForwardUsed === true
                    )
                    && targetW !== 0
                    && (
                        (heldTargetW !== 0 && Math.sign(targetW) === Math.sign(heldTargetW))
                        || storageNvpBalanceDiag.feedForwardUsed === true
                    )
                );

                // Nur ein wirklich kleiner neuer Sollwert wird als bewusster
                // Wartezustand auf 0 W gesetzt. Vorzeichenwechsel oberhalb dieses
                // Bands bleiben unveraendert und werden im selben Tick geschrieben.
                if (!preserveHeldNvpCommand && Math.abs(targetW) < zeroBandW) {
                    targetW = 0;
                    if (source && source !== 'idle') {
                        reason = `${reason || 'Regelung'} (Warten: Deadband < ${Math.round(zeroBandW)} W)`;
                        source = 'idle';
                    }
                }
            }
        }

        const _antiW = targetW;

// Rampenbegrenzung
// Soft-Start: Wenn nach Neustart noch kein letzter Sollwert bekannt ist, starten wir von 0 W.
// Das verhindert große Sollwert-Sprünge beim Aktivieren (z. B. Eigenverbrauch / Tarif-NVP-Regelung).
const _prevRampW = (typeof this._lastTargetW === 'number' && Number.isFinite(this._lastTargetW)) ? this._lastTargetW : 0;
{
    const d = targetW - _prevRampW;
    const directDirectionChange = _prevRampW !== 0
        && targetW !== 0
        && Math.sign(_prevRampW) !== Math.sign(targetW);
    const policyStop = storagePolicyBlocked === true && targetW === 0;

    // Verbindliche EMS-Regel: Bei einem Lade-/Entlade-Richtungswechsel wird der
    // neue Sollwert im selben Tick direkt ausgegeben. Die Speichersysteme fuehren
    // ihren internen Stopp selbst aus. Weder die allgemeine Rampe noch eine
    // herstellerspezifische Rampe darf eine 0-W-Zwischenrunde oder ein Weiterfahren
    // in der alten Richtung erzeugen. Nachgelagerte SoC-, Budget- und Safety-Caps
    // bleiben voll wirksam.
    if (policyStop) {
        // Eine aktive SoC-/Reserve-/Freigabe-Policy ist ein echter Stopp. Ein alter
        // Lade- oder Entladebefehl darf nicht ueber die Standardrampe weiterlaufen.
    } else if (directDirectionChange) {
        // Bewusst keine Rampenbegrenzung.
    // Istleistungsbasiertes NVP-Balancing hat seine Korrektur bereits relativ zur
    // realen Batterie-Leistung begrenzt. Eine zweite Rampe gegen den alten Sollwert
    // wuerde die physikalische Basis wieder verfälschen und ist genau die Ursache
    // fuer wechselnde Sollwerte bei zeitversetzten Speicherreaktionen.
    } else if (storageNvpBalanceRampManaged) {
        // Keine zweite Rampe. Sicherheits-Caps und SoC-Grenzen folgen weiterhin.
    // Lade-Sicherheitsrücknahme: Wenn ein Speicher im letzten Tick geladen hat
    // (negativer Sollwert) und die aktuelle Policy weniger laden oder auf 0 gehen will,
    // darf die Standardrampe den alten Lade-Sollwert nicht künstlich halten.
    // Das ist sicherheitsrelevant für PV-Wolken, wegfallenden Netz-Headroom und EV-Priorität.
    } else if (_prevRampW < 0 && targetW >= _prevRampW) {
        // Weniger laden / Richtung 0 -> bewusst ohne Rampe.
    } else if (source === 'pv' && targetW < 0) {
        const pvMaxDelta = (pvMaxDeltaCfg > 0) ? pvMaxDeltaCfg : maxDelta;

        if (pvMaxDelta > 0 && d < 0 && Math.abs(d) > pvMaxDelta) {
            // d < 0 => stärker laden (mehr negativ) -> begrenzen
            targetW = _prevRampW - pvMaxDelta;
            reason = `${reason} (PV‑Rampe)`;
        }
        // d >= 0 => weniger laden / Richtung 0 -> bewusst ohne Rampe (schnell reagieren)
    } else if (source === 'lastspitze' && targetW > 0) {
	        // Lastspitzenkappung: Sollwertsprünge begrenzen, damit der Speicher nicht "nervös" regelt.
	        // Hinweis: Für schnellere Reaktion -> "Max ΔW/Tick" erhöhen bzw. im Peak‑Shaving eine Reserve (W) setzen,
	        // damit Lastspitzen innerhalb der Reserve abgefangen werden können.
	        if (maxDelta > 0 && Math.abs(d) > maxDelta) {
	            targetW = _prevRampW + Math.sign(d) * maxDelta;
	            reason = `${reason} (LSK‑Rampe)`;
	        }
    } else if (source === 'fenecon' || source === 'fenecon-assist' || source === 'sungrow-assist' || this._lastSource === 'fenecon' || this._lastSource === 'fenecon-assist' || this._lastSource === 'sungrow-assist') {
        // Gateway AC-Lastfolger: Lastsprünge müssen in beide Richtungen schnell übernommen werden,
        // sonst bleibt kurz Netzbezug stehen oder es entsteht beim Lastabwurf unnötige Einspeisung.
        // Deshalb hier bewusst keine zusätzliche Rampe.
    } else {
        // Standard: symmetrische Rampe
        if (maxDelta > 0 && Math.abs(d) > maxDelta) {
            targetW = _prevRampW + Math.sign(d) * maxDelta;
            reason = `${reason} (Rampenbegrenzung)`;
        }
    }
}

        const _rampW = targetW;

        // Harte Lade-Cap NACH der Rampenbegrenzung.
        // Der Entlade-Feldfix aus 0.8.79 braucht die gleiche Absicherung für negative
        // Ladesollwerte: Wenn die aktuelle Policy 0 W oder weniger Ladeleistung fordert,
        // darf ein alter Lade-Sollwert nicht langsam über die Standardrampe auslaufen.
        if (targetW < 0 || (_prevRampW < 0 && _reqW >= 0)) {
            let capW = (typeof chargeDemandHardCapW === 'number' && Number.isFinite(chargeDemandHardCapW))
                ? Math.max(0, chargeDemandHardCapW)
                : null;
            const preVendorSource = String(_reqQuelle || source || '').trim().toLowerCase();
            const nvpBalancerMayRecalculateCharge = !!(
                storageNvpBalanceDiag
                || isStorageBalanceSource(preVendorSource)
                || isStorageBalanceSource(this._lastSource)
                || sungrowHybridActive
            );
            const deferEmptyChargeRequestToNvpBalancer = _reqW >= 0
                && nvpBalancerMayRecalculateCharge
                && capW === null;

            if (_reqW >= 0 && !deferEmptyChargeRequestToNvpBalancer) {
                // Keine aktuelle Ladeanforderung: 0 W stoppt die Laderichtung sofort.
                // Ausnahme aller geschlossenen NVP-Regelpfade: Deren finaler Sollwert
                // kann nach diesem Dispatcher-Schritt aus Istleistung + NVP-Differenz
                // entstehen. Ein vorlaeufiger 0-W-Request darf deshalb nicht als
                // harter Lade-Cap in den Hersteller-/Farm-/Generic-Pfad getragen werden.
                capW = 0;
                if (!chargeDemandHardCapReason) chargeDemandHardCapReason = 'Keine aktuelle Ladeanforderung';
            } else if (capW === null && _reqW < 0) {
                // Fallback: Aktueller Policy-Wunsch ist die Obergrenze. Dadurch kann die
                // Rampe einen alten höheren Ladesollwert nicht über den neuen Wunsch ziehen.
                capW = Math.max(0, -_reqW);
                chargeDemandHardCapReason = 'Aktuelle Ladeanforderung-Cap';
            }
            if (typeof capW === 'number' && targetW < -capW) {
                targetW = -capW;
                reason = `${reason} (Lade-Cap ${Math.round(capW)} W nach Rampe)`;
            }
        }
        await this._setIfChanged('speicher.regelung.chargeDemandCapW',
            (typeof chargeDemandHardCapW === 'number' && Number.isFinite(chargeDemandHardCapW)) ? Math.round(chargeDemandHardCapW) : 0);
        await this._setIfChanged('speicher.regelung.chargeDemandCapReason', String(chargeDemandHardCapReason || ''));

        // Harte Demand-Cap NACH der Rampenbegrenzung.
        // Der vorherige Code konnte einen korrekt auf ca. Netzbezug begrenzten Sollwert
        // durch die Rampe wieder in Richtung altem, zu hohem Sollwert ziehen. Beispiel aus
        // dem Feld: 2,2 kW Netzbezug, alter Sollwert >10 kW => Rampe schrieb weiterhin
        // >10 kW. Dieser Cap ist bewusst nach der Rampe platziert und gilt nur für
        // NVP-basierte Entladequellen.
        if (targetW > 0 && typeof dischargeDemandHardCapW === 'number' && Number.isFinite(dischargeDemandHardCapW)) {
            const capW = Math.max(0, dischargeDemandHardCapW);
            const activeNvpDischargeSource = (source === 'eigenverbrauch' || source === 'tarif' || source === 'fenecon' || source === 'fenecon-assist' || source === 'sungrow-assist' || source === 'lastspitze');
            if (activeNvpDischargeSource && targetW > capW) {
                targetW = capW;
                reason = `${reason} (Demand-Cap ${Math.round(capW)} W nach Rampe)`;
            }
        }
        await this._setIfChanged('speicher.regelung.dischargeDemandCapW',
            (typeof dischargeDemandHardCapW === 'number' && Number.isFinite(dischargeDemandHardCapW)) ? Math.round(dischargeDemandHardCapW) : 0);
        await this._setIfChanged('speicher.regelung.dischargeDemandCapReason', String(dischargeDemandHardCapReason || ''));

        // Harte SoC-Grenzen auch nach Rundung/Rampe erzwingen (wichtig gegen "Rampen-Nachlauf")
        if (targetW > 0) {
            // Entladen: Notstrom-Reserve immer hart
            if (reserveActive) {
                targetW = 0;
                reason = 'Entladen blockiert (Notstrom-Reserve aktiv)';
                source = 'reserve';
            } else if ((typeof soc === 'number') && (soc <= hardDischargeMinSoc)) {
                targetW = 0;
                reason = `Entladen blockiert (SoC <= ${hardDischargeMinSoc}%)`;
                source = 'reserve';
            }
        } else if (targetW < 0) {
            // Laden: Max-SoC respektieren
            if ((typeof soc === 'number') && (soc >= hardChargeMaxSoc)) {
                targetW = 0;
                reason = `Laden blockiert (SoC >= ${hardChargeMaxSoc}%)`;
                source = 'pv';
            }
        }

        // ------------------------------------------------------------
        // Hybrid-/Gateway-Priorität-Policy (Single-Speicher, keine Farm)
        // ------------------------------------------------------------
        // Vor der Hersteller-Neuberechnung wird festgehalten, ob der allgemeine
        // Speicherpfad bereits einen echten Stop angeordnet hat. Sungrow darf einen
        // solchen Schutzstopp nicht mit einem neuen NVP-Sollwert ueberschreiben und
        // die nachgelagerte 0-W-Firewall darf ihn nicht als vermeintlichen Leerlauf
        // in No-Write umwandeln. Reine Zwischen-/Leerlauf-0-Werte bleiben hiervon
        // bewusst ausgenommen.
        const lastCommandBeforeVendorW = Number.isFinite(Number(this._lastTargetW))
            ? Number(this._lastTargetW)
            : 0;
        const stopReasonText = String(reason || '').toLowerCase();
        const chargeCapReasonText = String(chargeDemandHardCapReason || '').toLowerCase();
        const transientChargeCap = isDeferredSungrowChargeCapReason(chargeDemandHardCapReason)
            || chargeCapReasonText.includes('keine aktuelle ladeanforderung')
            || chargeCapReasonText.includes('zentrales pv-restbudget')
            || chargeCapReasonText.includes('finales zentrales pv-restbudget');
        const chargeDirectionStopped = lastCommandBeforeVendorW < 0
            && typeof chargeDemandHardCapW === 'number'
            && Number.isFinite(chargeDemandHardCapW)
            && chargeDemandHardCapW <= 0
            && !transientChargeCap;
        const dischargeDirectionStopped = lastCommandBeforeVendorW > 0
            && typeof dischargeDemandHardCapW === 'number'
            && Number.isFinite(dischargeDemandHardCapW)
            && dischargeDemandHardCapW <= 0;
        const sungrowUpstreamExplicitStop = targetW === 0 && !!(
            reserveActive
            || chargeDirectionStopped
            || dischargeDirectionStopped
            || stopReasonText.includes('soc <=')
            || stopReasonText.includes('soc >=')
            || stopReasonText.includes('blockiert')
            || stopReasonText.includes('gesperrt')
            || stopReasonText.includes('sicherer 0-w')
        );

        let feneconNoWrite = !!(feneconHybridActive && feneconHybridCtx && feneconHybridCtx.noWrite === true);
        let feneconWriteMode = '';
        let feneconZeroOverride = false;
        let sungrowWriteMode = '';
        let sungrowNoWrite = false;
        let storageZeroNoWrite = false;
        let storageZeroWriteStatus = '';
        let storageZeroWriteReason = '';
        let sungrowDiagPayload = null;
        // Herstellerprofile duerfen die technische Schreibweise aendern, aber
        // nicht die Herkunft des Budgets verschleiern. Fuer den finalen zentralen
        // PV-/Gesamt-Cap bleibt deshalb die Policy-Quelle vor dem Herstellerpfad
        // erhalten.
        const policySourceBeforeVendor = String(source || '');
        if (feneconHybridActive) {
            const ctx = feneconHybridCtx || {};
            const authority = String(ctx.authority || 'blocked');
            const technicalMode = String(ctx.technicalMode || ctx.mode || feneconControlResolution.mode || 'direct-ess');

            if (ctx.handoverZeroRequired === true) {
                // Beim Wechsel EOS -> FEMS niemals einen alten Nicht-Null-Befehl
                // bis zum Watchdog weiterlaufen lassen. Die 0-W-Firewall bekommt
                // einen expliziten Handover-Stopp und schreibt ihn so lange, bis
                // der Writer ihn erfolgreich als letzten Zielwert bestaetigt hat.
                targetW = 0;
                source = 'fenecon-handover';
                reason = 'FENECON Automatik: EOS-Sollwert vor Uebergabe an FEMS sicher auf 0 W neutralisieren';
                feneconNoWrite = false;
                feneconZeroOverride = true;
                feneconWriteMode = 'write-handover-zero';
            } else if (authority === 'fems') {
                // Echte FEMS-Eigenregelung: kein zyklischer 0-W-Keepalive und kein
                // Leistungsbefehl aus EOS. Ein spaeter erkannter expliziter Stop
                // darf diesen Zustand in der zentralen 0-W-Firewall ueberschreiben.
                feneconNoWrite = true;
                feneconWriteMode = 'no-write-fems-self';
                reason = String(ctx.reason || 'FENECON Automatik: FEMS-Eigenregelung') + ' · EOS schreibt keinen Leistungssollwert';
            } else if (authority === 'blocked') {
                targetW = 0;
                source = 'fenecon-invalid';
                reason = `FENECON Automatik blockiert: ${String(ctx.reason || 'ungueltige Regelkonfiguration')}`;
                feneconNoWrite = false;
                feneconZeroOverride = true;
                feneconWriteMode = 'write-stop-invalid-config';
            } else {
                feneconNoWrite = false;
                feneconWriteMode = technicalMode === 'fems-grid'
                    ? 'write-fems-grid-eos'
                    : 'write-direct-ess-eos';
                reason = String(reason || ctx.reason || 'FENECON Automatik: EOS-Regelung aktiv');
            }

            await this._setFeneconHybridDiag({
                ...ctx,
                active: true,
                mode: technicalMode,
                reason,
                writeMode: feneconWriteMode,
                targetW,
                nvpW: strictFiniteNumber(gridRawW, strictFiniteNumber(gridW, null)),
                noWrite: feneconNoWrite,
                authority: feneconZeroOverride ? 'eos-zero-override' : authority,
                handoverZeroRequired: ctx.handoverZeroRequired === true,
            });
        }

        // ------------------------------------------------------------
        // Sungrow Hybrid ESS Herstellerprofil
        // ------------------------------------------------------------
        if (sungrowHybridActive) {
            const ctx = sungrowHybridCtx || {};
            const srcNorm = String(source || '').toLowerCase();
            const targetImportW = selfTargetGridW;
            const assistBufferW = Math.max(0, num(cfg.sungrowAssistBufferW, 150));
            const nvpDeadbandW = selfImportThresholdW;
            const nvpNowW = (typeof ctx.nvpW === 'number' && Number.isFinite(ctx.nvpW))
                ? Number(ctx.nvpW)
                : ((typeof gridRawW === 'number' && Number.isFinite(gridRawW)) ? Number(gridRawW) : Number(gridW || 0));
            const importNowW = Math.max(0, nvpNowW);
            const exportNowW = Math.max(0, -nvpNowW);
            const isStorageSelfOrPv = srcNorm === 'eigenverbrauch'
                || srcNorm === 'pv'
                || srcNorm === 'idle'
                || srcNorm === 'sungrow-hybrid'
                || srcNorm === 'sungrow-assist';
            const isCriticalPolicy = targetW !== 0 && (
                srcNorm === 'lastspitze'
                || srcNorm === 'lastspitze_refill'
                || srcNorm === 'reserve'
                || srcNorm === 'tarif'
                || srcNorm === 'evcs'
            );

            // Sungrow nutzt denselben geschlossenen Regelkreis wie alle anderen
            // Speicherprofile. Alte Sonderzweige, die bei PV-Deckung, kleinem Import
            // oder erreichtem NVP-Ziel zyklisch 0 W geschrieben haben, sind bewusst
            // entfernt. 0 W bleibt ausschliesslich ein echter Stop-/Wartebefehl,
            // z. B. bei SoC-Grenze oder fehlender NVP-Messung. Richtungswechsel
            // werden ohne Zwischenstopp direkt an den Speicher geschrieben.
            const nvpControlForBalanceW = (selfNvpStabilizer && typeof selfNvpStabilizer.controlW === 'number' && Number.isFinite(selfNvpStabilizer.controlW))
                ? Number(selfNvpStabilizer.controlW)
                : nvpNowW;
            const lastSungrowBalanceW = getLastStorageBalanceTargetW();
            const sungrowFeedForward = buildStorageFeedForward(targetImportW);
            const sungrowBalance = this._buildActualAwareNvpBalance({
                rawNvpW: nvpNowW,
                fallbackNvpW: nvpControlForBalanceW,
                nvpAgeMs: (typeof gridRawAge === 'number') ? gridRawAge : gridAge,
                targetNvpW: targetImportW,
                deadbandW: nvpDeadbandW,
                batteryPowerW: nvpBalanceBatteryPowerW,
                batteryMeasuredW: nvpBalanceBatteryMeasuredW,
                batteryAgeMs: nvpBalanceBatteryAgeMs,
                batteryPowerTrusted: nvpBalanceBatteryTrusted,
                batteryFeedbackSource: nvpBalanceFeedback.source,
                batteryFeedbackHeld: nvpBalanceFeedback.held,
                batteryFeedbackPredicted: nvpBalanceFeedback.predicted,
                batteryFeedbackPredictionDeltaW: nvpBalanceFeedback.predictionDeltaW,
                batteryFeedbackHoldAgeMs: balanceFeedbackHoldMs,
                batteryFeedbackKey: nvpBalanceFeedback.key,
                batterySampleTs: nvpBalanceFeedback.sampleTs,
                balanceControlKey: 'storage-nvp',
                fastServoActive: true,
                preferRawNvp: true,
                lastTargetW: lastSungrowBalanceW,
                lastTargetAllowed: isStorageBalanceSource(this._lastSource),
                holdLastNonZeroInDeadband: true,
                maxDischargeCorrectionW: maxDelta,
                maxChargeCorrectionW: pvMaxDeltaCfg > 0 ? pvMaxDeltaCfg : maxDelta,
                feedbackMaxAgeMs: balanceFeedbackHoldMs,
                nvpFeedbackMaxAgeMs: staleMs,
                feedbackMaxSkewMs: Math.max(0, num(cfg.balanceFeedbackMaxSkewMs, 5000)),
                feedbackRequireAligned: false,
                feedForwardUsable: sungrowFeedForward.usable === true,
                feedForwardTargetW: sungrowFeedForward.targetW,
                feedForwardExpectedActualW: sungrowFeedForward.expectedActualW,
                feedForwardPvW: sungrowFeedForward.pvW,
                feedForwardLoadW: sungrowFeedForward.loadW,
                feedForwardPvSource: sungrowFeedForward.pvSource,
                feedForwardLoadSource: sungrowFeedForward.loadSource,
                feedForwardReason: sungrowFeedForward.reason,
                feedForwardMeasurementSkewMs: sungrowFeedForward.measurementSkewMs,
                feedForwardPlausibilityW: balanceFeedForwardPlausibilityW,
                stepW,
            });

            sungrowWriteMode = 'standard-policy';
            if (sungrowUpstreamExplicitStop) {
                // SoC-, Reserve- und Demand-Cap-Stopps kommen aus der gemeinsamen
                // Grundlogik und bleiben fuer Sungrow verbindlich.
                // Dieser Modus beginnt absichtlich mit `write-stop-`, damit die
                // finale 0-W-Firewall ihn als legitimen Stop erkennt.
                sungrowWriteMode = 'write-stop-upstream-safety';
                reason = String(reason || 'Sungrow Hybrid ESS: gemeinsamer Speicher-Schutzstopp');
            } else if (isStorageSelfOrPv && !isCriticalPolicy) {
                storageNvpBalanceDiag = { ...sungrowBalance, policy: 'sungrow-hybrid' };
                storageNvpBalanceRampManaged = storageNvpBalanceRampManaged || sungrowBalance.rampManaged;

                const balancedTargetW = Number(sungrowBalance.targetW) || 0;
                const currentDischargeW = sungrowBalance.feedbackUsed
                    ? Math.max(0, Number(sungrowBalance.baseW) || 0)
                    : 0;
                const currentChargeW = sungrowBalance.feedbackUsed
                    ? Math.max(0, -Number(sungrowBalance.baseW || 0))
                    : 0;
                const heldDischargeW = sungrowBalance.holdingLastCommand && balancedTargetW > 0
                    ? Math.max(0, balancedTargetW)
                    : 0;
                const heldChargeW = sungrowBalance.holdingLastCommand && balancedTargetW < 0
                    ? Math.max(0, -balancedTargetW)
                    : 0;
                const feedForwardDischargeW = sungrowBalance.feedForwardUsed && balancedTargetW > 0
                    ? Math.max(0, balancedTargetW)
                    : 0;
                const feedForwardChargeW = sungrowBalance.feedForwardUsed && balancedTargetW < 0
                    ? Math.max(0, -balancedTargetW)
                    : 0;
                const nonEvcsImportW = Math.max(0, importNowW - evcsStorageProtectedLoadW);
                const dischargeCapW = Math.max(
                    0,
                    nonEvcsImportW + currentDischargeW + (nonEvcsImportW > 0 ? assistBufferW : 0),
                    heldDischargeW,
                    feedForwardDischargeW,
                );
                const chargeCapW = Math.max(
                    0,
                    exportNowW + currentChargeW + targetImportW + assistBufferW,
                    heldChargeW,
                    feedForwardChargeW,
                );

                if (balancedTargetW > 0) {
                    // Bestehende globale Demand-/Budget-Caps bleiben auch im
                    // Hersteller-Schreibpfad verbindlich. Das Sungrow-Profil darf
                    // weder EVCS-Speicherschutz noch Peak-/SoC-/Anschlussgrenzen
                    // durch eine nachgelagerte Neuberechnung wieder aufweiten.
                    const deferredDischargeCap = isDeferredSungrowDischargeCapReason(dischargeDemandHardCapReason);
                    const upstreamDischargeCapW = (!deferredDischargeCap
                        && typeof dischargeDemandHardCapW === 'number'
                        && Number.isFinite(dischargeDemandHardCapW))
                        ? Math.max(0, dischargeDemandHardCapW)
                        : maxDischargeW;
                    // Hersteller-Neuberechnung darf die gemeinsamen SoC-/Reserve-
                    // Grenzen nicht umgehen. Das allgemeine Eigenverbrauchsmodul kann
                    // bei gesperrter Entladung bewusst keinen positiven Request erzeugen;
                    // Sungrow berechnet danach aber trotzdem einen NVP-Sollwert. Deshalb
                    // wird die Freigabe hier nochmals als finale Hersteller-Cap angewendet.
                    // Die reine Eigenverbrauchsregelung kann bei bereits unterschrittenem
                    // selfMinSoc keinen positiven Request erzeugen. In diesem Fall bleibt
                    // hardDischargeMinSoc noch auf seinem neutralen Startwert, obwohl Sungrow
                    // anschliessend aus dem NVP erneut eine Entladung berechnen koennte.
                    // Deshalb gilt im Herstellerpfad immer die strengere Grenze aus der
                    // allgemeinen Policy und der Eigenverbrauchs-Min-SoC-Grenze.
                    const sungrowDischargeMinSoc = Math.max(hardDischargeMinSoc, selfMinSoc);
                    const dischargeAllowedBySocW = reserveActive
                        || (typeof soc === 'number' && soc <= sungrowDischargeMinSoc)
                        ? 0
                        : maxDischargeW;
                    const effectiveDischargeCapW = Math.min(maxDischargeW, dischargeCapW, upstreamDischargeCapW, dischargeAllowedBySocW);
                    targetW = clamp(balancedTargetW, 0, effectiveDischargeCapW);
                    source = 'sungrow-assist';
                    if (targetW > 0) {
                        reason = sungrowBalance.holdingLastCommand
                            ? `Sungrow Hybrid ESS: NVP im Zielband – Entladung ${Math.round(targetW)} W halten`
                            : `Sungrow Hybrid ESS: geschlossener NVP-Regelkreis Entladen ${Math.round(targetW)} W (${String(sungrowBalance.baseSource || '')})`;
                        sungrowWriteMode = sungrowBalance.holdingLastCommand
                            ? 'write-nvp-hold-discharge'
                            : (sungrowBalance.feedForwardUsed ? 'write-pv-load-feed-forward-discharge' : 'write-nvp-balance-discharge');
                    } else {
                        reason = 'Sungrow Hybrid ESS: Entladen durch SoC-/Leistungs-/Demand-Grenze gestoppt';
                        sungrowWriteMode = 'write-stop-discharge-limit';
                    }
                    dischargeDemandHardCapW = (typeof dischargeDemandHardCapW === 'number')
                        ? Math.min(dischargeDemandHardCapW, dischargeCapW)
                        : dischargeCapW;
                    dischargeDemandHardCapReason = sungrowBalance.feedForwardUsed
                        ? 'Sungrow direkter PV-/Last-Feed-forward-Cap'
                        : 'Sungrow NVP-Balancing-Entlade-Cap';
                } else if (balancedTargetW < 0) {
                    const maxChargeBySocW = (typeof soc === 'number' && soc >= hardChargeMaxSoc) ? 0 : maxChargeW;
                    const deferredChargeCap = isDeferredSungrowChargeCapReason(chargeDemandHardCapReason);
                    const upstreamChargeCapW = (!deferredChargeCap
                        && typeof chargeDemandHardCapW === 'number'
                        && Number.isFinite(chargeDemandHardCapW))
                        ? Math.max(0, chargeDemandHardCapW)
                        : maxChargeW;
                    // Der geschlossene Sungrow-Regelkreis erzeugt seinen Sollwert erst
                    // an dieser Stelle. Vorlaeufige Generic-PV-/NVP-Caps werden daher
                    // nicht ein zweites Mal verwendet; SoC, Herstellerleistung und der
                    // finale zentrale PV-Cap bleiben weiterhin harte Grenzen.
                    const effectiveChargeCapW = Math.min(maxChargeBySocW, chargeCapW, upstreamChargeCapW);
                    const chargeW = clamp(Math.abs(balancedTargetW), 0, effectiveChargeCapW);
                    targetW = chargeW > 0 ? -chargeW : 0;
                    source = 'sungrow-assist';
                    reason = chargeW > 0
                        ? (sungrowBalance.holdingLastCommand
                            ? `Sungrow Hybrid ESS: NVP im Zielband – Beladung ${Math.round(chargeW)} W halten`
                            : `Sungrow Hybrid ESS: geschlossener NVP-Regelkreis Laden ${Math.round(chargeW)} W (${String(sungrowBalance.baseSource || '')})`)
                        : `Sungrow Hybrid ESS: Laden durch SoC-/Leistungsgrenze gestoppt`;
                    sungrowWriteMode = chargeW > 0
                        ? (sungrowBalance.holdingLastCommand
                            ? 'write-nvp-hold-charge'
                            : (sungrowBalance.feedForwardUsed ? 'write-pv-load-feed-forward-charge' : 'write-nvp-balance-charge'))
                        : 'write-stop-charge-limit';
                    chargeDemandHardCapW = (!deferredChargeCap
                        && typeof chargeDemandHardCapW === 'number'
                        && Number.isFinite(chargeDemandHardCapW))
                        ? Math.min(chargeDemandHardCapW, chargeCapW)
                        : chargeCapW;
                    chargeDemandHardCapReason = sungrowBalance.feedForwardUsed
                        ? 'Sungrow direkter PV-/Last-Feed-forward-Cap'
                        : 'Sungrow NVP-Balancing-Lade-Cap';
                } else {
                    const lastActiveTargetW = Number.isFinite(Number(this._lastTargetW))
                        ? Number(this._lastTargetW)
                        : 0;
                    const lastWasNvpControl = isStorageBalanceSource(this._lastSource);

                    if (lastActiveTargetW !== 0 && lastWasNvpControl) {
                        // Defensive Rueckfallebene: Falls der Herstellerpfad trotz
                        // laufendem geschlossenen Regelkreis kurzzeitig kein neues
                        // Ziel erzeugt, bleibt der letzte wirksame Nicht-Null-Befehl
                        // aktiv. So entsteht kein Laden -> 0 -> Laden-Pendeln.
                        targetW = lastActiveTargetW;
                        source = 'sungrow-assist';
                        reason = `Sungrow Hybrid ESS: letzten aktiven NVP-Sollwert ${Math.round(lastActiveTargetW)} W halten`;
                        sungrowWriteMode = 'write-hold-last-active-command';
                        storageNvpBalanceDiag = {
                            ...(storageNvpBalanceDiag || sungrowBalance),
                            targetW: lastActiveTargetW,
                            rawTargetW: lastActiveTargetW,
                            holdingLastCommand: true,
                            heldTargetW: lastActiveTargetW,
                            mode: 'sungrow-defensive-hold-last-command',
                            policy: 'sungrow-hybrid',
                        };
                    } else {
                        // Ohne aktiven externen NexoWatt-Befehl ist 0 W kein notwendiger
                        // Schreibwert. No-Write laesst Sungrow intern weiterarbeiten und
                        // verhindert, dass ein zyklischer Leerlauf den Controller stoppt.
                        targetW = 0;
                        source = 'sungrow-hybrid';
                        reason = 'Sungrow Hybrid ESS: kein aktiver externer Sollwert – keine 0-W-Vorgabe senden';
                        sungrowWriteMode = 'no-write-idle';
                        sungrowNoWrite = true;
                    }
                }
            } else {
                sungrowWriteMode = `policy-${srcNorm || 'standard'}`;
            }

            this._sungrowHybridLastMode = sungrowWriteMode;
            // Die Diagnose wird erst nach dem finalen zentralen PV-Budget-Cap
            // geschrieben. Dadurch zeigt sie den tatsaechlich an den Speicher
            // gehenden Sollwert und nicht einen zuvor berechneten Herstellerwert.
            sungrowDiagPayload = {
                active: true,
                mode: String(sungrowBalance.mode || ctx.mode || 'nvp-closed-loop'),
                reason,
                writeMode: sungrowWriteMode,
                targetW,
                pvW: sungrowFeedForward.pvW !== null && sungrowFeedForward.pvW !== undefined ? sungrowFeedForward.pvW : ctx.pvW,
                loadW: sungrowFeedForward.loadW !== null && sungrowFeedForward.loadW !== undefined ? sungrowFeedForward.loadW : ctx.loadW,
                nvpW: nvpNowW,
                importW: importNowW,
                exportW: exportNowW,
                pvCoversLoad: !!ctx.pvCoversLoad,
                thresholdW: ctx.thresholdW,
                loadCoverReserveW: ctx.loadCoverReserveW,
                dischargeThresholdW: ctx.dischargeThresholdW,
                nvpTargetW: targetImportW,
                nvpDeadbandW,
                nvpErrorW: sungrowBalance.nvpErrorW,
                nvpBalanceBaseW: sungrowBalance.baseW,
                nvpBalanceTargetW: sungrowBalance.targetW,
                nvpBalanceNeeded: Math.abs(Number(sungrowBalance.nvpErrorW) || 0) > nvpDeadbandW,
            };
        }

        // ------------------------------------------------------------
        // Finale asymmetrische EVCS-Speicherschutzschranke
        // ------------------------------------------------------------
        // "Speicher schuetzen" bedeutet:
        // - Entladen nur fuer Haus-/sonstige Last ohne geschuetzte E-Mobilitaet.
        // - Laden nur aus dem tatsaechlichen Gesamtueberschuss nach Haus UND EVCS.
        // Die Schranke liegt nach allen Herstellerprofilen, damit Sungrow, FENECON,
        // E3/DC, Signed-/Split-DP und Farm exakt dieselbe physikalische Regel erhalten.
        if (evcsStorageProtectedLoadW > 0 || evcsStorageProtectedLoadUnknown) {
            const lastActiveTargetW = Number.isFinite(Number(this._lastTargetW))
                ? Number(this._lastTargetW)
                : 0;
            const protectionNvpW = (typeof nvpRawW === 'number' && Number.isFinite(nvpRawW))
                ? Number(nvpRawW)
                : ((typeof gridW === 'number' && Number.isFinite(gridW)) ? Number(gridW) : null);
            // Speicherschutz darf niemals ein Tarif-/Netzlade-Ziel als Ladefreigabe
            // uebernehmen. Fuer die Frage "echter Gesamtueberschuss?" gilt immer das
            // normale kleine Eigenverbrauchsziel am NVP.
            const protectionTargetNvpW = Math.max(0, selfTargetGridW);
            // Zum Freigeben von Speicherladung darf nur ein frischer physischer
            // Istwert dienen. Ein ueber die Async-Haltezeit fortgeschriebener alter
            // negativer Wert koennte sonst trotz fehlendem Export Netzladen erlauben.
            // Bei fehlendem Feedback darf ein alter negativer Ladebefehl nie als
            // Ueberschussnachweis dienen; positive Entladung verhindert nur konservativ Netzladen.
            const feedbackHeldForProtection = !!(
                (storageNvpBalanceDiag && storageNvpBalanceDiag.batteryFeedbackHeld === true)
                || (storageBalanceFeedback && storageBalanceFeedback.held === true)
            );
            const diagActualW = storageNvpBalanceDiag
                && storageNvpBalanceDiag.feedbackUsed === true
                && !feedbackHeldForProtection
                && Number.isFinite(Number(storageNvpBalanceDiag.actualBatteryW))
                ? Number(storageNvpBalanceDiag.actualBatteryW)
                : null;
            // Fuer die Entladebegrenzung darf auch der vorhandene Async-Messanker
            // genutzt werden. `actualBatteryW` wird dort aus dem letzten echten
            // physischen Sample plus der einmalig attribuierten NVP-Reaktion
            // gebildet und integriert denselben Fehler nicht erneut. Fuer eine
            // Ladefreigabe bleibt dieser gehaltene Wert weiterhin unzulaessig.
            const diagDischargeBasisW = storageNvpBalanceDiag
                && storageNvpBalanceDiag.feedbackUsed === true
                && Number.isFinite(Number(storageNvpBalanceDiag.actualBatteryW))
                ? Number(storageNvpBalanceDiag.actualBatteryW)
                : null;
            const protectionStorageActualW = diagActualW !== null
                ? diagActualW
                : (!feedbackHeldForProtection && balanceBatteryTrusted && Number.isFinite(Number(balanceBatteryPowerW))
                    ? Number(balanceBatteryPowerW)
                    : (!feedbackHeldForProtection && battPowerTrusted && typeof battPowerW === 'number' && Number.isFinite(battPowerW)
                        ? Number(battPowerW)
                        : null));

            // Fuer die Entladebegrenzung bleibt ein echter, vom Async-Feedback-
            // Puffer gehaltener physischer Messanker zulaessig. Ist der letzte per
            // DP-Readback bestaetigte Befehl neuer als diese Messprobe, darf er fuer
            // ein begrenztes Reaktionsfenster als Kommandoanker dienen. Fuer die
            // Ladefreigabe wird dieser Wert bewusst NICHT verwendet.
            const feedbackCadenceMs = Number.isFinite(Number(feedbackSampleCadenceMs))
                ? Math.max(250, Number(feedbackSampleCadenceMs))
                : 0;
            const protectionCommandGraceMs = Math.max(
                10000,
                Math.min(30000, feedbackCadenceMs > 0 ? Math.round((feedbackCadenceMs * 2.5) + 1000) : 10000),
            );
            const lastTargetWriteMs = Number(this._lastTargetWriteMs) || 0;
            const commandAnchorAgeMs = lastTargetWriteMs > 0 ? Math.max(0, now - lastTargetWriteMs) : Number.POSITIVE_INFINITY;
            const commandAnchorFresh = lastTargetWriteMs > 0
                && commandAnchorAgeMs <= protectionCommandGraceMs
                && Number.isFinite(lastActiveTargetW);
            const feedbackSampleTsForProtection = Number(storageBalanceFeedback && storageBalanceFeedback.sampleTs) || 0;
            const commandNewerThanFeedback = commandAnchorFresh
                && lastTargetWriteMs > (feedbackSampleTsForProtection + 2);
            const heldPhysicalBasisW = balanceBatteryTrusted && Number.isFinite(Number(balanceBatteryPowerW))
                ? Number(balanceBatteryPowerW)
                : null;
            let protectionStorageDischargeBasisW = protectionStorageActualW;
            let protectionStorageDischargeBasisSource = protectionStorageActualW !== null
                ? 'fresh-physical-feedback'
                : 'missing';
            if (protectionStorageDischargeBasisW === null) {
                if (diagDischargeBasisW !== null) {
                    protectionStorageDischargeBasisW = diagDischargeBasisW;
                    protectionStorageDischargeBasisSource = feedbackHeldForProtection
                        ? 'async-feedback-anchor'
                        : 'fresh-physical-feedback';
                } else if (heldPhysicalBasisW !== null) {
                    protectionStorageDischargeBasisW = heldPhysicalBasisW;
                    protectionStorageDischargeBasisSource = 'held-physical-feedback';
                } else if (commandNewerThanFeedback || commandAnchorFresh) {
                    // Nur letzter Fallback, falls noch kein physischer Messanker
                    // vorhanden ist. Der zentrale Anti-Export-/Feedback-Schutz
                    // entscheidet danach weiterhin fail-safe ueber die Freigabe.
                    protectionStorageDischargeBasisW = lastActiveTargetW;
                    protectionStorageDischargeBasisSource = 'confirmed-command-anchor';
                }
            }

            const requestedBeforeProtectionW = Number(targetW) || 0;
            evcsProtectionDiag = resolveEvcsProtectedStorageTarget({
                requestedTargetW: requestedBeforeProtectionW,
                lastTargetW: lastActiveTargetW,
                protectedEvcsLoadW: evcsStorageProtectedLoadW,
                protectedLoadUnknown: evcsStorageProtectedLoadUnknown,
                nvpW: protectionNvpW,
                targetNvpW: protectionTargetNvpW,
                storageActualW: protectionStorageActualW,
                storageDischargeBasisW: protectionStorageDischargeBasisW,
                storageDischargeBasisSource: protectionStorageDischargeBasisSource,
                // Der Schutz verwendet das NVP-Toleranzband, nicht die Leistungsrampe.
                // maxDelta/stepW kann mehrere hundert Watt betragen und wuerde sonst
                // kleine, aber reale PV-Ueberschuesse unnoetig unterdruecken.
                deadbandW: Math.max(0, selfImportThresholdW),
            });
            targetW = Number(evcsProtectionDiag.targetW) || 0;
            evcsProtectedChargeStop = evcsProtectionDiag.chargeStop === true;
            evcsProtectedDischargeStop = evcsProtectionDiag.dischargeStop === true;
            evcsProtectionChargeFromSurplus = evcsProtectionDiag.chargeFromSurplus === true;
            if (evcsStorageProtectedLoadUnknown) {
                dischargeDemandHardCapW = 0;
                dischargeDemandHardCapReason = 'EVCS-Speicherschutz: Fahrzeuglast unbekannt';
            }

            if (targetW < 0) {
                // Unter Speicherschutz ist jede verbleibende Beladung physikalisch
                // PV-/NVP-Ueberschussladung, auch wenn eine Tarif-/Reserve-Policy den
                // urspruenglichen Wunsch erzeugt hat. So greifen PV-Budget und Diagnose
                // korrekt und Netzladen bleibt ausgeschlossen.
                source = 'pv';
                reason = String(evcsProtectionDiag.reason || reason || 'EVCS-Speicherschutz: PV-Ueberschuss laden');
                const capW = Math.max(0, -targetW);
                chargeDemandHardCapW = (typeof chargeDemandHardCapW === 'number' && Number.isFinite(chargeDemandHardCapW))
                    ? Math.min(Math.max(0, chargeDemandHardCapW), capW)
                    : capW;
                chargeDemandHardCapReason = 'EVCS-Speicherschutz: nur tatsaechlicher Gesamtueberschuss';
            } else if (targetW > 0) {
                reason = String(evcsProtectionDiag.reason || reason || 'EVCS-Speicherschutz: Hausverbrauch ausgleichen');
                const capW = Math.max(0, targetW);
                dischargeDemandHardCapW = (typeof dischargeDemandHardCapW === 'number' && Number.isFinite(dischargeDemandHardCapW))
                    ? Math.min(Math.max(0, dischargeDemandHardCapW), capW)
                    : capW;
                dischargeDemandHardCapReason = 'EVCS-Speicherschutz: Entladung ohne E-Mobilitaet';
            } else if (evcsProtectionDiag.explicitStop === true) {
                source = 'evcs-protection';
                reason = String(evcsProtectionDiag.reason || 'EVCS-Speicherschutz: Speicher stoppen');
                if (evcsProtectedChargeStop) {
                    chargeDemandHardCapW = 0;
                    chargeDemandHardCapReason = 'EVCS-Speicherschutz: kein Gesamtueberschuss';
                }
                if (evcsProtectedDischargeStop) {
                    dischargeDemandHardCapW = 0;
                    dischargeDemandHardCapReason = 'EVCS-Speicherschutz: nur EVCS-Bedarf';
                }
                if (sungrowHybridActive) {
                    sungrowNoWrite = false;
                    sungrowWriteMode = 'write-stop-evcs-protection';
                    this._sungrowHybridLastMode = sungrowWriteMode;
                }
            }

            if (storageNvpBalanceDiag && typeof storageNvpBalanceDiag === 'object') {
                storageNvpBalanceDiag = {
                    ...storageNvpBalanceDiag,
                    targetW,
                    evcsProtection: evcsProtectionDiag,
                    mode: evcsProtectionDiag.explicitStop === true
                        ? `evcs-protection-${String(evcsProtectionDiag.action || 'stop')}`
                        : String(storageNvpBalanceDiag.mode || ''),
                };
            }
        }

        await this._setIfChanged('speicher.regelung.evcsSpeicherSchutzAktiv', evcsStorageProtectedLoadW > 0 || evcsStorageProtectedLoadUnknown);
        await this._setIfChanged('speicher.regelung.evcsSpeicherSchutzAktion', evcsProtectionDiag ? String(evcsProtectionDiag.action || '') : 'inactive');
        await this._setIfChanged('speicher.regelung.evcsSpeicherSchutzJson', JSON.stringify(evcsProtectionDiag || {
            active: false,
            protectedLoadW: Math.round(evcsStorageProtectedLoadW || 0),
            protectedLoadUnknown: evcsStorageProtectedLoadUnknown,
            targetW: Number(targetW) || 0,
        }));

        // ------------------------------------------------------------
        // Finaler zentraler PV-Budget-Cap NACH allen Herstellerprofilen
        // ------------------------------------------------------------
        // Sungrow berechnet seinen geschlossenen NVP-Sollwert erst nach dem
        // allgemeinen Dispatcher. Ein nur davor angewendeter PV-Cap konnte daher
        // nachtraeglich wieder ueberschrieben werden; der Speicher nahm dann trotz
        // 80-%-E-Mobilitaetsanteil den vollen PV-Ueberschuss. Der finale Cap ist
        // deshalb die letzte fachliche Schranke vor Budgetreservierung/Schreiben.
        try {
            const budgetRuntime = centralPvBudgetRuntime || (this.adapter && this.adapter._emsBudget);
            const allocationGate = centralPvAllocationGate || (budgetRuntime && budgetRuntime.gates && budgetRuntime.gates.pvAllocation
                ? budgetRuntime.gates.pvAllocation
                : null);
            if (allocationGate) {
                pvBudgetAllocationMode = String(allocationGate.mode || pvBudgetAllocationMode || '');
            }
            pvBudgetRemainingBeforeStorageW = resolveStoragePvBudgetW(
                budgetRuntime,
                allocationGate,
                pvBudgetStorageAvailableW,
            );
            pvBudgetStorageAvailableW = pvBudgetRemainingBeforeStorageW;
            pvBudgetPostVendorCapW = pvBudgetStorageAvailableW;

            if (!feneconNoWrite && !sungrowNoWrite && budgetRuntime && isCentralPvChargeSource(source, targetW)) {
                const pvCapW = Math.max(0, pvBudgetStorageAvailableW);
                const requestedChargeW = Math.max(0, -Number(targetW));
                const rawVendorTargetW = storageNvpBalanceDiag && Number.isFinite(Number(storageNvpBalanceDiag.rawTargetW))
                    ? Number(storageNvpBalanceDiag.rawTargetW)
                    : Number(targetW);
                const rawVendorChargeW = Math.max(0, -rawVendorTargetW);
                const vendorAlreadyLimitedByPvBudget = rawVendorChargeW > (pvCapW + Math.max(1, stepW));

                if (requestedChargeW > pvCapW) {
                    targetW = pvCapW > 0 ? -pvCapW : 0;
                }

                if (requestedChargeW > pvCapW || vendorAlreadyLimitedByPvBudget) {
                    pvBudgetPostVendorCapped = true;
                    reason = `${reason} (finales PV-Restbudget nach E-Mobilitaet ${Math.round(pvCapW)} W)`;
                    if (sungrowHybridActive) {
                        sungrowWriteMode = pvCapW > 0
                            ? `${String(sungrowWriteMode || 'write-nvp-balance-charge').replace(/-pv-budget-capped$/, '')}-pv-budget-capped`
                            : 'pending-zero-central-pv-budget';
                        this._sungrowHybridLastMode = sungrowWriteMode;
                    }
                }
                chargeDemandHardCapW = (typeof chargeDemandHardCapW === 'number'
                    && Number.isFinite(chargeDemandHardCapW)
                    && !isDeferredSungrowChargeCapReason(chargeDemandHardCapReason))
                    ? Math.min(Math.max(0, chargeDemandHardCapW), pvCapW)
                    : pvCapW;
                chargeDemandHardCapReason = 'Finales zentrales PV-Restbudget nach E-Mobilitaet';
                if (storageNvpBalanceDiag && typeof storageNvpBalanceDiag === 'object') {
                    storageNvpBalanceDiag = {
                        ...storageNvpBalanceDiag,
                        targetW,
                        finalPvBudgetCapW: pvCapW,
                        finalPvBudgetCapped: pvBudgetPostVendorCapped,
                        finalPvBudgetNoWriteHold: false,
                    };
                }
            }
        } catch {
            // Die Budgetdiagnose darf den sicheren Speicher-Schreibpfad nicht abbrechen.
        }

        // ------------------------------------------------------------
        // Finaler zentraler Gesamtbudget-Cap fuer Speicher-Netzladen
        // ------------------------------------------------------------
        // Tarif-, Reserve- und LSK-Nachladung sind keine PV-Senken. Sie duerfen
        // deshalb nur den nach der EVCS-Reservierung verbleibenden Gesamt-Grant
        // nutzen. Der Cap liegt bewusst nach allen Herstellerberechnungen, damit
        // Sungrow/E3DC/Generic denselben finalen Wert erhalten.
        try {
            const budgetRuntime = this.adapter && this.adapter._emsBudget;
            const sourceForBudget = policySourceBeforeVendor || String(source || '');
            const gridChargeSource = !evcsProtectionChargeFromSurplus && isCentralGridChargeSource(sourceForBudget, targetW);
            if (!feneconNoWrite && !sungrowNoWrite && budgetRuntime && targetW < 0 && gridChargeSource) {
                const requestedChargeW = Math.max(0, -Number(targetW));
                const totalGrant = typeof budgetRuntime.getTotalGrant === 'function'
                    ? budgetRuntime.getTotalGrant({ key: 'storage', requestedW: requestedChargeW })
                    : (typeof budgetRuntime.grant === 'function'
                        ? budgetRuntime.grant({ key: 'storage', requestedW: requestedChargeW, pvOnly: false })
                        : null);
                totalBudgetStorageAvailableW = totalGrant && Number.isFinite(Number(totalGrant.grantW))
                    ? Math.max(0, Number(totalGrant.grantW))
                    : requestedChargeW;
                const allowedChargeW = Math.min(requestedChargeW, totalBudgetStorageAvailableW);
                totalBudgetStorageCapped = allowedChargeW + 0.5 < requestedChargeW;
                if (totalBudgetStorageCapped) {
                    targetW = allowedChargeW > 0 ? -allowedChargeW : 0;
                    chargeDemandHardCapW = (typeof chargeDemandHardCapW === 'number' && Number.isFinite(chargeDemandHardCapW))
                        ? Math.min(Math.max(0, chargeDemandHardCapW), allowedChargeW)
                        : allowedChargeW;
                    chargeDemandHardCapReason = 'Finales zentrales Gesamtbudget nach E-Mobilitaet';
                    reason = `${reason} (zentrales Gesamtbudget nach E-Mobilitaet ${Math.round(allowedChargeW)} W)`;
                    if (sungrowHybridActive && targetW === 0) {
                        sungrowWriteMode = 'write-stop-central-total-budget-exhausted';
                        this._sungrowHybridLastMode = sungrowWriteMode;
                    }
                    if (storageNvpBalanceDiag && typeof storageNvpBalanceDiag === 'object') {
                        storageNvpBalanceDiag = {
                            ...storageNvpBalanceDiag,
                            targetW,
                            finalTotalBudgetCapW: allowedChargeW,
                            finalTotalBudgetCapped: true,
                        };
                    }
                }
            }
        } catch {
            // Budgetdiagnose darf die sichere Speicheransteuerung nicht abbrechen.
        }

        // ------------------------------------------------------------
        // Finale proportionale Speicher-Anti-Export-Regelung
        // ------------------------------------------------------------
        // Diese Schranke ist herstellerunabhaengig und liegt nach allen
        // Strategie-, Budget- und Vendorpfaden. Sie fuehrt keinen pauschalen
        // Sofort-Stopp aus: Unterschreitet der frische signierte NVP das Ziel,
        // wird die Entladung innerhalb einer kurzen Grace-Zeit proportional
        // reduziert. Erst wenn nach der Grace rechnerisch keine Entladung mehr
        // zulaessig ist, wird 0 W als echter Sicherheitsstopp geschrieben.
        {
            const antiExportNvpUsable = typeof nvpRawW === 'number'
                && Number.isFinite(nvpRawW)
                && (!centralNvpCurrent || centralNvp.usable === true)
                && (!(typeof gridRawAge === 'number' && Number.isFinite(gridRawAge)) || gridRawAge <= staleMs);
            let antiExportNvpSampleTs = 0;
            try {
                const canonicalSnapshot = this.adapter && this.adapter._nvpFreshnessSnapshot
                    && typeof this.adapter._nvpFreshnessSnapshot === 'object'
                    ? this.adapter._nvpFreshnessSnapshot
                    : null;
                const snapshotTs = canonicalSnapshot && Number.isFinite(Number(canonicalSnapshot.ts))
                    ? Number(canonicalSnapshot.ts)
                    : null;
                const snapshotMeasurementAgeMs = centralNvpCurrent && Number.isFinite(Number(centralNvp.measurementAgeMs))
                    ? Math.max(0, Number(centralNvp.measurementAgeMs))
                    : null;
                if (snapshotTs !== null && snapshotMeasurementAgeMs !== null) {
                    antiExportNvpSampleTs = Math.max(1, Math.round(snapshotTs - snapshotMeasurementAgeMs));
                } else if (typeof gridRawAge === 'number' && Number.isFinite(gridRawAge)) {
                    antiExportNvpSampleTs = Math.max(1, Math.round(now - Math.max(0, gridRawAge)));
                }
            } catch {
                antiExportNvpSampleTs = 0;
            }

            const antiExportFeedbackHeld = !!(
                (storageBalanceFeedback && storageBalanceFeedback.held === true)
                || (storageNvpBalanceDiag && storageNvpBalanceDiag.batteryFeedbackHeld === true)
            );
            const antiExportStorageActualW = !antiExportFeedbackHeld
                && storageNvpBalanceDiag
                && storageNvpBalanceDiag.feedbackUsed === true
                && Number.isFinite(Number(storageNvpBalanceDiag.actualBatteryW))
                ? Number(storageNvpBalanceDiag.actualBatteryW)
                : (!antiExportFeedbackHeld && balanceBatteryTrusted && Number.isFinite(Number(balanceBatteryPowerW))
                    ? Number(balanceBatteryPowerW)
                    : (!antiExportFeedbackHeld && battPowerTrusted && Number.isFinite(Number(battPowerW))
                        ? Number(battPowerW)
                        : null));
            const antiExportGraceMs = Math.max(
                500,
                Math.min(10000, Math.round(num(cfg.antiExportGraceSec, 2) * 1000)),
            );
            const antiExportTargetNvpW = Math.max(0, selfTargetGridW);
            const targetBeforeAntiExportW = Number(targetW) || 0;
            const lastAcceptedDischargeW = Number.isFinite(Number(this._lastTargetW))
                ? Math.max(0, Number(this._lastTargetW))
                : 0;
            const heldDischargeAnchorW = balanceBatteryTrusted && Number.isFinite(Number(balanceBatteryPowerW))
                ? Math.max(0, Number(balanceBatteryPowerW))
                : 0;
            const antiExportCommandAnchorW = lastAcceptedDischargeW > 0
                ? lastAcceptedDischargeW
                : heldDischargeAnchorW;
            storageAntiExportDiag = resolveStorageAntiExportTarget({
                requestedTargetW: targetBeforeAntiExportW,
                commandAnchorW: antiExportCommandAnchorW,
                storageActualW: antiExportStorageActualW,
                nvpW: antiExportNvpUsable ? Number(nvpRawW) : null,
                nvpSampleTs: antiExportNvpSampleTs,
                targetNvpW: antiExportTargetNvpW,
                deadbandW: Math.max(0, selfImportThresholdW),
                graceMs: antiExportGraceMs,
                now,
                state: this._storageAntiExportState,
                epsilonW: Math.max(1, stepW > 0 ? Math.min(stepW, 20) : 1),
            });
            this._storageAntiExportState = storageAntiExportDiag && storageAntiExportDiag.nextState
                ? storageAntiExportDiag.nextState
                : { activeSinceMs: 0, lastProcessedNvpSampleTs: 0, lastOutputW: 0 };
            storageAntiExportExplicitStop = !!(storageAntiExportDiag && storageAntiExportDiag.explicitStop === true);

            const antiExportTargetW = storageAntiExportDiag && Number.isFinite(Number(storageAntiExportDiag.targetW))
                ? Number(storageAntiExportDiag.targetW)
                : targetBeforeAntiExportW;
            if (targetBeforeAntiExportW > 0 && antiExportTargetW + 0.5 < targetBeforeAntiExportW) {
                targetW = Math.max(0, antiExportTargetW);
                const capW = Math.max(0, targetW);
                dischargeDemandHardCapW = (typeof dischargeDemandHardCapW === 'number' && Number.isFinite(dischargeDemandHardCapW))
                    ? Math.min(Math.max(0, dischargeDemandHardCapW), capW)
                    : capW;
                dischargeDemandHardCapReason = storageAntiExportExplicitStop
                    ? 'NVP-Anti-Export: Stop nach Grace'
                    : 'NVP-Anti-Export: proportionale Entladebegrenzung';
                reason = String(storageAntiExportDiag.reason || reason || 'NVP-Anti-Export: Entladung begrenzt');
                if (storageAntiExportExplicitStop) source = 'anti-export';

                // Sungrow darf unter aktiver Anti-Export-Korrektur weder den alten
                // Entladebefehl per No-Write halten noch einen Feed-forward-Wert
                // erneut einsetzen. Der reduzierte Wert wird explizit geschrieben.
                if (sungrowHybridActive) {
                    sungrowNoWrite = false;
                    sungrowWriteMode = storageAntiExportExplicitStop
                        ? 'write-stop-anti-export-after-grace'
                        : 'write-anti-export-ramp-down';
                    this._sungrowHybridLastMode = sungrowWriteMode;
                }
            }

            if (storageNvpBalanceDiag && typeof storageNvpBalanceDiag === 'object') {
                storageNvpBalanceDiag = {
                    ...storageNvpBalanceDiag,
                    targetW: Number(targetW) || 0,
                    antiExport: storageAntiExportDiag,
                    mode: storageAntiExportDiag && storageAntiExportDiag.active === true
                        ? `anti-export-${String(storageAntiExportDiag.status || 'active')}`
                        : String(storageNvpBalanceDiag.mode || ''),
                };
            }
            await this._setIfChanged('speicher.regelung.antiExportStatus', storageAntiExportDiag ? String(storageAntiExportDiag.status || '') : 'inactive');
            await this._setIfChanged('speicher.regelung.antiExportJson', JSON.stringify(storageAntiExportDiag || { active: false, status: 'inactive' }));
        }

        // ------------------------------------------------------------
        // Herstellerunabhaengige 0-W-Firewall nach allen Policies/Caps
        // ------------------------------------------------------------
        // 0 W ist bei allen unterstuetzten Speicherprofilen ein echter Stop.
        // Zielband, ein einzelner Budget-0-Tick oder eine kurze Messluecke duerfen
        // deshalb keinen Laden -> 0 -> Laden-/Entladen-Puls erzeugen. Erst ein
        // expliziter Schutzgrund oder eine physikalisch falsche Richtung darf 0 W
        // an signed-, Split-, E3/DC- oder Farm-Sollwerte schreiben.
        if (targetW === 0) {
            // Testleistung ist kein dauerhafter Sollwertanker. Eine laufende
            // zentrale Lease wird weiter unten neu geprüft, sonst muss sie enden.
            const lastActiveTargetW = String(this._lastSource || '') === 'zero-export-probe'
                ? 0 : strictFiniteNumber(this._lastTargetW, 0);
            const nvpMeasurementUsable = typeof nvpRawW === 'number'
                && Number.isFinite(nvpRawW)
                && (!centralNvpCurrent || centralNvp.usable === true);
            const measurementGap = !nvpMeasurementUsable;
            if (measurementGap && lastActiveTargetW !== 0) {
                if (!this._storageMeasurementGapSinceMs) this._storageMeasurementGapSinceMs = now;
            } else {
                this._storageMeasurementGapSinceMs = 0;
            }
            const measurementGapAgeMs = this._storageMeasurementGapSinceMs
                ? Math.max(0, now - this._storageMeasurementGapSinceMs)
                : 0;
            const measurementGraceMs = Math.max(
                5000,
                Math.round(Math.max(0, num(cfg.zeroWriteMeasurementGraceSec, 30)) * 1000),
            );

            const previousSource = String(this._lastSource || '');
            const previousWasPvCharge = lastActiveTargetW < 0 && (
                isCentralPvChargeSource(previousSource, lastActiveTargetW)
                || isStorageBalanceSource(previousSource)
            );
            const pvBudgetZero = previousWasPvCharge
                && Math.max(0, Number(pvBudgetStorageAvailableW) || 0) <= 0;
            if (pvBudgetZero) {
                if (!this._storageBudgetZeroSinceMs) this._storageBudgetZeroSinceMs = now;
            } else {
                this._storageBudgetZeroSinceMs = 0;
            }
            const budgetZeroAgeMs = this._storageBudgetZeroSinceMs
                ? Math.max(0, now - this._storageBudgetZeroSinceMs)
                : 0;
            const budgetGraceMs = Math.max(
                5000,
                Math.round(Math.max(0, num(cfg.zeroWriteBudgetGraceSec, 20)) * 1000),
            );

            const nvpTargetW = storageNvpBalanceDiag && Number.isFinite(Number(storageNvpBalanceDiag.nvpTargetW))
                ? Number(storageNvpBalanceDiag.nvpTargetW)
                : (previousSource === 'tarif'
                    ? Math.max(0, num(cfg.tariffTargetGridImportW, selfTargetGridW))
                    : Math.max(0, selfTargetGridW));
            const nvpDeadbandW = storageNvpBalanceDiag && Number.isFinite(Number(storageNvpBalanceDiag.deadbandW))
                ? Math.max(0, Number(storageNvpBalanceDiag.deadbandW))
                : Math.max(0, selfImportThresholdW);
            const feedForwardTargetW = storageNvpBalanceDiag && Number.isFinite(Number(storageNvpBalanceDiag.feedForwardTargetW))
                ? Number(storageNvpBalanceDiag.feedForwardTargetW)
                : null;
            const visibleExportSupportsCharge = nvpMeasurementUsable
                && Number(nvpRawW) < (nvpTargetW - nvpDeadbandW);
            const feedForwardSupportsCharge = feedForwardTargetW !== null && feedForwardTargetW < 0;
            const allocationModeNorm = String(pvBudgetAllocationMode || '').trim().toLowerCase();
            const budgetZeroConfirmed = pvBudgetZero
                && !visibleExportSupportsCharge
                && !feedForwardSupportsCharge
                && (
                    allocationModeNorm === 'emobility'
                    || (pvBudgetEvcsReservedW > 0 && budgetZeroAgeMs >= budgetGraceMs)
                );

            // Ein vorher aktiver Sollwert muss an den konfigurierten SoC-Grenzen
            // ausdruecklich mit 0 W beendet werden. Im NVP-Zielband ist die normale
            // Request-Quelle bereits idle; ohne diese direkte Grenzpruefung wuerde
            // die 0-W-Firewall den alten Sollwert faelschlich weiterhalten.
            const dischargeSocStop = lastActiveTargetW > 0
                && typeof soc === 'number'
                && soc <= Math.max(hardDischargeMinSoc, selfMinSoc);
            const chargeSocStop = lastActiveTargetW < 0
                && typeof soc === 'number'
                && soc >= hardChargeMaxSoc;
            const explicitStopReason = feneconHybridCtx && feneconHybridCtx.handoverZeroRequired === true
                ? 'FENECON Automatik: EOS-Sollwert vor Uebergabe an FEMS auf 0 W neutralisieren'
                : (storagePolicyBlocked
                ? String(storagePolicyBlockReason || reason || 'Speicheraktion durch Policy gestoppt')
                : (storageAntiExportExplicitStop
                    ? 'Entladen stoppen: NVP-Anti-Export nach 2-s-Grace – rechnerisch keine Entladung mehr zulaessig'
                    : (evcsProtectedChargeStop
                    ? 'Laden stoppen: EVCS-Speicherschutz – kein tatsaechlicher Gesamtueberschuss am NVP'
                    : (evcsProtectedDischargeStop
                        ? (evcsStorageProtectedLoadUnknown
                            ? 'Entladen stoppen: EVCS-Speicherschutz – Fahrzeuglast unbekannt'
                            : 'Entladen stoppen: EVCS-Speicherschutz – nur geschuetzte E-Mobilitaet verursacht den Bedarf')
                        : (dischargeSocStop
                        ? `Entladen stoppen: SoC <= ${Math.max(hardDischargeMinSoc, selfMinSoc)}%`
                        : (chargeSocStop
                            ? `Laden stoppen: SoC >= ${hardChargeMaxSoc}%`
                            : String(reason || '')))))));
            const explicitStop = feneconZeroOverride
                || (feneconHybridCtx && feneconHybridCtx.handoverZeroRequired === true)
                || storagePolicyBlocked
                || storageAntiExportExplicitStop
                || sungrowUpstreamExplicitStop
                || String(sungrowWriteMode || '').startsWith('write-stop-')
                || source === 'aus'
                || source === 'reserve'
                || reserveActive
                || chargeDirectionStopped
                || dischargeDirectionStopped
                || evcsProtectedChargeStop
                || evcsProtectedDischargeStop
                || dischargeSocStop
                || chargeSocStop;

            const zeroDecision = decideStorageZeroWrite({
                targetW,
                lastTargetW: lastActiveTargetW,
                source,
                reason: explicitStopReason,
                explicitStop,
                measurementUsable: nvpMeasurementUsable,
                measurementGap,
                measurementGapAgeMs,
                measurementGraceMs,
                budgetZero: pvBudgetZero,
                budgetZeroConfirmed,
                budgetZeroAgeMs,
                budgetGraceMs,
                nvpW: nvpMeasurementUsable ? nvpRawW : null,
                nvpTargetW,
                nvpDeadbandW,
                feedForwardTargetW,
                // Sungrow und FENECON unter aktiver FEMS-Regelhoheit halten
                // ohne Refresh. Generic/Split/E3DC/Farm erneuern denselben Wert
                // fuer ihren jeweiligen Hardware-Watchdog.
                holdByNoWrite: sungrowHybridActive || feneconNoWrite,
            });

            storageZeroWriteStatus = String(zeroDecision.status || '');
            storageZeroWriteReason = String(zeroDecision.reason || reason || '');

            if (zeroDecision.action === 'hold-write') {
                targetW = Number(zeroDecision.outputW) || 0;
                source = previousSource || source || 'eigenverbrauch';
                reason = storageZeroWriteReason;
                storageZeroNoWrite = false;
            } else if (zeroDecision.action === 'hold-no-write' || zeroDecision.action === 'idle-no-write') {
                targetW = Number(zeroDecision.outputW) || 0;
                source = previousSource || source || (sungrowHybridActive ? 'sungrow-hybrid' : 'idle');
                reason = storageZeroWriteReason;

                // Nur unter aktiver EOS-Regelhoheit braucht FENECON den echten
                // 0-W-Keepalive, damit der externe API-Watchdog die Steuerhoheit
                // nicht unbemerkt an FEMS zurueckgibt. Unter FEMS-Regelhoheit ist
                // dagegen gerade das Ausbleiben jedes Refreshs der gewollte Zustand.
                const feneconEosAuthority = feneconHybridActive
                    && feneconHybridCtx
                    && String(feneconHybridCtx.authority || '') === 'nexowatt';
                if (feneconEosAuthority && zeroDecision.action === 'idle-no-write') {
                    storageZeroNoWrite = false;
                    feneconNoWrite = false;
                    storageZeroWriteStatus = 'write-fenecon-eos-idle-keepalive';
                    storageZeroWriteReason = String(reason || 'FENECON Automatik: EOS-Regelhoheit mit 0-W-Keepalive');
                    reason = storageZeroWriteReason;
                    feneconWriteMode = feneconWriteMode || 'write-eos-zero-keepalive';
                } else {
                    storageZeroNoWrite = true;
                    if (feneconHybridActive && feneconNoWrite) {
                        feneconWriteMode = zeroDecision.action === 'idle-no-write'
                            ? 'no-write-fems-idle'
                            : 'no-write-fems-hold';
                    }
                }
                if (sungrowHybridActive) {
                    sungrowNoWrite = true;
                    sungrowWriteMode = zeroDecision.action === 'idle-no-write'
                        ? 'no-write-zero-firewall-idle'
                        : 'no-write-hold-last-command';
                    this._sungrowHybridLastMode = sungrowWriteMode;
                }
            } else if (zeroDecision.action === 'write-stop') {
                targetW = 0;
                reason = storageZeroWriteReason;
                storageZeroNoWrite = false;
                if (feneconHybridActive) {
                    feneconNoWrite = false;
                    feneconZeroOverride = true;
                    feneconWriteMode = feneconHybridCtx && feneconHybridCtx.handoverZeroRequired === true
                        ? 'write-handover-zero'
                        : 'write-zero-override';
                }
                this._storageMeasurementGapSinceMs = 0;
                this._storageBudgetZeroSinceMs = 0;
            }

            if ((zeroDecision.action === 'hold-write' || zeroDecision.action === 'hold-no-write') && targetW !== 0) {
                storageNvpBalanceDiag = {
                    ...(storageNvpBalanceDiag || {}),
                    targetW,
                    rawTargetW: targetW,
                    holdingLastCommand: true,
                    heldTargetW: targetW,
                    mode: `zero-firewall-${storageZeroWriteStatus || 'hold'}`,
                    policy: storageNvpBalanceDiag && storageNvpBalanceDiag.policy
                        ? storageNvpBalanceDiag.policy
                        : 'storage-zero-firewall',
                };
            }

            pvBudgetPostVendorNoWriteHold = storageZeroNoWrite && targetW < 0;
            pvBudgetPostVendorNoWriteReason = storageZeroNoWrite ? reason : '';
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallAction', storageZeroWriteStatus);
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallReason', storageZeroWriteReason);
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallHeldW', Math.round(Number(zeroDecision.holdW) || 0));
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallExplicitStop', !!zeroDecision.explicitStop);
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallBudgetZeroAgeMs', Math.round(budgetZeroAgeMs));
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallMeasurementGapAgeMs', Math.round(measurementGapAgeMs));
        } else if (targetW !== 0) {
            this._storageMeasurementGapSinceMs = 0;
            this._storageBudgetZeroSinceMs = 0;
            storageZeroWriteStatus = 'write-non-zero';
            storageZeroWriteReason = String(reason || '');
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallAction', 'write-non-zero');
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallReason', '');
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallHeldW', 0);
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallExplicitStop', false);
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallBudgetZeroAgeMs', 0);
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallMeasurementGapAgeMs', 0);
        }

        // Lizenz-Leistungsprofil als letzte produktweite Schranke vor Budget,
        // Farmverteilung und Hardwarewriter. Damit können Hold-/No-Write-Pfade
        // keinen älteren Befehl oberhalb der Home-Grenze weiterführen. Pro besitzt
        // bewusst keinen Lizenz-Hardcap; dort begrenzen ausschließlich Anlage,
        // NVP, Geräte, SoC und Safety-Gates.
        const storageLicensePowerDecision = applyStorageLicensePowerLimit(targetW, storageLicensePowerProfile);
        const storageLicensePowerLimited = storageLicensePowerDecision.limited === true;
        if (storageLicensePowerLimited) {
            const targetBeforeLicenseLimitW = Number(targetW) || 0;
            targetW = Number(storageLicensePowerDecision.targetW) || 0;
            const licenseReason = `${String(storageLicensePowerProfile.label || 'Home')}-Lizenzprofil: Speicherleistung auf ${Math.round(storageLicensePowerDecision.limitW)} W begrenzt`;
            reason = reason ? `${licenseReason} · ${reason}` : licenseReason;

            // Ein bereits aktiver höherer Sollwert muss ausdrücklich auf die
            // Lizenzgrenze zurückgeschrieben werden; No-Write/Hold ist hier nicht
            // zulässig.
            storageZeroNoWrite = false;
            sungrowNoWrite = false;
            if (sungrowHybridActive) {
                sungrowWriteMode = 'write-license-power-cap';
                this._sungrowHybridLastMode = sungrowWriteMode;
            }

            if (targetW > 0) {
                dischargeDemandHardCapW = Math.min(
                    Number.isFinite(Number(dischargeDemandHardCapW)) && Number(dischargeDemandHardCapW) > 0
                        ? Number(dischargeDemandHardCapW)
                        : Number.POSITIVE_INFINITY,
                    Number(storageLicensePowerDecision.limitW),
                );
                dischargeDemandHardCapReason = licenseReason;
            } else if (targetW < 0) {
                chargeDemandHardCapW = Math.min(
                    Number.isFinite(Number(chargeDemandHardCapW)) && Number(chargeDemandHardCapW) > 0
                        ? Number(chargeDemandHardCapW)
                        : Number.POSITIVE_INFINITY,
                    Number(storageLicensePowerDecision.limitW),
                );
                chargeDemandHardCapReason = licenseReason;
            }

            storageNvpBalanceDiag = {
                ...(storageNvpBalanceDiag || {}),
                targetW,
                licensePowerLimited: true,
                licensePowerRequestedW: targetBeforeLicenseLimitW,
                licensePowerLimitW: Number(storageLicensePowerDecision.limitW),
                licensePowerProfile: String(storageLicensePowerProfile.id || 'home'),
            };
        }
        await this._setIfChanged('speicher.regelung.licensePowerLimited', storageLicensePowerLimited);
        await this._setIfChanged('speicher.regelung.licensePowerJson', JSON.stringify({
            ts: now,
            edition: String(storageLicensePowerProfile.edition || ''),
            profile: String(storageLicensePowerProfile.id || 'none'),
            label: String(storageLicensePowerProfile.label || ''),
            industrial: storageLicensePowerProfile.industrial === true,
            unrestricted: storageLicensePowerProfile.unrestricted === true,
            configuredRatedPowerW: Math.round(Number(storageLicensePowerProfile.configuredRatedPowerW || 0)),
            effectiveRatedPowerW: Math.round(Number(storageLicensePowerProfile.effectiveRatedPowerW || 0)),
            maxCommandW: Math.round(Number(storageLicensePowerProfile.maxCommandW || 0)),
            defaultStepW: Math.round(Number(storageLicensePowerProfile.defaultStepW || 0)),
            defaultMaxDeltaWPerTick: Math.round(Number(storageLicensePowerProfile.defaultMaxDeltaWPerTick || 0)),
            defaultPvMaxDeltaWPerTick: Math.round(Number(storageLicensePowerProfile.defaultPvMaxDeltaWPerTick || 0)),
            defaultBalancePredictionMaxW: Math.round(Number(storageLicensePowerProfile.defaultBalancePredictionMaxW || 0)),
            requestedW: Math.round(Number(storageLicensePowerDecision.requestedW || 0)),
            finalW: Math.round(Number(targetW || 0)),
            limited: storageLicensePowerLimited,
            reason: storageLicensePowerLimited ? String(reason || '') : '',
        }));

        // Defense-in-depth: Selbst wenn ein Herstellerprofil, Hold-Pfad,
        // Reserve- oder Refill-Modul einen negativen Netzlade-Sollwert weiterträgt,
        // muss unmittelbar vor dem Writer erneut die zentrale wirtschaftliche
        // Freigabe gelten. Echte PV-/NVP-Ladung bleibt möglich, wird aber in
        // der nachfolgenden physikalischen Schutzebene strikt auf den nachweisbar
        // lokalen PV-Überschuss begrenzt.
        const gridChargeGateSource = resolveStorageGridChargeGateSource({
            targetW,
            source,
            policySourceBeforeVendor,
        });
        const gridChargeFinalGate = resolveStorageGridChargeFinalGate({
            targetW,
            source: gridChargeGateSource,
            configured: gridChargeConfigured,
            allowed: gridChargeAllowed,
            blockReason: gridChargeBlockReason,
        });
        const gridChargeBlockedByConfig = gridChargeFinalGate.blocked && !gridChargeConfigured;
        const gridChargeBlockedByTariffGate = gridChargeFinalGate.blocked && gridChargeConfigured;
        if (gridChargeFinalGate.blocked) {
            targetW = 0;
            reason = gridChargeFinalGate.reason;
            source = 'policy';
            chargeDemandHardCapW = 0;
            chargeDemandHardCapReason = reason;
            storagePolicyBlocked = true;
            storagePolicyBlockReason = reason;
            storageZeroNoWrite = false;
            sungrowNoWrite = false;
            pvBudgetPostVendorNoWriteHold = false;
            pvBudgetPostVendorNoWriteReason = '';
            if (sungrowHybridActive) {
                sungrowWriteMode = gridChargeBlockedByConfig
                    ? 'write-grid-charge-config-stop'
                    : 'write-grid-charge-tariff-stop';
                this._sungrowHybridLastMode = sungrowWriteMode;
            }
            storageNvpBalanceDiag = {
                ...(storageNvpBalanceDiag || {}),
                targetW: 0,
                gridChargeConfigured: !!gridChargeConfigured,
                gridChargeAllowed: !!gridChargeAllowed,
                gridChargeBlockedByConfig: !!gridChargeBlockedByConfig,
                gridChargeBlockedByTariffGate: !!gridChargeBlockedByTariffGate,
                gridChargeBlockReason: String(gridChargeBlockReason || ''),
                mode: gridChargeBlockedByConfig ? 'grid-charge-config-stop' : 'grid-charge-tariff-window-stop',
            };
        }

        // Zweite, physikalische Schutzebene: Auch ein negativer Sollwert aus
        // Hersteller-Assist, Hold oder einem als PV markierten Pfad darf bei
        // gesperrtem Netzladen maximal den real lokal vorhandenen PV-Überschuss
        // aufnehmen. Für die NVP-Seite wird der konservativere (höhere) frische
        // Messwert verwendet. Bei mehreren Batterie-Istwerten gilt ebenfalls der
        // numerisch höhere Wert, weil er den verfügbaren Überschuss nie zu groß
        // schätzt (bei Ladung also den weniger negativen Wert).
        let storagePvOnlyTariffSafetyDiag = null;
        if (!gridChargeFinalGate.blocked && targetW < 0 && !gridChargeAllowed) {
            const nvpSafetyCandidates = [gridRawW, gridW]
                .map((value) => strictFiniteNumber(value, null))
                .filter((value) => value !== null);
            const signedNvpForTariffSafetyW = nvpSafetyCandidates.length
                ? Math.max(...nvpSafetyCandidates)
                : null;

            const batterySafetyCandidates = [];
            let tariffSafetyBatteryBasis = '';

            const lastAcceptedTargetW = strictFiniteNumber(this._lastTargetW, null);
            const lastAcceptedSource = String(this._lastSource || '');
            const lastAcceptedPvOnly = lastAcceptedTargetW !== null
                && lastAcceptedTargetW < 0
                && isStorageBalanceSource(lastAcceptedSource)
                && !isCentralStorageGridChargeSource(lastAcceptedSource, lastAcceptedTargetW);

            // Nur wirklich frische Batterie-Istwerte dürfen den aktuellen
            // Kommando-Anker verdrängen. Ein bereits als `held` markierter 0-W-
            // Messwert ist bei träger Telemetrie nicht belastbar genug, um eine
            // laufende PV-Beladung schlagartig zu stoppen.
            const directBatteryFreshForTariffSafety = battPowerTrusted
                && Number.isFinite(Number(battPowerW))
                && (!battPowerAgeKnown || Number(battPowerAge) <= balanceFeedbackFreshMs);
            const balanceBatteryFreshForTariffSafety = balanceBatteryTrusted
                && Number.isFinite(Number(balanceBatteryPowerW))
                && storageBalanceFeedback.held !== true
                && storageBalanceFeedback.predicted !== true;

            if (balanceBatteryFreshForTariffSafety) {
                batterySafetyCandidates.push(Number(balanceBatteryPowerW));
                tariffSafetyBatteryBasis = 'fresh-nvp-balance-feedback';
            }
            if (directBatteryFreshForTariffSafety) {
                batterySafetyCandidates.push(Number(battPowerW));
                tariffSafetyBatteryBasis = tariffSafetyBatteryBasis
                    ? `${tariffSafetyBatteryBasis}+fresh-battery-feedback`
                    : 'fresh-battery-feedback';
            }

            // Anlagen ohne zeitnahen Batterie-Istwert halten im NVP-Zielband den
            // zuletzt akzeptierten PV-/Eigenverbrauchsbefehl. Dieser bestehende
            // Kommando-Anker ist dann die beste verfügbare Näherung der aktuell
            // wirksamen Batterie-Leistung. Tarif-/Reservequellen sind ausdrücklich
            // ausgeschlossen und werden bereits vom ersten Gate vollständig auf
            // 0 W gesetzt.
            if (!batterySafetyCandidates.length && lastAcceptedPvOnly) {
                batterySafetyCandidates.push(lastAcceptedTargetW);
                tariffSafetyBatteryBasis = 'last-accepted-pv-command';
            }

            // Nur wenn weder frisches Feedback noch ein PV-Kommando-Anker existiert,
            // darf ein begrenzt gehaltener Messwert als konservativer Fallback dienen.
            if (!batterySafetyCandidates.length && balanceBatteryTrusted && Number.isFinite(Number(balanceBatteryPowerW))) {
                batterySafetyCandidates.push(Number(balanceBatteryPowerW));
                tariffSafetyBatteryBasis = 'held-nvp-balance-feedback';
            }
            if (!batterySafetyCandidates.length && battPowerTrusted && Number.isFinite(Number(battPowerW))) {
                batterySafetyCandidates.push(Number(battPowerW));
                tariffSafetyBatteryBasis = 'stale-window-battery-feedback';
            }

            const batteryPowerForTariffSafetyW = batterySafetyCandidates.length
                ? Math.max(...batterySafetyCandidates)
                : null;

            // Nur ein vom gemeinsamen NVP-Regler tatsaechlich verwendeter und dort
            // bereits auf direkte, frische, zeitlich ausgerichtete PV-/Lastwerte
            // gepruefter Feed-forward darf die konservative NVP+Batterie-Schaetzung
            // ergaenzen. Das ist insbesondere fuer Sungrow-/Hybrid-Telemetrie noetig,
            // wenn der Batterie-Istwert kurzzeitig 0 W meldet, obwohl PV und lokale
            // Last einen eindeutigen Ueberschuss ausweisen.
            const feedForwardTargetForTariffSafetyW = storageNvpBalanceDiag
                && storageNvpBalanceDiag.feedForwardUsed === true
                && Number.isFinite(Number(storageNvpBalanceDiag.feedForwardTargetW))
                && Number(storageNvpBalanceDiag.feedForwardTargetW) < 0
                ? Math.max(0, -Number(storageNvpBalanceDiag.feedForwardTargetW))
                : null;

            const pvOnlyChargeSafety = resolveStoragePvOnlyChargeSafetyGate({
                targetW,
                gridChargeAllowed,
                signedNvpW: signedNvpForTariffSafetyW,
                batteryPowerW: batteryPowerForTariffSafetyW,
                batteryPowerTrusted: batteryPowerForTariffSafetyW !== null,
                targetImportW: Math.max(0, selfTargetGridW),
                validatedPvFeedForwardChargeW: feedForwardTargetForTariffSafetyW,
                blockReason: gridChargeConfigured
                    ? gridChargeBlockReason
                    : 'Netzladen deaktiviert (App-Center: „Netzladen erlauben“ ist aus)',
            });
            storagePvOnlyTariffSafetyDiag = pvOnlyChargeSafety;

            if (pvOnlyChargeSafety.limited) {
                targetW = Number(pvOnlyChargeSafety.targetW) || 0;
                reason = pvOnlyChargeSafety.reason;
                source = targetW < 0 ? 'pv' : 'policy';
                const existingChargeCapW = Number.isFinite(Number(chargeDemandHardCapW)) && Number(chargeDemandHardCapW) >= 0
                    ? Number(chargeDemandHardCapW)
                    : Number.POSITIVE_INFINITY;
                chargeDemandHardCapW = Math.min(existingChargeCapW, Number(pvOnlyChargeSafety.allowedChargeW) || 0);
                chargeDemandHardCapReason = reason;
                if (pvOnlyChargeSafety.blocked) {
                    storagePolicyBlocked = true;
                    storagePolicyBlockReason = reason;
                }

                // Ein alter höherer Ladebefehl muss aktiv zurückgenommen werden.
                // Daher dürfen Hold-/No-Write-Pfade den korrigierten Sollwert nicht
                // verschlucken. Echte FEMS-Reglerhoheit bleibt davon unberührt.
                storageZeroNoWrite = false;
                sungrowNoWrite = false;
                pvBudgetPostVendorNoWriteHold = false;
                pvBudgetPostVendorNoWriteReason = '';
                if (sungrowHybridActive) {
                    sungrowWriteMode = targetW < 0
                        ? 'write-pv-only-tariff-cap'
                        : 'write-grid-charge-tariff-stop';
                    this._sungrowHybridLastMode = sungrowWriteMode;
                }
            }

            storageNvpBalanceDiag = {
                ...(storageNvpBalanceDiag || {}),
                targetW,
                tariffPvOnlySafetyActive: true,
                tariffPvOnlySafetyLimited: !!pvOnlyChargeSafety.limited,
                tariffPvOnlySafetyBlocked: !!pvOnlyChargeSafety.blocked,
                tariffPvOnlyRequestedChargeW: Number(pvOnlyChargeSafety.requestedChargeW) || 0,
                tariffPvOnlyAllowedChargeW: Number(pvOnlyChargeSafety.allowedChargeW) || 0,
                tariffPvOnlyCapW: Number(pvOnlyChargeSafety.pvOnlyCapW) || 0,
                tariffPvOnlyNvpDerivedCapW: Number(pvOnlyChargeSafety.nvpDerivedPvOnlyCapW) || 0,
                tariffPvOnlyValidatedFeedForwardCapW: Number(pvOnlyChargeSafety.validatedFeedForwardCapW) || 0,
                tariffPvOnlyCapSource: String(pvOnlyChargeSafety.capSource || ''),
                tariffPvOnlyBaseNvpW: Number.isFinite(Number(pvOnlyChargeSafety.baseNvpWithoutBatteryW))
                    ? Number(pvOnlyChargeSafety.baseNvpWithoutBatteryW)
                    : null,
                tariffPvOnlySignedNvpW: signedNvpForTariffSafetyW,
                tariffPvOnlyBatteryPowerW: batteryPowerForTariffSafetyW,
                tariffPvOnlyBatteryFeedbackUsed: !!pvOnlyChargeSafety.batteryFeedbackUsed,
                tariffPvOnlyBatteryBasis: tariffSafetyBatteryBasis,
                tariffPvOnlyTargetImportW: Number(pvOnlyChargeSafety.targetImportW) || 0,
                tariffPvOnlyReason: String(pvOnlyChargeSafety.reason || ''),
                mode: pvOnlyChargeSafety.limited
                    ? (pvOnlyChargeSafety.blocked ? 'tariff-pv-only-stop' : 'tariff-pv-only-cap')
                    : String((storageNvpBalanceDiag && storageNvpBalanceDiag.mode) || ''),
            };
        }

        // Nulleinspeise-Anlauf ist eine getrennte, zeitlich/energetisch begrenzte
        // Zusatzfreigabe. Sie steht NACH allen normalen PV-/Tarif-Caps, damit der
        // bewiesene Grundsollwert unverändert bleibt. Insbesondere wird diese
        // Leistung niemals in pvBudgetStorageAvailableW hineingerechnet.
        let zeroExportProbeExtraW = 0;
        let zeroExportProbeDiag = null;
        const previousWasZeroExportProbe = String(this._lastSource || '') === 'zero-export-probe';
        if (previousWasZeroExportProbe && targetW <= 0 && !feneconNoWrite && !sungrowNoWrite) {
            // Eine abgelaufene Probe darf weder über die 0-W-Firewall noch über
            // einen letzten PV-Sollwertanker verlängert werden. Nur real durch
            // den zentralen Grant gedeckte Leistung bleibt als Grundwert stehen.
            const provenChargeW = Math.min(Math.max(0, -targetW), Math.max(0, pvBudgetStorageAvailableW));
            targetW = provenChargeW > 0 ? -provenChargeW : 0;
            storageZeroNoWrite = false;
            if (source === 'zero-export-probe') source = provenChargeW > 0 ? 'pv' : 'idle';
        }
        try {
            const zeroMode = readZeroExportMode(this.adapter);
            const zoneChargeCapW = typeof soc === 'number' && soc < selfMaxSoc
                ? selfMaxChargeEff
                : (typeof soc === 'number' && lskChargeEnabledCfg && soc < lskMaxSoc ? lskMaxChargeEff : 0);
            const probeBudget = this.adapter && this.adapter._emsBudget;
            const budgetFresh = probeBudget && Number.isFinite(Number(probeBudget.ts))
                && now >= Number(probeBudget.ts) && now - Number(probeBudget.ts) <= 5000;
            const totalGrant = budgetFresh && typeof probeBudget.getTotalGrant === 'function'
                ? probeBudget.getTotalGrant({ key: 'storage', requestedW: Number.MAX_SAFE_INTEGER })
                : (budgetFresh && typeof probeBudget.grant === 'function'
                    ? probeBudget.grant({ key: 'storage', requestedW: Number.MAX_SAFE_INTEGER, pvOnly: false }) : null);
            const totalGrantW = Math.max(0, strictFiniteNumber(totalGrant && totalGrant.grantW, 0));
            const probeMaxW = Math.min(maxChargeW, zoneChargeCapW,
                storageLicenseHardLimitW > 0 ? storageLicenseHardLimitW : Number.POSITIVE_INFINITY, totalGrantW);
            const request = resolveStorageZeroExportProbeRequest({
                modeActive: zeroMode.active === true,
                writerActive: storageAuthorityEarly.writerActive === true,
                controlMode,
                noWrite: feneconNoWrite || sungrowNoWrite || (storageZeroNoWrite && storageZeroWriteStatus !== 'no-write-idle'),
                pvEnabled: cfg.pvEnabled !== false,
                policyBlocked: storagePolicyBlocked || gridChargeFinalGate.blocked || evcsProtectedChargeStop
                    || sungrowUpstreamExplicitStop || chargeDirectionStopped,
                evPriorityBlocked: evPriorityBlockStorageCharge || evcsStorageProtectedLoadUnknown,
                source,
                policySource: policySourceBeforeVendor,
                targetW,
                soc,
                socAgeMs: socAge,
                maxSoc: Math.min(hardChargeMaxSoc, soc < selfMaxSoc ? selfMaxSoc : lskMaxSoc),
                maxW: probeMaxW,
                provenPvW: pvBudgetStorageAvailableW,
                actualSignedW: battPowerW,
                actualAgeMs: battPowerAge,
                actualTrusted: battPowerTrusted,
                stepW,
            });
            const probe = requestZeroExportProbe(this.adapter, {
                key: 'storage', now, ...request, priority: 90, phaseTransition: false,
            });
            zeroExportProbeDiag = { ...probe, eligible: request.eligible, eligibilityReason: request.reason, baseW: request.baseW };
            if (request.eligible && probe && probe.active === true && probe.granted === true
                && Number(probe.validUntil) > now && Number(probe.extraW) > 0) {
                const allowedW = Math.min(request.maxW, request.nextW, Number(probe.targetW));
                zeroExportProbeExtraW = Math.max(0, Math.min(Number(probe.extraW), allowedW - request.baseW));
                if (zeroExportProbeExtraW > 0) {
                    targetW = -(request.baseW + zeroExportProbeExtraW);
                    source = 'zero-export-probe';
                    reason = `Nulleinspeisung: befristeter PV-Anlauf (+${Math.round(zeroExportProbeExtraW)} W, zentrale Freigabe)`;
                    chargeDemandHardCapW = -targetW;
                    chargeDemandHardCapReason = 'Zentrale Nulleinspeise-Testfreigabe innerhalb Geräte-/Policy-Grenzen';
                    storageZeroNoWrite = false;
                    storageZeroWriteStatus = 'write-zero-export-probe';
                    storageNvpBalanceDiag = { ...(storageNvpBalanceDiag || {}), targetW, zeroExportProbe: zeroExportProbeDiag };
                }
            }
        } catch {
            // Ein fehlender/defekter Koordinator kann nur die Probe verweigern.
            // Der bewiesene PV-Grundsollwert und der Hardware-Safety-Writer bleiben.
        }

        if (sungrowDiagPayload) {
            sungrowDiagPayload = {
                ...sungrowDiagPayload,
                reason,
                writeMode: sungrowWriteMode || sungrowDiagPayload.writeMode,
                targetW,
                nvpBalanceTargetW: storageNvpBalanceDiag && Number.isFinite(Number(storageNvpBalanceDiag.targetW))
                    ? Number(storageNvpBalanceDiag.targetW)
                    : sungrowDiagPayload.nvpBalanceTargetW,
            };
            await this._setSungrowHybridDiag(sungrowDiagPayload);
        }

        // Herstellerunabhaengige NVP-Balancing-Diagnose erst nach den
        // Herstellerprofilen und dem finalen PV-Budget-Cap schreiben, damit der
        // tatsaechlich an den Speicher gehende Sollwert sichtbar ist.
        await this._setStorageNvpBalanceDiag(storageNvpBalanceDiag);
        await this._setIfChanged('speicher.regelung.chargeDemandCapW',
            (typeof chargeDemandHardCapW === 'number' && Number.isFinite(chargeDemandHardCapW)) ? Math.round(chargeDemandHardCapW) : 0);
        await this._setIfChanged('speicher.regelung.chargeDemandCapReason', String(chargeDemandHardCapReason || ''));

        // Den finalen Speicher-Ladesollwert fuer nachgelagerte Verbraucher im
        // zentralen Budget reservieren:
        // - PV-/NVP-Laden reduziert remainingTotalW UND remainingPvW, weil die
        //   physisch belegte Ladeleistung nachfolgenden Verbrauchern weder als
        //   Gesamt- noch als PV-Budget erneut zur Verfuegung stehen darf.
        // - Tarif-/Reserve-/LSK-Netzladen reduziert nur remainingTotalW.
        // Ein durch die allgemeine 0-W-Firewall gehaltener externer Sollwert bleibt
        // physikalisch aktiv und muss deshalb im zentralen Budget weiter reserviert
        // werden. FENECON verwendet ebenfalls stets den externen, gegateten Pfad.
        try {
            const budgetRuntime = this.adapter && this.adapter._emsBudget;
            const sourceForBudget = evcsProtectionChargeFromSurplus ? 'pv' : (policySourceBeforeVendor || String(source || ''));
            const probeSource = source === 'zero-export-probe' && zeroExportProbeExtraW > 0;
            const pvSource = probeSource || isCentralPvChargeSource(source, targetW)
                || isCentralPvChargeSource(sourceForBudget, targetW);
            const gridChargeSource = isCentralGridChargeSource(sourceForBudget, targetW);
            if (!feneconNoWrite && budgetRuntime && typeof budgetRuntime.reserve === 'function' && targetW < 0 && (pvSource || gridChargeSource)) {
                const chargeW = Math.max(0, -Number(targetW));
                const actualChargeW = balanceBatteryTrusted
                    ? Math.max(0, -Number(balanceBatteryPowerW || 0))
                    : ((battPowerTrusted && typeof battPowerW === 'number' && Number.isFinite(battPowerW))
                        ? Math.max(0, -battPowerW)
                        : chargeW);
                if (pvSource) {
                    // Fuer PV-Laden exakt denselben zentralen Grant verwenden wie
                    // fuer den Schreibpfad. Prozent-Gates werden hier nicht erneut
                    // rekonstruiert.
                    const resolvedStoragePvW = Math.max(0, Number(pvBudgetStorageAvailableW) || 0);
                    pvBudgetReservedW = Math.min(chargeW, resolvedStoragePvW);
                } else {
                    totalBudgetStorageReservedW = Math.min(
                        chargeW,
                        totalBudgetStorageAvailableW > 0 ? totalBudgetStorageAvailableW : chargeW,
                    );
                }
                budgetRuntime.reserve({
                    key: 'storage',
                    app: 'storageControl',
                    label: 'Speicher',
                    priority: 150,
                    actualW: actualChargeW,
                    requestedW: chargeW,
                    reserveW: probeSource ? chargeW : (pvSource ? pvBudgetReservedW : (gridChargeSource ? totalBudgetStorageReservedW : 0)),
                    pvReserveW: pvSource ? pvBudgetReservedW : 0,
                    pvOnly: pvSource && !probeSource,
                    mode: probeSource ? 'zero-export-probe' : (pvSource ? (pvBudgetAllocationMode || 'pv') : String(sourceForBudget || 'grid-charge')),
                });
            }
        } catch {
            // Budgetdiagnose darf die sichere Speicheransteuerung nicht abbrechen.
        }

        await this._setIfChanged('speicher.regelung.pvBudgetAllocationMode', pvBudgetAllocationMode);
        await this._setIfChanged('speicher.regelung.pvBudgetRemainingBeforeStorageW', Math.round(pvBudgetRemainingBeforeStorageW));
        await this._setIfChanged('speicher.regelung.pvBudgetStorageAvailableW', Math.round(pvBudgetStorageAvailableW));
        await this._setIfChanged('speicher.regelung.pvBudgetReservedW', Math.round(pvBudgetReservedW));
        await this._setIfChanged('speicher.regelung.pvBudgetPostVendorCapW', Math.round(pvBudgetPostVendorCapW));
        await this._setIfChanged('speicher.regelung.pvBudgetPostVendorCapped', !!pvBudgetPostVendorCapped);
        await this._setIfChanged('speicher.regelung.pvBudgetPostVendorNoWriteHold', !!pvBudgetPostVendorNoWriteHold);
        await this._setIfChanged('speicher.regelung.pvBudgetPostVendorNoWriteReason', String(pvBudgetPostVendorNoWriteReason || ''));
        await this._setIfChanged('speicher.regelung.pvBudgetRuntimeRemainingW', Math.round(pvBudgetRuntimeRemainingW));
        await this._setIfChanged('speicher.regelung.pvBudgetAllocationDerivedW', Math.round(pvBudgetAllocationDerivedW));
        await this._setIfChanged('speicher.regelung.pvBudgetEvcsReservedW', Math.round(pvBudgetEvcsReservedW));
        await this._setIfChanged('speicher.regelung.pvBudgetResolution', String(pvBudgetResolution || ''));
        await this._setIfChanged('speicher.regelung.totalBudgetStorageAvailableW', Math.round(totalBudgetStorageAvailableW));
        await this._setIfChanged('speicher.regelung.totalBudgetStorageReservedW', Math.round(totalBudgetStorageReservedW));
        await this._setIfChanged('speicher.regelung.totalBudgetStorageCapped', !!totalBudgetStorageCapped);

        // Die optionale Reserve-SoC-Ausgabe erhaelt dieselbe final wirksame
        // Entlade-Untergrenze, die auch die zentrale Sicherheitslogik verwendet.
        this._effectiveReserveSocPct = clamp(
            Number.isFinite(Number(hardDischargeMinSoc)) ? Number(hardDischargeMinSoc) : reserveMin,
            0,
            100,
        );

        // ------------------------------------------------------------
        // Phase 2: Dispatcher-Diagnose-Zustände schreiben
        // ------------------------------------------------------------
        const _finalW = targetW;

        // Letzte Konsistenzpruefung: Auch nach nachgelagerten Caps/Hersteller-
        // Profilen bleibt ein echter Policy-Stopp eindeutig diagnostizierbar.
        if (!storagePolicyBlocked && Number(targetW) === 0) {
            const finalReasonLower = String(reason || '').toLowerCase();
            const finalSource = String(source || '').toLowerCase();
            if (
                ['reserve', 'policy'].includes(finalSource)
                || (finalSource === 'tarif' && /gesperrt|blockiert|warte/.test(finalReasonLower))
                || /entladen blockiert|entladung gesperrt|durch policy deaktiviert/.test(finalReasonLower)
            ) {
                storagePolicyBlocked = true;
                storagePolicyBlockReason = String(reason || 'Speicher-Entladung durch Policy gesperrt');
            }
        }
        await this._setIfChanged('speicher.regelung.policyBlocked', !!storagePolicyBlocked);
        await this._setIfChanged('speicher.regelung.policyBlockReason', storagePolicyBlocked ? String(storagePolicyBlockReason || reason || '') : '');
        await this._setIfChanged('speicher.regelung.policySource', String(storageOperatingPolicy.source || ''));

        await this._setIfChanged('speicher.regelung.requestW', Number.isFinite(Number(_reqW)) ? Math.round(Number(_reqW)) : 0);
        await this._setIfChanged('speicher.regelung.requestQuelle', String(_reqQuelle || ''));
        await this._setIfChanged('speicher.regelung.requestGrund', String(_reqGrund || ''));

        // ------------------------------------------------------------
        // Phase 5: Policy/Audit – „wer will gerade was vom Speicher?“
        // ------------------------------------------------------------
        try {
            const tvPol = (this.adapter && this.adapter._tarifVis) ? this.adapter._tarifVis : null;
			const pol = {
				ts: now,
				nvp: {
					// "ctrlW" ist der geglättete Wert (wie in der UI/Vis oft angezeigt).
					// "rawW" ist der ungeglättete NVP.
					// "usedW" ist der Wert, den wir in der Regelung bevorzugen (raw falls vorhanden).
					ctrlW: (typeof gridW === 'number' && Number.isFinite(gridW)) ? Math.round(gridW) : null,
					rawW: (typeof gridRawW === 'number' && Number.isFinite(gridRawW)) ? Math.round(gridRawW) : null,
					usedW: (typeof gridRawW === 'number' && Number.isFinite(gridRawW)) ? Math.round(gridRawW)
						: ((typeof gridW === 'number' && Number.isFinite(gridW)) ? Math.round(gridW) : null),
					ageMs: (typeof gridAge === 'number' && Number.isFinite(gridAge)) ? Math.round(gridAge) : null,
				},
				battery: {
					coupling: storageCoupling,
					powerW: (typeof battPowerW === 'number' && Number.isFinite(battPowerW)) ? Math.round(battPowerW) : null,
					ageMs: (typeof battPowerAge === 'number' && Number.isFinite(battPowerAge)) ? Math.round(battPowerAge) : null,
					dcPvPowerW: (typeof dcPvPowerW === 'number' && Number.isFinite(dcPvPowerW)) ? Math.round(dcPvPowerW) : null,
					dcPvAgeMs: (typeof dcPvPowerAge === 'number' && Number.isFinite(dcPvPowerAge)) ? Math.round(dcPvPowerAge) : null,
					invalidReason: (battPowerInvalidReason && String(battPowerInvalidReason).trim()) ? String(battPowerInvalidReason).trim() : null,
				},
				balance: storageNvpBalanceDiag ? {
					policy: String(storageNvpBalanceDiag.policy || ''),
					mode: String(storageNvpBalanceDiag.mode || ''),
					feedbackUsed: !!storageNvpBalanceDiag.feedbackUsed,
					actualBatteryW: (storageNvpBalanceDiag.actualBatteryW !== null && storageNvpBalanceDiag.actualBatteryW !== undefined && Number.isFinite(Number(storageNvpBalanceDiag.actualBatteryW)))
						? Math.round(Number(storageNvpBalanceDiag.actualBatteryW))
						: null,
					baseW: Number.isFinite(Number(storageNvpBalanceDiag.baseW)) ? Math.round(Number(storageNvpBalanceDiag.baseW)) : null,
					baseSource: String(storageNvpBalanceDiag.baseSource || ''),
					nvpW: Number.isFinite(Number(storageNvpBalanceDiag.nvpW)) ? Math.round(Number(storageNvpBalanceDiag.nvpW)) : null,
					nvpTargetW: Number.isFinite(Number(storageNvpBalanceDiag.nvpTargetW)) ? Math.round(Number(storageNvpBalanceDiag.nvpTargetW)) : null,
					nvpErrorW: Number.isFinite(Number(storageNvpBalanceDiag.nvpErrorW)) ? Math.round(Number(storageNvpBalanceDiag.nvpErrorW)) : null,
					rawTargetW: Number.isFinite(Number(storageNvpBalanceDiag.rawTargetW)) ? Math.round(Number(storageNvpBalanceDiag.rawTargetW)) : null,
					appliedCorrectionW: Number.isFinite(Number(storageNvpBalanceDiag.appliedCorrectionW)) ? Math.round(Number(storageNvpBalanceDiag.appliedCorrectionW)) : null,
					targetW: Number.isFinite(Number(storageNvpBalanceDiag.targetW)) ? Math.round(Number(storageNvpBalanceDiag.targetW)) : null,
					measurementSkewMs: Number.isFinite(Number(storageNvpBalanceDiag.measurementSkewMs)) ? Math.round(Number(storageNvpBalanceDiag.measurementSkewMs)) : null,
					holdingLastCommand: !!storageNvpBalanceDiag.holdingLastCommand,
					heldTargetW: Number.isFinite(Number(storageNvpBalanceDiag.heldTargetW)) ? Math.round(Number(storageNvpBalanceDiag.heldTargetW)) : 0,
					feedForwardAvailable: !!storageNvpBalanceDiag.feedForwardAvailable,
					feedForwardUsed: !!storageNvpBalanceDiag.feedForwardUsed,
					feedForwardTargetW: Number.isFinite(Number(storageNvpBalanceDiag.feedForwardTargetW)) ? Math.round(Number(storageNvpBalanceDiag.feedForwardTargetW)) : null,
					feedForwardExpectedActualW: Number.isFinite(Number(storageNvpBalanceDiag.feedForwardExpectedActualW)) ? Math.round(Number(storageNvpBalanceDiag.feedForwardExpectedActualW)) : null,
					feedForwardPvW: Number.isFinite(Number(storageNvpBalanceDiag.feedForwardPvW)) ? Math.round(Number(storageNvpBalanceDiag.feedForwardPvW)) : null,
					feedForwardLoadW: Number.isFinite(Number(storageNvpBalanceDiag.feedForwardLoadW)) ? Math.round(Number(storageNvpBalanceDiag.feedForwardLoadW)) : null,
					feedForwardPvSource: String(storageNvpBalanceDiag.feedForwardPvSource || ''),
					feedForwardLoadSource: String(storageNvpBalanceDiag.feedForwardLoadSource || ''),
					feedForwardReason: String(storageNvpBalanceDiag.feedForwardReason || ''),
					feedForwardMeasurementSkewMs: Number.isFinite(Number(storageNvpBalanceDiag.feedForwardMeasurementSkewMs)) ? Math.round(Number(storageNvpBalanceDiag.feedForwardMeasurementSkewMs)) : null,
					feedbackPlausibilityErrorW: Number.isFinite(Number(storageNvpBalanceDiag.feedbackPlausibilityErrorW)) ? Math.round(Number(storageNvpBalanceDiag.feedbackPlausibilityErrorW)) : null,
					feedbackRejectedByFeedForward: !!storageNvpBalanceDiag.feedbackRejectedByFeedForward,
				} : null,
                soc: (typeof soc === 'number' && Number.isFinite(soc)) ? soc : null,
                permissions: {
                    gridChargeConfigured: !!gridChargeConfigured,
                    gridChargeAllowed: (typeof gridChargeAllowed === 'boolean') ? gridChargeAllowed : null,
                    dischargeAllowed: (typeof dischargeAllowed === 'boolean') ? dischargeAllowed : null,
                },
                tarif: {
                    active: !!(tvPol && tvPol.aktiv),
                    state: (tvPol && typeof tvPol.state === 'string') ? tvPol.state : null,
                    storageWantW: (tvPol && typeof tvPol.speicherSollW === 'number') ? tvPol.speicherSollW : null,
                },
                pvForecast: (() => {
                    const pf = (this.adapter && this.adapter._pvForecast) ? this.adapter._pvForecast : null;
                    if (!pf) return null;
                    return {
                        valid: !!pf.valid,
                        ageMs: (pf.ageMs === null || pf.ageMs === undefined || !Number.isFinite(Number(pf.ageMs))) ? null : Math.round(Number(pf.ageMs)),
                        kwhNext24h: (typeof pf.kwhNext24h === 'number' && Number.isFinite(pf.kwhNext24h)) ? Number(pf.kwhNext24h) : null,
                        peakWNext24h: (typeof pf.peakWNext24h === 'number' && Number.isFinite(pf.peakWNext24h)) ? Math.round(pf.peakWNext24h) : null,
                        points: (typeof pf.points === 'number' && Number.isFinite(pf.points)) ? pf.points : null,
                    };
                })(),
                pvAwareTarifNetzladen: pvAwareTariff ? pvAwareTariff : null,
                evcs: {
                    storageAssistReqW: (typeof evcsAssistReqW === 'number' && Number.isFinite(evcsAssistReqW)) ? Math.round(evcsAssistReqW) : 0,
                    storageProtectedLoadW: Math.round(evcsStorageProtectedLoadW || 0),
                    storageProtectedWallboxes: Math.round(evcsStorageProtectedWallboxes || 0),
                    storageProtectedLoadUnknown: evcsStorageProtectedLoadUnknown,
                    storageProtectedUnknownWallboxes: evcsStorageProtectedUnknownWallboxes,
                    storageAssistRequestedLoadW: Math.round(evcsStorageAssistRequestedLoadW || 0),
                    nvpTargetOffsetW: 0,
                    protection: evcsProtectionDiag,
                },
                evPriority: evPriorityCaps ? {
                    active: !!(feneconAcMode && evPriorityCaps.active),
                    blockStorageCharge: !!evPriorityBlockStorageCharge,
                    starvedW: Math.round(evPriorityStarvedW || 0),
                    pendingW: (feneconAcMode && Number.isFinite(Number(evPriorityCaps.pendingW))) ? Math.round(Number(evPriorityCaps.pendingW)) : 0,
                    storageYieldW: (feneconAcMode && Number.isFinite(Number(evPriorityCaps.storageYieldW))) ? Math.round(Number(evPriorityCaps.storageYieldW)) : 0,
                    requestedCount: (feneconAcMode && Number.isFinite(Number(evPriorityCaps.requestedCount))) ? Math.round(Number(evPriorityCaps.requestedCount)) : 0,
                    limitedWallboxes: (feneconAcMode && Number.isFinite(Number(evPriorityCaps.limitedWallboxes))) ? Math.round(Number(evPriorityCaps.limitedWallboxes)) : 0,
                } : null,
                pvAllocation: {
                    mode: pvBudgetAllocationMode,
                    remainingBeforeStorageW: Math.round(pvBudgetRemainingBeforeStorageW || 0),
                    storageAvailableW: Math.round(pvBudgetStorageAvailableW || 0),
                    storageReservedW: Math.round(pvBudgetReservedW || 0),
                },
                fenecon: feneconHybridConfigured ? {
                    hybridMode: !!feneconHybridActive,
                    configured: !!feneconHybridConfigured,
                    farmBlocked: !!feneconHybridBlockedByFarm,
                    mode: feneconHybridCtx && feneconHybridCtx.mode ? String(feneconHybridCtx.mode) : (feneconHybridBlockedByFarm ? 'blocked-by-farm' : 'standard'),
                    writeMode: feneconWriteMode || '',
                    noWrite: !!feneconNoWrite,
                    pvW: (feneconHybridCtx && Number.isFinite(Number(feneconHybridCtx.pvW))) ? Math.round(Number(feneconHybridCtx.pvW)) : null,
                    additionalPvW: (feneconHybridCtx && Number.isFinite(Number(feneconHybridCtx.additionalPvW))) ? Math.round(Number(feneconHybridCtx.additionalPvW)) : 0,
                    thresholdW: (feneconHybridCtx && Number.isFinite(Number(feneconHybridCtx.thresholdW))) ? Math.round(Number(feneconHybridCtx.thresholdW)) : null,
                    forecastW: (feneconHybridCtx && Number.isFinite(Number(feneconHybridCtx.forecastW))) ? Math.round(Number(feneconHybridCtx.forecastW)) : 0,
                    dayNoWrite: !!(feneconHybridCtx && feneconHybridCtx.dayNoWriteEnabled),
                    dayOrPvActive: !!(feneconHybridCtx && feneconHybridCtx.dayOrPvActive),
                    clockDayActive: !!(feneconHybridCtx && feneconHybridCtx.clockDayActive),
                    assistEnabled: !!(feneconHybridCtx && feneconHybridCtx.assistEnabled),
                    assistActive: !!(feneconHybridCtx && feneconHybridCtx.assistActive),
                    assistImportThresholdW: (feneconHybridCtx && Number.isFinite(Number(feneconHybridCtx.assistImportThresholdW))) ? Math.round(Number(feneconHybridCtx.assistImportThresholdW)) : null,
                    reason: feneconHybridCtx && feneconHybridCtx.reason ? String(feneconHybridCtx.reason) : '',
                    watchdogSec: 1,
                    setGridActivePowerUsed: false,
                } : {
                    hybridMode: false,
                    configured: false,
                    farmBlocked: false,
                    mode: 'standard',
                    setGridActivePowerUsed: false,
                },
                limits: {
                    importLimitW: (typeof importLimitW === 'number' && Number.isFinite(importLimitW)) ? Math.round(importLimitW) : null,
                    importHeadroomW: (typeof importHeadroomEffW === 'number' && Number.isFinite(importHeadroomEffW)) ? Math.round(importHeadroomEffW) : null,
                },
                appPolicy: {
                    mode: multiUsePolicyActive ? 'multiuse' : 'eigenverbrauch',
                    storageControlActive: !!cfgEnabled,
                    autoTariffActive: !!autoTarifEnabled,
                    multiUseActive: !!multiUsePolicyActive,
                    inactiveMultiUseZonesIgnored: !!ignoreStaleMultiUsePolicy,
                    selfSocPolicy: storageOperatingPolicy,
                    blocked: !!storagePolicyBlocked,
                    blockReason: storagePolicyBlocked ? String(storagePolicyBlockReason || reason || '') : '',
                    policySource: String(storageOperatingPolicy.source || ''),
                    pureSelfConsumptionWithoutMultiUse: !multiUsePolicyActive,
                    storageFarmDistribution: !!hasFarmSetpoints,
                    storageFarmAutoStart: false,
                },
                reserve: {
                    active: !!reserveActive,
                    chargeWanted: !!reserveChargeWanted,
                    minSocPct: reserveMin,
                    targetSocPct: reserveTarget,
                },
                decision: {
                    targetW: (typeof targetW === 'number' && Number.isFinite(targetW)) ? Math.round(targetW) : 0,
                    source: String(source || ''),
                    reason: String(reason || ''),
                },
            };
            await this._setIfChanged('speicher.regelung.tarifState', (pol.tarif && typeof pol.tarif.state === 'string') ? pol.tarif.state : '');
            await this._setIfChanged('speicher.regelung.tarifPvBlock', !!(pvAwareTariff && pvAwareTariff.blocked));
            await this._setIfChanged('speicher.regelung.tarifPvBlockGrund', (pvAwareTariff && typeof pvAwareTariff.reason === 'string') ? pvAwareTariff.reason : '');
            await this._setIfChanged('speicher.regelung.tarifPvCapSocPct', (pvAwareTariff && typeof pvAwareTariff.capSocPct === 'number' && Number.isFinite(pvAwareTariff.capSocPct)) ? Number(pvAwareTariff.capSocPct) : null);
            await this._setIfChanged('speicher.regelung.tarifPvHeadroomSocPct', (pvAwareTariff && typeof pvAwareTariff.headroomSocPct === 'number' && Number.isFinite(pvAwareTariff.headroomSocPct)) ? Number(pvAwareTariff.headroomSocPct) : null);
            await this._setIfChanged('speicher.regelung.tarifPvHeadroomKWh', (pvAwareTariff && typeof pvAwareTariff.pvStorableKWh === 'number' && Number.isFinite(pvAwareTariff.pvStorableKWh)) ? Number(pvAwareTariff.pvStorableKWh) : null);
            await this._setIfChanged('speicher.regelung.policyJson', JSON.stringify(pol));
        } catch {
            // ignore
        }

        const _diag = {
            ts: now,
            reqW: Number.isFinite(Number(_reqW)) ? Math.round(Number(_reqW)) : 0,
            clampW: Number.isFinite(Number(_clampW)) ? Math.round(Number(_clampW)) : 0,
            stepW: Number.isFinite(Number(_stepW)) ? Math.round(Number(_stepW)) : 0,
            antiW: Number.isFinite(Number(_antiW)) ? Math.round(Number(_antiW)) : 0,
            rampW: Number.isFinite(Number(_rampW)) ? Math.round(Number(_rampW)) : 0,
            finalW: Number.isFinite(Number(_finalW)) ? Math.round(Number(_finalW)) : 0,
            reqSrc: String(_reqQuelle || ''),
            reqReason: String(_reqGrund || ''),
            src: String(source || ''),
            reason: String(reason || ''),
        };
        await this._setIfChanged('speicher.regelung.dispatcherJson', JSON.stringify(_diag));

        // Der asynchrone Feedback-Anker darf erst nach einem erfolgreichen
        // Hardware-Write wirksam werden. Hier wird deshalb nur der fachliche
        // Kandidat aus der finalen NVP-Entscheidung vorbereitet; _applyTargetW
        // uebernimmt ihn mit dem tatsaechlich akzeptierten Einzel-/Farm-Sollwert.
        this._pendingAsyncBalanceCommand = null;
        if (
            storageNvpBalanceDiag
            && storageNvpBalanceDiag.active === true
            && storageNvpBalanceDiag.feedbackUsed === true
            && isStorageBalanceSource(source)
            && Number.isFinite(Number(storageNvpBalanceDiag.actualBatteryW))
            && Number.isFinite(Number(storageNvpBalanceDiag.nvpW))
            && Number.isFinite(Number(storageNvpBalanceDiag.batterySampleTs))
            && Number(storageNvpBalanceDiag.batterySampleTs) > 0
            && String(storageNvpBalanceDiag.batteryFeedbackKey || '').trim()
        ) {
            this._pendingAsyncBalanceCommand = {
                feedbackKey: String(storageNvpBalanceDiag.batteryFeedbackKey || '').trim(),
                sampleTs: Number(storageNvpBalanceDiag.batterySampleTs),
                sampleW: Number.isFinite(Number(storageNvpBalanceDiag.measuredBatteryW))
                    ? Number(storageNvpBalanceDiag.measuredBatteryW)
                    : Number(storageNvpBalanceDiag.actualBatteryW),
                controlKey: String(storageNvpBalanceDiag.balanceControlKey || storageNvpBalanceDiag.policy || source || '').trim(),
                baseActualW: Number(storageNvpBalanceDiag.actualBatteryW),
                nvpW: Number(storageNvpBalanceDiag.nvpW),
                nvpTargetW: Number.isFinite(Number(storageNvpBalanceDiag.nvpTargetW))
                    ? Number(storageNvpBalanceDiag.nvpTargetW)
                    : 0,
                requestedTargetW: Number.isFinite(Number(targetW)) ? Number(targetW) : 0,
                source: String(source || ''),
                reason: String(reason || ''),
            };
        }

        if (feneconHybridActive) {
            await this._setFeneconHybridDiag({
                ...(feneconHybridCtx || {}),
                active: true,
                mode: String((feneconHybridCtx && (feneconHybridCtx.technicalMode || feneconHybridCtx.mode)) || feneconControlResolution.mode || ''),
                reason,
                writeMode: feneconWriteMode || (feneconNoWrite ? 'no-write-fems-self' : 'write-eos-target'),
                targetW,
                nvpW: strictFiniteNumber(gridRawW, strictFiniteNumber(gridW, null)),
                noWrite: feneconNoWrite || storageZeroNoWrite,
                authority: feneconZeroOverride
                    ? 'eos-zero-override'
                    : String((feneconHybridCtx && feneconHybridCtx.authority) || ''),
                handoverZeroRequired: !!(feneconHybridCtx && feneconHybridCtx.handoverZeroRequired),
            });
        }

        // RC39 P0: Ein herstellerspezifischer No-Write-Modus darf die finale
        // Safety-Firewall niemals umgehen. Unter normaler, gueltiger FEMS-/
        // Sungrow-Eigenregelung bleibt No-Write erhalten. Sobald der zentrale
        // SafetyEnvelope jedoch gesperrt ist oder eine aktive §14a-Begrenzung
        // vorliegt, uebernimmt EOS kontrolliert den Writer. Bei einer Sperre
        // wird exakt 0 W geschrieben; bei einem positiven §14a-Cap wird der
        // vorhandene Zielwert in _applyTargetW erneut live geklemmt.
        if (
            (feneconNoWrite || sungrowNoWrite || storageZeroNoWrite)
            && this.adapter
            && (this.adapter._nwSafetyEnvelopeRequired === true || this.adapter._emsSafetyCycle || this.adapter.emsEngine)
        ) {
            let finalNoWriteEnvelope = null;
            try {
                finalNoWriteEnvelope = liveSafetyEnvelope(this.adapter, this.dp, {
                    now: Date.now(),
                    generation: this.adapter?._emsSafetyCycle?.generation,
                });
            } catch (error) {
                finalNoWriteEnvelope = invalidateSafetyEnvelope(this.adapter, `storage-no-write-safety-build-failed:${String(error && error.message || error)}`, {
                    generation: this.adapter?._emsSafetyCycle?.generation,
                    now: Date.now(),
                    emergencyStop: true,
                });
            }
            const safetyBlocked = !finalNoWriteEnvelope
                || finalNoWriteEnvelope.valid !== true
                || finalNoWriteEnvelope.forceZero === true
                || finalNoWriteEnvelope.emergencyStop === true;
            const para14aTakeover = !!(
                finalNoWriteEnvelope
                && finalNoWriteEnvelope.para14a
                && finalNoWriteEnvelope.para14a.enabled === true
                && finalNoWriteEnvelope.para14a.active === true
            );
            if (safetyBlocked || para14aTakeover) {
                const takeoverReason = safetyBlocked
                    ? String(finalNoWriteEnvelope && finalNoWriteEnvelope.invalidReason || 'storage-no-write-safety-stop')
                    : '§14a aktiv: EOS uebernimmt die begrenzte Speicheransteuerung';
                if (safetyBlocked) targetW = 0;
                reason = `${String(reason || 'Speicherregelung')} | ${takeoverReason}`;
                source = safetyBlocked ? 'safety' : (String(source || 'para14a') || 'para14a');
                feneconNoWrite = false;
                sungrowNoWrite = false;
                storageZeroNoWrite = false;
                if (feneconHybridActive) {
                    feneconZeroOverride = safetyBlocked;
                    feneconWriteMode = safetyBlocked
                        ? 'write-safety-zero-override'
                        : 'write-eos-para14a-override';
                }
                if (sungrowHybridActive) {
                    sungrowWriteMode = safetyBlocked
                        ? 'write-safety-zero-override'
                        : 'write-eos-para14a-override';
                }
                storageZeroWriteStatus = safetyBlocked
                    ? 'write-safety-zero-override'
                    : 'write-eos-para14a-override';
                storageZeroWriteReason = takeoverReason;
                if (feneconHybridActive) {
                    await this._setFeneconHybridDiag({
                        ...(feneconHybridCtx || {}),
                        active: true,
                        mode: String((feneconHybridCtx && (feneconHybridCtx.technicalMode || feneconHybridCtx.mode)) || feneconControlResolution.mode || ''),
                        reason,
                        writeMode: feneconWriteMode,
                        targetW,
                        nvpW: strictFiniteNumber(gridRawW, strictFiniteNumber(gridW, null)),
                        noWrite: false,
                        authority: safetyBlocked ? 'eos-zero-override' : 'nexowatt',
                        handoverZeroRequired: false,
                    });
                }
            }
        }

        // RC42 Shadow-only: Auch waehrend echter FEMS-Reglerhoheit wird die
        // vereinfachte NVP-Strategie parallel berechnet. Die Methode schreibt
        // ausschliesslich Diagnose-States und kann den No-Write-Vertrag nicht
        // aufheben oder einen Hardwarebefehl erzeugen.
        if (feneconHybridActive && feneconNoWrite) {
            await this._updateFeneconNvpShadow({
                cfg,
                storageAuthority: storageAuthorityEarly,
                feneconHybridCtx,
                targetW,
                source,
                reason,
                currentAuthority: feneconZeroOverride
                    ? 'eos-zero-override'
                    : String((feneconHybridCtx && feneconHybridCtx.authority) || this._feneconHybridAuthority || ''),
                commandFamily: feneconNoWrite
                    ? 'no-write-fems-self'
                    : (feneconWriteMode || 'pending-eos-write'),
                nvpW: strictFiniteNumber(gridRawW, strictFiniteNumber(gridW, null)),
            });
        }

        // Zwischen Berechnung und Schreiben können asynchrone Diagnosezugriffe
        // liegen. Identität, Messbasis und aktuelle Freigabe nochmals prüfen:
        // Konfigurations-Aus oder zentraler Widerruf beendet auch eine Lease,
        // deren ursprünglicher Zeitstempel noch nicht abgelaufen wäre.
        let zeroExportGrantStillValid = false;
        if (source === 'zero-export-probe') {
            try {
                zeroExportGrantStillValid = Number(zeroExportProbeDiag && zeroExportProbeDiag.validUntil) > Date.now()
                    && isZeroExportGrantValid(this.adapter, 'storage', zeroExportProbeDiag.leaseId, Date.now());
            } catch { /* Ohne aktuelle Bestätigung wird nur der bewiesene Grundwert geschrieben. */ }
        }
        if (source === 'zero-export-probe' && !zeroExportGrantStillValid) {
            targetW = -Math.max(0, -targetW - zeroExportProbeExtraW);
            zeroExportProbeExtraW = 0;
            source = targetW < 0 ? 'pv' : 'idle';
            reason = 'Nulleinspeise-Testfreigabe vor Hardwarezugriff nicht mehr gültig';
            storageZeroNoWrite = false;
        }
        if (feneconNoWrite || sungrowNoWrite || storageZeroNoWrite) {
            this._pendingAsyncBalanceCommand = null;
            const noWriteStatus = feneconNoWrite
                ? `fenecon:${feneconWriteMode || 'no-write-fems-self'}`
                : (storageZeroWriteStatus || (sungrowNoWrite ? 'sungrow-hybrid:no-write' : 'storage:no-write'));
            await this._setHoldNoWriteTargetDiag(targetW, reason, source, noWriteStatus);
        } else {
            await this._applyTargetW(targetW, reason, source, { evcsAssistReqW, evcsProtectedLoadUnknown: evcsStorageProtectedLoadUnknown });
            if (feneconHybridActive) this._feneconHybridWasExternal = true;
        }

        // Diagnose: Grenzen
        // (0 = unbegrenzt)
        await this._setIfChanged('speicher.regelung.maxChargeW', (maxChargeLimitW_cfg > 0) ? Math.round(maxChargeLimitW_cfg) : 0);
        await this._setIfChanged('speicher.regelung.maxDischargeW', (maxDischargeLimitW_cfg > 0) ? Math.round(maxDischargeLimitW_cfg) : 0);
        await this._setIfChanged('speicher.regelung.stepW', Math.round(stepW));
        await this._setIfChanged('speicher.regelung.maxDeltaWPerTick', Math.round(maxDelta));
        await this._setIfChanged('speicher.regelung.pvSchwelleW', Math.round(Math.max(0, num(cfg.pvExportThresholdW, 200))));
    }

    /**
     */
    /**
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    /**
     * NVP-Fuehrungswert fuer den schnellen Eigenverbrauchsregler.
     *
     * Seit RC20 ist der frische RAW-NVP fuer den Hardware-Sollwert autoritativ.
     * Die bisherige Mehrsekunden-Glättung wird weiter berechnet, aber nur noch fuer
     * Anzeige und Diagnose verwendet. Stabilitaet entsteht durch eine kleine
     * Messtoleranz um die Zielmitte, die asynchrone Batterie-Ankerlogik sowie die
     * nachgelagerten Leistungs-/SoC-/Anti-Export-Grenzen - nicht durch einen
     * verzoegerten NVP-Fuehrungswert.
     */
    _buildSelfNvpControlSignal(rawOrFilteredW, nowMs, cfg = {}, targetW = 50, deadbandW = 50) {
        const raw = Number(rawOrFilteredW);
        const now = Number(nowMs) || Date.now();
        const fastServoActive = cfg.selfNvpFastServoEnabled !== false;
        const smoothingEnabled = cfg.selfNvpSmoothingEnabled !== false;
        const filterSec = clamp(num(cfg.selfNvpSmoothingSec, 8), 0, 120);
        const rawGuardW = Math.max(50, num(cfg.selfNvpRawGuardW, Math.max(100, Number(deadbandW) || 50)));
        let filtered = Number(this._selfNvpFilteredW);
        let mode = 'raw';

        if (!Number.isFinite(raw)) {
            this._selfNvpFilteredW = null;
            this._selfNvpLastTs = 0;
            return {
                rawW: null,
                filteredW: null,
                controlW: null,
                mode: 'missing',
                smoothingEnabled: false,
                fastServoActive,
                filterSec,
                rawGuardW,
            };
        }

        if (!smoothingEnabled || filterSec <= 0 || !Number.isFinite(filtered) || !this._selfNvpLastTs) {
            filtered = raw;
            mode = smoothingEnabled && filterSec > 0 ? 'init' : 'raw';
        } else {
            const dtSec = clamp((now - Number(this._selfNvpLastTs || now)) / 1000, 0.1, 60);
            const alpha = clamp(dtSec / (filterSec + dtSec), 0.02, 1);
            filtered = filtered + (raw - filtered) * alpha;
            mode = 'filtered';
        }

        this._selfNvpFilteredW = filtered;
        this._selfNvpLastTs = now;

        // Schnellregler: Jeder frische NVP-Wert wird unmittelbar zur Zielmitte
        // verarbeitet. Der alte RAW-Guard bleibt nur fuer einen explizit deaktivierten
        // Schnellregler als rueckwaertskompatibler Legacy-Pfad erhalten.
        const upperGuard = Number(targetW) + rawGuardW;
        const lowerGuard = Number(targetW) - rawGuardW;
        let control = raw;
        if (fastServoActive) {
            mode = 'raw-fast-servo';
        } else {
            control = filtered;
            if (raw > upperGuard) {
                control = Math.max(filtered, raw);
                mode = 'raw-import-guard';
            } else if (raw < lowerGuard) {
                control = Math.min(filtered, raw);
                mode = 'raw-export-guard';
            }
        }

        return {
            rawW: raw,
            filteredW: filtered,
            controlW: control,
            mode,
            smoothingEnabled,
            fastServoActive,
            filterSec,
            rawGuardW,
        };
    }

    /**
     * Istleistungsbasis, auch wenn Batterie- und NVP-Telemetrie asynchron kommen.
     *
     * Hintergrund:
     * Viele Wechselrichter/Adapter aktualisieren die Batterie-Istleistung nur alle
     * 10 bis 30 Sekunden, waehrend der NVP jede Sekunde kommt. Die alte Logik hat
     * den Batterie-Istwert bei zu grossem Zeitversatz komplett verworfen. Danach
     * wurde nur noch die kleine aktuelle NVP-Differenz geschrieben, wodurch Soll-
     * werte z. B. von 9 kW auf 300 W und im naechsten Messzyklus wieder auf mehrere
     * kW sprangen.
     *
     * Sicherheitsmodell:
     * - Ein echter, nicht auf einen Steuer-DP gemappter Istwert wird begrenzt
     *   gehalten (`holdAgeMs`).
     * - Ein nach diesem Messwert erfolgreich geschriebener Sollwert darf NICHT als
     *   neue Batterie-Istleistung in den Regler zurueckgefuehrt werden. Andernfalls
     *   wuerde derselbe NVP-Fehler in jedem EMS-Tick erneut addiert.
     * - Solange der Messzeitstempel gleich bleibt, bleibt auch der Messanker gleich.
     *   Aendert sich der NVP, entsteht ein neuer absoluter Sollwert aus demselben
     *   Messanker plus der aktuellen NVP-Abweichung – keine Sollwert-Rueckkopplung.
     * - Ohne jemals gesehenen gueltigen Istwert wird kein alter Sollwert als
     *   Batterie-Istleistung verwendet. Dann bleibt der sichere NVP-Fallback aktiv.
     * - Ein Mapping-/Quellenwechsel verwirft den Puffer sofort.
     */
    _resolveFeneconDirectNvpFeedback(ctx = {}) {
        const finite = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
        const nowMs = finite(ctx.nowMs) ? Number(ctx.nowMs) : Date.now();
        const freshAgeMs = Math.max(250, finite(ctx.freshAgeMs) ? Number(ctx.freshAgeMs) : 8000);
        const holdAgeMs = Math.max(freshAgeMs, finite(ctx.holdAgeMs) ? Number(ctx.holdAgeMs) : 45000);
        if (!this.dp || typeof this.dp.getEntry !== 'function') return null;

        const feedback = (key, valueW, source, sampleTs = 0, ageMs = null, objectId = '') => {
            if (!finite(valueW)) return null;
            const ts = finite(sampleTs) ? Math.max(0, Number(sampleTs)) : 0;
            const age = finite(ageMs) ? Math.max(0, Number(ageMs)) : (ts > 0 ? Math.max(0, nowMs - ts) : 0);
            if (age > holdAgeMs) return null;
            return {
                usable: true,
                feedbackW: Number(valueW),
                measuredW: Number(valueW),
                measuredAgeMs: age,
                sampleAgeMs: age,
                sampleTs: ts,
                sampleKey: `${source}:${String(objectId || key)}@${Math.round(ts || nowMs)}`,
                source,
                held: age > freshAgeMs,
                predicted: false,
                predictionDeltaW: 0,
                predictionSuppressed: true,
                sampleUpdated: false,
                holdAgeMs,
                freshAgeMs,
                maxPredictionDeltaW: 0,
                objectId: String(objectId || key),
                key: `fenecon-direct|${source}|${String(objectId || key)}`,
                sampleIntervalMs: null,
                sampleCadenceMs: null,
            };
        };

        const read = (key, source) => {
            const entry = this.dp.getEntry(key);
            if (!entry) return null;
            const valueW = typeof this.dp.getNumber === 'function' ? this.dp.getNumber(key, null) : null;
            const ageMs = typeof this.dp.getAgeMs === 'function' ? this.dp.getAgeMs(key) : null;
            let sampleTs = Number(entry && entry.ts) || 0;
            try {
                if (typeof this.dp.getMeasurementTimestampMs === 'function') {
                    const measuredTs = Number(this.dp.getMeasurementTimestampMs(key));
                    if (Number.isFinite(measuredTs) && measuredTs > 0) sampleTs = measuredTs;
                }
            } catch {
                // Entry timestamp remains the compatibility fallback.
            }
            return feedback(key, valueW, source, sampleTs, ageMs, entry.objectId || key);
        };

        // Register 706 / SetActivePowerEquals-Readback ist die beste Abbildung der
        // aktuell von NexoWatt beeinflussbaren Leistung. Die physische ESS-Leistung
        // kann bei DC-/Hybridsystemen gleichzeitig interne PV-Beladung enthalten.
        const actualSetpoint = read('st.feneconActualSetpointW', 'fenecon-direct-setpoint-readback');
        if (actualSetpoint) return actualSetpoint;

        const signedSetpoint = read('st.targetPowerW', 'fenecon-direct-signed-readback');
        if (signedSetpoint) return signedSetpoint;

        const chargeEntry = this.dp.getEntry('st.targetChargePowerW');
        const dischargeEntry = this.dp.getEntry('st.targetDischargePowerW');
        if (chargeEntry || dischargeEntry) {
            const chargeW = chargeEntry && typeof this.dp.getNumber === 'function'
                ? Math.max(0, Number(this.dp.getNumber('st.targetChargePowerW', 0)) || 0)
                : 0;
            const dischargeW = dischargeEntry && typeof this.dp.getNumber === 'function'
                ? Math.max(0, Number(this.dp.getNumber('st.targetDischargePowerW', 0)) || 0)
                : 0;
            const chargeAge = chargeEntry && typeof this.dp.getAgeMs === 'function' ? this.dp.getAgeMs('st.targetChargePowerW') : null;
            const dischargeAge = dischargeEntry && typeof this.dp.getAgeMs === 'function' ? this.dp.getAgeMs('st.targetDischargePowerW') : null;
            const ages = [chargeAge, dischargeAge].filter((value) => finite(value)).map(Number);
            const ageMs = ages.length ? Math.min(...ages) : 0;
            const sampleTs = Math.max(Number(chargeEntry && chargeEntry.ts) || 0, Number(dischargeEntry && dischargeEntry.ts) || 0);
            const objectId = [chargeEntry && chargeEntry.objectId, dischargeEntry && dischargeEntry.objectId].filter(Boolean).join(' | ');
            const splitSetpoint = feedback(
                'st.targetChargePowerW|st.targetDischargePowerW',
                dischargeW - chargeW,
                'fenecon-direct-split-readback',
                sampleTs,
                ageMs,
                objectId,
            );
            if (splitSetpoint) return splitSetpoint;
        }

        const lastAcceptedW = Number.isFinite(Number(this._lastTargetW)) ? Number(this._lastTargetW) : null;
        const lastAcceptedTs = Number.isFinite(Number(this._lastTargetWriteMs)) ? Math.max(0, Number(this._lastTargetWriteMs)) : 0;
        if (lastAcceptedW !== null && lastAcceptedTs > 0) {
            const accepted = feedback(
                'speicher.regelung.commandAcceptedTargetW',
                lastAcceptedW,
                'fenecon-direct-last-accepted',
                lastAcceptedTs,
                Math.max(0, nowMs - lastAcceptedTs),
                'speicher.regelung.commandAcceptedTargetW',
            );
            if (accepted) return accepted;
        }

        // Kaltstart ohne verwertbares Readback: Der erste NVP-Fehler wird von 0 W
        // aus korrigiert. Das ist sicherer als interne DC-PV-Leistung als externen
        // Stellwert zu interpretieren.
        return feedback(
            'fenecon-direct-zero-anchor',
            0,
            'fenecon-direct-zero-anchor',
            nowMs,
            0,
            'fenecon-direct-zero-anchor',
        );
    }

    _resolveBatteryBalanceFeedback(ctx = {}) {
        const finite = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
        const now = finite(ctx.nowMs) ? Number(ctx.nowMs) : Date.now();
        const objectId = String(ctx.objectId || '').trim();
        const source = String(ctx.source || 'single-storage').trim() || 'single-storage';
        const key = `${source}|${objectId}`;
        const mappingTrusted = ctx.mappingTrusted === true;
        const measuredW = finite(ctx.measuredW) ? Number(ctx.measuredW) : null;
        const measuredAgeMs = finite(ctx.measuredAgeMs) ? Math.max(0, Number(ctx.measuredAgeMs)) : null;
        const measuredSampleTs = finite(ctx.measuredSampleTs) ? Math.max(0, Number(ctx.measuredSampleTs)) : null;
        const measuredSampleKey = String(ctx.measuredSampleKey || '').trim();
        const freshAgeMs = Math.max(250, finite(ctx.freshAgeMs) ? Number(ctx.freshAgeMs) : 8000);
        const holdAgeMs = Math.max(freshAgeMs, finite(ctx.holdAgeMs) ? Number(ctx.holdAgeMs) : 45000);
        // Nur aus Kompatibilitaetsgruenden weiter im Rueckgabeobjekt enthalten.
        // Seit 0.8.130 ist die Sollwertprognose bewusst deaktiviert, weil sie einen
        // unveraenderten Batterie-Messwert zu einem Sollwert-Integrator gemacht hat.
        const legacyPredictionLimitW = Math.max(0, finite(ctx.maxPredictionDeltaW) ? Number(ctx.maxPredictionDeltaW) : 2000);
        let sampleUpdated = false;

        const resetCache = () => {
            this._batteryBalanceFeedback = {
                key,
                objectId,
                source,
                measuredW: null,
                sampleTs: 0,
                sampleKey: '',
                previousSampleTs: 0,
                sampleIntervalMs: null,
                sampleCadenceMs: null,
            };
        };

        const cache = (this._batteryBalanceFeedback && typeof this._batteryBalanceFeedback === 'object')
            ? this._batteryBalanceFeedback
            : null;

        // Ein anderer Mess-DP oder ein Wechsel Einzel-Speicher <-> Farm darf nie
        // den alten Istwert als Basis weiterverwenden.
        if (!cache || String(cache.key || '') !== key) {
            resetCache();
        }

        // Ein erkannter Mapping-Fehler (Ist-DP zeigt auf Setpoint/ctrl) loescht den
        // Puffer sofort. Nur ein voruebergehend alter/fehlender Messwert darf gehalten
        // werden, niemals ein fachlich ungueltiger Datenpunkt.
        if (!mappingTrusted) {
            resetCache();
            return {
                usable: false,
                feedbackW: null,
                measuredW,
                measuredAgeMs,
                sampleAgeMs: null,
                sampleTs: 0,
                sampleKey: '',
                source: 'invalid-mapping',
                held: false,
                predicted: false,
                predictionDeltaW: 0,
                predictionSuppressed: true,
                sampleUpdated: false,
                holdAgeMs,
                freshAgeMs,
                maxPredictionDeltaW: legacyPredictionLimitW,
                objectId,
                key,
                sampleIntervalMs: null,
                sampleCadenceMs: null,
            };
        }

        if (measuredW !== null && (measuredAgeMs === null || measuredAgeMs <= holdAgeMs)) {
            // Der originale ioBroker-Messzeitstempel ist die autoritative Probe.
            // `now - age` bleibt nur ein Kompatibilitaetsfallback fuer alte Registry-
            // Implementierungen; kleine Rundungsdifferenzen duerfen dabei keine neue
            // Probe vortaeuschen.
            const sampleTs = measuredSampleTs !== null && measuredSampleTs > 0
                ? measuredSampleTs
                : (measuredAgeMs === null ? now : Math.max(0, now - measuredAgeMs));
            const incomingSampleKey = measuredSampleKey || `${key}@${Math.round(sampleTs)}:${Math.round(measuredW * 1000) / 1000}`;
            const current = this._batteryBalanceFeedback;
            const currentTs = finite(current && current.sampleTs) ? Number(current.sampleTs) : 0;
            const currentW = finite(current && current.measuredW) ? Number(current.measuredW) : null;
            const currentSampleKey = String(current && current.sampleKey || '');
            const timestampAdvanced = !currentTs || sampleTs > currentTs + 2;
            const timestampEquivalent = currentTs > 0 && Math.abs(sampleTs - currentTs) <= 2;
            const explicitKeyChanged = !!(measuredSampleKey && currentSampleKey && incomingSampleKey !== currentSampleKey);
            const valueChangedAtSameSample = timestampEquivalent && currentW !== measuredW;

            // Gleicher Zeitstempel mit geaendertem Wert kommt bei einigen Alias-/
            // Adapterpfaden vor. Auch dann aktualisieren wir den Messwert. Ein rein
            // aus dem Alter rekonstruierter Zeitstempel darf dagegen nicht sekündlich
            // einen neuen Messanker erzeugen.
            if (!currentTs || timestampAdvanced || explicitKeyChanged || valueChangedAtSameSample) {
                const previousSampleTs = currentTs > 0 ? currentTs : 0;
                const sampleIntervalMs = previousSampleTs > 0 && sampleTs > previousSampleTs
                    ? sampleTs - previousSampleTs
                    : null;
                const previousCadenceMs = finite(current && current.sampleCadenceMs)
                    ? Math.max(0, Number(current.sampleCadenceMs))
                    : null;
                const nextCadenceMs = sampleIntervalMs !== null && sampleIntervalMs >= 250 && sampleIntervalMs <= 300000
                    ? (previousCadenceMs === null
                        ? sampleIntervalMs
                        : Math.round((previousCadenceMs * 0.7) + (sampleIntervalMs * 0.3)))
                    : previousCadenceMs;
                this._batteryBalanceFeedback = {
                    key,
                    objectId,
                    source,
                    measuredW,
                    sampleTs,
                    sampleKey: incomingSampleKey,
                    previousSampleTs,
                    sampleIntervalMs,
                    sampleCadenceMs: nextCadenceMs,
                };
                sampleUpdated = true;
            }
        }

        const resolved = this._batteryBalanceFeedback;
        const sampleW = finite(resolved && resolved.measuredW) ? Number(resolved.measuredW) : null;
        const sampleTs = finite(resolved && resolved.sampleTs) ? Number(resolved.sampleTs) : 0;
        const sampleAgeMs = sampleTs > 0 ? Math.max(0, now - sampleTs) : null;
        const sampleUsable = sampleW !== null && sampleAgeMs !== null && sampleAgeMs <= holdAgeMs;

        if (!sampleUsable) {
            return {
                usable: false,
                feedbackW: null,
                measuredW,
                measuredAgeMs,
                sampleAgeMs,
                sampleTs,
                sampleKey: String(resolved && resolved.sampleKey || ''),
                source: sampleW === null ? 'missing' : 'expired',
                held: false,
                predicted: false,
                predictionDeltaW: 0,
                predictionSuppressed: true,
                sampleUpdated,
                holdAgeMs,
                freshAgeMs,
                maxPredictionDeltaW: legacyPredictionLimitW,
                objectId,
                key,
                sampleIntervalMs: finite(resolved && resolved.sampleIntervalMs)
                    ? Math.max(0, Number(resolved.sampleIntervalMs))
                    : null,
                sampleCadenceMs: finite(resolved && resolved.sampleCadenceMs)
                    ? Math.max(0, Number(resolved.sampleCadenceMs))
                    : null,
            };
        }

        const held = sampleAgeMs > freshAgeMs;
        const feedbackW = sampleW;
        const predicted = false;
        const predictionDeltaW = 0;
        const feedbackSource = held ? 'battery-held-anchor' : 'battery-live-anchor';

        return {
            usable: true,
            feedbackW,
            measuredW: sampleW,
            measuredAgeMs,
            sampleAgeMs,
            sampleTs,
            sampleKey: String(resolved && resolved.sampleKey || ''),
            source: feedbackSource,
            held,
            predicted,
            predictionDeltaW,
            predictionSuppressed: true,
            sampleUpdated,
            holdAgeMs,
            freshAgeMs,
            maxPredictionDeltaW: legacyPredictionLimitW,
            objectId,
            key,
            sampleIntervalMs: finite(resolved && resolved.sampleIntervalMs)
                ? Math.max(0, Number(resolved.sampleIntervalMs))
                : null,
            sampleCadenceMs: finite(resolved && resolved.sampleCadenceMs)
                ? Math.max(0, Number(resolved.sampleCadenceMs))
                : null,
        };
    }

    /**
     * PV-Erzeugung und direkt gemessenem Gebaeudeverbrauch. Dieser Wert ist nur
     * eine unabhaengige Ersatz-/Plausibilitaetsgroesse fuer den NVP-Regelkreis.
     *
     * Wichtig gegen Regel-Loops:
     * - Die normale Regelgleichung bleibt Batterie-Ist + NVP-Differenz.
     * - PV wird dort NICHT zusaetzlich addiert, weil sie im NVP bereits enthalten ist.
     * - Fuer Feed-forward ist nur ein direkt gemappter Verbrauchswert erlaubt.
     *   Ein aus PV + NVP + Speicher abgeleiteter Gebaeudeverbrauch wuerde den
     *   Ausgang des Regelkreises wieder in seinen Eingang fuehren.
     * - Bei aktivem EVCS-Speicherschutz wird Feed-forward nicht verwendet, weil
     *   je nach Zaehlerkonzept nicht sicher erkennbar ist, ob der direkte Last-DP
     *   die Wallbox bereits enthaelt. Der NVP-Regelkreis bleibt dann fuehrend.
     */
    _buildIndependentPvLoadFeedForward(ctx = {}) {
        const finite = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
        const now = finite(ctx.nowMs) ? Number(ctx.nowMs) : Date.now();
        const staleMs = Math.max(1000, finite(ctx.staleMs) ? Number(ctx.staleMs) : 15000);
        const maxSkewMs = Math.max(0, finite(ctx.maxSkewMs) ? Number(ctx.maxSkewMs) : 15000);
        const targetNvpW = finite(ctx.targetNvpW) ? Number(ctx.targetNvpW) : 0;
        const rawNvpW = finite(ctx.rawNvpW) ? Number(ctx.rawNvpW) : null;
        const nvpAgeMs = finite(ctx.nvpAgeMs) ? Math.max(0, Number(ctx.nvpAgeMs)) : null;
        const protectedEvcsLoadW = Math.max(0, finite(ctx.protectedEvcsLoadW) ? Number(ctx.protectedEvcsLoadW) : 0);
        const adapter = this.adapter || {};

        const getCacheRecord = (key) => {
            try {
                return adapter && adapter.stateCache ? adapter.stateCache[String(key || '').trim()] || null : null;
            } catch {
                return null;
            }
        };
        const getCacheAgeMs = (key) => {
            try {
                if (adapter && typeof adapter._nwGetCacheAgeMs === 'function') {
                    const age = adapter._nwGetCacheAgeMs(key, now);
                    return finite(age) ? Math.max(0, Number(age)) : null;
                }
            } catch {
                // Fallback auf den lokalen State-Cache.
            }
            const rec = getCacheRecord(key);
            const ts = Number(rec && rec.ts);
            return Number.isFinite(ts) && ts > 0 ? Math.max(0, now - ts) : null;
        };
        const getCacheValue = (key, fallback = null) => {
            try {
                if (adapter && typeof adapter._nwGetNumberFromCacheFresh === 'function') {
                    const value = adapter._nwGetNumberFromCacheFresh(key, staleMs, fallback, now);
                    return finite(value) ? Number(value) : fallback;
                }
            } catch {
                // Fallback auf den lokalen State-Cache.
            }
            const rec = getCacheRecord(key);
            const value = Number(rec && rec.value);
            const age = getCacheAgeMs(key);
            if (!Number.isFinite(value)) return fallback;
            if (age !== null && age > staleMs) return fallback;
            return value;
        };
        const getCacheString = (key) => {
            const rec = getCacheRecord(key);
            if (!rec || rec.value === null || rec.value === undefined) return '';
            return String(rec.value);
        };
        const isMapped = (key) => {
            try {
                if (adapter && typeof adapter._nwHasMappedDatapoint === 'function') {
                    return adapter._nwHasMappedDatapoint(key) === true;
                }
            } catch {
                // Fallback auf config.datapoints.
            }
            try {
                const dps = adapter && adapter.config && adapter.config.datapoints
                    ? adapter.config.datapoints
                    : {};
                return !!String(dps && dps[key] ? dps[key] : '').trim();
            } catch {
                return false;
            }
        };

        if (protectedEvcsLoadW > 0) {
            return {
                active: false,
                usable: false,
                reason: 'evcs-protected-load-active',
                targetW: null,
                expectedActualW: null,
                loadW: null,
                loadSource: '',
                loadAgeMs: null,
                pvW: null,
                pvSource: '',
                pvAgeMs: null,
                measurementSkewMs: null,
                aligned: false,
                nvpW: rawNvpW,
                nvpAgeMs,
                targetNvpW,
            };
        }

        let loadW = null;
        let loadSource = '';
        let loadAgeMs = null;
        const directLoadKeys = ['consumptionTotal', 'housePower'];
        for (const key of directLoadKeys) {
            if (!isMapped(key)) continue;
            const value = getCacheValue(key, null);
            if (!finite(value) || Number(value) < 0) continue;
            loadW = Math.max(0, Number(value));
            loadSource = `mapped:${key}`;
            loadAgeMs = getCacheAgeMs(key);
            break;
        }

        // Das Derived-Mirror ist nur erlaubt, wenn seine eigene Quellen-Diagnose
        // bestaetigt, dass es direkt aus einem gemappten Verbrauchs-DP stammt.
        if (loadW === null) {
            const derivedSource = getCacheString('derived.core.building.loadSource');
            if (/^mapped:(consumptionTotal|housePower)$/i.test(derivedSource)) {
                const value = getCacheValue('derived.core.building.loadTotalW', null);
                if (finite(value) && Number(value) >= 0) {
                    loadW = Math.max(0, Number(value));
                    loadSource = `derived:${derivedSource}`;
                    loadAgeMs = getCacheAgeMs('derived.core.building.loadTotalW');
                }
            }
        }

        const pvCandidates = [];
        const pushPv = (value, source, ageMs, priority = 0) => {
            if (!finite(value) || Number(value) < 0) return;
            const age = finite(ageMs) ? Math.max(0, Number(ageMs)) : null;
            if (age !== null && age > staleMs) return;
            pvCandidates.push({ w: Math.max(0, Number(value)), source, ageMs: age, priority });
        };

        const coupling = String(ctx.coupling || 'ac').trim().toLowerCase();
        if (coupling === 'dc' && finite(ctx.dcPvPowerW)) {
            pushPv(ctx.dcPvPowerW, 'st.dcPvPowerW', ctx.dcPvPowerAgeMs, 100);
        }
        for (const key of ['pvPower', 'productionTotal']) {
            if (!isMapped(key)) continue;
            pushPv(getCacheValue(key, null), `mapped:${key}`, getCacheAgeMs(key), key === 'pvPower' ? 80 : 60);
        }
        try {
            const psEntry = this.dp && typeof this.dp.getEntry === 'function' ? this.dp.getEntry('ps.pvW') : null;
            if (psEntry && this.dp && typeof this.dp.getNumberFresh === 'function') {
                pushPv(
                    this.dp.getNumberFresh('ps.pvW', staleMs, null),
                    'ps.pvW',
                    typeof this.dp.getAgeMs === 'function' ? this.dp.getAgeMs('ps.pvW') : null,
                    70,
                );
            }
        } catch {
            // Ein fehlender optionaler PV-DP deaktiviert nur Feed-forward.
        }

        pvCandidates.sort((a, b) => (b.priority - a.priority) || (b.w - a.w));
        const selectedPv = pvCandidates.length ? pvCandidates[0] : null;
        const pvW = selectedPv ? selectedPv.w : null;
        const pvSource = selectedPv ? selectedPv.source : '';
        const pvAgeMs = selectedPv ? selectedPv.ageMs : null;

        const ages = [loadAgeMs, pvAgeMs, nvpAgeMs].filter((v) => finite(v)).map(Number);
        const measurementSkewMs = ages.length >= 2 ? Math.max(...ages) - Math.min(...ages) : 0;
        const nvpFresh = rawNvpW !== null && (nvpAgeMs === null || nvpAgeMs <= staleMs);
        const loadFresh = loadW !== null && (loadAgeMs === null || loadAgeMs <= staleMs);
        const pvFresh = pvW !== null && (pvAgeMs === null || pvAgeMs <= staleMs);
        const aligned = measurementSkewMs <= maxSkewMs;
        const usable = !!(nvpFresh && loadFresh && pvFresh && aligned);

        if (!usable) {
            let reason = 'missing-direct-pv-or-load';
            if (!nvpFresh) reason = 'nvp-missing-or-stale';
            else if (!loadFresh) reason = 'direct-load-missing-or-stale';
            else if (!pvFresh) reason = 'direct-pv-missing-or-stale';
            else if (!aligned) reason = 'pv-load-nvp-not-aligned';
            return {
                active: false,
                usable: false,
                reason,
                targetW: null,
                expectedActualW: null,
                loadW,
                loadSource,
                loadAgeMs,
                pvW,
                pvSource,
                pvAgeMs,
                measurementSkewMs,
                aligned,
                nvpW: rawNvpW,
                nvpAgeMs,
                targetNvpW,
            };
        }

        // NexoWatt-Vorzeichen: +W Entladen, -W Laden.
        const targetW = loadW - pvW - targetNvpW;
        const expectedActualW = loadW - pvW - rawNvpW;
        return {
            active: true,
            usable: true,
            reason: 'direct-pv-load-feed-forward',
            targetW,
            expectedActualW,
            loadW,
            loadSource,
            loadAgeMs,
            pvW,
            pvSource,
            pvAgeMs,
            measurementSkewMs,
            aligned,
            nvpW: rawNvpW,
            nvpAgeMs,
            targetNvpW,
        };
    }

    /**
     * echten Batterie-Istleistung und der aktuellen Abweichung am NVP.
     *
     * Physikalische Regelgleichung (NexoWatt-Vorzeichen):
     *   Batterie +W = Entladen, -W = Laden
     *   NVP      +W = Netzbezug, -W = Einspeisung
     *   aktives Ziel = Zielmitte ausserhalb der Messtoleranz
     *   Sollwert     = Batterie-Ist + (NVP-Ist - aktives Ziel)
     *
     * Damit wird die aktuell bereits wirksame Lade-/Entladeleistung nicht bei
     * jedem Tick "vergessen". Beispiel: Speicher laedt 2,9 kW und am NVP sind
     * weitere 2,9 kW Export sichtbar. Das Rohziel ist dann rund -5,8 kW statt
     * erneut nur -2,9 kW. Umgekehrt wird bei Netzbezug die Differenz zur echten
     * Entladeleistung addiert.
     *
     * Sicherheits-/Stabilitaetsregeln:
     * - Batterie-Ist und RAW-NVP werden nur gemeinsam genutzt, wenn beide frisch
     *   und zeitlich ausreichend nah beieinander sind.
     * - Im schnellen Eigenverbrauchs-Servo wird die physikalisch erforderliche
     *   Korrektur mit jeder frischen NVP-Probe direkt ausgegeben. Die allgemeine
     *   Home-/Pro-Rampe darf den geschlossenen NVP-Regelkreis nicht ausbremsen.
     *   Explizite Geräte-, Leistungs-, SoC- und Safety-Grenzen bleiben nachgelagert.
     * - Leistung in Richtung 0 darf schneller zurueckgenommen werden, damit bei
     *   Wolken/Lastabwurf kein unnoetiger Netzbezug oder Export stehen bleibt.
     * - Ein Richtungswechsel wird ohne 0-W-Zwischenrunde direkt ausgegeben.
     *   Der Speicher fuehrt den internen Stopp beim Wechsel selbst aus.
     * - Ohne vertrauenswuerdige Istleistung wird ein alter positiver Entlade-
     *   Sollwert niemals hochintegriert (Schutz gegen den frueheren 71-kW-Fehler).
     */
    _buildActualAwareNvpBalance(ctx = {}) {
        const finite = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
        const rawNvpW = finite(ctx.rawNvpW) ? Number(ctx.rawNvpW) : null;
        const fallbackNvpW = finite(ctx.fallbackNvpW)
            ? Number(ctx.fallbackNvpW)
            : rawNvpW;
        const targetNvpW = finite(ctx.targetNvpW) ? Number(ctx.targetNvpW) : 0;
        const deadbandW = Math.max(0, finite(ctx.deadbandW) ? Number(ctx.deadbandW) : 50);
        const batteryPowerW = finite(ctx.batteryPowerW) ? Number(ctx.batteryPowerW) : null;
        const batteryMeasuredW = finite(ctx.batteryMeasuredW) ? Number(ctx.batteryMeasuredW) : batteryPowerW;
        const batteryAgeMs = finite(ctx.batteryAgeMs) ? Math.max(0, Number(ctx.batteryAgeMs)) : null;
        const nvpAgeMs = finite(ctx.nvpAgeMs) ? Math.max(0, Number(ctx.nvpAgeMs)) : null;
        const feedbackMaxAgeMs = Math.max(500, finite(ctx.feedbackMaxAgeMs) ? Number(ctx.feedbackMaxAgeMs) : 8000);
        const nvpFeedbackMaxAgeMs = Math.max(250, finite(ctx.nvpFeedbackMaxAgeMs) ? Number(ctx.nvpFeedbackMaxAgeMs) : feedbackMaxAgeMs);
        const feedbackMaxSkewMs = Math.max(0, finite(ctx.feedbackMaxSkewMs) ? Number(ctx.feedbackMaxSkewMs) : 5000);
        const feedbackRequireAligned = ctx.feedbackRequireAligned === true;
        const batteryFeedbackSource = String(ctx.batteryFeedbackSource || 'battery-actual');
        const batteryFeedbackHeld = ctx.batteryFeedbackHeld === true;
        const batteryFeedbackPredicted = ctx.batteryFeedbackPredicted === true;
        const batteryFeedbackPredictionDeltaW = finite(ctx.batteryFeedbackPredictionDeltaW)
            ? Number(ctx.batteryFeedbackPredictionDeltaW)
            : 0;
        const batteryFeedbackHoldAgeMs = finite(ctx.batteryFeedbackHoldAgeMs)
            ? Math.max(0, Number(ctx.batteryFeedbackHoldAgeMs))
            : feedbackMaxAgeMs;
        const batteryFeedbackKey = String(ctx.batteryFeedbackKey || '').trim();
        const batterySampleTs = finite(ctx.batterySampleTs) ? Math.max(0, Number(ctx.batterySampleTs)) : 0;
        const balanceControlKey = String(ctx.balanceControlKey || '').trim();
        const maxDischargeCorrectionW = Math.max(0, finite(ctx.maxDischargeCorrectionW) ? Number(ctx.maxDischargeCorrectionW) : 500);
        const maxChargeCorrectionW = Math.max(0, finite(ctx.maxChargeCorrectionW) ? Number(ctx.maxChargeCorrectionW) : maxDischargeCorrectionW);
        const fastServoActive = ctx.fastServoActive === true;
        const preferRawNvp = ctx.preferRawNvp === true || fastServoActive;
        const lastTargetW = finite(ctx.lastTargetW) ? Number(ctx.lastTargetW) : 0;
        const lastTargetAllowed = ctx.lastTargetAllowed === true;
        const holdLastNonZeroInDeadband = ctx.holdLastNonZeroInDeadband === true;
        const stepW = Math.max(0, finite(ctx.stepW) ? Number(ctx.stepW) : 0);
        const feedForwardUsable = ctx.feedForwardUsable === true && finite(ctx.feedForwardTargetW);
        const feedForwardTargetW = feedForwardUsable ? Number(ctx.feedForwardTargetW) : null;
        const feedForwardExpectedActualW = feedForwardUsable && finite(ctx.feedForwardExpectedActualW)
            ? Number(ctx.feedForwardExpectedActualW)
            : null;
        const feedForwardPvW = feedForwardUsable && finite(ctx.feedForwardPvW) ? Number(ctx.feedForwardPvW) : null;
        const feedForwardLoadW = feedForwardUsable && finite(ctx.feedForwardLoadW) ? Number(ctx.feedForwardLoadW) : null;
        const feedForwardPvSource = String(ctx.feedForwardPvSource || '');
        const feedForwardLoadSource = String(ctx.feedForwardLoadSource || '');
        const feedForwardReason = String(ctx.feedForwardReason || '');
        const feedForwardMeasurementSkewMs = feedForwardUsable && finite(ctx.feedForwardMeasurementSkewMs)
            ? Math.max(0, Number(ctx.feedForwardMeasurementSkewMs))
            : null;
        const feedForwardPlausibilityW = Math.max(
            200,
            finite(ctx.feedForwardPlausibilityW) ? Number(ctx.feedForwardPlausibilityW) : 1000,
        );
        const measurementSkewMs = (batteryAgeMs !== null && nvpAgeMs !== null)
            ? Math.abs(batteryAgeMs - nvpAgeMs)
            : null;
        const configuredNvpBand = resolveNvpBandTarget(rawNvpW, targetNvpW, deadbandW);
        const lowerBandW = configuredNvpBand.lowerBandW;
        const upperBandW = configuredNvpBand.upperBandW;

        const batteryFresh = !!(
            ctx.batteryPowerTrusted === true
            && batteryPowerW !== null
            && batteryAgeMs !== null
            && batteryAgeMs <= feedbackMaxAgeMs
        );
        const nvpFreshForFeedback = !!(
            rawNvpW !== null
            && (nvpAgeMs === null || nvpAgeMs <= nvpFeedbackMaxAgeMs)
        );
        const measurementsAligned = !feedbackRequireAligned || measurementSkewMs === null || measurementSkewMs <= feedbackMaxSkewMs;
        const feedbackCandidateUsed = !!(batteryFresh && nvpFreshForFeedback && measurementsAligned);
        const nvpW = (preferRawNvp && nvpFreshForFeedback)
            ? rawNvpW
            : ((feedbackCandidateUsed || feedForwardUsable) ? rawNvpW : fallbackNvpW);
        const effectiveNvpBand = resolveNvpBandTarget(nvpW, targetNvpW, deadbandW);
        const activeTargetNvpW = effectiveNvpBand.activeTargetNvpW;
        const nvpBandErrorW = effectiveNvpBand.bandErrorW;
        const asyncFeedback = estimateAsyncStorageFeedback({
            anchor: this._asyncBalanceCommand,
            feedbackKey: batteryFeedbackKey,
            sampleTs: batterySampleTs,
            sampleW: batteryMeasuredW,
            controlKey: balanceControlKey,
            nvpW,
            nvpTargetW: activeTargetNvpW,
            lastTargetW,
            lastTargetAllowed,
            targetToleranceW: Math.max(2, stepW),
            sampleToleranceW: Math.max(2, stepW),
        });
        const effectiveBatteryPowerW = feedbackCandidateUsed
            && asyncFeedback
            && asyncFeedback.active === true
            && finite(asyncFeedback.estimatedActualW)
            ? Number(asyncFeedback.estimatedActualW)
            : batteryPowerW;
        const feedbackPlausibilityErrorW = feedbackCandidateUsed && feedForwardExpectedActualW !== null
            ? effectiveBatteryPowerW - feedForwardExpectedActualW
            : null;
        const feedbackRejectedByFeedForward = !!(
            feedbackCandidateUsed
            && feedForwardUsable
            && feedbackPlausibilityErrorW !== null
            && Math.abs(feedbackPlausibilityErrorW) > feedForwardPlausibilityW
        );
        const feedbackUsed = feedbackCandidateUsed && !feedbackRejectedByFeedForward;

        if (nvpW === null) {
            return {
                active: false,
                targetW: 0,
                rawTargetW: 0,
                baseW: 0,
                baseSource: 'missing-nvp',
                measuredBatteryW: batteryMeasuredW,
                actualBatteryW: null,
                nvpW: null,
                nvpTargetW: targetNvpW,
                nvpBandLowerW: lowerBandW,
                nvpBandUpperW: upperBandW,
                nvpActiveTargetW: targetNvpW,
                nvpErrorW: 0,
                nvpBandErrorW: 0,
                correctionW: 0,
                appliedCorrectionW: 0,
                feedbackUsed: false,
                batteryFresh,
                batteryAgeMs,
                nvpAgeMs,
                measurementSkewMs,
                measurementsAligned,
                feedbackRequireAligned,
                batteryFeedbackSource,
                batteryFeedbackHeld,
                batteryFeedbackPredicted,
                batteryFeedbackPredictionDeltaW,
                batteryFeedbackHoldAgeMs,
                batteryFeedbackKey,
                batterySampleTs,
                balanceControlKey,
                asyncAnchorActive: false,
                asyncAnchorReason: asyncFeedback && asyncFeedback.reason ? String(asyncFeedback.reason) : 'missing-nvp',
                asyncEstimatedActualW: null,
                asyncCommandTargetW: null,
                asyncCommandBaseActualW: null,
                asyncCommandNvpW: null,
                asyncCommandAcceptedMs: null,
                asyncExpectedStorageDeltaW: 0,
                asyncObservedNvpDeltaW: 0,
                asyncAttributedStorageNvpDeltaW: 0,
                asyncAttributedStoragePowerDeltaW: 0,
                asyncResidualNvpDeltaW: 0,
                feedbackMaxAgeMs,
                nvpFeedbackMaxAgeMs,
                mode: 'missing-nvp',
                outsideDeadband: false,
                holdingLastCommand: false,
                heldTargetW: 0,
                feedForwardAvailable: feedForwardUsable,
                feedForwardUsed: false,
                feedForwardTargetW,
                feedForwardExpectedActualW,
                feedForwardPvW,
                feedForwardLoadW,
                feedForwardPvSource,
                feedForwardLoadSource,
                feedForwardReason,
                feedForwardMeasurementSkewMs,
                feedbackPlausibilityErrorW,
                feedbackRejectedByFeedForward,
                feedForwardPlausibilityW,
                rampManaged: false,
                fastServoActive,
                preferRawNvp,
            };
        }

        const nvpErrorW = effectiveNvpBand.centerErrorW;
        const outsideDeadband = effectiveNvpBand.outsideBand;
        let baseW = 0;
        let baseSource = 'zero-safe-fallback';

        if (feedbackUsed) {
            baseW = effectiveBatteryPowerW;
            baseSource = asyncFeedback && asyncFeedback.active === true
                ? `${batteryFeedbackSource || 'battery-actual'}:async-command-anchor`
                : (batteryFeedbackSource || 'battery-actual');
        } else if (lastTargetAllowed) {
            // Ohne vertrauenswuerdige Istleistung ist der letzte Sollwert KEIN
            // Ersatz fuer die reale Batterie-Leistung. Er darf deshalb nur zum
            // sicheren Zurueckregeln in Richtung 0 verwendet werden. Ein weiteres
            // Aufaddieren auf einen alten Lade- oder Entladesollwert wuerde bei
            // ausbleibender Speicherreaktion erneut eine Sollwert-Rueckkopplung
            // erzeugen. Fuer den Leistungsaufbau gilt im Fallback ausschliesslich
            // die aktuell sichtbare NVP-Abweichung.
            const mayUseLastTargetForRelease = (lastTargetW > 0 && nvpBandErrorW < 0)
                || (lastTargetW < 0 && nvpBandErrorW > 0);
            if (mayUseLastTargetForRelease) {
                baseW = lastTargetW;
                baseSource = 'last-target-release-only';
            }
        }

        const holdToleranceW = Math.max(100, deadbandW, stepW > 0 ? stepW * 2 : 0);
        let rawTargetW = baseW;
        let correctionW = 0;
        let appliedCorrectionW = 0;
        let targetW = baseW;
        let mode = feedbackUsed ? 'feedback' : 'fallback';
        let holdingLastCommand = false;
        let heldTargetW = 0;
        let feedForwardUsed = false;

        /**
         * Absoluten Feed-forward-Sollwert kontrolliert anfahren.
         * Anders als die NVP-Korrektur ist `desiredW` bereits der vollstaendige
         * Zielwert. Deshalb wird er niemals noch einmal auf Batterie-Ist oder den
         * letzten Sollwert addiert. Der letzte Sollwert dient nur als Rampenanker.
         */
        const applyFeedForwardTarget = (desiredW, modePrefix) => {
            // Feed-forward wird bereits auf die Zielmitte berechnet. Die
            // Messtoleranz ist nur eine Aktivierungsschwelle und verschiebt den
            // Zielwert nicht mehr auf eine Bandkante.
            const centerDesired = Number(desiredW) || 0;
            const desired = centerDesired;
            const anchor = lastTargetAllowed && Number.isFinite(lastTargetW) ? lastTargetW : 0;
            if (fastServoActive) {
                return {
                    targetW: desired,
                    appliedCorrectionW: desired - anchor,
                    mode: `${modePrefix}-fast-servo`,
                };
            }
            const crossesDirection = anchor !== 0
                && desired !== 0
                && Math.sign(anchor) !== Math.sign(desired);
            if (crossesDirection) {
                // Der Speichercontroller uebernimmt seinen internen Stopp beim
                // Richtungswechsel. NexoWatt schreibt den neuen Sollwert deshalb
                // direkt und erzeugt keine 0-W-Zwischenrunde.
                return {
                    targetW: desired,
                    appliedCorrectionW: desired - anchor,
                    mode: `${modePrefix}-direct-reverse`,
                };
            }

            const reducesMagnitude = anchor !== 0
                && Math.sign(anchor) === Math.sign(desired)
                && Math.abs(desired) < Math.abs(anchor);
            if (reducesMagnitude || desired === 0) {
                return {
                    targetW: desired,
                    appliedCorrectionW: desired - anchor,
                    mode: `${modePrefix}-fast-release`,
                };
            }

            const delta = desired - anchor;
            const positiveCap = maxDischargeCorrectionW > 0 ? maxDischargeCorrectionW : Math.abs(delta);
            const negativeCap = maxChargeCorrectionW > 0 ? maxChargeCorrectionW : Math.abs(delta);
            const applied = clamp(delta, -negativeCap, positiveCap);
            return {
                targetW: anchor + applied,
                appliedCorrectionW: applied,
                mode: `${modePrefix}-slew-limited`,
            };
        };

        if (!outsideDeadband) {
            // Eigenverbrauchs-/PV-Regelung: 0 W ist bei den konfigurierten Speichern
            // ein echter STOP-Befehl. Hat der letzte nicht-null Sollwert den NVP bereits
            // ins Zielband gebracht, wird genau dieser Sollwert weiter geschrieben.
            // Eine 0-W-Vorgabe erfolgt erst durch eine ausdrueckliche Schutz-/Stop-
            // Bedingung (SoC, Deaktivierung, fehlende Messung usw.).
            // Das Halten erhoeht den Sollwert niemals und kann daher den frueheren
            // Hochintegrationsfehler nicht wieder einfuehren.
            if (holdLastNonZeroInDeadband && lastTargetAllowed && Math.abs(lastTargetW) > 0) {
                targetW = lastTargetW;
                rawTargetW = lastTargetW;
                holdingLastCommand = true;
                heldTargetW = lastTargetW;
                mode = feedbackUsed ? 'feedback-hold-last-command' : 'fallback-hold-last-command';
            } else if (feedForwardUsable && feedForwardTargetW !== null && Math.abs(feedForwardTargetW) > 0) {
                const ff = applyFeedForwardTarget(feedForwardTargetW, 'feed-forward-deadband');
                targetW = ff.targetW;
                rawTargetW = feedForwardTargetW;
                baseW = 0;
                baseSource = 'pv-load-feed-forward';
                correctionW = feedForwardTargetW;
                appliedCorrectionW = ff.appliedCorrectionW;
                mode = ff.mode;
                feedForwardUsed = true;
            // Standardpfade (z. B. Tarif) halten nur einen zur echten Istleistung
            // passenden Sollwert. Dadurch bleibt deren bisheriges Verhalten erhalten.
            } else if (feedbackUsed && lastTargetAllowed && Math.sign(lastTargetW) === Math.sign(baseW) && Math.abs(lastTargetW - baseW) <= holdToleranceW) {
                targetW = lastTargetW;
                rawTargetW = baseW;
                mode = 'feedback-hold-command';
            } else if (feedbackUsed) {
                targetW = baseW;
                rawTargetW = baseW;
                mode = 'feedback-track-actual';
            } else {
                targetW = 0;
                rawTargetW = 0;
                baseW = 0;
                baseSource = 'deadband-no-feedback';
                mode = 'fallback-deadband-zero';
            }
        } else if (feedForwardUsable && (!feedbackUsed || feedbackRejectedByFeedForward)) {
            const ff = applyFeedForwardTarget(feedForwardTargetW, feedbackRejectedByFeedForward
                ? 'feed-forward-reject-feedback'
                : 'feed-forward-no-feedback');
            targetW = ff.targetW;
            rawTargetW = feedForwardTargetW;
            baseW = 0;
            baseSource = 'pv-load-feed-forward';
            correctionW = feedForwardTargetW;
            appliedCorrectionW = ff.appliedCorrectionW;
            mode = ff.mode;
            feedForwardUsed = true;
        } else {
            correctionW = nvpBandErrorW;
            rawTargetW = baseW + correctionW;

            // Bei einem aktiven asynchronen Kommando-Anker ist `baseW` bereits
            // die aus der NVP-Bewegung geschaetzte physische Speicherleistung.
            // Der neue absolute Sollwert bleibt deshalb `baseW + NVP-Fehler`.
            // Die Rampenbegrenzung muss sich aber auf den zuletzt akzeptierten
            // Befehl beziehen, nicht erneut auf die alte Messprobe. Andernfalls
            // wuerde z. B. 2.000 W Ist + 676 W Fehler trotz bereits akzeptierter
            // 2.476 W nochmals auf 2.500 W gekappt und die neue Last nicht sauber
            // nachgefuehrt.
            const commandAnchorW = asyncFeedback && asyncFeedback.active === true && finite(asyncFeedback.commandTargetW)
                ? Number(asyncFeedback.commandTargetW)
                : baseW;

            const crossesDirection = commandAnchorW !== 0
                && rawTargetW !== 0
                && Math.sign(commandAnchorW) !== Math.sign(rawTargetW);
            const reducesMagnitude = commandAnchorW !== 0
                && !crossesDirection
                && Math.abs(rawTargetW) < Math.abs(commandAnchorW);

            if (fastServoActive) {
                // Schneller geschlossener NVP-Regelkreis: Die volle, aus frischer
                // NVP-Probe und echter/geschaetzter Batterie-Istleistung berechnete
                // Korrektur wird im selben Tick geschrieben. Die finalen Caps,
                // Anti-Export-, SoC-, Tarif- und Safety-Gates greifen unveraendert
                // danach. Derselbe Messwert wird durch den asynchronen Anker nicht
                // mehrfach aufintegriert.
                targetW = rawTargetW;
                appliedCorrectionW = rawTargetW - commandAnchorW;
                mode = `${mode}-fast-servo`;
            } else if (crossesDirection) {
                // Direkter Lade-/Entladewechsel: Die Speichersysteme stoppen intern
                // beim Wechsel. Sicherheits-Caps, SoC-Grenzen und Hardware-Gates
                // bleiben nachgelagert voll wirksam.
                targetW = rawTargetW;
                appliedCorrectionW = correctionW;
                mode = `${mode}-direct-reverse`;
            } else if (reducesMagnitude) {
                // Leistung zuruecknehmen darf schneller erfolgen als Leistung aufbauen.
                // Dadurch wird bei Lastabwurf/Wolken nicht weiter gegen den NVP gefahren.
                targetW = rawTargetW;
                appliedCorrectionW = correctionW;
                mode = `${mode}-fast-release`;
            } else if (!feedbackUsed && baseW === 0) {
                // Ohne Batterie-Istleistung ist nur die aktuelle NVP-Abweichung
                // belastbar. Sie wird direkt als konservativer Lade-/Entladewunsch
                // verwendet. Dadurch entsteht weder die alte 50-%-Fixpunktlogik
                // noch eine Hochintegration aus einem vergangenen Sollwert. Die
                // nachgelagerten Lade-/Entlade-Caps bleiben als harte Grenzen aktiv.
                targetW = rawTargetW;
                appliedCorrectionW = correctionW;
                mode = correctionW >= 0 ? 'fallback-direct-import' : 'fallback-direct-export';
            } else {
                // Mehr Entladung bzw. mehr Beladung wird kontrolliert aufgebaut. Die
                // absolute Regelbasis kommt aus echter/geschaetzter Istleistung;
                // nur die Aenderung des Hardwarebefehls wird gegen den zuletzt
                // akzeptierten Kommando-Anker begrenzt.
                const commandDeltaW = rawTargetW - commandAnchorW;
                const positiveCap = maxDischargeCorrectionW > 0 ? maxDischargeCorrectionW : Math.abs(commandDeltaW);
                const negativeCap = maxChargeCorrectionW > 0 ? maxChargeCorrectionW : Math.abs(commandDeltaW);
                appliedCorrectionW = clamp(commandDeltaW, -negativeCap, positiveCap);
                targetW = commandAnchorW + appliedCorrectionW;
                mode = `${mode}-slew-limited`;
            }
        }

        return {
            active: true,
            targetW,
            rawTargetW,
            baseW,
            baseSource,
            measuredBatteryW: batteryMeasuredW,
            actualBatteryW: feedbackUsed ? effectiveBatteryPowerW : null,
            nvpW,
            nvpTargetW: targetNvpW,
            nvpBandLowerW: lowerBandW,
            nvpBandUpperW: upperBandW,
            nvpActiveTargetW: activeTargetNvpW,
            nvpErrorW,
            nvpBandErrorW,
            correctionW,
            appliedCorrectionW,
            feedbackUsed,
            batteryFresh,
            batteryAgeMs,
            nvpAgeMs,
            measurementSkewMs,
            measurementsAligned,
            feedbackRequireAligned,
            batteryFeedbackSource,
            batteryFeedbackHeld,
            batteryFeedbackPredicted,
            batteryFeedbackPredictionDeltaW,
            batteryFeedbackHoldAgeMs,
            batteryFeedbackKey,
            batterySampleTs,
            balanceControlKey,
            asyncAnchorActive: !!(feedbackUsed && asyncFeedback && asyncFeedback.active === true),
            asyncAnchorReason: asyncFeedback && asyncFeedback.reason ? String(asyncFeedback.reason) : '',
            asyncEstimatedActualW: feedbackUsed && finite(asyncFeedback && asyncFeedback.estimatedActualW)
                ? Number(asyncFeedback.estimatedActualW)
                : null,
            asyncCommandTargetW: finite(asyncFeedback && asyncFeedback.commandTargetW)
                ? Number(asyncFeedback.commandTargetW)
                : null,
            asyncCommandBaseActualW: finite(asyncFeedback && asyncFeedback.commandBaseActualW)
                ? Number(asyncFeedback.commandBaseActualW)
                : null,
            asyncCommandNvpW: finite(asyncFeedback && asyncFeedback.commandNvpW)
                ? Number(asyncFeedback.commandNvpW)
                : null,
            asyncCommandAcceptedMs: finite(asyncFeedback && asyncFeedback.commandAcceptedMs)
                ? Number(asyncFeedback.commandAcceptedMs)
                : null,
            asyncExpectedStorageDeltaW: finite(asyncFeedback && asyncFeedback.expectedStorageDeltaW)
                ? Number(asyncFeedback.expectedStorageDeltaW)
                : 0,
            asyncObservedNvpDeltaW: finite(asyncFeedback && asyncFeedback.observedNvpDeltaW)
                ? Number(asyncFeedback.observedNvpDeltaW)
                : 0,
            asyncAttributedStorageNvpDeltaW: finite(asyncFeedback && asyncFeedback.attributedStorageNvpDeltaW)
                ? Number(asyncFeedback.attributedStorageNvpDeltaW)
                : 0,
            asyncAttributedStoragePowerDeltaW: finite(asyncFeedback && asyncFeedback.attributedStoragePowerDeltaW)
                ? Number(asyncFeedback.attributedStoragePowerDeltaW)
                : 0,
            asyncResidualNvpDeltaW: finite(asyncFeedback && asyncFeedback.residualNvpDeltaW)
                ? Number(asyncFeedback.residualNvpDeltaW)
                : 0,
            feedbackMaxAgeMs,
            nvpFeedbackMaxAgeMs,
            mode,
            outsideDeadband,
            holdingLastCommand,
            heldTargetW,
            feedForwardAvailable: feedForwardUsable,
            feedForwardUsed,
            feedForwardTargetW,
            feedForwardExpectedActualW,
            feedForwardPvW,
            feedForwardLoadW,
            feedForwardPvSource,
            feedForwardLoadSource,
            feedForwardReason,
            feedForwardMeasurementSkewMs,
            feedbackPlausibilityErrorW,
            feedbackRejectedByFeedForward,
            feedForwardPlausibilityW,
            // Auch der konservative Fallback begrenzt seinen Aufbau bereits selbst.
            // Deshalb darf die nachgelagerte Rampe niemals einen alten Sollwert wieder
            // in den aktuellen sicheren Balancing-Wert hineinziehen.
            rampManaged: true,
            fastServoActive,
            preferRawNvp,
        };
    }

    _getCfg() {
        const storage = (this.adapter.config && this.adapter.config.storage) ? this.adapter.config.storage : {};
        const runtimeFallback = (this.adapter && this.adapter._nwStorageMeasurementFallback
            && typeof this.adapter._nwStorageMeasurementFallback === 'object')
            ? this.adapter._nwStorageMeasurementFallback
            : buildStorageMeasurementFallbackFromGlobal(this.adapter && this.adapter.config ? this.adapter.config : {});
        const effectiveDatapoints = mergeStorageMeasurementFallback(storage, runtimeFallback);
        return {
            controlMode: storage.controlMode,
            datapoints: effectiveDatapoints,
            allowGridCharge: storage.allowGridCharge !== false,
            // Einzel-Speicher-Typ aus dem App-Center. AC bleibt der Standard.
            // DC/Hybrid nutzt zusaetzlich den optionalen PV-Erzeugungs-DP st.dcPvPowerW,
            // damit FENECON-/0-Einspeise-Erkennung nicht den Batterie-Sollwert mit PV verwechselt.
            coupling: (String(storage.coupling || 'ac').trim().toLowerCase() === 'dc') ? 'dc' : 'ac',
            dcPvPowerObjectId: effectiveDatapoints.dcPvPowerObjectId,
            staleTimeoutSec: storage.staleTimeoutSec,
            socHystPct: storage.socHystPct,
            modeHoldSec: storage.modeHoldSec,
            tariffPermissionHoldSec: storage.tariffPermissionHoldSec,
            ratedPowerW: storage.ratedPowerW,
            maxChargeW: storage.maxChargeW,
            maxDischargeW: storage.maxDischargeW,
            stepW: storage.stepW,
            maxDeltaWPerTick: storage.maxDeltaWPerTick,
            pvMaxDeltaWPerTick: storage.pvMaxDeltaWPerTick,
            reserveEnabled: storage.reserveEnabled,
            reserveMinSocPct: storage.reserveMinSocPct,
            reserveTargetSocPct: storage.reserveTargetSocPct,
            reserveGridChargeW: storage.reserveGridChargeW,
            pvEnabled: storage.pvEnabled,
            pvExportThresholdW: storage.pvExportThresholdW,

            // Gate E
            lskEnabled: storage.lskEnabled,
            lskDischargeEnabled: storage.lskDischargeEnabled,
            lskChargeEnabled: storage.lskChargeEnabled,
            lskMinSocPct: storage.lskMinSocPct,
            lskMaxSocPct: storage.lskMaxSocPct,
            lskMaxChargeW: storage.lskMaxChargeW,
            lskMaxDischargeW: storage.lskMaxDischargeW,
            lskRefillAvgSeconds: storage.lskRefillAvgSeconds,
            lskRefillDeadbandW: storage.lskRefillDeadbandW,

            selfDischargeEnabled: storage.selfDischargeEnabled,
            // Getrennte Standalone-Snapshot-Felder verhindern, dass eine spaeter
            // deaktivierte MultiUse-Policy ihre frueheren SoC-Zonen weiterverwendet.
            standaloneSelfDischargeEnabled: storage.standaloneSelfDischargeEnabled,
            standaloneSelfMinSocPct: storage.standaloneSelfMinSocPct,
            standaloneSelfMaxSocPct: storage.standaloneSelfMaxSocPct,
            standaloneSelfTargetGridImportW: storage.standaloneSelfTargetGridImportW,
            standaloneSelfImportThresholdW: storage.standaloneSelfImportThresholdW,
            multiUsePolicyApplied: storage.multiUsePolicyApplied,
            multiUsePolicyActive: storage.multiUsePolicyActive,
            // Herstellerprofile: generisch bleibt die normale Eigenverbrauchslogik,
            // FENECON/OpenEMS nutzt gegateten Watchdog-Refresh/Assist. Sungrow nutzt ab 0.8.96 denselben
            // geschlossenen NVP-Regelkreis wie Generic/E3DC/Farm; alte PV-Deckungs-
            // Nullkommandos werden nicht mehr ausgewertet.
            vendorProfile: storage.vendorProfile,
            sungrowHybridEnabled: storage.sungrowHybridEnabled,
            sungrowPvThresholdW: storage.sungrowPvThresholdW,
            sungrowLoadCoverReserveW: storage.sungrowLoadCoverReserveW,
            sungrowTargetGridImportW: storage.sungrowTargetGridImportW,
            sungrowImportThresholdW: storage.sungrowImportThresholdW,
            sungrowAssistBufferW: storage.sungrowAssistBufferW,
            // E3/DC RSCP Herstellerprofil: NexoWatt schreibt keine signed Batterie-
            // Sollleistung, sondern das vom ioBroker.e3dc-rscp Adapter erwartete
            // Tupel EMS.SET_POWER_MODE + EMS.SET_POWER_VALUE. PowerLimits sind
            // optional und werden nur geschrieben, wenn der Installer sie bewusst aktiviert.
            e3dcRscpEnabled: storage.e3dcRscpEnabled,
            e3dcZeroMode: storage.e3dcZeroMode,
            e3dcAllowGridCharge: storage.e3dcAllowGridCharge,
            e3dcUsePowerLimits: storage.e3dcUsePowerLimits,
            // Legacy: feneconAcMode bleibt als Migrations-Alias erhalten.
            // feneconGridControlEnabled ist aus UI-/Migrationsgründen der gespeicherte
            // Haken, bedeutet ab 0.6.255 aber: Hybrid-/Gateway-Priorität-Gateway-Priorität.
            feneconAcMode: storage.feneconAcMode,
            feneconGridControlEnabled: storage.feneconGridControlEnabled,
            feneconControlMode: storage.feneconControlMode,
            // FENECON-Hybrid-Automatik fuer einen exklusiven DC-Speicher:
            // PV oberhalb der Schwelle -> FEMS-Eigenregelung (No-Write),
            // PV unterhalb der Schwelle -> EOS-Regelung nach Entprellung.
            // Fehlende/veraltete PV bleibt fail-safe bei FEMS. Ein expliziter
            // 0-W-Sicherheits-/Sperrbefehl ist in jeder Phase zulaessig.
            feneconDayNoWriteEnabled: storage.feneconDayNoWriteEnabled,
            feneconAssistEnabled: storage.feneconAssistEnabled,
            feneconDayClockFallbackEnabled: storage.feneconDayClockFallbackEnabled,
            feneconDayStartHour: storage.feneconDayStartHour,
            feneconDayEndHour: storage.feneconDayEndHour,
            feneconForecastThresholdW: storage.feneconForecastThresholdW,
            feneconAssistImportThresholdW: storage.feneconAssistImportThresholdW,
            feneconAssistDelaySec: storage.feneconAssistDelaySec,
            feneconAssistReleaseImportW: storage.feneconAssistReleaseImportW,
            feneconAssistReleaseDelaySec: storage.feneconAssistReleaseDelaySec,
            feneconAssistTargetGridImportW: storage.feneconAssistTargetGridImportW,
            feneconAssistBufferW: storage.feneconAssistBufferW,
            feneconPvPassthroughThresholdW: storage.feneconPvPassthroughThresholdW,
            feneconPvReleaseThresholdW: storage.feneconPvReleaseThresholdW,
            feneconPvPassthroughDelaySec: storage.feneconPvPassthroughDelaySec,
            feneconPvReleaseDelaySec: storage.feneconPvReleaseDelaySec,
            feneconAdditionalPvThresholdW: storage.feneconAdditionalPvThresholdW,
            feneconGridTargetW: storage.feneconGridTargetW,
            feneconGridExportBufferW: storage.feneconGridExportBufferW,
            // RC42 nur Diagnose: Zielpuffer fuer das read-only NVP-Shadowmodell.
            // Ohne expliziten Wert werden 80 W kleiner Netzbezug angenommen.
            feneconNvpShadowZeroExportTargetW: storage.feneconNvpShadowZeroExportTargetW,
            feneconNvpShadowIntervalSec: storage.feneconNvpShadowIntervalSec,
            feneconNvpShadowPlausibilityToleranceW: storage.feneconNvpShadowPlausibilityToleranceW,
            feneconNvpShadowNvpToleranceW: storage.feneconNvpShadowNvpToleranceW,
            feneconNvpShadowMaxSkewMs: storage.feneconNvpShadowMaxSkewMs,
            feneconGridMinSetpointW: storage.feneconGridMinSetpointW,
            feneconGridMaxSetpointW: storage.feneconGridMaxSetpointW,
            feneconGridWriteIntervalSec: storage.feneconGridWriteIntervalSec,
            // FEMS Modbus/TCP API-Watchdog; Standard laut FEMS-Schreib-App 60 s.
            // Wird ausschließlich für die sichere Übergabe native FEMS-NVP -> direkte ESS-Leistung verwendet.
            feneconApiTimeoutSec: storage.feneconApiTimeoutSec,
            feneconGridResetOnDisable: storage.feneconGridResetOnDisable,
            selfMinSocPct: storage.selfMinSocPct,
            selfMaxSocPct: storage.selfMaxSocPct,
            selfTargetGridImportW: storage.selfTargetGridImportW,
            selfImportThresholdW: storage.selfImportThresholdW,
            selfNvpSmoothingEnabled: storage.selfNvpSmoothingEnabled,
            selfNvpSmoothingSec: storage.selfNvpSmoothingSec,
            selfNvpFastServoEnabled: storage.selfNvpFastServoEnabled,
            selfNvpRawGuardW: storage.selfNvpRawGuardW,
            // Herstellerunabhaengige Istwert-Halte-/Prognoseparameter fuer das
            // geschlossene NVP-Balancing. `balanceFeedbackHoldSec` ist im
            // AppCenter sichtbar; die weiteren Werte bleiben Expertenparameter.
            balanceFeedbackHoldSec: storage.balanceFeedbackHoldSec,
            balanceFeedbackPredictionSteps: storage.balanceFeedbackPredictionSteps,
            balanceFeedbackPredictionMaxW: storage.balanceFeedbackPredictionMaxW,
            // Legacy-/Expertenparameter bleiben lesbar, damit bestehende
            // Installationen ihre bisherigen Tuningwerte nicht verlieren.
            balanceFeedbackMaxAgeMs: storage.balanceFeedbackMaxAgeMs,
            balanceFeedbackMaxSkewMs: storage.balanceFeedbackMaxSkewMs,
            // Direkter PV-/Last-Feed-forward als herstellerunabhaengiger Fallback.
            // Diese Expertenwerte sind absichtlich nicht im Kunden-UI sichtbar.
            balanceFeedForwardMaxAgeMs: storage.balanceFeedForwardMaxAgeMs,
            balanceFeedForwardMaxSkewMs: storage.balanceFeedForwardMaxSkewMs,
            balanceFeedForwardPlausibilityW: storage.balanceFeedForwardPlausibilityW,
            zeroWriteBudgetGraceSec: storage.zeroWriteBudgetGraceSec,
            zeroWriteMeasurementGraceSec: storage.zeroWriteMeasurementGraceSec,
            selfMaxChargeW: storage.selfMaxChargeW,
            selfMaxDischargeW: storage.selfMaxDischargeW,
            capacityKWh: storage.capacityKWh,

            // PV‑Reserve (Tarif‑Netzladen)
            tariffPvReserveEnabled: storage.tariffPvReserveEnabled,
            tariffPvReserveHorizonHours: storage.tariffPvReserveHorizonHours,
            tariffPvReserveCaptureFactor: storage.tariffPvReserveCaptureFactor,
            tariffPvReserveConfidence: storage.tariffPvReserveConfidence,
            tariffPvReserveMinSocPct: storage.tariffPvReserveMinSocPct,

            // Tarif-Entladung (NVP-Regelung)
            tariffTargetGridImportW: storage.tariffTargetGridImportW,
            tariffImportThresholdW: storage.tariffImportThresholdW,
        };
    }

    /**
     */
    /**
     * Prüft die Speicherfarm mit derselben AppCenter-Regel wie Adapterkern und UI.
     * Die Farm ist nur aktiv, wenn die App installiert und eingeschaltet ist und
     * mindestens zwei reale Speicherzeilen konfiguriert sind. Das Legacy-Flag wird
     * ausschließlich verwendet, wenn noch kein AppCenter-Datensatz existiert.
     * Dadurch greifen Regelung, Kapazitätsberechnung und Schreibverteilung nicht
     * versehentlich auf eine alte oder nur teilweise konfigurierte Farm zurück.
     */
    /**
     * Lokaler Zugriff auf die zentrale Speicher-Steuerhoheit. Der Adapterkern ist
     * autoritativ; der Fallback dient nur isolierten Modultests und Alt-Runtimes.
     */
    _getStorageControlAuthority() {
        try {
            if (this.adapter && typeof this.adapter._nwGetStorageControlAuthority === 'function') {
                const authority = this.adapter._nwGetStorageControlAuthority();
                if (authority && typeof authority === 'object') return authority;
            }

            const rootCfg = (this.adapter && this.adapter.config) ? this.adapter.config : {};
            const appsRoot = (rootCfg.emsApps && typeof rootCfg.emsApps === 'object') ? rootCfg.emsApps : {};
            const apps = (appsRoot.apps && typeof appsRoot.apps === 'object') ? appsRoot.apps : {};
            const singleApp = (apps.storage && typeof apps.storage === 'object') ? apps.storage : null;
            const singleAppActive = singleApp
                ? (singleApp.installed === true && singleApp.enabled === true)
                : (rootCfg.enableStorageControl === true);

            const farm = (this.adapter && typeof this.adapter._nwGetStorageFarmRuntimeInfo === 'function')
                ? this.adapter._nwGetStorageFarmRuntimeInfo()
                : null;
            const farmAggregationActive = farm
                ? !!farm.active
                : this._isStorageFarmEnabled();
            let farmDispatchActive = farm && typeof farm.dispatchActive === 'boolean'
                ? !!farm.dispatchActive
                : false;
            if (!farm && farmAggregationActive) {
                const sf = (rootCfg.storageFarm && typeof rootCfg.storageFarm === 'object') ? rootCfg.storageFarm : {};
                const rows = Array.isArray(sf.storages) ? sf.storages : [];
                farmDispatchActive = rows.some((row) => row && row.enabled !== false && (
                    String(row.setSignedPowerId || row.targetPowerObjectId || row.targetPowerId || '').trim()
                    || String(row.setChargePowerId || row.targetChargePowerObjectId || row.targetChargePowerId || '').trim()
                    || String(row.setDischargePowerId || row.targetDischargePowerObjectId || row.targetDischargePowerId || '').trim()
                ));
            }

            const selectedTopology = farmDispatchActive ? 'farm' : (singleAppActive ? 'single' : 'none');
            const installerCfg = (rootCfg.installerConfig && typeof rootCfg.installerConfig === 'object')
                ? rootCfg.installerConfig
                : {};
            const multiUseCfg = (installerCfg.storageMultiUse && typeof installerCfg.storageMultiUse === 'object')
                ? installerCfg.storageMultiUse
                : null;
            return {
                selectedTopology,
                writerActive: selectedTopology !== 'none',
                reason: farmDispatchActive
                    ? (singleAppActive ? 'writable-farm-precedes-single' : 'writable-farm-active')
                    : (singleAppActive
                        ? (farmAggregationActive ? 'single-active-farm-read-only' : 'single-active')
                        : (farmAggregationActive ? 'farm-read-only-no-writer' : 'no-active-storage-output')),
                singleAppActive: !!singleAppActive,
                singleSuppressedByFarm: selectedTopology === 'farm' && !!singleAppActive,
                farmAggregationActive: !!farmAggregationActive,
                farmDispatchActive: !!farmDispatchActive,
                farm: farm || { active: !!farmAggregationActive, dispatchActive: !!farmDispatchActive, rows: [] },
                multiUsePolicyActive: !!(rootCfg.enableMultiUse === true && multiUseCfg && multiUseCfg.enabled === true),
            };
        } catch {
            return {
                selectedTopology: 'none',
                writerActive: false,
                reason: 'authority-error',
                singleAppActive: false,
                singleSuppressedByFarm: false,
                farmAggregationActive: false,
                farmDispatchActive: false,
                farm: { active: false, dispatchActive: false, rows: [] },
                multiUsePolicyActive: false,
            };
        }
    }

    _isStorageFarmEnabled() {
        try {
            // Der Adapterkern besitzt die autoritative AppCenter-/Zeilenbewertung.
            // Hersteller- und Speicherregelung verwenden exakt denselben Aktivzustand
            // wie Aggregation, Navigation und Energiefluss.
            if (this.adapter && typeof this.adapter._nwGetStorageFarmRuntimeInfo === 'function') {
                const info = this.adapter._nwGetStorageFarmRuntimeInfo();
                return !!(info && info.active);
            }

            const rootCfg = (this.adapter && this.adapter.config) ? this.adapter.config : {};
            const sf = (rootCfg.storageFarm && typeof rootCfg.storageFarm === 'object') ? rootCfg.storageFarm : {};
            const rows = Array.isArray(sf.storages) ? sf.storages : [];
            const realKeys = [
                'socId', 'chargePowerId', 'dischargePowerId', 'signedPowerId',
                'setChargePowerId', 'setDischargePowerId', 'setSignedPowerId',
                'availableId', 'faultId', 'chargeAllowedId', 'dischargeAllowedId',
            ];
            const configuredCount = rows.filter((row) => {
                if (!row || typeof row !== 'object' || row.enabled === false) return false;
                return realKeys.some((key) => String(row[key] || '').trim());
            }).length;

            const appsRoot = (rootCfg.emsApps && typeof rootCfg.emsApps === 'object') ? rootCfg.emsApps : {};
            const apps = (appsRoot.apps && typeof appsRoot.apps === 'object') ? appsRoot.apps : {};
            const app = (apps.storagefarm && typeof apps.storagefarm === 'object')
                ? apps.storagefarm
                : ((apps.storageFarm && typeof apps.storageFarm === 'object') ? apps.storageFarm : null);
            const enabledByConfig = app
                ? (app.installed === true && app.enabled === true)
                : (rootCfg.enableStorageFarm === true);

            return !!(enabledByConfig && configuredCount >= 2);
        } catch {
            return false;
        }
    }

    /**
     * Nur eine tatsächlich beschreibbare Farm darf den Einzel-Speicher-Schreibpfad
     * übernehmen. Reine Mess-/SoC-/Statuszeilen bleiben für Aggregation aktiv,
     * blockieren aber niemals die manuell zugeordneten st.*-Ziel-DPs.
     */
    _isStorageFarmDispatchEnabled() {
        return this._getStorageControlAuthority().selectedTopology === 'farm';
    }

    _getStorageVendorProfile(cfg = {}) {
        const raw = String((cfg && cfg.vendorProfile) || '').trim().toLowerCase();
        if (raw === 'fenecon' || raw === 'openems' || raw === 'fems' || raw === 'fenecon-openems') return 'fenecon-openems';
        if (raw === 'sungrow' || raw === 'sungrow-ess' || raw === 'sungrow-hybrid') return 'sungrow-hybrid';
        if (raw === 'e3dc' || raw === 'e3/dc' || raw === 'e3dc-rscp' || raw === 'e3dc-rscp-iobroker') return 'e3dc-rscp';
        // Migration: alte FENECON-Haken bleiben als Profil erkennbar, solange kein
        // explizites anderes Herstellerprofil gespeichert wurde.
        if (!raw && cfg && (cfg.feneconGridControlEnabled === true || cfg.feneconAcMode === true)) return 'fenecon-openems';
        if (!raw && cfg && cfg.sungrowHybridEnabled === true) return 'sungrow-hybrid';
        if (!raw && cfg && cfg.e3dcRscpEnabled === true) return 'e3dc-rscp';
        return 'generic';
    }

    _isFeneconProfileConfigured(cfg = {}) {
        const profile = this._getStorageVendorProfile(cfg);
        if (profile === 'fenecon-openems') return true;
        if (profile !== 'generic') return false;
        // Bestehende Installationen vor Einführung des Herstellerprofils dürfen
        // ihren bewährten direkten FENECON-Watchdogpfad nicht verlieren.
        return !!(cfg && (
            cfg.feneconGridControlEnabled === true
            || cfg.feneconAcMode === true
            || cfg.feneconDayNoWriteEnabled === true
            || cfg.feneconAssistEnabled === true
        ));
    }

    _isFeneconHybridControlConfigured(cfg = {}) {
        const coupling = String((cfg && cfg.coupling) || '').trim().toLowerCase();
        // Der native FEMS-NVP-Regler ist ausschließlich für echte DC-/Hybrid-
        // Systeme zulässig. Ein FENECON-AC-Speicher bleibt trotzdem als FENECON-
        // Profil erkannt und nutzt unverändert die direkte ESS-Leistungsregelung.
        return this._isFeneconProfileConfigured(cfg) && coupling === 'dc';
    }

    _isSungrowHybridControlConfigured(cfg = {}) {
        return this._getStorageVendorProfile(cfg) === 'sungrow-hybrid';
    }

    _isE3dcRscpControlConfigured(cfg = {}) {
        return this._getStorageVendorProfile(cfg) === 'e3dc-rscp';
    }

    // Legacy-Alias für ältere interne Aufrufe.
    /**
     */
    _isFeneconGridControlConfigured(cfg = {}) {
        return this._isFeneconHybridControlConfigured(cfg);
    }
    async _buildSungrowHybridContext({
        cfg = {},
        staleMs = 15000,
        gridW = null,
        gridRawW = null,
        gridAgeMs = null,
        targetGridImportW = null,
        importThresholdW = null,
        protectedEvcsLoadW = 0,
        coupling = 'ac',
        dcPvPowerW = null,
        dcPvPowerAgeMs = null,
    } = {}) {
        const thresholdW = Math.max(0, num(cfg.sungrowPvThresholdW, 300));
        const loadCoverReserveW = Math.max(0, num(cfg.sungrowLoadCoverReserveW, 300));
        // Sungrow besitzt keine zweite NVP-Abstimmung. Herstellerprofile
        // duerfen die Schreibweise aendern, aber Zielmitte/Messtoleranz stammen
        // ausschliesslich aus der aktuell aktiven Speicher- oder Farm-App.
        const dischargeThresholdW = Math.max(0, num(importThresholdW, 20));
        const effectiveTargetGridImportW = Math.max(0, num(targetGridImportW, 50));
        const nvpW = (typeof gridRawW === 'number' && Number.isFinite(gridRawW))
            ? Number(gridRawW)
            : ((typeof gridW === 'number' && Number.isFinite(gridW)) ? Number(gridW) : null);
        const importW = (typeof nvpW === 'number') ? Math.max(0, nvpW) : 0;
        const exportW = (typeof nvpW === 'number') ? Math.max(0, -nvpW) : 0;

        // Das Herstellerprofil nutzt dieselbe direkte PV-/Lastquelle wie der
        // gemeinsame Feed-forward-Regler. Dadurch wird fuer Diagnose und Regelung
        // niemals ein aus PV + NVP + Speicher rueckgerechneter Lastwert verwendet.
        const feedForward = this._buildIndependentPvLoadFeedForward({
            nowMs: Date.now(),
            staleMs,
            maxSkewMs: Math.max(0, num(cfg.balanceFeedForwardMaxSkewMs, 15000)),
            rawNvpW: nvpW,
            nvpAgeMs: gridAgeMs,
            targetNvpW: effectiveTargetGridImportW,
            protectedEvcsLoadW,
            coupling,
            dcPvPowerW,
            dcPvPowerAgeMs,
        });
        const pvW = feedForward.pvW !== null && feedForward.pvW !== undefined
            ? Math.max(0, Number(feedForward.pvW) || 0)
            : 0;
        const loadW = feedForward.loadW !== null && feedForward.loadW !== undefined
            ? Math.max(0, Number(feedForward.loadW) || 0)
            : 0;
        const pvActive = pvW >= thresholdW;
        const loadKnown = feedForward.usable === true && loadW >= 0;
        const pvCoversLoad = !!(loadKnown && pvActive && pvW >= (loadW + loadCoverReserveW));

        return {
            active: true,
            configured: true,
            mode: feedForward.usable ? 'nvp-closed-loop-with-direct-feed-forward' : 'nvp-closed-loop',
            writeMode: 'closed-loop-no-legacy-zero',
            reason: feedForward.usable
                ? 'Sungrow Hybrid ESS: NVP-Regelkreis mit direktem PV-/Last-Feed-forward'
                : `Sungrow Hybrid ESS: NVP-Regelkreis, Feed-forward nicht nutzbar (${String(feedForward.reason || 'keine direkten Messwerte')})`,
            pvW,
            pvSource: String(feedForward.pvSource || ''),
            thresholdW,
            loadW,
            loadWIncludingEvcs: loadW,
            protectedEvcsLoadW: Math.max(0, Number(protectedEvcsLoadW) || 0),
            loadSource: String(feedForward.loadSource || ''),
            loadCoverReserveW,
            loadKnown,
            pvActive,
            pvCoversLoad,
            targetGridImportW: effectiveTargetGridImportW,
            effectiveTargetGridImportW,
            dischargeThresholdW,
            legacyNvpTuningIgnored: Number.isFinite(Number(cfg.sungrowTargetGridImportW))
                || Number.isFinite(Number(cfg.sungrowImportThresholdW)),
            nvpW,
            importW,
            exportW,
            feedForward,
        };
    }

    /**
     * Speicher-NVP-Regelung. Damit ist im Feld sichtbar, ob die Vorgabe aus
     * Batterie-Istleistung plus NVP-Differenz entstanden ist oder ob wegen
     * alter/asynchroner Messwerte ein konservativer Fallback aktiv war.
     */
    async _setStorageNvpBalanceDiag(ctx = null) {
        const active = !!(ctx && ctx.active);
        const n = (v, fallback = null) => (v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)))
            ? Math.round(Number(v))
            : fallback;
        await this._setIfChanged('speicher.regelung.balanceAktiv', active);
        await this._setIfChanged('speicher.regelung.balancePolicy', active ? String(ctx.policy || '') : '');
        await this._setIfChanged('speicher.regelung.balanceMesswertW', active ? n(ctx.measuredBatteryW) : null);
        await this._setIfChanged('speicher.regelung.balanceIstLeistungW', active ? n(ctx.actualBatteryW) : null);
        await this._setIfChanged('speicher.regelung.balanceIstLeistungAlterMs', active ? n(ctx.batteryAgeMs) : null);
        await this._setIfChanged('speicher.regelung.balanceBasisW', active ? n(ctx.baseW, 0) : 0);
        await this._setIfChanged('speicher.regelung.balanceNvpW', active ? n(ctx.nvpW) : null);
        await this._setIfChanged('speicher.regelung.balanceNvpAlterMs', active ? n(ctx.nvpAgeMs) : null);
        await this._setIfChanged('speicher.regelung.balanceNvpZielW', active ? n(ctx.nvpTargetW, 0) : 0);
        await this._setIfChanged('speicher.regelung.balanceNvpFehlerW', active ? n(ctx.nvpErrorW, 0) : 0);
        await this._setIfChanged('speicher.regelung.balanceNvpBandUnterW', active ? n(ctx.nvpBandLowerW, 0) : 0);
        await this._setIfChanged('speicher.regelung.balanceNvpBandOberW', active ? n(ctx.nvpBandUpperW, 0) : 0);
        await this._setIfChanged('speicher.regelung.balanceNvpAktivZielW', active ? n(ctx.nvpActiveTargetW, 0) : 0);
        await this._setIfChanged('speicher.regelung.balanceNvpBandFehlerW', active ? n(ctx.nvpBandErrorW, 0) : 0);
        await this._setIfChanged('speicher.regelung.balanceBasisQuelle', active ? String(ctx.baseSource || '') : '');
        await this._setIfChanged('speicher.regelung.balanceRohSollW', active ? n(ctx.rawTargetW, 0) : 0);
        await this._setIfChanged('speicher.regelung.balanceKorrekturW', active ? n(ctx.correctionW, 0) : 0);
        await this._setIfChanged('speicher.regelung.balanceAngewandteKorrekturW', active ? n(ctx.appliedCorrectionW, 0) : 0);
        await this._setIfChanged('speicher.regelung.balanceSollW', active ? n(ctx.targetW, 0) : 0);
        await this._setIfChanged('speicher.regelung.balanceFeedbackVerwendet', !!(active && ctx.feedbackUsed));
        await this._setIfChanged('speicher.regelung.balanceFeedbackQuelle', active ? String(ctx.batteryFeedbackSource || '') : '');
        await this._setIfChanged('speicher.regelung.balanceFeedbackGehalten', !!(active && ctx.batteryFeedbackHeld));
        await this._setIfChanged('speicher.regelung.balanceFeedbackPrognoseAktiv', !!(active && ctx.batteryFeedbackPredicted));
        await this._setIfChanged('speicher.regelung.balanceFeedbackPrognoseDeltaW', active ? n(ctx.batteryFeedbackPredictionDeltaW, 0) : 0);
        await this._setIfChanged('speicher.regelung.balanceFeedbackHaltezeitMs', active ? n(ctx.batteryFeedbackHoldAgeMs, 0) : 0);
        await this._setIfChanged('speicher.regelung.balanceMessversatzMs', active ? n(ctx.measurementSkewMs) : null);
        await this._setIfChanged('speicher.regelung.balanceMessungSynchronErforderlich', !!(active && ctx.feedbackRequireAligned));
        await this._setIfChanged('speicher.regelung.balanceMessungSynchron', !!(active && ctx.measurementsAligned));
        await this._setIfChanged('speicher.regelung.balanceModus', active ? String(ctx.mode || '') : 'inactive');
        await this._setIfChanged('speicher.regelung.balanceLetztenSollwertGehalten', !!(active && ctx.holdingLastCommand));
        await this._setIfChanged('speicher.regelung.balanceGehaltenSollW', active ? n(ctx.heldTargetW, 0) : 0);
        await this._setIfChanged('speicher.regelung.balanceFeedForwardVerfuegbar', !!(active && ctx.feedForwardAvailable));
        await this._setIfChanged('speicher.regelung.balanceFeedForwardVerwendet', !!(active && ctx.feedForwardUsed));
        await this._setIfChanged('speicher.regelung.balanceFeedForwardSollW', active ? n(ctx.feedForwardTargetW) : null);
        await this._setIfChanged('speicher.regelung.balanceFeedForwardErwarteteIstW', active ? n(ctx.feedForwardExpectedActualW) : null);
        await this._setIfChanged('speicher.regelung.balanceFeedForwardPvW', active ? n(ctx.feedForwardPvW) : null);
        await this._setIfChanged('speicher.regelung.balanceFeedForwardLastW', active ? n(ctx.feedForwardLoadW) : null);
        await this._setIfChanged('speicher.regelung.balanceFeedForwardPvQuelle', active ? String(ctx.feedForwardPvSource || '') : '');
        await this._setIfChanged('speicher.regelung.balanceFeedForwardLastQuelle', active ? String(ctx.feedForwardLoadSource || '') : '');
        await this._setIfChanged('speicher.regelung.balanceFeedForwardGrund', active ? String(ctx.feedForwardReason || '') : '');
        await this._setIfChanged('speicher.regelung.balanceFeedForwardMessversatzMs', active ? n(ctx.feedForwardMeasurementSkewMs) : null);
        await this._setIfChanged('speicher.regelung.balanceFeedbackPlausibilitaetsfehlerW', active ? n(ctx.feedbackPlausibilityErrorW) : null);
        await this._setIfChanged('speicher.regelung.balanceFeedbackDurchFeedForwardVerworfen', !!(active && ctx.feedbackRejectedByFeedForward));
        const asyncDiag = active ? {
            active: !!ctx.asyncAnchorActive,
            reason: String(ctx.asyncAnchorReason || ''),
            controlKey: String(ctx.balanceControlKey || ''),
            feedbackKey: String(ctx.batteryFeedbackKey || ''),
            sampleTs: n(ctx.batterySampleTs),
            measuredW: n(ctx.measuredBatteryW),
            estimatedActualW: n(ctx.asyncEstimatedActualW),
            commandTargetW: n(ctx.asyncCommandTargetW),
            commandBaseActualW: n(ctx.asyncCommandBaseActualW),
            commandNvpW: n(ctx.asyncCommandNvpW),
            commandAcceptedMs: n(ctx.asyncCommandAcceptedMs),
            expectedStorageDeltaW: n(ctx.asyncExpectedStorageDeltaW, 0),
            observedNvpDeltaW: n(ctx.asyncObservedNvpDeltaW, 0),
            attributedStorageNvpDeltaW: n(ctx.asyncAttributedStorageNvpDeltaW, 0),
            attributedStoragePowerDeltaW: n(ctx.asyncAttributedStoragePowerDeltaW, 0),
            residualNvpDeltaW: n(ctx.asyncResidualNvpDeltaW, 0),
        } : {
            active: false,
            reason: 'inactive',
        };
        await this._setIfChanged('speicher.regelung.balanceAsyncAnchorAktiv', !!(active && ctx.asyncAnchorActive));
        await this._setIfChanged('speicher.regelung.balanceAsyncGeschaetzteIstleistungW', active ? n(ctx.asyncEstimatedActualW) : null);
        await this._setIfChanged('speicher.regelung.balanceAsyncRestNvpAenderungW', active ? n(ctx.asyncResidualNvpDeltaW, 0) : 0);
        await this._setIfChanged('speicher.regelung.balanceAsyncJson', JSON.stringify(asyncDiag));
    }

    /**
     * setzt, weil PV die Last deckt, oder ob ein NVP-begrenzter Assist aktiv ist.
     */
    async _setSungrowHybridDiag(ctx = {}) {
        const active = !!ctx.active;
        const n = (v, fallback = null) => (v === null || v === undefined || v === '')
            ? fallback
            : (Number.isFinite(Number(v)) ? Math.round(Number(v)) : fallback);
        await this._setIfChanged('speicher.regelung.sungrowHybridAktiv', active);
        await this._setIfChanged('speicher.regelung.sungrowHybridModus', String(ctx.mode || ''));
        await this._setIfChanged('speicher.regelung.sungrowHybridGrund', String(ctx.reason || ''));
        await this._setIfChanged('speicher.regelung.sungrowHybridSchreibmodus', String(ctx.writeMode || ''));
        await this._setIfChanged('speicher.regelung.sungrowHybridSollW', n(ctx.targetW, 0));
        await this._setIfChanged('speicher.regelung.sungrowHybridPvW', n(ctx.pvW, 0));
        await this._setIfChanged('speicher.regelung.sungrowHybridLastW', n(ctx.loadW, 0));
        await this._setIfChanged('speicher.regelung.sungrowHybridNvpW', n(ctx.nvpW));
        await this._setIfChanged('speicher.regelung.sungrowHybridImportW', n(ctx.importW, 0));
        await this._setIfChanged('speicher.regelung.sungrowHybridExportW', n(ctx.exportW, 0));
        await this._setIfChanged('speicher.regelung.sungrowHybridPvDecktLast', !!ctx.pvCoversLoad);
        await this._setIfChanged('speicher.regelung.sungrowHybridSchwelleW', n(ctx.thresholdW, 300));
        await this._setIfChanged('speicher.regelung.sungrowHybridLastReserveW', n(ctx.loadCoverReserveW, 300));
        await this._setIfChanged('speicher.regelung.sungrowHybridImportSchwelleW', n(ctx.dischargeThresholdW, 100));
        await this._setIfChanged('speicher.regelung.sungrowHybridNvpZielW', n(ctx.nvpTargetW, 100));
        await this._setIfChanged('speicher.regelung.sungrowHybridNvpDeadbandW', n(ctx.nvpDeadbandW, 100));
        await this._setIfChanged('speicher.regelung.sungrowHybridNvpFehlerW', n(ctx.nvpErrorW, 0));
        await this._setIfChanged('speicher.regelung.sungrowHybridNvpBalanceBasisW', n(ctx.nvpBalanceBaseW, 0));
        await this._setIfChanged('speicher.regelung.sungrowHybridNvpBalanceZielW', n(ctx.nvpBalanceTargetW, 0));
        await this._setIfChanged('speicher.regelung.sungrowHybridNvpBalanceAktiv', !!ctx.nvpBalanceNeeded);
    }

    /**
     * GRID_CHARGE. Standard-PV-Laden bleibt CHARGE; GRID_CHARGE wird nur fuer
     * Tarif-/Reserve-/LSK-Nachladung verwendet und muss im Herstellerprofil erlaubt sein.
     */
    _isE3dcGridChargeSource(source) {
        const s = String(source || '').trim().toLowerCase();
        return s === 'tarif'
            || s === 'tarif_grid_charge'
            || s === 'tarif-netzladen'
            || s === 'reserve'
            || s === 'reserve_grid'
            || s === 'reserve-netzladen'
            || s === 'lastspitze_refill'
            || s === 'lsk_refill'
            || s === 'grid_charge';
    }

    /**
     * ioBroker.e3dc-rscp-Datenpunkte EMS.SET_POWER_MODE und EMS.SET_POWER_VALUE.
     * deshalb schreibt NexoWatt den Modus zuerst und danach den Leistungswert. So
     * wird bei Richtungswechseln nicht kurz die alte Richtung mit neuem Wert gesendet.
     */
    async _writeE3dcRscpTargetW(targetW, reason, source, cfg = {}) {
        const w = Number.isFinite(Number(targetW)) ? Math.round(Number(targetW)) : 0;
        const absW = Math.max(0, Math.abs(w));
        const allowGridCharge = cfg.allowGridCharge !== false && cfg.e3dcAllowGridCharge === true;
        const gridCharge = !!(w < 0 && allowGridCharge && this._isE3dcGridChargeSource(source));
        const zeroModeRaw = String(cfg.e3dcZeroMode || 'normal').trim().toLowerCase();
        const zeroModeCode = zeroModeRaw === 'idle' ? 1 : 0;

        // ioBroker.e3dc-rscp / RSCP SET_POWER_MODE:
        // 0=NORMAL, 1=IDLE, 2=DISCHARGE, 3=CHARGE, 4=GRID_CHARGE.
        // Bei 0 W wird standardmaessig NORMAL geschrieben, damit E3/DC wieder seine
        // eigene Eigenverbrauchslogik fuehren kann. IDLE bleibt als Expertenoption
        // verfuegbar, wenn bewusst eine Batteriepause gewuenscht ist.
        const modeCode = w > 0 ? 2 : (w < 0 ? (gridCharge ? 4 : 3) : zeroModeCode);
        const modeName = ({ 0: 'NORMAL', 1: 'IDLE', 2: 'DISCHARGE', 3: 'CHARGE', 4: 'GRID_CHARGE' })[modeCode] || 'NORMAL';
        const writes = [];
        let ok = true;

        const writeNumber = async (key, value) => {
            try {
                const res = await this._writeStorageCommandNumber(key, value);
                writes.push({ key, value, result: res });
                if (res === false) ok = false;
                return res;
            } catch (_e) {
                writes.push({ key, value, result: false });
                ok = false;
                return false;
            }
        };
        const writeBoolean = async (key, value) => {
            try {
                const res = await this._writeStorageCommandBoolean(key, value);
                writes.push({ key, value: !!value, result: res });
                if (res === false) ok = false;
                return res;
            } catch (_e) {
                writes.push({ key, value: !!value, result: false });
                ok = false;
                return false;
            }
        };

        // Optional: E3/DC PowerLimits aktivieren und die Maximalwerte mitfuehren.
        // Diese DPs sind nicht fuer den normalen Zielwert erforderlich, schuetzen aber
        // Anlagen, bei denen E3/DC die gesetzten Limits nur mit POWER_LIMITS_USED=true
        // beachtet. Der Haken bleibt bewusst aus, bis der Installer ihn aktiviert.
        const useLimits = cfg.e3dcUsePowerLimits === true;
        const hasLimitFlag = !!(this.dp && this.dp.getEntry && this.dp.getEntry('st.e3dcPowerLimitsUsed'));
        const hasMaxCharge = !!(this.dp && this.dp.getEntry && this.dp.getEntry('st.e3dcMaxChargePowerW'));
        const hasMaxDischarge = !!(this.dp && this.dp.getEntry && this.dp.getEntry('st.e3dcMaxDischargePowerW'));
        if (useLimits && hasLimitFlag) await writeBoolean('st.e3dcPowerLimitsUsed', true);
        const cfgMaxChargeW = Number(cfg.maxChargeW);
        const cfgMaxDischargeW = Number(cfg.maxDischargeW);
        if (useLimits && hasMaxCharge && Number.isFinite(cfgMaxChargeW) && cfgMaxChargeW > 0) await writeNumber('st.e3dcMaxChargePowerW', Math.round(cfgMaxChargeW));
        if (useLimits && hasMaxDischarge && Number.isFinite(cfgMaxDischargeW) && cfgMaxDischargeW > 0) await writeNumber('st.e3dcMaxDischargePowerW', Math.round(cfgMaxDischargeW));

        await writeNumber('st.e3dcSetPowerMode', modeCode);
        await writeNumber('st.e3dcSetPowerValueW', absW);

        this._e3dcRscpLastMode = modeName;
        await this._setE3dcRscpDiag({
            active: true,
            mode: modeName,
            modeCode,
            valueW: absW,
            targetW: w,
            writeMode: 'set-power',
            reason: String(reason || ''),
            source: String(source || ''),
            gridCharge,
            zeroMode: zeroModeCode === 1 ? 'idle' : 'normal',
            powerLimitsUsed: useLimits,
            ok,
        });

        return { ok, modeCode, modeName, valueW: absW, targetW: w, gridCharge, powerLimitsUsed: useLimits, writes };
    }

    /**
     * ioBroker-Warnungen durch fehlende Objekte entstehen und der Installateur sieht,
     * welches SET_POWER-Tupel zuletzt geschrieben wurde.
     */
    async _setE3dcRscpDiag(ctx = {}) {
        const n = (v, def = 0) => Number.isFinite(Number(v)) ? Math.round(Number(v)) : def;
        await this._setIfChanged('speicher.regelung.e3dcRscpAktiv', !!ctx.active);
        await this._setIfChanged('speicher.regelung.e3dcRscpModus', String(ctx.mode || ''));
        await this._setIfChanged('speicher.regelung.e3dcRscpModeCode', n(ctx.modeCode, 0));
        await this._setIfChanged('speicher.regelung.e3dcRscpValueW', n(ctx.valueW, 0));
        await this._setIfChanged('speicher.regelung.e3dcRscpSollW', n(ctx.targetW, 0));
        await this._setIfChanged('speicher.regelung.e3dcRscpSchreibmodus', String(ctx.writeMode || ''));
        await this._setIfChanged('speicher.regelung.e3dcRscpQuelle', String(ctx.source || ''));
        await this._setIfChanged('speicher.regelung.e3dcRscpGrund', String(ctx.reason || ''));
        await this._setIfChanged('speicher.regelung.e3dcRscpGridCharge', !!ctx.gridCharge);
        await this._setIfChanged('speicher.regelung.e3dcRscpZeroMode', String(ctx.zeroMode || ''));
        await this._setIfChanged('speicher.regelung.e3dcRscpPowerLimitsUsed', !!ctx.powerLimitsUsed);
        await this._setIfChanged('speicher.regelung.e3dcRscpSchreibOk', ctx.ok === true);
    }

    async _buildFeneconHybridContext({
        cfg = {},
        staleMs = 15000,
        gridW = null,
        gridRawW = null,
        dcPvPowerW = null,
        dcPvPowerAgeMs = null,
        resolvedMode = 'direct-ess',
    } = {}) {
        const nowMs = Date.now();
        const effectiveStaleMs = Math.max(1000, strictFiniteNumber(staleMs, 15000));
        const nvpW = strictFiniteNumber(gridRawW, strictFiniteNumber(gridW, null));
        const readFresh = (key) => {
            if (!this.dp || typeof this.dp.getEntry !== 'function' || !this.dp.getEntry(key)) {
                return { value: null, ageMs: Number.POSITIVE_INFINITY, fresh: false };
            }
            const value = typeof this.dp.getNumberFresh === 'function'
                ? strictFiniteNumber(this.dp.getNumberFresh(key, effectiveStaleMs, null), null)
                : null;
            const ageMs = typeof this.dp.getAgeMs === 'function'
                ? strictFiniteNumber(this.dp.getAgeMs(key), Number.POSITIVE_INFINITY)
                : Number.POSITIVE_INFINITY;
            return {
                value,
                ageMs,
                fresh: value !== null && Number.isFinite(ageMs) && ageMs <= effectiveStaleMs,
            };
        };

        // Prioritaet: expliziter FENECON-Gesamtwert, sonst Summe der frischen
        // internen DC-/externen AC-PV, zuletzt der allgemeine DC-/Hybrid-PV-DP.
        // Produktionswerte werden als Betrag ausgewertet, weil Fremdadapter bei
        // der Vorzeichenkonvention uneinheitlich sind.
        const totalPv = readFresh('st.feneconPvTotalPowerW');
        const internalDcPv = readFresh('st.feneconPvDcPowerW');
        const externalAcPv = readFresh('st.feneconPvAcPowerW');
        const genericPvValue = strictFiniteNumber(dcPvPowerW, null);
        const genericPvAge = strictFiniteNumber(dcPvPowerAgeMs, Number.POSITIVE_INFINITY);
        const genericPv = {
            value: genericPvValue,
            ageMs: genericPvAge,
            fresh: genericPvValue !== null && Number.isFinite(genericPvAge) && genericPvAge <= effectiveStaleMs,
        };

        let pvW = null;
        let pvAgeMs = Number.POSITIVE_INFINITY;
        let pvSource = '';
        if (totalPv.fresh) {
            pvW = Math.max(0, Math.abs(totalPv.value));
            pvAgeMs = totalPv.ageMs;
            pvSource = 'st.feneconPvTotalPowerW';
        } else if (internalDcPv.fresh || externalAcPv.fresh) {
            pvW = Math.max(0,
                (internalDcPv.fresh ? Math.abs(internalDcPv.value) : 0)
                + (externalAcPv.fresh ? Math.abs(externalAcPv.value) : 0));
            pvAgeMs = Math.max(
                internalDcPv.fresh ? internalDcPv.ageMs : 0,
                externalAcPv.fresh ? externalAcPv.ageMs : 0,
            );
            pvSource = internalDcPv.fresh && externalAcPv.fresh
                ? 'st.feneconPvDcPowerW+st.feneconPvAcPowerW'
                : (internalDcPv.fresh ? 'st.feneconPvDcPowerW' : 'st.feneconPvAcPowerW');
        } else if (genericPv.fresh) {
            pvW = Math.max(0, Math.abs(genericPv.value));
            pvAgeMs = genericPv.ageMs;
            pvSource = 'st.dcPvPowerW';
        }
        const pvFresh = pvW !== null && Number.isFinite(pvAgeMs) && pvAgeMs <= effectiveStaleMs;

        const getEntry = (key) => (this.dp && typeof this.dp.getEntry === 'function') ? this.dp.getEntry(key) : null;
        const nativeEntry = getEntry('st.feneconGridSetpointW');
        const essActualEntry = getEntry('st.feneconEssActualPowerW');
        const signedEntry = getEntry('st.targetPowerW');
        const chargeEntry = getEntry('st.targetChargePowerW');
        const dischargeEntry = getEntry('st.targetDischargePowerW');
        const directTargetAvailable = !!(signedEntry || chargeEntry || dischargeEntry);
        const authority = resolveFeneconHybridAuthority({
            vendorProfile: this._getStorageVendorProfile(cfg),
            coupling: cfg.coupling,
            feneconControlMode: cfg.feneconControlMode,
            feneconGridSetpointObjectId: nativeEntry && nativeEntry.objectId,
            feneconEssActualPowerObjectId: essActualEntry && essActualEntry.objectId,
            setSignedPowerId: signedEntry && signedEntry.objectId,
            setChargePowerId: chargeEntry && chargeEntry.objectId,
            setDischargePowerId: dischargeEntry && dischargeEntry.objectId,
            feneconPvPassthroughThresholdW: strictFiniteNumber(cfg.feneconPvPassthroughThresholdW, 500),
            feneconPvReleaseThresholdW: strictFiniteNumber(cfg.feneconPvReleaseThresholdW, 500),
            feneconPvPassthroughDelaySec: strictFiniteNumber(cfg.feneconPvPassthroughDelaySec, 10),
            feneconPvReleaseDelaySec: strictFiniteNumber(cfg.feneconPvReleaseDelaySec, 120),
        }, {
            nowMs,
            pvW,
            pvFresh,
            previousAuthority: this._feneconHybridAuthority,
            pvAboveSinceMs: this._feneconHybridPvAboveSinceMs,
            pvBelowSinceMs: this._feneconHybridPvBelowSinceMs,
            writableStorageCount: 1,
            otherWritableStorageCount: 0,
            directTargetAvailable,
            nativeTargetWritable: !!nativeEntry,
        });

        this._feneconHybridPvAboveSinceMs = Math.max(0, strictFiniteNumber(authority.pvAboveSinceMs, 0));
        this._feneconHybridPvBelowSinceMs = Math.max(0, strictFiniteNumber(authority.pvBelowSinceMs, 0));
        const previousAuthority = String(this._feneconHybridAuthority || '').toLowerCase() === 'nexowatt'
            ? 'nexowatt'
            : 'fems';
        const nextAuthority = String(authority.authority || 'blocked');
        const lastExternalTargetW = strictFiniteNumber(this._lastTargetW, 0);

        // EOS -> FEMS: Ein noch aktiver Nicht-Null-Befehl wird einmal explizit
        // neutralisiert. Erst nach erfolgreichem 0-W-Write geht der Pfad in echtes
        // No-Write, damit kein alter Befehl bis zum API-Watchdog weiterwirkt.
        if (nextAuthority === 'fems') {
            if (previousAuthority === 'nexowatt'
                && (this._feneconHybridWasExternal || lastExternalTargetW !== 0)
                && lastExternalTargetW !== 0) {
                this._feneconHybridHandoverZeroPending = true;
            }
            if (this._feneconHybridHandoverZeroPending && lastExternalTargetW === 0) {
                this._feneconHybridHandoverZeroPending = false;
            }
        } else {
            this._feneconHybridHandoverZeroPending = false;
        }
        this._feneconHybridAuthority = nextAuthority;

        const handoverZeroRequired = nextAuthority === 'fems' && this._feneconHybridHandoverZeroPending === true;
        const technicalMode = String(resolvedMode || authority.mode || 'direct-ess');
        return {
            active: true,
            configured: true,
            farmBlocked: false,
            mode: technicalMode,
            technicalMode,
            requestedMode: authority.requestedMode,
            authority: nextAuthority,
            writeMode: handoverZeroRequired
                ? 'write-handover-zero'
                : (nextAuthority === 'fems'
                    ? 'no-write-fems-self'
                    : (nextAuthority === 'blocked'
                        ? 'write-stop-invalid-config'
                        : (technicalMode === 'fems-grid' ? 'write-fems-grid-eos' : 'write-direct-ess-eos'))),
            reason: String(authority.reason || ''),
            pvW,
            pvAgeMs: Number.isFinite(pvAgeMs) ? pvAgeMs : null,
            pvSource: pvSource || 'missing',
            pvFresh,
            thresholdW: strictFiniteNumber(authority.onThresholdW, 500),
            releaseThresholdW: strictFiniteNumber(authority.offThresholdW, 500),
            takeoverDelayMs: strictFiniteNumber(authority.onDelayMs, 10000),
            releaseDelayMs: strictFiniteNumber(authority.offDelayMs, 120000),
            pvAboveSinceMs: strictFiniteNumber(authority.pvAboveSinceMs, 0),
            pvAboveForMs: strictFiniteNumber(authority.pvAboveForMs, 0),
            pvBelowSinceMs: strictFiniteNumber(authority.pvBelowSinceMs, 0),
            pvBelowForMs: strictFiniteNumber(authority.pvBelowForMs, 0),
            transitionPending: authority.transitionPending === true,
            handoverZeroRequired,
            noWrite: authority.noWrite === true && !handoverZeroRequired,
            nvpW,
            importW: nvpW !== null ? Math.max(0, nvpW) : 0,
            exportW: nvpW !== null ? Math.max(0, -nvpW) : 0,
            dayOrPvActive: pvFresh && pvW > strictFiniteNumber(authority.onThresholdW, 500),
            additionalPvW: 0,
            additionalThresholdW: null,
            forecastW: 0,
            forecastSource: 'not-used-for-authority',
            assistActive: false,
            assistImportThresholdW: null,
        };
    }

    /**
     * RC42: Read-only Shadow fuer die kuenftig vereinfachte FENECON-NVP-
     * Regelung. Der produktive Writer, die Reglerhoheit und alle RC41-
     * Sicherheitsgrenzen bleiben unveraendert. Diese Methode liest nur bereits
     * gemappte Messwerte und schreibt ausschliesslich interne Diagnose-States.
     * Ein Fehler im Shadow darf den laufenden Speicher-Tick niemals abbrechen.
     */
    async _updateFeneconNvpShadow(ctx = {}) {
        return updateFeneconNvpShadowRuntime(this, ctx);
    }

    /**
     */
    async _setFeneconHybridDiag(ctx = {}) {
        const active = !!ctx.active;
        const mode = String(ctx.mode || '');
        const reason = String(ctx.reason || '');
        const writeMode = String(ctx.writeMode || '');
        const noWrite = ctx.noWrite === true;
        /**
         * Zusammenhang: Gehört zu EMS-Modul (Regelungs-, Diagnose- oder Beratungslogik innerhalb der EMS-Engine) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
         * Wartung/TypeScript: Änderungen können LIVE-Energiefluss, aktuelle Werte und History beeinflussen; DP-Fallbacks nur mit Regressionstest ändern. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
         */
        const n = (v, fallback = null) => {
            const parsed = strictFiniteNumber(v, null);
            return parsed === null ? fallback : Math.round(parsed);
        };
        await this._setIfChanged('speicher.regelung.feneconHybridAktiv', active);
        await this._setIfChanged('speicher.regelung.feneconHybridModus', mode);
        await this._setIfChanged('speicher.regelung.feneconHybridGrund', reason);
        await this._setIfChanged('speicher.regelung.feneconHybridSchreibmodus', writeMode);
        await this._setIfChanged('speicher.regelung.feneconHybridPvW', n(ctx.pvW));
        await this._setIfChanged('speicher.regelung.feneconHybridZusatzPvW', n(ctx.additionalPvW, 0));
        await this._setIfChanged('speicher.regelung.feneconHybridSchwelleW', n(ctx.thresholdW));
        await this._setIfChanged('speicher.regelung.feneconHybridZusatzSchwelleW', n(ctx.additionalThresholdW));
        await this._setIfChanged('speicher.regelung.feneconHybridSollW', n(ctx.targetW, 0));
        await this._setIfChanged('speicher.regelung.feneconHybridNvpW', n(ctx.nvpW));
        await this._setIfChanged('speicher.regelung.feneconHybridForecastW', n(ctx.forecastW, 0));
        await this._setIfChanged('speicher.regelung.feneconHybridForecastQuelle', String(ctx.forecastSource || ''));
        await this._setIfChanged('speicher.regelung.feneconHybridTagAktiv', !!ctx.dayOrPvActive);
        await this._setIfChanged('speicher.regelung.feneconHybridAssistAktiv', !!ctx.assistActive);
        await this._setIfChanged('speicher.regelung.feneconHybridAssistSchwelleW', n(ctx.assistImportThresholdW, 800));
        await this._setIfChanged('speicher.regelung.feneconHybridRegelhoheit', String(ctx.authority || (noWrite ? 'fems' : 'nexowatt')));
        await this._setIfChanged('speicher.regelung.feneconHybridNoWrite', noWrite);
        await this._setIfChanged('speicher.regelung.feneconHybridPvFrisch', ctx.pvFresh === true);
        await this._setIfChanged('speicher.regelung.feneconHybridPvQuelle', String(ctx.pvSource || ''));
        await this._setIfChanged('speicher.regelung.feneconHybridPvAlterMs', n(ctx.pvAgeMs));
        await this._setIfChanged('speicher.regelung.feneconHybridFreigabeSchwelleW', n(ctx.releaseThresholdW, 500));
        await this._setIfChanged('speicher.regelung.feneconHybridFreigabeVerzoegerungMs', n(ctx.releaseDelayMs, 120000));
        await this._setIfChanged('speicher.regelung.feneconHybridUebergabeVerzoegerungMs', n(ctx.takeoverDelayMs, 10000));
        await this._setIfChanged('speicher.regelung.feneconHybridPvUeberSchwelleSeitMs', n(ctx.pvAboveSinceMs, 0));
        await this._setIfChanged('speicher.regelung.feneconHybridPvUeberSchwelleDauerMs', n(ctx.pvAboveForMs, 0));
        await this._setIfChanged('speicher.regelung.feneconHybridPvUnterSchwelleSeitMs', n(ctx.pvBelowSinceMs, 0));
        await this._setIfChanged('speicher.regelung.feneconHybridPvUnterSchwelleDauerMs', n(ctx.pvBelowForMs, 0));
        await this._setIfChanged('speicher.regelung.feneconHybridHandoverZeroPending', ctx.handoverZeroRequired === true);

        // Im nativen FEMS-NVP-Modus werden die feneconGrid*-States vom
        // tatsächlichen Writer gepflegt. In allen anderen Modi bleiben sie
        // neutral, damit keine parallele Netzpunktführung suggeriert wird.
        if (mode !== 'fems-grid' || noWrite) {
            await this._setIfChanged('speicher.regelung.feneconGridAktiv', false);
            await this._setIfChanged('speicher.regelung.feneconGridQuelle', 'inactive');
            await this._setIfChanged('speicher.regelung.feneconGridGrund', reason);
            await this._setIfChanged('speicher.regelung.feneconGridSchreibOk', noWrite ? true : false);
            await this._setIfChanged('speicher.regelung.feneconGridSchreibStatus', noWrite ? 'no-write-fems-authority' : (active ? 'direct-ess' : 'inactive'));
        }
    }

    /**
     * Code-Teil: Methode `_setHoldNoWriteTargetDiag`
     * Zweck: Dokumentiert einen bewussten No-Write-Zyklus, ohne den letzten
     * erfolgreichen Speicher-Sollwert intern zu verlieren.
     * Zusammenhang: Wird bei kurzen Sungrow-NVP-Aussetzern und echtem Hersteller-
     * Leerlauf genutzt. Anders als FENECON-No-Write darf dieser Pfad die laufende
     * externe Vorgabe nicht auf 0 zuruecksetzen.
     * TypeScript-Hinweis: Zielwert und Status bleiben Diagnosewerte; es erfolgt
     * ausdruecklich kein Schreibzugriff auf signed-, Split-, Run- oder Farm-DPs.
     */
    async _setHoldNoWriteTargetDiag(targetW, reason, source, status) {
        const requestedW = Number.isFinite(Number(targetW)) ? Math.round(Number(targetW)) : 0;
        const lastSuccessfulW = Number.isFinite(Number(this._lastTargetW)) ? Math.round(Number(this._lastTargetW)) : 0;
        const visibleW = requestedW !== 0 ? requestedW : lastSuccessfulW;
        try {
            const e = (this.dp && this.dp.getEntry) ? this.dp.getEntry('st.targetPowerW') : null;
            await this._setIfChanged('speicher.regelung.targetObjId', e && e.objectId ? String(e.objectId) : '');
        } catch {
            await this._setIfChanged('speicher.regelung.targetObjId', '');
        }
        await this._setIfChanged('speicher.regelung.lastWriteRaw', null);
        await this._setIfChanged('speicher.regelung.lastWriteSplitJson', null);
        await this._setIfChanged('speicher.regelung.sollW', visibleW);
        await this._setIfChanged('speicher.regelung.acceptedSollW', lastSuccessfulW);
        await this._setIfChanged('speicher.regelung.commandEffective', false);
        await this._setIfChanged('speicher.regelung.requestSatisfied', false);
        await this._setIfChanged('speicher.regelung.partiallyAccepted', false);
        await this._setIfChanged('speicher.regelung.evcsAssistAcceptedW', 0);
        await this._setIfChanged('speicher.regelung.evcsAssistAcceptedTs', Date.now());
        await this._setIfChanged('speicher.regelung.evcsAssistAcceptedTopology', '');
        await this._setIfChanged('speicher.regelung.evcsAssistAcceptedSource', '');
        await this._setIfChanged('speicher.regelung.quelle', String(source || this._lastSource || ''));
        await this._setIfChanged('speicher.regelung.grund', String(reason || 'No-Write: letzten Sollwert halten'));
        await this._setIfChanged('speicher.regelung.schreibOk', false);
        await this._setIfChanged('speicher.regelung.schreibStatus', String(status || 'no-write-hold'));

        // Absichtlich keine Aenderung an _lastTargetW/_lastTargetWriteMs. Diese
        // Werte repraesentieren den letzten real geschriebenen Befehl und werden
        // im naechsten NVP-Zyklus wieder als Halte-/Einschwingbasis benoetigt.
    }

    /**
     * Code-Teil: Methode `_setNoWriteTargetDiag`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _setNoWriteTargetDiag
     * Zweck: Schreibt interne States oder veröffentlichte Runtime-Werte.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _setNoWriteTargetDiag(targetW, reason, source, status) {
        const w = Number.isFinite(Number(targetW)) ? Math.round(Number(targetW)) : 0;
        try {
            const e = (this.dp && this.dp.getEntry) ? this.dp.getEntry('st.targetPowerW') : null;
            await this._setIfChanged('speicher.regelung.targetObjId', e && e.objectId ? String(e.objectId) : '');
        } catch {
            await this._setIfChanged('speicher.regelung.targetObjId', '');
        }
        await this._setIfChanged('speicher.regelung.lastWriteRaw', null);
        await this._setIfChanged('speicher.regelung.lastWriteSplitJson', null);
        await this._setIfChanged('speicher.regelung.sollW', w);
        await this._setIfChanged('speicher.regelung.acceptedSollW', 0);
        await this._setIfChanged('speicher.regelung.commandEffective', false);
        await this._setIfChanged('speicher.regelung.requestSatisfied', false);
        await this._setIfChanged('speicher.regelung.partiallyAccepted', false);
        await this._setIfChanged('speicher.regelung.evcsAssistAcceptedW', 0);
        await this._setIfChanged('speicher.regelung.evcsAssistAcceptedTs', Date.now());
        await this._setIfChanged('speicher.regelung.evcsAssistAcceptedTopology', '');
        await this._setIfChanged('speicher.regelung.evcsAssistAcceptedSource', '');
        await this._setIfChanged('speicher.regelung.quelle', String(source || ''));
        await this._setIfChanged('speicher.regelung.grund', String(reason || ''));
        await this._setIfChanged('speicher.regelung.schreibOk', false);
        await this._setIfChanged('speicher.regelung.schreibStatus', String(status || 'no-write'));
        this._lastTargetW = 0;
        this._lastTargetWriteMs = 0;
        this._lastReason = String(reason || '');
        this._lastSource = String(source || '');
    }

    /**
     * Code-Teil: Methode `_getFeneconGridSetpointW`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    _getFeneconGridLastWriteMs() {
        const candidates = [Number(this._feneconGridLastWriteMs) || 0];
        try {
            const cache = this.adapter && this.adapter.stateCache;
            const rec = cache && cache['speicher.regelung.feneconGridLastWriteMs'];
            const raw = rec && (rec.value !== undefined ? rec.value : rec.val);
            const n = Number(raw);
            if (Number.isFinite(n) && n > 0) candidates.push(n);
        } catch (_e) {}
        return Math.max(0, ...candidates);
    }

    _getFeneconApiTimeoutMs(cfg = {}) {
        const sec = Number(cfg && cfg.feneconApiTimeoutSec);
        const effectiveSec = Number.isFinite(sec) ? Math.max(5, Math.min(300, sec)) : 60;
        return Math.round(effectiveSec * 1000);
    }

    _getFeneconNativeHandoverWait(cfg = {}) {
        if (!this._feneconGridWasActive && this._lastStorageCommandFamily !== 'fenecon-fems-grid') {
            const persisted = this._getFeneconGridLastWriteMs();
            if (!persisted) return { active: false, remainingMs: 0, lastWriteMs: 0, timeoutMs: this._getFeneconApiTimeoutMs(cfg) };
        }
        const lastWriteMs = this._getFeneconGridLastWriteMs();
        const timeoutMs = this._getFeneconApiTimeoutMs(cfg);
        if (!lastWriteMs) return { active: false, remainingMs: 0, lastWriteMs: 0, timeoutMs };
        const remainingMs = Math.max(0, timeoutMs - (Date.now() - lastWriteMs));
        return { active: remainingMs > 0, remainingMs, lastWriteMs, timeoutMs };
    }

    _getFeneconGridSetpointW(cfg = {}) {
        const configured = String(
            (cfg && cfg.datapoints && cfg.datapoints.feneconGridSetpointObjectId)
            || (cfg && cfg.feneconGridSetpointObjectId)
            || '',
        ).trim();
        if (configured) return configured;
        const entry = this.dp && this.dp.getEntry ? this.dp.getEntry('st.feneconGridSetpointW') : null;
        return entry && entry.objectId ? String(entry.objectId).trim() : '';
    }

    async _releaseDirectStorageTargetForFenecon(reason = '') {
        const getEntry = (key) => (this.dp && this.dp.getEntry) ? this.dp.getEntry(key) : null;
        const release = await this._ensureStorageAlternativeTargetsNeutral([
            { key: 'st.targetPowerW', entry: getEntry('st.targetPowerW') },
            { key: 'st.targetChargePowerW', entry: getEntry('st.targetChargePowerW') },
            { key: 'st.targetDischargePowerW', entry: getEntry('st.targetDischargePowerW') },
            { key: 'st.e3dcSetPowerMode', entry: getEntry('st.e3dcSetPowerMode') },
            { key: 'st.e3dcSetPowerValueW', entry: getEntry('st.e3dcSetPowerValueW') },
        ], { familyChanged: true });
        this._feneconGridReleasedDirectTarget = release.ok === true;
        await this._setIfChanged('speicher.regelung.feneconGridReleaseStatus', release.ok
            ? ('direkte Sollwerte neutralisiert' + (reason ? ': ' + String(reason) : ''))
            : ('Freigabe fehlgeschlagen' + (reason ? ': ' + String(reason) : '')));
        return release;
    }

    async _applyFeneconGridSetpointW(targetW, reason, source, opts = {}) {
        const valueW = Number.isFinite(Number(targetW)) ? Math.round(Number(targetW)) : 0;
        const entry = this.dp && this.dp.getEntry ? this.dp.getEntry('st.feneconGridSetpointW') : null;
        const objectId = entry && entry.objectId ? String(entry.objectId).trim() : '';
        if (!entry || !objectId) {
            await this._setIfChanged('speicher.regelung.feneconGridAktiv', false);
            await this._setIfChanged('speicher.regelung.feneconGridSollW', valueW);
            await this._setIfChanged('speicher.regelung.feneconGridQuelle', String(source || 'fenecon'));
            await this._setIfChanged('speicher.regelung.feneconGridGrund', 'FEMS-NVP-Ziel-DP fehlt');
            await this._setIfChanged('speicher.regelung.feneconGridSchreibOk', false);
            await this._setIfChanged('speicher.regelung.feneconGridSchreibStatus', 'target-missing');
            await this._setIfChanged('speicher.regelung.feneconGridTargetObjId', '');
            return { ok: false, wrote: false, status: 'target-missing', objectId: '', valueW };
        }

        let writeResult = false;
        try {
            writeResult = await this._writeStorageCommandNumber('st.feneconGridSetpointW', valueW, { force: opts.force === true });
        } catch (_e) {
            writeResult = false;
        }
        const verify = await this._verifyStorageCommandDatapoints([
            { key: 'st.feneconGridSetpointW', entry, type: 'number', value: valueW, role: 'fenecon-fems-grid-target' },
        ], { attempts: 3, delayMs: 30 });
        const ok = writeResult !== false && (!verify.supported || verify.ok === true);
        if (ok) {
            // Ein idempotent übersprungener Write (`null`) bestätigt den aktuellen
            // DP-Wert, startet den FEMS-API-Watchdog aber nicht neu. Nur ein real
            // ausgeführter Write darf den Handover-Zeitpunkt aktualisieren.
            if (writeResult === true) {
                this._feneconGridLastWriteMs = Date.now();
                await this._setIfChanged('speicher.regelung.feneconGridLastWriteMs', this._feneconGridLastWriteMs);
            }
            this._feneconGridLastSetpointW = valueW;
            this._feneconGridWasActive = true;
        }
        await this._setIfChanged('speicher.regelung.feneconGridAktiv', ok);
        await this._setIfChanged('speicher.regelung.feneconGridSollW', valueW);
        await this._setIfChanged('speicher.regelung.feneconGridQuelle', String(source || 'fenecon'));
        await this._setIfChanged('speicher.regelung.feneconGridGrund', String(reason || 'FEMS-NVP-Regler'));
        await this._setIfChanged('speicher.regelung.feneconGridSchreibOk', ok);
        await this._setIfChanged(
            'speicher.regelung.feneconGridSchreibStatus',
            ok ? (writeResult === true ? 'confirmed' : 'confirmed-unchanged') : (verify && verify.status ? String(verify.status) : 'write-failed'),
        );
        await this._setIfChanged('speicher.regelung.feneconGridTargetObjId', objectId);
        await this._setIfChanged('speicher.regelung.feneconGridLastWriteRaw', valueW);
        return {
            ok,
            wrote: writeResult === true,
            skipped: writeResult === null,
            status: ok ? (writeResult === true ? 'confirmed' : 'confirmed-unchanged') : 'write-failed',
            objectId,
            valueW,
            verify,
        };
    }

    /**
     * Code-Teil: Methode `_readTarifVis`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readTarifVis
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _readTarifVis(staleMs) {
        const aktiv = this.dp ? this.dp.getBoolean('vis.settings.dynamicTariff', false) : false;
        const aktivVal = !!aktiv;
        const aktivAge = this.dp ? this.dp.getAgeMs('vis.settings.dynamicTariff') : null;
        const aktivFresh = (aktivAge === null || aktivAge === undefined) ? true : (aktivAge <= staleMs);

        const modus = this.dp ? this.dp.getNumberFresh('vis.settings.tariffMode', staleMs, null) : null;
        const storageW = this.dp ? this.dp.getNumberFresh('vis.settings.storagePower', staleMs, null) : null;

        return {
            aktiv: aktivFresh && aktivVal,
            modus: (typeof modus === 'number') ? Math.round(modus) : null,
            storageW: (typeof storageW === 'number') ? storageW : null,
        };
    }

    /**
     * Berechnet den Rohwert, den der DatapointRegistry-Writer fuer einen
     * physischen Speicherbefehl tatsaechlich auf den Fremd-DP schreibt.
     */
    _storageCommandExpectedRaw(entry, physicalValue, type = 'number') {
        if (!entry) return null;
        if (type === 'boolean') {
            const physical = !!physicalValue;
            return { physical, raw: entry.invert ? !physical : physical };
        }

        let physical = Number(physicalValue);
        if (!Number.isFinite(physical)) return null;
        if (typeof entry.min === 'number' && Number.isFinite(entry.min)) physical = Math.max(entry.min, physical);
        if (typeof entry.max === 'number' && Number.isFinite(entry.max)) physical = Math.min(entry.max, physical);

        const scale = Number.isFinite(Number(entry.scale)) && Number(entry.scale) !== 0 ? Number(entry.scale) : 1;
        const offset = Number.isFinite(Number(entry.offset)) ? Number(entry.offset) : 0;
        let raw = (physical - offset) / scale;
        if (entry.invert) raw = -raw;
        if (Number.isFinite(Number(entry.unitScale)) && Number(entry.unitScale) !== 0 && Number(entry.unitScale) !== 1) {
            raw /= Number(entry.unitScale);
        }
        return { physical, raw };
    }

    _storageCommandBoolean(raw) {
        if (raw === true || raw === 1 || raw === '1') return true;
        if (raw === false || raw === 0 || raw === '0') return false;
        const text = String(raw === null || raw === undefined ? '' : raw).trim().toLowerCase();
        if (['true', 'on', 'enabled', 'yes', 'ja'].includes(text)) return true;
        if (['false', 'off', 'disabled', 'no', 'nein'].includes(text)) return false;
        return null;
    }

    async _readStorageCommandRaw(key, entry) {
        const objectId = entry && entry.objectId ? String(entry.objectId).trim() : '';
        if (!objectId) return { supported: false, objectId: '', raw: null, reason: 'no-object-id' };

        if (this.adapter && typeof this.adapter.getForeignStateAsync === 'function') {
            try {
                const state = await this.adapter.getForeignStateAsync(objectId);
                if (!state || !Object.prototype.hasOwnProperty.call(state, 'val')) {
                    return { supported: true, objectId, raw: null, reason: 'state-missing', ts: null, ack: null };
                }
                return {
                    supported: true,
                    objectId,
                    raw: state.val,
                    reason: '',
                    ts: Number.isFinite(Number(state.ts)) ? Number(state.ts) : null,
                    ack: typeof state.ack === 'boolean' ? state.ack : null,
                };
            } catch (error) {
                return {
                    supported: true,
                    objectId,
                    raw: null,
                    reason: `read-error:${error && error.message ? error.message : String(error)}`,
                    ts: null,
                    ack: null,
                };
            }
        }

        if (this.dp && typeof this.dp.getRaw === 'function') {
            try {
                const raw = this.dp.getRaw(key);
                if (raw === null || raw === undefined) return { supported: false, objectId, raw: null, reason: 'cache-unavailable' };
                return { supported: true, objectId, raw, reason: '', ts: null, ack: null };
            } catch (_error) {
                return { supported: false, objectId, raw: null, reason: 'cache-read-error' };
            }
        }

        return { supported: false, objectId, raw: null, reason: 'readback-not-supported' };
    }

    async _verifyStorageCommandDatapoints(expectations = [], options = {}) {
        const attempts = Math.max(1, Math.min(3, Number(options.attempts) || 2));
        const delayMs = Math.max(0, Math.min(100, Number(options.delayMs) || 20));
        const unique = new Map();
        for (const expectation of Array.isArray(expectations) ? expectations : []) {
            if (!expectation || !expectation.entry) continue;
            const objectId = String(expectation.entry.objectId || '').trim();
            if (!objectId) continue;
            unique.set(objectId, { ...expectation, objectId });
        }
        const items = Array.from(unique.values());
        if (!items.length) return { supported: false, ok: true, status: 'no-command-dps', rows: [], attempts: 0 };

        let finalRows = [];
        for (let attempt = 1; attempt <= attempts; attempt++) {
            finalRows = [];
            for (const item of items) {
                const type = item.type === 'boolean' ? 'boolean' : 'number';
                const expected = this._storageCommandExpectedRaw(item.entry, item.value, type);
                const current = await this._readStorageCommandRaw(item.key, item.entry);
                let ok = false;
                let actual = current.raw;
                let reason = current.reason || '';

                if (!current.supported) {
                    reason = reason || 'readback-not-supported';
                } else if (!expected) {
                    reason = 'invalid-expectation';
                } else if (type === 'boolean') {
                    const actualBool = this._storageCommandBoolean(actual);
                    ok = actualBool !== null && actualBool === expected.raw;
                    if (!ok && !reason) reason = 'boolean-mismatch';
                } else {
                    const actualNumber = typeof actual === 'number'
                        ? actual
                        : Number(String(actual === null || actual === undefined ? '' : actual).trim().replace(',', '.'));
                    const expectedNumber = Number(expected.raw);
                    const tolerance = Math.max(0.000001, Math.abs(expectedNumber) * 0.000001);
                    ok = Number.isFinite(actualNumber) && Number.isFinite(expectedNumber)
                        && Math.abs(actualNumber - expectedNumber) <= tolerance;
                    if (!ok && !reason) reason = Number.isFinite(actualNumber) ? 'number-mismatch' : 'value-missing';
                    actual = Number.isFinite(actualNumber) ? actualNumber : current.raw;
                }

                finalRows.push({
                    key: String(item.key || ''),
                    objectId: item.objectId,
                    type,
                    role: String(item.role || ''),
                    expectedPhysical: expected ? expected.physical : null,
                    expectedRaw: expected ? expected.raw : null,
                    actualRaw: actual,
                    supported: current.supported === true,
                    ok,
                    reason,
                    ts: current.ts || null,
                    ack: current.ack,
                });
            }

            const supportedRows = finalRows.filter((row) => row.supported);
            const supportedMismatches = supportedRows.filter((row) => !row.ok);
            if (!supportedMismatches.length) {
                const unsupportedRows = finalRows.filter((row) => !row.supported);
                return {
                    supported: supportedRows.length > 0,
                    ok: true,
                    status: supportedRows.length === 0
                        ? 'unavailable'
                        : (unsupportedRows.length ? 'partial-confirmed' : 'confirmed'),
                    rows: finalRows,
                    attempts: attempt,
                };
            }
            if (attempt < attempts && delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
        }

        const supportedRows = finalRows.filter((row) => row.supported);
        const unsupportedRows = finalRows.filter((row) => !row.supported);
        return {
            supported: supportedRows.length > 0,
            ok: supportedRows.every((row) => row.ok),
            status: unsupportedRows.length ? 'partial-mismatch' : 'mismatch',
            rows: finalRows,
            attempts,
        };
    }

    _clearStorageCommandWriteCache(entry) {
        const objectId = entry && entry.objectId ? String(entry.objectId).trim() : '';
        if (!objectId || !this.dp || !(this.dp.lastWriteByObjectId instanceof Map)) return;
        this.dp.lastWriteByObjectId.delete(objectId);
    }

    async _writeStorageCommandNumber(key, value, options = {}) {
        const entry = this.dp && typeof this.dp.getEntry === 'function' ? this.dp.getEntry(key) : null;
        if (!entry || !this.dp || typeof this.dp.writeNumber !== 'function') return false;
        if (options.force === true) {
            this._clearStorageCommandWriteCache(entry);
        } else {
            const pre = await this._verifyStorageCommandDatapoints([{ key, entry, type: 'number', value }], { attempts: 1, delayMs: 0 });
            if (pre.supported && !pre.ok) this._clearStorageCommandWriteCache(entry);
        }
        return this.dp.writeNumber(key, value, false);
    }

    async _writeStorageCommandBoolean(key, value, options = {}) {
        const entry = this.dp && typeof this.dp.getEntry === 'function' ? this.dp.getEntry(key) : null;
        if (!entry || !this.dp || typeof this.dp.writeBoolean !== 'function') return false;
        if (options.force === true) {
            this._clearStorageCommandWriteCache(entry);
        } else {
            const pre = await this._verifyStorageCommandDatapoints([{ key, entry, type: 'boolean', value }], { attempts: 1, delayMs: 0 });
            if (pre.supported && !pre.ok) this._clearStorageCommandWriteCache(entry);
        }
        return this.dp.writeBoolean(key, value, false);
    }

    async _ensureStorageAlternativeTargetsNeutral(entries = [], options = {}) {
        const unique = new Map();
        for (const item of Array.isArray(entries) ? entries : []) {
            if (!item || !item.entry) continue;
            const objectId = String(item.entry.objectId || '').trim();
            if (!objectId || unique.has(objectId)) continue;
            unique.set(objectId, item);
        }
        const items = Array.from(unique.values());
        if (!items.length) return { ok: true, status: 'none', rows: [] };

        const familyChanged = options.familyChanged === true;
        const rows = [];
        let ok = true;
        for (const item of items) {
            const expectation = { key: item.key, entry: item.entry, type: 'number', value: 0 };
            const before = await this._verifyStorageCommandDatapoints([expectation], { attempts: 1, delayMs: 0 });
            if (before.supported && before.ok) {
                rows.push({ key: item.key, objectId: item.entry.objectId, action: 'already-neutral', readback: before });
                continue;
            }
            if (!before.supported && !familyChanged) {
                rows.push({ key: item.key, objectId: item.entry.objectId, action: 'unverified-unchanged', readback: before });
                continue;
            }

            let writeResult = false;
            try {
                writeResult = await this._writeStorageCommandNumber(item.key, 0, { force: true });
            } catch (_error) {
                writeResult = false;
            }
            const after = await this._verifyStorageCommandDatapoints([expectation], { attempts: 2, delayMs: 20 });
            const rowOk = writeResult !== false && (!after.supported || after.ok);
            if (!rowOk) ok = false;
            rows.push({
                key: item.key,
                objectId: item.entry.objectId,
                action: 'neutralize',
                writeResult,
                ok: rowOk,
                readback: after,
            });
        }
        return { ok, status: ok ? 'neutral' : 'release-failed', rows };
    }

    /**
     * Code-Teil: Methode `_applyTargetW`
     * Zweck: überträgt neue Werte in UI/States oder synchronisiert interne Datenstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _applyTargetW
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _applyTargetW(targetW, reason, source, options = {}) {
        const evcsAssistReqW = strictFiniteNumber(options && options.evcsAssistReqW, null) !== null
            ? Math.max(0, Math.round(strictFiniteNumber(options.evcsAssistReqW, 0)))
            : 0;
        const parsedTargetW = strictFiniteNumber(targetW, null);
        if (parsedTargetW === null) {
            await this._setIfChanged('speicher.regelung.sollW', null);
            await this._setIfChanged('speicher.regelung.acceptedSollW', null);
            await this._setIfChanged('speicher.regelung.schreibOk', false);
            await this._setIfChanged('speicher.regelung.schreibStatus', 'ungueltiger-sollwert');
            await this._setIfChanged('speicher.regelung.quelle', String(source || ''));
            await this._setIfChanged('speicher.regelung.grund', String(reason || 'Speicher-Sollwert fehlt oder ist ungueltig'));
            return;
        }
        const requestedStorageTargetW = Math.round(parsedTargetW);
        let w = requestedStorageTargetW;
        const mesh = this.adapter?._meshCoordinator?.currentLimits();
        if (mesh?.required) {
            const sample = this.adapter._meshCoordinator.sample();
            const actual = sample.controlledW?.dischargeW;
            const exportHeadroom = sample.quality === 'ok' && Number.isFinite(actual) ? Math.max(0, actual + sample.gridW + mesh.limits.exportW) : 0;
            w = w < 0 ? -Math.min(-w, mesh.limits.chargeW) : Math.min(w, mesh.limits.dischargeW, exportHeadroom);
        }
        const cfg = this._getCfg();
        const storageAuthority = this._getStorageControlAuthority();
        const selectedTopology = String(storageAuthority.selectedTopology || 'none');
        const controlModeRaw = String(cfg.controlMode || 'targetPower');
        const controlMode = ['targetPower', 'limits', 'enableFlags'].includes(controlModeRaw) ? controlModeRaw : 'targetPower';

        // RC39: Die Speicher-Hardware erhält unmittelbar vor der Ausgabe eine
        // zweite, unabhängige Safety-Prüfung. Bei ungültiger Inbetriebnahme,
        // stale NVP/Phasen oder §14a-Nullstopp wird jede Nicht-Null-Vorgabe
        // kontrolliert auf 0 W geklemmt. Netzladen wird zusätzlich gegen den
        // aktuell verbleibenden Anschluss-/§14a-Rahmen begrenzt.
        let storageSafetyDecision = null;
        let storageSafetyForcedStop = false;
        let storageSafetyReason = '';
        if (this.adapter && (this.adapter._nwSafetyEnvelopeRequired === true || this.adapter._emsSafetyCycle || this.adapter.emsEngine)) {
            let envelope = null;
            try {
                envelope = liveSafetyEnvelope(this.adapter, this.dp, {
                    now: Date.now(),
                    generation: this.adapter?._emsSafetyCycle?.generation,
                });
            } catch (error) {
                envelope = invalidateSafetyEnvelope(this.adapter, `storage-live-safety-build-failed:${String(error && error.message || error)}`, {
                    generation: this.adapter?._emsSafetyCycle?.generation,
                    now: Date.now(),
                    emergencyStop: true,
                });
            }
            const safetySampleAgeMs = Number.isFinite(Number(this._safetyStorageActualTs))
                ? Math.max(0, Date.now() - Number(this._safetyStorageActualTs))
                : null;
            const safetyStaleMs = Math.max(1000, Number(envelope && envelope.grid && envelope.grid.staleMs) || 30000);
            const actualSampleFresh = this._safetyStorageActualFresh === true
                && safetySampleAgeMs !== null
                && safetySampleAgeMs <= safetyStaleMs
                && Number.isFinite(Number(this._safetyStorageActualPowerW));
            const actualStoragePowerW = actualSampleFresh ? Number(this._safetyStorageActualPowerW) : null;
            const actualChargeRaw = actualStoragePowerW === null ? null : Math.max(0, -actualStoragePowerW);
            const previousSafetyTargetW = Number.isFinite(Number(this._lastTargetW)) ? Number(this._lastTargetW) : 0;
            const envelopeBlocked = !envelope
                || envelope.valid !== true
                || envelope.forceZero === true
                || envelope.emergencyStop === true;
            const activeOrCommanded = Math.abs(w) > 0.5
                || Math.abs(previousSafetyTargetW) > 0.5
                || (actualStoragePowerW !== null && Math.abs(actualStoragePowerW) > 50);

            if (envelopeBlocked) {
                storageSafetyForcedStop = activeOrCommanded;
                storageSafetyReason = String(envelope && envelope.invalidReason || 'storage-safety-envelope-invalid');
                w = 0;
            } else if (w < 0) {
                const maxChargeCandidates = [
                    cfg.maxChargePowerW,
                    cfg.maxChargeW,
                    cfg.maxPowerW,
                    this.adapter?._emsCaps?.storageChargeLimitW,
                ].map((value) => strictFiniteNumber(value, null)).filter((value) => value !== null && value > 0);
                storageSafetyDecision = evaluateFlexibleLoadRequest(this.adapter, {
                    key: `storage:${selectedTopology || 'single'}`,
                    app: 'storage',
                    deviceKey: selectedTopology || 'single',
                    requestedW: Math.abs(w),
                    currentActualW: actualChargeRaw === null ? 0 : Math.max(0, actualChargeRaw),
                    currentActualFresh: actualSampleFresh,
                    phaseCount: Math.max(1, Math.min(3, Number(envelope && envelope.phase && envelope.phase.requiredCount) || 3)),
                    voltageV: Number(envelope && envelope.phase && envelope.phase.voltageV) || 230,
                    deviceCapW: maxChargeCandidates.length ? Math.min(...maxChargeCandidates) : null,
                    now: Date.now(),
                });
                const allowedChargeW = Math.max(0, Math.floor(Number(storageSafetyDecision.allowedW) || 0));
                w = allowedChargeW > 0 ? -allowedChargeW : 0;
                storageSafetyForcedStop = Math.abs(requestedStorageTargetW) > 0 && allowedChargeW <= 0;
                storageSafetyReason = String(storageSafetyDecision.reason || 'storage-safety-approved');
                if (allowedChargeW < Math.abs(requestedStorageTargetW)) {
                    reason = `${String(reason || 'Speicherregelung')} | ${storageSafetyReason}`;
                }
                storageSafetyDecision = {
                    ...storageSafetyDecision,
                    allowedW: allowedChargeW,
                    blocked: allowedChargeW <= 0 && requestedStorageTargetW < 0,
                    clamped: allowedChargeW < Math.abs(requestedStorageTargetW),
                    forceZero: allowedChargeW <= 0 && requestedStorageTargetW < 0,
                    reservation: {
                        targetW: allowedChargeW,
                        deltaW: Math.max(0, allowedChargeW - Math.max(0, actualChargeRaw || 0)),
                        phaseDeltaW: envelope && envelope.phase && envelope.phase.required === true
                            ? Math.max(0, allowedChargeW - Math.max(0, actualChargeRaw || 0))
                            : 0,
                        app: 'storage',
                    },
                };
            } else if (w > 0) {
                const permission = evaluateSafetyCommandPermission(this.adapter, {
                    key: `storage:${selectedTopology || 'single'}`,
                    app: 'storage',
                    requestedActive: true,
                    now: Date.now(),
                });
                if (!permission.allowed) {
                    storageSafetyForcedStop = true;
                    storageSafetyReason = String(permission.reason || 'storage-discharge-safety-blocked');
                    w = 0;
                } else {
                    storageSafetyReason = String(permission.reason || 'storage-discharge-safety-approved');
                }
            } else {
                storageSafetyReason = 'safe-zero';
            }
            if (storageSafetyForcedStop) {
                reason = `${String(reason || 'Speicherregelung')} | Safety-Stop: ${storageSafetyReason}`;
                source = String(source || 'safety') || 'safety';
            }
        }

        await this._setIfChanged('speicher.regelung.safetyRequestedW', requestedStorageTargetW);
        await this._setIfChanged('speicher.regelung.safetyAllowedW', w);
        await this._setIfChanged('speicher.regelung.safetyReason', String(storageSafetyReason || (w === 0 ? 'safe-zero' : 'safety-not-required')));

        const getEntry = (key) => (this.dp && this.dp.getEntry) ? this.dp.getEntry(key) : null;
        const signedEntry = getEntry('st.targetPowerW');
        const chargeEntry = getEntry('st.targetChargePowerW');
        const dischargeEntry = getEntry('st.targetDischargePowerW');
        const runEntry = getEntry('st.run');
        const maxChargeEntry = getEntry('st.maxChargeW');
        const maxDischargeEntry = getEntry('st.maxDischargeW');
        const chargeEnableEntry = getEntry('st.chargeEnable');
        const dischargeEnableEntry = getEntry('st.dischargeEnable');
        const reserveSocEntry = getEntry('st.reserveSocPct');
        const feneconGridEntry = getEntry('st.feneconGridSetpointW');
        const feneconEssActualEntry = getEntry('st.feneconEssActualPowerW');
        const feneconMinPowerEntry = getEntry('st.feneconMinPowerW');
        const feneconMaxPowerEntry = getEntry('st.feneconMaxPowerW');
        const feneconActualSetpointEntry = getEntry('st.feneconActualSetpointW');

        // E3/DC RSCP-Profil: Der ioBroker.e3dc-rscp Adapter schreibt aktive
        // Speicherleistung ueber das gekoppelte Tupel SET_POWER_MODE + SET_POWER_VALUE.
        const storageVendorProfile = this._getStorageVendorProfile(cfg);
        const e3dcModeEntry = getEntry('st.e3dcSetPowerMode');
        const e3dcValueEntry = getEntry('st.e3dcSetPowerValueW');
        const e3dcTargetConfigured = selectedTopology === 'single'
            && controlMode === 'targetPower'
            && storageVendorProfile === 'e3dc-rscp'
            && !!(e3dcModeEntry && e3dcValueEntry);

        const feneconDirectTargetAvailable = !!(signedEntry || chargeEntry || dischargeEntry);
        const feneconModeResolution = resolveFeneconControlMode({
            vendorProfile: storageVendorProfile,
            coupling: cfg.coupling,
            feneconControlMode: cfg.feneconControlMode,
            feneconGridSetpointObjectId: feneconGridEntry && feneconGridEntry.objectId,
            setSignedPowerId: signedEntry && signedEntry.objectId,
            setChargePowerId: chargeEntry && chargeEntry.objectId,
            setDischargePowerId: dischargeEntry && dischargeEntry.objectId,
        }, { writableStorageCount: 1, otherWritableStorageCount: 0, directTargetAvailable: feneconDirectTargetAvailable });
        const feneconNativeConfigured = selectedTopology === 'single'
            && controlMode === 'targetPower'
            && feneconModeResolution.mode === 'fems-grid'
            && !!feneconGridEntry;
        const feneconNativeInvalid = selectedTopology === 'single'
            && controlMode === 'targetPower'
            && feneconModeResolution.mode === 'invalid';

        const objectIdOf = (entry) => entry && entry.objectId ? String(entry.objectId).trim() : '';
        const sameObject = (a, b) => {
            const aa = objectIdOf(a);
            const bb = objectIdOf(b);
            return !!(aa && bb && aa === bb);
        };

        // Signed-, Split- und herstellerspezifische Sollwertpfade sind alternative
        // Kommandofamilien. Eine vollstaendige Split-Zuordnung gewinnt vor Signed,
        // weil sie den bei Sungrow und vielen Fremdadaptern eindeutigen Lade-/Entlade-
        // Handshake erlaubt. Ein nur teilweise gemappter Split-Pfad wird nur genutzt,
        // wenn kein vollwertiger Signed-DP vorhanden ist.
        const chargeSameAsSigned = sameObject(chargeEntry, signedEntry);
        const dischargeSameAsSigned = sameObject(dischargeEntry, signedEntry);
        const canWriteChargeSplit = !!(chargeEntry && !chargeSameAsSigned);
        const canWriteDischargeSplit = !!(dischargeEntry && !dischargeSameAsSigned);
        const splitPairConflict = !!(canWriteChargeSplit && canWriteDischargeSplit && sameObject(chargeEntry, dischargeEntry));
        const hasCompleteSplitTarget = !!(canWriteChargeSplit && canWriteDischargeSplit && !splitPairConflict);
        const hasAnySplitTarget = !!(chargeEntry || dischargeEntry);
        const hasAnyWritableSplit = !!((canWriteChargeSplit || canWriteDischargeSplit) && !splitPairConflict);
        const hasSignedTarget = !!signedEntry;

        let commandFamily = 'none';
        let directionSupported = false;
        let targetMode = 'none';
        if (controlMode === 'limits') {
            commandFamily = 'limits';
            directionSupported = w === 0 || (w < 0 ? !!maxChargeEntry : !!maxDischargeEntry);
            targetMode = maxChargeEntry && maxDischargeEntry
                ? 'limits-charge-discharge'
                : (maxChargeEntry ? 'limits-charge-only' : (maxDischargeEntry ? 'limits-discharge-only' : 'limits-none'));
        } else if (controlMode === 'enableFlags') {
            commandFamily = 'enable-flags';
            directionSupported = w === 0 || (w < 0 ? !!chargeEnableEntry : !!dischargeEnableEntry);
            targetMode = chargeEnableEntry && dischargeEnableEntry
                ? 'enable-flags-charge-discharge'
                : (chargeEnableEntry ? 'enable-flags-charge-only' : (dischargeEnableEntry ? 'enable-flags-discharge-only' : 'enable-flags-none'));
        } else if (feneconNativeConfigured) {
            commandFamily = 'fenecon-fems-grid';
            directionSupported = true;
            targetMode = 'fenecon-fems-grid-target';
        } else if (feneconNativeInvalid) {
            commandFamily = 'fenecon-invalid';
            directionSupported = false;
            targetMode = 'fenecon-invalid';
        } else if (e3dcTargetConfigured) {
            commandFamily = 'e3dc-rscp';
            directionSupported = true;
            targetMode = 'e3dc-rscp-set-power';
        } else if (hasCompleteSplitTarget) {
            commandFamily = 'split';
            directionSupported = true;
            targetMode = 'split-charge-discharge';
        } else if (hasSignedTarget) {
            commandFamily = 'signed';
            directionSupported = true;
            targetMode = 'signed-targetPower';
        } else if (hasAnyWritableSplit) {
            commandFamily = 'split';
            directionSupported = w === 0 || (w < 0 ? canWriteChargeSplit : canWriteDischargeSplit);
            targetMode = canWriteChargeSplit
                ? (canWriteDischargeSplit ? 'split-charge-discharge' : 'split-charge-only')
                : (canWriteDischargeSplit ? 'split-discharge-only' : 'split-unwritable');
        }

        if (selectedTopology === 'farm') {
            commandFamily = 'storage-farm';
            directionSupported = true;
            targetMode = 'storage-farm';
        } else if (selectedTopology === 'none') {
            commandFamily = 'none';
            directionSupported = false;
            targetMode = 'none';
        }

        const selectedTargetObjId = commandFamily === 'signed'
            ? objectIdOf(signedEntry)
            : (commandFamily === 'split'
                ? (w < 0 ? objectIdOf(chargeEntry) : (w > 0 ? objectIdOf(dischargeEntry) : (objectIdOf(chargeEntry) || objectIdOf(dischargeEntry))))
                : (commandFamily === 'e3dc-rscp'
                    ? objectIdOf(e3dcValueEntry)
                    : (commandFamily === 'fenecon-fems-grid' ? objectIdOf(feneconGridEntry) : '')));
        await this._setIfChanged('speicher.regelung.targetMode', targetMode);
        await this._setIfChanged('speicher.regelung.commandFamily', commandFamily);
        await this._setIfChanged('speicher.regelung.targetObjId', selectedTargetObjId);
        await this._setIfChanged('speicher.regelung.splitTargetObjIds', JSON.stringify({
            selectedFamily: commandFamily,
            signed: objectIdOf(signedEntry),
            charge: objectIdOf(chargeEntry),
            discharge: objectIdOf(dischargeEntry),
            maxCharge: objectIdOf(maxChargeEntry),
            maxDischarge: objectIdOf(maxDischargeEntry),
            chargeEnable: objectIdOf(chargeEnableEntry),
            dischargeEnable: objectIdOf(dischargeEnableEntry),
            reserveSoc: objectIdOf(reserveSocEntry),
            feneconGridTarget: objectIdOf(feneconGridEntry),
            feneconEssActual: objectIdOf(feneconEssActualEntry),
            feneconControlMode: feneconModeResolution.mode,
            feneconControlReason: feneconModeResolution.reason,
            signedIgnoredBecauseCompleteSplit: commandFamily === 'split' && !!signedEntry,
            splitIgnoredBecauseSignedSelected: commandFamily === 'signed' && hasAnySplitTarget,
            chargeSkippedBecauseSignedSameObject: !!chargeSameAsSigned,
            dischargeSkippedBecauseSignedSameObject: !!dischargeSameAsSigned,
            splitPairConflict,
        }));
        await this._setIfChanged('speicher.regelung.runObjId', runEntry && runEntry.objectId ? String(runEntry.objectId) : '');

        // RC42 Shadow-only: Der Vergleich verwendet den durch die finale
        // SafetyEnvelope-Pruefung bereits geklemmten Batterie-Sollwert `w`.
        // Dadurch wird exakt die produktiv erlaubte Policy verglichen, ohne den
        // anschliessenden Writer, dessen Ziel oder dessen Reglerhoheit zu aendern.
        if (selectedTopology === 'single' && isFeneconHybrid({
            vendorProfile: storageVendorProfile,
            coupling: cfg.coupling,
        })) {
            await this._updateFeneconNvpShadow({
                cfg,
                storageAuthority,
                targetW: w,
                requestedTargetW: requestedStorageTargetW,
                source,
                reason,
                currentAuthority: String(this._feneconHybridAuthority || 'nexowatt'),
                commandFamily,
            });
        }

        // Doppelte manuelle Zuordnungen fuer unterschiedliche Ausgangsfunktionen
        // koennen gegensaetzliche Rohwerte erzeugen. Solche echten Objektkonflikte
        // werden als Sicherheitsfehler blockiert; freie Hersteller-/Adapterpfade
        // werden dagegen niemals gefiltert.
        const activeOutputEntries = [];
        const selectedTargetObjectIds = new Set();
        const addActiveOutput = (key, entry, allowAlternativeAlias = false) => {
            if (!entry) return;
            activeOutputEntries.push([key, entry]);
            const id = objectIdOf(entry);
            if (id && allowAlternativeAlias) selectedTargetObjectIds.add(id);
        };
        if (selectedTopology === 'single' && controlMode === 'targetPower') {
            if (commandFamily === 'fenecon-fems-grid') {
                addActiveOutput('feneconGridTarget', feneconGridEntry, true);
            } else if (commandFamily === 'e3dc-rscp') {
                addActiveOutput('e3dcMode', e3dcModeEntry, true);
                addActiveOutput('e3dcValue', e3dcValueEntry, true);
            } else if (commandFamily === 'signed') {
                addActiveOutput('signed', signedEntry, true);
            } else if (commandFamily === 'split') {
                if (canWriteChargeSplit) addActiveOutput('charge', chargeEntry, true);
                if (canWriteDischargeSplit) addActiveOutput('discharge', dischargeEntry, true);
            }
        } else if (selectedTopology === 'single' && controlMode === 'limits') {
            addActiveOutput('maxCharge', maxChargeEntry);
            addActiveOutput('maxDischarge', maxDischargeEntry);
        } else if (selectedTopology === 'single' && controlMode === 'enableFlags') {
            addActiveOutput('chargeEnable', chargeEnableEntry);
            addActiveOutput('dischargeEnable', dischargeEnableEntry);
        }
        if (selectedTopology === 'single' && runEntry && commandFamily !== 'fenecon-fems-grid') activeOutputEntries.push(['run', runEntry]);
        if (selectedTopology === 'single' && reserveSocEntry) activeOutputEntries.push(['reserveSoc', reserveSocEntry]);

        // Alle nicht ausgewaehlten Sollwertfamilien werden vor dem aktiven
        // Befehl neutralisiert. So kann ein alter Signed-, Split- oder E3/DC-
        // Auftrag den aktuell ausgewaehlten Hardwarepfad nicht uebersteuern.
        const ignoredAlternativeTargetEntries = [];
        const addIgnoredAlternative = (key, entry, family) => {
            const id = objectIdOf(entry);
            if (!id || selectedTargetObjectIds.has(id)) return;
            ignoredAlternativeTargetEntries.push({ key, entry, family });
        };
        if (selectedTopology === 'single') {
            if (commandFamily !== 'signed') addIgnoredAlternative('st.targetPowerW', signedEntry, 'signed');
            if (commandFamily !== 'split') {
                addIgnoredAlternative('st.targetChargePowerW', chargeEntry, 'split-charge');
                addIgnoredAlternative('st.targetDischargePowerW', dischargeEntry, 'split-discharge');
            }
            if (commandFamily !== 'e3dc-rscp') {
                addIgnoredAlternative('st.e3dcSetPowerMode', e3dcModeEntry, 'e3dc-mode');
                addIgnoredAlternative('st.e3dcSetPowerValueW', e3dcValueEntry, 'e3dc-value');
            }
        }

        const outputsByObjectId = new Map();
        const outputConflicts = [];
        for (const [key, entry] of activeOutputEntries) {
            const id = objectIdOf(entry);
            if (!id) continue;
            if (!outputsByObjectId.has(id)) {
                outputsByObjectId.set(id, key);
                continue;
            }
            outputConflicts.push({ objectId: id, first: outputsByObjectId.get(id), second: key });
        }
        for (const item of ignoredAlternativeTargetEntries) {
            const id = objectIdOf(item && item.entry);
            if (!id || !outputsByObjectId.has(id)) continue;
            outputConflicts.push({
                objectId: id,
                first: outputsByObjectId.get(id),
                second: `ignored-${String(item.family || 'target')}`,
                reason: 'alternative-target-shares-active-control-object',
            });
        }
        if (selectedTopology === 'single'
            && controlMode === 'targetPower'
            && splitPairConflict
            && !hasSignedTarget
            && !e3dcTargetConfigured) {
            outputConflicts.push({
                objectId: objectIdOf(chargeEntry),
                first: 'charge',
                second: 'discharge',
                reason: 'split-charge-discharge-same-object',
            });
        }
        await this._setIfChanged('speicher.regelung.outputMappingConflictJson', outputConflicts.length ? JSON.stringify(outputConflicts) : '');
        const conflictingOutputIds = new Set(
            outputConflicts.map((item) => String(item && item.objectId || '').trim()).filter(Boolean),
        );

        // Exklusive Hardware-Topologie: Farm und Einzelpfad duerfen niemals im
        // selben Regelzyklus konkurrieren. Ein Farmfehler bleibt ein Farmfehler und
        // aktiviert keinen versteckten Einzel-Fallback.
        let writeResult = null;
        let farmApplied = false;
        let farmCommandEffective = false;
        let farmWriteOk = false;
        let farmRequestSatisfied = false;
        let farmPartiallyAccepted = false;
        let farmReason = '';
        let farmStatus = '';
        let farmRequestedW = w;
        let farmPlannedW = 0;
        let farmAcceptedW = 0;
        let farmFailedW = 0;
        let farmUnservedW = 0;
        let farmDispatchResult = null;
        const farmEnabledForWrite = selectedTopology === 'farm';
        const mayUseSingleTarget = selectedTopology === 'single';

        try {
            if (farmEnabledForWrite && this.adapter && typeof this.adapter.applyStorageFarmTargetW === 'function') {
                const res = await this.adapter.applyStorageFarmTargetW(w, { source, reason, topology: 'farm' });
                farmDispatchResult = res && typeof res === 'object' ? res : null;
                farmApplied = !!(res && res.applied);
                farmCommandEffective = !!(res && (res.commandEffective === true || res.applied === true));
                farmWriteOk = !!(res && res.writeOk === true);
                farmRequestSatisfied = !!(res && res.requestSatisfied === true);
                farmPartiallyAccepted = !!(res && res.partiallyAccepted === true);
                farmReason = res && res.reason ? String(res.reason) : '';
                farmStatus = res && res.status ? String(res.status) : farmReason;
                farmRequestedW = Number.isFinite(Number(res && res.requestedW)) ? Math.round(Number(res.requestedW)) : w;
                farmPlannedW = Number.isFinite(Number(res && res.plannedDeliveredW)) ? Math.round(Number(res.plannedDeliveredW)) : 0;
                farmAcceptedW = Number.isFinite(Number(res && res.acceptedDeliveredW))
                    ? Math.round(Number(res.acceptedDeliveredW))
                    : (Number.isFinite(Number(res && res.deliveredW)) ? Math.round(Number(res.deliveredW)) : 0);
                farmFailedW = Number.isFinite(Number(res && res.failedW)) ? Math.round(Number(res.failedW)) : 0;
                farmUnservedW = Number.isFinite(Number(res && res.unservedW)) ? Math.round(Number(res.unservedW)) : 0;
                writeResult = farmWriteOk;
            } else if (farmEnabledForWrite) {
                farmReason = 'farm-dispatcher-missing';
                farmStatus = 'farm-dispatcher-missing';
                farmCommandEffective = false;
                farmWriteOk = false;
                farmRequestSatisfied = false;
                farmPartiallyAccepted = false;
                writeResult = false;
            }
        } catch (eFarm) {
            farmApplied = false;
            farmCommandEffective = false;
            farmWriteOk = false;
            farmRequestSatisfied = false;
            farmPartiallyAccepted = false;
            farmReason = eFarm && eFarm.message ? String(eFarm.message) : 'exception';
            farmStatus = 'farm-exception';
            writeResult = false;
        }

        const writeResults = [];
        const commandExpectations = [];
        let commandReadback = { supported: false, ok: true, status: 'not-run', rows: [], attempts: 0 };
        let commandFailureStatus = '';
        let alternativeRelease = { ok: true, status: 'not-required', rows: [] };
        let primarySucceeded = false;
        let primaryWroteAny = false;
        let primaryDetail = null;
        // Während einer FENECON-Kommandofamilien-Übergabe bleibt die zuletzt
        // tatsächlich aktive Familie autoritativ. Sonst könnte der nächste Tick
        // die Watchdog-Sperre umgehen und zwei Regler parallel aktivieren.
        let preserveLastCommandFamily = false;
        let singleAcceptedTargetW = w;
        let singleRequestSatisfied = true;
        let singlePartiallyAccepted = false;
        let singleCommandEffectiveOverride = null;
        let singleWriteOkOverride = null;
        let singleWriteStatusOverride = '';

        const addCommandExpectation = (key, entry, type, value, role = 'command') => {
            if (!entry || !objectIdOf(entry)) return;
            commandExpectations.push({ key, entry, type, value, role });
        };
        const writeCommandNumber = async (key, value, options = {}) => {
            const entry = getEntry(key);
            if (!entry) return false;
            let result = false;
            try {
                result = await this._writeStorageCommandNumber(key, value, { force: options.force === true });
            } catch (_error) {
                result = false;
            }
            writeResults.push(result);
            if (options.primary !== false) primaryWroteAny = true;
            addCommandExpectation(key, entry, 'number', value, String(options.role || 'command'));
            return result;
        };
        const writeCommandBoolean = async (key, value, options = {}) => {
            const entry = getEntry(key);
            if (!entry) return false;
            let result = false;
            try {
                result = await this._writeStorageCommandBoolean(key, value, { force: options.force === true });
            } catch (_error) {
                result = false;
            }
            writeResults.push(result);
            if (options.primary !== false) primaryWroteAny = true;
            addCommandExpectation(key, entry, 'boolean', !!value, String(options.role || 'command'));
            return result;
        };
        const classifyCommandReadbackFailure = (rows = []) => {
            const mismatches = (Array.isArray(rows) ? rows : []).filter((row) => row && row.supported && !row.ok);
            if (mismatches.some((row) => String(row.role || '').startsWith('split-'))) return 'direction-handover-failed';
            if (mismatches.some((row) => String(row.role || '') === 'signed-target')) return 'signed-command-mismatch';
            if (mismatches.some((row) => String(row.role || '').startsWith('e3dc-'))) return 'e3dc-command-mismatch';
            if (mismatches.some((row) => String(row.role || '').startsWith('fenecon-'))) return 'fenecon-command-mismatch';
            if (mismatches.some((row) => String(row.role || '') === 'run')) return 'run-command-mismatch';
            if (mismatches.some((row) => String(row.role || '') === 'reserve')) return 'reserve-command-mismatch';
            return 'command-dp-mismatch';
        };

        if (farmEnabledForWrite) {
            // Der Farm-Dispatcher besitzt in dieser Topologie exklusiv die
            // Hardwarehoheit. Seine pro Speicher ermittelten Readbacks werden
            // unveraendert als gemeinsame Diagnose gespiegelt.
            const farmReadbackSupported = !!(farmDispatchResult && farmDispatchResult.commandDpReadbackSupported === true);
            const farmReadbackOk = farmDispatchResult && typeof farmDispatchResult.commandDpReadbackOk === 'boolean'
                ? farmDispatchResult.commandDpReadbackOk
                : (farmReadbackSupported ? farmWriteOk : true);
            commandReadback = {
                supported: farmReadbackSupported,
                ok: farmReadbackOk,
                status: String((farmDispatchResult && farmDispatchResult.commandDpReadbackStatus) || (farmReadbackSupported ? (farmReadbackOk ? 'confirmed' : 'mismatch') : 'farm-dispatch')),
                rows: farmDispatchResult && Array.isArray(farmDispatchResult.commandDpReadbackRows)
                    ? farmDispatchResult.commandDpReadbackRows
                    : [],
                attempts: 0,
            };
            await this._setIfChanged('speicher.regelung.lastWriteRaw', null);
            await this._setIfChanged('speicher.regelung.lastWriteSplitJson', null);
        } else if (!mayUseSingleTarget) {
            writeResult = false;
            commandFailureStatus = 'kein-aktiver-speicher-ausgang';
            await this._setIfChanged('speicher.regelung.lastWriteRaw', null);
            primaryDetail = { topology: selectedTopology, reason: commandFailureStatus };
        } else {
            const familyChanged = this._lastStorageCommandFamily !== commandFamily;
            const feneconHandover = selectedTopology === 'single' && commandFamily !== 'fenecon-fems-grid'
                ? this._getFeneconNativeHandoverWait(cfg)
                : { active: false, remainingMs: 0 };
            if (!feneconHandover.active && commandFamily !== 'fenecon-fems-grid' && this._feneconGridWasActive) {
                this._feneconGridWasActive = false;
                this._feneconGridReleasedDirectTarget = false;
                this._feneconDirectReleaseUntilMs = 0;
                await this._setIfChanged('speicher.regelung.feneconHandoverStatus', 'completed');
                await this._setIfChanged('speicher.regelung.feneconHandoverRemainingMs', 0);
                await this._setIfChanged('speicher.regelung.feneconGridAktiv', false);
            }
            if (!outputConflicts.length) {
                alternativeRelease = await this._ensureStorageAlternativeTargetsNeutral(
                    ignoredAlternativeTargetEntries,
                    { familyChanged },
                );
            }

            if (outputConflicts.length) {
                writeResult = false;
                commandFailureStatus = 'dp-zuordnung-konflikt';
                await this._setIfChanged('speicher.regelung.lastWriteRaw', null);
                primaryDetail = { mode: targetMode, family: commandFamily, conflicts: outputConflicts };
            } else if (!alternativeRelease.ok) {
                writeResult = false;
                commandFailureStatus = 'alternative-command-release-failed';
                await this._setIfChanged('speicher.regelung.lastWriteRaw', null);
                primaryDetail = {
                    mode: targetMode,
                    family: commandFamily,
                    directionSupported,
                    alternativeRelease,
                };
            } else if (selectedTopology === 'single' && commandFamily === 'fenecon-fems-grid' && (() => {
                const nowMs = Date.now();
                const directTargetConfigured = ignoredAlternativeTargetEntries.some((item) => !!objectIdOf(item && item.entry));
                // Bei der ersten Übernahme wird auch dann einmal sicher gewartet,
                // wenn der direkte Kommandodatenpunkt bereits 0 meldet: Eine alte
                // SetActivePowerEquals-Vorgabe kann den FEMS-Controller trotzdem
                // noch bis zum API-Timeout besitzen.
                if (!this._feneconGridWasActive
                    && directTargetConfigured
                    && !this._feneconGridReleasedDirectTarget
                    && alternativeRelease.ok === true) {
                    this._feneconGridReleasedDirectTarget = true;
                    this._feneconDirectReleaseUntilMs = nowMs + this._getFeneconApiTimeoutMs(cfg);
                }
                return this._feneconDirectReleaseUntilMs > nowMs;
            })()) {
                // Direkte ESS-Sollwerte wurden soeben neutralisiert. Der FEMS-
                // Modbus-Watchdog muss zuerst sicher auslaufen, bevor der native
                // Balancing-Controller übernommen wird. Dadurch gibt es niemals
                // einen parallelen 706-/SetGridActivePower-Regler.
                const remainingMs = Math.max(0, this._feneconDirectReleaseUntilMs - Date.now());
                writeResult = true;
                primarySucceeded = true;
                preserveLastCommandFamily = true;
                commandFailureStatus = '';
                singleAcceptedTargetW = 0;
                singleRequestSatisfied = false;
                singlePartiallyAccepted = false;
                singleCommandEffectiveOverride = false;
                singleWriteOkOverride = true;
                singleWriteStatusOverride = 'fenecon-handover-wait';
                await this._setIfChanged('speicher.regelung.feneconHandoverStatus', 'direct-watchdog-active');
                await this._setIfChanged('speicher.regelung.feneconHandoverRemainingMs', Math.round(remainingMs));
                await this._setIfChanged('speicher.regelung.feneconGridAktiv', false);
                await this._setIfChanged('speicher.regelung.feneconGridSchreibStatus', 'handover-wait');
                await this._setIfChanged('speicher.regelung.lastWriteRaw', null);
                primaryDetail = {
                    profile: 'fenecon-openems',
                    fromFamily: this._lastStorageCommandFamily || 'direct-ess',
                    toFamily: 'fenecon-fems-grid',
                    remainingMs,
                    timeoutMs: this._getFeneconApiTimeoutMs(cfg),
                    alternativeRelease,
                };
            } else if (selectedTopology === 'single' && commandFamily !== 'fenecon-fems-grid' && feneconHandover.active) {
                // Der native FEMS-Balancing-Controller bleibt bis zum Ablauf seines
                // Modbus/TCP-Watchdogs aktiv. Während dieser Übergabe darf keine
                // direkte ESS-Kommandofamilie parallel schreiben.
                const handover = feneconHandover;
                writeResult = true;
                primarySucceeded = true;
                preserveLastCommandFamily = true;
                commandFailureStatus = '';
                singleAcceptedTargetW = 0;
                singleRequestSatisfied = false;
                singlePartiallyAccepted = false;
                singleCommandEffectiveOverride = false;
                singleWriteOkOverride = true;
                singleWriteStatusOverride = 'fenecon-handover-wait';
                await this._setIfChanged('speicher.regelung.feneconHandoverStatus', 'native-watchdog-active');
                await this._setIfChanged('speicher.regelung.feneconHandoverRemainingMs', Math.round(handover.remainingMs));
                await this._setIfChanged('speicher.regelung.feneconGridAktiv', true);
                await this._setIfChanged('speicher.regelung.feneconGridSchreibStatus', 'handover-wait');
                await this._setIfChanged('speicher.regelung.lastWriteRaw', null);
                primaryDetail = {
                    profile: 'fenecon-openems',
                    fromFamily: 'fenecon-fems-grid',
                    toFamily: commandFamily,
                    handover,
                };
            } else if (controlMode === 'targetPower' && commandFamily === 'fenecon-fems-grid') {
                this._feneconDirectReleaseUntilMs = 0;
                await this._setIfChanged('speicher.regelung.feneconHandoverStatus', 'completed');
                await this._setIfChanged('speicher.regelung.feneconHandoverRemainingMs', 0);
                const staleMs = Math.max(1000, Math.round(num(cfg.staleTimeoutSec, 15) * 1000));
                const latestNvpSampleTs = strictFiniteNumber(this._latestNvpSampleTs, null);
                const latestNvpRawW = strictFiniteNumber(this._latestNvpRawW, null);
                const nvpSampleAgeMs = latestNvpSampleTs !== null
                    ? Math.max(0, Date.now() - latestNvpSampleTs)
                    : Number.POSITIVE_INFINITY;
                const nvpFallbackW = this.dp && typeof this.dp.getNumberFresh === 'function'
                    ? strictFiniteNumber(this.dp.getNumberFresh('grid.powerRawW', staleMs, null), null)
                    : null;
                const nvpW = nvpSampleAgeMs <= staleMs && latestNvpRawW !== null
                    ? latestNvpRawW
                    : nvpFallbackW;
                // Der native FEMS-NVP-Regler benoetigt zwingend die explizit
                // zugeordnete AC-seitige ESS-Aktorleistung. Ein generischer
                // Batterie-/Bilanzwert darf hier nicht als 0-W- oder Feedback-
                // Ersatz einspringen, weil er interne DC-PV oder PowerBalance
                // enthalten kann.
                const essActualW = this.dp && typeof this.dp.getNumberFresh === 'function'
                    ? strictFiniteNumber(this.dp.getNumberFresh('st.feneconEssActualPowerW', staleMs, null), null)
                    : null;
                const minPowerW = this.dp && typeof this.dp.getNumberFresh === 'function'
                    ? strictFiniteNumber(this.dp.getNumberFresh('st.feneconMinPowerW', staleMs, null), null)
                    : null;
                const maxPowerW = this.dp && typeof this.dp.getNumberFresh === 'function'
                    ? strictFiniteNumber(this.dp.getNumberFresh('st.feneconMaxPowerW', staleMs, null), null)
                    : null;
                let effectiveBatteryTargetW = w;
                let powerLimitError = '';
                if (minPowerW !== null && maxPowerW !== null && minPowerW > maxPowerW) {
                    powerLimitError = 'fenecon-power-limits-invalid';
                } else {
                    if (minPowerW !== null) effectiveBatteryTargetW = Math.max(minPowerW, effectiveBatteryTargetW);
                    if (maxPowerW !== null) effectiveBatteryTargetW = Math.min(maxPowerW, effectiveBatteryTargetW);
                }
                effectiveBatteryTargetW = Math.round(effectiveBatteryTargetW);

                const calc = powerLimitError
                    ? {
                        ok: false,
                        reason: powerLimitError,
                        nvpW,
                        essActualW,
                        batteryTargetW: effectiveBatteryTargetW,
                        gridTargetW: null,
                    }
                    : calculateFemsGridTargetW({
                        nvpW,
                        essActualW,
                        batteryTargetW: effectiveBatteryTargetW,
                    });
                await this._setIfChanged('speicher.regelung.feneconControlMode', 'fems-grid');
                await this._setIfChanged('speicher.regelung.feneconGridTargetBatteryW', effectiveBatteryTargetW);
                await this._setIfChanged('speicher.regelung.feneconGridEssActualPowerW', essActualW !== null ? Math.round(essActualW) : null);
                await this._setIfChanged('speicher.regelung.feneconGridNvpW', nvpW !== null ? Math.round(nvpW) : null);
                await this._setIfChanged('speicher.regelung.feneconGridCalculationJson', JSON.stringify({
                    ...calc,
                    requestedBatteryTargetW: w,
                    effectiveBatteryTargetW,
                    minPowerW: minPowerW !== null ? Math.round(minPowerW) : null,
                    maxPowerW: maxPowerW !== null ? Math.round(maxPowerW) : null,
                    nvpSampleAgeMs: Number.isFinite(nvpSampleAgeMs) ? Math.round(nvpSampleAgeMs) : null,
                }));

                if (!calc.ok) {
                    writeResult = false;
                    primarySucceeded = false;
                    commandFailureStatus = 'fenecon-native-input-missing';
                    await this._setIfChanged('speicher.regelung.lastWriteRaw', null);
                    await this._setIfChanged('speicher.regelung.feneconGridAktiv', false);
                    await this._setIfChanged('speicher.regelung.feneconGridSchreibOk', false);
                    await this._setIfChanged('speicher.regelung.feneconGridSchreibStatus', String(calc.reason || 'calculation-failed'));
                    primaryDetail = {
                        profile: 'fenecon-openems',
                        family: commandFamily,
                        controlMode: 'fems-grid',
                        calculation: calc,
                    };
                } else {
                    const femsResult = await this._applyFeneconGridSetpointW(
                        calc.gridTargetW,
                        reason || 'FENECON-Hybrid: FEMS-NVP-Regler',
                        source || 'fenecon-fems-grid',
                        { force: familyChanged || w === 0 },
                    );
                    primaryWroteAny = !!(femsResult && femsResult.wrote);
                    primarySucceeded = !!(femsResult && femsResult.ok);
                    writeResult = primarySucceeded;
                    if (primarySucceeded) {
                        singleAcceptedTargetW = effectiveBatteryTargetW;
                        singleRequestSatisfied = effectiveBatteryTargetW === w;
                        singlePartiallyAccepted = effectiveBatteryTargetW !== w;
                    }
                    await this._setIfChanged('speicher.regelung.lastWriteRaw', calc.gridTargetW);
                    addCommandExpectation(
                        'st.feneconGridSetpointW',
                        feneconGridEntry,
                        'number',
                        calc.gridTargetW,
                        'fenecon-fems-grid-target',
                    );
                    writeResults.push(femsResult && femsResult.ok === true);
                    primaryDetail = {
                        profile: 'fenecon-openems',
                        family: commandFamily,
                        controlMode: 'fems-grid',
                        requestedBatteryTargetW: w,
                        effectiveBatteryTargetW,
                        nvpW: calc.nvpW,
                        essActualW: calc.essActualW,
                        gridTargetW: calc.gridTargetW,
                        calculation: calc,
                        write: femsResult,
                    };
                }
            } else if (controlMode === 'targetPower' && commandFamily === 'e3dc-rscp') {
                // A telemetry-protection stop is a battery pause, not release to
                // native self-consumption. Use the existing IDLE mode for this
                // one command only; the configured default/normal paths stay intact.
                const e3dcCommandCfg = w === 0 && options.evcsProtectedLoadUnknown === true
                    ? { ...cfg, e3dcZeroMode: 'idle' } : cfg;
                const e3dcResult = await this._writeE3dcRscpTargetW(w, reason, source, e3dcCommandCfg);
                primarySucceeded = !!(e3dcResult && e3dcResult.ok === true);
                primaryWroteAny = true;
                writeResult = primarySucceeded;
                await this._setIfChanged('speicher.regelung.lastWriteRaw', e3dcResult ? Math.round(Number(e3dcResult.valueW) || 0) : null);
                for (const row of (e3dcResult && Array.isArray(e3dcResult.writes) ? e3dcResult.writes : [])) {
                    const entry = getEntry(row.key);
                    const type = row.key === 'st.e3dcPowerLimitsUsed' ? 'boolean' : 'number';
                    const role = row.key === 'st.e3dcSetPowerMode' || row.key === 'st.e3dcSetPowerValueW'
                        ? 'e3dc-target'
                        : 'e3dc-limit';
                    addCommandExpectation(row.key, entry, type, row.value, role);
                    writeResults.push(row.result);
                }
                primaryDetail = e3dcResult ? {
                    profile: 'e3dc-rscp',
                    family: commandFamily,
                    modeCode: e3dcResult.modeCode,
                    modeName: e3dcResult.modeName,
                    valueW: e3dcResult.valueW,
                    gridCharge: !!e3dcResult.gridCharge,
                    powerLimitsUsed: !!e3dcResult.powerLimitsUsed,
                    writes: e3dcResult.writes || [],
                } : null;
            } else if (controlMode === 'limits') {
                const chargeW = directionSupported && w < 0 ? Math.abs(w) : 0;
                const dischargeW = directionSupported && w > 0 ? w : 0;
                if (maxChargeEntry) await writeCommandNumber('st.maxChargeW', chargeW, { role: 'limit-charge' });
                if (maxDischargeEntry) await writeCommandNumber('st.maxDischargeW', dischargeW, { role: 'limit-discharge' });
                primarySucceeded = !!(directionSupported && primaryWroteAny && !writeResults.some((r) => r === false));
                writeResult = primarySucceeded;
                await this._setIfChanged('speicher.regelung.lastWriteRaw', null);
                primaryDetail = {
                    family: commandFamily,
                    mode: targetMode,
                    chargeW: maxChargeEntry ? chargeW : null,
                    dischargeW: maxDischargeEntry ? dischargeW : null,
                    directionSupported,
                };
            } else if (controlMode === 'enableFlags') {
                const chargeEnabled = !!(directionSupported && w < 0);
                const dischargeEnabled = !!(directionSupported && w > 0);
                if (chargeEnableEntry) await writeCommandBoolean('st.chargeEnable', chargeEnabled, { role: 'enable-charge' });
                if (dischargeEnableEntry) await writeCommandBoolean('st.dischargeEnable', dischargeEnabled, { role: 'enable-discharge' });
                primarySucceeded = !!(directionSupported && primaryWroteAny && !writeResults.some((r) => r === false));
                writeResult = primarySucceeded;
                await this._setIfChanged('speicher.regelung.lastWriteRaw', null);
                primaryDetail = {
                    family: commandFamily,
                    mode: targetMode,
                    chargeEnabled: chargeEnableEntry ? chargeEnabled : null,
                    dischargeEnabled: dischargeEnableEntry ? dischargeEnabled : null,
                    directionSupported,
                };
            } else if (controlMode === 'targetPower' && commandFamily === 'split') {
                const chargeW = directionSupported && w < 0 ? Math.abs(w) : 0;
                const dischargeW = directionSupported && w > 0 ? w : 0;

                // Direkter Richtungswechsel ohne eigene 0-W-Regelrunde: Zuerst
                // wird im selben Write-Plan die alte Richtung neutralisiert,
                // unmittelbar danach erhaelt die neue Richtung ihren Sollwert.
                if (w > 0) {
                    if (canWriteChargeSplit) await writeCommandNumber('st.targetChargePowerW', 0, { role: 'split-inactive-charge', force: true });
                    if (canWriteDischargeSplit) await writeCommandNumber('st.targetDischargePowerW', dischargeW, { role: 'split-active-discharge', force: true });
                } else if (w < 0) {
                    if (canWriteDischargeSplit) await writeCommandNumber('st.targetDischargePowerW', 0, { role: 'split-inactive-discharge', force: true });
                    if (canWriteChargeSplit) await writeCommandNumber('st.targetChargePowerW', chargeW, { role: 'split-active-charge', force: true });
                } else {
                    if (canWriteChargeSplit) await writeCommandNumber('st.targetChargePowerW', 0, { role: 'split-stop-charge', force: true });
                    if (canWriteDischargeSplit) await writeCommandNumber('st.targetDischargePowerW', 0, { role: 'split-stop-discharge', force: true });
                }

                primarySucceeded = !!(directionSupported && primaryWroteAny && !writeResults.some((r) => r === false));
                writeResult = primarySucceeded;
                await this._setIfChanged('speicher.regelung.lastWriteRaw', null);
                primaryDetail = {
                    family: commandFamily,
                    mode: targetMode,
                    chargeW: canWriteChargeSplit ? chargeW : null,
                    dischargeW: canWriteDischargeSplit ? dischargeW : null,
                    directionSupported,
                    writeOrder: w > 0
                        ? ['charge=0', 'discharge=target']
                        : (w < 0 ? ['discharge=0', 'charge=target'] : ['charge=0', 'discharge=0']),
                };
            } else if (controlMode === 'targetPower' && commandFamily === 'signed') {
                await writeCommandNumber('st.targetPowerW', w, { role: 'signed-target', force: true });
                primarySucceeded = !!(directionSupported && primaryWroteAny && !writeResults.some((r) => r === false));
                writeResult = primarySucceeded;
                const expectedRaw = this._storageCommandExpectedRaw(signedEntry, w, 'number');
                await this._setIfChanged('speicher.regelung.lastWriteRaw', expectedRaw ? Math.round(Number(expectedRaw.raw) || 0) : null);
                primaryDetail = {
                    family: commandFamily,
                    mode: targetMode,
                    signedW: w,
                    signedRaw: expectedRaw ? expectedRaw.raw : null,
                    directionSupported,
                };
            } else {
                await this._setIfChanged('speicher.regelung.lastWriteRaw', null);
                primaryDetail = {
                    family: commandFamily,
                    mode: targetMode,
                    directionSupported: false,
                    reason: splitPairConflict ? 'split-charge-discharge-same-object' : 'kein beschreibbarer Ziel-DP',
                };
                commandFailureStatus = splitPairConflict ? 'dp-zuordnung-konflikt' : 'zielrichtung-nicht-gemappt';
                writeResult = false;
            }

            // Run/Enable folgt dem tatsaechlich erfolgreichen Hauptpfad. Ein
            // Fehler setzt den Controller sicher auf false; der Wert wird wie
            // alle Sollwert-DPs anschliessend per Readback bestaetigt.
            if (runEntry && commandFamily !== 'fenecon-fems-grid' && !conflictingOutputIds.has(objectIdOf(runEntry))) {
                const runActive = primarySucceeded && writeResult !== false && w !== 0;
                const runResult = await writeCommandBoolean('st.run', runActive, { role: 'run', primary: false, force: !runActive });
                if (runResult === false) writeResult = false;
                primaryDetail = { ...(primaryDetail || {}), run: runActive };
            } else if (runEntry && commandFamily !== 'fenecon-fems-grid') {
                primaryDetail = { ...(primaryDetail || {}), run: null, runSkipped: 'mapping-conflict' };
            } else if (runEntry && commandFamily === 'fenecon-fems-grid') {
                primaryDetail = { ...(primaryDetail || {}), run: null, runSkipped: 'native-fems-grid-control' };
            }

            // Der Reserve-DP wird aus exakt derselben wirksamen SoC-Untergrenze
            // gespeist wie das interne Entlade-Gate.
            if (reserveSocEntry && !conflictingOutputIds.has(objectIdOf(reserveSocEntry))) {
                const reserveSocPct = clamp(
                    Number.isFinite(Number(this._effectiveReserveSocPct))
                        ? Number(this._effectiveReserveSocPct)
                        : num(cfg.reserveMinSocPct, 20),
                    0,
                    100,
                );
                const reserveResult = await writeCommandNumber('st.reserveSocPct', reserveSocPct, { role: 'reserve', primary: false });
                if (reserveResult === false) writeResult = false;
                primaryDetail = { ...(primaryDetail || {}), reserveSocPct };
            } else if (reserveSocEntry) {
                primaryDetail = { ...(primaryDetail || {}), reserveSocPct: null, reserveSkipped: 'mapping-conflict' };
            }

            commandReadback = await this._verifyStorageCommandDatapoints(commandExpectations, { attempts: 3, delayMs: 30 });
            if (commandReadback.supported && !commandReadback.ok) {
                const rawStatus = commandReadback.status;
                commandFailureStatus = classifyCommandReadbackFailure(commandReadback.rows);
                commandReadback = { ...commandReadback, rawStatus, status: commandFailureStatus };
                writeResult = false;
                primarySucceeded = false;
                for (const row of commandReadback.rows || []) {
                    if (!row || row.ok || !row.key) continue;
                    this._clearStorageCommandWriteCache(getEntry(row.key));
                }

                // Ein Sollwert-Readbackfehler darf keine laufende externe
                // Freigabe hinterlassen. Run wird best effort sofort geloest.
                if (runEntry && commandFamily !== 'fenecon-fems-grid') {
                    const safeRunResult = await this._writeStorageCommandBoolean('st.run', false, { force: true });
                    const safeRunReadback = await this._verifyStorageCommandDatapoints(
                        [{ key: 'st.run', entry: runEntry, type: 'boolean', value: false, role: 'run-safe-release' }],
                        { attempts: 2, delayMs: 20 },
                    );
                    commandReadback.safeRunRelease = { result: safeRunResult, readback: safeRunReadback };
                }
            } else if (!commandReadback.supported) {
                commandReadback = { ...commandReadback, status: 'unavailable' };
            }

            if (!alternativeRelease.ok && !commandFailureStatus) commandFailureStatus = 'alternative-command-release-failed';
            primaryDetail = {
                ...(primaryDetail || {}),
                family: commandFamily,
                ignoredAlternatives: ignoredAlternativeTargetEntries.map((item) => ({
                    family: item.family,
                    key: item.key,
                    objectId: objectIdOf(item.entry),
                })),
                alternativeRelease,
                commandReadback,
            };
            await this._setIfChanged('speicher.regelung.lastWriteSplitJson', JSON.stringify(primaryDetail));
        }

        await this._setIfChanged('speicher.regelung.commandDpReadbackAvailable', commandReadback.supported === true);
        await this._setIfChanged(
            'speicher.regelung.commandDpReadbackOk',
            commandReadback.supported === true ? commandReadback.ok === true : null,
        );
        await this._setIfChanged('speicher.regelung.commandDpReadbackStatus', String(commandReadback.status || ''));
        await this._setIfChanged('speicher.regelung.commandDpReadbackJson', JSON.stringify({
            topology: selectedTopology,
            family: commandFamily,
            targetW: w,
            failureStatus: commandFailureStatus,
            alternativeRelease,
            readback: commandReadback,
        }));

        const acceptedTargetW = farmEnabledForWrite
            ? farmAcceptedW
            : (writeResult === true ? singleAcceptedTargetW : 0);
        const commandEffective = farmEnabledForWrite
            ? farmCommandEffective
            : (singleCommandEffectiveOverride === null ? writeResult === true : singleCommandEffectiveOverride === true);
        const requestSatisfied = farmEnabledForWrite ? farmRequestSatisfied : (writeResult === true && singleRequestSatisfied);
        const partiallyAccepted = farmEnabledForWrite ? farmPartiallyAccepted : (writeResult === true && singlePartiallyAccepted);
        const singleWriteOk = singleWriteOkOverride === null ? writeResult === true : singleWriteOkOverride === true;
        const evcsAssistAcceptedW = source === 'evcs' && commandEffective && acceptedTargetW > 0
            ? Math.round(Math.min(Math.max(0, Number(evcsAssistReqW) || 0), acceptedTargetW))
            : 0;
        const commandTs = Date.now();
        await this._setIfChanged('speicher.regelung.sollW', w);
        await this._setIfChanged('speicher.regelung.acceptedSollW', acceptedTargetW);
        await this._setIfChanged('speicher.regelung.commandEffective', commandEffective);
        await this._setIfChanged('speicher.regelung.requestSatisfied', requestSatisfied);
        await this._setIfChanged('speicher.regelung.partiallyAccepted', partiallyAccepted);
        await this._setIfChanged('speicher.regelung.evcsAssistRequestW', Math.max(0, Math.round(Number(evcsAssistReqW) || 0)));
        await this._setIfChanged('speicher.regelung.evcsAssistAcceptedW', evcsAssistAcceptedW);
        await this._setIfChanged('speicher.regelung.evcsAssistAcceptedTs', commandTs);
        await this._setIfChanged('speicher.regelung.evcsAssistAcceptedTopology', evcsAssistAcceptedW > 0 ? selectedTopology : '');
        await this._setIfChanged('speicher.regelung.evcsAssistAcceptedSource', evcsAssistAcceptedW > 0 ? 'evcs' : '');
        await this._setIfChanged('speicher.regelung.farmRequestedW', farmEnabledForWrite ? farmRequestedW : null);
        await this._setIfChanged('speicher.regelung.farmPlannedW', farmEnabledForWrite ? farmPlannedW : null);
        await this._setIfChanged('speicher.regelung.farmAcceptedW', farmEnabledForWrite ? farmAcceptedW : null);
        await this._setIfChanged('speicher.regelung.farmFailedW', farmEnabledForWrite ? farmFailedW : null);
        await this._setIfChanged('speicher.regelung.farmUnservedW', farmEnabledForWrite ? farmUnservedW : null);
        await this._setIfChanged('speicher.regelung.farmStatus', farmEnabledForWrite ? String(farmStatus || farmReason || '') : '');
        await this._setIfChanged('speicher.regelung.farmDispatchJson', farmEnabledForWrite && farmDispatchResult ? JSON.stringify(farmDispatchResult) : '');
        await this._setIfChanged('speicher.regelung.quelle', String(source || ''));
        await this._setIfChanged('speicher.regelung.grund', String(reason || ''));
        await this._setIfChanged('speicher.regelung.schreibOk', farmEnabledForWrite ? farmWriteOk : singleWriteOk);
        if (commandEffective) {
            await this._setIfChanged('speicher.regelung.commandAcceptedTs', commandTs);
            await this._setIfChanged('speicher.regelung.commandAcceptedTargetW', Math.round(acceptedTargetW));
            await this._setIfChanged('speicher.regelung.commandAcceptedSource', String(source || ''));
        }

        let singleStatus = 'nicht möglich';
        if (commandFailureStatus) singleStatus = commandFailureStatus;
        else if (outputConflicts.length) singleStatus = 'dp-zuordnung-konflikt';
        else if (!directionSupported) singleStatus = 'zielrichtung-nicht-gemappt';
        else if (writeResult === true) {
            if (commandFamily === 'fenecon-fems-grid') singleStatus = 'fenecon-fems-nvp-geschrieben';
            else if (commandFamily === 'e3dc-rscp') singleStatus = 'e3dc-rscp-geschrieben';
            else if (commandFamily === 'limits') singleStatus = 'leistungsgrenzen-geschrieben';
            else if (commandFamily === 'enable-flags') singleStatus = 'freigabe-flags-geschrieben';
            else if (commandFamily === 'split') singleStatus = 'split-geschrieben';
            else if (commandFamily === 'signed') singleStatus = 'signed-geschrieben';
            else singleStatus = 'geschrieben';
        }
        const writeStatus = farmEnabledForWrite
            ? (farmStatus || (farmApplied ? 'farm' : ('farm-nicht-moeglich' + (farmReason ? ':' + farmReason : ''))))
            : (selectedTopology === 'none'
                ? 'kein-aktiver-speicher-ausgang'
                : (singleWriteStatusOverride || ((writeResult === null) ? 'unverändert' : singleStatus)));
        await this._setIfChanged('speicher.regelung.schreibStatus', writeStatus);

        const writeSucceeded = farmEnabledForWrite ? farmWriteOk : singleWriteOk;
        if (storageSafetyDecision) {
            const acceptedChargeW = commandEffective && writeSucceeded
                ? Math.max(0, -Number(acceptedTargetW || 0))
                : 0;
            const baselineChargeW = Math.max(0, Number(storageSafetyDecision.currentActualW) || 0);
            const acceptedDeltaW = Math.max(0, acceptedChargeW - baselineChargeW);
            commitFlexibleLoadDecision(this.adapter, {
                ...storageSafetyDecision,
                allowedW: acceptedChargeW,
                reservation: {
                    targetW: acceptedChargeW,
                    deltaW: acceptedDeltaW,
                    phaseDeltaW: this.adapter?._emsSafetyEnvelope?.phase?.required === true ? acceptedDeltaW : 0,
                    app: 'storage',
                },
            }, commandEffective && writeSucceeded);
        }
        if ((storageSafetyDecision || storageSafetyForcedStop) && writeSucceeded !== true && (requestedStorageTargetW !== 0 || storageSafetyForcedStop)) {
            invalidateSafetyEnvelope(this.adapter, `storage-write-not-confirmed:${String(writeStatus || commandFailureStatus || 'unknown')}`, {
                generation: this.adapter?._emsSafetyCycle?.generation,
                now: Date.now(),
                emergencyStop: true,
            });
            try { this.adapter?._nwRequestImmediateEmsTick?.('safety:storage-write', 0); } catch (_tickError) {}
        }
        const effectiveWrittenTargetW = acceptedTargetW;
        const previousTargetW = Number.isFinite(Number(this._lastTargetW)) ? Number(this._lastTargetW) : null;
        const targetChanged = commandEffective && (previousTargetW === null || Math.abs(previousTargetW - effectiveWrittenTargetW) >= 0.5);

        const pendingAsyncCommand = this._pendingAsyncBalanceCommand && typeof this._pendingAsyncBalanceCommand === 'object'
            ? this._pendingAsyncBalanceCommand
            : null;
        if (commandEffective) {
            if (Math.abs(effectiveWrittenTargetW) < 0.5) {
                // 0 W ist ein echter Stop-/Warte-/Sicherheitsbefehl. Ein alter
                // Kommando-Anker darf danach keine Speicherwirkung mehr vorwegnehmen.
                this._asyncBalanceCommand = null;
            } else if (pendingAsyncCommand) {
                const currentAnchor = this._asyncBalanceCommand && typeof this._asyncBalanceCommand === 'object'
                    ? this._asyncBalanceCommand
                    : null;
                const contextChanged = !currentAnchor
                    || String(currentAnchor.feedbackKey || '') !== String(pendingAsyncCommand.feedbackKey || '')
                    || String(currentAnchor.controlKey || '') !== String(pendingAsyncCommand.controlKey || '')
                    || Math.abs(Number(currentAnchor.sampleTs || 0) - Number(pendingAsyncCommand.sampleTs || 0)) > 2
                    || Math.abs(Number(currentAnchor.sampleW || 0) - Number(pendingAsyncCommand.sampleW || 0)) > 2;
                const acceptedTargetChanged = !currentAnchor
                    || !Number.isFinite(Number(currentAnchor.targetW))
                    || Math.abs(Number(currentAnchor.targetW) - effectiveWrittenTargetW) >= 0.5;

                // Keepalive-Writes mit unveraendertem Sollwert duerfen den Anker
                // nicht jede Sekunde neu starten. Eine neue echte Messprobe oder
                // ein materiell geaenderter akzeptierter Sollwert bildet dagegen
                // einen neuen, klaren Regelanker.
                if (contextChanged || acceptedTargetChanged) {
                    this._asyncBalanceCommand = {
                        feedbackKey: String(pendingAsyncCommand.feedbackKey || ''),
                        sampleTs: Number(pendingAsyncCommand.sampleTs) || 0,
                        sampleW: Number(pendingAsyncCommand.sampleW) || 0,
                        controlKey: String(pendingAsyncCommand.controlKey || ''),
                        baseActualW: Number(pendingAsyncCommand.baseActualW) || 0,
                        targetW: effectiveWrittenTargetW,
                        nvpW: Number(pendingAsyncCommand.nvpW) || 0,
                        nvpTargetW: Number(pendingAsyncCommand.nvpTargetW) || 0,
                        acceptedMs: commandTs,
                        source: String(pendingAsyncCommand.source || source || ''),
                        reason: String(pendingAsyncCommand.reason || reason || ''),
                    };
                }
            } else {
                // Ein anderer erfolgreich akzeptierter Speicherpfad (z. B.
                // Peak-Shaving, Reserve oder EVCS) besitzt jetzt die Hoheit. Ein
                // alter NVP-Balancing-Anker darf diesen Befehl nicht beeinflussen.
                this._asyncBalanceCommand = null;
            }
        }
        this._pendingAsyncBalanceCommand = null;

        if (commandEffective) this._lastTargetW = effectiveWrittenTargetW;
        if (commandEffective && targetChanged) this._lastTargetWriteMs = commandTs;
        this._lastReason = String(reason || '');
        this._lastSource = String(source || '');
        if (!preserveLastCommandFamily) this._lastStorageCommandFamily = commandFamily;
    }

    async _upsertInputsFromConfig() {
        if (!this.dp || typeof this.dp.upsert !== 'function') return;

        // Peak-Shaving-Konfig (Messungen) als Fallback registrieren
        const cfg = (this.adapter.config && this.adapter.config.peakShaving) ? this.adapter.config.peakShaving : {};
        const gridId = String(cfg.gridPointPowerId || '').trim();
        const pvId = String(cfg.pvPowerId || '').trim();
        const baseId = String(cfg.baseLoadPowerId || '').trim();
        const battId = String(cfg.batteryPowerId || '').trim();

        if (gridId) await this.dp.upsert({ key: 'ps.gridPowerW', objectId: gridId, dataType: 'number', direction: 'in', unit: 'W', useAliveForStale: true });
        if (pvId) await this.dp.upsert({ key: 'ps.pvW', objectId: pvId });
        if (baseId) await this.dp.upsert({ key: 'ps.baseLoadW', objectId: baseId });
        if (battId) await this.dp.upsert({ key: 'ps.batteryW', objectId: battId });
    }

    /**
     * Code-Teil: Methode `_ensureStates`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _ensureStates
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _ensureStates() {
        await this.adapter.setObjectNotExistsAsync('speicher', {
            type: 'channel',
            common: { name: 'Speicher' },
            native: {},
        });
        await this.adapter.setObjectNotExistsAsync('speicher.regelung', {
            type: 'channel',
            common: { name: 'Speicher-Regelung' },
            native: {},
        });

        /**
         * Code-Teil: Arrow-Funktion `mk`
         * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        const mk = async (id, name, type, role, def = null) => {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: 'state',
                common: { name, type, role, read: true, write: false, def },
                native: {},
            });
            if (def !== null && def !== undefined) {
                try { await this.adapter.setStateAsync(id, def, true); } catch { /* ignore */ }
            }
        };

        await mk('speicher.regelung.aktiv', 'Speicher-Regelung aktiv (effektiv)', 'boolean', 'indicator', false);
        await mk('speicher.regelung.aktivKonfig', 'Speicher-Regelung aktiv (Konfiguration)', 'boolean', 'indicator', false);
        await mk('speicher.regelung.aktivAutoTarif', 'Tarif-Policy aktiv', 'boolean', 'indicator', false);
        await mk('speicher.regelung.aktivAutoMultiUse', 'MultiUse-Policy aktiv', 'boolean', 'indicator', false);
        await mk('speicher.regelung.aktivSpeicherfarm', 'Speicherfarm als Schreibtopologie ausgewählt', 'boolean', 'indicator', false);
        await mk('speicher.regelung.aktivAutoSpeicherfarm', 'Beschreibbare Speicherfarm aktiv', 'boolean', 'indicator', false);
        await mk('speicher.regelung.topologie', 'Aktive Speicher-Schreibtopologie', 'string', 'text', 'none');
        await mk('speicher.regelung.topologieGrund', 'Grund der Speicher-Schreibtopologie', 'string', 'text', '');
        await mk('speicher.regelung.topologieJson', 'Speicher-Steuerhoheit (JSON)', 'string', 'json', '');
        await mk('speicher.regelung.licensePowerProfile', 'Lizenz-Leistungsprofil Speicher', 'string', 'text', 'none');
        await mk('speicher.regelung.licensePowerLimitW', 'Lizenz-Hardcap Speicherleistung (W, 0 = frei)', 'number', 'value.power', 0);
        await mk('speicher.regelung.ratedPowerW', 'Konfigurierte Speicher-Nennleistung (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.licensePowerLimited', 'Speicherleistung durch Lizenzprofil begrenzt', 'boolean', 'indicator', false);
        await mk('speicher.regelung.licensePowerJson', 'Lizenz-Leistungsprofil Speicher (JSON)', 'string', 'json', '');
        await mk('speicher.regelung.herstellerprofil', 'Speicher-Herstellerprofil', 'string', 'text', 'generic');
        await mk('speicher.regelung.speicherKopplung', 'Speicher-Kopplung AC/DC', 'string', 'text', 'ac');
        await mk('speicher.regelung.dcPvPowerW', 'DC-/Hybrid-PV Erzeugungsleistung', 'number', 'value.power', 0);
        await mk('speicher.regelung.dcPvPowerAlterMs', 'DC-/Hybrid-PV Erzeugungswert Alter', 'number', 'value.interval', null);

        // Phase 2: Dispatcher-Diagnose
        await mk('speicher.regelung.dispatcherVersion', 'Dispatcher-Version', 'string', 'text', '2.0');
        await mk('speicher.regelung.requestW', 'Requestleistung Speicher (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.requestQuelle', 'Request Quelle', 'string', 'text', '');
        await mk('speicher.regelung.requestGrund', 'Request Grund', 'string', 'text', '');
        await mk('speicher.regelung.dispatcherJson', 'Dispatcher Details (JSON)', 'string', 'text', '');

        await mk('speicher.regelung.sollW', 'Angeforderte Sollleistung Speicher (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.acceptedSollW', 'Von Hardware akzeptierte Speicher-Sollleistung (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.commandEffective', 'Mindestens ein wirksamer Speicherbefehl akzeptiert', 'boolean', 'indicator', false);
        await mk('speicher.regelung.safetyRequestedW', 'Sollwert vor finaler SafetyEnvelope-Prüfung', 'number', 'value.power', 0);
        await mk('speicher.regelung.safetyAllowedW', 'Final durch SafetyEnvelope freigegebener Sollwert', 'number', 'value.power', 0);
        await mk('speicher.regelung.safetyReason', 'Bindende finale Sicherheitsentscheidung', 'string', 'text', '');
        await mk('speicher.regelung.requestSatisfied', 'Speicheranforderung vollständig akzeptiert', 'boolean', 'indicator', false);
        await mk('speicher.regelung.partiallyAccepted', 'Speicheranforderung nur teilweise akzeptiert', 'boolean', 'indicator', false);
        await mk('speicher.regelung.evcsAssistRequestW', 'EVCS angeforderte stationäre Speicherunterstützung (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.evcsAssistAcceptedW', 'Für EVCS tatsächlich akzeptierte Speicherentladung (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.evcsAssistAcceptedTs', 'Zeitpunkt der akzeptierten EVCS-Speicherunterstützung', 'number', 'value.time', 0);
        await mk('speicher.regelung.evcsAssistAcceptedTopology', 'Topologie der akzeptierten EVCS-Speicherunterstützung', 'string', 'text', '');
        await mk('speicher.regelung.evcsAssistAcceptedSource', 'Quelle der akzeptierten EVCS-Speicherunterstützung', 'string', 'text', '');
        await mk('speicher.regelung.farmRequestedW', 'Farm angefordert (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.farmPlannedW', 'Farm geplant verteilt (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.farmAcceptedW', 'Farm von Writes akzeptiert (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.farmFailedW', 'Farm wegen Write-Fehlern ausgefallen (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.farmUnservedW', 'Farm nicht verteilbarer Rest (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.farmStatus', 'Farm Dispatch-Status', 'string', 'text', '');
        await mk('speicher.regelung.farmDispatchJson', 'Farm Dispatch-Ergebnis (JSON)', 'string', 'json', '');
        await mk('speicher.regelung.quelle', 'Quelle', 'string', 'text', '');
        await mk('speicher.regelung.grund', 'Grund', 'string', 'text', '');
        await mk('speicher.regelung.schreibStatus', 'Schreibstatus', 'string', 'text', '');
        await mk('speicher.regelung.schreibOk', 'Schreiben OK', 'boolean', 'indicator', false);
        await mk('speicher.regelung.commandAcceptedTs', 'Zeitstempel des letzten akzeptierten Speicherbefehls', 'number', 'value.time', null);
        await mk('speicher.regelung.commandAcceptedTargetW', 'Letzter von Hardware-Writes akzeptierter Speicherbefehl (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.commandAcceptedSource', 'Quelle des letzten akzeptierten Speicherbefehls', 'string', 'text', '');
        await mk('speicher.regelung.targetObjId', 'Sollleistung signed Ziel-Datenpunkt (Objekt-ID)', 'string', 'text', '');
        await mk('speicher.regelung.targetMode', 'Speicher Zielpfad', 'string', 'text', '');
        await mk('speicher.regelung.splitTargetObjIds', 'Alle Speicher-Ausgangsdatenpunkte (JSON)', 'string', 'text', '');
        await mk('speicher.regelung.outputMappingConflictJson', 'Konflikte in manuellen Speicher-Ausgangszuordnungen (JSON)', 'string', 'text', '');
        await mk('speicher.regelung.runObjId', 'Run/Externe-Regelung Datenpunkt (Objekt-ID)', 'string', 'text', '');
        await mk('speicher.regelung.lastWriteRaw', 'Letzter Rohwert (signed Setpoint)', 'number', 'value');
        await mk('speicher.regelung.lastWriteSplitJson', 'Letzter Speicher-Kommandoplan (JSON)', 'string', 'json', '');
        await mk('speicher.regelung.commandFamily', 'Exklusive Speicher-Kommandofamilie', 'string', 'text', 'none');
        await mk('speicher.regelung.commandDpReadbackAvailable', 'Kommandodatenpunkt-Readback verfügbar', 'boolean', 'indicator', false);
        await mk('speicher.regelung.commandDpReadbackOk', 'Kommandodatenpunkte bestätigt', 'boolean', 'indicator', null);
        await mk('speicher.regelung.commandDpReadbackStatus', 'Kommandodatenpunkt-Readback Status', 'string', 'text', '');
        await mk('speicher.regelung.commandDpReadbackJson', 'Kommandodatenpunkt-Readback (JSON)', 'string', 'json', '');
        await mk('speicher.regelung.batteryPowerTrusted', 'Direkter Batterie-Istwert innerhalb staleTimeout', 'boolean', 'indicator', false);
        await mk('speicher.regelung.batteryPowerIgnoredReason', 'Ignorierte Ist-Leistung Grund', 'string', 'text', '');
        await mk('speicher.regelung.batteryPowerBalanceTrusted', 'Ist-Leistung/Puffer für NVP-Balancing verwendbar', 'boolean', 'indicator', false);
        await mk('speicher.regelung.batteryPowerFeedbackMode', 'Batterie-Istwert Feedback-Modus', 'string', 'text', '');
        await mk('speicher.regelung.batteryPowerFeedbackMeasuredW', 'Letzter echter Batterie-Istwert (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.batteryPowerFeedbackBasisW', 'Wirksame Batterie-Regelbasis (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.batteryPowerFeedbackAgeMs', 'Alter des gehaltenen Batterie-Istwerts (ms)', 'number', 'value.interval', null);
        await mk('speicher.regelung.batteryPowerFeedbackSampleTs', 'Zeitstempel des echten Batterie-Istwerts', 'number', 'value.time', null);
        await mk('speicher.regelung.batteryPowerFeedbackSampleUpdated', 'Batterie-Istwert in diesem Takt aktualisiert', 'boolean', 'indicator', false);
        await mk('speicher.regelung.batteryPowerFeedbackSampleIntervalMs', 'Intervall zur vorherigen Batterie-Istwertprobe (ms)', 'number', 'value.interval', null);
        await mk('speicher.regelung.batteryPowerFeedbackCadenceMs', 'Erkannte Batterie-Telemetrie-Kadenz (ms)', 'number', 'value.interval', null);
        await mk('speicher.regelung.batteryPowerFeedbackHeld', 'Batterie-Istwert zeitlich gehalten', 'boolean', 'indicator', false);
        await mk('speicher.regelung.batteryPowerFeedbackPredicted', 'Legacy: Sollwertprognose aktiv (ab 0.8.130 immer false)', 'boolean', 'indicator', false);
        await mk('speicher.regelung.batteryPowerFeedbackPredictionDeltaW', 'Legacy: Sollwertprognose zur Istleistung (ab 0.8.130 0 W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.batteryPowerFeedbackHoldMs', 'Konfigurierte Istwert-Haltezeit (ms)', 'number', 'value.interval', 45000);
        await mk('speicher.regelung.dischargeDemandCapW', 'Entlade-Demand-Cap nach Netzbezug (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.dischargeDemandCapReason', 'Entlade-Demand-Cap Grund', 'string', 'text', '');
        await mk('speicher.regelung.antiExportStatus', 'Speicher Anti-Export Status', 'string', 'text', 'inactive');
        await mk('speicher.regelung.antiExportJson', 'Speicher Anti-Export Diagnose (JSON)', 'string', 'json', '');
        await mk('speicher.regelung.chargeDemandCapW', 'Lade-Demand-Cap nach Headroom/PV (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.chargeDemandCapReason', 'Lade-Demand-Cap Grund', 'string', 'text', '');

        await mk('speicher.regelung.feneconControlMode', 'FENECON-Hybrid Regelart', 'string', 'text', 'direct-ess');
        await mk('speicher.regelung.feneconGridAktiv', 'FENECON FEMS-NVP-Regler aktiv', 'boolean', 'indicator', false);
        await mk('speicher.regelung.feneconGridSollW', 'FENECON FEMS NVP-Sollwert', 'number', 'value.power', 0);
        await mk('speicher.regelung.feneconGridTargetBatteryW', 'FENECON final erlaubter Batterie-Sollwert', 'number', 'value.power', 0);
        await mk('speicher.regelung.feneconGridEssActualPowerW', 'FENECON tatsächlich umgesetzte ESS-Leistung', 'number', 'value.power', null);
        await mk('speicher.regelung.feneconGridNvpW', 'FENECON NVP-Istwert für Zielumrechnung', 'number', 'value.power', null);
        await mk('speicher.regelung.feneconGridCalculationJson', 'FENECON FEMS-NVP-Berechnung (JSON)', 'string', 'json', '');
        await mk('speicher.regelung.feneconGridQuelle', 'FENECON FEMS-NVP-Regler Quelle', 'string', 'text', '');
        await mk('speicher.regelung.feneconGridGrund', 'FENECON FEMS-NVP-Regler Grund', 'string', 'text', '');
        await mk('speicher.regelung.feneconGridSchreibOk', 'FENECON FEMS-NVP-Sollwert Schreiben OK', 'boolean', 'indicator', false);
        await mk('speicher.regelung.feneconGridSchreibStatus', 'FENECON FEMS-NVP-Sollwert Schreibstatus', 'string', 'text', '');
        await mk('speicher.regelung.feneconGridTargetObjId', 'FENECON FEMS-NVP-Zieldatenpunkt', 'string', 'text', '');
        await mk('speicher.regelung.feneconGridLastWriteRaw', 'FENECON letzter FEMS-NVP-Rohwert', 'number', 'value');
        await mk('speicher.regelung.feneconGridReleaseStatus', 'FENECON Übergabe-/Freigabestatus', 'string', 'text', '');

        await ensureFeneconNvpShadowStates(mk);
        await mk('speicher.regelung.feneconHybridAktiv', 'Hybrid-/Gateway-Priorität aktiv', 'boolean', 'indicator', false);
        await mk('speicher.regelung.feneconHybridModus', 'Hybrid-/Gateway-Priorität Modus', 'string', 'text', '');
        await mk('speicher.regelung.feneconHybridGrund', 'Hybrid-/Gateway-Priorität Grund', 'string', 'text', '');
        await mk('speicher.regelung.feneconHybridSchreibmodus', 'Hybrid-/Gateway-Priorität Schreibmodus', 'string', 'text', '');
        await mk('speicher.regelung.feneconHybridPvW', 'Hybrid-/Gateway-Priorität erkannte PV-Leistung', 'number', 'value.power', null);
        await mk('speicher.regelung.feneconHybridZusatzPvW', 'Hybrid-/Gateway-Priorität erkannte Zusatz-PV-Leistung', 'number', 'value.power', 0);
        await mk('speicher.regelung.feneconHybridSchwelleW', 'FENECON PV-Schwelle fuer FEMS-Eigenregelung', 'number', 'value.power', 500);
        await mk('speicher.regelung.feneconHybridZusatzSchwelleW', 'Hybrid-/Gateway-Priorität Zusatz-PV-Schwellwert', 'number', 'value.power', 100);
        await mk('speicher.regelung.feneconHybridSollW', 'Hybrid-/Gateway-Priorität angewendeter Sollwert', 'number', 'value.power', 0);
        await mk('speicher.regelung.feneconHybridNvpW', 'Hybrid-/Gateway-Priorität Netzpunktleistung', 'number', 'value.power', null);
        await mk('speicher.regelung.feneconHybridForecastW', 'FENECON/OpenEMS Forecast-/Tagesleistung', 'number', 'value.power', 0);
        await mk('speicher.regelung.feneconHybridForecastQuelle', 'FENECON/OpenEMS Forecast-/Tagesquelle', 'string', 'text', '');
        await mk('speicher.regelung.feneconHybridTagAktiv', 'FENECON/OpenEMS Tag-/PV-Erkennung aktiv', 'boolean', 'indicator', false);
        await mk('speicher.regelung.feneconHybridAssistAktiv', 'FENECON/OpenEMS Assist aktiv', 'boolean', 'indicator', false);
        await mk('speicher.regelung.feneconHybridAssistSchwelleW', 'FENECON/OpenEMS Assist Netzbezugsschwelle', 'number', 'value.power', 800);
        await mk('speicher.regelung.feneconHybridRegelhoheit', 'FENECON Hybrid aktive Regelinstanz', 'string', 'text', '');
        await mk('speicher.regelung.feneconHybridNoWrite', 'FENECON Hybrid bewusster No-Write-Betrieb', 'boolean', 'indicator', false);
        await mk('speicher.regelung.feneconHybridPvFrisch', 'FENECON Hybrid PV-Messung frisch', 'boolean', 'indicator', false);
        await mk('speicher.regelung.feneconHybridPvQuelle', 'FENECON Hybrid PV-Messquelle', 'string', 'text', '');
        await mk('speicher.regelung.feneconHybridPvAlterMs', 'FENECON Hybrid Alter der PV-Messung', 'number', 'value.interval', null);
        await mk('speicher.regelung.feneconHybridFreigabeSchwelleW', 'FENECON PV-Schwelle fuer EOS-Uebernahme', 'number', 'value.power', 500);
        await mk('speicher.regelung.feneconHybridFreigabeVerzoegerungMs', 'FENECON Verzoegerung bis EOS-Uebernahme', 'number', 'value.interval', 120000);
        await mk('speicher.regelung.feneconHybridUebergabeVerzoegerungMs', 'FENECON Verzoegerung bis FEMS-Uebernahme', 'number', 'value.interval', 10000);
        await mk('speicher.regelung.feneconHybridPvUeberSchwelleSeitMs', 'FENECON PV ueber Schwelle seit', 'number', 'value.time', 0);
        await mk('speicher.regelung.feneconHybridPvUeberSchwelleDauerMs', 'FENECON PV ueber Schwelle Dauer', 'number', 'value.interval', 0);
        await mk('speicher.regelung.feneconHybridPvUnterSchwelleSeitMs', 'FENECON PV unter Schwelle seit', 'number', 'value.time', 0);
        await mk('speicher.regelung.feneconHybridPvUnterSchwelleDauerMs', 'FENECON PV unter Schwelle Dauer', 'number', 'value.interval', 0);
        await mk('speicher.regelung.feneconHybridHandoverZeroPending', 'FENECON 0-W-Uebergabestopp ausstehend', 'boolean', 'indicator', false);

        await mk('speicher.regelung.netzLeistungW', 'Netzleistung (W)', 'number', 'value.power');
        await mk('speicher.regelung.netzAlterMs', 'Netzleistung Alter (ms)', 'number', 'value.interval');
        await mk('speicher.regelung.netzLadenKonfiguriert', 'Netzladen im App-Center freigegeben', 'boolean', 'indicator', true);
        await mk('speicher.regelung.netzLadenErlaubt', 'Netzladen erlaubt', 'boolean', 'indicator', false);
        await mk('speicher.regelung.netzLadenSperrgrund', 'Netzladen Sperrgrund', 'string', 'text', '');
        await mk('speicher.regelung.entladenErlaubt', 'Entladen erlaubt', 'boolean', 'indicator', true);
        await mk('speicher.regelung.tarifState', 'Tarif Zustand', 'string', 'text', '');
        await mk('speicher.regelung.tarifPvBlock', 'Tarif-Netzladen durch PV-Forecast gesperrt', 'boolean', 'indicator', false);
        await mk('speicher.regelung.tarifPvBlockGrund', 'PV-Forecast Sperrgrund', 'string', 'text', '');
        await mk('speicher.regelung.tarifPvCapSocPct', 'Tarif PV‑Reserve: Netzlade-SoC-Cap (%)', 'number', 'value', null);
        await mk('speicher.regelung.tarifPvHeadroomSocPct', 'Tarif PV‑Reserve: Headroom (%)', 'number', 'value', null);
        await mk('speicher.regelung.tarifPvHeadroomKWh', 'Tarif PV‑Reserve: erwartbare PV-Ladung (kWh)', 'number', 'value.energy', null);

        await mk('speicher.regelung.policyJson', 'Policy/Audit (JSON)', 'string', 'text', '');
        await mk('speicher.regelung.policyBlocked', 'Speicheraktion durch Policy blockiert', 'boolean', 'indicator', false);
        await mk('speicher.regelung.policyBlockReason', 'Grund der Speicher-Policy-Sperre', 'string', 'text', '');
        await mk('speicher.regelung.policySource', 'Wirksame Speicher-Policy-Quelle', 'string', 'text', '');

        await mk('speicher.regelung.importLimitW', 'Netzbezug-Limit effektiv (W)', 'number', 'value.power');
        await mk('speicher.regelung.importLimitQuelle', 'Netzbezug-Limit Quelle', 'string', 'text');
        await mk('speicher.regelung.importHeadroomW', 'Netzbezug Headroom (W)', 'number', 'value.power');
        await mk('speicher.regelung.importHeadroomRawW', 'Netzbezug Headroom RAW (W)', 'number', 'value.power');

        await mk('speicher.regelung.lskHeadroomW', 'LSK Headroom (W)', 'number', 'value.power');
        await mk('speicher.regelung.lskHeadroomFilteredW', 'LSK Headroom gefiltert (W)', 'number', 'value.power');
        await mk('speicher.regelung.socPct', 'SoC (%)', 'number', 'value.battery');
        await mk('speicher.regelung.socAlterMs', 'SoC Alter (ms)', 'number', 'value.interval');

        await mk('speicher.regelung.reserveAktiv', 'Reserve aktiv', 'boolean', 'indicator', false);
        await mk('speicher.regelung.reserveMinSocPct', 'Mindest-SoC (%)', 'number', 'value', 0);
        await mk('speicher.regelung.reserveZielSocPct', 'Reserve Ziel-SoC (%)', 'number', 'value', 0);

        await mk('speicher.regelung.lskMinSocPct', 'LSK Min-SoC (%)', 'number', 'value', 0);
        await mk('speicher.regelung.lskMaxSocPct', 'LSK Max-SoC (%)', 'number', 'value', 0);
        await mk('speicher.regelung.lskPolicyAktiv', 'LSK-Policy aktiv', 'boolean', 'indicator', false);
        await mk('speicher.regelung.lskEntladenAktiviert', 'LSK-Entladen aktiviert', 'boolean', 'indicator', false);
        await mk('speicher.regelung.lskLadenAktiviert', 'LSK-Laden aktiviert', 'boolean', 'indicator', false);
        await mk('speicher.regelung.selfMinSocPct', 'Eigenverbrauch Min-SoC (%)', 'number', 'value', 0);
        await mk('speicher.regelung.selfMaxSocPct', 'Eigenverbrauch Max-SoC (%)', 'number', 'value', 0);
        await mk('speicher.regelung.strategyActive', 'Betriebsstrategie aktiv', 'boolean', 'indicator', false);
        await mk('speicher.regelung.strategyMinSocPct', 'Betriebsstrategie wirksamer Min-SoC (%)', 'number', 'value', null);
        await mk('speicher.regelung.strategyTargetSocPct', 'Betriebsstrategie Ziel-SoC (%)', 'number', 'value', null);
        await mk('speicher.regelung.strategyAbsoluteMinSocPct', 'Betriebsstrategie absolute Untergrenze (%)', 'number', 'value', null);
        await mk('speicher.regelung.strategyPhase', 'Betriebsstrategie Speicherphase', 'string', 'text', '');
        await mk('speicher.regelung.strategyReason', 'Betriebsstrategie Speichergrund', 'string', 'text', '');
        await mk('speicher.regelung.strategyExpiresAt', 'Betriebsstrategie gültig bis', 'number', 'value.time', 0);
        await mk('speicher.regelung.selfSocPolicySource', 'Eigenverbrauch SoC-Policy Quelle', 'string', 'text', '');
        await mk('speicher.regelung.selfSocPolicyJson', 'Eigenverbrauch SoC-Policy Diagnose (JSON)', 'string', 'json', '');
        await mk('speicher.regelung.selfTargetGridImportW', 'Eigenverbrauch Ziel-Netzbezug (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.selfImportThresholdW', 'Eigenverbrauch NVP-Messtoleranz (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.selfNvpTuningTopology', 'NVP tuning topology', 'string', 'text', '');
        await mk('speicher.regelung.selfNvpTuningSource', 'NVP tuning source', 'string', 'text', '');
        await mk('speicher.regelung.selfNvpTuningJson', 'NVP tuning details (JSON)', 'string', 'json', '{}');
        await mk('speicher.regelung.selfNvpRawW', 'Eigenverbrauch NVP RAW (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.selfNvpFilteredW', 'Eigenverbrauch NVP gefiltert (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.selfNvpControlW', 'Eigenverbrauch NVP Fuehrungswert (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.selfNvpControlMode', 'Eigenverbrauch NVP Führungsmodus', 'string', 'text', '');
        await mk('speicher.regelung.selfNvpFastServoActive', 'NVP-Schnellregler aktiv', 'boolean', 'indicator', true);
        await mk('speicher.regelung.selfNvpMeasurementToleranceW', 'NVP-Messtoleranz (±W)', 'number', 'value.power', 20);
        await mk('speicher.regelung.balanceAktiv', 'Speicher NVP-Balancing aktiv', 'boolean', 'indicator', false);
        await mk('speicher.regelung.balancePolicy', 'Speicher NVP-Balancing Policy', 'string', 'text', '');
        await mk('speicher.regelung.balanceMesswertW', 'Speicher NVP-Balancing letzter echter Batterie-Messwert (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.balanceIstLeistungW', 'Speicher NVP-Balancing verwendete Batterie-Istleistung (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.balanceIstLeistungAlterMs', 'Speicher-Istleistung Alter im NVP-Balancing (ms)', 'number', 'value.interval', null);
        await mk('speicher.regelung.balanceBasisW', 'Speicher NVP-Balancing Rechenbasis (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.balanceNvpW', 'Speicher NVP-Balancing Netzleistung (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.balanceNvpAlterMs', 'NVP Alter im Speicher-Balancing (ms)', 'number', 'value.interval', null);
        await mk('speicher.regelung.balanceNvpZielW', 'Speicher NVP-Balancing Ziel (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.balanceNvpFehlerW', 'Speicher NVP-Balancing Differenz (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.balanceNvpBandUnterW', 'Speicher NVP-Balancing untere Bandkante (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.balanceNvpBandOberW', 'Speicher NVP-Balancing obere Bandkante (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.balanceNvpAktivZielW', 'Speicher NVP-Balancing aktives Regelziel (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.balanceNvpBandFehlerW', 'Speicher NVP-Balancing Fehler zur Zielmitte außerhalb Toleranz (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.balanceBasisQuelle', 'Speicher NVP-Balancing Basisquelle', 'string', 'text', '');
        await mk('speicher.regelung.balanceRohSollW', 'Speicher NVP-Balancing Roh-Sollwert (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.balanceKorrekturW', 'Speicher NVP-Balancing Roh-Korrektur (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.balanceAngewandteKorrekturW', 'Speicher NVP-Balancing angewendete Korrektur (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.balanceSollW', 'Speicher NVP-Balancing Sollwert (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.balanceFeedbackVerwendet', 'Speicher-Istleistung im NVP-Balancing verwendet', 'boolean', 'indicator', false);
        await mk('speicher.regelung.balanceFeedbackQuelle', 'Speicher NVP-Balancing Feedbackquelle', 'string', 'text', '');
        await mk('speicher.regelung.balanceFeedbackGehalten', 'Speicher-Istwert im NVP-Balancing gehalten', 'boolean', 'indicator', false);
        await mk('speicher.regelung.balanceFeedbackPrognoseAktiv', 'Begrenzte Sollwertprognose im NVP-Balancing aktiv', 'boolean', 'indicator', false);
        await mk('speicher.regelung.balanceFeedbackPrognoseDeltaW', 'Begrenzte Sollwertprognose im NVP-Balancing (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.balanceFeedbackHaltezeitMs', 'Istwert-Haltezeit im NVP-Balancing (ms)', 'number', 'value.interval', 0);
        await mk('speicher.regelung.balanceMessversatzMs', 'Messversatz Batterie zu NVP (ms)', 'number', 'value.interval', null);
        await mk('speicher.regelung.balanceMessungSynchronErforderlich', 'Zeitgleiche Batterie-/NVP-Messung erforderlich', 'boolean', 'indicator', false);
        await mk('speicher.regelung.balanceMessungSynchron', 'Batterie-/NVP-Messung zeitlich synchron', 'boolean', 'indicator', false);
        await mk('speicher.regelung.balanceModus', 'Speicher NVP-Balancing Modus', 'string', 'text', 'inactive');
        await mk('speicher.regelung.balanceLetztenSollwertGehalten', 'Letzten nicht-null NVP-Sollwert im Zielband gehalten', 'boolean', 'indicator', false);
        await mk('speicher.regelung.zeroWriteFirewallAction', '0-W-Firewall Aktion', 'string', 'text', 'inactive');
        await mk('speicher.regelung.zeroWriteFirewallReason', '0-W-Firewall Grund', 'string', 'text', '');
        await mk('speicher.regelung.zeroWriteFirewallHeldW', '0-W-Firewall gehaltener Sollwert (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.zeroWriteFirewallExplicitStop', '0-W-Firewall expliziter Stop', 'boolean', 'indicator', false);
        await mk('speicher.regelung.zeroWriteFirewallBudgetZeroAgeMs', '0-W-Firewall Budget-0 Alter (ms)', 'number', 'value.interval', 0);
        await mk('speicher.regelung.zeroWriteFirewallMeasurementGapAgeMs', '0-W-Firewall Messluecken-Alter (ms)', 'number', 'value.interval', 0);
        await mk('speicher.regelung.balanceGehaltenSollW', 'Im NVP-Zielband gehaltener Speicher-Sollwert (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.balanceFeedForwardVerfuegbar', 'Direkter PV-/Last-Feed-forward verfügbar', 'boolean', 'indicator', false);
        await mk('speicher.regelung.balanceFeedForwardVerwendet', 'Direkter PV-/Last-Feed-forward verwendet', 'boolean', 'indicator', false);
        await mk('speicher.regelung.balanceFeedForwardSollW', 'PV-/Last-Feed-forward Speicher-Sollwert (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.balanceFeedForwardErwarteteIstW', 'Aus PV/Last/NVP erwartete Speicher-Istleistung (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.balanceFeedForwardPvW', 'Direkte PV-Leistung im Feed-forward (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.balanceFeedForwardLastW', 'Direkter Gebäudeverbrauch im Feed-forward (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.balanceFeedForwardPvQuelle', 'PV-Quelle des Feed-forward', 'string', 'text', '');
        await mk('speicher.regelung.balanceFeedForwardLastQuelle', 'Lastquelle des Feed-forward', 'string', 'text', '');
        await mk('speicher.regelung.balanceFeedForwardGrund', 'Grund/Status des PV-/Last-Feed-forward', 'string', 'text', '');
        await mk('speicher.regelung.balanceFeedForwardMessversatzMs', 'Messversatz PV/Last/NVP Feed-forward (ms)', 'number', 'value.interval', null);
        await mk('speicher.regelung.balanceFeedbackPlausibilitaetsfehlerW', 'Plausibilitätsfehler Batterie-Ist zu PV-/Last-Bilanz (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.balanceFeedbackDurchFeedForwardVerworfen', 'Batterie-Istwert wegen PV-/Last-Plausibilität verworfen', 'boolean', 'indicator', false);
        await mk('speicher.regelung.balanceAsyncAnchorAktiv', 'Asynchroner Speicher-Kommandoanker aktiv', 'boolean', 'indicator', false);
        await mk('speicher.regelung.balanceAsyncGeschaetzteIstleistungW', 'Aus NVP-Reaktion geschätzte Speicher-Istleistung (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.balanceAsyncRestNvpAenderungW', 'Nicht dem Speicher zugeordnete NVP-Änderung (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.balanceAsyncJson', 'Asynchrones Speicherfeedback Diagnose (JSON)', 'string', 'json', '');
        await mk('speicher.regelung.pvBudgetAllocationMode', 'PV-Ueberschuss Prioritaetsmodus', 'string', 'text', '');
        await mk('speicher.regelung.pvBudgetRemainingBeforeStorageW', 'PV-Restbudget vor Speicher (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.pvBudgetStorageAvailableW', 'PV-Budget fuer Speicher (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.pvBudgetReservedW', 'Vom Speicher reserviertes PV-Budget (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.pvBudgetPostVendorCapW', 'Finaler PV-Budget-Cap nach Herstellerlogik (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.pvBudgetPostVendorCapped', 'Hersteller-Sollwert durch finales PV-Budget begrenzt', 'boolean', 'indicator', false);
        await mk('speicher.regelung.pvBudgetPostVendorNoWriteHold', 'Speicher hält bei kurzzeitigem PV-Budget 0 ohne Schreibzugriff', 'boolean', 'indicator', false);
        await mk('speicher.regelung.pvBudgetPostVendorNoWriteReason', 'Grund für Speicher PV-Budget No-Write/Hold', 'string', 'text', '');
        await mk('speicher.regelung.pvBudgetRuntimeRemainingW', 'PV-Restbudget laut Runtime vor Speicher (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.pvBudgetAllocationDerivedW', 'Aus EVCS-Allocation abgeleitetes Speicher-PV-Budget (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.pvBudgetEvcsReservedW', 'Im zentralen Budget reservierter EVCS-PV-Anteil (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.pvBudgetResolution', 'Quelle/Abgleich des Speicher-PV-Budgets', 'string', 'text', 'runtime-remaining');
        await mk('speicher.regelung.totalBudgetStorageAvailableW', 'Zentrales Gesamtbudget fuer Speicher-Netzladen (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.totalBudgetStorageReservedW', 'Vom Speicher reserviertes Gesamtbudget fuer Netzladen (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.totalBudgetStorageCapped', 'Speicher-Netzladen durch zentrales Gesamtbudget begrenzt', 'boolean', 'indicator', false);
        await mk('speicher.regelung.selfEntladenAktiviert', 'Eigenverbrauch-Entladen aktiviert', 'boolean', 'indicator', false);
        await mk('speicher.regelung.evcsSpeicherSchutzLastW', 'EVCS-Leistung mit Speicher-Schutz (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.evcsSpeicherSchutzWallboxen', 'Wallboxen mit Speicher-Schutz', 'number', 'value', 0);
        await mk('speicher.regelung.evcsSpeicherMitnutzungLastW', 'EVCS-Leistung mit Speicher-Mitnutzung (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.evcsSpeicherSchutzNvpZielOffsetW', 'Legacy NVP-Zieloffset durch EVCS-Speicher-Schutz (W, ab 0.8.133 immer 0)', 'number', 'value.power', 0);
        await mk('speicher.regelung.evcsSpeicherSchutzAktiv', 'Asymmetrischer EVCS-Speicherschutz aktiv', 'boolean', 'indicator', false);
        await mk('speicher.regelung.evcsSpeicherSchutzLastUnbekannt', 'Speicherschutz: Fahrzeuglast unbekannt, Entladung gesperrt', 'boolean', 'indicator', false);
        await mk('speicher.regelung.evcsSpeicherSchutzUnbekannteWallboxen', 'Geschützte Ladepunkte mit unbekannter Fahrzeuglast', 'number', 'value', 0);
        await mk('speicher.regelung.evcsSpeicherSchutzAktion', 'Asymmetrischer EVCS-Speicherschutz Aktion', 'string', 'text', '');
        await mk('speicher.regelung.evcsSpeicherSchutzJson', 'Asymmetrischer EVCS-Speicherschutz Diagnose', 'string', 'json', '');
        await mk('speicher.regelung.evcsSpeicherSchutzQuelle', 'Quelle der EVCS-Speicher-Policy', 'string', 'text', '');

        // Sungrow-Hybrid-Diagnoseobjekte vor dem ersten zyklischen Schreiben anlegen.
        // Zusätzlich sichert _setIfChanged fehlende Runtime-States ab, falls ein Update
        // ohne sauberen Objekt-Neuaufbau gestartet wurde.
        await mk('speicher.regelung.sungrowHybridAktiv', 'Sungrow Hybrid Herstellerprofil aktiv', 'boolean', 'indicator', false);
        await mk('speicher.regelung.sungrowHybridModus', 'Sungrow Hybrid Modus', 'string', 'text', '');
        await mk('speicher.regelung.sungrowHybridGrund', 'Sungrow Hybrid Grund', 'string', 'text', '');
        await mk('speicher.regelung.sungrowHybridSchreibmodus', 'Sungrow Hybrid Schreibmodus', 'string', 'text', '');
        await mk('speicher.regelung.sungrowHybridSollW', 'Sungrow Hybrid angewendeter Sollwert', 'number', 'value.power', 0);
        await mk('speicher.regelung.sungrowHybridPvW', 'Sungrow Hybrid erkannte PV-Leistung', 'number', 'value.power', 0);
        await mk('speicher.regelung.sungrowHybridLastW', 'Sungrow Hybrid erkannte Gebäudelast', 'number', 'value.power', 0);
        await mk('speicher.regelung.sungrowHybridNvpW', 'Sungrow Hybrid Netzpunktleistung', 'number', 'value.power', null);
        await mk('speicher.regelung.sungrowHybridImportW', 'Sungrow Hybrid Netzbezug', 'number', 'value.power', 0);
        await mk('speicher.regelung.sungrowHybridExportW', 'Sungrow Hybrid Netzeinspeisung', 'number', 'value.power', 0);
        await mk('speicher.regelung.sungrowHybridPvDecktLast', 'Sungrow Hybrid PV deckt Gebäudelast', 'boolean', 'indicator', false);
        await mk('speicher.regelung.sungrowHybridSchwelleW', 'Sungrow Hybrid PV-Schwellwert', 'number', 'value.power', 300);
        await mk('speicher.regelung.sungrowHybridLastReserveW', 'Sungrow Hybrid Lastdeckungsreserve', 'number', 'value.power', 300);
        await mk('speicher.regelung.sungrowHybridImportSchwelleW', 'Sungrow Hybrid Import-Schwelle', 'number', 'value.power', 100);

        await mk('speicher.regelung.sungrowHybridNvpZielW', 'Sungrow NVP Zielbezug (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.sungrowHybridNvpDeadbandW', 'Sungrow NVP Deadband (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.sungrowHybridNvpFehlerW', 'Sungrow NVP Regelfehler (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.sungrowHybridNvpBalanceBasisW', 'Sungrow NVP Balancing Basis/Ist (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.sungrowHybridNvpBalanceZielW', 'Sungrow NVP Balancing Ziel (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.sungrowHybridNvpBalanceAktiv', 'Sungrow NVP Balancing aktiv', 'boolean', 'indicator', false);

        // E3/DC-RSCP-Diagnoseobjekte vor dem ersten Schreibzugriff anlegen.
        // Der ioBroker.e3dc-rscp Adapter nutzt SET_POWER_MODE + SET_POWER_VALUE;
        // diese States zeigen transparent, welches RSCP-Tupel NexoWatt zuletzt gesetzt hat.
        await mk('speicher.regelung.e3dcRscpAktiv', 'E3/DC RSCP Herstellerprofil aktiv', 'boolean', 'indicator', false);
        await mk('speicher.regelung.e3dcRscpModus', 'E3/DC RSCP Modus', 'string', 'text', '');
        await mk('speicher.regelung.e3dcRscpModeCode', 'E3/DC RSCP SET_POWER_MODE Code', 'number', 'value', 0);
        await mk('speicher.regelung.e3dcRscpValueW', 'E3/DC RSCP SET_POWER_VALUE (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.e3dcRscpSollW', 'E3/DC RSCP NexoWatt Sollwert (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.e3dcRscpSchreibmodus', 'E3/DC RSCP Schreibmodus', 'string', 'text', '');
        await mk('speicher.regelung.e3dcRscpQuelle', 'E3/DC RSCP Quelle', 'string', 'text', '');
        await mk('speicher.regelung.e3dcRscpGrund', 'E3/DC RSCP Grund', 'string', 'text', '');
        await mk('speicher.regelung.e3dcRscpGridCharge', 'E3/DC RSCP GRID_CHARGE aktiv', 'boolean', 'indicator', false);
        await mk('speicher.regelung.e3dcRscpZeroMode', 'E3/DC RSCP 0-W-Modus', 'string', 'text', 'normal');
        await mk('speicher.regelung.e3dcRscpPowerLimitsUsed', 'E3/DC RSCP PowerLimits gesetzt', 'boolean', 'indicator', false);
        await mk('speicher.regelung.e3dcRscpSchreibOk', 'E3/DC RSCP Schreiben OK', 'boolean', 'indicator', false);
        await mk('speicher.regelung.policyMode', 'Speicher-Policy-Modus', 'string', 'text', 'eigenverbrauch');
        await mk('speicher.regelung.policyLayerStorageOnly', 'Policy-Schicht reine Eigenverbrauchsoptimierung', 'boolean', 'indicator', true);
        await mk('speicher.regelung.multiUsePolicyActive', 'MultiUse-Policy aktiv', 'boolean', 'indicator', false);
        await mk('speicher.regelung.multiUsePolicyIgnored', 'Inaktive MultiUse-Policy ignoriert', 'boolean', 'indicator', false);

        await mk('speicher.regelung.maxChargeW', 'Max Ladeleistung (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.maxDischargeW', 'Max Entladeleistung (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.stepW', 'Schrittweite (W)', 'number', 'value', 0);
        await mk('speicher.regelung.maxDeltaWPerTick', 'Max Änderung je Takt (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.pvSchwelleW', 'PV-Überschuss-Schwelle (W)', 'number', 'value.power', 0);
    }

    /**
     * Code-Teil: Methode `_setIfChanged`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _setIfChanged
     * Zweck: Schreibt interne States oder veröffentlichte Runtime-Werte.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _ensureRuntimeStateObject(id, val) {
        // Sicherheitsnetz fuer Feld-Updates: Wenn ein neuer Diagnose-State vor dem
        // Objekt-Rebuild geschrieben wird, legt ioBroker sonst bei jedem Tick eine
        // Warnung ins Log. Wir legen nur eigene Runtime-States im Speicher-Regelungs-
        // Namespace nachtraeglich an und vermeiden damit Log-Spam durch neue States.
        try {
            if (!this.adapter || typeof this.adapter.setObjectNotExistsAsync !== 'function') return;
            const sid = String(id || '');
            if (!sid.startsWith('speicher.regelung.')) return;
            const numericById = /W$|Pct$|Ms$|Limit|Headroom|Schwelle|Reserve|Soc|SoC|Ziel|Fehler|Basis/.test(sid);
            const booleanById = /Aktiv$|Ok$|Erlaubt$|DecktLast$|Ignored$|Active$/.test(sid);
            const type = (typeof val === 'boolean' || booleanById)
                ? 'boolean'
                : ((typeof val === 'number' || numericById) ? 'number' : 'string');
            let role = type === 'boolean' ? 'indicator' : (type === 'number' ? 'value' : 'text');
            if (type === 'number') {
                if (/W$/.test(sid) || /Power/.test(sid) || /Leistung/.test(sid)) role = 'value.power';
                else if (/Ms$/.test(sid) || /Alter/.test(sid)) role = 'value.interval';
            }
            await this.adapter.setObjectNotExistsAsync(sid, {
                type: 'state',
                common: { name: sid, type, role, read: true, write: false, def: val === undefined ? null : val },
                native: {},
            });
        } catch {
            // Diagnose-Objekterstellung darf den Regeltakt nie abbrechen.
        }
    }

    async _setIfChanged(id, val) {
        const v = (val === undefined) ? null : val;
        try {
            const cur = await this.adapter.getStateAsync(id);
            const curVal = cur ? cur.val : null;
            if (cur && curVal === v) return;
            if (!cur) await this._ensureRuntimeStateObject(id, v);
            await this.adapter.setStateAsync(id, v, true);
        } catch (e) {
            // ignore
        }
    }

    /**
     * Code-Teil: Methode `_readOwnNumber`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readOwnNumber
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _readOwnNumber(id) {
        try {
            const s = await this.adapter.getStateAsync(id);
            const n = Number(s ? s.val : NaN);
            return Number.isFinite(n) ? n : null;
        } catch {
            return null;
        }
    }

    /**
     * Code-Teil: _readOwnNumberFresh
     * Zweck: Liest interne Diagnose-/Koordinationswerte nur, wenn sie frisch sind.
     * Zusammenhang: EVCS-Speicher-Schutz darf einen Speicher nicht mit alten Wallbox-
     * Leistungswerten sperren; deshalb wird der ioBroker-State-Zeitstempel hier hart
     * gegen einen Maximalwert geprüft.
     */
    async _readOwnNumberFresh(id, maxAgeMs = 60000) {
        try {
            const s = await this.adapter.getStateAsync(id);
            if (!s) return null;
            const ts = Number(s.ts);
            if (Number.isFinite(ts) && maxAgeMs > 0 && (Date.now() - ts) > maxAgeMs) return null;
            const n = Number(s.val);
            return Number.isFinite(n) ? n : null;
        } catch {
            return null;
        }
    }

    /**
     * Code-Teil: Methode `_readOwnString`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readOwnString
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _readOwnString(id) {
        try {
            const s = await this.adapter.getStateAsync(id);
            if (!s) return '';
            const v = s.val;
            if (v === null || v === undefined) return '';
            return String(v);
        } catch {
            return '';
        }
    }
}
/**
 * Code-Teil: num
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function num(v, dflt = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : dflt;
}
/**
 * Code-Teil: clamp
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function clamp(n, min, max) {
    if (!Number.isFinite(n)) return n;
    if (Number.isFinite(min)) n = Math.max(min, n);
    if (Number.isFinite(max)) n = Math.min(max, n);
    return n;
}

module.exports = {
    SpeicherRegelungModule,
    resolveEvcsProtectedStorageTarget,
    resolveEvcsStorageProtectionSnapshot,
    resolveStorageAntiExportTarget,
    resolveStorageLicenseEdition,
    deriveStorageRatedPowerW,
    resolveStorageLicensePowerProfile,
    applyStorageLicensePowerLimit,
    resolveNvpBandTarget,
    isCentralStorageGridChargeSource,
    resolveStrictStorageTariffPermission,
    resolveStorageGridChargeGateSource,
    resolveStorageGridChargeFinalGate,
    resolveStoragePvOnlyChargeSafetyGate,
    resolveStorageZeroExportProbeRequest,
};
