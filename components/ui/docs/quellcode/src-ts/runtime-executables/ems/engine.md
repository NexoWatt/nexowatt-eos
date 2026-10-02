# src-ts/runtime-executables/ems/engine.ts

Startet und beendet die EMS-Laufzeit; koordiniert periodische und durch Bedienung oder NVP-Messung ausgelöste Regelzyklen.

**Daten und Wirkung:** Liest Adapter-Konfiguration und Messdaten über DatapointRegistry; übergibt einen gemeinsamen Kontext an ModuleManager. Tick-Sperre und getrennte Heartbeats verhindern parallele Regelzyklen und falsche Offline-Anzeigen.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/ems/engine.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `./datapoints` | [src-ts/runtime-executables/ems/datapoints.ts](../../../../../src-ts/runtime-executables/ems/datapoints.ts) |
| `./module-manager` | [src-ts/runtime-executables/ems/module-manager.ts](../../../../../src-ts/runtime-executables/ems/module-manager.ts) |
| `./services/storage-override-bridge` | [src-ts/runtime-executables/ems/services/storage-override-bridge.ts](../../../../../src-ts/runtime-executables/ems/services/storage-override-bridge.ts) |
| `./services/measurement-freshness` | [src-ts/runtime-executables/ems/services/measurement-freshness.ts](../../../../../src-ts/runtime-executables/ems/services/measurement-freshness.ts) |
| `./services/actuator-shadow-arbiter` | [src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts](../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts) |
| `./charging-budget-helpers` | [src-ts/runtime-executables/ems/charging-budget-helpers.ts](../../../../../src-ts/runtime-executables/ems/charging-budget-helpers.ts) |

**Direkt importiert von:**

- [src-ts/runtime-executables/main.ts](../../../../../src-ts/runtime-executables/main.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`clampNumber`](../../../../../src-ts/runtime-executables/ems/engine.ts#L67) | n, min, max, fallback | Math.max, Math.min, Number, Number.isFinite |
| [`EmsEngine.constructor`](../../../../../src-ts/runtime-executables/ems/engine.ts#L104) | adapter | – |
| [`EmsEngine._setInterval`](../../../../../src-ts/runtime-executables/ems/engine.ts#L172) | fn, ms | a.setInterval, setInterval |
| [`guarded`](../../../../../src-ts/runtime-executables/ems/engine.ts#L175) | args | fn |
| [`EmsEngine._clearInterval`](../../../../../src-ts/runtime-executables/ems/engine.ts#L185) | timer | a.clearInterval, clearInterval |
| [`EmsEngine._setTimeout`](../../../../../src-ts/runtime-executables/ems/engine.ts#L197) | fn, ms | a.setTimeout, setTimeout |
| [`guarded`](../../../../../src-ts/runtime-executables/ems/engine.ts#L200) | args | fn |
| [`EmsEngine._clearTimeout`](../../../../../src-ts/runtime-executables/ems/engine.ts#L212) | timer | a.clearTimeout, clearTimeout |
| [`EmsEngine._scheduleImmediateTick`](../../../../../src-ts/runtime-executables/ems/engine.ts#L226) | delayMs | clampNumber, this._setTimeout |
| [`EmsEngine.requestImmediateTick`](../../../../../src-ts/runtime-executables/ems/engine.ts#L260) | reason, delayMs | String, this._scheduleImmediateTick |
| [`EmsEngine.requestNvpTick`](../../../../../src-ts/runtime-executables/ems/engine.ts#L274) | reason | Date.now, Math.round, String, this.adapter.setStateAsync, this.requestImmediateTick |
| [`EmsEngine.handleExternalStateChange`](../../../../../src-ts/runtime-executables/ems/engine.ts#L296) | id, state | Number, Number.isFinite, String, objectId.slice, this._nvpSourceIds.has, this.requestNvpTick |
| [`EmsEngine._ensureInternalStates`](../../../../../src-ts/runtime-executables/ems/engine.ts#L315) | – | Object.entries, a.setObjectNotExistsAsync |
| [`EmsEngine._buildChargingConfig`](../../../../../src-ts/runtime-executables/ems/engine.ts#L592) | – | Array.isArray, Math.max, Math.min, Math.round, Number, Number.isFinite, String, cfg.peakShaving.gridPointPowerId.trim, computeChargingInfrastructureCapacity, dps.gridBuyPower.trim, dps.gridPointConnected.trim, dps.gridPointPower.trim, dps.gridPointWatchdog.trim, dps.gridSellPower.trim (weitere in der Quelle) |
| [`EmsEngine._publishSchedulerHeartbeat`](../../../../../src-ts/runtime-executables/ems/engine.ts#L1106) | reason | Date.now, Math.max, Math.round, Promise.allSettled, String, clampNumber, this.adapter.setStateAsync |
| [`EmsEngine._startSchedulerHeartbeat`](../../../../../src-ts/runtime-executables/ems/engine.ts#L1145) | – | this._publishSchedulerHeartbeat, this._setInterval |
| [`EmsEngine.init`](../../../../../src-ts/runtime-executables/ems/engine.ts#L1168) | – | String, adapter.config.peakShaving.gridPointPowerId.trim, adapter.log.info, adapter.subscribeStates, applyStorageMeasurementOverrides, clampNumber, dps.gridBuyPower.trim, dps.gridPointConnected.trim, dps.gridPointPower.trim, dps.gridPointWatchdog.trim, dps.gridSellPower.trim, dps.storageCapacityKwh.trim, id.includes, id.match (weitere in der Quelle) |
| [`EmsEngine.tick`](../../../../../src-ts/runtime-executables/ems/engine.ts#L1348) | – | Array.isArray, Date.now, Math.max, Math.min, Math.round, Number, Number.isFinite, String, buildNvpSnapshotFromRegistry, clampNumber, this._publishSchedulerHeartbeat, this._scheduleImmediateTick, this.adapter._meshCoordinator?.currentLimits, this.adapter._meshCoordinator?.markApplied (weitere in der Quelle) |
| [`EmsEngine.stop`](../../../../../src-ts/runtime-executables/ems/engine.ts#L1552) | – | Date.now, this._actuatorShadowArbiter.uninstall, this._clearInterval, this._clearTimeout, this.mm.stop |
