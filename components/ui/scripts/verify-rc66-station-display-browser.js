#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const CHROMIUM = [process.env.CHROMIUM_BIN, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']
  .find((candidate) => candidate && fs.existsSync(candidate));

if (!CHROMIUM) {
  console.log('[rc66-station-display-browser] SKIP: Chromium/Chrome nicht gefunden; statische RC66-Prüfung bleibt aktiv.');
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
    await wait(80);
  }
  throw new Error(`Timeout bei ${label}: ${last && last.message ? last.message : JSON.stringify(last)}`);
}

class CdpClient {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
  }
  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(String(event.data || '{}'));
      if (msg.id && this.pending.has(msg.id)) {
        const pending = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) pending.reject(new Error(`${msg.error.code}: ${msg.error.message}`));
        else pending.resolve(msg.result || {});
      } else if (msg.method) {
        this.events.push(msg);
      }
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
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Browser-Auswertung fehlgeschlagen');
    }
    return result.result ? result.result.value : undefined;
  }
  close() {
    try { this.ws.close(); } catch (_) {}
  }
}

function connector(index, powerW, status, plugged, charging, mode = 'auto') {
  return {
    id: `lp${index}`,
    index,
    connectorNo: index,
    name: `AC · Connector ${index}`,
    chargerType: 'AC',
    isAc: true,
    status,
    statusDetail: charging
      ? 'Laden freigegeben · safety-approved'
      : (plugged ? 'Fahrzeug verbunden · wartet auf Freigabe' : 'Bereit'),
    rawStatus: status,
    effectiveStatus: status,
    statusClass: status,
    online: true,
    meterStale: false,
    plugged,
    charging,
    faultActive: false,
    unavailableActive: false,
    powerW,
    targetW: charging ? Math.max(powerW, 4200) : 0,
    mode,
    userMode: mode,
    userEnabled: true,
    vehicleSocPct: index === 2 ? null : 68 + index * 4,
    solarSharePercent: powerW ? 54 : 0,
    sessionEnergyKwh: charging ? 4.25 * index : 0,
    sessionSolarKwh: charging ? 2.125 * index : 0,
    sessionGridKwh: charging ? 2.125 * index : 0,
    sessionCostEur: charging ? 0.57 * index : 0,
    priceEurPerKwh: 0.29,
    allowedModes: ['solar', 'fast'],
    allowStartStop: true,
    reason: charging
      ? 'Auto · Tarif neutral · PV-Anteil verfügbar'
      : (plugged ? 'Zielzeit noch ausreichend' : 'Kein Fahrzeug verbunden'),
    controls: {
      userEnabled: true,
      userMode: mode,
      userAutoSource: 'standard',
      effectiveMode: mode,
      phaseSwitchSupported: true,
      userPhaseMode: 'auto-pv',
      storageAssistCustomerAllowed: true,
      storageAssistControlScope: 'global',
      userStorageAssistEnabled: false,
      goalEnabled: index !== 2,
      goalTargetSocPct: 100,
      goalFinishTs: Date.now() + 8 * 3600e3,
      goalStatus: index !== 2 ? 'active' : 'inactive',
      goalTariffOverride: false,
      availabilityOwner: 'charging-management',
      availabilityRequested: true,
      strategyActive: false,
    },
    diagnostics: {
      mappingIssues: [],
      mappingOk: true,
      applyStatus: 'unchanged',
      hardwareCommandConfirmed: true,
      hardwareCommandState: 'confirmed',
      vehicleStateNormalized: plugged ? (charging ? 'charging' : 'connected_startable') : 'disconnected',
    },
    lastSession: index === 2 ? { energyKwh: 8.2, costEur: 2.1, endTs: Date.now() - 3600e3 } : null,
  };
}

