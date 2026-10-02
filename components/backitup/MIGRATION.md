# Migration from ioBroker BackItUp

1. Record the existing storage destinations and database credentials from `backitup.0`.
2. Install `nexowatt-backup` as a separate adapter.
3. Transfer the required settings in the adapter configuration. Re-enter protected tokens and passwords rather than copying them through unprotected files.
4. Run a manual ioBroker backup and verify the log, the regular `…_backupiobroker.tar.gz` archive and the supplemental `nexowattEOS_…_backupconfig.tar.gz` archive.
5. Verify at least one external destination.
6. Stop the old schedule only after the new backup has been verified:

```bash
iobroker stop backitup.0
```

The archive format of the regular ioBroker backup remains compatible with the inherited ioBroker restore procedure. Keep the old adapter installed until one complete restore test has succeeded in a test environment.
