# Roadmap ab NexoWatt UI 0.8.16

## 0.8.16 – erledigt

- Energie-Wertkonto um Tages-/Monats-/Jahresperioden erweitert.
- Persistenz über Neustart, Tageswechsel, Monatswechsel und Jahreswechsel gehärtet.
- Plausibilitäts- und Datenqualitätsdiagnosen ergänzt.
- Nutzerkarte im LIVE-Dashboard um Monatswert, Jahreswert und Datenqualität erweitert.
- Home bleibt Nutzeransicht; Konfiguration bleibt im Installer/App-Center.

## 0.8.17 – nächster Schritt: Charge Kiosk Basis

Ziel: EOS bekommt isolierte Ladepunktseiten für Vor-Ort-Bedienung.

### Geplante Funktionen

```text
/kiosk/charge/<token>
Token je Ladepunkt
isolierte Ansicht ohne Hauptnavigation
Ladepunktstatus
Start / Stop
Solar laden
Schnell laden
PV-Anteil
Session-kWh
Session-Kosten
```

### Installerbereich

```text
Kiosk aktivieren/deaktivieren
Token erzeugen
Ladepunkt zuordnen
erlaubte Modi festlegen
Preisannahmen setzen
```

### Sicherheit

```text
EOS-only Feature-Gate
Token-Prüfung im Backend
kein Zugriff auf App-Center
kein Zugriff auf andere Ladepunkte
Commands nur über CommandGuard
```

## 0.8.18 – Local kWh Ledger

- PV-Anteil pro Ladevorgang.
- Lokale kWh-Zuordnung.
- Tageszusammenfassung.
- CSV-Export vorbereitet.

## 0.8.19 – Niederlande-Basis erweitern

- DSMR/P1 Mapping-Felder.
- Saldering-/Teruglevering-Auswertung.
- NL-Begriffe im Nutzerfrontend.

## 0.8.20 – Mesh/Microgrid Datenmodell

- Cluster und Nodes.
- Local First / Grid Last.
- Netzlimit je Verbund.
- Grundlage für Nachbarschaft und Energy Hub.
