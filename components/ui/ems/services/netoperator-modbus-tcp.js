/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts
 * Quell-Hash: sha256:41e932d77e2d2f7dbd5a3b608110b94eaebd5f28fb9185eef29b45b4a6330b7e
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/netoperator-modbus-tcp.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Kapselt den Modbus-TCP-Transport der Netzbetreiber-Schnittstelle und die damit verbundenen Kommunikationsgrenzen.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetOperatorModbusTcpConnector = exports.ModbusTcpClient = void 0;
exports.decodeModbusValue = decodeModbusValue;
exports.classifyQuality = classifyQuality;
const netoperator_canonical_model_1 = require("./netoperator-canonical-model");
const net = require('node:net');
function finite(value, fallback) {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === ''))
        return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}
function finiteOrNull(value) {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === ''))
        return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}
function descriptorMapped(mapping) {
    return !!(mapping && finiteOrNull(mapping.address) !== null);
}
function registerCount(mapping) {
    if (Number.isFinite(Number(mapping.registers)) && Number(mapping.registers) > 0)
        return Math.round(Number(mapping.registers));
    const type = String(mapping.dataType || '').toLowerCase();
    if (['int32', 'uint32', 'float32', 'datetime'].includes(type))
        return 2;
    if (['int64', 'uint64', 'float64'].includes(type))
        return 4;
    if (type === 'string')
        return 8;
    return 1;
}
function functionCode(mapping) {
    if (Number.isFinite(Number(mapping.functionCode)))
        return Math.round(Number(mapping.functionCode));
    const area = String(mapping.area || 'holding').toLowerCase();
    if (area === 'coil')
        return 1;
    if (area === 'discrete')
        return 2;
    if (area === 'input')
        return 4;
    return 3;
}
function reorderBytes(input, order) {
    const normalized = String(order || (input.length <= 2 ? 'AB' : 'ABCD')).toUpperCase();
    let output = Buffer.from(input);
    if (normalized === 'BA' || normalized === 'BADC') {
        for (let index = 0; index + 1 < output.length; index += 2) {
            const tmp = output[index];
            output[index] = output[index + 1];
            output[index + 1] = tmp;
        }
        return output;
    }
    if (normalized === 'CDAB' && output.length >= 4 && output.length % 2 === 0) {
        const half = output.length / 2;
        output = Buffer.concat([output.subarray(half), output.subarray(0, half)]);
        return output;
    }
    if (normalized === 'DCBA')
        return Buffer.from(Array.from(output).reverse());
    return output;
}
function requireBytes(data, minimum, type) {
    if (data.length < minimum)
        throw new Error(`modbus-value-too-short:${type}:${data.length}<${minimum}`);
}
function safeBigIntNumber(value) {
    const max = BigInt(Number.MAX_SAFE_INTEGER);
    const min = BigInt(Number.MIN_SAFE_INTEGER);
    return value <= max && value >= min ? Number(value) : value.toString();
}
function decodeModbusValue(data, mapping) {
    const type = String(mapping.dataType || 'uint16').toLowerCase();
    if (type === 'boolean' || type === 'bool') {
        if (mapping.area === 'coil' || mapping.area === 'discrete') {
            requireBytes(data, 1, type);
            return (data[0] & 0x01) === 0x01;
        }
        requireBytes(data, 2, type);
        const raw = data.readUInt16BE(0);
        if (Number.isFinite(Number(mapping.bit)))
            return ((raw >> Number(mapping.bit)) & 1) === 1;
        return raw !== 0;
    }
    const ordered = reorderBytes(data, mapping.byteOrder || 'ABCD');
    let value;
    if (type === 'int16') {
        requireBytes(ordered, 2, type);
        value = ordered.readInt16BE(0);
    }
    else if (type === 'uint16' || type === 'enum') {
        requireBytes(ordered, 2, type);
        value = ordered.readUInt16BE(0);
    }
    else if (type === 'int32') {
        requireBytes(ordered, 4, type);
        value = ordered.readInt32BE(0);
    }
    else if (type === 'uint32' || type === 'datetime') {
        requireBytes(ordered, 4, type);
        value = ordered.readUInt32BE(0);
    }
    else if (type === 'int64') {
        requireBytes(ordered, 8, type);
        value = safeBigIntNumber(ordered.readBigInt64BE(0));
    }
    else if (type === 'uint64') {
        requireBytes(ordered, 8, type);
        value = safeBigIntNumber(ordered.readBigUInt64BE(0));
    }
    else if (type === 'float32') {
        requireBytes(ordered, 4, type);
        value = ordered.readFloatBE(0);
    }
    else if (type === 'float64') {
        requireBytes(ordered, 8, type);
        value = ordered.readDoubleBE(0);
    }
    else if (type === 'string')
        value = ordered.toString('utf8').replace(/\0+$/g, '').trim();
    else {
        requireBytes(ordered, 2, type);
        value = ordered.readUInt16BE(0);
    }
    if (typeof value === 'number') {
        const scale = Number.isFinite(Number(mapping.scale)) ? Number(mapping.scale) : 1;
        const offset = Number.isFinite(Number(mapping.offset)) ? Number(mapping.offset) : 0;
        value = value * scale + offset;
    }
    if (mapping.enumMap && Object.prototype.hasOwnProperty.call(mapping.enumMap, String(value))) {
        value = mapping.enumMap[String(value)];
    }
    return value;
}
function valueMatches(candidate, expected) {
    if (candidate === expected)
        return true;
    if (candidate === null || candidate === undefined || expected === null || expected === undefined)
        return false;
    return String(candidate).trim().toLowerCase() === String(expected).trim().toLowerCase();
}
function classifyQuality(value, descriptor) {
    if (!descriptor)
        return 'good';
    const goodValues = Array.isArray(descriptor.goodValues) ? descriptor.goodValues : [];
    const staleValues = Array.isArray(descriptor.staleValues) ? descriptor.staleValues : [];
    const badValues = Array.isArray(descriptor.badValues) ? descriptor.badValues : [];
    if (staleValues.some((entry) => valueMatches(value, entry)))
        return 'stale';
    if (badValues.some((entry) => valueMatches(value, entry)))
        return 'bad';
    if (goodValues.length)
        return goodValues.some((entry) => valueMatches(value, entry)) ? 'good' : 'bad';
    // Ohne explizite Herstellerklassifikation wird ein separates Quality-Signal
    // fail-closed behandelt. So kann ein unbekannter Code niemals unbemerkt als
    // gültige Netzbetreiber-Vorgabe in den kanonischen Snapshot gelangen.
    return 'bad';
}
class ModbusTcpClient {
    constructor(options) {
        this.socket = null;
        this.transactionId = 0;
        this.queue = Promise.resolve();
        this.options = {
            host: String(options.host || '').trim(),
            port: Math.max(1, Math.min(65535, Math.round(finite(options.port, 502)))),
            unitId: Math.max(0, Math.min(255, Math.round(finite(options.unitId, 1)))),
            timeoutMs: Math.max(250, Math.min(30000, Math.round(finite(options.timeoutMs, 2000)))),
        };
    }
    async connect() {
        if (this.socket && !this.socket.destroyed)
            return;
        if (!this.options.host)
            throw new Error('modbus-host-missing');
        this.socket = await new Promise((resolve, reject) => {
            const socket = net.createConnection({ host: this.options.host, port: this.options.port });
            const onConnectError = (error) => {
                clearTimeout(timer);
                socket.off('connect', onConnect);
                reject(error);
            };
            const onConnect = () => {
                clearTimeout(timer);
                socket.off('error', onConnectError);
                socket.setNoDelay(true);
                resolve(socket);
            };
            const timer = setTimeout(() => {
                socket.off('error', onConnectError);
                socket.off('connect', onConnect);
                socket.destroy();
                reject(new Error('modbus-connect-timeout'));
            }, this.options.timeoutMs);
            socket.once('connect', onConnect);
            socket.once('error', onConnectError);
        });
    }
    close() {
        if (this.socket) {
            try {
                this.socket.destroy();
            }
            catch (_error) { /* ignore */ }
        }
        this.socket = null;
    }
    async request(pdu) {
        const run = async () => {
            await this.connect();
            const socket = this.socket;
            if (!socket || socket.destroyed)
                throw new Error('modbus-not-connected');
            this.transactionId = (this.transactionId + 1) & 0xffff;
            const transactionId = this.transactionId;
            const frame = Buffer.alloc(7 + pdu.length);
            frame.writeUInt16BE(transactionId, 0);
            frame.writeUInt16BE(0, 2);
            frame.writeUInt16BE(pdu.length + 1, 4);
            frame.writeUInt8(this.options.unitId, 6);
            pdu.copy(frame, 7);
            return await new Promise((resolve, reject) => {
                let buffer = Buffer.alloc(0);
                const cleanup = () => {
                    clearTimeout(timer);
                    socket.off('data', onData);
                    socket.off('error', onError);
                    socket.off('close', onClose);
                };
                const onError = (error) => { cleanup(); this.close(); reject(error); };
                const onClose = () => { cleanup(); this.close(); reject(new Error('modbus-connection-closed')); };
                const onData = (chunk) => {
                    buffer = Buffer.concat([buffer, chunk]);
                    if (buffer.length > 1024 * 1024) {
                        cleanup();
                        this.close();
                        reject(new Error('modbus-response-too-large'));
                        return;
                    }
                    if (buffer.length < 7)
                        return;
                    const protocolId = buffer.readUInt16BE(2);
                    const length = buffer.readUInt16BE(4);
                    if (protocolId !== 0 || length < 2 || length > 260) {
                        cleanup();
                        this.close();
                        reject(new Error('modbus-mbap-invalid'));
                        return;
                    }
                    const totalLength = 6 + length;
                    if (buffer.length < totalLength)
                        return;
                    const response = buffer.subarray(0, totalLength);
                    const responseTx = response.readUInt16BE(0);
                    if (responseTx !== transactionId)
                        return;
                    cleanup();
                    const responsePdu = response.subarray(7);
                    if ((responsePdu[0] & 0x80) !== 0) {
                        reject(new Error(`modbus-exception-${responsePdu[1] || 0}`));
                        return;
                    }
                    resolve(responsePdu);
                };
                const timer = setTimeout(() => {
                    cleanup();
                    this.close();
                    reject(new Error('modbus-request-timeout'));
                }, this.options.timeoutMs);
                socket.on('data', onData);
                socket.once('error', onError);
                socket.once('close', onClose);
                socket.write(frame, (error) => { if (error)
                    onError(error); });
            });
        };
        const next = this.queue.then(run, run);
        this.queue = next.then(() => undefined, () => undefined);
        return next;
    }
    async read(mapping) {
        const fc = functionCode(mapping);
        const addressRaw = finiteOrNull(mapping.address);
        if (addressRaw === null)
            throw new Error('modbus-register-address-missing');
        const address = Math.round(addressRaw) - (mapping.addressBase === 1 ? 1 : 0);
        if (address < 0 || address > 65535)
            throw new Error('modbus-register-address-invalid');
        const quantity = (fc === 1 || fc === 2) ? 1 : registerCount(mapping);
        if (quantity < 1 || quantity > 125)
            throw new Error('modbus-register-count-invalid');
        const pdu = Buffer.alloc(5);
        pdu.writeUInt8(fc, 0);
        pdu.writeUInt16BE(address, 1);
        pdu.writeUInt16BE(quantity, 3);
        const response = await this.request(pdu);
        if (response[0] !== fc)
            throw new Error('modbus-function-mismatch');
        const byteCount = response[1];
        const data = response.subarray(2, 2 + byteCount);
        if (data.length !== byteCount)
            throw new Error('modbus-short-response');
        if ((fc === 3 || fc === 4) && byteCount < quantity * 2)
            throw new Error('modbus-register-response-short');
        return data;
    }
}
exports.ModbusTcpClient = ModbusTcpClient;
class NetOperatorModbusTcpConnector {
    constructor(options, profile) {
        this.client = new ModbusTcpClient(options);
        this.profile = profile;
        this.source = `${profile.manufacturer}/${profile.model}`;
    }
    close() {
        this.client.close();
    }
    async readDescriptor(descriptor) {
        const bytes = await this.client.read(descriptor);
        return { value: decodeModbusValue(bytes, descriptor), bytesHex: bytes.toString('hex') };
    }
    async poll() {
        const startedAt = Date.now();
        const rawValues = {};
        const metadata = {};
        const raw = {};
        const requiredErrors = [];
        const optionalErrors = [];
        let successfulReads = 0;
        try {
            for (const [key, mapping] of Object.entries(this.profile.signals || {})) {
                if (mapping.access === 'write' || !descriptorMapped(mapping))
                    continue;
                const required = mapping.required === true || netoperator_canonical_model_1.REQUIRED_READ_KEYS.includes(key);
                try {
                    const primary = await this.readDescriptor(mapping);
                    successfulReads += 1;
                    let quality = 'good';
                    let timestamp = Date.now();
                    const detail = {
                        value: primary.value,
                        bytesHex: primary.bytesHex,
                        address: mapping.address,
                        area: mapping.area || 'holding',
                    };
                    if (mapping.quality && descriptorMapped(mapping.quality)) {
                        const qualityRead = await this.readDescriptor(mapping.quality);
                        quality = classifyQuality(qualityRead.value, mapping.quality);
                        detail.quality = { value: qualityRead.value, classification: quality, bytesHex: qualityRead.bytesHex, address: mapping.quality.address };
                    }
                    if (mapping.timestamp && descriptorMapped(mapping.timestamp)) {
                        const timestampRead = await this.readDescriptor(mapping.timestamp);
                        const parsedTimestamp = finiteOrNull(timestampRead.value);
                        if (parsedTimestamp !== null)
                            timestamp = parsedTimestamp;
                        detail.timestamp = { value: timestampRead.value, bytesHex: timestampRead.bytesHex, address: mapping.timestamp.address };
                    }
                    rawValues[key] = primary.value;
                    metadata[key] = { timestamp, quality, source: this.source, enumMap: mapping.enumMap };
                    raw[key] = detail;
                }
                catch (error) {
                    const message = `${key}:${error instanceof Error ? error.message : String(error)}`;
                    (required ? requiredErrors : optionalErrors).push(message);
                    metadata[key] = { timestamp: Date.now(), quality: 'bad', source: this.source, enumMap: mapping.enumMap };
                }
            }
            const transportOk = requiredErrors.length === 0 && successfulReads > 0;
            if (!Object.prototype.hasOwnProperty.call(rawValues, 'controller.comm_ok'))
                rawValues['controller.comm_ok'] = transportOk;
            return {
                ok: transportOk,
                rawValues,
                metadata,
                latencyMs: Date.now() - startedAt,
                error: requiredErrors.join(';'),
                warnings: optionalErrors,
                raw,
            };
        }
        catch (error) {
            this.close();
            return {
                ok: false,
                rawValues,
                metadata,
                latencyMs: Date.now() - startedAt,
                error: error instanceof Error ? error.message : String(error),
                warnings: optionalErrors,
                raw,
            };
        }
    }
}
exports.NetOperatorModbusTcpConnector = NetOperatorModbusTcpConnector;
