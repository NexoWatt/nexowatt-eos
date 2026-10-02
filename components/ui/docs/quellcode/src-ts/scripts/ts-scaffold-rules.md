# src-ts/scripts/ts-scaffold-rules.ts

Prüft Struktur und Konsistenz der TypeScript-Migrations- und Build-Grundlagen.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../src-ts/scripts/ts-scaffold-rules.ts) · [Gesamtübersicht](../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `node:fs` | Node-Bordmittel oder externe Paketabhängigkeit. |
| `node:path` | Node-Bordmittel oder externe Paketabhängigkeit. |

**Direkt importiert von:**

Kein direkter Import innerhalb des erfassten Quellbereichs. Mögliche HTML-, Adapter-, Build- oder dynamische Einstiege sind separat zu prüfen.

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`ok`](../../../../src-ts/scripts/ts-scaffold-rules.ts#L116) | – | – |
| [`error`](../../../../src-ts/scripts/ts-scaffold-rules.ts#L127) | message | – |
| [`fileExists`](../../../../src-ts/scripts/ts-scaffold-rules.ts#L138) | rootDir, relativeFile | fs.existsSync, path.join |
| [`requireScaffoldFiles`](../../../../src-ts/scripts/ts-scaffold-rules.ts#L152) | rootDir, files | error, fileExists, ok, results.push |
| [`requirePackageScripts`](../../../../src-ts/scripts/ts-scaffold-rules.ts#L171) | pkg, scriptNames | error, ok, results.push |
| [`requirePublishCheckStartsWithTypeSafety`](../../../../src-ts/scripts/ts-scaffold-rules.ts#L197) | rootDir, pkg | Array.isArray, JSON.parse, String, commands.filter, error, fs.readFileSync, ok, path.join, plan.commands.map |
| [`requireTsconfigIncludesSrcTs`](../../../../src-ts/scripts/ts-scaffold-rules.ts#L252) | tsconfig | Array.isArray, error, include.includes, ok, tsconfig.include.map |
| [`requireBuildConfigDeclarationsOnly`](../../../../src-ts/scripts/ts-scaffold-rules.ts#L268) | buildConfig | error, ok, results.push |
| [`collectSrcTsFiles`](../../../../src-ts/scripts/ts-scaffold-rules.ts#L283) | rootDir | files.sort, fs.existsSync, path.join, walk |
| [`walk`](../../../../src-ts/scripts/ts-scaffold-rules.ts#L288) | dir | files.push, fs.readdirSync, full.endsWith, path.join, stat.isDirectory, stat.isFile, walk |
| [`requireMinimumSrcTsFiles`](../../../../src-ts/scripts/ts-scaffold-rules.ts#L311) | srcTsFiles, minimum | error, ok |
| [`requireNoRuntimeImportsFromSrcTs`](../../../../src-ts/scripts/ts-scaffold-rules.ts#L326) | rootDir, srcTsFiles | error, fs.readFileSync, ok, path.relative, results.push, runtimeImportPattern.test |
| [`collectTsScaffoldRuleErrors`](../../../../src-ts/scripts/ts-scaffold-rules.ts#L349) | rootDir, pkg, tsconfig, buildConfig | collectSrcTsFiles, requireBuildConfigDeclarationsOnly, requireMinimumSrcTsFiles, requireNoRuntimeImportsFromSrcTs, requirePackageScripts, requirePublishCheckStartsWithTypeSafety, requireScaffoldFiles, requireTsconfigIncludesSrcTs, results.filter |
