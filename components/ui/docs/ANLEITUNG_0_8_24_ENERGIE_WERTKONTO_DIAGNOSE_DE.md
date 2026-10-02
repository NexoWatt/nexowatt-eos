# NexoWatt UI 0.8.24 – Energie-Wertkonto Diagnose & Preisquelle

## Ziel

Version 0.8.24 verfeinert das Energie-Wertkonto im Kundenfrontend. Der Nutzer sieht nur noch verständliche Hinweise, während technische Details für Service und Installer getrennt als Diagnose-States bereitstehen.

## Neue Funktionen

### 1. Kundenhinweis und Installateurdiagnose getrennt

Kundennahe Hinweise stehen unter:

```text
energyWallet.diagnostics.customerWarning
```

Technische Details für Service/Installer stehen unter:

```text
energyWallet.diagnostics.installerWarning
energyWallet.diagnostics.plausibilityJson
energyWallet.diagnostics.staleSourcesJson
energyWallet.diagnostics.clippedSourcesJson
```

Die LIVE-Karte nutzt primär `customerWarning`. Dadurch werden interne Stale-Kandidaten nicht mehr unnötig als gelbe Kundenwarnung angezeigt, wenn die eigentlichen PV-/Netzwerte gültig sind.

### 2. Dynamischer Tarif mit Quelle und Alter

Das Wertkonto veröffentlicht jetzt zusätzlich:

```text
energyWallet.configuredPrices.priceSource
energyWallet.configuredPrices.priceSourceLabel
energyWallet.configuredPrices.currentDynamicPriceSource
energyWallet.configuredPrices.currentDynamicPriceAgeSec
energyWallet.configuredPrices.currentDynamicPriceLastUpdate
energyWallet.configuredPrices.dynamicTariffWarning
```

Wenn der dynamische Tarif aktiv ist, aber kein frischer Preis vorhanden ist, fällt das Wertkonto auf den festen Netzstrompreis aus den Kunden-Einstellungen zurück.

### 3. Preisquelle optional in der LIVE-Karte anzeigen

Im Kundenfrontend gibt es unter den Einstellungen beim Energie-Wertkonto den neuen Schalter:

```text
Preisquelle in LIVE-Karte anzeigen
```

Der State dazu ist:

```text
settings.energyWalletShowPriceSource
```

Ist der Schalter aktiv, zeigt die LIVE-Karte z. B.:

```text
Preisquelle: Dynamischer Zeittarif · 0,312 €/kWh · 8min alt
```

oder:

```text
Preisquelle: Fester Preis aus Einstellungen · 0,350 €/kWh
```

## Bedienung

1. Frontend öffnen.
2. `Einstellungen` öffnen.
3. Zum Bereich `Energie-Wertkonto` gehen.
4. Optional `Preisquelle in LIVE-Karte anzeigen` aktivieren.
5. Feste Preise prüfen: Netzstrompreis, Einspeise-/Rücklieferwert, Solar-Ladepunktwert.

## Wichtig

Technische Datenpunkt-Verknüpfungen bleiben im Installer/App-Center. Kostenannahmen und die Anzeige des Wertkontos bleiben im Kundenfrontend, damit der Kunde selbst entscheiden kann, ob er das Wertkonto nutzen möchte.
