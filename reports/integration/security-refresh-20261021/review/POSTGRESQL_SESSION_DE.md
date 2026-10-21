# PostgreSQL-Sitzungsvertrag für Controller 7.2.5

Bezug: EOS-UPSTREAM-20261021-01. Datum: 21.10.2026.
Basiscommit: `83f7070c9ec58184188b5f310d0c14140a10e9d4`; die konkreten geänderten
Quell- und Testdateien bindet `postgresql-session-verification.json` über SHA-256.

Der veröffentlichte Controller 7.2.5 erwartet an der internen Datenbankgrenze
einen Fehler als erstes Callback-Argument und die Sitzung als zweites. Der
bisherige PostgreSQL-Client verwendete den beobachteten Einargumentvertrag von
7.2.2. Damit wurde eine vorhandene Sitzung im neuen Adapterkern verworfen.

Der Client bestimmt jetzt den passenden Vertrag aus der tatsächlich aufgelösten
Metadatei von `@iobroker/js-controller-adapter`. Genau 7.2.2 und 7.2.5 sind
zugelassen. Andere oder fehlende Identitäten werden vor dem Verbindungsaufbau
abgewiesen. Eine JSON-Einstellung kann diese Wahl nicht übersteuern. Historische
signierte Pakete bleiben unverändert; ein neuer vollständiger Runtime-Build muss
den geänderten Quellcode und die tatsächlich aufgelösten Pakete erneut binden.

41 lokale Tests bestehen: 29 bestehende States-Verträge und zwölf zusätzliche
Sitzungs-/Adapterverträge. Die neuen Tests führen die unveränderten Methoden
der über ganze Dateihashes gebundenen veröffentlichten CJS- und ESM-Dateien
beider Controller-Versionen aus. Die frühere Inkompatibilität wird als negativer
Vergleich reproduziert. Geprüft sind asynchrone Callback-Argumente, Promise-Lesen,
gültige und fehlende Sitzungen, Ablauf, Löschen, Datenbankfehler sowie die
installierte Paketauflösung. Der moderne Adapter liefert bei einem Lesefehler
keine gültige Sitzung. Die frühere Callbackform bleibt für 7.2.2 erhalten.

Zusätzlich entfernt die exakt gebundene EOS-Transformation des Adapterkerns
7.2.5 private Sitzungskennungen und Fehlerdetails aus dieser Diagnose. Beide
Ausgabeformen protokollieren ausschließlich `EOS_SESSION_DATABASE_READ_FAILED`.
Die Tests vergleichen den ursprünglichen und den transformierten Methodenrumpf
mit synthetischen Werten; tatsächlich verwendete Anmeldedaten werden weder
benötigt noch ausgegeben.

Grenzen: isolierter Fake-Store, Linux x64, lokaler Node 24.19.0. Kein nativer
PostgreSQL-, TLS-, vollständiger OAuth-/Browser-Login- oder Pi-Nachweis aus diesen
Tests; Ziel-Node 24.21.0 und ARM64 bleiben separat zu prüfen. Der Autor dieses
Vermerks hat die Änderung selbst implementiert. Ein separater Controller-Agent
hat den Diff und den vollständigen Vertragstest anschließend unabhängig gelesen
und dabei keinen blockierenden Befund festgestellt. Keine Produktionsfreigabe.
