# NWL3: interne Prüfung des bestehenden Systemlizenzpfads

Stand: 2026-10-05; geprüfter Commit
`50740e8872db7c739dd3a593ce8e43d217b8770a`. Diese Prüfung änderte keinen
Produktcode, keinen Adapterpaketinhalt und keinen historischen Lieferstand.
Sie ist eine interne Quell- und lokale Vertragsprüfung, kein externer Audit.

## Ergebnis und Claims-Vertrag

Der tatsächlich ausgelieferte Admin-Verifier unterstützt NWL3 bereits. Die
Dateien für Core, Service und Policy unter `build/lib` sind bytegleich mit den
geprüften Dateien unter `src/lib`. Eine neue Produktimplementierung ist dafür
nicht erforderlich.

Das Format ist `NWL3.<payload>.<signature>`. Payload und Signatur verwenden
kanonisches Base64url ohne Padding. Ed25519 signiert exakt die ASCII-Bytes
`NWL3.<payload>`; auch der Versionspräfix ist damit authentifiziert. Die
unveränderte Trust-Zuordnung bestimmt den Schlüssel über `kid`.

Das JSON-Payload muss genau diese neun Felder enthalten:

```json
{
  "v": 3,
  "kid": "issuer-key-id",
  "licenseId": "license-id",
  "uuid": "12345678-1234-4234-8234-123456789abc",
  "edition": "home",
  "issuedAt": 1791158400000,
  "notBefore": 1791158400000,
  "expiresAt": null,
  "scope": "system"
}
```

Das Beispiel ist ein Schema-Beispiel, kein signierter oder aktivierbarer Key.
`edition` erlaubt ausschließlich `home` oder `pro`; Zeitangaben sind sichere
nichtnegative Ganzzahlen in Millisekunden. Für NWL3 gilt zwingend
`notBefore === issuedAt`, `expiresAt === null` und `scope === "system"`.
`adapters`, `limits`, `features` und andere Zusatzfelder werden auch bei
kryptografisch gültiger Signatur abgelehnt. Die normalisierte Geräte-UUID muss
mit `system.meta.uuid` übereinstimmen.

Die zentrale vertrauenswürdige Policy bestimmt die Rechte:

| Edition | Ladepunkte | Speicher | Features |
| --- | ---: | ---: | --- |
| Home | 3 | 2 | `energy`, `wallet`, `smartHome`, `microgridSlave` |
| Pro | 50 | 10 | Home plus `microgridMaster`, `multisite`, `billing` |

**1000 ist keine NWL3-Pro-Freigabe.** Dieser Wert begrenzt das ältere
NWL2-Mengenschema und den Transportvalidator. Die aktuelle NWL3-Policy und
die bestehende UI-Kapazität liegen bei 50 Ladepunkten für Pro.

## Weg zu den sechs eigenen Adaptern

Admin verifiziert und speichert den Systemkey verschlüsselt und stellt auf dem
lokalen Bus kurzlebige `eos.license.check`-Freigaben bereit. An Verbraucher
gehen Protokoll-v1-Antworten mit Edition, Features, Grenzen und maximal
15 Sekunden Gültigkeit; weder NWL3-Token noch Schlüssel werden weitergereicht.
Die sechs enthaltenen Kopien des gemeinsamen Clients sind bytegleich. Der
Client ist damit unabhängig vom zentral verifizierten Tokenpräfix.

| Adapter | Geprüfter Bezug zur zentralen Entscheidung |
| --- | --- |
| EOS Admin | Einzige Token-Autorität; NWL3-Systemscope benötigt keine Adapterliste, prüft aber aktivierte lokale Senderinstanzen und deren Anforderungen. |
| NexoWatt UI | Liest ausschließlich die aktuelle zentrale Lease. Der historische Methodenname `_nwRefreshLicenseFromConfiguredKey` liest keinen lokalen Key. Feature- und Mengengrenzen bleiben zentral gebunden. |
| NexoWatt Devices | Gemeinsamer Guard mit `energy` und geprüftem Inventar aller Devices-Instanzen; geforderte Mengen werden zentral bewertet. |
| EEBUS | Gemeinsamer Guard mit `energy`; Start und Kommandos bleiben an die gültige zentrale Lease gebunden. |
| OCPP | Gemeinsamer Guard mit `energy` und erforderlicher physischer Ladepunktzahl; Laufzeitprüfung verwendet zentrale Ladepunktgrenzen. |
| NexoWatt Backup | Gemeinsamer Guard mit `energy`; neue operative Arbeit benötigt eine gültige zentrale Lease. |

NWL2 bleibt als ausdrücklich aktiviertes Altformat mit seinen signierten
Adapterlisten und engeren Grenzen erhalten. Es gibt keine automatische
Umdeutung in NWL3 und keinen lokalen Legacy-Key, der die zentrale NWL3-Lease
übersteuert. Eine absichtliche erneute zentrale Aktivierung eines NWL2-Tokens
ersetzt die Lizenz und stellt dessen engere Rechte wieder her; dies ist kein
Fallback.

Die EOS-Plattformprüfung ist unabhängig davon weiterhin verpflichtend.
Der R9-Testumfang lässt nur Admin und UI zur Ausführung zu; die vier
Hardware-/Backup-Adapter bleiben installiert und zurückgestellt. NWL3 erweitert
diese Ausführungszulassung nicht.

## Nachweis

Linux, Node.js `v24.19.0`; **79 Tests bestanden, 0 Fehler, 0 übersprungen**.
Die unveränderte Ausgabe steht in `nwl3-readonly.tap`.

```sh
node --test --test-reporter=tap \
  components/admin/test/eos-license-core.test.cjs \
  components/admin/test/eos-license-service.test.cjs \
  components/admin/test/eos-license-client.test.cjs \
  components/admin/test/eos-license-build-parity.test.cjs \
  tests/integration/own-adapter-admission.test.cjs
```

Enthalten sind echte Ed25519-Signaturprüfung, UUID-/Claim-/Präfix-Manipulationen,
verschlüsselte Speicherung und Wiederanlauf, NWL3-Policygrenzen, NWL2-Ersetzung,
Lease-Fristen, Clientkopien und tatsächliche ausgelieferte Admin-/UI-Einstiege.
Die Service-/Clienttests ersetzen den lokalen Bus und die positive
Plattformumgebung durch explizite Test-Fixtures. Separate negative
Einstiegstests führen den echten Plattformschutz ohne EOS-Installation aus.
Dies belegt keinen nativen Node.js-24.21.0-Managementlauf und keinen aktiven
Hardwarebetrieb. Der neue native NWL3-Test und dessen Signierevidenz-Gate werden
separat geführt. Es wurde weder signiert noch veröffentlicht.

`source-hashes.json` bindet die gelesenen wesentlichen Produktdateien sowie die
ausgeführten Testdateien und die gespeicherte Testausgabe an diesen Prüfstand.

## Verbindlicher nativer NWL3-Liefernachweis

Der neue native R9-Lauf aktiviert über die echte Admin-HTTPS-Schnittstelle
NWL3 Home, entzieht die Freigabe und aktiviert NWL3 Pro. Der Signier-/
Publikationsgate verlangt jetzt ausdrücklich `licenseFormat: "NWL3"` in der
quell- und appgebundenen Erfolgsevidenz. Fehlendes Format oder reine NWL2-Evidenz
werden verweigert. 13 lokale Gate-/Builderfälle bestanden (`signing-gate.tap`);
diese ersetzen den noch ausstehenden tatsächlichen nativen Lauf nicht.
