# R9 TEST: gesundes R8 aktualisieren

Stand: 05.10.2026. Ziel ist EOS `0.2.0-test.3`, Revision 9, signierte Sequenz 12,
auf Node.js `24.21.0`. Der Einstieg akzeptiert ausschließlich die vollständig
abgeschlossene, vor dem Update tatsächlich betriebsbereite R8-Installation mit
Sequenz 11. Ein fehlgeschlagener Erststart oder ein gestoppter Reparaturzustand
ist kein zulässiger Ausgangspunkt. R9 übernimmt keine Konten-, Lizenz-,
Datenbank-, Zertifikats- oder systemd-Unit-Migration.

Es gibt erst dann einen verwendbaren Betreiberbefehl, wenn das signierte Archiv,
der öffentliche Einstieg und der exakt an dessen Commit gebundene Befehl
veröffentlicht und zurückgelesen wurden. Eine Quelländerung oder erfolgreiche
isolierte Tests stellen weder diesen Befehl noch eine Anlagenfreigabe bereit.
Der veröffentlichte Befehl steht danach in
`delivery/public-update-test3-r9/UPDATE_COMMAND.txt` und ist unverändert zu
verwenden. Keine selbst zusammengesetzten Release-/Schlüsselparameter oder
veränderlichen `main`-Downloads an seiner Stelle verwenden.

## Voraussetzungen und Fehlerverhalten

Vor dem Versuch Backup und gesicherten Rückfallstand prüfen; Anlagenkonfiguration,
aktuelle Begrenzungen, Hardware und Firmware dokumentieren. Neue Lizenzgrenzen
werden zentral in EOS Admin Home/Pro aktiviert. Für OCPP muss vor wirksamer
Steuerung der vollständige physische Anschlussbestand hinterlegt sein; siehe
`components/ocpp21/README.de.md`. Das Update aktiviert keine physischen Adapter.

Der Einstieg lädt das neue Archiv und dessen öffentlichen Schlüssel von exakt
gepinnten Commit-URLs in ein privates root-Verzeichnis. Größe und SHA-256 müssen
vollständig stimmen. Gehärtete, eingebettete Extraktionshelfer lehnen
Pfadausbrüche, Links und vorhandene Ziele ab. `/usr/bin/node` muss exakt
`24.21.0` sein. Die anschließende Prüfung verlangt die gültigen alten und neuen
Signaturen, Dateihashes, geschützte Pfade und das festgelegte R8-Ausgangssystem.

Der Koordinator läuft unter `nexowatt-eos-test-update-r9.service`. Der feste
Supervisor erhält nur `PATH`, `LC_ALL` und die von systemd vergebene
`INVOCATION_ID`. `ExecStopPost` ruft ausschließlich `--quiesce-incomplete` auf;
die Koordinatorprüfung bindet diese Bereinigung an dieselbe Invocation und
Zielsequenz. Der Betreiber ruft den Bereinigungspfad nicht selbst auf.

Eine fehlgeschlagene R9-Erprobung kann nach geprüfter Rückkehr zum alten Release
wieder ein nachweislich betriebsbereites R8 hinterlassen; der Updatebefehl meldet
den R9-Versuch trotzdem als fehlgeschlagen. Bei ungeklärtem Zustand bleiben die
bestehenden Sicherheits-/Wartungsschranken wirksam. Die Belege verbleiben im
angezeigten privaten root-Verzeichnis. Kein Erzwingen, keine manuelle Aufhebung
von Wartungssperren und keine erneute Erststartinstallation daraus ableiten.

## Herstellerablauf

1. Änderungen, Prüfungen und vorhandene Kompilate auf `main` prüfen und committen.
   Anschließend als eigenständigen Folgecommit ausschließlich
   `.github/eos-r9-build-request.json` hinzufügen oder ändern. Inhalt exakt mit
   zwei Leerzeichen eingerückt, Schlüsselreihenfolge wie unten; `sourceCommit`
   ist der volle 40-stellige Commit des unmittelbaren Elternstands:

   ```json
   {
     "schemaVersion": 1,
     "deliveryRevision": 9,
     "sourceCommit": "<vollstaendiger-unmittelbarer-Elterncommit>"
   }
   ```

2. Der Marker-Push führt nur die Anforderungsprüfung aus. Signierung startet erst
   nach dem erfolgreichen `EOS security regression`-Workflow für genau diesen
   Marker-Commit. Derselbe Commit mit denselben Quellbytes ist `sourceCommit` in
   nativen Belegen und Lieferdaten. Gewöhnliche Quell-/Dokumentations- und die
   späteren generierten Liefercommits erzeugen keine weitere R9-Anforderung.
