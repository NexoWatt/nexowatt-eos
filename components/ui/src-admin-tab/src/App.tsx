/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Ordnet die React-Routen ihren Seiten und der jeweils erforderlichen Rollen-/Sitzungsprüfung zu.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-admin-tab/src/App.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Datei: src-admin-tab/src/App.tsx
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
import { Navigate, Route, Routes } from 'react-router-dom';
import InstallerPage from './pages/InstallerPage';
import MeshCoordinatorPage from './pages/MeshCoordinatorPage';
import NotificationMailPage from './pages/NotificationMailPage';
import LicensePage from './pages/LicensePage';
import RedirectPage from './pages/RedirectPage';
import ProtectedRuntimeRoute from './pages/ProtectedRuntimeRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/mesh-coordinator" element={<ProtectedRuntimeRoute capability="mesh.configure" requiredRole="Installer oder Admin" title="Microgrid">{window.location.pathname.startsWith('/ems/microgrid') ? <MeshCoordinatorPage /> : <RedirectPage targetKey="appcenter" />}</ProtectedRuntimeRoute>} />
      <Route path="/notification-mail" element={<ProtectedRuntimeRoute capability="notifications.manage" requiredRole="Admin" title="E-Mail-Versand"><NotificationMailPage /></ProtectedRuntimeRoute>} />
      <Route
        element={<ProtectedRuntimeRoute capability="appcenter.open" title="Installer"><InstallerPage /></ProtectedRuntimeRoute>}
        path="/"
      />
      <Route
        element={<ProtectedRuntimeRoute capability="appcenter.open" title="Installer"><InstallerPage /></ProtectedRuntimeRoute>}
        path="/installer"
      />
      <Route
        element={<ProtectedRuntimeRoute capability="license.manage" requiredRole="Admin" title="Lizenz"><LicensePage /></ProtectedRuntimeRoute>}
        path="/license"
      />
      <Route
        element={<ProtectedRuntimeRoute capability="appcenter.open" title="EMS App-Center"><RedirectPage targetKey="appcenter" /></ProtectedRuntimeRoute>}
        path="/redirect/appcenter"
      />
      <Route
        element={<ProtectedRuntimeRoute capability="simulation.open" title="Simulation"><RedirectPage targetKey="simulation" /></ProtectedRuntimeRoute>}
        path="/redirect/simulation"
      />
      <Route element={<RedirectPage targetKey="smarthome-config" />} path="/redirect/smarthome-config" />
      <Route element={<RedirectPage targetKey="smarthome-vis" />} path="/redirect/smarthome-vis" />
      <Route element={<Navigate replace to="/installer" />} path="*" />
    </Routes>
  );
}
