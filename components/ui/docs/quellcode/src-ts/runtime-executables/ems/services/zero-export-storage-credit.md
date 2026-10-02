# src-ts/runtime-executables/ems/services/zero-export-storage-credit.ts

Ermittelt den bereits physikalisch belegten Speicheranteil für LP-Netzanteilgrenzen.

**Daten und Wirkung:** Nimmt frische Core-/NVP-Messungen, Netto-Speicherentladung,

**Bei Änderungen:** Netto-/Bruttofluss, Quellenalter, Hausvorrang und Widerruf bis zum tatsächlichen Writer gemeinsam prüfen; Requests niemals als Messung verwenden.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/services/zero-export-storage-credit.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `./zero-export-pv-coordinator` | [src-ts/runtime-executables/ems/services/zero-export-pv-coordinator.ts](../../../../../../src-ts/runtime-executables/ems/services/zero-export-pv-coordinator.ts) |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/modules/charging-management.ts](../../../../../../src-ts/runtime-executables/ems/modules/charging-management.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`finiteNumber`](../../../../../../src-ts/runtime-executables/ems/services/zero-export-storage-credit.ts#L47) | value | Number, Number.isFinite, value.trim |
| [`freshStamp`](../../../../../../src-ts/runtime-executables/ems/services/zero-export-storage-credit.ts#L54) | value, now | finiteNumber |
| [`resolveZeroExportStorageCreditW`](../../../../../../src-ts/runtime-executables/ems/services/zero-export-storage-credit.ts#L69) | input | Math.max, Math.min, String, acceptedSource.startsWith, finiteNumber, freshStamp |
| [`resolveZeroExportStorageCredit`](../../../../../../src-ts/runtime-executables/ems/services/zero-export-storage-credit.ts#L102) | adapter, input | Date.now, String, adapter?._nwGetStorageControlAuthority, adapter?._nwResolveBatteryFlowFromCache, ageOk, finiteNumber, readZeroExportMode, resolveZeroExportStorageCreditW |
| [`ageOk`](../../../../../../src-ts/runtime-executables/ems/services/zero-export-storage-credit.ts#L111) | value | finiteNumber |
