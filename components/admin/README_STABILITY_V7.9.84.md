# NexoWatt EOS Admin v7.9.84 – Market-Readiness Runtime Repair

## Ziel

v7.9.84 repariert den vollständigen Frontend-Startpfad nach dem fatalen ESM-Syntaxfehler der v7.9.83 und verschärft die Release-Prüfung so, dass derselbe Fehler sowie fehlende Lazy-Load-Chunks nicht erneut unbemerkt veröffentlicht werden können.

## Wesentliche Korrekturen

- Ungültige JavaScript-Anweisungsgrenze vor `NEXOWATT_NATIVE_SHELL_VERSION` korrigiert.
- Aktive Frontend-Laufzeit vollständig auf cache-sichere v84-Dateinamen umgestellt.
- Fehlende Lazy-Load-Chunks für Adapter-Updates, Konfiguration, Felder und Sentry wiederhergestellt.
- Alle unversionierten Kompatibilitätseinstiege auf v84 umgestellt.
- Echte ES-Modul-Syntaxprüfung für sämtliche ausgelieferten Frontend-Module ergänzt.
- Statische und dynamische Imports sowie Vite-Preload-Abhängigkeiten werden auf fehlende Dateien geprüft.
- Startkette aus `index.html`, Host-Initialisierung, Main-Entry, Module Federation und NexoWatt-Shell wird separat geprüft.
- Post-Build-Guard normalisiert die bekannte fehlerhafte Anweisungsgrenze und bricht bei ungültigen ES-Modulen oder fehlenden Imports ab.
- Release-Einzelbefehl `npm run check:eos-release` ergänzt.

## Freigabeprüfungen

```bash
npm run check:eos-package
npm run check:eos-stability
npm run nexowatt:patch-built-frontend
npm pack --dry-run
```

Die automatischen Prüfungen umfassen unter anderem:

- Paket- und Versionskonsistenz
- Runtime-Bereinigung
- ES-Modul-Syntax
- Import- und Lazy-Chunk-Integrität
- Frontend-Einstiegspunkt
- Module-Federation-Graph
- genau ein HTML5-DnD-Backend
- Rollen/Policy
- Modul-Popups
- Datenpunktanzeige und Datenpunktbedienung
- manuelle Write-Policy
- Update/Reconnect
- Native NexoWatt Shell

## Verpflichtender Live-Abnahmetest

Vor einer Stable-/Marktfreigabe muss v7.9.84 auf einem echten EOS-Controller mindestens mit Chrome und Firefox gegen einen laufenden ioBroker/js-controller geprüft werden. Der Testkatalog liegt in `RELEASE_ACCEPTANCE_V7.9.84.md`.
