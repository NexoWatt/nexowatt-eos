'use strict';

const { SerialPort } = require('serialport');

/**
 * Shared Modbus ASCII bus manager.
 *
 * Why not use modbus-serial's AsciiPort directly?
 * - Some field devices (notably ABL eMH1 EVCC2/3) answer with a non-standard
 *   response start delimiter ('>' instead of ':').
 * - We still send standard Modbus ASCII requests (':....\r\n'), but we accept a
 *   configurable response delimiter per template/connection.
 * - We keep exactly one physical serial connection per port/settings and
 *   multiplex all requests across devices.
 */

const buses = new Map(); // key -> { bus, refs }

function normalizeResponseStarts(input) {
  const raw = ((input || ':').toString().trim() || ':');
  const starts = [];
  const push = (ch) => {
    const s = String(ch || '').charAt(0);
    if (!s) return;
    if (s !== ':' && s !== '>') return;
    if (!starts.includes(s)) starts.push(s);
  };
  for (const ch of raw) push(ch);
  // Some devices documented for '>' in practice still answer with ':' on certain firmware revisions.
  // Accept ':' as additional response starter when '>' is configured.
  if (starts.includes('>')) push(':');
  if (!starts.length) push(':');
  return starts;
}

function makeKey(opts) {
  const o = opts || {};
  const path = (o.path || '').toString().trim();
  const baudRate = Number(o.baudRate || 9600);
  const parity = (o.parity || 'none').toString();
  const dataBits = Number(o.dataBits || 8);
  const stopBits = Number(o.stopBits || 1);
  const responseStarts = normalizeResponseStarts(o.responseStart).join('');
  return `${path}|${baudRate}|${parity}|${dataBits}|${stopBits}|${responseStarts}`;
}

function toHexByte(v) {
  return (v & 0xFF).toString(16).toUpperCase().padStart(2, '0');
}

function calcLrc(bytes) {
  let sum = 0;
  for (const b of bytes) sum = (sum + (b & 0xFF)) & 0xFF;
  return ((0x100 - sum) & 0xFF);
}

function parseAsciiFrame(line) {
  const s = String(line || '').trim();
  if (!s) throw new Error('Empty Modbus ASCII frame');
  const start = s.charAt(0);
  const hex = s.slice(1).trim();
  if (!hex || (hex.length % 2) !== 0) throw new Error('Invalid Modbus ASCII hex length');
  if (!/^[0-9A-Fa-f]+$/.test(hex)) throw new Error('Invalid Modbus ASCII hex payload');

  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16) & 0xFF);
  }
  if (bytes.length < 3) throw new Error('Modbus ASCII frame too short');

  const lrc = bytes[bytes.length - 1] & 0xFF;
  const body = bytes.slice(0, -1);
  const want = calcLrc(body);
  if (want !== lrc) {
    throw new Error(`Invalid Modbus ASCII LRC (got 0x${toHexByte(lrc)}, expected 0x${toHexByte(want)})`);
  }

  return { start, bytes };
}

function buildAsciiRequest(unitId, fc, payloadBytes) {
  const body = [unitId & 0xFF, fc & 0xFF, ...(payloadBytes || []).map(v => v & 0xFF)];
  const lrc = calcLrc(body);
  const txt = ':' + [...body, lrc].map(toHexByte).join('') + '\r\n';
  return Buffer.from(txt, 'ascii');
}

function exceptionMessage(code) {
  const c = Number(code) & 0xFF;
  const map = {
    0x01: 'Illegal function',
    0x02: 'Illegal data address',
    0x03: 'Illegal data value',
    0x04: 'Slave device failure',
    0x05: 'Acknowledge',
    0x06: 'Slave device busy',
    0x08: 'Memory parity error',
    0x0A: 'Gateway path unavailable',
    0x0B: 'Gateway target failed to respond',
  };
  return map[c] || `Exception code 0x${toHexByte(c)}`;
}

