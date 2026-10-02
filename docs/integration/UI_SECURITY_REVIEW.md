# NexoWatt UI 1.0.21: Prüfung der Integrationsgrundlage

Stand: 30.09.2026. **Quellprüfung und isolierte Funktionsreproduktionen; keine Produktfreigabe.**
Das vom Nutzer als aktuell bezeichnete ZIP ist die maßgebliche UI-Quelle. Es wurde
nicht aus einem verifizierten Git-Commit gewonnen. Die öffentlich abgerufene
Repository-Adresse lieferte für diese Prüfung keine nutzbare Quelle; das belegt
weder die Löschung noch die Nichtexistenz eines gegebenenfalls privaten Repositorys.

## Quell- und Komponentenbindung

| Feld | Nachweis |
| --- | --- |
| Paket | `iobroker.nexowatt-ui` 1.0.21; `package.json` und `io-package.json` stimmen überein |
| Archiv | `NexoWatt_UI_1.0.21_STABLE_FULL_REPOSITORY (1).zip` |
| Archiv SHA-256 | `90db619ecd754cab335dae92fdc123a48f62ceffb505a2a2b832e119d885eefe` |
| Runtime SHA-256 | `main.js`: `67d3ef9b866ea9903cf932109ea37ba8c63f5f1ea51130f682981e25c66c241b` |
| Maßgebliche Runtime-Quelle | `src-ts/runtime-executables/main.ts`, SHA-256 `83d9c4ad4223858fdd78c4ed6bbec8f2f12489000f13e35cb67a4820fb367c9f` |
| Node-Vorgabe | `>=22`; kein Nachweis der Version auf dem RPi |
| Controller-Vertrag | `js-controller >=6.0.11`, `io-package.json:104–108`; tatsächlichen Systemstand separat erfassen |
| Admin-Vertrag | `admin >=7.0.0`, `io-package.json:109–113`; kein automatischer Wechsel auf Admin 8 |
| Lizenzangabe | Manifest: `UNLICENSED`; beiliegende `LICENSE`: NexoWatt Proprietary License v1.0 |
| Lockfile | Root Lockfile v3, 342 Package-Einträge einschließlich Root; keine Aussage zum installierten Laufzeitbaum |
| Gelockte direkte Abhängigkeiten | adapter-core 3.4.1, type-detector 5.0.10, Express 4.22.2, Nodemailer 10.0.10 |

Der Build-Header von `main.js` nennt genau den nachgerechneten Hash der
TypeScript-Quelldatei. Änderungen müssen später dort und über den bestehenden
Generator erfolgen. Ein vollständiger Build, Abhängigkeitsscan und Vergleich
aller erzeugten Dateien wurde hier nicht durchgeführt. Eine neue UI-Version,
ein neuer Lizenzgenerator und ein Produktionsupdate wurden nicht erstellt.

## Offene Befunde

Die Prioritäten sind risikobasierte Arbeitsprioritäten, keine CVSS-Bewertungen.
Quellpfade beziehen sich auf die unveränderte ZIP-Extraktion. Tests mit einem
erwarteten unsicheren Ergebnis bestätigen den Befund; sie schließen ihn nicht.

### NW-UI-260930-01 — HTTP auf allen Schnittstellen (P1)

`io-package.json:117–118,273` gibt Port 8188 und `0.0.0.0` vor.
`main.js:26318–26351` startet `app.listen` und kündigt eine HTTP-Adresse an.
`main.js:12854–12860` setzt `Secure` nur bei einem verschlüsselten Socket;
der direkte HTTP-Pfad erzeugt damit Cookies ohne dieses Attribut.
Die entsprechende TypeScript-Stelle ist `src-ts/runtime-executables/main.ts:26302–26335`.

**Bedingung/Wirkung:** Ein erreichbarer direkter Listener bietet keine TLS-
Vertraulichkeit oder Gegenstellenprüfung. Loginpasswort, Sitzungsdaten und
Anlageneingriffe können auf dem ungeschützten Transport mitgelesen bzw. manipuliert
werden. Ein vorgelagerter TLS-Proxy kann den externen Weg schützen; er wurde weder
im Lieferumfang noch auf Hardware nachgewiesen und darf keinen direkten Bypass
offenlassen. `UI-TEST-001/005` belegen Konfiguration und Cookie-Verhalten ohne
Netzwerklistener.

**Umsetzung:** Ein überprüfter gemeinsamer HTTPS-Einstieg mit lokal gebundenem,
abgeschottetem Backend oder direkte geprüfte TLS-Anbindung; interne Netzwerkwege
nach dem Systemvertrag absichern. Cookie-, Proxy- und WebSocket/SSE-Verhalten
zusammen testen. Das Admin-Setup eines anderen Adapters sichert diesen separaten
HTTP-Listener nicht allein durch die dortige Anmeldung ab.

