import { DeviceClass, DiscoveredShipNode, EebusFeatureSummary } from './eebusTypes';
export declare function classifyFromDiscovery(node: DiscoveredShipNode): DeviceClass;
export declare function summarizeFeatures(input: {
    deviceTypes?: string[];
    featureTypes?: string[];
    functions?: string[];
    explicitUseCases?: string[];
    rawNodeManagement?: unknown;
    fallbackClass?: DeviceClass;
}): EebusFeatureSummary;
//# sourceMappingURL=useCaseRegistry.d.ts.map