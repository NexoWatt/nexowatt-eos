# src-ts/runtime-executables/ems/consumers/index.ts

Bündelt die Exporte des Bereichs „src-ts/runtime-executables/ems/consumers“, damit dessen Aufrufer einen gemeinsamen Import-Einstieg verwenden können.

**Daten und Wirkung:** Verknüpft die unten sichtbaren Typen/Exporte mit ihren Importierenden. Die Gegenrichtung und die Originaldateien sind im Quellcode-Verzeichnis dokumentiert.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/consumers/index.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `./evcs` | [src-ts/runtime-executables/ems/consumers/evcs.ts](../../../../../../src-ts/runtime-executables/ems/consumers/evcs.ts) |
| `./generic-load` | [src-ts/runtime-executables/ems/consumers/generic-load.ts](../../../../../../src-ts/runtime-executables/ems/consumers/generic-load.ts) |
| `./generic-setpoint` | [src-ts/runtime-executables/ems/consumers/generic-setpoint.ts](../../../../../../src-ts/runtime-executables/ems/consumers/generic-setpoint.ts) |
| `./sg-ready` | [src-ts/runtime-executables/ems/consumers/sg-ready.ts](../../../../../../src-ts/runtime-executables/ems/consumers/sg-ready.ts) |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/modules/charging-management.ts](../../../../../../src-ts/runtime-executables/ems/modules/charging-management.ts)
- [src-ts/runtime-executables/ems/modules/multi-use.ts](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts)
- [src-ts/runtime-executables/ems/modules/para14a.ts](../../../../../../src-ts/runtime-executables/ems/modules/para14a.ts)
- [src-ts/runtime-executables/ems/modules/thermal-control.ts](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`applySetpoint`](../../../../../../src-ts/runtime-executables/ems/consumers/index.ts#L72) | ctx, consumer, target | String, applyEvcsSetpoint, applyLoadSetpoint, applySetpointNumeric, applySgReady |
