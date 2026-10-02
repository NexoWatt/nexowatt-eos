# src-ts/runtime-executables/ems/services/accepted-power-effects.ts

Hält bestätigte Leistungsanforderungen fest, damit nachfolgende Budgets mit angenommenen Stellwirkungen rechnen können.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/services/accepted-power-effects.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/module-manager.ts](../../../../../../src-ts/runtime-executables/ems/module-manager.ts)
- [src-ts/runtime-executables/ems/modules/charging-management.ts](../../../../../../src-ts/runtime-executables/ems/modules/charging-management.ts)
- [src-ts/runtime-executables/ems/modules/heating-rod-control.ts](../../../../../../src-ts/runtime-executables/ems/modules/heating-rod-control.ts)
- [src-ts/runtime-executables/ems/modules/multi-use.ts](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts)
- [src-ts/runtime-executables/ems/modules/nexologic-budget.ts](../../../../../../src-ts/runtime-executables/ems/modules/nexologic-budget.ts)
- [src-ts/runtime-executables/ems/modules/nvp-coordinator.ts](../../../../../../src-ts/runtime-executables/ems/modules/nvp-coordinator.ts)
- [src-ts/runtime-executables/ems/modules/prime-mover-control.ts](../../../../../../src-ts/runtime-executables/ems/modules/prime-mover-control.ts)
- [src-ts/runtime-executables/ems/modules/thermal-control.ts](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts)
- [src-ts/runtime-executables/ems/modules/threshold-control.ts](../../../../../../src-ts/runtime-executables/ems/modules/threshold-control.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`finiteOrNull`](../../../../../../src-ts/runtime-executables/ems/services/accepted-power-effects.ts#L47) | value | Number, Number.isFinite |
| [`rounded`](../../../../../../src-ts/runtime-executables/ems/services/accepted-power-effects.ts#L53) | value, fallback | Math.round, finiteOrNull |
| [`emptySnapshot`](../../../../../../src-ts/runtime-executables/ems/services/accepted-power-effects.ts#L58) | – | – |
| [`ensureRememberedTargets`](../../../../../../src-ts/runtime-executables/ems/services/accepted-power-effects.ts#L73) | adapter | – |
| [`beginAcceptedPowerEffectCycle`](../../../../../../src-ts/runtime-executables/ems/services/accepted-power-effects.ts#L78) | adapter, cycleId, now | Date.now, Math.max, String, emptySnapshot, ensureRememberedTargets, rounded |
| [`ensureLedger`](../../../../../../src-ts/runtime-executables/ems/services/accepted-power-effects.ts#L93) | adapter | Array.isArray, Date.now, beginAcceptedPowerEffectCycle, ledger.entries.forEach |
| [`removeContribution`](../../../../../../src-ts/runtime-executables/ems/services/accepted-power-effects.ts#L108) | ledger, entry | Math.max, Number, rounded |
| [`putEntry`](../../../../../../src-ts/runtime-executables/ems/services/accepted-power-effects.ts#L121) | ledger, entry | Number, Number.isInteger, String, ledger.entries.push, ledger.entryIndexByKey.get, ledger.entryIndexByKey.set, removeContribution, rounded |
| [`recordAcceptedPowerTarget`](../../../../../../src-ts/runtime-executables/ems/services/accepted-power-effects.ts#L149) | adapter, input | Date.now, Math.abs, String, ensureLedger, ensureRememberedTargets, finiteOrNull, putEntry, rounded, targetMap.get, targetMap.set |
| [`recordAcceptedActuatorTransition`](../../../../../../src-ts/runtime-executables/ems/services/accepted-power-effects.ts#L193) | adapter, input | Date.now, String, ensureLedger, putEntry |
| [`getAcceptedPowerEffectSnapshot`](../../../../../../src-ts/runtime-executables/ems/services/accepted-power-effects.ts#L218) | adapter | Array.isArray, Math.max, String, emptySnapshot, ledger.entries.map, rounded |
