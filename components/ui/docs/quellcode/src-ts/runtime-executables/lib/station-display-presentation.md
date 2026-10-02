# src-ts/runtime-executables/lib/station-display-presentation.ts

Bereitet Ladepunkt-Zustände und Entscheidungsgründe für eine konsistente Stationsanzeige auf.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/lib/station-display-presentation.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

- [src-ts/runtime-executables/main.ts](../../../../../src-ts/runtime-executables/main.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`buildStationDisplayPresentation`](../../../../../src-ts/runtime-executables/lib/station-display-presentation.ts#L74) | input | Array.isArray, Math.round, String, activeModes.join, addDecision, addWarning, connectors.filter, connectors.reduce, decisionLines.slice, goalConnectors.filter, input.connectors.filter, issues.slice, warnings.filter, warnings.find (weitere in der Quelle) |
| [`addWarning`](../../../../../src-ts/runtime-executables/lib/station-display-presentation.ts#L87) | level, title, message, lp | String, warnings.push, warnings.some |
| [`addDecision`](../../../../../src-ts/runtime-executables/lib/station-display-presentation.ts#L125) | text, level | String, decisionLines.push, decisionLines.some |
