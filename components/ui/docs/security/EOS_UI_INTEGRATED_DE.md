# UI im integrierten EOS-Testprofil — 01.10.2026

Dieser Stand basiert auf dem gehärteten UI-Quellstand `10d5f5a4b0b8aba6d18fc32c5c3508b2db538310`
(1.0.21). Er ist eine veränderte Entwicklungskomponente des EOS-Gesamtpakets,
keine unveränderte oder eigenständig veröffentlichte UI-1.0.21 und keine
Produktiv-, IEC- oder CRA-Freigabe.

## Architektur und Vertrauensgrenzen

| Verbindung | Durchsetzung und Grenze |
|---|---|
| Browser → UI:8188 | Ein HTTPS-Listener, ausschließlich TLS 1.3; Zertifikatsprüfung durch den Browser, kein HTTP-Fallback. |
| UI → EOS Admin | Der identisch übernommene Client `@nexowatt/eos-license-client@1.0.1` nutzt `eos-admin.0`, Messagebox-Kommando `eos.license.check`, Feature `energy`. |
| Controller-Bus | Verschlüsselung wird im EOS-Grundsystem bereitgestellt. Messagebox plus Nonce ist keine separate kryptografische Adapteridentität und schützt nicht vor einem kompromittierten gemeinsamen Dienstkonto. |
| Benutzer → API | Aktuelle lokale Sitzung, aktuelle Benutzer-/Gruppenrechte, Passwortrevision und serverseitige Rollenprüfung; Trusted-Header-Freigaben sind entfernt. |
| UI → Geräte/andere Adapter | Im festen Inbetriebnahmeprofil gesperrt. Kein Konfigurationsschalter kann die Gerätesteuerung freigeben. |

TLS-Dateien liegen fest unter `/etc/nexowatt-eos/web/ui.crt` und `ui.key`.
Der Installer stellt individuelle Zertifikate, passende DNS-/IP-SANs und
`root:eos-runtime` bereit; Schlüsselmodus `0640`, nicht fremd beschreibbare
root-eigene Verzeichnisse. Die UI prüft Eigentümer, Links, Rechte, Dateigröße,
Zertifikatszeit, Schlüsselzuordnung und CA=false vor dem Listenerstart.
Erneuerung/Neustart wird durch den übergeordneten EOS-Lebenszyklus verwaltet;
diese Komponente erneuert oder lädt Zertifikate nicht selbst nach.

`native.ip`/`native.bind` dürfen eine IP-Bindung enthalten, standardmäßig
`0.0.0.0`; `::` ist ebenfalls zulässig. Der Port muss eine ganze Zahl 1024–65535
sein, standardmäßig 8188. `eosLicenseAdminInstance`, falls gesetzt, muss exakt
`eos-admin.0` sein. Es gibt keine IP-Ausnahme für Anmeldung und keine LAN- oder
Tailscale-Adresssperre. Tatsächliche VPN-/Firewall-/SAN-Tests stehen noch aus.

## Zentrale Lizenz und Migration

Die aktualisierte [Home/Pro-Rechte- und Kontingentprüfung](EOS_LICENSE_ENTITLEMENTS_2026-10-03_DE.md)
beschreibt die gemeinsame serverseitige Freigabe für Module und App-Center,
Null-/Teilmengen sowie die getrennte Lease- und Vertragsgültigkeit.

Die UI erhält ausschließlich eine höchstens 15 Sekunden gültige Freigabe mit
Edition, Features und Mengenlimits. Der Client prüft neue Nonces, Antwortschema,
Zeitfenster, Datentypen und editionsabhängige Grenzen; Anfrage maximal 2 Sekunden,
periodische Aktualisierung 5 Sekunden. Die Freigabe wird auch beim Zugriff geprüft.
Lokale HMAC-Erzeugung/-Prüfung, UUID-/Schlüssellesen, lokale Schlüsselablage und
Rückgabe vollständiger Lizenzschlüssel sind aus dem aktiven UI-Kern entfernt.
Der alte Schreibendpunkt antwortet nach Admin-Anmeldung mit `409
CENTRAL_LICENSE_MANAGEMENT`. Die Lizenzseite verweist auf EOS Admin über HTTPS.

