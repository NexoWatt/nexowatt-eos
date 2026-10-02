# NexoWatt UI im integrierten Testsystem

Komponente: `components/ui`, Basis gehärtete UI 1.0.21, abweichender
Entwicklungsquellstand. Ausgeliefert als **Inbetriebnahme-/Ansichtsprofil**;
Gerätesteuerung und Konfigurationsmutationen bleiben ausdrücklich gesperrt.
Design und operative EMS-Quellen bleiben erhalten.

Die verbindliche Implementierungs-/Prüfbeschreibung einschließlich STRIDE,
Migration und Grenzen liegt in
[`components/ui/docs/security/EOS_UI_INTEGRATED_DE.md`](../../components/ui/docs/security/EOS_UI_INTEGRATED_DE.md).

## Vertrag für Installer und Laufzeit

| Teil | Festlegung |
|---|---|
| Instance | `nexowatt-ui.0`, benötigt `eos-admin@7.10.11` |
| Bindung | `native.ip`/`native.bind`: IP, Standard `0.0.0.0`, IPv6 `::` möglich |
| Port | `native.port`: Integer 1024–65535, Standard `8188` |
| TLS | `/etc/nexowatt-eos/web/ui.crt`, `/etc/nexowatt-eos/web/ui.key`, ausschließlich TLS 1.3 |
| Dateirechte | root-eigene nicht fremd beschreibbare Eltern; Schlüssel root:eos-runtime `0640`, keine Symlinks/Hardlinks |
| Lizenz | Feste Gegenstelle `eos-admin.0`, Kommando `eos.license.check`, Energie-Feature; Client 1.0.1 identisch vendort |
| Auth vor Lizenz | `GET /api/strict-auth/status`; `POST /api/strict-auth/login` mit `{ "user": "NAME", "password": "INDIVIDUELL" }` |
| Cookie | `nw_session`, Secure/HttpOnly/SameSite=Lax; aktuelle Konten-/Gruppenprüfung |
| Lizenzansicht | `GET /api/license/info` nur mit Adminsitzung; keine UUID/Token/Schlüssel |
| Alte Speicherung | `POST /api/license/save` antwortet nach Adminprüfung 409, keine Schlüsselpersistenz |
| Physische Aktionen | Preview-Lifecycle und Adapter-/HTTP-Schreibgrenzen; kein nativer Freischaltschalter |

`/license.html` bleibt vor Lizenzaktivierung für die strikte Adminanmeldung
technisch erreichbar. Die Seite führt per HTTPS zu Port 8081 für die zentrale
Lizenzverwaltung. Die Produktinstanz braucht keine eigene `native.licenseKey`.
Bei Lizenzverlust erlischt die Freigabe, SSE wird geschlossen; keine Null-Sollwerte
oder pauschale Abschaltung werden ausgesendet, da dieses Profil keinen Regler startet.

Die zentrale Freigabe wird über den TLS-gesicherten Controller-Bus transportiert.
Dies ist keine individuelle kryptografische Identität je Adapter und keine Isolation
gegen kompromittierte Prozesse desselben Dienstkontos. Tailscale ersetzt nicht die
Browser-Zertifikatsprüfung oder Anmeldung.

Komponentennachweis: 43 neue/erneut ausgeführte HTTPS-/Lizenz-/Authfälle bestanden,
inklusive Cold-Start mit Storage-/Bus-Fixtures. `test:all` des alten eigenständigen
UI-Releases stoppt an dessen unveränderter Release-Artefaktsperre; keine vollständige
UI-Produktfreigabe. Der SBOM-/Gesamtbuild muss die vendorte Clientkopie und die
veränderte UI-Quellherkunft berücksichtigen.

Der echte Controller initialisiert eigene Status-Defaults über seine Foreign-State-API.
Die Preview-Grenze erlaubt dafür ausschließlich `ack: true` unter dem beim Start
festgehaltenen `nexowatt-ui.0.`-Präfix; externe/System-IDs und Befehle bleiben gesperrt.
Befund `EOS-UI-INT-01` und der gezielte Regressionstest dokumentieren die Korrektur.

## Tatsächliche Gesamtintegration am 01.10.2026

Der Kandidat `integrated-ui-candidate-r4/app` besteht **sieben reale Laborstufen
(acht TAP-Knoten), mit ausdrücklich gekennzeichneter OS-Interface-Fixture**.
Der Lauf verwendet echte Controller-/Adapterprozesse, zwei echte Redis-7.2.10-
Server mit TLS 1.3 und Authentifizierung sowie die realen Admin-/UI-HTTPS-Server.
Node 24.19.0, Linux x64, Labor-UID 0; kein systemd- oder Hardware-Abnahmenachweis.

