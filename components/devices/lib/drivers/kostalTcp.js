'use strict';

const net = require('net');
const { applyNumericTransforms, coerceBoolean } = require('../utils');

// Small async sleep helper
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function _errMsg(err) {
  try { return (err && err.message) ? String(err.message) : String(err); } catch (_) { return String(err); }
}

/**
 * Parse an ID input that can be a number, decimal string or hex string (e.g. "0x04000100").
 */
function parseId(id) {
  if (id === null || id === undefined) return null;
  if (typeof id === 'number' && Number.isFinite(id)) return id >>> 0;
  if (typeof id === 'string') {
    const s = id.trim();
    if (!s) return null;
    if (/^0x[0-9a-f]+$/i.test(s)) return parseInt(s, 16) >>> 0;
    const n = parseInt(s, 10);
    if (!isNaN(n)) return n >>> 0;
  }
  return null;
}

function checksum8(dataBytes) {
  let sum = 0;
  for (let i = 0; i < dataBytes.length; i++) sum = (sum + (dataBytes[i] & 0xFF)) & 0xFF;
  return ((0x100 - sum) & 0xFF);
}

function isChecksumValid(frame) {
  if (!Buffer.isBuffer(frame) || frame.length < 3) return false;
  // last byte must be 0x00 (delimiter / terminator)
  if (frame[frame.length - 1] !== 0x00) return false;
  const chk = frame[frame.length - 2] & 0xFF;
  const data = frame.subarray(0, frame.length - 2);
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum = (sum + (data[i] & 0xFF)) & 0xFF;
  return ((sum + chk) & 0xFF) === 0;
}

/**
 * Try extracting one complete frame from buffer.
 * Frames are delimited by a trailing 0x00 and validated via checksum (second last byte).
 *
 * @returns { {frame: Buffer, rest: Buffer} | null }
 */
function tryExtractFrame(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 3) return null;

  // Search for candidate terminators 0x00 and validate checksum.
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== 0x00) continue;
    const end = i + 1;
    if (end < 3) continue;

    const candidate = buf.subarray(0, end);
    if (isChecksumValid(candidate)) {
      return { frame: candidate, rest: buf.subarray(end) };
    }
  }

  return null;
}

function parseValue(data, dataType) {
  const t = String(dataType || '').toLowerCase().trim();

  if (t === 'float') {
    if (data.length < 4) return undefined;
    return data.readFloatLE(0);
  }

  if (t === 'unsigned long') {
    if (data.length < 4) return undefined;
    return data.readUInt32LE(0);
  }

  if (t === 'unsigned char') {
    if (data.length < 1) return undefined;
    return data.readUInt8(0);
  }

  if (t === 'bool') {
    if (data.length < 1) return undefined;
    return coerceBoolean(data.readUInt8(0));
  }

  if (t === 'string') {
    // Remove null padding and trim
    return data.toString('utf8').replace(/\0/g, '').trim();
  }

  // Fallback: try int32
  if (data.length >= 4) return data.readInt32LE(0);
  if (data.length >= 2) return data.readInt16LE(0);
  if (data.length >= 1) return data.readInt8(0);

  return undefined;
}

class KostalTcpDriver {
  constructor(adapter, deviceConfig, template) {
    this.adapter = adapter;
    this.cfg = deviceConfig || {};
    this.template = template || {};
    this._busy = false;

    this._socket = null;
    this._rxBuf = Buffer.alloc(0);

    this._frameQueue = [];
    this._pending = [];

    this._connected = false;
    this._closing = false;
    this._lastError = '';
    this._lastConnectAttempt = 0;

    // pacing between requests (helps some devices)
    this._pacingMs = 10;
  }

  async connect(_datapoints) {
    await this._ensureConnected();
  }

  async disconnect() {
    this._closing = true;
    try {
      if (this._socket) {
        try { this._socket.removeAllListeners('data'); } catch (_) {}
        try { this._socket.destroy(); } catch (_) {}
      }
    } finally {
      this._socket = null;
      this._connected = false;
      this._rxBuf = Buffer.alloc(0);
      this._frameQueue = [];
      this._pending = [];
      this._closing = false;
    }
  }

  _getConn() {
    const c = this.cfg.connection || {};
    const host = (c.host || '').trim();
    const port = (typeof c.port === 'number' && Number.isFinite(c.port)) ? c.port : parseInt(c.port, 10) || 81;
    const unitId = (typeof c.unitId === 'number' && Number.isFinite(c.unitId)) ? c.unitId : parseInt(c.unitId, 10) || 1;
    const timeoutMs = (typeof c.timeoutMs === 'number' && Number.isFinite(c.timeoutMs)) ? c.timeoutMs : parseInt(c.timeoutMs, 10) || 2000;
    return { host, port, unitId, timeoutMs };
  }

