'use strict';
// Mocked UI preview only: no ioBroker, real HTTP authorization, keys or devices.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { chromium } = require(`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`);
const root = path.resolve(__dirname, '../../..');
const out = __dirname;
const htmlSource = fs.readFileSync(path.join(root, 'public/nexowatt-license.html'), 'utf8');
const scriptSource = fs.readFileSync(path.join(root, 'public/nexowatt-license.js'), 'utf8');
const sha256 = data => createHash('sha256').update(data).digest('hex');
const executablePath = process.env.EOS_UI_PREVIEW_CHROMIUM;
if (!executablePath) throw Error('Set EOS_UI_PREVIEW_CHROMIUM to an installed Chromium executable');
const results = [];
const issues = [];
const passed = name => results.push({ name, result: 'passed' });
const home = {
    v: 1, valid: true, code: 'LICENSE_VALID', uuid: '00000000-0000-4000-8000-000000000000',
    edition: 'home', expiresAt: null, limits: { chargePoints: 3, batteries: 2 },
    features: ['energy', 'wallet', 'smartHome', 'microgridSlave'],
};
const pro = { ...home, edition: 'pro', limits: { chargePoints: 20, batteries: 10 },
    features: [...home.features, 'microgridMaster', 'multisite', 'billing'] };
const denied = { ...home, valid: false, code: 'LICENSE_MISSING', edition: null, limits: {}, features: [] };

