# Tatsächliches signiertes Managed-15-Archiv geprüft

Am 23.10.2026 wurde die vollständige öffentliche Herstellerdatei empfangen.
**Signatur, kompletter Dateireadback, Payload-/SBOM-Verträge und Quellenbindungen
bestanden.** Das Paket wurde nicht neu gebaut, verändert oder neu signiert.
Die Prüfung ergänzt den vorherigen
[Metadatennachweis](../managed15-public-metadata-20261023/README_DE.md).

| Bindung | Tatsächlicher Wert |
|---|---|
| Quellcommit | `f353dd08bf8ac5897e9b1c357994d4047a82ed6d` |
| Prüfwerkzeuge vor diesem Vermerk | `34fce29ef6c27f98390e1466662a95013b4ac206` |
| Release-ID | `95a87d5dad4d7c29b5b4e849bef5451ff113388e6ee07da6bd9e36bd9178d534` |
| Archivgröße | 134278673 Byte |
| Archiv-SHA-256 | `dee6181281241c04c9f1a1526685c45a0d4de347d088312a1ce9fe647d82ac44` |
| Öffentlicher Ed25519-Prüfschlüssel | `518f89debdb0b396d2abe7be8136b7ea5670c2a1f043705ed5d5528124067a40` |
| Lieferumfang | Sequenz 15, Auslieferungsrevision 12, `0.2.0-test.3`, Linux ARM64 |
| Laufzeit | Node 24.22.1, js-controller 7.2.5, PostgreSQL-Profil, sechs eigene Adapter |

## Prüfungen an den tatsächlichen Bytes

1. Der vertrauenswürdige Repository-Prüfer `verifyTestArchive` liest das gesamte
   Tar/Gzip mit begrenzten Header-/Dateigrößen zurück. Ed25519-Manifestsignatur,
   Release-ID, vollständige Dateimenge, Einzelhashes, Größen, Modi und Archivhash
   stimmen. 22606 Payload-Dateien mit zusammen 437907032 Byte; zusätzlich Manifest
   und Signatur. Keine Links oder Spezialdateien. Nur das gebündelte Node und
   ARM64-esbuild sind ausführbar markiert.
2. Der Repository-Extraktor übernimmt nur das bereits hashgebundene Archiv in
   eine frische Prüfablage. Anschließend stimmt das tatsächliche Inventar erneut
   exakt mit dem signierten Manifest überein. Kein hochgeladenes Programm wird
   für diesen Nachweis ausgeführt.
3. `validatePayload` besteht einschließlich Komponenten-/Versionstabellen,
   Controller-Transformationen, PostgreSQL-Profil, Netzwerk-/Updateprofil,
   CycloneDX-SBOM mit **646 Komponenten** und tatsächlichen Datei-/Buildbindungen.
   Der App-Baum mit 22431 Dateien bindet SHA-256
   `0d73d19b12dcc5505bf8fa63b25e41f0234173ddd946ae8a8a97eb1a38881557`.
   Der Builddatensatz bindet
   `800f89cd4d6683b74baba538c0b199602c6b7d2aa46817f111ce0b4f4df6fa75`.
4. 169 Quellen-/Hostdateien stimmen mit dem qualifizierten Commit überein:
   152 direkt und 17 über die bereits definierten Lizenzpfad-/Managed-Node-Unit-
   Transformationen. Alle vier vom R8-Einstieg verlangten Koordinatordateien
   sind jetzt auch gegen das tatsächliche signierte Manifest gebunden.
   Der unveränderte R8-Einstieg wird erneut bytegleich erzeugt.
