# src-ts/runtime-executables/ems/services/charging-management-audit.ts

Erfasst Ladeentscheidungen und deren begrenzende Ursachen für die Lademanagement-Diagnose.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/services/charging-management-audit.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/modules/charging-management.ts](../../../../../../src-ts/runtime-executables/ems/modules/charging-management.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`finiteChargingAuditNumber`](../../../../../../src-ts/runtime-executables/ems/services/charging-management-audit.ts#L22) | value, fallback | Number, Number.isFinite, value.trim |
| [`compactChargingAuditText`](../../../../../../src-ts/runtime-executables/ems/services/charging-management-audit.ts#L29) | value, maxLen | Math.max, String, text.slice |
| [`isChargingAuditInformationalLimiter`](../../../../../../src-ts/runtime-executables/ems/services/charging-management-audit.ts#L42) | value | String |
| [`isChargingAuditActiveLimiter`](../../../../../../src-ts/runtime-executables/ems/services/charging-management-audit.ts#L48) | value | isChargingAuditInformationalLimiter |
| [`deriveChargingAuditLimiter`](../../../../../../src-ts/runtime-executables/ems/services/charging-management-audit.ts#L52) | entry, global | Number, String, applyStatus.includes, reason.includes, safetyBinding.includes |
| [`deriveChargingAuditGlobalLimiter`](../../../../../../src-ts/runtime-executables/ems/services/charging-management-audit.ts#L84) | input, wallboxes | Array.isArray, String, perLp.includes, status.includes, wallboxes.map |
| [`buildChargingAuditSnapshot`](../../../../../../src-ts/runtime-executables/ems/services/charging-management-audit.ts#L100) | input | Array.from, Array.isArray, Date.now, Math.max, Math.round, Object.freeze, String, compactChargingAuditText, debugBySafe.keys, debugBySafe.set, deriveChargingAuditGlobalLimiter, finiteChargingAuditNumber, isChargingAuditActiveLimiter, runtimeBySafe.keys (weitere in der Quelle) |
| [`chargingAuditEventSignature`](../../../../../../src-ts/runtime-executables/ems/services/charging-management-audit.ts#L271) | snapshot | Array.isArray, Math.round, Number |
| [`buildChargingAuditEvents`](../../../../../../src-ts/runtime-executables/ems/services/charging-management-audit.ts#L309) | previousSnapshot, snapshot, options | Array.isArray, Date.now, Math.max, Math.round, String, compactChargingAuditText, deltas.join, deltas.push, events.push, finiteChargingAuditNumber, previousBySafe.get |
| [`ChargingManagementAuditStore.constructor`](../../../../../../src-ts/runtime-executables/ems/services/charging-management-audit.ts#L434) | adapter, queueState, flushQueue | – |
| [`ChargingManagementAuditStore.initialize`](../../../../../../src-ts/runtime-executables/ems/services/charging-management-audit.ts#L440) | – | ensureState, this.adapter.setObjectNotExistsAsync, this.restore |
| [`ensureState`](../../../../../../src-ts/runtime-executables/ems/services/charging-management-audit.ts#L441) | id, name, type, role | this.adapter.setObjectNotExistsAsync |
| [`getSnapshot`](../../../../../../src-ts/runtime-executables/ems/services/charging-management-audit.ts#L463) | – | this.getSnapshot |
| [`getEvents`](../../../../../../src-ts/runtime-executables/ems/services/charging-management-audit.ts#L464) | limit | this.getPayload |
| [`clear`](../../../../../../src-ts/runtime-executables/ems/services/charging-management-audit.ts#L465) | – | this.clear |
| [`ChargingManagementAuditStore.restore`](../../../../../../src-ts/runtime-executables/ems/services/charging-management-audit.ts#L469) | – | Array.isArray, JSON.parse, Number, Number.isFinite, chargingAuditEventSignature, parsed.slice, state.val.trim, this.adapter.getStateAsync |
| [`ChargingManagementAuditStore.getSnapshot`](../../../../../../src-ts/runtime-executables/ems/services/charging-management-audit.ts#L485) | – | – |
| [`ChargingManagementAuditStore.getPayload`](../../../../../../src-ts/runtime-executables/ems/services/charging-management-audit.ts#L487) | limit | Math.max, Math.min, Math.round, Number, this.events.slice |
| [`ChargingManagementAuditStore.clear`](../../../../../../src-ts/runtime-executables/ems/services/charging-management-audit.ts#L493) | – | this.flushQueue, this.queueState |
| [`ChargingManagementAuditStore.record`](../../../../../../src-ts/runtime-executables/ems/services/charging-management-audit.ts#L505) | input | Date.now, JSON.stringify, Number, buildChargingAuditEvents, buildChargingAuditSnapshot, chargingAuditEventSignature, this.events.push, this.events.splice, this.queueState |
