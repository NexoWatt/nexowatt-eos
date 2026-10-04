# R7-Kandidat für den Controller-Erststart

Stand 04.10.2026: **lokal unsigniert geprüft, noch kein veröffentlichter
Reparaturweg**. Der Builder ist für einen neuen TEST-Kandidaten `0.2.0-test.3`,
Revision 7 / Sequenz 10, Linux ARM64 / Node 24.21.0 vorbereitet. Aus den lokalen
Prüfungen folgt keine Pi-, PostgreSQL-/systemd- oder Anlagenfreigabe.

## Änderung und Vertrauensgrenzen

Die Basis ist das unveränderte R6-Archiv mit SHA-256
`9975190781ce5d5843f38658de11d153119eb8c5e7cd781485af08342571f1ba`.
Archivlänge, öffentlicher Schlüssel, Signatur, Release-ID und sämtliche
signierten Dateien werden vor Wiederverwendung geprüft. Der neue Kandidat
erhält ein eigenes Verzeichnis; historische Lieferungen werden nicht ersetzt.

Der App-Baum übernimmt genau zwei Arten von Änderungen:

1. Die beiden Common-DB-Module für CommonJS und ESM erhalten die an vollständige
   Ein-/Ausgabehashes gebundene PID-Pfadkorrektur aus
   `runtime/controller-profile/pid-state.cjs`. Sie speichern Laufzeitdaten im
   bestehenden geschützten Datenverzeichnis. Der signierte Releasebaum bleibt
   schreibgeschützt; Systemd-Units und Rechte werden nicht aufgeweicht.
2. Alle sechs ausführbaren `.cjs`-Quellen der drei PostgreSQL-Backendpakete
   werden explizit in ihre tatsächlichen `app/node_modules`-Paketpfade
   übernommen. Eine Kopie unter `runtime/postgresql/packages` allein ändert
   den vom Controller importierten Code nicht. Für jedes dieser Module prüft
   der Builder die Bytegleichheit zwischen Quellcode, Runtime-Kopie und
   installiertem App-Paket. Im lokalen Prüflauf änderten sich `auth.cjs` und
   `index.cjs` des Objects-Pakets; die übrigen vier Module waren bereits gleich.

Die genaue App-Dateitabelle muss bis auf diese vier Dateien der authentifizierten
R6-Basis entsprechen. Root-Lock, installierte Paketmetadaten, Abhängigkeiten,
übrige Adapter und native Dateien bleiben unverändert. Es findet keine neue
npm-Auflösung, Transpilation oder Ausführung von Installationshooks statt.
Physische Steuerfunktionen bleiben im bisherigen Produktprofil gesperrt.

Die neue CycloneDX-SBOM übernimmt den authentifizierten Abhängigkeitsbestand,
bindet jedoch den tatsächlichen geänderten Baum neu. Geänderte Pakete erhalten
eine Dateitabelle und Derivatnachweise; ein historischer Paketarchivhash wird
nicht als Hash des veränderten Pakets ausgegeben. Es wird kein neuer
Schwachstellenscan oder Betriebssysteminventar behauptet.

## Unabhängige Prüfung

`verify-candidate.cjs` verwendet ausschließlich Code aus dem geprüften
Quellcheckout. Es authentifiziert R6 erneut, erstellt daraus einen neuen
App-Baum, wendet die festen PID-Transformationen und aktuellen PostgreSQL-Quellen
erneut an und rekonstruiert anschließend **den gesamten** Payload. Vergleichbar
sind alle Pfade, Größen, Hashes, Modi, Lizenzdateien, Hostquellen, SBOM und
Katalogdaten. Kandidatencode wird dabei nicht ausgeführt. Die Prüfung akzeptiert
keine bloß selbst behauptete Liste geänderter Dateien. Auch beide Liefermetadaten,
der vollständige Quellenbindungsbericht, der Buildbericht und `bundle.sha256`
müssen den unabhängig neu berechneten Werten entsprechen; falsche Hardware-
oder Freigabeaussagen in Nebenberichten werden abgewiesen.

Der Hersteller-Builder akzeptiert keine Zielhost-, Force-, Passwort-, Schlüssel-
oder Veröffentlichungsoption. Er verlangt zum Signieren einen sauberen
Quellcommit. Der temporäre private TEST-Schlüssel bleibt im Speicher.
Aufruf erst nach Abschluss der noch offenen Integrationsarbeit:

```sh
node reports/integration/installable-test3-r7-20261004/build-revision.cjs
node reports/integration/installable-test3-r7-20261004/verify-candidate.cjs /absolute/candidate-root <40-stelliger-Quellcommit>
```

