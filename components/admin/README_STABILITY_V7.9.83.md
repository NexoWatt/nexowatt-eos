# NexoWatt EOS Admin v7.9.83 – Automatic Runtime Cleanup

## Ursache des v7.9.82-Fehlers

Das v7.9.82-Archiv selbst enthielt nur die aktive v82-Frontend-Laufzeit. Beim Entpacken über einen bereits verwendeten Entwicklungsordner blieben jedoch ältere, nicht mehr im neuen Archiv enthaltene JavaScript-Dateien auf dem Datenträger liegen. ZIP-Programme überschreiben vorhandene Dateien, löschen aber normalerweise keine Dateien, die im neuen Archiv nicht mehr vorkommen.

Dadurch fand die Stabilitätsprüfung im lokalen Arbeitsordner 546 alte Runtime-Dateien und brach korrekt ab.

## Dauerhafte Korrektur

v7.9.83 entfernt veraltete Runtime-Dateien automatisch:

- vor `check:eos-package`
- vor `check:eos-stability`
- vor `npm pack` / `npm publish`
- nach einem vollständigen Build
- zusätzlich direkt beim Stabilitätscheck

Die Bereinigung behält ausschließlich die in `NEXOWATT_EOS_BUILD_INFO.json` definierte aktive Runtime und entfernt:

- alte `*-vNN.js`- und Source-Map-Dateien
- alte `remoteEntry-vNN.js`
- historische DPWrite-/DPAdapter-Hotfix-Bundles
- alte EOS-DOM-Overlay-Dateien aus Vorgängerversionen

## Absicherung

Ein eigener Regressionstest erzeugt absichtlich alte Runtime- und Overlay-Dateien, führt die Bereinigung aus und kontrolliert anschließend:

- aktive Runtime bleibt vollständig erhalten
- alle alten Runtime-Dateien wurden entfernt
- historische Overlay-Dateien wurden entfernt
- der Frontend-Importgraph bleibt vollständig

Zusätzlich wurde der reale Fehlerfall mit 546 künstlichen Altdateien reproduziert. Der neue Ablauf entfernte alle 546 Dateien automatisch, bevor Paket- und Stabilitätsprüfung starteten.
