#!/usr/bin/env node
'use strict';

/**
 * RC72 – Wetter/PV-Prognose + forecast-aware AUTO/Time-Target regression.
 *
 * This test is intentionally offline. Open-Meteo responses are deterministic
 * fixtures; no external request is made.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const {
  buildForecastAwareTargetPlans,
} = require('../ems/services/forecast-aware-target-planner');
const {
  buildRuntimeGoalPlanMap,
  applyGoalPlan,
  applyStrategyOverlay,
  resolvePlanEffectiveMode,
} = require('../ems/services/forecast-target-runtime-bridge');
const {
  normalizeOpenMeteoPvArrays,
  buildOpenMeteoPvCurve,
  startOpenMeteoPvForecastRuntime,
} = require('../ems/services/open-meteo-pv-forecast');
const { DEFAULT_MAIN_SETTING_DEFINITIONS, buildMainSettingsWritePlan } = require('../lib/ts-mirrors/main/api-set');

const H = 3_600_000;
const Q = 900_000;
// Keep forecast fixtures in the active horizon independent of the calendar day.
const NOW = Math.floor(Date.now() / H) * H;
const DEADLINE = NOW + 12 * H;

function onePlan(extra = {}, goalExtra = {}) {
  const plans = buildForecastAwareTargetPlans({
    nowMs: NOW,
    slotMinutes: 15,
    reserveMs: 10 * 60_000,
    energySafetyFactor: 1,
    siteCapW: 11_000,
    goals: [{
      id: 'lp1', deadlineMs: DEADLINE, requiredWh: 22_000,
      minPowerW: 4_200, maxPowerW: 11_000,
      stationKey: 'station-a', stationCapW: 22_000,
      requirement: 'must', priority: 80,
      ...goalExtra,
    }],
    ...extra,
  });
  assert.equal(plans.length, 1);
  return plans[0];
}

;(async () => {

// ---------------------------------------------------------------------------
// Planner: optional modules and exact target behaviour
// ---------------------------------------------------------------------------
{
  const plan = onePlan();
  assert.equal(plan.action, 'wait');
  assert.equal(plan.reason, 'wait-until-latest-start');
  assert.equal(plan.fallbackMode, 'latest-start-only');
  assert.equal(plan.pvForecastUsed, false);
  assert.equal(plan.priceForecastUsed, false);
  assert(plan.nextWindow && plan.nextWindow.startMs > NOW);
  assert(plan.nextWindow.endMs <= DEADLINE);
}

{
  const plan = onePlan({
    pvCurve: [{ startMs: NOW + 4 * H, endMs: NOW + 8 * H, powerW: 8_000 }],
    pvPlanningSafetyPct: 100,
  });
  assert.equal(plan.action, 'wait');
  assert.equal(plan.reason, 'wait-for-pv-window');
  assert.equal(plan.pvForecastUsed, true);
  assert(plan.plannedPvWh >= 21_900);
  assert(plan.nextWindow && plan.nextWindow.startMs >= NOW + 4 * H);
}

{
  const plan = onePlan({ currentPvSurplusW: 6_000 });
  assert.equal(plan.action, 'charge');
  assert.equal(plan.source, 'pv');
  assert(plan.plannedNowW >= 4_200 && plan.plannedNowW <= 6_000);
}

{
  const priceCurve = [
    { startMs: NOW, endMs: NOW + 4 * H, priceEurKwh: 0.45 },
    { startMs: NOW + 4 * H, endMs: NOW + 8 * H, priceEurKwh: 0.15 },
    { startMs: NOW + 8 * H, endMs: DEADLINE, priceEurKwh: 0.40 },
  ];
  const plan = onePlan({
    priceCurve,
    tariff: { active: true, fresh: true, mode: 'automatic', priority: 3, automaticCheapThresholdEurKwh: 0.20 },
  });
  assert.equal(plan.action, 'wait');
  assert.equal(plan.reason, 'wait-for-cheaper-price-window');
  assert.equal(plan.priceForecastUsed, true);
  assert(plan.nextWindow && plan.nextWindow.startMs >= NOW + 4 * H);
}

{
  const priceCurve = [
    { startMs: NOW, endMs: NOW + 4 * H, priceEurKwh: 0.10 },
    { startMs: NOW + 4 * H, endMs: DEADLINE, priceEurKwh: 0.40 },
  ];
  const plan = onePlan({
    priceCurve,
    tariff: { active: true, fresh: true, mode: 'manual', priority: 3, manualCheapThresholdEurKwh: 0.20 },
  });
  assert.equal(plan.action, 'wait');
  assert.equal(plan.priceForecastUsed, true);
  assert(plan.nextWindow && plan.nextWindow.startMs >= NOW && plan.nextWindow.startMs < NOW + 4 * H);
}

{
  const priceCurve = [
    { startMs: NOW, endMs: NOW + 4 * H, priceEurKwh: 0.10 },
    { startMs: NOW + 4 * H, endMs: DEADLINE, priceEurKwh: 0.40 },
  ];
  const plan = onePlan({
    priceCurve,
    tariff: { active: true, fresh: true, mode: 'automatic', priority: 1, automaticCheapThresholdEurKwh: 0.20 },
  });
  assert.equal(plan.action, 'wait');
  assert.equal(plan.reason, 'wait-for-storage-priority-or-latest-start');
  assert.equal(plan.fallbackMode, 'storage-priority-plus-latest-start');
}

{
  const nearDeadline = DEADLINE - 2 * H;
  const plan = buildForecastAwareTargetPlans({
    nowMs: nearDeadline,
    siteCapW: 11_000,
    goals: [{ id: 'lp1', deadlineMs: DEADLINE, requiredWh: 22_000, minPowerW: 4_200, maxPowerW: 11_000 }],
  })[0];
  assert.equal(plan.action, 'charge');
  assert.equal(plan.deadlineOverride, true);
  assert(plan.plannedNowW >= 10_900);
}

{
  const exactDeadline = NOW + 2 * H + 7 * 60_000;
  const plan = buildForecastAwareTargetPlans({
    nowMs: NOW,
    siteCapW: 11_000,
    slotMinutes: 15,
    energySafetyFactor: 1,
    goals: [{ id: 'lp1', deadlineMs: exactDeadline, requiredWh: 20_000, minPowerW: 4_200, maxPowerW: 11_000 }],
  })[0];
  assert(plan.nextWindow);
  assert(plan.nextWindow.endMs <= exactDeadline);
  assert(plan.plannedWh <= 20_001);
}

{
  const plans = buildForecastAwareTargetPlans({
    nowMs: DEADLINE - 2 * H,
    siteCapW: 11_000,
    energySafetyFactor: 1,
    goals: [
      { id: 'lp1', deadlineMs: DEADLINE, requiredWh: 11_000, minPowerW: 4_200, maxPowerW: 11_000, stationKey: 's', stationCapW: 11_000, priority: 90 },
      { id: 'lp2', deadlineMs: DEADLINE, requiredWh: 11_000, minPowerW: 4_200, maxPowerW: 11_000, stationKey: 's', stationCapW: 11_000, priority: 80 },
    ],
  });
  assert.equal(plans.length, 2);
  assert(plans.reduce((sum, item) => sum + item.plannedNowW, 0) <= 11_001);
  assert(plans.every((item) => item.targetReachable));
}

{
  const plan = onePlan({ gridPlanningAllowed: false });
  assert.equal(plan.action, 'blocked');
  assert.equal(plan.reason, 'insufficient-pv-before-deadline');
  assert.equal(plan.plannedGridWh, 0);
  assert.equal(plan.fallbackMode, 'pv-only-policy');
}

// Economic current tariff gate must not make the future target physically impossible.
{
  const plans = buildRuntimeGoalPlanMap({
    now: NOW,
    wallboxes: [{
      safe: 'lp1', controlAvailable: true, goalEnabled: true, goalActive: true,
      userMode: 'auto', goalFinishTs: DEADLINE, goalRequiredWh: 22_000,
      minPW: 4_200, maxPW: 11_000, stationKey: 's', stationMaxPowerW: 11_000, priority: 100,
    }],
    budgetW: 0,
    staticBudgetW: 11_000,
    infrastructureCapacityW: 11_000,
    economicGateActive: true,
    hardPvOnly: false,
    tariffForecast: null,
  });
  const plan = plans.get('lp1');
  assert(plan);
  assert.equal(plan.targetReachable, true);
  assert.equal(plan.deadlineOverride, false);
}

// Runtime bridge may request a target but never exceed the live hard cap.
{
  const result = applyGoalPlan({
    plan: { active: true, action: 'charge', source: 'deadline', plannedNowW: 11_000 },
    userMode: 'auto', effectiveMode: 'normal', targetW: 0, targetA: 0,
    minPowerW: 4_200, maxPowerW: 11_000,
    totalAvailableW: 5_000, stationAvailableW: 4_600,
  });
  assert.equal(result.targetW, 4_600);
}

// MUST remains authoritative; SHOULD/CAN may yield only at a real deadline override.
{
  const must = applyStrategyOverlay({
    plan: { deadlineOverride: true },
    strategy: { active: true, requirement: 'must', action: 'pause' },
    userMode: 'auto', autoSource: 'strategy', targetW: 8_000, targetA: 0, minPowerW: 4_200,
  });
  assert.equal(must.targetW, 0);
  const should = applyStrategyOverlay({
    plan: { deadlineOverride: true },
    strategy: { active: true, requirement: 'should', action: 'pause' },
    userMode: 'auto', autoSource: 'strategy', targetW: 8_000, targetA: 0, minPowerW: 4_200,
  });
  assert.equal(should.targetW, 8_000);
  assert.equal(resolvePlanEffectiveMode('auto', 'pv', { action: 'charge', source: 'deadline', deadlineOverride: true }, { active: true, requirement: 'should', energySourcePolicy: 'pv-only' }, 'strategy'), 'normal');
}

// ---------------------------------------------------------------------------
// Open-Meteo deterministic PV conversion and runtime
// ---------------------------------------------------------------------------
const fakeTimes = [];
const fakeTemp = [];
const fakeGhi = [];
const fakeDni = [];
const fakeDhi = [];
for (let index = 0; index < 26; index += 1) {
  const ts = NOW + index * H;
  fakeTimes.push(new Date(ts).toISOString().slice(0, 19));
  const localHour = (new Date(ts).getUTCHours() + 2) % 24;
  const sun = localHour >= 6 && localHour <= 20 ? Math.sin(Math.PI * (localHour - 6) / 14) : 0;
  fakeTemp.push(18 + 8 * sun);
  fakeGhi.push(850 * sun);
  fakeDni.push(650 * sun);
  fakeDhi.push(200 * sun);
}
const fakeOpenMeteo = {
  hourly: {
    time: fakeTimes,
    temperature_2m: fakeTemp,
    shortwave_radiation: fakeGhi,
    direct_normal_irradiance: fakeDni,
    diffuse_radiation: fakeDhi,
    cloud_cover: fakeGhi.map(() => 10),
  },
};

{
  const arrays = normalizeOpenMeteoPvArrays({
    pvForecastInstalledKwp: 10,
    pvForecastTiltDeg: 30,
    pvForecastAzimuthDeg: 0,
    pvForecastLossPercent: 14,
    pvForecastInverterLimitW: 8_000,
  });
  assert.equal(arrays.length, 1);
  const curve = buildOpenMeteoPvCurve(fakeOpenMeteo, {
    enabled: true,
    sourceMode: 'auto',
    latitude: 51,
    longitude: 7,
    timezone: 'auto',
    updateMinutes: 30,
    horizonHours: 24,
    planningSafetyPct: 85,
    weatherUsageMode: 'private',
    weatherApiKey: '',
    arrays,
  }, { latitude: 51, longitude: 7 }, NOW);
  assert(curve.length > 40);
  assert(curve.every((segment) => segment.dtMs === Q));
  assert(curve.every((segment) => segment.w >= 0 && segment.w <= 8_000));
  assert(Math.max(...curve.map((segment) => segment.w)) > 3_000);
}

{
  const states = new Map();
  const settings = {
    weatherEnabled: true,
    openMeteoPvEnabled: true,
    forecastSourceMode: 'auto',
    openMeteoLatitude: 51,
    openMeteoLongitude: 7,
    openMeteoTimezone: 'auto',
    forecastUpdateIntervalMin: 30,
    forecastHorizonHours: 24,
    pvForecastPlanningSafetyPct: 85,
    pvForecastInstalledKwp: 10,
    pvForecastTiltDeg: 30,
    pvForecastAzimuthDeg: 0,
    pvForecastLossPercent: 14,
    pvForecastInverterLimitW: 8_000,
    pvForecastArrays: '[]',
    weatherUsageMode: 'private',
    weatherApiKey: '',
  };
  const adapter = {
    stateCache: Object.fromEntries(Object.entries(settings).map(([key, value]) => [`settings.${key}`, { value }])),
    _nwHttpsGetJson: async () => fakeOpenMeteo,
    setObjectNotExistsAsync: async () => {},
    setStateAsync: async (id, state) => { states.set(id, state.val); },
    getForeignObjectAsync: async () => ({ common: { latitude: 51, longitude: 7 } }),
    setTimeout: () => ({ fake: true }),
    clearTimeout: () => {},
    log: { debug() {}, warn() {} },
  };
  const runtime = startOpenMeteoPvForecastRuntime(adapter);
  const snapshot = await runtime.refresh();
  runtime.stop();
  assert.equal(snapshot.valid, true);
  assert.equal(snapshot.source, 'open-meteo-gti');
  assert(snapshot.curve.length > 0);
  assert.equal(states.get('forecast.openMeteoPv.valid'), true);
  assert(states.get('forecast.openMeteoPv.kwhNext24h') > 0);
}

// ---------------------------------------------------------------------------
// Settings/API/AppCenter contracts
// ---------------------------------------------------------------------------
const settingsHtml = fs.readFileSync(path.join(ROOT, 'www/settings.html'), 'utf8');
const settingsHelper = fs.readFileSync(path.join(ROOT, 'www/forecast-settings.js'), 'utf8');
const appCenterHtml = fs.readFileSync(path.join(ROOT, 'www/ems-apps.html'), 'utf8');
const appCenterJs = fs.readFileSync(path.join(ROOT, 'www/ems-apps.js'), 'utf8');
const mainSource = fs.readFileSync(path.join(ROOT, 'src-ts/runtime-executables/main.ts'), 'utf8');
const chargingSource = fs.readFileSync(path.join(ROOT, 'src-ts/runtime-executables/ems/modules/charging-management.ts'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

const settingKeys = [
  'forecastSourceMode', 'openMeteoPvEnabled', 'forecastFallbackToDatapoints',
  'forecastUpdateIntervalMin',
  'forecastHorizonHours', 'pvForecastPlanningSafetyPct', 'pvForecastInstalledKwp',
  'pvForecastTiltDeg', 'pvForecastAzimuthDeg', 'pvForecastLossPercent',
  'pvForecastInverterLimitW', 'pvForecastArrays',
];
for (const key of settingKeys) {
  assert(settingsHtml.includes(`data-key="${key}"`), `settings.html fehlt ${key}`);
  assert(DEFAULT_MAIN_SETTING_DEFINITIONS.some((entry) => entry.key === key), `API-Definition fehlt ${key}`);
  assert(mainSource.includes(key), `main settings fehlt ${key}`);
}
assert.equal(buildMainSettingsWritePlan({ scope: 'settings', key: 'pvForecastInstalledKwp', value: '12.5' }).plan.value, 12.5);
assert.equal(buildMainSettingsWritePlan({ scope: 'settings', key: 'openMeteoPvEnabled', value: 'true' }).plan.value, true);
assert.equal(buildMainSettingsWritePlan({ scope: 'settings', key: 'pvForecastArrays', value: '[{"kwp":5}]' }).plan.value, '[{"kwp":5}]');

assert(settingsHtml.includes('id="nwForecastSettingsBlock"'));
assert(!settingsHtml.includes('data-key="openMeteoLatitude"'), 'Endkunde darf keine manuellen Koordinaten mehr pflegen müssen');
assert(!settingsHtml.includes('data-key="openMeteoLongitude"'), 'Endkunde darf keine manuellen Koordinaten mehr pflegen müssen');
assert(settingsHtml.includes('EOS Admin beziehungsweise der zentralen EOS-Systemkonfiguration'), 'zentraler Anlagenstandort muss erklärt werden');
assert(/<script\s+src="\/static\/forecast-settings\.js(?:\?[^"]*)?"\s+defer><\/script>/.test(settingsHtml));
assert.equal([...fs.readdirSync(path.join(ROOT, 'www')).filter((name) => name.endsWith('.html'))]
  .filter((name) => fs.readFileSync(path.join(ROOT, 'www', name), 'utf8').includes('forecast-settings.js')).length, 1);
assert(settingsHelper.includes('nwOpenMeteoPvFields'));
assert(appCenterHtml.includes('PV-Prognose – Datenpunkt-Fallback'));
assert(appCenterHtml.includes('id="dpPvForecast"'));
assert(appCenterJs.includes('pvForecastTodayJson'));
assert(appCenterJs.includes('pvForecastTomorrowJson'));
assert(mainSource.includes('startOpenMeteoPvForecastRuntime(this)'));
assert(mainSource.includes('this._openMeteoPvForecastRuntime.stop()'));
assert(chargingSource.includes('buildRuntimeGoalPlanMap'));
assert(chargingSource.includes('economicGateActive: forcePvSurplusOnly'));
assert(chargingSource.includes('hardPvOnly: pvSurplusOnlyCfg'));
assert(!settingsHelper.includes('fetch ='));

for (const file of [
  'ems/services/open-meteo-pv-forecast.js',
  'ems/services/forecast-aware-target-planner.js',
  'ems/services/forecast-target-runtime-bridge.js',
  'www/forecast-settings.js',
]) {
  assert(packageJson.files.includes(file), `package.json.files fehlt ${file}`);
}

// ---------------------------------------------------------------------------
// Browser visibility/status smoke
// ---------------------------------------------------------------------------
const CHROMIUM = [process.env.CHROMIUM_BIN, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']
  .find((candidate) => candidate && fs.existsSync(candidate));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(test, timeoutMs, label) {
  const started = Date.now();
  let last;
  while (Date.now() - started < timeoutMs) {
    try { last = await test(); if (last) return last; } catch (error) { last = error; }
    await wait(60);
  }
  throw new Error(`Timeout bei ${label}: ${last && last.message ? last.message : JSON.stringify(last)}`);
}
class CdpClient {
  constructor(url) { this.ws = new WebSocket(url); this.nextId = 1; this.pending = new Map(); }
  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(String(event.data || '{}'));
      if (!msg.id || !this.pending.has(msg.id)) return;
      const pending = this.pending.get(msg.id); this.pending.delete(msg.id);
      if (msg.error) pending.reject(new Error(`${msg.error.code}: ${msg.error.message}`)); else pending.resolve(msg.result || {});
    });
  }
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject }); this.ws.send(JSON.stringify({ id, method, params })); });
  }
  async eval(expression) {
    const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Browserfehler');
    return result.result ? result.result.value : undefined;
  }
  close() { try { this.ws.close(); } catch (_) {} }
}

if (CHROMIUM) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-rc72-forecast-'));
  const browser = spawn(CHROMIUM, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--disable-background-networking', '--disable-extensions', '--no-first-run',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let port = null; let stderr = ''; let cdp;
  browser.stderr.on('data', (chunk) => {
    stderr += String(chunk);
    const match = /DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//.exec(stderr);
    if (match) port = Number(match[1]);
  });
  try {
    await waitFor(() => port, 8_000, 'Chromium-Port');
    const tabs = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
    cdp = new CdpClient(tabs[0].webSocketDebuggerUrl); await cdp.open();
    await cdp.send('Runtime.enable');
    const html = `<!doctype html><html><body>
      <div id="nwForecastSettingsBlock">
        <select id="s_forecastSourceMode"><option value="auto">Auto</option><option value="datapoint">DP</option></select>
        <div class="row"><input id="s_forecastFallbackToDatapoints" type="checkbox"></div>
        <input id="s_openMeteoPvEnabled" type="checkbox">
        <div id="nwOpenMeteoPvFields"></div>
        <strong id="nwForecastStatus"></strong><strong id="nwForecastSource"></strong><strong id="nwForecastUpdated"></strong>
        <strong id="nwForecast6h"></strong><strong id="nwForecast12h"></strong><strong id="nwForecast24h"></strong>
        <small id="nwForecastError" class="hidden"></small>
      </div>
    </body></html>`;
    await cdp.eval(`document.documentElement.innerHTML=${JSON.stringify(html)}; window.latestState=${JSON.stringify({
      'forecast.pv.source': { value: 'open-meteo-gti' },
      'forecast.pv.valid': { value: true },
      'forecast.pv.points': { value: 192 },
      'forecast.pv.ageMs': { value: 60_000 },
      'forecast.pv.kwhNext6h': { value: 12.5 },
      'forecast.pv.kwhNext12h': { value: 24.75 },
      'forecast.pv.kwhNext24h': { value: 31.2 },
      'forecast.pv.statusText': { value: 'OK' },
    })};`);
    await cdp.eval(`(0,eval)(${JSON.stringify(settingsHelper + '\n//# sourceURL=forecast-settings.js')})`);
    const visible = await cdp.eval(`(() => {
      const pv=document.getElementById('s_openMeteoPvEnabled'); pv.checked=true; pv.dispatchEvent(new Event('change'));
      return {hidden:document.getElementById('nwOpenMeteoPvFields').classList.contains('hidden'),status:document.getElementById('nwForecastStatus').textContent,source:document.getElementById('nwForecastSource').textContent,e6:document.getElementById('nwForecast6h').textContent};
    })()`);
    assert.equal(visible.hidden, false);
    assert.equal(visible.status, 'Prognose aktiv');
    assert.equal(visible.source, 'Open-Meteo');
    assert.match(visible.e6, /12[,.]5/);
    const datapoint = await cdp.eval(`(() => {
      const source=document.getElementById('s_forecastSourceMode'); source.value='datapoint'; source.dispatchEvent(new Event('change'));
      return {hidden:document.getElementById('nwOpenMeteoPvFields').classList.contains('hidden'),fallbackHidden:document.getElementById('s_forecastFallbackToDatapoints').closest('.row').classList.contains('hidden')};
    })()`);
    assert.equal(datapoint.hidden, false, 'PV-Anlagendaten bleiben auch bei AppCenter-Quelle sichtbar/editierbar');
    assert.equal(datapoint.fallbackHidden, true);
  } finally {
    if (cdp) cdp.close();
    try { browser.kill('SIGTERM'); } catch (_) {}
    await wait(200);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) {}
  }
}

console.log('[rc72-weather-pv-forecast-auto] OK: Einstellungen, Open-Meteo, AppCenter-Fallback, Multi-LP-Planer und Browseranzeige geprüft.');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
