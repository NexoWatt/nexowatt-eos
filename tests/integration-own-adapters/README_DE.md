# Native Prüfung: sechs eigene Adapter, unsignierter Kandidat

Dieser neue Harness ist getrennt von der historischen R9-Managementprüfung.
Er ist **kein Installer, kein veröffentlichtes Release und keine Hardwareabnahme**.
Seine Entwicklung allein bedeutet noch keinen bestandenen nativen Lauf.

## Umfang und Bindung

`prepare-app.cjs` authentifiziert das unveränderliche veröffentlichte R9-Archiv
mit festen SHA-256-, Größen-, Signaturschlüssel- und Release-ID-Pins. Eine separate
Kopie bleibt exakte R9-Basis für die Migration. Auf eine zweite Kopie werden
die tatsächlichen aktuellen npm-Paketdateien der sechs eigenen Adapter gelegt;
`npm pack --dry-run --ignore-scripts --offline` führt keine Lifecycle-Skripte aus.

Nur zwei weitere Änderungen sind zulässig: das feste Controllerprofil mit sechs
exakten Paketen und die separat hashgeprüfte CJS-/ESM-Transformation des
Controller-Backup-Stagingpfads. Alle sonstigen Drittanbieterbytes und der
Root-Lock bleiben identisch. `own-adapters-source-binding.json` enthält Quellhashes,
Änderungsinventar und die zugelassenen Transformationen. Ein schmutziger
Quellbaum wird ausdrücklich aufgezeichnet, niemals als sauberer Commit attestiert.
Keine Runtime-Abhängigkeit wird gemockt oder nativ neu gebaut.

Das separate Fixture-Release verwendet Sequenz 13 und eine zufällige **nicht
signierte** Identität ausschließlich zur Ausführung der echten Plattformprüfung.
Der Datensatz führt `signed:false`, `unsignedFixture:true` und
`productionReleaseApproved:false`; eine spätere Lieferung benötigt eigene
Signierung, SBOM-Bindung, Updaterprüfung und öffentlichen Readback.

## Ausschließlich frischer disponibler GitHub-Runner

Node 24.21.0, Linux x64, PostgreSQL 17.11. Folgende Schritte laufen als normaler
Runnerbenutzer, nur die explizite Rootfixture wird über sudo aufgerufen.
`R9_DIR` muss die echte veröffentlichte R9-Lieferung enthalten.

```bash
set -euo pipefail
umask 077
lab_root=$(mktemp -d "$RUNNER_TEMP/eos-own-adapters.XXXXXXXX")
bash tests/integration-controller/prepare-native.sh "$lab_root"
npm --prefix components/ui ci --ignore-scripts --no-audit --no-fund
node tests/integration-own-adapters/prepare-app.cjs "$lab_root" "$R9_DIR"
export EOS_DISPOSABLE_MANAGEMENT_LAB=1 EOS_DISPOSABLE_OWN_ADAPTERS_LAB=1
sudo --preserve-env=GITHUB_ACTIONS,EOS_DISPOSABLE_MANAGEMENT_LAB,EOS_DISPOSABLE_OWN_ADAPTERS_LAB \
  "$(command -v node)" tests/integration-own-adapters/prepare-fixed-root.cjs \
  "$lab_root" "$(id -u)" "$(id -g)"
node tests/integration-own-adapters/run-native.cjs "$lab_root" | tee "$lab_root/own-adapters-native.tap"
```

Die Rootfixture verlangt vollständig fehlende EOS-Verzeichnisse, erzeugt keine
Dienste oder sudo-Rechte und verweigert normalen lokalen Kontext. Hosted-Runner-
Flags nicht künstlich auf einem Entwicklungs- oder Kundensystem setzen.
Sie schützt App, Baseline, Profil und Releasezustand root-eigen vor dem normalen
Testbenutzer. Wie im älteren R9-Harness wird ausschließlich das root-eigene
`/opt` nach allen Vorprüfungen von gruppen-/fremdschreibbaren Rechten befreit.

## Tatsächlich ausgeführte Stufen, wenn der native Job erfolgreich ist

1. Native PostgreSQL-Verbindung mit TLS 1.3 und getrennten Objects-/States-Rollen;
   echter CLI-Setup und historische Erststarteinrichtung.
2. Echte Planung, Journal-Callback, Anwendung, Vorstart-Rücknahme und erneute
   Anwendung der sechs-Adapter-Einrichtung in PostgreSQL. Der Journal-Callback
   dieses Labs ist private Benutzerdatei, **kein Nachweis eines Root-Updaters**.
