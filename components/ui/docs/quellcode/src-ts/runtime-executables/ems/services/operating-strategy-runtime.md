# src-ts/runtime-executables/ems/services/operating-strategy-runtime.ts

Löst konfigurierte Betriebsstrategien und deren Überlagerung in wirksame Laufzeit-Vorgaben auf.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/services/operating-strategy-runtime.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/modules/charging-management.ts](../../../../../../src-ts/runtime-executables/ems/modules/charging-management.ts)
- [src-ts/runtime-executables/ems/modules/heating-rod-control.ts](../../../../../../src-ts/runtime-executables/ems/modules/heating-rod-control.ts)
- [src-ts/runtime-executables/ems/modules/operating-strategies.ts](../../../../../../src-ts/runtime-executables/ems/modules/operating-strategies.ts)
- [src-ts/runtime-executables/ems/modules/storage-control.ts](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts)
- [src-ts/runtime-executables/ems/modules/thermal-control.ts](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`text`](../../../../../../src-ts/runtime-executables/ems/services/operating-strategy-runtime.ts#L20) | value, fallback | String |
| [`num`](../../../../../../src-ts/runtime-executables/ems/services/operating-strategy-runtime.ts#L25) | value, fallback | Number, Number.isFinite |
| [`clamp`](../../../../../../src-ts/runtime-executables/ems/services/operating-strategy-runtime.ts#L30) | value, minValue, maxValue, fallback | Math.max, Math.min, Number, Number.isFinite |
| [`normalizeStrategyAutoSource`](../../../../../../src-ts/runtime-executables/ems/services/operating-strategy-runtime.ts#L36) | raw | text |
| [`normalizeStrategyFallback`](../../../../../../src-ts/runtime-executables/ems/services/operating-strategy-runtime.ts#L43) | raw | text |
| [`getOperatingStrategyConfig`](../../../../../../src-ts/runtime-executables/ems/services/operating-strategy-runtime.ts#L48) | adapter | Array.isArray |
| [`operatingStrategiesAppActive`](../../../../../../src-ts/runtime-executables/ems/services/operating-strategy-runtime.ts#L53) | adapterOrConfig | – |
| [`isOperatingStrategiesLiveConfig`](../../../../../../src-ts/runtime-executables/ems/services/operating-strategy-runtime.ts#L66) | config, appEnabled | text |
| [`getOperatingStrategyRuntime`](../../../../../../src-ts/runtime-executables/ems/services/operating-strategy-runtime.ts#L79) | adapter | Array.isArray |
| [`normalizeSourceAliases`](../../../../../../src-ts/runtime-executables/ems/services/operating-strategy-runtime.ts#L84) | sourceIds | Array.isArray, out.push, seen.add, seen.has, text |
| [`findResourceLink`](../../../../../../src-ts/runtime-executables/ems/services/operating-strategy-runtime.ts#L97) | adapter, sourceIds | Array.isArray, getOperatingStrategyConfig, getOperatingStrategyRuntime, links.find, normalizeSourceAliases, resolveCanonicalIds |
| [`isLinkLiveEligible`](../../../../../../src-ts/runtime-executables/ems/services/operating-strategy-runtime.ts#L106) | link | text |
| [`isRuntimeRequestFresh`](../../../../../../src-ts/runtime-executables/ems/services/operating-strategy-runtime.ts#L115) | request, now | Date.now, num |
| [`resolveCanonicalIds`](../../../../../../src-ts/runtime-executables/ems/services/operating-strategy-runtime.ts#L124) | runtime, sourceIds | normalizeSourceAliases, out.push, seen.add, seen.has, text |
| [`getOperatingStrategyRequest`](../../../../../../src-ts/runtime-executables/ems/services/operating-strategy-runtime.ts#L141) | adapter, sourceIds, now, options | Date.now, getOperatingStrategyRuntime, isRuntimeRequestFresh, resolveCanonicalIds |
| [`runtimeUnavailableReason`](../../../../../../src-ts/runtime-executables/ems/services/operating-strategy-runtime.ts#L161) | adapter, sourceIds, now | Date.now, getOperatingStrategyRequest, getOperatingStrategyRuntime, resolveCanonicalIds, text |
| [`resolveChargingStrategyOverlay`](../../../../../../src-ts/runtime-executables/ems/services/operating-strategy-runtime.ts#L178) | adapter, sourceIds, options | Date.now, Math.max, Number, Number.isFinite, clamp, findResourceLink, getOperatingStrategyRequest, isLinkLiveEligible, normalizeSourceAliases, normalizeStrategyAutoSource, normalizeStrategyFallback, num, runtimeUnavailableReason, text |
| [`resolveStorageStrategyOverlay`](../../../../../../src-ts/runtime-executables/ems/services/operating-strategy-runtime.ts#L243) | adapter, sourceIds, options | Date.now, clamp, findResourceLink, getOperatingStrategyRuntime, isLinkLiveEligible, normalizeSourceAliases, num, resolveCanonicalIds, runtimeUnavailableReason, text |
| [`resolveThermalStrategyOverlay`](../../../../../../src-ts/runtime-executables/ems/services/operating-strategy-runtime.ts#L294) | adapter, sourceIds, options | Date.now, Math.max, Number, Number.isFinite, findResourceLink, getOperatingStrategyRequest, isLinkLiveEligible, normalizeSourceAliases, normalizeStrategyFallback, num, runtimeUnavailableReason, text |
| [`resolveHeatingRodStrategyOverlay`](../../../../../../src-ts/runtime-executables/ems/services/operating-strategy-runtime.ts#L340) | adapter, sourceIds, options | Date.now, Math.max, Number, Number.isFinite, findResourceLink, getOperatingStrategyRequest, isLinkLiveEligible, normalizeSourceAliases, normalizeStrategyFallback, num, runtimeUnavailableReason, text |
