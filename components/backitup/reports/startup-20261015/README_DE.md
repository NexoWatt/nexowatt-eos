# Backup: EOS-Start und private Archivpfade

Stand: 15.10.2026. Ausgangscommit `e4616fec2a56cd7c6c013df090bdda00a0c37f54`;
Komponente `iobroker.nexowatt-backup@1.0.10`, Quellkorrektur für den nächsten
signierten EOS-Teststand. Keine eigenständige npm-Veröffentlichung und keine
Änderung bereits signierter R9-Artefakte.

## Korrekturen

- `info.runtimeState` ist ein nichtgeheimer read-only Status mit
  `waiting_license`, `starting`, `ready`, `error`, `stopped`. Lizenzierter
  Startfehler darf trotz lebendem Prozess nicht als bereit gelten. Ready folgt
  kompletter Initialisierung; Start-/Statuspromises werden vor Unload abgewartet,
  Stoppsignale verhindern neue Schritte, der finale Status ist `stopped`.
- `globalDependencies` nennt den tatsächlich vorhandenen `eos-admin >=7.0.0`.
  Der tatsächliche R9-Controller prüft globale Abhängigkeiten ohne `admin`-Alias.
- Fehlende Repository-/Icon-Metadaten und widersprüchliche Lizenz-Metadaten
  korrigiert: eindeutiger Verweis auf dieselbe unveränderte `LICENSE`-Datei,
  kein Wechsel von Nutzungsrechten. Sieben vorher scheiternde Paketprüfungen
  laufen danach erfolgreich; keine Tests entfernt.
- Das vom Controller pro Host erzeugte Hex-Geheimnis ist Pflicht. Fehlende,
  typfalsche, leere, überlange oder nicht-hexadezimale Werte werden vor
  Dateizugriffen mit `EOS_BACKUP_SYSTEM_SECRET_INVALID` abgelehnt. Kein geteilter
  Fallback. Der tatsächliche Controller erzeugt 24 zufällige Bytes als Hex;
  der Validator akzeptiert 16 bis 64 Bytes, ohne das Geheimnis zu protokollieren.
- Backup, lokale Liste, Download/Upload-Staging und Datenrestore benutzen
  `<IOBROKER_DATA_DIR>/nexowatt-backup/backups`. Die beiden eigenen Verzeichnisse
  werden mit 0700 erzeugt; Symlinks, fremde Eigentümer und öffentliche Rechte
  werden abgewiesen. Kein chmod/chown am Elternverzeichnis und keine neue
  systemd-Schreibfreigabe. Vorhandene Archive außerhalb dieses Pfades bleiben
  unverändert; eine Bestandsmigration muss ausdrücklich erfolgen.
- Start erzeugt keine alten `sudo systemd-run --uid=iobroker`-Shellskripte mehr.
  Vorhandene Recoveryjournale werden nicht ausgeführt oder gelöscht. Der
  getrennte Systemrestore bleibt vor Download/Staging gesperrt und verlangt
  `EOS_OPERATOR_RECOVERY_REQUIRED`; erlaubte Datenrestores behalten ihre Lizenzprüfung.
- Der Controller-CLI-Archivschritt meldet erst nach Exit 0 plus nichtleerem
  regulärem Archiv Erfolg. Ein Fehler, leeres oder fehlendes Archiv taucht nicht
  mehr in `done`, `types` oder erfolgreichen Dateilisten auf.
- Reviewnachbesserung: Vorhandene Archivziele (auch defekte Symlinks) scheitern
  vor dem Kindprozess mit `EOS_BACKUP_TARGET_EXISTS`. Kein Überschreiben/Löschen.
  Logdateien werden mit `O_NOFOLLOW|O_NONBLOCK` geöffnet und am Deskriptor auf
  regulären Typ, Dienstbenutzer, private Rechte, genau einen Link und maximal
  8 MiB geprüft. Unsichere Altlogs gelangen weder in Logs noch `output.line`;
  nur `EOS_BACKUP_LOG_UNSAFE` wird gemeldet. Keine Isolation gegen denselben UID.

## Tatsächliche Prüfungen

Linux x64, Node 24.19.0, gelockter TypeScript-Compiler 6.0.3. Abhängigkeiten mit
`npm ci --ignore-scripts --no-audit --no-fund`; Lockdatei unverändert. Keine
Aussage über den qualifizierten Node-24.21.0-Pi-Lauf aus dieser lokalen Prüfung.

