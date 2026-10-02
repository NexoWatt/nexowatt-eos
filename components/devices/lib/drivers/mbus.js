'use strict';

const { acquireBus, releaseBus } = require('./mbusBus');

function hex(buf) {
  if (!buf) return '';
  return Buffer.from(buf).toString('hex');
}

function hexPretty(buf) {
  const h = hex(buf);
  return h.replace(/(..)/g, '$1 ').trim();
}

function u16le(b0, b1) {
  return (b0 & 0xFF) | ((b1 & 0xFF) << 8);
}

function decodeManufacturer(twoBytesLe) {
  // 3 letters, 5-bit encoding
  const m = twoBytesLe & 0x7FFF;
  const c1 = String.fromCharCode(((m >> 10) & 0x1F) + 64);
  const c2 = String.fromCharCode(((m >> 5) & 0x1F) + 64);
  const c3 = String.fromCharCode((m & 0x1F) + 64);
  return `${c1}${c2}${c3}`.replace(/@/g, '?');
}

function decodeBcdId(bytes4) {
  if (!bytes4 || bytes4.length !== 4) return '';
  const parts = [];
  for (let i = 3; i >= 0; i--) {
    const b = bytes4[i];
    const hi = (b >> 4) & 0x0F;
    const lo = b & 0x0F;
    parts.push(String(hi));
    parts.push(String(lo));
  }
  return parts.join('').replace(/^0+/, '') || parts.join('');
}

