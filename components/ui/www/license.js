/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/www/license.ts
 * Quell-Hash: sha256:d8b8ad9434ccab95c1e08a9299354dcb9caad887b8edbe2979b27e3afd27e5cd
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für www/license.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
(function () {
    'use strict';
    const status = document.getElementById('nw-license-status');
    const admin = document.getElementById('nw-license-back');
    const reload = document.getElementById('nw-license-reload');
    if (admin) {
        const target = new URL(window.location.href);
        target.protocol = 'https:';
        target.port = '8081';
        target.pathname = '/';
        target.search = '';
        target.hash = '';
        admin.href = target.toString();
    }
    let refreshing = false;
    let expires;
    async function refresh() {
        if (refreshing)
            return;
        refreshing = true;
        try {
            if (!(await window.NW_AUTH?.requireCapability('license.manage', { pageName: 'Lizenz', requiredRole: 'Admin' }))) {
                if (status)
                    status.textContent = 'Admin-Anmeldung erforderlich.';
                return;
            }
            const response = await fetch('/api/license/info', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(5000) });
            if (!response.ok)
                throw new Error('Nicht verfügbar');
            const info = await response.json();
            const edition = info.edition === 'hems' ? 'Home' : info.edition === 'eos' ? 'Pro' : '';
            const current = info.valid === true && edition && typeof info.validUntil === 'number' && info.validUntil > Date.now() && info.validUntil <= Date.now() + 15000;
            if (expires)
                clearTimeout(expires);
            if (current)
                expires = setTimeout(() => { if (status)
                    status.textContent = 'Lizenzfreigabe abgelaufen. Zentralen Status neu laden.'; }, Math.max(0, info.validUntil - Date.now()));
            if (status)
                status.textContent = current ? `Zentrale ${edition}-Lizenz aktiv. Die UI ist freigeschaltet; Gerätesteuerung bleibt im Testprofil gesperrt.` : 'Keine aktuelle Lizenzfreigabe. Bitte die Lizenz im EOS Admin prüfen.';
        }
        catch (_) {
            if (status)
                status.textContent = 'Lizenzstatus nicht verfügbar. Bitte EOS Admin öffnen.';
        }
        finally {
            refreshing = false;
        }
    }
    reload?.addEventListener('click', () => { void refresh(); });
    void refresh();
    setInterval(() => { void refresh(); }, 5000);
})();
