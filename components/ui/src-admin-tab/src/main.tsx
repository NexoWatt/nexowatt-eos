/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Startet React im Admin-Dokument und bindet Routing sowie die App-Komponente ein.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-admin-tab/src/main.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Datei: src-admin-tab/src/main.tsx
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

import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
