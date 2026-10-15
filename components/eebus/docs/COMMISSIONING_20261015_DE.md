# EEBUS: passiver Erststart und Stopprennen

Stand 15.10.2026, Quellbasis e4616fec2a56cd7c6c013df090bdda00a0c37f54.
Ziel: neue Eigentestinstanzen dürfen trotz falscher `announceShipService`-Vorgabe
keine Migration oder Schlüsselgenerierung auslösen. Das Flag wird vom getrennten
EOS-Enrollment auf `false` gesetzt; hier wird kein globaler Legacy-Default geändert.

`false` und typfalsche definierte Werte bleiben passiv. Nur `true` beziehungsweise
das bei Altinstanzen fehlende Feld erlauben den bisherigen Startpfad. Ein
read-only Status und eine explizite negative Messageantwort vermeiden scheinbare
Betriebsbereitschaft. Alle bisherigen Lizenz-/Trust-/Dry-Run-Grenzen bleiben bestehen.

Start und Ready werden als Promise verfolgt. Unload setzt zuerst das Stoppsignal,
wartet die laufenden Schritte ab und stoppt dann Guard und Runtime. Kontrollpunkte
nach asynchronen Aufrufen verhindern neue Runtime-/Konfigurationsschritte nach
dem Stoppsignal. Bereits gestartete Schlüsselgenerierung wird nicht gewaltsam
abgebrochen; vor deren Abschluss wird kein erfolgreicher Unload gemeldet.
Ein separates Ready-Gate weist Messages und State-Eingaben zurück, solange
Runtime-Start, Subscriptions oder Ready-Status noch nicht abgeschlossen sind.
Bei Fehler/Unload schließt dieses Gate vor der asynchronen Bereinigung.

Tatsächlich lokal geprüft: Linux x64, Node 24.19.0, gelockter TypeScript-Build.
`npm test`: Build, vier bestehende Config-/CLS-/Bridge-/Reihenfolge-Skripte,
50 Paketprüfungen, 21 Securityprüfungen, 19 Lizenz-/Commissioningtests bestanden.
Davon 13 neue Fälle: sieben passive/malformed Flags, Legacy/true Einmalstart,
Unload während Lizenzstart, Identitätserzeugung und Konfigurationsread.
Ein zusätzlicher Barrieretest prüft gesperrte Messages/State-Eingaben während
`runtime.start()` und Unload sowie die Freigabe erst nach Ready. Neue
Starttests verwenden kontrollierte DB-/Identitäts-/Runtime-Testdoubles, kein Pi.
Bestehender Securitylauf enthält einen echten lokalen TLS/WebSocket-Test.
Rohprotokoll: `reports/commissioning-20261015/test.log`.

Offen: tatsächliche ARM64/systemd-Abnahme und jedes reale SHIP/SPINE-Gerät,
offizieller IANA-PEN, Zeit-/Regelverhalten. Kein 100%-Versprechen, keine CRA-
Gesamtkonformität, keine automatische Anlagensteuerungs-/Produktionsfreigabe.
