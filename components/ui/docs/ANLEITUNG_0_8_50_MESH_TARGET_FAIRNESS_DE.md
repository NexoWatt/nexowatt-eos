# NexoWatt UI 0.8.50 – Mesh/Microgrid Zielgruppen-Verteilung / Fairness

## Zweck

Version 0.8.50 ergänzt eine Fairness-/Budgetlogik für Mesh/Microgrid-Zielgruppen. Die Funktion verteilt das aktuell geplante neutrale Command-Budget auf Gruppen wie Ladepunkte, Speicher, Verbraucher, Erzeuger oder Energy-Hub-Zonen.

## Wichtige Grenze

Die Fairnesslogik schreibt keine Hardware direkt:

```text
Mesh/Microgrid → neutraler Command-Intent → Local Bridge / Peer / Herstelleradapter
```

Kein direkter OCPP-, Modbus-, MQTT- oder Hersteller-Rohbefehl wird aus dem Mesh/Microgrid-Modul geschrieben.

## Konfiguration

Pfad:

```text
App-Center → Mesh/Microgrid → Zielgruppen-Strategie
```

Beispiel:

```json
[
  {
    "id": "speicher_gruppe",
    "name": "Speicher",
    "type": "storage",
    "memberTypes": ["storage"],
    "priority": 10,
    "strategy": "local_first",
    "maxPowerW": 15000,
    "minSharePercent": 30,
    "fairShareWeight": 2,
    "reservePowerW": 3000
  },
  {
    "id": "lp_gruppe",
    "name": "Ladepunkte",
    "type": "chargepoint",
    "memberTypes": ["chargepoint"],
    "priority": 20,
    "strategy": "local_first",
    "maxPowerW": 22000,
    "minSharePercent": 20,
    "fairShareWeight": 1
  }
]
```

## Parameter

```text
priority          kleine Zahl = hohe Priorität
fairShareWeight   relatives Gewicht für die Budgetverteilung
minSharePercent   Mindestanteil am aktuellen Gruppenbudget
reservePowerW     reservierte Leistung für die Gruppe
maxPowerW         harte Obergrenze der Gruppe
```

## Neue States

```text
meshMicrogrid.targetGroups.fairnessJson
meshMicrogrid.targetGroups.fairnessBudgetsJson
meshMicrogrid.targetGroups.fairnessLimitedCommandsJson
meshMicrogrid.targetGroups.fairnessBlockedCommandsJson
meshMicrogrid.targetGroups.fairnessLimitedCount
meshMicrogrid.targetGroups.fairnessBlockedCount
```

## Betreiberansicht

Die Betreiberansicht zeigt je Zielgruppe:

```text
Fairness-Budget
Restbudget
Zielgruppen-Priorität
gekürzte Commands
blockierte Commands
```

Pfad:

```text
/mesh/microgrid
```
