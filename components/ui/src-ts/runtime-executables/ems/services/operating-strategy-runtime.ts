// @ts-nocheck
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Löst konfigurierte Betriebsstrategien und deren Überlagerung in wirksame Laufzeit-Vorgaben auf.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/operating-strategy-runtime.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * NexoWatt EOS Betriebsstrategien – gemeinsamer Runtime-Vertrag.
 *
 * Die Strategy Engine ist ausschließlich Planer. Sie veröffentlicht kurzlebige
 * Anforderungen im Adapter-RAM. Die vorhandenen Fachmodule bleiben die einzigen
 * Hardware-Writer und wenden weiterhin alle Safety-, Netz-, Stations- und
 * Gerätebegrenzungen an.
 */
'use strict';

function text(value, fallback = '') {
    const normalized = String(value === null || value === undefined ? '' : value).trim();
    return normalized || fallback;
}

function num(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, minValue, maxValue, fallback = minValue) {
    const parsed = Number(value);
    const safe = Number.isFinite(parsed) ? parsed : fallback;
    return Math.max(minValue, Math.min(maxValue, safe));
}

function normalizeStrategyAutoSource(raw) {
    const value = text(raw).toLowerCase();
    return ['strategy', 'operatingstrategies', 'operating-strategies', 'eos-strategy', 'betriebsstrategie'].includes(value)
        ? 'strategy'
        : 'standard';
}

function normalizeStrategyFallback(raw) {
    const value = text(raw).toLowerCase();
    return ['pause', 'safe-pause', 'safepause'].includes(value) ? 'pause' : 'standardAuto';
}

function getOperatingStrategyConfig(adapter) {
    const cfg = adapter && adapter.config && adapter.config.operatingStrategies;
    return cfg && typeof cfg === 'object' && !Array.isArray(cfg) ? cfg : {};
}

function operatingStrategiesAppActive(adapterOrConfig) {
    const config = adapterOrConfig && adapterOrConfig.config ? adapterOrConfig.config : adapterOrConfig;
    if (!config || typeof config !== 'object') return false;
    const app = config.emsApps && config.emsApps.apps && config.emsApps.apps.operatingStrategies;
    return !!(
        app
        && app.installed === true
        && app.enabled === true
        && config.operatingStrategies
        && config.operatingStrategies.enabled === true
    );
}

function isOperatingStrategiesLiveConfig(config, appEnabled = true) {
    const cfg = config && typeof config === 'object' ? config : {};
    const auto = cfg.autoControl && typeof cfg.autoControl === 'object' ? cfg.autoControl : {};
    return appEnabled === true
        && cfg.enabled === true
        && text(cfg.mode, 'observe') === 'active'
        && cfg.commissioningConfirmed === true
        && cfg.controlTakeoverEnabled === true
        && cfg.writeExecutionEnabled === true
        && auto.enabled !== false
        && text(auto.stage, 'shadow') === 'active';
}

function getOperatingStrategyRuntime(adapter) {
    const runtime = adapter && (adapter._nwOperatingStrategyRuntime || adapter._nwOperatingStrategiesRuntime);
    return runtime && typeof runtime === 'object' && !Array.isArray(runtime) ? runtime : null;
}

function normalizeSourceAliases(sourceIds) {
    const input = Array.isArray(sourceIds) ? sourceIds : [sourceIds];
    const out = [];
    const seen = new Set();
    for (const entry of input) {
        const id = text(entry);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push(id);
    }
    return out;
}

function findResourceLink(adapter, sourceIds) {
    const cfg = getOperatingStrategyConfig(adapter);
    const links = Array.isArray(cfg.resourceLinks) ? cfg.resourceLinks : [];
    const runtime = getOperatingStrategyRuntime(adapter);
    const aliases = new Set(resolveCanonicalIds(runtime, sourceIds));
    normalizeSourceAliases(sourceIds).forEach((id) => aliases.add(id));
    return links.find((entry) => aliases.has(text(entry && entry.sourceId))) || null;
}

function isLinkLiveEligible(link) {
    if (!link || typeof link !== 'object') return false;
    return link.enabled === true
        && text(link.controlMode, 'observe') === 'active'
        && link.commissioningConfirmed === true
        && link.writeEnabled === true
        && link.observeOnly !== true;
}

