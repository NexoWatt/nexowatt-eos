# Build-Archiv: Zeitbudget

Der Python-Aufruf in `tools/integration/create-test-archive.cjs` erhält für
Archivschreiben und Rückprüfung jeweils 1.200 Sekunden statt 300 Sekunden.
`ETIMEDOUT` wird getrennt als `TEST_ARCHIVE_TIMEOUT` gemeldet. Andere
Prozessfehler bleiben `TEST_ARCHIVE_IO`. Runtime-Verifier und Zielentpackung
wurden nicht verändert.

`archive.tap` enthält den erneuten gezielten Lauf mit 14 bestandenen Tests,
ohne Fehler oder Skips. `archive.json` bindet den Rohlog und die vor/nach dem
Lauf unveränderten Quellen mit SHA-256. Die ältere Evidence im Elternordner
bleibt unverändert und beschreibt ihren damaligen Quellstand.

Zusätzlich wurde das tatsächliche Helfermodul zweimal mit ausschließlich
ersetztem `child_process.spawnSync` geladen. Geprüft wurden das Zeitbudget
von genau 1.200.000 ms, `shell: false`, Python `-I -B` und die Zuordnung von
`ETIMEDOUT` zu `TEST_ARCHIVE_TIMEOUT` sowie `ENOENT` zu `TEST_ARCHIVE_IO`.
Dies simuliert die Prozessantwort; eine reale 20-Minuten-Zeitüberschreitung
und deren Betriebssystem-Prozessabbruch wurden nicht ausgeführt.

Der Lauf bestätigt keinen vollständigen Produktbuild, keine Zielinstallation
und keine Browser-, Raspberry-Pi- oder Hardwareabnahme. Diese Tests bleiben
offen; daraus folgt keine Produktions- oder Anlagenfreigabe.
