'use strict';

/**
 * Shared wired M-Bus (EN 13757-2) serial bus manager.
 *
 * Why a shared bus?
 * - M-Bus is a shared serial medium (typically via an USB M-Bus master).
 * - Opening the same serial port multiple times (one client per device) usually fails.
 * - This manager keeps ONE physical serial connection per port/settings and
 *   multiplexes requests across devices.
 */

let SerialPort;
try {
  // serialport v10+ exports { SerialPort }
  ({ SerialPort } = require('serialport'));
} catch (e) {
  SerialPort = null;
}

const buses = new Map(); // key -> { bus, refs }

function makeKey(opts) {
  const o = opts || {};
  const path = (o.path || '').toString().trim();
  const baudRate = Number(o.baudRate || 2400);
  const parity = (o.parity || 'even').toString();
  const dataBits = Number(o.dataBits || 8);
  const stopBits = Number(o.stopBits || 1);
  return `${path}|${baudRate}|${parity}|${dataBits}|${stopBits}`;
}

function checksum(bytes) {
  let sum = 0;
  for (const b of bytes) sum = (sum + (b & 0xFF)) & 0xFF;
  return sum & 0xFF;
}

function buildShortFrame(cField, address) {
  const C = cField & 0xFF;
  const A = address & 0xFF;
  const CS = checksum([C, A]);
  return Buffer.from([0x10, C, A, CS, 0x16]);
}

function extractFrame(buffer) {
  if (!buffer || !buffer.length) return null;
  let buf = buffer;

  // Drop noise until a likely start byte
  let startIdx = -1;
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    if (b === 0xE5 || b === 0x10 || b === 0x68) {
      startIdx = i;
      break;
    }
  }
  if (startIdx < 0) {
    // No valid start byte found -> drop all
    return { frame: null, rest: Buffer.alloc(0) };
  }
  if (startIdx > 0) buf = buf.slice(startIdx);

  const b0 = buf[0];
  if (b0 === 0xE5) {
    return { frame: buf.slice(0, 1), rest: buf.slice(1), type: 'ack' };
  }
  if (b0 === 0x10) {
    if (buf.length < 5) return null;
    if (buf[4] !== 0x16) {
      // Invalid short frame, drop 1 byte and retry next time
      return { frame: null, rest: buf.slice(1) };
    }
    return { frame: buf.slice(0, 5), rest: buf.slice(5), type: 'short' };
  }
  if (b0 === 0x68) {
    if (buf.length < 4) return null;
    const L1 = buf[1];
    const L2 = buf[2];
    if (L1 !== L2 || buf[3] !== 0x68) {
      return { frame: null, rest: buf.slice(1) };
    }
    const totalLen = Number(L1) + 6; // 68 L L 68 + (L bytes) + CS + 16
    if (buf.length < totalLen) return null;
    if (buf[totalLen - 1] !== 0x16) {
      return { frame: null, rest: buf.slice(1) };
    }
    return { frame: buf.slice(0, totalLen), rest: buf.slice(totalLen), type: 'long' };
  }

  return { frame: null, rest: buf.slice(1) };
}

class MbusBus {
  constructor(adapter, opts) {
    this.adapter = adapter;
    this.opts = {
      path: (opts.path || '').toString().trim(),
      baudRate: Number(opts.baudRate || 2400),
      parity: (opts.parity || 'even').toString(),
      dataBits: Number(opts.dataBits || 8),
      stopBits: Number(opts.stopBits || 1),
    };

    this.port = null;
    this.connected = false;
    this.connecting = false;

    this.rxBuffer = Buffer.alloc(0);
    this._waiter = null;

    // Serialize all operations on this bus
    this._queue = Promise.resolve();
  }

  async _enqueue(fn) {
    const run = async () => fn();
    const p = this._queue.then(run, run);
    this._queue = p.catch(() => {});
    return p;
  }

  _onData(data) {
    try {
      if (!data || !data.length) return;
      this.rxBuffer = Buffer.concat([this.rxBuffer, Buffer.from(data)]);
      this._tryResolveWaiter();
    } catch (e) {
      // ignore
    }
  }

