# src-ts/runtime-executables/ems/services/storage-self-consumption-policy.ts

Bestimmt die SOC- und NVP-Zielvorgaben der aktiven Einzel-/Farm-Topologie und trennt Standalone-Einstellungen von aktivem MultiUse.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/services/storage-self-consumption-policy.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/modules/core-limits.ts](../../../../../../src-ts/runtime-executables/ems/modules/core-limits.ts)
- [src-ts/runtime-executables/ems/modules/multi-use.ts](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts)
- [src-ts/runtime-executables/ems/modules/nvp-coordinator.ts](../../../../../../src-ts/runtime-executables/ems/modules/nvp-coordinator.ts)
- [src-ts/runtime-executables/ems/modules/storage-control.ts](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts)
- [src-ts/runtime-executables/main.ts](../../../../../../src-ts/runtime-executables/main.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`isRecord`](../../../../../../src-ts/runtime-executables/ems/services/storage-self-consumption-policy.ts#L46) | value | Array.isArray |
| [`finiteOrNull`](../../../../../../src-ts/runtime-executables/ems/services/storage-self-consumption-policy.ts#L50) | value | Number, Number.isFinite |
| [`boolOrNull`](../../../../../../src-ts/runtime-executables/ems/services/storage-self-consumption-policy.ts#L56) | value | value.trim |
| [`clamp`](../../../../../../src-ts/runtime-executables/ems/services/storage-self-consumption-policy.ts#L67) | value, min, max | Math.max, Math.min |
| [`firstFinite`](../../../../../../src-ts/runtime-executables/ems/services/storage-self-consumption-policy.ts#L71) | values, fallback | finiteOrNull |
| [`firstBoolean`](../../../../../../src-ts/runtime-executables/ems/services/storage-self-consumption-policy.ts#L79) | values, fallback | boolOrNull |
| [`normalizeStorageTopology`](../../../../../../src-ts/runtime-executables/ems/services/storage-self-consumption-policy.ts#L87) | value | String |
| [`resolveNvpBandTarget`](../../../../../../src-ts/runtime-executables/ems/services/storage-self-consumption-policy.ts#L112) | nvpValue, targetValue, hysteresisValue | Math.max, finiteOrNull |
| [`resolveStorageNvpTuning`](../../../../../../src-ts/runtime-executables/ems/services/storage-self-consumption-policy.ts#L178) | input | Math.max, String, boolOrNull, finiteOrNull, firstFinite, isRecord, multiUsePolicySourceMarker.includes, normalizeStorageTopology |
| [`normalizeMultiUsePolicy`](../../../../../../src-ts/runtime-executables/ems/services/storage-self-consumption-policy.ts#L263) | multiUse, defaults, nvpTuning | Math.max, Number, String, clamp, firstBoolean, firstFinite |
| [`resolveStorageSocPolicy`](../../../../../../src-ts/runtime-executables/ems/services/storage-self-consumption-policy.ts#L330) | input | Math.max, Number, String, boolOrNull, clamp, finiteOrNull, firstBoolean, firstFinite, isRecord, multiUsePolicySourceMarker.includes, normalizeMultiUsePolicy, resolveStorageNvpTuning |
| [`resolveStorageSelfConsumptionPolicy`](../../../../../../src-ts/runtime-executables/ems/services/storage-self-consumption-policy.ts#L474) | input | resolveStorageSocPolicy |
| [`resolveStorageOperatingPolicy`](../../../../../../src-ts/runtime-executables/ems/services/storage-self-consumption-policy.ts#L478) | input | resolveStorageSocPolicy |
