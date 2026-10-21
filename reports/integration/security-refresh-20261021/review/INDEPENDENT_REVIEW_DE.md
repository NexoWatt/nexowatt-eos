# Unabhängige Integrationsprüfung des Sicherheitsupdates

Stand: 21.10.2026. Bezug: EOS-UPSTREAM-20261021-01 bis -03 sowie der
weiterhin offene EOS-OCPP-LOCK-AUDIT-20261007. Basiscommit:
`83f7070c9ec58184188b5f310d0c14140a10e9d4`. Die geprüften Arbeitsdateien und
Testausgaben sind in `independent-review.json` über SHA-256 gebunden.

Im geprüften Zusammenspiel wurde nach den Korrekturen kein weiterer
blockierender Quellcodebefund festgestellt. Diese Aussage gilt für die
begrenzte Review- und Vertragstestabdeckung. Sie ist keine Freigabe eines
fertigen Installationspakets und kein vollständiger Sicherheitsnachweis.

## Geprüfte Grenzen

- Die neue vollständige Runtime verwendet genau Controller 7.2.5. Die
  historischen Profile 7.2.2 bleiben getrennt; Controller 8 wird abgewiesen.
  Profil, Paketidentitäten, Produktumfang und Updateübergang werden gemeinsam
  geprüft. Ein allgemeiner Controllerwechsel über den Adapter-Updatepfad ist
  damit nicht freigegeben.
- Die EOS-Transformationen bleiben an veröffentlichte Eingabedateien gebunden.
  Die Abhängigkeitspolitik verbietet zusätzliche verschachtelte Kopien der
  transformierten Pakete. Die vollständige SBOM-Prüfung weist außerdem nicht
  inventarisierte Dateien an zusätzlichen Paketauflösungsgrenzen ab.
- Admin benötigt den erwarteten Socket-Prüfpunkt und bricht bei einem
  unpassenden Profil ab. Die zusätzlichen OAuth-Funktionen sind ausdrücklich
  deaktiviert; die EOS-SSO-Sperre bleibt bestehen. Die eigene HTTPS-Einbindung
  übernimmt nicht ungeprüft die Server-Startvorgaben einer neuen Bibliothek.
- Der neue SBOM-Zweig bindet tatsächlichen App-Inhalt, Dateimodi, Paketlock,
  Builddatensatz, Controllerprofil und alle fünf Transformationsinhaber.
  Die sechs eingebetteten Lizenzclients müssen weiterhin identisch sein.
  Die allgemeine Inventarprüfung läuft auch für diesen neuen Zweig.
- Der neue Build verpackt die versionierten Komponentenquellen, führt keine
  npm-Lifecycle-Skripte aus und installiert die zuvor aufgelöste Lockdatei
  offline. Historische R9-Paket- oder Testnachweise gelten dafür nicht als
  Nachweis. Die Fresh-Enrollment-Prüfung behauptet keinen historischen
  Migrations-Rollback.
- Das unsignierte Transportarchiv verwendet eine feste Dateiauswahl und eine
  geprüfte Extraktion ohne Verknüpfungen oder zusätzliche Archivmitglieder.
  Datenbankdaten, private Laborverzeichnisse und Signiermaterial gehören nicht
  zu dieser Auswahl. Ein Transportarchiv ist keine Updateautorisierung.
  Der Signierpfad verlangt anschließend erneut passenden Quellstand,
  tatsächlichen App-Inhalt und die dazugehörigen nativen Nachweise.
- Der getrennte Erstinstallationspfad bindet die drei vollständigen Downloads,
  bevor er entpackt oder Systempakete verändert. Sein Einstieg verwendet fest
  Sequenz 15. Das öffentliche Installationskit enthält nur versionierte Quellen
  und ausdrücklich ausgewählte öffentliche Hilfsdateien; lokale Zusatzdateien
  werden ausgeschlossen. Interne Buildlisten mit Herstellerpfaden verbleiben
  außerhalb der Ausgabe und werden nach Erfolg oder Fehler entfernt. Der
  Einrichtungscode wird weiterhin nur an das kontrollierende Terminal ausgegeben.

