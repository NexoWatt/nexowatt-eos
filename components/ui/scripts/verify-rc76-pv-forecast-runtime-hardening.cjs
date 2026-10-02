#!/usr/bin/env node
'use strict';

/**
 * RC76 – Open-Meteo forecast hardening and responsive PV array editor.
 *
 * Offline regression coverage:
 * - native 15-minute GTI,
 * - hourly GTI fallback,
 * - hourly GHI/DNI/DHI fallback,
 * - valid all-zero/night forecast,
 * - stale-last-good forecast after request failure,
 * - central weather-location label,
 * - container-width responsive PV array UI without field overlap,
 * - provider failure diagnostics in the customer frontend.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const {
  startOpenMeteoPvForecastRuntime,
} = require('../ems/services/open-meteo-pv-forecast');

const settingsTs = read('src-ts/runtime-executables/www/forecast-settings.ts');
const settingsJs = read('www/forecast-settings.js');
const settingsHtml = read('www/settings.html');
const styles = read('www/styles.css');
const backendTs = read('src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts');
const pvModuleTs = read('src-ts/runtime-executables/ems/modules/pv-forecast.ts');

// Static contracts.
assert(settingsHtml.includes('id="nwForecastAttempt"'));
assert(settingsHtml.includes('id="nwForecastRequestMode"'));
assert(settingsHtml.includes('id="nwForecastPositivePoints"'));
assert(settingsTs.includes("'hourly-components': 'GHI/DNI/DHI-Fallback'"));
assert(settingsTs.includes("providerRequestStatus === 'ok-zero-production'"));
assert(styles.includes('container-name:nw-pv-array-editor'));
assert(/@container\s+nw-pv-array-editor\s*\(max-width:\s*\d+px\)/.test(styles));
assert(styles.includes('.nw-pv-array-remove[hidden]{display:none!important;}'));
assert(backendTs.includes("requestMode = 'hourly-gti'"));
assert(backendTs.includes("requestMode = 'hourly-components'"));
assert(backendTs.includes("requestStatus: 'stale-error'"));
assert(backendTs.includes("'ok-zero-production'"));
assert(backendTs.includes('requestJsonWithRetry'));
assert(pvModuleTs.includes('const valid = anyFuture && segs.length > 0'));

const QUARTER = 15 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

function futureStart(now, interval) {
  return Math.floor(now / interval) * interval;
}
function radiation(now, interval, count, positive = true) {
  const first = futureStart(now, interval);
  const time = [];
  const values = [];
  const temperature = [];
  for (let index = 0; index < count; index += 1) {
    const ts = first + index * interval;
    time.push(Math.floor(ts / 1000));
    const phase = count <= 1 ? 0 : index / (count - 1);
    const sun = positive ? Math.max(0, Math.sin(Math.PI * phase)) : 0;
    values.push(Math.round(850 * sun * 1000) / 1000);
    temperature.push(16 + 12 * sun);
  }
  return { time, values, temperature };
}
function minutelyFixture(now, positive = true) {
  const series = radiation(now, QUARTER, 192, positive);
  return { minutely_15: { time: series.time, global_tilted_irradiance: series.values, temperature_2m: series.temperature } };
}
function hourlyGtiFixture(now, positive = true) {
  const series = radiation(now, HOUR, 52, positive);
  return { hourly: { time: series.time, global_tilted_irradiance: series.values, temperature_2m: series.temperature } };
}
function componentFixture(now, positive = true) {
  const series = radiation(now, HOUR, 52, positive);
  return {
    hourly: {
      time: series.time,
      temperature_2m: series.temperature,
      shortwave_radiation: series.values,
      direct_normal_irradiance: series.values.map((value) => value * 0.72),
      diffuse_radiation: series.values.map((value) => value * 0.28),
      cloud_cover: series.values.map(() => 15),
    },
  };
}
function emptyFor(url) {
  const parsed = new URL(url);
  if (parsed.searchParams.has('minutely_15')) return { minutely_15: { time: [], global_tilted_irradiance: [], temperature_2m: [] } };
  return { hourly: { time: [], global_tilted_irradiance: [], temperature_2m: [] } };
}

function makeAdapter(handler, options = {}) {
  const states = new Map();
  const settings = {
    weatherEnabled: true,
    openMeteoPvEnabled: true,
    forecastSourceMode: 'auto',
    openMeteoLatitude: 0,
    openMeteoLongitude: 0,
    openMeteoTimezone: 'auto',
    forecastUpdateIntervalMin: 5,
    forecastHorizonHours: 48,
    pvForecastPlanningSafetyPct: 85,
    pvForecastInstalledKwp: 0,
    pvForecastTiltDeg: 30,
    pvForecastAzimuthDeg: 0,
    pvForecastLossPercent: 14,
    pvForecastInverterLimitW: 0,
    pvForecastArrays: JSON.stringify([{ name: 'Süddach', kwp: 13.9, tiltDeg: 55, azimuthDeg: 0, lossPercent: 14, inverterLimitW: 15000 }]),
    weatherUsageMode: 'private',
    weatherApiKey: '',
    ...(options.settings || {}),
  };
  const adapter = {
    stateCache: Object.fromEntries(Object.entries(settings).map(([key, value]) => [`settings.${key}`, { value }])),
    _openMeteoPvForecast: options.previous || undefined,
    _nwGetSystemGeo: async () => ({ lat: 51.835, lon: 6.696, locName: 'NexoWatt EOS' }),
    getForeignObjectAsync: async () => ({ common: { latitude: 51.835, longitude: 6.696, postalCode: '46414', city: 'Rhede', country: 'Deutschland' } }),
    getStateAsync: async (id) => id === 'weatherLocation' ? { val: 'Rhede, Nordrhein-Westfalen, Deutschland' } : null,
    _nwHttpsGetJson: handler,
    setObjectNotExistsAsync: async () => {},
    setStateAsync: async (id, state) => { states.set(id, state.val); },
    setTimeout: () => ({ fake: true }),
    clearTimeout: () => {},
    log: { debug() {}, warn() {} },
  };
  return { adapter, states };
}

async function runRuntime(handler, options) {
  const { adapter, states } = makeAdapter(handler, options);
  const runtime = startOpenMeteoPvForecastRuntime(adapter);
  const result = await runtime.refresh();
  runtime.stop();
  return { result, states, adapter };
}

async function verifyBackendFallbacks() {
  const now = Date.now();

  // Native 15-minute all-zero curve remains valid (e.g. night).
  {
    const calls = [];
    const { result, states } = await runRuntime(async (url) => { calls.push(url); return minutelyFixture(now, false); });
    assert.equal(result.valid, true);
    assert.equal(result.requestMode, 'minutely-gti');
    assert.equal(result.requestStatus, 'ok-zero-production');
    assert(result.points >= 180);
    assert.equal(result.positivePoints, 0);
    assert.equal(result.kwhNext24h, 0);
    assert.equal(states.get('forecast.openMeteoPv.valid'), true);
    assert.equal(states.get('forecast.openMeteoPv.requestStatus'), 'ok-zero-production');
    assert.match(result.locationText, /Rhede/);
    assert.equal(calls.length, 1);
  }

  // Empty native GTI -> hourly GTI fallback.
  {
    const calls = [];
    const { result } = await runRuntime(async (url) => {
      calls.push(url);
      const params = new URL(url).searchParams;
      if (params.has('minutely_15')) return emptyFor(url);
      if (String(params.get('hourly') || '').includes('global_tilted_irradiance')) return hourlyGtiFixture(now, true);
      throw new Error('unexpected components request');
    });
    assert.equal(result.valid, true);
    assert.equal(result.requestMode, 'hourly-gti');
    assert.equal(result.requestStatus, 'fallback');
    assert(result.points > 40);
    assert(result.positivePoints > 0);
    assert(calls.some((url) => url.includes('minutely_15=')));
    assert(calls.some((url) => url.includes('hourly=global_tilted_irradiance')));
  }

  // Empty native and hourly GTI -> GHI/DNI/DHI local plane-of-array fallback.
  {
    const calls = [];
    const { result } = await runRuntime(async (url) => {
      calls.push(url);
      const params = new URL(url).searchParams;
      const hourly = String(params.get('hourly') || '');
      if (params.has('minutely_15')) return emptyFor(url);
      if (hourly.includes('global_tilted_irradiance')) return emptyFor(url);
      if (hourly.includes('shortwave_radiation')) return componentFixture(now, true);
      throw new Error('unexpected request');
    });
    assert.equal(result.valid, true);
    assert.equal(result.requestMode, 'hourly-components');
    assert.equal(result.requestStatus, 'fallback');
    assert(result.points > 40);
    assert(result.kwhNext24h > 0);
    assert(calls.some((url) => url.includes('direct_normal_irradiance')));
  }

  // Last good forecast survives a temporary provider outage with explicit stale diagnostics.
  {
    const previous = {
      ts: now - 10 * 60 * 1000,
      valid: true,
      source: 'open-meteo-gti',
      ageMs: 0,
      points: 2,
      positivePoints: 1,
      requestCount: 1,
      requestMode: 'minutely-gti',
      requestStatus: 'ok',
      lastAttemptAt: now - 10 * 60 * 1000,
      lastSuccessAt: now - 10 * 60 * 1000,
      configuredKwp: 13.9,
      planningSafetyPct: 85,
      kwhNext6h: 1.2,
      kwhNext12h: 3.4,
      kwhNext24h: 5.6,
      peakWNext24h: 4500,
      statusText: 'previous',
      error: '',
      latitude: 51.835,
      longitude: 6.696,
      locationText: 'Rhede',
      locationSource: 'system-coordinates',
      curve: [{ t: now, dtMs: QUARTER, w: 4500 }, { t: now + QUARTER, dtMs: QUARTER, w: 0 }],
    };
    const { result, states } = await runRuntime(async () => { throw new Error('timeout'); }, { previous });
    assert.equal(result.valid, true);
    assert.equal(result.requestStatus, 'stale-error');
    assert.match(result.error, /timeout/);
    assert(result.ageMs > 0);
    assert.equal(states.get('forecast.openMeteoPv.requestStatus'), 'stale-error');
    assert.equal(states.get('forecast.openMeteoPv.lastSuccessAt'), previous.lastSuccessAt);
  }
}

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

async function verifyBrowserLayoutAndDiagnostics() {
  if (!CHROMIUM) {
    console.log('[rc76] Browser-Smoke übersprungen: Chromium nicht gefunden.');
    return;
  }
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-rc76-forecast-'));
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
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
    const html = `<!doctype html><html><head><style>${styles}</style></head><body style="margin:0;background:#061421;color:white">
      <div id="nwOpenMeteoPvFields" style="width:930px;margin:20px">
        <section class="nw-pv-array-editor">
          <div class="nw-pv-array-editor__header"><div><div class="nw-pv-array-editor__title">PV-Flächen</div></div><button id="nwPvArrayAdd" type="button">+ PV-Fläche</button></div>
          <div class="nw-pv-array-table-wrap"><table class="nw-pv-array-table"><thead><tr><th>Bezeichnung</th><th>Leistung</th><th>Neigung</th><th>Ausrichtung</th><th>Verluste</th><th>WR-Grenze</th><th></th></tr></thead><tbody id="nwPvArrayRows"></tbody></table></div>
          <small id="nwPvArrayValidation" class="hidden"></small>
        </section>
        <input id="s_pvForecastInstalledKwp" value="0"><input id="s_pvForecastTiltDeg" value="30"><input id="s_pvForecastAzimuthDeg" value="0"><input id="s_pvForecastLossPercent" value="14"><input id="s_pvForecastInverterLimitW" value="0"><textarea id="s_pvForecastArrays">[]</textarea>
      </div>
      <select id="s_forecastSourceMode"><option value="auto" selected>Auto</option><option value="open-meteo">Open</option></select>
      <div class="row"><input id="s_forecastFallbackToDatapoints" type="checkbox" checked></div><input id="s_openMeteoPvEnabled" type="checkbox" checked>
      <strong id="nwForecastStatus"></strong><strong id="nwForecastSource"></strong><strong id="nwForecastLocation"></strong><strong id="nwForecastUpdated"></strong><strong id="nwForecastAttempt"></strong><strong id="nwForecastRequestMode"></strong>
      <strong id="nwForecast6h"></strong><strong id="nwForecast12h"></strong><strong id="nwForecast24h"></strong><strong id="nwForecastPoints"></strong><strong id="nwForecastPositivePoints"></strong><small id="nwForecastError" class="hidden"></small>
    </body></html>`;
    await cdp.eval(`document.documentElement.innerHTML=${JSON.stringify(html)}; window.latestState={
      'settings.forecastSourceMode':{value:'auto'},'settings.openMeteoPvEnabled':{value:true},
      'settings.pvForecastArrays':{value:JSON.stringify([{name:'Süddach',kwp:13.9,tiltDeg:55,azimuthDeg:0,lossPercent:14,inverterLimitW:15000}])}
    };`);
    await cdp.eval(`(0,eval)(${JSON.stringify(settingsJs + '\n//# sourceURL=forecast-settings.js')})`);
    await wait(250);

    const oneRow = await cdp.eval(`(() => { const row=document.querySelector('#nwPvArrayRows tr'); const wr=row.querySelector('[data-field="inverterLimitKw"]'); const remove=row.querySelector('.nw-pv-array-remove'); const a=wr.getBoundingClientRect(); const b=remove.getBoundingClientRect(); return {rows:document.querySelectorAll('#nwPvArrayRows tr').length,removeDisplay:getComputedStyle(remove).display,removeHidden:remove.hidden,overlap:!(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top),scroll:document.querySelector('.nw-pv-array-table-wrap').scrollWidth-document.querySelector('.nw-pv-array-table-wrap').clientWidth}; })()`);
    assert.equal(oneRow.rows, 1);
    assert.equal(oneRow.removeHidden, true);
    assert.equal(oneRow.removeDisplay, 'none');
    assert.equal(oneRow.overlap, false);
    assert(oneRow.scroll <= 2, `930px container must fit without horizontal overflow, got ${oneRow.scroll}`);

    // Add a second row and make sure the action column cannot overlap the WR field.
    await cdp.eval(`document.getElementById('nwPvArrayAdd').click()`);
    await wait(100);
    const twoRows = await cdp.eval(`(() => { const row=document.querySelectorAll('#nwPvArrayRows tr')[1]; const wr=row.querySelector('[data-field="inverterLimitKw"]').getBoundingClientRect(); const remove=row.querySelector('.nw-pv-array-remove'); const b=remove.getBoundingClientRect(); return {display:getComputedStyle(remove).display,hidden:remove.hidden,overlap:!(wr.right<=b.left||b.right<=wr.left||wr.bottom<=b.top||b.bottom<=wr.top)}; })()`);
    assert.equal(twoRows.hidden, false);
    assert.notEqual(twoRows.display, 'none');
    assert.equal(twoRows.overlap, false);

    // Wide browser, narrow content panel: container query must switch to card layout.
    await cdp.eval(`document.getElementById('nwOpenMeteoPvFields').style.width='760px'`);
    await wait(100);
    const card = await cdp.eval(`(() => { const table=document.querySelector('.nw-pv-array-table'); const row=document.querySelector('#nwPvArrayRows tr'); const cell=row.querySelector('td'); const wrap=document.querySelector('.nw-pv-array-table-wrap'); return {rowDisplay:getComputedStyle(row).display,cellDisplay:getComputedStyle(cell).display,overflow:wrap.scrollWidth-wrap.clientWidth,tableMin:getComputedStyle(table).minWidth}; })()`);
    assert.equal(card.rowDisplay, 'block');
    assert.equal(card.cellDisplay, 'grid');
    assert(card.overflow <= 2, `card layout must not overflow, got ${card.overflow}`);

    // Explicit provider error must be visible instead of a permanent empty status.
    await cdp.eval(`window.latestState={
      'settings.forecastSourceMode':{value:'open-meteo'},'settings.openMeteoPvEnabled':{value:true},
      'settings.pvForecastArrays':{value:JSON.stringify([{name:'Süddach',kwp:13.9,tiltDeg:55,azimuthDeg:0,lossPercent:14,inverterLimitW:15000}])},
      'forecast.openMeteoPv.valid':{value:false},'forecast.openMeteoPv.source':{value:'open-meteo-gti'},
      'forecast.openMeteoPv.requestStatus':{value:'error'},'forecast.openMeteoPv.requestMode':{value:'hourly-components'},
      'forecast.openMeteoPv.lastAttemptAt':{value:Date.now()-60000},'forecast.openMeteoPv.points':{value:0},
      'forecast.openMeteoPv.locationText':{value:'Rhede, Nordrhein-Westfalen, Deutschland'},
      'forecast.openMeteoPv.locationSource':{value:'system-coordinates'},'forecast.openMeteoPv.error':{value:'Open-Meteo timeout'}
    }; window.nwForecastSettings.updateStatus();`);
    const errorStatus = await cdp.eval(`(() => ({status:document.getElementById('nwForecastStatus').textContent,source:document.getElementById('nwForecastSource').textContent,location:document.getElementById('nwForecastLocation').textContent,attempt:document.getElementById('nwForecastAttempt').textContent,mode:document.getElementById('nwForecastRequestMode').textContent,error:document.getElementById('nwForecastError').textContent,errorHidden:document.getElementById('nwForecastError').classList.contains('hidden')}))()`);
    assert.equal(errorStatus.status, 'Open-Meteo-Abruf fehlgeschlagen');
    assert.match(errorStatus.source, /Open-Meteo/);
    assert.match(errorStatus.location, /Rhede/);
    assert.notEqual(errorStatus.attempt, '—');
    assert.equal(errorStatus.mode, 'GHI/DNI/DHI-Fallback');
    assert.match(errorStatus.error, /antwortet derzeit nicht rechtzeitig/i);
    assert.equal(errorStatus.errorHidden, false);

    // A valid all-zero/night curve is active, not an error.
    await cdp.eval(`window.latestState={
      'settings.forecastSourceMode':{value:'open-meteo'},'settings.openMeteoPvEnabled':{value:true},
      'forecast.openMeteoPv.valid':{value:true},'forecast.openMeteoPv.source':{value:'open-meteo-gti'},
      'forecast.openMeteoPv.requestStatus':{value:'ok-zero-production'},'forecast.openMeteoPv.requestMode':{value:'minutely-gti'},
      'forecast.openMeteoPv.lastAttemptAt':{value:Date.now()},'forecast.openMeteoPv.lastSuccessAt':{value:Date.now()},
      'forecast.openMeteoPv.ageMs':{value:0},'forecast.openMeteoPv.points':{value:192},'forecast.openMeteoPv.positivePoints':{value:0},
      'forecast.openMeteoPv.locationText':{value:'Rhede, Nordrhein-Westfalen, Deutschland'},
      'forecast.openMeteoPv.kwhNext6h':{value:0},'forecast.openMeteoPv.kwhNext12h':{value:0},'forecast.openMeteoPv.kwhNext24h':{value:0},
      'forecast.openMeteoPv.error':{value:''},'forecast.openMeteoPv.statusText':{value:'aktuell 0 W'}
    }; window.nwForecastSettings.updateStatus();`);
    const zero = await cdp.eval(`(() => ({status:document.getElementById('nwForecastStatus').textContent,points:document.getElementById('nwForecastPoints').textContent,positive:document.getElementById('nwForecastPositivePoints').textContent,e24:document.getElementById('nwForecast24h').textContent,errorHidden:document.getElementById('nwForecastError').classList.contains('hidden')}))()`);
    assert.equal(zero.status, 'Prognose aktiv · aktuell 0 W erwartet');
    assert.equal(zero.points, '192');
    assert.equal(zero.positive, '0');
    assert.match(zero.e24, /0\.00 kWh/);
    assert.equal(zero.errorHidden, true);
  } finally {
    if (cdp) cdp.close();
    try { browser.kill('SIGTERM'); } catch (_) {}
    await wait(200);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) {}
  }
}

(async () => {
  await verifyBackendFallbacks();
  await verifyBrowserLayoutAndDiagnostics();
  console.log('[rc76-pv-forecast-runtime-hardening] OK: GTI-Fallbackkette, Nachtprognose, Standortname, Fehlerdiagnose und überlappungsfreie PV-Flächenansicht geprüft.');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
