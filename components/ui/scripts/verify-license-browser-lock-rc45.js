#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const WWW = path.join(ROOT, 'www');
const CHROMIUM = [
  process.env.CHROMIUM_BIN,
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
].find((candidate) => candidate && fs.existsSync(candidate));
assert.ok(CHROMIUM, 'Chromium/Chrome für den Lizenz-Sperrtest wurde nicht gefunden.');

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function buildHtml(status) {
  let html = read('www/license.html');
  const css = read('www/styles.css');
  const auth = read('www/auth.js');
  const license = read('www/license.js');
  const mock = `
<script>
window.__nwLicenseInfoCalls = 0;
window.__nwLicenseSaveCalls = 0;
window.fetch = async function(input, init) {
  const url = String(typeof input === 'string' ? input : (input && input.url) || '');
  if (url.indexOf('/api/strict-auth/status') === 0 || url.indexOf('/api/auth/status') === 0) {
    return { ok: true, status: 200, json: async function(){ return ${JSON.stringify(status)}; } };
  }
  if (url.indexOf('/api/license/info') === 0) {
    window.__nwLicenseInfoCalls += 1;
    return { ok: true, status: 200, json: async function(){ return {
      ok: true,
      uuid: '11111111-2222-3333-4444-555555555555',
      licenseKey: 'TEST-LICENSE-ONLY-NOT-A-REAL-SECRET',
      valid: true,
      message: 'Testlizenz gültig'
    }; } };
  }
  if (url.indexOf('/api/license/save') === 0) {
    window.__nwLicenseSaveCalls += 1;
    return { ok: true, status: 200, json: async function(){ return { ok:true, valid:true, message:'gespeichert' }; } };
  }
  if (url.indexOf('/api/strict-auth/login') === 0 || url.indexOf('/api/strict-auth/logout') === 0) {
    return { ok: false, status: 401, json: async function(){ return { ok:false, error:'unauthorized' }; } };
  }
  return { ok: true, status: 200, json: async function(){ return { ok:true }; } };
};
</script>`;
  html = html.replace(/<link[^>]+href="\/static\/styles\.css"[^>]*>/i, `<style>${css}</style>`);
  html = html.replace(/<script[^>]+src="\/static\/auth\.js"[^>]*><\/script>/i, `${mock}<script>${auth}</script>`);
  html = html.replace(/<script[^>]+src="\/static\/license\.js"[^>]*><\/script>/i, `<script>${license}</script>`);
  html = html.replace(/\s*<script[^>]+src="\/static\/(?:cockpit-shell|nw-shell)\.js"[^>]*><\/script>/gi, '');
  return html;
}

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
    await new Promise((resolve) => setTimeout(resolve, 60));
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
        const row = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) row.reject(new Error(`${msg.error.code}: ${msg.error.message}`));
        else row.resolve(msg.result || {});
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
      const text = result.exceptionDetails.exception?.description || result.exceptionDetails.text;
      throw new Error(text || 'Browser-Auswertung fehlgeschlagen');
    }
    return result.result ? result.result.value : undefined;
  }
  close() { try { this.ws.close(); } catch (_) {} }
}

