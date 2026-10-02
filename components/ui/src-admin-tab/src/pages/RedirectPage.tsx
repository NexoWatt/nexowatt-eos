/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Ermittelt die passende Adapter-URL und leitet in den vorgesehenen Runtime-Bereich weiter.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-admin-tab/src/pages/RedirectPage.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * NexoWatt Detail-Kommentar (DE)
 * Zweck dieser Ergänzung:
 * - Jede relevante Funktion, Methode, Route und UI-Ereignisbindung erhält einen eigenen Erklärungskommentar.
 * - Die Kommentare beschreiben Aufgabe, Daten-/API-Zusammenhang und TypeScript-Migrationshinweise.
 * - Es wurde keine Programmlogik geändert; diese Datei wurde nur für Wartbarkeit und spätere Typisierung dokumentiert.
 */

/**
 * Datei: src-admin-tab/src/pages/RedirectPage.tsx
 * Rolle im Projekt: Admin-React-Quelle.
 * Zweck: React-Quellcode für ioBroker-Admin-Tab und Installer-Einstiegsseiten.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Status: Diese Admin-Quelle ist auf .ts/.tsx umgestellt; der Browser erhält weiterhin ein gebautes JS-Bundle.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Quellcode der React-Admin-Tab-Oberfläche.
 * Zusammenhänge:
 * - Baut nach admin/react/ und öffnet Installer-/Lizenz-/Redirect-Seiten.
 * - Kommuniziert über AdminConnection/ioBroker Admin APIs.
 * Wartungshinweise:
 * - Bei UI-Änderungen anschließend admin:build ausführen.
 */

import React, { useEffect, useMemo, useState } from 'react';
import PageShell from './PageShell';
import {
  buildRuntimeBaseUrl,
  getInstance,
  openExternal,
  readAdapterPort,
} from '../lib/adminConnection';

const TARGETS = {
  appcenter: {
    title: 'EMS App-Center',
    path: '/ems-apps.html',
    needsAdminBackQuery: true,
  },
  simulation: {
    title: 'Simulation',
    path: '/simulation.html',
    needsAdminBackQuery: true,
  },
  license: {
    title: 'Lizenz',
    path: '/license.html',
    needsAdminBackQuery: true,
  },
  'smarthome-config': {
    title: 'SmartHome Config',
    path: '/smarthome-config.html',
    needsAdminBackQuery: true,
  },
  'smarthome-vis': {
    title: 'SmartHome VIS',
    path: '/smarthome.html',
    needsAdminBackQuery: false,
  },
};

/**
 * Code-Teil: appendAdminBackQuery
 * Zweck: Externe Runtime-Seiten bekommen den Admin-Port und die Adapterinstanz,
 * damit ihr „Zurück zum Installer“-Button nicht auf dem Runtime-Port nach
 * `tab.html` sucht, sondern sicher zu `/#tab-nexowatt-ui-<instanz>` springt.
 */
function appendAdminBackQuery(path, instance) {
  if (!path || !path.includes('.html')) return path;
  const sep = path.includes('?') ? '&' : '?';
  const adminPort = window.location.port || '8081';
  return `${path}${sep}nwAdmin=1&instance=${encodeURIComponent(String(instance))}&adminPort=${encodeURIComponent(adminPort)}`;
}

export default function RedirectPage({ targetKey }) {
  const target = TARGETS[targetKey];
  const instance = getInstance();
  const [port, setPort] = useState(8188);
  const [status, setStatus] = useState('Weiterleitung wird vorbereitet…');

  useEffect(() => {
    let active = true;

    (async () => {
      const resolvedPort = await readAdapterPort(instance);
      if (!active) {
        return;
      }

      setPort(resolvedPort);
      const baseUrl = buildRuntimeBaseUrl(resolvedPort);
      const url = `${baseUrl}${target.needsAdminBackQuery ? appendAdminBackQuery(target.path, instance) : target.path}`;
      setStatus('Öffne Seite…');
      setTimeout(() => openExternal(url), 50);
    })();

    return () => {
      active = false;
    };
  }, [instance, target.path]);
  const targetUrl = useMemo(() => `${buildRuntimeBaseUrl(port)}${target.needsAdminBackQuery ? appendAdminBackQuery(target.path, instance) : target.path}`, [port, target.path, target.needsAdminBackQuery, instance]);

  return (
    <PageShell title={target.title} subtitle="Weiterleitung wird vorbereitet…">
      <section className="nw-card nw-card--centered">
        <div className="nw-status nw-status--ok">{status}</div>
        <div className="nw-actions-row nw-actions-row--centered">
          <button className="nw-button nw-button--primary" onClick={() => openExternal(targetUrl)} type="button">
            Jetzt öffnen
          </button>
        </div>
      </section>
    </PageShell>
  );
}
