# src-ts/runtime-executables/www/charging-diagnostics-appcenter.ts

Zeigt Ladeentscheidungen und Auditinformationen im Diagnosebereich des App-Centers an.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/www/charging-diagnostics-appcenter.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

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
| [`byId`](../../../../../src-ts/runtime-executables/www/charging-diagnostics-appcenter.ts#L70) | id | document.getElementById |
| [`getRefs`](../../../../../src-ts/runtime-executables/www/charging-diagnostics-appcenter.ts#L71) | – | byId |
| [`fmtW`](../../../../../src-ts/runtime-executables/www/charging-diagnostics-appcenter.ts#L83) | value | Math.abs, Math.round, Number, Number.isFinite |
| [`fmtTs`](../../../../../src-ts/runtime-executables/www/charging-diagnostics-appcenter.ts#L88) | value | Number, Number.isFinite, d.getTime, d.toLocaleString |
| [`limiterText`](../../../../../src-ts/runtime-executables/www/charging-diagnostics-appcenter.ts#L92) | value | String |
| [`reasonText`](../../../../../src-ts/runtime-executables/www/charging-diagnostics-appcenter.ts#L96) | value | String, raw.indexOf, raw.slice, raw.toUpperCase, upper.includes, upper.startsWith |
| [`kind`](../../../../../src-ts/runtime-executables/www/charging-diagnostics-appcenter.ts#L105) | limiter, severity | String |
| [`setStatus`](../../../../../src-ts/runtime-executables/www/charging-diagnostics-appcenter.ts#L112) | text, statusKind | – |
| [`metric`](../../../../../src-ts/runtime-executables/www/charging-diagnostics-appcenter.ts#L117) | label, value, metricKind | document.createElement, node.append |
| [`selectedSafe`](../../../../../src-ts/runtime-executables/www/charging-diagnostics-appcenter.ts#L124) | – | String |
| [`onlyProblems`](../../../../../src-ts/runtime-executables/www/charging-diagnostics-appcenter.ts#L125) | – | – |
| [`fetchJson`](../../../../../src-ts/runtime-executables/www/charging-diagnostics-appcenter.ts#L127) | url, options | Date.now, String, fetch, response.json, url.includes |
| [`updateFilter`](../../../../../src-ts/runtime-executables/www/charging-diagnostics-appcenter.ts#L136) | snapshot | Array.from, Array.isArray, String, document.createElement, existing.has, refs.filter.appendChild, rows.some, selectedSafe |
| [`render`](../../../../../src-ts/runtime-executables/www/charging-diagnostics-appcenter.ts#L150) | data | Array.isArray, JSON.stringify, Number, String, box.append, card.appendChild, document.createElement, events.slice, fmtTs, fmtW, head.append, kind, limiterText, metric (weitere in der Quelle) |
| [`evcsVisible`](../../../../../src-ts/runtime-executables/www/charging-diagnostics-appcenter.ts#L249) | – | document.getElementById, getComputedStyle |
| [`refresh`](../../../../../src-ts/runtime-executables/www/charging-diagnostics-appcenter.ts#L253) | force | evcsVisible, fetchJson, render, setStatus |
| [`download`](../../../../../src-ts/runtime-executables/www/charging-diagnostics-appcenter.ts#L260) | filename, content, type | URL.createObjectURL, anchor.click, anchor.remove, document.body.appendChild, document.createElement, window.setTimeout |
| [`exportJson`](../../../../../src-ts/runtime-executables/www/charging-diagnostics-appcenter.ts#L265) | – | JSON.stringify, download |
| [`csvValue`](../../../../../src-ts/runtime-executables/www/charging-diagnostics-appcenter.ts#L266) | value | String |
| [`exportCsv`](../../../../../src-ts/runtime-executables/www/charging-diagnostics-appcenter.ts#L267) | – | Array.isArray, download, events.map |
| [`clearEvents`](../../../../../src-ts/runtime-executables/www/charging-diagnostics-appcenter.ts#L276) | – | fetchJson, refresh, setStatus, window.confirm |
| [`setup`](../../../../../src-ts/runtime-executables/www/charging-diagnostics-appcenter.ts#L282) | – | document.addEventListener, getRefs, refs.clear?.addEventListener, refs.exportCsv?.addEventListener, refs.exportJson?.addEventListener, refs.filter?.addEventListener, refs.onlyProblems?.addEventListener, refs.refresh?.addEventListener, window.clearInterval, window.setInterval |
