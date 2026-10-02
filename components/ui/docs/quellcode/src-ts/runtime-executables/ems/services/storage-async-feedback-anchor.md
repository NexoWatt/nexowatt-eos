# src-ts/runtime-executables/ems/services/storage-async-feedback-anchor.ts

Ordnet zeitversetzte Speicher-Rückmeldungen den zuvor wirksamen Stellanforderungen zu.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/services/storage-async-feedback-anchor.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/modules/storage-control.ts](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`finiteOrNull`](../../../../../../src-ts/runtime-executables/ems/services/storage-async-feedback-anchor.ts#L59) | value | Number, Number.isFinite |
| [`clamp`](../../../../../../src-ts/runtime-executables/ems/services/storage-async-feedback-anchor.ts#L65) | value, min, max | Math.max, Math.min |
| [`estimateAsyncStorageFeedback`](../../../../../../src-ts/runtime-executables/ems/services/storage-async-feedback-anchor.ts#L67) | input | Math.abs, Math.max, String, clamp, finiteOrNull, inactive |
| [`inactive`](../../../../../../src-ts/runtime-executables/ems/services/storage-async-feedback-anchor.ts#L79) | reason | – |
