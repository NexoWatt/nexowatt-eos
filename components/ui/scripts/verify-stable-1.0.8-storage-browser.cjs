#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.NW_PLAYWRIGHT_MODULE || 'playwright');
const filename = path.join(__dirname, 'verify-stable-1.0.3-home-appcenter-access.cjs');
const fixtureSource = fs.readFileSync(filename, 'utf8');
const fixture = new Module(filename, module);
fixture.filename = filename; fixture.paths = Module._nodeModulePaths(__dirname);
fixture._compile(fixtureSource.slice(0, fixtureSource.indexOf('function staticContracts()'))
  + '\nmodule.exports = { buildHomeAppCenterHtml };', filename);
const flags = require('../ems/services/feature-flags');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-storage-license-browser-'));
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.NW_CHROMIUM_EXECUTABLE || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] });
  try {
    for (const [edition, count] of [['hems', 0], ['eos', 0], ['hems', 3], ['eos', 11]]) {
      const limit = flags.maxStorages(edition);
      const license = { valid: true, ok: true, edition, editionLabel: flags.editionLabel(edition),
        maxStorages: limit, maxWallboxes: 3, features: flags.buildFeatureMap(edition), homeIncludedApps: flags.homeIncludedApps() };
      const config = { license, emsApps: { apps: { storagefarm: { installed: true, enabled: true } } },
        settingsConfig: { evcsCount: 0, evcsList: [] }, storage: {}, installerConfig: {},
        storageFarm: { storages: Array.from({ length: count }, (_, i) => ({ enabled: true, name: `Fixture ${i+1}`,
          socId: `fixture.${i}.soc`, signedPowerId: `fixture.${i}.actual`, setSignedPowerId: `fixture.${i}.set` })) } };
      let html = fixture.exports.buildHomeAppCenterHtml()
        .replace(/window\.__nwHomeLicense = [^\n]+;/, `window.__nwHomeLicense = ${JSON.stringify(license)};`)
        .replace(/window\.__nwConfig = [^\n]+;/, `window.__nwConfig = ${JSON.stringify(config)};`);
      const file = path.join(dir, `${edition}-${count}.html`); fs.writeFileSync(file, html);
      const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto(pathToFileURL(file).href);
      await page.locator('button[data-tab="storagefarm"]').click();
      const add = page.locator('#storageFarmAddStorage');
      await add.waitFor({ state: 'visible' });
      if (!count) {
        for (let i = 0; i < limit; i++) {
          assert.equal(await add.isEnabled(), true);
          await add.click();
        }
        assert.equal(await add.isDisabled(), true, `${edition} add button stops at ${limit}`);
        assert.equal(await page.locator('.nw-storagefarm-storage-pill').count(), limit);
        await page.getByRole('button', { name: 'Ausgewählten Speicher entfernen' }).click();
        assert.equal(await add.isEnabled(), true, 'Removing a system frees a slot');
        await add.click();
      } else {
        assert.equal(await page.locator('.nw-storagefarm-storage-pill').count(), count, 'Oversized configuration is not silently truncated');
        assert.equal(await add.isDisabled(), true);
        assert.match(await page.locator('#storageFarmLicenseLimit').textContent(), /Lizenzgrenze überschritten/);
        assert.match(await page.locator('.nw-storagefarm-storage-pill').last().textContent(), /gesperrt/);
        const before = await page.evaluate(() => window.__nwRequests.filter(x => x === '/api/installer/config').length);
        await page.locator('#nw-emsapps-save').click();
        await page.getByText(new RegExp(`Speichern fehlgeschlagen: Diese Lizenz erlaubt maximal ${limit}`)).waitFor();
        assert.equal(await page.evaluate(() => window.__nwRequests.filter(x => x === '/api/installer/config').length), before, 'No over-limit POST');
      }
      assert.match(await page.locator('#storageFarmLicenseLimit').textContent(), new RegExp(`maximal ${limit}`));
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log('[1.0.8 storage browser] OK: Home/Pro farm access, 2/10 add limit, removal, preserved oversized lists, warning and blocked save.');
  } finally { await browser.close(); fs.rmSync(dir, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
