# src-ts/runtime-executables/ems/modules/nexologic-budget.ts

Bindet NexoLogic-Verbraucheranforderungen in das gemeinsame EMS-Leistungsbudget ein.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/modules/nexologic-budget.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `./base` | [src-ts/runtime-executables/ems/modules/base.ts](../../../../../../src-ts/runtime-executables/ems/modules/base.ts) |
| `../services/accepted-power-effects` | [src-ts/runtime-executables/ems/services/accepted-power-effects.ts](../../../../../../src-ts/runtime-executables/ems/services/accepted-power-effects.ts) |
| `../services/safety-envelope` | [src-ts/runtime-executables/ems/services/safety-envelope.ts](../../../../../../src-ts/runtime-executables/ems/services/safety-envelope.ts) |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/module-manager.ts](../../../../../../src-ts/runtime-executables/ems/module-manager.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`text`](../../../../../../src-ts/runtime-executables/ems/modules/nexologic-budget.ts#L33) | value | String |
| [`num`](../../../../../../src-ts/runtime-executables/ems/modules/nexologic-budget.ts#L37) | value, fallback | Number, Number.isFinite |
| [`NexoLogicBudgetModule.constructor`](../../../../../../src-ts/runtime-executables/ems/modules/nexologic-budget.ts#L46) | adapter, dpRegistry | super |
| [`NexoLogicBudgetModule.init`](../../../../../../src-ts/runtime-executables/ems/modules/nexologic-budget.ts#L52) | – | Object.entries, this.adapter.setObjectNotExistsAsync, this.adapter.setStateAsync |
| [`NexoLogicBudgetModule.set`](../../../../../../src-ts/runtime-executables/ems/modules/nexologic-budget.ts#L76) | name, value | this.adapter.getStateAsync, this.adapter.setStateAsync |
| [`NexoLogicBudgetModule.deactivate`](../../../../../../src-ts/runtime-executables/ems/modules/nexologic-budget.ts#L91) | – | Array.isArray, Math.max, Promise.all, engine.applyBudgetGrant, engine.getBudgetIntents, failures.join, failures.push, num, text, this.set |
| [`NexoLogicBudgetModule.tick`](../../../../../../src-ts/runtime-executables/ems/modules/nexologic-budget.ts#L124) | – | Array.isArray, Date.now, JSON.stringify, Math.max, Math.min, Math.round, Promise.all, central.getPvGrant, central.getTotalGrant, central.reserve, commitFlexibleLoadDecision, diagnostics.push, diagnostics.slice, engine.applyBudgetGrant (weitere in der Quelle) |
