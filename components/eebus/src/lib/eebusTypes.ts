export type DeviceClass =
    | 'wallbox'
    | 'inverter'
    | 'smartMeter'
    | 'clsBox'
    | 'battery'
    | 'gridConnection'
    | 'heatPump'
    | 'climate'
    | 'hvac'
    | 'unknown';

export type ShipConnectionState =
    | 'discovered'
    | 'connecting'
    | 'tls-connected'
    | 'cmi-ok'
    | 'hello-pending'
    | 'hello-ready'
    | 'protocol-handshake-ok'
    | 'pin-required'
    | 'pin-ok'
    | 'data-exchange'
    | 'closed'
    | 'error';

export interface EebusIdentity {
    certificate: string;
    privateKey: string;
    shipId: string;
    localSki: string;
    certificateFingerprint: string;
    createdAt: string;
}

export interface DiscoveredShipNode {
    id: string;
    safeId: string;
    name: string;
    host: string;
    port: number;
    path: string;
    ski: string;
    brand: string;
    type: string;
    model: string;
    serial: string;
    categories: string[];
    register: boolean;
    ecc: boolean;
    txt: Record<string, string>;
    serviceType: 'ship' | 'shippairing' | 'incoming';
    lastSeen: string;
    deviceClass?: DeviceClass;
    fingerprint?: string;
}

export interface DeviceCommand {
    deviceId: string;
    channel: 'control' | 'limits' | 'pairing';
    stateName: string;
    value: unknown;
    ts: string;
}

export interface SpineDraftCommand {
    protocol: 'SPINE';
    status: 'draft-unverified' | 'fieldtest-frame';
    deviceId: string;
    featureType: string;
    function: string;
    command: string;
    payload: Record<string, unknown>;
    datagram?: Record<string, unknown>;
    note: string;
    createdAt: string;
}

export interface EebusFeatureSummary {
    deviceClass: DeviceClass;
    deviceTypes: string[];
    featureTypes: string[];
    functions: string[];
    useCases: string[];
    supportedDeviceClasses: DeviceClass[];
    rawNodeManagement?: unknown;
}

export interface SpineMeasurementUpdate {
    stateId: string;
    value: number | string | boolean;
}

export interface SpineAnalysisResult {
    featureSummary?: EebusFeatureSummary;
    measurementUpdates: SpineMeasurementUpdate[];
    deviceClass?: DeviceClass;
    rawPayload?: unknown;
}
