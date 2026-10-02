# src-ts/runtime-executables/ems/modules/multi-use.ts

Ordnet Speicherfunktionen und SOC-Bereiche den freigegebenen Nutzungszwecken zu und reicht die resultierenden Vorgaben weiter.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `./base` | [src-ts/runtime-executables/ems/modules/base.ts](../../../../../../src-ts/runtime-executables/ems/modules/base.ts) |
| `../consumers` | [src-ts/runtime-executables/ems/consumers/index.ts](../../../../../../src-ts/runtime-executables/ems/consumers/index.ts) |
| `../reasons` | [src-ts/runtime-executables/ems/reasons.ts](../../../../../../src-ts/runtime-executables/ems/reasons.ts) |
| `../services/actuator-shadow-arbiter` | [src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts) |
| `../services/actuator-command-contract` | [src-ts/runtime-executables/ems/services/actuator-command-contract.ts](../../../../../../src-ts/runtime-executables/ems/services/actuator-command-contract.ts) |
| `../services/accepted-power-effects` | [src-ts/runtime-executables/ems/services/accepted-power-effects.ts](../../../../../../src-ts/runtime-executables/ems/services/accepted-power-effects.ts) |
| `../services/storage-self-consumption-policy` | [src-ts/runtime-executables/ems/services/storage-self-consumption-policy.ts](../../../../../../src-ts/runtime-executables/ems/services/storage-self-consumption-policy.ts) |
| `../services/safety-envelope` | [src-ts/runtime-executables/ems/services/safety-envelope.ts](../../../../../../src-ts/runtime-executables/ems/services/safety-envelope.ts) |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/module-manager.ts](../../../../../../src-ts/runtime-executables/ems/module-manager.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`num`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L37) | value, fallback | Number, Number.isFinite |
| [`clamp`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L41) | value, min, max | Math.max, Math.min, num |
| [`safeIdPart`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L44) | value | String |
| [`normalizeType`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L47) | value | String |
| [`normalizeBasis`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L51) | value | String |
| [`floorToStep`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L58) | value, step | Math.floor, Math.max, num |
| [`wattsFromA`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L65) | amps, voltageV, phases | Math.max, num |
| [`ampsFromW`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L68) | watts, voltageV, phases | Math.max, num |
| [`stateAgeMs`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L72) | state, now | Date.now, Math.max, Number, Number.isFinite |
| [`normalizeBudgetMode`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L76) | modeRaw, sourceRaw | String |
| [`MultiUseModule.constructor`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L84) | adapter, dpRegistry | super |
| [`MultiUseModule._isEnabled`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L93) | – | – |
| [`MultiUseModule._getCfg`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L96) | – | – |
| [`MultiUseModule._legacyConsumersEnabled`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L100) | – | this._getCfg |
| [`MultiUseModule._storagePolicyCfg`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L103) | – | – |
| [`MultiUseModule._policySnapshot`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L108) | – | String, num, resolveStorageOperatingPolicy, this._isEnabled, this._legacyConsumersEnabled, this._storagePolicyCfg, this.adapter._nwGetStorageControlAuthority |
| [`MultiUseModule._publishPolicyStates`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L152) | now | Date.now, this._policySnapshot, this._setStateIfChanged |
| [`MultiUseModule._loadConsumersFromConfig`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L177) | – | Array.isArray, rows.map, this._getCfg |
| [`MultiUseModule._setStateIfChanged`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L220) | id, value | Number.isFinite, this._stateCache.delete, this._stateCache.get, this._stateCache.keys, this._stateCache.set, this.adapter.setStateAsync |
| [`MultiUseModule._seedLastFromStates`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L227) | – | Promise.all, String, normalizeReason, num, read, this._last.set, this._legacyConsumersEnabled |
| [`read`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L231) | suffix | this.adapter.getStateAsync |
| [`MultiUseModule.init`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L250) | – | Date.now, mkChannel, mkState, num, this._getCfg, this._isEnabled, this._legacyConsumersEnabled, this._loadConsumersFromConfig, this._publishPolicyStates, this._seedLastFromStates, this._setStateIfChanged, this.adapter.log.warn, this.adapter.setObjectNotExistsAsync, this.dp.upsert |
| [`mkChannel`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L288) | id, name, native | this.adapter.setObjectNotExistsAsync |
| [`mkState`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L289) | id, name, type, role, def, unit | this.adapter.setObjectNotExistsAsync |
| [`MultiUseModule.deactivate`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L387) | – | String, failures.join, failures.push, this._actuatorContract.release, this._applyConsumerCommand, this._basis, this._loadConsumersFromConfig, this._setStateIfChanged, this._targetForConsumer, this.dp.upsert |
| [`MultiUseModule._consumerOwner`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L440) | consumer | – |
| [`MultiUseModule._consumerActuatorIds`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L443) | consumer | String, ids.includes, ids.push, this.dp?.getEntry |
| [`MultiUseModule._consumerHasExclusiveAuthority`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L453) | consumer, owner | ids.every, this._consumerActuatorIds |
| [`MultiUseModule._contractCfg`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L462) | consumer | Math.max, Math.round, num |
| [`MultiUseModule._readActualW`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L471) | consumer, staleMs | Math.max, Number, Number.isFinite, this.dp.getNumberFresh |
| [`MultiUseModule._basis`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L480) | consumer | String |
| [`MultiUseModule._publishContract`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L487) | base, owner, budgetMode, reservedW, result | Math.max, Math.round, String, num, this._setStateIfChanged |
| [`MultiUseModule._applyConsumerCommand`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L498) | consumer, target, reason, staleMs | Date.now, Math.abs, Math.max, Math.min, Math.round, Object.prototype.hasOwnProperty.call, clamp, commitFlexibleLoadDecision, evaluateFlexibleLoadRequest, invalidateSafetyEnvelope, liveSafetyEnvelope, normalizeType, num, priorityForOwner (weitere in der Quelle) |
| [`MultiUseModule._budgetDemand`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L645) | cfg, staleMs | Math.max, String, fresh, num |
| [`fresh`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L658) | key | Math.max, Number, Number.isFinite, this.dp.getNumberFresh |
| [`MultiUseModule._targetForConsumer`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L678) | consumer, basis, targetW, targetA | normalizeType |
| [`MultiUseModule._hardCap`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L685) | cfg, staleMs | Math.max, Math.min, Number, Number.isFinite, String, sources.push, stateAgeMs, this.adapter.getStateAsync, this.dp.getNumberFresh, this.dp.isStale |
| [`MultiUseModule.tick`](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts#L730) | – | Date.now, Math.max, Math.min, Math.round, Number, Number.isFinite, Promise.all, String, allocatedA.toFixed, ampsFromW, capSources.join, central.getPvGrant, central.getTotalGrant, central.peek (weitere in der Quelle) |
