# NexoWatt UI 0.8.59 – Release-Schutz / Regression Safety Gate

## Zweck

Version 0.8.59 ergänzt ein App-Center-Sicherheitsgate direkt vor dem Speichern.

Der Schutz verhindert, dass ein UI-/Reiter-/Hydration-Fehler bestehende Kernkonfigurationen leer überschreibt.

## Geschützte Bereiche

```text
Speicherfarm
Ladepunkte / EVCS
DC-Station Display
NL P1/DSMR
Mesh/Microgrid Knoten
Mesh/Microgrid Peers
```

## Verhalten

Wenn die aktuelle Konfiguration Daten enthält, der neue Save-Patch aber leer wäre, stellt das Safety-Gate die vorherigen Daten wieder her.

Beispiel:

```text
storageFarm.storages vorher: 2 Speicher
storageFarm.storages im Save-Patch: leer
→ Speicherliste wird aus currentConfig wiederhergestellt
→ Save wird mit Schutz-Report markiert
```

## Neue interne Markierungen

```text
_releaseSafetyGate
__appCenterRegressionSafetyGate
```

Diese Felder dokumentieren, was beim Speichern geschützt wurde.

## Wichtig

Das ist keine Regelung und keine Hardwarefunktion.

```text
keine WR-Steuerung
keine Speichersteuerung
keine Ladepunktsteuerung
keine Änderung an Export Guard
keine Änderung an Mesh/Microgrid-Regelung
```

Es ist nur ein Schutz gegen versehentliches Leerschreiben im App-Center.

## Bewusstes Löschen

Bewusstes Löschen ganzer Kernbereiche soll später über eine eigene Löschfunktion mit Bestätigung erfolgen. Ein normales Speichern darf vorhandene produktive Kernbereiche nicht mehr versehentlich löschen.
