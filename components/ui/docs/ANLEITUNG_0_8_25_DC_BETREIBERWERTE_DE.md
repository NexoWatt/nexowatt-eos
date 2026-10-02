# NexoWatt UI 0.8.25 – DC Station Display Betreiberwerte

## Zweck

Version 0.8.25 erweitert die EOS DC-Stationsseiten um Betreiberwerte. Die Display-Seite bleibt eine separate, tokenisierte Seite pro DC-Ladestation:

```text
http://<NexoWatt-IP>:8188/display/station/<TOKEN>
```

Neu ist, dass pro zugeordnetem LP/Connector die letzte bekannte Session sichtbar bleibt und die Betreiber-Tageswerte robuster persistiert werden.

## Wichtige Funktionen

- Letzte Session je LP wird persistent geführt.
- Letzte Session je LP wird auf der Display-Seite angezeigt.
- Betreiberwerte enthalten Energie heute, Solar-kWh, Netz-kWh, Solaranteil, Umsatz und Tagesmaximum.
- CSV-Export v2 ist über eine tokenisierte URL verfügbar.
- Die Logik bleibt hersteller- und protokolloffen: OCPP, Modbus, MQTT, REST, Herstelleradapter und NexoWatt-Devices können angebunden werden.

## CSV-Export

Pro Station ist der Export über folgende Route erreichbar:

```text
/api/display/station/<TOKEN>/operator.csv
```

Beispiel:

```text
http://192.168.178.50:8188/api/display/station/ST-ABCD-EFGH/operator.csv
```

Der Export enthält:

- aktive Sessionwerte,
- letzte persistierte Session je LP,
- Solar-/Netzanteil,
- Kosten,
- Leistung,
- Start-/Endzeit,
- Protokollhinweis,
- Tages-Summen.

## Neue States pro Station

```text
chargeKiosk.stations.<station>.operatorSolarKwhToday
chargeKiosk.stations.<station>.operatorGridKwhToday
chargeKiosk.stations.<station>.operatorSolarShareTodayPercent
chargeKiosk.stations.<station>.operatorCompletedRevenueToday
chargeKiosk.stations.<station>.operatorExportReady
chargeKiosk.stations.<station>.operatorLastSessionCount
chargeKiosk.stations.<station>.operatorLastSessionUpdatedAt
chargeKiosk.stations.<station>.csvExportReady
chargeKiosk.stations.<station>.sessionDiagnosticsJson
```

Bestehende States wie `lastSessionsByLpJson`, `sessionSummaryJson`, `sessionExportJson` und `csvExportUrl` bleiben erhalten und wurden erweitert.

## Bedienprinzip

Die Display-Seite schreibt weiterhin keine direkten Hardwarebefehle. Der Ablauf bleibt:

```text
Display Button
→ Display API
→ Station-/LP- und Tokenprüfung
→ neutraler NexoWatt-Ladeintent
→ Charging Management oder generischer JSON-Command-State
→ OCPP / Modbus / MQTT / REST / Herstelleradapter / NexoWatt-Devices
```

## Installation

Nach dem Veröffentlichen in npm/private Registry:

```bash
NexoWatt EOS upgrade nexowatt-ui@0.8.25 --debug
```

Oder lokal mit TGZ:

```bash
cd "/opt/NexoWatt EOS"
npm install /pfad/iobroker.nexowatt-ui-0.8.25.tgz --omit=dev --unsafe-perm
NexoWatt EOS upload nexowatt-ui
NexoWatt EOS restart nexowatt-ui.0
```

## Prüfung nach Installation

1. Adapterversion prüfen: `0.8.25`.
2. App-Center öffnen und Station prüfen.
3. Display-Seite öffnen: `/display/station/<TOKEN>`.
4. Einen LP laden und Sessionwerte beobachten.
5. CSV öffnen: `/api/display/station/<TOKEN>/operator.csv`.
6. Nach Adapter-Neustart prüfen, ob die letzte Session je LP weiter angezeigt wird.

