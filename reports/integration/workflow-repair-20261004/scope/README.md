# Trigger- und Veröffentlichungsumfang

Stand: 04.10.2026. Die Workflow-Änderung beendet automatische Aufrufe historischer
Upstream-Installationen und bereits veröffentlichter, unveränderlicher Revisionen.
Sie unterdrückt keine fehlgeschlagenen EOS-Prüfungen.

- EOS-Sicherheits-, Architektur-, Bootstrap-, Login-, Branding- und Datenbankverträge
  laufen weiterhin bei Änderungen ihrer Quellen, Prüfungen und Konfigurationen.
  Die R6-Build-/SBOM-/Publisher-Verträge laufen jetzt zusätzlich auch nach erfolgter
  R6-Veröffentlichung automatisch: lokal **14 Node- und 9 Python-Prüfungen bestanden**.
- Die Architekturprüfung liest die JSON-Verträge unter `system/`; das SBOM-Werkzeug
  liest das Paketmanifest und lokale Schemata. `reviewDocument` wird als Pfadangabe
  geprüft, sein Markdown-Inhalt wird nicht eingelesen. Daher lösen reine Änderungen
  von README, allgemeinen Dokumenten und Ergebnisberichten keine Quelltests aus.
  Ausführbare Werkzeuge unter `reports/`, die R4/R5-Metadaten und öffentlichen Schlüssel
  sowie die tatsächlich geprüften Produktlogos bleiben ausdrücklich Auslöser.
- CodeQL behält seine Sicherheits-/Qualitätsabfragen und die wöchentliche Prüfung.
  Quelländerungen und Workflow-Änderungen lösen es weiterhin automatisch aus.
  Die Prüfinhalte wurden nicht eingeschränkt; nur prose-/artefaktbezogene Pushes
  lösen keinen zusätzlichen Lauf aus.
- R4/R5/R6-Publikation und R5-Reparatureinstieg bleiben über `workflow_dispatch`
  manuell verfügbar. Unveränderlichkeits-, Herkunfts- und Signaturprüfungen sowie die
  getrennten Publikationsrechte bleiben erhalten. Bestehende signierte Pakete
  wurden nicht verändert.
- Die historische Windows-NPX-Diagnose startet manuell. Die früher doppelte
  Windows-/npm-Veröffentlichung und SFTP-Veröffentlichung sind zusätzlich auf das
  ursprüngliche Repository `ioBroker/ioBroker` beschränkt. EOS-Uploads, Tags und
  Releases lösen keine Veröffentlichung von `@iobroker/*` oder nach ioBroker-SFTP aus.
- Veränderte Workflows verwenden vollständige, über die offiziellen Repositories
  verifizierte Action-Commits, begrenzte Laufzeiten und minimale Tokenrechte.
  Der veraltete `set-output`-Befehl wurde entfernt; npm-Token werden als Umgebung
  übergeben und nicht in Shell-Quelltext eingesetzt.

Die genauen Eingaben, lokal ausgeführten Prüfungen und Action-Herkünfte stehen in
[`review.json`](review.json). Lokale Node-Prüfung: 24.19.0; CI bleibt auf dem
Produktziel 24.21.0. Die tatsächlichen GitHub-Ergebnisse werden im übergeordneten
Abschlussbericht nach dem Push belegt. Kein Pi-/Hardwaretest oder Produktionsfreigabe.
