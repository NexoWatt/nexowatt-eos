# EOS Admin 7 im integrierten Testsystem

Stand: 01.10.2026. Ausgangsquelle: vollständiges EOS-Admin-Repository 7.10.11,
Eingangsarchiv SHA-256 `c58a4c03b3f3113455bf1a3492b942307902deabf3fd8f670670ff16955f9a92`.
Dies ist ein abgeleiteter Entwicklungsstand für das signierte EOS-Testsystem,
keine unveränderte Herstellerfreigabe und keine CRA-/IEC-Zertifizierung.

## Architektur und verbindlicher Vertrag

Browser und Tailscale-Clients greifen auf denselben HTTPS-Dienst zu. Admin besitzt
keinen privilegierten Installationsdienst, Docker-Socket oder sudo-Zugang.
Controller und Admin verwenden die vom Grundsystem bereitgestellte TLS-Verbindung
zur Objekt-/Zustandsdatenbank. Die gemeinsame ioBroker-Identität bleibt eine
Vertrauenszone; diese Integration stellt keine Sandbox zwischen Adaptern her.

```json
{
  "profile": "nexowatt-eos-integrated-test-v1",
  "instance": "eos-admin.0",
  "web": {
    "bind": "0.0.0.0",
    "port": 8081,
    "authentication": "required",
    "tlsMinimum": "TLSv1.3",
    "tlsMaximum": "TLSv1.3",
    "certificate": "/etc/nexowatt-eos/web/admin.crt",
    "privateKey": "/etc/nexowatt-eos/web/admin.key"
  },
  "licenseTrust": "/etc/nexowatt-eos/license-trust.json",
  "browserPackageInstallation": false,
  "browserShellExecution": false,
  "defaultAccountsCreatedByAdmin": false,
  "rootDependencyOverrides": {
    "oauth2-server": "npm:@node-oauth/oauth2-server@5.3.0"
  }
}
```

`src/lib/eosApplianceProfile.js` ist Teil des signierten, root-eigenen Codebaums.
Das Profil hat keinen Umgebungsvariablen-, Native-Konfigurations- oder
Browser-Opt-out. Authentifizierung, TLS, Port und Bindung werden auch bei einer
abweichenden Datenbankkonfiguration durchgesetzt. Basic-Auth, passwortlose
Erstaktivierung, automatische Standardkonten und automatische Repositoryupdates
sind abgeschaltet. Fehlende/falsche TLS-Dateien verhindern den Webserverstart;
es gibt keinen HTTP-Rückfall. `0.0.0.0` bedeutet alle IPv4-Schnittstellen;
eine IPv6-Bindung wird damit nicht behauptet.

Das Betriebssystem-Setup muss vor Freigabe der Instanz:

1. Einen vom Betreiber gewählten eindeutigen Administratorzugang einrichten und
   `system.user.admin` erst mit gültigem Passwort aktivieren. Kein gemeinsames
   Bootstrappasswort verwenden. Der bestehende Admin-Erstpasswortdialog gilt für
   verwaltete Nicht-Administratoren; der Installer setzt das endgültige
   Administratorpasswort vor dem Dienststart.
2. Serverzertifikat und Schlüssel getrennt bereitstellen. Schlüsseldatei
   `root:eos-runtime`, Modus `0640`; alle Elternverzeichnisse root-eigen und nicht
   gruppen-/weltbeschreibbar. Dateien dürfen keine Symlinks oder Hardlinks sein.
   Zertifikat und Schlüssel müssen zusammenpassen, zeitlich gültig sein und
   Subject Alternative Names enthalten. Die SANs müssen die tatsächlich
   verwendeten LAN-/Tailscale-DNS-Namen bzw. IP-Adressen abdecken. Der Browser
   benötigt die vertrauenswürdig übergebene Aussteller-CA.
3. Die öffentliche Ed25519-Lizenzvertrauensdatei als JSON-Zuordnung `kid` zu
   öffentlichem SPKI-PEM root-eigen bereitstellen. Private Ausstellerschlüssel
   gehören niemals auf das Gerät. Kein Umgebungsvariablenpfad kann diesen Anker
   im integrierten Profil ersetzen.
4. Das OAuth-Override im **obersten** Installationsmanifest übernehmen. npm
   ignoriert Overrides abhängiger Pakete; Admin prüft deshalb beim Start den
   tatsächlich von `@iobroker/webserver` aufgelösten Namen und die Version.

