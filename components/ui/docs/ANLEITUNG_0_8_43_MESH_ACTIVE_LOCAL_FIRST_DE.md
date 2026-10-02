# NexoWatt UI 0.8.43 – Mesh/Microgrid Aktivmodus Local-First

## Ziel
Diese Version ergänzt den aktiven Local-First-/Grid-Last-Modus für die separate EOS-App **Mesh/Microgrid**.

Die App kann nach ausdrücklicher Installateurfreigabe neutrale Command-Intents ausgeben. Diese Intents werden entweder in einen lokalen JSON-Command-State geschrieben oder über das separate Mesh-Tailscale an Peer-Instanzen gesendet.

## Wichtige Sicherheitsgrenze
Die Mesh/Microgrid-App schreibt weiterhin keine Hersteller- oder Hardwaredatenpunkte direkt.

Nicht direkt aus Mesh/Microgrid:

- kein OCPP-Write
- kein Modbus-Write
- kein MQTT-Write
- kein Wechselrichter-Setpoint
- kein Speicher-Setpoint
- kein Ladepunkt-Setpoint

Die Umsetzung übernimmt eine lokale Bridge, ein Herstelleradapter oder die Gegeninstanz über den neutralen Command-State.

## Konfiguration
Pfad:

`NexoWatt EMS App-Center → Mesh/Microgrid`

1. App **EOS Mesh/Microgrid** im Reiter **Apps** installieren und aktivieren.
2. Reiter **Mesh/Microgrid** öffnen.
3. Cluster-ID und Cluster-Name prüfen.
4. Knoten mit Prioritäten anlegen.
5. Im Bereich **Feldtest-Steuerung & Tailscale Mesh** den Steuermodus wählen:
   - `Nur Diagnose`
   - `Feldtest: JSON-Command-State ausgeben`
   - `Aktiv: Local-First Commands ausgeben`
   - `Aus`
6. Installateurfreigabe setzen.
7. Neutralen Command-State oder Tailscale-Peer-URLs eintragen.
8. Speichern und EMS neu starten.

## Feldtest / Betrieb
Betreiberansicht:

`http://<NexoWatt-IP>:8188/mesh/microgrid`

Dort sichtbar:

- CommandGuard-Status
- aktive Local-First-/Grid-Last-Command-Ausgabe
- geplante Commands
- blockierte Commands
- Tailscale-Peer-Status
- Receiver-ACKs

## Nächster Schritt
0.8.44 soll die lokale Bridge-Zuordnung vorbereiten: Command-Intent → lokale Zielgruppe → sicherer Übergabe-State je Knoten.
