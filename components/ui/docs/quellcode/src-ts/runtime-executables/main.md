# src-ts/runtime-executables/main.ts

Verbindet den ioBroker-Adapter mit Webserver, Rollenprüfung, Konfiguration, State-Cache, EMS-Engine und Benachrichtigungen.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../src-ts/runtime-executables/main.ts) · [Gesamtübersicht](../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `@iobroker/adapter-core` | Node-Bordmittel oder externe Paketabhängigkeit. |
| `express` | Node-Bordmittel oder externe Paketabhängigkeit. |
| `path` | Node-Bordmittel oder externe Paketabhängigkeit. |
| `os` | Node-Bordmittel oder externe Paketabhängigkeit. |
| `crypto` | Node-Bordmittel oder externe Paketabhängigkeit. |
| `https` | Node-Bordmittel oder externe Paketabhängigkeit. |
| `./lib/eos-integrated` | [src-ts/runtime-executables/lib/eos-integrated.ts](../../../../src-ts/runtime-executables/lib/eos-integrated.ts) |
| `./lib/os-update-status` | [src-ts/runtime-executables/lib/os-update-status.ts](../../../../src-ts/runtime-executables/lib/os-update-status.ts) |
| `./package.json` | [package.json](../../../../package.json) |
| `./lib/energy-origin-api` | [src-ts/runtime-executables/lib/energy-origin-api.ts](../../../../src-ts/runtime-executables/lib/energy-origin-api.ts) |
| `./lib/charging-diagnostics-api` | [src-ts/runtime-executables/lib/charging-diagnostics-api.ts](../../../../src-ts/runtime-executables/lib/charging-diagnostics-api.ts) |
| `./lib/sse-runtime-guard` | [src-ts/runtime-executables/lib/sse-runtime-guard.ts](../../../../src-ts/runtime-executables/lib/sse-runtime-guard.ts) |
| `./lib/station-display-presentation` | [src-ts/runtime-executables/lib/station-display-presentation.ts](../../../../src-ts/runtime-executables/lib/station-display-presentation.ts) |
| `./lib/license-bootstrap-access` | [src-ts/runtime-executables/lib/license-bootstrap-access.ts](../../../../src-ts/runtime-executables/lib/license-bootstrap-access.ts) |
| `./ems/services/tariff-provider-registry` | [src-ts/runtime-executables/ems/services/tariff-provider-registry.ts](../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts) |
| `./ems/services/evcs-unit-conversion` | [src-ts/runtime-executables/ems/services/evcs-unit-conversion.ts](../../../../src-ts/runtime-executables/ems/services/evcs-unit-conversion.ts) |
| `./lib/evcs-electrical-limits` | [src-ts/runtime-executables/lib/evcs-electrical-limits.ts](../../../../src-ts/runtime-executables/lib/evcs-electrical-limits.ts) |
| `./lib/notification-mail` | [src-ts/runtime-executables/lib/notification-mail.ts](../../../../src-ts/runtime-executables/lib/notification-mail.ts) |
| `./ems/services/open-meteo-pv-forecast` | [src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts](../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts) |
| `./ems/services/admin-overview-publisher` | [src-ts/runtime-executables/ems/services/admin-overview-publisher.ts](../../../../src-ts/runtime-executables/ems/services/admin-overview-publisher.ts) |
| `./lib/ts-mirrors/backend/main-runtime/main-runtime-helpers` | [src-ts/backend/main-runtime/main-runtime-helpers.ts](../../../../src-ts/backend/main-runtime/main-runtime-helpers.ts) |
| `./lib/ts-mirrors/main/api-state` | [src-ts/main/api-state.ts](../../../../src-ts/main/api-state.ts) |
| `./lib/ts-mirrors/main/api-set` | [src-ts/main/api-set.ts](../../../../src-ts/main/api-set.ts) |
| `@iobroker/type-detector` | Node-Bordmittel oder externe Paketabhängigkeit. |
| `./ems/engine` | [src-ts/runtime-executables/ems/engine.ts](../../../../src-ts/runtime-executables/ems/engine.ts) |
| `./ems/services/para14a-eebus-api` | [src-ts/runtime-executables/ems/services/para14a-eebus-api.ts](../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts) |
| `./ems/services/measurement-freshness` | [src-ts/runtime-executables/ems/services/measurement-freshness.ts](../../../../src-ts/runtime-executables/ems/services/measurement-freshness.ts) |
| `./ems/services/actuator-shadow-arbiter` | [src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts](../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts) |
| `./ems/services/storage-self-consumption-policy` | [src-ts/runtime-executables/ems/services/storage-self-consumption-policy.ts](../../../../src-ts/runtime-executables/ems/services/storage-self-consumption-policy.ts) |
| `./ems/services/country-profile-service` | [src-ts/runtime-executables/ems/services/country-profile-service.ts](../../../../src-ts/runtime-executables/ems/services/country-profile-service.ts) |
| `./ems/services/locale-api-service` | [src-ts/runtime-executables/ems/services/locale-api-service.ts](../../../../src-ts/runtime-executables/ems/services/locale-api-service.ts) |
| `./ems/services/feature-flags` | [src-ts/runtime-executables/ems/services/feature-flags.ts](../../../../src-ts/runtime-executables/ems/services/feature-flags.ts) |
| `./ems/services/storage-farm-aggregation` | [src-ts/runtime-executables/ems/services/storage-farm-aggregation.ts](../../../../src-ts/runtime-executables/ems/services/storage-farm-aggregation.ts) |
| `./ems/services/pv-source-identity` | [src-ts/runtime-executables/ems/services/pv-source-identity.ts](../../../../src-ts/runtime-executables/ems/services/pv-source-identity.ts) |
| `./ems/evcs-control-mapping` | [src-ts/runtime-executables/ems/evcs-control-mapping.ts](../../../../src-ts/runtime-executables/ems/evcs-control-mapping.ts) |
| `./ems/services/storage-datapoint-config` | [src-ts/runtime-executables/ems/services/storage-datapoint-config.ts](../../../../src-ts/runtime-executables/ems/services/storage-datapoint-config.ts) |
| `./ems/services/fenecon-hybrid-control` | [src-ts/runtime-executables/ems/services/fenecon-hybrid-control.ts](../../../../src-ts/runtime-executables/ems/services/fenecon-hybrid-control.ts) |
| `./ems/nexologic-engine` | [src-ts/runtime-executables/ems/nexologic-engine.ts](../../../../src-ts/runtime-executables/ems/nexologic-engine.ts) |
| `./lib/smarthome-contract` | [src-ts/runtime-executables/lib/smarthome-contract.ts](../../../../src-ts/runtime-executables/lib/smarthome-contract.ts) |
| `./lib/mesh-coordinator` | [src-ts/runtime-executables/lib/mesh-coordinator.ts](../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts) |
| `./ems/services/netoperator-driver-registry` | [src-ts/runtime-executables/ems/services/netoperator-driver-registry.ts](../../../../src-ts/runtime-executables/ems/services/netoperator-driver-registry.ts) |
| `./lib/ts-mirrors/backend/feature-visibility/feature-visibility` | [src-ts/backend/feature-visibility/feature-visibility.ts](../../../../src-ts/backend/feature-visibility/feature-visibility.ts) |

**Direkt importiert von:**

Kein direkter Import innerhalb des erfassten Quellbereichs. Mögliche HTML-, Adapter-, Build- oder dynamische Einstiege sind separat zu prüfen.

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`parseCookies`](../../../../src-ts/runtime-executables/main.ts#L127) | req | Buffer.byteLength, Object.hasOwn, decodeURIComponent, empty, p.indexOf, p.slice, p.trim, raw.split |
| [`empty`](../../../../src-ts/runtime-executables/main.ts#L129) | – | Object.create |
| [`createToken`](../../../../src-ts/runtime-executables/main.ts#L147) | – | crypto.randomBytes |
| [`NexoWattVis.constructor`](../../../../src-ts/runtime-executables/main.ts#L166) | options | Object.create, super, this.on, this.onMessage.bind, this.onReady.bind, this.onStateChange.bind, this.onUnload.bind |
| [`getSnapshotChunk`](../../../../src-ts/runtime-executables/main.ts#L186) | client | Date.now, JSON.stringify, Number, Object.create, String, adapter.log?.warn, publicBuilder |
| [`NexoWattVis._nwSetTimeout`](../../../../src-ts/runtime-executables/main.ts#L413) | fn, ms, args | setTimeout, this.setTimeout |
| [`guarded`](../../../../src-ts/runtime-executables/main.ts#L418) | cbArgs | fn |
| [`NexoWattVis._nwSetInterval`](../../../../src-ts/runtime-executables/main.ts#L427) | fn, ms, args | setInterval, this.setInterval |
| [`guarded`](../../../../src-ts/runtime-executables/main.ts#L429) | cbArgs | fn |
| [`NexoWattVis._nwClearTimeout`](../../../../src-ts/runtime-executables/main.ts#L438) | timer | clearTimeout, this.clearTimeout |
| [`NexoWattVis._nwClearInterval`](../../../../src-ts/runtime-executables/main.ts#L444) | timer | clearInterval, this.clearInterval |
| [`NexoWattVis._nwSleep`](../../../../src-ts/runtime-executables/main.ts#L450) | ms | Promise.resolve |
| [`NexoWattVis._nwGetMemoryDiagnostics`](../../../../src-ts/runtime-executables/main.ts#L458) | – | Object.keys, this._nwSseGuard.getStats |
| [`NexoWattVis._nwHandleHeapPressure`](../../../../src-ts/runtime-executables/main.ts#L474) | sample | Math.round, Number, this._nwSseGuard.mitigatePressure, this.log.warn |
| [`NexoWattVis._nwPrepareControlledRestart`](../../../../src-ts/runtime-executables/main.ts#L495) | sample | Math.round, Number, this._nwCloseSseClients, this.log.error |
| [`NexoWattVis.ensureInfoConnectionState`](../../../../src-ts/runtime-executables/main.ts#L504) | – | this.setObjectNotExistsAsync |
| [`NexoWattVis._nwIsHttpServerListening`](../../../../src-ts/runtime-executables/main.ts#L524) | – | – |
| [`NexoWattVis._nwSetInfoConnection`](../../../../src-ts/runtime-executables/main.ts#L528) | online, reason | Date.now, Number, Number.isFinite, nwMainRuntimeTsHelpers.buildInfoConnectionStateUpdate, this.log.debug, this.setStateAsync, this.updateValue |
| [`NexoWattVis._nwRunApiStateTsShadowComparison`](../../../../src-ts/runtime-executables/main.ts#L566) | reason | Array.isArray, Date.now, String, nwMainRuntimeTsHelpers.compareApiStateShadow, result.mismatches.join, this.log.debug, this.log.warn |
| [`NexoWattVis._nwRunApiSetTsShadowPlan`](../../../../src-ts/runtime-executables/main.ts#L597) | scope, key, value | Array.isArray, Date.now, String, nwMainRuntimeTsHelpers.buildApiSetShadowPlan, plan.warnings.join, this.log.debug |
| [`NexoWattVis._nwBuildApiStateTsRuntimeResponse`](../../../../src-ts/runtime-executables/main.ts#L632) | reason | Date.now, Object.keys, String, nwMainApiStateTsHelpers.buildMainApiStateResponse, this.log.warn |
| [`NexoWattVis._nwTryApplyApiSetTsSettingsPlan`](../../../../src-ts/runtime-executables/main.ts#L674) | scope, key, value | Date.now, String, isActuatorAuthorityBlockedResult, mapped.trim, nwMainApiSetTsHelpers.buildMainSettingsWritePlan, this.log.warn, this.setForeignStateAsync, this.setStateAsync, this.updateValue |
| [`NexoWattVis._nwStartConnectionHeartbeat`](../../../../src-ts/runtime-executables/main.ts#L714) | – | this._nwSetInterval |
| [`NexoWattVis._nwStopConnectionHeartbeat`](../../../../src-ts/runtime-executables/main.ts#L727) | – | this._nwClearInterval |
| [`NexoWattVis.ensureInstallerStates`](../../../../src-ts/runtime-executables/main.ts#L733) | – | Object.entries, this.setObjectNotExistsAsync |
| [`NexoWattVis.ensureSmartHomeUserStates`](../../../../src-ts/runtime-executables/main.ts#L760) | – | this.setObjectNotExistsAsync |
| [`NexoWattVis._nwParseTimeToMinutes`](../../../../src-ts/runtime-executables/main.ts#L856) | hhmm | Number.isFinite, String, parseInt, s.match |
| [`NexoWattVis._nwNormalizeDaysArray`](../../../../src-ts/runtime-executables/main.ts#L869) | days | Array.isArray, Number.isFinite, out.push, out.sort, parseInt, seen.add, seen.has |
| [`NexoWattVis._nwNormalizeSmartHomeTimersConfig`](../../../../src-ts/runtime-executables/main.ts#L887) | rawCfg | Array.isArray, Number.isFinite, Number.isNaN, Object.create, Object.keys, Object.prototype.hasOwnProperty.call, String, onLevel.replace, outTimers.sort, parseFloat, this._nwNormalizeDaysArray, this._nwParseTimeToMinutes, timers.push |
| [`NexoWattVis.loadSmartHomeTimersFromState`](../../../../src-ts/runtime-executables/main.ts#L943) | – | JSON.parse, raw.trim, this._nwNormalizeSmartHomeTimersConfig, this._nwScheduleNextSmartHomeTimer, this.getStateAsync |
| [`NexoWattVis.getSmartHomeTimersConfig`](../../../../src-ts/runtime-executables/main.ts#L971) | – | – |
| [`NexoWattVis.persistSmartHomeTimersToState`](../../../../src-ts/runtime-executables/main.ts#L975) | cfg | Date.now, JSON.stringify, this._nwNormalizeSmartHomeTimersConfig, this._nwScheduleNextSmartHomeTimer, this.log.warn, this.setStateAsync |
| [`NexoWattVis._nwComputeNextOccurrence`](../../../../src-ts/runtime-executables/main.ts#L991) | nowTs, daysArr, timeMinutes | Array.isArray, Date.now, Number.isFinite, at.getTime, base.getTime, base.setHours, base.setSeconds, d.getDay, d.getTime, daySet.has |
| [`NexoWattVis._nwComputeNextSmartHomeTimerEvents`](../../../../src-ts/runtime-executables/main.ts#L1013) | nowTs | Array.isArray, Object.create, this._nwComputeNextOccurrence, this._nwParseTimeToMinutes, this.getSmartHomeTimersConfig |
| [`NexoWattVis._nwClearSmartHomeTimerSchedule`](../../../../src-ts/runtime-executables/main.ts#L1049) | – | this._nwClearTimeout |
| [`NexoWattVis._nwScheduleNextSmartHomeTimer`](../../../../src-ts/runtime-executables/main.ts#L1057) | reason | Date.now, Math.max, this._nwClearSmartHomeTimerSchedule, this._nwComputeNextSmartHomeTimerEvents, this._nwSetTimeout, this.log.debug, this.setStateAsync |
| [`NexoWattVis._nwRunDueSmartHomeTimer`](../../../../src-ts/runtime-executables/main.ts#L1086) | – | this._nwExecuteSmartHomeTimerAction, this._nwScheduleNextSmartHomeTimer, this.getSmartHomeTimersConfig, this.log.warn |
| [`NexoWattVis._nwExecuteSmartHomeTimerAction`](../../../../src-ts/runtime-executables/main.ts#L1112) | timer, kind | Math.max, Math.min, Number.isFinite, String, devices.find, this._nwExecuteSmartHomeSceneAction, this._nwRunSmartHomeSceneById, this.buildSmartHomeDevicesFromConfig, this.log.debug, this.log.warn |
| [`NexoWattVis._nwNormalizeSmartHomeLogicClocksConfig`](../../../../src-ts/runtime-executables/main.ts#L1178) | rawCfg | Array.isArray, Object.create, Object.keys, String, clocks.push, outClocks.sort, this._nwNormalizeDaysArray, this._nwParseTimeToMinutes, toSafeIdPart |
| [`toSafeIdPart`](../../../../src-ts/runtime-executables/main.ts#L1180) | input | String, s.toLowerCase |
| [`NexoWattVis.getSmartHomeLogicClocksConfig`](../../../../src-ts/runtime-executables/main.ts#L1227) | – | – |
| [`NexoWattVis.loadSmartHomeLogicClocksFromState`](../../../../src-ts/runtime-executables/main.ts#L1236) | – | JSON.parse, raw.trim, this._nwNormalizeSmartHomeLogicClocksConfig, this._nwRefreshLogicClockStatesNow, this._nwScheduleNextSmartHomeLogicClock, this.getStateAsync |
| [`NexoWattVis.persistSmartHomeLogicClocksToState`](../../../../src-ts/runtime-executables/main.ts#L1267) | cfg | Date.now, JSON.stringify, this._nwNormalizeSmartHomeLogicClocksConfig, this._nwRefreshLogicClockStatesNow, this._nwScheduleNextSmartHomeLogicClock, this.log.warn, this.setStateAsync |
| [`NexoWattVis._nwShiftDays`](../../../../src-ts/runtime-executables/main.ts#L1285) | daysArr, shift | Array.isArray, Number.isFinite, out.push, out.sort, parseInt, seen.add, seen.has |
| [`NexoWattVis._nwIsLogicClockActive`](../../../../src-ts/runtime-executables/main.ts#L1302) | clock, nowTs | Date.now, now.getDay, now.getHours, now.getMinutes, set.has, this._nwNormalizeDaysArray, this._nwParseTimeToMinutes |
| [`NexoWattVis._nwEnsureLogicClockObjects`](../../../../src-ts/runtime-executables/main.ts#L1331) | clock | String, this.setObjectNotExistsAsync |
| [`NexoWattVis._nwRefreshLogicClockStatesNow`](../../../../src-ts/runtime-executables/main.ts#L1361) | reason | Array.isArray, Date.now, Object.create, this._nwEnsureLogicClockObjects, this._nwIsLogicClockActive, this.getSmartHomeLogicClocksConfig, this.log.debug, this.setStateAsync |
| [`NexoWattVis._nwComputeNextSmartHomeLogicClockEvents`](../../../../src-ts/runtime-executables/main.ts#L1392) | nowTs | Array.isArray, Object.create, this._nwComputeNextOccurrence, this._nwNormalizeDaysArray, this._nwParseTimeToMinutes, this._nwShiftDays, this.getSmartHomeLogicClocksConfig |
| [`NexoWattVis._nwClearSmartHomeLogicClockSchedule`](../../../../src-ts/runtime-executables/main.ts#L1431) | – | this._nwClearTimeout |
| [`NexoWattVis._nwScheduleNextSmartHomeLogicClock`](../../../../src-ts/runtime-executables/main.ts#L1444) | reason | Date.now, Math.max, this._nwClearSmartHomeLogicClockSchedule, this._nwComputeNextSmartHomeLogicClockEvents, this._nwSetTimeout, this.log.debug, this.setStateAsync |
| [`NexoWattVis._nwRunDueSmartHomeLogicClock`](../../../../src-ts/runtime-executables/main.ts#L1476) | – | Object.create, String, this._nwEnsureLogicClockObjects, this._nwRefreshLogicClockStatesNow, this._nwScheduleNextSmartHomeLogicClock, this.getSmartHomeLogicClocksConfig, this.log.warn, this.setStateAsync |
| [`NexoWattVis._nwGetSmartHomeSceneRuntime`](../../../../src-ts/runtime-executables/main.ts#L1513) | – | Array.isArray, nwNormalizeSmartHomeConfigContract, this.buildSmartHomeDevicesFromConfig, this.getSmartHomeConfig |
| [`NexoWattVis._nwParseSmartHomeBoolean`](../../../../src-ts/runtime-executables/main.ts#L1526) | raw | Number.isFinite, raw.trim |
| [`NexoWattVis._nwReadSmartHomeSafetySignal`](../../../../src-ts/runtime-executables/main.ts#L1537) | dpId, kind, staleAfterSec | Date.now, Math.max, Number, Number.isFinite, this._nwParseSmartHomeBoolean, this.getForeignStateAsync |
| [`NexoWattVis._nwCheckSmartHomeCoverSafety`](../../../../src-ts/runtime-executables/main.ts#L1557) | dev | Number, this._nwReadSmartHomeSafetySignal |
| [`NexoWattVis._nwCheckSmartHomeClimateSafetyForScene`](../../../../src-ts/runtime-executables/main.ts#L1573) | dev | Number, this._nwReadSmartHomeSafetySignal |
| [`NexoWattVis._nwPreflightSmartHomeSceneById`](../../../../src-ts/runtime-executables/main.ts#L1585) | sceneId, context | Array.isArray, Math.max, Math.min, Number, Object.prototype.hasOwnProperty.call, String, ctx.stack.slice, errors.push, nwNormalizeSmartHomeSceneActionKind, nwSmartHomeSceneActionTargetAvailable, runtime.devices.find, runtime.scenes.find, stack.concat, stack.includes (weitere in der Quelle) |
| [`NexoWattVis._nwRunSmartHomeSceneById`](../../../../src-ts/runtime-executables/main.ts#L1634) | sceneId, context | Promise.resolve, previous.catch, run.then, this._nwRunSmartHomeSceneByIdInternal |
| [`NexoWattVis._nwRunSmartHomeSceneByIdInternal`](../../../../src-ts/runtime-executables/main.ts#L1657) | sceneId, context | Array.isArray, Math.max, Math.min, Number, Object.prototype.hasOwnProperty.call, String, ctx.stack.slice, errors.push, nwNormalizeSmartHomeSceneActionKind, runtime.devices.find, runtime.scenes.find, stack.concat, stack.includes, this._nwExecuteSmartHomeSceneAction (weitere in der Quelle) |
| [`NexoWattVis._nwWriteSmartHomeSceneState`](../../../../src-ts/runtime-executables/main.ts#L1721) | dpId, value | this.setForeignStateAsync |
| [`NexoWattVis._nwPulseSmartHomeSceneDatapoint`](../../../../src-ts/runtime-executables/main.ts#L1728) | dpId, pulseMs | Math.max, Math.min, Number, setTimeout, this._nwSmartHomePulseTimers.set, this._nwWriteSmartHomeSceneState, timer.unref |
| [`NexoWattVis._nwCoerceSmartHomeSceneValueForDatapoint`](../../../../src-ts/runtime-executables/main.ts#L1742) | dpId, value | Number, Number.isFinite, String, this._nwParseSmartHomeBoolean, this.getForeignObjectAsync |
| [`NexoWattVis._nwExecuteSmartHomeSceneAction`](../../../../src-ts/runtime-executables/main.ts#L1762) | dev, kind, value, context | Math.max, Math.min, Math.round, Number, Number.isFinite, Object.prototype.hasOwnProperty.call, String, nwNormalizeSmartHomeSceneActionKind, parseInt, text.slice, text.startsWith, text.toLowerCase, this._nwCheckSmartHomeClimateSafetyForScene, this._nwCheckSmartHomeCoverSafety (weitere in der Quelle) |
| [`NexoWattVis.ensureLicenseStates`](../../../../src-ts/runtime-executables/main.ts#L2022) | – | Object.entries, this.setObjectNotExistsAsync |
| [`NexoWattVis._nwNormalizeLicenseEdition`](../../../../src-ts/runtime-executables/main.ts#L2058) | edition | String |
| [`NexoWattVis._nwCurrentLicenseEdition`](../../../../src-ts/runtime-executables/main.ts#L2070) | – | this._nwCentralLicense?.getStatus, this._nwNormalizeLicenseEdition |
| [`NexoWattVis._nwLicenseFeaturesForEdition`](../../../../src-ts/runtime-executables/main.ts#L2075) | edition | hemsFeatures.has, nwFeatureFlagsService.buildFeatureMap, this._nwNormalizeLicenseEdition |
| [`NexoWattVis._nwLicenseAppFeature`](../../../../src-ts/runtime-executables/main.ts#L2090) | appId | String, nwFeatureFlagsService.appFeature |
| [`NexoWattVis._nwIsFeatureLicensed`](../../../../src-ts/runtime-executables/main.ts#L2128) | feature | Array.isArray, String, status.features.includes, this._nwCentralLicense?.getStatus, this._nwCurrentLicenseEdition, this._nwLicenseFeaturesForEdition, this._nwLicenseMaxStorages, this._nwLicenseMaxWallboxes |
| [`NexoWattVis._nwLicenseAllowsAppId`](../../../../src-ts/runtime-executables/main.ts#L2143) | appId | this._nwIsFeatureLicensed, this._nwLicenseAppFeature |
| [`NexoWattVis._nwLicenseMaxWallboxes`](../../../../src-ts/runtime-executables/main.ts#L2147) | – | Math.min, Number.isSafeInteger, this._nwCentralLicense?.getStatus, this._nwNormalizeLicenseEdition |
| [`NexoWattVis._nwLicenseMaxStorages`](../../../../src-ts/runtime-executables/main.ts#L2156) | – | Math.min, Number.isSafeInteger, this._nwCentralLicense?.getStatus, this._nwNormalizeLicenseEdition |
| [`NexoWattVis._nwValidateStorageFarmLicense`](../../../../src-ts/runtime-executables/main.ts#L2163) | config | this._nwCurrentLicenseEdition, this._nwLicenseMaxStorages, this._nwNormalizeStorageFarmRows |
| [`NexoWattVis._nwBuildLicenseFeatureInfo`](../../../../src-ts/runtime-executables/main.ts#L2180) | – | Number, Object.keys, String, nwFeatureFlagsService.editionLabel, nwFeatureFlagsService.homeIncludedApps, nwFeatureFlagsService.storagePerformanceProfile, this._nwCentralLicense?.getStatus, this._nwCentralLicense?.isAllowed, this._nwCurrentLicenseEdition, this._nwIsFeatureLicensed, this._nwLicenseFeaturesForEdition, this._nwLicenseMaxStorages, this._nwLicenseMaxWallboxes |
| [`NexoWattVis._nwApplyLicenseLimitsToEmsApps`](../../../../src-ts/runtime-executables/main.ts#L2223) | emsApps | JSON.parse, JSON.stringify, Object.assign, Object.keys, this._nwCurrentLicenseEdition, this._nwLicenseAllowsAppId, this.nwDeepMerge |
| [`NexoWattVis._nwApplyLicenseLimitsToInstallerPatch`](../../../../src-ts/runtime-executables/main.ts#L2247) | patch | Array.isArray, Math.max, Math.min, Math.round, Number, Number.isFinite, normalizePositiveW, nwFeatureFlagsService.storagePerformanceProfile, p.settingsConfig.evcsList.slice, p.settingsConfig.stationGroups.map, p.storageFarm.storages.map, this._nwApplyLicenseLimitsToEmsApps, this._nwCurrentLicenseEdition, this._nwLicenseMaxWallboxes |
| [`normalizePositiveW`](../../../../src-ts/runtime-executables/main.ts#L2278) | value | Math.min, Math.round, Number, Number.isFinite |
| [`NexoWattVis._nwIsLicenseValid`](../../../../src-ts/runtime-executables/main.ts#L2312) | uuid, enteredKey | this._nwResolveFullLicense |
| [`NexoWattVis._nwRefreshLicenseFromConfiguredKey`](../../../../src-ts/runtime-executables/main.ts#L2321) | logResult | JSON.stringify, Object.entries, eosIntegrated.makeLicenseClient, this._nwBuildLicenseFeatureInfo, this._nwCentralLicense.getStatus, this._nwCentralLicense.refresh, this._nwCurrentLicenseEdition, this.log.info, this.setStateAsync |
| [`NexoWattVis._nwInitLicense`](../../../../src-ts/runtime-executables/main.ts#L2347) | – | this._nwRefreshLicenseFromConfiguredKey, this._nwSetInterval |
| [`NexoWattVis.ensureSettingsStates`](../../../../src-ts/runtime-executables/main.ts#L2362) | – | Object.entries, this.getStateAsync, this.setObjectNotExistsAsync, this.setStateAsync |
| [`NexoWattVis.ensureSimulationStates`](../../../../src-ts/runtime-executables/main.ts#L2529) | – | Object.entries, this.setObjectNotExistsAsync |
| [`NexoWattVis.ensureWeatherStates`](../../../../src-ts/runtime-executables/main.ts#L2581) | – | Object.entries, this.getStateAsync, this.setObjectNotExistsAsync, this.setStateAsync |
| [`NexoWattVis.ensureEnergyTotalStates`](../../../../src-ts/runtime-executables/main.ts#L2634) | – | Object.entries, this._nwDetectInfluxInstance, this._nwEnsureInfluxCustom, this._nwGetHistoryInstance, this.getStateAsync, this.setObjectNotExistsAsync, this.setStateAsync |
| [`NexoWattVis._nwHttpsGetJson`](../../../../src-ts/runtime-executables/main.ts#L2687) | url, timeoutMs | – |
| [`NexoWattVis._nwGetSystemGeo`](../../../../src-ts/runtime-executables/main.ts#L2728) | – | Number, Number.isFinite, this.getForeignObjectAsync |
| [`NexoWattVis._nwRefreshSystemLanguage`](../../../../src-ts/runtime-executables/main.ts#L2750) | reason | Object.assign, String, nwCountryProfileService.getConfiguredCountryProfile, nwCountryProfileService.normalizeLanguage, nwCountryProfileService.readIoBrokerSystemLanguage |
| [`NexoWattVis._nwBuildLocaleInfo`](../../../../src-ts/runtime-executables/main.ts#L2768) | – | nwCountryProfileService.buildLocaleInfo |
| [`NexoWattVis._nwBuildCountryProfileInfo`](../../../../src-ts/runtime-executables/main.ts#L2776) | – | Object.assign, nwCountryProfileService.getConfiguredCountryProfile, this._nwBuildLocaleInfo |
| [`NexoWattVis._nwWeatherTextDe`](../../../../src-ts/runtime-executables/main.ts#L2791) | code | Number, Number.isFinite |
| [`NexoWattVis.nwUpdateWeather`](../../../../src-ts/runtime-executables/main.ts#L2837) | reason | Array.isArray, Math.round, Number, Number.isFinite, String, clearAll, encodeURIComponent, lat.toFixed, lon.toFixed, setIfUnmapped, this._notifyGetSettingBool, this._notifyGetSettingString, this._nwGetSystemGeo, this._nwHttpsGetJson (weitere in der Quelle) |
| [`setIfUnmapped`](../../../../src-ts/runtime-executables/main.ts#L2849) | key, val | this._nwHasMappedDatapoint, this.setStateAsync |
| [`clearAll`](../../../../src-ts/runtime-executables/main.ts#L2862) | – | setIfUnmapped |
| [`NexoWattVis.stopWeatherService`](../../../../src-ts/runtime-executables/main.ts#L2975) | – | this._nwClearInterval, this._nwClearTimeout |
| [`NexoWattVis.startWeatherService`](../../../../src-ts/runtime-executables/main.ts#L2993) | – | this._notifyGetSettingBool, this._nwSetInterval, this._nwSetTimeout, this.stopWeatherService |
| [`run`](../../../../src-ts/runtime-executables/main.ts#L3008) | – | this.nwUpdateWeather |
| [`NexoWattVis.ensureNotificationStates`](../../../../src-ts/runtime-executables/main.ts#L3020) | – | Object.entries, this.getStateAsync, this.setObjectNotExistsAsync, this.setStateAsync |
| [`NexoWattVis.nwDeepMerge`](../../../../src-ts/runtime-executables/main.ts#L3060) | target, patch | Array.isArray, Object.entries, patch.map, this.nwDeepMerge |
| [`NexoWattVis.nwInstallerManagedKeys`](../../../../src-ts/runtime-executables/main.ts#L3104) | – | – |
| [`NexoWattVis._nwIsPlainObject`](../../../../src-ts/runtime-executables/main.ts#L3155) | v | Array.isArray |
| [`NexoWattVis._nwDeepClone`](../../../../src-ts/runtime-executables/main.ts#L3164) | v | Array.isArray, this.nwDeepMerge |
| [`NexoWattVis._nwCountNonEmptyStrings`](../../../../src-ts/runtime-executables/main.ts#L3174) | obj | Object.values, v.trim |
| [`NexoWattVis._nwPatchScore`](../../../../src-ts/runtime-executables/main.ts#L3188) | patchObj | Array.isArray, this._nwCountNonEmptyStrings, this._nwIsPlainObject |
| [`NexoWattVis.nwNormalizeOperatingStrategies`](../../../../src-ts/runtime-executables/main.ts#L3223) | configIn, appEnabled | asArray, asRecord, asString, clampInt, defaultProfiles, linkIds.add, linkIds.has, links.push, makeIdsUnique, normalizeLink, normalizeSimulation, normalizedProfiles.map, profileIds.has, profilesRaw.map (weitere in der Quelle) |
| [`asRecord`](../../../../src-ts/runtime-executables/main.ts#L3225) | value | this._nwIsPlainObject |
| [`asArray`](../../../../src-ts/runtime-executables/main.ts#L3226) | value | Array.isArray |
| [`asString`](../../../../src-ts/runtime-executables/main.ts#L3227) | value, fallback | String |
| [`clampNumber`](../../../../src-ts/runtime-executables/main.ts#L3231) | value, fallback, min, max | Math.max, Math.min, Number, Number.isFinite |
| [`nullableNumber`](../../../../src-ts/runtime-executables/main.ts#L3236) | value, min, max | Math.max, Math.min, Number, Number.isFinite |
| [`clampInt`](../../../../src-ts/runtime-executables/main.ts#L3241) | value, fallback, min, max | Math.round, clampNumber |
| [`normalizeId`](../../../../src-ts/runtime-executables/main.ts#L3242) | value, fallback | asString |
| [`validTime`](../../../../src-ts/runtime-executables/main.ts#L3246) | value, fallback | asString |
| [`makeIdsUnique`](../../../../src-ts/runtime-executables/main.ts#L3247) | items, prefix | items.map |
| [`defaultNightReserve`](../../../../src-ts/runtime-executables/main.ts#L3262) | targetSocPct | – |
| [`defaultProfiles`](../../../../src-ts/runtime-executables/main.ts#L3272) | – | defaultNightReserve |
| [`normalizeMappings`](../../../../src-ts/runtime-executables/main.ts#L3289) | input | asRecord, asString |
| [`normalizeCustomResource`](../../../../src-ts/runtime-executables/main.ts#L3295) | input, index | asRecord, asString, clampInt, clampNumber, controlTypes.includes, failSafePolicies.includes, normalizeId, normalizeMappings, resourceTypes.includes |
| [`normalizeProfile`](../../../../src-ts/runtime-executables/main.ts#L3329) | input, index | Math.min, asRecord, asString, clampNumber, normalizeId, reserveModes.includes, seasons.includes, validTime |
| [`normalizeLink`](../../../../src-ts/runtime-executables/main.ts#L3356) | input | asRecord, asString, clampInt, normalizeMappings, roles.includes, sourceId.startsWith |
| [`normalizeSchedule`](../../../../src-ts/runtime-executables/main.ts#L3380) | input, ruleType | Array.from, asArray, asRecord, asString, clampInt, modes.includes, validTime, weekdays.slice |
| [`normalizeCondition`](../../../../src-ts/runtime-executables/main.ts#L3401) | input, index | String, allowedMetrics.includes, asRecord, asString, booleanMetrics.has, clampNumber, normalizeId, operators.includes, stringMetrics.has |
| [`normalizeRule`](../../../../src-ts/runtime-executables/main.ts#L3422) | input, index, profileIds | asArray, asRecord, asString, clampInt, clampNumber, makeIdsUnique, normalizeId, normalizeSchedule, profileIds.has, profileScopeRaw.replace, requirements.includes, ruleTypes.includes, sourcePolicies.includes, validTime |
| [`normalizeResourceState`](../../../../src-ts/runtime-executables/main.ts#L3475) | input | asRecord, asString, clampNumber, nullableNumber |
| [`normalizeSimulation`](../../../../src-ts/runtime-executables/main.ts#L3492) | input, activeProfileId, allowedProfileIds | Object.keys, allowedProfileIds.has, asRecord, asString, clampNumber, normalizeResourceState |
| [`NexoWattVis.nwNormalizeInstallerPatch`](../../../../src-ts/runtime-executables/main.ts#L3622) | patchIn, baseNative | Array.isArray, JSON.stringify, Math.max, Math.min, Math.round, Number, Number.isFinite, Object.assign, Object.entries, String, allowed.includes, defaultEnergyOriginConfig, ensurePlainObj, this._nwDeepClone (weitere in der Quelle) |
| [`ensurePlainObj`](../../../../src-ts/runtime-executables/main.ts#L3635) | key, defObj | this._nwDeepClone, this._nwIsPlainObject |
| [`NexoWattVis.nwApplyInstallerPatchToRuntimeConfig`](../../../../src-ts/runtime-executables/main.ts#L4094) | baseConfig, patch | Object.prototype.hasOwnProperty.call, this._nwDeepClone, this._nwIsPlainObject, this.nwApplyEmsAppsToLegacyFlags, this.nwDeepMerge, this.nwInstallerManagedKeys |
| [`NexoWattVis.nwNormalizeEmsApps`](../../../../src-ts/runtime-executables/main.ts#L4143) | nativeObj | this._nwApplyLicenseLimitsToEmsApps |
| [`NexoWattVis.nwApplyEmsAppsToLegacyFlags`](../../../../src-ts/runtime-executables/main.ts#L4261) | nativeObj | this._nwApplyLicenseLimitsToEmsApps, this._nwLicenseAllowsAppId, this.nwApplyStorageMultiUsePolicy, this.nwNormalizeEmsApps |
| [`NexoWattVis.nwApplyStorageMultiUsePolicy`](../../../../src-ts/runtime-executables/main.ts#L4356) | nativeObj | Array.isArray, String, clampNumber, this.log.warn |
| [`finiteOrNull`](../../../../src-ts/runtime-executables/main.ts#L4375) | value | Number, Number.isFinite |
| [`clampNumber`](../../../../src-ts/runtime-executables/main.ts#L4380) | value, min, max, fallback | Math.max, Math.min, finiteOrNull |
| [`NexoWattVis.loadInstallerConfigFromState`](../../../../src-ts/runtime-executables/main.ts#L4432) | – | Array.isArray, JSON.parse, JSON.stringify, raw.trim, this._nwDeepClone, this._nwPatchScore, this.getStateAsync, this.log.warn, this.nwApplyInstallerPatchToRuntimeConfig, this.nwNormalizeInstallerPatch, this.nwReadUserdataBackup, this.nwWriteUserdataBackup, this.persistInstallerConfigToState |
| [`NexoWattVis.persistInstallerConfigToState`](../../../../src-ts/runtime-executables/main.ts#L4530) | patchObj | JSON.stringify, this._meshCoordinator?.assertAppChange, this.log.warn, this.nwApplyInstallerPatchToRuntimeConfig, this.setStateAsync |
| [`NexoWattVis.nwEnsureUserdataBackupObjects`](../../../../src-ts/runtime-executables/main.ts#L4551) | – | ensureState, this.getForeignObjectAsync, this.setForeignObjectAsync |
| [`ensureState`](../../../../src-ts/runtime-executables/main.ts#L4573) | id, common | this.getForeignObjectAsync, this.setForeignObjectAsync |
| [`NexoWattVis.nwWriteUserdataBackup`](../../../../src-ts/runtime-executables/main.ts#L4626) | patchObj, reason | Date.now, JSON.parse, JSON.stringify, String, curRaw.trim, this._nwPatchScore, this.getForeignStateAsync, this.log.warn, this.nwEnsureUserdataBackupObjects, this.setForeignStateAsync |
| [`NexoWattVis.nwReadUserdataBackup`](../../../../src-ts/runtime-executables/main.ts#L4694) | – | JSON.parse, raw.trim, this._nwPatchScore, this.getForeignStateAsync |
| [`NexoWattVis.nwSimListInstances`](../../../../src-ts/runtime-executables/main.ts#L4731) | – | Object.entries, String, out.push, out.sort, this.getForeignObjectsAsync |
| [`NexoWattVis.nwSimPickDefaultInstance`](../../../../src-ts/runtime-executables/main.ts#L4762) | instances | Array.isArray, String, arr.find |
| [`NexoWattVis.nwSimSetInstanceEnabled`](../../../../src-ts/runtime-executables/main.ts#L4775) | simInstanceId, enabled | JSON.parse, JSON.stringify, String, this.getForeignObjectAsync, this.log.warn, this.setForeignObjectAsync |
| [`NexoWattVis.nwSimWaitAlive`](../../../../src-ts/runtime-executables/main.ts#L4804) | simInstanceId, timeoutMs | Date.now, String, this._nwSleep, this.getForeignStateAsync |
| [`NexoWattVis.nwSimReadBackupPatchFromState`](../../../../src-ts/runtime-executables/main.ts#L4825) | – | JSON.parse, raw.trim, this.getStateAsync |
| [`NexoWattVis.nwSimReadBackupSettingsFromState`](../../../../src-ts/runtime-executables/main.ts#L4844) | – | JSON.parse, raw.trim, this.getStateAsync |
| [`NexoWattVis.nwSimWriteStatus`](../../../../src-ts/runtime-executables/main.ts#L4863) | update | Date.now, String, this.setStateAsync |
| [`NexoWattVis.nwSimBuildPatch`](../../../../src-ts/runtime-executables/main.ts#L4882) | simInstanceId | Math.max, Math.min, Math.round, Number, Number.isFinite, String, cid.toUpperCase, evcsList.push, pad2, stType.val.trim, this.getForeignObjectAsync, this.getForeignStateAsync |
| [`pad2`](../../../../src-ts/runtime-executables/main.ts#L4914) | n | String |
| [`NexoWattVis.nwSimEnable`](../../../../src-ts/runtime-executables/main.ts#L5053) | simInstanceId, restartEmsFn | JSON.stringify, Math.max, Math.round, Number, Number.isFinite, String, raw.trim, restartEmsFn, this.ensureEvcsStates, this.ensureRfidStates, this.getForeignObjectAsync, this.getStateAsync, this.initEmsEngine, this.nwApplyEmsAppsToLegacyFlags (weitere in der Quelle) |
| [`NexoWattVis.nwSimDisable`](../../../../src-ts/runtime-executables/main.ts#L5166) | restartEmsFn | Object.keys, String, restartEmsFn, this.ensureEvcsStates, this.ensureRfidStates, this.initEmsEngine, this.nwApplyEmsAppsToLegacyFlags, this.nwApplyInstallerPatchToRuntimeConfig, this.nwDeepMerge, this.nwNormalizeInstallerPatch, this.nwSimReadBackupPatchFromState, this.nwSimReadBackupSettingsFromState, this.nwSimSetInstanceEnabled, this.nwSimWriteStatus (weitere in der Quelle) |
| [`NexoWattVis._nwNormalizeStorageDatapointsConfig`](../../../../src-ts/runtime-executables/main.ts#L5238) | storageIn, _globalDatapointsIn | nwNormalizeStorageDatapointsConfig |
| [`NexoWattVis._nwNormalizeStorageFarmRow`](../../../../src-ts/runtime-executables/main.ts#L5254) | row, index | Array.isArray, Math.max, Number, String, boolFrom, numberOrNull, nwIsLikelyDirectEssSetpointObjectId, nwIsLikelyFemsGridMeasurementObjectId, nwIsLikelyFemsGridTargetObjectId, textFrom |
| [`textFrom`](../../../../src-ts/runtime-executables/main.ts#L5262) | keys | String |
| [`numberOrNull`](../../../../src-ts/runtime-executables/main.ts#L5275) | keys | Number, Number.isFinite, String, raw.includes, raw.lastIndexOf, raw.replace |
| [`boolFrom`](../../../../src-ts/runtime-executables/main.ts#L5295) | fallback, keys | Object.prototype.hasOwnProperty.call, String |
| [`NexoWattVis._nwNormalizeStorageFarmRows`](../../../../src-ts/runtime-executables/main.ts#L5389) | rows | Array.isArray |
| [`NexoWattVis._nwStorageFarmRowHasRealDatapoint`](../../../../src-ts/runtime-executables/main.ts#L5400) | row | this._nwNormalizeStorageFarmRow |
| [`NexoWattVis._nwStorageFarmRowHasWritableDatapoint`](../../../../src-ts/runtime-executables/main.ts#L5415) | row | this._nwNormalizeStorageFarmRow |
| [`NexoWattVis._nwGetStorageFarmRuntimeInfo`](../../../../src-ts/runtime-executables/main.ts#L5428) | – | JSON.parse, configuredRows.filter, rows.filter, runtimeRows.filter, this._nwLicenseMaxStorages, this._nwNormalizeStorageFarmRows |
| [`NexoWattVis._nwGetStorageControlAuthority`](../../../../src-ts/runtime-executables/main.ts#L5521) | – | this._nwGetStorageFarmRuntimeInfo |
| [`NexoWattVis.ensureStorageFarmStates`](../../../../src-ts/runtime-executables/main.ts#L5606) | – | Object.entries, key.endsWith, this.setObjectNotExistsAsync |
| [`NexoWattVis.syncStorageFarmDefaultsToStates`](../../../../src-ts/runtime-executables/main.ts#L5677) | – | Object.entries, this.getStateAsync, this.setStateAsync |
| [`NexoWattVis.syncStorageFarmConfigFromAdmin`](../../../../src-ts/runtime-executables/main.ts#L5738) | – | Array.isArray, Date.now, JSON.stringify, String, this._nwGetStorageFarmRuntimeInfo, this._nwNormalizeStorageFarmRows, this.getStateAsync, this.log.debug, this.setStateAsync, this.updateValue |
| [`NexoWattVis.updateStorageFarmDerived`](../../../../src-ts/runtime-executables/main.ts#L5816) | reason | Array.from, Date.now, JSON.stringify, Math.abs, Math.floor, Math.max, Math.round, Number, Number.isFinite, String, addBases, baseBlocked.push, baseBlocked.slice, candidates.push (weitere in der Quelle) |
| [`getState`](../../../../src-ts/runtime-executables/main.ts#L5852) | id | String, _stCache.get, _stCache.has, _stCache.set, this.getForeignStateAsync |
| [`toBool`](../../../../src-ts/runtime-executables/main.ts#L5866) | v | String |
| [`inferDeviceBases`](../../../../src-ts/runtime-executables/main.ts#L5885) | id | String, aliasBase.replace, sid.match |
| [`parseNum`](../../../../src-ts/runtime-executables/main.ts#L5913) | val | Number.isFinite, num.includes, num.lastIndexOf, num.replace, num.split, parseFloat, parts.join, parts.pop, s.match, val.trim |
| [`getUnit`](../../../../src-ts/runtime-executables/main.ts#L5968) | id | String, _unitCache.get, _unitCache.has, _unitCache.set, this.getForeignObjectAsync |
| [`scalePowerToW`](../../../../src-ts/runtime-executables/main.ts#L5989) | n, unit | Number.isFinite, String, u.toLowerCase, ul.endsWith, ul.includes, ul.startsWith |
| [`readNumber`](../../../../src-ts/runtime-executables/main.ts#L6010) | id, kind, opts | Number.isFinite, String, getState, getUnit, parseNum, scalePowerToW, sl.endsWith, sl.includes, ul.includes |
| [`isMappedSetpointPowerId`](../../../../src-ts/runtime-executables/main.ts#L6183) | id | String, targetPowerIds.includes |
| [`addBases`](../../../../src-ts/runtime-executables/main.ts#L6252) | id | devBases.includes, devBases.push, inferDeviceBases |
| [`pickFirstState`](../../../../src-ts/runtime-executables/main.ts#L6281) | candidates | getState |
| [`considerTs`](../../../../src-ts/runtime-executables/main.ts#L6334) | st | Math.max, Number.isFinite |
| [`readBoolDp`](../../../../src-ts/runtime-executables/main.ts#L6402) | id | Number.isFinite, String, getState, toBool |
| [`normalizeLimitW`](../../../../src-ts/runtime-executables/main.ts#L6418) | v | Math.round, Number, Number.isFinite, String, v.trim |
| [`readLimitW`](../../../../src-ts/runtime-executables/main.ts#L6434) | staticValue | normalizeLimitW |
| [`NexoWattVis._sfGetNormalizedFarmConfig`](../../../../src-ts/runtime-executables/main.ts#L6853) | – | Array.isArray, String, this._nwGetStorageFarmRuntimeInfo, this._nwLicenseMaxStorages, this._nwNormalizeStorageFarmRows |
| [`NexoWattVis._sfGetStorageDispatchKey`](../../../../src-ts/runtime-executables/main.ts#L6896) | storage, index | Math.max, Number, String |
| [`NexoWattVis._sfGetDischargeFloorSocPct`](../../../../src-ts/runtime-executables/main.ts#L6929) | source | Math.max, Math.min, Number, String, resolveStorageOperatingPolicy, this._nwGetStorageControlAuthority |
| [`NexoWattVis._sfGetResponseLimitFactor`](../../../../src-ts/runtime-executables/main.ts#L6976) | storage, direction, now | Date.now, Math.max, Math.round, Number, Number.isFinite, this._sfDispatchState.get, this._sfDispatchState.set, this._sfGetStorageDispatchKey |
| [`NexoWattVis._sfRememberDispatchSnapshot`](../../../../src-ts/runtime-executables/main.ts#L7020) | storage, direction, requestW | Date.now, Math.round, Number, Number.isFinite, String, this._sfDispatchState.get, this._sfDispatchState.set, this._sfGetStorageDispatchKey |
| [`NexoWattVis._sfReadbackNumber`](../../../../src-ts/runtime-executables/main.ts#L7045) | objectId, expectedValue, options | Math.abs, Math.max, Math.min, Number, Number.isFinite, Object.prototype.hasOwnProperty.call, String, this.getForeignStateAsync |
| [`NexoWattVis._sfWriteIfChanged`](../../../../src-ts/runtime-executables/main.ts#L7103) | objectId, value, options | Date.now, Math.max, Math.min, Number, Number.isFinite, String, isActuatorAuthorityBlockedResult, this._sfLastSetpoints.delete, this._sfLastSetpoints.get, this._sfLastSetpoints.set, this._sfLastSetpointsTs.delete, this._sfLastSetpointsTs.get, this._sfLastSetpointsTs.set, this._sfReadbackNumber (weitere in der Quelle) |
| [`NexoWattVis.applyStorageFarmTargetW`](../../../../src-ts/runtime-executables/main.ts#L7193) | targetW, meta | Array.from, Array.isArray, Date.now, JSON.stringify, Math.abs, Math.max, Math.min, Math.round, Number, Number.isFinite, String, activeGroups.map, allocMap.get, allocMap.set (weitere in der Quelle) |
| [`readFarmStatus`](../../../../src-ts/runtime-executables/main.ts#L7211) | – | Array.isArray, JSON.parse, this.getStateAsync |
| [`finiteLimitOrNull`](../../../../src-ts/runtime-executables/main.ts#L7251) | v | Math.round, Number, Number.isFinite, String, v.trim |
| [`parseStrictNumber`](../../../../src-ts/runtime-executables/main.ts#L7401) | raw | Number, Number.isFinite, raw.trim, textValue.includes, textValue.lastIndexOf, textValue.replace |
| [`readNumber`](../../../../src-ts/runtime-executables/main.ts#L7419) | objectId | String, parseStrictNumber, this.getForeignObjectAsync, this.getForeignStateAsync |
| [`readLocalNumber`](../../../../src-ts/runtime-executables/main.ts#L7438) | ids | parseStrictNumber, this.getStateAsync |
| [`getLimitW`](../../../../src-ts/runtime-executables/main.ts#L7704) | storage, dir | Math.round, Number, Number.isFinite, String, raw.trim |
| [`sumLimitW`](../../../../src-ts/runtime-executables/main.ts#L7720) | items, dir | Math.max, Number.isFinite, getLimitW |
| [`buildWeights`](../../../../src-ts/runtime-executables/main.ts#L7736) | items, dir | Math.max, Math.min, Number.isFinite, list.map |
| [`normalizeWeights`](../../../../src-ts/runtime-executables/main.ts#L7787) | list, weights, dir | Array.isArray, out.reduce, weights.slice |
| [`allocateWeightedCapped`](../../../../src-ts/runtime-executables/main.ts#L7820) | total, items, dir | Math.floor, Math.max, Math.min, Math.round, Number, Number.isFinite, active.filter, active.reduce, allocMap.set, buildWeights, list.map, normalizeWeights, order.push, order.sort (weitere in der Quelle) |
| [`canUse`](../../../../src-ts/runtime-executables/main.ts#L7900) | s | – |
| [`releaseOnce`](../../../../src-ts/runtime-executables/main.ts#L8043) | key, id | String, r.ignoredAlternatives.push, releaseRows.push, releaseRows.some, selectedIds.has, this._sfWriteIfChanged |
| [`writeSelected`](../../../../src-ts/runtime-executables/main.ts#L8060) | key, id, value | String, selectedWrites.push, this._sfWriteIfChanged |
| [`NexoWattVis.syncInstallerConfigToStates`](../../../../src-ts/runtime-executables/main.ts#L8291) | – | Number, Object.entries, this.setStateAsync |
| [`NexoWattVis.syncSettingsToStates`](../../../../src-ts/runtime-executables/main.ts#L8317) | – | Object.entries, getBool, this.setStateAsync |
| [`getBool`](../../../../src-ts/runtime-executables/main.ts#L8326) | key, def | – |
| [`NexoWattVis.syncSettingsConfigToStates`](../../../../src-ts/runtime-executables/main.ts#L8353) | – | Array.from, Array.isArray, Date.now, Math.max, Math.min, Math.round, Number, Number.isFinite, Number.isSafeInteger, String, boostRaw.trim, controlPreferenceRaw.toLowerCase, evcsList.push, g.name.trim (weitere in der Quelle) |
| [`canUseEvcsControlDp`](../../../../src-ts/runtime-executables/main.ts#L8377) | id | String, this.getForeignObjectAsync, this.getForeignStateAsync |
| [`canUseEvcsReadDp`](../../../../src-ts/runtime-executables/main.ts#L8398) | id | String, this.getForeignObjectAsync, this.getForeignStateAsync |
| [`NexoWattVis._nwEvcsInputSpecsForWallbox`](../../../../src-ts/runtime-executables/main.ts#L8631) | wb | Math.max, Math.round, Number |
| [`NexoWattVis._nwExtractAliasReadId`](../../../../src-ts/runtime-executables/main.ts#L8659) | obj | alias.trim, raw.trim |
| [`NexoWattVis._nwBuildEvcsInputBindings`](../../../../src-ts/runtime-executables/main.ts#L8676) | – | Array.isArray, addBinding, sourceIds.push, this._nwEvcsAliasRefreshPending.clear, this._nwEvcsInputSpecsForWallbox, this._nwEvcsMirrorStampByKey.clear, this._nwExtractAliasReadId, this.getForeignObjectAsync, visited.add, visited.has |
| [`addBinding`](../../../../src-ts/runtime-executables/main.ts#L8681) | map, id, binding | id.trim, list.push, list.some, map.get, map.set |
| [`NexoWattVis._nwIsReadOnlyEvcsMirrorKey`](../../../../src-ts/runtime-executables/main.ts#L8748) | key | String |
| [`NexoWattVis._nwEvcsMirrorValue`](../../../../src-ts/runtime-executables/main.ts#L8752) | binding, value | String |
| [`NexoWattVis._nwPublishEvcsInputBinding`](../../../../src-ts/runtime-executables/main.ts#L8763) | binding, state, sourceId, reason | Date.now, JSON.stringify, Number.isFinite, Object.is, String, binding.key.startsWith, this._nwEvcsMirrorStampByKey.get, this._nwEvcsMirrorStampByKey.set, this._nwEvcsMirrorValue, this._nwScaleMappedValue, this.log.debug, this.setStateAsync, this.updateValue |
| [`NexoWattVis._nwReadAndApplyEvcsConfiguredId`](../../../../src-ts/runtime-executables/main.ts#L8800) | configuredId, reason | Array.isArray, configuredId.trim, this._nwEvcsInputBindingsByConfiguredId.get, this._nwPublishEvcsInputBinding, this.getForeignStateAsync |
| [`NexoWattVis._nwScheduleEvcsAliasRefresh`](../../../../src-ts/runtime-executables/main.ts#L8815) | configuredId, reason | Promise.resolve, configuredId.trim, this._nwEvcsAliasRefreshPending.delete, this._nwEvcsAliasRefreshPending.get, this._nwEvcsAliasRefreshPending.has, this._nwEvcsAliasRefreshPending.keys, this._nwEvcsAliasRefreshPending.set |
| [`NexoWattVis._nwApplyEvcsInputSourceState`](../../../../src-ts/runtime-executables/main.ts#L8836) | id, state, reason | Array.isArray, handledKeys.add, id.trim, this._nwEvcsInputBindingsBySourceId.get, this._nwPublishEvcsInputBinding, this._nwScheduleEvcsAliasRefresh |
| [`NexoWattVis.ensureEvcsStates`](../../../../src-ts/runtime-executables/main.ts#L8860) | – | Array.isArray, Math.max, Math.round, Number, Object.entries, this.extendObjectAsync, this.log.debug, this.setObjectNotExistsAsync, this.setStateAsync |
| [`NexoWattVis.ensureRfidStates`](../../../../src-ts/runtime-executables/main.ts#L8961) | – | Date.now, Object.entries, this.getStateAsync, this.setObjectNotExistsAsync, this.setStateAsync, this.updateValue |
| [`NexoWattVis.ensureEvcsSessionsStates`](../../../../src-ts/runtime-executables/main.ts#L9066) | – | this.setObjectNotExistsAsync |
| [`NexoWattVis.loadEvcsSessionsCache`](../../../../src-ts/runtime-executables/main.ts#L9121) | – | Array.isArray, Date.now, JSON.parse, JSON.stringify, Number, arr.slice, st.val.trim, this.getStateAsync, this.log.warn, this.setLocalStateWithCache |
| [`NexoWattVis.persistEvcsSessions`](../../../../src-ts/runtime-executables/main.ts#L9156) | nowTs | Date.now, JSON.stringify, Number, this.log.warn, this.setLocalStateWithCache |
| [`NexoWattVis.appendEvcsSession`](../../../../src-ts/runtime-executables/main.ts#L9173) | entry, nowTs | Date.now, Number, this._evcsSessionsBuf.push, this._evcsSessionsBuf.splice, this.log.warn, this.persistEvcsSessions |
| [`NexoWattVis.maybeUpdateEvcsSessionTracker`](../../../../src-ts/runtime-executables/main.ts#L9194) | key, tsMs | Date.now, Math.abs, Number, Number.isFinite, key.match, this._startEvcsSession, this._stopEvcsSession, this._updateEvcsSession |
| [`NexoWattVis._startEvcsSession`](../../../../src-ts/runtime-executables/main.ts#L9237) | idx, tsMs, pW, energyTotalKwh | Date.now, Number, Number.isFinite, String, this.normalizeRfidCode |
| [`NexoWattVis._updateEvcsSession`](../../../../src-ts/runtime-executables/main.ts#L9276) | idx, tsMs, pW, energyTotalKwh | Date.now, Math.abs, Math.max, Number, Number.isFinite, String, this.normalizeRfidCode |
| [`NexoWattVis._stopEvcsSession`](../../../../src-ts/runtime-executables/main.ts#L9319) | idx, tsMs, pW, energyTotalKwh | Date.now, Math.max, Math.round, Number, Number.isFinite, this.appendEvcsSession, this.log.warn |
| [`NexoWattVis.seedEvcsDayBaseCache`](../../../../src-ts/runtime-executables/main.ts#L9377) | – | Date.now, Math.max, Math.round, Number, String, this.getStateAsync, this.log.debug |
| [`NexoWattVis.subscribeEvcsMappedStates`](../../../../src-ts/runtime-executables/main.ts#L9398) | – | Array.from, Array.isArray, this._nwBuildEvcsInputBindings, this._nwEvcsInputBindingsByConfiguredId.keys, this._nwEvcsInputBindingsBySourceId.keys, this._nwPrimeForeignPowerScale, this._nwReadAndApplyEvcsConfiguredId, this.log.debug, this.subscribeForeignStatesAsync |
| [`NexoWattVis.subscribeEmsUiStates`](../../../../src-ts/runtime-executables/main.ts#L9443) | – | Array.isArray, Math.round, Number, Number.isFinite, g.stationKey.trim, prime, this.subscribeForeignStatesAsync, toSafe |
| [`prime`](../../../../src-ts/runtime-executables/main.ts#L9462) | key | Date.now, this.getStateAsync, this.updateValue |
| [`toSafe`](../../../../src-ts/runtime-executables/main.ts#L9543) | s | String |
| [`NexoWattVis.getSmartHomeConfig`](../../../../src-ts/runtime-executables/main.ts#L9601) | – | Array.isArray, String, ids.map, ids.push, nwNormalizeSmartHomeConfigContract, seen.add, seen.has, this._nwIsPlainObject |
| [`pretty`](../../../../src-ts/runtime-executables/main.ts#L9629) | s | String |
| [`NexoWattVis.nwNormalizeSmartHomeConfig`](../../../../src-ts/runtime-executables/main.ts#L9655) | config | nwNormalizeSmartHomeConfigContract |
| [`NexoWattVis.nwValidateSmartHomeConfig`](../../../../src-ts/runtime-executables/main.ts#L9659) | config | nwValidateSmartHomeConfigContract |
| [`NexoWattVis.getLogicEditorConfig`](../../../../src-ts/runtime-executables/main.ts#L9667) | – | Array.isArray |
| [`NexoWattVis.nwNormalizeLogicEditorConfig`](../../../../src-ts/runtime-executables/main.ts#L9682) | inCfg | Array.isArray, Date.now, Number.isFinite, Object.entries, clamp, graph.links.push, graph.nodes.push, isPlain, mkId, out.graphs.push, safeStr, toNum |
| [`isPlain`](../../../../src-ts/runtime-executables/main.ts#L9689) | o | this._nwIsPlainObject |
| [`safeStr`](../../../../src-ts/runtime-executables/main.ts#L9696) | s, maxLen | String, str.slice |
| [`mkId`](../../../../src-ts/runtime-executables/main.ts#L9709) | prefix | Date.now, Math.random |
| [`clamp`](../../../../src-ts/runtime-executables/main.ts#L9724) | v, lo, hi | Math.max, Math.min |
| [`toNum`](../../../../src-ts/runtime-executables/main.ts#L9731) | v, def | Number, Number.isFinite |
| [`NexoWattVis.nwValidateLogicEditorConfig`](../../../../src-ts/runtime-executables/main.ts#L9810) | config | validateNexoLogicConfig |
| [`NexoWattVis.buildSmartHomeDevicesFromConfig`](../../../../src-ts/runtime-executables/main.ts#L9820) | – | Array.isArray, Object.prototype.hasOwnProperty.call, String, cfgDevices.forEach, devices.push, devices.some, pushBlind, pushDimmer, pushRtr, pushScene, pushSensor, pushSwitch, resolveFloorName, resolveFunctionName (weitere in der Quelle) |
| [`resolveRoomName`](../../../../src-ts/runtime-executables/main.ts#L9845) | roomId | rooms.find |
| [`resolveRoomFloorId`](../../../../src-ts/runtime-executables/main.ts#L9856) | roomId | String, rooms.find |
| [`resolveFloorName`](../../../../src-ts/runtime-executables/main.ts#L9867) | floorId | String, floors.find |
| [`resolveFunctionName`](../../../../src-ts/runtime-executables/main.ts#L9878) | fnId | funcs.find |
| [`pushSwitch`](../../../../src-ts/runtime-executables/main.ts#L10126) | id, opts | devices.push |
| [`pushDimmer`](../../../../src-ts/runtime-executables/main.ts#L10163) | id, opts | devices.push |
| [`pushBlind`](../../../../src-ts/runtime-executables/main.ts#L10202) | positionId, upId, downId, stopId, opts | devices.push |
| [`pushRtr`](../../../../src-ts/runtime-executables/main.ts#L10251) | currentId, setpointId, modeId, humidityId, opts | devices.push |
| [`pushSensor`](../../../../src-ts/runtime-executables/main.ts#L10292) | id, opts | devices.push |
| [`pushScene`](../../../../src-ts/runtime-executables/main.ts#L10328) | id, opts | devices.push |
| [`NexoWattVis.getSmartHomeDevicesWithState`](../../../../src-ts/runtime-executables/main.ts#L10549) | – | Array.isArray, JSON.parse, JSON.stringify, Math.max, Math.min, Number, Object.create, String, qualityRows.filter, qualityRows.find, readField, result.push, this.buildSmartHomeDevicesFromConfig, this.getForeignObjectAsync (weitere in der Quelle) |
| [`toNumberStrict`](../../../../src-ts/runtime-executables/main.ts#L10564) | value | Number, Number.isFinite, value.trim |
| [`toBooleanStrict`](../../../../src-ts/runtime-executables/main.ts#L10575) | value | Number.isFinite, value.trim |
| [`toStringStrict`](../../../../src-ts/runtime-executables/main.ts#L10589) | value | String |
| [`colorToHex`](../../../../src-ts/runtime-executables/main.ts#L10595) | value, format | Math.max, Math.min, Math.round, Number, Number.isFinite, String, hex2, text.match, text.slice, text.startsWith |
| [`clamp`](../../../../src-ts/runtime-executables/main.ts#L10597) | v | Math.max, Math.min, Math.round, Number |
| [`hex2`](../../../../src-ts/runtime-executables/main.ts#L10598) | v | clamp |
| [`readField`](../../../../src-ts/runtime-executables/main.ts#L10632) | field, id, parser | Date.now, Math.max, Number, Number.isFinite, Object.prototype.hasOwnProperty.call, String, parser, qualityRows.push, this.getForeignStateAsync |
| [`NexoWattVis.migrateNativeConfig`](../../../../src-ts/runtime-executables/main.ts#L10830) | – | ensureObject, setBoolean, setNumber, this.log.info, this.log.warn |
| [`ensureObject`](../../../../src-ts/runtime-executables/main.ts#L10853) | key | Array.isArray |
| [`setNumber`](../../../../src-ts/runtime-executables/main.ts#L10866) | path, def | Array.isArray, Number, Number.isFinite, String |
| [`setBoolean`](../../../../src-ts/runtime-executables/main.ts#L10906) | path, def | Array.isArray, String |
| [`NexoWattVis.cleanupOrphanedObjects`](../../../../src-ts/runtime-executables/main.ts#L10990) | – | Array.isArray, Number, Number.isFinite, String, delRec, fullId.slice, fullId.startsWith, keep.add, keep.has, short.split, this._nwGetFlowSlotInfo, this.getObjectViewAsync, this.log.debug, toSafeIdPart |
| [`toSafeIdPart`](../../../../src-ts/runtime-executables/main.ts#L10999) | input | String, s.toLowerCase |
| [`delRec`](../../../../src-ts/runtime-executables/main.ts#L11012) | id | this.delObjectAsync |
| [`NexoWattVis.onReady`](../../../../src-ts/runtime-executables/main.ts#L11098) | – | Math.max, Math.min, Math.round, Number, Number.isFinite, Object.keys, eosIntegrated.installPreviewWriteBoundary, require, startOpenMeteoPvForecastRuntime, this._adminOverviewPublisher.initialize, this._adminOverviewPublisher?.stop, this._meshCoordinator.init, this._meshCoordinator.migrateAppLifecycle, this._nwClearInterval (weitere in der Quelle) |
| [`NexoWattVis.initLogicEngine`](../../../../src-ts/runtime-executables/main.ts#L11310) | force | this.getLogicEditorConfig, this.logicEngine.init, this.logicEngine.stop |
| [`NexoWattVis.initEmsEngine`](../../../../src-ts/runtime-executables/main.ts#L11337) | force | String, this._meshCoordinator?.syncAppLifecycle, this.emsEngine.init, this.emsEngine.stop |
| [`NexoWattVis.initLogicEngine`](../../../../src-ts/runtime-executables/main.ts#L11378) | force, configOverride | candidate.init, candidate.stop, previous.stop, this.getLogicEditorConfig, this.logicEngine.init, validateNexoLogicConfig, validation.errors.map |
| [`NexoWattVis.replaceLogicEngine`](../../../../src-ts/runtime-executables/main.ts#L11407) | nextConfig, rollbackConfig | candidate.init, candidate.stop, previousEngine.stop, rollback.init, rollback.stop |
| [`NexoWattVis.subscribeEmsUiStates`](../../../../src-ts/runtime-executables/main.ts#L11447) | – | Math.round, Number, Number.isFinite, primeKey, this.subscribeForeignStatesAsync |
| [`primeKey`](../../../../src-ts/runtime-executables/main.ts#L11469) | key | Date.now, this.getStateAsync, this.updateValue |
| [`NexoWattVis.startServer`](../../../../src-ts/runtime-executables/main.ts#L11618) | – | Math.max, Math.min, Number, Number.isFinite, Object.freeze, app.disable, app.get, app.options, app.post, app.use, eosIntegrated.createAccountPasswordWriter, eosIntegrated.listenerConfiguration, eosIntegrated.loadUiTlsOptions, express (weitere in der Quelle) |
| [`nwNormalizeRemoteIp`](../../../../src-ts/runtime-executables/main.ts#L11671) | raw | String, ip.indexOf, ip.slice, ip.startsWith |
| [`nwRequestRemoteIp`](../../../../src-ts/runtime-executables/main.ts#L11682) | req | nwNormalizeRemoteIp |
| [`nwIsTrustedLanIp`](../../../../src-ts/runtime-executables/main.ts#L11695) | raw | Number, nwNormalizeRemoteIp |
| [`nwRequestOriginAllowed`](../../../../src-ts/runtime-executables/main.ts#L11709) | req | Array.isArray, String, allowed.map, hostName.toLowerCase, hostRaw.indexOf, hostRaw.slice, hostRaw.split, hostRaw.startsWith, origin.hostname.toLowerCase, originRaw.replace |
| [`nwMaskEmail`](../../../../src-ts/runtime-executables/main.ts#L11750) | raw | String, local.slice, value.lastIndexOf, value.slice |
| [`nwPublicStateKeyBlocked`](../../../../src-ts/runtime-executables/main.ts#L11760) | rawKey | String, key.toLowerCase, lower.startsWith |
| [`nwRedactPublicValue`](../../../../src-ts/runtime-executables/main.ts#L11779) | value, depth | Array.isArray, JSON.parse, JSON.stringify, Object.entries, String, nwRedactPublicValue, text.endsWith, text.startsWith, value.map, value.trim |
| [`nwBuildPublicStateSnapshot`](../../../../src-ts/runtime-executables/main.ts#L11800) | source, includeDerived | Date.now, Object.assign, Object.entries, Object.prototype.hasOwnProperty.call, String, nwMaskEmail, nwPublicStateKeyBlocked, nwRedactPublicValue, stateValue |
| [`stateValue`](../../../../src-ts/runtime-executables/main.ts#L11813) | key | Object.prototype.hasOwnProperty.call |
| [`nwSanitizePublicConfig`](../../../../src-ts/runtime-executables/main.ts#L11829) | payload, installerAccess | Array.isArray, Object.assign, Object.entries, Object.fromEntries, String, nwMaskEmail, nwRedactPublicValue, rows.map |
| [`sendLicenseCors`](../../../../src-ts/runtime-executables/main.ts#L11893) | req, res | String, originUrl.hostname.toLowerCase, res.setHeader |
| [`sendNoStore`](../../../../src-ts/runtime-executables/main.ts#L11921) | res | res.setHeader |
| [`esc`](../../../../src-ts/runtime-executables/main.ts#L12009) | s | String |
| [`nwLoginRateStatus`](../../../../src-ts/runtime-executables/main.ts#L12215) | req | Date.now, Math.ceil, Math.max, nwLoginAttempts.delete, nwLoginAttempts.get, nwRequestRemoteIp |
| [`nwLoginRecordFailure`](../../../../src-ts/runtime-executables/main.ts#L12227) | key | Date.now, Number, nwLoginAttempts.get, nwLoginAttempts.set |
| [`nwLoginRecordSuccess`](../../../../src-ts/runtime-executables/main.ts#L12238) | key | nwLoginAttempts.delete |
| [`_nwList`](../../../../src-ts/runtime-executables/main.ts#L12244) | value | Array.isArray, String, value.map |
| [`_nwUnique`](../../../../src-ts/runtime-executables/main.ts#L12248) | items | Array.from |
| [`closeSessionStreams`](../../../../src-ts/runtime-executables/main.ts#L12274) | token | parseCookies, this._nwSseGuard.close |
| [`pruneSessions`](../../../../src-ts/runtime-executables/main.ts#L12287) | – | Date.now, this._authSessions.delete, this._authSessions.entries |
| [`getStoredSession`](../../../../src-ts/runtime-executables/main.ts#L12303) | req | Date.now, Object.assign, computeRoleInfo, eosIntegrated.accountRevision, eosIntegrated.passwordChangeRequired, parseCookies, pruneSessions, readAccountRevision, roleRevision, this._authSessions.delete, this._authSessions.get, this.getForeignObjectAsync |
| [`getSession`](../../../../src-ts/runtime-executables/main.ts#L12329) | req | getStoredSession |
| [`setSessionCookie`](../../../../src-ts/runtime-executables/main.ts#L12331) | res, token, ttlMs, req | Math.floor, Math.max, encodeURIComponent, res.setHeader |
| [`clearSessionCookie`](../../../../src-ts/runtime-executables/main.ts#L12340) | res | res.setHeader |
| [`checkPasswordAsync`](../../../../src-ts/runtime-executables/main.ts#L12347) | user, pass | eosIntegrated.withAccountKdfBudget |
| [`readAccountRevision`](../../../../src-ts/runtime-executables/main.ts#L12359) | user | eosIntegrated.accountRevision, this.getForeignObjectAsync |
| [`roleRevision`](../../../../src-ts/runtime-executables/main.ts#L12366) | info | JSON.stringify |
| [`isUserInGroup`](../../../../src-ts/runtime-executables/main.ts#L12368) | user, groupId | Array.isArray, String, members.includes, this.getForeignObjectAsync |
| [`getUserGroups`](../../../../src-ts/runtime-executables/main.ts#L12377) | user | _nwUnique, groups.push, isUserInGroup |
| [`computeRoleInfo`](../../../../src-ts/runtime-executables/main.ts#L12386) | user | String, getUserGroups, groups.some |
| [`computeIsInstaller`](../../../../src-ts/runtime-executables/main.ts#L12407) | user | computeRoleInfo |
| [`hasCapability`](../../../../src-ts/runtime-executables/main.ts#L12412) | sessionOrInfo, cap | Array.isArray, String, cap.some, caps.includes |
| [`resolveTrustedHeaderAccess`](../../../../src-ts/runtime-executables/main.ts#L12429) | _req | – |
| [`resolveAccess`](../../../../src-ts/runtime-executables/main.ts#L12431) | req | getSession, resolveTrustedHeaderAccess |
| [`resolveStrictAccess`](../../../../src-ts/runtime-executables/main.ts#L12444) | req | getStoredSession, resolveTrustedHeaderAccess |
| [`sendForbidden`](../../../../src-ts/runtime-executables/main.ts#L12451) | res, message | res.status |
| [`requireCapability`](../../../../src-ts/runtime-executables/main.ts#L12454) | cap | – |
| [`requireAuth`](../../../../src-ts/runtime-executables/main.ts#L12462) | req, _res, next | _res.status, hasCapability, next, resolveStrictAccess, sendForbidden |
| [`renderRuntimeAccessPage`](../../../../src-ts/runtime-executables/main.ts#L12503) | title, capability, requiredRole | String |
| [`requirePageAccessOrRenderLock`](../../../../src-ts/runtime-executables/main.ts#L12519) | req, res, cap, title, requiredRole | hasCapability, renderRuntimeAccessPage, res.status, resolveStrictAccess, sendNoStore |
| [`requireMeshInstalled`](../../../../src-ts/runtime-executables/main.ts#L12535) | _req, res, next | next, res.status, sendNoStore, this._meshCoordinator?.appState |
| [`beginMeshAppSave`](../../../../src-ts/runtime-executables/main.ts#L12561) | – | – |
| [`endMeshAppSave`](../../../../src-ts/runtime-executables/main.ts#L12565) | token | – |
| [`readLoginCredentials`](../../../../src-ts/runtime-executables/main.ts#L12704) | body | Buffer.byteLength, user.trim |
| [`authenticateAccount`](../../../../src-ts/runtime-executables/main.ts#L12718) | user, password | checkPasswordAsync, computeRoleInfo, eosIntegrated.passwordChangeRequired, readAccountRevision, roleRevision, this.getForeignObjectAsync |
| [`doAuthLogin`](../../../../src-ts/runtime-executables/main.ts#L12730) | req, res | Date.now, Math.ceil, Math.max, Number, Object.assign, String, authenticateAccount, createToken, nwLoginRateStatus, nwLoginRecordFailure, nwLoginRecordSuccess, readLoginCredentials, res.json, res.setHeader (weitere in der Quelle) |
| [`doStrictAuthLogin`](../../../../src-ts/runtime-executables/main.ts#L12769) | req, res | Date.now, Math.ceil, Math.max, Number, Object.assign, String, authenticateAccount, createToken, nwLoginRateStatus, nwLoginRecordFailure, nwLoginRecordSuccess, readLoginCredentials, res.json, res.setHeader (weitere in der Quelle) |
| [`parseBool`](../../../../src-ts/runtime-executables/main.ts#L12932) | value | Number.isFinite, value.trim |
| [`writePulse`](../../../../src-ts/runtime-executables/main.ts#L12942) | dpId, pulseMs | this._nwPulseSmartHomeSceneDatapoint |
| [`parseSafetyBool`](../../../../src-ts/runtime-executables/main.ts#L13064) | raw | Number.isFinite, raw.trim |
| [`parseBool`](../../../../src-ts/runtime-executables/main.ts#L13219) | raw | raw.trim |
| [`pulse`](../../../../src-ts/runtime-executables/main.ts#L13301) | dpId | Math.max, Math.min, Number, setTimeout, this.setForeignStateAsync, timer.unref |
| [`parseBool`](../../../../src-ts/runtime-executables/main.ts#L13309) | raw | Number.isFinite, raw.trim |
| [`toggleBooleanDp`](../../../../src-ts/runtime-executables/main.ts#L13319) | readId, writeId, explicit | parseBool, this.getForeignStateAsync, this.setForeignStateAsync |
| [`checkSmartHomeClimateSafety`](../../../../src-ts/runtime-executables/main.ts#L13434) | dev | Math.max, Number, readSignal |
| [`parseBool`](../../../../src-ts/runtime-executables/main.ts#L13437) | raw | Number.isFinite, raw.trim |
| [`readSignal`](../../../../src-ts/runtime-executables/main.ts#L13447) | dpId, kind | Date.now, Number, Number.isFinite, parseBool, this.getForeignStateAsync |
| [`nwShcfgTdIsPlainObject`](../../../../src-ts/runtime-executables/main.ts#L13803) | value | Array.isArray |
| [`nwShcfgTdNormName`](../../../../src-ts/runtime-executables/main.ts#L13810) | value | Object.values, direct.trim, first.trim, value.trim |
| [`nwShcfgTdParentId`](../../../../src-ts/runtime-executables/main.ts#L13828) | id | String, parts.join, parts.pop |
| [`nwShcfgTdHash`](../../../../src-ts/runtime-executables/main.ts#L13840) | value | String, crypto.createHash |
| [`nwShcfgTdStateEntry`](../../../../src-ts/runtime-executables/main.ts#L13847) | objects, state, keyOverride | String, id.split, nwShcfgTdNormName |
| [`nwShcfgTdFindState`](../../../../src-ts/runtime-executables/main.ts#L13870) | control, names, predicate | Array.isArray, list.find |
| [`nwShcfgTdCollectConfiguredDpIds`](../../../../src-ts/runtime-executables/main.ts#L13892) | cfg | Array.isArray, devices.forEach |
| [`visit`](../../../../src-ts/runtime-executables/main.ts#L13900) | value, keyName | Array.isArray, Object.entries, String, nwShcfgTdIsPlainObject, out.add, value.forEach, value.trim |
| [`nwShcfgTdGetObjectsCache`](../../../../src-ts/runtime-executables/main.ts#L13925) | force | Date.now, Object.keys, this.getForeignObjectsAsync |
| [`nwShcfgTdCollectCandidateRoots`](../../../../src-ts/runtime-executables/main.ts#L13942) | objects | Object.keys, out.sort |
| [`skip`](../../../../src-ts/runtime-executables/main.ts#L13951) | id | String, sid.startsWith |
| [`nwShcfgTdBestSourceId`](../../../../src-ts/runtime-executables/main.ts#L13986) | objects, rootId, control | Array.isArray, String, nwShcfgTdParentId |
| [`nwShcfgTdSuggestionScore`](../../../../src-ts/runtime-executables/main.ts#L14009) | item | Number |
| [`nwShcfgTdMergeSuggestion`](../../../../src-ts/runtime-executables/main.ts#L14021) | current, next | Array.from, Array.isArray, nwShcfgTdSuggestionScore, other.configuredOverlap.forEach, other.notes.forEach |
| [`nwShcfgTdBuildSuggestion`](../../../../src-ts/runtime-executables/main.ts#L14045) | { control, rootId, objects, configuredIds } | Array.from, Array.isArray, String, notes.push, numberOr, nwShcfgTdBestSourceId, nwShcfgTdHash, nwShcfgTdNormName, pick, rawEntries.forEach, sourceId.split, state.val.trim, stateMap.values, states.filter (weitere in der Quelle) |
| [`getMeta`](../../../../src-ts/runtime-executables/main.ts#L14073) | state | nwShcfgTdStateEntry |
| [`pick`](../../../../src-ts/runtime-executables/main.ts#L14080) | names, predicate | getMeta, nwShcfgTdFindState |
| [`numberOr`](../../../../src-ts/runtime-executables/main.ts#L14087) | value, fallback | Number, Number.isFinite |
| [`pretty`](../../../../src-ts/runtime-executables/main.ts#L14469) | s | String |
| [`isPlain`](../../../../src-ts/runtime-executables/main.ts#L14515) | o | this._nwIsPlainObject |
| [`safeStr`](../../../../src-ts/runtime-executables/main.ts#L14522) | v, maxLen | String, s.slice |
| [`makeNode`](../../../../src-ts/runtime-executables/main.ts#L14732) | – | Object.create |
| [`pushItem`](../../../../src-ts/runtime-executables/main.ts#L14772) | it | results.push, seen.add, seen.has |
| [`_nwDeepMerge`](../../../../src-ts/runtime-executables/main.ts#L14896) | target, patch | Array.isArray, Object.entries, _nwDeepMerge |
| [`_nwNormalizeEmsApps`](../../../../src-ts/runtime-executables/main.ts#L14944) | nativeObj | this._nwApplyLicenseLimitsToEmsApps |
| [`_nwApplyEmsAppsToLegacyFlags`](../../../../src-ts/runtime-executables/main.ts#L15013) | nativeObj | _nwNormalizeEmsApps, this._nwLicenseAllowsAppId |
| [`_nwPickInstallerConfig`](../../../../src-ts/runtime-executables/main.ts#L15060) | nativeObj | _nwNormalizeEmsApps, this._nwBuildLicenseFeatureInfo, this._nwLicenseAllowsAppId, this.nwNormalizeOperatingStrategies |
| [`_nwPickPersistedInstallerConfig`](../../../../src-ts/runtime-executables/main.ts#L15147) | – | Object.assign, Object.keys, Object.prototype.hasOwnProperty.call, _nwNormalizeEmsApps, _nwPickInstallerConfig, clone, runtimeOnly.has |
| [`clone`](../../../../src-ts/runtime-executables/main.ts#L15154) | value | JSON.parse, JSON.stringify, this._nwDeepClone |
| [`_nwHydrateStorageFarmConfigFromRuntimeStates`](../../../../src-ts/runtime-executables/main.ts#L15183) | cfgOut | Array.from, Array.isArray, Math.max, Math.min, Math.round, Number, String, asList, fromStatusRows, parseJson, parsedGroups.filter, sf.storages.some, this._nwNormalizeStorageFarmRows, this.getStateAsync (weitere in der Quelle) |
| [`parseJson`](../../../../src-ts/runtime-executables/main.ts#L15191) | raw, fallback | JSON.parse, String |
| [`asList`](../../../../src-ts/runtime-executables/main.ts#L15197) | parsed | Array.isArray |
| [`fromStatusRows`](../../../../src-ts/runtime-executables/main.ts#L15203) | rows | Array.isArray |
| [`_nwProtectStorageFarmPatchFromEmptySubmit`](../../../../src-ts/runtime-executables/main.ts#L15281) | patchObj | Array.isArray, _nwHydrateStorageFarmConfigFromRuntimeStates, this.log.warn |
| [`_nwRegressionSafetyListInfo`](../../../../src-ts/runtime-executables/main.ts#L15332) | obj, pathText | Array.isArray, String |
| [`_nwRegressionSafetySetPath`](../../../../src-ts/runtime-executables/main.ts#L15342) | obj, pathText, value | Array.isArray, String, value.slice |
| [`_nwBuildRegressionSafetyReport`](../../../../src-ts/runtime-executables/main.ts#L15353) | patchObj, baseObj | Date.now, _nwRegressionSafetyListInfo, checks.filter, checks.push |
| [`_nwApplyInstallerRegressionSafetyGate`](../../../../src-ts/runtime-executables/main.ts#L15393) | patchObj, baseObj | _nwBuildRegressionSafetyReport, _nwRegressionSafetyListInfo, _nwRegressionSafetySetPath, this.log.warn |
| [`_nwRestartEms`](../../../../src-ts/runtime-executables/main.ts#L15420) | – | this.initEmsEngine, this.log.warn |
| [`_nwMaskTariffProviderForUi`](../../../../src-ts/runtime-executables/main.ts#L15432) | cfg | Object.keys, String, _nwTariffSecretKeys.has, this._nwDeepClone |
| [`_nwMergeTariffProviderSecrets`](../../../../src-ts/runtime-executables/main.ts#L15442) | incoming, existing | this._nwDeepClone |
| [`read`](../../../../src-ts/runtime-executables/main.ts#L15993) | relId, fallback | this.getForeignStateAsync |
| [`compactHas`](../../../../src-ts/runtime-executables/main.ts#L16152) | id | – |
| [`compactPick`](../../../../src-ts/runtime-executables/main.ts#L16153) | ids | ids.flat |
| [`nativeId`](../../../../src-ts/runtime-executables/main.ts#L16157) | suffix | – |
| [`deriveStationKey`](../../../../src-ts/runtime-executables/main.ts#L16274) | parts | String, clean.push, ignoreSeg.has, s.toLowerCase |
| [`parseConnector`](../../../../src-ts/runtime-executables/main.ts#L16299) | id | Number, String, deriveStationKey, low.match, parts.slice, seg.toLowerCase, sid.split |
| [`scoreState`](../../../../src-ts/runtime-executables/main.ts#L16387) | it, kind | String, id.toLowerCase, idLower.endsWith, idLower.includes, role.includes |
| [`pickBestId`](../../../../src-ts/runtime-executables/main.ts#L16477) | states, kind | String, scoreState |
| [`normName`](../../../../src-ts/runtime-executables/main.ts#L16675) | value | Object.values, first.trim, value.trim |
| [`parseManifest`](../../../../src-ts/runtime-executables/main.ts#L16683) | baseId | JSON.parse, raw.trim |
| [`fallbackDeviceClass`](../../../../src-ts/runtime-executables/main.ts#L16692) | category | String |
| [`readAlias`](../../../../src-ts/runtime-executables/main.ts#L16756) | keys | keys.map |
| [`writeAlias`](../../../../src-ts/runtime-executables/main.ts#L16757) | keys | – |
| [`addId`](../../../../src-ts/runtime-executables/main.ts#L16992) | id | String |
| [`getOwn`](../../../../src-ts/runtime-executables/main.ts#L17053) | id | this.getStateAsync |
| [`mkCheck`](../../../../src-ts/runtime-executables/main.ts#L17154) | id | – |
| [`toSafeIdPart`](../../../../src-ts/runtime-executables/main.ts#L17179) | x | String |
| [`readNum`](../../../../src-ts/runtime-executables/main.ts#L17216) | id | Number, Number.isFinite, this.getStateAsync |
| [`readBool`](../../../../src-ts/runtime-executables/main.ts#L17231) | id | this.getStateAsync |
| [`readStr`](../../../../src-ts/runtime-executables/main.ts#L17245) | id | String, this.getStateAsync |
| [`makeNode`](../../../../src-ts/runtime-executables/main.ts#L17600) | – | Object.create |
| [`resolveRoomName`](../../../../src-ts/runtime-executables/main.ts#L17732) | roomId | rooms.find |
| [`resolveFunctionName`](../../../../src-ts/runtime-executables/main.ts#L17743) | fnId | funcs.find |
| [`addSceneBlock`](../../../../src-ts/runtime-executables/main.ts#L17789) | dpId, id, alias | blocks.push |
| [`densifyHoldLast`](../../../../src-ts/runtime-executables/main.ts#L17986) | values, rangeStart, rangeEnd, rangeStepMs | Array.isArray, Math.floor, Math.max, Math.round, Number, Number.isFinite, byIdx.get, byIdx.has, byIdx.set, normTsMs, out.push |
| [`normTsMs`](../../../../src-ts/runtime-executables/main.ts#L18087) | ts | Date.parse, Math.round, Number, Number.isFinite, Number.isNaN, ts.getTime, ts.trim |
| [`ask`](../../../../src-ts/runtime-executables/main.ts#L18122) | id, query | Math.max, Number, Number.isFinite, String, requestSeriesCache.get, requestSeriesCache.has, requestSeriesCache.set, this._nwTrimId |
| [`askCandidates`](../../../../src-ts/runtime-executables/main.ts#L18189) | candidates, query | Array.isArray, ask, this._nwTrimId |
| [`_normalizeHistoryPairs`](../../../../src-ts/runtime-executables/main.ts#L18233) | values | Array.isArray, Number, Number.isFinite, normTsMs, out.push, out.sort |
| [`_valueAtHold`](../../../../src-ts/runtime-executables/main.ts#L18252) | pairs, ts | Array.isArray, Number, Number.isFinite |
| [`_buildNormalizedPricingSeries`](../../../../src-ts/runtime-executables/main.ts#L18270) | { startTs, endTs, grossSeries, baseSeries, totalSeries, netFeeSeries, manualGrossPrice, dynamicTariffActive } | Array.from, Math.max, Number.isFinite, _normalizeHistoryPairs, _valueAtHold, baseOut.push, totalOut.push |
| [`evcsHasData`](../../../../src-ts/runtime-executables/main.ts#L18345) | s | Array.isArray |
| [`readCounterPoint`](../../../../src-ts/runtime-executables/main.ts#L18410) | id, newest | – |
| [`readCurrentCounterPoint`](../../../../src-ts/runtime-executables/main.ts#L18474) | id | Number, Number.isFinite, this._nwNormTsMs, this.getForeignStateAsync |
| [`counterDelta`](../../../../src-ts/runtime-executables/main.ts#L18491) | id | Date.now, Math.abs, Number, Number.isFinite, readCounterPoint, readCurrentCounterPoint |
| [`integrateSeriesKwh`](../../../../src-ts/runtime-executables/main.ts#L18546) | series, defaultEndMs, stepMsForSeries, positiveOnly | Array.isArray, Date.now, Math.abs, Math.max, Math.min, Number, Number.isFinite |
| [`clipSeriesForIntegration`](../../../../src-ts/runtime-executables/main.ts#L18575) | series, clipEndMs | Array.isArray, Number, Number.isFinite, out.push |
| [`buildEnergyExact`](../../../../src-ts/runtime-executables/main.ts#L18602) | – | Array.from, Array.isArray, Math.max, Number, Number.isFinite, Promise.all, clipSeriesForIntegration, integrateSeriesKwh, sumByTs.entries, sumByTs.get, sumByTs.set |
| [`parseTs`](../../../../src-ts/runtime-executables/main.ts#L18689) | raw, { endOfDay = false } | Date.parse, Number, Number.isFinite, Number.isNaN, String, dt.getTime, dt.setHours, s.split |
| [`alignDown`](../../../../src-ts/runtime-executables/main.ts#L18714) | ts | Math.floor, Number |
| [`alignUp`](../../../../src-ts/runtime-executables/main.ts#L18721) | ts | Math.ceil, Number |
| [`densifyHoldLast`](../../../../src-ts/runtime-executables/main.ts#L18740) | series | Array.isArray, Math.ceil, Math.max, Math.round, Number, Number.isFinite, byIdx.get, byIdx.has, byIdx.set, out.push, this._nwNormTsMs |
| [`seriesFor`](../../../../src-ts/runtime-executables/main.ts#L18782) | name | Math.max, densifyHoldLast, this._nwGetHistoryAvgSeriesAny, this._nwGetHistoryDpCandidates |
| [`seriesForIds`](../../../../src-ts/runtime-executables/main.ts#L18789) | ids | Math.max, densifyHoldLast, this._nwGetHistoryAvgSeriesAny |
| [`parseTs`](../../../../src-ts/runtime-executables/main.ts#L18892) | raw, { endOfDay = false } | Date.parse, Number, Number.isFinite, Number.isNaN, String, dt.getTime, dt.setHours, s.split |
| [`getRawHistory`](../../../../src-ts/runtime-executables/main.ts#L18924) | id | – |
| [`nwBuildEvcsReport`](../../../../src-ts/runtime-executables/main.ts#L19053) | query | Array.isArray, Date.now, Math.abs, Math.max, Math.min, Math.round, Number, Number.isFinite, Object.keys, buckets.forEach, buckets.map, buckets.push, chooseStepMs, d.getDate (weitere in der Quelle) |
| [`parseTs`](../../../../src-ts/runtime-executables/main.ts#L19063) | raw, { endOfDay = false } | Date.parse, Number, Number.isFinite, Number.isNaN, String, dt.getTime, dt.setHours, s.split |
| [`dayKeyOf`](../../../../src-ts/runtime-executables/main.ts#L19113) | ts | String, d.getDate, d.getFullYear, d.getMonth |
| [`calcCount`](../../../../src-ts/runtime-executables/main.ts#L19137) | startMs, endMs, stepMs | Math.ceil, Math.max, Math.min, Number, Number.isFinite |
| [`chooseStepMs`](../../../../src-ts/runtime-executables/main.ts#L19152) | spanMs, baseStepMs | Math.ceil, Math.max, Number |
| [`normTsMs`](../../../../src-ts/runtime-executables/main.ts#L19168) | ts | Number, Number.isFinite, parseTs |
| [`getHist`](../../../../src-ts/runtime-executables/main.ts#L19182) | id, startMs, endMs, aggregate, step | – |
| [`nwWbLabel`](../../../../src-ts/runtime-executables/main.ts#L19403) | wb | String |
| [`nwCsvEscape`](../../../../src-ts/runtime-executables/main.ts#L19414) | v | String, s.replace |
| [`nwFormatDe`](../../../../src-ts/runtime-executables/main.ts#L19430) | num, digits | Number, Number.isFinite, n.toFixed |
| [`nwEvcsReportToCsv`](../../../../src-ts/runtime-executables/main.ts#L19448) | report | Array.isArray, Math.max, Number, Number.isFinite, String, header.map, header.push, lines.join, lines.push, nwFormatDe, nwWbLabel, row.map, row.push, totalRow.map (weitere in der Quelle) |
| [`nwPad2`](../../../../src-ts/runtime-executables/main.ts#L19533) | n | Number, String |
| [`nwDayKey`](../../../../src-ts/runtime-executables/main.ts#L19540) | tsMs | Number, d.getDate, d.getFullYear, d.getMonth, nwPad2 |
| [`nwTimeHhMm`](../../../../src-ts/runtime-executables/main.ts#L19550) | tsMs | Number, d.getHours, d.getMinutes, nwPad2 |
| [`nwParseTsLoose`](../../../../src-ts/runtime-executables/main.ts#L19560) | raw, { endOfDay = false } | Date.parse, Number, Number.isFinite, Number.isNaN, String, dt.getTime, dt.setHours, s.split |
| [`nwEvcsSessionsToCsv`](../../../../src-ts/runtime-executables/main.ts#L19594) | sessions | Math.round, Number, Number.isFinite, String, header.map, lines.join, lines.push, nwDayKey, nwFormatDe, nwTimeHhMm, row.map |
| [`nwNormalizeRfid`](../../../../src-ts/runtime-executables/main.ts#L19728) | ctx, raw | String, ctx.normalizeRfidCode, s.trim |
| [`nwLoadEvcsSessions`](../../../../src-ts/runtime-executables/main.ts#L19744) | ctx | Array.isArray, JSON.parse, ctx._evcsSessionsBuf.slice, ctx.getStateAsync, st.val.trim |
| [`nwGetRfidNameFromWhitelist`](../../../../src-ts/runtime-executables/main.ts#L19767) | ctx, rfidNorm | Array.isArray, JSON.parse, String, ctx.getStateAsync, nwNormalizeRfid, st.val.trim |
| [`nwStartOfLocalDay`](../../../../src-ts/runtime-executables/main.ts#L19796) | ms | Number, d.getTime, d.setHours |
| [`nwEndOfLocalDay`](../../../../src-ts/runtime-executables/main.ts#L19807) | ms | Number, d.getTime, d.setHours |
| [`nwBuildRfidDailyReport`](../../../../src-ts/runtime-executables/main.ts#L19818) | ctx, query | Array.isArray, Date.now, Math.max, Math.round, Number, Number.isFinite, d.getDate, d.getTime, d.setDate, days.push, nwDayKey, nwEndOfLocalDay, nwGetRfidNameFromWhitelist, nwLoadEvcsSessions (weitere in der Quelle) |
| [`nwRfidReportToCsv`](../../../../src-ts/runtime-executables/main.ts#L19912) | report | Array.isArray, Math.max, Math.round, Number, Number.isFinite, String, header.map, lines.join, lines.push, nwFormatDe, row.map, totalRow.map |
| [`_nwDisplaySafeId`](../../../../src-ts/runtime-executables/main.ts#L19986) | input | String |
| [`_nwDisplayNormalizeLpKey`](../../../../src-ts/runtime-executables/main.ts#L19987) | input | Math.max, Math.round, Number, String, _nwDisplaySafeId, s.match |
| [`_nwDisplayNormalizeModes`](../../../../src-ts/runtime-executables/main.ts#L19993) | raw | Array.isArray, String, out.includes, out.push |
| [`_nwDisplayClamp`](../../../../src-ts/runtime-executables/main.ts#L20006) | value, min, max, fallback | Math.max, Math.min, Number, Number.isFinite |
| [`_nwDisplayLayoutMode`](../../../../src-ts/runtime-executables/main.ts#L20011) | raw, connectorCount | Math.max, Math.round, Number, String |
| [`_nwActiveEvcsControlRows`](../../../../src-ts/runtime-executables/main.ts#L20019) | – | Array.isArray |
| [`_nwDisplayGlobalStorageAssistControlEnabled`](../../../../src-ts/runtime-executables/main.ts#L20028) | – | _nwActiveEvcsControlRows |
| [`_nwDisplayStationConfig`](../../../../src-ts/runtime-executables/main.ts#L20034) | – | Array.isArray, Math.max, Math.round, Number, String, _nwDisplayNormalizeLpKey, ports.sort, portsByStation.get, portsByStation.has, portsByStation.set, portsByStation.values, rows.map |
| [`_nwDisplayFindStation`](../../../../src-ts/runtime-executables/main.ts#L20109) | token | String, _nwDisplayStationConfig |
| [`_nwDisplayIsLicensed`](../../../../src-ts/runtime-executables/main.ts#L20114) | – | this._nwLicenseAllowsAppId |
| [`_nwDisplayStateVal`](../../../../src-ts/runtime-executables/main.ts#L20117) | id, fallback | Object.prototype.hasOwnProperty.call |
| [`_nwDisplayStationStateVal`](../../../../src-ts/runtime-executables/main.ts#L20124) | stationId, suffix, fallback | Object.prototype.hasOwnProperty.call, _nwDisplaySafeId |
| [`_nwDisplayNum`](../../../../src-ts/runtime-executables/main.ts#L20132) | v, fallback | Number, Number.isFinite |
| [`_nwDisplayFindWallbox`](../../../../src-ts/runtime-executables/main.ts#L20136) | lpKey | Array.isArray, Math.max, Math.round, Number, String, _nwDisplayNormalizeLpKey, list.find |
| [`_nwDisplayBool`](../../../../src-ts/runtime-executables/main.ts#L20146) | v, fallback | String |
| [`_nwDisplayRound`](../../../../src-ts/runtime-executables/main.ts#L20154) | value, digits | Math.max, Math.min, Math.pow, Math.round, Number, Number.isFinite |
| [`_nwDisplayParseJson`](../../../../src-ts/runtime-executables/main.ts#L20160) | raw, fallback | JSON.parse, String |
| [`_nwDisplayNormalizeControlProfile`](../../../../src-ts/runtime-executables/main.ts#L20170) | raw | String |
| [`_nwDisplayResolveCommandStateId`](../../../../src-ts/runtime-executables/main.ts#L20180) | station, lp | String |
| [`_nwDisplayReadStationRuntime`](../../../../src-ts/runtime-executables/main.ts#L20189) | station, now | Array.isArray, Date.now, Math.max, Math.round, _nwDisplayClamp, _nwDisplayNum, _nwDisplayStationStateVal |
| [`_nwDisplayActiveSession`](../../../../src-ts/runtime-executables/main.ts#L20216) | idx | Date.now, Math.max, Math.round, Number, Number.isFinite, String |
| [`_nwDisplaySessionId`](../../../../src-ts/runtime-executables/main.ts#L20246) | stationId, lpKey, session | Number, String, _nwDisplayNormalizeLpKey, _nwDisplaySafeId |
| [`_nwDisplayLastCompletedSession`](../../../../src-ts/runtime-executables/main.ts#L20252) | idx | Array.isArray, Math.max, Math.round, Number, String |
| [`_nwDisplayNormalizeSessionRecord`](../../../../src-ts/runtime-executables/main.ts#L20283) | station, lpKey, row, fallbackPrice | Math.max, Math.min, Math.round, Number, Number.isFinite, String, _nwDisplayNormalizeLpKey, _nwDisplayNum, _nwDisplayRound |
| [`_nwDisplayNewestSession`](../../../../src-ts/runtime-executables/main.ts#L20322) | buffered, persisted | Number |
| [`_nwDisplaySessionCostBreakdown`](../../../../src-ts/runtime-executables/main.ts#L20335) | energyKwh, solarSharePct, solarPrice, gridPrice, fallbackPrice, showSolarShare | Math.max, Math.min, Math.round, Number, _nwDisplayNum, _nwDisplayRound |
| [`_nwDisplayStartOfLocalDay`](../../../../src-ts/runtime-executables/main.ts#L20352) | ms | Date.now, Number, d.getTime, d.setHours |
| [`_nwDisplayLocalDayKey`](../../../../src-ts/runtime-executables/main.ts#L20358) | ms | Date.now, Number, String, d.getDate, d.getFullYear, d.getMonth |
| [`_nwDisplayReadStationJsonState`](../../../../src-ts/runtime-executables/main.ts#L20366) | stationId, suffix, fallback | JSON.parse, _nwDisplayStationStateVal |
| [`_nwDisplayCsvEscape`](../../../../src-ts/runtime-executables/main.ts#L20377) | value | String, s.replace |
| [`_nwDisplayStationOperatorCsv`](../../../../src-ts/runtime-executables/main.ts#L20382) | payload | Array.isArray, Date.now, Math.round, Number, String, _nwDisplayNormalizeSessionRecord, lines.join, lines.push |
| [`_nwDisplayBuildOperatorSummary`](../../../../src-ts/runtime-executables/main.ts#L20444) | station, connectors, now | Array.isArray, Date.now, Math.max, Math.round, Number, Object.entries, Object.fromEntries, Object.keys, String, _nwDisplayLocalDayKey, _nwDisplayNormalizeLpKey, _nwDisplayNormalizeSessionRecord, _nwDisplayNum, _nwDisplayReadStationJsonState (weitere in der Quelle) |
| [`_nwDisplayWriteStationState`](../../../../src-ts/runtime-executables/main.ts#L20548) | stationId, suffix, value, ack | Date.now, _nwDisplaySafeId, this.setStateAsync, this.updateValue |
| [`_nwDisplayBuildPayload`](../../../../src-ts/runtime-executables/main.ts#L20555) | station | Array.isArray, Date.now, Math.max, Math.round, Number, Number.isFinite, String, _nwDisplayBool, _nwDisplayBuildOperatorSummary, _nwDisplayClamp, _nwDisplayGlobalStorageAssistControlEnabled, _nwDisplayLayoutMode, _nwDisplayNormalizeControlProfile, _nwDisplayNormalizeLpKey (weitere in der Quelle) |
| [`_nwDisplaySetWallboxControl`](../../../../src-ts/runtime-executables/main.ts#L20874) | lpKey, prop, value | Date.now, String, _nwDisplayNormalizeLpKey, this.setStateAsync, this.updateValue |
| [`_nwDisplaySetWallboxMode`](../../../../src-ts/runtime-executables/main.ts#L20888) | lpKey, mode, enabled | Date.now, Math.max, Math.round, Number, String, _nwDisplayNormalizeLpKey, this.setStateAsync, this.updateValue |
| [`_nwDisplayBuildCommandIntent`](../../../../src-ts/runtime-executables/main.ts#L20909) | station, lpKey, action, mode, userMode | Date.now, String, _nwDisplayNormalizeLpKey |
| [`_nwDisplayWriteCommandState`](../../../../src-ts/runtime-executables/main.ts#L20924) | station, lpKey, intent | Date.now, JSON.stringify, _nwDisplayBool, _nwDisplayResolveCommandStateId, isActuatorAuthorityBlockedResult, this.setForeignStateAsync, this.setStateAsync, this.updateValue |
| [`_nwDisplayPersistSessionOperatorStates`](../../../../src-ts/runtime-executables/main.ts#L20946) | station, payload | Date.now, JSON.stringify, Number, Object.keys, String, _nwDisplayLocalDayKey, _nwDisplayReadStationJsonState, _nwDisplayStationStateVal, _nwDisplayWriteStationState, connectors.filter, connectors.slice, encodeURIComponent |
| [`_nwDisplayExecuteStationCommand`](../../../../src-ts/runtime-executables/main.ts#L21035) | station, lpKey, action, mode, extra | JSON.stringify, Object.prototype.hasOwnProperty.call, String, _nwDisplayBool, _nwDisplayBuildCommandIntent, _nwDisplayClamp, _nwDisplayFindWallbox, _nwDisplayGlobalStorageAssistControlEnabled, _nwDisplayNormalizeControlProfile, _nwDisplayNormalizeLpKey, _nwDisplayResolveCommandStateId, _nwDisplaySetWallboxControl, _nwDisplaySetWallboxMode, _nwDisplayStateVal (weitere in der Quelle) |
| [`_nwEnergyLedgerIsLicensed`](../../../../src-ts/runtime-executables/main.ts#L21200) | – | this._nwLicenseAllowsAppId |
| [`_nwEnergyOriginAppEnabled`](../../../../src-ts/runtime-executables/main.ts#L21208) | – | _nwEnergyLedgerIsLicensed |
| [`_nwEnergyLedgerJson`](../../../../src-ts/runtime-executables/main.ts#L21224) | id, fallback | JSON.parse, String, _nwDisplayStateVal |
| [`_nwEnergyLedgerPeriod`](../../../../src-ts/runtime-executables/main.ts#L21235) | input | String |
| [`_nwEnergyLedgerFilterEntries`](../../../../src-ts/runtime-executables/main.ts#L21239) | entries, period, summary | Array.isArray, _nwEnergyLedgerPeriod, list.filter, list.slice |
| [`_nwEnergyLedgerSourceLabel`](../../../../src-ts/runtime-executables/main.ts#L21251) | entry | Array.isArray, String, labels.join, parts.filter |
| [`_nwEnergyLedgerBuildPayload`](../../../../src-ts/runtime-executables/main.ts#L21263) | period | Array.isArray, Date.now, _nwEnergyLedgerFilterEntries, _nwEnergyLedgerJson, _nwEnergyLedgerPeriod |
| [`_nwEnergyLedgerCsv`](../../../../src-ts/runtime-executables/main.ts#L21292) | payload | Array.isArray, Date.now, Math.round, Number, String, _nwEnergyLedgerSourceLabel, rows.join, rows.push |
| [`_nwNetOperatorLicensed`](../../../../src-ts/runtime-executables/main.ts#L21366) | – | this._nwLicenseAllowsAppId |
| [`_nwNetOperatorEnabled`](../../../../src-ts/runtime-executables/main.ts#L21369) | – | _nwNetOperatorLicensed |
| [`_nwNetOperatorActivation`](../../../../src-ts/runtime-executables/main.ts#L21376) | – | String, _nwNetOperatorLicensed |
| [`_nwMeshMicrogridIsLicensed`](../../../../src-ts/runtime-executables/main.ts#L21494) | – | this._nwLicenseAllowsAppId |
| [`_nwMeshMicrogridCfg`](../../../../src-ts/runtime-executables/main.ts#L21498) | – | – |
| [`_nwMeshSafeId`](../../../../src-ts/runtime-executables/main.ts#L21502) | value, fallback | String |
| [`_nwMeshReceiverCfg`](../../../../src-ts/runtime-executables/main.ts#L21503) | – | Array.isArray, Math.max, Math.min, Math.round, Number, String, _nwMeshMicrogridCfg, allowedPeerText.split, r.allowedPeerNodeIds.join |
| [`_nwMeshTailscaleCfg`](../../../../src-ts/runtime-executables/main.ts#L21519) | – | Array.isArray, Math.max, Math.min, Math.round, Number, String, _nwMeshMicrogridCfg, _nwMeshSafeId, peerUrlText.split, t.peerUrls.join |
| [`_nwMeshNormalPeerUrl`](../../../../src-ts/runtime-executables/main.ts#L21531) | raw | String, withProto.replace |
| [`_nwMeshPeerTokenFromReq`](../../../../src-ts/runtime-executables/main.ts#L21539) | req | String |
| [`_nwMeshPeerTokenOk`](../../../../src-ts/runtime-executables/main.ts#L21540) | req | Buffer.from, String, _nwMeshPeerTokenFromReq, _nwMeshReceiverCfg, crypto.timingSafeEqual |
| [`_nwMeshWriteState`](../../../../src-ts/runtime-executables/main.ts#L21552) | id, value, ack | this.setStateAsync |
| [`_nwMeshStateJson`](../../../../src-ts/runtime-executables/main.ts#L21555) | id, fallback | _nwEnergyLedgerJson |
| [`_nwMeshNow`](../../../../src-ts/runtime-executables/main.ts#L21556) | – | Date.now |
| [`_nwMeshCommandIds`](../../../../src-ts/runtime-executables/main.ts#L21557) | body | Array.isArray, list.map |
| [`_nwMeshPeerErrorClass`](../../../../src-ts/runtime-executables/main.ts#L21569) | peer | Array.isArray, p.errors.map, text.includes |
| [`_nwMeshRoundtripStatus`](../../../../src-ts/runtime-executables/main.ts#L21585) | ms | Number, Number.isFinite |
| [`_nwMeshRemoteNodeMatrix`](../../../../src-ts/runtime-executables/main.ts#L21592) | peers | Array.isArray, Number, _nwMeshPeerErrorClass, _nwMeshRoundtripStatus, rows.push |
| [`_nwMeshBuildHandshakePayload`](../../../../src-ts/runtime-executables/main.ts#L21619) | – | Date.now, _nwMeshMicrogridBuildPayload, _nwMeshMicrogridCfg, _nwMeshReceiverCfg, _nwMeshSafeId |
| [`_nwMeshMicrogridBuildPayload`](../../../../src-ts/runtime-executables/main.ts#L21648) | – | Array.isArray, Date.now, Number, String, _nwDisplayStateVal, _nwEnergyLedgerJson |
| [`_nwMeshMicrogridCsv`](../../../../src-ts/runtime-executables/main.ts#L21796) | payload | Array.isArray, Date.now, JSON.stringify, Math.round, Number, String, rows.join, rows.push |
| [`_nwMeshClassifyPeerError`](../../../../src-ts/runtime-executables/main.ts#L21975) | parts | Array.isArray, text.includes, text.trim |
| [`_nwMeshRoundtripLevel`](../../../../src-ts/runtime-executables/main.ts#L21986) | ms, ok | Number, Number.isFinite |
| [`reject`](../../../../src-ts/runtime-executables/main.ts#L22004) | status, error, message, extra | JSON.stringify, Number, _nwDisplayStateVal, _nwMeshSafeId, _nwMeshWriteState, res.status |
| [`boolOr`](../../../../src-ts/runtime-executables/main.ts#L22412) | val, def | – |
| [`parseJsonArraySafe`](../../../../src-ts/runtime-executables/main.ts#L22439) | raw | Array.isArray, JSON.parse, String |
| [`storageFarmRowHasRealDatapoint`](../../../../src-ts/runtime-executables/main.ts#L22454) | row | this._nwStorageFarmRowHasRealDatapoint |
| [`inferChargingEnabled`](../../../../src-ts/runtime-executables/main.ts#L22640) | – | – |
| [`getArr`](../../../../src-ts/runtime-executables/main.ts#L22708) | k | Array.isArray |
| [`defName`](../../../../src-ts/runtime-executables/main.ts#L22715) | kind, idx | – |
| [`pickName`](../../../../src-ts/runtime-executables/main.ts#L22725) | arr, idx, kind | String, defName |
| [`pickIcon`](../../../../src-ts/runtime-executables/main.ts#L22736) | arr, idx | String |
| [`pickQuick`](../../../../src-ts/runtime-executables/main.ts#L22747) | arr, idx, kind | Array.isArray, Math.max, Math.round, Number, String, hlist.find, normalizeConsumerType, numOrNull, tlist.find |
| [`resolveHeatingRodDev`](../../../../src-ts/runtime-executables/main.ts#L22762) | – | Array.isArray, Math.round, Number, hlist.find |
| [`normalizeConsumerType`](../../../../src-ts/runtime-executables/main.ts#L22796) | raw | String |
| [`numOrNull`](../../../../src-ts/runtime-executables/main.ts#L22814) | v | Number, Number.isFinite |
| [`buildSlots`](../../../../src-ts/runtime-executables/main.ts#L22905) | kind | String, getArr, out.push, pickIcon, pickName, pickQuick, this._nwGetFlowSlotInfo |
| [`nwPsAtCsvEscape`](../../../../src-ts/runtime-executables/main.ts#L23200) | v | String, s.replace |
| [`nwPsAtFmtNum`](../../../../src-ts/runtime-executables/main.ts#L23210) | v, digits | Math.max, Math.min, Math.round, Number, Number.isFinite, n.toFixed |
| [`nwPsAtPad2`](../../../../src-ts/runtime-executables/main.ts#L23222) | n | Number, String |
| [`nwPsAtIsoLocal`](../../../../src-ts/runtime-executables/main.ts#L23229) | ts | Date.now, Number, d.getDate, d.getFullYear, d.getHours, d.getMinutes, d.getMonth, d.getSeconds, nwPsAtPad2 |
| [`nwPsAtYmd`](../../../../src-ts/runtime-executables/main.ts#L23239) | ts | Date.now, Number, d.getDate, d.getFullYear, d.getMonth, nwPsAtPad2 |
| [`nwPsAtParseTs`](../../../../src-ts/runtime-executables/main.ts#L23249) | raw, { endOfDay = false } | Date.parse, Number, Number.isFinite, Number.isNaN, String, dt.getTime, dt.setHours, s.split |
| [`nwPsAtStateVal`](../../../../src-ts/runtime-executables/main.ts#L23274) | localId, fallback | this.getStateAsync |
| [`nwPsAtStateNum`](../../../../src-ts/runtime-executables/main.ts#L23291) | localId, fallback | Number, Number.isFinite, nwPsAtStateVal |
| [`nwPsAtStateBool`](../../../../src-ts/runtime-executables/main.ts#L23302) | localId, fallback | String, nwPsAtStateVal |
| [`nwPsAtStateStr`](../../../../src-ts/runtime-executables/main.ts#L23317) | localId, fallback | String, nwPsAtStateVal |
| [`nwPsAtSafeFile`](../../../../src-ts/runtime-executables/main.ts#L23328) | s | String |
| [`nwPsAtBuildReport`](../../../../src-ts/runtime-executables/main.ts#L23339) | query | Array.from, Array.isArray, Date.now, Math.max, Math.min, Math.round, Number, Number.isFinite, Promise.all, nwPsAtParseTs, nwPsAtStateBool, nwPsAtStateNum, nwPsAtStateStr, seriesDefs.map (weitere in der Quelle) |
| [`nwPsAtReportToCsv`](../../../../src-ts/runtime-executables/main.ts#L23493) | report | Number, header.map, lines.join, lines.push, nwPsAtFmtNum, nwPsAtIsoLocal, pushMeta |
| [`pushMeta`](../../../../src-ts/runtime-executables/main.ts#L23501) | k, v | String, lines.push |
| [`nwPsAtPdfAscii`](../../../../src-ts/runtime-executables/main.ts#L23560) | value | String |
| [`nwPsAtPdfEscape`](../../../../src-ts/runtime-executables/main.ts#L23572) | value | nwPsAtPdfAscii |
| [`nwPsAtWrap`](../../../../src-ts/runtime-executables/main.ts#L23579) | line, max | nwPsAtPdfAscii, out.push, s.split |
| [`nwPsAtBuildPdf`](../../../../src-ts/runtime-executables/main.ts#L23602) | title, lines | Buffer.byteLength, Buffer.from, Math.max, Object.keys, String, addObj, chunks.forEach, chunks.push, nwPsAtWrap, pageIds.map, wrapped.push, wrapped.slice |
| [`addObj`](../../../../src-ts/runtime-executables/main.ts#L23629) | id, body | – |
| [`nwPsAtReportToPdf`](../../../../src-ts/runtime-executables/main.ts#L23673) | report | Array.isArray, cfg.highLoadWindows.slice, lines.push, nwPsAtBuildPdf, nwPsAtFmtNum, nwPsAtIsoLocal, windows.forEach |
| [`valueOf`](../../../../src-ts/runtime-executables/main.ts#L23774) | key, fallback | Object.prototype.hasOwnProperty.call |
| [`writeRelayValue`](../../../../src-ts/runtime-executables/main.ts#L24503) | rawValue, valueKind | withActuatorShadowContext |
| [`normalizeConsumerType`](../../../../src-ts/runtime-executables/main.ts#L24687) | raw | String |
| [`resolveThermalDev`](../../../../src-ts/runtime-executables/main.ts#L24702) | – | Array.isArray, Math.round, Number, tlist.find |
| [`resolveHeatingRodDev`](../../../../src-ts/runtime-executables/main.ts#L24719) | – | Array.isArray, Math.round, Number, hlist.find |
| [`syncHeatingRodUserState`](../../../../src-ts/runtime-executables/main.ts#L24736) | localId, val | Date.now, emsDp.handleStateChange, this.updateValue |
| [`normalizeHeatingRodQuickMode`](../../../../src-ts/runtime-executables/main.ts#L24752) | raw | String |
| [`getHeatingRodStoredUserMode`](../../../../src-ts/runtime-executables/main.ts#L24768) | – | normalizeHeatingRodQuickMode, this.getStateAsync |
| [`heatingRodManualStageForMode`](../../../../src-ts/runtime-executables/main.ts#L24782) | dev, rawMode | Array.isArray, Math.ceil, Math.max, Math.min, Math.round, Number, normalizeHeatingRodQuickMode |
| [`writeHeatingRodStagesOnce`](../../../../src-ts/runtime-executables/main.ts#L24799) | dev, rawTargetStage | Array.isArray, Date.now, Math.max, Math.min, Math.round, Number, String, addWrite, blocked.push, emsDp.handleStateChange, emsDp.lastWriteByObjectId.set, grouped.entries, isActuatorAuthorityBlockedResult, this.setForeignStateAsync (weitere in der Quelle) |
| [`addWrite`](../../../../src-ts/runtime-executables/main.ts#L24814) | stageIndex, rawId, physicalOn | String, emsDp.getEntry, grouped.get, grouped.set |
| [`clearBoost`](../../../../src-ts/runtime-executables/main.ts#L24933) | – | this.setStateAsync |
| [`clearOverrides`](../../../../src-ts/runtime-executables/main.ts#L25015) | – | this.setStateAsync |
| [`normalizeConsumerType`](../../../../src-ts/runtime-executables/main.ts#L25235) | raw | String |
| [`resolveThermalDev`](../../../../src-ts/runtime-executables/main.ts#L25250) | – | Array.isArray, Math.round, Number, tlist.find |
| [`resolveHeatingRodDev`](../../../../src-ts/runtime-executables/main.ts#L25270) | – | Array.isArray, Math.round, Number, hlist.find |
| [`normalizeHeatingRodAutoModeLocal`](../../../../src-ts/runtime-executables/main.ts#L25333) | raw | String |
| [`normMode`](../../../../src-ts/runtime-executables/main.ts#L25363) | m | String |
| [`readNumState`](../../../../src-ts/runtime-executables/main.ts#L25381) | id, fallback | Number, Number.isFinite, this.getStateAsync |
| [`normMode`](../../../../src-ts/runtime-executables/main.ts#L25504) | m | String |
| [`authorize`](../../../../src-ts/runtime-executables/main.ts#L25842) | – | getStoredSession, roleRevision |
| [`finishOk`](../../../../src-ts/runtime-executables/main.ts#L25873) | – | resolve, this.log.info |
| [`finishErr`](../../../../src-ts/runtime-executables/main.ts#L25885) | err | reject, this._nwSetInfoConnection, this.log.error |
| [`NexoWattVis._nwNormalizeFlowSlotKind`](../../../../src-ts/runtime-executables/main.ts#L25924) | kind | String, k.startsWith |
| [`NexoWattVis._nwFlowSlotCount`](../../../../src-ts/runtime-executables/main.ts#L25934) | kind | this._nwNormalizeFlowSlotKind |
| [`NexoWattVis._nwFlowSlotKey`](../../../../src-ts/runtime-executables/main.ts#L25943) | kind, index | Math.max, Math.round, Number, this._nwNormalizeFlowSlotKind |
| [`NexoWattVis._nwGetFlowSlotsRoot`](../../../../src-ts/runtime-executables/main.ts#L25954) | – | – |
| [`NexoWattVis._nwFlowSlotPowerIdFromSlot`](../../../../src-ts/runtime-executables/main.ts#L25969) | slot | String |
| [`NexoWattVis._nwGetFlowSlotInfo`](../../../../src-ts/runtime-executables/main.ts#L25999) | kind, index | Array.isArray, Math.max, Math.min, Math.round, Number, String, this._nwFlowSlotCount, this._nwFlowSlotKey, this._nwFlowSlotPowerIdFromSlot, this._nwGetFlowSlotsRoot, this._nwNormalizeFlowSlotKind |
| [`NexoWattVis.prepareFlowSlots`](../../../../src-ts/runtime-executables/main.ts#L26042) | flowSlotsCfg | Array.isArray, Object.keys, String, add, this._nwFlowSlotKey, this._nwFlowSlotPowerIdFromSlot, this._nwGetFlowSlotInfo |
| [`add`](../../../../src-ts/runtime-executables/main.ts#L26053) | objectId, stateKey | String, id.startsWith, out.push, seen.add, seen.has |
| [`NexoWattVis._nwNormalizeUnit`](../../../../src-ts/runtime-executables/main.ts#L26100) | unit | String |
| [`NexoWattVis._nwPowerScaleToWFromUnit`](../../../../src-ts/runtime-executables/main.ts#L26109) | unit | this._nwNormalizeUnit |
| [`NexoWattVis._nwIsMappedPowerKey`](../../../../src-ts/runtime-executables/main.ts#L26123) | key | key.endsWith, key.startsWith |
| [`NexoWattVis._nwScaleMappedValue`](../../../../src-ts/runtime-executables/main.ts#L26154) | key, objectId, val | Array.isArray, Math.max, Math.round, Number, Number.isFinite, Object.prototype.hasOwnProperty.call, String, normalizeEvcsEnergyTotalKwh, this._nwForeignPowerScaleCache.get, this._nwIsMappedPowerKey, this.evcsList.find |
| [`NexoWattVis._nwPrimeForeignPowerScale`](../../../../src-ts/runtime-executables/main.ts#L26202) | objectId | this._nwForeignPowerScaleCache.delete, this._nwForeignPowerScaleCache.keys, this._nwForeignPowerScaleCache.set, this._nwForeignUnitCache.delete, this._nwForeignUnitCache.has, this._nwForeignUnitCache.keys, this._nwForeignUnitCache.set, this._nwNormalizeUnit, this._nwPowerScaleToWFromUnit, this.getForeignObjectAsync |
| [`NexoWattVis._nwIsOwnStateId`](../../../../src-ts/runtime-executables/main.ts#L26232) | id | id.trim, sid.startsWith |
| [`NexoWattVis._nwBuildLiveCoreRefreshPlan`](../../../../src-ts/runtime-executables/main.ts#L26243) | – | Array.from, Array.isArray, add, addEvcsBinding, byId.values, configured.values, this._nwEvcsInputSpecsForWallbox, this.prepareFlowSlots |
| [`add`](../../../../src-ts/runtime-executables/main.ts#L26252) | id, key | byId.get, byId.set, entry.keys.add, id.trim, key.trim, this._nwIsOwnStateId |
| [`addEvcsBinding`](../../../../src-ts/runtime-executables/main.ts#L26267) | binding | String, byId.get, byId.set, entry.evcsBindings.set, this._nwIsOwnStateId |
| [`NexoWattVis._nwRefreshLiveCoreDatapoints`](../../../../src-ts/runtime-executables/main.ts#L26358) | reason | Array.isArray, Date.now, Promise.all, plan.slice, slice.map, this._nwBuildLiveCoreRefreshPlan |
| [`applyState`](../../../../src-ts/runtime-executables/main.ts#L26379) | entry | Array.isArray, Number.isFinite, Object.is, emsDp.cacheByObjectId.get, emsDp.handleStateChange, handledEvcsKeys.add, handledEvcsKeys.has, this._nwPublishEvcsInputBinding, this._nwScaleMappedValue, this.getForeignStateAsync, this.updateValue |
| [`NexoWattVis._nwStopLiveCoreRefresh`](../../../../src-ts/runtime-executables/main.ts#L26440) | – | this._nwClearInterval |
| [`NexoWattVis._nwStartLiveCoreRefresh`](../../../../src-ts/runtime-executables/main.ts#L26453) | – | Array.isArray, Math.max, Number, this._nwBuildLiveCoreRefreshPlan, this._nwSetInterval, this._nwStopLiveCoreRefresh |
| [`NexoWattVis.subscribeForecastUiStates`](../../../../src-ts/runtime-executables/main.ts#L26472) | – | Date.now, Number, Object.entries, Object.is, effectiveKeys.map, id.slice, id.startsWith, primedKeys.add, primedKeys.has, providerKeys.map, this.getForeignStatesAsync, this.getStateAsync, this.log.debug, this.subscribeForeignStatesAsync (weitere in der Quelle) |
| [`NexoWattVis.subscribeConfiguredStates`](../../../../src-ts/runtime-executables/main.ts#L26559) | – | Object.keys, id.trim, key.slice, key.startsWith, localUiKeys.includes, settingsLocalKeys.map, slot.objectId.trim, storageFarmLocalKeys.map, this._nwForeignPowerScaleCache.clear, this._nwForeignUnitCache.clear, this._nwPrimeForeignPowerScale, this._nwRefreshLiveCoreDatapoints, this._nwScaleMappedValue, this._nwStartLiveCoreRefresh (weitere in der Quelle) |
| [`NexoWattVis._nwRequestImmediateEmsTick`](../../../../src-ts/runtime-executables/main.ts#L26751) | reason, delayMs | Math.max, Number, Number.isFinite, String, engine.requestImmediateTick |
| [`NexoWattVis.onMessage`](../../../../src-ts/runtime-executables/main.ts#L26772) | obj | String, this._para14aEebusApi.handleMessage, this.log.warn, this.sendTo |
| [`NexoWattVis._nwGetPara14aEebusIngress`](../../../../src-ts/runtime-executables/main.ts#L26785) | – | this._para14aEebusApi.getIngress |
| [`NexoWattVis._nwFlushPara14aEebusImplementationFeedback`](../../../../src-ts/runtime-executables/main.ts#L26793) | context | this._para14aEebusApi.flushImplementationFeedback |
| [`NexoWattVis.onStateChange`](../../../../src-ts/runtime-executables/main.ts#L26807) | id, state | Date.now, Number, String, evcsHandledKeys.has, key.match, key.startsWith, pvAuto.cache.set, pvAuto.ids.has, this._notifyGetSettingBool, this._notifyParseBool, this._nwApplyEvcsInputSourceState, this._nwIsOwnStateId, this._nwIsReadOnlyEvcsMirrorKey, this._nwRequestImmediateEmsTick (weitere in der Quelle) |
| [`NexoWattVis.keyFromId`](../../../../src-ts/runtime-executables/main.ts#L26934) | id | Object.entries, id.slice, id.startsWith, rest.includes, this._nwRootUiKeys.has |
| [`NexoWattVis.normalizeRfidCandidate`](../../../../src-ts/runtime-executables/main.ts#L26989) | val | String, hexMatches.sort, s.match, s.replace |
| [`NexoWattVis.maybeCaptureRfidLearning`](../../../../src-ts/runtime-executables/main.ts#L27015) | sourceId, rawVal, ts | Date.now, Number, this.evcsRfidReadIds.has, this.log.info, this.normalizeRfidCandidate, this.setStateAsync, this.updateValue |
| [`NexoWattVis.parseRfidWhitelist`](../../../../src-ts/runtime-executables/main.ts#L27048) | jsonStr | Array.isArray, JSON.parse, JSON.stringify, String, this.normalizeRfidCandidate |
| [`NexoWattVis.refreshRfidWhitelistFromCache`](../../../../src-ts/runtime-executables/main.ts#L27074) | – | JSON.stringify, this.parseRfidWhitelist |
| [`NexoWattVis.isRfidEnabled`](../../../../src-ts/runtime-executables/main.ts#L27087) | – | – |
| [`NexoWattVis.setLocalStateWithCache`](../../../../src-ts/runtime-executables/main.ts#L27096) | id, val, ts | Date.now, Number, this.setStateAsync, this.updateValue |
| [`NexoWattVis.startNotificationMonitor`](../../../../src-ts/runtime-executables/main.ts#L27109) | – | this._nwClearInterval, this._nwSetInterval, this._nwSetTimeout |
| [`tick`](../../../../src-ts/runtime-executables/main.ts#L27124) | – | this.notificationTick |
| [`NexoWattVis.stopNotificationMonitor`](../../../../src-ts/runtime-executables/main.ts#L27141) | – | this._notificationMail?.close, this._nwClearInterval |
| [`NexoWattVis._notifyParseBool`](../../../../src-ts/runtime-executables/main.ts#L27157) | val, def | String |
| [`NexoWattVis._notifyGetCached`](../../../../src-ts/runtime-executables/main.ts#L27173) | key, def | – |
| [`NexoWattVis._notifyGetSettingBool`](../../../../src-ts/runtime-executables/main.ts#L27186) | key, def | this._notifyGetCached, this._notifyParseBool |
| [`NexoWattVis._notifyGetSettingString`](../../../../src-ts/runtime-executables/main.ts#L27196) | key, def | String, this._notifyGetCached |
| [`NexoWattVis._notifyGetSettingNumber`](../../../../src-ts/runtime-executables/main.ts#L27207) | key, def | Number, Number.isFinite, this._notifyGetCached |
| [`NexoWattVis._notifySetDebugState`](../../../../src-ts/runtime-executables/main.ts#L27218) | key, val | Date.now, this.setStateAsync, this.updateValue |
| [`NexoWattVis._getNotificationMail`](../../../../src-ts/runtime-executables/main.ts#L27234) | – | – |
| [`NexoWattVis._notifySendEmail`](../../../../src-ts/runtime-executables/main.ts#L27241) | to, subject, text | String, this._getNotificationMail |
| [`NexoWattVis._notifyCollectObjectIdsFromConfig`](../../../../src-ts/runtime-executables/main.ts#L27255) | – | Array.from, walk |
| [`walk`](../../../../src-ts/runtime-executables/main.ts#L27264) | v | Array.isArray, Object.values, ids.add, re.test, v.trim, walk |
| [`NexoWattVis._notifyRefreshWatchedInstances`](../../../../src-ts/runtime-executables/main.ts#L27296) | force | Array.from, Date.now, String, ids.includes, ids.push, inst.add, this._notifyCollectObjectIdsFromConfig, this.getForeignObjectAsync, valid.push |
| [`NexoWattVis._notifyRefreshNwDevicesCache`](../../../../src-ts/runtime-executables/main.ts#L27353) | force | Date.now, Object.entries, String, cid.split, configuredIds.some, getAlias, hasState, pv.push, this._notifyCollectObjectIdsFromConfig, this._notifyRefreshWatchedInstances, this.getForeignObjectsAsync |
| [`hasState`](../../../../src-ts/runtime-executables/main.ts#L27368) | baseId, suffix | – |
| [`getAlias`](../../../../src-ts/runtime-executables/main.ts#L27378) | obj, key | – |
| [`NexoWattVis._notifyFormatDuration`](../../../../src-ts/runtime-executables/main.ts#L27417) | ms | Math.floor, Math.max, Number |
| [`NexoWattVis.notificationTick`](../../../../src-ts/runtime-executables/main.ts#L27433) | – | this._getNotificationMail |
| [`NexoWattVis.startHistorieExportTimer`](../../../../src-ts/runtime-executables/main.ts#L27444) | – | Date.now, Math.ceil, Math.max, Math.min, Math.round, Number, Number.isFinite, this._nwClearInterval, this._nwClearTimeout, this._nwSetTimeout |
| [`tick`](../../../../src-ts/runtime-executables/main.ts#L27470) | – | this.updateHistorieExportStates |
| [`NexoWattVis.ensureHistorieExportStates`](../../../../src-ts/runtime-executables/main.ts#L27494) | – | Number, Number.isFinite, String, ensureChannel, ensureState, this._nwDetectInfluxInstance, this._nwEnsureInfluxCustom, this._nwGetFlowSlotInfo, this._nwGetHistoryInstance, this.log.debug |
| [`ensureChannel`](../../../../src-ts/runtime-executables/main.ts#L27504) | id, name | this.extendObjectAsync, this.setObjectNotExistsAsync |
| [`ensureState`](../../../../src-ts/runtime-executables/main.ts#L27515) | id, name, role, unit, type, influxOpts | this._nwEnsureInfluxCustom, this.extendObjectAsync, this.setObjectNotExistsAsync |
| [`NexoWattVis._nwEnsureInfluxCustom`](../../../../src-ts/runtime-executables/main.ts#L27693) | localId, inst, opts | Object.assign, String, this.extendObjectAsync, this.getObjectAsync |
| [`NexoWattVis._nwGetNumberFromCache`](../../../../src-ts/runtime-executables/main.ts#L27723) | key | Number, Number.isFinite |
| [`NexoWattVis._nwGetCacheAgeMs`](../../../../src-ts/runtime-executables/main.ts#L27740) | key, now | Date.now, Math.max, Number, Number.isFinite |
| [`NexoWattVis._nwGetNumberFromCacheFresh`](../../../../src-ts/runtime-executables/main.ts#L27758) | key, maxAgeMs, fallback, now | Date.now, Number, Number.isFinite, this._nwGetCacheAgeMs |
| [`NexoWattVis._nwGetRawNumberFromCache`](../../../../src-ts/runtime-executables/main.ts#L27781) | key, maxAgeMs, fallback, now | Date.now, Math.max, Number, Number.isFinite |
| [`NexoWattVis._nwLiveInputMaxAgeMs`](../../../../src-ts/runtime-executables/main.ts#L27803) | – | Math.max, Math.round, Number, Number.isFinite |
| [`NexoWattVis._nwIsBatterySignInverted`](../../../../src-ts/runtime-executables/main.ts#L27819) | – | this._notifyGetSettingBool |
| [`NexoWattVis._nwStorageFarmIsActiveFromCache`](../../../../src-ts/runtime-executables/main.ts#L27837) | – | Number, this._nwGetStorageFarmRuntimeInfo |
| [`NexoWattVis._nwResolveStorageFarmMetricsFromCache`](../../../../src-ts/runtime-executables/main.ts#L27855) | opts | Array.isArray, Date.now, JSON.parse, Math.abs, Math.max, Math.round, Number, Number.isFinite, parsed.filter, read, this._nwGetCacheAgeMs, this._nwStorageFarmIsActiveFromCache |
| [`read`](../../../../src-ts/runtime-executables/main.ts#L27858) | key | Number, Number.isFinite, this._nwGetNumberFromCache |
| [`NexoWattVis._nwConfiguredPvCapacityW`](../../../../src-ts/runtime-executables/main.ts#L27919) | – | Array.from, collect, unique.values |
| [`collect`](../../../../src-ts/runtime-executables/main.ts#L27925) | rows | Array.isArray, Math.max, Number, Number.isFinite, String, nwPhysicalPvSourceKey, row.kwp.replace, unique.get, unique.set |
| [`NexoWattVis._nwMergeStorageFarmPvWithBase`](../../../../src-ts/runtime-executables/main.ts#L27949) | baseAcW, opts | Array.isArray, Math.abs, Math.max, Math.min, Math.round, Number, Number.isFinite, String, addBaseSource, baseSourceIds.has, nwApplyPvCapacityPlausibility, nwCombineStorageFarmPv, nwPhysicalPvSourceKey, this._nwConfiguredPvCapacityW (weitere in der Quelle) |
| [`addBaseSource`](../../../../src-ts/runtime-executables/main.ts#L27968) | sourceId | String, baseSourceIds.add, normalizedId.toLowerCase, nwPhysicalPvSourceKey |
| [`NexoWattVis._nwResolveBatteryFlowFromCache`](../../../../src-ts/runtime-executables/main.ts#L28033) | opts | Date.now, Math.abs, Math.max, Math.round, Number, Number.isFinite, String, ageInfo, fromBalance, fromSigned, idOf, readMapped, this._nwGetCacheAgeMs, this._nwGetStorageControlAuthority (weitere in der Quelle) |
| [`idOf`](../../../../src-ts/runtime-executables/main.ts#L28046) | key | String |
| [`readMapped`](../../../../src-ts/runtime-executables/main.ts#L28069) | key, onlyIfMapped, raw | idOf, this._nwGetNumberFromCacheFresh, this._nwGetRawNumberFromCache |
| [`ageInfo`](../../../../src-ts/runtime-executables/main.ts#L28081) | – | this._nwGetCacheAgeMs |
| [`fromSigned`](../../../../src-ts/runtime-executables/main.ts#L28093) | signedRaw, src, opts2 | Math.abs, Math.round, Number, Number.isFinite, ageInfo |
| [`fromBalance`](../../../../src-ts/runtime-executables/main.ts#L28118) | – | Math.abs, Math.max, Math.round, Number, Number.isFinite, Object.assign, ageInfo, this._nwGetNumberFromCache, this._nwHasMappedDatapoint, this._nwResolveGridImportExportFromCache |
| [`NexoWattVis._nwNormalizeEnergyFlowTsMode`](../../../../src-ts/runtime-executables/main.ts#L28313) | value | String |
| [`NexoWattVis._nwGetEnergyFlowTsMode`](../../../../src-ts/runtime-executables/main.ts#L28336) | – | this._nwNormalizeEnergyFlowTsMode |
| [`NexoWattVis._nwBuildEnergyFlowTsEffectivePlan`](../../../../src-ts/runtime-executables/main.ts#L28361) | mode, runtimeValues, tsValues, shadowResult | Array.isArray, blockedReasons.push, this._nwEvaluateEnergyFlowPlantGate, this._nwGetEnergyFlowTsFixedSourceState, this._nwGetEnergyFlowTsSwitchConfig, this._nwIsEnergyFlowPlantGateWarmupOnly, this._nwNormalizeEnergyFlowTsMode, this._nwValidateEnergyFlowTsCandidate |
| [`NexoWattVis._nwValidateEnergyFlowTsCandidate`](../../../../src-ts/runtime-executables/main.ts#L28428) | tsShadow | Array.isArray, Math.abs, Math.max, Math.round, Number, Number.isFinite, String, blockers.push, farmRows.reduce, nwFeatureFlagsService.storagePerformanceProfile, this._nwCurrentLicenseEdition, warnings.push |
| [`NexoWattVis._nwGetEnergyFlowTsMirrorResolver`](../../../../src-ts/runtime-executables/main.ts#L28514) | – | path.join, require, this.log.debug |
| [`NexoWattVis._nwBuildEnergyFlowTsShadowInput`](../../../../src-ts/runtime-executables/main.ts#L28548) | ctx | Date.now, Number, Number.isFinite, String, idOf, storageSrc.indexOf, this._nwGetNumberFromCache, this._nwGetRawNumberFromCache, this._nwIsBatterySignInverted |
| [`idOf`](../../../../src-ts/runtime-executables/main.ts#L28550) | key | String |
| [`NexoWattVis._nwRunEnergyFlowTsShadowComparison`](../../../../src-ts/runtime-executables/main.ts#L28614) | ctx | Date.now, Math.max, Math.round, Number, Number.isFinite, String, compare, mismatches.join, resolver.buildEnergyFlowSnapshot, this._nwBuildEnergyFlowTsEffectivePlan, this._nwBuildEnergyFlowTsShadowInput, this._nwGetEnergyFlowTsMirrorResolver, this._nwGetEnergyFlowTsMode, this._nwNormalizeEnergyFlowTsMode (weitere in der Quelle) |
| [`compare`](../../../../src-ts/runtime-executables/main.ts#L28658) | key, label, tol | Math.abs, Number, Number.isFinite, mismatches.push |
| [`NexoWattVis._nwGetEnergyFlowTsSwitchConfig`](../../../../src-ts/runtime-executables/main.ts#L28722) | – | Math.max, Math.min, Math.round, Number, Number.isFinite, String |
| [`NexoWattVis._nwBuildEnergyFlowTsRuntimePlantSample`](../../../../src-ts/runtime-executables/main.ts#L28760) | tsShadow | Array.isArray, Date.now, String, blockers.push, mismatches.slice |
| [`NexoWattVis._nwSummarizeEnergyFlowTsRuntimePlantSamples`](../../../../src-ts/runtime-executables/main.ts#L28794) | samples | Array.isArray, Date.now, Math.round, list.filter, list.reduce, list.slice, samples.filter |
| [`NexoWattVis._nwUpdateEnergyFlowTsRuntimePlantEvaluation`](../../../../src-ts/runtime-executables/main.ts#L28836) | tsShadow | Array.isArray, Date.now, current.concat, this._nwBuildEnergyFlowTsRuntimePlantSample, this._nwSummarizeEnergyFlowTsRuntimePlantSamples |
| [`NexoWattVis._nwEvaluateEnergyFlowPlantGate`](../../../../src-ts/runtime-executables/main.ts#L28878) | cfg | Array.isArray, Math.max, Math.min, Math.round, Number, blockers.push, this._nwSummarizeTsShadowPlantSamples |
| [`NexoWattVis._nwIsEnergyFlowPlantGateWarmupOnly`](../../../../src-ts/runtime-executables/main.ts#L28929) | plantGate | Array.isArray, Number, blockers.every, plantGate.blockers.map |
| [`NexoWattVis._nwIsEnergyFlowHardFallbackReason`](../../../../src-ts/runtime-executables/main.ts#L28958) | reason | String, text.includes |
| [`NexoWattVis._nwBuildEnergyFlowFixedSourceInput`](../../../../src-ts/runtime-executables/main.ts#L28974) | switchState | Date.now, Number, String |
| [`NexoWattVis._nwUpdateEnergyFlowTsFixedSourceState`](../../../../src-ts/runtime-executables/main.ts#L29001) | switchState | Date.now, Math.max, Math.min, Math.round, Number, this._nwBuildEnergyFlowFixedSourceInput, this._nwGetEnergyFlowTsSwitchConfig, this._nwIsEnergyFlowHardFallbackReason |
| [`NexoWattVis._nwGetEnergyFlowTsFixedSourceState`](../../../../src-ts/runtime-executables/main.ts#L29058) | – | – |
| [`NexoWattVis._nwEvaluateEnergyFlowTsSwitch`](../../../../src-ts/runtime-executables/main.ts#L29091) | tsShadow | Array.isArray, Date.now, Math.max, Math.min, Math.round, Number, this._nwEvaluateEnergyFlowPlantGate, this._nwGetEnergyFlowTsFixedSourceState, this._nwGetEnergyFlowTsSwitchConfig, this._nwIsEnergyFlowPlantGateWarmupOnly, this._nwUpdateEnergyFlowTsRuntimePlantEvaluation, this._nwValidateEnergyFlowTsCandidate |
| [`NexoWattVis._nwBuildEffectiveEnergyFlowValues`](../../../../src-ts/runtime-executables/main.ts#L29210) | runtimeValues, tsShadow | this._nwBuildEnergyFlowTsCandidateAudit, this._nwEvaluateEnergyFlowTsSwitch, this._nwRecordEnergyFlowTsActiveTestSample, this._nwUpdateEnergyFlowTsFixedSourceState, valueOf |
| [`valueOf`](../../../../src-ts/runtime-executables/main.ts#L29217) | key, fallbackKey | Math.round, Number, Number.isFinite |
| [`NexoWattVis._nwRecordEnergyFlowTsActiveTestSample`](../../../../src-ts/runtime-executables/main.ts#L29261) | effective, runtimeValues, tsValues | Array.from, Array.isArray, Date.now, JSON.stringify, Math.round, Number, Number.isFinite, String, blockers.filter, blockers.push, candidate.blockers.map, sample.blockers.join, samples.push, samples.shift (weitere in der Quelle) |
| [`NexoWattVis._nwSummarizeEnergyFlowTsActiveTestSamples`](../../../../src-ts/runtime-executables/main.ts#L29327) | – | Array.isArray, Date.now, Math.round, samples.filter, samples.reduce, samples.slice, this._energyFlowTsActiveTestSamples.slice |
| [`NexoWattVis._nwBuildEnergyFlowTsCandidateAudit`](../../../../src-ts/runtime-executables/main.ts#L29394) | runtimeValues, tsValues, switchState, tsShadow | Array.isArray, Number, String, keys.map |
| [`NexoWattVis._nwEnergyFlowTsLiveTestStateFromSwitch`](../../../../src-ts/runtime-executables/main.ts#L29452) | switchState | String, reason.includes, source.includes |
| [`NexoWattVis._nwParseTsShadowJson`](../../../../src-ts/runtime-executables/main.ts#L29487) | raw, fallback | JSON.parse, String, text.slice |
| [`NexoWattVis._nwCollectTsShadowMismatches`](../../../../src-ts/runtime-executables/main.ts#L29512) | shadow | Array.isArray, Object.keys, String, add, shadow.diffs.forEach, shadow.mismatches.forEach |
| [`add`](../../../../src-ts/runtime-executables/main.ts#L29515) | entry, idx, prefix | String, out.push |
| [`NexoWattVis._nwEvaluateTsShadowBlock`](../../../../src-ts/runtime-executables/main.ts#L29556) | id, label, shadow, options | Math.max, Number, Number.isFinite, String, blockers.push, mismatches.slice, this._nwCollectTsShadowMismatches, warnings.push |
| [`NexoWattVis._nwBuildTsShadowPlantSample`](../../../../src-ts/runtime-executables/main.ts#L29600) | readiness | Array.isArray, Date.now, String, blockers.slice, readiness.blockers.map, readiness.warnings.map, safeBlock, warnings.slice |
| [`safeBlock`](../../../../src-ts/runtime-executables/main.ts#L29601) | block | Math.max, Math.round, Number, String |
| [`NexoWattVis._nwSummarizeTsShadowPlantSamples`](../../../../src-ts/runtime-executables/main.ts#L29644) | samples | Array.isArray, Date.now, Math.round, list.filter, list.reduce, list.slice, samples.filter |
| [`NexoWattVis._nwUpdateTsShadowPlantEvaluation`](../../../../src-ts/runtime-executables/main.ts#L29699) | _control, readiness | Array.isArray, Date.now, current.concat, this._nwBuildTsShadowPlantSample, this._nwSummarizeTsShadowPlantSamples |
| [`NexoWattVis._nwEvaluateEnergyFlowSwitchReadinessFromControl`](../../../../src-ts/runtime-executables/main.ts#L29743) | control | Date.now, blocks.every, blocks.flatMap, this._nwEvaluateTsShadowBlock, this._nwGetEnergyFlowTsMode, this._nwNormalizeEnergyFlowTsMode, this._nwParseTsShadowJson |
| [`NexoWattVis._nwRecordAndSummarizeTsShadowEvaluation`](../../../../src-ts/runtime-executables/main.ts#L29801) | control, readiness | Array.isArray, Date.now, JSON.stringify, Math.max, Math.round, Number, String, blockSummary, lastBlockers.slice, lastSample.coreLimits.blockers.map, lastSample.energyFlow.blockers.map, lastSample.heatingRod.blockers.map, list.filter, list.reduce (weitere in der Quelle) |
| [`blockSummary`](../../../../src-ts/runtime-executables/main.ts#L29803) | block, id | Array.isArray, Number, Number.isFinite, String, b.blockers.map, b.warnings.map |
| [`NexoWattVis._nwBuildTsShadowRealPlantEvaluation`](../../../../src-ts/runtime-executables/main.ts#L29927) | control | Array.isArray, Date.now, readiness.blockers.slice, readiness.warnings.slice, section, sections.every, sections.filter, this._nwEvaluateEnergyFlowSwitchReadinessFromControl, waiting.join, warnings.push |
| [`section`](../../../../src-ts/runtime-executables/main.ts#L29932) | id, label, ready, detail | Array.isArray, Number, Number.isFinite, String |
| [`NexoWattVis._nwResolveGridImportExportFromCache`](../../../../src-ts/runtime-executables/main.ts#L30008) | – | Date.now, Math.max, readFresh, resolveNvpDisplay, this._nwGetCacheAgeMs, this._nwGetNumberFromCacheFresh, this._nwHasMappedDatapoint, this._nwLiveInputMaxAgeMs |
| [`readFresh`](../../../../src-ts/runtime-executables/main.ts#L30017) | key, mapped | this._nwGetNumberFromCacheFresh |
| [`NexoWattVis._nwSetHistorieValue`](../../../../src-ts/runtime-executables/main.ts#L30043) | localId, val, ts, tolAbs | Math.abs, Math.max, Number, Number.isFinite, this.setLocalStateWithCache |
| [`NexoWattVis.ensureDerivedFlowStates`](../../../../src-ts/runtime-executables/main.ts#L30061) | – | this.setObjectNotExistsAsync |
| [`NexoWattVis.updateHistorieExportStates`](../../../../src-ts/runtime-executables/main.ts#L30313) | reason | Date.now, JSON.stringify, Math.abs, Math.max, Math.min, Math.round, Number, Number.isFinite, String, _boolOr, _computeNetFeeModeNow, _numOr, _strOr, parseJsonSafe (weitere in der Quelle) |
| [`_rawCacheValue`](../../../../src-ts/runtime-executables/main.ts#L30441) | key | – |
| [`_numOr`](../../../../src-ts/runtime-executables/main.ts#L30455) | key, fallback | Number, Number.isFinite, _rawCacheValue |
| [`_boolOr`](../../../../src-ts/runtime-executables/main.ts#L30469) | key, fallback | String, _rawCacheValue |
| [`_strOr`](../../../../src-ts/runtime-executables/main.ts#L30484) | key, fallback | String, _rawCacheValue |
| [`_parseTimeMinutes`](../../../../src-ts/runtime-executables/main.ts#L30495) | raw, defMinutes | Math.max, Math.min, Number, Number.isFinite, String, s.match |
| [`_isInWindow`](../../../../src-ts/runtime-executables/main.ts#L30510) | nowMin, startMin, endMin | Number.isFinite |
| [`_quarterOf`](../../../../src-ts/runtime-executables/main.ts#L30522) | tsMs | Date.now, Math.floor, Math.max, Math.min, Number, d.getMonth |
| [`_nowMinutesLocal`](../../../../src-ts/runtime-executables/main.ts#L30536) | tsMs | Date.now, Number, d.getHours, d.getMinutes |
| [`_computeNetFeeModeNow`](../../../../src-ts/runtime-executables/main.ts#L30550) | – | Math.round, Number, _boolOr, _isInWindow, _nowMinutesLocal, _numOr, _parseTimeMinutes, _quarterOf, _strOr, cachedMode.toLowerCase |
| [`parseJsonSafe`](../../../../src-ts/runtime-executables/main.ts#L30666) | raw | JSON.parse, String |
| [`NexoWattVis.scheduleRfidPolicyApply`](../../../../src-ts/runtime-executables/main.ts#L30766) | reason, onlyIndex | Number, this._nwSetTimeout |
| [`NexoWattVis.applyRfidPolicyAll`](../../../../src-ts/runtime-executables/main.ts#L30793) | reason | Array.isArray, this.applyRfidPolicyForIndex, this.isRfidEnabled, this.refreshRfidWhitelistFromCache |
| [`NexoWattVis.applyRfidPolicyForIndex`](../../../../src-ts/runtime-executables/main.ts#L30809) | index, reason, enabledOverride | Array.isArray, Date.now, Number, String, isActuatorAuthorityBlockedResult, this.evcsList.find, this.getStateAsync, this.isRfidEnabled, this.log.debug, this.normalizeRfidCandidate, this.refreshRfidWhitelistFromCache, this.setLocalStateWithCache, withActuatorShadowContext |
| [`NexoWattVis._nwTrimId`](../../../../src-ts/runtime-executables/main.ts#L30982) | v | v.trim |
| [`NexoWattVis._nwDetectInfluxInstance`](../../../../src-ts/runtime-executables/main.ts#L30993) | – | this._nwTrimId, this.getForeignObjectAsync |
| [`NexoWattVis._nwGetHistoryInstance`](../../../../src-ts/runtime-executables/main.ts#L31015) | – | this._nwTrimId |
| [`NexoWattVis._nwGetPara14aInfluxTargetDays`](../../../../src-ts/runtime-executables/main.ts#L31026) | – | – |
| [`NexoWattVis._nwGetPara14aInfluxTargetRetentionSeconds`](../../../../src-ts/runtime-executables/main.ts#L31035) | – | this._nwGetPara14aInfluxTargetDays |
| [`NexoWattVis._nwGetPara14aInfluxDbName`](../../../../src-ts/runtime-executables/main.ts#L31044) | – | Math.max, Math.round, Number, Number.isFinite |
| [`NexoWattVis._nwGetOwnHostName`](../../../../src-ts/runtime-executables/main.ts#L31054) | – | os.hostname, this._nwTrimId, this.getForeignObjectAsync |
| [`NexoWattVis._nwListAdapterInstances`](../../../../src-ts/runtime-executables/main.ts#L31079) | adapterName | Number, Number.isInteger, Object.entries, String, inst.slice, inst.startsWith, out.push, out.sort, this._nwTrimId, this.getForeignObjectsAsync |
| [`NexoWattVis._nwPickFreeAdapterInstanceNumber`](../../../../src-ts/runtime-executables/main.ts#L31105) | existingNums, preferred | Array.isArray, Math.round, Number, Number.isInteger, used.has |
| [`NexoWattVis._nwBuildPara14aInfluxNative`](../../../../src-ts/runtime-executables/main.ts#L31124) | baseNative, meta | Date.now, JSON.parse, JSON.stringify, Object.assign, this._nwGetPara14aInfluxDbName, this._nwGetPara14aInfluxTargetDays, this._nwGetPara14aInfluxTargetRetentionSeconds, this._nwTrimId |
| [`NexoWattVis._nwBuildPara14aInfluxCommon`](../../../../src-ts/runtime-executables/main.ts#L31147) | baseCommon, host | JSON.parse, JSON.stringify, Object.assign, this._nwTrimId |
| [`NexoWattVis._nwEnsurePara14aInfluxInstance`](../../../../src-ts/runtime-executables/main.ts#L31168) | force | Date.now, Number, String, configured.startsWith, disableManagedDedicatedInstances, finish, pickSharedInfluxInstance, this._nwListAdapterInstances, this._nwTrimId, this.getForeignObjectAsync |
| [`finish`](../../../../src-ts/runtime-executables/main.ts#L31181) | partial | Date.now, Object.assign, this._nwTrimId |
| [`isManagedPara14aInstance`](../../../../src-ts/runtime-executables/main.ts#L31201) | it | String |
| [`pickSharedInfluxInstance`](../../../../src-ts/runtime-executables/main.ts#L31213) | instances | Array.isArray, arr.filter, arr.find, enabled.find, instances.filter |
| [`disableManagedDedicatedInstances`](../../../../src-ts/runtime-executables/main.ts#L31232) | instances, keepInstanceId | Array.isArray, String, isManagedPara14aInstance, this._nwTrimId, this.log.debug, this.log.info, this.nwSimSetInstanceEnabled |
| [`NexoWattVis._nwGetCanonicalHistorieId`](../../../../src-ts/runtime-executables/main.ts#L31300) | legacyKey | String, k.match |
| [`NexoWattVis._nwGetHistoryDpCandidates`](../../../../src-ts/runtime-executables/main.ts#L31331) | name | Object.assign, String, add, raw.slice, raw.startsWith, this._nwGetCanonicalHistorieId, this._nwTrimId |
| [`add`](../../../../src-ts/runtime-executables/main.ts#L31373) | id | out.includes, out.push, this._nwTrimId |
| [`NexoWattVis._nwGetHistoryDpId`](../../../../src-ts/runtime-executables/main.ts#L31444) | name | this._nwGetHistoryDpCandidates |
| [`NexoWattVis._nwGetHistoryApiCached`](../../../../src-ts/runtime-executables/main.ts#L31454) | key, maxAgeMs | Date.now, Math.max, Number, Number.isFinite, cache.delete, cache.entries, cache.get |
| [`NexoWattVis._nwSetHistoryApiCached`](../../../../src-ts/runtime-executables/main.ts#L31478) | key, payload | Date.now, this._nwHistoryApiCache.delete, this._nwHistoryApiCache.keys, this._nwHistoryApiCache.set |
| [`NexoWattVis._derivedRefreshPvInvertersCache`](../../../../src-ts/runtime-executables/main.ts#L31495) | force | Date.now, Object.entries, String, addCfg, cache.cache.delete, cache.cache.set, collect, ids.join, ids.sort, list.map, list.push, newIds.add, newIds.has, oldIds.has (weitere in der Quelle) |
| [`collect`](../../../../src-ts/runtime-executables/main.ts#L31510) | arr | Array.isArray, ids.push, this._nwTrimId |
| [`addCfg`](../../../../src-ts/runtime-executables/main.ts#L31570) | arr, tag | Array.isArray, String, list.push, nwPhysicalPvSourceKey, pid.toLowerCase, seenPower.add, seenPower.has, this._nwTrimId |
| [`NexoWattVis.scheduleDerivedFlowUpdate`](../../../../src-ts/runtime-executables/main.ts#L31628) | reason | Date.now, this._nwSetTimeout |
| [`NexoWattVis.updateDerivedFlowStates`](../../../../src-ts/runtime-executables/main.ts#L31656) | reason | Date.now, JSON.stringify, Math.abs, Math.max, Math.min, Math.round, Number, Number.isFinite, String, nwApplyPvCapacityPlausibility, pushTs, pvAuto?.cache?.get, pvBaseSourceIds.includes, pvBaseSourceIds.push (weitere in der Quelle) |
| [`pushTs`](../../../../src-ts/runtime-executables/main.ts#L31897) | k | Number.isFinite, tsList.push |
| [`updateLocal`](../../../../src-ts/runtime-executables/main.ts#L32291) | k, v | Number, Number.isFinite, this.updateValue |
| [`NexoWattVis._nwHasMappedDatapoint`](../../../../src-ts/runtime-executables/main.ts#L32329) | key | this._nwTrimId |
| [`NexoWattVis._nwNormTsMs`](../../../../src-ts/runtime-executables/main.ts#L32339) | tRaw | Date.parse, Number, Number.isFinite, Number.isNaN, tRaw.getTime |
| [`NexoWattVis._nwChooseStepMs`](../../../../src-ts/runtime-executables/main.ts#L32356) | spanMs, targetPoints, minStepMs | Math.ceil, Math.max, Number |
| [`NexoWattVis._nwChooseEnergyIntegrationStepMs`](../../../../src-ts/runtime-executables/main.ts#L32379) | spanMs, minStepMs, maxStepMs | Math.max, Math.min, Number, this._nwChooseStepMs |
| [`NexoWattVis._nwNormalizeHistoryResult`](../../../../src-ts/runtime-executables/main.ts#L32390) | resu | Array.isArray, norm.sort |
| [`NexoWattVis._nwGetHistoryAvgSeries`](../../../../src-ts/runtime-executables/main.ts#L32423) | id, startMs, endMs, stepMs | – |
| [`NexoWattVis._nwGetHistoryAvgSeriesAny`](../../../../src-ts/runtime-executables/main.ts#L32444) | candidates, startMs, endMs, stepMs | Array.isArray, this._nwGetHistoryAvgSeries, this._nwTrimId |
| [`NexoWattVis._nwAtypicalReviewParseTs`](../../../../src-ts/runtime-executables/main.ts#L32462) | raw, fallback, endOfDay | Date.parse, Math.round, Number, Number.isFinite, Number.isNaN, String, dt.getTime, dt.setHours, s.split |
| [`NexoWattVis._nwAtypicalReviewDateTime`](../../../../src-ts/runtime-executables/main.ts#L32486) | ts | Date.now, Number, d.getDate, d.getFullYear, d.getHours, d.getMinutes, d.getMonth, pad |
| [`pad`](../../../../src-ts/runtime-executables/main.ts#L32495) | n | String |
| [`NexoWattVis._nwAtypicalReviewCsvCell`](../../../../src-ts/runtime-executables/main.ts#L32507) | v | String |
| [`NexoWattVis._nwAtypicalReviewNumber`](../../../../src-ts/runtime-executables/main.ts#L32518) | v, digits | Math.round, Number, Number.isFinite, String, n.toFixed |
| [`NexoWattVis._nwAtypicalReviewReadState`](../../../../src-ts/runtime-executables/main.ts#L32529) | localId, fallback | Object.prototype.hasOwnProperty.call, String, this.getStateAsync, this.namespace.replace |
| [`NexoWattVis._nwAtypicalReviewReadNumber`](../../../../src-ts/runtime-executables/main.ts#L32549) | localId, fallback | Number, Number.isFinite, this._nwAtypicalReviewReadState |
| [`NexoWattVis._nwAtypicalReviewReadBool`](../../../../src-ts/runtime-executables/main.ts#L32560) | localId, fallback | String, this._nwAtypicalReviewReadState |
| [`NexoWattVis._nwAtypicalReviewReadString`](../../../../src-ts/runtime-executables/main.ts#L32575) | localId, fallback | String, this._nwAtypicalReviewReadState |
| [`NexoWattVis._nwBuildAtypicalReviewExportPayload`](../../../../src-ts/runtime-executables/main.ts#L32580) | query | Array.from, Array.isArray, Date.now, JSON.parse, Math.max, Math.min, Math.round, Number, Number.isFinite, Object.assign, Object.entries, Object.values, Promise.all, String (weitere in der Quelle) |
| [`NexoWattVis._nwAtypicalReviewPayloadToCsv`](../../../../src-ts/runtime-executables/main.ts#L32742) | payload | Array.isArray, Date.now, add, rows.join, this._nwAtypicalReviewDateTime, this._nwAtypicalReviewNumber |
| [`add`](../../../../src-ts/runtime-executables/main.ts#L32753) | cols | rows.push |
| [`NexoWattVis._nwAtypicalReviewAscii`](../../../../src-ts/runtime-executables/main.ts#L32810) | text | String |
| [`NexoWattVis._nwAtypicalReviewPdfEscape`](../../../../src-ts/runtime-executables/main.ts#L32828) | text | this._nwAtypicalReviewAscii |
| [`NexoWattVis._nwAtypicalReviewWrap`](../../../../src-ts/runtime-executables/main.ts#L32837) | text, maxLen | out.push, s.split, this._nwAtypicalReviewAscii |
| [`NexoWattVis._nwAtypicalReviewPayloadToPdf`](../../../../src-ts/runtime-executables/main.ts#L32856) | payload | Array.isArray, Buffer.concat, Buffer.from, Date.now, String, addObj, chunks.push, lines.push, p.seriesRows.slice, page.push, pageRefs.join, pages.forEach, pages.push, this._nwAtypicalReviewDateTime (weitere in der Quelle) |
| [`yesNo`](../../../../src-ts/runtime-executables/main.ts#L32867) | v | – |
| [`addObj`](../../../../src-ts/runtime-executables/main.ts#L32929) | body | Buffer.from, Buffer.isBuffer, String, objects.push |
| [`NexoWattVis._nwIntegrateKwh`](../../../../src-ts/runtime-executables/main.ts#L32979) | series, endMs, defaultStepMs, positiveOnly | Array.isArray, Date.now, Math.abs, Math.max, Math.min, Number, Number.isFinite |
| [`NexoWattVis.updateEnergyTotalsFromInflux`](../../../../src-ts/runtime-executables/main.ts#L33009) | reason | Date.now, Math.max, Number, Number.isFinite, Promise.allSettled, persistLocal, tasks.push, this._nwGetHistoryDpCandidates, this._nwHasMappedDatapoint, this.updateValue |
| [`persistLocal`](../../../../src-ts/runtime-executables/main.ts#L33020) | key, val | this.setStateAsync |
| [`NexoWattVis.updateValue`](../../../../src-ts/runtime-executables/main.ts#L33153) | key, value, ts, opts | Date.now, Math.abs, Math.max, Math.round, Number, Number.isFinite, Object.assign, String, d.getDate, d.getFullYear, d.getMonth, isNaN, key.match, key.startsWith (weitere in der Quelle) |
| [`NexoWattVis._nwClearTimer`](../../../../src-ts/runtime-executables/main.ts#L33288) | refName | this._nwClearInterval, this._nwClearTimeout |
| [`NexoWattVis._nwCloseSseClients`](../../../../src-ts/runtime-executables/main.ts#L33302) | – | Array.from, client.res.end, this._nwClearTimer, this._nwSseGuard.closeAll, this.sseClients.clear |
| [`NexoWattVis._nwCloseServer`](../../../../src-ts/runtime-executables/main.ts#L33322) | callback | done, finish, server.close, setTimeout, this._nwCloseSseClients |
| [`clearTimers`](../../../../src-ts/runtime-executables/main.ts#L33359) | – | clearTimeout |
| [`finish`](../../../../src-ts/runtime-executables/main.ts#L33371) | – | clearTimers, done, this._serverSockets.clear |
| [`NexoWattVis.onUnload`](../../../../src-ts/runtime-executables/main.ts#L33409) | callback | Date.now, clearTimeout, done, this._adminOverviewPublisher?.stop, this._meshCoordinator?.stop, this._nwCentralLicense?.stop, this._nwClearInterval, this._nwClearTimer, this._nwCloseServer, this._nwCloseSseClients, this._nwSetInfoConnection, this._nwSmartHomePulseTimers.clear, this._nwSmartHomePulseTimers.entries, this._nwStopConnectionHeartbeat (weitere in der Quelle) |
