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
| [`resolveStorageLicenseEdition`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L415) | adapter | adapter._nwCurrentLicenseEdition, adapter?._nwIsFeatureLicensed, storageFeatureFlags.normalizeEdition |
| [`deriveStorageRatedPowerW`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L430) | cfg, farmRows, selectedTopology | Array.isArray, Math.round, Number, Number.isFinite, String, farmRows.reduce |
| [`resolveStorageLicensePowerProfile`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L446) | adapter, cfg, farmRows, selectedTopology | deriveStorageRatedPowerW, resolveStorageLicenseEdition, storageFeatureFlags.storagePerformanceProfile |
| [`applyStorageLicensePowerLimit`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L476) | targetW, profile | Math.abs, Math.max, Math.min, Number, Number.isFinite, String |
| [`resolveEvcsStorageProtectionSnapshot`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L520) | policy, options | Array.isArray, Date.now, Math.max, Number, Number.isFinite, String, count, validNonNegative, watts |
| [`count`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L521) | value | Math.floor, Math.max, Number, Number.isFinite |
| [`watts`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L522) | value | Math.max, Number, Number.isFinite |
| [`validNonNegative`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L527) | value | Number, Number.isFinite, String |
| [`resolveEvcsProtectedStorageTarget`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L554) | input | Math.abs, Math.max, Math.min, Number, String, finite |
| [`finite`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L555) | v | Number, Number.isFinite |
| [`resolveStorageAntiExportTarget`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L783) | input | Date.now, Math.max, Math.min, Math.round, Number, clamp01, finite |
| [`finite`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L784) | value | Number, Number.isFinite |
| [`clamp01`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L785) | value | Math.max, Math.min, Number |
| [`RollingWindow.constructor`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L1074) | maxSeconds | Math.max, Number |
| [`RollingWindow.setMaxSeconds`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L1086) | maxSeconds | Date.now, Math.max, Number, this._purge |
| [`RollingWindow._purge`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L1100) | nowMs | this.samples.shift |
| [`RollingWindow.push`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L1114) | v, nowMs | Date.now, Number, Number.isFinite, this._purge, this.samples.push |
| [`RollingWindow.mean`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L1128) | – | – |
| [`RollingWindow.count`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L1135) | – | – |
| [`hystAbove`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L1153) | prev, x, offBelow, onAbove | Number.isFinite |
| [`hystBelow`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L1174) | prev, x, onBelow, offAbove | Number.isFinite |
| [`SpeicherRegelungModule.constructor`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L1211) | adapter, dpRegistry | super |
| [`SpeicherRegelungModule.init`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L1404) | – | this._ensureStates, this._upsertInputsFromConfig |
| [`SpeicherRegelungModule.deactivate`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L1416) | – | Math.abs, Number, Number.isFinite, String, outputKeys.some, this._applyTargetW, this._getStorageControlAuthority, this.adapter.getStateAsync |
| [`SpeicherRegelungModule.tick`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L1454) | – | Array.isArray, Date.now, JSON.parse, JSON.stringify, Math.abs, Math.floor, Math.max, Math.min, Math.round, Math.sign, Number, Number.isFinite, String, adj.toFixed (weitere in der Quelle) |
| [`measurementTsFor`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L1966) | key | Number, Number.isFinite, this.dp.getEntry, this.dp.getMeasurementTimestampMs |
| [`isCentralPvChargeSource`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L2502) | src, signedTargetW | Number, String |
| [`isDeferredSungrowChargeCapReason`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L2528) | capReason | String, text.includes |
| [`isDeferredSungrowDischargeCapReason`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L2552) | capReason | String, text.includes |
| [`resolveStoragePvBudgetW`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L2568) | runtime, _allocationGate, fallbackW | Math.max, Number, Number.isFinite, grantFn, runtime.getPvGrant.bind, runtime.grant.bind |
| [`stripProtectedEvcsLoadW`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L2699) | w | Math.max, Number |
| [`isStorageBalanceSource`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L2706) | src | String |
| [`getLastStorageBalanceTargetW`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L2710) | – | Number, Number.isFinite, isStorageBalanceSource |
| [`readCacheNumber`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L2726) | key, fallback | Number, Number.isFinite, String, this.adapter._nwGetNumberFromCache |
| [`buildStorageFeedForward`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L2752) | targetNvpW | Math.max, num, this._buildIndependentPvLoadFeedForward |
| [`getFeneconAcLoadTargetW`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L2775) | – | Math.abs, Math.max, Number.isFinite, num, readCacheNumber, stripProtectedEvcsLoadW |
| [`SpeicherRegelungModule._buildSelfNvpControlSignal`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L6700) | rawOrFilteredW, nowMs, cfg, targetW, deadbandW | Date.now, Math.max, Math.min, Number, Number.isFinite, clamp, num |
| [`SpeicherRegelungModule._resolveFeneconDirectNvpFeedback`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L6793) | ctx | Date.now, Math.max, Math.min, Number, Number.isFinite, feedback, finite, read, this.dp.getAgeMs, this.dp.getEntry, this.dp.getNumber |
| [`finite`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L6794) | value | Number, Number.isFinite |
| [`feedback`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L6800) | key, valueW, source, sampleTs, ageMs, objectId | Math.max, Math.round, Number, String, finite |
| [`read`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L6829) | key, source | Number, Number.isFinite, feedback, this.dp.getAgeMs, this.dp.getEntry, this.dp.getMeasurementTimestampMs, this.dp.getNumber |
| [`SpeicherRegelungModule._resolveBatteryBalanceFeedback`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L6908) | ctx | Date.now, Math.abs, Math.max, Math.round, Number, String, finite, resetCache |
| [`finite`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L6909) | v | Number, Number.isFinite |
| [`resetCache`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L6927) | – | – |
| [`SpeicherRegelungModule._buildIndependentPvLoadFeedForward`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L7113) | ctx | Date.now, Math.max, Math.min, Number, String, finite, getCacheAgeMs, getCacheString, getCacheValue, isMapped, pushPv, pvCandidates.sort, this.dp.getAgeMs, this.dp.getEntry (weitere in der Quelle) |
| [`finite`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L7114) | v | Number, Number.isFinite |
| [`getCacheRecord`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L7124) | key | String |
| [`getCacheAgeMs`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L7131) | key | Math.max, Number, Number.isFinite, adapter._nwGetCacheAgeMs, finite, getCacheRecord |
| [`getCacheValue`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L7144) | key, fallback | Number, Number.isFinite, adapter._nwGetNumberFromCacheFresh, finite, getCacheAgeMs, getCacheRecord |
| [`getCacheString`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L7160) | key | String, getCacheRecord |
| [`isMapped`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L7165) | key | String, adapter._nwHasMappedDatapoint |
| [`pushPv`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L7233) | value, source, ageMs, priority | Math.max, Number, finite, pvCandidates.push |
| [`SpeicherRegelungModule._buildActualAwareNvpBalance`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L7354) | ctx | Math.abs, Math.max, Math.sign, Number, String, applyFeedForwardTarget, clamp, estimateAsyncStorageFeedback, finite, resolveNvpBandTarget |
| [`finite`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L7355) | v | Number, Number.isFinite |
| [`applyFeedForwardTarget`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L7574) | desiredW, modePrefix | Math.abs, Math.sign, Number, Number.isFinite, clamp |
| [`SpeicherRegelungModule._getCfg`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L7838) | – | String, buildStorageMeasurementFallbackFromGlobal, mergeStorageMeasurementFallback |
| [`SpeicherRegelungModule._getStorageControlAuthority`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8011) | – | Array.isArray, rows.some, this._isStorageFarmEnabled, this.adapter._nwGetStorageControlAuthority, this.adapter._nwGetStorageFarmRuntimeInfo |
| [`SpeicherRegelungModule._isStorageFarmEnabled`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8082) | – | Array.isArray, rows.filter, this.adapter._nwGetStorageFarmRuntimeInfo |
| [`SpeicherRegelungModule._isStorageFarmDispatchEnabled`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8125) | – | this._getStorageControlAuthority |
| [`SpeicherRegelungModule._getStorageVendorProfile`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8129) | cfg | String |
| [`SpeicherRegelungModule._isFeneconProfileConfigured`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8142) | cfg | this._getStorageVendorProfile |
| [`SpeicherRegelungModule._isFeneconHybridControlConfigured`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8156) | cfg | String, this._isFeneconProfileConfigured |
| [`SpeicherRegelungModule._isSungrowHybridControlConfigured`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8164) | cfg | this._getStorageVendorProfile |
| [`SpeicherRegelungModule._isE3dcRscpControlConfigured`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8168) | cfg | this._getStorageVendorProfile |
| [`SpeicherRegelungModule._isFeneconGridControlConfigured`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8175) | cfg | this._isFeneconHybridControlConfigured |
| [`SpeicherRegelungModule._buildSungrowHybridContext`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8178) | { cfg = {}, staleMs = 15000, gridW = null, gridRawW = null, gridAgeMs = null, targetGridImportW = null, importThresholdW = null, protectedEvcsLoadW = 0, coupling = 'ac', dcPvPowerW = null, dcPvPowerAgeMs = null, } | Date.now, Math.max, Number, Number.isFinite, String, num, this._buildIndependentPvLoadFeedForward |
| [`SpeicherRegelungModule._setStorageNvpBalanceDiag`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8265) | ctx | JSON.stringify, String, n, this._setIfChanged |
| [`n`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8267) | v, fallback | Math.round, Number, Number.isFinite |
| [`SpeicherRegelungModule._setSungrowHybridDiag`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8343) | ctx | String, n, this._setIfChanged |
| [`n`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8345) | v, fallback | Math.round, Number, Number.isFinite |
| [`SpeicherRegelungModule._isE3dcGridChargeSource`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8374) | source | String |
| [`SpeicherRegelungModule._writeE3dcRscpTargetW`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8392) | targetW, reason, source, cfg | Math.abs, Math.max, Math.round, Number, Number.isFinite, String, this._isE3dcGridChargeSource, this._setE3dcRscpDiag, this.dp.getEntry, writeBoolean, writeNumber |
| [`writeNumber`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8410) | key, value | this._writeStorageCommandNumber, writes.push |
| [`writeBoolean`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8422) | key, value | this._writeStorageCommandBoolean, writes.push |
| [`SpeicherRegelungModule._setE3dcRscpDiag`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8475) | ctx | String, n, this._setIfChanged |
| [`n`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8476) | v, def | Math.round, Number, Number.isFinite |
| [`SpeicherRegelungModule._buildFeneconHybridContext`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8491) | { cfg = {}, staleMs = 15000, gridW = null, gridRawW = null, dcPvPowerW = null, dcPvPowerAgeMs = null, resolvedMode = 'direct-ess', } | Date.now, Math.abs, Math.max, Number.isFinite, String, getEntry, readFresh, resolveFeneconHybridAuthority, strictFiniteNumber, this._getStorageVendorProfile |
| [`readFresh`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8503) | key | Number.isFinite, strictFiniteNumber, this.dp.getAgeMs, this.dp.getEntry, this.dp.getNumberFresh |
| [`getEntry`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8560) | key | this.dp.getEntry |
| [`SpeicherRegelungModule._updateFeneconNvpShadow`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8671) | ctx | updateFeneconNvpShadowRuntime |
| [`SpeicherRegelungModule._setFeneconHybridDiag`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8677) | ctx | String, n, this._setIfChanged |
| [`n`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8687) | v, fallback | Math.round, strictFiniteNumber |
| [`SpeicherRegelungModule._setHoldNoWriteTargetDiag`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8742) | targetW, reason, source, status | Date.now, Math.round, Number, Number.isFinite, String, this._setIfChanged, this.dp.getEntry |
| [`SpeicherRegelungModule._setNoWriteTargetDiag`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8785) | targetW, reason, source, status | Date.now, Math.round, Number, Number.isFinite, String, this._setIfChanged, this.dp.getEntry |
| [`SpeicherRegelungModule._getFeneconGridLastWriteMs`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8820) | – | Math.max, Number, Number.isFinite, candidates.push |
| [`SpeicherRegelungModule._getFeneconApiTimeoutMs`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8832) | cfg | Math.max, Math.min, Math.round, Number, Number.isFinite |
| [`SpeicherRegelungModule._getFeneconNativeHandoverWait`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8838) | cfg | Date.now, Math.max, this._getFeneconApiTimeoutMs, this._getFeneconGridLastWriteMs |
| [`SpeicherRegelungModule._getFeneconGridSetpointW`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8850) | cfg | String, this.dp.getEntry |
| [`SpeicherRegelungModule._releaseDirectStorageTargetForFenecon`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8861) | reason | String, getEntry, this._ensureStorageAlternativeTargetsNeutral, this._setIfChanged |
| [`getEntry`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8862) | key | this.dp.getEntry |
| [`SpeicherRegelungModule._applyFeneconGridSetpointW`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8877) | targetW, reason, source, opts | Date.now, Math.round, Number, Number.isFinite, String, this._setIfChanged, this._verifyStorageCommandDatapoints, this._writeStorageCommandNumber, this.dp.getEntry |
| [`SpeicherRegelungModule._readTarifVis`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8947) | staleMs | Math.round, this.dp.getAgeMs, this.dp.getBoolean, this.dp.getNumberFresh |
| [`SpeicherRegelungModule._storageCommandExpectedRaw`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8967) | entry, physicalValue, type | Math.max, Math.min, Number, Number.isFinite |
| [`SpeicherRegelungModule._storageCommandBoolean`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8989) | raw | String |
| [`SpeicherRegelungModule._readStorageCommandRaw`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L8998) | key, entry | Number, Number.isFinite, Object.prototype.hasOwnProperty.call, String, this.adapter.getForeignStateAsync, this.dp.getRaw |
| [`SpeicherRegelungModule._verifyStorageCommandDatapoints`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L9041) | expectations, options | Array.from, Array.isArray, Math.abs, Math.max, Math.min, Number, Number.isFinite, String, finalRows.filter, finalRows.push, supportedRows.every, supportedRows.filter, this._readStorageCommandRaw, this._storageCommandBoolean (weitere in der Quelle) |
| [`SpeicherRegelungModule._clearStorageCommandWriteCache`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L9129) | entry | String, this.dp.lastWriteByObjectId.delete |
| [`SpeicherRegelungModule._writeStorageCommandNumber`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L9135) | key, value, options | this._clearStorageCommandWriteCache, this._verifyStorageCommandDatapoints, this.dp.getEntry, this.dp.writeNumber |
| [`SpeicherRegelungModule._writeStorageCommandBoolean`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L9147) | key, value, options | this._clearStorageCommandWriteCache, this._verifyStorageCommandDatapoints, this.dp.getEntry, this.dp.writeBoolean |
| [`SpeicherRegelungModule._ensureStorageAlternativeTargetsNeutral`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L9159) | entries, options | Array.from, Array.isArray, String, rows.push, this._verifyStorageCommandDatapoints, this._writeStorageCommandNumber, unique.has, unique.set, unique.values |
| [`SpeicherRegelungModule._applyTargetW`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L9218) | targetW, reason, source, options | Array.isArray, Date.now, JSON.stringify, Math.abs, Math.floor, Math.max, Math.min, Math.round, Number, Number.isFinite, String, activeOutputEntries.push, addActiveOutput, addCommandExpectation (weitere in der Quelle) |
| [`getEntry`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L9360) | key | this.dp.getEntry |
| [`objectIdOf`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L9404) | entry | String |
| [`sameObject`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L9405) | a, b | objectIdOf |
| [`addActiveOutput`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L9537) | key, entry, allowAlternativeAlias | activeOutputEntries.push, objectIdOf, selectedTargetObjectIds.add |
| [`addIgnoredAlternative`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L9569) | key, entry, family | ignoredAlternativeTargetEntries.push, objectIdOf, selectedTargetObjectIds.has |
| [`addCommandExpectation`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L9702) | key, entry, type, value, role | commandExpectations.push, objectIdOf |
| [`writeCommandNumber`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L9706) | key, value, options | String, addCommandExpectation, getEntry, this._writeStorageCommandNumber, writeResults.push |
| [`writeCommandBoolean`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L9720) | key, value, options | String, addCommandExpectation, getEntry, this._writeStorageCommandBoolean, writeResults.push |
| [`classifyCommandReadbackFailure`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L9734) | rows | Array.isArray, mismatches.some |
| [`SpeicherRegelungModule._upsertInputsFromConfig`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L10340) | – | String, this.dp.upsert |
| [`SpeicherRegelungModule._ensureStates`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L10368) | – | ensureFeneconNvpShadowStates, mk, this.adapter.setObjectNotExistsAsync |
| [`mk`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L10386) | id, name, type, role, def | this.adapter.setObjectNotExistsAsync, this.adapter.setStateAsync |
| [`SpeicherRegelungModule._ensureRuntimeStateObject`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L10732) | id, val | String, sid.startsWith, this.adapter.setObjectNotExistsAsync |
| [`SpeicherRegelungModule._setIfChanged`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L10761) | id, val | this._ensureRuntimeStateObject, this.adapter.getStateAsync, this.adapter.setStateAsync |
| [`SpeicherRegelungModule._readOwnNumber`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L10786) | id | Number, Number.isFinite, this.adapter.getStateAsync |
| [`SpeicherRegelungModule._readOwnNumberFresh`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L10803) | id, maxAgeMs | Date.now, Number, Number.isFinite, this.adapter.getStateAsync |
| [`SpeicherRegelungModule._readOwnString`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L10828) | id | String, this.adapter.getStateAsync |
| [`num`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L10846) | v, dflt | Number, Number.isFinite |
| [`clamp`](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts#L10856) | n, min, max | Math.max, Math.min, Number.isFinite |
