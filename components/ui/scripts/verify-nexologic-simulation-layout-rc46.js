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
assert.ok(CHROMIUM, 'Chromium/Chrome für den NexoLogic-RC46-Browsertest wurde nicht gefunden.');

const config = {
  version: 1,
  graphs: [{
    id: 'main',
    name: 'RC46-Test',
    enabled: true,
    board: { w: 2400, h: 1400 },
    nodes: [],
    links: [],
  }],
};

function inlineRuntimeHtml() {
  let html = fs.readFileSync(path.join(WWW, 'logic.html'), 'utf8');
  const css = fs.readFileSync(path.join(WWW, 'styles.css'), 'utf8');
  const logic = fs.readFileSync(path.join(WWW, 'logic.js'), 'utf8');
  const fetchMock = `
<script>
window.__nwFetchCalls = [];
try {
  const __store = new Map();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem(key) { return __store.has(String(key)) ? __store.get(String(key)) : null; },
      setItem(key, value) { __store.set(String(key), String(value)); },
      removeItem(key) { __store.delete(String(key)); },
      clear() { __store.clear(); },
    },
  });
} catch (_e) {}
window.fetch = async function(url, options) {
  const p = String(url || '');
  window.__nwFetchCalls.push({ url:p, method:String(options && options.method || 'GET').toUpperCase() });
  if (p.includes('/api/logic/editor')) return { ok:true, status:200, json:async()=>({ ok:true, config:${JSON.stringify(config)} }) };
  if (p.includes('/api/logic/blocks')) return { ok:true, status:200, json:async()=>({ ok:true, blocks:[] }) };
  if (p.includes('/api/auth/status')) return { ok:true, status:200, json:async()=>({ ok:true, enabled:false, protectWrites:false, authed:false, role:'customer', capabilities:[], isCustomer:true }) };
  if (p.includes('/config')) return { ok:true, status:200, json:async()=>({ locale:{ language:'de', htmlLang:'de' }, featureVisibility:{ hasSmartHome:true, hasStorageFarm:false, hasEnergyLedger:false }, settingsConfig:{} }) };
  return { ok:true, status:200, json:async()=>({ ok:true }) };
};
window.confirm = () => true;
window.prompt = (_message, value) => value || '';
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
      this.ws.addEventListener('open', resolve, { once:true });
      this.ws.addEventListener('error', reject, { once:true });
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
    const result = await this.send('Runtime.evaluate', { expression, awaitPromise:true, returnByValue:true, userGesture:true });
    if (result.exceptionDetails) {
      const text = result.exceptionDetails.exception?.description || result.exceptionDetails.text;
      throw new Error(text || 'Browser-Auswertung fehlgeschlagen');
    }
    return result.result ? result.result.value : undefined;
  }
  close() { try { this.ws.close(); } catch (_) {} }
}

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-logic-rc46-'));
  const browserLog = [];
  const browser = spawn(CHROMIUM, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--disable-background-networking', '--disable-component-update', '--disable-default-apps',
    '--disable-extensions', '--no-first-run', '--remote-debugging-port=0',
    `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio:['ignore','pipe','pipe'] });
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
    await cdp.send('Emulation.setDeviceMetricsOverride', { width:1920, height:1000, deviceScaleFactor:1, mobile:false });
    const tree = await cdp.send('Page.getFrameTree');
    const frameId = tree.frameTree?.frame?.id;
    assert.ok(frameId, 'Chromium-Hauptrahmen fehlt.');
    await cdp.send('Page.setDocumentContent', { frameId, html:inlineRuntimeHtml() });

    await waitFor(async () => {
      const state = await cdp.eval(`(() => ({ status:document.getElementById('nw-le-status')?.textContent || '', nodes:nwLE?.graph?.nodes?.length ?? -1, layout:!!document.getElementById('nw-le-btn-layout'), simulation:!!document.getElementById('nw-le-btn-sim') }))()`);
      return state && /Bereit/.test(state.status) && state.nodes === 0 && state.layout && state.simulation ? state : null;
    }, 20000, 'vollständig geladener RC46-Editor');

    const placement = await cdp.eval(`(() => {
      nwAddNode('dp_in');
      nwAddNode('dp_in');
      nwAddNode('and');
      nwAddNode('not');
      nwAddNode('dp_out');
      const nodes = nwLE.graph.nodes.map(n => ({ id:n.id, type:n.type, x:n.x, y:n.y }));
      const byType = (type) => nodes.filter(n => n.type === type);
      const a = byType('dp_in')[0];
      const b = byType('dp_in')[1];
      const andNode = byType('and')[0];
      const notNode = byType('not')[0];
      const output = byType('dp_out')[0];
      const rects = nodes.map(n => ({ ...n, w:240, h:164 }));
      const overlaps = [];
      for (let i=0;i<rects.length;i++) for (let j=i+1;j<rects.length;j++) {
        const r1=rects[i], r2=rects[j];
        const overlap = !(r1.x+r1.w<=r2.x || r2.x+r2.w<=r1.x || r1.y+r1.h<=r2.y || r2.y+r2.h<=r1.y);
        if (overlap) overlaps.push([r1.id,r2.id]);
      }
      return { nodes, inputXs:[a.x,b.x], inputYs:[a.y,b.y], logicXs:[andNode.x,notNode.x], outputX:output.x, overlaps };
    })()`);

    assert.equal(placement.nodes.length, 5);
    assert.equal(placement.overlaps.length, 0, `Automatische Platzierung überlappt: ${JSON.stringify(placement)}`);
    assert.ok(Math.max(...placement.inputXs) < Math.min(...placement.logicXs), `Eingänge stehen nicht links: ${JSON.stringify(placement)}`);
    assert.ok(Math.max(...placement.logicXs) < placement.outputX, `Ausgang steht nicht rechts: ${JSON.stringify(placement)}`);
    assert.notEqual(placement.inputYs[0], placement.inputYs[1], 'Mehrere Eingänge dürfen nicht übereinander liegen.');

    const simulation = await cdp.eval(`(() => {
      const ins = nwLE.graph.nodes.filter(n => n.type === 'dp_in');
      const andNode = nwLE.graph.nodes.find(n => n.type === 'and');
      const notNode = nwLE.graph.nodes.find(n => n.type === 'not');
      const output = nwLE.graph.nodes.find(n => n.type === 'dp_out');
      nwLE.graph.links = [
        { id:'l1', from:{node:ins[0].id,port:'out'}, to:{node:andNode.id,port:'a'} },
        { id:'l2', from:{node:ins[1].id,port:'out'}, to:{node:andNode.id,port:'b'} },
        { id:'l3', from:{node:andNode.id,port:'out'}, to:{node:notNode.id,port:'in'} },
        { id:'l4', from:{node:notNode.id,port:'out'}, to:{node:output.id,port:'in'} },
      ];
      nwRenderGraph();
      nwAutoLayoutGraph();
      nwOpenSimulation();
      nwLE.simulation.inputTypes[ins[0].id] = 'bool';
      nwLE.simulation.inputTypes[ins[1].id] = 'bool';
      nwLE.simulation.inputs[ins[0].id] = true;
      nwLE.simulation.inputs[ins[1].id] = true;
      nwSimEvaluate('RC46 Testwerte');
      nwSimAdvance(1000, 'RC46 +1s');
      const nodeRows = nwLE.graph.nodes.map(n => ({ id:n.id,type:n.type,x:n.x,y:n.y }));
      const wireLabels = [...document.querySelectorAll('.nw-le-wire-value')].map(e => e.textContent);
      const badges = [...document.querySelectorAll('.nw-le-node__sim-value')].map(e => e.textContent.trim());
      const trace = nwLE.simulation.traces.map(row => row.message);
      const posts = window.__nwFetchCalls.filter(row => row.method !== 'GET');
      return {
        ids:{ in0:ins[0].id,in1:ins[1].id,and:andNode.id,not:notNode.id,out:output.id },
        outputs:nwLE.simulation.outputs,
        nodeRows,
        wireLabels,
        badges,
        trace,
        posts,
        simActive:nwLE.simulation.active,
        simTime:nwLE.simulation.nowMs,
        panelVisible:!document.getElementById('nw-le-sim-panel').classList.contains('hidden'),
      };
    })()`);

    assert.equal(simulation.simActive, true);
    assert.equal(simulation.panelVisible, true);
    assert.equal(simulation.outputs[simulation.ids.in0].out, true);
    assert.equal(simulation.outputs[simulation.ids.in1].out, true);
    assert.equal(simulation.outputs[simulation.ids.and].out, true, 'UND muss im selben topologischen Simulationsschritt true liefern.');
    assert.equal(simulation.outputs[simulation.ids.not].out, false, 'NICHT muss im selben topologischen Simulationsschritt false liefern.');
    assert.ok(simulation.wireLabels.includes('EIN'), `Live-Werte auf Leitungen fehlen: ${JSON.stringify(simulation.wireLabels)}`);
    assert.ok(simulation.badges.some((row) => /Aus\s+EIN/.test(row)), `Live-Werte an Bausteinen fehlen: ${JSON.stringify(simulation.badges)}`);
    assert.ok(simulation.trace.some((row) => /Würde .* schreiben/.test(row)), `Schreibfreier Ausgangs-Trace fehlt: ${JSON.stringify(simulation.trace)}`);
    assert.equal(simulation.posts.length, 0, `Die Browser-Simulation darf keine POST-/Hardware-Aufrufe auslösen: ${JSON.stringify(simulation.posts)}`);

    const layoutCheck = simulation.nodeRows.reduce((acc, n) => { (acc[n.type] ||= []).push(n); return acc; }, {});
    assert.ok(layoutCheck.dp_in.every(n => n.x < layoutCheck.and[0].x), 'Auto-Anordnung muss Eingänge links halten.');
    assert.ok(layoutCheck.dp_out[0].x > layoutCheck.not[0].x, 'Auto-Anordnung muss Ausgänge rechts halten.');

    const history = await cdp.eval(`(() => {
      nwHistoryCommit('Vor History-Test');
      const before = nwLE.graph.nodes.length;
      nwAddNode('or');
      nwHistoryCommit('ODER hinzugefügt');
      const afterAdd = nwLE.graph.nodes.length;
      nwUndo();
      const afterUndo = nwLE.graph.nodes.length;
      nwRedo();
      const afterRedo = nwLE.graph.nodes.length;
      nwWriteLocalDraftNow();
      const draft = JSON.parse(localStorage.getItem('nexowatt-eos.nexologic.local-draft.v1') || 'null');
      return { before, afterAdd, afterUndo, afterRedo, undoDisabled:document.getElementById('nw-le-btn-undo').disabled, draftNodes:draft?.cfg?.graphs?.[0]?.nodes?.length ?? -1 };
    })()`);
    assert.equal(history.afterAdd, history.before + 1);
    assert.equal(history.afterUndo, history.before);
    assert.equal(history.afterRedo, history.before + 1);
    assert.equal(history.draftNodes, history.afterRedo, 'Lokaler Auto-Entwurf muss den aktuellen Graphzustand enthalten.');

    const coverage = await cdp.eval(`(async () => {
      nwCloseSimulation();
      nwLE.graph.nodes = [];
      nwLE.graph.links = [];
      for (const def of nwLE.lib.list) nwAddNode(def.type);
      nwRenderGraph();
      nwOpenSimulation();
      nwSimEvaluate('Alle Bausteintypen');
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const nodes = nwLE.graph.nodes;
      const outputIds = new Set(Object.keys(nwLE.simulation.outputs || {}));
      const missingOutputs = nodes.filter((node) => !outputIds.has(node.id)).map((node) => node.type);
      const warnings = nwLE.simulation.traces.filter((row) => /noch nicht ausgewertet/.test(row.message)).map((row) => row.message);
      const rows = [...document.querySelectorAll('.nw-le-node')].map((el) => {
        const r = el.getBoundingClientRect();
        return { id:el.dataset.nodeId, type:nwFindNode(el.dataset.nodeId)?.type || '', left:r.left, right:r.right, top:r.top, bottom:r.bottom };
      });
      const overlaps = [];
      for (let i=0;i<rows.length;i++) for (let j=i+1;j<rows.length;j++) {
        const a=rows[i], b=rows[j];
        if (!(a.right<=b.left || b.right<=a.left || a.bottom<=b.top || b.bottom<=a.top)) overlaps.push([a.type,b.type]);
      }
      return { nodeCount:nodes.length, typeCount:nwLE.lib.list.length, missingOutputs, warnings, overlaps, traceCount:nwLE.simulation.traces.length };
    })()`);
    assert.equal(coverage.nodeCount, 41, `Die erwarteten 41 NexoLogic-Bausteine fehlen: ${JSON.stringify(coverage)}`);
    assert.equal(coverage.typeCount, 41);
    assert.deepEqual(coverage.missingOutputs, [], `Simulationsauswertung fehlt für Bausteine: ${JSON.stringify(coverage)}`);
    assert.deepEqual(coverage.warnings, [], `Nicht abgedeckte Simulationsbausteine: ${JSON.stringify(coverage)}`);
    assert.deepEqual(coverage.overlaps, [], `Automatische Palette-Platzierung überlappt bei vollständiger Bausteinbibliothek: ${JSON.stringify(coverage.overlaps)}`);

    const exceptions = cdp.events.filter((row) => row.method === 'Runtime.exceptionThrown');
    assert.equal(exceptions.length, 0, `Browser-Ausnahme in RC46: ${JSON.stringify(exceptions)}`);

    console.log('[nexologic-simulation-layout-rc46] OK: geordnete Spuren, überlappungsfreie Platzierung, Auto-Anordnung, schreibfreie Simulation, Live-Werte, Trace, Undo/Redo und lokaler Entwurf funktionieren im echten Chromium.');
  } catch (error) {
    try {
      if (cdp) {
        const debug = await cdp.eval(`(() => ({ status:document.getElementById('nw-le-status')?.textContent || '', nodes:nwLE?.graph?.nodes?.map(n=>({id:n.id,type:n.type,x:n.x,y:n.y})) || [], sim:nwLE?.simulation || null, fetches:window.__nwFetchCalls || [] }))()`);
        console.error('[nexologic-simulation-layout-rc46] Seitenzustand:', JSON.stringify(debug));
        console.error('[nexologic-simulation-layout-rc46] CDP-Ereignisse:', JSON.stringify(cdp.events.filter((row) => ['Runtime.exceptionThrown','Runtime.consoleAPICalled','Log.entryAdded'].includes(row.method)).slice(-25)));
      }
    } catch (_) {}
    const tail = browserLog.join('').split(/\r?\n/).slice(-30).join('\n');
    if (tail) console.error('[nexologic-simulation-layout-rc46] Chromium-Log:\n' + tail);
    throw error;
  } finally {
    if (cdp) cdp.close();
    try { browser.kill('SIGKILL'); } catch (_) {}
    await new Promise((resolve) => {
      if (browser.exitCode !== null || browser.signalCode) return resolve();
      const timer = setTimeout(resolve, 800);
      browser.once('exit', () => { clearTimeout(timer); resolve(); });
    });
    for (let attempt=0;attempt<5;attempt+=1) {
      try { fs.rmSync(profile, { recursive:true, force:true }); break; }
      catch (error) {
        if (attempt === 4) console.warn('[nexologic-simulation-layout-rc46] Temp-Profil konnte nicht vollständig entfernt werden:', error.message);
        else await new Promise((resolve) => setTimeout(resolve, 120));
      }
    }
  }
})().catch((error) => {
  console.error('[nexologic-simulation-layout-rc46] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
