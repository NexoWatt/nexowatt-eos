# NexoWatt UI 0.8.38 – App-Center Strukturhärtung

## Ziel

Der Reiter **Apps** ist ab 0.8.38 verbindlich ein reiner App-Katalog. Dort stehen nur:

- Installiert / Aktiv
- kurze Modulbeschreibung
- optionaler Sprung zum fachlich passenden Reiter oder zur Betreiberansicht

Detailkonfigurationen, Datenpunkt-Mappings, Stationsseiten, Länderprofile und Modul-Detailfelder gehören nicht in den Apps-Reiter.

## Neues Schema

| Bereich | Inhalt |
|---|---|
| Apps | Funktions-App-Katalog, Installiert/Aktiv, Navigationssprung |
| Zuordnung | Länderprofil, P1/DSMR, Datenpunkte, Schnell-Inbetriebnahme |
| Ladepunkte | LPs, Stationen, DC Station Display, Stationsseiten |
| Mesh/Microgrid | Cluster, Knoten, Diagnose, Planung |
| Status | Runtime-/Diagnosewerte |

## Bedienung

1. App-Center öffnen.
2. Im Reiter **Apps** gewünschte App installieren und aktivieren.
3. Den angezeigten Konfigurationssprung nutzen, z. B. „Zu Mesh/Microgrid“.
4. Die Detailkonfiguration im passenden Reiter vornehmen.

## Wichtig für Entwickler

Neue Module dürfen ihre Detailfelder nicht direkt in `buildAppsUI()` einhängen.

Erlaubt im Apps-Reiter:

```text
Installiert/Aktiv
kurzer Text
Navigationsbutton
```

Nicht erlaubt im Apps-Reiter:

```text
Datenpunktfelder
Preise
Stations-/LP-Zuordnungen
Mesh-Knoten
Länderprofil/P1-DSMR
Regelparameter
```

## Tests

Der Strukturtest ist erweitert:

```bash
npm run test:app-center-structure-cleanup
npm run test:no-release-artifacts
```
