# src-ts/runtime-executables/ems/services/fenecon-nvp-shadow-runtime.ts

Vergleicht Fenecon-bezogene Netzverknüpfungspunkt-Werte im Diagnose-/Shadow-Kontext.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/services/fenecon-nvp-shadow-runtime.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `./fenecon-hybrid-control` | [src-ts/runtime-executables/ems/services/fenecon-hybrid-control.ts](../../../../../../src-ts/runtime-executables/ems/services/fenecon-hybrid-control.ts) |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/modules/storage-control.ts](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`strictFiniteNumber`](../../../../../../src-ts/runtime-executables/ems/services/fenecon-nvp-shadow-runtime.ts#L32) | value, fallback | Number, Number.isFinite, value.trim |
| [`num`](../../../../../../src-ts/runtime-executables/ems/services/fenecon-nvp-shadow-runtime.ts#L40) | value, fallback | strictFiniteNumber |
| [`clamp`](../../../../../../src-ts/runtime-executables/ems/services/fenecon-nvp-shadow-runtime.ts#L44) | value, minValue, maxValue | Math.max, Math.min |
| [`ensureFeneconNvpShadowStates`](../../../../../../src-ts/runtime-executables/ems/services/fenecon-nvp-shadow-runtime.ts#L86) | mk | mk |
| [`updateFeneconNvpShadowRuntime`](../../../../../../src-ts/runtime-executables/ems/services/fenecon-nvp-shadow-runtime.ts#L92) | host, ctx | Date.now, JSON.stringify, Math.abs, Math.max, Math.min, Math.round, Number, Number.isFinite, String, calculateFeneconNvpShadow, clamp, host._buildIndependentPvLoadFeedForward, host._getCfg, host._getStorageControlAuthority (weitere in der Quelle) |
| [`safeSet`](../../../../../../src-ts/runtime-executables/ems/services/fenecon-nvp-shadow-runtime.ts#L93) | id, value | host._setIfChanged |
| [`clearNumericStates`](../../../../../../src-ts/runtime-executables/ems/services/fenecon-nvp-shadow-runtime.ts#L100) | – | safeSet |
| [`setInactive`](../../../../../../src-ts/runtime-executables/ems/services/fenecon-nvp-shadow-runtime.ts#L123) | reason, extra | Date.now, JSON.stringify, Number, String, clearNumericStates, safeSet |
| [`readFresh`](../../../../../../src-ts/runtime-executables/ems/services/fenecon-nvp-shadow-runtime.ts#L213) | key | host.dp.getAgeMs, host.dp.getEntry, host.dp.getNumberFresh, strictFiniteNumber |
| [`n`](../../../../../../src-ts/runtime-executables/ems/services/fenecon-nvp-shadow-runtime.ts#L442) | value | Math.round, Number, strictFiniteNumber |
