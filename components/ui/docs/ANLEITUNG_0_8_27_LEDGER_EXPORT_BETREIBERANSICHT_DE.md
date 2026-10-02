# NexoWatt UI 0.8.27 – Local kWh Ledger Export & Betreiberansicht

## Zweck

Version 0.8.27 erweitert den EOS **Local kWh Ledger** um:

- eine Betreiberansicht für Ledger-Summen,
- eine JSON-API,
- eine CSV-API mit Zeitraumfilter,
- Monats-/Jahres-Exportbasis,
- Quelle je kWh,
- eine vorbereitete Verbindung zum Energie-Wertkonto.

Wichtig: Es wird **kein zweiter Ledger** aufgebaut. Betreiberansicht, CSV-API, JSON-API und Energy-Wallet-Bridge lesen denselben bestehenden Ledger-Puffer:

```text
energyLedger.summaryJson
energyLedger.entriesRecentJson
```

Dadurch werden Sessions nicht doppelt gezählt.

## Betreiberansicht öffnen

Die Betreiberansicht ist erreichbar unter:

```text
http://<NexoWatt-IP>:8188/ledger/local-kwh
```

Im Installer/App-Center ist bei der EOS-App **Local kWh Ledger** zusätzlich ein Link hinterlegt:

```text
Betreiberansicht / CSV-Export öffnen
```

Die Seite ist eine reine Anzeige-/Exportseite. Es werden dort keine Datenpunkte verknüpft, keine Preise eingestellt und keine Hardware gesteuert.

## JSON-API

```text
/api/ledger/local-kwh?period=today
/api/ledger/local-kwh?period=month
/api/ledger/local-kwh?period=year
/api/ledger/local-kwh?period=recent
/api/ledger/local-kwh?period=all
```

Die API liefert:

- Periodensummen,
- Quelle je kWh,
- Ledger-Einträge,
- Exportlinks,
- Energy-Wallet-Bridge,
- Deduplikationshinweis.

## CSV-API

```text
/api/ledger/local-kwh.csv?period=today
/api/ledger/local-kwh.csv?period=month
/api/ledger/local-kwh.csv?period=year
/api/ledger/local-kwh.csv?period=recent
/api/ledger/local-kwh.csv?period=all
```

Die CSV-Datei enthält pro Ledger-Eintrag unter anderem:

```text
Station
LP / Connector
Session-ID
Quelle je kWh
Gesamt-kWh
Lokal-/Solar-kWh
Netz-kWh
Solaranteil
Wert
Preis
Protokollhinweis
```

## Quelle je kWh

Jeder Ledger-Eintrag enthält einen kompakten Quellenmix:

```text
Lokaler PV-/Solarstrom
Netzstrom
Nicht eindeutig zugeordnet
```

Diese Information wird als JSON am Entry gespeichert und im Export angezeigt. Es werden bewusst **keine Einzel-kWh-States** erzeugt.

## Verbindung zum Energie-Wertkonto

Das Energy Wallet liest optional die Bridge:

```text
energyLedger.walletBridge.summaryJson
```

Diese Bridge ist **reference-only**. Sie dient dazu, belegte Betreiber-/Ladesessions sichtbar mit dem Energie-Wertkonto zu verbinden. Sie addiert Ledgerwerte nicht erneut in die Energy-Wallet-Gesamtsummen.

## Wichtige States

```text
energyLedger.operator.url
energyLedger.operator.viewJson
energyLedger.operator.summaryJson
energyLedger.operator.sourceBreakdownJson

energyLedger.walletBridge.status
energyLedger.walletBridge.summaryJson

energyLedger.export.todayCsvUrl
energyLedger.export.monthCsvUrl
energyLedger.export.yearCsvUrl
energyLedger.export.periodsJson
energyLedger.export.ready
```

## Lizenz

Der Local kWh Ledger bleibt EOS-only.

Home bleibt unverändert.

## Hinweis

Die Funktion ist eine Betreiber- und Optimierungsgrundlage. Sie ist noch keine eichrechtsverbindliche Abrechnung.
