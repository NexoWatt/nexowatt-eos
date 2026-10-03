# EOS-Erststart: Konten und Steuergrenzen

Stand: 2. Oktober 2026. Änderung `EOS-REQ-ONBOARD-20261002`.
Dieses Dokument beschreibt Quelländerungen und lokale Prüfungen. Es ist kein
Nachweis einer vollständigen Installation auf dem Pi und keine Hardwarefreigabe.

## Berechtigte persönliche Konten

Das erste Servicekonto wird im HTTPS-Erststart eingerichtet. Danach erzeugt
die angemeldete Service-Administration unter **Benutzer → Persönliches Konto
einladen** ein Konto mit der festen Rolle Benutzer oder Installateur. Die
Rolle wird serverseitig geprüft. Installateure und Benutzer dürfen keine
Einladungen ausstellen und können dadurch keine höhere Rolle anlegen.

Der Administrator erhält einen zufälligen 192-Bit-Einladungscode, den er dem
vorgesehenen Empfänger über einen vertrauenswürdigen Weg übergibt. Der Code ist
30 Minuten gültig. Im Objektstore liegt nur SHA-256 des Codes. Das neue Konto
bleibt deaktiviert und hat noch kein Passwort. Ein abgelaufener Code kann durch
erneutes Einladen desselben unveränderten, deaktivierten Kontos ersetzt werden;
der alte Code verliert dabei seine Gültigkeit.

Der Empfänger öffnet auf dem HTTPS-Admin-Port den Pfad
`/nexowatt/account/accept` und gibt Benutzername, Code sowie eigenes Passwort
mit Wiederholung ein. Der Code steht nie in der URL oder im Browserstorage.
Das Passwort muss 15 bis 128 Unicode-Zeichen, höchstens 256 UTF-8-Bytes und
keine Steuerzeichen enthalten. PBKDF2-HMAC-SHA256 nutzt 600.000 Iterationen
und das bestehende Controllerformat. Der gesamte Passworttext wird weder im
Objektstore noch in Protokollen gespeichert.

Die Annahme verlangt HTTPS-same-origin, den ausdrücklichen Requestheader und
JSON mit höchstens 4 KiB. Ein globaler Schreibauftrag verhindert parallele
Inventaränderungen und begrenzt KDF-Arbeit. Höchstens 30 Annahmeversuche pro
Minute erreichen die Prüfung. Vor und nach der Passwortableitung werden
Einrichtungsstatus, Kontorevision, Rollenmitgliedschaft und Ablauf geprüft.
Passworthash, Aktivierung und dauerhafter Codeverbrauch werden anschließend
gemeinsam in **einem** Benutzerobjekt gespeichert. Ein erneuter Aufruf erhält
keine Sitzung und kann den verbrauchten Code nicht nochmals benutzen.

Die Aufnahme des deaktivierten Kontos, der Gruppe und des Inventars erfolgt
über mehrere Objektwrites. Ein Ausfall dazwischen lässt das Konto gesperrt,
kann aber den strengen Startabgleich verhindern. Diese Teilaufnahme verlangt
kontrollierte Host-Reparatur beziehungsweise Wiederherstellung. Eine allgemeine
Transaktion oder Isolation gegen parallele privilegierte Root-/DB-Änderungen
wird nicht behauptet. Die Benutzeranlage wird innerhalb des einzigen festen
Adminprozesses serialisiert; beliebige zusätzliche Admininstanzen sind nicht
zugelassen.

## Anlagenbefehle bleiben gesperrt

Installation, Kontoeinrichtung, gültige Lizenz und technische Anlagenfreigabe
sind getrennte Bedingungen. Die vorhandene unveränderliche UI-Schreibsperre
bleibt aktiv und die UI startet keine EMS-Regelung. Zusätzlich verweigert
der Admin-Socket auch einer gültigen Service-Sitzung rohe State-Schreibbefehle,
beliebige Adapterkommandos und die Aktivierung weiterer Adapterinstanzen.
Zentrale Lizenzabfrage und eng begrenzte Verwaltungswege bleiben erreichbar.

Numerische elektrische Grenzen werden nicht aus erfundenen Standardwerten
abgeleitet. Solange Gerätezuordnung, zulässige Grenzen, Lizenzumfang,
Anlagenschutz und sichere Wiederaufnahme nicht passend abgenommen wurden,
ist der verbindliche Gerätemodus `disabled-pending-acceptance`.

## Lokale Nachweise und Grenzen

Der Rohbeleg
[`admin-accounts-and-control.tap`](../../reports/onboarding/admin-accounts-and-control.tap)
enthält 51 gemeldete Tests: 50 bestanden, ein Linux-UID-/Dateimodus-Test auf
dem Windows-Entwicklungshost ausdrücklich übersprungen. Geprüft wurden unter
anderem fremde Rollen und Zusatzfelder, fehlende Berechtigung, falscher und
abgelaufener Code, Wiederverwendung, Parallelannahme, I/O-Abbruch vor Aktivierung,
Neustart des Einladungsmoduls, Rollenänderung während der KDF sowie Budgetgrenzen.
Der echte `runtime/bootstrap/accounts.cjs`-Abgleich akzeptiert sowohl die
deaktivierte Einladung als auch das danach aktivierte persönliche Konto.

Die bestehenden Admin-Rollen-/Passwortregressionen sind enthalten. Der lokale
HTTPS-Test prüfte echte TLS-1.3-Verbindungen mit Gegenstellenprüfung sowie die
Ablehnung von TLS 1.2 und einer nicht vertrauten CA. OpenSSL stammte aus der
vorhandenen Git-for-Windows-Installation. Dies ersetzt keine Browserprüfung
mit dem späteren Gerätezertifikat und keine Linux-Rechteprüfung.

