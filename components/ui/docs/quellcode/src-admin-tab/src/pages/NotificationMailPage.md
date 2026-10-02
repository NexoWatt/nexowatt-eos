# src-admin-tab/src/pages/NotificationMailPage.tsx

Lädt und speichert die SMTP-Einrichtung über die geschützte Admin-API; das Passwortfeld startet leer und wird nach dem Speichern geleert.

**Daten und Wirkung:** Erhält nur öffentliche Konfigurationsfelder samt passwordSet; sendet ein neu eingegebenes Passwort ausschließlich beim Speichern an die geschützte API. Keine Speicherung des Passworts im Browser-Speicher.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-admin-tab/src/pages/NotificationMailPage.tsx) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `react` | Node-Bordmittel oder externe Paketabhängigkeit. |
| `./PageShell` | [src-admin-tab/src/pages/PageShell.tsx](../../../../../src-admin-tab/src/pages/PageShell.tsx) |
| `../lib/adminConnection` | [src-admin-tab/src/lib/adminConnection.ts](../../../../../src-admin-tab/src/lib/adminConnection.ts) |

**Direkt importiert von:**

- [src-admin-tab/src/App.tsx](../../../../../src-admin-tab/src/App.tsx)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`NotificationMailPage`](../../../../../src-admin-tab/src/pages/NotificationMailPage.tsx#L16) | – | useEffect, useState |
| [`update`](../../../../../src-admin-tab/src/pages/NotificationMailPage.tsx#L34) | field, value | setConfig |
| [`save`](../../../../../src-admin-tab/src/pages/NotificationMailPage.tsx#L38) | event | event.preventDefault, notificationMailRequest, setBusy, setClearPassword, setConfig, setError, setMessage, setPassword |
