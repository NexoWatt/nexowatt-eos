# NexoWatt UI 0.8.22 – DC Session-Persistenz, Exportbasis und npm-Release-Guard

## Ziel der Version

Version 0.8.22 härtet die EOS DC Station Display Basis weiter. Schwerpunkt sind robuste Betreiber-/Sessionwerte pro Station und eine klare Absicherung des Release-Prozesses, damit keine Version im EOS/ioBroker-Repository freigegeben wird, bevor npm diese Version wirklich ausliefert.

## Wichtigste Änderungen

### 1. DC Station Display Session-Persistenz

Pro DC-Station werden kompakte Betreiberwerte persistiert:

```text
chargeKiosk.stations.<station>.operatorDayKey
chargeKiosk.stations.<station>.operatorSessionsToday
chargeKiosk.stations.<station>.operatorKwhToday
chargeKiosk.stations.<station>.operatorRevenueToday
chargeKiosk.stations.<station>.operatorMaxKwToday
chargeKiosk.stations.<station>.lastSessionsByLpJson
chargeKiosk.stations.<station>.sessionExportJson
chargeKiosk.stations.<station>.csvExportUrl
```

Dadurch bleiben Tageswerte und letzte Sessions je LP nach einem Adapter-Neustart stabiler sichtbar.

### 2. CSV-Exportbasis

Für eine tokenisierte Station gibt es eine CSV-Route:

```text
/api/display/station/<TOKEN>/operator.csv
```

Der Export enthält aktuelle LP-Sessionwerte, letzte Session je LP und Betreiber-Tageswerte. Die Route ist EOS-geschützt und nutzt denselben Stationstoken wie die Displayseite.

### 3. Hersteller-Offenheit bleibt erhalten

Die Session-/Betreiberlogik nutzt keine OCPP-Transaction-ID als Pflicht. Die Daten hängen an der neutralen NexoWatt/EVCS-Sessionbasis und bleiben damit offen für:

```text
OCPP
Modbus
MQTT
REST
Herstelleradapter
NexoWatt-Devices
ioBroker-Alias-Datenpunkte
```

### 4. npm-Release-Guard gegen ETARGET

Neu:

```bash
npm run release:verify-npm
```

Der Guard prüft, ob `package.json` Version wirklich in der npm/private Registry sichtbar ist. Erst danach sollte das EOS/ioBroker Repository auf diese Version zeigen.

## Release-Reihenfolge

```bash
npm run publish:check
npm publish
npm run release:verify-npm
```

Erst danach:

```text
Adapter-Repository / NexoWatt-EOS Repository auf neue Version setzen
```

Wenn `release:verify-npm` fehlschlägt, darf die Repository-Freigabe noch nicht erfolgen, sonst kann `upgrade nexowatt-ui@<version>` mit `ETARGET` abbrechen.

## Test nach Installation

1. Adapter auf 0.8.22 aktualisieren.
2. Adapter starten.
3. App-Center öffnen.
4. DC Station Display prüfen.
5. Displayseite öffnen:

```text
/display/station/<TOKEN>
```

6. Einen LP laden oder simulieren.
7. Prüfen, ob diese States gefüllt werden:

```text
chargeKiosk.stations.<station>.sessionSummaryJson
chargeKiosk.stations.<station>.lastSessionsByLpJson
chargeKiosk.stations.<station>.operatorSummaryJson
```

8. CSV aufrufen:

```text
/api/display/station/<TOKEN>/operator.csv
```

## Frontend-/Admin-Trennung

Weiterhin gilt:

```text
Frontend / Display = Nutzer- und Bedienoberfläche
Admin / App-Center = Verknüpfungen, Stationen, Tokens, Steuerbrücke, Installer-Konfiguration
```

Die CSV-/Sessionbasis ist Betreiberfunktion und bleibt EOS-Kontext.
