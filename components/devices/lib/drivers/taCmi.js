'use strict';

const axios = require('axios');
const { createHttpSecurity, requestWithDeadline } = require('../httpSecurity');
const ModbusRTU = require('modbus-serial');

const API_PATH = '/INCLUDE/api.cgi';
const DEFAULT_GROUPS = ['I', 'O', 'D', 'Sg', 'Sd', 'St', 'Ss', 'Sp', 'Na', 'Nd', 'M', 'AM', 'AK', 'La', 'Ld'];
const MAX_ANALOG_CHANNELS = 64;
const MAX_DIGITAL_CHANNELS = 64;

const TA_CMI_UNITS = Object.freeze({
  0: '',
  1: '°C',
  2: 'W/m²',
  3: 'l/h',
  4: 's',
  5: 'min',
  6: 'l/Imp',
  7: 'K',
  8: '%',
  10: 'kW',
  11: 'kWh',
  12: 'MWh',
  13: 'V',
  14: 'mA',
  15: 'h',
  16: 'd',
  17: 'Imp',
  18: 'kΩ',
  19: 'l',
  20: 'km/h',
  21: 'Hz',
  22: 'l/min',
  23: 'bar',
  25: 'km',
  26: 'm',
  27: 'mm',
  28: 'm³',
  35: 'l/d',
  36: 'm/s',
  37: 'm³/min',
  38: 'm³/h',
  39: 'm³/d',
  40: 'mm/min',
  41: 'mm/h',
  42: 'mm/d',
  43: '', // OFF/ON
  44: '', // NO/YES
  46: '°C', // RAS
  50: '€',
  51: '$',
  52: 'g/m³',
  54: '°',
  56: '°',
  57: 's',
  59: '%',
  60: 'h',
  63: 'A',
  65: 'mbar',
  66: 'Pa',
  67: 'ppm',
  69: 'W',
  70: 't',
  71: 'kg',
  72: 'g',
  73: 'cm',
  74: 'K',
  75: 'lx',
  76: 'Bq/m³',
  77: 'ct/kWh',
  78: '', // OPEN/CLOSED
});

const TA_CMI_DEVICES = Object.freeze({
  '7F': 'CoE',
  '80': 'UVR1611',
  '81': 'CAN-MT',
  '82': 'CAN-I/O44',
  '83': 'CAN-I/O35',
  '84': 'CAN-BC',
  '85': 'CAN-EZ',
  '86': 'CAN-TOUCH',
  '87': 'UVR16x2',
  '88': 'RSM610',
  '89': 'CAN-I/O45',
  '8A': 'CMI',
  '8B': 'CAN-EZ2',
  '8C': 'CAN-MTx2',
  '8D': 'CAN-BC2',
  '8E': 'UVR65',
  '8F': 'CAN-EZ3',
  '91': 'UVR610',
  '92': 'UVR67',
  'A3': 'BL-NET',
});

const GROUP_KEY_MAP = Object.freeze({
  Inputs: { slug: 'inputs', label: 'Inputs' },
  Outputs: { slug: 'outputs', label: 'Outputs' },
  'DL-Bus': { slug: 'dlInputs', label: 'DL inputs' },
  DL: { slug: 'dlInputs', label: 'DL inputs' },
  General: { slug: 'systemGeneral', label: 'System general' },
  Date: { slug: 'systemDate', label: 'System date' },
  Time: { slug: 'systemTime', label: 'System time' },
  Sun: { slug: 'systemSun', label: 'System sun' },
  'Electrical power': { slug: 'electricalPower', label: 'Electrical power' },
  ElectricalPower: { slug: 'electricalPower', label: 'Electrical power' },
  'Network Analog': { slug: 'networkAnalog', label: 'Network analog' },
  NetworkAnalog: { slug: 'networkAnalog', label: 'Network analog' },
  'Network Digital': { slug: 'networkDigital', label: 'Network digital' },
  NetworkDigital: { slug: 'networkDigital', label: 'Network digital' },
  MBus: { slug: 'mbus', label: 'M-Bus' },
  'M-Bus': { slug: 'mbus', label: 'M-Bus' },
  Modbus: { slug: 'modbus', label: 'Modbus' },
  KNX: { slug: 'knx', label: 'KNX' },
  'Logging Analog': { slug: 'loggingAnalog', label: 'Logging analog' },
  LoggingAnalog: { slug: 'loggingAnalog', label: 'Logging analog' },
  'Logging Digital': { slug: 'loggingDigital', label: 'Logging digital' },
  LoggingDigital: { slug: 'loggingDigital', label: 'Logging digital' },
});

