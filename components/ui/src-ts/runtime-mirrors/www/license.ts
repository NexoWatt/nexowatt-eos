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
 * Original-Hash: 0ac3b781ba7ce2d22b2f445016b6d1df12cbd5945278e99aa57986d33412f78a
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