### NW-UI-260930-02 — Kundensteuerung standardmäßig anonym (P1)

`io-package.json:398` und `main.js:12711–12714` setzen `customerWritePolicy=all`.
`main.js:13000–13016` lässt dann Anforderungen ohne Sitzung durch, obwohl
`auth.enabled` und `protectWrites` eingeschaltet sind. Konkreter Schreibpfad:
`main.js:13379–13478`, SmartHome-Schalter; zusätzlich verwendet `/api/set`
in `main.js:24309` dieselbe Middleware.

**Bedingung/Wirkung:** Bei gültiger Lizenz und erreichbarem Listener können
nicht angemeldete Clients freigegebene Kundengeräte bzw. Kundensteuerfunktionen
betätigen. Der Befund behauptet keine beliebigen Roh-DP-Schreibrechte oder einen
allgemeinen Adminzugriff. `UI-TEST-002` führt die unveränderte Middleware und den
Schalterhandler auf einem Fixture-Gerät aus; der einzige Write landet im
Speicherstub. `UI-TEST-003` bestätigt die wirksame explizite Session-Policy.

**Umsetzung:** Neue Systeme mit verpflichtender Session/definiertem Pairing
ausliefern. Bestehende Kundenbedienung über eine dokumentierte Anmeldung und
Migration erhalten. Keine Änderung an Lade-/Netzschutzalgorithmen dafür nötig.
LAN-Zugehörigkeit allein authentifiziert keinen Nutzer. Origin-Kontrolle ist
kein Ersatz für Authentifizierung: im Quellstand werden Anforderungen ohne
Origin bzw. mit `Origin: null` bewusst zugelassen (`main.js:12125–12128`).

### NW-UI-260930-03 — Symmetrisches Lizenzgeheimnis im ausgelieferten Code (P1)

`main.js:2253–2312` beziehungsweise
`src-ts/runtime-executables/main.ts:2237–2296` enthält HMAC-Erzeugung und
-Prüfung mit einem fest eingebauten gemeinsamen Geheimnis. Der geheime Wert
und die erzeugten Testschlüssel werden in diesem Bericht und den Rohbelegen
nicht ausgegeben.

**Bedingung/Wirkung:** Wer das verteilte Paket lesen kann und die Ziel-UUID kennt,
kann mit der vorhandenen Routine einen von derselben Prüfung akzeptierten
Voll-Lizenzschlüssel erzeugen. Das verletzt die gewünschte zentrale
Freischaltgrenze; es beweist für sich allein weder eine Admin-Anmeldung noch
einen Fernzugriff. `UI-TEST-008` reproduziert den Zusammenhang ausschließlich
für eine künstliche UUID im Speicher; eine andere UUID wird als Gegenprobe
abgewiesen.

**Umsetzung:** Lokale Prüfung asymmetrisch signierter Lizenzansprüche; nur
öffentlichen Prüfkey an Geräte liefern. Private Ausstellerschlüssel außerhalb
der Geräte halten. Die Adapter erhalten begrenzte, authentisierte Freigaben
statt des gemeinsamen Rohschlüssels. Bereits verteiltes gemeinsames Geheimnis
bei der Migration als bekannt behandeln, Bestandslizenzen kontrolliert umstellen.

### NW-UI-260930-04 — Lizenz wird unverschlüsselt im Adapterobjekt abgelegt (P2)

`main.js:12440–12447` schreibt `native.licenseKey` direkt;
`src-ts/runtime-executables/main.ts:12424–12431` enthält denselben Pfad.
`io-package.json` enthält keine `encryptedNative`-/`protectedNative`-Deklaration.
`main.js:12370–12401` gibt den vollständigen Schlüssel zudem an korrekt
autorisierte Administratoren aus. Das ist keine nachgewiesene anonyme Offenlegung.

**Bedingung/Wirkung:** Ein Akteur mit Zugriff auf das betreffende Objekt oder
entsprechende ungeschützte Datenbanksicherungen kann den gespeicherten Schlüssel
lesen. Ob ein bestimmter anderer Adapter diese Berechtigung besitzt, hängt von
Controller und Konfiguration ab und wurde hier nicht nachgewiesen.
`UI-TEST-009` erfasst das tatsächliche Speicherargument im Stub.

**Umsetzung:** Zentrale verschlüsselte Ablage mit eigener Dienstidentität und
definiertem Schlüsselzugriff; geschützte Sicherung und Restore-Verfahren.
Adapter sollen Berechtigungen erhalten, keinen Lizenzrohwert lesen müssen.
Verschlüsselung auf demselben Gerät schafft allein keinen Schutz vor einem
vollständig privilegierten Hostangreifer.

### NW-UI-260930-05 — Berechtigungsentzug erreicht aktive Sitzung nicht (P2)

