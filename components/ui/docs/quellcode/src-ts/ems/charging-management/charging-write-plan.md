# src-ts/ems/charging-management/charging-write-plan.ts

Erzeugt aus dem freigegebenen Ladeplan einen typisierten Schreibplan; die tatsächlichen Hardware-Schreiboperationen führt der Laufzeit-Executor aus.

**Daten und Wirkung:** Erhält den begrenzten Allocation-Plan; liefert geplante Datenpunktwerte und Sperrgründe. Der Aufrufer bleibt für die endgültige Sicherheitsprüfung und den Schreibvorgang verantwortlich.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/ems/charging-management/charging-write-plan.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

- [src-ts/ems/charging-management/index.ts](../../../../../src-ts/ems/charging-management/index.ts)
- [src-ts/runtime-executables/ems/modules/charging-management.ts](../../../../../src-ts/runtime-executables/ems/modules/charging-management.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`finiteOrNull`](../../../../../src-ts/ems/charging-management/charging-write-plan.ts#L179) | value | Number, Number.isFinite, value.trim |
| [`nonNegative`](../../../../../src-ts/ems/charging-management/charging-write-plan.ts#L190) | value | Math.round, finiteOrNull |
| [`nonNegativeFloat`](../../../../../src-ts/ems/charging-management/charging-write-plan.ts#L195) | value | Number, finiteOrNull, n.toFixed |
| [`boolValue`](../../../../../src-ts/ems/charging-management/charging-write-plan.ts#L200) | value, fallback | Number.isFinite, value.trim |
| [`str`](../../../../../src-ts/ems/charging-management/charging-write-plan.ts#L211) | value, fallback | String |
| [`safeKey`](../../../../../src-ts/ems/charging-management/charging-write-plan.ts#L216) | value, fallbackIndex | raw.toLowerCase, str |
| [`buildAllocationMap`](../../../../../src-ts/ems/charging-management/charging-write-plan.ts#L222) | input | Array.isArray |
| [`buildChargingSetpointWritePlan`](../../../../../src-ts/ems/charging-management/charging-write-plan.ts#L245) | input | Array.isArray, Date.now, Number.isFinite, String, allSafes.add, allocationBySafe.get, allocationBySafe.keys, blockers.push, boolValue, buildAllocationMap, entries.filter, entries.push, finiteOrNull, nonNegative (weitere in der Quelle) |
| [`cloneWriteEntries`](../../../../../src-ts/ems/charging-management/charging-write-plan.ts#L392) | plan | Array.isArray, plan.entries.map |
| [`buildChargingSetpointWritePlanProductivePrep`](../../../../../src-ts/ems/charging-management/charging-write-plan.ts#L400) | input, plan | Array.isArray, Date.now, blockers.includes, blockers.push, buildChargingSetpointWritePlan, cloneWriteEntries, entries.filter, finiteOrNull |
| [`buildChargingSetpointWritePlanProductive`](../../../../../src-ts/ems/charging-management/charging-write-plan.ts#L462) | input, plan | Array.isArray, Date.now, blockers.push, boolValue, buildChargingSetpointWritePlan, buildChargingSetpointWritePlanProductivePrep, finiteOrNull, prep.apply.entries.map, prep.entries.map |
