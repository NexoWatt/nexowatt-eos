# Automatische Node-Installation: Empfänger und Transaktion

Änderungsbezug: Nutzerauftrag vom 22.10.2026 – Linux-Sicherheitsupdates und
Node-Updates innerhalb der freigegebenen Hauptversion ohne Updateknopf installieren.
Quellbasis `02257b74c9124f504979d9bc012af27451719aca`; die tatsächlich geprüften
Dateihashes und der Befehl stehen in `verification.json`, Rohbelege in `focused.tap`.

Der installierte Dienst prüft täglich zwischen 02:30 und 03:00 Uhr Europe/Berlin
ein frisch abgerufenes, herstellersigniertes Angebot. Ein vor dem Netzwerkzugriff
dauerhaft gespeicherter Versuch verhindert Wiederholungen am selben lokalen Tag,
auch nach Dienstneustart oder in der doppelten Stunde bei Zeitumstellung. Außerhalb
des Fensters gibt es keine automatische Installation zum Nachholen. Die vorhandene
allgemeine Angebotsprüfung alle sechs Stunden bleibt davon getrennt.

Nur ausdrücklich mit `automaticNodeUpdate: true` signierte Angebote für eine
streng neuere unterstützte Node-24-Version sind automatisch zulässig. Der Worker
prüft Signatur, Zielrelease, Ausgangsrelease, Sequenz, Runtime und Paket erneut.
Die Transaktion erlaubt ausschließlich Änderungen an den drei Node-Dateien sowie
gebundener SBOM und Buildbeschreibung. App, Katalog, Abhängigkeiten, Hostcode und
Datenbankschema müssen exakt erhalten bleiben. Sie führt deshalb keinen
Asset-Upload und keine Datenbankmigration aus. Das automatische Verfahren erzeugt
keine angebliche manuelle Wartungs- oder Sicherungsbestätigung.

Der tatsächliche gemeinsame Kernel-Lock verhindert paralleles APT/EOS-Warten.
Bei Belegung wird die automatische Installation als verschoben angezeigt und im
nächsten Tagesfenster erneut geprüft. Die Windows- und Hersteller-Signierschlüssel
werden dabei nicht auf dem Pi benötigt. Das bestehende TEST-Profil verlangt
`physicalControlEnabled: false`, einen gesunden Ausgangsstand, native Prüfung des
Kandidaten und kontrollierten Neustart. Ein fehlgeschlagener Kandidat stellt das
vorherige Node/EOS-Paar nur nach erfolgreicher Rückfallprüfung wieder aktiv;
ungeklärte Zustände bleiben gesperrt. Das Ende des Fensters wird nochmals direkt
vor dem ersten Dienststopp geprüft; ein bereits begonnener sicherer Abschluss oder
Rückfall läuft zu Ende.

**Prüfung:** 53/53 lokale Tests bestanden, keine übersprungen. Tatsächliche
Ed25519-Signaturen, Dateizugriffe/fsync/Symlinkwechsel und Kernel-Lockkonkurrenz;
Dienste, Inventarprüfung und native Ausführung in Transaktionstests sind ausdrücklich
ersetzt. Abgedeckt sind fehlende/falsche/abgelaufene Freigabe, Appänderung,
Controller-Hauptversion, Fenstergrenzen/Sommerzeit, Neustart/Zeitrücksprung,
OS-Konflikt, Erhalt der Bestandsdaten, Kandidatenfehler und sicherer Rückfall.
Ein zunächst falsch benannter Own-Adapter-Testpfad wurde von der bestehenden
Hoständerungssperre abgewiesen; nach Korrektur auf den echten EOS-Paketnamen wird
nun gezielt die zusätzliche Automatikgrenze geprüft.

**Offen:** signiertes Herstellerpaket und Feed, realer Zeitlauf unter systemd auf
ARM64/Pi, tatsächliche Node-24.22.1+-Ausführung dieser neuen Quellen,
Installations-/Rückfall-/Hardwaretest. Keine Produktions-, CRA- oder Anlagenfreigabe.
Die bisherigen offenen Abhängigkeitsbefunde werden durch diesen Automatikpfad
nicht geschlossen. Der direkte R8-Umstieg ist ein getrennt geprüfter Migrationspfad.
