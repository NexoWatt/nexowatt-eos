import { EebusConfig } from './config';
import { DiscoveredShipNode, EebusFeatureSummary, EebusIdentity, ShipConnectionState } from './eebusTypes';
export declare class ObjectFactory {
    private readonly adapter;
    constructor(adapter: any);
    ensureBaseObjects(): Promise<void>;
    publishIdentity(identity: EebusIdentity, config: EebusConfig): Promise<void>;
    ensureDevice(node: DiscoveredShipNode): Promise<void>;
    publishDiscovery(node: DiscoveredShipNode): Promise<void>;
    publishConnectionState(deviceId: string, state: ShipConnectionState, role?: 'client' | 'server', connected?: boolean, error?: string): Promise<void>;
    publishPairingRequest(deviceId: string, request: unknown): Promise<void>;
    publishTrust(deviceId: string, trusted: boolean, mode?: string): Promise<void>;
    publishFeatureSummary(deviceId: string, summary: EebusFeatureSummary): Promise<void>;
    publishMeasurement(deviceId: string, stateId: string, value: unknown): Promise<void>;
    markOffline(deviceId: string): Promise<void>;
    publishGlobalPairingCounts(deviceIds: string[]): Promise<void>;
    private ensureChannel;
    private ensureState;
}
//# sourceMappingURL=objectFactory.d.ts.map