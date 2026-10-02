'use strict';

/*
  CAN bus driver (SocketCAN via can-utils)

  Dependency-free (no native Node addons). Requires Linux can-utils:
    - candump (receive)
    - cansend (transmit)

  Supports:
  - event-driven updates (no polling)
  - raw frame states (computed)
  - field extraction from CAN payload (byteOffset/byteLength + dataType)
  - writing raw frames or field values (best-effort)
*/

const { spawn } = require('child_process');
const { canInterface, canTool, sendCanFrame } = require('../canSecurity');
const readline = require('readline');
const { applyNumericTransforms, coerceBoolean } = require('../utils');

function _errMsg(err) {
  try { return (err && err.message) ? String(err.message) : String(err); } catch (_) { return String(err); }
}

function parseCanId(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v);
  const s = String(v).trim();
  if (!s) return null;
  const hex = s.toLowerCase().startsWith('0x') ? s.slice(2) : s;
  if (/^[0-9a-f]+$/i.test(hex)) return parseInt(hex, 16);
  const n = Number(s);
  if (Number.isFinite(n)) return Math.trunc(n);
  return null;
}

function bytesToHex(buf) {
  return Buffer.from(buf || []).toString('hex').toUpperCase();
}

function parseCandumpLine(line) {
  // Common candump formats:
  //  1) (1700000000.123456) can0 123#DEADBEEF
  //  2) can0 123#DEADBEEF
  //  3) can0 123 [8] DE AD BE EF 00 00 00 00
  //  4) can0 123##01122334455667788 (CAN-FD)
  if (!line) return null;
  let s = String(line).trim();
  if (!s) return null;

  // Remove timestamp prefix if present
  let ts = null;
  if (s.startsWith('(')) {
    const idx = s.indexOf(')');
    if (idx > 0) {
      const t = s.slice(1, idx).trim();
      const n = Number(t);
      if (Number.isFinite(n)) ts = n;
      s = s.slice(idx + 1).trim();
    }
  }

  const parts = s.split(/\s+/);
  if (parts.length < 2) return null;
  const iface = parts[0];

  // ID#DATA format
  if (parts[1].includes('#')) {
    const token = parts[1];
    const hashIdx = token.indexOf('#');
    const idHex = token.slice(0, hashIdx);
    let dataHex = token.slice(hashIdx + 1);
    // CAN-FD uses double hash "##"; we just accept it and parse the rest as hex.
    if (dataHex.startsWith('#')) dataHex = dataHex.slice(1);

    // Remote request frames are sometimes printed as "123#R".
    if (dataHex.toUpperCase() === 'R') {
      return { iface, id: parseInt(idHex, 16), bytes: Buffer.alloc(0), ts, rtr: true };
    }

    // Some candump variants append flags after data; keep only hex.
    dataHex = dataHex.replace(/[^0-9a-f]/gi, '');
    const bytes = dataHex ? Buffer.from(dataHex, 'hex') : Buffer.alloc(0);
    return { iface, id: parseInt(idHex, 16), bytes, ts, rtr: false };
  }

  // Classic format: can0 123 [8] 11 22 ...
  if (parts.length >= 4 && /^\[[0-9]+\]$/.test(parts[2])) {
    const idHex = parts[1];
    const len = parseInt(parts[2].replace(/\[|\]/g, ''), 10);
    const dataBytes = [];
    for (let i = 3; i < parts.length; i++) {
      const b = parts[i].trim();
      if (!b) continue;
      if (!/^[0-9a-f]{1,2}$/i.test(b)) continue;
      dataBytes.push(parseInt(b, 16));
    }
    return { iface, id: parseInt(idHex, 16), bytes: Buffer.from(dataBytes.slice(0, len)), ts, rtr: false };
  }

  return null;
}

