# NexoWatt UI 0.8.21 – DC-Station-LP-Bedienung, dynamisches Energie-Wertkonto und Burger-Menü-Fix

## Überblick

Version 0.8.21 enthält den vollständigen 0.8.20-Funktionsstand und härtet zusätzlich das Burger-Menü im Frontend.

Enthalten sind:

- DC Station Display mit Bedienung pro zugeordnetem LP/Connector.
- AC-Phasenumschaltung nur bei AC-Ladepunkten mit konfigurierter Phasenumschaltung.
- Herstellerneutrale Display-Steuerung ohne OCPP-Zwang.
- Energie-Wertkonto mit dynamischem Zeittarif.
- feste Preisannahmen im Nutzerfrontend unter Einstellungen.
- Burger-Menü-Härtung gegen doppelte Toggle-Handler.

## DC Station Display

Jede im Installer/App-Center angelegte DC-Station erhält eine separate Display-Seite:

```text
/display/station/<TOKEN>
```

Auf dieser Seite werden nur die LPs/Connectoren angezeigt, die dieser Station zugeordnet sind.

Pro LP sind vorgesehen:

- Regelung aktiv/inaktiv.
- Modus Auto, Boost, Min+PV, PV.
- Speicher schützen/mitnutzen, sofern freigegeben.
- Ziel-Laden, sofern konfiguriert.
- AC-Phasenmodus nur bei AC-Ladepunkten.

DC-Ladepunkte zeigen keinen fachlich falschen 1p/3p-Block.

## Herstellerneutrale Steuerung

Die Display-Seite schreibt nicht direkt auf OCPP- oder Hersteller-Datenpunkte.

Der Ablauf ist:

```text
Display-Button
→ tokenisierte Display-API
→ Station-/LP-Prüfung
→ neutraler NexoWatt-Ladeintent
→ Charging-Management oder generischer JSON-Command-State
→ OCPP / Modbus / MQTT / REST / Herstelleradapter / NexoWatt-Devices
```

Damit bleibt NexoWatt herstelleroffen.

## Energie-Wertkonto und dynamischer Tarif

Das Energie-Wertkonto nutzt jetzt den dynamischen Tarif, wenn:

- der dynamische Tarif im Nutzerfrontend aktiv ist, und
- ein aktueller Tarifpreis verfügbar ist.

Ist kein aktueller dynamischer Tarifpreis verfügbar, nutzt das System den festen Preis aus den Frontend-Einstellungen.

Die Preisannahmen liegen im Nutzerfrontend:

```text
Frontend → Einstellungen → Dynamische Zeittarife / Energie-Wertkonto Preise
```

Dort kann der Betreiber pflegen:

- fester Netzstrompreis in €/kWh.
- Einspeise-/Rücklieferwert in €/kWh.
- Solar-Ladepunktwert in €/kWh.

Datenpunkt-Verknüpfungen bleiben weiterhin im Installer/App-Center.

## Burger-Menü-Fix

Das Burger-Menü wurde gegen doppelte Handler gehärtet.

Hintergrund: Viele Seiten laden eigene Menülogik und zusätzlich `nw-shell.js`. Wenn beide Handler denselben Klick toggeln, öffnet und schließt sich das Menü sofort wieder. Die Shell übernimmt den Menübutton nun im Capture-Flow oder respektiert den markierten LIVE-Handler.

## Test nach Installation

Nach dem Update bitte prüfen:

1. Adapter installieren und starten.
2. Browser-Cache/Service Worker aktualisieren.
3. LIVE öffnen und Burger-Menü testen.
4. History öffnen und Burger-Menü testen.
5. EVCS-Seite öffnen und Burger-Menü testen.
6. Im Frontend unter Einstellungen die Energie-Wertkonto-Preise prüfen.
7. Dynamischen Tarif aktivieren und prüfen, ob `energyWallet.configuredPrices.priceSource` auf dynamischen Tarif wechselt, sobald ein aktueller Preis verfügbar ist.
8. DC-Station-Display öffnen und LP-Bedienung prüfen.

## Wichtig

Frontend ist Nutzer-/Bedienbereich.

Installer/App-Center bleibt zuständig für:

- Datenpunkt-Verknüpfungen.
- Station-/LP-Zuordnung.
- Display-Token.
- Hersteller-/Command-State-Brücke.
- Modulfreigaben.
