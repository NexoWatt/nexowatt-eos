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
assert.ok(CHROMIUM, 'Chromium/Chrome für den RC59-OCPP21-Zuordnungstest wurde nicht gefunden.');

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
  }
  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(String(event.data || '{}'));
      if (!msg.id || !this.pending.has(msg.id)) return;
      const pending = this.pending.get(msg.id);
      this.pending.delete(msg.id);
      if (msg.error) pending.reject(new Error(`${msg.error.code}: ${msg.error.message}`));
      else pending.resolve(msg.result || {});
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
  close() { try { this.ws.close(); } catch (_error) {} }
}

function discoveryConnector(station) {
  const root = `ocpp21.0.${station}`;
  return {
    stationKey: station,
    connectorNo: 1,
    base: root,
    name: station,
    telemetryProfile: 'nexowattocpp',
    controlPreference: 'powerW',
    contractVersion: 'nexowatt-ocpp21-0.4-native',
    energyTotalInputIsWh: false,
    ids: {
      powerId: `${root}.measurements.powerW`,
      energyTotalId: `${root}.measurements.energyKWh`,
      statusId: `${root}.info.status`,
      activeId: `${root}.transactions.transactionActive`,
      heartbeatId: `${root}.health.lastSeenMs`,
      onlineId: `${root}.info.socketConnected`,
      dataFreshId: `${root}.health.dataFresh`,
      setPowerWId: `${root}.control.chargeLimit`,
      enableWriteId: `${root}.control.availability`,
      vehicleSocId: `${root}.measurements.socPercent`,
      rfidReadId: `${root}.info.rfid`,
      currentId: `${root}.measurements.currentA`,
    },
  };
}

