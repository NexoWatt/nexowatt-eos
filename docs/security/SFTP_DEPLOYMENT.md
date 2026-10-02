# SFTP-Deployment: verifizierter Server-Hostkey

`tasks.js` akzeptiert ein SFTP-Deployment nur mit einem zuvor unabhängig
verifizierten SSH-Serverfingerprint. Dies behebt die fehlende Gegenstellenprüfung
des Befunds **NW-EOS-260930-08** im geprüften Ausgangscommit
`18195cd94f1b0972d093128ab4572742515f7799`.

## Erforderliche Umgebung

| Variable | Bedeutung |
| --- | --- |
| `SFTP_HOST` | Erwarteter Servername oder dessen IP-Adresse, ohne Leer-/Steuerzeichen |
| `SFTP_PORT` | Dezimale Portnummer von 1 bis 65535 |
| `SFTP_USER` | Dediziertes Deploymentkonto |
| `SFTP_PASS` | Passwort aus geschützter Deploymentkonfiguration |
| `SFTP_HOST_KEY_SHA256` | Verifizierter OpenSSH-Fingerprint: `SHA256:` gefolgt von genau 43 Base64-Zeichen, ohne `=`-Padding, Leerzeichen oder Zeilenumbruch |

Der Fingerprint ist kein privater Schlüssel, muss aber gegen unberechtigte Änderung
geschützt werden. Weder Passwort noch private Schlüssel in das Repository,
Protokolle oder diese Dokumentation eintragen. Die CI muss die neue Variable an
den Deploy-Schritt übergeben. Ohne diese Einrichtung bricht ein bisheriger
Deployment-Workflow jetzt absichtlich ab.

`node tasks --create` erzeugt weiterhin lokal die vier Distributionsskripte und
benötigt weder Deploymentvariablen noch `ssh2`. `node tasks --deploy` sowie
`npm run deploy` prüfen die Konfiguration vor dem ersten SFTP-Verbindungsaufbau.
Auch `FAST_TEST=true` umgeht die Gegenstellenprüfung nicht; dieser Modus verbindet
sich weiterhin mit dem konfigurierten Server und simuliert nur das Hochladen.

## Fingerprint bereitstellen

Den Fingerprint über eine bereits vertrauenswürdig authentifizierte
Serververwaltung oder vom zuständigen Serverbetreiber erhalten. Auf dem Server
kann das Administrationspersonal den SHA-256-Fingerprint des **öffentlichen**
Hostkeys mit OpenSSH ermitteln, beispielsweise für dessen Ed25519-Hostkey:

```sh
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub -E sha256
```

Nur das Feld beginnend mit `SHA256:` in `SFTP_HOST_KEY_SHA256` übernehmen, nicht die
komplette Ausgabe. Der ausgewählte Schlüssel muss dem beim SSH-Handshake tatsächlich
verwendeten Server-Hostkey entsprechen. Eine nicht authentifizierte
`ssh-keyscan`-Antwort ist allein kein vertrauenswürdiger Herkunftsnachweis.
Bei mehreren Server-Hostkeys darf ein Verhandlungsunterschied nicht durch
Abschalten der Prüfung behoben werden; den tatsächlich vorgesehenen Schlüssel und
die Serverkonfiguration kontrolliert abstimmen.

## Verhalten bei Abweichung und Rotation

Fehlendes, ungültiges oder nicht kanonisches Fingerprintformat verhindert den
Verbindungsaufbau. `ssh2` liefert dem `hostVerifier` ohne `hostHash` den rohen
Hostkey als Buffer. Der Code bildet dessen SHA-256 und vergleicht die 32 Bytes
mit `timingSafeEqual`. Ein abweichender Hostkey wird während des Handshakes vor
Benutzerauthentisierung zurückgewiesen. Verbindungsfehler werden ohne fremden
Fehlertext, Credentials oder Fingerprintwerte ausgegeben.

Bei geplantem Schlüsselwechsel Deployment kurz pausieren, neuen Fingerprint über
den vertrauenswürdigen Administrationsweg prüfen und die geschützte Variable
koordiniert aktualisieren. Danach muss der neue Schlüssel akzeptiert und der alte
abgewiesen werden. Es gibt bewusst keine automatische Übernahme, keinen
Trust-on-first-use-Modus und keinen Rückfall auf ungeprüfte Verbindungen. Ein
Rollback erfolgt nur auf eine separat verifizierte Konfiguration.

Das Deploymentkonto auf die benötigten Zielpfade begrenzen. Hostkey-Pinning
ersetzt weder Dateiintegritäts-/Signaturprüfungen noch sichere Freigaben oder
atomare Veröffentlichung. Es verändert keine EOS-Gerätekommunikation.

## Prüfung und Grenzen

```sh
node --test tests/security/sftp.test.cjs
```

Die Tests führen den echten `tasks.js`-Einstieg mit gemocktem Dateisystem und
SSH-Client aus. Geprüft werden korrekter/falscher Schlüssel, geänderter Hostkey,
fehlender/ungültiger Fingerprint, Konfigurationsfehler, bereinigte Fehlermeldungen
und `--create` ohne Geheimnisse. Der Mock modelliert die dokumentierte
Handshake-Reihenfolge; dies ist kein tatsächlicher SSH-Handshake oder
Netzwerk-Penetrationstest. Es werden keine echten Zugangsdaten und kein Netzwerk
verwendet.

Vor Deploymentfreigabe ist zusätzlich ein kontrollierter Integrationstest mit der
tatsächlich eingesetzten `ssh2`-Version und einem Test-SFTP-Server erforderlich:
korrekter Pin, falscher Pin, gewechselter Hostkey, falsche Anmeldedaten und
Übertragungsabbruch. Produktivzugänge wurden im Rahmen dieser Änderung weder
gelesen noch verwendet. CRA-/IEC-Konformität wird daraus nicht abgeleitet.

API-Grundlage (geprüft am 30.09.2026):
[ssh2 Client methods – hostVerifier](https://github.com/mscdex/ssh2#client-methods).
