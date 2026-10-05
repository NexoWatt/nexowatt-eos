"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClsControlParser = void 0;
exports.normalizeSpineJson = normalizeSpineJson;
exports.buildSpineResultDatagram = buildSpineResultDatagram;
exports.buildSpineLimitReadbackDatagram = buildSpineLimitReadbackDatagram;
const node_crypto_1 = require("node:crypto");
/**
 * Parses the subset of SPINE needed by IF_CLS_CTRL/LPC. The parser accepts both
 * normal object-shaped JSON and the array-heavy SPINE JSON representation used by
 * several field devices.
 */
class ClsControlParser {
    memoryByDevice = new Map();
    parse(message, context) {
        const receivedAtMs = finiteTimestamp(context.receivedAtMs) ?? Date.now();
        const deviceId = String(context.deviceId || '').trim();
        if (!deviceId)
            return [];
        const memory = this.getMemory(deviceId);
        const datagrams = extractDatagrams(message);
        const events = [];
        for (const datagram of datagrams) {
            for (const command of datagram.commands) {
                const functionName = detectFunctionName(command);
                if (!functionName)
                    continue;
                if (functionName === 'deviceConfigurationKeyValueDescriptionListData') {
                    updateConfigurationDescriptions(memory, command[functionName] ?? command.deviceConfigurationKeyValueDescriptionListData);
                    continue;
                }
                if (functionName === 'deviceConfigurationKeyValueListData') {
                    const changed = updateConfigurationValues(memory, command[functionName] ?? command.deviceConfigurationKeyValueListData);
                    if (changed) {
                        events.push(buildEvent({
                            operation: 'failsafeConfiguration',
                            active: false,
                            limitW: null,
                            receivedAtMs,
                            deviceId,
                            sourceSki: context.sourceSki,
                            header: datagram.header,
                            functionName,
                            memory,
                            limitIds: changed.keyIds,
                            rawSummary: {
                                keyIds: changed.keyIds,
                                failsafeLimitW: memory.failsafeLimitW,
                                failsafeDurationMs: memory.failsafeDurationMs,
                            },
                        }));
                    }
                    continue;
                }
                if (functionName === 'deviceDiagnosisHeartbeatData') {
                    const heartbeat = parseHeartbeat(command[functionName] ?? command.deviceDiagnosisHeartbeatData, receivedAtMs);
                    if (!heartbeat)
                        continue;
                    memory.lastHeartbeatAtMs = heartbeat.heartbeatAtMs;
                    if (heartbeat.heartbeatTimeoutMs !== null)
                        memory.heartbeatTimeoutMs = heartbeat.heartbeatTimeoutMs;
                    events.push(buildEvent({
                        operation: 'heartbeat',
                        active: false,
                        limitW: null,
                        receivedAtMs,
                        deviceId,
                        sourceSki: context.sourceSki,
                        header: datagram.header,
                        functionName,
                        memory,
                        limitIds: [],
                        rawSummary: {
                            heartbeatCounter: heartbeat.heartbeatCounter,
                            heartbeatAtMs: heartbeat.heartbeatAtMs,
                            heartbeatTimeoutMs: heartbeat.heartbeatTimeoutMs,
                        },
                    }));
                    continue;
                }
                if (functionName !== 'loadControlLimitListData')
                    continue;
                const classifier = classifierText(datagram.header.cmdClassifier);
                if (classifier !== 'write' && classifier !== 'writepartial')
                    continue;
                const limit = parseConsumptionLimit(command[functionName] ?? command.loadControlLimitListData, receivedAtMs);
                if (!limit)
                    continue;
                const operation = limit.active ? 'limitConsumption' : 'release';
                events.push(buildEvent({
                    operation,
                    active: limit.active,
                    limitW: limit.limitW,
                    receivedAtMs,
                    deviceId,
                    sourceSki: context.sourceSki,
                    header: datagram.header,
                    functionName,
                    memory,
                    limitIds: limit.limitIds,
                    effectiveFromMs: limit.effectiveFromMs,
                    expiresAtMs: limit.expiresAtMs,
                    rawSummary: {
                        selectedLimitW: limit.limitW,
                        active: limit.active,
                        candidateCount: limit.candidateCount,
                        limitIds: limit.limitIds,
                    },
                }));
            }
        }
        return events;
    }
    getDiagnostics(deviceId) {
        const memory = this.getMemory(deviceId);
        return {
            failsafeLimitW: memory.failsafeLimitW,
            failsafeDurationMs: memory.failsafeDurationMs,
            heartbeatTimeoutMs: memory.heartbeatTimeoutMs,
            lastHeartbeatAtMs: memory.lastHeartbeatAtMs,
            knownConfigurationKeys: Object.fromEntries(memory.keyNamesById.entries()),
        };
    }
    getMemory(deviceId) {
        let memory = this.memoryByDevice.get(deviceId);
        if (!memory) {
            memory = {
                keyNamesById: new Map(),
                failsafeLimitW: null,
                failsafeDurationMs: null,
                heartbeatTimeoutMs: null,
                lastHeartbeatAtMs: null,
            };
            this.memoryByDevice.set(deviceId, memory);
        }
        return memory;
    }
}
exports.ClsControlParser = ClsControlParser;
function buildEvent(input) {
    const msgCounter = finiteInteger(input.header.msgCounter);
    const sourceAddress = objectOrNull(input.header.addressSource);
    const destinationAddress = objectOrNull(input.header.addressDestination);
    const commandFingerprint = JSON.stringify({
        deviceId: input.deviceId,
        msgCounter,
        functionName: input.functionName,
        operation: input.operation,
        limitW: input.limitW,
        limitIds: input.limitIds,
    });
    const suffix = (0, node_crypto_1.createHash)('sha256').update(commandFingerprint).digest('hex').slice(0, 16);
    return {
        apiVersion: 1,
        protocol: 'nexowatt-eebus-para14a',
        commandId: `eebus-${safeToken(input.deviceId)}-${msgCounter ?? 'na'}-${suffix}`,
        operation: input.operation,
        active: input.active,
        limitW: input.limitW,
        failsafeLimitW: input.memory.failsafeLimitW,
        failsafeDurationMs: input.memory.failsafeDurationMs,
        heartbeatTimeoutMs: input.memory.heartbeatTimeoutMs,
        heartbeatAtMs: input.memory.lastHeartbeatAtMs,
        receivedAtMs: input.receivedAtMs,
        effectiveFromMs: input.effectiveFromMs ?? input.receivedAtMs,
        expiresAtMs: input.expiresAtMs ?? null,
        sourceDeviceId: input.deviceId,
        sourceSki: String(input.sourceSki || ''),
        correlation: {
            specificationVersion: String(input.header.specificationVersion || '1.3.0'),
            msgCounter,
            ackRequest: booleanValue(input.header.ackRequest),
            cmdClassifier: classifierText(input.header.cmdClassifier),
            functionName: input.functionName,
            sourceAddress,
            destinationAddress,
            limitIds: input.limitIds,
        },
        rawSummary: input.rawSummary,
    };
}
function extractDatagrams(message) {
    const normalized = normalizeSpineJson(message);
    const candidates = [];
    collectDatagramCandidates(normalized, candidates, new Set());
    const dedupe = new Set();
    const out = [];
    for (const candidate of candidates) {
        const datagram = objectOrNull(candidate.datagram) || candidate;
        const header = objectOrNull(datagram.header);
        const payload = objectOrNull(datagram.payload);
        if (!header || !payload)
            continue;
        const commands = toObjectArray(payload.cmd);
        if (commands.length === 0)
            continue;
        const key = JSON.stringify({
            msgCounter: header.msgCounter,
            classifier: header.cmdClassifier,
            source: header.addressSource,
            destination: header.addressDestination,
            commandFunctions: commands.map(detectFunctionName),
        });
        if (dedupe.has(key))
            continue;
        dedupe.add(key);
        out.push({ header, commands });
    }
    return out;
}
function collectDatagramCandidates(value, out, seen) {
    if (!value || typeof value !== 'object')
        return;
    if (seen.has(value))
        return;
    seen.add(value);
    if (Array.isArray(value)) {
        for (const item of value)
            collectDatagramCandidates(item, out, seen);
        return;
    }
    const rec = value;
    if (rec.datagram) {
        for (const item of toObjectArray(rec.datagram))
            out.push({ datagram: item });
    }
    if (rec.header && rec.payload && (rec.header.cmdClassifier !== undefined || rec.header.msgCounter !== undefined)) {
        out.push(rec);
    }
    for (const child of Object.values(rec))
        collectDatagramCandidates(child, out, seen);
}
/** Converts SPINE's array-of-single-field-objects representation into plain objects. */
function normalizeSpineJson(value) {
    if (Array.isArray(value)) {
        const normalized = value.map(normalizeSpineJson);
        if (normalized.length === 1)
            return normalized[0];
        if (normalized.every(isPlainObject)) {
            const keys = normalized.flatMap(item => Object.keys(item));
            if (new Set(keys).size === keys.length) {
                return Object.assign({}, ...normalized);
            }
        }
        return normalized;
    }
    if (!isPlainObject(value))
        return value;
    const out = {};
    for (const [key, child] of Object.entries(value)) {
        out[key] = normalizeSpineJson(child);
    }
    return out;
}
function detectFunctionName(command) {
    const explicit = String(command.function || '').trim();
    if (explicit)
        return explicit;
    const keys = Object.keys(command).filter(key => /(?:Data|Call)$/.test(key) && key !== 'resultData');
    return keys[0] || '';
}
function parseConsumptionLimit(raw, receivedAtMs) {
    const root = objectOrNull(normalizeSpineJson(raw));
    if (!root)
        return null;
    const entries = toObjectArray(root.loadControlLimitData ?? root);
    if (entries.length === 0)
        return null;
    const candidates = [];
    for (const entry of entries) {
        const type = classifierText(entry.limitType ?? entry.scopeType ?? '');
        if (type.includes('production') || type.includes('feed') || type.includes('export'))
            continue;
        if (type && !type.includes('consumption') && !type.includes('activepower') && !type.includes('powerlimit'))
            continue;
        const id = idScalar(entry.limitId) ?? candidates.length;
        const active = entry.isLimitActive === undefined ? true : booleanValue(entry.isLimitActive);
        const valueW = scaledNumber(entry.value ?? entry.limitValue ?? entry.activePowerLimit);
        const period = objectOrNull(entry.timePeriod);
        const effectiveFromMs = parseAbsoluteOrRelativeTime(period?.startTime, receivedAtMs);
        const expiresAtMs = parseAbsoluteOrRelativeTime(period?.endTime, receivedAtMs);
        candidates.push({ id, active, valueW, effectiveFromMs, expiresAtMs, type });
    }
    if (candidates.length === 0)
        return null;
    const activeRows = candidates.filter(candidate => candidate.active);
    if (activeRows.length === 0) {
        return {
            active: false,
            limitW: null,
            effectiveFromMs: receivedAtMs,
            expiresAtMs: null,
            limitIds: candidates.map(candidate => candidate.id),
            candidateCount: candidates.length,
        };
    }
    const activeCandidates = activeRows.filter(candidate => candidate.valueW !== null && candidate.valueW >= 0);
    if (activeCandidates.length === 0) {
        // A writePartial may only toggle/identify an already active limit and omit
        // its numeric value. This must not be interpreted as a release. The runtime
        // merges the missing value with the last accepted command from this peer.
        return {
            active: true,
            limitW: null,
            effectiveFromMs: receivedAtMs,
            expiresAtMs: null,
            limitIds: activeRows.map(candidate => candidate.id),
            candidateCount: candidates.length,
        };
    }
    // When several applicable limits exist, the strictest one is the safe aggregate
    // limit. Identical per-phase representations therefore collapse naturally.
    const selectedLimitW = Math.min(...activeCandidates.map(candidate => Number(candidate.valueW)));
    const starts = activeCandidates.map(candidate => candidate.effectiveFromMs).filter(isFiniteNumber);
    const ends = activeCandidates.map(candidate => candidate.expiresAtMs).filter(isFiniteNumber);
    return {
        active: true,
        limitW: Math.max(0, selectedLimitW),
        effectiveFromMs: starts.length ? Math.min(...starts) : receivedAtMs,
        expiresAtMs: ends.length ? Math.min(...ends) : null,
        limitIds: activeCandidates.map(candidate => candidate.id),
        candidateCount: candidates.length,
    };
}
function updateConfigurationDescriptions(memory, raw) {
    const root = objectOrNull(normalizeSpineJson(raw));
    if (!root)
        return;
    for (const item of toObjectArray(root.deviceConfigurationKeyValueDescriptionData ?? root)) {
        const keyId = idScalar(item.keyId);
        const keyName = String(item.keyName || '').trim();
        if (keyId === null || !keyName)
            continue;
        memory.keyNamesById.set(String(keyId), keyName);
    }
}
function updateConfigurationValues(memory, raw) {
    const root = objectOrNull(normalizeSpineJson(raw));
    if (!root)
        return null;
    const changedIds = [];
    for (const item of toObjectArray(root.deviceConfigurationKeyValueData ?? root)) {
        const rawId = idScalar(item.keyId);
        if (rawId === null)
            continue;
        const keyId = String(rawId);
        const keyName = String(item.keyName || memory.keyNamesById.get(keyId) || '').trim();
        if (!keyName)
            continue;
        const lower = keyName.toLowerCase();
        if (lower === 'failsafeconsumptionactivepowerlimit') {
            const parsed = scaledNumber(item.value?.scaledNumber ?? item.value ?? item.scaledNumber);
            if (parsed !== null) {
                memory.failsafeLimitW = Math.max(0, parsed);
                changedIds.push(rawId);
            }
        }
        else if (lower === 'failsafedurationminimum') {
            const parsed = durationMs(item.value?.duration ?? item.value ?? item.duration);
            if (parsed !== null) {
                memory.failsafeDurationMs = normalizeFailsafeDurationMs(parsed);
                changedIds.push(rawId);
            }
        }
    }
    return changedIds.length ? { keyIds: changedIds } : null;
}
function parseHeartbeat(raw, fallbackMs) {
    const root = objectOrNull(normalizeSpineJson(raw));
    if (!root)
        return null;
    const heartbeatAtMs = finiteTimestamp(Date.parse(String(root.timestamp || ''))) ?? fallbackMs;
    const heartbeatTimeoutMs = durationMs(root.heartbeatTimeout);
    const heartbeatCounter = finiteInteger(root.heartbeatCounter);
    return { heartbeatAtMs, heartbeatTimeoutMs, heartbeatCounter };
}
function buildSpineResultDatagram(command, localMsgCounter, errorNumber, description = '') {
    const correlation = command.correlation;
    if (correlation.msgCounter === null || !correlation.sourceAddress || !correlation.destinationAddress)
        return null;
    const resultData = {
        errorNumber: Number.isFinite(Number(errorNumber)) ? Math.round(Number(errorNumber)) : 7,
    };
    if (description)
        resultData.description = String(description).slice(0, 240);
    return {
        datagram: {
            header: {
                specificationVersion: correlation.specificationVersion || '1.3.0',
                addressSource: correlation.destinationAddress,
                addressDestination: correlation.sourceAddress,
                msgCounter: localMsgCounter,
                msgCounterReference: correlation.msgCounter,
                cmdClassifier: 'result',
                timestamp: new Date().toISOString(),
            },
            payload: {
                cmd: [{ resultData }],
            },
        },
    };
}
/**
 * Sends the accepted/effective LPC limit back over the already discovered
 * LoadControl feature. This is a controller readback, not a substitute for
 * MPC/MGCP measurement data.
 */
