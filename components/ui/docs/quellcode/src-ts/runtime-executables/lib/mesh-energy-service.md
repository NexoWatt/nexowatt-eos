# src-ts/runtime-executables/lib/mesh-energy-service.ts

Optionales Haus-Zählerarchiv, Offline-Nachlieferung und prüfbare Abrechnungsentwürfe.

**Daten und Wirkung:** Liest kumulative Bezugs-/Einspeisezähler, archiviert Originalstände

**Bei Änderungen:** Zählerwechsel, Rücksprung, Zeitfehler, Tarifrechnung und Ausfälle testen.

[Originalquelle](../../../../../src-ts/runtime-executables/lib/mesh-energy-service.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `node:path` | Node-Bordmittel oder externe Paketabhängigkeit. |
| `node:crypto` | Node-Bordmittel oder externe Paketabhängigkeit. |
| `./mesh-coordinator-contract` | [src-ts/runtime-executables/lib/mesh-coordinator-contract.ts](../../../../../src-ts/runtime-executables/lib/mesh-coordinator-contract.ts) |
| `./mesh-energy-journal` | [src-ts/runtime-executables/lib/mesh-energy-journal.ts](../../../../../src-ts/runtime-executables/lib/mesh-energy-journal.ts) |

**Direkt importiert von:**

- [src-ts/runtime-executables/lib/mesh-coordinator.ts](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`defaults`](../../../../../src-ts/runtime-executables/lib/mesh-energy-service.ts#L17) | – | – |
| [`validateAccounting`](../../../../../src-ts/runtime-executables/lib/mesh-energy-service.ts#L20) | raw, config | BigInt, C.number, Date.now, Date.parse, Math.round, Number, Number.isFinite, Object.keys, String, defaults, k.endsWith |
| [`requestId`](../../../../../src-ts/runtime-executables/lib/mesh-energy-service.ts#L45) | – | crypto.randomBytes |
| [`asTime`](../../../../../src-ts/runtime-executables/lib/mesh-energy-service.ts#L46) | value | Date.parse |
| [`MeshEnergyService.constructor`](../../../../../src-ts/runtime-executables/lib/mesh-energy-service.ts#L48) | coordinator | Date.now |
| [`MeshEnergyService.settings`](../../../../../src-ts/runtime-executables/lib/mesh-energy-service.ts#L51) | – | defaults |
| [`MeshEnergyService.journal`](../../../../../src-ts/runtime-executables/lib/mesh-energy-service.ts#L52) | nodeId, local | C.id, journal.init, path.join, this.journals.get, this.journals.has, this.journals.set, this.settings |
| [`MeshEnergyService.capture`](../../../../../src-ts/runtime-executables/lib/mesh-energy-service.ts#L61) | – | C.clone, Date.now, Date.parse, Math.abs, Math.max, Promise.all, hash, journal.append, journal.init, requestId, sourceAt.some, states.map, states.some, this.journal (weitere in der Quelle) |
| [`MeshEnergyService.receive`](../../../../../src-ts/runtime-executables/lib/mesh-energy-service.ts#L93) | packet | Array.isArray, C.sign, C.verify, Date.now, Date.parse, Math.max, Number.isFinite, Number.isSafeInteger, String, asTime, journal.append, journal.init, this.busyNodes.add, this.busyNodes.delete (weitere in der Quelle) |
| [`MeshEnergyService.sync`](../../../../../src-ts/runtime-executables/lib/mesh-energy-service.ts#L125) | – | C.sign, C.verify, Math.max, Number.isSafeInteger, c.archiveTransport, journal.batch, journal.get, journal.init, requestId, this.journal |
| [`MeshEnergyService.cycle`](../../../../../src-ts/runtime-executables/lib/mesh-energy-service.ts#L137) | – | Date.now, String, this.c.appState, this.capture, this.journal, this.settings, this.sync |
| [`MeshEnergyService.start`](../../../../../src-ts/runtime-executables/lib/mesh-energy-service.ts#L153) | – | Date.now, clearTimeout, setTimeout, this.timer.unref |
| [`run`](../../../../../src-ts/runtime-executables/lib/mesh-energy-service.ts#L153) | – | setTimeout, this.cycle, this.timer.unref |
| [`MeshEnergyService.stop`](../../../../../src-ts/runtime-executables/lib/mesh-energy-service.ts#L154) | – | clearTimeout |
| [`MeshEnergyService.notificationEvent`](../../../../../src-ts/runtime-executables/lib/mesh-energy-service.ts#L155) | – | Date.now, status.nodes.some, this.c.appState, this.journals.values, this.settings, this.status |
| [`MeshEnergyService.status`](../../../../../src-ts/runtime-executables/lib/mesh-energy-service.ts#L164) | – | Math.max, c.nodes.map, local?.summary, this.journals.get, this.settings |
| [`MeshEnergyService.report`](../../../../../src-ts/runtime-executables/lib/mesh-energy-service.ts#L172) | query | Math.max, Math.round, Number.isFinite, asTime, c.nodes.find, c.nodes.some, cents, journal.init, journal.records, this.journal, this.settings, validateAccounting |
| [`cents`](../../../../../src-ts/runtime-executables/lib/mesh-energy-service.ts#L206) | energy, rate | BigInt, Math.round, Number |
