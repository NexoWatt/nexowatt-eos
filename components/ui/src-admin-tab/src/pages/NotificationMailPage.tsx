/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Lädt und speichert die SMTP-Einrichtung über die geschützte Admin-API; das Passwortfeld startet leer und wird nach dem Speichern geleert.
 * Daten und Wirkung: Erhält nur öffentliche Konfigurationsfelder samt passwordSet; sendet ein neu eingegebenes Passwort ausschließlich beim Speichern an die geschützte API. Keine Speicherung des Passworts im Browser-Speicher.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-admin-tab/src/pages/NotificationMailPage.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import React, { useEffect, useState } from 'react';
import PageShell from './PageShell';
import { notificationMailRequest } from '../lib/adminConnection';

/**
 * Ablauf und Zusammenhang: Die geschützte React-Route lädt öffentliche SMTP-Felder über notificationMailRequest. Der Benutzername kommt vom Backend; ein vorhandenes Passwort wird nicht zurückgelesen.
 */
export default function NotificationMailPage() {
  // Authentication fields are loaded only from the protected server endpoint.
  // The sender address below is public metadata, not a bundled SMTP account.
  const [config, setConfig] = useState({ enabled: false, host: '', port: 465, tlsMode: 'tls', user: '', siteName: '', passwordSet: false });
  const [password, setPassword] = useState('');
  const [clearPassword, setClearPassword] = useState(false);
  const [busy, setBusy] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState('Versandkonfiguration wird geladen…');
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    notificationMailRequest().then(data => {
      if (active) { setConfig(data.config); setLoaded(true); setMessage('SMTP-Zugangsdaten werden verschlüsselt auf dieser Anlage gespeichert.'); }
    }).catch(e => { if (active) { setMessage(e.message); setError(true); } })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, []);
  const update = (field, value) => setConfig(previous => ({ ...previous, [field]: value }));
  /**
   * Ablauf und Zusammenhang: Sendet Konfiguration und gegebenenfalls neu eingegebenes Passwort an die Admin-API. Leeres Passwort bedeutet Beibehalten, clearPassword bedeutet Löschen; erst nach erfolgreicher Antwort werden Passwortfeld und Löschhaken zurückgesetzt.
   */
  const save = async event => {
    event.preventDefault(); setBusy(true); setError(false);
    try {
      const data = await notificationMailRequest({ ...config, password, clearPassword });
      setConfig(data.config); setPassword(''); setClearPassword(false);
      setMessage('Gespeichert. Unter Kunden-Einstellungen → Benachrichtigungen die Empfängeradresse eintragen und eine Test-Mail senden.');
    } catch (e) { setMessage(e.message); setError(true); }
    finally { setBusy(false); }
  };
  return <PageShell title="E-Mail-Versand" subtitle="Direkter Versand wichtiger EOS-Meldungen. Einrichtung ausschließlich durch den Admin." showBack={false}>
    <section className="nw-card">
      <form onSubmit={save} className="nw-access-gate__form" style={{ maxWidth: 680, margin: '0 auto' }}>
        <label className="nw-field-label"><input type="checkbox" checked={config.enabled} disabled={busy || !loaded} onChange={e => update('enabled', e.target.checked)} /> Direkten E-Mail-Versand aktivieren</label>
        <label className="nw-field-label" htmlFor="mailFrom">Absender</label>
        <input className="nw-input" id="mailFrom" value="info@nexowatt.com" readOnly />
        <label className="nw-field-label" htmlFor="mailSite">Anlagenname für die E-Mail</label>
        <input className="nw-input" id="mailSite" value={config.siteName} maxLength={100} disabled={busy} onChange={e => update('siteName', e.target.value)} placeholder="Zum Beispiel Firmenstandort Rhede" />
        <label className="nw-field-label" htmlFor="mailHost">SMTP-Server</label>
        <input className="nw-input" id="mailHost" value={config.host} disabled={busy} required={config.enabled} onChange={e => update('host', e.target.value)} placeholder="SMTP-Server des E-Mail-Anbieters" autoComplete="off" />
        <label className="nw-field-label" htmlFor="mailTls">Verschlüsselung</label>
        <select className="nw-input" id="mailTls" value={config.tlsMode} disabled={busy} onChange={e => { const mode = e.target.value; setConfig(previous => ({ ...previous, tlsMode: mode, port: [465, 587].includes(previous.port) ? (mode === 'tls' ? 465 : 587) : previous.port })); }}>
          <option value="tls">TLS (normalerweise Port 465)</option><option value="starttls">STARTTLS verpflichtend (normalerweise Port 587)</option>
        </select>
        <label className="nw-field-label" htmlFor="mailPort">SMTP-Port</label>
        <input className="nw-input" id="mailPort" type="number" min={1} max={65535} value={config.port} disabled={busy} onChange={e => update('port', Number(e.target.value))} />
        <label className="nw-field-label" htmlFor="mailUser">SMTP-Benutzer</label>
        <input className="nw-input" id="mailUser" value={config.user} disabled={busy} required={config.enabled} autoComplete="off" onChange={e => update('user', e.target.value)} />
        <label className="nw-field-label" htmlFor="mailPassword">SMTP-Passwort / App-Passwort</label>
        <input className="nw-input" id="mailPassword" type="password" autoComplete="new-password" value={password} disabled={busy} onChange={e => setPassword(e.target.value)} placeholder={config.passwordSet ? 'Gespeichert – leer lassen zum Beibehalten' : 'Noch nicht hinterlegt'} />
        <label className="nw-field-label"><input type="checkbox" checked={clearPassword} disabled={busy} onChange={e => setClearPassword(e.target.checked)} /> Gespeichertes Passwort löschen (Versand vorher deaktivieren)</label>
        <button className="nw-button nw-button--primary" type="submit" disabled={busy || !loaded}>{busy ? 'Bitte warten…' : 'Versandkonfiguration speichern'}</button>
        <div role="status" className={`nw-status ${error ? 'nw-status--bad' : 'nw-status--ok'}`}>{message}</div>
      </form>
    </section>
    <section className="nw-card">
      <h2>Meldeverhalten</h2>
      <p>Harte Fehler: sofort bei Erkennung. Normale Fehler: gesammelt alle 30 Minuten. Sonstige Hinweise, Entwarnungen und Erinnerungen an harte Fehler: als Tageszusammenfassung. Gleichzeitige Störungen werden gebündelt.</p>
      <p>Reguläre Ladepausen, Ladeende und normale PV-Abregelung erzeugen keine Störungsmail. Bei vollständigem Rechner- oder Internetausfall kann dieses Gerät selbst keine E-Mail versenden.</p>
      <a className="nw-button" href="/settings.html">Kunden-Benachrichtigungen öffnen</a>
      <a className="nw-button" href="/ems-apps.html">Zurück zum App-Center</a>
    </section>
  </PageShell>;
}
