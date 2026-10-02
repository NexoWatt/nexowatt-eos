# 0.7.99 – /api/state und /api/set als TypeScript-Shadow-Helfer

Diese Version bereitet die Auslagerung von `/api/state` und `/api/set` aus `main.js` vor.

## Produktive Runtime

- `/api/state` antwortet weiterhin mit `this.stateCache`.
- `/api/set` schreibt weiterhin über die vorhandenen JavaScript-Spezialpfade.

## Shadow-Modus

- `compareApiStateShadow(...)` prüft parallel, ob `0`, `false` und vorhandene Werte korrekt erkannt werden.
- `buildApiSetShadowPlan(...)` erstellt parallel einen Schreibplan für `/api/set`, schreibt aber nichts.
- `/config` enthält `mainApiTsShadow` als reine Diagnose.

## Nächster Schritt

Die Diagnose kann später im App-Center sichtbarer gemacht werden. Erst danach werden einzelne API-Teilbereiche produktiv auf TypeScript-Helfer umgestellt.