3. Tatsächlicher Controller mit sechs separaten Adapterprozessen:
   Admin, UI, Devices, EEBUS, OCPP und Backup. Sieben lebende PIDs inklusive
   Controller, echte HTTPS-Anmeldung, root-eigene unveränderte App. Der neue
   Asset-only-Helfer lädt die sechs Pakete ohne Instanz-/Enrollmentänderungen;
   authentifizierte HTTPS-Abrufe prüfen die vier zusätzlichen jsonConfig-Dateien
   bytegenau gegen den Kandidaten. Historische CLI-Uploads der beiden
   Managementpakete gehören ausschließlich zur frischen Baseline vor der
   Migrationsplanung, nicht zum neuen Updateweg.
4. Echter unlizenzierter Start, zentrale NWL3-Home-Aktivierung, Widerruf und
   Pro-Reaktivierung über die HTTPS-Schnittstelle. Ein rein passiver Subscriber
   beobachtet die echten zentralen Messagebox-Antworten für alle fünf Verbraucher.
   Das beweist die zentrale Zustellung, nicht allein jede interne Befehlssperre;
   letztere benötigt die ergänzenden Adapter-Regressionsprüfungen.
5. Devices/EEBUS/OCPP ohne physische Ziele; ihre Verbindung darf nicht als aktiv
   behauptet werden. OCPP muss lizenziert auf Transport-Einrichtung warten,
   ohne Lizenz auf Lizenz warten – nicht fälschlich Listenerbereitschaft melden.
6. Backup muss lizenziert den echten Bereitschaftsstatus `ready`, ohne Lizenz
   `waiting_license` melden. Ein lediglich lebender Prozess genügt nicht.
   Backup-Prozess erzeugt seinen privaten Datenpfad mit tatsächlichem Hostsecret;
   der echte Controller-CLI erstellt zwei lesbare logische Archive, ohne vorherige
   Archive einzuschachteln. Der Archivstream muss einen zuvor real geschriebenen
   zufälligen Testdatensatz als Objekt und State, alle sechs Instanzobjekte, beide
   Enrollmentmarker und die exakte Runtimekonfiguration enthalten. Ein bloß
   lesbares Archiv beziehungsweise CLI-Exitcode 0 genügt nicht. Dies ist
   **kein kompletter OS-/Systemrestoretest**.
7. Nach tatsächlichem Adapterbetrieb: Controller stoppen, Enrollment gegen den
   unveränderten Originalplan zurücknehmen und neu anwenden. Unerwartete
   Instanzänderungen führen zum Abbruch und werden nicht herausgefiltert.
   Anschließend echter Neustart und erneute Lizenz-/Prozessprüfung, zuletzt
   sauberer Shutdown und bytegenau unveränderte Kandidaten-App.

Die nicht konfigurierten Prozesse sind nicht gleichbedeutend mit verbundenen
Geräten oder getesteten Stellbefehlen. ARM64/Pi, systemd-Mountgrenzen,
Anlagenfunktionen, Restore und Reaktionszeiten bleiben offen.

## Veröffentlichungssichere Belege

Nur `own-adapters-native.tap`, `own-adapters-native-evidence.json`,
`own-adapters-native-prepared.json` und `own-adapters-source-binding.json`
ablegen. Niemals private Logs, Datenbank, Archive, Journal, UUID, Zertifikatschlüssel,
Testpasswort oder den ephemeren Lizenzissuer hochladen. Der Supervisor entfernt
den ephemeren Issuer auch nach Fehlschlag. Fehlerausgabe ist auf feste Codes
beschränkt. Ein fehlgeschlagener Teiltest kann `passed:true` nicht erreichen.
Für zwei vollständige Asset-Prüfrunden und zwei echte Datenbankarchive beträgt
das Gesamtbudget 830 Sekunden; der Supervisor beendet den Test nach 840/850
Sekunden. HTTPS-Abrufe behalten ihr eigenes unverändertes 5-Sekundenbudget.

## Lokaler Prüfstand dieser Änderung

Am 15.10.2026 wurden fünfzehn isolierte Fixture-, Zulassungs-, Beobachter- und
Archivparserprüfungen mit Node 24.19.0 bestanden; JavaScript-Syntax und
`git diff --check` ebenfalls. Diese Nodeversion ist **nicht** die qualifizierte
24.21.0 und diese Parser-/Vertragsprüfungen sind **kein** nativer Sechs-Adapterlauf.
Der separate CI-Job `native-own-adapters` verwendet die qualifizierte Version.
Sein tatsächliches Ergebnis muss vor Testlieferung geprüft und quellengebunden
im Freigabebericht aufgenommen werden.

Der unabhängige Quellreview fand eine falsche mögliche Erfolgsanzeige bei späteren
doppelten Archiveinträgen. Der Parser verweigert jetzt doppelte kanonische Pfade,
alternative Schreibweisen, Datei-/Verzeichniskollisionen sowie Nichtdateien an
Pflichtpfaden. Regressionen enthalten insbesondere spätere leere Ersatzdateien
für zuvor erfolgreich geprüfte Exporte; normale TAR-Verzeichniseinträge bleiben
zulässig. Dieser Befund betraf die Testauswertung, nicht einen belegten Restore.
