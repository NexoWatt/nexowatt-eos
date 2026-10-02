#!/usr/bin/env node
'use strict';

/**
 * RC75 – zentrale EOS-Admin-Standortquelle, direkte Open-Meteo-GTI-Abfrage
 * und dauerhaft sichtbare, kundenfreundliche PV-Flächentabelle.
 *
 * Alle Backendantworten sind offline simuliert. Der Browser-Test reproduziert
 * außerdem die verzögerte Settings-Hydrierung, durch die die PV-Felder zuvor
 * trotz aktivierter Prognose verborgen blieben.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const settingsHtml = read('www/settings.html');
const settingsJs = read('www/forecast-settings.js');
const settingsTs = read('src-ts/runtime-executables/www/forecast-settings.ts');
const backendTs = read('src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts');
const pvModuleTs = read('src-ts/runtime-executables/ems/modules/pv-forecast.ts');
const chargingTs = read('src-ts/runtime-executables/ems/modules/charging-management.ts');
const coreTs = read('src-ts/runtime-executables/ems/modules/core-limits.ts');
const storageTs = read('src-ts/runtime-executables/ems/modules/storage-control.ts');
const heatingTs = read('src-ts/runtime-executables/ems/modules/heating-rod-control.ts');
const aiTs = read('src-ts/runtime-executables/ems/modules/ai-advisor.ts');
const overviewTs = read('src-ts/runtime-executables/ems/services/admin-overview-publisher.ts');
const { startOpenMeteoPvForecastRuntime } = require('../ems/services/open-meteo-pv-forecast');

// ---------------------------------------------------------------------------
// Statische UI-/Architekturverträge
// ---------------------------------------------------------------------------
assert(settingsHtml.includes('id="nwPvArrayRows"'));
assert(settingsHtml.includes('id="nwPvArrayAdd"'));
assert(settingsHtml.includes('+ PV-Fläche hinzufügen'));
assert(!settingsHtml.includes('id="s_openMeteoLatitude"'), 'Manuelle Standortkoordinaten dürfen im Endkundenbereich nicht sichtbar sein');
assert(!settingsHtml.includes('id="s_openMeteoLongitude"'), 'Manuelle Standortkoordinaten dürfen im Endkundenbereich nicht sichtbar sein');
assert(!settingsHtml.includes('Mehrere PV-Flächen / Experten-JSON'));
assert(settingsHtml.includes('/static/forecast-settings.js?v=0.8.202-rc77'));
for (const label of ['Nord', 'Nordost', 'Ost', 'Südost', 'Süd', 'Südwest', 'West', 'Nordwest']) {
  assert(settingsTs.includes(`label: '${label}'`), `Ausrichtung ${label} fehlt`);
}
assert(settingsTs.includes("fields.classList.remove('hidden')"), 'PV-Anlagendaten müssen unabhängig von verzögerter Checkbox-Hydrierung sichtbar bleiben');
assert(settingsTs.includes("location.textContent = label || coordinates || adminFallback || 'Standort nicht aufgelöst'"));
assert(backendTs.includes('global_tilted_irradiance,temperature_2m'));
assert(backendTs.includes('&tilt='));
assert(backendTs.includes('&azimuth='));
assert(backendTs.includes('Promise.allSettled'));
assert(backendTs.includes('system-coordinates'));
assert(backendTs.includes('system-geocoding'));
assert(backendTs.includes("['updatedAt', 'PV Forecast letzte erfolgreiche Aktualisierung'"));
assert(backendTs.includes("['locationText', 'PV Forecast Standort'"));
assert(backendTs.includes("['powerNowW', 'PV Forecast Leistung jetzt (W)'"));
assert(pvModuleTs.includes('PV_FORECAST_DIAGNOSTIC_STATES'));
assert(pvModuleTs.includes('publishPvForecastDiagnostics'));

// Zentrale Kopplung: ein kanonischer Snapshot versorgt alle Planungsbereiche.
assert(chargingTs.includes('pvSnapshot: this.adapter && this.adapter._pvForecast'));
assert(coreTs.includes('this.adapter._pvForecast'));
assert(storageTs.includes('this.adapter._pvForecast'));
assert(heatingTs.includes('this.adapter && this.adapter._pvForecast'));
assert(aiTs.includes("forecast.pv.kwhNext24h"));
assert(overviewTs.includes("forecast.pv.source"));
assert(overviewTs.includes("forecast.pv.powerNowW"));

// ---------------------------------------------------------------------------
// Backend: EOS-Admin-Standort gewinnt; je Dachfläche direkter GTI-Request.
// ---------------------------------------------------------------------------
function directGtiFixture(nowMs, orientationOffset = 0) {
  const first = Math.floor(nowMs / 900000) * 900000;
  const time = [];
  const global_tilted_irradiance = [];
  const temperature_2m = [];
  for (let index = 0; index < 196; index += 1) {
    const ts = first + index * 900000;
    time.push(Math.floor(ts / 1000));
    const hour = new Date(ts).getUTCHours() + new Date(ts).getUTCMinutes() / 60;
    const sun = hour >= 5 && hour <= 19 ? Math.max(0, Math.sin(Math.PI * (hour - 5) / 14)) : 0;
    global_tilted_irradiance.push(Math.max(0, (850 + orientationOffset) * sun));
    temperature_2m.push(18 + 8 * sun);
  }
  return { minutely_15: { time, global_tilted_irradiance, temperature_2m } };
}

async function verifyBackend() {
  const now = Date.now();
  const calls = [];
  const states = new Map();
  const settings = {
    weatherEnabled: true,
    openMeteoPvEnabled: true,
    forecastSourceMode: 'auto',
    // Legacy manual coordinates deliberately point elsewhere; EOS Admin wins.
    openMeteoLatitude: 48.1,
    openMeteoLongitude: 11.5,
    openMeteoTimezone: 'auto',
    forecastUpdateIntervalMin: 5,
    forecastHorizonHours: 48,
    pvForecastPlanningSafetyPct: 85,
    pvForecastInstalledKwp: 0,
    pvForecastTiltDeg: 30,
    pvForecastAzimuthDeg: 0,
    pvForecastLossPercent: 14,
    pvForecastInverterLimitW: 0,
    pvForecastArrays: JSON.stringify([
      { name: 'Süddach', kwp: 8.9, tiltDeg: 35, azimuthDeg: 0, lossPercent: 14, inverterLimitW: 10000 },
      { name: 'Ostdach', kwp: 5.0, tiltDeg: 25, azimuthDeg: -90, lossPercent: 14, inverterLimitW: 6000 },
    ]),
    weatherUsageMode: 'private',
    weatherApiKey: '',
  };
  const adapter = {
    stateCache: Object.fromEntries(Object.entries(settings).map(([key, value]) => [`settings.${key}`, { value }])),
    _nwGetSystemGeo: async () => ({ lat: 51.835, lon: 6.696, locName: 'Rhede · EOS Admin' }),
    getForeignObjectAsync: async () => ({ common: { latitude: 40, longitude: 3, city: 'Falscher Ort' } }),
    _nwHttpsGetJson: async (url) => {
      calls.push(url);
      const azimuth = Number(new URL(url).searchParams.get('azimuth'));
      return directGtiFixture(now, azimuth === -90 ? -80 : 0);
    },
    setObjectNotExistsAsync: async () => {},
    setStateAsync: async (id, state) => { states.set(id, state.val); },
    setTimeout: () => ({ fake: true }),
    clearTimeout: () => {},
    log: { debug() {}, warn() {} },
  };

  const runtime = startOpenMeteoPvForecastRuntime(adapter);
  const snapshot = await runtime.refresh();
  runtime.stop();

  assert.equal(snapshot.valid, true);
  assert.equal(snapshot.configuredKwp, 13.9);
  assert.equal(snapshot.locationSource, 'system-coordinates');
  assert.match(snapshot.locationText, /Rhede/);
  assert.equal(snapshot.latitude, 51.835);
  assert.equal(snapshot.longitude, 6.696);
  assert.equal(snapshot.requestCount, 2);
  assert(snapshot.points >= 180);
  assert(snapshot.positivePoints > 0);
  assert(snapshot.kwhNext24h > 0);
  assert.equal(calls.length, 2);
  assert(calls.every((url) => url.includes('latitude=51.835') && url.includes('longitude=6.696')));
  assert(calls.every((url) => !url.includes('latitude=48.1') && !url.includes('longitude=11.5')));
  assert(calls.every((url) => url.includes('minutely_15=global_tilted_irradiance%2Ctemperature_2m') || url.includes('minutely_15=global_tilted_irradiance,temperature_2m')));
  assert(calls.some((url) => url.includes('tilt=35') && url.includes('azimuth=0')));
  assert(calls.some((url) => url.includes('tilt=25') && url.includes('azimuth=-90')));
  assert.equal(states.get('forecast.openMeteoPv.valid'), true);
  assert.equal(states.get('forecast.openMeteoPv.locationSource'), 'system-coordinates');
  assert(states.get('forecast.openMeteoPv.positivePoints') > 0);
  assert(states.get('forecast.openMeteoPv.kwhNext24h') > 0);
  assert(states.get('forecast.openMeteoPv.lastSuccessAt') > 0);
}

// ---------------------------------------------------------------------------
// Browser: PV-Tabelle bleibt trotz verzögerter generischer Settings-Hydrierung
// sichtbar und Status/Standort ziehen ohne change-Event nach.
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
      const message = JSON.parse(String(event.data || '{}'));
      if (!message.id || !this.pending.has(message.id)) return;
      const pending = this.pending.get(message.id); this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(`${message.error.code}: ${message.error.message}`));
      else pending.resolve(message.result || {});
    });
  }
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression) {
    const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Browserfehler');
    return result.result ? result.result.value : undefined;
  }
  close() { try { this.ws.close(); } catch (_) {} }
}

async function verifyBrowser() {
  if (!CHROMIUM) {
    console.log('[rc75] Browser-Smoke übersprungen: Chromium nicht gefunden.');
    return;
  }
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-rc75-forecast-'));
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
    await waitFor(() => port, 8000, 'Chromium-Port');
    const tabs = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
    cdp = new CdpClient(tabs[0].webSocketDebuggerUrl); await cdp.open(); await cdp.send('Runtime.enable');
    const html = `<!doctype html><html><body>
      <select id="s_forecastSourceMode"><option value="auto" selected>Auto</option><option value="datapoint">DP</option></select>
      <div class="row"><input id="s_forecastFallbackToDatapoints" type="checkbox"></div>
      <input id="s_openMeteoPvEnabled" type="checkbox">
      <div id="nwOpenMeteoPvFields" class="hidden">
        <button id="nwPvArrayAdd" type="button">+</button>
        <table><tbody id="nwPvArrayRows"></tbody></table><small id="nwPvArrayValidation" class="hidden"></small>
        <input id="s_pvForecastInstalledKwp" value="0"><input id="s_pvForecastTiltDeg" value="30">
        <input id="s_pvForecastAzimuthDeg" value="0"><input id="s_pvForecastLossPercent" value="14">
        <input id="s_pvForecastInverterLimitW" value="0">
        <textarea id="s_pvForecastArrays">[]</textarea>
      </div>
      <strong id="nwForecastStatus"></strong><strong id="nwForecastSource"></strong><strong id="nwForecastLocation"></strong>
      <strong id="nwForecastUpdated"></strong><strong id="nwForecast6h"></strong><strong id="nwForecast12h"></strong>
      <strong id="nwForecast24h"></strong><strong id="nwForecastPoints"></strong><small id="nwForecastError" class="hidden"></small>
    </body></html>`;
    await cdp.eval(`document.documentElement.innerHTML=${JSON.stringify(html)}; window.latestState={'settings.forecastSourceMode':{value:'auto'},'settings.openMeteoPvEnabled':{value:false}};`);
    await cdp.eval(`(0,eval)(${JSON.stringify(settingsJs + '\n//# sourceURL=forecast-settings.js')})`);

    const beforeHydration = await cdp.eval(`(() => ({hidden:document.getElementById('nwOpenMeteoPvFields').classList.contains('hidden'),rows:document.querySelectorAll('#nwPvArrayRows tr').length}))()`);
    assert.equal(beforeHydration.hidden, false, 'PV-Anlagentabelle muss vor verzögerter Checkbox-Hydrierung sichtbar sein');
    assert.equal(beforeHydration.rows, 1);

    // Generic settings binding changes checkbox/value without emitting change.
    await cdp.eval(`(() => {
      document.getElementById('s_openMeteoPvEnabled').checked=true;
      document.getElementById('s_pvForecastArrays').value=JSON.stringify([{name:'Süddach',kwp:13.9,tiltDeg:55,azimuthDeg:0,lossPercent:14,inverterLimitW:15000}]);
      window.latestState={
        'settings.forecastSourceMode':{value:'auto'},'settings.openMeteoPvEnabled':{value:true},
        'settings.pvForecastArrays':{value:document.getElementById('s_pvForecastArrays').value},
        'forecast.openMeteoPv.valid':{value:true},'forecast.openMeteoPv.source':{value:'open-meteo-gti'},
        'forecast.openMeteoPv.updatedAt':{value:Date.now()},'forecast.openMeteoPv.ageMs':{value:0},
        'forecast.openMeteoPv.kwhNext6h':{value:2.4},'forecast.openMeteoPv.kwhNext12h':{value:12.8},
        'forecast.openMeteoPv.kwhNext24h':{value:24.6},'forecast.openMeteoPv.points':{value:192},
        'forecast.openMeteoPv.positivePoints':{value:65},'forecast.openMeteoPv.locationSource':{value:'system-coordinates'},
        'forecast.openMeteoPv.locationText':{value:'Rhede · EOS Admin'},'forecast.openMeteoPv.error':{value:''}
      };
    })()`);
    await wait(3300);
    const hydrated = await cdp.eval(`(() => {window.nwForecastSettings.hydrateEditor(true); const row=document.querySelector('#nwPvArrayRows tr'); return {
      hidden:document.getElementById('nwOpenMeteoPvFields').classList.contains('hidden'), rows:document.querySelectorAll('#nwPvArrayRows tr').length,
      kwp:row.querySelector('[data-field="kwp"]').value, orientation:row.querySelector('[data-field="azimuthDeg"]').selectedOptions[0].textContent,
      status:document.getElementById('nwForecastStatus').textContent, source:document.getElementById('nwForecastSource').textContent,
      location:document.getElementById('nwForecastLocation').textContent, points:document.getElementById('nwForecastPoints').textContent,
      e24:document.getElementById('nwForecast24h').textContent
    };})()`);
    assert.equal(hydrated.hidden, false);
    assert.equal(hydrated.rows, 1);
    assert.equal(hydrated.kwp, '13.9');
    assert.equal(hydrated.orientation, 'Süd');
    assert.equal(hydrated.status, 'Prognose aktiv');
    assert.equal(hydrated.source, 'Open-Meteo');
    assert.match(hydrated.location, /Rhede/);
    assert.equal(hydrated.points, '192');
    assert.match(hydrated.e24, /24[,.]6(?:0)? kWh/);
  } finally {
    if (cdp) cdp.close();
    try { browser.kill('SIGTERM'); } catch (_) {}
    await wait(200);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) {}
  }
}

(async () => {
  await verifyBackend();
  await verifyBrowser();
  console.log('[rc75-pv-forecast-admin-location] OK: EOS-Admin-Standort, direkte GTI-Abfragen, sichtbare PV-Flächentabelle, Prognosewerte und zentrale EMS-Verknüpfung geprüft.');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
