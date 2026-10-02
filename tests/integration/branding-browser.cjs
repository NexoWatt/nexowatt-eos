'use strict';

// Browser fixture for shipped assets. It does not authenticate against a device
// and must not be reported as a controller or hardware integration test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { once } = require('node:events');
const puppeteer = require(process.env.EOS_BROWSER_PUPPETEER || 'puppeteer');
const root = path.resolve(__dirname, '../..');
const publicDir = path.join(root, 'components/admin/adminWww');
const output = path.resolve(process.env.EOS_BRANDING_EVIDENCE || path.join(root, 'reports/integration/branding'));
const mime = { '.js': 'application/javascript', '.html': 'text/html', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };
let fixturePolicy = { authenticated: false, role: 'unknown' };
let passwordRequest = null;
const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/nexowatt/security/context') {
        if (!fixturePolicy) { res.writeHead(503, { 'Content-Type': 'application/json' }).end('{}'); return; }
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(fixturePolicy)); return;
    }
    if (url.pathname === '/nexowatt/role-settings/basic') {
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ settings: { siteName: 'EOS Test' }, options: {} })); return;
    }
    if (url.pathname === '/nexowatt/account/manage') {
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ accounts: [] })); return;
    }
    if (url.pathname === '/nexowatt/account/password' && req.method === 'POST') {
        passwordRequest = { path: url.pathname, header: req.headers['x-nexowatt-eos-password'] };
        req.resume();
        res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'currentPasswordInvalid' })); return;
    }
    const name = url.pathname === '/' ? '/index.html' : url.pathname;
    const file = path.resolve(publicDir, `.${name}`);
    if (!file.startsWith(`${publicDir}${path.sep}`) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        res.writeHead(404).end();
        return;
    }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    // These are server HTML placeholders, not authentication or role bypasses.
    const body = fs.readFileSync(file);
    res.end(path.extname(file) === '.html' ? body.toString().replaceAll('@@auth@@', 'true').replaceAll('@@ssoActive@@', 'false') : body);
});

