/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/www/nw-shell.ts
 * Quell-Hash: sha256:e563fd994e81448ac3712614b9b34f2d64f4a849fae3b616f68495637c0caab8
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für www/nw-shell.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Kapselt gemeinsame Browser-Rahmenfunktionen und Seitenintegration.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/www/nw-shell.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: www/nw-shell.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `www/nw-shell.js`.
 *
 * Build-Regel:
 * `npm run sync:ts-runtime-executables` erzeugt daraus die auslieferbare
 * JavaScript-Datei. Änderungen an der Runtime sollen hier vorgenommen werden;
 * die JS-Datei ist nur noch Build-Artefakt für Node.js/ioBroker bzw. den Browser.
 *
 * Sicherheit:
 * Der Inhalt basiert auf der bisher produktiven JavaScript-Runtime und bleibt
 * vorübergehend mit `@ts-nocheck` ausführbar. Fachliche TS-Helfer wie EVCS,
 * Energiefluss, Core-Limits und Heizstab bleiben die bereits typisierten Quellen.
 */

/**
 * NexoWatt Detail-Kommentar (DE)
 * Zweck dieser Ergänzung:
 * - Jede relevante Funktion, Methode, Route und UI-Ereignisbindung erhält einen eigenen Erklärungskommentar.
 * - Die Kommentare beschreiben Aufgabe, Daten-/API-Zusammenhang und TypeScript-Migrationshinweise.
 * - Es wurde keine Programmlogik geändert; diese Datei wurde nur für Wartbarkeit und spätere Typisierung dokumentiert.
 */

/**
 * Datei: www/nw-shell.js
 * Rolle im Projekt: Frontend-Skript.
 * Zweck: Browserseitiger Code für eine Kunden-/Installerseite; liest APIs und aktualisiert DOM/UI.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Frontend-Skript einer VIS-/Kundenseite oder eines Reports.
 * Zusammenhänge:
 * - Spricht mit APIs aus main.js und rendert Daten aus /api/state, /config oder Reports.
 * - Styles liegen in www/styles.css bzw. Report-CSS-Dateien.
 * Wartungshinweise:
 * - Feature-Sichtbarkeit und Rollen beachten; Kundenfrontend darf keine Installerfunktionen öffnen.
 */

