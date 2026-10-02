# NexoWatt UI 0.8.18 – Anleitung EOS DC Station Display Härtung

## Ziel der Version

Version 0.8.18 härtet das EOS DC Station Display für den Einsatz direkt am Display einer DC-Ladestation. Pro angelegter Station gibt es eine separate Display-Seite. Die Seite zeigt ausschließlich die dieser Station zugeordneten LPs/Connectoren und dient nur zur Bedienung vor Ort.

Die Konfiguration bleibt vollständig im Installer/App-Center. Das normale Nutzerfrontend enthält keine Verknüpfungen, keine Preis-/Token-Konfiguration und keine Installerfunktionen.

## Wichtige Neuerungen

- Watchdog-/Online-Status pro Stationsdisplay
- Offline- und Verbindungsverlustanzeige auf der Display-Seite
- Wartungsmodus pro Station
- Layout-Modi für 1, 2 und 4 Connectoren
- einstellbares Display-Refresh-Intervall
- optionale Sprachwahl direkt am Display: DE/NL/EN
- Session-kWh, Session-Dauer, vorbereiteter Solar-/Netzanteil je Ladevorgang
- API-Regressionstest für Display-API, Gate-Logik, Layout und Sessiondaten
- Service-Worker Cache auf `nexowatt-cache-v319`

## Installation

1. ZIP in ioBroker installieren.
2. Adapter neu starten.
3. EOS-Lizenz prüfen.
4. App-Center öffnen.
5. App **EOS DC Station Display** aktivieren.
6. Station anlegen oder aus vorhandener Stationsgruppe erzeugen.
7. LPs/Connectoren zuordnen.
8. Display-URL öffnen.

## Display-URL

Die Display-Seite wird über einen Stationstoken geöffnet:

```text
/display/station/<TOKEN>
```

Beispiel:

```text
http://<adapter-ip>:8188/display/station/ST-ABCD-EFGH-IJKL
```

Diese URL ist für das fest verbaute Display der DC-Ladestation gedacht.

## Installer-Konfiguration

Im App-Center werden pro Station eingestellt:

- Stationsname
- Stations-Key
- Token
- zugeordnete LPs/Connectoren
- erlaubte Modi: Solar / Schnellladen
- Start/Stop erlaubt
- Preis anzeigen
- PV-Anteil anzeigen
- Wartungsmodus
- Watchdog-Timeout in Sekunden
- Display-Refresh in Sekunden
- Layout-Modus: Auto / 1 / 2 / 4 Connectoren
- Sprachwahl am Display aktiv/inaktiv

## Display-Bedienung

Auf dem Display sind je Connector sichtbar:

- Status
- aktuelle Ladeleistung
- Ziel-Leistung
- Session-kWh
- Session-Kosten
- Preis/kWh
- PV-/Solaranteil
- Solar-kWh in Session
- Netz-kWh in Session
- Session-Dauer
- Solar laden
- Schnellladen
- Stoppen

## Sicherheitsprinzip

Die Display-Seite schreibt nicht direkt auf Hardware-Datenpunkte.

Ablauf:

```text
Touch am Display
→ Display API
→ EOS-Lizenz prüfen
→ Token prüfen
→ Station prüfen
→ LP-Zuordnung prüfen
→ Wartungsmodus prüfen
→ erlaubte Modi prüfen
→ Charging-Management User-States
→ bestehender Write-Plan
```

Dadurch kann ein Display nur die LPs bedienen, die seiner Station zugeordnet sind.

## Wartungsmodus

Ist der Wartungsmodus aktiv, zeigt das Display eine klare Wartungsmeldung. Start/Stop wird blockiert. Die Konfiguration erfolgt ausschließlich im Installerbereich.

## Watchdog

Das Display sendet regelmäßig Heartbeats. Der Adapter schreibt pro Station unter anderem:

```text
chargeKiosk.stations.<station>.displayOnline
chargeKiosk.stations.<station>.displayStatus
chargeKiosk.stations.<station>.displayWarning
chargeKiosk.stations.<station>.watchdogAgeSec
chargeKiosk.stations.<station>.watchdogTimeoutSec
chargeKiosk.stations.<station>.lastHeartbeat
chargeKiosk.stations.<station>.lastPayloadAt
chargeKiosk.stations.<station>.lastDisplayInfoJson
```

Globale Übersicht:

```text
chargeKiosk.watchdog.status
chargeKiosk.watchdog.summaryJson
chargeKiosk.displayOnlineCount
chargeKiosk.displayOfflineCount
chargeKiosk.maintenanceCount
```

## Prüfung nach Installation

Empfohlene Checks:

1. App-Center öffnen.
2. EOS DC Station Display aktivieren.
3. Station mit zwei LPs anlegen.
4. Display-URL öffnen.
5. Heartbeat im Installer prüfen.
6. Wartungsmodus einschalten und Anzeige prüfen.
7. Wartungsmodus ausschalten.
8. Solar/Schnellladen/Stoppen prüfen.
9. Adapter neu starten und Display erneut öffnen.
10. ioBroker-Systemsprache prüfen.

## Wichtig

- Home bleibt unverändert.
- DC Station Display ist EOS-only.
- Keine Konfiguration im Nutzerfrontend.
- Keine direkte Hardwaresteuerung aus dem Browser.
- Display-Seite ist pro Station isoliert.