(async () => {
    const browser = await chromium.launch({ executablePath, headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-background-networking'] });
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
        const pageErrors = [];
        page.on('pageerror', error => pageErrors.push(error.message));
        let state = home;
        let statusHttp = 200;
        let activateHttp = 200;
        await page.route('**/*', async route => {
            const request = route.request();
            const target = new URL(request.url());
            if (target.hostname !== 'license-preview.invalid') return route.abort();
            if (target.pathname === '/nexowatt/license/') return route.fulfill({
                contentType: 'text/html', body: htmlSource,
            });
            if (target.pathname === '/nexowatt/license/app.js') return route.fulfill({
                contentType: 'text/javascript', body: scriptSource,
            });
            if (target.pathname === '/nexowatt/license/status') return route.fulfill({
                status: statusHttp, json: statusHttp === 200 ? state : { error: 'LICENSE_ADMIN_REQUIRED' },
            });
            if (target.pathname === '/nexowatt/license/activate') {
                assert.equal(request.method(), 'POST');
                assert.equal(request.headers()['x-eos-license'], '1');
                assert.equal(request.postDataJSON().token, 'NWL2.MOCK_NOT_A_REAL_LICENSE');
                if (activateHttp === 200) state = pro;
                return route.fulfill({ status: activateHttp,
                    json: activateHttp === 200 ? state : { error: 'LICENSE_SIGNATURE_INVALID' } });
            }
            return route.fulfill({ status: 404, body: '' });
        });
        await page.goto('https://license-preview.invalid/nexowatt/license/');
        await page.locator('#status').filter({ hasText: 'Lizenz gültig.' }).waitFor();
        assert.equal(await page.locator('#edition').textContent(), 'EOS Home');
        assert.equal(await page.locator('#limits').textContent(), '3 / 2');
        await page.screenshot({ path: path.join(out, 'home-desktop.png'), fullPage: true });
        passed('Home status, limits, localized functions and desktop screenshot');

        await page.locator('#token').fill('NWL2.MOCK_NOT_A_REAL_LICENSE');
        await page.locator('#activate').click();
        await page.locator('#message').filter({ hasText: 'Lizenz geprüft und verschlüsselt gespeichert.' }).waitFor();
        assert.equal(await page.locator('#token').inputValue(), '');
        assert.equal(await page.locator('#edition').textContent(), 'EOS Pro');
        assert.equal(await page.locator('#limits').textContent(), '20 / 10');
        assert.match(await page.locator('#features').textContent(), /Abrechnung/);
        await page.screenshot({ path: path.join(out, 'pro-desktop.png'), fullPage: true });
        passed('Activation success clears synthetic code and displays Pro; request POST/header asserted');

        activateHttp = 400;
        await page.locator('#token').fill('NWL2.MOCK_NOT_A_REAL_LICENSE');
        await page.locator('#activate').click();
        await page.locator('#message').filter({ hasText: 'Die Signatur ist ungültig.' }).waitFor();
        assert.equal(await page.locator('#token').inputValue(), '');
        assert.equal(await page.locator('#edition').textContent(), 'EOS Pro');
        assert.equal(await page.locator('#activate').isEnabled(), true);
        passed('Activation failure clears synthetic code, displays sanitized error, preserves previous edition details and restores controls');

        for (const httpCode of [401, 403]) {
            statusHttp = 200;
            await page.locator('#refresh').click();
            await page.locator('#status').filter({ hasText: 'Lizenz gültig.' }).waitFor();
            statusHttp = httpCode;
            await page.locator('#refresh').click();
            await page.locator('#message').filter({ hasText: 'Bitte mit einem Administrator-Konto anmelden.' }).waitFor();
            assert.equal(await page.locator('#refresh').isEnabled(), true);
            assert.equal(await page.locator('#status').textContent(), 'Status derzeit nicht bestätigt.');
            assert.equal(await page.locator('#status').getAttribute('class'), 'status error');
            passed(`HTTP ${httpCode} marks previously valid status unconfirmed/error, renders administrator-required message and releases busy buttons`);
        }
        await page.screenshot({ path: path.join(out, 'request-denied-desktop.png'), fullPage: true });

        statusHttp = 200;
        const attack = '<img src=x onerror="window.__eosPreviewXss=1">';
        state = { ...denied, code: attack, uuid: attack, features: [attack] };
        await page.locator('#refresh').click();
        await page.locator('#status').filter({ hasText: attack }).waitFor();
        assert.equal(await page.locator('#uuid').textContent(), attack);
        assert.equal(await page.locator('img').count(), 0);
        assert.equal(await page.evaluate(() => window.__eosPreviewXss), undefined);
        passed('Status code, UUID and function HTML payload remain literal text; no injected DOM or script execution');

        state = denied;
        await page.setViewportSize({ width: 360, height: 780 });
        await page.locator('#refresh').click();
        await page.locator('#status').filter({ hasText: 'Keine Lizenz aktiviert.' }).waitFor();
        assert.equal(await page.locator('#edition').textContent(), '–');
        assert.equal(await page.locator('#limits').textContent(), '–');
        const geometry = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth,
            body: document.body.scrollWidth, textarea: document.getElementById('token').getBoundingClientRect().toJSON() }));
        assert.ok(geometry.document <= geometry.viewport, JSON.stringify(geometry));
        assert.ok(geometry.body <= geometry.viewport, JSON.stringify(geometry));
        assert.ok(geometry.textarea.x >= 0 && geometry.textarea.right <= geometry.viewport, JSON.stringify(geometry));
        await page.screenshot({ path: path.join(out, 'missing-license-mobile.png'), fullPage: true });
        passed('Missing-license status clears edition/limits; 360px mobile viewport has no horizontal overflow');
        assert.deepEqual(pageErrors, []);
        passed('No browser pageerror during mocked scenarios');
        const evidence = { timestamp: new Date().toISOString(), browser: await browser.version(),
            sourceHashes: { 'public/nexowatt-license.html': sha256(htmlSource), 'public/nexowatt-license.js': sha256(scriptSource) },
            scope: 'Mocked UI preview using intercepted responses; not an ioBroker, authorization middleware, encryption or hardware integration test.',
            viewport: ['1440x1100', '360x780'], results, issues,
            closedFindings: [{ id: 'UI-PREVIEW-01', firstObserved: '2026-09-30T17:32:24.839Z',
                originalFinding: 'Refresh HTTP403 preserved the previous green valid status beside an error message.',
                fix: 'The request error handler now marks the status unconfirmed with the error style.',
                retest: 'Passed actual Playwright assertions for HTTP401 and HTTP403 starting from a valid Pro status.' }] };
        fs.writeFileSync(path.join(out, 'evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
        fs.writeFileSync(path.join(out, 'README.md'), `# Lizenzverwaltung: simulierte Browserprüfung\n\n`
            + `Ausgeführt: ${evidence.timestamp}; Chromium ${evidence.browser}.\n\n`
            + `Umfang: lokale HTML-/JS-Dateien mit vollständig abgefangenen, simulierten Antworten. Keine Verbindung zu ioBroker, Hersteller-Keygen, Geräten oder Produktivdaten. Diese Prüfung weist weder echte HTTP-Zugriffskontrolle noch Verschlüsselung nach.\n\n`
            + `${results.length} Prüffälle bestanden. Home/Pro-Anzeige, Codefeld-Löschung bei erfolgreicher und fehlgeschlagener Aktivierung, 403-Fehleranzeige, reine Textausgabe von HTML-Testwerten, keine JavaScript-Seitenfehler, kein horizontaler Überlauf bei 360 Pixeln. Desktop- und Mobilbilder wurden visuell auf Lesbarkeit, Abschneiden und Überlagerungen geprüft.\n\n`
            + (issues.length ? `Offener UI-Hinweis UI-PREVIEW-01: Nach einer abgewiesenen Statusaktualisierung bleibt der vorherige grüne Gültigkeitstext neben der Fehlermeldung sichtbar. Der Status sollte dann als nicht bestätigt gekennzeichnet sein. Dies beeinflusst nicht die serverseitige Lizenzentscheidung.\n\n` : `Keine offenen Befunde in diesem begrenzten Prüfumfang.\n\n`)
            + `UI-PREVIEW-01 wurde beim ersten Lauf gefunden und anschließend behoben: Bei HTTP 401/403 blieb zuvor der alte grüne Gültigkeitstext sichtbar. Der Nachtest startet jeweils mit gültigem Pro-Status und bestätigt jetzt den Text „Status derzeit nicht bestätigt.“ mit Fehlerdarstellung. Details unter \`closedFindings\` in den Rohdaten.\n\n`
            + `Rohdaten und SHA-256 der tatsächlich dargestellten Quellen: [evidence.json](evidence.json). Screenshots liegen im selben Verzeichnis.\n\n`
            + `Wiederholung aus dem Repository: \`EOS_UI_PREVIEW_CHROMIUM=/pfad/zu/chromium node reports/security/ui-preview/run-preview.cjs\`. Zusätzlich muss \`CODEX_PRIMARY_RUNTIME_NODE_MODULES\` auf eine Laufzeit mit installiertem Playwright zeigen.\n`);
        console.log(JSON.stringify(evidence, null, 2));
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
