import { sanitizeServiceInstanceName, sanitizeTxtValue, toBoolean, toNumber } from './sanitizer';

export interface EebusConfig {
    discoveryEnabled: boolean;
    measurementIntervalSec: number;
    metadataIntervalSec: number;
    shipServerEnabled: boolean;
    announceShipService: boolean;
    autoConnectEnabled: boolean;
    shipHandshakeEnabled: boolean;
    spineDiscoveryEnabled: boolean;
    shipPort: number;
    shipPath: string;
    serviceName: string;
    brand: string;
    model: string;
    deviceType: string;
    deviceCategories: string[];
    ianaPen: string;
    pairingPin: string;
    certificate: string;
    privateKey: string;
    shipId: string;
    localSki: string;
    certificateFingerprint: string;
    autoAcceptNewDevices: boolean;
    allowCommandsToUntrustedDevices: boolean;
    commandDryRun: boolean;
    debugRawMessages: boolean;
    nexowattBridgeEnabled: boolean;
    nexowattUiInstance: string;
    nexowattBridgeHeartbeatSec: number;
    nexowattBridgeRequestTimeoutMs: number;
    nexowattAcceptanceTargetMs: number;
    nexowattControlTargetMs: number;
    nexowattFeedbackTargetMs: number;
    nexowattImplementationTimeoutMs: number;
    clsHeartbeatTimeoutSec: number;
    autoApplyClsLimits: boolean;
    sendImplementationResultToCls: boolean;
}

export interface NativeConfigMigrationResult {
    native: Record<string, unknown>;
    changes: string[];
}

export const NEXOWATT_EEBUS_IDENTITY = Object.freeze({
    serviceName: 'NexoWatt EOS',
    brand: 'NexoWatt',
    model: 'EOS',
    deviceType: 'EnergyManagementSystem',
    deviceCategories: '2',
});

