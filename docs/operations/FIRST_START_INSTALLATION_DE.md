# EOS dev9: Vollinstallation und geschützter Erststart

Stand: 3. Oktober 2026 · Anforderung `EOS-REQ-ONBOARD-20261002`.
Lizenzergänzung: Eigene NexoWatt-Bestandteile erfordern vorherige schriftliche
Nutzungserlaubnis; [Abgrenzung und neue Lieferprüfung](../development/LICENSING_CHANGE_2026-10-03_DE.md).
Die unten beschriebenen früheren Laufzeitnachweise enthalten diese spätere
Lizenzänderung noch nicht. Eine Einrichtung ohne Aktivierungsschlüssel ersetzt
die erforderliche Nutzungserlaubnis nicht.

UUID-Ergänzung: Im Schritt **„3 · Lizenz prüfen“** zeigt das schreibgeschützte
Feld **„Geräte-UUID für die Lizenzerstellung“** nach Eingabe des Einrichtungscodes
die Kennung dieses Systems. Das Servicepasswort muss dafür noch nicht gespeichert
und eine Lizenz noch nicht eingegeben sein. Mit **„UUID kopieren“** übernimmst du
die vollständige Kennung für die Lizenzerzeugung. Ist der Zwischenablagezugriff
gesperrt, lässt sich die markierte Kennung manuell kopieren. Auch ein vorhandenes
zweistelliges Präfix gehört zur UUID und muss übernommen werden. Anschließend
kann die erzeugte signierte NWL2-Lizenz im selben Schritt geprüft werden.
Der Server verwendet für diese Prüfung die installierte Systemkennung; das Feld
ändert sie nicht. [Anforderung und Prüfgrenzen](../requirements/EOS-REQ-ONBOARD-UUID-20261003.md).

Verbindlicher Ausgangstext: [übernommene Anforderungsdatei](../requirements/EOS-REQ-ONBOARD-20261002.txt).
Die lokal vorhandene Datei trug keinen Namenszusatz `(1)`. Die darin erwähnte
ZIP-Zugriffssperre betraf den vorherigen Chat; die Quellen waren diesmal vorhanden.

## Liefer- und Prüfstatus

Der neue Quellpfad baut alle sechs Produktadapter und den Controller gemeinsam:
Admin 7.10.11, UI 1.0.21, Devices 0.5.169, EEBUS 0.3.0, OCPP21 0.4.0,
Backup 1.0.10 und js-controller 7.2.2. Dazu kommen die drei PostgreSQL-
Backendpakete, die Setup-Oberfläche, Dienste und Installationswerkzeuge.
`runtime/product/scope.cjs` prüft den Umfang vor dem Build und erneut an
tatsächlichen Paketmanifests, Einstiegspunkten und Lockdateien. Ein verkürztes
test.2-Paket erfüllt diesen Vertrag nicht.

**Quellenimplementierung und ausgeführte Hostinstallation sind getrennte
Nachweise.** Der aktuelle Build-/Lieferstatus und sämtliche Rohprotokolle stehen
in [verification-summary.json](../../reports/integration/first-start/verification-summary.json).
Die historischen signierten Verzeichnisse test.1 und test.2 bleiben unverändert.
Die vom Nutzer gemeldete test.2-Verifikation auf Debian 13/ARM64 belegt nur
den Bundle-Inhalt. Sie wird hier weder als eigene Messung noch als vollständiger
EOS-Start, neue Installation oder Hardwareabnahme gezählt.

Der tatsächliche Vollbuild `d` wurde offline zusammengestellt; die Runtime-SBOM
und ihre Bindung an 686 installierte npm-Pakete wurden geprüft. Das unveränderte
Architekturgate meldet jedoch 25 Befunde zu Serialport-Nativeprebuilds, darunter
fehlende Node-ABI-Nachweise. **Es wird kein neuer signierter test.3-Kandidat
mitgeliefert.** Zusätzlich verlangt das Signierwerkzeug einen Linux-Buildhost
mit belastbaren POSIX-Schlüsselrechten. Belege und genaue Dateipfade stehen in
[build-status.json](../../reports/integration/first-start/build-status.json).
Vor einer neuen Installation müssen diese Build-/Nativegates bearbeitet und
ein passender signierter Kandidat erzeugt werden. Das historische test.2 ist
dafür kein Ersatz.

## Voraussetzungen und öffentlicher Vertrauensanker

Ziel bleibt ein frischer, isolierter Debian-13-ARM64-Testhost mit der bestehenden
geprüften Node-/PostgreSQL-Vorbereitung. Die zuvor erfolgreich vorbereitete
Linux-/PostgreSQL-/Node-Umgebung muss dafür nicht neu installiert werden.
Ein bereits begonnener alter Enrollment-/Installationslauf muss vor weiteren
Schritten lokal inventarisiert werden; dieser Installer überschreibt keinen
Bestandsbetrieb. `prepare-inputs.py` und dessen Benutzerpasswörter gehören
ausdrücklich nicht zum neuen Ablauf.