## Unabhängig ausgeführte Prüfungen

| Prüfung | Ergebnis | Aussagegrenze |
| --- | --- | --- |
| Übergänge, WebSocket-Grenze, Fresh-Enrollment, SBOM-/Buildverträge, tatsächliche Controller-Transformationen und Abhängigkeitspolitik | 50/50 | Lokale Verträge; teilweise synthetische Daten, kein vollständiger Build |
| Sichere Archivierung und Extraktion | 3/3 | Dateisystem-/Archivfixtures, keine Installation |
| Bestehende PostgreSQL-Objects-ACL-/CRUD-Verträge mit tatsächlich geladenem veröffentlichtem Objects-Kern 7.2.5 | 25/25 | Tatsächliche vererbte Domänenimplementierung, Fake-Store, kein PostgreSQL-Server |
| Getrennter Erstinstallationspfad, tatsächliche Kit-Erstellung und Laden des entpackten Einstiegs | 8/8 | Reale ZIP-/Dateiprüfungen, explizite Installerfixtures; kein APT und keine Installation |

Ausführung: Linux x64, Node 24.19.0. Der Objects-Test verwendet zusätzlich die
veröffentlichten Pakete `@iobroker/db-base` und
`@iobroker/js-controller-common-db` in Version 7.2.5. Die unveränderten
Controllerdateien ermöglichen lediglich die Paketverzeichniserkennung; es
wird kein Controllerprozess gestartet. Versionen, Paketintegritäten und
relevante Eingabedateien stehen im maschinenlesbaren Nachweis. Ein vorgeschalteter
Testwrapper prüft die tatsächliche Auflösung vom PostgreSQL-Backend über die
vererbten Pakete bis zum kanonischen Controllerverzeichnis, bevor er die
unveränderten 25 Objects-Verträge lädt.

Die PostgreSQL-Sitzungsanpassung wurde vom Autor dieses Reviews selbst
implementiert und wird deshalb hier nicht als unabhängig geprüft gezählt.
Ihre 41 Tests und die separate Prüfung durch einen anderen Agenten sind in
`POSTGRESQL_SESSION_DE.md` und `postgresql-session-verification.json` belegt.
Die Anpassung umfasst auch die begrenzte Diagnose ohne Sitzungskennungen.
Die umfassenderen Admin-/Browserprüfungen sind im separaten Admin-Nachweis
beschrieben und werden hier nicht als eigene Testausführung gezählt.

## Verbleibende Grenzen

Die neue Socket-Bibliothek hat beobachtete Grenzen bei Objekt-Abonnements und
der Weitergabe des Benutzerkontexts im Admin-Hostbefehlspfad. Das EOS-Profil
begrenzt die betroffenen Funktionen; daraus folgt keine allgemeine
Qualifikation sämtlicher neuer Upstream-Funktionen. Diese Charakterisierung
muss bei späteren Berechtigungserweiterungen berücksichtigt werden.

Bekannte offene Abhängigkeitsbefunde, insbesondere die getrennt dokumentierten
node-forge- und OCPP/AJV-Befunde, sind durch dieses Review nicht geschlossen.
Ein aktuelles Audit der tatsächlich neu installierten Runtime bleibt nötig;
ein fehlendes Audit darf keine Aussage über Befundfreiheit erzeugen.

Zum Reviewzeitpunkt liegen aus dieser Arbeitsumgebung kein vollständiger
sauberer Build mit Node 24.21.0/npm 11.19.0, kein bestandener neuer nativer
PostgreSQL-Gesamtlauf und keine Pi-/ARM64-Abnahme vor. Die neuen CI-Pfade und
ihre Vertragsfixtures ersetzen diese Ausführung nicht. Der dauerhafte private
Herstellerschlüssel, ein daraus signiertes Paket und dessen Veröffentlichungs-
und Installationsprüfung sind ebenfalls separate Voraussetzungen. Keine
Produktions-, CRA-, Systemd-Mount- oder vollständige Wiederherstellungsfreigabe.
