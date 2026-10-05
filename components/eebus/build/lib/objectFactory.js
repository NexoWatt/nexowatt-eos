"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectFactory = void 0;
const config_1 = require("./config");
const stateDefinitions_1 = require("./stateDefinitions");
const sanitizer_1 = require("./sanitizer");
class ObjectFactory {
    adapter;
    constructor(adapter) {
        this.adapter = adapter;
    }
    async ensureBaseObjects() {
        await this.ensureChannel('identity', 'Local EEBUS identity');
        for (const state of stateDefinitions_1.identityStates)
            await this.ensureState(`identity.${state.id}`, state);
        await this.ensureChannel('discovery', 'EEBUS discovery');
        for (const state of stateDefinitions_1.discoveryStates)
            await this.ensureState(`discovery.${state.id}`, state);
        await this.ensureChannel('pairing', 'Global EEBUS pairing');
        for (const state of stateDefinitions_1.globalPairingStates)
            await this.ensureState(`pairing.${state.id}`, state);
        await this.ensureChannel('bridge', 'NexoWatt EOS direct §14a API');
        for (const state of stateDefinitions_1.bridgeStates)
            await this.ensureState(`bridge.${state.id}`, state);
        await this.ensureChannel('cls', 'CLS / §14a control');
        for (const state of stateDefinitions_1.clsStates)
            await this.ensureState(`cls.${state.id}`, state);
    }
    async publishIdentity(identity, config) {
        await this.adapter.setStateAsync('identity.serviceName', { val: config.serviceName, ack: true });
        await this.adapter.setStateAsync('identity.brand', { val: config.brand, ack: true });
        await this.adapter.setStateAsync('identity.model', { val: config.model, ack: true });
        await this.adapter.setStateAsync('identity.deviceType', { val: config.deviceType, ack: true });
        await this.adapter.setStateAsync('identity.deviceCategories', { val: config.deviceCategories.join(','), ack: true });
        await this.adapter.setStateAsync('identity.ianaPen', { val: config.ianaPen, ack: true });
        await this.adapter.setStateAsync('identity.ianaPenPlaceholder', { val: (0, config_1.isPlaceholderIanaPen)(config.ianaPen), ack: true });
        await this.adapter.setStateAsync('identity.announcementActive', { val: config.shipServerEnabled && config.announceShipService, ack: true });
        await this.adapter.setStateAsync('identity.localSki', { val: identity.localSki, ack: true });
        await this.adapter.setStateAsync('identity.shipId', { val: identity.shipId, ack: true });
        await this.adapter.setStateAsync('identity.certificateFingerprint', { val: identity.certificateFingerprint, ack: true });
        await this.adapter.setStateAsync('pairing.autoAcceptNewDevices', { val: config.autoAcceptNewDevices, ack: true });
    }
    async ensureDevice(node) {
        await this.adapter.setObjectNotExistsAsync(`devices.${node.safeId}`, {
            type: 'device',
            common: {
                name: node.name || node.id || node.safeId,
            },
            native: {
                eebus: true,
                shipId: node.id,
                ski: node.ski,
                serviceType: node.serviceType,
            },
        });
        for (const channel of Object.keys(stateDefinitions_1.channelNames)) {
            await this.ensureChannel(`devices.${node.safeId}.${channel}`, stateDefinitions_1.channelNames[channel]);
        }
        for (const state of stateDefinitions_1.deviceStates) {
            if (!state.channel)
                continue;
            await this.ensureState(`devices.${node.safeId}.${state.channel}.${state.id}`, state);
        }
    }
    async publishDiscovery(node) {
        await this.ensureDevice(node);
        await this.adapter.setStateAsync(`devices.${node.safeId}.info.online`, { val: true, ack: true });
        await this.adapter.setStateAsync(`devices.${node.safeId}.info.manufacturer`, { val: node.brand, ack: true });
        await this.adapter.setStateAsync(`devices.${node.safeId}.info.model`, { val: node.model, ack: true });
        await this.adapter.setStateAsync(`devices.${node.safeId}.info.serialNumber`, { val: node.serial, ack: true });
        await this.adapter.setStateAsync(`devices.${node.safeId}.info.ski`, { val: node.ski, ack: true });
        await this.adapter.setStateAsync(`devices.${node.safeId}.info.deviceType`, { val: node.type, ack: true });
        await this.adapter.setStateAsync(`devices.${node.safeId}.info.deviceClass`, { val: node.deviceClass || 'unknown', ack: true });
        await this.adapter.setStateAsync(`devices.${node.safeId}.info.shipId`, { val: node.id, ack: true });
        await this.adapter.setStateAsync(`devices.${node.safeId}.info.host`, { val: node.host, ack: true });
        await this.adapter.setStateAsync(`devices.${node.safeId}.info.port`, { val: node.port, ack: true });
        await this.adapter.setStateAsync(`devices.${node.safeId}.info.path`, { val: node.path, ack: true });
        await this.adapter.setStateAsync(`devices.${node.safeId}.info.serviceType`, { val: node.serviceType, ack: true });
        await this.adapter.setStateAsync(`devices.${node.safeId}.info.lastSeen`, { val: node.lastSeen, ack: true });
        await this.adapter.setStateAsync(`devices.${node.safeId}.pairing.remoteSki`, { val: node.ski, ack: true });
        await this.adapter.setStateAsync(`devices.${node.safeId}.pairing.remoteShipId`, { val: node.id, ack: true });
        await this.adapter.setStateAsync(`devices.${node.safeId}.pairing.remoteFingerprint`, { val: node.fingerprint || '', ack: true });
        await this.adapter.setStateAsync(`devices.${node.safeId}.pairing.pairingState`, { val: 'discovered', ack: true });
        await this.adapter.setStateAsync(`devices.${node.safeId}.connection.shipState`, { val: 'discovered', ack: true });
        await this.adapter.setStateAsync(`devices.${node.safeId}.raw.discovery`, { val: (0, sanitizer_1.jsonStringifySafe)(node), ack: true });
    }
    async publishConnectionState(deviceId, state, role, connected = false, error = '') {
        await this.adapter.setStateAsync(`devices.${deviceId}.connection.shipState`, { val: state, ack: true });
        await this.adapter.setStateAsync(`devices.${deviceId}.connection.connected`, { val: connected, ack: true });
        await this.adapter.setStateAsync(`devices.${deviceId}.connection.dataExchangeReady`, { val: state === 'data-exchange', ack: true });
        if (role)
            await this.adapter.setStateAsync(`devices.${deviceId}.connection.role`, { val: role, ack: true });
        if (error)
            await this.adapter.setStateAsync(`devices.${deviceId}.connection.lastError`, { val: error, ack: true });
        if (connected)
            await this.adapter.setStateAsync(`devices.${deviceId}.connection.lastConnected`, { val: new Date().toISOString(), ack: true });
        if (state === 'closed')
            await this.adapter.setStateAsync(`devices.${deviceId}.connection.lastDisconnected`, { val: new Date().toISOString(), ack: true });
    }
    async publishPairingRequest(deviceId, request) {
        await this.adapter.setStateAsync(`devices.${deviceId}.pairing.pairingState`, { val: 'pending-local-approval', ack: true });
        await this.adapter.setStateAsync('pairing.lastPairingRequest', { val: (0, sanitizer_1.jsonStringifySafe)(request), ack: true });
    }
    async publishTrust(deviceId, trusted, mode = 'local-user') {
        await this.adapter.setStateAsync(`devices.${deviceId}.pairing.trusted`, { val: trusted, ack: true });
        await this.adapter.setStateAsync(`devices.${deviceId}.pairing.trustLevel`, { val: trusted ? 32 : 0, ack: true });
        await this.adapter.setStateAsync(`devices.${deviceId}.pairing.verificationMode`, { val: mode, ack: true });
        await this.adapter.setStateAsync(`devices.${deviceId}.pairing.pairingState`, { val: trusted ? 'trusted-local' : 'untrusted-local', ack: true });
    }
    async publishFeatureSummary(deviceId, summary) {
        await this.adapter.setStateAsync(`devices.${deviceId}.info.deviceClass`, { val: summary.deviceClass, ack: true });
        await this.adapter.setStateAsync(`devices.${deviceId}.useCases.detected`, { val: (0, sanitizer_1.jsonStringifySafe)(summary.useCases), ack: true });
        await this.adapter.setStateAsync(`devices.${deviceId}.useCases.features`, { val: (0, sanitizer_1.jsonStringifySafe)(summary.featureTypes), ack: true });
        await this.adapter.setStateAsync(`devices.${deviceId}.useCases.functions`, { val: (0, sanitizer_1.jsonStringifySafe)(summary.functions), ack: true });
        await this.adapter.setStateAsync(`devices.${deviceId}.useCases.nodeManagement`, {
            val: (0, sanitizer_1.jsonStringifySafe)(summary.rawNodeManagement || {}),
            ack: true,
        });
        await this.adapter.setStateAsync(`devices.${deviceId}.useCases.primaryUseCase`, { val: summary.useCases[0] || '', ack: true });
        await this.adapter.setStateAsync(`devices.${deviceId}.useCases.supportedDeviceClasses`, {
            val: (0, sanitizer_1.jsonStringifySafe)(summary.supportedDeviceClasses),
            ack: true,
        });
    }
    async publishMeasurement(deviceId, stateId, value) {
        await this.adapter.setStateAsync(`devices.${deviceId}.measurements.${stateId}`, { val: value, ack: true });
    }
    async markOffline(deviceId) {
        await this.adapter.setStateAsync(`devices.${deviceId}.info.online`, { val: false, ack: true });
        await this.adapter.setStateAsync(`devices.${deviceId}.connection.connected`, { val: false, ack: true });
    }
    async publishGlobalPairingCounts(deviceIds) {
        let trusted = 0;
        let pending = 0;
        for (const deviceId of deviceIds) {
            const trustedState = await this.adapter.getStateAsync(`devices.${deviceId}.pairing.trusted`);
            const pairingState = await this.adapter.getStateAsync(`devices.${deviceId}.pairing.pairingState`);
            if (Boolean(trustedState?.val))
                trusted += 1;
            if (String(pairingState?.val || '').includes('pending'))
                pending += 1;
        }
        await this.adapter.setStateAsync('pairing.trustedCount', { val: trusted, ack: true });
        await this.adapter.setStateAsync('pairing.pendingCount', { val: pending, ack: true });
    }
    async ensureChannel(id, name) {
        await this.adapter.setObjectNotExistsAsync(id, {
            type: 'channel',
            common: { name },
            native: {},
        });
    }
    async ensureState(id, def) {
        const common = {
            name: def.name,
            type: def.type,
            role: def.role,
            read: def.read,
            write: def.write,
        };
        if (def.unit != null)
            common.unit = def.unit;
        if (def.def != null)
            common.def = def.def;
        if (def.desc != null)
            common.desc = def.desc;
        await this.adapter.setObjectNotExistsAsync(id, {
            type: 'state',
            common,
            native: {},
        });
    }
}
exports.ObjectFactory = ObjectFactory;
//# sourceMappingURL=objectFactory.js.map