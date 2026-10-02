# NexoWatt EOS Admin v7.9.41 – Delete-/DP-Write-Fix

Dieses Overlay enthält nur die geänderten Dateien gegenüber dem Paket `v40-update-packetname-fix`.

## Änderungen

- Löschschutz korrigiert:
  - geschützt: `admin`, `eos-admin`, `backitup`, `nexowatt-devices`, `nexowatt-device`, `nexowatt-dev`, `nexowatt-ui`
  - alle anderen installierten Adapter/Instanzen bleiben löschbar.
- Geschützte Adapter werden weiterhin nicht über `common.dontDelete` oder `common.nondeletable` gesperrt, damit Updates möglich bleiben.
- Datenpunkte schreiben zuverlässiger:
  - normale Wertdialoge schreiben direkt per `socket.setState(id, { val, ack, q, expire })` und schließen erst nach erfolgreichem Write.
  - Button-/Switch-Datenpunkte schreiben sofortige Befehle mit `ack: false` und `q: 0`.
- Objekt-Wert-Zellen werden robuster erkannt und annotiert, ohne native Click-Handler zu blockieren.

## Anwendung als Overlay

Im entpackten Adapter-/Projektverzeichnis ausführen:

```bash
unzip -o nexowatt-eos-admin-v7.9.41-delete-dp-fix-overlay.zip -d /opt/iobroker/node_modules/iobroker.eos-admin
sudo -u iobroker iobroker upload eos-admin
sudo -u iobroker iobroker restart eos-admin.0
```

Alternativ die Dateien aus diesem Overlay 1:1 über die bestehenden Dateien im Projekt legen und danach den Adapter neu hochladen/restarten.
