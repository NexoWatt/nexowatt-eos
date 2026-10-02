# src-admin-tab/src/pages/InstallerPage.tsx

Zeigt die zur angemeldeten Rolle passenden Einstiege in App-Center, Simulation, SmartHome und Admin-Verwaltung.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-admin-tab/src/pages/InstallerPage.tsx) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `react` | Node-Bordmittel oder externe Paketabhängigkeit. |
| `./PageShell` | [src-admin-tab/src/pages/PageShell.tsx](../../../../../src-admin-tab/src/pages/PageShell.tsx) |
| `./ProtectedRuntimeRoute` | [src-admin-tab/src/pages/ProtectedRuntimeRoute.tsx](../../../../../src-admin-tab/src/pages/ProtectedRuntimeRoute.tsx) |
| `../lib/adminConnection` | [src-admin-tab/src/lib/adminConnection.ts](../../../../../src-admin-tab/src/lib/adminConnection.ts) |

**Direkt importiert von:**

- [src-admin-tab/src/App.tsx](../../../../../src-admin-tab/src/App.tsx)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`InstallerPage`](../../../../../src-admin-tab/src/pages/InstallerPage.tsx#L46) | – | actions.filter, getInstance, useEffect, useMemo, useRuntimeAccess, useState |
| [`onClick`](../../../../../src-admin-tab/src/pages/InstallerPage.tsx#L84) | – | openExternal |
| [`onClick`](../../../../../src-admin-tab/src/pages/InstallerPage.tsx#L88) | – | openExternal |
| [`onClick`](../../../../../src-admin-tab/src/pages/InstallerPage.tsx#L92) | – | openExternal |
| [`onClick`](../../../../../src-admin-tab/src/pages/InstallerPage.tsx#L96) | – | openExternal |
| [`onClick`](../../../../../src-admin-tab/src/pages/InstallerPage.tsx#L101) | – | openExternal |
| [`onClick`](../../../../../src-admin-tab/src/pages/InstallerPage.tsx#L105) | – | openExternal |
| [`onClick`](../../../../../src-admin-tab/src/pages/InstallerPage.tsx#L109) | – | openExternal |
