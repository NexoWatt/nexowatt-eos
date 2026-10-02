# NexoWatt UI 0.8.50 – Mesh/Microgrid Zielgruppen-Fairness

## Zweck

Version 0.8.50 erweitert die EOS-App **Mesh/Microgrid** um eine faire Verteilung verfügbarer Leistung über Zielgruppen.

Die Verteilung wirkt nur auf neutrale Mesh/Microgrid-Command-Intents. Das Modul schreibt weiterhin keine Hardware direkt.

## Neue Zielgruppen-Felder

Zielgruppen können jetzt zusätzlich enthalten:

```json
{
  "id": "lp_gruppe",
  "name": "Ladepunkte",
  "type": "chargepoint",
  "priority": 20,
  "maxPowerW": 22000,
  "fairShareWeight": 2,
  "minSharePercent": 20,
  "reservePowerW": 3000
}
```

Bedeutung:

```text
fairShareWeight  = relatives Gewicht bei der Verteilung
minSharePercent  = Mindestanteil am aktuellen Fairness-Budget
reservePowerW    = reservierte Mindestleistung, falls verfügbar
maxPowerW        = harte Gruppenobergrenze
priority         = Reihenfolge innerhalb der Gruppe / Strategie
```

## Betreiberansicht

Pfad:

```text
/mesh/microgrid
```

Die Zielgruppen-Tabelle zeigt jetzt zusätzlich:

```text
Fairness-Budget
verwendete Leistung
Restbudget
gekürzte Commands
blockierte Commands
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

## Sicherheit

Die Fairness-Funktion schreibt keine Geräte direkt.

```text
Mesh/Microgrid → neutraler Command-Intent → CommandGuard → Local Bridge / Tailscale Peer
```

Keine direkten:

```text
OCPP writes
Modbus writes
MQTT writes
Hersteller-Rohbefehle
WR-/Speicher-/Ladepunkt-Setpoints
```
