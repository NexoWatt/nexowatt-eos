# TypeScript Build-Basis 0.7.58

Diese Version stabilisiert die TypeScript-Grundlage. Sie ersetzt keine produktive JavaScript-Logik.

## Enthaltene Bausteine

- `tsconfig.base.json` als gemeinsame Compiler-Basis.
- `tsconfig.json` für den vollständigen Typecheck unter `src-ts/`.
- `tsconfig.contracts.json` für reine Vertragsprüfung.
- `tsconfig.build.json` für einen Declaration-Build nach `build-ts/types`.
- `scripts/verify-ts-scaffold.js` und `scripts/verify-typescript-scaffold.js` für Strukturchecks.
- Compile-only-Beispiele unter `src-ts/test-fixtures` und `src-ts/tests`.

## Wichtig

Der Adapter startet weiterhin über `main.js`. TypeScript ist in dieser Phase nur Prüf- und Migrationsbasis.
