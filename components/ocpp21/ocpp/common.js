'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  measurementDefinition,
  canonicalMeasurand,
  canonicalPhase,
  canonicalUnitForMeasurand,
  aggregatePhaseValues,
} = require('./compact');

// Shared helpers for all OCPP versions.

// Conversion of some commonly used units to a base unit.
function baseUnit(value, unit) {
  const map = {
    kWh: ['Wh', 1000],
    kW: ['W', 1000],
    kVA: ['VA', 1000],
    kVAh: ['VAh', 1000],
    kvar: ['var', 1000],
    kvarh: ['varh', 1000],
    Percent: ['%', 1],
    Celcius: ['°C', 1],
    Celsius: ['°C', 1],
    Fahrenheit: ['°F', 1],
  };
  if (map[unit]) return { val: value * map[unit][1], unit: map[unit][0] };
  return { val: value, unit };
}

function normalizeKey(measurand, phase, location, context) {
  const parts = [canonicalMeasurand(measurand) || 'Reading'];
  const normalizedPhase = canonicalPhase(phase);
  if (normalizedPhase) parts.push(normalizedPhase);
  if (location && location !== 'Body') parts.push(location);
  if (context && context !== 'Sample.Periodic') parts.push(context);
  // Dots in an ioBroker object id create additional folders. Keep every
  // protocol-specific metric flat and use underscores instead.
  return parts.join('_')
    .replace(/[^a-z0-9_-]+/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'Reading';
}

const AGGREGATES = {
  'Energy.Active.Export.Register': 'Energy_Active_Export_Register',
  'Energy.Active.Import.Register': 'Energy_Active_Import_Register',
  'Energy.Reactive.Export.Register': 'Energy_Reactive_Export_Register',
  'Energy.Reactive.Import.Register': 'Energy_Reactive_Import_Register',
  'Energy.Active.Export.Interval': 'Energy_Active_Export_Interval',
  'Energy.Active.Import.Interval': 'Energy_Active_Import_Interval',
  'Energy.Reactive.Export.Interval': 'Energy_Reactive_Export_Interval',
  'Energy.Reactive.Import.Interval': 'Energy_Reactive_Import_Interval',
  'Power.Active.Export': 'Power_Active_Export',
  'Power.Active.Import': 'Power_Active_Import',
  'Power.Offered': 'Power_Offered',
  'Current.Import': 'Current_Import',
  'Current.Export': 'Current_Export',
  Voltage: 'Voltage',
  Frequency: 'Frequency',
  Temperature: 'Temperature',
  SoC: 'SoC',
};

function _readSchemaDirectory(directory) {
  if (!directory || !fs.existsSync(directory)) return [];
  const result = [];
  for (const file of fs.readdirSync(directory).filter((name) => name.endsWith('.json')).sort()) {
    try {
      const schema = JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8'));
      if (schema && typeof schema === 'object') {
        if (!schema.$id) schema.$id = `urn:${path.basename(file, '.json')}`;
        result.push(schema);
      }
    } catch (e) {
      // Ignore a broken optional dependency schema and continue with explicit handlers.
    }
  }
  return result;
}

function _loadInstalledOcpp16Schemas() {
  const roots = new Set();
  try { roots.add(path.dirname(require.resolve('ocpp-rpc/package.json'))); } catch (e) { /* package exports may hide package.json */ }
  try {
    let current = path.dirname(require.resolve('ocpp-rpc'));
    for (let i = 0; i < 4; i++) {
      roots.add(current);
      current = path.dirname(current);
    }
  } catch (e) {
    // Dependency may not be installed while running dependency-free core tests.
  }

  for (const root of roots) {
    const schemas = _readSchemaDirectory(path.join(root, 'schemas', 'openchargealliance', 'ocpp1.6'));
    if (schemas.length) return schemas;
  }
  return [];
}

function _loadSchemas(protocol) {
  // Prefer official schema bundles generated from the local OCA archives.
  try {
    if (protocol === 'ocpp2.0.1') return require('./schemas/ocpp2_0_1_official.json');
    if (protocol === 'ocpp2.1') return require('./schemas/ocpp2_1_official.json');
  } catch (e) {
    // Fall through to the schemas supplied by ocpp-rpc.
  }

  if (protocol === 'ocpp1.6') {
    const currentLayout = _loadInstalledOcpp16Schemas();
    if (currentLayout.length) return currentLayout;
  }

  // Compatibility with older ocpp-rpc package layouts.
  const legacyModules = {
    'ocpp1.6': ['ocpp-rpc/lib/schemas/ocpp1_6.json', 'ocpp-rpc/lib/schemas/ocpp1.6.json'],
    'ocpp2.0.1': ['ocpp-rpc/lib/schemas/ocpp2_0_1.json'],
    'ocpp2.1': ['ocpp-rpc/lib/schemas/ocpp2_1.json'],
  };
  for (const moduleId of legacyModules[protocol] || []) {
    try {
      const schemas = require(moduleId);
      if (Array.isArray(schemas)) return schemas;
    } catch (e) {
      // Try the next known layout.
    }
  }
  // Missing schemas only limits generic catch-all responses; explicit handlers remain active.
  return [];
}

function _parseSchemaId(id) {
  if (typeof id !== 'string' || !id) return null;
  // ocpp-rpc legacy style: urn:Action.req / urn:Action.conf
  let m = id.match(/^urn:([A-Za-z0-9_]+)\.(req|conf)$/);
  if (m) return { action: m[1], kind: m[2] === 'req' ? 'Request' : 'Response' };

  // ocpp-rpc 2.1 style: urn:ActionRequest / urn:ActionResponse
  m = id.match(/^urn:([A-Za-z0-9_]+)(Request|Response)$/);
  if (m) return { action: m[1], kind: m[2] };

  // official OCA schemas: urn:OCPP:...:ActionRequest / ...:ActionResponse
  m = id.match(/(?:^|:)([A-Za-z0-9_]+)(Request|Response)$/);
  if (m) return { action: m[1], kind: m[2] };
  return null;
}

function _getAllRequestActions(protocol) {
  const schemas = _loadSchemas(protocol);
  const actions = new Set();
  for (const s of schemas) {
    const id = s && s.$id;
    const parsed = _parseSchemaId(id);
    if (parsed && parsed.kind === 'Request') actions.add(parsed.action);
  }
  return [...actions].sort();
}

function _buildResponseSchemaMap(protocol) {
  const schemas = _loadSchemas(protocol);
  const map = new Map();
  for (const s of schemas) {
    const id = s && s.$id;
    const parsed = _parseSchemaId(id);
    if (parsed && parsed.kind === 'Response') map.set(parsed.action, s);
  }
  return map;
}

function _pickEnum(values, preferFailure = false) {
  if (!Array.isArray(values) || values.length === 0) return undefined;
  const prefer = preferFailure
    ? ['NotSupported', 'NotImplemented', 'Rejected', 'Failed', 'Unknown', 'Unavailable']
    : ['Accepted', 'OK', 'AcceptedOffline', 'Available'];
  for (const p of prefer) if (values.includes(p)) return p;
  return values[0];
}

function _patternExample(pattern) {
  if (typeof pattern !== 'string' || !pattern.length) return '0';
  // common: hex with fixed length
  let m = pattern.match(/^\^\[0-9A-Fa-f\]\{(\d+)\}\$?$/);
  if (m) return 'A'.repeat(Number(m[1]));
  m = pattern.match(/^\^\[0-9a-fA-F\]\{(\d+)\}\$?$/);
  if (m) return 'A'.repeat(Number(m[1]));
  // common: digits fixed length
  m = pattern.match(/^\^\[0-9\]\{(\d+)\}\$?$/);
  if (m) return '0'.repeat(Number(m[1]));
  // simple UUID
  if (pattern.includes('[0-9a-fA-F]') && pattern.includes('-') && pattern.includes('{8}') && pattern.includes('{4}') && pattern.includes('{12}')) {
    return '00000000-0000-0000-0000-000000000000';
  }
  // fallback
  return '0';
}

function _numberExample(schema) {
  if (!schema || typeof schema !== 'object') return 0;
  const isInt = schema.type === 'integer';
  let v = 0;
  if (schema.minimum !== undefined) v = schema.minimum;
  if (schema.exclusiveMinimum !== undefined) v = isInt ? (schema.exclusiveMinimum + 1) : (schema.exclusiveMinimum + 0.000001);
  if (schema.maximum !== undefined) v = Math.min(v, schema.maximum);
  if (schema.exclusiveMaximum !== undefined) v = Math.min(v, isInt ? (schema.exclusiveMaximum - 1) : (schema.exclusiveMaximum - 0.000001));
  if (schema.multipleOf) {
    const m = schema.multipleOf;
    if (m !== 0) v = Math.round(v / m) * m;
  }
  if (isInt) v = Math.trunc(v);
  return v;
}

function _generateFromSchema(schema, root, options, depth, refStack) {
  if (!schema || typeof schema !== 'object') return undefined;
  if (depth > 20) return undefined;
  if (schema.$ref) {
    const ref = schema.$ref;
    if (typeof ref === 'string' && ref.startsWith('#/definitions/')) {
      const name = ref.slice('#/definitions/'.length);
      if (refStack.has(ref)) return undefined;
      const def = root && root.definitions ? root.definitions[name] : undefined;
      refStack.add(ref);
      const v = _generateFromSchema(def, root, options, depth + 1, refStack);
      refStack.delete(ref);
      return v;
    }
    return undefined;
  }
  if (schema.const !== undefined) return schema.const;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum) return _pickEnum(schema.enum, !!(options && options.preferFailure));
  if (schema.oneOf && schema.oneOf.length) return _generateFromSchema(schema.oneOf[0], root, options, depth + 1, refStack);
  if (schema.anyOf && schema.anyOf.length) return _generateFromSchema(schema.anyOf[0], root, options, depth + 1, refStack);
  if (schema.allOf && schema.allOf.length) {
    // merge objects if possible
    const parts = schema.allOf.map(s => _generateFromSchema(s, root, options, depth + 1, refStack)).filter(v => v !== undefined);
    if (parts.every(p => p && typeof p === 'object' && !Array.isArray(p))) {
      return Object.assign({}, ...parts);
    }
    return parts[0];
  }

  let t = schema.type;
  if (Array.isArray(t)) t = t[0];

  switch (t) {
    case 'object': {
      const obj = {};
      const props = schema.properties || {};
      const required = Array.isArray(schema.required) ? schema.required : [];
      for (const k of required) {
        if (Object.prototype.hasOwnProperty.call(props, k)) {
          obj[k] = _generateFromSchema(props[k], root, options, depth + 1, refStack);
        } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
          obj[k] = _generateFromSchema(schema.additionalProperties, root, options, depth + 1, refStack);
        } else {
          obj[k] = undefined;
        }
      }
      // Some schemas use minProperties without required.
      const minProps = Number(schema.minProperties || 0);
      if (minProps > 0 && Object.keys(obj).length < minProps) {
        const keys = Object.keys(props);
        for (const k of keys) {
          if (Object.keys(obj).length >= minProps) break;
          if (obj[k] === undefined) obj[k] = _generateFromSchema(props[k], root, options, depth + 1, refStack);
        }
      }
      return obj;
    }
    case 'array': {
      const min = Number(schema.minItems || 0);
      const items = schema.items || {};
      const arr = [];
      for (let i = 0; i < min; i++) arr.push(_generateFromSchema(items, root, options, depth + 1, refStack));
      return arr;
    }
    case 'string': {
      if (schema.format === 'date-time') return new Date().toISOString();
      if (schema.format === 'uri') return 'http://localhost/';
      if (schema.pattern) {
        const s = _patternExample(schema.pattern);
        if (schema.maxLength && s.length > schema.maxLength) return s.slice(0, schema.maxLength);
        if (schema.minLength && s.length < schema.minLength) return s.padEnd(schema.minLength, '0');
        return s;
      }
      const minLen = Number(schema.minLength || 0);
      const maxLen = schema.maxLength !== undefined ? Number(schema.maxLength) : undefined;
      let s = minLen > 0 ? '0'.repeat(minLen) : '0';
      if (maxLen !== undefined && s.length > maxLen) s = s.slice(0, maxLen);
      return s;
    }
    case 'integer':
    case 'number':
      return _numberExample(schema);
    case 'boolean':
      return false;
    default:
      return undefined;
  }
}

