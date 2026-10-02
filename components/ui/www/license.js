/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/www/license.ts
 * Quell-Hash: sha256:559759f0d78ea4b9d15abb8fec1996dc07b4e18e20d0adbbffdabac399cad4de
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
    async function refresh() {
        if (!(await window.NW_AUTH?.requireCapability('license.manage', { pageName: 'Lizenz', requiredRole: 'Admin' })))
            return;
        try {
            const response = await fetch('/api/license/info', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(5000) });
            if (!response.ok)
                throw new Error('Nicht verfügbar');
            const info = await response.json();
            if (status)
                status.textContent = info.valid === true ? 'Zentrale Lizenz gültig. Gerätesteuerung bleibt im Testprofil gesperrt.' : 'Keine aktuelle Lizenzfreigabe. Bitte die Lizenz im EOS Admin prüfen.';
        }
        catch (_) {
            if (status)
                status.textContent = 'Lizenzstatus nicht verfügbar. Bitte EOS Admin öffnen.';
        }
    }
    reload?.addEventListener('click', () => { void refresh(); });
    void refresh();
})();
