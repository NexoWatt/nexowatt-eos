# Zertifikatsbetrieb und Wiederherstellung

Stand: 01.10.2026. Änderungen `EOS-CERT-LIFECYCLE-01` und
`EOS-WEB-CERT-RENEWAL-01` sowie `EOS-CERT-ACCOUNT-02`. Entwicklungs-/Testprofil; keine Produktiv-, CRA- oder
IEC-Freigabe. Quellbindung und konkrete Prüfergebnisse stehen in
`reports/integration/certificates-verification.json`.

## Getrennte Vertrauensbereiche

| Bereich | Identität | Lebensdauer | Erneuerung |
| --- | --- | --- | --- |
| Redis objects/states | Je Installation eigene CA, je Dienst eigener EC-P-256-Schlüssel; TLS 1.3, SAN-Prüfung, getrennte DB-Passwörter | Blatt 90 Tage, CA 365 Tage | Neue CA und neue Serverschlüssel in einer gestoppten Transaktion; gleiche Passwörter, Ports, ACL und Datenpfade |
| EOS Admin/UI HTTPS | Eigene HTTPS-CA, getrennte Admin-/UI-Schlüssel, explizite DNS-/IP-SANs einschließlich Loopback | Blatt 90 Tage, CA 3650 Tage | Neue Blätter/Schlüssel unter derselben CA; Browservertrauen bleibt erhalten |

Redis behält keinen CA-Privatschlüssel. Die HTTPS-CA liegt auf dem Gerät unter
`/etc/nexowatt-eos/web/authority/ca.key`, root-eigen 0600, Verzeichnis 0700.
Sie wird weder in ioBroker-Objekte noch in ein Release-ZIP übernommen.
Blattschlüssel sind root-eigen, nur für die jeweilige erforderliche Dienstgruppe
lesbar. Besitzer, Rechte, Kette, Schlüsselzuordnung, SAN und Gültigkeit werden
geprüft. Runtime-Prozesse erhalten keine sudo-Regel für diese Wartung.

Der Austausch betrifft weder Netzwerkschnittstellen noch Firewall, Routen oder
Tailscale. Sämtliche DNS-/IP-Namen für den Browserzugang müssen im HTTPS-Zertifikat
enthalten sein. Bis zu 24 vorgegebene Namen/Adressen plus drei Loopbackidentitäten
sind erlaubt. Die lokale öffentliche HTTPS-CA muss am verwendeten Service-Client
bewusst als vertrauenswürdig eingerichtet werden; die Software deaktiviert dafür
keine Browserprüfung. Ein CA-Austausch bei Kompromittierung oder vor Ablauf der
HTTPS-CA erfordert einen gesonderten Prozess mit erneutem Clientvertrauen.

## Ablaufbeobachtung

`nexowatt-eos-certificates.timer` startet nach dem Booten und anschließend täglich
die einmalige Prüfung `nexowatt-eos-certificates.service`, mit bis zu 30 Minuten
Zufallsverzögerung. Der Installer aktiviert den Timer bei erfolgreicher Installation
mit Dienststart. Der Timer **prüft nur** und unterbricht keine laufende Regelung.

Der Dienst prüft zuerst Signatur, Dateiintegrität, Version und Trust-Bindung des
installierten Releases. Danach prüft er die echten Zertifikate und die dazugehörigen
Konfigurationen. Blattzertifikate lösen spätestens bei 30 verbleibenden Tagen eine
Warnung aus, die HTTPS-CA bei 90 Tagen. Eine fehlende HTTPS-Identität bei einem
integrierten Admin-/UI-Profil gilt als Fehler. Der JSON-Bericht und der Exitstatus
enthalten keine Passwörter oder privaten Schlüssel:

| Ergebnis | Exitstatus |
| --- | --- |
| Zertifikate gültig, keine Warnschwelle erreicht | 0 |
| Warnschwelle erreicht | 3 |
| Abgelaufene Redis-Zertifikate oder unvollständige Wartung | 2 |
| Integritäts-, Schlüssel-, Konfigurations- oder anderer Prüfungsfehler | 1 |

HTTPS-Ablauf bzw. ungültige HTTPS-Ketten sind Prüfungsfehler (Exit 1).
systemd markiert die nicht erfolgreichen Prüfläufe als fehlgeschlagen. Journal und
Unitstatus sind die derzeitige Alarmoberfläche; E-Mail-, Push- oder UI-Benachrichtigung
ist damit noch nicht implementiert. Der Systemzeit und ihrer betrieblichen Pflege
kommt Bedeutung zu; diese Funktion ist keine vertrauenswürdige externe Zeitquelle.

```sh
sudo /usr/bin/node /opt/nexowatt/eos/current/tools/system/rotate-certificates.cjs status
systemctl status nexowatt-eos-certificates.service nexowatt-eos-certificates.timer
journalctl -u nexowatt-eos-certificates.service
```

