# src-ts/runtime-executables/ems/modules/storage-mapping.ts

Verbindet Speicher-Konfiguration und Messdatenpunkte mit den normierten Werten für die anschließende Speicherregelung.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/modules/storage-mapping.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `./base` | [src-ts/runtime-executables/ems/modules/base.ts](../../../../../../src-ts/runtime-executables/ems/modules/base.ts) |
| `../services/storage-datapoint-config` | [src-ts/runtime-executables/ems/services/storage-datapoint-config.ts](../../../../../../src-ts/runtime-executables/ems/services/storage-datapoint-config.ts) |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/module-manager.ts](../../../../../../src-ts/runtime-executables/ems/module-manager.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`SpeicherMappingModule.constructor`](../../../../../../src-ts/runtime-executables/ems/modules/storage-mapping.ts#L37) | adapter, dpRegistry | super |
| [`SpeicherMappingModule.init`](../../../../../../src-ts/runtime-executables/ems/modules/storage-mapping.ts#L46) | – | this._ensureStates, this._upsertFromConfig |
| [`SpeicherMappingModule.tick`](../../../../../../src-ts/runtime-executables/ems/modules/storage-mapping.ts#L50) | – | Math.round, Number.isFinite, String, this._getCfg, this._setIfChanged, this.adapter._nwGetStorageControlAuthority, this.dp.getAgeMs, this.dp.getNumber |
| [`SpeicherMappingModule._ensureStates`](../../../../../../src-ts/runtime-executables/ems/modules/storage-mapping.ts#L89) | – | this.adapter.extendObjectAsync, this.adapter.getStateAsync, this.adapter.setStateAsync |
| [`SpeicherMappingModule._getCfg`](../../../../../../src-ts/runtime-executables/ems/modules/storage-mapping.ts#L162) | – | String, boolValue, buildStorageMeasurementFallbackFromGlobal, inherit, mergeStorageMeasurementFallback, normalizeStorageDatapointsConfig, normalizeVendorProfile, storage.coupling.trim, this.adapter._nwGetStorageControlAuthority, this.adapter._nwGetStorageFarmRuntimeInfo |
| [`normalizeVendorProfile`](../../../../../../src-ts/runtime-executables/ems/modules/storage-mapping.ts#L167) | value | String |
| [`boolValue`](../../../../../../src-ts/runtime-executables/ems/modules/storage-mapping.ts#L185) | value, fallback | String |
| [`inherit`](../../../../../../src-ts/runtime-executables/ems/modules/storage-mapping.ts#L192) | canonical, aliases | – |
| [`SpeicherMappingModule._upsertFromConfig`](../../../../../../src-ts/runtime-executables/ems/modules/storage-mapping.ts#L243) | – | Number, Number.isFinite, String, missing.join, missing.push, this._getCfg, this._setIfChanged, this.dp.upsert |
| [`SpeicherMappingModule._setIfChanged`](../../../../../../src-ts/runtime-executables/ems/modules/storage-mapping.ts#L750) | id, val | this.adapter.getStateAsync, this.adapter.log.debug, this.adapter.setStateAsync |