Der Betriebssystemadministrator übernimmt das neue signierte Bundle und seinen
unabhängig authentisierten öffentlichen Releaseschlüssel in einen root-eigenen
Pfad. Ein mitgelieferter Schlüssel ohne unabhängigen Hashabgleich beweist keine
Herstellerherkunft. Der **öffentliche Lizenzvertrauensanker** wird ebenfalls
mit unabhängig bestätigtem SHA-256 bereitgestellt. Der private Hersteller- oder
Lizenzsignierschlüssel darf sich nicht auf dem Zielgerät befinden. Eine Datei
aus dem Browser ersetzt diesen Vertrauensanker nicht.

Die folgenden Befehle beschreiben den implementierten Vertrag für einen fertig
gebauten und geprüften **test.3-Kandidaten**. Sie sind kein Nachweis, dass ein
solcher Kandidat auf diesem Pi installiert wurde. Platzhalter werden lokal
durch die bestätigten Pfade/Hashes ersetzt. `hosts.json` enthält ein JSON-Array
der vorgesehenen DNS-Namen/IP-Adressen; die HTTPS-Adresse muss darin enthalten
sein. Hier werden ausschließlich öffentliche Host-/Vertrauensdaten vorbereitet:

```sh
sudo /usr/bin/node /root/EOS/tools/system/prepare-onboarding.cjs \
  --hosts-file /root/eos-input/hosts.json \
  --origin https://EOS-HOST:8443 \
  --license-trust /root/eos-input/license-public-trust.json \
  --license-trust-sha256 BESTAETIGTER_SHA256 \
  --output /root/eos-input/setup.json

sudo /usr/bin/node /root/EOS/tools/system/eos-base.cjs install \
  --bundle /root/eos-test3/bundle \
  --public-key /root/eos-test3/release-public.pem \
  --start yes --setup-input /root/eos-input/setup.json
```

Bei Signatur-, Paketumfang-, PostgreSQL-/mTLS-, Rollen- oder Hostfehlern bricht
der Installer ab. Der Installer benötigt keine Benutzerpasswörter. Er erzeugt
technische Schlüssel lokal geschützt, initialisiert PostgreSQL und startet
zunächst nur Datenbank, HTTPS-Setup und notwendige Wartungsdienste. Admin/UI
und physische Adapter werden dadurch noch nicht als eingerichtete Instanzen
gestartet. Fehler werden als begrenzte Codes protokolliert, ohne Passwort-/Codewerte.

## Ablauf im Browser

1. Über den vertrauenswürdigen lokalen Gerätezugang das öffentliche Geräte-CA-
   Zertifikat `/etc/nexowatt-eos/web/ca.crt` und seinen Fingerabdruck unabhängig
   abgleichen und im verwalteten Browser vertrauen. Erst danach die konfigurierte
   Adresse `https://EOS-HOST:8443` öffnen. Zertifikatswarnungen nicht übergehen.
2. Den rootgeschützten Einrichtungscode aus `/etc/nexowatt-eos/setup-code.txt`
   lokal anzeigen und im Formular eingeben. Der zufällige 192-Bit-Code gilt
   zehn Minuten. Er ist ein Besitznachweis, kein Benutzerpasswort, und gehört
   niemals in eine URL, ein Ticket, einen Bericht oder ein normales Log.
3. Standortname, Sprache und IANA-Zeitzone eintragen. Im Lizenzschritt die
   gerätegebundene signierte Lizenz eingeben und prüfen lassen. Die angezeigte
   UUID stammt aus der initialisierten Datenbank. Signatur, UUID, Gültigkeit,
   Edition, Adapter und Geräteanzahlen werden gegen den authentischen lokalen
   Herstellervertrauensanker geprüft. Alternativ ausdrücklich ohne Lizenz
   fortfahren; das erteilt keine Nutzungs- oder Steuerrechte.
4. Die vorhandenen Anlagenwerte und Messpunkt-IDs eingeben: Anschlussleistung,
   Phasen, Nennspannung, Phasenstromgrenze, Sicherheitsreserve, Datenalter und
   gegebenenfalls die vorgesehenen Steuersignale. Die Form prüft technische
   Bereiche aus dem Produktcode. Diese Prüfung ersetzt keine elektrische
   Auslegung oder Messung. Fehlende Anlagendaten ausdrücklich als offen angeben;
   sie werden nicht durch erfundene Werte ergänzt.
5. Den Geräteplan aus den unterstützten Produktvorlagen und Verbindungsfeldern
   erfassen; bis zu 16 Positionen sind im Erststartplan möglich. Modbus-, EEBUS-
   und OCPP-Angaben werden validiert, jedoch nicht verbunden oder aktiviert.
   Keine Geräte beziehungsweise eine spätere Konfiguration müssen ausdrücklich
   gewählt werden. Lizenzkapazitäten und zugelassene Adapter werden auch beim
   Root-Abschluss erneut geprüft. Geräteprüfung und Anlagenfreigabe bleiben offen.
   Der noch deaktivierte Plan wird geschützt in `system.meta.eosFirstStart`
   gespeichert; die bekannten Messpunkt-/Hüllkurvenfelder werden in die UI-
   Konfiguration übernommen. Physische Adapterinstanzen werden dabei nicht erzeugt.
