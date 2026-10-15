# Gemeinsamer Teststand der sechs eigenen Adapter

Stand: 15. Oktober 2026. **R10 ist signiert, veröffentlicht und öffentlich
zurückgelesen.** Der qualifizierte native Lauf einschließlich Backup,
Migrationsrückfall und Neustart ist bestanden. Die Testlieferung besitzt keine
Produktions- oder CRA-Freigabe; Installation und Hardwareabnahme auf dem Pi sind
weiterhin offen. Ein gestarteter Adapter ist kein verbundenes Gerät.

## Ziel und unveränderte Grenzen

Der neue explizite Testumfang enthält EOS Admin, NexoWatt UI, Devices, EEBUS,
OCPP und NexoWatt Backup sowie den Controller. Historische R9-Lieferungen bleiben
unverändert: dort sind weiterhin nur Admin und UI zum Managementtest zugelassen.
JavaScript-/Fremdadapter werden nicht mitfreigeschaltet. Die gemeinsame Runtime-
UID ist keine belastbare Trennung beliebigen fremden Programmcodes.

Die veröffentlichte neue Lieferung ist `0.2.0-test.3`, Sequenz 13, auf Basis des
signierten R9 mit Release-ID
`97780e881765e2c9854e81ac7187b3ed120eccc8cc0dea0821492c9a54e23000`.
R10 ist an Quellcommit `ad5bea8de208d6ae2ad4d23b662c9f29701675a0` und Release-ID
`9073b20a1c9f54eb4870b3b37a4a8ef59c6916feb379234aa6d14986a3fc26f0` gebunden.
Der [veröffentlichte Updatebefehl](../../../delivery/public-update-test3-r10/UPDATE_COMMAND.txt)
liegt im Commit `f264bb9f7510a0e2d21637a39f8b9fc9464bdec9`.
Die Migration setzt ein gesundes, vollständig eingerichtetes R9, Sequenz 12,
auf ARM64 mit Node 24.21.0 voraus. Sie ist kein Neuinstallations- oder allgemeiner
Reparaturweg. Alle sechs Instanzen werden aktiviert; die vier zusätzlichen
Adapter bleiben ohne bewusste Gerätekonfiguration, Kopplung beziehungsweise
Zieleinrichtung entsprechend unkonfiguriert und führen keine erfundenen
Geräteverbindungen oder Steuerfreigaben aus.

## Abgeschlossene native Prüfung und Auslieferung

