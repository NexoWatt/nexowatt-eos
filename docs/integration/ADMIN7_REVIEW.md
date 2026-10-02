# EOS Admin 7 – Integrations- und Sicherheitsprüfung

Stand: 30.09.2026. Geprüft wurde `NexoWatt/ioBroker.eos.admin`, Commit `93e155b50e0c56aea506ba4ea7a23dde2ea8b09a`, Paket `iobroker.eos-admin` **7.10.9**. Dieser Bericht überträgt keine Admin-8-Befunde pauschal auf Admin 7. Der GitHub-Stand ist nicht automatisch identisch mit einem früher separat bereitgestellten ZIP.

**Ergebnis:** Der Ersteinrichtungsassistent richtet die geforderten Schutzmaßnahmen nicht vollständig und verbindlich ein. Im geprüften Admin-7-Stand sind Authentifizierung und Rollenwächter vorhanden, jedoch auch gemeinsame Erstkennwörter, HTTP-Voreinstellungen und ein Zertifikatsfehlerpfad mit HTTP-Rückfall. Eine zentrale kryptografische EOS-Lizenzprüfung mit geschützter lokaler Lizenzdatei und Adapter-Entitlements ist in den untersuchten Backend-Quellen nicht nachgewiesen. Das ist eine Integrationslücke, keine Behauptung eines durchgeführten Angriffs.

Es wurden keine Produktdateien verändert, keine Pakete installiert, keine Listener gestartet und keine GitHub-Veröffentlichung vorgenommen. Design und Funktionen bleiben im Quellstand erhalten; ihre Funktionsfähigkeit auf dem Gesamtprodukt ist damit noch nicht getestet.

## Identität und Abhängigkeiten

| Merkmal | Geprüfter Wert |
| --- | --- |
| Paketversion | 7.10.9 |
| Node-Deklaration | `>=18.0.0` – keine Festlegung einer aktuellen, freigegebenen Produktlaufzeit |
| Controller-Abhängigkeit | `js-controller >=6.0.11` – tatsächliche Geräteversion unbekannt |
| Einstiegspunkt | `build/main.js` |
| Paketlizenz | `UNLICENSED`; proprietäre EOS-Anteile und erhaltene MIT-Hinweise für ioBroker-Anteile |
| Sperrdatei | `package-lock.json`, lockfileVersion 3, Rootversion 7.10.9 |
| Paketmanifest SHA-256 | `e255daafe25f17e1c84cb00080b6c3004ca6a244d1dacaff3b27a8443ea58338` |

Weitere Quellhashes und maschinenlesbare Befunde stehen in `system/integration/admin7-observations.json`. Die Lizenzhinweise sind ein Quellenbefund; die Lizenzverträglichkeit des gesamten EOS-Lieferumfangs bleibt separat zu prüfen.

## Offene Befunde

### EOS-ADM7-001 – Gemeinsames Erstkennwort und aufgehobene Kennwortwechselpflicht

Priorität: **hoch**; Status: **offen**; Nachweisart: `source-confirmed-and-isolated-reproduction`.

Voraussetzungen: Neu angelegte oder bisher kennwortlose Standardkonten; beziehungsweise vorhandene Standardkonten mit erzwungenem Kennwortwechsel. Netzwerkzugriff auf Admin erhöht das Risiko.

Unbefugte Nutzung von Installateur-/Kundenkonten; Neustart entfernt gesetzte Wechselpflicht-Marker. Ein bestehendes persönliches Kennwort wird durch diese Routine nicht ersetzt.

Quellbezug: `src/main.ts` Zeilen 253-327, `src/main.ts` Zeilen 465-475, `src/lib/web.ts` Zeilen 838-870, `src/lib/web.ts` Zeilen 1418-1447.

Maßnahme: Geräteindividuelle Einmal-Inbetriebnahme; keine gemeinsam gültigen Kennwörter, Konten bis zur Vergabe deaktivieren oder auf eng begrenzte Aktivierung beschränken; Wechselpflicht bei Neustart und Reset erhalten. Bestehende individuelle Kennwörter kompatibel übernehmen.

