# NexoWatt UI – npm-Release-Prüfung gegen ETARGET

## Problem

Wenn das NexoWatt-EOS/ioBroker-Repository bereits eine neue Adapterversion meldet, npm diese Version aber noch nicht ausliefert, schlägt das Upgrade mit `ETARGET` fehl.

Typisches Log:

```text
Installing ... nexowatt-ui@0.8.xx
npm error code ETARGET
Updating objects from io-package.json ... version 0.8.alteVersion
```

Dann wurde die neue Version nicht installiert; der Host startet wieder mit der alten Version.

## Regel für Releases

Die Repository-Freigabe darf erst erfolgen, wenn die Version in npm sichtbar ist.

```bash
npm publish
npm run release:verify-npm
```

Erst wenn der Guard meldet:

```text
[npm-registry] OK: iobroker.nexowatt-ui@<version> ist in der Registry sichtbar.
```

soll die Adapter-Repository-Metadatei auf diese Version zeigen.

## Private Registry

Der Guard nutzt die npm-Konfiguration des Hosts. Für eine private Registry also vorher setzen:

```bash
npm config set registry <PRIVATE_REGISTRY_URL>
npm login --registry <PRIVATE_REGISTRY_URL>
npm publish --registry <PRIVATE_REGISTRY_URL>
npm run release:verify-npm
```

Optional können Paketname oder Version überschrieben werden:

```bash
NEXOWATT_NPM_PACKAGE=iobroker.nexowatt-ui \
NEXOWATT_NPM_VERSION=0.8.22 \
npm run release:verify-npm
```

## Warum das wichtig ist

`upgrade nexowatt-ui@<version>` installiert über npm. Eine GitHub-/Repository-Freigabe allein reicht nicht, wenn das Repository nicht direkt auf einen Tarball zeigt. Ohne sichtbare npm-Version entsteht `ETARGET`.
