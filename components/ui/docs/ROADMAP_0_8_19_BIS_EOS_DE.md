# NexoWatt UI Roadmap ab 0.8.19

## 0.8.19 – DC Station Display Session & Betreiberbasis

Ziel: Die Display-Seite wird für reale DC-Ladeprozesse robuster und bekommt eine bessere Session-Auswertung.

Aufgaben:

- Session-Start/Ende sauberer erkennen
- Session-kWh stabilisieren
- Session-Kosten genauer berechnen
- PV-Anteil pro Session verbessern
- letzte Session pro LP anzeigen
- Session-Status für beendet/abgebrochen/Fehler vorbereiten
- Exportgrundlage für spätere Abrechnung vorbereiten
- Display-Fehlertexte für reale DC-Zustände erweitern

## 0.8.20 – Local kWh Ledger Basis

Ziel: Lokale kWh-Zuordnung für PV, Speicher, EVCS und Netz.

Aufgaben:

- EnergyLedgerModule in TypeScript
- Tages-Summen als States
- Detaildaten nicht als ioBroker-Massenstates, sondern intern speichern
- EVCS-Session an Ledger anbinden
- Solar-/Netzanteile pro Ladevorgang erfassen
- CSV-Export vorbereiten

## 0.8.21 – Niederlande-Basis erweitern

Ziel: NexoWatt für den NL-Einsatz vorbereiten.

Aufgaben:

- DSMR/P1-Mapping im App-Center erweitern
- P1-Import/Export normalisieren
- NL-Begriffe im Frontend und App-Center ausbauen
- Saldering-/Teruglevering-Auswertung vorbereiten
- NL-spezifische Hinweise im Energie-Wertkonto

## 0.8.22 – Mesh-/Microgrid-Datenmodell

Ziel: Mehrere Anlagen, Ladepunkte, Speicher und Verbraucher als lokaler Energieverbund.

Aufgaben:

- MeshNode-Modell
- Cluster-Modell
- Local-First-Strategie
- Netzlimit je Cluster
- Knoten-Prioritäten
- Microgrid-Statusstates
- erste EOS-Ansicht für lokale Energieverbünde

## 0.8.23 – EOS Betreiberfunktionen

Ziel: Betreiber-/Gewerbefunktionen oberhalb Home.

Aufgaben:

- Betreiber-Dashboard
- Ladepunkt-Umsatz
- Station-/LP-Auswertung
- Nutzergruppen vorbereiten
- Exportlogik vorbereiten
- Rollen/Rechte für Display/Installer schärfen

## Leitplanken

- Alle fachlichen Änderungen nur in TypeScript.
- Runtime-JS bleibt generiertes Artefakt.
- Frontend bleibt Nutzer-/Displayansicht.
- Verknüpfungen und Einstellungen nur im Installer/App-Center.
- Home bleibt stabil und unverändert in der Komplexität.
- EOS bekommt professionelle Erweiterungen additiv.
