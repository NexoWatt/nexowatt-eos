# src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts

Erfasst konkurrierende Aktor-Anforderungen diagnostisch, damit widersprüchliche Schreibabsichten sichtbar werden.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `node:async_hooks` | Node-Bordmittel oder externe Paketabhängigkeit. |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/engine.ts](../../../../../../src-ts/runtime-executables/ems/engine.ts)
- [src-ts/runtime-executables/ems/module-manager.ts](../../../../../../src-ts/runtime-executables/ems/module-manager.ts)
- [src-ts/runtime-executables/ems/modules/grid-constraints.ts](../../../../../../src-ts/runtime-executables/ems/modules/grid-constraints.ts)
- [src-ts/runtime-executables/ems/modules/heating-rod-control.ts](../../../../../../src-ts/runtime-executables/ems/modules/heating-rod-control.ts)
- [src-ts/runtime-executables/ems/modules/mesh-microgrid.ts](../../../../../../src-ts/runtime-executables/ems/modules/mesh-microgrid.ts)
- [src-ts/runtime-executables/ems/modules/multi-use.ts](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts)
- [src-ts/runtime-executables/ems/modules/nvp-coordinator.ts](../../../../../../src-ts/runtime-executables/ems/modules/nvp-coordinator.ts)
- [src-ts/runtime-executables/ems/modules/peak-shaving.ts](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts)
- [src-ts/runtime-executables/ems/modules/prime-mover-control.ts](../../../../../../src-ts/runtime-executables/ems/modules/prime-mover-control.ts)
- [src-ts/runtime-executables/ems/modules/thermal-control.ts](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts)
- [src-ts/runtime-executables/ems/modules/threshold-control.ts](../../../../../../src-ts/runtime-executables/ems/modules/threshold-control.ts)
- [src-ts/runtime-executables/ems/services/nexologic-output-controller.ts](../../../../../../src-ts/runtime-executables/ems/services/nexologic-output-controller.ts)
- [src-ts/runtime-executables/main.ts](../../../../../../src-ts/runtime-executables/main.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`isActuatorAuthorityBlockedResult`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L160) | value | – |
| [`text`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L164) | value | String |
| [`clampNumber`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L168) | value, fallback, min, max | Math.max, Math.min, Number, Number.isFinite |
| [`normalizeArbiterMode`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L174) | raw | text |
| [`normalizeOwner`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L180) | raw | text |
| [`isManualOwner`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L185) | ownerRaw | normalizeOwner |
| [`priorityForOwner`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L189) | ownerRaw | normalizeOwner |
| [`ownerDefaultLeaseMs`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L203) | ownerRaw | normalizeOwner |
| [`stableFingerprint`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L211) | value, depth | Array.isArray, Math.round, Number.isFinite, Object.keys, String, value.map |
| [`sanitizePreview`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L229) | targetId, value, depth | Array.isArray, Object.entries, SECRET_KEY_PATTERN.test, SECRET_TARGET_PATTERN.test, String, sanitizePreview, value.slice |
| [`extractWritePayload`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L246) | stateArg, ackArg | Object.prototype.hasOwnProperty.call |
| [`valuesDiffer`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L254) | a, b | Math.abs, Math.max, Math.min, Number |
| [`compactPath`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L264) | raw | text |
| [`buildHttpActuatorShadowContext`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L275) | methodRaw, pathRaw | compactPath, ownerDefaultLeaseMs, priorityForOwner, text |
| [`ActuatorShadowArbiter.constructor`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L323) | adapterOrOptions, maybeOptions | Math.round, clampNumber, normalizeArbiterMode |
| [`ActuatorShadowArbiter.init`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L338) | – | this.snapshot |
| [`ActuatorShadowArbiter.install`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L345) | adapterArg | – |
| [`shadowSetForeignStateAsync`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L356) | args | self.interceptAsync |
| [`shadowSetForeignStateChangedAsync`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L362) | args | self.interceptAsync |
| [`ActuatorShadowArbiter.uninstall`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L369) | – | – |
| [`ActuatorShadowArbiter.stop`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L376) | – | this.authorities.clear, this.blockedLogTs.clear, this.uninstall |
| [`ActuatorShadowArbiter.runWithContext`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L383) | context, fn | Number, Number.isFinite, normalizeOwner, text, this.storage.getStore, this.storage.run |
| [`ActuatorShadowArbiter.getContext`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L403) | – | this.storage.getStore |
| [`ActuatorShadowArbiter.inferOwner`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L407) | targetId | Array.isArray, normalizeOwner, row.activeOwners.map, row.owners.map, this.getContext |
| [`ActuatorShadowArbiter.resolveAuthorityIntent`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L420) | ownerRaw, context | normalizeOwner |
| [`ActuatorShadowArbiter.createEvent`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L440) | method, args | Date.now, Math.round, Number, Number.isFinite, clampNumber, extractWritePayload, ownerDefaultLeaseMs, priorityForOwner, sanitizePreview, stableFingerprint, targetId.startsWith, text, this.events.push, this.events.splice (weitere in der Quelle) |
| [`ActuatorShadowArbiter.cleanupAuthorities`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L494) | now | Date.now, this.authorities.delete, this.authorities.entries |
| [`ActuatorShadowArbiter.authorityEligible`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L500) | event | – |
| [`ActuatorShadowArbiter.authorityActiveForEvent`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L514) | authority, event | – |
| [`ActuatorShadowArbiter.decide`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L530) | event | isManualOwner, this.authorities.delete, this.authorities.get, this.authorityActiveForEvent, this.authorityEligible, this.cleanupAuthorities |
| [`ActuatorShadowArbiter.updateAuthority`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L591) | event, decision | this.authorities.delete, this.authorities.get, this.authorities.set |
| [`ActuatorShadowArbiter.blockedResult`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L619) | event, authority | – |
| [`ActuatorShadowArbiter.logBlocked`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L630) | event, authority | Date.now, SECRET_TARGET_PATTERN.test, fn.call, this.blockedLogTs.get, this.blockedLogTs.set |
| [`ActuatorShadowArbiter.interceptAsync`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L646) | method, original, args | Date.now, SECRET_TARGET_PATTERN.test, String, error.message.slice, original.apply, this.blockedResult, this.createEvent, this.decide, this.detectConflict, this.logBlocked, this.registerConflict, this.snapshot, this.updateAuthority |
| [`ActuatorShadowArbiter.guardSkippedWrite`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L701) | targetId, value, ack | Date.now, SECRET_TARGET_PATTERN.test, this.blockedResult, this.createEvent, this.decide, this.logBlocked, this.registerConflict, this.snapshot, this.updateAuthority |
| [`ActuatorShadowArbiter.detectConflict`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L737) | current | this.registerConflict, valuesDiffer |
| [`ActuatorShadowArbiter.registerConflict`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L758) | a, b, winnerOwner, resolution | Array.from, Math.max, Math.min, conflict.cycleIds.includes, conflict.cycleIds.push, conflict.cycleIds.slice, conflict.writeSeqs.includes, conflict.writeSeqs.push, conflict.writeSeqs.slice, owners.join, this.conflicts.delete, this.conflicts.entries, this.conflicts.get, this.conflicts.set |
| [`ActuatorShadowArbiter.snapshot`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L805) | now | Array.from, Date.now, Object.entries, accepted.filter, activeConflicts.filter, actuatorWrites.filter, actuatorWrites.slice, blocked.slice, events.filter, targetSummaries.slice, targets.entries, targets.get, targets.has, targets.set (weitere in der Quelle) |
| [`installActuatorShadowArbiter`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L946) | adapter | adapter._actuatorShadowArbiter.install, arbiter.install |
| [`withActuatorShadowContext`](../../../../../../src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts#L968) | adapter, context, fn | arbiter.runWithContext, fn |
