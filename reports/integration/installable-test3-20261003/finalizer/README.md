# Abschlusswächter des Erststarts

Der privilegierte Abschlussdienst verwendet nun zusätzlich einen festen
`ExecStopPost`-Aufruf von `finalize-onboarding.cjs --quiesce-incomplete`.
Bleibt der Erststart-Lock derselben systemd-Invocation bestehen, entfernt dieser
Aufruf die vorläufige Startfreigabe und stoppt den Controller. Ein Fehler beim
Entfernen der Freigabe verhindert den Stopversuch nicht. Ein fehlgeschlagener
Stop bleibt ein fehlgeschlagener Dienstausgang; der Lock wird nicht beseitigt.

Die Bindung verwendet systemds `INVOCATION_ID`, die für alle Prozesse eines
Dienstlaufs identisch ist. Eine fremde oder frühere Invocation sowie vorhandene
andere Wartungsvorgänge werden nicht übernommen. Der eigentliche Finalizer
verlangt jetzt den festen systemd-Kontext. Nach regulärem Abschluss ohne Lock
führt der Wächter keinen Stop aus. Siehe die offiziellen
[systemd-257-Angaben zur Invocation-ID](https://github.com/systemd/systemd/blob/v257/man/systemd.exec.xml)
und zum [ExecStopPost-Verhalten bei Fehlern](https://github.com/systemd/systemd/blob/v257/man/systemd.service.xml).

Die Node-Gesamtfrist beträgt 840 Sekunden; systemd erlaubt 900 Sekunden für den
Start und 120 Sekunden für den Stop. Damit liegen die Gesamtbudgets über den
wesentlichen einzelnen Import-, Upload-, Start- und Bereitschaftsfristen.
`ExecStopPost` soll auch nach Prozessabbruch oder Ablauf der Frist greifen; das
wurde anhand der dokumentierten systemd-Semantik implementiert.

`quiesce.tap` belegt 28 bestandene lokale Tests, davon zehn neue Wächtertests.
`quiesce.json` bindet TAP und Quellen per SHA-256. Die Tests verwenden echte
Hilfsfunktionen mit eingesetzten Hosteffekten und lesen die tatsächliche Unit.
Es lief hier kein systemd. Reale Timeout-/SIGTERM-/SIGKILL-, Controllerstop-,
Neustart- und Raspberry-Pi-/Hardwaretests sind ausdrücklich offen. Die Änderung
erteilt keine physische Steuerfreigabe und keine Produktionsfreigabe.