Bei Ablehnung/Timeout/Ablauf werden Freigabe und Cache ungültig sowie bestehende
SSE-Verbindungen geschlossen. Es gibt keine weiter gültige Offline-Lizenz aus
alten State-Werten. Die UI sendet dabei keine Abschalt-, Null- oder Ersatzsollwerte.
Alte NW1-Schlüssel werden hier nicht weiter akzeptiert. Der Stand ist für frische
EOS-Installation vorgesehen; eine Übernahme alter Lizenzen braucht eine
kontrollierte Neu-Ausstellung/Migration im Admin, nicht die Rückkehr zum alten
geteilten Signiergeheimnis.

## Bewusst noch gesperrte Betriebsfunktion

Der tatsächliche `onReady`-Pfad startet HTTPS, Rollen-/Lizenzanzeige und lokale
Status-/Konfigurationslesefunktionen. Er startet keine EMS-, Wetter-, EEBUS-,
NexoLogic-, Speicher- oder SmartHome-Regelzyklen. Das bestehende operative
Startprogramm und die EMS-Quellen bleiben für die anschließende geprüfte
Inbetriebnahme erhalten. Das Dashboard zeigt dauerhaft:
**Inbetriebnahme/Testprofil – Gerätesteuerung noch gesperrt**.

Sämtliche HTTP-Mutationen außer Anmeldung/Abmeldung und dem ablehnenden alten
Lizenzendpunkt werden mit `503 EOS_TEST_CONTROL_BLOCKED` verweigert. Dies umfasst
in diesem Stand auch Konfigurationsspeichern: bestehende Speicherhandler können
weitere Dienste starten und sind deshalb noch nicht zur isolierten
Konfigurationsbearbeitung freigegeben. Beide `initLogicEngine`-Definitionen und
`initEmsEngine` verweigern einen Aufruf im Testprofil.

Zusätzlich verweigert der Adapter fremde State-/Objektänderungen in synchroner,
Callback- und Promise-Form, Host-Kommandos sowie `sendTo`/`sendToAsync` an andere
Adapter oder mit anderen Kommandos. Der zentrale Lizenzverkehr bleibt möglich.
Eine eng begrenzte Ausnahme erlaubt bestätigte eigene Statuswerte (`ack: true`)
unter dem beim Start festgehaltenen Präfix `nexowatt-ui.0.`: Der echte Controller
legt eigene Defaultwerte intern über `setForeignStateAsync` an. Unbestätigte
Befehle, fremde/System-IDs, ähnlich benannte Präfixe und Objektänderungen bleiben
gesperrt. Die Ausnahme ist im Callback- und Promise-Pfad geprüft.
Diese Anwendungssperren sind keine Sandbox gegen beliebigen Code im selben
Node.js-Prozess/Unix-Konto. Sie erlauben keine Aussage über gerätespezifische
Schutzfunktionen, harte Echtzeit oder ein sicheres Weiterregeln bei Lizenzverlust.
Dafür sind eine geprüfte betriebliche Aktivierungspolitik und Geräteversuche
Voraussetzung; die Test-UI ist kein Anlagenregler.

## STRIDE und Nachweiszuordnung

| Bedrohung | Maßnahme | Nachweis / verbleibende Grenze |
|---|---|---|
| S: Rolle per HTTP-Header vortäuschen | Header-Vertrauen entfernt, aktuelle lokale Sitzung | TLS/Auth-Test: gültig konfiguriertes Header-Secret verleiht keine Rolle. |
| S/T: Freigabe fälschen oder wiederholen | Zentrales Schema, Nonce, kurze Lease, feste Gegenstelle | Negative Nonce-/Schema-/Feature-/Mengen-/Zeitprüfungen; gemeinsames Dienstkonto bleibt Vertrauenszone. |
| I: Schlüssel offenlegen | Keine Lizenzschlüssel-API/-Native-Persistenz; TLS-only | Antwortprüfung auf Token/UUID/Schlüssel; Leser-/Schreiberroute getestet. |
| T/E: Betrieb trotz ungeprüfter Aktivierung | Fester Preview-Start, API-/Adapter-Schreibsperren | Echter Cold-Start mit Controller-Fixtures, API-503 und keine gestarteten Kontrollzyklen. |
| D: Langsame TLS-/HTTP-Verbindungen | TLS-Handshake 5 s, HTTP-Header 15 s, Anfrage 30 s, 100 Header | Konfiguration vorhanden; Last-/Ressourcenerschöpfungsabnahme offen. |
| R: Unbelegte Freigabe | Versionierte Tests, Quelldifferenzen und Rohprotokolle | Keine Zertifizierungs- oder Vollständigkeitsbehauptung. |

## Tatsächlich ausgeführte Prüfungen

