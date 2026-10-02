# NexoWatt UI – Roadmap Home/EOS/NL

Stand: 0.8.14

## Grundsatz

Home bleibt die stabile, einfache Nutzer- und Anlagenversion. EOS wird additiv erweitert. Das Kundenfrontend bleibt Nutzeroberfläche; Konfiguration, Datenpunkt-Verknüpfungen und Markt-/Länderprofil liegen ausschließlich im Installer/App-Center.

```text
Home = bestehende Basis + Stabilität + einfache Anzeige
EOS  = Home-Basis + professionelle Erweiterungsmodule
```

## Phase 1 – Fundament im Adapter

Umgesetzt in 0.8.14:

- Länderprofil-Grundlage für DE/NL.
- Übernahme der ioBroker-Systemsprache aus `system.config.common.language`.
- Vorbereitete Feature-Flags für Home/EOS.
- Installer/App-Center-Karte „System & Marktprofil“.
- Runtime-States für Länderprofil und Systemsprache.
- Kundenseiten bleiben frei von Installer-Konfiguration.

## Phase 2 – Energy Wallet Basic/Pro

Nächster sinnvoller Schritt:

- Home: einfache Wertanzeige für erzeugten Strom.
- EOS: detaillierte Wertaufteilung nach Eigenverbrauch, EVCS, Speicher, Einspeisung und lokaler Nutzung.
- Keine Schaltlogik, nur Berechnung und Visualisierung.

## Phase 3 – Charge Kiosk für EOS

- Isolierte Ladepunktseite pro Ladepunkt/Token.
- Keine Navigation zum restlichen System.
- Start/Stop, Solar-Laden, Schnellladen, Preis/kWh, PV-Anteil und Sessionwerte.
- Nur EOS-lizenziert.

## Phase 4 – Local kWh Ledger

- Tages- und Session-Summen als ioBroker-States.
- Detaildaten nicht als riesiger State-Baum, sondern als interne Datei/Exportstruktur.
- Vorbereitung für CSV/PDF-Abrechnung.

## Phase 5 – Niederlande

- DSMR/P1-Mapping über vorhandene ioBroker-Datenpunkte.
- Begriffe: `Netafname`, `Teruglevering`, `Eigen verbruik`.
- Saldering-Exit-Optimierung als EOS-Modul.
- Später Energy-Hub/GTO-Reporting.

## Phase 6 – Mesh/Microgrid

- Lokale Knotenstruktur: Haus, Speicher, Ladepunkte, Wärmepumpe, Nachbarverbrauch, Netzanschlusspunkt.
- Local First / Grid Last Strategie.
- Cluster-/Microgrid-Dashboard.
- Später Multi-EMS-Verbindung über Energy-Intent-Protokoll.
