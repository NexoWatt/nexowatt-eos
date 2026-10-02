'use strict';

/*
  Modbus driver (RTU + ASCII + TCP) with support for:
  - FC1/FC3/FC4 reads
  - FC5/FC6/FC16 writes
  - per-datapoint read/write mapping (source.read / source.write)
  - wordOrder (be/le) and byteOrder (be/le)
  - optional transforms: scaleFactor (10^n), invert, invertIfSetting, keepPositive, keepNegativeAndInvert
*/

const ModbusRTU = require('modbus-serial');
const { acquireBus, releaseBus } = require('./modbusRtuBus');
const { acquireBus: acquireAsciiBus, releaseBus: releaseAsciiBus } = require('./modbusAsciiBus');
const { applyScale, removeScale, bigIntToNumberOrString } = require('../utils');
const { decodeAsciiLswFirst, encodeAsciiLswFirst, decodeHexLswFirst, decodeIpv4U16 } = require('../weidmuellerCodec');

// Generic async sleep helper (used for Modbus pacing/backoff)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


function _errCode(err) {
  try { return (err && err.code) ? String(err.code) : ''; } catch (_) { return ''; }
}

function _errMsg(err) {
  try { return (err && err.message) ? String(err.message) : String(err); } catch (_) { return ''; }
}

function isTransportError(err) {
  const code = _errCode(err);
  const msg = _errMsg(err);
  const lower = msg.toLowerCase();

  if ([
    'ECONNREFUSED',
    'ECONNRESET',
    'EPIPE',
    'ETIMEDOUT',
    'EHOSTUNREACH',
    'ENETUNREACH',
    'ENOTFOUND',
    'ERR_SOCKET_CLOSED',
    'E_MODBUS_OPERATION_TIMEOUT',
    'E_MODBUS_CONNECT_TIMEOUT',
    'E_MODBUS_BUSY_STALE',
  ].includes(code)) return true;

  // modbus-serial commonly uses this message when the underlying socket/serial port is closed
  if (lower.includes('port not open')) return true;

  // modbus-serial sometimes reports timeouts without setting an error code.
  // In that case we still want to treat it like a transport problem and force a reconnect.
  if (lower.includes('timed out') || lower.includes('timeout')) return true;
  if (lower.includes('hard-timeout') || lower.includes('hard timeout')) return true;

  // generic socket messages
  if (lower.includes('not connected')) return true;
  if (lower.includes('socket') && (lower.includes('hang up') || lower.includes('closed') || lower.includes('ended'))) return true;

  return false;
}


function _modbusExceptionCode(err) {
  try {
    const raw = err && (err.modbusCode ?? err.exceptionCode ?? err.exception ?? err.modbusExceptionCode ?? err.responseCode);
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  } catch (_) {
    return undefined;
  }
}

function isModbusIllegalAddressOrValue(err) {
  const msg = _errMsg(err).toLowerCase();
  const code = _modbusExceptionCode(err);
  if (code === 2 || code === 3) return true;
  if (msg.includes('modbus exception 2') || msg.includes('exception 2:')) return true;
  if (msg.includes('modbus exception 3') || msg.includes('exception 3:')) return true;
  if (msg.includes('illegal data address') || msg.includes('illegal address')) return true;
  if (msg.includes('illegal data value') || msg.includes('illegal value')) return true;
  return false;
}

function isModbusIllegalAddress(err) {
  const msg = _errMsg(err).toLowerCase();
  const code = _modbusExceptionCode(err);
  if (code === 2) return true;
  if (msg.includes('modbus exception 2') || msg.includes('exception 2:')) return true;
  if (msg.includes('illegal data address') || msg.includes('illegal address')) return true;
  return false;
}

function isModbusIllegalValue(err) {
  const msg = _errMsg(err).toLowerCase();
  const code = _modbusExceptionCode(err);
  if (code === 3) return true;
  if (msg.includes('modbus exception 3') || msg.includes('exception 3:')) return true;
  if (msg.includes('illegal data value') || msg.includes('illegal value')) return true;
  return false;
}

function isModbusProtocolException(err) {
  if (isTransportError(err)) return false;
  const msg = _errMsg(err).toLowerCase();
  const code = _modbusExceptionCode(err);
  if (Number.isFinite(code) && code >= 1 && code <= 255) return true;
  if (msg.includes('modbus exception')) return true;
  if (msg.includes('slave device failure')) return true;
  if (msg.includes('illegal function')) return true;
  if (msg.includes('device busy')) return true;
  return false;
}

function normalizeAddressFallbackOffsets(src) {
  if (src && (src.disableAddressFallbackOffsets === true || src.disableAddressFallbacks === true || src.noAddressFallback === true || src.noFallbackAddressOffsets === true)) return [];
  const raw = src && (src.fallbackAddressOffsets ?? src.alternateAddressOffsets ?? src.retryAddressOffsets ?? src.addressFallbackOffsets);
  const arr = Array.isArray(raw) ? raw : (raw === undefined || raw === null ? [] : [raw]);
  const out = [];
  for (const v of arr) {
    const n = Number(v);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n === 0) continue;
    // Conservative: this is for documented off-by-one vendor variants only, not arbitrary scanning.
    if (Math.abs(n) > 2) continue;
    if (!out.includes(n)) out.push(n);
  }
  return out;
}


function normalizeWordOrder(v) {
  const s = (v ?? '').toString().toLowerCase();
  if (s === 'le' || s === 'little' || s === 'little_endian' || s === 'lswmsw' || s === 'lsw_msw') return 'le';
  return 'be';
}

function normalizeByteOrder(v) {
  const s = (v ?? '').toString().toLowerCase();
  if (s === 'le' || s === 'little' || s === 'little_endian') return 'le';
  return 'be';
}

function swapBytesInWords(buf) {
  // swap bytes inside each 16-bit register word
  for (let i = 0; i + 1 < buf.length; i += 2) {
    const a = buf[i];
    buf[i] = buf[i + 1];
    buf[i + 1] = a;
  }
}

function regsToBuffer(regs, wordOrder, byteOrder) {
  const wo = normalizeWordOrder(wordOrder);
  const bo = normalizeByteOrder(byteOrder);

  const arr = Array.isArray(regs) ? regs.slice() : [];
  if (wo === 'le') arr.reverse();

  const buf = Buffer.alloc(arr.length * 2);
  for (let i = 0; i < arr.length; i++) {
    buf.writeUInt16BE(arr[i] & 0xFFFF, i * 2);
  }

  if (bo === 'le') swapBytesInWords(buf);
  return buf;
}

function bufferToRegs(buf, wordOrder, byteOrder) {
  const wo = normalizeWordOrder(wordOrder);
  const bo = normalizeByteOrder(byteOrder);

  const tmp = Buffer.from(buf); // copy
  if (bo === 'le') swapBytesInWords(tmp);

  const regs = [];
  for (let i = 0; i < tmp.length; i += 2) {
    regs.push(tmp.readUInt16BE(i));
  }

  if (wo === 'le') regs.reverse();
  return regs;
}


function decodeBcdHhmmss(buf) {
  // Mennekes and a few other Modbus devices expose time-of-day as
  // big-endian packed BCD with left-zero padding across two registers.
  // Example bytes: 00 12 34 56 -> "12:34:56".
  if (!buf || !buf.length) return '';
  let digits = '';
  for (const b of buf) {
    const hi = (b >>> 4) & 0x0F;
    const lo = b & 0x0F;
    if (hi > 9 || lo > 9) return '';
    digits += String(hi) + String(lo);
  }
  if (digits.length < 6) digits = digits.padStart(6, '0');
  digits = digits.slice(-6);
  const hh = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  const ss = digits.slice(4, 6);
  return `${hh}:${mm}:${ss}`;
}

function bufferToValue(buf, dataType) {
  const t = (dataType || 'uint16').toString().toLowerCase();

  switch (t) {
    case 'bool':
    case 'boolean': {
      // Some devices store booleans in registers (uint16 0/1). In that case the buffer length is 2.
      if (buf.length >= 2) return buf.readUInt16BE(0) !== 0;
      return buf.readUInt8(0) !== 0;
    }

    case 'string':
    case 'ascii': {
      const s = buf.toString('ascii');
      const nul = s.indexOf('\0');
      return (nul >= 0 ? s.substring(0, nul) : s).trim();
    }

    case 'ascii_lsw_first':
    case 'string_lsw_first':
    case 'weidmueller_ascii':
      return decodeAsciiLswFirst(buf);

    case 'hex_lsw_first':
    case 'weidmueller_hex':
      return decodeHexLswFirst(buf);

    case 'ipv4_u16':
    case 'weidmueller_ipv4':
      return decodeIpv4U16(buf);

    case 'bcd_hhmmss':
    case 'bcdhhmmss':
    case 'hhmmss_bcd':
    case 'hhmmss':
      return decodeBcdHhmmss(buf);

    case 'int16':
      return buf.readInt16BE(0);
    case 'uint16':
      return buf.readUInt16BE(0);
    case 'int32':
      return buf.readInt32BE(0);
    case 'uint32':
      return buf.readUInt32BE(0);
    case 'float32':
      return buf.readFloatBE(0);
    case 'int64':
      return buf.readBigInt64BE(0);
    case 'uint64':
      return buf.readBigUInt64BE(0);
    case 'float64':
      return buf.readDoubleBE(0);
    default:
      return buf.readUInt16BE(0);
  }
}

function valueToBuffer(value, dataType, byteLength) {
  const t = (dataType || 'uint16').toString().toLowerCase();
  const bl = Number(byteLength || 2);
  const buf = Buffer.alloc(bl);

  if (t === 'bool' || t === 'boolean') {
    // If this is a register (2 bytes), write a uint16 0/1. For coils (1 byte) write 0/1.
    if (bl >= 2) {
      buf.writeUInt16BE(value ? 1 : 0, 0);
    } else {
      buf.writeUInt8(value ? 1 : 0, 0);
    }
    return buf;
  }

  if (t === 'string' || t === 'ascii') {
    const s = (value === null || value === undefined) ? '' : String(value);
    buf.fill(0);
    buf.write(s, 0, Math.min(buf.length, Buffer.byteLength(s, 'ascii')), 'ascii');
    return buf;
  }

  if (t === 'ascii_lsw_first' || t === 'string_lsw_first' || t === 'weidmueller_ascii') {
    return encodeAsciiLswFirst(value, bl);
  }

  // Use BigInt for 64-bit if user provides a string
  const asBigInt = (v) => {
    if (typeof v === 'bigint') return v;
    if (typeof v === 'number') return BigInt(Math.trunc(v));
    if (typeof v === 'string') {
      try { return BigInt(v); } catch (e) { return BigInt(0); }
    }
    return BigInt(0);
  };

  switch (t) {
    case 'int16':
      buf.writeInt16BE(Math.round(Number(value)), 0);
      break;
    case 'uint16':
      buf.writeUInt16BE(Math.round(Number(value)), 0);
      break;
    case 'int32':
      buf.writeInt32BE(Math.round(Number(value)), 0);
      break;
    case 'uint32':
      buf.writeUInt32BE(Math.round(Number(value)), 0);
      break;
    case 'float32':
      buf.writeFloatBE(Number(value), 0);
      break;
    case 'int64':
      buf.writeBigInt64BE(asBigInt(value), 0);
      break;
    case 'uint64':
      buf.writeBigUInt64BE(asBigInt(value), 0);
      break;
    case 'float64':
      buf.writeDoubleBE(Number(value), 0);
      break;
    default:
      buf.writeUInt16BE(Number(value), 0);
      break;
  }
  return buf;
}


function isNumericModbusDataType(dataType) {
  const t = (dataType || 'uint16').toString().toLowerCase();
  return !['string', 'ascii', 'bool', 'boolean', 'bcd_hhmmss', 'bcdhhmmss', 'hhmmss_bcd', 'hhmmss'].includes(t);
}

function dataTypeWordLength(dataType) {
  const t = (dataType || 'uint16').toString().toLowerCase();
  if (t === 'bool' || t === 'boolean' || t === 'int16' || t === 'uint16') return 1;
  if (t === 'int32' || t === 'uint32' || t === 'float32') return 2;
  if (t === 'int64' || t === 'uint64' || t === 'float64') return 4;
  return 1;
}

