// @ts-nocheck
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Steuert gemeinsame Rahmen- und Navigationselemente des Kunden-Cockpits.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/www/cockpit-shell.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: www/cockpit-shell.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `www/cockpit-shell.js`.
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
 * Datei: www/cockpit-shell.js
 * Rolle im Projekt: Frontend-Skript.
 * Zweck: Browserseitiger Code für eine Kunden-/Installerseite; liest APIs und aktualisiert DOM/UI.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Gemeinsame Shell-Hilfe für Unterseiten: Topbar, aktive Navigation, mobile Menüs und sichtbare Kundenfeatures.
 * Zusammenhänge:
 * - Ergänzt Einzelseiten, die nicht komplett über www/app.js laufen.
 * - Feature-Sichtbarkeit muss zu /config passen.
 * Wartungshinweise:
 * - Keine fachliche EMS-Logik hier einbauen; nur UI-Shell und Navigation.
 */

(function(){
  'use strict';
  /**
   * Code-Teil: nwNormalizeBrandHeader
   * Zweck: Entfernt den alten sichtbaren EMS-Zusatz aus der Topbar-Marke.
   * Zusammenhang: Gemeinsame Cockpit-Shell normalisiert Bestandsseiten zusätzlich
   * zur statischen HTML-Anpassung; fachliche EMS-Begriffe bleiben erhalten.
   */
  function nwNormalizeBrandHeader(){
    try {
      var titles = Array.prototype.slice.call(document.querySelectorAll('.topbar h1, header.topbar h1'));
      titles.forEach(function(el){
        var text = String(el && el.textContent || '').replace(/\s+/g, ' ').trim();
        if(text === 'NexoWatt EMS' || text === 'NexoWatt') el.textContent = 'NexoWatt EOS';
      });
      var pwaTitles = Array.prototype.slice.call(document.querySelectorAll('meta[name="apple-mobile-web-app-title"]'));
      pwaTitles.forEach(function(el){
        if(el && ['NexoWatt EMS','NexoWatt'].includes(el.getAttribute('content'))) el.setAttribute('content','NexoWatt EOS');
      });
      if(typeof document.title === 'string' && /^NexoWatt(?: EMS)?\b/.test(document.title) && !/^NexoWatt EOS\b/.test(document.title)){
        document.title = document.title.replace(/^NexoWatt(?: EMS)?\b/, 'NexoWatt EOS');
      }
    } catch(_e) {}
  }

  /**
   * Stellt den optionalen Kunden-Menüpunkt „Bilanz“ bereit. Die Elemente werden
   * in allen Cockpit-Seiten dynamisch an derselben Position nach History erzeugt
   * und erst durch /config.featureVisibility.hasEnergyLedger sichtbar geschaltet.
   */
  function nwEnsureEnergyLedgerNavigation(topbar){
    if(!topbar) return { tab:null, menu:null };
    var tabs = topbar.querySelector('.tabs');
    var tab = document.getElementById('tabEnergyLedger');
    if(!tab && tabs){
      tab = document.createElement('button');
      tab.type = 'button';
      tab.id = 'tabEnergyLedger';
      tab.className = 'tab hidden';
      tab.textContent = 'BILANZ';
      tab.setAttribute('aria-label', 'Energieherkunft & Ladebilanz');
      tab.setAttribute('title', 'Energieherkunft & Ladebilanz');
      tab.addEventListener('click', function(){ window.location.href = '/ledger/energy-origin'; });
      var historyTab = tabs.querySelector('#historyTabBtn') || Array.prototype.find.call(tabs.querySelectorAll('.tab'), function(el){
        return String(el && el.textContent || '').trim().toLowerCase() === 'history';
      });
      if(historyTab && historyTab.nextSibling) tabs.insertBefore(tab, historyTab.nextSibling);
      else tabs.appendChild(tab);
    }
    var dropdown = topbar.querySelector('.menu');
    var menu = document.getElementById('menuEnergyLedgerLink');
    if(!menu && dropdown){
      menu = document.createElement('a');
      menu.id = 'menuEnergyLedgerLink';
      menu.className = 'menu-item hidden';
      menu.href = '/ledger/energy-origin';
      menu.textContent = 'Energieherkunft & Ladebilanz';
      var historyLink = Array.prototype.find.call(dropdown.querySelectorAll('.menu-item'), function(el){
        var href = String(el && el.getAttribute && el.getAttribute('href') || '').toLowerCase();
        var text = String(el && el.textContent || '').trim().toLowerCase();
        return href.includes('history') || text === 'history';
      });
      if(historyLink && historyLink.nextSibling) dropdown.insertBefore(menu, historyLink.nextSibling);
      else dropdown.appendChild(menu);
    }
    return { tab:tab, menu:menu };
  }
  try{
    nwNormalizeBrandHeader();
    document.documentElement.classList.add('nw-cockpit-html');
    document.body && document.body.classList.add('nw-cockpit-skin');
    var topbar = document.querySelector('.topbar');
    if(topbar){
      topbar.classList.add('nw-topbar');
      if(!topbar.querySelector('.topbar-gear')){
        var gear = document.createElement('a');
        gear.className = 'topbar-gear';
        gear.href = '/settings.html';
        gear.setAttribute('aria-label','Einstellungen');
        gear.setAttribute('title','Einstellungen');
        gear.textContent = '⚙️';
        var menu = topbar.querySelector('.menu');
        if(menu) topbar.insertBefore(gear, menu); else topbar.appendChild(gear);
      }
      nwEnsureEnergyLedgerNavigation(topbar);
      var p = (location.pathname || '').toLowerCase();
      var q = (location.search || '').toLowerCase();
      var tabs = Array.prototype.slice.call(topbar.querySelectorAll('.tabs .tab'));
      tabs.forEach(function(t){
        var text = (t.textContent || '').trim().toLowerCase();
        var is = false;
        if((p === '/' || p.endsWith('/index.html') || p.endsWith('/')) && !q.includes('storagefarm')) is = text === 'live';
        if(p.includes('history') || p.includes('report')) is = text === 'history';
        if(p.includes('/ledger/energy-origin') || p.includes('energy-ledger')) is = t.id === 'tabEnergyLedger' || text === 'bilanz' || text === 'balans';
        if(p.includes('smarthome')) is = text === 'smarthome';
        if(p.includes('evcs')) is = text === 'evcs';
        if(q.includes('storagefarm') || p.includes('storagefarm')) is = text === 'speicherfarm';
        if(p.includes('logic')) is = text.includes('logic');
        if(is){ t.classList.add('active'); t.classList.add('tab-active'); }
        else if(p.includes('settings') || p.includes('ems-apps') || p.includes('simulation') || p.includes('smarthome-config')){ t.classList.remove('active'); }
      });
      // Menu fallback only on pages without an existing app-specific binding.
      var btn = topbar.querySelector('#menuBtn');
      var dropdown = topbar.querySelector('#menuDropdown');
      if(btn && dropdown && btn.dataset.nwMenuFallback === '1' && !btn.dataset.nwMenuBound && !btn.dataset.nwFallbackMenu && !btn.dataset.nwShellBound){
        // 0.8.21: gemeinsamer Burger-Menü-Guard. Fallback nur binden, wenn keine
        // App-Seite den Button schon übernommen hat. Dadurch bleibt das Menü auf
        // App-Center-/Einstellungsseiten stabil und toggelt nicht doppelt.
        btn.dataset.nwFallbackMenu = '1';
        btn.dataset.nwMenuBound = 'cockpit-fallback';
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        btn.addEventListener('click', function(e){
          if(btn.dataset.nwAppMenu === '1') return;
          e.preventDefault();
          e.stopPropagation();
          dropdown.classList.toggle('hidden');
        }, { once:false });
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        document.addEventListener('click', function(e){
          if(dropdown.classList.contains('hidden')) return;
          var target = e && e.target;
          if(btn.contains(target) || dropdown.contains(target)) return;
          dropdown.classList.add('hidden');
        });
      }
      // Global customer-feature visibility (EVCS/Speicherfarm) for subpages that do not load app.js.
      try {
        fetch('/config', { cache: 'no-store' }).then(function(r){ return r.json(); }).then(function(cfg){
          cfg = cfg || {};
          var sc = (cfg.settingsConfig && typeof cfg.settingsConfig === 'object') ? cfg.settingsConfig : {};
          var evAvail = ((Number(sc.evcsConfiguredCount || 0) || (Array.isArray(sc.evcsList) ? sc.evcsList.filter(function(r){ if(!r || r.enabled === false) return false; return ['powerId','energyTotalId','energySessionId','statusId','activeId','onlineId','setCurrentAId','setPowerWId','enableWriteId','lockWriteId','rfidReadId','vehicleSocId'].some(function(k){ return String(r[k] || '').trim(); }); }).length : 0)) > 0);
          var evCount = Math.max(0, Math.round(Number(sc.evcsCount || 0) || 0));
          var showEvcs = evAvail && evCount >= 2;
          var fv = (cfg.featureVisibility && typeof cfg.featureVisibility === 'object') ? cfg.featureVisibility : {};
          // Optionale Kunden-Unterseiten werden ausschließlich über /config.featureVisibility geöffnet.
          // Energieherkunft ist dabei nur sichtbar, wenn die App im AppCenter installed+enabled ist.
          // Alte Legacy-Flags oder Runtime-States dürfen keine Kunden-Menüpunkte öffnen.
          var sh = fv.hasSmartHome === true;
          var sf = fv.hasStorageFarm === true;
          var ledger = fv.hasEnergyLedger === true;
          [['tabEvcs', showEvcs], ['menuEvcsLink', showEvcs], ['tabSmartHome', sh], ['menuSmartHomeLink', sh], ['tabStorageFarm', sf], ['menuStorageFarmLink', sf], ['tabEnergyLedger', ledger], ['menuEnergyLedgerLink', ledger]].forEach(function(pair){
            var el = document.getElementById(pair[0]);
            if (el) el.classList.toggle('hidden', !pair[1]);
          });
        }).catch(function(){});
      } catch(_e2) {}
    }
  }catch(_e){}
})();