function buildSpineLimitReadbackDatagram(command, localMsgCounter, active, effectiveLimitW) {
    const correlation = command.correlation;
    if (!correlation.sourceAddress || !correlation.destinationAddress || correlation.limitIds.length === 0)
        return null;
    const rows = correlation.limitIds.map(limitId => ({
        limitId,
        isLimitActive: active === true,
        value: scaledNumberData(active && Number.isFinite(Number(effectiveLimitW)) ? Number(effectiveLimitW) : 0),
    }));
    return {
        datagram: {
            header: {
                specificationVersion: correlation.specificationVersion || '1.3.0',
                addressSource: correlation.destinationAddress,
                addressDestination: correlation.sourceAddress,
                msgCounter: localMsgCounter,
                cmdClassifier: 'notify',
                timestamp: new Date().toISOString(),
            },
            payload: {
                cmd: [
                    {
                        function: 'loadControlLimitListData',
                        loadControlLimitListData: { loadControlLimitData: rows },
                    },
                ],
            },
        },
    };
}
function scaledNumberData(value) {
    const finite = Number.isFinite(Number(value)) ? Number(value) : 0;
    return { number: Math.round(finite), scale: 0 };
}
function scaledNumber(value) {
    const normalized = normalizeSpineJson(value);
    if (typeof normalized === 'number')
        return Number.isFinite(normalized) ? normalized : null;
    if (typeof normalized === 'string' && normalized.trim()) {
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : null;
    }
    const rec = objectOrNull(normalized);
    if (!rec)
        return null;
    if (rec.scaledNumber !== undefined)
        return scaledNumber(rec.scaledNumber);
    const number = Number(scalar(rec.number));
    const scale = Number(scalar(rec.scale) ?? 0);
    if (!Number.isFinite(number) || !Number.isFinite(scale))
        return null;
    const result = number * 10 ** scale;
    return Number.isFinite(result) ? result : null;
}
function durationMs(value) {
    const normalized = normalizeSpineJson(value);
    if (typeof normalized === 'number')
        return Number.isFinite(normalized) ? Math.max(0, normalized * 1000) : null;
    const text = String(scalar(normalized) ?? '').trim();
    if (!text)
        return null;
    const iso = text.match(/^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i);
    if (!iso)
        return null;
    const days = Number(iso[1] || 0);
    const hours = Number(iso[2] || 0);
    const minutes = Number(iso[3] || 0);
    const seconds = Number(iso[4] || 0);
    const result = (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000;
    return Number.isFinite(result) ? Math.max(0, result) : null;
}
function parseAbsoluteOrRelativeTime(value, baseMs) {
    const text = String(scalar(normalizeSpineJson(value)) ?? '').trim();
    if (!text)
        return null;
    const absolute = Date.parse(text);
    if (Number.isFinite(absolute))
        return absolute;
    const relative = durationMs(text);
    return relative === null ? null : baseMs + relative;
}
function toObjectArray(value) {
    const normalized = normalizeSpineJson(value);
    if (Array.isArray(normalized))
        return normalized.filter(isPlainObject);
    return isPlainObject(normalized) ? [normalized] : [];
}
function objectOrNull(value) {
    const normalized = normalizeSpineJson(value);
    return isPlainObject(normalized) ? normalized : null;
}
function scalar(value) {
    const normalized = normalizeSpineJson(value);
    if (typeof normalized === 'number' || typeof normalized === 'string' || typeof normalized === 'boolean')
        return normalized;
    return null;
}
function idScalar(value) {
    const parsed = scalar(value);
    if (typeof parsed === 'number' || typeof parsed === 'string')
        return parsed;
    return null;
}
function classifierText(value) {
    const normalized = normalizeSpineJson(value);
    if (typeof normalized === 'string')
        return normalized.trim().toLowerCase().replace(/[\s_-]+/g, '');
    if (isPlainObject(normalized)) {
        const key = Object.keys(normalized).find(candidate => {
            const v = normalized[candidate];
            return v === true || v === null || v === undefined || isPlainObject(v);
        });
        return String(key || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
    }
    return String(normalized ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
}
function normalizeFailsafeDurationMs(value) {
    if (!Number.isFinite(value) || value <= 0)
        return 0;
    return Math.min(24 * 60 * 60 * 1000, Math.max(2 * 60 * 60 * 1000, Math.round(value)));
}
function finiteTimestamp(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
function finiteInteger(value) {
    const parsed = Number(scalar(normalizeSpineJson(value)) ?? value);
    return Number.isFinite(parsed) ? Math.round(parsed) : null;
}
function booleanValue(value) {
    const scalarValue = scalar(normalizeSpineJson(value));
    if (scalarValue === true || scalarValue === 1 || scalarValue === '1')
        return true;
    if (scalarValue === false || scalarValue === 0 || scalarValue === '0')
        return false;
    return String(scalarValue || '').toLowerCase() === 'true';
}
function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}
function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function safeToken(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 48) || 'unknown';
}
//# sourceMappingURL=clsControlParser.js.map