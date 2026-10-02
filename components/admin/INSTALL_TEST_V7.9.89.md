# Installation und Abnahme – NexoWatt EOS Admin 7.9.89

## Installation aus npm

```bash
cd /opt/iobroker
iobroker backup
iobroker stop eos-admin.0
npm install --no-save --omit=dev iobroker.eos-admin@7.9.89
iobroker upload eos-admin
iobroker restart eos-admin.0
```

## Portbelegung

```bash
iobroker set admin.0 --port 18081 --ip 127.0.0.1 --enabled false
iobroker set eos-admin.0 --port 8081 --ip 0.0.0.0 --enabled true
iobroker restart eos-admin.0
```

Aufruf:

```text
http://SYSTEM-IP:8081
```

## Pflichtabnahme

### Admin / Service

- Anmeldung mit dem fest eingerichteten Passwort.
- Kein erzwungener Erstkennwortdialog.
- Expertenmodus verfügbar.
- Interner Admin und System-Notfallsicherung sichtbar.
- Vollständige Zugangs- und Rechteverwaltung.

### Installateur

- Erste Aktivierung: Ebene **Installateur**, Benutzer `installer`, Passwort leer, danach persönliches Passwort setzen.
- Kein Expertenmodus.
- Inbetriebnahme, Module, Dienste, Datenpunkte und Diagnose erreichbar.
- **Zugänge & Rechte** erreichbar; nur Endkunden-Reset möglich.
- Interner Admin und interne BackItUp-Notfallreserve nicht sichtbar.
- NexoWatt Sicherung nutzbar, sofern installiert und freigegeben.

### Gast / Endkunde

- Erste Aktivierung: Ebene **Gast / Endkunde**, Benutzer `guest`, Passwort leer, danach persönliches Passwort setzen.
- Kein Expertenmodus.
- Freigegebenes Smart Home, Räume, Funktionen und Bedienoberflächen erreichbar.
- Keine technischen System-, Repository-, Zertifikats- oder Rohdiagnosebereiche.
- Interner Admin und interne BackItUp-Notfallreserve nicht sichtbar.
- NexoWatt Sicherung nutzbar, sofern freigegeben.

### Bedienoberfläche

- EOS Assist sitzt im Kopfbereich und überlappt keine Inhalte.
- Zugangsverwaltung erscheint nur unter **Zugänge & Rechte**.
- Startseite ist **Übersicht**, nicht Easy.
- Keine `permissionError`-Leerseite.
- Dialoge, Popups und Schließen-Schaltflächen funktionieren.
- Schreibbare Datenpunkte sind entsprechend Rolle bedienbar.

## Rückfall auf 7.9.86

```bash
cd /opt/iobroker
iobroker stop eos-admin.0
npm install --no-save --omit=dev iobroker.eos-admin@7.9.86
iobroker upload eos-admin
iobroker restart eos-admin.0
```