(async () => {
    fs.mkdirSync(output, { recursive: true });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const origin = `http://127.0.0.1:${server.address().port}`;
    let browser;
    try {
        const chromiumModule = process.env.EOS_BROWSER_CHROMIUM_MODULE ? await import(process.env.EOS_BROWSER_CHROMIUM_MODULE) : null;
        const chromium = chromiumModule?.default;
        browser = await puppeteer.launch({ executablePath: chromium ? await chromium.executablePath() : process.env.EOS_BROWSER_EXECUTABLE, headless: true, args: chromium ? chromium.args : ['--no-sandbox', '--disable-dev-shm-usage'] });
        const page = await browser.newPage();
        page.on('pageerror', error => console.error(`Fixture page error: ${error.message}`));
        page.on('console', message => { if (message.type() === 'warn') console.error(`Fixture warning: ${message.text()}`); });
        await page.setRequestInterception(true);
        page.on('request', request => {
            const url = request.url();
            if (url.startsWith(origin) || url.startsWith('data:') || url === 'about:blank') request.continue();
            else request.abort();
        });
        const screenshots = [];
        for (const width of [1280, 390]) {
            await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
            await page.goto(`${origin}/index.html?login`, { waitUntil: 'networkidle2', timeout: 15000 });
            await page.waitForSelector('#username', { timeout: 15000 });
            assert.match(await page.title(), /NexoWatt EOS/);
            const logos = await page.$$eval('img', images => images.filter(image => image.getBoundingClientRect().width && image.getBoundingClientRect().height).map(image => ({ src: image.getAttribute('src'), loaded: image.complete && image.naturalWidth > 0 })));
            assert.ok(logos.some(logo => logo.src.includes('img/eos/nexowatt-192.png') && logo.loaded));
            assert.ok(!logos.some(logo => /iobroker/i.test(logo.src)));
            const file = `admin-login-${width}.png`;
            await page.screenshot({ path: path.join(output, file), fullPage: true });
            screenshots.push({ file, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(output, file))).digest('hex') });
        }
        // Role policy is a fixture response. The real controller/API tests must
        // separately prove that users cannot select their role themselves.
        for (const role of ['installer', 'enduser']) {
            fixturePolicy = { authenticated: true, role, user: `system.user.fixture_${role}`, mustChangePassword: false };
            await page.goto(`${origin}/index.html`, { waitUntil: 'networkidle2', timeout: 15000 });
            try { await page.waitForSelector('#eos-product-portal', { timeout: 5000 }); }
            catch (error) { console.error(await page.evaluate(() => ({ url: location.href, body: document.body.outerHTML.slice(0, 3000), role: window.NEXOWATT_EOS_ACCESS_ROLE, policy: window.NEXOWATT_EOS_BOOTSTRAP_POLICY }))); throw error; }
            assert.equal(await page.evaluate(() => window.NEXOWATT_EOS_APP_BOOTSTRAPPED === true), false);
            assert.equal(await page.$eval('#eos-portal-cockpit', link => new URL(link.href).protocol), 'https:');
            assert.equal(await page.$eval('#eos-portal-cockpit', link => new URL(link.href).port), '8188');
            if (role === 'installer') {
                await page.click('#eos-portal-settings');
                await page.waitForSelector('.eos-basic-settings-overlay input[name="siteName"]');
                assert.equal(await page.$eval('.eos-basic-settings-overlay input[name="siteName"]', input => input.value), 'EOS Test');
                const visibleSettings = await page.$eval('.eos-basic-settings-close', button => {
                    const rect = button.getBoundingClientRect();
                    return button.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
                });
                assert.equal(visibleSettings, true, 'settings modal must be above portal');
                await page.click('.eos-basic-settings-close');
                await page.click('#eos-portal-accounts');
                await page.waitForSelector('.eos-account-management-dialog');
                await page.click('.eos-account-management-close');
            } else {
                assert.equal(await page.$('#eos-portal-settings'), null);
                assert.equal(await page.$('#eos-portal-accounts'), null);
            }
            const file = `admin-portal-${role}-390.png`;
            await page.screenshot({ path: path.join(output, file), fullPage: true });
            screenshots.push({ file, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(output, file))).digest('hex') });
        }
        fixturePolicy = { authenticated: true, role: 'installer', user: 'system.user.fixture_installer', mustChangePassword: true, passwordSetup: { minLength: 15 } };
        await page.goto(`${origin}/index.html`, { waitUntil: 'networkidle2', timeout: 15000 });
        await page.waitForSelector('#eos-first-login-title');
        assert.equal(await page.$('#eos-product-portal'), null, 'password setup must precede the portal');
        assert.equal(await page.evaluate(() => window.NEXOWATT_EOS_APP_BOOTSTRAPPED === true), false);
        fixturePolicy = { authenticated: true, role: 'admin', user: 'system.user.fixture_service', mustChangePassword: false };
        await page.goto(`${origin}/index.html?eosPassword=1`, { waitUntil: 'networkidle2', timeout: 15000 });
        await page.waitForSelector('[data-eos-auth-boundary="password"]');
        assert.equal(await page.evaluate(() => window.NEXOWATT_EOS_APP_BOOTSTRAPPED === true), false);
        await page.type('input[name="currentPassword"]', 'synthetic current test phrase');
        await page.type('input[name="password"]', 'synthetic new long personal phrase');
        await page.type('input[name="passwordRepeat"]', 'synthetic new long personal phrase');
        await page.click('button[type="submit"]');
        await page.waitForFunction(() => document.querySelector('.eos-first-login-status')?.dataset.kind === 'error');
        assert.deepEqual(passwordRequest, { path: '/nexowatt/account/password', header: '1' }, 'long plain passphrase must reach the scoped endpoint without a composition gate');
        fixturePolicy = null;
        await page.goto(`${origin}/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForSelector('[data-eos-auth-boundary="security-context"]');
        assert.equal(await page.evaluate(() => window.NEXOWATT_EOS_APP_BOOTSTRAPPED === true), false, 'failed context must stay closed');
        // Run the real shipped sanitizer against real browser DOM nodes. Legal
        // notices, nested code and package identifiers must remain verbatim.
        await page.goto('about:blank');
        await page.setContent('<meta name="description" content="Fixture"><div id="product">ioBroker Admin</div><div id="package">iobroker.eos-admin</div><div id="legal" data-eos-preserve-attribution><span>ioBroker</span></div><pre id="log"><span>ioBroker</span></pre><div id="attribution">Copyright ioBroker GmbH</div><img id="label" alt="ioBroker Admin"><div id="dynamic"></div>');
        await page.evaluate(() => { window.NEXOWATT_EOS_DOM_COORDINATOR = { subscribe(fn) { window.brandingMutation = fn; return () => {}; } }; });
        await page.addScriptTag({ content: fs.readFileSync(path.join(publicDir, 'js/eos-branding-sanitizer.js'), 'utf8') });
        const result = await page.evaluate(() => {
            const dynamic = document.getElementById('dynamic');
            dynamic.textContent = 'ioBroker';
            window.brandingMutation([{ type: 'childList', addedNodes: [dynamic] }]);
            return Object.fromEntries(['product', 'package', 'legal', 'log', 'attribution', 'dynamic'].map(id => [id, document.getElementById(id).textContent]).concat([['alt', document.getElementById('label').alt]]));
        });
        assert.deepEqual(result, { product: 'NexoWatt EOS Admin', package: 'iobroker.eos-admin', legal: 'ioBroker', log: 'ioBroker', attribution: 'Copyright ioBroker GmbH', dynamic: 'NexoWatt EOS', alt: 'NexoWatt EOS Admin' });
        const evidence = { schemaVersion: 1, test: 'shipped-admin-branding-browser-fixture', testedAt: new Date().toISOString(), passed: true, browser: await browser.version(), node: process.version, environment: 'Linux x86_64 fixture; no real controller/accounts/devices', externalRequests: 'blocked', checks: ['real login visible and branded at 1280px and 390px', 'logo decodes without upstream asset', 'installer/enduser portal does not bootstrap raw Admin React', 'installer scoped settings/account dialogs remain accessible above portal', 'enduser has no installer controls', 'mandatory password setup precedes the portal', 'service own-password view sends long passphrase to scoped HTTP endpoint with correct header', 'failed security context remains closed and visible', 'exact product labels and late DOM content use EOS', 'technical identifiers and legal/code attribution remain unchanged'], screenshots };
        fs.writeFileSync(path.join(output, 'browser-verification.json'), `${JSON.stringify(evidence, null, 2)}\n`);
        console.log(JSON.stringify(evidence));
    } finally {
        await browser?.close();
        await new Promise(resolve => server.close(resolve));
    }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
