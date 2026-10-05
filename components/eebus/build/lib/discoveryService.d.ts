import { EebusConfig } from './config';
import { DiscoveredShipNode } from './eebusTypes';
type DiscoveryCallback = (node: DiscoveredShipNode) => void | Promise<void>;
export declare class DiscoveryService {
    private readonly adapter;
    private readonly config;
    private readonly onNode;
    private bonjour;
    private browsers;
    constructor(adapter: any, config: EebusConfig, onNode: DiscoveryCallback);
    start(): void;
    stop(): void;
    private startBrowser;
    private handleService;
}
export {};
//# sourceMappingURL=discoveryService.d.ts.map