5. Das native CI-Artefakt wurde unabhängig erneut von GitHub abgerufen:
   [Lauf 39736782733](https://github.com/NexoWatt/nexowatt-eos/actions/runs/39736782733),
   Artefakt 12408160061, 218143 Byte, SHA-256
   `6ff9a62ccb0a6b8b6fec788cff77d982faf6f89c943ba3353b43bcd12e439ab3`.
   Der native Nachweisprüfer bestätigt seine exakte Bindung an den gelieferten
   App-/Buildstand und die ursprünglichen Liefermetadaten. Die **15 historischen
   Linux-x64-Tests** wurden hierbei nicht erneut ausgeführt und sind kein Pi-Test.
6. Die ARM64-Architekturprüfung des App-Baums besteht mit 42 erkannten nativen
   Dateien/Assets und den dokumentierten Ausnahmen. Das darin angegebene
   `nodeRuntimeIncluded: false` bezieht sich auf diesen App-Scan; das separat unter
   `node-runtime/` gebündelte ARM64-Node wird zusätzlich durch Node-/SBOM-Verträge
   geprüft. Keine Ausführung oder Aussage über erfolgreiche Hardwareanbindung.

Umgebung: Linux x64, Node 24.19.0 als Prüfer, Python 3.12.14 als Archivleser.
Node 24.22.1/npm 11.19.0 bezeichnen die gebundene Hersteller-Toolchain, nicht
eine in diesem Schritt neu ausgeführte Kompilierung.

## Datentriage und verbleibende Befunde

Eine zweite Agentenprüfung bestätigte unabhängig Signatur und Archivreadback und
prüfte alle 22608 regulären Archivdateien auf erkennbare Geheimnisse, sensible
Dateinamen und Betreiberpfade. **Keine tatsächlichen Hersteller-/Kunden-Schlüssel
oder gespeicherten Betreiberzugänge identifiziert.** Ein vollständiger privater
RSA-Testvektor ist in der öffentlichen Dokumentation von `http-signature@1.2.0`
enthalten: ausdrücklich „Appendix A – Test Values“, keine EOS-Signierautorität
und keine ausführbare Referenz gefunden. Deshalb keine Aussage „enthält keinerlei
private Schlüsselblöcke“. Musterprüfungen garantieren nicht die Abwesenheit aller
denkbaren kodierten Geheimnisse. [Datentriage](delivery-data-review.json).

Der erneut gebundene historische Dependency-Audit enthält weiterhin **26 betroffene
Abhängigkeitsknoten: 20 high, 6 moderate, 0 critical**. Das sind keine 26 eindeutig
verschiedenen CVEs und kein Nachweis ihrer Erreichbarkeit. Dieser Schritt führt
keinen neuen Advisory-Abgleich aus und schließt keinen dieser Befunde.
[Gebundener Audit](qualified-dependency-audit.json).

Die Datentriage identifiziert außerdem einen bedingt erreichbaren Altpfad des
optionalen PostgreSQL-Backup-Providers: Shell-Kommandobildung aus Konfiguration
und die Restore-Implementierung benötigen gesonderte Nacharbeit. Er ist im
vorgesehenen EOS-Testprofil standardmäßig deaktiviert und wird vom normalen
logischen EOS-Backup nicht verwendet; er ist jedoch nicht vollständig aus der
Lieferung entfernt oder für jede mögliche Konfiguration gesperrt. Bis zur
Korrektur/Abnahme diesen optionalen Legacy-Provider nicht aktivieren oder seine
Restore-Funktion verwenden. Dies ist kein im Paket gespeichertes Kennwort und
kein durch diesen Scan reproduzierter Angriff. Kein vollständiger Restoretest.
[Gebundener Quell-/Erreichbarkeitsnachtrag](pgsql-followup.json):
`EOS-MANAGED15-PGSQL-20261023-01` erfasst die mögliche Eingabe-/Geheimnisgefährdung,
`EOS-MANAGED15-PGSQL-20261023-02` den quellbestätigten Restorefehler.
Die historischen Befunde `NW-EOS-INT-BAK-004/-005` bleiben unverändert offen.
Verantwortlich: NexoWatt-Entwicklung; vor Nutzung des optionalen Providers
Prozessaufrufe, Fehlerbehandlung und autorisierte Wiederherstellung korrigieren
und tatsächlich prüfen.

## Reproduktion und Belege

[Gesamtergebnis](verification.json), [reproduzierbarer Prüfer](verify-received-archive.cjs),
[erste Archivprüfung](archive-verification.json), [Extraktor-Ergebnis](extraction.json),
[Payloadprüfung](payload-verification.json), [Quellbindungen](source-bindings.json),
[erneute native Nachweisbindung](native-evidence-verification.json).

Nach sicherer Extraktion mit dem Repository-Extraktor und Bereitstellung des
oben hashgeprüften nativen CI-Artefakts, vom Repositorywurzelverzeichnis:

```bash
node reports/integration/managed15-archive-verification-20261023/verify-received-archive.cjs /ABSOLUTER/PFAD/eos-linux-arm64.tar.gz /ABSOLUTER/PFAD/extracted/bundle/payload /ABSOLUTER/PFAD/eos-own-adapters.YWMeq1tR
```

Der Prüfer liest vorhandene Daten und führt Repository-Prüfmodule aus; er startet
keinen Payload. Er prüft auch die aktuelle Zeitgültigkeit des leeren signierten
Feeds (Ablauf `2026-11-22T19:13:09.971Z`). Ein späterer abgelaufener Feed wird
korrekt abgewiesen. `git diff --check` und Inhaltsprüfung gehören zu diesem
Nachweisstand; unveränderte Produkt- und Hardwaretests wurden nicht wiederholt.

## Veröffentlichung vorbereitet, Zielsystem noch offen

`delivery/r8-managed15/` enthält den bytegleichen Einstieg mit ursprünglichen
Vorbereitungsmetadaten. `delivery/managed-test-15/` enthält ausschließlich die
öffentlichen Liefermetadaten und den Prüfschlüssel. Deren `published: false`
ist der unveränderte Erzeugungsnachweis; spätere Veröffentlichung separat belegen.
Das 134-MB-Archiv wird als GitHub Release-Asset vorbereitet, nicht in Git abgelegt.
[Vorgesehene Assets](release-assets.json), [vorbereiteter Releasetext](RELEASE_NOTES_DE.md).

Release-Upload, öffentlicher Archivdownload mit erneuter Signatur-/Hashprüfung,
aktiver leerer Updatekanal und endgültiger Betreiberbefehl sind zum Zeitpunkt
dieses Vermerks noch offen. Der vorhandene Connector kann keine Release-Assets
hochladen; die ergänzend geprüfte Browserseite verlangt eine GitHub-Anmeldung.
Dieser Nachweis ersetzt weder diese Anmeldung noch einen erfolgreichen Upload.

R8-/ARM64-/Pi-Migration, systemd-/APT-/Neustart-/Stromausfall- und Restoreabnahme,
Gerätefunktionen und physische Steuerung sind nicht ausgeführt. Der Teststand
bleibt ohne physische Steuerfreigabe; keine Produktions- oder CRA-Freigabe.
