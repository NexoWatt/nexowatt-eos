# src-ts/runtime-executables/www/dc-station-display.ts

Stellt die Stationsanzeige mit mehreren Ladepunkten, Status und freigegebenen Bedienaktionen dar.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/www/dc-station-display.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

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
| [`lang`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L133) | – | String, raw.startsWith |
| [`t`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L142) | key | lang |
| [`escapeHtml`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L149) | input | String |
| [`fmtKw`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L154) | w | Math.abs, Number, Number.isFinite |
| [`fmtKwh`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L160) | v | Number, Number.isFinite, n.toFixed |
| [`fmtEur`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L161) | v | Number, Number.isFinite, n.toFixed |
| [`fmtPrice`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L162) | v | Number, Number.isFinite, n.toFixed |
| [`fmtTime`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L163) | ts | Number, Number.isFinite, lang |
| [`fmtDateTime`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L167) | ts | Number, Number.isFinite, fmtTime, lang |
| [`fmtDuration`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L171) | sec | Math.floor, Math.max, Math.round, Number, String |
| [`clamp`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L176) | n, min, max | Math.max, Math.min, Number, Number.isFinite |
| [`safeArray`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L177) | raw | Array.isArray |
| [`getToken`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L178) | – | decodeURIComponent, location.pathname.match |
| [`statusLabel`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L180) | status | String, t |
| [`modeLabel`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L191) | mode | String, t |
| [`tariffStateLabel`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L201) | state | String, t |
| [`addUnique`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L210) | list, entry, key | Object.assign, String, list.push, list.some |
| [`derivePresentationModel`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L217) | payload | String, addUnique, connectors.forEach, decisionLines.map, fmtPrice, modeLabel, safeArray, t, tariffStateLabel, uniqueReasons.slice, warnings.filter, warnings.find, warnings.map |
| [`withPresentationModel`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L306) | payload | Object.assign, derivePresentationModel |
| [`showStatus`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L313) | title, message, cls | escapeHtml |
| [`toast`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L321) | message | String, clearTimeout, document.body.appendChild, document.createElement, document.querySelector, el.classList.add, setTimeout |
| [`fetchJson`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L329) | url, opts | Object.assign, fetch, res.json |
| [`refreshDelay`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L338) | payload | Math.round, Number, Number.isFinite |
| [`scheduleRefresh`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L342) | delay | clamp, clearTimeout, setTimeout |
| [`scheduleHeartbeat`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L343) | delay | clamp, clearTimeout, setTimeout |
| [`refresh`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L348) | – | Date.now, String, encodeURIComponent, fetchJson, getToken, refreshDelay, render, scheduleRefresh, showStatus, t |
| [`heartbeat`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L368) | – | Date.now, JSON.stringify, encodeURIComponent, fetchJson, getToken, lang |
| [`sendCommand`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L378) | lp, action, mode, extra | Date.now, JSON.stringify, Object.assign, encodeURIComponent, fetchJson, render, setTimeout, t, toast |
| [`languageSwitchHtml`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L395) | station | – |
| [`bannerHtml`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L400) | payload, opts | banners.join, banners.push, escapeHtml, fmtTime, t |
| [`statusChip`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L409) | icon, title, value, tone, detail | escapeHtml |
| [`renderStatusStrip`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L413) | payload | Number, String, fmtKw, fmtPrice, modeLabel, safeArray, statusChip, statusLabel, t, tariffStateLabel |
| [`summaryCard`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L432) | icon, title, value, detail, tone, extra | escapeHtml |
| [`renderSummary`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L436) | payload | Math.round, Number, String, clamp, fmtEur, fmtKw, fmtKwh, modeLabel, safeArray, statusLabel, summaryCard, t |
| [`connectorLayout`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L453) | connectors | Math.ceil, Math.max |
| [`isActiveValue`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L462) | current, expected | String |
| [`controlButton`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L463) | lp, action, mode, label, active, disabled, extraAttrs | escapeHtml |
| [`renderLpControls`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L467) | c, station, disabled | Math.round, Number, String, controlButton, escapeHtml, isActiveValue, t |
| [`renderConnector`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L490) | c, station | Array.isArray, Math.round, Number, Number.isFinite, String, busyKey.startsWith, escapeHtml, fmtEur, fmtKw, fmtKwh, fmtPrice, lp.toUpperCase, modeLabel, modes.includes (weitere in der Quelle) |
| [`renderDecisionPanel`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L512) | payload | escapeHtml, lines.map, safeArray, t |
| [`renderWarningsPanel`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L518) | payload, opts | escapeHtml, safeArray, t, warnings.map, warnings.unshift |
| [`render`](../../../../../src-ts/runtime-executables/www/dc-station-display.ts#L525) | payload, opts | Array.isArray, String, app.querySelectorAll, app.style.setProperty, bannerHtml, connectorLayout, connectors.map, escapeHtml, fmtDateTime, languageSwitchHtml, renderDecisionPanel, renderStatusStrip, renderSummary, renderWarningsPanel (weitere in der Quelle) |
