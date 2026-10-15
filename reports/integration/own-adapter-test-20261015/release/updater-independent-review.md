# Unabhängiger Review des R9→R10-Test-Updaters

Stand: 15.10.2026. Begrenzter Quellcode-/Fehlerinjektionsreview, **keine
Produktions-, Pi-, Anlagen- oder vollständige Wiederherstellungsfreigabe**.

Geprüfte Dateien und SHA-256:

| Datei | SHA-256 |
|---|---|
| `tools/system/update-test-own-adapters.cjs` | `f2e60bf8ccf07fe646c0b87be1a7bed6574d86fedf2e1496a11e0cbde97c2b7a` |
| `tests/system/update-own-adapters.test.cjs` | `4760657a3a92b90ac794250f6d3781603421c1ad44af2531c81b95031f213675` |

Der Reviewer ist nicht Autor des Updaters. Der vorhandene Testlauf wurde nach
Durchsicht eigenständig wiederholt: **35/35 bestanden**, Node 24.19.0 Linux/x64,
keine übersprungenen Tests. Rohbeleg:
[updater-independent-review.tap](updater-independent-review.tap).

## Nachvollzogene Schutzgrenzen

- Bereits gesundes, exakt signatur-/inventargeprüftes R9 (Sequenz 12) sowie
  geschützter erfolgreicher R8→R9-Provenienzbericht und ursprünglicher
  R8-Erststartabschluss sind vor jeder Mutation erforderlich. Fremde,
  inkonsistente oder unvollständige Installationszustände werden abgewiesen.
- Neue Release-ID und neuer öffentlicher Schlüssel sind separat zu pinnen;
  Signatur, tatsächlicher Payload, SBOM, Sequenz 13 und begrenzter
  Katalog-/Profilübergang werden vor Dienständerungen geprüft.
- Eine einzige konkrete Upload-Unit und ihr byteidentisches Template dürfen
  sich ändern. Andere Systemdateien, Datenbankschema sowie gesamte Admin-/UI-
  Paketpräfixe einschließlich Abhängigkeiten und Modi bleiben exakt gleich.
- Der vollständige private Enrollmentplan wird dauerhaft geschrieben, bevor
  Objekte/States verändert werden. Stop-Prüfung berücksichtigt auch Prozesse
  mit Runtime-UID außerhalb des Controllerdienstes.
- Vor Start müssen aktiver Zeiger und Releasezustand zusammenpassen. Die
  Bereitschaftsprüfung erfordert frische Heartbeats aller sechs Adapter,
  Management-HTTPS und zusammenpassende passive Initialisierungszustände,
  nicht allein laufende Prozess-IDs.
- Fremde Lock-/Guard-, Unit-, Plan-, Konfigurations- und Zeigerbytes werden nicht
  durch Rückfalllogik überschrieben. Dieselbe systemd-Invocation ist auch für
  das Stop-Nachspiel zwingend; ein fremder Koordinator wird nicht gestoppt.
- Fehler nach Trialbeginn stoppen die Dienste, rollen den exakten Plan zurück
  und stellen die alte Unit und R9-Zustand wieder her. Entsperrung erst nach
  erneutem Nachweis des gesunden alten R9. Fehlende Eigentumsbindung, fehlende
  Dauerhaftigkeit oder Journal-/Readinessfehler behalten die Sperre bzw. einen
  gestoppten Wiederherstellungszustand; kein behaupteter erfolgreicher Rückfall.

## Zusätzlich angestoßene Fehlerinjektion

Der Review hat explizite Tests für Upload-Unit-Schreibfehler **vor** und **nach**
dem tatsächlichen atomaren Write sowie für `daemon-reload` nach dem neuen Write
angefordert. Der Autor hat diese ergänzt; der Wiederholungslauf prüft die exakte
alte Unit und Enrollment-Rückfall vor dem Neustart des alten R9.

Der abschließende Lauf prüft außerdem, dass ausschließlich der feste Start des
Uploaddienstes 270 Sekunden Aufruferfrist erhält, passend zu dessen bestehender
240-Sekunden-Unitfrist. Alle übrigen systemd-Kommandos behalten 90 Sekunden.

Bereits vorhandene Fälle umfassen fehlgeschlagene Journalpersistenz, fsync beim
Unlock, nicht rekonstruierbaren Guard, partielle DB-Mutation, Planersetzung,
Signatur-/Dateimanipulation, fremde Locks und fehlgeschlagene Rückfallbereitschaft.

## Ergebnis und verbleibende Grenzen

Im genannten Umfang kein weiterer bestätigter blockierender Logikfehler
gefunden. Das ist keine Garantie der Fehlerfreiheit und ersetzt nicht den
qualifizierten nativen Nachweis des exakten Kandidaten oder den realen
ARM64/systemd/Pi-Updateversuch einschließlich Neustart und Recoverydiagnose.

Die Tests verwenden echte temporäre Dateien, atomare Writes, fsync und
Zeigerwechsel, aber ausdrücklich isolierte Doubles für Dienste, Baselineprüfung,
native Modulprobe und Datenbankinteraktion. Ein Teiltest prüft echte
Ed25519-Signatur-/Payloadmanipulation. Hier wurde kein Kundensystem verändert.

Der Updater ist absichtlich **kein allgemeiner Installer oder Recoverypfad**:
direkt installiertes R9 ohne die geforderte historische R8→R9-Provenienz,
fehlerhaftes R9 und zurückgelassene Enrollmentpläne benötigen getrennte Diagnose.
Beim fehlgeschlagenen Rückfall bleiben Plan/Journale erhalten. Neue statische
Assets der vier zusätzlichen Adapter werden bei Rückfall nicht aus dem
Datenbankdateispeicher entfernt; Managementpakete müssen gerade deshalb
unverändert bleiben. Die eigentliche Assethelper-Prüfung ist ein separater
Review. Kein Datenbank-Restore, Stromausfallversuch, physisches Gerät oder echter
systemd-Mount-Sandboxlauf wurde für diesen Bericht ausgeführt.
