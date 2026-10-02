#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.NW_PLAYWRIGHT_MODULE || 'playwright');
const { createHarness } = require('./verify-stable-1.0.9-access.cjs');
const root = path.resolve(__dirname, '..');
(async () => {
  const h = await createHarness();
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.NW_CHROMIUM_EXECUTABLE || undefined, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, serviceWorkers: 'block' });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', dialog => dialog.accept());
    const role = async user => {
      await context.clearCookies();
      if (user) await context.addCookies([{ name: 'nw_session', value: await h.login(user), url: h.base }]);
    };
    await role('kunde');
    await page.goto(h.base + '/smarthome.html');
    await page.waitForFunction(() => window.NW_AUTH?.getState()?._loaded);
    assert.equal(await page.locator('#nwSmartHomeSettingsLink').isVisible(), false);
    await page.goto(h.base + '/settings.html');
    await page.waitForFunction(() => window.NW_AUTH?.getState()?._loaded);
    assert.equal(await page.locator('a[href*="smarthome-config"]').count(), 0, 'technical SmartHome entry is absent from general settings');
    for (const url of ['/smarthome-config.html', '/static/smarthome-config.html', '/static/%73marthome-config.html', '/static//smarthome-config.html', '/logic.html']) {
      assert.equal((await page.goto(h.base + url)).status(), 403);
      assert.equal(await page.locator('#nw-config-save-btn').count(), 0);
    }
    await role('installer');
    await page.goto(h.base + '/smarthome.html');
    await page.locator('#nwSmartHomeSettingsLink').click();
    await page.waitForURL('**/smarthome-config.html');
    await page.locator('#nw-shcfg-tile-building').waitFor();
    // Import ist technische Einrichtung durch den Installer und prüft denselben Save-Flow wie
    // changing rooms/devices in the editor, including server validation/persistence.
    const config = { version: 3, floors: [{ id: 'eg', name: 'Erdgeschoss' }],
      rooms: [{ id: 'living', name: 'Wohnzimmer', floorId: 'eg' }], functions: [], devices: [], pages: [], scenes: [], meta: {} };
    await page.locator('#nw-config-import-file').setInputFiles({ name: 'smarthome.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(config)) });
    await page.locator('#nw-config-status').filter({ hasText: 'Konfiguration gespeichert' }).waitFor();
    assert.equal(h.saved.at(-1).smartHomeConfig.rooms[0].name, 'Wohnzimmer');
    await page.reload();
    await page.locator('#nw-shcfg-tile-building').click();
    await page.getByText('Wohnzimmer', { exact: true }).first().waitFor();
    await page.goto(h.base + '/settings.html');
    await page.waitForFunction(() => window.NW_AUTH?.getState()?._loaded);
    assert.equal(await page.locator('a[href*="smarthome-config"]').count(), 0, 'installer setup no longer lives in general settings');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(h.base + '/smarthome.html');
    await page.locator('#nwSmartHomeSettingsLink').click();
    await page.locator('#nw-config-save-btn').waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'installer setup mobile layout');
    if (process.env.NW_ACCESS_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.NW_ACCESS_SCREENSHOT_DIR, 'installer-smarthome.png'), fullPage: true });
    await role('kunde');
    await page.goto(h.base + '/smarthome.html');
    await page.waitForFunction(() => window.NW_AUTH?.getState()?._loaded);
    assert.equal(await page.locator('#nwSmartHomeSettingsLink').isVisible(), false);
    const layout = await page.evaluate(() => fetch('/api/smarthome/layout').then(r => r.json()));
    assert.equal(layout.config.rooms[0].name, 'Wohnzimmer');
    await role('admin');
    await page.goto(h.base + '/settings.html');
    await page.waitForFunction(() => window.NW_AUTH?.getState()?._loaded);
    assert.equal(await page.locator('a[href*="smarthome-config"]').count(), 0, 'admin setup no longer lives in general settings');
    await page.goto(h.base + '/smarthome.html');
    await page.locator('#nwSmartHomeSettingsLink').waitFor();
    assert.equal(await page.locator('#nwSmartHomeSettingsLink').isVisible(), true);
    // Echtes Runtime-Mount: das Logo muss geladen UND als Bild dekodiert werden.
    await page.goto(h.base + '/mail-setup/#/notification-mail');
    await page.locator('#mailHost').waitFor();
    const logo = page.locator('.nw-brand__logo');
    await logo.evaluate(img => img.decode());
    assert.equal(await logo.evaluate(img => img.naturalWidth), 192);
    assert.ok(new URL(await logo.getAttribute('src'), h.base).pathname.startsWith('/mail-setup/assets/nexowatt-192-'));
    assert.equal((await h.request('/admin.png', { token: await h.login('admin') })).status, 404);
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(await logo.isVisible());
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      if (process.env.NW_ACCESS_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.NW_ACCESS_SCREENSHOT_DIR, `mail-logo-${width}.png`), fullPage: true });
    }
    await role('installer');
    await page.goto(h.base + '/ems-apps.html?nwAdmin=1');
    await page.waitForFunction(() => window.NW_AUTH?.getState()?.role === 'installer');
    assert.equal(await page.locator('#nwMailAdminLink').isVisible(), false);
    for (const url of ['/mail-setup/', '/license.html']) {
      const response = await page.goto(h.base + url);
      assert.equal(response.status(), 403);
      assert.equal(await page.locator('#mailHost').count(), 0);
    }
    // ioBroker serves the React admin entry independently of the runtime route.
    // Serve only its static assets here; all auth/API calls hit the real server.
    await page.route('**/mail-setup/**', async route => {
      const url = new URL(route.request().url());
      const relative = url.pathname.slice('/mail-setup/'.length) || 'index.html';
      const file = path.join(root, 'admin/react', relative);
      if (!file.startsWith(path.join(root, 'admin/react') + path.sep) || !fs.existsSync(file)) return route.abort();
      await route.fulfill({ path: file, contentType: ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' })[path.extname(file)] || 'application/octet-stream' });
    });
    await page.goto(h.base + '/mail-setup/#/installer');
    await page.getByRole('button', { name: 'EMS Apps öffnen', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'E-Mail-Versand', exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Lizenz', exact: true }).count(), 0);
    for (const route of ['notification-mail']) {
      await page.goto(h.base + '/mail-setup/#/' + route);
      await page.getByText('Zugriff geschützt', { exact: true }).waitFor();
      assert.equal(await page.locator('#mailHost').count(), 0);
    }
    await page.goto(h.base + '/mail-setup/#/license');
    await page.waitForURL('**/license.html');
    assert.equal(await page.locator('body').getAttribute('data-nw-required-capability'), 'license.manage');
    await role('admin');
    await page.goto(h.base + '/mail-setup/#/installer');
    await page.getByRole('button', { name: 'E-Mail-Versand', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Lizenz', exact: true }).waitFor();
    await page.goto(h.base + '/mail-setup/#/notification-mail');
    await page.locator('#mailHost').waitFor();
    await page.getByRole('button', { name: 'Versandkonfiguration speichern' }).click();
    await page.getByRole('status').filter({ hasText: /^Gespeichert\./ }).waitFor();
    assert.equal(h.mailWrites.length, 1);
    if (process.env.NW_ACCESS_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.NW_ACCESS_SCREENSHOT_DIR, 'admin-mail.png'), fullPage: true });
    assert.deepEqual(errors, []);
    console.log('[1.0.9 browser] OK: customer setup links hidden and URLs locked, expert setup only in SmartHome, Installer import/save/reload and mobile, customer room layout, decoded logo at runtime, Admin-only mail/license and SMTP save.');
  } finally { if (browser) await browser.close(); await h.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
