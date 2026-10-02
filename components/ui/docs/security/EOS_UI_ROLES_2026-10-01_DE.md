# EOS UI: Anmeldung, Rollen und eigene Passwörter

Änderung: EOS-UI-ROLES-001, NexoWatt UI 1.0.21 im integrierten Entwicklungsprofil.

Die Oberfläche, Zustandsabfragen, Konfiguration und Live-Verbindungen verlangen eine aktuelle Anmeldung. Statische Bilder, CSS/JavaScript und die engen Anmelde-, Status- und eigenen Passwortschnittstellen enthalten keine Anlagenwerte und bleiben erreichbar. Browser und Service Worker speichern geschützte Antworten nicht für Offline-Zugriffe. Das ursprüngliche Design und die EMS-Funktionen bleiben im Quellstand; die physische Steuerung bleibt im Testprofil gesperrt.

| Vertrauenswürdige Controller-Gruppe | UI-Rolle | Produktrolle | Zugriff nach eigenem Passwort |
| --- | --- | --- | --- |
| `system.group.administrator` | `admin` | `service` | NexoWatt-Service, Lizenz-/Systemverwaltung |
| `system.group.installateur` | `installer` | `installer` | Anlagenansicht und technische Einrichtung, keine Lizenz-/Serviceverwaltung |
| `system.group.endkunde` | `customer` | `enduser` | Benutzeransicht und die vorgesehenen Bedienrechte |

Benutzernamen und konfigurierbare Alias-Gruppen verleihen keine Rechte. Das Grundsystem stellt sicher, dass ausschließlich das gerätespezifisch provisionierte Servicekonto `system.user.admin` Mitglied der Administratorgruppe ist. Die internen Bezeichnungen `customer` und `admin` bleiben für bestehende UI-Schnittstellen erhalten; `accountRole` benennt die Produktrolle ausdrücklich.

Die Anmeldegrenze gilt auch vor den bisherigen Mesh-Protokollpfaden `coordinator/exchange` und `coordinator/energy`. Unbeaufsichtigter Zugriff zwischen Geräten ist im aktuellen Testprofil gesperrt. Ein späteres Mesh-/M2M-Identitätsprofil benötigt eigene geprüfte Authentifizierung, Autorisierung und verschlüsselte Übertragung; eine Browseranmeldung wird dafür nicht als Betriebsverfahren empfohlen. Die bestehenden HMAC-, Größen- und Lebenszyklusprüfungen bleiben hinter der Anmeldegrenze bestehen und werden mit authentifizierten Testkonten geprüft. Dies ist keine Freigabe für physische Mesh-Regelung.

## Persönliche Passwörter

Installateur und Benutzer melden sich mit dem individuell provisionierten Startpasswort an und müssen vor jedem Zugriff auf Anlagenwerte ein eigenes Passwort festlegen. Der gleiche Dialog ist später über **Passwort ändern** erreichbar. Es gibt weder eine Rollenwahl in der Anmeldung noch ein gemeinsam eingebautes Standardpasswort.

`POST /api/account/password` verlangt eine aktive eigene Sitzung, das aktuelle Passwort, `password` und `passwordRepeat`, `Content-Type: application/json`, einen exakt passenden HTTPS-Origin und `X-Nexowatt-EOS-Password: 1`. Weitere Felder wie Zielkonto oder Rolle werden abgewiesen. Zulässig sind 15–128 Unicode-Zeichen und höchstens 256 UTF-8-Bytes ohne Steuerzeichen; das neue Passwort muss vom aktuellen abweichen. PBKDF2-SHA256 mit 600.000 Iterationen, einem zufälligen individuellen Salt und dem Controller-kompatiblen 256-Byte-Ergebnis erzeugt den gespeicherten Hash. Verifikation und Erzeugung teilen sich höchstens zwei aktive KDF-Aufträge; weitere Anfragen warten nicht unbegrenzt in einer Warteschlange.

Das Passwort wird ausschließlich im zentralen Controller-Benutzerobjekt geändert. Der eng begrenzte Writer erweitert nur Passwort und Einrichtungsmetadaten und verändert weder Rollen, Kontofreigabe noch Hersteller-/Kontomarker. Er prüft Kontorevision und aktuelle Sitzung unmittelbar vor der Änderung und liest das Ergebnis zurück. Alle UI-Sitzungen und Live-Verbindungen dieses Kontos werden danach widerrufen; eine erneute Anmeldung mit dem neuen Passwort ist nötig. Auch administrative Passwort-, Rollen-, Deaktivierungs- und Einrichtungsänderungen widerrufen bestehende Sitzungen beim nächsten Zugriff. Jeder SSE-Datenrahmen verlangt eine erneute Prüfung; bei Nichtverfügbarkeit erfolgt kein Versand. Ein gefälschtes Logout-Cookie trennt keine fremden Verbindungen.

Die Objekt-API unterstützt in diesem Pfad keinen atomaren Vergleich-und-Schreibvorgang. Deshalb sind gleichzeitig laufende administrative Kontoresets organisatorisch zu vermeiden. Die erweiterten Teilfelder verhindern die Rücknahme paralleler Rollen-/Deaktivierungsänderungen, ersetzen aber kein solches Transaktionsverfahren. Geräteunabhängige Kontenverwaltung ist noch keine Isolation gegen kompromittierten Code innerhalb derselben Controller-Laufzeit.

## Bedrohungsanalyse und Nachweise

| STRIDE | Risiko | Umsetzung und Prüfung |
| --- | --- | --- |
| Spoofing | Startpasswort/alte Sitzung als dauerhafter Zugriff | Verpflichtender eigener Wechsel; Revisionsbindung; Wiederanmeldung nach Änderung |
| Tampering | Zielkonto/Rolle in Passwortanforderung einschleusen | Exakte Feldliste und ausschließlich Sitzungsidentität; Teilfeld-Writer |
| Repudiation | Unbelegter Sicherheitsstatus | Roh-TAP, Browsernachweis und Quellhashes im zugehörigen Änderungsbericht; keine Produktivfreigabe |
| Information disclosure | Anonyme Telemetrie oder Offline-Cache nach Abmeldung | Globale Anmeldung vor Daten/HTML, no-store, SW nur für öffentliche Assets, SSE-Revalidierung |
| Denial of service | Unbegrenzte KDF-/SSE-Aufträge | Gemeinsames KDF-Limit 2; höchstens so viele ausstehende SSE-Prüfungen wie zugelassene Clients (standardmäßig 24) auch nach Verbindungsabbruch; begrenzte Datenrahmen |
| Elevation of privilege | Benutzername oder Adapterkonfiguration erhebt Rechte | Ausschließlich drei festgelegte Gruppen; negative Tests für Alias-/Namensrechte |

Die automatisierten Komponentenprüfungen nutzen echte HTTPS-/Express-Laufzeit und simulierten Controller-Speicher. Die gesonderte Systemintegration verwendet den tatsächlichen js-controller. Zielhardware, Lastmessung auf Raspberry Pi 5, unabhängige Prüfung sowie CRA-/IEC-Gesamtkonformitätsbewertung bleiben separate Nachweise. Zugehörige Befehle und tatsächliche Ergebnisse stehen unter `reports/security/roles-20261001/`.
