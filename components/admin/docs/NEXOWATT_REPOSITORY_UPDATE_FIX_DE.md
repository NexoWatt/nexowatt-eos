# NexoWatt EOS Admin – Repository-Update prüfen

Wenn der Admin trotz NexoWatt Repository nicht auf die EOS-Oberfläche aktualisiert wird, liegt es fast immer an einem dieser Punkte:

1. Das aktive Repository ist nicht `nexowatt`.
2. Der Repository-Eintrag enthält kein `packetName`.
3. Die Repository-Version ist nicht höher als die installierte Admin-Version.
4. Der Admin-Dateispeicher wurde nach der Installation nicht mit `iobroker upload admin` neu hochgeladen.
5. Der Browser zeigt noch alte Dateien aus dem Cache.

## Soll-Zustand

Der technische Adaptername bleibt `admin`. Nicht in `eos-admin` umbenennen, wenn der vorhandene Admin ersetzt werden soll.

Der npm-Paketname ist:

```text
@nexowatt/iobroker.admin
```

Der Repository-Eintrag muss so aussehen:

```json
{
  "admin": {
    "name": "admin",
    "version": "7.9.18",
    "packetName": "@nexowatt/iobroker.admin",
    "title": "NexoWatt EOS Admin",
    "desc": {
      "de": "NexoWatt EOS Administrationsoberfläche",
      "en": "NexoWatt EOS administration interface"
    },
    "meta": "https://repo.nexowatt.de/iobroker/admin/io-package.json",
    "icon": "https://repo.nexowatt.de/iobroker/admin/admin.png"
  }
}
```

## Update-Befehl

```bash
cd /opt/iobroker

iobroker repo
iobroker repo set nexowatt
iobroker update
iobroker upgrade admin
iobroker upload admin
iobroker restart admin.0
```

Danach im Browser `Strg + F5`.

## Prüfen, was wirklich installiert ist

```bash
cd /opt/iobroker

iobroker version admin
npm ls @nexowatt/iobroker.admin iobroker.admin --depth=0
node -e "const fs=require('fs'); for (const p of ['node_modules/@nexowatt/iobroker.admin/package.json','node_modules/iobroker.admin/package.json']) { if (fs.existsSync(p)) console.log(p, require('/opt/iobroker/'+p).name, require('/opt/iobroker/'+p).version); }"
```

Wenn hier weiterhin nur `iobroker.admin` steht, wurde nicht das NexoWatt-Paket installiert. Dann ist der Repository-Eintrag oder das aktive Repository falsch.
