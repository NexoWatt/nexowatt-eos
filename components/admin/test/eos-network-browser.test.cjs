'use strict';

// Real Chromium, exact shipped assets; API is an explicit in-memory fixture.
// This checks browser interaction, not the Linux networking or live login flow.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const clone = value => JSON.parse(JSON.stringify(value));
const CONFIG = { interface: 'enx001122334455', mac: '00:11:22:33:44:55', address: '192.168.250.1', prefixLength: 24,
    dhcpStart: '192.168.250.100', dhcpEnd: '192.168.250.199', dnsServers: ['9.9.9.9'], reservations: [], listeners: [] };

async function fixture(role = 'admin', mobile = false) {
    const browser = await chromium.launch({ headless: true, executablePath: process.env.EOS_NETWORK_BROWSER_EXECUTABLE || undefined, args: ['--no-sandbox'] });
    const page = await browser.newPage({ timezoneId: 'UTC', viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } });
    const calls = [];
    const faults = [];
    page.on('pageerror', error => faults.push(error.message));
    let unavailable = false;
    let state = { ok: true, configured: true, config: clone(CONFIG),
        interfaces: [
            { name: 'eth0', mac: '00:aa:bb:cc:dd:ee', permanentMac: '00:aa:bb:cc:dd:ee', defaultRoute: true, kind: 'ether', managed: true },
            { name: CONFIG.interface, mac: CONFIG.mac, permanentMac: CONFIG.mac, defaultRoute: false, kind: 'ether', managed: 'eos' },
        ],
        leases: [{ mac: '02:aa:bb:cc:dd:10', ip: '192.168.250.110', hostname: '<img src=x onerror=alert(1)>', expiresAt: 1792492200, active: true, reserved: false }],
        grants: [], pending: null,
    };
    await page.route('https://eos.example/**', async route => {
        const request = route.request();
        const pathname = new URL(request.url()).pathname;
        if (pathname.startsWith('/nexowatt/network/')) {
            const operation = pathname.split('/').pop();
            const body = request.postDataJSON(); calls.push({ operation, body, method: request.method(), headers: request.headers() });
            if (unavailable) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'NETWORK_UNAVAILABLE' }) });
            if (operation === 'status') return route.fulfill({ contentType: 'application/json', body: JSON.stringify(state) });
            if (operation === 'apply') { state.config = body.config; state.pending = { transactionId: 'test-transaction-0123456789', expiresAt: Math.floor(Date.now() / 1000) + 90 }; }
            if (operation === 'confirm') state.pending = null;
            if (operation === 'reservation') {
                state.leases[0].reserved = body.reserved;
                state.config.reservations = body.reserved ? [{ mac: body.mac, ip: body.ip }] : [];
            }
            if (operation === 'grant') state.grants = [{ mac: body.mac, ip: body.ip, expiresAt: Math.floor(Date.now() / 1000) + body.durationSeconds }];
            if (operation === 'revoke') state.grants = [];
            return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, ...(state.pending ? { pending: state.pending } : {}) }) });
        }
        if (pathname === '/js/eos-network.js') return route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(path.join(root, 'adminWww/js/eos-network.js'), 'utf8') });
        if (pathname === '/css/eos-network.css') return route.fulfill({ contentType: 'text/css', body: fs.readFileSync(path.join(root, 'adminWww/css/eos-network.css'), 'utf8') });
        return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang="de"><head><meta charset="utf-8"><link rel="stylesheet" href="/css/eos-network.css"></head><body><script>window.NEXOWATT_EOS_ACCESS_ROLE=${JSON.stringify(role)};window.NEXOWATT_EOS_DOM_COORDINATOR={subscribe(callback){const observer=new MutationObserver(callback);observer.observe(document.documentElement,{childList:true,subtree:true});return ()=>observer.disconnect();}}</script>${role === 'installer' ? '<div class="eos-basic-settings-actions"></div>' : '<div role="dialog" aria-labelledby="system-settings-dialog-title"><div class="MuiDialogContent-root"></div></div>'}<script src="/js/eos-network.js"></script></body></html>` });
    });
    await page.goto('https://eos.example/');
    return { browser, page, calls, faults, unavailable(value) { unavailable = value; }, state() { return state; } };
}

test('browser config preview, invalidation, pending confirmation and field selection', async () => {
    const f = await fixture();
    try {
        await f.page.getByRole('button', { name: 'Netzwerk · Gerätenetz und DHCP' }).click();
        await f.page.getByText('Gerätenetz eingerichtet · Internet standardmäßig gesperrt').waitFor();
        assert.equal(await f.page.locator('select[name="interface"] option[value="eth0"]').evaluate(option => option.disabled), true);
        assert.equal(await f.page.getByRole('button', { name: 'Übernehmen und prüfen' }).isDisabled(), true);
        await f.page.getByRole('button', { name: 'Konfiguration prüfen', exact: true }).click();
        await f.page.getByText('Konfiguration geprüft. Sie können sie jetzt übernehmen.').waitFor();
        assert.equal(await f.page.getByRole('button', { name: 'Übernehmen und prüfen' }).isEnabled(), true);
        await f.page.locator('input[name="dhcpEnd"]').fill('192.168.250.198');
        assert.equal(await f.page.getByRole('button', { name: 'Übernehmen und prüfen' }).isDisabled(), true);
        await f.page.getByRole('button', { name: 'Konfiguration prüfen', exact: true }).click();
        await f.page.getByRole('button', { name: 'Übernehmen und prüfen' }).click();
        await f.page.getByText('Netzwerkänderung wartet auf Bestätigung').waitFor();
        assert.equal(await f.page.locator('input[name="address"]').isDisabled(), true);
        await f.page.getByRole('button', { name: 'Verbindung funktioniert – bestätigen' }).click();
        await f.page.getByText('Die Netzwerkkonfiguration wurde bestätigt.').waitFor();
        assert.equal(f.state().pending, null);
        assert.deepEqual(f.calls.find(call => call.operation === 'preview').body.config, CONFIG, 'disabled controls preserve the exact reviewed configuration');
        assert.equal(f.calls.find(call => call.operation === 'apply').body.config.dhcpEnd, '192.168.250.198');
        for (const call of f.calls.filter(call => call.operation !== 'status')) {
            assert.equal(call.method, 'POST'); assert.equal(call.headers['x-nexowatt-eos-network'], '1');
        }
        assert.deepEqual(f.faults, []);
    } finally { await f.browser.close(); }
});

test('browser DHCP reservation checkbox, timed grant and immediate revocation', async () => {
    const f = await fixture();
    try {
        await f.page.getByRole('button', { name: 'Netzwerk · Gerätenetz und DHCP' }).click();
        const checkbox = f.page.getByRole('checkbox', { name: 'IP 192.168.250.110 immer 02:aa:bb:cc:dd:10 zuordnen' });
        await checkbox.check();
        await f.page.getByText('Die feste IP-Zuordnung wurde aktualisiert.').waitFor();
        assert.equal(f.state().config.reservations[0].ip, '192.168.250.110');
        assert.match(await f.page.locator('.eos-network-table').textContent(), /DHCP bis 10:30:00/);
        assert.equal(await f.page.locator('.eos-network-table img').count(), 0, 'Untrusted DHCP names are text, never HTML');
        await f.page.getByRole('combobox', { name: 'Wartungsdauer für 192.168.250.110' }).selectOption('300');
        await f.page.getByRole('button', { name: 'Freigeben', exact: true }).click();
        await f.page.getByRole('button', { name: 'Jetzt sperren' }).waitFor();
        assert.equal(f.calls.find(call => call.operation === 'grant').body.durationSeconds, 300);
        await f.page.getByRole('button', { name: 'Jetzt sperren' }).click();
        await f.page.getByText('Die Internetfreigabe wurde beendet.').waitFor();
        assert.deepEqual(f.state().grants, []); assert.deepEqual(f.faults, []);
    } finally { await f.browser.close(); }
});

test('browser mobile installer entry, keyboard closure and unavailable helper', async () => {
    const f = await fixture('installer', true);
    try {
        await f.page.getByRole('button', { name: 'Netzwerk · Gerätenetz und DHCP' }).click();
        await f.page.getByText('Gerätenetz eingerichtet · Internet standardmäßig gesperrt').waitFor();
        assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
        assert.equal(await f.page.locator('.eos-network-dialog').evaluate(dialog => dialog.scrollWidth <= dialog.clientWidth), true, 'form fits the mobile dialog without horizontal clipping');
        if (process.env.EOS_NETWORK_SCREENSHOT) {
            await f.page.screenshot({ path: process.env.EOS_NETWORK_SCREENSHOT, fullPage: true });
            await f.page.locator('.eos-network-devices').scrollIntoViewIfNeeded();
            await f.page.screenshot({ path: process.env.EOS_NETWORK_SCREENSHOT.replace(/\.png$/, '-devices.png'), fullPage: true });
        }
        f.unavailable(true);
        await f.page.getByRole('button', { name: 'Status aktualisieren', exact: true }).click();
        await f.page.getByText('Netzwerkstatus unbekannt · Verbindung zum Netzwerkdienst prüfen').waitFor();
        assert.equal(await f.page.locator('.eos-network-state').getAttribute('data-kind'), 'unknown');
        assert.equal(await f.page.locator('.eos-network-table').count(), 0, 'stale leases and grants are removed after read failure');
        assert.equal(await f.page.getByText('Gerätenetz eingerichtet · Internet standardmäßig gesperrt').count(), 0);
        await f.page.keyboard.press('Escape');
        assert.equal(await f.page.locator('.eos-network-overlay').count(), 0);
        f.unavailable(true);
        await f.page.getByRole('button', { name: 'Netzwerk · Gerätenetz und DHCP' }).click();
        await f.page.getByText('Der EOS-Netzwerkdienst ist noch nicht verfügbar.', { exact: false }).waitFor();
        assert.equal(await f.page.getByRole('button', { name: 'Konfiguration prüfen', exact: true }).isDisabled(), true);
        assert.deepEqual(f.faults, []);
    } finally { await f.browser.close(); }
});

test('browser customer role exposes no entry or data and removes stale privilege view', async () => {
    const f = await fixture('enduser');
    try {
        assert.equal(await f.page.locator('.eos-network-entry').count(), 0);
        await f.page.evaluate(() => window.NEXOWATT_EOS_NETWORK.open());
        assert.equal(await f.page.locator('.eos-network-overlay').count(), 0);
        assert.deepEqual(f.calls, []);
        await f.page.evaluate(() => { window.NEXOWATT_EOS_ACCESS_ROLE = 'installer'; document.body.append(document.createElement('span')); });
        await f.page.getByRole('button', { name: 'Netzwerk · Gerätenetz und DHCP' }).click();
        await f.page.getByText('Gerätenetz eingerichtet · Internet standardmäßig gesperrt').waitFor();
        await f.page.evaluate(() => { window.NEXOWATT_EOS_ACCESS_ROLE = 'enduser'; document.body.append(document.createElement('span')); });
        await f.page.locator('.eos-network-overlay').waitFor({ state: 'detached' });
        assert.deepEqual(f.faults, []);
    } finally { await f.browser.close(); }
});

test('network source and shipped browser assets remain byte-identical with both HTML entries', () => {
    for (const name of ['js/eos-network.js', 'css/eos-network.css']) {
        assert.deepEqual(fs.readFileSync(path.join(root, 'src-admin/public', name)), fs.readFileSync(path.join(root, 'adminWww', name)));
    }
    for (const name of ['src-admin/index.html', 'adminWww/index.html']) {
        const html = fs.readFileSync(path.join(root, name), 'utf8');
        assert.match(html, /eos-network\.js\?eos=20261020/); assert.match(html, /eos-network\.css\?eos=20261020/);
    }
});
