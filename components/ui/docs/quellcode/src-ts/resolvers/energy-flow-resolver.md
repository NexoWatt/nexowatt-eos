# src-ts/resolvers/energy-flow-resolver.ts

Löst verfügbare Energiefluss-Messwerte und erlaubte Ersatzwerte zu einem konsistenten Anlagenbild auf.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../src-ts/resolvers/energy-flow-resolver.ts) · [Gesamtübersicht](../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `../contracts/energy-flow` | [src-ts/contracts/energy-flow.ts](../../../../src-ts/contracts/energy-flow.ts) |
| `../contracts/units` | [src-ts/contracts/units.ts](../../../../src-ts/contracts/units.ts) |
| `../utils/energy-flow` | [src-ts/utils/energy-flow.ts](../../../../src-ts/utils/energy-flow.ts) |
| `../utils/number` | [src-ts/utils/number.ts](../../../../src-ts/utils/number.ts) |

**Direkt importiert von:**

- [src-ts/resolvers/index.ts](../../../../src-ts/resolvers/index.ts)
- [src-ts/utils/energy-flow-resolver.ts](../../../../src-ts/utils/energy-flow-resolver.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`configuredStorageZeroResult`](../../../../src-ts/resolvers/energy-flow-resolver.ts#L80) | sourceText, input | toNumberOrNull |
| [`calculatedStorageFromBalanceInput`](../../../../src-ts/resolvers/energy-flow-resolver.ts#L105) | input | calculateStorageFromBalance, splitSignedStoragePower, toNumberOrNull |
| [`resolveStorageFlow`](../../../../src-ts/resolvers/energy-flow-resolver.ts#L156) | input | calculatedStorageFromBalanceInput, configuredStorageZeroResult, resolveSplitStorageDps, splitSignedStoragePower, toNumberOrNull |
| [`configuredGridZeroResult`](../../../../src-ts/resolvers/energy-flow-resolver.ts#L191) | – | – |
| [`resolveGridFlow`](../../../../src-ts/resolvers/energy-flow-resolver.ts#L211) | input | configuredGridZeroResult, resolveSplitGridDps, splitSignedGridPower, toNumberOrNull |
| [`calculateBuildingLoadFromBalance`](../../../../src-ts/resolvers/energy-flow-resolver.ts#L245) | input | Math.max, positiveWatt, toNumberOrNull |
| [`buildEnergyFlowSnapshot`](../../../../src-ts/resolvers/energy-flow-resolver.ts#L276) | input | Math.max, calculateBuildingLoadFromBalance, positiveWatt, resolveGridFlow, resolveStorageFlow, toNumberOrNull |
| [`createEnergyFlowSnapshot`](../../../../src-ts/resolvers/energy-flow-resolver.ts#L328) | input | buildEnergyFlowSnapshot |
| [`buildEnergyFlowSnapshotFromInputs`](../../../../src-ts/resolvers/energy-flow-resolver.ts#L344) | input | buildEnergyFlowSnapshot |
