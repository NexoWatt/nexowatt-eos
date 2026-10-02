'use strict';
/** Echte Browserkarte/HTTPS/API; Status- und Controllerdaten sind lokale Fixtures. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Module = require('node:module');
const { pathToFileURL } = require('node:url');
const { statusFixture } = require('../test/os-update-status-fixture.cjs');
const { sanitizeStatus } = require('../lib/os-update-status');
const tls = require('./eos-tls-fixture.cjs');
let status = sanitizeStatus(statusFixture());
let reads = 0;
const loader = Module._load;
let createHarness;
try {
  Module._load = function (request, ...args) {
    return request === './lib/os-update-status' ? { getOsUpdateStatus: async () => { reads++; return status; } } : loader.call(this, request, ...args);
  };
  ({ createHarness } = require('./verify-stable-1.0.9-access.cjs'));
} finally { Module._load = loader; }
(async () => {
  assert.ok(path.isAbsolute(process.env.EOS_TEST_BROWSER_PUPPETEER || ''), 'offline browser module path required');
  assert.ok(path.isAbsolute(process.env.EOS_TEST_BROWSER_CHROMIUM_MODULE || ''), 'offline chromium module path required');
  const puppeteer = require(process.env.EOS_TEST_BROWSER_PUPPETEER);
  const chromium = (await import(pathToFileURL(process.env.EOS_TEST_BROWSER_CHROMIUM_MODULE).href)).default;
  const spki = crypto.createHash('sha256').update(new crypto.X509Certificate(tls.cert).publicKey.export({ type: 'spki', format: 'der' })).digest('base64');
  const args = chromium.args.filter(value => !['--disable-web-security', '--allow-running-insecure-content', '--disable-site-isolation-trials'].includes(value) && !value.startsWith('--ignore-certificate-errors'));
  args.push('--ignore-certificate-errors-spki-list=' + spki);
  const h = await createHarness(); let browser;
  const screenshots = path.resolve(process.env.EOS_OS_UPDATE_SCREENSHOTS || 'reports/security/os-updates-20261001');
  fs.mkdirSync(screenshots, { recursive: true });
  try {
    browser = await puppeteer.launch({ executablePath: await chromium.executablePath(), headless: true, args });
    const page = await browser.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.origin === h.base || ['data:', 'blob:', 'about:'].includes(url.protocol)) void request.continue(); else void request.abort();
    });
    await page.setCookie({ name: 'nw_session', value: await h.login('kunde'), url: h.base, secure: true, httpOnly: true, sameSite: 'Lax' });
    await page.setViewport({ width: 1280, height: 1600 });
    // EOS hält regulär SSE offen; Netzwerkruhe wäre kein geeigneter Ladebeleg.
    assert.equal((await page.goto(h.base + '/settings.html', { waitUntil: 'domcontentloaded' })).status(), 200);
    await page.waitForFunction(() => document.getElementById('osUpdateStatus')?.dataset.updateHealth === 'ok');
    await page.$eval('#osUpdateStatus', element => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 180));
    await (await page.$('#osUpdateStatus')).screenshot({ path: path.join(screenshots, 'os-updates-desktop.png') });
    const attention = statusFixture(); attention.state = 'attention'; attention.pending.securityCount = 3; attention.pending.blockedSecurityCount = 1;
    attention.coverage.state = 'gap'; attention.coverage.gaps = ['mixed-vendor']; attention.activation.state = 'required'; attention.activation.serviceRestartCount = 2;
    status = sanitizeStatus(attention);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await page.waitForFunction(() => document.getElementById('osUpdatePending').textContent === '3');
    assert.equal(await page.$eval('#osUpdateStatus', element => element.dataset.updateHealth), 'warning');
    await page.setViewport({ width: 390, height: 1800 });
    await page.$eval('#osUpdateStatus', element => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 180));
    await (await page.$('#osUpdateStatus')).screenshot({ path: path.join(screenshots, 'os-updates-mobile-warning.png') });
    const bounds = await page.$eval('#osUpdateStatus', element => ({ width: element.getBoundingClientRect().width, scroll: element.scrollWidth, client: element.clientWidth }));
    assert.ok(bounds.width <= 390 && bounds.scroll <= bounds.client + 1, 'status card must not overflow mobile viewport');
    await page.setOfflineMode(true);
    await page.waitForFunction(() => document.getElementById('osUpdateHeadline').textContent.startsWith('Offline'));
    assert.equal(await page.$eval('#osUpdatePending', element => element.textContent), 'Unbekannt');
    await page.setOfflineMode(false);
    await page.waitForFunction(() => document.getElementById('osUpdatePending').textContent === '3');
    // BFCache-Lifecycle: Rückkehr muss neue Daten abrufen und Warnung erhalten.
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
    const previousReads = reads;
    status = sanitizeStatus(statusFixture()); status.summary.errorCode = '<img src=x onerror="window.osUpdateInjected=true">'; status.health = 'warning';
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    await page.waitForFunction(() => document.getElementById('osUpdateDetails').textContent === 'Updateprüfung fehlgeschlagen');
    assert.ok(reads > previousReads); assert.equal(await page.evaluate(() => window.osUpdateInjected), undefined);
    assert.equal(await page.$eval('#osUpdateStatus', element => element.querySelectorAll('img').length), 0);
    status = { schemaVersion: 1, availability: 'unavailable', health: 'warning', summary: null };
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await page.waitForFunction(() => document.getElementById('osUpdateHeadline').textContent === 'Updatezustand nicht verfügbar');
    assert.equal(await page.$eval('#osUpdatePending', element => element.textContent), 'Unbekannt');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, browser: await browser.version(), checks: ['authenticated settings route', 'desktop status', 'mobile pending/activation warning', 'offline clears stale counts', 'BFCache resumes polling', 'untrusted strings cannot create markup', '503 clears details'], certificateTrust: 'exact ephemeral SPKI', sandbox: 'disabled in isolated root test environment', limitations: ['fixture status and Controller', 'no actual Debian updates or Pi hardware'] }));
  } finally { await browser?.close(); await h.close(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
