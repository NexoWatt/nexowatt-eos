/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/modules/stage-a-diagnostics.ts
 * Quell-Hash: sha256:6febcc9d9acac5c177ec57ab9b778216fae8c1daacd9cfc0e45f7dfba1144d4b
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/modules/stage-a-diagnostics.js.
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
 * Aufgabe: Veröffentlicht Diagnoseinformationen der Bedarfs- und Freigabestufe für die Nachvollziehbarkeit der Regelentscheidung.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/modules/stage-a-diagnostics.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
const { BaseModule } = require('./base');
const ACTUATOR_FIELDS = new Set([
    'setCurrentAId', 'setPowerWId', 'enableWriteId', 'targetPowerObjectId',
    'targetChargePowerObjectId', 'targetDischargePowerObjectId', 'runObjectId',
    // Speicher-/Farm-Legacy-Aliase: Alte Installationen duerfen nach der TS-
    // Migration nicht aus der Owner-Matrix fallen, wenn nur der Alias belegt ist.
    'targetPowerId', 'targetChargePowerId', 'targetDischargePowerId',
    'setSignedPowerDp', 'setChargePowerDp', 'setDischargePowerDp',
    'powerSetpointId', 'chargeSetpointId', 'dischargeSetpointId',
    'maxChargeObjectId', 'maxDischargeObjectId', 'chargeEnableObjectId',
    'dischargeEnableObjectId', 'reserveSocObjectId',
    'maxChargeId', 'maxDischargeId', 'chargeEnableId', 'dischargeEnableId', 'reserveSocId',
    'setPowerModeObjectId', 'setPowerValueObjectId', 'powerLimitsUsedObjectId',
    'maxChargePowerObjectId', 'maxDischargePowerObjectId',
    'e3dcSetPowerModeObjectId', 'e3dcSetPowerValueObjectId',
    'e3dcPowerLimitsUsedObjectId', 'e3dcMaxChargePowerObjectId',
    'e3dcMaxDischargePowerObjectId', 'setSignedPowerId',
    'setChargePowerId', 'setDischargePowerId', 'switchWriteId', 'setpointWriteId',
    'sgReadyAWriteId', 'sgReadyBWriteId', 'sgReady1WriteId', 'sgReady2WriteId',
    'writeId', 'writeObjectId', 'writeDp', 'dpWriteId',
    'stageWriteId', 'setpointId', 'outputObjectId', 'commandObjectId', 'commandStateId',
    'enableId', 'startWriteId', 'stopWriteId', 'runWriteId', 'startObjectId',
    'stopObjectId', 'startId', 'stopId', 'setWId', 'setAId', 'setId', 'commandId',
    'outputId', 'relayWriteId', 'targetObjectId', 'lockWriteId', 'phaseSwitchId',
    // Neutrale Command-States sind keine Roh-Hardwarebefehle, aber ebenfalls
    // beschreibbare, manuell zugeordnete AppCenter-Ausgaenge und muessen deshalb
    // dieselbe Authority-/Konflikt-Diagnose erhalten.
    'commandStateDp', 'localCommandStateDp', 'receivedCommandStateDp',
    'zeroExportStorageChargeCommandStateId', 'zeroExportChargingCommandStateId',
    'zeroExportFlexLoadCommandStateId', 'zeroExportMeshCommandStateId',
    'storageChargeCommandStateId', 'chargingCommandStateId',
    'flexLoadCommandStateId', 'meshMicrogridCommandStateId',
    'para14aEmsSetpointWId',
    'pvFeedInLimitWId', 'pvLimitWId', 'pvLimitPctId', 'feedInLimitWId',
    'limitWId', 'limitPctId',
]);
const ACTUATOR_PATTERN = /(?:^|\.)(?:stage\d+WriteId|set[A-Z][A-Za-z0-9]*Id|target[A-Z][A-Za-z0-9]*(?:Id|ObjectId)|.*WriteId|runObjectId|enableId|startWriteId|stopWriteId|commandId|outputId|relayWriteId|lockWriteId|phaseSwitchId)$/;
const INPUT_PATTERN = /(?:actual|meas|meter|powerId|socId|statusId|onlineId|connectedId|watchdogId|heartbeatId|faultId|availableId|temperatureId|currentId|voltageId|priceId|forecastId)$/i;
function text(value) {
    return String(value === undefined || value === null ? '' : value).trim();
}
function looksLikeObjectId(value) {
    const id = text(value);
    return id.length >= 3 && id.includes('.') && !/\s/.test(id) && !id.startsWith('{') && !id.startsWith('[');
}
function ownerFromPath(path, row) {
    const raw = String(path || '');
    const lower = raw.toLowerCase();
    const rowId = text(row && (row.id || row.key));
    const rowIndex = Number(row && (row.idx ?? row.index));
    if (lower.includes('chargingmanagement') || lower.includes('settingsconfig.evcslist') || lower.includes('evcslist')) {
        const match = raw.match(/(?:wallboxes|evcslist)\[(\d+)\]/i);
        const configured = Number(row && row.index);
        const index = Number.isFinite(configured) && configured > 0 ? Math.round(configured) : (match ? Number(match[1]) + 1 : 0);
        return index > 0 ? `charging.lp${index}` : `charging.${rowId || raw}`;
    }
    if (lower.includes('storagefarm'))
        return `storageFarm.${rowId || raw}`;
    if (lower.includes('storage'))
        return `storage.${rowId || raw}`;
    if (lower.includes('thermal'))
        return `thermal.${rowId || raw}`;
    if (lower.includes('heatingrod'))
        return `heatingRod.${rowId || raw}`;
    if (lower.includes('threshold')) {
        const match = raw.match(/rules\[(\d+)\]/i);
        const index = Number.isFinite(rowIndex) && rowIndex > 0 ? Math.round(rowIndex) : (match ? Number(match[1]) + 1 : 0);
        return index > 0 ? `threshold.r${index}` : `threshold.${rowId || raw}`;
    }
    if (lower.includes('gridconstraints'))
        return `gridConstraints.${rowId || raw}`;
    if (lower.includes('chargekiosk'))
        return `chargeKiosk.${rowId || raw}`;
    if (lower.includes('peakshaving'))
        return `peakShaving.${rowId || raw}`;
    if (lower.includes('para14a') || lower.includes('§14a'))
        return `para14a.${rowId || raw}`;
    if (lower.includes('bhkw')) {
        const match = raw.match(/devices\[(\d+)\]/i);
        const index = Number.isFinite(rowIndex) && rowIndex > 0 ? Math.round(rowIndex) : (match ? Number(match[1]) + 1 : 0);
        return index > 0 ? `bhkw.b${index}` : `bhkw.${rowId || raw}`;
    }
    if (lower.includes('generator')) {
        const match = raw.match(/devices\[(\d+)\]/i);
        const index = Number.isFinite(rowIndex) && rowIndex > 0 ? Math.round(rowIndex) : (match ? Number(match[1]) + 1 : 0);
        return index > 0 ? `generator.g${index}` : `generator.${rowId || raw}`;
    }
    if (lower.includes('multiuse'))
        return `multiUse.${rowId || raw}`;
    if (lower.includes('mesh'))
        return `mesh.${rowId || raw}`;
    if (lower.includes('nexologic'))
        return `nexoLogic.${rowId || raw}`;
    if (lower.includes('relay')) {
        const match = raw.match(/relays\[(\d+)\]/i);
        const index = Number.isFinite(rowIndex) && rowIndex > 0 ? Math.round(rowIndex) : (match ? Number(match[1]) + 1 : 0);
        return index > 0 ? `relay.r${index}` : `relay.${rowId || raw}`;
    }
    return `config.${rowId || raw}`;
}
function ownerIsActive(config, owner, row, storageAuthority = null) {
    const lower = owner.toLowerCase();
    if (row && row.enabled === false)
        return false;
    if (lower.startsWith('charging.'))
        return config.enableChargingManagement !== false;
    if (lower.startsWith('storagefarm.')) {
        if (storageAuthority && typeof storageAuthority === 'object') {
            return String(storageAuthority.selectedTopology || 'none') === 'farm';
        }
        const apps = config.emsApps?.apps || {};
        const app = apps.storagefarm || apps.storageFarm;
        return !!(app && app.installed === true && app.enabled === true);
    }
    if (lower.startsWith('storage.')) {
        if (storageAuthority && typeof storageAuthority === 'object') {
            return String(storageAuthority.selectedTopology || 'none') === 'single';
        }
        // MultiUse ist nur Policy und niemals ein eigener Speicher-Hardwarewriter.
        return config.enableStorageControl === true;
    }
    if (lower.startsWith('thermal.'))
        return config.enableThermalControl === true;
    if (lower.startsWith('heatingrod.'))
        return config.enableHeatingRodControl === true;
    if (lower.startsWith('threshold.'))
        return config.enableThresholdControl === true;
    if (lower.startsWith('peakshaving.'))
        return config.enablePeakShaving === true || config.peakShaving?.enabled === true;
    if (lower.startsWith('para14a.'))
        return !!(config.installerConfig?.para14a || config.para14a?.enabled);
    if (lower.startsWith('chargekiosk.'))
        return config.enableChargeKiosk === true || config.chargeKiosk?.enabled === true;
    if (lower.startsWith('bhkw.'))
        return config.enableBhkwControl === true;
    if (lower.startsWith('generator.'))
        return config.enableGeneratorControl === true;
    if (lower.startsWith('multiuse.'))
        return config.enableMultiUse === true;
    if (lower.startsWith('mesh.'))
        return config.enableMeshMicrogrid === true;
    if (lower.startsWith('nexologic.'))
        return config.enableNexoLogic !== false;
    if (lower.startsWith('relay.'))
        return config.enableRelayControl === true;
    return true;
}
function collectActuatorMappings(config, evcsList, storageAuthority = null) {
    const rows = [];
    const seen = new Set();
    const add = (objectId, path, field, row) => {
        const id = text(objectId);
        if (!looksLikeObjectId(id))
            return;
        const owner = ownerFromPath(path, row);
        const signature = `${id}|${owner}|${field}`;
        if (seen.has(signature))
            return;
        seen.add(signature);
        rows.push({ objectId: id, owner, path, field, active: ownerIsActive(config, owner, row, storageAuthority) });
    };
    const visit = (value, path, parent, depth) => {
        if (depth > 12 || value === null || value === undefined)
            return;
        if (Array.isArray(value)) {
            value.forEach((child, index) => visit(child, `${path}[${index}]`, child && typeof child === 'object' ? child : parent, depth + 1));
            return;
        }
        if (typeof value !== 'object')
            return;
        for (const [key, child] of Object.entries(value)) {
            const nextPath = path ? `${path}.${key}` : key;
            if (typeof child === 'string') {
                const exact = ACTUATOR_FIELDS.has(key);
                const patterned = ACTUATOR_PATTERN.test(nextPath);
                if ((exact || patterned) && !(INPUT_PATTERN.test(key) && !exact))
                    add(child, path || 'config', key, parent || value);
            }
            else {
                visit(child, nextPath, child && typeof child === 'object' ? child : parent, depth + 1);
            }
        }
    };
    visit(config, 'config', config, 0);
    (Array.isArray(evcsList) ? evcsList : []).forEach((row, index) => {
        const owner = `charging.lp${Number(row.index) > 0 ? Number(row.index) : index + 1}`;
        // Auch die manuell zugeordneten Verriegelungs-/Phasen-Aktoren gehoeren in
        // dieselbe Owner-Matrix. So laufen sie durch Authority-, Konflikt- und
        // Sicherheitsdiagnosen und werden nicht beim normalisierten evcsList-Pfad
        // uebersehen.
        const evcsActuatorFields = ['setCurrentAId', 'setPowerWId', 'enableWriteId', 'lockWriteId', 'phaseSwitchId'];
        // activeId ist normalerweise ein Status-/Read-DP. Nur wenn RFID aktiv ist und
        // kein eigener lockWriteId existiert, wird er bewusst als Soft-Lock-Ausgang
        // verwendet und muss dann ebenfalls in die Owner-Matrix.
        if (text(row.rfidReadId) && !text(row.lockWriteId) && text(row.activeId))
            evcsActuatorFields.push('activeId');
        for (const field of evcsActuatorFields) {
            const id = text(row[field]);
            if (!looksLikeObjectId(id))
                continue;
            const signature = `${id}|${owner}|${field}`;
            if (seen.has(signature))
                continue;
            seen.add(signature);
            rows.push({ objectId: id, owner, path: `evcsList[${index}]`, field, active: row.enabled !== false && config.enableChargingManagement !== false });
        }
    });
    // C3.4: NexoLogic-Ausgangsknoten besitzen einen stabilen Owner pro Graph/Node.
    // Nur echte dp_out-/scene_trigger-Ziele werden aufgenommen; dp_in bleibt Messwert.
    const logicGraphs = Array.isArray(config.logicEditor?.graphs) ? config.logicEditor.graphs : [];
    const safe = (value, fallback) => text(value).replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || fallback;
    const resolveSceneTarget = (params) => {
        const fallback = text(params?.dpId);
        const sceneId = text(params?.sceneId);
        if (sceneId) {
            const devices = Array.isArray(config.smartHomeConfig?.devices) ? config.smartHomeConfig.devices : [];
            const scene = devices.find((row) => row && row.type === 'scene' && text(row.id) === sceneId);
            const target = text(scene?.io?.switch?.writeId || scene?.io?.switch?.readId);
            if (target)
                return target;
            const legacy = text(config.smartHome?.datapoints?.[sceneId]);
            if (legacy)
                return legacy;
        }
        return fallback;
    };
    logicGraphs.forEach((graph, graphIndex) => {
        if (!graph || graph.enabled === false)
            return;
        const graphId = safe(graph.id, `g${graphIndex + 1}`);
        const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
        nodes.forEach((node, nodeIndex) => {
            if (!node || node.enabled === false)
                return;
            const type = text(node.type);
            if (type !== 'dp_out' && type !== 'scene_trigger')
                return;
            const params = node.params && typeof node.params === 'object' ? node.params : {};
            if (type === 'dp_out' && ['true', '1', 'yes', 'on'].includes(text(params.ack).toLowerCase()))
                return;
            const id = type === 'scene_trigger' ? resolveSceneTarget(params) : text(params.dpId);
            if (!looksLikeObjectId(id))
                return;
            const nodeId = safe(node.id, `n${nodeIndex + 1}`);
            const owner = `nexoLogic.${graphId}.${nodeId}`;
            const field = type === 'scene_trigger' ? 'sceneTargetId' : 'dpId';
            const signature = `${id}|${owner}|${field}`;
            if (seen.has(signature))
                return;
            seen.add(signature);
            rows.push({ objectId: id, owner, path: `config.logicEditor.graphs[${graphIndex}].nodes[${nodeIndex}]`, field, active: config.enableNexoLogic !== false });
        });
    });
    return rows;
}
function buildOwnerMatrix(mappings) {
    const grouped = new Map();
    for (const row of mappings) {
        if (!grouped.has(row.objectId))
            grouped.set(row.objectId, []);
        grouped.get(row.objectId)?.push(row);
    }
    const matrix = [];
    for (const [objectId, entries] of grouped.entries()) {
        const owners = Array.from(new Set(entries.map((entry) => entry.owner)));
        const activeOwners = Array.from(new Set(entries.filter((entry) => entry.active).map((entry) => entry.owner)));
        matrix.push({
            objectId,
            owners,
            activeOwners,
            mappings: entries.map((entry) => ({ owner: entry.owner, field: entry.field, path: entry.path, active: entry.active })),
            duplicate: owners.length > 1,
            conflict: activeOwners.length > 1,
        });
    }
    return matrix.sort((a, b) => a.objectId.localeCompare(b.objectId));
}
async function readForeignStateInfo(adapter, objectId, now) {
    const id = text(objectId);
    if (!id || typeof adapter?.getForeignStateAsync !== 'function') {
        return { id, mapped: !!id, present: false, value: null, ts: null, lc: null, ageMs: null, changeAgeMs: null };
    }
    try {
        const state = await adapter.getForeignStateAsync(id);
        if (!state)
            return { id, mapped: true, present: false, value: null, ts: null, lc: null, ageMs: null, changeAgeMs: null };
        const tsRaw = Number(state.ts);
        const lcRaw = Number(state.lc);
        const ts = Number.isFinite(tsRaw) && tsRaw > 0 ? tsRaw : null;
        const lc = Number.isFinite(lcRaw) && lcRaw > 0 ? lcRaw : null;
        return {
            id,
            mapped: true,
            present: true,
            value: state.val,
            ts,
            lc,
            ageMs: ts === null ? null : Math.max(0, now - ts),
            changeAgeMs: lc === null ? null : Math.max(0, now - lc),
            ack: state.ack === true,
        };
    }
    catch (error) {
        return {
            id,
            mapped: true,
            present: false,
            value: null,
            ts: null,
            lc: null,
            ageMs: null,
            changeAgeMs: null,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
function describeStorageOverride(adapter) {
    const config = adapter?.config && typeof adapter.config === 'object' ? adapter.config : {};
    const dps = config.datapoints && typeof config.datapoints === 'object' ? config.datapoints : {};
    const storageDps = config.storage?.datapoints && typeof config.storage.datapoints === 'object' ? config.storage.datapoints : {};
    const global = {
        soc: text(dps.storageSoc),
        signedPower: text(dps.batteryPower),
        chargePower: text(dps.storageChargePower),
        dischargePower: text(dps.storageDischargePower),
    };
    const single = {
        soc: text(storageDps.socObjectId),
        signedPower: text(storageDps.batteryPowerObjectId),
        chargePower: text(storageDps.batteryChargePowerObjectId),
        dischargePower: text(storageDps.batteryDischargePowerObjectId),
    };
    const explicitGlobalPower = !!(global.signedPower || global.chargePower || global.dischargePower);
    const explicitGlobal = explicitGlobalPower || !!global.soc;
    const explicitSingle = Object.values(single).some(Boolean);
    const farmInfo = typeof adapter?._nwGetStorageFarmRuntimeInfo === 'function' ? adapter._nwGetStorageFarmRuntimeInfo() : null;
    const farmActive = !!farmInfo?.active;
    let resolvedSource = '';
    try {
        resolvedSource = text(adapter?._nwResolveBatteryFlowFromCache?.({ now: Date.now() })?.src);
    }
    catch (_error) { }
    return {
        mode: explicitGlobal ? 'appcenter-override' : (explicitSingle ? 'single-storage-mapping' : (farmActive ? 'storage-farm' : 'automatic/fallback')),
        explicitGlobal,
        explicitGlobalPower,
        explicitSingle,
        farmActive,
        farmConfiguredCount: Number(farmInfo?.configuredCount) || 0,
        resolvedSource,
        global,
        single,
    };
}
class StageADiagnosticsModule extends BaseModule {
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);
        this._lastRunMs = 0;
        this._lastWarningSignature = '';
        this.intervalMs = 15000;
        this.adapter = adapter;
        this.dp = dpRegistry;
    }
    async init() {
        const states = {
            active: ['boolean', 'indicator.working', 'Stufe-A-Diagnose aktiv'],
            lastRun: ['number', 'value.time', 'Letzte Stufe-A-Auswertung'],
            status: ['string', 'text', 'Stufe-A-Gesamtstatus'],
            summary: ['string', 'text', 'Stufe-A-Zusammenfassung'],
            mappedActuatorCount: ['number', 'value', 'Erfasste Aktor-Mappings'],
            duplicateActuatorCount: ['number', 'value', 'Mehrfach zugeordnete Aktoren'],
            concurrentControlPathsCount: ['number', 'value', 'Aktive statische Aktorkonflikte'],
            activeActuatorConflictCount: ['number', 'value', 'Aktive Aktorkonflikte gesamt'],
            shadowArbiterMode: ['string', 'text', 'Aktor-Shadow-Arbiter Modus'],
            shadowObservedWriteCount: ['number', 'value', 'Beobachtete externe Schreibanforderungen'],
            shadowRecentWriteCount: ['number', 'value', 'Aktuelle Schreibanforderungen im Konfliktfenster'],
            shadowWriteConflictCount: ['number', 'value', 'Aktive Schreibkonflikte'],
            shadowWriteConflictsJson: ['string', 'json', 'Aktive Schreibkonflikte JSON'],
            shadowLastWriteJson: ['string', 'json', 'Letzte beobachtete Schreibanforderung JSON'],
            authorityActiveLeaseCount: ['number', 'value', 'Aktive Aktor-Steuerhoheiten'],
            authorityBlockedWriteCount: ['number', 'value', 'Aktuell blockierte Schreibanforderungen'],
            authorityPreventedConflictCount: ['number', 'value', 'Durch Arbiter verhinderte Konflikte'],
            authorityUnresolvedConflictCount: ['number', 'value', 'Nicht aufgelöste Laufzeitkonflikte'],
            authorityPreemptionCount: ['number', 'value', 'Prioritätsübernahmen des Aktor-Arbiters'],
            authorityActiveJson: ['string', 'json', 'Aktive Aktor-Steuerhoheiten JSON'],
            authorityBlockedWritesJson: ['string', 'json', 'Blockierte Schreibanforderungen JSON'],
            duplicateActuatorsJson: ['string', 'json', 'Mehrfachzuordnungen JSON'],
            ownerMatrixJson: ['string', 'json', 'Aktor-Owner-Matrix JSON'],
            concurrentControlPathsJson: ['string', 'json', 'Aktive Aktorkonflikte JSON'],
            measurementFreshnessJson: ['string', 'json', 'Messwert-Frische JSON'],
            nvpMode: ['string', 'text', 'NVP-Messmodus'],
            nvpStatus: ['string', 'text', 'NVP-Messstatus'],
            nvpSource: ['string', 'text', 'NVP-Auflösungsquelle'],
            measurementIssueCount: ['number', 'value', 'Kritische Messwert-Hinweise'],
            nvpSignedAgeMs: ['number', 'value.interval', 'Alter signierter NVP-Wert'],
            nvpImportAgeMs: ['number', 'value.interval', 'Alter NVP-Bezug'],
            nvpExportAgeMs: ['number', 'value.interval', 'Alter NVP-Einspeisung'],
            nvpSkewMs: ['number', 'value.interval', 'Zeitversatz NVP Bezug/Einspeisung'],
            nvpCoherent: ['boolean', 'indicator', 'NVP zeitlich kohärent'],
            nvpConnected: ['boolean', 'indicator.connected', 'NVP Connected-Status'],
            nvpConnectedAgeMs: ['number', 'value.interval', 'Alter Connected-State'],
            nvpHeartbeatAgeMs: ['number', 'value.interval', 'Alter NVP-Heartbeat'],
            storageOverrideMode: ['string', 'text', 'Aktive Speicher-Override-Quelle'],
            storageOverrideJson: ['string', 'json', 'Speicher-Override-Diagnose JSON'],
            warningsJson: ['string', 'json', 'Stufe-A-Warnungen JSON'],
            errorsJson: ['string', 'json', 'Stufe-A-Fehler JSON'],
        };
        for (const [key, spec] of Object.entries(states)) {
            await this.adapter.setObjectNotExistsAsync(`ems.diagnostics.stageA.${key}`, {
                type: 'state',
                common: { name: spec[2], type: spec[0], role: spec[1], read: true, write: false },
                native: {},
            });
        }
        await this.setDiagnosticState('active', true);
        await this.tick(true);
    }
    async setDiagnosticState(key, value) {
        if (!this.adapter || this.adapter._nwShuttingDown)
            return;
        const id = `ems.diagnostics.stageA.${key}`;
        try {
            const current = typeof this.adapter.getStateAsync === 'function' ? await this.adapter.getStateAsync(id) : null;
            if (current && current.val === value)
                return;
            await this.adapter.setStateAsync(id, { val: value, ack: true });
        }
        catch (_error) {
            // Diagnosefehler dürfen keinen Regelzyklus beeinflussen.
        }
    }
    async tick(force = false) {
        if (!this.adapter || this.adapter._nwShuttingDown)
            return;
        const now = Date.now();
        if (!force && now - this._lastRunMs < this.intervalMs)
            return;
        this._lastRunMs = now;
        const config = this.adapter.config && typeof this.adapter.config === 'object' ? this.adapter.config : {};
        const storageAuthority = (typeof this.adapter._nwGetStorageControlAuthority === 'function')
            ? this.adapter._nwGetStorageControlAuthority()
            : null;
        const mappings = collectActuatorMappings(config, this.adapter.evcsList, storageAuthority);
        const ownerMatrix = buildOwnerMatrix(mappings);
        const duplicates = ownerMatrix.filter((row) => row.duplicate);
        const conflicts = ownerMatrix.filter((row) => row.conflict);
        // Der Shadow-Arbiter verwendet diese Matrix ausschließlich zur Owner-Zuordnung
        // für unscoped Runtime-/Timer-Writes. Sie verändert keine Priorität und keinen
        // Hardwarewert.
        this.adapter._stageAActuatorOwnerById = Object.fromEntries(ownerMatrix.map((row) => [row.objectId, {
                owners: row.owners,
                activeOwners: row.activeOwners,
            }]));
        const shadow = this.adapter?._actuatorShadowArbiter && typeof this.adapter._actuatorShadowArbiter.snapshot === 'function'
            ? this.adapter._actuatorShadowArbiter.snapshot(now)
            : (this.adapter?._actuatorShadowSnapshot || { mode: 'shadow', active: false, activeConflictCount: 0, activeConflicts: [] });
        const shadowConflicts = Array.isArray(shadow.activeConflicts) ? shadow.activeConflicts : [];
        const preventedShadowConflicts = shadowConflicts.filter((row) => row?.lastResolvedByArbiter === true);
        const unresolvedShadowConflicts = shadowConflicts.filter((row) => row?.lastResolvedByArbiter !== true);
        const activeActuatorConflictCount = new Set([
            ...conflicts.map((row) => text(row.objectId)),
            ...unresolvedShadowConflicts.map((row) => text(row?.objectId || row?.targetId)),
        ].filter(Boolean)).size;
        const dps = config.datapoints && typeof config.datapoints === 'object' ? config.datapoints : {};
        const staleSec = Number(config.settings?.deviceStaleTimeoutSec);
        const staleMs = Math.max(5000, Number.isFinite(staleSec) && staleSec > 0 ? staleSec * 1000 : 60000);
        const maxSkewMs = Math.max(1000, Math.min(10000, Number(config.diagnostics?.nvpMaxSkewMs) || 5000));
        const [signed, gridImport, gridExport, connected, heartbeat, pv, load, storageSoc, storagePower] = await Promise.all([
            readForeignStateInfo(this.adapter, dps.gridPointPower, now),
            readForeignStateInfo(this.adapter, dps.gridBuyPower, now),
            readForeignStateInfo(this.adapter, dps.gridSellPower, now),
            readForeignStateInfo(this.adapter, dps.gridPointConnected, now),
            readForeignStateInfo(this.adapter, dps.gridPointWatchdog, now),
            readForeignStateInfo(this.adapter, dps.pvPower || dps.productionTotal, now),
            readForeignStateInfo(this.adapter, dps.consumptionTotal || dps.housePower, now),
            readForeignStateInfo(this.adapter, dps.storageSoc || config.storage?.datapoints?.socObjectId, now),
            readForeignStateInfo(this.adapter, dps.batteryPower || config.storage?.datapoints?.batteryPowerObjectId, now),
        ]);
        const rawNvpMode = signed.id ? 'signed' : ((gridImport.id || gridExport.id) ? 'split' : 'missing');
        const splitTs = [gridImport.ts, gridExport.ts].filter((value) => typeof value === 'number');
        const rawNvpSkewMs = splitTs.length === 2 ? Math.abs(splitTs[0] - splitTs[1]) : null;
        const fresh = (info) => info.present && info.ageMs !== null && info.ageMs <= staleMs;
        const rawNvpCoherent = rawNvpMode === 'signed'
            ? fresh(signed)
            : (rawNvpMode === 'split'
                ? ((!gridImport.id || fresh(gridImport)) && (!gridExport.id || fresh(gridExport)) && (rawNvpSkewMs === null || rawNvpSkewMs <= maxSkewMs))
                : false);
        const centralNvp = this.adapter?._nvpFreshnessSnapshot && typeof this.adapter._nvpFreshnessSnapshot === 'object'
            ? this.adapter._nvpFreshnessSnapshot
            : null;
        const nvpMode = text(centralNvp?.mode) || rawNvpMode;
        const nvpStatus = text(centralNvp?.status) || (rawNvpCoherent ? 'ok' : 'stale');
        const nvpSource = text(centralNvp?.source) || rawNvpMode;
        const nvpCoherent = centralNvp ? centralNvp.coherent === true : rawNvpCoherent;
        const nvpSkewMs = centralNvp && Number.isFinite(Number(centralNvp.skewMs)) ? Number(centralNvp.skewMs) : rawNvpSkewMs;
        const measurementFreshness = {
            staleThresholdMs: staleMs,
            nvpMaxSkewMs: maxSkewMs,
            nvpSigned: signed,
            nvpImport: gridImport,
            nvpExport: gridExport,
            nvpConnected: connected,
            nvpHeartbeat: heartbeat,
            pv,
            buildingLoad: load,
            storageSoc,
            storagePower,
            note: 'Connected und Heartbeat werden getrennt vom Messwertalter ausgewiesen. Connected allein verlängert nichts; ein frischer Heartbeat bestätigt einen unveränderten Wert nur innerhalb der begrenzten Haltezeit.',
        };
        const warnings = [];
        const errors = [];
        if (duplicates.length)
            warnings.push(`${duplicates.length} Aktor-Doppelbelegung(en) erkannt.`);
        if (conflicts.length)
            errors.push(`${conflicts.length} statische Steuerkonflikt(e) erkannt.`);
        if (unresolvedShadowConflicts.length)
            errors.push(`${unresolvedShadowConflicts.length} nicht aufgelöste Laufzeit-Schreibkonflikt(e) erkannt.`);
        // Erfolgreich blockierte Safety-Konflikte sind ein Schutzereignis, aber kein
        // Fehlerzustand der Anlage. Sie bleiben separat diagnostizierbar und ziehen
        // die kompakte EMS-Überwachung nicht dauerhaft auf WARN.
        if (nvpMode === 'missing')
            errors.push('Kein NVP-Messdatenpunkt konfiguriert.');
        else if (centralNvp && centralNvp.usable !== true)
            errors.push(`NVP-Messung nicht nutzbar (${nvpStatus}).`);
        else if (!nvpCoherent)
            warnings.push(`NVP wird degradiert aber sicher aufgelöst (${nvpSource}).`);
        if (connected.id && connected.value === false)
            warnings.push('NVP-Gerät meldet connected=false.');
        if (heartbeat.id && (heartbeat.ageMs === null || heartbeat.ageMs > staleMs))
            warnings.push('NVP-Heartbeat ist veraltet.');
        const storageOverride = describeStorageOverride(this.adapter);
        if (storageOverride.explicitGlobalPower && String(storageOverride.resolvedSource).startsWith('storageFarm')) {
            errors.push('AppCenter-Speicher-Override wird unerwartet von der Farmquelle übersteuert.');
        }
        const status = errors.length ? 'error' : (warnings.length ? 'warn' : 'ok');
        const measurementIssueCount = warnings.filter((entry) => /NVP|Heartbeat|connected/i.test(entry)).length + errors.filter((entry) => /NVP|Mess/i.test(entry)).length;
        const summary = `${status.toUpperCase()} · NVP ${nvpStatus}/${nvpSource} · ${activeActuatorConflictCount} Aktorkonflikt(e) · Speicher ${storageOverride.mode}`;
        const snapshot = {
            ts: now,
            status,
            summary,
            mappedActuatorCount: mappings.length,
            uniqueActuatorCount: ownerMatrix.length,
            duplicateActuatorCount: duplicates.length,
            concurrentControlPathsCount: conflicts.length,
            activeActuatorConflictCount,
            shadowArbiter: shadow,
            actuatorArbiter: shadow,
            shadowWriteConflictCount: shadowConflicts.length,
            authorityActiveLeaseCount: Math.max(0, Number(shadow.activeAuthorityCount) || 0),
            authorityBlockedWriteCount: Math.max(0, Number(shadow.blockedWriteCount) || 0),
            authorityPreventedConflictCount: Math.max(0, Number(shadow.preventedConflictCount) || 0),
            authorityUnresolvedConflictCount: Math.max(0, Number(shadow.unresolvedConflictCount) || 0),
            authorityPreemptionCount: Math.max(0, Number(shadow.preemptionsTotal) || 0),
            ownerMatrix,
            duplicates,
            conflicts,
            nvp: {
                mode: nvpMode,
                status: nvpStatus,
                source: nvpSource,
                usable: centralNvp ? centralNvp.usable === true : nvpCoherent,
                coherent: nvpCoherent,
                maxSkewMs,
                skewMs: nvpSkewMs,
                signedAgeMs: centralNvp?.mode === 'signed' && Number.isFinite(Number(centralNvp.measurementAgeMs)) ? Number(centralNvp.measurementAgeMs) : signed.ageMs,
                importAgeMs: gridImport.ageMs,
                exportAgeMs: gridExport.ageMs,
                connected: centralNvp && typeof centralNvp.connected === 'boolean' ? centralNvp.connected : connected.value === true,
                connectedAgeMs: connected.ageMs,
                heartbeatAgeMs: centralNvp && Number.isFinite(Number(centralNvp.heartbeatAgeMs)) ? Number(centralNvp.heartbeatAgeMs) : heartbeat.ageMs,
                reason: text(centralNvp?.reason),
            },
            freshnessEnforced: true,
            measurementIssueCount,
            measurementFreshness,
            storageOverride,
            warnings,
            errors,
        };
        this.adapter._stageADiagnostics = snapshot;
        await Promise.all([
            this.setDiagnosticState('active', true),
            this.setDiagnosticState('lastRun', now),
            this.setDiagnosticState('status', status),
            this.setDiagnosticState('summary', summary),
            this.setDiagnosticState('mappedActuatorCount', mappings.length),
            this.setDiagnosticState('duplicateActuatorCount', duplicates.length),
            this.setDiagnosticState('concurrentControlPathsCount', conflicts.length),
            this.setDiagnosticState('activeActuatorConflictCount', activeActuatorConflictCount),
            this.setDiagnosticState('shadowArbiterMode', text(shadow.mode) || 'shadow'),
            this.setDiagnosticState('shadowObservedWriteCount', Math.max(0, Number(shadow.requestsTotal) || 0)),
            this.setDiagnosticState('shadowRecentWriteCount', Math.max(0, Number(shadow.recentWriteCount) || 0)),
            this.setDiagnosticState('shadowWriteConflictCount', shadowConflicts.length),
            this.setDiagnosticState('shadowWriteConflictsJson', JSON.stringify(shadowConflicts)),
            this.setDiagnosticState('shadowLastWriteJson', JSON.stringify(shadow.lastWrite || null)),
            this.setDiagnosticState('authorityActiveLeaseCount', Math.max(0, Number(shadow.activeAuthorityCount) || 0)),
            this.setDiagnosticState('authorityBlockedWriteCount', Math.max(0, Number(shadow.blockedWriteCount) || 0)),
            this.setDiagnosticState('authorityPreventedConflictCount', Math.max(0, Number(shadow.preventedConflictCount) || 0)),
            this.setDiagnosticState('authorityUnresolvedConflictCount', Math.max(0, Number(shadow.unresolvedConflictCount) || 0)),
            this.setDiagnosticState('authorityPreemptionCount', Math.max(0, Number(shadow.preemptionsTotal) || 0)),
            this.setDiagnosticState('authorityActiveJson', JSON.stringify(shadow.activeAuthorities || [])),
            this.setDiagnosticState('authorityBlockedWritesJson', JSON.stringify(shadow.blockedWrites || [])),
            this.setDiagnosticState('duplicateActuatorsJson', JSON.stringify(duplicates)),
            this.setDiagnosticState('ownerMatrixJson', JSON.stringify(ownerMatrix)),
            this.setDiagnosticState('concurrentControlPathsJson', JSON.stringify(conflicts)),
            this.setDiagnosticState('measurementFreshnessJson', JSON.stringify(measurementFreshness)),
            this.setDiagnosticState('nvpMode', nvpMode),
            this.setDiagnosticState('nvpStatus', nvpStatus),
            this.setDiagnosticState('nvpSource', nvpSource),
            this.setDiagnosticState('measurementIssueCount', measurementIssueCount),
            this.setDiagnosticState('nvpSignedAgeMs', signed.ageMs === null ? -1 : Math.round(signed.ageMs)),
            this.setDiagnosticState('nvpImportAgeMs', gridImport.ageMs === null ? -1 : Math.round(gridImport.ageMs)),
            this.setDiagnosticState('nvpExportAgeMs', gridExport.ageMs === null ? -1 : Math.round(gridExport.ageMs)),
            this.setDiagnosticState('nvpSkewMs', nvpSkewMs === null ? -1 : Math.round(nvpSkewMs)),
            this.setDiagnosticState('nvpCoherent', nvpCoherent),
            this.setDiagnosticState('nvpConnected', connected.value === true),
            this.setDiagnosticState('nvpConnectedAgeMs', connected.ageMs === null ? -1 : Math.round(connected.ageMs)),
            this.setDiagnosticState('nvpHeartbeatAgeMs', heartbeat.ageMs === null ? -1 : Math.round(heartbeat.ageMs)),
            this.setDiagnosticState('storageOverrideMode', storageOverride.mode),
            this.setDiagnosticState('storageOverrideJson', JSON.stringify(storageOverride)),
            this.setDiagnosticState('warningsJson', JSON.stringify(warnings)),
            this.setDiagnosticState('errorsJson', JSON.stringify(errors)),
        ]);
        const signature = JSON.stringify({ status, duplicates: duplicates.map((row) => row.objectId), conflicts: conflicts.map((row) => row.objectId), shadow: shadowConflicts.map((row) => [row.objectId, row.lastResolvedByArbiter]), blocked: Number(shadow.blockedWriteCount) || 0, nvpStatus, nvpSource, nvpCoherent });
        if (signature !== this._lastWarningSignature && status !== 'ok' && typeof this.adapter.log?.warn === 'function') {
            this._lastWarningSignature = signature;
            this.adapter.log.warn(`[Stufe A] ${summary}`);
        }
    }
}
module.exports = { StageADiagnosticsModule, collectActuatorMappings, buildOwnerMatrix, readForeignStateInfo, describeStorageOverride };
