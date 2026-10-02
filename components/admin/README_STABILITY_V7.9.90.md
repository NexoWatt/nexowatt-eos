# NexoWatt EOS Admin 7.9.90 – Stable

Version 7.9.90 korrigiert die letzten realen Rollen- und Anmeldefehler des Verkaufsprodukts.

## Korrekturen

- Übersichtskacheln sind für Installateur und Gast/Endkunde vollständig klickbar.
- `admin.0` und `backitup.0` werden in Dienste für Installateur und Gast/Endkunde zuverlässig ausgeblendet – auch bei nachgeladenen oder virtualisierten Tabellen.
- `eos-admin.0` und `nexowatt-backup.0` bleiben sichtbar.
- Leere Erstanmeldung wird für `installer`, `guest` und `user` vorab serverseitig geprüft.
- Die Anmeldeschaltfläche wird nur dann aktiv/grün, wenn das Konto tatsächlich noch zur Erstaktivierung oder nach einem autorisierten Reset freigegeben ist.
- Nach erfolgreicher Passwortvergabe bleibt die Anmeldung ohne Passwort gesperrt.
- EOS Assist bleibt im Header; Zugangsverwaltung bleibt ausschließlich unter „Zugänge & Rechte“.
- Standardport bleibt 8081.

Admin/Service behält Vollzugriff und Expertenmodus. Installateur und Gast/Endkunde erhalten ausschließlich ihre freigegebenen Funktionen.

- Die Anmeldeseite nutzt wieder die kompakte bewährte Darstellung ohne zusätzliche Rollen-Kachel; Erstaktivierung erfolgt über das normale Loginname-Feld mit leerem Passwort.
