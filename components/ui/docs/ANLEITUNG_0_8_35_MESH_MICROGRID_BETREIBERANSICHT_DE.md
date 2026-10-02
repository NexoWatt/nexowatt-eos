# NexoWatt UI 0.8.35 – EOS Mesh/Microgrid Betreiberansicht

## Zweck

Version 0.8.35 ergänzt zur separaten EOS-App **Mesh/Microgrid** eine reine Betreiberansicht.

Die Ansicht zeigt:

- Cluster-Name und Modus
- Anzahl der Knoten
- Erzeugung, Last, Überschuss und Restbedarf
- Netzbezug und Einspeisung im Cluster
- lokales Nutzungspotenzial
- Netzlimit-Auslastung
- Knotenliste mit Status, Priorität und Energy Intent
- Local-First-/Grid-Last-Diagnose
- JSON-/CSV-Snapshotexport

## Aufruf

Die Betreiberansicht ist erreichbar über:

```text
http://<NexoWatt-IP>:<Adapter-Port>/mesh/microgrid
```

Beispiel:

```text
http://192.168.10.192:8188/mesh/microgrid
```

Im App-Center gibt es bei der App **EOS Mesh/Microgrid** zusätzlich den Link:

```text
Betreiberansicht / Snapshot-Export öffnen
```

## API

JSON-Snapshot:

```text
/api/mesh/microgrid
```

CSV-Snapshot:

```text
/api/mesh/microgrid.csv
```

## Wichtig

Die Betreiberansicht ist **read-only**:

```text
keine Hardwaresteuerung
keine WR-Setpoints
keine Ladepunkt-Setpoints
keine automatische Microgrid-Regelung
```

Die Anzeige liest denselben `meshMicrogrid.*` Statebaum wie das EMS-Modul. Es entsteht keine zweite Clusterlogik.

## Konfiguration

Die Konfiguration bleibt im Installerbereich:

```text
EMS Apps & Konfiguration → Apps → EOS Mesh/Microgrid
```

Dort werden Cluster und Knoten angelegt. Die Betreiberansicht zeigt nur die daraus resultierenden Werte.

## Lizenz

Die Funktion ist EOS-only.

Home-Kunden sehen die Betreiberansicht nicht als freigegebene Funktion.
