# src-ts/runtime-executables/ems/modules/storage-control.ts

Berechnet Speicher-Laden und -Entladen unter Berücksichtigung von Netzbedarf, SOC, Tarif, Schutzvorgaben und Speicherfarm.

**Daten und Wirkung:** Verarbeitet NVP-, Batterie- und SoC-Messwerte sowie zentrale PV-/Gesamtbudgets. Ein befristeter Nulleinspeise-Test darf ausschließlich über den gemeinsamen Koordinator zusätzliche Ladeleistung anfordern; Tarif-, SoC-, Reglerhoheit- und Hardwaregrenzen bleiben maßgeblich.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `./base` | [src-ts/runtime-executables/ems/modules/base.ts](../../../../../../src-ts/runtime-executables/ems/modules/base.ts) |
| `../services/measurement-freshness` | [src-ts/runtime-executables/ems/services/measurement-freshness.ts](../../../../../../src-ts/runtime-executables/ems/services/measurement-freshness.ts) |
| `../services/operating-strategy-runtime` | [src-ts/runtime-executables/ems/services/operating-strategy-runtime.ts](../../../../../../src-ts/runtime-executables/ems/services/operating-strategy-runtime.ts) |
| `../services/storage-override-bridge` | [src-ts/runtime-executables/ems/services/storage-override-bridge.ts](../../../../../../src-ts/runtime-executables/ems/services/storage-override-bridge.ts) |
| `../services/storage-zero-write-policy` | [src-ts/runtime-executables/ems/services/storage-zero-write-policy.ts](../../../../../../src-ts/runtime-executables/ems/services/storage-zero-write-policy.ts) |
| `../services/storage-async-feedback-anchor` | [src-ts/runtime-executables/ems/services/storage-async-feedback-anchor.ts](../../../../../../src-ts/runtime-executables/ems/services/storage-async-feedback-anchor.ts) |
| `../services/zero-export-pv-coordinator` | [src-ts/runtime-executables/ems/services/zero-export-pv-coordinator.ts](../../../../../../src-ts/runtime-executables/ems/services/zero-export-pv-coordinator.ts) |
| `../services/storage-self-consumption-policy` | [src-ts/runtime-executables/ems/services/storage-self-consumption-policy.ts](../../../../../../src-ts/runtime-executables/ems/services/storage-self-consumption-policy.ts) |
| `../services/feature-flags` | [src-ts/runtime-executables/ems/services/feature-flags.ts](../../../../../../src-ts/runtime-executables/ems/services/feature-flags.ts) |
| `../services/storage-datapoint-config` | [src-ts/runtime-executables/ems/services/storage-datapoint-config.ts](../../../../../../src-ts/runtime-executables/ems/services/storage-datapoint-config.ts) |
| `../services/fenecon-hybrid-control` | [src-ts/runtime-executables/ems/services/fenecon-hybrid-control.ts](../../../../../../src-ts/runtime-executables/ems/services/fenecon-hybrid-control.ts) |
| `../services/fenecon-nvp-shadow-runtime` | [src-ts/runtime-executables/ems/services/fenecon-nvp-shadow-runtime.ts](../../../../../../src-ts/runtime-executables/ems/services/fenecon-nvp-shadow-runtime.ts) |
| `../services/safety-envelope` | [src-ts/runtime-executables/ems/services/safety-envelope.ts](../../../../../../src-ts/runtime-executables/ems/services/safety-envelope.ts) |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/module-manager.ts](../../../../../../src-ts/runtime-executables/ems/module-manager.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`strictFiniteNumber`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L95) | value, fallback | Number, Number.isFinite, value.trim |
| [`resolveStorageZeroExportProbeRequest`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L112) | ctx | Math.floor, Math.max, Math.min, String, allowedSources.includes, strictFiniteNumber |
| [`isCentralStorageGridChargeSource`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L152) | src, signedTargetW | Number, String |
| [`resolveStrictStorageTariffPermission`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L173) | snapshot, { nowMs = Date.now(), snapshotMaxAgeMs = 15000, } | Date.now, Math.max, Math.round, Number, String, strictFiniteNumber |
| [`resolveStorageGridChargeGateSource`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L261) | { targetW = 0, source = '', policySourceBeforeVendor = '', } | String, isCentralStorageGridChargeSource |
| [`resolveStorageGridChargeFinalGate`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L274) | { targetW = 0, source = '', configured = false, allowed = false, blockReason = '', } | Number, String, isCentralStorageGridChargeSource |
| [`resolveStoragePvOnlyChargeSafetyGate`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L305) | { targetW = 0, gridChargeAllowed = false, signedNvpW = null, batteryPowerW = null, batteryPowerTrusted = false, targetImportW = 0, validatedPvFeedForwardChargeW = null, blockReason = '', } | Math.max, Math.min, Math.round, String, strictFiniteNumber |
| [`resolveStorageLicenseEdition`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L416) | adapter | String, raw.toLowerCase, storageFeatureFlags.normalizeEdition |
| [`deriveStorageRatedPowerW`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L435) | cfg, farmRows, selectedTopology | Array.isArray, Math.round, Number, Number.isFinite, String, farmRows.reduce |
| [`resolveStorageLicensePowerProfile`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L451) | adapter, cfg, farmRows, selectedTopology | deriveStorageRatedPowerW, resolveStorageLicenseEdition, storageFeatureFlags.storagePerformanceProfile |
| [`applyStorageLicensePowerLimit`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L481) | targetW, profile | Math.abs, Math.max, Math.min, Number, Number.isFinite, String |
| [`resolveEvcsStorageProtectionSnapshot`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L522) | policy, options | Array.isArray, Date.now, Math.max, Number, Number.isFinite, String, count, validNonNegative, watts |
| [`count`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L523) | value | Math.floor, Math.max, Number, Number.isFinite |
| [`watts`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L524) | value | Math.max, Number, Number.isFinite |
| [`validNonNegative`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L529) | value | Number, Number.isFinite, String |
| [`resolveEvcsProtectedStorageTarget`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L556) | input | Math.abs, Math.max, Math.min, Number, String, finite |
| [`finite`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L557) | v | Number, Number.isFinite |
| [`resolveStorageAntiExportTarget`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L785) | input | Date.now, Math.max, Math.min, Math.round, Number, clamp01, finite |
| [`finite`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L786) | value | Number, Number.isFinite |
| [`clamp01`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L787) | value | Math.max, Math.min, Number |
| [`RollingWindow.constructor`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L1076) | maxSeconds | Math.max, Number |
| [`RollingWindow.setMaxSeconds`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L1088) | maxSeconds | Date.now, Math.max, Number, this._purge |
| [`RollingWindow._purge`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L1102) | nowMs | this.samples.shift |
| [`RollingWindow.push`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L1116) | v, nowMs | Date.now, Number, Number.isFinite, this._purge, this.samples.push |
| [`RollingWindow.mean`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L1130) | – | – |
| [`RollingWindow.count`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L1137) | – | – |
| [`hystAbove`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L1155) | prev, x, offBelow, onAbove | Number.isFinite |
| [`hystBelow`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L1176) | prev, x, onBelow, offAbove | Number.isFinite |
| [`SpeicherRegelungModule.constructor`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L1213) | adapter, dpRegistry | super |
| [`SpeicherRegelungModule.init`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L1406) | – | this._ensureStates, this._upsertInputsFromConfig |
| [`SpeicherRegelungModule.deactivate`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L1418) | – | Math.abs, Number, Number.isFinite, String, outputKeys.some, this._applyTargetW, this._getStorageControlAuthority, this.adapter.getStateAsync |
| [`SpeicherRegelungModule.tick`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L1456) | – | Array.isArray, Date.now, JSON.parse, JSON.stringify, Math.abs, Math.floor, Math.max, Math.min, Math.round, Math.sign, Number, Number.isFinite, String, adj.toFixed (weitere in der Quelle) |
| [`measurementTsFor`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L1968) | key | Number, Number.isFinite, this.dp.getEntry, this.dp.getMeasurementTimestampMs |
| [`isCentralPvChargeSource`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L2504) | src, signedTargetW | Number, String |
| [`isDeferredSungrowChargeCapReason`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L2530) | capReason | String, text.includes |
| [`isDeferredSungrowDischargeCapReason`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L2554) | capReason | String, text.includes |
| [`resolveStoragePvBudgetW`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L2570) | runtime, _allocationGate, fallbackW | Math.max, Number, Number.isFinite, grantFn, runtime.getPvGrant.bind, runtime.grant.bind |
| [`stripProtectedEvcsLoadW`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L2701) | w | Math.max, Number |
| [`isStorageBalanceSource`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L2708) | src | String |
| [`getLastStorageBalanceTargetW`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L2712) | – | Number, Number.isFinite, isStorageBalanceSource |
| [`readCacheNumber`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L2728) | key, fallback | Number, Number.isFinite, String, this.adapter._nwGetNumberFromCache |
| [`buildStorageFeedForward`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L2754) | targetNvpW | Math.max, num, this._buildIndependentPvLoadFeedForward |
| [`getFeneconAcLoadTargetW`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L2777) | – | Math.abs, Math.max, Number.isFinite, num, readCacheNumber, stripProtectedEvcsLoadW |
| [`SpeicherRegelungModule._buildSelfNvpControlSignal`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L6702) | rawOrFilteredW, nowMs, cfg, targetW, deadbandW | Date.now, Math.max, Math.min, Number, Number.isFinite, clamp, num |
| [`SpeicherRegelungModule._resolveFeneconDirectNvpFeedback`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L6795) | ctx | Date.now, Math.max, Math.min, Number, Number.isFinite, feedback, finite, read, this.dp.getAgeMs, this.dp.getEntry, this.dp.getNumber |
| [`finite`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L6796) | value | Number, Number.isFinite |
| [`feedback`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L6802) | key, valueW, source, sampleTs, ageMs, objectId | Math.max, Math.round, Number, String, finite |
| [`read`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L6831) | key, source | Number, Number.isFinite, feedback, this.dp.getAgeMs, this.dp.getEntry, this.dp.getMeasurementTimestampMs, this.dp.getNumber |
| [`SpeicherRegelungModule._resolveBatteryBalanceFeedback`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L6910) | ctx | Date.now, Math.abs, Math.max, Math.round, Number, String, finite, resetCache |
| [`finite`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L6911) | v | Number, Number.isFinite |
| [`resetCache`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L6929) | – | – |
| [`SpeicherRegelungModule._buildIndependentPvLoadFeedForward`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L7115) | ctx | Date.now, Math.max, Math.min, Number, String, finite, getCacheAgeMs, getCacheString, getCacheValue, isMapped, pushPv, pvCandidates.sort, this.dp.getAgeMs, this.dp.getEntry (weitere in der Quelle) |
| [`finite`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L7116) | v | Number, Number.isFinite |
| [`getCacheRecord`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L7126) | key | String |
| [`getCacheAgeMs`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L7133) | key | Math.max, Number, Number.isFinite, adapter._nwGetCacheAgeMs, finite, getCacheRecord |
| [`getCacheValue`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L7146) | key, fallback | Number, Number.isFinite, adapter._nwGetNumberFromCacheFresh, finite, getCacheAgeMs, getCacheRecord |
| [`getCacheString`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L7162) | key | String, getCacheRecord |
| [`isMapped`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L7167) | key | String, adapter._nwHasMappedDatapoint |
| [`pushPv`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L7235) | value, source, ageMs, priority | Math.max, Number, finite, pvCandidates.push |
| [`SpeicherRegelungModule._buildActualAwareNvpBalance`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L7356) | ctx | Math.abs, Math.max, Math.sign, Number, String, applyFeedForwardTarget, clamp, estimateAsyncStorageFeedback, finite, resolveNvpBandTarget |
| [`finite`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L7357) | v | Number, Number.isFinite |
| [`applyFeedForwardTarget`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L7576) | desiredW, modePrefix | Math.abs, Math.sign, Number, Number.isFinite, clamp |
| [`SpeicherRegelungModule._getCfg`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L7840) | – | String, buildStorageMeasurementFallbackFromGlobal, mergeStorageMeasurementFallback |
| [`SpeicherRegelungModule._getStorageControlAuthority`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8013) | – | Array.isArray, rows.some, this._isStorageFarmEnabled, this.adapter._nwGetStorageControlAuthority, this.adapter._nwGetStorageFarmRuntimeInfo |
| [`SpeicherRegelungModule._isStorageFarmEnabled`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8084) | – | Array.isArray, rows.filter, this.adapter._nwGetStorageFarmRuntimeInfo |
| [`SpeicherRegelungModule._isStorageFarmDispatchEnabled`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8127) | – | this._getStorageControlAuthority |
| [`SpeicherRegelungModule._getStorageVendorProfile`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8131) | cfg | String |
| [`SpeicherRegelungModule._isFeneconProfileConfigured`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8144) | cfg | this._getStorageVendorProfile |
| [`SpeicherRegelungModule._isFeneconHybridControlConfigured`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8158) | cfg | String, this._isFeneconProfileConfigured |
| [`SpeicherRegelungModule._isSungrowHybridControlConfigured`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8166) | cfg | this._getStorageVendorProfile |
| [`SpeicherRegelungModule._isE3dcRscpControlConfigured`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8170) | cfg | this._getStorageVendorProfile |
| [`SpeicherRegelungModule._isFeneconGridControlConfigured`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8177) | cfg | this._isFeneconHybridControlConfigured |
| [`SpeicherRegelungModule._buildSungrowHybridContext`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8180) | { cfg = {}, staleMs = 15000, gridW = null, gridRawW = null, gridAgeMs = null, targetGridImportW = null, importThresholdW = null, protectedEvcsLoadW = 0, coupling = 'ac', dcPvPowerW = null, dcPvPowerAgeMs = null, } | Date.now, Math.max, Number, Number.isFinite, String, num, this._buildIndependentPvLoadFeedForward |
| [`SpeicherRegelungModule._setStorageNvpBalanceDiag`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8267) | ctx | JSON.stringify, String, n, this._setIfChanged |
| [`n`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8269) | v, fallback | Math.round, Number, Number.isFinite |
| [`SpeicherRegelungModule._setSungrowHybridDiag`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8345) | ctx | String, n, this._setIfChanged |
| [`n`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8347) | v, fallback | Math.round, Number, Number.isFinite |
| [`SpeicherRegelungModule._isE3dcGridChargeSource`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8376) | source | String |
| [`SpeicherRegelungModule._writeE3dcRscpTargetW`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8394) | targetW, reason, source, cfg | Math.abs, Math.max, Math.round, Number, Number.isFinite, String, this._isE3dcGridChargeSource, this._setE3dcRscpDiag, this.dp.getEntry, writeBoolean, writeNumber |
| [`writeNumber`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8412) | key, value | this._writeStorageCommandNumber, writes.push |
| [`writeBoolean`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8424) | key, value | this._writeStorageCommandBoolean, writes.push |
| [`SpeicherRegelungModule._setE3dcRscpDiag`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8477) | ctx | String, n, this._setIfChanged |
| [`n`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8478) | v, def | Math.round, Number, Number.isFinite |
| [`SpeicherRegelungModule._buildFeneconHybridContext`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8493) | { cfg = {}, staleMs = 15000, gridW = null, gridRawW = null, dcPvPowerW = null, dcPvPowerAgeMs = null, resolvedMode = 'direct-ess', } | Date.now, Math.abs, Math.max, Number.isFinite, String, getEntry, readFresh, resolveFeneconHybridAuthority, strictFiniteNumber, this._getStorageVendorProfile |
| [`readFresh`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8505) | key | Number.isFinite, strictFiniteNumber, this.dp.getAgeMs, this.dp.getEntry, this.dp.getNumberFresh |
| [`getEntry`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8562) | key | this.dp.getEntry |
| [`SpeicherRegelungModule._updateFeneconNvpShadow`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8673) | ctx | updateFeneconNvpShadowRuntime |
| [`SpeicherRegelungModule._setFeneconHybridDiag`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8679) | ctx | String, n, this._setIfChanged |
| [`n`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8689) | v, fallback | Math.round, strictFiniteNumber |
| [`SpeicherRegelungModule._setHoldNoWriteTargetDiag`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8744) | targetW, reason, source, status | Date.now, Math.round, Number, Number.isFinite, String, this._setIfChanged, this.dp.getEntry |
| [`SpeicherRegelungModule._setNoWriteTargetDiag`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8787) | targetW, reason, source, status | Date.now, Math.round, Number, Number.isFinite, String, this._setIfChanged, this.dp.getEntry |
| [`SpeicherRegelungModule._getFeneconGridLastWriteMs`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8822) | – | Math.max, Number, Number.isFinite, candidates.push |
| [`SpeicherRegelungModule._getFeneconApiTimeoutMs`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8834) | cfg | Math.max, Math.min, Math.round, Number, Number.isFinite |
| [`SpeicherRegelungModule._getFeneconNativeHandoverWait`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8840) | cfg | Date.now, Math.max, this._getFeneconApiTimeoutMs, this._getFeneconGridLastWriteMs |
| [`SpeicherRegelungModule._getFeneconGridSetpointW`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8852) | cfg | String, this.dp.getEntry |
| [`SpeicherRegelungModule._releaseDirectStorageTargetForFenecon`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8863) | reason | String, getEntry, this._ensureStorageAlternativeTargetsNeutral, this._setIfChanged |
| [`getEntry`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8864) | key | this.dp.getEntry |
| [`SpeicherRegelungModule._applyFeneconGridSetpointW`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8879) | targetW, reason, source, opts | Date.now, Math.round, Number, Number.isFinite, String, this._setIfChanged, this._verifyStorageCommandDatapoints, this._writeStorageCommandNumber, this.dp.getEntry |
| [`SpeicherRegelungModule._readTarifVis`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8949) | staleMs | Math.round, this.dp.getAgeMs, this.dp.getBoolean, this.dp.getNumberFresh |
| [`SpeicherRegelungModule._storageCommandExpectedRaw`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8969) | entry, physicalValue, type | Math.max, Math.min, Number, Number.isFinite |
| [`SpeicherRegelungModule._storageCommandBoolean`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8991) | raw | String |
| [`SpeicherRegelungModule._readStorageCommandRaw`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L9000) | key, entry | Number, Number.isFinite, Object.prototype.hasOwnProperty.call, String, this.adapter.getForeignStateAsync, this.dp.getRaw |
| [`SpeicherRegelungModule._verifyStorageCommandDatapoints`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L9043) | expectations, options | Array.from, Array.isArray, Math.abs, Math.max, Math.min, Number, Number.isFinite, String, finalRows.filter, finalRows.push, supportedRows.every, supportedRows.filter, this._readStorageCommandRaw, this._storageCommandBoolean (weitere in der Quelle) |
| [`SpeicherRegelungModule._clearStorageCommandWriteCache`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L9131) | entry | String, this.dp.lastWriteByObjectId.delete |
| [`SpeicherRegelungModule._writeStorageCommandNumber`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L9137) | key, value, options | this._clearStorageCommandWriteCache, this._verifyStorageCommandDatapoints, this.dp.getEntry, this.dp.writeNumber |
| [`SpeicherRegelungModule._writeStorageCommandBoolean`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L9149) | key, value, options | this._clearStorageCommandWriteCache, this._verifyStorageCommandDatapoints, this.dp.getEntry, this.dp.writeBoolean |
| [`SpeicherRegelungModule._ensureStorageAlternativeTargetsNeutral`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L9161) | entries, options | Array.from, Array.isArray, String, rows.push, this._verifyStorageCommandDatapoints, this._writeStorageCommandNumber, unique.has, unique.set, unique.values |
| [`SpeicherRegelungModule._applyTargetW`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L9220) | targetW, reason, source, options | Array.isArray, Date.now, JSON.stringify, Math.abs, Math.floor, Math.max, Math.min, Math.round, Number, Number.isFinite, String, activeOutputEntries.push, addActiveOutput, addCommandExpectation (weitere in der Quelle) |
| [`getEntry`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L9362) | key | this.dp.getEntry |
| [`objectIdOf`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L9406) | entry | String |
| [`sameObject`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L9407) | a, b | objectIdOf |
| [`addActiveOutput`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L9539) | key, entry, allowAlternativeAlias | activeOutputEntries.push, objectIdOf, selectedTargetObjectIds.add |
| [`addIgnoredAlternative`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L9571) | key, entry, family | ignoredAlternativeTargetEntries.push, objectIdOf, selectedTargetObjectIds.has |
| [`addCommandExpectation`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L9704) | key, entry, type, value, role | commandExpectations.push, objectIdOf |
| [`writeCommandNumber`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L9708) | key, value, options | String, addCommandExpectation, getEntry, this._writeStorageCommandNumber, writeResults.push |
| [`writeCommandBoolean`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L9722) | key, value, options | String, addCommandExpectation, getEntry, this._writeStorageCommandBoolean, writeResults.push |
| [`classifyCommandReadbackFailure`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L9736) | rows | Array.isArray, mismatches.some |
| [`SpeicherRegelungModule._upsertInputsFromConfig`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L10342) | – | String, this.dp.upsert |
| [`SpeicherRegelungModule._ensureStates`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L10370) | – | ensureFeneconNvpShadowStates, mk, this.adapter.setObjectNotExistsAsync |
| [`mk`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L10388) | id, name, type, role, def | this.adapter.setObjectNotExistsAsync, this.adapter.setStateAsync |
| [`SpeicherRegelungModule._ensureRuntimeStateObject`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L10734) | id, val | String, sid.startsWith, this.adapter.setObjectNotExistsAsync |
| [`SpeicherRegelungModule._setIfChanged`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L10763) | id, val | this._ensureRuntimeStateObject, this.adapter.getStateAsync, this.adapter.setStateAsync |
| [`SpeicherRegelungModule._readOwnNumber`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L10788) | id | Number, Number.isFinite, this.adapter.getStateAsync |
| [`SpeicherRegelungModule._readOwnNumberFresh`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L10805) | id, maxAgeMs | Date.now, Number, Number.isFinite, this.adapter.getStateAsync |
| [`SpeicherRegelungModule._readOwnString`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L10830) | id | String, this.adapter.getStateAsync |
| [`num`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L10848) | v, dflt | Number, Number.isFinite |
| [`clamp`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L10858) | n, min, max | Math.max, Math.min, Number.isFinite |
