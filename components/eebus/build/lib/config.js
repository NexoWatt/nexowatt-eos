"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NEXOWATT_EEBUS_IDENTITY = void 0;
exports.migrateLegacyNativeConfig = migrateLegacyNativeConfig;
exports.getConfig = getConfig;
exports.isPlaceholderIanaPen = isPlaceholderIanaPen;
const sanitizer_1 = require("./sanitizer");
exports.NEXOWATT_EEBUS_IDENTITY = Object.freeze({
    serviceName: 'NexoWatt EOS',
    brand: 'NexoWatt',
    model: 'EOS',
    deviceType: 'EnergyManagementSystem',
    deviceCategories: '2',
});
const DEFAULT_BRAND = exports.NEXOWATT_EEBUS_IDENTITY.brand;
const DEFAULT_MODEL = exports.NEXOWATT_EEBUS_IDENTITY.model;
const DEFAULT_DEVICE_TYPE = exports.NEXOWATT_EEBUS_IDENTITY.deviceType;
const DEFAULT_SERVICE_NAME = exports.NEXOWATT_EEBUS_IDENTITY.serviceName;
const LEGACY_SERVICE_NAMES = toLowerSet([
    '',
    'EEBUS',
    'EEBUS Adapter',
    'ioBroker EEBUS',
    'ioBroker-EEBUS-Adapter',
    'ioBroker EEBUS Adapter',
    'NexoWatt EEBUS',
    'NexoWatt-ioBroker-EEBUS-Adapter',
    'NexoWatt ioBroker EEBUS Adapter',
    'NexoWatt EEBUS Adapter',
]);
const LEGACY_MODELS = toLowerSet([
    '',
    'EEBUS',
    'EEBUS Adapter',
    'ioBroker-EEBUS-Adapter',
    'ioBroker EEBUS Adapter',
    'ioBroker-EEBUS Adapter',
    'NexoWatt-ioBroker-EEBUS-Adapter',
    'NexoWatt ioBroker EEBUS Adapter',
    'NexoWatt EEBUS Adapter',
    'NexoWatt EOS',
    'EnergyOperationSystem',
    'Energy Operation System',
]);
const LEGACY_DEVICE_TYPES = toLowerSet([
    '',
    'EMS',
    'HEMS',
    'Energy Management System',
    'HomeEnergyManagementSystem',
    'Home Energy Management System',
    'EnergyOperationSystem',
    'Energy Operation System',
    'EnergyManagementSystem/HEMS',
]);
/**
 * Migrates only known legacy/default identity values. Custom product identities are preserved,
 * except for the local SHIP category which is fixed to category 2 because this adapter represents
 * NexoWatt EOS as an Energy Management System.
 */
