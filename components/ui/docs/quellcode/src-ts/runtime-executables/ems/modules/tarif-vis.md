# src-ts/runtime-executables/ems/modules/tarif-vis.ts

Bereitet Tarifinformationen für Anzeige und die zugehörigen Laufzeit-States auf.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/modules/tarif-vis.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `./base` | [src-ts/runtime-executables/ems/modules/base.ts](../../../../../../src-ts/runtime-executables/ems/modules/base.ts) |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/module-manager.ts](../../../../../../src-ts/runtime-executables/ems/module-manager.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`resolveStorageGridChargePermission`](../../../../../../src-ts/runtime-executables/ems/modules/tarif-vis.ts#L65) | { appCenterAllowed = false, tariffActive = false, currentPriceFresh = false, tariffState = 'unknown', manualNetFeeEnabled = false, manualNtWindowActive = false, priorityAllowsStorage = false, storageWriterAvailable = false, storagePowerW = 0, } | Number, String |
| [`formatStorageNtWindowLabel`](../../../../../../src-ts/runtime-executables/ems/modules/tarif-vis.ts#L95) | { model = 1, quarter = 1, startRaw = '', endRaw = '' } | Math.max, Math.min, Number, String |
| [`TarifVisModule.constructor`](../../../../../../src-ts/runtime-executables/ems/modules/tarif-vis.ts#L128) | adapter, dpRegistry | super |
| [`TarifVisModule.init`](../../../../../../src-ts/runtime-executables/ems/modules/tarif-vis.ts#L164) | – | mk, this._getVisInstance, this._getVisPriceAverageId, this._getVisPriceCurrentId, this._getVisPriceTodayJsonId, this._getVisPriceTomorrowJsonId, this.adapter.setObjectNotExistsAsync, this.dp.getEntry, this.dp.upsert |
| [`mk`](../../../../../../src-ts/runtime-executables/ems/modules/tarif-vis.ts#L184) | id, name, type, role | this.adapter.setObjectNotExistsAsync |
| [`TarifVisModule._getVisInstance`](../../../../../../src-ts/runtime-executables/ems/modules/tarif-vis.ts#L331) | – | cfg.instance.trim |
| [`TarifVisModule._getTariffHomePath`](../../../../../../src-ts/runtime-executables/ems/modules/tarif-vis.ts#L342) | – | dp.tariffHomePath.trim |
| [`TarifVisModule._getVisPriceCurrentId`](../../../../../../src-ts/runtime-executables/ems/modules/tarif-vis.ts#L361) | – | dp.priceCurrent.trim, this._getTariffHomePath, vis.priceCurrentId.trim |
| [`TarifVisModule._getVisPriceAverageId`](../../../../../../src-ts/runtime-executables/ems/modules/tarif-vis.ts#L396) | – | dp.priceAverage.trim, vis.priceAverageId.trim |
| [`TarifVisModule._getVisPriceTodayJsonId`](../../../../../../src-ts/runtime-executables/ems/modules/tarif-vis.ts#L420) | – | dp.priceTodayJson.trim, this._getTariffHomePath |
| [`TarifVisModule._getVisPriceTomorrowJsonId`](../../../../../../src-ts/runtime-executables/ems/modules/tarif-vis.ts#L445) | – | dp.priceTomorrowJson.trim, this._getTariffHomePath |
| [`TarifVisModule._num`](../../../../../../src-ts/runtime-executables/ems/modules/tarif-vis.ts#L470) | v, fallback | Number, Number.isFinite, s.includes, s.lastIndexOf, s.replace, v.trim |
| [`TarifVisModule._normalizePriceEurPerKwh`](../../../../../../src-ts/runtime-executables/ems/modules/tarif-vis.ts#L510) | v, fallback | Math.abs, Number.isFinite, this._num |
| [`TarifVisModule._parsePriceCurve`](../../../../../../src-ts/runtime-executables/ems/modules/tarif-vis.ts#L539) | raw | Array.isArray, Date.parse, JSON.parse, Number, Number.isFinite, String, base.getTime, base.setMinutes, data.some, isNumLike, out.push, out.sort, raw.trim, this._normalizePriceEurPerKwh |
| [`isNumLike`](../../../../../../src-ts/runtime-executables/ems/modules/tarif-vis.ts#L583) | v | Number, Number.isFinite, v.trim |
| [`TarifVisModule._clamp`](../../../../../../src-ts/runtime-executables/ems/modules/tarif-vis.ts#L704) | n, min, max | Math.max, Math.min, Number.isFinite |
| [`TarifVisModule._parseTimeToMinutes`](../../../../../../src-ts/runtime-executables/ems/modules/tarif-vis.ts#L729) | raw | Number, Number.isFinite, String, s.match |
| [`TarifVisModule._isInTimeWindow`](../../../../../../src-ts/runtime-executables/ems/modules/tarif-vis.ts#L761) | nowMin, startMin, endMin | Number, Number.isFinite |
| [`TarifVisModule._nowMinutesLocal`](../../../../../../src-ts/runtime-executables/ems/modules/tarif-vis.ts#L791) | nowMs | d.getHours, d.getMinutes |
| [`TarifVisModule._currentQuarter`](../../../../../../src-ts/runtime-executables/ems/modules/tarif-vis.ts#L814) | nowMs | d.getMonth |
| [`TarifVisModule._normPrioritaet`](../../../../../../src-ts/runtime-executables/ems/modules/tarif-vis.ts#L849) | p | Math.round, Number.isFinite, this._num |
| [`TarifVisModule._debugThrottle`](../../../../../../src-ts/runtime-executables/ems/modules/tarif-vis.ts#L884) | msg, intervalMs | Date.now, Number, Number.isFinite, String, this.adapter.log.debug |
| [`TarifVisModule._getStorageControlAuthority`](../../../../../../src-ts/runtime-executables/ems/modules/tarif-vis.ts#L912) | – | this.adapter._nwGetStorageControlAuthority, this.adapter._nwGetStorageFarmRuntimeInfo |
| [`TarifVisModule.tick`](../../../../../../src-ts/runtime-executables/ems/modules/tarif-vis.ts#L945) | – | Array.isArray, Date.now, Math.abs, Math.max, Math.min, Math.round, Number, Number.isFinite, String, all.find, all.map, all.reduce, formatStorageNtWindowLabel, horizonCurve.filter (weitere in der Quelle) |
| [`TarifVisModule._setIfChanged`](../../../../../../src-ts/runtime-executables/ems/modules/tarif-vis.ts#L1808) | id, val | this.adapter.getStateAsync, this.adapter.setStateAsync |
