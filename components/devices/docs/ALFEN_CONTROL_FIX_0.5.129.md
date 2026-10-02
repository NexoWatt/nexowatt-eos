# Alfen Control Fix 0.5.129

Ziel dieser Version: Die Alfen ACE Wallbox zuverlässig per Modbus TCP im EMS-Socket-Modus steuern.

## Was geändert wurde

- Alfen-Templates auf die relevanten Steuer-/Rückmelde-Register reduziert.
- Socket 1: Unit-ID 1, Socket 2: Unit-ID 2, Station-Infos: Unit-ID 200.
- Max Current wird über FC16 auf Protokolladresse 1209 geschrieben.
- Positive Strombefehle 1..5 A werden auf 6 A normalisiert; 0 A bleibt Stop.
- Max Current wird alle 5 s aus dem letzten Kommando erneut geschrieben, damit die Alfen-Validity-Time nicht abläuft.
- Phasenumschaltung wird nur bei explizitem Kommando und einmaliger Wiederholung geschrieben; kein zyklisches Phasen-Spamming.
- Automatische Socket2-/SCN-Mirror-Writes sind im Control-only-Profil deaktiviert.

## ioBroker Nutzung

Für eine einzelne / linke Dose bitte verwenden:

`Alfen NG9xx (ACE) Socket 1 / CONTROL ONLY (Modbus TCP)`

Danach steuern über:

- `aliases.ctrl.currentLimitA` -> 0 = Stop, 6..80 = Freigabe/Stromlimit
- `aliases.ctrl.run` -> false = 0 A, true = letzter Strom oder 6 A
- `aliases.r.setpointAccountedFor` -> muss `true` werden, sonst übernimmt die Wallbox den Setpoint nicht
- `aliases.r.appliedCurrentLimitA` -> Rückmeldung des tatsächlich angewendeten Max Current

## Alfen muss passend konfiguriert sein

In ACE Service Installer / Eve Install muss die Wallbox im EMS-/Socket-Modus laufen: Active Load Balancing aktiv, Data Source = Energy Management System, Modbus TCP/IP, **Allow reading**, **Allow writing maximum currents**, **Enable sockets**, TCP/IP EMS Control Mode = Socket und Safe Current gesetzt. Der 0.5.140-Audit ergänzt ausdrücklich `Enable sockets`, weil ACE den empfangenen Socket-Sollwert sonst nicht in die Berechnung übernimmt.
