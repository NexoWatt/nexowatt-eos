# src-ts/runtime-executables/www/para14a-report.ts

Bereitet §14a-Zustände und Ereignisse für die Berichtsanzeige auf.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/www/para14a-report.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

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
| [`defaultFromMs`](../../../../../src-ts/runtime-executables/www/para14a-report.ts#L64) | – | C.getQuery, C.parseInputValue, Date.now |
| [`defaultToMs`](../../../../../src-ts/runtime-executables/www/para14a-report.ts#L75) | – | C.getQuery, C.parseInputValue, Date.now |
| [`fillInputs`](../../../../../src-ts/runtime-executables/www/para14a-report.ts#L86) | – | C.el, C.toInputValue, defaultFromMs, defaultToMs |
| [`getRange`](../../../../../src-ts/runtime-executables/www/para14a-report.ts#L98) | – | C.el, C.parseInputValue, Math.max, defaultFromMs, defaultToMs |
| [`renderFlags`](../../../../../src-ts/runtime-executables/www/para14a-report.ts#L114) | meta | C.el, C.fmtNum, items.forEach, items.push |
| [`renderSummary`](../../../../../src-ts/runtime-executables/www/para14a-report.ts#L136) | summary, meta | C.el, C.fmtDateTime, C.fmtNum, items.forEach |
| [`renderMeta`](../../../../../src-ts/runtime-executables/www/para14a-report.ts#L163) | meta | C.el, C.fmtDateTime, parts.join, parts.push, renderFlags |
| [`renderTable`](../../../../../src-ts/runtime-executables/www/para14a-report.ts#L185) | events | Array.isArray, C.el, empty.classList.toggle, rows.forEach |
| [`load`](../../../../../src-ts/runtime-executables/www/para14a-report.ts#L223) | – | C.el, C.setUrlParams, empty.classList.remove, encodeURIComponent, fetch, getRange, renderMeta, renderSummary, renderTable |
| [`loadAndPrint`](../../../../../src-ts/runtime-executables/www/para14a-report.ts#L256) | – | load, window.print |
| [`exportCsv`](../../../../../src-ts/runtime-executables/www/para14a-report.ts#L269) | – | Array.isArray, C.downloadText, String, lines.join, rows.forEach, start.getDate, start.getFullYear, start.getMonth |
| [`init`](../../../../../src-ts/runtime-executables/www/para14a-report.ts#L305) | – | C.el, C.setupTopbar, backBtn.addEventListener, exportBtn.addEventListener, fillInputs, fromInput.addEventListener, load, printBtn.addEventListener, reloadBtn.addEventListener, toInput.addEventListener |