const X2_COMMON_GROUPS = Object.freeze(['I', 'O', 'D', 'Sg', 'Sd', 'St', 'Ss', 'La', 'Ld']);
const AUTO_GROUPS_BY_DEVICE = Object.freeze({
  '80': ['I', 'O', 'Na', 'Nd'], // UVR1611
  '87': X2_COMMON_GROUPS, // UVR16x2
  '88': X2_COMMON_GROUPS, // RSM610 (M-Bus variant can be selected explicitly)
  '89': X2_COMMON_GROUPS, // CAN-I/O45
  '8B': [...X2_COMMON_GROUPS, 'Sp'], // CAN-EZ2
  '8C': X2_COMMON_GROUPS, // CAN-MTx2
  '8D': [...X2_COMMON_GROUPS, 'M', 'AM', 'AK'], // CAN-BC2
  '8E': X2_COMMON_GROUPS, // UVR65
  '8F': [...X2_COMMON_GROUPS, 'Sp', 'AM'], // CAN-EZ3
  '91': X2_COMMON_GROUPS, // UVR610 (M/Modbus variants can be selected explicitly)
  '92': X2_COMMON_GROUPS, // UVR67
});

function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function parseNodeSpec(value, fallbackAll = true) {
  if (Array.isArray(value)) {
    const arr = value.map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 62);
    return Array.from(new Set(arr)).sort((a, b) => a - b);
  }

  const raw = String(value == null ? '' : value).trim();
  if (!raw) return fallbackAll ? Array.from({ length: 62 }, (_, i) => i + 1) : [];

  const out = new Set();
  for (const partRaw of raw.split(/[;,\s]+/)) {
    const part = partRaw.trim();
    if (!part) continue;
    const m = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      let a = Number(m[1]);
      let b = Number(m[2]);
      if (a > b) [a, b] = [b, a];
      for (let n = a; n <= b; n += 1) if (n >= 1 && n <= 62) out.add(n);
      continue;
    }
    const n = Number(part);
    if (Number.isInteger(n) && n >= 1 && n <= 62) out.add(n);
  }
  return Array.from(out).sort((a, b) => a - b);
}

function parseGroups(value) {
  const raw = Array.isArray(value) ? value : String(value == null ? '' : value).split(/[;,\s]+/);
  const allowed = new Set(DEFAULT_GROUPS);
  const out = [];
  for (const item of raw) {
    const s = String(item || '').trim();
    if (allowed.has(s) && !out.includes(s)) out.push(s);
  }
  return out.length ? out : DEFAULT_GROUPS.slice();
}

function parseBridgeMap(value) {
  if (Array.isArray(value)) return value.filter(v => v && typeof v === 'object');
  if (!value || typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(v => v && typeof v === 'object') : [];
  } catch (_) {
    return [];
  }
}

function sanitizeAliasPath(value) {
  const raw = String(value || '').trim().replace(/^aliases\./i, '');
  if (!raw) return '';
  const parts = raw.split('.').map(part => part.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '')).filter(Boolean);
  return parts.join('.');
}

function groupInfo(key) {
  if (GROUP_KEY_MAP[key]) return GROUP_KEY_MAP[key];
  const slug = String(key || 'values')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'values';
  return { slug, label: String(key || 'Values') };
}

function deviceName(deviceId) {
  const key = String(deviceId == null ? '' : deviceId).trim().toUpperCase().replace(/^0X/, '');
  return TA_CMI_DEVICES[key] || (key ? `TA device 0x${key}` : 'Unknown TA device');
}

function unitForId(unitId) {
  const n = Number(unitId);
  return Object.prototype.hasOwnProperty.call(TA_CMI_UNITS, n) ? TA_CMI_UNITS[n] : '';
}

