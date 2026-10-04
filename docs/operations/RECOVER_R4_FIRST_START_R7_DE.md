# Kontrollierte Wiederherstellung des abgebrochenen R4-Erststarts

Stand: 04.10.2026. Der neue Helfer
`tools/system/recover-r4-first-start-to-r7.cjs` ist ausschließlich für den
signierten R4-Teststand, Sequenz 7, nach einem abgebrochenen Browser-Erststart
vorgesehen. Er erwartet einen vollständig gespeicherten, identischen
Erststart-Handoff und vollständige Enrollment-Datenbankmarker, aber noch keine
Datei `first-start-complete.json`. Der Controller muss gestoppt sein und die
geschützte Sperre zum alten Vorgang `ui-onboarding` gehören. Ein noch laufender
alter Prozess, fremde Wartung, unbekannte Zustände oder ein vorheriger
Reparaturversuch führen zum Abbruch.

Das authentifizierte R4-Paket erzeugte ausschließlich Handoff-Schema 2 mit den
damaligen acht Einstellungsfeldern. Diese Form wird unverändert geprüft; ein
Schema-3-Handoff gehört nicht zu diesem Wiederherstellungspfad. Auch die damals
zulässige ausdrückliche Auswahl „ohne Lizenz“ bleibt möglich, jedoch nur ohne
vorhandenen verschlüsselten Lizenzdatensatz oder Speicherschlüssel. Der Helfer
trägt in diesem Fall keine Lizenz nach.

Der Helfer nimmt nur ein separat authentifiziertes R7-Testpaket mit Sequenz 10
an. Der öffentliche Einstieg muss den vollständigen Archiv-/Einstiegs-Commit,
Größe und SHA-256 sowie die neue Release-ID und den öffentlichen Schlüssel
unabhängig festlegen. Ein Quellcode-Commit oder dieser Text allein ist kein
ausführbarer, veröffentlichter Reparaturbefehl.

Vor dem Startversuch werden insbesondere geprüft:

- Signatur und sämtliche installierten Paketdateien des exakten R4-Standes;
  signiertes Zielpaket, unverändertes Datenbankschema und Systemd-Unit-Inventar.
- Releasezustand, Pointer, ursprüngliche Wartungssperre und Systemd-Zustände.
- Gespeicherter Handoff und Datenbankmarker einschließlich identischer
  Passwort-/Konfigurationsbindung, UUID und aktivierter Webinstanzen.
- Bereits gespeicherte verschlüsselte Lizenz: derselbe Schlüssel und derselbe
  authentifizierte Lizenzinhalt. Es werden keine neuen Zugangsdaten erzeugt.

Die Datenbank-Vorprüfung benutzt eine direkte TLS-1.3-Verbindung und eine
ausdrücklich nur lesende Transaktion mit Größen- und Zeitlimits. Ein normaler
EOS-Datenbankclient würde bereits beim Verbinden Ablaufbereinigungen ausführen
und wird daher hier nicht verwendet. Nach erfolgtem Start gelten die normalen
Laufzeitschreibvorgänge; der Lizenzdienst darf beispielsweise seinen
verschlüsselten Zeit-Höchststand fortschreiben. Bestehender Lizenzschlüssel,
Passwort, UUID, Konfiguration und Handoff werden nicht neu angelegt oder
zurückgesetzt.

Ein zusätzlicher exklusiver Wiederherstellungswächter verhindert parallele
Übernahme. Ein privates Root-Journal hält den ursprünglichen Releasezustand und
die Sperre fest. Erst danach erfolgen Paketwechsel und kontrollierter Start.
Controllerbereitschaft, beide Webadapter und ihre HTTPS-Endpunkte müssen die
Prüfung bestehen. Der Passwort-/Identitätsabgleich wird danach nochmals gelesen.
Erst dann wird der Erststartabschluss für R7 angelegt, Autostart aktiviert und
der Setup-Zugang beendet. Die vorhandenen Setup-Dateien bleiben geschützt
erhalten; sie werden nicht zum Umgehen der Diagnose gelöscht.
Das betrifft insbesondere den Handoff mit Passwort-Hash und Lizenz-Token unter
dem Setup-Konto (Verzeichnis/Dateien nur für dieses Konto lesbar), gegebenenfalls
die vorhandene Lizenz-Übergabedatei `first-start-license.json` sowie den alten
Setup-Code. Die Übergabedatei enthält den Lizenz-Token unverschlüsselt und ist
im installierten Profil auf Root und die Runtime-Gruppe begrenzt. Die gewöhnliche
Erststart-Geheimnisbereinigung ist mit diesem Wiederherstellungspfad ausdrücklich
noch nicht abgeschlossen; diese Restdateien dürfen nicht veröffentlicht werden.

Bei einem Fehler versucht der Helfer, den Controller zu stoppen. Soweit der Vorgang seine
eigenen unveränderten Zwischenstände wiedererkennt, stellt er Pointer und
Releasezustand auf R4 zurück. Fremde Änderungen werden nicht überschrieben.
Wartungssperre und Wiederherstellungswächter bleiben dann bestehen und das
Journal nennt `RESTORED_STOPPED` oder `RECOVERY_REQUIRED`. Nicht erneut durch
Löschen von Sperren, `--force`, Neuinstallation oder manuelles Starten umgehen.
Die Systemd-Nachlaufprüfung stoppt auch einen unterbrochenen eigenen Startversuch.
`RESTORED_STOPPED` verlangt eine bestätigte Stopprückmeldung.
`RECOVERY_REQUIRED` ist keine Bestätigung, dass Stoppen oder Rücknahme gelungen
sind; dann sind der tatsächliche Dienststatus und die erhaltenen Sperren zu prüfen.

Physische Adapter bleiben gesperrt. Ein erfolgreicher Reparaturbericht ist
keine Anlagen- oder Produktionsfreigabe. Tatsächliche Anmeldung, Wiederanmeldung
und Neustart auf dem Nutzer-Pi sind nach Bereitstellung weiterhin zu prüfen.

Nachweise: [Wiederherstellungstests](../../reports/integration/first-start-recovery-r7-20261004/README.md).