function createAutoResponder(protocol, options = {}) {
  const vendorId = options.vendorId || 'NexoWatt';
  const responseSchemas = _buildResponseSchemaMap(protocol);
  return function autoResponse(action, responseOptions = {}) {
    const schema = responseSchemas.get(action);
    if (!schema) return {};
    const generatorOptions = { vendorId, ...responseOptions };
    const res = _generateFromSchema(schema, schema, generatorOptions, 0, new Set());
    // Ensure required customData.vendorId if customData is present and empty.
    if (res && typeof res === 'object' && !Array.isArray(res) && res.customData && typeof res.customData === 'object') {
      if (!('vendorId' in res.customData)) res.customData.vendorId = vendorId;
    }
    return res || {};
  };
}

// ---- Meter / sampling utilities ----

function _readMeasurand(sample, protocol) {
  if (sample && sample.measurand) return canonicalMeasurand(sample.measurand);
  // OCPP 1.6, 2.0.1 and 2.1 all define an omitted SampledValue measurand as
  // Energy.Active.Import.Register.
  return 'Energy.Active.Import.Register';
}

function _readUnitAndMultiplier(sample, protocol, measurand) {
  if (!sample || typeof sample !== 'object') return { unit: '', multiplier: 0, explicitUnit: false };
  const uom = protocol === 'ocpp1.6' ? {} : (sample.unitOfMeasure || {});
  const explicitUnit = uom.unit || sample.unit;
  const canonicalUnit = canonicalUnitForMeasurand(measurand);
  // A few real stations omit the unit even though they explicitly provide a
  // power/current measurand. Treating such a value as Wh creates a wrong DP and
  // can destabilize load management. Only a fully omitted SampledValue keeps
  // the protocol default Energy.Active.Import.Register in Wh.
  const unit = explicitUnit || canonicalUnit || 'Wh';
  return {
    unit,
    explicitUnit: !!explicitUnit,
    multiplier: Number(protocol === 'ocpp1.6' ? (sample.multiplier || 0) : (uom.multiplier ?? sample.multiplier ?? 0)),
  };
}