function roleForValue(unit, ad, designation) {
  if (String(ad || '').toUpperCase() === 'D') return 'indicator';
  const u = String(unit || '');
  const name = String(designation || '').toLowerCase();
  if (u === '°C' || /temp|temperatur|vorlauf|rücklauf|ruecklauf|warmwasser/.test(name)) return 'value.temperature';
  if (u === 'W' || u === 'kW' || /leistung|power/.test(name)) return 'value.power';
  if (u === 'kWh' || u === 'MWh' || /energie|energy/.test(name)) return 'value.energy';
  if (u === 'V') return 'value.voltage';
  if (u === 'A' || u === 'mA') return 'value.current';
  if (u === 'Hz') return 'value.frequency';
  if (u === 's' || u === 'min' || u === 'h' || u === 'd') return 'value.interval';
  return 'value';
}

function encodeInt16(value) {
  const n = clampInt(Math.round(Number(value) || 0), -32768, 32767, 0);
  return n < 0 ? 0x10000 + n : n;
}

function decodeInt16(value) {
  const n = Number(value) & 0xffff;
  return n >= 0x8000 ? n - 0x10000 : n;
}

function normalizeScale(value) {
  const n = Number(value);
  return Number.isFinite(n) && n !== 0 ? n : 1;
}

function normalizeBridgeEntry(raw) {
  const directionRaw = String(raw.direction || raw.dir || '').toLowerCase().replace(/[^a-z]/g, '');
  const direction = ['tocmi', 'tx', 'out', 'output'].includes(directionRaw)
    ? 'toCmi'
    : ['fromcmi', 'rx', 'in', 'input'].includes(directionRaw)
      ? 'fromCmi'
      : '';
  const typeRaw = String(raw.type || raw.kind || '').toLowerCase();
  const type = typeRaw.startsWith('d') || typeRaw === 'bool' || typeRaw === 'boolean' ? 'digital' : 'analog';
  const channel = clampInt(raw.channel ?? raw.index ?? raw.number, 1, 64, 0);
  if (!direction || !channel) return null;
  return {
    direction,
    type,
    channel,
    name: raw.name ? String(raw.name) : '',
    unit: raw.unit ? String(raw.unit) : '',
    role: raw.role ? String(raw.role) : '',
    scale: normalizeScale(raw.scale ?? raw.factor ?? 1),
    alias: sanitizeAliasPath(raw.alias || raw.aliasPath || ''),
    min: Number.isFinite(Number(raw.min)) ? Number(raw.min) : undefined,
    max: Number.isFinite(Number(raw.max)) ? Number(raw.max) : undefined,
  };
}

class TaCmiDriver {
  constructor(adapter, deviceCfg, template, globalCfg, runtime) {
    this.adapter = adapter;
    this.device = deviceCfg || {};
    this.template = template || {};
    this.global = globalCfg || {};
    this.runtime = runtime;
    this.connection = this.device.connection || {};

    const c = this.connection;
    const baseURL = String(c.baseUrl || c.url || '').trim().replace(/\/+$/, '');
    const axiosCfg = { baseURL: baseURL || undefined, ...createHttpSecurity(c) };
    this.httpTimeoutMs = axiosCfg.timeout;
    const username = String(c.username || '').trim();
    const password = String(c.password || '');
    if (username) axiosCfg.auth = { username, password };
    this.http = axios.create(axiosCfg);

    this.nodes = parseNodeSpec(c.nodes ?? c.nodeList ?? c.nodeRange, true);
    const groupSetting = c.groups ?? c.jsonParams;
    this.groupsExplicit = Array.isArray(groupSetting)
      ? groupSetting.length > 0
      : String(groupSetting == null ? '' : groupSetting).trim().length > 0;
    this.groups = this.groupsExplicit ? parseGroups(groupSetting) : [];
    this.includeDesignations = c.includeDesignations !== false && c.jsonDesignation !== false;
    this.minRequestIntervalMs = Math.max(60000, clampInt(c.minRequestIntervalMs, 1000, 3600000, 60000));
    this._lastRequestAt = 0;
    this._scanIndex = 0;
    this._activeIndex = 0;
    this._scanComplete = false;
    this._activeNodes = new Set();
    this._nodeLastStatus = new Map();
    this._nodeDeviceId = new Map();
    this._connected = false;

    this.bridgeEnabled = c.bridgeEnabled !== false;
    this.bridgeHost = String(c.bridgeHost || c.bindAddress || '0.0.0.0');
    this.bridgePort = clampInt(c.bridgePort ?? c.serverPort, 1, 65535, 1502);
    this.bridgeUnitId = clampInt(c.bridgeUnitId ?? c.serverUnitId, 1, 247, 1);
    this.txAnalogBase = clampInt(c.txAnalogBase, 0, 64000, 0);
    this.rxAnalogBase = clampInt(c.rxAnalogBase, 0, 64000, 100);
    this.txDigitalBase = clampInt(c.txDigitalBase, 0, 64000, 0);
    this.rxDigitalBase = clampInt(c.rxDigitalBase, 0, 64000, 100);
    this.bridgeMap = parseBridgeMap(c.bridgeMap || c.bridgeMapJson).map(normalizeBridgeEntry).filter(Boolean);
    this.bridgeMapByKey = new Map(this.bridgeMap.map(entry => [`${entry.direction}:${entry.type}:${entry.channel}`, entry]));

    this.txAnalog = Array(MAX_ANALOG_CHANNELS).fill(0);
    this.rxAnalogRaw = Array(MAX_ANALOG_CHANNELS).fill(0);
    this.rxAnalog = Array(MAX_ANALOG_CHANNELS).fill(0);
    this.txDigital = Array(MAX_DIGITAL_CHANNELS).fill(false);
    this.rxDigital = Array(MAX_DIGITAL_CHANNELS).fill(false);
    this.server = null;
    this.bridgeListening = false;
    this.bridgeLastClientMs = 0;
    this._bridgeReady = false;
  }