const DEFAULT_BRAND = NEXOWATT_EEBUS_IDENTITY.brand;
const DEFAULT_MODEL = NEXOWATT_EEBUS_IDENTITY.model;
const DEFAULT_DEVICE_TYPE = NEXOWATT_EEBUS_IDENTITY.deviceType;
const DEFAULT_SERVICE_NAME = NEXOWATT_EEBUS_IDENTITY.serviceName;

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
export function migrateLegacyNativeConfig(native: Record<string, unknown>): NativeConfigMigrationResult {
    const migrated: Record<string, unknown> = { ...native };
    const changes: string[] = [];

    const apply = (key: string, value: unknown): void => {
        if (migrated[key] === value) return;
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
    if (stringValue(native.deviceCategories) !== NEXOWATT_EEBUS_IDENTITY.deviceCategories) {
        apply('deviceCategories', NEXOWATT_EEBUS_IDENTITY.deviceCategories);
    }

    // Older instances could retain false from version 0.1.x and then remain invisible to wallboxes.
    if (toBoolean(native.announceShipService, true) !== true) {
        apply('announceShipService', true);
    }

    return { native: migrated, changes };
}

export function getConfig(native: Record<string, unknown>): EebusConfig {
    const shipPath = normalizeShipPath(native.shipPath);
    const brand = sanitizeTxtValue(native.brand, DEFAULT_BRAND, 32);
    const model = normalizeModel(native.model);
    const deviceType = normalizeDeviceType(native.deviceType);
    const serviceName = normalizeServiceName(native.serviceName, brand, model);

    return {
        discoveryEnabled: toBoolean(native.discoveryEnabled, true),
        measurementIntervalSec: Math.max(5, toNumber(native.measurementIntervalSec, 10)),
        metadataIntervalSec: Math.max(30, toNumber(native.metadataIntervalSec, 60)),
        shipServerEnabled: toBoolean(native.shipServerEnabled, true),
        // NexoWatt EOS is the HEMS. While it advertises as EnergyManagementSystem, mDNS announcement must stay active
        // so wallboxes can show it in their EEBUS/HEMS pairing list, even if an older native config contains false.
        announceShipService: deviceType === DEFAULT_DEVICE_TYPE ? true : toBoolean(native.announceShipService, true),
        autoConnectEnabled: toBoolean(native.autoConnectEnabled, true),
        shipHandshakeEnabled: toBoolean(native.shipHandshakeEnabled, true),
        spineDiscoveryEnabled: toBoolean(native.spineDiscoveryEnabled, true),
        shipPort: Math.min(65535, Math.max(1024, toNumber(native.shipPort, 4712))),
        shipPath,
        serviceName,
        brand,
        model,
        deviceType,
        deviceCategories: normalizeCategories(native.deviceCategories),
        ianaPen: sanitizeTxtValue(native.ianaPen, '999999', 16).replace(/[^0-9]/g, '').slice(0, 6) || '999999',
        pairingPin: String(native.pairingPin || ''),
        certificate: String(native.certificate || ''),
        privateKey: String(native.privateKey || ''),
        shipId: String(native.shipId || ''),
        localSki: String(native.localSki || ''),
        certificateFingerprint: String(native.certificateFingerprint || ''),
        autoAcceptNewDevices: toBoolean(native.autoAcceptNewDevices, false),
        allowCommandsToUntrustedDevices: toBoolean(native.allowCommandsToUntrustedDevices, false),
        commandDryRun: toBoolean(native.commandDryRun, true),
        debugRawMessages: toBoolean(native.debugRawMessages, false),
        nexowattBridgeEnabled: toBoolean(native.nexowattBridgeEnabled, true),
        nexowattUiInstance: normalizeTargetInstance(native.nexowattUiInstance),
        nexowattBridgeHeartbeatSec: Math.min(300, Math.max(5, toNumber(native.nexowattBridgeHeartbeatSec, 5))),
        nexowattBridgeRequestTimeoutMs: Math.min(10000, Math.max(100, toNumber(native.nexowattBridgeRequestTimeoutMs ?? native.nexowattBridgeAckTimeoutMs, 2000))),
        nexowattAcceptanceTargetMs: Math.min(5000, Math.max(50, toNumber(native.nexowattAcceptanceTargetMs, 250))),
        nexowattControlTargetMs: Math.min(10000, Math.max(100, toNumber(native.nexowattControlTargetMs, 1000))),
        nexowattFeedbackTargetMs: Math.min(15000, Math.max(200, toNumber(native.nexowattFeedbackTargetMs, 1500))),
        nexowattImplementationTimeoutMs: Math.min(30000, Math.max(1500, toNumber(native.nexowattImplementationTimeoutMs, 5000))),
        clsHeartbeatTimeoutSec: Math.min(3600, Math.max(5, toNumber(native.clsHeartbeatTimeoutSec ?? native.clsHeartbeatFallbackSec, 120))),
        autoApplyClsLimits: toBoolean(native.autoApplyClsLimits, true),
        sendImplementationResultToCls: toBoolean(native.sendImplementationResultToCls, true),
    };
}

export function isPlaceholderIanaPen(value: unknown): boolean {
    const pen = String(value ?? '').trim();
    return !pen || pen === '999999' || pen === '32473';
}

function normalizeShipPath(input: unknown): string {
    const raw = String(input || '/ship/').trim() || '/ship/';
    const withLeadingSlash = raw.startsWith('/') ? raw : `/${raw}`;
    return withLeadingSlash.slice(0, 32) || '/ship/';
}

function normalizeModel(input: unknown): string {
    const raw = stringValue(input);
    if (isKnownLegacy(raw, LEGACY_MODELS)) {
        return DEFAULT_MODEL;
    }

    return sanitizeTxtValue(raw || DEFAULT_MODEL, DEFAULT_MODEL, 32);
}

function normalizeDeviceType(input: unknown): string {
    const raw = stringValue(input);
    if (isKnownLegacy(raw, LEGACY_DEVICE_TYPES)) {
        return DEFAULT_DEVICE_TYPE;
    }

    return sanitizeTxtValue(raw || DEFAULT_DEVICE_TYPE, DEFAULT_DEVICE_TYPE, 32);
}

function normalizeServiceName(input: unknown, brand: string, model: string): string {
    const raw = stringValue(input);
    const candidate = raw && !isKnownLegacy(raw, LEGACY_SERVICE_NAMES) ? raw : `${brand} ${model}`;
    return sanitizeServiceInstanceName(candidate, DEFAULT_SERVICE_NAME);
}

function normalizeCategories(input: unknown): string[] {
    const categories = String(input || NEXOWATT_EEBUS_IDENTITY.deviceCategories)
        .split(',')
        .map(item => sanitizeTxtValue(item, '', 8))
        .filter(Boolean);

    return categories.length > 0 ? categories : [NEXOWATT_EEBUS_IDENTITY.deviceCategories];
}

function normalizeTargetInstance(input: unknown): string {
    const raw = String(input ?? 'nexowatt-ui.0').trim().toLowerCase();
    if (!raw) return 'nexowatt-ui.0';
    if (raw === 'auto') return 'auto';
    const normalized = raw.replace(/^system\.adapter\./, '');
    return /^nexowatt-ui\.\d+$/.test(normalized) ? normalized : 'auto';
}

function stringValue(value: unknown): string {
    return String(value ?? '').trim();
}

function isKnownLegacy(value: string, values: Set<string>): boolean {
    return values.has(value.toLowerCase());
}

function toLowerSet(values: string[]): Set<string> {
    return new Set(values.map(value => value.trim().toLowerCase()));
}
