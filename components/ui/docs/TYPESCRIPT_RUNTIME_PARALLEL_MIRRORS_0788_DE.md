# 0.7.88 - Runtime-JavaScript als parallele TypeScript-Spiegel

## Zweck

Diese Version startet den großen Umbau, ohne die produktive Adapterlogik zu verändern.
Alle wichtigen JavaScript-Quelldateien werden als TypeScript-Parallelspiegel unter
`src-ts/runtime-mirrors/` abgelegt.

## Warum parallel?

Der Adapter läuft produktiv weiterhin über die bestehenden JavaScript-Dateien. Die neuen
TypeScript-Spiegel dienen als kontrollierter Migrationspfad:

1. JS bleibt Runtime.
2. TS-Spiegel zeigt dieselbe fachliche Struktur.
3. Code-Abschnitte werden im TS-Spiegel kommentiert.
4. Module werden später einzeln typisiert.
5. Erst nach Tests wird die Runtime auf TS-generierte JS-Dateien umgestellt.

## Wichtige Regel

`src-ts/runtime-mirrors/` enthält temporär `@ts-nocheck`. Das ist kein Endzustand.
Es ist nur der erste sichere Schritt, damit große Dateien wie `main.js`, `www/app.js`
und die EMS-Module syntaktisch im TypeScript-Baum liegen, ohne sofort tausende Typfehler
zu erzeugen.

## Pflege

Wenn eine produktive JS-Datei geändert wird:

```bash
npm run sync:ts-runtime-mirrors
npm run test:runtime-mirrors
```

## Nicht produktiv

Diese Spiegel werden in 0.7.88 nicht ausgeführt. Es gibt keine Änderung an Energiefluss,
Heizstab, KI, History, SmartHome, Lizenz oder `info.connection`.
