# Installation und Abnahme – NexoWatt EOS Admin 7.9.90

## Installation

```bash
cd /opt/iobroker
iobroker backup
iobroker stop eos-admin.0
npm install --no-save --omit=dev iobroker.eos-admin@7.9.90
iobroker upload eos-admin
iobroker restart eos-admin.0
```

## Prüfen

```bash
node -p "require('/opt/iobroker/node_modules/iobroker.eos-admin/package.json').version"
```

Erwartet:

```text
7.9.90
```

## Rollenabnahme

- Admin/Service: vollständiger Zugriff, Expertenmodus und interne Notfallreserven sichtbar.
- Installateur: Übersichtskacheln klickbar; `admin.0` und `backitup.0` unsichtbar; `nexowatt-backup.0` sichtbar.
- Gast/Endkunde: freigegebene Übersichtskacheln klickbar; interne Notfallreserven unsichtbar.
- Neue oder zurückgesetzte Konten `installer`, `guest` und `user`: leeres Passwort aktiviert die Anmeldung nur während der offenen Erstaktivierung.
- Nach Passwortvergabe: leeres Passwort bleibt gesperrt.

- Die Anmeldeseite nutzt wieder die kompakte bewährte Darstellung ohne zusätzliche Rollen-Kachel; Erstaktivierung erfolgt über das normale Loginname-Feld mit leerem Passwort.
