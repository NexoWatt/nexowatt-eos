# NexoWatt UI Roadmap ab 0.8.15 – Home, EOS und Energie-Wertkonto

## Grundsatz

Home bleibt die stabile Einzelanlagen-Version. EOS erweitert diese Basis additiv um Betreiber-, Abrechnungs-, Ladepunkt-, Mesh- und Microgrid-Funktionen.

Das normale Frontend ist ausschließlich Nutzerbereich: anzeigen, verstehen, bedienen. Einstellungen, Datenpunkt-Verknüpfungen, Preise, Länderprofil, Kiosk-Token und Betreiberregeln bleiben im Installer/App-Center.

## 0.8.15 – Energie-Wertkonto als Home-Basis

Ziel: Der Endkunde sieht, was seine erzeugte Energie bringt.

Umgesetzt/geplant in dieser Stufe:

- `energyWallet` als Home- und EOS-Feature.
- `energyWallet.*` Runtime-States für Tageswerte.
- Preisannahmen im Installerbereich.
- Nutzerkarte im LIVE-Frontend.
- Home erhält das vollständige Energie-Wertkonto für Einzelanlagen.
- EOS behält spätere Betreiber-Erweiterungen.

Home-Werte:

- PV-Wert heute.
- lokale Nutzungsquote.
- vermiedener Netzbezug.
- Einspeisewert.
- Speicherwert.
- Solar-Ladepunktwert.
- einfache Erklärung für Endkunden.

EOS bleibt vorbereitet für:

- Local kWh Ledger.
- Ladepunkt-Kiosk.
- Solar-Charge-Abrechnung.
- Betreiberexporte.
- Mesh/Microgrid.
- NL-Saldering/Energy-Hub.

## 0.8.16 – Wallet-Härtung und Historie

- Tageswerte robuster über Neustarts fortführen.
- Monats-/Jahreswerte ergänzen.
- optionale History-/Influx-Auswertung prüfen.
- Darstellung im LIVE-Frontend mobil weiter optimieren.
- Plausibilitätsprüfung für Preisannahmen im Installerbereich.

## 0.8.17 – Charge Kiosk Basis für EOS

- isolierte Ladepunktseite `/kiosk/charge/<token>`.
- keine Navigation in andere Bereiche.
- Token-Verwaltung nur im Installer/App-Center.
- Start/Stop/Solar/Schnellladen nur über sichere Backend-Gates.
- Home sieht diese Funktion nicht.

## 0.8.18 – Local kWh Ledger für EOS

- kWh-Zuordnung nach Quelle und Nutzung.
- Ladepunkt-Session-Anteile.
- Tages-/Session-Zusammenfassungen als States.
- Details nicht als Massen-States, sondern als Datei/Repository.
- CSV-Export vorbereiten.

## 0.8.19 – Niederlande-Basis

- P1/DSMR-Mappingfelder.
- NL-Begriffe im CountryProfile.
- Teruglevering/Netafname-Anzeigen.
- Saldering-Exit-Auswertung vorbereiten.

## 0.8.20 – Mesh/Microgrid Datenmodell

- lokale Energie-Knoten.
- Cluster-/Microgrid-States.
- Local-First/Grid-Last-Strategie.
- Netzlimit je Verbund.
- spätere Nachbarversorgung vorbereiten.

## Lizenzgrenzen

| Funktion | Home | EOS |
|---|---:|---:|
| Energie-Wertkonto Einzelanlage | ja | ja |
| Preisannahmen im Installer | ja | ja |
| Local kWh Ledger | nein | ja |
| Ladepunkt-Kiosk | nein | ja |
| Solar-Charge-Abrechnung | nein | ja |
| Mesh/Nachbarschaft | nein | ja |
| Microgrid/Energy-Hub | nein | ja |
| NL Saldering Pro | nein | ja |

