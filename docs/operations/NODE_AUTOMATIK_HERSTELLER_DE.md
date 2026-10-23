# Herstellerablauf für automatische Node-24-Aktualisierungen

Stand: 23.10.2026. Die Anlage installiert dafür ausdrücklich freigegebene,
signierte Node-Pakete selbstständig. Jedes Paket bleibt innerhalb von Node 24
und erhöht die Version. App, Adapter, Abhängigkeiten, Katalog, Hostwerkzeuge
und Datenbankschema bleiben gegenüber dem authentifizierten Ausgangsrelease
bytegleich. Allgemeine EOS-Änderungen erhalten weiterhin einen eigenen Updateweg.

## Einmalige Basis und spätere Pakete

Die neue Frischbasis beziehungsweise der direkte R8-Migrationsstand muss zuerst
die Automatik enthalten. Ein historischer Quellstand oder das bisherige
24.22.1-Paket erhält sie nicht nachträglich allein durch einen Feed-Eintrag.
Für ein späteres Node-Paket wird der tatsächliche signierte Ausgangsstand
benötigt, einschließlich Manifest, Signatur, Payload und öffentlichem Schlüssel.
Seine ursprüngliche `resolution-lock.json` muss zum signierten Buildnachweis
passen. Kundendaten und installierte Gerätekonfiguration gehören nicht dazu.

Die folgenden Beispiele verwenden den später am 23.10.2026 bestätigten
[zweiten Ersatzschlüssel des Herstellers](WINDOWS_SIGNIERRECHNER_DE.md).
Die erste Ersatzbindung vom selben Tag wurde nach erneutem Passphrasenverlust
abgelöst; die historischen öffentlichen Schlüssel und Nachweise bleiben erhalten.
Zuerst muss die
damit signierte Basis über den authentifizierten Einstieg installiert sein;
die Angaben ersetzen kein bereits auf einer Anlage verankertes Vertrauen.

Der Hersteller prüft die nächste offizielle Node-24-Version und übernimmt deren
ARM64-/x64-Archivpins in `tools/integration/node-runtime-policy.json`. Die
Laufzeit- und Integrationsprüfung erfolgt mit dieser genauen neuen Version.
Derzeit ist dort 24.22.1 hinterlegt; ein weiterer 24.22.1-Umpackversuch wird
abgewiesen. Diese Anleitung behauptet keine bereits existierende Folgeversion.

## Vorbereitung ohne erneuten App-Bau

Auf dem sauberen Linux-Herstellerstand mit der vorgesehenen Node-Werkzeugkette:

```bash
node tools/integration/prepare-node-only-runtime.cjs \
  --baseline-bundle /pfad/authentifizierter-ausgang/bundle \
  --public-key /pfad/release-public.pem \
  --public-key-sha256 518f89debdb0b396d2abe7be8136b7ea5670c2a1f043705ed5d5528124067a40 \
  --resolution-lock /pfad/ausgangsbuild/resolution-lock.json \
  --node-archive /pfad/geprueftes-offizielles-node-arm64-archiv.tar.xz \
  --output /pfad/neuer-node-kandidat \
  --sequence 16
```

Sequenz 16 ist nur das Beispiel für einen Ausgangsstand mit Sequenz 15.
Jeder Folgeauftrag benötigt eine höhere, bisher unbenutzte Sequenz und ein
neues Ausgabeverzeichnis. Der öffentliche Schlüssel muss unabhängig zum
installierten Herstellervertrauen passen; ein mitgelieferter beliebiger
Schlüssel reicht nicht.

Der Helfer prüft Signatur und vollständiges Dateiinventar des Ausgangspakets,
kopiert dessen App und Katalog, ersetzt die drei Node-Dateien und bindet die
SBOM neu. Alle npm-Komponenten und deren tatsächliche Baumbezüge bleiben
erhalten. `nodeOnlyUpdate` im Buildnachweis trennt den aktuellen
Hersteller-Werkzeugcommit von dem ursprünglichen Commit der erhaltenen Quellen.
Die SBOM kennzeichnet ausdrücklich die wiederverwendete npm-Auflösung.
Ein neuer npm-Bau oder eine erneute Dependency-Auflösung findet nicht statt.

## Neue native Qualifikation

Für **diesen** vorbereiteten Baum ist erneut das vollständige isolierte
Linux-x64-Labor aus dem Job `native-own-adapters` der
`.github/workflows/security-review.yml` auszuführen. Im Vorbereitungsschritt
wird der eben erzeugte Node-Kandidat übergeben:

```bash
node tests/integration-own-adapters/prepare-security-refresh.cjs \
  /pfad/neues-wegwerf-labor /pfad/neuer-node-kandidat
```