## Explizite Wartung

Vor der Wartung muss der Betreiber das zulässige Unterbrechungsfenster festlegen.
Ein kurzer Kommunikationsausfall kann für Energieanlagen relevant sein; diese
Software erfindet keinen pauschalen physischen Abschaltzustand. Die integrierte
UI-Laborvariante enthält noch keine freigegebene physische Gerätesteuerung.

Die Befehle verwenden feste Pfade und Dienste, führen kein npm aus und laden
nichts aus dem Internet. Sie sind ausschließlich für ein signiert installiertes,
bereits initialisiertes Testsystem vorgesehen:

```sh
# Interne Datenbankidentitäten ersetzen; Controller und beide Redis-Dienste pausieren.
sudo /usr/bin/node /opt/nexowatt/eos/current/tools/system/rotate-certificates.cjs rotate

# Nur HTTPS-Blätter ersetzen; Controller/Adapter pausieren, Redis bleibt in Betrieb.
sudo /usr/bin/node /opt/nexowatt/eos/current/tools/system/rotate-certificates.cjs rotate-web
```

Beide Wege halten dieselbe exklusive `.activation.lock` wie Releasewechsel und
Onboarding. Ein parallel laufender oder ungeklärter Vorgang wird nicht übergangen.
Ein Root-Wartungsprogramm prüft den installierten Quellstand innerhalb der Sperre,
erzeugt die neue Generation in einem privaten Verzeichnis und synchronisiert Dateien
und Verzeichnisse. Vor dem Wechsel müssen alle betroffenen Konsumenten als gestoppt
und ohne MainPID bestätigt sein.

Die alten Dateien bleiben bis zur erfolgreichen Prüfung als private Rückfallgeneration
erhalten. Mehrere Dateisystem-Renames sind **keine einzelne atomare Operation**:
ein persistentes Journal und bekannte Hashes ermöglichen die Wiederherstellung an
den getesteten Unterbrechungspunkten. Bei Redis wird nur die CA in den beiden
Controller-Verbindungsprofilen verändert. Core- und gegebenenfalls Enrollment-Marker
werden ausschließlich hinsichtlich `runtimeConfigSha256` angepasst; Zustand und
Versionsbindung müssen vollständig und korrekt sein. Ein Abbruch zwischen den zwei
Marker-Schreibvorgängen lässt sich idempotent zurücknehmen.

Der integrierte Rollenstand verwendet Enrollment-Marker **Version 2** und
Kontorichtlinie **Version 1**. Vor dem ersten Marker-Schreibvorgang und nach der
Schreibprüfung gelten dieselben Konto-, Rollen-, Gruppen-, Passwortstatus- und
privaten Objekt-ACL-Prüfungen wie beim Enrollment. Der aktive Servicezugang muss
weiterhin den geschützten ACL-Vertrag und ein zulässiges Passwort-Hashformat
erfüllen. Eine abweichende Mitgliedschaft, zusätzliche Schreibrechte, inkonsistente
Erstpasswortflags oder ein alter v1-Marker verhindern den erfolgreichen Abschluss
und die Controllerfreigabe; Sperre und Recoverybelege bleiben bei einem nicht
vollständigen Rückfall bestehen. Konten werden nicht durch die Wartung migriert
oder repariert. Nur der Konfigurationshash der
beiden Marker darf sich ändern. Ein Core-Profil ohne Enrollment bleibt zulässig.

Diese Korrektur behebt die bisherige veraltete v1-Bedingung im Rotationshelfer,
die nach aktuellem Rollen-Onboarding den Rebind abgewiesen hätte. Die Regression
mit tatsächlichem Redis/TLS/AOF und dem Objects-Client des Lieferbaums sowie
die Negativ-/Recoveryfälle stehen in
[`certificate-account-v2/verification-summary.json`](../../reports/integration/certificate-account-v2/verification-summary.json).
Eine echte systemd-/Pi-Wartung wird durch diese Prozessfixtures nicht behauptet.

Der Controller wird als neuer Dienstprozess gestartet; dadurch wird auch sein
Read-only-Bindmount auf die neue Konfigurationsdatei neu aufgebaut. Während einer
Wartung gestattet die gemeinsame Startprüfung einen Teststart nur mit einem
Root-Permit, das Boot-ID und Identität des noch lebenden Koordinators enthält.
Vor Stop/Rückfall und vor dem Freigeben der Sperre wird das Permit entfernt.

Redis wird tatsächlich mit TLS 1.3, AUTH und PING geprüft. Nach HTTPS-Erneuerung
werden beide Listener über Loopback mit TLS 1.3, CA/SAN-Prüfung und **exaktem neuem
Blattfingerprint** geprüft. Ein noch laufender Listener mit dem alten, ebenfalls
gültigen Zertifikat gilt damit nicht als erfolgreiche Erneuerung. Die Probe allein
ist kein vollständiger funktionaler Login-/UI-Test.

