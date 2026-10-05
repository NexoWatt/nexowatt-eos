# R9-Veröffentlichungsgrenzen: Änderungs- und Prüfvermerk

Stand: 05.10.2026, Quellbasis `4e171e4` plus neuer R9-Arbeitsstand. Ausführung:
Linux x64, Node.js 24.19.0, Python 3.12.14; tatsächliche R9-Signierung und native
Integration verlangen separat exakt Node 24.21.0 und wurden hier nicht behauptet.

## Änderung

Neue R9-Dateien ergänzen den gesunden R8→R9-TEST-Updateweg. Historische
R4–R8-Lieferungen und deren Werkzeuge wurden in diesem Arbeitsschritt nicht
verändert. Die R6-Updatevorlage wurde auf genau R8/Sequenz 11 als Ausgangspunkt
und R9/Sequenz 12 als Ziel eingegrenzt; keine R8-Recovery-Zustandsmaschine wurde
als Updateweg übernommen.

Der Workflow verlangt einen kanonischen Marker-only-Folgecommit und einen
exakt diesem Commit zugeordneten erfolgreichen Security-Workflow. Ein Marker-
Push allein signiert nichts. Der Artefaktabruf prüft festes Repository,
Workflowpfad, Workflowereignis, Branch, Head-Commit, Run-ID, Dateigröße,
Ablaufstatus und Digest. Nur ein Artefakt bis 12 MiB ist zulässig; die API-Abfrage
hat ein Gesamtbudget von fünf Sekunden und höchstens 1 MiB Antwort. Der
geprüfte Download-Action-Pin unterstützt `digest-mismatch: error`; native
Dateien werden ausdrücklich mit `merge-multiple: true` ins erwartete Ziel
gelegt. Keiner der neuen Action-Aufrufe verwendet unerlaubte Eingaben.

Vor Signierung bindet der Builder alle nativen Pflichtprüfungen und den
kanonischen App-Inhalt an die neu vorbereiteten Bytes. Der Publisher
rekonstruiert die komplette signierte Lieferung unabhängig, prüft dieselbe
Evidenz gegen das signierte App-Inventar und kopiert nur die 13 expliziten neuen
Liefer-/Berichtsdateien. Wiederholte geprüfte Berichtsquellen müssen identisch
bleiben. Veröffentlichungen sind normale Fast-forward-Pushes auf unverändertes
`main`. Ein einmal veröffentlichtes R9 wird nicht überschrieben.

Der öffentliche Einstieg bindet Archiv, Schlüssel, Größen, Hashes und Commit;
Node 24.21.0, root-eigene Pfade, gehärtete Extraktion, Supervisor und
`ExecStopPost --quiesce-incomplete` bleiben zwingend. Öffentliche Node-Readbacks
haben ebenfalls ein gemeinsames Fünf-Sekunden-Budget. Kein Zugriff auf Geräte
oder Systemdienste erfolgte bei den hier dokumentierten Prüfungen.

## Tatsächliche Prüfungen

| Prüfung | Ergebnis | Rohbeleg |
|---|---|---|
| Vier neue Node-Prüfsuiten zu Entry, Publisher, Workflow-Anforderung und nativer Evidenz | 36 bestanden, 0 fehlgeschlagen/übersprungen | `node-tests.log` |
| Isolierte Kandidaten-Publisher-Prüfung mit synthetischen Archivdaten | 17 bestanden | `python-tests.log` |
| Offizielles, SHA-geprüftes actionlint 1.7.12 für R9-Delivery und `security-review.yml` | Bestanden | `actionlint.log` |
| `git diff --check` | Bestanden | Direkte Arbeitsbaumprüfung |

Die Tests prüfen unter anderem falsche/alte Release- und Schlüsselpins,
Dateigrößen/Hashes, Symlinks/Hardlinks, Pfadausbrüche, vorhandene Zielpfade,
fehlende/mutierte/stagefremde Dateien, Supervisor-Umgebung und Bash-Syntax,
fremde GitHub-Repositories/Workflows/Quellstände, fehlende/negative/übersprungene
native Prüfungen, geänderte App-Pfade/Größen/Hashes und echte Abbrüche der
simulierten HTTPS-Anfrage bei Deadline, Redirect oder übergroßer Antwort.

Bei der ersten Syntaxprüfung wurde die Verwendung von `runner.temp` in einem
Job-`env` abgewiesen. Der Pfad wird jetzt im Schritt aus `RUNNER_TEMP` gebildet;
der abschließende actionlint-Lauf prüft den korrigierten Stand.

Befehle:

```sh
node --test tests/bootstrap/public-r9-update-entry.test.cjs tests/bootstrap/public-r9-update-publication.test.cjs tests/bootstrap/r9-delivery-workflow.test.cjs tests/bootstrap/r9-native-evidence.test.cjs
python3 -I -B tests/bootstrap/r9-candidate-publication.test.py
bash tools/ci/check-workflows.sh .github/workflows/eos-r9-test-delivery.yml .github/workflows/security-review.yml
```

## Offene Freigaben

Die lokal synthetischen Archivdaten sind kein signiertes R9. Reale native
PostgreSQL-/Management-Prüfung, signierte Lieferung, öffentliche Byte-Readbacks,
GitHub-Workflowausführung, Pi-/systemd-Update sowie physische Anlagenprüfung
bleiben durch ihre tatsächlichen Ergebnisse nachzuweisen. Bestehende
Managementtests sind keine Protokoll- oder Hardwarefreigabe. Diese Prüfung
bescheinigt weder Produktionsfreigabe noch CRA-/IEC-Konformität.

Bedienung, Rückfallgrenzen und Herstellerbefehle:
[TEST_R9_UPDATE_DE.md](../../../docs/operations/TEST_R9_UPDATE_DE.md).