Beide Herstellerwerkzeuge erlauben optional `--base-directory` mit einem
absoluten Pfad zur **gleichen fest gebundenen** R6-Lieferung. Die Hash-,
Signatur- und Profilprüfungen gelten unverändert. Builder und abschließender
Verifier verwenden denselben Node-Patchstand und dieselbe Linux-Architektur;
die CI bindet beide an Node 24.21.0. Kein Aufruf aktualisiert den Pi.

## Tatsächlich ausgeführte Prüfungen

Lokale Umgebung: Linux x64, Node 24.19.0. Die ARM64-Dateien wurden inventarisiert
und architekturbezogen statisch validiert, nicht auf ARM64 ausgeführt.

- `node --test --test-reporter=tap reports/integration/installable-test3-r7-20261004/build-revision.test.cjs`:
  14/14 Vertrags- und Manipulationsprüfungen bestanden; Rohbeleg
  `local-contract-tests.tap`.
- Tatsächliche unsignierte Ableitung aus authentifiziertem R6: vier geänderte
  App-Dateien, sechs vollständig gebundene PostgreSQL-Module, 22.839 Payload-Dateien;
  Paket-, Katalog-, SBOM-, PID- und Architekturprüfungen bestanden. Der aktuelle
  Arbeitsbaum war dabei bewusst noch nicht sauber/signierbar. Dateihashes und
  konkreter Prüfumfang stehen in `local-unsigned-payload-verification.json`.
  Dieser erste Lauf lag vor Aufnahme des Wiederanlaufkoordinators.
- Abschließende unsignierte Assembly einschließlich geprüftem Wiederanlauf- und
  Diagnosehelfer: **22.841 Dateien** erneut vollständig unabhängig rekonstruiert;
  `local-final-unsigned-payload-verification.json`. Der geprüfte Helfer ist mit
  SHA-256 `c33d40dca4aada60ddf861d70c9445c9a6cdff1fc64f49a2799a8683e87aa971`
  enthalten. Der Pflichtcheck `R7_RECOVERY_NOT_PACKAGED` verweigert sein Fehlen.
  Der authentifizierte R4-Katalog und das echte R4-Manifest bestehen gegen den
  neuen Payload den engen Übergangsvalidator: Sequenz **7 → 10**,
  Katalogrevision **3 → 6**, Manifest-/Katalogschema jeweils **1 → 1**.
  SQL-Schema, Systemdateien und Aufnahmeberechtigungen bleiben unverändert.
  Der Builder prüft diesen Übergang vor Signierung und erneut nach Archiv-Readback;
  der unabhängige Verifier rekonstruiert denselben Nachweis nochmals.
- `tests/postgresql/host-object.test.cjs` mit `EOS_TEST_OBJECTS_MODULE` auf das
  **zusammengestellte App-Objects-Paket** und `NODE_PATH` auf die App-Abhängigkeiten:
  7/7 bestanden, `local-assembled-host-object.tap`. Echter ioBroker-7.2.2-Hostgenerator,
  Objects-Code und Transaktionslogik; SQL/Transport sind hier Testdoubles.
  Dies ist kein Nachweis einer nativen PostgreSQL-Verbindung.

Die jeweiligen Ursachen, verbleibenden Grenzen und weiteren Laufzeittests stehen
unter `../controller-startup-20261004/` und
`../controller-pid-state-20261004/`.

## Offene Gates

Der eng begrenzte Wiederanlaufkoordinator ist geprüft und im abschließenden
unsignierten Payload enthalten. Seine Kompatibilität zum historischen
**Schema-2-Handoff** ist separat durch die zehn tatsächlich ausgeführten
[Collector-Prüfungen](../first-start-recovery-r7-20261004/r4-collector-integration.tap)
belegt; dabei sind PostgreSQL-Transport und Betriebssystem-UIDs Testdoubles.
Quellreview von Builder/Verifier und Übergang ist abgeschlossen, ohne behaupteten
zusätzlichen Signaturlauf. Vor konkreter Pi-Übergabe sind ein sauberer Commit,
erneuter Kandidatenbau und signierter Archiv-Readback weiterhin erforderlich.
Der bestehende R6-Updater ist für den hier diagnostizierten gesperrten R4-Erststart
nicht geeignet. Dieser Ordner stellt keinen Benutzer-Updatebefehl bereit.
Native PostgreSQL-/Systemd-Integration und der Pi-Start bleiben gesonderte
Nachweise; spätere Ergebnisse ersetzen die hier dokumentierten Grenzen nur
mit ihren eigenen tatsächlich ausgeführten Belegen.
