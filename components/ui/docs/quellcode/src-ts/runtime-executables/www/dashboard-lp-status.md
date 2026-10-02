# src-ts/runtime-executables/www/dashboard-lp-status.ts

Übersetzt Ladepunkt-Diagnosen und Betriebszustände in die Kundenanzeige des Dashboards.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/www/dashboard-lp-status.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

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
| [`locale`](../../../../../src-ts/runtime-executables/www/dashboard-lp-status.ts#L202) | – | String, tag.startsWith |
| [`localeTag`](../../../../../src-ts/runtime-executables/www/dashboard-lp-status.ts#L208) | – | String, locale |
| [`text`](../../../../../src-ts/runtime-executables/www/dashboard-lp-status.ts#L213) | key, values | Object.entries, String, locale, output.replaceAll |
| [`pluralSuffix`](../../../../../src-ts/runtime-executables/www/dashboard-lp-status.ts#L220) | count | locale |
| [`record`](../../../../../src-ts/runtime-executables/www/dashboard-lp-status.ts#L225) | value | Array.isArray, JSON.parse, value.trim |
| [`bool`](../../../../../src-ts/runtime-executables/www/dashboard-lp-status.ts#L236) | value, fallback | – |
| [`number`](../../../../../src-ts/runtime-executables/www/dashboard-lp-status.ts#L240) | value, fallback | Number, Number.isFinite |
| [`string`](../../../../../src-ts/runtime-executables/www/dashboard-lp-status.ts#L245) | value, fallback | String |
| [`power`](../../../../../src-ts/runtime-executables/www/dashboard-lp-status.ts#L249) | value | Math.max, Math.round, localeTag, number |
| [`mode`](../../../../../src-ts/runtime-executables/www/dashboard-lp-status.ts#L255) | value | locale, string |
| [`time`](../../../../../src-ts/runtime-executables/www/dashboard-lp-status.ts#L264) | value | localeTag, number |
| [`reasonText`](../../../../../src-ts/runtime-executables/www/dashboard-lp-status.ts#L274) | rawReason, fallbackKey | raw.replace, raw.toUpperCase, readable.charAt, readable.slice, string, text |
| [`limiterKey`](../../../../../src-ts/runtime-executables/www/dashboard-lp-status.ts#L295) | limiter, reason | string, token.includes |
| [`rawValue`](../../../../../src-ts/runtime-executables/www/dashboard-lp-status.ts#L316) | row, key, fallback | Object.prototype.hasOwnProperty.call |
| [`collect`](../../../../../src-ts/runtime-executables/www/dashboard-lp-status.ts#L320) | getter | Array.from, Array.isArray, Math.max, Object.keys, auditBySafe.get, auditBySafe.keys, auditBySafe.set, bool, directSafes.add, getter, number, rawValue, read, record (weitere in der Quelle) |
| [`read`](../../../../../src-ts/runtime-executables/www/dashboard-lp-status.ts#L340) | key, fallback | getter |
| [`build`](../../../../../src-ts/runtime-executables/www/dashboard-lp-status.ts#L414) | getter | Math.max, collect, getter, items.filter, number, pluralSuffix, record, rows.map, string, text |
| [`render`](../../../../../src-ts/runtime-executables/www/dashboard-lp-status.ts#L534) | getter, evcsAvailable | block.classList.toggle, build, copy.append, detailsLink.classList.toggle, detailsLink.removeAttribute, detailsLink.setAttribute, document.createElement, document.getElementById, document.querySelector, dot.setAttribute, list.appendChild, panel?.classList.toggle, power, row.append (weitere in der Quelle) |
| [`build`](../../../../../src-ts/runtime-executables/www/dashboard-lp-status.ts#L594) | values | build |
