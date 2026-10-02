# Anleitung 0.8.15 – Home/EOS Feature-Flags und Energie-Wertkonto

## Zweck der Version

Version 0.8.15 härtet die Lizenz- und Feature-Trennung zwischen Home und EOS. Außerdem wird das Energie-Wertkonto als Home- und EOS-Funktion vorbereitet.

## Installation

1. ZIP über ioBroker installieren.
2. Adapterinstanz neu starten.
3. App-Center im Admin öffnen.
4. Lizenzstatus prüfen.
5. LIVE-Frontend öffnen und prüfen, dass keine Installer-Funktionen im Nutzerbereich sichtbar sind.

## Was sich für Home ändert

Home bleibt die Einzelanlagen-Version. Das Energie-Wertkonto ist jetzt in der Lizenzlogik für Home freigegeben.

Noch wichtig: In 0.8.15 werden noch keine echten Euro-Werte im Nutzerfrontend angezeigt. Die Version legt den stabilen State- und Lizenzvertrag dafür an.

## Was sich für EOS ändert

EOS behält alle Home-Funktionen und zusätzlich die Betreiberfunktionen:

- Local kWh Ledger
- Charge Kiosk
- Solar Charge Billing
- Mesh
- Microgrid
- Nachbarschaft / Community
- Multi-Site Wallet
- NL Energy Hub
- AI Autopilot

Diese Funktionen sind weiterhin EOS-only.

## Neue States

```text
energyWallet.enabled
energyWallet.editionScope
energyWallet.mode
energyWallet.status
energyWallet.hint
energyWallet.featureJson
energyWallet.runtime.lastUpdateTs
energyWallet.today.valueEur
energyWallet.today.localUsePercent
energyWallet.today.avoidedGridCostEur
energyWallet.today.feedInValueEur
energyWallet.today.evcsValueEur
energyWallet.today.storageValueEur
```

## Installer-/Frontend-Trennung

Im Nutzerfrontend sollen später nur Werte und Empfehlungen sichtbar sein.

Konfiguration bleibt im Installer/App-Center:

- Strompreise
- Einspeisevergütung
- Wallet aktiv/inaktiv
- Datenpunkt-Verknüpfungen
- Länderprofil
- Ladepunkt-/Kiosk-Preise

## Testcheckliste

```text
Home-Lizenz aktiv: Energie-Wertkonto-App im App-Center nicht blockiert
Home-Lizenz aktiv: EOS-only Apps bleiben blockiert
EOS-Lizenz aktiv: alle Apps freigegeben
energyWallet.* States werden erzeugt
countryProfile.* States bleiben vorhanden
system.language wird weiter aus ioBroker übernommen
LIVE-Frontend zeigt keine Installer-Konfiguration
```
