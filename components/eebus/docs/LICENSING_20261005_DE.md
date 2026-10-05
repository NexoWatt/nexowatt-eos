# EOS-Lizenzintegration EEBUS: Änderung und Prüfung

Stand: 05.10.2026; Quellbasis `4e171e4` plus dieser Arbeitsstand. Node.js 24.19.0,
Linux x64. Anforderungen: EOS-Laufzeitbindung, zentrale Home-/Pro-Freigabe,
keine neuen Geräteaktionen ohne frische Freigabe, keine pauschale physische
Abschaltung bei Lizenzverlust. Die lokale Messagebox ist keine Sicherheitsgrenze
gegen kompromittierte Adapter unter derselben OS-Identität. Der gebündelte
Client 1.0.2 enthält keine Lizenzschlüssel oder Tokens und prüft die geschützte
aktive EOS-Release-/Profilbindung vor Start und bei jeder Lease-Erneuerung.

Der vollständige Client liegt in `packages/eos-license-client` und wird direkt
relativ geladen. Die npm-Dateiliste enthält JavaScript, Plattformprüfung,
Deklaration und Paketmanifest; es entsteht keine neue npm-Laufzeitabhängigkeit.
Quellcode-Dateihashes und bereinigte Testausgabe liegen unter
`reports/licensing-20261005/`. Unveränderte historische Prüfungen und Hinweise
behalten ihre eigenen Geltungsbereiche.

## Änderung und Sicherheitswirkung

Der Start wartet auf die zentrale `energy`-Freigabe von `eos-admin.0`; spätere
Aktivierung startet den Adapter automatisch ohne erneute Konfiguration. Jede
Bedienänderung (einschließlich Pairing), der unmittelbare SPINE-Schreibpunkt und
der direkte CLS→EOS-Versand prüfen die aktuelle Freigabe. Ein Lizenzwechsel
zwischen asynchroner DB-/Trust-Arbeit und dem Versand wird erneut geprüft.

Bestehende SHIP-Sitzungen, Messdaten, Handshake und korrelierte Ergebnisse
bereits abgesandter Befehle bleiben erhalten. Lizenzverlust sendet weder einen
Stop noch eine Freigabe/Limitänderung an Geräte. Erinnerte LPC-/Failsafe- und
Gültigkeits-Folgeaktionen werden verworfen, damit die Reaktivierung keine alten
Befehle nachholt. Bereits wirksame Gerätebegrenzungen bleiben bestehen; eine
frische, gültig lizenzierte Anweisung ist für neue Regelaktionen erforderlich.
Das sichere physische Verhalten bleibt durch die Geräte und die Anlagenplanung
abzusichern; diese Änderung ist keine neue geräteseitige Schutzfunktion.

## Ausgeführte Prüfung

`npm test` **BESTANDEN**: TypeScript-Build; Konfiguration, CLS-Parser,
direkte Bridge und Ergebnisreihenfolge; 50 Paketmetadatenprüfungen;
21 SHIP-Sicherheits-/Ressourcenprüfungen; 6 Lizenzregressionen. Die Lizenztests
prüfen gesperrten Start, spätere Aktivierung, erneute Prüfung unmittelbar vor
Schreiben, zentrale Bridge-Grenze, Protokollerhalt und kein altes Replay.
Der SHIP-Ressourcentest enthält einen lokalen echten TLS/WebSocket-Fehlerfall;
daraus folgt keine reale Gerätefreigabe. Der bisher mit Node aufgerufene
Mocha-Pakettest wurde auf den tatsächlichen Runner korrigiert; die bereits im
Lock vorhandene Mocha-Version 11.8.0 ist nun explizite Testabhängigkeit.
Paket-Lizenzmetadaten und der Produkttitel erfüllen jetzt den Paketvalidator.

## Offene Prüfung und Rückfall

**OFFEN:** Raspberry Pi, systemd/controller mit echtem EOS-Profil, kombinierter
realer EOS-Admin-/Adapter-Lizenzwechsel und SHIP/SPINE/CLS-Hardware einschließlich
Erneuerung während aktiver §14a-Regelung. Die lokalen Tests sind keine Anlagen-,
Produktions-, CRA- oder IEC-Freigabe. Vor einem Anlagenversuch gesicherten
Rückfallstand und bestehende Gerätebegrenzungen dokumentieren.

Anlagenversuch: Backup und Stand dokumentieren; innerhalb EOS ohne Lizenz starten
(keine Endpunkte/Steuerung), zentral aktivieren (automatischer Start), frischen
zulässigen Testbefehl senden, zentral sperren (keine neuen Schreibtelegramme,
Telemetry/Resultate weiter), erneut aktivieren (keine alten Folgebefehle), neuen
Befehl bewusst senden. Gerätefirmware, Soll-/Ist-Verhalten und bereinigte Logs
festhalten. Bei Abweichung auf den gesicherten EOS-Lieferstand zurückfallen;
keine manuelle Umgehung des Plattform- oder Lizenzguards einrichten.
