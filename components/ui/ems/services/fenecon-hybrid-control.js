/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/services/fenecon-hybrid-control.ts
 * Quell-Hash: sha256:2944c79cd315d306ff22a86264a9855ebf43e072da979a99e1f6aaf444565617
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/fenecon-hybrid-control.js.
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
 * Aufgabe: Kapselt Fenecon-spezifische Betriebs- und Sollwertbedingungen für die Speicher-/Hybridanbindung.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/fenecon-hybrid-control.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
function text(value) {
    return String(value === undefined || value === null ? '' : value).trim();
}
function finite(value) {
    if (value === null || value === undefined)
        return null;
    if (typeof value === 'string' && !value.trim())
        return null;
    if (typeof value !== 'number' && typeof value !== 'string')
        return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}
function clamp(value, minValue, maxValue) {
    let out = value;
    if (minValue !== null)
        out = Math.max(minValue, out);
    if (maxValue !== null)
        out = Math.min(maxValue, out);
    return out;
}
function normalizeObjectId(value) {
    return text(value).replace(/\s+/g, '').toLowerCase();
}
function sameObjectId(a, b) {
    const aa = normalizeObjectId(a);
    const bb = normalizeObjectId(b);
    return !!(aa && bb && aa === bb);
}
function normalizeVendorProfile(value) {
    const raw = text(value).toLowerCase();
    if (['fenecon', 'openems', 'fems', 'fenecon-openems'].includes(raw))
        return 'fenecon-openems';
    if (['sungrow', 'sungrow-ess', 'sungrow-hybrid'].includes(raw))
        return 'sungrow-hybrid';
    if (['e3dc', 'e3/dc', 'e3dc-rscp', 'e3dc-rscp-iobroker'].includes(raw))
        return 'e3dc-rscp';
    return raw || 'generic';
}
function normalizeControlMode(value) {
    const raw = text(value).toLowerCase();
    if (['fems-grid', 'fems', 'fems-nvp', 'native', 'native-grid', 'grid-target'].includes(raw))
        return 'fems-grid';
    if (['direct-ess', 'direct', 'ess', 'set-active-power', 'direct-power'].includes(raw))
        return 'direct-ess';
    // Migration: fruehere Bezeichnungen werden auf die neue PV-abhaengige
    // FEMS-/EOS-Automatik abgebildet.
    if (['hybrid-auto', 'pv-pass-through', 'day-fems-night-direct', 'fems-day-direct-night'].includes(raw))
        return 'auto';
    return 'auto';
}
function isFeneconHybrid(config = {}) {
    const profile = normalizeVendorProfile(config.vendorProfile);
    const coupling = text(config.coupling).toLowerCase();
    return profile === 'fenecon-openems' && (coupling === 'dc' || coupling === 'hybrid');
}
function getNativeTargetId(config = {}) {
    return text(config.feneconGridSetpointObjectId
        || config.feneconGridSetpointId
        || config.femsGridSetpointObjectId
        || config.femsGridSetpointId);
}
function getDirectTargetIds(config = {}) {
    return [
        config.setSignedPowerId,
        config.setSignedPowerObjectId,
        config.targetPowerObjectId,
        config.targetPowerId,
        config.setChargePowerId,
        config.setChargePowerObjectId,
        config.targetChargePowerObjectId,
        config.setDischargePowerId,
        config.setDischargePowerObjectId,
        config.targetDischargePowerObjectId,
    ].map(text).filter(Boolean);
}
function getEssActualPowerId(config = {}) {
    return text(config.feneconEssActualPowerObjectId
        || config.feneconEssActualPowerId
        || config.essActualPowerObjectId
        || config.essActualPowerId
        || config.signedPowerId);
}
function hasWritableNativeTarget(config = {}) {
    return !!getNativeTargetId(config);
}
function hasWritableDirectTarget(config = {}, context = {}) {
    if (context.directTargetAvailable === true)
        return true;
    return getDirectTargetIds(config).length > 0;
}
function isPowerBalanceObjectId(value) {
    const id = normalizeObjectId(value);
    if (!id)
        return false;
    return /(?:^|\.)aliases(?:\.v1)?\.r\.powerbalance(?:$|\.)/.test(id)
        || /(?:^|[._/-])powerbalance(?:$|[._/-])/.test(id)
        || /batterypowerbalance/.test(id);
}
function isLikelyDirectEssSetpointObjectId(value) {
    const id = normalizeObjectId(value);
    if (!id)
        return false;
    return /(?:^|\.)aliases(?:\.v1)?\.ctrl\.powersetpointw(?:$|\.)/.test(id)
        || /setactivepowerequals/.test(id)
        || /(?:^|[._/-])706(?:$|[._/-])/.test(id);
}
function isLikelyFemsGridTargetObjectId(value) {
    const id = normalizeObjectId(value);
    if (!id)
        return false;
    return /(?:^|\.)aliases(?:\.v1)?\.ctrl\.(?:gridsetpointw|napsetpointw)(?:$|\.)/.test(id)
        || /setgridactivepower/.test(id)
        || /ctrlbalancing/.test(id);
}
function isLikelyFemsGridMeasurementObjectId(value) {
    const id = normalizeObjectId(value);
    if (!id || isLikelyFemsGridTargetObjectId(id))
        return false;
    return /(?:^|\.)aliases(?:\.v1)?\.r\.(?:gridpower|gridactivepower|powergrid|nvppower|nappower)(?:$|\.)/.test(id)
        || /(?:^|\.)r\.(?:gridpower|gridactivepower|powergrid|nvppower|nappower)(?:$|\.)/.test(id)
        || /(?:^|[._/-])(?:gridpower|powergrid|nvppower|nappower)(?:$|[._/-])/.test(id);
}
function resolveControlMode(config = {}, context = {}) {
    const requestedMode = normalizeControlMode(config.feneconControlMode || config.controlModeMode || config.feneconHybridControlMode);
    const hybrid = isFeneconHybrid(config);
    const nativeTargetId = getNativeTargetId(config);
    const configuredDirectTargetIds = getDirectTargetIds(config);
    const nativeTargetIsMeasurement = isLikelyFemsGridMeasurementObjectId(nativeTargetId);
    const nativeTargetIsDirectEssSetpoint = isLikelyDirectEssSetpointObjectId(nativeTargetId)
        && !isLikelyFemsGridTargetObjectId(nativeTargetId);
    const nativeTargetWritable = context.nativeTargetWritable !== false;
    const nativeTargetAvailable = !!nativeTargetId
        && !nativeTargetIsMeasurement
        && !nativeTargetIsDirectEssSetpoint
        && nativeTargetWritable;
    const migratedDirectTargetId = requestedMode !== 'fems-grid' && nativeTargetIsDirectEssSetpoint
        ? nativeTargetId
        : '';
    const effectiveDirectTargetIds = configuredDirectTargetIds.length
        ? configuredDirectTargetIds
        : (migratedDirectTargetId ? [migratedDirectTargetId] : []);
    const directTargetAvailable = hasWritableDirectTarget(config, context) || !!migratedDirectTargetId;
    const writableStorageCountRaw = finite(context.writableStorageCount);
    const writableStorageCount = writableStorageCountRaw === null ? 1 : Math.max(0, Math.round(writableStorageCountRaw));
    const otherWritableStorageCountRaw = finite(context.otherWritableStorageCount);
    const otherWritableStorageCount = otherWritableStorageCountRaw === null
        ? Math.max(0, writableStorageCount - 1)
        : Math.max(0, Math.round(otherWritableStorageCountRaw));
    const common = {
        hybrid,
        requestedMode,
        nativeTargetAvailable,
        nativeTargetIsMeasurement,
        nativeTargetIsDirectEssSetpoint,
        nativeTargetWritable,
        directTargetAvailable,
        nativeTargetId,
        directTargetIds: configuredDirectTargetIds,
        effectiveDirectTargetIds,
        migratedDirectTargetId,
        writableStorageCount,
        otherWritableStorageCount,
    };
    if (!hybrid) {
        return {
            ...common,
            eligible: false,
            mode: requestedMode === 'fems-grid' ? 'invalid' : 'direct-ess',
            reason: requestedMode === 'fems-grid'
                ? 'fems-grid-requires-fenecon-dc-hybrid'
                : 'not-fenecon-hybrid',
        };
    }
    if (requestedMode === 'fems-grid') {
        if (nativeTargetIsDirectEssSetpoint) {
            return { ...common, eligible: true, mode: 'invalid', reason: 'fenecon-grid-target-is-direct-ess-setpoint' };
        }
        if (nativeTargetIsMeasurement) {
            return { ...common, eligible: true, mode: 'invalid', reason: 'fems-grid-target-is-measurement' };
        }
        if (!nativeTargetWritable) {
            return { ...common, eligible: true, mode: 'invalid', reason: 'fems-grid-target-not-writable' };
        }
        if (!nativeTargetAvailable) {
            return { ...common, eligible: true, mode: 'invalid', reason: 'fems-grid-target-missing' };
        }
        if (otherWritableStorageCount > 0) {
            return { ...common, eligible: true, mode: 'invalid', reason: 'fems-grid-master-requires-exclusive-storage' };
        }
        return { ...common, eligible: true, mode: 'fems-grid', reason: 'explicit-fems-grid' };
    }
    if (requestedMode === 'direct-ess') {
        if (!directTargetAvailable) {
            return { ...common, eligible: true, mode: 'invalid', reason: 'direct-ess-target-missing' };
        }
        return { ...common, eligible: true, mode: 'direct-ess', reason: 'explicit-direct-ess' };
    }
    // Der technische EOS-Kommandopfad wird deterministisch aufgeloest. Ob EOS
    // diesen Pfad im jeweiligen Zyklus benutzen darf, entscheidet anschliessend
    // resolveHybridAuthority() anhand der frischen PV-Leistung.
    if (otherWritableStorageCount > 0) {
        if (!directTargetAvailable) {
            return { ...common, eligible: true, mode: 'invalid', reason: 'auto-mixed-farm-direct-target-missing' };
        }
        return { ...common, eligible: true, mode: 'direct-ess', reason: 'auto-mixed-farm-direct-ess' };
    }
    if (nativeTargetIsDirectEssSetpoint && directTargetAvailable) {
        return { ...common, eligible: true, mode: 'direct-ess', reason: 'auto-direct-setpoint-migrated-to-direct-ess' };
    }
    if (nativeTargetIsMeasurement && directTargetAvailable) {
        return { ...common, eligible: true, mode: 'direct-ess', reason: 'auto-grid-measurement-ignored-direct-ess' };
    }
    if (!nativeTargetWritable && nativeTargetId && directTargetAvailable) {
        return { ...common, eligible: true, mode: 'direct-ess', reason: 'auto-readonly-grid-target-ignored-direct-ess' };
    }
    if (nativeTargetAvailable) {
        return { ...common, eligible: true, mode: 'fems-grid', reason: 'auto-dedicated-fems-grid-target' };
    }
    if (directTargetAvailable) {
        return { ...common, eligible: true, mode: 'direct-ess', reason: 'auto-direct-ess-fallback' };
    }
    if (nativeTargetIsDirectEssSetpoint) {
        return { ...common, eligible: true, mode: 'invalid', reason: 'auto-direct-setpoint-migration-unavailable' };
    }
    if (nativeTargetIsMeasurement) {
        return { ...common, eligible: true, mode: 'invalid', reason: 'auto-grid-measurement-without-direct-target' };
    }
    if (!nativeTargetWritable && nativeTargetId) {
        return { ...common, eligible: true, mode: 'invalid', reason: 'auto-readonly-grid-target-without-direct-target' };
    }
    return { ...common, eligible: true, mode: 'invalid', reason: 'auto-no-writable-fenecon-target' };
}
function resolveHybridAuthority(config = {}, runtime = {}) {
    const resolution = resolveControlMode(config, runtime);
    const nowMs = Math.max(0, finite(runtime.nowMs) ?? Date.now());
    const pvW = finite(runtime.pvW);
    const pvFresh = runtime.pvFresh === true && pvW !== null;
    const previousAuthorityRaw = text(runtime.previousAuthority).toLowerCase();
    const previousAuthority = previousAuthorityRaw === 'nexowatt' || previousAuthorityRaw === 'eos'
        ? 'nexowatt'
        : 'fems';
    const onThresholdRaw = finite(config.feneconPvOnThresholdW
        ?? config.feneconPvPassthroughThresholdW
        ?? config.feneconPvPassthroughW
        ?? config.feneconPvThresholdW);
    const offThresholdRaw = finite(config.feneconPvOffThresholdW
        ?? config.feneconPvReleaseW
        ?? config.feneconPvReleaseThresholdW);
    const onThresholdW = Math.max(0, onThresholdRaw ?? 500);
    const offThresholdW = Math.max(0, Math.min(onThresholdW, offThresholdRaw ?? 500));
    const onDelayMs = Math.max(0, (finite(config.feneconPvPassthroughDelaySec) ?? 10) * 1000);
    const offDelayMs = Math.max(0, (finite(config.feneconPvReleaseDelaySec) ?? 120) * 1000);
    let pvAboveSinceMs = Math.max(0, finite(runtime.pvAboveSinceMs) ?? 0);
    let pvBelowSinceMs = Math.max(0, finite(runtime.pvBelowSinceMs) ?? 0);
    const result = (authority, reason) => {
        const pvAboveForMs = pvAboveSinceMs > 0 ? Math.max(0, nowMs - pvAboveSinceMs) : 0;
        const pvBelowForMs = pvBelowSinceMs > 0 ? Math.max(0, nowMs - pvBelowSinceMs) : 0;
        return {
            authority,
            noWrite: authority === 'fems',
            mode: resolution.mode,
            requestedMode: resolution.requestedMode,
            reason,
            pvW,
            pvFresh,
            onThresholdW,
            offThresholdW,
            onDelayMs,
            offDelayMs,
            pvAboveSinceMs,
            pvAboveForMs,
            pvBelowSinceMs,
            pvBelowForMs,
            transitionPending: authority === previousAuthority
                && ((pvW !== null && pvW > onThresholdW && authority === 'nexowatt')
                    || (pvW !== null && pvW < offThresholdW && authority === 'fems')),
            resolution,
        };
    };
    if (resolution.mode === 'invalid') {
        pvAboveSinceMs = 0;
        pvBelowSinceMs = 0;
        return result('blocked', resolution.reason);
    }
    // Explizite Expertenmodi bleiben kontinuierlich unter EOS-Hoheit. Ebenso
    // bleibt eine gemischte Farm beim zentralen EOS-Dispatcher; nur ein exklusiver
    // einzelner DC-/Hybrid-Speicher darf in die FEMS-Eigenregelung wechseln.
    if (resolution.requestedMode !== 'auto' || !resolution.hybrid || resolution.otherWritableStorageCount > 0) {
        pvAboveSinceMs = 0;
        pvBelowSinceMs = 0;
        return result('nexowatt', `Kontinuierlicher expliziter FENECON-Regelpfad: ${resolution.reason}`);
    }
    // Ein fehlender/veralteter PV-Wert darf niemals als 0 W interpretiert werden.
    // Fail-safe besitzt dann FEMS die Reglerhoheit; die zentrale 0-W-Firewall kann
    // einen echten Sperr-/Sicherheitsbefehl trotzdem separat freigeben.
    if (!pvFresh) {
        pvAboveSinceMs = 0;
        pvBelowSinceMs = 0;
        return result('fems', 'FENECON Automatik: PV-Messung fehlt oder ist veraltet – FEMS-Eigenregelung, kein EOS-Leistungsbefehl');
    }
    if (pvW > onThresholdW) {
        pvBelowSinceMs = 0;
        if (previousAuthority === 'fems') {
            pvAboveSinceMs = 0;
            return result('fems', `FENECON Automatik: PV ${Math.round(pvW)} W > ${Math.round(onThresholdW)} W – FEMS-Eigenregelung`);
        }
        if (!pvAboveSinceMs)
            pvAboveSinceMs = nowMs;
        const aboveForMs = Math.max(0, nowMs - pvAboveSinceMs);
        if (aboveForMs >= onDelayMs) {
            return result('fems', `FENECON Automatik: PV seit ${Math.round(aboveForMs / 1000)} s > ${Math.round(onThresholdW)} W – Uebergabe an FEMS`);
        }
        return result('nexowatt', `FENECON Automatik: PV-Uebergabe an FEMS wird entprellt (${Math.round(aboveForMs / 1000)}/${Math.round(onDelayMs / 1000)} s)`);
    }
    if (pvW < offThresholdW) {
        pvAboveSinceMs = 0;
        if (previousAuthority === 'nexowatt') {
            pvBelowSinceMs = 0;
            return result('nexowatt', `FENECON Automatik: PV ${Math.round(pvW)} W < ${Math.round(offThresholdW)} W – EOS-Regelung`);
        }
        if (!pvBelowSinceMs)
            pvBelowSinceMs = nowMs;
        const belowForMs = Math.max(0, nowMs - pvBelowSinceMs);
        if (belowForMs >= offDelayMs) {
            return result('nexowatt', `FENECON Automatik: PV seit ${Math.round(belowForMs / 1000)} s < ${Math.round(offThresholdW)} W – EOS uebernimmt`);
        }
        return result('fems', `FENECON Automatik: EOS-Uebernahme wird entprellt (${Math.round(belowForMs / 1000)}/${Math.round(offDelayMs / 1000)} s)`);
    }
    pvAboveSinceMs = 0;
    pvBelowSinceMs = 0;
    return result(previousAuthority, `FENECON Automatik: PV ${Math.round(pvW)} W im Umschaltband – Reglerhoheit bleibt bei ${previousAuthority === 'fems' ? 'FEMS' : 'EOS'}`);
}
function validateSingleConfig(config = {}, context = {}) {
    const resolution = resolveControlMode(config, context);
    if (!isFeneconHybrid(config)) {
        return {
            ok: resolution.mode !== 'invalid',
            reason: resolution.mode === 'invalid' ? resolution.reason : 'not-fenecon-hybrid',
            resolution,
        };
    }
    const configuredNativeTargetId = getNativeTargetId(config);
    const nativeTargetId = resolution.nativeTargetIsDirectEssSetpoint && resolution.requestedMode !== 'fems-grid'
        ? ''
        : configuredNativeTargetId;
    const directTargetIds = Array.isArray(resolution.effectiveDirectTargetIds)
        ? resolution.effectiveDirectTargetIds.map(text).filter(Boolean)
        : getDirectTargetIds(config);
    const essActualPowerId = getEssActualPowerId(config);
    if (resolution.mode === 'invalid') {
        return {
            ok: false,
            reason: resolution.reason,
            resolution,
            nativeTargetId,
            configuredNativeTargetId,
            directTargetIds,
            essActualPowerId,
        };
    }
    if (!essActualPowerId) {
        return { ok: false, reason: 'fenecon-ess-actual-power-missing', resolution, nativeTargetId, directTargetIds, essActualPowerId };
    }
    if (isPowerBalanceObjectId(essActualPowerId)) {
        return { ok: false, reason: 'fenecon-power-balance-not-valid-as-ess-feedback', resolution, nativeTargetId, directTargetIds, essActualPowerId };
    }
    if (nativeTargetId && directTargetIds.some((id) => sameObjectId(nativeTargetId, id))) {
        return { ok: false, reason: 'fenecon-grid-target-equals-direct-ess-target', resolution, nativeTargetId, directTargetIds, essActualPowerId };
    }
    if (configuredNativeTargetId
        && resolution.requestedMode === 'fems-grid'
        && isLikelyDirectEssSetpointObjectId(configuredNativeTargetId)
        && !isLikelyFemsGridTargetObjectId(configuredNativeTargetId)) {
        return {
            ok: false,
            reason: 'fenecon-grid-target-is-direct-ess-setpoint',
            resolution,
            nativeTargetId,
            configuredNativeTargetId,
            directTargetIds,
            essActualPowerId,
        };
    }
    if (directTargetIds.some((id) => sameObjectId(essActualPowerId, id))) {
        return { ok: false, reason: 'fenecon-ess-feedback-equals-command-target', resolution, nativeTargetId, directTargetIds, essActualPowerId };
    }
    if (nativeTargetId && sameObjectId(essActualPowerId, nativeTargetId)) {
        return { ok: false, reason: 'fenecon-ess-feedback-equals-grid-target', resolution, nativeTargetId, directTargetIds, essActualPowerId };
    }
    return {
        ok: true,
        reason: 'ok',
        resolution,
        nativeTargetId,
        configuredNativeTargetId,
        directTargetIds,
        migratedDirectTargetId: text(resolution.migratedDirectTargetId),
        essActualPowerId,
    };
}
/**
 * Übersetzt den final durch alle EOS-Policies begrenzten Batterie-Sollwert in
 * den Netzpunkt-Sollwert des nativen FEMS-Balancing-Controllers.
 *
 * Vorzeichen:
 *   NVP +W = Netzbezug, -W = Einspeisung
 *   ESS +W = Entladen, -W = Laden
 */
