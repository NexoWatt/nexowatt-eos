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
assert.ok(CHROMIUM, 'Chromium/Chrome für den RC56-Browsertest wurde nicht gefunden.');

async function waitFor(test, timeoutMs, label) {
  const started = Date.now();
  let last;
  while (Date.now() - started < timeoutMs) {
    try { last = await test(); if (last) return last; } catch (error) { last = error; }
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error(`Timeout bei ${label}: ${last && last.message ? last.message : JSON.stringify(last)}`);
}

class CdpClient {
  constructor(url) { this.ws = new WebSocket(url); this.nextId = 1; this.pending = new Map(); this.events = []; }
  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(String(event.data || '{}'));
      if (msg.id && this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id); this.pending.delete(msg.id);
        if (msg.error) p.reject(new Error(`${msg.error.code}: ${msg.error.message}`)); else p.resolve(msg.result || {});
      } else if (msg.method) this.events.push(msg);
    });
  }
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject }); this.ws.send(JSON.stringify({ id, method, params })); });
  }
  async eval(expression) {
    const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Browser-Auswertung fehlgeschlagen');
    return result.result ? result.result.value : undefined;
  }
  close() { try { this.ws.close(); } catch (_) {} }
}

function fixture() {
  const thermal = [{ enabled: true, name: 'Kühlhaus Aktiv', slot: 1, type: 'switch' }];
  for (let i = 2; i <= 10; i += 1) thermal.push({ enabled: false, name: `Thermisches Gerät ${i}`, slot: i });
  return {
    license: { valid: true, edition: 'eos' },
    emsApps: { apps: {
      operatingStrategies: { installed: true, enabled: true },
      storagefarm: { installed: true, enabled: true },
      storage: { installed: true, enabled: true },
      charging: { installed: true, enabled: true },
      thermal: { installed: true, enabled: true },
      heatingrod: { installed: true, enabled: true },
    } },
    enableStorageFarm: true,
    enableStorageControl: true,
    enableChargingManagement: true,
    enableThermalControl: true,
    enableHeatingRodControl: true,
    operatingStrategies: {
      schemaVersion: 3,
      enabled: true,
      mode: 'active',
      commissioningConfirmed: true,
      controlTakeoverEnabled: true,
      writeExecutionEnabled: true,
      autoControl: { enabled: true, stage: 'active', requestTtlSeconds: 15, fallback: 'standardAuto' },
      activeProfileId: 'winter',
      resourceLinks: [
        { sourceId: 'storagefarm:1', enabled: true, priority: 80, roleOverride: 'storage', controlMode: 'active', commissioningConfirmed: true, writeEnabled: true },
        { sourceId: 'evcs:lp1', enabled: true, priority: 100, roleOverride: 'chargingPoint', controlMode: 'active', commissioningConfirmed: true, writeEnabled: true, autoSource: 'strategy' },
        { sourceId: 'thermal:1', enabled: true, priority: 90, roleOverride: 'cooling', controlMode: 'active', commissioningConfirmed: true, writeEnabled: true, mappings: { temperatureReadId: 'cold.temp' } },
        { sourceId: 'heatingRod:1', enabled: true, priority: 40, roleOverride: 'heatingRod', controlMode: 'active', commissioningConfirmed: true, writeEnabled: true },
        { sourceId: 'flow-consumer:4', enabled: true, priority: 50, roleOverride: 'flexConsumer', controlMode: 'observe', commissioningConfirmed: false },
        { sourceId: 'thermal:2', enabled: true, priority: 99, roleOverride: 'cooling', controlMode: 'active', commissioningConfirmed: true, writeEnabled: true },
      ],
      customResources: [{ id: 'custom-one', enabled: true, name: 'Custom Test', resourceType: 'consumer', controlType: 'switch', controlMode: 'active', commissioningConfirmed: true, writeEnabled: true, mappings: { powerReadId: 'custom.power', switchWriteId: 'custom.write' } }],
      profiles: [
        { id: 'winter', name: 'Winterbetrieb', enabled: true, season: 'winter', nightReserve: { enabled: true, storageResourceId: 'storagefarm:1', targetSocPct: 40, absoluteMinSocPct: 10, startMode: 'sunset', startTime: '18:00', endMode: 'sunrise', endTime: '07:00' } },
        { id: 'summer', name: 'Sommerbetrieb', enabled: true, season: 'summer', nightReserve: { enabled: true, storageResourceId: 'storagefarm:1', targetSocPct: 60, absoluteMinSocPct: 10, startMode: 'sunset', startTime: '18:00', endMode: 'sunrise', endTime: '07:00' } },
      ],
      rules: [],
    },
    storageFarm: { storages: [
      { enabled: true, name: 'Farm Speicher Aktiv', socId: 'farm.1.soc', setSignedPowerId: 'farm.1.set' },
      { enabled: false, name: 'Farm Speicher Inaktiv', socId: 'farm.2.soc', setSignedPowerId: 'farm.2.set' },
      { enabled: true, name: 'Farm Speicher Leer' },
    ] },
    storage: { enabled: true, name: 'Einzelspeicher Duplikat', datapoints: { socObjectId: 'single.soc', targetPowerObjectId: 'single.set' } },
    settingsConfig: { evcsList: [
      { enabled: true, name: 'Ladepunkt Aktiv', stationKey: 'S1', connectorNo: 1, powerId: 'ev.1.power', vehicleSocId: 'ev.1.soc', setPowerWId: 'ev.1.set' },
      { enabled: false, name: 'Ladepunkt Inaktiv', stationKey: 'S1', connectorNo: 2, powerId: 'ev.2.power', setPowerWId: 'ev.2.set' },
      { enabled: true, name: 'Ladepunkt Leer' },
    ] },
    thermal: { devices: thermal },
    heatingRod: { devices: [
      { enabled: true, name: 'Heizstab Aktiv', slot: 2, stages: [{ writeId: 'rod.stage1' }] },
      { enabled: false, name: 'Heizstab Inaktiv', slot: 3, stages: [{ writeId: 'rod.stage2' }] },
    ] },
    datapoints: { consumer1Power: 'cold.power', consumer2Power: 'rod.power', consumer4Power: 'generic.power' },
    vis: { flowSlots: { consumers: [
      { enabled: true, name: 'Kühlhaus Slot', consumerType: 'cooling', ctrl: { switchWriteId: 'cold.enable', switchReadId: 'cold.running' } },
      { enabled: true, name: 'Heizstab Slot', consumerType: 'heatingRod', ctrl: { stage1WriteId: 'rod.stage1' } },
      { enabled: false, name: 'Verbraucher Inaktiv', consumerType: 'generic', ctrl: { switchWriteId: 'inactive.write' } },
      { enabled: true, name: 'Allgemeinverbraucher Aktiv', consumerType: 'generic', ctrl: {} },
    ] } },
  };
}

