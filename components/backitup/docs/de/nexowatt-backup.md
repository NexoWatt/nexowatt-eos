# NexoWatt EOS Backup

## Sicherungsumfang

NexoWatt EOS Backup erstellt weiterhin das vollständige ioBroker-Systemarchiv. Dieses Archiv ist der maßgebliche Wiederherstellungspunkt für Objekte, Zustände, Benutzerdateien, Skripte und Adapterkonfigurationen.

Zusätzlich erzeugt der Adapter je Lauf ein `nexowattEOS_…_backupconfig.tar.gz`-Systemprofil. Es enthält:

- ein versionsgebundenes EOS-Manifest,
- eine vollständige Adapter- und Instanzübersicht,
- eine gesonderte Übersicht der EOS-Kernkomponenten,
- SHA-256-Prüfsummen,
- optional die öffentliche Vendor-Konfiguration außerhalb der ioBroker-Datenbank.

Das Systemprofil wird zusammen mit den übrigen Archiven auf alle aktivierten Speicherziele übertragen und unterliegt derselben Aufbewahrungslogik.

## SD-Karte als Speicherziel

Wenn das EOS-System auf SSD oder eMMC installiert ist, kann eine separat unter Linux eingebundene SD-Karte als Sicherungsziel ausgewählt werden:

1. Unter **Speicherorte** die Option **NAS / SD-Karte / Kopieren** aktivieren.
2. Unter **Extra-Einstellungen** den Verbindungstyp **SD-Karte** wählen.
3. Die erkannte, eingebundene Karte auswählen.
4. Den relativen Unterordner festlegen; Standard ist `nexowatt-eos-backups`.
5. Mit **SD-Karten-Ziel prüfen** die Einbindung, Schreibrechte und den freien Speicher kontrollieren.

Der Adapter bietet nur eigenständig eingebundene und beschreibbare SD-Karten beziehungsweise entfernbare Kartenleser an. Der aktive SSD-/eMMC-Systemdatenträger und geschützte System-Einhängepunkte werden ausgeschlossen. Vor Beginn des Sicherungslaufs und nochmals direkt vor dem Kopieren werden Einhängepunkt, Blockgerät, Lese-/Schreibmodus und Schreibzugriff geprüft. Fehlt die Karte, ist sie nicht eingebunden, schreibgeschützt oder nicht beschreibbar, wird der Lauf mit einer Fehlermeldung abgebrochen. Es gibt ausdrücklich keinen stillen Fallback auf den Systemdatenträger.

Die Karte muss durch das Linux-System dauerhaft eingebunden werden, beispielsweise über eine UUID in `/etc/fstab`. Der Adapter formatiert oder mountet Datenträger nicht selbst.

Die Sicherungs-Engine erzeugt ihre Arbeitsarchive weiterhin zunächst im lokalen EOS-Backupverzeichnis und kopiert sie anschließend auf das geprüfte SD-Ziel. Die lokale Aufbewahrung bleibt von der SD-Karten-Rotation getrennt und folgt den normalen Adaptereinstellungen.

### InfluxDB-Aufbewahrung auf der SD-Karte

Nach erfolgreicher Übertragung einer InfluxDB-Sicherung wird die SD-Karte automatisch bereinigt. Je konfiguriertem InfluxDB-Ziel bleiben ausschließlich die neuesten drei vollständigen Archive erhalten. Ab der vierten Sicherung wird jeweils die älteste Generation gelöscht. Erst nach erfolgreichem Kopieren wird gelöscht; schlägt Kopieren oder Rotation fehl, wird der Sicherungslauf als fehlerhaft beendet. Die normale Aufbewahrungsregel anderer Sicherungsarten bleibt unverändert.

## Datenbanken

Für eine vollständige EOS-Sicherung müssen InfluxDB und Redis entsprechend der tatsächlichen Installation aktiviert und geprüft werden. Ein ioBroker-Archiv ersetzt keinen InfluxDB-Dump und keine Redis-Sicherung.

### InfluxDB 2 richtig konfigurieren

- Unter **Name der InfluxDB-Datenbank / des Buckets** wird der Bucketname eingetragen, beispielsweise `NexoWatt`.
- Unter **InfluxDB Datenbanktoken** wird ein Token mit ausreichenden Sicherungsrechten hinterlegt. Der Wert wird verschlüsselt gespeichert und nach dem erneuten Öffnen der Einstellungen absichtlich nicht im Klartext angezeigt. Das unveränderte Feld behält den gespeicherten Token bei.
- **Pfad zur InfluxDB-CLI (optional)** ist ausschließlich für die ausführbare Datei bestimmt. Normalerweise bleibt das Feld leer; dann wird für InfluxDB 2 `influx` und für InfluxDB 1 `influxd` verwendet. Nur bei Bedarf darf ein absoluter Pfad wie `/usr/bin/influx` eingetragen werden. Ein Bucketname oder Verzeichnis wie `NexoWatt_Historie` gehört nicht in dieses Feld.
- Der Adapter übergibt den InfluxDB-2-Token über die Umgebungsvariable `INFLUX_TOKEN`; er erscheint nicht in der Prozessbefehlszeile.

Fehlt die passende InfluxDB-CLI auf dem EOS-System, meldet der Adapter den fehlenden Programmnamen und fordert zur Installation beziehungsweise zur Angabe des absoluten Pfads auf.

## Sicherheit

Die Archive sind komprimiert, aber nicht verschlüsselt. `/opt/iobroker/iob-vendor-secret.json` ist deshalb standardmäßig ausgeschlossen. Die Option darf nur bei geschützten Transport- und Speicherwegen aktiviert werden.

## Wiederherstellung

1. Prüfsummen und Verfügbarkeit aller Archive kontrollieren.
2. Zuerst das reguläre ioBroker-Archiv über den geerbten Wiederherstellungsablauf einspielen.
3. Datenbank-Sicherungen passend zur Installation wiederherstellen.
4. Das EOS-Systemprofil als Prüf- und Rekonstruktionshilfe auswerten.
5. Adapterversionen, Vendor-Konfiguration, Schnittstellen und EOS-Regelbetrieb kontrollieren.

Vor dem produktiven Einsatz ist mindestens eine vollständige Wiederherstellungsprobe auf einem Testcontroller erforderlich.
