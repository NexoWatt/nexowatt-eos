# Regression-Testgerüst für NexoWatt UI

Diese Tests sind in 0.7.58 noch ein **Gerüst** und greifen nicht in die produktive
Adapterlogik ein. Ziel ist, die kritischen Fälle festzuhalten, bevor wir echte
JavaScript-Logik nach TypeScript migrieren.

## Kritische Testbereiche

- Speicher signed DP
- Speicher getrennte Lade-/Entlade-DPs
- Speicher 0 W bleibt gültig
- kein Speicher-DP → rechnerischer Fallback nur mit belastbarer Bilanz
- EVCS ohne echte Wallbox bleibt unsichtbar
- Speicherfarm ohne echte Farm bleibt unsichtbar
- Lizenz-Key darf nicht durch maskierte Werte überschrieben werden
- Heizstab-Speicherreserve bleibt gespeichert

Diese Fälle werden in den nächsten Migrationsversionen schrittweise in echte
Unit-/Integration-Tests überführt.
