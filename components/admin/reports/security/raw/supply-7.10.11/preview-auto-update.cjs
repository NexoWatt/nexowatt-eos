'use strict';
// Reproduce with the locally installed Playwright package; the app uses no stub runtime.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'playwright'));
(async () => {
    const root = path.resolve(__dirname, '../../../..');
    const executablePath = process.env.EOS_UI_PREVIEW_CHROMIUM;
    if (!executablePath) throw new Error('Set EOS_UI_PREVIEW_CHROMIUM to an installed browser');
    const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const results = [];
    try {
        for (const width of [1280, 390]) {
            const page = await browser.newPage({ viewport: { width, height: 800 } });
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.setContent('<html><head><base href="http://127.0.0.1/"><style>body{margin:16px;font-family:sans-serif} h1{font-size:22px;overflow-wrap:anywhere}.MuiDialogContent-root{max-width:100%}</style></head><body><section role="dialog" aria-labelledby="system-settings-dialog-title"><h1 id="system-settings-dialog-title">Systemeinstellungen</h1><div class="MuiDialogContent-root"><header class="MuiAppBar-root">Updates</header></div></section></body></html>');
            await page.addStyleTag({ content: fs.readFileSync(path.join(root, 'adminWww/css/eos-auto-update.css'), 'utf8') });
            await page.evaluate(() => {
                window.NEXOWATT_EOS_ACCESS_ROLE = 'admin';
                window.fetch = async () => ({ ok: true, json: async () => ({ enabled: false, blocked: true, policy: 'none', error: 'UNATTENDED_UPDATES_BLOCKED_UNVERIFIED_RELEASE', managedAdapters: ['eos-admin', 'nexowatt-ui'], lastSync: 1790760000000 }) });
            });
            await page.addScriptTag({ content: fs.readFileSync(path.join(root, 'adminWww/js/eos-auto-update.js'), 'utf8') });
            await page.waitForSelector('#eos-nexowatt-auto-update input:disabled');
            assert.equal(await page.locator('#eos-nexowatt-auto-update input').isChecked(), false);
            assert((await page.locator('#eos-nexowatt-auto-update').innerText()).includes('Manuelle, geprüfte Updates'));
            assert.deepEqual(errors, []);
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
            assert.equal(overflow, false);
            await page.screenshot({ path: path.join(__dirname, `auto-update-${width}.png`), fullPage: true });
            results.push({ width, disabled: true, unchecked: true, manualGuidanceVisible: true, pageErrors: 0, horizontalOverflow: false });
            await page.close();
        }
        fs.writeFileSync(path.join(__dirname, 'ui-results.json'), JSON.stringify({ generatedAt: new Date().toISOString(), browser: browser.version(), mode: 'Real Chromium DOM with mocked status fetch; no live ioBroker', results }, null, 2)+'\n');
        console.log('Auto-update UI: 2 viewports, blocked/unchecked control, manual-update text, no page errors or horizontal overflow.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
