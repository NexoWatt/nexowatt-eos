# NexoWatt UI 0.8.47 – Mesh/Microgrid Ziel-Wiederfreigabe & Command-Verlauf

## Zweck

Version 0.8.47 erweitert die EOS-App **Mesh/Microgrid** um eine feldtaugliche Ziel-Wiederfreigabe und einen zielweisen Command-Verlauf für die lokale Bridge.

Die Funktion bleibt herstellerneutral:

- Mesh/Microgrid schreibt keine OCPP-, Modbus-, MQTT-, REST- oder Hersteller-Rohbefehle.
- Mesh/Microgrid schreibt nur neutrale JSON-Command-Intents in die konfigurierten Command-States.
- Die lokale Bridge oder Herstellerintegration setzt diese Intents anschließend um.

## Was ist neu?

### Automatische Wiederfreigabe

Wenn für ein Bridge-Ziel **ACK OK** erkannt wird, wird das Ziel automatisch wieder für Folge-Commands freigegeben.

### Manuelle Wiederfreigabe

In der Betreiberansicht `/mesh/microgrid` kann ein einzelnes Bridge-Ziel zeitlich begrenzt manuell freigegeben werden. Diese Freigabe schreibt keine Hardwarewerte, sondern entfernt nur die lokale ACK-Gate-Sperre für das betroffene Ziel.

### Command-Verlauf je Ziel

Die Betreiberansicht zeigt pro Bridge-Ziel den letzten Command-Status, Command-IDs, Ziel-Command-State und Blockier-/Fehlergrund.

## Wichtige States

```text
meshMicrogrid.localBridge.manualReleaseEnabled
meshMicrogrid.localBridge.manualReleaseJson
meshMicrogrid.localBridge.manualReleaseSummaryJson
meshMicrogrid.localBridge.lastManualReleaseAt
meshMicrogrid.localBridge.lastManualReleaseResultJson
meshMicrogrid.localBridge.manualReleaseCount
meshMicrogrid.localBridge.targetCommandHistoryJson
meshMicrogrid.localBridge.targetCommandHistoryCount
meshMicrogrid.localBridge.releaseReady
```

## API

```text
POST /api/mesh/local-bridge/release
```

Beispiel-Body:

```json
{
  "mappingId": "lp1_bridge",
  "ttlSec": 300,
  "reason": "operator-ui"
}
```

Alternativ kann ein `commandStateDp` übergeben werden.

## Bedienung

1. `/mesh/microgrid` öffnen.
2. Bereich **Bridge ACK / Zielstatus** prüfen.
3. Bei einem blockierten Ziel auf **Freigeben** klicken.
4. Der nächste neutrale Mesh-Command darf für dieses Ziel wieder ausgegeben werden, solange die Freigabe gültig ist.

## Sicherheit

Die Funktion dient nur zur Bridge-/ACK-Wiederfreigabe. Sie schreibt keine Geräte direkt und ersetzt keine lokale Hersteller-/Bridge-Sicherheitslogik.
