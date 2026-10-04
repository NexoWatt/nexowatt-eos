# R6-Testupdate: Herstellung und Veröffentlichungsnachweise

Datum: 04.10.2026. Quellbasis für Branding und Login:
`e699a6d575974574ffc4f48d47fe647f6f147f2a` auf `NexoWatt/nexowatt-eos/main`.
Öffentliche Weiterentwicklung und Veröffentlichung sind vom Nutzer ausdrücklich
autorisiert; der private Actions-Minutenrahmen war bereits ausgeschöpft.

## Zweck und Sicherheitsgrenzen

R6 überführt die bereits geprüften Logo-/Browser-/Loginänderungen in ein neues
Testpaket und ermöglicht einen einzigen Updateaufruf für den bekannten R4- oder
R5-Ausgangsstand. Die historischen R4/R5-Signaturen und Dateien bleiben erhalten.
Ziel: `0.2.0-test.3`, Revision 6, Sequenz 9, Linux/ARM64, Node 24.21.0.

Die volle Paketprüfung hat zusätzlich zwei im R5-Backup fehlende Laufzeitmodule
festgestellt: `sdCard.js` und `influxDbCli.js`. Sie werden aus den unveränderten
TypeScript-Quellen mit dem per Lockdatei authentifizierten TypeScript 6.0.3
wiederhergestellt. Beide Ausgaben stimmen bytegenau mit den bereits vorhandenen
Backup-Manifestpins überein; es werden keine neuen Backendbytes als alte ausgegeben.
[Reproduktion und gezielte Prüfungen](../r6-backup-package-20261004/).
Der Backup-Paketprüfer berücksichtigt außerdem die vorhandene, eng begrenzte
Versionsquery im lokalen Frontendlink. Die Brandingzeilen des Backup-Manifests
werden an die tatsächlich ausgelieferten Dateien gebunden.

Der Build authentifiziert R5, führt ausdrücklich gebundene Quellübernahmen aus
und erzeugt eine abgeleitete SBOM sowie eine neue ephemere TEST-Signatur. Es wird
kein frischer npm-Abhängigkeitsbau behauptet. Der Updateweg prüft beide alten
Baselines und erhält DB, Konten, Lizenz, Zertifikate, Hostkonfiguration und
gesperrte physische Anlagensteuerung. Bei Fehlern bleiben Belege und ein
kontrollierter gestoppter Zustand erhalten.

## Vor Veröffentlichung tatsächlich geprüft

- [Updater: 60 Tests und Grenzen der Doubles](../r6-update-20261004/README.md).
- [Öffentlicher Download/Publikation: 24 Tests](../r6-entry-20261004/README_DE.md).
- [YAML, 27 Bash-Schritte, Action-Pins und Jobabhängigkeiten](workflow-static-check.json).
- [GitHub-Ergebnis des vorangehenden Quellcommits](source-ci.md): EOS-Sicherheit
  erfolgreich; tatsächliche Fehler der alten Installermatrix separat aufgeführt.
  Die daraus fehlende vollständige Linux-Installerabnahme wird nicht als bestanden
  ausgegeben. Dieser Bestandsupdateweg führt `dist/install.sh` nicht aus.

Die Build-/SBOM-/Overlay- und Paketnachweise werden im zugehörigen Verzeichnis
`../installable-test3-r6-20261004/` mitgeführt. Der neue R6-Workflow prüft die
zusammengebaute Admin-Authentifizierung und den PostgreSQL-Objects-Backend erneut.
Der Publisher rekonstruiert SBOM, Katalog und den vollständigen Payload aus der
authentifizierten Basis und den geprüften Quellen; selbstberichtete Boolesche
Erfolgsfelder allein reichen nicht. Beide echten R4/R5-Manifestübergänge müssen
den neuen Updatervertrag erfüllen, bevor R6 veröffentlicht wird.
Die laufende EOS-Security-CI enthält nun auch die neuen Login-/Browser- und
R6-Entry-/Updater-Regressionstests, selbst wenn die immutable R6 bereits vorliegt.

## Veröffentlichungskette

1. Geprüfte neue Quellen auf `main` veröffentlichen.
2. Auf genau diesem Commit bauen, signieren, Archiv vollständig zurücklesen und
   das Paket samt SBOM/Quellbindung mit einer engen Dateiliste veröffentlichen.
3. Echte öffentliche Archiv-/Key-/Metadatenbytes über feste HTTPS-Commit-URLs
   zurücklesen. Daraus einen neuen Einstieg committen und den Befehl an genau
   dessen Commit, Byteanzahl und SHA-256 binden.
4. Nach dem Push auch den öffentlichen Einstieg zurücklesen und erst danach den
   aktuellen README-Befehl auf R6 umstellen.

Der Workflow besitzt grundsätzlich nur Leserechte; nur die beiden separaten
Publikationsjobs erhalten `contents: write`. Fremde Actions sind an volle
Commit-SHAs gebunden. Git-Zugangsdaten werden nur dem jeweiligen normalen Push
über einen temporären Askpass-Helfer übergeben. Kein Force-Push, keine
Quellüberschreibung aus dem Buildartefakt und kein automatischer Pi-Zugriff.
Wiederaufnahme nach einer bereits erfolgten Archivpublikation ist möglich, ohne
das Archiv neu zu bauen. Vorhandene Einstiegslieferungen werden erhalten.

Zum Zeitpunkt dieser Quellvorbereitung wird noch keine erfolgreiche
R6-Veröffentlichung behauptet. Tatsächliche Commit-/Run-/Hashwerte und öffentlicher
Readback werden nach dem Lauf separat hier ergänzt.

## Zielabnahme

[Bedienung und Testfolge](../../../docs/operations/TEST_R6_UPDATE_DE.md).
Pi-Update, reale ARM64-/systemd-Ausführung, Login, Neustart, Backup/Restore und
Anlage sind **OFFEN**. Veröffentlichung ist keine Anlagenfreigabe,
Produktionsfreigabe, unabhängige Zertifizierung oder CRA-Konformitätserklärung.
