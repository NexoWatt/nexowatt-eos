import { DeviceCommand, EebusIdentity, SpineDraftCommand } from './eebusTypes';
export declare function buildNodeManagementDetailedDiscoveryRequest(identity: EebusIdentity, remoteShipId: string, msgCounter: number): Record<string, unknown>;
export declare function mapCommandToSpineDraft(command: DeviceCommand, identity?: EebusIdentity, remoteShipId?: string, msgCounter?: number): SpineDraftCommand;
//# sourceMappingURL=spineMapper.d.ts.map