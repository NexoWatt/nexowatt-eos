# NexoWatt UI 0.8.21 – Burger-Menü-Fix und Prüfhinweise

Diese Version härtet das Burger-Menü im Nutzerfrontend und behält die Erweiterungen aus 0.8.20 bei.

## 1. Burger-Menü im Nutzerfrontend

Das Burger-Menü wird jetzt vor den datengetriebenen Dashboard-Modulen initialisiert. Dadurch bleibt die Navigation auch dann nutzbar, wenn einzelne LIVE-, EVCS-, Energy-Wallet- oder Browser-WebView-Initialisierungen fehlschlagen.

Geändert wurde ausschließlich die TypeScript-Runtime-Quelle:

```text
src-ts/runtime-executables/www/app.ts
```

Die ausgelieferte Browserdatei wurde daraus synchron erzeugt:

```text
www/app.js
```

## 2. Bedienung pro LP auf dem DC Station Display

Jede Display-Station besitzt weiterhin eine eigene isolierte Seite:

```text
/display/station/<TOKEN>
```

Die Seite zeigt nur die LPs/Connectoren, die im Installer/App-Center dieser Station zugeordnet wurden. Jede LP-Kachel kann bedient werden, sofern die Station und die jeweilige Freigabe das erlauben.

Die AC-Phasenumschaltung wird nur angezeigt, wenn der Ladepunkt als AC erkannt wurde und eine Phasenumschaltung konfiguriert ist. DC-Ladepunkte zeigen diesen Block nicht.

## 3. Energie-Wertkonto und dynamischer Tarif

Das Energie-Wertkonto nutzt weiterhin die 0.8.20-Preislogik:

1. Dynamischer Zeittarif aktiv und aktueller Preis vorhanden → aktueller Tarifpreis.
2. Kein dynamischer Tarifpreis verfügbar → fester Preis aus Frontend-Einstellungen.
3. Legacy-Konfiguration → Fallback.
4. Sicherheitsfallback.

Die Kostenannahmen liegen im Nutzerfrontend:

```text
Einstellungen → Dynamische Zeittarife → Energie-Wertkonto Preise
```

Im Installer/App-Center bleiben nur Verknüpfungen, Länderprofil, Display-Stationen, Token und Steuerbrücken.

## 4. Tests nach Installation

Nach Installation von 0.8.21 bitte prüfen:

1. LIVE-Dashboard öffnen.
2. Burger-Menü anklicken.
3. Menü muss öffnen und per Außenklick oder Escape schließen.
4. Einstellungen über das Menü öffnen.
5. Dynamischen Tarif aktivieren und festen Fallbackpreis prüfen.
6. DC Station Display öffnen.
7. Je LP Regelung/Modus/Start/Stop prüfen.
8. Sicherstellen: AC-Phasenumschaltung erscheint nur bei AC-Ladepunkten.