const STATUS = {
  anonymous: {
    ok: true, enabled: true, strict: true, authed: false, role: 'none',
    capabilities: [], isAdmin: false, isInstaller: false, isCustomer: false,
    protectWrites: true,
  },
  customer: {
    ok: true, enabled: true, strict: true, authed: true, user: 'kunde', role: 'customer',
    capabilities: ['frontend.open', 'smarthome.configureCustomer', 'nexologic.configureCustomer'],
    isAdmin: false, isInstaller: false, isCustomer: true, protectWrites: true,
  },
  installer: {
    ok: true, enabled: true, strict: true, authed: true, user: 'installer', role: 'installer',
    capabilities: ['frontend.open', 'appcenter.open', 'simulation.open', 'license.manage'],
    isAdmin: false, isInstaller: true, isCustomer: false, protectWrites: true,
  },
};

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-license-lock-'));
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
    const activePortFile = path.join(profile, 'DevToolsActivePort');
    await waitFor(() => fs.existsSync(activePortFile), 15000, 'Chromium DevToolsActivePort');
    const debugPort = Number(fs.readFileSync(activePortFile, 'utf8').split(/\r?\n/)[0]);
    const target = await waitFor(async () => {
      const rows = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
      return rows.find((row) => row.type === 'page') || null;
    }, 15000, 'Chromium Browser-Target');

    cdp = new CdpClient(target.webSocketDebuggerUrl);
    await cdp.open();
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');
    await cdp.send('Log.enable');
    const tree = await cdp.send('Page.getFrameTree');
    const frameId = tree.frameTree?.frame?.id;
    assert.ok(frameId, 'Chromium-Hauptrahmen fehlt.');

    async function runScenario(name, status, expectedAuthorized) {
      cdp.events.length = 0;
      await cdp.send('Page.setDocumentContent', { frameId, html: buildHtml(status) });
      const result = await waitFor(async () => {
        const value = await cdp.eval(`(() => ({
          ready: document.readyState,
          infoCalls: Number(window.__nwLicenseInfoCalls || 0),
          saveCalls: Number(window.__nwLicenseSaveCalls || 0),
          uuid: document.getElementById('nw-license-uuid')?.value || '',
          key: document.getElementById('nw-license-key')?.value || '',
          saveDisabled: !!document.getElementById('nw-license-save')?.disabled,
          copyDisabled: !!document.getElementById('nw-license-copy-uuid')?.disabled,
          overlayVisible: !!document.getElementById('nwAuthOverlay')?.classList.contains('show'),
          pending: document.documentElement.classList.contains('nw-auth-capability-pending'),
          granted: document.documentElement.classList.contains('nw-auth-capability-granted'),
          status: document.getElementById('nw-license-status')?.textContent || ''
        }))()`);
        if (!value || value.ready !== 'complete') return null;
        if (expectedAuthorized && value.infoCalls < 1) return null;
        if (!expectedAuthorized && !value.overlayVisible) return null;
        return value;
      }, 12000, `Lizenz-Szenario ${name}`);

      if (expectedAuthorized) {
        assert.equal(result.infoCalls, 1, `${name}: Lizenzinfo wurde unerwartet oft geladen: ${JSON.stringify(result)}`);
        assert.equal(result.uuid, '11111111-2222-3333-4444-555555555555', `${name}: UUID wurde nicht nach Rollenprüfung geladen.`);
        assert.equal(result.key, 'TEST-LICENSE-ONLY-NOT-A-REAL-SECRET', `${name}: Lizenzschlüssel wurde nicht nach Rollenprüfung geladen.`);
        assert.equal(result.saveDisabled, false, `${name}: Speichern bleibt trotz Berechtigung gesperrt.`);
        assert.equal(result.pending, false, `${name}: Capability-Pending wurde nicht aufgehoben.`);
        assert.equal(result.granted, true, `${name}: Capability wurde im DOM nicht freigegeben.`);
      } else {
        assert.equal(result.infoCalls, 0, `${name}: Lizenzdaten wurden ohne Capability angefordert.`);
        assert.equal(result.uuid, '', `${name}: UUID ist ohne Capability sichtbar.`);
        assert.equal(result.key, '', `${name}: Lizenzschlüssel ist ohne Capability sichtbar.`);
        assert.equal(result.saveDisabled, true, `${name}: Speichern ist ohne Capability aktiv.`);
        assert.equal(result.copyDisabled, true, `${name}: UUID-Kopieren ist ohne Capability aktiv.`);
        assert.equal(result.overlayVisible, true, `${name}: Pflicht-Login ist nicht sichtbar.`);
      }
      const exceptions = cdp.events.filter((row) => row.method === 'Runtime.exceptionThrown');
      assert.equal(exceptions.length, 0, `${name}: Browser-Ausnahme: ${JSON.stringify(exceptions)}`);
    }

    await runScenario('nicht angemeldet', STATUS.anonymous, false);
    await runScenario('Kundenrolle', STATUS.customer, false);
    await runScenario('Installerrolle', STATUS.installer, true);

    console.log('[license-browser-lock-rc45] OK: Anonym/Kunde laden keine Lizenzdaten; erst Installer/Admin-Capability macht UUID und Schlüssel sichtbar.');
  } catch (error) {
    const tail = browserLog.join('').split(/\r?\n/).slice(-35).join('\n');
    if (tail) console.error('[license-browser-lock-rc45] Chromium-Log:\n' + tail);
    throw error;
  } finally {
    if (cdp) cdp.close();
    try { browser.kill('SIGKILL'); } catch (_) {}
    await new Promise((resolve) => {
      if (browser.exitCode !== null || browser.signalCode) return resolve();
      const timer = setTimeout(resolve, 800);
      browser.once('exit', () => { clearTimeout(timer); resolve(); });
    });
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try { fs.rmSync(profile, { recursive: true, force: true }); break; }
      catch (error) {
        if (attempt === 4) console.warn('[license-browser-lock-rc45] Temp-Profil konnte nicht vollständig entfernt werden:', error.message);
        else await new Promise((resolve) => setTimeout(resolve, 120));
      }
    }
  }
})().catch((error) => {
  console.error('[license-browser-lock-rc45] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
