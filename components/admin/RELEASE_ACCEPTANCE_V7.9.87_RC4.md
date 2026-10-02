# NexoWatt EOS Admin 7.9.87-rc.4 – Freigabe- und Feldabnahme

## Freigabestatus

Diese Version ist der vollständige Release Candidate für die Produktlinie auf Basis von EOS Admin 7.
Die unveränderte Version 7.9.86 bleibt bis zur bestandenen Anlagen- und Feldabnahme die offizielle
Stable- und Rückfallversion. Nach erfolgreicher Abnahme wird derselbe Funktionsstand ausschließlich
mit finalen Versions- und Release-Metadaten als 7.9.87 Stable veröffentlicht.

## Vorbereitung

- vollständiges Systembackup erstellen
- aktuelle Stable-Version und Controllerzustand dokumentieren
- je ein separates Konto für Admin/Service, Installateur und Endkunde verwenden
- Browsercache nach dem Update vollständig neu laden
- Test nicht auf der einzigen produktiven Kundenanlage beginnen

## Installation und Rückfall

Die Installations- und Rückfallbefehle stehen in `INSTALL_TEST_V7.9.87_RC4.md`.

## Abnahme Admin / NexoWatt Service

- [ ] bestehendes festgelegtes Admin-Kennwort bleibt gültig
- [ ] keine erzwungene Passwort-Neuvergabe
- [ ] sämtliche Verwaltungsbereiche sind sichtbar
- [ ] Expertenmodus lässt sich ein- und ausschalten
- [ ] Benutzer, Gruppen, Sicherheit, Zertifikate, Zugangsdaten und Repositories sind erreichbar
- [ ] geschützte EOS-Systemmodule bleiben updatefähig, aber gegen unbeabsichtigtes Löschen geschützt
- [ ] zusätzlicher NexoWatt-Servicebenutzer funktioniert auch mit älteren Adapter-Konfigurationen
- [ ] Admin/Service kann Installateur- und Endkunden-/Guest-Zugänge zurücksetzen; Admin/Service selbst bleibt ausgeschlossen

## Abnahme Installateur

- [ ] „Erstanmeldung ohne Passwort“ übernimmt ausschließlich das vorbereitete Konto `installer`
- [ ] unmittelbar danach ist ein eigenes Kennwort mit Mindestlänge und Komplexitätsregeln Pflicht
- [ ] die Aktivierung erzeugt vor der Passwortvergabe keine normale EOS-Sitzung
- [ ] erneute Anmeldung funktioniert nur mit dem neuen Kennwort
- [ ] Inbetriebnahme, Adapter, Instanzen, Logs, Datenpunkte und Geräte-Konfigurationen sind erreichbar
- [ ] sichere Basis-Einstellungen lassen sich speichern
- [ ] Smart-Home-Räume und Funktionen lassen sich zuordnen
- [ ] Expertenmodus ist unsichtbar und über LocalStorage oder Direktaufruf nicht aktivierbar
- [ ] Benutzer, Gruppen, Zertifikate, Zugangsdaten, Repositories, Standard-ACL und globale Sicherheit bleiben verborgen
- [ ] beliebige Shell-Kommandos werden abgelehnt
- [ ] nur erlaubte Inbetriebnahme-Kommandos funktionieren
- [ ] geschützte EOS-Kernmodule können nicht gelöscht oder unkontrolliert ersetzt werden
- [ ] Installateur kann Endkunden-/Guest-Passwort zurücksetzen, aber weder Installateur- noch Admin-/Servicekonten

## Abnahme Endkunde

- [ ] „Erstanmeldung ohne Passwort“ übernimmt ausschließlich das vorbereitete Konto `guest`
- [ ] unmittelbar danach ist die persönliche Passwortvergabe Pflicht; vorher entsteht keine normale EOS-Sitzung
- [ ] EOS Cockpit und freigegebene NexoWatt-UI-Bereiche sind erreichbar
- [ ] Smart-Home-Räume und Funktionen lassen sich im freigegebenen Umfang zuordnen
- [ ] nur durch ACL/Freigabe erlaubte Bedienwerte lassen sich schreiben
- [ ] keine Adapter-, Instanz-, Log-, Benutzer-, Repository- oder Systemverwaltung ist sichtbar
- [ ] Expertenmodus bleibt auch bei manipuliertem Browser-LocalStorage deaktiviert
- [ ] direkte URL-Aufrufe gesperrter Bereiche werden auf eine erlaubte Seite zurückgeführt

## Funktions- und Regressionstest

