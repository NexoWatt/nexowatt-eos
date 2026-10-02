# NexoWatt EOS Backup – Integrationsprüfung

Prüfdatum: 30.09.2026. Quelle: `https://github.com/NexoWatt/nexowatt.backitup.git`, Zweig `master`, Commit `88dd860aa3c1a7a2fe1c025fa87e5cc2bcfa4b53`. Paket: `iobroker.nexowatt-backup` **1.0.10**. Nur dieser Gitstand wurde geprüft; eine installierte oder auf npm veröffentlichte Version ist damit nicht festgestellt. Produktdateien wurden nicht verändert.

## Ergebnis und Systemgrenze

Der Backup-Adapter muss als sicherheitsrelevante Systemkomponente integriert werden. Er hat Zugriff auf Sicherungen, Datenbankzugänge und die Wiederherstellung des Controllers. Der geprüfte Stand erfüllt die geplante EOS-Sicherheitsgrenze noch nicht: temporäre Datei-Server besitzen keine eigene Authentifizierung, Remote-Influx-HTTPS schaltet die Zertifikatsprüfung aus, das EOS-Zusatzprofil wird unverschlüsselt erstellt und der Restore setzt bisherige Hostrechte voraus. Zusätzlich fehlen zwei zum Start bzw. zur Influx-Sicherung benötigte Builddateien im eingecheckten Lieferbaum. Dies sind offene Integrations-/Freigabepunkte; eine CRA-/IEC-Konformität oder ein erfolgreicher RPi-Betrieb wird nicht bescheinigt.

Das Nutzerziel RPi 5, 8/16 GB RAM, SSD, „Linux 12 Lite“ wurde berücksichtigt. Distribution, 64-Bit-Architektur, Kernel, Firmware, Mountrechte und tatsächlich installierte Node-/Controllerstände wurden nicht am Gerät erhoben. RAM-Größe allein beweist weder Wiederherstellbarkeit noch ausreichende Ressourcenlimits.

## Komponenten und erhaltene Eigenschaften

- `package.json:1–6`: Node `>=22.0.0`. `io-package.json:219–228`: js-controller `>=7.0.7`, Admin `>=7.0.0`. `package.json` verlangt außerdem `@iobroker/js-controller-common ^7.2.2`. Paketbibliothek und laufender Controller sind getrennt zu inventarisieren.
- MIT-Lizenz im Paket und `LICENSE:1–21`; Copyright von simatec und NexoWatt erhalten. `NOTICE.md` nennt Upstream backitup 4.0.1, aber noch eigenen Stand 1.0.9; vor Release berichtigen. Keine Lizenzprüfung sämtlicher transitiver Komponenten ausgeführt.
- `package-lock.json`: Lockfile v3, Rootversion 1.0.10, 912 Package-Einträge einschließlich Root und Entwicklungsabhängigkeiten. Ein Lockfile ist kein Nachweis des installierten oder tatsächlich ausgelieferten Baums. Frontend-Lockfiles und gebündelte Assets sind zusätzlich relevant.
- `io-package.json:568–592` deklariert ausgewählte Passwörter/Tokens als `encryptedNative` und `protectedNative`. Das ist ein positiver Mechanismus des Controllers, aber keine unabhängige Isolation gegenüber kompromittierten Adaptern mit demselben Systemzugriff.
- `src/lib/influxDbCli.ts:90–141`: strukturierte Argumentlisten, Token über `INFLUX_TOKEN` statt im argv. Ein Umgebungswert ist nicht automatisch vor Prozessen desselben Benutzers geschützt.
- `src/lib/scripts/11-nexowattEOS.ts:103,187–209`: private Staging-/Manifest-/Archivberechtigungen, SHA-256-Prüfsummen; Vendor-Secret im Standard ausgeschlossen (`io-package.json:566`). Prüfsummen schützen allein nicht gegen einen Angreifer, der Archiv und Prüfsummen gemeinsam ersetzt.
- UI, Übersetzungen, bestehende Backupziele, Datenpunkte und Restoreabläufe sind zu erhalten bzw. mit dokumentierter Sicherheitsmigration umzustellen. Das Review ändert diese Funktionen nicht.

## Befunde

### NW-EOS-INT-BAK-001 – Datei- und Fortschrittsserver ohne eigene Zugriffskontrolle (P1)

