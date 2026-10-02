# src-ts/runtime-executables/ems/rc85-runtime-hardening.ts

Kapselt Laufzeitgrenzen, Fehlerisolation und Schutzmechanismen für Regelmodule und Speicherverbrauch.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/ems/rc85-runtime-hardening.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `node:v8` | Node-Bordmittel oder externe Paketabhängigkeit. |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/module-manager.ts](../../../../../src-ts/runtime-executables/ems/module-manager.ts)
- [src-ts/runtime-executables/ems/modules/charging-management.ts](../../../../../src-ts/runtime-executables/ems/modules/charging-management.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`boundedMapSet`](../../../../../src-ts/runtime-executables/ems/rc85-runtime-hardening.ts#L65) | map, key, value, max | map.delete, map.keys, map.set |
| [`logWatchdogOnce`](../../../../../src-ts/runtime-executables/ems/rc85-runtime-hardening.ts#L74) | label, message, log, now | Date.now, boundedMapSet, log.warn, timeoutLogAt.get |
| [`rc88RuntimeHardeningSnapshot`](../../../../../src-ts/runtime-executables/ems/rc85-runtime-hardening.ts#L81) | now | Date.now, Math.max, labels.push, labels.slice |
| [`rc88ClearRuntimeHardening`](../../../../../src-ts/runtime-executables/ems/rc85-runtime-hardening.ts#L96) | – | entry.controller.abort, inFlight.clear, inFlight.values, timeoutLogAt.clear |
| [`rc85RunIsolatedResult`](../../../../../src-ts/runtime-executables/ems/rc85-runtime-hardening.ts#L104) | label, timeoutMs, work, log | Date.now, Math.max, Math.min, Number, Promise.race, Promise.resolve, String, Symbol, clearTimeout, inFlight.get, inFlight.set, logWatchdogOnce, normalizedError.message.startsWith, task.then |
| [`rc85RunIsolated`](../../../../../src-ts/runtime-executables/ems/rc85-runtime-hardening.ts#L209) | label, timeoutMs, work, log | rc85RunIsolatedResult |
| [`rc85IsHardReason`](../../../../../src-ts/runtime-executables/ems/rc85-runtime-hardening.ts#L219) | reasonValue | String |
| [`rc85IsSoftEconomicReason`](../../../../../src-ts/runtime-executables/ems/rc85-runtime-hardening.ts#L224) | reasonValue | String |
| [`Rc85EvcsDecisionGuard.evaluate`](../../../../../src-ts/runtime-executables/ems/rc85-runtime-hardening.ts#L256) | input | Date.now, Math.max, Math.min, Number, Number.isFinite, boundedMapSet, rc85IsHardReason, rc85IsSoftEconomicReason, this.prune, this.states.get |
| [`Rc85EvcsDecisionGuard.prune`](../../../../../src-ts/runtime-executables/ems/rc85-runtime-hardening.ts#L346) | now | Date.now, this.states.delete, this.states.keys |
| [`Rc85EvcsDecisionGuard.clear`](../../../../../src-ts/runtime-executables/ems/rc85-runtime-hardening.ts#L354) | – | this.states.clear |
| [`rc85GridEnvelope`](../../../../../src-ts/runtime-executables/ems/rc85-runtime-hardening.ts#L371) | input | Math.max, Math.min, Number |
| [`rc86GridBinding`](../../../../../src-ts/runtime-executables/ems/rc85-runtime-hardening.ts#L439) | input | Math.max, Math.min, Math.round, Number, Number.isFinite |
| [`rc85OfflineReserveW`](../../../../../src-ts/runtime-executables/ems/rc85-runtime-hardening.ts#L485) | points | Boolean, Math.max, Number, String |
| [`clampRatio`](../../../../../src-ts/runtime-executables/ems/rc85-runtime-hardening.ts#L532) | value, fallback, min, max | Math.max, Math.min, Number, Number.isFinite |
| [`rc88ClassifyHeapPressure`](../../../../../src-ts/runtime-executables/ems/rc85-runtime-hardening.ts#L556) | input | Math.max, Number, clampRatio |
| [`safeDiagnosticsJson`](../../../../../src-ts/runtime-executables/ems/rc85-runtime-hardening.ts#L581) | – | JSON.stringify, String, heapMonitorOptions.getDiagnostics, json.slice |
| [`scheduleControlledRestart`](../../../../../src-ts/runtime-executables/ems/rc85-runtime-hardening.ts#L591) | sample, reason | heapMonitorLog.error, heapMonitorOptions.onBeforeRestart, safeDiagnosticsJson, setTimeout |
| [`runHeapMonitorSample`](../../../../../src-ts/runtime-executables/ems/rc85-runtime-hardening.ts#L604) | – | Date.now, Math.max, Math.min, Math.round, Number, String, clampRatio, getHeapStatistics, heapMonitorLog.warn, heapMonitorOptions.onPressure, heapSamples.find, heapSamples.push, heapSamples.shift, process.memoryUsage (weitere in der Quelle) |
| [`startRc85HeapMonitor`](../../../../../src-ts/runtime-executables/ems/rc85-runtime-hardening.ts#L663) | log, options | Math.max, Math.min, Number, setInterval |
| [`stopRc85HeapMonitor`](../../../../../src-ts/runtime-executables/ems/rc85-runtime-hardening.ts#L674) | – | clearInterval, clearTimeout |
