# NexoWatt UI 0.8.48 – Mesh/Microgrid Leistungsgrenzen je Knoten

## Zweck

Version 0.8.48 ergänzt Leistungsgrenzen je Mesh-Knoten und je Bridge-Ziel. Damit werden neutrale Mesh/Microgrid-Command-Intents vor der Ausgabe geprüft, gekürzt oder blockiert.

Wichtig: Die Funktion schreibt weiterhin keine Hardware direkt.

```text
Mesh/Microgrid Planung
→ CommandGuard
→ Leistungsgrenzen
→ Local Bridge Mapping / Tailscale Peer
→ neutraler JSON-Command-State
→ lokale Bridge / Herstelleradapter
```

## Neue Knotenlimits

Im Reiter:

```text
Mesh/Microgrid → Knoten
```

können pro Knoten gepflegt werden:

```text
minPowerW
maxPowerW
maxImportW
maxExportW
maxChargeW
maxDischargeW
maxLoadW
maxGenerationW
```

`0` bedeutet: kein Limit gesetzt.

## Bridge-Ziel-Limits

Bridge-Zuordnungen unterstützen weiterhin:

```text
minPowerW
maxPowerW
```

Diese werden zusätzlich zum Knotenlimit geprüft.

## Verhalten

Wenn ein Command über einem Limit liegt:

```text
Command wird auf erlaubte Leistung gekürzt
```

Wenn ein Command unter einem Mindestlimit liegt oder kein zulässiger Wert bleibt:

```text
Command wird blockiert
```

## Neue States

```text
meshMicrogrid.limits.nodesJson
meshMicrogrid.limits.bridgeTargetsJson
meshMicrogrid.limits.limitedCommandsJson
meshMicrogrid.limits.blockedCommandsJson
meshMicrogrid.limits.summaryJson
meshMicrogrid.limits.activeLimitCount
meshMicrogrid.limits.limitedCount
meshMicrogrid.limits.blockedCount
meshMicrogrid.limits.lastReason
```

## Betreiberansicht

Die Seite:

```text
/mesh/microgrid
```

zeigt jetzt:

```text
angefragte Leistung
erlaubte Leistung
gekürzt / blockiert
Limitgrund
betroffener Knoten / betroffenes Bridge-Ziel
```

## App-Center-Regel

Die Detailkonfiguration bleibt ausschließlich im Reiter:

```text
Mesh/Microgrid
```

Der Reiter `Apps` bleibt nur App-Katalog.

## Sicherheitsgrenze

Weiterhin gilt:

```text
kein direkter OCPP-Write
kein direkter Modbus-Write
kein direkter MQTT-Write
kein Hersteller-Rohbefehl direkt aus Mesh/Microgrid
```
