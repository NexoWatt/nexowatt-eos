# Roadmap ab 0.8.23

## 0.8.23 – Local kWh Ledger Basis

Ziel: Die in 0.8.22 vorbereiteten Session-/Betreiberwerte werden in ein lokales kWh-Ledger überführt.

Geplant:

```text
LocalKwhLedgerService
kompakte Tagesdatei oder JSONL-Struktur
EVCS-/DC-Session in Ledger schreiben
PV-/Netzanteil je Session ablegen
CSV-Export erweitern
Ledger-Summen als ioBroker-States
keine tausenden Einzelstates erzeugen
```

## 0.8.24 – Betreiberberichte

```text
Tagesreport pro DC-Station
Monatsreport pro Station
LP-/Connector-Auswertung
Solar-/Netzanteil summieren
Umsatz-/Kostenübersicht
CSV Export erweitern
```

## 0.8.25 – NL-Basis vertiefen

```text
P1/DSMR Mapping erweitern
Teruglevering Anzeige
Saldering-Exit-Logik
NL-Begriffe im Station Display und Energie-Wertkonto verfeinern
```

## 0.8.26 – Mesh/Microgrid Datenmodell

```text
Energy Nodes
Cluster
Local First Strategie
Netzlimit pro Verbund
Nachbarschaftsversorgung vorbereiten
```
