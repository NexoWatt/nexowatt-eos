'use strict';

const contract = require('./alias-contract-v1.json');

const STANDARD_NAMESPACE = String(contract.namespace || 'v1');
const SCHEMA_VERSION = Number(contract.schemaVersion || 1);

function normalizeCategory(value) {
  return String(value || '').trim().toUpperCase();
}

function getDeviceClass(template, cfg) {
  const explicit = template && template.aliasContract && template.aliasContract.deviceClass;
  if (explicit) return String(explicit);

  const category = normalizeCategory((template && template.category) || (cfg && cfg.category));
  return contract.categoryToDeviceClass[category] || 'generic';
}

function canonicalAliasPath(deviceClass, aliasPath) {
  const path = String(aliasPath || '');
  if (!path) return '';
  const classAliases = contract.pathAliases && contract.pathAliases[deviceClass];
  return (classAliases && classAliases[path]) ? String(classAliases[path]) : path;
}

function extractAliasPath(relId) {
  const text = String(relId || '');
  const marker = '.aliases.';
  const idx = text.indexOf(marker);
  if (idx < 0) return '';
  return text.slice(idx + marker.length);
}

function legacyAliasPath(relId) {
  const path = extractAliasPath(relId);
  if (path.startsWith(`${STANDARD_NAMESPACE}.`)) {
    return path.slice(STANDARD_NAMESPACE.length + 1);
  }
  return path;
}

function getAliasSpec(deviceClass, aliasPath) {
  const path = canonicalAliasPath(deviceClass, aliasPath);
  if (!path || path.startsWith('meta.')) return null;

  const commonRequired = contract.common && contract.common.required ? contract.common.required : {};
  const commonOptional = contract.common && contract.common.optional ? contract.common.optional : {};
  if (commonRequired[path]) return { ...commonRequired[path], required: true, scope: 'common' };
  if (commonOptional[path]) return { ...commonOptional[path], required: false, scope: 'common' };

  const classDef = contract.deviceClasses && contract.deviceClasses[deviceClass];
  if (!classDef) return null;

  if (classDef.required && classDef.required[path]) {
    return { ...classDef.required[path], required: true, scope: deviceClass };
  }
  if (classDef.optional && classDef.optional[path]) {
    return { ...classDef.optional[path], required: false, scope: deviceClass };
  }

  if (Array.isArray(classDef.patterns)) {
    for (const patternDef of classDef.patterns) {
      if (!patternDef || !patternDef.pattern) continue;
      try {
        const re = new RegExp(patternDef.pattern);
        if (re.test(path)) return { ...patternDef, required: false, scope: deviceClass, pattern: patternDef.pattern };
      } catch (_) {
        // Invalid patterns are caught by release tests. Runtime must remain resilient.
      }
    }
  }

  return null;
}

function normalizeUnitKey(unit) {
  const raw = String(unit || '').trim();
  if (!raw) return '';
  return raw
    .replace(/\s+/g, '')
    .replace(/,/g, '.')
    .replace(/º/g, '°')
    .toLowerCase();
}

function unitDimension(unit) {
  const key = normalizeUnitKey(unit);
  if (!key) return null;

  const dimensions = {
    power: new Set(['mw', 'w', 'kw', 'mwatt', 'megawatt']),
    energy: new Set(['0.1wh', '0.01wh', 'wh', 'kwh', 'mwh']),
    current: new Set(['ma', 'a', 'ka']),
    voltage: new Set(['mv', 'v', 'kv']),
    temperature: new Set(['°c', 'c', 'degc', 'celsius', 'k', 'kelvin']),
    duration: new Set(['ms', 's', 'sec', 'second', 'seconds', 'min', 'minute', 'minutes', 'h', 'hr', 'hour', 'hours']),
    percentage: new Set(['%', 'pct', 'percent', 'percentage', 'pu', 'p.u.', 'ratio']),
    frequency: new Set(['hz', 'khz']),
    phases: new Set(['phase', 'phases']),
  };

  for (const [dimension, values] of Object.entries(dimensions)) {
    if (values.has(key)) return dimension;
  }
  return null;
}

