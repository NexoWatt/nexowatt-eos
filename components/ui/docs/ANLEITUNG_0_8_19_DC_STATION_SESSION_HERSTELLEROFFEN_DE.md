# NexoWatt UI 0.8.19 – DC Station Display Session & herstelleroffene Steuerbasis

Diese Version erweitert das EOS DC Station Display um eine Betreiber-/Session-Grundlage und eine bewusst herstellerneutrale Steuerbrücke.

## Grundsatz

Das DC Station Display ist weiterhin eine isolierte Vollbildseite pro angelegter Ladestation:

```text
/display/station/<TOKEN>
```

Die Seite zeigt nur die LPs/Connectoren, die der jeweiligen Station im Installerbereich zugeordnet wurden. Es gibt keine Navigation, keine Rohdatenpunkte und keine Konfiguration im Nutzer-/Displayfrontend.

## Hersteller-offene Steuerung

Die Display-API ist nicht an OCPP gebunden. Ein Display-Befehl wird als neutraler NexoWatt-Ladeintent behandelt:

```text
Display Button
→ tokenisierte Display-API
→ Stations- und LP-Prüfung
→ neutraler NexoWatt-Ladeintent
→ Charging-Management oder optionaler JSON-Command-State
→ gemappte Hersteller-/Gerätewelt
```

Damit können folgende Backend-Welten genutzt werden:

- OCPP über einen vorhandenen OCPP-/Ladepunktadapter
- Modbus
- MQTT
- REST-/Herstelleradapter
- NexoWatt-Devices
- ioBroker-Alias- oder eigene Integrationsstates

Wichtig: Das Display selbst schreibt keine direkten OCPP-Kommandos und keine herstellerspezifischen Rohbefehle.

## Neue Installerfelder pro Station

Im Installer/App-Center können pro DC-Station zusätzlich gepflegt werden:

| Feld | Zweck |
|---|---|
| Steuerbrücke | Standard: herstelleroffen über NexoWatt EMS. Optional: generischer JSON-Command-State oder Nur-Anzeige. |
| Command-State optional | Frei mappbarer ioBroker-State für Integratoren. Platzhalter `{stationId}` und `{lp}` sind möglich. |
| Protokoll-/Hersteller-Hinweis | Reine Diagnose/Anzeige, z. B. OCPP, Modbus, MQTT oder Herstelleradapter. |

Diese Felder bleiben ausschließlich im Installerbereich.

## Session-/Betreiberbasis

Das Display-Payload enthält jetzt klarere Sessionwerte pro LP/Connector:

```text
sessionId
sessionState
sessionEnergyKwh
sessionSolarKwh
sessionGridKwh
sessionSolarSharePercent
sessionDurationSec
sessionCostEur
lastSession
```

Zusätzlich werden Betreiber-Summaries als States vorbereitet:

```text
chargeKiosk.stations.<station>.sessionSummaryJson
chargeKiosk.stations.<station>.sessionSnapshotsJson
chargeKiosk.stations.<station>.lastSessionJson
chargeKiosk.stations.<station>.operatorSummaryJson
chargeKiosk.stations.<station>.operatorKwhToday
chargeKiosk.stations.<station>.operatorRevenueToday
```

Die Werte sind als Grundlage für spätere Ledger-/CSV-/Abrechnungsfunktionen gedacht.

## Neue Diagnosestates

Zusätzlich zu den bisherigen Watchdog-States gibt es herstelleroffene Diagnosewerte:

```text
chargeKiosk.backendSummaryJson
chargeKiosk.lastNeutralCommandJson
chargeKiosk.stations.<station>.controlBridge
chargeKiosk.stations.<station>.protocolHint
chargeKiosk.stations.<station>.lastCommandJson
chargeKiosk.stations.<station>.lastCommandResult
```

## Sicherheit

Die Display-API prüft weiterhin:

```text
EOS-Lizenz
Token gültig
Station aktiv
LP gehört zu dieser Station
Wartungsmodus
Start/Stop-Freigabe
Modus erlaubt
```

Bei Wartungsmodus, fehlender LP-Zuordnung oder nicht erlaubtem Modus wird serverseitig blockiert.

## Test nach Installation

1. Adapter installieren und starten.
2. App-Center öffnen.
3. EOS DC Station Display aktivieren.
4. Station anlegen.
5. LPs zuordnen, z. B. `lp1, lp2`.
6. Steuerbrücke zunächst auf „Herstelleroffen über NexoWatt EMS“ lassen.
7. Display-URL öffnen:

```text
http://<ioBroker-IP>:8188/display/station/<TOKEN>
```

8. Prüfen:

```text
Display lädt
LPs werden angezeigt
Heartbeat wird im App-Center sichtbar
Start/Stop geht nur für zugeordnete LPs
Sessionwerte erscheinen bei aktiver Ladung
```

## Hinweise für Integratoren

Für externe Integrationen kann ein Command-State hinterlegt werden. Der geschriebene Wert ist JSON und enthält u. a.:

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

Ein nachgelagerter Adapter kann diesen Intent in OCPP, Modbus, MQTT, REST oder Herstellerbefehle übersetzen.