function _readNumericValue(sample, protocol, measurand) {
  const { multiplier } = _readUnitAndMultiplier(sample, protocol, measurand);
  const raw = sample && sample.value;
  if (raw === undefined || raw === null || String(raw).trim() === '') return undefined;
  const num = Number(raw);
  const mul = Number(multiplier || 0);
  if (!Number.isFinite(num) || !Number.isFinite(mul)) return undefined;
  const val = num * Math.pow(10, mul);
  return Number.isFinite(val) ? val : undefined;
}

function extractEnergyImportRegisterWh(meterValueArray, protocol) {
  const arr = Array.isArray(meterValueArray) ? meterValueArray : [];
  for (const mv of arr) {
    const samples = (mv && mv.sampledValue) || [];
    for (const sv of samples) {
      const meas = _readMeasurand(sv, protocol);
      if (meas.toLowerCase().includes('energy.active.import.register')) {
        const rawUnit = _readUnitAndMultiplier(sv, protocol, meas).unit;
        const rawVal = _readNumericValue(sv, protocol, meas);
        if (!Number.isFinite(rawVal)) continue;
        const conv = baseUnit(rawVal, rawUnit);
        // We store energy in Wh.
        return Number.isFinite(conv.val) ? conv.val : undefined;
      }
    }
  }
  return undefined;
}

