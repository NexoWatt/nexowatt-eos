# NexoWatt EOS 1.0.11 – offizielle Stable-Version

Diese Version verbessert die Nachvollziehbarkeit des Quellcodes und verankert die Dokumentationspflege im Entwicklungs- und Releaseprozess.

## Was erläutert wird

- Deutsche Modulbeschreibungen in 223 selbst gepflegten TypeScript-/React-Dateien: Aufgabe, Daten und Wirkung, Wartung und Verknüpfungen.
- Zusätzliche fachliche Kommentare an 68 zentralen Funktionen bzw. Methoden: Adapter-Lebenszyklus, AC/DC-Regelung, Sollwertschreiben, Speicher-/Netzschutz, Benachrichtigungen und Admin-Zugriff.
- [Quellcode-Wegweiser](QUELLCODE_WEGWEISER_DE.md) mit den Datenflüssen und tatsächlichen Quelldateien.
- [Automatischer Katalog](QUELLCODE_VERKNUEPFUNGEN_DE.md) mit Funktionen, Quellstellen, statischen Imports und umgekehrten Abhängigkeiten. Dynamische Verbindungen sind ausdrücklich gesondert beschrieben.
- Veraltete Architekturhinweise und Kommentare zu Kunden-SmartHome-Rechten korrigiert.

## Dauerhafte Pflege

Der [Dokumentationsstandard](DOKUMENTATIONSSTANDARD_DE.md) gilt für künftige Änderungen. Er ist auch in den Repository- und Beitragsregeln verankert. Kommentare müssen fachlich mitgepflegt werden; die automatische Prüfung erkennt fehlende Modulbeschreibungen, geänderte Quellen und veraltete oder fehlende Katalogdateien.

Nach dem fachlichen Review `npm run docs:build`, anschließend `npm run docs:check` ausführen. Die Prüfung gehört zu `test:all` und zur Artefaktprüfung vollständiger Repository-Pakete. Sie bewertet nicht automatisch die fachliche Richtigkeit eines Kommentars. Generierte Browser-Bundles können Kommentare weiterhin verkürzen; die vollständigen Originalquellen und Erklärungen bleiben im Repository enthalten. Alle Markdown-Dateien liegen unter `docs/`.

## Verhalten und Prüfung

Die Produktquellen erhalten ausschließlich Kommentare. Steuerungslogik, AC/DC-Grenzen, Home-/Pro-Speicherlimits, Rollenrechte und Benachrichtigungsintervalle bleiben unverändert. Entwicklungswerkzeuge und Release-Metadaten werden erweitert.

Die Validierung umfasst den Vergleich der Syntaxbäume ohne Kommentare mit 1.0.10, die Dokumentationsprüfung einschließlich negativer Testfälle, die vorhandene Regressionstest-Suite, TypeScript-/Admin-Builds und die Prüfung des veröffentlichbaren Pakets. Ein Testlauf an realen Wallboxen oder Speichern ist nicht Bestandteil dieser Dokumentationsänderung.

## Einstieg nach dem Entpacken

Zuerst `docs/QUELLCODE_WEGWEISER_DE.md` öffnen. Die dort verlinkten Dateien unter `src-ts/` und `src-admin-tab/src/` sind die lesbaren Originalquellen. Erzeugte Dateien nicht als Ausgangspunkt für Änderungen verwenden. Das vollständige Repository in ein frisches Verzeichnis entpacken, damit keine alten Build-Dateien übrig bleiben.
