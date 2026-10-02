# NexoWatt UI 0.8.33 – App-Center Struktur-Cleanup

## Ziel

Diese Version räumt den Installer-/App-Center-Bereich auf. Das App-Center folgt ab jetzt einer festen Sortierregel:

```text
Apps        = echte Funktionsmodule aktivieren/deaktivieren
Zuordnung   = Datenpunkte, Länderprofil, Markt-/P1-/DSMR-Mapping
Ladepunkte  = Ladepunkt-, Stations- und Displayseiten-Konfiguration
Status      = Runtime-/Diagnoseinformationen
Eigene Tabs = große Spezialmodule, wenn sie sonst zu unübersichtlich würden
```

## Geändert

### Reiter „Apps“

Der Apps-Reiter zeigt nur noch Funktionsmodule und deren Installiert/Aktiv-Schalter. Reine Mapping-/Stationskarten wurden entfernt.

### Reiter „Zuordnung“

Folgende Karten liegen jetzt im Reiter Zuordnung:

- System & Marktprofil
- Länderprofil DE/NL
- ioBroker-Systemsprache
- NL P1/DSMR & Teruglevering

### Reiter „Ladepunkte“

Die Konfiguration der DC-Stationsseiten liegt jetzt bei den Ladepunkten:

- EOS DC Station Display
- Stationen anlegen
- Display-Token
- Display-URL
- LP-/Connector-Zuordnung
- Steuerbrücke / Command-State

### Zurück zum Installer

Oben im App-Center gibt es jetzt einen Button:

```text
← Zurück zum Installer
```

Dieser führt zurück zur zentralen Installer-Startseite.

### Speicherfarm

Die Speicherfarm-Konfiguration wurde auf Master-Detail umgestellt:

- links: kompakte Speicherliste
- rechts: Detailformular des ausgewählten Speichers

Damit muss bei mehreren Speichern nicht mehr durch alle Speicher-Formulare untereinander gescrollt werden.

## Wichtig für zukünftige Erweiterungen

Neue Funktionen sollen dieses Schema einhalten. Technische Zuordnungen dürfen nicht wieder in den Apps-Reiter geschoben werden.
