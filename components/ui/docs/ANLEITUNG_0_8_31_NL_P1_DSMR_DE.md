# NexoWatt UI 0.8.31 – Niederlande P1/DSMR & Teruglevering-Basis

## Ziel

Version 0.8.31 ergänzt die Niederlande-Basis für P1/DSMR-Zählerdaten. Das Modul normalisiert vorhandene ioBroker-Datenpunkte aus P1-/DSMR-Adaptern oder NexoWatt-Devices in gemeinsame NexoWatt-States.

Wichtig: Das Modul ist **read-only**. Es schaltet keine Hardware, setzt keine Wechselrichterwerte und aktiviert keine Einspeisebegrenzung. Die Einspeisebegrenzung bleibt im Export Guard und benötigt weiterhin eine separate Installerfreigabe.

## Einrichtung im Installer/App-Center

1. App-Center öffnen.
2. Unter **System & Marktprofil** das Länderprofil auf **Niederlande** setzen.
3. In der Karte **NL P1/DSMR & Teruglevering** die gewünschten Datenpunkte mappen:
   - Importleistung / Netafname W
   - Exportleistung / Teruglevering W
   - Signed Netzleistung optional, mit Import positiv und Rücklieferung negativ
   - Importenergie kWh total
   - Exportenergie kWh total
   - Gas m³ optional
   - aktiver Tarif optional
4. Speichern und Adapter neu starten oder auf den nächsten EMS-Tick warten.

## Neue States

Wichtige States:

```text
nl.p1.importPowerW
nl.p1.exportPowerW
nl.p1.netPowerW
nl.p1.importEnergyKwhTotal
nl.p1.exportEnergyKwhTotal
nl.p1.today.importKwh
nl.p1.today.exportKwh
nl.teruglevering.valueTodayEur
nl.teruglevering.costTodayEur
nl.teruglevering.netValueTodayEur
nl.saldering.directUseKwhToday
nl.saldering.returnedKwhToday
nl.saldering.netAfnameKwhToday
nl.saldering.localUsePotentialKwhToday
nl.saldering.exitRiskEurToday
```

## Energy Wallet Verbindung

Das Energie-Wertkonto bekommt eine neue Referenzbrücke:

```text
energyWallet.nlBridge.summaryJson
```

Diese Brücke ist nur eine Anzeige-/Referenzverbindung. Die Werte werden nicht erneut in die Wallet-Summen addiert, damit keine doppelte kWh- oder Euro-Zählung entsteht.

## Preise

Der Rücklieferwert nutzt weiterhin die kundennahe Einstellung aus dem Frontend, falls vorhanden. Der Installer-Fallback in der P1-Karte wird nur verwendet, wenn keine kundennahe Einstellung vorhanden ist.

## Export Guard

Der Export Guard bleibt getrennt:

```text
Netzlimits → Einspeisebegrenzung / Export Guard
```

P1/DSMR normalisiert nur Messwerte. Eine Begrenzung auf 0 W oder ein anderes Einspeiselimit wird nur durch den Export Guard mit Installerfreigabe aktiv.
