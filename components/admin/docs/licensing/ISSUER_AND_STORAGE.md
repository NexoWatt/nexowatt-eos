# Hersteller, Key-Generator und verschlüsselte Lizenzablage

Stand: EOS Admin 7.10.11 / Client 1.0.2, Quellintegration vom 05.10.2026.

## Aktueller zentraler Systemvertrag

Aktuelle NWL3-Keys signieren UUID, Home/Pro-Edition, Gültigkeit und `scope: "system"`.
Der Admin leitet aus seiner Produktpolicy Home mit 3 Ladepunkten/2 Speichern oder
Pro mit 50 Ladepunkten/10 Speichern ab. Verbraucher nutzen ausschließlich die
kurze Freigabe aus `eos-admin`; sie erhalten keinen eigenen Schlüssel. NWL2 bleibt
mit den bisherigen engeren signierten Adapterlisten und Mengen kompatibel. Die
unten beschriebene NWL2-Erstellung ist der historische Formatvertrag, keine
zusätzliche Schlüsselpflicht für neue Adapter.

Der Admin-Lizenzdienst ist an die geschützte aktive EOS-Installation und seinen
freigegebenen Startpfad gebunden. Ein kopierter Admin in gewöhnlichem ioBroker
kann deshalb auch mit gültigem Token keine Betriebsfreigabe erteilen. Die
Plattformprüfung erfolgt vor Initialisierung und Import sowie bei jeder
Lizenzbewertung. Ohne Lizenz bleibt die Verwaltung auf EOS zur Aktivierung
erreichbar. [Plattformvertrag und Grenzen](ADAPTER_INTEGRATION.md).

## Aktivierungsstatus und Fehlerhilfe (07.10.2026)

Im angemeldeten EOS-Admin die Lizenzverwaltung öffnen, die dort angezeigte UUID
mit dem Lizenzauftrag vergleichen und den vollständigen `NWL3.…`-Code einfügen.
„Prüfen und aktivieren“ wartet auf Verifikation, verschlüsselte Speicherung und
Rückprüfung des zentralen Dienstes. Erst danach wird das Codefeld geleert und
„EOS Home/Pro aktiviert“ angezeigt. UUID, Edition, Gültigkeit, Berechtigungen
und Zeitpunkt der letzten bestätigten Abfrage bleiben separat sichtbar.
Ein erneutes Öffnen oder „Status aktualisieren“ liest den Gerätestatus wieder;
der gespeicherte Code wird nie an den Browser zurückgegeben.

Bei Ablehnung bleibt die Eingabe erhalten. Ein ungültiger neuer Code überschreibt
keine gültige vorhandene Lizenz. Nach fünf Sekunden ohne Bestätigung meldet die
Seite einen unbestätigten Status: zuerst aktualisieren, da eine Speicherung auf
dem Gerät bereits erfolgt sein könnte. Es gibt keine automatischen Import-Retries.
Statusabfragen erfolgen beim Öffnen, manuell und nach einer bestätigten Änderung;
der angezeigte Zeitpunkt ist kein fortlaufender Online- oder Anlagen-Nachweis.

| Anzeige | Nächster sicherer Schritt |
|---|---|
| `LICENSE_KEY_UNKNOWN` | Bestehenden Herstellertresor und zugehörigen öffentlichen Geräte-Vertrauensanker prüfen; nicht zur Fehlerbehebung einen neuen Tresor anlegen. |
| `LICENSE_UUID_MISMATCH` | Für die tatsächlich angezeigte EOS-UUID ausstellen. |
| `LICENSE_SIGNATURE_INVALID` / `LICENSE_FORMAT_INVALID` | Vollständigen unveränderten Code übertragen; keine Zertifikatsdatei einfügen. |
| `LICENSE_ADMIN_REQUIRED` | Erneut am EOS-Admin anmelden und Lizenzverwaltung dort öffnen. |
| `UI_TIMEOUT` / unbestätigter Status | Verbindung und aktuellen Gerätestatus prüfen; keine erfolgreiche Aktivierung annehmen. |

