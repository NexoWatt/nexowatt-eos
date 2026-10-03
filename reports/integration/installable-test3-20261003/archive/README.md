# Plattformunabhängiges TEST-Archiv

`node tools/integration/package-postgresql-test.cjs <Assembly-Verzeichnis>`
verwendet einen einmaligen Ed25519-KeyObject im Node-Prozess. Der Code exportiert
oder schreibt keinen privaten Schlüssel. Das ist keine Zusage über Swap,
Crash-Dumps oder verlässliches Löschen des Prozessspeichers. Eine neue Ausführung
erzeugt einen anderen Testsignierer und eine andere Signatur. Bei identischem
Manifest bleibt dessen Release-ID gleich; Schlüssel- und Archivhash sind neu
und müssen unabhängig bestätigt werden.

Die vorhandenen Produkt-, Katalog-, Controllerprofil-, SBOM- und Architekturgates
laufen vor der Signierung weiter. `create-test-archive.cjs` setzt unabhängig vom
Build-Dateisystem nur die vom Architekturcheck als
`target-static-native-executable` bewerteten Dateien auf Modus 0755. Alle anderen
Payloaddateien, einschließlich `.node`-Bibliotheken und explizit über Node/Python
gestarteter Skripte, erhalten 0644. Verzeichnisse im Archiv erhalten 0755.
Archivpfade, uid/gid, Zeitstempel und Reihenfolge sind festgelegt. Derselbe
Payload mit derselben Manifest-Signatur erzeugt dasselbe Archiv.

Der Produktvalidator führt die Architekturprüfung zwingend genau einmal je
angegebener Plattform aus und gibt deren vollständige Berichte zurück. Der
Signierer verwendet ausschließlich diesen tatsächlichen Bericht; Plattform,
Node-Version sowie Package-, Lock- und native Dateihashes müssen zum ersten
Inventar passen. Ein zweites vollständiges Byteinventar nach der Validierung
erkennt Inhalts- und Bestandsänderungen. Die redundanten zweiten und dritten
Architektur-Headerdurchläufe entfallen; es gibt keine Überspringen-Option im
Produktvalidator. Archivschreiben und vollständige Rückprüfung bleiben erhalten.

Der Python-Standardbibliothekshelfer verarbeitet keine privaten Schlüssel und
führt keinen Payload aus. Er begrenzt rohe Tar- und PAX-Header vor deren
Interpretation und liest anschließend alle logischen Archivmitglieder erneut.
Zulässig sind reguläre Dateien und Verzeichnisse; PAX darf ausschließlich den
Pfad erweitern. Inhalt, Länge, Rechte, Besitzer und vollständiger Dateibestand
werden gegen das Manifest geprüft. Node prüft die aus dem Archiv gelesene
Ed25519-Signatur und den erwarteten Manifesthash.

Ausgaben sind das `.tar.gz`, `release-public.pem` und `delivery.json` mit
Archivhash, öffentlichem Schlüsselhash und Release-ID. Es entsteht kein lokal
installierbares `bundle`-Verzeichnis auf Windows. `test-archive-payload` ist
lediglich eine Buildkopie. Die Signatur, der unabhängig bestätigte öffentliche
Schlüsselhash sowie sämtliche Linux-Rechte- und Eigentümerprüfungen bleiben vor
der Installation erforderlich. Der strenge Runtime-Verifier wurde nicht
abgeschwächt.

`test-archive.tap` enthält den lokalen gezielten Testlauf;
`test-archive.json` bindet dessen Hash sowie die geprüften Quelldateien. Die
positiven kleinen Archivfixtures ersetzen ausschließlich den Produkt-/SBOM-
Validator und prüfen seinen Aufruf; Architekturprüfung, Kryptografie, Python-
Archiverstellung und Rückprüfung laufen tatsächlich. Der echte API-Pfad wird
zusätzlich mit einem ungültigen Produktpayload auf Ablehnung geprüft. Diese
Mechaniktests ersetzen keinen vollständigen Produktbuild. Fünf zusätzliche
Core-Fixtures verwenden die tatsächlichen Katalog-, Controllerprofil-, SBOM-
und Architekturgates: Sie prüfen genau einen Durchlauf je Plattform, die
Ablehnung unbekannter nativer Dateien, fortbestehende frühere Gates und einen
positiven öffentlichen Archiv-API-Pfad ohne ersetzten Validator. Die beiden
neuen Archiv-Negativfälle prüfen unpassende oder veraltete Berichte sowie
nachträglich geänderte gewöhnliche und native Bytes. Der aufgezeichnete Lauf
umfasst zusätzlich die Build-Normalisierung und Vollprodukt-Vertragstests.

Offen in diesem Nachweis: vollständiger Produktbuild, Linux-Entpackung und
unveränderter `verifyBundle` auf dem Zielsystem, native Bibliotheksausführung,
PostgreSQL/systemd-Installation, Browser und Raspberry-Pi-/Anlagentests. Eine
Produktions- oder Gerätefreigabe folgt daraus nicht.
