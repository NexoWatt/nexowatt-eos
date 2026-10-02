# 0.7.69 - TypeScript Energiefluss-Spiegel und Shadow-Vergleich-Vorstufe

Diese Version erweitert die TypeScript-Migration um CommonJS-Spiegel für die Energiefluss-Resolver.

## Ziel

Wir wollen später die produktive Energieflusslogik aus `main.js`, `www/app.js`, `core-limits.js` und `heating-rod-control.js` auf TypeScript umstellen. Direktes Umschalten wäre riskant, weil Speicher-DPs, History und Heizstab-Budget sehr empfindlich sind.

0.7.69 baut deshalb nur die sichere Vorstufe:

```text
src-ts/utils/number.ts
src-ts/utils/energy-flow.ts
src-ts/resolvers/energy-flow-resolver.ts
        ↓
lib/ts-mirrors/energy-flow/**
```

## Wichtig

Die neuen Spiegel werden noch nicht produktiv von der Adapter-Runtime genutzt. Sie sind nur die Grundlage für den späteren Shadow-Vergleich:

```text
alte JS-Logik berechnet Werte
neue TS-Logik berechnet parallel Werte
Abweichungen werden später nur diagnostiziert
Anzeige/History bleiben zunächst auf alter Logik
```

## Kritische Regeln

- Split-DPs und signed DPs sind beide gültig.
- 0 W bleibt gültig.
- Rechenfallback nur ohne echten Speicher-DP.
- Konfigurierter aber kurzzeitig leerer Speicher-DP darf nicht durch Bilanzrechnung ersetzt werden.
- Netz-Signed- und Netz-Split-DPs werden analog vorbereitet.

## Neue Checks

```bash
npm run sync:ts-energy-flow-mirrors
npm run check:ts-energy-flow-mirrors
npm run test:energy-flow-mirrors
```

`publish:check` prüft die Spiegel synchron und lauffähig, ohne selbst einen TypeScript-Build auszuführen.
