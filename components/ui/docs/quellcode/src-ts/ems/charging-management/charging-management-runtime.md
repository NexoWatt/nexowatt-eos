# src-ts/ems/charging-management/charging-management-runtime.ts

Verbindet die typisierten Ladeentscheidungs-Helfer in einer auswertbaren Laufzeitstruktur.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/ems/charging-management/charging-management-runtime.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

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
| [`toFiniteNumber`](../../../../../src-ts/ems/charging-management/charging-management-runtime.ts#L115) | value, fallback | Number, Number.isFinite |
| [`toNonNegativeWatt`](../../../../../src-ts/ems/charging-management/charging-management-runtime.ts#L125) | value, fallback | Math.max, Math.round, Number, toFiniteNumber |
| [`normalizeChargingMode`](../../../../../src-ts/ems/charging-management/charging-management-runtime.ts#L134) | mode | String |
| [`buildChargingReservationPlan`](../../../../../src-ts/ems/charging-management/charging-management-runtime.ts#L149) | input | Math.max, Math.min, normalizeChargingMode, toNonNegativeWatt |
| [`buildChargingVisibilityPlan`](../../../../../src-ts/ems/charging-management/charging-management-runtime.ts#L172) | input | Math.max, Math.round, Number, toFiniteNumber, toNonNegativeWatt |
| [`buildChargingManagementRuntimePrep`](../../../../../src-ts/ems/charging-management/charging-management-runtime.ts#L189) | input | Math.max, Number, String, buildChargingReservationPlan, buildChargingVisibilityPlan, toFiniteNumber, toNonNegativeWatt, warnings.push |
| [`compareChargingManagementRuntimePrep`](../../../../../src-ts/ems/charging-management/charging-management-runtime.ts#L227) | input, ts | Math.min, buildChargingManagementRuntimePrep, checkW, mismatches.push, normalizeChargingMode, toNonNegativeWatt |
| [`checkW`](../../../../../src-ts/ems/charging-management/charging-management-runtime.ts#L229) | field, js, tv, tolerance | Math.abs, mismatches.push, toFiniteNumber |
