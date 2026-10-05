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
export declare const NEXOWATT_EEBUS_IDENTITY: Readonly<{
    serviceName: "NexoWatt EOS";
    brand: "NexoWatt";
    model: "EOS";
    deviceType: "EnergyManagementSystem";
    deviceCategories: "2";
}>;
/**
 * Migrates only known legacy/default identity values. Custom product identities are preserved,
 * except for the local SHIP category which is fixed to category 2 because this adapter represents
 * NexoWatt EOS as an Energy Management System.
 */
export declare function migrateLegacyNativeConfig(native: Record<string, unknown>): NativeConfigMigrationResult;
export declare function getConfig(native: Record<string, unknown>): EebusConfig;
export declare function isPlaceholderIanaPen(value: unknown): boolean;
//# sourceMappingURL=config.d.ts.map