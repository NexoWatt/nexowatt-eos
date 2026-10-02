# src-ts/runtime-executables/lib/evcs-electrical-limits.ts

Prüft explizite Strom-/Leistungsgrenzen je Ladepunkt und trennt DC-Ausgangsstrom von AC-Netzstrom.

**Daten und Wirkung:** Erhält Ladepunkt-Konfiguration und Messprobe; liefert geprüfte Grenzen. Unvollständige Grenzen sperren die Freigabe. DC-Ausgangsstrom benötigt die passende Spannungsbasis; AC-Netzstrom ist davon getrennt.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/lib/evcs-electrical-limits.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/modules/charging-management.ts](../../../../../src-ts/runtime-executables/ems/modules/charging-management.ts)
- [src-ts/runtime-executables/main.ts](../../../../../src-ts/runtime-executables/main.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`positive`](../../../../../src-ts/runtime-executables/lib/evcs-electrical-limits.ts#L21) | value | Number, Number.isFinite, String |
| [`resolveEvcsControlBasis`](../../../../../src-ts/runtime-executables/lib/evcs-electrical-limits.ts#L30) | row | String |
| [`validateEvcsElectricalConfig`](../../../../../src-ts/runtime-executables/lib/evcs-electrical-limits.ts#L44) | row | Number, Number.isFinite, String, errors.push, positive, resolveEvcsControlBasis |
| [`resolveDcElectricalLimits`](../../../../../src-ts/runtime-executables/lib/evcs-electrical-limits.ts#L75) | row, sample | Math.ceil, Math.floor, Math.max, Math.min, Number, check.errors.slice, errors.push, positive, validateEvcsElectricalConfig |
