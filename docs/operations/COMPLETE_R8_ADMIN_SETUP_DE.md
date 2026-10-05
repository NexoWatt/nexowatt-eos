# R8: zusätzlichen Admin-Assistenten abschließen

Stand: 05.10.2026. Gilt ausschließlich für das bereits erfolgreich eingerichtete
R8-Testsystem, Sequenz 11, Release
`eb3d1747c35988bdf8785e7a5cdfc786ab356fa87149054767d7c0ed211b7ea7`.

## Ursache und Korrektur

Der Admin prüft beim Laden `system.config.common.licenseConfirmed`. Die bisherige
EOS-Einrichtung hat diesen Kompatibilitätswert nicht gesetzt. Deshalb öffnet sich
nach der Anmeldung nochmals der neunseitige ioBroker-Assistent. Dessen Änderung
der Systemkonfiguration ist im EOS-Betriebsprofil bewusst eingeschränkt.

Die EOS-Einrichtung setzt den Wert künftig selbst. Das überspringt den bereits
durch EOS erledigten zweiten Assistenten; Passwort, Authentifizierung, UUID,
EOS-Produktlizenz und Anlagenkonfiguration werden nicht vom alten Wizard gesetzt.
`diag: "none"` bleibt bestehen. MIT-/Urheberrechtshinweise bleiben Bestandteil
der Auslieferung. Das Flag ist keine Zustimmung zur Telemetrie und keine
Aktivierung einer NexoWatt-Produktlizenz.

## Bereits eingerichteter R8-Pi

Der eng begrenzte Helfer `tools/system/complete-r8-admin-setup.py` verwendet den
vorhandenen lokalen PostgreSQL-Administrationszugang. Er prüft Root-Eigentum,
R8-Releasezustand und Releasezeiger, den abgeschlossenen Erststart sowie aktive
Controller-/PostgreSQL-Dienste. Eine vorhandene Wartungssperre verhindert den
Start. Während der Korrektur hält er die vorhandene exklusive Aktivierungssperre.

Die SQL-Transaktion läuft als eingeschränkte Rolle `eos_objects`, sperrt die
betroffenen Datensätze und prüft die abgeschlossene EOS-Einrichtung sowie die
deaktivierte Telemetrie und Paketquellen. Sie ändert ausschließlich den genannten
Statuswert und erzeugt das normale Objektänderungsereignis mit `NOTIFY` innerhalb
derselben Transaktion. Alle anderen Objektwerte bleiben erhalten. Erneute
Ausführung bei bereits gesetztem Flag erzeugt keine weitere Änderung.

Es werden keine signierten Paketinhalte verändert, keine Pakete installiert und
keine Dienste neu gestartet. Der Quellcodefix allein ändert den bereits
installierten R8-Pi nicht; dafür ist diese ausdrückliche Bestandskorrektur nötig.

Der veröffentlichte, auf Commit und Dateihashes festgelegte Befehl steht nach
der Veröffentlichung in `R8_ADMIN_SETUP_COMMAND.txt` im selben Verzeichnis.
Den vollständigen Befehl einmal im SSH-Terminal des betroffenen Test-Pi ausführen.
Er lädt zwei kleine geprüfte Dateien in ein neues privates Root-Verzeichnis.
Erwartete Ausgabe:

```json
{"ok":true,"status":"ADMIN_SETUP_COMPLETED","restartRequired":false}
```

Danach die bisherige Admin-HTTPS-Seite mit Strg+F5 neu laden. Es soll direkt die
Admin-Oberfläche erscheinen. Anschließend abmelden und erneut anmelden. Die
Geräteabnahme von Browser, erneutem Login und späterem Neustart bleibt bis zur
tatsächlichen Durchführung offen. Diese Korrektur aktiviert keine physischen
Adapter und erteilt keine Produktionsfreigabe.

## Abbruch

Bei Abbruch werden nur feste Diagnosecodes ausgegeben, keine Konfigurationsdaten
oder Passwörter. SQL-Fehler rollen die Transaktion zurück. Ein Verbindungsabbruch
unmittelbar nach COMMIT kann einen unklaren Rückgabestatus ergeben; die Operation
ist dafür idempotent. Vor einem erneuten Lauf den festen Fehlercode prüfen.
Historische Wiederherstellungsbefehle für unvollständige R4/R7-Installationen
sind für dieses bereits eingerichtete R8-System nicht vorgesehen.

Eine fremde Wartungssperre wird niemals entfernt. Bei hartem Prozessabbruch oder
Stromausfall kann die eigene Sperre erhalten bleiben und einen späteren Start
blockieren. Nicht blind löschen: den Zustand und den festen Operationsnamen
`complete-r8-admin-setup` durch den Hersteller prüfen lassen. Ein abgeschlossener
normaler Helferlauf entfernt nur seine eigene Sperre.

Prüfbelege: [Admin-Assistent 05.10.2026](../../reports/integration/admin-wizard-20261005/README.md).
