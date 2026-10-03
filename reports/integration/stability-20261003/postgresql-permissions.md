# EOS-STAB-20261003-01: PostgreSQL-Verzeichnisrechte

Die sichere Root-Startvorlage setzt `umask 077`. Der bisherige Aufruf
`mkdirSync(directory, {mode: 0755})` ergibt dabei auf dem tatsächlichen Linux-
Dateisystem Modus 0700. `eos-postgres` kann den root-eigenen Ordner nicht betreten;
die spätere Freigabe allein von `server.key` mit root:eos-postgres/0640 genügt nicht.

Korrektur: `runtime/postgresql/host.cjs` setzt den neu angelegten öffentlichen
Konfigurationsordner ausdrücklich auf 0755. Eigentum, Unveränderbarkeit durch
Dienstkonten und die privaten Schlüsselrechte bleiben erhalten. Die vorhandene
Prüfung eines frischen, root-kontrollierten Pfads bleibt Pflicht.

Neue Regression `tests/postgresql/provision-permissions.test.cjs`:
zwei bestandene Fälle unter umask 022/077. Tatsächliche temporäre Dateien,
OpenSSL-Schlüssel/-Zertifikate und POSIX-Modi wurden geprüft; UID und geschützte
Vorfahrpfade werden für den unprivilegierten CI-Runner modelliert. Die Prüfung
erzeugt keinen Cluster, keine Benutzer und keine Dienste. Alle temporären
Schlüssel werden nach dem Test gelöscht.

Geprüft: Verzeichnis 0755; CA-Unterordner 0700; CA-/Client-/Server-Quellschlüssel
und Datenbankfragment 0600; öffentliche Konfiguration und Zertifikate 0644.
Rohbeleg `raw/pg-provision-permissions.tap`, Linux x64, Node 24.19.0, 2/2 bestanden.
Der erste Sandboxversuch konnte OpenSSL-Unterprozesse nicht starten; der
erlaubte Nachlauf bestand. Native eos-postgres-/systemd-/ARM64-Abnahme bleibt offen.

Keine zusätzlichen Pakete oder Kryptoverfahren; die neue Quellfassung muss im
neu signierten R4-Payload und dessen Inventar/SBOM-Bindung erscheinen. Eine bloße
Quelländerung korrigiert die alten signierten R3-Archive nicht.
