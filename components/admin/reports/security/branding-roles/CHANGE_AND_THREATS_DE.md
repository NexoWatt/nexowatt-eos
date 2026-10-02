# EOS-ROLES-20261001 – Admin-Konten und Dienstgrenze

Stand: EOS Admin 7.10.11 im integrierten Entwicklungsprofil. Der Komponentenstand
ist über `verification.json` mit Quell- und Buildhashes verbunden; dies ersetzt
keine System-, Hardware- oder unabhängige Konformitätsprüfung.

Die integrierte Anwendung verwendet ausschließlich die kanonischen Gruppen
`system.group.administrator`, `system.group.installateur` und
`system.group.endkunde`. Genau eine gültige Gruppenzuordnung ist erforderlich;
Anzeigenamen, Konfigurationsaliase, deaktivierte Gruppen und der Benutzername
`admin` allein verleihen keine Rolle. Root-Provisionierung besitzt die
Konten-/Gruppenverwaltung. Der Adapter prüft die vorhandenen Gruppen, ohne ACLs
zu reparieren, Gruppen anzulegen oder Benutzer aus anderen Gruppen hochzustufen.

Der vollständige ioBroker-Admin-Bereich bleibt NexoWatt Service vorbehalten.
Installateur und Benutzer erhalten Produktfunktionen über die eingeschränkten
EOS-HTTP-Schnittstellen und die Produkt-UI. Direkte Objekt-, Zustands-, Datei-,
Abonnement-, Host-, Entschlüsselungs- und Adapterbefehle sind für diese Rollen
bereits vor dem tatsächlichen Socket-Dispatcher gesperrt. Dadurch werden auch
gecachte Objekte mit Passwort-Hashes oder `system.config.native.secret` nicht
über generische Lesepfade ausgegeben. Zusätzliche unbekannte Socketbefehle werden
nicht automatisch freigeschaltet. Auch Service-Browser dürfen keine rohen
Benutzer-/Gruppenobjekte, Rollen oder ACLs verändern und keine Konten anlegen oder
löschen. Diese Änderungen benötigen den geschützten Host-Provisionierungsweg.

`POST /nexowatt/account/first-password` nimmt nur `currentPassword`, `password`
und `passwordRepeat` an. Die Zielidentität stammt ausschließlich aus der Sitzung.
Der zugehörige Header ist `x-nexowatt-eos-first-login: 1`; Browseranfragen benötigen
korrekten Same-Origin-Nachweis. Für ein bereits eingerichtetes eigenes Konto gibt
es `POST /nexowatt/account/password` mit `x-nexowatt-eos-password: 1` und denselben
Feldern. Initialer und späterer Wechsel benötigen das aktuelle Passwort und ein
abweichendes neues Passwort. Erlaubt sind 15–128 Unicode-Zeichen, höchstens 256
UTF-8-Bytes, keine Steuerzeichen; lange Passphrasen benötigen keine künstliche
Zeichenklassenmischung. PBKDF2-SHA256 mit 600.000 Iterationen und individuell
zufälligem Salt bleibt mit dem Controllerformat kompatibel. Passwort-, Setup-,
Gruppen- oder Kontenänderungen entwerten vorhandene Sitzungen.

Pro Konto werden höchstens fünf Passwortwechselversuche pro Minute angenommen.
Höchstens zwei Kontooperationen laufen parallel; ein einzelnes Konto wird lokal
serialisiert. Die Ratenverwaltung ist auf 256 Einträge begrenzt. Kontorevision
und Berechtigung werden vor dem Schreiben und nach der KDF-Arbeit erneut geprüft.
Ein zwischenzeitlicher Reset, eine Sperre oder ein Rollenwechsel wird damit nicht
blind durch einen vorherigen Passwortnachweis überschrieben. Ein atomarer
adapterübergreifender Datenbank-Compare-and-Swap wird nicht behauptet; der Rest
zwischen letzter Prüfung und DB-Schreiben bleibt ein gesonderter Härtungspunkt.

Installateure dürfen über den vorhandenen eingeschränkten Reset-Endpunkt nur
explizite Endbenutzerkonten zurücksetzen. Er erzeugt ein individuelles zufälliges
Übergangspasswort und erzwingt anschließend einen eigenen Passwortwechsel.
Service- und andere Installateurkonten sind dafür gesperrt. Normale Benutzer
können keine fremden Konten zurücksetzen. Service behält den eingeschränkten
Reset für verwaltete Installateur-/Benutzerkonten. Diese HTTP-Funktionen ändern
weder Rollen noch Konto-ACLs. Rohlogs, Lizenzverwaltung und Updateverwaltung sind
Service-Funktionen; Installateurzugriff auf Basisdaten/Basiseinstellungen bleibt
über konkrete HTTP-Verträge erhalten.

| STRIDE-Risiko | Absicherung | Prüfbeleg |
|---|---|---|
| Spoofing: Gruppenname oder konfigurierte Aliasrolle als Service | Feste Objekt-IDs, genau eine Rolle, aktiviertes Konto und Gruppe | Rollen-/HTTP-Tests, Prozessprüfung separat |
| Tampering/Elevation: Rollenänderung über Objekt-/Socketalias | Prüfung des tatsächlichen Dispatchers vor Upstream-Handlern; rohe Identitäten auch für Service gesperrt | Dispatcher 2.3.4 und 2.6.0, je 6 Tests |
| Information Disclosure: gecachte Systemobjekte mit Geheimnissen | Keine generischen Objekt-/Datei-/Abonnement-Lesepfade für Nicht-Service | Tatsächlicher Dispatcher mit markierten Testdaten |
| Spoofing/Tampering: gestohlene alte Sitzung beansprucht Reset | Aktuelles Passwort, bindende Zielidentität, Kontorevision, erneute Autorisierung, Widerruf | Eigene-Passwort- und Race-Tests |
| Denial of Service: teure Passwortprüfungen | Ressourcen- und Ratenlimits; Größenbegrenzungen vor KDF | Rate-, Parallelitäts- und Passworttests |
| Repudiation: unzuordenbare Kontenänderung | Kontobezogene Ereignisse ohne Passwortinhalte; eindeutige Root-Provisionierung | Komponenten-Codeprüfung; externer manipulationsgeschützter Auditdienst offen |

Tatsächlich ausgeführt: vollständige TypeScript-Kompilierung, 57 Tests mit
Quellmodulen und 57 Tests mit Buildmodulen (HTTP-Tests verwenden in beiden Fällen
die tatsächlich kompilierten Methoden), je 6 Dispatcher-Vertragstests mit den
explizit geprüften Versionen 2.3.4 und 2.6.0 sowie 40 vorhandene isolierte
Grenzprüfungen. Rohbelege stehen in `raw/`. Keine dieser Komponentenprüfungen
behauptet einen RPi-Test. Browser-/Controller-/TLS-Prozessprüfung und das
hashgebundene WebSocket-Nachrichtenlimit werden im übergeordneten Systembericht
geführt. Die allgemeine ioBroker-React-Oberfläche benötigt weitreichende
Leserechte und ist deshalb für Installateur/Benutzer kein freigeschalteter
Ersatz für das eingeschränkte Produktportal. CRA-/IEC-Gesamtfreigabe bleibt offen.
