# Git-Repository – Sicherheitshinweis

Der NexoWatt-EOS-Quellcode ist proprietär. Ein Repository dafür muss **privat** angelegt und vor dem ersten Push nochmals auf die Sichtbarkeit **Private** geprüft werden.

Die Release-ZIP enthält bewusst keinen `.git`-Ordner und führt keine Git-Befehle aus. Vor einem Push sind mindestens zu prüfen:

```text
- Repository-Sichtbarkeit: Private
- node_modules nicht eingecheckt
- .env, .npmrc, Zertifikate und Schlüssel nicht eingecheckt
- git status und git diff vollständig kontrolliert
```

Kein Quellcode darf in ein öffentliches Repository gepusht werden.

## Übernahme der Struktur ab 1.0.9

Die vollständige ZIP enthält alle Quell- und Laufzeitdateien. Alle Markdown-Dateien
liegen unter `docs/`. Beim Übernehmen in einen bestehenden Checkout müssen die
Verschiebungen auch als Löschungen der alten Pfade erfasst werden; der vorhandene
Git-Verlauf bleibt erhalten. `node scripts/verify-docs-layout.cjs` findet verbliebene
Markdown-Dateien außerhalb von `docs/` und ungültige Dokumentationslinks.

Die automatische GitHub-Übernahme dieser Ausgabe konnte nicht durchgeführt
werden: Die verbundene Integration meldete HTTP 403, „Resource not accessible
by integration“. Es wurde kein Remote-Commit und kein Pull Request angelegt.
