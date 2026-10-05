# Changelog

## Unreleased (2026-10-05)

- Zentrale EOS-Home-/Pro-Freigabe für Start, Zeitpläne, Backup-/Restore- und Dateiverwaltung; automatische Wiederaufnahme nach Aktivierung.
- Getrennter Restore benötigt einen authentifizierten, archivgebundenen Einmalauftrag vor dem Controller-Stopp.
- Lizenzverlust beendet neue Aufgaben und Token-Erneuerung; laufende autorisierte Archive/Wiederherstellungen dürfen sicher abschließen.
- Gezielte Negativ-/Wiederanlaufprüfungen und Betriebsanleitung ergänzt.

## 1.0.10 (2026-09-16)
- SD-Backup-Liste prüft den tatsächlichen Sicherungsunterordner statt Schreibrechte am Mount-Root.
- Reines Lesen/Herunterladen führt weder mkdir noch Schreibprobe aus; fehlendes Zielverzeichnis wird bei der Liste als leer behandelt.
- Schreibende Sicherungen prüfen weiterhin Lese-, Schreib- und Suchrechte plus reale Schreibprobe.
- Symlinks und fremde untergeordnete Dateisysteme im Zielpfad werden abgelehnt; erneute Mountprüfung vor der Schreibprobe.
- Regressionstests für diesen Rechtefehler; kein Wechsel der GUI, keine Änderung an CLI/Tokenlogik oder Drei-Generationen-Rotation.


## 1.0.9 (2026-09-16)

- Fixed SD-card backup runs aborting with `TypeError: ctx.log.info is not a function`.
- SD-card validation and the three-generation InfluxDB rotation now use the `debug`, `warn` and `error` logger contract provided by the backup runtime.
- Added an offline regression test and publish validation that reject unsupported `ctx.log.info()` calls in the delivered SD-card code.
- InfluxDB CLI/token handling and SD-card retention behavior from 1.0.8 remain unchanged.

## 1.0.8 (2026-09-16)

- Fixed InfluxDB 2 backup failures caused by entering a bucket or backup-directory name in the executable-path field.
- Renamed and documented the field as the optional InfluxDB CLI path; blank now uses `influx` for 2.x and `influxd` for 1.x.
- Invalid relative CLI values safely fall back to the correct default executable instead of being executed as a command.
- InfluxDB 2 tokens remain encrypted and no longer prevent saving when the protected value is not rendered in plain text after reopening the settings.
- Tokens are passed to backup and restore via the `INFLUX_TOKEN` environment variable and are no longer placed on the command line.
- Added clear diagnostics for a missing InfluxDB CLI and offline tests for backup/restore command construction and secret handling.

## 1.0.7 (2026-09-16)

- Fixed `npm publish` on Windows development computers.
- SD-card discovery and validation tests now use explicit Linux/POSIX path semantics instead of the host operating system's path rules.
- Linux-only EOS archive and file-permission tests are skipped on non-Linux development systems while remaining mandatory on the Linux runtime validation path.
- Added explicit publish-time checks that prevent a regression to platform-dependent SD-card path handling.
- Backup, restore, SD-card selection and the three-generation InfluxDB retention logic are unchanged.

## 1.0.6 (2026-09-16)

- Added a dedicated SD-card storage target for EOS controllers whose operating system runs on SSD or eMMC.
- Mounted, writable SD cards and removable card readers can be selected directly in the adapter configuration.
- The active SSD/eMMC system disk and protected system mount points are excluded from the SD-card selector.
- Added strict preflight and pre-copy validation: a missing, unmounted, read-only or unwritable SD card aborts the backup without falling back to the system disk.
- Added rolling InfluxDB retention on the SD card. After a successful copy, only the newest three archives per configured InfluxDB target are retained.
- Added SD-card target discovery, write test, free-space display and automated unit tests for device selection and retention.

## 1.0.5 (2026-08-21)

- Das Backup-Dashboard verwendet jetzt durchgängig die NexoWatt-EOS-Farbwelt: dunkelblauer Systemhintergrund, grüner Primärakzent und türkise Sekundärakzente.
- Kopfbereich, Karten, Aktionsschaltflächen, Fokuszustände, Ladeanzeigen, Dialoge und Scrollleisten wurden an den EOS Admin angepasst.
- Die Farbanpassung wird auch bei späteren Frontend-Neubauten automatisch nachgezogen.
- Sicherungs- und Wiederherstellungslogik bleiben unverändert.

## 1.0.4 (2026-08-21)

- Made the direct NPM publish workflow safe when the new ZIP is copied over an existing adapter folder.
- Added an automatic pre-publish cleanup based on the signed release manifest.
- Removed obsolete files from older Admin UI builds before validation, including legacy `admin/custom` Module Federation assets.
- Added a second package-level exclusion for `admin/custom/**` as defense in depth.
- Kept the native Admin 7/8 JSONConfig UI, NexoWatt EOS boot logo and visible branding unchanged.

## 1.0.3 (2026-08-21)

- Replaced all React-based instance-configuration extensions with native JSONConfig controls for Admin 7 and Admin 8.
- Removed the mixed React-runtime path that caused `Objects are not valid as a React child`.
- Replaced the platform boot animation and system-backup icon with NexoWatt EOS artwork.
- Added native manual backup buttons and native notification-instance selectors.
- Removed stale custom-component assets from the published package.


## 1.0.2

- Fixed Admin 7 loading of all JSONConfig custom components by declaring `bundlerType: 'module'` for every ES-module remote.
- Fixed the Admin 7 loading cause behind the repeated Module Federation `RUNTIME-008` errors for `custom/customComponents.js`.
- Replaced visible ioBroker product labels, the system-backup tab label and its icon with NexoWatt EOS branding.
- Added publish-time checks that prevent missing module declarations, broken custom-component assets or reverted product labels.
- Backup, restore and EOS system-profile backend logic remain unchanged.

## 1.0.1

- Corrected the global ioBroker Admin requirement from `>=8.0.0` to `>=7.0.0`.
- Restored installation support for NexoWatt EOS systems based on ioBroker Admin 7.
- Added a publish-time validation that prevents an accidental Admin 8-only dependency from being released again.
- Backup, restore and EOS system-profile logic remain unchanged.

## 1.0.0

- Forked from ioBroker.backitup 4.0.1 under the MIT License.
- Renamed the adapter to `nexowatt-backup`.
- Added NexoWatt EOS branding and defaults.
- Added a supplemental EOS system profile with adapter inventory and SHA-256 integrity data.
- Added safe-by-default handling of NexoWatt vendor files.
- Added EOS profile status states and migration documentation.
- Hardened the NPM publishing workflow: the prebuilt release is verified without requiring a local build toolchain.
- Changed all development task commands to the explicit cross-platform entry point `tasks.js`.