| Nachweis | Tatsächliches Ergebnis |
| --- | --- |
| [Sicherheitslauf 38717983127](https://github.com/NexoWatt/nexowatt-eos/actions/runs/38717983127) | 8/8 Jobs erfolgreich, exakt auf den genannten Quellcommit bezogen |
| [Own-Adapter-Job 116365242813](https://github.com/NexoWatt/nexowatt-eos/actions/runs/38717983127/job/116365242813) | 15/15 TAP-Tests und 21/21 Freigabechecks bestanden; Node 24.21.0, PostgreSQL 17.11, Linux x64 |
| Start und Neustart | Zwei Starts mit je sechs tatsächlichen Adapterprozessen und Controller; frische Lebenszeichen und Controllerverbindungen |
| Lizenz und Rückfall | Zentrale Home-/Pro-Aktivierung, Widerruf, Rückfall der Adaptermigration vor und nach Start, erneute Anwendung und Neustart bestanden |
| Backup-Inhalte | Zwei private Archive mit je 305 Objekten und 268 Zuständen; Pflichtobjekte, Canary und exakte Laufzeitkonfiguration vorhanden, frühere Archive ausgeschlossen |
| Laufzeit und Abschluss | Alle 16 Scans einschließlich beider Stops und Cleanup ohne Laufzeitfehler; App-Inventar ohne hinzugefügte, entfernte oder geänderte Dateien |
| [Auslieferungslauf 38718750400](https://github.com/NexoWatt/nexowatt-eos/actions/runs/38718750400) | Erfolgreich; R10 signiert, veröffentlicht und öffentlich zurückgelesen |
| [CodeQL 38717982998](https://github.com/NexoWatt/nexowatt-eos/actions/runs/38717982998) | Workflow erfolgreich; keine Aussage über null Alerts |
| [Workflowvalidierung 38717982894](https://github.com/NexoWatt/nexowatt-eos/actions/runs/38717982894) | Erfolgreich auf demselben Quellstand |

Die dauerhaften, bereinigten Belege liegen als
[native Evidenz](release/own-adapters-native-evidence.json),
[TAP](release/own-adapters-native.tap),
[Quellbindung](release/own-adapters-source-binding.json),
[Buildprüfung](release/build-verification.json) und
[öffentlicher Downloadvergleich](../../../delivery/public-update-test3-r10/remote-readback.json)
vor. [Abschließende Workflowzustände](release/final-workflow-status.json) und
[erneuter Vergleich des öffentlichen Befehls](release/public-command-readback.json)
halten den erfolgreichen Abschluss und den exakt rückgelesenen Installationsbefehl fest.
Die sieben Prozessnachweise umfassen Setup, zwei Uploads, zwei
Controllerstarts und zwei Backup-CLIs. Ausschließlich das erfolgreich geprüfte
Setup enthält den erwarteten verweigerten Schreibversuch; Controller und
Backup-CLIs enthalten keine Fehlerindikatoren. Die qualifizierte x64-Prüfung
des Kandidaten ist kein ARM64-/Pi-Hardwaretest und keine Backupwiederherstellung.

Die CodeQL-Alerts-API war nicht zugänglich; null Alerts werden deshalb nicht
behauptet. 17 Parserdiagnosen betreffen den historischen Methodenausschnitt
`docs/security/evidence/admin-first-run/fixtures/WizardDialog.onClose.ts`, nicht
die Laufzeitmodule. Der erfolgreiche Workflow wird nicht als vollständig
fehlerfreie Analyse dieses Ausschnitts ausgegeben.

## Änderungen und Nachweise

| Bereich | Änderung | Beleg / Grenze |
| --- | --- | --- |
| Produktumfang | Expliziter sechs-Adapter-Testumfang; historische Standards bleiben bei zwei Adaptern | `tests/postgresql/own-adapter-product.test.cjs`; keine tatsächliche Aktivierung durch Inventarprüfung |
| Einrichtung | Feste vier zusätzliche Instanzen, geschütztes Journal vor Änderung, eng begrenzter Rückfall | `runtime/bootstrap/OWN_ADAPTER_ENROLLMENT.md`; nativer Migrationsrückfall bestanden, vollständiger Pi-Host-Koordinator weiterhin separat zu prüfen |
| Startabhängigkeiten | EEBUS und Backup erwarten `eos-admin`, nicht den nicht vorhandenen alten `admin`-Namen | `tests/integration/own-adapter-dependencies.test.cjs` |
| OCPP | Explizit unkonfigurierter Wartezustand; keine unsichere Listener-Ersatzkonfiguration; korrigierte Shutdown-Races | `components/ocpp21/COMMISSIONING_20261015_DE.md` und Komponenten-Rohprotokolle |
| Backup | Private Datenpfade, echtes Hostsecret statt Ersatzschlüssel, überprüfter Archiverfolg | `components/backitup/reports/startup-20261015/README_DE.md`; kein vollständiger Systemrestore |
| Controllerbackup | Hashgebundene neue CJS-/ESM-Ableitung mit externem privaten Staging; keine früheren Archive im Export | [Technischer Bericht](controller-backup-state.md); beide realen Archive im nativen Job inhaltlich geprüft |
| Abschaltung | Hashgebundene Adapterkern-Ableitung beendet den Shutdown nur einmal und verhindert den Wettlauf mit dem Datenbankabbau | [Reproduktion und Korrektur](ci-repair/ADAPTER_SHUTDOWN_DE.md); beide nativen Stops fehlerfrei |
| Admin-Oberflächen | Neue getrennte Vorlage lädt alle sechs signierten Adapteroberflächen unter denselben Dienstbeschränkungen | `tests/system/own-adapter-upload.test.cjs`; historische Vorlage unverändert |
| Reale Prozesse | Isolierte Prüfung mit PostgreSQL 17.11, Node 24.21.0, sechs Adapterprozessen, Home/Pro, Widerruf, Backup, Rückfall und Neustart | `tests/integration-own-adapters/README_DE.md`; 21/21 native Checks bestanden |

Die lokalen ergänzenden Prüfungen laufen unter Node 24.19.0/Linux x64. Das
ersetzt nicht den qualifizierten Lauf mit 24.21.0. Der bestehende Backup-Test
mit fremder UID kann in der lokalen Root-Namespace nicht ausgeführt werden;
der vollständige CI-Test bleibt bestehen, kein permanenter Ausschluss.

## Sicherheits-, SBOM- und CRA-Abgrenzung

Die [neue Runtime-SBOM](release/runtime.cdx.json) und ihre
[Derivatbindung](release/runtime-derivative-sbom.json) binden die tatsächlich
ausgelieferte App, alle sechs eigenen Ableitungen, die beiden Backup-CLI- und
beiden Shutdown-Transformationen sowie das neue Controllerprofil. Die historische
R9-SBOM wurde nicht unverändert als Nachweis eines anderen Pakets verwendet.
Die Veröffentlichung erfolgte nach quellen- und appgebundenen nativen Nachweisen,
Signaturprüfung, unabhängiger Archivprüfung und öffentlichem Downloadvergleich.

[Abhängigkeitsprüfung an der authentifizierten R9-Runtime](dependency-review/README_DE.md):
node-forge und verschachteltes AJV bleiben gesondert zu bewerten. Die begrenzte
Aufruf-/Schemaanalyse ist kein vollständiger dynamischer Erreichbarkeitsnachweis
und kein neuer vollständiger Schwachstellenscan. Keine Audit-Filter oder
pauschalen Zwangsupdates wurden eingeführt.

Weiter offen bleiben insbesondere Pi/ARM64- und echte systemd-Mountprüfung,
Geräte-/Stationsanbindung, vollständige Wiederherstellung, sichere Freigabe
historischer Backup-Dateioberflächen, OS-/Firmware-Inventar und nachgewiesene
Reaktionszeiten. OCPP erfordert vor Stationsbetrieb ein geprüftes TLS-Profil
mit konkreten Geräteidentitäten. Geräteverbindungen und Steuerfreigaben werden
bei dieser Migration nicht erfunden oder automatisch gesetzt.

Eine Testfreigabe ist weder CRA-Konformität noch eine Zusicherung von 100 Prozent
Zuverlässigkeit. Offene Befunde werden dokumentiert, nicht durch grüne
Testanzeigen oder eine Produktlizenz geschlossen.
