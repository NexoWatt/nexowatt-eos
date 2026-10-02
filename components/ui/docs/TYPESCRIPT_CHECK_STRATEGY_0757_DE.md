# TypeScript-Prüfstrategie ab 0.7.57

## Ziel

Die TypeScript-Typverträge sollen im Projekt und in GitHub/CI geprüft werden, ohne dass ein lokales `npm publish` an einem fehlenden `tsc` scheitert.

## Warum diese Änderung nötig ist

In 0.7.56 war `publish:check` so aufgebaut:

```bash
node scripts/verify-publish.js && npm run typecheck
```

Dadurch konnte `npm publish` auf Windows fehlschlagen, wenn vorher kein `npm install` oder `npm ci` ausgeführt wurde und deshalb `node_modules/.bin/tsc` nicht vorhanden war.

## Neue Trennung

```bash
npm run publish:check  # prüft Paket, JSON, ioBroker-Metadaten und JS-Syntax
npm run typecheck      # prüft TypeScript-Verträge separat
npm run test:all       # führt beides zusammen aus
```

## Regel

- Lokaler Publish-Check bleibt npm-stabil.
- GitHub/CI führt weiterhin `publish:check`, `typecheck` und `npm pack --dry-run` aus.
- Vor offiziellen npm-Releases muss in CI alles grün sein.

## Wichtig für spätere TypeScript-Migration

Wenn produktive JavaScript-Logik nach TypeScript migriert wird, muss der Buildprozess separat eingeführt werden. Bis dahin bleiben die TypeScript-Dateien unter `src-ts/` reine Typverträge und werden nicht zur Laufzeit geladen.

## Ergänzung ab 0.7.58

`publish:check` bleibt weiterhin ohne `tsc`, damit lokale npm-/Publish-Prüfungen nicht an fehlenden Dev-Dependencies scheitern. Für GitHub/Entwicklung gibt es zusätzlich:

```bash
npm run test:contracts
npm run typecheck
npm run build:types
npm run test:all
```

Damit ist TypeScript ein Qualitätscheck im Entwicklungsworkflow, ohne die produktive Adapterauslieferung zu blockieren.
