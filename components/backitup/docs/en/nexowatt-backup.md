# NexoWatt EOS Backup

## Backup scope

NexoWatt EOS Backup continues to create the complete ioBroker system archive. This archive is the authoritative restore point for objects, states, user files, scripts and adapter configuration.

Each run also creates a `nexowattEOS_…_backupconfig.tar.gz` system profile containing:

- a versioned EOS recovery manifest,
- a complete adapter and instance inventory,
- a separate summary of EOS core components,
- SHA-256 checksums,
- optionally the public vendor configuration stored outside the ioBroker object database.

The EOS profile is transferred to every enabled storage target and follows the same retention policy as the other backup files.

## SD-card storage target

When EOS runs from an SSD or eMMC device, a separately mounted SD card can be selected as the external backup target:

1. Enable **NAS / SD card / Copy** under storage locations.
2. Choose **SD card** in the additional settings.
3. Select the detected mounted card.
4. Keep the default relative subdirectory `nexowatt-eos-backups` or enter another relative subdirectory.
5. Use **Test SD card target** to verify the mount, write access and available capacity.

Only independently mounted writable SD cards or removable card readers are offered. The active SSD/eMMC system disk and protected system mount points are excluded. The adapter verifies the exact mount, block-device identity, read/write mode and write access before backup creation and again immediately before copying. A missing, unmounted, read-only or unwritable card aborts the run. There is no silent fallback to a directory on the system disk.

Linux must mount the card, for example by UUID in `/etc/fstab`; the adapter does not format or mount storage devices itself.

The backup engine still creates its working archives in the local EOS backup directory first and then copies them to the validated SD target. Local retention is separate from SD-card rotation and continues to follow the normal adapter settings.

### InfluxDB retention on the SD card

After an InfluxDB archive has been copied successfully, rolling retention keeps only the newest three complete archives per configured InfluxDB target. From the fourth generation onward, the oldest archive is removed. Deletion happens only after a successful copy. A copy or retention failure marks the backup run as failed. Other backup types continue to use their normal configured retention.

## Databases

InfluxDB and Redis must be enabled and validated according to the actual controller installation. The ioBroker system archive does not replace an InfluxDB dump or a Redis backup.

### Correct InfluxDB 2 configuration

- Enter the bucket name under **InfluxDB database / bucket name**, for example `NexoWatt`.
- Store a token with sufficient backup permissions under **InfluxDB database token**. The value is encrypted and intentionally not displayed in plain text after reopening the settings. Leaving the field unchanged keeps the stored token.
- **InfluxDB CLI path (optional)** is only for the executable. Normally leave it empty; the adapter then uses `influx` for InfluxDB 2 and `influxd` for InfluxDB 1. Only enter an absolute path such as `/usr/bin/influx` when required. A bucket name or directory such as `NexoWatt_Historie` does not belong in this field.
- The adapter supplies the InfluxDB 2 token through the `INFLUX_TOKEN` environment variable; it is not included in process command-line arguments.

If the required InfluxDB CLI is missing, the adapter reports the missing executable and asks for installation or an absolute executable path.

## Security

The archives are compressed but not encrypted. `/opt/iobroker/iob-vendor-secret.json` is therefore excluded by default. Enable it only when transport and storage are appropriately protected.

## Restore order

1. Verify archive availability and checksums.
2. Restore the regular ioBroker archive using the inherited restore workflow.
3. Restore database backups required by the installation.
4. Use the EOS system profile as a verification and reconstruction aid.
5. Validate adapter versions, vendor configuration, interfaces and EOS operation.

Complete at least one restore drill on a test controller before production rollout.
