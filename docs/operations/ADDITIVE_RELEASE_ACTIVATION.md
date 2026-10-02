# Geprüfte Adapterpakete ergänzen: additive Test-Releases

Stand: 1. Oktober 2026. Dieser Mechanismus erweitert ausschließlich das getrennte
EOS-Testgrundsystem. Er aktiviert keine Adapterinstanz und enthält keine
Datenbankmigration. Ein Paket im geprüften Release ist damit **installiert**,
aber noch nicht als Gerätefunktion eingerichtet oder aktiv.

## Vertrauensgrenze

Der Release-Orchestrator prüft Signatur, Dateimanifest und Adapterkatalog,
stellt das neue vollständige Release in ein neues rootverwaltetes Verzeichnis
und hinterlegt die extern festgelegte Signieridentität. Erst anschließend ruft
er `tools/system/activate-release.cjs` auf. Der Baustein bietet keine direkte CLI,
keine Netzwerkschnittstelle und keine sudo-Regel für das Dienstkonto.

Vor dem Umschalten prüft er beide installierten Releases erneut mit
`checkInstalled`: Signatur, tatsächlich vorhandene Dateien, Root-Eigentum,
Schreibrechte, exakte Node-Version und Plattform. Beide Signierschlüssel müssen
den Fingerabdruck aus `/etc/nexowatt-eos/release-state.json` besitzen.
Ein Schlüsselwechsel ist kein zulässiges Adapterupdate.

## Zulässige Änderungen

- Eine größere Release-Sequenz und Katalogrevision sind erforderlich.
- Controller 7.2.2, Node-Version und Plattformliste bleiben unverändert.
- Vorhandene Adapter behalten Version, Dateibaum-Digest, Rechte und Freigabe.
- Alle bereits vorhandenen Paket-Lockeinträge der Abhängigkeiten bleiben gleich.
- Vorhandene Programm-, Bootstrap-, Sicherheits- und Unit-Dateien bleiben
  bytegleich. Ausnahmen sind das App-Paketmanifest, die Lockdateien, der
  Katalog, die SBOM und die geprüfte Controller-Profilliste
  `app/node_modules/iobroker.js-controller/eos-test-profile.json`.
- Neue Paketdateien dürfen nur unter neuen Paketverzeichnissen innerhalb von
  `app/node_modules/` liegen. Keine neuen Dateien im bisherigen Controller- oder
  Abhängigkeitsverzeichnis. Die Controller-Profilliste behält alle bestehenden
  Einträge und muss genau zu den Adapterpaketen im geprüften Katalog passen.
- Ergänzte Adapter sind optionale, geprüfte Katalogeinträge. Ihre Instanzen
  werden nicht angelegt. npm und Lifecycle-Skripte laufen auf dem Zielgerät
  nicht; die komplette Abhängigkeitsauflösung geschieht zuvor im Build.

Die strikte Grenze ist beabsichtigt: Ein Controller-Update, eine geänderte
vorhandene Bibliothek, eine Änderung der Dienste oder die Migration von
Nutzdaten benötigt einen gesonderten, geprüften Updatepfad. Neue Pakete können
auch bei unveränderten alten Dateien deren optionale Modulauflösung beeinflussen;
daher bleiben Quellprüfung, Abhängigkeitsprüfung und Integrationsprüfung des
vollständigen neuen Releases notwendig.

## Umschaltung und Rückfall

Die Ausgangsinstallation muss initialisiert sein und der Controller laufen.
Eine exklusive Datei `/etc/nexowatt-eos/.activation.lock` verhindert parallele
Aktivierungen. Der Ablauf wird dauerhaft in
`/etc/nexowatt-eos/activation-status.json` festgehalten:

