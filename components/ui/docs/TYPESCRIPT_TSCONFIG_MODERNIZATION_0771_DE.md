# 0.7.71 - TypeScript-tsconfig Modernisierung für TS 6/7

## Zweck

VS Code bzw. TypeScript 6 meldet `moduleResolution=node10` als veraltet. Der alte Wert entsteht, wenn `moduleResolution` auf `Node`/`node` steht. Diese Einstellung wird in TypeScript 7 nicht mehr funktionieren.

## Änderung

- `tsconfig.base.json` nutzt jetzt `module: Node16` und `moduleResolution: node16`.
- Frontend-Mirror-ESM nutzt explizit `moduleResolution: Bundler`.
- Keine Warnunterdrückung per `ignoreDeprecations`.
- Neuer Check `npm run check:tsconfig-modern`.

## Warum nicht `ignoreDeprecations`?

`ignoreDeprecations` würde die VS-Code-Meldung nur verstecken. Wir wollen die TypeScript-7-Vorbereitung sauber erledigen und nicht später erneut in denselben Fehler laufen.

## Runtime

Diese Version ändert keine produktive Adapterlogik. Es werden nur TypeScript-Konfigurationen, Checks, Version und Doku angepasst.


## Aktualisierung ab 0.7.72

Die vorherige Zwischenlösung `Node16/node16` wurde durch `NodeNext/nodenext` ersetzt. Hintergrund: Für unser Ziel Node.js 22/24 gibt es in TypeScript kein `node22` oder `node24`; der moderne Node-Modus ist `nodenext`.
