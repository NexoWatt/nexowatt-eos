# src-ts/runtime-executables/www/forecast-settings.ts

Verbindet die Kunden-Prognoseeinstellungen mit Standort, PV-Flächen und der zugehörigen Backend-Konfiguration.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/www/forecast-settings.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

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
| [`initForecastSettings`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L21) | – | Date.now, document.addEventListener, setup, window.addEventListener |
| [`byId`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L33) | id | document.getElementById |
| [`stateEntry`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L34) | key | – |
| [`hasState`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L39) | key | Object.prototype.hasOwnProperty.call, stateEntry |
| [`stateValue`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L43) | key, fallback | Object.prototype.hasOwnProperty.call, stateEntry |
| [`firstStateValue`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L47) | keys, fallback | hasState, stateValue |
| [`firstNonEmptyTextState`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L51) | keys, fallback | String, hasState, stateValue |
| [`firstFiniteStateValue`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L59) | keys, fallback | Number, Number.isFinite, hasState, stateValue |
| [`asBoolean`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L67) | value, fallback | String |
| [`finite`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L75) | value, fallback | Number, Number.isFinite, value.trim |
| [`clamp`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L80) | value, min, max, fallback | Math.max, Math.min, finite |
| [`round`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L81) | value, digits | Number, value.toFixed |
| [`nearestOrientation`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L94) | value | ORIENTATIONS.reduce, clamp |
| [`distance`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L96) | candidate | Math.abs |
| [`normalizeRow`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L100) | value, index | Math.round, String, clamp, nearestOrientation, round |
| [`parseRows`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L109) | raw | Array.isArray, JSON.parse |
| [`inputOrState`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L121) | id, key, fallback | String, byId, stateValue |
| [`legacyRow`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L127) | – | inputOrState, normalizeRow |
| [`createNumberInput`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L136) | field, value, min, max, step, label | String, document.createElement, input.setAttribute |
| [`createCell`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L148) | label, control | cell.appendChild, document.createElement |
| [`collectRows`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L161) | – | Array.from, body.querySelectorAll, byId |
| [`field`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L165) | name | row.querySelector |
| [`updateRemoveButtons`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L177) | – | Array.from, body.querySelectorAll, body?.closest, buttons.forEach, byId, editor?.classList.toggle |
| [`syncEditorLayout`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L197) | – | byId, editor.classList.toggle |
| [`setLegacyField`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L206) | id, value | String, byId |
| [`persistRows`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L211) | – | JSON.stringify, byId, collectRows, hidden.dispatchEvent, normalizeRow, rows.filter, setLegacyField, validation.classList.toggle |
| [`markRefreshPending`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L234) | – | byId |
| [`queuePersist`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L244) | – | markRefreshPending, window.clearTimeout, window.setTimeout |
| [`renderRows`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L250) | rows | body.replaceChildren, byId, normalizeRow, syncEditorLayout, updateRemoveButtons, values.forEach |
| [`sourceRows`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L313) | – | JSON.stringify, String, byId, legacyRow, parseRows, stateValue |
| [`hydrateEditor`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L324) | force | byId, editor.contains, renderRows, sourceRows |
| [`setupArrayEditor`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L334) | – | add.addEventListener, byId, editorResizeObserver.observe, hydrateEditor, syncEditorLayout, window.addEventListener |
| [`formatEnergyKwh`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L359) | value | Math.abs, Number, Number.isFinite, kwh.toFixed |
| [`formatAge`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L366) | ageValue, updatedAtValue | Date.now, Math.max, Math.round, Number, Number.isFinite, String |
| [`sourceLabel`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L379) | value | String, source.includes |
| [`friendlyMessage`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L388) | value | String, message.includes, raw.toLowerCase |
| [`normalizeSourceMode`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L412) | value | String |
| [`updateVisibility`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L420) | – | byId, fallback.classList.toggle, fields.classList.remove, fields.classList.toggle, fields.setAttribute, normalizeSourceMode, stateValue |
| [`updateStatus`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L439) | – | Date.now, Math.abs, Math.max, Math.round, Number, Number.isFinite, String, asBoolean, byId, effectiveSourceRaw.includes, energyValue, error.classList.toggle, firstFiniteStateValue, firstNonEmptyTextState (weitere in der Quelle) |
| [`energyValue`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L562) | suffix | firstStateValue, stateValue |
| [`setup`](../../../../../src-ts/runtime-executables/www/forecast-settings.ts#L607) | – | byId, enabled.addEventListener, setupArrayEditor, source.addEventListener, updateStatus, updateVisibility, window.setInterval |