function inlineHtml() {
  let html = fs.readFileSync(path.join(WWW, 'ems-apps.html'), 'utf8');
  const css = fs.readFileSync(path.join(WWW, 'styles.css'), 'utf8');
  const js = fs.readFileSync(path.join(__dirname, '..', 'lib', 'evcs-electrical-limits.js'), 'utf8') + '\n' + fs.readFileSync(path.join(WWW, 'ems-apps.js'), 'utf8');
  const config = {
    license: { valid: true, ok: true, active: true, edition: 'eos', editionLabel: 'Pro', maxWallboxes: 50 },
    emsApps: { apps: { charging: { installed: true, enabled: true } } },
    settingsConfig: {
      evcsCount: 2,
      evcsMaxPowerKw: 50,
      evcsList: [
        {
          enabled: true,
          name: 'Modbus Ladepunkt',
          powerId: 'modbus.0.holdingRegisters.wallboxPower',
          statusId: 'modbus.0.holdingRegisters.wallboxStatus',
          setPowerWId: 'modbus.0.holdingRegisters.wallboxSetPower',
          enableWriteId: 'modbus.0.holdingRegisters.wallboxEnable',
          telemetryProfile: 'generic',
        },
        {
          enabled: true,
          name: 'OCPP Altzuordnung',
          powerId: 'alias.0.nexowatt.ocpp.0.CP_01.powerW',
          energyTotalId: 'alias.0.nexowatt.ocpp.0.CP_01.energyKWh',
          statusId: 'alias.0.nexowatt.ocpp.0.CP_01.status',
          activeId: 'alias.0.nexowatt.ocpp.0.CP_01.txActive',
          heartbeatId: 'ocpp21.0.CP_01.health.lastSeenMs',
          onlineId: 'alias.0.nexowatt.ocpp.0.CP_01.socketConnected',
          dataFreshId: 'alias.0.nexowatt.ocpp.0.CP_01.dataFresh',
          setPowerWId: 'alias.0.nexowatt.ocpp.0.CP_01.chargeLimit',
          enableWriteId: 'alias.0.nexowatt.ocpp.0.CP_01.availability',
          vehicleSocId: 'alias.0.nexowatt.ocpp.0.CP_01.soc',
          rfidReadId: 'alias.0.nexowatt.ocpp.0.CP_01.rfid',
          telemetryProfile: 'nexowattocpp',
        },
      ],
      stationGroups: [],
    },
    chargingManagement: { enabled: true, mode: 'auto' },
  };
  const discovery = {
    ok: true,
    discoveryContract: 'nexowatt-ocpp21-0.4-native',
    connectorCount: 2,
    connectors: [discoveryConnector('CP_01'), discoveryConnector('CP_02')],
  };
  const mock = `<script>
window.NW_AUTH={requireCapability:async()=>true};
window.confirm=()=>true;
window.alert=()=>{};
const __config=${JSON.stringify(config)};
const __discovery=${JSON.stringify(discovery)};
window.fetch=async function(url, options){
  const p=String(url||'');
  if(p.includes('/api/ocpp/discover')) return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(__discovery))};
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
  html = html.replace(/<\/body>/i, `${mock}<script>${js}</script></body>`);
  return html;
}

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-rc59-ocpp-map-'));
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
    const tree = await cdp.send('Page.getFrameTree');
    const frameId = tree.frameTree?.frame?.id;
    assert.ok(frameId, 'Chromium-Hauptrahmen fehlt.');
    await cdp.send('Page.setDocumentContent', { frameId, html: inlineHtml() });

    await waitFor(async () => cdp.eval(`!!document.getElementById('evcs_2_powerId')`), 30000, 'initiale Ladepunktzuordnung');
    const before = await cdp.eval(`(() => ({
      count:document.getElementById('evcsCount')?.value,
      modbus:document.getElementById('evcs_1_powerId')?.value,
      ocpp:document.getElementById('evcs_2_powerId')?.value
    }))()`);
    assert.equal(before.count, '2');
    assert.equal(before.modbus, 'modbus.0.holdingRegisters.wallboxPower');
    assert.equal(before.ocpp, 'alias.0.nexowatt.ocpp.0.CP_01.powerW');

    await cdp.eval(`document.getElementById('ocppMapExisting').click(); true`);
    const after = await waitFor(async () => {
      const state = await cdp.eval(`(() => ({
        count:document.getElementById('evcsCount')?.value,
        modbusPower:document.getElementById('evcs_1_powerId')?.value,
        modbusSet:document.getElementById('evcs_1_setPowerWId')?.value,
        cp1Power:document.getElementById('evcs_2_powerId')?.value,
        cp1Online:document.getElementById('evcs_2_onlineId')?.value,
        cp1Fresh:document.getElementById('evcs_2_dataFreshId')?.value,
        cp1Set:document.getElementById('evcs_2_setPowerWId')?.value,
        cp2Power:document.getElementById('evcs_3_powerId')?.value,
        cp2Set:document.getElementById('evcs_3_setPowerWId')?.value,
        status:document.getElementById('status')?.textContent || document.body.innerText
      }))()`);
      return state && state.count === '3' && state.cp2Power ? state : null;
    }, 30000, 'native OCPP21-Zuordnung');

    assert.equal(after.modbusPower, 'modbus.0.holdingRegisters.wallboxPower');
    assert.equal(after.modbusSet, 'modbus.0.holdingRegisters.wallboxSetPower');
    assert.equal(after.cp1Power, 'ocpp21.0.CP_01.measurements.powerW');
    assert.equal(after.cp1Online, 'ocpp21.0.CP_01.info.socketConnected');
    assert.equal(after.cp1Fresh, 'ocpp21.0.CP_01.health.dataFresh');
    assert.equal(after.cp1Set, 'ocpp21.0.CP_01.control.chargeLimit');
    assert.equal(after.cp2Power, 'ocpp21.0.CP_02.measurements.powerW');
    assert.equal(after.cp2Set, 'ocpp21.0.CP_02.control.chargeLimit');
    assert.match(after.status, /Fremde Ladepunkte wurden nicht überschrieben/);

    console.log('[rc59-ocpp21-mapping-browser] OK: Alias-Migration ist nativ, stationsgebunden und überschreibt keine fremden Ladepunkte.');
  } finally {
    if (cdp) cdp.close();
    try { browser.kill('SIGKILL'); } catch (_error) {}
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_error) {}
  }
})().catch((error) => {
  console.error('[rc59-ocpp21-mapping-browser] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
