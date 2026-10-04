# GitHub-Prüfungen für NexoWatt EOS

Stand: 04.10.2026. Das öffentliche Repository bleibt die autorisierte
Entwicklungsablage. GitHub-Workflows sind Entwicklungsprüfungen; der Betrieb
von EOS auf dem Pi benötigt diese Dienste nicht.

## Automatische Prüfungen

- Installer-Verträge: lokale/gebaute Skripte, akzeptierte Node-Versionen,
  TLS-/Rechte-/Wrapper-Schutz und eingeschränkte Plattformfreigabe. Keine
  Installation einer veränderlichen ioBroker-Runtime mit automatischem HTTP-Start.
- Plattform-Verträge: Linux/systemd als vorgesehenes Profil, gezielte Ablehnung
  nicht unterstützter Plattformen. Plattformwerte werden in isolierten Tests
  simuliert; dies ist keine native macOS-/FreeBSD- oder Pi-Abnahme.
- EOS-Sicherheitsregression: bestehende Architektur-, SBOM-, Bootstrap-,
  Lizenz-, Login-, PostgreSQL- und Updateverträge; R6-Build-/Publikationsverträge
  bleiben auch nach Veröffentlichung des unveränderlichen Pakets aktiv.
- CodeQL: JavaScript-/TypeScript-Analyse bei relevanten Quelländerungen und
  weiterhin wöchentlich. Ein erfolgreicher Lauf ist kein pauschaler
  Sicherheitsnachweis für das Produkt.
- Workflow-Validierung: alle Workflow-Dateien mit festgelegter actionlint-Version
  auf Syntax, Ausdrücke, Jobs und Abhängigkeiten prüfen.

Die `paths`-Filter in jeder YAML-Datei sind maßgeblich. Änderungen an README,
reinen Textberichten oder neu erzeugten Lieferdateien lösen keine alte
Installationsmatrix mehr aus. Ausführbare Prüf-/Builddateien unter `reports/`
und tatsächlich von Tests gelesene historische Liefermetadaten bleiben erfasst.
Auf `main` laufen passende Push-Prüfungen, bei Pull Requests die zugehörigen
Prüfungen für den Beitrag. Jeder Workflow kann ausdrücklich gestartet werden.

## Manuelle Läufe

Unter **Actions → Workflow auswählen → Run workflow** lassen sich passende
Prüfungen auf `main` gezielt starten. Die R4-/R5-/R6-Lieferworkflows und der
R5-Reparatureinstieg werden nicht durch gewöhnliche Quell-Pushes gestartet.
Ihre bestehenden Regeln gegen Überschreiben signierter Lieferungen sowie
Paket-, Signatur- und Rückleseprüfungen bleiben unverändert.

Der historische Windows-NPX-Test ist nur eine manuelle Diagnose des übernommenen
Upstream-Pfads. npm-/SFTP-Veröffentlichungen für ioBroker sind zusätzlich an das
Repository `ioBroker/ioBroker` gebunden und laufen nicht in NexoWatt EOS.
Die EOS-Lieferung verwendet ihre eigenen signierten Lieferworkflows.

## Fehlermeldungen

Echte Fehler bleiben fehlgeschlagene Läufe. Es gibt kein pauschales
`continue-on-error`, kein Wegschalten der EOS-Prüfungen und keine Änderung an
persönlichen GitHub-Benachrichtigungseinstellungen. Frühere rote Läufe und
bereits versendete E-Mails bleiben historische Befunde.

Bei einem neuen Fehler den betreffenden Run und den ersten fehlgeschlagenen
Schritt prüfen. Schutzregeln am Produkt nicht zur Beruhigung der CI lockern.
Prüfbericht und Rohbelege: [Workflow-Reparatur](../../reports/integration/workflow-repair-20261004/README.md).
Der reale Pi-Test, Login, Neustart und Backup/Restore bleiben gesonderte Abnahmen.
