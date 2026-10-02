import { DeviceClass, DiscoveredShipNode, EebusFeatureSummary } from './eebusTypes';

interface UseCaseRule {
    id: string;
    label: string;
    classes: DeviceClass[];
    keywords: string[];
}

const RULES: UseCaseRule[] = [
    {
        id: 'coordinatedEVCharging',
        label: 'Coordinated EV charging / EVSE load control',
        classes: ['wallbox'],
        keywords: ['evse', 'electricvehicle', 'electric vehicle', 'charging', 'loadcontrol', 'currentcurtailment', 'overloadprotection'],
    },
    {
        id: 'evChargingMeasurement',
        label: 'EV charging measurement and summary',
        classes: ['wallbox', 'smartMeter'],
        keywords: ['evchargingelectricitymeasurement', 'evchargingsummary', 'evstateofcharge', 'electricalconnection'],
    },
    {
        id: 'gridConnectionMonitoring',
        label: 'Monitoring of grid connection point',
        classes: ['gridConnection', 'smartMeter', 'clsBox'],
        keywords: ['gridconnection', 'grid connection', 'monitoringofgridconnectionpoint', 'measurement'],
    },
    {
        id: 'limitationOfPowerConsumption',
        label: 'Limitation of power consumption',
        classes: ['clsBox', 'wallbox', 'heatPump', 'battery'],
        keywords: ['limitationofpowerconsumption', 'consumptionlimit', 'operatingconstraints', 'loadcontrol'],
    },
    {
        id: 'limitationOfPowerProduction',
        label: 'Limitation of power production',
        classes: ['clsBox', 'inverter', 'battery'],
        keywords: ['limitationofpowerproduction', 'productionlimit', 'inverter', 'operatingconstraints'],
    },
    {
        id: 'pvInverterMonitoring',
        label: 'PV / inverter monitoring',
        classes: ['inverter'],
        keywords: ['inverter', 'photovoltaic', 'pvstring', 'aggregatedphotovoltaic', 'powerproduction'],
    },
    {
        id: 'batteryMonitoringAndControl',
        label: 'Battery monitoring and control',
        classes: ['battery'],
        keywords: ['battery', 'stateofcharge', 'controlofbattery', 'aggregatedbattery'],
    },
    {
        id: 'hvacHeatPumpFlexibility',
        label: 'HVAC / heat pump control and flexibility',
        classes: ['heatPump', 'hvac', 'climate'],
        keywords: ['hvac', 'heatpump', 'heat pump', 'compressorflexibility', 'temperature', 'heating', 'cooling'],
    },
    {
        id: 'tariffAndPowerEnvelope',
        label: 'Tariff / incentive / power envelope',
        classes: ['clsBox', 'gridConnection', 'wallbox', 'battery', 'heatPump'],
        keywords: ['powerenvelope', 'incentivetable', 'timeofusetariff', 'supplycondition'],
    },
];

export function classifyFromDiscovery(node: DiscoveredShipNode): DeviceClass {
    const haystack = [node.name, node.brand, node.model, node.type, node.serial, node.categories.join(','), JSON.stringify(node.txt)]
        .join(' ')
        .toLowerCase();

    if (containsAny(haystack, ['cls', 'controlbox', 'control box', 'steuerbox', 'steuer-box', 'smartmetergateway', 'smgw'])) return 'clsBox';
    if (containsAny(haystack, ['wallbox', 'evse', 'charger', 'charging station', 'ladepunkt', 'ladestation'])) return 'wallbox';
    if (containsAny(haystack, ['inverter', 'wechselrichter', 'photovoltaic', 'pv'])) return 'inverter';
    if (containsAny(haystack, ['battery', 'speicher', 'ess', 'storage'])) return 'battery';
    if (containsAny(haystack, ['smart meter', 'smartmeter', 'meter', 'zähler', 'zaehler'])) return 'smartMeter';
    if (containsAny(haystack, ['grid', 'netzanschluss', 'gridconnection'])) return 'gridConnection';
    if (containsAny(haystack, ['heatpump', 'heat pump', 'wärmepumpe', 'waermepumpe'])) return 'heatPump';
    if (containsAny(haystack, ['hvac', 'climate', 'klima', 'aircondition', 'cooling'])) return 'climate';

    return 'unknown';
}

export function summarizeFeatures(input: {
    deviceTypes?: string[];
    featureTypes?: string[];
    functions?: string[];
    explicitUseCases?: string[];
    rawNodeManagement?: unknown;
    fallbackClass?: DeviceClass;
}): EebusFeatureSummary {
    const deviceTypes = unique(input.deviceTypes || []);
    const featureTypes = unique(input.featureTypes || []);
    const functions = unique(input.functions || []);
    const explicitUseCases = unique(input.explicitUseCases || []);
    const haystack = [...deviceTypes, ...featureTypes, ...functions, ...explicitUseCases, JSON.stringify(input.rawNodeManagement || {})]
        .join(' ')
        .toLowerCase();

    const matchingRules = RULES.filter(rule => rule.keywords.some(keyword => haystack.includes(keyword.toLowerCase())));
    const useCases = unique([...explicitUseCases, ...matchingRules.map(rule => rule.id)]);
    const supportedDeviceClasses = uniqueClasses(matchingRules.flatMap(rule => rule.classes));
    const deviceClass = choosePrimaryClass(deviceTypes, featureTypes, supportedDeviceClasses, input.fallbackClass || 'unknown');

    return {
        deviceClass,
        deviceTypes,
        featureTypes,
        functions,
        useCases,
        supportedDeviceClasses,
        rawNodeManagement: input.rawNodeManagement,
    };
}

function choosePrimaryClass(deviceTypes: string[], featureTypes: string[], classes: DeviceClass[], fallback: DeviceClass): DeviceClass {
    const direct = [...deviceTypes, ...featureTypes].join(' ').toLowerCase();
    if (containsAny(direct, ['wallbox', 'evse', 'charging'])) return 'wallbox';
    if (containsAny(direct, ['clsbox', 'controlbox', 'control box', 'steuerbox'])) return 'clsBox';
    if (containsAny(direct, ['heatpump', 'heat pump'])) return 'heatPump';
    if (containsAny(direct, ['hvac'])) return 'hvac';
    if (containsAny(direct, ['climate', 'cooling'])) return 'climate';
    if (containsAny(direct, ['battery', 'storage'])) return 'battery';
    if (containsAny(direct, ['inverter', 'photovoltaic', 'pv'])) return 'inverter';
    if (containsAny(direct, ['smartmeter', 'smart meter', 'metering'])) return 'smartMeter';
    if (containsAny(direct, ['gridconnection', 'grid connection'])) return 'gridConnection';

    const priority: DeviceClass[] = ['wallbox', 'clsBox', 'heatPump', 'hvac', 'climate', 'battery', 'inverter', 'smartMeter', 'gridConnection'];
    return priority.find(item => classes.includes(item)) || classes[0] || fallback;
}

function containsAny(value: string, needles: string[]): boolean {
    return needles.some(needle => value.includes(needle.toLowerCase()));
}

function unique(values: string[]): string[] {
    return Array.from(new Set(values.map(value => String(value || '').trim()).filter(Boolean))).sort();
}

function uniqueClasses(values: DeviceClass[]): DeviceClass[] {
    return Array.from(new Set(values.filter(value => value && value !== 'unknown'))).sort() as DeviceClass[];
}
