# NW-EOS-261004-PG-HOST: Controller-Hostobjekt abgewiesen

Stand: 04.10.2026; Ausgangsquellstand
`a02bba50978fa0f9bac893e1921487b457298e7f`, Controllerbibliotheken 7.2.2.
Die Dateihashes des geprüften Korrekturstands und der Rohbelege stehen in
`evidence.json`.

## Beobachtung und Reproduktion

Der Nutzer meldete auf seinem R4-Pi (signierte Sequenz 7) einen gestoppten
Controller. Sein Journal enthielt nach erfolgreichen Objects-/States-Verbindungen
`Cannot write host object: EOS_PG_TRANSACTION_FAILED`, später
`CONTROLLER_NOT_READY`. Dies allein weist die innere Ursache nicht nach.
Der konkrete Host-Schreibfehler wurde zusätzlich im JavaScript-Vertrag
reproduziert: Der tatsächliche 7.2.2-Generator `getHostObject()` setzt
`native.process.env` auf das reale Node-Objekt `process.env`. Dessen Prototyp
ist kein gewöhnliches JSON-Objekt. Die strenge Dokumentprüfung weist es mit
`EOS_PG_DOCUMENT_INVALID` ab; dessen bisher fehlendes `code` wird in der
realen Store-Transaktion durch `EOS_PG_TRANSACTION_FAILED` ersetzt.

Die Wiederholung erfolgt mit echtem Controllergenerator, echtem Objects-Client
und echtem Store-Transaktionscode. Nur SQL-Treiber/Transport und die im Sandbox
nicht mögliche Netzinterface-Abfrage sind Testdoubles. Die Reproduktion
belegt diesen Quellfehler; sie beweist nicht, dass dies die einzige Ursache des
Pi-Abbruchs oder der noch gesetzten Wartungssperre war.

## Änderung und Sicherheitswirkung

- Nur für `system.host.<eigener Hostname>`, Dokumenttyp `host`, privilegierten
  Kontext und exakte Identität `native.process.env === process.env` ersetzt
  eine Kopie das Umgebungsfeld durch `{}`. Das Original bleibt unangetastet.
- Dokument, `native` und `process` müssen bereits gewöhnliche Objekte oder
  Objekte ohne Prototyp sein. Fremde Hosts, andere Dokumente, ähnlich aussehende
  Umgebungsobjekte und beliebige andere Prototypen bleiben abgewiesen.
- Die reale Prozessumgebung kann Zugangsdaten enthalten und wird bei diesem
  Controllerpfad weder im Hostobjekt noch im zugehörigen Ereignis gespeichert.
- Dokumentfehler erhalten einen festen `EOS_PG_DOCUMENT_*`-Code. Keine SQL-
  Rohmeldungen, Werte, Verbindungsdaten oder Umgebungswerte werden ausgegeben.
- Keine Änderung an Schema, Rollen, TLS, Transaktionsfristen oder SQL. Keine
  neue Abhängigkeit und keine Änderung der unveränderlichen R4/R5/R6-Archive.

## Tatsächlich ausgeführte Prüfungen

Umgebung: Scratch Linux x86_64, Node 24.19.0. Die vorhandenen tatsächlichen
7.2.2-Controllerbibliotheken wurden über `NODE_PATH` geladen. Der Zielstand
Node 24.21.0 / ARM64 wurde hier nicht ausgeführt. Auch PostgreSQL 17, mTLS,
systemd und der Pi sind nicht Gegenstand dieses Tests.

`before.log`: neue Regressionstests gegen die unveränderten Objects-Dateien aus
dem obigen Ausgangscommit. Der eigene Host-Schreibtest scheitert exakt mit
`EOS_PG_TRANSACTION_FAILED`; die negativen Diagnosetests unterscheiden die
vorherige Maskierung vom gewünschten festen Fehlercode. Die vollständigen
Zähler stehen im Rohbeleg.

`after.log`: **75 Tests bestanden, 0 fehlgeschlagen, 0 übersprungen**.
Ausgeführt mit dem Korrekturstand:

```sh
node --test tests/postgresql/host-object.test.cjs \
  tests/postgresql/objects.test.cjs tests/postgresql/objects-lifecycle.test.cjs \
  tests/postgresql/store.test.cjs tests/postgresql/store-review.test.cjs \
  tests/postgresql/store-channel-hardening.test.cjs
```

Die neue Regression prüft tatsächliche Host-Erzeugung, erfolgreichen atomaren
Schreibabschluss ohne Prozessumgebung, erneute Host-/Netzmetadatenänderung,
Callback-Vertrag, fremde Hosts, exotische Container-/Umgebungsprototypen,
unbekannte bzw. bekannte nichtadministrative Benutzer, gefälschte Rechte und
Dokumentfehlercodes einschließlich Tiefe und gefährlicher Merge-Schlüssel.
Bestehende Objects-Rechte-, Datei-, Rollback-, Verbindungslebenszyklus- und
Store-Transaktions-/Fristtests wurden erneut ausgeführt.

## Offen und Einordnung

Eine neue signierte Lieferung muss beide geänderten `.cjs`-Dateien tatsächlich
in `app/node_modules/@iobroker/db-objects-postgresql/` übernehmen und die
Quell-/Artefaktbindung prüfen. Nur Quellen unter `runtime/` bereitzustellen
ändert das installierte npm-Paket nicht. Prüfungen am zusammengebauten Paket,
kontrollierte Wiederaufnahme des abgebrochenen R4-Starts und anschließend
Start, Anmeldung und Neustart auf dem Pi bleiben getrennte Abnahmen.
Keine Anlagen-, Produktions-, IEC- oder CRA-Freigabe wird hier erklärt.