**Beleg:** `src/main.ts:2217–2245,2276–2322` erstellt Download-/Uploadserver, registriert nur statische Dateien bzw. CORS und Uploadroute und ruft `listen(port)` ohne Hostbindung auf. HTTP ist neben HTTPS möglich. Multer erhält nur `storage`, keine expliziten Größen-/Dateizahllimits. Der übermittelte Originalname wird übernommen. `src/lib/restore.ts:486–531` stellt Fortschritts-/Logdaten auf Port 8091 ebenfalls ohne eigene Authentifizierung bereit. Aufrufpfade: `src/main.ts:292–359`; im gezeigten Nachrichtenhandler ist keine zusätzliche Benutzer-/Rollenprüfung vor diesen Fällen vorhanden.

**Angriffsbedingungen:** Ein Datei-/Restorevorgang muss den Server gestartet haben und der betreffende Port muss erreichbar sein. Die tatsächliche Firewall und vorgelagerte ioBroker-Nachrichtenberechtigung wurden nicht geprüft. Ein zufälliger Port ist keine Zugriffsberechtigung. Die HTTPS-Variante besitzt nur Serverzertifikate; mTLS ist nicht konfiguriert.

**Auswirkung:** Möglicher unberechtigter Abruf von bekannten Backupnamen, Dateiablage/Überschreiben im Backupverzeichnis, Ressourcenerschöpfung sowie Offenlegung von Restorelogs. Kein Liveangriff, kein nachgewiesener Archive-Traversal oder fremder Hostzugriff.

**Maßnahme:** Dateien über eine authentifizierte, rollenberechtigte EOS-API streamen; Restorefreigabe gesondert prüfen. Falls ein separater Worker nötig ist: private Bindung, streng befristete und zweckgebundene Berechtigung, erwartete Datei-ID statt Clientpfad, Größen-/Zeit-/Parallelitätsgrenzen und exklusive Anlage. TLS/mTLS passend zur internen Grenze. Tests: anonym/abgelaufen/falsche Rolle/falsche Datei ablehnen, Abbruch bereinigen, Ressourcenlimits prüfen.

### NW-EOS-INT-BAK-002 – Remote-InfluxDB-HTTPS deaktiviert Zertifikatsprüfung (P1)

**Beleg:** `src/lib/influxDbCli.ts:96–105,123–132` ergänzt `--skip-verify` bei jedem Remote-HTTPS-Backup/Restore. `test/influxdb-cli.js:56–72` erwartet diesen unsicheren Parameter ausdrücklich. Zwei isolierte Aufrufe der originalen TS-Funktionen reproduzieren das Verhalten.

**Angriffsbedingungen/Auswirkung:** Aktivierte entfernte InfluxDB 2.x mit HTTPS plus Netzwerkangreifer oder manipulierte Gegenstelle. Schutz vor gefälschten Gegenstellen entfällt; privilegierte Datenbanktokens und Backups sind betroffen. Kein Nachweis eines erfolgten MITM.

**Maßnahme:** Zwangsweises Überspringen entfernen; definierte CA-/Zertifikatskonfiguration verwenden. Migration für bisher selbstsignierte Gegenstellen vorbereiten, Fehler geschlossen behandeln. Regressionstest muss `--skip-verify` verbieten und einen ungültigen Server im isolierten TLS-Integrationstest zurückweisen. Lokale Influx-Funktion erhalten.

### NW-EOS-INT-BAK-003 – EOS-Zusatzprofil unverschlüsselt, Integrität nicht authentifiziert (P1 bei Geheimnisaufnahme, sonst P2)

**Beleg:** `src/lib/scripts/11-nexowattEOS.ts:118–140,185–210` kennzeichnet `archiveEncrypted:false`, nimmt ein Vendor-Secret nach Opt-in auf und erstellt tar.gz plus SHA-256-Prüfsummen. `src/lib/targz.ts:60–65` enthält nur Packen/Komprimieren. Standard-ioBroker-Backups werden separat dem js-controller übergeben (`src/lib/scripts/10-iobroker.ts:49–56`); dessen Verschlüsselungs- und Schlüsselverhalten ist gesondert zu prüfen.

**Auswirkung:** Wer eine solche unverschlüsselte Sicherung erhält, kann ihren Inhalt lesen. Eine Prüfsumme im selben Lieferbereich verhindert keine gezielte gemeinsame Manipulation. Kein pauschales Urteil über bisherige Kundensicherungen oder den unbekannten Controllerstand.

**Maßnahme:** Versioniertes authentifiziert verschlüsseltes Archivformat für sensible Sicherungen, geschützte Schlüsselverwaltung und dokumentierte Wiederherstellung auf Ersatzhardware. Schlüssel nicht ungeschützt neben dem Archiv ablegen. Private Lizenz-Ausstellerschlüssel grundsätzlich nicht ins Gerät/Backup aufnehmen; Lizenz- und Gerätezertifikatsmigration unterscheiden. Alte Sicherungen nur nach expliziter, protokollierter Migration übernehmen. Tests für falschen Schlüssel, Tagmanipulation, abgeschnittene Datei, Ersatzgerät und Schlüsselverlust.