3. Der Lieferworkflow prüft Repository, Workflowpfad, Branch, Ereignistyp,
   Ergebnis und getesteten Commit. Er lädt das einzelne höchstens 12 MiB große
   Digest-Artefakt `eos-r9-native-<Markercommit>` über seine geprüfte Artefakt-ID
   aus genau diesem Security-Lauf. Es enthält nur `r9-native.tap`,
   `r9-native-evidence.json` und `r9-native-prepared.json`.
4. Der Builder verlangt `--native-evidence <absolutes-Belegverzeichnis>`.
   Vor Signierung müssen alle 14 benannten Prüfgrenzen, ungekürzte erfolgreiche
   TAP-Zähler und der kanonische Hash aller vorbereiteten App-Pfade, Größen und
   Bytes exakt zur vorbereiteten Lieferung passen. Dateimodi bleiben durch die
   separaten Paket-/Signaturprüfungen gebunden; der native Prüfaufbau verschärft
   nur die Modi. Eine fremde Quellversion, ein fehlgeschlagener/übersprungener
   Test oder geänderte App-Bytes verhindert Signierung.
5. Der unabhängige Publisher rekonstruiert die Lieferung aus authentifiziertem
   R8 und den unveränderten eingecheckten Quellen. Er prüft Signatur und dieselbe
   native Evidenz gegen die signierte Dateitabelle, bevor ausschließlich neue
   erlaubte Liefer-/Berichtsdateien kopiert werden. Historische Dateien bleiben
   unverändert. Push erfolgt normal und nur bei unverändertem Remote-`main`.
6. Der unabhängige öffentliche Einstieg wird aus dem signierten Archiv gebaut;
   Archiv, Schlüssel und Liefermetadaten werden öffentlich bytegenau
   zurückgelesen. Diese Node-basierte Readback-Operation hat insgesamt höchstens
   fünf Sekunden und erzeugt bei Timeout keine positive Evidenz. Zwei weitere
   überprüfte Commits binden erst den Einstieg, dann den Betreiberbefehl.
   `workflow_dispatch` darf lediglich eine bereits vorhandene immutable R9-
   Lieferung fortsetzen; es kann keine neue signierte Lieferung erzeugen.

Direkte Herstellerbefehle aus sauberem Quellstand (kein Betreiberaufruf):

```sh
node reports/integration/installable-test3-r9-20261005/build-revision.cjs --native-evidence /absoluter/belegpfad
node reports/integration/installable-test3-r9-20261005/verify-candidate.cjs /absoluter/kandidatpfad <Quellcommit> --native-evidence /absoluter/belegpfad
python3 -I -B tools/bootstrap/publish-r9-candidate.py /absoluter/kandidatpfad <Quellcommit>
node tools/bootstrap/build-public-r9-update-entry.cjs --asset-commit <Archivcommit>
node tools/bootstrap/prepare-public-r9-update-publication.cjs --readback <Archivcommit>
node tools/bootstrap/prepare-public-r9-update-publication.cjs --check-stage entry <Archivcommit>
node tools/bootstrap/build-public-r9-update-entry.cjs --entry-commit <Einstiegscommit>
node tools/bootstrap/prepare-public-r9-update-publication.cjs --command-report <Einstiegscommit>
node tools/bootstrap/prepare-public-r9-update-publication.cjs --check-stage command <Einstiegscommit>
```

Build und unabhängige Rekonstruktion benötigen den gelockten UI-TypeScript-
Compiler (`npm ci --ignore-scripts --prefix components/ui`) und vollständige
Git-Historie für die fest gepinnte historische Mocha-Lock-Evidenz. npm-Lifecycle-
Skripte werden dabei nicht ausgeführt. Die Runtime-Drittanbieterbytes werden aus
R8 übernommen und nicht neu aufgelöst.

## Prüfstand und Grenzen

Die isolierten Negativtests und Syntaxnachweise stehen in
`reports/integration/r9-publication-20261005/`. Ein nativer x64-Erfolg prüft echte
PostgreSQL-/Controller-/Admin-/UI-Prozesse und HTTPS-Lizenzwechsel; er ersetzt
keine ARM64-/Pi-/systemd-Mount- oder physische Anlagenprüfung. Die tatsächliche
Signierung, öffentliche Readbacks, das ausgeführte Betreiberupdate und eine
Anlagenfreigabe dürfen nur nach ihren jeweils real ausgeführten Prüfungen
behauptet werden. Keine CRA-/IEC-Konformität aus diesen Belegen ableiten.
