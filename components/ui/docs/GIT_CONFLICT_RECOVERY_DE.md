# Git-Konflikte sauber lösen

Diese Datei erklärt, wie wir während der TypeScript-Migration mit lokalen Git-Konflikten umgehen.

## Warum das wichtig ist

Wenn eine ZIP-Version über einen bereits geänderten Arbeitsbaum kopiert oder ein Branch gemerged wird, kann Git Dateien als **unmerged** markieren. Dann ist kein Commit möglich. Das ist ein lokaler Git-Zustand und nicht automatisch ein Adapter-Runtime-Fehler.

## Prüfen

```bash
npm run check:conflicts
```

Der Check prüft:

- offene Git-Konfliktdateien im Index
- echte Konfliktmarker in Projektdateien

## Sicherer Ablauf beim Übernehmen einer neuen ZIP-Version

1. Lokale Änderungen committen oder stashen.
2. Keine ZIP über einen laufenden Merge kopieren.
3. Bei Konflikten zuerst `git status` ansehen.
4. Konflikte bewusst lösen.
5. Danach ausführen:

```bash
npm run check:conflicts
npm run publish:check
```

## Wenn der Arbeitsbaum bereits blockiert ist

Wenn Git meldet: `Committing is not possible because you have unmerged files`, dann gibt es zwei sichere Wege.

### Variante A: Merge abbrechen, wenn keine lokalen Änderungen behalten werden müssen

```bash
git merge --abort
```

Wenn das nicht geht:

```bash
git reset --merge
```

### Variante B: aktuellen Stand verwerfen und sauber mit ZIP neu starten

Nur nutzen, wenn lokale Änderungen vorher gesichert sind:

```bash
git reset --hard
git clean -fd
```

Danach die neue ZIP in einen frischen Ordner entpacken oder die Dateien sauber übernehmen.

## Wichtig

Nicht blind `git add .` ausführen, solange Git noch unmerged files meldet. Erst Konflikte lösen, dann add/commit.
