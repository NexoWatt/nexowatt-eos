# js-controller 7.2.5 – Umsetzung und Prüfstand vom 21.10.2026

Der neue, ausdrücklich ausgewählte TEST-Build verwendet **7.2.5**. Version 8
wird nicht zugelassen. Historische 7.2.2-Builds, deren Guard-Bytes und die
alten signierten Lieferstände bleiben erhalten. Der bisherige
`system/test-base`-Prüfstand bleibt deshalb bei 7.2.2; er ist nicht die neue
Installationsbasis.

## Geänderte Bausteine

- Neuer versionsgebundener Transformationssatz unter
  `runtime/controller-profile/v7.2.5/`. Zwölf vollständige veröffentlichte
  CJS-/ESM-Dateien sind vor und nach der Transformation per SHA-256 gebunden.
  Die Originalarchive sind zusätzlich an ihre npm-SHA-512-Integrität gebunden.
- Laufende npm-Installation, automatische Adapter-/Controller-Updates,
  zusätzliche Node-Startargumente, Shell-Befehle, Plugins und automatische
  Vergabe von Node-Capabilities bleiben gesperrt. Normale und geplante
  Adapterstarts prüfen weiterhin Paket, Version und Einstiegspunkt.
- PID-Datei, Backup-Staging und Archive bleiben außerhalb des unveränderlichen
  Codebaums. Die bereits geprüfte gemeinsame Shutdown-Promise wird auf die
  tatsächlichen 7.2.5-Adapterdateien übertragen und erneut getestet.
- Die neue Upstream-Sitzungsfehlerdiagnose enthielt Sitzungs-ID und Datenbankfehler.
  Da OAuth-Sitzungs-IDs Bearer-Tokens enthalten können, ersetzen die beiden
  Adapterdateien ausschließlich diese Diagnose durch
  `EOS_SESSION_DATABASE_READ_FAILED`. Das Ergebnis bleibt eine fehlende Sitzung.
- Bootstrap, Bereitschaftsprüfung, Erstregistrierung, Produktkatalog und
  Release-Prüfung binden die neue exakte Controller-Version. Der alte
  Migrationspfad bleibt auf 7.2.2 beschränkt. Neue Erstregistrierung bindet den
  7.2.5-Profildigest und bewahrt die deaktivierte physische Inbetriebnahme.
- Die Hersteller-Abhängigkeitsprüfung kontrolliert im neuen Build auch die
  tatsächlich installierten Controller-Unterpakete und die überprüften
  Sicherheits-Patches; bloße Root-Deklarationen reichen nicht aus.

## Herkunft und Vergleich

`published-inputs.json` enthält die vier veröffentlichten npm-Archive und die
vollständigen Original-/Ergebnis-Hashes. `npm pack --ignore-scripts` führte keine
Installationsskripte aus. npm-Integrität wurde lokal erneut berechnet und mit
separat gelesenen Registry-Metadaten verglichen. Eine eigene Prüfung der
Registry-Signaturen wird damit nicht behauptet.

Verglichen wurden die tatsächlichen veröffentlichten ESM-Dateien mit den alten
Fixtures und beide kompilierten Varianten durch die vollständigen Hash- und
Ankerprüfungen. Die Controller-Änderung korrigiert unter anderem das Rücksetzen
von `info.connection`; `setupInstall` berücksichtigt zusätzlich neuere npm-
Fehlertexte. `common-db/tools` blieb bytegleich. Der Adapter ergänzt unter
anderem Benutzerkontext für `sendTo`/`sendToHost`, Sitzungsrückrufe und die
Verarbeitung verschlüsselter Werte. Keine alte Eingabedatei wurde allein durch
Ändern ihrer Versionsangabe zur neuen Originaldatei erklärt.

## Tatsächlich geprüfter Umfang

`verification.tap` und `verification.json` dokumentieren den lokalen Node-Lauf.
Die Tests führen die hashgebundenen tatsächlichen Methoden beider Varianten aus:
Start-/Installationsgrenzen, Benutzerkontext, Shutdown-Rennen, PID-/Backup-Pfade,
Sitzungsrückrufe und die Diagnose ohne Geheimnisse. Dazu kommen negative
Datei-/Symlink-/Versionsprüfungen, Erstregistrierung mit Schreibfehlern,
Bootstrap-/Katalog-/Bereitschaftsprüfungen und historische Verträge.

Der erste Lauf umfasst 400 bestandene Tests. Nach der abschließenden Verschärfung
der Abhängigkeitsprüfung wurden gezielt 20 neue und historische Policy-Tests
erneut ausgeführt (`dependency-policy.tap`). Auch versionsgleiche verschachtelte
Kopien der fünf transformierten Pakete werden abgewiesen. Dieser spätere Lauf
ersetzt nur den Policy-Teil des ersten Nachweises; der vollständige Lauf wurde
nicht wiederholt.

Die zusätzliche PostgreSQL-Sitzungsanpassung wurde separat umgesetzt und hier
unabhängig geprüft: Die Semantik richtet sich ausschließlich nach der
installierten exakten Adapterversion, nicht nach einer Konfigurationsoption.
Die Prüfungen reproduzieren die alte Inkompatibilität und bestätigen gültige,
fehlende und abgelaufene Sitzungen sowie Datenbankfehler. Details stehen im
benachbarten Verzeichnis `../review/`.

Zusätzlich bestanden 25 bestehende Objects-Vertragstests mit den tatsächlich
aufgelösten veröffentlichten 7.2.5-Klassen. Ein dünner vorgeschalteter Testprüfer
bindet PostgreSQL-Backend, Objects-, Basis-, Common-DB- und Controller-Auflösung
an den angegebenen kanonischen Baum. Vier eigene Prüffälle weisen auch die
Ablehnung von 7.2.2, Version 8 und einer versionsgleichen verschachtelten
Abhängigkeit nach. Dabei wird nur der Store simuliert; PostgreSQL-Verbindung
und TLS werden nicht geprüft. Eingabeprovenienz und unabhängige Wiederholung
stehen ebenfalls in `../review/`.

## Build-Einbindung und offene Abnahme

`product.SECURITY_REFRESH_TEST` liefert das 7.2.5-Produktprofil; signierte
TEST-Kontexte ab Sequenz 15 wählen es ausdrücklich. Der neue Hersteller-Build
ruft `applySecurityRefreshToBuild(app, adapters)` auf. Diese Funktion prüft alle
Originaldateien vor dem ersten Schreibzugriff und liefert die gemeinsame
Transformationsliste. `verifyBuildProfile` wählt bei exakt 7.2.5 automatisch die
vollständige neue Prüfung einschließlich PID, Backup und Shutdown. Für den
Admin-Pfad gilt zusätzlich das separate WebSocket-4.5.2-Profil.

Der neue Build muss anschließend PostgreSQL-Paketmetadaten, vollständigen Lock,
Katalog, SBOM und signiertes Gesamtpaket neu erzeugen und gemeinsam prüfen.
Historische Artefakte dürfen dafür nicht umgepackt oder überschrieben werden.

**OFFEN in diesem Teilnachweis:** native vollständige PostgreSQL-/Admin-/UI-
Integration, Anmeldung im Browser, Installation und Neustart auf dem Test-Pi,
Update-Button mit Hersteller-Signatur, kompletter System-Restore sowie Anlagen-
und Produktionsabnahme. Ein bestandener Quelltest ersetzt diese Abnahmen nicht.
Lokaler Interpreter: Node 24.19.0; Zielprofil: Node 24.21.0, Linux ARM64.
