# src-ts/runtime-executables/ems/services/pv-source-identity.ts

Vereinheitlicht die Identität von PV-Quellen, damit dieselbe Quelle nicht mehrfach berücksichtigt wird.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/services/pv-source-identity.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

- [src-ts/runtime-executables/main.ts](../../../../../../src-ts/runtime-executables/main.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`text`](../../../../../../src-ts/runtime-executables/ems/services/pv-source-identity.ts#L30) | value | String |
| [`finiteNonNegative`](../../../../../../src-ts/runtime-executables/ems/services/pv-source-identity.ts#L34) | value | Math.max, Number, Number.isFinite |
| [`physicalPvSourceKey`](../../../../../../src-ts/runtime-executables/ems/services/pv-source-identity.ts#L44) | rawId | id.match, id.toLowerCase, text |
| [`dedupePvSourceRows`](../../../../../../src-ts/runtime-executables/ems/services/pv-source-identity.ts#L59) | input | Array.from, Math.max, Number, Number.isFinite, best.get, best.set, best.values, finiteNonNegative, id.toLowerCase, physicalPvSourceKey, rows.reduce, text |
| [`applyPvCapacityPlausibility`](../../../../../../src-ts/runtime-executables/ems/services/pv-source-identity.ts#L105) | rawValueW, installedCapacityW, toleranceRaw | Math.max, Math.min, Number, Number.isFinite, finiteNonNegative |
