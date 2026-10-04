# EOS-PID-STATE-001 – Prozessliste außerhalb des signierten Pakets

Stand: 04.10.2026. Betroffen: Controller 7.2.2 und
`@iobroker/js-controller-common-db` 7.2.2 im EOS-Linux-/systemd-Testprofil.
Die genauen geprüften Dateien und SHA-256-Werte stehen in
[evidence.json](evidence.json), die unveränderte Prüfausgabe unter
[raw/tests.tap](raw/tests.tap).

## Befund und Abgrenzung

Die vom Nutzer gemeldete Pi-Ausgabe enthält `EROFS` beim Schreiben und Löschen
von `app/node_modules/iobroker.js-controller/pids.txt`. Die tatsächlich
ausgelieferte Upstream-Funktion `getPidsFileName()` leitet diesen veränderlichen
Zustand aus dem Controller-Codeverzeichnis ab. Das passt nicht zu einem
schreibgeschützten, signierten EOS-Paket und `ProtectSystem=strict`.

Der Controller fängt beide Dateifehler ab und protokolliert sie. Der neue Test
führt genau diesen Fehlerpfad aus. Dieser Befund allein erklärt **nicht** die
separate Meldung `CONTROLLER_NOT_READY`; deren Datenbank-/Hostobjektpfad muss
gesondert geprüft und behoben werden. Auch ein erfolgreicher PID-Test bestätigt
keinen erfolgreichen Admin-Login oder Anlagenbetrieb.

## Änderung und Sicherheitsgrenze

Der neue, ausschließlich bei der Herstellerassemblierung verwendete Transform
`runtime/controller-profile/pid-state.cjs` ändert die zentrale Pfadfunktion in
beiden ausgelieferten CJS-/ESM-Modulen auf
`/var/lib/nexowatt-eos/iobroker-data/pids.txt`. Damit benutzen Schreiben, Lesen
und Löschen denselben Ort. Es gibt keinen neuen Umgebungsparameter oder
Pfadschalter. Die passende TypeScript-Quelldatei wird mit originalem und
transformiertem Hash als nachvollziehbares Quellenabbild geprüft.

Der bestehende Installer richtet das Datenverzeichnis mit Modus `0700` und
Eigentümer `eos-runtime` ein. Der bestehende Controller-Dienst verwendet
`UMask=0077`, wodurch die Prozessliste als `0600` entsteht. Die vorhandenen
`ReadWritePaths`, `ProtectSystem=strict`, `KillMode=control-group` und
Release-Integritätskontrollen bleiben erhalten. Für den Codepfad wird keine
Schreibberechtigung hinzugefügt. systemd verwendet die PID-Liste nicht als
vertrauenswürdige Dienstidentität (`PIDFile=` wird nicht eingeführt).

Build-Eingänge und -Ausgänge sind exakt an SHA-256 gebunden. Paketversion,
beide Exporte und die Auflösung des gemeinsamen Moduls durch Controller,
Common und CLI werden zusätzlich geprüft. Fremde bzw. verschachtelte
Modulkopien und Symlinks an Builddateien oder deren Eltern werden abgewiesen.
Alle Eingänge werden vor dem ersten Schreiben geprüft. Ein zweites Anwenden
auf bereits transformierte Bytes scheitert geschlossen.

Die Laufzeitdatei liegt absichtlich im schreibbaren Verzeichnis derselben
Dienstidentität. Das ist keine neue Isolation zwischen bereits kompromittierten
Prozessen derselben UID. Ein solcher Prozess könnte PID-Inhalt oder Links dort
ändern; die Änderung erteilt ihm aber keine zusätzlichen UID-, Root- oder
Release-Schreibrechte. Bestehende POSIX-Dateiaufrufe werden nicht als
TOCTOU-sichere oder privilegierte Prozesssteuerung ausgegeben. Privilegierte
Dienststeuerung bleibt bei systemd.

## Tatsächlich ausgeführte Prüfungen

`node --test --test-reporter=tap tests/system/controller-pid-state.test.cjs tests/system/controller-profile.test.cjs`

Ergebnis unter Node `v24.19.0`: **42/42 bestanden** – 13 neue PID-Verträge und
29 vorhandene Controller-Profilprüfungen. Geprüft wurden echte, vollständige
veröffentlichte CJS-/ESM-Eingänge, ihre Node-Syntax, Hashabweichungen,
Paket-/Exportabweichungen, fremde Modulauflösung und Symlinks. Die tatsächlichen
Upstream-Funktionen zum Schreiben, Lesen und Löschen der Prozessliste laufen
gegen ein privates temporäres Dateiverzeichnis. Dabei werden der feste absolute
PID-Pfad auf dieses Testverzeichnis abgebildet und der EROFS-Fehler für den
unveränderlichen Codepfad injiziert. Der Test prüft die alten Fehlermeldungen,
den neuen Lebenszyklus einschließlich `0600` und das unveränderte Codeverzeichnis.

Dies ist ein dateisystemgestützter Funktionstest mit nachgebildeter
Schreibschutzgrenze, kein nativer systemd-Mounttest. Pi-Start, Neustart,
Admin-Login und vollständige Integrationsabnahme sind in diesem Beleg **OFFEN**.
Ein früher Prüflauf bestand 12/13 Fälle: Der Symlink wurde bereits durch die
Modulauflösungsprüfung abgelehnt, bevor der vom Test erwartete Dateifehler
erreicht wurde. Die Erwartung wurde korrigiert und um beide Modulvarianten
erweitert; keine Schutzprüfung wurde entfernt.

## Auslieferung und Rückfall

R4, R5 und R6 sowie deren bestehende Signaturen, Archive und historische
Controller-Profilpins werden nicht verändert. Der neue Kandidatenbauer muss
`applyToBuild(app)` einmal im isolierten Buildbaum ausführen und
`verifyBuild(app)` beim unabhängigen Artefaktnachbau erneut prüfen. Die zwei
geänderten common-db-Dateien müssen in Kandidatenmanifest, SBOM-Ableitung und
Signatur enthalten sein. Ein Quellcommit allein behebt keine laufende Pi-Instanz.

Nach Installation des neuen signierten Testkandidaten sind Controllerstart,
PID-Datei `0600`, Host-Alive, Neustart und das Entfernen der Prozessliste beim
kontrollierten Stop zu prüfen. Bestehende Datenbank-/Lizenzdaten und die
Rollbackbedingungen des Updatewerkzeugs bleiben eigenständige Schutzgrenzen.
Dieser Änderungsstand enthält keine Produktions-, Anlagen- oder
CRA-/IEC-Konformitätsfreigabe.
