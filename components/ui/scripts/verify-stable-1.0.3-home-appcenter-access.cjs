#!/usr/bin/env node
'use strict';

/**
 * Stable 1.0.3 regression contract
 *
 * Reproduces the Home-license AppCenter relock reported in the field:
 * an authenticated admin opens the protected AppCenter, a stale Pro app flag
 * would normally request a Pro-only API, and the API answers with a legitimate
 * business/license 403 (`eos_required`). That response must never be confused
 * with a lost login session. A genuine 401 plus an unauthenticated status must
 * still lock the page fail-closed.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const CHROMIUM = [
  process.env.CHROMIUM_BIN,
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
].find((candidate) => candidate && fs.existsSync(candidate));
assert.ok(CHROMIUM, 'Chromium/Chrome für den Home-AppCenter-Regressionsstest wurde nicht gefunden.');

const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
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
    this.events = [];
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data || '{}'));
      if (message.id && this.pending.has(message.id)) {
        const pending = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(`${message.error.code}: ${message.error.message}`));
        else pending.resolve(message.result || {});
      } else if (message.method) {
        this.events.push(message);
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

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    });
    if (result.exceptionDetails) {
      const description = result.exceptionDetails.exception?.description || result.exceptionDetails.text;
      throw new Error(description || 'Browser-Auswertung fehlgeschlagen');
    }
    return result.result ? result.result.value : undefined;
  }

  close() {
    try { this.ws.close(); } catch (_) {}
  }
}

function inlineStaticScripts(html) {
  return html.replace(/<script([^>]*)\ssrc="\/static\/([^"]+)"([^>]*)><\/script>/gi, (full, before, source, after) => {
    const absolute = path.join(ROOT, 'www', source);
    if (!fs.existsSync(absolute)) return '';
    const code = fs.readFileSync(absolute, 'utf8').replace(/<\/script/gi, '<\\/script');
    return `<script${before}${after}>\n${code}\n</script>`;
  });
}

function buildHomeAppCenterHtml() {
  let html = read('www/ems-apps.html');
  const css = read('www/styles.css').replace(/<\/style/gi, '<\\/style');

  const homeLicense = {
    valid: true,
    ok: true,
    type: 'full',
    edition: 'hems',
    editionLabel: 'Home',
    maxWallboxes: 3,
    maxStoragePowerW: 50_000,
    storagePowerProfile: { id: 'home', label: 'Home', maxCommandW: 50_000, unrestricted: false },
    features: {
      dashboard: true,
      history: true,
      chargingManagement: true,
      storageControl: true,
      thermalControl: true,
      heatingRodControl: true,
      thresholdControl: true,
      relayControl: true,
      gridConstraints: true,
      aiAdvisor: true,
      dynamicTariffs: true,
      para14a: true,
      energyWallet: true,
      energyLedger: true,
    },
    homeIncludedApps: ['charging', 'storage', 'thermal', 'heatingrod', 'threshold', 'relay', 'grid', 'aiAdvisor', 'tariff', 'para14a', 'energyWallet', 'energyLedger'],
  };

  // Intentionally retain stale Pro flags. Stable 1.0.3 must mask them before
  // rendering and must not request a Pro-only endpoint under a Home license.
  const config = {
    license: homeLicense,
    emsApps: {
      apps: {
        grid: { installed: true, enabled: true },
        charging: { installed: true, enabled: true },
        storage: { installed: true, enabled: true },
        netOperator: { installed: true, enabled: true },
        meshMicrogrid: { installed: true, enabled: true },
        operatingStrategies: { installed: true, enabled: true },
      },
    },
    settingsConfig: { evcsCount: 0, evcsList: [], stationGroups: [] },
    installerConfig: { gridConnectionPower: 30 },
    datapoints: {},
    storage: {},
    storageFarm: { storages: [] },
    countryProfile: { country: 'DE' },
    gridConstraints: {},
    chargingManagement: {},
    netOperatorInterface: { enabled: true, mode: 'active' },
    operatingStrategies: { enabled: true, mode: 'active' },
    meshMicrogrid: { enabled: true, nodes: [] },
  };

  const mock = `<script>
window.__nwRequests = [];
window.__nwErrors = [];
window.__nwAuthStatus = {
  ok: true, enabled: true, strict: true, authed: true,
  user: 'admin', role: 'admin', roles: ['admin'],
  groups: ['system.group.administrator'], capabilities: ['*'],
  isAdmin: true, isInstaller: true, isCustomer: false, protectWrites: true
};
window.__nwHomeLicense = ${JSON.stringify(homeLicense)};
window.__nwConfig = ${JSON.stringify(config)};
window.fetch = async function(input, init) {
  const raw = String(typeof input === 'string' ? input : (input && input.url) || '');
  const url = raw.replace(/^https?:\\/\\/[^/]+/, '');
  window.__nwRequests.push(url);
  let status = 200;
  let data = { ok: true };
  if (url.indexOf('/api/strict-auth/status') === 0 || url.indexOf('/api/auth/status') === 0 || url.indexOf('/api/session/me') === 0) {
    data = window.__nwAuthStatus;
  } else if (url.indexOf('/api/installer/config') === 0) {
    data = { ok: true, license: window.__nwHomeLicense, config: window.__nwConfig };
  } else if (url.indexOf('/api/license/features') === 0) {
    data = Object.assign({ ok: true }, window.__nwHomeLicense);
  } else if (url.indexOf('/api/netoperator/drivers') === 0) {
    status = 403;
    data = { ok: false, error: 'eos_required', message: 'EOS Pro erforderlich.' };
  } else if (url.indexOf('/api/pro-only-fixture') === 0) {
    status = 403;
    data = { ok: false, error: 'eos_required', message: 'Fachliche Lizenzgrenze.' };
  } else if (url.indexOf('/api/protected-fixture') === 0) {
    status = 401;
    data = { ok: false, error: 'unauthorized' };
  } else if (url.indexOf('/api/installer/backup/userdata') === 0) {
    data = { ok: true, available: false };
  } else if (url.indexOf('/api/installer/tariff-provider/providers') === 0) {
    data = { ok: true, providers: [] };
  } else if (url.indexOf('/api/ems/status') === 0) {
    data = { ok: true, status: {} };
  } else if (url.indexOf('/api/ems/charging/diagnostics') === 0) {
    data = { ok: true, wallboxes: [], stations: [], summary: {} };
  } else if (url.indexOf('/api/ems/charging/audit') === 0) {
    data = { ok: true, summary: {}, wallboxes: [], events: [] };
  } else if (url.indexOf('/api/state') === 0) {
    data = { ok: true, states: {} };
  } else if (url.indexOf('/config') === 0) {
    data = { license: window.__nwHomeLicense, featureVisibility: {} };
  }
  return new Response(JSON.stringify(data), { status: status, headers: { 'Content-Type': 'application/json' } });
};
window.addEventListener('error', function(event) {
  window.__nwErrors.push(String(event.message || event.error || 'window error'));
});
window.addEventListener('unhandledrejection', function(event) {
  window.__nwErrors.push('unhandledrejection: ' + String(event.reason && event.reason.message || event.reason));
});
</script>`;

  html = html.replace(/<link[^>]+href="\/static\/styles\.css"[^>]*>/i, `<style>${css}</style>`);
  html = html.replace(/<link[^>]+(?:rel="manifest"|href="\/assets\/)[^>]*>/gi, '');
  html = html.replace(/<script[^>]+src="\/static\/admin-guard\.js"[^>]*><\/script>/i, '');
  html = html.replace('<script src="/static/auth.js"></script>', `${mock}<script src="/static/auth.js"></script>`);
  html = inlineStaticScripts(html);
  return html;
}

function staticContracts() {
  const pkg = JSON.parse(read('package.json'));
  const auth = read('src-ts/runtime-executables/www/auth.ts');
  const appCenter = read('src-ts/runtime-executables/www/ems-apps.ts');
  const netOperator = read('src-ts/runtime-executables/www/netoperator-appcenter.ts');
  const main = read('src-ts/runtime-executables/main.ts');

  // This regression is a retained baseline, not a restriction to one release.
  const version = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:\+[0-9A-Za-z.-]+)?$/.exec(pkg.version);
  assert(version, 'Home-AppCenter regression requires a valid stable SemVer');
  const [major, minor, patch] = version.slice(1, 4).map(Number);
  assert(major > 1 || (major === 1 && (minor > 0 || (minor === 0 && patch >= 3))),
    'Home-AppCenter baseline must be retained on Stable 1.0.3 and later');
  assert.equal(JSON.parse(read('io-package.json')).common.version, pkg.version,
    'Adapter manifests must agree for the retained Home regression');
  assert.match(auth, /const mustPromptForAuthentication = authStatusUnavailable \|\| sessionMissing \|\| pageCapabilityMissing/);
  assert.match(auth, /Ein fachlicher API-Fehler bleibt/);
  assert.match(appCenter, /_isAppLicensed\('netOperator'\) && \(\(\) =>/);
  assert.match(appCenter, /_isAppLicensed\('operatingStrategies'\) && \(\(\) =>/);
  assert.match(appCenter, /if \(_isAppLicensed\('netOperator'\) && window\.NexoWattNetOperatorAppCenter\)/);
  assert.match(appCenter, /if \(_isAppLicensed\('operatingStrategies'\) && window\.NexoWattOperatingStrategiesAppCenter\)/);
  assert.match(main, /cfgOut\.emsApps = this\._nwApplyLicenseLimitsToEmsApps\(cfgOut\.emsApps\)/);

  const editionCheck = netOperator.indexOf("const eos = String(getEdition() || '').toLowerCase() === 'eos';");
  const homeReturn = netOperator.indexOf('if (!eos) {', editionCheck);
  const driverLoad = netOperator.indexOf('if (!driverRows.length) await loadDrivers();', editionCheck);
  assert(editionCheck >= 0 && homeReturn > editionCheck && driverLoad > homeReturn,
    'Netzbetreiber-AppCenter must return for Home before loading Pro-only drivers.');
}

async function runBrowserRegression() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-home-appcenter-'));
  const browserLog = [];
  const browser = spawn(CHROMIUM, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--disable-background-networking', '--disable-component-update', '--disable-default-apps',
    '--disable-extensions', '--no-first-run', '--remote-debugging-port=0',
    `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  browser.stdout.on('data', (chunk) => browserLog.push(String(chunk)));
  browser.stderr.on('data', (chunk) => browserLog.push(String(chunk)));

  let cdp;
  try {
    const portFile = path.join(profile, 'DevToolsActivePort');
    await waitFor(() => fs.existsSync(portFile), 15_000, 'DevToolsActivePort');
    const port = Number(fs.readFileSync(portFile, 'utf8').split(/\r?\n/)[0]);
    const target = await waitFor(async () => {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const list = await response.json();
      return list.find((entry) => entry.type === 'page');
    }, 15_000, 'Browser-Target');

    cdp = new CdpClient(target.webSocketDebuggerUrl);
    await cdp.open();
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');
    const tree = await cdp.send('Page.getFrameTree');
    await cdp.send('Page.setDocumentContent', {
      frameId: tree.frameTree.frame.id,
      html: buildHomeAppCenterHtml(),
    });

    const initial = await waitFor(async () => cdp.evaluate(`(() => {
      const auth = window.NW_AUTH && window.NW_AUTH.getState && window.NW_AUTH.getState();
      const status = document.getElementById('nw-emsapps-status');
      if (!auth || !auth._loaded || !status || !/Konfiguration geladen/i.test(status.textContent || '')) return null;
      return {
        auth: auth,
        overlay: !!document.querySelector('#nwAuthOverlay.show'),
        locked: document.body.classList.contains('nw-auth-page-locked'),
        pending: document.documentElement.classList.contains('nw-auth-capability-pending'),
        appCenterPresent: !!document.getElementById('appsList'),
        homeVisible: /Lizenz:\\s*Home/i.test(document.body.innerText || ''),
        requests: (window.__nwRequests || []).slice(),
        errors: (window.__nwErrors || []).slice(),
      };
    })()`), 20_000, 'Home-AppCenter vollständig geladen');

    assert.equal(initial.auth.authed, true, 'Home admin session must remain authenticated');
    assert.equal(initial.auth.role, 'admin');
    assert.deepEqual(initial.auth.capabilities, ['*']);
    assert.equal(initial.overlay, false, 'Login overlay must stay closed after successful Home admin login');
    assert.equal(initial.locked, false, 'AppCenter background must not be relocked');
    assert.equal(initial.pending, false, 'Capability-pending class must be cleared');
    assert.equal(initial.appCenterPresent, true, 'AppCenter DOM must remain available');
    assert.equal(initial.homeVisible, true, 'Home license must be rendered in the AppCenter');
    assert.equal(initial.requests.some((url) => String(url).startsWith('/api/netoperator/drivers')), false,
      'Home AppCenter must not call the Pro-only netoperator driver API even with stale Pro flags');
    assert.deepEqual(initial.errors, [], `Browser errors during Home AppCenter startup: ${JSON.stringify(initial.errors)}`);

    // Business/license 403: session is still valid, so the protected page must stay open.
    const business403 = await cdp.evaluate(`(async () => {
      const response = await fetch('/api/pro-only-fixture');
      await new Promise((resolve) => setTimeout(resolve, 250));
      return {
        status: response.status,
        auth: window.NW_AUTH.getState(),
        overlay: !!document.querySelector('#nwAuthOverlay.show'),
        locked: document.body.classList.contains('nw-auth-page-locked'),
        appCenterPresent: !!document.getElementById('appsList'),
      };
    })()`);
    assert.equal(business403.status, 403);
    assert.equal(business403.auth.authed, true);
    assert.equal(business403.overlay, false, 'A legitimate license 403 must not reopen the login dialog');
    assert.equal(business403.locked, false, 'A legitimate license 403 must not lock the AppCenter');
    assert.equal(business403.appCenterPresent, true, 'A legitimate license 403 must not replace the AppCenter');

    // Genuine login loss: status endpoint now confirms no session and a protected
    // endpoint answers 401. The same fail-closed page must then lock immediately.
    const genuineLoss = await cdp.evaluate(`(async () => {
      window.__nwAuthStatus = {
        ok: true, enabled: true, strict: true, authed: false,
        user: null, role: 'none', capabilities: [],
        isAdmin: false, isInstaller: false, isCustomer: false, protectWrites: true
      };
      const response = await fetch('/api/protected-fixture');
      await new Promise((resolve) => setTimeout(resolve, 250));
      return {
        status: response.status,
        auth: window.NW_AUTH.getState(),
        overlay: !!document.querySelector('#nwAuthOverlay.show'),
        locked: document.body.classList.contains('nw-auth-page-locked'),
        lockText: String(document.body.innerText || '').slice(0, 800),
      };
    })()`);
    assert.equal(genuineLoss.status, 401);
    assert.equal(genuineLoss.auth.authed, false);
    assert.equal(genuineLoss.overlay, true, 'A genuine lost session must open the mandatory login dialog');
    assert.equal(genuineLoss.locked, true, 'A genuine lost session must lock the protected page');
    assert.match(genuineLoss.lockText, /Zugriff geschützt|Anmeldung erforderlich|Bitte anmelden/i);

    const exceptions = cdp.events.filter((event) => event.method === 'Runtime.exceptionThrown');
    assert.equal(exceptions.length, 0, `Browser exceptions: ${JSON.stringify(exceptions)}`);
  } catch (error) {
    const tail = browserLog.join('').split(/\r?\n/).slice(-30).join('\n');
    if (tail) console.error(tail);
    throw error;
  } finally {
    if (cdp) cdp.close();
    try { browser.kill('SIGKILL'); } catch (_) {}
    await wait(250);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) {}
  }
}

(async () => {
  staticContracts();
  await runBrowserRegression();
  console.log('[Stable 1.0.3] OK: Home admin remains in AppCenter; stale Pro flags trigger no Pro API call.');
  console.log('[Stable 1.0.3] OK: license/business 403 stays component-local; genuine session loss still locks fail-closed.');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
