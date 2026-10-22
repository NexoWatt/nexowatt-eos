'use strict';
// Real Chromium interaction, explicit HTTP fixtures; no real update or Pi test.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
async function fixture(role = 'admin', mobile = false) {
    const browser = await chromium.launch({ headless: true, executablePath: process.env.EOS_UPDATE_BROWSER_EXECUTABLE || undefined, args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } });
    const calls = [], faults = [];
    page.on('pageerror', error => faults.push(error.message));
    let state = { ok: true, phase: 'AVAILABLE', busy: false, installed: { sequence: 15, nodeVersion: '24.22.1' },
        automaticNode: { enabled: true, mode: 'signed-node-only', major: 24,
            schedule: { timeZone: 'Europe/Berlin', start: '02:30', end: '03:00', catchUp: false },
            state: 'SCHEDULED', reason: null, lastAttempt: null },
        osUpdates: { schemaVersion: 1, availability: 'available', health: 'warning', summary: {
            state: 'attention', lastAttemptAt: '2026-10-22T02:00:00Z', lastSuccessAt: '2026-10-22T02:00:00Z',
            policy: { automatic: true, serviceRestartPolicy: 'defer-package-service-actions' }, timers: { enabled: true, active: true },
            pending: { securityCount: 2, blockedSecurityCount: 1, heldSecurityCount: 0 },
            activation: { state: 'required', serviceRestartCount: 1, sessionRestartCount: 0, serviceActionsDeferred: true },
            reboot: { state: 'required' }, coverage: { state: 'gap', gapCount: 1, maintenanceDeferred: false } } },
        candidate: { releaseId: 'a'.repeat(64), sequence: 16, nodeVersion: '24.23.1', notes: '<img src=x onerror=alert(1)> Geprüfte Anpassung' } };
    await page.route('https://eos.example/**', route => {
        const request = route.request(), pathname = new URL(request.url()).pathname;
        if (pathname.startsWith('/nexowatt/managed-updates/')) {
            const operation = pathname.split('/').pop(), body = request.postDataJSON(); calls.push({ operation, body });
            if (operation === 'install') state = { ...state, phase: 'INSTALLING', busy: true };
            return route.fulfill({ contentType: 'application/json', body: JSON.stringify(state) });
        }
        if (pathname === '/js/eos-system-updates.js') return route.fulfill({ contentType: 'application/javascript; charset=utf-8', body: fs.readFileSync(path.join(__dirname, '../adminWww/js/eos-system-updates.js'), 'utf8') });
        if (pathname === '/css/eos-system-updates.css') return route.fulfill({ contentType: 'text/css', body: fs.readFileSync(path.join(__dirname, '../adminWww/css/eos-system-updates.css'), 'utf8') });
        return route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<!doctype html><html lang="de"><head><meta charset="utf-8"><link rel="stylesheet" href="/css/eos-system-updates.css"></head><body><script>window.NEXOWATT_EOS_ACCESS_ROLE=${JSON.stringify(role)};window.NEXOWATT_EOS_DOM_COORDINATOR={subscribe(fn){const m=new MutationObserver(fn);m.observe(document.documentElement,{childList:true,subtree:true});return ()=>m.disconnect();}}</script><div class="eos-basic-settings-actions"></div><script src="/js/eos-system-updates.js"></script></body></html>` });
    });
    await page.goto('https://eos.example/');
    return { browser, page, calls, faults, setState(patch) { state = { ...state, ...patch }; }, complete() { state = { ...state, phase: 'SUCCEEDED', busy: false }; } };
}
test('update needs maintenance confirmation, uses only selected ID, escapes notes and survives dialog close/reopen', async () => {
    const f = await fixture();
    try {
        await f.page.getByRole('button', { name: 'EOS-Updates', exact: true }).click();
        const install = f.page.getByRole('button', { name: 'Update installieren', exact: true });
        await install.waitFor(); assert.equal(await install.isDisabled(), true);
        assert.equal(await f.page.locator('.eos-system-updates img').count(), 0);
        await f.page.getByRole('checkbox').check(); await install.click();
        await f.page.getByText('EOS wird aktualisiert.', { exact: false }).waitFor();
        await f.page.getByRole('button', { name: 'Schließen', exact: true }).click(); f.complete();
        await f.page.getByRole('button', { name: 'EOS-Updates', exact: true }).click();
        await f.page.getByRole('button', { name: 'Admin neu laden' }).waitFor();
        assert.deepEqual(f.calls.filter(c => c.operation === 'install'), [{ operation: 'install', body: { releaseId: 'a'.repeat(64), maintenanceConfirmed: true } }]);
        assert.deepEqual(f.faults, []);
    } finally { await f.browser.close(); }
});
test('customer has no update entry; mobile installer dialog stays inside viewport', async () => {
    const user = await fixture('enduser');
    try { assert.equal(await user.page.getByRole('button', { name: 'EOS-Updates' }).count(), 0); } finally { await user.browser.close(); }
    const f = await fixture('installer', true);
    try {
        await f.page.getByRole('button', { name: 'EOS-Updates' }).click();
        await f.page.getByRole('button', { name: 'Update installieren' }).waitFor();
        const box = await f.page.locator('.eos-system-updates').boundingBox();
        assert.ok(box.x >= 0 && box.x + box.width <= 390); assert.deepEqual(f.faults, []);
    } finally { await f.browser.close(); }
});

test('Node and Linux status remain separate; pending activation never appears as fully applied', async () => {
    const f = await fixture();
    try {
        await f.page.getByRole('button', { name: 'EOS-Updates', exact: true }).click();
        await f.page.getByText('Installierte Node.js-Laufzeit: 24.22.1', { exact: true }).waitFor();
        await f.page.getByText('Node.js im geprüften EOS-Paket: 24.23.1', { exact: true }).waitFor();
        const os = f.page.locator('[data-os-updates]');
        assert.equal(await os.getAttribute('data-health'), 'warning');
        await os.getByText('Installierte Pakete sind teilweise noch nicht wirksam.', { exact: false }).waitFor();
        await os.getByText('Paketbedingte Dienstaktionen stehen noch aus', { exact: false }).waitFor();
        await f.page.getByRole('button', { name: 'Schließen', exact: true }).click();
        f.setState({ phase: 'SUCCEEDED', candidate: null, osUpdates: { availability: 'stale', health: 'warning', summary: { state: 'ok' } } });
        await f.page.getByRole('button', { name: 'EOS-Updates', exact: true }).click();
        await f.page.getByRole('button', { name: 'Admin neu laden', exact: true }).waitFor();
        await os.getByText('Der Linux-Updatestatus ist veraltet.', { exact: false }).waitFor();
        assert.equal(await os.getAttribute('data-health'), 'warning');
        assert.deepEqual(f.faults, []);
    } finally { await f.browser.close(); }
});
test('missing Linux state is explicit and Node status text cannot inject markup', async () => {
    const f = await fixture();
    try {
        f.setState({ installed: { sequence: 15, nodeVersion: '<img src=x>' }, candidate: null, osUpdates: null });
        await f.page.getByRole('button', { name: 'EOS-Updates', exact: true }).click();
        await f.page.getByText('Installierte Node.js-Laufzeit: Unbekannt', { exact: true }).waitFor();
        await f.page.getByText('Der Zustand der Linux-Sicherheitsupdates ist momentan nicht bestätigt.', { exact: true }).waitFor();
        assert.equal(await f.page.locator('.eos-system-updates img').count(), 0);
        assert.deepEqual(f.faults, []);
    } finally { await f.browser.close(); }
});
test('automatic Node policy needs no browser install request; deferral and unknown policy stay visible', async () => {
    const f = await fixture();
    try {
        f.setState({ candidate: { releaseId: 'a'.repeat(64), sequence: 16, nodeVersion: '24.23.1', automaticNodeUpdate: true, notes: 'Node-Aktualisierung' } });
        await f.page.getByRole('button', { name: 'EOS-Updates', exact: true }).click();
        const node = f.page.locator('[data-node-updates]');
        await node.getByText('Freigegebene Node-24-Updates werden ohne Klick und ohne geöffneten Browser installiert.', { exact: true }).waitFor();
        await node.getByText('Täglich 02:30–03:00 Uhr · Europe/Berlin', { exact: true }).waitFor();
        await f.page.getByText('Dieses Angebot ist für die automatische Node-Aktualisierung vorgemerkt.', { exact: false }).waitFor();
        assert.equal(f.calls.filter(c => c.operation === 'install').length, 0);
        await f.page.getByRole('button', { name: 'Schließen', exact: true }).click();
        f.setState({ automaticNode: { enabled: true, mode: 'signed-node-only', major: 24,
            schedule: { timeZone: 'Europe/Berlin', start: '02:30', end: '03:00', catchUp: false },
            state: 'DEFERRED', reason: 'UPDATE_MAINTENANCE_BUSY', lastAttempt: '2026-10-22T00:30:00.000Z' } });
        await f.page.getByRole('button', { name: 'EOS-Updates', exact: true }).click();
        await node.getByText('Die automatische Node-Aktualisierung wurde zurückgestellt.', { exact: false }).waitFor();
        assert.equal(await node.getAttribute('data-health'), 'warning');
        await f.page.getByRole('button', { name: 'Schließen', exact: true }).click();
        f.setState({ automaticNode: null, candidate: null });
        await f.page.getByRole('button', { name: 'EOS-Updates', exact: true }).click();
        await node.getByText('Die automatische Node-Aktualisierung ist momentan nicht bestätigt.', { exact: true }).waitFor();
        assert.equal(await node.getAttribute('data-health'), 'warning');
        assert.equal(f.calls.filter(c => c.operation === 'install').length, 0);
        assert.deepEqual(f.faults, []);
    } finally { await f.browser.close(); }
});
