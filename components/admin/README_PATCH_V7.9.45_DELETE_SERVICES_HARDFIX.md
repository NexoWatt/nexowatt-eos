# NexoWatt EOS Admin v7.9.45 – Dienste/Module Mülleimer Hardfix

## Ursache

Das eigentliche `del`-Kommando war nicht der einzige Punkt. Zusätzlich gab es DOM-Security-/Branding-Skripte, die Mülleimer-Buttons per Capture-Click, `disabled` und versteckten CSS-Klassen blockieren konnten. In Kombination mit alten `eosProtectedAdapters`-Einträgen, virtualisierten React-Zeilen oder alten `common.dontDelete`/`common.nondeletable`-Flags konnten dadurch normale Dienste nicht gelöscht werden.

## Änderung

- DOM-Skripte fangen Mülleimer-Klicks nicht mehr global ab.
- Der Löschschutz ist hart auf diese Adapter begrenzt:
  `admin`, `eos-admin`, `backitup`, `nexowatt-devices`, `nexowatt-device`, `nexowatt-dev`, `nexowatt-ui`
- React-Handler und ausgelieferte `adminWww/assets`-Bundles blockieren nur diese Kernadapter.
- Alte `dontDelete`/`nondeletable`-Flags und stale EOS-ACLs werden beim Start repariert.
- Der Dienste-Löschdialog öffnet auch, wenn `getAdapterInstances()` fehlschlägt.
