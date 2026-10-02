# NexoWatt EOS: Marke, Anmeldung und Rollen

Stand: `0.2.0-dev.2`, 1. Oktober 2026. Änderungsbereich: konsolidiertes
Hauptsystem, Produktmarke und persönliche Zugänge. Die Architektur richtet sich
an der EOS-Programmierlinie aus; dies ist keine CRA-/IEC-Konformitätserklärung.
Aktuelle Rohbelege und Quellbindungen werden in
[`verification-summary.json`](../../reports/integration/branding-roles/verification-summary.json)
geführt. Ein geplanter Test ist kein bestandener Test.

## Produktidentität und Herkunft

Das zusammengeführte Repository ist die Hauptquelle des NexoWatt-EOS-Produkts.
`system/product.json` bezeichnet den Produktumfang und die Version; das
Root-`package.json` bleibt das technische Paketmanifest des übernommenen
Installers. Es entsteht kein eigener Kernel und keine neue JavaScript-Runtime.
Linux, Node.js und ioBroker bleiben nachvollziehbare Basiskomponenten.

Die sichtbaren Einstiegs-, Anmelde- und Navigationsflächen erhalten NexoWatt-
Kennzeichnung. Das vom Nutzer bereitgestellte `favicon.ico` wird als bestehende
Markendatei übernommen; vorhandene NexoWatt-Wort-/Bildmarken bleiben erhalten.
Technische Paketnamen, Protokollpfade, Copyright- und Lizenztexte werden dadurch
nicht umbenannt. Die bisherige Upstream-Einführung steht unter
[`docs/history/UPSTREAM_README.md`](../history/UPSTREAM_README.md).
Ein Produktlogo ist weder Authentifizierungsmerkmal noch Integritätsbeweis.

## Kontenvertrag und Provisionierung

Die lokale Root-Einrichtung verarbeitet vier geschützte Eingabedateien:
`--password-file`, `--accounts-file`, `--license-trust` und `--hosts-file`.
Die ersten beiden enthalten Geheimnisse und müssen root gehören, ohne
Gruppen-/Weltrechte; alle Eingabepfade werden auf Eigentümer, sichere
Verzeichnisse und reguläre Dateien geprüft. Geheimnisse werden nicht als
Kommandoargumente übergeben. Das strukturelle JSON-Schema steht unter
[`accounts.schema.json`](../../system/integration/accounts.schema.json).
Es enthält bewusst keine echten oder wiederverwendbaren Beispielpasswörter.

`schemaVersion: 1` beschreibt eine Liste von 2 bis 16 persönlichen Konten mit
jeweils genau `username`, `role` und `password`. Mindestens ein Konto muss
`installer`, mindestens eines `enduser` sein. Namen folgen
`^[a-z][a-z0-9_-]{2,31}$`; reservierte Namen wie `admin`, `root` oder `service`
sind ausgeschlossen. Doppelte Benutzernamen, wiederverwendete Passwörter und
Gleichheit mit dem gesonderten Servicepasswort werden vom Laufzeitvalidator
abgewiesen. JSON-Schema allein drückt diese dateiübergreifenden Regeln und die
UTF-8-Bytegrenze nicht vollständig aus.

| Produktrolle | Technische Bindung | Zugang und Rechte |
| --- | --- | --- |
| NexoWatt Service | `system.user.admin`, Gruppe `system.group.administrator` | Gerätebezogenes Servicepasswort; Administration, Lizenzverwaltung und freigegebene Wartungswege. Kein universelles Herstellerpasswort. |
| Installateur | `system.group.installateur` | Persönliche Anmeldung; vorgesehene Einrichtung, begrenzte Systeminformationen und Benutzer-Passwortreset. Kein Service-/Adminpasswortreset. |
| Benutzer | `system.group.endkunde` | Persönliche Anmeldung und eigene Passwortänderung; vorgesehene Produktansichten. Keine technische Systemadministration. |

Persönliche Konten und Gruppen haben Objekt-ACL `0x600` mit Serviceadministrator
als Eigentümer. Die allgemeinen Objekt-, State-, Datei-, Benutzer-, Shell- und
Messagebox-Berechtigungen der beiden persönlichen Gruppen sind ausgeschaltet.
Produktzugriff erfolgt über die vorgesehenen HTTP-Endpunkte mit eigenen
serverseitigen Prüfungen. Das Ausblenden einer Schaltfläche ist keine
Berechtigungsprüfung. Allgemeine Admin-Socketzugriffe auf Objekte, States,
Dateien, Hostbefehle, Pakete und fremde Konten bleiben Nicht-Servicekonten
verschlossen. Direkte Konto-, Gruppen- und ACL-Änderungen über allgemeine Browser-/Socketwege
bleiben auch für Service gesperrt; eigene Änderungen und erlaubte Resets laufen
über die begrenzten Kontenendpunkte. Auch Serviceberechtigung umgeht die unabhängig bestehenden
Runtime-Sperren für beliebige Paketinstallation oder Hostbefehle nicht.