async function _writeState(ctx, id, val, category = 'realtime') {
  if (ctx && typeof ctx.setStateFreshAsync === 'function') {
    return ctx.setStateFreshAsync(id, val, true, category);
  }
  if (ctx && typeof ctx.setStateChangedAsync === 'function') {
    return ctx.setStateChangedAsync(id, val, true);
  }
}

function _metricCategory(measurand, unit) {
  const name = String(measurand || '');
  if (name === 'SoC') return 'soc';
  if (String(unit || '') === 'Wh' || name.toLowerCase().includes('energy')) return 'counter';
  return 'realtime';
}

async function applyMeterValues(ctx, identity, evseId, connectorId, meterValueArray, protocol) {
  if (!ctx || (!ctx.setStateFreshAsync && !ctx.setStateChangedAsync) || !ctx.states) return;
  const id = identity;
  const arr = Array.isArray(meterValueArray) ? meterValueArray : [];
  let connectorBase;
  if (typeof ctx.states.ensureConnectorStructure === 'function') {
    connectorBase = await ctx.states.ensureConnectorStructure(id, evseId, connectorId);
  } else if (typeof ctx.states.connectorBase === 'function') {
    connectorBase = ctx.states.connectorBase(id, evseId, connectorId);
  }

  const phasesSeen = new Set();
  const phaseTotals = new Map(); // measurand -> {unit, values: Map(phase,value)}
  const totalSeen = new Set();
  let latestTs = '';
  let latestTsMs = 0;
  let validSampleCount = 0;
  let flowSampleCount = 0;
  let nonZeroActualFlowSampleCount = 0;
  let activeImportPowerSampleCount = 0;
  let activeExportPowerSampleCount = 0;
  let currentSampleCount = 0;
  let socSampleCount = 0;
  let latestSocTs = '';
  const receivedAt = Date.now();

  const ensureMeasurement = async (measurand, phase, unit) => {
    const definition = measurementDefinition(measurand, phase);
    if (typeof ctx.states.ensureMeasurementState === 'function') {
      return { id: await ctx.states.ensureMeasurementState(id, definition.key, unit || definition.unit, definition), definition };
    }
    const aggName = AGGREGATES[String(measurand)];
    if (!aggName || typeof ctx.states.ensureAggState !== 'function') return { id: undefined, definition };
    const phaseKey = phase ? String(phase).replace(/[^A-Za-z0-9]+/g, '') : '';
    return { id: await ctx.states.ensureAggState(id, phaseKey ? `${aggName}_${phaseKey}` : aggName, unit), definition };
  };

  for (const mv of arr) {
    const ts = (mv && mv.timestamp) || new Date().toISOString();
    const parsedTs = Date.parse(ts);
    if (Number.isFinite(parsedTs) && parsedTs >= latestTsMs) {
      latestTsMs = parsedTs;
      latestTs = ts;
    } else if (!latestTs) {
      latestTs = ts;
    }
    if (connectorBase) {
      const connectorTsId = connectorBase.endsWith('.meter') ? `${connectorBase}.lastTs` : `${connectorBase}.lastUpdate`;
      await _writeState(ctx, connectorTsId, ts, 'status');
    }
    if (typeof ctx.states.ensureMeasurementState === 'function') {
      const stationTsId = await ctx.states.ensureTextMeasurementState(id, 'lastUpdate', 'Letzte Messwertaktualisierung', 'value.time');
      await _writeState(ctx, stationTsId, ts, 'status');
    }

    const samples = (mv && mv.sampledValue) || [];
    for (const sv of samples) {
      const measurand = _readMeasurand(sv, protocol);
      const rawUnit = _readUnitAndMultiplier(sv, protocol, measurand).unit;
      const rawVal = _readNumericValue(sv, protocol, measurand);
      if (!Number.isFinite(rawVal)) continue;
      const conv = baseUnit(rawVal, rawUnit);
      if (!Number.isFinite(conv.val)) continue;

      validSampleCount++;
      const measurandName = String(measurand);
      if (/^(?:Power\.(?:Active|Reactive)\.(?:Import|Export)|Current\.(?:Import|Export))$/.test(measurandName)) {
        flowSampleCount++;
        if (Math.abs(conv.val) > 1e-9) nonZeroActualFlowSampleCount++;
      }
      if (measurandName === 'Power.Active.Import') activeImportPowerSampleCount++;
      if (measurandName === 'Power.Active.Export') activeExportPowerSampleCount++;
      if (/^Current\.(?:Import|Export)$/.test(measurandName)) currentSampleCount++;
      if (measurandName === 'SoC') {
        socSampleCount++;
        latestSocTs = ts;
      }

      const unit = conv.unit || rawUnit || '';
      const category = _metricCategory(measurand, unit);
      const phase = sv && sv.phase;
      const { id: measurementId, definition } = await ensureMeasurement(measurandName, phase, unit);
      if (measurementId) await _writeState(ctx, measurementId, conv.val, category);

      if (unit === 'Wh' && String(measurand).toLowerCase().includes('energy')) {
        let kwhId;
        if (typeof ctx.states.ensureMeasurementState === 'function' && definition.kwhKey) {
          kwhId = await ctx.states.ensureMeasurementState(id, definition.kwhKey, 'kWh', {
            ...definition,
            key: definition.kwhKey,
            kwhKey: undefined,
            unit: 'kWh',
          });
        } else if (typeof ctx.states.ensureAggState === 'function') {
          const aggName = AGGREGATES[measurandName];
          const phaseKey = phase ? String(phase).replace(/[^A-Za-z0-9]+/g, '') : '';
          if (aggName) kwhId = await ctx.states.ensureAggState(id, `${phaseKey ? `${aggName}_${phaseKey}` : aggName}_kWh`, 'kWh');
        }
        if (kwhId) await _writeState(ctx, kwhId, conv.val / 1000, 'counter');
      }

      // Connector-specific values are intentionally flat. They are optional,
      // because the EOS control loop normally consumes the station aggregate.
      if (typeof ctx.states.ensureMetricState === 'function') {
        const key = normalizeKey(measurand, phase, sv && sv.location, sv && sv.context);
        const connectorMetricId = await ctx.states.ensureMetricState(id, evseId, connectorId, key, unit, {
          measurand: measurandName,
          phase,
          definition,
        });
        if (connectorMetricId) await _writeState(ctx, connectorMetricId, conv.val, category);
      }

      const phaseKey = canonicalPhase(phase);
      const phaseAggregateMetric = (/^Power\./.test(measurandName) && measurandName !== 'Power.Factor') || /^Current\./.test(measurandName);
      if (phaseAggregateMetric) {
        if (!phaseKey) {
          totalSeen.add(measurandName);
        } else {
          if (!phaseTotals.has(measurandName)) phaseTotals.set(measurandName, { unit, values: new Map() });
          phaseTotals.get(measurandName).values.set(phaseKey, conv.val);
          if (ctx.runtime && typeof ctx.runtime.recordPhaseMetric === 'function') {
            ctx.runtime.recordPhaseMetric(id, evseId, connectorId, measurandName, phaseKey, conv.val, unit, receivedAt);
          }
        }
      }

      if (connectorBase && measurandName.toLowerCase().includes('energy.active.import.register')) {
        const lastWhId = connectorBase.endsWith('.meter') ? `${connectorBase}.lastWh` : `${connectorBase}.energyWh`;
        const lastKWhId = connectorBase.endsWith('.meter') ? `${connectorBase}.lastKWh` : `${connectorBase}.energyKWh`;
        await _writeState(ctx, lastWhId, conv.val, 'counter');
        await _writeState(ctx, lastKWhId, conv.val / 1000, 'counter');
      }
      if (phase) phasesSeen.add(String(phase));
    }
  }

  // Derive total active power/current when a station only reports phases.
  for (const [measurand, data] of phaseTotals.entries()) {
    if (totalSeen.has(measurand)) continue;
    let derived;
    if (ctx.runtime && typeof ctx.runtime.getPhaseMetricTotal === 'function') {
      derived = ctx.runtime.getPhaseMetricTotal(id, evseId, connectorId, measurand);
    }
    if (!derived || !Number.isFinite(derived.value)) {
      derived = {
        value: aggregatePhaseValues(measurand, data.values.values()),
        unit: data.unit,
      };
    }
    if (Number.isFinite(derived.value)) {
      const { id: totalId } = await ensureMeasurement(measurand, '', derived.unit || data.unit || '');
      if (totalId) await _writeState(ctx, totalId, derived.value, 'realtime');
    }
  }

  const ps = [...phasesSeen];
  if (ps.length > 0) {
    let n = 1;
    if (ps.some((phase) => /L3/i.test(phase))) n = 3;
    else if (ps.some((phase) => /L2/i.test(phase))) n = 2;
    await _writeState(ctx, `${id}.transactions.numberPhases`, n, 'status');
  }

  if (validSampleCount > 0 && ctx.runtime && typeof ctx.runtime.noteMeterValue === 'function') {
    await ctx.runtime.noteMeterValue(id, evseId, connectorId, latestTs || new Date().toISOString(), {
      hasPower: activeImportPowerSampleCount > 0,
      hasExportPower: activeExportPowerSampleCount > 0,
      hasCurrent: currentSampleCount > 0,
      hasActualFlow: flowSampleCount > 0,
      hasNonZeroActualFlow: nonZeroActualFlowSampleCount > 0,
    });
  }
  if (socSampleCount > 0 && ctx.runtime && typeof ctx.runtime.noteSoc === 'function') {
    await ctx.runtime.noteSoc(id, latestSocTs || latestTs || new Date().toISOString());
  }
}

