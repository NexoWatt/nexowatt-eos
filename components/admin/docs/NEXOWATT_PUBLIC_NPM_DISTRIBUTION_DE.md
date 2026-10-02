# NexoWatt EOS – öffentliche npm-Verteilung mit proprietärer Lizenz

Diese Version ist für eine öffentliche technische Veröffentlichung auf npm vorbereitet, bleibt aber lizenzrechtlich proprietär.

## Paketname

Das npm-Paket ist bewusst scoped:

```text
@nexowatt/iobroker.admin
```

Der ioBroker-Adaptername bleibt weiterhin:

```text
admin
```

Dadurch kann das Paket über ein NexoWatt-ioBroker-Repository per `packetName` als Admin-Adapter ausgeliefert werden, ohne den offiziellen `iobroker.admin`-Paketnamen zu verwenden.

## Wichtige package.json-Einstellungen

```json
{
  "name": "@nexowatt/iobroker.admin",
  "private": false,
  "license": "UNLICENSED",
  "publishConfig": {
    "access": "public"
  }
}
```

`private` ist auf `false` gesetzt, damit `npm publish` möglich ist. Die Lizenz bleibt trotzdem proprietär. Die öffentliche technische Abrufbarkeit über npm bedeutet keine freie Nutzungserlaubnis.

## Veröffentlichung

```bash
npm login
npm publish --access public
```

Wenn diese Version bereits veröffentlicht wurde, muss vor dem nächsten Publish die Version in `package.json` und `io-package.json` erhöht werden.

## Beispiel für das NexoWatt-Repository

```json
{
  "admin": {
    "name": "admin",
    "version": "7.9.2",
    "packetName": "@nexowatt/iobroker.admin",
    "title": "NexoWatt EOS",
    "desc": {
      "de": "NexoWatt EOS Administrationsoberfläche",
      "en": "NexoWatt EOS administration interface"
    },
    "meta": "https://repo.nexowatt.de/iobroker/admin/io-package.json",
    "icon": "https://repo.nexowatt.de/iobroker/admin/admin.png"
  }
}
```

Nur Systeme, die das NexoWatt-Repository aktiv verwenden, bekommen diesen Admin-Adapter über den normalen ioBroker-Repository-Updateweg. Normale ioBroker-Systeme mit offiziellem stable/latest Repository werden dadurch nicht automatisch umgestellt.

## Lizenzhinweis

Die NexoWatt-spezifischen UI-, Branding-, Layout- und EOS-Bestandteile dürfen nur auf autorisierten NexoWatt-Systemen genutzt werden. Details stehen in `NEXOWATT_PROPRIETARY_LICENSE.md` und `LICENSE`.
