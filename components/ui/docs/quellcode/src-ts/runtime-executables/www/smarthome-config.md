# src-ts/runtime-executables/www/smarthome-config.ts

Ermöglicht Installern und Admins die Einrichtung von Etagen, Räumen, Geräten, Seiten und Szenen und speichert den gemeinsamen SmartHome-Vertrag.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/www/smarthome-config.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

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
| [`nwShcfgDefaultSensorUiFromTemplate`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L144) | tpl | String, meta.includes |
| [`byId`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L163) | id | document.getElementById |
| [`nwEnsureShcfgUiState`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L172) | – | JSON.parse, Object.assign, localStorage.getItem |
| [`nwShcfgPersistLibCollapsed`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L240) | – | JSON.stringify, localStorage.setItem, nwEnsureShcfgUiState |
| [`nwShcfgGetTargetRoomIdForAdd`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L253) | – | nwEnsureShcfgUiState |
| [`nwShcfgGetRoomById`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L271) | roomId | Array.isArray, rooms.find |
| [`nwShcfgGetSelectedFloorIdForAddRoom`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L282) | – | Array.isArray, floors.find, nwEnsureShcfgUiState, rooms.find |
| [`nwNormalizeSmartHomeConfig`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L313) | cfg | Array.isArray |
| [`nwEscapeHtml`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L333) | value | String |
| [`nwSortByOrder`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L350) | a, b | Number, Number.isFinite, String, aKey.localeCompare |
| [`nwShcNormalizeIconName`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L524) | value | String, s.toLowerCase |
| [`nwShcSafeBadgeText`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L614) | value | String, s.replace, s.slice |
| [`nwShcParseDynamicIcon`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L628) | rawValue | String, lower.startsWith, raw.slice, raw.toLowerCase |
| [`nwShcDynamicDeviceIconSvg`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L655) | kind, labelRaw | nwEscapeHtml, nwShcSafeBadgeText |
| [`nwShcRenderIconPreview`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L707) | previewEl, iconValue | String, nwShcDynamicDeviceIconSvg, nwShcNormalizeIconName, nwShcParseDynamicIcon |
| [`nwShcfgRenderIconPickerRow`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L930) | currentValue, onCommit, { showLabel = true, labelText = 'Icon' } | document.createElement, iconCustom.addEventListener, iconLine.appendChild, iconSelect.addEventListener, iconTop.appendChild, options.forEach, options.map, syncUiFromValue |
| [`commitIcon`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L973) | value | String, onCommit |
| [`setPreview`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L983) | value | nwShcRenderIconPreview |
| [`syncUiFromValue`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L992) | value | String, optionIds.has, setPreview |
| [`nwScheduleValidation`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L1064) | – | clearTimeout, setTimeout |
| [`nwCssEscape`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L1077) | value | String, s.replace, window.CSS.escape |
| [`nwEntityKey`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L1088) | entity | – |
| [`nwPushIssue`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L1100) | out, severity, title, message, entity | nwEntityKey, out.errors.push, out.warnings.push |
| [`nwLooksLikeDpId`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L1125) | id | String, s.includes |
| [`nwValidateConfig`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L1138) | cfg | Array.isArray, devices.forEach, fns.forEach, rooms.forEach |
| [`chkDp`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L1239) | label, dp | String, nwLooksLikeDpId, nwPushIssue |
| [`nwRenderValidationPanel`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L1456) | result | badges.appendChild, document.createElement, document.getElementById, head.appendChild, host.appendChild, items.forEach |
| [`nwFocusEntity`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L1559) | entity | document.querySelector, el.classList.add, el.classList.remove, el.scrollIntoView, nwCssEscape, setTimeout |
| [`nwApplyValidationToDom`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L1590) | result | Object.keys, document.querySelectorAll |
| [`nwRunValidationNow`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L1613) | – | nwApplyValidationToDom, nwRenderValidationPanel, nwValidateConfig |
| [`nwGetRoomLabel`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L1626) | room | – |
| [`nwGetFunctionLabel`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L1636) | fn | – |
| [`nwGetTypeLabel`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L1646) | type | – |
| [`nwSetStatus`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L1667) | text, variant | document.getElementById, el.classList.add, el.classList.remove |
| [`nwMarkDirty`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L1680) | dirty | document.getElementById, nwScheduleValidation, nwSetStatus |
| [`nwFetchSmartHomeConfig`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L1701) | – | console.error, console.warn, fetch, nwSetStatus, res.json |
| [`nwDownloadTextFile`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L1731) | filename, text, mimeType | URL.createObjectURL, a.click, console.error, document.body.appendChild, document.createElement, setTimeout |
| [`nwNormalizeImportedSmartHomeConfig`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L1754) | rawCfg | Array.isArray, Object.assign |
| [`nwSetPagesStatus`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L1777) | msg, type | document.getElementById, el.classList.add, el.classList.remove |
| [`nwNormalizePageObject`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L1791) | p, idx | Array.isArray, Number.isFinite, String, p.funcIds.map, p.roomIds.map, p.types.map |
| [`nwParsePagesJson`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L1820) | text | Array.isArray, JSON.parse, String, pages.sort, parsed.map, seen.add, seen.has |
| [`nwBuildDefaultPages`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L1849) | cfg | Array.isArray, String, pages.push, roomsByFloor.get, roomsByFloor.has, roomsByFloor.set, roomsSorted.forEach, roomsSorted.map, sortedFloors.forEach, unassignedRooms.push |
| [`nwRenderPagesEditor`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L2023) | force | document.getElementById, nwPagesRenderEditor, nwPagesRenderList, nwPagesRenderStatus, nwPagesRenderTabs, nwParsePagesJson, nwShcState.pagesDraft.some |
| [`nwPagesRenderStatus`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L2067) | parsed | document.getElementById, st.classList.add, st.classList.contains, st.classList.remove |
| [`nwPagesRenderTabs`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L2095) | – | document.getElementById, tabs.querySelectorAll |
| [`nwPagesBuildTree`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L2117) | pages | arr.sort, byId.has, children.entries, children.get, children.has, children.set, roots.push, roots.sort |
| [`sortFn`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L2144) | a, b | String |
| [`nwPagesFormatFilterSummary`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L2156) | p | Array.isArray, parts.join, parts.push |
| [`nwPagesRenderList`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L2173) | – | Array.isArray, document.createElement, document.getElementById, listEl.appendChild, nwPagesBuildTree, render |
| [`render`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L2202) | arr, depth | Math.max, String, children.get, children.has, document.createElement, listEl.appendChild, nwPagesFormatFilterSummary, render, row.addEventListener, row.appendChild |
| [`nwSetSelectOptions`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L2250) | selectEl, options, selectedValues, includeEmpty, emptyLabel | document.createElement, selectEl.appendChild |
| [`nwGetMultiSelectValues`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L2277) | selectEl | Array.from |
| [`nwPagesGetSelectedPage`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L2287) | – | – |
| [`nwPagesGetNewSeed`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L2297) | – | – |
| [`nwPagesBuildEditorModel`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L2309) | – | nwNormalizePageObject, nwPagesGetNewSeed, nwPagesGetSelectedPage |
| [`nwPagesRenderEditor`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L2324) | – | Array.from, Array.isArray, String, common.forEach, document.createElement, document.getElementById, funcs.map, funcs.sort, iconEl.appendChild, nwPagesBuildEditorModel, nwPagesBuildTree, nwSetSelectOptions, nwShcState.config.functions.slice, nwShcState.config.rooms.slice (weitere in der Quelle) |
| [`walk`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L2366) | arr, depth | children.get, children.has, flat.push, walk |
| [`nwPagesSlugify`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L2436) | s | String |
| [`nwPagesSetEditorStatus`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L2451) | msg, kind | document.getElementById, el.classList.add, el.classList.remove |
| [`nwPagesSaveFromEditor`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L2466) | – | Array.isArray, JSON.stringify, Number.isFinite, String, byId.get, document.getElementById, next.map, next.push, next.sort, nwGetMultiSelectValues, nwMarkDirty, nwNormalizePageObject, nwPagesSetEditorStatus, nwRenderPagesEditor (weitere in der Quelle) |
| [`nwPagesDeleteSelected`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L2574) | – | Array.isArray, JSON.stringify, confirm, document.getElementById, nwMarkDirty, nwPagesSetEditorStatus, nwRenderPagesEditor, nwShcState.pagesDraft.slice |
| [`nwSetBackupStatus`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L2607) | msg, type | document.getElementById, el.classList.add, el.classList.remove |
| [`nwBackupExport`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L2621) | – | JSON.stringify, fetch, nwDownloadTextFile, nwSetBackupStatus, res.json |
| [`nwBackupImport`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L2637) | file, mode | JSON.parse, JSON.stringify, fetch, file.text, nwSetBackupStatus, res.json |
| [`nwBackupRestoreFromUserdata`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L2658) | – | JSON.stringify, confirm, fetch, nwSetBackupStatus, res.json, res2.json |
| [`nwExportSmartHomeConfig`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L2681) | – | JSON.stringify, nwDownloadTextFile, nwNormalizeImportedSmartHomeConfig, nwSetStatus |
| [`nwImportSmartHomeConfigFromFile`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L2703) | file | JSON.parse, JSON.stringify, confirm, console.error, file.text, nwMarkDirty, nwNormalizeDeviceOrder, nwNormalizeImportedSmartHomeConfig, nwNormalizeRoomFunctionOrder, nwRenderAll, nwRenderPagesEditor, nwSaveSmartHomeConfig, nwSetStatus, text.trim |
| [`nwSaveSmartHomeConfig`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L2767) | – | Array.isArray, JSON.stringify, confirm, console.error, fetch, nwMarkDirty, nwParsePagesJson, nwRenderAll, nwRenderPagesEditor, nwRunValidationNow, nwSetStatus, res.json |
| [`nwReloadSmartHomeConfig`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L2841) | – | Array.isArray, JSON.stringify, Object.assign, cfg.devices.map, cfg.floors.map, cfg.functions.map, cfg.pages.map, cfg.rooms.map, cfg.scenes.map, nwFetchSmartHomeConfig, nwMarkDirty, nwNormalizeDeviceOrder, nwNormalizeFloorOrder, nwNormalizeRoomFunctionOrder (weitere in der Quelle) |
| [`nwRenderAll`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L2882) | – | nwRenderDevicesEditor, nwRenderFunctionsEditor, nwRenderRoomsEditor, nwRenderShcfgShell, nwScheduleValidation |
| [`nwShcfgSetMode`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L2905) | mode, opts | allowed.includes, localStorage.setItem, nwEnsureShcfgUiState, nwRenderShcfgShell, setTimeout |
| [`nwShcfgEnterBuilder`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L2935) | opts | devices.filter, nwEnsureShcfgUiState, nwShcfgSetMode |
| [`nwInitShcfgShellUi`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L2968) | – | backupBack.addEventListener, backupOpenClassic.addEventListener, btnBackup.addEventListener, btnBuilding.addEventListener, btnClassic.addEventListener, btnDetect.addEventListener, btnLogic.addEventListener, btnScenes.addEventListener, btnTimers.addEventListener, builderBack.addEventListener, builderOpenClassic.addEventListener, builderSave.addEventListener, clocksAdd.addEventListener, detectBack.addEventListener (weitere in der Quelle) |
| [`nwShcfgApplyBuilderSizing`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L3084) | – | Math.floor, Math.max, builder.querySelector, document.getElementById, layout.getBoundingClientRect, layout.style.setProperty |
| [`nwRenderShcfgShell`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L3102) | – | document.getElementById, nwEnsureShcfgUiState, nwLoadTypeDetectorSuggestions, nwRenderShcfgBuilder, nwRenderShcfgDetector, nwRenderShcfgScenes, nwRenderShcfgTimers, setTimeout |
| [`nwSetDetectorStatus`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L3158) | text, kind | byId, el.classList.add, el.classList.remove |
| [`nwLoadTypeDetectorSuggestions`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L3173) | force | Array.isArray, Date.now, Number, Number.isFinite, String, fetch, nwSetDetectorStatus, res.json |
| [`nwShcfgGetDetectorAssignment`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L3211) | suggestionId | Array.isArray |
| [`nwShcfgCloneJson`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L3231) | value, fallback | JSON.parse, JSON.stringify |
| [`nwShcfgDetectorMatchesFilter`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L3244) | suggestion, term | Array.isArray, String, parts.join, parts.push, states.forEach |
| [`nwImportTypeDetectedSuggestion`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L3270) | suggestionId | Array.isArray, Object.assign, String, det.results.find, nwAddDeviceFromTemplate, nwMarkDirty, nwNormalizeDeviceOrder, nwRenderAll, nwSetDetectorStatus, nwShcfgCloneJson, nwShcfgGetDetectorAssignment |
| [`nwRenderShcfgDetector`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L3334) | – | Array.isArray, Number, Number.isFinite, byId, cfg.functions.slice, cfg.rooms.slice, det.results.slice, document.createElement, filterInput.addEventListener, mkBadge, results.filter, root.appendChild, showConfigured.addEventListener, showConfiguredLabel.appendChild (weitere in der Quelle) |
| [`mkBadge`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L3403) | cls, text | document.createElement |
| [`mkSelect`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L3552) | labelText, items, value, onChange | document.createElement, items.forEach, sel.addEventListener, sel.appendChild, wrap.appendChild |
| [`nwSetTimersStatus`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L3621) | text, kind | byId, el.classList.add, el.classList.remove |
| [`nwShcfgCollectTimerDevicesFromConfig`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L3640) | cfg | Array.isArray, Object.create, String, idSet.add, idSet.has, out.push |
| [`nwLoadTimersModule`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L3715) | force | Array.isArray, Object.assign, String, console.warn, devices.filter, fetch, nwFetchSmartHomeConfig, nwNormalizeImportedSmartHomeConfig, nwSetTimersStatus, nwShcfgCollectTimerDevicesFromConfig, tRes.json |
| [`nwSaveTimersModule`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L3771) | – | Array.isArray, JSON.stringify, Object.assign, Object.keys, String, console.warn, fetch, nwLoadTimersModule, nwSetTimersStatus, res.json |
| [`nwRenderShcfgTimers`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L3832) | – | Array.isArray, Object.assign, String, b.addEventListener, byId, card.appendChild, cb.addEventListener, ctrl.appendChild, del.addEventListener, devices.slice, document.createElement, grid.appendChild, inp.addEventListener, lab.appendChild (weitere in der Quelle) |
| [`markDirty`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L3917) | – | Object.assign, nwSetTimersStatus |
| [`sync`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L3985) | – | Array.from, timer.days.sort |
| [`mk`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L4028) | labelText, value, onChange | document.createElement, inp.addEventListener, wrap.appendChild |
| [`nwSetLogicClocksStatus`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L4118) | text, kind | byId, el.classList.add, el.classList.remove |
| [`nwAddLogicClock`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L4133) | – | Date.now, Math.random, nwSetLogicClocksStatus |
| [`nwLoadLogicClocksModule`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L4158) | force | Array.isArray, Object.assign, String, console.warn, fetch, nwSetLogicClocksStatus, res.json |
| [`nwSaveLogicClocksModule`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L4194) | – | Array.isArray, JSON.stringify, Object.assign, Object.keys, String, console.warn, fetch, nwLoadLogicClocksModule, nwSetLogicClocksStatus, res.json |
| [`nwRenderShcfgLogicClocks`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L4246) | – | Array.isArray, Object.keys, b.addEventListener, byId, card.appendChild, cb.addEventListener, ctrl.appendChild, del.addEventListener, document.createElement, grid.appendChild, inp.addEventListener, lab.appendChild, mk, nwLoadLogicClocksModule (weitere in der Quelle) |
| [`markDirty`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L4288) | – | nwSetLogicClocksStatus |
| [`sync`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L4401) | – | Array.from, clock.days.sort |
| [`mk`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L4443) | labelText, value, onChange | document.createElement, inp.addEventListener, wrap.appendChild |
| [`nwSetScenesStatus`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L4503) | text, kind | byId, el.classList.add, el.classList.remove |
| [`nwAddScene`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L4518) | – | Array.isArray, Date.now, Math.random, cfg.scenes.push, nwSetScenesStatus |
| [`nwRenderShcfgScenes`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L4544) | – | Array.isArray, addBtn.addEventListener, btnRow.appendChild, byId, card.appendChild, cb.addEventListener, ctrl.appendChild, del.addEventListener, document.createElement, inp.addEventListener, lab.appendChild, renderActionRow, root.appendChild, row.appendChild (weitere in der Quelle) |
| [`markDirty`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L4590) | – | nwSetScenesStatus |
| [`renderActionRow`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L4758) | a, idx | String, boolSel.addEventListener, boolSel.appendChild, coverSel.addEventListener, coverSel.appendChild, delBtn.addEventListener, devSel.addEventListener, devSel.appendChild, document.createElement, input.addEventListener, kindSel.addEventListener, kindSel.appendChild, playerSel.addEventListener, playerSel.appendChild (weitere in der Quelle) |
| [`nwShcfgDragSet`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L5057) | e, payload | JSON.stringify, dt.setData, nwEnsureShcfgUiState |
| [`nwShcfgDragClear`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L5082) | – | nwEnsureShcfgUiState |
| [`nwShcfgDragGet`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L5097) | e | JSON.parse, dt.getData, nwEnsureShcfgUiState, raw.slice, raw.startsWith |
| [`nwRenderShcfgBuilder`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L5131) | – | document.getElementById, document.querySelectorAll, nwEnsureShcfgUiState, nwRenderShcfgBuilderLib, nwRenderShcfgBuilderProps, nwRenderShcfgBuilderWorkspace, tabBtns.forEach |
| [`nwShcfgLibGroup`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L5165) | titleText, items, { forceOpen = false } | details.addEventListener, details.appendChild, document.createElement, items.forEach, nwEnsureShcfgUiState, sumLeft.appendChild, summary.appendChild |
| [`nwShcfgLibItem`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L5224) | { icon, name, meta, payload } | document.createElement, item.addEventListener, item.appendChild, left.appendChild, nwShcRenderIconPreview, textWrap.appendChild |
| [`nwRenderShcfgBuilderLib`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L5328) | container | container.appendChild, document.createElement, input.addEventListener, nwShcfgLibGroup, nwShcfgLibItem, renderGroups, row.appendChild, searchWrap.appendChild |
| [`renderGroups`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L5409) | – | String, byGroup.get, byGroup.has, byGroup.keys, byGroup.set, document.createElement, filterRaw.trim, groups.forEach, groupsWrap.appendChild, hay.includes, nwShcfgGetRoomById, nwShcfgGetTargetRoomIdForAdd, preferredOrder.filter |
| [`nwShcfgAddRoom`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L5486) | { name = 'Neuer Raum', floorId = null, icon = 'generic' } | nwEnsureUniqueId, nwMarkDirty, nwNormalizeRoomOrder, nwPagesSlugify, rooms.push |
| [`nwShcfgAddFloor`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L5544) | presetId | floors.push, floors.reduce, nwEnsureUniqueId, nwMarkDirty, nwNormalizeFloorOrder, nwPagesSlugify |
| [`nwShcfgMoveRoomToFloor`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L5572) | roomId, floorId | nwMarkDirty, nwNormalizeRoomOrder, rooms.find |
| [`nwRenderShcfgBuilderWorkspace`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L5598) | container | addFloorBtn.addEventListener, backBtn.addEventListener, container.appendChild, container.classList.remove, crumbs.appendChild, devices.filter, document.createElement, drop.addEventListener, floorList.forEach, floorList.push, floors.map, left.appendChild, nwRenderShcfgBuilderWorkspace, right.appendChild (weitere in der Quelle) |
| [`nwShcfgCreateSelect`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L6088) | options, value, onChange | document.createElement, options.forEach, sel.addEventListener |
| [`nwShcfgCreateTextInput`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L6108) | value, onChange, { placeholder = '' } | document.createElement, input.addEventListener |
| [`nwShcfgNullIfEmpty`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L6124) | v | – |
| [`nwRenderShcfgBuilderProps`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L6134) | container | Array.isArray, Number, Number.isFinite, Object.prototype.hasOwnProperty.call, String, addBehavior, addDp, addNumber, addSelect, addText, cfg.floors.slice, container.appendChild, del.addEventListener, devices.find (weitere in der Quelle) |
| [`ensureObject`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L6464) | parent, key, defaults | Array.isArray, Object.keys |
| [`addDp`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L6471) | label, owner, key | container.appendChild, nwCreateDpInput |
| [`addNumber`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L6477) | label, owner, key, fallback, min, max, step | Number, Number.isFinite, String, container.appendChild, document.createElement, input.addEventListener, nwCreateFieldRow |
| [`addSelect`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L6497) | label, owner, key, options, fallback | String, container.appendChild, nwCreateFieldRow, nwShcfgCreateSelect |
| [`addText`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L6503) | label, owner, key, placeholder | container.appendChild, nwCreateFieldRow, nwShcfgCreateTextInput |
| [`addBehavior`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L6509) | – | addNumber |
| [`nwSanitizeId`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L6689) | raw | String, s.replace |
| [`nwEnsureUniqueId`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L6706) | items, desiredId, skipItem | Array.isArray, exists, nwSanitizeId |
| [`exists`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L6714) | candidate | list.some |
| [`nwNormalizeRoomFunctionOrder`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L6733) | – | normalize, nwNormalizeRoomOrder |
| [`normalize`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L6741) | arr, labelFn | Array.isArray, arr.slice, out.forEach, source.map, withIdx.map, withIdx.sort |
| [`nwMoveItem`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L6770) | arr, index, dir | Array.isArray, arr.forEach, arr.splice |
| [`nwMoveItemTo`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L6786) | arr, fromIndex, toIndex | Array.isArray, Math.trunc, Number.isFinite, arr.forEach, arr.splice |
| [`nwReplaceRoomIdInDevices`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L6811) | oldId, newId | Array.isArray, nwShcState.config.devices.forEach |
| [`nwReplaceFunctionIdInDevices`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L6823) | oldId, newId | Array.isArray, nwShcState.config.devices.forEach |
| [`nwAddRoom`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L6835) | – | Array.isArray, nwEnsureUniqueId, nwMarkDirty, nwRenderAll, rooms.push |
| [`nwAddFunction`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L6851) | – | Array.isArray, funcs.push, nwEnsureUniqueId, nwMarkDirty, nwRenderAll |
| [`nwRenderRoomsEditor`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L6867) | rooms | Array.isArray, arr.forEach, document.getElementById |
| [`nwRenderFunctionsEditor`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L6999) | functions | Array.isArray, arr.forEach, document.getElementById |
| [`nwNormalizeFloorOrder`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L7136) | – | Array.isArray, floors.forEach, floors.sort |
| [`nwNormalizeRoomOrder`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L7166) | – | Array.isArray, buckets.get, buckets.has, buckets.set, list.forEach, rooms.forEach |
| [`nwNormalizeDeviceOrder`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L7209) | – | Array.isArray, arr.forEach |
| [`nwEnsureUniqueDeviceId`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L7222) | devices, desiredId | Array.isArray, String, base.trim, list.some |
| [`nwAddDevice`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L7241) | – | Array.isArray, devices.push, nwEnsureUniqueDeviceId, nwMarkDirty, nwNormalizeDeviceOrder, nwRenderAll |
| [`nwAddDeviceFromTemplate`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L7279) | templateId, opts | Array.isArray, NW_SHCFG_BUILDER_DEVICE_TEMPLATES.find, Object.assign, Object.prototype.hasOwnProperty.call, String, devices.push, document.getElementById, nwEnsureUniqueDeviceId, nwMarkDirty, nwNormalizeDeviceOrder, nwRenderAll, nwSetStatus, nwShcfgDefaultSensorUiFromTemplate, nwShcfgNullIfEmpty |
| [`nwCreateFieldRow`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L7457) | labelText, controlElem | ctlWrap.appendChild, document.createElement, row.appendChild |
| [`nwDpFormatValueShort`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L7482) | val | JSON.stringify, Math.abs, Math.round, Number.isFinite, String, s.slice |
| [`nwDpGetState`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L7509) | dpId | String, encodeURIComponent, fetch, res.json |
| [`nwDpSetState`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L7526) | dpId, val | JSON.stringify, String, fetch, res.json |
| [`nwCreateDpInput`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L7547) | labelText, value, onChange | String, btnPick.addEventListener, btnSet.addEventListener, btnTest.addEventListener, document.createElement, input.addEventListener, labelLower.includes, nwCreateFieldRow, window.NW_AUTH.hasCapability, wrapper.appendChild |
| [`onSelect`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L7575) | id | input.value.trim, nwMarkDirty, onChange |
| [`setBadge`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L7599) | kind, text | badge.classList.add, badge.classList.remove |
| [`nwRenderDevicesEditor`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L7722) | devices, rooms, functions | devices.forEach, document.getElementById, functions.forEach, rooms.forEach |
| [`setCustomVisible`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L8177) | on | – |
| [`syncIconUi`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L8186) | – | String, iconOptions.some, nwShcNormalizeIconName, nwShcRenderIconPreview, setCustomVisible |
| [`renderStations`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L8983) | – | Array.isArray, stations.forEach |
| [`renderPlaylists`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L9079) | – | Array.isArray, playlists.forEach |
| [`nwDpSafeStr`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L9343) | value | String |
| [`nwDpFetchJson`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L9352) | url | fetch, res.json |
| [`nwDpSearch`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L9366) | q | Array.isArray, encodeURIComponent, nwDpFetchJson, nwDpSafeStr |
| [`nwDpTree`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L9377) | prefix | Array.isArray, encodeURIComponent, nwDpFetchJson, nwDpSafeStr |
| [`nwDpParentPrefix`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L9388) | id | nwDpSafeStr, parts.join, parts.pop |
| [`nwDpMetaText`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L9400) | it | String, parts.join, parts.push |
| [`nwCreateDpResultRow`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L9414) | primary, meta, onActivate | document.createElement, nwDpSafeStr, row.addEventListener, row.appendChild |
| [`activate`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L9442) | ev | ev.preventDefault, ev.stopPropagation, onActivate |
| [`nwRenderDpBreadcrumb`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L9465) | prefix, wrap, onNavigate | mkCrumb, mkSep, nwDpSafeStr, wrap.appendChild |
| [`mkCrumb`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L9476) | label, nextPrefix, clickable | btn.addEventListener, document.createElement |
| [`mkSep`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L9502) | – | document.createElement |
| [`nwEnsureDpDialog`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L9525) | – | backdrop.addEventListener, backdrop.appendChild, body.appendChild, btnClose.addEventListener, columns.appendChild, dlg.appendChild, document.body.appendChild, document.createElement, header.appendChild, input.addEventListener, resultsCol.appendChild, rootBtn.addEventListener, searchBtn.addEventListener, searchRow.appendChild (weitere in der Quelle) |
| [`nwSetDpDialogTreeMessage`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L9685) | text, kind | String, nwEnsureDpDialog |
| [`nwSetDpDialogResultsMessage`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L9697) | text, kind | String, nwEnsureDpDialog |
| [`nwDpDialogPick`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L9709) | id | nwCloseDatapointDialog, nwDpDialogCurrent.onSelect, nwDpSafeStr |
| [`nwRenderDpDialogTree`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L9723) | children | Array.isArray, children.forEach, nwCreateDpResultRow, nwEnsureDpDialog, wrap.appendChild |
| [`nwRenderDpDialogResults`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L9774) | list | Array.isArray, list.forEach, nwEnsureDpDialog |
| [`nwRefreshDpDialogTree`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L9801) | – | nwDpTree, nwEnsureDpDialog, nwRenderDpBreadcrumb, nwRenderDpDialogTree, nwSetDpDialogTreeMessage |
| [`nwRunDatapointDialogSearch`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L9825) | – | nwDpSafeStr, nwDpSearch, nwEnsureDpDialog, nwRenderDpDialogResults, nwSetDpDialogResultsMessage |
| [`nwOpenDpDialogPrefix`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L9849) | prefix | nwDpSafeStr, nwEnsureDpDialog, nwRefreshDpDialogTree |
| [`nwOpenDatapointDialog`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L9860) | options | String, nwDpParentPrefix, nwEnsureDpDialog, nwRefreshDpDialogTree, nwRenderDpBreadcrumb, nwRunDatapointDialogSearch, nwSetDpDialogResultsMessage, nwSetDpDialogTreeMessage, setTimeout, state.input.value.trim |
| [`nwCloseDatapointDialog`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L9895) | – | – |
| [`nwAttachToolbarHandlers`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L9909) | – | addDeviceBtn.addEventListener, addFnBtn.addEventListener, addRoomBtn.addEventListener, addTplBtn.addEventListener, backupImportFile.addEventListener, btnBackupExport.addEventListener, btnPagesClear.addEventListener, btnPagesDefault.addEventListener, btnPagesValidate.addEventListener, btnRestoreUserdata.addEventListener, document.getElementById, exportBtn.addEventListener, importBtn.addEventListener, importFile.addEventListener (weitere in der Quelle) |
| [`nwInitSmartHomeConfig`](../../../../../src-ts/runtime-executables/www/smarthome-config.ts#L10253) | – | document.getElementById, fetch, nwAttachToolbarHandlers, nwInitShcfgShellUi, nwReloadSmartHomeConfig |
