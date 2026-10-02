# NexoWatt UI 0.8.32 – EOS Mesh/Microgrid Datenmodell

## Zweck

Diese Version ergänzt **EOS Mesh/Microgrid** als separate App im Installer/App-Center. Die App bildet Energie-Knoten und lokale Cluster als read-only Datenmodell ab. Sie ist die Grundlage für spätere Nachbarschaftsversorgung, Energy Hubs und Microgrid-Steuerung.

## Wichtig

- Nur EOS-Lizenz.
- Home bleibt unverändert.
- Keine Hardwaresteuerung in 0.8.32.
- Keine OCPP-Pflicht. Daten können aus OCPP, Modbus, MQTT, REST, Herstelleradaptern, NexoWatt-Devices oder ioBroker-Aliassen kommen.
- Keine doppelte Wallet-/Ledger-/Export-Guard-Logik.

## Einrichtung

1. App-Center öffnen.
2. App **EOS Mesh/Microgrid** installieren und aktivieren.
3. In der Karte **EOS Mesh/Microgrid Datenmodell** Cluster-ID, Cluster-Name und optional Grid-/Clusterlimit setzen.
4. Energie-Knoten anlegen.
5. Knoten-Typ/Rolle auswählen: producer, consumer, storage, grid, chargepoint, thermal oder generic.
6. Datenpunkte für Leistung, Bedarf, Überschuss, SoC oder Netz Import/Export zuordnen.
7. Speichern.

## Wichtige States

```text
meshMicrogrid.enabled
meshMicrogrid.status
meshMicrogrid.mode
meshMicrogrid.cluster.*
meshMicrogrid.power.*
meshMicrogrid.nodesJson
meshMicrogrid.intent.nodesJson
meshMicrogrid.intent.clusterJson
meshMicrogrid.summaryJson
meshMicrogrid.lastDecisionJson
```

## Interpretation

Das Modul veröffentlicht neutrale Energy-Intents:

```text
surplus = Knoten/Cluster hat Energie übrig
demand  = Knoten/Cluster braucht Energie
balanced = ausgeglichen
```

Diese Intents sind in 0.8.32 nur Diagnose-/Datenmodell. Steuerstrategien folgen später separat.
