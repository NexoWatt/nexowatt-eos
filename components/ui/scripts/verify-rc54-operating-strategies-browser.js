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
assert.ok(CHROMIUM, 'Chromium/Chrome für den RC54-AppCenter-Test wurde nicht gefunden.');

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
    await new Promise((resolve) => setTimeout(resolve, 80));
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
      } else if (msg.method) this.events.push(msg);
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

function appConfig() {
  return {
    license: { valid: true, ok: true, active: true, edition: 'eos', editionLabel: 'Pro', maxWallboxes: 50 },
    emsApps: {
      apps: {
        operatingStrategies: { installed: true, enabled: true },
        storagefarm: { installed: true, enabled: true },
        storage: { installed: true, enabled: true },
        charging: { installed: true, enabled: true },
        thermal: { installed: true, enabled: true },
        heatingRod: { installed: true, enabled: true },
        tariff: { installed: true, enabled: true },
      },
    },
    operatingStrategies: {
      schemaVersion: 2,
      activeProfileId: 'winter',
      resourceLinks: [
        { sourceId: 'storagefarm:1', enabled: true, priority: 90, roleOverride: 'storage' },
        { sourceId: 'evcs:lp1', enabled: true, priority: 100, roleOverride: 'chargingPoint' },
        { sourceId: 'flow-consumer:1', enabled: true, priority: 90, roleOverride: 'cooling' },
        { sourceId: 'heatingRod:1', enabled: true, priority: 40, roleOverride: 'heatingRod' },
      ],
      profiles: [
        { id: 'winter', name: 'Winterbetrieb', enabled: true, season: 'winter', nightReserve: { enabled: true, storageResourceId: 'storagefarm:1', targetSocPct: 40, absoluteMinSocPct: 10, startMode: 'sunset', startTime: '18:00', endMode: 'sunrise', endTime: '07:00' } },
        { id: 'summer', name: 'Sommerbetrieb', enabled: true, season: 'summer', nightReserve: { enabled: true, storageResourceId: 'storagefarm:1', targetSocPct: 60, absoluteMinSocPct: 10, startMode: 'sunset', startTime: '18:00', endMode: 'sunrise', endTime: '07:00' } },
      ],
      rules: [],
    },
    storageFarm: {
      storages: [{
        name: 'Farm Speicher 1',
        socId: 'storage.farm.1.soc',
        signedPowerId: 'storage.farm.1.power',
        setSignedPowerId: 'storage.farm.1.setPower',
      }],
    },
    storage: {
      name: 'Einzelspeicher (darf nicht doppelt erscheinen)',
      datapoints: { socObjectId: 'storage.single.soc', targetPowerObjectId: 'storage.single.setPower' },
    },
    settingsConfig: {
      evcsCount: 2,
      evcsList: [
        {
          enabled: true,
          name: 'Auto Ladepunkt',
          userMode: 'auto',
          stationKey: 'station-a',
          connectorNo: 1,
          powerId: 'evcs.1.power',
          vehicleSocId: 'evcs.1.soc',
          setPowerWId: 'evcs.1.setPower',
        },
        {
          enabled: true,
          name: 'Boost Ladepunkt',
          userMode: 'boost',
          stationKey: 'station-a',
          connectorNo: 2,
          powerId: 'evcs.2.power',
          setPowerWId: 'evcs.2.setPower',
        },
      ],
      stationGroups: [],
    },
    datapoints: { consumer1Power: 'flow.consumer.1.power' },
    vis: {
      flowSlots: {
        consumers: [{
          name: 'Kühlhaus',
          consumerType: 'generic',
          ctrl: { switchWriteId: 'coldroom.enable', switchReadId: 'coldroom.running' },
        }],
      },
    },
    thermal: { devices: [{ name: 'Wärmepumpe', temperatureId: 'thermal.1.temp', runWriteId: 'thermal.1.run' }] },
    heatingRod: { devices: [{ name: 'Heizstab', stage1WriteId: 'rod.stage1' }] },
    chargingManagement: { enabled: true, mode: 'auto' },
  };
}

