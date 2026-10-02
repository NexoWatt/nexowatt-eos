# src-ts/runtime-executables/lib/mesh-coordinator.ts

Verbindet einen festen EOS-Master mit bis zu 99 Slaves über das getrennte Tailscale-Netz.

**Daten und Wirkung:** Signierte HTTP-Nachrichten, verschlüsselte lokale Paarung, monotone Freigaben und lokale EMS-Grenzen. Keine direkte Geräteansteuerung.

**Bei Änderungen:** Sicherheitsvertrag, finale Writer, Rollenprüfung und 99-Knoten-/Ausfalltests gemeinsam prüfen. Geräteseitige Watchdogs bleiben erforderlich.

[Originalquelle](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `node:fs/promises` | Node-Bordmittel oder externe Paketabhängigkeit. |
| `node:path` | Node-Bordmittel oder externe Paketabhängigkeit. |
| `node:crypto` | Node-Bordmittel oder externe Paketabhängigkeit. |
| `node:http` | Node-Bordmittel oder externe Paketabhängigkeit. |
| `node:https` | Node-Bordmittel oder externe Paketabhängigkeit. |
| `node:perf_hooks` | Node-Bordmittel oder externe Paketabhängigkeit. |
| `./mesh-coordinator-contract` | [src-ts/runtime-executables/lib/mesh-coordinator-contract.ts](../../../../../src-ts/runtime-executables/lib/mesh-coordinator-contract.ts) |
| `./mesh-energy-service` | [src-ts/runtime-executables/lib/mesh-energy-service.ts](../../../../../src-ts/runtime-executables/lib/mesh-energy-service.ts) |
| `./mesh-coordinator-protocol` | [src-ts/runtime-executables/lib/mesh-coordinator-protocol.ts](../../../../../src-ts/runtime-executables/lib/mesh-coordinator-protocol.ts) |
| `../ems/services/measurement-freshness` | [src-ts/runtime-executables/ems/services/measurement-freshness.ts](../../../../../src-ts/runtime-executables/ems/services/measurement-freshness.ts) |
| `@iobroker/adapter-core` | Node-Bordmittel oder externe Paketabhängigkeit. |

**Direkt importiert von:**

- [src-ts/runtime-executables/main.ts](../../../../../src-ts/runtime-executables/main.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`exchangeHttp`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts#L25) | origin, packet, timeoutMs, agents, pending, endpoint | – |
| [`finish`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts#L31) | error, value | clearTimeout, pending.delete, reject, resolve |
| [`MeshCoordinator.constructor`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts#L43) | adapter, options | C.defaultConfig, accountingDefaults |
| [`MeshCoordinator.init`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts#L53) | – | – |
| [`MeshCoordinator.encryptionKey`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts#L76) | – | crypto.createHash, this.adapter.getForeignObjectAsync |
| [`MeshCoordinator.persist`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts#L81) | data | Buffer.concat, JSON.stringify, cipher.final, cipher.getAuthTag, cipher.update, ciphertext.toString, crypto.createCipheriv, crypto.randomBytes, dir.close, dir.sync, fs.mkdir, fs.open, fs.rename, fs.unlink (weitere in der Quelle) |
| [`MeshCoordinator.appState`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts#L103) | config | this.adapter._nwLicenseAllowsAppId |
| [`MeshCoordinator.assertAppChange`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts#L110) | candidate | this.appState |
| [`MeshCoordinator.migrateAppLifecycle`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts#L119) | – | C.clone, JSON.stringify, this.adapter.log?.info, this.adapter.nwApplyInstallerPatchToRuntimeConfig, this.adapter.setStateAsync, this.persist |
| [`MeshCoordinator.syncAppLifecycle`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts#L136) | – | this.appState, this.start, this.stop |
| [`MeshCoordinator.publicConfig`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts#L141) | – | C.clone, Object.keys, this.appState |
| [`MeshCoordinator.configure`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts#L144) | raw, slaveKey | C.validateConfig, Object.fromEntries, next.nodes.filter, next.nodes.some, this.appState, this.checkLocalWriters, this.init, this.persist, this.publicConfig, this.requestTick, this.resetProtocols, this.syncAppLifecycle |
| [`MeshCoordinator.checkLocalWriters`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts#L163) | config | dp?.getEntry, inverters.every, this.adapter._nwGetStorageControlAuthority |
| [`MeshCoordinator.pair`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts#L188) | nodeId | C.clone, crypto.randomBytes, this.appState, this.config.nodes.find, this.init, this.persist |
| [`MeshCoordinator.resetProtocols`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts#L200) | – | req.destroy, this.rates.clear |
| [`MeshCoordinator.sample`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts#L210) | – | Date.now, Math.max, Number.isFinite, Object.values, String, ages.push, buildNvpSnapshotFromRegistry, dp.getConnectionStatus, dp.getEntry, dp.getMeasurementAgeMs, dp.getNumber, this.adapter._nwLicenseAllowsAppId, this.localDemand, this.options.sample |
| [`MeshCoordinator.localDemand`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts#L241) | sample | Date.now, Math.max, Math.min, Number, Number.isFinite, points.map, this.adapter._nwChargingManagementAudit?.getSnapshot |
| [`MeshCoordinator.siteSample`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts#L262) | – | Math.max, Number.isFinite, String, ages.push, dp.getConnectionStatus, dp?.getEntry, dp?.getMeasurementAgeMs, dp?.getNumber, this.options.siteSample, this.sample |
| [`MeshCoordinator.registerFeedback`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts#L276) | – | Object.entries, String, dp.getEntry, dp.upsert, key.endsWith |
| [`MeshCoordinator.markApplied`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts#L290) | lease | Date.now, Object.values, this.currentLimits |
| [`MeshCoordinator.currentLimits`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts#L298) | – | C.clone, this.appState, this.sample, this.slave.current, this.slave.fail, this.slave?.fail, validSample |
| [`MeshCoordinator.requestTick`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts#L311) | – | this.adapter.emsEngine?.requestImmediateTick |
| [`MeshCoordinator.receive`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts#L314) | packet | C.sign, C.verify, Math.ceil, recent.push, this.appState, this.master.exchange, this.master.hello, this.now, this.rates.get, this.rates.set, this.siteSample |
| [`MeshCoordinator.cycle`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts#L324) | – | C.sign, C.verify, Date.now, Math.max, Number.isFinite, String, this.appState, this.latencies.at, this.latencies.push, this.latencies.shift, this.master.exchange, this.master.hello, this.master.plan, this.now (weitere in der Quelle) |
| [`MeshCoordinator.start`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts#L363) | – | crypto.randomInt, setInterval, setTimeout, this.appState, this.energy.start, this.init, this.timer.unref, this.watchdog.unref |
| [`run`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts#L369) | – | Math.max, setTimeout, this.cycle, this.now, this.timer.unref |
| [`MeshCoordinator.stop`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts#L379) | – | clearInterval, clearTimeout, req.destroy, this.energy.stop, this.slave?.fail |
| [`MeshCoordinator.notificationEvent`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts#L382) | – | this.appState, this.currentLimits |
| [`MeshCoordinator.archiveTransport`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts#L390) | packet | exchangeHttp |
| [`MeshCoordinator.setOperating`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts#L393) | raw | C.membersOf, C.number, this.init, this.master.plan, this.persist, this.requestTick, this.siteSample |
| [`MeshCoordinator.configureAccounting`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts#L414) | raw | C.clone, this.energy.journals.values, this.energy.status, this.init, this.persist, validateAccounting |
| [`MeshCoordinator.status`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts#L426) | – | Math.ceil, this.currentLimits, this.energy.status, this.latencies.at, this.master?.status |
