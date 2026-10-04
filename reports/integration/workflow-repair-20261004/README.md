# EOS-Workflows: wiederkehrende Fehlalarme korrigieren

Änderungskennung: NW-EOS-CI-20261004. Ausgangscommit:
`6f1b9a7d2ee0d3bd322667a7a132227e13658b4f`, Branch `main`.
Auftrag: fehlerhafte automatische GitHub-Läufe und dadurch wiederkehrende
Fehlermails beheben. Öffentliche Veröffentlichung auf `main` ist autorisiert.

## Befund und Ursache

Die erneute Prüfung der letzten beiden roten Workflows bestätigt den bereits
bekannten Widerspruch zwischen Upstream-Installationsmatrix und EOS-Profil:

| Beobachtung | Konsequenz |
| --- | --- |
| FreeBSD bricht mit `requires Linux with systemd; no legacy fallback` ab | Der Workflow verlangt Erfolg auf einer ausdrücklich nicht unterstützten Plattform. |
| macOS bricht beim Parsen des generierten Skripts ab | Keine native macOS-/Bash-Kompatibilität; diese Plattform ist außerhalb des EOS-Profils. |
| Ubuntu-Installer verweigert `/usr/local/bin` als unsicher | Der alte Testhost und Installer-Aufruf erfüllen die Schutzannahmen nicht; Diagnose allein beweist weder konkreten Eigentümer noch Modus. |
| Alte Tests erwarten automatischen HTTP-Adminstart | EOS lässt den Dienst bis zur gesonderten Freigabe gestoppt/deaktiviert. |
| Alle Pushes starten beide Windows-Diagnosen und die Installationsmatrix | Auch reine Dokumentationsänderungen erzeugen unnötige Läufe. |

[Ausgewählte Originalfehler mit Job-/Runbezug](baseline.json).
Die macOS-Parserursache wird nicht als lokal reproduzierter nativer Befund
ausgegeben. Die vorher fehlgeschlagenen Vollinstallationen werden durch diese
Änderung nicht rückwirkend als bestanden markiert.

## Änderung und Sicherheitswirkung

- `test.yml` prüft nun ausdrücklich Installer-Verträge: tatsächlicher
  ausgewählter Node-Interpreter, lokale Versionsrichtlinie, selbständige
  Skripterzeugung, eingebettete Quellen und bestehende TLS-/SFTP-/Host-/Wrapper-
  Schutzprüfungen. Es wird kein System-Node gelöscht oder per Symlink ersetzt.
- `freebsd.yml` prüft die tatsächliche generierte Plattformgrenze mit inerten
  Plattformproben und passender erwarteter Diagnose. Ein beliebiger Fehlercode
  reicht nicht. Echte FreeBSD-/macOS-Installation wird nicht behauptet.
- Relevante Quellpfade lösen EOS-Sicherheitsprüfungen und CodeQL weiterhin aus.
  Die R6-Build-/Publikationsverträge bleiben automatisch aktiv. Tatsächlich
  konsumierte ausführbare Berichtsdateien und historische Liefermetadaten sind
  ausdrücklich in den Filtern enthalten. Architekturprüfer lesen `system/`
  und lokale Schemata; ihre Dokumentverweise enthalten keine gelesenen Prosetexte.
- Unveränderliche R4-/R5-/R6-Lieferworkflows und der R5-Reparatureinstieg starten
  nur manuell. Paket-, Signatur-, Rechte- und Unveränderlichkeitsregeln bleiben
  unverändert. Historische Windows-NPX-Diagnose ist manuell; ioBroker-npm-/SFTP-
  Publikation ist zusätzlich auf das Upstream-Repository beschränkt.
- Eine eigene Workflow-Validierung prüft alle YAML-Dateien und GitHub-Ausdrücke
  mit actionlint 1.7.12. Das Downloadarchiv wird vor Ausführung gegen den offiziell
  abgeglichenen SHA-256-Wert geprüft. Optionale ungebundene ShellCheck-/Pyflakes-
  Aufrufe sind nicht Teil dieser Syntaxprüfung; Produkttests laufen separat.
- Berührte Actions sind auf vollständige Commit-IDs gebunden; Leserechte sind
  Standard, Schreibrechte bleiben auf die bisherigen Publikationsjobs begrenzt.
  Zeitlimits und das Abbrechen überholter Quellprüfungen begrenzen Doppelarbeit.
  Veraltetes `set-output` wurde entfernt.

