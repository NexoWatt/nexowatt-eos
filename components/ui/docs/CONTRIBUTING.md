# Contributing

PRs welcome. Use Node.js 22 or newer, as required by `package.json`.

## Quellcode und Dokumentation gemeinsam pflegen

Der [Dokumentationsstandard](DOKUMENTATIONSSTANDARD_DE.md) gilt dauerhaft für neue und geänderte Quellen. Deutsche Kommentare erläutern Aufgabe, Datenfluss, Einheiten, Seiteneffekte und nicht offensichtliche Sicherheitsentscheidungen. Hilfreiche Kommentare bleiben erhalten und werden bei Verhaltensänderungen aktualisiert.

Nach fachlicher Prüfung `npm run docs:build` und `npm run docs:check` ausführen. Der automatische Verknüpfungskatalog ergänzt das Review; er ersetzt keine fachliche Erklärung. Release-Prüfung und `test:all` prüfen den Dokumentationsstand. Alle Markdown-Dateien gehören unter `docs/`.

Einstieg: [Quellcode-Wegweiser](QUELLCODE_WEGWEISER_DE.md), [Repository-Regeln](AGENTS.md).

## Projekt-Standard

Publish-Änderungen immer mit frischem Repository **und** einer überkopierten Vorgängerversion prüfen. `npm run release:prepare` sichert veraltete, unbenutzte Admin-Bundles vor den unverändert strengen Artefaktprüfungen. Nach erfolgreicher Bereinigung die entfernten Dateien beim Git-Commit mit übernehmen (`git add -u -- admin/react/assets`). Echte Sicherheitsfunde müssen behoben werden; Prüfschritte nicht entfernen. Der Upgrade-Regressionstest gehört dauerhaft zu `test:all`.

- Adapter-Konfiguration: **JSONConfig** (`admin/jsonConfig.json`)
- Admin-Tab / Admin-Hilfsseiten: **React** (`src-admin-tab` → `admin/react`)
- **Kein Materialize-Legacy** mehr für neue Admin-Oberflächen
