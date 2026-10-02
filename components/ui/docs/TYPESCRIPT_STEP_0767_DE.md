# 0.7.67 - TypeScript Frontend-Display-MJS-Spiegel

## Zweck

Dieser Schritt ergänzt den ersten kontrollierten TypeScript-zu-JavaScript-Spiegel für browsernahe Frontend-Anzeigehelfer.

## Struktur

```text
src-ts/frontend/*.ts                    # TypeScript-Quelle
build-ts/frontend-mirrors/frontend/*.js # temporäre Build-Ausgabe
www/static/ts-mirrors/frontend/*.mjs    # eingecheckter MJS-Spiegel
```

## Wichtige Regel

Die Dateien unter `www/static/ts-mirrors/frontend/` werden nicht manuell geändert. Änderungen erfolgen zuerst unter `src-ts/frontend/`, danach läuft:

```bash
npm run sync:ts-frontend-mirrors
npm run test:ts-frontend-mirrors
```

## Runtime

0.7.67 bindet diese MJS-Spiegel noch nicht produktiv in `www/app.js`, `www/history.js` oder SmartHome ein. Dadurch bleibt die Adapterfunktion identisch zu 0.7.66.

## Warum dieser Zwischenschritt wichtig ist

Wertformatierung, Feature-Sichtbarkeit und History-Toolbar-Regeln betreffen später Dashboard, History und mobile VIS. Deshalb muss der Buildweg stabil sein, bevor wir produktive Browserdateien umstellen.

## Nicht geändert

- Energiefluss
- Speicher-DP-Resolver
- Heizstab
- KI-Berater
- History Runtime
- SmartHome Runtime
- Lizenzlogik
- info.connection