Isolierte Reproduktion: ADM7-R02, ADM7-R03.

### EOS-ADM7-002 – HTTP-Standard und optionaler TLS-Assistent mit Klartext-Rückfall

Priorität: **hoch**; Status: **offen**; Nachweisart: `source-confirmed-configuration-risk`.

Voraussetzungen: Standardeinstellungen oder fehlende Zertifikate bei der Inbetriebnahme; keine vorgeschaltete wirksame und getrennt geprüfte TLS-Terminierung.

Admin-Anmeldung und Sitzung können bei Netzwerkzugriff unverschlüsselt übertragen werden. Admin-Web-TLS ist unabhängig vom internen Controller-/Adaptertransport.

Quellbezug: `io-package.json` Zeilen 451-456, `src-admin/src/components/Wizard/WizardAuthSSLTab.tsx` Zeilen 104-148, `src-admin/src/dialogs/WizardDialog.tsx` Zeilen 297-351, `src/lib/web.ts` Zeilen 2673-2684.

Maßnahme: Abgesicherter Erstkontakt, eindeutige Zertifikatsidentität und durchgehend TLS; Zertifikatsfehler blockieren Freigabe statt HTTP-Rückfall. Interne Datenbank-/Controller-Verbindungen separat konfigurieren und messen.

Isolierte Reproduktion: ADM7-R01.

### EOS-ADM7-003 – Zentrale EOS-Lizenz- und Entitlement-Schnittstelle im geprüften Admin7-Stand nicht nachgewiesen

Priorität: **hoch**; Status: **offen**; Nachweisart: `integration-gap`.

Voraussetzungen: Zusammenführung zu einem lizenzpflichtigen EOS-Gesamtsystem.

Lizenztexte, role-basierte Lizenzadministration und system.licenses-ACL liefern keinen Nachweis für verschlüsselte lokale EOS-Lizenzspeicherung, asymmetrische Lizenzprüfung oder authentisierte Adapterfreigaben.

Quellbezug: `src-admin/public/js/license.js` Zeilen 1-13, `src-admin/src/dialogs/WizardDialog.tsx` Zeilen 175-183, `src/main.ts` Zeilen 101-109, `src/lib/web.ts` Zeilen 810-826.

Maßnahme: Separater lokaler Lizenz-/Identitätsdienst; nur öffentlicher Aussteller-Prüfschlüssel am Gerät, privater Signierschlüssel außerhalb des Produkts. Geschützte Lizenzdatei mit lokal gesichertem individuellen Schlüssel; je Adapter identitätsgebundene kurzlebige Entitlements statt Rohschlüssel verteilen. Sicherheitswartung, Recovery und physische Schutzfunktionen separat verfügbar halten.

### EOS-ADM7-004 – Installateur-Grenze lässt Codeinstallation aus einer frei angegebenen URL zu

Priorität: **hoch**; Status: **offen**; Nachweisart: `source-confirmed-and-isolated-reproduction`.

Voraussetzungen: Installateur-Sitzung; Controller akzeptiert den durchgereichten cmdExec-Auftrag. Tatsächliche Installation und erreichbare Systemrechte wurden nicht geprüft.

Der geprüfte Rollenwächter akzeptiert die Aktion url ohne Freigabeliste oder Bindung an ein geprüftes EOS-Release und gibt direkt true zurück. Damit fehlt in dieser Grenzprüfung die gewünschte Beschränkung auf freigegebene Adapter.

Quellbezug: `src/main.ts` Zeilen 1428-1464.

Maßnahme: Installateur-Kommissionierung über feste Aktionen und freigegebenen Artefaktkatalog; Quelle, Paketidentität, Version, Signatur und Hash auf Backend-/Controllerseite prüfen. Keine allgemeine Installations-URL aus Installateursitzungen. Benötigte Geräte-Inbetriebnahmeabläufe erhalten und getrennt testen.

Isolierte Reproduktion: ADM7-R04, ADM7-R05.

