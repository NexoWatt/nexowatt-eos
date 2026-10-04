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

Die neuen Installer-Verträge wurden zusätzlich in einer getrennten
Quellprüfung ausgeführt: neun bestanden. Dies ist ein zweiter technischer
Review, keine unabhängige Zertifizierung. GitHub-Commit und konkrete
Run-/Jobresultate werden nach der Veröffentlichung separat ergänzt. Lokale
Vertragsprüfungen bestätigen keine native Installation. Ein erfolgreicher
Workflow-Status bestätigt nur die darin tatsächlich ausgeführten Schritte.

## Restarbeit und Abgrenzung

Der signierte R6-Lieferstand, Updatebefehl und sämtliche historischen
Lieferdateien werden nicht verändert. Diese Änderung betrifft Entwicklungs-CI,
keine Pi-Installation und keinen Gerätebetrieb. Reale Linux-/systemd-/ARM64-
Installation, Pi-Update, Login, Reboot sowie Backup/Restore bleiben gesonderte
Abnahmen. Es wird keine Produktions-, Anlagen- oder CRA-/IEC-Freigabe erteilt.

Betriebsanleitung: [GitHub-Workflows](../../../docs/operations/GITHUB_WORKFLOWS_DE.md).
