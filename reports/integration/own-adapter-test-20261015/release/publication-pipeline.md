# R10: getrennte Signierung, Veröffentlichung und Update-Einstieg

Stand: 15.10.2026. Dieser Vermerk beschreibt die neue Pipeline und ihre
isolierten Prüfungen. Er ist **kein Beleg einer bereits erzeugten, veröffentlichten
oder auf dem Pi ausgeführten R10-Lieferung**. Der tatsächliche Lieferstand wird
durch `delivery.json`, `build-verification.json`, `native-workflow.json` und die
öffentlichen Rücklesebelege dokumentiert, sobald diese erfolgreich entstehen.

## Änderung und Sicherheitsgrenzen

Die vorhandenen R10-Build- und Updatewerkzeuge hatten noch keine eigene
Veröffentlichungskette. Neu sind ausschließlich R10-Dateien unter
`tools/bootstrap/`, `tests/bootstrap/` und
`.github/workflows/eos-r10-test-delivery.yml`. Die bisherigen R9- und älteren
Einstiege, signierten Archive, Schlüssel und Prüfsummen bleiben unverändert.

Die Pipeline verwendet die bestehenden R9-Veröffentlichungsgrenzen mit dem
expliziten R10-Vertrag: Sequenz 13, authentifizierte R9-Basis, sechs eigene
Adapter, vier quellgebundene native Nachweisdateien, die zwei genau
hashgebundenen Backup-CLI-Transformationen sowie die zwei ebenso gebundenen
Adapterkern-Dateien für den einmaligen Shutdown. Auch der Quellhash des
Shutdown-Transforms wird gebunden. Der Publisher verlangt die tatsächlichen
R10-Berichtsfelder (`ownOverlays`, Dateiquellliste, nativer Prüfbeleg und
Übergangsprüfung); R9-Berichtsfelder werden nicht als Ersatz akzeptiert.

Ein Build läuft ausschließlich nach dem erfolgreichen `EOS security regression`-
Pushlauf des **exakten Marker-Commits**. Ein normaler Quell-/Dokumentationspush,
Pull Request, fremdes Repository, anderer Workflow oder abweichender Commit
autorisiert keine Signierung. Der Marker-Commit ändert allein
`.github/eos-r10-build-request.json` und bindet seinen unmittelbaren Vorgänger.
Manuelles Starten kann nur den öffentlichen Einstieg einer bereits vollständig
getrackten R10-Lieferung ergänzen; es kann das native Signiergate nicht umgehen.

Das native Artefakt wird anhand seines exakten Laufs, Quellcommits, Namens,
SHA-256-Digests und einer Größenobergrenze ausgewählt. Der HTTPS-Metadatenabruf
hat ein gemeinsames 5.000-ms-Abbruchbudget, Größenlimit und keine Redirects.
Der Artefaktdownload bricht bei Digestabweichung ab. Der bestehende R10-Builder
prüft anschließend die vier Nachweise gegen das vollständig rekonstruierte
App-Inventar; synthetische Vertragsfixtures sind keine Releaseeingabe.

Der Buildjob hat nur Leserechte. Ein separater Publisher mit Schreibrecht lädt
genau dessen Artefakt, prüft aus dem vertrauenswürdigen Quellcheckout das gesamte
signierte Paket erneut und kopiert erst danach 14 ausdrücklich erlaubte neue
Dateien. Wiederholte Quellen/Berichte im Artefakt sind nur bytegleich zulässig;
Kandidatencode wird nicht ausgeführt. Existierende Lieferungen, Symlinks,
Hardlinks, fremde Dateien, falsche Hashes, doppelte JSON-Schlüssel und
unpassende Prüfnachweise werden abgewiesen. Der normale Push verlangt einen
unveränderten `main`-Head; es gibt keinen Force-Push und keinen Rebase fremder
Änderungen.

## Öffentlicher Update-Einstieg

Nach Veröffentlichung erzeugt ein separater Job
`delivery/public-update-test3-r10/update.sh` aus dem geprüften Archiv. Der
Einstieg bindet das Archiv, den öffentlichen Schlüssel und die Release-ID an
einen vollständigen Git-Commit und vergleicht die veröffentlichten Assets per
HTTPS byteweise. Erst daraus entstehen ein eigener Entry-Commit und ein
zweiter Commit mit `UPDATE_COMMAND.txt` und `command-verification.json`.

Der spätere Einzeiler prüft das vollständige Skript vor Ausführung auf Länge
und SHA-256. Das Skript prüft die komplette Archivdatei vor dem Extrahieren,
verwendet nur den neuen `update-test-own-adapters.cjs` und startet ihn unter
einem begrenzten systemd-Aufruf mit abgestimmtem Abbruchschutz. Der Updater
authentifiziert R9 und R10 erneut, einschließlich Zielschlüssel und Release-ID.
Er akzeptiert ausschließlich ein gesundes, vollständig eingerichtetes R9 mit
Node 24.21.0. Bestehende Konten, Lizenz, UUID und Zertifikate bleiben erhalten;
Geräteadressen und Steuerfreigaben werden nicht erfunden.

Vor einer Übergabe ist zusätzlich der tatsächlich veröffentlichte Entry-/
Command-Commit zu lesen und der README-Verweis auf den neuen geprüften Befehl
zu aktualisieren. Vorher bleibt die aktive R9-Anleitung bestehen. Ein
fehlgeschlagener öffentlicher Rücklesetest darf durch einen erneuten regulären
Workflowlauf behoben werden, nicht durch Entfernen von Hash- oder Signaturgates.

## Tatsächlich geprüft

Lokale Umgebung: Linux x64, Node 24.19.0, Python 3.12.14. Die Tests verwenden
synthetische, ausdrücklich inert gehaltene Archive/Metadaten und temporäre
Git-Repositories; sie führen keine Hostmigration aus.

| Prüfung | Ergebnis | Rohbeleg |
| --- | --- | --- |
| 34 Node-Vertrags-, Transport-, Extraktions-, Marker- und Artefakttests | Bestanden, keine übersprungenen Tests | [publication-contract.tap](publication-contract.tap) |
| 19 Python-Publisher-Grenztests | Bestanden | [publication-python.txt](publication-python.txt) |

Reproduzierbare Aufrufe:

```sh
node --test --test-reporter=tap \
  tests/bootstrap/public-r10-update-entry.test.cjs \
  tests/bootstrap/public-r10-update-publication.test.cjs \
  tests/bootstrap/r10-delivery-workflow.test.cjs \
  tests/bootstrap/r10-native-artifact.test.cjs
python3 -I -B tests/bootstrap/r10-candidate-publication.test.py
```

Der Quell-/Hashbezug der lokalen Tests steht in
[publication-checks.json](publication-checks.json). Die reguläre CI prüft diese
Verträge zusätzlich auf dem festgelegten Release-Node und validiert die
Workflowdefinition. Lokale Vertragstests ersetzen den nativen CI-Lauf nicht.

Offen bleiben bis zu tatsächlich erfolgreichen Belegen: qualifizierte native
R10-Prüfung, Signierung, unabhängige vollständige Rekonstruktion im Publishjob,
öffentlicher Downloadvergleich und Pi-Update. Pi/ARM64-Systemd-Mountverhalten,
Geräteanbindungen, vollständiger Restore und 50-/100-ms-Reaktionsziele sind
gesonderte Zielsystemprüfungen. Daraus wird keine Produktions- oder
CRA-Konformitätsfreigabe abgeleitet.