function regsToBytes(values) {
  const out = [];
  for (const v of (values || [])) {
    const n = Number(v) & 0xFFFF;
    out.push((n >> 8) & 0xFF, n & 0xFF);
  }
  return out;
}

function bytesToRegs(bytes) {
  const out = [];
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    out.push(((bytes[i] & 0xFF) << 8) | (bytes[i + 1] & 0xFF));
  }
  return out;
}

function unpackBits(bytes, wantedCount) {
  const bits = [];
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i] & 0xFF;
    for (let bit = 0; bit < 8; bit++) {
      bits.push(((b >> bit) & 0x01) !== 0);
      if (bits.length >= wantedCount) return bits;
    }
  }
  return bits;
}

function packBits(values) {
  const arr = Array.isArray(values) ? values : [];
  const byteCount = Math.ceil(arr.length / 8);
  const out = new Array(byteCount).fill(0);
  for (let i = 0; i < arr.length; i++) {
    if (arr[i]) out[Math.floor(i / 8)] |= (1 << (i % 8));
  }
  return out;
}

class ModbusAsciiBus {
  constructor(adapter, opts) {
    this.adapter = adapter;
    this.opts = {
      path: (opts.path || '').toString().trim(),
      baudRate: Number(opts.baudRate || 9600),
      parity: (opts.parity || 'none').toString(),
      dataBits: Number(opts.dataBits || 8),
      stopBits: Number(opts.stopBits || 1),
      responseStart: normalizeResponseStarts(opts.responseStart).join(''),
    };

    this.port = null;
    this.connected = false;
    this.connecting = false;

    // Serialize all operations on this bus
    this._queue = Promise.resolve();

    this._rxText = '';
    this._frameQueue = []; // { start, bytes, rawLine }
    this._pending = []; // { predicate, resolve, reject }
    this._pacingMs = 10;
    this._debugTrace = []; // recent tx/rx parser events for timeout diagnostics
  }

  async _enqueue(fn) {
    const run = async () => fn();
    const p = this._queue.then(run, run);
    this._queue = p.catch(() => {});
    return p;
  }

  _emitFrame(frame) {
    if (this._pending.length) {
      const idx = this._pending.findIndex(x => x && typeof x.predicate === 'function' && x.predicate(frame));
      if (idx >= 0) {
        const p = this._pending.splice(idx, 1)[0];
        if (p && typeof p.resolve === 'function') p.resolve(frame);
        return;
      }
    }
    this._frameQueue.push(frame);
  }

  _trace(event, value) {
    try {
      const msg = `${event}${value ? ` ${String(value)}` : ''}`;
      this._debugTrace.push(msg);
      if (this._debugTrace.length > 12) this._debugTrace.splice(0, this._debugTrace.length - 12);
    } catch (_) {}
  }

  _extractNextDelimitedLine() {
    if (!this._rxText) return null;
    const rIdx = this._rxText.indexOf('\r');
    const nIdx = this._rxText.indexOf('\n');
    let idx = -1;
    if (rIdx >= 0 && nIdx >= 0) idx = Math.min(rIdx, nIdx);
    else idx = Math.max(rIdx, nIdx);
    if (idx < 0) return null;

    const rawLine = this._rxText.slice(0, idx);
    let next = idx;
    while (next < this._rxText.length) {
      const ch = this._rxText.charAt(next);
      if (ch !== '\r' && ch !== '\n') break;
      next++;
    }
    this._rxText = this._rxText.slice(next);
    return rawLine;
  }

  _onData(chunk) {
    if (!chunk || !chunk.length) return;
    const txt = Buffer.from(chunk).toString('ascii');
    this._trace('rx-chunk', JSON.stringify(txt));
    this._rxText += txt;

    // guard against runaway buffers
    if (this._rxText.length > 64 * 1024) {
      this._rxText = this._rxText.slice(-4096);
    }

    while (true) {
      const rawLine = this._extractNextDelimitedLine();
      if (rawLine === null) break;

      const line = String(rawLine || '').replace(/[\r\n]+$/g, '').trim();
      if (!line) continue;
      const start = line.charAt(0);
      if (!this.opts.responseStart.includes(start)) {
        this._trace('rx-skip', JSON.stringify(line));
        continue;
      }

      let frame;
      try {
        frame = parseAsciiFrame(line);
      } catch (err) {
        this._trace('rx-invalid', `${JSON.stringify(line)} ${err && err.message ? err.message : err}`);
        continue;
      }
      frame.rawLine = line;
      this._trace('rx-frame', line);
      this._emitFrame(frame);
    }
  }

