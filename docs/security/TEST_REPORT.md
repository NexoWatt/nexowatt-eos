# Lokaler Prüfbericht zur Härtung

Stand 30.09.2026. Basiscommit `18195cd94f1b0972d093128ab4572742515f7799`, Branch `security/eos-first-run-hardening-20260930`.

**98 fokussierte Regressionstests bestanden, keine übersprungen.** Aufteilung: 15 Hostpolicy, 23 CLI/geschützte Installation, 7 Updater-Logs, 12 Profilintegration, 14 statische TLS-Prüfung, 27 SFTP-Fälle einschließlich Untertests. Die produktiven Betriebssystemaufrufe wurden in diesen Tests ersetzt; es fand keine echte Installation oder Rechtevergabe statt. Bei temporären CLI-Dateien wurden Eigentumsszenarien teilweise über stat-Stubs modelliert.

Der vollständige lokale Build (`node tasks --create`), elf Shellsyntaxprüfungen (vier Hauptskripte, drei Sicherheitshelfer, vier erzeugte Bundles) und `git diff --check` waren erfolgreich. Zusätzliche unveränderte Quellproben reproduzierten fünf Wizard- und drei Webserver-Fälle. Zwei separat paketierte Original-onChange-Proben bestätigen den Verlust von TLS-/Username-Optionen im Admin. Diese zehn Ausgangsbefunde gelten nicht als behobene Upstream-Fehler.

Befehle, Rückgabecodes, Zeiten, Werkzeugversionen und Rohlogs: `evidence/final-checks/results.json`. Hashes des tatsächlich geprüften Quellstands: `evidence/final-checks/tested-sources.sha256.json`. Der Hashbeleg identifiziert die vor dem lokalen Commit geprüften Dateien. Die neu eingerichtete GitHub-CI wurde nicht extern ausgeführt.

## Nicht ausgeführt

Keine vollständige Installation vor oder nach Änderungen, da die Arbeitsumgebung kein nutzbares Systemd-Testabbild bereitstellt. Kein produktiver Fixerlauf, reales sudo/UID/Caps-Szenario, SSH/SFTP-Server, Redis-TLS-Handshake, Netzwerk-Mitschnitt, Controller-Gesamtstart, EOS-Admin-Browsertest, eigener Adapter, Hardware-, Anlagen-, Backup/Restore- oder Rollouttest. Diese in den Repositoryvorgaben verlangte Vollprüfung bleibt eine Freigabesperre und wird nicht durch Stubs ersetzt.

## Bewertung

Der Kandidat korrigiert belegte Installer-Codepfade und verweigert mehrere bekannte unsichere Konfigurationen. Die Tests bestätigen diese isolierten Eigenschaften. Eine verschlüsselte Gesamtanlage, frei von Sicherheitslücken, reproduzierbare Produktlieferung oder CRA-/IEC-Konformität ist damit nicht nachgewiesen. Siehe `ACCEPTANCE.md` für Migration, Ausfall-/Wiederanlaufverhalten, offene Lieferkettenbefunde und Zielhardware-Abnahme.