function _findVinDeep(obj, depth = 0) {
  if (depth > 6) return undefined;
  if (!obj) return undefined;
  if (typeof obj === 'string') {
    // Sometimes VIN is embedded in a text.
    const m = obj.match(/\b([A-HJ-NPR-Z0-9]{17})\b/);
    if (m) return m[1];
    return undefined;
  }
  if (typeof obj !== 'object') return undefined;
  if (Array.isArray(obj)) {
    for (const it of obj) {
      const v = _findVinDeep(it, depth + 1);
      if (v) return v;
    }
    return undefined;
  }
  for (const [k, v] of Object.entries(obj)) {
    if (typeof k === 'string' && k.toLowerCase() === 'vin') {
      const s = typeof v === 'string' ? v.trim() : undefined;
      if (s && /[A-HJ-NPR-Z0-9]{17}/.test(s)) return s.match(/[A-HJ-NPR-Z0-9]{17}/)[0];
    }
    const found = _findVinDeep(v, depth + 1);
    if (found) return found;
  }
  return undefined;
}

module.exports = {
  AGGREGATES,
  baseUnit,
  normalizeKey,
  createAutoResponder,
  getAllRequestActions: _getAllRequestActions,
  applyMeterValues,
  extractEnergyImportRegisterWh,
  findVinInPayload: _findVinDeep,
};