function readValueFromPayload(payload, src) {
  if (!Buffer.isBuffer(payload)) payload = Buffer.from(payload || []);

  // meta/computed datapoints are not extracted from payload
  if (src && src.computed) return undefined;

  const byteOffset = Number(src.byteOffset ?? 0);
  const byteLength = Number(src.byteLength ?? src.length ?? 1);
  const endian = (src.endian || src.byteOrder || 'be').toString().toLowerCase() === 'le' ? 'le' : 'be';
  const dt = (src.dataType || src.type || 'uint16').toString().toLowerCase();

  const start = Math.max(0, byteOffset);
  const end = Math.min(payload.length, start + Math.max(1, byteLength));
  if (start >= payload.length) return undefined;
  const slice = payload.slice(start, end);

  // bit extraction (single bit)
  if (src.bitIndex !== undefined && src.bitIndex !== null) {
    const bi = Number(src.bitIndex);
    if (!Number.isFinite(bi) || bi < 0 || bi > 7) return undefined;
    const b = slice.length ? slice[0] : 0;
    return ((b >> bi) & 0x01) !== 0;
  }

  const padTo = (n) => {
    if (slice.length >= n) return slice;
    const tmp = Buffer.alloc(n);
    slice.copy(tmp);
    return tmp;
  };

  switch (dt) {
    case 'bool':
    case 'boolean':
      return slice.length ? (slice[0] !== 0) : false;

    case 'int8':
      return padTo(1).readInt8(0);
    case 'uint8':
      return padTo(1).readUInt8(0);

    case 'int16':
      return endian === 'le' ? padTo(2).readInt16LE(0) : padTo(2).readInt16BE(0);
    case 'uint16':
      return endian === 'le' ? padTo(2).readUInt16LE(0) : padTo(2).readUInt16BE(0);

    case 'int32':
      return endian === 'le' ? padTo(4).readInt32LE(0) : padTo(4).readInt32BE(0);
    case 'uint32':
      return endian === 'le' ? padTo(4).readUInt32LE(0) : padTo(4).readUInt32BE(0);

    case 'float32':
      return endian === 'le' ? padTo(4).readFloatLE(0) : padTo(4).readFloatBE(0);

    case 'string':
    case 'ascii': {
      const s = slice.toString('ascii');
      const nul = s.indexOf('\0');
      return (nul >= 0 ? s.substring(0, nul) : s).trim();
    }

    default:
      if (slice.length >= 4) return endian === 'le' ? slice.readUInt32LE(0) : slice.readUInt32BE(0);
      if (slice.length >= 2) return endian === 'le' ? slice.readUInt16LE(0) : slice.readUInt16BE(0);
      return slice.length ? slice.readUInt8(0) : undefined;
  }
}

function writeValueIntoPayload(payload, src, value) {
  if (!Buffer.isBuffer(payload)) payload = Buffer.from(payload || []);

  const byteOffset = Number(src.byteOffset ?? 0);
  const byteLength = Number(src.byteLength ?? src.length ?? 1);
  const endian = (src.endian || src.byteOrder || 'be').toString().toLowerCase() === 'le' ? 'le' : 'be';
  const dt = (src.dataType || src.type || 'uint16').toString().toLowerCase();

  const start = Math.max(0, byteOffset);
  const needLen = Math.max(1, byteLength);
  const end = start + needLen;
  if (payload.length < end) {
    const tmp = Buffer.alloc(end);
    payload.copy(tmp);
    payload = tmp;
  }

  // bit write (single bit)
  if (src.bitIndex !== undefined && src.bitIndex !== null) {
    const bi = Number(src.bitIndex);
    if (Number.isFinite(bi) && bi >= 0 && bi <= 7) {
      const b = payload[start] || 0;
      const mask = 1 << bi;
      const next = coerceBoolean(value) ? (b | mask) : (b & ~mask);
      payload[start] = next;
    }
    return payload;
  }

  const vNum = (typeof value === 'string') ? Number(value) : value;
  const vBool = coerceBoolean(value);

  switch (dt) {
    case 'bool':
    case 'boolean':
      payload[start] = vBool ? 1 : 0;
      break;

    case 'int8':
      payload.writeInt8(Number(vNum) || 0, start);
      break;
    case 'uint8':
      payload.writeUInt8(Number(vNum) || 0, start);
      break;

    case 'int16':
      endian === 'le' ? payload.writeInt16LE(Number(vNum) || 0, start) : payload.writeInt16BE(Number(vNum) || 0, start);
      break;
    case 'uint16':
      endian === 'le' ? payload.writeUInt16LE(Number(vNum) || 0, start) : payload.writeUInt16BE(Number(vNum) || 0, start);
      break;

    case 'int32':
      endian === 'le' ? payload.writeInt32LE(Number(vNum) || 0, start) : payload.writeInt32BE(Number(vNum) || 0, start);
      break;
    case 'uint32':
      endian === 'le' ? payload.writeUInt32LE(Number(vNum) || 0, start) : payload.writeUInt32BE(Number(vNum) || 0, start);
      break;

    case 'float32':
      endian === 'le' ? payload.writeFloatLE(Number(vNum) || 0, start) : payload.writeFloatBE(Number(vNum) || 0, start);
      break;

    case 'string':
    case 'ascii': {
      const s = (value === null || value === undefined) ? '' : String(value);
      const buf = Buffer.alloc(needLen);
      buf.fill(0);
      buf.write(s, 0, Math.min(buf.length, Buffer.byteLength(s, 'ascii')), 'ascii');
      buf.copy(payload, start);
      break;
    }

    default:
      endian === 'le' ? payload.writeUInt16LE(Number(vNum) || 0, start) : payload.writeUInt16BE(Number(vNum) || 0, start);
      break;
  }

  return payload;
}


