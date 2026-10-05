# NexoWatt EOS Backup

NexoWatt EOS Backup is the backup and restore adapter for the **NexoWatt Energy Operation System (EOS)**. It is based on ioBroker.backitup 4.0.1 and retains its proven backup engines for ioBroker, InfluxDB, Redis, SQL databases and external storage targets.

## EOS additions

- NexoWatt adapter identity: `nexowatt-backup`
- Daily NexoWatt EOS main-backup preset at 02:30 with 30 retained generations
- Supplemental `nexowattEOS_…_backupconfig.tar.gz` system profile
- Manifest with EOS-core instances and complete adapter inventory
- SHA-256 checksums for profile contents and archive status state
- Public `/etc/iob-vendor.json` included by default when present
- `/opt/iobroker/iob-vendor-secret.json` excluded by default because the archive is not encrypted
- Backup status under `nexowatt-backup.0.info.*`

## Complete EOS protection

The regular ioBroker archive is the authoritative restore point. Configure the InfluxDB backup with the correct InfluxDB 2 token and enable Redis backup when Redis is used for objects or states. Select at least one off-controller destination such as an NAS, WebDAV or another protected target.

## SD-card backup target

EOS controllers installed on SSD or eMMC can use a separately mounted SD card as an external backup target. Select **NAS / SD card / Copy**, choose **SD card**, select the mounted card and keep the default relative directory `nexowatt-eos-backups` or enter another relative subdirectory.

The adapter only offers mounted, writable SD-like block devices. It excludes the active system disk and protected system mount points. Before backup creation and again immediately before copying, the selected target is verified as its own mounted block device and write-tested. If the card is missing, unmounted, read-only or not writable, the run aborts and never falls back to the SSD/eMMC directory.

InfluxDB archives copied to the SD card use rolling retention. After a successful copy, the newest three generations are retained per configured InfluxDB target and older generations are removed. Other backup types keep their normal configured retention. The Linux operating system must mount the SD card before it can be selected.
The standard backup engine still creates working archives locally before copying them to the validated SD target; local retention remains controlled by the normal backup settings.

## SD permission fix in 1.0.10

Backup listing/download now checks read/search permission on the actual subdirectory; it does not demand write access to the mount root. A root-owned, traversable mount root with an accessible backup subdirectory is supported. Read paths never create a directory or a test file. Backup writes still require writable media and a successful write probe in the target subdirectory. Symlinks and nested foreign filesystems are rejected. No automatic chmod, chown, remount or formatting is performed.

## InfluxDB 2 backup configuration

For InfluxDB 2, enter the bucket name under **InfluxDB database / bucket name** and the operator/root token in the token field. The token uses encrypted and protected native configuration. A blank or masked input alone does not establish whether a token is stored. A backend error stating that the token is missing means the running backup job received no nonempty token; check persistence after saving and restarting. This release does not change token persistence or install the InfluxDB CLI.

The field **InfluxDB CLI path (optional)** is not a database path or backup directory. Leave it empty to use the `influx` executable from the system path. Only enter an absolute executable path such as `/usr/bin/influx` when the CLI is installed elsewhere. Values such as `NexoWatt_Historie` are ignored at runtime and fall back to `influx`. The token is supplied to the CLI through `INFLUX_TOKEN`, not as a command-line argument.

## Installation

Compatibility baseline: ioBroker Admin `>=7.0.0`, js-controller `>=7.0.7` and Node.js `>=22.0.0`.

Use the installable `iobroker.nexowatt-backup-1.0.10.tgz` package. On an EOS controller, a manual fallback installation is:

```bash
cd /opt/iobroker
sudo -u iobroker npm install --omit=dev /path/to/iobroker.nexowatt-backup-1.0.10.tgz
sudo -u iobroker /opt/iobroker/iobroker add nexowatt-backup
sudo -u iobroker /opt/iobroker/iobroker upload nexowatt-backup
```

A source ZIP is provided separately for development and review.

Do not leave the upstream `backitup.0` and `nexowatt-backup.0` schedules active at the same time unless duplicate backups are intentional. See `MIGRATION.md`.

## Security

EOS system profile archives are gzip-compressed TAR archives, not encrypted containers. The vendor secret option is therefore disabled by default. Use only protected storage and transport paths when enabling it.

## Attribution

The current NexoWatt-specific distribution is proprietary and requires prior written permission from NexoWatt. Upstream MIT terms, third-party licenses and rights validly granted under earlier MIT distributions remain unaffected. See [LICENSE](LICENSE), [NOTICE.md](NOTICE.md) and the byte-preserved [previous MIT notice](LICENSES/PREVIOUS-MIT.txt).

## Zentrale EOS-Lizenz

Backup benötigt eine gültige Home- oder Pro-Freigabe über `eos-admin.0` und die
geprüfte EOS-Laufzeit. Aktivierung und Verlängerung werden automatisch übernommen.
[Verhalten bei Lizenzverlust und sichere Wiederherstellung](docs/de/lizenzbetrieb.md).