  _bridgeKey(direction, type, channel) {
    return `${direction}:${type}:${channel}`;
  }

  _bridgeEntry(direction, type, channel) {
    return this.bridgeMapByKey.get(this._bridgeKey(direction, type, channel)) || null;
  }

  _bridgeDpId(direction, type, channel) {
    const pad = String(channel).padStart(2, '0');
    return `bridge.${direction}.${type}.${pad}`;
  }

  _bridgeValueToRaw(direction, channel, value) {
    const entry = this._bridgeEntry(direction, 'analog', channel);
    const scale = entry ? entry.scale : 1;
    let engineering = Number(value);
    if (!Number.isFinite(engineering)) engineering = 0;
    if (entry && Number.isFinite(entry.min)) engineering = Math.max(entry.min, engineering);
    if (entry && Number.isFinite(entry.max)) engineering = Math.min(entry.max, engineering);
    return clampInt(Math.round(engineering / scale), -32768, 32767, 0);
  }

  _bridgeRawToValue(direction, channel, raw) {
    const entry = this._bridgeEntry(direction, 'analog', channel);
    return raw * (entry ? entry.scale : 1);
  }

  async _registerBridgeDatapoints() {
    if (this._bridgeReady || !this.runtime || typeof this.runtime.registerDynamicDatapoint !== 'function') return;

    for (let channel = 1; channel <= MAX_ANALOG_CHANNELS; channel += 1) {
      for (const direction of ['toCmi', 'fromCmi']) {
        const entry = this._bridgeEntry(direction, 'analog', channel);
        const id = this._bridgeDpId(direction, 'analog', channel);
        const rw = direction === 'toCmi' ? 'rw' : 'ro';
        const name = entry && entry.name
          ? entry.name
          : `${direction === 'toCmi' ? 'NexoWatt → CMI' : 'CMI → NexoWatt'} analog ${channel}`;
        const dp = await this.runtime.registerDynamicDatapoint({
          id,
          name,
          type: 'number',
          role: (entry && entry.role) || (direction === 'toCmi' ? 'level' : 'value'),
          unit: (entry && entry.unit) || '',
          rw,
          source: {
            kind: 'taCmiBridge',
            direction,
            valueType: 'analog',
            channel,
            register: (direction === 'toCmi' ? this.txAnalogBase : this.rxAnalogBase) + channel - 1,
            scale: entry ? entry.scale : 1,
          }
        });
        if (entry && entry.alias && typeof this.runtime.registerDynamicAlias === 'function') {
          const relId = `${this.runtime.baseId}.aliases.${entry.alias}`;
          await this.runtime.registerDynamicAlias({
            relId,
            name,
            type: 'number',
            role: dp.role,
            unit: dp.unit,
            rw,
            kind: 'dp',
            dpId: id,
            writeDpId: direction === 'toCmi' ? id : undefined,
          });
        }
      }
    }

    for (let channel = 1; channel <= MAX_DIGITAL_CHANNELS; channel += 1) {
      for (const direction of ['toCmi', 'fromCmi']) {
        const entry = this._bridgeEntry(direction, 'digital', channel);
        const id = this._bridgeDpId(direction, 'digital', channel);
        const rw = direction === 'toCmi' ? 'rw' : 'ro';
        const name = entry && entry.name
          ? entry.name
          : `${direction === 'toCmi' ? 'NexoWatt → CMI' : 'CMI → NexoWatt'} digital ${channel}`;
        const dp = await this.runtime.registerDynamicDatapoint({
          id,
          name,
          type: 'boolean',
          role: (entry && entry.role) || (direction === 'toCmi' ? 'switch' : 'indicator'),
          rw,
          source: {
            kind: 'taCmiBridge',
            direction,
            valueType: 'digital',
            channel,
            coil: (direction === 'toCmi' ? this.txDigitalBase : this.rxDigitalBase) + channel - 1,
          }
        });
        if (entry && entry.alias && typeof this.runtime.registerDynamicAlias === 'function') {
          const relId = `${this.runtime.baseId}.aliases.${entry.alias}`;
          await this.runtime.registerDynamicAlias({
            relId,
            name,
            type: 'boolean',
            role: dp.role,
            rw,
            kind: 'dp',
            dpId: id,
            writeDpId: direction === 'toCmi' ? id : undefined,
          });
        }
      }
    }

    this._bridgeReady = true;
  }

