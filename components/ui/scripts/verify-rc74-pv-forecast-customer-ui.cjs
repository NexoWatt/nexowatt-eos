#!/usr/bin/env node
'use strict';

/**
 * RC74 – Open-Meteo Forecast-Reparatur und einfacher Endkunden-PV-Flächeneditor.
 *
 * Der Test arbeitet vollständig offline. Geocoding- und Forecast-Antworten werden
 * deterministisch simuliert; der Browser-Smoke-Test nutzt nur lokale HTML-Fragmente.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const settingsHtml = fs.readFileSync(path.join(ROOT, 'www/settings.html'), 'utf8');
const settingsJs = fs.readFileSync(path.join(ROOT, 'www/forecast-settings.js'), 'utf8');
const settingsTs = fs.readFileSync(path.join(ROOT, 'src-ts/runtime-executables/www/forecast-settings.ts'), 'utf8');
const forecastTs = fs.readFileSync(path.join(ROOT, 'src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts'), 'utf8');
const styles = fs.readFileSync(path.join(ROOT, 'www/styles.css'), 'utf8');
const { startOpenMeteoPvForecastRuntime } = require('../ems/services/open-meteo-pv-forecast');

// ---------------------------------------------------------------------------
// Auslieferungs- und UI-Verträge
// ---------------------------------------------------------------------------
assert(/<script\s+src="\/static\/forecast-settings\.js(?:\?[^"]*)?"\s+defer><\/script>/.test(settingsHtml), 'Forecast-Helfer muss über /static ausgeliefert werden');
assert(!settingsHtml.includes('<script src="forecast-settings.js" defer></script>'), 'defekter relativer Forecast-Scriptpfad darf nicht zurückkehren');
assert(settingsHtml.includes('id="nwPvArrayRows"'));
assert(settingsHtml.includes('id="nwPvArrayAdd"'));
assert(settingsHtml.includes('+ PV-Fläche hinzufügen'));
assert(settingsHtml.includes('id="s_pvForecastArrays"'));
assert(!settingsHtml.includes('Mehrere PV‑Flächen / Experten‑JSON'));
assert(!settingsHtml.includes('Mehrere PV-Flächen / Experten-JSON'));
for (const label of ['Nord', 'Nordost', 'Ost', 'Südost', 'Süd', 'Südwest', 'West', 'Nordwest']) {
  assert(settingsTs.includes(`label: '${label}'`), `Ausrichtung ${label} fehlt`);
}
assert(styles.includes('.nw-pv-array-table'));
assert(styles.includes('@media (max-width: 920px)'));
assert(forecastTs.includes('https://geocoding-api.open-meteo.com/v1/search'));
assert(forecastTs.includes('locationSource'));
assert(forecastTs.includes('timeformat=unixtime'));
assert(forecastTs.includes('timezone=GMT'));
assert(settingsTs.includes('forecast.openMeteoPv.error'));
assert(settingsTs.includes('Einstellungen werden übernommen'));
const mainSource = fs.readFileSync(path.join(ROOT, 'src-ts/runtime-executables/main.ts'), 'utf8');
assert(mainSource.includes('weatherEnabled|weatherUsageMode|weatherApiKey|forecastSourceMode'), 'Wetter- und Forecast-Änderungen müssen sofort aktualisieren');
assert(settingsTs.includes('Keine Prognosedaten empfangen'));

// ---------------------------------------------------------------------------
// Backend: Ort/PLZ -> Geocoding -> Forecast -> Diagnose-States
// ---------------------------------------------------------------------------
function buildForecastFixture(nowMs) {
  const hour = Math.floor(nowMs / 3_600_000) * 3_600_000;
  const time = [];
  const temperature_2m = [];
  const shortwave_radiation = [];
  const direct_normal_irradiance = [];
  const diffuse_radiation = [];
  const cloud_cover = [];
  for (let index = 0; index < 72; index += 1) {
    const ts = hour + index * 3_600_000;
    time.push(Math.floor(ts / 1000));
    const h = new Date(ts).getUTCHours();
    const sun = h >= 5 && h <= 19 ? Math.max(0, Math.sin(Math.PI * (h - 5) / 14)) : 0;
    temperature_2m.push(20 + 5 * sun);
    shortwave_radiation.push(820 * sun);
    direct_normal_irradiance.push(620 * sun);
    diffuse_radiation.push(200 * sun);
    cloud_cover.push(20);
  }
  return { hourly: { time, temperature_2m, shortwave_radiation, direct_normal_irradiance, diffuse_radiation, cloud_cover } };
}

async function verifyBackend() {
  const calls = [];
  const states = new Map();
  const settings = {
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
      { name: 'Süd', kwp: 8.9, tiltDeg: 35, azimuthDeg: 0, lossPercent: 14, inverterLimitW: 10_000 },
      { name: 'Ost', kwp: 5, tiltDeg: 25, azimuthDeg: -90, lossPercent: 14, inverterLimitW: 6_000 },
    ]),
    weatherUsageMode: 'private',
    weatherApiKey: '',
  };
  const fixture = buildForecastFixture(Date.now());
  const adapter = {
    stateCache: Object.fromEntries(Object.entries(settings).map(([key, value]) => [`settings.${key}`, { value }])),
    _nwGetSystemGeo: async () => ({ lat: 0, lon: 0, locName: 'Rhede' }),
    getForeignObjectAsync: async () => ({ common: { latitude: '', longitude: '', city: 'Rhede', postalCode: '46414', country: 'Deutschland' } }),
    _nwHttpsGetJson: async (url) => {
      calls.push(url);
      if (url.includes('geocoding-api.open-meteo.com')) {
        return { results: [{ name: 'Rhede', admin1: 'Nordrhein-Westfalen', country: 'Deutschland', latitude: 51.835, longitude: 6.696, postcodes: ['46414'] }] };
      }
      return fixture;
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
  assert.equal(snapshot.locationSource, 'system-geocoding');
  assert.match(snapshot.locationText, /Rhede/);
  assert(snapshot.kwhNext24h > 0);
  assert(calls.some((url) => url.includes('name=46414')));
  assert(calls.some((url) => url.includes('latitude=51.835') && url.includes('direct_normal_irradiance')));
  assert.equal(states.get('forecast.openMeteoPv.valid'), true);
  assert.equal(states.get('forecast.openMeteoPv.locationSource'), 'system-geocoding');
  assert.match(String(states.get('forecast.openMeteoPv.locationText')), /Rhede/);
  assert(states.get('forecast.openMeteoPv.kwhNext24h') > 0);
}

// ---------------------------------------------------------------------------
// Browser: Tabelle, Plus-Button, Richtungswahl, JSON-Kompatibilitätsfeld, Status
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
  if (!CHROMIUM) return;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-rc74-forecast-'));
  const browser = spawn(CHROMIUM, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--disable-background-networking', '--disable-extensions', '--no-first-run',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let port = null;
  let stderr = '';
  let cdp;
  browser.stderr.on('data', (chunk) => {
    stderr += String(chunk);
    const match = /DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//.exec(stderr);
    if (match) port = Number(match[1]);
  });
  try {
    await waitFor(() => port, 8_000, 'Chromium-Port');
    const tabs = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
    cdp = new CdpClient(tabs[0].webSocketDebuggerUrl);
    await cdp.open();
    await cdp.send('Runtime.enable');

    const html = `<!doctype html><html><body>
      <select id="s_forecastSourceMode"><option value="auto" selected>Auto</option><option value="datapoint">DP</option></select>
      <div class="row"><input id="s_forecastFallbackToDatapoints" type="checkbox"></div>
      <input id="s_openMeteoPvEnabled" type="checkbox" checked>
      <div id="nwOpenMeteoPvFields">
        <button id="nwPvArrayAdd" type="button">+</button>
        <table><tbody id="nwPvArrayRows"></tbody></table>
        <small id="nwPvArrayValidation" class="hidden"></small>
        <input id="s_pvForecastInstalledKwp" value="13.9">
        <input id="s_pvForecastTiltDeg" value="55">
        <input id="s_pvForecastAzimuthDeg" value="0">
        <input id="s_pvForecastLossPercent" value="14">
        <input id="s_pvForecastInverterLimitW" value="15000">
        <textarea id="s_pvForecastArrays" data-nw-bound="1">[]</textarea>
      </div>
      <strong id="nwForecastStatus"></strong><strong id="nwForecastSource"></strong><strong id="nwForecastLocation"></strong>
      <strong id="nwForecastUpdated"></strong><strong id="nwForecast6h"></strong><strong id="nwForecast12h"></strong>
      <strong id="nwForecast24h"></strong><strong id="nwForecastPoints"></strong><small id="nwForecastError" class="hidden"></small>
    </body></html>`;
    await cdp.eval(`document.documentElement.innerHTML=${JSON.stringify(html)}; window.latestState=${JSON.stringify({
      'settings.forecastSourceMode': { value: 'auto' },
      'settings.openMeteoPvEnabled': { value: true },
      'forecast.openMeteoPv.valid': { value: true },
      'forecast.openMeteoPv.source': { value: 'open-meteo-gti' },
      'forecast.openMeteoPv.updatedAt': { value: Date.now() },
      'forecast.openMeteoPv.ageMs': { value: 0 },
      'forecast.openMeteoPv.kwhNext6h': { value: 4.2 },
      'forecast.openMeteoPv.kwhNext12h': { value: 16.3 },
      'forecast.openMeteoPv.kwhNext24h': { value: 29.8 },
      'forecast.openMeteoPv.points': { value: 192 },
      'forecast.openMeteoPv.locationText': { value: 'Rhede, Nordrhein-Westfalen, Deutschland' },
      'forecast.openMeteoPv.statusText': { value: 'Open-Meteo PV-Prognose aktiv' },
    })};`);
    await cdp.eval(`(0,eval)(${JSON.stringify(settingsJs + '\n//# sourceURL=forecast-settings.js')})`);

    const initial = await cdp.eval(`(() => {
      const row=document.querySelector('#nwPvArrayRows tr');
      return {
        rows:document.querySelectorAll('#nwPvArrayRows tr').length,
        kwp:row.querySelector('[data-field="kwp"]').value,
        tilt:row.querySelector('[data-field="tiltDeg"]').value,
        orientation:row.querySelector('[data-field="azimuthDeg"]').value,
        orientationText:row.querySelector('[data-field="azimuthDeg"]').selectedOptions[0].textContent,
        status:document.getElementById('nwForecastStatus').textContent,
        source:document.getElementById('nwForecastSource').textContent,
        location:document.getElementById('nwForecastLocation').textContent,
        points:document.getElementById('nwForecastPoints').textContent,
      };
    })()`);
    assert.equal(initial.rows, 1);
    assert.equal(initial.kwp, '13.9');
    assert.equal(initial.tilt, '55');
    assert.equal(initial.orientation, '0');
    assert.equal(initial.orientationText, 'Süd');
    assert.equal(initial.status, 'Prognose aktiv');
    assert.equal(initial.source, 'Open-Meteo');
    assert.match(initial.location, /Rhede/);
    assert.equal(initial.points, '192');

    await cdp.eval(`(() => {
      document.getElementById('nwPvArrayAdd').click();
      const row=document.querySelector('#nwPvArrayRows tr:last-child');
      const set=(field,value,event='input')=>{const el=row.querySelector('[data-field="'+field+'"]');el.value=String(value);el.dispatchEvent(new Event(event,{bubbles:true}));};
      set('name','Ostdach'); set('kwp',5.1); set('tiltDeg',30); set('azimuthDeg',-90,'change'); set('lossPercent',12); set('inverterLimitKw',6);
    })()`);
    await wait(650);
    const saved = await cdp.eval(`(() => ({
      rows:document.querySelectorAll('#nwPvArrayRows tr').length,
      raw:document.getElementById('s_pvForecastArrays').value,
      removeDisabled:Array.from(document.querySelectorAll('.nw-pv-array-remove')).map((button)=>button.disabled),
    }))()`);
    assert.equal(saved.rows, 2);
    const arrays = JSON.parse(saved.raw);
    assert.equal(arrays.length, 2);
    assert.equal(arrays[1].name, 'Ostdach');
    assert.equal(arrays[1].kwp, 5.1);
    assert.equal(arrays[1].azimuthDeg, -90);
    assert.equal(arrays[1].inverterLimitW, 6000);
    assert.deepEqual(saved.removeDisabled, [false, false]);

    await cdp.eval(`(() => {
      window.latestState={
        'settings.forecastSourceMode':{value:'auto'},
        'forecast.pv.valid':{value:false},
        'forecast.pv.statusText':{value:'Open-Meteo nicht verfügbar und kein AppCenter-Forecast gemappt'},
        'forecast.openMeteoPv.valid':{value:false},
        'forecast.openMeteoPv.error':{value:'Anlagenstandort nicht konfiguriert'}
      };
    })()`);
    await wait(3_200);
    const error = await cdp.eval(`(() => ({status:document.getElementById('nwForecastStatus').textContent,text:document.getElementById('nwForecastError').textContent,hidden:document.getElementById('nwForecastError').classList.contains('hidden')}))()`);
    assert.equal(error.status, 'Keine aktuelle Prognose');
    assert.equal(error.hidden, false);
    assert.match(error.text, /Anlagenstandort|Systemstandort/);
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
  console.log('[rc74-pv-forecast-customer-ui] OK: Scriptpfad, PV-Flächentabelle, Richtungswahl, Standortauflösung, Open-Meteo-Werte und Statusdiagnose geprüft.');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
