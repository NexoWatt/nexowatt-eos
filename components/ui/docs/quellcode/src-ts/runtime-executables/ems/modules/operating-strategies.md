# src-ts/runtime-executables/ems/modules/operating-strategies.ts

Verbindet gespeicherte Betriebsstrategien mit den zur Laufzeit wirksamen Anforderungen.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `./base` | [src-ts/runtime-executables/ems/modules/base.ts](../../../../../../src-ts/runtime-executables/ems/modules/base.ts) |
| `../services/operating-strategy-runtime` | [src-ts/runtime-executables/ems/services/operating-strategy-runtime.ts](../../../../../../src-ts/runtime-executables/ems/services/operating-strategy-runtime.ts) |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/module-manager.ts](../../../../../../src-ts/runtime-executables/ems/module-manager.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`record`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L31) | value | Array.isArray |
| [`list`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L35) | value | Array.isArray |
| [`text`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L39) | value, fallback | String |
| [`num`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L44) | value, fallback | Number, Number.isFinite |
| [`nullableNumber`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L49) | value | Number, Number.isFinite |
| [`clamp`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L55) | value, minValue, maxValue | Math.max, Math.min, Number, Number.isFinite |
| [`safeId`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L61) | value | text |
| [`safeWallboxKey`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L65) | value | text |
| [`toBool`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L69) | value, fallback | text |
| [`timeMinutes`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L79) | value, fallback | Number, text |
| [`isInTimeWindow`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L85) | current, start, end | – |
| [`weekdayKey`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L90) | date | date.getDay |
| [`compare`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L94) | actual, operator, expected | Number, Number.isFinite, String |
| [`minutesUntilDeadline`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L107) | now, dueTime, dueDay | Math.max, Math.round, Number, due.getDate, due.getTime, due.setDate, due.setHours, due.setSeconds, now.getTime, text |
| [`minutesUntilTime`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L118) | now, targetTime | now.getHours, now.getMinutes, timeMinutes |
| [`appActive`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L126) | config, appId, enableFlag | record |
| [`countMappedValues`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L133) | values | list |
| [`mappedValuesFromKeys`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L137) | source, keys | list, record |
| [`OperatingStrategiesModule.constructor`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L161) | adapter, dpRegistry | super |
| [`OperatingStrategiesModule._cfg`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L170) | – | record |
| [`OperatingStrategiesModule._setStateIfChanged`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L174) | id, value | Date.now, Number.isFinite, this._stateCache.delete, this._stateCache.get, this._stateCache.keys, this._stateCache.set, this.adapter.setStateAsync, this.adapter.updateValue |
| [`OperatingStrategiesModule.init`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L182) | – | Array.isArray, Date.now, JSON.parse, Math.max, Object.entries, String, mk, num, this._thermalLatches.clear, this._thermalLatches.set, this.adapter.getStateAsync, this.adapter.setObjectNotExistsAsync |
| [`mk`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L193) | id, name, type, role, unit | this.adapter.setObjectNotExistsAsync |
| [`OperatingStrategiesModule.deactivate`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L241) | – | Date.now, this._setStateIfChanged |
| [`OperatingStrategiesModule._deriveResources`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L260) | config | Math.max, appActive, clamp, countMappedValues, flowSlots.forEach, list, num, record, resources.filter, resources.push, rows.forEach, text |
| [`OperatingStrategiesModule._linkMap`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L529) | cfg | list |
| [`OperatingStrategiesModule._ensureMappedKey`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L538) | sourceId, field, objectId, dataType | safeId, text, this._registeredMappings.get, this._registeredMappings.set, this.dp.upsert |
| [`OperatingStrategiesModule._readMappings`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L555) | sourceId, mappings, staleTimeoutSec | Math.max, Number.isFinite, String, clamp, nullableNumber, record, text, this._ensureMappedKey, this.dp.getAgeMs, this.dp.getRaw, toBool |
| [`OperatingStrategiesModule._readOwnState`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L595) | id | Date.now, Math.max, Number, this.adapter.getStateAsync |
| [`OperatingStrategiesModule._updateActivity`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L607) | sourceId, active, now | Math.max, this._activity.get, this._activity.set |
| [`OperatingStrategiesModule._resourceState`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L620) | resource, link, now | Math.abs, Math.max, Math.min, Number, Number.isFinite, clamp, num, record, text, this._readMappings, this._readOwnState, this._updateActivity, this.dp.getAgeMs, this.dp.getNumber (weitere in der Quelle) |
| [`OperatingStrategiesModule._systemState`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L740) | cfg | Number, Number.isFinite, now.getDay, nullableNumber, record, this._readMappings, toBool |
| [`OperatingStrategiesModule._schedule`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L778) | rule, now | Math.max, isInTimeWindow, list, now.getHours, now.getMinutes, num, record, text, timeMinutes, weekdayKey, weekdays.includes |
| [`OperatingStrategiesModule._profileMatches`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L800) | rule, activeProfileId | scope.replace, text |
| [`OperatingStrategiesModule._metricValue`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L806) | condition, system, states | text |
| [`OperatingStrategiesModule._nextLocalTimeMs`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L818) | now, value, fallback | Math.floor, now.getTime, target.getDate, target.getTime, target.setDate, target.setHours, target.setSeconds, timeMinutes |
| [`OperatingStrategiesModule._setThermalLatch`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L827) | key, value | this._thermalLatches.set |
| [`OperatingStrategiesModule._clearThermalLatch`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L833) | key | this._thermalLatches.delete, this._thermalLatches.has |
| [`OperatingStrategiesModule._thermalSafetyRelease`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L839) | base, key, now, minRunDurationMin, headline, reasons | Math.max, now.getTime, num, record, this._setThermalLatch, this._thermalLatches.get |
| [`OperatingStrategiesModule._baseDecision`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L856) | rule, resource | clamp, record, text |
| [`OperatingStrategiesModule._evaluateRule`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L878) | rule, activeProfileId, resourcesById, states, system, now | Math.max, Math.min, Math.round, Number, Number.isFinite, clamp, currentSoc.toFixed, list, maxTemperatureC.toFixed, minutesUntilDeadline, missingEnergy.toFixed, needKWh.toFixed, now.getTime, nullableNumber (weitere in der Quelle) |
| [`thermalRelease`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L891) | headline, reasons | this._thermalSafetyRelease |
| [`OperatingStrategiesModule._evaluateNightReserve`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L1065) | cfg, activeProfileId, resourcesById, states, now | Math.max, Math.min, Math.round, Number, Number.isFinite, Object.values, clamp, isInTimeWindow, list, minutesUntilTime, now.getHours, now.getMinutes, nullableNumber, record (weitere in der Quelle) |
| [`OperatingStrategiesModule._selectDecisions`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L1142) | decisions | candidates.forEach |
| [`OperatingStrategiesModule._globalControlState`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L1166) | cfg, config | isOperatingStrategiesLiveConfig, operatingStrategiesAppActive, record, text |
| [`OperatingStrategiesModule.tick`](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts#L1181) | – | Date.now, JSON.stringify, Math.max, Math.min, Math.round, Object.keys, decisions.filter, decisions.forEach, decisions.push, decisions.slice, list, num, record, resources.forEach (weitere in der Quelle) |
