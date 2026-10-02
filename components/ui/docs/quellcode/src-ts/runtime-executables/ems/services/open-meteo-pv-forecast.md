# src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts

Ruft Wetter-/Strahlungsdaten ab und berechnet daraus PV-Prognosewerte für die konfigurierte Anlage.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `node:https` | Node-Bordmittel oder externe Paketabhängigkeit. |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/modules/pv-forecast.ts](../../../../../../src-ts/runtime-executables/ems/modules/pv-forecast.ts)
- [src-ts/runtime-executables/main.ts](../../../../../../src-ts/runtime-executables/main.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`buildPvForecastDiagnostics`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L95) | input | Date.now, Math.max, Math.round, finite, text |
| [`publishPvForecastDiagnostics`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L128) | setter, diagnostics | Math.round, setter |
| [`finite`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L183) | value, fallback | Number, Number.isFinite |
| [`clamp`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L188) | value, min, max, fallback | Math.max, Math.min, finite |
| [`asBoolean`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L192) | value, fallback | String |
| [`text`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L201) | value, fallback | String |
| [`parseJson`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L205) | value, fallback | JSON.parse, String |
| [`normalizeForecastSourceMode`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L210) | value | text |
| [`readSetting`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L218) | adapter, key, fallback | adapter.getStateAsync |
| [`normalizeOpenMeteoPvArrays`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L229) | values | Array.isArray, clamp, parseJson |
| [`loadSettings`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L256) | adapter | asBoolean, clamp, normalizeForecastSourceMode, normalizeOpenMeteoPvArrays, readSetting, text |
| [`coordinate`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L282) | value | Number, Number.isFinite, value.trim |
| [`validCoordinatePair`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L289) | latitude, longitude | Math.abs |
| [`normalizeCountryCode`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L296) | value | raw.toLowerCase, raw.toUpperCase, text |
| [`meaningfulLocationLabel`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L311) | value | generic.includes, raw.toLowerCase, text |
| [`systemLocationHints`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L325) | common | meaningfulLocationLabel, normalizeCountryCode, text |
| [`geocodeSystemLocation`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L337) | adapter, settings, common | Array.from, Array.isArray, Date.now, JSON.stringify, coordinate, encodeURIComponent, requestJson, results.find, systemLocationHints, validCoordinatePair |
| [`resolveLocation`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L375) | adapter, settings | adapter._nwGetSystemGeo, adapter.getForeignObjectAsync, adapter.getStateAsync, coordinate, geocodeSystemLocation, latitude.toFixed, meaningfulLocationLabel, settings.latitude.toFixed, settings.longitude.toFixed, systemLocationHints, validCoordinatePair |
| [`requestJson`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L435) | adapter, url | adapter._nwHttpsGetJson |
| [`requestJsonWithRetry`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L451) | adapter, url, attempts | Math.max, Math.min, Math.round, requestJson, text |
| [`openMeteoSolarPosition`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L466) | timestampMs, latitude, longitude | Math.asin, Math.atan2, Math.cos, Math.sin, Math.tan, clamp |
| [`openMeteoPlaneOfArrayIrradiance`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L488) | timestampMs, latitude, longitude, array, ghi, dni, dhi | Math.cos, Math.max, Math.sin, openMeteoSolarPosition |
| [`seriesValue`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L501) | data, key, index | Array.isArray, finite |
| [`forecastTimestamp`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L505) | value | Date.parse, Number, Number.isFinite, text |
| [`buildOpenMeteoPvCurve`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L515) | data, settings, location, nowMs | Array.isArray, Math.max, Math.min, Math.round, Number.isFinite, clamp, curve.push, curve.sort, forecastTimestamp, interpolate, openMeteoPlaneOfArrayIrradiance |
| [`interpolate`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L527) | key | seriesValue |
| [`tiltedForecastBlock`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L554) | data | Array.isArray |
| [`buildOpenMeteoTiltedPvCurve`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L571) | responses, settings, nowMs | Math.ceil, Math.max, Math.min, Number.isFinite, clamp, durationByTimestamp.set, finite, forecastTimestamp, powerByTimestamp.entries, powerByTimestamp.get, powerByTimestamp.set, tiltedForecastBlock |
| [`mergePvCurves`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L620) | curves | Array.isArray, Math.max, Number.isFinite, durationByTimestamp.get, durationByTimestamp.set, finite, powerByTimestamp.entries, powerByTimestamp.get, powerByTimestamp.set |
| [`integrateKwh`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L639) | curve, nowMs, hours | curve.reduce |
| [`normalizeFutureCurve`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L647) | value, nowMs | Array.isArray |
| [`buildLastGoodSnapshot`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L661) | previous, nowMs, details | Math.max, Math.round, curve.filter, finite, integrateKwh, normalizeFutureCurve, text |
| [`invalidSnapshot`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L709) | nowMs, error, settings, location, requestStatus, requestMode, lastAttemptAt | settings?.arrays.reduce |
| [`ensureState`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L732) | adapter, id, type, role, unit | adapter.setObjectNotExistsAsync |
| [`mirrorForecastUiState`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L744) | adapter, id, value, timestamp | Date.now, Object.is, adapter.updateValue |
| [`writeForecastState`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L752) | adapter, id, value, timestamp | Date.now, String, adapter.setStateAsync, mirrorForecastUiState, text |
| [`warnForecastStateWriteFailures`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L762) | adapter, scope, failures | Date.now, adapter.log?.warn, failures.slice, finite |
| [`readPersistedForecastState`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L771) | adapter, key | adapter.getStateAsync |
| [`restoreRecentPersistedSnapshot`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L784) | adapter | Date.now, Math.max, Math.round, Object.fromEntries, Promise.all, adapter.log?.debug, asBoolean, buildLastGoodSnapshot, clamp, finite, keys.map, parseJson, text |
| [`publish`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L836) | adapter, value | Date.now, JSON.stringify, Number, Object.entries, ensureState, failures.push, value.curve.slice, value.kwhNext12h.toFixed, value.kwhNext24h.toFixed, value.kwhNext6h.toFixed, warnForecastStateWriteFailures, writeForecastState |
| [`publishAttempt`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L871) | adapter, nowMs, settings, location | Object.entries, ensureState, failures.push, settings.arrays.reduce, warnForecastStateWriteFailures, writeForecastState |
| [`refresh`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L899) | adapter | Date.now, Math.ceil, Math.max, Math.min, String, adapter.log?.debug, buildLastGoodSnapshot, buildOpenMeteoPvCurve, buildOpenMeteoTiltedPvCurve, curve.filter, curveParts.every, curveParts.push, encodeURIComponent, integrateKwh (weitere in der Quelle) |
| [`requestTiltedArrays`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L952) | arrays, mode | Promise.allSettled, arrays.map, errors.push, missing.push, responses.push, text |
| [`startOpenMeteoPvForecastRuntime`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L1112) | adapter | cycle |
| [`clear`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L1116) | – | adapter.clearTimeout, clearTimeout |
| [`cycle`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L1122) | – | Date.now, clear, invalidSnapshot |
| [`callback`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L1139) | – | cycle |
| [`stop`](../../../../../../src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts#L1146) | – | clear |
