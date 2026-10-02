# NexoWatt UI Roadmap ab 0.8.15 – Home, EOS, Energie-Wertkonto

## Grundentscheidung

Home bleibt die stabile Einzelanlagen-Version. EOS erweitert diese Basis um Betreiber-, Ladepunkt-, Ledger-, Mesh-, Microgrid- und NL/Energy-Hub-Funktionen.

Wichtig: Das **Energie-Wertkonto** gehört nicht nur in EOS. Es wird als vollständige Einzelanlagen-Funktion für Home und EOS vorbereitet.

```text
Home = Einzelanlage verstehen, Wert sehen, Empfehlungen bekommen
EOS  = Home + Betreiberlogik + Ledger + Kiosk + Nachbarschaft + Microgrid
```

## 0.8.15 – umgesetzt

- Zentrale Feature-Flags in TypeScript gehärtet.
- HEMS bleibt intern als Legacy-Edition erhalten, wird im Produkt als Home behandelt.
- `energyWalletPro` ist für Home und EOS freigegeben.
- EOS-only bleiben: `energyLedger`, `chargeKiosk`, `solarChargeBilling`, `mesh`, `microgrid`, `neighborSharing`, `multiSiteWallet`, `nlEnergyHub`, `aiAutopilot`.
- Neues EMS-Modul `EnergyWalletModule` legt den State-Vertrag `energyWallet.*` an.
- App-Center enthält die App `Energie-Wertkonto` als Home-freigegebene App.
- Keine Wallet-Konfiguration im normalen Nutzerfrontend.

## 0.8.16 – nächster Fachschritt: echte Wertberechnung

Ziel: Das Energie-Wertkonto soll echte Werte berechnen, aber noch nicht schalten.

Home/EOS Einzelanlage:

```text
energyWallet.today.valueEur
energyWallet.today.avoidedGridCostEur
energyWallet.today.feedInValueEur
energyWallet.today.evcsValueEur
energyWallet.today.storageValueEur
energyWallet.today.localUsePercent
```

Installer/App-Center:

```text
Netzstrompreis ct/kWh
Einspeisevergütung ct/kWh
Wallbox-/Solar-Ladewert ct/kWh
Speicher-Bewertungsmodell
Anzeige aktiv/inaktiv
```

Frontend:

```text
Nur Anzeige: Wert heute, Monat, Jahr, Aufteilung, einfache Empfehlung.
Keine Verknüpfung, keine Preis-Konfiguration, keine Admin-Funktion.
```

## 0.8.17 – Charge Kiosk Basis

EOS-only.

```text
/kiosk/charge/<token>
```

- isolierte Ladepunktseite
- Token im Installerbereich
- Start/Stop
- Solar laden / Schnell laden
- Preis und Session-Werte
- keine Navigation zu anderen Seiten

## 0.8.18 – Local kWh Ledger

EOS-only.

- lokale kWh-Zuordnung
- Ladepunkt-Session-Anteile
- Summen-States
- CSV-Export vorbereiten
- keine tausenden Ledger-Einträge als ioBroker-States

## 0.8.19 – Niederlande-Basis

Home/EOS Marktfähigkeit, EOS mit erweiterter Auswertung.

- P1/DSMR Mappingfelder
- Begriffe: Netafname, Teruglevering, Eigen verbruik
- Saldering-Exit-Auswertung vorbereiten
- kein eigener P1-Gerätetreiber im ersten Schritt

## 0.8.20 – Mesh/Microgrid Datenmodell

EOS-only.

- Knotenmodell
- Cluster-Modell
- Local First / Grid Last
- Netzlimit je Verbund
- später Energy Intent Protocol für mehrere NexoWatt EMS

## Entwicklungsregel

```text
Fachliche Änderungen nur in src-ts/**
Runtime-JS wird generiert
Frontend = Nutzerbereich
Installer/App-Center = Einstellungen und Verknüpfungen
EOS-Funktionen: UI-Gate + API-Gate + Modul-/Command-Gate
```
