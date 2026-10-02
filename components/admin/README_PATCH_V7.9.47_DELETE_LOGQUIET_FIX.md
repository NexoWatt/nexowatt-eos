# NexoWatt EOS Admin 7.9.47 - Delete-Guard Logquiet Fix

Dieser Patch baut auf v7.9.45 auf und behebt das Log-Spamming durch die Meldung:

`EOS delete guard repaired stale delete locks on 1 adapter/instance object(s)`

## Ursache

Die Reparatur alter `dontDelete`/`nondeletable`-Locks lief bei jedem EOS-Security-Guard-Durchlauf erneut. Wenn ein geschütztes Core-Objekt seine Delete-Flags sofort wieder zurückbekam, entstand ein Repair/Objektänderung/Repair-Loop.

## Änderung

- Die Reparatur alter Delete-Locks läuft nur noch einmal pro Adapterprozess.
- Geschützte Core-Adapter werden von dieser Stale-Lock-Reparatur übersprungen.
- Die Reparaturmeldung ist nur noch Debug-Level.
- Das Dienste-/Module-Löschen aus v7.9.45 bleibt unverändert aktiv.

## Geschützte Adapter

Nicht löschbar über die EOS-UI bleiben:

- admin
- eos-admin
- backitup
- nexowatt-devices
- nexowatt-device
- nexowatt-dev
- nexowatt-ui
