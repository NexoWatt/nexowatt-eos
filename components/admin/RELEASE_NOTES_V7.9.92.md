# Release Notes – NexoWatt EOS Admin 7.9.94

## Behoben

- Der npm-Publish konnte in einem älteren oder unvollständig aktualisierten Arbeitsordner mit `internal backup reserve must default to Admin/Service visibility` abbrechen.
- Ein neuer Release-Default-Schritt stellt die beiden Backup-Reserve-Flags vor allen relevanten Prüfungen automatisch auf den verbindlichen sicheren Wert `true`.
- Eine eigene Regression prüft fehlende, falsche und bereits korrekte Werte.

## Unverändert

- Standardport 8081
- npm-Dist-Tag `latest`
- Admin-/BackItUp-Notfallreserve nur für Admin/Service
- NexoWatt Sicherung entsprechend Rollenfreigabe
- kompakte Anmeldung und Erstaktivierung
- klickbare Installer-/Endkundenübersicht
- EOS Assist im Header