### NW-EOS-INT-BAK-004 – Restore-/Mountrechte passen nicht zur minimalen EOS-Laufzeit (P1)

**Beleg:** `src/main.ts:1665–1688` schreibt Start-/Stop-/Restore-Shellskripte in das Datenverzeichnis und fordert `sudo systemd-run --uid=iobroker bash …` an. Der gestartete Prozess ist hier ausdrücklich **iobroker**, nicht automatisch root. `src/lib/scripts/01-mount.ts:234–248,284–309` und `src/lib/list/cifs.ts:315–365` bauen Shellkommandos aus Konfigurationswerten; Expert-Mount führt eine konfigurierte Befehlszeile aus. CIFS fordert `file_mode=0777,dir_mode=0777`, übergibt Zugangsdaten im Kommando und fällt bei Fehler auf eine Variante ohne vorgegebene SMB-Version zurück.

**Auswirkung:** Der gehärtete Installer erlaubt bewusst kein allgemeines `systemd-run` oder freie Mount-/Shellrechte. Der jetzige Restore kann deshalb funktional ausfallen. Bei einem privilegierten breiten Sudoers-Profil vergrößern konfigurierbare Kommandos die Angriffsfläche. Eine vollständige Root-Eskalation wurde nicht reproduziert; Sudoers/Hostkonfiguration fehlen.

**Maßnahme:** Restore als eigener, begrenzter Dienst mit festen Aktionen und geprüftem Archiv-/Zielmanifest entwerfen; Mounts durch das Betriebssystem vorab einrichten. Adapter erhält keinen allgemeinen sudo-Befehl und kein frei beschreibbares privilegiertes Skript. Betrieblich geordnete Controllerpause und Wiederanlauf testen. Bestehende externe Ziele über freigegebene Profile migrieren.

### NW-EOS-INT-BAK-005 – Legacy-Geheimnisverarbeitung und temporäre Klartextkonfiguration (P2)

**Beleg:** `src/main.ts:64–69,2087–2108` verwendet für CCU/MySQL/PostgreSQL-Mehrfachziele wiederholtes XOR mit dem Systemsecret. `src/main.ts:2405–2410` besitzt einen eingebauten Ersatzwert bei fehlendem Systemsecret; dessen Inhalt wird hier nicht wiedergegeben. `src/lib/restore.ts:426–433` schreibt die aufgelöste Restorekonfiguration als JSON ohne expliziten Dateimodus. Je Backup-Typ kann diese Konfiguration Zugangsdaten enthalten; effektive Rechte hängen vom umask und Verzeichnis ab.

**Maßnahme:** Legacywerte versioniert in einen aktuellen geschützten Secretstore migrieren, keine gemeinsame Fallbackkonstante verwenden. Fehlendes Secret als Konfigurationsfehler behandeln. Temporäre Dateien atomar, restriktiv und mit definierter Lebensdauer erzeugen; nach Erfolg/Fehler entfernen. Der Restoreworker erhält nur benötigte Secrets. OAuth-JSON-Felder/-States und Zertifikatskopien gesondert prüfen; hier keine vollständige Secret-Abdeckung bescheinigt.

### NW-EOS-INT-BAK-006 – Build-Lieferbaum unvollständig (P1, funktionaler Freigabeblocker)

**Beleg:** `build/lib/sdCard.js` und `build/lib/influxDbCli.js` fehlen. Referenzen bestehen u. a. in `build/main.js` und `build/lib/scripts/12-influxDB.js`; `release-manifest.json` führt beide auf. Der vorhandene read-only Publish-Validator meldet diese fehlenden Dateien und endet mit **Exit 1**. Von 129 Manifest-Dateien fehlen genau diese zwei.

**Maßnahme:** Einen frischen nachvollziehbaren Build aus dem zugehörigen Quellstand erzeugen, Artefakte gegen Manifest prüfen und die Offline-/Starttests ausführen. Keine fehlenden Dateien aus unbekannten ZIP-Versionen hineinmischen. Die Gitquelle ist in dieser Form kein direkt freigegebenes vorgebautes Installationspaket; ein tatsächlich veröffentlichtes Paket wurde nicht geprüft.

## Weitere Konfigurationsrisiken