function fixture(count = 4, warningMode = false) {
  const all = [
    connector(1, 7200, 'charging', true, true),
    connector(2, 0, warningMode ? 'offline' : 'available', false, false),
    connector(3, 14600, 'charging', true, true),
    connector(4, 6600, 'charging', true, true),
    connector(5, 0, 'plugged', true, false),
    connector(6, 0, 'available', false, false),
    connector(7, 4200, 'charging', true, true),
    connector(8, 0, 'available', false, false),
  ];
  if (warningMode) {
    all[1].online = false;
    all[1].statusDetail = 'OCPP-Verbindung unterbrochen';
  }
  return {
    ok: true,
    generatedAt: Date.now(),
    station: {
      id: 'station-preview',
      name: '0311107102121190684',
      type: 'dc',
      globalStorageAssistControl: true,
      theme: 'dark',
      showPrice: true,
      showSolarShare: true,
      allowStartStop: true,
      allowedModes: ['solar', 'fast'],
      maintenanceMode: false,
      layoutMode: count <= 4 ? 'quad' : 'compact',
      showLanguageSwitch: false,
      displayRefreshSec: 30,
      controlBridge: 'charging-management',
      protocolHint: 'manufacturer-open',
      displayOnline: true,
      displayStatus: 'online',
      displayWarning: '',
      lastHeartbeat: Date.now(),
      lastTouch: Date.now(),
      lastSeenAgeSec: 1,
      watchdogTimeoutSec: 45,
    },
    locale: { language: 'de', htmlLang: 'de' },
    site: {
      pvAvailable: true,
      pvSurplusW: 920,
      totalAssignedPowerW: 28400,
      stationMaxPowerW: 120000,
      connectorCount: count,
      layoutMode: count <= 4 ? 'quad' : 'compact',
      tariff: { active: true, state: 'neutral', fresh: true, priceEurPerKwh: 0.29, statusText: 'Tarif neutral', netFeeMode: 'STANDARD' },
      control: {
        active: true,
        mode: 'auto',
        status: 'Regelung ohne Begrenzung',
        gridCapBinding: false,
        phaseCapBinding: false,
        para14aActive: false,
        para14aBinding: false,
        storageAssistActive: false,
        storageProtectedLoadW: 0,
        staleMeter: false,
        staleBudget: false,
        failsafeDetails: '',
      },
    },
    display: {
      apiVersion: '0.8.191',
      manufacturerOpen: true,
      controlBridge: 'charging-management',
      controlProfile: 'chargingManagement',
      protocolHint: 'manufacturer-neutral',
      refreshIntervalMs: 30000,
      heartbeatIntervalMs: 10000,
      watchdogTimeoutSec: 45,
      showLanguageSwitch: false,
      globalStorageAssistControl: true,
      connectionState: 'online',
    },
    operator: {
      energyTodayKwh: 28.7,
      solarEnergyTodayKwh: 15.5,
      gridEnergyTodayKwh: 13.2,
      solarShareTodayPercent: 54,
      currentRevenueEur: 5.43,
      revenueEur: 5.43,
    },
    connectors: all.slice(0, count),
  };
}

