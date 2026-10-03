# Admin-Anmeldung nach Erststart: Befund und Nachtest

Stand: 03.10.2026. Quellbasis `6ee690e7503f7f609de1f7c1db1689a6ca39aec3`.

## Nutzerbeobachtung und Grenze der Diagnose

Der Nutzer erreicht den Browser-Erststart. Bei der anschließenden normalen Admin-Anmeldung funktioniert das gewählte Passwort nicht zuverlässig; die Anwendung wird als abstürzend beschrieben. SSH bleibt erreichbar. Damit ist weder ein Neustart des gesamten Pi noch die Ursache eines Admin-Prozessabbruchs nachgewiesen. Zielgeräte-Status, zeitlich passende Dienst-/Prozessbelege und Browserfehler fehlen noch. Das bleibt **OFFEN**.

## Reproduzierbarer Quellbefund

Das signierte R4-Archiv wurde vor der Untersuchung gegen SHA-256 `c1d418a66b3678fb19f4487ece9871da81cf7a583af59a6d889c799d7c6dd1b3` geprüft. Die Bindungen sind in `admin-login-evidence.json` erfasst.

Der Erststart erzeugt das korrekte, vom ausgelieferten Controller erwartete Passwortformat: PBKDF2-HMAC-SHA256 mit 600.000 Iterationen, 256 Byte abgeleitetem Schlüssel und zufälligem Salz. Die direkte Prüfung mit dem **tatsächlich ausgelieferten** `@iobroker/js-controller-common-db` akzeptiert das Testpasswort. Ein Formatfehler ist damit nicht belegt.

Der EOS-Session-Schutz legt jedoch dieselbe Zwei-Sekunden-Frist um Datenbanklesezugriffe und die vollständige OAuth-Passwortprüfung. Dauert die legitime lokale Ableitung länger, liefert die Anmeldung trotz korrektem Passwort HTTP 400 zurück. Der deterministische Regressionstest nutzt die wirkliche Ableitung und ergänzt 2.100 ms kontrollierte Verzögerung. Mit der unveränderten signierten R4-Implementierung schlägt genau dieser Fall nach etwa zwei Sekunden fehl. Dieser Nachweis ist **kein** gemessener ARM64-Zeitwert und beweist keinen Prozessabsturz auf dem Pi.

## Änderung

- Passwortprüfungen erhalten eine separate maximale Gesamtdauer von 15 Sekunden und höchstens zwei gleichzeitig ausstehende Aufträge. Es gibt keine Warteschlange oder automatische Wiederholung.
- Nicht abbrechbare native PBKDF2-Arbeit behält ihren belegten Platz bis zum tatsächlichen Abschluss, auch wenn die Antwortfrist schon abgelaufen ist.
- Die unveränderte Zwei-Sekunden-Grenze gilt weiterhin für Objekt-/Gruppenlesezugriffe und Sessiondaten. Kontosperren, Passwortänderungen und Rechtewechsel werden vor/nach der Ableitung geprüft.
- Eine verspätete Ableitung erhält keine Berechtigung zum Ausstellen eines Tokens. Zeitüberschreitung und ausgelastete Passwortprüfung erzeugen ausschließlich feste Diagnosecodes `EOS_AUTHENTICATION_TIMEOUT` bzw. `EOS_AUTHENTICATION_BUSY`, ohne Passwort, Hash oder Benutzerwerte zu protokollieren.
- Die minimale Erststarteinschreibung übernimmt Schema 3 ohne Standort-/Anlagenwerte zu erfinden. Vorhandene Systemvoreinstellungen bleiben erhalten; physische Steuerung bleibt gesperrt.

## Tatsächlich ausgeführte Prüfungen

`raw/admin-session-source.tap` und `raw/admin-session-built.tap`: jeweils 20/20 bestanden (dieselben Fälle gegen Quell- und Runtime-Datei; nicht als 40 unterschiedliche Fälle gezählt). Dazu gehören langsame gültige Anmeldung, weiter begrenzte Datenbanklesezugriffe, Rückstauvermeidung, verweigerte verspätete Tokens, falsches Passwort und Rechteentzug während der Prüfung.

`raw/admin-first-start-https-before.tap`: beabsichtigter negativer Vorherbeleg. Der verzögerte Anmeldetest erhält HTTP 400 statt 200; deshalb zählt auch sein Elterntest als fehlgeschlagen (5 bestanden, 2 fehlgeschlagen, **ein** reproduzierter Fehlerfall).

`raw/admin-first-start-https.tap`: 7/7 bestanden. Reale TLS-1.3-Verbindung, Express, ausgeliefertes gepflegtes OAuth 5.3.0, tatsächliche Erststart-PBKDF2-Erzeugung und ausgelieferte Passwortprüfung sowie die native EOS-States-Session-API. Der darunterliegende Store ist ein ausdrücklich künstlicher Speicherdienst. Gültiges Passwort einschließlich langsamer Prüfung, falsches Passwort, Cookies, Refresh, Passwortänderung und gesperrte alternative Grants wurden geprüft.

`raw/admin-enrollment.tap`: 6/6 bestanden, einschließlich neuer minimaler Einschreibung und Kompatibilität vorhandener Schema-2-Marker.

**Nicht durchgeführt:** PostgreSQL/mTLS-Ende-zu-Ende, vollständiger Admin-Prozess mit Controller und Browser, native Pi-Laufzeit, Hardwareabnahme. Keine Produktionsfreigabe oder CRA-Konformitätserklärung.

## Bestehender Pi

Keine Passwort-Rücksetzung, keine Klartext-Anmeldedaten, keine direkten Datenbankschreibbefehle und kein Überschreiben signierter installierter Dateien wurden ausgeführt oder empfohlen. Vor einer signierten Aktualisierung muss der gemeldete Prozessabbruch anhand begrenzter, geheimnisfreier Zustandsdaten eingegrenzt werden. Alte signierte R4-Dateien bleiben unverändert. Ein Quellcommit allein aktualisiert diesen Pi nicht.

## CRA/SBOM-Bezug

Es werden keine Abhängigkeiten hinzugefügt oder aktualisiert; Paketversionen bleiben in diesem Quellpatch unverändert. Ein künftiges Lieferpaket mit geändertem Admin-/Hostcode benötigt neue Manifest- und Dateihashes, passenden Komponenten-/SBOM-Bezug und einen neuen signierten Release. Vorhandene R4-SBOM und Signaturen gelten ausschließlich für R4, nicht als Freigabe dieses geänderten Quellstands.
