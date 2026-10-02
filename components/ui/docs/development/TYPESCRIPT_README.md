# NexoWatt TypeScript-Migrationsbereich

Dieser Ordner enthält die vorbereitenden TypeScript-Dateien für die schrittweise Migration.

## Aktueller Stand

Die produktive Adapterlaufzeit nutzt weiterhin JavaScript:

```text
main.js
www/*.js
ems/modules/*.js
```

TypeScript wird aktuell für Typverträge, Qualitätsverträge und spätere Migration genutzt.

## Wichtige Regeln

1. Keine produktive Logik ungeprüft aus `src-ts` importieren.
2. `build-ts/types` ist generierter Output und darf nicht manuell bearbeitet werden.
3. Kritische Bereiche zuerst typisieren, dann mit Regressionstests absichern, danach erst produktiv umstellen.
4. Deutsche Fachkommentare bleiben erhalten, damit der Code menschlich wartbar bleibt.

## Aktuelle Befehle

```bash
npm run typecheck
npm run build:ts
npm run test:types
```
