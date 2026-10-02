# src-ts/runtime-executables/ems/modules/tariff-provider.ts

Lädt Tarifdaten über die registrierten Anbieter und stellt sie der weiteren Tarifverarbeitung bereit.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/modules/tariff-provider.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `./base` | [src-ts/runtime-executables/ems/modules/base.ts](../../../../../../src-ts/runtime-executables/ems/modules/base.ts) |
| `../services/tariff-provider-registry` | [src-ts/runtime-executables/ems/services/tariff-provider-registry.ts](../../../../../../src-ts/runtime-executables/ems/services/tariff-provider-registry.ts) |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/module-manager.ts](../../../../../../src-ts/runtime-executables/ems/module-manager.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`TariffProviderModule.constructor`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-provider.ts#L27) | adapter, dpRegistry | super |
| [`TariffProviderModule.init`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-provider.ts#L40) | – | mk, this.adapter.setObjectNotExistsAsync |
| [`mk`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-provider.ts#L46) | id, name, type, role, unit | this.adapter.setObjectNotExistsAsync |
| [`TariffProviderModule._cfg`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-provider.ts#L72) | – | Math.max, Math.min, Math.round, Number, String |
| [`TariffProviderModule._set`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-provider.ts#L92) | id, val | this.adapter.setStateAsync |
| [`TariffProviderModule._providerSourceId`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-provider.ts#L96) | cfg | String |
| [`TariffProviderModule._localHour`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-provider.ts#L103) | nowMs, timeZone | Number, String |
| [`TariffProviderModule._stableJitterFactor`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-provider.ts#L115) | seed | Math.imul, String, text.charCodeAt |
| [`TariffProviderModule._baseRefreshMinutes`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-provider.ts#L128) | cfg, nowMs | Math.max, Math.min, Math.round, Number, splitTodayTomorrow, this._localHour, this._providerSourceId |
| [`TariffProviderModule._scheduleNextFetch`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-provider.ts#L147) | cfg, nowMs, success | Math.floor, Math.max, Math.min, Math.pow, Math.round, Number, this._baseRefreshMinutes, this._providerSourceId, this._stableJitterFactor |
| [`TariffProviderModule._setTariffSettings`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-provider.ts#L159) | cfg | Number, String, this.adapter.getForeignStateAsync, this.adapter.log.debug, this.adapter.setForeignStateAsync |
| [`TariffProviderModule._publish`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-provider.ts#L176) | cfg, nowMs, statusOverride | JSON.stringify, Number.isFinite, String, currentAndAverage, splitTodayTomorrow, this._intervals.find, this._intervals.some, this._set |
| [`TariffProviderModule._refresh`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-provider.ts#L244) | cfg, nowMs | Array.isArray, Date.now, String, fetchProvider, this._publish, this._scheduleNextFetch, this.adapter.log.warn |
| [`TariffProviderModule.tick`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-provider.ts#L266) | – | Date.now, this._cfg, this._publish, this._refresh, this._set, this._setTariffSettings |
