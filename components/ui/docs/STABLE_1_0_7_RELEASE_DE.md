# NexoWatt EOS 1.0.7

Diese offizielle Stable-Version ergänzt direkten E-Mail-Versand ohne ioBroker-E-Mail-Adapter. Grundlage ist das vollständige Repository 1.0.6 einschließlich der AC/DC-Grenzwerte und Speicherschutzkorrekturen.

## Einrichtung

1. Als Admin oder Installateur im App-Center „E-Mail-Versand einrichten“ öffnen.
2. SMTP-Server, Port, Benutzer und Passwort bzw. App-Passwort des Mailanbieters hinterlegen. Als Absender ist `info@nexowatt.com` festgelegt; das SMTP-Konto muss diesen Absender erlauben. TLS auf Port 465 oder verpflichtendes STARTTLS auf Port 587 wählen, sofern der Anbieter diese Einstellungen vorgibt. Zertifikate werden geprüft; unverschlüsselte Übertragung ist nicht verfügbar.
3. Optional einen eindeutigen Anlagennamen eintragen und den Versand aktivieren.
4. Unter Kunden-Einstellungen → Benachrichtigungen die einzelne Kundenadresse speichern, gewünschte Kategorien wählen und Benachrichtigungen aktivieren.
5. „Test-Mail senden“ ausführen und den tatsächlichen Eingang prüfen. Die Erfolgsmeldung bestätigt die Annahme durch den Mailserver. Sie bestätigt noch nicht die Zustellung ins Postfach.

In dieser ZIP sind keine SMTP-Zugangsdaten enthalten. Die E-Mail-Adresse allein reicht zur Anmeldung beim Mailanbieter nicht aus. Das Passwort wird ausschließlich auf der Anlage im geschützten Installerbereich eingetragen und niemals an den Browser zurückgegeben. Ein leeres Passwortfeld behält das bestehende Passwort bei. Zum Löschen zuerst den Versand deaktivieren und die Löschoption wählen.

## Meldungen und Zeitverhalten

| Klasse | Versand | Beispiele |
| --- | --- | --- |
| Harter Fehler | Sofort bei Erkennung, ohne zusätzliche Wartefrist | Fehler aktiver wichtiger Regelungsmodule, ausgefallener verwendeter Adapter, bestätigter Stations-/Speicherfehler, Sicherheitsbetrieb der Netzregelung |
| Normaler Fehler | Gesammelt alle 30 Minuten | Kommunikationsverlust, veraltete Ladedaten, fehlgeschlagene Ladebefehle, keine Ladeleistung trotz bestätigtem Bedarf und Freigabe |
| Übrige Meldungen | Tageszusammenfassung, frühestens alle 24 Stunden | Entwarnungen, Hinweise und Erinnerungen an fortbestehende harte Störungen |

Der Beobachter läuft unabhängig vom Regelzyklus alle zehn Sekunden. Beim Adapterstart gilt eine einmalige Anlaufphase von 30 Sekunden. „Sofort“ bedeutet den nächsten Beobachterlauf nach Erkennung. EMS-Stillstand wird nach mehr als zwei Minuten ohne Regelzyklus erkannt; fehlende Netzmesswerte nach mehr als fünf Minuten. Anschließend erfolgt keine zusätzliche Minutenverzögerung für diese harten Fehler.

Nur konfigurierte, aktive und relevante Datenquellen werden überwacht. Reguläres Ladeende, Kunden-Stopp, fehlender Ladebedarf, PV-Pausen und Phasenwechsel erzeugen keine Abbruchmeldung. Eine generische Station ohne verwertbare Fehler-/Bedarfsrückmeldung lässt sich nicht zuverlässig als abgebrochen klassifizieren. Netzabhängige Kommunikationsstörungen werden soweit zuordenbar beim ausgefallenen übergeordneten Adapter gebündelt. Die Kategorien können kundenseitig abgeschaltet werden.

