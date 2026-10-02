# src-ts/runtime-executables/ems/modules/stage-a-diagnostics.ts

Veröffentlicht Diagnoseinformationen der Bedarfs- und Freigabestufe für die Nachvollziehbarkeit der Regelentscheidung.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/modules/stage-a-diagnostics.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `./base` | [src-ts/runtime-executables/ems/modules/base.ts](../../../../../../src-ts/runtime-executables/ems/modules/base.ts) |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/module-manager.ts](../../../../../../src-ts/runtime-executables/ems/module-manager.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`text`](../../../../../../src-ts/runtime-executables/ems/modules/stage-a-diagnostics.ts#L88) | value | String |
| [`looksLikeObjectId`](../../../../../../src-ts/runtime-executables/ems/modules/stage-a-diagnostics.ts#L92) | value | id.includes, id.startsWith, text |
| [`ownerFromPath`](../../../../../../src-ts/runtime-executables/ems/modules/stage-a-diagnostics.ts#L97) | path, row | Math.round, Number, Number.isFinite, String, lower.includes, raw.match, raw.toLowerCase, text |
| [`ownerIsActive`](../../../../../../src-ts/runtime-executables/ems/modules/stage-a-diagnostics.ts#L142) | config, owner, row, storageAuthority | String, lower.startsWith, owner.toLowerCase |
| [`collectActuatorMappings`](../../../../../../src-ts/runtime-executables/ems/modules/stage-a-diagnostics.ts#L176) | config, evcsList, storageAuthority | Array.isArray, logicGraphs.forEach, visit |
| [`add`](../../../../../../src-ts/runtime-executables/ems/modules/stage-a-diagnostics.ts#L179) | objectId, path, field, row | looksLikeObjectId, ownerFromPath, ownerIsActive, rows.push, seen.add, seen.has, text |
| [`visit`](../../../../../../src-ts/runtime-executables/ems/modules/stage-a-diagnostics.ts#L188) | value, path, parent, depth | ACTUATOR_FIELDS.has, ACTUATOR_PATTERN.test, Array.isArray, INPUT_PATTERN.test, Object.entries, add, value.forEach, visit |
| [`safe`](../../../../../../src-ts/runtime-executables/ems/modules/stage-a-diagnostics.ts#L231) | value, fallback | text |
| [`resolveSceneTarget`](../../../../../../src-ts/runtime-executables/ems/modules/stage-a-diagnostics.ts#L232) | params | Array.isArray, devices.find, text |
| [`buildOwnerMatrix`](../../../../../../src-ts/runtime-executables/ems/modules/stage-a-diagnostics.ts#L269) | mappings | Array.from, entries.filter, entries.map, grouped.entries, grouped.get, grouped.has, grouped.set, matrix.push, matrix.sort |
| [`readForeignStateInfo`](../../../../../../src-ts/runtime-executables/ems/modules/stage-a-diagnostics.ts#L291) | adapter, objectId, now | Math.max, Number, Number.isFinite, String, adapter.getForeignStateAsync, text |
| [`describeStorageOverride`](../../../../../../src-ts/runtime-executables/ems/modules/stage-a-diagnostics.ts#L329) | adapter | Date.now, Number, Object.values, adapter._nwGetStorageFarmRuntimeInfo, adapter?._nwResolveBatteryFlowFromCache, text |
| [`StageADiagnosticsModule.constructor`](../../../../../../src-ts/runtime-executables/ems/modules/stage-a-diagnostics.ts#L374) | adapter, dpRegistry | super |
| [`StageADiagnosticsModule.init`](../../../../../../src-ts/runtime-executables/ems/modules/stage-a-diagnostics.ts#L380) | – | Object.entries, this.adapter.setObjectNotExistsAsync, this.setDiagnosticState, this.tick |
| [`StageADiagnosticsModule.setDiagnosticState`](../../../../../../src-ts/runtime-executables/ems/modules/stage-a-diagnostics.ts#L435) | key, value | this.adapter.getStateAsync, this.adapter.setStateAsync |
| [`StageADiagnosticsModule.tick`](../../../../../../src-ts/runtime-executables/ems/modules/stage-a-diagnostics.ts#L447) | force | Array.isArray, Date.now, JSON.stringify, Math.abs, Math.max, Math.min, Math.round, Number, Number.isFinite, Object.fromEntries, Promise.all, String, buildOwnerMatrix, collectActuatorMappings (weitere in der Quelle) |
| [`fresh`](../../../../../../src-ts/runtime-executables/ems/modules/stage-a-diagnostics.ts#L498) | info | – |
