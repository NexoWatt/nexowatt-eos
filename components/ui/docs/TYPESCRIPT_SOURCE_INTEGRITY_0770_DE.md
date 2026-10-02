# 0.7.70 – TypeScript-Quellintegrität

Diese Version stabilisiert die TypeScript-Migrationsbasis, bevor neue fachliche
Adapterlogik migriert wird.

## Ziel

Die TS-Dateien unter `src-ts/` müssen vollständig, syntaktisch gültig und für Menschen
lesbar bleiben. In vorherigen Zwischenständen konnten Editor-Fehler wie rote Marker an
`src-ts/utils/*.ts` entstehen. Solche Probleme müssen wir künftig vor jedem Commit
finden.

## Neuer Check

```bash
npm run check:ts-source-syntax
```

Der Check:

- durchsucht alle `.ts`-Dateien unter `src-ts/`,
- nutzt den TypeScript-Parser,
- meldet Datei, Zeile und Spalte bei Syntaxfehlern,
- prüft keine generierten Spiegeldateien.

## Abgrenzung

`check:ts-source-syntax` ist ein schneller Syntaxschutz.

`npm run typecheck` bleibt der vollständige TypeScript-Typcheck.

## Wichtig für spätere Migration

Neue TS-Dateien müssen:

1. in den fachlich passenden Ordner,
2. deutsche Kommentare direkt an den Code-Teilen enthalten,
3. von `check:ts-source-syntax` geprüft werden,
4. durch passenden Typecheck/Runtime-Check abgesichert werden.

## Keine Runtime-Änderung

Diese Version verändert keine produktive Adapterlogik.
