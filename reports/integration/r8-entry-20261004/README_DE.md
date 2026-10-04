# R8: Öffentlicher Transport und verpflichtende Auslieferungsprüfungen

Stand: 04.10.2026. Dies sind neue Quell- und Prüfdateien für die TEST-Revision 8,
Sequenz 11. Hier wurde kein neues Archiv signiert, kein öffentlicher
Wiederherstellungsbefehl erzeugt und keine Pi-Reparatur ausgeführt. Bereits
veröffentlichte R4/R5/R6/R7-Archive und ihre Befehle bleiben unverändert.

## Anlass und eng begrenzter Reparaturpfad

Das vorliegende Pi-Journal zeigt beim R7-Versuch einen erfolgreichen
`CONTROLLER_READY`, den Start von Admin und UI und danach einen ausdrücklich
ausgelösten Stop. Der geschützte Wiederherstellungsstatus ist
`RESTORED_STOPPED` auf R4/Sequenz 7 mit erhaltenen Sperren. Das Journal allein
weist nicht die ursprüngliche, im alten Fehlerpfad verlorene Ausnahme nach.
Die separate Readiness-Prüfung dokumentiert den reproduzierten einmaligen
HTTPS-Starttest vor dem verzögerten Listener.

Der neue öffentliche Einstieg ist auf genau diesen wiederhergestellten
R4-Zustand nach dem bekannten R7-Versuch beschränkt. Die Konfiguration bindet
R4-Release und -Schlüssel, R7-Release
`d400cab68939e60e22b619b78b3ecc4a4043afbfe6e21696934db42ba586d5a3`, den
R7-Schlüsselfingerabdruck
`a6a11d0d02b058a15d78a1aa81a22e488d120ee3ab9f11e1bd35a3aafad6d522`, Sequenz
10, Revision 7 und Phase `RESTORED_STOPPED`. Die Prüfung des tatsächlichen
geschützten Journals und der Sperren erfolgt erst durch den signierten neuen
Koordinator auf dem Zielgerät. Ein aktives R7 oder ein beliebiger defekter
Installationszustand ist nicht freigegeben.

## Öffentlicher Einstieg

`build-public-r8-recovery-entry.cjs --asset-commit <40-stelliger Commit>` prüft
das komplette Archiv, die Signatur, Zielsequenz 11 und die genaue signierte
Datei `tools/system/recover-r4-restored-r7-to-r8.cjs`. Es schreibt exklusiv
`delivery/public-recovery-test3-r8/recover.sh` und `preparation.json`.

`prepare-public-r8-recovery-publication.cjs --readback <Asset-Commit>` lädt
Archiv, öffentlichen Schlüssel und Metadaten über unveränderliche öffentliche
HTTPS-Adressen zurück und vergleicht Größe, SHA-256 und sämtliche Bytes. Nur
die drei neuen Einstieg-/Nachweisdateien dürfen anschließend veröffentlicht
werden. Erst nach diesem Commit lädt der Workflow das tatsächliche öffentliche
`recover.sh` herunter und prüft erneut Größe, Hash und Bytegleichheit.

Danach erzeugen `--entry-commit <Entry-Commit>` und
`--command-report <Entry-Commit>` den gebundenen Einzeilenbefehl und seinen
Nachweis. Der zweite Veröffentlichungsschritt erlaubt ausschließlich diese
zwei neuen Dateien. Beide Schritte prüfen den unveränderten `main`-Stand und
verwenden einen normalen Fast-forward-Push. Eine unterbrochene Veröffentlichung
kann ausschließlich in den vollständigen Drei- oder Fünf-Datei-Zuständen
fortgesetzt werden; vorhandene Dateien werden nicht überschrieben.

Der spätere Zielbefehl prüft Downloads vor der Ausführung, entpackt nur das
authentifizierte Archiv und startet den neuen Koordinator unter systemd mit
bereinigter Umgebung, privater Ablage, fester Operationsidentität und
`ExecStopPost`-Behandlung. Er enthält keinen Force-Schalter und keine
Abschaltung von Signatur-, TLS- oder Schreibschutzprüfungen.

## Workflow-Grenzen

`.github/workflows/eos-r8-test-delivery.yml` reagiert automatisch ausschließlich
auf `reports/integration/installable-test3-r8-20261004/BUILD_REQUEST.json` auf
`main`. Der auslösende Commit muss einen einzigen Elterncommit und ausschließlich
diese neue oder aktualisierte Datei enthalten. Ihr JSON muss exakt Schema 1,
Revision 8 und den unmittelbaren Elterncommit als `sourceCommit` enthalten;
doppelte Schlüssel werden abgelehnt. Diese Änderung legt keinen Marker an.

Ein manueller Dispatch darf nur die Veröffentlichung vorhandener R8-Assets
fortsetzen. Vor einer Schreiboperation werden das vollständige Archiv, seine
Signatur und der gebundene Recovery-Helper erneut authentifiziert.

Vor Build und Signierung müssen zwei getrennte native Ubuntu-24.04-Jobs mit
Node 24.21.0 erfolgreich sein: der bestehende PostgreSQL-/Controller-Starttest
sowie der neue vollständige Admin-/UI-Managementtest. Der zweite Job verwendet
das authentifizierte unveränderte R7-App-Verzeichnis, echte PostgreSQL-17.11-
mTLS-Verbindungen, die aktuelle Readiness-Funktion, beide HTTPS-Endpunkte sowie
Stop und Neustart. Feste Produktpfade werden ausschließlich auf einem frischen,
wegwerfbaren GitHub-Runner eingerichtet; vorhandene Pfade führen zum Abbruch.
Nur `management.tap` und `management-evidence.json` werden hochgeladen.

Zusätzlich laufen vor dem Signieren die Builder-/Publisher-Verträge, die neuen
Recovery-Verträge, der authentifizierte R4-Collector, die öffentlichen
Transport-/Stage-/Request-Prüfungen und die echten TLS-Readiness-Tests. Ein
getrennter Publish-Job rekonstruiert und prüft den Kandidaten unabhängig.

## Ausgeführte lokale Prüfungen

- 32/32 Transport-, Publikations- und Request-Verträge bestanden. Die sechs
  Request-Prüfungen führen den tatsächlichen Python-Code des Workflows in
  isolierten Git-Repositories aus, einschließlich falscher Bindungen,
  zusätzlicher Änderungen, Merge-Eltern und manueller Erstbau-Abweisung.
- `actionlint` 1.7.12, vor Ausführung anhand des festgelegten SHA-256 geprüft:
  neue Workflow-Datei ohne Fehler.
- YAML sowie 28 eingebettete Bash-, zwei JavaScript- und ein Python-Skript
  syntaktisch geprüft.
- Reale Bash-Datei-/Hashgrenzen und Extraktions-Abweisungen wurden mit lokalen
  inerten Testdaten ausgeführt. Dabei fand keine Netzveröffentlichung statt.

Rohprotokolle stehen unter `raw/`; Quellbindungen und Ausführungsumfang in
`verification.json` und `workflow-syntax.json`. Lokale Tests nutzten Node
24.19.0; die obligatorischen nativen CI-Jobs verwenden 24.21.0. Native
Fullmanagement-Ausführung, vollständige GitHub-Auslieferung und öffentliche
HTTP-Rücklesung dieses neuen Kandidaten sind hier **OFFEN**. Ebenso offen sind
R8-Pi-Abnahme, Login-Abnahme, ARM64-/systemd-Mount-Verhalten und Anlagenbetrieb.
Diese Nachweise enthalten keine Produktions- oder CRA-Konformitätsfreigabe.