function page(payload) {
  const css = fs.readFileSync(path.join(ROOT, 'www/dc-station-display.css'), 'utf8');
  let runtime = fs.readFileSync(path.join(ROOT, 'www/dc-station-display.js'), 'utf8');
  const logoData = `data:image/png;base64,${fs.readFileSync(path.join(ROOT, 'www/assets/nexowatt-eos-logo-wide.png')).toString('base64')}`;
  runtime = runtime.replaceAll('/static/assets/nexowatt-eos-logo-wide.png', logoData);
  runtime = runtime.replace(/function getToken\(\) \{[^}]+\}/, "function getToken(){return 'preview';}");
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><main class="nw-display-shell" id="stationDisplayApp"></main><script>window.__MOCK=${JSON.stringify(payload)};window.__COMMANDS=[];window.fetch=async function(url,opts){if(String(url).includes('/command')){try{window.__COMMANDS.push(JSON.parse(String(opts&&opts.body||'{}')))}catch(_){}return new Response(JSON.stringify({ok:true,payload:window.__MOCK}),{status:200,headers:{'Content-Type':'application/json'}})}return new Response(JSON.stringify(window.__MOCK),{status:200,headers:{'Content-Type':'application/json'}})};<\/script><script>${runtime}<\/script></body></html>`;
}

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-rc66-station-'));
  const logs = [];
  const browser = spawn(CHROMIUM, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--disable-background-networking', '--disable-component-update', '--disable-default-apps',
    '--disable-extensions', '--no-first-run', '--remote-debugging-port=0',
    `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  browser.stdout.on('data', (chunk) => logs.push(String(chunk)));
  browser.stderr.on('data', (chunk) => logs.push(String(chunk)));
  let cdp;
  try {
    const portFile = path.join(profile, 'DevToolsActivePort');
    await waitFor(() => fs.existsSync(portFile), 15000, 'DevToolsActivePort');
    const port = Number(fs.readFileSync(portFile, 'utf8').split(/\r?\n/)[0]);
    const target = await waitFor(async () => {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      return list.find((row) => row.type === 'page');
    }, 15000, 'Browser-Target');
    cdp = new CdpClient(target.webSocketDebuggerUrl);
    await cdp.open();
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');

    const scenarios = [
      { width: 1920, height: 1080, count: 4, columns: 4, label: '4 LP 1920×1080' },
      { width: 1600, height: 900, count: 4, columns: 4, label: '4 LP 1600×900' },
      { width: 1366, height: 768, count: 4, columns: 4, label: '4 LP 1366×768' },
      { width: 1920, height: 1080, count: 5, columns: 3, label: '5 LP 1920×1080' },
      { width: 1920, height: 1080, count: 6, columns: 3, label: '6 LP 1920×1080' },
      { width: 1920, height: 1080, count: 8, columns: 4, label: '8 LP 1920×1080' },
    ];

    for (const scenario of scenarios) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: scenario.width,
        height: scenario.height,
        deviceScaleFactor: 1,
        mobile: false,
      });
      const tree = await cdp.send('Page.getFrameTree');
      await cdp.send('Page.setDocumentContent', {
        frameId: tree.frameTree.frame.id,
        html: page(fixture(scenario.count, scenario.count === 5)),
      });
      const metrics = await waitFor(async () => cdp.eval(`(() => {
        const grid = document.querySelector('.nw-connector-grid');
        const shell = document.querySelector('.nw-display-shell');
        const cards = [...document.querySelectorAll('.nw-connector-card')];
        if (!grid || cards.length !== ${scenario.count}) return null;
        const logo = document.querySelector('.nw-display-logo');
        const footer = document.querySelector('.nw-display-footer');
        const warningItems = [...document.querySelectorAll('.nw-warning-panel li')];
        return {
          innerWidth,
          innerHeight,
          docWidth: document.documentElement.scrollWidth,
          docHeight: document.documentElement.scrollHeight,
          shellClientHeight: shell.clientHeight,
          shellScrollHeight: shell.scrollHeight,
          footerBottom: footer ? Math.round(footer.getBoundingClientRect().bottom) : 0,
          columns: getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length,
          rows: getComputedStyle(grid).gridTemplateRows.split(' ').filter(Boolean).length,
          cards: cards.map((card) => {
            const rect = card.getBoundingClientRect();
            return { left: Math.round(rect.left), right: Math.round(rect.right), top: Math.round(rect.top), bottom: Math.round(rect.bottom), width: Math.round(rect.width), height: Math.round(rect.height) };
          }),
          logo: logo ? { complete: logo.complete, width: logo.naturalWidth, height: logo.naturalHeight } : null,
          csvVisible: /CSV Export|CSV-Export/i.test(document.body.innerText),
          hasStatusStrip: !!document.querySelector('.nw-status-strip'),
          hasSummary: !!document.querySelector('.nw-summary-grid'),
          hasDecision: !!document.querySelector('.nw-decision-panel'),
          hasWarnings: !!document.querySelector('.nw-warning-panel'),
          warningItems: warningItems.length,
        };
      })()`), 20000, scenario.label);

      assert.equal(metrics.docWidth <= metrics.innerWidth + 2, true, `${scenario.label}: horizontaler Seitenoverflow`);
      assert.equal(metrics.docHeight <= metrics.innerHeight + 2, true, `${scenario.label}: vertikaler Seitenoverflow`);
      assert.equal(metrics.shellScrollHeight <= metrics.shellClientHeight + 2, true, `${scenario.label}: Shell-Overflow`);
      assert.equal(metrics.footerBottom <= metrics.innerHeight + 2, true, `${scenario.label}: Footer außerhalb des Viewports`);
      assert.equal(metrics.columns, scenario.columns, `${scenario.label}: falsche Spaltenzahl`);
      assert.equal(metrics.cards.length, scenario.count, `${scenario.label}: falsche LP-Anzahl`);
      assert.ok(metrics.cards.every((card) => card.left >= 0 && card.right <= metrics.innerWidth + 2 && card.top >= 0 && card.bottom <= metrics.innerHeight + 2 && card.width >= 190 && card.height >= 120), `${scenario.label}: LP-Karte außerhalb des Viewports`);
      assert.ok(metrics.logo && metrics.logo.complete && metrics.logo.width >= 600 && metrics.logo.height >= 250, `${scenario.label}: Logo nicht geladen`);
      assert.equal(metrics.csvVisible, false, `${scenario.label}: CSV-Schaltfläche sichtbar`);
      assert.ok(metrics.hasStatusStrip && metrics.hasSummary && metrics.hasDecision && metrics.hasWarnings, `${scenario.label}: Status-/Entscheidungsbereiche fehlen`);
      if (scenario.count === 5) assert.ok(metrics.warningItems >= 1, 'Warn-/Fehlerbereich zeigt den simulierten Offline-Ladepunkt nicht an.');
    }

    // Bedienung bleibt am bestehenden herstellerneutralen Command-Intent.
    await cdp.eval(`document.querySelector('[data-action="set-mode"][data-mode="boost"]').click()`);
    const command = await waitFor(async () => cdp.eval(`window.__COMMANDS && window.__COMMANDS[0] || null`), 5000, 'Stationsseiten-Bedienintent');
    assert.equal(command.action, 'set-mode');
    assert.equal(command.mode, 'boost');
    assert.match(String(command.lp || ''), /^lp\d+$/);

    const exceptions = cdp.events.filter((event) => event.method === 'Runtime.exceptionThrown');
    assert.equal(exceptions.length, 0, `Browser-Ausnahmen: ${JSON.stringify(exceptions)}`);
    console.log('[rc66-station-display-browser] OK: 4/5/6/8 LP, 1920×1080/1600×900/1366×768, kein Scrollen, Logo, Diagnose und Single-Writer-Bedienintent in Chromium verifiziert.');
  } catch (error) {
    const tail = logs.join('').split(/\r?\n/).slice(-30).join('\n');
    if (tail) console.error(tail);
    throw error;
  } finally {
    if (cdp) cdp.close();
    try { browser.kill('SIGKILL'); } catch (_) {}
    await wait(250);
    fs.rmSync(profile, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
