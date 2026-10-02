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
assert.ok(CHROMIUM, 'Chromium/Chrome für den echten NexoLogic-Browsertest wurde nicht gefunden.');

const config = {
  version: 1,
  graphs: [{
    id: 'main',
    name: 'Verbindungstest',
    enabled: true,
    board: { w: 1400, h: 800 },
    nodes: [
      { id: 'src', type: 'not', label: 'Quelle', x: 120, y: 160, enabled: true, params: {} },
      { id: 'dst', type: 'not', label: 'Ziel', x: 560, y: 160, enabled: true, params: {} },
    ],
    links: [],
  }],
};

function inlineRuntimeHtml() {
  let html = fs.readFileSync(path.join(WWW, 'logic.html'), 'utf8');
  const css = fs.readFileSync(path.join(WWW, 'styles.css'), 'utf8');
  const logic = fs.readFileSync(path.join(WWW, 'logic.js'), 'utf8');
  const fetchMock = `
<script>
window.fetch = async function(url, options) {
  const path = String(url || '');
  if (path.includes('/api/logic/editor')) {
    return { ok: true, status: 200, json: async () => ({ ok: true, config: ${JSON.stringify(config)} }) };
  }
  if (path.includes('/api/logic/blocks')) {
    return { ok: true, status: 200, json: async () => ({ ok: true, blocks: [] }) };
  }
  if (path.includes('/api/auth/status')) {
    return { ok: true, status: 200, json: async () => ({ ok: true, enabled: false, protectWrites: false, authed: false, role: 'customer', capabilities: [], isCustomer: true }) };
  }
  if (path.includes('/config')) {
    return { ok: true, status: 200, json: async () => ({ locale: { language: 'de', htmlLang: 'de' }, featureVisibility: { hasSmartHome: true, hasStorageFarm: false, hasEnergyLedger: false }, settingsConfig: {} }) };
  }
  return { ok: true, status: 200, json: async () => ({ ok: true }) };
};
</script>`;
  html = html.replace(/<link[^>]+href="\/static\/styles\.css"[^>]*>/i, `<style>${css}</style>`);
  html = html.replace(/\s*<script[^>]+src="\/static\/(?:auth|nw-i18n|cockpit-shell|nw-shell)\.js"[^>]*><\/script>/gi, '');
  html = html.replace(/<script[^>]+src="\/static\/logic\.js"[^>]*><\/script>/i, `${fetchMock}<script>${logic}</script>`);
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
    await new Promise((resolve) => setTimeout(resolve, 75));
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
      const text = result.exceptionDetails.exception && result.exceptionDetails.exception.description
        ? result.exceptionDetails.exception.description
        : result.exceptionDetails.text;
      throw new Error(text || 'Browser-Auswertung fehlgeschlagen');
    }
    return result.result ? result.result.value : undefined;
  }
  close() {
    try { this.ws.close(); } catch (_) {}
  }
}

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-logic-browser-'));
  const browserLog = [];
  const browser = spawn(CHROMIUM, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-extensions',
    '--no-first-run',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  browser.stdout.on('data', (chunk) => browserLog.push(String(chunk)));
  browser.stderr.on('data', (chunk) => browserLog.push(String(chunk)));

  let cdp;
  try {
    const activePortFile = path.join(profile, 'DevToolsActivePort');
    await waitFor(() => fs.existsSync(activePortFile), 15000, 'Chromium DevToolsActivePort');
    const debugPort = Number(fs.readFileSync(activePortFile, 'utf8').split(/\r?\n/)[0]);
    assert.ok(Number.isInteger(debugPort) && debugPort > 0, 'Ungültiger Chromium-Debug-Port');

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
    const frameId = tree.frameTree && tree.frameTree.frame && tree.frameTree.frame.id;
    assert.ok(frameId, 'Chromium-Hauptrahmen fehlt.');
    await cdp.send('Page.setDocumentContent', { frameId, html: inlineRuntimeHtml() });

    const ready = await waitFor(async () => {
      const state = await cdp.eval(`(() => ({
        status: document.getElementById('nw-le-status')?.textContent || '',
        outCount: document.querySelectorAll('.nw-le-port--out').length,
        inCount: document.querySelectorAll('.nw-le-port--in').length,
        linkCount: (typeof nwLE !== 'undefined' && nwLE.graph && Array.isArray(nwLE.graph.links)) ? nwLE.graph.links.length : -1
      }))()`);
      return state && /Bereit/.test(state.status) && state.outCount >= 2 && state.inCount >= 2 && state.linkCount === 0 ? state : null;
    }, 20000, 'vollständig geladener NexoLogic-Editor');
    assert.equal(ready.linkCount, 0);

    const after = await cdp.eval(`(() => {
      const out = document.querySelector('.nw-le-port[data-node-id="src"][data-port-key="out"][data-port-dir="out"]');
      const input = document.querySelector('.nw-le-port[data-node-id="dst"][data-port-key="in"][data-port-dir="in"]');
      if (!out || !input) return { ok:false, reason:'ports-missing' };
      out.dispatchEvent(new MouseEvent('mousedown', { bubbles:true, cancelable:true, button:0, buttons:1, clientX:220, clientY:220 }));
      const connectingAfterStart = !!nwLE.connecting;
      input.dispatchEvent(new MouseEvent('click', { bubbles:true, cancelable:true, button:0, clientX:560, clientY:220 }));
      return {
        ok:true,
        connectingAfterStart,
        connectingAfterFinish: !!nwLE.connecting,
        links: nwLE.graph.links.map((link) => ({ from: link.from, to: link.to })),
        wireCount: document.querySelectorAll('#nw-le-wires .nw-le-wire:not(.nw-le-wire--preview)').length,
        wirePath: document.querySelector('#nw-le-wires .nw-le-wire:not(.nw-le-wire--preview)')?.getAttribute('d') || '',
        status: document.getElementById('nw-le-status')?.textContent || '',
      };
    })()`);

    assert.equal(after.ok, true);
    assert.equal(after.connectingAfterStart, true, 'Ausgangsklick startet keinen Verbindungsmodus.');
    assert.equal(after.connectingAfterFinish, false, 'Verbindungsmodus wurde nach Zielklick nicht beendet.');
    assert.equal(after.links.length, 1, 'Die echte Browserbedienung muss genau eine Verbindung erzeugen.');
    assert.deepEqual(after.links[0], {
      from: { node: 'src', port: 'out' },
      to: { node: 'dst', port: 'in' },
    });
    assert.equal(after.wireCount, 1, 'Die erzeugte Verbindung muss als SVG-Linie sichtbar sein.');
    assert.match(after.wirePath, /^M\s/);
    assert.match(after.status, /Verbindung erstellt/);

    const exceptions = cdp.events.filter((row) => row.method === 'Runtime.exceptionThrown');
    assert.equal(exceptions.length, 0, `Browser-Ausnahme im NexoLogic-Editor: ${JSON.stringify(exceptions)}`);

    console.log('[nexologic-editor-browser-rc44] OK: Ausgang anklicken, Eingang anklicken und sichtbare SVG-Verbindung funktionieren im echten Chromium-Browser.');
  } catch (error) {
    try {
      if (cdp) {
        const pageState = await cdp.eval(`(() => ({ readyState: document.readyState, title: document.title, status: document.getElementById('nw-le-status')?.textContent || '', nodes: document.querySelectorAll('.nw-le-node').length, ports: document.querySelectorAll('.nw-le-port').length }))()`);
        console.error('[nexologic-editor-browser-rc44] Seitenzustand:', JSON.stringify(pageState));
        console.error('[nexologic-editor-browser-rc44] CDP-Ereignisse:', JSON.stringify(cdp.events.filter((row) => ['Runtime.exceptionThrown','Runtime.consoleAPICalled','Log.entryAdded'].includes(row.method)).slice(-20)));
      }
    } catch (_debugError) {
      console.error('[nexologic-editor-browser-rc44] Debug-Auswertung fehlgeschlagen:', _debugError.message);
    }
    const tail = browserLog.join('').split(/\r?\n/).slice(-30).join('\n');
    if (tail) console.error('[nexologic-editor-browser-rc44] Chromium-Log:\n' + tail);
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
        if (attempt === 4) console.warn('[nexologic-editor-browser-rc44] Temp-Profil konnte nicht vollständig entfernt werden:', error.message);
        else await new Promise((resolve) => setTimeout(resolve, 120));
      }
    }
  }
})().catch((error) => {
  console.error('[nexologic-editor-browser-rc44] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
