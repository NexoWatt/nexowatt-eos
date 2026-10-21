# Neuer Test-Pi: gebundener Managed-Erstinstallationspfad

Stand: 2026-10-21. Basiscommit: `83f7070c9ec58184188b5f310d0c14140a10e9d4`.
Gegenstand sind die in `verification.json` einzeln gehashten Quellen des neuen
Installationspfads. Der Arbeitsbaum enthält die parallel erarbeiteten Änderungen
des Sicherheitsupdates; der Basiscommit allein bezeichnet nicht diesen Stand.

## Ergebnis

Der bislang fehlende OS-Vorbereitungspfad für einen frischen Debian-13-ARM64-Test-Pi
ist im Quellcode umgesetzt. Der neue Generator verbindet einen tatsächlich
signierten Managed-Kandidaten mit Sequenz 15 und Lieferrevision 12 mit dem festen
Node-24.21.0-Download und einem unabhängig authentifizierten öffentlichen
Lizenzprüfschlüssel. Der Kandidatenbau und die nachgelagerte Produktprüfung
verwenden das Profil `security-refresh-test` mit js-controller **7.2.5**; ein
Controller-8-Umschalter existiert in diesem Installationspfad nicht.

Es wurde **noch kein veröffentlichbares Installationspaket und kein gültiger
öffentlicher Installationsbefehl erzeugt**. Hierfür fehlen weiterhin der tatsächlich
signierte und vollständig geprüfte neue ARM64-Kandidat sowie dessen real gebundene
öffentliche Vertrauensdaten. Ein privater Herstellerschlüssel wurde weder erzeugt
noch verarbeitet. Historische signierte Archive, Lieferidentitäten und
Installationspins wurden nicht verändert.

## Umsetzung und Sicherheitsgrenzen

- `tools/bootstrap/prepare-managed-host.py` bildet ein eigenes festes Profil. Es
  übernimmt die bisherigen Root-, ARM64-, Debian-13-, systemd-, Frischzustands-,
  APT-Quellen-/Keyring-, HTTPS-, Archiv- und Node-Prüfungen. Alle drei Downloads
  müssen ihre vollständige Größen-/Hashprüfung bestehen, bevor Pakete installiert
  oder Nutzlasten ausgeführt werden. Die Runtime-Signatur und der vollständige
  Dateibestand werden zusätzlich im bestehenden Managed-Installer geprüft.
- Der neue Profilpfad lehnt auch vorhandene Managed-Update-/Netzwerkzustände und
  das DHCP-Dienstkonto ab. Zusätzlich werden `nftables` und `dnsmasq-base` aus den
  zugelassenen authentifizierten Distributionquellen vorbereitet. `dnsmasq-base`
  liefert das benötigte Programm ohne die globale DHCP-Dienstintegration des
  Pakets `dnsmasq`; EOS verwendet anschließend seine eigene zunächst
  unkonfigurierte Netzwerkintegration. Das reale APT-/systemd-Verhalten auf dem Pi
  ist noch abzunehmen.
- `first-start-managed.cjs` wählt genau
  `tools/system/install-managed-from-checkout.cjs`. CLI, Umgebung und
  `bootstrap.json` können keinen anderen Installer bestimmen. Die kleine
  gemeinsame Anpassung in `first-start.cjs` erhält dessen historischen
  Standardpfad, TTY-Bindung und gefilterte Fehlermeldungen. Der Einrichtungscode
  bleibt ausschließlich für das lokale kontrollierende Terminal bestimmt.
- `build-managed-download.cjs` prüft die wirklichen Signaturen, Archivdaten,
  Releaseidentität, unabhängigen Prüfschlüsselpins und den bereits festgelegten
  Node-Assethash. Signed-Runtime-/Installerdateien einschließlich
  `tools/integration/test-archive.py` müssen bytegenau zum Quellstand passen.
  Neue benötigte Dateien müssen vor dem finalen Paketbau im Git-Index geführt
  werden; fehlende signierte Dateien führen zum Abbruch.
- Die Verzeichnisse `runtime`, `tools/system` und `licenses` werden nur über
  Git-verfolgte Pfade aufgenommen; daneben gibt es eine feste Liste benötigter
  Bootstrap-/Lizenzdateien. Unverfolgte lokale Dateien gelangen nicht durch ein
  pauschales Verzeichnisarchiv in den öffentlichen Installer. Private temporäre
  Buildlisten mit absoluten Herstellerpfaden liegen außerhalb der Ausgabe in
  einem Verzeichnis mit Modus 0700 und werden auch bei Fehlern entfernt.
- Die öffentliche Ausgabe umfasst genau die drei gebundenen Assets
  (`installer-kit.zip`, Node-Archiv, Runtime-Archiv), `install.sh`,
  `INSTALL_COMMAND.txt` und den bereinigten `download-preparation.json`-Beleg.
  Weder private Buildlisten noch Schlüssel, Anlagenzustände oder Kundendaten
  sind Bestandteil dieses Ausgabeformats. Die Installationszeile prüft die
  vollständig heruntergeladene Shell-Datei gegen ihre genaue Größe und ihren
  separat auszuliefernden SHA-256-Pin, bevor Bash sie ausführt.

