# Gemeinsamer Teststand der sechs eigenen Adapter

Stand: 15. Oktober 2026. **Quellkorrekturen und neue Prüfstrecke, noch keine
veröffentlichte R10-Lieferung und keine Produktionsfreigabe.** Dieser Bericht
wird mit tatsächlich ausgeführten CI-/Liefernachweisen ergänzt. Ein vorbereiteter
Test ist kein bestandener Test; ein gestarteter Adapter ist kein verbundenes Gerät.

## Ziel und unveränderte Grenzen

Der neue explizite Testumfang enthält EOS Admin, NexoWatt UI, Devices, EEBUS,
OCPP und NexoWatt Backup sowie den Controller. Historische R9-Lieferungen bleiben
unverändert: dort sind weiterhin nur Admin und UI zum Managementtest zugelassen.
JavaScript-/Fremdadapter werden nicht mitfreigeschaltet. Die gemeinsame Runtime-
UID ist keine belastbare Trennung beliebigen fremden Programmcodes.

Die vorgesehene neue Lieferung ist `0.2.0-test.3`, Sequenz 13, auf Basis des
signierten R9 mit Release-ID
`97780e881765e2c9854e81ac7187b3ed120eccc8cc0dea0821492c9a54e23000`.
Bis zum vollständigen Prüfabschluss gibt es dafür keinen Installationsbefehl.
Die erste Migration setzt ein gesundes, vollständig eingerichtetes R9 voraus;
ein noch nicht geprüfter Neuinstallationsweg darf diese Migration nicht umgehen.

## Änderungen und Nachweise

| Bereich | Änderung | Beleg / Grenze |
| --- | --- | --- |
| Produktumfang | Expliziter sechs-Adapter-Testumfang; historische Standards bleiben bei zwei Adaptern | `tests/postgresql/own-adapter-product.test.cjs`; keine tatsächliche Aktivierung durch Inventarprüfung |
| Einrichtung | Feste vier zusätzliche Instanzen, geschütztes Journal vor Änderung, eng begrenzter Rückfall | `runtime/bootstrap/OWN_ADAPTER_ENROLLMENT.md`; echter Host-Koordinator separat zu prüfen |
| Startabhängigkeiten | EEBUS und Backup erwarten `eos-admin`, nicht den nicht vorhandenen alten `admin`-Namen | `tests/integration/own-adapter-dependencies.test.cjs` |
| OCPP | Explizit unkonfigurierter Wartezustand; keine unsichere Listener-Ersatzkonfiguration; korrigierte Shutdown-Races | `components/ocpp21/COMMISSIONING_20261015_DE.md` und Komponenten-Rohprotokolle |
| Backup | Private Datenpfade, echtes Hostsecret statt Ersatzschlüssel, überprüfter Archiverfolg | `components/backitup/reports/startup-20261015/README_DE.md`; kein vollständiger Systemrestore |
| Controllerbackup | Hashgebundene neue CJS-/ESM-Ableitung mit externem privaten Staging; keine früheren Archive im Export | [Technischer Bericht](controller-backup-state.md); reale Archivprüfung im neuen nativen Job |
| Admin-Oberflächen | Neue getrennte Vorlage lädt alle sechs signierten Adapteroberflächen unter denselben Dienstbeschränkungen | `tests/system/own-adapter-upload.test.cjs`; historische Vorlage unverändert |
| Reale Prozesse | Neue isolierte Prüfung mit PostgreSQL 17.11, Node 24.21.0, sechs Adapterprozessen, Home/Pro, Widerruf, Backup, Rückfall und Neustart | `tests/integration-own-adapters/README_DE.md`; zum Berichtzeitpunkt noch kein bestandener Lauf |

Die lokalen ergänzenden Prüfungen laufen unter Node 24.19.0/Linux x64. Das
ersetzt nicht den qualifizierten Lauf mit 24.21.0. Der bestehende Backup-Test
mit fremder UID kann in der lokalen Root-Namespace nicht ausgeführt werden;
der vollständige CI-Test bleibt bestehen, kein permanenter Ausschluss.

## Sicherheits-, SBOM- und CRA-Abgrenzung

Die neue Runtime-SBOM muss die tatsächlich ausgelieferte App, alle sechs
eigenen Ableitungen, die beiden Backup-CLI-Transformationen und das neue
Controllerprofil binden. Die historische R9-SBOM darf nicht unverändert als
Nachweis eines anderen Pakets verwendet werden. Die Veröffentlichung bleibt
an erfolgreiche quellen- und appgebundene native Nachweise, Signaturprüfung,
unabhängige Archivprüfung und öffentlichen Downloadvergleich gebunden.

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