### EOS-ADM7-005 – Automatische Major-Updates einzelner Adapter widersprechen gemeinsam freigegebenem Systemstand

Priorität: **mittel**; Status: **offen**; Nachweisart: `source-confirmed-integration-risk`.

Voraussetzungen: NexoWatt-Auto-Update aktiviert und passende Repository-/Adapterdaten vorhanden.

Admin setzt die ioBroker-Upgrade-Policy für erkannte installierte NexoWatt-Adapter auf major. In diesem Modul ist kein atomarer, signierter EOS-Gesamtlieferstand mit geprüftem Rückfall nachgewiesen; das ist keine Aussage über sämtliche Integritätsprüfungen des Controllers.

Quellbezug: `io-package.json` Zeilen 588-588, `src/lib/eosAutoUpdate.ts` Zeilen 1-13, `src/lib/eosAutoUpdate.ts` Zeilen 67-67, `src/lib/eosAutoUpdate.ts` Zeilen 293-354.

Maßnahme: Versionen zu einem geprüften Systemrelease zusammenfassen, Laufzeit-/Controller-/Adapterkompatibilität prüfen, signierte Update-Metadaten und Datenmigrations-/Rollbacktests vorsehen. Bestehende Update-Bedienung erhalten, Backend auf freigegebene Lieferstände beschränken.

## Vorhandene Schutzmechanismen und ihre Grenze

- `io-package.json:454` aktiviert Authentifizierung. `src/main.ts:1428–1508` prüft Rollen serverseitig; sensible Schreiboperationen und geschützte Modulaktionen werden zum Teil abgewehrt. Die Tests zeigen auch die erfolgreiche Ablehnung eines geschützten Modul-Upgrades.
- `src/main.ts:2020–2057` schaltet die Legacy-Admin-Instanz ab und legt sie auf Loopback. Das beseitigt nicht den HTTP-Standard des EOS Admin selbst.
- `src/main.ts:1556–1578` setzt restriktive Objekt-ACLs für Zertifikate, Lizenz- und Credential-Objekte. Diese sind keine Isolation gegenüber einem kompromittierten Prozess mit gemeinsamer ioBroker-Identität und Dateizugriff.
- Der Passwort-Reset kontrolliert Rolle, Zielkonto und Same-Origin-Kennzeichnung (`src/lib/web.ts:1375–1416`). Der gemeinsame Rücksetzkennwortpfad und die beim Neustart gelöschte Wechselpflicht bleiben trotzdem offen.

Das Admin-Webfrontend verwendet die Adapterkonfiguration für seinen HTTPS-Server (`src/lib/web.ts:2673–2684`). Es richtet dadurch keine TLS-/mTLS-Verbindung zwischen Controller, Objekt-/State-Datenbank und Adaptern ein. Diese Verbindungen müssen am js-controller sowie an den konkreten Datenbank- und Adapter-Clients zusammen geprüft werden. Der js-controller ist daher eine verpflichtende Kernkomponente des Lieferstands und kein optionaler Adapter.

## Lizenz- und Controller-Vertrag für die nächste Umsetzung

1. Admin bleibt die vertraute Oberfläche für Erstaktivierung und Lizenzverwaltung. Die kryptografische Prüfung und Schlüsselspeicherung werden als enger lokaler Dienst mit eigener Identität ausgeführt. Kein privater Aussteller-Signierschlüssel wird ausgeliefert.
2. Adapter erhalten überprüfbare, auf Modul und Berechtigungen begrenzte Freigaben. Sie lesen weder den vollständigen Lizenzschlüssel noch einen gemeinsamen Entschlüsselungsschlüssel aus einer generell lesbaren State-/Objektstruktur.
3. Lizenzprüfung ist unabhängig von Benutzeranmeldung. Initiale kommerzielle Freischaltung, bereits laufende Regelung, Offlinebetrieb, Ablauf, Reset und Wiederherstellung bekommen explizite Zustandsregeln. Eine Lizenzstörung darf erforderliche physische Schutzfunktionen nicht unkontrolliert unterbrechen.
4. Controller-Version, Datenbankkonfiguration, Service-Identitäten und Admin-Transport werden zusammen versioniert. Ein erfolgreicher Browser-HTTPS-Aufruf ist kein Nachweis für verschlüsselte interne Verbindungen.
5. Installateur-Kommissionierung, Rollenansichten, Datenpunktkennungen und bestehende UI bleiben erhalten. Kontomigration, sichere Erstaktivierung, Update-Rückfall und Geräteverhalten müssen mit der bisherigen Oberfläche getestet werden. Ein Wechsel auf Admin 8 wird nicht automatisch vorgenommen.

