# src-admin-tab/src/App.tsx

Ordnet die React-Routen ihren Seiten und der jeweils erforderlichen Rollen-/Sitzungsprüfung zu.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../src-admin-tab/src/App.tsx) · [Gesamtübersicht](../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `react` | Node-Bordmittel oder externe Paketabhängigkeit. |
| `react-router-dom` | Node-Bordmittel oder externe Paketabhängigkeit. |
| `./pages/InstallerPage` | [src-admin-tab/src/pages/InstallerPage.tsx](../../../../src-admin-tab/src/pages/InstallerPage.tsx) |
| `./pages/MeshCoordinatorPage` | [src-admin-tab/src/pages/MeshCoordinatorPage.tsx](../../../../src-admin-tab/src/pages/MeshCoordinatorPage.tsx) |
| `./pages/NotificationMailPage` | [src-admin-tab/src/pages/NotificationMailPage.tsx](../../../../src-admin-tab/src/pages/NotificationMailPage.tsx) |
| `./pages/LicensePage` | [src-admin-tab/src/pages/LicensePage.tsx](../../../../src-admin-tab/src/pages/LicensePage.tsx) |
| `./pages/RedirectPage` | [src-admin-tab/src/pages/RedirectPage.tsx](../../../../src-admin-tab/src/pages/RedirectPage.tsx) |
| `./pages/ProtectedRuntimeRoute` | [src-admin-tab/src/pages/ProtectedRuntimeRoute.tsx](../../../../src-admin-tab/src/pages/ProtectedRuntimeRoute.tsx) |

**Direkt importiert von:**

- [src-admin-tab/src/main.tsx](../../../../src-admin-tab/src/main.tsx)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`App`](../../../../src-admin-tab/src/App.tsx#L35) | – | window.location.pathname.startsWith |
