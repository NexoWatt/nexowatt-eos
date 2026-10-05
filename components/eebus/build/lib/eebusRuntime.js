"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EebusRuntime = void 0;
const discoveryService_1 = require("./discoveryService");
const shipEndpoint_1 = require("./shipEndpoint");
const spineParser_1 = require("./spineParser");
const sanitizer_1 = require("./sanitizer");
const spineMapper_1 = require("./spineMapper");
const clsControlParser_1 = require("./clsControlParser");
const nexowattBridge_1 = require("./nexowattBridge");
const useCaseRegistry_1 = require("./useCaseRegistry");
class EebusRuntime {
    adapter;
    config;
    identity;
    objectFactory;
    nodes = new Map();
    discovery;
    endpoint;
    measurementInterval;
    metadataInterval;
    clsSupervisorInterval;
    msgCounter = 1;
    autoAcceptNewDevices;
    clsParser = new clsControlParser_1.ClsControlParser();
    clsSources = new Map();
    trustCache = new Map();
    bridge;
    controlEpoch = 0;
    constructor(adapter, config, identity, objectFactory) {
        this.adapter = adapter;
        this.config = config;
        this.identity = identity;
        this.objectFactory = objectFactory;
        this.autoAcceptNewDevices = config.autoAcceptNewDevices;
    }
    assertLicensed() {
        if (this.adapter.isEosLicenseAllowed?.() !== true)
            throw new Error('EOS_LICENSE_REQUIRED');
    }
    async start() {
        this.assertLicensed();
        this.endpoint = new shipEndpoint_1.ShipEndpoint(this.adapter, { ...this.config, autoAcceptNewDevices: this.autoAcceptNewDevices }, this.identity, async (deviceId, message) => this.handleIncomingMessage(deviceId, message), async (node) => this.handleDiscoveredNode(node), async (deviceId, state, role, connected, error) => this.handleConnectionState(deviceId, state, role, connected, error), async (deviceId) => this.handleDataExchangeReady(deviceId), async (deviceId, request) => this.handlePairingRequest(deviceId, request), async (deviceId) => this.isTrusted(deviceId), async (deviceId, pinState) => {
            await this.adapter.setStateAsync(`devices.${(0, sanitizer_1.safeId)(deviceId)}.pairing.pinState`, { val: pinState, ack: true });
        });
        const endpointStarted = await this.endpoint.start();
        this.bridge = new nexowattBridge_1.NexoWattPara14aBridge(this.adapter, this.config, async (feedback, context) => this.handleBridgeImplementation(feedback, context));
        await this.bridge.start();
        this.discovery = new discoveryService_1.DiscoveryService(this.adapter, this.config, async (node) => this.handleDiscoveredNode(node));
        this.discovery.start();
        this.measurementInterval = this.adapter.setInterval(() => void this.refreshMeasurements(), this.config.measurementIntervalSec * 1000);
        this.metadataInterval = this.adapter.setInterval(() => void this.refreshMetadata(), this.config.metadataIntervalSec * 1000);
        this.clsSupervisorInterval = this.adapter.setInterval(() => void this.superviseClsSources(), 500);
        await this.adapter.setStateAsync('info.connection', { val: endpointStarted || this.config.discoveryEnabled, ack: true });
        await this.adapter.setStateAsync('identity.announcementActive', {
            val: endpointStarted && this.config.announceShipService,
            ack: true,
        });
        await this.adapter.setStateAsync('discovery.enabled', { val: this.config.discoveryEnabled, ack: true });
        await this.adapter.setStateAsync('pairing.autoAcceptNewDevices', { val: this.autoAcceptNewDevices, ack: true });
    }
    suspendControl() {
        this.controlEpoch++;
        // Never replay an old LPC, expiry release or failsafe after reactivation.
        // Existing equipment limits stay unchanged until a fresh licensed command.
        for (const source of this.clsSources.values()) {
            source.lastCommand = undefined;
            source.lastRegularCommand = undefined;
        }
    }
    async stop() {
        if (this.measurementInterval) {
            this.adapter.clearInterval(this.measurementInterval);
            this.measurementInterval = undefined;
        }
        if (this.metadataInterval) {
            this.adapter.clearInterval(this.metadataInterval);
            this.metadataInterval = undefined;
        }
        if (this.clsSupervisorInterval) {
            this.adapter.clearInterval(this.clsSupervisorInterval);
            this.clsSupervisorInterval = undefined;
        }
        this.discovery?.stop();
        this.discovery = undefined;
        await this.bridge?.stop();
        this.bridge = undefined;
        await this.endpoint?.stop();
        this.endpoint = undefined;
        await this.adapter.setStateAsync('identity.announcementActive', { val: false, ack: true });
        await this.adapter.setStateAsync('info.connection', { val: false, ack: true });
    }
    async handleMessage(obj) {
        const command = String(obj?.command || '');
        const result = await this.bridge?.handleMessage(command, obj?.message, String(obj?.from || ''))
            ?? { handled: false, accepted: false, error: 'Bridge is not initialized.' };
        if (obj?.callback) {
            this.adapter.sendTo(obj.from, obj.command, {
                accepted: result.accepted === true,
                handled: result.handled === true,
                error: String(result.error || ''),
            }, obj.callback);
        }
    }
    async handleStateChange(id, state) {
        if (!state || state.ack)
            return;
        this.assertLicensed();
        if (id.endsWith('.pairing.autoAcceptNewDevices')) {
            this.autoAcceptNewDevices = Boolean(state.val);
            if (this.autoAcceptNewDevices) {
                for (const deviceId of this.nodes.keys())
                    this.trustCache.set(deviceId, true);
            }
            else {
                this.trustCache.clear();
            }
            await this.adapter.setStateAsync('pairing.autoAcceptNewDevices', { val: this.autoAcceptNewDevices, ack: true });
            this.adapter.log.warn(`Global EEBUS auto-accept for new devices is now ${this.autoAcceptNewDevices ? 'enabled' : 'disabled'}. ` +
                'Use only during field tests and switch it off for production.');
            return;
        }
        const command = this.parseCommand(id, state.val);
        if (!command)
            return;
        await this.processCommand(command);
    }
    async processCommand(command) {
        this.assertLicensed();
        if (command.channel === 'control' && command.stateName === 'connect') {
            if (Boolean(command.value))
                await this.connectDevice(command.deviceId);
            await this.adapter.setStateAsync(`devices.${command.deviceId}.control.connect`, { val: false, ack: true });
            return;
        }
        if (command.channel === 'control' && command.stateName === 'disconnect') {
            if (Boolean(command.value))
                this.endpoint?.disconnect(command.deviceId);
            await this.adapter.setStateAsync(`devices.${command.deviceId}.control.disconnect`, { val: false, ack: true });
            return;
        }
        if (command.channel === 'control' && command.stateName === 'refreshNodeManagement') {
            if (Boolean(command.value))
                await this.requestNodeManagement(command.deviceId);
            await this.adapter.setStateAsync(`devices.${command.deviceId}.control.refreshNodeManagement`, { val: false, ack: true });
            return;
        }
        if (command.channel === 'pairing' && ['trusted', 'approve', 'reject'].includes(command.stateName)) {
            const trusted = command.stateName === 'reject' ? false : Boolean(command.value);
            this.trustCache.set(command.deviceId, trusted);
            await this.objectFactory.publishTrust(command.deviceId, trusted, command.stateName === 'approve' ? 'local-approve-button' : 'local-user');
            this.assertLicensed();
            if (trusted) {
                await this.endpoint?.approveDevice(command.deviceId);
            }
            else {
                this.endpoint?.rejectDevice(command.deviceId);
            }
            await this.adapter.setStateAsync(`devices.${command.deviceId}.pairing.approve`, { val: false, ack: true });
            await this.adapter.setStateAsync(`devices.${command.deviceId}.pairing.reject`, { val: false, ack: true });
            await this.objectFactory.publishGlobalPairingCounts(Array.from(this.nodes.keys()));
            return;
        }
        const node = this.nodes.get(command.deviceId);
        const commandDraft = (0, spineMapper_1.mapCommandToSpineDraft)(command, this.identity, node?.id, this.nextMsgCounter());
        const commandStateId = `devices.${command.deviceId}.raw.lastCommand`;
        await this.adapter.setStateAsync(commandStateId, { val: (0, sanitizer_1.jsonStringifySafe)(commandDraft), ack: true });
        const trusted = await this.isTrusted(command.deviceId);
        if (!trusted && !this.config.allowCommandsToUntrustedDevices) {
            const msg = 'Command not sent because the device is not trusted. Set pairing.trusted first or enable allowCommandsToUntrustedDevices.';
            this.adapter.log.warn(`${command.deviceId}: ${msg}`);
            await this.adapter.setStateAsync(`devices.${command.deviceId}.raw.lastError`, { val: msg, ack: true });
            return;
        }
        if (this.config.commandDryRun) {
            const msg = 'Command dry run is enabled. Field-test SPINE command was recorded but not sent.';
            this.adapter.log.info(`${command.deviceId}: ${msg}`);
            await this.adapter.setStateAsync(`devices.${command.deviceId}.raw.lastError`, { val: msg, ack: true });
            return;
        }
        this.assertLicensed(); // Recheck after asynchronous DB/trust work, immediately before the device write.
        const payload = commandDraft.datagram || commandDraft;
        const sent = this.endpoint?.sendSpine(command.deviceId, payload) || false;
        if (!sent) {
            const msg = 'No active SHIP data-exchange session for this device. Command was not sent.';
            this.adapter.log.warn(`${command.deviceId}: ${msg}`);
            await this.adapter.setStateAsync(`devices.${command.deviceId}.raw.lastError`, { val: msg, ack: true });
            return;
        }
        await this.adapter.setStateAsync(`devices.${command.deviceId}.${command.channel}.${command.stateName}`, {
            val: command.value,
            ack: true,
        });
    }
    async handleDiscoveredNode(node) {
        if (this.isLocalNode(node))
            return;
        node.deviceClass = node.deviceClass || (0, useCaseRegistry_1.classifyFromDiscovery)(node);
        this.nodes.set(node.safeId, node);
        await this.objectFactory.publishDiscovery(node);
        await this.adapter.setStateAsync('discovery.discoveredCount', { val: this.nodes.size, ack: true });
        await this.adapter.setStateAsync('discovery.lastDiscovery', { val: (0, sanitizer_1.jsonStringifySafe)(node), ack: true });
        await this.objectFactory.publishGlobalPairingCounts(Array.from(this.nodes.keys()));
        if (this.adapter.isEosLicenseAllowed?.() === true && this.config.autoConnectEnabled && node.serviceType !== 'incoming') {
            void this.connectDevice(node.safeId).catch(() => {
                this.adapter.log.warn('EEBUS automatic connection skipped: no current permission or connection failed.');
            });
        }
    }
    async connectDevice(deviceId) {
        this.assertLicensed();
        const node = this.nodes.get(deviceId);
        if (!node) {
            await this.adapter.setStateAsync(`devices.${deviceId}.connection.lastError`, { val: 'Device is unknown or has no mDNS target.', ack: true });
            return;
        }
        await this.endpoint?.connectToNode(node);
    }
    async handleConnectionState(deviceId, state, role, connected, error = '') {
        await this.objectFactory.publishConnectionState(deviceId, state, role, connected, error);
        if (state === 'data-exchange')
            await this.adapter.setStateAsync(`devices.${deviceId}.pairing.pairingState`, { val: 'paired-data-exchange', ack: true });
    }
    async handlePairingRequest(deviceId, request) {
        await this.objectFactory.publishPairingRequest(deviceId, request);
        if (this.autoAcceptNewDevices) {
            this.trustCache.set(deviceId, true);
            await this.objectFactory.publishTrust(deviceId, true, 'auto-accept-field-test');
            await this.endpoint?.approveDevice(deviceId);
        }
        await this.objectFactory.publishGlobalPairingCounts(Array.from(this.nodes.keys()));
    }
    async handleDataExchangeReady(deviceId) {
        // Prime the trust decision before the first time-critical CLS write arrives.
        // The control path can then use the in-memory cache without an object DB read.
        if (!this.trustCache.has(deviceId)) {
            if (this.autoAcceptNewDevices)
                this.trustCache.set(deviceId, true);
            else {
                const trustedState = await this.adapter.getStateAsync(`devices.${deviceId}.pairing.trusted`);
                this.trustCache.set(deviceId, Boolean(trustedState?.val));
            }
        }
        await this.adapter.setStateAsync(`devices.${deviceId}.pairing.pairingState`, { val: 'paired-data-exchange', ack: true });
        if (this.config.spineDiscoveryEnabled)
            await this.requestNodeManagement(deviceId);
    }
    async requestNodeManagement(deviceId) {
        const node = this.nodes.get(deviceId);
        if (!node)
            return;
        const datagram = (0, spineMapper_1.buildNodeManagementDetailedDiscoveryRequest)(this.identity, node.id, this.nextMsgCounter());
        await this.adapter.setStateAsync(`devices.${deviceId}.raw.lastCommand`, { val: (0, sanitizer_1.jsonStringifySafe)(datagram), ack: true });
        // NodeManagement discovery is read-only and required to identify device classes/use cases during field tests.
        // commandDryRun only blocks write/control commands, not this read request.
        const sent = this.endpoint?.sendSpine(deviceId, datagram) || false;
        if (!sent) {
            await this.adapter.setStateAsync(`devices.${deviceId}.raw.lastError`, {
                val: 'Could not send NodeManagement discovery request because no SHIP data-exchange session is active.',
                ack: true,
            });
        }
    }
    async handleIncomingMessage(deviceId, message) {
        const safeDeviceId = (0, sanitizer_1.safeId)(deviceId);
        // Creating ioBroker objects is diagnostic work and must not delay an LPC
        // command. ensureIncomingDevice inserts the in-memory node before its first
        // await, so the control parser can continue immediately.
        this.background(this.ensureIncomingDevice(safeDeviceId));
        const messageRecord = message && typeof message === 'object' ? message : {};
        if (messageRecord.pinState?.pinState) {
            this.background(this.adapter.setStateAsync(`devices.${safeDeviceId}.pairing.pinState`, {
                val: String(messageRecord.pinState.pinState),
                ack: true,
            }));
            return;
        }
        const maybeFrame = messageRecord.shipFrame;
        if (maybeFrame) {
            this.background(this.adapter.setStateAsync(`devices.${safeDeviceId}.raw.lastShipFrame`, {
                val: (0, sanitizer_1.jsonStringifySafe)(maybeFrame),
                ack: true,
            }));
            return;
        }
        const nowMs = Date.now();
        const nowIso = new Date(nowMs).toISOString();
        const currentNode = this.nodes.get(safeDeviceId);
        if (currentNode)
            currentNode.lastSeen = nowIso;
        // The CLS parser and direct EOS dispatch are deliberately first. Raw frame,
        // metadata and generic measurement states are written afterwards so slow
        // object/state backends cannot extend the local control reaction time.
        const clsEvents = this.clsParser.parse(message, {
            deviceId: safeDeviceId,
            sourceSki: currentNode?.ski || '',
            receivedAtMs: nowMs,
        });
        for (const event of clsEvents)
            await this.processClsEvent(safeDeviceId, event);
        this.background(this.adapter.setStateAsync(`devices.${safeDeviceId}.info.lastSeen`, {
            val: nowIso,
            ack: true,
        }));
        this.background(this.adapter.setStateAsync(`devices.${safeDeviceId}.raw.lastDataPayload`, {
            val: (0, sanitizer_1.jsonStringifySafe)(message),
            ack: true,
        }));
        if (this.config.debugRawMessages) {
            this.background(this.adapter.setStateAsync(`devices.${safeDeviceId}.raw.lastMessage`, {
                val: (0, sanitizer_1.jsonStringifySafe)(message),
                ack: true,
            }));
        }
        // Generic SPINE analysis is useful for device integration, but is outside
        // the time-critical IF_CLS_CTRL path.
        this.background(this.publishGenericSpineAnalysis(safeDeviceId, message));
    }
    async publishGenericSpineAnalysis(deviceId, message) {
        const fallbackClass = (this.nodes.get(deviceId)?.deviceClass || 'unknown');
        const analysis = (0, spineParser_1.analyzeSpineMessage)(message, fallbackClass);
        if (analysis.rawPayload) {
            await this.adapter.setStateAsync(`devices.${deviceId}.raw.lastSpineFrame`, {
                val: (0, sanitizer_1.jsonStringifySafe)(analysis.rawPayload),
                ack: true,
            });
        }
        if (analysis.featureSummary) {
            const node = this.nodes.get(deviceId);
            if (node)
                node.deviceClass = analysis.featureSummary.deviceClass;
            await this.objectFactory.publishFeatureSummary(deviceId, analysis.featureSummary);
        }
        for (const update of analysis.measurementUpdates) {
            await this.objectFactory.publishMeasurement(deviceId, update.stateId, update.value);
        }
    }
    getClsState(deviceId) {
        let state = this.clsSources.get(deviceId);
        if (!state) {
            state = {
                deviceId,
                lastHeartbeatAtMs: null,
                heartbeatTimeoutMs: this.config.clsHeartbeatTimeoutSec * 1000,
                failsafeLimitW: null,
                failsafeDurationMs: null,
                failsafeActive: false,
                failsafeActivatedAtMs: 0,
                failsafeExpiredForCommandId: '',
                failsafeRecoveryNoticeAtMs: 0,
                transitionInFlight: false,
                expiryReleasedForCommandId: '',
                lastHeartbeatDiagAtMs: 0,
            };
            this.clsSources.set(deviceId, state);
        }
        return state;
    }
    async processClsEvent(deviceId, incomingCommand) {
        // Auch Heartbeat- und Failsafe-Metadaten dürfen ausschließlich von einem
        // bereits vertrauten SHIP-Peer in den wirksamen CLS-Zustand gelangen. Der
        // Trust-Status liegt nach dem SHIP-Hello normalerweise im Cache und erzeugt
        // daher im LPC-Schnellpfad keinen zusätzlichen State-I/O.
        const peerTrusted = this.config.allowCommandsToUntrustedDevices || await this.isTrusted(deviceId);
        if (!peerTrusted) {
            const reason = 'CLS message rejected because the EEBUS peer is not trusted.';
            if (incomingCommand.correlation.ackRequest
                && (incomingCommand.operation === 'limitConsumption' || incomingCommand.operation === 'release')) {
                this.sendClsResult(deviceId, incomingCommand, 7, reason);
            }
            this.background(this.publishClsOutcome(deviceId, incomingCommand, false, Date.now(), reason));
            return;
        }
        const source = this.getClsState(deviceId);
        const heartbeatAtMs = finiteNumberOrNull(incomingCommand.heartbeatAtMs);
        const heartbeatTimeoutMs = finiteNumberOrNull(incomingCommand.heartbeatTimeoutMs);
        const failsafeLimitW = finiteNumberOrNull(incomingCommand.failsafeLimitW);
        const failsafeDurationMs = finiteNumberOrNull(incomingCommand.failsafeDurationMs);
        if (heartbeatAtMs !== null && heartbeatAtMs > 0) {
            source.lastHeartbeatAtMs = heartbeatAtMs;
        }
        if (heartbeatTimeoutMs !== null && heartbeatTimeoutMs > 0) {
            source.heartbeatTimeoutMs = Math.max(1000, heartbeatTimeoutMs);
        }
        if (failsafeLimitW !== null && failsafeLimitW > 0) {
            source.failsafeLimitW = failsafeLimitW;
        }
        if (failsafeDurationMs !== null && failsafeDurationMs >= 0) {
            source.failsafeDurationMs = failsafeDurationMs;
        }
        this.background(this.publishClsCommand(deviceId, incomingCommand));
        if (incomingCommand.operation === 'heartbeat') {
            source.lastHeartbeatAtMs = incomingCommand.heartbeatAtMs || incomingCommand.receivedAtMs;
            this.background(this.publishHeartbeatDiagnostics(source, Date.now(), true));
            return;
        }
        if (incomingCommand.operation === 'failsafeConfiguration')
            return;
        // writePartial may identify an already active limit without repeating its
        // numeric value. Merge only with the last EOS-accepted active command from
        // the same trusted peer; never interpret a missing value as a release.
        let command = incomingCommand;
        if (incomingCommand.active && finiteNumberOrNull(incomingCommand.limitW) === null) {
            const previous = source.lastRegularCommand;
            const previousLimitW = finiteNumberOrNull(previous?.limitW);
            if (previous?.active && previousLimitW !== null && previousLimitW > 0) {
                command = this.cloneClsCommand(incomingCommand, {
                    limitW: previousLimitW,
                    rawSummary: {
                        ...incomingCommand.rawSummary,
                        mergedPartialValueFromCommandId: previous.commandId,
                    },
                });
            }
        }
        let rejectionReason = '';
        const commandLimitW = finiteNumberOrNull(command.limitW);
        if (this.adapter.isEosLicenseAllowed?.() !== true) {
            rejectionReason = 'EOS_LICENSE_REQUIRED';
        }
        else if (!this.config.autoApplyClsLimits) {
            rejectionReason = 'Automatic application of CLS limits is disabled.';
        }
        else if (command.active && (commandLimitW === null || commandLimitW <= 0)) {
            rejectionReason = 'Active CLS command has no valid positive consumption limit and no accepted value to merge.';
        }
        else if (!this.bridge) {
            rejectionReason = 'NexoWatt direct §14a bridge is not initialized.';
        }
        if (rejectionReason) {
            if (command.correlation.ackRequest)
                this.sendClsResult(deviceId, command, 7, rejectionReason);
            this.background(this.publishClsOutcome(deviceId, command, false, Date.now(), rejectionReason));
            return;
        }
        const controlEpoch = this.controlEpoch;
        const acceptance = await this.bridge.dispatchLimit(command, command.active ? 'lpc' : 'release');
        const acceptedAtMs = Number(acceptance.acceptedAtMs) || Date.now();
        if (acceptance.accepted && controlEpoch === this.controlEpoch && this.adapter.isEosLicenseAllowed?.() === true) {
            source.lastCommand = command;
            source.lastRegularCommand = command;
            source.expiryReleasedForCommandId = '';
            // A fresh explicit LPC write is authoritative and ends a locally held
            // failsafe. Heartbeat recovery alone never increases the allowance.
            source.failsafeActive = false;
            source.failsafeActivatedAtMs = 0;
            source.failsafeExpiredForCommandId = '';
            source.failsafeRecoveryNoticeAtMs = 0;
            this.background(this.adapter.setStateAsync('cls.failsafeActive', { val: false, ack: true }));
            this.background(this.adapter.setStateAsync(`devices.${deviceId}.cls.failsafeActive`, { val: false, ack: true }));
        }
        // A rejected command receives an immediate correlated SPINE error result.
        // A positive result is intentionally withheld until EOS has completed the
        // central §14a cycle and the downstream controller/write path has succeeded.
        if (command.correlation.ackRequest && !acceptance.accepted) {
            this.sendClsResult(deviceId, command, 7, String(acceptance.error || acceptance.reason || 'EOS rejected command'));
        }
        this.background(this.publishClsOutcome(deviceId, command, acceptance.accepted === true, acceptedAtMs, String(acceptance.error || acceptance.reason || '')));
    }
    async publishClsOutcome(deviceId, command, accepted, acceptedAtMs, error) {
        const reactionMs = Math.max(0, acceptedAtMs - command.receivedAtMs);
        await this.adapter.setStateAsync(`devices.${deviceId}.cls.acceptedAt`, { val: acceptedAtMs, ack: true });
        await this.adapter.setStateAsync(`devices.${deviceId}.cls.reactionMs`, { val: reactionMs, ack: true });
        await this.adapter.setStateAsync(`devices.${deviceId}.cls.status`, {
            val: accepted ? 'accepted-awaiting-control-cycle' : 'rejected-by-eos',
            ack: true,
        });
        await this.adapter.setStateAsync(`devices.${deviceId}.cls.lastError`, {
            val: accepted ? '' : error,
            ack: true,
        });
    }
    async publishClsCommand(deviceId, command) {
        if (command.operation === 'limitConsumption' || command.operation === 'release') {
            await this.adapter.setStateAsync(`devices.${deviceId}.cls.active`, { val: command.active, ack: true });
            await this.adapter.setStateAsync(`devices.${deviceId}.cls.limitW`, { val: command.limitW ?? 0, ack: true });
            await this.adapter.setStateAsync(`devices.${deviceId}.cls.commandId`, { val: command.commandId, ack: true });
            await this.adapter.setStateAsync(`devices.${deviceId}.cls.operation`, { val: command.operation, ack: true });
            await this.adapter.setStateAsync(`devices.${deviceId}.cls.limitId`, {
                val: (0, sanitizer_1.jsonStringifySafe)(command.correlation.limitIds),
                ack: true,
            });
            await this.adapter.setStateAsync(`devices.${deviceId}.cls.receivedAt`, { val: command.receivedAtMs, ack: true });
            await this.adapter.setStateAsync(`devices.${deviceId}.cls.validUntil`, { val: command.expiresAtMs ?? 0, ack: true });
        }
        await this.adapter.setStateAsync(`devices.${deviceId}.cls.failsafeLimitW`, { val: command.failsafeLimitW ?? 0, ack: true });
        await this.adapter.setStateAsync(`devices.${deviceId}.cls.failsafeDurationMs`, { val: command.failsafeDurationMs ?? 0, ack: true });
        await this.adapter.setStateAsync(`devices.${deviceId}.cls.heartbeatLastSeen`, { val: command.heartbeatAtMs ?? 0, ack: true });
        await this.adapter.setStateAsync(`devices.${deviceId}.cls.heartbeatTimeoutMs`, {
            val: command.heartbeatTimeoutMs ?? this.config.clsHeartbeatTimeoutSec * 1000,
            ack: true,
        });
        const heartbeatAgeMs = command.heartbeatAtMs ? Math.max(0, Date.now() - command.heartbeatAtMs) : -1;
        await this.adapter.setStateAsync(`devices.${deviceId}.cls.heartbeatAgeMs`, { val: heartbeatAgeMs, ack: true });
        await this.adapter.setStateAsync(`devices.${deviceId}.cls.status`, { val: `received:${command.operation}`, ack: true });
    }
    async publishHeartbeatDiagnostics(source, nowMs, force = false) {
        const supervised = source.lastHeartbeatAtMs !== null;
        const ageMs = supervised
            ? Math.max(0, nowMs - Number(source.lastHeartbeatAtMs))
            : null;
        const healthy = supervised && Number(ageMs) <= source.heartbeatTimeoutMs;
        const stateChanged = source.lastHeartbeatHealthy !== healthy;
        if (!force && !stateChanged && nowMs - source.lastHeartbeatDiagAtMs < 1000)
            return;
        source.lastHeartbeatDiagAtMs = nowMs;
        source.lastHeartbeatHealthy = healthy;
        const writes = [
            this.adapter.setStateAsync(`devices.${source.deviceId}.cls.heartbeatLastSeen`, {
                val: source.lastHeartbeatAtMs ?? 0,
                ack: true,
            }),
            this.adapter.setStateAsync(`devices.${source.deviceId}.cls.heartbeatTimeoutMs`, {
                val: source.heartbeatTimeoutMs,
                ack: true,
            }),
            this.adapter.setStateAsync(`devices.${source.deviceId}.cls.heartbeatAgeMs`, {
                val: ageMs ?? -1,
                ack: true,
            }),
            this.adapter.setStateAsync('cls.heartbeatLastAt', { val: source.lastHeartbeatAtMs ?? 0, ack: true }),
            this.adapter.setStateAsync('cls.heartbeatAgeMs', { val: ageMs ?? -1, ack: true }),
            this.adapter.setStateAsync('cls.heartbeatHealthy', { val: healthy, ack: true }),
        ];
        await Promise.all(writes);
    }
    async handleBridgeImplementation(feedback, context) {
        const clsCommand = context?.clsCommand;
        const deviceId = clsCommand?.sourceDeviceId || '';
        if (deviceId) {
            this.background(this.publishBridgeImplementation(deviceId, feedback));
        }
        if (!clsCommand)
            return;
        const implementationSucceeded = feedback.controllerApplied === true
            && (feedback.status === 'applied' || feedback.status === 'released');
        const resultReason = implementationSucceeded
            ? (feedback.status === 'released'
                ? 'NexoWatt EOS completed the §14a release cycle.'
                : 'NexoWatt EOS completed the §14a control and downstream write cycle.')
            : String(feedback.reason || `EOS implementation status: ${feedback.status}`);
        // The correlated ResultData is the final write result. It is sent only after
        // the complete EOS controller/write cycle, never merely after API acceptance.
        // Degraded, superseded, failed and timeout paths return a negative result.
        if (clsCommand.correlation.ackRequest) {
            this.sendClsResult(clsCommand.sourceDeviceId, clsCommand, implementationSucceeded ? 0 : 7, resultReason);
        }
        if (!implementationSucceeded || !this.config.sendImplementationResultToCls)
            return;
        // After the final positive result, publish the effective LoadControl state
        // over the existing SHIP/SPINE session. This is a controller readback, not
        // an MPC/MGCP metrological confirmation of physical electrical power.
        const readback = (0, clsControlParser_1.buildSpineLimitReadbackDatagram)(clsCommand, this.nextMsgCounter(), feedback.active, feedback.effectiveTotalCapW);
        if (!readback)
            return;
        const sent = this.endpoint?.sendSpine(clsCommand.sourceDeviceId, readback) || false;
        const diagnostic = {
            ts: Date.now(),
            sent,
            commandId: feedback.commandId,
            active: feedback.active,
            effectiveTotalCapW: feedback.effectiveTotalCapW,
            status: feedback.status,
            controllerApplied: feedback.controllerApplied,
        };
        this.background(this.adapter.setStateAsync('cls.lastSpineReadback', {
            val: (0, sanitizer_1.jsonStringifySafe)(diagnostic),
            ack: true,
        }));
        this.background(this.adapter.setStateAsync(`devices.${clsCommand.sourceDeviceId}.cls.lastSpineReadback`, {
            val: (0, sanitizer_1.jsonStringifySafe)(diagnostic),
            ack: true,
        }));
        this.background(this.adapter.setStateAsync(`devices.${clsCommand.sourceDeviceId}.raw.lastCommand`, {
            val: (0, sanitizer_1.jsonStringifySafe)(readback),
            ack: true,
        }));
        if (!sent) {
            this.background(this.adapter.setStateAsync(`devices.${clsCommand.sourceDeviceId}.cls.lastError`, {
                val: 'Controller readback could not be sent because no SHIP data-exchange session is active.',
                ack: true,
            }));
        }
    }
    async publishBridgeImplementation(deviceId, feedback) {
        await this.adapter.setStateAsync(`devices.${deviceId}.cls.effectiveLimitW`, {
            val: feedback.effectiveTotalCapW ?? 0,
            ack: true,
        });
        await this.adapter.setStateAsync(`devices.${deviceId}.cls.status`, { val: feedback.status, ack: true });
        await this.adapter.setStateAsync(`devices.${deviceId}.cls.lastFeedback`, {
            val: (0, sanitizer_1.jsonStringifySafe)(feedback),
            ack: true,
        });
        await this.adapter.setStateAsync(`devices.${deviceId}.cls.lastError`, {
            val: feedback.controllerApplied ? '' : String(feedback.reason || feedback.status),
            ack: true,
        });
    }
    sendClsResult(deviceId, command, errorNumber, reason) {
        const datagram = (0, clsControlParser_1.buildSpineResultDatagram)(command, this.nextMsgCounter(), errorNumber, reason);
        if (!datagram) {
            this.background(this.adapter.setStateAsync(`devices.${deviceId}.cls.lastError`, {
                val: `Could not build correlated SPINE result: ${reason}`,
                ack: true,
            }));
            return false;
        }
        // Sending happens before diagnostic state writes. A positive result confirms
        // the completed EOS controller/write cycle; a negative result reports an
        // immediate rejection or a failed/degraded implementation.
        const sent = this.endpoint?.sendSpine(deviceId, datagram) || false;
        const diagnostic = {
            ts: Date.now(),
            sent,
            commandId: command.commandId,
            errorNumber,
            reason,
        };
        this.background(this.adapter.setStateAsync('cls.lastSpineAcceptance', {
            val: (0, sanitizer_1.jsonStringifySafe)(diagnostic),
            ack: true,
        }));
        this.background(this.adapter.setStateAsync(`devices.${deviceId}.cls.lastSpineAcceptance`, {
            val: (0, sanitizer_1.jsonStringifySafe)(diagnostic),
            ack: true,
        }));
        this.background(this.adapter.setStateAsync(`devices.${deviceId}.raw.lastCommand`, {
            val: (0, sanitizer_1.jsonStringifySafe)(datagram),
            ack: true,
        }));
        if (!sent) {
            this.background(this.adapter.setStateAsync(`devices.${deviceId}.cls.lastError`, {
                val: `SPINE result could not be sent because no SHIP data-exchange session is active (${reason}).`,
                ack: true,
            }));
        }
        return sent;
    }
    async superviseClsSources() {
        if (!this.bridge || this.adapter.isEosLicenseAllowed?.() !== true)
            return;
        const now = Date.now();
        for (const source of this.clsSources.values()) {
            if (source.transitionInFlight)
                continue;
            const heartbeatSupervised = source.lastHeartbeatAtMs !== null;
            const heartbeatAgeMs = heartbeatSupervised
                ? Math.max(0, now - Number(source.lastHeartbeatAtMs))
                : null;
            const heartbeatHealthy = !heartbeatSupervised
                || Number(heartbeatAgeMs) <= source.heartbeatTimeoutMs;
            this.background(this.publishHeartbeatDiagnostics(source, now, false));
            const regular = source.lastRegularCommand;
            if (!regular)
                continue;
            source.transitionInFlight = true;
            try {
                // A configured LPC failsafe is maintained for its announced
                // duration. Afterwards the peer is no longer required to keep
                // the temporary failsafe limit. The local transition is a new
                // controller action, not a reply to the old SPINE write, so it
                // must not reuse the old acknowledgement correlation.
                const failsafeDurationMs = Number(source.failsafeDurationMs);
                if (source.failsafeActive
                    && source.failsafeActivatedAtMs > 0
                    && Number.isFinite(failsafeDurationMs)
                    && failsafeDurationMs > 0
                    && now >= source.failsafeActivatedAtMs + failsafeDurationMs
                    && source.failsafeExpiredForCommandId !== regular.commandId) {
                    const release = this.cloneClsCommand(regular, {
                        commandId: `${regular.commandId}-failsafe-expired-${now}`,
                        operation: 'release',
                        active: false,
                        limitW: null,
                        receivedAtMs: now,
                        effectiveFromMs: now,
                        expiresAtMs: null,
                        heartbeatAtMs: source.lastHeartbeatAtMs,
                        correlation: {
                            ...regular.correlation,
                            ackRequest: false,
                        },
                        rawSummary: {
                            synthesizedByNexoWatt: true,
                            synthesizedReason: 'failsafe-duration-expired',
                        },
                    });
                    const accepted = await this.bridge.dispatchLimit(release, 'failsafe-duration-expired');
                    if (accepted.accepted) {
                        source.lastCommand = release;
                        source.failsafeActive = false;
                        source.failsafeActivatedAtMs = 0;
                        source.failsafeExpiredForCommandId = regular.commandId;
                        source.failsafeRecoveryNoticeAtMs = 0;
                        this.background(this.adapter.setStateAsync('cls.failsafeActive', { val: false, ack: true }));
                        this.background(this.adapter.setStateAsync(`devices.${source.deviceId}.cls.failsafeActive`, { val: false, ack: true }));
                        this.background(this.adapter.setStateAsync(`devices.${source.deviceId}.cls.status`, {
                            val: 'failsafe-duration-expired-released',
                            ack: true,
                        }));
                    }
                    continue;
                }
                // A stale, previously observed heartbeat is a communication fault.
                // Never release or increase the allowance in this state. Apply the
                // configured failsafe once, otherwise keep the last accepted limit.
                if (heartbeatSupervised && !heartbeatHealthy) {
                    if (!source.failsafeActive
                        && source.failsafeExpiredForCommandId !== regular.commandId
                        && Number(source.failsafeLimitW) > 0) {
                        const configuredFailsafeW = Number(source.failsafeLimitW);
                        const currentLimitW = regular.active && Number(regular.limitW) > 0
                            ? Number(regular.limitW)
                            : null;
                        const effectiveFailsafeW = currentLimitW === null
                            ? configuredFailsafeW
                            : Math.min(configuredFailsafeW, currentLimitW);
                        const failsafe = this.cloneClsCommand(regular, {
                            commandId: `${regular.commandId}-failsafe-${now}`,
                            operation: 'limitConsumption',
                            active: true,
                            limitW: effectiveFailsafeW,
                            receivedAtMs: now,
                            effectiveFromMs: now,
                            expiresAtMs: null,
                            heartbeatAtMs: source.lastHeartbeatAtMs,
                            correlation: {
                                ...regular.correlation,
                                ackRequest: false,
                            },
                            rawSummary: {
                                synthesizedByNexoWatt: true,
                                synthesizedReason: 'heartbeat-stale-failsafe',
                            },
                        });
                        const accepted = await this.bridge.dispatchLimit(failsafe, 'bridge-failsafe');
                        if (accepted.accepted) {
                            source.lastCommand = failsafe;
                            source.failsafeActive = true;
                            source.failsafeActivatedAtMs = now;
                            source.failsafeExpiredForCommandId = '';
                            source.failsafeRecoveryNoticeAtMs = 0;
                            this.background(this.adapter.setStateAsync('cls.failsafeActive', { val: true, ack: true }));
                            this.background(this.adapter.setStateAsync(`devices.${source.deviceId}.cls.failsafeActive`, { val: true, ack: true }));
                            this.background(this.adapter.setStateAsync(`devices.${source.deviceId}.cls.status`, {
                                val: 'heartbeat-stale-failsafe-active',
                                ack: true,
                            }));
                        }
                    }
                    else if (!source.failsafeActive
                        && source.failsafeExpiredForCommandId === regular.commandId) {
                        this.background(this.adapter.setStateAsync(`devices.${source.deviceId}.cls.status`, {
                            val: 'failsafe-duration-expired-released',
                            ack: true,
                        }));
                    }
                    else if (!source.failsafeActive) {
                        this.background(this.adapter.setStateAsync(`devices.${source.deviceId}.cls.status`, {
                            val: 'heartbeat-stale-hold-last-command',
                            ack: true,
                        }));
                    }
                    continue;
                }
                // Heartbeat recovery alone must never widen a power allowance.
                // Keep the restrictive failsafe until its announced duration ends
                // or the CLS peer transmits a fresh explicit LPC write/release.
                if (source.failsafeActive) {
                    if (source.failsafeRecoveryNoticeAtMs === 0
                        || now - source.failsafeRecoveryNoticeAtMs >= 30000) {
                        source.failsafeRecoveryNoticeAtMs = now;
                        this.background(this.adapter.setStateAsync(`devices.${source.deviceId}.cls.status`, {
                            val: 'heartbeat-restored-failsafe-held-awaiting-explicit-lpc',
                            ack: true,
                        }));
                    }
                    continue;
                }
                // Validity expiry is handled here only while communication is known
                // healthy, or when this peer never announced a heartbeat at all.
                if (regular.active
                    && Number.isFinite(Number(regular.expiresAtMs))
                    && Number(regular.expiresAtMs) > 0
                    && Number(regular.expiresAtMs) <= now
                    && source.expiryReleasedForCommandId !== regular.commandId) {
                    const release = this.cloneClsCommand(regular, {
                        commandId: `${regular.commandId}-expired-${now}`,
                        operation: 'release',
                        active: false,
                        limitW: null,
                        receivedAtMs: now,
                        effectiveFromMs: now,
                        expiresAtMs: null,
                        heartbeatAtMs: source.lastHeartbeatAtMs,
                        correlation: {
                            ...regular.correlation,
                            ackRequest: false,
                        },
                        rawSummary: {
                            synthesizedByNexoWatt: true,
                            synthesizedReason: 'command-validity-expired',
                        },
                    });
                    const accepted = await this.bridge.dispatchLimit(release, 'validity-expired');
                    if (accepted.accepted) {
                        source.lastCommand = release;
                        source.expiryReleasedForCommandId = regular.commandId;
                        this.background(this.adapter.setStateAsync(`devices.${source.deviceId}.cls.status`, {
                            val: 'command-validity-expired-released',
                            ack: true,
                        }));
                    }
                }
            }
            catch (error) {
                this.adapter.log.warn(`CLS supervisor failed for ${source.deviceId}: ${String(error)}`);
            }
            finally {
                source.transitionInFlight = false;
            }
        }
    }
    cloneClsCommand(base, overrides) {
        return {
            ...base,
            ...overrides,
            correlation: {
                ...base.correlation,
                ...(overrides.correlation || {}),
                limitIds: (overrides.correlation?.limitIds || base.correlation.limitIds).slice(),
            },
            rawSummary: {
                ...base.rawSummary,
                ...(overrides.rawSummary || {}),
            },
        };
    }
    background(promise) {
        void promise.catch(error => {
            try {
                this.adapter.log.debug(`EEBUS background diagnostics failed: ${String(error)}`);
            }
            catch (_error) {
                // Diagnostics must never interfere with the control path.
            }
        });
    }
    async ensureIncomingDevice(deviceId) {
        if (this.nodes.has(deviceId))
            return;
        const node = {
            id: deviceId,
            safeId: deviceId,
            name: `EEBUS ${deviceId.slice(0, 12)}`,
            host: '',
            port: 0,
            path: this.config.shipPath,
            ski: '',
            brand: '',
            type: '',
            model: '',
            serial: '',
            categories: [],
            register: true,
            ecc: false,
            txt: {},
            serviceType: 'incoming',
            lastSeen: new Date().toISOString(),
            deviceClass: 'unknown',
        };
        this.nodes.set(deviceId, node);
        await this.objectFactory.publishDiscovery(node);
    }
    async refreshMeasurements() {
        const now = Date.now();
        for (const [deviceId, node] of this.nodes.entries()) {
            const ageMs = now - Date.parse(node.lastSeen);
            const online = Number.isFinite(ageMs) ? ageMs < this.config.metadataIntervalSec * 3000 : true;
            await this.adapter.setStateAsync(`devices.${deviceId}.info.online`, { val: online, ack: true });
        }
    }
    async refreshMetadata() {
        for (const node of this.nodes.values())
            await this.objectFactory.publishDiscovery(node);
        await this.objectFactory.publishGlobalPairingCounts(Array.from(this.nodes.keys()));
    }
    parseCommand(id, value) {
        const match = id.match(/(?:^|\.)devices\.([^.]+)\.(control|limits|pairing)\.([^.]+)$/);
        if (!match)
            return null;
        return {
            deviceId: match[1],
            channel: match[2],
            stateName: match[3],
            value,
            ts: new Date().toISOString(),
        };
    }
    async isTrusted(deviceId) {
        if (this.autoAcceptNewDevices)
            return true;
        if (this.trustCache.has(deviceId))
            return this.trustCache.get(deviceId) === true;
        const state = await this.adapter.getStateAsync(`devices.${deviceId}.pairing.trusted`);
        const trusted = Boolean(state?.val);
        this.trustCache.set(deviceId, trusted);
        return trusted;
    }
    isLocalNode(node) {
        return Boolean((node.ski && node.ski === this.identity.localSki) ||
            (node.id && node.id === this.identity.shipId) ||
            (node.txt?.ski && node.txt.ski === this.identity.localSki));
    }
    nextMsgCounter() {
        this.msgCounter += 1;
        if (this.msgCounter > 2147483640)
            this.msgCounter = 1;
        return this.msgCounter;
    }
}
exports.EebusRuntime = EebusRuntime;
function finiteNumberOrNull(value) {
    if (value === null || value === undefined || value === '')
        return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}
//# sourceMappingURL=eebusRuntime.js.map