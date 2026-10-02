# TypeScript Cleanup-Strategie ab 0.7.87

## Zweck

Während der vorsichtigen TypeScript-Migration sind bewusst Spiegel, Adapter und Tests
entstanden. Das war sicherer als ein Big-Bang-Umbau, macht die Struktur aber größer.
Ab 0.7.87 wird deshalb aktiv aufgeräumt und jede neue TS-Datei muss einer klaren Rolle
zugeordnet sein.

## Kanonische Quelle

Für jede fachliche Logik gibt es genau eine kanonische TypeScript-Quelle:

- Feature-Sichtbarkeit: `src-ts/backend/feature-visibility/feature-visibility.ts`
- Energiefluss-Resolver: `src-ts/resolvers/energy-flow-resolver.ts`
- Energiefluss-Helfer: `src-ts/utils/energy-flow.ts`
- Core-Limits: `src-ts/ems/core-limits/core-budget.ts`
- Heizstab: `src-ts/ems/heating-rod/heating-rod-decision.ts`

Alle produktiven oder vorbereiteten Änderungen müssen zuerst dort passieren.

## Kompatibilitätsadapter

Ein Kompatibilitätsadapter darf nur alte Imports stabil halten. Er darf keine zweite
Fachlogik enthalten.

Beispiel ab 0.7.87:

- `src-ts/backend/visibility/feature-visibility.ts` bleibt vorerst bestehen,
  ruft aber nur noch `buildFeatureVisibilityState` aus der kanonischen Datei auf.

## Entfernungsregel

Ein Adapter-/Mirror-/Kompatibilitätspfad wird entfernt, wenn:

1. keine Tests und keine Buildskripte mehr daraus importieren,
2. die kanonische Datei produktiv oder in Mirrors genutzt wird,
3. mindestens eine Version ohne Nutzung des alten Pfades erfolgreich getestet wurde.

Bis dahin bleiben solche Dateien sichtbar als `Kompatibilitätsadapter` markiert.

## Keine JS-Artefakte in `src-ts/`

`src-ts/` ist reine TypeScript-Quelle. Gebaute JavaScript-Dateien gehören nur nach:

- `scripts/` für CLI-Spiegel,
- `lib/ts-mirrors/` für Backend/CommonJS-Spiegel,
- `www/static/ts-mirrors/` für Browser-/MJS-Spiegel.

Der Check `npm run check:ts-canonical` verhindert, dass wieder JS-Dateien unter
`src-ts/` landen.

## Warum nicht alles sofort entfernen?

Einige alte Pfade hängen noch an Regressionstests. Diese Tests schützen kritische Fehler
wie EVCS-Sichtbarkeit, Speicherfarm-Sichtbarkeit, 0-Werte und Energiefluss-Fallbacks.
Darum werden alte Pfade kontrolliert auf Adapter reduziert und erst später entfernt.
