/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Rendert geschützte React-Inhalte erst nach erfolgreicher EOS-Sitzungs- und Rollenprüfung und sperrt sie bei Sitzungsverlust erneut.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-admin-tab/src/pages/ProtectedRuntimeRoute.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Geschützte Admin-Route für NexoWatt EOS.
 *
 * Die Komponente rendert sensible Inhalte erst, nachdem die Adapter-eigene
 * EOS-Session die geforderte Capability bestätigt hat. Dadurch bleiben Lizenz,
 * EMS und Simulation auch bei direktem Deep-Link oder offenem Admin-Tab gesperrt.
 */
import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import PageShell from './PageShell';
import {
  getInstance,
  loginRuntimeAuth,
  logoutRuntimeAuth,
  readRuntimeAuthStatus,
} from '../lib/adminConnection';

const RuntimeAccessContext = createContext(null);
export function useRuntimeAccess() { return useContext(RuntimeAccessContext); }

/**
 * Ablauf und Zusammenhang: Prüft neben der Capability für SMTP und Lizenz ausdrücklich die Admin-Rolle. Alte Installer-Sitzungen mit überbreiten Berechtigungen dürfen diese Bereiche nicht freigeben.
 */
function hasCapability(status, capability) {
  if (['license.manage', 'notifications.manage'].includes(String(capability || '')) && status?.role !== 'admin') return false;
  if (capability === 'mesh.configure' && !['admin', 'installer'].includes(status?.role)) return false;
  const capabilities = Array.isArray(status?.capabilities) ? status.capabilities.map(String) : [];
  return capabilities.includes('*') || capabilities.includes(String(capability || ''));
}

/**
 * Ablauf und Zusammenhang: Hält geschützte Inhalte während Anmeldung/Prüfung verborgen und kontrolliert den Sitzungsstatus regelmäßig neu. Die Prüfung ergänzt die Backend-Sperre und ersetzt sie nicht.
 */
export default function ProtectedRuntimeRoute({
  capability,
  title,
  requiredRole = 'Installer oder Admin',
  children,
}) {
  const instance = getInstance();
  const [phase, setPhase] = useState('checking');
  const [status, setStatus] = useState(null);
  const [user, setUser] = useState(() => {
    try { return window.localStorage.getItem('nexowatt-eos.lastAuthUser') || ''; } catch { return ''; }
  });
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('Berechtigung wird geprüft…');
  const [busy, setBusy] = useState(false);

  const authorized = useMemo(
    () => !!(status?.enabled !== false && status?.authed && hasCapability(status, capability)),
    [status, capability]
  );

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setPhase('checking');
      setMessage('Berechtigung wird geprüft…');
    }
    try {
      const next = await readRuntimeAuthStatus(instance, null);
      setStatus(next || null);
      if (next?.enabled === false) {
        setPhase('locked');
        setMessage('Die EOS-Authentifizierung ist deaktiviert. Der geschützte Bereich bleibt aus Sicherheitsgründen gesperrt.');
        return false;
      }
      if (next?.authed && hasCapability(next, capability)) {
        setPhase('authorized');
        setMessage('Zugriff freigegeben.');
        return true;
      }
      setPhase('locked');
      setMessage(next?.authed
        ? `Das angemeldete Konto besitzt nicht die erforderliche Rolle (${requiredRole}).`
        : `Bitte als ${requiredRole} anmelden.`);
      return false;
    } catch (error) {
      setStatus(null);
      setPhase('locked');
      setMessage(`Berechtigungsprüfung nicht erreichbar: ${error?.message || String(error)}. Der Bereich bleibt gesperrt.`);
      return false;
    }
  }, [capability, instance, requiredRole]);

  useEffect(() => {
    let active = true;
    refresh().catch(() => {});
    const timer = window.setInterval(() => {
      if (!active) return;
      refresh({ silent: true }).catch(() => {});
    }, 30000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [refresh]);

  const submitLogin = async (event) => {
    event?.preventDefault?.();
    const cleanUser = String(user || '').trim();
    if (!cleanUser || !password) {
      setMessage('Bitte Benutzername und Passwort eingeben.');
      return;
    }
    setBusy(true);
    setMessage('Anmeldung läuft…');
    try {
      await loginRuntimeAuth(instance, cleanUser, password, null);
      try { window.localStorage.setItem('nexowatt-eos.lastAuthUser', cleanUser); } catch {}
      setPassword('');
      const ok = await refresh({ silent: true });
      if (!ok) setMessage(`Anmeldung erfolgreich, aber die erforderliche Rolle (${requiredRole}) fehlt.`);
    } catch (error) {
      const code = Number(error?.status || 0);
      setMessage(code === 429
        ? 'Zu viele fehlgeschlagene Anmeldeversuche. Bitte später erneut versuchen.'
        : code === 401
          ? 'Benutzername oder Passwort ist falsch.'
          : `Anmeldung fehlgeschlagen: ${error?.message || String(error)}`);
      setPhase('locked');
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    setBusy(true);
    try { await logoutRuntimeAuth(instance, null); } catch {}
    setPassword('');
    setStatus(null);
    setPhase('locked');
    setMessage(`Abgemeldet. Bitte als ${requiredRole} anmelden.`);
    setBusy(false);
  };

  if (authorized && phase === 'authorized') {
    return (
      <RuntimeAccessContext.Provider value={status}><div className="nw-protected-route">
        <div className="nw-protected-route__session">
          <span>{status?.user ? `Angemeldet als ${status.user} (${status.role || 'berechtigt'})` : 'Geschützter Zugriff aktiv'}</span>
          <button className="nw-button" disabled={busy} onClick={logout} type="button">Abmelden</button>
        </div>
        {children}
      </div></RuntimeAccessContext.Provider>
    );
  }

  return (
    <PageShell
      title={title}
      subtitle={`Dieser Bereich ist ausschließlich für ${requiredRole} freigegeben. Inhalte und Lizenzdaten werden erst nach erfolgreicher EOS-Anmeldung geladen.`}
      showBack={false}
      compact
    >
      <section className="nw-card nw-access-gate" aria-busy={phase === 'checking' || busy}>
        <h2>Zugriff geschützt</h2>
        <p className="nw-text-muted">Direkte Links, Browser-Lesezeichen und erneutes Laden umgehen diese Sperre nicht.</p>
        <form className="nw-access-gate__form" onSubmit={submitLogin}>
          <label className="nw-field-label" htmlFor="nwAuthUser">Benutzer</label>
          <input
            autoComplete="username"
            className="nw-input"
            disabled={busy}
            id="nwAuthUser"
            onChange={(event) => setUser(event.target.value)}
            placeholder={requiredRole === 'Admin' ? 'admin' : 'installer oder admin'}
            type="text"
            value={user}
          />
          <label className="nw-field-label" htmlFor="nwAuthPassword">Passwort</label>
          <input
            autoComplete="current-password"
            className="nw-input"
            disabled={busy}
            id="nwAuthPassword"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
          <div className="nw-actions-row">
            <button className="nw-button nw-button--primary" disabled={busy || phase === 'checking'} type="submit">
              {busy ? 'Bitte warten…' : 'Anmelden'}
            </button>
            <button className="nw-button" disabled={busy} onClick={() => refresh()} type="button">Erneut prüfen</button>
          </div>
        </form>
        <div className={`nw-status ${authorized ? 'nw-status--ok' : 'nw-status--bad'}`}>{message}</div>
      </section>
    </PageShell>
  );
}
