# Vollständiger neuer Laufzeitaufbau für den Sicherheitstest

Stand: 21.10.2026. Dies ist ein Quell- und Vertragsprüfbeleg, **kein signiertes
Installationspaket und kein bestandener nativer Pi-Test**. R9/R10/R11 werden
nicht verändert oder als Träger neuer Abhängigkeiten umbeschriftet.

Der neue Pfad baut sechs eigene Adapter und drei PostgreSQL-Pakete aus den
versionierten Quellen. Ignorierte/unversionierte Dateien werden vor dem Packen
ausgeschlossen. Controller 7.2.5 bleibt ausdrücklich in Hauptversion 7. Die
neu gepackte PostgreSQL-Objects-Komponente erhält ausschließlich für diesen
Aufbau die Peer-Bindung an `db-objects-redis@7.2.5`; Original- und gepackter
Manifesthash werden dokumentiert. Die historische Quellbindung bleibt 7.2.2.

Die Vorbereitung hat zwei getrennte Schritte: eine explizite Netzauflösung
ohne Installationsskripte erstellt die exakte Lockdatei und füllt den npm-Cache;
anschließend installiert `npm ci --offline` genau diese Auflösung. Beide
Schritte verlangen einen sauberen Quellcommit und Node 24.21.0/npm 11.19.0.
Geprüfte Versionsvorgaben werden gegen den tatsächlich installierten Baum
kontrolliert. Eine zusätzliche gleichversionierte, aber ungepatchte Kopie
eines der fünf transformierten Pakete ist nicht zulässig.

Die neue SBOM entsteht aus dem tatsächlichen Installationsbaum einschließlich
eingebetteter Pakete und der geprüften ARM64-Serialport-Ableitungen. Sie bindet
Dateiinhalte, Dateimodi, Lockdatei, Quellcommit, Buildbeleg und sämtliche
Controller-/CLI-/Common-DB-/Adapter-/WebSocket-Transformationen. Die sechs
eingebetteten Lizenzclients müssen weiterhin identische Versionen und
Dateibäume haben. Die vollständige bestehende SBOM-Inventarprüfung und die
statische ARM64-Architekturprüfung bleiben Voraussetzung.

Der native Ablauf verwendet für diesen Pfad `enrollFresh`. Er prüft ein
absichtlich abgewiesenes Checkpoint vor dem ersten Datenbankschreibvorgang,
danach die tatsächliche Aufnahme der sechs Adapter, HTTPS, Lizenzwechsel,
Sicherung, Assets, Stopp und Neustart. Er behauptet keine historische
R9-Migration oder deren Rücknahme. Die alte Migration bleibt im historischen
Prüfprofil separat. Der neue native Beleg muss denselben Quellcommit und
denselben vollständigen Laufzeitbaum beschreiben wie der spätere Signierer.

Der Hersteller-Signierer übernimmt den geprüften Baum unverändert. Der private
Schlüssel muss außerhalb des Repositorys liegen und geschützt sein; ein neuer
Schlüssel wird nicht erzeugt. Die Vorbereitung ist transportierbar als
deterministisches **unsigniertes** Archiv mit enger Dateiliste. Es enthält
weder Cache-/npm-Protokolle noch PostgreSQL-Laborverzeichnisse. Der Extraktor
prüft alle Mitglieder vor dem ersten Schreibvorgang und verwendet kein
`extractall`. Nach dem Entpacken bleiben Quell-, Inventar- und native
Evidenzprüfungen zwingend.

## Tatsächlich geprüfter Umfang

| Prüfung | Ergebnis |
|---|---|
| Neue/alte Build-, SBOM-, native Evidenz-, Fixture- und Abhängigkeitsverträge | 34/34 bestanden, keine übersprungen |
| Deterministisches Archiv, enge Dateiliste, Extraktion und manipulierte Mitglieder | 3/3 bestanden |
| Lokale Umgebung | Linux, Node 24.19.0; nur die genannten isolierten Verträge |
| Vollständiger Build mit Node 24.21.0/npm 11.19.0 | Hier nicht ausgeführt; verpflichtender CI-Schritt |
| Neuer nativer PostgreSQL-17.11-/Controller-7.2.5-Lauf | Hier nicht ausgeführt; verpflichtender CI-Schritt |
| Signieren mit dauerhaftem Herstellerschlüssel | Nicht ausgeführt; Schlüssel nicht bereitgestellt |
| Pi-Installation, physische Geräte, Produktionsfreigabe | Nicht durchgeführt/nicht erteilt |

Rohbelege: `contracts.tap`, `archive-tests.txt`; Eingabebindung und Befehle:
`verification.json`. Synthetische Vertragsdaten aus dem historischen nativen
Beleg sind ausdrücklich Testeingaben und kein neuer nativer Lauf.

## Reproduzierbare Herstellerbefehle

Aus einem sauberen Checkout mit der geforderten Toolchain, als unprivilegierter
Buildbenutzer; die Zielverzeichnisse dürfen noch nicht existieren:

```bash
node tools/integration/stage-security-refresh-cache.cjs --output /ABS/resolution
node tools/integration/prepare-security-refresh.cjs --output /ABS/runtime --sequence 15 --resolution-lock /ABS/resolution/resolution-lock.json
node tests/integration-own-adapters/prepare-security-refresh.cjs /ABS/native-lab /ABS/runtime
```

Das vorhandene isolierte PostgreSQL-Labor, die geschützte Root-Fixture und
`tests/integration-own-adapters/run-native.cjs` sind anschließend auszuführen.
Die CI führt außerdem das Produktionsaudit gegen die **neue vollständige**
Lockdatei durch. Offene Auditbefunde werden nicht als behoben gewertet.
Nach bestandenem nativen Lauf:

```bash
node tools/integration/pack-prepared-runtime.cjs --prepared-runtime /ABS/runtime --native-evidence /ABS/native-lab --output /ABS/eos-security-refresh-unsigned.tar.gz
python3 -I -B tools/integration/prepared-runtime-archive.py extract /ABS/eos-security-refresh-unsigned.tar.gz /ABS/restored-runtime
node tools/bootstrap/build-managed-test.cjs --prepared-runtime /ABS/restored-runtime --native-evidence /ABS/native-evidence --private-key /EXTERNAL/release.pem --public-key-sha256 EXPECTED_SHA256 --sequence 15
```

Der letzte Befehl verlangt die tatsächlich bereitgestellte Signierautorität;
Platzhalter genügen nicht. Er veröffentlicht nichts und installiert nichts auf
einem Gerät. Spätere Sequenzen benötigen jeweils einen neu vorbereiteten,
neu geprüften und exakt gebundenen vollständigen Laufzeitbaum.
