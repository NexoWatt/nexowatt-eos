# src-ts/runtime-executables/www/nw-i18n.ts

Verwaltet Übersetzungstexte und Sprachanwendung im Browser.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/www/nw-i18n.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

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
| [`initNexoWattI18nRuntime`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L20) | global | document.addEventListener, init |
| [`normalizeLanguage`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L54) | raw | SUPPORTED_LANGUAGES.has, String, value.split |
| [`normalizeCountry`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L60) | raw | String |
| [`localeTagForLanguage`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L64) | language | normalizeLanguage |
| [`fetchJson`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L71) | url | fetch, response.json |
| [`loadCatalog`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L80) | language | encodeURIComponent, fetchJson, normalizeLanguage |
| [`compilePatterns`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L96) | catalog | Array.isArray, rows.map |
| [`interpolate`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L109) | value, params | Object.entries, String, text.replace |
| [`t`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L118) | key, params, fallback | Object.prototype.hasOwnProperty.call, interpolate |
| [`translateTrimmedText`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L126) | trimmed | Object.prototype.hasOwnProperty.call, String, normalized.replace, row.regex.test |
| [`translateRawText`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L139) | raw | String, input.match, input.slice, input.trim, translateTrimmedText |
| [`shouldSkipNode`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L149) | node | SKIP_TAGS.has, parent.closest |
| [`translateTextNode`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L157) | node, captureSource | String, renderedTextByNode.set, shouldSkipNode, sourceTextByNode.get, sourceTextByNode.has, sourceTextByNode.set, translateRawText |
| [`getAttrStore`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L171) | map, element | map.get, map.set |
| [`translateAttribute`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L180) | element, attr, captureSource | String, element.closest, element.getAttribute, element.hasAttribute, element.setAttribute, getAttrStore, renderedStore.set, sourceStore.get, sourceStore.has, sourceStore.set, translateRawText |
| [`applyDataI18n`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L193) | element | element.getAttribute, element.setAttribute, t |
| [`applyTranslations`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L210) | root, captureSource | applyDataI18n, document.createTreeWalker, queueMarketProfileApply, scope.querySelectorAll, translateAttribute, translateTextNode, walker.nextNode |
| [`setMarketHidden`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L236) | element, hidden | element.classList.toggle, element.setAttribute |
| [`applyMarketProfile`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L242) | – | document.getElementById, document.querySelectorAll, html.setAttribute |
| [`queueMarketProfileApply`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L276) | – | Promise.resolve |
| [`notifyLanguageChange`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L282) | previousLanguage | broadcastChannel.postMessage, fn, global.dispatchEvent |
| [`activateLocale`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L300) | payload, force | Object.assign, String, applyTranslations, compilePatterns, loadCatalog, localeTagForLanguage, normalizeCountry, normalizeLanguage, notifyLanguageChange, queueMarketProfileApply |
| [`refreshLocale`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L341) | force | Date.now, activateLocale, fetchJson |
| [`startObserver`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L361) | – | observer.observe |
| [`ensureStyle`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L394) | – | document.createElement, document.getElementById |
| [`formatNumber`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L402) | value, options | Number, Number.isFinite, String |
| [`formatDate`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L408) | value, options | Number.isFinite, date.getTime, date.toISOString |
| [`subscribe`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L414) | fn | subscribers.add |
| [`setLanguageForPreview`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L420) | language | activateLocale, normalizeLanguage |
| [`init`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L425) | – | applyTranslations, broadcastChannel.addEventListener, document.addEventListener, ensureStyle, global.setInterval, refreshLocale, startObserver |
| [`language`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L452) | – | – |
| [`localeTag`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L453) | – | – |
| [`country`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L454) | – | – |
| [`countryProfile`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L455) | – | – |
| [`localeSource`](../../../../../src-ts/runtime-executables/www/nw-i18n.ts#L456) | – | – |