function decodeBcd(bytes) {
  if (!bytes || !bytes.length) return null;
  const out = [];
  for (let i = bytes.length - 1; i >= 0; i--) {
    const b = bytes[i];
    out.push(String((b >> 4) & 0x0F));
    out.push(String(b & 0x0F));
  }
  const s = out.join('');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function decodeIntLE(bytes, signed) {
  if (!bytes || !bytes.length) return null;
  const buf = Buffer.from(bytes);
  const len = buf.length;
  if (len === 1) return signed ? buf.readInt8(0) : buf.readUInt8(0);
  if (len === 2) return signed ? buf.readInt16LE(0) : buf.readUInt16LE(0);
  if (len === 4) return signed ? buf.readInt32LE(0) : buf.readUInt32LE(0);
  // 3/6/8 byte integers
  let bi = 0n;
  for (let i = len - 1; i >= 0; i--) {
    bi = (bi << 8n) | BigInt(buf[i]);
  }
  if (!signed) {
    // best-effort: return Number when safe
    const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
    if (bi <= maxSafe) return Number(bi);
    return bi.toString();
  }

  // Signed (two's complement)
  const signBit = 1n << BigInt((len * 8) - 1);
  const mask = (1n << BigInt(len * 8)) - 1n;
  let sbi = bi;
  if (bi & signBit) {
    sbi = -(((~bi) & mask) + 1n);
  }
  const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
  const minSafe = BigInt(Number.MIN_SAFE_INTEGER);
  if (sbi <= maxSafe && sbi >= minSafe) return Number(sbi);
  return sbi.toString();
}

function decodeFloatLE(bytes4) {
  if (!bytes4 || bytes4.length !== 4) return null;
  const buf = Buffer.from(bytes4);
  return buf.readFloatLE(0);
}

function pow10(exp) {
  return Math.pow(10, exp);
}

function decodeVif(primaryVif) {
  // Best-effort for the most common primary VIF ranges.
  // Unknown VIFs are returned as raw hex.
  const vif = primaryVif & 0x7F;

  // Energy Wh (0x00..0x07)
  if (vif >= 0x00 && vif <= 0x07) {
    const exp = vif - 0x00;
    return { quantity: 'energy', unit: 'Wh', multiplier: pow10(exp) };
  }

  // Volume m³ (0x10..0x17) -> 10^(-6..+1) m³
  if (vif >= 0x10 && vif <= 0x17) {
    const exp = (vif - 0x10) - 6;
    return { quantity: 'volume', unit: 'm³', multiplier: pow10(exp) };
  }

  // Power W (0x28..0x2F) -> 10^(-3..+4) W
  if (vif >= 0x28 && vif <= 0x2F) {
    const exp = (vif - 0x28) - 3;
    return { quantity: 'power', unit: 'W', multiplier: pow10(exp) };
  }

  // Volume flow m³/h (0x38..0x3F) -> 10^(-6..+1) m³/h
  if (vif >= 0x38 && vif <= 0x3F) {
    const exp = (vif - 0x38) - 6;
    return { quantity: 'flow', unit: 'm³/h', multiplier: pow10(exp) };
  }

  // Temperature °C (0x58..0x5F) -> 10^(-3..+4) °C
  if (vif >= 0x58 && vif <= 0x5F) {
    const exp = (vif - 0x58) - 3;
    return { quantity: 'temperature', unit: '°C', multiplier: pow10(exp) };
  }

  return { quantity: 'unknown', unit: `VIF_0x${vif.toString(16).padStart(2, '0')}`, multiplier: 1 };
}

function parseVariableDataFrame(frame) {
  // Frame: 68 L L 68 C A CI <data...> CS 16
  // L = number of bytes from C to last data byte (excludes CS and 16)
  if (!frame || frame.length < 9) return null;
  if (frame[0] !== 0x68 || frame[3] !== 0x68) return null;
  const L = frame[1];
  const totalLen = L + 6;
  if (frame.length < totalLen) return null;

  const C = frame[4];
  const A = frame[5];
  const CI = frame[6];

  const dataStart = 7;
  const dataEnd = 4 + L; // exclusive index of CS

  const data = frame.slice(dataStart, dataEnd);
  const cs = frame[dataEnd];

  // Verify checksum best-effort
  let sum = 0;
  for (let i = 4; i < dataEnd; i++) sum = (sum + frame[i]) & 0xFF;
  const checksumOk = (sum & 0xFF) === cs;

  const out = {
    frameType: 'long',
    cField: C,
    address: A,
    ciField: CI,
    checksumOk,
    header: {},
    records: [],
  };

  // Variable data response (common): CI 0x72/0x73/0x78/0x79
  // We treat these values as "variable" and parse the 12-byte fixed header.
  const isVariable = (CI === 0x72 || CI === 0x73 || CI === 0x78 || CI === 0x79);
  if (!isVariable) {
    out.header = { ci: CI };
    out.rawDataHex = hex(data);
    return out;
  }

  if (data.length < 12) {
    out.header = { ci: CI };
    out.rawDataHex = hex(data);
    return out;
  }

  const idBytes = data.slice(0, 4);
  const manBytes = data.slice(4, 6);
  const version = data[6];
  const medium = data[7];
  const accessNumber = data[8];
  const status = data[9];
  const signature = u16le(data[10], data[11]);

  const manufacturer = decodeManufacturer(u16le(manBytes[0], manBytes[1]));
  const identification = decodeBcdId(idBytes);

  const mediumMap = {
    0x00: 'Other',
    0x01: 'Oil',
    0x02: 'Electricity',
    0x03: 'Gas',
    0x04: 'Heat',
    0x05: 'Steam',
    0x06: 'Hot water',
    0x07: 'Water',
    0x08: 'Heat cost allocator',
    0x09: 'Compressed air',
    0x0A: 'Cooling load',
    0x0B: 'Cooling load outlet',
    0x0C: 'Heat inlet',
    0x0D: 'Heat/cooling',
    0x0E: 'Bus/System',
  };

  out.header = {
    identification,
    manufacturer,
    version,
    medium,
    mediumText: mediumMap[medium] || `0x${medium.toString(16).padStart(2, '0')}`,
    accessNumber,
    status,
    signature,
  };

  // Parse records
  let i = 12;
  while (i < data.length) {
    const start = i;
    const dif = data[i++];
    if (dif === undefined) break;

    // 0x2F is commonly used as "end of records" filler
    if (dif === 0x2F) break;

    let difeBytes = [];
    let storage = (dif & 0x40) ? 1 : 0;
    let tariff = 0;
    let devUnit = 0;
    let difExt = (dif & 0x80) !== 0;
    let shift = 1; // storage already has 1 bit
    while (difExt && i < data.length) {
      const dife = data[i++];
      if (dife === undefined) break;
      difeBytes.push(dife);
      storage |= (dife & 0x0F) << shift;
      shift += 4;
      tariff |= ((dife >> 4) & 0x03);
      devUnit |= ((dife >> 6) & 0x03);
      difExt = (dife & 0x80) !== 0;
    }

    // VIF + optional VIFE
    if (i >= data.length) break;
    const vif = data[i++];
    if (vif === undefined) break;
    const vifBytes = [vif];
    let vifExt = (vif & 0x80) !== 0;
    while (vifExt && i < data.length) {
      const vife = data[i++];
      if (vife === undefined) break;
      vifBytes.push(vife);
      vifExt = (vife & 0x80) !== 0;
    }

    const vifInfo = decodeVif(vif);

    // Determine data length from DIF low nibble
    const difType = dif & 0x0F;
    let rawValue = null;
    let value = null;

    const record = {
      storage,
      tariff,
      deviceUnit: devUnit,
      dif,
      dife: difeBytes.length ? difeBytes.map(b => `0x${b.toString(16).padStart(2, '0')}`) : [],
      vif: vifBytes.map(b => `0x${b.toString(16).padStart(2, '0')}`),
      quantity: vifInfo.quantity,
      unit: vifInfo.unit,
    };

    const remaining = data.length - i;

    const take = (n) => {
      const b = data.slice(i, i + n);
      i += n;
      return b;
    };

    // Signedness best-effort: temperatures are often signed
    const signed = (vifInfo.quantity === 'temperature');

    if (difType === 0x00) {
      rawValue = null;
      value = null;
    } else if (difType >= 0x01 && difType <= 0x04) {
      const n = difType;
      if (remaining < n) break;
      rawValue = decodeIntLE(take(n), signed);
      value = (typeof rawValue === 'number') ? rawValue * (vifInfo.multiplier || 1) : rawValue;
    } else if (difType === 0x05) {
      if (remaining < 4) break;
      rawValue = decodeFloatLE(take(4));
      value = (typeof rawValue === 'number') ? rawValue * (vifInfo.multiplier || 1) : rawValue;
    } else if (difType === 0x06) {
      if (remaining < 6) break;
      rawValue = decodeIntLE(take(6), signed);
      value = (typeof rawValue === 'number') ? rawValue * (vifInfo.multiplier || 1) : rawValue;
    } else if (difType === 0x07) {
      if (remaining < 8) break;
      rawValue = decodeIntLE(take(8), signed);
      value = (typeof rawValue === 'number') ? rawValue * (vifInfo.multiplier || 1) : rawValue;
    } else if (difType === 0x09) {
      if (remaining < 1) break;
      rawValue = decodeBcd(take(1));
      value = (typeof rawValue === 'number') ? rawValue * (vifInfo.multiplier || 1) : rawValue;
    } else if (difType === 0x0A) {
      if (remaining < 2) break;
      rawValue = decodeBcd(take(2));
      value = (typeof rawValue === 'number') ? rawValue * (vifInfo.multiplier || 1) : rawValue;
    } else if (difType === 0x0B) {
      if (remaining < 3) break;
      rawValue = decodeBcd(take(3));
      value = (typeof rawValue === 'number') ? rawValue * (vifInfo.multiplier || 1) : rawValue;
    } else if (difType === 0x0C) {
      if (remaining < 4) break;
      rawValue = decodeBcd(take(4));
      value = (typeof rawValue === 'number') ? rawValue * (vifInfo.multiplier || 1) : rawValue;
    } else if (difType === 0x0E) {
      if (remaining < 6) break;
      rawValue = decodeBcd(take(6));
      value = (typeof rawValue === 'number') ? rawValue * (vifInfo.multiplier || 1) : rawValue;
    } else if (difType === 0x0D) {
      // variable length
      if (remaining < 1) break;
      const lvar = data[i++];
      if (data.length - i < lvar) break;
      const v = take(lvar);
      rawValue = hex(v);
      value = rawValue;
      record.unit = 'raw';
      record.quantity = 'raw';
    } else {
      // Unsupported/unknown type. Stop to avoid runaway.
      record.error = `unsupported DIF type 0x${difType.toString(16)}`;
      // do not consume further
    }

    record.rawValue = rawValue;
    record.value = value;

    // Avoid infinite loops
    if (i <= start) break;
    out.records.push(record);
  }

  return out;
}

function decodeFrame(frame) {
  if (!frame || !frame.length) return { frameType: 'none' };
  if (frame.length === 1 && frame[0] === 0xE5) {
    return { frameType: 'ack' };
  }
  if (frame[0] === 0x10 && frame.length >= 5) {
    return { frameType: 'short', cField: frame[1], address: frame[2] };
  }
  if (frame[0] === 0x68) {
    return parseVariableDataFrame(frame) || { frameType: 'long' };
  }
  return { frameType: 'unknown', rawHex: hex(frame) };
}

function buildMetrics(decoded) {
  const m = {};
  const recs = Array.isArray(decoded?.records) ? decoded.records : [];

  const first = (pred) => {
    for (const r of recs) {
      if (!r) continue;
      if (pred(r)) return r;
    }
    return null;
  };

  const e = first(r => r.quantity === 'energy' && r.unit === 'Wh' && typeof r.value === 'number');
  if (e) m.energyWh = e.value;

  const v = first(r => r.quantity === 'volume' && r.unit === 'm³' && typeof r.value === 'number');
  if (v) m.volumeM3 = v.value;

  const p = first(r => r.quantity === 'power' && r.unit === 'W' && typeof r.value === 'number');
  if (p) m.powerW = p.value;

  const f = first(r => r.quantity === 'flow' && r.unit === 'm³/h' && typeof r.value === 'number');
  if (f) m.flowM3h = f.value;

  const t = first(r => r.quantity === 'temperature' && r.unit === '°C' && typeof r.value === 'number');
  if (t) m.temperatureC = t.value;

  return m;
}

/**
 * Wired M-Bus driver.
 *
 * Device config (device.connection):
 * {
 *   path: '/dev/ttyUSB0',
 *   baudRate: 2400,
 *   parity: 'even',
 *   dataBits: 8,
 *   stopBits: 1,
 *   unitId: 1,         // primary address
 *   timeoutMs: 2000,
 *   sendNke: true
 * }
 *
 * Datapoint source schema:
 * {
 *   kind: 'mbus',
 *   field: 'telegramHex' | 'telegramHexPretty' | 'manufacturer' | ...
 * }
 */
class MbusDriver {
  constructor(adapter, deviceCfg, template /* unused */, globalCfg /* unused */) {
    this.adapter = adapter;
    this.cfg = deviceCfg;
    this.template = template;
    this.global = globalCfg || {};

    const c = (this.cfg && this.cfg.connection) ? this.cfg.connection : {};

    this.path = (c.path || '').toString().trim();
    this.baudRate = Number(c.baudRate || 2400);
    this.parity = (c.parity || 'even').toString();
    this.dataBits = Number(c.dataBits || 8);
    this.stopBits = Number(c.stopBits || 1);

    this.unitId = Number(c.unitId ?? c.address ?? 1);
    this.timeoutMs = Number(c.timeoutMs || 2000);
    this.sendNke = (c.sendNke !== false);

    const { key, bus } = acquireBus(this.adapter, {
      path: this.path,
      baudRate: this.baudRate,
      parity: this.parity,
      dataBits: this.dataBits,
      stopBits: this.stopBits,
    });
    this.busKey = key;
    this.bus = bus;
  }

  async disconnect() {
    try {
      if (this.busKey) releaseBus(this.busKey);
    } finally {
      this.busKey = null;
      this.bus = null;
    }
  }

  async readDatapoints(datapoints) {
    const dps = (datapoints || []).filter(dp => dp && dp.source && dp.source.kind === 'mbus' && dp.rw !== 'wo');
    if (!dps.length) return {};

    // Poll once per cycle; all datapoints are derived from the same telegram
    const frame = await this.bus.request(this.unitId, { timeoutMs: this.timeoutMs, sendNke: this.sendNke });

    const telegramHex = hex(frame);
    const telegramHexPretty = hexPretty(frame);
    const decoded = decodeFrame(frame);

    const header = decoded?.header || {};
    const metrics = buildMetrics(decoded);

    const recordsJson = JSON.stringify({ header, records: decoded?.records || [], checksumOk: decoded?.checksumOk }, null, 0);

    const result = {};
    for (const dp of dps) {
      const field = (dp.source.field || dp.source.name || '').toString();
      let val;

      switch (field) {
        case 'telegramHex':
          val = telegramHex;
          break;
        case 'telegramHexPretty':
          val = telegramHexPretty;
          break;
        case 'frameType':
          val = decoded?.frameType || '';
          break;
        case 'checksumOk':
          val = decoded?.checksumOk === true;
          break;
        case 'manufacturer':
          val = header.manufacturer || '';
          break;
        case 'identification':
          val = header.identification || '';
          break;
        case 'medium':
          val = header.mediumText || header.medium || '';
          break;
        case 'version':
          val = header.version ?? null;
          break;
        case 'accessNumber':
          val = header.accessNumber ?? null;
          break;
        case 'status':
          val = header.status ?? null;
          break;
        case 'signature':
          val = header.signature ?? null;
          break;
        case 'recordsJson':
          val = recordsJson;
          break;

        // common metrics (best-effort)
        case 'energyWh':
          val = metrics.energyWh ?? null;
          break;
        case 'volumeM3':
          val = metrics.volumeM3 ?? null;
          break;
        case 'powerW':
          val = metrics.powerW ?? null;
          break;
        case 'flowM3h':
          val = metrics.flowM3h ?? null;
          break;
        case 'temperatureC':
          val = metrics.temperatureC ?? null;
          break;
        default:
          // fall back to null to avoid invalid objects
          val = null;
          break;
      }

      result[dp.id] = val;
    }

    return result;
  }

  async writeDatapoint(/* dp, value */) {
    throw new Error('M-Bus write is not implemented');
  }
}

module.exports = {
  MbusDriver,
};
