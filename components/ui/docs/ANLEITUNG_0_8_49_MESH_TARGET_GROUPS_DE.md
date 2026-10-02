# NexoWatt UI 0.8.49 – Mesh/Microgrid Zielgruppen-Strategie

## Zweck

Version 0.8.49 ergänzt für die EOS-App **Mesh/Microgrid** Zielgruppen. Damit können mehrere Knoten fachlich zusammengefasst werden, z. B. Ladepunkte, Speicher, Verbraucher, Erzeuger, Gebäude oder Nachbarschaftsgruppen.

Die Zielgruppen wirken ausschließlich auf neutrale Mesh-Command-Intents. Das Mesh/Microgrid-Modul schreibt weiterhin keine Hardware direkt.

## App-Center

Pfad:

```text
NexoWatt EMS App-Center
→ Mesh/Microgrid
→ Zielgruppen-Strategie
```

Die Konfiguration erfolgt als JSON im separaten Mesh/Microgrid-Reiter. Der Reiter `Apps` bleibt weiterhin nur App-Katalog.

## Beispielkonfiguration

```json
[
  {
    "id": "lp_group",
    "name": "Ladepunkte Priorität 1",
    "type": "chargepoint",
    "memberNodeIds": ["lp1", "lp2"],
    "priority": 20,
    "maxPowerW": 22000,
    "maxChargeW": 22000,
    "strategy": "local_first"
  },
  {
    "id": "storage_group",
    "name": "Speichergruppe",
    "type": "storage",
    "memberTypes": ["storage"],
    "priority": 10,
    "maxChargeW": 15000,
    "maxDischargeW": 12000,
    "strategy": "grid_last"
  }
]
```

## Prioritätslogik

```text
kleine Zahl = hohe Priorität
hohe Zahl = niedrigere Priorität
```

Beispiel:

```text
Speichergruppe Priorität 10
Ladepunkte Priorität 20
Gebäudelast Priorität 80
```

## Leistungsgrenzen

Zielgruppen können eigene Limits erhalten:

```text
maxPowerW
minPowerW
maxImportW
maxExportW
maxChargeW
maxDischargeW
maxLoadW
maxGenerationW
```

Diese Limits werden zusätzlich zu Knotenlimits und Bridge-Ziel-Limits ausgewertet.

## Neue States

```text
meshMicrogrid.targetGroups.groupsJson
meshMicrogrid.targetGroups.priorityOrderJson
meshMicrogrid.targetGroups.summaryJson
meshMicrogrid.targetGroups.groupCount
meshMicrogrid.targetGroups.activeGroupCount
meshMicrogrid.targetGroups.limitedCommandCount
meshMicrogrid.targetGroups.blockedCommandCount
meshMicrogrid.targetGroups.lastReason
```

## Betreiberansicht

Die Betreiberansicht:

```text
/mesh/microgrid
```

zeigt Zielgruppen, Prioritätsreihenfolge und gruppenbedingte Limit-/Blockiergründe.

## Sicherheitsgrenze

Weiterhin gilt:

```text
kein direkter OCPP-Write
kein direkter Modbus-Write
kein direkter MQTT-Write
kein Hersteller-Rohbefehl aus Mesh/Microgrid
```

Die Ausgabe bleibt:

```text
Mesh/Microgrid → neutraler Command-Intent → Local Bridge / Peer / Herstelleradapter
```
