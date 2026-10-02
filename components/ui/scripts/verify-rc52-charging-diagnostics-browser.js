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
assert.ok(CHROMIUM, 'Chromium/Chrome für den RC52-AppCenter-Test wurde nicht gefunden.');

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

function diagnosticsPayload() {
    const now = Date.now();
    return {
        ok: true,
        ts: now,
        config: {},
        wallboxes: {},
        stations: {},
        control: {},
        summary: {
            totalPowerW: 6900,
            totalReservedPowerW: 10400,
            totalTargetPowerW: 10400,
            totalTargetCurrentA: 15.1,
            onlineWallboxes: 2,
            lastUpdate: now,
        },
        safetyEnvelope: { valid: true, emergencyStop: false, generation: 17, timestamp: now },
        stageA: { status: 'inactive', summary: 'keine Sicherungsstufe A aktiv' },
        audit: {
            schemaVersion: 1,
            eventCount: 3,
            maxEvents: 240,
            lastEventTs: now,
            snapshot: {
                schemaVersion: 1,
                ts: now,
                mode: 'auto',
                budgetMode: 'bounded',
                status: 'running',
                activeLimiter: 'para14a',
                safetyStage: 'PARA14A-LIMIT',
                safetyActive: true,
                problemCount: 1,
                budgetW: 16000,
                actualPowerW: 6900,
                targetPowerW: 10400,
                reservedPowerW: 10400,
                remainingPowerW: 5600,
                grid: { importW: 7200, limitW: 50000, effectiveLimitW: 50000, evcsCapW: 22000, binding: false },
                phase: { evcsCapW: 18000, binding: false },
                para14a: { active: true, capW: 10500, binding: true },
                storageAssist: { active: true, requestedW: 1500, acceptedW: 1000 },
                safety: { valid: true, emergencyStop: false, invalidReason: '', generation: 17, timestamp: now },
                wallboxes: [
                    {
                        safe: 'lp1', name: 'AC Ladepunkt', mode: 'minpv', userMode: 'minpv', online: true,
                        enabled: true, controlAvailable: true, connected: true, vehicleDemandConfirmed: true,
                        charging: true, actualPowerW: 4100, requestedPowerW: 7200, requestedCurrentA: 10.4,
                        targetPowerW: 6200, targetCurrentA: 9.0, reservedPowerW: 6200, pvShareW: 2100,
                        storageShareW: 500, stationKey: '', stationRemainingW: null, limiter: 'para14a',
                        safetyBinding: 'para14a', safetyReason: 'LIMITED_BY_14A', reason: 'LIMITED_BY_14A',
                        applied: true, applyStatus: 'applied', setpointKey: 'cm.wb.lp1.setA',
                    },
                    {
                        safe: 'lp2', name: 'DC Schnelllader', mode: 'boost', userMode: 'boost', online: true,
                        enabled: true, controlAvailable: true, connected: true, vehicleDemandConfirmed: true,
                        charging: true, actualPowerW: 2800, requestedPowerW: 20000, requestedCurrentA: 0,
                        targetPowerW: 4200, targetCurrentA: 0, reservedPowerW: 4200, pvShareW: 2500,
                        storageShareW: 500, stationKey: 'dc-station', stationRemainingW: 400, limiter: 'station',
                        safetyBinding: 'station', safetyReason: 'LIMITED_BY_STATION_CAP', reason: 'LIMITED_BY_STATION_CAP',
                        applied: false, applyStatus: 'write_failed:no-readback', setpointKey: 'cm.wb.lp2.setW',
                    },
                ],
            },
            events: [
                { ts: now - 3000, type: 'global', severity: 'warn', safe: '', name: 'Lademanagement', mode: 'auto', actualPowerW: 6900, requestedPowerW: 10400, targetPowerW: 10400, targetCurrentA: 0, reservedPowerW: 10400, pvShareW: 0, limiter: 'para14a', reason: 'running', applyStatus: '', safetyStage: 'PARA14A-LIMIT' },
                { ts: now - 2000, type: 'wallbox', severity: 'info', safe: 'lp1', name: 'AC Ladepunkt', mode: 'minpv', actualPowerW: 4100, requestedPowerW: 7200, targetPowerW: 6200, targetCurrentA: 9.0, reservedPowerW: 6200, pvShareW: 2100, limiter: 'para14a', reason: 'LIMITED_BY_14A', applyStatus: 'applied', safetyStage: 'PARA14A-LIMIT' },
                { ts: now - 1000, type: 'wallbox', severity: 'error', safe: 'lp2', name: 'DC Schnelllader', mode: 'boost', actualPowerW: 2800, requestedPowerW: 20000, targetPowerW: 4200, targetCurrentA: 0, reservedPowerW: 4200, pvShareW: 2500, limiter: 'write-error', reason: 'write_failed:no-readback', applyStatus: 'write_failed:no-readback', safetyStage: 'WRITE-FAILSAFE' },
            ],
        },
    };
}

