# Erster echter CI-Lauf: Hersteller-npm gezielt festlegen

Der Sicherheitslauf
[39725190988](https://github.com/NexoWatt/nexowatt-eos/actions/runs/39725190988)
prüfte Quellcommit `2f017f31331dbd6d8f731a5e43516c192a8dc6ad`.
Im frischen nativen Job
[119647367797](https://github.com/NexoWatt/nexowatt-eos/actions/runs/39725190988/job/119647367797)
bestanden die Installation von Node24.22.1, der native PostgreSQL17.11-Build
und der Download samt vollständiger SHA-256-Prüfung des offiziellen
ARM64-Node-Archivs.

Anschließend brach die Paketauflösung mit `BUILD_NPM_TOOLCHAIN` ab. Das
Aktionsprotokoll weist **Node24.22.1 / npm11.19.1** aus; der vorhandene
Hersteller-Buildvertrag verlangt ausdrücklich **npm11.19.0**. Der Abbruch
erfolgte damit vor der vollständigen Laufzeitvorbereitung und vor den neuen
nativen EOS-Prozessprüfungen. Dieser Lauf qualifiziert kein EOS-Paket.

Die gezielte Korrektur betrifft ausschließlich den frischen Hersteller-CI-Job:
Er bestimmt den Installationspräfix aus `process.execPath`, führt die dort
benachbarte npm-CLI mit genau diesem Node-Interpreter aus und installiert
explizit npm11.19.0 in denselben Präfix. TLS-Prüfung bleibt aktiv,
Lifecycle-Skripte sind deaktiviert, Registryabrufe verwenden ein Zeitlimit von
fünf Sekunden und keine Wiederholung. Sowohl die tatsächliche CLI-Version als
auch die benachbarte Paketmanifest-Version werden anschließend geprüft.

Die strikten Laufzeit-/SBOM-Verträge und historischen Toolchains bleiben
unverändert. npm wird nicht auf den Pi mitgeliefert. Die Herstelleranleitung
enthält denselben vorbereitenden Befehl. Lokal wurden YAML-Struktur,
ausschließliche Zuordnung zum frischen Job, Shellsyntax des CI-Schritts und
der Dokumentation sowie `git diff --check` geprüft.

Der korrigierte CI-Lauf, die vollständige Laufzeitvorbereitung und die neue
native EOS-Qualifikation stehen zum Zeitpunkt dieses Nachtrags noch aus.
ARM64-Ausführung, Pi-Installation, Signierung, Veröffentlichung der Lieferung
und Produktionsfreigabe sind weiterhin offen. Der vorherige lokale
Prüfbericht wird nicht rückwirkend als erfolgreicher CI-Nachweis umgeschrieben.
