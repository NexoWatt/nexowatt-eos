# src-admin-tab/src/pages/PageShell.tsx

Stellt den gemeinsamen Seitenrahmen und die Navigation für die React-Admin-Seiten bereit.

**Daten und Wirkung:** Zeigt Seitentitel, Navigation und das vorhandene NexoWatt-Markenzeichen. Vite bindet das Bild in den jeweiligen Admin-/mail-setup-Buildpfad ein; Rollen werden weiterhin im Backend geprüft.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-admin-tab/src/pages/PageShell.tsx) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `react` | Node-Bordmittel oder externe Paketabhängigkeit. |
| `react-router-dom` | Node-Bordmittel oder externe Paketabhängigkeit. |
| `../lib/adminConnection` | [src-admin-tab/src/lib/adminConnection.ts](../../../../../src-admin-tab/src/lib/adminConnection.ts) |
| `../../../www/assets/icons/nexowatt-192.png` | [www/assets/icons/nexowatt-192.png](../../../../../www/assets/icons/nexowatt-192.png) |

**Direkt importiert von:**

- [src-admin-tab/src/pages/InstallerPage.tsx](../../../../../src-admin-tab/src/pages/InstallerPage.tsx)
- [src-admin-tab/src/pages/MeshCoordinatorPage.tsx](../../../../../src-admin-tab/src/pages/MeshCoordinatorPage.tsx)
- [src-admin-tab/src/pages/NotificationMailPage.tsx](../../../../../src-admin-tab/src/pages/NotificationMailPage.tsx)
- [src-admin-tab/src/pages/ProtectedRuntimeRoute.tsx](../../../../../src-admin-tab/src/pages/ProtectedRuntimeRoute.tsx)
- [src-admin-tab/src/pages/RedirectPage.tsx](../../../../../src-admin-tab/src/pages/RedirectPage.tsx)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`PageShell`](../../../../../src-admin-tab/src/pages/PageShell.tsx#L33) | { title, subtitle, children, actions = null, compact = false, showBack = true, backLabel = 'Zurück zum Installer', } | getInstance, useEffect |