function toBase(value, unit) {
  if (value === null || value === undefined) return value;
  const n = Number(value);
  if (!Number.isFinite(n)) return value;

  const key = normalizeUnitKey(unit);
  switch (key) {
    // power -> W
    case 'mw': return n / 1000;
    case 'w': return n;
    case 'kw': return n * 1000;
    case 'mwatt':
    case 'megawatt': return n * 1000000;

    // energy -> Wh
    case '0.01wh': return n * 0.01;
    case '0.1wh': return n * 0.1;
    case 'wh': return n;
    case 'kwh': return n * 1000;
    case 'mwh': return n * 1000000;

    // current -> A
    case 'ma': return n / 1000;
    case 'a': return n;
    case 'ka': return n * 1000;

    // voltage -> V
    case 'mv': return n / 1000;
    case 'v': return n;
    case 'kv': return n * 1000;

    // temperature -> °C
    case '°c':
    case 'c':
    case 'degc':
    case 'celsius': return n;
    case 'k':
    case 'kelvin': return n - 273.15;

    // duration -> s
    case 'ms': return n / 1000;
    case 's':
    case 'sec':
    case 'second':
    case 'seconds': return n;
    case 'min':
    case 'minute':
    case 'minutes': return n * 60;
    case 'h':
    case 'hr':
    case 'hour':
    case 'hours': return n * 3600;

    // percentage -> %
    case '%':
    case 'pct':
    case 'percent':
    case 'percentage': return n;
    case 'pu':
    case 'p.u.':
    case 'ratio': return n * 100;

    // frequency -> Hz
    case 'hz': return n;
    case 'khz': return n * 1000;

    // phases
    case 'phase':
    case 'phases': return n;
    default: return n;
  }
}

function fromBase(value, unit) {
  if (value === null || value === undefined) return value;
  const n = Number(value);
  if (!Number.isFinite(n)) return value;

  const key = normalizeUnitKey(unit);
  switch (key) {
    // W -> power target
    case 'mw': return n * 1000;
    case 'w': return n;
    case 'kw': return n / 1000;
    case 'mwatt':
    case 'megawatt': return n / 1000000;

    // Wh -> energy target
    case '0.01wh': return n / 0.01;
    case '0.1wh': return n / 0.1;
    case 'wh': return n;
    case 'kwh': return n / 1000;
    case 'mwh': return n / 1000000;

    // A -> current target
    case 'ma': return n * 1000;
    case 'a': return n;
    case 'ka': return n / 1000;

    // V -> voltage target
    case 'mv': return n * 1000;
    case 'v': return n;
    case 'kv': return n / 1000;

    // °C -> temperature target
    case '°c':
    case 'c':
    case 'degc':
    case 'celsius': return n;
    case 'k':
    case 'kelvin': return n + 273.15;

    // s -> duration target
    case 'ms': return n * 1000;
    case 's':
    case 'sec':
    case 'second':
    case 'seconds': return n;
    case 'min':
    case 'minute':
    case 'minutes': return n / 60;
    case 'h':
    case 'hr':
    case 'hour':
    case 'hours': return n / 3600;

    // % -> percentage target
    case '%':
    case 'pct':
    case 'percent':
    case 'percentage': return n;
    case 'pu':
    case 'p.u.':
    case 'ratio': return n / 100;

    // Hz -> frequency target
    case 'hz': return n;
    case 'khz': return n / 1000;

    case 'phase':
    case 'phases': return n;
    default: return n;
  }
}

function convertUnitValue(value, fromUnit, toUnit) {
  if (value === null || value === undefined) return value;
  const fromKey = normalizeUnitKey(fromUnit);
  const toKey = normalizeUnitKey(toUnit);
  if (!fromKey || !toKey || fromKey === toKey) return value;

  const fromDimension = unitDimension(fromUnit);
  const toDimension = unitDimension(toUnit);
  if (!fromDimension || !toDimension || fromDimension !== toDimension) return value;

  return fromBase(toBase(value, fromUnit), toUnit);
}

