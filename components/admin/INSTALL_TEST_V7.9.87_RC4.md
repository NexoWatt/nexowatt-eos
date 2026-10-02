# NexoWatt EOS Admin 7.9.87-rc.4 – Installation und Abnahme

## Installation des Testpakets

Vor der Installation ein vollständiges Systembackup erstellen.

```bash
cd /opt/iobroker

iobroker backup
iobroker stop eos-admin.0
npm install --no-save --omit=dev /PFAD/iobroker.eos-admin-7.9.87-rc.4.tgz
iobroker upload eos-admin
iobroker restart eos-admin.0
```

Version prüfen:

```bash
node -p "require('/opt/iobroker/node_modules/iobroker.eos-admin/package.json').version"
```

Erwartet:

```text
7.9.87-rc.4
```

## Erstanmeldung

- Admin/NexoWatt Service meldet sich unverändert mit dem festgelegten Administratorkennwort an. Für diesen Zugang gibt es weder eine passwortlose Aktivierung noch einen erzwungenen Passwortwechsel.
- Auf der Anmeldeseite steht für die vorbereiteten Konten `installer` und `guest` die Aktion **„Erstanmeldung ohne Passwort“** bereit.
- Diese Aktion ist standardmäßig nur aus einem lokalen/privaten Netzwerk möglich und erzeugt keine normale EOS-Sitzung. Sie stellt lediglich einen kurzlebigen, einmaligen HttpOnly-Aktivierungsnachweis aus.
- Danach muss sofort ein persönliches Kennwort zweimal eingegeben werden. Erst anschließend erfolgt die normale Anmeldung mit Benutzername und neuem Kennwort.
- Admin/Service kann Installateur- und Endkunden-Zugänge über **Zugänge & Rollen** zurücksetzen. Der Installateur kann ausschließlich Endkunden-Zugänge zurücksetzen.
- Ein Reset macht das bisherige Kennwort ungültig und öffnet für die nächste Anmeldung erneut genau diesen einmaligen passwortlosen Aktivierungsweg.

## Rollenprüfung

### Admin / NexoWatt Service

- alle Bereiche sichtbar
- Expertenmodus verfügbar
- Benutzer, Gruppen, Sicherheit, Zertifikate, Zugangsdaten und Repositoryverwaltung verfügbar

### Installateur

- Inbetriebnahme, Adapter, Instanzen, Logs, Datenpunkte und sichere Basis-Einstellungen verfügbar
- Räume/Funktionen und Smart Home verfügbar
- Expertenmodus nicht sichtbar und nicht aktivierbar
- Benutzer, Gruppen, Zertifikate, Zugangsdaten, Repositories, Standard-ACL und globale Sicherheitsbereiche nicht verfügbar

### Endkunde

- Smart Home, Räume/Funktionen und freigegebene NexoWatt-UI-Bereiche verfügbar
- keine Adapter-, Instanz-, Log-, Objekt-, Benutzer- oder Systemverwaltung
- Expertenmodus nicht sichtbar und nicht aktivierbar

## Pflichtprüfung

- direkter Aufruf gesperrter Hash-Routen führt auf eine erlaubte Seite
- Browser-LocalStorage `App.expertMode=true` aktiviert bei Installateur/Endkunde keinen Expertenmodus
- sichere Basis-Einstellungen verändern keine Repository-, ACL- oder Expertenwerte
- beschreibbare freigegebene Datenpunkte funktionieren
- Popup-Schließen, Adapter-Suche und Instanzkonfiguration funktionieren
- Neustart von EOS Admin und kompletter Systemneustart funktionieren

## Rückkehr zu Stable 7.9.86

```bash
cd /opt/iobroker

iobroker stop eos-admin.0
npm install --no-save --omit=dev iobroker.eos-admin@7.9.86
iobroker upload eos-admin
iobroker restart eos-admin.0
```


## npm Veröffentlichung über latest

Die Version 7.9.87-rc.4 wird auf ausdrückliche Produktentscheidung über den npm-Dist-Tag `latest` verteilt. `.npmrc`, `publishConfig` und der Publish-Guard verlangen deshalb `latest`. Der Guard akzeptiert dabei ausschließlich die exakt in `nexowattReleasePolicy.acceptedPrerelease` eingetragene RC4-Version; ein späterer Versionssprung kann `latest` nicht unbeabsichtigt verschieben. Die exakte Rückfallversion 7.9.86 bleibt weiterhin mit `iobroker.eos-admin@7.9.86` installierbar.


## Standardport 8081

Neue EOS-Admin-Instanzen verwenden standardmäßig Port `8081`. Vor der Aktivierung muss der interne Legacy-Admin durch den EOS-Installer bzw. die Sicherheitsroutine auf `127.0.0.1:18081` verschoben und deaktiviert werden, damit kein Portkonflikt entsteht.


## Passwort-Reset prüfen

1. Als Admin/Service **Zugänge & Rollen** öffnen.
2. `installer` zurücksetzen. Das bisherige Passwort muss danach abgelehnt werden; auf der Anmeldeseite muss erneut **Erstanmeldung ohne Passwort** möglich sein.
3. Als Admin/Service `guest` zurücksetzen und denselben Ablauf prüfen.
4. Als Installateur **Endkunden-Zugänge** öffnen und `guest` zurücksetzen.
5. Prüfen, dass der Installateur weder sein eigenes Konto noch Admin-/Service- oder andere Installateurkonten zurücksetzen kann.

Der Reset gibt kein temporäres Passwort aus. Er ersetzt das bisherige Passwort durch ein unbekanntes Zufallsgeheimnis und öffnet nur die einmalige Aktivierung erneut.