function html() {
  const builder = fs.readFileSync(path.join(ROOT, 'www/operating-strategies-rule-builder.js'), 'utf8');
  const app = fs.readFileSync(path.join(ROOT, 'www/operating-strategies-appcenter.js'), 'utf8');
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#071522;color:#fff;font-family:Arial,sans-serif}.nw-field{display:flex;flex-direction:column;gap:4px}.nw-config-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.nw-btn{padding:5px 8px}</style></head><body><div id="mount"></div><script>${builder}</script><script>${app}</script><script>window.__cfg=${JSON.stringify(fixture())};window.__status=[];NexoWattOperatingStrategiesAppCenter.setup({getEdition:()=> 'eos',setStatus:(m,k)=>window.__status.push({m,k})});NexoWattOperatingStrategiesAppCenter.render(document.getElementById('mount'),window.__cfg,true);</script></body></html>`;
}

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-rc56-os-'));
  const logs = [];
  const browser = spawn(CHROMIUM, ['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--disable-component-update','--disable-default-apps','--disable-extensions','--no-first-run','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'], { stdio: ['ignore','pipe','pipe'] });
  browser.stdout.on('data', (c) => logs.push(String(c))); browser.stderr.on('data', (c) => logs.push(String(c)));
  let cdp;
  try {
    const portFile = path.join(profile, 'DevToolsActivePort');
    await waitFor(() => fs.existsSync(portFile), 15000, 'DevToolsActivePort');
    const port = Number(fs.readFileSync(portFile, 'utf8').split(/\r?\n/)[0]);
    const target = await waitFor(async () => (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((r) => r.type === 'page'), 15000, 'Browser-Target');
    cdp = new CdpClient(target.webSocketDebuggerUrl); await cdp.open();
    await cdp.send('Runtime.enable'); await cdp.send('Page.enable'); await cdp.send('Log.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
    const tree = await cdp.send('Page.getFrameTree');
    await cdp.send('Page.setDocumentContent', { frameId: tree.frameTree.frame.id, html: html() });

    const loaded = await waitFor(async () => {
      const value = await cdp.eval(`(() => { const root=document.getElementById('nwOperatingStrategiesRoot'); return root ? {count:root.querySelectorAll('#osExistingResources .nw-os-resource').length,text:root.innerText} : null; })()`);
      return value && value.count === 5 ? value : null;
    }, 20000, 'kompakte Betriebsstrategien-App');

    assert.match(loaded.text, /Farm Speicher Aktiv/);
    assert.match(loaded.text, /Ladepunkt Aktiv/);
    assert.match(loaded.text, /Kühlhaus Aktiv/);
    assert.match(loaded.text, /Heizstab Aktiv/);
    assert.match(loaded.text, /Allgemeinverbraucher Aktiv/);
    for (const hidden of ['Farm Speicher Inaktiv','Farm Speicher Leer','Einzelspeicher Duplikat','Ladepunkt Inaktiv','Ladepunkt Leer','Thermisches Gerät 2','Thermisches Gerät 10','Heizstab Inaktiv','Verbraucher Inaktiv']) assert.doesNotMatch(loaded.text, new RegExp(hidden));
    assert.match(loaded.text, /Live-Regelanforderungen aktiv/);
    assert.match(loaded.text, /Auto → Betriebsstrategie/);
    assert.match(loaded.text, /Manuell, Boost, PV, Min\+PV und Zeit-Ziel/);

    const layout = await cdp.eval(`(() => { const root=document.getElementById('nwOperatingStrategiesRoot'); const details=[...root.querySelectorAll('#osExistingResources details')]; return {open:details.map(d=>d.open),heights:details.map(d=>Math.round(d.getBoundingClientRect().height)),overflow:root.scrollWidth-root.clientWidth,viewportOverflow:document.documentElement.scrollWidth-innerWidth}; })()`);
    assert.ok(layout.open.every((v) => v === false), `Ressourcenkarten müssen eingeklappt starten: ${JSON.stringify(layout)}`);
    assert.ok(layout.heights.every((v) => v <= 70), `Karten sind nicht kompakt: ${JSON.stringify(layout)}`);
    assert.ok(layout.overflow <= 4 && layout.viewportOverflow <= 4, `Horizontaler Overflow: ${JSON.stringify(layout)}`);

    const collected = await cdp.eval(`(() => { const out=NexoWattOperatingStrategiesAppCenter.collect(window.__cfg.operatingStrategies,true,'eos'); return {mode:out.mode,takeover:out.controlTakeoverEnabled,writes:out.writeExecutionEnabled,links:out.resourceLinks,custom:out.customResources[0],rules:out.rules}; })()`);
    assert.equal(collected.mode, 'active');
    assert.equal(collected.takeover, true);
    assert.equal(collected.writes, true);
    const activeIds = ['storagefarm:1','evcs:lp1','thermal:1','heatingRod:1'];
    for (const id of activeIds) {
      const link = collected.links.find((row) => row.sourceId === id);
      assert.ok(link && link.writeEnabled === true && link.observeOnly === false, `Live-Link fehlt: ${id}`);
    }
    const generic = collected.links.find((row) => row.sourceId === 'flow-consumer:4');
    assert.ok(generic && generic.writeEnabled === false && generic.observeOnly === true);
    const stale = collected.links.find((row) => row.sourceId === 'thermal:2');
    assert.ok(stale && stale.enabled === false && stale.controlMode === 'observe' && stale.writeEnabled === false);
    assert.equal(collected.custom.controlMode, 'observe');
    assert.equal(collected.custom.commissioningConfirmed, false);
    assert.equal(collected.custom.writeEnabled, false);

    // Checkbox-Klick darf die kompakte Karte nicht zugleich öffnen.
    const clickResult = await cdp.eval(`(() => { const d=document.querySelector('#osExistingResources details'); const cb=d.querySelector('.nw-os-compact__check input'); cb.click(); return {open:d.open,checked:cb.checked}; })()`);
    assert.equal(clickResult.open, false);

    const exceptions = cdp.events.filter((event) => event.method === 'Runtime.exceptionThrown');
    assert.equal(exceptions.length, 0, `Browser-Ausnahmen: ${JSON.stringify(exceptions)}`);
    console.log('[rc56-operating-strategies-browser] OK: nur aktive Geräte, kompakte Karten, Live-Freigaben und Custom-DP-Sperre im Chromium-Test verifiziert.');
  } catch (error) {
    const tail = logs.join('').split(/\r?\n/).slice(-30).join('\n'); if (tail) console.error(tail); throw error;
  } finally {
    if (cdp) cdp.close(); try { browser.kill('SIGKILL'); } catch (_) {}
    await new Promise((resolve) => setTimeout(resolve, 200)); fs.rmSync(profile, { recursive: true, force: true });
  }
})().catch((error) => { console.error(error && error.stack ? error.stack : error); process.exit(1); });
