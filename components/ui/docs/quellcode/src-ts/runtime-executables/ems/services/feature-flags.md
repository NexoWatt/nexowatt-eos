# src-ts/runtime-executables/ems/services/feature-flags.ts

Bestimmt, welche konfigurierten Funktionen im jeweiligen Laufzeitkontext freigegeben sind.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/services/feature-flags.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/module-manager.ts](../../../../../../src-ts/runtime-executables/ems/module-manager.ts)
- [src-ts/runtime-executables/ems/modules/storage-control.ts](../../../../../../src-ts/runtime-executables/ems/modules/storage-control.ts)
- [src-ts/runtime-executables/main.ts](../../../../../../src-ts/runtime-executables/main.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`normalizeEdition`](../../../../../../src-ts/runtime-executables/ems/services/feature-flags.ts#L137) | raw | String |
| [`editionLabel`](../../../../../../src-ts/runtime-executables/ems/services/feature-flags.ts#L144) | edition | normalizeEdition |
| [`productProfileId`](../../../../../../src-ts/runtime-executables/ems/services/feature-flags.ts#L151) | edition | normalizeEdition |
| [`finitePositivePowerW`](../../../../../../src-ts/runtime-executables/ems/services/feature-flags.ts#L158) | raw | Math.min, Math.round, Number, Number.isFinite |
| [`nicePowerStepW`](../../../../../../src-ts/runtime-executables/ems/services/feature-flags.ts#L164) | raw | Math.abs, Math.floor, Math.log10, Math.max, Math.pow, Math.round, candidates.slice, finitePositivePowerW |
| [`storagePerformanceProfile`](../../../../../../src-ts/runtime-executables/ems/services/feature-flags.ts#L196) | edition, ratedPowerW | Math.max, Math.min, Math.round, Object.freeze, finitePositivePowerW, normalizeEdition |
| [`maxStoragePowerW`](../../../../../../src-ts/runtime-executables/ems/services/feature-flags.ts#L273) | edition | storagePerformanceProfile |
| [`allKnownFeatures`](../../../../../../src-ts/runtime-executables/ems/services/feature-flags.ts#L277) | – | – |
| [`buildFeatureMap`](../../../../../../src-ts/runtime-executables/ems/services/feature-flags.ts#L281) | edition | HOME_FEATURES.has, allKnownFeatures, normalizeEdition |
| [`appFeature`](../../../../../../src-ts/runtime-executables/ems/services/feature-flags.ts#L290) | appId | String |
| [`appIdToFeature`](../../../../../../src-ts/runtime-executables/ems/services/feature-flags.ts#L295) | appId | appFeature |
| [`allowsFeature`](../../../../../../src-ts/runtime-executables/ems/services/feature-flags.ts#L299) | edition, feature | HOME_FEATURES.has, String, normalizeEdition |
| [`allowsApp`](../../../../../../src-ts/runtime-executables/ems/services/feature-flags.ts#L306) | edition, appId | HOME_APP_IDS.has, String, allowsFeature, appFeature, normalizeEdition |
| [`maxWallboxes`](../../../../../../src-ts/runtime-executables/ems/services/feature-flags.ts#L314) | edition | normalizeEdition |
| [`maxStorages`](../../../../../../src-ts/runtime-executables/ems/services/feature-flags.ts#L322) | edition | normalizeEdition |
| [`homeIncludedApps`](../../../../../../src-ts/runtime-executables/ems/services/feature-flags.ts#L327) | – | Array.from |
| [`homeIncludedFeatures`](../../../../../../src-ts/runtime-executables/ems/services/feature-flags.ts#L331) | – | Array.from |
| [`eosOnlyFeatures`](../../../../../../src-ts/runtime-executables/ems/services/feature-flags.ts#L335) | – | Array.from |
| [`eosOnlyApps`](../../../../../../src-ts/runtime-executables/ems/services/feature-flags.ts#L339) | – | Object.keys |