function isRuntimeRequestFresh(request, now = Date.now()) {
    if (!request || typeof request !== 'object') return false;
    const issuedAt = num(request.issuedAt ?? request.createdAt, 0);
    const expiresAt = num(request.expiresAt, 0);
    if (!(expiresAt > now)) return false;
    if (issuedAt > 0 && issuedAt > now + 5000) return false;
    return request.selected === true;
}

function resolveCanonicalIds(runtime, sourceIds) {
    const aliases = normalizeSourceAliases(sourceIds);
    const aliasMap = runtime && runtime.resourceAliases && typeof runtime.resourceAliases === 'object'
        ? runtime.resourceAliases
        : {};
    const out = [];
    const seen = new Set();
    for (const id of aliases) {
        for (const candidate of [id, text(aliasMap[id])]) {
            if (!candidate || seen.has(candidate)) continue;
            seen.add(candidate);
            out.push(candidate);
        }
    }
    return out;
}

function getOperatingStrategyRequest(adapter, sourceIds, now = Date.now(), options = {}) {
    const runtime = getOperatingStrategyRuntime(adapter);
    if (!runtime) return null;
    const requests = runtime.requestsByResource && typeof runtime.requestsByResource === 'object'
        ? runtime.requestsByResource
        : {};
    let request = null;
    for (const id of resolveCanonicalIds(runtime, sourceIds)) {
        if (requests[id]) {
            request = requests[id];
            break;
        }
    }
    if (!isRuntimeRequestFresh(request, now)) return null;
    if (options.requireControlEligible !== false) {
        if (runtime.activeControl !== true || request.controlEligible !== true) return null;
    }
    return request;
}

function runtimeUnavailableReason(adapter, sourceIds, now = Date.now()) {
    const runtime = getOperatingStrategyRuntime(adapter);
    if (!runtime) return 'strategy-runtime-unavailable';
    if (runtime.appEnabled !== true) return 'strategy-app-disabled';
    if (runtime.activeControl !== true) return text(runtime.controlReason, 'strategy-observe-mode');
    const request = getOperatingStrategyRequest(adapter, sourceIds, now, { requireControlEligible: false });
    if (request && request.controlEligible !== true) return text(request.controlReason, 'resource-not-live-eligible');
    const decisions = runtime.decisionsByResource && typeof runtime.decisionsByResource === 'object'
        ? runtime.decisionsByResource
        : {};
    for (const id of resolveCanonicalIds(runtime, sourceIds)) {
        const decision = decisions[id];
        if (decision && typeof decision === 'object') return text(decision.reason || decision.headline || decision.status, 'no-active-request');
    }
    return 'no-active-request';
}

