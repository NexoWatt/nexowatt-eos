# RC70 Validierungsbericht

## Release

- Paket: `iobroker.nexowatt-ui`
- Version: `0.8.195`
- Bezeichnung: RC70 – Dashboard-Ladepunktstatus: Einzel-LP und Moduswahrheit
- Datum: 2026-08-21

## Behobene Fehler

1. Bei genau einem aktiven Ladepunkt war im LIVE-Systemstatus der Link **Details** anklickbar, obwohl die separate EVCS-Kundenseite erst ab zwei aktiven Ladepunkten vorgesehen ist.
2. Der Systemstatus verwendete vorrangig `effectiveMode`. Dadurch konnte ein vom Benutzer ausgewählter Modus **Auto** als **PV** erscheinen, wenn die Auto-Regelung intern aktuell die PV-Unterstrategie verwendete.

## Korrektur

- Der Details-Link ist initial verborgen und wird erst bei mindestens zwei tatsächlich aktiven Ladepunkten freigegeben.
- Bei weniger als zwei aktiven Ladepunkten werden `href`, Tastaturfokus und Screenreader-Freigabe entfernt.
- Die Modusanzeige verwendet vorrangig `userMode`. `effectiveMode` bleibt der technische Auto-Untermodus und wird ausschließlich zur Begründung der aktuellen Regelentscheidung genutzt.
- Regelgrund, Limiter, Safety-, Tarif-, PV- und Zeit-Ziel-Status bleiben getrennt und unverändert sichtbar.
- Keine Lade-, Speicher-, §14a-, Tarif-, Betriebsstrategien-, Safety- oder Hardware-Writer-Logik wurde verändert.

## Ausgeführte Prüfungen

### Vollständiges Release-Gate

- Geordnete Prüfungen: **241**
- Bestanden: **241**
- Fehlgeschlagen: **0**

Das Gate wurde wegen der maximalen Laufzeit eines einzelnen Tool-Aufrufs in zwei deterministischen Bereichen ausgeführt:

- Schritte 1–120: bestanden
- Schritte 121–241: bestanden

Es umfasste unter anderem Typecheck, Speicher und Speicherfarm, Lade- und Stationsmanagement, Alfen/Modbus, OCPP21, §14a, Tariflogik, Betriebsstrategien, Safety-Envelope, Lizenz-Bootstrap, Runtime-Synchronität und Cross-App-Identifier-Audit.

### Neue und direkt relevante Regressionen

- Ein aktiver Ladepunkt: Status sichtbar, Details-Link verborgen, kein `href`, kein Tastaturfokus.
- Zwei aktive Ladepunkte: Details-Link sichtbar und Ziel `evcs.html` vorhanden.
- Benutzerwahl `Auto` bei internem `effectiveMode=pv`: Anzeige bleibt **Auto**.
- Echter PV-Modus: Anzeige bleibt **PV**.
- Safety-, §14a-Fallback-, Lade-, PV-, Tarif- und Inaktivstatus bleiben korrekt.
- Chromium-Browsertest bestanden.
- Strikter Typecheck des Dashboard-Statusmoduls bestanden.

### Quell- und Runtime-Synchronität

- Produktive Runtimequellen: **112**
- Runtime-TS-/TSX-Spiegel: **472**
- Runtime-Executable-Synchronität: bestanden
- Runtime-Mirror-Synchronität: bestanden
- Paket-Runtime-Startprüfung: **164 JS/MJS-Dateien**, alle relativen `require()`-Pfade vollständig und Startkette konstruierbar

### Prüfung aus frisch entpackter finaler ZIP

Aus der finalen ZIP wurden ohne vorhandenes `node_modules` erneut erfolgreich ausgeführt:

- `npm run publish:check`
- `node scripts/verify-publish.js`
- `npm run test:dashboard-lp-status-typing`
- `npm run test:rc69-dashboard-lp-feedback`
- `npm run test:rc70-dashboard-lp-status-polish`
- `npm run test:runtime-executables`
- `npm run test:runtime-mirrors`
- `npm run test:package-runtime-start-smoke`
- `npm pack --dry-run --json`

### npm-Paket

- Release-Manifest: **274 geprüfte Produktdateien**
- npm-Paketinhalt: **275 Dateien**
- npm-Paketgröße: **7.538.657 Byte**
- Ungepackte Größe: **16.867.864 Byte**
- `npm pack --dry-run`: bestanden

## Freigabeumfang

RC70 ist ein rein lesendes UI-Stabilitätsrelease. Die Änderung beeinflusst keine Gerätebefehle und keine physikalische Regelung. Für den Feldtest sind insbesondere ein System mit genau einem aktiven Ladepunkt und ein System mit mindestens zwei aktiven Ladepunkten zu prüfen.
