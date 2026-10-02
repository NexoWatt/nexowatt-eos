# Validierung – EOS Admin EMS Live-Diagnose Merge

## Umfang

- neue React-/TypeScript-Komponente `NexoWattEmsOverview.tsx`;
- Einbindung in die reguläre Cockpit-Übersicht nach Instanz- und Linkkarten;
- responsive CSS-Erweiterung;
- automatischer Merge-Helfer;
- EOS-Stability-Selftest.

## Durchgeführte statische Prüfungen

- Merge-Anker entsprechen der aktuellen `Intro.tsx`-Struktur mit `IntroCardCamera`, `getInstancesCards()` und `getLinkCards()`;
- Merge zweimal auf einen sauberen Fixture-Stand angewendet: keine doppelten Imports, Komponenten oder CSS-Blöcke;
- Komponenten-Typecheck mit React-, Browser- und AdminConnection-Vertrag bestanden;
- Selftest für Intro-Einbindung, read-only Socketzugriff, 5-Sekunden-Takt, Visibility-Pause und responsive CSS bestanden;
- keine `setState`, `setForeignState` oder `sendToHost`-Schreiboperation in der Cockpit-Komponente;
- mehrere NexoWatt-UI-Instanzen: lebende Instanz wird vor einer offline/veralteten Instanz bevorzugt;
- fehlender Adapter beziehungsweise fehlender Diagnosevertrag erzeugt eine verständliche Leermeldung.

## Automatische Prüfung im Zielrepository

`MERGE_UPDATE.cmd` beziehungsweise `MERGE_UPDATE.sh` führt anschließend im vollständigen EOS-Admin-Repository aus:

```text
npm run build
npm run check:eos-package
npm run check:eos-stability
```

Der neue Selftest ist dabei in `check:eos-stability` eingebunden und kontrolliert zusätzlich, dass die gebauten Admin-Assets die EMS-Komponente enthalten.

## Sicherheitsgrenze

Die Admin-Kachel ist ausschließlich Diagnose. Sie besitzt keine Schreibhoheit und verändert weder EMS-Regelung noch Safety-, §14a-, Netz-, Stations-, Phasen-, Speicher- oder Ladepunkt-Sollwerte.