| Prüfung | Tatsächliches Ergebnis |
| --- | --- |
| `npm run build:backend` | Vollständige semantische Kompilierung bestanden |
| Volles Offline-Gate, `offline-full.tap` | 73 bestanden, 1 Umgebungsfehler: bestehender realer SD-UID-Test kann hier `chown` auf UID 65534 nicht ausführen (`EINVAL`) |
| Exakter Ausschluss dieses einzelnen UID-Tests, `offline-scoped.tap` | 73 bestanden; ausgeschlossen bedeutet ausdrücklich nicht bestanden |
| Neue Start-/Pfad-/Geheimnis-/Log-/Readinesstests | 17 bestanden, tatsächliche temporäre Dateien; Adapter-/DB-/Zeitplanumgebung kontrollierte Testdoubles. Enthält Startfehler, Lizenzwechsel und vier asynchrone Shutdown-/Statewrite-Barrieren |
| Neue CLI-Ergebnistests | 4 Szenarien mit realem Node-Kindprozess (synthetisches CLI, kein Controllerbackup) sowie 2 bestehende Ziele ohne Kindprozess |
| Neue Abhängigkeitsprüfung | Tatsächlicher Instanzname `eos-admin` nachgewiesen |
| Vorhandene Lizenz-/Recoverytests | 14 positive/negative Fälle bestanden |
| `git diff --check` | Bestanden |
| `npm run test:package` | 78 bestanden, `package-types-unit.log` |
| `npm run test:types` | 3 bestanden, `package-types-unit.log` |
| `npm run test:unit` | Nur 1 historischer DEPRECATED-Platzhalter; kein zusätzlicher Funktionsnachweis |
| `node scripts/prepare-publish.cjs` | Nur 73 in diesem Build erzeugte, nicht ausgelieferte `.map`-Dateien entfernt |
| `node scripts/validate-publish.cjs` | 141 kontrollierte Dateien hashgeprüft; `publish-validation.log` |
| `npm pack --dry-run --ignore-scripts --json` | 143 Paketdateien; neue Start-/Archivtests und synthetisches Kindprozessfixture enthalten; nichts veröffentlicht |

Offline-Befehl: `TZ=UTC node --test --test-reporter=tap test/eos-profile.js
test/sd-card.js test/influxdb-cli.js test/sd-card-access.js test/license-guard.js
test/eos-startup.js test/backup-archive-result.js`. Der begrenzte Wiederholungslauf
ergänzt ausschließlich `--test-skip-pattern='Linux permissions: non-root process'`.
Diese Ausnahme wurde nicht in Produktcode, npm-Skripte oder CI aufgenommen.

Ausgaben unter `build/` stammen aus dem vorhandenen TypeScript-Build. Nur bei
Dateien, die bereits vorher ohne SourceMap-Kommentar ausgeliefert wurden, wird
der nicht ausgelieferte Mapverweis entfernt; keine fremden Codeänderungen oder
ungetesteten Dateien werden pauschal neu versiegelt.

## Offene Integrationsgrenzen / Testanleitung

1. Der tatsächliche Controllerbackup verwendete im R9-Paket `controllerDir/tmp`
   und `controllerDir/backups`; beide liegen im unveränderlichen Appbaum. Eine
   gesonderte quellen-/hashgebundene Controllerkorrektur und echter Archivlauf
   sind erforderlich. Diese Komponentenkorrektur allein beweist keinen vollständigen Backup.
2. Native PostgreSQL-/Geräte-CA-/Schlüssel-/Systemwiederherstellung und ein
   abgesicherter Host-Recoverykoordinator sind weiterhin offen. Das zusätzliche
   EOS-Profil ist unverschlüsselt und kein Ersatz für ein vollständiges Restoreabbild.
3. Die historische Dateioberfläche ist mit der zentralen Lizenzprüfung nicht
   automatisch mit einem Benutzersitzungsschutz versehen. Keine Defaultlistener
   wurden hier aktiviert. Authentifizierung und geschützter Transport müssen
   gesondert bewertet werden; auch Fremdspeicher erhalten dadurch keine Freigabe.
4. Nach Installation des vollständig geprüften Folgepakets: Lizenzstatus prüfen,
   Backup-Instanz starten, privaten Pfad und fehlende Privilegien bestätigen,
   einen manuellen Archivlauf ausführen und dessen Inhalt/Wiederherstellung auf
   getrennter Umgebung abnehmen. Pi/systemd, echter Archivlauf und Restore wurden
   in diesem Komponentenauftrag nicht ausgeführt.

Die Korrektur ist ein begrenzter Start-/Ergebnisnachweis. Keine vollständige
CRA-/IEC-Konformität, Fehlerfreiheit oder Produktionsfreigabe.
