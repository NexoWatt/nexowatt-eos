# Energiefluss-Regressionen für die TypeScript-Migration

Diese Datei beschreibt, warum wir vor der produktiven Migration der Energiefluss-
Resolver zuerst Regressionen aufbauen.

## Kritische Regel

Ein gemappter Speicher-DP ist Quelle der Wahrheit:

```text
signed DP vorhanden     -> signed DP nutzen
Split-DPs vorhanden     -> Split-DPs nutzen
kein Speicher-DP        -> erst dann Bilanz-Fallback nutzen
0 W                     -> gültiger Messwert, nicht fehlend
```

## Warum das wichtig ist

Fehler in dieser Logik verfälschen:

- LIVE-Energiefluss
- Gebäudeverbrauch
- Heizstab-Budget
- KI-Berater
- History-Werte

Besonders History darf keine erfundenen Ersatzwerte schreiben, wenn ein echter Speicher-DP
konfiguriert ist.

## Nächster Schritt

Aus den TypeScript-Fällen in `src-ts/quality/energy-flow-regression-cases.ts` sollen später
echte Unit-Tests werden. Erst danach wird produktive Speicher-/Netzauflösung schrittweise
nach TypeScript migriert.
