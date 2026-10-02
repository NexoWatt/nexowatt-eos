# NexoWatt EOS Admin 7.9.70 – On-Host Smoke-Test

1. Version prüfen: `node -p "require('/opt/iobroker/node_modules/iobroker.eos-admin/package.json').version"`
2. Nach dem Wechsel von v69 einmal `Strg + F5`; ein komplettes „Clear site data“ soll nicht erforderlich sein.
3. Chrome-Konsole: keine roten Fehler auf Cockpit, Module, Dienste, Datenpunkte, Logs, Benutzer.
4. Module: `nexowatt-ui` suchen; Drei-Punkte-Menü; bestimmte Version öffnen; Adapterliste auswählen.
5. Dienste: `eos-admin.0` darf nicht löschbar sein; `eos-admin.1` muss löschbar sein; normaler Adapter muss löschbar sein.
6. Datenpunkte: `common.write=false` read-only; Boolean/Number/String/Enum/Button mit `common.write=true` editierbar; Tooltip sichtbar.
7. Rollen: Admin, Installateur, Endkunde anmelden. Während `iobroker restart eos-admin.0` darf ein Admin nicht als Endkunde erscheinen.
8. 30 Minuten Module/Dienste/Datenpunkte bedienen; keine zunehmende Verzögerung und kein `Cannot have two HTML5 backends`.