Keine Schutzprüfung wurde im Produkt abgeschaltet, keine TLS-Prüfung gelockert,
kein `continue-on-error` zur Freigabe fehlgeschlagener Tests eingeführt und keine
persönliche Benachrichtigungseinstellung verändert. Historische rote Läufe und
bereits gesendete E-Mails bleiben erhalten.

## Prüfbelege

Lokal bestanden sind die neun neuen Installer-/Plattformverträge, die
bestehenden Node-Sicherheits- und vier Python-Schutztestsuiten sowie 14
R6-Build-/SBOM- und neun Publisher-Verträge. Lokale Laufzeit: Node 24.19.0,
Python 3.12.14 unter Linux/x86_64; die tatsächliche Node-22/24/26-Matrix wird
erst durch den nachfolgenden GitHub-Lauf bestätigt.

- [Installer-Befehle, Rohlogs und Dateibindung](installers/local-results.json)
- [Trigger-/Eingabenaudit, R6-Prüfungen und Action-Herkunft](scope/review.json)
- [actionlint: zwölf Workflows bestanden, fehlerhafte YAML-Abhängigkeit abgewiesen](validation/result.json)
- [README-Push: zweimal öffentlich geprüft, keine neuen Workflows gestartet](documentation-push.json)

Die neuen Installer-Verträge wurden zusätzlich in einer getrennten
Quellprüfung ausgeführt: neun bestanden. Dies ist ein zweiter technischer
Review, keine unabhängige Zertifizierung. Lokale Vertragsprüfungen bestätigen
keine native Installation.

## Tatsächlicher GitHub-Nachlauf

Commit [`ad6f95a38b48d7688c3fdf35c5969570f4598f9f`](https://github.com/NexoWatt/nexowatt-eos/commit/ad6f95a38b48d7688c3fdf35c5969570f4598f9f):
**alle fünf automatischen Prüfworkflows und alle zehn zugehörigen Jobs erfolgreich.**

| Workflow | Ausgeführter GitHub-Lauf | Ergebnis |
| --- | --- | --- |
| EOS installer contracts | [37189029655](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37189029655) | Node-Richtlinie und tatsächliche Node-22/24/26-Matrix bestanden |
| EOS unsupported-platform guards | [37189029678](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37189029678) | Plattform-Verträge bestanden |
| EOS security regression | [37189029664](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37189029664) | Alle drei Architektur-/Sicherheits-/Produktjobs bestanden |
| EOS workflow validation | [37189029679](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37189029679) | Workflow-Syntax und Ausdrücke bestanden |
| CodeQL | [37189029657](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37189029657) | Analyse erfolgreich abgeschlossen |

[Öffentlich zurückgelesene Run-/Job-/Schrittergebnisse](CI_RESULT.json).
Ein zusätzlicher Dependabot-Aktualisierungslauf ist dort separat erfasst und
wird nicht als EOS-Produktprüfung gezählt. Der anschließend veröffentlichte
README-Commit `015da22b2626257be7e2f8ba97dcc96bcc53a3ce` änderte ausschließlich
die README; zwei API-Abfragen fanden dafür keine Workflows. Der R6-Befehl ist
weiterhin bytegleich (995 Bytes, SHA-256 `3102921943b4a03737ffe27d048dd045d787d380481be919364116d3c10e96e7`).

Die anfänglich als ausstehend markierten Hosted-Läufe in den eingefrorenen
lokalen Teilberichten sind damit für diesen Commit konkret nachgetragen.
Ein erfolgreicher Workflow-Status bestätigt nur die darin tatsächlich
ausgeführten Schritte; er bestätigt keine Abwesenheit aller Scannerbefunde.

## Restarbeit und Abgrenzung

Der signierte R6-Lieferstand, Updatebefehl und sämtliche historischen
Lieferdateien werden nicht verändert. Diese Änderung betrifft Entwicklungs-CI,
keine Pi-Installation und keinen Gerätebetrieb. Reale Linux-/systemd-/ARM64-
Installation, Pi-Update, Login, Reboot sowie Backup/Restore bleiben gesonderte
Abnahmen. Es wird keine Produktions-, Anlagen- oder CRA-/IEC-Freigabe erteilt.

Betriebsanleitung: [GitHub-Workflows](../../../docs/operations/GITHUB_WORKFLOWS_DE.md).
