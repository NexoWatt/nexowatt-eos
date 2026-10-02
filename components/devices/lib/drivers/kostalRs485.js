'use strict';

const { acquireBus, releaseBus } = require('./kostalRs485Bus');
const { applyNumericTransforms, coerceBoolean } = require('../utils');

function parseId(idStr) {
  if (typeof idStr === 'number') return idStr >>> 0;
  if (typeof idStr !== 'string') throw new Error('Invalid Kostal ID type');
  const s = idStr.trim().toLowerCase();
  if (s.startsWith('0x')) return parseInt(s, 16) >>> 0;
  return parseInt(s, 10) >>> 0;
}

function parseValue(buf, dataType) {
  if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf || []);
  const dt = (dataType || '').toString().toLowerCase();
  if (dt === 'float' || dt === 'float32') {
    if (buf.length < 4) throw new Error('Kostal RS485: float requires 4 bytes');
    return buf.readFloatLE(0);
  }
  if (dt === 'uint8') return buf.readUInt8(0);
  if (dt === 'int8') return buf.readInt8(0);
  if (dt === 'uint16') {
    if (buf.length < 2) throw new Error('Kostal RS485: uint16 requires 2 bytes');
    return buf.readUInt16LE(0);
  }
  if (dt === 'int16') {
    if (buf.length < 2) throw new Error('Kostal RS485: int16 requires 2 bytes');
    return buf.readInt16LE(0);
  }
  if (dt === 'uint32') {
    if (buf.length < 4) throw new Error('Kostal RS485: uint32 requires 4 bytes');
    return buf.readUInt32LE(0);
  }
  if (dt === 'int32') {
    if (buf.length < 4) throw new Error('Kostal RS485: int32 requires 4 bytes');
    return buf.readInt32LE(0);
  }
  if (dt === 'string') {
    const zero = buf.indexOf(0);
    const out = (zero >= 0 ? buf.subarray(0, zero) : buf).toString('utf8');
    return out.replace(/\0/g, '').trim();
  }
  if (dt === 'bool' || dt === 'boolean') {
    return coerceBoolean(buf.length ? buf[0] : 0);
  }
  // fallback
  if (buf.length >= 4) return buf.readFloatLE(0);
  if (buf.length >= 2) return buf.readUInt16LE(0);
  if (buf.length >= 1) return buf.readUInt8(0);
  return null;
}

/**
 * Kostal PIKO RS485 driver (COBS encoded telegrams, 0x00 delimited).
 *
 * Read-only implementation for operating data / parameters.
 */
class KostalRs485Driver {
  constructor(adapter, deviceConfig, template, globalConfig) {
    this.adapter = adapter;
    this.cfg = deviceConfig || {};
    this.template = template || {};
    this.global = globalConfig || {};

    this.busKey = null;
    this.bus = null;
    this._busy = false;
  }

  _getConn() {
    const c = this.cfg.connection || {};
    return {
      path: (c.path || '').toString().trim(),
      baudRate: Number(c.baudRate || 19200),
      parity: (c.parity || 'none').toString(),
      dataBits: Number(c.dataBits || 8),
      stopBits: Number(c.stopBits || 1),
      unitId: Number((c.unitId !== undefined && c.unitId !== null) ? c.unitId : 255),
      timeoutMs: Number(c.timeoutMs || 2000),
    };
  }

  async connect() {
    if (this.bus) {
      await this.bus.ensureConnected();
      return;
    }
    const conn = this._getConn();
    const ref = acquireBus(this.adapter, conn);
    this.busKey = ref.key;
    this.bus = ref.bus;
    await this.bus.ensureConnected();
  }

  async disconnect() {
    if (this.busKey) {
      releaseBus(this.busKey);
      this.busKey = null;
    }
    this.bus = null;
  }

  async readDatapoints(datapoints) {
    if (!this.bus) await this.connect();
    if (!this.bus) throw new Error('Kostal RS485: not connected');
    if (this._busy) throw new Error('Kostal RS485: busy');
    this._busy = true;

    try {
      const conn = this._getConn();
      const dps = Array.isArray(datapoints) ? datapoints : [];
      const kostalDps = dps.filter(dp => dp && dp.source && dp.source.kind === 'kostal' && dp.source.id);

      const groups = new Map(); // id -> [dp]
      for (const dp of kostalDps) {
        const id = parseId(dp.source.id);
        if (!groups.has(id)) groups.set(id, []);
        groups.get(id).push(dp);
      }

      const values = {};
      for (const [id, list] of groups.entries()) {
        const dp0 = list[0];
        const src0 = dp0.source || {};
        const dataType = src0.dataType || 'float';

        const frame = await this.bus.transactRead(conn.unitId, id, conn.timeoutMs);

        if (!Buffer.isBuffer(frame) || frame.length < 7) {
          throw new Error('Kostal RS485: invalid response length');
        }

        // Payload layout (decoded):
        // [0..4] header/unspecified, [5..n-2] data, [n-1] checksum
        const data = frame.subarray(5, frame.length - 1);
        const v = parseValue(data, dataType);

        for (const dp of list) {
          const src = dp.source || {};
          let out = v;
          if (typeof out === 'number' && Number.isFinite(out)) {
            out = applyNumericTransforms(out, src);
          }
          values[dp.id] = out;
        }
      }
      return values;
    } finally {
      this._busy = false;
    }
  }

  async writeDatapoint() {
    throw new Error('Kostal RS485: write not supported');
  }
}

module.exports = {
  KostalRs485Driver,
};
