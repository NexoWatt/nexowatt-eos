# src-ts/runtime-executables/ems/module-manager.ts

Stellt die EMS-Modulreihenfolge her, übergibt den gemeinsamen Kontext und erfasst isoliert Fehler und Laufzeiten je Modul.

**Daten und Wirkung:** Erhält den Engine-Kontext und führt aktivierte Module in der festgelegten Reihenfolge aus. Diagnose und Fehlerisolation gehören zu diesem Ablauf; Modulreihenfolge ist fachlich wirksam.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/ems/module-manager.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `./rc85-runtime-hardening` | [src-ts/runtime-executables/ems/rc85-runtime-hardening.ts](../../../../../src-ts/runtime-executables/ems/rc85-runtime-hardening.ts) |
| `./modules/storage-mapping` | [src-ts/runtime-executables/ems/modules/storage-mapping.ts](../../../../../src-ts/runtime-executables/ems/modules/storage-mapping.ts) |
| `./modules/storage-control` | [src-ts/runtime-executables/ems/modules/storage-control.ts](../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts) |
| `./modules/netoperator-interface` | [src-ts/runtime-executables/ems/modules/netoperator-interface.ts](../../../../../src-ts/runtime-executables/ems/modules/netoperator-interface.ts) |
| `./modules/grid-constraints` | [src-ts/runtime-executables/ems/modules/grid-constraints.ts](../../../../../src-ts/runtime-executables/ems/modules/grid-constraints.ts) |
| `./modules/nvp-coordinator` | [src-ts/runtime-executables/ems/modules/nvp-coordinator.ts](../../../../../src-ts/runtime-executables/ems/modules/nvp-coordinator.ts) |
| `./modules/peak-shaving` | [src-ts/runtime-executables/ems/modules/peak-shaving.ts](../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts) |
| `./modules/tariff-provider` | [src-ts/runtime-executables/ems/modules/tariff-provider.ts](../../../../../src-ts/runtime-executables/ems/modules/tariff-provider.ts) |
| `./modules/tarif-vis` | [src-ts/runtime-executables/ems/modules/tarif-vis.ts](../../../../../src-ts/runtime-executables/ems/modules/tarif-vis.ts) |
| `./modules/tariff-status` | [src-ts/runtime-executables/ems/modules/tariff-status.ts](../../../../../src-ts/runtime-executables/ems/modules/tariff-status.ts) |
| `./modules/pv-forecast` | [src-ts/runtime-executables/ems/modules/pv-forecast.ts](../../../../../src-ts/runtime-executables/ems/modules/pv-forecast.ts) |
| `./modules/charging-management` | [src-ts/runtime-executables/ems/modules/charging-management.ts](../../../../../src-ts/runtime-executables/ems/modules/charging-management.ts) |
| `./modules/multi-use` | [src-ts/runtime-executables/ems/modules/multi-use.ts](../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts) |
| `./modules/para14a` | [src-ts/runtime-executables/ems/modules/para14a.ts](../../../../../src-ts/runtime-executables/ems/modules/para14a.ts) |
| `./modules/core-limits` | [src-ts/runtime-executables/ems/modules/core-limits.ts](../../../../../src-ts/runtime-executables/ems/modules/core-limits.ts) |
| `./modules/operating-strategies` | [src-ts/runtime-executables/ems/modules/operating-strategies.ts](../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts) |
| `./modules/thermal-control` | [src-ts/runtime-executables/ems/modules/thermal-control.ts](../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts) |
| `./modules/heating-rod-control` | [src-ts/runtime-executables/ems/modules/heating-rod-control.ts](../../../../../src-ts/runtime-executables/ems/modules/heating-rod-control.ts) |
| `./modules/nexologic-budget` | [src-ts/runtime-executables/ems/modules/nexologic-budget.ts](../../../../../src-ts/runtime-executables/ems/modules/nexologic-budget.ts) |
| `./modules/bhkw-control` | [src-ts/runtime-executables/ems/modules/bhkw-control.ts](../../../../../src-ts/runtime-executables/ems/modules/bhkw-control.ts) |
| `./modules/generator-control` | [src-ts/runtime-executables/ems/modules/generator-control.ts](../../../../../src-ts/runtime-executables/ems/modules/generator-control.ts) |
| `./modules/threshold-control` | [src-ts/runtime-executables/ems/modules/threshold-control.ts](../../../../../src-ts/runtime-executables/ems/modules/threshold-control.ts) |
| `./modules/ai-advisor` | [src-ts/runtime-executables/ems/modules/ai-advisor.ts](../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts) |
| `./modules/country-profile` | [src-ts/runtime-executables/ems/modules/country-profile.ts](../../../../../src-ts/runtime-executables/ems/modules/country-profile.ts) |
| `./modules/energy-wallet` | [src-ts/runtime-executables/ems/modules/energy-wallet.ts](../../../../../src-ts/runtime-executables/ems/modules/energy-wallet.ts) |
| `./modules/charge-kiosk` | [src-ts/runtime-executables/ems/modules/charge-kiosk.ts](../../../../../src-ts/runtime-executables/ems/modules/charge-kiosk.ts) |
| `./modules/energy-ledger` | [src-ts/runtime-executables/ems/modules/energy-ledger.ts](../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts) |
| `./modules/nl-p1-dsmr` | [src-ts/runtime-executables/ems/modules/nl-p1-dsmr.ts](../../../../../src-ts/runtime-executables/ems/modules/nl-p1-dsmr.ts) |
| `./modules/mesh-microgrid` | [src-ts/runtime-executables/ems/modules/mesh-microgrid.ts](../../../../../src-ts/runtime-executables/ems/modules/mesh-microgrid.ts) |
| `./modules/stage-a-diagnostics` | [src-ts/runtime-executables/ems/modules/stage-a-diagnostics.ts](../../../../../src-ts/runtime-executables/ems/modules/stage-a-diagnostics.ts) |
| `./services/actuator-shadow-arbiter` | [src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts](../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts) |
| `./services/accepted-power-effects` | [src-ts/runtime-executables/ems/services/accepted-power-effects.ts](../../../../../src-ts/runtime-executables/ems/services/accepted-power-effects.ts) |
| `./services/feature-flags` | [src-ts/runtime-executables/ems/services/feature-flags.ts](../../../../../src-ts/runtime-executables/ems/services/feature-flags.ts) |
| `./services/safety-envelope` | [src-ts/runtime-executables/ems/services/safety-envelope.ts](../../../../../src-ts/runtime-executables/ems/services/safety-envelope.ts) |
| `./services/country-profile-service` | [src-ts/runtime-executables/ems/services/country-profile-service.ts](../../../../../src-ts/runtime-executables/ems/services/country-profile-service.ts) |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/engine.ts](../../../../../src-ts/runtime-executables/ems/engine.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`keyFromModule`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L155) | moduleRow | String |
| [`ModuleManager.constructor`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L186) | adapter, dpRegistry | startRc85HeapMonitor |
| [`getDiagnostics`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L214) | – | rc88RuntimeHardeningSnapshot, this.adapter?._nwGetMemoryDiagnostics |
| [`onPressure`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L218) | sample | this.adapter?._nwHandleHeapPressure |
| [`onBeforeRestart`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L219) | sample | this.adapter?._nwPrepareControlledRestart |
| [`ModuleManager._licenseEdition`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L246) | – | featureFlags.normalizeEdition, this.adapter?._nwCurrentLicenseEdition |
| [`ModuleManager._licenseAllowsApp`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L253) | appId | String, this.adapter?._nwLicenseAllowsAppId |
| [`ModuleManager._getDiagCfg`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L259) | – | Math.round, Number, Number.isFinite |
| [`ModuleManager._diagLog`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L294) | level, msg | fn.call |
| [`ModuleManager._limitJson`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L318) | obj, maxLen | JSON.stringify, Number.isFinite, s.slice |
| [`ModuleManager._ensureModuleInitialized`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L335) | moduleRow, reason, cycleId | Date.now, Math.max, Number, Number.isFinite, String, keyFromModule, priorityForOwner, this.adapter.log.warn, withActuatorShadowContext |
| [`ModuleManager._deactivateModule`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L376) | moduleRow, cycleId, force | Date.now, SAFETY_ACTUATOR_MODULES.has, String, invalidateSafetyEnvelope, keyFromModule, priorityForOwner, this._ensureModuleInitialized, this.adapter.log.warn, this.adapter?._nwRequestImmediateEmsTick, withActuatorShadowContext |
| [`ModuleManager.init`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L452) | – | SAFETY_ACTUATOR_MODULES.has, String, alwaysInit.has, gridConstraintsModule.setDeferredDynamicPv, m.enabledFn, this._deactivateModule, this._ensureModuleInitialized, this.modules.push |
| [`enabledFn`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L457) | – | – |
| [`enabledFn`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L464) | – | – |
| [`enabledFn`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L475) | – | this._licenseAllowsApp |
| [`enabledFn`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L492) | – | – |
| [`enabledFn`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L499) | – | this._licenseAllowsApp |
| [`enabledFn`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L507) | – | require, this._licenseAllowsApp |
| [`enabledFn`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L516) | – | – |
| [`enabledFn`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L523) | – | – |
| [`enabledFn`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L531) | – | – |
| [`enabledFn`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L538) | – | – |
| [`enabledFn`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L548) | – | this._licenseAllowsApp |
| [`enabledFn`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L561) | – | Array.isArray, Number, Number.isFinite, this._licenseAllowsApp |
| [`enabledFn`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L593) | – | String, this._licenseAllowsApp |
| [`enabledFn`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L605) | – | this._licenseAllowsApp |
| [`enabledFn`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L614) | – | this._licenseAllowsApp |
| [`enabledFn`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L628) | – | this._licenseAllowsApp |
| [`enabledFn`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L644) | – | this._licenseAllowsApp |
| [`enabledFn`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L661) | – | this._licenseAllowsApp |
| [`enabledFn`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L670) | – | this._licenseAllowsApp |
| [`enabledFn`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L679) | – | this._licenseAllowsApp |
| [`enabledFn`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L688) | – | this._licenseAllowsApp |
| [`enabledFn`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L697) | – | – |
| [`enabledFn`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L704) | – | this._licenseAllowsApp |
| [`enabledFn`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L710) | – | this._licenseAllowsApp |
| [`enabledFn`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L718) | – | this._licenseAllowsApp |
| [`enabledFn`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L734) | – | – |
| [`enabledFn`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L742) | – | – |
| [`enabledFn`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L752) | – | this._licenseAllowsApp |
| [`enabledFn`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L761) | – | – |
| [`ModuleManager.tick`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L801) | – | Array.isArray, Date.now, Math.max, Math.min, Number, Number.isFinite, SAFETY_CRITICAL_MODULES.has, String, beginAcceptedPowerEffectCycle, beginSafetyCycle, errors.push, errors.slice, invalidateSafetyEnvelope, m.enabledFn (weitere in der Quelle) |
| [`ModuleManager.stop`](../../../../../src-ts/runtime-executables/ems/module-manager.ts#L1027) | – | m.instance.stop, rc88ClearRuntimeHardening, this._stopHeapMonitor |
