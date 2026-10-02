# src-ts/runtime-executables/www/rfid-report.ts

Bereitet RFID-bezogene Ladevorgänge und Zuordnungen für die Berichtsanzeige auf.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/www/rfid-report.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

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
| [`nwReportLocaleTag`](../../../../../src-ts/runtime-executables/www/rfid-report.ts#L75) | – | String, lang.startsWith, window.NexoWattI18n.localeTag |
| [`format`](../../../../../src-ts/runtime-executables/www/rfid-report.ts#L75) | value | nwReportLocaleTag |
| [`format`](../../../../../src-ts/runtime-executables/www/rfid-report.ts#L76) | value | nwReportLocaleTag |
| [`format`](../../../../../src-ts/runtime-executables/www/rfid-report.ts#L77) | value | nwReportLocaleTag |
| [`fmtDateRange`](../../../../../src-ts/runtime-executables/www/rfid-report.ts#L84) | fromMs, toMs | Number, Number.isFinite, df.toLocaleDateString, dt.toLocaleDateString, nwReportLocaleTag |
| [`setMeta`](../../../../../src-ts/runtime-executables/www/rfid-report.ts#L99) | text | – |
| [`setError`](../../../../../src-ts/runtime-executables/www/rfid-report.ts#L109) | msg | document.createElement, setMeta, tbody.appendChild, tr.appendChild |
| [`render`](../../../../../src-ts/runtime-executables/www/rfid-report.ts#L127) | report | Array.isArray, Number, String, document.createElement, fmtDateRange, nfInt.format, nfKw.format, nfKwh.format, setMeta, tbody.appendChild, tr.appendChild |
| [`load`](../../../../../src-ts/runtime-executables/www/rfid-report.ts#L178) | – | encodeURIComponent, fetch, r.json, render, setError, setMeta |
| [`openCsv`](../../../../../src-ts/runtime-executables/www/rfid-report.ts#L207) | – | encodeURIComponent, window.open |
| [`openCsvSessions`](../../../../../src-ts/runtime-executables/www/rfid-report.ts#L220) | – | encodeURIComponent, window.open |
