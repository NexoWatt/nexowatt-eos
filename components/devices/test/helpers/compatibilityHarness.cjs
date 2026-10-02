'use strict';

const crypto = require('node:crypto');
const Module = require('node:module');

function loadDeviceRuntime(modulePath) {
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'modbus-serial') return class ModbusRTU {};
    if (request === 'serialport') return { SerialPort: class SerialPort {} };
    if (request === 'mqtt') return { connect() { throw new Error('not used in compatibility test'); } };
    if (request === 'axios') return {};
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    delete require.cache[require.resolve(modulePath)];
    return require(modulePath).DeviceRuntime;
  } finally {
    Module._load = originalLoad;
  }
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = stableValue(value[key]);
    return out;
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

function sha256(value) {
  const input = typeof value === 'string' ? value : stableStringify(value);
  return crypto.createHash('sha256').update(input).digest('hex');
}

function normalizeFunction(fn) {
  if (typeof fn !== 'function') return null;
  return fn.toString().replace(/\s+/g, ' ').trim();
}

function templateCompatibilityHash(template) {
  const copy = structuredClone(template);
  delete copy.aliasContract;
  return sha256(copy);
}

function buildRuntime(DeviceRuntime, template, id = 'compat') {
  const adapter = { log: { debug() {}, info() {}, warn() {}, error() {} } };
  const runtime = new DeviceRuntime(adapter, {
    id,
    templateId: template.id,
    category: template.category,
    manufacturer: template.manufacturer,
    connection: {},
  }, template, {});

  for (const dp of template.datapoints || []) {
    runtime.dpById.set(dp.id, dp);
    runtime.dpByStateRelId.set(runtime.relStateId(dp), dp);
  }
  return runtime;
}

function extractLegacyPath(relId) {
  const text = String(relId || '');
  const marker = '.aliases.';
  const index = text.indexOf(marker);
  if (index < 0) return '';
  return text.slice(index + marker.length);
}

function legacyAliasDescriptor(def) {
  return {
    path: extractLegacyPath(def.relId),
    name: def.name || '',
    role: def.role || '',
    type: def.type || '',
    unit: def.unit || '',
    rw: def.rw || '',
    kind: def.kind || '',
    dpId: def.dpId || '',
    writeDpId: def.writeDpId || '',
    mirrorSignedDpId: def.mirrorSignedDpId || '',
    commandOnlyAlias: def.commandOnlyAlias === true,
    compatibilityAlias: def.compatibilityAlias === true,
    fromDevice: sha256(normalizeFunction(def.fromDevice)),
    toDevice: sha256(normalizeFunction(def.toDevice)),
    get: sha256(normalizeFunction(def.get)),
    toMirrorDevice: sha256(normalizeFunction(def.toMirrorDevice)),
  };
}

function legacyAliasCompatibility(DeviceRuntime, template) {
  const runtime = buildRuntime(DeviceRuntime, template);
  const definitions = runtime._buildAliasDefinitions()
    .filter((def) => {
      const path = extractLegacyPath(def && def.relId);
      return path && !path.startsWith('v1.') && !path.startsWith('meta.');
    })
    .map(legacyAliasDescriptor)
    .sort((left, right) => left.path.localeCompare(right.path));

  return {
    count: definitions.length,
    hash: sha256(definitions),
  };
}

module.exports = {
  loadDeviceRuntime,
  stableStringify,
  sha256,
  templateCompatibilityHash,
  buildRuntime,
  extractLegacyPath,
  legacyAliasCompatibility,
};
