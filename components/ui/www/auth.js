/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/www/auth.ts
 * Quell-Hash: sha256:0af7f1752fccb4286e24a666eeb9b66fb9025ce738d8fca42494dd05eddc7765
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für www/auth.js.
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
 * Aufgabe: Verbindet Browser-Anmeldung und Sitzungsstatus mit den Autorisierungs-Endpunkten des Backends.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/www/auth.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: www/auth.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `www/auth.js`.
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
 * Datei: www/auth.js
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

/* NexoWatt Auth Helper
 * - Login gegen Benutzerkonto (Adapter checkPassword)
 * - Session Cookie: nw_session (HttpOnly, SameSite=Lax)
 * - UI: zeigt Login-Dialog, wenn schreibende Requests 401/403 liefern
 */

(function () {
  'use strict';

  const ORIG_FETCH = window.fetch ? window.fetch.bind(window) : null;
  if (!ORIG_FETCH) return;

  const currentPath = String(window.location && window.location.pathname || '').replace(/\/+$/, '');
  // EMS/App-Center, Simulation und Lizenz bleiben unabhängig von der allgemeinen
  // Kunden-Auth-Konfiguration immer rollenpflichtig. Diese Seiten verwenden daher
  // die strikten Session-Endpunkte, die niemals in einen "Auth deaktiviert = Admin"-
  // Bypass fallen. Das gilt auch für technische SmartHome-/NexoLogic-Einrichtung.
  const STRICT_AUTH_PAGE = /(?:^|\/)(?:ems-apps(?:\.html)?|simulation(?:\.html)?|license(?:\.html)?|smarthome-config(?:\.html)?|logic(?:\.html)?)$/.test(currentPath) || /^\/mail-setup(?:\/|$)/.test(currentPath);
  const AUTH_STATUS_URL = STRICT_AUTH_PAGE ? '/api/strict-auth/status' : '/api/auth/status';
  const AUTH_LOGIN_URL  = STRICT_AUTH_PAGE ? '/api/strict-auth/login' : '/api/auth/login';
  const AUTH_LOGOUT_URL = STRICT_AUTH_PAGE ? '/api/strict-auth/logout' : '/api/auth/logout';

  let state = {
    enabled: false,
    protectWrites: false,
    authed: false,
    user: null,
    role: 'none',
    capabilities: [],
    isAdmin: false,
    isInstaller: false,
    isCustomer: false,
    passwordChangeRequired: false,
    accountRole: 'none',
    _loaded: false,
    statusError: false,
  };

  let overlayEl = null;
  let msgEl = null;
  let userEl = null;
  let passEl = null;
  let btnEl = null;
  let cancelEl = null;
  let passwordMode = false;
  let newPassEl = null;
  let repeatPassEl = null;
  let passwordRows = [];
  let titleEl = null;
  let mandatoryLock = false;
  let mandatoryReason = '';
  const protectedPath = STRICT_AUTH_PAGE;
  if (protectedPath) {
    try { document.documentElement.classList.add('nw-auth-capability-pending'); } catch (_e) {}
  }

  const lockedBackground = new Map();

  function isProtectedPage() {
    return !!requiredPageCapability();
  }

  /**
   * Pflicht-Login sperrt nicht nur optisch: Alle Seitenelemente hinter dem
   * Passwortdialog werden inert und erhalten keine Pointer-/Tastaturereignisse.
   * Ein Klick neben das Fenster kann das App-Center dadurch niemals freilegen.
   */
  function setBackgroundLocked(locked) {
    try {
      const body = document.body;
      if (!body) return;
      body.classList.toggle('nw-auth-page-locked', locked === true);
      for (const child of Array.from(body.children || [])) {
        if (!child || child === overlayEl || child.id === 'nwAuthOverlay') continue;
        if (locked) {
          if (!lockedBackground.has(child)) {
            lockedBackground.set(child, {
              inert: !!child.inert,
              ariaHidden: child.getAttribute('aria-hidden'),
              pointerEvents: child.style.pointerEvents || '',
              userSelect: child.style.userSelect || '',
            });
          }
          try { child.inert = true; } catch (_e1) {}
          child.setAttribute('aria-hidden', 'true');
          child.style.pointerEvents = 'none';
          child.style.userSelect = 'none';
        } else {
          const prev = lockedBackground.get(child);
          if (!prev) continue;
          try { child.inert = !!prev.inert; } catch (_e2) {}
          if (prev.ariaHidden === null || prev.ariaHidden === undefined) child.removeAttribute('aria-hidden');
          else child.setAttribute('aria-hidden', prev.ariaHidden);
          child.style.pointerEvents = prev.pointerEvents;
          child.style.userSelect = prev.userSelect;
          lockedBackground.delete(child);
        }
      }
    } catch (_e) {}
  }

  function releaseMandatoryLock() {
    mandatoryLock = false;
    mandatoryReason = '';
    setBackgroundLocked(false);
  }

  function requiredPageCapability() {
    try { return String(document.body && document.body.getAttribute('data-nw-required-capability') || '').trim(); } catch (_e) { return ''; }
  }

  function protectedPageLocked() {
    const cap = requiredPageCapability();
    if (!cap) return false;
    return !state._loaded || state.statusError === true || !(state.authed && hasCapability(state.capabilities, cap));
  }

  function setProtectedPagePending(active) {
    try {
      document.documentElement.classList.toggle('nw-auth-capability-pending', active === true);
      document.documentElement.classList.toggle('nw-auth-capability-granted', active !== true);
    } catch (_e) {}
  }

  /**
   * Prüft eine NexoWatt-Capability im Frontend.
   * Wichtig: Das ist nur Komfort-/Sichtbarkeitsschutz. Die eigentliche Sperre
   * muss weiterhin serverseitig in main.ts greifen, damit Werte nicht über API
   * oder direkte URLs sichtbar bzw. schreibbar werden.
   */
  function hasCapability(capabilities, cap) {
    if (['license.manage', 'notifications.manage'].includes(String(cap || '')) && state.role !== 'admin') return false;
    if (['appcenter.open', 'simulation.open', 'mapping.edit', 'chargepoints.configure',
      'mesh.configure', 'exportGuard.configure', 'smarthome.configure',
      'nexologic.configure', 'diagnostics.open'].includes(String(cap || ''))
      && !['admin', 'installer'].includes(state.role)) return false;
    const caps = Array.isArray(capabilities) ? capabilities : [];
    return caps.includes('*') || caps.includes(String(cap || ''));
  }

  /** Rücksprung in den NexoWatt EOS Admin. */
  function adminUrl() {
    try {
      const proto = window.location.protocol || 'http:';
      const host = window.location.hostname || String(window.location.host || '').split(':')[0] || 'localhost';
      return proto + '//' + host + ':8081/#tab-nexowatt-ui-0';
    } catch (_e) {
      return '/';
    }
  }
  /**
   * Code-Teil: ensureStyles
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function ensureStyles() {
    if (document.getElementById('nw-auth-styles')) return;
    const st = document.createElement('style');
    st.id = 'nw-auth-styles';
    st.textContent = `
      .nw-auth-overlay{position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:10000;background:rgba(0,0,0,.55)}
      .nw-auth-overlay.show{display:flex}
      .nw-auth-dialog{width:min(420px,92vw);background:#10151b;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.55)}
      .nw-auth-dialog h2{margin:0 0 10px 0;font-size:16px;letter-spacing:.2px}
      .nw-auth-dialog .row{display:flex;flex-direction:column;gap:6px;margin:10px 0}
      .nw-auth-dialog label{font-size:12px;opacity:.85}
      .nw-auth-dialog input{width:100%;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0c0f12;color:#e8eef4}
      .nw-auth-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:12px}
      .nw-auth-msg{min-height:18px;margin-top:8px;font-size:12px;opacity:.85}
      .nw-auth-header{display:flex;align-items:center;gap:8px;margin-left:auto;flex-wrap:wrap;justify-content:flex-end;max-width:100%}
      .nw-auth-header .nw-auth-user{font-size:12px;opacity:.85;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .nw-auth-btn{white-space:nowrap}
      body.nw-auth-page-locked{overflow:hidden!important}
      body.nw-auth-page-locked .nw-auth-overlay{pointer-events:auto!important}
      html.nw-auth-capability-pending body>*:not(#nwAuthOverlay){visibility:hidden!important;pointer-events:none!important;user-select:none!important}
      html.nw-auth-capability-pending body #nwAuthOverlay{visibility:visible!important;pointer-events:auto!important}
    `;
    document.head.appendChild(st);
  }
  /**
   * Code-Teil: ensureOverlay
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function ensureOverlay() {
    if (overlayEl) return overlayEl;
    ensureStyles();

    overlayEl = document.createElement('div');
    overlayEl.className = 'nw-auth-overlay';
    overlayEl.id = 'nwAuthOverlay';

    const dlg = document.createElement('div');
    dlg.className = 'nw-auth-dialog';
    dlg.setAttribute('role', 'dialog');
    dlg.setAttribute('aria-modal', 'true');
    dlg.setAttribute('aria-labelledby', 'nwAuthTitle');
    dlg.tabIndex = -1;

    const title = document.createElement('h2');
    title.id = 'nwAuthTitle';
    titleEl = title;
    title.textContent = 'Anmeldung erforderlich';

    const rowUser = document.createElement('div');
    rowUser.className = 'row';
    const labUser = document.createElement('label');
    labUser.textContent = 'Benutzer';
    userEl = document.createElement('input');
    userEl.type = 'text';
    userEl.id = 'nwAuthUser'; labUser.htmlFor = userEl.id;
    userEl.autocomplete = 'username';
    userEl.placeholder = 'Persönlicher Benutzername';

    const rowPass = document.createElement('div');
    rowPass.className = 'row';
    const labPass = document.createElement('label');
    labPass.textContent = 'Passwort';
    passEl = document.createElement('input');
    passEl.type = 'password';
    passEl.id = 'nwAuthCurrentPassword'; labPass.htmlFor = passEl.id;
    passEl.autocomplete = 'current-password';
    passEl.placeholder = '';

    const actions = document.createElement('div');
    actions.className = 'nw-auth-actions';

    btnEl = document.createElement('button');
    btnEl.className = 'btn nw-auth-btn';
    btnEl.type = 'button';
    btnEl.textContent = 'Anmelden';

    cancelEl = document.createElement('button');
    cancelEl.className = 'btn secondary nw-auth-btn';
    cancelEl.type = 'button';
    cancelEl.textContent = 'Abbrechen';

    msgEl = document.createElement('div');
    msgEl.className = 'nw-auth-msg';

    rowUser.appendChild(labUser);
    rowUser.appendChild(userEl);
    rowPass.appendChild(labPass);
    rowPass.appendChild(passEl);

    actions.appendChild(cancelEl);
    actions.appendChild(btnEl);

    dlg.appendChild(title);
    dlg.appendChild(rowUser);
    dlg.appendChild(rowPass);
    for (const label of ['Eigenes neues Passwort (15–128 Zeichen)', 'Neues Passwort wiederholen']) {
      const row = document.createElement('div');
      row.className = 'row'; row.hidden = true; row.style.display = 'none';
      const caption = document.createElement('label'); caption.textContent = label;
      const input = document.createElement('input'); input.type = 'password';
      input.autocomplete = 'new-password'; input.maxLength = 256;
      input.id = !newPassEl ? 'nwAuthNewPassword' : 'nwAuthRepeatPassword'; caption.htmlFor = input.id;
      row.appendChild(caption); row.appendChild(input); dlg.appendChild(row); passwordRows.push(row);
      if (!newPassEl) newPassEl = input; else repeatPassEl = input;
    }
    dlg.appendChild(actions);
    dlg.appendChild(msgEl);

    overlayEl.appendChild(dlg);
    document.body.appendChild(overlayEl);

    // Prefill last user
    try {
      const last = localStorage.getItem('nwAuthUser') || '';
      if (last && userEl) userEl.value = last;
    } catch (_e) {}

    // Handlers
    /**
     * Code-Teil: Arrow-Funktion `doLogin`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: doLogin
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const doLogin = async () => {
      if (passwordMode) return changeOwnPassword();
      const u = String(userEl ? userEl.value : '').trim();
      const p = String(passEl ? passEl.value : '');
      if (!u || !p) {
        setMsg('Bitte Benutzer und Passwort eingeben.');
        return;
      }
      setMsg('…');
      const ok = await login(u, p);
      if (ok) {
        if (state.passwordChangeRequired) { showPasswordChange(true); return; }
        const cap = requiredPageCapability();
        if (cap) {
          if (state.authed && hasCapability(state.capabilities, cap)) {
            const wasMandatory = mandatoryLock;
            releaseMandatoryLock();
            setProtectedPagePending(false);
            hideOverlay();
            if (wasMandatory || cap) {
              try { window.location.reload(); } catch (_e) {}
            }
          } else {
            mandatoryLock = true;
            setProtectedPagePending(true);
            setMsg('Anmeldung erfolgreich, aber die erforderliche Rolle fehlt.');
          }
        } else {
          releaseMandatoryLock();
          hideOverlay();
        }
      }
    };

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnEl. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btnEl.addEventListener('click', doLogin);
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an passEl. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    passEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doLogin();
      if (e.key === 'Escape' && !mandatoryLock && !protectedPageLocked()) hideOverlay();
    });
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an userEl. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    userEl.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !mandatoryLock && !protectedPageLocked()) hideOverlay();
    });

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an cancelEl. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    cancelEl.addEventListener('click', () => {
      if (mandatoryLock || protectedPageLocked()) {
        setMsg(mandatoryReason || 'Anmeldung erforderlich. Ohne passende Rolle bleibt diese Seite gesperrt.');
        return;
      }
      passwordMode = false;
      hideOverlay();
    });

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an overlayEl. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    overlayEl.addEventListener('click', (e) => {
      if (e.target !== overlayEl) return;
      if (mandatoryLock || protectedPageLocked()) {
        e.preventDefault();
        e.stopPropagation();
        setMsg(mandatoryReason || 'Anmeldung erforderlich. Ohne Passwort bleibt diese Seite gesperrt.');
        return;
      }
      hideOverlay();
    });

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && (mandatoryLock || protectedPageLocked()) && overlayEl && overlayEl.classList.contains('show')) {
        const focusable = Array.from(overlayEl.querySelectorAll('input,button,select,textarea,[tabindex]:not([tabindex="-1"])'))
          .filter((el) => !el.disabled && el.offsetParent !== null);
        if (focusable.length) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        } else {
          e.preventDefault();
          dlg.focus();
        }
        return;
      }
      if (e.key !== 'Escape') return;
      if (mandatoryLock || protectedPageLocked()) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setMsg(mandatoryReason || 'Anmeldung erforderlich.');
        return;
      }
      hideOverlay();
    }, true);

    document.addEventListener('focusin', (e) => {
      if (!(mandatoryLock || protectedPageLocked()) || !overlayEl || !overlayEl.classList.contains('show')) return;
      if (overlayEl.contains(e.target)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      try {
        if (userEl && userEl.value && passEl) passEl.focus();
        else if (userEl) userEl.focus();
        else dlg.focus();
      } catch (_e) {}
    }, true);

    ['pointerdown', 'mousedown', 'touchstart', 'click'].forEach((type) => {
      document.addEventListener(type, (e) => {
        if (!(mandatoryLock || protectedPageLocked()) || !overlayEl || overlayEl.contains(e.target)) return;
        e.preventDefault();
        e.stopImmediatePropagation();
      }, true);
    });

    return overlayEl;
  }
  /**
   * Code-Teil: setMsg
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setMsg(text) {
    if (msgEl) msgEl.textContent = String(text || '');
  }
  /**
   * Code-Teil: showOverlay
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function showOverlay(message, options) {
    ensureOverlay();
    if (state.passwordChangeRequired && !passwordMode) return showPasswordChange(true);
    if (!passwordMode) setPasswordMode(false);
    mandatoryLock = !!(options && options.mandatory) || isProtectedPage() || state.passwordChangeRequired;
    mandatoryReason = String((options && options.reason) || message || '');
    if (message) setMsg(message);
    if (cancelEl) cancelEl.style.display = mandatoryLock ? 'none' : '';
    setBackgroundLocked(mandatoryLock);
    overlayEl.classList.add('show');
    try {
      // focus on password if user prefilled
      if (userEl && userEl.value && passEl) passEl.focus();
      else if (userEl) userEl.focus();
    } catch (_e) {}
  }
  /**
   * Code-Teil: hideOverlay
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function hideOverlay() {
    if (!overlayEl) return;
    if (mandatoryLock || protectedPageLocked()) {
      setMsg(mandatoryReason || 'Anmeldung erforderlich.');
      return;
    }
    overlayEl.classList.remove('show');
    setBackgroundLocked(false);
    setMsg('');
    try { if (passEl) passEl.value = ''; } catch (_e) {}
  }

  /**
   * Ersetzt den Seiteninhalt durch einen Sperrbildschirm. Dadurch bleiben
   * App-Center-, Simulation- oder Lizenzwerte unsichtbar, solange keine passende
   * EOS-Rolle angemeldet ist. Abbrechen im Login-Dialog kann die Seite nicht
   * wieder freilegen.
   */
  function renderPageLock(message) {
    try {
      const main = document.querySelector('main') || document.body;
      main.innerHTML = '' +
        '<section class="nw-config-card" style="max-width:760px;margin:48px auto;padding:22px">' +
        '<div class="nw-config-card__title">Zugriff geschützt</div>' +
        '<p class="nw-config-card__subtitle">' + String(message || 'Bitte mit passender EOS-Rolle anmelden.') + '</p>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px">' +
        '<button class="btn" id="nwAccessLoginBtn" type="button">Anmelden</button>' +
        '<button class="btn secondary" id="nwAccessAdminBtn" type="button">Zurück zum EOS Admin</button>' +
        '</div></section>';
      const loginBtn = document.getElementById('nwAccessLoginBtn');
      if (loginBtn) loginBtn.addEventListener('click', () => showOverlay('Bitte mit passender EOS-Rolle anmelden.', { mandatory: true, reason: message }));
      const adminBtn = document.getElementById('nwAccessAdminBtn');
      if (adminBtn) adminBtn.addEventListener('click', () => { window.location.href = adminUrl(); });
    } catch (_e) {
      // ignore
    }
  }
  // Einrichtungseinstiege sind zunächst unsichtbar. Nur eine echte Fachrolle
  // aus strict-auth darf sie freigeben, auch bei deaktivierter Kundenanmeldung.
  function updateConfigNavigation(info) {
    const caps = info && Array.isArray(info.capabilities) ? info.capabilities : [];
    for (const element of document.querySelectorAll('[data-nw-config-link]')) {
      const allowed = !!(info && info.authed && ['admin', 'installer'].includes(info.role)
        && (caps.includes('*') || caps.includes(element.getAttribute('data-nw-config-link'))));
      element.hidden = !allowed;
      if (allowed) element.style.removeProperty('display');
      else element.style.display = 'none';
    }
  }

  // Fehler bei der technischen Rollenprüfung sperren nur die Einrichtung;
  // die normale Bedienung behält ihre eigene Kundenberechtigung.
  async function refreshConfigNavigation(knownStrictStatus) {
    if (!document.querySelector('[data-nw-config-link]')) return;
    updateConfigNavigation(null);
    try {
      if (knownStrictStatus) return updateConfigNavigation(knownStrictStatus);
      const response = await ORIG_FETCH('/api/strict-auth/status', { cache: 'no-store', credentials: 'same-origin' });
      if (response.ok) updateConfigNavigation(await response.json());
    } catch (_e) { updateConfigNavigation(null); }
  }

  /**
   * Liest den Sitzungsstatus, aktualisiert Bedienanzeige und Seitensperre.
   * Einrichtungseinstiege werden zusätzlich gegen strict-auth geprüft, damit
   * deaktivierte Kundenanmeldung niemals technische Rechte freischaltet.
   * Bei Netzwerkfehlern bleiben geschützte Seiten und Links gesperrt.
   */
  async function refreshStatus() {
    try {
      const r = await ORIG_FETCH(AUTH_STATUS_URL, { cache: 'no-store', credentials: 'same-origin' });
      if (!r.ok) throw new Error('status ' + r.status);
      const j = await r.json();
      state.enabled = !!(j && j.enabled);
      state.protectWrites = !!(j && j.protectWrites);
      state.authed = !!(j && j.authed);
      state.user = (j && j.user) ? String(j.user) : null;
      state.role = (j && j.role) ? String(j.role) : 'none';
      state.capabilities = (j && Array.isArray(j.capabilities)) ? j.capabilities.slice() : [];
      state.isAdmin = !!(j && j.isAdmin);
      state.isInstaller = !!(j && j.isInstaller);
      state.isCustomer = !!(j && j.isCustomer);
      state.passwordChangeRequired = !!(j && j.passwordChangeRequired);
      state.accountRole = j?.accountRole || 'none';
      state._loaded = true;
      state.statusError = false;
      updateHeader();
      await refreshConfigNavigation(STRICT_AUTH_PAGE ? j : null);
      if (state.passwordChangeRequired) { showPasswordChange(true); return state; }
      const cap = requiredPageCapability();
      if (cap) {
        const authorized = !!(state.authed && hasCapability(state.capabilities, cap));
        if (!authorized) {
          mandatoryLock = true;
          mandatoryReason = state.authed ? 'Keine Berechtigung für diese Seite.' : 'Anmeldung erforderlich.';
          setProtectedPagePending(true);
          setBackgroundLocked(true);
        } else if (!overlayEl || !overlayEl.classList.contains('show')) {
          releaseMandatoryLock();
          setProtectedPagePending(false);
        }
      }
      return state;
    } catch (_e) {
      // Geschützte Seiten arbeiten fail-closed: Ein nicht erreichbarer
      // Auth-Status darf niemals als "Auth deaktiviert" interpretiert werden.
      state.enabled = false;
      state.protectWrites = false;
      state.authed = false;
      state.user = null;
      state.role = 'none';
      state.capabilities = [];
      state.isAdmin = false;
      state.isInstaller = false;
      state.isCustomer = false;
      state.passwordChangeRequired = false;
      state.accountRole = 'none';
      state._loaded = true;
      state.statusError = true;
      updateHeader();
      updateConfigNavigation(null);
      if (isProtectedPage()) {
        mandatoryLock = true;
        mandatoryReason = 'Berechtigungsprüfung nicht erreichbar. Die Seite bleibt aus Sicherheitsgründen gesperrt.';
        setProtectedPagePending(true);
        setBackgroundLocked(true);
        showOverlay(mandatoryReason, { mandatory: true, reason: mandatoryReason });
      }
      return state;
    }
  }
  /**
   * Code-Teil: login
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function login(user, password) {
    try {
      const u = String(user || '').trim();
      const p = String(password || '');
      const r = await ORIG_FETCH(AUTH_LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ user: u, password: p })
      });
      if (!r.ok) {
        if (r.status === 401) {
          setMsg('Benutzer oder Passwort falsch.');
        } else if (r.status === 403) {
          setMsg('Keine Berechtigung.');
        } else {
          setMsg('Login fehlgeschlagen (' + r.status + ').');
        }
        return false;
      }
      try { localStorage.setItem('nwAuthUser', u); } catch (_e) {}
      await refreshStatus();
      try { window.dispatchEvent(new CustomEvent('nw-auth-login', { detail: Object.assign({}, state) })); } catch (_e) {}
      setMsg('');
      return true;
    } catch (_e) {
      setMsg('Login fehlgeschlagen.');
      return false;
    }
  }
  /**
   * Code-Teil: logout
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function logout() {
    try {
      await ORIG_FETCH(AUTH_LOGOUT_URL, { method: 'POST', credentials: 'same-origin' });
    } catch (_e) {}
    await refreshStatus();
    try { window.dispatchEvent(new CustomEvent('nw-auth-logout', { detail: Object.assign({}, state) })); } catch (_e) {}
    // Remove previously rendered account data and obtain the server login shell.
    try { window.location.reload(); } catch (_e) {}
  }
  /**
   * Code-Teil: updateHeader
   * Zweck: Aktualisiert Runtime-Zustand, UI oder veröffentlichte Daten.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function updateHeader() {
    try {
      const header = document.querySelector('header.topbar');
      if (!header) return;

      let box = document.getElementById('nwAuthHeader');
      if (!state.enabled || !state.protectWrites) {
        if (box) box.remove();
        return;
      }

      if (!box) {
        box = document.createElement('div');
        box.className = 'nw-auth-header';
        box.id = 'nwAuthHeader';
        header.appendChild(box);
      }

      box.innerHTML = '';

      const user = document.createElement('div');
      user.className = 'nw-auth-user';
      const roleLabel = { service: 'NexoWatt Service', installer: 'Installateur', enduser: 'Benutzer' }[state.accountRole] || '';
      user.textContent = state.authed ? ((state.user || 'angemeldet') + (roleLabel ? ' · ' + roleLabel : '')) : 'nicht angemeldet';

      const btn = document.createElement('button');
      btn.className = 'btn small nw-auth-btn';
      btn.type = 'button';
      btn.textContent = state.authed ? 'Abmelden' : 'Anmelden';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      btn.addEventListener('click', () => {
        if (state.authed) logout();
        else showOverlay('Bitte anmelden.');
      });

      box.appendChild(user);
      if (state.authed) {
        const change = document.createElement('button'); change.className = 'btn small nw-auth-btn';
        change.type = 'button'; change.textContent = 'Passwort ändern';
        change.addEventListener('click', () => showPasswordChange(state.passwordChangeRequired)); box.appendChild(change);
      }
      box.appendChild(btn);
    } catch (_e) {
      // ignore
    }
  }

  /** Same-origin own-password form; no target user or role is transmitted. */
  function setPasswordMode(enabled) {
    passwordMode = enabled;
    for (const row of passwordRows) { row.hidden = !enabled; row.style.display = enabled ? '' : 'none'; }
    if (titleEl) titleEl.textContent = enabled ? 'Eigenes Passwort festlegen' : 'Anmeldung erforderlich';
    if (btnEl) btnEl.textContent = enabled ? 'Passwort speichern' : 'Anmelden';
    if (userEl) { userEl.readOnly = enabled; if (enabled) userEl.value = state.user || ''; }
    if (newPassEl) newPassEl.value = '';
    if (repeatPassEl) repeatPassEl.value = '';
  }
  function showPasswordChange(required) {
    ensureOverlay();
    if (passwordMode && overlayEl.classList.contains('show')) {
      if (required) { mandatoryLock = true; if (cancelEl) cancelEl.style.display = 'none'; }
      return;
    }
    setPasswordMode(true);
    mandatoryLock = !!required; mandatoryReason = required ? 'Vor dem Zugriff ein eigenes Passwort festlegen.' : '';
    if (cancelEl) cancelEl.style.display = required ? 'none' : '';
    setBackgroundLocked(true); overlayEl.classList.add('show');
    if (passEl) { passEl.value = ''; passEl.focus(); }
    setMsg(required ? 'Einmaliges Startpasswort durch ein eigenes Passwort ersetzen. Aktuelles Passwort erneut eingeben.' : 'Aktuelles Passwort und zweimal das neue Passwort eingeben.');
  }
  async function changeOwnPassword() {
    const password = newPassEl?.value || '';
    if (Array.from(password).length < 15 || Array.from(password).length > 128
      || password !== repeatPassEl?.value || !passEl?.value) {
      setMsg('Aktuelles Passwort und ein übereinstimmendes neues Passwort mit 15–128 Zeichen eingeben.'); return;
    }
    btnEl.disabled = true;
    try {
      const result = await ORIG_FETCH('/api/account/password', { method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-Nexowatt-EOS-Password': '1' },
        body: JSON.stringify({ currentPassword: passEl.value, password, passwordRepeat: repeatPassEl.value }) });
      if (!result.ok) {
        setMsg(result.status === 429 ? 'Zu viele Versuche. Bitte später erneut versuchen.'
          : result.status === 401 ? 'Aktuelles Passwort falsch oder Sitzung abgelaufen.' : 'Passwort nicht gespeichert. Eingaben prüfen und erneut anmelden.'); return;
      }
      state.passwordChangeRequired = false; passwordMode = false;
      setPasswordMode(false); passEl.value = ''; releaseMandatoryLock();
      await refreshStatus();
      showOverlay('Passwort gespeichert. Bitte mit dem neuen Passwort anmelden.', { mandatory: true });
    } catch (_) { setMsg('Passwort konnte nicht gespeichert werden. Verbindung prüfen.'); }
    finally { btnEl.disabled = false; }
  }

  // Patch global fetch: ensure cookies and show login dialog on 401/403
  window.fetch = async function (input, init) {
    const cfg = init ? Object.assign({}, init) : {};
    if (!cfg.credentials) cfg.credentials = 'same-origin';

    const r = await ORIG_FETCH(input, cfg);

    // Only act on auth-protected setups
    if (!state._loaded) {
      // Best effort: do not block first requests; lazy load status
      refreshStatus();
    }

    try {
      const url = (typeof input === 'string') ? input : (input && input.url ? input.url : '');
      const isAuthEndpoint = url.indexOf('/api/account/') === 0 || url.indexOf('/api/auth/') === 0
        || url.indexOf('/api/strict-auth/') === 0
        || url.indexOf('/api/installer/') === 0;
      if (!isAuthEndpoint && (r.status === 401 || r.status === 403)) {
        // 1.0.3: HTTP 403 bedeutet nicht automatisch, dass die EOS-Sitzung verloren
        // gegangen ist. Home-Lizenzen erhalten für Pro-only APIs absichtlich einen
        // fachlichen 403 (z. B. `eos_required`). Der alte globale Handler deutete
        // jeden solchen Status als Rollenverlust, ersetzte das bereits autorisierte
        // App-Center durch den Sperrbildschirm und öffnete den Login erneut.
        //
        // Deshalb ist der anschließend gelesene Auth-Status die einzige Quelle für
        // die Login-Sperre: Nur eine wirklich fehlende Session oder eine fehlende
        // Seiten-Capability darf die Seite verriegeln. Ein fachlicher API-Fehler bleibt
        // der aufrufenden Komponente über die unveränderte Response sichtbar.
        await refreshStatus();
        if (state.passwordChangeRequired) { showPasswordChange(true); return r; }
        const protectedPage = isProtectedPage();
        const pageCapability = requiredPageCapability();
        const sessionMissing = !state.authed;
        const pageCapabilityMissing = !!(pageCapability && !hasCapability(state.capabilities, pageCapability));
        const authStatusUnavailable = state.statusError === true;
        const mustPromptForAuthentication = authStatusUnavailable || sessionMissing || pageCapabilityMissing;

        if (mustPromptForAuthentication && (protectedPage || (state.enabled && state.protectWrites))) {
          const message = authStatusUnavailable
            ? 'Berechtigungsprüfung nicht erreichbar. Bitte Verbindung prüfen und erneut anmelden.'
            : (sessionMissing
              ? 'Bitte anmelden, um diese geschützte Seite zu bedienen.'
              : 'Keine Berechtigung. Bitte mit der erforderlichen EOS-Rolle anmelden.');
          renderPageLock(message);
          showOverlay(message, { mandatory: true, reason: message });
        }
      }
    } catch (_e) {
      // ignore
    }

    return r;
  };

  // Browser back-forward restoration must revalidate the server login boundary.
  window.addEventListener('pageshow', event => { if (event.persisted) window.location.reload(); });

  // Expose minimal API (optional)
  /**
   * Harte Frontend-Sperre für geschützte Seiten. Ohne passende Rolle wird der
   * Seiteninhalt durch einen Sperrbildschirm ersetzt und der Login-Dialog im
   * Pflichtmodus geöffnet. Dadurch kann „Abbrechen“ keine Hintergrundwerte mehr
   * sichtbar machen.
   */
  async function requireCapability(capability, options) {
    const cap = String(capability || '');
    const pageName = String((options && options.pageName) || 'diese Seite');
    const requiredRole = String((options && options.requiredRole) || 'passende EOS-Rolle');
    setProtectedPagePending(true);
    const info = await refreshStatus();
    if (info?.passwordChangeRequired) { showPasswordChange(true); return false; }
    // Rollen-geschützte Seiten (EMS, Lizenz, Simulator) bleiben auch dann
    // anmeldepflichtig, wenn der allgemeine Kunden-Schreibschutz deaktiviert
    // wurde. `protectWrites` darf nur die normale Kundenbedienung beeinflussen.
    const statusHealthy = !(info && info.statusError === true);
    // Eine explizite Capability-Prüfung ist immer rollenpflichtig. Selbst ein
    // unerwarteter Status mit `enabled=false` darf EMS, Lizenz oder Simulator
    // nicht freigeben.
    const ok = statusHealthy && !!(info && info.authed && hasCapability(info.capabilities, cap));
    if (ok) {
      releaseMandatoryLock();
      setProtectedPagePending(false);
      if (overlayEl) overlayEl.classList.remove('show');
      return true;
    }

    const msg = info && info.authed
      ? 'Keine Berechtigung für ' + pageName + '. Erforderlich: ' + requiredRole + '.'
      : 'Bitte anmelden. Erforderlich für ' + pageName + ': ' + requiredRole + '.';
    mandatoryLock = true;
    mandatoryReason = msg;
    setProtectedPagePending(true);
    setBackgroundLocked(true);
    showOverlay(msg, { mandatory: true, reason: msg });
    return false;
  }

  window.NW_AUTH = {
    getState: () => Object.assign({}, state),
    refreshStatus,
    requireCapability,
    hasCapability: (cap) => hasCapability(state.capabilities, cap),
    showLogin: (msg, options) => showOverlay(msg || 'Bitte anmelden.', options || {}),
    logout,
    changePassword: () => showPasswordChange(state.passwordChangeRequired),
  };

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'DOMContentLoaded' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  document.addEventListener('DOMContentLoaded', () => {
    if (isProtectedPage()) {
      mandatoryLock = true;
      mandatoryReason = 'Berechtigung wird geprüft …';
      setProtectedPagePending(true);
      setBackgroundLocked(true);
    }
    refreshStatus().then(() => {
      try {
        const cap = document.body && document.body.getAttribute('data-nw-required-capability');
        if (cap) {
          const pageName = document.body.getAttribute('data-nw-page-name') || 'geschützte Seite';
          const requiredRole = document.body.getAttribute('data-nw-required-role') || 'passende Rolle';
          requireCapability(cap, { pageName, requiredRole }).catch(() => {});
        }
      } catch (_e) {}
    });
  });
})();
