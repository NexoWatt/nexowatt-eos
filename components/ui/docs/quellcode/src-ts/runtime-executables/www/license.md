# src-ts/runtime-executables/www/license.ts

Zeigt zentrale Lizenzfreigabe und verweist auf EOS Admin.

**Daten und Wirkung:** Liest nur Capability-Metadaten; keinerlei Lizenzschlüssel,

**Bei Änderungen:** Admin-Rollenprüfung und Schlüsselvermeidung über die echten API-Pfade prüfen.

[Originalquelle](../../../../../src-ts/runtime-executables/www/license.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

Kein direkter Import innerhalb des erfassten Quellbereichs. Mögliche HTML-, Adapter-, Build- oder dynamische Einstiege sind separat zu prüfen.

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`refresh`](../../../../../src-ts/runtime-executables/www/license.ts#L23) | – | AbortSignal.timeout, fetch, response.json |
