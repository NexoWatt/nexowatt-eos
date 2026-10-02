# src-ts/ems/para14a/para14a-constraint.ts

Berechnet die aus einer §14a-Vorgabe resultierende Begrenzung unter den übergebenen Randbedingungen.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/ems/para14a/para14a-constraint.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

- [src-ts/ems/core-limits/core-runtime.ts](../../../../../src-ts/ems/core-limits/core-runtime.ts)
- [src-ts/runtime-executables/ems/modules/core-limits.ts](../../../../../src-ts/runtime-executables/ems/modules/core-limits.ts)
- [src-ts/runtime-executables/ems/modules/para14a.ts](../../../../../src-ts/runtime-executables/ems/modules/para14a.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`finiteOrNull`](../../../../../src-ts/ems/para14a/para14a-constraint.ts#L117) | value | Number, Number.isFinite, value.trim |
| [`finite`](../../../../../src-ts/ems/para14a/para14a-constraint.ts#L124) | value, fallback | Number, Number.isFinite |
| [`positive`](../../../../../src-ts/ems/para14a/para14a-constraint.ts#L129) | value | Math.max, finite |
| [`clamp`](../../../../../src-ts/ems/para14a/para14a-constraint.ts#L133) | value, min, max | Math.max, Math.min, finite |
| [`parseBool`](../../../../../src-ts/ems/para14a/para14a-constraint.ts#L138) | value | Number.isFinite, value.trim |
| [`normalizePolicy`](../../../../../src-ts/ems/para14a/para14a-constraint.ts#L149) | value | String |
| [`resolvePara14aSignal`](../../../../../src-ts/ems/para14a/para14a-constraint.ts#L159) | input | Date.now, Math.max, Number, Number.isFinite, finite, normalizePolicy, parseBool |
| [`getPara14aGzf`](../../../../../src-ts/ems/para14a/para14a-constraint.ts#L196) | count | Math.max, Math.round, finite |
| [`splitGroupCap`](../../../../../src-ts/ems/para14a/para14a-constraint.ts#L219) | capW, rows | Math.max, Math.min, Math.round, normalized.forEach, normalized.reduce, rows.map |
| [`sumCaps`](../../../../../src-ts/ems/para14a/para14a-constraint.ts#L257) | values | values.reduce |
| [`buildPara14aConstraintSnapshot`](../../../../../src-ts/ems/para14a/para14a-constraint.ts#L261) | input | Array.isArray, Math.max, Math.min, Math.round, String, airRows.forEach, airRows.map, airRows.reduce, consumers.filter, customRows.filter, customRows.forEach, evcs.forEach, finiteOrNull, getPara14aGzf (weitere in der Quelle) |
| [`isLargeThermalGroup`](../../../../../src-ts/ems/para14a/para14a-constraint.ts#L344) | unit | – |
| [`assignTarget`](../../../../../src-ts/ems/para14a/para14a-constraint.ts#L427) | row, cap | Math.max, Math.round, String |
| [`resolvePara14aAppCap`](../../../../../src-ts/ems/para14a/para14a-constraint.ts#L482) | appCaps, key, app | Number, Number.isFinite, String, candidates.push, text.includes |