Der ergänzende
[`admin-invitation-parser.tap`](../../reports/onboarding/admin-invitation-parser.tap)
meldet vier bestandene Tests mit echtem Express 5.2.1 und body-parser 2.3.0.
Der exakt kompilierte Einladungs-Routenabschnitt lief in einem lokalen
HTTP-Parserprüfserver. Malformed JSON mit synthetischem Passwort, übergroße
Nachrichten und nicht unterstütztes Charset enden im routeneigenen
Vier-Argument-Fehlerhandler mit generischem JSON. Kein Parserfehler gelangt
zum allgemeinen Express-Fehlerrenderer beziehungsweise dessen Logging.
Fremder Origin, abweichender Host und fehlender Spezialheader werden vor
der Inhaltsanalyse abgewiesen. Ein gültiger JSON-Aufruf erreicht weiterhin
die separate Einladungs-Policy. Der HTTP-Prüfserver ersetzt keine HTTPS-
Produktprüfung und ändert keine Produktions-TLS-Regel.

Die öffentlichen Parser-Prüfabhängigkeiten wurden in einem getrennten
Wegwerfverzeichnis ohne Lifecycle-Skripte entpackt. Bereits vorhandene
Integritäten wurden geprüft; bei älteren Lockeinträgen ohne `integrity` oder
`resolved` wurden ausschließlich deren exakte Paketversionen über die
öffentliche npm-Registry aufgelöst und vor dem Entpacken gegen die dortigen
Integritäten geprüft. Das ist keine nachträgliche vollständige Hashbindung
dieser älteren Projekt-Lockeinträge und ändert keine Projektabhängigkeit.

Ein erster Entwicklungslauf meldete 45 Erfolge und drei Fehler: Eine alte
Erwartung erlaubte noch gewöhnliche rohe State-Writes; die neue Policy
verweigert sie bewusst. Die beiden weiteren Fälle verlangten Linux-Dateimodi
beziehungsweise ein damals nicht im PATH gefundenes OpenSSL. Der finale Lauf
verwendet die neue Zugriffserwartung, kennzeichnet den Linux-Fall offen und
führt den TLS-Test mit dem vorhandenen OpenSSL aus. Die TLS-Prüfung wurde nicht
abgeschaltet.

Die drei geänderten Admin-Backenddateien wurden mit dem integritätsgeprüften
vorhandenen TypeScript-5.9.3-Compiler nach CommonJS/ESNext übertragen. Der
ausführbare Build wurde getestet. Ein vollständiger TypeScript-Typcheck mit
allen Admin-Abhängigkeiten wurde dadurch nicht ersetzt. Die Verwaltungsdatei
unter `src-admin/public/js/` und ihr `adminWww/js/`-Abbild sind synchron.

## Gegenprüfung der Dienstintegration

Die interne Gegenprüfung las `runtime/onboarding/`, den Hostinstaller, die
Erststart-Systemd-Units und den Root-Finalizer über ihre Schnittstellen hinweg.
Sie ersetzt keine unabhängige Zertifizierung. Ein konkret gefundener Fehler war
das fehlende `--config /etc/nexowatt-eos/onboarding.json` im `ExecStart` des
Setup-Dienstes: Der echte CLI-Parser hätte den Dienststart abgewiesen. Dies wurde
vor Abschluss ergänzt. Ein weiterer gelesener Zwischenstand versuchte eine
Controller-Unit ohne Install-Sektion zu aktivieren; der finale Stand benutzt
das installierbare `nexowatt-eos.target`, deaktiviert das Setup-Target für den
nächsten Boot und stoppt ausdrücklich Setup-Frontend und Path-Trigger.

Der gemeinsame Nachtest
[`cross-service-contracts.tap`](../../reports/onboarding/cross-service-contracts.tap)
meldet 17 Erfolge. Darin führen drei ergänzende Schnittstellentests den echten
Setup-CLI-Parser mit den Argumenten aus der gelieferten Unit aus und prüfen
UID-/Pfad-Verträge sowie die Boot-Zielverknüpfung statisch. Die übrigen 14 Fälle
führen die tatsächliche Finalizer-Sequenz mit simulierten Hostwirkungen und
Abbrüchen aus. Diese Tests überlappen andere Finalizer-Nachweise und dürfen
nicht als weitere unabhängige Hostabnahme addiert werden.

Das Setup-Dienstkonto besitzt nur sein Zustandsverzeichnis und den lesbaren
privaten Setup-TLS-Schlüssel. Datenbankkonfiguration, Datenbankdaten,
Web-CA-Schlüssel sowie Admin-/UI-Schlüssel sind im Dienst unzugänglich.
Der separate Root-Finalizer liest die begrenzte Übergabe, verifiziert das
gebundene Release unter dem Wartungslock, startet ausschließlich die festen
Webinstanzen und schreibt den Root-Abschluss erst nach den HTTPS-Probes.
Fehler nach Lockübernahme versuchen unabhängig die Startsperre und den
Controllerstop; ein unvollständiger Abschluss behält die Wartungssperre.
Die Schlüssel-/Dateimodi und Systemd-Namensräume müssen auf Linux tatsächlich
geprüft werden. Eine statisch passende Unit beweist ihre Ausführung nicht.

Offen bleiben: vollständiger Admin-/Controller-Prozesslauf mit den neuen
HTTP-Routen, grafische Browserprüfung, realer Linux/systemd-/PostgreSQL-/Pi-
Installations- und Neustarttest, tatsächliche Mehrprozess-/Stromausfallgrenzen,
ARM64-Paketstart und sämtliche physischen Geräte-/Anlagenprüfungen. Die
gemeinsame Runtime-UID isoliert zugelassenen Adaptercode nicht voneinander.
