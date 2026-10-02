# src-ts/runtime-executables/ems/modules/thermal-control.ts

Koordiniert freigegebene thermische Verbraucher anhand von Temperatur, Betriebsbedingungen und verfügbarem Leistungsbudget.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `./base` | [src-ts/runtime-executables/ems/modules/base.ts](../../../../../../src-ts/runtime-executables/ems/modules/base.ts) |
| `../services/operating-strategy-runtime` | [src-ts/runtime-executables/ems/services/operating-strategy-runtime.ts](../../../../../../src-ts/runtime-executables/ems/services/operating-strategy-runtime.ts) |
| `../consumers` | [src-ts/runtime-executables/ems/consumers/index.ts](../../../../../../src-ts/runtime-executables/ems/consumers/index.ts) |
| `../services/actuator-shadow-arbiter` | [src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts) |
| `../services/actuator-command-contract` | [src-ts/runtime-executables/ems/services/actuator-command-contract.ts](../../../../../../src-ts/runtime-executables/ems/services/actuator-command-contract.ts) |
| `../services/accepted-power-effects` | [src-ts/runtime-executables/ems/services/accepted-power-effects.ts](../../../../../../src-ts/runtime-executables/ems/services/accepted-power-effects.ts) |
| `../services/safety-envelope` | [src-ts/runtime-executables/ems/services/safety-envelope.ts](../../../../../../src-ts/runtime-executables/ems/services/safety-envelope.ts) |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/module-manager.ts](../../../../../../src-ts/runtime-executables/ems/module-manager.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`num`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L67) | v, fallback | Number, Number.isFinite |
| [`clamp`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L71) | v, minV, maxV | Number, Number.isFinite |
| [`safeSlot`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L78) | slot | Math.round, Number |
| [`nowMs`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L84) | – | Date.now |
| [`normalizeType`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L87) | raw | String |
| [`normalizeProfile`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L104) | raw, type | String |
| [`defaultSetpointsForProfile`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L111) | profile | – |
| [`ThermalControlModule.constructor`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L147) | adapter, dpRegistry | super |
| [`ThermalControlModule._isEnabled`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L173) | – | – |
| [`ThermalControlModule._getCfg`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L176) | – | – |
| [`ThermalControlModule._getManualHoldMin`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L189) | – | clamp, num, this._getCfg |
| [`ThermalControlModule._getVisFlowSlots`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L199) | – | Array.isArray |
| [`ThermalControlModule._getDatapoints`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L214) | – | – |
| [`ThermalControlModule._getOverrides`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L219) | – | – |
| [`ThermalControlModule._setStateIfChanged`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L238) | id, val | Number.isFinite, this._stateCache.delete, this._stateCache.get, this._stateCache.keys, this._stateCache.set, this.adapter.setStateAsync |
| [`ThermalControlModule._buildDevicesFromConfig`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L252) | – | Array.isArray, Number, Number.isFinite, String, clamp, defaultSetpointsForProfile, normalizeProfile, normalizeType, num, out.push, out.sort, safeSlot, this._getCfg, this._getDatapoints (weitere in der Quelle) |
| [`ThermalControlModule.init`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L409) | – | String, ensureDefault, mk, this._buildDevicesFromConfig, this._hyst.has, this._hyst.set, this.adapter.setObjectNotExistsAsync, this.dp.upsert |
| [`ensureDefault`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L438) | id, val | this.adapter.getStateAsync, this.adapter.setStateAsync |
| [`mk`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L498) | id, name, type, role, unit | this.adapter.setObjectNotExistsAsync |
| [`ThermalControlModule.deactivate`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L645) | – | Array.isArray, Number, Number.isFinite, String, failures.join, failures.push, this._actuatorContract.release, this._applyThermalCommand, this._buildDevicesFromConfig, this._para14aHeldRequests.delete, this._setStateIfChanged, this._thermalConsumerForActType, this.dp.upsert |
| [`ThermalControlModule._computePvAvailableW`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L727) | – | Date.now, Math.max, Math.round, Number, Number.isFinite, clamp, num, rt.getPvGrant, rt.getTotalGrant, rt.peek, this._getCfg, this._isPara14aActive, this.dp.getNumberFresh |
| [`ThermalControlModule._hysteresisOnOff`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L838) | id, desiredOn, minOnSec, minOffSec | Math.max, Math.round, nowMs, num, this._hyst.get, this._hyst.set |
| [`ThermalControlModule._computeBandDesiredOn`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L884) | id, availableW, startW, stopW | Math.max, Math.min, num, this._hyst.get |
| [`ThermalControlModule._readOverrideForDevice`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L906) | d, now | clamp, num, this._getOverrides |
| [`ThermalControlModule._deviceOwner`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L919) | d, manual | – |
| [`ThermalControlModule._deviceActuatorIds`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L923) | d | String, ids.includes, ids.push, this.dp.getEntry |
| [`ThermalControlModule._deviceHasExclusiveAuthority`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L935) | d, owner | String, ids.every, this._deviceActuatorIds |
| [`ThermalControlModule._contractCfg`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L949) | d, requireReadback | Math.max, Math.round, num |
| [`ThermalControlModule._readEntryState`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L959) | key | String, this.adapter.getForeignStateAsync, this.dp.getEntry |
| [`ThermalControlModule._readThermalReadback`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L971) | d, actType | this._readEntryState |
| [`ThermalControlModule._isPara14aActive`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L991) | – | – |
| [`ThermalControlModule._para14aOwner`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L995) | d | – |
| [`ThermalControlModule._estimatedThermalPowerW`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L999) | d, measuredW | Math.max, Number.isFinite, num |
| [`ThermalControlModule._decodeSgReadyState`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L1007) | d, actual | – |
| [`ThermalControlModule._thermalConsumerForActType`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L1019) | d, actType | – |
| [`ThermalControlModule._thermalDisplayTarget`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L1038) | actType, target | Math.max, Number, Number.isFinite, String, num |
| [`ThermalControlModule._capturePara14aThermalRequest`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L1050) | d, actType, actual, measuredW | Date.now, Math.abs, Math.max, Number, Number.isFinite, String, this._decodeSgReadyState, this._estimatedThermalPowerW, this._para14aHeldRequests.get, this._para14aHeldRequests.set |
| [`ThermalControlModule._restorePara14aHeldThermalRequest`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L1106) | d, actType, measuredW, label | Math.max, Number.isFinite, String, this._applyThermalCommand, this._para14aHeldRequests.delete, this._para14aHeldRequests.get, this._para14aOwner, this._recordAcceptedThermalEffect, this._thermalConsumerForActType, this._thermalDisplayTarget |
| [`ThermalControlModule._enforcePara14aThermalGuard`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L1145) | d, actType, measuredW, allowedW, label | Math.max, Math.min, Number, Number.isFinite, String, num, this._applyThermalCommand, this._capturePara14aThermalRequest, this._para14aOwner, this._readThermalReadback, this._recordAcceptedThermalEffect, this._thermalConsumerForActType, this._thermalDisplayTarget |
| [`ThermalControlModule._thermalReadbackMatches`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L1210) | d, actType, target, actual | Math.max, Number, String, boolMatch, known.every, numMatch, results.filter, results.push |
| [`boolMatch`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L1212) | value, expected | – |
| [`numMatch`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L1213) | value, expected | Math.abs, Math.max, Number, Number.isFinite |
| [`ThermalControlModule._publishThermalContract`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L1241) | d, owner, result | Math.max, Math.round, Number, String, this._setStateIfChanged |
| [`ThermalControlModule._applyThermalCommand`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L1252) | d, actType, consumer, target, reason, options | Date.now, Math.floor, Math.max, Math.min, Number, Number.isFinite, Object.prototype.hasOwnProperty.call, String, commitFlexibleLoadDecision, evaluateFlexibleLoadRequest, invalidateSafetyEnvelope, liveSafetyEnvelope, priorityForOwner, targetLoadW (weitere in der Quelle) |
| [`targetLoadW`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L1271) | candidate | Math.max, Number, String |
| [`ThermalControlModule._recordAcceptedThermalEffect`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L1421) | d, result, measuredW, targetLoadW, reason | Math.max, Math.round, Number, Number.isFinite, String, recordAcceptedPowerTarget |
| [`ThermalControlModule.tick`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L1444) | – | Math.max, Math.min, Math.round, Number, Number.isFinite, String, availableForAutomationW, clamp, consumeControlledW, normMode, nowMs, num, para14aOptions, resolveThermalStrategyOverlay (weitere in der Quelle) |
| [`consumeControlledW`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L1455) | rawW, countAgainstPara14a | Math.max, num |
| [`availableForAutomationW`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L1461) | – | Math.max, Math.min |
| [`para14aOptions`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L1464) | d, extra | this._para14aOwner |
| [`normMode`](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts#L1517) | m | String |
