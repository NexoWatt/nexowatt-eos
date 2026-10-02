'use strict';
// Optional real-controller browser smoke. Credentials stay in memory and are
// never included in screenshots, command lines or browser trace recordings.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');

async function createBrowserSmoke({ web, diagnostic }) {
    const puppeteerPath = process.env.EOS_TEST_BROWSER_PUPPETEER;
    const chromiumPath = process.env.EOS_TEST_BROWSER_CHROMIUM_MODULE;
    if (!puppeteerPath && !chromiumPath) return null;
    if (!path.isAbsolute(puppeteerPath || '') || !path.isAbsolute(chromiumPath || '')) throw new Error('ABSOLUTE_BROWSER_DEPENDENCIES_REQUIRED');
    const puppeteer = require(puppeteerPath);
    const chromium = (await import(pathToFileURL(chromiumPath).href)).default;
    const spki = ['admin', 'ui'].map(name => new crypto.X509Certificate(fs.readFileSync(path.join(web, `${name}.crt`))).publicKey.export({ format: 'der', type: 'spki' }))
        .map(der => crypto.createHash('sha256').update(der).digest('base64'));
    // Serverless Chromium defaults disable web security. Do not inherit that
    // setting for auth tests: allow only the exact ephemeral server SPKIs.
    const args = chromium.args.filter(arg => !['--disable-web-security', '--allow-running-insecure-content', '--disable-site-isolation-trials'].includes(arg)
        && !arg.startsWith('--ignore-certificate-errors'));
    args.push(`--ignore-certificate-errors-spki-list=${spki.join(',')}`);
    const browser = await puppeteer.launch({ executablePath: await chromium.executablePath(), headless: true, args });
    diagnostic(JSON.stringify({ realBrowser: await browser.version(), webSecurityDisabled: false, certificateTrust: 'exact two ephemeral leaf SPKIs', sandbox: 'disabled in isolated UID0 laboratory; no target-hardening proof' }));
    const inspect = async (cookieValues, operation) => {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setViewport({ width: 1280, height: 1000 });
        await page.setRequestInterception(true);
        page.on('request', request => {
            const url = new URL(request.url());
            if ((url.protocol === 'https:' && url.hostname === 'localhost' && ['8081', '8188'].includes(url.port)) || ['about:', 'data:', 'blob:'].includes(url.protocol)) void request.continue();
            else void request.abort();
        });
        try {
            const old = await page.cookies('https://localhost:8081', 'https://localhost:8188');
            if (old.length) await page.deleteCookie(...old);
            await page.setCookie(...Object.entries(cookieValues).map(([name, value]) => ({ name, value, domain: 'localhost', path: '/', secure: true, httpOnly: true, sameSite: 'Lax' })));
            await operation(page);
            assert.deepEqual(errors, [], 'browser runtime must not raise uncaught exceptions');
        } catch (error) {
            diagnostic(JSON.stringify({ browserFailure: error.message, url: page.url(), text: await page.evaluate(() => document.body?.innerText?.slice(0, 1200) || '').catch(() => ''), pageErrors: errors }));
            throw error;
        } finally { await page.close(); }
    };
    return {
        async pending(token) {
            await inspect({ access_token: token }, async page => {
                await page.goto('https://localhost:8081/index.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
                await page.waitForSelector('#eos-first-login-title', { visible: true, timeout: 15000 });
                for (const name of ['currentPassword', 'password', 'passwordRepeat']) await page.waitForSelector(`input[name="${name}"]`, { visible: true, timeout: 5000 });
                assert.equal(await page.evaluate(() => window.NEXOWATT_EOS_PASSWORD_SETUP_ACTIVE), true);
                const logo = await page.$('.eos-first-login-logo');
                await logo.evaluate(image => image.decode());
                assert.equal(await logo.evaluate(image => image.naturalWidth > 0), true);
            });
        },
        async firstPassword(token, credentials) {
            let result;
            await inspect({ access_token: token }, async page => {
                await page.goto('https://localhost:8081/index.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
                await page.waitForSelector('input[name="currentPassword"]', { visible: true, timeout: 15000 });
                for (const name of ['currentPassword', 'password', 'passwordRepeat']) await page.type(`input[name="${name}"]`, credentials[name]);
                const response = page.waitForResponse(reply => new URL(reply.url()).pathname === '/nexowatt/account/first-password' && reply.request().method() === 'POST', { timeout: 15000 });
                await page.click('.eos-first-login-submit');
                const completed = await response;
                result = { status: completed.status(), data: await completed.json() };
            });
            return result;
        },
        async ready(account) {
            await inspect({ access_token: account.adminToken, nw_session: account.uiCookie.slice('nw_session='.length) }, async page => {
                await page.goto('https://localhost:8081/index.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
                await page.waitForFunction(() => window.NEXOWATT_EOS_ROLE_BOOTSTRAP?.getRole() === window.NEXOWATT_EOS_BOOTSTRAP_POLICY?.role && !!window.NEXOWATT_EOS_BOOTSTRAP_POLICY?.authenticated, { timeout: 20000 });
                assert.equal(await page.evaluate(() => window.NEXOWATT_EOS_BOOTSTRAP_POLICY.role), account.role);
                await page.waitForSelector('#eos-product-portal', { visible: true, timeout: 20000 });
                assert.equal(await page.evaluate(() => window.NEXOWATT_EOS_PRODUCT_PORTAL_ACTIVE), true);
                assert.equal(await page.evaluate(() => !!window.NEXOWATT_EOS_PASSWORD_SETUP_ACTIVE), false);
                assert.equal(await page.evaluate(() => !!window.NEXOWATT_EOS_APP_BOOTSTRAPPED), false);
                assert.equal(await page.$eval('#eos-portal-cockpit', link => link.href), 'https://localhost:8188/');
                if (account.role === 'installer') {
                    await page.waitForFunction(() => window.NEXOWATT_EOS_POLICY_CLIENT?.getPolicy?.()?.role === 'installer', { timeout: 15000 });
                    await page.click('#eos-portal-settings');
                    await page.waitForSelector('.eos-basic-settings-form input[name="siteName"]', { visible: true, timeout: 15000 });
                    await page.click('.eos-basic-settings-close');
                    await page.click('#eos-portal-accounts');
                    await page.waitForSelector('.eos-account-row', { visible: true, timeout: 15000 });
                    assert.equal(await page.$$eval('.eos-account-avatar-admin', nodes => nodes.length), 0);
                    await page.click('.eos-account-management-close');
                } else {
                    assert.equal(await page.$('#eos-portal-settings'), null);
                    assert.equal(await page.$('#eos-portal-accounts'), null);
                }
                await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }), page.click('#eos-portal-cockpit')]);
                await page.waitForFunction(() => window.NW_AUTH?.getState()?._loaded, { timeout: 20000 });
                assert.match(await page.title(), /NexoWatt EOS/);
                const status = await page.evaluate(() => fetch('/api/auth/status').then(response => response.json()));
                assert.equal(status.accountRole, account.role); assert.equal(status.isAdmin, false); assert.equal(status.passwordChangeRequired, false);
            });
        },
        close: () => browser.close(),
    };
}
module.exports = { createBrowserSmoke };
