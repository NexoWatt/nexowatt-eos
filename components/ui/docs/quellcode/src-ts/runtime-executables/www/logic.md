# src-ts/runtime-executables/www/logic.ts

Stellt die NexoLogic-Konfiguration und die damit verbundenen Browser-Bedienaktionen bereit.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/www/logic.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

Kein direkter Import innerhalb des erfassten Quellbereichs. Mögliche HTML-, Adapter-, Build- oder dynamische Einstiege sind separat zu prüfen.

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`nwSyncLogicViewportMetrics`](../../../../../src-ts/runtime-executables/www/logic.ts#L116) | – | Math.ceil, Math.max, document.documentElement.style.setProperty, document.querySelector, topbar.getBoundingClientRect |
| [`nwInstallLogicViewportSizing`](../../../../../src-ts/runtime-executables/www/logic.ts#L126) | – | document.querySelector, nwSyncLogicViewportMetrics, observer.observe, window.addEventListener, window.visualViewport.addEventListener |
| [`nwClamp`](../../../../../src-ts/runtime-executables/www/logic.ts#L157) | v, lo, hi | Math.max, Math.min |
| [`nwNow`](../../../../../src-ts/runtime-executables/www/logic.ts#L164) | – | Date.now |
| [`nwUuid`](../../../../../src-ts/runtime-executables/www/logic.ts#L171) | pref | Math.random, nwNow |
| [`nwSafeStr`](../../../../../src-ts/runtime-executables/www/logic.ts#L188) | v | String |
| [`nwEscapeHtml`](../../../../../src-ts/runtime-executables/www/logic.ts#L190) | value | nwSafeStr |
| [`nwBool`](../../../../../src-ts/runtime-executables/www/logic.ts#L205) | v, def | v.trim |
| [`nwNum`](../../../../../src-ts/runtime-executables/www/logic.ts#L223) | v, def | Number.isFinite, parseFloat, v.replace |
| [`nwJsonClone`](../../../../../src-ts/runtime-executables/www/logic.ts#L244) | o | JSON.parse, JSON.stringify |
| [`nwSerializeEditorConfig`](../../../../../src-ts/runtime-executables/www/logic.ts#L251) | cfg | JSON.stringify |
| [`nwUpdateHistoryButtons`](../../../../../src-ts/runtime-executables/www/logic.ts#L255) | – | Array.isArray |
| [`nwHistorySnapshot`](../../../../../src-ts/runtime-executables/www/logic.ts#L261) | label | Date.now, String, nwDefaultGraph, nwJsonClone, nwSerializeEditorConfig |
| [`nwHistoryReset`](../../../../../src-ts/runtime-executables/www/logic.ts#L272) | label | clearTimeout, nwHistorySnapshot, nwUpdateHistoryButtons |
| [`nwHistoryCommit`](../../../../../src-ts/runtime-executables/www/logic.ts#L284) | label | Array.isArray, Math.max, Number, clearTimeout, nwHistorySnapshot, nwLE.history.undo.push, nwLE.history.undo.splice, nwUpdateHistoryButtons |
| [`nwHistoryScheduleCommit`](../../../../../src-ts/runtime-executables/www/logic.ts#L304) | label | clearTimeout, setTimeout |
| [`nwHistoryApply`](../../../../../src-ts/runtime-executables/www/logic.ts#L310) | snapshot, statusText | nwDefaultGraph, nwEnsureConfigDefaults, nwJsonClone, nwRenderGraph, nwRenderGraphSelector, nwRenderInspector, nwScheduleLocalDraft, nwSelectGraph, nwSerializeEditorConfig, nwSetStatus, nwSimReset, nwUpdateHistoryButtons |
| [`nwUndo`](../../../../../src-ts/runtime-executables/www/logic.ts#L331) | – | Array.isArray, nwHistoryApply, nwHistoryCommit, nwLE.history.redo.push, nwLE.history.undo.pop |
| [`nwRedo`](../../../../../src-ts/runtime-executables/www/logic.ts#L340) | – | Array.isArray, nwHistoryApply, nwLE.history.redo.pop, nwLE.history.undo.push |
| [`nwDraftStorageKey`](../../../../../src-ts/runtime-executables/www/logic.ts#L348) | – | – |
| [`nwUpdateDraftStatus`](../../../../../src-ts/runtime-executables/www/logic.ts#L352) | text | String |
| [`nwWriteLocalDraftNow`](../../../../../src-ts/runtime-executables/www/logic.ts#L356) | – | Date.now, JSON.stringify, clearTimeout, localStorage.setItem, nwDefaultGraph, nwDraftStorageKey, nwJsonClone, nwUpdateDraftStatus |
| [`nwScheduleLocalDraft`](../../../../../src-ts/runtime-executables/www/logic.ts#L377) | – | clearTimeout, setTimeout |
| [`nwClearLocalDraft`](../../../../../src-ts/runtime-executables/www/logic.ts#L383) | – | clearTimeout, localStorage.removeItem, nwDraftStorageKey, nwUpdateDraftStatus |
| [`nwMaybeRestoreLocalDraft`](../../../../../src-ts/runtime-executables/www/logic.ts#L392) | serverCfg | Date.now, JSON.parse, Number, confirm, localStorage.getItem, localStorage.removeItem, nwDraftStorageKey, nwEnsureConfigDefaults, nwSerializeEditorConfig, nwUpdateDraftStatus |
| [`nwNodeLane`](../../../../../src-ts/runtime-executables/www/logic.ts#L428) | type | – |
| [`nwEstimatedNodeHeight`](../../../../../src-ts/runtime-executables/www/logic.ts#L436) | type | Array.isArray, Math.ceil, Math.max |
| [`nwLaneBounds`](../../../../../src-ts/runtime-executables/www/logic.ts#L448) | g | Math.max, Number |
| [`nwUpdateLaneGuides`](../../../../../src-ts/runtime-executables/www/logic.ts#L456) | – | Math.max, Math.round, board.querySelector, el.setAttribute, nwLaneBounds |
| [`nwNodeRectsOverlap`](../../../../../src-ts/runtime-executables/www/logic.ts#L475) | a, b | – |
| [`nwFindFreeLanePosition`](../../../../../src-ts/runtime-executables/www/logic.ts#L479) | type, g | Array.from, Math.floor, Math.max, Math.min, Math.round, Number, existing.some, nwClampNodePosition, nwEnsureGraphDefaults, nwEstimatedNodeHeight, nwLaneBounds, nwNodeLane |
| [`nwScrollNodeIntoView`](../../../../../src-ts/runtime-executables/www/logic.ts#L520) | node | Math.max, Number, nwClamp, nwEstimatedNodeHeight, nwNum, wrap.scrollTo |
| [`nwAutoLayoutGraph`](../../../../../src-ts/runtime-executables/www/logic.ts#L530) | – | Array.isArray, Math.max, Number, children.get, depth.get, depth.set, g.nodes.filter, groups.entries, groups.get, groups.has, groups.set, groups.values, isolated.forEach, isolated.sort (weitere in der Quelle) |
| [`keyFor`](../../../../../src-ts/runtime-executables/www/logic.ts#L577) | node | Math.max, depth.get, nwNodeLane |
| [`xForDepth`](../../../../../src-ts/runtime-executables/www/logic.ts#L596) | d | Math.max, Math.round |
| [`nwSimBool`](../../../../../src-ts/runtime-executables/www/logic.ts#L626) | value, def | nwBool |
| [`nwSimNum`](../../../../../src-ts/runtime-executables/www/logic.ts#L631) | value, def | nwNum |
| [`nwSimValueKey`](../../../../../src-ts/runtime-executables/www/logic.ts#L636) | value | JSON.stringify, String |
| [`nwSimFormatValue`](../../../../../src-ts/runtime-executables/www/logic.ts#L640) | value | JSON.stringify, Math.round, Number.isFinite, String |
| [`nwSimTrace`](../../../../../src-ts/runtime-executables/www/logic.ts#L654) | node, message, level | String, sim.traces.push, sim.traces.splice |
| [`nwSimDefaultInput`](../../../../../src-ts/runtime-executables/www/logic.ts#L667) | node | Number.isFinite, String, nwSimBool, nwSimNum |
| [`nwSimDefaultInputType`](../../../../../src-ts/runtime-executables/www/logic.ts#L677) | node | Number, Number.isFinite, String, fallback.replace, fallback.trim |
| [`nwSimEnsureInputs`](../../../../../src-ts/runtime-executables/www/logic.ts#L688) | – | Object.prototype.hasOwnProperty.call, nwSimDefaultInput, nwSimDefaultInputType |
| [`nwSimStopTimer`](../../../../../src-ts/runtime-executables/www/logic.ts#L698) | – | clearInterval |
| [`nwSimSetRunning`](../../../../../src-ts/runtime-executables/www/logic.ts#L706) | running | nwRenderSimulationPanel, nwSimStopTimer, setInterval |
| [`nwSimParseTimeToMin`](../../../../../src-ts/runtime-executables/www/logic.ts#L720) | value | Number, Number.isInteger, String |
| [`nwSimParseDays`](../../../../../src-ts/runtime-executables/www/logic.ts#L729) | value | String |
| [`nwSimEdgeFired`](../../../../../src-ts/runtime-executables/www/logic.ts#L743) | state, input, edge, initializing | nwSimBool |
| [`nwSimComputeNode`](../../../../../src-ts/runtime-executables/www/logic.ts#L753) | node, inp, state, ctx | Math.abs, Math.max, Math.min, Math.round, Number, Number.isFinite, String, d.getDay, d.getHours, d.getMinutes, days.has, enabledDefault, nwClamp, nwSimBool (weitere in der Quelle) |
| [`enabledDefault`](../../../../../src-ts/runtime-executables/www/logic.ts#L759) | value | nwSimBool |
| [`nwSimTopologicalOrder`](../../../../../src-ts/runtime-executables/www/logic.ts#L1125) | g | Array.isArray, g.nodes.filter, indegree.get, indegree.set, next.get, nodeMap.get, nodeMap.has, nodes.filter, nodes.map, order.concat, order.push, queue.push, queue.shift, queue.sort |
| [`nwSimEvaluate`](../../../../../src-ts/runtime-executables/www/logic.ts#L1149) | reason | Array.isArray, Math.max, Object.keys, Object.prototype.hasOwnProperty.call, changes.join, changes.push, links.find, nwRenderSimulationPanel, nwSimComputeNode, nwSimEnsureInputs, nwSimFormatValue, nwSimTopologicalOrder, nwSimTrace, nwSimValueKey (weitere in der Quelle) |
| [`nwSimAdvance`](../../../../../src-ts/runtime-executables/www/logic.ts#L1201) | ms, reason | Math.max, Number, nwOpenSimulation, nwSimEvaluate |
| [`nwSimReset`](../../../../../src-ts/runtime-executables/www/logic.ts#L1207) | render | Date.now, nwRenderSimulationPanel, nwSimEnsureInputs, nwSimEvaluate, nwSimStopTimer, nwSimTrace |
| [`nwOpenSimulation`](../../../../../src-ts/runtime-executables/www/logic.ts#L1224) | – | document.body.classList.add, nwLE.el.simBtn.classList.add, nwLE.el.simPanel.classList.remove, nwLE.el.simPanel.setAttribute, nwRenderSimulationPanel, nwSimReset, nwUpdateSimulationVisuals |
| [`nwCloseSimulation`](../../../../../src-ts/runtime-executables/www/logic.ts#L1238) | – | document.body.classList.remove, nwLE.el.simBtn.classList.remove, nwLE.el.simPanel.classList.add, nwLE.el.simPanel.setAttribute, nwSimStopTimer, nwUpdateSimulationVisuals |
| [`nwRenderSimulationInputs`](../../../../../src-ts/runtime-executables/www/logic.ts#L1250) | force | String, document.createElement, host.appendChild, nodes.map, nwEscapeHtml, nwSimDefaultInputType, nwSimEnsureInputs, renderControl, row.querySelector, typeSelect.addEventListener |
| [`renderControl`](../../../../../src-ts/runtime-executables/www/logic.ts#L1281) | – | String, control.appendChild, document.createElement, input.addEventListener, label.append, nwSimBool |
| [`nwRenderSimulationTrace`](../../../../../src-ts/runtime-executables/www/logic.ts#L1306) | – | document.createElement, host.appendChild, nwEscapeHtml, nwLE.simulation.traces.slice |
| [`nwRenderSimulationPanel`](../../../../../src-ts/runtime-executables/www/logic.ts#L1324) | forceInputs | nwRenderSimulationInputs, nwRenderSimulationTrace |
| [`nwUpdateSimulationVisuals`](../../../../../src-ts/runtime-executables/www/logic.ts#L1333) | – | badges.join, badges.push, board.classList.toggle, board.querySelectorAll, nodeEl.classList.toggle, nodeEl.querySelector, nwEscapeHtml, nwFindNode, nwSimFormatValue, nwUpdateAllWirePaths |
| [`nwGetBoardPointFromClient`](../../../../../src-ts/runtime-executables/www/logic.ts#L1361) | clientX, clientY | board.getBoundingClientRect, nwClamp, nwNum |
| [`nwClampNodePosition`](../../../../../src-ts/runtime-executables/www/logic.ts#L1377) | x, y, g | Math.max, Number, nwClamp, nwNum |
| [`nwReadPaletteBlockType`](../../../../../src-ts/runtime-executables/www/logic.ts#L1391) | ev | JSON.parse, String, dt.getData, nwSafeStr |
| [`nwSetStatus`](../../../../../src-ts/runtime-executables/www/logic.ts#L1412) | text, ok | – |
| [`nwBuildLogicLibrary`](../../../../../src-ts/runtime-executables/www/logic.ts#L1428) | – | – |
| [`nwFetchConfig`](../../../../../src-ts/runtime-executables/www/logic.ts#L2312) | – | console.warn, fetch, nwSetStatus, res.json |
| [`nwSaveConfig`](../../../../../src-ts/runtime-executables/www/logic.ts#L2330) | cfg | Array.isArray, JSON.stringify, String, console.warn, fetch, json.issues.map, res.json |
| [`nwDefaultGraph`](../../../../../src-ts/runtime-executables/www/logic.ts#L2361) | – | – |
| [`nwEnsureConfigDefaults`](../../../../../src-ts/runtime-executables/www/logic.ts#L2382) | cfg | Array.isArray, nwDefaultGraph |
| [`nwGetGraphById`](../../../../../src-ts/runtime-executables/www/logic.ts#L2395) | cfg, id | graphs.find, nwDefaultGraph, nwEnsureConfigDefaults |
| [`nwGetMainGraph`](../../../../../src-ts/runtime-executables/www/logic.ts#L2413) | cfg | nwGetGraphById |
| [`nwRenderGraphSelector`](../../../../../src-ts/runtime-executables/www/logic.ts#L2422) | – | Array.isArray, document.createElement, nwEnsureConfigDefaults, sel.appendChild |
| [`nwUpdateGraphControls`](../../../../../src-ts/runtime-executables/www/logic.ts#L2445) | – | – |
| [`nwSelectGraph`](../../../../../src-ts/runtime-executables/www/logic.ts#L2456) | id, opts | localStorage.setItem, nwEnsureConfigDefaults, nwEnsureGraphDefaults, nwGetGraphById, nwRenderGraph, nwRenderGraphSelector, nwSimReset, nwUpdateGraphControls |
| [`nwAddGraph`](../../../../../src-ts/runtime-executables/www/logic.ts#L2479) | – | cfg.graphs.map, cfg.graphs.push, ids.has, nwEnsureConfigDefaults, nwMarkDirty, nwSelectGraph, nwUuid, prompt |
| [`nwDuplicateGraph`](../../../../../src-ts/runtime-executables/www/logic.ts#L2506) | – | cfg.graphs.map, cfg.graphs.push, ids.has, nwEnsureConfigDefaults, nwJsonClone, nwMarkDirty, nwSelectGraph, nwUuid |
| [`nwRenameGraph`](../../../../../src-ts/runtime-executables/www/logic.ts#L2528) | – | nwMarkDirty, nwRenderGraphSelector, prompt |
| [`nwDeleteGraph`](../../../../../src-ts/runtime-executables/www/logic.ts#L2543) | – | Array.isArray, Math.min, alert, cfg.graphs.findIndex, cfg.graphs.splice, confirm, nwEnsureConfigDefaults, nwMarkDirty, nwSelectGraph |
| [`nwMarkDirty`](../../../../../src-ts/runtime-executables/www/logic.ts#L2566) | label | nwHistoryScheduleCommit, nwScheduleLocalDraft, nwSetStatus, nwSimEvaluate |
| [`nwClearBoard`](../../../../../src-ts/runtime-executables/www/logic.ts#L2587) | – | board.querySelectorAll, nwCancelConnect |
| [`nwEnsureBoardSize`](../../../../../src-ts/runtime-executables/www/logic.ts#L2602) | – | Math.max, Math.round, Number, String, nwClamp, nwNum, nwUpdateLaneGuides, nwUpdateZoomLabel, svg.setAttribute |
| [`nwUpdateZoomLabel`](../../../../../src-ts/runtime-executables/www/logic.ts#L2640) | – | Math.round, nwClamp, nwNum |
| [`nwSetZoom`](../../../../../src-ts/runtime-executables/www/logic.ts#L2652) | newZoom, opts | Math.abs, Math.max, Math.round, Number, String, localStorage.setItem, nwClamp, nwEnsureBoardSize, nwNum, nwUpdateAllWirePaths |
| [`nwZoomIn`](../../../../../src-ts/runtime-executables/www/logic.ts#L2695) | – | nwClamp, nwNum, nwSetZoom |
| [`nwZoomOut`](../../../../../src-ts/runtime-executables/www/logic.ts#L2704) | – | nwClamp, nwNum, nwSetZoom |
| [`nwZoomReset`](../../../../../src-ts/runtime-executables/www/logic.ts#L2713) | – | nwSetZoom |
| [`nwZoomFit`](../../../../../src-ts/runtime-executables/www/logic.ts#L2722) | – | Math.max, Math.min, Number, nwSetZoom |
| [`nwRenderPalette`](../../../../../src-ts/runtime-executables/www/logic.ts#L2739) | – | Object.keys, btn.addEventListener, cats.sort, document.createElement, folder.addEventListener, folder.setAttribute, groupWrap.appendChild, groupWrap.classList.add, nwSafeStr, palGetCollapsed, wrap.appendChild |
| [`palKey`](../../../../../src-ts/runtime-executables/www/logic.ts#L2749) | cat | String, encodeURIComponent |
| [`palGetCollapsed`](../../../../../src-ts/runtime-executables/www/logic.ts#L2756) | cat | String, localStorage.getItem, palKey |
| [`palSetCollapsed`](../../../../../src-ts/runtime-executables/www/logic.ts#L2777) | cat, collapsed | localStorage.setItem, palKey |
| [`nwRenderGraph`](../../../../../src-ts/runtime-executables/www/logic.ts#L2870) | – | nwClearBoard, nwEnsureBoardSize, nwRenderAllWires, nwRenderNode, nwUpdateLaneGuides, nwUpdateSimulationVisuals |
| [`nwRenderNode`](../../../../../src-ts/runtime-executables/www/logic.ts#L2892) | node | Math.round, Number, board.appendChild, del.addEventListener, document.createElement, el.addEventListener, el.classList.add, el.querySelector, hdr.addEventListener, nwNodeLane, nwSafeStr, nwUpdateSimulationVisuals |
| [`mkPort`](../../../../../src-ts/runtime-executables/www/logic.ts#L2987) | dir, p | d.addEventListener, d.setAttribute, document.createElement, nwSafeStr |
| [`nwRenderAllWires`](../../../../../src-ts/runtime-executables/www/logic.ts#L3067) | – | Array.isArray, document.createElementNS, label.setAttribute, nwUpdateAllWirePaths, path.setAttribute, svg.appendChild |
| [`nwUpdateAllWirePaths`](../../../../../src-ts/runtime-executables/www/logic.ts#L3097) | – | Array.isArray, CSS.escape, String, board.getBoundingClientRect, getPortPos, l.previewPath.setAttribute, label.classList.toggle, label.setAttribute, mkPath, nwClamp, nwNum, nwSimFormatValue, p.classList.toggle, p.setAttribute (weitere in der Quelle) |
| [`getPortPos`](../../../../../src-ts/runtime-executables/www/logic.ts#L3117) | nodeId, portKey, dir | CSS.escape, board.querySelector, el.getBoundingClientRect |
| [`mkPath`](../../../../../src-ts/runtime-executables/www/logic.ts#L3139) | a, b | Math.abs, Math.max, a.x.toFixed, a.y.toFixed, b.x.toFixed, b.y.toFixed, c1.x.toFixed, c1.y.toFixed, c2.x.toFixed, c2.y.toFixed |
| [`nwSelectNode`](../../../../../src-ts/runtime-executables/www/logic.ts#L3193) | nodeId | board.querySelectorAll, nwRenderInspector |
| [`nwFindNode`](../../../../../src-ts/runtime-executables/www/logic.ts#L3210) | nodeId | Array.isArray, nodes.find |
| [`nwRenderInspector`](../../../../../src-ts/runtime-executables/www/logic.ts#L3221) | – | Array.isArray, Number.isFinite, Object.prototype.hasOwnProperty.call, cur.add, dayList.map, document.createElement, mkRow, nwFindNode, nwSafeStr, parseInt, scenes.map, setTimeout, wrap.appendChild |
| [`mkRow`](../../../../../src-ts/runtime-executables/www/logic.ts#L3256) | label, html | document.createElement |
| [`update`](../../../../../src-ts/runtime-executables/www/logic.ts#L3450) | – | boxes.forEach, host.querySelectorAll, nwMarkDirty, sel.map, sel.sort |
| [`nwAddNode`](../../../../../src-ts/runtime-executables/www/logic.ts#L3531) | type, opts | Array.isArray, Number, Number.isFinite, g.nodes.push, nwClampNodePosition, nwFindFreeLanePosition, nwJsonClone, nwMarkDirty, nwRenderNode, nwSelectNode, nwUpdateAllWirePaths, nwUuid, requestAnimationFrame |
| [`nwDeleteNode`](../../../../../src-ts/runtime-executables/www/logic.ts#L3570) | nodeId | Array.isArray, CSS.escape, board.querySelector, el.remove, nwMarkDirty, nwRenderAllWires, nwRenderInspector |
| [`nwRemoveLinksWhere`](../../../../../src-ts/runtime-executables/www/logic.ts#L3603) | predicate | Array.isArray, g.links.filter, nwMarkDirty, nwRenderAllWires |
| [`nwRemoveLinkById`](../../../../../src-ts/runtime-executables/www/logic.ts#L3623) | linkId | nwRemoveLinksWhere |
| [`nwRemoveLinksToInput`](../../../../../src-ts/runtime-executables/www/logic.ts#L3633) | nodeId, portKey | nwRemoveLinksWhere |
| [`nwFindLinkIdNearClientPoint`](../../../../../src-ts/runtime-executables/www/logic.ts#L3643) | clientX, clientY | Math.max, Math.min, Number.isFinite, nwClamp, nwGetBoardPointFromClient, nwNum, path.getPointAtLength, path.getTotalLength, svg.querySelectorAll |
| [`nwStartConnect`](../../../../../src-ts/runtime-executables/www/logic.ts#L3697) | fromNodeId, fromPortKey | document.createElementNS, nwApplyConnectVisualState, nwCancelConnect, nwSetStatus, nwUpdateAllWirePaths, p.setAttribute, svg.appendChild |
| [`nwLogicPortType`](../../../../../src-ts/runtime-executables/www/logic.ts#L3736) | nodeId, portKey, direction | Array.isArray, String, graph.nodes.find, ports.find |
| [`nwApplyConnectVisualState`](../../../../../src-ts/runtime-executables/www/logic.ts#L3749) | – | String, board.classList.toggle, board.querySelectorAll, nwLogicPortType, port.classList.add, port.classList.remove |
| [`nwClearConnectPreview`](../../../../../src-ts/runtime-executables/www/logic.ts#L3772) | connection | c.previewPath.remove, nwApplyConnectVisualState, nwUpdateAllWirePaths |
| [`nwWouldCreateLogicCycle`](../../../../../src-ts/runtime-executables/www/logic.ts#L3780) | graph, fromNodeId, toNodeId | Array.isArray, String, adj.get, adj.has, adj.set, seen.add, seen.has, stack.pop, stack.push |
| [`nwFinishConnect`](../../../../../src-ts/runtime-executables/www/logic.ts#L3802) | toNodeId, toPortKey | Array.isArray, g.links.filter, g.links.push, g.links.some, nwClearConnectPreview, nwLogicPortType, nwMarkDirty, nwRenderAllWires, nwSetStatus, nwUuid, nwWouldCreateLogicCycle |
| [`nwCancelConnect`](../../../../../src-ts/runtime-executables/www/logic.ts#L3846) | – | nwClearConnectPreview |
| [`nwOpenModal`](../../../../../src-ts/runtime-executables/www/logic.ts#L3862) | modalEl | modalEl.classList.remove, modalEl.setAttribute |
| [`nwCloseModal`](../../../../../src-ts/runtime-executables/www/logic.ts#L3873) | modalEl | modalEl.classList.add, modalEl.setAttribute |
| [`nwFetchJson`](../../../../../src-ts/runtime-executables/www/logic.ts#L3884) | url | fetch, res.json |
| [`nwDpSearch`](../../../../../src-ts/runtime-executables/www/logic.ts#L3898) | q | Array.isArray, encodeURIComponent, nwFetchJson, nwSafeStr |
| [`nwDpTree`](../../../../../src-ts/runtime-executables/www/logic.ts#L3910) | prefix | Array.isArray, encodeURIComponent, nwFetchJson, nwSafeStr |
| [`nwDpParentPrefix`](../../../../../src-ts/runtime-executables/www/logic.ts#L3922) | id | nwSafeStr, parts.join, parts.pop |
| [`nwDpMetaText`](../../../../../src-ts/runtime-executables/www/logic.ts#L3934) | it | String, metaBits.join, metaBits.push |
| [`nwCreateDpResultRow`](../../../../../src-ts/runtime-executables/www/logic.ts#L3948) | primary, meta, onActivate | document.createElement, nwSafeStr, row.addEventListener, row.appendChild |
| [`activate`](../../../../../src-ts/runtime-executables/www/logic.ts#L3976) | e | e.preventDefault, e.stopPropagation, onActivate |
| [`nwRenderDpResults`](../../../../../src-ts/runtime-executables/www/logic.ts#L3999) | list, onPick | Array.isArray, nwCreateDpResultRow, nwDpMetaText, nwSafeStr, wrap.appendChild |
| [`nwRenderDpBreadcrumb`](../../../../../src-ts/runtime-executables/www/logic.ts#L4026) | prefix, onNavigate | mkCrumb, mkSep, nwSafeStr, wrap.appendChild |
| [`mkCrumb`](../../../../../src-ts/runtime-executables/www/logic.ts#L4045) | label, nextPrefix, clickable | btn.addEventListener, document.createElement |
| [`mkSep`](../../../../../src-ts/runtime-executables/www/logic.ts#L4071) | – | document.createElement |
| [`nwOpenDpPicker`](../../../../../src-ts/runtime-executables/www/logic.ts#L4094) | initialQuery | – |
| [`isAlive`](../../../../../src-ts/runtime-executables/www/logic.ts#L4126) | – | – |
| [`finish`](../../../../../src-ts/runtime-executables/www/logic.ts#L4133) | val | cleanup, nwCloseModal, resolve |
| [`setTreeMessage`](../../../../../src-ts/runtime-executables/www/logic.ts#L4154) | html | isAlive |
| [`setResultsMessage`](../../../../../src-ts/runtime-executables/www/logic.ts#L4164) | html | isAlive |
| [`openPrefix`](../../../../../src-ts/runtime-executables/www/logic.ts#L4181) | nextPrefix | nwSafeStr, refreshTree |
| [`onPick`](../../../../../src-ts/runtime-executables/www/logic.ts#L4191) | id | finish |
| [`upOne`](../../../../../src-ts/runtime-executables/www/logic.ts#L4205) | – | parts.join, parts.pop, treePrefix.split |
| [`renderTree`](../../../../../src-ts/runtime-executables/www/logic.ts#L4224) | children | Array.isArray, String, isAlive, metaBits.join, metaBits.push, nwCreateDpResultRow, nwDpMetaText, nwSafeStr, treeWrap.appendChild |
| [`refreshTree`](../../../../../src-ts/runtime-executables/www/logic.ts#L4284) | – | isAlive, nwDpTree, nwRenderDpBreadcrumb, nwSafeStr, renderTree, setTreeMessage |
| [`onSearch`](../../../../../src-ts/runtime-executables/www/logic.ts#L4313) | – | isAlive, nwDpSearch, nwRenderDpResults, nwSafeStr, setResultsMessage |
| [`onClose`](../../../../../src-ts/runtime-executables/www/logic.ts#L4342) | – | finish |
| [`onBg`](../../../../../src-ts/runtime-executables/www/logic.ts#L4349) | e | finish |
| [`onKey`](../../../../../src-ts/runtime-executables/www/logic.ts#L4356) | e | e.preventDefault, finish, onSearch |
| [`onRoot`](../../../../../src-ts/runtime-executables/www/logic.ts#L4375) | – | openPrefix |
| [`onUp`](../../../../../src-ts/runtime-executables/www/logic.ts#L4382) | – | refreshTree, upOne |
| [`cleanup`](../../../../../src-ts/runtime-executables/www/logic.ts#L4392) | – | btn.removeEventListener, closeBtn.removeEventListener, modal.removeEventListener, qInp.removeEventListener, rootBtn.removeEventListener, upBtn.removeEventListener |
| [`nwOpenImport`](../../../../../src-ts/runtime-executables/www/logic.ts#L4442) | – | nwOpenModal, setTimeout |
| [`nwCloseImport`](../../../../../src-ts/runtime-executables/www/logic.ts#L4456) | – | nwCloseModal |
| [`nwApplyImport`](../../../../../src-ts/runtime-executables/www/logic.ts#L4465) | – | JSON.parse, alert, nwCloseImport, nwEnsureConfigDefaults, nwMarkDirty, nwRenderGraph, nwRenderGraphSelector, nwRenderInspector, nwSelectGraph |
| [`nwOpenExport`](../../../../../src-ts/runtime-executables/www/logic.ts#L4491) | – | JSON.stringify, nwDefaultGraph, nwOpenModal |
| [`nwCloseExport`](../../../../../src-ts/runtime-executables/www/logic.ts#L4505) | – | nwCloseModal |
| [`nwDownloadExport`](../../../../../src-ts/runtime-executables/www/logic.ts#L4514) | – | JSON.stringify, URL.createObjectURL, a.click, a.remove, document.body.appendChild, document.createElement, nwDefaultGraph, setTimeout |
| [`nwSetBackupStatus`](../../../../../src-ts/runtime-executables/www/logic.ts#L4538) | msg, type | – |
| [`nwOpenBackup`](../../../../../src-ts/runtime-executables/www/logic.ts#L4550) | – | nwOpenModal, nwSetBackupStatus |
| [`nwCloseBackup`](../../../../../src-ts/runtime-executables/www/logic.ts#L4560) | – | nwCloseModal |
| [`nwBackupExport`](../../../../../src-ts/runtime-executables/www/logic.ts#L4569) | – | JSON.stringify, URL.createObjectURL, a.click, a.remove, document.body.appendChild, document.createElement, fetch, nwSetBackupStatus, res.json, setTimeout |
| [`nwBackupImportFromFile`](../../../../../src-ts/runtime-executables/www/logic.ts#L4593) | file, mode | JSON.parse, JSON.stringify, fetch, file.text, nwSetBackupStatus, res.json |
| [`nwBackupRestoreFromUserdata`](../../../../../src-ts/runtime-executables/www/logic.ts#L4613) | – | JSON.stringify, confirm, fetch, nwSetBackupStatus, res.json, res2.json |
| [`nwEnsureGraphDefaults`](../../../../../src-ts/runtime-executables/www/logic.ts#L4641) | g | Array.isArray, Object.entries, nwUuid |
| [`nwInstallGlobalHandlers`](../../../../../src-ts/runtime-executables/www/logic.ts#L4683) | – | document.addEventListener, wrap.addEventListener |
| [`nwHandleSave`](../../../../../src-ts/runtime-executables/www/logic.ts#L4827) | – | Date.now, nwClearLocalDraft, nwDefaultGraph, nwEnsureConfigDefaults, nwHistoryReset, nwJsonClone, nwRenderGraph, nwRenderInspector, nwSafeStr, nwSaveConfig, nwSelectGraph, nwSetStatus |
| [`nwHandleNew`](../../../../../src-ts/runtime-executables/www/logic.ts#L4860) | – | nwDefaultGraph, nwEnsureConfigDefaults, nwMarkDirty, nwRenderGraph, nwRenderGraphSelector, nwRenderInspector, nwSelectGraph |
| [`nwInitLogicEditor`](../../../../../src-ts/runtime-executables/www/logic.ts#L4881) | – | Array.isArray, Number.isFinite, btnBackup.addEventListener, btnExport.addEventListener, btnImport.addEventListener, btnNew.addEventListener, btnOverview.addEventListener, btnSave.addEventListener, btnSmarthomeCfg.addEventListener, document.getElementById, fetch, localStorage.getItem, nwBuildLogicLibrary, nwClamp (weitere in der Quelle) |
