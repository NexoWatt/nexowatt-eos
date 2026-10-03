# Erststart, Admin-Anmeldung und Adapterstabilität

Quellbasis: `6ee690e7503f7f609de1f7c1db1689a6ca39aec3` vom 03.10.2026.
Dieser Vermerk beschreibt die nachfolgende Korrektur. Die signierten R4-Dateien
bleiben unverändert; ein Quellcommit aktualisiert keinen installierten Pi.

**R5 ist inzwischen signiert und veröffentlicht.**
[Veröffentlichung und Rückleseprüfung](publication.json),
[gepinnten Reparaturbefehl herunterladen](../../../delivery/public-repair-test3-r5/REPAIR_COMMAND.txt).
Das ist noch kein auf dem Pi ausgeführter Reparatur- oder Login-Test.

## Anlass und nachgewiesene Korrekturen

Der Nutzer meldet einen abgeschlossenen Einrichtungsassistenten, einen Fehler
bei der normalen Admin-Anmeldung und einen dabei ausfallenden Admin. SSH bleibt
erreichbar. Ein Absturz des gesamten Betriebssystems ist daraus nicht belegt.
Die Ursache eines Admin-Prozessendes bleibt ohne Zielprotokolle offen.

Ein konkreter Fehler ist lokal nachgestellt: R4 beendet die gültige OAuth-
Passwortprüfung nach zwei Sekunden. Der neue Code räumt der lokalen, unverändert
starken PBKDF2-Prüfung 15 Sekunden und maximal zwei parallele Berechnungen ein.
Datenbankfristen bleiben zwei Sekunden; nach Ablauf eintreffende Ergebnisse
können keine Sitzung erzeugen. Der reale HTTPS-/OAuth-Regressionsfall gelingt
mit der Korrektur. [Befund, Vorher-/Nachher-Test und Grenzen](admin-login.md).

Der neue Assistent zeigt nach dem Besitzcode ausschließlich Geräte-UUID,
Home-/Pro-Lizenz und Adminpasswort. Schema 3 speichert serverseitig eine
zurückgestellte Kundeninbetriebnahme, keine erfundenen Anlagenwerte. Schema 2
bleibt für historische Übergaben prüfbar. Ein fertig eingerichteter Pi wird
durch die Reparatur nicht erneut eingerichtet. [Details](onboarding.md).

Keygen 1.0.2 erstellt eine unbefristete NWL3-Systemlizenz aus UUID und Home/Pro.
Die vertrauenswürdige bestehende Editionsmatrix gilt weiterhin; der Generator
verlangt keine Adapter- oder Mengenauswahl. NWL2 behält seine ursprünglichen
signierten Grenzen. Der bestehende Hersteller-Tresor wird nicht ersetzt.
[Vertrag und Interoperabilität](../system-edition-license-20261003/README.md).

Der bisher CSS-gezeichnete ioBroker-Lader wird durch das vorhandene lokale
NexoWatt-Bild ersetzt. Urheberrechts-/Lizenzhinweise und technische Paketnamen
bleiben erhalten. Das nachgereichte `NexoWatt/vendor-nexowatt` war über die
GitHub-Verbindung am 03.10.2026 nicht zugänglich (404). Dessen gewünschtes
Original-Bootlogo wurde daher noch nicht identifiziert oder übernommen.
[Assetbindung und offene Sichtprüfung](branding.md).

## Prüfbelege und Aussagegrenzen

- `adapter-runtime.md`: 93 Transport-/Store-/States-Fälle und sechs neue
  Objects-Lifecycle-Regressionsfälle bestanden. Ein Verbindungswechsel verwirft
  nun veraltete Objektmeldungen und verspätete Rechte-/Protokollprüfungen.
  Die echte PostgreSQL-Datenbank wird dabei weiterhin durch einen Teststore ersetzt.
- `raw/onboarding-combined.tap`: HTTPS, Besitzcode, CSRF, neue und alte Verträge,
  echte Passwortableitung, NWL3-Prüfung, Übergabe und Fehlerzustände; 56 bestanden.
- `admin-login-evidence.json`: getrennte Quellen-, Build-, HTTPS- und Enrollment-
  Prüfungen. Die darunterliegende PostgreSQL-Speicherung ist ein Testdouble.
- `branding-verification.json`: drei Loader-/Assetverträge, keine visuelle
  Browser-/Pi-Abnahme.
- `../system-edition-license-20261003/raw/admin-licensing.tap`: 89 Lizenztests,
  einschließlich Quellen-/Buildgleichheit und Legacy-Verhalten.
- Die gezielte Bestandsreparatur hat eigene Transaktions-/Abbruchprüfungen:
  [Wartungsbericht](../r4-r5-update-20261003/README.md). Sie ersetzt keinen
  nativen systemd-/ARM64-Update- oder Backup-/Restoretest.

Rohbelege werden nicht zu unabhängigen Hardwaretests addiert. Eine grüne Suite
beweist weder fehlerfreien Dauerbetrieb noch die Funktionsfähigkeit angeschlossener
Kundenanlagen. Neue Laufzeitabhängigkeiten wurden für Erststart/Login/Lizenz nicht
hinzugefügt. Ein neues Artefakt benötigt trotzdem eine neue Dateiliste, Signatur
und SBOM-Bindung; die R4-SBOM allein deckt die geänderten Bytes nicht ab.

## Zielabnahme

1. Admin-/Controllerzustand nach dem gemeldeten Fehler feststellen; keine
   Passwörter, Hashes, Tokens oder vollständigen Sitzungsprotokolle veröffentlichen.
2. Den gesonderten, gepinnten R4-Reparaturweg verwenden, für das veröffentlichte,
   signierte R5-Artefakt. Der bisherige frische Installer
   ist kein Bestandsupdater.
3. Mit dem vorhandenen Adminpasswort anmelden, Admin und UI bedienen, abmelden,
   erneut anmelden und anschließend neu starten. Passwort und Lizenz müssen
   erhalten bleiben. Ein HTTPS-Statuscode allein belegt keinen erfolgreichen Login.
4. Neue Erstinstallation separat mit Minimalassistent und Home-/Pro-Lizenz
   abnehmen; die Bestandsreparatur startet keinen neuen Assistenten.
5. Geräteanbindung, Offline-/Reconnect-Verhalten und betriebliche Grenzwerte je
   Kundenanlage prüfen. Gebündelt, installiert und zur Ausführung freigegeben
   sind unterschiedliche Zustände. JavaScript-Erweiterungen bleiben separat
   zu bewerten; eine Home-/Pro-Lizenz verleiht keine Betriebssystemrechte.

Die Dokumentation führt Änderungen, Risiken, Tests und spätere Artefakte für
den CRA-Nachweis zusammen. Native Pi-, Langzeit-, unabhängige Sicherheits- und
Anlagenabnahme bleiben offen. Keine Produktions- oder CRA-Konformitätsfreigabe.
