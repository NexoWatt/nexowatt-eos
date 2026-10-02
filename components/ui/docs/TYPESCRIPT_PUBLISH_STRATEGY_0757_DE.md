# TypeScript-/Publish-Strategie ab 0.7.57

## Warum diese Version existiert

In 0.7.56 wurde `publish:check` direkt mit `npm run typecheck` verbunden. Das ist für GitHub/CI gut, kann aber beim lokalen `npm publish` auf Windows fehlschlagen, wenn vorher kein `npm install` gelaufen ist und deshalb `node_modules/.bin/tsc` fehlt.

## Neue Regel

- `npm run publish:check` prüft nur noch JSON, ioBroker-Metadaten, Konfliktmarker und JavaScript-Syntax.
- `npm run typecheck` prüft TypeScript separat.
- `npm run test:all` führt beide Checks plus `npm pack --dry-run` aus.
- GitHub Actions führen immer `npm ci`, `publish:check`, `typecheck` und `npm pack --dry-run` aus.
- `prepublishOnly` nutzt nur `publish:check`, damit ein lokales Publish nicht nur wegen fehlender Dev-Dependencies scheitert.

## Empfohlener Arbeitsablauf

Für GitHub/CI:

```bash
npm ci
npm run publish:check
npm run typecheck
npm pack --dry-run
```

Für manuelles Publish, wenn TypeScript lokal noch nicht installiert ist:

```bash
npm install
npm run test:all
npm publish
```

Wenn nur schnell geprüft werden soll, ob das Paket grundsätzlich publishbar ist:

```bash
npm run publish:check
```

## Wichtig für spätere Migration

TypeScript bleibt Pflicht im CI. Nur der direkte lokale Publish-Befehl wurde entschärft, damit fehlendes `tsc` auf Entwicklerrechnern nicht sofort blockiert.
