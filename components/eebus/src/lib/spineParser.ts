import { DeviceClass, SpineAnalysisResult, SpineMeasurementUpdate } from './eebusTypes';
import { summarizeFeatures } from './useCaseRegistry';

export function analyzeSpineMessage(input: unknown, fallbackClass: DeviceClass = 'unknown'): SpineAnalysisResult {
    const payload = extractSpinePayload(input);
    const root = payload ?? input;
    const nodeManagement = firstValueByKey(root, 'nodeManagementDetailedDiscoveryData');
    const featureData = collectFeatureInformation(nodeManagement ?? root);
    const measurementUpdates = collectMeasurementUpdates(root);

    const featureSummary = featureData.hasAny
        ? summarizeFeatures({
              deviceTypes: featureData.deviceTypes,
              featureTypes: featureData.featureTypes,
              functions: featureData.functions,
              explicitUseCases: featureData.useCases,
              rawNodeManagement: nodeManagement,
              fallbackClass,
          })
        : undefined;

    return {
        featureSummary,
        measurementUpdates,
        deviceClass: featureSummary?.deviceClass ?? fallbackClass,
        rawPayload: root,
    };
}

export function extractSpinePayload(input: unknown): unknown {
    const obj = asRecord(input);
    if (!obj) return undefined;

    if (obj.data && asRecord(obj.data)?.payload) return asRecord(obj.data)?.payload;
    if (obj.header && asRecord(obj.header)?.protocolId && obj.payload) return obj.payload;
    if (obj.datagram || obj.cmd || obj.payload) return obj;

    return undefined;
}

function collectFeatureInformation(input: unknown): {
    hasAny: boolean;
    deviceTypes: string[];
    featureTypes: string[];
    functions: string[];
    useCases: string[];
} {
    const deviceTypes: string[] = [];
    const featureTypes: string[] = [];
    const functions: string[] = [];
    const useCases: string[] = [];

    for (const value of valuesByKey(input, 'deviceType')) deviceTypes.push(String(value));
    for (const value of valuesByKey(input, 'entityType')) deviceTypes.push(String(value));
    for (const value of valuesByKey(input, 'featureType')) featureTypes.push(String(value));
    for (const value of valuesByKey(input, 'feature')) featureTypes.push(String(value));
    for (const value of valuesByKey(input, 'type')) featureTypes.push(String(value));
    for (const value of valuesByKey(input, 'specificUsage')) pushAnyString(useCases, value);

    for (const value of valuesByKey(input, 'useCaseName')) pushAnyString(useCases, value);
    for (const value of valuesByKey(input, 'useCase')) pushAnyString(useCases, value);
    for (const value of valuesByKey(input, 'useCaseSupport')) pushAnyString(useCases, value);
    for (const value of valuesByKey(input, 'useCaseInformation')) pushAnyString(useCases, value);
    for (const value of valuesByKey(input, 'scenarioSupport')) pushAnyString(useCases, value);

    for (const supportedFunction of valuesByKey(input, 'supportedFunction')) {
        const fn = asRecord(supportedFunction)?.function;
        if (fn) functions.push(String(fn));
        if (!fn) pushAnyString(functions, supportedFunction);
    }
    for (const fn of valuesByKey(input, 'function')) pushAnyString(functions, fn);

    return {
        hasAny: deviceTypes.length > 0 || featureTypes.length > 0 || functions.length > 0 || useCases.length > 0,
        deviceTypes: unique(deviceTypes),
        featureTypes: unique(featureTypes),
        functions: unique(functions),
        useCases: unique(useCases),
    };
}

function collectMeasurementUpdates(input: unknown): SpineMeasurementUpdate[] {
    const updates: SpineMeasurementUpdate[] = [];
    const descriptionById = new Map<string, { type?: string; unit?: string; scope?: string; commodity?: string }>();

    for (const list of valuesByKey(input, 'measurementDescriptionListData')) {
        for (const item of asArray(asRecord(list)?.measurementDescriptionData)) {
            const rec = asRecord(item);
            if (!rec?.measurementId) continue;
            descriptionById.set(String(rec.measurementId), {
                type: stringOrUndefined(rec.measurementType),
                unit: stringOrUndefined(rec.unit),
                scope: stringOrUndefined(rec.scopeType),
                commodity: stringOrUndefined(rec.commodityType),
            });
        }
    }

    for (const list of valuesByKey(input, 'measurementListData')) {
        for (const item of asArray(asRecord(list)?.measurementData)) {
            const rec = asRecord(item);
            if (!rec) continue;
            const id = rec.measurementId != null ? String(rec.measurementId) : '';
            const description = descriptionById.get(id) || {};
            const measurementType = description.type || inferMeasurementType(rec, description);
            const value = scaledNumber(rec.value);
            if (!measurementType || value == null) continue;
            const stateId = measurementTypeToStateId(measurementType, description.scope, description.commodity);
            if (stateId) updates.push({ stateId, value });
        }
    }

    // Some devices send compact data without a description list. Extract explicit state-like values as fallback.
    for (const key of ['power', 'activePower', 'gridPower', 'pvPower', 'batteryPower', 'voltage', 'current', 'frequency', 'soc', 'stateOfCharge', 'temperature']) {
        for (const value of valuesByKey(input, key)) {
            const number = scaledNumber(value);
            if (number == null) continue;
            const stateId = explicitKeyToStateId(key);
            if (stateId) updates.push({ stateId, value: number });
        }
    }

    for (const key of ['chargingState', 'operatingState']) {
        for (const value of valuesByKey(input, key)) {
            if (typeof value === 'string') updates.push({ stateId: key, value });
        }
    }

    return dedupeUpdates(updates);
}

