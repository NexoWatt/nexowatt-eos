/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/services/energy-origin-accounting.ts
 * Quell-Hash: sha256:014d2773a5b091dabd593e015a23873009510f44cf4cabdc577206856daa41ce
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/energy-origin-accounting.js.
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
 * Aufgabe: Ordnet Energieflüsse ihrer Herkunft zu und berechnet die daraus abgeleiteten Bilanzanteile.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/energy-origin-accounting.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: ems/services/energy-origin-accounting.js
 *
 * Zweck:
 * Hersteller- und zähleroffene 15-Minuten-Bilanzierung für die NexoWatt-App
 * „Energieherkunft & Ladebilanz“. Die Datei enthält ausschließlich Rechen-,
 * Plausibilitäts- und Hashfunktionen. Sie schreibt niemals auf Geräte-DPs.
 *
 * Fachliche Leitplanken:
 * - kumulierte Energiezähler sind die primäre Bilanzquelle;
 * - Momentanleistungen dienen nicht als stiller Ersatz für Nachweiszähler;
 * - Betriebsbilanz und formaler Nachweiskandidat bleiben getrennt;
 * - gespeicherte Energie behält eine explizite Herkunftsmischung;
 * - unvollständige Messketten erzeugen „unknown“, keine erfundene Zuordnung;
 * - jedes abgeschlossene Intervall erhält eine SHA-256-Hashverkettung.
 */
