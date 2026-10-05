'use strict';

const { createLicenseGuard, LicenseError } = require('./eos-license-client');
const { performance } = require('node:perf_hooks');

const INVENTORY_MAX_AGE_MS = 10_000;
const INVENTORY_TIMEOUT_MS = 2_000;
const INSTANCE = /^system\.adapter\.nexowatt-devices\.(?:0|[1-9][0-9]*)$/;
const CLASSES = new Set(['evCharger', 'storageSystem', 'battery', 'batteryInverter', 'solarCharger', 'generic', 'heat', 'io', 'meter', 'pvInverter']);

function fail() { throw new LicenseError('INVENTORY_UNAVAILABLE'); }

function devicesFromConfig(config) {
  if (!config || typeof config !== 'object') return fail();
  if (Array.isArray(config.devices)) return config.devices;
  if (typeof config.devicesJson === 'string') {
    try { const devices = JSON.parse(config.devicesJson); if (Array.isArray(devices)) return devices; } catch (_) {}
  }
  return fail();
}

function inventorySignature(devices) {
  return JSON.stringify(devices.map(d => d && [d.id, d.templateId, d.protocol, d.enabled !== false]));
}

function countInventory(objects, templates, namespace, localDevices) {
  if (!objects || typeof objects !== 'object' || Array.isArray(objects)) return fail();
  if (Object.keys(objects).length > 1000) return fail();
  const ownId = `system.adapter.${namespace}`;
  if (!Object.hasOwn(objects, ownId)) return fail();
  const required = { chargePoints: 0, batteries: 0 };
  for (const [id, object] of Object.entries(objects)) {
    if (!INSTANCE.test(id)) continue;
    if (!object || object.type !== 'instance' || !object.native || !object.common) return fail();
    const devices = devicesFromConfig(object.native);
    if (devices.length > 4096) return fail();
    // A running instance must restart after an inventory configuration change.
    if (id === ownId && inventorySignature(devices) !== inventorySignature(localDevices)) return fail();
    const ids = new Set();
    for (const device of devices) {
      if (!device || typeof device !== 'object' || typeof device.id !== 'string' || !device.id
          || ids.has(device.id) || (device.enabled !== undefined && typeof device.enabled !== 'boolean')) return fail();
      ids.add(device.id);
      if (device.enabled === false) continue;
      const template = templates[device.templateId];
      const deviceClass = template?.aliasContract?.deviceClass;
      if (!template || !CLASSES.has(deviceClass)) return fail();
      if (deviceClass === 'evCharger') required.chargePoints += 1;
      if (['storageSystem', 'battery', 'batteryInverter'].includes(deviceClass)) required.batteries += 1;
    }
  }
  if (required.chargePoints > 1000 || required.batteries > 10) return fail();
  return required;
}

function createInventoryLicenseGuard(adapter, templates, localDevices, onLost) {
  let guard = null;
  let signature = '';
  let checkedAt = -Infinity;
  let pending = null;
  let databaseRead = null;
  let timer = null;
  let stopped = false;
  let generation = 0;
  let code = 'NOT_CHECKED';

  function invalidate(reason = 'INVENTORY_CHANGED') {
    checkedAt = -Infinity;
    generation += 1;
    code = reason;
    onLost({ code });
  }

  function isAllowed() {
    if (stopped || performance.now() - checkedAt >= INVENTORY_MAX_AGE_MS) {
      if (checkedAt !== -Infinity) invalidate('INVENTORY_STALE');
      return false;
    }
    const allowed = !!guard && guard.isAllowed();
    if (!allowed && guard) code = guard.getStatus().code;
    return allowed;
  }

  async function check() {
    const checkGeneration = generation;
    let timeout;
    try {
      // ioBroker DB promises have no cancellation API. Keep a timed-out read
      // single-flight until it settles; never accumulate abandoned requests.
      if (databaseRead) throw new LicenseError('INVENTORY_BUSY');
      databaseRead = Promise.resolve().then(() => adapter.getForeignObjectsAsync('system.adapter.nexowatt-devices.*', 'instance'))
        .finally(() => { databaseRead = null; });
      const objects = await Promise.race([
        databaseRead,
        new Promise((_, reject) => { timeout = setTimeout(() => reject(new LicenseError('INVENTORY_TIMEOUT')), INVENTORY_TIMEOUT_MS); }),
      ]);
      if (stopped || generation !== checkGeneration) return false;
      const required = countInventory(objects, templates, adapter.namespace, localDevices);
      const nextSignature = JSON.stringify(required);
      if (!guard || nextSignature !== signature) {
        if (guard) await guard.stop();
        guard = createLicenseGuard(adapter, { feature: 'energy', required, onLost });
        signature = nextSignature;
      }
      const valid = await guard.refresh();
      if (stopped || generation !== checkGeneration) return false;
      checkedAt = performance.now();
      code = guard.getStatus().code;
      return valid && isAllowed();
    } catch (_) {
      invalidate('INVENTORY_UNAVAILABLE');
      if (guard) await guard.stop();
      guard = null;
      return false;
    } finally { clearTimeout(timeout); }
  }

  function refresh() {
    if (stopped) return Promise.resolve(false);
    if (!pending) pending = check().finally(() => { pending = null; });
    return pending;
  }

  return Object.freeze({
    async start() {
      if (!timer && !stopped) { timer = setInterval(() => { void refresh(); }, 5000); timer.unref?.(); }
      return refresh();
    },
    refresh, invalidate, isAllowed,
    assertAllowed() { if (!isAllowed()) throw new LicenseError(code); guard.assertAllowed(); },
    getStatus() { return isAllowed() ? guard.getStatus() : { valid: false, code }; },
    async stop() { stopped = true; clearInterval(timer); timer = null; invalidate('STOPPED'); if (guard) await guard.stop(); },
  });
}

module.exports = { createInventoryLicenseGuard, countInventory, devicesFromConfig };
