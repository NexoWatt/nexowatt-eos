# NexoWatt EOS Admin v7.9.44 - Dienste löschen Fix

Fixes:

- Dienste/Instanzen trash button works again for all non-core adapters.
- Delete protection is limited to: admin, eos-admin, backitup, nexowatt-devices/nexowatt-device/nexowatt-dev, nexowatt-ui.
- Dynamic/stale eosProtectedAdapters entries are ignored for delete protection.
- DOM security scripts only lock delete controls inside a single row/card, not a whole table/panel.
- Old common.dontDelete/common.nondeletable and stale EOS ACLs are repaired at adapter start.