function inlineAppCenterHtml() {
    let html = fs.readFileSync(path.join(WWW, 'ems-apps.html'), 'utf8');
    const css = fs.readFileSync(path.join(WWW, 'styles.css'), 'utf8');
    const js = fs.readFileSync(path.join(__dirname, '..', 'lib', 'evcs-electrical-limits.js'), 'utf8') + '\n' + fs.readFileSync(path.join(WWW, 'ems-apps.js'), 'utf8');
    const auditJs = fs.readFileSync(path.join(WWW, 'charging-diagnostics-appcenter.js'), 'utf8');
    const diagnostics = diagnosticsPayload();
    const config = {
        license: { valid: true, ok: true, active: true, edition: 'eos', editionLabel: 'Pro', maxWallboxes: 50 },
        emsApps: { apps: { charging: { installed: true, enabled: true }, tariff: { installed: true, enabled: true } } },
        settingsConfig: {
            evcsCount: 2,
            evcsMaxPowerKw: 50,
            evcsList: [
                { enabled: true, name: 'AC Ladepunkt', type: 'AC', maxPowerKw: 11 },
                { enabled: true, name: 'DC Schnelllader', type: 'DC', maxPowerKw: 50 },
            ],
            stationGroups: [],
        },
        chargingManagement: { enabled: true, mode: 'auto' },
    };
    const mock = `<script>
window.NW_AUTH={requireCapability:async()=>true};
window.confirm=()=>true;
window.alert=()=>{};
window.__rc52ClearCalls=0;
const __diag=${JSON.stringify(diagnostics)};
const __config=${JSON.stringify(config)};
window.fetch=async function(url, options){
  const p=String(url||'');
  if(p.includes('/api/ems/charging/audit/clear')){window.__rc52ClearCalls++; __diag.audit.events=[]; __diag.audit.eventCount=0; return {ok:true,status:200,json:async()=>({ok:true,cleared:true})};}
  if(p.includes('/api/ems/charging/audit')) return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(__diag))};
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
    html = html.replace(/\s*<script[^>]+src="\/static\/[^\"]+"[^>]*><\/script>/gi, '');
    html = html.replace(/<\/body>/i, `${mock}<script>${js}</script><script>${auditJs}</script></body>`);
    return html;
}

(async () => {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-rc52-audit-'));
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

        await waitFor(async () => {
            return cdp.eval(`document.querySelector('.nw-tab[data-tab="evcs"]')?.style.display !== 'none'`);
        }, 25000, 'sichtbarer Ladepunkte-Tab');
        await cdp.eval(`document.querySelector('.nw-tab[data-tab="evcs"]').click(); true`);
        const loaded = await waitFor(async () => {
            const state = await cdp.eval(`(() => ({
              metrics:document.querySelectorAll('#chargingAuditSummary .nw-charging-audit__metric').length,
              cards:document.querySelectorAll('#chargingAuditWallboxes .nw-charging-audit__wallbox').length,
              events:document.querySelectorAll('#chargingAuditEvents tr').length,
              status:document.getElementById('chargingAuditStatus')?.textContent || '',
              text:document.getElementById('nw-tabpanel-evcs')?.innerText || ''
            }))()`);
            return state && state.cards === 2 && state.events >= 3 ? state : null;
        }, 25000, 'gerenderte Lademanagement-Diagnose');

        assert.ok(loaded.metrics >= 12, `zu wenige globale Diagnosemetriken: ${JSON.stringify(loaded)}`);
        assert.match(loaded.text, /NexoWatt Soll gesamt/);
        assert.match(loaded.text, /Sicherungsstufe/);
        assert.match(loaded.text, /AC Ladepunkt/);
        assert.match(loaded.text, /DC Schnelllader/);
        assert.match(loaded.text, /6\.20 kW/);
        assert.match(loaded.text, /20\.00 kW/);
        assert.match(loaded.text, /write_failed:no-readback/);
        assert.match(loaded.text, /§14a/);
        assert.match(loaded.text, /Stationsgrenze/);
        assert.match(loaded.text, /keine Station/);
        assert.match(loaded.status, /2 Ladepunkte/);

        const layout = await cdp.eval(`(() => {
          const section=document.querySelector('.nw-charging-audit').getBoundingClientRect();
          const cards=[...document.querySelectorAll('.nw-charging-audit__wallbox')].map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};});
          const overlaps=[]; for(let i=0;i<cards.length;i++) for(let j=i+1;j<cards.length;j++){const a=cards[i],b=cards[j];if(!(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top)) overlaps.push([i,j]);}
          return {section:{width:section.width,left:section.left,right:section.right},cards,overlaps,scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth};
        })()`);
        assert.deepEqual(layout.overlaps, [], `Diagnosekarten überlappen: ${JSON.stringify(layout)}`);
        assert.ok(layout.section.width > 1200, `Diagnosesektion nutzt Desktopbreite nicht: ${JSON.stringify(layout)}`);
        assert.ok(layout.scrollWidth <= layout.viewport + 4, `unnötiger horizontaler Seitenoverflow: ${JSON.stringify(layout)}`);

        await cdp.eval(`document.getElementById('chargingAuditOnlyProblems').click(); true`);
        const filtered = await cdp.eval(`document.querySelectorAll('#chargingAuditWallboxes .nw-charging-audit__wallbox').length`);
        assert.equal(filtered, 2, 'beide Test-Ladepunkte sind begrenzt/problematisch und müssen sichtbar bleiben');

        await cdp.eval(`document.getElementById('chargingAuditFilter').value='lp1'; document.getElementById('chargingAuditFilter').dispatchEvent(new Event('change',{bubbles:true})); true`);
        const oneCard = await cdp.eval(`document.querySelectorAll('#chargingAuditWallboxes .nw-charging-audit__wallbox').length`);
        assert.equal(oneCard, 1, 'Ladepunktfilter muss auf eine Karte reduzieren');

        await cdp.eval(`document.getElementById('clearChargingAudit').click(); true`);
        await waitFor(async () => (await cdp.eval(`window.__rc52ClearCalls`)) === 1, 5000, 'geschützter Clear-Aufruf');

        const exceptions = cdp.events.filter((row) => row.method === 'Runtime.exceptionThrown');
        assert.equal(exceptions.length, 0, `Browser-Ausnahmen im RC52-AppCenter-Test: ${JSON.stringify(exceptions)}`);
        console.log('[rc52-charging-diagnostics-browser] OK: AppCenter rendert globale Gates/Sicherungsstufe, 2 Ladepunkte mit Ist/Anforderung/NexoWatt-Soll/Reserve/PV/Write-Status, Ereignislog, Filter und Clear-Aktion ohne Überlappung.');
    } catch (error) {
        const tail = browserLog.join('').split(/\r?\n/).slice(-35).join('\n');
        if (tail) console.error('[rc52-charging-diagnostics-browser] Chromium-Log:\n' + tail);
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