Alle Meldungen stammen aus festen, geheimnisfreien Fehlertexten. Rohantworten,
Signierschlüssel, Passphrasen und Tokens erscheinen nicht in Fehlerausgaben oder
Browser-Speicher. Die neuen Frontend-Vertragstests führen das ausgelieferte JS
mit DOM-/HTTP-Fixtures aus; sie ersetzen keinen echten Browser-/Pi-Abnahmetest.

## Separater Offline-Key-Generator (historischer NWL2-Vertrag)

Der neue NexoWatt Offline-Key-Generator 1.0.0 wird als **separates vollständiges Paket** bereitgestellt. Er erzeugt UUID-gebundene Home- und Pro-Lizenzen im unten beschriebenen NWL2-Format. Der Admin enthält den Verifizierer und die zentrale Lizenzverwaltung; das Herstellerwerkzeug wird nicht in den Admin eingebaut. Es werden keine produktiven privaten oder öffentlichen Herstellerschlüssel vorgegeben. Das erste Schlüsselpaar entsteht erst auf dem Herstellerrechner.

Frühere NW1-/NW1E-/NW1H-Lizenzen und zeitlich begrenzte Altformate werden nicht durch ein eingebautes HMAC-Geheimnis akzeptiert. Der Hersteller muss die Berechtigung prüfen und für dieselbe UUID eine neue NWL2-Lizenz ausstellen. Umbenennen eines alten Codes reicht nicht. Es gibt keine automatische Übernahme aus `nexowatt-ui/native.licenseKey` und keinen Klartext-Fallback. Bereits verteilte gemeinsame Geheimnisse sind für neue Lizenzen nicht weiterzuverwenden.

## Key-Generator verwenden

Voraussetzung ist ein vertrauenswürdiger Herstellerrechner mit Node.js 22 oder 24. Der Generator hat keine externen Runtime-Pakete und benötigt zum Ausstellen keine Internetverbindung. Unter Windows `Start-Windows.cmd` öffnen; unter Linux/macOS `sh start-linux-macos.sh` ausführen. Alternativ im entpackten Generatorverzeichnis `node cli.js serve` starten. Den angezeigten privaten Sitzungslink auf **demselben Rechner** öffnen. Die Oberfläche bindet nur an `127.0.0.1`; der zufällige Sitzungszugang gehört nicht in Logs, Screenshots oder Nachrichten. Dieser Lieferlauf verwendet Linux mit Node.js 24; native Windows-/macOS- und Node.js-22-Prüfungen bleiben getrennt nachzuholen.

1. Eine neue Schlüsselkennung (`kid`) festlegen und den Herausgebertresor mit einer starken, einmaligen Passphrase von mindestens 16 Zeichen anlegen. Passphrase sicher getrennt sichern; es gibt keine Wiederherstellungs-Hintertür.
2. Den öffentlichen Vertrauensanker als `license-trust.json` exportieren. Den angezeigten SHA-256-Fingerabdruck des öffentlichen SPKI-Schlüssels über einen getrennten, verlässlichen Übergabeweg prüfen und auf dem Zielsystem protokollieren.
3. Die tatsächliche System-UUID im EOS Admin ablesen und in den Lizenzauftrag übernehmen. Home oder Pro, erlaubte Adapter, konkrete Ladepunkt-/Speichermengen und Beginn/Ablauf prüfen. Ein leeres Ablaufdatum bedeutet unbefristet; diese Entscheidung vor dem Signieren bewusst prüfen.
4. Mit der Tresor-Passphrase signieren und die `.nwl`-Datei vertraulich übertragen. Den öffentlichen Vertrauensanker einmalig wie unten beschrieben auf dem Gerät bereitstellen, anschließend den Lizenzcode über die geschützte Admin-Lizenzseite importieren.
5. Adapterfreigaben und gesperrte Funktionen prüfen. Nach der Arbeit die lokale Sitzung beenden. Herstellertresor und Passphrase gehören weder auf Kundengeräte noch in den Admin, ein Repository, einen Supportupload oder ein unverschlüsseltes Backup.

CLI-Alternative; die Passphrase wird jeweils verdeckt abgefragt und darf nicht als Argument oder Umgebungsvariable mitgegeben werden:

```bash
node cli.js init nexowatt-issuer-2026
node cli.js trust license-trust.json
node cli.js issue auftrag.json lizenz.nwl
```

Ein Auftrag enthält genau `uuid`, `edition`, `adapters`, `limits`, `notBefore` und `expiresAt`. `notBefore: null` bedeutet den Ausstellungszeitpunkt, `expiresAt: null` eine ausdrücklich unbefristete Lizenz; andere Zeitwerte sind absolute Unix-Millisekunden. Ein vollständiges Auftragsschema und Bedienhinweise liegen im separaten Generatorpaket. Ausgabedateien werden nicht still überschrieben. Mit `--vault /absoluter/pfad` lässt sich ein eigener Tresor außerhalb des Generatorverzeichnisses wählen.

Standardablage: Benutzerverzeichnis `~/.nexowatt-keygen/issuer-1/issuer.nwk`. Der Ed25519-Privatschlüssel wird als PKCS#8-Material mit AES-256-GCM verschlüsselt; der Schlüssel dafür wird aus der Passphrase mit scrypt (`N=131072`, `r=8`, `p=1`) und zufälligem 32-Byte-Salt abgeleitet. Dazu kommen eine frische 12-Byte-Nonce, ein 16-Byte-Tag und authentifizierte Metadaten. Unter POSIX gelten 0700 für das Tresorverzeichnis und 0600 für die Datei. Unter Windows müssen die persönlichen NTFS-ACLs zusätzlich geprüft werden; POSIX-Modi bilden diese Prüfung nicht ab. Passphrasen werden nach der Anfrage aus Formularen entfernt, aber eine vollständige Löschung aller Speicherreste in JavaScript wird nicht zugesichert. Ein kompromittierter Herstellerrechner bleibt außerhalb dieser Schutzgarantie.

## NWL2-Vertrag

- Verfahren ausschließlich Ed25519; privater Signaturschlüssel bleibt beim Hersteller.
- Öffentlicher Prüf-Schlüssel: PEM SubjectPublicKeyInfo, BEGIN PUBLIC KEY, Typ Ed25519.
- Token: `NWL2.<payload64>.<signature64>`.
- `payload64`: base64url ohne Padding der exakten UTF-8-JSON-Bytes.
- Signierte Bytes: ASCII `NWL2.` plus exakt `payload64`.
- Signatur: Ed25519 mit diesen Bytes, danach base64url ohne Padding. Node.js: Algorithmusparameter `null`.
- Der Empfänger verifiziert die Originalbytes. JSON nach der Signierung niemals umformatieren.
- Token maximal 16.384 Zeichen; kein Verifizierungsalgorithmus aus dem Token wählbar.

Das JSON hat exakt diese Felder (keine geheimen Daten, Kundennamen oder Zahlungsdaten nötig):

| Feld | Vertrag |
|---|---|
| v | Zahl 2 |
| kid | Kennung des öffentlichen Herstellerschlüssels, 1..64 ASCII-Zeichen |
| licenseId | Eindeutige Lizenzkennung, 1..128 ASCII-Zeichen |
| uuid | Die von system.meta.uuid.native.uuid gelesene UUID; trim/lowercase; normale 36-Zeichen-UUID oder ioBroker-Präfix aus 2 Buchstaben direkt davor |
| edition | Genau `home` oder `pro` |
| issuedAt | Ganze Unixzeit in Millisekunden |
| notBefore | Ganze Unixzeit in Millisekunden, mindestens issuedAt |
| expiresAt | Ganze Unixzeit in Millisekunden größer notBefore oder null für eine vom Hersteller ausdrücklich dauerhaft ausgestellte Lizenz |
| adapters | Eindeutige Liste erlaubter Adapter-Namen ohne iobroker.-Präfix/Instanz, z. B. nexowatt-ui, nexowatt-devices; kein Sternchen |
| limits | Objekt mit genau chargePoints und batteries; ganze Zahlen |

