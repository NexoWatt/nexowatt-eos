/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/modules/netoperator-interface.ts
 * Quell-Hash: sha256:a6d8285374ea4ce4d2eae93aea2671104a0c47e46b3294ab6ac830d3034d596f
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/modules/netoperator-interface.js.
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
 * Aufgabe: Verarbeitet Vorgaben einer Netzbetreiber-/Parkregler-Schnittstelle und übergibt autorisierte Anforderungen an die zentrale Begrenzung.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/modules/netoperator-interface.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetOperatorInterfaceModule = void 0;
const netoperator_canonical_model_1 = require("../services/netoperator-canonical-model");
const netoperator_driver_registry_1 = require("../services/netoperator-driver-registry");
const netoperator_modbus_tcp_1 = require("../services/netoperator-modbus-tcp");
function finite(value, fallback) {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === ''))
        return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}
function safeText(value) {
    return String(value === null || value === undefined ? '' : value).trim();
}
function deepEqual(a, b) {
    try {
        return JSON.stringify(a) === JSON.stringify(b);
    }
    catch (_error) {
        return false;
    }
}
function descriptorObjectId(descriptor) {
    return safeText(descriptor && descriptor.objectId);
}
function transformStateValue(value, descriptor) {
    let transformed = value;
    if (typeof transformed === 'number') {
        transformed = transformed * finite(descriptor.scale, 1) + finite(descriptor.offset, 0);
    }
    if (descriptor.bit !== undefined && typeof transformed === 'number') {
        transformed = ((Math.round(transformed) >> Number(descriptor.bit)) & 1) === 1;
    }
    if (descriptor.enumMap && Object.prototype.hasOwnProperty.call(descriptor.enumMap, String(transformed))) {
        transformed = descriptor.enumMap[String(transformed)];
    }
    return transformed;
}
class NetOperatorInterfaceModule {
    constructor(adapter, dpRegistry) {
        this.connector = null;
        this.connectorSignature = '';
        this.lastPollAt = 0;
        this.lastSnapshot = null;
        this.lastRaw = {};
        this.audit = [];
        this.lastCommand = null;
        this.lastReceivedAt = 0;
        this.lastValidAt = 0;
        this.adapter = adapter;
        this.dp = dpRegistry || null;
        this.registry = new netoperator_driver_registry_1.NetOperatorDriverRegistry();
    }
    config() {
        const cfg = this.adapter && this.adapter.config && this.adapter.config.netOperatorInterface;
        return cfg && typeof cfg === 'object' ? cfg : {};
    }
    /**
     * Der zertifizierte Regler wird nur dann zur führenden Export-Grenzquelle,
     * wenn App, Modul, Aktivmodus, Inbetriebnahme und Installerfreigabe gemeinsam
     * aktiv sind. Die Schnittstelle selbst bleibt read-only zum Regler; nur der
     * bestehende Grid-Constraints-/Export-Guard schreibt Anlagen-Sollwerte.
     */
    activation(cfg = this.config()) {
        const root = this.adapter && this.adapter.config && typeof this.adapter.config === 'object' ? this.adapter.config : {};
        const app = root?.emsApps?.apps?.netOperator;
        const gridCfg = root?.gridConstraints && typeof root.gridConstraints === 'object' ? root.gridConstraints : {};
        const appEnabled = app && typeof app === 'object'
            ? app.installed === true && app.enabled === true
            : (root.enableNetOperatorInterface === true || cfg.enabled === true);
        const exportGuardInstallerApproved = typeof gridCfg.exportLimitInstallerApproved === 'boolean'
            ? gridCfg.exportLimitInstallerApproved === true
            : typeof gridCfg.zeroExportInstallerApproved === 'boolean'
                ? gridCfg.zeroExportInstallerApproved === true
                : gridCfg.zeroExportEnabled === true;
        const exportGuardRunMode = safeText(gridCfg.exportLimitRunMode
            ?? gridCfg.zeroExportRunMode
            ?? gridCfg.exportGuardMode
            ?? 'active').toLowerCase();
        const exportGuardActive = gridCfg.zeroExportEnabled === true
            && exportGuardInstallerApproved
            && ['active', 'on', 'write', 'productive'].includes(exportGuardRunMode);
        const active = appEnabled
            && cfg.enabled === true
            && safeText(cfg.mode).toLowerCase() === 'active'
            && cfg.commissioned === true
            && cfg.installerApproved === true
            && exportGuardActive;
        return {
            appEnabled,
            interfaceEnabled: cfg.enabled === true,
            mode: safeText(cfg.mode || 'off').toLowerCase(),
            commissioned: cfg.commissioned === true,
            installerApproved: cfg.installerApproved === true,
            exportGuardEnabled: gridCfg.zeroExportEnabled === true,
            exportGuardInstallerApproved,
            exportGuardRunMode,
            exportGuardActive,
            active,
            operationEngineIntegration: active ? 'grid-export-limit-active' : 'grid-export-limit-standby',
        };
    }
    strictNonNegative(value) {
        if (value === null || value === undefined || (typeof value === 'string' && !value.trim()))
            return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    }
    allowedExportPowerW(snapshot) {
        const command = snapshot && snapshot.command ? snapshot.command : null;
        if (!snapshot || snapshot.valid !== true || !command)
            return null;
        if (command.action === 'trip' || command.action === 'inhibit')
            return 0;
        if (command.binding !== true || command.action !== 'active-power-constraint')
            return null;
        const pLimitKw = this.strictNonNegative((0, netoperator_canonical_model_1.canonicalValue)(snapshot, 'grid.p.limit_kw'));
        if (pLimitKw !== null)
            return Math.round(pLimitKw * 1000);
        // Kanonischer Vertrag: positive P-Zielwerte bedeuten Einspeisung am NAP.
        const pTargetKw = this.strictNonNegative((0, netoperator_canonical_model_1.canonicalValue)(snapshot, 'grid.p.target_kw'));
        if (pTargetKw !== null)
            return Math.round(pTargetKw * 1000);
        const pTargetPct = this.strictNonNegative((0, netoperator_canonical_model_1.canonicalValue)(snapshot, 'grid.p.target_pct'));
        if (pTargetPct !== null && pTargetPct <= 100) {
            const gridCfg = this.adapter?.config?.gridConstraints || {};
            const ratedCandidates = [gridCfg.pvRatedPowerW, gridCfg.pvInstalledPowerW, gridCfg.installedPvPowerW];
            for (const value of ratedCandidates) {
                const ratedPowerW = this.strictNonNegative(value);
                if (ratedPowerW !== null && ratedPowerW > 0)
                    return Math.round(ratedPowerW * pTargetPct / 100);
            }
        }
        return null;
    }
    fallbackExportPowerW() {
        const cfg = this.adapter?.config?.gridConstraints || {};
        const localCandidates = [cfg.exportLimitMaxFeedInW, cfg.zeroExportMaxExportW, cfg.maxFeedInPowerW, cfg.maxExportW, cfg.allowedFeedInW];
        let localMaxW = 0;
        for (const value of localCandidates) {
            const parsed = this.strictNonNegative(value);
            if (parsed !== null) {
                localMaxW = Math.round(parsed);
                break;
            }
        }
        const fallbackCandidates = [cfg.fallbackExportPowerW, cfg.externalFallbackExportPowerW];
        for (const value of fallbackCandidates) {
            const parsed = this.strictNonNegative(value);
            if (parsed !== null)
                return Math.min(localMaxW, Math.round(parsed));
        }
        return localMaxW;
    }
    envelopeQuality(snapshot) {
        if (!snapshot || snapshot.commOk !== true)
            return 'communication-error';
        if (snapshot.fresh !== true)
            return 'stale';
        if (snapshot.valid !== true)
            return 'invalid';
        if (snapshot.command?.binding !== true)
            return 'good-released';
        if (snapshot.command?.action === 'reactive-power-constraint')
            return 'good-no-active-power-limit';
        return 'good';
    }
    async ensureObject(id, name, type, role = 'state', unit = '') {
        const common = { name, type, role, read: true, write: false };
        if (unit)
            common.unit = unit;
        await this.adapter.setObjectNotExistsAsync(id, { type: 'state', common, native: {} });
    }
    async restoreAudit() {
        try {
            if (!this.adapter || typeof this.adapter.getStateAsync !== 'function')
                return;
            const state = await this.adapter.getStateAsync('netoperator.audit.eventsJson');
            if (!state || typeof state.val !== 'string' || !state.val.trim())
                return;
            const parsed = JSON.parse(state.val);
            if (!Array.isArray(parsed))
                return;
            this.audit = parsed.filter((entry) => entry && typeof entry === 'object').slice(-2000);
            const current = this.audit.length ? this.audit[this.audit.length - 1]?.current : null;
            this.lastCommand = current && typeof current === 'object' ? current : null;
        }
        catch (_error) {
            this.audit = [];
            this.lastCommand = null;
        }
    }
    async init() {
        this.registry.load();
        const channels = [
            'netoperator', 'netoperator.grid', 'netoperator.grid.command', 'netoperator.grid.p',
            'netoperator.grid.q', 'netoperator.grid.cosphi', 'netoperator.grid.mode', 'netoperator.pcc',
            'netoperator.pcc.p', 'netoperator.pcc.q', 'netoperator.pcc.u', 'netoperator.controller',
            'netoperator.eos', 'netoperator.audit', 'netoperator.driver', 'netoperator.diagnostics',
        ];
        for (const channel of channels) {
            await this.adapter.setObjectNotExistsAsync(channel, { type: 'channel', common: { name: channel }, native: {} });
        }
        await this.ensureObject('netoperator.enabled', 'Netzbetreiber-Schnittstelle aktiv', 'boolean', 'indicator');
        await this.ensureObject('netoperator.status', 'Status Netzbetreiber-Schnittstelle', 'string', 'text');
        await this.ensureObject('netoperator.mode', 'Betriebsmodus', 'string', 'text');
        await this.ensureObject('netoperator.transport', 'Aktiver Transport', 'string', 'text');
        await this.ensureObject('netoperator.readOnly', 'Read-only / keine Asset-Schreibbefehle', 'boolean', 'indicator');
        await this.ensureObject('netoperator.operationEngineIntegration', 'Operation-Engine-Integration', 'string', 'text');
        await this.ensureObject('netoperator.failSafePolicy', 'Dokumentierter Fail-Safe-Vertrag', 'string', 'text');
        await this.ensureObject('netoperator.externalExportLimitEligible', 'Zertifizierter Regler als Export-Grenzquelle freigegeben', 'boolean', 'indicator');
        await this.ensureObject('netoperator.allowedExportPowerW', 'Standardisierte extern erlaubte Einspeiseleistung', 'number', 'value.power', 'W');
        await this.ensureObject('netoperator.fallbackExportPowerW', 'Rückfallgrenze der Netzlimit-App', 'number', 'value.power', 'W');
        await this.ensureObject('netoperator.validUntil', 'Externe Vorgabe gültig bis', 'number', 'value.time', 'ms');
        await this.ensureObject('netoperator.source', 'Standardisierte Vorgabenquelle', 'string', 'text');
        await this.ensureObject('netoperator.quality', 'Standardisierte Vorgabenqualität', 'string', 'text');
        await this.ensureObject('netoperator.lastUpdate', 'Standardisierte letzte Aktualisierung', 'number', 'value.time', 'ms');
        await this.ensureObject('netoperator.commandBinding', 'Externe Vorgabe operativ bindend', 'boolean', 'indicator');
        await this.ensureObject('netoperator.commandPriority', 'Aktive Priorität', 'number', 'value');
        await this.ensureObject('netoperator.commandAction', 'Aktive Vorgabe', 'string', 'text');
        await this.ensureObject('netoperator.commandReason', 'Begründung', 'string', 'text');
        await this.ensureObject('netoperator.commandId', 'Command-ID', 'string', 'text');
        await this.ensureObject('netoperator.driver.id', 'Treiber-ID', 'string', 'text');
        await this.ensureObject('netoperator.driver.manufacturer', 'Hersteller', 'string', 'text');
        await this.ensureObject('netoperator.driver.model', 'Reglermodell', 'string', 'text');
        await this.ensureObject('netoperator.driver.mappingVersion', 'Mapping-Version', 'string', 'text');
        await this.ensureObject('netoperator.driver.ready', 'Treiber vollständig gemappt', 'boolean', 'indicator');
        await this.ensureObject('netoperator.driver.validationJson', 'Treiberprüfung JSON', 'string', 'json');
        await this.ensureObject('netoperator.diagnostics.latencyMs', 'Kommunikationslatenz', 'number', 'value.interval', 'ms');
        await this.ensureObject('netoperator.diagnostics.lastReceivedAt', 'Letztes empfangenes Telegramm', 'number', 'value.time', 'ms');
        await this.ensureObject('netoperator.diagnostics.lastValidAt', 'Letztes gültiges Telegramm', 'number', 'value.time', 'ms');
        await this.ensureObject('netoperator.diagnostics.lastError', 'Letzter Fehler', 'string', 'text');
        await this.ensureObject('netoperator.diagnostics.warningsJson', 'Kommunikationswarnungen JSON', 'string', 'json');
        await this.ensureObject('netoperator.diagnostics.rawJson', 'Rohwerte/Registersicht JSON', 'string', 'json');
        await this.ensureObject('netoperator.diagnostics.snapshotJson', 'Kanonischer Snapshot JSON', 'string', 'json');
        await this.ensureObject('netoperator.diagnostics.canonicalQualityJson', 'Qualität und Gültigkeit kanonischer Signale', 'string', 'json');
        await this.ensureObject('netoperator.audit.lastJson', 'Letztes Netzbetreiber-Ereignis', 'string', 'json');
        await this.ensureObject('netoperator.audit.eventsJson', 'Netzbetreiber-Ereignisse', 'string', 'json');
        for (const definition of Object.values(netoperator_canonical_model_1.CANONICAL_FIELDS)) {
            const type = definition.type === 'boolean' ? 'boolean' : definition.type === 'number' || definition.type === 'datetime' ? 'number' : 'string';
            const role = definition.type === 'boolean' ? 'indicator' : definition.type === 'number' ? 'value' : definition.type === 'datetime' ? 'value.time' : 'text';
            await this.ensureObject(`netoperator.${definition.key}`, definition.label, type, role, definition.unit || '');
        }
        await this.restoreAudit();
        this.adapter._netOperatorInterface = this;
    }
    closeConnector() {
        if (this.connector) {
            try {
                this.connector.close();
            }
            catch (_error) { /* ignore */ }
        }
        this.connector = null;
        this.connectorSignature = '';
    }
    stop() {
        this.closeConnector();
        if (this.adapter) {
            this.adapter._netOperatorEnvelope = null;
            if (this.adapter._netOperatorInterface === this)
                this.adapter._netOperatorInterface = null;
        }
    }
    async deactivate() {
        this.closeConnector();
        this.adapter._netOperatorEnvelope = null;
        await this.adapter.setStateAsync('netoperator.enabled', false, true);
        await this.adapter.setStateAsync('netoperator.status', 'disabled', true);
        await this.adapter.setStateAsync('netoperator.readOnly', true, true);
        await this.adapter.setStateAsync('netoperator.operationEngineIntegration', 'disabled', true);
        await this.adapter.setStateAsync('netoperator.externalExportLimitEligible', false, true);
        await this.adapter.setStateAsync('netoperator.allowedExportPowerW', -1, true);
        await this.adapter.setStateAsync('netoperator.validUntil', 0, true);
        await this.adapter.setStateAsync('netoperator.quality', 'disabled', true);
    }
    appendAudit(snapshot) {
        const command = snapshot.command;
        const allowedExportPowerW = this.allowedExportPowerW(snapshot);
        const current = {
            commandId: command.commandId,
            priority: command.priority,
            action: command.action,
            binding: command.binding,
            reason: command.reason,
            allowedExportPowerW,
            values: {
                enable: (0, netoperator_canonical_model_1.canonicalValue)(snapshot, 'grid.command.enable'),
                trip: (0, netoperator_canonical_model_1.canonicalValue)(snapshot, 'grid.command.trip'),
                release: (0, netoperator_canonical_model_1.canonicalValue)(snapshot, 'grid.command.release'),
                pLimitKw: (0, netoperator_canonical_model_1.canonicalValue)(snapshot, 'grid.p.limit_kw'),
                pTargetKw: (0, netoperator_canonical_model_1.canonicalValue)(snapshot, 'grid.p.target_kw'),
                pTargetPct: (0, netoperator_canonical_model_1.canonicalValue)(snapshot, 'grid.p.target_pct'),
                qTargetKvar: (0, netoperator_canonical_model_1.canonicalValue)(snapshot, 'grid.q.target_kvar'),
                cosPhi: (0, netoperator_canonical_model_1.canonicalValue)(snapshot, 'grid.cosphi.target'),
            },
        };
        if (this.lastCommand && deepEqual(this.lastCommand, current))
            return;
        const activation = this.activation();
        const event = {
            schema: 'nexowatt.netoperator-audit.v1',
            timestamp: Date.now(),
            source: snapshot.source,
            driverId: snapshot.driverId,
            mappingVersion: snapshot.mappingVersion,
            previous: this.lastCommand,
            current,
            reaction: activation.active ? 'export-limit-envelope-updated' : 'canonical-envelope-updated',
            result: !snapshot.valid
                ? 'rejected-invalid-or-stale'
                : activation.active
                    ? (snapshot.command.binding ? (allowedExportPowerW !== null || ['trip', 'inhibit'].includes(snapshot.command.action) ? 'accepted-for-export-guard' : 'accepted-no-active-power-limit') : 'released-to-local-eos-limit')
                    : 'accepted-diagnostic',
            operationEngineIntegration: activation.operationEngineIntegration,
        };
        this.lastCommand = event.current;
        this.audit.push(event);
        const limit = Math.max(20, Math.min(2000, Math.round(finite(this.config().auditLimit, 500))));
        this.audit = this.audit.slice(-limit);
        this.adapter.setStateAsync('netoperator.audit.lastJson', JSON.stringify(event), true).catch(() => undefined);
        this.adapter.setStateAsync('netoperator.audit.eventsJson', JSON.stringify(this.audit), true).catch(() => undefined);
    }
    async readStateDescriptor(descriptor) {
        const objectId = descriptorObjectId(descriptor);
        if (!objectId)
            throw new Error('state-object-id-missing');
        const state = await this.adapter.getForeignStateAsync(objectId);
        if (!state)
            throw new Error('state-missing');
        return { state, value: transformStateValue(state.val, descriptor), objectId };
    }
    async readStateMap(profile) {
        const startedAt = Date.now();
        const rawValues = {};
        const metadata = {};
        const raw = {};
        const requiredErrors = [];
        const optionalErrors = [];
        let successfulReads = 0;
        for (const [key, mapping] of Object.entries(profile.signals || {})) {
            if (mapping.access === 'write')
                continue;
            const objectId = descriptorObjectId(mapping);
            if (!objectId)
                continue;
            const required = mapping.required === true || netoperator_canonical_model_1.REQUIRED_READ_KEYS.includes(key);
            try {
                const primary = await this.readStateDescriptor(mapping);
                successfulReads += 1;
                let quality = Number(primary.state.q) > 0 ? 'bad' : 'good';
                let timestamp = Number(primary.state.ts) || Date.now();
                const detail = { objectId, value: primary.value, ack: primary.state.ack === true, ts: Number(primary.state.ts) || 0, q: primary.state.q ?? null };
                const qualityDescriptor = mapping.quality;
                if (qualityDescriptor && descriptorObjectId(qualityDescriptor)) {
                    const qualityRead = await this.readStateDescriptor(qualityDescriptor);
                    quality = Number(qualityRead.state.q) > 0 ? 'bad' : (0, netoperator_modbus_tcp_1.classifyQuality)(qualityRead.value, qualityDescriptor);
                    detail.quality = { objectId: qualityRead.objectId, value: qualityRead.value, classification: quality, ts: Number(qualityRead.state.ts) || 0, q: qualityRead.state.q ?? null };
                }
                if (mapping.timestamp && descriptorObjectId(mapping.timestamp)) {
                    const timestampRead = await this.readStateDescriptor(mapping.timestamp);
                    const parsed = (0, netoperator_canonical_model_1.strictTimestamp)(timestampRead.value);
                    if (parsed !== null)
                        timestamp = parsed;
                    else
                        quality = 'bad';
                    detail.timestamp = { objectId: timestampRead.objectId, value: timestampRead.value, parsed, ts: Number(timestampRead.state.ts) || 0, q: timestampRead.state.q ?? null };
                }
                rawValues[key] = primary.value;
                metadata[key] = { timestamp, quality, source: objectId, enumMap: mapping.enumMap };
                raw[key] = detail;
            }
            catch (error) {
                const message = `${key}:${error instanceof Error ? error.message : String(error)}`;
                (required ? requiredErrors : optionalErrors).push(message);
                metadata[key] = { timestamp: Date.now(), quality: 'bad', source: objectId, enumMap: mapping.enumMap };
            }
        }
        const transportOk = requiredErrors.length === 0 && successfulReads > 0;
        if (!Object.prototype.hasOwnProperty.call(rawValues, 'controller.comm_ok'))
            rawValues['controller.comm_ok'] = transportOk;
        return {
            ok: transportOk,
            rawValues,
            metadata,
            latencyMs: Date.now() - startedAt,
            error: requiredErrors.join(';'),
            warnings: optionalErrors,
            raw,
        };
    }
    connectorFor(cfg, profile) {
        const transport = cfg.transport || {};
        const signature = JSON.stringify({ id: profile.id, mappingVersion: profile.mappingVersion, host: transport.host, port: transport.port, unitId: transport.unitId, timeoutMs: transport.timeoutMs });
        if (!this.connector || signature !== this.connectorSignature) {
            this.closeConnector();
            this.connector = new netoperator_modbus_tcp_1.NetOperatorModbusTcpConnector({ host: safeText(transport.host), port: transport.port, unitId: transport.unitId, timeoutMs: transport.timeoutMs }, profile);
            this.connectorSignature = signature;
        }
        return this.connector;
    }
    async publish(snapshot, extra) {
        this.lastSnapshot = snapshot;
        this.lastRaw = extra.raw || {};
        if (extra.transportOk)
            this.lastReceivedAt = snapshot.receivedAt;
        if (snapshot.valid)
            this.lastValidAt = snapshot.receivedAt;
        const cfg = this.config();
        const activation = this.activation(cfg);
        const maxAgeMs = this.maxAgeMs(cfg, extra.profile);
        const controllerTimestamp = (0, netoperator_canonical_model_1.strictTimestamp)((0, netoperator_canonical_model_1.canonicalValue)(snapshot, 'controller.timestamp')) || snapshot.receivedAt;
        const lastUpdate = Math.max(0, Math.round(controllerTimestamp || snapshot.receivedAt || snapshot.generatedAt || Date.now()));
        const validUntil = lastUpdate + maxAgeMs;
        const source = safeText((0, netoperator_canonical_model_1.canonicalValue)(snapshot, 'controller.source') || snapshot.source || 'EZA-/Parkregler');
        const quality = this.envelopeQuality(snapshot);
        const allowedExportPowerW = this.allowedExportPowerW(snapshot);
        const fallbackExportPowerW = this.fallbackExportPowerW();
        const externalExportLimitEligible = activation.active;
        const operationalExportBinding = externalExportLimitEligible
            && snapshot.valid === true
            && snapshot.command.binding === true
            && (allowedExportPowerW !== null || ['trip', 'inhibit'].includes(snapshot.command.action));
        this.adapter._netOperatorEnvelope = {
            schema: 'nexowatt.netoperator-operation-envelope.v2',
            generatedAt: snapshot.generatedAt,
            receivedAt: snapshot.receivedAt,
            lastUpdate,
            validUntil,
            maxAgeMs,
            source,
            quality,
            valid: snapshot.valid,
            fresh: snapshot.fresh,
            commOk: snapshot.commOk,
            command: snapshot.command,
            values: Object.fromEntries(Object.entries(snapshot.values).map(([key, value]) => [key, value && value.valid ? value.value : null])),
            allowedExportPowerW,
            fallbackExportPowerW,
            certifiedControllerAuthority: true,
            externalExportLimitEligible,
            appEnabled: activation.appEnabled,
            active: activation.active,
            commissioned: activation.commissioned,
            installerApproved: activation.installerApproved,
            readOnly: true,
            hardwareWrite: false,
            soleAssetWriter: 'gridConstraints.exportGuard',
            operationEngineIntegration: activation.operationEngineIntegration,
            failSafePolicy: safeText(cfg.failSafePolicy || 'project-specific'),
            lastValidHoldSec: Math.max(0, Math.min(3600, Math.round(finite(cfg.lastValidHoldSec, 60)))),
        };
        await this.adapter.setStateAsync('netoperator.enabled', true, true);
        await this.adapter.setStateAsync('netoperator.status', extra.status, true);
        await this.adapter.setStateAsync('netoperator.mode', safeText(cfg.mode || 'diagnostic'), true);
        await this.adapter.setStateAsync('netoperator.transport', extra.transportType || '', true);
        await this.adapter.setStateAsync('netoperator.readOnly', true, true);
        await this.adapter.setStateAsync('netoperator.operationEngineIntegration', activation.operationEngineIntegration, true);
        await this.adapter.setStateAsync('netoperator.failSafePolicy', safeText(cfg.failSafePolicy || 'project-specific'), true);
        await this.adapter.setStateAsync('netoperator.externalExportLimitEligible', externalExportLimitEligible, true);
        await this.adapter.setStateAsync('netoperator.allowedExportPowerW', allowedExportPowerW === null ? -1 : allowedExportPowerW, true);
        await this.adapter.setStateAsync('netoperator.fallbackExportPowerW', fallbackExportPowerW, true);
        await this.adapter.setStateAsync('netoperator.validUntil', validUntil, true);
        await this.adapter.setStateAsync('netoperator.source', source, true);
        await this.adapter.setStateAsync('netoperator.quality', quality, true);
        await this.adapter.setStateAsync('netoperator.lastUpdate', lastUpdate, true);
        await this.adapter.setStateAsync('netoperator.commandBinding', operationalExportBinding, true);
        await this.adapter.setStateAsync('netoperator.commandPriority', snapshot.command.priority, true);
        await this.adapter.setStateAsync('netoperator.commandAction', snapshot.command.action, true);
        await this.adapter.setStateAsync('netoperator.commandReason', snapshot.valid ? snapshot.command.reason : `invalid:${snapshot.errors.join(',')}`, true);
        await this.adapter.setStateAsync('netoperator.commandId', snapshot.command.commandId, true);
        await this.adapter.setStateAsync('netoperator.driver.id', extra.profile?.id || '', true);
        await this.adapter.setStateAsync('netoperator.driver.manufacturer', extra.profile?.manufacturer || '', true);
        await this.adapter.setStateAsync('netoperator.driver.model', extra.profile?.model || '', true);
        await this.adapter.setStateAsync('netoperator.driver.mappingVersion', extra.profile?.mappingVersion || '', true);
        await this.adapter.setStateAsync('netoperator.driver.ready', extra.validation?.ready === true, true);
        await this.adapter.setStateAsync('netoperator.driver.validationJson', JSON.stringify(extra.validation || {}), true);
        await this.adapter.setStateAsync('netoperator.diagnostics.latencyMs', Math.round(extra.latencyMs || 0), true);
        await this.adapter.setStateAsync('netoperator.diagnostics.lastReceivedAt', this.lastReceivedAt, true);
        await this.adapter.setStateAsync('netoperator.diagnostics.lastValidAt', this.lastValidAt, true);
        await this.adapter.setStateAsync('netoperator.diagnostics.lastError', extra.error || snapshot.errors.join(';'), true);
        await this.adapter.setStateAsync('netoperator.diagnostics.warningsJson', JSON.stringify(extra.warnings || []), true);
        await this.adapter.setStateAsync('netoperator.diagnostics.rawJson', JSON.stringify(extra.raw || {}), true);
        await this.adapter.setStateAsync('netoperator.diagnostics.snapshotJson', JSON.stringify(snapshot), true);
        await this.adapter.setStateAsync('netoperator.diagnostics.canonicalQualityJson', JSON.stringify(Object.fromEntries(Object.entries(snapshot.values || {}).map(([key, entry]) => [key, {
                valid: entry?.valid === true,
                quality: entry?.quality || 'bad',
                timestamp: Number(entry?.timestamp) || 0,
                source: entry?.source || '',
                reason: entry?.reason || 'missing',
            }]))), true);
        // Ungültige/stale Werte werden niemals als physikalische 0 bzw. false
        // veröffentlicht. Der letzte gültige Roh-State bleibt stehen; Qualität und
        // Frische liegen separat im Snapshot. Der Export Guard darf ausschließlich
        // den validierten, aktiv freigegebenen Envelope verwenden; direkte Asset-
        // Schreibbefehle bleiben in diesem Modul verboten.
        for (const [key, definition] of Object.entries(netoperator_canonical_model_1.CANONICAL_FIELDS)) {
            if (definition.access !== 'read')
                continue;
            const entry = snapshot.values[key];
            if (!entry || entry.valid !== true)
                continue;
            const value = entry.value;
            if (definition.type === 'boolean' && typeof value === 'boolean')
                await this.adapter.setStateAsync(`netoperator.${key}`, value, true);
            else if ((definition.type === 'number' || definition.type === 'datetime') && typeof value === 'number')
                await this.adapter.setStateAsync(`netoperator.${key}`, value, true);
            else if (value !== null && value !== undefined)
                await this.adapter.setStateAsync(`netoperator.${key}`, String(value), true);
        }
        this.appendAudit(snapshot);
    }
    maxAgeMs(cfg, profile) {
        const configured = finite(cfg.signalMaxAgeSec, 5) * 1000;
        const profileValue = finite(profile?.watchdog?.maxAgeMs, configured);
        return Math.max(1000, Math.min(3600000, configured > 0 ? configured : profileValue));
    }
    async tick() {
        const cfg = this.config();
        if (cfg.enabled !== true || cfg.mode === 'off') {
            await this.deactivate();
            return;
        }
        this.registry.load();
        const resolved = this.registry.resolve(cfg);
        if (!resolved.profile || !resolved.validation.ok) {
            this.closeConnector();
            const snapshot = (0, netoperator_canonical_model_1.buildCanonicalSnapshot)({ commOk: false, source: 'profile', driverId: safeText(cfg.driverId), maxAgeMs: this.maxAgeMs(cfg, resolved.profile), errors: [resolved.error || 'driver-profile-invalid'] });
            await this.publish(snapshot, { status: 'mapping-required', profile: resolved.profile, validation: resolved.validation, transportType: safeText(cfg.transport?.type), transportOk: false, latencyMs: 0, error: resolved.error || 'driver-profile-invalid', warnings: [], raw: {} });
            return;
        }
        // Platzhalterprofile werden nicht zyklisch mit leeren Registeradressen
        // gepollt. Erst ein vollständig gemappter Treiber darf den Transport öffnen.
        if (!resolved.validation.ready) {
            this.closeConnector();
            const snapshot = (0, netoperator_canonical_model_1.buildCanonicalSnapshot)({
                commOk: false,
                source: `${resolved.profile.manufacturer}/${resolved.profile.model}`,
                driverId: resolved.profile.id,
                mappingVersion: resolved.profile.mappingVersion,
                maxAgeMs: this.maxAgeMs(cfg, resolved.profile),
                errors: ['driver-mapping-incomplete'],
            });
            await this.publish(snapshot, {
                status: 'mapping-required',
                profile: resolved.profile,
                validation: resolved.validation,
                transportType: safeText(cfg.transport?.type || resolved.profile.defaultProtocol),
                transportOk: false,
                latencyMs: 0,
                error: 'driver-mapping-incomplete',
                warnings: resolved.validation.warnings || [],
                raw: {},
            });
            return;
        }
        const pollIntervalMs = Math.max(250, Math.min(60000, Math.round(finite(cfg.transport?.pollIntervalMs, 1000))));
        if (this.lastSnapshot && Date.now() - this.lastPollAt < pollIntervalMs)
            return;
        this.lastPollAt = Date.now();
        const transportType = safeText(cfg.transport?.type || resolved.profile.defaultProtocol || 'modbus-tcp').toLowerCase();
        let pollResult;
        if (!resolved.profile.protocols.includes(transportType)) {
            this.closeConnector();
            pollResult = { ok: false, rawValues: {}, metadata: {}, latencyMs: 0, error: `transport-not-declared-by-profile:${transportType}`, warnings: [], raw: {} };
        }
        else if (transportType === 'state-map') {
            this.closeConnector();
            pollResult = await this.readStateMap(resolved.profile);
        }
        else if (transportType === 'modbus-tcp') {
            pollResult = await this.connectorFor(cfg, resolved.profile).poll();
        }
        else {
            this.closeConnector();
            pollResult = { ok: false, rawValues: {}, metadata: {}, latencyMs: 0, error: `transport-not-implemented:${transportType}`, warnings: [], raw: {} };
        }
        const snapshot = (0, netoperator_canonical_model_1.buildCanonicalSnapshot)({
            rawValues: pollResult.rawValues,
            metadata: pollResult.metadata,
            receivedAt: Date.now(),
            maxAgeMs: this.maxAgeMs(cfg, resolved.profile),
            commOk: pollResult.ok,
            source: `${resolved.profile.manufacturer}/${resolved.profile.model}`,
            driverId: resolved.profile.id,
            mappingVersion: resolved.profile.mappingVersion,
            errors: pollResult.error ? [pollResult.error] : [],
        });
        const status = !pollResult.ok
            ? 'communication-error'
            : !snapshot.fresh
                ? 'stale'
                : snapshot.valid
                    ? (this.activation(cfg).active ? 'ready-active-grid-export-limit' : 'ready-diagnostic')
                    : 'invalid-canonical-data';
        await this.publish(snapshot, {
            status,
            profile: resolved.profile,
            validation: resolved.validation,
            transportType,
            transportOk: pollResult.ok,
            latencyMs: pollResult.latencyMs,
            error: pollResult.error,
            warnings: pollResult.warnings || [],
            raw: pollResult.raw,
        });
    }
    getPublicStatus() {
        return {
            ok: true,
            schema: 'nexowatt.netoperator-status-api.v1',
            generatedAt: Date.now(),
            enabled: this.config().enabled === true,
            mode: this.config().mode || 'off',
            readOnly: true,
            hardwareWrite: false,
            soleAssetWriter: 'gridConstraints.exportGuard',
            certifiedControllerAuthority: true,
            externalExportLimitEligible: this.activation().active,
            operationEngineIntegration: this.activation().operationEngineIntegration,
            envelope: this.adapter?._netOperatorEnvelope || null,
            lastReceivedAt: this.lastReceivedAt,
            lastValidAt: this.lastValidAt,
            snapshot: this.lastSnapshot,
            audit: this.audit.slice(-50),
            driverProfiles: this.registry.list(),
        };
    }
    getRawDiagnostics() {
        return {
            ok: true,
            schema: 'nexowatt.netoperator-service-diagnostics.v1',
            generatedAt: Date.now(),
            config: {
                ...this.config(),
                customProfileJson: this.config().customProfileJson ? '[configured]' : '',
                writebackEnabled: false,
            },
            registryDiagnostics: this.registry.getDiagnostics(),
            lastReceivedAt: this.lastReceivedAt,
            lastValidAt: this.lastValidAt,
            raw: this.lastRaw,
            snapshot: this.lastSnapshot,
            audit: this.audit.slice(-200),
            readOnly: true,
            hardwareWrite: false,
            soleAssetWriter: 'gridConstraints.exportGuard',
            externalExportLimitEligible: this.activation().active,
            operationEngineIntegration: this.activation().operationEngineIntegration,
            envelope: this.adapter?._netOperatorEnvelope || null,
        };
    }
    async testConnection(configOverride) {
        const cfg = configOverride && typeof configOverride === 'object' ? configOverride : this.config();
        this.registry.load();
        const resolved = this.registry.resolve(cfg);
        if (!resolved.profile || !resolved.validation.ok)
            return { ok: false, error: resolved.error || 'driver-profile-invalid', validation: resolved.validation };
        const transportType = safeText(cfg.transport?.type || resolved.profile.defaultProtocol || 'modbus-tcp').toLowerCase();
        let result;
        if (!resolved.profile.protocols.includes(transportType)) {
            result = { ok: false, error: `transport-not-declared-by-profile:${transportType}`, latencyMs: 0, rawValues: {}, metadata: {}, warnings: [], raw: {} };
        }
        else if (transportType === 'state-map') {
            result = await this.readStateMap(resolved.profile);
        }
        else if (transportType === 'modbus-tcp') {
            const transport = cfg.transport || {};
            const connector = new netoperator_modbus_tcp_1.NetOperatorModbusTcpConnector({ host: safeText(transport.host), port: transport.port, unitId: transport.unitId, timeoutMs: transport.timeoutMs }, resolved.profile);
            try {
                result = await connector.poll();
            }
            finally {
                connector.close();
            }
        }
        else {
            result = { ok: false, error: `transport-not-implemented:${transportType}`, latencyMs: 0, rawValues: {}, metadata: {}, warnings: [], raw: {} };
        }
        return {
            ok: result.ok,
            error: result.error || '',
            warnings: result.warnings || [],
            latencyMs: result.latencyMs || 0,
            validation: resolved.validation,
            profile: { id: resolved.profile.id, manufacturer: resolved.profile.manufacturer, model: resolved.profile.model, mappingVersion: resolved.profile.mappingVersion },
            mappedValues: Object.keys(result.rawValues || {}).length,
            readOnly: true,
            hardwareWrite: false,
        };
    }
}
exports.NetOperatorInterfaceModule = NetOperatorInterfaceModule;
