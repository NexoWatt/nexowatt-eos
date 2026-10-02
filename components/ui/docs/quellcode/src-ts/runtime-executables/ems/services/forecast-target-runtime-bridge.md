# src-ts/runtime-executables/ems/services/forecast-target-runtime-bridge.ts

Überführt gespeicherte Ladeziele und Planungsergebnisse in Laufzeit-Modi, Status und begrenzte Zielanforderungen.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/services/forecast-target-runtime-bridge.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `./forecast-aware-target-planner` | [src-ts/runtime-executables/ems/services/forecast-aware-target-planner.ts](../../../../../../src-ts/runtime-executables/ems/services/forecast-aware-target-planner.ts) |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/modules/charging-management.ts](../../../../../../src-ts/runtime-executables/ems/modules/charging-management.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`finite`](../../../../../../src-ts/runtime-executables/ems/services/forecast-target-runtime-bridge.ts#L24) | value, fallback | Number, Number.isFinite |
| [`normalizeMode`](../../../../../../src-ts/runtime-executables/ems/services/forecast-target-runtime-bridge.ts#L28) | value | String |
| [`resolveZeroExportChargingPolicy`](../../../../../../src-ts/runtime-executables/ems/services/forecast-target-runtime-bridge.ts#L48) | input | Math.max, Number, Number.isFinite, String, normalizeMode, raw.trim |
| [`runtimeChargingMaximumW`](../../../../../../src-ts/runtime-executables/ems/services/forecast-target-runtime-bridge.ts#L62) | wallbox, pvAvailableW | Math.max, Math.min, Number.isFinite, finite, normalizeMode |
| [`buildRuntimeGoalPlanMap`](../../../../../../src-ts/runtime-executables/ems/services/forecast-target-runtime-bridge.ts#L71) | input | Array.isArray, Date.now, Math.max, Math.min, Number, Number.isFinite, String, active.map, active.reduce, buildForecastAwareTargetPlans, finite, result.set, tariff.segments.map, wallboxes.filter |
| [`goalPlanStateRows`](../../../../../../src-ts/runtime-executables/ems/services/forecast-target-runtime-bridge.ts#L165) | plan, wallbox | Math.max, Math.round, String, finite, normalizeMode |
| [`resolvePlanEffectiveMode`](../../../../../../src-ts/runtime-executables/ems/services/forecast-target-runtime-bridge.ts#L186) | userMode, effectiveMode, plan, strategy, autoSource | String, normalizeMode |
| [`applyGoalPlan`](../../../../../../src-ts/runtime-executables/ems/services/forecast-target-runtime-bridge.ts#L199) | input | Math.max, Math.min, String, finite, normalizeMode |
| [`applyStrategyOverlay`](../../../../../../src-ts/runtime-executables/ems/services/forecast-target-runtime-bridge.ts#L224) | input | Math.max, Math.min, Number.isFinite, String, finite, normalizeMode |
| [`resolveGoalCommandStatus`](../../../../../../src-ts/runtime-executables/ems/services/forecast-target-runtime-bridge.ts#L249) | input | Math.max, Math.round, String, finite |
