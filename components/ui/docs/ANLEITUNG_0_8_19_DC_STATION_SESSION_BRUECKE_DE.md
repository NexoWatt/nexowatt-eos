# NexoWatt UI 0.8.19 – DC Station Display Session & herstellerneutrale Steuerbrücke

## Ziel

Version 0.8.19 erweitert das EOS DC Station Display um eine Betreiber- und Sessionbasis. Die Displayseite bleibt weiterhin eine isolierte Nutzer-/Touchseite pro angelegter DC-Ladestation. Einstellungen, Verknüpfungen und technische Zuordnungen bleiben ausschließlich im Installer-/App-Center.

Wichtig: Die Displaysteuerung ist bewusst herstellerneutral. Sie ist nicht auf OCPP fest verdrahtet. Das Display sendet nur einen Lade-Intent an die NexoWatt-EMS-Schicht oder optional an einen generischen JSON-Command-State. Dahinter können OCPP, Modbus, MQTT, NexoWatt-Devices, ioBroker-Aliase oder Herstelleradapter arbeiten.

## Neue Funktionen

### 1. Betreiber- und Sessionwerte

Pro Display-Station werden zusätzliche Diagnose- und Betreiberstates gepflegt:

```text
chargeKiosk.stations.<station>.sessionSummaryJson
chargeKiosk.stations.<station>.sessionSnapshotsJson
chargeKiosk.stations.<station>.lastSessionJson
chargeKiosk.stations.<station>.operatorSummaryJson
chargeKiosk.stations.<station>.operatorKwhToday
chargeKiosk.stations.<station>.operatorRevenueToday
```

Die Displayseite zeigt jetzt zusätzlich einen Betreiber-Tageswert:

```text
Heute Betreiber: kWh heute · geschätzter Sessionwert
```

### 2. Herstellerneutrale Steuerbrücke

Im Installer/App-Center gibt es pro Station eine Steuerbrücke:

```text
Herstelleroffen über NexoWatt EMS
Generischer JSON-Command-State / Experte
Nur Anzeige
```

Der Standard ist:

```text
Herstelleroffen über NexoWatt EMS
```

Dabei schreibt das Display nur in die bestehenden NexoWatt-/Charging-Management-Intent-States. Die eigentliche Hersteller-/Protokollanbindung läuft über die vorhandenen LP-Mappings.

### 3. Optionaler JSON-Command-State

Für Experten kann ein beliebiger ioBroker-State als Command-State hinterlegt werden:

```text
0_userdata.0.nexowatt.dc.commands.{lp}
```

Platzhalter:

```text
{stationId}
{station}
{lp}
```

Beispiel-Payload:

```json
{
  "version": "0.8.19",
  "stationId": "dc_station_01",
  "lp": "lp1",
  "action": "start",
  "mode": "solar",
  "userMode": "pv",
  "source": "dc-station-display",
  "protocolHint": "manufacturer-open",
  "directHardwareWrite": false
}
```

Ein externer Adapter kann diesen JSON-Intent dann in OCPP, Modbus, MQTT, REST oder eine Hersteller-API übersetzen.

## Bedienroute

Die isolierte Displayseite bleibt:

```text
/display/station/<TOKEN>
```

Beispiel:

```text
http://<adapter-ip>:8188/display/station/ST-XXXX-XXXX
```

## Installer-Regel

Nur im Installer/App-Center werden verwaltet:

```text
Stationen
LP-Zuordnung
Display-Token
Steuerbrücke
Command-State
Preise
Wartungsmodus
Watchdog
Layout
Sprache
```

Das normale Frontend und die Displayseite zeigen nur Status und erlaubte Bedienung.

## Testempfehlung

Nach Installation:

1. EOS-Lizenz aktivieren.
2. App-Center öffnen.
3. EOS DC Station Display aktivieren.
4. Station anlegen oder bestehende Station prüfen.
5. LPs zuordnen, z. B. `lp1, lp2`.
6. Steuerbrücke auf `Herstelleroffen über NexoWatt EMS` lassen.
7. Display-URL öffnen.
8. Start/Stop und Solar/Schnellladen testen.
9. Prüfen, dass keine anderen LPs sichtbar sind.
10. Prüfen, dass `sessionSummaryJson` und `operatorSummaryJson` aktualisiert werden.

## Entwicklungsregel

Fachliche Änderungen weiterhin nur in TypeScript:

```text
src-ts/runtime-executables/**
```

Generierte Dateien wie `main.js`, `ems/modules/*.js` und `www/*.js` werden nicht manuell fachlich bearbeitet.
