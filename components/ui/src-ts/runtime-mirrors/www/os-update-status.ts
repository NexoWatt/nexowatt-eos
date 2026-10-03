// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: www/os-update-status.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * www/os-update-status.js
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
 * Original-Hash: 8d8124a6590effa34c8c0bed1ea32a401ba607b67523c8eb9bf1773e053449be
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
 * Quelle: src-ts/runtime-executables/www/os-update-status.ts
 * Quell-Hash: sha256:24f63a45c2caa0f3cf27957a6b9be1706845093880d25d384f44a6981d460238
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für www/os-update-status.js.
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
 * Aufgabe: Zeigt den schreibgeschützten Betriebssystem-Updatezustand in den bestehenden Einstellungen an.
 * Daten und Wirkung: Fragt die authentifizierte Status-API maximal einmal pro Minute ab und setzt ausschließlich textContent; kein Update-/Neustartbefehl.
 * Bei Änderungen: Warnungen bei Fehlern, veralteten Daten, Offlinebetrieb und gesperrten Sitzungen mit dem API-Vertrag testen.
 * Verknüpfung: docs/security/EOS_OS_UPDATE_STATUS_DE.md
 */
(function () {
  'use strict';
  const card = document.getElementById('osUpdateStatus');
  if (!card) return;
  let timer = null;
  let pending = false;
  let controller = null;
  let stopped = false;
/**
 * Code-Teil: text
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  const text = (id, value) => { const element = document.getElementById(id); if (element) element.textContent = value; };
  const unknown = 'Unbekannt';
/**
 * Code-Teil: date
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  const date = value => value ? new Date(value).toLocaleString('de-DE') : 'Noch nicht nachgewiesen';
/**
 * Code-Teil: count
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  const count = value => Number.isSafeInteger(value) && value >= 0 ? String(value) : unknown;
/**
 * Code-Teil: boolean
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  const boolean = value => value === true ? 'Ja' : value === false ? 'Nein' : unknown;
/**
 * Code-Teil: requirement
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  const requirement = value => ({ required: 'Erforderlich', 'not-required': 'Aktuell nicht erforderlich', unknown })[value] || unknown;
  const states = { running: 'Aktualisierung läuft', ok: 'Letzter Durchlauf erfolgreich', attention: 'Prüfung erforderlich', error: 'Aktualisierung fehlgeschlagen', 'never-run': 'Noch kein Durchlauf', disabled: 'Automatik deaktiviert' };
  const errors = {
    'configuration-invalid': 'Updatekonfiguration ungültig', 'prerequisite-missing': 'Updatevoraussetzung fehlt', 'unsupported-host': 'Systemprofil nicht unterstützt',
    'apt-refresh-failed': 'Paketlisten konnten nicht aktualisiert werden', 'upgrade-failed': 'Paketaktualisierung fehlgeschlagen', 'upgrade-interrupted': 'Aktualisierung unterbrochen',
    'upgrade-timeout': 'Zeitlimit der Aktualisierung erreicht', 'pending-scan-failed': 'Offene Aktualisierungen nicht ermittelbar', 'inventory-failed': 'Paketinventar nicht ermittelbar',
    'status-write-failed': 'Status konnte nicht geschrieben werden', 'internal-error': 'Updateprüfung fehlgeschlagen',
  };
  /** Fehler überschreiben ausdrücklich eine zuvor positive Anzeige. */
  function warning(message) {
    card.dataset.updateHealth = 'warning';
    text('osUpdateHeadline', message);
    text('osUpdateDetails', 'Der aktuelle Sicherheitsupdatezustand ist nicht bestätigt. Serviceprüfung erforderlich.');
    for (const id of ['osUpdateAttempt', 'osUpdateSuccess', 'osUpdateObserved', 'osUpdateAutomatic', 'osUpdateTimer', 'osUpdatePending', 'osUpdateBlocked', 'osUpdateActivation', 'osUpdateReboot', 'osUpdateCoverage']) text(id, unknown);
  }
/**
 * Code-Teil: render
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  function render(result) {
    if (!result || result.schemaVersion !== 1 || !['available', 'stale'].includes(result.availability) || !result.summary) {
      warning(result?.availability === 'future' ? 'Systemzeit oder Statuszeit prüfen' : result?.availability === 'invalid' ? 'Updatezustand ungültig – Serviceprüfung erforderlich' : 'Updatezustand nicht verfügbar');
      return;
    }
    const value = result.summary;
    const healthy = result.health === 'ok' && result.availability === 'available';
    card.dataset.updateHealth = healthy ? 'ok' : 'warning';
    text('osUpdateHeadline', result.availability === 'stale' ? 'Updatezustand veraltet – Prüfung erforderlich' : healthy ? 'Konfigurierte Updatequellen geprüft' : states[value.state] || 'Prüfung erforderlich');
    text('osUpdateDetails', value.errorCode ? errors[value.errorCode] || 'Updateprüfung fehlgeschlagen' : healthy
      ? 'Keine offenen Sicherheitsupdates für die erfassten Quellen gemeldet. Dies ist keine Bestätigung vollständiger Produktsicherheit.'
      : 'Automatik, offene Pakete, Aktivierung und Quellenabdeckung prüfen. Ein erfolgreicher Durchlauf allein bestätigt keinen vollständig aktualisierten Zustand.');
    text('osUpdateAttempt', date(value.lastAttemptAt));
    text('osUpdateSuccess', date(value.lastSuccessAt));
    text('osUpdateObserved', date(value.generatedAt));
    text('osUpdateAutomatic', boolean(value.policy.automatic));
    text('osUpdateTimer', 'Aktiviert: ' + boolean(value.timers.enabled) + ' · Aktiv: ' + boolean(value.timers.active));
    text('osUpdatePending', count(value.pending.securityCount));
    text('osUpdateBlocked', count(value.pending.blockedSecurityCount) + ' · Zurückgehalten: ' + count(value.pending.heldSecurityCount));
    text('osUpdateActivation', requirement(value.activation.state) + ' · Dienste: ' + count(value.activation.serviceRestartCount) + ' · Sitzungen: ' + count(value.activation.sessionRestartCount));
    text('osUpdateReboot', requirement(value.reboot.state) + ' · Automatischer Neustart: Nein');
    text('osUpdateCoverage', value.coverage.state === 'complete-for-configured-origins' && value.coverage.gapCount === 0
      ? 'Konfigurierte Quellen erfasst' : 'Abdeckung nicht vollständig bestätigt · Hinweise: ' + count(value.coverage.gapCount));
  }
  /** Ein offener Request, fünf Sekunden Frist; bei verborgenem Tab/offline pausieren. */
  async function poll() {
    clearTimeout(timer);
    if (stopped || pending || document.hidden) return;
    if (navigator.onLine === false) { warning('Offline – Updatezustand nicht bestätigt'); return; }
    pending = true;
    controller = new AbortController();
    const deadline = setTimeout(() => controller?.abort(), 5000);
    try {
      const response = await fetch('/api/system/os-updates', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal, headers: { Accept: 'application/json' } });
      if (!response.ok) {
        if (response.status === 503) render(await response.json());
        else warning(response.status === 401 || response.status === 403 ? 'Anmeldung oder Berechtigung prüfen' : 'Updatezustand nicht verfügbar');
        return;
      }
      render(await response.json());
    } catch (_error) { warning('Updatezustand konnte nicht abgerufen werden'); }
    finally {
      clearTimeout(deadline); controller = null; pending = false;
      if (!stopped && !document.hidden && navigator.onLine !== false) timer = setTimeout(poll, 60000);
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { clearTimeout(timer); controller?.abort(); }
    else { warning('Updatezustand wird neu geprüft'); poll(); }
  });
  window.addEventListener('offline', () => { clearTimeout(timer); controller?.abort(); warning('Offline – Updatezustand nicht bestätigt'); });
  window.addEventListener('online', () => { warning('Updatezustand wird neu geprüft'); poll(); });
  window.addEventListener('pagehide', () => { stopped = true; clearTimeout(timer); controller?.abort(); });
  window.addEventListener('pageshow', event => { if (event.persisted) { stopped = false; warning('Updatezustand wird neu geprüft'); poll(); } });
  poll();
})();
