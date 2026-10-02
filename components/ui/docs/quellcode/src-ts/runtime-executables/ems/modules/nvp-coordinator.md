# src-ts/runtime-executables/ems/modules/nvp-coordinator.ts

Koordiniert Speicher und PV am gemeinsamen Netzverknüpfungspunkt, damit verbleibende Netzabweichungen nicht doppelt ausgeregelt werden.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/modules/nvp-coordinator.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `./base` | [src-ts/runtime-executables/ems/modules/base.ts](../../../../../../src-ts/runtime-executables/ems/modules/base.ts) |
| `../services/measurement-freshness` | [src-ts/runtime-executables/ems/services/measurement-freshness.ts](../../../../../../src-ts/runtime-executables/ems/services/measurement-freshness.ts) |
| `../services/actuator-shadow-arbiter` | [src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts) |
| `../services/accepted-power-effects` | [src-ts/runtime-executables/ems/services/accepted-power-effects.ts](../../../../../../src-ts/runtime-executables/ems/services/accepted-power-effects.ts) |
| `../services/storage-self-consumption-policy` | [src-ts/runtime-executables/ems/services/storage-self-consumption-policy.ts](../../../../../../src-ts/runtime-executables/ems/services/storage-self-consumption-policy.ts) |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/module-manager.ts](../../../../../../src-ts/runtime-executables/ems/module-manager.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`finiteOrNull`](../../../../../../src-ts/runtime-executables/ems/modules/nvp-coordinator.ts#L86) | value | Number, Number.isFinite, value.trim |
| [`roundedOrNull`](../../../../../../src-ts/runtime-executables/ems/modules/nvp-coordinator.ts#L93) | value | Math.round, finiteOrNull |
| [`boolValue`](../../../../../../src-ts/runtime-executables/ems/modules/nvp-coordinator.ts#L98) | value, fallback | value.trim |
| [`cleanText`](../../../../../../src-ts/runtime-executables/ems/modules/nvp-coordinator.ts#L109) | value, maxLen | Math.max, String, text.slice |
| [`clamp`](../../../../../../src-ts/runtime-executables/ems/modules/nvp-coordinator.ts#L116) | value, min, max | Math.max, Math.min |
| [`containsAny`](../../../../../../src-ts/runtime-executables/ems/modules/nvp-coordinator.ts#L118) | value, terms | String, terms.some |
| [`buildNvpCoordinatorSnapshot`](../../../../../../src-ts/runtime-executables/ems/modules/nvp-coordinator.ts#L131) | input | Array.isArray, Date.now, Math.abs, Math.max, Math.round, boolValue, clamp, cleanText, containsAny, finiteOrNull, input.acceptedFlexibleEffects.slice, resolveNvpBandTarget, roundedOrNull, storageWriteStatus.toLowerCase |
| [`NvpCoordinatorModule.constructor`](../../../../../../src-ts/runtime-executables/ems/modules/nvp-coordinator.ts#L356) | adapter, dpRegistry, gridConstraintsModule, gridEnabledFn | super |
| [`NvpCoordinatorModule.init`](../../../../../../src-ts/runtime-executables/ems/modules/nvp-coordinator.ts#L381) | – | mk, this.adapter.setObjectNotExistsAsync |
| [`mk`](../../../../../../src-ts/runtime-executables/ems/modules/nvp-coordinator.ts#L389) | id, name, type, role | this.adapter.setObjectNotExistsAsync |
| [`NvpCoordinatorModule._config`](../../../../../../src-ts/runtime-executables/ems/modules/nvp-coordinator.ts#L452) | – | Math.max, Math.round, clamp, cleanText, finiteOrNull, resolveStorageOperatingPolicy, this.adapter._nwGetStorageControlAuthority |
| [`NvpCoordinatorModule._readStates`](../../../../../../src-ts/runtime-executables/ems/modules/nvp-coordinator.ts#L504) | ids | Promise.all, ids.map |
| [`NvpCoordinatorModule._responseState`](../../../../../../src-ts/runtime-executables/ems/modules/nvp-coordinator.ts#L517) | now, topology, targetW, actualW, actualSampleTs, writeAccepted, cfg | Math.abs, Math.max, Math.round, Number, Number.isFinite, clamp, clearResponse |
| [`clearResponse`](../../../../../../src-ts/runtime-executables/ems/modules/nvp-coordinator.ts#L563) | – | – |
| [`NvpCoordinatorModule._finalizeStatus`](../../../../../../src-ts/runtime-executables/ems/modules/nvp-coordinator.ts#L627) | snapshot, pv | boolValue, cleanText |
| [`NvpCoordinatorModule.tick`](../../../../../../src-ts/runtime-executables/ems/modules/nvp-coordinator.ts#L648) | – | Date.now, JSON.stringify, String, boolValue, buildNvpCoordinatorSnapshot, cleanText, containsAny, finiteOrNull, getAcceptedPowerEffectSnapshot, priorityForOwner, resolveCurrentNvpSnapshot, roundedOrNull, this._config, this._finalizeStatus (weitere in der Quelle) |
| [`NvpCoordinatorModule._setIfChanged`](../../../../../../src-ts/runtime-executables/ems/modules/nvp-coordinator.ts#L989) | id, value | this.adapter.getStateAsync, this.adapter.setStateAsync |
