#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const WWW = path.join(ROOT, 'www');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const css = read('www/styles.css');
const logicSource = read('src-ts/runtime-executables/www/logic.ts');
const logicHtml = read('www/logic.html');

assert.match(logicHtml, /<body class="[^"]*nw-page-logic/);
assert.match(css, /body\.nw-page-logic\{[\s\S]*?overflow-y:scroll !important;[\s\S]*?scrollbar-gutter:stable both-edges;/);
assert.match(css, /body\.nw-page-logic \.nw-le__board-wrap\{[\s\S]*?overflow:scroll !important;/);
assert.match(css, /body\.nw-page-logic \.nw-le__palette,[\s\S]*?body\.nw-page-logic \.nw-le__inspector\{[\s\S]*?overflow-y:scroll;/);
assert.match(css, /body\.nw-page-logic::\-webkit-scrollbar,[\s\S]*?height:15px;/);
assert.match(logicSource, /function nwSyncLogicViewportMetrics\(\)/);
assert.match(logicSource, /--nw-logic-topbar-h/);
assert.match(logicSource, /nwInstallLogicViewportSizing\(\);/);

const CHROMIUM = [
  process.env.CHROMIUM_BIN,
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
].find((candidate) => candidate && fs.existsSync(candidate));
assert.ok(CHROMIUM, 'Chromium/Chrome für den NexoLogic-Scrollbar-Test wurde nicht gefunden.');

const config = {
  version: 1,
  graphs: [{
    id: 'main',
    name: 'Scrollbar-Test',
    enabled: true,
    board: { w: 2600, h: 1700 },
    nodes: [
      { id: 'src', type: 'not', label: 'Quelle', x: 120, y: 160, enabled: true, params: {} },
      { id: 'dst', type: 'not', label: 'Ziel', x: 2100, y: 1300, enabled: true, params: {} },
    ],
    links: [{ from: { node: 'src', port: 'out' }, to: { node: 'dst', port: 'in' } }],
  }],
};

function inlineRuntimeHtml() {
  let html = fs.readFileSync(path.join(WWW, 'logic.html'), 'utf8');
  const runtimeCss = fs.readFileSync(path.join(WWW, 'styles.css'), 'utf8');
  const logic = fs.readFileSync(path.join(WWW, 'logic.js'), 'utf8');
  const fetchMock = `
<script>
window.fetch = async function(url) {
  const p = String(url || '');
  if (p.includes('/api/logic/editor')) return { ok:true, status:200, json:async()=>({ ok:true, config:${JSON.stringify(config)} }) };
  if (p.includes('/api/logic/blocks')) return { ok:true, status:200, json:async()=>({ ok:true, blocks:[] }) };
  if (p.includes('/api/auth/status')) return { ok:true, status:200, json:async()=>({ ok:true, enabled:false, protectWrites:false, authed:false, role:'customer', capabilities:[], isCustomer:true }) };
  if (p.includes('/config')) return { ok:true, status:200, json:async()=>({ locale:{ language:'de', htmlLang:'de' }, featureVisibility:{ hasSmartHome:true, hasStorageFarm:false, hasEnergyLedger:false }, settingsConfig:{} }) };
  return { ok:true, status:200, json:async()=>({ ok:true }) };
};
</script>`;
  html = html.replace(/<link[^>]+href="\/static\/styles\.css"[^>]*>/i, `<style>${runtimeCss}</style>`);
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
    const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (result.exceptionDetails) {
      const text = result.exceptionDetails.exception?.description || result.exceptionDetails.text;
      throw new Error(text || 'Browser-Auswertung fehlgeschlagen');
    }
    return result.result ? result.result.value : undefined;
  }
  close() { try { this.ws.close(); } catch (_) {} }
}

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-logic-scroll-'));
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
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1728, height: 900, deviceScaleFactor: 1, mobile: false });
    const tree = await cdp.send('Page.getFrameTree');
    const frameId = tree.frameTree?.frame?.id;
    assert.ok(frameId, 'Chromium-Hauptrahmen fehlt.');
    await cdp.send('Page.setDocumentContent', { frameId, html: inlineRuntimeHtml() });

    await waitFor(async () => {
      const state = await cdp.eval(`(() => ({
        status: document.getElementById('nw-le-status')?.textContent || '',
        nodes: document.querySelectorAll('.nw-le-node').length,
        boardWidth: document.getElementById('nw-le-board-wrap')?.scrollWidth || 0
      }))()`);
      return state && /Bereit/.test(state.status) && state.nodes >= 2 && state.boardWidth > 1000 ? state : null;
    }, 20000, 'vollständig geladener NexoLogic-Editor');

    const metrics = await cdp.eval(`(() => {
      const wrap = document.getElementById('nw-le-board-wrap');
      const body = document.body;
      const doc = document.scrollingElement || document.documentElement;
      const palette = document.querySelector('.nw-le__palette');
      const inspector = document.querySelector('.nw-le__inspector');
      const before = { pageX: window.scrollX, pageY: window.scrollY, left: wrap.scrollLeft, top: wrap.scrollTop };
      wrap.scrollLeft = 700;
      wrap.scrollTop = 520;
      window.scrollTo(0, Math.max(0, doc.scrollHeight - doc.clientHeight));
      const boardStyle = getComputedStyle(wrap);
      const bodyStyle = getComputedStyle(body);
      return {
        viewport: { w: innerWidth, h: innerHeight },
        bodyOverflowY: bodyStyle.overflowY,
        boardOverflowX: boardStyle.overflowX,
        boardOverflowY: boardStyle.overflowY,
        paletteOverflowY: getComputedStyle(palette).overflowY,
        inspectorOverflowY: getComputedStyle(inspector).overflowY,
        boardClientWidth: wrap.clientWidth,
        boardClientHeight: wrap.clientHeight,
        boardScrollWidth: wrap.scrollWidth,
        boardScrollHeight: wrap.scrollHeight,
        boardScrollLeft: wrap.scrollLeft,
        boardScrollTop: wrap.scrollTop,
        pageClientHeight: doc.clientHeight,
        pageScrollHeight: doc.scrollHeight,
        pageScrollY: window.scrollY,
        before,
      };
    })()`);

    assert.equal(metrics.viewport.w, 1728);
    assert.equal(metrics.viewport.h, 900);
    assert.match(metrics.bodyOverflowY, /^(scroll|auto)$/);
    assert.match(metrics.boardOverflowX, /^(scroll|auto)$/);
    assert.match(metrics.boardOverflowY, /^(scroll|auto)$/);
    assert.match(metrics.paletteOverflowY, /^(scroll|auto)$/);
    assert.match(metrics.inspectorOverflowY, /^(scroll|auto)$/);
    assert.ok(metrics.boardScrollWidth > metrics.boardClientWidth + 500, `Canvas horizontal nicht scrollbar: ${JSON.stringify(metrics)}`);
    assert.ok(metrics.boardScrollHeight > metrics.boardClientHeight + 400, `Canvas vertikal nicht scrollbar: ${JSON.stringify(metrics)}`);
    assert.ok(metrics.boardScrollLeft > 0, `Horizontale Canvas-Scrollposition blieb 0: ${JSON.stringify(metrics)}`);
    assert.ok(metrics.boardScrollTop > 0, `Vertikale Canvas-Scrollposition blieb 0: ${JSON.stringify(metrics)}`);
    assert.ok(metrics.pageScrollHeight > metrics.pageClientHeight, `Seitenscrollbereich fehlt: ${JSON.stringify(metrics)}`);
    assert.ok(metrics.pageScrollY > 0, `Seite ließ sich nicht bis zur unteren Canvas-Kante scrollen: ${JSON.stringify(metrics)}`);

    const exceptions = cdp.events.filter((row) => row.method === 'Runtime.exceptionThrown');
    assert.equal(exceptions.length, 0, `Browser-Ausnahme im Scrollbar-Test: ${JSON.stringify(exceptions)}`);
    console.log('[nexologic-scrollbars-rc45] OK: Seiten-, Canvas- und Seitenleisten-Scrollbereiche sind im echten Chromium sichtbar und bedienbar.');
  } catch (error) {
    try {
      if (cdp) {
        const debug = await cdp.eval(`(() => ({
          readyState: document.readyState,
          status: document.getElementById('nw-le-status')?.textContent || '',
          bodyOverflow: getComputedStyle(document.body).overflowY,
          board: (() => { const e=document.getElementById('nw-le-board-wrap'); return e ? {cw:e.clientWidth,ch:e.clientHeight,sw:e.scrollWidth,sh:e.scrollHeight,sl:e.scrollLeft,st:e.scrollTop,overflow:getComputedStyle(e).overflow} : null; })(),
          doc: {ch:(document.scrollingElement||document.documentElement).clientHeight,sh:(document.scrollingElement||document.documentElement).scrollHeight,y:window.scrollY}
        }))()`);
        console.error('[nexologic-scrollbars-rc45] Seitenzustand:', JSON.stringify(debug));
      }
    } catch (_debugError) {}
    const tail = browserLog.join('').split(/\r?\n/).slice(-30).join('\n');
    if (tail) console.error('[nexologic-scrollbars-rc45] Chromium-Log:\n' + tail);
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
        if (attempt === 4) console.warn('[nexologic-scrollbars-rc45] Temp-Profil konnte nicht vollständig entfernt werden:', error.message);
        else await new Promise((resolve) => setTimeout(resolve, 120));
      }
    }
  }
})().catch((error) => {
  console.error('[nexologic-scrollbars-rc45] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