1. Beide Releases und die additive Änderungsgrenze vollständig prüfen.
2. Den Controller anhalten; Redis-Dienste und Konfiguration bleiben erhalten.
3. Den rootverwalteten `current`-Symlink atomar auf das neue Release umstellen.
4. Ausschließlich beim betroffenen Controller dessen vorherigen systemd-
   Fehl-/Startlimit-Zustand zurücksetzen und den Controller starten. Der systemd-Start umfasst Signatur-/Dateiprüfung,
   authentifizierten TLS-Datenbankprobe und die tatsächliche
   Controller-Readiness-Prüfung über PID, Version und frischen Alive-State.
5. Erst nach erfolgreichem Start Releasezustand und Sequenz dauerhaft speichern.
6. Bei Fehler den Controller stoppen, den bisherigen Symlink wiederherstellen,
   dessen eigenen Startlimit-Zustand zurücksetzen und den vorherigen Controller
   mit denselben Prüfungen starten und den ursprünglichen
   Releasezustand zurückschreiben. Ergebnis: `ACTIVATION_ROLLED_BACK`.
7. Schlägt dieser Rückfall fehl, wird `ACTIVATION_RECOVERY_FAILED` gemeldet und die
   Sperrdatei bleibt bestehen. Ein weiterer Updateversuch wird abgewiesen.
   Ein nicht schreibbares Journal verhindert nicht den Versuch, den alten
   Symlink und Controller wiederherzustellen. Sind anschließend Zustandsdatei
   oder Abschlussjournal nicht dauerhaft speicherbar, bleibt die Sperre auch
   dann bestehen, wenn der vorherige Controller bereits wieder läuft.

Dateien und betroffene Verzeichnisse werden mit `fsync` geschrieben. Trotzdem
sind Symlink, Journal und Zustandsdatei kein gemeinsamer atomarer Dateisystem-
Commit. Bei Prozessabbruch oder Stromverlust kann eine Sperrdatei zurückbleiben.
Die Installation startet ausschließlich aus einem bereits signierten Release;
der genaue Transaktionsabschluss ist dann durch den Betreiber zu prüfen.
Es wird keine getestete automatische Stromausfallwiederherstellung behauptet.
Auf der getrennten Test-VM ist zunächst der Snapshot wiederherzustellen, wenn
die Ursache oder der Zustand nicht eindeutig ist. Eine Sperrdatei nicht
unbesehen entfernen.

## Bedrohungs- und Prüfbezug

| STRIDE | Schutz / Grenze |
|---|---|
| Spoofing | Festgelegter externer Signierschlüssel; beide Releases erneut prüfen |
| Tampering | Bytevergleich vorhandenen Codes, rootverwaltete Dateien, atomare Auswahl und fsync |
| Repudiation | Lokales Vorgangskennzeichen und Zustandsjournal; keine manipulationssichere externe Auditkette |
| Information Disclosure | Keine Geheimnisse in Argumenten oder Statusdaten; keine Nutzdatenexporte |
| Denial of Service | Begrenzte Dienstkommandos, geprüfter Rückfall und Sperre bei unklarem Abschluss; Stromausfalltest offen |
| Elevation of Privilege | Nur Root bedient den Orchestrator; kein Installationsrecht für Laufzeitkonten oder Adapter |

`tests/system/activation.test.cjs` prüft positive Zulassung, Code-/Versions- und
Profilabweichungen, Zustands-/Schlüsselkonflikte, parallele Sperren, erfolgreiche
Umschaltung, fehlgeschlagenen Start, erfolgreichen Rückfall, fehlgeschlagenen
Rückfall und fehlgeschriebenen Releasezustand. Symlink- und Dateioperationen
laufen tatsächlich in temporären Verzeichnissen. Dienstkommandos und
Release-Deskriptoren sind Fixtures. Diese Tests sind kein systemd-, Hardware-
oder Stromausfallnachweis. Signatur-/Artefaktprüfungen besitzen eigene Tests im
Release-Baustein. Rohbeleg: `reports/test-base/activation-tests.tap`.
