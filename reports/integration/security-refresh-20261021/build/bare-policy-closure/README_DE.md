# Bare-Policy: vollständige Kopier- und Signaturbindung

Stand: 21.10.2026, Quellbasis `745dcefef3f24aa768fec7feb5d48789494738df`
zuzüglich der in `verification.json` mit SHA-256 gebundenen Änderungen.
Die EOS-Entwicklungsvorgabe gilt; dieser Vermerk ergänzt den Befund und die
Architekturprüfungen in `../ci-followup-745dcef/`.

Der Architekturprüfer lädt jetzt die benachbarte
`tools/integration/bare-refresh-policy.json`. Ohne die JSON-Datei im Payload
oder Installer-Kit würde der kopierte Prüfer beim Laden abbrechen. Ohne Bindung
an das signierte Manifest wäre eine im Kit mitgelieferte Policy nicht durch
die Release-Signatur authentifiziert. Die folgenden bestehenden Listen wurden
deshalb ausschließlich um diese unmittelbare Abhängigkeit ergänzt.

| Quellpfad | Änderung und Sicherheitswirkung |
| --- | --- |
| `tools/system/build-bundle.cjs` | Kopiert Prüfer und Policy gemeinsam; die normale Payload-Inventarisierung nimmt beide in die signierten Dateien auf. |
| `tools/bootstrap/build-managed-download.cjs` | Nimmt die Policy in die feste Kit-Liste und die Source-Bindung auf. Prüfer und Policy müssen im signierten Manifest stehen; fehlende Kit-Dateien oder abweichende Größe/Hashes werden abgelehnt. |
| `tools/bootstrap/build-download.cjs` | Schließt dieselbe unmittelbare Abhängigkeit in der älteren Download-Quellliste und Source-Bindung. Dies ist keine Neuerstellung historischer R3-Pakete. |
| `tools/integration/deliver-postgresql-test.cjs` | Bindet die Policy ebenso wie den Prüfer an Größe und Hash des signierten Manifests. Bestehende Profil- und Versionsschranken bleiben erhalten. |

Die Quellreferenzen auf den Architekturprüfer wurden repositoryweit gesucht.
Weitere Aufrufe in `prepare-security-refresh.cjs` und den Architekturtests
verwenden den vollständigen Checkout; sie besitzen keine separate Kopierliste.
`tools/integration/verify-github-ready.py` und
`tests/bootstrap/github-publication.test.cjs` bleiben unverändert. Sie prüfen
das historische R3-Paket mit Sequenz 6 und dessen damaliger Quellzusammensetzung;
der Verifier enthält feste Vertrauenspins sowie 96 Kit-/83 signierte Dateien.
Diese historischen Belege sind kein Prüfverfahren für den neuen Managed-Kit.
Die aktuellen Builder behaupten nicht, frühere signierte Archive aus dem
heutigen Checkout reproduzieren zu können. Historische Archive, Signaturen,
Vertrauenspins und Installationsbefehle wurden hier nicht verändert.

## Tatsächlich geprüft

`node --test --test-reporter=tap tests/bootstrap/managed-bootstrap.test.cjs tests/bootstrap/build-download.test.cjs`
bestand mit **15/15 Tests**, ohne übersprungene Tests. Umgebung, Zeitpunkte,
Dateihashes und Prüfbefehle stehen in `verification.json`; Rohresultat:
`contracts.tap`. Zusätzlich bestanden Syntaxprüfung der vier geänderten
Produktdateien und `git diff --check`.

- Die echte `preparePayload`-Funktion kopiert die Policy bytegleich und erfasst
  ihren Hash. Das kopierte Build-Modul lässt sich mit dieser Abhängigkeit laden.
- Ein mit einem ausschließlich im Arbeitsspeicher erzeugten Testschlüssel
  signiertes Fixture-Bundle wird verifiziert. Eine angehängte Änderung an der
  Policy wird anschließend als `BUNDLE_CONTENT` abgelehnt. Das verifizierte
  Fixture-Manifest wird mit den tatsächlich gesammelten Managed-Kit-Quellen
  verglichen.
- Ein tatsächliches Managed-Kit-ZIP wird gebaut, zurückgelesen und entpackt.
  Die Policy stimmt bytegenau mit der Quelle überein; der feste First-Start-
  Einstieg erreicht bei ungültigem Argument seinen Parser. Nicht verfolgte
  harmlose Privatdatei-Marker und absolute Build-Pfade gelangen nicht ins Kit.
- Beide Download-Source-Bindungen lehnen getrennt fehlende signierte Prüfer- oder
  Policy-Einträge, fehlende Kit-Dateien und veränderte Hashes ab.

## Grenzen und nächste Prüfung

Das App-Fixture enthält absichtlich nur leere Paketmetadaten und ersetzt keine
vollständige Produktprüfung durch `validatePayload`. Die echten Kopier-, Hash-,
Signatur- und ZIP-Schritte sind geprüft, aber das erzeugte Fixture ist kein
installierbares Release. Es enthält keinen dauerhaften Herstellerschlüssel.
Die vollständigen älteren Delivery-/Download-Hauptabläufe wurden nicht gegen
historische Archive neu ausgeführt.

Der vollständige aktuelle CI-Build und seine nativen Laufzeitprüfungen müssen
den eingefrorenen Gesamtstand bestätigen. Signierung des neuen Test-Releases,
APT-/Systemd-Installation, ARM-/Pi-Ausführung, Neustart, Browser-Ersteinrichtung,
Update-Schaltfläche, Rückfall und Anlagenabnahme bleiben außerhalb dieses
Nachweises. Dieser Vermerk erteilt keine Produktionsfreigabe und ändert keine
Controller-Version oder Bare-Freigaberegel; deren eigener Nachweis bleibt
separat zugeordnet.
