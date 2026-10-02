# NexoWatt EOS Admin 7.9.87-rc.4 – Verkaufsprodukt Release Candidate

Diese Version basiert ausschließlich auf der freigegebenen Stable **7.9.86**. Sie ergänzt das produktive Rollenmodell, die verpflichtende Passwortvergabe bei der ersten Anmeldung und die NexoWatt-EOS-Produktdarstellung. Die Version wird erst nach Labor- und Feldabnahme unverändert als **7.9.87 Stable** freigegeben.

## Rollen und Rechte

### Admin / NexoWatt Service

- vollständige System-, Sicherheits-, Benutzer- und Adapterverwaltung
- vollständige Diagnose- und Servicefunktionen
- Expertenmodus und sicherheitsrelevante Rohzugriffe
- bestehendes, von NexoWatt gesetztes Administratorkonto bleibt unverändert
- keine erzwungene Passwortänderung durch den Erstlogin-Assistenten

### Installateur

- Inbetriebnahme und Fehlersuche
- Adapter- und Instanzkonfiguration
- Geräteintegration, Logs, Datenpunkte und freigegebene Schreibzugriffe
- sichere Basis-Einstellungen über eine eigene gefilterte Oberfläche
- Smart-Home-, Raum- und Funktionszuordnung
- kein Expertenmodus
- keine Benutzer-/Gruppenverwaltung, Zertifikate, Zugangsdaten, Repositoryquellen, Standard-ACL oder globale Sicherheitsverwaltung

### Endkunde

- Zugang zum EOS Admin
- Smart-Home-Konfiguration
- Raum- und Funktionszuordnung
- freigegebene NexoWatt-UI-Bereiche
- nur freigegebene Bedien- und Zuordnungsfunktionen
- kein Expertenmodus und keine technischen Systembereiche

## Erste Anmeldung

Die vorbereiteten Konten `installer` und `guest` werden bei der allerersten Aktivierung ohne bestehendes Kennwort übernommen. Dieser eng begrenzte Aktivierungsweg erzeugt keine normale EOS-Sitzung; unmittelbar danach muss ein persönliches Passwort festgelegt werden. Die Einrichtung ist serverseitig geschützt und verlangt:

- mindestens 10 Zeichen
- Groß- und Kleinbuchstaben
- mindestens eine Zahl
- mindestens ein Sonderzeichen
- keine trivialen Standardpasswörter oder Benutzernamenbestandteile

Nach dem erfolgreichen Setzen des Passworts wird die Aktivierung beendet. Die nächste normale Anmeldung erfolgt mit dem neu gewählten Passwort. Admin-/Servicekonten sind von diesem Ablauf ausgenommen. Admin/Service kann `installer` und verwaltete Endkundenkonten zurücksetzen; Installateure können ausschließlich verwaltete Endkundenkonten zurücksetzen. Ein Reset macht das bisherige Passwort ungültig und öffnet die einmalige Aktivierung erneut.

## Produktsicherheit

- authentifizierter Zugriff ist bei neuen Installationen standardmäßig aktiv
- Expertenmodus wird für Installateur und Endkunde auf UI- und Policy-Ebene fest deaktiviert
- direkte URL-Aufrufe nicht erlaubter Bereiche werden abgefangen
- die Rollenprüfung schlägt bei nicht lesbarem Sicherheitskontext geschlossen fehl
- Systemkonfiguration und Repository-Metadaten sind für die Shell lesbar, aber nur durch Admin/Service direkt beschreibbar
- Zertifikate, Plattformlizenzen und Zugangsdaten bleiben Admin/Service vorbehalten
- Schreibzugriffe werden nicht allein durch ausgeblendete Schaltflächen geschützt

## Produktdarstellung

Kundensichtbare Titel, Beschriftungen, Fehlermeldungen und Loginflächen verwenden **NexoWatt EOS**. Technisch erforderliche Paketnamen, API-Pfade, Kompatibilitätskennungen und Drittanbieter-Lizenzhinweise bleiben intern erhalten, damit der Systemunterbau und ältere Adapter kompatibel bleiben.

## Veröffentlichungskanal

- npm `latest` zeigt für die kontrollierte Produktabnahme auf 7.9.87-rc.4
- nur die exakt akzeptierte RC4-Version darf den `latest`-Kanal verwenden
- 7.9.86 bleibt jederzeit als exakte Rückfallversion verfügbar

## Pflichtabnahme vor Stable

- Admin-/Serviceanmeldung bleibt unverändert
- Installateur: Erstlogin, Passwortvergabe, Logout und erneute Anmeldung
- Endkunde: Erstlogin, Passwortvergabe, Logout und erneute Anmeldung
- Installateur kann alle Inbetriebnahme- und Diagnosebereiche verwenden
- Endkunde kann Smart Home, Räume, Funktionen und freigegebene UI-Bereiche verwenden
- Installateur und Endkunde können den Expertenmodus nicht aktivieren
- ausgeblendete Bereiche bleiben auch über direkte URLs gesperrt
- Basis-Einstellungen speichern nur die freigegebenen Felder
- Adapter-, Instanz-, Popup-, Datenpunkt- und Updatefunktionen bleiben stabil
- Neustart des Controllers und vollständiger Systemneustart
- Update von 7.9.86 auf RC4
- Rückkehr von RC4 auf 7.9.86


## npm Veröffentlichung über latest

Die Version 7.9.87-rc.4 wird auf ausdrückliche Produktentscheidung über den npm-Dist-Tag `latest` verteilt. `.npmrc`, `publishConfig` und der Publish-Guard verlangen deshalb `latest`. Der Guard akzeptiert dabei ausschließlich die exakt in `nexowattReleasePolicy.acceptedPrerelease` eingetragene RC4-Version; ein späterer Versionssprung kann `latest` nicht unbeabsichtigt verschieben. Die exakte Rückfallversion 7.9.86 bleibt weiterhin mit `iobroker.eos-admin@7.9.86` installierbar.


## Standardport 8081

Neue EOS-Admin-Instanzen verwenden standardmäßig Port `8081`. Vor der Aktivierung muss der interne Legacy-Admin durch den EOS-Installer bzw. die Sicherheitsroutine auf `127.0.0.1:18081` verschoben und deaktiviert werden, damit kein Portkonflikt entsteht.


## Passwortlose erste Aktivierung

Die Konten `installer` und `guest` erhalten kein öffentlich bekanntes leeres Kennwort. Bei der allerersten Aktivierung wird auf der Anmeldeseite ein enger, einmaliger Aktivierungsweg ohne vorhandenes Kennwort angeboten. Das Backend ersetzt leere Kennwörter vorher durch ein unbekanntes Zufallsgeheimnis; der Aktivierungsweg vergibt nur einen kurzlebigen HttpOnly-Claim und öffnet keine normale EOS-Sitzung. Danach ist sofort ein persönliches Kennwort erforderlich.

Admin/Service kann Installateur- und Endkunden-Zugänge zurücksetzen. Installateure können ausschließlich explizit zugeordnete Endkunden-Zugänge zurücksetzen. Admin-, Service-, fremde und nicht ausdrücklich verwaltete Konten sind ausgeschlossen.

## Modernisierte Oberfläche

Anmeldung, Erstaktivierung, Zugangsverwaltung, Dialoge, Karten, Tabellen, Fokuszustände und mobile Darstellung nutzen eine einheitliche moderne NexoWatt-EOS-Produktschicht. Das technische Objekt-, State-, Adapter- und Instanzmodell bleibt unverändert kompatibel.
