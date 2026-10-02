'use strict';

const ModbusRTU = require('modbus-serial');

/**
 * Shared Modbus RTU bus manager.
 *
 * Why?
 * - RS485 is a shared medium: multiple slaves on one /dev/tty... port.
 * - Opening the same serial port multiple times (one client per device) typically fails.
 * - This manager keeps ONE physical serial connection per port/settings and multiplexes requests.
 */

const buses = new Map(); // key -> { bus, refs }

function makeKey(opts) {
  const o = opts || {};
  const path = (o.path || '').toString().trim();
  const baudRate = Number(o.baudRate || 9600);
  const parity = (o.parity || 'none').toString();
  const dataBits = Number(o.dataBits || 8);
  const stopBits = Number(o.stopBits || 1);
  return `${path}|${baudRate}|${parity}|${dataBits}|${stopBits}`;
}

class ModbusRtuBus {
  constructor(adapter, opts) {
    this.adapter = adapter;
    this.opts = {
      path: (opts.path || '').toString().trim(),
      baudRate: Number(opts.baudRate || 9600),
      parity: (opts.parity || 'none').toString(),
      dataBits: Number(opts.dataBits || 8),
      stopBits: Number(opts.stopBits || 1),
    };

    this.client = new ModbusRTU();
    this.connected = false;
    this.connecting = false;

    // Serialize all operations on this bus
    this._queue = Promise.resolve();
  }

  async _enqueue(fn) {
    const run = async () => fn();
    const p = this._queue.then(run, run);
    // keep queue alive even if p rejects
    this._queue = p.catch(() => {});
    return p;
  }

  async ensureConnected() {
    if (this.connected) return true;
    if (this.connecting) {
      // Wait for current connect attempt
      await this._queue;
      return this.connected;
    }

    this.connecting = true;

    return await this._enqueue(async () => {
      try {
        if (this.connected) return true;
        await new Promise((resolve, reject) => {
          this.client.connectRTUBuffered(
            this.opts.path,
            {
              baudRate: this.opts.baudRate,
              parity: this.opts.parity,
              dataBits: this.opts.dataBits,
              stopBits: this.opts.stopBits,
            },
            (err) => (err ? reject(err) : resolve())
          );
        });
        this.connected = true;
        this.adapter.log.info(`[modbusRtuBus] connected ${this.opts.path} @${this.opts.baudRate} ${this.opts.parity} ${this.opts.dataBits}${this.opts.stopBits}`);
        return true;
      } catch (e) {
        this.connected = false;
        throw e;
      } finally {
        this.connecting = false;
      }
    });
  }

  async close() {
    return await this._enqueue(async () => {
      try {
        if (this.client) {
          try { this.client.close(() => {}); } catch (_) {}
        }
      } finally {
        this.connected = false;
      }
    });
  }

  async _exec(unitId, timeoutMs, fn) {
    return await this._enqueue(async () => {
      await this.ensureConnected();
      this.client.setID(Number(unitId || 1));
      this.client.setTimeout(Number(timeoutMs || 2000));
      try {
        return await fn(this.client);
      } catch (e) {
        // Mark as disconnected so next operation tries to reconnect
        this.connected = false;
        throw e;
      }
    });
  }

  // Read helpers
  readCoils(unitId, timeoutMs, addr, len) {
    return this._exec(unitId, timeoutMs, (c) => c.readCoils(addr, len));
  }
  readDiscreteInputs(unitId, timeoutMs, addr, len) {
    return this._exec(unitId, timeoutMs, (c) => c.readDiscreteInputs(addr, len));
  }
  readHoldingRegisters(unitId, timeoutMs, addr, len) {
    return this._exec(unitId, timeoutMs, (c) => c.readHoldingRegisters(addr, len));
  }
  readInputRegisters(unitId, timeoutMs, addr, len) {
    return this._exec(unitId, timeoutMs, (c) => c.readInputRegisters(addr, len));
  }

  // Write helpers
  writeCoil(unitId, timeoutMs, addr, value) {
    return this._exec(unitId, timeoutMs, (c) => c.writeCoil(addr, value));
  }
  writeRegister(unitId, timeoutMs, addr, value) {
    return this._exec(unitId, timeoutMs, (c) => c.writeRegister(addr, value));
  }
  writeRegisters(unitId, timeoutMs, addr, values) {
    return this._exec(unitId, timeoutMs, (c) => c.writeRegisters(addr, values));
  }
  writeCoils(unitId, timeoutMs, addr, values) {
    return this._exec(unitId, timeoutMs, (c) => c.writeCoils(addr, values));
  }
}

function acquireBus(adapter, opts) {
  const key = makeKey(opts);
  if (!key || key.startsWith('|')) {
    throw new Error('Invalid Modbus RTU path');
  }

  const existing = buses.get(key);
  if (existing) {
    existing.refs++;
    return { key, bus: existing.bus };
  }

  const bus = new ModbusRtuBus(adapter, opts);
  buses.set(key, { bus, refs: 1 });
  return { key, bus };
}

function releaseBus(key) {
  const entry = buses.get(key);
  if (!entry) return;
  entry.refs--;
  if (entry.refs <= 0) {
    buses.delete(key);
    // Close asynchronously
    entry.bus.close().catch(() => {});
  }
}

module.exports = {
  acquireBus,
  releaseBus,
};
