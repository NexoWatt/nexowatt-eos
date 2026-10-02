# NexoWatt EOS – Code-Landkarte

Stand: 1.0.11. Einstieg für Wartung und das Lesen des Quellcodes.

| Bereich | Originalquelle | Erzeugte Laufzeit / Aufgabe |
| --- | --- | --- |
| Adapter, Webserver und APIs | `src-ts/runtime-executables/main.ts` | `main.js` |
| EMS-Engine und Regelmodule | `src-ts/runtime-executables/ems/` | `ems/` |
| Datenpunkt-, Lade- und Mailhilfen | `src-ts/runtime-executables/lib/` | `lib/` |
| Weitere typisierte Helfer | `src-ts/ems/`, `src-ts/main/`, `src-ts/backend/` usw. | Im jeweiligen JS-Header benannte Ausgabe |
| Kunden-/App-Center-Browserlogik | `src-ts/runtime-executables/www/` | JavaScript unter `www/` |
| React-Admin | `src-admin-tab/src/` | `admin/react/` |
| Statische Darstellung | `www/*.html`, `www/*.css`, `admin/` | HTML, CSS, Bilder und Admin-Konfiguration |
| Typ-Verträge und Prüfungen | `src-ts/contracts/`, `src-ts/runtime-mirrors/` | Typisierung und parallele Regression, nicht pauschal Produkt-Einstieg |
| Entwicklung und Veröffentlichung | `scripts/` | Build-, Prüf- und Releasewerkzeuge |

Produktlogik zuerst in der Originalquelle ändern. `npm run sync:ts-runtime-executables` erzeugt die zugehörige Laufzeit; `npm run build:ts` prüft und erzeugt weitere TypeScript-Artefakte. Für React gilt `npm run admin:build`. Manuell typisierte Spiegel nicht durch untypisierte Kopien ersetzen.

## Zum Nachschlagen

- [Fachliche Datenflüsse, Sicherheit und Rollen](QUELLCODE_WEGWEISER_DE.md)
- [Dateien, Funktionen und statische Verknüpfungen](QUELLCODE_VERKNUEPFUNGEN_DE.md)
- [Architektur](ARCHITECTURE_DE.md)
- [Dokumentationsstandard](DOKUMENTATIONSSTANDARD_DE.md)

Ältere Migrationsberichte dokumentieren den damaligen Stand. Ihre Aussagen über produktive JS-Quellen oder einen separaten `.nwcore`-Ordner sind keine Arbeitsanweisung für den aktuellen Aufbau.
