# src-ts/ems/charging-management/charging-management.ts

Verknüpft Fahrzeugbedarf, Lademodus, Stationsgrenzen und verfügbares Netz-/PV-Budget zu begrenzten Lade-Sollwerten.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/ems/charging-management/charging-management.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

Kein direkter Import innerhalb des erfassten Quellbereichs. Mögliche HTML-, Adapter-, Build- oder dynamische Einstiege sind separat zu prüfen.

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`toNumberOrNull`](../../../../../src-ts/ems/charging-management/charging-management.ts#L134) | value | Number, Number.isFinite, value.trim |
| [`positiveNumber`](../../../../../src-ts/ems/charging-management/charging-management.ts#L146) | value | Math.max, Math.round, toNumberOrNull |
| [`toBoolean`](../../../../../src-ts/ems/charging-management/charging-management.ts#L152) | value, fallback | Number.isFinite, value.trim |
| [`toSafeWallboxKey`](../../../../../src-ts/ems/charging-management/charging-management.ts#L167) | input, fallbackIndex | String, raw.toLowerCase |
| [`normalizeChargingWallbox`](../../../../../src-ts/ems/charging-management/charging-management.ts#L177) | raw, index | Math.max, Math.min, Math.round, String, mappingIssues.push, positiveNumber, raw.enableId.trim, raw.setAId.trim, raw.setCurrentId.trim, raw.setPowerId.trim, toBoolean, toNumberOrNull, toSafeWallboxKey |
| [`buildChargingBudgetReservationPrep`](../../../../../src-ts/ems/charging-management/charging-management.ts#L226) | input, wallboxes | Math.max, Math.min, Number.isFinite, String, positiveNumber, toNumberOrNull, wallboxes.some, warnings.push |
| [`buildChargingManagementPrep`](../../../../../src-ts/ems/charging-management/charging-management.ts#L256) | input | Array.isArray, Date.now, String, blockers.push, buildChargingBudgetReservationPrep, enabledWallboxes.some, positiveNumber, toBoolean, toNumberOrNull, wallboxInput.map, wallboxes.filter, wallboxes.reduce, wallboxes.some, warnings.push |
| [`compareChargingPrepWithRuntime`](../../../../../src-ts/ems/charging-management/charging-management.ts#L299) | runtime, prep | cmp |
| [`cmp`](../../../../../src-ts/ems/charging-management/charging-management.ts#L301) | field, jsValue, tsValue, tolerance | Math.abs, Math.round, mismatches.push, toNumberOrNull |
