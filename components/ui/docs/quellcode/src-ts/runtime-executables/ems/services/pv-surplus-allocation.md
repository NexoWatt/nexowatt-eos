# src-ts/runtime-executables/ems/services/pv-surplus-allocation.ts

Teilt verfügbaren PV-Überschuss und reservierten Ladebedarf zwischen den freigegebenen Nutzungen auf.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/services/pv-surplus-allocation.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/modules/charging-management.ts](../../../../../../src-ts/runtime-executables/ems/modules/charging-management.ts)
- [src-ts/runtime-executables/ems/modules/core-limits.ts](../../../../../../src-ts/runtime-executables/ems/modules/core-limits.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`clamp`](../../../../../../src-ts/runtime-executables/ems/services/pv-surplus-allocation.ts#L32) | value, min, max, fallback | Math.max, Math.min, Number, Number.isFinite |
| [`roundW`](../../../../../../src-ts/runtime-executables/ems/services/pv-surplus-allocation.ts#L37) | value | Math.round, Number, Number.isFinite |
| [`normalizePvSurplusPriority`](../../../../../../src-ts/runtime-executables/ems/services/pv-surplus-allocation.ts#L42) | value | String |
| [`buildPvSurplusAllocation`](../../../../../../src-ts/runtime-executables/ems/services/pv-surplus-allocation.ts#L50) | totalW, modeRaw, evcsSharePctRaw, options | Math.max, Math.min, Math.round, Number, Number.isFinite, clamp, normalizePvSurplusPriority, roundW |
| [`buildAutoPvPriorityReservation`](../../../../../../src-ts/runtime-executables/ems/services/pv-surplus-allocation.ts#L109) | input | Math.floor, Math.max, Math.min, String, positiveW, rows.push |
| [`positiveW`](../../../../../../src-ts/runtime-executables/ems/services/pv-surplus-allocation.ts#L116) | v | Math.max, Number, Number.isFinite |