OpenSSL-Aufrufe sind auf jeweils 15 Sekunden, feste systemctl-Aufrufe auf jeweils
90 Sekunden, Netzwerkproben auf fünf Sekunden und der getrennte DB-Marker-Worker
auf 20 Sekunden begrenzt; der Elternprozess beendet den Worker spätestens nach
25 Sekunden. Der CLI-Watchdog begrenzt asynchrone Gesamtaufträge zusätzlich. Bei
einem Prozessabbruch bleiben Sperre und Journal erhalten. Das sind Softwaregrenzen,
keine gemessene maximale Unterbrechungszeit auf einem Raspberry Pi.

## Fehler und Wiederherstellung

Ein fehlgeschlagener neuer Start löst einen Versuch aus, die exakt gespeicherte
vorige Generation und die passenden Marker wiederherzustellen. Abgelaufene oder
beschädigte frühere Zertifikate werden dabei niemals mit abgeschalteter TLS-Prüfung
reaktiviert. Ein unvollständiger Vorgang hält den Wiederanlauf gesperrt.

```sh
# Nach unterbrochener Redis-Identitätsrotation:
sudo /usr/bin/node /opt/nexowatt/eos/current/tools/system/rotate-certificates.cjs recover

# Nach unterbrochener HTTPS-Blatterneuerung:
sudo /usr/bin/node /opt/nexowatt/eos/current/tools/system/rotate-certificates.cjs recover-web
```

Recovery übernimmt ausschließlich eine nachweislich verwaiste Zertifikats-Sperre
des passenden Vorgangstyps. Eine lebende oder fremde Sperre wird nicht gelöscht.
PID-Wiederverwendung kann konservativ eine manuelle Diagnose notwendig machen.
Ein Abbruch während der Übernahme kann zusätzlich eine `.activation.lock.recovery`
zurücklassen; deren Aufklärung ist ein Root-Servicefall, kein automatisches Löschen.
Die Vorgänge dienen der Wiederherstellung geprüfter vorheriger Dateien; bei nicht
mehr gültigem Altbestand ist eine gesonderte Reparatur erforderlich.

Nach erfolgreichem Abschluss werden alte private Dateien bestmöglich entfernt.
`retiredSecretsRemoved=false` bedeutet, dass eine geschützte Restgeneration zur
Root-Bereinigung geblieben ist. Unlink ist kein Nachweis physischer Löschung auf
SSD und ersetzt keine sichere Datenträgerbehandlung. Wartungsjournale, lokale
Schlüssel und Sicherungen gehören nicht in Fehlerberichte oder öffentliche Repos.

## STRIDE und offene Grenzen

| Risiko | Kontrolle und Nachweis | Restgrenze |
| --- | --- | --- |
| Falsche Gegenstelle / Spoofing | Eigene CA, SAN, Schlüsselzuordnung, Gültigkeit, echter TLS-Negativtest alter Redis-CA | Gemeinsame ioBroker-Identität bleibt eine Vertrauenszone; keine Adapter-mTLS-Isolation |
| Manipulierte Generation | Root-Pfade ohne Symlinks, Einzeldatei-/Baumhashes, Signaturprüfung der ausgeführten Tools | root ist Vertrauensanker; kompromittierter root kann lokale Schlüssel lesen |
| Unklare Änderung / Repudiation | Begrenzte JSON-Statuscodes, Journal, Releasebindung und Testbelege | Keine externe manipulationssichere Auditablage |
| Schlüsselabfluss | Private Dateien/Authority, minimale Leserechte, keine Geheimnisse in stdout | Datenträger-, Backup- und Root-Kompromittierung separat behandeln |
| Ausfall / DoS | Warnschwellen, feste Budgets, explizites Wartungsfenster, geordneter Rückfall | Kein gemessener Hardware-Wiederanlauf oder echter Stromausfalltest |
| Rechteausweitung | Kein Runtime-sudo, feste Hostbefehle, keine Adapter-/HTTP-Wartungs-API; vor/nach v2-Marker-Rebind erneute unveränderte Enrollment-Konto-/Rollen-/ACL-Prüfung | Privilegierter Wartungscode bleibt prüfpflichtige Komponente; root ist weiterhin Vertrauensanker |

Die täglichen Warnungen ersetzen keinen Hersteller-Supportprozess. Web-CA-Austausch,
Sperr-/Kompromittierungsverfahren, Alarmweiterleitung und verifizierte Hardware-/VM-
Betriebsabnahme bleiben offen. Es wird keine fehlerfreie, wartungsfreie oder vollständig
CRA-/IEC-konforme Lösung behauptet.
