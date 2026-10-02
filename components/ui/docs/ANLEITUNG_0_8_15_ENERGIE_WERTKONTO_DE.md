# NexoWatt UI 0.8.15 – Anleitung Energie-Wertkonto

## Ziel

Version 0.8.15 ergänzt das **Energie-Wertkonto** für Home und EOS. Das normale Nutzerfrontend zeigt nur den berechneten Nutzen der Anlage. Alle Einstellungen, Preisannahmen und Verknüpfungen bleiben im Installer-/App-Center.

## Was der Nutzer sieht

Im LIVE-Dashboard erscheint bei vorhandenen PV-Daten eine Karte **Energie-Wertkonto** mit:

- Wert heute in Euro
- lokale Nutzungsquote
- vermiedener Netzbezug
- Einspeisewert
- Speicherwert
- Solar-Ladepunktwert

Das Modul ist rein auswertend. Es schaltet keine Geräte und schreibt keine Hardware-Sollwerte.

## Installer/App-Center

Im Installerbereich wird die App **Energie-Wertkonto** als Home-freigegebene App geführt.

Konfigurierbare Preisannahmen:

- Netzstrompreis in €/kWh
- Einspeisewert in €/kWh
- Solar-Laden-Wert in €/kWh

Diese Werte werden in der Adapterkonfiguration unter `energyWallet` gespeichert. Unterstützte Keys:

```text
energyWallet.enabled
energyWallet.showOnLive
energyWallet.gridImportEurPerKwh
energyWallet.feedInEurPerKwh
energyWallet.importPriceEurPerKwh
energyWallet.feedInPriceEurPerKwh
energyWallet.evcsValueEurPerKwh
energyWallet.recommendationsEnabled
```

## ioBroker States

Das EMS-Modul veröffentlicht unter anderem:

```text
energyWallet.enabled
energyWallet.editionMode
energyWallet.status
energyWallet.lastUpdate
energyWallet.lastExplanation
energyWallet.explanation
energyWallet.summaryJson

energyWallet.today.dayKey
energyWallet.today.valueEur
energyWallet.today.pvKwh
energyWallet.today.localUseKwh
energyWallet.today.localUsePercent
energyWallet.today.gridImportKwh
energyWallet.today.gridExportKwh
energyWallet.today.evcsKwh
energyWallet.today.evcsSolarKwh
energyWallet.today.storageChargeKwh
energyWallet.today.storageDischargeKwh
energyWallet.today.avoidedGridCostEur
energyWallet.today.feedInValueEur
energyWallet.today.evcsValueEur
energyWallet.today.storageValueEur
energyWallet.today.potentialAdditionalValueEur

energyWallet.configuredPrices.gridImportEurPerKwh
energyWallet.configuredPrices.feedInEurPerKwh
```

## Berechnungslogik

Das Modul integriert die aktuellen Leistungswerte zyklisch über die Zeit.

Quellen/Fallbacks:

- PV-Leistung: `ems.budget.pvPowerW`, `pvPower`, `productionTotal`, `derived.core.pv.totalW`
- Netzbezug: `gridBuyPower`, alternativ signed `ems.gridPowerRawW` / `ems.gridPowerW`
- Einspeisung: `gridSellPower`, alternativ signed `ems.gridPowerRawW` / `ems.gridPowerW`
- Ladepunkte: `chargingManagement.control.usedW`, `consumptionEvcs`, `evcs.totalPowerW`, `evcsPower`
- Speicher: `storageChargePower`, `storageDischargePower`, `batteryPower`, `storagePower`

Werte:

- `valueEur` = vermiedener Netzbezug + Einspeisewert
- `avoidedGridCostEur` = lokal genutzte PV-kWh × Netzstrompreis
- `feedInValueEur` = eingespeiste kWh × Einspeisewert
- `storageValueEur` = Speicherladung aus lokalem PV-Anteil × Preis-Spread
- `evcsValueEur` = geschätzter Solar-Ladepunktanteil × Netzstrompreis
- `potentialAdditionalValueEur` = eingespeiste kWh × Differenz zwischen Netzstrompreis und Einspeisewert

## Lizenztrennung

Home enthält das volle Energie-Wertkonto für Einzelanlagen.

EOS bleibt für Betreiberfunktionen vorgesehen:

```text
energyLedger
chargeKiosk
solarChargeBilling
mesh
microgrid
neighborSharing
multiSiteWallet
billingExport
nlSaldering
nlEnergyHub
aiAutopilot
```

## Test nach Installation

1. Adapter 0.8.15 installieren.
2. Adapter starten.
3. Installer/App-Center öffnen.
4. App **Energie-Wertkonto** prüfen.
5. Preisannahmen setzen.
6. LIVE-Dashboard öffnen.
7. Bei PV-Erzeugung prüfen, ob `energyWallet.today.*` States steigen.
8. Prüfen, dass im Nutzerfrontend keine Datenpunkt-Verknüpfungen oder Installerfelder angezeigt werden.

## Hinweis

Das Energie-Wertkonto ist eine transparente Wertberechnung, kein Zahlungswallet und keine Abrechnung. Abrechnungsfähige Ledger-, Kiosk- und Community-Funktionen bleiben für spätere EOS-Module vorgesehen.
