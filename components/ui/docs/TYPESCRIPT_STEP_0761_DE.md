# TypeScript Schritt 0.7.61 – Energiefluss-Resolver-Vorbereitung

## Ziel

Diese Version bereitet die spätere produktive Migration der Energiefluss-Resolver vor.
Die Runtime bleibt unverändert. Der neue TypeScript-Code beschreibt und testet aber schon die Zielregeln für Speicher, Netz und Gebäudeverbrauch.

## Neue Dateien

```text
src-ts/utils/energy-flow-resolver.ts
src-ts/tests/energy-flow-resolver-regression.ts
scripts/verify-ts-energy-flow-resolver.js
tests/fixtures/energy-flow-resolver-cases.de.json
```

## Wichtige Fachregeln

```text
0 W ist ein gültiger Messwert.
Split-Speicher-DPs sind gültig.
Signed-Speicher-DPs sind gültig.
Ein konfigurierter Speicher-DP blockiert Bilanz-Fallback.
Bilanz-Fallback ist nur erlaubt, wenn kein echter Speicher-DP konfiguriert ist.
Netz-Split und Netz-Signed müssen gleich konsistent behandelt werden.
```

## Warum keine Runtime-Änderung?

Die Speicher-/Energieflusslogik ist kritisch für LIVE, History, Heizstab, Core-Limits und KI.
Deshalb wird der Resolver zuerst typisiert und mit Regression-Beispielen vorbereitet.
Die produktive Verdrahtung erfolgt erst in einem späteren Schritt, wenn die Testfälle stehen.