Die weiteren Schritte richten ausschließlich das getrennte Wegwerflabor ein
und prüfen echte PostgreSQL-/Adapterprozesse, HTTPS-Anmeldung, zentrale Lizenzen,
Backup und Neustart. Diese Hostschritte gehören weder auf den Signierrechner
mit privatem Schlüssel noch auf den Anlagen-Pi. Alte native Belege werden vom
Signierer wegen des neuen Quell-/Build-/Node-Bezugs abgewiesen.

Der qualifizierte Baum kann mit `pack-prepared-runtime.cjs` und den neuen
nativen Nachweisen transportiert werden. Der Transporttyp
`unsigned-node-only-runtime` enthält nur App, Node, Katalog, SBOM, Buildnachweis
und den erhaltenen Auflösungslock. Er erfindet keine neuen npm-Rohdaten oder
Transformationsläufe. Nach dem Entpacken sind Quellen, Signatur des Ausgangs
und native Belege weiterhin zu prüfen.

## Signierung und Angebot

Auf dem geschützten Signierrechner wird derselbe saubere Werkzeugcommit mit
dem qualifizierten Kandidaten verwendet. Der private Schlüssel bleibt außerhalb
des Repositorys; die lokale Behandlung des verschlüsselten Schlüssels folgt der
[Windows-/WSL-Anleitung](WINDOWS_SIGNIERRECHNER_DE.md).

```bash
node tools/bootstrap/build-node-only-test.cjs \
  --baseline-bundle /pfad/authentifizierter-ausgang/bundle \
  --public-key /pfad/release-public.pem \
  --public-key-sha256 518f89debdb0b396d2abe7be8136b7ea5670c2a1f043705ed5d5528124067a40 \
  --prepared-runtime /pfad/neuer-node-kandidat \
  --native-evidence /pfad/neue-native-belege \
  --private-key /pfad/geschuetzt/temporarer-lokaler-signierschluessel.pem \
  --sequence 16 \
  --node-archive /pfad/geprueftes-offizielles-node-arm64-archiv.tar.xz
```

Der Signierer kopiert die authentifizierte alte Payload einschließlich der
Hostwerkzeuge. Er ersetzt ausschließlich `node-runtime/bin/node`,
`node-runtime/runtime.json`, `node-runtime/LICENSE`, `sbom.cdx.json` und
`runtime-build.json`. Das tatsächlich signierte Inventar muss sowohl die
normale Updateprüfung als auch die strengere Node-Automatikprüfung bestehen.
Es entstehen lokale Lieferdateien; der Befehl veröffentlicht nichts.

Nach Veröffentlichung und vollständigem öffentlichen Bytevergleich wird das
Angebot in den signierten Kanal aufgenommen. Es übernimmt Release-ID, Größe,
SHA-256, Node-Version und Ausgangsrelease aus `delivery.json` und setzt
`automaticNodeUpdate: true`. `fromReleaseIds` enthält nur tatsächlich gegen
diesen unveränderten Quellenbestand geprüfte Ausgangsstände. Der vorhandene
`sign-managed-channel.cjs` prüft auch dieses Angebot mit dem Empfängerschema.

Der Hersteller muss den signierten Kanal rechtzeitig erneuern: Seine Gültigkeit
beträgt höchstens 31 Tage. Ein abgelaufener oder fehlender Kanal wird als Fehler
angezeigt und berechtigt nicht zur Installation. Auch ein zunächst leeres
Angebot muss bei der ersten Auslieferung mit dem dauerhaften Herstellerschlüssel
signiert und veröffentlicht werden. Automatisch ist die Installation auf der
Anlage; die Herstellerprüfung, neue native Qualifikation und Pflege dieses
signierten Angebots bleiben erforderlich.

Die Anlage prüft erneut Signatur, Ausgangsrelease, streng höhere Node-24-Version
und unveränderte App-/Hostdateien. Ein gesetztes Automatikfeld allein macht ein
allgemeines EOS-Update nicht automatisch zulässig. Bei Fehlern bleiben Diagnose,
Wartungssperren und der geprüfte Rückfallpfad erhalten.

## Nachweise und offene Zielprüfung

Die aktuellen Helfer sind durch lokale Vertragsprüfungen abgedeckt; ein
zukünftiges Node-Archiv wurde damit noch nicht qualifiziert oder signiert.
Die neue native Qualifikation, öffentliche Rücklesung und konkrete Pi-Abnahme
sind für jedes tatsächliche Lieferpaket gesondert nachzuhalten. Ein erfolgreicher
Linux-x64-Lauf ersetzt keine ARM64-/Anlagenprüfung.

[Prüfbericht der Herstellerwerkzeuge](../../reports/integration/automatic-security-updates-20261022/automatic-install/packaging/README_DE.md)
