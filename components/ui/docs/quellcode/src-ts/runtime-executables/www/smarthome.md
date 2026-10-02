# src-ts/runtime-executables/www/smarthome.ts

Stellt die konfigurierte SmartHome-Oberfläche dar und übermittelt freigegebene Geräte-/Szenenaktionen.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/www/smarthome.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

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
| [`nwLsReadJson`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L97) | key, fallback | JSON.parse, localStorage.getItem |
| [`nwLsWriteJson`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L112) | key, value | JSON.stringify, localStorage.setItem |
| [`nwGetAllPlayerZones`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L125) | – | Array.isArray, nwAllDevices.filter |
| [`nwLoadAudioZoneSelection`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L136) | – | Array.isArray, ids.filter, nwLsReadJson |
| [`nwSaveAudioZoneSelection`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L146) | ids | Array.isArray, ids.filter, nwLsWriteJson |
| [`nwGetSelectedAudioZones`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L156) | primaryId | nwGetAllPlayerZones, nwLoadAudioZoneSelection, sel.includes, sel.unshift |
| [`nwSetSelectedAudioZones`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L169) | ids, primaryId | Array.isArray, arr.includes, arr.unshift, ids.filter, nwSaveAudioZoneSelection |
| [`nwPlayerFavKey`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L182) | devId, kind | String |
| [`nwLoadPlayerFavs`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L191) | devId, kind | Array.isArray, arr.map, nwLsReadJson, nwPlayerFavKey |
| [`nwSavePlayerFavs`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L201) | devId, kind, favs | Array.isArray, favs.map, nwLsWriteJson, nwPlayerFavKey |
| [`nwTogglePlayerFav`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L211) | devId, kind, value | String, favs.indexOf, favs.push, favs.splice, nwLoadPlayerFavs, nwSavePlayerFavs |
| [`nwMovePlayerFav`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L229) | devId, kind, value, dir | String, favs.indexOf, nwLoadPlayerFavs, nwSavePlayerFavs |
| [`nwPlayerRecentKey`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L248) | devId | String |
| [`nwLoadPlayerRecent`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L257) | devId | Array.isArray, nwLsReadJson, nwPlayerRecentKey |
| [`nwAddPlayerRecent`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L267) | devId, item | Date.now, String, filtered.slice, filtered.unshift, list.filter, nwLoadPlayerRecent, nwLsWriteJson, nwPlayerRecentKey |
| [`nwGetIconSvg`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L2168) | name, isOn | String |
| [`nwIsEmojiLike`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L2182) | str | String |
| [`nwEscapeHtml`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L2194) | str | String |
| [`nwSafeBadgeText`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L2208) | value | String, s.replace, s.slice |
| [`nwParseDynamicIcon`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L2222) | rawValue | String, lower.startsWith, raw.slice, raw.toLowerCase |
| [`nwDynamicDeviceIconSvg`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L2249) | kind, labelRaw, isOn | nwEscapeHtml, nwSafeBadgeText |
| [`nwStaticIconHtml`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L2302) | iconValue | String, nwDynamicDeviceIconSvg, nwEscapeHtml, nwNormalizeIconName, nwParseDynamicIcon |
| [`nwNormalizeIconName`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L2323) | raw | String |
| [`nwLooksLikeTemperatureDevice`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L2462) | dev | String, unit.includes |
| [`nwNormalizeTemperatureUnit`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L2495) | dev, unit | String, nwLooksLikeTemperatureDevice, raw.toLowerCase |
| [`nwGuessIconName`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L2511) | dev | String, hay.match, nwLooksLikeTemperatureDevice |
| [`nwGetIconSpec`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L2551) | dev | String, nwGuessIconName, nwIsEmojiLike, nwNormalizeIconName, nwParseDynamicIcon |
| [`nwGetAccentColor`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L2581) | dev, iconName | String, fn.includes, iconKey.slice, iconKey.startsWith |
| [`nwGetQualityStatus`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L2619) | dev | String |
| [`nwGetQualityLabel`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L2625) | dev | nwGetQualityStatus |
| [`nwHasPrimaryState`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L2635) | dev | String, nwGetQualityStatus |
| [`nwIsMomentaryDevice`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L2648) | dev | String |
| [`nwIsOn`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L2659) | dev | String, nwHasPrimaryState |
| [`nwSupportsTimer`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L2699) | dev | String |
| [`nwGetStateText`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L2713) | dev | Math.round, String, nwClampNumber, nwGetQualityLabel, nwGetQualityStatus, nwHasPrimaryState, nwIsMomentaryDevice, nwNormalizeTemperatureUnit, st.climateError.trim, st.currentTemp.toFixed, st.setpoint.toFixed, st.value.toFixed |
| [`nwGetTileHint`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L2800) | dev | String, nwHasWriteAccess |
| [`nwFormatBigValue`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L2821) | dev | Number.isNaN, String, formatUnit, st.currentTemp.toFixed, st.setpoint.toFixed, st.value.toFixed |
| [`formatUnit`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L2831) | unit | nwNormalizeTemperatureUnit |
| [`nwGetTileSize`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L2888) | dev | – |
| [`nwHasWriteAccess`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L2900) | dev | String |
| [`nwCreateIconElement`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L2943) | dev, isOn, iconSpec, accent | String, document.createElement, name.startsWith, nwDynamicDeviceIconSvg, wrap.appendChild, wrap.classList.add |
| [`nwFetchDevices`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3005) | – | Array.isArray, fetch, res.json |
| [`nwToggleDevice`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3018) | id, value | JSON.stringify, fetch, res.json |
| [`nwSetLevel`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3037) | id, level | JSON.stringify, fetch, res.json |
| [`nwSetColor`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3054) | id, colorOrPayload | Array.isArray, JSON.stringify, fetch, res.json |
| [`nwCoverAction`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3074) | id, action, value | JSON.stringify, fetch, res.json |
| [`nwPlayerAction`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3092) | id, action, value | JSON.stringify, fetch, res.json |
| [`nwPlayerActionMulti`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3114) | primaryId, action, value | Array.from, nwGetSelectedAudioZones, nwPlayerAction |
| [`nwSetRtrSetpoint`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3133) | id, setpoint | JSON.stringify, fetch, res.json |
| [`nwClimateAction`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3146) | id, action, value | JSON.stringify, fetch, res.json |
| [`nwSetSmartHomeValue`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3159) | id, value | JSON.stringify, fetch, res.json |
| [`nwSaveDeviceTimer`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3177) | deviceId, timer | JSON.stringify, fetch, res.json |
| [`nwDeleteDeviceTimer`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3194) | deviceId | JSON.stringify, fetch, res.json |
| [`nwAdjustRtrSetpoint`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3211) | dev, delta | nwReloadDevices, nwSetRtrSetpoint |
| [`nwClear`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3234) | el | el.removeChild |
| [`nwSortBy`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3244) | a, b | String |
| [`nwGetDeviceOrder`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3257) | dev | Number.isFinite |
| [`nwTypeLabel`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3304) | type | String, t.charAt, t.slice |
| [`nwCompareDevices`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3315) | a, b | nwGetDeviceOrder, nwIsFavorite, nwSortBy, nwTypeLabel |
| [`nwGroupDevicesByType`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3347) | devices | Array.from, groups.sort, map.entries |
| [`nwFormatNumberDE`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3370) | value, precision | Number, Number.isFinite, v.toFixed |
| [`nwComputeRoomSummary`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3382) | roomId, allDevices | Array.isArray, Math.round, Number, Number.isFinite, String, allDevices.filter, devs.forEach, nwFormatNumberDE, nwNormalizeId, parts.join, parts.push, pick |
| [`pick`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3439) | arr | arr.sort |
| [`nwApplyFilters`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3466) | devices | Array.isArray, devices.slice, out.filter |
| [`nwGetAllFunctions`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3489) | devices | Array.from |
| [`nwGuessIconForFunctionLabel`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3503) | label | String, s.includes |
| [`nwRenderViewChips`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3521) | – | document.getElementById, mkChip, nwClear |
| [`mkChip`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3531) | label, active, onClick | btn.addEventListener, document.createElement, wrap.appendChild |
| [`nwRenderTextSizeChips`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3560) | – | document.getElementById, mkChip, nwClear, nwNormTextSize |
| [`mkChip`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3570) | label, active, onClick | btn.addEventListener, document.createElement, wrap.appendChild |
| [`nwRenderFunctionChips`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3610) | devices | allFns.forEach, document.getElementById, mkChip, nwClear, nwGetAllFunctions |
| [`mkChip`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3632) | label, active, onClick, extraClass, disabled, title, iconName | btn.addEventListener, btn.querySelector, document.createElement, nwGetIconSvg, wrap.appendChild |
| [`nwGroupByRoom`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3695) | devices | Array.from, keys.map, keys.sort, map.keys |
| [`nwGroupByFunction`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3766) | devices | Array.from, fns.map, map.keys |
| [`nwShowEmptyState`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3783) | show, ctx | document.getElementById, empty.classList.remove |
| [`nwEnsureShToast`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3833) | – | document.body.appendChild, document.createElement, el.setAttribute |
| [`nwHideShToast`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3848) | – | clearTimeout, nwShToastEl.classList.remove |
| [`nwShowShToastForTile`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3862) | dev | String, clearTimeout, document.createElement, nwClear, nwEnsureShToast, nwGetStateText, parts.join, parts.push, setTimeout, toast.appendChild, toast.classList.add |
| [`nwCreateTile`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L3900) | dev, opts | Date.now, Math.max, Math.min, Math.round, Number.isFinite, String, actions.appendChild, addMiniBtn, addMiniToggle, arc.appendChild, big.appendChild, btn.addEventListener, btnMinus.addEventListener, btnPlus.addEventListener (weitere in der Quelle) |
| [`stop`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L4206) | ev | ev.stopPropagation |
| [`stop`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L4312) | ev | ev.stopPropagation |
| [`addMiniToggle`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L4350) | – | document.createElement, footer.appendChild, t.addEventListener, t.setAttribute |
| [`addMiniBtn`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L4386) | label, title, onClick | b.addEventListener, document.createElement, footer.appendChild |
| [`mk`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L4466) | label, action, mapped, allowed | b.addEventListener, document.createElement |
| [`lpCancel`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L4512) | – | clearTimeout |
| [`nwLockBodyScroll`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L4644) | – | Math.max, document.body.classList.add |
| [`nwUnlockBodyScroll`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L4672) | – | document.body.classList.remove, window.scrollTo |
| [`nwEnsurePopover`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L4698) | – | document.addEventListener, document.body.appendChild, document.createElement, nwPopoverBackdropEl.addEventListener, nwPopoverEl.addEventListener, window.addEventListener |
| [`close`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L4728) | – | nwClosePopover |
| [`nwClosePopover`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L4760) | – | nwPopoverBackdropEl.classList.add, nwPopoverEl.classList.add, nwUnlockBodyScroll |
| [`nwOpenDevicePopover`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L4776) | dev, anchorEl | nwBuildPopoverContent, nwClosePopover, nwEnsurePopover, nwLockBodyScroll, nwPopoverBackdropEl.classList.remove, nwPopoverEl.classList.contains, nwPopoverEl.classList.remove, requestAnimationFrame |
| [`nwOpenTimerPopover`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L4811) | dev, anchorEl | nwBuildTimerPopoverContent, nwClosePopover, nwEnsurePopover, nwPopoverEl.classList.contains, nwPopoverEl.classList.remove, requestAnimationFrame |
| [`nwBuildTimerPopoverContent`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L4837) | dev | Array.isArray, Math.max, Math.min, Math.round, Number.isNaN, String, b.addEventListener, body.appendChild, btn.addEventListener, closeBtn.addEventListener, delBtn.addEventListener, document.createElement, footer.appendChild, grid.appendChild (weitere in der Quelle) |
| [`fmtNext`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L4906) | – | Date.now, Number, Number.isFinite, String, d.getHours, d.getMinutes |
| [`updateHeaderState`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L4932) | – | fmtNext |
| [`rebuildDays`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L4994) | – | Array.from, days.sort |
| [`mkTime`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5036) | lbl, val, onChange | document.createElement, inp.addEventListener, wrap.appendChild |
| [`nwPositionPopover`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5151) | anchorEl | Math.max, Math.min, Math.round, anchorEl.getBoundingClientRect, nwPopoverEl.classList.contains |
| [`nwClampNumber`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5191) | v, min, max | Math.max, Math.min, Number, Number.isFinite |
| [`nwRoundToStep`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5202) | v, step | Math.round, Number, Number.isFinite |
| [`nwUpdateRangeFill`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5218) | rangeEl | Math.max, Math.min, Number, Number.isFinite, clamped.toFixed, rangeEl.style.setProperty |
| [`nwLoadJsonLS`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5254) | key, defVal | JSON.parse, localStorage.getItem |
| [`nwSaveJsonLS`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5271) | key, obj | JSON.stringify, localStorage.setItem |
| [`nwLoadFavoriteOverrides`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5282) | – | Object.keys, nwLoadJsonLS |
| [`nwSaveFavoriteOverrides`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5300) | map | nwSaveJsonLS |
| [`nwGetInstallerFavorite`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5309) | dev | – |
| [`nwIsFavorite`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5318) | dev | Object.prototype.hasOwnProperty.call, String, nwGetInstallerFavorite |
| [`nwToggleFavorite`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5333) | dev | Object.prototype.hasOwnProperty.call, String, nwGetInstallerFavorite, nwIsFavorite, nwSaveFavoriteOverrides |
| [`nwLoadNumberLS`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5355) | key, defVal | Number, Number.isFinite, localStorage.getItem |
| [`nwSaveNumberLS`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5371) | key, val | String, localStorage.setItem |
| [`nwCreateStatusBadge`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5382) | – | document.createElement, el.setAttribute |
| [`nwSetStatusBadge`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5395) | el, kind, text | el.classList.add, el.classList.remove |
| [`nwLoadBoolLS`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5414) | key, defVal | localStorage.getItem |
| [`nwSaveBoolLS`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5431) | key, val | localStorage.setItem |
| [`nwLoadViewMode`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5442) | defMode | String, localStorage.getItem |
| [`nwSaveViewMode`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5456) | mode | localStorage.setItem |
| [`nwNormTextSize`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5467) | v | String |
| [`nwLoadTextSize`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5480) | defSize | localStorage.getItem, nwNormTextSize |
| [`nwSaveTextSize`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5493) | size | localStorage.setItem, nwNormTextSize |
| [`nwApplyTextSizeClass`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5504) | size | document.getElementById, nwNormTextSize, root.classList.add, root.classList.remove |
| [`nwCreateLivePreviewSender`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5523) | sendFn, intervalMs | – |
| [`schedule`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5536) | – | Date.now, Math.max, clearTimeout, setTimeout |
| [`trigger`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5584) | val, force | schedule |
| [`nwCreateSmartHomeRangeControl`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5596) | options | Math.max, Math.min, Number, Number.isFinite, String, document.createElement, format, header.appendChild, nwClampNumber, nwCreateStatusBadge, nwUpdateRangeFill, right.appendChild, slider.addEventListener, wrap.appendChild |
| [`nwBuildPopoverContent`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5678) | dev | String, body.appendChild, close.addEventListener, document.createElement, hdr.appendChild, left.appendChild, nwCreateBlindPopover, nwCreateColorPopover, nwCreateIconElement, nwCreateLevelPopover, nwCreatePlayerPopover, nwCreateRtrPopover, nwCreateValuePopover, nwGetAccentColor (weitere in der Quelle) |
| [`nwCreateLevelPopover`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5767) | dev, canWrite, opts | Math.round, Number.isFinite, String, btnRow.appendChild, document.createElement, liveBtn.addEventListener, liveBtn.setAttribute, minus.addEventListener, nwClampNumber, nwCreateLivePreviewSender, nwCreateSmartHomeRangeControl, nwCreateStatusBadge, nwCreateValueGauge, nwHasPrimaryState (weitere in der Quelle) |
| [`clearStatusTimer`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5813) | – | clearTimeout |
| [`flashStatus`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5825) | kind, text, ms | clearStatusTimer, nwSetStatusBadge, setTimeout |
| [`setBusy`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5841) | – | flashStatus |
| [`setOk`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5848) | – | flashStatus |
| [`setErr`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5855) | – | flashStatus |
| [`commitLevel`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5900) | nextVal, opts | Math.round, String, dial.nwSetValue, nwClampNumber, nwReloadDevices, nwSetLevel, nwUpdateRangeFill, setBusy, setErr, setOk |
| [`formatter`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5933) | val | Math.round |
| [`minmaxFormatter`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5934) | val | Math.round |
| [`onInput`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5935) | val | Math.round, String, liveSender.trigger, nwUpdateRangeFill |
| [`onCommit`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L5941) | val | commitLevel |
| [`syncStepBtns`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6011) | – | stepChoices.forEach |
| [`updateHint`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6089) | – | – |
| [`onCommit`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6118) | value | nwReloadDevices, nwSetColor |
| [`nwCreateColorPopover`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6161) | dev, canWrite | Math.round, String, btnRow.appendChild, clamp01, current.toUpperCase, document.createElement, liveBtn.addEventListener, liveBtn.setAttribute, normHex, nwCreateLivePreviewSender, nwCreateSmartHomeRangeControl, nwCreateStatusBadge, nwHasPrimaryState, nwIsOn (weitere in der Quelle) |
| [`normHex`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6181) | val | String, s.slice, s.startsWith, s.toLowerCase |
| [`clamp01`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6207) | n | Math.max, Math.min, Number |
| [`clamp`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6214) | n, lo, hi | Math.max, Math.min, Number |
| [`hexToRgb`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6221) | hex | h.slice, normHex, parseInt, s.slice |
| [`rgbToHex`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6236) | r, g, b | Math.round, clamp |
| [`rgbToHsv`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6248) | r, g, b | Math.max, Math.min, clamp01 |
| [`hsvToRgb`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6273) | h, s, v | Math.abs, Math.round, Number, clamp01 |
| [`setHsvFromHex`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6301) | hex | hexToRgb, rgbToHsv |
| [`clearStatusTimer`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6349) | – | clearTimeout |
| [`flashStatus`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6361) | kind, text, ms | clearStatusTimer, nwSetStatusBadge, setTimeout |
| [`setBusy`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6377) | – | flashStatus |
| [`setOk`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6384) | – | flashStatus |
| [`setErr`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6391) | – | flashStatus |
| [`hsvToHex`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6444) | h, s, vVal | hsvToRgb, rgbToHex |
| [`updateValueSliderGradient`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6454) | – | hsvToHex, valueSlider.style.setProperty |
| [`updateWheelMarker`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6465) | – | Math.cos, Math.sin, clamp01 |
| [`setUi`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6483) | hex | Math.round, String, clamp01, h.toUpperCase, normHex, setHsvFromHex, updateValueSliderGradient, updateWheelMarker |
| [`drawWheel`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6499) | – | Math.atan2, Math.max, Math.min, Math.round, Math.sqrt, ctx.clearRect, ctx.createImageData, ctx.putImageData, ctx.setTransform, hsvToRgb, wheelCanvas.getContext |
| [`commitColor`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6556) | hex, opts | normHex, nwReloadDevices, nwSetColor, setBusy, setErr, setOk, setUi |
| [`updateFromWheelEvent`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6588) | ev, opts | Math.atan2, Math.sqrt, String, clamp01, hsvToHex, liveSender.trigger, setUi, wheelWrap.getBoundingClientRect |
| [`endWheel`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6634) | ev | commitColor, ev.preventDefault, updateFromWheelEvent |
| [`updateHint`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6700) | – | – |
| [`onCommit`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6726) | value | nwReloadDevices, nwSetColor |
| [`onCommit`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6744) | value | nwReloadDevices, nwSetColor |
| [`onCommit`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6762) | value | nwReloadDevices, nwSetColor |
| [`nwCreateBlindPopover`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6806) | dev, canWrite | Math.round, Number.isFinite, String, activeProtection.join, activeProtection.push, controls.appendChild, document.createElement, liveBtn.addEventListener, liveBtn.setAttribute, minus.addEventListener, mk, nwClampNumber, nwCreateLivePreviewSender, nwCreateSmartHomeRangeControl (weitere in der Quelle) |
| [`clearStatusTimer`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6873) | – | clearTimeout |
| [`flashStatus`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6885) | kind, text, ms | clearStatusTimer, nwSetStatusBadge, setTimeout |
| [`setBusy`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6901) | – | flashStatus |
| [`setOk`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6908) | – | flashStatus |
| [`setErr`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6915) | – | flashStatus |
| [`commitPos`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6959) | nextVal, opts | Math.round, String, dial.nwSetValue, nwClampNumber, nwReloadDevices, nwSetLevel, nwUpdateRangeFill, setBusy, setErr, setOk |
| [`formatter`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6992) | val | Math.round |
| [`minmaxFormatter`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6993) | val | Math.round |
| [`onInput`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L6995) | val | Math.round, String, liveSender.trigger, nwUpdateRangeFill |
| [`onCommit`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L7001) | val | commitPos |
| [`syncStepBtns`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L7071) | – | stepChoices.forEach |
| [`updateHint`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L7149) | – | – |
| [`onCommit`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L7191) | value | nwCoverAction, nwReloadDevices |
| [`mk`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L7214) | label, action | b.addEventListener, document.createElement |
| [`nwGetRtrRange`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L7255) | dev | – |
| [`nwCreateRtrPopover`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L7267) | dev, canWrite | Math.round, String, actions.appendChild, appendRawCommand, button.addEventListener, buttons.appendChild, controls.appendChild, document.createElement, nwCreateSmartHomeRangeControl, nwCreateStatusBadge, nwFormatNumberDE, nwGetRtrRange, off.addEventListener, on.addEventListener (weitere in der Quelle) |
| [`onCommit`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L7320) | value | nwReloadDevices, nwSetRtrSetpoint |
| [`setStatus`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L7329) | kind, text | nwSetStatusBadge |
| [`sendAction`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L7333) | action, value | nwClimateAction, nwReloadDevices, setStatus |
| [`appendRawCommand`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L7372) | labelText, action, dpId, currentValue, disabledBySafety | String, actions.appendChild, controls.appendChild, document.createElement, row.appendChild, send.addEventListener |
| [`nwCreateValueGauge`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L7470) | opts | Array.isArray, Math.cos, Math.random, Math.sin, Number, Number.isFinite, String, active.classList.add, active.setAttribute, base.classList.add, base.setAttribute, btnMinus.addEventListener, btnPlus.addEventListener, btnRow.appendChild (weitere in der Quelle) |
| [`setValue`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L7627) | v, silent, markKnown | Math.cos, Math.sin, active.setAttribute, formatter, knob.setAttribute, nwClampNumber, nwRoundToStep, onInput, wrap.classList.toggle, x.toFixed, y.toFixed |
| [`commit`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L7648) | – | onCommit |
| [`stop`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L7667) | ev | ev.stopPropagation |
| [`pickFromClient`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L7706) | clientX, clientY | Math.atan2, setValue, svg.getBoundingClientRect |
| [`onMouseDown`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L7732) | ev | document.addEventListener, ev.preventDefault, ev.stopPropagation, pickFromClient |
| [`move`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L7744) | e | pickFromClient |
| [`up`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L7757) | – | commit, document.removeEventListener |
| [`onTouchStart`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L7781) | ev | document.addEventListener, ev.preventDefault, ev.stopPropagation, pickFromClient |
| [`move`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L7800) | e | pickFromClient |
| [`end`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L7810) | – | commit, document.removeEventListener |
| [`nwCreateThermostatGauge`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L7839) | opts | Math.cos, Math.max, Math.min, Math.random, Math.round, Math.sin, Number, Number.isFinite, String, active.classList.add, active.setAttribute, base.classList.add, base.setAttribute, btnMinus.addEventListener (weitere in der Quelle) |
| [`mkStop`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L7896) | off, col | document.createElementNS, s.setAttribute |
| [`setValue`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L8030) | v | Math.cos, Math.sin, active.setAttribute, knob.setAttribute, nwClampNumber, nwFormatNumberDE, nwRoundToStep, x.toFixed, y.toFixed |
| [`commit`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L8063) | – | onCommit |
| [`stop`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L8082) | ev | ev.stopPropagation |
| [`pickFromClient`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L8125) | clientX, clientY | Math.atan2, setValue, svg.getBoundingClientRect |
| [`onMouseDown`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L8155) | ev | document.addEventListener, ev.preventDefault, ev.stopPropagation, pickFromClient |
| [`move`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L8175) | e | pickFromClient |
| [`up`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L8182) | – | commit, document.removeEventListener |
| [`onTouchStart`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L8207) | ev | document.addEventListener, ev.preventDefault, ev.stopPropagation, pickFromClient |
| [`move`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L8229) | e | pickFromClient |
| [`end`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L8239) | – | commit, document.removeEventListener |
| [`nwCreateValuePopover`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L8267) | dev, canWrite | Number, Number.isFinite, String, actions.appendChild, document.createElement, nwCreateStatusBadge, row.appendChild, send.addEventListener, wrap.appendChild |
| [`nwCreatePlayerPopover`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L8358) | dev, canWrite | Array.isArray, Math.max, Math.round, Number, Number.isFinite, String, appendBooleanCommand, appendRawOrBooleanCommand, controls.appendChild, document.createElement, favBtn.addEventListener, filters.appendChild, head.appendChild, lib.appendChild (weitere in der Quelle) |
| [`renderZones`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L8455) | – | allIds.every, nwClear, nwGetSelectedAudioZones, partyBtn.classList.toggle, soloBtn.classList.toggle, zones.forEach, zones.map |
| [`setStatus`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L8505) | kind, text | nwSetStatusBadge |
| [`runPlayerAction`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L8506) | action, value, refreshDelay | nwPlayerActionMulti, nwRefreshDevicesSoon, setStatus |
| [`mkBtn`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L8523) | label, text, action, enabled, extraClass | b.addEventListener, b.setAttribute, document.createElement |
| [`appendBooleanCommand`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L8563) | labelText, action, stateValue, readId, writeId, onText, offText | actions.appendChild, document.createElement, explicitToggles.appendChild, off.addEventListener, on.addEventListener, row.appendChild |
| [`onCommit`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L8662) | value | runPlayerAction |
| [`appendRawOrBooleanCommand`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L8666) | labelText, action, stateValue, dpId | String, actions.appendChild, button.addEventListener, document.createElement, row.appendChild, send.addEventListener, wrap.appendChild |
| [`mkTab`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L8790) | kind, label | b.addEventListener, document.createElement |
| [`getItems`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L8867) | – | – |
| [`renderRecent`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L8891) | – | document.createElement, nwClear, nwLoadPlayerRecent, recent.slice, recentWrap.appendChild |
| [`renderList`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L8940) | – | String, document.createElement, getItems, items.forEach, list.appendChild, nwClear, nwLoadPlayerFavs, shown.forEach |
| [`matchesQuery`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L8962) | it | String |
| [`render`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L9078) | – | favBtn.classList.toggle, renderList, renderRecent, tabPlaylists.classList.toggle, tabStations.classList.toggle |
| [`nwCreateHalfDial`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L9100) | opts | Number, Number.isFinite, active.setAttribute, base.setAttribute, document.createElement, document.createElementNS, knob.setAttribute, nwClampNumber, nwFormatNumberDE, nwRoundToStep, setValue, svg.addEventListener, svg.appendChild, svg.setAttribute (weitere in der Quelle) |
| [`setValue`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L9178) | v | Math.cos, Math.sin, active.setAttribute, knob.setAttribute, nwClampNumber, nwFormatNumberDE, nwRoundToStep, x.toFixed, y.toFixed |
| [`posToValue`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L9208) | ev | Math.atan2, Math.max, Math.min, Number.isFinite, svg.getBoundingClientRect |
| [`onDown`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L9241) | ev | ev.preventDefault, ev.stopPropagation, posToValue, setValue, svg.setPointerCapture |
| [`onMove`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L9262) | ev | ev.preventDefault, ev.stopPropagation, posToValue, setValue |
| [`onUp`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L9282) | ev | ev.preventDefault, ev.stopPropagation, onCommit, posToValue, setValue, svg.releasePointerCapture |
| [`nwRenderRooms`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L9323) | devices | Array.from, document.getElementById, floorKeys.forEach, floorKeys.sort, floorMap.keys, nwClear, nwGroupByRoom, roomGroups.forEach |
| [`renderRoomSection`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L9369) | g | String, arr.forEach, arr.sort, document.createElement, header.appendChild, nwComputeRoomSummary, nwGroupDevicesByType, nwStaticIconHtml, section.appendChild, title.querySelector, typeGroups.forEach |
| [`nwComputeFunctionSummary`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L9484) | funcName, funcDevices | Array.isArray, String, devs.forEach |
| [`nwRenderFunctions`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L9506) | devices | document.getElementById, groups.forEach, nwClear, nwGroupByFunction |
| [`nwFindFloorPageId`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L9579) | floorId | Array.isArray, nwNormalizeId, pages.find, pages.some |
| [`nwFindRoomPageId`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L9595) | roomId | Array.isArray, nwNormalizeId, pages.find, pages.some |
| [`nwRenderHome`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L9609) | devices | Array.isArray, all.filter, all.some, arr.forEach, cfg.floors.slice, cfg.rooms.slice, devices.slice, document.createElement, document.getElementById, favSec.appendChild, favs.slice, floorSec.appendChild, floorTiles.forEach, floorTiles.push (weitere in der Quelle) |
| [`sortByOrderName`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L9683) | a, b | Number.isFinite, String |
| [`go`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L9803) | – | nwActivatePage, nwFindFloorPageId |
| [`nwNormalizeId`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L9840) | s | String |
| [`nwBuildMetaFromConfig`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L9849) | cfg | Array.isArray, floors.forEach, funcs.forEach, rooms.forEach |
| [`nwBuildDefaultPagesFromConfig`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L9891) | cfg | Array.isArray, nwNormalizeId, pages.push, roomsByFloor.get, roomsByFloor.has, roomsByFloor.set, roomsSorted.forEach, roomsSorted.map, sortedFloors.forEach, unassignedRooms.push |
| [`nwIsHomePage`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10076) | page | String |
| [`nwIsLegacyFlatRoomPages`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10090) | pages, cfg | Array.isArray, arr.filter, arr.some, nwNormalizeId, roomIdSet.has, rooms.map, rooms.some, usedRoomIds.add, usedRoomIds.has |
| [`nwGetPagesFromConfig`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10133) | cfg | Array.isArray, nwBuildDefaultPagesFromConfig, nwIsLegacyFlatRoomPages |
| [`nwSetSidebarOpen`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10172) | open | document.getElementById, sidebar.classList.toggle |
| [`nwInitSidebarUi`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10187) | – | btn.addEventListener, document.addEventListener, document.getElementById, overlay.addEventListener, window.addEventListener |
| [`nwUpdatePageTitle`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10228) | – | Array.isArray, String, byId.get, chain.unshift, document.getElementById, pages.find, pages.map |
| [`nwCloseSidebar`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10281) | – | nwSetSidebarOpen |
| [`nwLoadExpandedIdsFromLs`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10290) | – | Array.isArray, JSON.parse, arr.filter, localStorage.getItem, nwBuildPageTree, nwSaveExpandedIdsToLs, rootWithChildren.map, rootWithChildren.some, roots.filter |
| [`nwSaveExpandedIdsToLs`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10332) | – | Array.from, JSON.stringify, localStorage.setItem |
| [`nwEnsureAncestorsExpanded`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10345) | pageId | byId.get, nwPageState.expandedIds.add, nwSaveExpandedIdsToLs |
| [`nwToggleNavExpanded`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10365) | pageId | nwLoadExpandedIdsFromLs, nwPageState.expandedIds.add, nwPageState.expandedIds.delete, nwPageState.expandedIds.has, nwRenderSidebarNav, nwSaveExpandedIdsToLs |
| [`nwResolvePageFilters`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10379) | page | Array.isArray, byId.get, chain.unshift, p.funcIds.slice, p.roomIds.slice, p.types.slice |
| [`nwIsFloorPage`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10410) | page | id.startsWith |
| [`nwGetFloorIdFromPage`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10420) | page | id.slice, id.startsWith |
| [`nwFilterDevicesForPage`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10432) | allDevices, page | Array.isArray, allDevices.slice, eff.funcIds.map, eff.roomIds.map, eff.types.map, nwGetFloorIdFromPage, nwIsFloorPage, nwResolvePageFilters, out.filter |
| [`nwGetDevicesForPage`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10477) | page | nwFilterDevicesForPage |
| [`nwUpdatePageCounts`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10486) | – | nwGetDevicesForPage |
| [`nwBuildPageTree`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10500) | pages | arr.sort, byId.has, children.entries, children.get, children.has, children.set, roots.push, roots.sort |
| [`sortFn`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10527) | a, b | String |
| [`nwRenderSidebarNav`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10539) | – | document.getElementById, nwBuildPageTree, nwLoadExpandedIdsFromLs, nwUpdatePageCounts, renderList |
| [`renderList`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10564) | list, depth | Math.max, String, btn.addEventListener, btn.appendChild, caret.addEventListener, children.get, children.has, document.createElement, el.appendChild, nwIsHomePage, nwPageState.expandedIds.has, nwStaticIconHtml, renderList |
| [`nwActivatePage`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10648) | pageId | Array.isArray, eff.funcIds.slice, eff.roomIds.slice, eff.types.slice, localStorage.setItem, nwApplyFiltersAndRender, nwEnsureAncestorsExpanded, nwNormalizeId, nwPageState.pages.find, nwRenderSidebarNav, nwResolvePageFilters, nwUpdatePageTitle |
| [`nwLoadSmartHomeConfig`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10693) | – | Array.isArray, eff0.funcIds.slice, eff0.roomIds.slice, eff0.types.slice, fetch, localStorage.getItem, nwBuildMetaFromConfig, nwEnsureAncestorsExpanded, nwGetPagesFromConfig, nwInitSidebarUi, nwPageState.pages.find, nwPageState.pages.some, nwRenderSidebarNav, nwResolvePageFilters (weitere in der Quelle) |
| [`nwGetDeviceRoomId`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10750) | dev | nwNormalizeId |
| [`nwGetDeviceFloorId`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10762) | dev | nwGetDeviceRoomId, nwNormalizeId |
| [`nwGetDeviceFuncId`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10777) | dev | nwNormalizeId |
| [`nwApplyPageFilters`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10789) | devices | Array.isArray, devices.slice, nwGetFloorIdFromPage, nwIsFloorPage, out.filter, p.funcIds.map, p.roomIds.map, p.types.map |
| [`nwApplyFiltersAndRender`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10825) | – | nwApplyFilters, nwApplyPageFilters, nwIsHomePage, nwRenderFunctionChips, nwRenderFunctions, nwRenderHome, nwRenderRooms, nwRenderTextSizeChips, nwRenderViewChips, nwShowEmptyState |
| [`nwReloadDevices`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10872) | opts | Array.isArray, JSON.stringify, String, console.error, document.getElementById, nwApplyFiltersAndRender, nwFetchDevices, nwRenderSidebarNav, nwShowEmptyState |
| [`nwRefreshDevicesSoon`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10904) | delayMs | Math.max, Number, clearTimeout, setTimeout |
| [`nwStartAutoRefresh`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10923) | intervalMs | setInterval |
| [`nwStopAutoRefresh`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10937) | – | clearInterval |
| [`nwInitMenu`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10948) | – | document.addEventListener, document.getElementById, menu.addEventListener, menuBtn.addEventListener |
| [`close`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10969) | – | menu.classList.add |
| [`toggle`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10976) | – | menu.classList.toggle |
| [`nwLoadUiConfigFlags`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L10993) | – | Array.isArray, Math.max, Math.round, Number, document.getElementById, fetch, l.classList.toggle, sc.evcsList.filter, sfMenu.classList.toggle, sfTab.classList.toggle, sl.classList.toggle, t.classList.toggle |
| [`nwBootstrap`](../../../../../src-ts/runtime-executables/www/smarthome.ts#L11027) | – | document.addEventListener, document.getElementById, localStorage.removeItem, nwApplyTextSizeClass, nwInitMenu, nwLoadBoolLS, nwLoadFavoriteOverrides, nwLoadSmartHomeConfig, nwLoadTextSize, nwLoadUiConfigFlags, nwLoadViewMode, nwReloadDevices, nwStartAutoRefresh, viewsEl.classList.remove |
