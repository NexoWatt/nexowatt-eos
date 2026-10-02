# src-ts/runtime-executables/ems/services/netoperator-driver-registry.ts

Ordnet freigegebene Netzbetreiber-/Parkregler-Treiber ihren Profilen und Fähigkeiten zu.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/services/netoperator-driver-registry.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `./netoperator-canonical-model` | [src-ts/runtime-executables/ems/services/netoperator-canonical-model.ts](../../../../../../src-ts/runtime-executables/ems/services/netoperator-canonical-model.ts) |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/modules/netoperator-interface.ts](../../../../../../src-ts/runtime-executables/ems/modules/netoperator-interface.ts)
- [src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts](../../../../../../src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts)
- [src-ts/runtime-executables/main.ts](../../../../../../src-ts/runtime-executables/main.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`safeText`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-driver-registry.ts#L95) | value | String |
| [`finiteOrNull`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-driver-registry.ts#L99) | value | Number, Number.isFinite, value.trim |
| [`normalizeDescriptor`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-driver-registry.ts#L105) | raw, profileAddressBase | Math.max, Math.round, Number, finiteOrNull, safeText |
| [`descriptorMapped`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-driver-registry.ts#L124) | mapping | finiteOrNull, safeText |
| [`validateDescriptor`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-driver-registry.ts#L128) | key, descriptor, suffix, errors, warnings | Math.round, Number.isInteger, SUPPORTED_BYTE_ORDERS.has, SUPPORTED_DATA_TYPES.has, errors.push, finiteOrNull, safeText, warnings.push |
| [`validateDriverProfile`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-driver-registry.ts#L153) | profile | Array.from, Array.isArray, IMPLEMENTED_PROTOCOLS.includes, Object.entries, REQUIRED_READ_KEYS.filter, SUPPORTED_PROTOCOL_SLOTS.includes, descriptorMapped, errors.push, mappedKeys.push, missingRequired.map, protocols.includes, row.protocols.map, safeText, validateDescriptor (weitere in der Quelle) |
| [`normalizeDriverProfile`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-driver-registry.ts#L203) | profile | Array.isArray, Math.max, Math.round, Number, finiteOrNull, normalizeDescriptor, profile.notes.map, profile.protocols.map, rawProtocols.filter, safeText, watchdogRaw.notes.map |
| [`NetOperatorDriverRegistry.constructor`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-driver-registry.ts#L261) | driverDir | path.resolve |
| [`NetOperatorDriverRegistry.load`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-driver-registry.ts#L265) | – | JSON.parse, String, fs.existsSync, fs.readFileSync, fs.readdirSync, normalizeDriverProfile, path.join, this.diagnostics.push, this.profiles.clear, this.profiles.has, this.profiles.set, validateDriverProfile, validation.errors.join |
| [`NetOperatorDriverRegistry.list`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-driver-registry.ts#L294) | – | Array.from, this.profiles.values |
| [`NetOperatorDriverRegistry.get`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-driver-registry.ts#L314) | id | safeText, this.profiles.get |
| [`NetOperatorDriverRegistry.parseCustom`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-driver-registry.ts#L318) | jsonText | JSON.parse, String, normalizeDriverProfile, validateDriverProfile, validation.errors.join |
| [`NetOperatorDriverRegistry.resolve`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-driver-registry.ts#L330) | config | safeText, this.get, this.parseCustom, validateDriverProfile |
| [`NetOperatorDriverRegistry.getDiagnostics`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-driver-registry.ts#L341) | – | this.diagnostics.slice |
