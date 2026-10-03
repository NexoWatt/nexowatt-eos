# Geschützte Ersteinrichtung: Sicherheitsgrenzen und Nachweise

3. Oktober 2026 · EOS dev9 · `EOS-REQ-ONBOARD-20261002`.

Die Anforderung wurde als Produktanforderung ausgewertet. Historische Angaben
und der damalige ZIP-Blocker im Anhang sind Kontext; sie ersetzen weder die
aktuellen Projektvorgaben noch tatsächlich ausgeführte Prüfungen.

| Grenze / Bedrohung | Implementierung | Nachweisgrenze |
| --- | --- | --- |
| Fremde Geräteübernahme | 192-Bit-Besitzcode, 10 Minuten, acht persistente Fehlversuche, atomarer Codeverbrauch; kein Vertrauen allein in LAN-IP | Echte lokale HTTPS-Anfragen; Gerätebereitstellung offen |
| MITM / falscher Host | TLS 1.3, Kette/SAN/Schlüssel/Gültigkeit; exakter Host und Origin; kein Proxyvertrauen/HTTP-Fallback | Loopback mit gültiger/falscher CA, falschem Host und TLS 1.2; Browser-CA-Import offen |
| CSRF / Sitzungsdiebstahl | Secure/HttpOnly/SameSite=Strict, `__Host-`-Cookie, 15-Minuten-Sitzung, CSRF-Token, gleicher Origin, keine URL-Geheimnisse | Negative API-Tests; grafischer Browser offen |
| Ressourcenerschöpfung | 64-KiB-Setupbody für Lizenz und Geräteplan, 8-KiB-Header, 32 Verbindungen, 90 Requests/Minute global, eine KDF/Mutation, Zeitgrenzen | Modul-/HTTPS-Grenztests; Langzeitlast offen |
| Rechteausweitung | Eigenes `eos-setup` ohne DB/sudo; feste Konfigurations-/Hash-/Lizenzübergabe; rootgeschützte Quellen, fester Finalizer und separater Lizenzschreiber unter Runtime-UID | Statische Units und Ablaufdoubles; native Linux-UID-/Systemd-Isolation offen |
| Parallelität / Stromausfall | Persistente Mutations-/Commitlocks; exklusive Root-Wartungssperre, gesperrter Controller, dauerhafte pending/complete-Marker | Eingespritzte Abbrüche/Neustarttests; keine Mehrspeicher-Transaktion, echte Stromausfälle offen |
| Offen gebliebener Zugang | Setup bei Abschlussmarker dauerhaft geschlossen, Code ungültig, Dienst/Trigger beendet, Setupautostart deaktiviert | Quell-/Vertragstests; echter Boot offen |
| Unzulässige Anlagenbefehle | Gerätepakete vollständig verpflichtend, Ausführung separat gesperrt; UI-Schreibsperre, ergänzende Admin-Commandgrenzen; Lizenzprüfung erhalten | Modultests; physischer Betrieb nicht freigegeben |
| Falscher Lizenzhersteller | Rootgeschützter öffentlicher Trust mit unabhängig bestätigtem SHA-256; kein Browserupload von Trust; privater Lizenzschlüssel bleibt extern | Eingabe-/Hashprüfungen; realer Herstellerübergabeweg offen |
| Falsche Lizenzbindung / Konfiguration | Signatur und tatsächliche DB-UUID erneut im Root-Abschluss geprüft; Geräteplan gegen Lizenzkapazität; technische Produktbereiche und explizite offene Zustände | Echter Lizenzkern und verschlüsselter Store lokal geprüft; aktuelle Messwerte, fachliche Auslegung und Geräteabnahme offen |

Der erste Benutzer heißt serverseitig fest `admin` und erhält die Servicerolle.
Persönliche Konten werden erst nach berechtigter Einladung aktiv; jeder Benutzer
setzt sein Passwort selbst. [Einladungs-/Rollenreview](ONBOARDING_ACCOUNTS_REVIEW_DE.md)
erläutert Parallelität, Passwortformat und die weiterhin gemeinsame Runtime-UID.

Die lokale Codeerneuerung prüft die feste `eos-setup`-Identität und private
Dateibesitzer. Ihr Eigentümerwechsel verwendet ausschließlich einen mit
`O_NOFOLLOW` geöffneten und per Geräte-/Inode-/Typprüfung gebundenen
Dateideskriptor. Damit kann ein Austausch des Dateinamens im Setupverzeichnis
den Root-Eigentümerwechsel nicht auf einen fremden Pfad umlenken. Die neuen
Race-Tests verwenden tatsächliche Dateiaustausche; UID-/fchown-Eigenschaften
werden auf Windows simuliert und bleiben nativ auf Linux nachzuprüfen.

Das neue Profil ermöglicht eine sichere Ersteinrichtung im Beobachtungszustand.
Es stellt **keine vollständige fachliche Anlageninbetriebnahme** dar: eingegebene
Anlagengrenzen sind noch nicht abgenommen und Geräte bleiben deaktiviert.
Lizenzprüfung ist im Assistenten integriert; die verschlüsselte Speicherung
verwendet den bestehenden Admin-Store. Details stehen im
[Lizenzübergabebericht](FIRST_START_LICENSE_REVIEW_DE.md).
Diese Grenzen werden im Frontend benannt und nicht durch erfolgreiche Setup-
Modultests als erledigt markiert.

Die nachvollziehbare Übersicht steht in
[`verification-summary.json`](../../reports/integration/first-start/verification-summary.json),
mit Rohlogs, tatsächlicher Hostumgebung und Hashliste der Lieferquellen.
Die nachträglich erfassten Lieferhashes sind keine kryptografische Bindung
an den Ausführungszeitpunkt der Tests.
Windows-bedingt fehlgeschlagene ältere POSIX-Suites bleiben als fehlgeschlagene
Versuche erhalten. Übersprungene Linuxprüfungen werden separat ausgewiesen.
Wiederholte Suite-Fälle werden nicht als unabhängige Hardwaretests addiert.

Quell-/Lock-SBOM und gegebenenfalls tatsächlich gebauter Runtime-SBOM müssen
unterschieden werden. Ein fehlgeschlagener Build erhält keine Erfolgssignatur.
Historische test.2-Hashes bleiben historische Belege. Dieser Stand enthält keine
Konformitätserklärung und keine Produktivfreigabe.
