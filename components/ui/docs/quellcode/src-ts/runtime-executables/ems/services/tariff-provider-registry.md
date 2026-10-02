# src-ts/runtime-executables/ems/services/tariff-provider-registry.ts

Registriert unterstützte Tarifquellen und deren Aufruf-/Normalisierungsschnittstellen.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/modules/tariff-provider.ts](../../../../../../src-ts/runtime-executables/ems/modules/tariff-provider.ts)
- [src-ts/runtime-executables/main.ts](../../../../../../src-ts/runtime-executables/main.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`clampNumber`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L110) | value, fallback, min, max | Math.max, Math.min, Number, Number.isFinite |
| [`parseJsonMaybe`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L116) | raw | JSON.parse, raw.trim |
| [`getByPath`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L124) | root, pathSpec | String, normalized.split |
| [`num`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L137) | value, fallback | Number, Number.isFinite, String, text.includes, text.lastIndexOf, text.replace |
| [`toIso`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L154) | value | Date.parse, Math.abs, Number.isFinite, String, d.getTime, d.toISOString |
| [`priceToEurKwh`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L166) | value, unit | Number.isFinite, String, num |
| [`applyFormula`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L176) | marketEurKwh, formula | Number, Number.isFinite, clampNumber, num |
| [`normalizeInterval`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L196) | row, options | Date.parse, Math.round, Number.isFinite, String, applyFormula, candidates.find, clampNumber, num, priceToEurKwh, toIso |
| [`normalizeRows`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L240) | rows, options | Array.isArray |
| [`splitTodayTomorrow`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L248) | intervals, nowMs, timeZone | Date.now, Date.parse, dateKey, today.push, tomorrow.push |
| [`dateKey`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L249) | ms | – |
| [`currentAndAverage`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L268) | intervals, nowMs | Array.isArray, Date.now, Number, future.reduce, rows.filter, rows.find |
| [`buildTibberQuery`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L276) | resolutionMinutes | Number |
| [`normalizeTibber`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L281) | payload, config | Array.isArray, Number, String, getByPath, homes.find, normalizeRows |
| [`collectLikelyPriceRows`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L301) | value, depth | Array.isArray, Object.prototype.hasOwnProperty.call, Object.values, collectLikelyPriceRows, value.some |
| [`normalizeEnergyZero`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L329) | payload, config | Number, String, collectLikelyPriceRows, component.toLowerCase, normalizeRows, rawRows.map |
| [`parseIsoDurationMinutes`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L349) | value, fallback | Number, String |
| [`xmlText`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L355) | block, tag | String |
| [`normalizeEntsoe`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L361) | xml, config | Date.parse, Math.max, Math.round, Number, Number.isFinite, Object.keys, String, normalizeRows, num, parseIsoDurationMinutes, period.match, rows.push, text.includes, text.match (weitere in der Quelle) |
| [`normalizeCustomRest`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L399) | payload, config | Array.isArray, Number, collectLikelyPriceRows, getByPath, normalizeRows, rows.map |
| [`withTimeout`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L420) | timeoutMs, fn | Math.max, Number, Promise.resolve, setTimeout |
| [`fetchJson`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L428) | url, options | withTimeout |
| [`fetchText`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L437) | url, options | withTimeout |
| [`headersFromConfig`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L446) | raw | Array.isArray, Object.entries, String, parseJsonMaybe |
| [`fetchTibber`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L457) | config | Array.isArray, JSON.stringify, String, buildTibberQuery, fetchJson, normalizeTibber |
| [`fetchEnergyZero`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L475) | config | Number, String, fetchJson, normalizeEnergyZero, now.getDate, now.getFullYear, now.getMonth, pad, url.searchParams.has, url.searchParams.set, url.toString |
| [`pad`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L483) | value | String |
| [`entsoeWindow`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L497) | nowMs | Date.now, dayStart.getTime, dayStart.setUTCHours, fmt |
| [`fmt`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L505) | d | String, d.getUTCDate, d.getUTCFullYear, d.getUTCHours, d.getUTCMinutes, d.getUTCMonth |
| [`fetchEntsoe`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L515) | config | String, entsoeWindow, fetchText, normalizeEntsoe, url.searchParams.set, url.toString |
| [`fetchOAuthToken`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L536) | config | String, body.set, withTimeout |
| [`fetchCustomRest`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L562) | config, overrideToken | Buffer.from, String, fetchJson, headersFromConfig, normalizeCustomRest |
| [`fetchOstrom`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L589) | config | String, fetchCustomRest, fetchOAuthToken |
| [`fetchProvider`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L594) | config | String, fetchCustomRest, fetchEnergyZero, fetchEntsoe, fetchOstrom, fetchProvider, fetchTibber |
| [`publicRegistry`](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts#L608) | – | PROVIDERS.map, PROVIDER_PROFILES.map |