`io-package.json:405–415` deaktiviert FTP standardmäßig, hat aber `ftpSecure:false`; beim Aktivieren bleibt unverschlüsseltes FTP möglich. WebDAV kann Zertifikatsprüfung abschalten (`src/lib/list/webdav.ts:133,214`); beim FTP-Code bleibt sie bei aktiviertem TLS dagegen durch `!!flag || true` effektiv an (`src/lib/list/ftp.ts:122–129`). NFS und Feldprotokolle sind keine TLS-Verbindungen. Im EOS-Profil freigegebene Ziele/Protokolle definieren und unsichere Konfigurationen nachvollziehbar migrieren. Cloudziele sind vorhanden, aber standardmäßig deaktiviert; sie begründen keine notwendige Cloudabhängigkeit für EOS.

## Tatsächlich ausgeführte Prüfungen

1. Shallow Clone, Commitabgleich und statischer Quellreview; kein npm-Lifecycle, kein Build, kein Dienststart, keine Host-Mount-/sudo-Aktion.
2. `node scripts/validate-publish.cjs`: **fehlgeschlagen, Exit 1**, wegen fehlender Builddateien; Rohbeleg `publish-validator.log`.
3. Erster isolierter Reprolauf gegen die fehlende kompilierte Influx-Datei: **fehlgeschlagen, MODULE_NOT_FOUND**; Rohbeleg `initial-missing-build.tap`.
4. Anpassung des Prüfgerüsts auf originales `src/lib/influxDbCli.ts` mittels Type-Stripping unter **Node v24.19.0** und isolierte VM-Ausführung der eingecheckten Datei-Servermethoden mit vollständig ersetzten HTTP/Express/Multer-Abhängigkeiten. **6 Prüfassertionen bestanden**: zwei bestätigen den TLS-Fehler, drei die Serverkonfiguration, eine kontrolliert den erhaltenen argv-Geheimnisschutz. Das sind Befundreproduktionen/Mockprüfungen, keine bestandenen Sicherheitstests des Produkts. Keine tatsächliche Netzwerkverbindung oder Dateiübertragung. Rohbelege `reproduce.cjs`, `reproduce.tap`.
5. Gitquelle nach Prüfung unverändert. Keine RPi-/Admin-/Controller-/Hardwarewiederherstellung, Penetrationstests oder vollständige Abhängigkeitsprüfung ausgeführt.

Arbeitsbelege liegen während der Integration unter `/workspace/scratch/6383b3161c96/audit/backitup-review/`; ihre Übernahme ins System-Prüfpaket wird im übergeordneten Integrationsbericht geführt. Befunde, Quellhashes und Nachprüfplan stehen zusätzlich in `system/integration/backitup-observations.json`.

## Priorisierter Integrationsplan

1. **Reproduzierbaren Quellen-/Buildstand herstellen:** fehlende Artefakte, Paketprüfung, Controller/Admin/Node-Kompatibilitätsmatrix, Lockfile-/Bundle-SBOM. Noch keine Freigabe aus einem grünen Build ableiten.
2. **Sofortige Vertrauensgrenzen:** Datei-API autorisieren/begrenzen, Remote-Influx-Zertifikatsprüfung erzwingen, unsichere Netzwerkziele standardmäßig sperren und Migration dokumentieren.
3. **Sicherung/Secrets:** authentifiziert verschlüsselte Sicherungen, Wiederherstellungsschlüssel und Legacy-Secret-Migration; alte Backupformate lesbar halten, aber nicht still als vertrauenswürdig akzeptieren.
4. **Controller-Restore und Hostrechte:** begrenzter Restoreworker; keine breite Sudoers-Ausnahme als Reparatur. Archivtyp-/Größen-/Pfad-/Link-/Authentizitätsprüfung, SSD-Freiraum, Schreibabbruch, Rollback und Startreihenfolge prüfen. Bestehende js-controller-Wiederherstellungssemantik explizit einbeziehen.
5. **RPi 5 8/16 GB + SSD:** vollständigen Wiederanlauf mit Admin, UI, Devices, EEBUS/OCPP und Datenbanken testen; Kommunikation-/Stromverlust nur auf isoliertem Testgerät. Restorekonsistenz, Regelfunktionen und Lizenzzustand auf derselben und Ersatzhardware nachweisen. Die Energieanlage benötigt ein gerätespezifisches sicheres Verhalten während der Wartung.

CRA-/IEC-Zuordnung bleibt an das System-Bedrohungsmodell, die überprüfte Produktabgrenzung und die nachgewiesenen Tests gebunden. Der vorliegende Bericht liefert komponentenspezifische Belege und offene Maßnahmen, keine Erklärung vollständiger Normerfüllung.
