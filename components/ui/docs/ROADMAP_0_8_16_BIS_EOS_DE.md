# Roadmap ab NexoWatt UI 0.8.15

## 0.8.16 – Energie-Wertkonto härten

- Monats-/Jahreswerte ergänzen
- Persistenz über Tageswechsel verbessern
- Preisquellen aus dynamischen Tarifdaten stärker einbinden
- Home-Karte optisch finalisieren
- Plausibilitätsprüfung für fehlende PV-/Netzwerte ergänzen

## 0.8.17 – Charge Kiosk Basis, EOS-only

- Token-Verwaltung im Installerbereich
- isolierte Ladepunktseite `/kiosk/charge/<token>`
- Start/Stop, Solar-Laden, Schnellladen
- keine Navigation, kein Adminzugriff
- API-Gates und CommandGuard vorbereiten

## 0.8.18 – Local kWh Ledger, EOS-only

- lokale kWh-Zuordnung als interner Ledger
- EVCS-Session-Anteile
- Tageszusammenfassung als States
- CSV-Export vorbereiten
- keine tausenden Einzelstates erzeugen

## 0.8.19 – Niederlande-Basis

- DSMR/P1-Mappingfelder erweitern
- `nl.p1.*` States vorbereiten
- Saldering-/Teruglevering-Analyse
- NL-Begriffe im Nutzerfrontend nutzen

## 0.8.20 – Mesh/Microgrid Datenmodell, EOS-only

- Knotenmodell für Haus, Speicher, Ladepunktgruppe, Wärmepumpe, Nachbarverbrauch
- Cluster-/Microgrid-States
- Local-First/Grid-Last-Strategie
- Netzlimit je Verbund

## Grundregeln

- Fachliche Änderungen nur in TypeScript.
- Nutzerfrontend zeigt nur Status, Nutzen und Bedienung.
- Installer/App-Center enthält Einstellungen, Preise, Verknüpfungen und Token.
- EOS-Features werden dreifach geschützt: UI, API/Backend und EMS-Modulstart.
