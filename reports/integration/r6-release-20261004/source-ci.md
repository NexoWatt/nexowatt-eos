# GitHub-CI des veröffentlichten Quellstands

Prüfbasis: Commit [`e699a6d575974574ffc4f48d47fe647f6f147f2a`](https://github.com/NexoWatt/nexowatt-eos/commit/e699a6d575974574ffc4f48d47fe647f6f147f2a), Branch `main`, Push vom 04.10.2026. Erstprüfung der GitHub-Actions-Run-/Job-API und verfügbaren Joblogs am 04.10.2026 bis 07:18:52 UTC; einmalige Nachprüfung der drei damals offenen Runs um 07:22:53 UTC, anschließend Prüfung der verfügbaren Windows-Joblogs. Der Hauptbearbeiter bestätigte abschließend per GitHub-API auch CodeQL als `completed/success` für exakt diesen Quellcommit, mit `updated_at: 2026-10-04T07:26:55Z`. Damit sind alle acht Run-Endergebnisse bekannt. Nur gelesen; keine Workflows geändert, neu gestartet oder abgebrochen. Dieser Bericht betrifft den Quellcommit, keine neue signierte R6-Runtime.

## Beobachteter Status

| Workflow | Run | Ergebnis zum Prüfzeitpunkt |
| --- | --- | --- |
| EOS security regression | [37185147760](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37185147760) | Erfolgreich; alle drei Jobs erfolgreich |
| EOS R4 signed test delivery | [37185147762](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37185147762) | Erfolgreich; bestehende Lieferung geschützt, Build-/Upload-/Publish-Schritte übersprungen |
| EOS R5 signed repair candidate | [37185147765](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37185147765) | Erfolgreich; bestehende Lieferung geschützt, Candidate-Prüfungen/Build/Signierung/Upload/Publish übersprungen |
| Test FreeBSD | [37185147776](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37185147776) | Fehlgeschlagen |
| Test | [37185147741](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37185147741) | Fehlgeschlagen; beide Versionsjobs erfolgreich, sieben Installationsjobs fehlgeschlagen |
| CodeQL | [37185147763](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37185147763) | Erfolgreich, Abschlussstatus aktualisiert 07:26:55 UTC |
| Deploy (`deploy_windows.yml`) | [37185147771](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37185147771) | Erfolgreich, Abschluss 07:19:35 UTC; Windows-Installjob erfolgreich, `deploy` übersprungen |
| iobroker npx install Windows 64bit Build | [37185147775](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37185147775) | Erfolgreich, Abschluss 07:19:07 UTC |

Bei der Erstprüfung waren CodeQL und beide Windows-Jobs noch aktiv; ihr Logdownload lieferte damals `404 BlobNotFound`. Die Nachprüfungen bestätigen alle drei Runs als erfolgreich. Insgesamt sind sechs Workflows erfolgreich und zwei fehlgeschlagen. Der erfolgreiche CodeQL-Run bestätigt die Ausführung der Analyse; eine eigenständige Prüfung sämtlicher erzeugter Code-Scanning-Befunde wurde in diesem Bericht nicht vorgenommen.

Die jetzt verfügbaren Windows-Logs bestätigen erfolgreich installierte und gestartete ioBroker-Dienste: [Deploy-Windows-Job 111385417985](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37185147771/job/111385417985) meldet den Dienststart um 07:19:22 UTC, [NPX-Windows-Job 111385417990](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37185147775/job/111385417990) um 07:18:55 UTC. Dies belegt den dort ausgeführten Windows-NPX-Installationsweg. Es ist keine Prüfung des signierten ARM64-/PostgreSQL-EOS-Pi-Pakets und keine Browser-/Loginabnahme. Der zusätzliche `deploy`-Job im ersten Run wurde tatsächlich übersprungen; keine Paketveröffentlichung dieses Jobs.

## Konkrete Fehler aus den Logs

### FreeBSD: ausdrückliche Plattformablehnung

[Job 111385418206](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37185147776/job/111385418206), FreeBSD 14.2. Paketvorbereitung und Erzeugung der zusammengeführten Skripte liefen durch. Im Schritt `Install ioBroker` folgte um 07:15:40 UTC:

```text
This EOS hardening profile requires Linux with systemd; no legacy fallback.
ssh exited with code 1
```

Das ist laut Log eine bewusste Ablehnung durch das EOS-Plattformprofil. Der FreeBSD-Installationsworkflow erwartet dagegen eine erfolgreiche Installation und bleibt deshalb rot. Dies ist keine bestandene FreeBSD-Abnahme und keine Aussage über einen tatsächlichen Pi-Start.

### macOS: Parserfehler vor erfolgreicher Installation

Alle drei macOS-Matrixjobs scheitern im Installationsschritt mit Exit-Code 2:

```text
./dist/install.sh: line 1123: syntax error near unexpected token `;;'
./dist/install.sh: line 1123: `    case "$state:$status" in inactive:3|inactive:4|unknown:4) ;; *) return 1 ;; esac'
```

Belege: [Node 24, Job 111385530867](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37185147741/job/111385530867) um 07:15:46 UTC; [Node 22, Job 111385530897](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37185147741/job/111385530897) um 07:15:51 UTC; [Node 26, Job 111385530886](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37185147741/job/111385530886) um 07:15:54 UTC.

Dieser Fehler darf nicht als bereits erfolgreich getestete Plattformablehnung bezeichnet werden. Die genaue Parser-/Shell-Kompatibilitätsursache wurde in dieser reinen Logprüfung nicht reproduziert. Nachfolgende Start-/Rechteprüfungen wurden übersprungen.

### Ubuntu/Linux: CLI-Installationsverzeichnis abgewiesen

Vier Linux-Jobs erreichen den Installationsablauf, brechen jedoch nach den Rechte-/ACL-Meldungen mit derselben Diagnose und Exit-Code 1 ab:

```text
EOS CLI installation: Unsafe installation directory: /usr/local/bin
Process completed with exit code 1.
```

| Job | Logzeit UTC | Beleg |
| --- | --- | --- |
| Node-Neuinstallation | 07:17:00 | [111385418087](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37185147741/job/111385418087) |
| Ubuntu, Node 26.x | 07:17:38 | [111385530885](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37185147741/job/111385530885) |
| Ubuntu, Node 22.x | 07:17:52 | [111385530878](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37185147741/job/111385530878) |
| Ubuntu, Node 24.x | 07:18:15 | [111385530850](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37185147741/job/111385530850) |

Die konkrete Ablehnung ist durch die Logs belegt. Welches Verzeichnismerkmal den Check auslöste, ist durch diese Meldung allein nicht bewiesen; Eigentümer oder Modus werden hier nicht erfunden. Auch für Linux liegt damit keine erfolgreiche vollständige Installer-/Startabnahme dieses Workflows vor. Die Schutzprüfung wurde nicht gelockert oder umgangen.

## Positive Nachweise und Grenzen

Der grüne [Produktvertragsjob 111385418313](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37185147760/job/111385418313) verwendete Node 24.21.0. Seine Logs zeigen 316 bestandene ausgewählte Node-Vertragstests, anschließend 87 bestandene Eigentums-/Sudo-/Update-Fixtures sowie Python-Läufe mit 21, 27 und 46 erfolgreichen Tests. Onboarding, Lizenzprüfung, Session-Sicherheit und Startup-Branding gehören zur ausdrücklichen Auswahl. Datenbank-/Hostzugriffe werden in diesen Verträgen teilweise simuliert; lokale TLS-Tests sind enthalten.

[Security-Job 111385418379](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37185147760/job/111385418379) bestätigt Skripterzeugung/Syntax sowie 41 Node-Tests und Python-Läufe mit 15, 7, 12 und 23 Tests. [Architekturjob 111385418429](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37185147760/job/111385418429) bestätigt Vertrags-/SBOM-Prüfung und Python-Läufe mit 31, 29, 31 und 21 Tests. Diese positiven Ergebnisse ersetzen die fehlgeschlagenen Installationsprüfungen nicht.

Die R4-/R5-Jobschritte bestätigen, dass ihre bestehenden signierten Lieferungen nicht neu erzeugt wurden. Ihr grüner Gesamtstatus ist ein bestandener Unveränderlichkeitsschutz, kein neuer Bundle-Build. Die neuen Login-Recovery-/Browser-Cache-Prüfungen und `tests/integration/branding.test.cjs` sind nicht Bestandteil der vorhandenen ausdrücklichen Security-CI-Testliste; für sie gelten die separaten lokalen Quellprüfberichte.

Offen bleiben die genannten Installerfehler und eine reale Debian-/ARM64-/PostgreSQL-/systemd-/Pi-/Anlagenabnahme. Dieser Bericht erklärt weder das gesamte Repository für fehlerfrei noch eine Produktions- oder R6-Freigabe. Bericht nach Aufnahme aller acht Endergebnisse eingefroren.