Passwortänderungen über die Admin-APIs verwenden das vom Controller unterstützte
PBKDF2-SHA256-Format mit 600.000 Iterationen, zufälligem 16-Byte-Salt und dem
Controller-kompatiblen 256-Byte-Ausgabefeld. Die Eingabe ist auf 15–128 Zeichen
und 256 UTF-8-Bytes begrenzt; maximal zwei Hashaufträge laufen gleichzeitig.
Das ist keine speicherharte Passwortfunktion. Die Laufzeit auf Raspberry Pi und
das Verhalten unter Anmeldelast bleiben zu messen.

## Anwendungen, Wartung und Lizenz

Das vorhandene Frontend bleibt erhalten. Bestehende Instanzen dürfen ihre
fachliche Native-Konfiguration ändern; Paketname, Einstiegspunkt, Version,
Prozessparameter und Instanzneuanlage sind über den Browser nicht veränderbar.
Direkte Paketuploads, npm-/URL-Installation, Shellbefehle, ZIP-Import über
Hostkommandos, Dateiänderungen an der Admin-Dateischnittstelle, Repository- und
Zertifikatsänderungen sind serverseitig gesperrt. Dies gilt auch für einen
angemeldeten Administrator. Signierte Erweiterungen und Systemwartung laufen
über den getrennten root-eigenen EOS-Wartungsweg. Eine grafische Oberfläche für
diesen neuen Wartungsweg wurde hier nicht implementiert.

Die Kontrolle umschließt die wirkliche Dispatch-Tabelle von
`@iobroker/socket-classes@2.3.4`. Dessen interne `_checkPermissions`-Aufrufe
reichen bei Objektänderungen das Objekt selbst nicht weiter und überspringen
die Prüfung bei manchen eigenen Passwortänderungen. Deshalb genügt eine
alleinige Erweiterung dieser Methode nicht. Rollen-/ACL-Prüfung und laufende
Sitzungswiderrufe gelten zusätzlich zur neuen Begrenzung.

Der Gruppenvertrag wurde mit dem echten Controller abgeglichen: Die Ansicht
`system/group` liefert den Anzeigenamen als `row.id`, die technische ID steht in
`row.value._id`. Sitzungsabdruck und Web-Rollenzuordnung verwenden ausschließlich
die validierte technische ID des Gruppenobjekts. Fehlende, fremde oder doppelte
IDs werden abgelehnt. Frühere Fixtures hatten diesen Vertrag falsch vereinfacht;
die reale Integration deckte die daraus entstandene Anmeldesperre auf. Die
Regressionstests verwenden jetzt auch übersetzte Anzeigenamen.

Der bereits deaktivierte Assist/MCP-Bereich wird ohne ausführbare MCP-Abhängigkeit
ausgeliefert. Docker-Verwaltung und Betriebssystem-Passwortänderungen gehören
ebenfalls nicht in diesen unprivilegierten Adapter. Externe Nachrichten- und
Bewertungspolls wurden abgeschaltet. Eine Prüfung aller sonstigen freiwilligen
Geräte-/Adapter-URLs ist dadurch nicht ersetzt.

Die Adapterdeklaration enthält keine optionalen Controller-Plugins. Insbesondere
wird das zuvor deklarierte Sentry-Plugin nicht mehr geladen; eine CI-bedingte
Deaktivierung wäre dafür kein belastbarer Nachweis. Die Release-Normalisierung
entfernt versehentlich wieder eingeführte Plugin-Deklarationen, und ein Test prüft
das tatsächlich ausgelieferte Manifest.

Der vorhandene lokale Lizenzdienst bleibt die zentrale Stelle:

| Zugriff | Vertrag |
|---|---|
| Anmeldung | `POST /oauth/token`, Formulardaten `grant_type=password`, `client_id=ioBroker`, Benutzername und Passwort |
| Sitzung | Bearer-Token oder `access_token`-Cookie; Cookie `Secure`, `HttpOnly`, `SameSite=Strict` |
| Lizenzverwaltung | `GET /nexowatt/license`, Administratoranmeldung erforderlich |
| Status | `GET /nexowatt/license/status` |
| Aktivierung | `POST /nexowatt/license/activate`, JSON mit genau `token` |
| Entfernen | `POST /nexowatt/license/remove`, leeres JSON-Objekt |
| Schreibschutz | Direkter, passender HTTPS-Origin und `X-Eos-License: 1` |
| Adapterabfrage | `sendTo('eos-admin.0', 'eos.license.check', …)` nach vorhandenen Client-Verträgen |

