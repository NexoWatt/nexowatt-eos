# Verbindlicher Dokumentationsstandard

Diese Vorgabe gilt ab 1.0.11 dauerhaft für Änderungen an NexoWatt EOS. Kommentare
gehören zur Änderung und werden im selben Arbeitsschritt gepflegt. Der Wunsch
ist Nachvollziehbarkeit für Wartung, Fehlersuche und Weiterentwicklung.

## Was direkt im Quellcode stehen muss

Jede selbst gepflegte Produkt-Quelldatei erhält einen deutschen Dateikopf mit
`NexoWatt Quellcode-Erklärung (DE)` sowie den Feldern `Aufgabe`, `Daten und Wirkung`
und `Bei Änderungen`. Der Kopf erklärt die konkrete Rolle und verweist auf das
Funktions-/Verknüpfungsverzeichnis. Die Kommentare werden an der Originalquelle
gepflegt, anschließend werden die ausführbaren Spiegel gebaut.

Build-Direktiven sind funktionsrelevant: `// @runtime-transpile` muss am vom
Runtime-Generator erwarteten Anfang stehen. Neue Dateikommentare dürfen diese
Markierung nicht verdecken. Auch `@ts-nocheck`, Shebangs und andere gezielte
Compiler-Direktiven müssen an ihrer wirksamen Position erhalten bleiben.

Bei jeder neuen oder fachlich geänderten nichttrivialen Funktion erklären:

- Zweck und Grund der Entscheidung; keine bloße Wiederholung des Funktionsnamens.
- Herkunft der Eingaben, Einheiten und Vorzeichen (W/kW, A, V, %, ms/s).
- Ergebnis, aufrufenden Bereich und nachfolgenden Empfänger soweit nachweisbar.
- Tatsächliche Seiteneffekte: State-Schreiben, Hardware-Sollwert, API-Aufruf,
  Dateispeicherung, Timer oder Browser-Speicher.
- Fehlende/veraltete Daten, sichere Rückfälle, Begrenzungen und Abschaltverhalten.
- Bei sicherheitsrelevanten Abläufen: Freigaben, Reihenfolge, Nebenläufigkeit
  und weshalb eine Prüfung direkt vor dem Schreiben wiederholt werden muss.

Kurze, offensichtliche Umrechnungen benötigen keinen mehrzeiligen Standardtext.
Ein langer Regelzyklus braucht zusätzlich Kommentare an den fachlichen Abschnitten.
Verträge in JSDoc/TypeScript und bestehende hilfreiche Kommentare bleiben erhalten.
Überholte Aussagen werden korrigiert; neue deutsche Erklärungen dürfen alten
Aussagen nicht widersprechen. Bezeichnungen von Variablen und APIs werden nicht
nur zur Übersetzung geändert.

## Arbeitsablauf für jede künftige Änderung

1. Originalquelle und betroffene Aufrufer im [Wegweiser](QUELLCODE_WEGWEISER_DE.md)
   und [Verknüpfungsverzeichnis](QUELLCODE_VERKNUEPFUNGEN_DE.md) ermitteln.
2. Code und fachliche Kommentare zusammen ändern. Bei geänderten APIs, States,
   Einheiten, Rollen oder Prioritäten auch die gegenüberliegende Seite prüfen.
3. `npm run docs:build` erzeugt Import-Gegenrichtungen und Funktionsverzeichnis
   aus dem aktuellen Syntaxbaum. Der Generator formuliert keine Fachlogik und
   ersetzt keine Prüfung der Kommentare durch den Bearbeiter.
4. `npm run docs:check` muss erfolgreich sein. Neue/entfernte Dateien, Änderungen
   an erfassten Quellen und beschädigte/veraltete Indexdateien werden erkannt.
5. Zugehörige Builds, Regressionen und Release-Prüfungen ausführen. Die
   Dokumentationsprüfung gehört zu `test:all` und zur Prüfung einer vollständigen
   Repository-Veröffentlichung. Sie darf nicht zum Umgehen eines Fehlers entfernt
   oder durch bloßes Neuschreiben der Prüfsummen abgehakt werden.

Die technische Prüfung kann nicht beweisen, dass ein deutscher Satz fachlich
richtig ist. Das bleibt Teil des Reviews. Ihr Zweck ist, vergessene Pflege
sichtbar zu machen. Laufzeitverbindungen über ioBroker-States, HTTP, Events,
Browser-Globals oder dynamische Imports sind im statischen Index nicht vollständig
auflösbar und müssen bei relevanten Änderungen ausdrücklich beschrieben werden.

## Welche Dateien maßgeblich sind

- `src-ts/runtime-executables/`: produktive Adapter-, EMS- und Browserquellen.
- Weitere fachliche Bereiche unter `src-ts/`: typisierte Helfer und Verträge.
- `src-admin-tab/src/`: React-Admin-Quellen.
- `scripts/`: selbst gepflegte Build-/Prüfwerkzeuge mit eigenen deutschen
  Zweck-/Pflegekommentaren; sie sind nicht Teil des Produkt-Funktionsindexes.
- `src-ts/runtime-mirrors/`, `main.js`, `ems/`, `lib/ts-mirrors/`, generierte
  Browser-Spiegel und `admin/react/`: gemäß jeweiligem Build-Vertrag erzeugen.

Alle Markdown-Dokumente verbleiben unter `docs/`. Generierte Modulverzeichnisse
liegen unter `docs/quellcode/`. Kommentare in komprimierten Browser-Bundles können
vom Build entfernt werden; die vollständigen Originalquellen sind in der
Repository-ZIP enthalten.

## Beispiel für eine hilfreiche Erklärung

Ein Kommentar vor der DC-Umrechnung erklärt, ob der Strom die DC-Ausgangsseite
oder die AC-Netzseite beschreibt, woher die Spannung stammt und was bei veralteter
Spannung geschieht. Die bloße Aussage „berechnet Leistung“ ist dafür zu wenig.
Bei E-Mail-Versand muss erkennbar sein, dass SMTP-Annahme keine Zustellbestätigung
des Kundenpostfachs ist und dass Wiederholschutz vor dem Netzwerkaufruf gespeichert
wird. Bei Rollenprüfungen ist die serverseitige Prüfung zu nennen, nicht allein
die Sichtbarkeit einer Schaltfläche.