function calculateFemsGridTargetW(input = {}) {
    const nvpW = finite(input.nvpW);
    const essActualW = finite(input.essActualW);
    const batteryTargetW = finite(input.batteryTargetW);
    if (nvpW === null || essActualW === null || batteryTargetW === null) {
        return {
            ok: false,
            reason: nvpW === null ? 'nvp-missing' : (essActualW === null ? 'ess-actual-missing' : 'battery-target-missing'),
            nvpW,
            essActualW,
            batteryTargetW,
            gridTargetW: null,
        };
    }
    const rawGridTargetW = nvpW + essActualW - batteryTargetW;
    const minW = finite(input.minGridTargetW);
    const maxW = finite(input.maxGridTargetW);
    if (minW !== null && maxW !== null && minW > maxW) {
        return {
            ok: false,
            reason: 'grid-target-limits-invalid',
            nvpW: Math.round(nvpW),
            essActualW: Math.round(essActualW),
            batteryTargetW: Math.round(batteryTargetW),
            rawGridTargetW: Math.round(rawGridTargetW),
            gridTargetW: null,
            minGridTargetW: minW,
            maxGridTargetW: maxW,
        };
    }
    const gridTargetW = Math.round(clamp(rawGridTargetW, minW, maxW));
    return {
        ok: true,
        reason: gridTargetW === Math.round(rawGridTargetW) ? 'calculated' : 'clamped',
        nvpW: Math.round(nvpW),
        essActualW: Math.round(essActualW),
        batteryTargetW: Math.round(batteryTargetW),
        rawGridTargetW: Math.round(rawGridTargetW),
        gridTargetW,
        minGridTargetW: minW,
        maxGridTargetW: maxW,
    };
}
/**
 * RC42 Shadow-Modell fuer eine kuenftig vereinfachte FENECON-NVP-Regelung.
 *
 * Dieser Helfer ist absichtlich rein und schreibfrei. Er berechnet parallel zur
 * produktiven RC41-Regelung, welche FEMS-NVP-Vorgabe aus
 *
 *   NVP-Ist + ESS-Ist - finalem EOS-Batteriesollwert
 *
 * entstehen wuerde und welche Batterie-Leistung fuer einen kleinen positiven
 * Netzbezug (0-Einspeisung mit Reserve) erforderlich waere. Direkter
 * Gesamtverbrauch und PV-Erzeugung dienen nur als unabhaengige
 * Plausibilitaetskontrolle und werden niemals ein zweites Mal in den Regelwert
 * eingerechnet.
 */
