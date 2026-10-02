#!/usr/bin/env node
'use strict';

/**
 * RC77 – PV forecast stateCache bridge and restart recovery.
 *
 * Offline regression coverage:
 * - provider loading/success/failure states reach the customer UI cache,
 * - the Open-Meteo GTI request contract remains intact,
 * - recent persisted curves survive restart and temporary provider failure,
 * - expired/exhausted curves are rejected and cannot influence EMS planning,
 * - source aliases and string booleans remain backward compatible,
 * - unchanged effective forecast states still prime stateCache,
 * - main dynamically subscribes/primes forecast.* and maps local IDs,
 * - browser cache-busting and timestamp-derived age display are active.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { EventEmitter } = require('node:events');

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const { startOpenMeteoPvForecastRuntime } = require('../ems/services/open-meteo-pv-forecast');
const { PvForecastModule } = require('../ems/modules/pv-forecast');

const QUARTER = 15 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const TWO_HOURS = 2 * HOUR;

function futureMinutelyFixture(now) {
  const first = Math.floor(now / QUARTER) * QUARTER;
  const time = [];
  const globalTiltedIrradiance = [];
  const temperature = [];
  for (let index = 0; index < 192; index += 1) {
    const ts = first + index * QUARTER;
    const hour = new Date(ts).getUTCHours() + new Date(ts).getUTCMinutes() / 60;
    const sun = Math.max(0, Math.sin(Math.PI * (hour - 5) / 14));
    time.push(Math.floor(ts / 1000));
    globalTiltedIrradiance.push(Math.round(900 * sun * 1000) / 1000);
    temperature.push(18 + 10 * sun);
  }
  // The 48-hour fixture always contains daylight, but retain a deterministic
  // positive point as an additional guard for unusual clock environments.
  if (!globalTiltedIrradiance.some((value) => value > 0)) globalTiltedIrradiance[4] = 600;
  return {
    minutely_15: {
      time,
      global_tilted_irradiance: globalTiltedIrradiance,
      temperature_2m: temperature,
    },
  };
}

function defaultSettings() {
  return {
    weatherEnabled: true,
    openMeteoPvEnabled: true,
    forecastSourceMode: 'auto',
    openMeteoLatitude: 0,
    openMeteoLongitude: 0,
    openMeteoTimezone: 'auto',
    forecastUpdateIntervalMin: 30,
    forecastHorizonHours: 48,
    pvForecastPlanningSafetyPct: 85,
    pvForecastInstalledKwp: 0,
    pvForecastTiltDeg: 30,
    pvForecastAzimuthDeg: 0,
    pvForecastLossPercent: 14,
    pvForecastInverterLimitW: 0,
    pvForecastArrays: JSON.stringify([
      { name: 'Süddach', kwp: 13.9, tiltDeg: 55, azimuthDeg: 0, lossPercent: 14, inverterLimitW: 15000 },
    ]),
    weatherUsageMode: 'private',
    weatherApiKey: '',
  };
}

function makeAdapter(options = {}) {
  const now = options.now || Date.now();
  const settings = { ...defaultSettings(), ...(options.settings || {}) };
  const db = new Map();
  for (const [id, state] of Object.entries(options.persisted || {})) {
    db.set(id, state && typeof state === 'object' && Object.prototype.hasOwnProperty.call(state, 'val')
      ? { ...state }
      : { val: state, ack: true, ts: now - 1000 });
  }
  const writes = [];
  const cacheUpdates = [];
  const warnings = [];
  const requests = [];
  const stateCache = Object.fromEntries(
    Object.entries(settings).map(([key, value]) => [`settings.${key}`, { value, ts: now }]),
  );
  const requestHandler = options.requestHandler || (async () => futureMinutelyFixture(now));
  const adapter = {
    namespace: 'nexowatt-ui.0',
    config: {},
    stateCache,
    _nwGetSystemGeo: async () => ({ lat: 51.835, lon: 6.696, locName: 'Rhede' }),
    getForeignObjectAsync: async () => ({
      common: {
        latitude: 51.835,
        longitude: 6.696,
        postalCode: '46414',
        city: 'Rhede',
        state: 'Nordrhein-Westfalen',
        country: 'Deutschland',
      },
    }),
    getStateAsync: async (id) => {
      if (id === 'weatherLocation') return { val: 'Rhede, Nordrhein-Westfalen, Deutschland', ack: true, ts: now };
      return db.get(id) || null;
    },
    _nwHttpsGetJson: async (url) => {
      requests.push(url);
      return requestHandler(url);
    },
    setObjectNotExistsAsync: async () => {},
    setStateAsync: async (id, state, ack) => {
      const value = state && typeof state === 'object' && Object.prototype.hasOwnProperty.call(state, 'val')
        ? state.val
        : state;
      const stateAck = state && typeof state === 'object' && Object.prototype.hasOwnProperty.call(state, 'ack')
        ? state.ack
        : ack;
      const stored = { val: value, ack: stateAck !== false, ts: Date.now() };
      db.set(id, stored);
      writes.push({ id, value });
    },
    updateValue: (key, value, ts, opts) => {
      stateCache[key] = { value, ts };
      cacheUpdates.push({ key, value, ts, opts });
    },
    setTimeout: () => ({ fake: true }),
    clearTimeout: () => {},
    log: {
      debug() {},
      info() {},
      warn(message) { warnings.push(String(message)); },
    },
  };
  return { adapter, db, writes, cacheUpdates, warnings, requests, stateCache };
}

async function runProvider(options = {}) {
  const fixture = makeAdapter(options);
  const runtime = startOpenMeteoPvForecastRuntime(fixture.adapter);
  const result = await runtime.refresh();
  runtime.stop();
  return { ...fixture, result };
}

function cacheValue(stateCache, key) {
  return stateCache[key] ? stateCache[key].value : undefined;
}

function persistedSnapshot(now, lastSuccessAt, curve) {
  const prefix = 'forecast.openMeteoPv.';
  return {
    [`${prefix}valid`]: { val: true, ack: true, ts: lastSuccessAt },
    [`${prefix}source`]: { val: 'open-meteo-gti', ack: true, ts: lastSuccessAt },
    [`${prefix}updatedAt`]: { val: lastSuccessAt, ack: true, ts: lastSuccessAt },
    [`${prefix}lastSuccessAt`]: { val: lastSuccessAt, ack: true, ts: lastSuccessAt },
    [`${prefix}lastAttemptAt`]: { val: lastSuccessAt, ack: true, ts: lastSuccessAt },
    [`${prefix}requestCount`]: { val: 1, ack: true, ts: lastSuccessAt },
    [`${prefix}requestMode`]: { val: 'minutely-gti', ack: true, ts: lastSuccessAt },
    [`${prefix}requestStatus`]: { val: 'ok', ack: true, ts: lastSuccessAt },
    [`${prefix}configuredKwp`]: { val: 13.9, ack: true, ts: lastSuccessAt },
    [`${prefix}planningSafetyPct`]: { val: 85, ack: true, ts: lastSuccessAt },
    [`${prefix}latitude`]: { val: 51.835, ack: true, ts: lastSuccessAt },
    [`${prefix}longitude`]: { val: 6.696, ack: true, ts: lastSuccessAt },
    [`${prefix}locationText`]: { val: 'Rhede, Nordrhein-Westfalen, Deutschland', ack: true, ts: lastSuccessAt },
    [`${prefix}locationSource`]: { val: 'system-coordinates', ack: true, ts: lastSuccessAt },
    [`${prefix}statusText`]: { val: 'Letzte erfolgreiche Prognose', ack: true, ts: lastSuccessAt },
    [`${prefix}error`]: { val: '', ack: true, ts: lastSuccessAt },
    [`${prefix}curveJson`]: { val: JSON.stringify(curve), ack: true, ts: lastSuccessAt },
    [`${prefix}points`]: { val: curve.length, ack: true, ts: lastSuccessAt },
    [`${prefix}positivePoints`]: { val: curve.filter((segment) => segment.w > 0).length, ack: true, ts: lastSuccessAt },
  };
}

async function verifySuccessfulCacheBridge() {
  const now = Date.now();
  const before = Date.now();
  const run = await runProvider({ now });
  const after = Date.now();
  assert.equal(run.result.valid, true);
  assert(run.result.points > 0);
  assert(run.result.positivePoints > 0);
  assert(run.result.kwhNext24h > 0);

  assert.equal(cacheValue(run.stateCache, 'forecast.openMeteoPv.valid'), true);
  assert.equal(cacheValue(run.stateCache, 'forecast.openMeteoPv.requestStatus'), run.result.requestStatus);
  assert.equal(cacheValue(run.stateCache, 'forecast.openMeteoPv.requestMode'), 'minutely-gti');
  assert.equal(cacheValue(run.stateCache, 'forecast.openMeteoPv.points'), run.result.points);
  assert.equal(cacheValue(run.stateCache, 'forecast.openMeteoPv.positivePoints'), run.result.positivePoints);
  assert(Math.abs(Number(cacheValue(run.stateCache, 'forecast.openMeteoPv.kwhNext24h')) - run.result.kwhNext24h) < 0.001);
  assert.equal(cacheValue(run.stateCache, 'forecast.openMeteoPv.locationText'), 'Rhede, Nordrhein-Westfalen, Deutschland');
  assert.equal(cacheValue(run.stateCache, 'forecast.openMeteoPv.error'), '');
  assert(Number(cacheValue(run.stateCache, 'forecast.openMeteoPv.lastAttemptAt')) > 0);
  assert(Number(cacheValue(run.stateCache, 'forecast.openMeteoPv.lastSuccessAt')) > 0);
  assert(run.cacheUpdates.some((entry) => entry.key === 'forecast.openMeteoPv.requestStatus' && entry.value === 'loading'));
  assert(run.cacheUpdates.some((entry) => entry.key === 'forecast.openMeteoPv.requestStatus' && ['ok', 'fallback', 'ok-zero-production'].includes(entry.value)));

  const pointsUpdate = run.cacheUpdates.findLast((entry) => entry.key === 'forecast.openMeteoPv.points');
  assert(pointsUpdate && pointsUpdate.ts >= before && pointsUpdate.ts <= after + 1000, 'UI cache timestamp must describe the current publish');
  assert.equal(cacheValue(run.stateCache, 'forecast.openMeteoPv.updatedAt'), run.result.ts, 'forecast data timestamp must remain explicit');

  const requestUrl = new URL(run.requests[0]);
  assert.match(requestUrl.hostname, /open-meteo\.com$/);
  assert.equal(requestUrl.searchParams.get('minutely_15'), 'global_tilted_irradiance,temperature_2m');
  assert.equal(requestUrl.searchParams.get('forecast_minutely_15'), '192');
  assert.equal(requestUrl.searchParams.get('tilt'), '55');
  assert.equal(requestUrl.searchParams.get('azimuth'), '0');
  assert.equal(requestUrl.searchParams.get('timezone'), 'GMT');
  assert.equal(requestUrl.searchParams.get('timeformat'), 'unixtime');
}

async function verifyFailureDiagnosticsReachCache() {
  const run = await runProvider({
    requestHandler: async () => { throw new Error('simulierter DNS-Fehler'); },
  });
  assert.equal(run.result.valid, false);
  assert.equal(run.result.requestStatus, 'error');
  assert.match(run.result.error, /DNS-Fehler/);
  assert.equal(cacheValue(run.stateCache, 'forecast.openMeteoPv.valid'), false);
  assert.equal(cacheValue(run.stateCache, 'forecast.openMeteoPv.requestStatus'), 'error');
  assert.equal(cacheValue(run.stateCache, 'forecast.openMeteoPv.requestMode'), 'minutely-gti');
  assert.match(String(cacheValue(run.stateCache, 'forecast.openMeteoPv.error')), /DNS-Fehler/);
  assert(Number(cacheValue(run.stateCache, 'forecast.openMeteoPv.lastAttemptAt')) > 0);
  assert(run.requests.length >= 2, 'transport failures must still use the configured retry');
}

async function verifyPersistedRestartRecovery() {
  const now = Date.now();
  const first = Math.floor(now / QUARTER) * QUARTER;
  const curve = Array.from({ length: 36 }, (_, index) => ({
    // The first six segments are exhausted; restart recovery must prune them.
    t: first + (index - 6) * QUARTER,
    dtMs: QUARTER,
    w: index < 30 ? Math.max(0, Math.round(5500 * Math.sin(Math.PI * (index + 1) / 31))) : 0,
  }));
  const lastSuccessAt = now - 10 * 60 * 1000;
  const run = await runProvider({
    now,
    persisted: persistedSnapshot(now, lastSuccessAt, curve),
    requestHandler: async () => { throw new Error('Provider vorübergehend nicht erreichbar'); },
  });
  assert.equal(run.result.valid, true);
  assert.equal(run.result.requestStatus, 'stale-error');
  assert.equal(run.result.lastSuccessAt, lastSuccessAt);
  assert(run.result.curve.length > 0 && run.result.curve.length < curve.length, 'expired curve segments must be pruned');
  assert(run.result.curve.every((segment) => segment.t + segment.dtMs > now - 1000));
  assert.equal(run.result.points, run.result.curve.length);
  assert.equal(run.result.positivePoints, run.result.curve.filter((segment) => segment.w > 0).length);
  assert(run.result.kwhNext24h > 0);
  assert(run.result.peakWNext24h > 0);
  assert.match(run.result.error, /vorübergehend nicht erreichbar/);
  assert.equal(cacheValue(run.stateCache, 'forecast.openMeteoPv.valid'), true);
  assert.equal(cacheValue(run.stateCache, 'forecast.openMeteoPv.requestStatus'), 'stale-error');
  assert.equal(cacheValue(run.stateCache, 'forecast.openMeteoPv.lastSuccessAt'), lastSuccessAt);
  assert(Number(cacheValue(run.stateCache, 'forecast.openMeteoPv.kwhNext24h')) > 0);
}

async function verifyExpiredPersistedCurvesAreRejected() {
  const now = Date.now();
  const futureCurve = Array.from({ length: 16 }, (_, index) => ({
    t: now + index * QUARTER,
    dtMs: QUARTER,
    w: 2500,
  }));
  const tooOld = await runProvider({
    now,
    persisted: persistedSnapshot(now, now - TWO_HOURS - 60 * 1000, futureCurve),
    requestHandler: async () => { throw new Error('Provider offline'); },
  });
  assert.equal(tooOld.result.valid, false);
  assert.equal(tooOld.result.requestStatus, 'error');
  assert.equal(tooOld.result.points, 0);
  assert.equal(tooOld.result.kwhNext24h, 0);

  const exhaustedCurve = Array.from({ length: 8 }, (_, index) => ({
    t: now - (index + 2) * QUARTER,
    dtMs: QUARTER,
    w: 3000,
  }));
  const exhausted = await runProvider({
    now,
    persisted: persistedSnapshot(now, now - 10 * 60 * 1000, exhaustedCurve),
    requestHandler: async () => { throw new Error('Provider offline'); },
  });
  assert.equal(exhausted.result.valid, false);
  assert.equal(exhausted.result.requestStatus, 'error');
  assert.equal(exhausted.result.points, 0);
  assert.equal(exhausted.result.kwhNext24h, 0);
}

async function verifySourceAliasesAndStringBooleans() {
  const provider = await runProvider({
    settings: {
      weatherEnabled: 'true',
      openMeteoPvEnabled: '1',
      forecastSourceMode: 'weather',
    },
  });
  assert.equal(provider.result.valid, true);
  assert.equal(provider.result.requestMode, 'minutely-gti');

  const now = Date.now();
  const stateCache = {
    'settings.forecastSourceMode': { value: 'openmeteo', ts: now },
    'settings.openMeteoPvEnabled': { value: 'on', ts: now },
    'settings.forecastFallbackToDatapoints': { value: 'true', ts: now },
  };
  const persisted = new Map();
  const module = Object.create(PvForecastModule.prototype);
  module._lastCurveHash = '';
  module._warnedNoMapping = false;
  module.dp = null;
  module.adapter = {
    stateCache,
    _openMeteoPvForecast: {
      ts: now,
      valid: 'true',
      source: 'open-meteo-gti',
      ageMs: 0,
      points: 8,
      positivePoints: 8,
      requestCount: 1,
      requestMode: 'minutely-gti',
      requestStatus: 'ok',
      lastAttemptAt: now,
      lastSuccessAt: now,
      configuredKwp: 13.9,
      planningSafetyPct: 85,
      kwhNext6h: 5,
      kwhNext12h: 8,
      kwhNext24h: 12,
      peakWNext24h: 5000,
      statusText: 'ok',
      error: '',
      latitude: 51.835,
      longitude: 6.696,
      locationText: 'Rhede',
      locationSource: 'system-coordinates',
      curve: Array.from({ length: 8 }, (_, index) => ({ t: now + index * QUARTER, dtMs: QUARTER, w: 5000 })),
    },
    getStateAsync: async (id) => persisted.get(id) || null,
    setStateAsync: async (id, value, ack) => {
      persisted.set(id, { val: value, ack, ts: Date.now() });
    },
    updateValue: (key, value, ts) => { stateCache[key] = { value, ts }; },
    log: { info() {}, debug() {}, warn() {} },
  };
  await module.tick();
  assert.equal(module.adapter._pvForecast.valid, true);
  assert.equal(module.adapter._pvForecast.source, 'open-meteo-gti');
  assert.equal(cacheValue(stateCache, 'forecast.pv.valid'), true);
  assert.equal(cacheValue(stateCache, 'forecast.pv.source'), 'open-meteo-gti');
  assert(Number(cacheValue(stateCache, 'forecast.pv.points')) > 0);
  assert(Number(cacheValue(stateCache, 'forecast.pv.kwhNext24h')) > 0);
}

async function verifyEffectiveStatePrimeWhenUnchanged() {
  const stateCache = {};
  let writes = 0;
  const updates = [];
  const module = Object.create(PvForecastModule.prototype);
  module.adapter = {
    stateCache,
    getStateAsync: async () => ({ val: true, ack: true, ts: 123456789 }),
    setStateAsync: async () => { writes += 1; },
    updateValue: (key, value, ts, opts) => {
      stateCache[key] = { value, ts };
      updates.push({ key, value, ts, opts });
    },
  };
  await module._setIfChanged('forecast.pv.valid', true);
  assert.equal(writes, 0, 'unchanged persisted state must not be rewritten');
  assert.equal(cacheValue(stateCache, 'forecast.pv.valid'), true);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].ts, 123456789);
}

function loadMainFactoryWithExternalStubs() {
  class FakeAdapter extends EventEmitter {
    constructor(options = {}) {
      super();
      this.name = String(options.name || 'nexowatt-ui');
      this.namespace = `${this.name}.0`;
      this.instance = 0;
      this.config = options.config && typeof options.config === 'object' ? options.config : {};
      this.log = options.log || { silly() {}, debug() {}, info() {}, warn() {}, error() {} };
    }
    setTimeout(handler, ms, ...args) { return setTimeout(handler, ms, ...args); }
    clearTimeout(timer) { clearTimeout(timer); }
    setInterval(handler, ms, ...args) { return setInterval(handler, ms, ...args); }
    clearInterval(timer) { clearInterval(timer); }
  }

  function genericExternalStub() {
    const fn = function stub() { return proxy; };
    const proxy = new Proxy(fn, {
      get(_target, key) {
        if (key === 'then') return undefined;
        if (key === 'default') return proxy;
        if (key === 'json' || key === 'urlencoded' || key === 'static') {
          return () => (_req, _res, next) => { if (typeof next === 'function') next(); };
        }
        return proxy;
      },
      construct() { return proxy; },
      apply() { return proxy; },
    });
    return proxy;
  }

  const originalLoad = Module._load;
  const builtins = new Set(Module.builtinModules.concat(Module.builtinModules.map((name) => `node:${name}`)));
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === '@iobroker/adapter-core') return { Adapter: FakeAdapter };
    if (request.startsWith('.') || path.isAbsolute(request) || builtins.has(request)) {
      return originalLoad.call(this, request, parent, isMain);
    }
    try {
      return originalLoad.call(this, request, parent, isMain);
    } catch (error) {
      if (error && error.code === 'MODULE_NOT_FOUND') return genericExternalStub();
      throw error;
    }
  };
  try {
    const mainPath = path.join(ROOT, 'main.js');
    delete require.cache[require.resolve(mainPath)];
    return require(mainPath);
  } finally {
    Module._load = originalLoad;
  }
}

async function verifyMainForecastSubscriptionAndPrime() {
  const factory = loadMainFactoryWithExternalStubs();
  assert.equal(typeof factory, 'function');
  const instance = factory({ config: {} });
  const localSubscriptions = [];
  const foreignSubscriptions = [];
  const updates = [];
  instance.stateCache = {};
  instance.subscribeStatesAsync = async (pattern) => { localSubscriptions.push(pattern); };
  instance.subscribeForeignStatesAsync = async (pattern) => { foreignSubscriptions.push(pattern); };
  instance.getForeignStatesAsync = async () => ({
    [`${instance.namespace}.forecast.openMeteoPv.valid`]: { val: true, ts: 111 },
    [`${instance.namespace}.forecast.openMeteoPv.points`]: { val: 192, lc: 222 },
    [`${instance.namespace}.forecast.pv.valid`]: { val: true, ts: 333 },
  });
  instance.getStateAsync = async (key) => key === 'forecast.openMeteoPv.requestMode'
    ? { val: 'minutely-gti', ts: 444 }
    : null;
  instance.updateValue = (key, value, ts, opts) => {
    instance.stateCache[key] = { value, ts };
    updates.push({ key, value, ts, opts });
  };

  await instance.subscribeForecastUiStates();
  assert.deepEqual(localSubscriptions, ['forecast.*']);
  assert.deepEqual(foreignSubscriptions, []);
  assert.equal(cacheValue(instance.stateCache, 'forecast.openMeteoPv.valid'), true);
  assert.equal(cacheValue(instance.stateCache, 'forecast.openMeteoPv.points'), 192);
  assert.equal(cacheValue(instance.stateCache, 'forecast.openMeteoPv.requestMode'), 'minutely-gti');
  assert.equal(cacheValue(instance.stateCache, 'forecast.pv.valid'), true);
  assert.equal(instance.keyFromId(`${instance.namespace}.forecast.openMeteoPv.valid`), 'forecast.openMeteoPv.valid');
  assert(updates.length >= 4);

  await instance.subscribeForecastUiStates();
  assert.equal(localSubscriptions.length, 1, 'forecast wildcard subscription must remain idempotent');

  const fallbackInstance = factory({ config: {} });
  fallbackInstance.stateCache = {};
  let foreignFallback = '';
  fallbackInstance.subscribeStatesAsync = async () => { throw new Error('local API unavailable'); };
  fallbackInstance.subscribeForeignStatesAsync = async (pattern) => { foreignFallback = pattern; };
  fallbackInstance.getForeignStatesAsync = async () => ({});
  fallbackInstance.getStateAsync = async () => null;
  fallbackInstance.updateValue = () => {};
  await fallbackInstance.subscribeForecastUiStates();
  assert.equal(foreignFallback, `${fallbackInstance.namespace}.forecast.*`);
}

function verifyStaticAndGeneratedContracts() {
  const mainTs = read('src-ts/runtime-executables/main.ts');
  const mainJs = read('main.js');
  const providerTs = read('src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts');
  const providerJs = read('ems/services/open-meteo-pv-forecast.js');
  const moduleTs = read('src-ts/runtime-executables/ems/modules/pv-forecast.ts');
  const moduleJs = read('ems/modules/pv-forecast.js');
  const frontendTs = read('src-ts/runtime-executables/www/forecast-settings.ts');
  const frontendJs = read('www/forecast-settings.js');
  const serviceWorkerTs = read('src-ts/runtime-executables/www/sw.ts');
  const serviceWorkerJs = read('www/sw.js');
  const settingsHtml = read('www/settings.html');

  for (const source of [mainTs, mainJs]) {
    assert(source.includes('subscribeForecastUiStates'));
    assert(source.includes("subscribeStatesAsync('forecast.*')"));
    assert(source.includes('getForeignStatesAsync(`${namespace}.forecast.*`)'));
    assert(source.includes('const primedKeys = new Set()'));
    assert(source.includes("'lastAttemptAt', 'lastSuccessAt'"));
    assert(source.includes('forecast.openMeteoPv.${key}'));
    assert(source.includes('forecast.pv.${key}'));
    assert(source.includes("return 'forecast.' + id.slice(prefForecast.length)"));
    const startIndex = source.indexOf('startOpenMeteoPvForecastRuntime(this)');
    const primeIndex = source.lastIndexOf('subscribeForecastUiStates()', startIndex);
    assert(startIndex > 0 && primeIndex > 0 && primeIndex < startIndex, 'forecast cache must be primed before provider startup');
  }
  for (const source of [providerTs, providerJs]) {
    assert(source.includes('mirrorForecastUiState'));
    assert(source.includes('restoreRecentPersistedSnapshot'));
    assert(source.includes('Persistierte Open-Meteo-Prognose wiederhergestellt'));
    assert(source.includes('const writeTimestamp = Date.now()'));
    assert(source.includes('MAX_LAST_GOOD_AGE_MS = 2 * 3600000'));
    assert(source.includes("['open-meteo', 'openmeteo', 'weather']"));
    assert(source.includes("['true', '1', 'on', 'yes', 'ja', 'an', 'active', 'enabled']"));
  }
  for (const source of [moduleTs, moduleJs]) {
    assert(source.includes('_syncForecastUiCache'));
    assert(source.includes('cur.ts || Date.now()'));
    assert(source.includes("['open-meteo', 'openmeteo', 'weather']"));
    assert(source.includes('const openMeteoEnabled = asBoolean'));
  }
  for (const source of [frontendTs, frontendJs]) {
    assert(source.includes('const ageFromTimestamp'));
    assert(source.includes('Math.max(ageMs, ageFromTimestamp)'));
    assert(source.includes("['open-meteo', 'openmeteo', 'weather']"));
  }
  for (const source of [serviceWorkerTs, serviceWorkerJs]) {
    const cacheMatch = source.match(/const CACHE_NAME = 'nexowatt-cache-v(\d+)'/);
    assert(cacheMatch && Number(cacheMatch[1]) >= 483, 'Service-Worker-Cache muss mindestens RC77/v483 sein');
  }
  assert(settingsHtml.includes('/static/forecast-settings.js?v=0.8.202-rc77'));

  assert.match(providerJs.slice(0, 400), /AUTO-GENERATED RUNTIME FILE/);
  assert.match(moduleJs.slice(0, 400), /AUTO-GENERATED RUNTIME FILE/);
  assert.match(mainJs.slice(0, 400), /AUTO-GENERATED RUNTIME FILE/);
  assert.match(frontendJs.slice(0, 400), /AUTO-GENERATED RUNTIME FILE/);
}

(async () => {
  await verifySuccessfulCacheBridge();
  await verifyFailureDiagnosticsReachCache();
  await verifyPersistedRestartRecovery();
  await verifyExpiredPersistedCurvesAreRejected();
  await verifySourceAliasesAndStringBooleans();
  await verifyEffectiveStatePrimeWhenUnchanged();
  await verifyMainForecastSubscriptionAndPrime();
  verifyStaticAndGeneratedContracts();
  console.log('[rc77-pv-forecast-state-cache-bridge] OK: Provider-/EMS-Statecache, dynamische Subscription, Fehlerdiagnose, Restart-Fallback, Ablaufgrenzen, Kompatibilitätswerte und Browser-Cache geprüft.');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