function cloneStandardDefinition(def, options) {
  const {
    baseId,
    deviceClass,
    getDpById,
    standardNamespace = STANDARD_NAMESPACE,
    canonicalPath,
  } = options || {};

  const sourcePath = canonicalAliasPath(
    deviceClass,
    canonicalPath || legacyAliasPath(def && def.relId),
  );
  const spec = getAliasSpec(deviceClass, sourcePath);
  if (!def || !sourcePath || !spec) return null;

  const clone = { ...def };
  clone.relId = `${baseId}.aliases.${standardNamespace}.${sourcePath}`;
  clone.aliasContractVersion = SCHEMA_VERSION;
  clone.aliasContractPath = sourcePath;
  clone.capability = spec.capability;
  clone.type = spec.type || clone.type;
  clone.role = spec.role || clone.role;

  const readDp = clone.dpId && typeof getDpById === 'function' ? getDpById(clone.dpId) : null;
  const writeDpId = clone.writeDpId || clone.dpId;
  const writeDp = writeDpId && typeof getDpById === 'function' ? getDpById(writeDpId) : null;

  const oldFrom = clone.fromDevice;
  const oldTo = clone.toDevice;
  const oldGet = clone.get;
  const semanticUnit = clone.unit || null;
  const readUnit = oldFrom ? semanticUnit : ((readDp && readDp.unit) || semanticUnit);
  const writeUnit = oldTo ? semanticUnit : ((writeDp && writeDp.unit) || semanticUnit);
  const canonicalUnit = spec.unit || semanticUnit;

  if (canonicalUnit) {
    clone.unit = canonicalUnit;

    if (clone.kind === 'computed' && typeof oldGet === 'function' && readUnit) {
      clone.get = (values, ctx) => convertUnitValue(oldGet(values, ctx), readUnit, canonicalUnit);
    } else if (clone.kind === 'dp' && readUnit) {
      clone.fromDevice = (raw) => {
        const semantic = typeof oldFrom === 'function' ? oldFrom(raw) : raw;
        if (semantic === undefined) return undefined;
        return convertUnitValue(semantic, readUnit, canonicalUnit);
      };
    }

    if ((clone.rw === 'rw' || clone.rw === 'wo') && writeUnit) {
      clone.toDevice = (value) => {
        const semantic = convertUnitValue(value, canonicalUnit, writeUnit);
        return typeof oldTo === 'function' ? oldTo(semantic) : semantic;
      };
    }
  }

  return clone;
}

function findDefinitionByPath(defs, aliasPath) {
  const wanted = String(aliasPath || '');
  return (defs || []).find(def => legacyAliasPath(def && def.relId) === wanted) || null;
}

function createPhaseCurrentFallback(defs, baseId) {
  const phaseDefs = ['r.currentL1', 'r.currentL2', 'r.currentL3']
    .map(path => findDefinitionByPath(defs, path))
    .filter(Boolean);
  if (!phaseDefs.length) return null;

  return {
    relId: `${baseId}.aliases.r.currentA`,
    name: 'Actual current (highest phase)',
    role: 'value.current',
    type: 'number',
    unit: 'A',
    rw: 'ro',
    kind: 'computed',
    get: (values) => {
      const candidates = [];
      for (const def of phaseDefs) {
        if (!def || def.kind !== 'dp' || !def.dpId) continue;
        if (!values || !Object.prototype.hasOwnProperty.call(values, def.dpId)) continue;
        let value = values[def.dpId];
        if (typeof def.fromDevice === 'function') value = def.fromDevice(value);
        const n = Number(value);
        if (Number.isFinite(n) && n >= 0) candidates.push(n);
      }
      return candidates.length ? Math.max(...candidates) : undefined;
    },
  };
}

function createLegacyCanonicalSynonyms(defs, options) {
  const { baseId, deviceClass } = options || {};
  const additions = [];
  const has = path => !!findDefinitionByPath(defs.concat(additions), path);
  const cloneAs = (sourcePath, targetPath, name) => {
    const source = findDefinitionByPath(defs.concat(additions), sourcePath);
    if (!source || has(targetPath)) return;
    additions.push({
      ...source,
      relId: `${baseId}.aliases.${targetPath}`,
      name: name || source.name,
      compatibilityAlias: true,
    });
  };

  if (deviceClass === 'evCharger') {
    cloneAs('ctrl.chargeEnable', 'ctrl.run', 'Run / charging release');
    cloneAs('ctrl.stationEnable', 'ctrl.run', 'Run / charging release');
    cloneAs('r.appliedCurrentLimitA', 'r.currentLimitA', 'Applied current limit');
    cloneAs('r.currentTotalA', 'r.currentA', 'Actual charging current');

    if (!has('r.currentA')) {
      const fallback = createPhaseCurrentFallback(defs.concat(additions), baseId);
      if (fallback) additions.push(fallback);
    }
  }

  return additions;
}

