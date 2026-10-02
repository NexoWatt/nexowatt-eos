# NexoWatt UI 0.8.39 – Mesh/Microgrid CommandGuard-Vorbereitung

Diese Version bereitet die spätere Freigabestrecke für Mesh/Microgrid-Aktionen vor.

## Wichtig

- Keine automatische Hardwaresteuerung.
- Keine WR-, Speicher-, Ladepunkt- oder Hersteller-Setpoints.
- Alle geplanten Aktionen bleiben `readOnly=true`, `allowed=false` und `hardwareWrite=false`.

## Neue Diagnose

- `meshMicrogrid.commandGuard.*` States
- Betreiberansicht `/mesh/microgrid` zeigt CommandGuard-Status und blockierte Command-Intents
- API: `/api/mesh/microgrid/command-guard`
- POST `/api/mesh/microgrid/command` ist vorbereitet, blockiert aber mit `commandguard_readonly`.