function measurementTypeToStateId(type: string, scope?: string, commodity?: string): string | undefined {
    const normalized = `${type} ${scope || ''} ${commodity || ''}`.toLowerCase();
    if (normalized.includes('voltage')) return 'voltage';
    if (normalized.includes('current')) return 'current';
    if (normalized.includes('frequency')) return 'frequency';
    if (normalized.includes('energy')) return 'energy';
    if (normalized.includes('percentage') || normalized.includes('stateofcharge') || normalized.includes('soc')) return 'soc';
    if (normalized.includes('temperature')) return 'temperature';
    if (normalized.includes('power')) {
        if (normalized.includes('photovoltaic') || normalized.includes('pv') || normalized.includes('solar')) return 'pvPower';
        if (normalized.includes('battery') || normalized.includes('storage')) return 'batteryPower';
        if (normalized.includes('grid') || normalized.includes('connection')) return 'gridPower';
        if (normalized.includes('produce') || normalized.includes('production')) return 'exportPower';
        if (normalized.includes('consume') || normalized.includes('consumption')) return 'importPower';
        return 'power';
    }
    return undefined;
}

function inferMeasurementType(rec: Record<string, unknown>, description: Record<string, unknown>): string {
    const haystack = JSON.stringify({ rec, description }).toLowerCase();
    if (haystack.includes('voltage')) return 'voltage';
    if (haystack.includes('current')) return 'current';
    if (haystack.includes('frequency')) return 'frequency';
    if (haystack.includes('energy')) return 'energy';
    if (haystack.includes('soc') || haystack.includes('stateofcharge')) return 'percentage';
    if (haystack.includes('temperature')) return 'temperature';
    if (haystack.includes('power')) return 'power';
    return '';
}

function explicitKeyToStateId(key: string): string | undefined {
    const map: Record<string, string> = {
        power: 'power',
        activePower: 'power',
        gridPower: 'gridPower',
        pvPower: 'pvPower',
        batteryPower: 'batteryPower',
        voltage: 'voltage',
        current: 'current',
        frequency: 'frequency',
        soc: 'soc',
        stateOfCharge: 'soc',
        temperature: 'temperature',
    };
    return map[key];
}

function scaledNumber(value: unknown): number | undefined {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
    const rec = asRecord(value);
    if (!rec) return undefined;
    const number = Number(rec.number ?? rec.value ?? rec.val);
    if (!Number.isFinite(number)) return undefined;
    const scale = Number(rec.scale ?? 0);
    return Number.isFinite(scale) ? number * Math.pow(10, scale) : number;
}

function firstValueByKey(input: unknown, key: string): unknown {
    return valuesByKey(input, key)[0];
}

function valuesByKey(input: unknown, key: string): unknown[] {
    const result: unknown[] = [];
    visit(input, (currentKey, value) => {
        if (currentKey === key) result.push(value);
    });
    return result;
}

function visit(input: unknown, callback: (key: string, value: unknown) => void): void {
    if (Array.isArray(input)) {
        for (const item of input) visit(item, callback);
        return;
    }
    const rec = asRecord(input);
    if (!rec) return;
    for (const [key, value] of Object.entries(rec)) {
        callback(key, value);
        visit(value, callback);
    }
}

function asRecord(input: unknown): Record<string, unknown> | undefined {
    return input && typeof input === 'object' && !Array.isArray(input) ? (input as Record<string, unknown>) : undefined;
}

function asArray(input: unknown): unknown[] {
    if (input == null) return [];
    return Array.isArray(input) ? input : [input];
}

function pushAnyString(target: string[], value: unknown): void {
    if (value == null) return;
    if (Array.isArray(value)) {
        for (const item of value) pushAnyString(target, item);
        return;
    }
    if (typeof value === 'object') {
        for (const item of Object.values(value as Record<string, unknown>)) pushAnyString(target, item);
        return;
    }
    target.push(String(value));
}

function stringOrUndefined(value: unknown): string | undefined {
    return value == null ? undefined : String(value);
}

function unique(values: string[]): string[] {
    return Array.from(new Set(values.map(value => String(value || '').trim()).filter(Boolean))).sort();
}

function dedupeUpdates(updates: SpineMeasurementUpdate[]): SpineMeasurementUpdate[] {
    const map = new Map<string, SpineMeasurementUpdate>();
    for (const update of updates) map.set(update.stateId, update);
    return Array.from(map.values());
}