  async _setRuntimeState(dpId, value) {
    if (!this.runtime) return;
    const dp = this.runtime._getDpById ? this.runtime._getDpById(dpId) : null;
    if (dp && typeof this.runtime._setStateCached === 'function') {
      await this.runtime._setStateCached(this.runtime.relStateId(dp), value, true);
      if (typeof this.runtime._updateAliases === 'function') {
        await this.runtime._updateAliases({ [dpId]: value }, { connected: true, lastError: '' }).catch(() => {});
      }
    }
  }

  async _onCmiRegisterWrite(address, value) {
    this.bridgeLastClientMs = Date.now();
    const channel = Number(address) - this.rxAnalogBase + 1;
    if (channel < 1 || channel > MAX_ANALOG_CHANNELS) return;
    const raw = decodeInt16(value);
    const engineering = this._bridgeRawToValue('fromCmi', channel, raw);
    this.rxAnalogRaw[channel - 1] = raw;
    this.rxAnalog[channel - 1] = engineering;
    await this._setRuntimeState(this._bridgeDpId('fromCmi', 'analog', channel), engineering);
    await this._setRuntimeState('cMI_BRIDGE_CLIENT_LAST_SEEN_MS', this.bridgeLastClientMs);
  }

  async _onCmiCoilWrite(address, value) {
    this.bridgeLastClientMs = Date.now();
    const channel = Number(address) - this.rxDigitalBase + 1;
    if (channel < 1 || channel > MAX_DIGITAL_CHANNELS) return;
    const bool = !!value;
    this.rxDigital[channel - 1] = bool;
    await this._setRuntimeState(this._bridgeDpId('fromCmi', 'digital', channel), bool);
    await this._setRuntimeState('cMI_BRIDGE_CLIENT_LAST_SEEN_MS', this.bridgeLastClientMs);
  }

  _getHolding(address) {
    this.bridgeLastClientMs = Date.now();
    const txChannel = Number(address) - this.txAnalogBase + 1;
    if (txChannel >= 1 && txChannel <= MAX_ANALOG_CHANNELS) {
      const raw = this._bridgeValueToRaw('toCmi', txChannel, this.txAnalog[txChannel - 1]);
      return encodeInt16(raw);
    }
    const rxChannel = Number(address) - this.rxAnalogBase + 1;
    if (rxChannel >= 1 && rxChannel <= MAX_ANALOG_CHANNELS) return encodeInt16(this.rxAnalogRaw[rxChannel - 1]);
    return 0;
  }

  _getCoil(address) {
    this.bridgeLastClientMs = Date.now();
    const txChannel = Number(address) - this.txDigitalBase + 1;
    if (txChannel >= 1 && txChannel <= MAX_DIGITAL_CHANNELS) return !!this.txDigital[txChannel - 1];
    const rxChannel = Number(address) - this.rxDigitalBase + 1;
    if (rxChannel >= 1 && rxChannel <= MAX_DIGITAL_CHANNELS) return !!this.rxDigital[rxChannel - 1];
    return false;
  }

