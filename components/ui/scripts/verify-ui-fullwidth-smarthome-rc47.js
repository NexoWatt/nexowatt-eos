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
assert.ok(CHROMIUM, 'Chromium/Chrome für den RC47-UI-Test wurde nicht gefunden.');

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

function inlineLogicHtml() {
  let html = fs.readFileSync(path.join(WWW, 'logic.html'), 'utf8');
  const css = fs.readFileSync(path.join(WWW, 'styles.css'), 'utf8');
  const logic = fs.readFileSync(path.join(WWW, 'logic.js'), 'utf8');
  const config = { version: 1, graphs: [{ id: 'main', name: 'RC47', enabled: true, board: { w: 2400, h: 1400 }, nodes: [], links: [] }] };
  const mock = `<script>
window.fetch = async function(url) {
  const p = String(url || '');
  if (p.includes('/api/logic/editor')) return { ok:true, status:200, json:async()=>({ ok:true, config:${JSON.stringify(config)} }) };
  if (p.includes('/api/logic/blocks')) return { ok:true, status:200, json:async()=>({ ok:true, blocks:[] }) };
  if (p.includes('/api/auth/status')) return { ok:true, status:200, json:async()=>({ ok:true, enabled:false, authed:false, role:'customer', capabilities:[] }) };
  if (p.includes('/config')) return { ok:true, status:200, json:async()=>({ featureVisibility:{ hasSmartHome:true, hasStorageFarm:false }, settingsConfig:{} }) };
  return { ok:true, status:200, json:async()=>({ ok:true }) };
};
window.confirm=()=>true; window.prompt=(_m,v)=>v||'';
</script>`;
  html = html.replace(/<link[^>]+href="\/static\/styles\.css"[^>]*>/i, `<style>${css}</style>`);
  html = html.replace(/\s*<script[^>]+src="\/static\/(?:auth|nw-i18n|cockpit-shell|nw-shell)\.js"[^>]*><\/script>/gi, '');
  html = html.replace(/<script[^>]+src="\/static\/logic\.js"[^>]*><\/script>/i, `${mock}<script>${logic}</script>`);
  return html;
}

function smartHomeDevices() {
  const ready = { status: 'ready' };
  return [
    { id:'sw1', alias:'Deckenlicht', type:'switch', room:'Wohnzimmer', roomId:'room1', function:'Licht', quality:ready, state:{on:true}, io:{switch:{readId:'dp.sw.r',writeId:'dp.sw.w'}}, behavior:{} },
    { id:'dim1', alias:'Pendelleuchte', type:'dimmer', room:'Wohnzimmer', roomId:'room1', function:'Licht', quality:ready, state:{on:true,level:64}, io:{switch:{readId:'dp.dim.on',writeId:'dp.dim.on'},level:{readId:'dp.dim.level',writeId:'dp.dim.level',min:0,max:100,step:5}}, behavior:{} },
    { id:'color1', alias:'Ambientebeleuchtung', type:'color', room:'Wohnzimmer', roomId:'room1', function:'Licht', quality:ready, state:{on:true,level:72,color:'#ff9f43'}, io:{switch:{readId:'dp.color.on',writeId:'dp.color.on'},level:{readId:'dp.color.level',writeId:'dp.color.level'},color:{readId:'dp.color.rgb',writeId:'dp.color.rgb'}}, behavior:{} },
    { id:'blind1', alias:'Jalousie Süd', type:'blind', room:'Wohnzimmer', roomId:'room1', function:'Beschattung', quality:ready, state:{position:42,moving:false,locked:false,windAlarm:false,rainAlarm:false,frostAlarm:false}, io:{cover:{positionReadId:'dp.blind.pos',positionWriteId:'dp.blind.pos',upId:'dp.blind.up',stopId:'dp.blind.stop',downId:'dp.blind.down'}}, behavior:{} },
    { id:'rtr1', alias:'Raumklima', type:'rtr', room:'Wohnzimmer', roomId:'room1', function:'Klima', quality:ready, state:{power:true,currentTemp:21.6,setpoint:22.0,mode:'Auto',fanSpeed:'2',windowOpen:false,climateError:false}, io:{climate:{currentTempId:'dp.rtr.temp',setpointId:'dp.rtr.sp',modeId:'dp.rtr.mode',fanSpeedId:'dp.rtr.fan'}}, ui:{unit:'°C',precision:1}, behavior:{} },
    { id:'scene1', alias:'Abendstimmung', type:'scene', room:'Wohnzimmer', roomId:'room1', function:'Szene', quality:ready, state:{active:false}, io:{switch:{writeId:'dp.scene'}}, behavior:{commandMode:'momentary'} },
    { id:'sensor1', alias:'Luftfeuchtigkeit', type:'sensor', room:'Wohnzimmer', roomId:'room1', function:'Sensor', quality:ready, state:{value:47.3}, io:{sensor:{readId:'dp.humidity'}}, ui:{unit:'%',precision:1}, behavior:{readOnly:true} },
    { id:'player1', alias:'Wohnzimmer Audio', type:'player', room:'Wohnzimmer', roomId:'room1', function:'Audio', quality:ready, state:{power:true,playing:true,volume:36,title:'NexoWatt Radio',artist:'Live',source:'Webradio',muted:false}, io:{player:{powerWriteId:'dp.player.power',playId:'dp.player.play',pauseId:'dp.player.pause',volumeWriteId:'dp.player.volume'}}, behavior:{} },
    { id:'camera1', alias:'Eingangskamera', type:'camera', room:'Wohnzimmer', roomId:'room1', function:'Sicherheit', quality:ready, state:{}, io:{camera:{snapshotUrl:''}}, behavior:{readOnly:true} },
    { id:'widget1', alias:'Wetterübersicht', type:'widget', room:'Wohnzimmer', roomId:'room1', function:'Information', quality:ready, state:{}, io:{widget:{openUrl:'https://example.invalid'}}, behavior:{readOnly:true} },
  ];
}

