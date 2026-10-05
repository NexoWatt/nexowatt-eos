# EOS Backup: zentrale Lizenz und Wiederherstellung

Stand 05.10.2026, Quellbasis `4e171e4`, Komponentenpaket 1.0.10 (Entwicklungsstand).

NexoWatt Backup startet seine Betriebsfunktionen ausschließlich in der geprüften
EOS-Laufzeit und mit einer gültigen zentralen Home- oder Pro-Freigabe von
`eos-admin.0`. Es gibt keinen eigenen Lizenzschlüssel, Cloud-Lizenzdienst oder
lokalen Freischalter. Der mitgelieferte Client prüft EOS-Installationsnachweis,
Paketzuordnung und kurzlebige zentrale Freigaben; Backup benötigt `energy`.
Die Systemgrenze bleibt der lokale vertrauenswürdige ioBroker-/OS-Prozessverbund.
Diese Kontrolle schützt nicht gegen bereits unter derselben OS-Identität
kompromittierten Produktcode.

Ohne Freigabe werden Zeitpläne, neue Sicherungen, Wiederherstellungen und
Backup-Verwaltungsbefehle abgewiesen. Upload und Download prüfen die Freigabe
auch je HTTP-Anfrage. Bei Lizenzverlust schließen ihre Server; Zeitpläne und
Token-Erneuerung stoppen. Eine bereits begonnene Sicherung oder autorisierte
Wiederherstellung darf sicher abschließen. Folgesicherungen und Slave-Aufträge
benötigen erneut eine Freigabe. Lizenzstatus und das Schließen der Dateiserver
bleiben als begrenzte Verwaltungsfunktionen möglich.

Nach zentraler Aktivierung oder Verlängerung nimmt Backup seine Konfiguration
und Zeitpläne kontrolliert wieder auf, normalerweise innerhalb eines weiteren
Prüfintervalls von fünf Sekunden nach Eingang einer gültigen Freigabe. Die
Initialisierung läuft nur einmal gleichzeitig; ein laufendes Archiv wird vorher
abgeschlossen. Alte Restore-Aufträge werden nicht wiederholt. Dateisystem- und
Restore-Aufräumen findet ausschließlich bei der ersten Initialisierung des
Prozesses statt. Eine Lizenzverlängerung erfordert keinen manuellen Neustart.

## Systemwiederherstellung und getrennte Recovery

Der native EOS-Adapter antwortet bei ioBroker-/Redis-Systemwiederherstellungen
mit `EOS_OPERATOR_RECOVERY_REQUIRED`, bevor er ein Archiv herunterlädt, einen
Auftrag schreibt oder Dienste stoppt. EOS stellt dem Runtimekonto keine
allgemeinen sudo-/Dienststeuerungsrechte zur Verfügung. Für diese Vorgänge
muss die separat autorisierte OS-Administration bzw. der passende geschützte
EOS-Host-Recoveryprozess verwendet werden. Eine sichere Adapteranbindung an
diesen Koordinator bleibt offen. Backup, Download und lizenzierte Restorearten
ohne Controller-Stopp bleiben verfügbar.

Der bisherige getrennte Restorepfad erhält zusätzlich einen privaten
Einmalauftrag mit Archiv-SHA-256, vollständiger Konfiguration und zehn Minuten
Startfrist. Ein zufälliger Schlüssel geht ausschließlich über die direkte
Kindprozessumgebung; er wird weder in Prozessargumente noch in systemd-
Umgebungsproperties geschrieben. Die Datei allein erlaubt keinen Restore.
Der Kindprozess verbraucht den Auftrag atomar und prüft Authentifizierung,
Frist, Dateirechte und Archivinhalt vor Restore oder Statusserver. Die Freigabe
gilt für genau einen Auftrag, niemals für den normalen Adapterbetrieb.
Dieser Zusatz öffnet den oben gesperrten nativen EOS-Startpfad nicht.

Bei defektem Admin bzw. ohne passenden autorisierten Recoveryweg entsteht keine
Offline-Freischaltung. Backup erhält keine neuen OS-Rechte. EOS-Backup-Profile,
Redis-/TLS-Einstellungen und bestehende Wartungsgrenzen bleiben erhalten.

## Prüfung auf getrenntem Testabbild (OFFEN)

1. Vorherige Version und vollständige Sicherung bereithalten. Ohne Lizenz starten:
   keine Zeitpläne, keine neuen Backups, kein Restore/Dateiserver.
2. In eos-admin Home oder Pro aktivieren: Backup aktiviert sich automatisch.
   Manuelle und geplante Sicherung einschließlich EOS-Profil prüfen.
3. Zentrale Freigabe entziehen: neue Aufgaben werden verweigert, ein bereits
   gestartetes Archiv darf fertig werden. Erneute Aktivierung stellt Zeitpläne
   wieder her, ohne alten Restore zu wiederholen.
4. Native ioBroker-/Redis-Restoreanforderung prüfen: sofortige feste Meldung
   `EOS_OPERATOR_RECOVERY_REQUIRED`, kein Download/Staging/Service-Stopp.
   Recovery ausschließlich über den separat autorisierten Hostweg auf dem
   getrennten Abbild durchführen. Nach Wiederanlauf gilt wieder die zentrale Lizenz.

Pi-/systemd-/Anlagen- und realer Restoretest wurden in der Entwicklungsumgebung
nicht ausgeführt. Keine Produktions- oder Konformitätsfreigabe wird daraus abgeleitet.