  async _startBridgeServer() {
    if (!this.bridgeEnabled || this.server) return;
    await this._registerBridgeDatapoints();

    const vector = {
      getHoldingRegister: (addr) => this._getHolding(addr),
      getInputRegister: (addr) => this._getHolding(addr),
      getCoil: (addr) => this._getCoil(addr),
      getDiscreteInput: (addr) => this._getCoil(addr),
      setRegister: (addr, value) => this._onCmiRegisterWrite(addr, value),
      setCoil: (addr, value) => this._onCmiCoilWrite(addr, value),
      readDeviceIdentification: () => ({
        0x00: 'NexoWatt',
        0x01: 'TA-CMI-BRIDGE',
        0x02: '0.5.139',
        0x05: 'NexoWatt TA CMI Modbus bridge',
      }),
    };

    try {
      this.server = new ModbusRTU.ServerTCP(vector, {
        host: this.bridgeHost,
        port: this.bridgePort,
        debug: false,
        unitID: this.bridgeUnitId,
      });
      this.bridgeListening = true;
      this.server.on('socketError', (error) => {
        this.adapter.log.debug(`[${this.device.id}] TA CMI Modbus bridge socket error: ${error && error.message ? error.message : error}`);
      });
      const onServerError = (error) => {
        this.bridgeListening = false;
        this.adapter.log.warn(`[${this.device.id}] TA CMI Modbus bridge server error: ${error && error.message ? error.message : error}`);
      };
      this.server.on('serverError', onServerError);
      this.server.on('error', onServerError);
      this.adapter.log.info(`[${this.device.id}] TA CMI Modbus bridge listening on ${this.bridgeHost}:${this.bridgePort}, Unit-ID ${this.bridgeUnitId}`);
    } catch (error) {
      this.server = null;
      this.bridgeListening = false;
      this.adapter.log.warn(`[${this.device.id}] TA CMI Modbus bridge could not start on ${this.bridgeHost}:${this.bridgePort}: ${error && error.message ? error.message : error}`);
    }
  }

  async _loadDiscoveredNodes() {
    if (!this.runtime || !this.adapter || typeof this.adapter.getStateAsync !== 'function') return;
    try {
      const st = await this.adapter.getStateAsync(`${this.runtime.baseId}.cMI_DISCOVERED_NODES`);
      if (!st || st.val == null) return;
      for (const n of parseNodeSpec(String(st.val), false)) this._activeNodes.add(n);
    } catch (_) {
      // ignore persistence errors
    }
  }

  async connect() {
    if (this._connected) return;
    await this._loadDiscoveredNodes();
    await this._registerBridgeDatapoints();
    await this._startBridgeServer();
    this._connected = true;
  }

  async disconnect() {
    const server = this.server;
    this.server = null;
    this.bridgeListening = false;
    if (server && typeof server.close === 'function') {
      await new Promise(resolve => {
        let done = false;
        const finish = () => { if (!done) { done = true; resolve(); } };
        try {
          server.close(finish);
          setTimeout(finish, 1000).unref?.();
        } catch (_) {
          finish();
        }
      });
    }
    this._connected = false;
  }

  _selectNextNode() {
    if (!this.nodes.length) return null;
    if (!this._scanComplete) {
      const node = this.nodes[this._scanIndex];
      this._scanIndex += 1;
      if (this._scanIndex >= this.nodes.length) {
        this._scanIndex = 0;
        this._scanComplete = true;
      }
      return node;
    }
    const active = Array.from(this._activeNodes).sort((a, b) => a - b);
    const list = active.length ? active : this.nodes;
    const node = list[this._activeIndex % list.length];
    this._activeIndex = (this._activeIndex + 1) % list.length;
    return node;
  }

  _groupsForNode(node) {
    if (this.groupsExplicit) return this.groups;
    const key = String(this._nodeDeviceId.get(Number(node)) || '').toUpperCase().replace(/^0X/, '');
    const groups = AUTO_GROUPS_BY_DEVICE[key];
    // First contact uses the universally supported I/O pair. The returned header then
    // selects the complete safe profile for subsequent requests to this node.
    return groups ? groups.slice() : ['I', 'O'];
  }

