'use strict';

const { SerialPort } = require('serialport');

/**
 * Shared Kostal RS485 bus manager.
 *
 * Why?
 * - RS485 is a shared medium.
 * - Opening the same serial port multiple times (one client per device) usually fails.
 * - This manager keeps ONE physical serial connection per port/settings and multiplexes requests.
 */

const buses = new Map(); // key -> { bus, refs }

function makeKey(opts) {
  const o = opts || {};
  const path = (o.path || '').toString().trim();
  const baudRate = Number(o.baudRate || 19200);
  const parity = (o.parity || 'none').toString();
  const dataBits = Number(o.dataBits || 8);
  const stopBits = Number(o.stopBits || 1);
  return `${path}|${baudRate}|${parity}|${dataBits}|${stopBits}`;
}

function checksum8(dataBytes) {
  let sum = 0;
  for (let i = 0; i < dataBytes.length; i++) sum = (sum + (dataBytes[i] & 0xFF)) & 0xFF;
  return ((0x100 - sum) & 0xFF);
}

function isChecksumValid(payload) {
  if (!Buffer.isBuffer(payload) || payload.length < 2) return false;
  let sum = 0;
  for (let i = 0; i < payload.length; i++) sum = (sum + (payload[i] & 0xFF)) & 0xFF;
  return (sum & 0xFF) === 0;
}

/**
 * Standard COBS encode.
 * - input: payload bytes (may contain 0x00)
 * - output: COBS encoded bytes (contains no 0x00)
 */
function cobsEncode(input) {
  if (!Buffer.isBuffer(input)) input = Buffer.from(input || []);
  const out = [];
  let code = 1;
  let codeIndex = 0;
  out.push(0); // placeholder for first code

  for (let i = 0; i < input.length; i++) {
    const b = input[i];
    if (b === 0) {
      out[codeIndex] = code;
      codeIndex = out.length;
      out.push(0); // placeholder for next code
      code = 1;
      continue;
    }

    out.push(b);
    code++;
    if (code === 0xFF) {
      out[codeIndex] = code;
      codeIndex = out.length;
      out.push(0);
      code = 1;
    }
  }

  out[codeIndex] = code;
  return Buffer.from(out);
}

/**
 * Standard COBS decode.
 * - input: COBS encoded bytes (without the trailing 0x00 delimiter)
 * - output: original payload bytes (may contain 0x00)
 */
function cobsDecode(input) {
  if (!Buffer.isBuffer(input)) input = Buffer.from(input || []);
  const out = [];
  let i = 0;
  while (i < input.length) {
    const code = input[i] & 0xFF;
    if (code === 0) throw new Error('COBS decode: invalid code 0');
    i++;
    const end = i + code - 1;
    while (i < end) {
      if (i >= input.length) throw new Error('COBS decode: truncated');
      out.push(input[i]);
      i++;
    }
    if (code !== 0xFF && i < input.length) out.push(0);
  }
  return Buffer.from(out);
}

class KostalRs485Bus {
  constructor(adapter, opts) {
    this.adapter = adapter;
    this.opts = {
      path: (opts.path || '').toString().trim(),
      baudRate: Number(opts.baudRate || 19200),
      parity: (opts.parity || 'none').toString(),
      dataBits: Number(opts.dataBits || 8),
      stopBits: Number(opts.stopBits || 1),
    };

    this.port = null;
    this.connected = false;
    this.connecting = false;

    // Serialize all operations on this bus
    this._queue = Promise.resolve();

    // RX frame parsing
    this._rxBuf = Buffer.alloc(0);
    this._frameQueue = []; // decoded frames
    this._pending = []; // waiters

    // Pacing between transactions (helps on some USB-RS485 dongles)
    this._pacingMs = 10;
  }

  async _enqueue(fn) {
    const run = async () => fn();
    const p = this._queue.then(run, run);
    // keep queue alive even if p rejects
    this._queue = p.catch(() => {});
    return p;
  }