function inlineAppCenterHtml() {
  let html = fs.readFileSync(path.join(WWW, 'ems-apps.html'), 'utf8');
  const css = fs.readFileSync(path.join(WWW, 'styles.css'), 'utf8');
  const builderJs = fs.readFileSync(path.join(WWW, 'operating-strategies-rule-builder.js'), 'utf8');
  const appJs = fs.readFileSync(path.join(WWW, 'operating-strategies-appcenter.js'), 'utf8');
  const emsJs = fs.readFileSync(path.join(__dirname, '..', 'lib', 'evcs-electrical-limits.js'), 'utf8') + '\n' + fs.readFileSync(path.join(WWW, 'ems-apps.js'), 'utf8');
  const config = appConfig();
  const mock = `<script>
window.NW_AUTH={requireCapability:async()=>true};
window.confirm=()=>true;
window.alert=()=>{};
window.__rc54HardwareWrites=0;
window.__rc54InstallerPosts=0;
window.__rc54LastPatch=null;
const __config=${JSON.stringify(config)};
window.fetch=async function(url, options){
  const p=String(url||'');
  const method=String(options&&options.method||'GET').toUpperCase();
  if(/\\/api\\/(?:state|object)\\/set|setForeignState|write/i.test(p)){window.__rc54HardwareWrites++;}
  if(p.includes('/api/installer/config') && method==='POST'){
    window.__rc54InstallerPosts++;
    try{window.__rc54LastPatch=JSON.parse(String(options&&options.body||'{}')).patch||null;}catch(_e){}
    return {ok:true,status:200,json:async()=>({ok:true,config:JSON.parse(JSON.stringify(__config)),license:__config.license})};
  }
  if(p.includes('/api/installer/config')) return {ok:true,status:200,json:async()=>({ok:true,config:JSON.parse(JSON.stringify(__config)),license:__config.license})};
  if(p.includes('/api/license/info')) return {ok:true,status:200,json:async()=>({ok:true,...__config.license})};
  if(p.includes('/api/session/me')) return {ok:true,status:200,json:async()=>({ok:true,authed:true,role:'installer',capabilities:['*','appcenter.open']})};
  if(p.includes('/api/state')) return {ok:true,status:200,json:async()=>({ok:true,states:{}})};
  if(p.includes('/api/backup')||p.includes('/api/installer/backup')) return {ok:true,status:200,json:async()=>({ok:true,exists:false,backups:[]})};
  if(p.includes('/api/object')) return {ok:true,status:200,json:async()=>({ok:true,items:[],nodes:[],results:[]})};
  return {ok:true,status:200,json:async()=>({ok:true,config:{},items:[],list:[],devices:[],stations:[],states:{}})};
};
</script>`;
  html = html.replace(/<link[^>]+href="\/static\/styles\.css"[^>]*>/i, `<style>${css}</style>`);
  html = html.replace(/\s*<script[^>]+src="\/static\/[^"]+"[^>]*><\/script>/gi, '');
  html = html.replace(/<\/body>/i, `${mock}<script>${builderJs}</script><script>${appJs}</script><script>${emsJs}</script></body>`);
  return html;
}

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-rc54-strategies-'));
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
    await waitFor(() => fs.existsSync(portFile), 15000, 'Chromium DevToolsActivePort');
    const debugPort = Number(fs.readFileSync(portFile, 'utf8').split(/\r?\n/)[0]);
    const target = await waitFor(async () => {
      const rows = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
      return rows.find((row) => row.type === 'page') || null;
    }, 15000, 'Chromium Browser-Target');
    cdp = new CdpClient(target.webSocketDebuggerUrl);
    await cdp.open();
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');
    await cdp.send('Log.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
    const tree = await cdp.send('Page.getFrameTree');
    const frameId = tree.frameTree?.frame?.id;
    assert.ok(frameId, 'Chromium-Hauptrahmen fehlt.');
    await cdp.send('Page.setDocumentContent', { frameId, html: inlineAppCenterHtml() });

    await waitFor(async () => cdp.eval(`document.querySelector('.nw-tab[data-tab="strategies"]')?.style.display !== 'none'`), 25000, 'sichtbarer Betriebsstrategien-Tab');
    await cdp.eval(`document.querySelector('.nw-tab[data-tab="strategies"]').click(); true`);

    const loaded = await waitFor(async () => {
      const state = await cdp.eval(`(() => ({
        root:!!document.getElementById('nwOperatingStrategiesRoot'),
        resources:document.querySelectorAll('#osExistingResources .nw-os-resource').length,
        profiles:document.querySelectorAll('#osProfiles .nw-os-profile').length,
        builder:!!window.NexoWattOperatingStrategiesRuleBuilder,
        text:document.getElementById('nw-tabpanel-strategies')?.innerText||''
      }))()`);
      return state && state.root && state.builder && state.resources >= 6 && state.profiles === 2 ? state : null;
    }, 25000, 'gerenderte RC54-Betriebsstrategien-App');

    assert.match(loaded.text, /Regelbaukasten und sicherer Trockenlauf/i);
    assert.match(loaded.text, /0 Hardware-Schreibbefehle/);
    assert.match(loaded.text, /Ladepunkte später nur in Auto/);
    assert.match(loaded.text, /Manuell, Boost, PV-Überschuss, Min\+PV und Zeit-Ziel/);
    assert.match(loaded.text, /Regelbausteine und Prioritätskaskade/);
    assert.match(loaded.text, /Trockenlauf \/ Simulation/);
    assert.match(loaded.text, /Farm Speicher 1/);
    assert.doesNotMatch(loaded.text, /Einzelspeicher \(darf nicht doppelt erscheinen\)/);
    assert.match(loaded.text, /Auto Ladepunkt/);
    assert.match(loaded.text, /Boost Ladepunkt/);
    assert.match(loaded.text, /Kühlhaus/);
    assert.match(loaded.text, /Wärmepumpe/);
    assert.match(loaded.text, /Heizstab/);

    const reserveValues = await cdp.eval(`[...document.querySelectorAll('[data-os-profile-reserve-field="targetSocPct"]')].map(el=>Number(el.value))`);
    assert.deepEqual(reserveValues, [40, 60], `Winter-/Sommerreserve falsch: ${JSON.stringify(reserveValues)}`);
    const reserveStorage = await cdp.eval(`document.querySelector('[data-os-profile-reserve-field="storageResourceId"]')?.value`);
    assert.equal(reserveStorage, 'storagefarm:1');

    const roleValues = await cdp.eval(`(() => ({
      storage:document.querySelector('[data-os-link-role="storagefarm:1"]')?.value,
      charging:document.querySelector('[data-os-link-role="evcs:lp1"]')?.value,
      cooling:document.querySelector('[data-os-link-role="flow-consumer:1"]')?.value,
      rod:document.querySelector('[data-os-link-role="heatingRod:1"]')?.value
    }))()`);
    assert.deepEqual(roleValues, { storage: 'storage', charging: 'chargingPoint', cooling: 'cooling', rod: 'heatingRod' });

    await cdp.eval(`document.getElementById('osAddCustomerExample').click(); true`);
    await waitFor(async () => (await cdp.eval(`document.querySelectorAll('#osRules .nw-os-rule').length`)) === 5, 8000, 'fünf Kundenbeispiel-Regeln');

    const rulesUi = await cdp.eval(`(() => ({
      cards:document.querySelectorAll('#osRules .nw-os-rule').length,
      conditions:document.querySelectorAll('#osRules .nw-os-condition').length,
      daily:document.querySelectorAll('[data-os-rule-schedule-field="mode"] option[value="dailyTime"]:checked').length,
      cascade:document.querySelectorAll('.nw-os-cascade__row').length,
      text:document.getElementById('osRules')?.innerText||''
    }))()`);
    assert.equal(rulesUi.cards, 5);
    assert.ok(rulesUi.conditions >= 8, `Bedingungen fehlen: ${JSON.stringify(rulesUi)}`);
    assert.ok(rulesUi.daily >= 1, 'Kühlhausregel besitzt keinen täglichen 19-Uhr-Zeitplan');
    assert.equal(rulesUi.cascade, 5);
    assert.match(rulesUi.text, /Fahrzeug: 70 % bis 12:00 Uhr/);
    assert.match(rulesUi.text, /Kühlhaus: sichere Nachtpause/);
    assert.match(rulesUi.text, /MUSS/);
    assert.match(rulesUi.text, /SOLL/);
    assert.match(rulesUi.text, /KANN/);

    await cdp.eval(`document.getElementById('osLoadDemoScenario').click(); true`);
    await waitFor(async () => (await cdp.eval(`document.querySelector('[data-os-simulation-field="nowLocal"]')?.value?.includes('T19:00')`)) === true, 5000, 'geladene Simulationswerte');
    await cdp.eval(`document.getElementById('osRunSimulation').click(); true`);

    const simulationUi = await waitFor(async () => {
      const state = await cdp.eval(`(() => ({
        decisions:document.querySelectorAll('#osSimulationResult .nw-os-decision').length,
        selected:document.querySelectorAll('#osSimulationResult .nw-os-rule-badge--ready').length,
        text:document.getElementById('osSimulationResult')?.innerText||'',
        writes:window.__rc54HardwareWrites,
        result:window.NexoWattOperatingStrategiesRuleBuilder.getLastSimulationResult()
      }))()`);
      return state && state.decisions >= 6 ? state : null;
    }, 8000, 'sichtbares Simulationsergebnis');

    assert.equal(simulationUi.writes, 0, 'Trockenlauf darf keinen Hardware-Schreibpfad aufrufen');
    assert.match(simulationUi.text, /Hardware-Schreibvorgänge: 0/);
    assert.match(simulationUi.text, /Nachtenergie-Reserve/);
    assert.match(simulationUi.text, /Fahrzeug: 70 % bis 12:00 Uhr/);
    assert.match(simulationUi.text, /Kühlhaus: sichere Nachtpause/);
    assert.equal(simulationUi.result.hardwareWrites, 0);
    assert.equal(simulationUi.result.simulationOnly, true);
    assert.ok(simulationUi.result.selectedRequests.length >= 2);
    assert.ok(simulationUi.result.decisions.some((row) => row.ruleType === 'nightReserve'));
    assert.ok(simulationUi.result.decisions.some((row) => row.name.includes('Kühlhaus') && row.status === 'request'));

    const collected = await cdp.eval(`(() => {
      const out=window.NexoWattOperatingStrategiesAppCenter.collect({},true,'eos');
      return {
        schemaVersion:out.schemaVersion,
        enabled:out.enabled,
        mode:out.mode,
        takeover:out.controlTakeoverEnabled,
        writes:out.writeExecutionEnabled,
        rules:out.rules,
        simulation:out.simulation,
        links:out.resourceLinks,
        contract:out.controlContract,
        hardwareWrites:window.__rc54HardwareWrites
      };
    })()`);
    assert.equal(collected.schemaVersion, 3);
    assert.equal(collected.enabled, true);
    assert.equal(collected.mode, 'observe');
    assert.equal(collected.takeover, false);
    assert.equal(collected.writes, false);
    assert.equal(collected.contract.chargingScope, 'auto-only');
    assert.equal(collected.contract.existingChargingModesUntouched, true);
    assert.equal(collected.rules.length, 5);
    assert.ok(collected.rules.every((row) => row.simulationOnly === true && row.executionEnabled === false));
    assert.ok(collected.links.every((row) => row.observeOnly === true && row.writeEnabled === false));
    assert.equal(collected.hardwareWrites, 0);

    const layout = await cdp.eval(`(() => {
      const root=document.getElementById('nwOperatingStrategiesRoot');
      const rr=root.getBoundingClientRect();
      return {root:{width:rr.width,scrollWidth:root.scrollWidth,clientWidth:root.clientWidth},pageScroll:document.documentElement.scrollWidth,viewport:innerWidth};
    })()`);
    assert.ok(layout.root.width > 1100, `App nutzt Desktopbreite nicht: ${JSON.stringify(layout)}`);
    assert.ok(layout.root.scrollWidth <= layout.root.clientWidth + 4, `Betriebsstrategien-App hat horizontalen Overflow: ${JSON.stringify(layout)}`);
    assert.ok(layout.pageScroll <= layout.viewport + 4, `Seite hat horizontalen Overflow: ${JSON.stringify(layout)}`);

    const exceptions = cdp.events.filter((row) => row.method === 'Runtime.exceptionThrown');
    assert.equal(exceptions.length, 0, `Browser-Ausnahmen im RC54-AppCenter-Test: ${JSON.stringify(exceptions)}`);
    console.log('[rc54-operating-strategies-browser] OK: Regelbaukasten, Strategierollen, Kundenkaskade, Nachtreserve und schreibfreier Trockenlauf in Chromium geprüft.');
  } catch (error) {
    const tail = browserLog.join('').split(/\r?\n/).slice(-35).join('\n');
    if (tail) console.error('[rc54-operating-strategies-browser] Chromium-Log:\n' + tail);
    throw error;
  } finally {
    if (cdp) cdp.close();
    try { browser.kill('SIGKILL'); } catch (_) {}
    await new Promise((resolve) => setTimeout(resolve, 250));
    fs.rmSync(profile, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
