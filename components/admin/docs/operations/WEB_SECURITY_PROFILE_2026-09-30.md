# EOS Admin: lokales Sicherheitsprofil und Transportmigration

Die Anmeldung ist im Sicherheitsprofil verpflichtend. Ein alter `auth=false`-Wert wird zur Laufzeit für HTTP und WebSockets übersteuert; eine Standardbenutzer-Identität ohne Anmeldung gewährt keine Rechte. Der gespeicherte Altwert ist keine Ausnahme vom Schutzprofil.

Stand 30.09.2026; ausgelieferte Version/Hashes siehe übergeordneten Releasebericht. Betrifft EOS-TRANSPORT-001, EOS-HTTP-RES-001, EOS-NET-001 und die zusätzliche MCP-/SSO-Grenze. Keine Serienfreigabe oder IEC-/CRA-Konformitätsbescheinigung.

## Verbindliche Änderung beim Update

Bei `native.secure !== true` bindet der Webserver unabhängig von einer alten Einstellung `0.0.0.0` ausschließlich an `127.0.0.1`, beziehungsweise an ausdrücklich konfiguriertes `::1`. Die bestehende gespeicherte Konfiguration wird dabei nicht heimlich überschrieben. Der tatsächliche Listener erhält die sichere Laufzeitbindung. Plain-HTTP-Anfragen benötigen zudem eine tatsächliche Loopback-Gegenstelle und einen Host `127.0.0.1`, `localhost` oder `[::1]`; fremde DNS-Namen und `Sec-Fetch-Site: cross-site` werden abgewiesen. Forwarded-Header schalten diese Grenze nicht frei.

**Vor einem entfernten Update muss ein geprüfter lokaler oder SSH-Wiederzugang bestehen.** Ein bisher über unverschlüsseltes LAN-HTTP erreichbarer Admin wird nach diesem Update absichtlich nicht mehr direkt aus dem Netz erreichbar sein. Kein automatisches, geteiltes oder im Paket enthaltenes TLS-Zertifikat wird installiert.

1. Gerätesicherung erstellen und individuelles funktionierendes Administratorkennwort sowie autorisierten OS-Zugang bereithalten.
2. Für Bootstrap direkt am Gerät `http://127.0.0.1:8188` öffnen; tatsächlichen konfigurierten Port verwenden. Alternativ auf dem eigenen Rechner einen SSH-Tunnel zum Gerät öffnen, beispielsweise `ssh -N -L 18188:127.0.0.1:8188 <benutzer>@<geraet>`, und `http://127.0.0.1:18188` aufrufen. SSH-Gegenstelle vorher verifizieren. Dieser Tunnel schützt die Strecke zum Gerät; der lokale Browser-Endpunkt bleibt HTTP und ist nur für die Einrichtung vorgesehen.
3. Individuelles TLS-Zertifikat mit passendem Gerätenamen/SAN und zugehörigen privaten Schlüssel über die vorhandene ioBroker-Zertifikatsverwaltung provisionieren. Auf dem Client die ausstellende CA vertrauen; keine dauerhaften Browser-Zertifikatsausnahmen verwenden. In der Adapterkonfiguration die tatsächlich provisionierten Zertifikate auswählen, HTTPS aktivieren und eine geeignete Netzwerkadresse binden.
4. Neustarten und Anmeldung über `https://<passender-geraetename>:<port>` prüfen. Fehlende/ungültige TLS-Provisionierung darf nicht durch Freischalten eines HTTP-LAN-Listeners umgangen werden; Wiederzugang über Konsole/SSH behalten.
5. Firewall/Segmentierung, individuelle Adminzugänge, Zertifikatserneuerung, Wiederherstellung und Trennung von Benutzer-/Servicerechten auf dem realen Zielgerät testen. Unter Linux/Windows sind Dateirechte bzw. ACLs und Dienstkonto gesondert zu prüfen.

Ein Reverse Proxy auf derselben Maschine gehört zum lokalen OS-Vertrauensbereich. Dieser Adapter behauptet keine geprüfte Proxy-TLS-Identität aufgrund von `X-Forwarded-Proto`, `X-Forwarded-Host` oder einem lokalen Socket. Für eine regulär unterstützte Proxy-Installation ist ein eigener überprüfter TLS-/Host-/Origin-/WebSocket-Vertrag erforderlich; bevorzugt TLS bis zum Admin selbst. Derselbe ioBroker-/OS-Benutzer kann weiterhin Prozesse und Netzpfade manipulieren.

## Begrenzungen im Code

