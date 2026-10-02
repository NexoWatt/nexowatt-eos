# Installation, Test und Rückfall – 7.10.10

**Integrations-Teststand, keine Serienfreigabe.** Basis ist ausschließlich das hochgeladene 7.10.9-Repository. Kein Wechsel auf Admin 8. Aktueller Keygen, öffentliche Hersteller-Schlüssel, weitere Adapter und eine reale Anlage waren nicht verfügbar. Standardzugang des vorhandenen Administrators muss vor dem Update funktionieren.

1. Vollständige verschlüsselte ioBroker-/OS-Sicherung erstellen, vorhandene Adapterversion 7.10.9 und originale Repository-ZIP aufbewahren. Rückfallzugang über lokale OS-Konsole vorab prüfen. Kein erster Test ohne erreichbaren Administratorzugang.
2. Zielprofil Linux mit aktuell gepflegtem Node 22 oder 24, konkrete js-controller-/Adapterversionen erfassen. Prüfen, dass das Lizenzdatenverzeichnis privat angelegt werden kann. Keine unverstandenen Dateirechte global verändern.
3. Zuerst getrennte Testinstanz verwenden. Das Paket enthält den vorgebauten Backendstand und die bestehende Frontendbasis. Abhängigkeiten müssen in einer Umgebung mit Registry-Zugriff frisch installiert und geprüft werden. Dieser Lauf konnte weder npm ci noch vollständiges tsc/Live-Start durchführen; im Lockfile fehlen zahlreiche Integritätsangaben. Das ist vor Veröffentlichung aufzulösen.
4. Das Paket kann zur lokalen Integration installiert werden; daraus folgt keine Produktivfreigabe. Nicht unbesehen auf latest veröffentlichen. Veröffentlichungs- und Updatekanal vor dem eigenen Publish prüfen.
5. Neue bzw. bisher mit gemeinsamem Startpasswort versehene Konten installer/guest/user werden gesperrt; persönliche geänderte Kennwörter bleiben erhalten. Administrator weist ein individuelles temporäres Kennwort über die Benutzerverwaltung zu. Das temporäre Kennwort nur gesichert übergeben und bei erster Nutzung ändern. Die frühere gemeinsame Startpasswort-Anmeldung ist bewusst nicht mehr gültig.
6. HTTPS im Admin mit gültigem Zertifikat einrichten. Lizenzverwaltung `/nexowatt/license` als Administrator öffnen. HTTP über LAN wird dort abgewiesen. Auf einem System ohne HTTPS ist der Zugriff nur lokal über Loopback vorgesehen. Reverse-Proxys brauchen ein gesondert geprüftes TLS-/Host-Konzept, keine ungeprüfte Forwarded-Header-Freigabe.
7. Öffentlichen Herstellerschlüssel OS-seitig provisionieren, Admin neu starten. Dann einen echten, mit dem angepassten Keygen signierten NWL2-Home-/Pro-Code für die angezeigte UUID importieren. Dies ist bis zur Keygen-Bereitstellung ein offener Integrationstest.
8. Mit dem SDK den ersten Verbraucheradapter anbinden. Ohne Lizenz keine fachliche Schreibaktion. Home/Pro, Adapterliste und Mengenlimits an echten Konfigurationen prüfen. Die ZIP allein ändert andere bereits installierte Adapter **nicht**.

## Erwartete Negativfälle auf dem Testsystem

- Falsche UUID, veränderte Edition/Limits/Signatur, fremder Prüf-Schlüssel, abgelaufene Lizenz: keine Freigabe.
- Fehlende, gelöschte oder beschädigte Lizenzdatei: keine Freigabe; kein Absturz des Admin.
- Admin-Neustart oder Kommunikationsverlust: Verbraucher erkennt Verlust spätestens mit Ablauf der maximal 15-Sekunden-Freigabe und setzt den vorab definierten sicheren Zustand um.
- Home darf keinen Microgrid-Master und keine Pro-Abrechnung erhalten. Home >3 Ladepunkte/>2 Speicher und Pro >10 Speicher ablehnen.
- Nicht angemeldete Nutzer, Endkunde und Installateur dürfen keine Lizenz importieren/entfernen oder Upload-/OS-Befehlszugänge nutzen. Lizenzstatus enthält keinen Rohschlüssel.
- Abgelaufene/deaktivierte Sitzung, falscher Origin und manipulierter Forwarded-Host: kein privilegierter Zugriff.
- Fehler bei Eingabe einer neuen Lizenz erhält die bisherige gültige Lizenz.
- Bei Verlust einer Lizenz niemals Netzschutz, physische Grenzwerte oder notwendige Notbetriebsregelung ungeprüft abschalten.

Ergebnisse mit Versionen, Gerät, Uhrzeit, Soll/Ist und bereinigten Logs in `reports/security/` ergänzen. Ein Mocktest ist kein Hausanlagentest. Noch offen sind vollständige OAuth-Sitzungswiderrufe nach Passwortreset, reale Socket-/Controller-Berechtigungen und Transport-/Backup-Wiederherstellung; Details im Auditbericht.

## Rückfall

Admin stoppen, vorherigen vollständigen Adapterstand und bei Bedarf die konsistente vorherige Konfiguration aus Sicherung wiederherstellen. Das neue Lizenzverzeichnis nicht einzeln halb zurückkopieren. Kein Downgrade darf als Behebung einer festgestellten Sicherheitslücke gelten; vorübergehenden Rückfall als Risiko erfassen. Physische Schutzsysteme und gerätespezifische Rückfallgrenzen unabhängig vom Admin sicherstellen.
