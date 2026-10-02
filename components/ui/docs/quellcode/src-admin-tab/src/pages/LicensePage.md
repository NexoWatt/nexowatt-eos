# src-admin-tab/src/pages/LicensePage.tsx

Entfernt alte Lizenzschlüssel-Browserreste und leitet zur streng geschützten Runtime-Lizenzseite weiter.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-admin-tab/src/pages/LicensePage.tsx) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `react` | Node-Bordmittel oder externe Paketabhängigkeit. |
| `./RedirectPage` | [src-admin-tab/src/pages/RedirectPage.tsx](../../../../../src-admin-tab/src/pages/RedirectPage.tsx) |

**Direkt importiert von:**

- [src-admin-tab/src/App.tsx](../../../../../src-admin-tab/src/App.tsx)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`clearLegacyLicenseCache`](../../../../../src-admin-tab/src/pages/LicensePage.tsx#L23) | – | key.startsWith, keys.forEach, keys.push, storage.key |
| [`LicensePage`](../../../../../src-admin-tab/src/pages/LicensePage.tsx#L40) | – | useEffect |