  async ensureConnected() {
    if (this.connected) return true;
    if (this.connecting) {
      await this._queue;
      return this.connected;
    }

    this.connecting = true;

    return await this._enqueue(async () => {
      try {
        if (this.connected) return true;
        if (!this.opts.path) throw new Error('Modbus ASCII: missing serial path');

        await this._closePortInternal();

        const port = new SerialPort({
          path: this.opts.path,
          baudRate: this.opts.baudRate,
          parity: this.opts.parity,
          dataBits: this.opts.dataBits,
          stopBits: this.opts.stopBits,
          autoOpen: false,
        });

        await new Promise((resolve, reject) => {
          port.open((err) => (err ? reject(err) : resolve()));
        });

        this.port = port;
        this.connected = true;

        port.on('data', (d) => this._onData(d));
        port.on('error', (err) => {
          this.connected = false;
          try { this.adapter.log.warn(`[modbusAsciiBus] serial error ${this.opts.path}: ${err && err.message ? err.message : err}`); } catch (_) {}
        });
        port.on('close', () => {
          this.connected = false;
        });

        this.adapter.log.info(`[modbusAsciiBus] connected ${this.opts.path} @${this.opts.baudRate} ${this.opts.parity} ${this.opts.dataBits}${this.opts.stopBits} resp=${this.opts.responseStart}`);
        return true;
      } catch (e) {
        this.connected = false;
        throw e;
      } finally {
        this.connecting = false;
      }
    });
  }

  async _closePortInternal() {
    try {
      if (this.port) {
        try {
          this.port.removeAllListeners('data');
          this.port.removeAllListeners('error');
          this.port.removeAllListeners('close');
        } catch (_) {}
        const p = this.port;
        this.port = null;
        await new Promise((resolve) => {
          try {
            if (p.isOpen) p.close(() => resolve());
            else resolve();
          } catch (_) {
            resolve();
          }
        });
      }
    } finally {
      this.connected = false;
      this._rxText = '';
      this._frameQueue = [];
      this._pending = [];
      this._debugTrace = [];
    }
  }

  async close() {
    return await this._enqueue(async () => {
      await this._closePortInternal();
    });
  }

