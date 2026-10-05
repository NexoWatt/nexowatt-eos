// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: www/license.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * www/license.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Produktive Originalquellen liegen unter
 * src-ts/runtime-executables/ bzw. den im generierten JS genannten TS-Pfaden.
 * Dort ändern, Laufzeit erzeugen und danach die Spiegel synchronisieren.
 * Build-/Prüfskripte ohne TS-Original werden weiterhin unter scripts/ gepflegt.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: 056379de0234a2abdd0096d81a9ede903f4831b4da0bdff6965a0bfc2670e1f5
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

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
/**
 * Code-Teil: refresh
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
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
