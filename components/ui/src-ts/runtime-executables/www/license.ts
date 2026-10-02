// @runtime-transpile
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Zeigt zentrale Lizenzfreigabe und verweist auf EOS Admin.
 * Daten und Wirkung: Liest nur Capability-Metadaten; keinerlei Lizenzschlüssel,
 * UUID oder private Werte werden angefordert, eingegeben oder gespeichert.
 * Bei Änderungen: Admin-Rollenprüfung und Schlüsselvermeidung über die echten API-Pfade prüfen.
 * Verknüpfung: docs/security/EOS_UI_INTEGRATED_DE.md
 */
interface LicenseWindow extends Window {
  NW_AUTH?: { requireCapability(name: string, options: {pageName: string; requiredRole: string}): Promise<boolean> };
}
(function () {
  'use strict';
  const status = document.getElementById('nw-license-status');
  const admin = document.getElementById('nw-license-back') as HTMLAnchorElement | null;
  const reload = document.getElementById('nw-license-reload');
  if (admin) {
    const target = new URL(window.location.href);
    target.protocol = 'https:'; target.port = '8081'; target.pathname = '/'; target.search = ''; target.hash = '';
    admin.href = target.toString();
  }
  async function refresh(): Promise<void> {
    if (!(await (window as LicenseWindow).NW_AUTH?.requireCapability('license.manage', {pageName:'Lizenz',requiredRole:'Admin'}))) return;
    try {
      const response = await fetch('/api/license/info', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('Nicht verfügbar');
      const info = await response.json();
      if (status) status.textContent = info.valid === true ? 'Zentrale Lizenz gültig. Gerätesteuerung bleibt im Testprofil gesperrt.' : 'Keine aktuelle Lizenzfreigabe. Bitte die Lizenz im EOS Admin prüfen.';
    } catch (_) { if (status) status.textContent = 'Lizenzstatus nicht verfügbar. Bitte EOS Admin öffnen.'; }
  }
  reload?.addEventListener('click', () => { void refresh(); });
  void refresh();
})();
