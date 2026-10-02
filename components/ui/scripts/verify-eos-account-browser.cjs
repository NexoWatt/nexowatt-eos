'use strict';
const assert=require('node:assert/strict');const path=require('node:path');const fs=require('node:fs');const crypto=require('node:crypto');
const {chromium}=require(process.env.NW_PLAYWRIGHT_MODULE || 'playwright');
const {createHarness}=require('./verify-stable-1.0.9-access.cjs');
(async()=>{
 const h=await createHarness();let browser;
 try {
  h.objects.get('system.user.kunde').native={nexowattPasswordChangeRequired:true,nexowattEosAccount:{passwordInitialized:false,passwordSetupVersion:0,role:'enduser'}};
  const portable=process.env.NW_CHROMIUM_MODULE ? (await import(process.env.NW_CHROMIUM_MODULE)).default : null;
  browser=await chromium.launch({executablePath:portable ? await portable.executablePath() : process.env.NW_CHROMIUM_EXECUTABLE,
    args:portable ? portable.args.filter(value=>value!=='--disable-web-security') : ['--no-sandbox','--disable-dev-shm-usage']});
  const context=await browser.newContext({ignoreHTTPSErrors:true,serviceWorkers:'block',viewport:{width:390,height:844}});
  await context.route('**/*',route=>new URL(route.request().url()).origin===h.base?route.continue():route.abort());
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(h.base+'/');assert.equal(response.status(),401);
  const dialog=page.locator('#nwAuthOverlay');await dialog.waitFor({state:'visible'});
  await dialog.locator('input[autocomplete="username"]').fill('kunde');
  await dialog.locator('input[autocomplete="current-password"]').fill(h.testPassword);
  await dialog.getByRole('button',{name:'Anmelden',exact:true}).click();
  await dialog.getByRole('heading',{name:'Eigenes Passwort festlegen'}).waitFor();
  await page.waitForFunction(()=>window.NW_AUTH?.getState().passwordChangeRequired);
  assert.equal(await page.evaluate(()=>fetch('/api/state').then(r=>r.status)),403);
  assert.equal(await dialog.getByRole('button',{name:'Abbrechen',exact:true}).isVisible(),false);
  const screenshot=process.env.NW_ACCESS_SCREENSHOT_DIR;
  if(screenshot){fs.mkdirSync(screenshot,{recursive:true});await page.screenshot({path:path.join(screenshot,'ui-own-password-390.png'),fullPage:true});}
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no mobile horizontal overflow');
  const password=crypto.randomBytes(24).toString('base64url');
  await dialog.locator('input[autocomplete="current-password"]').fill(h.testPassword);
  await dialog.locator('input[autocomplete="new-password"]').nth(0).fill(password);
  await dialog.locator('input[autocomplete="new-password"]').nth(1).fill(password);
  await page.evaluate(()=>fetch('/api/state').then(r=>r.status));
  assert.ok((await dialog.locator('input[autocomplete="new-password"]').nth(0).inputValue())===password,'pending data rejection must preserve password input');
  await dialog.getByRole('button',{name:'Passwort speichern',exact:true}).click();
  try { await dialog.getByText('Passwort gespeichert. Bitte mit dem neuen Passwort anmelden.').waitFor({timeout:5000}); }
  catch(error) { console.log('DIALOG_TEXT='+await dialog.innerText()); throw error; }
  await dialog.locator('input[autocomplete="current-password"]').fill(password);
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),dialog.getByRole('button',{name:'Anmelden',exact:true}).click()]);
  await page.waitForFunction(()=>window.NW_AUTH?.getState().authed===true&&!window.NW_AUTH?.getState().passwordChangeRequired);
  assert.equal(await page.evaluate(()=>fetch('/api/state').then(r=>r.status)),200);
  await page.getByRole('button',{name:'Passwort ändern',exact:true}).click();
  await dialog.getByRole('heading',{name:'Eigenes Passwort festlegen'}).waitFor();
  assert.equal(await dialog.getByRole('button',{name:'Abbrechen',exact:true}).isVisible(),true);
  await dialog.getByRole('button',{name:'Abbrechen',exact:true}).click();
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.getByRole('button',{name:'Abmelden',exact:true}).click()]);
  await dialog.waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>window.NW_AUTH.getState().authed),false);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,browser:await browser.version(),environment:'local HTTPS Express, fixture Controller accounts; browser fixture CA accepted, no external requests',checks:['mandatory first login at 390px','no pending account data','own password saved','reauthentication required','normal account password change accessible','no browser errors']}));
 }finally{await browser?.close();await h.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
