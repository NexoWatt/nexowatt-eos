# 0.7.66 – TypeScript Build-Output und erster generierter JS-Spiegel

Diese Version ist ein reiner TypeScript-Migrationsschritt. Es wurde keine EMS-,
VIS-, Energiefluss-, Heizstab-, KI- oder Lizenz-Runtime verändert.

## Ziel

Bis 0.7.65 gab es bereits TypeScript-Quellen und eine manuell gepflegte
JavaScript-Spiegeldatei. Ab 0.7.66 ist die erste kleine Wartungsdatei offiziell
so aufgebaut:

```text
TypeScript-Quelle  ->  TypeScript-Build  ->  generierte JavaScript-Spiegeldatei
src-ts/scripts/publish-check-rules.ts
                   ->  build-ts/script-mirrors/scripts/publish-check-rules.js
                   ->  scripts/publish-check-rules.js
```

## Warum nicht direkt für EMS-Logik?

`scripts/publish-check-rules` ist bewusst risikoarm. Es betrifft nur den
Publish-/Paketcheck und keine produktive Adapterlogik. Damit testen wir die
Build- und Spiegelstrategie, bevor später kritische Bereiche wie Speicher,
Energiefluss oder Heizstab produktiv umgestellt werden.

## Neue Regeln

- Änderungen an `publish-check-rules` zuerst in `src-ts/scripts/publish-check-rules.ts` durchführen.
- Danach `npm run build:script-mirrors` ausführen.
- `scripts/publish-check-rules.js` ist generiert und wird nicht manuell gepflegt.
- `npm run publish:check` bleibt ohne TypeScript-Compiler lauffähig.
- `npm run test:script-mirrors` prüft, ob TS-Quelle und JS-Spiegel zusammenpassen.

## Wichtige Befehle

```bash
npm run build:script-mirrors
npm run test:script-mirrors
npm run build:ts
npm run test:all
```

## Fachlicher Zusammenhang

Diese Strategie ist die spätere Vorlage für weitere kleine Helfer. Produktive
EMS-Logik wird erst dann gespiegelt oder umgestellt, wenn Regressionstests und
Vergleichsmodus vorhanden sind.
