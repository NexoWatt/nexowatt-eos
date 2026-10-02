# 0.7.58 – TypeScript Build- und Testbasis

Diese Version ist der erste Schritt nach dem TypeScript-Scaffold aus 0.7.56/0.7.57.
Sie enthält keine Funktionsänderungen am Adapter.

## Ziel

- TypeScript bleibt zunächst parallel zur JavaScript-Laufzeit.
- `publish:check` bleibt ohne TypeScript lauffähig.
- GitHub/CI und Entwickler können TypeScript separat prüfen.
- Erste Regression-Cases werden dokumentiert, aber noch nicht produktiv ausgeführt.

## Neue Skripte

```bash
npm run ts:doctor      # prüft, ob TypeScript lokal installiert ist
npm run typecheck      # führt tsc über src-ts/ und tests/types/ aus
npm run test:contracts # prüft, ob zentrale TS-Verträge vorhanden sind
npm run test:all       # publish:check + contract check + typecheck
npm run ci:check       # kompletter CI-Check inkl. npm pack dry-run
```

## Wichtig für Windows

Wenn `tsc` nicht gefunden wird, zuerst ausführen:

```powershell
npm install
npm run typecheck
```

`publish:check` benötigt weiterhin kein `tsc`.

## Keine Laufzeitänderung

Diese Version verändert nicht:

- Energiefluss
- Speicher-DP-Resolver
- Heizstab-Regelung
- KI-Berater
- History
- SmartHome
- Lizenzlogik
- ioBroker-Verbindungslogik

## Nächster Schritt

0.7.59 sollte eine kleine, risikoarme Utility-/Script-Datei nach TypeScript migrieren,
ohne kritische EMS-Logik anzufassen.