(function () {
  'use strict';
  /**
   * Code-Teil: ready
   * Zweck: Liest Werte mit Fallbacks aus Cache/State/Config.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  /**
   * Code-Teil: nwNormalizeBrandHeader
   * Zweck: Entfernt den alten sichtbaren EMS-Zusatz aus der Topbar-Marke.
   * Zusammenhang: Shell-Seiten bleiben konsistent zur neuen NexoWatt-Brand ohne
   * die fachlichen EMS-Status-/Modulbezeichnungen umzubenennen.
   */
  function nwApplySystemLanguageFromConfig() {
    try {
      fetch('/config', { cache: 'no-store', credentials: 'same-origin' })
        .then(function (res) { return res && res.ok ? res.json() : null; })
        .then(function (cfg) {
          try {
            var loc = cfg && cfg.locale && typeof cfg.locale === 'object' ? cfg.locale : {};
            var lang = String(loc.htmlLang || loc.language || '').trim().toLowerCase();
            if (lang) document.documentElement.setAttribute('lang', lang);
            window.__nwLocale = loc || {};
          } catch (_e2) {}
        })
        .catch(function () {});
    } catch (_e) {}
  }

  function nwNormalizeBrandHeader() {
    try {
      var titles = Array.prototype.slice.call(document.querySelectorAll('.topbar h1, header.topbar h1'));
      titles.forEach(function (el) {
        var text = String(el && el.textContent || '').replace(/\s+/g, ' ').trim();
        if (text === 'NexoWatt EMS' || text === 'NexoWatt') el.textContent = 'NexoWatt EOS';
      });
      var pwaTitles = Array.prototype.slice.call(document.querySelectorAll('meta[name="apple-mobile-web-app-title"]'));
      pwaTitles.forEach(function (el) {
        if (el && ['NexoWatt EMS','NexoWatt'].includes(el.getAttribute('content'))) el.setAttribute('content', 'NexoWatt EOS');
      });
      if (typeof document.title === 'string' && /^NexoWatt(?: EMS)?\b/.test(document.title) && !/^NexoWatt EOS\b/.test(document.title)) {
        document.title = document.title.replace(/^NexoWatt(?: EMS)?\b/, 'NexoWatt EOS');
      }
    } catch (_e) {}
  }
  /**
   * Code-Teil: ready
   * Zweck: Liest Werte mit Fallbacks aus Cache/State/Config.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  ready(function () {
    nwNormalizeBrandHeader();
    nwApplySystemLanguageFromConfig();
    var btn = document.getElementById('menuBtn');
    var menu = document.getElementById('menuDropdown');
    if (btn && menu && !btn.dataset.nwMenuBound && !btn.dataset.nwShellBound) {
      btn.dataset.nwShellBound = '1';
      btn.dataset.nwMenuBound = btn.dataset.nwMenuBound || 'shell-capture';

      /**
       * Burger-Menü-Härtung 0.8.21:
       * Viele Seiten bringen eigene Menü-Handler mit und laden zusätzlich `nw-shell.js`.
       * Zwei normale Bubble-Handler toggeln das Dropdown nacheinander: geöffnet -> wieder
       * geschlossen. Die Shell übernimmt den Menübutton deshalb im Capture-Flow und stoppt
       * ausschließlich diesen Button-Klick. Menüeinträge, Einstellungslinks und Seitenlogik
       * bleiben davon unberührt.
       */
      function nwSetMenuOpen(open) {
        try {
          if (open) menu.classList.remove('hidden');
          else menu.classList.add('hidden');
          btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        } catch (_eSetMenu) {}
      }
      function nwToggleMenu(e) {
        try { if (e) e.preventDefault(); } catch (_ePrevent) {}
        try { if (e) e.stopPropagation(); } catch (_eStop) {}
        try { if (e && typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation(); } catch (_eStopImmediate) {}
        try { nwSetMenuOpen(menu.classList.contains('hidden')); } catch (_eToggle) {}
      }

      // Ereignis-Kommentar: Bindet den zentralen Burger-Menühandler an btn. Capture=true verhindert doppelte Toggle-Handler aus Seitenskripten.
      btn.addEventListener('click', nwToggleMenu, true);

      // Ereignis-Kommentar: Klicks außerhalb von Menü und Button schließen das Dropdown.
      document.addEventListener('click', function (e) {
        try {
          if (menu.classList.contains('hidden')) return;
          var target = e && e.target ? e.target : null;
          if (target && (menu.contains(target) || btn.contains(target))) return;
        } catch (_eDoc) {}
        nwSetMenuOpen(false);
      });

      // Ereignis-Kommentar: Escape schließt das Burger-Menü; wichtig für Desktop/Servicezugriff.
      document.addEventListener('keydown', function (e) {
        try { if (e && e.key === 'Escape') nwSetMenuOpen(false); } catch (_eKey) {}
      });

      // Ereignis-Kommentar: Klicks innerhalb des Menüs dürfen nicht als Außenklick gewertet werden.
      menu.addEventListener('click', function (e) { try { e.stopPropagation(); } catch (_eMenu) {} });
    }

    // Allow links like ems-apps.html#storagefarm to open the corresponding App-Center tab.
    if (location.hash) {
      var wanted = location.hash.slice(1);
      window.setTimeout(function () {
        var tabs = Array.prototype.slice.call(document.querySelectorAll('.nw-tab[data-tab]'));
        var tab = tabs.find(function (el) { return el.getAttribute('data-tab') === wanted; });
        if (tab) tab.click();
      }, 180);
    }
  });
})();
