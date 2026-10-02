# src-ts/runtime-executables/ems/services/storage-farm-aggregation.ts

Aggregiert Speicherfarm-Werte unter Berücksichtigung der verwendeten Mess- und Zuordnungskonfiguration.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/services/storage-farm-aggregation.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

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
| [`nonNegativeNumber`](../../../../../../src-ts/runtime-executables/ems/services/storage-farm-aggregation.ts#L25) | value | Math.max, Number, Number.isFinite |
| [`arithmeticMean`](../../../../../../src-ts/runtime-executables/ems/services/storage-farm-aggregation.ts#L34) | values | Array.isArray, Number, Number.isFinite, valid.push, valid.reduce |
| [`capacityWeightedMean`](../../../../../../src-ts/runtime-executables/ems/services/storage-farm-aggregation.ts#L51) | entries | Array.isArray, Number, Number.isFinite |
| [`normalizeFarmPower`](../../../../../../src-ts/runtime-executables/ems/services/storage-farm-aggregation.ts#L72) | chargeW, dischargeW | nonNegativeNumber |
| [`combineStorageFarmPv`](../../../../../../src-ts/runtime-executables/ems/services/storage-farm-aggregation.ts#L93) | input | Math.abs, Math.max, Math.min, Number, Number.isFinite, nonNegativeNumber |
