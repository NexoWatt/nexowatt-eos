# src-ts/runtime-executables/ems/charging-budget-helpers.ts

Berechnet aus freigegebenen Ladepunkten, deren Grenzen und Stationszuordnung den Leistungsbedarf der Ladeinfrastruktur.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/ems/charging-budget-helpers.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/engine.ts](../../../../../src-ts/runtime-executables/ems/engine.ts)
- [src-ts/runtime-executables/ems/modules/charging-management.ts](../../../../../src-ts/runtime-executables/ems/modules/charging-management.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`positiveNumber`](../../../../../src-ts/runtime-executables/ems/charging-budget-helpers.ts#L29) | – | Number, Number.isFinite |
| [`resolveAcChargingLimits`](../../../../../src-ts/runtime-executables/ems/charging-budget-helpers.ts#L62) | – | Function.prototype.apply.call, Math.max, Number, String, maxCandidates.push, maxCandidates.sort |
| [`deriveChargingConnectorCapacityW`](../../../../../src-ts/runtime-executables/ems/charging-budget-helpers.ts#L121) | – | Function.prototype.apply.call, Math.max, Math.round, Number, Number.isFinite, String |
| [`computeChargingInfrastructureCapacity`](../../../../../src-ts/runtime-executables/ems/charging-budget-helpers.ts#L164) | – | Array.isArray, Function.prototype.apply.call, Math.max, Math.min, Math.round, Number, Number.isFinite, String, stationCaps.get, stationCaps.set, stationPortCapacityW.entries, stationPortCapacityW.get, stationPortCapacityW.set |
| [`computeChargingMinimumServicePlan`](../../../../../src-ts/runtime-executables/ems/charging-budget-helpers.ts#L235) | – | Array.isArray, Math.max, Math.min, Math.round, Number, Number.isFinite, Object.entries, String, capByStation.get, capByStation.has, capByStation.set, futureMinimumBySafe.set, futureStationMinimumBySafe.set, minimumBySafe.get (weitere in der Quelle) |
