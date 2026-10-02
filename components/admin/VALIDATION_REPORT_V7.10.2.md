# Validierungsbericht – NexoWatt EOS Admin 7.10.2

## Status

**Reparierter Repository-Stand für direkten npm-Publish ohne vorheriges `npm install` oder `npm ci`.**

## Behobene Fehler

### Laufzeit

- Die Stable-Updateverwaltung schreibt keinen Laufzeitstatus mehr in die Native-Konfiguration der laufenden `eos-admin.0`-Instanz.
- Der erste Stable-Abgleich startet verzögert.
- Update-Timer werden beim Schließen des Webservers beendet.
- Die lokale Backend-Modulkette enthält `build/lib/eosRequestSecurity.js` vollständig.

### npm-Veröffentlichung

Der vorherige Lifecycle führte in `prepublishOnly` und `prepack` automatisch `npm run build:backend` aus. Dadurch wurden `tsc` und `tsx` benötigt. In einer frisch entpackten Repository-ZIP ohne `node_modules` brach `npm publish` deshalb bereits vor dem Upload mit „`tsc` konnte nicht gefunden werden“ ab.

Der reparierte Lifecycle (einschließlich des Windows-Publish-Fixes):

- startet in `prepublishOnly` und `prepack` weder `tsc` noch `tsx`;
- startet während `prepublishOnly` keinen verschachtelten `npm pack`-Prozess mehr; dadurch entfällt der Windows-Abbruch beim Start von `npm.cmd`;
- benötigt kein `npm install`, `npm ci` oder `npx`;
- verwendet ausschließlich mitgelieferte Node.js-Prüfskripte;
- prüft ein SHA-256-Manifest mit 1.386 versiegelten Quell-, Frontend-, Tool- und Backenddateien;
- verfolgt die vollständige lokale Backend-Abhängigkeitskette ab `build/main.js`;
- prüft die JavaScript-Syntax aller 14 lokalen Backend-Runtime-Dateien;
- kontrolliert ohne verschachtelten npm-Prozess, dass sämtliche Runtime-Dateien durch die explizite `package.json`-Dateiliste abgedeckt sind; der endgültige Paketinhalt wird anschließend mit einem separaten `npm publish --dry-run` geprüft.

Die Entwickler-Buildbefehle bleiben für spätere Quellcodeänderungen erhalten. `npm run build` kompiliert dann Frontend und Backend, bereinigt alte Runtime-Dateien und erneuert anschließend automatisch das versiegelte Manifest. Der bereitgestellte Release-Stand ist bereits gebaut und darf unverändert direkt veröffentlicht werden.

## Durchgeführte Prüfungen

Die Prüfung erfolgte in einer Repository-Kopie **ohne `node_modules`**:

- `npm run check:eos-package` – erfolgreich
- `npm run check:eos-stability` – erfolgreich
- `npm publish --dry-run` – erfolgreich
- Publish-Guard für Version 7.10.2 und Dist-Tag `latest` – erfolgreich
- Backend-Runtime-Abhängigkeiten – 14 Dateien vollständig, syntaktisch gültig und im Paket enthalten
- Versiegeltes Release-Manifest – 1.386 Dateien unverändert
- Frontend-Abhängigkeitsgraph – 208 erreichbare JavaScript-Dateien
- ESM-Syntax, dynamische Imports und Entrypoint-Smoke-Test – erfolgreich
- Rollen-, Passwort-, Sicherheits-, Update-, Login-, Branding-, Datenpunkt- und EMS-Selbsttests – erfolgreich

Ergebnis des npm-Trockenlaufs:

- Paket: `iobroker.eos-admin@7.10.2`
- npm-Dateien: 997
- Paketgröße: ca. 38,3 MB
- entpackte Größe: ca. 100,5 MB
- Dist-Tag: `latest`

## Veröffentlichungsablauf

Im entpackten Repository:

```powershell
npm publish --dry-run
npm publish
```

Es ist kein vorbereitendes Installieren der Entwicklungsabhängigkeiten erforderlich.
