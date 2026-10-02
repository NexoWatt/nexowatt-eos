# 0.7.96 - Kunden-LIVE-Frontend Runtime-Typisierung

Diese Version typisiert gezielt den TypeScript-Parallelspiegel von `www/app.js`:

```text
src-ts/runtime-mirrors/www/app.ts
```

## Zweck

Der Kunden-LIVE-Bereich ist einer der größten und kritischsten Frontendbereiche. Er rendert Dashboard, Energiefluss, KPI-Karten, Schnellsteuerungen, Wetter, KI-Berater und Kundeneinstellungen.

## Wichtig

Die produktive Runtime bleibt weiterhin `www/app.js`. Der TypeScript-Spiegel wird nur für Migration, Kommentare und Typverträge genutzt.

## Neu typisierte Vertragsbereiche

- `AppApiStateResponse`
- `AppConfigResponse`
- `AppFeatureVisibilityState`
- `AppEnergyFlowViewModel`
- `AppDashboardMetricRow`
- `AppAiAdvisorCardModel`
- `AppWeatherCardModel`
- `AppControlWriteRequest`
- `AppRuntimeState`
- `AppDomRefs`

## Kritische Regeln

- `0 W`, `0 %`, `false` und leere Listen sind gültig.
- EVCS und Speicherfarm dürfen nur bei echter Hardware sichtbar sein.
- Energieflusswerte dürfen nicht anders interpretiert werden als Backend und History.
- Schnellsteuerungen schreiben Werte zurück und müssen besonders vorsichtig migriert werden.
