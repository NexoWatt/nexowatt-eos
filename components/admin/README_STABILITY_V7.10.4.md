# NexoWatt EOS Admin 7.10.4 – Stabilitäts- und Sicherheitsstand

Version 7.10.4 baut auf dem absturz- und publish-sicheren Stand 7.10.3 auf. Die automatische Update-Karte bleibt ausschließlich in den Systemeinstellungen hinter dem Schraubenschlüssel.

Zusätzlich gilt eine rollenbasierte Sicherheitsgrenze:

- Administrator: vollständiger Zugriff einschließlich App-Center, Lizenz, Simulation, Expertenmodus, Benutzer/Rechte, ioBroker Admin und XTerm.
- Installateur: technische Bedienoberfläche ohne App-Center, Lizenz, Simulation, Expertenmodus, Benutzer/Rechte, ioBroker Admin und XTerm.
- Endkunde: Cockpit, Smart Home und Datenpunkte mit Nur-Lesezugriff; keine Schreib-, Rechte-, Passwort- oder Expertenfunktionen.
- Sicherung: Navigation nur bei installierter und aktivierter Backup-Instanz.

Die Sperren werden nicht nur optisch, sondern zusätzlich im EOS-HTTP-Guard und über die Endkunden-ACLs durchgesetzt.