  async _ensureConnected() {
    const { host, port } = this._getConn();
    if (!host) throw new Error('Kostal TCP: missing host/IP');

    if (this._socket && this._connected) return;

    // basic backoff
    const now = Date.now();
    if (now - this._lastConnectAttempt < 250) {
      await sleep(250 - (now - this._lastConnectAttempt));
    }
    this._lastConnectAttempt = Date.now();

    await this.disconnect(); // clean stale socket if any

    this._connected = false;
    this._lastError = '';

    await new Promise((resolve, reject) => {
      const sock = new net.Socket();
      this._socket = sock;
      sock.setNoDelay(true);

      const onError = (err) => {
        this._lastError = _errMsg(err);
        try { sock.destroy(); } catch (_) {}
        reject(err);
      };

      const onClose = () => {
        this._connected = false;
        // reject all pending frame waiters
        try {
          while (this._pending.length) {
            const p = this._pending.shift();
            if (p && typeof p.reject === 'function') p.reject(new Error('Kostal TCP: socket closed'));
          }
        } catch (_) {}
      };

      sock.once('error', onError);
      sock.once('close', onClose);

      sock.on('data', (chunk) => {
        if (!chunk || !chunk.length) return;
        // append and extract frames
        this._rxBuf = Buffer.concat([this._rxBuf, chunk]);

        // guard against runaway buffers
        if (this._rxBuf.length > 64 * 1024) {
          // keep only the tail
          this._rxBuf = this._rxBuf.subarray(this._rxBuf.length - 4096);
        }

        while (true) {
          const res = tryExtractFrame(this._rxBuf);
          if (!res) break;
          this._rxBuf = res.rest;

          if (this._pending.length) {
            const p = this._pending.shift();
            if (p && typeof p.resolve === 'function') p.resolve(res.frame);
          } else {
            this._frameQueue.push(res.frame);
          }
        }
      });

      sock.connect({ host, port }, () => {
        // connected
        try { sock.removeListener('error', onError); } catch (_) {}
        sock.on('error', (err) => { this._lastError = _errMsg(err); this._connected = false; });
        this._connected = true;
        resolve();
      });
    });
  }

  _buildRequest(id, unitId) {
    const buf = Buffer.alloc(12);
    buf[0] = 0x62;
    buf[1] = unitId & 0xFF;
    buf[2] = 0x03;
    buf[3] = unitId & 0xFF;
    buf[4] = 0x00;
    buf[5] = 0xF0;
    buf.writeUInt32LE(id >>> 0, 6);
    const chk = checksum8(buf.subarray(0, 10));
    buf[10] = chk;
    buf[11] = 0x00;
    return buf;
  }

  async _readFrame(timeoutMs) {
    // If a frame is already queued, take it first.
    if (this._frameQueue.length) return this._frameQueue.shift();

    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        // remove from pending list
        const idx = this._pending.findIndex(x => x && x.resolve === resolve);
        if (idx >= 0) this._pending.splice(idx, 1);
        reject(new Error(`Kostal TCP: timeout waiting for response (${timeoutMs} ms)`));
      }, timeoutMs);

      this._pending.push({
        resolve: (frame) => { clearTimeout(timer); resolve(frame); },
        reject: (err) => { clearTimeout(timer); reject(err); },
      });
    });
  }

  async _readId(id, dataType) {
    const { unitId, timeoutMs } = this._getConn();
    await this._ensureConnected();

    if (!this._socket || !this._connected) throw new Error('Kostal TCP: not connected');

    const req = this._buildRequest(id, unitId);

    // write request
    await new Promise((resolve, reject) => {
      this._socket.write(req, (err) => err ? reject(err) : resolve());
    });

    if (this._pacingMs > 0) await sleep(this._pacingMs);

    const frame = await this._readFrame(timeoutMs);

    // Response: bytes 1-5 are non-specified, bytes 6..n are data, n+1 checksum, n+2 0x00
    if (!frame || frame.length < 7) return undefined;

    const data = frame.subarray(5, frame.length - 2);
    return parseValue(data, dataType);
  }

  async readDatapoints(datapoints) {
    if (!Array.isArray(datapoints) || !datapoints.length) return {};
    if (this._busy) return {};
    this._busy = true;

    try {
      const results = {};
      const byId = new Map(); // id -> { dps:[], dataType }
      for (const dp of datapoints) {
        const src = (dp && dp.source) ? dp.source : null;
        if (!src) continue;
        if (String(src.kind || '').toLowerCase() !== 'kostal') continue;

        const id = parseId(src.id);
        if (id === null) continue;

        const dt = src.dataType || 'float';
        if (!byId.has(id)) byId.set(id, { dps: [], dataType: dt });
        byId.get(id).dps.push(dp);
      }

      for (const [id, info] of byId.entries()) {
        let val;
        try {
          val = await this._readId(id, info.dataType);
        } catch (e) {
          // mark disconnected and rethrow -> handled by runtime as device error
          this._connected = false;
          throw e;
        }

        // apply any per-datapoint numeric transforms
        for (const dp of info.dps) {
          let v = val;
          // allow mapping/transform on template level
          try {
            v = applyNumericTransforms(v, dp && dp.source ? dp.source : {});
          } catch (_) {
            // ignore transform errors
          }
          results[dp.id] = v;
        }
      }

      return results;
    } finally {
      this._busy = false;
    }
  }

  async writeDatapoint(_datapoint, _value) {
    throw new Error('Kostal TCP: write is not supported by this template/driver');
  }
}

module.exports = {
  KostalTcpDriver,
  parseId, // exported for potential reuse/tests
};
