# NexoWatt UI 0.8.53 – Audit-/Regression-Fix

## Zweck

Diese Version enthält keine neue EMS-Regelstrecke. Sie korrigiert Prüf-/Regressionsthemen aus dem 0.8.51/0.8.52-Stand.

## Korrigiert

- alte Versionsanker in Mesh-/0-Einspeise-Testskripten
- NL P1/DSMR-Test nach App-Center-Struktur-Cleanup
- Local kWh Ledger Read-only-Hinweis im App-Center
- Runtime-TS-Spiegel für `www/ems-apps.js`

## Wichtig

Die Produktlogik bleibt unverändert:

```text
0-Einspeisung = bestehender Export Guard / Grid Constraints
Mesh/Microgrid = separate EOS-App
Apps-Reiter = nur App-Katalog
keine direkten Hardwarewrites aus Mesh/Microgrid
```

## Prüfstatus

Geprüft wurden Runtime-Syntax, Runtime-TS-Quelle, Runtime-Mirrors, Publish-Metadaten, App-Center-Struktur, 0-Einspeise-Senkenreihenfolge, Mesh/Microgrid-Regressionen, DC Station Display, Burger-Menü und Export-Guard-Diagnose.
