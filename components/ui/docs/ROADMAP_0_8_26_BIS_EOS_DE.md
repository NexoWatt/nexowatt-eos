# Roadmap ab NexoWatt UI 0.8.26

## 0.8.26 – Local kWh Ledger Grundlage

Ziel: Aus den DC-Sessiondaten und dem Energie-Wertkonto eine erste lokale kWh-Zuordnung vorbereiten.

Geplant:

- Ledger-Grundstruktur für lokale kWh-Zuordnung.
- Session-Einträge für Ladepunkte in kompakter JSONL-/Exportstruktur.
- Solar-/Netzanteil pro Ladevorgang weiter präzisieren.
- Tageswechsel und Neustart-Persistenz weiter härten.
- Exportbasis für Betreiberberichte erweitern.
- Keine OCPP-only-Abhängigkeit; Datenmodell bleibt herstellerneutral.

## 0.8.27 – Betreiberexport und Bericht

- CSV-Export um Zeitraumfilter vorbereiten.
- Monatswerte für Betreiber und Stationen.
- Letzte Sessions je Station/LP als Bericht.
- Fehler-/Diagnoseansicht im App-Center.

## 0.8.28 – NL-Basis und P1/DSMR-Mapping

- Niederlande-Profil erweitern.
- P1/DSMR Import/Export-Mapping.
- Teruglevering-/Eigen-verbruik-Anzeige.
- Saldering-Exit-Vorbereitung.

## 0.8.29+ – Mesh/Microgrid Grundlage

- Energy-Node-Modell.
- Cluster-/Microgrid-Übersicht.
- Local-First-Strategie.
- Nachbarschafts-/Energy-Hub-Vorbereitung für EOS.
