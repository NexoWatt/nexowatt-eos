# src-ts/ems/ai-advisor/ai-advisor-payload.ts

Bereitet die Eingangsdaten des Energieberaters aus normierten Anlagenwerten auf.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/ems/ai-advisor/ai-advisor-payload.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/modules/ai-advisor.ts](../../../../../src-ts/runtime-executables/ems/modules/ai-advisor.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`asText`](../../../../../src-ts/ems/ai-advisor/ai-advisor-payload.ts#L97) | value, fallback | String, text.trim |
| [`asNumber`](../../../../../src-ts/ems/ai-advisor/ai-advisor-payload.ts#L109) | value, fallback | Number, Number.isFinite |
| [`normalizeSeverity`](../../../../../src-ts/ems/ai-advisor/ai-advisor-payload.ts#L120) | value, fallback | String |
| [`normalizeSuggestion`](../../../../../src-ts/ems/ai-advisor/ai-advisor-payload.ts#L136) | item, index | Math.max, Math.min, Math.round, asNumber, asText, normalizeSeverity |
| [`safeJson`](../../../../../src-ts/ems/ai-advisor/ai-advisor-payload.ts#L161) | value, fallback | JSON.stringify |
| [`buildAiAdvisorPublishPayload`](../../../../../src-ts/ems/ai-advisor/ai-advisor-payload.ts#L181) | input | Array.isArray, Math.max, Math.min, Math.round, asNumber, asText, rawList.slice, safeJson |
