# EOS-Grundsystem: signierte Testpakete und geschützter Start

Änderungskennung `EOS-BASE-20261001`; Entwicklungsprofil `0.1.0-test.1`.
Dies ist eine technische Testbasis für ein frisches System. Eine Produktiv-,
CRA- oder IEC-Freigabe folgt daraus nicht. Die Hardwareabnahme bleibt offen.

## Sicherheitsgrenze

`runtime/release/bundle.cjs` signiert die **unveränderten Manifestbytes** mit
Ed25519. Das Manifest bindet jeden regulären Payloadpfad, SHA-256, Dateigröße
und Modus sowie Produkt, exakte Node-Version, Testprofil, Architektur und
aufsteigende Sequenznummer. Es enthält keine Downloadbefehle. Der Signierschlüssel
bleibt auf dem geschützten Hersteller-/Buildrechner, außerhalb von Git und Paketen.
Der prüfende öffentliche Schlüssel wird vom vertrauenswürdigen Root-Operator
getrennt bereitgestellt; ein vom Paket mitgebrachter Schlüssel wird nicht akzeptiert.
`keygen` erzeugt ausschließlich ausdrücklich bezeichnete Testschlüssel; es gibt
keinen eingebauten privaten Schlüssel und keine Standardzugangsdaten.

Die Dateiliste wird nach der Signaturprüfung und beim Kopieren erneut geprüft.
Symlinks, Hardlinks, Spezialdateien, Pfadübertritte, gefährliche Dateimodi,
unerwartete Dateien und überschrittene Größen werden abgewiesen. Die Inventur ist
begrenzt. Leere Verzeichnisse enthalten keine ausführbaren Bytes und gehören nicht
zur signierten Dateiliste; benötigte Verzeichnisse erhalten eine signierte Markerdatei.
Staging erfolgt in ein neues Verzeichnis; erst vollständig geprüfte Dateien
werden unter ihrer Manifest-ID bereitgestellt. Dateien und Verzeichnisse werden
vor der finalen Umbenennung synchronisiert. Dies ersetzt keinen Stromausfalltest.

**Lokale Konkurrenz ist relevant:** `O_NOFOLLOW` schützt nur den letzten
Pfadbestandteil. Deshalb akzeptiert der privilegierte Einstieg ausschließlich
Root-eigene, symlinkfreie Importdateien und Elternverzeichnisse ohne fremde
Schreibrechte. Unvertrauenswürdige Downloads müssen vorab unprivilegiert entpackt
und durch den Operator in einen geschützten Importbereich übernommen werden.
Der Runtimebenutzer erhält keinen Zugriff auf diesen Installationsweg und keine
sudo-Freigabe. Ein kompromittierter Root-Operator liegt außerhalb dieser Grenze.

## Paketaufnahme und Systemstart

`tools/system/build-bundle.cjs` kopiert einen bereits vorbereiteten, geprüften
npm-Baum. Es startet keine Paket-Hooks und lädt nichts nach. Exakte direkte
Abhängigkeiten müssen zu Lockfile, installierten Paketidentitäten, freigegebenem
Katalog und Komponenten-Hashes passen. Das vollständige Manifest bindet auch
transitive Abhängigkeiten. `prepare-catalog.cjs` erzeugt ausschließlich
**ungeprüfte** Einträge; Inventarisierung wird nicht zur Freigabe umgedeututet.

Der Katalog allein sandboxed keine Adapter. Der Controller erhält zusätzlich ein
immer aktives, versions- und quellhashgebundenes EOS-Profil, und systemd hält
Programmbaum und Basiskonfiguration schreibgeschützt. Details:
[`ADAPTER_ADMISSION.md`](ADAPTER_ADMISSION.md) und
[`CONTROLLER_TEST_PROFILE.md`](CONTROLLER_TEST_PROFILE.md).

Vor dem Controllerstart prüft `installed-check.cjs` erneut die gespeicherte
Signatur, den vollständigen Codebaum, Eigentümer, Modi, Plattform und Node-Version.
Anschließend werden beide Datenbanken authentifiziert über TLS geprüft. Erst
nach sicherer Initialisierung darf der Controller anlaufen. Die Startprüfung
verlangt außerdem einen aktuellen Alive-State mit passender Controller-PID und
Version. Neustarts sind begrenzt; Fehler werden nicht durch Klartext oder
unbeschränkte Wiederholungen übergangen.

## STRIDE und Grenzen

| Bedrohung | Umgesetzte Maßnahme | Verbleibende Grenze |
| --- | --- | --- |
| Identitätsvortäuschung | Ed25519, getrennt provisionierter Prüfkey, Paketidentität | Schlüsselübergabe/Herstellerfreigabe bleibt betrieblicher Prozess |
| Manipulation | vollständige Dateihashes, zweite Prüfung beim Kopieren, schreibgeschützte Runtime | Root und kompromittierter Signierrechner bleiben hochprivilegiert |
| Abstreitbarkeit | Manifest-ID, Sequenz, versionierte Testbelege und Installationsstatus | Journale sind noch kein extern manipulationsgeschützter Auditdienst |
| Datenoffenlegung | keine privaten Keys oder Zugangsdaten im Bundle; feste Fehlercodes | Root kann Gerätespeicher lesen; Datenverschlüsselung bei Diebstahl separat |
| Ressourcenerschöpfung | Größen-/Eintragsgrenzen, begrenzte Dienste und Startversuche | CPU/SSD-/Lasttests auf beiden RPi-RAM-Varianten offen |
| Rechteausweitung | unprivilegierte Runtime, keine Paket-Hooks als Root, festes Hostprofil | gemeinsame ioBroker-Vertrauenszone ist keine Adapterisolation |

## Nachweise

Automatisierte Tests liegen unter `tests/system/bundle.test.cjs` und
`tests/system/release-cli.test.cjs`. Sie prüfen echte Signaturen/Dateien und
negative Manipulationsfälle. Hostinstallationsbefehle werden getrennt mit
Fixtures geprüft; ein Bookworm-/RPi-systemd-Lauf wird erst nach tatsächlicher
Ausführung als bestanden vermerkt. Gesamtergebnisse und Rohbelege stehen im
aktuellen Bericht unter `reports/test-base/`.
