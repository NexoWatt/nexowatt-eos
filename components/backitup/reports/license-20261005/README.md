# Backup: zentrale Lizenz und begrenzte Recovery

05.10.2026 · Ausgangscommit `4e171e4` · `iobroker.nexowatt-backup@1.0.10`
(Entwicklungsstand; keine Paketveröffentlichung).

## Änderung und Sicherheitsgrenzen

- Kanonischer Client 1.0.2 einschließlich Plattformprüfung und TS-Deklarationen
  lokal mitgeliefert. Home/Pro-Entitlement über `eos-admin.0`, Feature `energy`.
  Kein Adapter-Lizenzschlüssel oder unabhängiger Lizenzserver.
- Startup, Nachrichten, State-Trigger, Zeitpläne, Slave-Aufträge, direkte
  Backup-/Restoreadmission und HTTP-Dateiverwaltung prüfen zentrale Freigabe.
  Verlust stoppt neue Arbeit und Token-Erneuerung; begonnene Archive dürfen
  abschließen. Aktivierung/Erneuerung wird automatisch und single-flight übernommen.
- Inplace-Entschlüsselung der alten Eventkonfiguration erfolgt nur einmal pro
  Prozess, damit Wiederaktivierung bestehende Zielpasswörter nicht erneut XORt.
- Der getrennte Restore benötigt eine private einmalige HMAC-Freigabe, bindet
  Archivinhalt, Restoretyp, Konfiguration und zehnminütige Startfrist. Direktes
  `restore(null, ...)`, reine JSON-Datei, Manipulation, Wiederholung und Ablauf
  werden verweigert. Der Schlüssel steht niemals in systemd-Properties/argv.
- **Native EOS-Systemrestores werden vor Download/Staging/Stop ausdrücklich
  mit `EOS_OPERATOR_RECOVERY_REQUIRED` abgewiesen.** Der vorhandene historische
  sudo/systemd-Launcher entspricht keinem freigegebenen EOS-Hostkoordinator.
  Ein geschützter Host-Recoveryweg ist nötig; diese Änderung fügt keine Rechte
  hinzu. Datenrestores ohne Controller-Stopp sowie Backup/Download bleiben.
- EOS-Profil und Redis-/TLS-Konfiguration unverändert. Diese Prüfung weist keine
  Kompromittierungstrennung innerhalb derselben OS-/ioBroker-Identität nach.

## Tatsächliche Prüfungen

Umgebung: Linux x64, Node 24.19.0, gelockter TypeScript-Compiler 6.0.3.
Abhängigkeiten mit `npm ci --ignore-scripts --no-audit --no-fund` installiert;
kein Lockfile und keine Abhängigkeitsversion geändert.

| Befehl/Prüfung | Ergebnis | Rohbeleg |
| --- | --- | --- |
| `npm run build:backend` | Vollständige semantische Backendkompilierung bestanden | `build.log` |
| `node --test --test-reporter=tap test/license-guard.js` | 14 positive/negative Fälle bestanden | `license.tap` |
| `TZ=UTC node --test --test-reporter=tap --test-skip-pattern='Linux permissions: non-root process' test/eos-profile.js test/sd-card.js test/influxdb-cli.js test/sd-card-access.js` | 35 Fälle bestanden; unten genannter UID-Fall ausdrücklich nicht ausgeführt | `offline.tap` |
| `node scripts/validate-publish.cjs` | Releasepins inkl. neuer Client-/Recoverydateien bestanden | `publish.log` |
| `npm pack --dry-run --ignore-scripts --json` und explizite Dateiliste | Benötigte Clientdateien, Backendmodule, Anleitung und Lizenztest enthalten | `pack.json` |
| Lokaler Client gegen kanonischen Admin-Client | Alle vier Dateien bytegleich | `bindings.json` |
| `git diff --check` für diese Komponente | Bestanden | Kommando ohne Ausgabe |

Builddateien stammen aus `tsc -p tsconfig.build.json`. Die beiden historisch
getrackten R6-Module behalten ihre bytegleichen bestehenden Pins ohne Mapzeile;
der neue Helper enthält ebenfalls keinen Verweis auf nicht ausgelieferte Maps.
Die vorhandenen übrigen Buildpins bleiben unverändert, abgesehen von bewusst
geänderten main/restore/tokenRefresher. Nur geprüfte Änderungen und neue Dateien
wurden im Komponentenmanifest nachgeführt, keine historischen Lieferungspins.
`publish-before-manifest.log` dokumentiert erwartete Zwischenabweichungen vor
Wiederherstellung der unveränderten Map-Konvention und bewusster Neubindung.

## Offene Grenzen / manuelle Nachprüfung

- Bestehender realer Nicht-root-SD-Rechtefall blieb ausgeschlossen: Umgebung
  bildet nur UID 0 ab (historisch EINVAL bei chown); kein positiver Rechtebeleg.
- Pi/ARM, echte eos-admin-Lizenzaktivierung, systemd, vollständiger Restore,
  Dateiserver-Sitzungen und Anlagenbetrieb wurden nicht ausgeführt.
- EOS-nativer Systemrestore benötigt separat geprüfte Hostkoordinatorintegration.
  Status ist absichtliche Ablehnung, nicht erfolgreiche Recovery.
- Noch bestehende allgemeine Authentifizierungs-/Transportgrenzen der historischen
  Datei-/Restoreoberfläche und Fremdspeicher sind durch Lizenzprüfung nicht
  automatisch behoben. Kein unabhängiges Security-Audit/CRA-/IEC-Nachweis.
- Testanleitung und Rückfallhinweise: `docs/de/lizenzbetrieb.md`.

Dateihashes des tatsächlichen Prüflings: `bindings.json`. Kein Produktivrollout,
keine Produktionsfreigabe, kein Publish und kein Commit in diesem Teilauftrag.