Home: 1..3 Ladepunkte, 0..2 Speicher. Pro: 1..1000 Ladepunkte als technische Obergrenze des Schemas und 0..10 Speicher. Die tatsächlich verkaufte Zahl steht ausdrücklich signiert in der Lizenz. 1000 ist **keine** zugesicherte Systemleistung oder pauschale Verkaufslizenz. Home bleibt als Dauerlizenz möglich; Pro-Abrechnung und Sicherheits-Support sind getrennte Geschäftsprozesse. Zeitlizenzen verwenden ein absolutes Ablaufdatum, nicht eine durch Neuinstallation neu startende Laufzeit.

Beide Editionen: energy, wallet, smartHome, microgridSlave. Pro zusätzlich: microgridMaster, multisite, billing. Feature-Namen stammen aus dem festgelegten Servercode; kein frei eingesetztes Features-Array kann Rechte erhöhen. Die fachliche Zuordnung weiterer Apps muss beim Adapterumbau ergänzt und getestet werden. Diese begrenzte Matrix ist kein Nachweis, dass bestehende Apps bereits umgestellt sind.

## Vertrauensanker auf dem Gerät

Das integrierte EOS-Profil verwendet fest `/etc/nexowatt-eos/license-trust.json`. Es gibt dafür keinen Adapter-, Web- oder Umgebungsschalter. Die Bereitstellung erfolgt durch die autorisierten OS-Installations-/Wartungswerkzeuge.

Dateiinhalt ist ein JSON-Objekt: Schlüsselkennung auf öffentlichen PEM-Text. Es wird absichtlich keine nutzbare Beispiel-Schlüsseldatei mitgeliefert. Der Hersteller exportiert den öffentlichen Teil aus dem neu eingerichteten Generator. Fingerabdruck und Übergabeweg separat prüfen; anschließend den Export durch den OS-Serviceadministrator kontrolliert bereitstellen.

Unter Linux/POSIX müssen **die Datei und alle übergeordneten Verzeichnisse einschließlich der Pfadwurzel root gehören** und dürfen nicht gruppen-/weltbeschreibbar sein, zum Beispiel `root:root` mit Datei 0644 und Verzeichnissen 0755. Eine lediglich root gehörende Datei in einem austauschbaren Benutzerverzeichnis genügt nicht. Symlinks im Pfad und Mehrfach-Hardlinks auf die Datei werden abgelehnt. Ein Export im persönlichen Downloadverzeichnis ist deshalb noch kein gültig bereitgestellter Vertrauensanker. Dateirechte gezielt prüfen; keine pauschalen rekursiven Rechteänderungen auf der Anlage ausführen.

Eine Datei mit privatem Schlüssel wird abgelehnt. Unter Windows sperrt der Admin die Vertrauensankerprüfung ausdrücklich mit `TRUST_PLATFORM_UNSUPPORTED`, bis eine gleichwertige ACL-Prüfung umgesetzt und geprüft wurde. Das ist unabhängig vom separat startbaren Windows-Key-Generator. Fehlender oder ungültiger Vertrauensanker: keine Betriebsfreigabe, Admin bleibt zur Diagnose und Aktivierung erreichbar.

Schlüsselrotation: im Generator einen neuen Tresor mit neuer, eindeutiger kid anlegen. Den neuen öffentlichen Schlüssel zusätzlich in die vorhandene Trust-Zuordnung aufnehmen (höchstens 32 Schlüssel), Dienste neu starten, neue Lizenzen ausstellen und testen. Alten kid erst nach abgeschlossener Migration entfernen und erneut starten. Änderungen der Trust-Datei werden in diesem Stand beim Start gelesen; keine sofortige laufende Widerrufssynchronisation. Offline-Sperrung geschieht lokal durch Entfernen der Lizenz bzw. Entfernen des Herstellerschlüssels und Neustart. Ein zentrales sofortiges Offline-Widerrufen auf entfernten Geräten ist nicht möglich.

## Ablage und Schutzgrenze

Unter `getAbsoluteInstanceDataDir(adapter)/licensing/` liegen ausschließlich:

- `storage.key`: zufälliger lokaler AES-Schlüssel (32 Byte), kein aus der UUID abgeleitetes Geheimnis.
- `license.enc`: AES-256-GCM-verschlüsselter Lizenzcode einschließlich Zeit-Höchststand; frische 12-Byte-Nonce, 16-Byte-Tag, UUID als authentifizierte Zusatzinformation.

