# src-ts/runtime-executables/ems/modules/peak-shaving.ts

Bestimmt die Speicher-Unterstützung zur Begrenzung von Netzbezugsspitzen innerhalb der freigegebenen Speicherleistung.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `./base` | [src-ts/runtime-executables/ems/modules/base.ts](../../../../../../src-ts/runtime-executables/ems/modules/base.ts) |
| `../services/measurement-freshness` | [src-ts/runtime-executables/ems/services/measurement-freshness.ts](../../../../../../src-ts/runtime-executables/ems/services/measurement-freshness.ts) |
| `../reasons` | [src-ts/runtime-executables/ems/reasons.ts](../../../../../../src-ts/runtime-executables/ems/reasons.ts) |
| `../services/actuator-shadow-arbiter` | [src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts) |
| `../services/actuator-command-contract` | [src-ts/runtime-executables/ems/services/actuator-command-contract.ts](../../../../../../src-ts/runtime-executables/ems/services/actuator-command-contract.ts) |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/module-manager.ts](../../../../../../src-ts/runtime-executables/ems/module-manager.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`SlidingWindow.constructor`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L81) | maxSeconds | Math.max, Number |
| [`SlidingWindow.setMaxSeconds`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L99) | maxSeconds | Date.now, Math.max, Number, this.prune |
| [`SlidingWindow.push`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L113) | v, t | Date.now, Number.isFinite, this.prune, this.samples.push |
| [`SlidingWindow.prune`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L131) | nowTs | this.samples.shift |
| [`SlidingWindow.mean`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L150) | – | – |
| [`SlidingWindow.max`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L169) | – | Number.isFinite |
| [`SlidingWindow.count`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L190) | – | – |
| [`num`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L200) | v, fallback | Number, Number.isFinite |
| [`clamp`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L210) | n, min, max | Math.max, Math.min, Number.isFinite |
| [`normalizeVoltageLevelKey`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L233) | v | String |
| [`atypicalThresholdPercent`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L246) | voltageLevel, fallback | Object.prototype.hasOwnProperty.call, normalizeVoltageLevelKey |
| [`isPeakShavingRuntimeEnabled`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L259) | config | – |
| [`parseHmToMinutes`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L272) | value | Number, Number.isInteger, String, s.match |
| [`localYmd`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L287) | date | Number.isNaN, String, d.getDate, d.getFullYear, d.getMonth, d.getTime |
| [`normalizeYmd`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L301) | value | Number.isNaN, String, d.getTime, localYmd, s.match |
| [`asArray`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L318) | value | Array.isArray, value.split |
| [`toNumberArray`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L330) | value | Math.round, Number, Number.isFinite, asArray, out.push, seen.add, seen.has |
| [`toDateSet`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L349) | value | asArray, normalizeYmd, set.add |
| [`isoWeekday`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L367) | date | date.getDay |
| [`isChristmasNewYearPeriod`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L377) | date | date.getDate, date.getMonth |
| [`PeakShavingModule.constructor`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L404) | adapter, dpRegistry | super |
| [`PeakShavingModule._isEnabled`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L449) | – | isPeakShavingRuntimeEnabled |
| [`PeakShavingModule.init`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L458) | – | mk, this._isEnabled, this._setupAtypicalAuditHistory, this.adapter.setObjectNotExistsAsync |
| [`mk`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L489) | id, name, type, role | this.adapter.setObjectNotExistsAsync |
| [`PeakShavingModule._atypicalSeasonMonths`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L607) | season | String |
| [`PeakShavingModule._atypicalWindowLabel`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L628) | win | String |
| [`PeakShavingModule._atypicalWindowMatches`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L651) | win, nowDate | isoWeekday, localYmd, months.includes, normalizeYmd, nowDate.getDay, nowDate.getHours, nowDate.getMinutes, nowDate.getMonth, parseHmToMinutes, seasonMonths.includes, this._atypicalSeasonMonths, toNumberArray, weekdays.includes |
| [`PeakShavingModule._evaluateAtypicalSchedule`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L698) | atypicalCfg, now | Array.isArray, Date.now, bridgeDaySet.has, exceptionSet.has, holidaySet.has, isChristmasNewYearPeriod, isoWeekday, localYmd, this._atypicalWindowLabel, this._atypicalWindowMatches, toDateSet |
| [`PeakShavingModule._calculateAtypicalTarget`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L755) | atypicalCfg | Math.max, Math.min, String, atypicalThresholdPercent, clamp, num |
| [`PeakShavingModule._getAtypicalSourceInfo`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L831) | atypicalCfg | Math.round, Number, Number.isFinite, String |
| [`PeakShavingModule._readOwnNumber`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L856) | id, fallback | Number, Number.isFinite, this.adapter.getStateAsync |
| [`PeakShavingModule._readOwnString`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L878) | id, fallback | String, this.adapter.getStateAsync |
| [`PeakShavingModule._ensureAtypicalReviewLoaded`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L900) | resetIdentity | Math.max, String, this._readOwnNumber, this._readOwnString |
| [`PeakShavingModule._buildAtypicalReviewContext`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L927) | { atypicalCfg, schedule, target, gridPowerRaw, effPower, staleMeter, now } | Date.now, Math.max, Math.min, Math.round, Number, Number.isFinite, String, atypicalThresholdPercent, num, this._ensureAtypicalReviewLoaded, this._getAtypicalSourceInfo |
| [`PeakShavingModule._setupAtypicalAuditHistory`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L1028) | – | String, set, this.adapter._nwDetectInfluxInstance, this.adapter._nwEnsureInfluxCustom, this.adapter._nwGetHistoryInstance |
| [`set`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L1067) | id, val | this.adapter.setStateAsync |
| [`PeakShavingModule._getAtypicalAuditIntervalMs`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L1145) | atypicalCfg | Math.round, Number, Number.isFinite, clamp, num |
| [`PeakShavingModule._publishAtypicalAuditSample`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L1165) | ctx | Date.now, JSON.stringify, Math.max, Math.round, Number, Number.isFinite, String, set, this._getAtypicalAuditIntervalMs |
| [`set`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L1199) | id, val | this.adapter.setStateAsync |
| [`PeakShavingModule._publishAtypicalDiagnostics`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L1264) | ctx | Date.now, JSON.stringify, Math.round, Number, Number.isFinite, String, set, this._publishAtypicalAuditSample, this._setupAtypicalAuditHistory |
| [`set`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L1276) | id, val | this.adapter.setStateAsync |
| [`PeakShavingModule.tick`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L1356) | – | Array.isArray, Date.now, Math.max, Math.min, Math.round, Number, Number.isFinite, String, clamp, fn.call, num, phaseKeys.some, reasonToGerman, resolveCurrentNvpSnapshot (weitere in der Quelle) |
| [`PeakShavingModule._ensureActuatorChannel`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L1836) | idPart | mk, this.adapter.setObjectNotExistsAsync |
| [`mk`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L1855) | sid, name, type, role | this.adapter.setObjectNotExistsAsync |
| [`PeakShavingModule._actuatorOwner`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L1880) | safeId | – |
| [`PeakShavingModule._actuatorIds`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L1884) | a, safeId | String, ids.includes, ids.push, this.dp.getEntry |
| [`PeakShavingModule._actuatorHasExclusiveAuthority`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L1896) | a, safeId, owner | ids.every, this._actuatorIds |
| [`PeakShavingModule._actuatorContractCfg`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L1909) | a | Math.max, Math.round, num |
| [`PeakShavingModule._readActuatorReadback`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L1919) | a, safeId | Math.max, Math.round, Number, Number.isFinite, num, this.dp.getAgeMs, this.dp.getBoolean, this.dp.getNumberFresh |
| [`PeakShavingModule._actuatorReadbackMatches`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L1939) | a, requested, actual | Math.abs, Math.max, Number, Number.isFinite, num |
| [`PeakShavingModule._publishActuatorContract`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L1956) | ch, owner, requestedReductionW, acceptedReductionW, confirmedReductionW, contract, restorePending | Math.max, Math.round, String, num, this.adapter.setStateAsync |
| [`PeakShavingModule._writeActuatorCommand`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L1971) | a, safeId, ch, requested, reason, releaseAuthority | Date.now, priorityForOwner, this._actuatorContract.complete, this._actuatorContract.confirmFromReadback, this._actuatorContract.prepare, this._actuatorContract.result, this._actuatorContractCfg, this._actuatorHasExclusiveAuthority, this._actuatorOwner, this._actuatorReadbackMatches, this._readActuatorReadback, withActuatorShadowContext |
| [`PeakShavingModule._normalizeActuators`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L2013) | actuators | Array.isArray |
| [`PeakShavingModule._prepareActuatorDatapoints`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L2042) | a, safeId | this.dp.upsert |
| [`PeakShavingModule._applyActuators`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L2074) | actuators, requestedReductionW, voltageV | Date.now, Math.max, Math.min, Number.isFinite, String, a.id.toLowerCase, clamp, num, this._baselines.get, this._baselines.set, this._ensureActuatorChannel, this._normalizeActuators, this._prepareActuatorDatapoints, this._publishActuatorContract (weitere in der Quelle) |
| [`PeakShavingModule._restoreActuators`](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts#L2184) | actuators | Date.now, Number.isFinite, String, a.id.toLowerCase, restored.push, this._actuatorContract.release, this._baselines.delete, this._baselines.get, this._ensureActuatorChannel, this._normalizeActuators, this._prepareActuatorDatapoints, this._publishActuatorContract, this._writeActuatorCommand, this.adapter.setStateAsync |
