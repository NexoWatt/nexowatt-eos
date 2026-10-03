# Öffentlicher R4→R5-Reparatureinstieg: Änderungs- und Prüfvermerk

- Datum: 03.10.2026.
- Bezug: bestehender, vollständig eingerichteter R4-Pi; gemeldete fehlgeschlagene
  Admin-Anmeldung; neuer R5-Teststand mit explizit anderem Test-Signierschlüssel.
- Änderung: neuer Generator `tools/bootstrap/build-public-repair-entry.cjs`,
  zugehörige Grenztests und Betriebsanleitung
  `docs/operations/TEST_R4_R5_REPAIR_ENTRY_DE.md`.
- Schutzgrenze: privilegierter Download, Entpacken und Einstieg in die bestehende
  eng begrenzte Reparaturlogik. GitHub-Commit, Archiv, Schlüssel, Skript, Dateigröße
  und SHA-256 sind fest gebunden. Keine veränderliche `main`-URL in der Ausführung,
  keine Redirects, keine Netzwerk-Tokens, keine neuen npm-Abhängigkeiten.
- Startschutz: vorübergehende systemd-Oneshot-Unit mit `ExecStopPost` für die
  operationsgebundene Bereinigung; Python-Wrapper übernimmt ausschließlich die
  von systemd gesetzte `INVOCATION_ID` in eine bereinigte Node-Umgebung.
- Erhalt: kein Überschreiben von R4-Dateien oder bereits erzeugten R5-Einstiegen;
  keine Umsetzung als erneute Erstinstallation.

## Tatsächlich ausgeführte Prüfungen

`node --test --test-reporter=tap tests/bootstrap/public-repair-entry.test.cjs`
prüft 13 Fälle: feste Commit-/Release-/Schlüsselbindung; Ablehnung falscher
Metadaten; Bash-Syntax; Reihenfolge von Größen-/Hashprüfung und Ausführungsgrenze;
echte Hash-/Größen-/Transportfehler; Links und bestehende Downloadziele;
paketierte Entpackhelfer mit manipulierten Archiven; fehlende oder ungültige
systemd-Aufrufkennung; Bereinigung von geerbten Node-/Python-Optionen.

Ergebnis und Quellhashes stehen in `public-repair-entry-verification.json`,
der vollständige bereinigte Testlauf in `public-repair-entry-tests.tap`.
Die Curl-Boundarytests ersetzen ausschließlich das Curl-Programm durch einen
lokalen Transport-Stub und benutzen echtes Bash, `stat` und `sha256sum`.
Der Supervisor-Test fängt `execve` gezielt ab; er behauptet keinen echten
systemd-/SIGKILL-Test.

## Offen

Ein finaler Einzeiler kann erst nach Erzeugung und Veröffentlichung des echten
R5-Archivs und Rücklesen der publizierten Dateien hergestellt werden.
Native ARM64-Reparatur, systemd-Prozessabbruch, Reboot, Admin-Login und
Gerätekommunikation sind durch diese Transporttests nicht nachgewiesen.
Die zugehörigen Zielsystemtests und die tatsächliche R5-SBOM müssen dem Lieferstand
zugeordnet bleiben. Keine Produktions-, Hardware- oder CRA-Freigabe.
