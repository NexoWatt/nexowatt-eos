# 0.7.62 – TypeScript-Schritt: Core-Limits und Heizstab vorbereitet

## Ziel

Diese Version bereitet den nächsten kritischen Bereich für die TypeScript-Migration vor:

- zentrale EMS-Budgets / Core-Limits
- Heizstab-/Thermikentscheidung
- Speicherreserve im Heizstab
- PV-/Netzbudget für flexible Verbraucher

Es wurden **keine produktiven Runtime-Funktionen** geändert.

## Warum dieser Schritt wichtig ist

Core-Limits und Heizstab hängen direkt an Bereichen, die in den letzten Versionen sehr sensibel waren:

- Speicher-DP-Auflösung
- PV-Budget
- Speicherreserve
- Netzanschlusslimit
- Heizstab-Stufen
- History-Werte

Darum wird die Logik nicht direkt umgebaut, sondern erst typisiert vorbereitet und mit Regressionen abgesichert.

## Neue TypeScript-Struktur

Die Dateien liegen absichtlich in fachlichen Ordnern:

```text
src-ts/contracts/ems-budget.ts
src-ts/contracts/heating-rod.ts
src-ts/ems/core-limits/core-budget.ts
src-ts/ems/heating-rod/heating-rod-decision.ts
src-ts/quality/ems-budget-heating-rod-cases.ts
src-ts/tests/ems-budget-heating-rod-runtime.ts
src-ts/tests/ems-budget-heating-rod-smoke.ts
```

## Strukturregel

TypeScript-Dateien werden ab jetzt nicht beliebig abgelegt:

```text
src-ts/contracts/      Datenverträge / Interfaces / Typen
src-ts/utils/          kleine fachneutrale Helfer
src-ts/resolvers/      übergreifende Resolver
src-ts/ems/<modul>/    EMS-nahe Modulvorbereitung
src-ts/quality/        Regressionstabellen / fachliche Testfälle
src-ts/tests/          TypeScript-Smoke- und Runtime-Tests
```

Damit ist später sofort erkennbar, ob eine Datei zu Core-Limits, Heizstab, Energiefluss,
KI, Frontend oder einem reinen Vertrag gehört.

## Neue npm-Befehle

```bash
npm run test:ems-budget-heating-rod
npm run test:ems-budget-heating-rod-runtime
```

`test:types` führt diese Checks ebenfalls aus.

## Wichtige fachliche Regeln

- 0 W ist ein gültiger Budgetwert.
- Speicherreserve darf nicht durch Defaultwerte überschrieben werden.
- Heizstab darf nur Leistung bekommen, die PV-/Gesamtbudget erlaubt.
- Wenn Netzbezug verboten ist, zählt für Heizstab nur PV-Budget.
- Speicherreserve blockiert Heizstab, wenn SoC unter Reserve oder Speicherentladung verboten ist.

## Nächster Schritt

0.7.63 sollte nicht sofort die komplette Runtime ersetzen. Sinnvoll wäre:

1. weitere Regressionen ergänzen,
2. den bestehenden JS-Code gegen die TS-Fälle vergleichen,
3. kleine reine Hilfsfunktionen aus `heating-rod-control.js` nach TypeScript auslagern.
