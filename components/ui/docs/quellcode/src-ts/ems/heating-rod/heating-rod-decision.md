# src-ts/ems/heating-rod/heating-rod-decision.ts

Berechnet aus Temperatur-/Freigabebedingungen und Energieangebot die Heizstab-Entscheidung.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/ems/heating-rod/heating-rod-decision.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `../../contracts/heating-rod` | [src-ts/contracts/heating-rod.ts](../../../../../src-ts/contracts/heating-rod.ts) |
| `../../contracts/units` | [src-ts/contracts/units.ts](../../../../../src-ts/contracts/units.ts) |
| `../../utils/number` | [src-ts/utils/number.ts](../../../../../src-ts/utils/number.ts) |

**Direkt importiert von:**

- [src-ts/ems/heating-rod/index.ts](../../../../../src-ts/ems/heating-rod/index.ts)
- [src-ts/runtime-executables/ems/modules/heating-rod-control.ts](../../../../../src-ts/runtime-executables/ems/modules/heating-rod-control.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`sortedStages`](../../../../../src-ts/ems/heating-rod/heating-rod-decision.ts#L40) | stages | – |
| [`chooseLargestStageWithinBudget`](../../../../../src-ts/ems/heating-rod/heating-rod-decision.ts#L56) | stages, budgetW | sortedStages |
| [`isHeatingRodStorageReserveActive`](../../../../../src-ts/ems/heating-rod/heating-rod-decision.ts#L76) | input | toNumberOrNull |
| [`evaluateHeatingRodDecision`](../../../../../src-ts/ems/heating-rod/heating-rod-decision.ts#L99) | input | Math.max, Math.round, chooseLargestStageWithinBudget, isHeatingRodStorageReserveActive, positiveWatt |
| [`buildHeatingRodLegacyRemovalPlan`](../../../../../src-ts/ems/heating-rod/heating-rod-decision.ts#L236) | input | blockers.push, toCount, warnings.push |
| [`toCount`](../../../../../src-ts/ems/heating-rod/heating-rod-decision.ts#L237) | value | Math.max, Math.round, Number, Number.isFinite |