function resolveChargingStrategyOverlay(adapter, sourceIds, options = {}) {
    const now = num(options.now, Date.now());
    const aliases = normalizeSourceAliases(sourceIds);
    const sourceId = aliases[0] || '';
    const userMode = text(options.userMode, 'auto').toLowerCase();
    const link = findResourceLink(adapter, aliases);
    // Doppeltes Opt-in schützt bestehende Ladebetriebsarten vor einer unbemerkten
    // Übernahme: Die Ressource muss in der Betriebsstrategien-App freigegeben sein
    // UND der Nutzer muss am Ladepunkt ausdrücklich "Auto → Betriebsstrategie"
    // ausgewählt haben. Eine einzelne der beiden Einstellungen reicht nicht aus.
    const linkAutoSource = normalizeStrategyAutoSource(link && link.autoSource);
    const userAutoSource = normalizeStrategyAutoSource(options.autoSource);
    const fallback = normalizeStrategyFallback((link && link.fallback) || options.fallback);
    const base = {
        sourceId,
        aliases,
        eligible: userMode === 'auto' && linkAutoSource === 'strategy' && userAutoSource === 'strategy',
        active: false,
        request: null,
        action: 'standard',
        targetPowerW: 0,
        minPowerW: 0,
        maxPowerW: 0,
        targetSocPct: null,
        targetEnergyKWh: null,
        deadline: 0,
        requirement: 'should',
        priority: 50,
        energySourcePolicy: 'pv-preferred',
        fallback,
        fallbackPause: false,
        reason: '',
    };
    if (userMode !== 'auto') return { ...base, reason: 'charging-mode-not-auto' };
    if (linkAutoSource !== 'strategy') return { ...base, reason: 'strategy-link-auto-source-standard' };
    if (userAutoSource !== 'strategy') return { ...base, reason: 'charging-auto-source-standard' };
    if (!isLinkLiveEligible(link)) return { ...base, reason: 'resource-not-live-commissioned' };

    const request = getOperatingStrategyRequest(adapter, aliases, now);
    if (!request) {
        const reason = runtimeUnavailableReason(adapter, aliases, now);
        return { ...base, fallbackPause: fallback === 'pause', action: fallback === 'pause' ? 'pause' : 'standard', reason };
    }

    const targetPowerW = Math.max(0, num(request.requestedPowerW ?? request.targetPowerW, 0));
    const minPowerW = Math.max(0, num(request.minPowerW, 0));
    const maxPowerW = Math.max(targetPowerW, num(request.maxPowerW, targetPowerW));
    return {
        ...base,
        active: true,
        request,
        action: text(request.action, 'target-power'),
        targetPowerW,
        minPowerW,
        maxPowerW,
        targetSocPct: Number.isFinite(Number(request.targetSocPct)) ? clamp(request.targetSocPct, 0, 100) : null,
        targetEnergyKWh: Number.isFinite(Number(request.targetEnergyKWh)) ? Math.max(0, Number(request.targetEnergyKWh)) : null,
        deadline: Math.max(0, num(request.deadline, 0)),
        requirement: ['must', 'should', 'can'].includes(text(request.requirement || request.className, 'should').toLowerCase()) ? text(request.requirement || request.className, 'should').toLowerCase() : 'should',
        priority: clamp(request.priority, 0, 100),
        energySourcePolicy: text(request.energySourcePolicy, 'pv-preferred'),
        reason: text(request.reason || request.name, 'strategy-request-active'),
    };
}

function resolveStorageStrategyOverlay(adapter, sourceIds, options = {}) {
    const now = num(options.now, Date.now());
    const aliases = normalizeSourceAliases(sourceIds);
    const sourceId = aliases[0] || '';
    const runtime = getOperatingStrategyRuntime(adapter);
    const base = {
        sourceId,
        aliases,
        active: false,
        minSocPct: null,
        targetSocPct: null,
        absoluteMinSocPct: null,
        phase: '',
        request: null,
        reason: '',
    };
    if (!runtime || runtime.activeControl !== true) {
        return { ...base, reason: runtimeUnavailableReason(adapter, aliases, now) };
    }
    const overlays = runtime.storageOverlaysByResource && typeof runtime.storageOverlaysByResource === 'object'
        ? runtime.storageOverlaysByResource
        : {};
    let overlay = null;
    for (const id of resolveCanonicalIds(runtime, aliases)) {
        const candidate = overlays[id];
        if (!candidate || typeof candidate !== 'object') continue;
        if (num(candidate.expiresAt, 0) <= now || candidate.controlEligible !== true) continue;
        // Jede Farm-Ressource besitzt ihre eigene Inbetriebnahmefreigabe. Eine
        // inaktive erste Ressource darf daher eine später freigegebene Ressource
        // nicht blockieren. Nur der Link der konkreten Overlay-Ressource zählt.
        const candidateLink = findResourceLink(adapter, [id]);
        if (!isLinkLiveEligible(candidateLink)) continue;
        // Speicherfarmen können mehrere physische Speicher auf denselben
        // Fachregler abbilden. Der strengste (höchste) Reservewert gewinnt.
        if (!overlay || num(candidate.minSocPct, 0) > num(overlay.minSocPct, 0)) overlay = candidate;
    }
    if (!overlay) {
        return { ...base, reason: runtimeUnavailableReason(adapter, aliases, now) };
    }
    return {
        ...base,
        active: true,
        minSocPct: clamp(overlay.minSocPct, 0, 100),
        targetSocPct: clamp(overlay.targetSocPct, 0, 100),
        absoluteMinSocPct: clamp(overlay.absoluteMinSocPct, 0, 100),
        phase: text(overlay.phase),
        request: overlay,
        reason: text(overlay.reason, 'strategy-storage-overlay'),
    };
}