  _onData(chunk) {
    if (!chunk || !chunk.length) return;
    this._rxBuf = Buffer.concat([this._rxBuf, chunk]);

    // guard against runaway buffers
    if (this._rxBuf.length > 64 * 1024) {
      this._rxBuf = this._rxBuf.subarray(this._rxBuf.length - 4096);
    }

    // frames are delimited by 0x00 (COBS encoded payload has no 0x00)
    while (true) {
      const idx = this._rxBuf.indexOf(0x00);
      if (idx < 0) break;
      const enc = this._rxBuf.subarray(0, idx); // without delimiter
      this._rxBuf = this._rxBuf.subarray(idx + 1);

      if (!enc.length) continue;
      let decoded;
      try {
        decoded = cobsDecode(enc);
      } catch (e) {
        // ignore malformed frames
        continue;
      }

      // Basic sanity: must contain checksum and validate.
      if (!isChecksumValid(decoded)) continue;

      // Filter out local echo of requests (many USB-RS485 dongles can echo).
      // Requests start with 0x62. Responses typically start with 0xE2/0xE3.
      if (decoded[0] === 0x62) continue;

      if (this._pending.length) {
        const p = this._pending.shift();
        if (p && typeof p.resolve === 'function') p.resolve(decoded);
      } else {
        this._frameQueue.push(decoded);
      }
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
        if (!this.opts.path) throw new Error('Kostal RS485: missing serial path');

        // close stale port
        await this._closePortInternal();

        const port = new SerialPort({
          path: this.opts.path,
          baudRate: this.opts.baudRate,
          dataBits: this.opts.dataBits,
          stopBits: this.opts.stopBits,
          parity: this.opts.parity,
          autoOpen: false,
        });

        await new Promise((resolve, reject) => {
          port.open((err) => (err ? reject(err) : resolve()));
        });

        // keep reference & listeners
        this.port = port;
        this.connected = true;

        port.on('data', (c) => this._onData(c));
        port.on('error', (err) => {
          this.connected = false;
          try { this.adapter.log.warn(`[kostalRs485Bus] serial error ${this.opts.path}: ${err && err.message ? err.message : err}`); } catch (_) {}
        });
        port.on('close', () => {
          this.connected = false;
        });

        try {
          this.adapter.log.info(`[kostalRs485Bus] connected ${this.opts.path} @${this.opts.baudRate} ${this.opts.parity} ${this.opts.dataBits}${this.opts.stopBits}`);
        } catch (_) {}

        return true;
      } finally {
        this.connecting = false;
      }
    });
  }

  async _closePortInternal() {
    // called only inside queue
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
      this._rxBuf = Buffer.alloc(0);
      this._frameQueue = [];
      this._pending = [];
    }
  }

  async close() {
    return await this._enqueue(async () => {
      await this._closePortInternal();
    });
  }

  async _readFrame(timeoutMs) {
    if (this._frameQueue.length) return this._frameQueue.shift();
    const to = Number(timeoutMs || 2000);
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this._pending.findIndex(x => x && x.resolve === resolve);
        if (idx >= 0) this._pending.splice(idx, 1);
        reject(new Error(`Kostal RS485: timeout waiting for response (${to} ms)`));
      }, to);

      this._pending.push({
        resolve: (frame) => { clearTimeout(timer); resolve(frame); },
        reject: (err) => { clearTimeout(timer); reject(err); },
      });
    });
  }

  _buildReadRequest(addr, id) {
    const adr = Number(addr || 1) & 0xFF;
    const payload = Buffer.alloc(11);
    payload[0] = 0x62;
    payload[1] = 0xDF;
    payload[2] = 0xA0;
    payload[3] = adr;
    payload[4] = 0x00;
    payload[5] = 0xF0;
    payload.writeUInt32LE(id >>> 0, 6);
    payload[10] = checksum8(payload.subarray(0, 10));

    const enc = cobsEncode(payload);
    return Buffer.concat([enc, Buffer.from([0x00])]);
  }

  async transactRead(addr, id, timeoutMs) {
    return await this._enqueue(async () => {
      await this.ensureConnected();
      if (!this.port || !this.connected) throw new Error('Kostal RS485: not connected');

      // Drop any stale RX bytes from previous transactions
      this._rxBuf = Buffer.alloc(0);
      this._frameQueue = [];

      const req = this._buildReadRequest(addr, id);

      // Write request
      await new Promise((resolve, reject) => {
        this.port.write(req, (err) => (err ? reject(err) : resolve()));
      });
      await new Promise((resolve) => {
        try { this.port.drain(() => resolve()); } catch (_) { resolve(); }
      });

      if (this._pacingMs > 0) {
        await new Promise((r) => setTimeout(r, this._pacingMs));
      }

      // Wait for next valid decoded frame
      const frame = await this._readFrame(timeoutMs);
      return frame;
    });
  }
}

function acquireBus(adapter, opts) {
  const key = makeKey(opts);
  if (!key || key.startsWith('|')) {
    throw new Error('Invalid Kostal RS485 path');
  }

  const existing = buses.get(key);
  if (existing) {
    existing.refs++;
    return { key, bus: existing.bus };
  }

  const bus = new KostalRs485Bus(adapter, opts);
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
