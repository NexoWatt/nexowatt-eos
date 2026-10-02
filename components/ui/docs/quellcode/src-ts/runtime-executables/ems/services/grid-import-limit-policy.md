# src-ts/runtime-executables/ems/services/grid-import-limit-policy.ts

Löst das konfigurierte Netzbezugslimit und dessen feste Soft-Reserve in einheitliche Grenzwerte auf.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/services/grid-import-limit-policy.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/modules/grid-constraints.ts](../../../../../../src-ts/runtime-executables/ems/modules/grid-constraints.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`finiteOrNull`](../../../../../../src-ts/runtime-executables/ems/services/grid-import-limit-policy.ts#L90) | value | Number, Number.isFinite |
| [`clamp`](../../../../../../src-ts/runtime-executables/ems/services/grid-import-limit-policy.ts#L96) | value, min, max | Math.max, Math.min |
| [`resolveAutoReserveW`](../../../../../../src-ts/runtime-executables/ems/services/grid-import-limit-policy.ts#L100) | hardLimitW, _configuredReserveW | Math.max, Math.min, Math.round, finiteOrNull |
| [`resolveGridImportLimitPolicy`](../../../../../../src-ts/runtime-executables/ems/services/grid-import-limit-policy.ts#L110) | input | Date.now, Math.max, Math.round, String, finiteOrNull, resolveAutoReserveW |
| [`resolveZeroExportPvTarget`](../../../../../../src-ts/runtime-executables/ems/services/grid-import-limit-policy.ts#L223) | input | Math.max, Math.round, clamp, finiteOrNull |