'use strict';
const crypto = require('node:crypto');
const ORIGIN_LEDGER_VERSION = 'nexowatt.energy-origin-ledger.v1';
const ORIGIN_INTERVAL_VERSION = 'nexowatt.energy-origin-interval.v1';
const ORIGIN_CONFIG_VERSION = 'nexowatt.energy-origin-config.v1';
const ORIGIN_INVENTORY_VERSION = 'nexowatt.storage-origin-inventory.v1';
const DEFAULT_INTERVAL_MINUTES = 15;
const DEFAULT_STALE_SECONDS = 300;
const DEFAULT_RECENT_INTERVALS = 672; // 7 Tage bei 15 Minuten
const HOME_MAX_SITES = 1;
const HOME_MAX_CHARGE_POINTS = 3;
const PRO_MAX_SITES = 50;
const PRO_MAX_CHARGE_POINTS = 500;
const EPS_KWH = 0.000001;
function finiteNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}
function clamp(value, min, max) {
    const n = finiteNumber(value, min);
    return Math.max(min, Math.min(max, n));
}
function round(value, digits = 6) {
    const n = finiteNumber(value, 0);
    const p = 10 ** Math.max(0, Math.min(9, Math.round(finiteNumber(digits, 0))));
    return Math.round(n * p) / p;
}
function safeId(input, fallback = 'item') {
    const text = String(input == null ? '' : input).trim().toLowerCase();
    return (text || fallback)
        .replace(/[^a-z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80) || fallback;
}
function normalizeEdition(raw) {
    const e = String(raw || '').trim().toLowerCase();
    if (e === 'eos' || e === 'pro')
        return 'pro';
    if (e === 'hems' || e === 'home')
        return 'home';
    return 'none';
}
function stableClone(value) {
    if (Array.isArray(value))
        return value.map(stableClone);
    if (!value || typeof value !== 'object')
        return value;
    const out = {};
    for (const key of Object.keys(value).sort())
        out[key] = stableClone(value[key]);
    return out;
}
function canonicalJson(value) {
    return JSON.stringify(stableClone(value));
}
function sha256Hex(value) {
    return crypto.createHash('sha256').update(String(value == null ? '' : value), 'utf8').digest('hex');
}
function hashObject(value) {
    return sha256Hex(canonicalJson(value));
}
function intervalBounds(ts, intervalMinutes = DEFAULT_INTERVAL_MINUTES) {
    const minutes = Math.max(1, Math.min(60, Math.round(finiteNumber(intervalMinutes, DEFAULT_INTERVAL_MINUTES))));
    const widthMs = minutes * 60 * 1000;
    const startTs = Math.floor(Math.max(0, finiteNumber(ts, Date.now())) / widthMs) * widthMs;
    return { startTs, endTs: startTs + widthMs, widthMs, intervalMinutes: minutes };
}
function normalizeUnit(raw) {
    const u = String(raw || 'kWh').trim().toLowerCase().replace(/\s+/g, '');
    if (u === 'wh')
        return 'Wh';
    if (u === 'mwh')
        return 'MWh';
    return 'kWh';
}
function toKwh(value, unit = 'kWh', factor = 1) {
    const n = finiteNumber(value, NaN);
    if (!Number.isFinite(n))
        return NaN;
    const u = normalizeUnit(unit);
    const scale = u === 'Wh' ? 0.001 : (u === 'MWh' ? 1000 : 1);
    return n * scale * finiteNumber(factor, 1);
}
function normalizeMeter(row, fallbackRole, index = 0) {
    const r = row && typeof row === 'object' ? row : {};
    const role = String(r.role || fallbackRole || '').trim();
    const dpId = String(r.dpId || r.objectId || r.id || '').trim();
    return {
        id: safeId(r.meterId || r.key || `${role || 'meter'}_${index + 1}`, `meter_${index + 1}`),
        role,
        dpId,
        unit: normalizeUnit(r.unit || r.energyUnit || 'kWh'),
        factor: finiteNumber(r.factor, 1),
        enabled: r.enabled !== false && !!dpId,
        name: String(r.name || r.label || role || `Zähler ${index + 1}`),
        serial: String(r.serial || r.meterSerial || '').trim(),
        meterClass: String(r.meterClass || r.compliance || 'none').trim().toLowerCase(),
        integrated: r.integrated === true,
        declaredCompliant: r.declaredCompliant === true || r.eichrechtDeclared === true,
        publicKey: String(r.publicKey || '').trim(),
        chargePointId: String(r.chargePointId || r.lp || '').trim(),
        stationId: String(r.stationId || '').trim(),
        publiclyAccessible: r.publiclyAccessible === true,
        sourceType: String(r.sourceType || '').trim().toLowerCase(),
        subsidyFreeDeclared: r.subsidyFreeDeclared === true,
    };
}
function defaultRoleMeters(origin) {
    const dp = origin && origin.dataPoints && typeof origin.dataPoints === 'object' ? origin.dataPoints : {};
    const units = origin && origin.units && typeof origin.units === 'object' ? origin.units : {};
    const metadata = origin && origin.meterMetadata && typeof origin.meterMetadata === 'object' ? origin.meterMetadata : {};
    const roleMap = [
        ['grid-import-energy', 'gridImportEnergyKwh'],
        ['grid-export-energy', 'gridExportEnergyKwh'],
        ['pv-generation-energy', 'pvGenerationEnergyKwh'],
        ['other-renewable-energy', 'otherRenewableEnergyKwh'],
        ['building-load-energy', 'buildingEnergyKwh'],
        ['storage-charge-energy', 'storageChargeEnergyKwh'],
        ['storage-discharge-energy', 'storageDischargeEnergyKwh'],
    ];
    return roleMap.map(([role, key], index) => normalizeMeter({
        role,
        dpId: dp[key],
        unit: units[key] || 'kWh',
        ...(metadata[key] || {}),
    }, role, index)).filter((m) => m.enabled);
}
function normalizeChargePoint(row, index = 0) {
    const r = row && typeof row === 'object' ? row : {};
    const id = safeId(r.id || r.key || r.lp || `lp${index + 1}`, `lp${index + 1}`);
    return {
        id,
        label: String(r.label || r.name || id),
        stationId: safeId(r.stationId || r.stationKey || 'station_1', 'station_1'),
        connectorNo: Math.max(1, Math.round(finiteNumber(r.connectorNo || r.connector, index + 1))),
        enabled: r.enabled !== false,
        energyMeterKwhId: String(r.energyMeterKwhId || r.energyDpId || r.meterDpId || '').trim(),
        unit: normalizeUnit(r.unit || r.energyUnit || 'kWh'),
        factor: finiteNumber(r.factor, 1),
        meterSerial: String(r.meterSerial || r.serial || '').trim(),
        meterClass: String(r.meterClass || r.compliance || 'none').trim().toLowerCase(),
        meterIntegrated: r.meterIntegrated === true || r.integrated === true,
        meteringComplianceDeclared: r.meteringComplianceDeclared === true || r.declaredCompliant === true,
        publiclyAccessible: r.publiclyAccessible === true,
        publicKey: String(r.publicKey || '').trim(),
        transactionIdDp: String(r.transactionIdDp || '').trim(),
        sessionIdDp: String(r.sessionIdDp || '').trim(),
        ocmfDp: String(r.ocmfDp || '').trim(),
        operatorId: String(r.operatorId || '').trim(),
    };
}
function normalizeOriginConfig(rawConfig, editionRaw = 'none') {
    const root = rawConfig && typeof rawConfig === 'object' ? rawConfig : {};
    const origin = root.origin && typeof root.origin === 'object' ? root.origin : root;
    const edition = normalizeEdition(editionRaw);
    const maxSites = edition === 'home' ? HOME_MAX_SITES : (edition === 'pro' ? PRO_MAX_SITES : 0);
    const maxChargePoints = edition === 'home' ? HOME_MAX_CHARGE_POINTS : (edition === 'pro' ? PRO_MAX_CHARGE_POINTS : 0);
    const evidence = origin.evidence && typeof origin.evidence === 'object' ? origin.evidence : {};
    const storage = origin.storage && typeof origin.storage === 'object' ? origin.storage : {};
    const rawChargePoints = Array.isArray(origin.chargePoints) ? origin.chargePoints : [];
    const chargePoints = rawChargePoints.map(normalizeChargePoint).filter((row) => row.enabled).slice(0, maxChargePoints || 0);
    const roleMeters = defaultRoleMeters(origin);
    const extraMeters = (Array.isArray(origin.meters) ? origin.meters : []).map(normalizeMeter).filter((m) => m.enabled);
    const meterByKey = new Map();
    for (const meter of [...roleMeters, ...extraMeters])
        meterByKey.set(`${meter.role}:${meter.chargePointId || ''}:${meter.dpId}`, meter);
    for (const cp of chargePoints) {
        if (!cp.energyMeterKwhId)
            continue;
        const meter = normalizeMeter({
            role: 'evcs-delivery-energy',
            dpId: cp.energyMeterKwhId,
            unit: cp.unit,
            factor: cp.factor,
            name: cp.label,
            meterId: `evcs_${cp.id}`,
            meterSerial: cp.meterSerial,
            meterClass: cp.meterClass,
            integrated: cp.meterIntegrated,
            declaredCompliant: cp.meteringComplianceDeclared,
            publicKey: cp.publicKey,
            chargePointId: cp.id,
            stationId: cp.stationId,
            publiclyAccessible: cp.publiclyAccessible,
        }, 'evcs-delivery-energy', meterByKey.size);
        meterByKey.set(`${meter.role}:${meter.chargePointId}:${meter.dpId}`, meter);
    }
    const intervalMinutes = Math.max(1, Math.min(60, Math.round(finiteNumber(origin.intervalMinutes, DEFAULT_INTERVAL_MINUTES))));
    const staleSeconds = Math.max(30, Math.min(86400, Math.round(finiteNumber(origin.staleSeconds, DEFAULT_STALE_SECONDS))));
    const recentIntervalLimit = Math.max(96, Math.min(35040, Math.round(finiteNumber(origin.recentIntervalLimit, DEFAULT_RECENT_INTERVALS))));
    const allocationMethod = ['proportional', 'direct-load-first', 'conservative-evcs-last'].includes(String(origin.allocationMethod || '').trim())
        ? String(origin.allocationMethod).trim()
        : 'proportional';
    const evidenceMode = ['operational', 'formal'].includes(String(origin.evidenceMode || '').trim())
        ? String(origin.evidenceMode).trim()
        : 'operational';
    const siteId = safeId(origin.siteId || 'site_1', 'site_1');
    const siteName = String(origin.siteName || 'Standort 1');
    const country = String(origin.country || evidence.country || 'auto').trim().toUpperCase();
    const operatorType = String(evidence.operatorType || 'business').trim().toLowerCase();
    const config = {
        schema: ORIGIN_CONFIG_VERSION,
        enabled: origin.enabled === true,
        edition,
        maxSites,
        maxChargePoints,
        siteId,
        siteName,
        country: country === 'NL' || country === 'DE' ? country : 'AUTO',
        intervalMinutes,
        staleSeconds,
        recentIntervalLimit,
        allocationMethod,
        evidenceMode,
        meters: Array.from(meterByKey.values()),
        chargePoints,
        storage: {
            enabled: storage.enabled !== false && (!!roleMeters.find((m) => m.role === 'storage-charge-energy') || !!roleMeters.find((m) => m.role === 'storage-discharge-energy')),
            chargeEfficiencyPct: clamp(storage.chargeEfficiencyPct ?? 95, 50, 100),
            dischargeEfficiencyPct: clamp(storage.dischargeEfficiencyPct ?? 95, 50, 100),
            exclusiveRenewableChargingDeclared: storage.exclusiveRenewableChargingDeclared === true,
            initialInventoryKwh: Math.max(0, finiteNumber(storage.initialInventoryKwh, 0)),
            initialPvSharePct: clamp(storage.initialPvSharePct ?? 0, 0, 100),
            inventoryMethod: String(storage.inventoryMethod || 'pro-rata').trim(),
        },
        evidence: {
            sameGridConnectionDeclared: evidence.sameGridConnectionDeclared === true,
            meteringComplianceDeclared: evidence.meteringComplianceDeclared === true,
            publicChargingDeclared: evidence.publicChargingDeclared === true,
            sameWozObjectDeclared: evidence.sameWozObjectDeclared === true,
            directLineDeclared: evidence.directLineDeclared === true,
            noOperatingSubsidyDeclared: evidence.noOperatingSubsidyDeclared === true,
            integratedMidMeterDeclared: evidence.integratedMidMeterDeclared === true,
            operatorType,
            nlGridRenewableSharePct: clamp(evidence.nlGridRenewableSharePct ?? 50.5, 0, 100),
            dePublicChargingOnly: evidence.dePublicChargingOnly !== false,
            note: String(evidence.note || ''),
        },
    };
    config.configHash = hashObject({ ...config, configHash: undefined });
    return config;
}
function emptyStorageInventory(config = {}) {
    const initial = Math.max(0, finiteNumber(config.initialInventoryKwh, 0));
    const pvShare = clamp(config.initialPvSharePct ?? 0, 0, 100) / 100;
    const pv = round(initial * pvShare, 6);
    return {
        schema: ORIGIN_INVENTORY_VERSION,
        pvKwh: pv,
        otherRenewableKwh: 0,
        gridKwh: 0,
        unknownKwh: round(initial - pv, 6),
        totalKwh: round(initial, 6),
        updatedAt: 0,
    };
}
function normalizeInventory(raw, config = {}) {
    const fallback = emptyStorageInventory(config);
    const r = raw && typeof raw === 'object' ? raw : fallback;
    const out = {
        schema: ORIGIN_INVENTORY_VERSION,
        pvKwh: Math.max(0, finiteNumber(r.pvKwh, fallback.pvKwh)),
        otherRenewableKwh: Math.max(0, finiteNumber(r.otherRenewableKwh, fallback.otherRenewableKwh)),
        gridKwh: Math.max(0, finiteNumber(r.gridKwh, fallback.gridKwh)),
        unknownKwh: Math.max(0, finiteNumber(r.unknownKwh, fallback.unknownKwh)),
        totalKwh: 0,
        updatedAt: Math.max(0, finiteNumber(r.updatedAt, 0)),
    };
    out.totalKwh = round(out.pvKwh + out.otherRenewableKwh + out.gridKwh + out.unknownKwh, 6);
    return out;
}
function meterSampleFromState(meter, state, now = Date.now()) {
    const st = state && typeof state === 'object' ? state : {};
    const raw = st.val;
    const valueKwh = toKwh(raw, meter.unit, meter.factor);
    const ts = Math.max(0, finiteNumber(st.ts || st.lc || now, now));
    return {
        meterId: meter.id,
        role: meter.role,
        dpId: meter.dpId,
        chargePointId: meter.chargePointId || '',
        valueKwh,
        rawValue: raw,
        ts,
        lc: Math.max(0, finiteNumber(st.lc, ts)),
        ack: st.ack !== false,
        valid: Number.isFinite(valueKwh),
        unit: meter.unit,
        factor: meter.factor,
    };
}
function interpolateCumulativeSample(previous, current, boundaryTs) {
    const p = previous && previous.valid ? previous : null;
    const c = current && current.valid ? current : null;
    if (!p && !c)
        return null;
    if (!p)
        return { ...c, ts: boundaryTs };
    if (!c)
        return { ...p, ts: boundaryTs };
    if (c.ts <= p.ts || boundaryTs <= p.ts)
        return { ...p, ts: boundaryTs };
    if (boundaryTs >= c.ts)
        return { ...c, ts: boundaryTs };
    const delta = c.valueKwh - p.valueKwh;
    if (!Number.isFinite(delta) || delta < -EPS_KWH)
        return { ...p, ts: boundaryTs, resetDetected: true };
    const ratio = clamp((boundaryTs - p.ts) / Math.max(1, c.ts - p.ts), 0, 1);
    return { ...p, valueKwh: p.valueKwh + delta * ratio, ts: boundaryTs, interpolated: true };
}
function deltaFromSamples(start, end) {
    if (!start || !end || !start.valid || !end.valid)
        return { valid: false, deltaKwh: 0, reason: 'missing-sample' };
    const delta = finiteNumber(end.valueKwh, NaN) - finiteNumber(start.valueKwh, NaN);
    if (!Number.isFinite(delta))
        return { valid: false, deltaKwh: 0, reason: 'invalid-number' };
    if (delta < -EPS_KWH)
        return { valid: false, deltaKwh: 0, reason: 'counter-reset' };
    return { valid: true, deltaKwh: Math.max(0, round(delta, 6)), reason: delta < 0 ? 'rounding' : 'ok' };
}
function splitProportional(total, weights) {
    const amount = Math.max(0, finiteNumber(total, 0));
    const rows = Array.isArray(weights) ? weights : [];
    const sum = rows.reduce((acc, row) => acc + Math.max(0, finiteNumber(row.weight, 0)), 0);
    const out = {};
    if (amount <= EPS_KWH || sum <= EPS_KWH) {
        for (const row of rows)
            out[row.id] = 0;
        return out;
    }
    let assigned = 0;
    rows.forEach((row, index) => {
        const part = index === rows.length - 1 ? amount - assigned : amount * Math.max(0, finiteNumber(row.weight, 0)) / sum;
        out[row.id] = Math.max(0, round(part, 6));
        assigned += out[row.id];
    });
    return out;
}
function withdrawStorage(inventoryRaw, dischargeKwh, efficiencyPct) {
    const inventory = normalizeInventory(inventoryRaw);
    const delivered = Math.max(0, finiteNumber(dischargeKwh, 0));
    const eff = clamp(efficiencyPct, 50, 100) / 100;
    const requiredStored = delivered / Math.max(0.0001, eff);
    const available = inventory.totalKwh;
    const withdraw = Math.min(available, requiredStored);
    const weights = [
        { id: 'pvKwh', weight: inventory.pvKwh },
        { id: 'otherRenewableKwh', weight: inventory.otherRenewableKwh },
        { id: 'gridKwh', weight: inventory.gridKwh },
        { id: 'unknownKwh', weight: inventory.unknownKwh },
    ];
    const removed = splitProportional(withdraw, weights);
    const deliveredScale = withdraw > EPS_KWH ? Math.min(delivered, withdraw * eff) / withdraw : 0;
    const sources = {
        storedPvKwh: round((removed.pvKwh || 0) * deliveredScale, 6),
        storedOtherRenewableKwh: round((removed.otherRenewableKwh || 0) * deliveredScale, 6),
        storedGridKwh: round((removed.gridKwh || 0) * deliveredScale, 6),
        storedUnknownKwh: round((removed.unknownKwh || 0) * deliveredScale, 6),
    };
    const deliveredKnown = Object.values(sources).reduce((a, b) => a + finiteNumber(b, 0), 0);
    if (deliveredKnown < delivered - EPS_KWH)
        sources.storedUnknownKwh = round(sources.storedUnknownKwh + (delivered - deliveredKnown), 6);
    const next = {
        ...inventory,
        pvKwh: Math.max(0, round(inventory.pvKwh - (removed.pvKwh || 0), 6)),
        otherRenewableKwh: Math.max(0, round(inventory.otherRenewableKwh - (removed.otherRenewableKwh || 0), 6)),
        gridKwh: Math.max(0, round(inventory.gridKwh - (removed.gridKwh || 0), 6)),
        unknownKwh: Math.max(0, round(inventory.unknownKwh - (removed.unknownKwh || 0), 6)),
    };
    next.totalKwh = round(next.pvKwh + next.otherRenewableKwh + next.gridKwh + next.unknownKwh, 6);
    return { inventory: next, deliveredSources: sources, requiredStoredKwh: round(requiredStored, 6), withdrawnStoredKwh: round(withdraw, 6) };
}
function addStorageCharge(inventoryRaw, chargeSources, chargeKwh, efficiencyPct) {
    const inventory = normalizeInventory(inventoryRaw);
    const totalCharge = Math.max(0, finiteNumber(chargeKwh, 0));
    const eff = clamp(efficiencyPct, 50, 100) / 100;
    const storedTotal = totalCharge * eff;
    const sourceTotal = Object.values(chargeSources || {}).reduce((a, b) => a + Math.max(0, finiteNumber(b, 0)), 0);
    const ratio = sourceTotal > EPS_KWH ? storedTotal / sourceTotal : 0;
    const addedPv = Math.max(0, finiteNumber(chargeSources && chargeSources.pvKwh, 0)) * ratio;
    const addedOther = Math.max(0, finiteNumber(chargeSources && chargeSources.otherRenewableKwh, 0)) * ratio;
    const addedGrid = Math.max(0, finiteNumber(chargeSources && chargeSources.gridKwh, 0)) * ratio;
    let addedUnknown = Math.max(0, finiteNumber(chargeSources && chargeSources.unknownKwh, 0)) * ratio;
    const assigned = addedPv + addedOther + addedGrid + addedUnknown;
    if (assigned < storedTotal - EPS_KWH)
        addedUnknown += storedTotal - assigned;
    const next = {
        schema: ORIGIN_INVENTORY_VERSION,
        pvKwh: round(inventory.pvKwh + addedPv, 6),
        otherRenewableKwh: round(inventory.otherRenewableKwh + addedOther, 6),
        gridKwh: round(inventory.gridKwh + addedGrid, 6),
        unknownKwh: round(inventory.unknownKwh + addedUnknown, 6),
        totalKwh: 0,
        updatedAt: Date.now(),
    };
    next.totalKwh = round(next.pvKwh + next.otherRenewableKwh + next.gridKwh + next.unknownKwh, 6);
    return { inventory: next, storedAddedKwh: round(storedTotal, 6), lossesKwh: round(totalCharge - storedTotal, 6) };
}
function roleDeltaMap(meters, startSamples, endSamples) {
    const byRole = {};
    const meterResults = [];
    for (const meter of meters || []) {
        const start = startSamples && startSamples[meter.id];
        const end = endSamples && endSamples[meter.id];
        const result = deltaFromSamples(start, end);
        const row = {
            meterId: meter.id,
            role: meter.role,
            dpId: meter.dpId,
            chargePointId: meter.chargePointId || '',
            startKwh: start && start.valid ? round(start.valueKwh, 6) : null,
            endKwh: end && end.valid ? round(end.valueKwh, 6) : null,
            deltaKwh: result.deltaKwh,
            valid: result.valid,
            reason: result.reason,
            serial: meter.serial || '',
            meterClass: meter.meterClass || 'none',
            declaredCompliant: meter.declaredCompliant === true,
            integrated: meter.integrated === true,
            publiclyAccessible: meter.publiclyAccessible === true,
        };
        meterResults.push(row);
        if (!byRole[meter.role])
            byRole[meter.role] = [];
        byRole[meter.role].push(row);
    }
    return { byRole, meterResults };
}
function sumValid(rows) {
    return round((Array.isArray(rows) ? rows : []).reduce((acc, row) => acc + (row && row.valid ? Math.max(0, finiteNumber(row.deltaKwh, 0)) : 0), 0), 6);
}
function sourcePoolForDirectLoads({ pvKwh, otherRenewableKwh, gridKwh, storageSources, directDemandKwh, storageChargeKwh, gridExportKwh, allocationMethod }) {
    const directDemand = Math.max(0, finiteNumber(directDemandKwh, 0));
    const storageCharge = Math.max(0, finiteNumber(storageChargeKwh, 0));
    const pvAvailable = Math.max(0, finiteNumber(pvKwh, 0));
    const otherAvailable = Math.max(0, finiteNumber(otherRenewableKwh, 0));
    const renewableGeneration = pvAvailable + otherAvailable;
    // Ohne zeitaufgelöste Erzeuger-/Exportzähler wird Export konservativ zuerst
    // von der lokalen EE-Erzeugung abgezogen. Ein darüber hinausgehender Export
    // bleibt als Bilanzabweichung sichtbar und wird nicht als EVCS-EE erfunden.
    const renewableAvailable = Math.max(0, renewableGeneration - Math.max(0, finiteNumber(gridExportKwh, 0)));
    const storageRaw = {
        storedPvKwh: Math.max(0, finiteNumber(storageSources && storageSources.storedPvKwh, 0)),
        storedOtherRenewableKwh: Math.max(0, finiteNumber(storageSources && storageSources.storedOtherRenewableKwh, 0)),
        storedGridKwh: Math.max(0, finiteNumber(storageSources && storageSources.storedGridKwh, 0)),
        storedUnknownKwh: Math.max(0, finiteNumber(storageSources && storageSources.storedUnknownKwh, 0)),
    };
    const storageDelivered = Object.values(storageRaw).reduce((a, b) => a + b, 0);
    const storageToDirect = Math.min(directDemand, storageDelivered);
    const storageScale = storageDelivered > EPS_KWH ? storageToDirect / storageDelivered : 0;
    const storageDirect = Object.fromEntries(Object.entries(storageRaw).map(([key, value]) => [key, round(value * storageScale, 6)]));
    const remainingDirect = Math.max(0, directDemand - storageToDirect);
    let renewableToDirect = 0;
    let renewableToStorage = 0;
    if (allocationMethod === 'direct-load-first') {
        renewableToDirect = Math.min(remainingDirect, renewableAvailable);
        renewableToStorage = Math.min(storageCharge, Math.max(0, renewableAvailable - renewableToDirect));
    }
    else if (allocationMethod === 'conservative-evcs-last') {
        // Auf Anlagenebene wird lokale EE zunächst zwischen direkter Last und
        // Speicherladung proportional verteilt. Die konservative Bevorzugung des
        // Gebäudes gegenüber EVCS erfolgt anschließend in allocateSourcesToLoads().
        const weights = remainingDirect + storageCharge;
        renewableToDirect = weights > EPS_KWH ? Math.min(remainingDirect, renewableAvailable * remainingDirect / weights) : 0;
        renewableToStorage = Math.min(storageCharge, Math.max(0, renewableAvailable - renewableToDirect));
    }
    else {
        const weights = remainingDirect + storageCharge;
        renewableToDirect = weights > EPS_KWH ? Math.min(remainingDirect, renewableAvailable * remainingDirect / weights) : 0;
        renewableToStorage = Math.min(storageCharge, Math.max(0, renewableAvailable - renewableToDirect));
        if (renewableToStorage < storageCharge && renewableToDirect < remainingDirect) {
            const remainingRenewable = Math.max(0, renewableAvailable - renewableToDirect - renewableToStorage);
            renewableToDirect += Math.min(remainingDirect - renewableToDirect, remainingRenewable);
        }
    }
    const renewableRatioPv = renewableGeneration > EPS_KWH ? pvAvailable / renewableGeneration : 0;
    const directPv = renewableToDirect * renewableRatioPv;
    const directOther = renewableToDirect - directPv;
    const storagePv = renewableToStorage * renewableRatioPv;
    const storageOther = renewableToStorage - storagePv;
    const nonRenewableNeedDirect = Math.max(0, remainingDirect - renewableToDirect);
    const directGrid = Math.min(Math.max(0, finiteNumber(gridKwh, 0)), nonRenewableNeedDirect);
    const directUnknown = Math.max(0, remainingDirect - renewableToDirect - directGrid);
    const gridRemaining = Math.max(0, finiteNumber(gridKwh, 0) - directGrid);
    const storageGrid = Math.min(Math.max(0, storageCharge - renewableToStorage), gridRemaining);
    const storageUnknown = Math.max(0, storageCharge - renewableToStorage - storageGrid);
    const direct = {
        pvDirectKwh: round(directPv, 6),
        otherRenewableDirectKwh: round(directOther, 6),
        gridDirectKwh: round(directGrid, 6),
        unknownDirectKwh: round(directUnknown, 6),
        ...storageDirect,
    };
    // Numerische Rundung darf die direkte Quellensumme nie über den gemessenen
    // direkten Bedarf drücken. Eine kleine Restdifferenz wird konservativ als
    // unbekannt ausgewiesen.
    const directAssigned = Object.values(direct).reduce((a, b) => a + Math.max(0, finiteNumber(b, 0)), 0);
    if (directAssigned < directDemand - EPS_KWH)
        direct.unknownDirectKwh = round(direct.unknownDirectKwh + (directDemand - directAssigned), 6);
    return {
        direct,
        storageChargeSources: {
            pvKwh: round(storagePv, 6),
            otherRenewableKwh: round(storageOther, 6),
            gridKwh: round(storageGrid, 6),
            unknownKwh: round(storageUnknown, 6),
        },
        renewableAvailableKwh: round(renewableAvailable, 6),
    };
}
function allocateSourcesToLoads(sourcePool, loads, allocationMethod = 'proportional') {
    const rows = Array.isArray(loads) ? loads.filter((row) => finiteNumber(row.kwh, 0) > EPS_KWH) : [];
    const result = {};
    const remaining = {};
    for (const load of rows) {
        result[load.id] = {};
        remaining[load.id] = Math.max(0, finiteNumber(load.kwh, 0));
    }
    const assignByWeights = (source, amount, selectedRows) => {
        const eligible = selectedRows.filter((row) => remaining[row.id] > EPS_KWH);
        let left = Math.max(0, finiteNumber(amount, 0));
        while (left > EPS_KWH && eligible.some((row) => remaining[row.id] > EPS_KWH)) {
            const active = eligible.filter((row) => remaining[row.id] > EPS_KWH);
            const parts = splitProportional(left, active.map((row) => ({ id: row.id, weight: remaining[row.id] })));
            let assignedRound = 0;
            for (const row of active) {
                const part = Math.min(remaining[row.id], Math.max(0, finiteNumber(parts[row.id], 0)));
                if (part <= EPS_KWH)
                    continue;
                result[row.id][source] = round(finiteNumber(result[row.id][source], 0) + part, 6);
                remaining[row.id] = Math.max(0, round(remaining[row.id] - part, 6));
                assignedRound += part;
            }
            if (assignedRound <= EPS_KWH)
                break;
            left = Math.max(0, round(left - assignedRound, 6));
        }
        return left;
    };
    const buildingRows = rows.filter((row) => row.id === '__building__');
    const evcsRows = rows.filter((row) => row.id !== '__building__');
    const renewableKeys = new Set(['pvDirectKwh', 'otherRenewableDirectKwh', 'storedPvKwh', 'storedOtherRenewableKwh']);
    const unknownKeys = new Set(['unknownDirectKwh', 'storedUnknownKwh']);
    for (const [source, rawAmount] of Object.entries(sourcePool || {})) {
        let left = Math.max(0, finiteNumber(rawAmount, 0));
        if (left <= EPS_KWH)
            continue;
        if (allocationMethod === 'conservative-evcs-last') {
            if (renewableKeys.has(source)) {
                left = assignByWeights(source, left, buildingRows);
                left = assignByWeights(source, left, evcsRows);
            }
            else {
                // Netz und unbekannte Herkunft werden im konservativen Modus zuerst
                // der EVCS zugeordnet; lokale EE wird erst nach Deckung des Gebäudes
                // als EVCS-Anteil ausgewiesen.
                left = assignByWeights(source, left, evcsRows);
                left = assignByWeights(source, left, buildingRows);
            }
        }
        else {
            left = assignByWeights(source, left, rows);
        }
        // Überangebot aus inkonsistenten Messketten wird nicht über die Last hinaus
        // verteilt. buildQuality() weist die Bilanzabweichung separat aus.
        void left;
    }
    for (const load of rows) {
        if (remaining[load.id] > EPS_KWH) {
            result[load.id].unknownDirectKwh = round(finiteNumber(result[load.id].unknownDirectKwh, 0) + remaining[load.id], 6);
            remaining[load.id] = 0;
        }
    }
    return result;
}
function evaluateEvidence(config, meterResults, evcsBreakdown, quality) {
    const evidence = config.evidence || {};
    const chargePoints = config.chargePoints || [];
    const publicCps = chargePoints.filter((cp) => cp.publiclyAccessible);
    const allCpMetersValid = publicCps.length > 0 && publicCps.every((cp) => {
        const row = meterResults.find((m) => m.role === 'evcs-delivery-energy' && m.chargePointId === cp.id);
        return !!(row && row.valid && cp.meteringComplianceDeclared);
    });
    const common = {
        intervalMinutes: config.intervalMinutes,
        intervalComplete: quality.status === 'complete',
        sameGridConnectionDeclared: evidence.sameGridConnectionDeclared === true,
        meteringComplianceDeclared: evidence.meteringComplianceDeclared === true,
        publicChargePointCount: publicCps.length,
        publicChargePointMetersValid: allCpMetersValid,
    };
    const storageMix = evcsBreakdown || {};
    const storedRenewableKwh = finiteNumber(storageMix.storedPvKwh, 0) + finiteNumber(storageMix.storedOtherRenewableKwh, 0);
    const storageExclusive = config.storage && config.storage.exclusiveRenewableChargingDeclared === true;
    const deReady = common.intervalMinutes === 15
        && common.intervalComplete
        && common.sameGridConnectionDeclared
        && common.meteringComplianceDeclared
        && publicCps.length > 0
        && allCpMetersValid;
    const deDirectRenewableKwh = deReady
        ? round(finiteNumber(storageMix.pvDirectKwh, 0) + finiteNumber(storageMix.otherRenewableDirectKwh, 0), 6)
        : 0;
    const deStoredRenewableKwh = deReady && storageExclusive ? round(storedRenewableKwh, 6) : 0;
    const nlMeterRequirement = evidence.operatorType === 'private'
        ? evidence.integratedMidMeterDeclared === true
        : (evidence.integratedMidMeterDeclared === true || evidence.meteringComplianceDeclared === true);
    const nlReady = common.intervalMinutes === 15
        && common.intervalComplete
        && nlMeterRequirement
        && publicCps.length > 0
        && allCpMetersValid
        && (evidence.sameWozObjectDeclared === true || evidence.directLineDeclared === true)
        && evidence.noOperatingSubsidyDeclared === true;
    const gridRenewableShare = clamp(evidence.nlGridRenewableSharePct ?? 0, 0, 100) / 100;
    const nlLocalRenewableKwh = nlReady ? round(deDirectRenewableKwh + (storageExclusive ? storedRenewableKwh : 0), 6) : 0;
    const nlGridRenewableKwh = nlReady ? round((finiteNumber(storageMix.gridDirectKwh, 0) + finiteNumber(storageMix.storedGridKwh, 0)) * gridRenewableShare, 6) : 0;
    return {
        schema: 'nexowatt.energy-origin-evidence.v1',
        common,
        de: {
            ready: deReady,
            status: deReady ? 'candidate-ready' : 'not-ready',
            directRenewableKwh: deDirectRenewableKwh,
            storedRenewableKwh: deStoredRenewableKwh,
            eligibleRenewableKwh: round(deDirectRenewableKwh + deStoredRenewableKwh, 6),
            storedRenewableExcludedKwh: deReady && !storageExclusive ? round(storedRenewableKwh, 6) : 0,
            reasonCodes: [
                ...(common.intervalMinutes === 15 ? [] : ['interval-not-15-min']),
                ...(common.intervalComplete ? [] : ['measurement-incomplete']),
                ...(common.sameGridConnectionDeclared ? [] : ['same-grid-connection-not-declared']),
                ...(common.meteringComplianceDeclared ? [] : ['metering-compliance-not-declared']),
                ...(publicCps.length > 0 ? [] : ['no-public-charge-point']),
                ...(allCpMetersValid ? [] : ['public-charge-point-meter-incomplete']),
                ...(storedRenewableKwh > EPS_KWH && !storageExclusive ? ['storage-not-exclusive-renewable'] : []),
            ],
        },
        nl: {
            ready: nlReady,
            status: nlReady ? 'candidate-ready' : 'not-ready',
            localRenewableKwh: nlLocalRenewableKwh,
            gridRenewableKwh: nlGridRenewableKwh,
            eligibleRenewableKwh: round(nlLocalRenewableKwh + nlGridRenewableKwh, 6),
            gridRenewableSharePct: round(gridRenewableShare * 100, 3),
            reasonCodes: [
                ...(common.intervalMinutes === 15 ? [] : ['interval-not-15-min']),
                ...(common.intervalComplete ? [] : ['measurement-incomplete']),
                ...(nlMeterRequirement ? [] : ['integrated-mid-or-transition-proof-missing']),
                ...(publicCps.length > 0 ? [] : ['no-charge-point']),
                ...(allCpMetersValid ? [] : ['charge-point-meter-incomplete']),
                ...((evidence.sameWozObjectDeclared === true || evidence.directLineDeclared === true) ? [] : ['same-woz-or-direct-line-not-declared']),
                ...(evidence.noOperatingSubsidyDeclared === true ? [] : ['no-subsidy-declaration-missing']),
            ],
        },
        legalNote: 'Nachweiskandidat; keine automatische behördliche Anerkennung oder Vergütungszusage.',
    };
}
function buildQuality(config, meterResults, balance) {
    const requiredRoles = ['grid-import-energy', 'grid-export-energy', 'pv-generation-energy', 'evcs-delivery-energy'];
    const missingRoles = requiredRoles.filter((role) => !(meterResults || []).some((row) => row.role === role && row.valid));
    const invalidMeters = (meterResults || []).filter((row) => !row.valid).map((row) => ({ meterId: row.meterId, role: row.role, reason: row.reason }));
    const imbalanceAbs = Math.abs(finiteNumber(balance.imbalanceKwh, 0));
    const total = Math.max(EPS_KWH, finiteNumber(balance.supplyKwh, 0), finiteNumber(balance.useKwh, 0));
    const imbalancePct = imbalanceAbs / total * 100;
    let status = 'complete';
    if (missingRoles.length || invalidMeters.length)
        status = 'incomplete';
    if (imbalancePct > 10)
        status = 'invalid';
    else if (imbalancePct > 2 && status === 'complete')
        status = 'partial';
    return {
        status,
        missingRoles,
        invalidMeters,
        imbalanceKwh: round(imbalanceAbs, 6),
        imbalancePct: round(imbalancePct, 3),
        formallyUsable: status === 'complete' && config.intervalMinutes === 15,
    };
}
function calculateOriginInterval({ config: rawConfig, startSamples, endSamples, storageInventory, previousHash = '', startTs, endTs, edition }) {
    const config = rawConfig && rawConfig.schema === ORIGIN_CONFIG_VERSION ? rawConfig : normalizeOriginConfig(rawConfig, edition);
    const { byRole, meterResults } = roleDeltaMap(config.meters, startSamples, endSamples);
    const gridImportKwh = sumValid(byRole['grid-import-energy']);
    const gridExportKwh = sumValid(byRole['grid-export-energy']);
    const pvGenerationKwh = sumValid(byRole['pv-generation-energy']);
    const otherRenewableKwh = sumValid(byRole['other-renewable-energy']);
    const buildingMeasuredKwh = sumValid(byRole['building-load-energy']);
    const storageChargeKwh = sumValid(byRole['storage-charge-energy']);
    const storageDischargeKwh = sumValid(byRole['storage-discharge-energy']);
    const chargePointConfigById = new Map((config.chargePoints || []).map((cp) => [String(cp.id || ''), cp]));
    const evcsRows = (byRole['evcs-delivery-energy'] || []).filter((row) => row.valid).map((row) => {
        const chargePointId = row.chargePointId || row.meterId;
        const cp = chargePointConfigById.get(String(chargePointId)) || {};
        return {
            id: chargePointId,
            chargePointId,
            meterId: row.meterId,
            kwh: row.deltaKwh,
            label: String(cp.label || chargePointId),
            stationId: String(cp.stationId || ''),
            connectorNo: Math.max(1, Math.round(finiteNumber(cp.connectorNo, 1))),
            meterSerial: String(cp.meterSerial || row.serial || ''),
            meterClass: String(cp.meterClass || row.meterClass || 'none'),
            meterIntegrated: cp.meterIntegrated === true || row.integrated === true,
            meteringComplianceDeclared: cp.meteringComplianceDeclared === true || row.declaredCompliant === true,
            publiclyAccessible: cp.publiclyAccessible === true || row.publiclyAccessible === true,
            publicKeyPresent: !!String(cp.publicKey || '').trim(),
            operatorId: String(cp.operatorId || ''),
        };
    });
    const evcsTotalKwh = round(evcsRows.reduce((acc, row) => acc + row.kwh, 0), 6);
    const storageWithdrawal = withdrawStorage(storageInventory, storageDischargeKwh, config.storage.dischargeEfficiencyPct);
    const storageSources = storageWithdrawal.deliveredSources;
    const supplyKwh = round(gridImportKwh + pvGenerationKwh + otherRenewableKwh + storageDischargeKwh, 6);
    const knownUseWithoutBuilding = round(gridExportKwh + storageChargeKwh + evcsTotalKwh, 6);
    const buildingDerivedKwh = Math.max(0, round(supplyKwh - knownUseWithoutBuilding, 6));
    const buildingKwh = buildingMeasuredKwh > EPS_KWH ? buildingMeasuredKwh : buildingDerivedKwh;
    const directDemandKwh = round(buildingKwh + evcsTotalKwh, 6);
    const pools = sourcePoolForDirectLoads({
        pvKwh: pvGenerationKwh,
        otherRenewableKwh,
        gridKwh: gridImportKwh,
        storageSources,
        directDemandKwh,
        storageChargeKwh,
        gridExportKwh,
        allocationMethod: config.allocationMethod,
    });
    const loadRows = [{ id: '__building__', kwh: buildingKwh }, ...evcsRows.map((row) => ({ id: row.chargePointId, kwh: row.kwh }))];
    const allocations = allocateSourcesToLoads(pools.direct, loadRows, config.allocationMethod);
    const evcsBreakdown = {};
    const chargePointBreakdown = [];
    for (const row of evcsRows) {
        const sources = allocations[row.chargePointId] || { unknownDirectKwh: row.kwh };
        chargePointBreakdown.push({
            chargePointId: row.chargePointId,
            label: row.label,
            stationId: row.stationId,
            connectorNo: row.connectorNo,
            meterId: row.meterId,
            meterSerial: row.meterSerial,
            meterClass: row.meterClass,
            meterIntegrated: row.meterIntegrated,
            meteringComplianceDeclared: row.meteringComplianceDeclared,
            publiclyAccessible: row.publiclyAccessible,
            publicKeyPresent: row.publicKeyPresent,
            operatorId: row.operatorId,
            energyKwh: round(row.kwh, 6),
            sources,
            renewableKwh: round(finiteNumber(sources.pvDirectKwh, 0) + finiteNumber(sources.otherRenewableDirectKwh, 0) + finiteNumber(sources.storedPvKwh, 0) + finiteNumber(sources.storedOtherRenewableKwh, 0), 6),
            gridKwh: round(finiteNumber(sources.gridDirectKwh, 0) + finiteNumber(sources.storedGridKwh, 0), 6),
            unknownKwh: round(finiteNumber(sources.unknownDirectKwh, 0) + finiteNumber(sources.storedUnknownKwh, 0), 6),
        });
        for (const [key, value] of Object.entries(sources))
            evcsBreakdown[key] = round(finiteNumber(evcsBreakdown[key], 0) + finiteNumber(value, 0), 6);
    }
    const chargeResult = addStorageCharge(storageWithdrawal.inventory, pools.storageChargeSources, storageChargeKwh, config.storage.chargeEfficiencyPct);
    chargeResult.inventory.updatedAt = endTs || Date.now();
    const useKwh = round(buildingKwh + evcsTotalKwh + storageChargeKwh + gridExportKwh, 6);
    const balance = {
        supplyKwh,
        useKwh,
        imbalanceKwh: round(supplyKwh - useKwh, 6),
        buildingMeasured: buildingMeasuredKwh > EPS_KWH,
    };
    const quality = buildQuality(config, meterResults, balance);
    const evidence = evaluateEvidence(config, meterResults, evcsBreakdown, quality);
    const payload = {
        schema: ORIGIN_INTERVAL_VERSION,
        ledgerVersion: ORIGIN_LEDGER_VERSION,
        siteId: config.siteId,
        siteName: config.siteName,
        country: config.country,
        startTs: Math.round(finiteNumber(startTs, 0)),
        endTs: Math.round(finiteNumber(endTs, 0)),
        intervalMinutes: config.intervalMinutes,
        configHash: config.configHash,
        allocationMethod: config.allocationMethod,
        evidenceMode: config.evidenceMode,
        meters: meterResults,
        energy: {
            gridImportKwh,
            gridExportKwh,
            pvGenerationKwh,
            otherRenewableKwh,
            buildingKwh,
            buildingMeasuredKwh,
            buildingDerivedKwh,
            storageChargeKwh,
            storageDischargeKwh,
            evcsTotalKwh,
        },
        evcs: {
            totalKwh: evcsTotalKwh,
            sourceBreakdown: evcsBreakdown,
            chargePoints: chargePointBreakdown,
        },
        storage: {
            before: normalizeInventory(storageInventory, config.storage),
            dischargedSources: storageSources,
            chargeSources: pools.storageChargeSources,
            chargeLossesKwh: chargeResult.lossesKwh,
            after: chargeResult.inventory,
            exclusiveRenewableChargingDeclared: config.storage.exclusiveRenewableChargingDeclared === true,
        },
        balance,
        quality,
        evidence,
        createdAt: Date.now(),
        previousHash: String(previousHash || ''),
    };
    const hashPayload = { ...payload, hash: undefined };
    payload.hash = sha256Hex(`${payload.previousHash}\n${canonicalJson(hashPayload)}`);
    return { interval: payload, storageInventory: chargeResult.inventory };
}
function aggregateIntervals(intervals) {
    const rows = Array.isArray(intervals) ? intervals : [];
    const sum = (selector) => round(rows.reduce((acc, row) => acc + finiteNumber(selector(row), 0), 0), 6);
    const evcsTotalKwh = sum((row) => row && row.evcs && row.evcs.totalKwh);
    const localRenewableKwh = sum((row) => row && row.evcs && row.evcs.sourceBreakdown && (finiteNumber(row.evcs.sourceBreakdown.pvDirectKwh, 0)
        + finiteNumber(row.evcs.sourceBreakdown.otherRenewableDirectKwh, 0)
        + finiteNumber(row.evcs.sourceBreakdown.storedPvKwh, 0)
        + finiteNumber(row.evcs.sourceBreakdown.storedOtherRenewableKwh, 0)));
    const gridKwh = sum((row) => row && row.evcs && row.evcs.sourceBreakdown && (finiteNumber(row.evcs.sourceBreakdown.gridDirectKwh, 0)
        + finiteNumber(row.evcs.sourceBreakdown.storedGridKwh, 0)));
    const unknownKwh = Math.max(0, round(evcsTotalKwh - localRenewableKwh - gridKwh, 6));
    return {
        schema: 'nexowatt.energy-origin-summary.v1',
        intervalCount: rows.length,
        validIntervalCount: rows.filter((row) => row && row.quality && row.quality.status === 'complete').length,
        evcsTotalKwh,
        localRenewableKwh,
        gridKwh,
        unknownKwh,
        renewableSharePct: evcsTotalKwh > EPS_KWH ? round(localRenewableKwh / evcsTotalKwh * 100, 2) : 0,
        deCandidateRenewableKwh: sum((row) => row && row.evidence && row.evidence.de && row.evidence.de.eligibleRenewableKwh),
        nlCandidateRenewableKwh: sum((row) => row && row.evidence && row.evidence.nl && row.evidence.nl.eligibleRenewableKwh),
        hashHead: rows.length ? String(rows[0].hash || '') : '',
    };
}
module.exports = {
    ORIGIN_LEDGER_VERSION,
    ORIGIN_INTERVAL_VERSION,
    ORIGIN_CONFIG_VERSION,
    ORIGIN_INVENTORY_VERSION,
    DEFAULT_INTERVAL_MINUTES,
    HOME_MAX_SITES,
    HOME_MAX_CHARGE_POINTS,
    PRO_MAX_SITES,
    PRO_MAX_CHARGE_POINTS,
    finiteNumber,
    round,
    safeId,
    normalizeEdition,
    canonicalJson,
    sha256Hex,
    hashObject,
    intervalBounds,
    normalizeUnit,
    toKwh,
    normalizeMeter,
    normalizeChargePoint,
    normalizeOriginConfig,
    emptyStorageInventory,
    normalizeInventory,
    meterSampleFromState,
    interpolateCumulativeSample,
    deltaFromSamples,
    calculateOriginInterval,
    aggregateIntervals,
};