Die Rollen werden bei der vertrauten lokalen Einrichtung festgelegt.
Browseranmeldung und eigene Passwortänderung bieten weder freie Rollenwahl noch
Kontoerstellung oder Selbstbeförderung an. Der Enrollmentmarker Version 2 bindet
Inventar, Kontenpolicy, Rollen und Passwortzustand. Zusätzliche Konten,
unerwartete Gruppenmitgliedschaften, geänderte ACLs oder inkonsistente
Erstpasswortzustände führen bei der Enrollmentprüfung zu einem Fehler.
Dies schützt vor unbeabsichtigter Abweichung; es isoliert keinen bereits
kompromittierten Adapter mit derselben Betriebssystem-/Datenbankidentität.

## Sichtbare Einstiege

HTTPS-Port 8081 bleibt der gemeinsame Anmeldeeinstieg. Der Serviceadministrator
öffnet die technische EOS-Administration. Installateur und Benutzer gelangen
nach Anmeldung und Pflichtwechsel in ein NexoWatt-Portal; dessen Bedienwege
verwenden den begrenzten HTTP-Sicherheitskontext. Die allgemeine React-
Rohobjektkonsole wird diesen Rollen nicht als Ersatz für fehlende Produktrechte
bereitgestellt.

Das Portal führt zum HTTPS-Cockpit desselben Hosts auf Port 8188 und zur eigenen
Passwortänderung (`/index.html?eosPassword=1`). Installateure erhalten zusätzlich
die begrenzten Dialoge für Basiseinstellungen und Benutzer-Passwortresets.
Auch der Serviceadministrator erreicht seinen eigenen Passwortdialog über die
Administration. Dieser Einstieg ist kein vollständig abgenommener Installations-
oder Wiederherstellungsassistent. Produktfunktionen bleiben an Lizenz, Rolle
und die weiterhin aktive physische Laborsperre gebunden.

## Eigene Passwortvergabe

1. Die vertraute Einrichtung setzt für jeden Installateur und Benutzer ein
   individuelles temporäres Startpasswort. Die Übergabe geschieht außerhalb
   dieser Software über einen geschützten betrieblichen Weg.
2. Die erste Anmeldung erfordert dieses Passwort. Ein angemeldetes Konto mit
   ausstehendem Erstpasswortwechsel erhält noch keinen Produktzugriff.
3. Der eigene Passwortwechsel erfordert zusätzlich erneut das aktuelle
   Passwort. Der Server prüft Sitzung, aktuelle Konten-/Rollenlage, den
   jeweiligen CSRF-Abgrenzungsheader und das begrenzte Eingabeschema.
   Browser-/Cookie-Anfragen benötigen dieselbe HTTPS-Origin; der ausdrücklich
   authentifizierte Bearer-CLI-Fall im Admin ist unten getrennt beschrieben.
4. Das neue Passwort muss sich vom aktuellen unterscheiden. Zulässig sind
   15 bis 128 Unicode-Zeichen bei höchstens 256 UTF-8-Bytes; Steuerzeichen sind
   ausgeschlossen. Neue Hashes verwenden PBKDF2-HMAC-SHA256 mit 600.000 Iterationen,
   einem zufälligen Salt und dem bestehenden 256-Byte-Controllerformat.
5. Nach Erfolg werden Sitzungen des Kontos widerrufen. Die erneute Anmeldung
   verwendet das neue Passwort. Das bisherige Startpasswort ist dadurch ungültig.

| Endpunkt | Zweck | Zusätzliche Prüfung |
| --- | --- | --- |
| Admin `POST /nexowatt/account/first-password` | Verpflichtende erste eigene Passwortvergabe | Aktuelles Passwort, Sitzung, Browser-Originprüfung, Header `x-nexowatt-eos-first-login: 1` |
| Admin `POST /nexowatt/account/password` | Spätere eigene Passwortänderung | Aktuelles Passwort, Sitzung, Browser-Originprüfung, Header `x-nexowatt-eos-password: 1` |
| UI `POST /api/account/password` | Erste oder spätere eigene Passwortvergabe | Aktuelles Passwort, Sitzung, gleiche Origin, Header `x-nexowatt-eos-password: 1` |

