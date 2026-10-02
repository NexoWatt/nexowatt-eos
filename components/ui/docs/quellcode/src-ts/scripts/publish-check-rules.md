# src-ts/scripts/publish-check-rules.ts

Formuliert prüfbare Paket-/Metadatenregeln für die Veröffentlichung des Adapters.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../src-ts/scripts/publish-check-rules.ts) · [Gesamtübersicht](../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

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
| [`requirePackageName`](../../../../src-ts/scripts/publish-check-rules.ts#L99) | pkg | String, name.startsWith, name.toLowerCase |
| [`requireNodeEngine22`](../../../../src-ts/scripts/publish-check-rules.ts#L116) | pkg | String |
| [`requireNoInstalledFrom`](../../../../src-ts/scripts/publish-check-rules.ts#L132) | pkg | – |
| [`requireIoCommonBasics`](../../../../src-ts/scripts/publish-check-rules.ts#L148) | common | Array.isArray, Number, results.push |
| [`requireNewsLimit`](../../../../src-ts/scripts/publish-check-rules.ts#L183) | common, maxEntries | Object.keys |
| [`requireNoTopLevelIoNewsOrVersion`](../../../../src-ts/scripts/publish-check-rules.ts#L197) | io | results.push |
| [`collectPublishRuleErrors`](../../../../src-ts/scripts/publish-check-rules.ts#L215) | pkg, io | requireIoCommonBasics, requireNewsLimit, requireNoInstalledFrom, requireNoTopLevelIoNewsOrVersion, requireNodeEngine22, requirePackageName, results.filter |
