# 0.7.106 – Core-Limits Consumer-Reservierungen als TS-Shadow vorbereitet

## Ziel

Dieser Schritt bereitet die nächste Core-Limits-Auslagerung vor: die Verbraucher-Reservierungen aus `makeBudgetRuntime.reserve`.

Produktiv bleibt in 0.7.106 weiterhin die bestehende JavaScript-Reservierung. Der TypeScript-Spiegel berechnet dieselbe Reservierung parallel und schreibt eine Diagnose.

## Neue TypeScript-Helfer

Quelle:

```text
src-ts/ems/core-limits/core-budget.ts
```

Neue Funktionen:

```text
computeCoreBudgetReservation
buildCoreBudgetConsumersList
calculateCoreBudgetFlexUsedW
```

## Neue Diagnose

```text
ems.budget.tsReservationJson
```

Diese Diagnose zeigt, ob JavaScript und TypeScript bei folgenden Feldern übereinstimmen:

```text
grantW
usedW
pvUsedW
actualW
remainingTotalW
remainingPvW
```

## Sicherheitsregel

Die TS-Reservierung schreibt in 0.7.106 keine produktiven States. Sie berechnet nur einen Shadow-Vergleich, damit wir die produktive Übernahme im nächsten Schritt kontrolliert machen können.

## Nächster Schritt

Wenn `ems.budget.tsReservationJson.ok = true` stabil ist, kann in der nächsten Version die Reservierungsberechnung produktiv über TypeScript laufen, mit JS-Fallback.
