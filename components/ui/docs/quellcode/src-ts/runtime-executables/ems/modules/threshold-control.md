# src-ts/runtime-executables/ems/modules/threshold-control.ts

Wertet konfigurierte Schwellwertbedingungen aus und steuert die daraus resultierenden Verbraucheranforderungen.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/modules/threshold-control.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `./base` | [src-ts/runtime-executables/ems/modules/base.ts](../../../../../../src-ts/runtime-executables/ems/modules/base.ts) |
| `../services/actuator-shadow-arbiter` | [src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts) |
| `../services/accepted-power-effects` | [src-ts/runtime-executables/ems/services/accepted-power-effects.ts](../../../../../../src-ts/runtime-executables/ems/services/accepted-power-effects.ts) |
| `../services/safety-envelope` | [src-ts/runtime-executables/ems/services/safety-envelope.ts](../../../../../../src-ts/runtime-executables/ems/services/safety-envelope.ts) |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/module-manager.ts](../../../../../../src-ts/runtime-executables/ems/module-manager.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`num`](../../../../../../src-ts/runtime-executables/ems/modules/threshold-control.ts#L80) | v, fallback | Number, Number.isFinite, v.trim |
| [`clamp`](../../../../../../src-ts/runtime-executables/ems/modules/threshold-control.ts#L90) | v, minV, maxV, fallback | Number.isFinite, num |
| [`safeIndex`](../../../../../../src-ts/runtime-executables/ems/modules/threshold-control.ts#L99) | i | Math.round, Number |
| [`ThresholdControlModule.constructor`](../../../../../../src-ts/runtime-executables/ems/modules/threshold-control.ts#L141) | adapter, dpRegistry | super |
| [`ThresholdControlModule._isEnabled`](../../../../../../src-ts/runtime-executables/ems/modules/threshold-control.ts#L164) | – | – |
| [`ThresholdControlModule._getCfg`](../../../../../../src-ts/runtime-executables/ems/modules/threshold-control.ts#L173) | – | – |
| [`ThresholdControlModule._setStateIfChanged`](../../../../../../src-ts/runtime-executables/ems/modules/threshold-control.ts#L192) | id, val | Number.isFinite, this._stateCache.delete, this._stateCache.get, this._stateCache.keys, this._stateCache.set, this.adapter.setStateAsync |
| [`ThresholdControlModule._normalizeCompare`](../../../../../../src-ts/runtime-executables/ems/modules/threshold-control.ts#L216) | raw | String |
| [`ThresholdControlModule._normalizeOutType`](../../../../../../src-ts/runtime-executables/ems/modules/threshold-control.ts#L227) | raw | String |
| [`ThresholdControlModule._buildRulesFromConfig`](../../../../../../src-ts/runtime-executables/ems/modules/threshold-control.ts#L245) | – | Array.isArray, Math.max, Math.min, Math.round, String, clamp, out.push, out.sort, safeIndex, this._getCfg, this._normalizeCompare, this._normalizeOutType, used.add, used.has |
| [`ThresholdControlModule._getRule`](../../../../../../src-ts/runtime-executables/ems/modules/threshold-control.ts#L348) | idx | this._rules.find |
| [`ThresholdControlModule.init`](../../../../../../src-ts/runtime-executables/ems/modules/threshold-control.ts#L358) | – | Number, String, ensureDefault, mk, this._buildRulesFromConfig, this._getRule, this.adapter.getStateAsync, this.adapter.setObjectNotExistsAsync, this.dp.upsert |
| [`mk`](../../../../../../src-ts/runtime-executables/ems/modules/threshold-control.ts#L384) | id, name, type, role, unit, write, def | this.adapter.setObjectNotExistsAsync |
| [`ensureDefault`](../../../../../../src-ts/runtime-executables/ems/modules/threshold-control.ts#L412) | id, val | this.adapter.getStateAsync, this.adapter.setStateAsync |
| [`ThresholdControlModule._ruleOwner`](../../../../../../src-ts/runtime-executables/ems/modules/threshold-control.ts#L544) | r, isManual | – |
| [`ThresholdControlModule._ruleHasExclusiveAuthority`](../../../../../../src-ts/runtime-executables/ems/modules/threshold-control.ts#L548) | r, owner | Array.isArray, String, row.activeOwners.map |
| [`ThresholdControlModule.deactivate`](../../../../../../src-ts/runtime-executables/ems/modules/threshold-control.ts#L564) | – | String, failures.join, failures.push, this._buildRulesFromConfig, this._forceRuleSafeOff |
| [`ThresholdControlModule._forceRuleSafeOff`](../../../../../../src-ts/runtime-executables/ems/modules/threshold-control.ts#L588) | r, status | Date.now, dp.upsert, priorityForOwner, this._clearActuatorWriteCache, this._hyst.set, this._readRuleOutput, this._readbackMatches, this._setStateIfChanged, withActuatorShadowContext |
| [`ThresholdControlModule._writeRuleOutput`](../../../../../../src-ts/runtime-executables/ems/modules/threshold-control.ts#L644) | r, want, isManual | priorityForOwner, this._ruleHasExclusiveAuthority, this._ruleOwner, withActuatorShadowContext |
| [`ThresholdControlModule._readRuleOutput`](../../../../../../src-ts/runtime-executables/ems/modules/threshold-control.ts#L661) | r | this.adapter.getForeignStateAsync |
| [`ThresholdControlModule._readbackMatches`](../../../../../../src-ts/runtime-executables/ems/modules/threshold-control.ts#L671) | r, want, value | Math.abs, Math.max, Number, Number.isFinite |
| [`ThresholdControlModule.tick`](../../../../../../src-ts/runtime-executables/ems/modules/threshold-control.ts#L679) | – | Date.now, Math.max, Math.min, Math.round, Number, Number.isFinite, String, commitFlexibleLoadDecision, dp.getNumberFresh, evaluateFlexibleLoadRequest, invalidateSafetyEnvelope, liveSafetyEnvelope, recordAcceptedActuatorTransition, this._forceRuleSafeOff (weitere in der Quelle) |