| Geprüfter Vertrag | Tatsächliches Ergebnis |
|---|---|
| Frisches Grundsystem | Reguläres Setup, Core-Härtung, individuelle Admin-Zugangsdaten, genau zwei zunächst deaktivierte freigegebene Instanzen. |
| Assets und Start | Regulärer lokaler CLI-Upload, tatsächlicher Controller-Start, aktuelle Alive-Werte und beide HTTPS-Listener; TLS 1.2 verworfen. |
| Root-Inbetriebnahmeprüfung | Unveränderte exportierte `probeWeb`-Funktion aus `tools/system/onboard-ui.cjs` gegen beide echten Listener bestanden. |
| Anmeldung | Echte UI-Sitzung und Admin-OAuth mit dem individuell erzeugten, stark gehashten Konto; Secure-Cookies. |
| Zentrale Freigabe | Kurzlebiger, nur im Labor erzeugter Ed25519-signierter NWL2-Testschlüssel über die geschützte Admin-HTTP-Schnittstelle; UI erhält über die reale verschlüsselte Messagebox exakt zwei Ladepunkte/einen Speicher. |
| Vertraulichkeit und Mutation | Keine UUID-/Token-Ausgabe durch UI-Lizenzstatus; Admin-Lizenzmutation ohne erforderlichen Origin verweigert; Gerätesteuerung/Konfigurationsmutation auch mit Lizenz HTTP 503. |
| Widerruf | Zentrale Entfernung der Lizenz macht UI-Funktionen ungültig; strikte Anmeldung bleibt zur Wiederherstellung erreichbar. |

Der reale Admin liefert bei anonymer Anfrage auf `/nexowatt/license/status`
**302** mit exakt `/index.html?login&href=%2Fnexowatt%2Flicense%2Fstatus`, auch bei
`Accept: application/json`. Die vorgeschaltete Anmeldung greift vor dem separat
getesteten Lizenzhandler mit HTTP 403. Die Root-Prüfung akzeptiert ausschließlich
diese konkrete relative Weiterleitung über verifiziertes TLS, keine beliebigen
3xx-Antworten. Die UI liefert auf `/api/strict-auth/status` öffentlich HTTP 200 mit
`enabled`, `strict`, `protectWrites` wahr und `authed`, `isAdmin` falsch.

Die Integration deckte außerdem einen Admin-Vertragsfehler auf: Die
`system/group`-View verwendet den Anzeigenamen als `row.id`. Die korrigierte
Sitzungs-/Rollenprüfung verwendet ausschließlich die streng geprüfte kanonische
`row.value._id`. Der endgültige reale OAuth-/Lizenzlauf prüft diese Korrektur mit.
Frühere fehlgeschlagene Versuche bleiben als Rohbelege erhalten.

### Präzise Begrenzung der OS-Fixture

Der native Gesamtversuch scheiterte bereits im upstream Adapterstart an der hier
verweigerten Betriebssystemfunktion `uv_interface_addresses`. Für die weitere
Laborprüfung wurde ausschließlich in einer wegwerfbaren Kandidatenkopie jeweils
**ein** `os.networkInterfaces()`-Aufruf in CJS und ESM der Controller-Adapter-
Abhängigkeit durch eine feste Loopback-Antwort ersetzt. Original-/Ersatzhashes
sind protokolliert. Der eingefrorene Kandidat enthält **keine** solche Änderung;
seine unveränderten Originalhashes wurden nach dem Test nochmals geprüft.
Es gab keine `NODE_OPTIONS`-Vorladung, keine gelockerte TLS-Prüfung und keine
abgeschwächte Passworthärtung.

Die Lizenz nutzt eine frische zufällige UUID in der isolierten Testdatenbank,
weil upstream bei `CI=true` einen Statistik-Platzhalter setzt. Dies prüft keinen
Hardware-Fingerabdruck. Zertifikate, Passwort und Signierschlüssel sind temporär;
eine vorhandene Installation wird vom Test verweigert. Die exklusiv neu angelegten
Testverzeichnisse einschließlich `/etc/nexowatt-eos` werden anschließend entfernt.

**Weiter offen:** native unveränderte Gesamtabnahme, unprivilegierter systemd-
Betrieb auf Debian 12/RPi 5, VM-/LAN-/IPv6-/Tailscale-Prüfung, Neustart und
Stromverlust, Zertifikatsrotation, Last-/Ressourcenverhalten und gerätespezifische
Schutzübergänge. Auf Zielhardware ist auch die starke Passwortprüfung innerhalb
der zeitlich begrenzten Admin-Sitzungsprüfung zu messen. Der Stand aktiviert
weiterhin keine physischen Adapter oder EMS-Regelung und begründet keine
Produktiv-, CRA- oder IEC-Freigabe.

Nachweise:

- [Maschinenlesbare Zusammenfassung](../../reports/integration/raw/ui-controller-summary.json)
- [Finaler R4-Laborlauf](../../reports/integration/raw/ui-controller-attempts/attempt-11-r4-os-interface-fixture.tap)
- [Automatisiertes Integrationsskript](../../tests/integration/ui-controller.integration.cjs)

Kandidaten-Lockfile SHA-256:
`0bcb60b6684f7e35820d9ccc70da354154e19909ba260a841c429bf98a73a4c8`.
Die Zusammenfassung bindet Testskript, Rohbelege und Laufzeitdateien an weitere
konkrete SHA-256-Werte; frühere Kandidatenbelege werden nicht als R4-Abnahme ausgegeben.
