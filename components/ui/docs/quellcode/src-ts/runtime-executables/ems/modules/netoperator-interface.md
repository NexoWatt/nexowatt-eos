# src-ts/runtime-executables/ems/modules/netoperator-interface.ts

Verarbeitet Vorgaben einer Netzbetreiber-/Parkregler-Schnittstelle und übergibt autorisierte Anforderungen an die zentrale Begrenzung.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/modules/netoperator-interface.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `../services/netoperator-canonical-model` | [src-ts/runtime-executables/ems/services/netoperator-canonical-model.ts](../../../../../../src-ts/runtime-executables/ems/services/netoperator-canonical-model.ts) |
| `../services/netoperator-driver-registry` | [src-ts/runtime-executables/ems/services/netoperator-driver-registry.ts](../../../../../../src-ts/runtime-executables/ems/services/netoperator-driver-registry.ts) |
| `../services/netoperator-modbus-tcp` | [src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts](../../../../../../src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts) |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/module-manager.ts](../../../../../../src-ts/runtime-executables/ems/module-manager.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`finite`](../../../../../../src-ts/runtime-executables/ems/modules/netoperator-interface.ts#L64) | value, fallback | Number, Number.isFinite, value.trim |
| [`safeText`](../../../../../../src-ts/runtime-executables/ems/modules/netoperator-interface.ts#L70) | value | String |
| [`deepEqual`](../../../../../../src-ts/runtime-executables/ems/modules/netoperator-interface.ts#L74) | a, b | JSON.stringify |
| [`descriptorObjectId`](../../../../../../src-ts/runtime-executables/ems/modules/netoperator-interface.ts#L78) | descriptor | safeText |
| [`transformStateValue`](../../../../../../src-ts/runtime-executables/ems/modules/netoperator-interface.ts#L82) | value, descriptor | Math.round, Number, Object.prototype.hasOwnProperty.call, String, finite |
| [`NetOperatorInterfaceModule.constructor`](../../../../../../src-ts/runtime-executables/ems/modules/netoperator-interface.ts#L110) | adapter, dpRegistry | – |
| [`NetOperatorInterfaceModule.config`](../../../../../../src-ts/runtime-executables/ems/modules/netoperator-interface.ts#L116) | – | – |
| [`NetOperatorInterfaceModule.activation`](../../../../../../src-ts/runtime-executables/ems/modules/netoperator-interface.ts#L128) | cfg | safeText, this.config |
| [`NetOperatorInterfaceModule.strictNonNegative`](../../../../../../src-ts/runtime-executables/ems/modules/netoperator-interface.ts#L170) | value | Number, Number.isFinite, value.trim |
| [`NetOperatorInterfaceModule.allowedExportPowerW`](../../../../../../src-ts/runtime-executables/ems/modules/netoperator-interface.ts#L176) | snapshot | Math.round, canonicalValue, this.strictNonNegative |
| [`NetOperatorInterfaceModule.fallbackExportPowerW`](../../../../../../src-ts/runtime-executables/ems/modules/netoperator-interface.ts#L198) | – | Math.min, Math.round, this.strictNonNegative |
| [`NetOperatorInterfaceModule.envelopeQuality`](../../../../../../src-ts/runtime-executables/ems/modules/netoperator-interface.ts#L214) | snapshot | – |
| [`NetOperatorInterfaceModule.ensureObject`](../../../../../../src-ts/runtime-executables/ems/modules/netoperator-interface.ts#L223) | id, name, type, role, unit | this.adapter.setObjectNotExistsAsync |
| [`NetOperatorInterfaceModule.restoreAudit`](../../../../../../src-ts/runtime-executables/ems/modules/netoperator-interface.ts#L229) | – | Array.isArray, JSON.parse, parsed.filter, state.val.trim, this.adapter.getStateAsync |
| [`NetOperatorInterfaceModule.init`](../../../../../../src-ts/runtime-executables/ems/modules/netoperator-interface.ts#L245) | – | Object.values, this.adapter.setObjectNotExistsAsync, this.ensureObject, this.registry.load, this.restoreAudit |
| [`NetOperatorInterfaceModule.closeConnector`](../../../../../../src-ts/runtime-executables/ems/modules/netoperator-interface.ts#L301) | – | this.connector.close |
| [`NetOperatorInterfaceModule.stop`](../../../../../../src-ts/runtime-executables/ems/modules/netoperator-interface.ts#L309) | – | this.closeConnector |
| [`NetOperatorInterfaceModule.deactivate`](../../../../../../src-ts/runtime-executables/ems/modules/netoperator-interface.ts#L317) | – | this.adapter.setStateAsync, this.closeConnector |
| [`NetOperatorInterfaceModule.appendAudit`](../../../../../../src-ts/runtime-executables/ems/modules/netoperator-interface.ts#L330) | snapshot | Date.now, JSON.stringify, Math.max, Math.min, Math.round, canonicalValue, deepEqual, finite, this.activation, this.adapter.setStateAsync, this.allowedExportPowerW, this.audit.push, this.audit.slice, this.config |
| [`NetOperatorInterfaceModule.readStateDescriptor`](../../../../../../src-ts/runtime-executables/ems/modules/netoperator-interface.ts#L377) | descriptor | descriptorObjectId, this.adapter.getForeignStateAsync, transformStateValue |
| [`NetOperatorInterfaceModule.readStateMap`](../../../../../../src-ts/runtime-executables/ems/modules/netoperator-interface.ts#L385) | profile | Date.now, Number, Object.entries, Object.prototype.hasOwnProperty.call, REQUIRED_READ_KEYS.includes, String, classifyQuality, descriptorObjectId, requiredErrors.join, strictTimestamp, this.readStateDescriptor |
| [`NetOperatorInterfaceModule.connectorFor`](../../../../../../src-ts/runtime-executables/ems/modules/netoperator-interface.ts#L443) | cfg, profile | JSON.stringify, safeText, this.closeConnector |
| [`NetOperatorInterfaceModule.publish`](../../../../../../src-ts/runtime-executables/ems/modules/netoperator-interface.ts#L454) | snapshot, extra | Date.now, JSON.stringify, Math.max, Math.min, Math.round, Object.entries, Object.fromEntries, String, canonicalValue, finite, safeText, snapshot.errors.join, strictTimestamp, this.activation (weitere in der Quelle) |
| [`NetOperatorInterfaceModule.maxAgeMs`](../../../../../../src-ts/runtime-executables/ems/modules/netoperator-interface.ts#L572) | cfg, profile | Math.max, Math.min, finite |
| [`NetOperatorInterfaceModule.tick`](../../../../../../src-ts/runtime-executables/ems/modules/netoperator-interface.ts#L578) | – | Date.now, Math.max, Math.min, Math.round, buildCanonicalSnapshot, finite, resolved.profile.protocols.includes, safeText, this.activation, this.closeConnector, this.config, this.connectorFor, this.deactivate, this.maxAgeMs (weitere in der Quelle) |
| [`NetOperatorInterfaceModule.getPublicStatus`](../../../../../../src-ts/runtime-executables/ems/modules/netoperator-interface.ts#L668) | – | Date.now, this.activation, this.audit.slice, this.config, this.registry.list |
| [`NetOperatorInterfaceModule.getRawDiagnostics`](../../../../../../src-ts/runtime-executables/ems/modules/netoperator-interface.ts#L690) | – | Date.now, this.activation, this.audit.slice, this.config, this.registry.getDiagnostics |
| [`NetOperatorInterfaceModule.testConnection`](../../../../../../src-ts/runtime-executables/ems/modules/netoperator-interface.ts#L715) | configOverride | Object.keys, connector.close, connector.poll, resolved.profile.protocols.includes, safeText, this.config, this.readStateMap, this.registry.load, this.registry.resolve |