function buildStandardAliasDefinitions(options) {
  const {
    baseId,
    template,
    cfg,
    legacyDefs,
    getDpById,
  } = options || {};

  const deviceClass = getDeviceClass(template, cfg);
  const standardDefs = [];
  const seen = new Set();

  for (const def of legacyDefs || []) {
    const path = legacyAliasPath(def && def.relId);
    if (!path || path.startsWith(`${STANDARD_NAMESPACE}.`) || path.startsWith('meta.')) continue;
    const normalized = cloneStandardDefinition(def, {
      baseId,
      deviceClass,
      getDpById,
      standardNamespace: STANDARD_NAMESPACE,
    });
    if (!normalized || seen.has(normalized.relId)) continue;
    seen.add(normalized.relId);
    standardDefs.push(normalized);
  }

  const capabilities = new Set([
    'read.online',
    'read.heartbeat',
    'read.lastSeenMs',
  ]);
  for (const def of standardDefs) {
    if (def.capability) capabilities.add(def.capability);
  }

  const required = [];
  const commonRequired = contract.common && contract.common.required ? Object.keys(contract.common.required) : [];
  required.push(...commonRequired);
  const classDef = contract.deviceClasses && contract.deviceClasses[deviceClass];
  if (classDef && classDef.required) required.push(...Object.keys(classDef.required));

  const presentPaths = new Set(standardDefs.map(def => legacyAliasPath(def.relId)));
  presentPaths.add('r.online');
  presentPaths.add('r.heartbeat');
  presentPaths.add('r.lastSeenMs');
  const missingRequired = required.filter(path => !presentPaths.has(path));

  return {
    schemaVersion: SCHEMA_VERSION,
    namespace: STANDARD_NAMESPACE,
    deviceClass,
    definitions: standardDefs,
    capabilities: Array.from(capabilities).sort(),
    missingRequired,
  };
}

function buildManifest(info, template, cfg) {
  const safeInfo = info || {};
  return {
    schemaVersion: SCHEMA_VERSION,
    namespace: STANDARD_NAMESPACE,
    standardPath: `aliases.${STANDARD_NAMESPACE}`,
    deviceClass: safeInfo.deviceClass || getDeviceClass(template, cfg),
    templateId: String((cfg && cfg.templateId) || (template && template.id) || ''),
    category: String((template && template.category) || (cfg && cfg.category) || ''),
    manufacturer: String((template && template.manufacturer) || (cfg && cfg.manufacturer) || ''),
    model: String((template && template.model) || ''),
    capabilities: Array.isArray(safeInfo.capabilities) ? safeInfo.capabilities.slice().sort() : [],
    missingRequired: Array.isArray(safeInfo.missingRequired) ? safeInfo.missingRequired.slice().sort() : [],
  };
}

function mergeStandardDefinition(info, definition) {
  if (!info || !definition) return info;

  if (!Array.isArray(info.definitions)) info.definitions = [];
  if (!info.definitions.some(def => def && def.relId === definition.relId)) {
    info.definitions.push(definition);
  }

  const capabilities = new Set(Array.isArray(info.capabilities) ? info.capabilities : []);
  if (definition.capability) capabilities.add(definition.capability);
  info.capabilities = Array.from(capabilities).sort();

  const path = legacyAliasPath(definition.relId);
  if (Array.isArray(info.missingRequired) && path) {
    info.missingRequired = info.missingRequired.filter(requiredPath => requiredPath !== path);
  }

  return info;
}

module.exports = {
  contract,
  SCHEMA_VERSION,
  STANDARD_NAMESPACE,
  getDeviceClass,
  canonicalAliasPath,
  getAliasSpec,
  extractAliasPath,
  legacyAliasPath,
  normalizeUnitKey,
  unitDimension,
  convertUnitValue,
  cloneStandardDefinition,
  createLegacyCanonicalSynonyms,
  buildStandardAliasDefinitions,
  buildManifest,
  mergeStandardDefinition,
};
