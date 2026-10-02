# NexoWatt EOS Admin v29 Update-Fix

Diese Version behebt den Update-Stopp des eigenständigen `eos-admin` Adapters.

## Ursachen

Es gab zwei technische Ursachen:

1. Der gebaute Adapter-Frontend-Bundle enthielt noch den alten Self-Update-Check `adapterName === "admin"`. Dadurch nutzte `eos-admin` beim Klick auf Update nicht den Webserver-Updatepfad, sondern den normalen Terminal-Befehl. Beim Update der gerade laufenden Oberfläche kann das hängen bleiben.
2. Frühere Builds konnten `common.dontDelete=true` auf `system.adapter.eos-admin` setzen. Das schützt zwar gegen Löschen, kann aber den ioBroker-Upgrade-Ablauf stören, weil Updates Adapterobjekte ersetzen oder neu schreiben müssen.

## Lösung

- Der gebaute Adapter-Bundle nutzt jetzt `adapterName === "eos-admin"`.
- Der Webserver-Updater sendet jetzt `adapterName: "eos-admin"` an den js-controller.
- `eos-admin` wird aus „Update alle“ herausgefiltert, damit die laufende Oberfläche nicht über den normalen Terminal-Befehl aktualisiert wird.
- `common.stopBeforeUpdate=false` im Repository und im Adapter-Metadata.
- `common.dontDelete=false` und `common.nondeletable=false`.
- Löschschutz erfolgt über ACLs, EOS UI-Regeln und Security Guard, nicht über objektbasierte Update-Blocker.

## Reparatur bestehender Installationen

Vor dem Update von älteren v24–v27 Installationen einmalig die alten Sperrflags entfernen:

```bash
cd /opt/iobroker

iobroker object set system.adapter.eos-admin common.dontDelete=false || true
iobroker object set system.adapter.eos-admin common.nondeletable=false || true
iobroker object set system.adapter.eos-admin common.stopBeforeUpdate=false || true

iobroker object set system.adapter.eos-admin.0 common.dontDelete=false || true
iobroker object set system.adapter.eos-admin.0 common.nondeletable=false || true

iobroker update https://iobroker.live/repo/repo-nexowatt.json
iobroker upgrade eos-admin https://iobroker.live/repo/repo-nexowatt.json
iobroker upload eos-admin
iobroker restart eos-admin.0
```

## Löschschutz

Der harte Objekt-Flag `dontDelete` wird in v29 bewusst entfernt, weil er den Updatepfad blockieren kann. Der Schutz gegen Löschen erfolgt über EOS-Admin-Rechte, ACL/Guard und ausgeblendete Löschaktionen für Nicht-Administratoren. `nondeletable` bleibt `false`, damit Updates immer möglich bleiben.
