'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { applyNumericTransforms } = require('../utils');

function parseDs18b20(text) {
  if (!text) return null;
  const lines = String(text).split(/\r?\n/).filter(Boolean);
  if (!lines.length) return null;

  // Typical:
  // 4d 01 4b 46 7f ff 0c 10 7a : crc=7a YES
  // 4d 01 4b 46 7f ff 0c 10 7a t=20625
  const first = lines[0] || '';
  if (!/\bYES\b/i.test(first)) {
    // CRC failed or sensor not ready
    return null;
  }

  const all = lines.join(' ');
  const m = all.match(/t=(-?\d+)/i);
  if (!m) return null;
  const milli = parseInt(m[1], 10);
  if (!Number.isFinite(milli)) return null;
  return milli / 1000;
}

function parseNumber(text) {
  if (text === null || text === undefined) return null;
  const s = String(text).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * OneWire (Linux sysfs) driver.
 *
 * Designed for systems with a loaded w1 kernel module (e.g. DS18B20 temperature sensors).
 *
 * Device connection config (device.connection):
 * {
 *   basePath: '/sys/bus/w1/devices',
 *   sensorId: '28-xxxxxxxxxxxx',
 *   file: 'w1_slave',
 *   parser: 'ds18b20' | 'float' | 'raw'
 * }
 *
 * Datapoint source schema:
 * {
 *   kind: 'onewire',
 *   sensorId?: '28-...',
 *   basePath?: '/sys/bus/w1/devices',
 *   file?: 'w1_slave',
 *   absolutePath?: '/sys/.../w1_slave',
 *   parser?: 'ds18b20' | 'float' | 'raw',
 *
 *   // Optional generic write support (rare for 1-Wire, but useful for file-based adapters)
 *   writeAbsolutePath?: '/path/to/file',
 *   writeTemplate?: 'value=${value}\n'
 * }
 */
class OneWireDriver {
  constructor(adapter, deviceCfg, template /* unused */, globalCfg /* unused */) {
    this.adapter = adapter;
    this.cfg = deviceCfg;
    this.template = template;
    this.global = globalCfg || {};

    const c = (this.cfg && this.cfg.connection) ? this.cfg.connection : {};
    this.basePath = (c.basePath || '/sys/bus/w1/devices').toString();
    this.sensorId = (c.sensorId || '').toString();
    this.file = (c.file || 'w1_slave').toString();
    this.parser = (c.parser || 'ds18b20').toString();

    this._busy = false;
  }

  async disconnect() {
    // No persistent connection.
  }

  _resolvePath(src) {
    const s = src || {};

    if (s.absolutePath) {
      return String(s.absolutePath);
    }

    const basePath = (s.basePath || this.basePath || '/sys/bus/w1/devices').toString();
    const sensorId = (s.sensorId || this.sensorId || '').toString();
    const file = (s.file || this.file || 'w1_slave').toString();

    if (!sensorId) {
      throw new Error('OneWire: missing sensorId (device.connection.sensorId)');
    }

    return path.join(basePath, sensorId, file);
  }

  _parseValue(text, parser) {
    const p = (parser || this.parser || 'raw').toString().toLowerCase();
    if (p === 'ds18b20') return parseDs18b20(text);
    if (p === 'float' || p === 'number') return parseNumber(text);
    if (p === 'raw' || p === 'text' || p === 'string') return (text === null || text === undefined) ? '' : String(text).trim();
    // fallback
    return (text === null || text === undefined) ? '' : String(text).trim();
  }

  async readDatapoints(datapoints) {
    if (this._busy) return {};
    this._busy = true;

    try {
      const result = {};
      const dps = (datapoints || []).filter(dp => dp && dp.source && dp.source.kind === 'onewire' && dp.rw !== 'wo');
      if (!dps.length) return result;

      for (const dp of dps) {
        const src = dp.source || {};
        const p = this._resolvePath(src);

        let text;
        try {
          text = await fs.readFile(p, 'utf8');
        } catch (e) {
          // Missing sensors are common (e.g. unplugged). We return null and log once in debug.
          this.adapter?.log?.debug?.(`[${this.cfg.id}] OneWire read failed for ${p}: ${e.message || e}`);
          result[dp.id] = null;
          continue;
        }

        let val = this._parseValue(text, src.parser);

        // Apply generic numeric transforms (scaleFactor, invert, keepPositive...)
        val = applyNumericTransforms(val, src);

        result[dp.id] = val;
      }

      return result;
    } finally {
      this._busy = false;
    }
  }

  async writeDatapoint(dp, value) {
    const src = dp?.source || {};
    if (src.kind !== 'onewire') throw new Error('Invalid source kind');

    const p = src.writeAbsolutePath ? String(src.writeAbsolutePath) : null;
    if (!p) {
      throw new Error('OneWire datapoint is not writable (missing source.writeAbsolutePath)');
    }

    let payload;
    if (src.writeTemplate) {
      payload = String(src.writeTemplate).replace(/\$\{value\}/g, String(value));
    } else {
      payload = String(value);
    }

    await fs.writeFile(p, payload, 'utf8');
    return true;
  }
}

module.exports = {
  OneWireDriver,
};