## Tatsächlich ausgeführte Prüfungen

Fünf Tests gegen die belegte `build/main.js`-Datei und Standardkonfiguration wurden ausgeführt. Die Testdatei prüft vor der Extraktion den SHA-256 des geprüften Backends; sie lädt den Adapter nicht. Zwei extrahierte Routinen laufen gegen In-Memory-Stubs; Produktkonten, Dienste oder Dateien werden dadurch nicht verändert.

| Test | Beobachtung |
| --- | --- |
| ADM7-R01 | Authentifizierung aktiv, HTTP und alle IPv4-Schnittstellen als Standard bestätigt |
| ADM7-R02 | Drei neu erzeugte aktive Konten erhalten dasselbe Erstkennwort ohne Wechselpflicht |
| ADM7-R03 | Persönliches Kennwort bleibt erhalten; erzwungene Wechselpflicht wird beim erneuten Bootstrap gelöscht |
| ADM7-R04 | Installateur-Guard akzeptiert eine frei angegebene Beispiel-URL; kein Installationsbefehl ausgeführt |
| ADM7-R05 | Geschütztes Modul-Upgrade wird für Installateur abgelehnt |

**5/5 Reproduktionstests bestanden bedeutet: Diese Beobachtungen wurden reproduziert. Es bedeutet nicht, dass die fünf Sicherheitsanforderungen erfüllt sind.** Die Befunde bleiben offen.

Befehl:

```sh
EOS_ADMIN_SOURCE_DIR=/path/to/ioBroker.eos.admin node --test --test-reporter=tap tests/integration/admin7-source-reproduction.test.cjs
```

Belege: `reports/integration/admin7-source-reproduction.tap` und `reports/integration/admin7-source-reproduction.json`. Prüfprogramm: `tests/integration/admin7-source-reproduction.test.cjs`. Node im Prüfumfeld: **v24.19.0**, keine Zielgerätefreigabe. Übernommene Repositoryanweisungen beschreiben Node 20 und eine hier nicht vorhandene Monorepo-Struktur; diese wurden nicht als Beleg für aktuelle Laufzeitkompatibilität übernommen.

Nicht ausgeführt: kompletter Admin-Build, OAuth-/Socket-End-to-End-Prüfung, UI-Regression, Controller-/Datenbank-TLS-Handshake, tatsächlicher Installations-/Updateversuch, Abhängigkeitsscan, Raspberry-Pi-5- und Anlagenprüfung. Weitere Authentisierungsdetails einschließlich Session-Ablauf/Widerruf sind Gegenstand der nächsten vertieften Prüfung. Der deaktivierte Assistenzbereich enthält zusätzliche externe Abrufpfade, deren Begrenzung und Zertifikatsprüfung vor einer eventuellen Freigabe separat zu prüfen sind.

## Nachweis- und Freigabestand

Die STRIDE-Zuordnungen sind in der JSON-Datei erfasst. Die Befunde betreffen insbesondere sichere Voreinstellungen, Authentisierung, Autorisierung, Updateintegrität und Verfügbarkeit. CRA-/IEC-Bezüge werden im bestehenden System-Nachweis geführt; aus diesem Quellreview wird keine Normkonformität, unabhängige Zertifizierung oder Produktivfreigabe abgeleitet. Verantwortliche Umsetzung/Freigabe: NexoWatt; Zieltermin noch festzulegen. Ein Befund wird erst nach konkreter Änderung, Nachtest und ausreichender Integrationsprüfung geschlossen.
