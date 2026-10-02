# Installationstest – NexoWatt EOS Admin 7.10.2

## Voraussetzungen

- ioBroker JS-Controller 7.x
- Node.js 22.x oder eine laut `package.json` unterstützte Node.js-Version
- EOS Admin auf Port 8081

## Prüfschritte

1. Installierbares Paket `iobroker.eos-admin-7.10.2.tgz` hochladen oder die Repository-ZIP als Arbeitsstand verwenden.
2. Prüfen, dass `system.adapter.eos-admin.0` Version 7.10.2 meldet.
3. Die Instanz mindestens 60 Sekunden beobachten. Es darf keine wiederkehrende Folge aus `stopInstance`, `TERMINATE_YOURSELF` und erneutem Start geben.
4. EOS Admin im Browser neu öffnen. Das Haupt-Bundle sowie die EOS-CSS-Dateien müssen mit HTTP 200 vollständig geladen werden.
5. Browserkonsole prüfen: keine Meldungen `ERR_INCOMPLETE_CHUNKED_ENCODING`, `Failed to fetch dynamically imported module` oder `ERR_CONNECTION_REFUSED` für Port 8081.
6. Unter den Update-Einstellungen den NexoWatt-Stable-Schalter aus- und wieder einschalten. Dabei darf die EOS-Admin-Instanz nicht neu starten.
7. Im Objektbaum prüfen, dass `eos-admin.0.info.nexowattStableUpdatesEnabled` und `eos-admin.0.info.nexowattStableUpdatesState` vorhanden sind.
8. Adapterlog prüfen: `MODULE_NOT_FOUND: ./eosRequestSecurity` darf nicht auftreten.

## Erwartetes Ergebnis

EOS Admin bleibt dauerhaft aktiv, der Browser lädt die Oberfläche vollständig und die Stable-Updateverwaltung arbeitet ohne Änderung der laufenden Instanzkonfiguration.