Für die beiden Admin-Endpunkte sind explizite `Authorization: Bearer`-Clients
ohne Originheader zulässig, wenn Token, aktuelles Passwort und erforderlicher
Anwendungsheader gültig sind. Diese Anfragen verwenden keine allein automatisch
mitgesendete Browseranmeldung. Cookie-Anfragen ohne Origin und Anfragen mit
fremder Origin werden abgewiesen. Dies ist keine Freigabe anonymer Aufrufe; der
UI-Cookiepfad verlangt weiterhin die gleiche HTTPS-Origin.

Die drei Felder des eigenen Passwortwechsels sind `currentPassword`, `password`
und `passwordRepeat`. Ein Zielbenutzer, Rollen oder Gruppen gehören nicht zu
diesem Vertrag. Der Adminpfad für verwaltete Benutzerresets ist ein anderer,
rollenbeschränkter Vorgang; Installateure dürfen damit keine Service- oder
Installateurkonten zurücksetzen. Hashableitungen laufen mit begrenzter
Parallelität. Ihre Laufzeit auf der konkreten Raspberry-Pi-Hardware ist noch zu
messen; ein Test auf einem x86_64-Laborhost ersetzt diese Messung nicht.

Anmeldung und eigene Passwortvergabe bleiben ohne Produktlizenz möglich.
Lizenzverwaltung ist dem Serviceadministrator vorbehalten. Eine gültige Lizenz
erteilt keine Benutzerrechte und hebt die physische Schreibsperre des aktuellen
Laborprofils nicht auf. Persistente UI-Sitzungen werden gegen den aktuellen
Passwort-/Kontenzustand geprüft; Rollen- oder Passwortänderungen dürfen keine
bestehende Sitzung als veraltete Berechtigung weiterwirken lassen. Auch offene
UI-Ereignisströme (SSE) prüfen die laufende Berechtigung vor jeder weiteren
Nachricht. Abmeldung, Ablauf oder fehlgeschlagene Prüfung schließen die
Verbindung; ein einmal erfolgreicher Verbindungsaufbau reicht nicht aus.
Ausstehende Prüfungen und aufbewahrte Nachrichten sind begrenzt.

## Begrenzung des Admin-WebSocket-Eingangs

Der tatsächlich durch EOS Admin aufgelöste Transport `@iobroker/ws-server@4.5.1`
wird beim geprüften Build anhand fester Original- und Ergebnishashes angepasst.
Sein Eingangslimit beträgt danach 1 MiB pro entpackter WebSocket-Nachricht statt
des bisherigen 500-MiB-Limits. Die Begrenzung greift vor der Kommandoauswertung;
ein abweichender Paketstand, unveränderte Originalbytes oder eine andere
aufgelöste Paketkopie scheitern an der Buildprüfung.

Die SBOM weist diesen Transport deshalb als lokal verändert aus. Die
ursprünglichen Registry-Archivhashes stehen nur bei seinem Vorgänger in
`pedigree.ancestors`; der Transformationsbeleg bindet die aktuellen Dateibytes.
Das ersetzt weder Verbindungs-/Ratenlimits noch Lasttests oder eine allgemeine
DoS-Abnahme. Tests mit übergroßen echten Frames sind vom reinen Hash-/Buildertest
zu unterscheiden.

## Browsercache und Abmeldung

Der UI-Serviceworker speichert ausschließlich zulässige inerte Dateien derselben
Origin. Geschützte HTML-Ansichten, APIs und JSON-Antworten erhalten keinen
Offline-Rückfall aus CacheStorage oder HTTP-Cache. Beim Aktivieren der neuen
Serviceworker-Version werden ältere EOS-Caches entfernt. Fehlt die Verbindung,
soll eine geschützte Ansicht eine Fehlermeldung liefern, statt frühere
angemeldete Inhalte aus dem Cache zu zeigen.

Dies löscht nicht den bereits dargestellten DOM-Inhalt eines offenen Fensters
und ist kein Fernlöschen von Screenshots oder Browserprofilen. Tatsächliche
Installation, Update und Abmeldung in unterstützten Browsern gehören zur
separaten grafischen Zielhost-Abnahme. Der dokumentierte r2-Prozesslauf hat
Passwortformulare, Rollenportal, Installateur-Dialoge und Cockpit mit echtem
Chromium bereits geprüft; Serviceworker-Upgrade und alle unterstützten
Browser-/Zielhostkombinationen sind damit nicht vollständig abgedeckt.

## STRIDE für diese Änderung