  _statusSnapshot(node, statusCode, statusText) {
    const discovered = Array.from(this._activeNodes).sort((a, b) => a - b);
    const progress = this._scanComplete || !this.nodes.length
      ? 100
      : Math.round((this._scanIndex / this.nodes.length) * 100);
    return {
      cMI_API_STATUS: String(statusText || ''),
      cMI_API_STATUS_CODE: Number.isFinite(Number(statusCode)) ? Number(statusCode) : -1,
      cMI_LAST_NODE: Number(node || 0),
      cMI_DISCOVERED_NODES: discovered.join(','),
      cMI_SCAN_PROGRESS: progress,
      cMI_BRIDGE_LISTENING: !!this.bridgeListening,
      cMI_BRIDGE_CLIENT_LAST_SEEN_MS: Number(this.bridgeLastClientMs || 0),
    };
  }

  async _registerNodeInfo(node, header, statusCode, statusText, online, out) {
    const prefix = `nodes.${node}.info`;
    const defs = [
      [`${prefix}.online`, 'Node online', 'boolean', 'indicator.connected', '', !!online],
      [`${prefix}.apiVersion`, 'CMI API version', 'number', 'value', '', Number(header && header.Version || 0)],
      [`${prefix}.deviceId`, 'TA device ID', 'string', 'text', '', String(header && header.Device || '')],
      [`${prefix}.deviceName`, 'TA device name', 'string', 'text', '', deviceName(header && header.Device)],
      [`${prefix}.timestamp`, 'Node timestamp', 'number', 'value.time', 'ms', Number(header && header.Timestamp || 0) * 1000],
      [`${prefix}.statusCode`, 'Last API status code', 'number', 'value', '', Number(statusCode)],
      [`${prefix}.status`, 'Last API status', 'string', 'text', '', String(statusText || '')],
    ];
    for (const [id, name, type, role, unit, value] of defs) {
      await this.runtime.registerDynamicDatapoint({ id, name, type, role, unit, rw: 'ro', source: { kind: 'taCmiJson', node, meta: true } });
      out[id] = value;
    }
  }

  async _consumeNodeData(node, response, out) {
    const data = response && response.Data && typeof response.Data === 'object' ? response.Data : {};
    for (const [key, list] of Object.entries(data)) {
      if (!Array.isArray(list)) continue;
      const info = groupInfo(key);
      for (let index = 0; index < list.length; index += 1) {
        const item = list[index] || {};
        const number = clampInt(item.Number, 1, 999, index + 1);
        const valueObj = item.Value && typeof item.Value === 'object' ? item.Value : { Value: item.Value };
        const ad = String(item.AD || '').toUpperCase();
        const unitId = Number(valueObj.Unit);
        const unit = unitForId(unitId);
        const designation = String(item.Designation || '').trim();
        const type = ad === 'D' ? 'boolean' : 'number';
        const role = roleForValue(unit, ad, designation);
        const id = `nodes.${node}.${info.slug}.${String(number).padStart(2, '0')}.value`;
        const raw = valueObj.Value;
        const value = type === 'boolean' ? Number(raw) !== 0 : Number(raw);
        await this.runtime.registerDynamicDatapoint({
          id,
          name: designation || `${info.label} ${number}`,
          type,
          role,
          unit,
          rw: 'ro',
          source: {
            kind: 'taCmiJson',
            node,
            group: key,
            number,
            ad,
            unitId,
            designation,
          }
        });
        if (type === 'boolean' || Number.isFinite(value)) out[id] = value;

        if (valueObj.State !== undefined) {
          const stateId = `nodes.${node}.${info.slug}.${String(number).padStart(2, '0')}.state`;
          await this.runtime.registerDynamicDatapoint({
            id: stateId,
            name: `${designation || `${info.label} ${number}`} state`,
            type: 'boolean',
            role: 'indicator',
            rw: 'ro',
            source: { kind: 'taCmiJson', node, group: key, number, field: 'State' },
          });
          out[stateId] = Number(valueObj.State) !== 0;
        }

        if (valueObj.RAS !== undefined) {
          const rasId = `nodes.${node}.${info.slug}.${String(number).padStart(2, '0')}.ras`;
          await this.runtime.registerDynamicDatapoint({
            id: rasId,
            name: `${designation || `${info.label} ${number}`} RAS mode`,
            type: 'number',
            role: 'value',
            rw: 'ro',
            states: { 0: 'Time/auto', 1: 'Standard', 2: 'Setback', 3: 'Standby/frost protection' },
            source: { kind: 'taCmiJson', node, group: key, number, field: 'RAS' },
          });
          out[rasId] = Number(valueObj.RAS);
        }
      }
    }
  }