  async _waitForFrame(timeoutMs, predicate) {
    const pred = (typeof predicate === 'function') ? predicate : (() => true);

    for (let i = 0; i < this._frameQueue.length; i++) {
      const f = this._frameQueue[i];
      if (pred(f)) {
        this._frameQueue.splice(i, 1);
        return f;
      }
    }

    const to = Number(timeoutMs || 2000);
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this._pending.findIndex(x => x && x.resolve === resolve);
        if (idx >= 0) this._pending.splice(idx, 1);
        const tail = (this._debugTrace || []).slice(-6).join(' | ');
        reject(new Error(`Modbus ASCII: timeout waiting for response (${to} ms)${tail ? `; trace=${tail}` : ''}`));
      }, to);

      this._pending.push({
        predicate: pred,
        resolve: (frame) => { clearTimeout(timer); resolve(frame); },
        reject: (err) => { clearTimeout(timer); reject(err); },
      });
    });
  }

  async _transact(unitId, timeoutMs, fc, payloadBytes, parseResponse) {
    return await this._enqueue(async () => {
      await this.ensureConnected();
      if (!this.port || !this.connected) throw new Error('Modbus ASCII: not connected');

      // Drop stale RX state from previous transactions but keep debug trace for diagnostics.
      this._rxText = '';
      this._frameQueue = [];

      const req = buildAsciiRequest(unitId, fc, payloadBytes);
      const reqLine = req.toString('ascii').replace(/[\r\n]+$/g, '');
      this._trace('tx', reqLine);

      await new Promise((resolve, reject) => {
        this.port.write(req, (err) => (err ? reject(err) : resolve()));
      });
      await new Promise((resolve) => {
        try { this.port.drain(() => resolve()); } catch (_) { resolve(); }
      });

      if (this._pacingMs > 0) {
        await new Promise((r) => setTimeout(r, this._pacingMs));
      }

      const frame = await this._waitForFrame(timeoutMs, (f) => {
        if (!f || !Array.isArray(f.bytes) || f.bytes.length < 2) return false;
        if (f.rawLine === reqLine) return false; // echoed request
        const addr = f.bytes[0] & 0xFF;
        const fcode = f.bytes[1] & 0xFF;
        if (addr !== (Number(unitId || 1) & 0xFF)) return false;
        if (fcode === ((fc | 0x80) & 0xFF)) return true; // exception response
        return fcode === (fc & 0xFF);
      });

      const bytes = frame.bytes || [];
      const respFc = bytes[1] & 0xFF;
      if (respFc === ((fc | 0x80) & 0xFF)) {
        const exc = bytes[2] & 0xFF;
        const err = new Error(`Modbus exception ${exceptionMessage(exc)}`);
        err.code = 'EMODBUS_EXCEPTION';
        err.modbusExceptionCode = exc;
        throw err;
      }
      return parseResponse(bytes);
    });
  }

  readCoils(unitId, timeoutMs, addr, len) {
    const a = Number(addr || 0) & 0xFFFF;
    const l = Number(len || 1) & 0xFFFF;
    return this._transact(unitId, timeoutMs, 0x01, [a >> 8, a & 0xFF, l >> 8, l & 0xFF], (bytes) => {
      if (bytes.length < 4) throw new Error('Modbus ASCII: invalid FC1 response length');
      const byteCount = bytes[2] & 0xFF;
      const data = bytes.slice(3, 3 + byteCount);
      if (data.length !== byteCount) throw new Error('Modbus ASCII: truncated FC1 payload');
      return { data: unpackBits(data, l), buffer: Buffer.from(data) };
    });
  }

  readDiscreteInputs(unitId, timeoutMs, addr, len) {
    const a = Number(addr || 0) & 0xFFFF;
    const l = Number(len || 1) & 0xFFFF;
    return this._transact(unitId, timeoutMs, 0x02, [a >> 8, a & 0xFF, l >> 8, l & 0xFF], (bytes) => {
      if (bytes.length < 4) throw new Error('Modbus ASCII: invalid FC2 response length');
      const byteCount = bytes[2] & 0xFF;
      const data = bytes.slice(3, 3 + byteCount);
      if (data.length !== byteCount) throw new Error('Modbus ASCII: truncated FC2 payload');
      return { data: unpackBits(data, l), buffer: Buffer.from(data) };
    });
  }

  readHoldingRegisters(unitId, timeoutMs, addr, len) {
    const a = Number(addr || 0) & 0xFFFF;
    const l = Number(len || 1) & 0xFFFF;
    return this._transact(unitId, timeoutMs, 0x03, [a >> 8, a & 0xFF, l >> 8, l & 0xFF], (bytes) => {
      if (bytes.length < 5) throw new Error('Modbus ASCII: invalid FC3 response length');
      const byteCount = bytes[2] & 0xFF;
      const data = bytes.slice(3, 3 + byteCount);
      if (data.length !== byteCount) throw new Error('Modbus ASCII: truncated FC3 payload');
      return { data: bytesToRegs(data), buffer: Buffer.from(data) };
    });
  }

  readInputRegisters(unitId, timeoutMs, addr, len) {
    const a = Number(addr || 0) & 0xFFFF;
    const l = Number(len || 1) & 0xFFFF;
    return this._transact(unitId, timeoutMs, 0x04, [a >> 8, a & 0xFF, l >> 8, l & 0xFF], (bytes) => {
      if (bytes.length < 5) throw new Error('Modbus ASCII: invalid FC4 response length');
      const byteCount = bytes[2] & 0xFF;
      const data = bytes.slice(3, 3 + byteCount);
      if (data.length !== byteCount) throw new Error('Modbus ASCII: truncated FC4 payload');
      return { data: bytesToRegs(data), buffer: Buffer.from(data) };
    });
  }

  writeCoil(unitId, timeoutMs, addr, value) {
    const a = Number(addr || 0) & 0xFFFF;
    const v = value ? 0xFF00 : 0x0000;
    return this._transact(unitId, timeoutMs, 0x05, [a >> 8, a & 0xFF, v >> 8, v & 0xFF], (bytes) => {
      if (bytes.length < 6) throw new Error('Modbus ASCII: invalid FC5 response length');
      return { address: ((bytes[2] & 0xFF) << 8) | (bytes[3] & 0xFF), value: ((bytes[4] & 0xFF) << 8) | (bytes[5] & 0xFF) };
    });
  }

  writeRegister(unitId, timeoutMs, addr, value) {
    const a = Number(addr || 0) & 0xFFFF;
    const v = Number(value || 0) & 0xFFFF;
    return this._transact(unitId, timeoutMs, 0x06, [a >> 8, a & 0xFF, v >> 8, v & 0xFF], (bytes) => {
      if (bytes.length < 6) throw new Error('Modbus ASCII: invalid FC6 response length');
      return { address: ((bytes[2] & 0xFF) << 8) | (bytes[3] & 0xFF), value: ((bytes[4] & 0xFF) << 8) | (bytes[5] & 0xFF) };
    });
  }

  writeRegisters(unitId, timeoutMs, addr, values) {
    const a = Number(addr || 0) & 0xFFFF;
    const vals = Array.isArray(values) ? values : [values];
    const regs = regsToBytes(vals);
    const qty = vals.length & 0xFFFF;
    return this._transact(unitId, timeoutMs, 0x10, [a >> 8, a & 0xFF, qty >> 8, qty & 0xFF, regs.length & 0xFF, ...regs], (bytes) => {
      if (bytes.length < 6) throw new Error('Modbus ASCII: invalid FC16 response length');
      return { address: ((bytes[2] & 0xFF) << 8) | (bytes[3] & 0xFF), length: ((bytes[4] & 0xFF) << 8) | (bytes[5] & 0xFF) };
    });
  }

  writeCoils(unitId, timeoutMs, addr, values) {
    const a = Number(addr || 0) & 0xFFFF;
    const vals = Array.isArray(values) ? values.map(v => !!v) : [!!values];
    const packed = packBits(vals);
    const qty = vals.length & 0xFFFF;
    return this._transact(unitId, timeoutMs, 0x0F, [a >> 8, a & 0xFF, qty >> 8, qty & 0xFF, packed.length & 0xFF, ...packed], (bytes) => {
      if (bytes.length < 6) throw new Error('Modbus ASCII: invalid FC15 response length');
      return { address: ((bytes[2] & 0xFF) << 8) | (bytes[3] & 0xFF), length: ((bytes[4] & 0xFF) << 8) | (bytes[5] & 0xFF) };
    });
  }
}

function acquireBus(adapter, opts) {
  const key = makeKey(opts);
  if (!key || key.startsWith('|')) {
    throw new Error('Invalid Modbus ASCII path');
  }

  const existing = buses.get(key);
  if (existing) {
    existing.refs++;
    return { key, bus: existing.bus };
  }

  const bus = new ModbusAsciiBus(adapter, opts);
  buses.set(key, { bus, refs: 1 });
  return { key, bus };
}

function releaseBus(key) {
  const entry = buses.get(key);
  if (!entry) return;
  entry.refs--;
  if (entry.refs <= 0) {
    buses.delete(key);
    entry.bus.close().catch(() => {});
  }
}

module.exports = {
  acquireBus,
  releaseBus,
};
