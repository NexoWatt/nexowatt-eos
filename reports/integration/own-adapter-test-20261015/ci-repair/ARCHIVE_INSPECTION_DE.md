# Backup-Archivprüfung: binäre tar-Streams korrekt dekodieren

Stand: 15.10.2026; Ausgangscommit `3d3aaf8e4c7f81e9465a202558716980b34c0615`.
Bezug: Security-CI `38711864143`, Own-Adapter-Job `116344922983`, Stufe 12.

## Ursache und Änderung

Der Testparser rief `entry.setEncoding('utf8')` auf. Das tatsächlich im
authentifizierten R9-Appbaum enthaltene `tar` 7.5.22 verwendet `minipass` 7.1.3;
dort ist die Kodierung nach Konstruktion unveränderlich. Der Aufruf wirft
`Encoding must be set at instantiation time` aus dem Stream-Callback. Ein
`try/catch` um `await tar.t()` fängt diesen Callbackfehler nicht auf.

Nur `tests/integration-own-adapters/archive-inspection.cjs` wurde funktional
geändert. Der Entry bleibt binär. Ein separater `TextDecoder` mit `fatal:true`
verarbeitet UTF-8 über Chunkgrenzen und wird beim Streamende abgeschlossen.
Decoderfehler werden jeweils im Callback abgefangen; die nach außen sichtbare
Diagnose bleibt `OWN_NATIVE_BACKUP_CONTENT`, ohne Archiveinhalte.

Dateibytes werden vor Dekodierung am Buffer gezählt. Datei-/Konfigurationsgrenzen,
Objekt-/Statezahlen, Canary-, Config-, Pfad-, Duplikat- und Linkprüfungen bleiben
erhalten. Auch bereits mit Newline abgeschlossene überlange JSONL-Zeilen werden
nun vor dem JSON-Parsing durch die vorhandene 1-MiB-Zeilengrenze abgewiesen.
Es gibt keine Änderung am Backup-Produktcode oder an Lizenz-/Releasegates.

## Tatsächlich ausgeführte Prüfungen

Umgebung: Linux x64, Node **24.19.0**; lokaler geänderter Arbeitsbaum.

1. `node --test --test-reporter=tap tests/integration-own-adapters/archive-inspection.test.cjs`
   – **11/11 bestanden**, keine übersprungen. Der simulierte Stream verweigert
   nachträgliches `setEncoding` wie das tatsächliche minipass. Geprüft werden
   UTF-8-Aufteilung in 1/2/3/5-Byte-Chunks, ungültiges/abgebrochenes UTF-8,
   Byte-/Zeilenlimits und sämtliche bestehenden Inhalts-/Pfadnegativfälle.
   [TAP](archive-inspection-regression.tap)
2. `EOS_ARCHIVE_TEST_APP=<authentifizierter-R9-Appbaum> node --test --test-reporter=tap reports/integration/own-adapter-test-20261015/ci-repair/verify-archive-inspection-real.cjs`
   – **3/3 bestanden**, keine übersprungen. Verwendet wurden die tatsächlichen
   Module aus `/workspace/scratch/f5ced8c90b3e/own-module-lab/bundle/payload/app`.
   Der historische Parser wird in einem isolierten Kindprozess geladen und
   reproduziert den Fehler. Der korrigierte Parser liest ein echtes kleines
   `tar.gz` mit mehrbytehaltiger Canary/Config, auch bei Ein-Byte-Lesezugriffen
   auf das Komprimat. Reale Archive mit falscher Canary, doppeltem Export,
   ungültigem/abgebrochenem UTF-8 oder überlanger gültiger JSONL-Zeile scheitern.
   [TAP](archive-inspection-real.tap), [reproduzierbarer Prüfer](verify-archive-inspection-real.cjs)
3. `git diff --check` – bestanden.

[Quell- und Prüfbindung](archive-inspection-source-binding.json) enthält
Dateihashes, tatsächlich verwendete Modulversionen und die Testumgebung.

## Grenzen

Dies weist die Parserkorrektur mit der gelieferten tar-Bibliothek nach.
Der vollständige native Sechs-Adapter-/PostgreSQL-/Backup- und Neustartlauf
muss im neuen Node-24.21.0-CI erneut erfolgreich durchlaufen. Der hier verwendete
kleine Archivfixture ist kein Nachweis einer vollständigen Datenbankwiederherstellung,
kein Pi-Test und keine Produktions- oder Anlagenfreigabe.
