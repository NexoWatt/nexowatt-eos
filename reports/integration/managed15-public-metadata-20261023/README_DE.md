# Prüfung der erhaltenen öffentlichen Sequenz-15-Metadaten

Am 23.10.2026 wurde der öffentliche Metadatenexport des abgeschlossenen
WSL-Laufs tatsächlich empfangen. **Metadaten-, Kanal- und Einstiegsprüfung
bestanden.** Das separate Laufzeitarchiv liegt dieser Prüfung noch nicht vor.
Die Herstellerangaben über dessen Signatur/Rückprüfung werden deshalb nicht
als eigene Archivprüfung übernommen.

Ausgangsstand der Prüfwerkzeuge: `7f221dc38e9694ff5e40276d87e11bb0832a8aca`.
Qualifizierter Laufzeitquellstand: `f353dd08bf8ac5897e9b1c357994d4047a82ed6d`.
Bezug: [Abschlusskorrektur](../wsl-signing-finalization-20261023/README_DE.md)
und [WSL-Betrieb](../../../docs/operations/WINDOWS_SIGNIERRECHNER_DE.md).
Keine Änderung an Laufzeit, Schlüsselautorität oder bisherigen Lieferungen.

## Tatsächlich geprüft

- ZIP: 33382 Byte, SHA-256
  `92b3c6802d7631b536235d343c9ddc489d757c9405234576ed0f7f9812282e32`.
  Exakt sechs eindeutige reguläre Dateien; keine zusätzlichen Pfade, Links,
  verschlüsselten Einträge oder CRC-Fehler. Größen, Hashes und UTF-8-Inhalt
  geprüft; doppelte JSON-Schlüssel abgewiesen.
- Kanonischer öffentlicher Ed25519-Prüfschlüssel: 113 Byte, SHA-256
  `518f89debdb0b396d2abe7be8136b7ea5670c2a1f043705ed5d5528124067a40`.
  Identisch mit der zuvor bestätigten öffentlichen Herstellerdatei.
- Liefer-/Zusammenfassungsmetadaten binden Sequenz 15, Release-ID
  `95a87d5dad4d7c29b5b4e849bef5451ff113388e6ee07da6bd9e36bd9178d534`,
  den qualifizierten Quellcommit und das angekündigte Archiv mit 134278673 Byte
  und SHA-256 `dee6181281241c04c9f1a1526685c45a0d4de347d088312a1ce9fe647d82ac44`.
  Dies sind verifizierte Metadatenbindungen, noch keine Messung der Archivdatei.
- Der geprüfte Repository-Renderer erzeugt `update.sh` **bytegleich**:
  81554 Byte, SHA-256
  `42a66e9aa3a1a5f71a438d6606ffeebfdef5e55de4884bb906f8559e58293d67`.
  Alle vier Quellbindungen, eingebetteten Helfer, der Supervisor und der
  historische R8-Ausgangsvertrag stimmen. Auch `preparation.json` wurde
  bytegleich aus diesen Quellen/Bindungen rekonstruiert. Das hochgeladene
  Einstiegsskript wurde nicht ausgeführt.
- `test.json`: tatsächliche Ed25519-Signaturprüfung mit dem bestätigten
  öffentlichen Schlüssel durch den produktseitigen `verifyFeed`-Prüfer.
  Der Kanal enthält **null Folgeupdates**. Ausstellung
  `2026-10-23T19:13:09.971Z`, Ablauf `2026-11-22T19:13:09.971Z`.
  Zeitgültigkeit zum im Rohbeleg genannten Prüfzeitpunkt bestanden;
  vor einer späteren Veröffentlichung erneut prüfen.
- Inhaltlich geprüfte Veröffentlichungskandidaten enthalten ausschließlich
  öffentliche Schlüssel, Hash-/Versions-/Quellbindungen, signierte
  Kanalmetadaten und den aus bekannten Quellen erzeugten Einstieg. Keine
  privaten Schlüssel, Kennwörter oder Betreiber-/Kundendaten darin gefunden.
  Der tatsächliche Laufzeitarchivinhalt ist hiervon ausdrücklich ausgenommen.

Umgebung: Linux x64, Python 3.12.14, Node 24.19.0 als Metadatenprüfer.
Die Ziel-Lieferung bleibt laut gebundenem Stand Node 24.22.1 und
js-controller 7.2.5. Keine neue Laufzeitqualifikation durch diesen Schritt.
Ein separater Agent bestätigte ZIP, öffentliche Bindungen, Renderer und
Kanalsignatur unabhängig; dies ist keine externe Zertifizierung.

## Wiederholung und Belege

Vom Repositorywurzelverzeichnis mit dem unveränderten empfangenen ZIP:

```bash
python3 reports/integration/managed15-public-metadata-20261023/verify-metadata.py /ABSOLUTER/PFAD/eos-public-metadata.zip
```

[Prüfer](verify-metadata.py), [tatsächliches Ergebnis](verification.json).
Die sechs empfangenen öffentlichen Dateien liegen unverändert unter
`received/` als Prüfbelege. Die Original-ZIP-Identität ist im Ergebnis gebunden;
der Prüfer benötigt diese ZIP. Die Zeitprüfung bewertet den Zeitpunkt jedes
erneuten Laufs, daher wird ein abgelaufener Kanal später korrekt abgewiesen.
Bei Fehlern darf eine leere/teilweise umgeleitete Ausgabe nicht als Erfolg gelten.

Die gezielte Inhaltsprüfung und `git diff --check` betreffen ausschließlich
diesen Dokumentations-/Nachweisstand. Unveränderte Produkt- und Hardwaretests
wurden nicht wiederholt.

## Nächster Schritt und offene Grenzen

Die vollständige öffentliche Datei `eos-linux-arm64.tar.gz` aus dem
abgeschlossenen `public-finished/` separat bereitstellen. Danach sind ihre
tatsächliche Größe, SHA-256, Manifestsignatur, vollständiges Dateiinventar,
Payload-/SBOM-/Quellbindung und öffentliche Lieferfähigkeit zu prüfen.
Ein Paket darf dabei nicht neu gebaut oder still verändert werden.

Der GitHub-Releaseabruf lieferte zum Prüfzeitpunkt eine leere Liste. Dieses
Arbeitspaket veröffentlicht ausschließlich Dokumentation und öffentliche
Prüfbelege: kein aktiver Updatekanal, kein Runtime-Release und kein
ausführbarer Betreiberbefehl wurden freigeschaltet. Vor dem Pi-Befehl bleiben
Archivprüfung, Release-Veröffentlichung und öffentlicher Download-Readback offen.
Die tatsächliche R8-/ARM64-/Pi-Migration, systemd-/APT-/Neustart-/Restore- und
physische Anlagenabnahme sind nicht ausgeführt. Bekannte Abhängigkeitsbefunde
bleiben offen. Keine Produktions- oder CRA-Freigabe.
