// @ts-nocheck
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
  const text = (id, value) => { const element = document.getElementById(id); if (element) element.textContent = value; };
  const unknown = 'Unbekannt';
  const date = value => value ? new Date(value).toLocaleString('de-DE') : 'Noch nicht nachgewiesen';
  const count = value => Number.isSafeInteger(value) && value >= 0 ? String(value) : unknown;
  const boolean = value => value === true ? 'Ja' : value === false ? 'Nein' : unknown;
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