  async readDatapoints() {
    await this.connect();
    const now = Date.now();
    if (this._lastRequestAt && now - this._lastRequestAt < this.minRequestIntervalMs) {
      return this._statusSnapshot(0, 0, 'WAITING FOR CMI API RATE LIMIT');
    }

    const node = this._selectNextNode();
    if (!node) return this._statusSnapshot(0, 6, 'NO NODES CONFIGURED');

    this._lastRequestAt = now;
    let response;
    try {
      const params = {
        jsonnode: node,
        jsonparam: this._groupsForNode(node).join(','),
      };
      if (this.includeDesignations) params.jsondesignation = 1;
      const res = await requestWithDeadline(this.http, { url: API_PATH, params }, this.httpTimeoutMs, 'get');
      response = res && res.data;
      if (typeof response === 'string') response = JSON.parse(response);
    } catch (error) {
      const err = new Error(`TA CMI JSON API request failed for node ${node}: ${error && error.message ? error.message : error}`);
      err.code = error && error.code ? error.code : 'E_TA_CMI_HTTP';
      throw err;
    }

    const statusCode = Number(response && (response['Status code'] ?? response.StatusCode ?? 0));
    const statusText = String(response && response.Status || (statusCode === 0 ? 'OK' : 'ERROR'));
    const out = this._statusSnapshot(node, statusCode, statusText);
    const header = response && response.Header ? response.Header : {};
    const online = statusCode === 0;
    await this._registerNodeInfo(node, header, statusCode, statusText, online, out);

    if (statusCode === 0) {
      this._activeNodes.add(node);
      this._nodeLastStatus.set(node, 0);
      if (header && header.Device != null) this._nodeDeviceId.set(Number(node), String(header.Device));
      await this._consumeNodeData(node, response, out);
      Object.assign(out, this._statusSnapshot(node, statusCode, statusText));
    } else {
      this._nodeLastStatus.set(node, statusCode);
      if (statusCode === 4) {
        // CMI explicitly rejected the request due to its one-request-per-minute rule.
        // Retry the same node after the next allowed interval.
        if (!this._scanComplete) this._scanIndex = Math.max(0, this._scanIndex - 1);
      }
      if (statusCode === 3 && this.includeDesignations) {
        // jsondesignation was introduced with API v8. Older CMI firmware can reject it.
        // Fall back to values without designations on the next permitted request.
        this.includeDesignations = false;
        if (!this._scanComplete) this._scanIndex = Math.max(0, this._scanIndex - 1);
        this.adapter.log.info(`[${this.device.id}] TA CMI does not accept jsondesignation; continuing in legacy API mode without designations.`);
      }
    }

    return out;
  }

  async writeDatapoint(dp, value) {
    await this.connect();
    const src = dp && dp.source ? dp.source : {};
    if (src.kind !== 'taCmiBridge' || src.direction !== 'toCmi') {
      throw new Error(`TA CMI JSON API is read-only; datapoint ${dp && dp.id ? dp.id : ''} is not a writable bridge value`);
    }
    const channel = clampInt(src.channel, 1, 64, 0);
    if (!channel) throw new Error('Invalid TA CMI bridge channel');
    if (src.valueType === 'digital') {
      this.txDigital[channel - 1] = !!value;
      return;
    }
    let engineering = Number(value);
    if (!Number.isFinite(engineering)) throw new Error(`Invalid TA CMI analog value: ${value}`);
    const entry = this._bridgeEntry('toCmi', 'analog', channel);
    if (entry && Number.isFinite(entry.min)) engineering = Math.max(entry.min, engineering);
    if (entry && Number.isFinite(entry.max)) engineering = Math.min(entry.max, engineering);
    this.txAnalog[channel - 1] = engineering;
  }
}

module.exports = {
  TaCmiDriver,
  parseNodeSpec,
  parseGroups,
  parseBridgeMap,
  normalizeBridgeEntry,
  unitForId,
  roleForValue,
  encodeInt16,
  decodeInt16,
  deviceName,
  DEFAULT_GROUPS,
  TA_CMI_UNITS,
};
