# src-ts/runtime-executables/lib/charging-diagnostics-api.ts

Stellt Ladeentscheidungen und Auditinformationen über die geschützten Diagnose-Endpunkte bereit.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/lib/charging-diagnostics-api.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

- [src-ts/runtime-executables/main.ts](../../../../../src-ts/runtime-executables/main.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`parseJsonState`](../../../../../src-ts/runtime-executables/lib/charging-diagnostics-api.ts#L18) | raw, fallback | JSON.parse, raw.trim |
| [`readOwn`](../../../../../src-ts/runtime-executables/lib/charging-diagnostics-api.ts#L22) | adapter, id | adapter.getStateAsync |
| [`compactSafetyEnvelope`](../../../../../src-ts/runtime-executables/lib/charging-diagnostics-api.ts#L27) | adapter | Number, Number.isFinite, String |
| [`buildChargingDiagnosticsExtras`](../../../../../src-ts/runtime-executables/lib/charging-diagnostics-api.ts#L37) | adapter, limitRaw | Array.isArray, Date.now, Math.max, Math.min, Math.round, Number, Number.isFinite, compactSafetyEnvelope, events.slice, iface.getEvents, parseJsonState, readOwn |
| [`clearChargingDiagnosticsAudit`](../../../../../src-ts/runtime-executables/lib/charging-diagnostics-api.ts#L56) | adapter | adapter.setStateAsync, iface.clear |
| [`registerChargingDiagnosticsAuditApi`](../../../../../src-ts/runtime-executables/lib/charging-diagnostics-api.ts#L69) | app, adapter, requireInstaller | app.get, app.post |
