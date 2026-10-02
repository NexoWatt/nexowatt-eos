# TypeScript-Schritt 0.7.76 – EMS-Spiegel für Core-Limits und Heizstab

## Zweck

Diese Version ergänzt die nächste TypeScript-Spiegelstufe für EMS-nahe Logik:

- `src-ts/ems/core-limits/core-budget.ts`
- `src-ts/ems/heating-rod/heating-rod-decision.ts`

Die erzeugten CommonJS-Spiegel liegen unter:

- `lib/ts-mirrors/ems/core-limits/core-budget.js`
- `lib/ts-mirrors/ems/heating-rod/heating-rod-decision.js`
- `lib/ts-mirrors/utils/number.js`

## Warum dieser Schritt wichtig ist

Core-Limits und Heizstab gehören zu den kritischsten Regelungsbereichen. Ein Fehler kann PV-Budget,
Speicherreserve, Heizstabstufen und später historische Werte beeinflussen. Deshalb wird die TypeScript-Logik
zuerst als Spiegel gebaut und getestet, aber noch nicht produktiv in die Runtime eingebunden.

## Produktive Runtime

In 0.7.76 bleibt die produktive Runtime unverändert:

- `ems/modules/core-limits.js` bleibt führend.
- `ems/modules/heating-rod-control.js` bleibt führend.
- Der TS-Spiegel dient nur als geprüfte Vorstufe.

## Neue Befehle

```bash
npm run sync:ts-ems-mirrors
npm run check:ts-ems-mirrors
npm run test:ems-mirrors
```

## Kritische Fachregeln

- 0 W ist ein gültiger Budgetwert.
- Speicherreserve darf nicht auf Defaultwerte zurückspringen.
- Heizstab wählt nur Stufen, die in das verfügbare Budget passen.
- Ohne Netzfreigabe darf nur PV-Budget genutzt werden.
- Speicherreserve kann den Heizstab blockieren.

## Nächster Schritt

Der nächste sinnvolle Schritt ist ein Shadow-/Vergleichsmodus für Core-Limits und Heizstab. Dabei berechnet die TS-Schicht
parallel zur bestehenden JS-Runtime, überschreibt aber noch keine produktiven Werte.