  _tryResolveWaiter() {
    if (!this._waiter) return;

    // Consume frames until we find one that matches
    while (true) {
      const res = extractFrame(this.rxBuffer);
      if (!res) return;

      if (res.frame === null) {
        // Just dropped noise/invalid start
        this.rxBuffer = res.rest;
        continue;
      }

      // Valid frame consumed
      this.rxBuffer = res.rest;
      const frame = res.frame;

      const pred = this._waiter.predicate;
      if (!pred || pred(frame)) {
        const w = this._waiter;
        this._waiter = null;
        clearTimeout(w.timer);
        w.resolve(frame);
        return;
      }

      // Frame not wanted (e.g. ACK) -> keep waiting
    }
  }

  async ensureConnected() {
    if (this.connected) return true;
    if (this.connecting) {
      await this._queue;
      return this.connected;
    }

    if (!SerialPort) {
      throw new Error('M-Bus driver: missing dependency "serialport" (install/build failed).');
    }

    this.connecting = true;

    return await this._enqueue(async () => {
      try {
        if (this.connected) return true;

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

        port.on('data', (d) => this._onData(d));
        port.on('error', (e) => {
          this.adapter?.log?.debug?.(`[mbusBus] serial error: ${e?.message || e}`);
          this.connected = false;
        });

        this.port = port;
        this.connected = true;
        this.adapter?.log?.info?.(`[mbusBus] connected ${this.opts.path} @${this.opts.baudRate} ${this.opts.parity} ${this.opts.dataBits}${this.opts.stopBits}`);
        return true;
      } catch (e) {
        this.connected = false;
        try {
          if (this.port) {
            try { this.port.close(() => {}); } catch (_) {}
          }
        } catch (_) {}
        this.port = null;
        throw e;
      } finally {
        this.connecting = false;
      }
    });
  }

  async close() {
    return await this._enqueue(async () => {
      try {
        if (this.port) {
          try { this.port.removeAllListeners('data'); } catch (_) {}
          try { this.port.removeAllListeners('error'); } catch (_) {}
          await new Promise((resolve) => {
            try { this.port.close(() => resolve()); } catch (_) { resolve(); }
          });
        }
      } finally {
        this.port = null;
        this.connected = false;
        this.rxBuffer = Buffer.alloc(0);
        this._waiter = null;
      }
    });
  }

  async _write(buf) {
    if (!this.port) throw new Error('M-Bus serial port not open');
    await new Promise((resolve, reject) => {
      this.port.write(buf, (err) => {
        if (err) return reject(err);
        this.port.drain((err2) => (err2 ? reject(err2) : resolve()));
      });
    });
  }

  async _waitForFrame(timeoutMs, predicate) {
    if (this._waiter) throw new Error('M-Bus bus is busy (concurrent wait)');
    const ms = Number(timeoutMs || 2000);

    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this._waiter) this._waiter = null;
        reject(new Error('M-Bus timeout'));
      }, ms);

      this._waiter = { resolve, reject, predicate, timer };
      this._tryResolveWaiter();
    });
  }

  async request(primaryAddress, options) {
    const addr = Number(primaryAddress);
    if (!Number.isFinite(addr) || addr < 0 || addr > 255) {
      throw new Error(`M-Bus: invalid primary address: ${primaryAddress}`);
    }

    const opts = options || {};
    const timeoutMs = Number(opts.timeoutMs || 2000);
    const sendNke = opts.sendNke !== false; // default true

    return await this._enqueue(async () => {
      await this.ensureConnected();

      // Reset receive buffer to avoid mixing stale frames from previous cycles
      this.rxBuffer = Buffer.alloc(0);

      // Optional: SND_NKE (wake-up / link reset)
      if (sendNke) {
        const nke = buildShortFrame(0x40, addr);
        await this._write(nke);
        // Many devices answer with ACK (0xE5). Some do not; ignore timeout.
        try {
          await this._waitForFrame(Math.min(300, timeoutMs), (f) => f && f.length === 1 && f[0] === 0xE5);
        } catch (_) {
          // ignore
        }
      }

      // Request: REQ_UD2
      const req = buildShortFrame(0x5B, addr);
      await this._write(req);

      // Wait for response frame (ignore ACKs)
      const frame = await this._waitForFrame(timeoutMs, (f) => {
        if (!f || !f.length) return false;
        if (f.length === 1 && f[0] === 0xE5) return false; // ignore ACK
        return true;
      });

      return frame;
    });
  }
}

function acquireBus(adapter, opts) {
  const key = makeKey(opts);
  if (!key || key.startsWith('|')) {
    throw new Error('Invalid M-Bus serial path');
  }

  const existing = buses.get(key);
  if (existing) {
    existing.refs++;
    return { key, bus: existing.bus };
  }

  const bus = new MbusBus(adapter, opts);
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
