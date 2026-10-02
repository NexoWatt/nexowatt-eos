# src-ts/runtime-executables/ems/services/storage-override-bridge.ts

Übernimmt freigegebene Speicher-Messwertüberlagerungen in den von der Engine verwendeten Kontext.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/services/storage-override-bridge.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `./storage-datapoint-config` | [src-ts/runtime-executables/ems/services/storage-datapoint-config.ts](../../../../../../src-ts/runtime-executables/ems/services/storage-datapoint-config.ts) |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/engine.ts](../../../../../../src-ts/runtime-executables/ems/engine.ts)
- [src-ts/runtime-executables/ems/modules/storage-control.ts](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`text`](../../../../../../src-ts/runtime-executables/ems/services/storage-override-bridge.ts#L61) | value | String |
| [`finite`](../../../../../../src-ts/runtime-executables/ems/services/storage-override-bridge.ts#L65) | value, fallback | Number, Number.isFinite |
| [`resolvePowerScale`](../../../../../../src-ts/runtime-executables/ems/services/storage-override-bridge.ts#L71) | adapter, key, objectId | Object.prototype.hasOwnProperty.call, adapter.getForeignObjectAsync, text |
| [`applyStorageMeasurementOverrides`](../../../../../../src-ts/runtime-executables/ems/services/storage-override-bridge.ts#L98) | adapter, datapoints | Date.now, buildStorageMeasurementFallbackFromGlobal, mergeStorageMeasurementFallback, normalizeStorageDatapointsConfig, resolvePowerScale, text |
| [`objectIdOf`](../../../../../../src-ts/runtime-executables/ems/services/storage-override-bridge.ts#L157) | entry | text |
| [`resolveSplitBatteryFeedback`](../../../../../../src-ts/runtime-executables/ems/services/storage-override-bridge.ts#L166) | registry, storageConfig, staleMs | Math.abs, Math.max, Math.round, Number, Number.isFinite, finite, objectIdOf, objectIds.push, registry.getAgeMs, registry.getEntry, registry.getMeasurementTimestampMs, registry.getNumber, sampleParts.join, sampleParts.push (weitere in der Quelle) |
