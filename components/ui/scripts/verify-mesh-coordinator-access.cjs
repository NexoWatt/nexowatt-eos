'use strict';
// Reale Express-Routen und optional ausgelieferter React-Build. ioBroker und
// lokale Messungen sind Fixtures; keine Hardware, externen Konten oder Tailnets.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const Module = require('node:module');
const assert = require('node:assert/strict');
const C = require('../lib/mesh-coordinator-contract');
const { MeshCoordinator } = require('../lib/mesh-coordinator');
const filename = path.join(__dirname, 'verify-stable-1.0.9-access.cjs');
const harnessModule = new Module(filename, module); harnessModule.filename = filename; harnessModule.paths = Module._nodeModulePaths(__dirname);
const source = fs.readFileSync(filename, 'utf8');
harnessModule._compile(source.slice(0, source.indexOf('async function verify()')) + '\nmodule.exports = { createHarness };', filename);
const { createHarness } = harnessModule.exports;
async function main() {
  for (const authEnabled of [true, false]) {
    const h = await createHarness({ authEnabled });
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-mesh-access-'));
    h.adapter._meshCoordinator = new MeshCoordinator(h.adapter, { directory, systemSecret: 'local-test-system-secret' });
    await h.adapter._meshCoordinator.init();
    try {
      const admin = await h.login('admin'), installer = await h.login('installer');
      h.adapter._nwCentralLicense = { isAllowed: () => true,
        getStatus: () => ({ valid: true, edition: 'pro', features: ['energy', 'wallet', 'smartHome', 'microgridMaster'], limits: { chargePoints: 99, batteries: 10 } }) };
      h.adapter.config.emsApps = { apps: { meshMicrogrid: { installed: false, enabled: false } } };
      const app = h.adapter.config.emsApps.apps.meshMicrogrid;
      h.adapter._authSessions.set('old-customer', { role: 'customer', capabilities: ['*'], exp: Date.now() + 60000 });
      for (const [token, expected] of [[undefined, 401], ['old-customer', 401]]) {
        for (const url of ['/api/mesh/coordinator', '/api/mesh/coordinator/accounting', '/mesh-setup/', '/ems/microgrid/']) assert.equal((await h.request(url, { token })).status, expected, `${authEnabled}/${url}`);
        for (const url of ['/api/mesh/coordinator/config', '/api/mesh/coordinator/pair', '/api/mesh/coordinator/operating', '/api/mesh/coordinator/accounting', '/api/mesh/coordinator/accounting/report', '/api/mesh/coordinator/accounting/records', '/api/mesh/coordinator/exchange', '/api/mesh/coordinator/energy']) assert.equal((await h.request(url, { token, method: 'POST', body: {} })).status, expected);
      }
      for (const url of ['/api/mesh/coordinator', '/api/mesh/coordinator/accounting', '/ems/microgrid/', '/mesh-setup/', '/mesh/microgrid', '/static/mesh-microgrid.html', '/api/mesh/microgrid']) {
        assert.equal((await h.request(url, {token:installer})).status, 404, 'Uninstall: ' + url);
      }
      for (const url of ['/api/mesh/coordinator/config', '/api/mesh/coordinator/pair', '/api/mesh/coordinator/accounting']) assert.equal((await h.request(url, {token:installer,method:'POST',body:{}})).status,404);
      // The integrated login boundary applies before these legacy protocol
      // handlers too. Their HMAC/size/lifecycle rules remain tested after login;
      // this fixture does not enable unattended mesh control in the preview.
      assert.equal((await h.request('/api/mesh/coordinator/exchange',{token:installer,method:'POST',body:{}})).status,404);
      assert.equal((await h.request('/api/mesh/coordinator/energy',{token:installer,method:'POST',body:{}})).status,404);
      await h.adapter._meshCoordinator.start(); assert.equal(h.adapter._meshCoordinator.started, false);
      app.installed = true;
      assert.equal((await h.request('/api/mesh/coordinator',{token:installer})).status,200);
      assert.equal((await h.request('/api/mesh/coordinator/exchange',{token:installer,method:'POST',body:{}})).status,404);
      for (const url of ['/api/mesh/command/receive','/api/mesh/local-bridge/release','/api/mesh/peer/fieldtest','/api/mesh/microgrid/command']) {
        assert.equal((await h.request(url,{token:installer,method:'POST',body:{}})).status,423,'Inaktive Legacy-App: '+url);
      }
      app.enabled = true;
      for (const token of [admin, installer]) assert.equal((await h.request('/api/mesh/coordinator', { token })).status, 200);
      const c=C.defaultConfig();Object.assign(c,{role:'master',nodeId:'master',masterId:'master',siteId:'site'});
      c.allocation.strategy='transformer';
      c.nodes=Array.from({length:99},(_,i)=>({id:`haus_${i}`,max:{...C.ZERO},fallback:{...C.ZERO},weight:1}));
      assert.equal((await h.request('/api/mesh/coordinator/config',{token:installer,method:'POST',body:{config:c}})).status,200);
      for (const url of ['/api/mesh/command/receive','/api/mesh/local-bridge/release','/api/mesh/peer/fieldtest','/api/mesh/microgrid/command']) {
        assert.equal((await h.request(url,{token:installer,method:'POST',body:{}})).status,409,'Koordinator besitzt Regelung: '+url);
      }
      const pair=await h.request('/api/mesh/coordinator/pair',{token:installer,method:'POST',body:{nodeId:'haus_0'}});assert.equal(pair.status,200);assert.equal(pair.data.pairingKey.length,43);
      assert(!(await h.request('/api/mesh/coordinator',{token:admin})).text.includes(pair.data.pairingKey));
      for (const url of ['/api/mesh/coordinator/exchange', '/api/mesh/coordinator/energy']) {
        assert.equal((await h.request(url,{method:'POST',body:{}})).status,401,'Anonymous protocol access stays denied after app activation');
      }
      assert.equal((await h.request('/api/mesh/coordinator/exchange',{token:installer,method:'POST',body:{payload:{nodeId:'haus_0'},signature:'0'.repeat(64)}})).status,403);
      assert.equal((await h.request('/api/mesh/coordinator/exchange',{token:installer,method:'POST',body:{padding:'x'.repeat(70000)}})).status,413);
      assert.equal((await h.request('/api/mesh/coordinator/energy',{token:installer,method:'POST',body:{payload:{nodeId:'haus_0'},signature:'0'.repeat(64)}})).status,409);
      assert.equal((await h.request('/api/mesh/coordinator/energy',{token:installer,method:'POST',body:{padding:'x'.repeat(170000)}})).status,413);
      for (const token of [admin,installer]) assert.equal((await h.request('/api/mesh/coordinator/accounting',{token})).status,200);
      assert.equal((await h.request('/api/mesh/coordinator/accounting',{token:installer,method:'POST',body:{enabled:true}})).status,200);
      assert.equal((await h.request('/api/mesh/coordinator/operating',{token:installer,method:'POST',body:{importW:0,exportW:0}})).status,200);
      assert.equal((await h.request('/api/mesh/coordinator/accounting/report',{token:installer,method:'POST',body:{nodeId:'foreign'}})).status,422);
      if (authEnabled && process.env.NW_PLAYWRIGHT_MODULE) {
        const { chromium }=require(process.env.NW_PLAYWRIGHT_MODULE);
        const browser=await chromium.launch({executablePath:process.env.NW_CHROMIUM_EXECUTABLE,headless:true,args:['--no-sandbox']});
        try {
          const page=await browser.newPage({viewport:{width:1440,height:1050}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
          await page.context().addCookies([{name:'nw_session',value:installer,url:h.base}]);
          await page.goto(`${h.base}/ems/microgrid/#/mesh-coordinator`);await page.getByRole('heading',{name:'Microgrid · Master / Slave',exact:true}).waitFor();
          await page.getByRole('heading',{name:'Slaves (99/99)',exact:true}).waitFor();
          assert.equal(await page.getByRole('button',{name:'Slave hinzufügen',exact:true}).isDisabled(),true);
          await page.getByRole('combobox',{name:'Slave auswählen'}).selectOption('98');await page.getByRole('textbox',{name:'Eindeutige Slave-ID',exact:true}).waitFor();
          assert.equal(await page.getByRole('textbox',{name:'Eindeutige Slave-ID',exact:true}).inputValue(),'haus_98');
          await page.getByRole('heading',{name:'Betreiber · Zähler und Abrechnung',exact:true}).waitFor();
          assert.equal(await page.getByRole('checkbox',{name:'Abrechnung und Zählerarchiv im Master aktivieren',exact:true}).isChecked(),true);
          await page.getByRole('button',{name:'Gesamtfreigabe übernehmen',exact:true}).click();
          await page.getByText('Trafo-Freigabe gespeichert. Umsetzung in der Teilnehmerübersicht kontrollieren.',{exact:true}).waitFor();
          assert.deepEqual(errors,[]);
          if(process.env.NW_MESH_SCREENSHOT) await page.screenshot({path:process.env.NW_MESH_SCREENSHOT,fullPage:false});
          await page.setViewportSize({width:390,height:844});await page.reload();await page.getByRole('heading',{name:'Microgrid · Master / Slave',exact:true}).waitFor();
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2),true, JSON.stringify(await page.evaluate(()=>Array.from(document.querySelectorAll('body *')).filter(el=>el.getBoundingClientRect().right>window.innerWidth+2).slice(0,6).map(el=>({tag:el.tagName,cls:el.className,width:el.getBoundingClientRect().width})))));
          await page.setViewportSize({width:1440,height:1050});
          await page.goto(`${h.base}/ems-apps.html?nwAdmin=1`);
          await page.locator('[data-tab="meshmicrogrid"]').click();
          const embedded = page.frameLocator('iframe[title="EMS Microgrid – Einrichtung, Regelung und Abrechnung"]');
          await embedded.getByRole('heading',{name:'Microgrid · Master / Slave',exact:true}).waitFor();
          await embedded.getByRole('heading',{name:'Slaves (99/99)',exact:true}).waitFor();
          assert.equal(await page.locator('iframe[src*="mesh-setup"]').count(),0);
          if(process.env.NW_MESH_SCREENSHOT) await page.screenshot({path:process.env.NW_MESH_SCREENSHOT.replace('.png','-ems.png'),fullPage:false});
          app.installed = false; app.enabled = false;
          await h.adapter._meshCoordinator.syncAppLifecycle();
          await embedded.getByRole('alert').waitFor();
          assert.equal(await embedded.getByRole('heading',{name:'Slaves (99/99)',exact:true}).count(),0);
          await page.reload();
          assert.equal(await page.locator('[data-tab="meshmicrogrid"]').isVisible(),false);
          assert.equal(await page.locator('iframe[src*="/ems/microgrid"]').count(),0);
          app.installed = true; app.enabled = true;
          await page.goto(`${h.base}/ems/microgrid/#/installer`);
          await page.getByRole('heading',{name:'Installer',exact:true}).waitFor();
          assert.equal(await page.getByRole('button',{name:'Microgrid Master / Slave',exact:true}).count(),0);
          assert.deepEqual(errors,[]);
          console.log('OK React/EMS: 99 Slaves, mobile Ansicht, eingebetteter App-Reiter; nach Deinstallation verborgen; kein Installer-Eintrag');
        } finally {await browser.close();}
      }
      // Diagnose darf ausgeschaltet/deinstalliert werden; aktive Anlagen sperren beide Save-Wege.
      const coordinator = h.adapter._meshCoordinator;
      const previousMode = coordinator.config.mode; coordinator.config.mode = 'active';
      const savedBefore = h.saved.length;
      for (const [url, body] of [
        ['/api/installer/config', {patch:{emsApps:{apps:{meshMicrogrid:{installed:false,enabled:false}}}},restartEms:false}],
        ['/api/installer/backup/import', {patch:{emsApps:{apps:{meshMicrogrid:{installed:true,enabled:false}}}},restartEms:false}],
      ]) {
        const result = await h.request(url, {token:installer, method:'POST', body});
        assert.equal(result.status,409,result.text); assert.match(result.text,/Stillsetzung/);
      }
      assert.equal(h.saved.length,savedBefore); assert(coordinator.appState().enabled);
      coordinator.config.mode = previousMode;
      console.log(`OK Express: Mesh-Rechte, alte Kunden-Wildcards, individuelle Paarung, Schlüssel-Redaktion, HMAC, 64-KiB-Limit; Auth=${authEnabled}`);
    } finally {h.adapter._meshCoordinator.stop();await h.close();fs.rmSync(directory,{recursive:true,force:true});}
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
