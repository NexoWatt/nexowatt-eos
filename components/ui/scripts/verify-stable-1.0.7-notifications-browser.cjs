#!/usr/bin/env node
'use strict';
// Optional browser regression using the actual built React bundle and local API fixtures.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { randomBytes } = require('node:crypto');
const { chromium } = require(process.env.NW_PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');

(async () => {
  const testPassword = randomBytes(32).toString('hex');
  let authorized = false, reads = 0, writes = [], failSave = false;
  let config = { enabled: false, host: '', port: 465, tlsMode: 'tls', user: 'info@nexowatt.com', from: 'info@nexowatt.com', siteName: '', passwordSet: false };
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const json = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (url.pathname === '/api/strict-auth/status') return json(200, { enabled: true, authed: authorized, user: 'admin', role: 'admin', capabilities: authorized ? ['*'] : [] });
    if (url.pathname === '/api/installer/notification-mail') {
      if (!authorized) return json(403, { ok: false, error: 'forbidden' });
      if (req.method === 'GET') { reads++; return json(200, { ok: true, config }); }
      let body = ''; for await (const chunk of req) body += chunk;
      const data = JSON.parse(body); writes.push(data);
      if (failSave) return json(400, { ok: false, error: 'SMTP-Server, Benutzer und Passwort sind erforderlich.' });
      const { password, clearPassword, ...publicFields } = data;
      config = { ...publicFields, passwordSet: clearPassword ? false : (!!password || config.passwordSet) };
      return json(200, { ok: true, config });
    }
    // Der echte Runtime-Server liefert /admin.png nicht aus; kein künstlicher Test-Fallback.
    if (url.pathname === '/admin.png') { res.writeHead(404); return res.end(); }
    const relative = url.pathname.startsWith('/mail-setup/') ? 'admin/react/' + (url.pathname.slice('/mail-setup/'.length) || 'index.html') : 'www' + url.pathname;
    const file = path.join(root, relative);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' })[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.NW_CHROMIUM_EXECUTABLE || undefined, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const base = `http://127.0.0.1:${server.address().port}`;
    await page.goto(base + '/mail-setup/#/notification-mail');
    await page.getByText('Zugriff geschützt', { exact: true }).waitFor();
    assert.equal(await page.locator('#mailHost').count(), 0); assert.equal(reads, 0, 'configuration is not requested before authorization');
    authorized = true; await page.reload();
    await page.getByRole('button', { name: 'Versandkonfiguration speichern' }).waitFor();
    await page.locator('.nw-brand__logo').evaluate(img => img.decode());
    assert.equal(await page.locator('.nw-brand__logo').evaluate(img => img.naturalWidth), 192);
    await page.getByLabel('Direkten E-Mail-Versand aktivieren').check();
    await page.locator('#mailHost').fill('smtp.example.test');
    await page.locator('#mailSite').fill('Testanlage');
    await page.locator('#mailTls').selectOption('starttls');
    assert.equal(await page.locator('#mailPort').inputValue(), '587');
    await page.locator('#mailPassword').fill(testPassword);
    await page.getByRole('button', { name: 'Versandkonfiguration speichern' }).click();
    await page.getByRole('status').filter({ hasText: /^Gespeichert\./ }).waitFor();
    assert.equal(writes.length, 1); assert.equal(writes[0].password, testPassword);
    assert.equal(await page.locator('#mailPassword').inputValue(), '', 'password cleared after save');
    await page.locator('#mailSite').fill('Neuer Anlagenname');
    await page.getByRole('button', { name: 'Versandkonfiguration speichern' }).click();
    await page.waitForFunction(() => !document.querySelector('button[type="submit"]').disabled);
    assert.equal(writes.length, 2); assert.equal(writes[1].password, ''); assert.equal(config.passwordSet, true);
    assert.equal(await page.evaluate(value => JSON.stringify(localStorage).includes(value), testPassword), false);
    failSave = true;
    await page.getByRole('button', { name: 'Versandkonfiguration speichern' }).click();
    await page.getByRole('status').filter({ hasText: 'erforderlich' }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no mobile horizontal overflow');
    if (process.env.NW_NOTIFICATION_SCREENSHOT) await page.screenshot({ path: process.env.NW_NOTIFICATION_SCREENSHOT, fullPage: true });
    authorized = false; await page.reload();
    await page.getByText('Zugriff geschützt', { exact: true }).waitFor();
    assert.equal(await page.locator('#mailPassword').count(), 0);
    assert.deepEqual(errors, []);
    console.log('[1.0.7 browser] OK: protected entry, real bundle, SMTP fields/save/error, blank-password preservation, no secret in localStorage, mobile layout, lost session.');
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
