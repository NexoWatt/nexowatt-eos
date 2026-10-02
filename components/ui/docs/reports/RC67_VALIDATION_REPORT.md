# NexoWatt UI 0.8.192 RC67 – Validierungsbericht

## Ziel

RC67 korrigiert den Lizenz-Bootstrap eines neuen, noch nicht lizenzierten NexoWatt-EOS-Systems. Die Lizenzverwaltung ist technisch erreichbar, bleibt aber strikt auf EOS-Admin/Installer mit der Capability `license.manage` begrenzt. Alle übrigen lizenzpflichtigen EOS-Seiten und APIs bleiben bis zu einer gültigen Lizenz gesperrt.

## Umgesetzter Vertrag

- `/license.html` und `/license` passieren das allgemeine Lizenz-Gate auch ohne aktive Lizenz.
- Die tatsächliche Lizenzseite wird erst nach erfolgreicher Admin-/Installer-Rollenprüfung ausgeliefert.
- Nicht angemeldete Benutzer sehen ausschließlich eine Login-Sperrseite ohne System-UUID, Lizenzschlüssel oder vertrauliche Lizenzdetails.
- `/api/license/info` und `/api/license/save` bleiben serverseitig durch `license.manage` geschützt.
- Nur die für den Bootstrap notwendigen statischen Dateien und strikten Auth-/Lizenz-Endpunkte werden freigegeben.
- Es existiert kein pauschaler `/static/*`- oder `/api/*`-Bypass.
- Nach dem Speichern wird der Lizenzschlüssel sofort geprüft und in der laufenden Adapterinstanz übernommen.
- Die bisher falsche Anleitung zum EOS-Admin-Pfad und der unnötige Neustart-Hinweis wurden entfernt.
- LIVE, Einstellungen, AppCenter, Simulation und alle weiteren lizenzpflichtigen Bereiche bleiben ohne gültige Lizenz gesperrt.

## Versions- und Paketprüfung

- Paket: `iobroker.nexowatt-ui`
- Version: `0.8.192`
- `package.json`, `package-lock.json`, `io-package.json` und `www/manifest.webmanifest`: synchron
- `io-package.json common.news`: 7 Einträge
- Release-Artefaktmanifest: 270 freigegebene Produktdateien
- npm-Dry-Run: 271 Paketdateien
- npm-Paketgröße: 7.526.178 Byte
- ungepackte npm-Größe: 16.818.487 Byte
- npm-Shasum des Dry-Runs: `3894848ff9eefbaaeffcbea3ab9dcf8e2fc5c1e0`
- npm-Integrity des Dry-Runs: `sha512-abyAzF3MH0Z47SoQi+OiGUcIwxp54l3lbXOAqD8sGcssqqfOL4inqjRL9iHzqheiC9q93wUCMCEzI3YIXrZbqw==`

## Ausgeführte Prüfungen

### Lizenz und Authentifizierung

Bestanden:

- `test:rc67-license-bootstrap-access`
- `test:protected-license-rc45`
- `test:license-browser-lock-rc45`
- `test:appcenter-auth-modal-lock`
- `test:appcenter-auth-smarthome-security`
- Rollen-/Capability-Split für Kunde, Installer und Admin
- keine System-UUID oder Lizenzdaten vor erfolgreicher Rollenprüfung
- keine Browserpersistenz des Lizenzschlüssels
- direkter Aktivierungsweg von der allgemeinen Sperrseite
- keine pauschale API- oder Static-Freigabe

### TypeScript und Runtime

Bestanden:

- 715 TypeScript-Quelldateien syntaktisch geprüft
- vollständiger Projekt-Typecheck
- Runtime-Mirror-Typecheck
- 111 produktive Runtime-Dateien synchron
- 468 Runtime-TS-/TSX-Spiegel synchron
- Runtime-Identifier-Audit ohne ungelöste Bezeichner
- Paket-Runtime-Startprüfung mit 163 JS-/MJS-Dateien und vollständigen relativen `require()`-Pfaden

### Bestehende Regelungs- und UI-Regressionen

Bestanden:

- OCPP21 und native OCPP-Datenpunktverträge
- universeller Wallbox-Auto-Modus
- Speicherregelung und Speicherfarm
- Heizstab-Nachtsperre
- NT-/Tarif-/Zeit-Ziel-Logik
- §14a, Netz-, Stations- und Phasengrenzen
- Betriebsstrategien
- responsive Stationsseiten einschließlich Chromium-Prüfung
- SmartHome, NexoLogic, AppCenter und Mesh/Microgrid

### Vollständiges Publish-Gate

Der geordnete Releaseplan enthält 237 Schritte. Wegen der maximalen Ausführungsdauer der Umgebung wurde der finale Quellstand deterministisch in folgenden Bereichen ausgeführt:

- Schritte 1–92: bestanden
- Schritte 93–150: bestanden
- Schritte 151–200: bestanden
- Schritte 201–237: bestanden

Damit bestanden sämtliche Schritte 1 bis 237; kein Prüfschritt blieb fehlgeschlagen.

Zusätzlich bestanden:

- `publish:check`
- `verify-publish.js`
- Publish-Plan-Strukturprüfung
- `npm pack --dry-run`

## npm-Versionsfreiheit

Die direkte Registry-Abfrage für `0.8.192` konnte in der isolierten Umgebung wegen eines DNS-Fehlers (`EAI_AGAIN`) nicht abgeschlossen werden. Der vorhandene `prepublishOnly`-Guard prüft die Versionsfreiheit beim tatsächlichen `npm publish` erneut und bricht fail-closed ab, wenn die Registry nicht erreichbar oder die Version bereits belegt ist.

## Ergebnis

RC67 ist paket-, manifest- und versionssynchron. Der Lizenz-Bootstrap ist eng begrenzt und rollenpflichtig. Die übrigen EOS-Bereiche bleiben bis zur gültigen Lizenz geschlossen. Die Version ist für den direkten npm-Publish vorbereitet; die endgültige Versionsfreiheit bestätigt die npm-Registry beim Upload.
