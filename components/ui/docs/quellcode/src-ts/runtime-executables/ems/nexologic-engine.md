# src-ts/runtime-executables/ems/nexologic-engine.ts

Wertet NexoLogic-Regeln und ihre Eingänge aus und gibt die daraus abgeleiteten logischen Ausgangsanforderungen weiter.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `./services/nexologic-output-controller` | [src-ts/runtime-executables/ems/services/nexologic-output-controller.ts](../../../../../src-ts/runtime-executables/ems/services/nexologic-output-controller.ts) |

**Direkt importiert von:**

- [src-ts/runtime-executables/main.ts](../../../../../src-ts/runtime-executables/main.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`NexoLogicEngine.constructor`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L88) | adapter | – |
| [`NexoLogicEngine.stop`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L110) | – | r.stop, this._dpToInputs.clear, this._subscribed.clear, this.adapter.unsubscribeForeignStatesAsync, this.outputController.stop |
| [`NexoLogicEngine.init`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L149) | config | Array.isArray, Promise.all, String, primeJobs.push, runner.beginInitialization, runner.finishInitialization, runner.getDpInputs, runner.getOutputDefinitions, runner.restorePersistentState, this._dpToInputs.get, this._dpToInputs.has, this._dpToInputs.set, this._subscribed.add, this._subscribed.has (weitere in der Quelle) |
| [`NexoLogicEngine.getBudgetIntents`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L213) | – | this.outputController.getBudgetIntents |
| [`NexoLogicEngine.applyBudgetGrant`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L219) | key, grantW | this.outputController.applyBudgetGrant |
| [`NexoLogicEngine.handleStateChange`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L236) | id, state | String, m.runner.setDpInputState, this._dpToInputs.get |
| [`GraphRunner.constructor`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L279) | adapter, graph, outputController | Array.isArray, String, this._build |
| [`GraphRunner.stop`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L312) | – | Object.keys, clearInterval, clearTimeout, this._nodeInternal.values, this._persistTimers.clear, this._persistTimers.values, this.flushPersistentState |
| [`GraphRunner._build`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L350) | – | Array.isArray, String, buildTopologicalOrder, this._dpInputNodes.push, this._incoming.set, this.adj.get, this.adj.has, this.adj.set, this.nodes.has, this.nodes.set |
| [`GraphRunner.beginInitialization`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L403) | – | – |
| [`GraphRunner.finishInitialization`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L408) | – | this._evalNode, this._evaluateTopological, this.nodes.values |
| [`GraphRunner._evaluateTopological`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L421) | initial | Array.from, this._evalNode, this._incoming.get, this.nodes.get, this.nodes.keys |
| [`GraphRunner._stateId`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L438) | nodeId | safeStatePart |
| [`GraphRunner._persistentKeys`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L444) | node | String |
| [`GraphRunner._serializableState`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L451) | nodeId, internal | Date.now, JSON.parse, JSON.stringify, this._persistentKeys, this.nodes.get |
| [`GraphRunner.restorePersistentState`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L468) | – | JSON.parse, JSON.stringify, st.val.trim, this._nodeInternal.set, this._persistedJson.set, this._persistentKeys, this._stateId, this.adapter.getStateAsync, this.nodes.values |
| [`GraphRunner._schedulePersistentState`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L483) | nodeId, internal | JSON.stringify, clearTimeout, setTimeout, this._persistTimers.get, this._persistTimers.set, this._persistedJson.get, this._serializableState |
| [`GraphRunner._writePersistentState`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L498) | nodeId, row | JSON.stringify, this._persistedJson.set, this._stateId, this.adapter.setObjectNotExistsAsync, this.adapter.setStateAsync |
| [`GraphRunner.flushPersistentState`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L514) | – | clearTimeout, this._nodeInternal.get, this._persistTimers.delete, this._persistTimers.entries, this._serializableState, this._writePersistentState |
| [`GraphRunner.getDpInputs`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L536) | – | this._dpInputNodes.slice |
| [`GraphRunner._resolveSceneDpId`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L540) | node | Array.isArray, String, devs.find, this.adapter.getSmartHomeConfig |
| [`GraphRunner.getOutputDefinitions`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L561) | – | String, out.push, this._resolveSceneDpId, this.nodes.values, toBool |
| [`GraphRunner._requestOutput`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L590) | nodeId, targetId, value, ack, reason, kind, params | Promise.resolve, String, this.adapter.setForeignStateAsync, this.outputController.request |
| [`GraphRunner.setDpInputValue`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L613) | nodeId, value | Date.now, this.setDpInputState |
| [`GraphRunner.setDpInputState`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L617) | nodeId, state, options | Date.now, Math.max, Math.min, Math.round, Number, Number.isFinite, Object.prototype.hasOwnProperty.call, String, castValue, isEqual, this._propagateFrom, this.nodes.get, toNum |
| [`GraphRunner.evaluateAll`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L675) | – | this._evaluateTopological |
| [`GraphRunner._propagateFrom`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L691) | fromNodeId, fromPort | isEqual, q.push, q.shift, seen.add, seen.has, this._evalNode, this.adj.get, this.nodes.get |
| [`GraphRunner._evalNode`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L745) | nodeId, queue, options | String, def.compute, def.inputs.some, isEqual, queue.push, res.sideEffect, this._nodeInternal.get, this._nodeInternal.set, this._propagateFrom, this._schedulePersistentState, this.nodes.get, this.outputController.safeStop, toBool |
| [`toBool`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L829) | v, def | Number, Number.isFinite, s.replace, v.trim |
| [`toNum`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L854) | v, def | Number, Number.isFinite, s.replace, v.trim |
| [`isEqual`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L879) | a, b | Number.isNaN |
| [`castValue`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L890) | value, cast | Number, Number.isFinite, String, s.replace, s.toLowerCase, toBool, toNum, value.trim |
| [`clamp`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L927) | v, lo, hi | Math.max, Math.min |
| [`parseTimeToMin`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L934) | s | Math.max, Math.min, String, parseInt, str.match |
| [`parseDays`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L957) | s | Number.isFinite, String, out.add, parseInt |
| [`nowLocal`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L999) | – | – |
| [`getIsoDay`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1006) | d | d.getDay |
| [`scheduleNextMinuteTick`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1024) | { internal, runner, nodeId } | Date.now, Math.max, Math.min, clearTimeout, setTimeout |
| [`triggerShortPulse`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1046) | { internal, key, widthMs, runner, nodeId, maxWidthMs = 2000, afterPulseMs = 0 } | Math.max, Math.min, Math.round, clearTimeout, setTimeout, toNum |
| [`safeStatePart`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1091) | value, fallback | String |
| [`buildTopologicalOrder`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1096) | nodes, links | Array.from, Array.isArray, String, edges.get, edges.set, indegree.entries, indegree.get, indegree.set, nodes.has, nodes.keys, out.push, queue.push, queue.shift |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1126) | { out } | – |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1132) | { in: inp, params, internal, runner, nodeId } | Date.now, Math.max, Math.min, Math.round, Number.isFinite, String, clearTimeout, isEqual, toBool, toNum |
| [`schedulePending`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1167) | – | Math.max, clearTimeout, setTimeout |
| [`sideEffect`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1203) | – | clearTimeout, runner._requestOutput, schedulePending |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1231) | { params } | String, toBool, toNum |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1245) | { in: inp } | toBool |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1251) | { in: inp } | toBool |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1257) | { in: inp } | toBool |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1263) | { in: inp } | toBool |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1273) | { in: inp, params, internal } | String, toBool |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1300) | { in: inp, params, internal } | String, toBool |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1324) | { in: inp, internal, runner, nodeId } | toBool, triggerShortPulse |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1349) | { in: inp, internal, runner, nodeId } | toBool, triggerShortPulse |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1368) | { in: inp, internal, runner, nodeId } | toBool, triggerShortPulse |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1387) | { in: inp, internal, runner, nodeId } | toBool, triggerShortPulse |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1407) | { in: inp, params } | Number.isFinite, String, toBool, toNum |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1455) | { in: inp, params, internal } | toBool, toNum |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1478) | { in: inp } | toNum |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1484) | { in: inp } | toNum |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1490) | { in: inp } | toNum |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1496) | { in: inp, params } | toNum |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1507) | { in: inp } | Math.max, Math.min, toNum |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1517) | { in: inp, params } | clamp, toNum |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1528) | { in: inp, params } | Math.max, Math.min, Math.pow, Math.round, String, clamp, toBool, toNum |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1570) | { in: inp, params, internal, runner, nodeId } | Date.now, Math.max, Math.min, Math.round, Number.isFinite, String, clearTimeout, setTimeout, toBool, toNum |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1646) | { in: inp, params } | Math.abs, Math.max, Math.min, Math.pow, Math.round, Number.isFinite, String, clamp, toBool, toNum |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1683) | { in: inp, params, internal, runner, nodeId } | Date.now, Math.abs, Math.max, Math.min, Math.pow, Math.round, Number.isFinite, String, clamp, clearIntervalSafe, round, setInterval, toBool, toNum |
| [`clearIntervalSafe`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1720) | – | clearInterval |
| [`round`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1794) | x | Math.round |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1804) | { in: inp, params, internal } | Number.isFinite, String, toBool, toNum |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1838) | { in: inp, params, internal, runner, nodeId } | Math.max, Math.min, Math.round, clearTimeout, clearTimers, setTimeout, toBool, toNum |
| [`clearTimers`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1863) | – | clearTimeout |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1919) | { in: inp, params } | Math.max, Math.min, Math.pow, Math.round, Number.isFinite, String, clamp, toBool, toNum |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L1987) | { in: inp, params, internal, runner, nodeId } | Date.now, Math.max, Math.min, Math.round, Number.isFinite, clearPulses, setTimeout, toBool, toNum, triggerShortPulse |
| [`clearPulses`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L2014) | – | Object.keys, clearTimeout |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L2068) | { in: inp, params, internal, runner, nodeId } | Date.now, Math.abs, Math.max, Math.min, Math.round, Number.isFinite, clamp, clearTimeout, clearTimers, setTimeout, toBool, toNum |
| [`clearTimers`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L2089) | – | clearTimeout |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L2158) | { in: inp, params, internal, runner, nodeId } | Math.max, Math.min, Math.round, clearTimeout, setTimeout, toBool, toNum |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L2201) | { in: inp, params, internal, runner, nodeId } | Math.max, Math.min, Math.round, clearTimeout, setTimeout, toBool, toNum |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L2238) | { in: inp, params, internal, runner, nodeId } | Math.max, Math.min, Math.round, clearTimeout, setTimeout, toBool, toNum |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L2274) | { in: inp, params, internal, runner, nodeId } | Math.max, Math.min, Math.round, String, clearTimeout, setTimeout, toBool, toNum |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L2315) | { in: inp, params, internal, runner, nodeId } | Math.max, Math.min, Math.round, String, clearTimeout, setTimeout, toBool, toNum |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L2356) | { in: inp, params, internal, runner, nodeId } | Math.max, Math.min, Math.round, clearTimeout, setTimeout, toBool, toNum |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L2393) | { in: inp, params, internal, runner, nodeId } | String, d.getHours, d.getMinutes, days.has, getIsoDay, nowLocal, parseDays, parseTimeToMin, scheduleNextMinuteTick, toBool |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L2452) | { in: inp, params, internal } | clamp, toBool, toNum |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L2493) | { in: inp, params, internal } | clamp, toBool, toNum |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L2539) | { in: inp, params, internal, runner, nodeId } | Date.now, Math.max, Math.min, Math.pow, Math.round, Number.isFinite, clearTimeout, scheduleNextMinuteTick, toBool, toNum |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L2608) | { in: inp, params, internal, runner, nodeId } | Math.max, Math.min, Math.round, String, runner._resolveSceneDpId, toBool, toNum |
| [`sideEffect`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L2642) | – | runner._requestOutput |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L2678) | { in: inp } | Math.min, toNum |
| [`compute`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L2683) | { in: inp } | Math.max, toNum |
| [`validateNexoLogicConfig`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L2689) | config | Array.from, Array.isArray, Number, String, adjacency.get, adjacency.has, adjacency.keys, fromDef.outputs.includes, graphIds.add, graphIds.has, incoming.add, incoming.has, issue, linkIds.add (weitere in der Quelle) |
| [`issue`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L2695) | code, message, path, detail | errors.push |
| [`visit`](../../../../../src-ts/runtime-executables/ems/nexologic-engine.ts#L2756) | id | adjacency.get, cycle.join, issue, stack.indexOf, stack.pop, stack.push, stack.slice, visit, visited.add, visited.has, visiting.add, visiting.delete, visiting.has |
