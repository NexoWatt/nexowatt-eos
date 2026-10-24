# Managed16: Stabilisierung und neuer Frischinstallationstest

Stand: 24.10.2026. Ausgangsquellstand
`f27c8d425e59ec9db10f7e9df006f3289d280e12`.
Nutzerentscheidung: den erfolglosen R8-Umstieg beenden, den aktuellen Stand
stabilisieren und den Test-Pi anschließend sauber neu installieren.
Der alte Testdatenträger wird erst nach Bereitstellung des geprüften Pakets ersetzt.

## Beobachtung und Eingrenzung

Der Betreiber meldete wiederholte Controller-Abbrüche mit Exitcode 6 und danach
automatischen Neustart. Die begrenzte Journaldiagnose ergab 34 gefilterte Einträge
im Fenster 24.10.2026, 05:27–05:31 UTC. Wiederkehrende Fundstellen waren
`index.cjs:9:33`, `index.cjs:124:124`, `index.cjs:111:66` und `index.cjs:161:24`.
Keine Rohmeldungen, privaten Konfigurationen oder Schlüssel wurden übernommen.

Die R8-Quellbindung unter
`reports/integration/installable-test3-r8-20261004/signed-source-binding.json`
bindet den Store mit SHA-256
`901f4a37df2d9ef69d8bd81903dc232eec1871e99f4fb243b6d9880e04651cab`.
Die Zeilen 111/124 passen zu gekapselten Pool-/Transaktionsfehlern,
Zeile 161 im damaligen States-Backend zur Weitergabe einer Promise-Ablehnung.
Basenames allein identifizieren den Aufrufer nicht eindeutig. Konkreter
PostgreSQL-Auslöser, SQLSTATE und tatsächlicher Controller-Aufrufer bleiben
unbekannt. Der neue Stand wird nicht als bereits bewiesene Behebung der gesamten
ursprünglichen Pi-Störung ausgegeben.

## Bearbeitete Fehlergrenzen

- `EOS-STABILITY-20261024-01`: Der Controller-Logger ignoriert abgelehnte
  `pushLog`-Promises. Korrektur im neuen 7.2.5-Profil, historisches 7.2.2
  unverändert. Höchstens 64 offene Weiterleitungen; höchstens einmal der feste
  Diagnosecode `EOS_CONTROLLER_LOG_FORWARD_FAILED` direkt nach stderr.
  Keine rekursive Loggerbenutzung oder Ausgabe von Rohfehlern. Kontrollschreib-
  zugriffe behalten ihre Fehlersemantik. Der Subprozess-Reproduktionstest nutzt
  originale Handler, echte States-/Store-Methoden und explizite SQL-Doubles;
  er ist kein vollständiger nativer Controller-Absturztest.
  Bei ausgeschöpfter Weiterleitungsgrenze werden Logmeldungen verworfen; die
  einmalige Diagnose ersetzt keinen laufenden Gesundheitsnachweis.
- `EOS-STABILITY-20261024-02`: Vor Verbindungsverlust wartende Transaktionen
  dürfen nach Neuverbindung nicht in einer anderen Verbindungsgeneration
  ausgeführt werden. Abgeschlossene Transaktionskontexte dürfen keine
  freigegebene Poolverbindung weiterbenutzen. Eine Verbindung mit fehlgeschlagenem
  Rollback wird verworfen; dessen Bereinigung bleibt zeitbegrenzt. Keine
  automatische Wiederholung unsicher bestätigter Schreibzugriffe, keine
  Lockerung von TLS/RLS, Rollen, Poolgröße oder Laufzeitgrenzen.
  Ein bereits an PostgreSQL übermitteltes COMMIT kann bei Verbindungsverlust
  weiterhin einen unklaren Ausgang haben; es wird nicht automatisch wiederholt.
- `EOS-STABILITY-20261024-03`: Neue feste Frischbasis Sequenz 16, Revision 13.
  Eigener gebundener Hostvorbereiter erhält die historischen R8-/Sequenz-15-
  Downloadpfade. Build, SBOM, nativer Nachweis und spätere Signierung müssen
  denselben neuen Quellcommit und dieselben Nutzdaten binden.

## Lokaler Prüfstand