function calculateFeneconNvpShadow(input = {}) {
    const enabled = input.enabled !== false;
    const eligible = input.eligible === true;
    const exclusiveSingleStorage = input.exclusiveSingleStorage === true;
    const active = enabled && eligible && exclusiveSingleStorage;
    const nativeTargetMapped = input.nativeTargetMapped === true;
    const nvpW = finite(input.nvpW);
    const essActualW = finite(input.essActualW);
    const requestedBatteryTargetW = finite(input.requestedBatteryTargetW
        ?? input.eosBatteryTargetW
        ?? input.batteryTargetW);
    const nvpFresh = input.nvpFresh === true && nvpW !== null;
    const essFresh = input.essFresh === true && essActualW !== null;
    const minBatteryW = finite(input.minBatteryW ?? input.minBatteryTargetW);
    const maxBatteryW = finite(input.maxBatteryW ?? input.maxBatteryTargetW);
    const limitsValid = !(minBatteryW !== null && maxBatteryW !== null && minBatteryW > maxBatteryW);
    const zeroExportTargetRaw = finite(input.zeroExportTargetW);
    // Ein kleiner positiver Bezug verhindert Pendeln um exakt 0 W. Der Shadow-
    // Bereich bleibt bewusst auf eine reine Null-Einspeise-Reserve begrenzt.
    const zeroExportTargetW = Math.round(clamp(zeroExportTargetRaw ?? 80, 0, 1000));
    const plausibilityToleranceRaw = finite(input.plausibilityToleranceW);
    const source = text(input.source).toLowerCase();
    const reasonText = text(input.reason);
    const commandFamily = text(input.commandFamily);
    const currentAuthority = text(input.currentAuthority);
    const safetyNvpFresh = input.safetyNvpFresh !== false;
    const referenceNvpW = finite(input.referenceNvpW ?? input.centralNvpW);
    const referenceNvpFresh = input.referenceNvpFresh === true && referenceNvpW !== null;
    const nvpReferenceAvailable = nvpFresh && referenceNvpFresh;
    const nvpReferenceDeltaW = nvpReferenceAvailable && nvpW !== null && referenceNvpW !== null
        ? Math.round(nvpW - referenceNvpW)
        : null;
    const nvpReferenceToleranceW = Math.round(Math.max(100, finite(input.nvpReferenceToleranceW) ?? 300));
    const nvpReferencePlausible = nvpReferenceAvailable && nvpReferenceDeltaW !== null
        ? Math.abs(nvpReferenceDeltaW) <= nvpReferenceToleranceW
        : null;
    let invalidReason = '';
    if (!enabled)
        invalidReason = 'shadow-disabled';
    else if (!eligible)
        invalidReason = 'not-fenecon-dc-hybrid';
    else if (!exclusiveSingleStorage)
        invalidReason = 'exclusive-single-storage-required';
    else if (!nvpFresh)
        invalidReason = 'nvp-missing-or-stale';
    else if (!essFresh)
        invalidReason = 'ess-actual-missing-or-stale';
    else if (requestedBatteryTargetW === null)
        invalidReason = 'battery-target-missing';
    else if (!limitsValid)
        invalidReason = 'battery-limits-invalid';
    const valid = !invalidReason;
    const effectiveBatteryTargetW = valid && requestedBatteryTargetW !== null
        ? Math.round(clamp(requestedBatteryTargetW, minBatteryW, maxBatteryW))
        : null;
    // NexoWatt-/FENECON-Vorzeichen:
    //   NVP +W = Bezug, -W = Einspeisung
    //   ESS +W = Entladen, -W = Laden
    // Damit ist NVP + ESS-Ist die physikalische Restlast ohne Speicher.
    const residualWithoutStorageW = valid && nvpW !== null && essActualW !== null
        ? Math.round(nvpW + essActualW)
        : null;
    // Diese Uebersetzung zeigt, welcher FEMS-Netzsollwert die aktuell von EOS
    // entschiedene Batterie-Policy abbilden wuerde. Sie veraendert diese Policy
    // nicht und ist besonders fuer Tarif-, Reserve-, Safety- und manuelle
    // Vorgaben wichtig.
    const translatedGridTargetW = valid
        && residualWithoutStorageW !== null
        && effectiveBatteryTargetW !== null
        ? Math.round(residualWithoutStorageW - effectiveBatteryTargetW)
        : null;
    // Fuer die reine 0-Einspeisung wird die notwendige Batterie-Leistung aus der
    // Restlast und dem kleinen positiven Netzbezugsziel bestimmt. Der rohe Wert
    // wird separat gehalten; der effektive Wert beruecksichtigt optionale aktuelle
    // ESS-Leistungsgrenzen.
    const zeroExportBatteryTargetRawW = valid && residualWithoutStorageW !== null
        ? Math.round(residualWithoutStorageW - zeroExportTargetW)
        : null;
    const zeroExportBatteryTargetW = zeroExportBatteryTargetRawW === null
        ? null
        : Math.round(clamp(zeroExportBatteryTargetRawW, minBatteryW, maxBatteryW));
    const predictedNvpAtZeroExportW = valid
        && residualWithoutStorageW !== null
        && zeroExportBatteryTargetW !== null
        ? Math.round(residualWithoutStorageW - zeroExportBatteryTargetW)
        : null;
    const zeroExportWithinBatteryLimits = zeroExportBatteryTargetRawW === null
        ? null
        : zeroExportBatteryTargetW === zeroExportBatteryTargetRawW;
    const zeroExportAchievable = predictedNvpAtZeroExportW === null
        ? null
        : Math.abs(predictedNvpAtZeroExportW - zeroExportTargetW) <= 1;
    const batteryLimitShortfallW = zeroExportBatteryTargetRawW === null
        || zeroExportBatteryTargetW === null
        ? null
        : Math.abs(Math.round(zeroExportBatteryTargetRawW - zeroExportBatteryTargetW));
    // Wenn die Batterie die 0-Einspeisung nicht allein erreichen kann, zeigen die
    // beiden Werte den verbleibenden Bedarf. Bei negativer Abweichung muss eine
    // zusaetzliche Senke aktiviert oder PV abgeregelt werden; bei positiver
    // Abweichung besteht noch Importreduktionspotenzial.
    const additionalSinkOrCurtailmentW = predictedNvpAtZeroExportW === null
        ? null
        : Math.max(0, Math.round(zeroExportTargetW - predictedNvpAtZeroExportW));
    const importReductionPotentialW = predictedNvpAtZeroExportW === null
        ? null
        : Math.max(0, Math.round(predictedNvpAtZeroExportW - zeroExportTargetW));
    const batteryAdjustmentToZeroExportW = zeroExportBatteryTargetRawW === null
        || effectiveBatteryTargetW === null
        ? null
        : Math.round(zeroExportBatteryTargetRawW - effectiveBatteryTargetW);
    const currentPolicyDeltaToZeroExportW = translatedGridTargetW === null
        ? null
        : Math.round(translatedGridTargetW - zeroExportTargetW);
    const loadW = finite(input.loadW ?? input.consumptionTotalW);
    const pvW = finite(input.pvW ?? input.pvTotalW);
    const feedForwardUsable = input.feedForwardUsable === true
        || (input.feedForwardUsable === undefined && loadW !== null && pvW !== null);
    const plausibilityAvailable = valid && feedForwardUsable && loadW !== null && pvW !== null;
    const loadMinusPvW = plausibilityAvailable && loadW !== null && pvW !== null
        ? Math.round(loadW - pvW)
        : null;
    const plausibilityDeltaW = plausibilityAvailable
        && residualWithoutStorageW !== null
        && loadMinusPvW !== null
        ? Math.round(residualWithoutStorageW - loadMinusPvW)
        : null;
    const dynamicReferenceW = Math.max(Math.abs(loadW ?? 0), Math.abs(pvW ?? 0), Math.abs(residualWithoutStorageW ?? 0));
    const plausibilityToleranceW = Math.round(Math.max(100, plausibilityToleranceRaw ?? 500, dynamicReferenceW * 0.05));
    const plausible = plausibilityAvailable && plausibilityDeltaW !== null
        ? Math.abs(plausibilityDeltaW) <= plausibilityToleranceW
        : null;
    // Nur die normale Eigenverbrauchs-Policy wird im Shadow als kuenftige direkte
    // NVP-Fuehrung auf den kleinen positiven Bezug betrachtet. Alle anderen
    // Policies bleiben als Batterieentscheidung erhalten und werden lediglich in
    // einen aequivalenten FEMS-Netzsollwert uebersetzt.
    const normalSelfConsumptionSource = [
        'eigenverbrauch',
        'self-consumption',
        'selfconsumption',
        'fenecon',
        'auto',
    ].includes(source);
    const proposalMode = normalSelfConsumptionSource
        ? 'zero-export-nvp'
        : 'preserve-eos-battery-policy';
    const proposedGridTargetW = valid
        ? (normalSelfConsumptionSource ? zeroExportTargetW : translatedGridTargetW)
        : null;
    const predictedBatteryWAtProposal = valid
        && residualWithoutStorageW !== null
        && proposedGridTargetW !== null
        ? Math.round(residualWithoutStorageW - proposedGridTargetW)
        : null;
    // Fehlende Last-/PV-Plausibilisierung blockiert den Shadow nicht, weil NVP +
    // ESS-Ist die minimale Regelbasis sind. Eine vorhandene, aber widerspruechliche
    // Bilanz verhindert dagegen bewusst die spaetere Schreibbereitschaft.
    const readyForFutureWrite = valid
        && nativeTargetMapped
        && safetyNvpFresh
        && plausible !== false
        && nvpReferencePlausible !== false
        && (!normalSelfConsumptionSource || zeroExportAchievable === true);
    const calculationReason = invalidReason || (!nativeTargetMapped
        ? 'calculated-read-only-native-target-missing'
        : (!safetyNvpFresh
            ? 'calculated-read-only-central-safety-nvp-missing'
            : (nvpReferencePlausible === false
                ? 'calculated-read-only-nvp-reference-mismatch'
                : (plausible === false
                    ? 'calculated-read-only-plausibility-mismatch'
                    : (normalSelfConsumptionSource && zeroExportAchievable !== true
                        ? 'calculated-read-only-battery-limit'
                        : 'calculated-read-only')))));
    return {
        active,
        mode: 'shadow-only',
        readOnly: true,
        writeAttempted: false,
        writePermitted: false,
        writesHardware: false,
        ok: valid,
        valid,
        ready: readyForFutureWrite,
        readyForFutureWrite,
        reason: calculationReason,
        proposalMode,
        source,
        sourceReason: reasonText,
        commandFamily,
        currentAuthority,
        nativeTargetMapped,
        exclusiveSingleStorage,
        nvpFresh,
        essFresh,
        safetyNvpFresh,
        referenceNvpFresh,
        referenceNvpW: referenceNvpW === null ? null : Math.round(referenceNvpW),
        nvpReferenceAvailable,
        nvpReferenceDeltaW,
        nvpReferenceToleranceW,
        nvpReferencePlausible,
        nvpW: nvpW === null ? null : Math.round(nvpW),
        essActualW: essActualW === null ? null : Math.round(essActualW),
        requestedBatteryTargetW: requestedBatteryTargetW === null ? null : Math.round(requestedBatteryTargetW),
        eosBatteryTargetW: requestedBatteryTargetW === null ? null : Math.round(requestedBatteryTargetW),
        effectiveBatteryTargetW,
        minBatteryW,
        maxBatteryW,
        residualWithoutStorageW,
        restLoadWithoutStorageW: residualWithoutStorageW,
        translatedGridTargetW,
        proposedFemsGridTargetW: proposedGridTargetW,
        proposedGridTargetW,
        predictedBatteryWAtProposal,
        zeroExportTargetW,
        zeroExportBatteryTargetRawW,
        zeroExportBatteryTargetW,
        predictedNvpAtZeroExportW,
        zeroExportAchievable,
        zeroExportWithinBatteryLimits,
        batteryLimitShortfallW,
        batteryAdjustmentToZeroExportW,
        currentPolicyDeltaToZeroExportW,
        additionalSinkOrCurtailmentW,
        importReductionPotentialW,
        plausibilityAvailable,
        plausible,
        plausibilityToleranceW,
        plausibilityDeltaW,
        balanceDeviationW: plausibilityDeltaW,
        loadMinusPvW,
        balanceFromConsumptionPvW: loadMinusPvW,
        loadW: loadW === null ? null : Math.round(loadW),
        consumptionTotalW: loadW === null ? null : Math.round(loadW),
        pvW: pvW === null ? null : Math.round(pvW),
        pvTotalW: pvW === null ? null : Math.round(pvW),
        loadSource: text(input.loadSource),
        pvSource: text(input.pvSource),
        loadAgeMs: finite(input.loadAgeMs),
        pvAgeMs: finite(input.pvAgeMs),
        nvpAgeMs: finite(input.nvpAgeMs),
        essAgeMs: finite(input.essAgeMs),
        measurementSkewMs: finite(input.measurementSkewMs),
    };
}
function validateFarmRows(rowsIn) {
    const rows = Array.isArray(rowsIn)
        ? rowsIn.filter((row) => row && typeof row === 'object' && row.enabled !== false)
        : [];
    const configuredRows = rows.filter((row) => !!(getDirectTargetIds(row).length
        || getNativeTargetId(row)));
    const writableStorageCount = configuredRows.length;
    const resolved = configuredRows.map((row) => {
        const nativeTargetId = getNativeTargetId(row);
        const requestedMode = normalizeControlMode(row.feneconControlMode || row.controlModeMode || row.feneconHybridControlMode);
        const legacyDirectInNativeField = requestedMode !== 'fems-grid'
            && isLikelyDirectEssSetpointObjectId(nativeTargetId)
            && !isLikelyFemsGridTargetObjectId(nativeTargetId);
        const directTargetAvailable = getDirectTargetIds(row).length > 0 || legacyDirectInNativeField;
        const validation = validateSingleConfig(row, {
            writableStorageCount,
            otherWritableStorageCount: Math.max(0, writableStorageCount - 1),
            directTargetAvailable,
        });
        return { row, validation, result: validation.resolution, directTargetAvailable };
    });
    const nativeRows = resolved.filter((item) => item.result && item.result.mode === 'fems-grid');
    const invalidRows = resolved.filter((item) => !item.validation.ok);
    let ok = invalidRows.length === 0 && nativeRows.length <= 1;
    let reason = 'ok';
    if (nativeRows.length > 1) {
        ok = false;
        reason = 'multiple-fems-grid-masters';
    }
    else if (invalidRows.length) {
        reason = invalidRows[0]?.validation.reason || 'invalid-storage-row';
    }
    else if (nativeRows.length === 1 && writableStorageCount > 1) {
        ok = false;
        reason = 'fems-grid-master-with-other-writable-storage';
    }
    return {
        ok,
        reason,
        writableStorageCount,
        nativeMasterCount: nativeRows.length,
        nativeMasterName: text(nativeRows[0]?.row?.name),
        resolved: resolved.map((item) => ({
            name: text(item.row.name),
            mode: item.result ? item.result.mode : 'invalid',
            requestedMode: item.result ? item.result.requestedMode : normalizeControlMode(item.row.feneconControlMode),
            reason: item.validation.reason,
            directTargetAvailable: item.directTargetAvailable,
            essActualPowerId: getEssActualPowerId(item.row),
        })),
    };
}
module.exports = {
    normalizeVendorProfile,
    normalizeControlMode,
    normalizeObjectId,
    sameObjectId,
    isFeneconHybrid,
    getNativeTargetId,
    getDirectTargetIds,
    getEssActualPowerId,
    hasWritableNativeTarget,
    hasWritableDirectTarget,
    isPowerBalanceObjectId,
    isLikelyDirectEssSetpointObjectId,
    isLikelyFemsGridTargetObjectId,
    isLikelyFemsGridMeasurementObjectId,
    resolveHybridAuthority,
    resolveControlMode,
    validateSingleConfig,
    calculateFemsGridTargetW,
    calculateFeneconNvpShadow,
    validateFarmRows,
};
