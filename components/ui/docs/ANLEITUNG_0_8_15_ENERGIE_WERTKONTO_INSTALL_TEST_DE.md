# Anleitung 0.8.15 – Installation und Test Energie-Wertkonto

## Ziel der Version

Version 0.8.15 führt das Energie-Wertkonto als Home- und EOS-Funktion ein. Home erhält das vollständige Wertkonto für Einzelanlagen. EOS bleibt die Erweiterungsebene für Betreiberfunktionen wie Ledger, Ladepunkt-Kiosk, Abrechnung, Mesh und Microgrid.

## Grundregel

Das normale Frontend ist Nutzerbereich. Dort werden nur Werte, Hinweise und Bedienfunktionen angezeigt. Einstellungen, Preise, Landprofil und Datenpunkt-Verknüpfungen bleiben im Installer/App-Center.

## Installation

1. ZIP in ioBroker installieren oder vorhandene Testinstanz aktualisieren.
2. Adapter starten.
3. LIVE-Frontend öffnen.
4. App-Center als Installer/Admin öffnen.
5. Prüfen, dass die ioBroker-Systemsprache übernommen wird.
6. Prüfen, dass das Länderprofil DE/NL im Installerbereich auswählbar bleibt.

## App-Center Prüfung

Im App-Center muss die App **Energie-Wertkonto** sichtbar sein. Sie ist für Home und EOS freigegeben.

Preisannahmen bleiben Installer-Konfiguration. Standardwerte:

- Netzbezug: 0,35 €/kWh
- Einspeisewert: 0,08 €/kWh
- Solar-Laden: 0,35 €/kWh

## Nutzerfrontend Prüfung

Im LIVE-Frontend soll die Karte **Energie-Wertkonto** erscheinen, sobald das Modul aktiv ist und States vorliegen.

Angezeigt werden können:

- Wert heute
- lokale Nutzungsquote
- vermiedener Netzbezug
- Einspeisewert
- Speicherwert
- Solar-Ladepunktwert
- kurze Erklärung für Endkunden

## Neue States

Wichtige neue Runtime-States:

```text
energyWallet.enabled
energyWallet.editionMode
energyWallet.status
energyWallet.explanation
energyWallet.summaryJson
energyWallet.today.valueEur
energyWallet.today.pvKwh
energyWallet.today.localUseKwh
energyWallet.today.localUsePercent
energyWallet.today.gridImportKwh
energyWallet.today.gridExportKwh
energyWallet.today.evcsKwh
energyWallet.today.evcsSolarKwh
energyWallet.today.avoidedGridCostEur
energyWallet.today.feedInValueEur
energyWallet.today.storageValueEur
energyWallet.today.evcsValueEur
energyWallet.today.potentialAdditionalValueEur
```

## Lizenzgrenze

Home:

- Energie-Wertkonto Einzelanlage
- PV-Wert
- Speicher-/EVCS-/Einspeiseanteile
- einfache Endkunden-Erklärung

EOS-only bleibt:

- Local kWh Ledger
- Ladepunkt-Kiosk
- Solar-Charge-Abrechnung
- Nachbarschaftsversorgung
- Mesh/Microgrid
- Betreiberexporte
- NL-Saldering-Profi-Auswertung

## Technischer Hinweis

Das Energie-Wertkonto ist read-only. Es schreibt keine Gerätesollwerte und schaltet keine Verbraucher. Dadurch kann es gefahrlos als erster Home+EOS-Baustein laufen.

## Nach dem Test

Wenn 0.8.15 stabil läuft, ist der nächste logische Schritt 0.8.16:

- Monats-/Jahreswerte ergänzen
- History/Influx-Anbindung prüfen
- Preisannahmen im Installerbereich komfortabler machen
- Wallet-Karte mobil weiter polieren
