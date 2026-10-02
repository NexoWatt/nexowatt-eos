# NexoWatt EOS Admin – EMS Live-Diagnose Mergeprüfung

## Ziel

Das Merge-Paket ergänzt im Cockpit des aktuellen `ioBroker.eos.admin` eine responsive und ausschließlich lesende EMS-Übersicht. Die Kachel liest den Diagnosevertrag des NexoWatt-UI-Adapters unter:

```text
nexowatt-ui.<Instanz>.info.adminOverview.*
```

## Geprüfte Eigenschaften

- neue React-Komponente `NexoWattEmsOverview.tsx` vorhanden;
- Import und genau eine Renderposition in `Intro.tsx` werden idempotent ergänzt;
- responsive EOS-CSS wird genau einmal ergänzt;
- Abfrage höchstens alle fünf Sekunden;
- Polling pausiert bei unsichtbarem Browserreiter;
- mehrere NexoWatt-UI-Instanzen werden nach dem neuesten Diagnosezeitpunkt ausgewählt;
- Offline-/Stale-Zustand ab 20 Sekunden;
- fehlender Adapter beziehungsweise fehlender Diagnosevertrag erzeugt eine verständliche Leermeldung;
- optionale Module wie Speicher, Tarif, Forecast, Peak-Shaving und §14a werden nur angezeigt, wenn vorhanden;
- Admin/Service und Installateur erhalten technische Soll-/Istwerte;
- Endkunden erhalten eine reduzierte Erklärung;
- keine `setState`, `setForeignState` oder `sendToHost`-Operation in der Komponente;
- Deep-Link zur vollständigen NexoWatt-UI-Diagnose;
- Merge-Skript zweimal nacheinander ausgeführt: keine doppelten Imports, Renderpunkte oder CSS-Blöcke;
- TypeScript-/TSX-Syntax über TypeScript `transpileModule` geprüft;
- statischer EOS-Admin-Selftest im Quellstand-Fixture bestanden.

## Noch im echten EOS-Admin-Repository auszuführen

Das Merge-Skript startet nach der Integration automatisch:

```text
npm run build
npm run check:eos-package
npm run check:eos-stability
```

Der vollständige EOS-Admin-Build kann nur im kompletten aktuellen EOS-Admin-Repository mit dessen `node_modules` ausgeführt werden. Das Merge-Paket enthält absichtlich nicht den gesamten Admin-Quellbaum und setzt keine Adapterversion.

## Sicherheitsgrenze

Die Kachel ist ein Monitor. Sie verändert keine EMS-Regel, kein Budget und keinen Geräte-Sollwert. Schreibhoheit verbleibt vollständig beim bestehenden NexoWatt-UI-EMS und dessen Single Writer.
