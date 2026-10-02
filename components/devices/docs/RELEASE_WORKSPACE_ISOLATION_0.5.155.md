# Release-Arbeitsordner-Isolation (0.5.155)

Version 0.5.155 trennt den produktiven Releaseinhalt konsequent von harmlosen
lokalen Altdateien in einem bestehenden Entwicklungsordner.

## Freigegebene Quellen

Der Release-Guard prüft die definierten Stammdateien, `admin/`, `lib/`,
`scripts/`, `docs/`, die Test-Fixtures/-Helper und ausschließlich die im
`test/test-manifest.json` aufgeführten Tests.

## Lokale Altdateien

Zusätzliche Dateien wie `CHANGELOG.md`, `README.de.md`, `NEXOWATT_REVIEW.md`
oder `test/core.test.js` werden als Hinweis protokolliert. Sie werden nicht
ausgeführt und nicht veröffentlicht.

## Paketgrenze

Die npm-`files`-Whitelist schließt `test/` und nicht freigegebene Stammdateien
aus. `.npmignore` enthält eine zweite Schutzschicht. Der Release-Guard blockiert
eine spätere Erweiterung der Whitelist um `test/`, `.` oder breite Wildcards.

## Weiterhin harte Blocker

Merge-Konflikte, ungültiges JSON, fehlende Manifesttests, JavaScript-
Syntaxfehler, abweichende Manifestversionen, Template-/Alias-Regressionen und
fehlgeschlagene freigegebene Tests führen weiterhin zum Abbruch.
