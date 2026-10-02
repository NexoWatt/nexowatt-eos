# TypeScript-Schritt 0.7.90 – Heizstab-Runtime-Spiegel gezielt typisieren

Diese Version typisiert die zweite große Runtime-Spiegeldatei gezielt vor: `src-ts/runtime-mirrors/ems/modules/heating-rod-control.ts`.

## Zweck

Der produktive Heizstab läuft weiterhin über `ems/modules/heating-rod-control.js`. Die TypeScript-Datei ist nur der parallele Migrationsspiegel.

## Ergänzte Verträge

- `HeatingRodAdapterLike` beschreibt den ioBroker-Adapterzugriff.
- `HeatingRodDatapointRegistryLike` beschreibt die Datenpunkt-Registry.
- `HeatingRodRuntimeDevice` beschreibt ein Heizstab-Gerät in der Runtime.
- `HeatingRodStageControlState` beschreibt Rampen-, Ownership- und 0-Einspeise-Schutzdaten.
- `HeatingRodBudgetProtectState` beschreibt Schutzzeiten für Netzimport und Speicherentladung.
- `HeatingRodApplyStageOptions` typisiert die Optionen beim Schreiben der Stufen.

## Wichtig für die Wartung

- Speicherreserve darf nicht auf Defaultwerte zurückspringen.
- 0 W Budget und 0 W Stufenleistung sind gültige Werte.
- Die produktive Heizstab-Logik wird in dieser Version nicht verändert.

## Prüfung

`npm run test:heating-rod-runtime-typing` entfernt temporär `@ts-nocheck` und kompiliert den Spiegel in einem gelockerten Migrationsmodus.