function resolveThermalStrategyOverlay(adapter, sourceIds, options = {}) {
    const now = num(options.now, Date.now());
    const aliases = normalizeSourceAliases(sourceIds);
    const sourceId = aliases[0] || '';
    const effectiveMode = text(options.effectiveMode, '').toLowerCase();
    const link = findResourceLink(adapter, aliases);
    const fallback = normalizeStrategyFallback((link && link.fallback) || options.fallback);
    const base = {
        sourceId,
        aliases,
        eligible: effectiveMode === 'pvauto',
        active: false,
        request: null,
        action: 'standard',
        requestedPowerW: null,
        safetyRelease: false,
        allowGridImport: false,
        fallback,
        fallbackPause: false,
        reason: '',
    };
    if (effectiveMode !== 'pvauto') return { ...base, reason: 'thermal-mode-not-auto' };
    if (!isLinkLiveEligible(link)) return { ...base, reason: 'resource-not-live-commissioned' };
    const request = getOperatingStrategyRequest(adapter, aliases, now);
    if (!request) {
        return {
            ...base,
            fallbackPause: fallback === 'pause',
            action: fallback === 'pause' ? 'pause' : 'standard',
            reason: runtimeUnavailableReason(adapter, aliases, now),
        };
    }
    const action = text(request.action, 'standard');
    const safetyRelease = text(request.status) === 'safety' && (action === 'release' || action === 'on');
    return {
        ...base,
        active: true,
        request,
        action,
        requestedPowerW: Number.isFinite(Number(request.requestedPowerW)) ? Math.max(0, Number(request.requestedPowerW)) : null,
        safetyRelease,
        allowGridImport: safetyRelease || request.energySourcePolicy === 'grid-allowed' || request.energySourcePolicy === 'cheap-grid',
        reason: text(request.reason || request.name, 'strategy-request-active'),
    };
}

function resolveHeatingRodStrategyOverlay(adapter, sourceIds, options = {}) {
    const now = num(options.now, Date.now());
    const aliases = normalizeSourceAliases(sourceIds);
    const sourceId = aliases[0] || '';
    const effectiveMode = text(options.effectiveMode, '').toLowerCase();
    const link = findResourceLink(adapter, aliases);
    const fallback = normalizeStrategyFallback((link && link.fallback) || options.fallback);
    const base = {
        sourceId,
        aliases,
        eligible: effectiveMode === 'pvauto',
        active: false,
        request: null,
        action: 'standard',
        maxPowerW: null,
        fallback,
        fallbackPause: false,
        reason: '',
    };
    if (effectiveMode !== 'pvauto') return { ...base, reason: 'heating-rod-mode-not-auto' };
    if (!isLinkLiveEligible(link)) return { ...base, reason: 'resource-not-live-commissioned' };
    const request = getOperatingStrategyRequest(adapter, aliases, now);
    if (!request) {
        return {
            ...base,
            action: fallback === 'pause' ? 'pause' : 'standard',
            fallbackPause: fallback === 'pause',
            reason: runtimeUnavailableReason(adapter, aliases, now),
        };
    }
    const action = text(request.action, 'standard');
    const requestedPowerW = Number(request.requestedPowerW ?? request.targetPowerW);
    return {
        ...base,
        active: true,
        request,
        action,
        maxPowerW: Number.isFinite(requestedPowerW) ? Math.max(0, requestedPowerW) : null,
        reason: text(request.reason || request.name, 'strategy-request-active'),
    };
}

module.exports = {
    normalizeStrategyAutoSource,
    normalizeStrategyFallback,
    operatingStrategiesAppActive,
    isOperatingStrategiesLiveConfig,
    getOperatingStrategyConfig,
    getOperatingStrategyRuntime,
    findResourceLink,
    isLinkLiveEligible,
    isRuntimeRequestFresh,
    getOperatingStrategyRequest,
    runtimeUnavailableReason,
    resolveChargingStrategyOverlay,
    resolveStorageStrategyOverlay,
    resolveThermalStrategyOverlay,
    resolveHeatingRodStrategyOverlay,
};
