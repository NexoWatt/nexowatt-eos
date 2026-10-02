# src-ts/ems/charging-management/charging-budget.ts

Berechnet den zwischen freigegebenen Ladepunkten verteilbaren Leistungsrahmen.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/ems/charging-management/charging-budget.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

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
| [`finiteOrNull`](../../../../../src-ts/ems/charging-management/charging-budget.ts#L65) | value | Number, Number.isFinite |
| [`applyMinCap`](../../../../../src-ts/ems/charging-management/charging-budget.ts#L76) | current, cap | Math.max, Math.min, Number.isFinite |
| [`appendBudgetModeSuffix`](../../../../../src-ts/ems/charging-management/charging-budget.ts#L87) | mode, suffix | String, m.includes |
| [`computeChargingBudgetSafetyCaps`](../../../../../src-ts/ems/charging-management/charging-budget.ts#L104) | input | Math.round, String, appendBudgetModeSuffix, applyMinCap, finiteOrNull |
| [`compareChargingBudgetSafetyCaps`](../../../../../src-ts/ems/charging-management/charging-budget.ts#L177) | js, input | cmp, computeChargingBudgetSafetyCaps |
| [`cmp`](../../../../../src-ts/ems/charging-management/charging-budget.ts#L180) | field, jsVal, tsVal | mismatches.push |
| [`buildChargingBudgetSafetyCapsProductive`](../../../../../src-ts/ems/charging-management/charging-budget.ts#L236) | js, input | compareChargingBudgetSafetyCaps |
| [`buildChargingBudgetProductiveDecision`](../../../../../src-ts/ems/charging-management/charging-budget.ts#L284) | js, input | String, buildChargingBudgetSafetyCapsProductive |
