# Technische Alternative CMI / CMI-S – NexoWatt 0.5.139

## Ziel

Die Integration kombiniert zwei offizielle CMI-Schnittstellen:

1. **CMI JSON API v8** für die automatische, lesende Erfassung aller unterstützten Werte aller konfigurierten CAN-Knoten.
2. **Bidirektionale Modbus-TCP-Brücke** für schnelle Sollwerte und Rückmeldungen. Das CMI arbeitet dabei als Modbus-Master, NexoWatt als Modbus-Slave/Server.

Template:

```text
heat.ta.cmi
```

Protokoll:

```text
taCmi
```

## CMI JSON API

Die API wird über `/INCLUDE/api.cgi` mit HTTP-Basic-Authentifizierung eines CMI-Benutzers der Stufe **Experte** aufgerufen. Standardmäßig werden die CAN-Knoten 1 bis 62 nacheinander geprüft. Gefundene Werte werden dynamisch als ioBroker-Datenpunkte angelegt:

```text
devices.<id>.nodes.<node>.info.*
devices.<id>.nodes.<node>.inputs.<nr>.value
devices.<id>.nodes.<node>.outputs.<nr>.value
devices.<id>.nodes.<node>.dlInputs.<nr>.value
devices.<id>.nodes.<node>.systemGeneral.<nr>.value
devices.<id>.nodes.<node>.systemDate.<nr>.value
devices.<id>.nodes.<node>.systemTime.<nr>.value
devices.<id>.nodes.<node>.systemSun.<nr>.value
devices.<id>.nodes.<node>.electricalPower.<nr>.value
devices.<id>.nodes.<node>.networkAnalog.<nr>.value
devices.<id>.nodes.<node>.networkDigital.<nr>.value
devices.<id>.nodes.<node>.mbus.<nr>.value
devices.<id>.nodes.<node>.modbus.<nr>.value
devices.<id>.nodes.<node>.knx.<nr>.value
devices.<id>.nodes.<node>.loggingAnalog.<nr>.value
devices.<id>.nodes.<node>.loggingDigital.<nr>.value
```

Die CMI-API erlaubt offiziell nur **eine Anfrage pro Minute**. Darum wird pro Intervall genau ein Knoten abgefragt. Bei `1-62` dauert ein vollständiger Erstscan maximal 62 Minuten. Für eine schnellere Aktualisierung sollten die tatsächlich vorhandenen Knoten angegeben werden, beispielsweise:

```text
1,2,7,12
```

Die automatische Gruppenauswahl deckt die laut API zum Gerätetyp passenden Standardgruppen ab. Für Sondervarianten mit M-Bus, Modbus oder KNX können die Gruppen explizit gesetzt werden, beispielsweise:

```text
I,O,D,Sg,Sd,St,Ss,La,Ld,M,AM,AK
```

## Bidirektionale Steuerung

Die JSON API ist nur lesend. Für Sollwerte und schnelle Rückmeldungen startet NexoWatt deshalb einen lokalen Modbus-TCP-Server. Standard:

```text
Bind-Adresse: 0.0.0.0
Port:         1502
Unit-ID:      1
```

Port 1502 vermeidet Konflikte mit bereits laufenden Modbus-Diensten und benötigt unter Linux keine privilegierten Portrechte. In der CMI-Konfiguration wird die IP des ioBroker-/NexoWatt-Hosts als Modbus-Ziel eingetragen.

### Standard-Registerkarte

| Richtung | Typ | Adressen | ioBroker-Datenpunkte |
|---|---|---:|---|
| NexoWatt → CMI | Holding Register | 0…63 | `bridge.toCmi.analog.01…64` |
| NexoWatt → CMI | Coils | 0…63 | `bridge.toCmi.digital.01…64` |
| CMI → NexoWatt | Holding Register | 100…163 | `bridge.fromCmi.analog.01…64` |
| CMI → NexoWatt | Coils | 100…163 | `bridge.fromCmi.digital.01…64` |

Analoge Werte werden als vorzeichenbehaftete 16-Bit-Ganzzahlen übertragen. Dezimalstellen werden über den Faktor/`scale` abgebildet. Beispiel: `21,5 °C` mit `scale: 0.1` wird als Registerwert `215` übertragen.

### CMI-Konfiguration für NexoWatt → Heizung

1. Im CMI unter **Einstellungen → Eingänge → Modbus** einen analogen oder digitalen Modbus-Eingang erstellen.
2. Ziel: IP-Adresse des NexoWatt-Hosts, Port 1502, Unit-ID 1.
3. Analoge Sollwerte aus Holding 0…63 lesen, digitale Befehle aus Coil 0…63 lesen.
4. Diese CMI-Modbus-Eingänge als CAN-Ausgänge bereitstellen.
5. In TAPPS2 bzw. im jeweiligen TA-Regler die CAN-Netzwerkeingänge als Sollwerte/Freigaben verwenden.

### CMI-Konfiguration für Heizung → NexoWatt

1. Im CMI unter **Einstellungen → Ausgänge → Modbus** einen analogen oder digitalen Ausgang erstellen.
2. Als Quelle den gewünschten CAN-Wert des Heizungsreglers auswählen.
3. Ziel: NexoWatt-IP, Port 1502, Unit-ID 1.
4. Analoge Rückmeldungen auf Holding 100…163, digitale Rückmeldungen auf Coil 100…163 schreiben.
5. Sendeintervall und Blockierzeit im CMI passend zur Regelung einstellen.

## Kanaldefinitionen und stabile Aliase

Über `bridgeMap` beziehungsweise das Admin-Feld **Bridge-Kanaldefinitionen** können Namen, Einheiten, Skalierung, Grenzwerte und Aliase vergeben werden:

```json
[
  {
    "direction": "toCmi",
    "type": "analog",
    "channel": 1,
    "name": "Vorlauf Soll",
    "unit": "°C",
    "role": "level.temperature",
    "scale": 0.1,
    "min": 10,
    "max": 70,
    "alias": "ctrl.flowSetpointC"
  },
  {
    "direction": "toCmi",
    "type": "digital",
    "channel": 1,
    "name": "Heizung Freigabe",
    "alias": "ctrl.heatingEnable"
  },
  {
    "direction": "fromCmi",
    "type": "analog",
    "channel": 1,
    "name": "Vorlauf Ist",
    "unit": "°C",
    "scale": 0.1,
    "alias": "r.flowTemperatureC"
  },
  {
    "direction": "fromCmi",
    "type": "digital",
    "channel": 1,
    "name": "Wärmepumpe aktiv",
    "alias": "r.heatPumpActive"
  }
]
```

Damit entstehen zusätzlich:

```text
aliases.ctrl.flowSetpointC
aliases.ctrl.heatingEnable
aliases.r.flowTemperatureC
aliases.r.heatPumpActive
```

## Sicherheit

- Die CMI-Modbus-Eingänge sollten für Kommunikationsausfälle mit einem geeigneten Timeout-/Fallbackwert konfiguriert werden.
- NexoWatt und CMI sollten sich in einem geschützten lokalen Netz befinden.
- Port 1502 nur für die CMI-IP freigeben.
- Vor produktiver Freigabe jeden Sollwert und jedes Vorzeichen einzeln testen.
- Netzwerk-, Warmwasser- und Frostschutzfunktionen im TA-Regler dürfen nicht ausschließlich von einer externen Verbindung abhängen.
