# R11: eigenständige signierte Netzwerktest-Auslieferung

**Aktueller Veröffentlichungsstand:** Der [Nachtrag zur abgeschlossenen Veröffentlichung](#abgeschlossene-r11-veröffentlichung-am-20102026)
bestätigt das signierte R11-Artefakt und den öffentlichen Updatebefehl. Die
ursprünglichen Vorbereitungs- und lokalen Prüfvermerke bleiben darunter erhalten.

Stand: 20.10.2026. Dies sind Builder, Prüfer und Ablauf für eine **neue**
Testrevision R11 (Sequenz 14). Dieser Vermerk behauptet weder ein bereits
signiertes R11-Artefakt noch einen ausgeführten Pi-Updatevorgang.
Historische R10-Archive, Schlüssel und Installationspins bleiben unverändert.

Der installierte Ausgangspunkt ist ausschließlich die gesunde, abgeschlossene
R10-Testrevision (Sequenz 13, Release
`9073b20a1c9f54eb4870b3b37a4a8ef59c6916feb379234aa6d14986a3fc26f0`).
Die sechs Adapter und ihre Zulassung bleiben erhalten. Die kontrollierte
Änderung umfasst Admin, drei Python-Dateien des getrennten Netzwerkdienstes,
seine systemd-Dateien und den fest begrenzten Installations-/Updatepfad.
Zusätzlich enthält der Stand die ausdrücklich beauftragte Influx-Sicherheitskorrektur
in genau drei Backitup-Laufzeitdateien (`build/lib/influxDbCli.js`,
`build/lib/scripts/12-influxDB.js`, `build/lib/restore/influxDB.js`): TLS-Prüfung
und Fehlerweitergabe. Die mitgelieferte bestehende Testdatei
`test/influxdb-cli.js` erhält ausschließlich die dazugehörigen TLS-Erwartungen.
Die fünfte erlaubte Datei ist ausschließlich `release-manifest.json`; ihre
vorhandenen Dateieinträge erhalten nach Compile-/Testprüfung die aktuellen
Hashes und werden durch den vorhandenen Publish-Gate geprüft. Die exakten
Manifestbytes gehören zusätzlich zur Quellenbindung und zum App-Inventar.
Andere Backitup-Dateien, Abhängigkeiten und Paketmetadaten
dürfen sich nicht ändern. Die Backitup-Prüfberichte führen die fachlichen
Prüfungen gesondert; der vollständige aktuelle App-Baum bleibt an den nativen
CI-Nachweis gebunden. Das technische Netz ist nach der Installation noch nicht eingerichtet.

## Quellen, tatsächliche Prüfebene und Signierung

Der vorhandene generische Adapter-Builder rekonstruiert die aktuellen eigenen
Adapter aus dem authentifizierten R9-App-Baum. Dies ermöglicht die unveränderte
Prüfung der tatsächlich rekonstruierten App durch die bestehende native
Adapter-CI. Der R11-Builder authentifiziert **zusätzlich R10** und prüft den
vollständigen installierbaren Übergang R10→R11. `assemblyBaseReleaseId` und
`previousReleaseId` benennen diese unterschiedlichen Bezüge ausdrücklich.
Abhängigkeiten werden dabei nicht neu aufgelöst. Der vorhandene
SBOM-Derivatprüfer bindet den tatsächlich enthaltenen App-Baum. Für Sequenz 14
verlangt der Laufzeitprüfer einen eigenen festen Assembly-Marker, den R9-
Aufbaubezug, R10 als Update-Ausgangspunkt und `target-sequence=14`. Der bisherige
Sequenz-13-Marker bleibt auf Sequenz 13 beschränkt. App-, Modus-, Komponenten-
und Transformationshashes werden vollständig weitergeprüft. Die SBOM beschreibt
den gebündelten App-Abhängigkeitsbaum; sie ist kein vollständiges Pi-OS-Inventar.

`.github/workflows/eos-r11-test-delivery.yml` signiert nur nach einem separaten,
kanonischen Marker-Commit `.github/eos-r11-build-request.json` mit Revision 11
und dem unmittelbaren Eltern-Commit. Gewöhnliche Quellenänderungen lösen keine
Signierung aus. Für den exakten Marker-Commit müssen jeweils die neuesten
Push-Läufe von `security-review.yml` und `eos-network.yml` erfolgreich sein.
Ein fehlender, laufender oder fehlgeschlagener neuerer Lauf wird nicht durch
einen alten Erfolg ersetzt. Workflow-Dispatch kann nur die Veröffentlichung
eines bereits vorhandenen vollständigen R11-Artefakts fortsetzen.

Der Netzwerk-Nachweis verlangt alle benannten echten DHCP-, IPv4-, IPv6-, DNS-,
Firewall- und Ablaufprüfungen aus `tests/network/native_namespace.py`. Die
Namespace-Prüfung ist kein systemd- oder Pi-Test. `native-evidence.cjs` bindet
das Rohresultat an den sauberen Quellcommit und die Hashes aller erfassten
Admin-/Netzwerk-/Installationsdateien. Quelle und App-Inventar werden vor dem
Signieren und vor dem Publizieren erneut verglichen. Die Publikation führt
keinen Code aus dem Kandidaten aus; sie rekonstruiert das Paket mit dem
geprüften Quellcheckout. Jedes neue Archiv erhält eine eigene ephemere
TEST-Signatur, Dateitabelle, Katalogbindung und SBOM.

## Hosttransaktion und Rückfall

Der Updater authentifiziert zuerst beide Releases, fest gepinnte Schlüssel,
R10-Provenienz, installierte Units, geschützte Konfiguration und die sechs
laufenden Adapter. Der neue Python-Installer wird erst aus dem vollständig
geprüften, root-eigenen Release aufgerufen. `--check` liegt vor der
Controller-Unterbrechung. Fehlende OS-Werkzeuge führen zum Abbruch; der
Updater führt kein APT und keine beliebigen Shell-Kommandos aus.

Nach dem Stoppen wird das zunächst unkonfigurierte Addon installiert. Danach
wechseln der aktive Releasezeiger und der gebundene Zustand. Die vorhandene
signierte Upload-Unit übernimmt und prüft die neuen Admin-Assets. Der
Controller startet erst bei aktivem Netzwerkdienst. Die neue feste
Controller-Abhängigkeit erhält diese Reihenfolge auch beim Booten.

Bei einer abgefangenen Störung werden Teilinstallationen zurückgenommen und
gegebenenfalls die alten signierten Admin-Assets erneut eingespielt und geprüft,
bevor R10 erneut starten darf. Eine fehlgeschlagene Rücknahme, fremd veränderter
Zustand oder fehlende Bereitschaft lässt den Controller gestoppt und die
Wartungssperre bestehen. Abrupter Prozessabbruch wird durch den bestehenden
supervidierten Quiesce-Pfad begrenzt; automatische erfolgreiche Wiederherstellung
nach Stromausfall ist damit nicht nachgewiesen. Nach der ersten bewussten
Netzwerkeinrichtung verweigert der Installer seine Installationsrücknahme.

## Ausgeführte lokale Prüfungen

Befehle im Repository:

```sh
node --test tests/system/update-test-to-r11.test.cjs
node --test reports/integration/network-test-20261020/release/release-contract.test.cjs
node --test tests/bootstrap/public-r11-update-entry.test.cjs tests/bootstrap/public-r11-update-publication.test.cjs tests/bootstrap/r11-delivery-workflow.test.cjs tests/bootstrap/r11-native-artifact.test.cjs
python3 -I -B tests/bootstrap/r11-candidate-publication.test.py
```

Ergebnis des finalen lokalen Laufs: **73 Node-Tests und 19 Python-Tests
bestanden**, ohne übersprungene Node-Fälle. Rohbelege und geprüfte Quellhashes:
`../delivery-contracts.tap`, `../delivery-publication.txt`,
`../delivery-contracts.json`.

Diese Tests prüfen die Update-, Signatur-, Pfad-, Zustand-, Rückfall-,
Nachweis- und Veröffentlichungsgrenzen mit temporären Dateien und gezielt
injizierten Fehlern. Hostbefehle und native Prüfer sind dabei Fixtures;
keine Live-Netzwerkänderung, systemd-Installation oder Hardwareprüfung wird
hieraus abgeleitet. Der unabhängige native Packet-Nachweis bleibt ein separater
Pflichtnachweis der CI. Lokaler Builder-Aufruf ohne beide echten Nachweise
ist keine zulässige Abkürzung.

Der unsignierte Zusammenbau wurde tatsächlich ausgeführt. Die anfänglich
abweichende Admin-Prebuilt-Bindung wurde erst nach Quellen-, Build-, Browser-
und Sicherheitsprüfung neu versiegelt. Der fehlende UI-Compiler wurde über
das vorhandene Lockfile ohne Lifecycle-Skripte installiert. Eine zwischenzeitliche
Änderung der Backup-Quelldateien wurde korrekt als `R9_SOURCE_CHANGED`
abgewiesen. Danach lief die authentifizierte App-Rekonstruktion mit eingefrorenen
Quellen durch. Die abschließende Payload-Prüfung fand die noch auf Sequenz 13
beschränkte SBOM-Regel; deren explizites Sequenz-14-Profil wurde mit eigenen
Negativtests ergänzt, ohne den bisherigen Sequenz-13-Vertrag zu lockern.

Die Fortsetzung am tatsächlich rekonstruierten **unsignierten** Payload mit
aktueller SBOM-Metadatenbindung, Laufzeitprüfer und Updater war erfolgreich:
22.346 Payload-Dateien, 2.073 aktuelle Paketquelldateien und 134 aktuelle
Hostquelldateien wurden gebunden. Die kanonischen Dateimodi, vollständige
Payload-/SBOM-Prüfung, authentifizierte R10-Ausgangssignatur und der begrenzte
R10→R11-Übergang bestanden. Der lokale Diagnoseprozess verwendete Node 24.19.0
und einen noch nicht committeten Arbeitsbaum; er erzeugte kein signiertes
Archiv und ersetzt keinen CI-Nachweis. Beleg: `../unsigned-assembly-rehearsal.json`;
verwendeter Fortsetzungsbefehl: `../unsigned-assembly-rehearsal-command.txt`.
Dieser Diagnosebeleg gehört zum dort angegebenen Quellstand vor der späteren
CI-Korrektur des Backup-Release-Manifests. Dessen neue Bytes und die angepasste
native IPv6-Prüfung benötigen die vollständigen Prüfungen des nächsten exakten
Quellcommits, bevor ein R11-Archiv signiert werden darf.

## Ausführung und offene Zielabnahme

Nach einem sauberen, committeten und technisch geprüften Quellstand erstellt
nur der autorisierte Marker-Push die neue Lieferung. Ein manuell gestarteter
lokaler Build benötigt Node 24.21.0, die authentifizierten historischen R9/R10-
Dateien, den gesperrten UI-Compiler und beide echten Nachweise im angegebenen
Verzeichnis:

```sh
node reports/integration/network-test-20261020/release/build-revision.cjs --native-evidence /absoluter/pfad/zu/exakten-ci-nachweisen
```

Der spätere öffentliche Updatebefehl wird erst aus dem signierten und
veröffentlichten R11-Artefakt erzeugt, auf einen unveränderlichen Commit und
Hashes gebunden und über HTTPS bytegenau zurückgelesen. Es wird vor diesem
Schritt kein Installationsbefehl mit erfundenen Pins bereitgestellt.

OFFEN bleiben die Installation auf dem konkreten Pi, echte systemd-Unterbrechung,
Stromausfall und vollständige Wiederherstellung, Geräteverträglichkeit,
Lastmessungen und Anlagenabnahme. Erforderliche OS-Werkzeuge sind vor dem
Update aus den verifizierten Debian-Paketquellen bereitzustellen. Die konkrete
Netzwerkeinrichtung und der funktionale Pi-Test erfolgen erst nach der
Installation anhand der Betriebsanleitung. R11 ist eine technische
Testauslieferung; eine Produktionsfreigabe wird nicht behauptet.

## Abgeschlossene R11-Veröffentlichung am 20.10.2026

Der [Auslieferungslauf 39391220133](https://github.com/NexoWatt/nexowatt-eos/actions/runs/39391220133)
bestand alle vier Jobs. Für denselben Quellcommit
`cdf897240272b2adeeeec3e0511fcd1593984687` sind Security-, Netzwerk- und
CodeQL-Qualifikation erfolgreich abgeschlossen.
Die exakten Laufbindungen stehen in [native-workflow.json](native-workflow.json)
und [network-workflow.json](network-workflow.json), der abgeschlossene
Gesamtstatus in [qualification.json](../qualification.json).

Das signierte Archiv der Revision 11, Sequenz 14 trägt Release-ID
`d7b7105ce6e3ac85a828c3e441271c4597b58886456afb0075893472fe788582`.
[Lieferidentität](../../../../delivery/test-pi-0.2.0-test.3-r11/delivery.json)
und [Buildprüfung](build-verification.json) binden das Archiv, 22.346 signierte
Dateien und die geprüfte App-/SBOM-/Quellenidentität. Der ursprüngliche
Buildbeleg bleibt unverändert und beschreibt mit `published: false` die Phase
vor der anschließenden Publikation.

Archiv, öffentlicher Schlüssel und Liefermetadaten sind am Asset-Commit
`c51f6324b6acf6d9e81cb0a550d0bc8975df143d` veröffentlicht und
[öffentlich bytegenau zurückgelesen](../../../../delivery/public-update-test3-r11/remote-readback.json).
Der [fertige R11-Updatebefehl](../../../../delivery/public-update-test3-r11/UPDATE_COMMAND.txt)
ist am Einstieg-Commit `69ba537984299bcfaf7ddfd2ab2156b1c27721e8` gebunden;
[Befehlsprüfung](../../../../delivery/public-update-test3-r11/command-verification.json)
und Command-Commit `90d5b171ae13d2d8fa844f9bc9472190cd083b3d` ergänzen den
Veröffentlichungsnachweis. Der Befehl gilt ausschließlich für den gesunden,
abgeschlossenen R10-Teststand mit Node 24.21.0 unter Linux ARM64. Die
[Betriebsanleitung](../../../../docs/operations/TECHNICAL_NETWORK_TEST_DE.md)
beschreibt Voraussetzungen und bewusste Einrichtung des zunächst unkonfigurierten
Gerätenetzes.

Die native Linux-Namespace-Prüfung bestand 23/23 Fälle. Reale systemd-
Installation und Unterbrechung, Pi-/USB-/Geräteverträglichkeit, Stromausfall,
vollständige Wiederherstellung und Anlagenabnahme bleiben offen. Die
Veröffentlichung hat keinen Zielhost aktualisiert und erteilt keine
Produktions- oder CRA-Freigabe. Historische Prüfbelege und signierte
Auslieferungsdateien wurden für diesen Nachtrag nicht verändert.
