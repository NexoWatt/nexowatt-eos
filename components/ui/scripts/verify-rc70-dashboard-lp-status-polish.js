#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const DASHBOARD_JS = fs.readFileSync(path.join(ROOT, 'www/dashboard-lp-status.js'), 'utf8');
const DASHBOARD_SOURCE = fs.readFileSync(path.join(ROOT, 'src-ts/runtime-executables/www/dashboard-lp-status.ts'), 'utf8');
const CHROMIUM = [process.env.CHROMIUM_BIN, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']
  .find((candidate) => candidate && fs.existsSync(candidate));

for (const token of [
  "const detailsAvailable = evcsAvailable && model.items.length > 1",
  "const modeLabel = mode(row.userMode || row.mode)",
  "const effectiveModeToken = string(row.effectiveMode || row.mode)",
]) {
  assert(DASHBOARD_SOURCE.includes(token), `RC70-Vertrag fehlt: ${token}`);
}

if (!CHROMIUM) {
  console.log('[rc70-dashboard-lp-status-polish] OK (statisch); Browsertest übersprungen, Chromium nicht gefunden.');
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
      const message = JSON.parse(String(event.data || '{}'));
      if (!message.id || !this.pending.has(message.id)) return;
      const pending = this.pending.get(message.id);
      this.pending.delete(message.id);
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
    const response = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text || 'Browserfehler');
    }
    return response.result ? response.result.value : undefined;
  }
  close() { try { this.ws.close(); } catch (_) {} }
}

function audit(wallboxes) {
  return JSON.stringify({
    schemaVersion: 1,
    ts: Date.now(),
    mode: 'auto',
    status: 'running',
    activeLimiter: 'none',
    safetyStage: 'NORMAL',
    safetyStop: false,
    safetyReason: '',
    safety: { valid: true, emergencyStop: false, invalidReason: '' },
    wallboxes,
  });
}

function row(safe, overrides = {}) {
  return {
    safe,
    name: overrides.name || safe.toUpperCase(),
    // `mode` ist im Audit der wirksame Auto-Untermodus. Die Anzeige muss
    // trotzdem die explizite Kundenauswahl aus `userMode` zeigen.
    mode: overrides.effectiveMode || 'pv',
    effectiveMode: overrides.effectiveMode || 'pv',
    userMode: overrides.userMode || 'auto',
    online: true,
    enabled: true,
    controlAvailable: true,
    connected: overrides.connected === true,
    vehicleDemandConfirmed: false,
    charging: false,
    meterStale: false,
    faultActive: false,
    unavailableActive: false,
    actualPowerW: 0,
    targetPowerW: 0,
    limiter: 'none',
    safetyReason: '',
    reason: '',
    applyStatus: 'unchanged',
  };
}

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-rc70-lp-status-'));
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
    const tabs = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then((response) => response.json());
    cdp = new CdpClient(tabs[0].webSocketDebuggerUrl);
    await cdp.open();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.eval(`(() => {
      document.head.innerHTML = '';
      document.body.innerHTML = '<section class="card nw-panel nw-panel-status"><div class="nw-system-ok" id="sideStatusText">Alle Systeme normal</div><div class="nw-evcs-system-block" id="sideEvcsStatusBlock"><div class="nw-evcs-system-heading"><span><b>Ladepunkte</b></span><a href="evcs.html" id="sideEvcsStatusDetails">Details</a></div><div id="sideEvcsStatusSummary"></div><div id="sideEvcsStatusList"></div></div></section>';
      const style = document.createElement('style');
      style.textContent = '.hidden{display:none!important}';
      document.head.appendChild(style);
      window.__nwLocale = { htmlLang: 'de', localeTag: 'de-DE' };
      return true;
    })()`);
    await cdp.eval(`(0, eval)(${JSON.stringify(DASHBOARD_JS + '\n//# sourceURL=rc70-dashboard-lp-status.js')})`);
    await waitFor(() => cdp.eval('!!window.NexoWattLpStatusPresenter'), 8000, 'Presenter');

    const singleValues = {
      'chargingManagement.audit.snapshotJson': audit([
        row('lp1', { name: '0311107102121190684', userMode: 'auto', effectiveMode: 'pv', connected: false }),
      ]),
      'chargingManagement.wallboxes.lp1.cfgEnabled': true,
    };
    const single = await cdp.eval(`(() => {
      const values=${JSON.stringify(singleValues)};
      const model=window.NexoWattLpStatusPresenter.render((key)=>values[key], true);
      const details=document.getElementById('sideEvcsStatusDetails');
      const mode=document.querySelector('.nw-evcs-system-top small')?.textContent || '';
      return {
        model,
        mode,
        detailsHidden:details.classList.contains('hidden'),
        ariaDisabled:details.getAttribute('aria-disabled'),
        tabIndex:details.getAttribute('tabindex'),
      };
    })()`);
    assert.equal(single.model.total, 1);
    assert.equal(single.model.items[0].mode, 'Auto', 'Gewählter Auto-Modus muss angezeigt werden');
    assert.equal(single.mode, 'Auto', 'Dashboard darf den Auto-Untermodus PV nicht als Benutzermodus anzeigen');
    assert.equal(single.detailsHidden, true, 'Details-Link muss bei genau einem aktiven Ladepunkt verborgen sein');
    assert.equal(single.ariaDisabled, 'true');
    assert.equal(single.tabIndex, '-1');

    const multiValues = {
      'chargingManagement.audit.snapshotJson': audit([
        row('lp1', { name: 'LP 1', userMode: 'auto', effectiveMode: 'pv', connected: false }),
        row('lp2', { name: 'LP 2', userMode: 'boost', effectiveMode: 'boost', connected: false }),
      ]),
      'chargingManagement.wallboxes.lp1.cfgEnabled': true,
      'chargingManagement.wallboxes.lp2.cfgEnabled': true,
    };
    const multi = await cdp.eval(`(() => {
      const values=${JSON.stringify(multiValues)};
      const model=window.NexoWattLpStatusPresenter.render((key)=>values[key], true);
      const details=document.getElementById('sideEvcsStatusDetails');
      return {
        total:model.total,
        hidden:details.classList.contains('hidden'),
        ariaDisabled:details.getAttribute('aria-disabled'),
        tabIndex:details.getAttribute('tabindex'),
        href:details.getAttribute('href'),
      };
    })()`);
    assert.equal(multi.total, 2);
    assert.equal(multi.hidden, false, 'Details-Link muss ab zwei aktiven Ladepunkten sichtbar sein');
    assert.equal(multi.ariaDisabled, null);
    assert.equal(multi.tabIndex, null);
    assert.equal(multi.href, 'evcs.html');

    console.log('[rc70-dashboard-lp-status-polish] OK: Einzel-LP-Link und Anzeige von Benutzer-/Auto-Untermodus sind korrekt getrennt.');
  } finally {
    if (cdp) cdp.close();
    try { browser.kill('SIGTERM'); } catch (_) {}
    await wait(300);
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 }); } catch (_) {}
  }
})().catch((error) => {
  console.error('[rc70-dashboard-lp-status-polish] ERROR:', error && error.stack || error);
  process.exit(1);
});