Management, Passwortpflege und Lizenzwiederherstellung bleiben ohne gültige
Produktlizenz erreichbar. Andere Adapter erhalten begrenzte Freigabeinformationen,
keinen privaten Signierschlüssel. Die bestehende AES-GCM-Lizenzspeicherung schützt
Daten auf Datenträgern im dokumentierten Bedrohungsmodell; ein Angreifer mit
derselben laufenden Dienstidentität oder root ist dadurch nicht ausgeschlossen.

## Bedrohungsanalyse und Nachweise

| Kennung / STRIDE | Gefahr | Änderung / Testbezug |
|---|---|---|
| EOS-INT-ADMIN-01 / S,I | Klartextzugang oder manipulierte TLS-Dateien | Feste root-geprüfte Pfade, TLS1.3, Zertifikats-/Schlüsselprüfung, echte TLS-Negativtests |
| EOS-INT-ADMIN-02 / T,E | Administrator installiert ungeprüften Code über Socket/Upload | Vollständige Dispatch-Prüfung vor Upstream-Handlern, reale Socket-Klassen mit DB-Fixture getestet |
| EOS-INT-ADMIN-03 / S,E | Widerrufene Sitzung nutzt eigene Passwortänderung | Sitzungsprüfung vor jedem Dispatch, vorhandene Widerrufsprüfung, stärkere KDF und injektionsfreie Passwort-API |
| EOS-INT-ADMIN-04 / T | Lizenzvertrauen wird auf fremde Schlüssel umgeleitet | Fester root-eigener Trustpfad ohne Umgebungsvariablen-Override |
| EOS-INT-ADMIN-05 / D | Teure Passwortaufträge blockieren Dienst | Eingabebegrenzung, zwei gleichzeitige Aufträge; Lastmessung auf Zielhardware offen |
| EOS-INT-ADMIN-06 / T,E | Veraltete Authentifizierungsbibliothek gelangt über indirekte Abhängigkeit zurück | Exaktes gepflegtes OAuth-Override, Laufzeitprüfung, echte HTTPS-Login-/Refresh-/Widerrufstests |
| EOS-INT-ADMIN-07 / R | Prüfaussagen ohne Zuordnung zum gelieferten Build | Vollständiger TypeScript-Backendbuild, Build-/Dateihashes und Rohbelege im Komponentenbericht |
| EOS-INT-ADMIN-08 / I | Optionales Telemetrie-Plugin überträgt Laufzeitdaten | Keine Plugin-Deklaration im Adaptermanifest, Release-Normalisierung und Manifesttest unabhängig von CI |

Prüfstatus, Befehle, Abhängigkeitsänderungen, verbleibende Scannerbefunde und
konkrete Dateihashes stehen unter
`components/admin/reports/security/integrated/verification.json` und `raw/`.
Die SBOM des tatsächlichen Gesamtprodukts wird separat aus dem installierten
Lieferbaum erzeugt; die Adapter-Quelllockdatei ist kein Inventar eines Geräts.

Die Tests dieses Komponentenberichts verwenden Linux x64, Node24.19.0 und
TypeScript5.9.3. Sockettests mit Datenbank-Fixture, reale HTTPS-Tests und die
vollständige Controllerintegration sind unterschiedliche Nachweise. Ein hier
bestandener Komponententest ersetzt keine echte Debian12-/RPi-/Tailscale-Abnahme.
Zertifikatsrotation, Backup/Wiederherstellung, Hardware, Browserbedienung und
physische Regelungs-Failsafes benötigen die Nachweise des Gesamtsystems.

Als Entwicklungsmaßstab dienen die EOS-Programmierrichtlinie, STRIDE und die
projektweit dokumentierte Zuordnung zu CRA/IEC62443/OWASP ASVS. Aus den oben
genannten Änderungen wird keine vollständige regulatorische Konformität abgeleitet.

Offizielle Migrationsquelle zur geänderten OAuth-Abhängigkeit:
https://node-oauth.github.io/node-oauth2-server/guide/migrating-to-v5.html
(entfallene Callbacks und Scope-Arrays); der tatsächlich verwendete
`@iobroker/webserver@1.4.0`-Modellpfad wurde mit Login und Refresh nachgeprüft.
