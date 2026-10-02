# NexoWatt UI 0.8.19 – DC Station Display Session & Hersteller-offene Steuerbrücke

## Ziel

Version 0.8.19 erweitert das EOS DC Station Display um eine Betreiber-/Session-Grundlage und eine herstelleroffene Steuerbrücke. Das Display ist weiterhin eine isolierte Vollbildseite pro angelegter DC-Ladestation.

## Wichtiges Prinzip

Das Display ist **nicht OCPP-only**. Es erzeugt nur ein neutrales NexoWatt-Lade-Intent:

```text
Station + LP + Aktion + Modus
```

Die eigentliche Hardwareumsetzung erfolgt danach über die im Installer gemappten Pfade:

```text
NexoWatt Charging-Management
OCPP-Adapter
Modbus-Datenpunkte
MQTT-Datenpunkte
Herstelleradapter
NexoWatt-Devices
generische ioBroker-Command-States
```

## Steuerbrücken im Installer

Im App-Center pro Station:

- **Herstelleroffen über NexoWatt EMS**: Standard. Das Display schreibt in die interne Charging-Management-Abstraktion.
- **Generische ioBroker-DPs / Experte**: vorbereitet für externe Adapter, die ein JSON-Command-Intent auswerten.
- **Nur Anzeige**: Display zeigt Status, blockiert aber Start/Stop.

## Nutzer-/Displayseite

Die Seite bleibt isoliert:

```text
/display/station/<TOKEN>
```

Sie zeigt nur die der Station zugeordneten LPs/Connectoren. Keine Rohdatenpunkte, keine Einstellungen, kein App-Center.

## Neue Betreiber-/Sessionbasis

Vorbereitet sind:

- aktive Session je LP
- letzte Session je LP
- Session-kWh
- Solar-/Netzanteil je Session
- Session-Kosten
- Betreiber-Summary pro Station
- Tages-kWh und Tagesumsatz als Grundlage für spätere Ledger-/Exportfunktionen

## Kommentare im Code

Die neuen Steuer- und Sessionstellen sind bewusst kommentiert. Besonders wichtig sind die Kommentare zu:

- Herstellerneutralität
- neutralem Lade-Intent
- Trennung Display/API/Charging-Management
- Verbot einer OCPP-only-Kopplung
- Installer-only-Konfiguration
