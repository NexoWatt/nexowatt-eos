# src-ts/runtime-executables/www/nw-shell.ts

Kapselt gemeinsame Browser-Rahmenfunktionen und Seitenintegration.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/www/nw-shell.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

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
| [`ready`](../../../../../src-ts/runtime-executables/www/nw-shell.ts#L61) | fn | document.addEventListener, fn |
| [`nwApplySystemLanguageFromConfig`](../../../../../src-ts/runtime-executables/www/nw-shell.ts#L72) | – | fetch |
| [`nwNormalizeBrandHeader`](../../../../../src-ts/runtime-executables/www/nw-shell.ts#L88) | – | Array.prototype.slice.call, document.querySelectorAll, document.title.replace, pwaTitles.forEach, titles.forEach |
| [`nwSetMenuOpen`](../../../../../src-ts/runtime-executables/www/nw-shell.ts#L127) | open | btn.setAttribute, menu.classList.add, menu.classList.remove |
| [`nwToggleMenu`](../../../../../src-ts/runtime-executables/www/nw-shell.ts#L134) | e | e.preventDefault, e.stopImmediatePropagation, e.stopPropagation, menu.classList.contains, nwSetMenuOpen |
