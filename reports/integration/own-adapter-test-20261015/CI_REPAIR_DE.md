# Nachprüfung der fehlgeschlagenen gemeinsamen Adapterintegration

Bezug: NexoWatt EOS, 15.10.2026; Ausgangscommit
`71155ef851c791cda380bbaa216ac5178335e466`.
Dieser Vermerk ergänzt den vorhandenen [Teststandsbericht](README_DE.md).
Er ist keine Geräte-, Produktions- oder CRA-Freigabe.

## Ausgangsbefunde

Der [Security-Lauf 38685673610](https://github.com/NexoWatt/nexowatt-eos/actions/runs/38685673610)
bestand sechs Prüfgruppen. Zwei native Prüfgruppen schlugen fehl:

| Kennung | Beobachtung | Ursache und Korrektur |
| --- | --- | --- |
| EOS-R10-CI-01 | R9-Vorbereitung endet mit `R9_NATIVE_PREPARATION_FAILED` | Die neue Repository-Herkunftsangabe des Backup-Pakets fehlte in der eng begrenzten R9-Metadatenprüfung. Ausschließlich die konkrete, auch im R10-Prüfer zulässige Herkunftsangabe wird ergänzt; Abhängigkeiten, Einstiegspunkte und andere Paketfelder bleiben geprüft. |
| EOS-R10-CI-02 | Sechs-Adapter-Test endet mit `OWN_NATIVE_ALL_ALIVE_DEADLINE` | Devices lud bereits ohne konfigurierte Geräte die ARM64-Seriellbindung. Im nativen x64-Test verhinderte deren Hostprüfung den Prozessstart. Der Gerätetreiber wird jetzt erst bei tatsächlichem Gerätebedarf geladen; der Hostschutz bleibt erhalten. |
| EOS-R10-CI-03 | Quellprüfung und native Prozessbelege weisen einen weiteren Widerspruch im Signiergate nach | Der Test erzeugt absichtlich die Lizenzzustände `LICENSE_MISSING` und `LICENSE_VALID`; das gewöhnliche CLI-Setup meldet außerdem die erwartete Schreibverweigerung für optionale Root-Starter im unveränderlichen App-Verzeichnis und endet erfolgreich. Das Gate prüft jetzt die genaue Folge aller sieben Prozessbelege und ihre vollständige Vereinigungsmenge: Lizenzstatus nur bei Controllern, `PERMISSION_DENIED` ausschließlich beim einmaligen `cli-setup` mit genau einem erfolgreich abgeschlossenen Setup-Schritt. Fehler bei Controller, Upload oder Backup sowie weitere Setupfehler, unbekannte Codes/Prozesse, Duplikate, fehlende Belege und ungültige Typen verhindern die Signierung. Rohbelege, unveränderte App-/Konfigurationsprüfung und alle fachlichen Prüfschritte bleiben erhalten. |

Zusätzliche feste Diagnosecodes und begrenzte Zustandsangaben sollen
Startfehler zuordnen, ohne private Konfiguration, Passwörter, Schlüssel oder
beliebige Ausnahmetexte als Testartefakt zu veröffentlichen.

## Prüfstatus dieses Vermerks

Die lokale Vorprüfung unter Linux x64, Node **24.19.0**, bestand 91 Prüfungen
für Adapterabhängigkeiten, Instanzmigration, Produktumfang, Asset-Upload,
SBOM-Bindung und R10-Releaseverträge. Ein separater Code-Review des vorhandenen
Updatekoordinators, der Migration und des Uploads wiederholte 92 einschlägige
Prüfungen erfolgreich. Diese Zahlen überlappen und werden nicht addiert.

Die korrigierte R9-Appvorbereitung aus authentifiziertem R8 bestand vollständig:
2.068 aktuelle Paketquelldateien, unveränderter Abhängigkeitslock und unveränderte
installierte Fremdpaketbytes/-modi. Dies war eine lokale, unsignierte
Vorbereitung. [Quellgebundener Beleg](../../../tests/integration-r9/evidence/unsigned-preparation-20261015.json).

Weitere tatsächlich bestandene Regressionen und Rohbelege:

- [Devices-Start und Lizenz-/Verbindungsregression: 32/32](ci-repair/devices-startup-regression.tap).
- [Native Testvorbereitung und bereinigte Diagnose: 18/18](ci-repair/own-readiness-diagnostics.tap).
- [Prozessbezogenes R10-Nachweisgate: 21/21](release/native-gate-repair-20261015.tap).
- [R10-Publikationsverträge: 34/34](release/publication-contract.tap) und
  [Python-Publikationsverträge: 19/19](release/publication-python.txt).
- [Workflow-Syntaxprüfung mit gepinntem actionlint](release/workflow-validation-20261015.log).

Die [Quellhashes der Startupkorrektur](ci-repair/source-regression-summary.json)
und die [Publikationsprüfung](release/publication-checks.json) binden diese
lokalen Ergebnisse an die untersuchten Dateien.

Diese lokale Umgebung ersetzt nicht den qualifizierten GitHub-Lauf mit Node
24.21.0 und PostgreSQL 17.11. Die korrigierte native Gesamtprüfung, Signierung,
unabhängige Paketprüfung und Veröffentlichung stehen beim Anlegen dieses
Vermerks noch aus. Ihre tatsächlichen Commit-/Laufbindungen werden nach dem
Abschluss ergänzt. Vorbereitete Prüfungen gelten nicht als bestanden.

## Testgerät und Rückfall

Das neue Paket ist für ein vollständig eingerichtetes, gesundes R9 vorgesehen.
Die neuen Instanzen starten ohne konfigurierte physische Ziele. Vorhandene
Konten, zentrale Lizenz, Zertifikate und Datenbank bleiben erhalten.

Auch nach einem nachgewiesenen Rückfall zu aktivem R9 bleibt der geschützte
Migrationsplan als Nachweis erhalten. Ein erneuter Versuch kann deshalb mit
`REPAIR_ENROLLMENT_PLAN` abbrechen. Keine Sperren oder Pläne löschen und keinen
Neuinstaller darüber ausführen; den festen Fehlercode gezielt auswerten.

Pi/ARM64, echte systemd-Mountgrenzen, Geräteverbindungen, vollständige
Wiederherstellung sowie die Reaktionszeitziele 100 ms / 50 ms bleiben offen,
bis die jeweiligen Prüfungen tatsächlich ausgeführt wurden. Die bestehenden
[Abhängigkeitsbefunde](dependency-review/README_DE.md) bleiben getrennt erhalten.
