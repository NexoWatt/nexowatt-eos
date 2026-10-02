# src-ts/ems/charging-management/charging-phase-selection.ts

Berechnet die gewünschte Phasenzahl und erforderliche Wechselbedingungen für dafür freigegebene AC-Ladepunkte.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/ems/charging-management/charging-phase-selection.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

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
| [`finiteOrNull`](../../../../../src-ts/ems/charging-management/charging-phase-selection.ts#L180) | value | Number, Number.isFinite, value.trim |
| [`nonNegative`](../../../../../src-ts/ems/charging-management/charging-phase-selection.ts#L191) | value, fallback | Math.round, finiteOrNull |
| [`boolValue`](../../../../../src-ts/ems/charging-management/charging-phase-selection.ts#L197) | value, fallback | Number.isFinite, value.trim |
| [`str`](../../../../../src-ts/ems/charging-management/charging-phase-selection.ts#L208) | value, fallback | String |
| [`safeKey`](../../../../../src-ts/ems/charging-management/charging-phase-selection.ts#L213) | value, fallbackIndex | raw.toLowerCase, str |
| [`normalizePhaseCount`](../../../../../src-ts/ems/charging-management/charging-phase-selection.ts#L219) | value, fallback | Math.round, finiteOrNull, str |
| [`normalizePhaseMode`](../../../../../src-ts/ems/charging-management/charging-phase-selection.ts#L227) | value, configured | str |
| [`phaseValueFor`](../../../../../src-ts/ems/charging-management/charging-phase-selection.ts#L235) | target, value1p, value3p | Number, Number.isFinite, raw.trim, s.replace, s.toLowerCase |
| [`effectiveStableBudgetW`](../../../../../src-ts/ems/charging-management/charging-phase-selection.ts#L251) | input, effectiveMode | Math.max, Math.round, finiteOrNull, str |
| [`unique`](../../../../../src-ts/ems/charging-management/charging-phase-selection.ts#L265) | values | String, out.includes, out.push |
| [`buildChargingPhaseSelectionPlan`](../../../../../src-ts/ems/charging-management/charging-phase-selection.ts#L281) | input | Array.isArray, Date.now, boolValue, decisions.filter, decisions.map, effectiveStableBudgetW, finiteOrNull, nonNegative, str, unique, wallboxes.map, warnings.push |
