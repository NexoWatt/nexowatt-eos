# src-ts/runtime-executables/www/netoperator.ts

Stellt Bedien- und Diagnoseinformationen der Netzbetreiber-Schnittstelle im Browser dar.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/www/netoperator.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

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
| [`$`](../../../../../src-ts/runtime-executables/www/netoperator.ts#L12) | id | document.getElementById |
| [`text`](../../../../../src-ts/runtime-executables/www/netoperator.ts#L13) | id, value | $, String |
| [`fmt`](../../../../../src-ts/runtime-executables/www/netoperator.ts#L14) | value, unit, digits | Number, Number.isFinite, n.toLocaleString |
| [`valueOf`](../../../../../src-ts/runtime-executables/www/netoperator.ts#L18) | snapshot, key | – |
| [`esc`](../../../../../src-ts/runtime-executables/www/netoperator.ts#L22) | value | String |
| [`render`](../../../../../src-ts/runtime-executables/www/netoperator.ts#L24) | payload | $, Array.isArray, Number, Number.isFinite, String, events.map, fmt, payload.audit.slice, text, valueOf |
| [`load`](../../../../../src-ts/runtime-executables/www/netoperator.ts#L76) | – | fetch, render, response.json, text |
| [`raw`](../../../../../src-ts/runtime-executables/www/netoperator.ts#L87) | – | $, JSON.stringify, fetch, response.json |
