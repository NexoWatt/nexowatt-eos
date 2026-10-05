export type DeviceChannel = 'info' | 'connection' | 'measurements' | 'control' | 'limits' | 'cls' | 'raw' | 'pairing' | 'useCases';
export interface StateDefinition {
    id: string;
    name: string;
    channel?: DeviceChannel;
    type: 'boolean' | 'number' | 'string' | 'object';
    role: string;
    read: boolean;
    write: boolean;
    unit?: string;
    def?: unknown;
    desc?: string;
}
export declare const identityStates: StateDefinition[];
export declare const discoveryStates: StateDefinition[];
export declare const globalPairingStates: StateDefinition[];
export declare const bridgeStates: StateDefinition[];
export declare const clsStates: StateDefinition[];
export declare const deviceStates: StateDefinition[];
export declare const channelNames: Record<DeviceChannel, string>;
//# sourceMappingURL=stateDefinitions.d.ts.map