| Kennung / Kategorie | Konkretes Szenario | Maßnahme und Prüfansatz | Verbleibende Grenze |
| --- | --- | --- | --- |
| EOS-ROLE-S / Spoofing | Angreifer nutzt bekanntes Startpasswort, Aliasgruppe oder freie Rollenwahl als Servicezugang. | Unterschiedliche individuelle Startdaten, feste Gruppen, kein öffentliches Rollenwahlfeld; Negativfälle für fremde Ziele und Konten. | Ausgabe des Servicezugangs und MFA sind betriebliche bzw. offene Entwicklungsaufgaben. |
| EOS-ROLE-T / Tampering | Browser schreibt Gruppen, Passwort-Hash oder Objekt-ACL direkt. | Allgemeine ACLs aus, echte Admin-Socketgrenze und enges Passwortschema; Enrollment erkennt Inventar-/ACL-Abweichung. | Gemeinsame Adapter-DB-Identität bleibt eine Vertrauenszone. |
| EOS-ROLE-R / Repudiation | Alte Prüfbelege werden nach Passwort-/Markenänderungen als aktuelle Abnahme ausgegeben. | Neuer Produktstand, aktuelle Rohbelege, Quell-/Artefakthashes und separates historisches Register. | Manipulationsgeschützte Betriebsprotokollierung und personenbezogene Servicezuordnung sind noch nicht vollständig umgesetzt. |
| EOS-ROLE-I / Information Disclosure | Nicht-Servicekonto liest rohe Kontoobjekte oder ein abgemeldeter Browser zeigt geschützten Offlinecache. | Private Konto-ACLs, Socket-/Routenprüfung; keine geschützten HTML/API/JSON-Caches, alte EOS-Caches entfernen. | Schon dargestellte Inhalte lassen sich nicht zurückholen; Browserabnahme offen. |
| EOS-ROLE-D / Denial of Service | Große Kontendatei oder viele teure Passwortableitungen blockieren Anmeldung. | 16-Konten-/Byte-/Passwortgrenzen, begrenzte Hashableitungen und 1-MiB-WebSocket-Nachrichtenlimit; getrennte Grenzwert-/Transporttests. | Zielhardwarelast und gleichzeitige Controller-/Gerätelast sind gesondert zu messen. |
| EOS-ROLE-E / Elevation of Privilege | Installateur setzt Servicepasswort zurück oder behält nach Rollenwechsel alte Sitzung. | Zielrolle vor Reset prüfen; aktuelles Passwort beim eigenen Wechsel; Passwort-/Rollenrevision, Sitzungswiderruf und erneute SSE-Prüfung; positive und negative API-/Socket-/Streamtests. | Root und Code in derselben privilegierten Vertrauenszone bleiben außerhalb dieser Webrollentrennung. |

## Nicht als erledigt ausweisen

- Vollständiger UI-Pflichtlauf: `npm run test:all` für r2 scheiterte am
  unveränderten 99-Peer-Mesh-Timingtest. `stale_or_invalid_lease` im 250-ms-Takt
  ist noch zu untersuchen; die Ursache ist nicht allein durch eine
  Umgebungsannahme geklärt. Der bestandene r2-Anmelde-/Browserlauf ersetzt dieses
  offene Entwicklungsfreigabegate `UI-MESH-PERF-20261001` nicht. Genau ein
  gesonderter Mesh-Lauf bestand; seine 792 Antworten (P95 92 ms, Maximum 121 ms)
  klären den Fehler des vollständigen Laufs nicht.

- Vollständige grafische Browser- und Zielhost-Abnahme einschließlich Pi, VM,
  Neustart, Zertifikatsvertrauen, Serviceworker-Update und Passwortlast.
- MFA, personenbezogene Serviceidentitäten, geregelte Übergabe/Rotation und
  abgenommener Wiederherstellungsprozess bei verlorenem Servicezugang.
- Atomare kontenübergreifende Transaktionen im ioBroker-Objektstore. Gleichzeitige
  Root-/Serviceänderungen müssen betrieblich koordiniert werden; ein aktueller
  Revisionsabgleich ist keine allgemeine Datenbank-CAS-Garantie.
- Produktive Migration bestehender `0.2.0-dev.1`-Installationen. Für diesen
  Entwicklungsstand ist eine frische Einrichtung vorgesehen; Marker werden nicht
  durch Handänderung hochgesetzt.
- Unbeaufsichtigter Mesh-/M2M-Zugriff: Die vorhandenen Mesh-HTTP-Endpunkte
  verlangen ebenfalls Anmeldung und weisen anonyme Aufrufe mit 401 zurück.
  Eigene Maschinenidentitäten und ihre sichere Zulassung sind nicht implementiert.
- Aktivierung physischer Adapter, sichere zusätzliche Adapteraufnahme,
  per-Adapter-Isolation, vollständiges Backup/Restore, Tailscale- und IPv6-Abnahme.

Die Änderungsbewertung ist Teil der technischen Unterlagen. Ein sichtbares EOS-
Logo, TLS, eine Rollenmatrix oder bestandene Einzeltests belegen für sich keine
vollständige CRA- oder IEC-Konformität.