## Ausgeführte Prüfungen

Umgebung: Linux x64, Node **24.19.0**, Python **3.12.14**. Die Tests sind keine
Ausführung unter dem vorgesehenen Node 24.21.0 auf ARM64.

| Prüfung | Ergebnis | Tatsächlicher Umfang |
| --- | --- | --- |
| `node --test --test-reporter=tap tests/bootstrap/managed-bootstrap.test.cjs tests/bootstrap/first-start.test.cjs tests/bootstrap/build-download.test.cjs` | 30/30 bestanden | 8 neue Managed-Verträge und 22 historische Bootstrap-/Generatorverträge |
| `python3 -I -B tests/bootstrap/prepare-managed-host.test.py` | 31/31 bestanden | 27 wiederverwendete Host-Schutztests und 4 neue feste Profil-/Netzwerk-/Frischzustandsverträge |
| `python3 -I -B tests/bootstrap/prepare-host.test.py` | 27/27 bestanden | Historischer R4-Vorbereitungspfad nach ausschließlicher Test-Fixture-Faktorisierung |
| `git diff --check` | bestanden | Keine Whitespacefehler im damaligen Arbeitsbaum |

Die neue ZIP-Prüfung erzeugt ein echtes Datenarchiv aus den realen Modulen in
einem isolierten Git-Fixture. Sie pflanzt harmlose unverfolgte Privatdateimarker
ein, weist deren Ausschluss und die Abwesenheit interner Quellpfade nach, prüft
die Bereinigung temporärer Buildlisten bei Erfolg und Fehler und lädt den
wirklich entpackten Managed-Einstieg bis zu dessen erwarteter Ablehnung eines
ungültigen CLI-Arguments. Dadurch sind die statischen Modulabhängigkeiten des
Kits geprüft. Das Fixture ist **kein signierter Lieferkandidat**.

Die Host-Tests verwenden explizite Doubles für APT, systemd, Benutzerverwaltung,
TTY und Installationswirkungen; Datei-/Archiv-, Hash-, Crypto- und
Bash-Syntaxprüfungen laufen tatsächlich. Sämtliche temporären Testschlüssel
sind flüchtige synthetische Fixture-Schlüssel. Es erfolgten keine echten
Hoständerungen, kein npm-/Runtime-Neubau, kein Veröffentlichen und kein
Installationsversuch auf einem Pi. Die Rohprotokolle und ihre Hashes sind im
beiliegenden Verifikationsbeleg aufgeführt.

## Noch offen vor dem Test-Pi

1. Vollständigen neuen ARM64-Runtime-Kandidaten unter exakt Node 24.21.0 bauen,
   prüfen, mit dem außerhalb des öffentlichen Repositories verwahrten
   Herstellerschlüssel signieren und den vollständigen Rücklesebeleg erzeugen.
2. Den öffentlichen Releaseprüfschlüssel und das echte öffentliche
   Lizenzprüfschlüssel-Exportformat samt unabhängig bestätigten SHA-256-Pins
   bereitstellen. Dann den neuen Generator mit dem tatsächlichen HTTPS-Ziel
   ausführen und die sechs öffentlichen Ausgabedateien prüfen/veröffentlichen.
   Die finalen Runtime-Archivgröße und Kanalgrenze bleiben Bestandteil des
   Kandidatenbaus, nicht dieses Fixture-Tests.
3. Auf dem vorgesehenen frischen Pi den kompletten APT-/Node-/PostgreSQL-/EOS-
   Ablauf, HTTPS-Ersteinrichtung, Neustart und Dienstzustände abnehmen. Der
   bestehende Managed-Installer bleibt für die tatsächliche Produktprüfung und
   Aktivierung verantwortlich; seine weiteren Komponenten werden separat
   geprüft.
4. Nach Abschluss der Ersteinrichtung den Admin-Updateknopf mit einer echten,
   neueren signierten Releasefolge prüfen, einschließlich Negativfällen und
   Wiederanlauf. Für diesen Ablauf liegt hier kein Hardwarebeleg vor.

## Paketquellen zur Auswahl der Netzwerkwerkzeuge

Am 2026-10-21 anhand der offiziellen Debian-Paketinformationen geprüft:

- https://packages.debian.org/trixie/dnsmasq-base beschreibt das Paket ohne
  Infrastruktur zum Start als Systemdienst.
- https://packages.debian.org/trixie/arm64/dnsmasq-base/filelist führt
  `/usr/sbin/dnsmasq` auf.
- https://packages.debian.org/trixie/arm64/nftables/filelist führt
  `/usr/sbin/nft` auf.

Die Paketversionen werden bei der Zielinstallation über die zugelassenen,
authentifizierten APT-Quellen aufgelöst. Dieser Bericht bescheinigt keine
konkrete spätere Paketversion und keine Produktionsfreigabe.