6. Das eigene Passwort für das feste erste Konto `admin` (NexoWatt Service)
   zweimal eingeben: 15–128 Unicode-Zeichen, maximal 256 UTF-8-Bytes, keine
   Steuerzeichen. Eine frei wählbare Administratorrolle gibt es im Formular nicht.
7. Abschluss absenden. Der Webdienst übergibt Passwort-Hash, validierte
   Einstellungen und gegebenenfalls die signierte Lizenz in einer geschützten
   Übergabedatei an den festen Root-Abschlussdienst. Dieser prüft
   das signierte Release erneut, legt Konten/Konfiguration an, lädt die festen
   Webassets und startet ausschließlich Admin/UI. Die Lizenz speichert ein
   separater Dienst unter `eos-runtime` im vorhandenen verschlüsselten Admin-
   Lizenzstore; sie landet weder in Objektmetadaten noch in Kommandoargumenten.
   Erst nach authentisierten
   HTTPS-Startprüfungen werden Abschluss und Autostart gespeichert und Setup
   beendet. Ein Verbindungsabbruch im Browser beweist keinen erfolgreichen Start.
8. Die angezeigte HTTPS-Anmeldeseite auf Port 8081 öffnen und das eigene Passwort
   verwenden. UI liegt auf Port 8188. Unter Benutzer persönliche Installateur-/
   Benutzerkonten einladen. Die Empfänger vergeben über einen kurzlebigen Code
   ihr eigenes Passwort; Details im [Kontenbericht](../security/ONBOARDING_ACCOUNTS_REVIEW_DE.md).

Die Zustände bleiben ausdrücklich getrennt: **installiert**, **eingerichtet**,
**für Anlagenbefehle freigegeben**. Der Abschluss dieses Kandidaten lässt den
letzten Zustand `false`. Auch eine gültige Lizenz hebt die ausstehende technische
Geräte-/Anlagenabnahme und die feste Schreibsperre nicht auf.
Ausdrücklich zurückgestellte Konfigurationsschritte bleiben als offen gespeichert.
Sie werden durch ein erfolgreich angelegtes Benutzerkonto nicht erledigt.

## Abbruch, Codeerneuerung und Neustart

Nach Codeverbrauch ist die Sitzung 15 Minuten gültig. Ein normaler Reload
verwendet dieselbe kurzlebige sichere Sitzung. Bei Sitzungsablauf oder Neustart
vor dem verbindlichen Abschluss stellt ausschließlich der lokale OS-Administrator
einen neuen Besitzcode aus:

```sh
sudo /usr/bin/node /opt/nexowatt/eos/current/runtime/onboarding/issue-code.cjs
```

Der neue Code steht rootgeschützt in `/etc/nexowatt-eos/setup-code.txt`; die
Ausgabe enthält nur Status/Pfad. Alte Codes und Sitzungen werden ungültig. Der
Befehl verweigert die Erneuerung, sobald ein Commit begonnen hat oder ein
Abschlussmarker vorhanden ist. Crash-/Mutationslocks werden nicht automatisch
entfernt. Der Webdienst erhält weder sudo- noch Datenbankzugang.

Während des Abschlusses gilt ein exklusiver persistenter Wartungslock.
Fehler versuchen stets, die Startfreigabe zu entfernen und den Controller zu
stoppen. Teilweise Objektwrites bleiben gesperrt. Es gibt keine behauptete
Transaktion über den gesamten ioBroker-Objektstore und die Systemd-Wirkungen.
Nach Stromausfall oder unterbrochenem Commit sind Diagnose und kontrollierte
Wiederherstellung eines frischen Snapshots erforderlich. Marker oder Locks
nicht einfach löschen, um weiterzustarten. Ein solcher Wiederherstellungsablauf
ist noch auf dem Zielhost nachzuweisen.

## Noch offene Abnahme

- Vollständiger nativer Installationslauf des neuen Bundles auf Debian 13/ARM64,
  PostgreSQL 17/mTLS/Rollen und tatsächliche Dienste-/UID-/Dateirechte.
- Frischer Boot, Reboot, Stromausfall an jeder Commitgrenze, Recovery und Restore.
- Browserdarstellung und kompletter Admin-/UI-Login einschließlich Einladungs-
  und Lizenzrouten mit dem echten Gerätezertifikat; vollständiger Admin-Typcheck.
- Sämtliche Geräte-, Regelungs-, Grenzwert-, Lizenz-/Anlagen- und Hardwaretests.

Diese Punkte sind **offen, nicht ausgeführt**. Lokale Modultests, echte Loopback-
TLS-Tests und Dienstvertragstests ersetzen sie nicht. Keine Produktionsfreigabe.
