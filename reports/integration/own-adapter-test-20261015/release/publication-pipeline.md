# R10: getrennte Signierung, Veröffentlichung und Update-Einstieg

Stand: 15.10.2026. **R10 ist signiert und veröffentlicht; alle vier Jobs der
Veröffentlichungspipeline sind erfolgreich abgeschlossen.** Dieser Vermerk
trennt die tatsächlichen Releasebelege von den historischen lokalen Vorprüfungen.
**Es wurde kein Update auf dem Pi ausgeführt; eine Produktionsfreigabe besteht
nicht.**

## Tatsächliche Veröffentlichung

Der [native Sicherheitslauf 38717983127](https://github.com/NexoWatt/nexowatt-eos/actions/runs/38717983127)
bestand alle acht Prüfgruppen und 21/21 native Checks auf dem exakten Quellcommit
`ad5bea8de208d6ae2ad4d23b662c9f29701675a0`. Der anschließende
[Veröffentlichungslauf 38718750400](https://github.com/NexoWatt/nexowatt-eos/actions/runs/38718750400)
bestand alle vier Jobs. Die signierte Lieferung bindet Release-ID
`9073b20a1c9f54eb4870b3b37a4a8ef59c6916feb379234aa6d14986a3fc26f0`
und das 88.999.180 Bytes große Archiv mit SHA-256
`0744417d8a9ece466a097170bf8636b463cd94dde03203e3df96e8d38290bb55`.

| Veröffentlichung | Unveränderlicher Commit |
| --- | --- |
| Archiv, Schlüssel und Liefermetadaten | `829f513549d8044e46cb17aebd781df087b8c54f` |
| Update-Skript | `47a78ead5a48005f948f26f3dea21047d25468f7` |
| Gepinnter Updatebefehl | `f264bb9f7510a0e2d21637a39f8b9fc9464bdec9` |

[delivery.json](delivery.json), [build-verification.json](build-verification.json)
und [native-workflow.json](native-workflow.json) dokumentieren Quellen,
Signaturprüfung, Archivprüfung und native Bindung. Das unveränderte
`published: false` im Buildbericht gehört zum Buildzeitpunkt vor dem Publishjob;
es ist keine Aussage über den anschließenden Veröffentlichungserfolg.
Der [öffentliche Assetvergleich](../../../../delivery/public-update-test3-r10/remote-readback.json)
belegt den tatsächlichen HTTPS-Abruf und bytegleichen Vergleich von Archiv,
Schlüssel und Liefermetadaten in der Pipeline.

Der [abschließende Workflowstatus](final-workflow-status.json) hält auch
[CodeQL 38717982998](https://github.com/NexoWatt/nexowatt-eos/actions/runs/38717982998)
und [Workflowvalidierung 38717982894](https://github.com/NexoWatt/nexowatt-eos/actions/runs/38717982894)
als erfolgreich fest. Daraus folgt keine Aussage über null Code-Scanning-Alerts;
die Alerts wurden hier nicht vollständig aufgezählt. Bekannte Forge-/AJV-Befunde
bleiben offen.

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

Nach Veröffentlichung erzeugte ein separater Job
`delivery/public-update-test3-r10/update.sh` aus dem geprüften Archiv. Der
Einstieg bindet das Archiv, den öffentlichen Schlüssel und die Release-ID an
einen vollständigen Git-Commit und vergleicht die veröffentlichten Assets per
HTTPS byteweise. Daraus entstanden der oben genannte Entry-Commit und ein
zweiter Commit mit `UPDATE_COMMAND.txt` und `command-verification.json`.

Der veröffentlichte Einzeiler prüft das vollständige Skript vor Ausführung auf Länge
und SHA-256. Das Skript prüft die komplette Archivdatei vor dem Extrahieren,
verwendet nur den neuen `update-test-own-adapters.cjs` und startet ihn unter
einem begrenzten systemd-Aufruf mit abgestimmtem Abbruchschutz. Der Updater
authentifiziert R9 und R10 erneut, einschließlich Zielschlüssel und Release-ID.
Er akzeptiert ausschließlich ein gesundes, vollständig eingerichtetes R9 mit
Node 24.21.0. Bestehende Konten, Lizenz, UUID und Zertifikate bleiben erhalten;
Geräteadressen und Steuerfreigaben werden nicht erfunden.

Der [veröffentlichte Befehl](https://github.com/NexoWatt/nexowatt-eos/blob/f264bb9f7510a0e2d21637a39f8b9fc9464bdec9/delivery/public-update-test3-r10/UPDATE_COMMAND.txt)
und das Skript wurden anschließend unabhängig über den GitHub-Connector von
ihren exakten öffentlichen Raw-URLs gelesen. Die UTF-8-Antwortbytes stimmen
mit den gepinnten Git- und lokalen Dateien überein; Länge, SHA-256,
Befehlsrekonstruktion und Shellsyntax sind geprüft. Der
[Rücklesebeleg](public-command-readback.json) trennt diesen erfolgreichen
Connector-Abruf ausdrücklich vom lokalen direkten HTTPS-Versuch, der nach
fünf Sekunden mit einem Netzwerk-Timeout endete. Ein lokaler direkter
HTTPS-Erfolg wird nicht behauptet. Der
[Befehlsnachweis](../../../../delivery/public-update-test3-r10/command-verification.json)
bindet den Einstieg zusätzlich an den erfolgreichen Assetvergleich.

Ein fehlgeschlagener öffentlicher Rücklesetest darf durch einen erneuten
regulären Workflowlauf behoben werden, nicht durch Entfernen von Hash- oder
Signaturgates. Der veröffentlichte Befehl wurde nicht auf dem Zielgerät ausgeführt.

## Historische lokale Vorprüfungen

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

Die qualifizierte native R10-Prüfung, Signierung, unabhängige vollständige
Rekonstruktion im Publishjob und der öffentliche Assetvergleich sind inzwischen
durch die oben verlinkten Releasebelege nachgewiesen. Offen bleiben das Pi-Update,
Pi/ARM64-Systemd-Mountverhalten, Geräteanbindungen, vollständiger Restore und
50-/100-ms-Reaktionsziele als gesonderte Zielsystemprüfungen. Daraus wird keine
Produktions- oder CRA-Konformitätsfreigabe abgeleitet.
