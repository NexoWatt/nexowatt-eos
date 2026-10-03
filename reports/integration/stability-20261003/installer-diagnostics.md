# Begrenzte Installer-Diagnose — 2026-10-03

Nachweis-ID: `EOS-BOOTSTRAP-DIAGNOSTICS-20261003`  
Quellbasis: `66a3762f75e9e0ffc56159fe7142f6059dd550b3`  
Prüfung: 2026-10-03, 17:42 UTC; Linux x64, Node.js `v24.19.0`.

## Problem und Änderung

Der PostgreSQL-Hostinstaller ordnet Fehler bereits einer festen Installationsphase zu. Der äußere Erststart-Runner entfernte diese Phase bei der sicheren Fehlerausgabe. Ein `PG_HOST_COMMAND_FAILED` ließ deshalb nicht erkennen, ob beispielsweise die Kontenprüfung, `initdb` oder der Start der Dienste scheiterte.

`tools/bootstrap/first-start.cjs` erhält die vorhandenen Fehlercodes und Preflight-Prüfkennungen. Zusätzlich übernimmt `safeFailure()` genau diese elf festen Phasen: `accounts`, `directories`, `certificates`, `first-start-security`, `initdb`, `release-state`, `units`, `schema`, `live-database-gate`, `controller`, `first-start-identity-context`. `formatFailure()` zeigt die übernommene Phase als eigene Terminalzeile. Beispiel:

```text
EOS: Installation angehalten; bestehende Daten und Fehlernachweise erhalten.
Fehlercode: PG_HOST_COMMAND_FAILED
Installationsphase: accounts
```

Die Phase benennt den Installationsabschnitt, nicht den einzelnen fehlgeschlagenen Unterprozess. Es gibt keine neue Befehlsausführung, Wiederholung oder Recovery-Automatik. Unbekannte Phasen, beliebige Fehlermeldungen, Befehlsargumente, Standardausgabe, Standardfehler und zusätzliche Fehlerobjekt-Felder gelangen durch diese Änderung nicht in die öffentliche Diagnose. Bestehende Root-, Vertrauensanker-, Besitz-, TTY-, Preflight- und Erststartprüfungen bleiben erhalten.

## Prüfungen und Rohbelege

Ausgeführt aus dem Repository-Verzeichnis:

```sh
node --test --test-isolation=none --test-reporter=tap tests/bootstrap/first-start.test.cjs
node --check tools/bootstrap/first-start.cjs
node --check tests/bootstrap/first-start.test.cjs
```

Ergebnis: **16 Tests bestanden, 0 fehlgeschlagen, 0 übersprungen**; beide Syntaxprüfungen mit Exitcode 0. Die Tests laufen mit simulierten Hostabhängigkeiten und temporären Testdateien. Es wurden keine Systemkonten, Dienste oder produktiven Schlüssel angelegt.

Die beiden neuen Regressionstests prüfen alle elf erlaubten Phasen durch den tatsächlichen Erststart-Runner sowie zwölf fehlende, unbekannte oder falsch typisierte Phasenwerte. Sie prüfen unveränderte Fehlercodes und Preflight-Kennungen, genau einen Installationsversuch, Schließen des TTY, keinen Zugriff auf den Einrichtungscode nach einem Installationsfehler und keine Weitergabe von simulierten Geheimnissen, Pfaden oder Terminalsteuerzeichen. Die 14 bisherigen Tests prüfen weiterhin unter anderem IP-Auswahl, Pins, öffentliche Lizenzschlüssel, TTY und Besitzer-/Dateimodusbedingungen.

- [Vollständiger TAP-Prüflauf](raw/installer-diagnostics.tap)
- [Prüfumgebung](raw/installer-diagnostics.environment.txt)
- [Erster, wegen unvollständiger lokaler Quellkopie gescheiterter Import](raw/installer-diagnostics.initial-missing-source.tap)

Der erste Lauf erreichte keine Testfälle, weil `runtime/controller-profile/websocket-bound.cjs` in der lokalen Quellkopie fehlte. Nach Ergänzung der Quellkopie wurde erneut geprüft. Der hier ausgewertete Lauf verwendet `--test-isolation=none`, damit die Umgebung sämtliche 16 Einzeltests im TAP-Bericht ausgibt; ein vorheriger Standardlauf zeigte lediglich die zusammengefasste Testdatei.

SHA-256 der geprüften Dateien:

| Datei | SHA-256 |
| --- | --- |
| `tools/bootstrap/first-start.cjs` | `09bc26f36840d6f35bae9bb3c0f6cab1ba7a3e9ff2e4ec1b7e29af7d7cbfb51b` |
| `tests/bootstrap/first-start.test.cjs` | `e4027647869a2e8c40f20be1879616259ecc35e12610b81bb23864049f6fdcf8` |
| `raw/installer-diagnostics.tap` | `5d70afde8dca26547773c2ef4cd0b79e612f129e234946f33e1600931e0ec06a` |

Die Quellbasis der beiden geänderten Dateien wurde zusätzlich über die GitHub-Datei-API am genannten Commit gelesen und gegen die Arbeitskopie verglichen. Der Produktionscode-Diff enthält ausschließlich die Phasen-Allowlist und deren Ausgabe; der Test-Diff ausschließlich die zwei neuen Regressionstests.

## Verbleibende Grenzen und Paket-Timeout

Dieser Nachweis belegt keine vollständige Installation auf Debian 13 ARM64, keinen systemd-Dienststart, keinen echten PostgreSQL-Start und keine Wiederherstellung eines bereits abgebrochenen Pi. Die Zielversion Node.js `24.21.0` wurde in diesem isolierten Lauf nicht verwendet. Die Diagnose verhindert den ursprünglichen Hostfehler nicht; sie macht dessen Phase unterscheidbar.

`tools/bootstrap/prepare-host.py` verwendet weiterhin ein Zeitlimit von 1800 Sekunden für `subprocess.run()`, auch bei APT-Pakettransaktionen. Bei dessen Ablauf ist die Koordination laufender `dpkg`-/Paket-Skript-Unterprozesse nicht durch diesen Patch abgesichert. Ob auf einem langsamen oder gestörten Pi Sperren oder ein teilkonfigurierter Paketstand zurückbleiben, wurde hier nicht praktisch geprüft. Kein automatischer Wiederholungsversuch, erzwungenes Beenden oder Entfernen von Paketsperren wird ergänzt. Nach einem tatsächlichen Timeout muss der Paketmanagerzustand vor einer Wiederholung untersucht werden. Eine Änderung der APT-Prozesssteuerung benötigt einen eigenen getesteten Umfang.

## CRA- und SBOM-Zuordnung

Dieser Bericht ist ein Entwicklungs- und Regressionstestnachweis, keine CRA-Konformitätserklärung und keine Produktionsfreigabe. Es werden weder neue Bibliotheken noch neue Laufzeitabhängigkeiten eingeführt. Die Abhängigkeitsinventur verändert sich durch diesen Diagnosepatch nicht; Prüfsummen, Bootstrap-Manifest und die SBOM des konkret neu gebauten Auslieferungsartefakts müssen im Paketierungsnachweis aktualisiert und dem finalen Artefakt zugeordnet werden. Historische Paket- oder SBOM-Nachweise ersetzen diese Zuordnung nicht.
