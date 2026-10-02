# 0.7.60 – TypeScript-Energiefluss-Helfer

Diese Version ist der nächste kleine TypeScript-Migrationsschritt nach 0.7.59.

## Ziel

Wir bereiten die spätere Migration der Energiefluss- und Speicher-DP-Resolver vor,
ohne die produktive Runtime zu verändern.

## Neue TypeScript-Dateien

- `src-ts/utils/energy-flow.ts`
- `src-ts/tests/energy-flow-utils-smoke.ts`

## Wichtige fachliche Regeln

- Split-DPs für Speicher-Laden/-Entladen sind gültig.
- Signed Speicher-DPs sind gültig.
- `0 W` ist ein gültiger Messwert und darf nicht als fehlend behandelt werden.
- Rechenfallback darf nur greifen, wenn kein echter Speicher-DP konfiguriert ist.
- Netz kann signed oder als Import/Export-Split geliefert werden.

## Keine Funktionsänderung

Die produktiven JavaScript-Dateien `main.js`, `www/app.js`, `core-limits.js` und
`heating-rod-control.js` nutzen diese TypeScript-Helfer in 0.7.60 noch nicht.

Der Adapter verhält sich deshalb zur Laufzeit wie 0.7.59. Die neuen Helfer sind
Vorbereitung und Typecheck-Basis für spätere Migrationsversionen.
