# Test.3 Revision 4: reproduzierbarer signierter Testbau

Stand: 03.10.2026. Ziel: `0.2.0-test.3`, Lieferrevision 4, Sequenz 7,
Debian 13 ARM64. Der tatsächliche Buildstatus steht erst nach erfolgreichem Bau
in `build-verification.json`; das Vorhandensein dieses Bauplans ist kein
bestandener Build und keine Produktionsfreigabe.

`build-revision.cjs` benötigt einen sauberen Git-Checkout auf Linux mit Node 24
und Python >= 3.11. Es prüft das feste R3-Archiv samt öffentlichem Ed25519-
Schlüssel, vollständigem Dateiinventar und Signatur, bevor der alte App-Baum
als Daten extrahiert wird. Alle übernommenen App-Dateien werden vor und nach
dem Bau bytegenau mit dem signierten R3-Manifest verglichen. Es findet keine
npm-Installation statt, und ARM64-Programmcode wird auf dem Buildhost nicht
ausgeführt. Die bisherige Abhängigkeit von einem privaten Windows-TEMP-Ordner
entfällt.

Die vorhandenen App-SBOM-/Build-/Transformationsbelege werden mit ihren festen
Hashes übernommen. `runtime.cdx.json` muss außerdem dem im R3-Manifest
signierten `sbom.cdx.json` entsprechen. Diese SBOM beschreibt den unveränderten
App-Abhängigkeitsbaum; sie wird nicht als neu ausgeführter Schwachstellenscan
ausgegeben. Die aktuellen Host-/Runtimequellen werden neu inventarisiert und
im neuen Payload-Manifest, in `signed-source-binding.json` und im neuen
Release-Identifier gebunden. Der Hersteller-Lizenztrust wird unverändert mit
seinem bestehenden Fingerabdruck übernommen. Der neue Ed25519-Testsignierer
wird ausschließlich im Speicher erzeugt; sein privater Schlüssel wird nicht
exportiert oder gespeichert.

Zwei bisherige kompilierte Einstiegspunkte (`eebus/build/main.js` und
`nexowatt-backup/build/main.js`) sind im signierten R3-App-Baum vorhanden,
fehlen aber im Git-Quellbaum. Ihre Wiederverwendung ist ausdrücklich auf zwei
feste SHA-256-/Größenpaare und unveränderte zugehörige `src/main.ts`-Dateien
beschränkt. Der neue Beleg bezeichnet sie als wiederverwendete R3-Builddateien,
nicht als neu kompiliert. Weitere fehlende Quelldateien bleiben ein Bauabbruch.
Die Ausführung dieser physischen bzw. Backup-Adapter bleibt durch das bisherige
Testprofil gesperrt.

Die Workflowdatei `.github/workflows/eos-r4-test-delivery.yml` baut nur im
ursprünglichen Repository auf `main`. Der Buildjob besitzt Leserechte. Ein
separater Veröffentlichungsjob erhält ausschließlich für den anschließenden
normalen Git-Push Schreibrechte. Er übernimmt nur die beiden neuen
Lieferordner, diesen Belegordner, den generierten README-Installationsblock und
`system/product.json`. Bestehende Quell-/Belegdateien dürfen durch das Artefakt
nicht geändert werden. Wenn `main` zwischenzeitlich weitergelaufen ist, wird
die Veröffentlichung abgebrochen; es gibt keinen Force-Push. Ein bereits
vorhandenes R4-Paket wird nicht überschrieben.

Lokale Vorprüfung: Die 23 Build-/Archiv-/Katalog-/Revisionsvertragsprüfungen
liefen unter Linux x64 mit Node 24.19.0 erfolgreich. Zusätzlich bestanden vier
Prüfungen der Artefakt-Pfadgrenze; Workflow-YAML und Publisher-Python wurden
syntaktisch geprüft. Der erste Sandboxlauf konnte echte Python-Unterprozesse
nicht fehlerfrei ausführen (`spawnSync EPERM`); der nachfolgende freigegebene
Lauf bestand. Die laufbezogenen Rohdateien liegen im Stabilitätsbericht bzw.
werden beim eigentlichen Build erneut direkt hier erfasst.

Die erzeugten Dateien `app-reuse.json`, `historical-delivery-preservation.json`,
`archive-delivery-verification.json`, `signed-source-binding.json`,
`build-verification.json` sowie die `*.command.json`/`*.log` bilden zusammen
die tatsächlich ausgeführten Bau- und Prüfbelege. Der Actions-Artefakttransfer
hat 30 Tage Aufbewahrungsdauer; erfolgreich veröffentlichte Lieferdateien und
Belege verbleiben im privaten Repository.

**OFFEN:** reale Pi-Vollinstallation, PostgreSQL-/systemd-Zielbetrieb,
Browser-Erststart auf dem Zielgerät, Neustart/Reboot, Recovery, Backup/Restore,
Zertifikatserneuerung und Hardware-/Anlagentests. Eine erfolgreiche CI ist
kein Nachweis für diese Prüfungen und keine CRA-/IEC-Konformitätserklärung.