Gleichzeitig anstehende Meldungen werden gebündelt. Fortbestehende normale Fehler erscheinen gesammelt alle 30 Minuten; derselbe harte Fehler wird frühestens nach 24 Stunden erinnert. Normale Fehler müssen mindestens eine Minute durchgehend vorliegen, um kurze Schwankungen auszufiltern; versandt werden sie erst im nächsten 30-Minuten-Sammellauf. Neue harte Fehler warten niemals auf diesen Sammellauf. Kurzes Hin- und Herschalten erzeugt keine neue Alarmserie. Eine Verschärfung zum harten Fehler sowie ein neuer Fehler nach mindestens fünf Minuten stabiler Wiederkehr werden erneut sofort gemeldet. Entwarnungen werden erst nach fünf Minuten stabiler Wiederkehr vorgemerkt und nur in der Tageszusammenfassung versandt. Es wird keine leere tägliche E-Mail geschickt.

Bei SMTP-Fehlern bleibt die Meldung offen. Wiederholversuche erfolgen mit wachsendem Abstand von zwei bis höchstens 60 Minuten; auch neue Meldungen warten bei nicht erreichbarem Mailserver auf den nächsten Versuch. Versandstatus und Störungshistorie überstehen Adapterneustarts. Inzwischen behobene, noch nicht zugestellte harte Fehler bleiben zur Nachmeldung vorgemerkt und werden ausdrücklich als zwischenzeitlich behoben gekennzeichnet. Testmails sind auf frühestens alle fünf Minuten und maximal drei pro Stunde begrenzt; diese Testbegrenzung bremst reguläre Alarme nicht aus.

## Betrieb und Schutz

SMTP-Einstellungen liegen AES-256-GCM-verschlüsselt mit restriktiven Dateirechten im ioBroker-Instanzdatenverzeichnis. Der Schlüssel wird aus dem ioBroker-Systemschlüssel abgeleitet. Instanzdaten und Systemschlüssel müssen gemeinsam gesichert werden. SMTP-Daten werden weder im allgemeinen Konfigurationsexport noch in Kunden-States abgelegt. Die neue API erfordert eine strikte Admin-/Installer-Sitzung, auch bei deaktivierter allgemeiner Kundenanmeldung.

Die Überwachung schreibt keine Lade- oder Leistungsbefehle. Ein vollständiger Rechner-, Strom- oder Internetausfall kann von diesem Gerät selbst nicht per E-Mail gemeldet werden. Dafür wäre eine separate externe Überwachung erforderlich.

## Validierung

`npm run test:stable-1.0.7-notifications` prüft die Zeitklassen, Eskalation, dauerhaften Wiederholschutz, Flattern, Entwarnungen, Kategorien, parallele Aufrufe, Verschlüsselung und SMTP-Annahme/Ablehnung an einem lokalen Mailserver. Zusätzlich werden Produktions-TLS-Einstellungen und die Auswertung von Modul-, Adapter-, Speicher- und Ladepunktfehlern geprüft. Der Test gehört zu `test:all`; die bisherigen AC/DC-Regressionen bleiben enthalten.

Eine Anmeldung am produktiven Mailserver von NexoWatt und ein Zustelltest beim Kunden benötigen die Anlagenkonfiguration. Sie wurden ohne diese Zugangsdaten nicht durchgeführt. Ein Live-Test an der Projekt-Ladestation ist weiterhin Teil der Inbetriebnahme.

### Prüfergebnis dieser Bearbeitung

- Vollständiger `npm run test:all` mit verfügbarem Chromium erfolgreich, einschließlich AC/DC-, Speicher-, Netzschutz- und Benachrichtigungsregressionen.
- Neue React-Einrichtungsseite im echten Chromium mit lokaler API geprüft: Zugriffssperre, Speichern, Passwortbeibehaltung bei leerem Feld, Fehleranzeige, Sitzungsverlust und Mobilansicht.
- Paket-Startprüfung erfolgreich: 193 JS/MJS-Dateien, relative Abhängigkeiten und Adapter-/EMS-/§14a-Startkette.
- SMTP-Annahme und -Ablehnung wurden ausschließlich gegen einen lokalen Testserver geprüft. Produktionszugangsdaten und eine echte Kundenzustellung sind nicht Bestandteil dieser Prüfung.
