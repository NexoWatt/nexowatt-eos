# src-ts/runtime-executables/ems/modules/ai-advisor.ts

Bereitet Anlageninformationen für den Energieberater auf; seine Bewertung ersetzt keine Freigabe des produktiven Regelpfads.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `./base` | [src-ts/runtime-executables/ems/modules/base.ts](../../../../../../src-ts/runtime-executables/ems/modules/base.ts) |
| `../../lib/ts-mirrors/ems/ai-advisor/ai-advisor-payload.js` | [src-ts/ems/ai-advisor/ai-advisor-payload.ts](../../../../../../src-ts/ems/ai-advisor/ai-advisor-payload.ts) |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/module-manager.ts](../../../../../../src-ts/runtime-executables/ems/module-manager.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`num`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L98) | v, fallback | Number, Number.isFinite |
| [`clamp`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L108) | v, min, max | Math.max, Math.min, Number, Number.isFinite |
| [`bool`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L119) | v, fallback | String |
| [`finiteNumber`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L133) | v | Number.isFinite |
| [`round`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L142) | v, digits | Math.max, Math.min, Math.pow, Math.round, Number, Number.isFinite |
| [`makeHash`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L154) | obj | Date.now, JSON.stringify, String |
| [`pad2`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L163) | v | Math.max, Math.round, Number, String |
| [`formatKw`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L170) | w | Math.abs, Math.round, Number, Number.isFinite |
| [`formatKwh`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L184) | kwh | Math.abs, Number, Number.isFinite, n.toFixed |
| [`formatPrice`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L196) | eurKwh | Number, Number.isFinite, n.toFixed |
| [`formatPct`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L207) | v, digits | Math.max, Math.min, Math.round, Number, Number.isFinite, n.toFixed |
| [`formatTemp`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L218) | v | Math.abs, Number, Number.isFinite, n.toFixed |
| [`textContainsAny`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L229) | value, needles | Array.isArray, String |
| [`weatherLine`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L239) | text, minC, maxC, precipPct | Number, Number.isFinite, String, formatPct, formatTemp, parts.filter, parts.push |
| [`buildWeatherSummary`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L252) | s | Math.round, String, finiteNumber, formatPct, formatTemp, parts.join, parts.push, today.join, today.push, weatherLine |
| [`isPeakShavingConfigured`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L271) | config | – |
| [`evcsRowHasMapping`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L290) | row | EVCS_MAPPING_FIELDS.some |
| [`inferEvcsAvailable`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L300) | adapter, settingsCfg | Array.isArray, lists.push, lists.some |
| [`evcsPhrase`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L318) | hasEvcs, withArticle | – |
| [`storageRowHasMapping`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L327) | row | keys.some |
| [`configuredStorageFarmRows`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L341) | adapter | Array.isArray, lists.push, lists.reduce |
| [`storageSocLooksPlausible`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L356) | v | Number, Number.isFinite, v.trim |
| [`buildPeakStateText`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L368) | s, limitW, usagePct | Number, Number.isFinite, String, formatKw, formatPct |
| [`shortIsoWindow`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L385) | from, to | String, fmt |
| [`fmt`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L394) | s | Number.isNaN, d.getDate, d.getFullYear, d.getHours, d.getMinutes, d.getMonth, d.getTime, pad2, today.getDate, today.getFullYear, today.getMonth, tomorrow.getDate, tomorrow.getFullYear, tomorrow.getMonth |
| [`parseClockMinutes`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L414) | value, fallback | Number, Number.isFinite, String, raw.match |
| [`minutesUntilClock`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L429) | value, now | now.getHours, now.getMinutes, parseClockMinutes |
| [`formatClockMinutes`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L443) | totalMinutes | Math.floor, Math.round, Number, pad2 |
| [`formatDurationMinutes`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L453) | minutes | Math.floor, Math.max, Math.round, Number, String |
| [`formatClockMs`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L464) | ms | Number, Number.isFinite, d.getHours, d.getMinutes, pad2 |
| [`tsToShortWindow`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L476) | ts | Number, Number.isFinite, d.getDate, d.getFullYear, d.getHours, d.getMinutes, d.getMonth, now.getDate, now.getFullYear, now.getMonth, pad2 |
| [`formatWindowHour`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L492) | hour | Math.round, Number, pad2 |
| [`isInsideClockWindow`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L502) | nowMs, startValue, endValue | Date.now, Number, d.getHours, d.getMinutes, parseClockMinutes |
| [`seasonFromDate`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L517) | now | – |
| [`seasonLabel`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L530) | season | String |
| [`normalizeOptimizationMode`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L544) | value | String |
| [`optimizationModeLabel`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L559) | mode | normalizeOptimizationMode |
| [`average`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L574) | list, field | Array.isArray, vals.reduce |
| [`percentile`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L585) | list, field, pct | Array.isArray, Math.max, Math.min, Math.round, Number |
| [`safeJson`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L597) | value, fallback | JSON.stringify |
| [`toSafeIdPart`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L606) | value | String |
| [`priorityText`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L619) | priorities, options | Object.keys, entries.slice |
| [`AiAdvisorModule.constructor`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L655) | adapter, dpRegistry | Array.from, super |
| [`AiAdvisorModule._cachedValue`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L682) | id, fallback | Object.prototype.hasOwnProperty.call, String |
| [`AiAdvisorModule._cfg`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L702) | – | String, bool, clamp, normalizeOptimizationMode, num, this._cachedValue |
| [`AiAdvisorModule.init`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L804) | – | this._ensureStates |
| [`AiAdvisorModule._ensureStates`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L815) | – | a.setObjectNotExistsAsync, mk |
| [`mk`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L825) | id, name, type, role, unit | a.setObjectNotExistsAsync |
| [`AiAdvisorModule._readState`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L893) | localId, fallback | this.adapter.getStateAsync |
| [`AiAdvisorModule._readNumber`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L917) | keys, fallback | Array.isArray, Number, Number.isFinite, this._readState, v.trim |
| [`AiAdvisorModule._dpNumberFresh`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L941) | key, maxAgeMs, fallback | Number, Number.isFinite, this.dp.getNumber, this.dp.getNumberFresh |
| [`AiAdvisorModule._getStorageControlAuthority`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L969) | – | this.adapter._nwGetStorageControlAuthority, this.adapter._nwGetStorageFarmRuntimeInfo |
| [`AiAdvisorModule._isStorageFarmActive`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L992) | – | String, this._getStorageControlAuthority |
| [`AiAdvisorModule._readStorageSocPct`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L1009) | staleTimeoutSec | Math.max, Number, String, readFirst, this._getStorageControlAuthority, this._readNumber |
| [`readCandidate`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L1044) | entry | Number, storageSocLooksPlausible, this._dpNumberFresh, this._readNumber |
| [`readFirst`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L1054) | list | readCandidate |
| [`AiAdvisorModule._readString`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L1126) | keys, fallback | Array.isArray, String, this._readState |
| [`AiAdvisorModule._readBool`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L1147) | keys, fallback | Array.isArray, bool, this._readState |
| [`AiAdvisorModule._chargingWallboxKeys`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L1168) | – | Array.from, Array.isArray, keys.filter, keys.push, toSafeIdPart |
| [`AiAdvisorModule._readEvGoals`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L1196) | evcsAvailable | Math.max, Number, Number.isFinite, finiteNumber, out.push, safe.toUpperCase, this._chargingWallboxKeys, this._readBool, this._readNumber, this._readString |
| [`AiAdvisorModule._snapshot`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L1246) | – | Array.isArray, Date.now, Math.max, Math.min, Math.round, String, finiteNumber, inferEvcsAvailable, isPeakShavingConfigured, minutesUntilClock, num, this._cfg, this._readBool, this._readEvGoals (weitere in der Quelle) |
| [`AiAdvisorModule._updateLearning`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L1444) | snapshot, cfg | Date.now, JSON.stringify, Math.abs, Math.max, Math.min, Number, Object.assign, average, clamp, d.getHours, finiteNumber, formatKw, formatKwh, formatPct (weitere in der Quelle) |
| [`AiAdvisorModule._makeDailyPlan`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L1564) | s, cfg | Array.isArray, Math.max, Number, String, activeGoals.slice, add, finiteNumber, formatClockMs, formatKw, formatKwh, formatPct, formatPrice, items.sort, optimizationModeLabel (weitere in der Quelle) |
| [`add`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L1572) | time, title, text, priority, category | Math.round, Number, String, items.push |
| [`AiAdvisorModule._pushSuggestion`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L1629) | list, item | Math.max, Math.round, Number, String, clamp, list.push, num |
| [`AiAdvisorModule._buildSuggestions`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L1661) | s, cfg | Array.isArray, Math.max, Math.round, Number, Number.isFinite, Object.assign, String, activeEvGoals.slice, buildWeatherSummary, deduped.filter, deduped.push, evcsPhrase, filtered.filter, filtered.slice (weitere in der Quelle) |
| [`categoryAllowed`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L1790) | item | String |
| [`AiAdvisorModule._score`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L1828) | snapshot, suggestions | Math.min, Math.round, clamp, finiteNumber, suggestions.reduce |
| [`AiAdvisorModule._set`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L1856) | localId, value | Date.now, this.adapter.setStateAsync, this.adapter.updateValue |
| [`AiAdvisorModule._publishDisabled`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L1866) | cfg, now | JSON.stringify, seasonFromDate, this._set |
| [`AiAdvisorModule._publish`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L1930) | snapshot, suggestions, cfg | Array.isArray, Date.now, JSON.stringify, Math.round, Number, Number.isFinite, String, aiAdvisorPayloadTsMirror.buildAiAdvisorPublishPayload, buildPeakStateText, buildWeatherSummary, finiteNumber, formatKwh, formatPct, makeHash (weitere in der Quelle) |
| [`AiAdvisorModule.tick`](../../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts#L2066) | – | Date.now, Math.max, Math.round, this._buildSuggestions, this._cfg, this._makeDailyPlan, this._publish, this._publishDisabled, this._snapshot, this._updateLearning, this.init |
