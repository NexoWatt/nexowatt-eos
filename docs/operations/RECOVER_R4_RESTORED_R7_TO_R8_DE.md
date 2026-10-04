# R8 nach zurückgenommenem R7-Erststartversuch

Stand 04.10.2026: **R8 / Sequenz 11 ist signiert und veröffentlicht.**
[Vollständiger, fest gebundener Pi-Befehl](../../delivery/public-recovery-test3-r8/RECOVERY_COMMAND.txt)
und [Veröffentlichungsnachweis mit erfolgreichen Prüfläufen](../../reports/integration/r8-release-20261004/README.md).
Der Befehl verlangt keinen GitHub-Token und setzt die Einrichtung nicht zurück.

Dieser Wiederherstellungsweg gilt ausschließlich für den veröffentlichten R7-Versuch, dessen privates Journal `RESTORED_STOPPED` meldet und dessen aktueller Release wieder das authentifizierte R4 mit Sequenz 7 ist. Ziel ist ein separat signiertes R8 mit Sequenz 11. Ein vorhandener Erststartabschluss, ein laufender alter Koordinator, abweichende Dateien oder ein anderer Ausgangsstand führen zum Abbruch.

Der Helfer `tools/system/recover-r4-restored-r7-to-r8.cjs` wird ausschließlich durch einen veröffentlichten Einstieg mit festen Release- und Schlüsselbindungen aufgerufen. Seine Argumente sind `--bundle`, `--public-key`, `--expected-release-id` und `--expected-key-sha256`. `--quiesce-incomplete` gehört zum selben geschützten Systemd-Aufruf. Es gibt keine Force-, Passwort-, Zielverzeichnis- oder Entsperroption. Dieses Dokument enthält keinen ungepinnten Download- oder Reparaturbefehl.

Vor Änderungen prüft der Helfer die Signaturen und Inhalte von R4, dem installierten veröffentlichten R7 und dem neuen R8. Das alte R7-Journal, sein Guard und die Aktivierungssperre müssen als private, unverlinkte Dateien vorhanden und exakt miteinander verbunden sein. Die im Journal gesicherten ursprünglichen R4-Zustandsbytes müssen dem aktuellen Zustand entsprechen; auch der ursprüngliche Onboarding-Lock wird geprüft. Die alten Prozesskennungen und der R7-Systemd-Koordinator müssen inaktiv sein. Der vollständige historische Schema-2-Handoff sowie die vorhandenen Datenbank-, Passwort-, UUID- und Lizenzbindungen werden erneut geprüft.

Der Helfer setzt weder Einrichtung noch Zugangsdaten zurück. Er bewahrt die vorhandene Konfiguration, Zertifikate, den Handoff und die Lizenzidentität. Der authentifizierte Zeitfortschritt der Lizenz darf sich durch den laufenden Admin erhöhen. Die reguläre Bereinigung alter Setup-Geheimnisse wird damit nicht als abgeschlossen behauptet; geschützte historische Setup-Dateien bleiben erhalten.

R8 legt ein eigenes privates Journal `first-start-recovery-r8.json` und einen eigenen Guard `.first-start-recovery-r8.guard` unter `/etc/nexowatt-eos` an. Es verändert das bisherige R7-Journal und dessen Guard nicht. Diese bleiben auch nach erfolgreichem R8-Abschluss als historische Nachweise vorhanden. Nur die exakt eigene Aktivierungssperre und der eigene R8-Guard werden nach erfolgreicher Prüfung entfernt.

Der Probestart verlangt aktuelle Adapter-Heartbeats, die HTTPS-Prüfung beider Oberflächen und die erneute Prüfung der vorhandenen Datenbankbindungen. Beide HTTPS-Prüfungen laufen parallel mit unveränderter Zertifikats-, TLS- und Antwortprüfung. Ein noch nicht lauschender Server wird innerhalb der begrenzten Bereitschaftsfrist erneut geprüft. Erst danach werden Erststartabschluss und Startfreigabe geschrieben.

Bei einem Fehler bleiben die ursprüngliche Fehlerphase und der feste Fehlercode neben dem Rücksetzergebnis erhalten. Die Terminalausgabe enthält ausschließlich `code`, `failureStage`, `failureCode`, `failureReason` und feste Statuswerte. `failureReason` ist entweder `null` oder einer der Werte `input`, `deadline`, `transport`, `tls`, `response`, `size`. Private Adressen, Fehlermeldungen, Konfigurationen und Stacktraces werden nicht ausgegeben. Das private Journal enthält zusätzlich gesicherte Originalbytes und darf nicht vollständig veröffentlicht werden.

`RESTORED_STOPPED` bestätigt nur die geprüfte Rücksetzung dieses Versuchs auf das gestoppte R4 hinter den Sperren. `RECOVERY_REQUIRED` bestätigt weder einen erfolgreichen Stop noch eine vollständige oder dauerhaft gespeicherte Rücksetzung. Auch nach einem Datei- oder Synchronisierungsfehler versucht der Helfer die Aktivierungssperre unabhängig vom Guard wiederherzustellen. Fremde Zustände werden nicht überschrieben. Bei einem Fehler weder Sperren löschen noch den Befehl blind wiederholen; die festen Diagnosefelder und den Dienstzustand auswerten.

Die [gezielten Tests und ihre Grenzen](../../reports/integration/r8-restored-recovery-20261004/README.md) sind separat dokumentiert. Ein erfolgreicher Quelltest ist keine Bestätigung des konkreten Pi-Wechsels, Browser-Logins, Geräteneustarts oder Backup/Restore. Physische Anlagensteuerung und Produktionsfreigabe bleiben gesperrt.


## Prüfung nach dem Wiederherstellungsversuch

Bei Erfolg meldet die Ausgabe `FIRST_START_RECOVERED` und Sequenz 11. Danach:

```sh
systemctl show nexowatt-eos-controller.service nexowatt-eos-postgresql.service \
  --property=Id,ActiveState,SubState,Result,ExecMainStatus,NRestarts
```

Beide Dienste müssen aktiv laufen. An der vorhandenen HTTPS-Adresse mit dem
bestehenden Admin-Passwort anmelden, abmelden und erneut anmelden. Anschließend
den normalen Geräteneustart prüfen. Erst diese Ergebnisse bestätigen den
konkreten Pi-Wiederanlauf; der erfolgreiche native x64-Lauf ersetzt ihn nicht.
Bei Fehlschlag nur die festen Terminal-Diagnosefelder und den Dienstzustand teilen;
private Journale, Konfigurationen, Schlüssel und vollständige Rohlogs nicht veröffentlichen.