function migrateLegacyNativeConfig(native) {
    const migrated = { ...native };
    const changes = [];
    const apply = (key, value) => {
        if (migrated[key] === value)
            return;
        migrated[key] = value;
        changes.push(`${key}=${String(value)}`);
    };
    const brandRaw = stringValue(native.brand);
    if (!brandRaw || brandRaw.toLowerCase() === DEFAULT_BRAND.toLowerCase() || brandRaw.toLowerCase() === 'nexowatt') {
        apply('brand', DEFAULT_BRAND);
    }
    const modelRaw = stringValue(native.model);
    if (isKnownLegacy(modelRaw, LEGACY_MODELS)) {
        apply('model', DEFAULT_MODEL);
    }
    const deviceTypeRaw = stringValue(native.deviceType);
    if (isKnownLegacy(deviceTypeRaw, LEGACY_DEVICE_TYPES)) {
        apply('deviceType', DEFAULT_DEVICE_TYPE);
    }
    const serviceNameRaw = stringValue(native.serviceName);
    if (isKnownLegacy(serviceNameRaw, LEGACY_SERVICE_NAMES)) {
        apply('serviceName', DEFAULT_SERVICE_NAME);
    }
    // This adapter represents the NexoWatt EOS HEMS and therefore announces EEBUS category 2 (EMS).
    if (stringValue(native.deviceCategories) !== exports.NEXOWATT_EEBUS_IDENTITY.deviceCategories) {
        apply('deviceCategories', exports.NEXOWATT_EEBUS_IDENTITY.deviceCategories);
    }
    // Older instances could retain false from version 0.1.x and then remain invisible to wallboxes.
    if ((0, sanitizer_1.toBoolean)(native.announceShipService, true) !== true) {
        apply('announceShipService', true);
    }
    return { native: migrated, changes };
}
function getConfig(native) {
    const shipPath = normalizeShipPath(native.shipPath);
    const brand = (0, sanitizer_1.sanitizeTxtValue)(native.brand, DEFAULT_BRAND, 32);
    const model = normalizeModel(native.model);
    const deviceType = normalizeDeviceType(native.deviceType);
    const serviceName = normalizeServiceName(native.serviceName, brand, model);
    return {
        discoveryEnabled: (0, sanitizer_1.toBoolean)(native.discoveryEnabled, true),
        measurementIntervalSec: Math.max(5, (0, sanitizer_1.toNumber)(native.measurementIntervalSec, 10)),
        metadataIntervalSec: Math.max(30, (0, sanitizer_1.toNumber)(native.metadataIntervalSec, 60)),
        shipServerEnabled: (0, sanitizer_1.toBoolean)(native.shipServerEnabled, true),
        // NexoWatt EOS is the HEMS. While it advertises as EnergyManagementSystem, mDNS announcement must stay active
        // so wallboxes can show it in their EEBUS/HEMS pairing list, even if an older native config contains false.
        announceShipService: deviceType === DEFAULT_DEVICE_TYPE ? true : (0, sanitizer_1.toBoolean)(native.announceShipService, true),
        autoConnectEnabled: (0, sanitizer_1.toBoolean)(native.autoConnectEnabled, true),
        shipHandshakeEnabled: (0, sanitizer_1.toBoolean)(native.shipHandshakeEnabled, true),
        spineDiscoveryEnabled: (0, sanitizer_1.toBoolean)(native.spineDiscoveryEnabled, true),
        shipPort: Math.min(65535, Math.max(1024, (0, sanitizer_1.toNumber)(native.shipPort, 4712))),
        shipPath,
        serviceName,
        brand,
        model,
        deviceType,
        deviceCategories: normalizeCategories(native.deviceCategories),
        ianaPen: (0, sanitizer_1.sanitizeTxtValue)(native.ianaPen, '999999', 16).replace(/[^0-9]/g, '').slice(0, 6) || '999999',
        pairingPin: String(native.pairingPin || ''),
        certificate: String(native.certificate || ''),
        privateKey: String(native.privateKey || ''),
        shipId: String(native.shipId || ''),
        localSki: String(native.localSki || ''),
        certificateFingerprint: String(native.certificateFingerprint || ''),
        autoAcceptNewDevices: (0, sanitizer_1.toBoolean)(native.autoAcceptNewDevices, false),
        allowCommandsToUntrustedDevices: (0, sanitizer_1.toBoolean)(native.allowCommandsToUntrustedDevices, false),
        commandDryRun: (0, sanitizer_1.toBoolean)(native.commandDryRun, true),
        debugRawMessages: (0, sanitizer_1.toBoolean)(native.debugRawMessages, false),
        nexowattBridgeEnabled: (0, sanitizer_1.toBoolean)(native.nexowattBridgeEnabled, true),
        nexowattUiInstance: normalizeTargetInstance(native.nexowattUiInstance),
        nexowattBridgeHeartbeatSec: Math.min(300, Math.max(5, (0, sanitizer_1.toNumber)(native.nexowattBridgeHeartbeatSec, 5))),
        nexowattBridgeRequestTimeoutMs: Math.min(10000, Math.max(100, (0, sanitizer_1.toNumber)(native.nexowattBridgeRequestTimeoutMs ?? native.nexowattBridgeAckTimeoutMs, 2000))),
        nexowattAcceptanceTargetMs: Math.min(5000, Math.max(50, (0, sanitizer_1.toNumber)(native.nexowattAcceptanceTargetMs, 250))),
        nexowattControlTargetMs: Math.min(10000, Math.max(100, (0, sanitizer_1.toNumber)(native.nexowattControlTargetMs, 1000))),
        nexowattFeedbackTargetMs: Math.min(15000, Math.max(200, (0, sanitizer_1.toNumber)(native.nexowattFeedbackTargetMs, 1500))),
        nexowattImplementationTimeoutMs: Math.min(30000, Math.max(1500, (0, sanitizer_1.toNumber)(native.nexowattImplementationTimeoutMs, 5000))),
        clsHeartbeatTimeoutSec: Math.min(3600, Math.max(5, (0, sanitizer_1.toNumber)(native.clsHeartbeatTimeoutSec ?? native.clsHeartbeatFallbackSec, 120))),
        autoApplyClsLimits: (0, sanitizer_1.toBoolean)(native.autoApplyClsLimits, true),
        sendImplementationResultToCls: (0, sanitizer_1.toBoolean)(native.sendImplementationResultToCls, true),
    };
}
function isPlaceholderIanaPen(value) {
    const pen = String(value ?? '').trim();
    return !pen || pen === '999999' || pen === '32473';
}
function normalizeShipPath(input) {
    const raw = String(input || '/ship/').trim() || '/ship/';
    const withLeadingSlash = raw.startsWith('/') ? raw : `/${raw}`;
    return withLeadingSlash.slice(0, 32) || '/ship/';
}
function normalizeModel(input) {
    const raw = stringValue(input);
    if (isKnownLegacy(raw, LEGACY_MODELS)) {
        return DEFAULT_MODEL;
    }
    return (0, sanitizer_1.sanitizeTxtValue)(raw || DEFAULT_MODEL, DEFAULT_MODEL, 32);
}
function normalizeDeviceType(input) {
    const raw = stringValue(input);
    if (isKnownLegacy(raw, LEGACY_DEVICE_TYPES)) {
        return DEFAULT_DEVICE_TYPE;
    }
    return (0, sanitizer_1.sanitizeTxtValue)(raw || DEFAULT_DEVICE_TYPE, DEFAULT_DEVICE_TYPE, 32);
}
function normalizeServiceName(input, brand, model) {
    const raw = stringValue(input);
    const candidate = raw && !isKnownLegacy(raw, LEGACY_SERVICE_NAMES) ? raw : `${brand} ${model}`;
    return (0, sanitizer_1.sanitizeServiceInstanceName)(candidate, DEFAULT_SERVICE_NAME);
}
function normalizeCategories(input) {
    const categories = String(input || exports.NEXOWATT_EEBUS_IDENTITY.deviceCategories)
        .split(',')
        .map(item => (0, sanitizer_1.sanitizeTxtValue)(item, '', 8))
        .filter(Boolean);
    return categories.length > 0 ? categories : [exports.NEXOWATT_EEBUS_IDENTITY.deviceCategories];
}
function normalizeTargetInstance(input) {
    const raw = String(input ?? 'nexowatt-ui.0').trim().toLowerCase();
    if (!raw)
        return 'nexowatt-ui.0';
    if (raw === 'auto')
        return 'auto';
    const normalized = raw.replace(/^system\.adapter\./, '');
    return /^nexowatt-ui\.\d+$/.test(normalized) ? normalized : 'auto';
}
function stringValue(value) {
    return String(value ?? '').trim();
}
function isKnownLegacy(value, values) {
    return values.has(value.toLowerCase());
}
function toLowerSet(values) {
    return new Set(values.map(value => value.trim().toLowerCase()));
}
//# sourceMappingURL=config.js.map