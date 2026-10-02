# src-ts/utils/number.ts

Stellt gemeinsame Zahlenprüfung, Begrenzung und Konvertierung bereit; Null bleibt ein zulässiger Messwert.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../src-ts/utils/number.ts) · [Gesamtübersicht](../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `../contracts/units` | [src-ts/contracts/units.ts](../../../../src-ts/contracts/units.ts) |

**Direkt importiert von:**

- [src-ts/backend/state/api-state-cache.ts](../../../../src-ts/backend/state/api-state-cache.ts)
- [src-ts/ems/core-limits/core-budget.ts](../../../../src-ts/ems/core-limits/core-budget.ts)
- [src-ts/ems/heating-rod/heating-rod-decision.ts](../../../../src-ts/ems/heating-rod/heating-rod-decision.ts)
- [src-ts/resolvers/energy-flow-resolver.ts](../../../../src-ts/resolvers/energy-flow-resolver.ts)
- [src-ts/utils/energy-flow.ts](../../../../src-ts/utils/energy-flow.ts)
- [src-ts/utils/index.ts](../../../../src-ts/utils/index.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`isFiniteNumber`](../../../../src-ts/utils/number.ts#L45) | value | Number.isFinite |
| [`toNumberOrNull`](../../../../src-ts/utils/number.ts#L64) | value | Number, Number.isFinite, value.replace, value.trim |
| [`clampNumber`](../../../../src-ts/utils/number.ts#L84) | value, min, max | Math.max, Math.min |
| [`positiveWatt`](../../../../src-ts/utils/number.ts#L104) | value | Math.max, toNumberOrNull |
| [`percent`](../../../../src-ts/utils/number.ts#L119) | value, fallback | clampNumber, toNumberOrNull |
| [`roundForDisplay`](../../../../src-ts/utils/number.ts#L134) | value, digits | Math.max, Math.min, Math.round, toNumberOrNull |
