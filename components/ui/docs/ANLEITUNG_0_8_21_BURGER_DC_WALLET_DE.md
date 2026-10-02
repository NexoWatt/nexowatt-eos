# NexoWatt UI 0.8.21 – Burger-Menü, DC Station Display und Energie-Wertkonto

## Ziel der Version

Version 0.8.21 härtet die Bedienoberfläche nach dem 0.8.20-Funktionsausbau. Der Fokus liegt auf drei Punkten:

1. Das Burger-Menü im Frontend öffnet wieder zuverlässig.
2. Das DC Station Display bleibt pro angelegter DC-Ladestation eine separate Touch-Seite mit Bedienung je zugeordnetem LP/Connector.
3. Das Energie-Wertkonto nutzt dynamische Zeittarife, wenn sie aktiv und verfügbar sind; feste Preisannahmen liegen im Nutzerfrontend unter **Einstellungen**.

## Burger-Menü prüfen

Nach Installation der Version:

1. Adapter neu starten.
2. Browsercache/Service Worker aktualisieren oder die Seite einmal hart neu laden.
3. LIVE-Seite öffnen.
4. Burger-Menü antippen.
5. History, EVCS, SmartHome und Settings ebenfalls kurz prüfen.

Erwartung:

- Das Menü öffnet beim ersten Klick.
- Es schließt nicht sofort wieder.
- Escape oder Klick außerhalb schließen das Menü.

Technischer Hintergrund: App-Seiten und Reports markieren ihren Menübutton über `nwMenuBound`/`nwAppMenu`. Die gemeinsame Shell bindet nur noch als Fallback, wenn keine Seite den Button übernommen hat.

## DC Station Display

Die Display-Seite bleibt pro Station erreichbar unter:

```text
/display/station/<TOKEN>
```

Pro angelegter DC-Station werden nur die zugeordneten LPs/Connectoren angezeigt.

Jede LP-Kachel kann abhängig von Freigabe und Gerätedaten bedienen:

- Regelung An/Aus
- Modus Auto / Boost / Min+PV / PV
- Speicher schützen / mitnutzen
- Ziel-Laden
- Start/Stop bzw. herstelleroffener Command-Intent

Die AC-Phasenumschaltung wird nur angezeigt, wenn der LP als AC erkannt ist und eine Phasenumschaltung konfiguriert ist. DC-Ladepunkte zeigen keinen fachlich falschen Phasenblock.

## Energie-Wertkonto und dynamische Tarife

Das Energie-Wertkonto nutzt folgende Logik:

1. Ist der dynamische Zeittarif aktiv und liefert aktuell einen gültigen Preis, wird dieser Preis für vermiedenen Netzbezug verwendet.
2. Ist kein dynamischer Preis verfügbar, wird der feste Netzstrompreis aus dem Nutzerfrontend verwendet.
3. Einspeise-/Rücklieferwert und Solar-Ladepunktwert bleiben feste Annahmen aus dem Nutzerfrontend.

Die Werte liegen im Frontend unter:

```text
Einstellungen → Dynamische Zeittarife → Energie-Wertkonto Preise
```

Dort pflegt der Nutzer/Betreiber:

- Fester Netzstrompreis (€/kWh)
- Einspeise-/Rücklieferwert (€/kWh)
- Solar-Ladepunktwert (€/kWh)

Datenpunkt-Verknüpfungen und Installer-Freigaben bleiben weiterhin im App-Center/Adminbereich.

## Empfohlene Prüfung nach Update

- LIVE-Dashboard laden.
- Burger-Menü testen.
- Einstellungen öffnen und Energie-Wertkonto-Preise prüfen.
- Dynamischen Tarif aktivieren/deaktivieren und kontrollieren, ob das Wertkonto den richtigen Preisstatus anzeigt.
- DC Station Display mit einem Station-Token öffnen.
- Je LP prüfen, ob die Bedienblöcke erscheinen.
- Bei DC prüfen, dass kein AC-Phasenblock angezeigt wird.

