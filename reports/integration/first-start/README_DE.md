# Erststart-Nachweise

Die [maschinenlesbare Übersicht](verification-summary.json) trennt lokale
Erfolge, übersprungene Prüfungen, fehlgeschlagene Plattformversuche und den
Paketbaustand. Die Lieferquellen stehen in [delivery-sources.json](delivery-sources.json).
Diese Hashes wurden nach den Tests aufgenommen. Sie identifizieren den gelieferten
Stand, sind aber keine kryptografische Bindung der Quellen zum Ausführungszeitpunkt.
Alle Pi-/Geräte-/Anlagentests sind offen. Test.2-Verifikation ist ausschließlich
ein vom Nutzer gemeldeter historischer Bundle-Nachweis.

## Reproduktion

Node 24.21.0; Windows x64; OpenSSL aus der vorhandenen Git-Installation.
Auf Linux `openssl` im PATH bereitstellen. Die Tests erzeugen ausschließlich
kurzlebige eigene Testzertifikate und Testgeheimnisse.

```sh
node --test --test-reporter=tap tests/onboarding/*.test.cjs tests/integration/accounts.test.cjs tests/integration/enrollment.test.cjs
node --test --test-reporter=tap tests/integration/build-runtime.test.cjs tests/postgresql/full-product.test.cjs
node --test --test-reporter=tap tests/system/first-start-finalizer.test.cjs tests/system/first-start-integration-contract.test.cjs
node --test --test-reporter=tap tests/system/first-start-license.test.cjs tests/system/first-start-cleanup.test.cjs
```

Die Admin-Tests und die zusätzlich geprüften Dienstverträge liegen unter
`reports/onboarding/`; der [Sicherheitsbericht](../../../docs/security/ONBOARDING_ACCOUNTS_REVIEW_DE.md)
beschreibt Testumfang und Auslassungen. Echte lokale TLS-/Passwortprüfungen
sind von Speicherdoubles, simulierten Hostwirkungen und statischen Unitprüfungen
zu unterscheiden. Die Frontendtests verwenden einen DOM-Testdouble; ein echter
grafischer Browser war über das bereitgestellte Browserwerkzeug nicht verfügbar.

Die zusätzlichen älteren Befehle `node --test tests/system/release-cli.test.cjs`
und `node --test tests/integration/web-certificates.test.cjs tests/postgresql/unit-grammar.test.cjs`
scheiterten hier an POSIX-Rechten, Linuxmanifesten beziehungsweise `/root`;
Systemd-Prüfung wurde ausdrücklich übersprungen. Diese roten Ergebnisse sind
keine Erfolge und bleiben mit Fehlermeldungen im Verzeichnis `raw/` erhalten.

Die zusätzlichen TLS-/SFTP-Sicherheitstests bestanden mit OpenSSL im PATH
(41 Tests). Der erste Versuch ohne OpenSSL bleibt ebenfalls dokumentiert.
Die vier Python-Sicherheitssuites wurden ausgeführt und scheiterten unter
Windows/Git Bash an fehlendem `geteuid`, POSIX-Werkzeugen beziehungsweise
`/tmp`-Rechten; siehe `python-security-regression.json`. Diese Befunde sind
keine bestandene Linuxprüfung.

Nach Änderungen zuerst die betroffenen Suites tatsächlich ausführen. Anschließend
`python tools/integration/record-first-start-evidence.py` bindet die vorhandenen
TAP-Ausgaben und aktuellen Lieferquellen. Der Recorder führt keine Tests aus und darf
eine erneute Ausführung bei geänderten Prüfgegenständen nicht ersetzen.

## SBOM und Paketbau

`source-lock-inventory.cdx.json` beschreibt sechs Quellen und 4313 deklarierte
Lockeinträge einschließlich Entwicklungsabhängigkeiten. Das ist keine SBOM
einer installierten Zielanlage. `first-party-source.cdx.json` bindet eigene
geänderte Quellen und Testeingaben. `sbom-validation.json` hält die Offline-
Schema-Prüfung gegen das vorhandene CycloneDX-1.5-Schema fest.

Ein Runtime-Kandidat wird mit dem neuen `assemble-postgresql-test.cjs` in einem
frischen externen Buildverzeichnis zusammengestellt. Quellenprüfungen, komplette
Paketinstallation, Controllerprofil, Architektur-/ABI-Gates, tatsächlicher
Runtime-SBOM und Signatur bleiben getrennte Schritte. Status und konkrete
Blocker stehen in `build-status.json`. Der vollständige Offlinebau `d` wurde
erfolgreich zusammengestellt. `runtime-package-lock-d.json`,
`runtime-full-d.cdx.json`, `runtime-sbom-coverage-d.json` und das tatsächliche
Dateiinventar belegen seinen Umfang. Die SBOM umfasst 686 installierte npm-
Pakete; die Architekturprüfung zählt mit dem Rootmanifest 687 Paketmanifests.
`runtime-architecture-full-d.json` meldet 25 Native-/ABI-Befunde. Deshalb wurde
kein neuer signierter test.3-Kandidat erzeugt. Für das Signieren gilt außerdem
eine explizite Linux-Pflicht; Windows-Modi sind kein POSIX-Schlüsselnachweis.
Es ist unzulässig, den historischen test.2-Inhalt als fertigen dev9-Build auszugeben.

`export-first-start-source.py` erzeugt am Ende ein vollständiges Quellarchiv
einschließlich unveränderter historischer Lieferungen, Dokumentation und
Rohbelegen. Der Export enthält aktuelle Arbeitskopieänderungen, keine lokale
Git-Objektdatenbank und keine Buildcaches. Jeder ZIP-Eintrag wird zurückgelesen
und gegen den Quellhash geprüft; das äußere Liefermanifest enthält alle Dateien.
