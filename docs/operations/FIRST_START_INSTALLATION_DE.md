# EOS dev9: Vollinstallation und geschützter Erststart

Stand: 3. Oktober 2026 · Anforderung `EOS-REQ-ONBOARD-20261002`.
Lizenzergänzung: Eigene NexoWatt-Bestandteile erfordern vorherige schriftliche
Nutzungserlaubnis; [Abgrenzung und neue Lieferprüfung](../development/LICENSING_CHANGE_2026-10-03_DE.md).
Die unten beschriebenen früheren Laufzeitnachweise enthalten diese spätere
Lizenzänderung noch nicht. Eine Einrichtung ohne Aktivierungsschlüssel ersetzt
die erforderliche Nutzungserlaubnis nicht.

Quellkorrektur vom 03.10.2026: Der neue Assistent erledigt ausschließlich
**Geräte-UUID, Home-/Pro-Lizenz und Adminpasswort**. Die UUID erscheint nach dem
Besitzcode schreibgeschützt und lässt sich vor der Passwortvergabe kopieren.
Ein vorhandenes zweistelliges Präfix gehört zur vollständigen Kennung.
Standort, Anlagenwerte und Geräte werden bei der späteren Kundenanbindung erfasst.
Diese Änderung ist nicht rückwirkend Bestandteil der signierten R4-Dateien.
[Änderung und Prüfungen](../../reports/integration/minimal-first-start-20261003/README.md).

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
im neuen Verzeichnis `reports/integration/installable-test3-20261003/`; frühere
Prüfungen stehen unverändert in [verification-summary.json](../../reports/integration/first-start/verification-summary.json).
Die historischen signierten Verzeichnisse test.1 und test.2 bleiben unverändert.
Die vom Nutzer gemeldete test.2-Verifikation auf Debian 13/ARM64 belegt nur
den Bundle-Inhalt. Sie wird hier weder als eigene Messung noch als vollständiger
EOS-Start, neue Installation oder Hardwareabnahme gezählt.

Der frühere Vollbuild `d` blieb am Serialport-Nativegate hängen. Dieser
historische Befund steht unverändert in
[build-status.json](../../reports/integration/first-start/build-status.json).
Der neue Build bindet die beiden ARM64-Bibliotheken samt fester Loader und
separater SBOM-Ableitung. Der TEST-Signierschlüssel verbleibt ausschließlich
im Arbeitsspeicher; die Linux-Rechteprüfung beim Installieren bleibt bestehen.
Der tatsächliche neue Lieferstatus und die aktuellen Rohbelege werden unter
`reports/integration/installable-test3-20261003/` geführt.

**Für den aktuellen Einstieg aus Git die [test.3-Installationsanleitung](GIT_TEST3_INSTALLATION_DE.md)
verwenden.** Sie verbindet Archivehash, unabhängigen Releaseschlüssel-Pin,
Signatur-/Paketprüfung, echten nativen Ziel-Ladeversuch und anschließende Installation.
Die folgenden direkten Bundlebefehle dokumentieren den darunterliegenden Vertrag.

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
3. Die vollständige Geräte-UUID kopieren und damit im Keygen 1.0.2 eine
   Home- oder Pro-Lizenz erstellen. NWL3 lizenziert das System ohne Adapterliste
   oder frei wählbare Mengen. Die bestehende Editionsmatrix bleibt im Backend
   wirksam. Bestehende NWL2-Lizenzen werden mit ihren ursprünglichen Grenzen
   weiter geprüft. Der öffentliche Vertrauensanker muss zum bestehenden
   Hersteller-Tresor passen; keinen neuen Issuerschlüssel erzeugen.
4. Lizenz einfügen und prüfen. Die Signatur, tatsächliche Geräte-UUID und Edition
   werden serverseitig kontrolliert. Die neue Oberfläche verlangt eine gültige
   Lizenz. Der alte Schema-2-Vertrag bleibt für vorhandene Übergaben lesbar.
5. Das eigene Passwort für das feste Konto `admin` zweimal eingeben:
   15–128 Unicode-Zeichen, maximal 256 UTF-8-Bytes, keine Steuerzeichen.
   Anlagen- und Geräteangaben gehören nicht mehr in diesen Schritt.
6. Abschluss absenden. Die geschützte Schema-3-Übergabe enthält Passwort-Hash,
   Lizenz und einen serverseitigen Vermerk für die spätere Kundeninbetriebnahme.
   Es werden keine Standort-/Anlagendaten erfunden. Der Root-Abschluss prüft das
   signierte Release und die Lizenz erneut. Der feste Runtime-Lizenzschreiber
   speichert die Lizenz verschlüsselt; Passwort und Token gehören nicht in Logs.
   Erst nach HTTPS-Startprüfungen werden Abschluss und Autostart gespeichert.
7. Auf Port 8081 als `admin` mit dem gerade vergebenen Passwort anmelden.
   Die UI liegt auf Port 8188. Persönliche Installateur-/Benutzerkonten können
   anschließend eingeladen werden. Anlagenwerte und Geräte folgen bei der
   Kundenanbindung samt gesonderter Abnahme.

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
Ein fester systemd-`ExecStopPost`-Wächter ist an denselben Dienstlauf gebunden
und versucht bei unvollständigem Abschluss auch nach Prozessabbruch, die
Startfreigabe zu entfernen und den Controller zu stoppen. Die Gesamtfristen
betragen 840 Sekunden im Finalizer, 900 Sekunden für den Dienststart und
120 Sekunden für den Stop. Reale Abbruch-/SIGKILL-Tests sind weiterhin offen.
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
- Vollständige UI-Entwicklungsprüfungen: `build:ts` besteht mit der deklarierten
  lokalen Toolchain. `test:all` ist wegen der POSIX-Prüfungen unter Windows und
  eines überschrittenen Mesh-Zeitbudgets weiterhin nicht vollständig bestanden.
  Die gezielten Lizenz-, Typ-, Syntax-, Spiegel- und Manifestprüfungen bestanden;
  sie ersetzen diese übergeordneten Gates nicht.
- Sämtliche Geräte-, Regelungs-, Grenzwert-, Lizenz-/Anlagen- und Hardwaretests.

Diese Punkte sind **offen, nicht ausgeführt**. Lokale Modultests, echte Loopback-
TLS-Tests und Dienstvertragstests ersetzen sie nicht. Keine Produktionsfreigabe.