Verzeichnisrechte 0700, Dateien 0600, Eigentümer Laufzeitbenutzer. Keine Symlinks/Hardlinks; unsichere POSIX-Vorfahren werden abgelehnt. Insbesondere gruppenbeschreibbare ioBroker-Datenverzeichnisse müssen vorab geprüft werden. Keine pauschalen rekursiven chmod/chown-Befehle auf der Anlage ausführen. Die Windows-Lizenzfreigabe des Admin ist in diesem Stand durch die nicht unterstützte Vertrauensankerprüfung gesperrt; reine Node-Dateimodi würden eine Windows-ACL-Prüfung nicht ersetzen.

Die UUID ist kein Passwort. Sie bindet die Lizenz an die Installation, verhindert aber allein kein Klonen durch einen privilegierten Angreifer. AES schützt eine isoliert abgegriffene Lizenzdatei; wer Laufzeitrechte, root oder den kompletten Datenträger samt storage.key besitzt, kann die Lizenz entschlüsseln oder Software ändern. Höhere Schutzanforderungen benötigen getrennte OS-Benutzer, minimal berechtigte Dienste, Secure Boot/Signatur-Updates und bei Bedarf TPM-gebundene Schlüssel. Keine reine JavaScript-Lösung garantiert Kopierschutz gegen den Geräteeigentümer mit root.

Der Lizenzcode ist selbst ein signiertes, lesbares Transporttoken. Er wird **nach dem Import** verschlüsselt gespeichert. Kein Klartextcode wird von Status/API an Browser oder Adapter zurückgegeben. Import nur über HTTPS oder ausschließlich lokalen Loopback-Zugriff; Browser-LocalStorage wird nicht verwendet. Keine Screenshots/Logs des Codes erstellen. Netzwerkmitschnitt-Tests und reale ioBroker-Integration stehen noch aus.

## Backup, Uhr und Fehlerfälle

Lizenzdatei und storage.key gemeinsam in einem zusätzlich verschlüsselten, zugriffsgeschützten Gerätebackup sichern. Nur derselben UUID wiederherstellen. Verlust des lokalen Schlüssels bei vorhandenem Ciphertext wird nicht durch automatische Neuerzeugung verschleiert; kontrollierte Neuaktivierung durch den Hersteller erforderlich. Unvollständige oder beschädigte Sicherung bedeutet Sperre.

Davon getrennt den verschlüsselten Herstellertresor `issuer.nwk` sichern und die Passphrase getrennt aufbewahren. Eine Kopie des öffentlichen Vertrauensankers ersetzt den Privatschlüssel nicht. Verlust von Tresor oder Passphrase erfordert ein neues Schlüsselpaar, kontrollierte Verteilung des neuen öffentlichen Schlüssels und Neuausstellung betroffener Lizenzen; niemals einen gemeinsamen Ersatzschlüssel in den Admin einbauen.

Gültigkeitsprüfung erfolgt bei jeder Anfrage, alle fünf Sekunden zusätzlich und nach Import. Der an Verbraucher ausgegebene Zeitraum beträgt höchstens 15 Sekunden. Rückgestellte Uhr wird gegen monotone Laufzeit und verschlüsselten Zeit-Höchststand geprüft; Speicherung mindestens einmal pro Minute bei gültiger Lizenz. Vollständiges Zurückrollen des Datenträgers samt Uhr bleibt ohne Hardwareanker erkennbar unlösbar. Große legitime Zeitkorrekturen können daher einen Service-Neustart/Herstellerprüfung erfordern; kein heimlicher Freischalt-Fallback.

Eine Lizenzentfernung beendet bezahlte Betriebsfreigaben, löscht aber keine Gerätekonfiguration und stoppt nicht ungeprüft alle ioBroker-Prozesse. Der Verbraucheradapter muss Diagnose und gerätespezifische Schutzfunktionen erhalten. Anpassungen der echten Verbraucheradapter sind vor einer Produktfreigabe Pflicht.
