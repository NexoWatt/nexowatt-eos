# Signierte Node-Laufzeit: Installations- und Native-Verträge

Stand: 22.10.2026. Ausgangscommit:
`99ef5086bc5b0ee590de17e109b85e4738c973ae`.
Die SHA-256-Werte der geprüften Quellen und Testdateien stehen in
[`verification.json`](verification.json), die vollständigen Ergebnisse in
[`tests.tap`](tests.tap). Die Prüfung lief auf Linux x64 mit Node 24.19.0.

## Änderung und Schutzgrenzen

Neue Managed-Testlieferungen ab Sequenz 15 verlangen mindestens Node 24.22.1
innerhalb der Hauptversion 24. js-controller bleibt 7.2.5. Das neue Payload
enthält die Node-Binärdatei, ihre sechs Felder umfassende Metadatendatei und
die unveränderte Upstream-Lizenz. Vor einer Ausführung prüft die signierte
Payload-Validierung Dateiart, ARM64-ELF, Modi, Inventar und Hashbindung.
Die SBOM muss genau eine zusätzliche Node-Komponente samt vollständiger
Archiv-, Binär-, Metadaten- und Lizenzbindung enthalten. Eine solche Komponente
in einer historischen oder ungebundenen SBOM wird zurückgewiesen.

Beim Erstellen ausschließlich neuer Managed-Payloads werden die kopierten
systemd-Node-Aufrufe auf
`/opt/nexowatt/eos/current/node-runtime/bin/node` gesetzt. Der gemeinsame
Release-Zeiger bestimmt damit Anwendung und Node. Die Installationsprüfungen
für PostgreSQL und Ersteinrichtung sowie der native Vorabtest verwenden die
konkrete signierte Kandidatenbinärdatei. Der Zertifikatshelfer verwendet für
Managed-Lieferungen ebenfalls die bereits verifizierte Release-Binärdatei.
Die initiale Hostvorbereitung prüft weiterhin ihren exakten Node-24.22.1-Pin.

Die historische Serialport-Richtlinie und ihre generierten Loader bleiben
unverändert. Die neue separate Richtlinie erlaubt Node 24 ab 24.22.1 nur auf
Linux ARM64 mit glibc ab 2.28, Node-API ab 8 und libuv 1. Die beiden unveränderten
nativen Bibliotheken, ursprüngliche npm-Herkunft, normalisierte Dateibäume und
Loader bleiben exakt gehasht. Electron, NW.js, andere Hauptversionen, ältere
Node-Stände und alternative Bibliothekspfade bleiben ausgeschlossen. Vor jeder
Aktivierung muss zusätzlich die echte Kandidatenlaufzeit beide nativen
Bibliotheken laden und die erwarteten Exporte bestätigen. Versionszulassung
allein gilt damit nicht als ABI-Nachweis. Der Test führt keine Geräte-I/O aus.
Die Normalisierungsevidenz benennt die jeweils angeforderte Kandidatenversion
(einschließlich 24.22.2/24.23.0) und bindet sie mit demselben exakten Evidenzhash
in Python-SBOM und JavaScript-Verifikation; der unveränderliche Baseline-Pin
24.22.1 wird nicht als später tatsächlich geprüfte Version ausgegeben.

Die PostgreSQL-Paketmanifeste grenzen ihre Node-Kompatibilität nun auf die
24er-Linie ein. Historische `LICENSES/PREVIOUS-package.json` bleiben unverändert.
Eine Neuauflösung, SBOM und neue native Buildnachweise für die neue Lieferung
sind weiter erforderlich; vorhandene 24.21-Nachweise werden nicht umgedeutet.

## Tatsächlich ausgeführte Prüfungen

```sh
EOS_NATIVE_TEST_APP=/pfad/zum/verifizierten/originalen/app \
node --test --test-reporter=tap \
  tests/integration/serialport-native.test.cjs \
  tests/postgresql/host-install.test.cjs \
  tests/postgresql/full-product.test.cjs \
  tests/postgresql/own-adapter-product.test.cjs \
  tests/system/install-from-checkout.test.cjs \
  tests/system/sbom-binding.test.cjs \
  tests/integration/payload-architecture-report.test.cjs \
  tests/integration/runtime-architecture.test.cjs \
  tests/onboarding/enrollment.test.cjs \
  tests/system/certificate-host.test.cjs
```

Ergebnis: **137 Tests, 137 bestanden, 0 fehlgeschlagen, 0 übersprungen**.
Der ursprüngliche unnormalisierte npm-Baum wurde in einem vorhandenen lokalen
Auflösungscache gefunden; beide Serialport-Pakete stimmen vor Verwendung mit
allen ursprünglichen Dateihashes der Richtlinie überein. Damit wurden zusätzlich
echte Normalisierung und Python-SBOM-Bindung für 24.22.1, 24.22.2 und 24.23.0
einschließlich Ablehnung falscher Versionsmetadaten geprüft. Die verwendeten
ARM64-Bibliotheken wurden dabei nicht auf dem x64-Host geladen. Zusätzlich bestanden
Node-Syntaxprüfungen für alle in `verification.json` aufgeführten `.cjs`-Dateien,
Python-Syntax für `bind-sbom.py` und `git diff --check`.

Geprüft sind unter anderem strenge Versions-/Architekturgrenzen, unveränderte
historische Loader, feste Dateihashes ohne Ausweichsuche, Ablehnung vor jedem
Dateizugriff/Laden bei falschem Host, exakte Kandidatenpfade und Versionen im
Vorabtest, SBOM-Ablehnung, gerenderte Dienste und modellierte Installation.
Zertifikatstests prüfen echte lokale Zertifikatsoperationen und systemd-Syntax;
Dienststeuerung und Kindprozessantworten sind dort gezielt modelliert.

## Offene Zielnachweise

**OFFEN:** Ausführung der neuen Node-24.22.1-Binärdatei auf ARM64, echte native
Serialport-Ladung, vollständiger frischer Build mit zugehöriger SBOM und neuer
sechs-Adapter-Evidenz, signierte Pi-Erstinstallation, reale systemd-Dienste,
mehrere Node-/EOS-Updates samt Unterbrechung und Rückfall sowie Anlagenbetrieb.
Dieser Bericht ist keine Hardware-, Produktions- oder CRA-Freigabe.