function inlineSmartHomeHtml() {
  let html = fs.readFileSync(path.join(WWW, 'smarthome.html'), 'utf8');
  const css = fs.readFileSync(path.join(WWW, 'styles.css'), 'utf8');
  const js = fs.readFileSync(path.join(WWW, 'smarthome.js'), 'utf8');
  const cfg = {
    floors:[{ id:'floor1', name:'Erdgeschoss', order:1 }],
    rooms:[{ id:'room1', name:'Wohnzimmer', floorId:'floor1', order:1 }],
    functions:[],
    pages:[{ id:'devices', title:'Alle Geräte', viewMode:'rooms', roomIds:[], funcIds:[], types:[], favoritesOnly:false, order:0 }],
  };
  const devices = smartHomeDevices();
  const mock = `<script>
window.fetch = async function(url, options) {
  const p=String(url||'');
  if (p.includes('/api/smarthome/config')) return {ok:true,status:200,json:async()=>({ok:true,config:${JSON.stringify(cfg)}})};
  if (p.includes('/api/smarthome/devices')) return {ok:true,status:200,json:async()=>({ok:true,devices:${JSON.stringify(devices)}})};
  if (p.includes('/config')) return {ok:true,status:200,json:async()=>({featureVisibility:{hasSmartHome:true,hasStorageFarm:false},settingsConfig:{}})};
  return {ok:true,status:200,json:async()=>({ok:true,state:{}})};
};
</script>`;
  html = html.replace(/<link[^>]+href="\/static\/styles\.css"[^>]*>/i, `<style>${css}</style>`);
  html = html.replace(/\s*<script[^>]+src="\/static\/(?:nw-i18n|cockpit-shell|nw-shell)\.js"[^>]*><\/script>/gi, '');
  html = html.replace(/<script[^>]+src="\/static\/smarthome\.js"[^>]*><\/script>/i, `${mock}<script>${js}</script>`);
  return html;
}

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-ui-rc47-'));
  const browserLog = [];
  const browser = spawn(CHROMIUM, [
    '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--disable-background-networking','--disable-component-update','--disable-default-apps',
    '--disable-extensions','--no-first-run','--remote-debugging-port=0',
    `--user-data-dir=${profile}`,'about:blank',
  ], { stdio:['ignore','pipe','pipe'] });
  browser.stdout.on('data',(c)=>browserLog.push(String(c)));
  browser.stderr.on('data',(c)=>browserLog.push(String(c)));

  let cdp;
  try {
    const portFile = path.join(profile,'DevToolsActivePort');
    await waitFor(()=>fs.existsSync(portFile),15000,'Chromium DevToolsActivePort');
    const debugPort = Number(fs.readFileSync(portFile,'utf8').split(/\r?\n/)[0]);
    const target = await waitFor(async()=>{
      const rows = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
      return rows.find((row)=>row.type==='page')||null;
    },15000,'Chromium Browser-Target');
    cdp = new CdpClient(target.webSocketDebuggerUrl);
    await cdp.open();
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');
    await cdp.send('Log.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride',{width:2048,height:1100,deviceScaleFactor:1,mobile:false});
    const tree = await cdp.send('Page.getFrameTree');
    const frameId = tree.frameTree?.frame?.id;
    assert.ok(frameId,'Chromium-Hauptrahmen fehlt.');

    await cdp.send('Page.setDocumentContent',{frameId,html:inlineLogicHtml()});
    await waitFor(async()=>{
      const status = await cdp.eval(`document.getElementById('nw-le-status')?.textContent || ''`);
      return /Bereit/.test(status) ? status : null;
    },20000,'vollständig geladener NexoLogic-Editor');
    const logicLayout = await cdp.eval(`(() => {
      const pick=(sel)=>{const r=document.querySelector(sel)?.getBoundingClientRect(); return r?{left:r.left,right:r.right,width:r.width,top:r.top,bottom:r.bottom,height:r.height}:null};
      return { viewport:innerWidth, main:pick('main.nw-logic-page'), editor:pick('.nw-le'), palette:pick('.nw-le__palette'), workspace:pick('.nw-le__workspace'), inspector:pick('.nw-le__inspector') };
    })()`);
    assert.ok(logicLayout.main.left <= 8, `NexoLogic beginnt nicht am linken Viewportrand: ${JSON.stringify(logicLayout)}`);
    assert.ok(logicLayout.main.right >= logicLayout.viewport - 8, `NexoLogic nutzt rechts nicht den Viewport: ${JSON.stringify(logicLayout)}`);
    assert.ok(logicLayout.workspace.width >= 1300, `NexoLogic-Arbeitsfläche ist auf 2048 px zu schmal: ${JSON.stringify(logicLayout)}`);
    assert.ok(logicLayout.editor.width >= logicLayout.viewport - 28, `NexoLogic-Editor ist nicht Full-Bleed: ${JSON.stringify(logicLayout)}`);

    await cdp.send('Page.setDocumentContent',{frameId,html:inlineSmartHomeHtml()});
    const smart = await waitFor(async()=>{
      const state = await cdp.eval(`(() => ({ count:document.querySelectorAll('.nw-sh-tile').length, empty:document.getElementById('nw-smarthome-empty')?.textContent || '' }))()`);
      return state && state.count >= 10 ? state : null;
    },20000,'SmartHome-Gerätekacheln');
    assert.equal(smart.count,10);

    const shLayout = await cdp.eval(`(() => {
      const main=document.querySelector('main.nw-smarthome-page').getBoundingClientRect();
      const tiles=[...document.querySelectorAll('.nw-sh-tile')].map((el)=>{const r=el.getBoundingClientRect(); const cs=getComputedStyle(el); return {cls:el.className,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,borderRadius:cs.borderRadius,boxShadow:cs.boxShadow};});
      const icons=[...document.querySelectorAll('.nw-sh-icon')].map((el)=>{const r=el.getBoundingClientRect();return {w:r.width,h:r.height};});
      const types=[...new Set(tiles.map((row)=>(row.cls.match(/nw-sh-tile--type-([^ ]+)/)||[])[1]).filter(Boolean))];
      const overlaps=[];
      for(let i=0;i<tiles.length;i++) for(let j=i+1;j<tiles.length;j++){const a=tiles[i],b=tiles[j]; if(!(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top)) overlaps.push([i,j]);}
      return { viewport:innerWidth, main:{left:main.left,right:main.right,width:main.width}, tiles, icons, types, overlaps, bodyScrollWidth:document.documentElement.scrollWidth };
    })()`);
    assert.ok(shLayout.main.left <= 12, `SmartHome beginnt nicht nahezu am linken Viewportrand: ${JSON.stringify(shLayout.main)}`);
    assert.ok(shLayout.main.right >= shLayout.viewport - 12, `SmartHome nutzt rechts nicht den Viewport: ${JSON.stringify(shLayout.main)}`);
    assert.deepEqual(shLayout.overlaps,[],`SmartHome-Kacheln überlappen: ${JSON.stringify(shLayout.overlaps)}`);
    assert.ok(shLayout.tiles.every((row)=>row.height >= 170),`SmartHome-Kacheln sind nicht als klare Bedienkarten ausgeführt: ${JSON.stringify(shLayout.tiles.map(r=>r.height))}`);
    assert.ok(shLayout.icons.every((row)=>row.w >= 42 && row.h >= 42),`SmartHome-Icons sind nicht einheitlich groß: ${JSON.stringify(shLayout.icons)}`);
    for(const type of ['switch','dimmer','color','blind','rtr','scene','sensor','player','camera','widget']) assert.ok(shLayout.types.includes(type),`SmartHome-Kacheltyp fehlt: ${type}`);
    assert.ok(shLayout.tiles.every((row)=>/22px/.test(row.borderRadius)),`Kachelradien sind nicht vereinheitlicht: ${JSON.stringify(shLayout.tiles.map(r=>r.borderRadius))}`);
    assert.ok(shLayout.tiles.every((row)=>row.boxShadow && row.boxShadow !== 'none'), 'SmartHome-Bedienkarten besitzen keine visuelle Tiefen-/Statusdarstellung.');
    assert.ok(shLayout.bodyScrollWidth <= shLayout.viewport + 2, `SmartHome erzeugt unnötigen horizontalen Overflow: ${JSON.stringify(shLayout)}`);

    const exceptions = cdp.events.filter((row)=>row.method==='Runtime.exceptionThrown');
    assert.equal(exceptions.length,0,`Browser-Ausnahmen im RC47-UI-Test: ${JSON.stringify(exceptions)}`);
    console.log('[ui-fullwidth-smarthome-rc47] OK: NexoLogic nutzt die gesamte Desktopbreite; alle 10 SmartHome-Kacheltypen rendern als einheitliche, überlappungsfreie Bedienkarten.');
  } catch (error) {
    const tail = browserLog.join('').split(/\r?\n/).slice(-30).join('\n');
    if (tail) console.error('[ui-fullwidth-smarthome-rc47] Chromium-Log:\n'+tail);
    throw error;
  } finally {
    if (cdp) cdp.close();
    try { browser.kill('SIGKILL'); } catch (_) {}
    await new Promise((resolve)=>setTimeout(resolve,250));
    fs.rmSync(profile,{recursive:true,force:true});
  }
})().catch((error)=>{ console.error(error && error.stack ? error.stack : error); process.exit(1); });
