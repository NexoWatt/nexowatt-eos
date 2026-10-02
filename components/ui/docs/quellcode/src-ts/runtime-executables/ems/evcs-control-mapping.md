# src-ts/runtime-executables/ems/evcs-control-mapping.ts

Vereinheitlicht die konfigurierten Steuerdatenpunkte einer Ladestation für die nachgelagerten EVCS-Schreibpfade.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/ems/evcs-control-mapping.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

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
| [`text`](../../../../../src-ts/runtime-executables/ems/evcs-control-mapping.ts#L29) | – | String |
| [`deriveNexowattDeviceBaseId`](../../../../../src-ts/runtime-executables/ems/evcs-control-mapping.ts#L34) | – | Function.prototype.apply.call, id.match |
| [`unique`](../../../../../src-ts/runtime-executables/ems/evcs-control-mapping.ts#L41) | – | Array.from, Array.isArray |
| [`buildEvcsControlCandidates`](../../../../../src-ts/runtime-executables/ems/evcs-control-mapping.ts#L48) | – | Function.prototype.apply.call |
| [`buildEvcsTelemetryCandidates`](../../../../../src-ts/runtime-executables/ems/evcs-control-mapping.ts#L92) | – | Function.prototype.apply.call |
| [`firstExisting`](../../../../../src-ts/runtime-executables/ems/evcs-control-mapping.ts#L156) | – | Function.prototype.apply.call, exists |
| [`normalizeEvcsChargeDemandObjectId`](../../../../../src-ts/runtime-executables/ems/evcs-control-mapping.ts#L176) | – | Function.prototype.apply.call, id.toLowerCase |
| [`isUpgradeableNexowattEvcsStatusObjectId`](../../../../../src-ts/runtime-executables/ems/evcs-control-mapping.ts#L193) | – | Function.prototype.apply.call |
| [`baseBelongsToRow`](../../../../../src-ts/runtime-executables/ems/evcs-control-mapping.ts#L199) | – | Function.prototype.apply.call, fields.some |
| [`resolveEvcsControlMapping`](../../../../../src-ts/runtime-executables/ems/evcs-control-mapping.ts#L218) | – | Function.prototype.apply.call, Object.values |