- [ ] Adapter-Suche und Installationsdialog funktionieren
- [ ] alle Dialoge und Schließen-Schaltflächen reagieren
- [ ] Instanz-Konfigurationen alter und neuer Adapter öffnen
- [ ] klassische `index.html`/`index_m.html`-Konfigurationen funktionieren
- [ ] JSON-Config-Konfigurationen funktionieren
- [ ] beschreibbare Boolean-, Number-, String-, Enum-, JSON- und Button-Datenpunkte funktionieren
- [ ] Wertespalte und Bedienelemente sind korrekt ausgerichtet
- [ ] Logs werden für Admin und Installateur aktualisiert
- [ ] Benutzer erhalten keine `permissionError`-Leerseite
- [ ] EOS Assist öffnet ohne das entfernte Fremd-Chatpanel
- [ ] Login, Logout und erneute Anmeldung funktionieren
- [ ] Neustart von `eos-admin.0` funktioniert
- [ ] vollständiger Controller-Neustart funktioniert
- [ ] Update von 7.9.86 auf 7.9.87-rc.4 erhält Einstellungen und Rollen
- [ ] Rückfall auf 7.9.86 funktioniert
- [ ] mindestens 24 Stunden Dauerbetrieb ohne wachsenden Fehler- oder Speichertrend

## Produkt- und Brandingprüfung

- [ ] Login, Seitentitel, Navigation, Meldungen und Hilfetexte zeigen NexoWatt EOS
- [ ] in der normalen Kundenoberfläche erscheint keine fremde Plattformmarke
- [ ] technische Paketnamen, Protokollpfade und Drittanbieter-Lizenzhinweise bleiben intern unverändert,
      damit Adapter- und Controller-Kompatibilität erhalten bleibt

## Freigabeblocker

Die Version darf nicht als Stable veröffentlicht werden, wenn einer der folgenden Punkte auftritt:

- Rollen- oder Passwortschutz lässt sich umgehen
- Installateur oder Endkunde erreicht Experten-, Benutzer-, ACL-, Zertifikats- oder Zugangsdatenbereiche
- ein nicht freigegebener Schreibzugriff ist möglich
- bestehende Adapter-Konfigurationen öffnen nicht mehr
- Update oder Rückfall ist nicht reproduzierbar
- EOS Admin startet nach Controller-Neustart nicht zuverlässig
- sichtbare Kundenoberflächen enthalten falsches Branding

## Stable-Promotion

Erst nach vollständig dokumentierter Abnahme werden Versionsnummer, News, Repository-Eintrag und
Releasekanal auf `7.9.87` gesetzt. Die getestete Programmlogik bleibt dabei unverändert.

## npm Veröffentlichung über latest

Die Version 7.9.87-rc.4 wird auf ausdrückliche Produktentscheidung über den npm-Dist-Tag `latest` verteilt. `.npmrc`, `publishConfig` und der Publish-Guard verlangen deshalb `latest`. Der Guard akzeptiert dabei ausschließlich die exakt in `nexowattReleasePolicy.acceptedPrerelease` eingetragene RC4-Version; ein späterer Versionssprung kann `latest` nicht unbeabsichtigt verschieben. Die exakte Rückfallversion 7.9.86 bleibt weiterhin mit `iobroker.eos-admin@7.9.86` installierbar.


## Standardport 8081

Neue EOS-Admin-Instanzen verwenden standardmäßig Port `8081`. Vor der Aktivierung muss der interne Legacy-Admin durch den EOS-Installer bzw. die Sicherheitsroutine auf `127.0.0.1:18081` verschoben und deaktiviert werden, damit kein Portkonflikt entsteht.


## Zusätzliche RC4-Pflichtfälle

- [ ] Passwortlose Erstaktivierung `installer` im privaten Netzwerk
- [ ] Passwortlose Erstaktivierung `guest` im privaten Netzwerk
- [ ] Ablehnung der Erstaktivierung außerhalb des erlaubten Netzbereichs
- [ ] Admin setzt Installateur zurück; altes Kennwort ist ungültig; neue Erstaktivierung funktioniert
- [ ] Admin setzt Endkunde zurück
- [ ] Installateur setzt Endkunde zurück
- [ ] Installateur kann keinen Installateur-, Admin- oder fremden Zugang zurücksetzen
- [ ] Bereits geöffnete, zurückgesetzte Nicht-Admin-Sitzung kann keine administrativen Socket-Befehle mehr ausführen
- [ ] Moderne Zugangsverwaltung auf Desktop und Mobilansicht
