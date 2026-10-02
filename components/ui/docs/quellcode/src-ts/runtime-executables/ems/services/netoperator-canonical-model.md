# src-ts/runtime-executables/ems/services/netoperator-canonical-model.ts

Normalisiert externe Netzbetreiber-Vorgaben in ein einheitliches, herstellerunabhängiges Datenmodell.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/services/netoperator-canonical-model.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/modules/netoperator-interface.ts](../../../../../../src-ts/runtime-executables/ems/modules/netoperator-interface.ts)
- [src-ts/runtime-executables/ems/services/netoperator-driver-registry.ts](../../../../../../src-ts/runtime-executables/ems/services/netoperator-driver-registry.ts)
- [src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts](../../../../../../src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`strictFinite`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-canonical-model.ts#L92) | value | Number, Number.isFinite, value.trim |
| [`strictBoolean`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-canonical-model.ts#L99) | value | value.trim |
| [`strictTimestamp`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-canonical-model.ts#L111) | value | Date.parse, Math.round, Number.isFinite, strictFinite, value.trim |
| [`normalizeCanonicalValue`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-canonical-model.ts#L124) | key, rawValue, options | Date.now, Number.isFinite, Object.prototype.hasOwnProperty.call, String, strictBoolean, strictFinite, strictTimestamp |
| [`valueOf`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-canonical-model.ts#L175) | values, key | – |
| [`evaluateCanonicalCommand`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-canonical-model.ts#L180) | values | Date.now, String, strictBoolean, strictTimestamp, valueOf |
| [`buildCanonicalSnapshot`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-canonical-model.ts#L231) | input | Array.from, Array.isArray, Date.now, Math.max, REQUIRED_READ_KEYS.filter, String, errors.push, evaluateCanonicalCommand, input.errors.map, normalizeCanonicalValue, strictFinite, strictTimestamp, valueOf |
| [`canonicalValue`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-canonical-model.ts#L297) | snapshot, key | – |