`main.js:12823–12834` übernimmt die beim Login gespeicherte Rolle bis zum
Ablauf; `main.js:12979–12985` nutzt diese auch für strikte Zugriffe.
`main.js:13256–13260,13290–13299` legt Rollen in der Session ab.
Die voreingestellte Lebensdauer beträgt 120 Minuten
(`io-package.json:194`, `main.js:12747–12748`).

**Bedingung/Wirkung:** Wird einer angemeldeten Person die Admin-Gruppe entzogen,
bleibt die alte Session im untersuchten Pfad weiterhin Admin. `UI-TEST-006`
zeigt, dass eine neue Gruppenauflösung bereits `none` ergibt, während die alte
Session weiter `admin` zurückgibt. `UI-TEST-007` bestätigt die Ablaufprüfung.
Neustart/Logout können diese konkrete Sitzung entfernen; Widerruf auf
Benutzer-/Gruppenänderung wurde im geprüften Pfad nicht gefunden.

**Umsetzung:** Sessions an eine widerrufbare Berechtigungsversion binden oder
aktuelle Rechte begrenzt zwischenspeichern und bei Benutzer-/Gruppenänderung
verwerfen. Passwortwechsel, Kontosperre, Rollensenkung und Logout mitprüfen.

### NW-UI-260930-06 — Fehlerhaft kodiertes Cookie erzeugt Parser-Ausnahme (P2, Wirkung offen)

`main.js:140–150` dekodiert jeden Cookiewert ohne Fehlerbehandlung.
`UI-TEST-010` bestätigt eine `URIError` bei einem synthetisch fehlerhaften Wert.
Einige asynchrone Status-/Rollenpfade rufen den Parser ohne lokalen Catch auf.
Ein Prozessabsturz oder reproduzierbarer Netzwerk-DoS wurde **nicht** getestet
und wird nicht behauptet. Das globale Verhalten hängt auch von Express,
Controller und Prozessfehlerbehandlung ab.

**Umsetzung:** Fehlerhafte Werte kontrolliert verwerfen bzw. 400/401 liefern;
Fehlerpfad im tatsächlichen isolierten HTTP-/Controller-Test nachprüfen.

## Vorhandene wirksame Maßnahmen und Grenzen

- Installer-, Mapping-, SmartHome-Konfigurations- und Lizenzzugriffe besitzen
  serverseitige Capability-Gates. Die strikte Variante umgeht den allgemeinen
  `auth=false`-Bypass; `UI-TEST-004` bestätigt die anonyme Sperre.
- Zufällige Sitzungstoken entstehen mit `crypto.randomBytes(24)`; Cookies sind
  `HttpOnly`/`SameSite=Lax`, abgelaufene Sessions werden verworfen.
- Login besitzt IP-bezogene Begrenzung (5 Fehlversuche; 10 Minuten Sperre),
  JSON-Größenlimits und gefilterte öffentliche State-Snapshots sind vorhanden.
  Deren vollständige Belastbarkeit oder Umgehungsfreiheit wurde nicht geprüft.
- Lizenz-Bootstrap ist als begrenzte Pfad-/Methodenliste implementiert.
  Er ist kein Ersatz für sichere Erstinbetriebnahme oder Transportverschlüsselung.
- Kein Test schaltete einen echten Aktor, startete einen Listener oder änderte
  eine Controller-, Geräte- oder Betriebssystemkonfiguration.

## Prüfablauf, Erfüllungsstand und nächste Arbeit

Ausgeführt unter Node **24.19.0** in der Entwicklungsumgebung:

```sh
EOS_UI_SOURCE=/pfad/zur/NexoWatt-ui-1.0.21-STABLE \
  node --test --test-reporter=tap tests/integration/ui-source-reproduction.test.cjs
```

Ergebnis: **10/10 Reproduktionen/Kontrolltests bestanden**, keine übersprungen.
Quelle wird vor der Ausführung an Runtime- und Manifest-Hashes gebunden.
Rohbeleg: `reports/integration/ui-source-reproduction.tap`.
Maschinenlesbarer Befundstand: `system/integration/ui-security-observations.json`.
Dieser Testlauf ist kein `npm run test:all`, Build, Penetrationstest,
RPi-Integrationstest oder Funktionsnachweis für die gesamte UI.

Freigabe für das neue sichere System bleibt offen. Zuerst die TLS-/Anmeldegrenze
und Lizenzarchitektur mit EOS Admin und js-controller gemeinsam umsetzen,
dann Widerruf und Eingabefehler behandeln. Parallel die vorhandenen UI-/EMS-
Regressionstests, Bild-/Navigationsbaseline und bestehenden Konfigurationen
erhalten. Der hier unveränderte Stand 1.0.21 ist der Bezug für diese Migration.
Die Befunde liefern technische Evidenz für die CRA-Risikoakte; sie begründen
keine vollständige CRA-/IEC-Konformität oder Zertifizierung.
