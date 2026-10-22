# Admin: selbstständige Node-Aktualisierung

Stand: 22.10.2026; Ausgangscommit und genaue Dateihashes in
`verification.json`. Dieser Nachtrag präzisiert die bisherige Anzeige nach dem
Nutzerauftrag: Linux-Sicherheitsupdates und Node-Updates innerhalb des
freigegebenen Hauptstands sollen ohne Updateklick installiert werden.

Die Anzeige beschreibt die vom Host gemeldete signierte Node-24-Automatik und
ihr Nachtfenster 02:30–03:00 Uhr Europe/Berlin. Sie zeigt Zurückstellung, Fehler
und Wiederherstellungssperre sowie fehlende oder unbekannte Statusverträge
ausdrücklich. Der manuelle Updateknopf behält seine Wartungsbestätigung und
die bisherige aktuelle Rollen-, HTTPS- und Same-Origin-Prüfung. Ein Browserfeld
kann keine automatische Installation autorisieren. Der Linux-Status einschließlich
ausstehender Dienst-/Kernelaktivierung bleibt getrennt sichtbar.

Tatsächlich lokal bestanden: **45 von 45** HTTP-/OS-Status-Vertragsprüfungen,
Syntaxprüfung der Browserdatei und des Chromium-Szenarios sowie die bestehende
Versiegelungsprüfung mit **1498 Dateien / 31 Backend-Dateien**. Die neuen
Negativfälle prüfen fremde Automatikmodi, Hauptversionen, Zeitfenster,
unbekannte Zustände, ungültige Zeitpunkte, zusätzliche/private Felder und
Versuche, über die HTTP-Anfrage die Wartungsbestätigung zu umgehen.

Das bestehende Chromium-Testprogramm enthält jetzt fünf Szenarien; hinzu kamen
die Anzeige ohne Installationsanforderung, vorgemerkte automatische Angebote,
Zurückstellung und unbekannter Automatikstatus. **Lokal nicht ausgeführt**, weil
kein Chromium vorhanden ist. Der vorhandene CI-Browserjob muss den neuen
Quellstand prüfen. Frühere Browsernachweise gelten nicht automatisch für diese
geänderten Dateien.

Die Tests verwenden injizierte HTTP-/Dateistatusdaten. Kein echtes Update,
keine Paketinstallation und kein Pi-/systemd-/ARM64-/Anlagentest wurde dadurch
ausgeführt. Die Auslieferung und Zielabnahme bleiben getrennte Gates.

Belege: `contracts.tap`, `prebuilt.txt`, `verification.json`.