class CanbusDriver {
  constructor(adapter, deviceCfg, template, globalCfg, relStateIdFn, roundingDecimalsFn, baseId, onAliveFn) {
    this.adapter = adapter;
    this.device = deviceCfg || {};
    this.template = template || {};
    this.global = globalCfg || {};
    this.relStateId = relStateIdFn;
    this.roundingDecimals = roundingDecimalsFn;
    this.baseId = baseId || (this.device && this.device.id ? `devices.${this.device.id}` : 'devices.unknown');

    // Optional callback to signal "incoming data" (heartbeat)
    this.onAlive = (typeof onAliveFn === 'function') ? onAliveFn : null;

    this.proc = null;
    this.rl = null;

    this._dpByCanId = new Map();
    this._metaDps = [];
    this._lastFrameById = new Map();
  }

  async connect(datapoints) {
    const c = this.device.connection || {};
    const iface = (c.interface || c.iface || c.canInterface || 'can0').toString().trim() || 'can0';
    canInterface(iface);
    this.iface = iface;

    // Build lookup maps
    this._dpByCanId.clear();
    this._metaDps = [];
    (datapoints || []).forEach((dp) => {
      const src = dp?.source;
      if (!src || src.kind !== 'canbus') return;
      if (src.computed) {
        this._metaDps.push(dp);
        return;
      }
      const id = parseCanId(src.canId);
      if (id === null) return;
      if (!this._dpByCanId.has(id)) this._dpByCanId.set(id, []);
      this._dpByCanId.get(id).push(dp);
    });

    const candumpPath = canTool('candump', c.candumpPath);
    if (c.candumpArgs) throw new Error('EOS_CAN_EXTRA_ARGUMENTS_NOT_ALLOWED');
    const args = ['-L', iface];
    this.adapter.log.info(`[${this.device.id}] CANbus connect via can-utils: ${candumpPath} ${args.join(' ')}`);

    const setConn = async (ok, errText) => {
      await this.adapter.setStateAsync(`${this.baseId}.info.connection`, { val: !!ok, ack: true }).catch(() => {});
      await this.adapter.setStateAsync(`${this.baseId}.info.lastError`, { val: errText || '', ack: true }).catch(() => {});
    };

    this.proc = spawn(candumpPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    await setConn(true, '');

    this.proc.on('error', async (err) => {
      const msg = _errMsg(err);
      this.adapter.log.error(`[${this.device.id}] CANbus candump error: ${msg}`);
      await setConn(false, msg);
    });

    this.proc.on('exit', async (code, signal) => {
      const msg = `candump exited (${code ?? 'n/a'}${signal ? `, ${signal}` : ''})`;
      this.adapter.log.warn(`[${this.device.id}] CANbus ${msg}`);
      await setConn(false, msg);
    });

    if (this.proc.stderr) {
      this.proc.stderr.on('data', async (chunk) => {
        const msg = String(chunk || '').trim();
        if (!msg) return;
        this.adapter.log.warn(`[${this.device.id}] CANbus candump stderr: ${msg}`);
        await setConn(true, msg);
      });
    }

    this.rl = readline.createInterface({ input: this.proc.stdout });
    this.rl.on('line', (line) => this._onLine(line));
  }

  async disconnect() {
    try {
      if (this.rl) {
        try { this.rl.close(); } catch (_) {}
      }
      this.rl = null;

      if (this.proc) {
        try { this.proc.kill('SIGTERM'); } catch (_) {}
      }
      this.proc = null;
    } catch (_) {
      // ignore
    }
  }

  _onLine(line) {
    const frame = parseCandumpLine(line);
    if (!frame) return;
    if (frame.iface && frame.iface !== this.iface) return;

    // Heartbeat: any received CAN frame counts as liveness.
    try { this.onAlive && this.onAlive(); } catch (_) { /* ignore */ }

    this._lastFrameById.set(frame.id, frame.bytes);

    // Computed meta datapoints
    for (const dp of this._metaDps) {
      const src = dp?.source || {};
      const key = String(src.computed || '').toLowerCase();
      let val;
      if (key === 'lastid') val = frame.id;
      else if (key === 'lastidhex') val = '0x' + frame.id.toString(16).toUpperCase();
      else if (key === 'lastdata' || key === 'lastpayload') val = bytesToHex(frame.bytes);
      else if (key === 'lasttimestamp') val = (frame.ts !== null && frame.ts !== undefined) ? frame.ts : Date.now();
      else if (key === 'lastiface') val = frame.iface;
      else if (key === 'lastrtr') val = !!frame.rtr;
      else continue;

      const sid = this.relStateId ? this.relStateId(dp) : dp.id;
      this.adapter.setStateAsync(sid, { val, ack: true }).catch(() => {});
    }

    const dps = this._dpByCanId.get(frame.id);
    if (!dps || !dps.length) return;

    for (const dp of dps) {
      try {
        const src = dp?.source || {};
        let val = readValueFromPayload(frame.bytes, src);
        if (val === undefined) continue;
        val = applyNumericTransforms(val, src);

        const expectedType = (dp.type || '').toString().toLowerCase();
        if (expectedType === 'boolean') val = coerceBoolean(val);

        const sid = this.relStateId ? this.relStateId(dp) : dp.id;
        this.adapter.setStateAsync(sid, { val, ack: true }).catch(() => {});
      } catch (e) {
        this.adapter.log.warn(`[${this.device.id}] CANbus parse failed for ${dp?.id || ''}: ${_errMsg(e)}`);
      }
    }
  }

  async readDatapoints(/* datapoints */) {
    return {};
  }

  async writeDatapoint(dp, value) {
    const src = dp?.source || {};
    if (src.kind !== 'canbus') throw new Error('Datapoint has no CANbus source');

    const c = this.device.connection || {};
    const iface = (c.interface || c.iface || c.canInterface || this.iface || 'can0').toString().trim() || 'can0';
    canInterface(iface);
    const cansendPath = canTool('cansend', c.cansendPath);

    const w = (src.write && typeof src.write === 'object') ? src.write : {};
    const mode = (w.mode || src.mode || '').toString().toLowerCase();

    // Raw frame send (e.g. "123#DEADBEEF" or "123#R")
    if (mode === 'raw' || mode === 'rawframe' || src.raw === true || dp.id === 'tx.send') {
      const frameStr = String(value || '').trim();
      if (!frameStr) throw new Error('Empty CAN frame');
      await sendCanFrame(cansendPath, iface, frameStr);
      return;
    }

    // Field write (best-effort)
    const canId = parseCanId(w.canId ?? src.canId);
    if (canId === null) throw new Error('Missing canId');

    const frameLen = Number(w.frameLength ?? src.frameLength ?? 8);
    const keepOther = !!(w.keepOtherBytes ?? false);
    const base = keepOther ? this._lastFrameById.get(canId) : null;
    let payload = base ? Buffer.from(base) : Buffer.alloc(frameLen);

    // Reverse numeric transforms (best-effort)
    let toWire = value;
    if (typeof toWire === 'string' && toWire.trim() !== '') {
      const n = Number(toWire);
      if (!Number.isNaN(n)) toWire = n;
    }
    if (typeof toWire === 'number') {
      const inv = (w.invert ?? src.invert) ? true : false;
      if (inv) toWire = -toWire;

      const offset = (w.offset ?? src.offset);
      if (offset !== undefined && offset !== null) {
        const o = Number(offset);
        if (!Number.isNaN(o)) toWire = toWire - o;
      }
      const mul = (w.multiplier ?? src.multiplier);
      if (mul !== undefined && mul !== null) {
        const m = Number(mul);
        if (!Number.isNaN(m) && m !== 0) toWire = toWire / m;
      }
      const div = (w.divisor ?? src.divisor);
      if (div !== undefined && div !== null) {
        const d = Number(div);
        if (!Number.isNaN(d) && d !== 0) toWire = toWire * d;
      }
      const sf = (w.scaleFactor ?? src.scaleFactor);
      if (sf !== undefined && sf !== null) {
        const sfi = Number(sf);
        if (Number.isFinite(sfi) && sfi !== 0) toWire = toWire / Math.pow(10, sfi);
      }
    }

    const writeSrc = Object.assign({}, src, w);
    payload = writeValueIntoPayload(payload, writeSrc, toWire);

    const idHex = canId.toString(16).toUpperCase();
    const dataHex = bytesToHex(payload);
    const frameStr = `${idHex}#${dataHex}`;

    await sendCanFrame(cansendPath, iface, frameStr);
  }
}

module.exports = {
  CanbusDriver,
};
