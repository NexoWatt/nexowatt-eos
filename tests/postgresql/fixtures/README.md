# Isoliertes PostgreSQL-Labor

Diese Fixtures sind Entwicklungsprüfungen, kein Installer. Sie starten keine
Hostdienste, ändern keine vorhandenen Datenbanken und verweigern die Ausführung
als root. PostgreSQL 17.11, OpenSSL und ein normales Betriebssystemkonto müssen
bereits vorhanden sein. Node 24.21.0 und der gesondert aufgelöste öffentliche
Client `pg@8.23.1` gehören zum Prüfstand.

`lab-cluster.cjs` legt ein privates temporäres Verzeichnis, eine leere Datenbank,
kurzlebige Laborzertifikate und einen Listener ausschließlich auf 127.0.0.1 an.
Die Authentifizierung erfolgt mit Clientzertifikaten; TLS 1.3 ist die
Mindestversion. Jeder Lauf erhält einen freien Port. Wenn PostgreSQL den Port
nicht mehr binden kann, schlägt der Lauf fehl. Es gibt keinen Klartext-Fallback.

Beispiel für eine bereits vorbereitete, isolierte Test-VM (Pfade an deren
Werkzeugablage anpassen):

```sh
EOS_PG_BIN_DIRECTORY=/usr/lib/postgresql/17/bin \
EOS_PG_CLIENT_DIRECTORY=/pfad/zum/labor/node_modules/pg \
node --test --test-reporter=tap tests/postgresql/tls-lab.test.cjs
```

Das Fixture kann auch importiert werden:

```js
const { startLab } = require('./lab-cluster.cjs');
const lab = await startLab({ binDirectory, schemaFile });
try {
  // lab.metadata enthält Zertifikatpfade, niemals deren private Schlüssel.
  // lab.psql(sql) ist ausschließlich die lokale Bootstrap-Schnittstelle.
} finally {
  await lab.stop();
}
```

Optionales `schemaFile` darf ausschließlich das EOS-Schema für diesen leeren
Prüfcluster sein. Die lokale Bootstrap-Rolle besitzt Verwaltungsrechte und darf
nicht an Produktadapter weitergegeben werden. Private Schlüssel und Datenpfade
gehören nicht in Prüfarchive. `stop()` beendet nur den eigenen Prüfcluster und
löscht nur sein markiertes temporäres Verzeichnis; bei ungeklärtem Serverstatus
bleiben die Dateien erhalten.

Im derzeitigen Ausführungsraum ist ausschließlich UID 0 abgebildet. PostgreSQL
verweigert dort den Start korrekt. Die echten TLS-Prüfungen sind deshalb
**nicht ausgeführt**; der bestandene Root-Abweisungstest ersetzt sie nicht.

`schema-wasm.test.cjs` prüft separat SQL und RLS in PGlite 0.5.8 / PostgreSQL
18.3 WASM. Das ist keine Freigabe des vorgesehenen PostgreSQL 17.11 und kein
Nachweis für Netzwerk, Zertifikate, Parallelität, Stromausfall oder ARM64.
PGlite wird ausschließlich als synthetisches Laborwerkzeug eingesetzt und nicht
als EOS-Komponente ausgeliefert. Es ist nicht der aktuelle PostgreSQL-Sicherheitsstand.