- Gemeinsamer abschließender lokaler Lauf: **195 JavaScript-Tests und 36
  Python-Tests bestanden**. Der Treiberfall mit fehlendem `pg` wurde gezielt
  ausgeschlossen, nicht als bestanden gezählt. Rohbelege und Hashes:
  [Verifikation](local-verification.json), [JS-Ausgabe](local-regression.txt),
  [Python-Ausgabe](local-python.txt).
- Separate Frischinstaller-/R8-Regressionsprüfung: 62/62 bestanden, darunter
  tatsächliche ZIP-Modulladung und synthetisch signierte Payloadprüfungen;
  [Nachweis](../managed16-fresh-install-20261024/verification.json).
  Die Zählungen überschneiden sich mit dem gemeinsamen Lauf und werden nicht addiert.
- Getrennte Quellreviews der Fehlerbehandlung und Frischinstallationsgrenzen
  ergaben keine verbleibenden blockierenden Befunde. Dies ist keine externe
  Sicherheitszertifizierung und keine Abnahme des Zielgeräts.
- Controller: 120/120 Tests bestanden, darunter 20 neue Logweiterleitungsfälle.
  Neue 7.2.5-Profile einschließlich CJS/ESM und Pins, historisches 7.2.2-Profil
  und States-/Sitzungsverträge wurden geprüft.
- Store: 43 gezielte Tests bestanden, darunter sieben neue Lebenszyklusfälle.
  Vorher wurden fünf Lebenszyklusfehler sowie ein hängender Rollback reproduziert.
  Der vollständige Versuch hatte zusätzlich einen Umgebungsfehler: das lokale
  npm-Paket `pg` fehlt. Der tatsächliche Treiberfall wurde im abschließenden
  lokalen Lauf ausdrücklich ausgeschlossen und bleibt Teil der CI-Qualifikation.
- Lokale Laufzeit Node 24.19.0; dies ersetzt nicht den Build-/Testlauf mit der
  Zielversion 24.22.1 oder native PostgreSQL-/Pi-Prüfungen.

## Laufzeit- und Liefergrenzen

Der neue feste Logweiterleitungs-Fehlercode wird ausdrücklich in der nativen
Prozessdiagnose erkannt und verhindert eine erfolgreiche Qualifikation.
Das Abfangen einer Ausnahme wird dadurch nicht mit fehlerfreiem Logtransport
gleichgesetzt. 13 gezielte Diagnose-/Nachweisvertragsprüfungen bestanden;
[Rohbeleg](native-gate-diagnostics.tap). Der ursprüngliche CI-Anlauf am
Commit `6dad240688ada5e23c130434a0ce2016925a9e6b` wird durch einen neuen Lauf mit
dieser zusätzlichen Nachweisgrenze ersetzt; seine Artefakte werden nicht
als endgültiger signierbarer Stand übernommen.

Das native Labor muss die neu gebauten sechs Adapter, HTTPS-Erststart, zentrale
NWL3-Lizenzierung, Backup und Neustart prüfen. Eine neue verpflichtende native
PostgreSQL-Prüfung ergänzt den Schutz abgeschlossener Transaktionskontexte mit
echten Datenbankzugriffen und ausbleibendem verspätetem Canary-Schreibzugriff.
Ergebnisse und Artefaktbindungen werden nach dem tatsächlichen Lauf ergänzt.

Die bisherige signierte Sequenz 15 und ihre öffentlichen Prüfsummen werden
nicht verändert. Der private Hersteller-Schlüssel bleibt ausschließlich beim
Betreiber. Neue qualifizierte Artefakte müssen vor der lokalen Signierung
vorliegen; keine erfundenen Artefaktpins oder Testfreigaben.

Offen bleiben bis zum jeweiligen tatsächlichen Nachweis: neuer vollständiger
CI-/Laufzeitbuild, Herstellersignatur, vollständiger Archiv-/öffentlicher
Readback, Debian-13-/ARM64-/systemd-Neuinstallation, Browser-Einrichtung und
Pi-Neustart/Updates. Geräte-/Regelungsabnahme ist gesondert erforderlich.
Keine Produktions-, Anlagen- oder CRA-Freigabe und keine Zusage vollständiger
Fehlerfreiheit. Die Testanlage wurde durch diese Quellarbeit nicht verändert.
