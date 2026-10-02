# src-ts/main/license-key.ts

Prüft Lizenzschlüssel-Eingaben und verhindert, dass maskierte Platzhalter gespeicherte Schlüssel überschreiben.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../src-ts/main/license-key.ts) · [Gesamtübersicht](../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

- [src-ts/main/index.ts](../../../../src-ts/main/index.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`normalizeMainLicenseInput`](../../../../src-ts/main/license-key.ts#L29) | value | String |
| [`isMainMaskedLicenseValue`](../../../../src-ts/main/license-key.ts#L39) | value | normalizeMainLicenseInput |
| [`analyzeMainLicenseInput`](../../../../src-ts/main/license-key.ts#L55) | value | String, isMainMaskedLicenseValue, normalizeMainLicenseInput |
