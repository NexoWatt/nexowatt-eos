#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const DASHBOARD_JS = fs.readFileSync(path.join(ROOT, 'www/dashboard-lp-status.js'), 'utf8');
const HTML = fs.readFileSync(path.join(ROOT, 'www/index.html'), 'utf8');
const CSS = fs.readFileSync(path.join(ROOT, 'www/styles.css'), 'utf8');
const APP_SOURCE = fs.readFileSync(path.join(ROOT, 'src-ts/runtime-executables/www/app.ts'), 'utf8');
const DASHBOARD_SOURCE = fs.readFileSync(path.join(ROOT, 'src-ts/runtime-executables/www/dashboard-lp-status.ts'), 'utf8');
const PACKAGE = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const CHROMIUM = [process.env.CHROMIUM_BIN, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']
  .find((candidate) => candidate && fs.existsSync(candidate));

for (const token of [
  'sideEvcsStatusBlock', 'sideEvcsStatusSummary', 'sideEvcsStatusList',
]) assert(HTML.includes(token), `Dashboard-HTML fehlt: ${token}`);
for (const token of [
  '.nw-evcs-system-block', '.nw-evcs-system-item.is-error', '.nw-panel-status.is-warn',
]) assert(CSS.includes(token), `Dashboard-CSS fehlt: ${token}`);
assert(HTML.includes('<script src="/static/dashboard-lp-status.js"></script>'), 'Dashboard-Modul wird nicht geladen');
assert(
  HTML.indexOf('/static/dashboard-lp-status.js') < HTML.indexOf('/static/app.js'),
  'Dashboard-Modul muss vor app.js geladen werden',
);
assert(Array.isArray(PACKAGE.files) && PACKAGE.files.includes('www/dashboard-lp-status.js'), 'Dashboard-Modul fehlt im npm-Paket');
for (const token of [
  'dashboardWindow.NexoWattLpStatusPresenter', 'function build', 'function render',
  'chargingManagement.audit.snapshotJson', 'para14a.communicationFallbackActive',
]) assert(DASHBOARD_SOURCE.includes(token), `Dashboard-Statusmodul fehlt: ${token}`);
assert(
  APP_SOURCE.includes('window.NexoWattLpStatusPresenter?.render'),
  'Dashboard-App bindet den LP-Statuspresenter nicht ein',
);

if (!CHROMIUM) {
  console.log('[rc69-dashboard-lp-feedback] OK (statisch); Browsertest übersprungen, Chromium nicht gefunden.');
  process.exit(0);
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(test, timeoutMs, label) {
  const started = Date.now();
  let last;
  while (Date.now() - started < timeoutMs) {
    try {
      last = await test();
      if (last) return last;
    } catch (error) {
      last = error;
    }
    await wait(60);
  }
  throw new Error(`Timeout bei ${label}: ${last && last.message ? last.message : JSON.stringify(last)}`);
}

class CdpClient {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
  }
  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(String(event.data || '{}'));
      if (!msg.id || !this.pending.has(msg.id)) return;
      const pending = this.pending.get(msg.id);
      this.pending.delete(msg.id);
      if (msg.error) pending.reject(new Error(`${msg.error.code}: ${msg.error.message}`));
      else pending.resolve(msg.result || {});
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

function audit(wallboxes, options = {}) {
  return JSON.stringify({
    schemaVersion: 1,
    ts: Date.now(),
    mode: 'auto',
    status: options.status || 'running',
    activeLimiter: options.activeLimiter || 'none',
    safetyStage: options.safetyStage || 'NORMAL',
    safetyStop: options.safetyStop === true,
    safetyReason: options.safetyReason || '',
    safety: {
      valid: options.safetyValid !== false,
      emergencyStop: options.emergencyStop === true,
      invalidReason: options.invalidReason || '',
    },
    wallboxes,
  });
}

function row(safe, overrides = {}) {
  return {
    safe,
    name: overrides.name || safe.toUpperCase(),
    mode: overrides.mode || 'auto',
    userMode: overrides.mode || 'auto',
    online: overrides.online !== false,
    enabled: overrides.enabled !== false,
    controlAvailable: overrides.controlAvailable !== false,
    connected: overrides.connected === true,
    vehicleDemandConfirmed: overrides.vehicleDemandConfirmed === true,
    charging: overrides.charging === true,
    meterStale: overrides.meterStale === true,
    faultActive: overrides.faultActive === true,
    faultReason: overrides.faultReason || '',
    unavailableActive: overrides.unavailableActive === true,
    unavailableReason: overrides.unavailableReason || '',
    actualPowerW: overrides.actualPowerW || 0,
    targetPowerW: overrides.targetPowerW || 0,
    limiter: overrides.limiter || 'none',
    safetyReason: overrides.safetyReason || '',
    reason: overrides.reason || '',
    applyStatus: overrides.applyStatus || 'unchanged',
  };
}

function page() {
  const minimal = `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>${CSS}</style></head><body>
  <section class="card nw-panel nw-panel-status">
    <div class="nw-system-ok" id="sideStatusText">Alle Systeme normal</div>
    <div class="nw-evcs-system-block" id="sideEvcsStatusBlock">
      <div id="sideEvcsStatusSummary"></div><div id="sideEvcsStatusList"></div>
    </div>
  </section>
  <script>
    window.__nwLocale={htmlLang:'de',localeTag:'de-DE'};
    const __nativeAdd=window.addEventListener.bind(window);
    window.addEventListener=function(type,fn,opts){ if(type==='DOMContentLoaded'){ window.__blockedBootstrap=fn; return; } return __nativeAdd(type,fn,opts); };
  <\/script></body></html>`;
  return minimal;
}

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-rc69-lp-status-'));
  const browser = spawn(CHROMIUM, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--disable-background-networking', '--disable-component-update', '--disable-default-apps',
    '--disable-extensions', '--no-first-run', '--remote-debugging-port=0',
    `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  let debugPort = null;
  let stderr = '';
  browser.stderr.on('data', (chunk) => {
    stderr += String(chunk);
    const match = /DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//.exec(stderr);
    if (match) debugPort = Number(match[1]);
  });
  let cdp;
  try {
    await waitFor(() => debugPort, 8000, 'Chromium Debug-Port');
    const tabs = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then((r) => r.json());
    cdp = new CdpClient(tabs[0].webSocketDebuggerUrl);
    await cdp.open();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.eval(`(() => {
      document.head.innerHTML = '';
      document.body.innerHTML = '<section class="card nw-panel nw-panel-status"><div class="nw-system-ok" id="sideStatusText">Alle Systeme normal</div><div class="nw-evcs-system-block" id="sideEvcsStatusBlock"><div id="sideEvcsStatusSummary"></div><div id="sideEvcsStatusList"></div></div></section>';
      const style = document.createElement('style');
      style.textContent = ${JSON.stringify(CSS)};
      document.head.appendChild(style);
      window.__nwLocale = { htmlLang: 'de', localeTag: 'de-DE' };
      const nativeAdd = window.addEventListener.bind(window);
      window.addEventListener = function(type, fn, opts) {
        if (type === 'DOMContentLoaded') { window.__blockedBootstrap = fn; return; }
        return nativeAdd(type, fn, opts);
      };
      return !!document.getElementById('sideStatusText');
    })()`);
    await cdp.eval(`(0, eval)(${JSON.stringify(DASHBOARD_JS + '\n//# sourceURL=rc69-dashboard-lp-status.js')})`);
    await waitFor(() => cdp.eval('!!window.NexoWattLpStatusPresenter'), 8000, 'Presenter');

    const safetyValues = {
      'chargingManagement.audit.snapshotJson': audit([
        row('lp1', { name: 'ABL eMH1', connected: true, charging: true, actualPowerW: 4200, reason: 'para14a-signal-stale' }),
      ], { safetyStage: 'EOS-SAFETY-STOP', safetyStop: true, safetyValid: false, invalidReason: 'para14a-gateway-not-connected' }),
      'chargingManagement.wallboxes.lp1.cfgEnabled': true,
    };
    const safety = await cdp.eval(`(() => {
      const values=${JSON.stringify(safetyValues)};
      const model=window.NexoWattLpStatusPresenter.build(values);
      window.NexoWattLpStatusPresenter.render((key)=>values[key], true);
      return {model, text:document.getElementById('sideStatusText').textContent, rows:[...document.querySelectorAll('.nw-evcs-system-item')].map((el)=>({className:el.className,text:el.textContent}))};
    })()`);
    assert.equal(safety.model.overallLevel, 'error');
    assert.match(safety.model.items[0].headline, /EOS Safety/);
    assert.match(safety.model.items[0].detail, /§14a/);
    assert.match(safety.model.items[0].detail, /4,2 kW/);
    assert.match(safety.text, /EOS Safety/);
    assert.equal(safety.rows.length, 1);
    assert.match(safety.rows[0].className, /is-error/);

    const fallbackValues = {
      'chargingManagement.audit.snapshotJson': audit([
        row('lp1', { name: 'Alfen', connected: true, reason: 'BELOW_MIN' }),
        row('lp2', { name: 'Inaktiv', connected: true }),
      ]),
      'chargingManagement.wallboxes.lp1.cfgEnabled': true,
      'chargingManagement.wallboxes.lp2.cfgEnabled': false,
      'chargingManagement.wallboxes.legacy.name': 'Alter Ladepunkt',
      'chargingManagement.wallboxes.legacy.online': true,
      'para14a.communicationFallbackActive': true,
      'para14a.communicationFallbackReason': 'stale-local-pmin',
      'para14a.fallbackEvcsCapW': 4200,
    };
    const fallback = await cdp.eval(`window.NexoWattLpStatusPresenter.build(${JSON.stringify(fallbackValues)})`);
    assert.equal(fallback.items.length, 1, 'Inaktiver Ladepunkt darf nicht angezeigt werden');
    assert.equal(fallback.overallLevel, 'warn');
    assert.match(fallback.items[0].headline, /§14a/);
    assert.match(fallback.items[0].detail, /4,2 kW/);

    const mixedValues = {
      'chargingManagement.audit.snapshotJson': audit([
        row('lp1', { name: 'LP lädt', connected: true, charging: true, actualPowerW: 4200, limiter: 'para14a', reason: 'LIMITED_BY_14A' }),
        row('lp2', { name: 'LP frei', connected: false }),
        row('lp3', { name: 'PV wartet', connected: true, mode: 'pv', limiter: 'pv-surplus', reason: 'NO_PV_SURPLUS' }),
      ]),
      'chargingManagement.wallboxes.lp1.cfgEnabled': true,
      'chargingManagement.wallboxes.lp2.cfgEnabled': true,
      'chargingManagement.wallboxes.lp3.cfgEnabled': true,
    };
    const mixed = await cdp.eval(`window.NexoWattLpStatusPresenter.build(${JSON.stringify(mixedValues)})`);
    assert.equal(mixed.items.length, 3);
    assert.match(mixed.items[0].headline, /Lädt begrenzt/);
    assert.match(mixed.items[1].headline, /Kein Fahrzeug/);
    assert.match(mixed.items[2].headline, /PV-Überschuss/);

    console.log('[rc69-dashboard-lp-feedback] OK: Safety-, §14a-Fallback-, Lade-, PV- und Inaktiv-Status werden kundenverständlich dargestellt.');
  } finally {
    if (cdp) cdp.close();
    try { browser.kill('SIGTERM'); } catch (_) {}
    await wait(300);
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 }); } catch (_) {}
  }
})().catch((error) => {
  console.error('[rc69-dashboard-lp-feedback] ERROR:', error && error.stack || error);
  process.exit(1);
});
