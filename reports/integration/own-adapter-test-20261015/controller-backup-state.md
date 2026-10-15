# EOS-BACKUP-STATE-001: CLI-Backup außerhalb des unveränderlichen Programmbaums

Stand: 15.10.2026. Basis: Repository-Commit
`e4616fec2a56cd7c6c013df090bdda00a0c37f54` plus die benannten uncommitteten
Kandidatendateien. Keine Änderung am historischen signierten R9-Archiv.

## Befund und Änderung

Die tatsächlich ausgelieferte `@iobroker/js-controller-cli@7.2.2` verwendet in
beiden JavaScript-Formaten den Controller-Codebaum für `tmpDir` und `bkpDir`;
`getBackupDir()` verweist ebenfalls auf den App-Codebaum. Dieser ist unter EOS
absichtlich schreibgeschützt. Nur den Ausgabeordner im Backup-Adapter zu ändern
reicht daher nicht: Der aufgerufene Controller-CLI-Export benötigt zusätzlich
einen beschreibbaren Arbeitsordner.

Der ausschließlich beim Herstellerbuild anzuwendende Helfer
`runtime/controller-profile/backup-state.cjs` verändert exakt zwei bekannte
CLI-Dateien in einer **neuen, noch unsignierten Kandidatenkopie**:

| Zweck | Festes Ziel |
| --- | --- |
| Temporärer Export/Validierung | `/var/lib/nexowatt-eos/home/backup-stage` |
| Standard-Archivablage | `/var/lib/nexowatt-eos/iobroker-data/nexowatt-backup/backups` |

Die vorhandenen privaten EOS-Home-/Datenverzeichnisse müssen existieren und dem
laufenden Dienstkonto gehören. Neue Unterordner werden mit `0700` erstellt;
bereits vorhandene freizügige Rechte, abweichende Besitzer und symbolische
Verknüpfungen führen zum Fehler. Es gibt kein `chmod`/`chown`, keinen
Root-Fallback, keine alternative Pfadwahl über Umgebungsvariablen und keine
zusätzliche systemd-Schreibfreigabe.

Die tatsächliche rekursive Kopierfunktion lässt den Archiv- und Stagingbaum aus.
So können auch bei einem übergeordneten `common.dataFolder` nicht frühere
Archive oder der gerade entstehende Export in sich selbst kopiert werden.
Quell-Symlinks und Sonderdateien werden nicht verfolgt. Gewöhnliche
Adapter-Datendateien bleiben enthalten. Adapter mit solchen Verknüpfungen
müssen den Datenexport gesondert abnehmen; ein Abbruch ist kein vollständiges
Backup.

## Integritätsbindung

Alle Eingabedateien werden vor dem ersten Schreiben geprüft. Nur die exakte
gemeinsame Originalfassung oder die exakte gemeinsame Ergebnisfassung ist
zulässig; ein Mischzustand oder unbekannte Änderung wird zurückgewiesen.
Ein zweiter Aufruf auf der unveränderten Kandidatenkopie ist idempotent.
Verzeichnisse und Dateien dürfen keine fremden Schreibrechte haben; finale
Dateien werden mit `O_NOFOLLOW` geöffnet und müssen regulär, einfach verlinkt
und höchstens 128 KiB groß sein. Ein konkurrierend veränderter Buildbaum gehört
nicht zur unterstützten Herstellerumgebung.

| Format | Original-SHA-256 | Ergebnis-SHA-256 |
| --- | --- | --- |
| CJS | `616477dc218a6d93a0175f59d2a4f6819c319977d253b08dc0571a318691dce7` | `3c57c8fb32597e2e0b4c8fd3a822411749ac7a8ba7c83629146cf3baa7df9338` |
| ESM | `0d8b3050aedb680f384b37863e55f3e82b4680c8b126ba461b9eb6fe8611cded` | `41ba67a57249f207607507d739681e34df2c93182de4b2aea843a07b41f26a33` |

Jeweils `node_modules/@iobroker/js-controller-cli/build/<Format>/lib/setup/setupBackup.js`.
Test-Fixtures stammen bytegebunden aus dem authentifizierten R9-App-Baum.
Die ESM-Textfixture besitzt für Repository-Werkzeuge einen zusätzlichen letzten
Zeilenumbruch; der Test entfernt exakt dieses Byte vor der Originalhashprüfung.
Upstream-Lizenz: `tests/system/controller-profile-fixtures/LICENSE.upstream.txt`.

## Tatsächliche Prüfungen

Am 15.10.2026 lokal ausgeführt, Linux x64, Node **24.19.0**:

```sh
node --test tests/system/backup-state.test.cjs tests/system/controller-pid-state.test.cjs
```

**33/33 bestanden**: 20 neue Backup-Layouttests und 13 unveränderte PID-Tests.
Geprüft wurden vollständige CJS-/ESM-Parserfähigkeit, exakte Original-/Ergebnishashes,
Paketidentität und Modulauflösung, Idempotenz, Drift/Mischzustände,
Symlinks/Hardlinks/Sondertypen, zu offene Rechte, fremde Besitzer und fehlende
Schreibrechte-Erweiterung. Die tatsächlichen transformierten Klassen und deren
rekursive Kopiermethoden liefen mit begrenzter Dateisystemabbildung und
isolierten DB-/Upload-Modulen gegen reale temporäre Dateien. Dies ist **kein**
nativer vollständiger Controller-/DB-/Hardwaretest.

## Grenzen und nächste Nachweise

- Keine Wiederherstellung durchgeführt. Die vorhandene CLI-Sperre für
  System-`restore` bleibt bestehen; dieser Helfer hebt sie nicht auf.
- Die Änderung macht den **logischen** Controller-Export layoutkompatibel;
  Betriebssystem, PostgreSQL-Datenverzeichnis, Gerätezertifikate,
  root-geschützte Lizenz-/Trustdaten und Firmware werden dadurch nicht zu einer
  vollständigen Systemsicherung.
- Upstream behandelt bestimmte Datei-/DB-Exportfehler nur als Logmeldung. Eine
  syntaktisch gültige Archivdatei alleine beweist deshalb keinen vollständigen,
  konsistenten DB-Snapshot. Im nativen Nachtest müssen mindestens gezielt
  gesetzte Testobjekte/-states im erzeugten Archiv verglichen werden; vollständige
  Sicherungs-/Restoreabnahme bleibt ein eigener Nachweis.
- Gleichzeitige Sicherungs-/Validierungsläufe, Ressourcen-/Speicherplatzmangel,
  Stromausfall und Wiederherstellung auf Zielhardware sind noch nicht durch
  diese 20 Tests abgenommen. Das bisherige gemeinsame temporäre Arbeitsmodell
  wird hier nicht als neue Prozessisolation ausgegeben.
- Integration in einen neu signierten, SBOM-gebundenen Lieferstand erfolgt erst
  durch dessen eigene Build-/Test-/Publikationsgates. Keine Produktions-,
  Anlagen- oder CRA-Konformitätsfreigabe aus diesem Layouttest ableiten.

Verantwortung: EOS-Entwicklung; Nachtest/Hardwareabnahme mit dem Betreiber.
