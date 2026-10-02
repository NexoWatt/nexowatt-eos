# src-ts/backend/main-runtime/main-runtime-helpers.ts

Bündelt typisierte Normalisierungs- und Hilfsschritte, die der Adapter-Kern über erzeugte JavaScript-Spiegel verwendet.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/backend/main-runtime/main-runtime-helpers.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

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
| [`normalizeLicenseKeyInput`](../../../../../src-ts/backend/main-runtime/main-runtime-helpers.ts#L55) | input | String |
| [`normalizeLicenseKeyForComparison`](../../../../../src-ts/backend/main-runtime/main-runtime-helpers.ts#L71) | input | normalizeLicenseKeyInput |
| [`isMaskedLicenseKeyInput`](../../../../../src-ts/backend/main-runtime/main-runtime-helpers.ts#L90) | input | compactRaw.startsWith, normalizeLicenseKeyForComparison, normalizeLicenseKeyInput, raw.replace |
| [`normalizeLicenseKeyForStorage`](../../../../../src-ts/backend/main-runtime/main-runtime-helpers.ts#L114) | input | isMaskedLicenseKeyInput, normalizeLicenseKeyInput |
| [`buildInfoConnectionStateUpdate`](../../../../../src-ts/backend/main-runtime/main-runtime-helpers.ts#L132) | online, reason, ts | Date.now, Number, Number.isFinite, normalizeLicenseKeyInput |
| [`normalizeApiSetPrimitive`](../../../../../src-ts/backend/main-runtime/main-runtime-helpers.ts#L153) | input | Number, Number.isFinite, String, raw.replace, raw.toLowerCase |
| [`apiStateValueType`](../../../../../src-ts/backend/main-runtime/main-runtime-helpers.ts#L224) | value | Array.isArray |
| [`normalizeApiStateShadowEntry`](../../../../../src-ts/backend/main-runtime/main-runtime-helpers.ts#L249) | key, raw | Array.isArray, Number, Number.isFinite, Object.prototype.hasOwnProperty.call, apiStateValueType, normalizeLicenseKeyInput |
| [`buildApiStateShadowSnapshot`](../../../../../src-ts/backend/main-runtime/main-runtime-helpers.ts#L286) | stateCache, sampleLimit | Date.now, Math.max, Object.keys, falseValueKeys.push, falseValueKeys.slice, invalidEntryKeys.push, invalidEntryKeys.slice, keys.slice, missingValueKeys.push, missingValueKeys.slice, normalizeApiStateShadowEntry, warnings.push, zeroValueKeys.push, zeroValueKeys.slice |
| [`buildApiSetShadowPlan`](../../../../../src-ts/backend/main-runtime/main-runtime-helpers.ts#L333) | scopeInput, keyInput, valueInput | Array.isArray, Date.now, normalizeApiSetPrimitive, normalizeLicenseKeyInput |
| [`compareApiStateShadow`](../../../../../src-ts/backend/main-runtime/main-runtime-helpers.ts#L381) | stateCache, _now | Date.now, buildApiStateShadowSnapshot, mismatches.push |
