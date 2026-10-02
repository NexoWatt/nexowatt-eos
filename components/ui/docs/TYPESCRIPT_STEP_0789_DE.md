# 0.7.89 – Core-Limits Runtime-Spiegel gezielt typisieren

Diese Version ist der erste große gezielte Typisierungsschritt an einer Runtime-Spiegeldatei.

## Betroffene Datei

```text
src-ts/runtime-mirrors/ems/modules/core-limits.ts
```

## Was geändert wurde

- Adapter-, State- und Budget-Snapshot-Verträge wurden direkt in der großen Core-Limits-Spiegeldatei ergänzt.
- Die Klasse `CoreLimitsModule` hat jetzt erste explizite Felder für Adapter, DP-Registry und Shadow-Warnstatus.
- Consumer-/Budget-Zwischenobjekte wurden typisiert, damit spätere Umstellungen auf echte TypeScript-Logik sicherer werden.
- Ein neuer Check kompiliert eine temporäre Kopie ohne `@ts-nocheck` in einem gelockerten Migrationsmodus.

## Warum noch nicht komplett streng?

`core-limits.js` ist eine zentrale Regelungsdatei. Eine sofortige harte Typisierung der gesamten Datei würde sehr viele Legacy-JS-Stellen gleichzeitig berühren. Deshalb gilt hier:

```text
JS Runtime bleibt produktiv.
TS-Spiegel wird gezielt typisiert.
Eine temporäre Kopie wird ohne @ts-nocheck geprüft.
Keine Regelungslogik wird umgestellt.
```

## Nächster Schritt

0.7.90 sollte den nächsten klar abgegrenzten Core-Limits-Bereich typisieren oder mit `heating-rod-control.ts` den zweiten großen EMS-Bereich anfangen.