Umgebung: Linux x86_64, Node 24.19.0. Express und HTTPS sind echt, Controller,
Benutzerobjekte und Messagebox in dieser Komponentenprüfung simuliert.
Zertifikate entstehen pro Testlauf außerhalb des Repositorys und werden entfernt.

- `node --test --test-reporter=tap scripts/verify-eos-integrated.cjs scripts/verify-eos-auth-security.cjs`: **43/43 bestanden**, 15 neue Fälle und 28 bestehende Auth-Prüfungen jetzt über HTTPS.
- Echte TLS-Verbindungen: TLS 1.3 und vertrauenswürdiger Name funktionieren;
  TLS 1.2, HTTP-Klartext, unbekannte CA und falscher Name werden verworfen.
- Cold-Start ohne Lizenz liefert strikte Anmeldung/Lizenzstatus über HTTPS,
  startet keinen EMS-/Wetterzyklus und verweigert eine Gerätemutation.
- Lizenzablauf wird mit echter kurzer Lease/Timer geprüft; kein State-Schreibbefehl.
- Umfassende vorhandene Rollen-/Direktlink-/Browserpfadprüfung
  `node scripts/verify-stable-1.0.9-access.cjs` bestanden. Deren künstlich
  freigegebene Geräteoperationen sind **Fixture-Regression**, keine Freigabe
  des ausgelieferten Preview-Profils.
- `npm run build:ts`, TS-Syntax, kanonische Quellen, gezielt typisierter
  Main-Spiegel und Dokumentationsprüfung bestanden.
- `npm pack --dry-run --json --ignore-scripts` listet die neuen TLS-/Clientdateien.

`npm run test:all` wurde ebenfalls versucht und endet korrekt bereits an der
alten, unveränderten eigenständigen Release-Artefaktsperre: die neue Datei-/Hashmenge
entspricht nicht dem alten UI-Release. **Die vollständige alte UI-Release-Suite ist
nicht bestanden oder vollständig ausgeführt.** Alte NW1-/HMAC-Vertragstests sind
fachlich abzulösen. Die Sperre wurde nicht entfernt, neu versiegelt oder als
bestandener Nachweis umdeklariert. Das EOS-Gesamtpaket hat einen eigenen signierten
Build-/Testumfang; ein eigenständiges UI-Release verlangt dessen separate Abnahme.

Rohbelege: `reports/security/integrated-20261001/`. Der erste Integrationslauf
enthält einen Testfehler: ein normaler Auth-Status war ohne Lizenz zu Recht
verweigert; geprüft werden muss der vorgesehene `strict-auth`-Wiederherstellungspfad.
Der korrigierte Test besteht, der erste Beleg bleibt erhalten.

## Gesamtintegrationsbefund EOS-UI-INT-01

Der tatsächliche Controller-Start im separaten Gesamttest zeigte, dass die erste
Preview-Sperre auch die interne Anlage eigener Defaultwerte blockierte. `alive`
konnte bereits wahr sein, obwohl der HTTPS-Listener fehlte. Der Fix begrenzt die
Ausnahme auf bestätigte eigene Werte; der neue Regressionstest bildet den echten
Controller-Aufruf `_setObjectWithDefaultValue` ab. Der frühere Cold-Start-Test
ersetzte die State-Anlage durch Fixtures und war für diesen Vertrag unzureichend.
Die fehlgeschlagenen Gesamtversuche bleiben unter
`reports/integration/raw/ui-controller-attempts/` im übergeordneten System erhalten;
deren abschließender Status wird dort getrennt bewertet.

## Offene Freigabepunkte

1. Reale Controller-/Admin-/Redis-Gesamtintegration und unprivilegierter
   systemd-Betrieb auf Debian 12 / RPi 5 sind eigene Nachweise.
2. Geprüfte Lizenz-/Kommunikationsverlust-Übergänge für vorhandene Schutzregelung
   und kommerzielle Betriebsfunktionen; anschließend erst Gerätesteuerung aktivieren.
3. Konfigurationsspeicherung von Dienststart-/Gerätewirkungen trennen und prüfen.
4. Zertifikatsrotation, Browser-CA-Einrichtung, Tailscale und Lasttests auf Zielhardware.
5. Alte separate UI-Releaseprüfungen auf zentrale Lizenzverträge migrieren und
   vollständige funktionale Geräte-/EMS-Regressionsabnahme nachweisen.
6. Rechtlicher Produktscope, Support-/Schwachstellenprozesse und anwendbare
   IEC-/CRA-Nachweise bleiben Produktaufgaben; diese Komponentenprüfung ersetzt sie nicht.
