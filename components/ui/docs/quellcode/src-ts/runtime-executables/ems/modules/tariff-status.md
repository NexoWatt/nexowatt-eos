# src-ts/runtime-executables/ems/modules/tariff-status.ts

Bestimmt aus Tarifdaten und Konfiguration den aktuell für die Energiesteuerung verwendeten Tarifstatus.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/modules/tariff-status.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `./base` | [src-ts/runtime-executables/ems/modules/base.ts](../../../../../../src-ts/runtime-executables/ems/modules/base.ts) |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/module-manager.ts](../../../../../../src-ts/runtime-executables/ems/module-manager.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`finiteOrNull`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-status.ts#L36) | value | Number, Number.isFinite, value.trim |
| [`roundedOrNull`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-status.ts#L43) | value | Math.round, finiteOrNull |
| [`boolValue`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-status.ts#L48) | value, fallback | value.trim |
| [`clamp`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-status.ts#L59) | value, min, max | Math.max, Math.min |
| [`cleanText`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-status.ts#L61) | value, maxLen | Math.max, String, text.slice |
| [`directionOf`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-status.ts#L69) | valueW, deadbandW | Math.max, Number, finiteOrNull |
| [`formatPower`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-status.ts#L78) | valueW | Math.abs, roundedOrNull |
| [`safeParseJson`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-status.ts#L84) | value, fallback | JSON.parse, value.trim |
| [`containsAny`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-status.ts#L95) | value, terms | String, terms.some |
| [`buildTariffBaseText`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-status.ts#L100) | tariff | Number, String, boolValue, finiteOrNull, price.toFixed |
| [`buildIntentReason`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-status.ts#L120) | tariff, intentW | String, boolValue, cleanText, directionOf |
| [`buildIntentPart`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-status.ts#L150) | intentW, intentReason | cleanText, directionOf, formatPower |
| [`classifyTariffStorageStatus`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-status.ts#L161) | input | Math.abs, Math.max, Math.round, Number, boolValue, clamp, cleanText, containsAny, directionOf, roundedOrNull, writeStatus.toLowerCase |
| [`buildEffectiveStorageText`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-status.ts#L319) | result, context | Math.abs, Math.max, cleanText, detailParts.join, detailParts.push, formatPower |
| [`buildCompactStorageText`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-status.ts#L389) | result | – |
| [`buildCompactEvcsText`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-status.ts#L407) | tariff | boolValue |
| [`TariffStatusModule.constructor`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-status.ts#L419) | adapter, dpRegistry | super |
| [`TariffStatusModule.init`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-status.ts#L427) | – | mk, this.adapter.setObjectNotExistsAsync |
| [`mk`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-status.ts#L434) | id, name, type, role | this.adapter.setObjectNotExistsAsync |
| [`TariffStatusModule._getStatusConfig`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-status.ts#L476) | – | Math.round, clamp, finiteOrNull |
| [`TariffStatusModule._readValues`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-status.ts#L491) | ids | Promise.all, ids.map |
| [`TariffStatusModule.tick`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-status.ts#L504) | – | Array.isArray, Date.now, JSON.stringify, Math.abs, Math.max, Math.min, Math.round, String, boolValue, buildCompactEvcsText, buildCompactStorageText, buildEffectiveStorageText, buildIntentPart, buildIntentReason (weitere in der Quelle) |
| [`TariffStatusModule._setIfChanged`](../../../../../../src-ts/runtime-executables/ems/modules/tariff-status.ts#L782) | id, value | this.adapter.getStateAsync, this.adapter.setStateAsync |
