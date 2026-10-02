/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Entfernt alte Lizenzschlüssel-Browserreste und leitet zur streng geschützten Runtime-Lizenzseite weiter.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-admin-tab/src/pages/LicensePage.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Datei: src-admin-tab/src/pages/LicensePage.tsx
 * Rolle: Kompatibilitäts-Weiterleitung zur streng geschützten Runtime-Lizenzseite.
 *
 * Sicherheitsvertrag:
 * - Im Admin-Bundle werden weder System-UUID noch Lizenzschlüssel gelesen,
 *   zwischengespeichert oder bearbeitet.
 * - Die Runtime-Seite `/license.html` erzwingt server- und clientseitig die
 *   Capability `license.manage` und lädt Daten erst nach einer Admin-Session.
 */

import React, { useEffect } from 'react';
import RedirectPage from './RedirectPage';

function clearLegacyLicenseCache(): void {
  for (const storageName of ['localStorage', 'sessionStorage'] as const) {
    try {
      const storage = window[storageName];
      const keys: string[] = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key && key.startsWith('nexowatt-ui.licenseKey.')) keys.push(key);
      }
      keys.forEach((key) => storage.removeItem(key));
    } catch {
      // Browser-Speicher kann durch Richtlinien blockiert sein. Die Weiterleitung
      // bleibt dennoch sicher, weil neue Lizenzdaten dort nie gespeichert werden.
    }
  }
}

export default function LicensePage() {
  useEffect(() => {
    clearLegacyLicenseCache();
  }, []);

  return <RedirectPage targetKey="license" />;
}