function parseNumericMaybeHex(x) {
  if (x === null || x === undefined) return undefined;
  if (typeof x === 'number') return Number.isFinite(x) ? x : undefined;
  if (typeof x === 'boolean') return x ? 1 : 0;
  if (typeof x === 'string') {
    const s = x.trim().toLowerCase().replace(',', '.');
    if (!s) return undefined;
    if (s.startsWith('0x')) {
      const n = parseInt(s, 16);
      return Number.isFinite(n) ? n : undefined;
    }
    const direct = Number(s);
    if (Number.isFinite(direct)) return direct;
    // Accept UI/front-end strings such as "6 a", "3 phases" or "4.2 kw".
    const m = s.match(/[-+]?\d+(?:\.\d+)?/);
    if (!m) return undefined;
    const n = Number(m[0]);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function normalizeAllowedValues(values) {
  if (!Array.isArray(values)) return [];
  const out = [];
  for (const v of values) {
    const n = parseNumericMaybeHex(v);
    if (n !== undefined && !out.includes(n)) out.push(n);
  }
  return out;
}

function normalizeAllowedRanges(values) {
  if (!Array.isArray(values)) return [];
  const out = [];
  for (const r of values) {
    let min;
    let max;
    if (Array.isArray(r)) {
      min = parseNumericMaybeHex(r[0]);
      max = parseNumericMaybeHex(r[1]);
    } else if (r && typeof r === 'object') {
      min = parseNumericMaybeHex(r.min ?? r.from ?? r.start ?? r[0]);
      max = parseNumericMaybeHex(r.max ?? r.to ?? r.end ?? r[1]);
    }
    if (min === undefined || max === undefined) continue;
    if (max < min) { const tmp = min; min = max; max = tmp; }
    out.push({ min, max });
  }
  return out;
}

function applyWriteValueConstraints(raw, src, dpId) {
  const dt = (src && src.dataType ? src.dataType : 'uint16').toString().toLowerCase();
  if (src && src.valueMap && typeof src.valueMap === 'object') {
    const key = String(raw);
    if (Object.prototype.hasOwnProperty.call(src.valueMap, key)) {
      raw = src.valueMap[key];
    }
  }

  if (!isNumericModbusDataType(dt)) return raw;

  const n = parseNumericMaybeHex(raw);
  if (src && src.finite === true && n === undefined) {
    throw new Error(`Invalid non-numeric Modbus write value for ${dpId || 'datapoint'}: ${raw}`);
  }

  let v = (n !== undefined) ? n : raw;
  if (typeof v !== 'number') return v;
  if (!Number.isFinite(v)) {
    throw new Error(`Invalid non-finite Modbus write value for ${dpId || 'datapoint'}: ${raw}`);
  }

  const allowed = normalizeAllowedValues(src && (src.allowedValues || src.enumValues || src.validValues));
  const allowedRanges = normalizeAllowedRanges(src && (src.allowedRanges || src.validRanges || src.writeRanges));
  if (allowed.length || allowedRanges.length) {
    const inAllowedValue = allowed.includes(v);
    const inAllowedRange = allowedRanges.some(r => v >= r.min && v <= r.max);
    if (!inAllowedValue && !inAllowedRange) {
      const parts = [];
      if (allowed.length) parts.push(allowed.join(', '));
      if (allowedRanges.length) parts.push(allowedRanges.map(r => `${r.min}..${r.max}`).join(', '));
      throw new Error(`Invalid Modbus write value for ${dpId || 'datapoint'}: ${v}. Allowed values/ranges: ${parts.join('; ')}`);
    }
  }

  const nonZeroMin = parseNumericMaybeHex(src && (src.zeroOrMinValue ?? src.nonZeroMinValue ?? src.positiveMinValue ?? src.minPositiveValue));
  if (nonZeroMin !== undefined && v > 0 && v < nonZeroMin) {
    v = nonZeroMin;
  }

  const min = parseNumericMaybeHex(src && (src.minValue ?? src.min ?? src.writeMin));
  const max = parseNumericMaybeHex(src && (src.maxValue ?? src.max ?? src.writeMax));
  if (min !== undefined && v < min) {
    throw new Error(`Invalid Modbus write value for ${dpId || 'datapoint'}: ${v} is below minimum ${min}`);
  }
  if (max !== undefined && v > max) {
    throw new Error(`Invalid Modbus write value for ${dpId || 'datapoint'}: ${v} is above maximum ${max}`);
  }

  if (src && (src.round === true || src.integer === true || src.int === true)) v = Math.round(v);
  return v;
}

function mergeModbusSource(root, override) {
  if (!root || root.kind !== 'modbus') return null;
  const merged = Object.assign({}, root, override || {});
  merged.kind = 'modbus';
  return merged;
}

function getReadSource(dp) {
  const src = dp?.source;
  if (!src || src.kind !== 'modbus') return null;
  if (src.poll === false || src.readPoll === false || src.disablePoll === true || src.disabled === true) return null;
  const rs = src.read || src;
  if (!rs || rs.fc == null) return null;
  if (rs.poll === false || rs.readPoll === false || rs.disablePoll === true || rs.disabled === true) return null;
  return mergeModbusSource(src, rs);
}

function getWriteSource(dp) {
  const src = dp?.source;
  if (!src || src.kind !== 'modbus') return null;
  const ws = src.write || src;
  if (!ws || ws.fc == null) return null;
  return mergeModbusSource(src, ws);
}

function buildGroups(items, maxRegs, options) {
  const max = Number(maxRegs || 120);
  // Some devices reject requests that include unmapped/reserved registers even
  // when the requested span is small. For those templates, set
  // driverHints.modbus.strictContiguousReads=true to split reads at gaps.
  const allowGaps = !(options && options.allowGaps === false);
  // Some devices expose optional registers inside otherwise contiguous ranges. If one
  // optional register rejects the request, a combined group can suppress important
  // neighbours. isolateItems keeps each datapoint in its own Modbus request while
  // still reading multi-register values (FLOAT32/FLOAT64/STRING) atomically.
  const isolateItems = !!(options && options.isolateItems === true);

  const normalizeReadRequestGroup = (src) => {
    if (!src || typeof src !== 'object') return null;
    const raw = src.readRequestGroup ?? src.readGroup ?? src.requestGroup;
    if (raw === undefined || raw === null || raw === '') return null;
    return String(raw);
  };

  const dps = (items || [])
    .map(item => {
      const addr = Number(item.addr);
      const len = Number(item.len || 1);
      return {
        ...item,
        addr,
        len,
        end: addr + len - 1,
        readRequestGroup: normalizeReadRequestGroup(item && item.src),
      };
    })
    .sort((a, b) => a.addr - b.addr);

  if (isolateItems) {
    return dps.map(item => ({
      start: item.addr,
      end: item.end,
      items: [item],
      readRequestGroup: item.readRequestGroup,
    }));
  }

  const groups = [];
  let g = null;

  for (const item of dps) {
    if (!g) {
      g = {
        start: item.addr,
        end: item.end,
        items: [item],
        readRequestGroup: item.readRequestGroup,
      };
      continue;
    }

    const newEnd = Math.max(g.end, item.end);
    const span = newEnd - g.start + 1;
    const contiguous = item.addr <= (g.end + 1);
    // Explicit request groups are protocol boundaries. ABL EVCC2/3, for example,
    // requires 0x0001 as an exact R2 request and 0x0003 as a separate R1 request;
    // merging the contiguous addresses into 0x0001/3 makes the controller stay silent.
    const sameExplicitRequestGroup = g.readRequestGroup === item.readRequestGroup;

    if (span <= max && (allowGaps || contiguous) && sameExplicitRequestGroup) {
      g.end = newEnd;
      g.items.push(item);
    } else {
      groups.push(g);
      g = {
        start: item.addr,
        end: item.end,
        items: [item],
        readRequestGroup: item.readRequestGroup,
      };
    }
  }

  if (g) groups.push(g);
  return groups;
}

class ModbusDriver {
  constructor(adapter, deviceConfig, template, globalConfig) {
    this.adapter = adapter;
    this.device = deviceConfig;
    this.template = template;
    this.global = globalConfig || {};

    this.client = null; // TCP client
    this.rtuBus = null;
    this.rtuBusKey = null;
    this.asciiBus = null;
    this.asciiBusKey = null;

    if (deviceConfig.protocol === 'modbusTcp') {
      this.client = new ModbusRTU();
    }
    this.connected = false;
    this.connecting = false;
    this._busy = false;

    // Cache for dynamic scale factors (e.g. SunSpec *_SF registers)
    this._sfCache = new Map();
    this._sfWarnedUntil = new Map(); // throttle warnings for broken scale factors (e.g. wrong endian)

    const c = deviceConfig.connection || {};

    // Optional driver hints from templates (best-effort)
    const hints = (template && template.driverHints && template.driverHints.modbus) ? template.driverHints.modbus : {};
    this._modbusHints = hints;

    // DEPower V10.03 AC/DC charge-point control is not a collection of independent
    // writable registers. Field testing showed that the station can continuously
    // report 0 for the universal Charge mode / station power registers while the
    // connector-specific command and power registers still exist. NexoWatt therefore
    // treats ctrl.run + ctrl.powerLimitW as the authoritative command interface and
    // re-applies the documented prerequisites immediately before a start/power command.
    // The raw RW datapoints remain real device readbacks and are intentionally allowed
    // to return to the value reported by the charger.
    const depowerHints = (template && template.driverHints && template.driverHints.oemModbusV1003 && typeof template.driverHints.oemModbusV1003 === 'object')
      ? template.driverHints.oemModbusV1003
      : null;
    this._depowerV1003 = depowerHints;
    this._depowerControlQueue = Promise.resolve();
    for (const key of ['depowerSessionEnergyWhPerTick', 'depowerTotalEnergyWhPerTick']) {
      const configured = this.device?.connection?.[key];
      if (depowerHints && configured !== undefined && configured !== null && configured !== '' &&
          ![0.1, 1, 10, 100, 1000].includes(Number(configured))) {
        throw new Error(`Invalid ${key}: expected 0.1, 1, 10, 100 or 1000 Wh per register tick`);
      }
    }
    this._depowerDesiredPowerW = undefined;
    this._depowerDesiredRun = undefined;
    this._depowerLastPrepareRearmAt = 0;

    // Vendor/profile detection must not depend on user connection settings.  Alfen ACE
    // templates store real Modbus protocol addresses (document register - 1) and use
    // fixed Unit-IDs per socket/SCN.  Any stale UI/global address offset would move
    // 32-bit control values into the wrong register pair (e.g. 1209 -> 1210), so we
    // hard-disable address offsets/fallbacks for every Alfen profile here as well as
    // in the templates.
    const tplIdLowerForFallback = String((template && template.id) || deviceConfig.templateId || deviceConfig.template || '').toLowerCase();
    const mfrLowerForFallback = String((template && template.manufacturer) || deviceConfig.manufacturer || deviceConfig.vendor || '').toLowerCase();
    const profileLowerForFallback = `${tplIdLowerForFallback} ${mfrLowerForFallback} ${String(deviceConfig.name || '').toLowerCase()}`;
    this._isAlfenProfile = mfrLowerForFallback === 'alfen' || profileLowerForFallback.includes('alfen');

    // Alfen ACE exposes the live meter registers even when the EMS socket-control
    // registers are not enabled in ACE Service Installer.  If we try to WRITE the
    // Max Current register while that block is not exposed, some chargers answer
    // with Modbus exception 2/3 and may temporarily refuse new TCP sessions.
    // Therefore Alfen control writes are preflight-probed and temporarily disabled
    // per session as soon as the charger tells us the block is not available.
    const alfenTopHints = (template && template.alfen && typeof template.alfen === 'object') ? template.alfen : {};
    const alfenModbusHints = (hints && typeof hints.alfen === 'object' && hints.alfen) ? hints.alfen : {};
    const alfenHints = Object.assign({}, alfenTopHints, alfenModbusHints);
    this._alfenHints = alfenHints;
    this._alfenProbeControlBeforeWrite = this._isAlfenProfile && alfenHints.probeControlBeforeWrite !== false;
    this._alfenControlUnsupportedUntil = 0;
    this._alfenScnUnsupportedUntil = 0;
    this._alfenControlProbeOkUntilByKey = new Map();
    // The official ACE v1.0 guide defines protocol addresses as document register - 1.
    // Existing NexoWatt installations therefore keep that audited layout as the first
    // and canonical candidate. A small number of current NG9xx field installations,
    // however, answer with exception 2 on the canonical write and expose the same
    // control block on the direct table address. The compatibility probe is deliberately
    // runtime-only and never changes template/alias definitions.
    this._alfenControlVariantByKey = new Map();
    this._alfenReadAddressOffsetByKey = new Map();
    this._alfenReadWordOrderByKey = new Map();
    this._alfenReadByteOrderByKey = new Map();
    this._alfenUnsupportedLogTsByKey = new Map();
    this._alfenWriteTraceCountByKey = new Map();
    this._alfenVariantLogCountByKey = new Map();
    this._alfenAddressCompatibilityProbe = this._isAlfenProfile && alfenHints.disableAddressCompatibilityProbe !== true;
    this._alfenDirectAddressOffset = (() => {
      const n = Number(alfenHints.directTableAddressOffset ?? alfenHints.compatibilityAddressOffset ?? 1);
      return Number.isFinite(n) && Number.isInteger(n) && Math.abs(n) <= 2 && n !== 0 ? n : 1;
    })();
    const alfenBackoffRaw = Number(alfenHints.controlUnsupportedBackoffMs ?? hints.unsupportedWriteCooldownMs ?? hints.writeRejectBackoffMs ?? 3600000);
    this._alfenControlUnsupportedBackoffMs = Number.isFinite(alfenBackoffRaw) && alfenBackoffRaw > 0 ? alfenBackoffRaw : 3600000;
    const alfenOkRaw = Number(alfenHints.controlProbeOkCacheMs ?? 60000);
    this._alfenControlProbeOkCacheMs = Number.isFinite(alfenOkRaw) && alfenOkRaw > 0 ? alfenOkRaw : 60000;

    this.optionalReadErrorLogLevel = String(hints.optionalReadErrorLogLevel || hints.optionalReadLogLevel || 'warn').toLowerCase();
    this.disableAddressFallbackOffsets = (hints.disableAddressFallbackOffsets === true || hints.disableAddressFallbacks === true);
    this._serialDefaults = (hints && typeof hints.serialDefaults === 'object' && hints.serialDefaults) ? hints.serialDefaults : null;
    this._asciiResponseStart = String((c.asciiResponseStart ?? hints.asciiResponseStart ?? (this._serialDefaults && this._serialDefaults.asciiResponseStart) ?? ':')).trim() || ':';

    // Optional SolaX VPP Mode-4 block write (new protocol requires multi-write
    // starting at 0x00A0 with a fixed length for the selected mode).
    // Configured via template.driverHints.modbus.solaxVppMode4.
    this._solaxVppMode4 = (hints && typeof hints.solaxVppMode4 === 'object') ? hints.solaxVppMode4 : null;

    // Optional SolaX VPP Mode-8 block write (PV & BAT individual setting - duration mode).
    // Configured via template.driverHints.modbus.solaxVppMode8.
    this._solaxVppMode8 = (hints && typeof hints.solaxVppMode8 === 'object') ? hints.solaxVppMode8 : null;

    // Optional FoxESS Remote Control block write (battery power target needs a multi-write starting at 46001).
    // Configured via template.driverHints.modbus.foxessRemoteControl.
    this._foxessRemoteControl = (hints && typeof hints.foxessRemoteControl === 'object') ? hints.foxessRemoteControl : null;

    // Optional Sungrow signed battery power control. Sungrow SH/Logger/iHM use separate
    // registers for mode, charge/discharge command and unsigned power. This helper exposes
    // a single signed W datapoint (+ discharge / - charge / 0 stop) while writing the required
    // companion registers automatically.
    // Configured via template.driverHints.modbus.sungrowSignedPowerControl(s).
    const sgPc = hints && (hints.sungrowSignedPowerControls || hints.sungrowSignedPowerControl || hints.sungrowPowerControl);
    this._sungrowSignedPowerControls = Array.isArray(sgPc) ? sgPc : (sgPc && typeof sgPc === 'object' ? [sgPc] : []);
    // Cache per helper profile when the mandatory Sungrow EMS/VPP mode register was
    // last written.  Sungrow battery dispatch is exposed to EOS/EMS as one signed
    // power datapoint, but protocol-wise it needs mode + command + power + heartbeat.
    // The mode is a relatively static prerequisite and should not be spammed for every
    // power update via WiNet-S/WiNet-S2/Logger1000.
    this._sungrowModeLastWriteAt = new Map();

    this.protocol = deviceConfig.protocol; // modbusTcp or modbusRtu
    // Treat 0 or invalid values as "use default" (the UI often uses 0 to mean "not set").
    const cfgTimeout = Number(c.timeoutMs);
    const hintTimeout = Number(hints.timeoutMs);
    const globalTimeout = Number(this.global.modbusTimeoutMs);

    if (Number.isFinite(cfgTimeout) && cfgTimeout > 0) {
      this.timeoutMs = cfgTimeout;
    } else if (Number.isFinite(hintTimeout) && hintTimeout > 0) {
      this.timeoutMs = hintTimeout;
    } else if (Number.isFinite(globalTimeout) && globalTimeout > 0) {
      this.timeoutMs = globalTimeout;
    } else {
      this.timeoutMs = 2000;
    }

    // Keep manual vs. auto-discovered values separate.
    // - manualUnitId / manualAddressOffset come from the device config
    // - autoUnitId / autoAddressOffset can be discovered at runtime (e.g. SunSpec base scan)
    const cfgUnitId = Number(c.unitId);
    const hintUnitId = Number(hints.unitIdDefault);
    const hintTcpUnitId = Number(hints.tcpUnitIdDefault ?? hints.unitIdDefaultTcp ?? hints.modbusTcpUnitIdDefault);
    const isTcpProtocol = String(deviceConfig.protocol || '').toLowerCase() === 'modbustcp';
    const rawEnforceUnitIdDefault = (c.enforceUnitIdDefault ?? hints.enforceUnitIdDefault ?? false);
    const enforceUnitIdDefault = rawEnforceUnitIdDefault === true || String(rawEnforceUnitIdDefault).toLowerCase() === 'true';
    const rawEnforceTcpUnitIdDefault = (c.enforceTcpUnitIdDefault ?? c.enforceUnitIdDefaultTcp ?? hints.enforceTcpUnitIdDefault ?? hints.enforceUnitIdDefaultTcp ?? false);
    const enforceTcpUnitIdDefault = rawEnforceTcpUnitIdDefault === true || String(rawEnforceTcpUnitIdDefault).toLowerCase() === 'true';

    if (isTcpProtocol && enforceTcpUnitIdDefault && Number.isFinite(hintTcpUnitId) && hintTcpUnitId > 0) {
      // TCP-only fixed Unit-ID. Useful for devices such as KEBA P40 where TCP uses 255,
      // while RTU installations may still use a user-configured slave address.
      this.manualUnitId = hintTcpUnitId;
    } else if (enforceUnitIdDefault && Number.isFinite(hintUnitId) && hintUnitId > 0) {
      // Some Modbus profiles use fixed server/unit addresses per register group.
      // For those templates, stale admin configs must not override the protocol value
      // (e.g. Alfen NG9xx: socket1=1, socket2=2, station/SCN=200).
      this.manualUnitId = hintUnitId;
    } else if (Number.isFinite(cfgUnitId) && cfgUnitId > 0) {
      this.manualUnitId = cfgUnitId;
    } else if (isTcpProtocol && Number.isFinite(hintTcpUnitId) && hintTcpUnitId > 0) {
      this.manualUnitId = hintTcpUnitId;
    } else if (Number.isFinite(hintUnitId) && hintUnitId > 0) {
      this.manualUnitId = hintUnitId;
    } else {
      this.manualUnitId = 1;
    }
    this.autoUnitId = null;
    this.unitId = this.manualUnitId;
    this._tcpCurrentUnitId = null;

    const forcedAddressOffsetRaw = (c.forceAddressOffset ?? hints.forceAddressOffset ?? hints.enforcedAddressOffset);
    const forcedAddressOffset = Number(forcedAddressOffsetRaw);
    if (this._isAlfenProfile) {
      // Alfen ACE templates are audited as protocol addresses already.  Force offset 0 even
      // if an older adapter configuration still contains addressOffset=1/-1.
      this.manualAddressOffset = 0;
    } else if (forcedAddressOffsetRaw !== undefined && forcedAddressOffsetRaw !== null && forcedAddressOffsetRaw !== '' && Number.isFinite(forcedAddressOffset)) {
      // Template/device enforced offset. Used when template addresses are already protocol addresses
      // and a stale manual/global offset would shift all registers to the wrong place.
      this.manualAddressOffset = forcedAddressOffset;
    } else {
      const hintAddressOffset = Number(hints.addressOffsetDefault ?? hints.defaultAddressOffset);
      if (Number.isFinite(Number(c.addressOffset))) {
        this.manualAddressOffset = Number(c.addressOffset);
      } else if (Number.isFinite(hintAddressOffset)) {
        this.manualAddressOffset = hintAddressOffset;
      } else {
        this.manualAddressOffset = Number(this.global.registerAddressOffset ?? 0);
      }
    }
    this.autoAddressOffset = 0;

    this._disableAddressFallbackOffsets =
      this._isAlfenProfile ||
      hints.disableAddressFallbackOffsets === true ||
      hints.disableFallbackAddressOffsets === true ||
      hints.disableOffByOneFallback === true;

    // Optional driver hints from templates (best-effort)
    // (hints already defined above)
    this._autoSunSpec = (hints.autoSunSpec === true) || (hints.sunspec === true);
    this._sunSpecTemplateBase = Number(hints.sunSpecTemplateBase ?? 40000);
    this._sunSpecScanBases = Array.isArray(hints.sunSpecScanBases) ? hints.sunSpecScanBases.map(Number) : null;
    this._sunSpecScanUnitIds = Array.isArray(hints.sunSpecScanUnitIds) ? hints.sunSpecScanUnitIds.map(Number) : null;
    this._sunSpecScanFcs = Array.isArray(hints.sunSpecScanFunctionCodes) ? hints.sunSpecScanFunctionCodes.map(Number) : null;
    this._sunSpecDiscovered = false;
    this._sunSpecFc = null; // FC used for SunSpec registers (3/4)
    this._sunSpecFoundBase = null; // discovered base register for 'SunS'
    this._sunSpecModelsById = new Map(); // modelId -> [{offset,len}]
    this._sunSpecModelsScanned = false;

    // Modbus pacing/backoff:
    // Some devices (especially via monitoring modules) require a minimum delay between two Modbus commands.
    // If we hammer the device with too many back-to-back reads/writes, it may stop responding (timeouts)
    // until the TCP session is reset.
    const rawMinCmdInterval = (c.minCommandIntervalMs ?? hints.minCommandIntervalMs ?? hints.minIntervalMs ?? this.global.modbusMinCommandIntervalMs ?? 0);
    this.minCommandIntervalMs = Number(rawMinCmdInterval);
    if (!Number.isFinite(this.minCommandIntervalMs) || this.minCommandIntervalMs < 0) this.minCommandIntervalMs = 0;

    const rawReconnectBackoff = (c.reconnectBackoffMs ?? hints.reconnectBackoffMs ?? this.global.modbusReconnectBackoffMs ?? 0);
    this.reconnectBackoffMs = Number(rawReconnectBackoff);
    if (!Number.isFinite(this.reconnectBackoffMs) || this.reconnectBackoffMs < 0) this.reconnectBackoffMs = 0;

    const rawMaxBackoff = (c.maxReconnectBackoffMs ?? hints.maxReconnectBackoffMs ?? this.global.modbusMaxReconnectBackoffMs ?? 30000);
    this.maxReconnectBackoffMs = Number(rawMaxBackoff);
    if (!Number.isFinite(this.maxReconnectBackoffMs) || this.maxReconnectBackoffMs < 0) this.maxReconnectBackoffMs = 30000;
    if (this.maxReconnectBackoffMs < this.reconnectBackoffMs) this.maxReconnectBackoffMs = this.reconnectBackoffMs;

    // Maximum Modbus register span per read request (best-effort).
    // Conservative default: many embedded devices reject big reads or requests that
    // cross reserved register gaps. Templates/users can still raise this value.
    const rawMaxReadRegs = (c.maxReadRegs ?? hints.maxReadRegs ?? hints.maxReadRegisters ?? this.global.modbusMaxReadRegs ?? 40);
    this.maxReadRegs = Number(rawMaxReadRegs);
    if (!Number.isFinite(this.maxReadRegs) || this.maxReadRegs <= 0) this.maxReadRegs = 40;

    const rawStrictContiguousReads = (c.strictContiguousReads ?? c.strictReadGroups ?? hints.strictContiguousReads ?? hints.strictReadGroups ?? hints.noReadGaps ?? this.global.modbusStrictContiguousReads ?? true);
    this.strictContiguousReads = rawStrictContiguousReads === true || String(rawStrictContiguousReads).toLowerCase() === 'true';

    const rawIsolateReadDatapoints = (c.isolateReadDatapoints ?? c.isolateModbusReadDatapoints ?? c.isolateReads ?? hints.isolateReadDatapoints ?? hints.isolateModbusReadDatapoints ?? hints.isolateReads ?? false);
    this.isolateReadDatapoints = rawIsolateReadDatapoints === true || String(rawIsolateReadDatapoints).toLowerCase() === 'true';

    // Optional best-effort reads for large vendor templates. Some Modbus devices abort
    // the TCP session when a request hits optional/reserved register ranges. With this
    // enabled, non-critical read groups are skipped temporarily after a failure while
    // required live values can continue to update.
    const rawContinueOnReadError = (c.continueOnReadError ?? c.ignoreOptionalReadErrors ?? hints.continueOnReadError ?? hints.ignoreOptionalReadErrors ?? this.global.modbusContinueOnReadError ?? true);
    this.continueOnReadError = rawContinueOnReadError === true || String(rawContinueOnReadError).toLowerCase() === 'true';

    // Generic defensive recovery for older templates: if a device rejects a Modbus
    // read group with exception 2/3, recover by splitting the group down to single
    // datapoints and keep the values that are actually supported. If every group
    // fails, the poll still fails so a wrong IP/template does not look healthy.
    const rawAdaptiveReadSplit = (c.adaptiveReadSplit ?? c.adaptiveModbusReadSplit ?? hints.adaptiveReadSplit ?? hints.adaptiveReadRecovery ?? this.global.modbusAdaptiveReadSplit ?? true);
    this.adaptiveReadSplit = rawAdaptiveReadSplit !== false && String(rawAdaptiveReadSplit).toLowerCase() !== 'false';

    const rawSoftIllegalAddressReads = (c.softIllegalAddressReads ?? c.softIllegalReads ?? c.continueOnIllegalAddress ?? hints.softIllegalAddressReads ?? hints.softIllegalReads ?? hints.continueOnIllegalAddress ?? this.global.modbusSoftIllegalAddressReads ?? true);
    this.softIllegalAddressReads = rawSoftIllegalAddressReads !== false && String(rawSoftIllegalAddressReads).toLowerCase() !== 'false';

    const rawSplitFailedReadGroupsMs = (c.splitFailedReadGroupsMs ?? hints.splitFailedReadGroupsMs ?? this.global.modbusSplitFailedReadGroupsMs ?? 600000);
    this.splitFailedReadGroupsMs = Number(rawSplitFailedReadGroupsMs);
    if (!Number.isFinite(this.splitFailedReadGroupsMs) || this.splitFailedReadGroupsMs < 0) this.splitFailedReadGroupsMs = 600000;
    this._readGroupForceSplitUntil = new Map();
    this._readGroupSplitWarnUntil = new Map();

    const requiredReadDpIdsRaw = (c.requiredReadDpIds ?? hints.requiredReadDpIds ?? hints.requiredDpIds ?? []);
    const requiredReadDpIds = Array.isArray(requiredReadDpIdsRaw) ? requiredReadDpIdsRaw : [];
    this.requiredReadDpIds = new Set(requiredReadDpIds.map(x => String(x)).filter(Boolean));

    const rawSkipFailedReadGroupsMs = (c.skipFailedReadGroupsMs ?? hints.skipFailedReadGroupsMs ?? 300000);
    this.skipFailedReadGroupsMs = Number(rawSkipFailedReadGroupsMs);
    if (!Number.isFinite(this.skipFailedReadGroupsMs) || this.skipFailedReadGroupsMs < 0) this.skipFailedReadGroupsMs = 300000;

    this._readGroupSkipUntil = new Map();
    this._readGroupWarnUntil = new Map();

    // Optional, per-write component identity checks. FENECON/OpenEMS write-access
    // blocks can move after an app update. A cached identity probe prevents a
    // documented sample address from being written when it no longer belongs to
    // the expected component.
    this._verifiedWriteComponentIds = new Map();


    this._lastCommandAt = 0;
    this._ioQueue = Promise.resolve();
    this._failStreak = 0;
    this._nextConnectAt = 0;
    this._connectWaitWarnAt = 0;
    this._busySince = 0;

    // Independent hard timeouts around Modbus operations. This protects the adapter from
    // rare cases where the underlying library/socket never resolves after a device-side
    // timeout. Without this guard the per-device IO queue can remain pending forever and
    // the adapter will not recover until restart.
    const rawOperationTimeout = (c.operationTimeoutMs ?? c.hardTimeoutMs ?? hints.operationTimeoutMs ?? hints.hardTimeoutMs ?? this.global.modbusOperationTimeoutMs);
    const opDefault = Math.max(Number(this.timeoutMs || 0) * 2, Number(this.timeoutMs || 0) + 1500, 5000);
    this.operationTimeoutMs = Number(rawOperationTimeout);
    if (!Number.isFinite(this.operationTimeoutMs) || this.operationTimeoutMs <= 0) this.operationTimeoutMs = opDefault;
    this.operationTimeoutMs = Math.max(this.operationTimeoutMs, Number(this.timeoutMs || 0) + 250);

    const rawConnectTimeout = (c.connectTimeoutMs ?? hints.connectTimeoutMs ?? this.global.modbusConnectTimeoutMs);
    this.connectTimeoutMs = Number(rawConnectTimeout);
    if (!Number.isFinite(this.connectTimeoutMs) || this.connectTimeoutMs <= 0) this.connectTimeoutMs = Math.max(this.operationTimeoutMs, Number(this.timeoutMs || 0) + 1500, 5000);

    // Optional pre-write unlock sequence (device-specific; configured via template driverHints)
    this._writeUnlock = null;
    this._writeUnlockUntil = 0;

    // Allow per-device override via connection settings
    if (typeof c.autoSunSpec === 'boolean') this._autoSunSpec = c.autoSunSpec;
    if (Number.isFinite(Number(c.sunSpecTemplateBase))) this._sunSpecTemplateBase = Number(c.sunSpecTemplateBase);

    // Template-defined write-unlock sequence (e.g. SolaX requires UnlockPassword before VPP writes)
    // Structure example in templates.json:
    // driverHints.modbus.writeUnlock = {
    //   fc: 6,
    //   address: 0,
    //   dataType: 'uint16',
    //   length: 1,
    //   passwordField: 'writePassword',
    //   defaultPassword: 2014,
    //   cacheMs: 5000
    // }
    const wh = (hints && (hints.writeUnlock || hints.unlock)) ? (hints.writeUnlock || hints.unlock) : null;
    if (wh && typeof wh === 'object') {
      const addr = Number(wh.address);
      if (Number.isFinite(addr)) {
        this._writeUnlock = {
          fc: Number(wh.fc ?? 6),
          address: addr,
          length: Number(wh.length ?? 1),
          dataType: (wh.dataType || 'uint16').toString(),
          passwordField: (wh.passwordField || 'writePassword').toString(),
          defaultPassword: (wh.defaultPassword ?? wh.password ?? null),
          cacheMs: Number(wh.cacheMs ?? 0),
        };
      }
    } else if (hints && hints.unlockPassword === true) {
      // Backwards-compatible shorthand: enable default unlock register @0 (FC6 uint16)
      this._writeUnlock = { fc: 6, address: 0, length: 1, dataType: 'uint16', passwordField: 'writePassword', defaultPassword: null, cacheMs: 0 };
    }

    this.wordOrder = normalizeWordOrder(c.wordOrder || 'be');
    this.byteOrder = normalizeByteOrder(c.byteOrder || 'be');
  }


  _isTcpOpen() {
    if (this.protocol !== 'modbusTcp') return true;
    const c = this.client;
    if (!c) return false;

    try {
      if (typeof c.isOpen === 'boolean') return c.isOpen;
      if (typeof c.isOpen === 'function') return !!c.isOpen();
    } catch (_) {
      // ignore
    }

    // modbus-serial internal port wrappers
    try {
      const p = c._port;
      // If modbus-serial detached its underlying TCP socket/port wrapper, treat as closed.
      // This prevents errors like: "Cannot read properties of null (reading 'writeRegister')".
      if (p === null) return false;
      if (p) {
        if (typeof p.isOpen === 'boolean') return p.isOpen;
        if (typeof p.isOpen === 'function') return !!p.isOpen();
        if (typeof p.destroyed === 'boolean') return !p.destroyed;
        if (p._client && typeof p._client.destroyed === 'boolean') return !p._client.destroyed;
        if (p._socket && typeof p._socket.destroyed === 'boolean') return !p._socket.destroyed;
        if (p.socket && typeof p.socket.destroyed === 'boolean') return !p.socket.destroyed;
      }
    } catch (_) {
      // ignore
    }

    // If we cannot determine, assume open and let real operations fail
    return true;
  }


  _makeTimeoutError(label, timeoutMs, code) {
    const ms = Number(timeoutMs || 0);
    const err = new Error(`${label || 'Modbus operation'} hard-timeout after ${ms} ms`);
    err.code = code || 'E_MODBUS_OPERATION_TIMEOUT';
    return err;
  }

  _forceCloseTcpClient(client) {
    if (!client) return;

    // modbus-serial close() is best-effort. On half-open TCP sessions we also try to
    // destroy the underlying socket so pending read/write callbacks are released.
    try { client.close(() => {}); } catch (_) {}

    try {
      const p = client._port;
      const candidates = [];
      if (p) {
        candidates.push(p);
        if (p._client) candidates.push(p._client);
        if (p._socket) candidates.push(p._socket);
        if (p.socket) candidates.push(p.socket);
        if (p.client) candidates.push(p.client);
      }
      for (const sock of candidates) {
        if (!sock) continue;
        try { if (typeof sock.setKeepAlive === 'function') sock.setKeepAlive(false); } catch (_) {}
        try { if (typeof sock.end === 'function') sock.end(); } catch (_) {}
        try { if (typeof sock.destroy === 'function') sock.destroy(); } catch (_) {}
      }
    } catch (_) {}
  }

  async _withHardTimeout(promise, timeoutMs, label, onTimeout) {
    const ms = Number(timeoutMs || 0);
    if (!Number.isFinite(ms) || ms <= 0) return await promise;

    let timer = null;
    let timedOut = false;

    const op = Promise.resolve(promise).catch((err) => {
      // If the operation rejects after our hard timeout already fired, suppress the
      // late rejection. The caller has already moved on with a clean reconnect.
      if (timedOut) {
        try {
          this.adapter.log.debug(`[${this.device?.id || 'modbus'}] Late Modbus operation rejection after timeout ignored: ${err && err.message ? err.message : err}`);
        } catch (_) {}
        return new Promise(() => {});
      }
      throw err;
    });

    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        const err = this._makeTimeoutError(label, ms, label && String(label).toLowerCase().includes('connect') ? 'E_MODBUS_CONNECT_TIMEOUT' : 'E_MODBUS_OPERATION_TIMEOUT');
        try { if (typeof onTimeout === 'function') onTimeout(err); } catch (_) {}
        reject(err);
      }, ms);
      try { if (timer && typeof timer.unref === 'function') timer.unref(); } catch (_) {}
    });

    try {
      return await Promise.race([op, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  _markDisconnected(err) {
    this.connected = false;
    this.connecting = false;

    // A reconnect can follow a device/FEMS restart or an app update. Re-run all
    // movable-component identity checks before the next write instead of trusting
    // a component layout cached from the previous connection.
    try { this._verifiedWriteComponentIds?.clear(); } catch (_) {}

    // Backoff on repeated transport errors. Some devices will stop responding if polled too hard.
    // A short cooldown prevents rapid reconnect loops and gives the device time to recover.
    try {
      const now = Date.now();
      const base = Math.max(Number(this.reconnectBackoffMs || 0), Number(this.minCommandIntervalMs || 0), 0);
      if (base > 0) {
        this._failStreak = Math.min((this._failStreak || 0) + 1, 10);
        const max = Number(this.maxReconnectBackoffMs || 30000);
        const delay = Math.min(base * Math.pow(2, this._failStreak - 1), max);
        this._nextConnectAt = now + delay;
      }
    } catch (_) {
      // ignore
    }

    if (this.protocol === 'modbusTcp') {
      const oldClient = this.client;
      if (oldClient) this._forceCloseTcpClient(oldClient);
      // Force a clean client for the next connect attempt (avoids stale sockets after ECONNRESET/timeouts)
      if (this.client === oldClient) this.client = null;
    }

    // Break a possibly poisoned IO queue after transport loss. This is safe because the
    // stale client/socket has just been closed; new operations will reconnect first.
    try { this._ioQueue = Promise.resolve(); } catch (_) {}
  }


  _getSerialOption(key, fallback) {
    const c = this.device?.connection || {};
    const defs = this._serialDefaults || null;
    const enforce = !!(defs && defs.enforce);
    if (enforce && defs && defs[key] !== undefined) return defs[key];
    const raw = c[key];
    if (raw !== undefined && raw !== null && raw !== '') return raw;
    if (defs && defs[key] !== undefined) return defs[key];
    return fallback;
  }

  _getSerialConnOpts() {
    return {
      path: (this._getSerialOption('path', this.device?.connection?.path || '') || '').toString().trim(),
      baudRate: Number(this._getSerialOption('baudRate', 9600)),
      parity: (this._getSerialOption('parity', 'none') || 'none').toString(),
      dataBits: Number(this._getSerialOption('dataBits', 8)),
      stopBits: Number(this._getSerialOption('stopBits', 1)),
      responseStart: (String(this._asciiResponseStart || ':').trim() || ':').charAt(0),
    };
  }

  async connect() {
    if (this.connected) return;

    // If another caller is already connecting, wait for it instead of returning early.
    // Returning early while connected=false lets the next read continue against a not-yet-open
    // TCP client and can permanently poison the queue on slow devices.
    if (this.connecting) {
      const started = Date.now();
      const maxWait = Math.max(Number(this.connectTimeoutMs || 0), Number(this.operationTimeoutMs || 0), 5000);
      while (this.connecting && !this.connected && (Date.now() - started) < maxWait) {
        await sleep(50);
      }
      if (this.connected) return;
      if (this.connecting) {
        const err = this._makeTimeoutError('Modbus TCP connect wait', maxWait, 'E_MODBUS_CONNECT_TIMEOUT');
        this._markDisconnected(err);
        throw err;
      }
    }

    this.connecting = true;

    // Respect reconnect backoff (prevents hammering devices that temporarily stop responding)
    try {
      const now = Date.now();
      if (this._nextConnectAt && now < this._nextConnectAt) {
        await sleep(this._nextConnectAt - now);
      }
    } catch (_) {
      // ignore
    }

    const c = this.device.connection || {};
    try {
      if (this.protocol === 'modbusTcp') {
        const host = c.host;
        const port = Number(c.port || 502);

        // Always start with a clean client. Some devices/field networks close idle sockets;
        // modbus-serial may keep stale socket handles after ECONNRESET/timeout.
        try {
          if (this.client) this._forceCloseTcpClient(this.client);
        } catch (_) {}

        const tcpClient = new ModbusRTU();
        this.client = tcpClient;

        const connectPromise = new Promise((resolve, reject) => {
          tcpClient.connectTCP(host, { port }, (err) => err ? reject(err) : resolve());
        });

        await this._withHardTimeout(
          connectPromise,
          this.connectTimeoutMs,
          `Modbus TCP connect ${host || ''}:${port}`,
          () => {
            this._forceCloseTcpClient(tcpClient);
            if (this.client === tcpClient) this.client = null;
          }
        );

        // The connection may have completed after a timeout and been replaced/closed.
        if (this.client !== tcpClient) {
          const err = new Error('Modbus TCP connect completed on stale client');
          err.code = 'ERR_SOCKET_CLOSED';
          throw err;
        }

        // Best-effort: enable TCP keepalive on the underlying socket if accessible
        try {
          const p = this.client && this.client._port ? this.client._port : null;
          const sock = p && (p._client || p._socket || p.socket || p);
          if (sock && typeof sock.setKeepAlive === 'function') sock.setKeepAlive(true, 10000);
        } catch (_) {}

        this.client.setID(this.unitId);
        this._tcpCurrentUnitId = this.unitId;
        this.client.setTimeout(this.timeoutMs);
      } else if (this.protocol === 'modbusRtu') {
        const serial = this._getSerialConnOpts();
        if (!this.rtuBus) {
          const { key, bus } = acquireBus(this.adapter, {
            path: serial.path,
            baudRate: serial.baudRate,
            parity: serial.parity,
            dataBits: serial.dataBits,
            stopBits: serial.stopBits,
          });
          this.rtuBusKey = key;
          this.rtuBus = bus;
        }
        await this.rtuBus.ensureConnected();
      } else if (this.protocol === 'modbusAscii') {
        const serial = this._getSerialConnOpts();
        if (!this.asciiBus) {
          const { key, bus } = acquireAsciiBus(this.adapter, {
            path: serial.path,
            baudRate: serial.baudRate,
            parity: serial.parity,
            dataBits: serial.dataBits,
            stopBits: serial.stopBits,
            responseStart: serial.responseStart,
          });
          this.asciiBusKey = key;
          this.asciiBus = bus;
        }
        await this.asciiBus.ensureConnected();
      } else {
        throw new Error(`Unsupported Modbus protocol: ${this.protocol}`);
      }

      this.connected = true;
      this._failStreak = 0;
      this._nextConnectAt = 0;
      this.adapter.log.info(`[${this.device.id}] Modbus connected (${this.protocol})`);

      // Optional SunSpec base / unit-id discovery (only when enabled via template hints).
      try {
        await this._maybeDiscoverSunSpec();
      } catch (e) {
        // Discovery must never break connectivity.
        this.adapter.log.debug(`[${this.device.id}] SunSpec discovery error: ${e && e.message ? e.message : e}`);
      }
    } catch (e) {
      // Ensure we always reset the internal state and apply backoff on connect failures
      if (isTransportError(e)) {
        this._markDisconnected(e);
      } else {
        // still close any stale socket to avoid half-open sessions
        this._markDisconnected(e);
      }
      throw e;
    } finally {
      this.connecting = false;
    }
  }

  async disconnect() {
    try {
      if (this.protocol === 'modbusTcp') {
        if (this.client) {
          this._forceCloseTcpClient(this.client);
          this.client = null;
        }
      } else if (this.protocol === 'modbusRtu') {
        if (this.rtuBusKey) {
          releaseBus(this.rtuBusKey);
        }
        this.rtuBus = null;
        this.rtuBusKey = null;
      } else if (this.protocol === 'modbusAscii') {
        if (this.asciiBusKey) {
          releaseAsciiBus(this.asciiBusKey);
        }
        this.asciiBus = null;
        this.asciiBusKey = null;
      }
    } finally {
      this.connected = false;
      this.connecting = false;
      this._tcpCurrentUnitId = null;
    }
  }

  async ensureConnected() {
    if (this.connected) {
      if (this.protocol === 'modbusTcp' && !this._isTcpOpen()) {
        this._markDisconnected(new Error('Port Not Open'));
      } else {
        return true;
      }
    }
    try {
      await this.connect();
      return this.connected;
    } catch (e) {
      this.connected = false;
      throw e;
    }
  }

  _setUnitId(id) {
    const uid = Number(id);
    if (!Number.isFinite(uid) || uid < 0) return;
    this.unitId = uid;
    if (this.protocol === 'modbusTcp' && this.client && typeof this.client.setID === 'function') {
      try { this.client.setID(uid); this._tcpCurrentUnitId = uid; } catch (_) {}
    }
  }

  _operationUnitId(unitIdOverride) {
    const n = Number(unitIdOverride);
    if (Number.isFinite(n) && n > 0) return Math.trunc(n);
    const base = Number(this.unitId);
    return (Number.isFinite(base) && base > 0) ? Math.trunc(base) : 1;
  }

  _sourceUnitId(src) {
    if (!src) return this._operationUnitId();
    const raw = (src.unitId ?? src.slaveId ?? src.serverAddress ?? src.deviceId ?? src.modbusUnitId);
    return this._operationUnitId(raw);
  }

  _setTcpRequestUnitId(uid) {
    const id = this._operationUnitId(uid);
    if (this.protocol !== 'modbusTcp' || !this.client || typeof this.client.setID !== 'function') return id;
    // modbus-serial keeps the Unit-ID/Slave-ID as mutable state on the TCP client.
    // Set it directly before every operation so templates can safely address vendors
    // such as Alfen where one IP exposes different register groups through different Unit-IDs.
    try {
      if (this._tcpCurrentUnitId !== id) {
        this.client.setID(id);
        this._tcpCurrentUnitId = id;
      }
    } catch (_) {}
    return id;
  }

  _addr(src) {
    let a = Number(src?.address || 0);

    // Optional per-datapoint address base offset via device settings.
    // Useful for devices that expose multiple blocks (e.g. different coil blocks, configurable start address).
    // Example in template source:
    //   { address: 0, addressOffsetSetting: 'coilReadOffset' }
    let extra = 0;
    const key = src?.addressOffsetSetting;
    if (key) {
      const k = String(key);
      const raw = (this.device && (this.device[k] ?? this.device?.settings?.[k]));
      const n = Number(raw);
      if (Number.isFinite(n)) extra += n;
    }

    // SunSpec dynamic address resolution:
    // If a datapoint source specifies a SunSpec model + offset, we resolve the absolute register
    // address using the scanned SunSpec model map (modelId -> start offset).
    //
    // Example source:
    //   { kind:'modbus', fc:3, sunspecModel:103, sunspecOffset:14, length:1, dataType:'int16' }
    if (src && src.sunspecModel !== undefined && src.sunspecModel !== null) {
      const modelId = Number(src.sunspecModel);
      const modelIndex = Number(src.sunspecIndex ?? src.sunspecInstance ?? 0);
      const pointOff = Number(src.sunspecOffset ?? 0);
      const templateBase = Number(this._sunSpecTemplateBase ?? 40000);

      if (Number.isFinite(modelId) && Number.isFinite(pointOff) && Number.isFinite(templateBase)) {
        try {
          const arr = this._sunSpecModelsById ? this._sunSpecModelsById.get(modelId) : null;
          const idx = Number.isFinite(modelIndex) ? Math.max(0, Math.trunc(modelIndex)) : 0;
          const entry = (arr && arr.length) ? arr[idx] : null;

          if (entry && Number.isFinite(Number(entry.offset))) {
            a = templateBase + Number(entry.offset) + pointOff;
          } else if (a === 0) {
            // Model is not present on this device -> skip this datapoint.
            a = NaN;
          }
        } catch (_) {
          // ignore and fall back to 'address'
        }
      }
    }

    if (this._isAlfenProfile) {
      // Never apply UI/global/auto offsets to Alfen ACE protocol addresses.
      return a;
    }
    return a + this.manualAddressOffset + this.autoAddressOffset + extra;
  }

  _addressFallbackOffsets(src) {
    if (this._disableAddressFallbackOffsets) return [];
    return (this.disableAddressFallbackOffsets ? [] : normalizeAddressFallbackOffsets(src));
  }


  _isAlfenSocketControlDpId(dpId) {
    const id = String(dpId || '');
    return id === 'sET_CHARGING_CURRENT' || id === 'cHARGE_USING_PHASES';
  }

  _isAlfenScnControlDpId(dpId) {
    const id = String(dpId || '');
    return id === 'sCN_MAX_CURRENT' || id === 'sCN_MAX_CURRENT_L1' || id === 'sCN_MAX_CURRENT_L2' || id === 'sCN_MAX_CURRENT_L3';
  }

  _isAlfenSocketControlReadDpId(dpId) {
    const id = String(dpId || '');
    return id === 'eVSE_STATE' || id === 'mODE3_STATE' || id === 'aCTUAL_APPLIED_MAX_CURRENT' ||
      id === 'mODBUS_MAX_CURRENT_VALID_TIME' || id === 'sET_CHARGING_CURRENT' ||
      id === 'aCTIVE_LOAD_BALANCING_SAFE_CURRENT' || id === 'sETPOINT_ACCOUNTED_FOR' ||
      id === 'cHARGE_USING_PHASES';
  }

  _isAlfenScnReadDpId(dpId) {
    const id = String(dpId || '');
    return id.startsWith('sCN_') || id.startsWith('sTATION_') || id === 'tEMPERATURE' || id === 'oCPP_STATE' || id === 'nUMBER_OF_SOCKETS';
  }

  _markAlfenControlUnsupported(kind, reason) {
    if (!this._isAlfenProfile) return;
    const now = Date.now();
    const backoff = Math.max(1000, Number(this._alfenControlUnsupportedBackoffMs || 3600000));
    if (kind === 'scn') this._alfenScnUnsupportedUntil = now + backoff;
    else this._alfenControlUnsupportedUntil = now + backoff;
    // Keep this quiet by default; the user-facing warning is misleading because the
    // adapter address is correct.  We only need a throttled debug breadcrumb.
    const key = kind || 'socket';
    const last = Number(this._alfenUnsupportedLogTsByKey.get(key) || 0);
    if (!last || (now - last) > 300000) {
      this._alfenUnsupportedLogTsByKey.set(key, now);
      try {
        this.adapter.log.debug(`[${this.device?.id || 'modbus'}] Alfen ${key === 'scn' ? 'SCN' : 'socket'} control block not exposed; suppressing control writes for ${Math.ceil(backoff / 1000)}s.${reason ? ` ${reason}` : ''}`);
      } catch (_) {}
    }
  }

  _alfenUnsupportedError(kind, dpId, addr, unitId, reason) {
    const err = new Error(
      `Alfen ${kind === 'scn' ? 'SCN' : 'socket'} control block is not exposed by the charger; skipped write ${dpId || 'datapoint'} UID${this._operationUnitId(unitId)}@${addr}. ` +
      `The adapter keeps the official address first and can probe the direct table-address compatibility layout after exception 2. ` +
      `If both layouts fail, verify ACE Advanced Settings (Allow writing maximum currents and Enable sockets/SCN).${reason ? ` ${reason}` : ''}`
    );
    err.code = 'E_NEXOWATT_WRITE_UNSUPPORTED';
    err.nexowattOperation = 'write';
    err.nexowattDpId = String(dpId || '');
    err.nexowattSuppressWarn = true;
    err.nexowattUnsupportedWrite = true;
    err.nexowattUnsupportedKind = kind || 'socket';
    return err;
  }

  async _maybeProbeAlfenControlBeforeWrite(dp, src, addr, words, unitId) {
    if (!this._isAlfenProfile || !this._alfenProbeControlBeforeWrite) return;
    const dpId = String(dp?.id || '');
    const kind = this._isAlfenSocketControlDpId(dpId) ? 'socket' : (this._isAlfenScnControlDpId(dpId) ? 'scn' : '');
    if (!kind) return;

    const now = Date.now();
    const unsupportedUntil = kind === 'scn' ? Number(this._alfenScnUnsupportedUntil || 0) : Number(this._alfenControlUnsupportedUntil || 0);
    if (unsupportedUntil && now < unsupportedUntil) {
      throw this._alfenUnsupportedError(kind, dpId, addr, unitId, `Retry after ${Math.ceil((unsupportedUntil - now) / 1000)}s.`);
    }

    // Probe exactly the register pair/single register that would be written. The
    // Max Current register is R/W in the ACE map, so a FC03 read is a safe capability
    // test and avoids hammering unsupported FC16 writes into chargers that only expose
    // meter values.
    const key = `${kind}:${this._operationUnitId(unitId)}:${Number(addr)}:${Number(words || src?.length || 1)}`;
    const okUntil = Number(this._alfenControlProbeOkUntilByKey.get(key) || 0);
    if (okUntil && now < okUntil) return;

    try {
      const len = Math.max(1, Number(words || src?.length || 1));
      await this._mbReadHoldingRegisters(Number(addr), len, unitId);
      this._alfenControlProbeOkUntilByKey.set(key, Date.now() + Math.max(10000, Number(this._alfenControlProbeOkCacheMs || 60000)));
    } catch (e) {
      if (isModbusIllegalAddressOrValue(e)) {
        this._markAlfenControlUnsupported(kind, e && e.message ? e.message : String(e));
        throw this._alfenUnsupportedError(kind, dpId, addr, unitId, e && e.message ? e.message : String(e));
      }
      throw e;
    }
  }

  _alfenControlKindForDpId(dpId) {
    const id = String(dpId || '');
    if (this._isAlfenSocketControlDpId(id)) return 'socket';
    if (this._isAlfenScnControlDpId(id)) return 'scn';
    return '';
  }

  _alfenControlCacheKey(dp, src, unitId) {
    const dpId = String(dp?.id || '');
    const uid = this._operationUnitId(unitId ?? this._sourceUnitId(src));
    return `${dpId}:uid${uid}:addr${Number(src?.address)}:len${Number(src?.length || 1)}:${String(src?.dataType || 'uint16').toLowerCase()}`;
  }

  _alfenStrictControlAddress(dpId, addr) {
    if (!this._isAlfenProfile) return Number(addr);
    const id = String(dpId || '');
    const hints = this._alfenHints || {};
    const raw = id === 'sET_CHARGING_CURRENT'
      ? hints.maxCurrentWriteProtocolAddress
      : id === 'cHARGE_USING_PHASES'
        ? hints.chargeUsingPhasesWriteProtocolAddress
        : undefined;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : Number(addr);
  }

  _alfenControlCandidateVariants(dp, src, addr, unitId, wordOrder, byteOrder) {
    const dpId = String(dp?.id || '');
    const strictAddr = Number(this._alfenStrictControlAddress(dpId, addr));
    if (!Number.isFinite(strictAddr) || strictAddr < 0) return [];

    const canonical = {
      id: 'document-minus-one',
      label: 'document register - 1',
      address: strictAddr,
      addressOffset: 0,
      wordOrder: normalizeWordOrder(wordOrder),
      byteOrder: normalizeByteOrder(byteOrder),
      official: true,
    };

    const variants = [canonical];
    if (this._alfenAddressCompatibilityProbe) {
      const offset = Number(this._alfenDirectAddressOffset || 1);
      const directAddress = strictAddr + offset;
      if (Number.isFinite(directAddress) && directAddress >= 0 && directAddress !== strictAddr) {
        variants.push({
          id: 'direct-table',
          label: `direct table address (${offset > 0 ? '+' : ''}${offset})`,
          address: directAddress,
          addressOffset: offset,
          // The ACE guide requires low-word-first. A few older/current integrations
          // expose direct table addresses with a different word layout, therefore the
          // compatibility candidate resolves the word order from the configured safe
          // current before its first write.
          wordOrder: 'auto',
          byteOrder: normalizeByteOrder(byteOrder),
          official: false,
        });
      }
    }

    const key = this._alfenControlCacheKey(dp, src, unitId);
    const cached = this._alfenControlVariantByKey && this._alfenControlVariantByKey.get(key);
    if (!cached || typeof cached !== 'object') return variants;

    const ordered = [];
    const pushUnique = (variant) => {
      if (!variant || !Number.isFinite(Number(variant.address))) return;
      const identity = `${variant.id || ''}|${Number(variant.address)}|${String(variant.wordOrder || '')}|${String(variant.byteOrder || '')}`;
      if (ordered.some(v => v._identity === identity)) return;
      ordered.push(Object.assign({}, variant, { _identity: identity }));
    };
    pushUnique(cached);
    for (const variant of variants) pushUnique(variant);
    return ordered.map(({ _identity, ...variant }) => variant);
  }

  _alfenSafeCurrentProtocolAddress(kind) {
    return kind === 'scn' ? 1428 : 1211;
  }

  _alfenPlausibleSafeCurrent(value) {
    const n = Number(value);
    // Safe current is configured in amperes. Values below 1 A are either invalid
    // for normal AC charging or a typical symptom of decoding a 32-bit float with
    // the wrong word order (subnormal number around 10^-41).
    return Number.isFinite(n) && n >= 1 && n <= 80;
  }

  _alfenDecodeFloat32Regs(regs, wordOrder, byteOrder) {
    if (!Array.isArray(regs) || regs.length < 2) return NaN;
    try {
      return Number(bufferToValue(regsToBuffer(regs.slice(0, 2), wordOrder, byteOrder), 'float32'));
    } catch (_) {
      return NaN;
    }
  }

  async _resolveAlfenVariantWordOrder(variant, kind, unitId, fallbackWordOrder, fallbackByteOrder) {
    const resolved = Object.assign({}, variant);
    const fallbackWo = normalizeWordOrder(fallbackWordOrder);
    const fallbackBo = normalizeByteOrder(fallbackByteOrder);
    resolved.byteOrder = normalizeByteOrder(resolved.byteOrder || fallbackBo);

    if (resolved.wordOrder !== 'auto') {
      resolved.wordOrder = normalizeWordOrder(resolved.wordOrder || fallbackWo);
      return resolved;
    }

    const safeCurrentAddress = this._alfenSafeCurrentProtocolAddress(kind) + Number(resolved.addressOffset || 0);
    try {
      const response = await this._mbReadHoldingRegisters(safeCurrentAddress, 2, unitId);
      const regs = Array.isArray(response) ? response : (Array.isArray(response && response.data) ? response.data : []);
      const le = this._alfenDecodeFloat32Regs(regs, 'le', resolved.byteOrder);
      const be = this._alfenDecodeFloat32Regs(regs, 'be', resolved.byteOrder);
      const leOk = this._alfenPlausibleSafeCurrent(le);
      const beOk = this._alfenPlausibleSafeCurrent(be);

      if (leOk && !beOk) resolved.wordOrder = 'le';
      else if (beOk && !leOk) resolved.wordOrder = 'be';
      else resolved.wordOrder = fallbackWo;

      resolved.safeCurrentProbe = {
        address: safeCurrentAddress,
        le,
        be,
        selected: resolved.wordOrder,
      };
    } catch (e) {
      resolved.wordOrder = fallbackWo;
      resolved.safeCurrentProbeError = e && e.message ? e.message : String(e);
    }
    return resolved;
  }

  _encodeAlfenControlRegs(raw, src, len, wordOrder, byteOrder) {
    const words = Math.max(1, Number(len || src?.length || 1));
    const dataType = src?.dataType || 'uint16';
    const wo = normalizeWordOrder(wordOrder);
    const bo = normalizeByteOrder(byteOrder);

    if (src && (src.repeatEncodedValue === true || src.repeatEncodedToLength === true || src.repeatDataTypeValue === true)) {
      const oneWordsRaw = Number(src.repeatValueWords ?? src.valueWords ?? dataTypeWordLength(dataType));
      const oneWords = Number.isFinite(oneWordsRaw) && oneWordsRaw > 0 ? Math.trunc(oneWordsRaw) : dataTypeWordLength(dataType);
      if (oneWords <= 0 || words % oneWords !== 0) {
        throw new Error(`Invalid Alfen repeatEncodedValue layout: length=${words}, valueWords=${oneWords}`);
      }
      const singleBuf = valueToBuffer(raw, dataType, oneWords * 2);
      const singleRegs = bufferToRegs(singleBuf, wo, bo);
      if (!singleRegs.length) throw new Error('Cannot encode Alfen repeated control value');
      const regs = [];
      const repeatCount = Math.trunc(words / singleRegs.length);
      for (let i = 0; i < repeatCount; i++) regs.push(...singleRegs);
      return regs.slice(0, words);
    }

    if (src && (src.repeatValue === true || src.repeatToLength === true || src.fillRegisters === true)) {
      const singleBuf = valueToBuffer(raw, dataType, 2);
      const singleRegs = bufferToRegs(singleBuf, wo, bo);
      return Array(words).fill(singleRegs.length ? singleRegs[0] : 0);
    }

    return bufferToRegs(valueToBuffer(raw, dataType, words * 2), wo, bo).slice(0, words);
  }

  _logAlfenControlVariant(dp, unitId, variant) {
    if (!variant || variant.id !== 'direct-table') return;
    const dpId = String(dp?.id || 'datapoint');
    const uid = this._operationUnitId(unitId);
    const key = `${dpId}|uid${uid}|${variant.id}|${variant.address}|${variant.wordOrder}|${variant.byteOrder}`;
    const count = Number(this._alfenVariantLogCountByKey.get(key) || 0);
    this._alfenVariantLogCountByKey.set(key, count + 1);
    const probe = variant.safeCurrentProbe;
    const probeText = probe
      ? ` Safe-current probe UID${uid}@${probe.address}: LE=${probe.le}, BE=${probe.be}, selected=${probe.selected}.`
      : (variant.safeCurrentProbeError ? ` Safe-current probe unavailable: ${variant.safeCurrentProbeError}.` : '');
    const line = `[${this.device?.id || 'modbus'}] Alfen ACE compatibility mode selected for ${dpId}: UID${uid} FC16@${variant.address}, wordOrder=${variant.wordOrder}, byteOrder=${variant.byteOrder}.${probeText} Canonical template/alias addresses remain unchanged.`;
    try {
      if (count < 1) this.adapter.log.warn(line);
      else this.adapter.log.debug(line);
    } catch (_) {}
  }

  _logAlfenAcceptedControlWrite(dp, src, unitId, fc, addr, raw, regs) {
    if (!this._isAlfenProfile) return;
    const dpId = String(dp?.id || 'datapoint');
    if (!this._alfenControlKindForDpId(dpId)) return;

    const hints = this._alfenHints || {};
    if (hints.acceptedWriteTrace === false || hints.logAcceptedControlWrites === false) return;

    const uid = this._operationUnitId(unitId ?? this._sourceUnitId(src));
    const functionCode = Number(fc || src?.fc || 16);
    const address = Number(addr);
    const words = Array.isArray(regs) ? regs.map(v => Number(v) & 0xFFFF) : [];
    const hexWords = words.map(v => `0x${v.toString(16).toUpperCase().padStart(4, '0')}`).join(',');
    const dataBytes = words
      .flatMap(v => [(v >>> 8) & 0xFF, v & 0xFF])
      .map(v => v.toString(16).toUpperCase().padStart(2, '0'))
      .join(' ');
    const key = `${dpId}|uid${uid}|fc${functionCode}|addr${address}`;
    const count = Number(this._alfenWriteTraceCountByKey.get(key) || 0);
    this._alfenWriteTraceCountByKey.set(key, count + 1);

    // A normal FC6/FC16 response confirms that the Modbus server accepted the request.
    // It does not by itself prove that ACE accounted the setpoint; the corresponding
    // valid-time/accounted/actual-current registers remain the authoritative readback.
    const line = `[${this.device?.id || 'modbus'}] Alfen Modbus write accepted: ${dpId} UID${uid} FC${functionCode}@${address} len=${words.length} value=${raw} regs=[${hexWords}] data=${dataBytes}. Check the ACE accounted/enabled and valid-time readbacks to confirm application.`;
    try {
      if (count < 3) this.adapter.log.info(line);
      else this.adapter.log.debug(line);
    } catch (_) {}
  }



  _getMirrorWriteSources(src) {
    if (!src || typeof src !== 'object') return [];
    const raw = src.mirrorWrites || src.writeMirrors || src.alsoWrite || src.mirrorWriteSources;
    if (!raw) return [];
    const arr = Array.isArray(raw) ? raw : [raw];
    return arr.filter(x => x && typeof x === 'object');
  }

  async _writeAlfenControlMirrorWrites(dp, src, raw, unitId, wordOrder, byteOrder, setWriteContext) {
    const mirrors = this._getMirrorWriteSources(src);
    const result = { attempts: 0, successes: 0, failures: [] };
    if (!mirrors.length) return result;

    for (const mirror of mirrors) {
      const m = Object.assign({}, src, mirror);
      const fc = Number(m.fc || src.fc || 16);
      const lenRaw = Number(m.length || src.length || 1);
      const len = Number.isFinite(lenRaw) && lenRaw > 0 ? Math.trunc(lenRaw) : 1;
      const addr = this._addr(m);
      const uid = this._sourceUnitId(m);
      const wo = m.wordOrder || wordOrder || src.wordOrder || this.wordOrder;
      const bo = m.byteOrder || byteOrder || src.byteOrder || this.byteOrder;
      const dataType = m.dataType || src.dataType || 'uint16';
      const optional = m.optional !== false || m.ignoreErrors === true || m.ignoreError === true;
      const label = String(m.label || m.name || m.description || `${dp?.id || 'datapoint'} mirror UID${this._operationUnitId(uid)}@${addr}`);
      result.attempts += 1;

      if (!Number.isFinite(addr)) {
        const err = new Error(`Invalid Alfen mirror write address for ${label}`);
        result.failures.push({ label, error: err.message });
        if (optional) continue;
        throw err;
      }

      try {
        let regs;
        if (m.repeatEncodedValue === true || m.repeatEncodedToLength === true || m.repeatDataTypeValue === true) {
          const oneWordsRaw = Number(m.repeatValueWords ?? m.valueWords ?? dataTypeWordLength(dataType));
          const oneWords = Number.isFinite(oneWordsRaw) && oneWordsRaw > 0 ? Math.trunc(oneWordsRaw) : dataTypeWordLength(dataType);
          if (oneWords <= 0 || len % oneWords !== 0) {
            throw new Error(`Invalid mirror repeatEncodedValue layout for ${label}: length=${len}, valueWords=${oneWords}`);
          }
          const singleBuf = valueToBuffer(raw, dataType, oneWords * 2);
          const singleRegs = bufferToRegs(singleBuf, wo, bo);
          regs = [];
          const repeatCount = Math.trunc(len / singleRegs.length);
          for (let i = 0; i < repeatCount; i++) regs.push(...singleRegs);
          regs = regs.slice(0, len);
        } else {
          const buf = valueToBuffer(raw, dataType, len * 2);
          regs = bufferToRegs(buf, wo, bo).slice(0, len);
        }

        if (typeof setWriteContext === 'function') setWriteContext(m, fc, addr, raw, len, uid);
        if (fc === 6) {
          if (!regs.length) throw new Error(`FC6 mirror write needs one register for ${label}`);
          await this._mbWriteRegister(addr, regs[0], uid);
        } else if (fc === 16) {
          await this._mbWriteRegisters(addr, regs, uid);
        } else {
          throw new Error(`Unsupported Alfen mirror write FC=${fc} for ${label}`);
        }
        result.successes += 1;
        try {
          const mirrorKey = `ok:${label}|UID${this._operationUnitId(uid)}|${addr}`;
          if (!this._alfenMirrorWriteInfoCountByKey) this._alfenMirrorWriteInfoCountByKey = new Map();
          const cnt = Number(this._alfenMirrorWriteInfoCountByKey.get(mirrorKey) || 0);
          const line = `[${this.device?.id || 'modbus'}] Alfen mirror write OK: ${label} UID${this._operationUnitId(uid)} FC${fc}@${addr} len=${len} value=${raw}`;
          if (cnt < 3) {
            this._alfenMirrorWriteInfoCountByKey.set(mirrorKey, cnt + 1);
            this.adapter.log.info(line);
          } else {
            this.adapter.log.debug(line);
          }
        } catch (_) {}
      } catch (e) {
        const errMsg = e && e.message ? e.message : String(e);
        result.failures.push({ label, error: errMsg });
        if (optional) {
          const warnMirror = !!(m.warnOnError === true || m.warnOnFailure === true || (this._alfenHints && this._alfenHints.allIdsWriteMirrors === true));
          if (warnMirror) {
            try {
              const key = `mirror:${label}`;
              const now = Date.now();
              const last = Number(this._alfenUnsupportedLogTsByKey && this._alfenUnsupportedLogTsByKey.get(key) || 0);
              if (!last || (now - last) > 60000) {
                if (this._alfenUnsupportedLogTsByKey) this._alfenUnsupportedLogTsByKey.set(key, now);
                this.adapter.log.warn(`[${this.device?.id || 'modbus'}] Alfen optional mirror write failed: ${label}: ${errMsg}. If the charger is configured for TCP/IP EMS Control Mode=SCN, this mirror must succeed; otherwise socket writes can be visible in ioBroker but not accounted by the charger.`);
              }
            } catch (_) {}
          } else {
            try { this.adapter.log.debug(`[${this.device?.id || 'modbus'}] Alfen optional mirror write skipped: ${label}: ${errMsg}`); } catch (_) {}
          }
          continue;
        }
        throw e;
      }
    }
    return result;
  }

  async _writeAlfenControlAdaptive(dp, src, addr, raw, words, unitId, wordOrder, byteOrder, setWriteContext) {
    if (!this._isAlfenProfile) return false;
    const dpId = String(dp?.id || '');
    const kind = this._alfenControlKindForDpId(dpId);
    if (!kind) return false;

    const now = Date.now();
    const unsupportedUntil = kind === 'scn' ? Number(this._alfenScnUnsupportedUntil || 0) : Number(this._alfenControlUnsupportedUntil || 0);
    const alwaysTryControlWrites = !!(this._alfenHints && (this._alfenHints.alwaysTryControlWrites === true || this._alfenHints.probeControlBeforeWrite === false));
    if (unsupportedUntil && now < unsupportedUntil && !alwaysTryControlWrites) {
      throw this._alfenUnsupportedError(kind, dpId, addr, unitId, `Retry after ${Math.ceil((unsupportedUntil - now) / 1000)}s.`);
    }

    const len = Math.max(1, Number(words || src?.length || 1));
    const strictAddr = this._alfenStrictControlAddress(dpId, addr);
    if (Number.isFinite(strictAddr) && strictAddr !== Number(addr)) addr = strictAddr;

    const key = this._alfenControlCacheKey(dp, src, unitId);
    const cachedBefore = this._alfenControlVariantByKey && this._alfenControlVariantByKey.get(key);
    const candidates = this._alfenControlCandidateVariants(dp, src, addr, unitId, wordOrder, byteOrder);
    const tried = [];
    let lastErr = null;
    let sawIllegalAddress = false;

    for (const candidateRaw of candidates) {
      const isCachedCandidate = !!(cachedBefore && candidateRaw && cachedBefore.id === candidateRaw.id && Number(cachedBefore.address) === Number(candidateRaw.address));
      // The direct table-address layout is a compatibility path only. In a fresh
      // session it is attempted exclusively after the documented address returned
      // Modbus exception 2 (Illegal Data Address). A previously detected direct
      // variant is allowed to run first.
      if (candidateRaw.id === 'direct-table' && !isCachedCandidate && !sawIllegalAddress) continue;

      const candidate = await this._resolveAlfenVariantWordOrder(
        candidateRaw,
        kind,
        unitId,
        wordOrder,
        byteOrder,
      );
      const regs = this._encodeAlfenControlRegs(raw, src, len, candidate.wordOrder, candidate.byteOrder);
      tried.push(`${candidate.label || candidate.id}@${candidate.address}/${candidate.wordOrder}-${candidate.byteOrder}`);

      const skipProbe = this._alfenHints && this._alfenHints.probeControlBeforeWrite === false;
      if (!skipProbe) {
        try {
          await this._mbReadHoldingRegisters(candidate.address, len, unitId);
        } catch (e) {
          lastErr = e;
          if (isModbusIllegalAddress(e)) {
            sawIllegalAddress = true;
            if (isCachedCandidate && this._alfenControlVariantByKey) this._alfenControlVariantByKey.delete(key);
            continue;
          }
          // Exception 3 means the address exists but the requested value/layout is
          // invalid. Changing the register address would hide the real error.
          throw e;
        }
      }

      let primaryOk = false;
      let primaryErr = null;
      try {
        if (typeof setWriteContext === 'function') {
          setWriteContext(src, Number(src.fc || 16), candidate.address, raw, len, unitId);
        }
        if (Number(src.fc) === 6) {
          await this._mbWriteRegister(candidate.address, regs[0], unitId);
        } else {
          await this._mbWriteRegisters(candidate.address, regs.slice(0, len), unitId);
        }
        primaryOk = true;
        this._logAlfenAcceptedControlWrite(dp, src, unitId, Number(src.fc || 16), candidate.address, raw, regs.slice(0, len));
      } catch (e) {
        primaryErr = e;
        lastErr = e;
        if (isModbusIllegalAddress(e)) {
          sawIllegalAddress = true;
          if (isCachedCandidate && this._alfenControlVariantByKey) this._alfenControlVariantByKey.delete(key);
        } else {
          // Do not switch addresses for Illegal Data Value (exception 3), transport
          // errors or arbitrary protocol failures.
          throw e;
        }
      }

      // Preserve the existing independent mirror-write behaviour for Station/All-IDs
      // profiles. Mirrors remain explicit template targets and are not silently
      // shifted by the compatibility probe.
      const mirrorResult = await this._writeAlfenControlMirrorWrites(
        dp,
        src,
        raw,
        unitId,
        candidate.wordOrder,
        candidate.byteOrder,
        setWriteContext,
      );

      if (primaryOk || (mirrorResult && mirrorResult.successes > 0)) {
        if (primaryOk) {
          if (this._alfenControlVariantByKey) this._alfenControlVariantByKey.set(key, Object.assign({}, candidate));
          this._cacheAlfenReadVariantForControlBlock(
            kind,
            unitId,
            Number(candidate.addressOffset || 0),
            candidate.wordOrder,
            candidate.byteOrder,
          );
          this._logAlfenControlVariant(dp, unitId, candidate);
        } else if (mirrorResult && mirrorResult.successes > 0) {
          try {
            this.adapter.log.info(`[${this.device?.id || 'modbus'}] Alfen primary ${dpId} write UID${this._operationUnitId(unitId)}@${candidate.address} was rejected, but ${mirrorResult.successes} mirror target(s) accepted value=${raw}.`);
          } catch (_) {}
        }
        return true;
      }

      if (primaryErr && isModbusIllegalAddress(primaryErr)) continue;
    }

    const detail = tried.length ? tried.join(', ') : 'no valid candidate';
    if (lastErr) {
      this._markAlfenControlUnsupported(kind, lastErr && lastErr.message ? lastErr.message : String(lastErr));
      try {
        lastErr.message = `${lastErr.message || String(lastErr)} | Alfen tried ${detail}, value=${raw}. ` +
          `Both the documented and compatibility address layouts were rejected. In ACE Advanced Settings verify Allow writing maximum currents and Enable sockets (Socket mode).`;
      } catch (_) {}
      throw lastErr;
    }

    throw this._alfenUnsupportedError(kind, dpId, addr, unitId, `No Alfen control candidate accepted the write (${detail}).`);
  }

  _isAlfenAdaptiveReadDpId(dpId) {
    const id = String(dpId || '');
    return this._isAlfenSocketControlReadDpId(id) || this._isAlfenScnReadDpId(id);
  }

  _alfenReadVariantKeyForItem(item, unitIdOverride = null) {
    if (!item || !item.dp || !item.src) return '';
    const uid = this._operationUnitId(unitIdOverride ?? item.unitId ?? this._sourceUnitId(item.src));
    const baseAddr = Number(item.baseAddr ?? item.addr);
    const len = Number(item.len ?? item.src.length ?? 1);
    const fc = Number(item.fc ?? item.src.fc ?? 3);
    return `${String(item.dp.id || '')}:uid${uid}:fc${fc}:addr${baseAddr}:len${len}`;
  }

  _applyAlfenReadAddressVariant(item) {
    const base = Number(item && item.addr);
    if (!this._isAlfenProfile || !item || !item.dp || !this._isAlfenAdaptiveReadDpId(item.dp.id)) return base;
    const key = this._alfenReadVariantKeyForItem(item);
    const offset = key && this._alfenReadAddressOffsetByKey ? Number(this._alfenReadAddressOffsetByKey.get(key) || 0) : 0;
    return Number.isFinite(base) && Number.isFinite(offset) ? base + offset : base;
  }

  _alfenReadWordOrderForItem(item, fallback) {
    if (!this._isAlfenProfile || !item || !item.dp || !item.src) return fallback;

    // Alfen's mixed-endian rule applies to multi-register numeric values. STRING/ASCII
    // registers are transmitted in normal, consecutive register order (two ASCII bytes
    // per 16-bit register). Applying the connection-wide LE word order to a five-register
    // Mode-3 string reverses the complete string and moves the first NUL byte to the front,
    // which decodes as an empty value and makes the UI fall back to "Operative".
    const dataType = String(item.src.dataType || '').toLowerCase();
    if (dataType === 'string' || dataType === 'ascii') {
      return normalizeWordOrder(item.src.wordOrder || 'be');
    }

    if (!this._isAlfenAdaptiveReadDpId(item.dp.id)) return fallback;
    const key = this._alfenReadVariantKeyForItem(item);
    const value = key && this._alfenReadWordOrderByKey ? this._alfenReadWordOrderByKey.get(key) : undefined;
    return value ? normalizeWordOrder(value) : fallback;
  }

  _alfenReadByteOrderForItem(item, fallback) {
    if (!this._isAlfenProfile || !item || !item.dp || !item.src) return fallback;

    // Alfen STRING/ASCII registers use network byte order inside every 16-bit register.
    // Keep this independent from the connection-wide numeric byte/word order settings.
    const dataType = String(item.src.dataType || '').toLowerCase();
    if (dataType === 'string' || dataType === 'ascii') {
      return normalizeByteOrder(item.src.byteOrder || 'be');
    }

    if (!this._isAlfenAdaptiveReadDpId(item.dp.id)) return fallback;
    const key = this._alfenReadVariantKeyForItem(item);
    const value = key && this._alfenReadByteOrderByKey ? this._alfenReadByteOrderByKey.get(key) : undefined;
    return value ? normalizeByteOrder(value) : fallback;
  }

  _alfenReadFallbackOffsetsForGroup(g) {
    // No +1/-1 fallback for Alfen ACE.  The guide explicitly requires
    // document register - 1 as the Modbus address.
    return [];
  }

  _cacheAlfenReadVariantForGroup(g, unitId, offset, wordOrder, byteOrder) {
    if (!this._isAlfenProfile || !g || !Array.isArray(g.items)) return;
    const off = Number(offset);
    if (!Number.isFinite(off)) return;
    for (const item of g.items) {
      if (!item || !item.dp || !this._isAlfenAdaptiveReadDpId(item.dp.id)) continue;
      const key = this._alfenReadVariantKeyForItem(item, unitId);
      if (!key) continue;
      if (this._alfenReadAddressOffsetByKey) {
        if (off === 0) this._alfenReadAddressOffsetByKey.delete(key);
        else this._alfenReadAddressOffsetByKey.set(key, off);
      }
      if (this._alfenReadWordOrderByKey) {
        if (wordOrder) this._alfenReadWordOrderByKey.set(key, normalizeWordOrder(wordOrder));
        else this._alfenReadWordOrderByKey.delete(key);
      }
      if (this._alfenReadByteOrderByKey) {
        if (byteOrder) this._alfenReadByteOrderByKey.set(key, normalizeByteOrder(byteOrder));
        else this._alfenReadByteOrderByKey.delete(key);
      }
    }
  }

  _cacheAlfenReadVariantForDatapoint(dp, unitId, offset, wordOrder, byteOrder) {
    if (!this._isAlfenProfile || !dp || !dp.id || !this._isAlfenAdaptiveReadDpId(dp.id)) return;
    const off = Number(offset);
    if (!Number.isFinite(off)) return;
    const src = getReadSource(dp);
    if (!src) return;
    const baseAddr = this._addr(src);
    if (!Number.isFinite(baseAddr)) return;
    const len = Number(src.length || 1);
    const fc = Number(src.fc || 3);
    const item = { dp, src, addr: baseAddr, baseAddr, len, fc, unitId: this._sourceUnitId(src) };
    const key = this._alfenReadVariantKeyForItem(item, unitId);
    if (!key) return;
    if (this._alfenReadAddressOffsetByKey) {
      if (off === 0) this._alfenReadAddressOffsetByKey.delete(key);
      else this._alfenReadAddressOffsetByKey.set(key, off);
    }
    const dt = String(src.dataType || '').toLowerCase();
    const usesMultiwordNumericOrder = Number(len) > 1 && [
      'int32', 'uint32', 'float32', 'int64', 'uint64', 'float64',
    ].includes(dt);
    if (this._alfenReadWordOrderByKey) {
      if (usesMultiwordNumericOrder && wordOrder) this._alfenReadWordOrderByKey.set(key, normalizeWordOrder(wordOrder));
      else this._alfenReadWordOrderByKey.delete(key);
    }
    if (this._alfenReadByteOrderByKey) {
      if (usesMultiwordNumericOrder && byteOrder) this._alfenReadByteOrderByKey.set(key, normalizeByteOrder(byteOrder));
      else this._alfenReadByteOrderByKey.delete(key);
    }
  }

  _cacheAlfenReadVariantForControlBlock(kind, unitId, offset, wordOrder, byteOrder) {
    if (!this._isAlfenProfile || !this.template || !Array.isArray(this.template.datapoints)) return;
    const off = Number(offset);
    if (!Number.isFinite(off)) return;
    const expectedUid = this._operationUnitId(unitId);
    for (const dp of this.template.datapoints) {
      if (!dp || !dp.id) continue;
      const id = String(dp.id);
      const matches = kind === 'socket' ? this._isAlfenSocketControlReadDpId(id) : this._isAlfenScnReadDpId(id);
      if (!matches) continue;
      const src = getReadSource(dp);
      if (!src) continue;
      const srcUid = this._operationUnitId(this._sourceUnitId(src));
      if (srcUid !== expectedUid) continue;
      this._cacheAlfenReadVariantForDatapoint(dp, unitId, off, wordOrder, byteOrder);
    }
  }

  async _getDpStateNumber(dpId) {
    if (!dpId) return undefined;
    try {
      const fullId = `${this.adapter.namespace}.devices.${this.device.id}.${String(dpId)}`;
      const st = await this.adapter.getStateAsync(fullId);
      if (!st || st.val === null || st.val === undefined) return undefined;
      const n = Number(st.val);
      return Number.isFinite(n) ? n : undefined;
    } catch (_) {
      return undefined;
    }
  }

  async _waitForMinCommandInterval() {
    const min = Number(this.minCommandIntervalMs || 0);
    if (!min || min <= 0) return;

    const last = Number(this._lastCommandAt || 0);
    if (!last || last <= 0) return;

    const now = Date.now();
    const next = last + min;
    if (now < next) {
      await sleep(next - now);
    }
  }

  async _withIoLock(fn, label = 'Modbus operation') {
    // Serialize all Modbus operations per device. This avoids read/write interleaving
    // and also allows us to enforce a minimum interval between commands.
    const run = async () => {
      await this._waitForMinCommandInterval();
      this._lastCommandAt = Date.now();
      try {
        const res = await this._withHardTimeout(
          Promise.resolve().then(fn),
          this.operationTimeoutMs,
          label,
          (err) => {
            if (isTransportError(err)) this._markDisconnected(err);
          }
        );
        // On any successful Modbus operation we reset the failure streak/backoff
        this._failStreak = 0;
        this._nextConnectAt = 0;
        return res;
      } catch (e) {
        if (isTransportError(e)) this._markDisconnected(e);
        throw e;
      }
    };

    const p = (this._ioQueue || Promise.resolve())
      .catch(() => {})
      .then(run);

    // Keep the queue alive even if the current op fails. The hard-timeout above ensures
    // that a lost Modbus callback cannot keep this queue pending forever.
    this._ioQueue = p.catch(() => {});
    return p;
  }

  _getWritePassword() {
    if (!this._writeUnlock) return null;
    const field = (this._writeUnlock.passwordField || 'writePassword').toString();
    const c = this.device?.connection || {};
    const v = c[field];
    if (v !== null && v !== undefined) {
      const s = String(v).trim();
      if (s) return s;
    }

    // Template-level default (device specific). This enables "it just works" write control
    // for devices that have a fixed default unlock password (e.g. many SolaX models).
    const def = this._writeUnlock.defaultPassword;
    if (def === null || def === undefined) return null;
    const ds = String(def).trim();
    return ds ? ds : null;
  }

  async _maybeUnlockForWrite(currentWriteSrc) {
    if (!this._writeUnlock) return;

    const pwStr = this._getWritePassword();
    if (!pwStr) return;

    // Avoid accidental recursion: if the datapoint we are writing *is* the unlock register itself.
    try {
      if (currentWriteSrc) {
        const cfc = Number(currentWriteSrc.fc);
        const caddr = Number(currentWriteSrc.address);
        if (cfc === Number(this._writeUnlock.fc) && caddr === Number(this._writeUnlock.address)) return;
      }
    } catch (e) {
      // ignore
    }

    const now = Date.now();
    const cacheMs = Number(this._writeUnlock.cacheMs || 0);
    if (cacheMs > 0 && this._writeUnlockUntil && now < this._writeUnlockUntil) return;

    let pw = parseInt(pwStr, 10);
    if (!Number.isFinite(pw)) pw = 0;
    if (pw < 0) pw = 0;

    const fc = Number(this._writeUnlock.fc || 6);
    const addr = Number(this._writeUnlock.address || 0) + this.manualAddressOffset + this.autoAddressOffset;

    // Only FC6 and FC16 make sense for unlocking.
    if (fc === 6) {
      await this._mbWriteRegister(addr, pw & 0xFFFF);
    } else if (fc === 16) {
      await this._mbWriteRegisters(addr, [pw & 0xFFFF]);
    } else {
      // Unsupported unlock FC -> ignore (but log)
      this.adapter.log.warn(`[${this.device.id}] writeUnlock configured with unsupported FC=${fc}. Skipping unlock.`);
      return;
    }

    if (cacheMs > 0) this._writeUnlockUntil = now + cacheMs;
    this.adapter.log.debug(`[${this.device.id}] Modbus write-unlock OK (FC${fc}@${addr}).`);
  }

  async _maybeVerifyWriteComponentId(dp, src, unitId) {
    const spec = src && (src.requireComponentId || src.verifyComponentId || src.componentIdGuard);
    if (!spec || typeof spec !== 'object') return;

    const expected = String(spec.expected ?? spec.value ?? '').trim();
    const address = Number(spec.address);
    const length = Math.max(1, Math.trunc(Number(spec.length ?? 8)));
    const fc = Number(spec.fc ?? 3);
    const wo = spec.wordOrder || 'be';
    const bo = spec.byteOrder || 'be';
    const cacheMsRaw = Number(spec.cacheMs ?? 60000);
    const cacheMs = Number.isFinite(cacheMsRaw) && cacheMsRaw >= 0 ? cacheMsRaw : 60000;
    const uid = this._operationUnitId(unitId);

    if (!expected || !Number.isFinite(address) || address < 0 || ![3, 4].includes(fc)) {
      const err = new Error(`Invalid requireComponentId configuration for ${dp?.id || 'Modbus datapoint'}`);
      err.code = 'E_MODBUS_COMPONENT_GUARD_CONFIG';
      throw err;
    }

    const guardAddress = this._addr({
      address,
      addressOffsetSetting: spec.addressOffsetSetting,
    });
    if (!Number.isFinite(guardAddress)) {
      const err = new Error(`Invalid component-ID guard address for ${dp?.id || 'Modbus datapoint'}`);
      err.code = 'E_MODBUS_COMPONENT_GUARD_CONFIG';
      throw err;
    }

    const cacheKey = `${uid}|fc${fc}|${guardAddress}|${length}|${expected}`;
    const now = Date.now();
    const validUntil = Number(this._verifiedWriteComponentIds.get(cacheKey) || 0);
    if (cacheMs > 0 && validUntil > now) return;

    let response;
    try {
      response = fc === 4
        ? await this._mbReadInputRegisters(guardAddress, length, uid)
        : await this._mbReadHoldingRegisters(guardAddress, length, uid);
    } catch (error) {
      const err = new Error(
        `${dp?.id || 'Modbus write'} blocked: component-ID verification at UID${uid} FC${fc}@${guardAddress} ` +
        `failed (${error && error.message ? error.message : error}). Download the current FENECON Modbus list and ` +
        `verify the ctrlBalancing0 register block before writing.`,
      );
      err.code = 'E_MODBUS_COMPONENT_GUARD_READ';
      err.cause = error;
      throw err;
    }

    const regs = Array.isArray(response?.data) ? response.data.slice(0, length) : [];
    const actual = String(bufferToValue(regsToBuffer(regs, wo, bo), spec.dataType || 'string') ?? '').trim();
    if (actual !== expected) {
      const err = new Error(
        `${dp?.id || 'Modbus write'} blocked: expected component-ID ${JSON.stringify(expected)} at ` +
        `UID${uid} FC${fc}@${guardAddress}, but read ${JSON.stringify(actual || '<empty>')}. ` +
        `FENECON register blocks can move after app updates; download the current Modbus datapoint list before writing.`,
      );
      err.code = 'E_MODBUS_COMPONENT_ID_MISMATCH';
      err.expectedComponentId = expected;
      err.actualComponentId = actual;
      err.componentIdAddress = guardAddress;
      throw err;
    }

    if (cacheMs > 0) this._verifiedWriteComponentIds.set(cacheKey, now + cacheMs);
    try {
      this.adapter.log.debug(
        `[${this.device?.id || 'modbus'}] Component-ID guard accepted ${expected} at UID${uid} FC${fc}@${guardAddress} for ${dp?.id || 'write'}.`,
      );
    } catch (_) {}
  }

  _sunSpecSignatureInfo(regs) {
    if (!Array.isArray(regs) || regs.length < 2) return null;
    const r0 = Number(regs[0]) & 0xFFFF;
    const r1 = Number(regs[1]) & 0xFFFF;

    // "SunS" in two 16-bit registers.
    // Normal (big-endian words, big-endian bytes): 0x5375 0x6E53
    if (r0 === 0x5375 && r1 === 0x6E53) return { wordOrder: 'be', byteOrder: 'be' };

    // Some devices swap bytes inside the 16-bit words: 0x7553 0x536E
    if (r0 === 0x7553 && r1 === 0x536E) return { wordOrder: 'be', byteOrder: 'le' };

    // Rare: swapped word order (should not happen for SunSpec, but we accept it for robustness)
    if (r0 === 0x6E53 && r1 === 0x5375) return { wordOrder: 'le', byteOrder: 'be' };
    if (r0 === 0x536E && r1 === 0x7553) return { wordOrder: 'le', byteOrder: 'le' };

    return null;
  }

  async _maybeDiscoverSunSpec() {
    if (!this._autoSunSpec) return false;
    if (this._sunSpecDiscovered) return true;

    // Only do discovery once per runtime.
    this._sunSpecDiscovered = true;

    // Candidates (kept intentionally small to avoid long connect delays)
    const templateBase = Number.isFinite(this._sunSpecTemplateBase) ? this._sunSpecTemplateBase : 40000;

    const baseCandidates = (this._sunSpecScanBases && this._sunSpecScanBases.length)
      ? this._sunSpecScanBases
      : [templateBase, templateBase - 1, 0, 1];

    const unitCandidates = [];
    const pushUid = (v) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return;
      if (n < 0 || n > 247) return;
      if (!unitCandidates.includes(n)) unitCandidates.push(n);
    };
    pushUid(this.manualUnitId);

    // SMA note (field reality): some SMA devices expose SunSpec on a derived unitId.
    // Common case: SunSpec Unit-ID = (configured SMA Modbus Unit-ID) + 123.
    // Example: SMA unitId=3 -> SunSpec unitId=126.
    pushUid(this.manualUnitId + 123);
    // Common SMA / SunSpec unit IDs seen in the field
    pushUid(1);
    pushUid(3);
    pushUid(126);
    if (this._sunSpecScanUnitIds && this._sunSpecScanUnitIds.length) {
      for (const u of this._sunSpecScanUnitIds) pushUid(u);
    }

    const fcCandidates = (this._sunSpecScanFcs && this._sunSpecScanFcs.length)
      ? this._sunSpecScanFcs
      : [3, 4];

    const originalTimeout = this.timeoutMs;
    const discoveryTimeout = Math.min(1000, Math.max(300, originalTimeout));
    try {
      // Temporarily tighten timeout for discovery probes
      if (this.protocol === 'modbusTcp' && this.client && typeof this.client.setTimeout === 'function') {
        try { this.client.setTimeout(discoveryTimeout); } catch (_) {}
      }

      for (const uid of unitCandidates) {
        this._setUnitId(uid);

        for (const fc of fcCandidates) {
          for (const base of baseCandidates) {
            const b = Number(base);
            if (!Number.isFinite(b)) continue;
            const testAddr = b + this.manualAddressOffset;
            if (testAddr < 0 || testAddr > 65535) continue;

            try {
              let regs;
              if (fc === 3) {
                regs = (await this._mbReadHoldingRegisters(testAddr, 2)).data || [];
              } else if (fc === 4) {
                regs = (await this._mbReadInputRegisters(testAddr, 2)).data || [];
              } else {
                continue;
              }

              const sig = this._sunSpecSignatureInfo(regs);
              if (sig) {
                // Compute only the *additional* offset beyond the manual offset.
                const autoOff = b - templateBase - this.manualAddressOffset;
                this.autoAddressOffset = autoOff;
                this.autoUnitId = uid;
                this._sunSpecFc = fc;
                this._sunSpecFoundBase = b;
                // Reset model scan cache because base/unit may have changed
                this._sunSpecModelsScanned = false;
                this._sunSpecModelsById = new Map();

                // SunSpec endian handling:
                // The SunSpec signature tells us whether bytes/words are swapped on this device.
                // We enforce the detected endian regardless of the user/device connection settings
                // because wrong byte/word order will completely break SF scaling (e.g. values like 2.4e+260).
                const prevWo = this.wordOrder;
                const prevBo = this.byteOrder;
                if (sig && sig.wordOrder) this.wordOrder = sig.wordOrder;
                if (sig && sig.byteOrder) this.byteOrder = sig.byteOrder;

                const endianNote = (prevWo !== this.wordOrder || prevBo !== this.byteOrder)
                  ? ` Endian: wordOrder=${this.wordOrder}, byteOrder=${this.byteOrder} (was wordOrder=${prevWo}, byteOrder=${prevBo}).`
                  : ` Endian: wordOrder=${this.wordOrder}, byteOrder=${this.byteOrder}.`;

                this.adapter.log.info(
                  `[${this.device.id}] SunSpec discovery: found 'SunS' at base=${b} (FC${fc}, unitId=${uid}). ` +
                  `Applying autoAddressOffset=${autoOff} (manualAddressOffset=${this.manualAddressOffset}).${endianNote}`
                );
                return true;
              }
            } catch (e) {
              // Ignore probe errors and continue scanning.
            }
          }
        }
      }

      this.adapter.log.debug(
        `[${this.device.id}] SunSpec discovery: signature not found. ` +
        `Keeping unitId=${this.unitId} and addressOffset(manual)=${this.manualAddressOffset}.`
      );
      return false;
    } finally {
      // Restore timeout
      if (this.protocol === 'modbusTcp' && this.client && typeof this.client.setTimeout === 'function') {
        try { this.client.setTimeout(originalTimeout); } catch (_) {}
      }
    }
  }



  async _maybeScanSunSpecModels() {
    if (!this._autoSunSpec) return false;
    if (this._sunSpecModelsScanned) return true;

    // Ensure discovery has run so we know the correct unitId/base/fc/endian.
    try {
      await this._maybeDiscoverSunSpec();
    } catch (_) {
      // ignore
    }

    const fc = (this._sunSpecFc === 4) ? 4 : 3;
    const templateBase = Number(this._sunSpecTemplateBase ?? 40000);
    const base = templateBase + this.manualAddressOffset + this.autoAddressOffset;

    if (!Number.isFinite(base) || base < 0 || base > 65535) return false;

    const readRegs = async (addr, len) => {
      if (fc === 4) return (await this._mbReadInputRegisters(addr, len)).data || [];
      return (await this._mbReadHoldingRegisters(addr, len)).data || [];
    };

    const modelsById = new Map();

    // Model blocks start right after the 2-register "SunS" signature.
    // Each model is:
    //   ID (uint16), L (uint16), <L registers payload>
    // End of map is ID=0xFFFF, L=0.
    let off = 2;
    const maxModels = 200;
    const maxOff = 20000;

    for (let i = 0; i < maxModels && off < maxOff; i++) {
      let hdr;
      try {
        hdr = await readRegs(base + off, 2);
      } catch (e) {
        break;
      }

      if (!Array.isArray(hdr) || hdr.length < 2) break;
      const did = Number(hdr[0]) & 0xFFFF;
      const len = Number(hdr[1]) & 0xFFFF;

      if (did === 0xFFFF) break;
      if (did === 0) break;

      if (!modelsById.has(did)) modelsById.set(did, []);
      modelsById.get(did).push({ offset: off, len });

      // Advance to next model header
      off += 2 + len;
    }

    this._sunSpecModelsById = modelsById;
    this._sunSpecModelsScanned = true;

    try {
      const ids = Array.from(modelsById.keys()).sort((a, b) => a - b);
      this.adapter.log.debug(`[${this.device.id}] SunSpec model scan OK (${ids.length}): ${ids.join(', ')}`);
    } catch (_) {}

    return true;
  }

  async _mbReadCoils(start, len, unitIdOverride = null) {
    return await this._withIoLock(async () => {
      const uid = this._operationUnitId(unitIdOverride);
      if (this.protocol === 'modbusRtu') return await this.rtuBus.readCoils(uid, this.timeoutMs, start, len);
      if (this.protocol === 'modbusAscii') return await this.asciiBus.readCoils(uid, this.timeoutMs, start, len);
      if (!this.client) {
        const err = new Error('Port Not Open');
        err.code = 'ERR_SOCKET_CLOSED';
        throw err;
      }
      this._setTcpRequestUnitId(uid);
      return await this.client.readCoils(start, len);
    });
  }

  async _mbReadDiscreteInputs(start, len, unitIdOverride = null) {
    return await this._withIoLock(async () => {
      const uid = this._operationUnitId(unitIdOverride);
      if (this.protocol === 'modbusRtu') return await this.rtuBus.readDiscreteInputs(uid, this.timeoutMs, start, len);
      if (this.protocol === 'modbusAscii') return await this.asciiBus.readDiscreteInputs(uid, this.timeoutMs, start, len);
      if (!this.client) {
        const err = new Error('Port Not Open');
        err.code = 'ERR_SOCKET_CLOSED';
        throw err;
      }
      this._setTcpRequestUnitId(uid);
      return await this.client.readDiscreteInputs(start, len);
    });
  }

  async _mbReadHoldingRegisters(start, len, unitIdOverride = null) {
    return await this._withIoLock(async () => {
      const uid = this._operationUnitId(unitIdOverride);
      if (this.protocol === 'modbusRtu') return await this.rtuBus.readHoldingRegisters(uid, this.timeoutMs, start, len);
      if (this.protocol === 'modbusAscii') return await this.asciiBus.readHoldingRegisters(uid, this.timeoutMs, start, len);
      if (!this.client) {
        const err = new Error('Port Not Open');
        err.code = 'ERR_SOCKET_CLOSED';
        throw err;
      }
      this._setTcpRequestUnitId(uid);
      return await this.client.readHoldingRegisters(start, len);
    });
  }

  async _mbReadInputRegisters(start, len, unitIdOverride = null) {
    return await this._withIoLock(async () => {
      const uid = this._operationUnitId(unitIdOverride);
      if (this.protocol === 'modbusRtu') return await this.rtuBus.readInputRegisters(uid, this.timeoutMs, start, len);
      if (this.protocol === 'modbusAscii') return await this.asciiBus.readInputRegisters(uid, this.timeoutMs, start, len);
      if (!this.client) {
        const err = new Error('Port Not Open');
        err.code = 'ERR_SOCKET_CLOSED';
        throw err;
      }
      this._setTcpRequestUnitId(uid);
      return await this.client.readInputRegisters(start, len);
    });
  }

  async _mbWriteCoil(addr, value, unitIdOverride = null) {
    return await this._withIoLock(async () => {
      const uid = this._operationUnitId(unitIdOverride);
      if (this.protocol === 'modbusRtu') return await this.rtuBus.writeCoil(uid, this.timeoutMs, addr, value);
      if (this.protocol === 'modbusAscii') return await this.asciiBus.writeCoil(uid, this.timeoutMs, addr, value);
      if (!this.client) {
        const err = new Error('Port Not Open');
        err.code = 'ERR_SOCKET_CLOSED';
        throw err;
      }
      this._setTcpRequestUnitId(uid);
      return await this.client.writeCoil(addr, value);
    });
  }

  async _mbWriteCoils(addr, values, unitIdOverride = null) {
    return await this._withIoLock(async () => {
      const uid = this._operationUnitId(unitIdOverride);
      if (this.protocol === 'modbusRtu') return await this.rtuBus.writeCoils(uid, this.timeoutMs, addr, values);
      if (this.protocol === 'modbusAscii') return await this.asciiBus.writeCoils(uid, this.timeoutMs, addr, values);
      if (!this.client) {
        const err = new Error('Port Not Open');
        err.code = 'ERR_SOCKET_CLOSED';
        throw err;
      }
      this._setTcpRequestUnitId(uid);
      return await this.client.writeCoils(addr, values);
    });
  }

  async _mbWriteRegister(addr, value, unitIdOverride = null) {
    return await this._withIoLock(async () => {
      const uid = this._operationUnitId(unitIdOverride);
      if (this.protocol === 'modbusRtu') return await this.rtuBus.writeRegister(uid, this.timeoutMs, addr, value);
      if (this.protocol === 'modbusAscii') return await this.asciiBus.writeRegister(uid, this.timeoutMs, addr, value);
      if (!this.client) {
        const err = new Error('Port Not Open');
        err.code = 'ERR_SOCKET_CLOSED';
        throw err;
      }
      this._setTcpRequestUnitId(uid);
      return await this.client.writeRegister(addr, value);
    });
  }

  async _mbWriteRegisters(addr, values, unitIdOverride = null) {
    return await this._withIoLock(async () => {
      const uid = this._operationUnitId(unitIdOverride);
      if (this.protocol === 'modbusRtu') return await this.rtuBus.writeRegisters(uid, this.timeoutMs, addr, values);
      if (this.protocol === 'modbusAscii') return await this.asciiBus.writeRegisters(uid, this.timeoutMs, addr, values);
      if (!this.client) {
        const err = new Error('Port Not Open');
        err.code = 'ERR_SOCKET_CLOSED';
        throw err;
      }
      this._setTcpRequestUnitId(uid);
      return await this.client.writeRegisters(addr, values);
    });
  }

  // NOTE: _addr() has been moved up to include manual+auto offsets.

  _shouldInvert(settingKey) {
    if (!settingKey) return false;
    // allow either device.<key> or device.settings.<key>
    const direct = this.device?.[settingKey];
    if (typeof direct === 'boolean') return direct;
    const nested = this.device?.settings?.[settingKey];
    if (typeof nested === 'boolean') return nested;
    return false;
  }


_getScaleFactor(src) {
  if (!src) return 0;

  // The supplied V10.03 table specifies 100 Wh/tick for both counters. A
  // firmware-specific resolution must be selected explicitly, per counter.
  if (this._depowerV1003 && ['session', 'total'].includes(src.depowerEnergyCounter)) {
    const key = src.depowerEnergyCounter === 'session'
      ? 'depowerSessionEnergyWhPerTick' : 'depowerTotalEnergyWhPerTick';
    const configured = this.device?.connection?.[key];
    if (configured !== undefined && configured !== null && configured !== '') {
      return Math.log10(Number(configured)) - 3; // internal datapoints remain kWh
    }
  }

  // Dynamic scale factor via reference (e.g. SunSpec <X>_SF)
  if (src.scaleFactorRef) {
    const key = String(src.scaleFactorRef);
    const cached = this._sfCache.get(key);
    const n = Number(cached);

    // SunSpec uses 0x8000 (-32768) as "not implemented" for int16
    if (!Number.isNaN(n) && n !== -32768) {
      // Sanity guard: scale factors are small exponents. Huge values are almost always
      // a byte/word-order or address-offset issue and will explode numbers (e.g. 2.4e+260).
      if (Math.abs(n) > 20) {
        const now = Date.now();
        const until = this._sfWarnedUntil ? (Number(this._sfWarnedUntil.get(key)) || 0) : 0;
        if (!until || now > until) {
          try {
            if (this._sfWarnedUntil) this._sfWarnedUntil.set(key, now + 60000); // 60s throttle per SF key
          } catch (_) {}
          this.adapter.log.warn(
            `[${this.device.id}] Suspicious scale factor ${key}=${n}. Ignoring scaling (SF=0). ` +
            `Check Modbus Byte-/Wortreihenfolge and address offset.`
          );
        }
        return 0;
      }
      return n;
    }
  }

  const n = Number(src.scaleFactor || 0);
  return Number.isNaN(n) ? 0 : n;
}

  _applyTransforms(value, src) {
    if (typeof value !== 'number') return value;
    if (Number.isNaN(value)) {
      // Optionally map IEEE NaN to null as well (useful for meters that export NaN for
      // non-supported values). Enabled per datapoint via `nanToNull`.
      if (src && (src.nanToNull === true || src.nanNull === true || src.nanToUndefined === true)) return null;
      return value;
    }

    let v = value;

    const parseIntMaybeHex = (x) => {
      if (x === null || x === undefined) return undefined;
      if (typeof x === 'number' && Number.isFinite(x)) return x;
      if (typeof x === 'string') {
        const s = x.trim().toLowerCase();
        if (s === '') return undefined;
        if (s.startsWith('0x')) {
          const n = parseInt(s, 16);
          return Number.isFinite(n) ? n : undefined;
        }
        const n = Number(s);
        return Number.isFinite(n) ? n : undefined;
      }
      return undefined;
    };

    // Optional explicit boolean value mapping. Many vendors use non-0/1 codes
    // for switches (e.g. Sungrow 0xAA=enable, 0x55=disable).
    const trueValue = parseIntMaybeHex(src && (src.trueValue ?? src.onValue ?? src.enableValue ?? src.valueTrue));
    const falseValue = parseIntMaybeHex(src && (src.falseValue ?? src.offValue ?? src.disableValue ?? src.valueFalse));

    if (trueValue !== undefined || falseValue !== undefined) {
      if (trueValue !== undefined && v === trueValue) return true;
      if (falseValue !== undefined && v === falseValue) return false;
      if (src && (src.toBoolean === true || src.boolean === true)) return v !== 0;
    }

    // Optional NaN/sentinel handling (device specific).
    // Many Modbus profiles (including SMA) use fixed sentinel values to indicate "NaN" / "not implemented".
    // We only apply this conversion when explicitly enabled per datapoint, to avoid breaking other devices.
    //
    // Usage:
    //   source: { nanToNull: true }  -> use default sentinel per dataType
    //   source: { nanValue: 0x80000000 } -> map this value to null
    const nanValue = parseIntMaybeHex(src && (src.nanValue ?? src.nan));
    if (nanValue !== undefined && v === nanValue) return null;

    if (src && (src.nanToNull === true || src.nanNull === true || src.nanToUndefined === true)) {
      const dt = (src.dataType || '').toString().toLowerCase();

      // Defaults match SMA Modbus TI (S16=0x8000, S32=0x80000000, U16=0xFFFF, U32=0xFFFFFFFF)
      // and common Modbus conventions.
      if ((dt === 'int16' || dt === 's16') && v === -32768) return null;
      if ((dt === 'uint16' || dt === 'u16') && v === 65535) return null;
      if ((dt === 'int32' || dt === 's32') && v === -2147483648) return null;
      if ((dt === 'uint32' || dt === 'u32') && v === 4294967295) return null;
    }

    // Optional bit extraction (useful for packed status registers).
    // Applied BEFORE scaling and sign transforms.
    const bitShift = parseIntMaybeHex(src && src.bitShift);
    const bitMask = parseIntMaybeHex(src && src.bitMask);

    if ((bitShift !== undefined && bitShift !== 0) || bitMask !== undefined) {
      // Ensure integer for bit ops. We intentionally use unsigned operations by default.
      const vi = Math.trunc(v);
      let vv = vi;

      if (bitShift !== undefined && bitShift !== 0) {
        const sh = Math.trunc(bitShift);
        if (sh > 0) {
          if (src && src.bitShiftSigned === true) {
            vv = (vv >> sh);
          } else {
            vv = (vv >>> sh);
          }
        } else if (sh < 0) {
          // Negative shift means left shift
          const lsh = -sh;
          vv = (vv << lsh);
        }
      }

      if (bitMask !== undefined) {
        const mask = Math.trunc(bitMask);
        vv = (vv & mask);
      }

      v = vv;
    }

    // scaleFactor is applied on read direction (Element -> Channel)
    const sf = this._getScaleFactor(src);
    if (sf) v = applyScale(v, sf);

    if (src.invert === true) v = -v;
    if (src.invertIfSetting && this._shouldInvert(src.invertIfSetting)) v = -v;

    if (src.keepPositive === true) v = Math.max(0, v);
    if (src.keepNegativeAndInvert === true) v = v < 0 ? (-v) : 0;

    if (src.toBoolean === true || src.boolean === true) {
      if (src.trueWhenZero === true || src.booleanWhenZero === true) {
        return v === 0;
      }
      return v !== 0;
    }

    return v;
  }


async readDatapoints(datapoints) {
  if (this._busy) {
    const age = Date.now() - Number(this._busySince || 0);
    const maxBusy = Math.max(Number(this.operationTimeoutMs || 0) * 2, Number(this.timeoutMs || 0) * 3, 10000);
    if (this._busySince && age > maxBusy) {
      const err = this._makeTimeoutError('Modbus poll busy guard', maxBusy, 'E_MODBUS_BUSY_STALE');
      this.adapter.log.warn(`[${this.device?.id || 'modbus'}] Modbus poll was busy for ${age} ms; forcing reconnect and clearing IO queue.`);
      this._busy = false;
      this._busySince = 0;
      this._markDisconnected(err);
    } else {
      return {}; // skip overlapping polls
    }
  }
  this._busy = true;
  this._busySince = Date.now();

  const out = {};

  // Keep numeric raw values separate so we can apply dynamic scale factors after all reads.
  const numRawById = {};
  const srcById = {};

  let optionalFailureCount = 0;
  let skippedReadGroupCount = 0;
  let lastOptionalReadError = null;

  const groupKey = (fc, g, unitId) => `${this._operationUnitId(unitId)}:${Number(fc)}:${Number(g.start)}:${Number(g.end)}`;
  const groupHasRequiredDp = (g) => {
    if (!this.requiredReadDpIds || !this.requiredReadDpIds.size) return false;
    return (g.items || []).some(item => item && item.dp && this.requiredReadDpIds.has(String(item.dp.id)));
  };
  const warnOptionalGroupFailure = (fc, g, e, unitId) => {
    const key = groupKey(fc, g, unitId);
    const now = Date.now();
    const nextWarnAt = this._readGroupWarnUntil.get(key) || 0;
    if (now < nextWarnAt) return;
    this._readGroupWarnUntil.set(key, now + 60000);
    const msg = (e && e.message) ? e.message : String(e);
    const ids = (g.items || []).map(item => item && item.dp ? item.dp.id : '').filter(Boolean).slice(0, 8).join(', ');
    const uid = this._operationUnitId(unitId);
    const line = `[${this.device?.id || 'modbus'}] Optional Modbus read group failed and will be skipped temporarily: UID${uid} FC${fc} ${g.start}-${g.end}${ids ? ` (${ids}${(g.items || []).length > 8 ? ', ...' : ''})` : ''}: ${msg}`;
    const lvl = String(this.optionalReadErrorLogLevel || 'warn').toLowerCase();
    if (lvl === 'silent' || lvl === 'none' || lvl === 'off') return;
    if (lvl === 'debug') this.adapter.log.debug(line);
    else if (lvl === 'info') this.adapter.log.info(line);
    else this.adapter.log.warn(line);
  };

  const groupFallbackOffsets = (g) => {
    const alfenOffsets = this._alfenReadFallbackOffsetsForGroup(g);
    if (alfenOffsets && alfenOffsets.length) return alfenOffsets;
    const items = Array.isArray(g?.items) ? g.items : [];
    if (!items.length) return [];
    let common = null;
    for (const item of items) {
      const offsets = this._addressFallbackOffsets(item && item.src);
      if (!offsets.length) return [];
      if (common === null) {
        common = offsets.slice();
      } else {
        common = common.filter(v => offsets.includes(v));
      }
      if (!common.length) return [];
    }
    return common || [];
  };

  const shouldSkipGroup = (fc, g, unitId) => {
    if (!(this.continueOnReadError || this.softIllegalAddressReads) || !this.skipFailedReadGroupsMs) return false;
    const until = this._readGroupSkipUntil.get(groupKey(fc, g, unitId)) || 0;
    return until > Date.now();
  };

  const shouldForceSplitGroup = (fc, g, unitId) => {
    if (!this.adaptiveReadSplit || !this.splitFailedReadGroupsMs) return false;
    if (!g || !Array.isArray(g.items) || g.items.length <= 1) return false;
    const until = this._readGroupForceSplitUntil.get(groupKey(fc, g, unitId)) || 0;
    return until > Date.now();
  };

  const handleGroupReadError = async (fc, g, e, unitId) => {
    const isRequired = groupHasRequiredDp(g);

    if (isTransportError(e)) {
      this._markDisconnected(e);
      // Reset the TCP/serial handle so the next command starts with a clean session.
      try { await this.disconnect(); } catch (_) {}

      // Only reconnect inside the same poll when the failed group is optional and may be skipped.
      // For required live groups we throw immediately; DeviceRuntime will mark the device offline
      // and the next scheduled poll performs a clean reconnect. This avoids reconnect-then-close
      // races after a required timeout.
      if (this.continueOnReadError && !isRequired) {
        try { await this.ensureConnected(); } catch (_) {}
      }
    }

    const canSoftSkip = this.continueOnReadError || (this.softIllegalAddressReads && isModbusIllegalAddressOrValue(e) && !isRequired);
    if (!canSoftSkip || isRequired) {
      throw e;
    }

    if (this._isAlfenProfile && isModbusIllegalAddressOrValue(e)) {
      try {
        const ids = (g.items || []).map(item => item && item.dp ? String(item.dp.id || '') : '').filter(Boolean);
        if (ids.some(id => this._isAlfenSocketControlReadDpId(id))) this._markAlfenControlUnsupported('socket', e && e.message ? e.message : String(e));
        if (ids.some(id => this._isAlfenScnReadDpId(id))) this._markAlfenControlUnsupported('scn', e && e.message ? e.message : String(e));
      } catch (_) {}
    }

    optionalFailureCount += 1;
    lastOptionalReadError = e;
    if (this.skipFailedReadGroupsMs > 0) {
      this._readGroupSkipUntil.set(groupKey(fc, g, unitId), Date.now() + this.skipFailedReadGroupsMs);
    }
    warnOptionalGroupFailure(fc, g, e, unitId);
    return null;
  };

  const noteGroupForcedSplit = (fc, g, unitId, reason) => {
    if (!this.adaptiveReadSplit || !g || !Array.isArray(g.items) || g.items.length <= 1) return;
    const key = groupKey(fc, g, unitId);
    const now = Date.now();
    if (this.splitFailedReadGroupsMs > 0) {
      this._readGroupForceSplitUntil.set(key, now + this.splitFailedReadGroupsMs);
    }
    const nextWarnAt = this._readGroupSplitWarnUntil.get(key) || 0;
    if (now < nextWarnAt) return;
    this._readGroupSplitWarnUntil.set(key, now + 300000);
    const ids = (g.items || []).map(item => item && item.dp ? item.dp.id : '').filter(Boolean).slice(0, 8).join(', ');
    const line = `[${this.device?.id || 'modbus'}] Modbus read group UID${this._operationUnitId(unitId)} FC${fc} ${g.start}-${g.end}${ids ? ` (${ids}${(g.items || []).length > 8 ? ', ...' : ''})` : ''} will be split into per-datapoint reads temporarily${reason ? `: ${reason}` : ''}`;
    try { this.adapter.log.info(line); } catch (_) {}
  };

  const storeRegisterItemValue = (item, regs, groupStart) => {
    const dp = item.dp;
    const src = item.src;
    const off = Number(item.addr) - Number(groupStart);
    const slice = (regs || []).slice(off, off + Number(src.length || 1));
    if (slice.length < Number(src.length || 1)) return false;

    const wo = this._alfenReadWordOrderForItem(item, src.wordOrder || this.wordOrder);
    const bo = this._alfenReadByteOrderForItem(item, src.byteOrder || this.byteOrder);
    const buf = regsToBuffer(slice, wo, bo);
    let raw = bufferToValue(buf, src.dataType);

    if (typeof raw === 'bigint') {
      const dt = String(src.dataType || '').toLowerCase();
      const wantsNull = !!(src.nanToNull === true || src.nanNull === true || src.nanToUndefined === true);

      if (wantsNull && dt === 'uint64' && raw === 0xFFFFFFFFFFFFFFFFn) {
        out[dp.id] = null;
        return true;
      }

      const conv = bigIntToNumberOrString(raw);
      if (typeof conv === 'string') {
        if (src.bigIntToNullOnOverflow === true || src.uint64OverflowToNull === true) {
          out[dp.id] = null;
          return true;
        }
        out[dp.id] = conv;
        return true;
      }
      raw = conv;
    }

    if (typeof raw === 'boolean') {
      out[dp.id] = raw;
      return true;
    }

    if (typeof raw === 'string') {
      out[dp.id] = raw;
      return true;
    }

    const n = Number(raw);
    if (!Number.isNaN(n)) {
      numRawById[dp.id] = n;
      srcById[dp.id] = src;
      return true;
    }
    return false;
  };

  const readRegisterGroupRaw = async (fc, start, len, unitId) => {
    if (fc === 3) return (await this._mbReadHoldingRegisters(start, len, unitId)).data || [];
    return (await this._mbReadInputRegisters(start, len, unitId)).data || [];
  };

  const recoverRegisterGroupBySplit = async (fc, g, unitId, originalError) => {
    if (!this.adaptiveReadSplit || !g || !Array.isArray(g.items) || g.items.length <= 1) return false;

    const originalMsg = originalError && originalError.message ? originalError.message : String(originalError || 'read failed');
    noteGroupForcedSplit(fc, g, unitId, originalMsg);

    let success = 0;
    let requiredFailure = null;
    let lastErr = null;

    for (const item of (g.items || [])) {
      if (!item || !item.dp || !item.src) continue;
      const ig = { start: item.addr, end: item.end, items: [item] };
      if (shouldSkipGroup(fc, ig, unitId)) { skippedReadGroupCount += 1; continue; }
      try {
        const regs = await readRegisterGroupRaw(fc, item.addr, Number(item.len || item.src.length || 1), unitId);
        if (storeRegisterItemValue(item, regs, item.addr)) success += 1;
      } catch (e) {
        lastErr = e;
        if (groupHasRequiredDp(ig)) requiredFailure = e;
        optionalFailureCount += 1;
        lastOptionalReadError = e;
        if (this.skipFailedReadGroupsMs > 0) {
          this._readGroupSkipUntil.set(groupKey(fc, ig, unitId), Date.now() + this.skipFailedReadGroupsMs);
        }
        warnOptionalGroupFailure(fc, ig, e, unitId);
      }
    }

    if (requiredFailure) throw requiredFailure;
    if (success > 0) return true;
    if (lastErr && !this.continueOnReadError && !this.softIllegalAddressReads) throw lastErr;
    return false;
  };

  try {
    await this.ensureConnected();

    // SunSpec: if a template uses SunSpec model addressing we need the model map (ID -> start offset).
    // We scan the model chain once (cheap) and then resolve absolute addresses per datapoint.
    const needsSunSpec = (datapoints || []).some(dp => {
      const s = getReadSource(dp);
      return s && s.sunspecModel !== undefined && s.sunspecModel !== null;
    });
    if (needsSunSpec) {
      try { await this._maybeScanSunSpecModels(); } catch (_) {}
    }

    const readItems = (datapoints || []).map(dp => {
      const src = getReadSource(dp);
      if (!src) return null;
      let fc = Number(src.fc);
      // SunSpec templates may auto-detect whether registers are exposed via FC3 or FC4.
      if ((src.sunspecModel !== undefined && src.sunspecModel !== null) && (this._sunSpecFc === 3 || this._sunSpecFc === 4)) {
        fc = this._sunSpecFc;
      }
      if (![1, 2, 3, 4].includes(fc)) return null;
      const baseAddr = this._addr(src);
      // SunSpec models can be optional; if a referenced model does not exist,
      // _addr() returns NaN (for address=0). Skip those datapoints gracefully.
      if (!Number.isFinite(baseAddr)) return null;
      const len = Number(src.length || 1);
      const unitId = this._sourceUnitId(src);
      const addr = this._applyAlfenReadAddressVariant({ dp, src, addr: baseAddr, baseAddr, len, fc, unitId });
      return { dp, src, addr, baseAddr, len, fc, unitId };
    }).filter(Boolean);

    // Collect all referenced scale factor datapoints (e.g. <X>_SF)
    const scaleFactorRefs = new Set();
    for (const it of readItems) {
      if (it?.src?.scaleFactorRef) scaleFactorRefs.add(String(it.src.scaleFactorRef));
    }

    const byBus = new Map();
    for (const it of readItems) {
      const fc = Number(it.fc);
      const unitId = this._operationUnitId(it.unitId);
      const key = `${unitId}:${fc}`;
      if (!byBus.has(key)) byBus.set(key, { fc, unitId, items: [] });
      byBus.get(key).items.push(it);
    }

    for (const { fc, unitId, items } of byBus.values()) {
      if (fc === 1) {
        // Coils
        const groups = buildGroups(items, 2000);
        for (const g of groups) {
          if (shouldSkipGroup(fc, g, unitId)) { skippedReadGroupCount += 1; continue; }
          const len = g.end - g.start + 1;
          let res;
          try {
            res = await this._mbReadCoils(g.start, len, unitId);
          } catch (e) {
            res = await handleGroupReadError(fc, g, e, unitId);
            if (!res) continue;
          }
          const bits = res.data || [];
          for (const item of g.items) {
            const off = item.addr - g.start;
            out[item.dp.id] = !!bits[off];
          }
        }
        continue;
      }

      if (fc === 2) {
        // Discrete inputs
        const groups = buildGroups(items, 2000);
        for (const g of groups) {
          if (shouldSkipGroup(fc, g, unitId)) { skippedReadGroupCount += 1; continue; }
          const len = g.end - g.start + 1;
          let res;
          try {
            res = await this._mbReadDiscreteInputs(g.start, len, unitId);
          } catch (e) {
            res = await handleGroupReadError(fc, g, e, unitId);
            if (!res) continue;
          }
          const bits = res.data || [];
          for (const item of g.items) {
            const off = item.addr - g.start;
            out[item.dp.id] = !!bits[off];
          }
        }
        continue;
      }

      // Registers
      const groups = buildGroups(items, this.maxReadRegs, {
        allowGaps: !this.strictContiguousReads,
        isolateItems: this.isolateReadDatapoints,
      });
      for (const g of groups) {
        if (shouldSkipGroup(fc, g, unitId)) { skippedReadGroupCount += 1; continue; }
        const len = g.end - g.start + 1;

        if (shouldForceSplitGroup(fc, g, unitId)) {
          const recovered = await recoverRegisterGroupBySplit(fc, g, unitId, new Error('cached split mode'));
          if (recovered) continue;
        }

        let regs;
        try {
          regs = await readRegisterGroupRaw(fc, g.start, len, unitId);
        } catch (e) {
          let fallbackReadOk = false;
          if (isModbusIllegalAddressOrValue(e)) {
            for (const off of groupFallbackOffsets(g)) {
              const fbStart = Number(g.start) + Number(off);
              if (!Number.isFinite(fbStart) || fbStart < 0) continue;
              try {
                regs = await readRegisterGroupRaw(fc, fbStart, len, unitId);
                fallbackReadOk = true;
                this._cacheAlfenReadVariantForGroup(g, unitId, off);
                break;
              } catch (_) {
                // Try the next explicitly configured fallback offset, if any.
              }
            }
          }
          if (!fallbackReadOk) {
            if (isModbusIllegalAddressOrValue(e)) {
              const recovered = await recoverRegisterGroupBySplit(fc, g, unitId, e);
              if (recovered) continue;
            }
            const res = await handleGroupReadError(fc, g, e, unitId);
            if (!res) continue;
            regs = res.data || [];
          }
        }

        for (const item of g.items) {
          storeRegisterItemValue(item, regs, g.start);
        }
      }
    }

    // If every requested group failed or was skipped, surface the last failure so the
    // device state still reflects a real communication problem.
    if (Object.keys(out).length === 0 && Object.keys(numRawById).length === 0 && (optionalFailureCount > 0 || skippedReadGroupCount > 0)) {
      if (lastOptionalReadError) throw lastOptionalReadError;
      throw new Error('All Modbus read groups are currently skipped after previous failures');
    }

    // Update dynamic scale-factor cache first (order-independent)
    for (const [dpId, raw] of Object.entries(numRawById)) {
      if (dpId.endsWith('_SF')) {
        // SunSpec uses 0x8000 (-32768) as "not implemented" for int16
        if (raw !== -32768) this._sfCache.set(dpId, raw);
      }
    }
    for (const ref of scaleFactorRefs) {
      const raw = numRawById[ref];
      if (typeof raw === 'number' && !Number.isNaN(raw) && raw !== -32768) {
        this._sfCache.set(ref, raw);
      }
    }

    // Apply numeric transforms (including dynamic scaling) now that SF cache is up-to-date
    for (const [dpId, raw] of Object.entries(numRawById)) {
      const src = srcById[dpId] || {};
      out[dpId] = this._applyTransforms(raw, src);
    }
  } catch (e) {
    if (isTransportError(e)) {
      this._markDisconnected(e);
    }
    throw e;
  } finally {
    this._busy = false;
    this._busySince = 0;
  }

  return out;
}

  _getTemplateDpById(dpId) {
    if (!dpId) return null;
    const wanted = String(dpId);
    const dps = (this.template && Array.isArray(this.template.datapoints)) ? this.template.datapoints : [];
    return dps.find(d => d && String(d.id) === wanted) || null;
  }

  _getSungrowSignedPowerControlForDp(dpId) {
    const id = String(dpId || '');
    if (!id || !Array.isArray(this._sungrowSignedPowerControls)) return null;
    for (const cfg of this._sungrowSignedPowerControls) {
      if (!cfg || cfg.enabled === false) continue;
      const ids = [];
      if (cfg.triggerDpId) ids.push(String(cfg.triggerDpId));
      if (Array.isArray(cfg.triggerDpIds)) {
        for (const v of cfg.triggerDpIds) if (v !== null && v !== undefined) ids.push(String(v));
      }
      if (ids.includes(id)) return cfg;
    }
    return null;
  }

  async _writeDatapointById(dpId, value) {
    const dp = this._getTemplateDpById(dpId);
    if (!dp) throw new Error(`Sungrow compound write datapoint not found: ${dpId}`);
    if (!(dp.rw === 'rw' || dp.rw === 'wo')) throw new Error(`Sungrow compound write datapoint is not writable: ${dpId}`);
    await this.writeDatapoint(dp, value);
  }

  async _writeDatapointByIdOptional(dpId, value, label = 'optional write') {
    const dp = this._getTemplateDpById(dpId);
    if (!dp || !(dp.rw === 'rw' || dp.rw === 'wo')) return false;
    try {
      await this.writeDatapoint(dp, value);
      return true;
    } catch (e) {
      // Optional Sungrow helper writes (heartbeat, wide power, command-repeat) must not
      // abort the primary power command.  Keep real transport errors fatal so a broken
      // TCP/RTU link still marks the device unhealthy, but swallow Modbus protocol
      // rejections such as exception 4 from unsupported/temporarily invalid helpers.
      if (isTransportError(e) || (!isModbusIllegalAddressOrValue(e) && !isModbusProtocolException(e))) throw e;
      try { this.adapter.log.debug(`[${this.device?.id || 'modbus'}] Sungrow ${label} ${dpId} rejected by device; continuing. ${e && e.message ? e.message : e}`); } catch (_) {}
      return false;
    }
  }

  _nextSungrowHeartbeatValue(cfg) {
    const mode = String(cfg?.heartbeatValueMode || cfg?.heartbeatMode || '').toLowerCase();
    const raw = cfg?.heartbeatValue;
    const minRaw = Number(cfg?.heartbeatMinValue ?? cfg?.heartbeatValueMin ?? cfg?.heartbeatWriteMin ?? 0);
    const maxRaw = Number(cfg?.heartbeatMaxValue ?? cfg?.heartbeatValueMax ?? cfg?.heartbeatWriteMax ?? 1000);
    const minAllowed = Number.isFinite(minRaw) && minRaw >= 0 ? Math.trunc(minRaw) : 0;
    const maxAllowed = Number.isFinite(maxRaw) && maxRaw > minAllowed ? Math.trunc(maxRaw) : 1000;
    const defaultRaw = Number(cfg?.heartbeatDefaultValue ?? cfg?.heartbeatFixedValue ?? 20);
    const defaultValue = Number.isFinite(defaultRaw) ? Math.trunc(defaultRaw) : 20;
    const clamp = (v) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return undefined;
      return Math.max(minAllowed, Math.min(maxAllowed, Math.trunc(n)));
    };

    if (mode === 'counter' || raw === 'counter' || raw === '__counter__') {
      // Legacy 0.5.128/0.5.129 templates used a monotonic counter here.  Sungrow
      // treats the heartbeat register as a timeout in seconds, so the safe default
      // is a fixed in-range timeout value.  A real counter can still be forced for
      // lab/testing profiles via forceHeartbeatCounter=true.
      if (cfg?.forceHeartbeatCounter !== true && cfg?.allowHeartbeatCounter !== true) {
        return clamp(defaultValue);
      }
      const minCounterRaw = Number(cfg?.heartbeatCounterMin ?? Math.max(1, minAllowed));
      const maxCounterRaw = Number(cfg?.heartbeatCounterMax ?? maxAllowed);
      const min = Number.isFinite(minCounterRaw) && minCounterRaw >= minAllowed ? Math.trunc(minCounterRaw) : Math.max(1, minAllowed);
      const max = Number.isFinite(maxCounterRaw) && maxCounterRaw > min ? Math.min(Math.trunc(maxCounterRaw), maxAllowed) : maxAllowed;
      const prev = Number(this._sungrowHeartbeatCounter || 0);
      let next = prev + 1;
      if (!Number.isFinite(next) || next < min || next > max) next = min;
      this._sungrowHeartbeatCounter = next;
      return clamp(next);
    }
    if (mode === 'unix' || mode === 'unixmod' || mode === 'time') {
      return clamp(Math.trunc(Date.now() / 1000));
    }
    if (raw !== undefined && raw !== null) {
      return clamp(raw);
    }
    return undefined;
  }

  async _maybeWriteSungrowHeartbeat(cfg, value) {
    const dpId = String(cfg?.heartbeatDpId || '').trim();
    if (!dpId || value === undefined || value === null) return false;

    const minMsRaw = Number(cfg?.heartbeatMinIntervalMs ?? cfg?.heartbeatRefreshMinMs ?? cfg?.heartbeatWriteMinIntervalMs ?? 0);
    const minMs = Number.isFinite(minMsRaw) && minMsRaw > 0 ? Math.trunc(minMsRaw) : 0;
    const key = `${dpId}`;
    const now = Date.now();
    if (!this._sungrowHeartbeatLastWriteAt || typeof this._sungrowHeartbeatLastWriteAt.get !== 'function') {
      this._sungrowHeartbeatLastWriteAt = new Map();
    }
    const last = Number(this._sungrowHeartbeatLastWriteAt.get(key) || 0);
    if (minMs > 0 && last > 0 && (now - last) < minMs) return true;

    const ok = await this._writeDatapointByIdOptional(dpId, value, 'heartbeat');
    if (ok) this._sungrowHeartbeatLastWriteAt.set(key, now);
    return ok;
  }

  async refreshSungrowSignedPowerControlHeartbeats(_opts = {}) {
    if (!Array.isArray(this._sungrowSignedPowerControls) || !this._sungrowSignedPowerControls.length) return 0;
    let count = 0;
    const seenHeartbeatDpIds = new Set();
    for (const cfg of this._sungrowSignedPowerControls) {
      if (!cfg || cfg.enabled === false) continue;
      if (!(cfg.heartbeatAutoRefresh === true || cfg.autoRefreshHeartbeat === true)) continue;
      const dpId = String(cfg.heartbeatDpId || '').trim();
      if (!dpId) continue;
      if (seenHeartbeatDpIds.has(dpId)) continue;
      seenHeartbeatDpIds.add(dpId);
      const value = this._nextSungrowHeartbeatValue(cfg);
      const ok = await this._maybeWriteSungrowHeartbeat(cfg, value);
      if (ok) count += 1;
    }
    return count;
  }

  _encodeSungrowWriteValue(dpId, value) {
    const dp = this._getTemplateDpById(dpId);
    if (!dp) throw new Error(`Sungrow block-write datapoint not found: ${dpId}`);
    const src = getWriteSource(dp);
    if (!src) throw new Error(`Sungrow block-write datapoint has no write source: ${dpId}`);
    let raw = value;
    if (typeof raw === 'string' && raw.trim() !== '') {
      const n = Number(raw);
      if (!Number.isNaN(n)) raw = n;
    }
    raw = applyWriteValueConstraints(raw, src, dp.id);
    if (typeof raw === 'number') {
      const sf = this._getScaleFactor(src);
      if (sf) raw = removeScale(raw, sf);
    }
    const words = Number(src.length || 1);
    const wo = src.wordOrder || this.wordOrder;
    const bo = src.byteOrder || this.byteOrder;
    const buf = valueToBuffer(raw, src.dataType, words * 2);
    const regs = bufferToRegs(buf, wo, bo);
    const addr = this._addr(src);
    const unitId = this._sourceUnitId(src);
    return { dp, src, raw, words, regs, addr, unitId };
  }

  _sungrowProfileKey(cfg, fallback = '') {
    const trigger = String(cfg?.triggerDpId || (Array.isArray(cfg?.triggerDpIds) ? cfg.triggerDpIds.join(',') : '') || fallback || '').trim();
    const mode = String(cfg?.modeDpId || '').trim();
    const command = String(cfg?.commandDpId || cfg?.chargeDischargeCommandDpId || '').trim();
    const power = String(cfg?.powerDpId || cfg?.chargeDischargePowerDpId || '').trim();
    // Key the physical helper path, not only the public trigger datapoint.  The
    // hybrid template exposes signed/charge-only/discharge-only public DPs that all
    // share the same Sungrow helper registers; EMS mode should be cached across them.
    const physical = `${mode}|${command}|${power}`;
    return physical.replace(/\|/g, '') ? physical : trigger;
  }

  async _maybeWriteSungrowModeIfNeeded(cfg, modeValue) {
    const modeDpId = String(cfg?.modeDpId || '').trim();
    if (!modeDpId || modeValue === undefined || modeValue === null) return false;

    const strategy = String(cfg?.modeWriteStrategy || cfg?.modeStrategy || '').toLowerCase();
    const writeEveryCommand = cfg?.modeWriteEveryCommand === true || cfg?.writeModeEveryCommand === true || strategy === 'always';
    const writeOnce = cfg?.modeWriteOnce === true || strategy === 'once';
    const minRaw = Number(cfg?.modeWriteMinIntervalMs ?? cfg?.modeMinIntervalMs ?? cfg?.modeRefreshIntervalMs ?? 60000);
    const minMs = writeEveryCommand ? 0 : (Number.isFinite(minRaw) && minRaw > 0 ? Math.trunc(minRaw) : 60000);
    const key = this._sungrowProfileKey(cfg, modeDpId);
    const now = Date.now();
    const last = Number(this._sungrowModeLastWriteAt && this._sungrowModeLastWriteAt.get(key) || 0);

    if (!writeEveryCommand) {
      if (writeOnce && last > 0) return true;
      if (last > 0 && minMs > 0 && (now - last) < minMs) return true;
    }

    await this._writeDatapointById(modeDpId, modeValue);
    if (this._sungrowModeLastWriteAt) this._sungrowModeLastWriteAt.set(key, Date.now());
    try { this.adapter.log.debug(`[${this.device?.id || 'modbus'}] Sungrow EMS mode ensured: ${modeDpId}=${modeValue}`); } catch (_) {}
    return true;
  }

  async _maybeWriteSungrowCommandPowerBlock(cfg, commandValue, powerValue) {
    if (!cfg || cfg.blockWrite === false) return false;
    if (cfg.blockCommandPower === false || cfg.blockCommandPowerOnly === false) return false;
    const commandDpId = String(cfg.commandDpId || cfg.chargeDischargeCommandDpId || '').trim();
    const powerDpId = String(cfg.powerDpId || cfg.chargeDischargePowerDpId || '').trim();
    if (!commandDpId || !powerDpId) return false;

    let commandEnc;
    let powerEnc;
    try {
      commandEnc = this._encodeSungrowWriteValue(commandDpId, commandValue);
      powerEnc = this._encodeSungrowWriteValue(powerDpId, powerValue);
    } catch (e) {
      try { this.adapter.log.debug(`[${this.device?.id || 'modbus'}] Sungrow command/power FC16 block unavailable; falling back to individual writes. ${e && e.message ? e.message : e}`); } catch (_) {}
      return false;
    }

    const unitId = this._operationUnitId(commandEnc.unitId);
    if (this._operationUnitId(powerEnc.unitId) !== unitId) return false;
    if (![6, 16].includes(Number(commandEnc.src.fc)) || ![6, 16].includes(Number(powerEnc.src.fc))) return false;
    if (!Number.isFinite(commandEnc.addr) || !Number.isFinite(powerEnc.addr)) return false;

    const start = Math.min(commandEnc.addr, powerEnc.addr);
    const end = Math.max(commandEnc.addr + commandEnc.words - 1, powerEnc.addr + powerEnc.words - 1);
    const totalWords = end - start + 1;
    const maxWords = Number(cfg.commandPowerBlockMaxWords ?? cfg.blockCommandPowerMaxWords ?? cfg.blockMaxWords ?? 4);
    if (!Number.isFinite(totalWords) || totalWords <= 0 || totalWords > maxWords) return false;

    // Avoid accidentally writing over undocumented gaps. For Sungrow hybrid V1.1.11
    // this is exactly 13051..13052 (two U16 registers).
    if (cfg.requireContiguousCommandPower !== false) {
      const usedWords = Number(commandEnc.words || commandEnc.regs.length || 0) + Number(powerEnc.words || powerEnc.regs.length || 0);
      if (usedWords !== totalWords) return false;
    }

    const regs = Array(totalWords).fill(0);
    const place = (enc) => {
      const off = enc.addr - start;
      for (let i = 0; i < enc.regs.length; i++) regs[off + i] = enc.regs[i];
    };
    place(commandEnc);
    place(powerEnc);

    try {
      await this._mbWriteRegisters(start, regs, unitId);
      try { this.adapter.log.debug(`[${this.device?.id || 'modbus'}] Sungrow command/power FC16 block written: UID${unitId} @${start} len=${regs.length} command=${commandValue}, power=${powerValue}`); } catch (_) {}
      return true;
    } catch (e) {
      if (isTransportError(e) || (!isModbusIllegalAddressOrValue(e) && !isModbusProtocolException(e))) throw e;
      try { this.adapter.log.debug(`[${this.device?.id || 'modbus'}] Sungrow command/power FC16 block rejected; falling back to individual writes. ${e && e.message ? e.message : e}`); } catch (_) {}
      return false;
    }
  }

  async _maybeWriteSungrowControlBlock(cfg, modeValue, commandValue, powerValue) {
    if (!cfg || cfg.blockWrite === false || cfg.blockModeCommandPower === false) return false;
    const modeDpId = String(cfg.modeDpId || '').trim();
    const commandDpId = String(cfg.commandDpId || cfg.chargeDischargeCommandDpId || '').trim();
    const powerDpId = String(cfg.powerDpId || cfg.chargeDischargePowerDpId || '').trim();
    if (!modeDpId || !commandDpId || !powerDpId) return false;
    if (modeValue === undefined || modeValue === null) return false;

    let modeEnc;
    let commandEnc;
    let powerEnc;
    try {
      modeEnc = this._encodeSungrowWriteValue(modeDpId, modeValue);
      commandEnc = this._encodeSungrowWriteValue(commandDpId, commandValue);
      powerEnc = this._encodeSungrowWriteValue(powerDpId, powerValue);
    } catch (e) {
      try { this.adapter.log.debug(`[${this.device?.id || 'modbus'}] Sungrow FC16 control block unavailable; falling back to individual writes. ${e && e.message ? e.message : e}`); } catch (_) {}
      return false;
    }

    const unitId = this._operationUnitId(modeEnc.unitId);
    if (this._operationUnitId(commandEnc.unitId) !== unitId || this._operationUnitId(powerEnc.unitId) !== unitId) return false;
    if (![6, 16].includes(Number(modeEnc.src.fc)) || ![6, 16].includes(Number(commandEnc.src.fc)) || ![6, 16].includes(Number(powerEnc.src.fc))) return false;
    if (!Number.isFinite(modeEnc.addr) || !Number.isFinite(commandEnc.addr) || !Number.isFinite(powerEnc.addr)) return false;

    const start = Math.min(modeEnc.addr, commandEnc.addr, powerEnc.addr);
    const end = Math.max(modeEnc.addr + modeEnc.words - 1, commandEnc.addr + commandEnc.words - 1, powerEnc.addr + powerEnc.words - 1);
    const totalWords = end - start + 1;
    const maxWords = Number(cfg.blockMaxWords ?? 8);
    if (!Number.isFinite(totalWords) || totalWords <= 0 || totalWords > maxWords) return false;

    const regs = Array(totalWords).fill(0);
    const place = (enc) => {
      const off = enc.addr - start;
      for (let i = 0; i < enc.regs.length; i++) regs[off + i] = enc.regs[i];
    };
    place(modeEnc);
    place(commandEnc);
    place(powerEnc);

    try {
      await this._mbWriteRegisters(start, regs, unitId);
      try { this.adapter.log.debug(`[${this.device?.id || 'modbus'}] Sungrow FC16 control block written: UID${unitId} @${start} len=${regs.length} mode=${modeValue}, command=${commandValue}, power=${powerValue}`); } catch (_) {}
      return true;
    } catch (e) {
      if (isTransportError(e) || (!isModbusIllegalAddressOrValue(e) && !isModbusProtocolException(e))) throw e;
      try { this.adapter.log.debug(`[${this.device?.id || 'modbus'}] Sungrow FC16 control block rejected; falling back to individual writes. ${e && e.message ? e.message : e}`); } catch (_) {}
      return false;
    }
  }

  async _clampSungrowSignedPowerW(cfg, signedPowerW, commandValue, chargeValue, dischargeValue) {
    if (!cfg || cfg.clampToLimitDp === false) return signedPowerW;
    const n = Number(signedPowerW);
    if (!Number.isFinite(n) || n === 0) return signedPowerW;

    const isCharge = Number(commandValue) === Number(chargeValue);
    const isDischarge = Number(commandValue) === Number(dischargeValue);
    const limitDpId = isCharge
      ? String(cfg.maxChargePowerDpId || cfg.chargeLimitDpId || '').trim()
      : isDischarge
        ? String(cfg.maxDischargePowerDpId || cfg.dischargeLimitDpId || '').trim()
        : '';
    if (!limitDpId) return signedPowerW;

    const limit = await this._getDpStateNumber(limitDpId);
    if (!Number.isFinite(limit) || limit <= 0) return signedPowerW;
    const abs = Math.abs(Math.round(n));
    if (abs <= limit) return signedPowerW;

    const clamped = Math.round(limit) * (n < 0 ? -1 : 1);
    try { this.adapter.log.debug(`[${this.device?.id || 'modbus'}] Sungrow setpoint ${abs} W exceeds ${limitDpId}=${limit} W; clamped to ${Math.abs(clamped)} W.`); } catch (_) {}
    return clamped;
  }

  async _maybeWriteSungrowSignedPowerControl(dp, value) {
    const cfg = this._getSungrowSignedPowerControlForDp(dp && dp.id);
    if (!cfg) return false;

    const currentDpId = String(dp && dp.id ? dp.id : '');
    const powerDpId = String(cfg.powerDpId || cfg.chargeDischargePowerDpId || '').trim();
    const commandDpId = String(cfg.commandDpId || cfg.chargeDischargeCommandDpId || '').trim();
    if (!powerDpId || !commandDpId) throw new Error('Sungrow signed power control requires commandDpId and powerDpId');
    if (powerDpId === currentDpId || commandDpId === currentDpId) {
      throw new Error(`Sungrow signed power control must use helper datapoints different from trigger ${currentDpId}`);
    }

    let signedPowerW = Number(value);
    if (!Number.isFinite(signedPowerW)) throw new Error(`Invalid Sungrow power setpoint: ${value}`);

    const deadbandWRaw = Number(cfg.zeroDeadbandW ?? cfg.deadbandW ?? 0);
    const deadbandW = Number.isFinite(deadbandWRaw) && deadbandWRaw > 0 ? deadbandWRaw : 0;
    let roundedW = Math.round(signedPowerW);
    let absW = Math.abs(roundedW);

    const positiveIsCharge = cfg.positiveIsCharge === true;
    let isStop = absW <= deadbandW;
    const chargeValue = Number(cfg.chargeValue ?? 0xAA);
    const dischargeValue = Number(cfg.dischargeValue ?? 0xBB);
    const stopValue = Number(cfg.stopValue ?? 0xCC);
    const modeValue = cfg.modeValue;

    // Direction handling:
    // - default/signed: one signed setpoint (+W discharge, -W charge by default)
    // - fixed charge/discharge: EMS can map a simple positive chargePowerW or dischargePowerW
    //   datapoint and the driver still writes the Sungrow command+power register pair.
    const directionMode = String(cfg.direction || cfg.fixedDirection || cfg.powerDirection || cfg.commandDirection || '').toLowerCase().replace(/[\s_-]+/g, '');
    const fixedCharge = ['charge', 'charging', 'batcharge', 'batterycharge'].includes(directionMode);
    const fixedDischarge = ['discharge', 'discharging', 'batdischarge', 'batterydischarge'].includes(directionMode);
    const fixedStop = ['stop', 'off', 'zero'].includes(directionMode);

    let commandValue;
    if (fixedStop) {
      isStop = true;
      commandValue = stopValue;
      roundedW = 0;
      absW = 0;
    } else if (fixedCharge || fixedDischarge) {
      // Treat the fixed-direction datapoints as absolute W inputs. Negative user input is
      // accepted but normalized to its magnitude so EMS integrations do not need to know
      // Sungrow's separate direction register.
      absW = Math.abs(roundedW);
      isStop = absW <= deadbandW;
      commandValue = isStop ? stopValue : (fixedCharge ? chargeValue : dischargeValue);
      if (!isStop) {
        const signedForLimit = fixedCharge
          ? (positiveIsCharge ? absW : -absW)
          : (positiveIsCharge ? -absW : absW);
        const clampedSigned = await this._clampSungrowSignedPowerW(cfg, signedForLimit, commandValue, chargeValue, dischargeValue);
        absW = Math.abs(Math.round(Number(clampedSigned)));
        isStop = absW <= deadbandW;
        if (isStop) commandValue = stopValue;
      }
    } else if (isStop) {
      commandValue = stopValue;
    } else {
      const wantsCharge = positiveIsCharge ? (roundedW > 0) : (roundedW < 0);
      commandValue = wantsCharge ? chargeValue : dischargeValue;
      const clampedSigned = await this._clampSungrowSignedPowerW(cfg, roundedW, commandValue, chargeValue, dischargeValue);
      roundedW = Math.round(Number(clampedSigned));
      absW = Math.abs(roundedW);
      isStop = absW <= deadbandW;
      if (isStop) commandValue = stopValue;
    }

    const powerValue = (!isStop || cfg.writePowerOnStop !== false) ? absW : 0;
    const heartbeatValue = this._nextSungrowHeartbeatValue(cfg);

    // Sungrow hybrid protocol V1.1.11: EMS receives one signed power datapoint from
    // Nexowatt/EOS, while the inverter expects several protocol registers. Keep this
    // complexity in the device adapter. Prefer a single contiguous FC16 write over
    // 13050..13052 when the template opts into it. This avoids a slow sequence of
    // mode write -> command/power write and prevents the inverter from briefly seeing
    // a stale charge/discharge command while the next register is still queued.
    let blockOk = false;
    const preferFullControlBlock = (cfg.blockModeCommandPower === true && cfg.blockCommandPowerOnly !== true);

    if (preferFullControlBlock) {
      blockOk = await this._maybeWriteSungrowControlBlock(cfg, modeValue, commandValue, powerValue);
    }

    // Fallback / alternate profile: ensure EMS mode separately, then write only
    // command+power together over 13051..13052.
    if (!blockOk) {
      await this._maybeWriteSungrowModeIfNeeded(cfg, modeValue);

      if (cfg.blockCommandPower !== false && cfg.blockCommandPowerOnly !== false) {
        blockOk = await this._maybeWriteSungrowCommandPowerBlock(cfg, commandValue, powerValue);
      }
    }

    // Last-resort fallback: individual helper writes. Write power before command so
    // devices that latch on command edge do not reuse an older power value.
    if (!blockOk) {
      if (!isStop || cfg.writePowerOnStop !== false) {
        await this._writeDatapointById(powerDpId, powerValue);
      }
      await this._writeDatapointById(commandDpId, commandValue);
    }

    // Newer/high-power Sungrow hybrid profiles expose a wide-range power helper in
    // addition to the original 13052-style register.  Write it best-effort with the
    // same command value so SHxxT/MG profiles do not silently ignore high setpoints.
    const widePowerMode = String(cfg.widePowerWriteMode || cfg.powerWideWriteMode || '').toLowerCase();
    const widePowerDisabled = cfg.writeWidePower === false || cfg.autoWriteWidePower === false || widePowerMode === 'never' || widePowerMode === 'off' || widePowerMode === 'disabled';
    const widePowerDpId = widePowerDisabled ? '' : String(cfg.widePowerDpId || cfg.powerWideDpId || cfg.chargeDischargePowerWideDpId || '').trim();
    if (widePowerDpId && (!isStop || cfg.writePowerOnStop !== false) && widePowerDpId !== powerDpId) {
      await this._writeDatapointByIdOptional(widePowerDpId, powerValue, 'wide power');
      if (cfg.repeatCommandAfterWidePower !== false) {
        await this._writeDatapointByIdOptional(commandDpId, commandValue, 'command after wide power');
      }
    }

    // Optional heartbeat refresh for External EMS/VPP modes.  Sungrow expects a
    // timeout value in seconds (normally 20), not a monotonically increasing counter.
    // Write it after mode/command/power so a device that only accepts the heartbeat
    // while already in External EMS/VPP mode still receives it immediately.
    await this._maybeWriteSungrowHeartbeat(cfg, heartbeatValue);

    return true;
  }


  _isKebaP40Profile() {
    const tplIdLower = String((this.template && this.template.id) || this.device?.templateId || this.device?.template || '').toLowerCase();
    const mfrLower = String((this.template && this.template.manufacturer) || this.device?.manufacturer || this.device?.vendor || '').toLowerCase();
    const modelLower = String((this.template && this.template.model) || this.device?.model || '').toLowerCase();
    return (mfrLower === 'keba' || tplIdLower.includes('keba')) && (tplIdLower.includes('p40') || modelLower.includes('p40') || tplIdLower.includes('evcskebamodbusimpl'));
  }

  async _maybePrepareKebaP40Write(dp) {
    if (!this._isKebaP40Profile()) return;
    const dpId = String(dp && dp.id ? dp.id : '');
    if (dpId !== 'sET_TRIGGER_PHASE_SWITCH') return;

    const hints = (this.template && this.template.driverHints && this.template.driverHints.keba) || {};
    if (hints.phaseSwitchPrewriteSource === false) return;

    const sourceDp = this._getTemplateDpById('sET_PHASE_SWITCH_SOURCE');
    if (!sourceDp || !(sourceDp.rw === 'rw' || sourceDp.rw === 'wo')) return;

    // KEBA P40 requires phase-switch source register 5050 to be set to 3 (Modbus)
    // before register 5052 can trigger 1-/3-phase switching. Registers 5050/5052
    // are firmware-dependent, so an unsupported pre-write must not break a direct
    // 5052 command if the source is already configured on the charger.
    try {
      await this.writeDatapoint(sourceDp, 3);
    } catch (e) {
      if (!isModbusIllegalAddressOrValue(e)) throw e;
      try {
        this.adapter.log.debug(`[${this.device?.id || 'modbus'}] KEBA P40 phase-switch source pre-write was rejected; continuing with trigger command. ${e && e.message ? e.message : e}`);
      } catch (_) {}
    }
  }

  _isDepowerV1003ControlProfile() {
    if (!this._depowerV1003 || typeof this._depowerV1003 !== 'object') return false;
    if (this._depowerV1003.controlSequenceEnabled === false) return false;
    const tplId = String((this.template && this.template.id) || this.device?.templateId || '').toLowerCase();
    const manufacturer = String((this.template && this.template.manufacturer) || this.device?.manufacturer || '').toLowerCase();
    return manufacturer === 'depower' || tplId.includes('evcs.oem.modbusv1003.connector');
  }

  _getDepowerV1003ControlConfig() {
    if (!this._isDepowerV1003ControlProfile()) return null;
    const cfg = this._depowerV1003 || {};
    const connectorRaw = Number(cfg.connector ?? 1);
    const connector = Number.isFinite(connectorRaw) && connectorRaw >= 1 ? Math.trunc(connectorRaw) : 1;
    const delayRaw = Number(cfg.prepareRearmDelayMs ?? cfg.stopStartDelayMs ?? 500);
    const cooldownRaw = Number(cfg.prepareRearmCooldownMs ?? cfg.rearmCooldownMs ?? 5000);
    return {
      connector,
      chargeModeDpId: String(cfg.chargeModeDpId || 'cHARGE_MODE'),
      chargeModeValue: Number(cfg.chargeModeValue ?? 1),
      gunCountDpId: String(cfg.gunCountDpId || 'gUN_COUNT'),
      stationPowerDpId: String(cfg.stationPowerDpId || 'cHARGE_POINT_SET_POWER'),
      connectorPowerDpId: String(cfg.connectorPowerDpId || 'eV_SET_CHARGE_POWER_LIMIT'),
      chargeCommandDpId: String(cfg.chargeCommandDpId || 'cHARGE_COMMAND'),
      connectorStateDpId: String(cfg.connectorStateDpId || 'eVSE_STATE'),
      plugStateDpId: String(cfg.plugStateDpId || 'pLUG_STATE'),
      startValue: Number(cfg.startValue ?? 1),
      stopValue: Number(cfg.stopValue ?? 2),
      ensureChargeMode: cfg.ensureChargeMode !== false,
      initializeStationPowerWhenZero: cfg.initializeStationPowerWhenZero !== false,
      stationPowerSingleConnectorOnly: cfg.stationPowerSingleConnectorOnly !== false,
      rearmPrepareWithStopStart: cfg.rearmPrepareWithStopStart !== false,
      prepareRearmDelayMs: Number.isFinite(delayRaw) && delayRaw >= 0 ? Math.trunc(delayRaw) : 500,
      prepareRearmCooldownMs: Number.isFinite(cooldownRaw) && cooldownRaw >= 0 ? Math.trunc(cooldownRaw) : 5000,
    };
  }

  async _getDeviceStateValue(relativeSuffix) {
    const suffix = String(relativeSuffix || '').trim();
    if (!suffix) return undefined;
    try {
      const fullId = `${this.adapter.namespace}.devices.${this.device.id}.${suffix}`;
      const state = await this.adapter.getStateAsync(fullId);
      if (!state || state.val === null || state.val === undefined) return undefined;
      return state.val;
    } catch (_) {
      return undefined;
    }
  }

  _toDepowerBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return value !== 0;
    if (typeof value === 'string') {
      const text = value.trim().toLowerCase();
      if (['true', '1', 'on', 'an', 'start', 'enabled', 'enable'].includes(text)) return true;
      if (['false', '0', '2', 'off', 'aus', 'stop', 'disabled', 'disable'].includes(text)) return false;
    }
    return undefined;
  }

  async _resolveDepowerRunDesired(cfg) {
    if (typeof this._depowerDesiredRun === 'boolean') return this._depowerDesiredRun;

    for (const suffix of ['aliases.v1.ctrl.run', 'aliases.ctrl.run', 'aliases.ctrl.chargeEnable']) {
      const parsed = this._toDepowerBoolean(await this._getDeviceStateValue(suffix));
      if (typeof parsed === 'boolean') return parsed;
    }

    const raw = await this._getDpStateNumber(cfg.chargeCommandDpId);
    if (Number.isFinite(raw)) {
      if (Math.trunc(raw) === Math.trunc(cfg.startValue)) return true;
      if (Math.trunc(raw) === Math.trunc(cfg.stopValue)) return false;
    }
    return undefined;
  }

  async _resolveDepowerPowerDesired(cfg) {
    if (Number.isFinite(this._depowerDesiredPowerW)) return Math.max(0, Math.round(this._depowerDesiredPowerW));

    for (const suffix of ['aliases.v1.ctrl.powerLimitW', 'aliases.ctrl.powerLimitW']) {
      const value = await this._getDeviceStateValue(suffix);
      const number = Number(value);
      if (Number.isFinite(number) && number >= 0) return Math.round(number);
    }

    const raw = await this._getDpStateNumber(cfg.connectorPowerDpId);
    return Number.isFinite(raw) && raw >= 0 ? Math.round(raw) : undefined;
  }

  async _writeDepowerHelper(dpId, value) {
    const target = this._getTemplateDpById(dpId);
    if (!target) throw new Error(`DEPower control datapoint not found: ${dpId}`);
    if (!(target.rw === 'rw' || target.rw === 'wo')) throw new Error(`DEPower control datapoint is not writable: ${dpId}`);
    await this.writeDatapoint(target, value, { depowerRegisterWrite: true });
  }

  async _prepareDepowerV1003Control(cfg, powerW) {
    if (cfg.ensureChargeMode) {
      await this._writeDepowerHelper(cfg.chargeModeDpId, cfg.chargeModeValue);
    }

    let stationPowerInitialized = false;
    if (cfg.initializeStationPowerWhenZero && Number.isFinite(powerW) && powerW > 0) {
      const currentStationPower = await this._getDpStateNumber(cfg.stationPowerDpId);
      const gunCount = await this._getDpStateNumber(cfg.gunCountDpId);
      const mayInitialize = !cfg.stationPowerSingleConnectorOnly || (Number.isFinite(gunCount) && Math.trunc(gunCount) === 1);

      // A positive station-wide value is treated as an intentional local/site limit and
      // is never raised by NexoWatt. Only the undocumented/default 0 value is initialized,
      // and only for a confirmed single-connector station, so dual-connector power sharing
      // is not disturbed by one connector instance.
      if (mayInitialize && (!Number.isFinite(currentStationPower) || currentStationPower <= 0)) {
        await this._writeDepowerHelper(cfg.stationPowerDpId, Math.round(powerW));
        stationPowerInitialized = true;
      }
    }

    return { stationPowerInitialized };
  }

  async _maybeWriteDepowerV1003Control(dp, value) {
    const cfg = this._getDepowerV1003ControlConfig();
    if (!cfg) return false;

    const id = String(dp && dp.id || '');
    if (id !== cfg.connectorPowerDpId && id !== cfg.chargeCommandDpId) return false;
    // A shared recursion-depth flag also bypassed coordination for unrelated
    // concurrent calls. Serialize whole control sequences; only helper writes
    // explicitly bypass this queue.
    const run = () => this._executeDepowerV1003Control(cfg, dp, value);
    const pending = this._depowerControlQueue.then(run, run);
    this._depowerControlQueue = pending.catch(() => {});
    return pending;
  }

  async _executeDepowerV1003Control(cfg, dp, value) {
    const dpId = String(dp && dp.id || '');
    const isPowerCommand = dpId === cfg.connectorPowerDpId;
    const isRunCommand = dpId === cfg.chargeCommandDpId;
    if (!isPowerCommand && !isRunCommand) return false;

    const src = getWriteSource(dp);
    if (!src) throw new Error(`DEPower datapoint ${dpId} has no write source`);
    let normalized = applyWriteValueConstraints(value, src, dpId);
    if (typeof normalized === 'string' && normalized.trim() !== '') normalized = Number(normalized);
    if (!Number.isFinite(Number(normalized))) throw new Error(`Invalid DEPower control value for ${dpId}: ${value}`);
    normalized = Math.round(Number(normalized));

    if (isPowerCommand) this._depowerDesiredPowerW = Math.max(0, normalized);
    if (isRunCommand) this._depowerDesiredRun = normalized === Math.trunc(cfg.startValue);

    if (isRunCommand && normalized === Math.trunc(cfg.stopValue)) {
      await this._writeDepowerHelper(cfg.chargeCommandDpId, cfg.stopValue);
      return { effectiveValue: normalized };
    }

    const desiredPowerW = isPowerCommand
      ? Math.max(0, normalized)
      : await this._resolveDepowerPowerDesired(cfg);
    const desiredRun = isRunCommand
      ? normalized === Math.trunc(cfg.startValue)
      : await this._resolveDepowerRunDesired(cfg);

    const prep = await this._prepareDepowerV1003Control(cfg, desiredPowerW);

    // The connector limit must be present before the Start edge. This also makes a
    // later power command self-healing when the initial Start arrived while the station
    // was still in its default/Prepare mode.
    if (Number.isFinite(desiredPowerW)) {
      await this._writeDepowerHelper(cfg.connectorPowerDpId, Math.max(0, Math.round(desiredPowerW)));
    }

    if (desiredRun === true && Number.isFinite(desiredPowerW) && desiredPowerW > 0) {
      const connectorState = await this._getDpStateNumber(cfg.connectorStateDpId);
      const plugState = await this._getDpStateNumber(cfg.plugStateDpId);
      const inPrepare = Number.isFinite(connectorState) && Math.trunc(connectorState) === 1;
      const vehiclePresent = !Number.isFinite(plugState) || Math.trunc(plugState) === 1;
      const now = Date.now();
      const rearmDue = !cfg.prepareRearmCooldownMs || !this._depowerLastPrepareRearmAt ||
        (now - this._depowerLastPrepareRearmAt) >= cfg.prepareRearmCooldownMs;

      if (cfg.rearmPrepareWithStopStart && inPrepare && vehiclePresent && rearmDue) {
        // Some DEPower firmware keeps Charge command=1 as a level while remaining in
        // Prepare. A deliberate 2 -> 1 edge after mode and power are valid re-arms the
        // connector without touching an already active charging session.
        await this._writeDepowerHelper(cfg.chargeCommandDpId, cfg.stopValue);
        if (cfg.prepareRearmDelayMs > 0) await sleep(cfg.prepareRearmDelayMs);
        await this._writeDepowerHelper(cfg.chargeCommandDpId, cfg.startValue);
        this._depowerLastPrepareRearmAt = Date.now();
        try {
          this.adapter.log.info(
            `[${this.device?.id || 'modbus'}] DEPower connector ${cfg.connector} re-armed from Prepare: ` +
            `chargeMode=${cfg.chargeModeValue}, connectorPower=${Math.round(desiredPowerW)} W, ` +
            `${prep.stationPowerInitialized ? `stationPower initialized=${Math.round(desiredPowerW)} W, ` : ''}` +
            `command=${cfg.stopValue}->${cfg.startValue}.`,
          );
        } catch (_) {}
      } else if (!Number.isFinite(connectorState) || Math.trunc(connectorState) !== 2) {
        // For Idle/Suspended/unknown state, re-send Start after the prerequisites.
        // Do not send it while state=Charging to avoid unnecessary command traffic.
        await this._writeDepowerHelper(cfg.chargeCommandDpId, cfg.startValue);
      }
    }

    return { effectiveValue: normalized };
  }

  async writeDatapoint(dp, value, options = {}) {
    let writeContext = null;

    const setWriteContext = (src, fc, addr, raw, words, unitId) => {
      writeContext = {
        dpId: String(dp?.id || ''),
        fc: Number(fc),
        unitId: this._operationUnitId(unitId ?? this._sourceUnitId(src)),
        address: Number(addr),
        templateAddress: Number(src?.address),
        length: Number(words || src?.length || 1),
        value: raw,
      };
    };

    const annotateWriteError = (err) => {
      if (!err || typeof err !== 'object') return err;
      try { err.nexowattOperation = 'write'; } catch (_) {}
      try { err.nexowattDpId = String(dp?.id || ''); } catch (_) {}
      if (writeContext && !err._nexowattWriteContextAnnotated) {
        const ctx = `Write ${writeContext.dpId || 'datapoint'} UID${writeContext.unitId} FC${writeContext.fc}@${writeContext.address}` +
          ` len=${writeContext.length}` +
          (Number.isFinite(writeContext.templateAddress) ? ` templateAddress=${writeContext.templateAddress}` : '') +
          ` value=${writeContext.value}`;
        try { err.message = `${ctx} failed: ${err.message || String(err)}`; } catch (_) {}
        try { err._nexowattWriteContextAnnotated = true; } catch (_) {}
      }
      return err;
    };

    const attempt = async () => {
      await this.ensureConnected();

      if (await this._maybeWriteSungrowSignedPowerControl(dp, value)) return;

      // DEPower AC/DC control requires a coordinated sequence instead of independent
      // writes. Only explicit internal register writes bypass the sequence queue.
      if (!options.depowerRegisterWrite) {
        const depowerResult = await this._maybeWriteDepowerV1003Control(dp, value);
        if (depowerResult) return depowerResult;
      }

      const src = getWriteSource(dp);
      if (!src) throw new Error('Datapoint has no Modbus write source');

      await this._maybePrepareKebaP40Write(dp);

      // SunSpec: resolve model map (ID -> start offset) so writes can compute absolute addresses.
      if (src.sunspecModel !== undefined && src.sunspecModel !== null) {
        try { await this._maybeScanSunSpecModels(); } catch (_) {}
      }

      // Some devices require an explicit unlock step before accepting write commands.
      // This is enabled via template driverHints.modbus.writeUnlock.
      await this._maybeUnlockForWrite(src);

      const fc = Number(src.fc);
      const addr = this._addr(src);
      const unitId = this._sourceUnitId(src);
      if (!Number.isFinite(addr)) {
        throw new Error(`Invalid Modbus address (SunSpec model missing?) for datapoint ${dp?.id || ''}`);
      }

      // Optional safety check for movable OpenEMS/FENECON write-access blocks.
      // The write is performed only when the component header still identifies
      // the documented component at the expected address.
      await this._maybeVerifyWriteComponentId(dp, src, unitId);

      // Alfen is handled by a dedicated adaptive control writer below.
      // Do not let the simple probe suppress the alternate ACE control address
      // before we have tested it.
      if (!this._isAlfenProfile) {
        await this._maybeProbeAlfenControlBeforeWrite(dp, src, addr, Number(src.length || 1), unitId);
      }

      if (fc === 5) {
        setWriteContext(src, fc, addr, value, 1, unitId);
        await this._mbWriteCoil(addr, !!value, unitId);
        return;
      }

      if (fc === 15) {
        // Write multiple coils (we support single-coil use as well)
        setWriteContext(src, fc, addr, value, 1, unitId);
        await this._mbWriteCoils(addr, [!!value], unitId);
        return;
      }

      // Prepare numeric value for register writes
      let raw = value;
      if (typeof raw === 'string' && raw.trim() !== '') {
        // allow numeric strings
        const n = Number(raw);
        if (!Number.isNaN(n)) raw = n;
      }

      // Optional explicit boolean value mapping (e.g. Sungrow 0xAA/0x55 switches).
      if (typeof raw === 'boolean') {
        const parseBoolMap = (x) => {
          if (x === null || x === undefined) return undefined;
          if (typeof x === 'number' && Number.isFinite(x)) return x;
          if (typeof x === 'string') {
            const st = x.trim().toLowerCase();
            if (!st) return undefined;
            if (st.startsWith('0x')) {
              const n = parseInt(st, 16);
              return Number.isFinite(n) ? n : undefined;
            }
            const n = Number(st);
            return Number.isFinite(n) ? n : undefined;
          }
          return undefined;
        };
        const trueValue = parseBoolMap(src.trueValue ?? src.onValue ?? src.enableValue ?? src.valueTrue);
        const falseValue = parseBoolMap(src.falseValue ?? src.offValue ?? src.disableValue ?? src.valueFalse);
        if (raw === true && trueValue !== undefined) raw = trueValue;
        if (raw === false && falseValue !== undefined) raw = falseValue;
      }

      // Validate/map before scaling (template constraints are expressed in user/device engineering units).
      raw = applyWriteValueConstraints(raw, src, dp?.id);

      // Undo scaling for write direction (Channel -> Element)
      if (typeof raw === 'number') {
        const sf = this._getScaleFactor(src);
        if (sf) raw = removeScale(raw, sf);
      }

      const wo = src.wordOrder || this.wordOrder;
      const bo = src.byteOrder || this.byteOrder;

      // --- Special case: SolaX VPP Mode 4 requires a single FC16 multi-write starting at 0x00A0 ---
      // The V1.4 VPP protocol doc says *all* mode parameters must be written starting at 0x00A0
      // with a mode-specific length (for mode 4: 5 registers = 0xA0..0xA4). Writing only 0xA1/0xA3
      // individually may be ignored by newer firmware.
      const vpp4 = this._solaxVppMode4;
      const triggerId = (vpp4 && vpp4.triggerDpId) ? String(vpp4.triggerDpId) : 'sET_ACTIVE_POWER';
      if (
        fc === 16 &&
        vpp4 && vpp4.enabled === true &&
        String(dp?.id) === triggerId
      ) {
        const startAddress = Number(vpp4.startAddress ?? 160);
        const modeNum = Number(vpp4.modeNum ?? 4);
        const execDpId = (vpp4.execDurationDpId || 'vPP_WAIT_TIMEOUT').toString();
        const nextDpId = (vpp4.nextMotionDpId || 'vPP_NEXT_MOTION').toString();

        // Defaults (used if state values are not available / invalid)
        const defaultExec = Number(vpp4.defaultExecDuration ?? 600);
        const defaultNext = Number(vpp4.defaultNextMotion ?? 160);

        // Optional per-device overrides via existing datapoint states
        let execDuration = await this._getDpStateNumber(execDpId);
        if (!Number.isFinite(execDuration) || execDuration <= 0) execDuration = defaultExec;
        execDuration = Math.round(execDuration);
        if (execDuration < 0) execDuration = 0;
        if (execDuration > 0xFFFF) execDuration = 0xFFFF;

        let nextMotion = await this._getDpStateNumber(nextDpId);
        if (!Number.isFinite(nextMotion) || nextMotion <= 0) nextMotion = defaultNext;
        nextMotion = Math.round(nextMotion);
        // Valid values per VPP protocol: 0x00A0 (exit VPP) or 0x00A1 (switch to default VPP mode 6)
        if (nextMotion !== 0x00A0 && nextMotion !== 0x00A1) nextMotion = defaultNext;

        // SolaX VPP Mode 4: BatWTarget is an S32. Ensure integer W.
        const powerW = Math.round(Number(raw) || 0);

        // Build register block: [VPPModeNum, BatWTarget_L, BatWTarget_H, ExecDuration, NextMotion]
        const blockRegs = [];
        blockRegs.push(...bufferToRegs(valueToBuffer(modeNum, 'uint16', 2), wo, bo));
        blockRegs.push(...bufferToRegs(valueToBuffer(powerW, 'int32', 4), wo, bo));
        blockRegs.push(...bufferToRegs(valueToBuffer(execDuration, 'uint16', 2), wo, bo));
        blockRegs.push(...bufferToRegs(valueToBuffer(nextMotion, 'uint16', 2), wo, bo));

        const blockAddr = this._addr({ address: startAddress });
        await this._mbWriteRegisters(blockAddr, blockRegs, unitId);
        return;
      }


      // --- Special case: SolaX VPP Mode 8 requires a single FC16 multi-write starting at 0x00A0 ---
      // Mode 8: PV&BAT Individual Setting - Duration Mode
      // The V1.4 VPP protocol doc says *all* mode parameters must be written starting at 0x00A0
      // with a mode-specific length (for mode 8: 8 registers = 0xA0..0xA7). Writing only 0xA2/0xA4
      // individually may be ignored by newer firmware.
      const vpp8 = this._solaxVppMode8;

      // VPP8 should behave like our VPP4 handling: writing a single "main" setpoint datapoint
      // commits *all* required VPP parameters in one FC16 block write.
      //
      // For mode 8 we support BOTH setpoints as triggers:
      //  - PV power target (default dpId: sET_PV_POWER)
      //  - Battery power target (default dpId: vPP8_BATTERY_POWER_TARGET)
      //
      // This keeps EMS integration simple (you can update either PV or BAT with a single write).
      const pvTargetDpId = (vpp8 && (vpp8.pvTargetDpId || vpp8.pvWTargetDpId))
        ? String(vpp8.pvTargetDpId || vpp8.pvWTargetDpId)
        : 'sET_PV_POWER';

      const batTargetDpId = (vpp8 && vpp8.batTargetDpId)
        ? String(vpp8.batTargetDpId)
        : 'vPP8_BATTERY_POWER_TARGET';

      const triggerIds = (() => {
        if (!vpp8) return [pvTargetDpId, batTargetDpId];
        if (Array.isArray(vpp8.triggerDpIds) && vpp8.triggerDpIds.length) {
          return vpp8.triggerDpIds.map(v => String(v)).filter(v => v && v.trim());
        }
        const primary = (vpp8.triggerDpId ? String(vpp8.triggerDpId) : pvTargetDpId).trim();
        const out = [];
        if (primary) out.push(primary);
        // Always include both setpoints unless explicitly overridden via triggerDpIds
        if (pvTargetDpId && !out.includes(pvTargetDpId)) out.push(pvTargetDpId);
        if (batTargetDpId && !out.includes(batTargetDpId)) out.push(batTargetDpId);
        return out;
      })();

      const currentDpId = String(dp?.id ?? '');
      if (
        fc === 16 &&
        vpp8 && vpp8.enabled === true &&
        triggerIds.includes(currentDpId)
      ) {
        const startAddress = Number(vpp8.startAddress ?? 160);
        const modeNum = Number(vpp8.modeNum ?? 8);

        const targetSetTypeDpId = (vpp8.targetSetTypeDpId || 'vPP8_TARGET_SET_TYPE').toString();
        const execDpId = (vpp8.execDurationDpId || 'vPP8_EXEC_DURATION').toString();
        const nextDpId = (vpp8.nextMotionDpId || 'vPP8_NEXT_MOTION').toString();

        // Defaults (used if state values are not available / invalid)
        const defaultTargetSetType = Number(vpp8.defaultTargetSetType ?? 1);
        const defaultPvTarget = Number(vpp8.defaultPvTarget ?? vpp8.defaultPvWTarget ?? 0);
        const defaultBatTarget = Number(vpp8.defaultBatTarget ?? 0);
        const defaultExec = Number(vpp8.defaultExecDuration ?? 600);
        const defaultNext = Number(vpp8.defaultNextMotion ?? 160);

        // TargetSetType (1=reset, 2=update)
        let targetSetType = await this._getDpStateNumber(targetSetTypeDpId);
        if (!Number.isFinite(targetSetType) || targetSetType <= 0) targetSetType = defaultTargetSetType;
        targetSetType = Math.round(targetSetType);
        if (targetSetType < 1) targetSetType = 1;
        if (targetSetType > 2) targetSetType = 2;

        const isPvTrigger = (currentDpId === pvTargetDpId);
        const isBatTrigger = (currentDpId === batTargetDpId);

        // PV Power target is an U32 (W). If PV is not the trigger, take the last known PV target state.
        // If none is available (never written), fall back to a template default.
        let pvWTarget;
        if (isPvTrigger) {
          pvWTarget = Math.round(Number(raw) || 0);
        } else {
          pvWTarget = await this._getDpStateNumber(pvTargetDpId);
          if (!Number.isFinite(pvWTarget)) pvWTarget = defaultPvTarget;
          pvWTarget = Math.round(Number(pvWTarget) || 0);
        }
        if (!Number.isFinite(pvWTarget)) pvWTarget = 0;
        if (pvWTarget < 0) pvWTarget = 0;
        // clamp to uint32 range (practically never reached)
        if (pvWTarget > 0xFFFFFFFF) pvWTarget = 0xFFFFFFFF;

        // Battery power target is an S32 (W) (+ discharge / - charge).
        // If BAT is the trigger, use the written value, otherwise take the last known BAT target state.
        let batWTarget;
        if (isBatTrigger) {
          batWTarget = Math.round(Number(raw) || 0);
        } else {
          batWTarget = await this._getDpStateNumber(batTargetDpId);
          if (!Number.isFinite(batWTarget)) batWTarget = defaultBatTarget;
          batWTarget = Math.round(Number(batWTarget) || 0);
        }
        if (!Number.isFinite(batWTarget)) batWTarget = defaultBatTarget;
        if (batWTarget < -0x80000000) batWTarget = -0x80000000;
        if (batWTarget > 0x7FFFFFFF) batWTarget = 0x7FFFFFFF;

        // ExecDuration (seconds)
        let execDuration = await this._getDpStateNumber(execDpId);
        if (!Number.isFinite(execDuration) || execDuration <= 0) execDuration = defaultExec;
        execDuration = Math.round(execDuration);
        if (execDuration < 0) execDuration = 0;
        if (execDuration > 0xFFFF) execDuration = 0xFFFF;

        // NextMotion (U16)
        let nextMotion = await this._getDpStateNumber(nextDpId);
        if (!Number.isFinite(nextMotion) || nextMotion <= 0) nextMotion = defaultNext;
        nextMotion = Math.round(nextMotion);
        // Valid values per VPP protocol: 0x00A0 (exit VPP) or 0x00A1 (switch to default VPP mode 6)
        if (nextMotion !== 0x00A0 && nextMotion !== 0x00A1) nextMotion = defaultNext;

        // Build register block:
        // [VPPModeNum, TargetSetType, PvWTarget_L/H, BatWTarget_L/H, ExecDuration, NextMotion]
        const blockRegs = [];
        blockRegs.push(...bufferToRegs(valueToBuffer(modeNum, 'uint16', 2), wo, bo));
        blockRegs.push(...bufferToRegs(valueToBuffer(targetSetType, 'uint16', 2), wo, bo));
        blockRegs.push(...bufferToRegs(valueToBuffer(pvWTarget, 'uint32', 4), wo, bo));
        blockRegs.push(...bufferToRegs(valueToBuffer(batWTarget, 'int32', 4), wo, bo));
        blockRegs.push(...bufferToRegs(valueToBuffer(execDuration, 'uint16', 2), wo, bo));
        blockRegs.push(...bufferToRegs(valueToBuffer(nextMotion, 'uint16', 2), wo, bo));

        const blockAddr = this._addr({ address: startAddress });
        await this._mbWriteRegisters(blockAddr, blockRegs, unitId);
        return;
      }


      // --- Special case: FoxESS Remote Control requires a single FC16 multi-write starting at 46001 ---
      // FoxESS H3 remote control uses:
      //  - 46001: Remote Control (bitfield16)
      //  - 46002: Remote Timeout Set (s)
      //  - 46003..46004: Remote Control Active Power Command (S32, W)
      // Writing only 46003 may be ignored unless 46001/46002 are set accordingly.
      const frc = this._foxessRemoteControl;
      const frcTriggerId = (frc && frc.triggerDpId) ? String(frc.triggerDpId) : 'sET_ACTIVE_POWER';
      if (
        fc === 16 &&
        frc && frc.enabled === true &&
        String(dp?.id) === frcTriggerId
      ) {
        const startAddress = Number(frc.startAddress ?? 46001);
        const timeoutDpId = (frc.timeoutDpId || 'rEMOTE_TIMEOUT_SET').toString();
        const defaultTimeout = Number(frc.defaultTimeout ?? 600);

        // Remote Control bitfield
        // bit0: enable (1)
        // bit1: positive direction (0 = power-generation system, 1 = power-consumption system)
        // bits3:2: controlled target (01 = Battery)
        const enable = Number(frc.enable ?? 1) ? 1 : 0;
        const positiveDirection = Number(frc.positiveDirection ?? 0) ? 1 : 0;
        const target = Number(frc.target ?? 1) & 0x03;

        let remoteControlWord = 0;
        if (enable) remoteControlWord |= 1;
        if (positiveDirection) remoteControlWord |= 2;
        remoteControlWord |= (target << 2);

        // Timeout (seconds) - allow override via existing datapoint state
        let timeout = await this._getDpStateNumber(timeoutDpId);
        if (!Number.isFinite(timeout) || timeout < 0) timeout = defaultTimeout;
        timeout = Math.round(timeout);
        if (timeout < 0) timeout = 0;
        if (timeout > 0xFFFF) timeout = 0xFFFF;

        // Active power command (S32, W) - ensure integer
        const powerW = Math.round(Number(raw) || 0);

        // Build register block: [RemoteControl, TimeoutSet, ActivePowerCmd_L/H]
        const blockRegs = [];
        blockRegs.push(...bufferToRegs(valueToBuffer(remoteControlWord, 'uint16', 2), wo, bo));
        blockRegs.push(...bufferToRegs(valueToBuffer(timeout, 'uint16', 2), wo, bo));
        blockRegs.push(...bufferToRegs(valueToBuffer(powerW, 'int32', 4), wo, bo));

        const blockAddr = this._addr({ address: startAddress });
        await this._mbWriteRegisters(blockAddr, blockRegs, unitId);
        return;
      }

      const words = Number(src.length || 1);

      // Alfen ACE EMS control: keep the official document-register-minus-one
      // layout as the canonical first attempt, but retry the direct table-address
      // layout only after exact Modbus exception 2. This must run before the
      // generic repeatEncodedValue helper so the SCN three-phase block is handled
      // by the same compatibility logic as the socket current command.
      if ((fc === 6 || fc === 16) && this._isAlfenProfile && this._alfenControlKindForDpId(dp && dp.id)) {
        if (await this._writeAlfenControlAdaptive(dp, src, addr, raw, words, unitId, wo, bo, setWriteContext)) return;
      }

      // Generic helper for Modbus profiles where one engineering value must be
      // written repeatedly as a multi-register data type. Example: Alfen SCN max
      // current uses one FLOAT32 per phase and must refresh L1/L2/L3 in one FC16
      // request (6 registers total, 2 words per FLOAT32).
      if (fc === 16 && words > 1 && (src.repeatEncodedValue === true || src.repeatEncodedToLength === true || src.repeatDataTypeValue === true)) {
        const oneWordsRaw = Number(src.repeatValueWords ?? src.valueWords ?? dataTypeWordLength(src.dataType));
        const oneWords = Number.isFinite(oneWordsRaw) && oneWordsRaw > 0 ? Math.trunc(oneWordsRaw) : dataTypeWordLength(src.dataType);
        if (oneWords <= 0 || words % oneWords !== 0) {
          throw new Error(`Invalid repeatEncodedValue layout for ${dp?.id || 'datapoint'}: length=${words}, valueWords=${oneWords}`);
        }
        const singleBuf = valueToBuffer(raw, src.dataType, oneWords * 2);
        const singleRegs = bufferToRegs(singleBuf, wo, bo);
        if (!singleRegs.length) throw new Error(`Cannot encode repeatEncodedValue for ${dp?.id || 'datapoint'}`);
        const regsToWrite = [];
        const repeatCount = Math.trunc(words / singleRegs.length);
        for (let i = 0; i < repeatCount; i++) regsToWrite.push(...singleRegs);
        const offsets = this._addressFallbackOffsets(src);
        const addresses = [addr];
        for (const off of offsets) {
          const a = Number(addr) + Number(off);
          if (Number.isFinite(a) && a >= 0 && !addresses.includes(a)) addresses.push(a);
        }
        let lastErr = null;
        for (const a of addresses) {
          try {
            setWriteContext(src, fc, a, raw, words, unitId);
            await this._mbWriteRegisters(a, regsToWrite.slice(0, words), unitId);
            this._logAlfenAcceptedControlWrite(dp, src, unitId, fc, a, raw, regsToWrite.slice(0, words));
            return;
          } catch (e) {
            lastErr = e;
            if (!isModbusIllegalAddressOrValue(e)) throw e;
          }
        }
        throw lastErr;
      }

      // Generic helper for Modbus profiles where one user-facing setpoint must be
      // written into several consecutive registers with the same value. Example:
      // Mennekes charging-point-network EMS current limit L1/L2/L3 (registers 613..615).
      if (fc === 16 && words > 1 && (src.repeatValue === true || src.repeatToLength === true || src.fillRegisters === true)) {
        const singleBuf = valueToBuffer(raw, src.dataType, 2);
        const singleRegs = bufferToRegs(singleBuf, wo, bo);
        const one = singleRegs.length ? singleRegs[0] : 0;
        const regsToWrite = Array(words).fill(one);
        const offsets = this._addressFallbackOffsets(src);
        const addresses = [addr];
        for (const off of offsets) {
          const a = Number(addr) + Number(off);
          if (Number.isFinite(a) && a >= 0 && !addresses.includes(a)) addresses.push(a);
        }
        let lastErr = null;
        for (const a of addresses) {
          try {
            setWriteContext(src, fc, a, raw, words, unitId);
            await this._mbWriteRegisters(a, regsToWrite, unitId);
            return;
          } catch (e) {
            lastErr = e;
            if (!isModbusIllegalAddressOrValue(e)) throw e;
          }
        }
        throw lastErr;
      }

      const buf = valueToBuffer(raw, src.dataType, words * 2);
      const regs = bufferToRegs(buf, wo, bo);

      const fallbackAddresses = (() => {
        const offsets = this._addressFallbackOffsets(src);
        const out = [addr];
        for (const off of offsets) {
          const a = Number(addr) + Number(off);
          if (Number.isFinite(a) && a >= 0 && !out.includes(a)) out.push(a);
        }
        return out;
      })();

      if (fc === 6) {
        if (regs.length < 1) throw new Error('FC6 requires one register');
        let lastErr = null;
        for (const a of fallbackAddresses) {
          try {
            setWriteContext(src, fc, a, raw, 1, unitId);
            await this._mbWriteRegister(a, regs[0], unitId);
            return;
          } catch (e) {
            lastErr = e;
            if (!isModbusIllegalAddressOrValue(e)) throw e;
          }
        }
        throw lastErr;
      }

      if (fc === 16) {
        let lastErr = null;
        for (const a of fallbackAddresses) {
          try {
            setWriteContext(src, fc, a, raw, words, unitId);
            await this._mbWriteRegisters(a, regs, unitId);
            return;
          } catch (e) {
            lastErr = e;
            if (!isModbusIllegalAddressOrValue(e)) throw e;
          }
        }
        throw lastErr;
      }

      throw new Error(`Unsupported write FC=${fc}`);
    };

    try {
      return await attempt();
    } catch (e) {
      // Transport errors are often recoverable by forcing a reconnect and retrying once.
      if (isTransportError(e)) {
        this._markDisconnected(e);
        try {
          return await attempt();
        } catch (e2) {
          if (isTransportError(e2)) {
            this._markDisconnected(e2);
          }
          throw annotateWriteError(e2);
        }
      }
      throw annotateWriteError(e);
    }
  }
}

module.exports = { ModbusDriver };
