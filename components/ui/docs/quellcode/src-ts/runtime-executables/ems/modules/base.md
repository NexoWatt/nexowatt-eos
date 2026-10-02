# src-ts/runtime-executables/ems/modules/base.ts

Definiert den gemeinsamen Lebenszyklus und Hilfszugriffe, auf denen die einzelnen EMS-Module aufbauen.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/modules/base.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/modules/ai-advisor.ts](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts)
- [src-ts/runtime-executables/ems/modules/charge-kiosk.ts](../../../../../../src-ts/runtime-executables/ems/modules/charge-kiosk.ts)
- [src-ts/runtime-executables/ems/modules/charging-management.ts](../../../../../../src-ts/runtime-executables/ems/modules/charging-management.ts)
- [src-ts/runtime-executables/ems/modules/core-limits.ts](../../../../../../src-ts/runtime-executables/ems/modules/core-limits.ts)
- [src-ts/runtime-executables/ems/modules/country-profile.ts](../../../../../../src-ts/runtime-executables/ems/modules/country-profile.ts)
- [src-ts/runtime-executables/ems/modules/energy-ledger.ts](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts)
- [src-ts/runtime-executables/ems/modules/energy-wallet.ts](../../../../../../src-ts/runtime-executables/ems/modules/energy-wallet.ts)
- [src-ts/runtime-executables/ems/modules/grid-constraints.ts](../../../../../../src-ts/runtime-executables/ems/modules/grid-constraints.ts)
- [src-ts/runtime-executables/ems/modules/heating-rod-control.ts](../../../../../../src-ts/runtime-executables/ems/modules/heating-rod-control.ts)
- [src-ts/runtime-executables/ems/modules/mesh-microgrid.ts](../../../../../../src-ts/runtime-executables/ems/modules/mesh-microgrid.ts)
- [src-ts/runtime-executables/ems/modules/multi-use.ts](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts)
- [src-ts/runtime-executables/ems/modules/nexologic-budget.ts](../../../../../../src-ts/runtime-executables/ems/modules/nexologic-budget.ts)
- [src-ts/runtime-executables/ems/modules/nl-p1-dsmr.ts](../../../../../../src-ts/runtime-executables/ems/modules/nl-p1-dsmr.ts)
- [src-ts/runtime-executables/ems/modules/nvp-coordinator.ts](../../../../../../src-ts/runtime-executables/ems/modules/nvp-coordinator.ts)
- [src-ts/runtime-executables/ems/modules/operating-strategies.ts](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts)
- [src-ts/runtime-executables/ems/modules/para14a.ts](../../../../../../src-ts/runtime-executables/ems/modules/para14a.ts)
- [src-ts/runtime-executables/ems/modules/peak-shaving.ts](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts)
- [src-ts/runtime-executables/ems/modules/prime-mover-control.ts](../../../../../../src-ts/runtime-executables/ems/modules/prime-mover-control.ts)
- [src-ts/runtime-executables/ems/modules/pv-forecast.ts](../../../../../../src-ts/runtime-executables/ems/modules/pv-forecast.ts)
- [src-ts/runtime-executables/ems/modules/stage-a-diagnostics.ts](../../../../../../src-ts/runtime-executables/ems/modules/stage-a-diagnostics.ts)
- [src-ts/runtime-executables/ems/modules/storage-control.ts](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts)
- [src-ts/runtime-executables/ems/modules/storage-mapping.ts](../../../../../../src-ts/runtime-executables/ems/modules/storage-mapping.ts)
- [src-ts/runtime-executables/ems/modules/tarif-vis.ts](../../../../../../src-ts/runtime-executables/ems/modules/tarif-vis.ts)
- [src-ts/runtime-executables/ems/modules/tariff-provider.ts](../../../../../../src-ts/runtime-executables/ems/modules/tariff-provider.ts)
- [src-ts/runtime-executables/ems/modules/tariff-status.ts](../../../../../../src-ts/runtime-executables/ems/modules/tariff-status.ts)
- [src-ts/runtime-executables/ems/modules/thermal-control.ts](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts)
- [src-ts/runtime-executables/ems/modules/threshold-control.ts](../../../../../../src-ts/runtime-executables/ems/modules/threshold-control.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`BaseModule.constructor`](../../../../../../src-ts/runtime-executables/ems/modules/base.ts#L73) | adapter, dpRegistry | – |
| [`BaseModule.init`](../../../../../../src-ts/runtime-executables/ems/modules/base.ts#L93) | – | – |
| [`BaseModule.tick`](../../../../../../src-ts/runtime-executables/ems/modules/base.ts#L113) | – | – |
| [`BaseModule._clearActuatorWriteCache`](../../../../../../src-ts/runtime-executables/ems/modules/base.ts#L123) | key | String, this.dp.getEntry, this.dp.lastWriteByObjectId.delete |
| [`BaseModule._forceWriteNumber`](../../../../../../src-ts/runtime-executables/ems/modules/base.ts#L135) | key, value | this._clearActuatorWriteCache, this.dp.writeNumber |
| [`BaseModule._forceWriteBoolean`](../../../../../../src-ts/runtime-executables/ems/modules/base.ts#L141) | key, value | this._clearActuatorWriteCache, this.dp.writeBoolean |
