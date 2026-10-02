# NexoWatt UI 0.8.39 – Mesh/Microgrid CommandGuard-Vorbereitung

## Zweck

Diese Version bereitet die spätere Mesh/Microgrid-Steuerfreigabe vor. Die App bleibt weiterhin read-only: Es werden keine Hardware-Datenpunkte beschrieben.

## Neue Diagnose

In der Betreiberansicht `/mesh/microgrid` werden zusätzlich angezeigt:

- CommandGuard Status
- Safety-Prüfungen
- blockierte Command-Intents
- Blockiergründe
- Bereitschaftswert

## Neue APIs

```text
/api/mesh/microgrid/command-guard
/api/mesh/microgrid/command
```

`/api/mesh/microgrid/command` blockiert in dieser Version jeden POST mit `commandguard_readonly`.

## Produktgrenze

0.8.39 schreibt keine Ladepunkt-, Speicher-, Wechselrichter- oder Hersteller-Setpoints. Die Funktion dient nur zur Diagnose und zur Vorbereitung eines späteren Freigabemodus.
