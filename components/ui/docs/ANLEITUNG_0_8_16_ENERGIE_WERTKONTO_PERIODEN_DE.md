# NexoWatt UI 0.8.16 – Anleitung Energie-Wertkonto Perioden & Diagnose

Version 0.8.16 erweitert das Energie-Wertkonto für Home und EOS. Das normale Nutzerfrontend bleibt reine Anzeige; alle Preise, Verknüpfungen und Markt-/Länderprofile bleiben im Installer-/App-Center.

## Was neu ist

- Tageswerte bleiben erhalten und werden wie bisher angezeigt.
- Monatswerte werden zusätzlich unter `energyWallet.month.*` geführt.
- Jahreswerte werden zusätzlich unter `energyWallet.year.*` geführt.
- Beim Adapter-Neustart werden Tages-/Monats-/Jahreswerte aus bestehenden ioBroker-States übernommen, sofern der Periodenschlüssel passt.
- Bei Tages-, Monats- oder Jahreswechsel werden nur die jeweils betroffenen Perioden zurückgesetzt.
- Datenqualitäts- und Plausibilitätsdiagnosen verhindern, dass fehlende oder veraltete PV-/Netzwerte blind in Euro-Werte integriert werden.

## Neue wichtige States

### Tageswerte

```text
energyWallet.today.valueEur
energyWallet.today.pvKwh
energyWallet.today.localUseKwh
energyWallet.today.localUsePercent
energyWallet.today.avoidedGridCostEur
energyWallet.today.feedInValueEur
energyWallet.today.storageValueEur
energyWallet.today.evcsValueEur
```

### Monatswerte

```text
energyWallet.month.monthKey
energyWallet.month.valueEur
energyWallet.month.pvKwh
energyWallet.month.localUseKwh
energyWallet.month.localUsePercent
energyWallet.month.avoidedGridCostEur
energyWallet.month.feedInValueEur
energyWallet.month.storageValueEur
energyWallet.month.evcsValueEur
```

### Jahreswerte

```text
energyWallet.year.yearKey
energyWallet.year.valueEur
energyWallet.year.pvKwh
energyWallet.year.localUseKwh
energyWallet.year.localUsePercent
energyWallet.year.avoidedGridCostEur
energyWallet.year.feedInValueEur
energyWallet.year.storageValueEur
energyWallet.year.evcsValueEur
```

### Diagnose

```text
energyWallet.diagnostics.status
energyWallet.diagnostics.warning
energyWallet.diagnostics.dataQualityPercent
energyWallet.diagnostics.lastSkippedReason
energyWallet.diagnostics.missingSourcesJson
energyWallet.diagnostics.staleSourcesJson
energyWallet.diagnostics.clippedSourcesJson
energyWallet.diagnostics.activeSourcesJson
energyWallet.diagnostics.plausibilityJson
```

## Statuswerte

```text
ok             Werte werden normal integriert.
warn           Werte werden integriert, aber es gibt einen plausiblen Hinweis.
waiting-data   PV- oder Netzquelle fehlt; das Modul wartet und integriert nicht blind.
skip-interval  Zeitlücke war zu groß/zu klein; der Tick wurde nicht integriert.
disabled       Energie-Wertkonto ist im Installer deaktiviert.
```

## Nutzerfrontend

Die Energie-Wertkonto-Karte zeigt jetzt zusätzlich:

```text
Wert heute
Wert aktueller Monat
Wert aktuelles Jahr
Datenqualität
Hinweis bei plausiblen Problemen
```

Der Endkunde kann dort nichts konfigurieren.

## Installerbereich

Konfiguration bleibt im App-Center:

```text
Netzstrompreis €/kWh
Einspeisewert €/kWh
Solar-Ladepunktwert €/kWh
Landprofil DE/NL
Datenpunkt-Verknüpfungen
```

## Test nach Installation

1. Adapter 0.8.16 installieren.
2. Adapter starten.
3. App-Center öffnen und prüfen, ob Energie-Wertkonto weiterhin aktiv ist.
4. LIVE-Dashboard öffnen.
5. Prüfen, ob Tages-/Monats-/Jahreswerte angezeigt werden.
6. Prüfen, ob bei fehlenden PV-/Netzdaten keine falschen Euro-Werte hochlaufen.
7. Adapter neu starten und prüfen, ob Monats-/Jahreswerte erhalten bleiben.

## Abgrenzung Home/EOS

Home erhält das vollständige Energie-Wertkonto für Einzelanlagen. EOS bleibt die Erweiterungsebene für Betreiberfunktionen:

```text
Charge Kiosk
Local kWh Ledger
Solar-Charge-Billing
Mesh / Nachbarschaft
Microgrid / Energy Hub
Abrechnung / Export
```