| Bereich | Durchgesetzte Grenze |
|---|---|
| Ausgehende Schema-/News-GETs | HTTPS, feste erlaubte Hostnamen, TLS-Prüfung aktiv, mindestens TLS 1.2, keine Redirects, keine Wiederholungen, Gesamtbudget höchstens 5 s einschließlich DNS/TLS/Body; Antwortinhalt höchstens explizites `maxBytes`, Schema 1 MiB. Komprimierte Antworten werden nicht akzeptiert. Fehler enthalten nur feste Codes. |
| HTTP-Kopf/Request | 15 s Kopf-Timeout, 60 s Request-Timeout, höchstens 100 Header; zusätzlich die Upload-Gesamtfrist. |
| Upload-Admission | Beide Upload-Routen teilen sich pro Node-Prozess maximal zwei laufende Uploads, 400 MiB Staging-Budget und freie Plattenkapazität von zusätzlich 64 MiB plus bis zu zwei Dateikopien pro reserviertem Upload. Je Upload 200 MiB, eine Datei, vier Felder, fünf Teile, Feldgröße 64 KiB. |
| Upload-Lebenszyklus | 30 s Inaktivitätslimit des Parsers und 60 s Gesamtfrist nach Admission. Abbruch/Antwortende löst die Bereinigung aus. Fehler bei der Bereinigung halten die Prozessreservierung gesperrt. Private zufällige Request-Verzeichnisse mit POSIX 0700; erfolgreiche Paketdateien 0600. |
| Behaltene Paketdateien | Liegen im geschützten Staging-Bereich. Werden bei späterer Upload-Admission nach mindestens einer Stunde entfernt. Kleine Verzeichnisse zählen mit mindestens 16 MiB gegen die Admission; über 32 Verzeichnisse führen zu einer Sperre. Ohne weiteren Upload findet keine periodische Löschung statt. |
| Restore-Datei | Kopie in exklusiv erzeugte Zufallsdatei des Zielfilesystems, danach Rename auf `restore.iob`. Vorhandener Zielsymbolink wird ersetzt, nicht zum Schreiben verfolgt. Kopiedatei 0600. Der konfigurierte Restore-Bereich liegt außerhalb des Staging-Budgets; maximal eine fertiggestellte `restore.iob` bleibt dort erhalten. |
| Komprimierte Log-Vorschau | Asynchron, maximal zwei Dekompressionen, 1 MiB Eingang, 4 MiB Ausgabe, Abbruch nach 1 s. Bei Ablehnung wird nur das ursprüngliche gzip zurückgegeben. Kein `gunzipSync` im Webthread. |
| Systeminformation | Ein zusammengeführter asynchroner `npm -v`-Aufruf, Ergebnis/Fehler fünf Minuten gecacht; kein Shellaufruf, 1,5 s Prozesslimit, 1 KiB Ausgabe. Unter Windows kann npm als `--` erscheinen, wenn keine direkt ausführbare npm-Datei existiert. |

Die Uploadbegrenzung ist eine Anwendungsgrenze innerhalb eines Node-Prozesses, keine Dateisystemquota, keine harte Mehrprozessisolierung und kein Ersatz für OS-Datenträgergrenzen. Parallele separate Admin-Prozesse, andere Adapter und direkt lokale Schreibzugriffe müssen auf Betriebssystemebene begrenzt werden. Normale Node-Timer unterliegen der Ereignisschleifenplanung; keine Echtzeitgarantie.

## Deaktivierte zusätzliche Zugriffswege

Der bisher ohne separat nachgewiesene Authentifizierungsgrenze erzeugte externe MCP-Server wird auch bei alter aktivierter Konfiguration nicht mehr gestartet. Eine feste Warnung nennt diese Einschränkung. Freischaltung erst nach eigenständigem Authentifizierungs-, Berechtigungs-, Session- und Integrationstest. Die Paketreferenz allein ist keine Aktivierung des Dienstes.

`/sso` und `/sso-callback` werden im lokalen Sicherheitsprofil vor der OAuth-Registrierung mit 403 blockiert, damit kein ungeprüfter Remote-Accountfluss Seiteneffekte erzeugt. Lokale OAuth-Ausstellung wird unmittelbar nach Modellanlage durch die gesonderte EOS-Sitzungsbindung umschlossen. Passwortschreiben widerruft die bisherige Generation vor dem ersten asynchronen Controller-Schreibzugriff. Einzelheiten zum vollständigen Sitzungsvertrag im separaten Sitzungsbericht.

## Ausgeführte Nachweise und verbleibende Freigabepunkte

`node --test test/eos-web-resources.test.cjs`: 18/18 bestanden in Node 24.19.0 unter Linux am 30.09.2026. HTTPS-Tests führen den unveränderten Helper mit kontrollierten Transport-Streams aus (keine externe Live-TLS-Verbindung). Sie prüfen Schema/Credentials/Hosts/Ports, Redirectablehnung, TLS-Optionen, Größen, JSON, DNS-/Verbindungsstillstand und langsamen Body. gzip, Dateisystem, Quota-Dateigrößen, Symlinkziel und Dateirechte werden real ausgeführt. Express-Multipartparser, ioBroker-Webserver und echte Browser-/TLS-/SSH-Zielintegration sind dabei nicht gestartet. Die Gesamtfristprüfung verwendet einen gezielt verkürzten Testtimer; der Produktionswert bleibt 60 s. Testdatei und rohe Ausgabe werden mit dem Release gehasht.

Weiter offen: echter Multipart-Stream mit Verbindungsabbrüchen in jeder Parser-/Dateikopierphase; Windows-ACLs; mehrere Prozesse und Betriebssystemquota; tatsächlich provisioniertes TLS samt Zertifikatserneuerung; WebSocket-/OAuth-Neuanmeldung nach Migration; CPU-/Speicher-/Plattenlast unter realen Kundenbedingungen. Keine dieser Prüfungen ist als bestanden behauptet. Die bisherige Befundkennung EOS-HTTP-RES-001 wird dadurch technisch wesentlich bearbeitet, bleibt bis zu diesen Integrationstests eingeschränkt offen. EOS-TRANSPORT-001 ist für den direkten unverschlüsselten Netzwerklistener im Code behandelt; das TLS-Provisionierungsverfahren benötigt weiterhin einen Zielgerätebeleg.

Primärquellen: Node.js HTTPS/HTTP und Zlib API, https://nodejs.org/api/https.html , https://nodejs.org/api/http.html , https://nodejs.org/api/zlib.html . Ein Socket-Timeout allein bricht eine HTTP-Anfrage nicht ab; der implementierte Helper zerstört Request und Response aktiv beim Gesamtbudgetablauf. Die implementierte gzip-Vorschau verwendet begrenzte Streamingausgabe.
