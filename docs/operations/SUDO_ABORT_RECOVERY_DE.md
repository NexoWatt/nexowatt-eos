# Test-Pi nach dem Sudo-Abbruch weiter installieren

Stand: 03.10.2026. Nur für den diagnostizierten Abbruch der Lieferrevision 2
mit `PG_SUDO_POLICY_REJECTED`, noch ohne eingerichtete EOS-Dienste oder Daten.
Der normale Installationsbefehl in der README bleibt für frische Systeme.

Der folgende Einstieg prüft den vollständigen Restzustand erneut auf dem Pi.
Er akzeptiert ausschließlich die bekannte R2-Bereitstellung und das gesperrte
Dienstkonto `eos-runtime` mit UID 999 und GID 985. Andere Versionen,
vorhandene Daten, Dienste, PostgreSQL-Cluster, veränderte Dateien oder andere
Kontozuordnungen führen vor der Wiederherstellung zum Abbruch.

Bei passendem Zustand wird der alte Dateibaum in ein neues, nur für root
zugängliches Quarantäneverzeichnis unter `/opt/nexowatt` verschoben. Konto
und Gruppe werden in `eos-aborted-runtime` umbenannt; UID, GID und
Dateieigentümer bleiben erhalten. Die alte Bereitstellung und die bisherigen
Fehlernachweise werden nicht gelöscht. Node, PostgreSQL-Pakete und deren
Cluster-Voreinstellung bleiben erhalten.

1. In PuTTY auf dem betroffenen Pi anmelden und `sudo -i` ausführen.
2. Den gesamten folgenden Block kopieren und einfügen. Den GitHub-Token
   erst bei der verdeckten Abfrage eingeben und Enter drücken.
3. Nach erfolgreicher Prüfung und Quarantäne startet automatisch der
   unveränderte Installer **Revision 3**. Nach dessen Abschluss die im
   Terminal angezeigte HTTPS-Adresse für die Ersteinrichtung verwenden.

<!-- EOS_SUDO_RECOVERY_COMMAND_START -->
```bash
/bin/bash <<'EOS_INSTALL'
# EOS_GITHUB_BOOTSTRAP_VERSION=2026-10-03
# EOS_SUDO_ABORT_RECOVERY_VERSION=2026-10-03
set +x
set -euo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin LC_ALL=C
umask 077
[[ $EUID -eq 0 ]] || { echo 'EOS: Bitte zuerst sudo -i ausfuehren.' >&2; exit 1; }
[[ -x /usr/bin/curl && -x /usr/bin/python3 ]] || { echo 'EOS: curl und python3 werden im Basisabbild benoetigt.' >&2; exit 1; }
[[ -d /root && ! -L /root && $(/usr/bin/stat -c %u /root) == 0 ]] || exit 1
(( (8#$(/usr/bin/stat -c %a /root) & 0022) == 0 )) || exit 1
set +a
unset eos_token
read -r -s -p 'GitHub-Token: ' eos_token </dev/tty
printf '\n' >/dev/tty
[[ $eos_token =~ ^[A-Za-z0-9_]{20,512}$ ]] || { echo 'EOS: Tokenformat ungueltig.' >&2; exit 1; }
eos_stage=$(/usr/bin/mktemp -d /root/eos-download-XXXXXXXX)
printf 'header = "Authorization: Bearer %s"\n' "$eos_token" | /usr/bin/env -i PATH="$PATH" LC_ALL=C /usr/bin/curl -q --config - --proto =https --tlsv1.2 --fail --silent --show-error --connect-timeout 20 --max-time 120 --max-filesize 14631 --header 'Accept: application/vnd.github.raw+json' --header 'X-GitHub-Api-Version: 2022-11-28' 'https://api.github.com/repos/NexoWatt/nexowatt-eos/git/blobs/ea168948332e365f59c1798a79d8439863b8e098' -o "$eos_stage/github-download.py"
printf '%s  %s\n' '89194c388e023bad6dca7347a132d24f45927d3710a635cf7ba9e4ea491177c6' "$eos_stage/github-download.py" | /usr/bin/sha256sum --check --status
printf 'header = "Authorization: Bearer %s"\n' "$eos_token" | /usr/bin/env -i PATH="$PATH" LC_ALL=C /usr/bin/curl -q --config - --proto =https --tlsv1.2 --fail --silent --show-error --connect-timeout 20 --max-time 120 --max-filesize 22129 --header 'Accept: application/vnd.github.raw+json' --header 'X-GitHub-Api-Version: 2022-11-28' 'https://api.github.com/repos/NexoWatt/nexowatt-eos/git/blobs/c6e1d41fb35db05ada65a5437e97217f3ca1aefe' -o "$eos_stage/recover-sudo-abort.py"
printf '%s  %s\n' '66104780fda7c92368e21d5baf88528ba7788a8055ccfc091d919c3a161efce4' "$eos_stage/recover-sudo-abort.py" | /usr/bin/sha256sum --check --status
/usr/bin/env -i PATH="$PATH" LC_ALL=C /usr/bin/python3 -I -B "$eos_stage/recover-sudo-abort.py" --recover
exec 3< <(printf '%s\n' "$eos_token")
unset eos_token
exec /usr/bin/env -i PATH="$PATH" LC_ALL=C SSH_CONNECTION="${SSH_CONNECTION-}" /usr/bin/python3 -I -B "$eos_stage/github-download.py" --manifest-blob 03a04702f31571814021f3de5ebd0586859c1404 --manifest-sha256 3fe525dbcca620709e7767e6d474842650b50406d3a0ae8ae2a4aedd82b7ad2b
EOS_INSTALL
```
<!-- EOS_SUDO_RECOVERY_COMMAND_END -->

Der Einstieg lädt beide Helfer über feste Git-Blob-IDs und prüft ihre SHA-256-
Fingerabdrücke vor der Ausführung. Die verdeckte Tokenabfrage erfolgt einmal.
Der Wiederherstellungshelfer erhält keinen Token; erst der nachfolgende
GitHub-Loader erhält ihn über einen Dateideskriptor.

Bei einem Fehler den vollständigen Fehlercode und den ausgegebenen
Quarantäne-/Journalpfad weitergeben. Eine bereits begonnene Wiederherstellung
wird nicht automatisch zurückgerollt oder ungeprüft wiederholt. Eine neue
Installation beginnt nur, wenn der Helfer erfolgreich abgeschlossen wurde.
Das Journal dokumentiert, welche Schritte begonnen und abgeschlossen wurden.

Der separat bereitgestellte Helfer unterstützt `--check` für ausschließlich
lesende Prüfungen und `--recover` für die geprüfte Wiederherstellung.
Es gibt keinen Parameter zum Umgehen von Prüfungen oder Ändern des Zielpfads.

[Quellstand, beobachteter Pi-Zustand und Testnachweise](../../reports/integration/sudo-abort-recovery-20261003/README.md).
**Tatsächlicher Wiederanlauf, vollständige Pi-Installation, Browser-Ersteinrichtung,
Reboot und Hardwaretests: OFFEN.** Der Einstieg erteilt keine Anlagenfreigabe
und implementiert keinen Flotten-Updater.
