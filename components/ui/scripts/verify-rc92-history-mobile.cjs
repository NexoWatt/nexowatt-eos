#!/usr/bin/env node
'use strict';

/**
 * RC92 – Historie auf Smartphones
 *
 * Dieser Test schützt ausschließlich den mobilen Anzeige-/Gestenvertrag der
 * Historienseite. EMS-, NVP-, Lade-, Speicher- und Hardwareentscheidungen sind
 * nicht Bestandteil dieses Tests und werden von RC92 nicht verändert.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const HTML_PATH = path.join(ROOT, 'www', 'history.html');
const JS_PATH = path.join(ROOT, 'www', 'history.js');
const SOURCE_PATH = path.join(ROOT, 'src-ts', 'runtime-executables', 'www', 'history.ts');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const runtime = fs.readFileSync(JS_PATH, 'utf8');
const source = fs.readFileSync(SOURCE_PATH, 'utf8');
const serviceWorkerSource = fs.readFileSync(path.join(ROOT, 'src-ts', 'runtime-executables', 'www', 'sw.ts'), 'utf8');

// Statische Sicherheitsverträge: Große Touchflächen dürfen vertikales Scrollen
// nicht blockieren; ein Tap muss denselben zentralen Tooltippfad wie Desktop nutzen.
assert(!/touch-action\s*:\s*none/i.test(html), 'History enthält weiterhin touch-action:none');
assert(/#chart\s*\{[\s\S]*?touch-action\s*:\s*pan-y\s+pinch-zoom/i.test(html), 'Hauptchart erlaubt kein natives pan-y');
assert(/\.cards\s+\.card\s*\{[\s\S]*?touch-action\s*:\s*auto/i.test(html), 'KPI-Karten blockieren weiterhin Touchscrollen');
assert(/#priceChart\s*\{[\s\S]*?touch-action\s*:\s*pan-y\s+pinch-zoom/i.test(html), 'Preis-Chart erlaubt kein natives pan-y');
for (const token of [
  'TOUCH_TAP_MAX_MOVE_PX',
  "gesture.mode = 'scroll'",
  "gesture.mode = 'zoom'",
  'window.__nxHistoryShowTipFromEvent(ev)',
  "<b>Energie</b>",
  "<b>Leistung</b>",
  "tip.style.position = 'fixed'",
  "tip.style.maxHeight = 'min(62dvh, 480px)'",
  'scheduleHistoryFrame()',
]) {
  assert(source.includes(token), `RC92-History-Vertrag fehlt: ${token}`);
}
assert(runtime.includes('AUTO-GENERATED RUNTIME FILE'), 'history.js ist kein generiertes Runtime-Artefakt');
assert(runtime.includes('Quelle: src-ts/runtime-executables/www/history.ts'), 'history.js verweist nicht auf die kanonische TS-Quelle');
const cacheVersionMatch = serviceWorkerSource.match(/nexowatt-cache-v(\d+)/);
assert(cacheVersionMatch && Number(cacheVersionMatch[1]) >= 492, 'Service-Worker-Cache muss mindestens RC92/v492 entsprechen');

const CHROMIUM = [process.env.CHROMIUM_BIN, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']
  .find((candidate) => candidate && fs.existsSync(candidate));
if (!CHROMIUM) {
  console.log('[rc92-history-mobile] OK (statisch); Browsertest übersprungen, Chromium nicht gefunden.');
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
    await wait(50);
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
    const response = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    });
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text || 'Browserfehler');
    }
    return response.result ? response.result.value : undefined;
  }
  close() { try { this.ws.close(); } catch (_) {} }
}

function sanitizedHtml(input) {
  return String(input)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi, '')
    .replace('</head>', '<style>.hidden{display:none!important} body{min-height:2200px!important}</style></head>');
}

const mockRuntimeSetup = `(() => {
  window.alert = (message) => { window.__rc92Alerts = (window.__rc92Alerts || []).concat(String(message)); };
  window.EventSource = class {
    constructor() { setTimeout(() => { if (typeof this.onopen === 'function') this.onopen(); }, 0); }
    close() {}
  };
  window.fetch = async (input) => {
    const raw = String(input || '');
    if (raw.includes('/config')) {
      return { json: async () => ({ settingsConfig: { evcsConfiguredCount: 1, evcsCount: 1 }, featureVisibility: {} }) };
    }
    if (!raw.includes('/api/history')) return { json: async () => ({}) };
    const url = new URL(raw, 'https://nexowatt.test');
    const start = Number(url.searchParams.get('from'));
    const end = Number(url.searchParams.get('to'));
    const step = Math.max(60, Number(url.searchParams.get('step') || 600));
    const rows = [];
    for (let ts = start, index = 0; ts <= end && index < 1600; ts += step * 1000, index += 1) {
      const phase = (index % 144) / 144 * Math.PI * 2;
      const pv = Math.max(0, 11000 * Math.sin(phase));
      const load = 5200 + 1250 * Math.cos(phase);
      const buy = Math.max(0, load - pv);
      const sell = Math.max(0, pv - load);
      rows.push([ts, pv, load, buy, sell, 54 + (index % 24)]);
    }
    const values = (column) => rows.map((row) => [row[0], row[column]]);
    const zeros = rows.map((row) => [row[0], 0]);
    return {
      json: async () => ({
        ok: true, start, end, step,
        series: {
          pv: { values: values(1) },
          load: { values: values(2) },
          buy: { values: values(3) },
          sell: { values: values(4) },
          chg: { values: zeros },
          dchg: { values: zeros },
          evcs: { values: zeros },
          soc: { values: values(5) },
        },
        energy: {}, energyExact: {},
        extras: { consumers: [], producers: [] },
        pricing: { active: false, dynamicTariff: false, netFeeEnabled: false, series: {} },
      }),
    };
  };
  return true;
})()`;

function touchPoint(x, y) {
  return { x, y, radiusX: 1, radiusY: 1, force: 1, id: 1 };
}

async function tap(cdp, x, y) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touchPoint(x, y)] });
  await wait(30);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function swipe(cdp, x0, y0, x1, y1, steps = 6) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touchPoint(x0, y0)] });
  for (let index = 1; index <= steps; index += 1) {
    const progress = index / steps;
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [touchPoint(x0 + (x1 - x0) * progress, y0 + (y1 - y0) * progress)],
    });
    await wait(25);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-rc92-history-mobile-'));
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
    assert(tabs[0]?.webSocketDebuggerUrl, 'Kein Chromium-Debug-Tab gefunden');
    cdp = new CdpClient(tabs[0].webSocketDebuggerUrl);
    await cdp.open();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390, height: 844, deviceScaleFactor: 2, mobile: true,
      screenWidth: 390, screenHeight: 844,
    });
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

    const pageHtml = sanitizedHtml(html);
    await cdp.eval(`(() => {
      document.open();
      document.write(${JSON.stringify(pageHtml)});
      document.close();
      return true;
    })()`);
    await cdp.eval(mockRuntimeSetup);
    await cdp.eval(`(0, eval)(${JSON.stringify(`${runtime}\n//# sourceURL=rc92-history-mobile.js`)})`);

    await waitFor(
      () => cdp.eval("document.querySelectorAll('#cards .card').length >= 7"),
      15000,
      'Historien-KPI-Karten',
    );
    const alerts = await cdp.eval('window.__rc92Alerts || []');
    assert.deepEqual(alerts, [], `History meldete Ladefehler: ${JSON.stringify(alerts)}`);

    // 1) Kurzer Touch-Tap: dieselben Leistungswerte wie beim Desktop-Klick.
    const dayBox = await cdp.eval(`(() => {
      document.getElementById('chart').scrollIntoView({ block: 'center' });
      const r = document.getElementById('chart').getBoundingClientRect();
      return { x:r.left, y:r.top, width:r.width, height:r.height, scrollY:window.scrollY };
    })()`);
    await wait(120);
    await tap(cdp, dayBox.x + dayBox.width * 0.55, dayBox.y + dayBox.height * 0.45);
    const dayTip = await waitFor(() => cdp.eval(`(() => {
      const tip = document.querySelector('.nx-tip[data-history-tip="main"]');
      if (!tip || getComputedStyle(tip).display === 'none') return null;
      const r = tip.getBoundingClientRect();
      return { text:tip.innerText, top:r.top, bottom:r.bottom, left:r.left, right:r.right, width:innerWidth, height:innerHeight };
    })()`), 3000, 'mobilem Tages-Tooltip');
    assert(dayTip.text.includes('Leistung'), 'Tages-Tap zeigt keine Leistungsüberschrift');
    assert(dayTip.text.includes('Erzeugung') && dayTip.text.includes('Verbrauch'), 'Tages-Tap zeigt nicht alle Kernwerte');
    assert(dayTip.text.includes('kW'), 'Tages-Tap zeigt keine Leistungswerte');
    assert(dayTip.top >= -1 && dayTip.left >= -1 && dayTip.right <= dayTip.width + 1 && dayTip.bottom <= dayTip.height + 1,
      `Tages-Tooltip liegt außerhalb des Viewports: ${JSON.stringify(dayTip)}`);

    // 2) Eine vertikale Geste auf dem Canvas muss die Seite scrollen und darf
    // weder preventDefault erzwingen noch am Ende ein falsches Tooltip öffnen.
    await cdp.eval("window.__nxHistoryHideTip && window.__nxHistoryHideTip(true)");
    const scrollStart = await cdp.eval('window.scrollY');
    await swipe(
      cdp,
      dayBox.x + dayBox.width * 0.50,
      dayBox.y + dayBox.height * 0.76,
      dayBox.x + dayBox.width * 0.50,
      dayBox.y + dayBox.height * 0.18,
    );
    await wait(350);
    const scrollResult = await cdp.eval(`(() => ({
      y:window.scrollY,
      tip:getComputedStyle(document.querySelector('.nx-tip[data-history-tip="main"]')).display,
    }))()`);
    assert(scrollResult.y > scrollStart + 80, `Vertikales Chart-Wischen scrollt nicht: ${scrollStart} -> ${scrollResult.y}`);
    assert.equal(scrollResult.tip, 'none', 'Eine Scrollgeste öffnete fälschlich das Wertefenster');

    // 3) Woche/Monat/Jahr zeigen Energie je ausgewähltem Balken. Genau diese
    // mobile Lücke hatte der Feldtest gemeldet.
    await cdp.eval("document.querySelector('[data-range=\"week\"]').click()");
    await waitFor(() => cdp.eval("document.querySelector('[data-range=\"week\"]').classList.contains('active')"), 3000, 'Wochenmodus');
    await wait(650);
    const weekBox = await cdp.eval(`(() => {
      document.getElementById('chart').scrollIntoView({ block: 'center' });
      const r = document.getElementById('chart').getBoundingClientRect();
      return { x:r.left, y:r.top, width:r.width, height:r.height };
    })()`);
    await wait(120);
    await tap(cdp, weekBox.x + weekBox.width * 0.46, weekBox.y + weekBox.height * 0.45);
    const weekTip = await waitFor(() => cdp.eval(`(() => {
      const tip = document.querySelector('.nx-tip[data-history-tip="main"]');
      if (!tip || getComputedStyle(tip).display === 'none') return null;
      const r = tip.getBoundingClientRect();
      return { text:tip.innerText, top:r.top, bottom:r.bottom, left:r.left, right:r.right, width:innerWidth, height:innerHeight };
    })()`), 3000, 'mobilem Wochen-Energietooltip');
    assert(weekTip.text.includes('Energie'), 'Wochen-Tap zeigt keine Energieüberschrift');
    assert(weekTip.text.includes('Erzeugung') && weekTip.text.includes('Verbrauch'), 'Wochen-Tap zeigt nicht alle Kernenergien');
    assert(weekTip.text.includes('kWh'), 'Wochen-Tap zeigt keine Energiewerte');
    assert(weekTip.top >= -1 && weekTip.left >= -1 && weekTip.right <= weekTip.width + 1 && weekTip.bottom <= weekTip.height + 1,
      `Wochen-Tooltip liegt außerhalb des Viewports: ${JSON.stringify(weekTip)}`);

    // 4) Der bestehende horizontale Tages-Zoom bleibt erhalten. Nur diese klar
    // horizontale Geste darf die Browserbewegung übernehmen.
    await cdp.eval("document.querySelector('[data-range=\"day\"]').click()");
    await wait(650);
    const zoomBefore = await cdp.eval(`(() => ({
      from:document.getElementById('from').value,
      to:document.getElementById('to').value,
      box:(()=>{const r=document.getElementById('chart').getBoundingClientRect();return {x:r.left,y:r.top,width:r.width,height:r.height};})(),
    }))()`);
    await swipe(
      cdp,
      zoomBefore.box.x + zoomBefore.box.width * 0.25,
      zoomBefore.box.y + zoomBefore.box.height * 0.48,
      zoomBefore.box.x + zoomBefore.box.width * 0.72,
      zoomBefore.box.y + zoomBefore.box.height * 0.49,
    );
    await wait(550);
    const zoomAfter = await cdp.eval(`(() => ({
      from:document.getElementById('from').value,
      to:document.getElementById('to').value,
      resetVisible:!document.getElementById('resetZoomBtn').classList.contains('hidden'),
    }))()`);
    assert(zoomAfter.from !== zoomBefore.from || zoomAfter.to !== zoomBefore.to, 'Horizontaler Tages-Zoom wurde durch den Scrollfix beschädigt');
    assert.equal(zoomAfter.resetVisible, true, 'Zoom-zurück-Schaltfläche wird nach Touch-Zoom nicht sichtbar');

    console.log('[rc92-history-mobile] OK: natives Scrollen, mobile Leistungs-/Energiewerte und Tages-Zoom funktionieren gemeinsam.');
  } finally {
    if (cdp) cdp.close();
    try { browser.kill('SIGTERM'); } catch (_) {}
    await wait(250);
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 }); } catch (_) {}
  }
})().catch((error) => {
  console.error('[rc92-history-mobile] ERROR:', error && error.stack || error);
  process.exit(1);
});
