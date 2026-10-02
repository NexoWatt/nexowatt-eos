# NexoWatt UI Roadmap ab 0.8.15 – Home, EOS und Energie-Wertkonto

## Leitentscheidung

Home bleibt die stabile Einzelanlagen-Version. EOS erweitert diese Basis um Betreiber-, Abrechnungs-, Kiosk-, Mesh- und Microgrid-Funktionen.

Das Energie-Wertkonto gehört ab 0.8.15 strategisch in **Home und EOS**:

- Home zeigt den Wert der eigenen Einzelanlage: PV-Wert, Eigenverbrauchswert, Speicherwert, Wallboxwert und Einspeisewert.
- EOS nutzt dieselbe Wertbasis später zusätzlich für Local kWh Ledger, Ladepunkt-Kiosk, Solar-Charge-Umsatz, Nachbarschaft, Mesh, Microgrid und Betreiber-Auswertungen.

## 0.8.15 – umgesetzt

- zentrale Feature-Flags für Home/EOS vorbereitet und gehärtet
- Energie-Wertkonto als Home+EOS-Funktion eingeordnet
- EOS-only Abgrenzung für Ledger, Kiosk, Mesh, Microgrid, Multi-Site und Billing festgelegt
- App-Center erhält die App `Energie-Wertkonto`
- Konfigurationshoheit bleibt im Installerbereich
- normales Frontend bleibt Nutzerbereich

## 0.8.16 – nächster empfohlener Schritt

Energie-Wertkonto weiter ausbauen:

- Installer-Felder für Strompreis, Einspeisewert, Wallboxwert und Speicherbewertung
- Home-Kachel im Nutzerfrontend: Wert heute/Monat/Jahr und Aufteilung
- EOS-Vorbereitung für Betreiber-Aufteilung, aber noch ohne Abrechnung

## 0.8.17

Charge-Kiosk Basis:

- isolierte Ladepunktseite per Token
- keine Navigation, keine Admin-Funktionen
- Start/Stop, Solar laden, Schnell laden
- Preis-/PV-Anteil nur nach Installer-Konfiguration

## 0.8.18

Local kWh Ledger:

- kWh-Herkunft und kWh-Nutzung intern dokumentieren
- Summen als States, Details als Datei/Export
- CSV-Export vorbereiten

## 0.8.19

Niederlande-Basis erweitern:

- DSMR/P1-Mappingfelder
- NL-Begriffe und Saldering-Exit-Auswertung
- Teruglevering-/Netafname-Logik

## 0.8.20

Mesh/Microgrid Datenmodell:

- Energy Nodes
- Cluster
- Local First / Grid Last
- Netzlimit pro Verbund
- Microgrid-Dashboard für EOS

## Feste Regel

Frontend = Nutzerbedienung und Anzeige.  
Installer/App-Center = Einstellungen, Verknüpfungen, Länderprofil, Preise, Kiosk-Token und Profi-Konfiguration.
