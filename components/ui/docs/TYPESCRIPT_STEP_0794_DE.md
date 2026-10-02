# 0.7.94 - SmartHome-Konfiguration gezielt typisieren

Diese Version typisiert den Runtime-Spiegel `src-ts/runtime-mirrors/www/smarthome-config.ts`.

## Zweck

Die SmartHome-Konfiguration ist die Installer-Seite für:

- Gebäude / Etagen
- Räume
- Geräte
- Funktionen
- Szenen
- Seiten
- Timer
- Logikuhren
- Auto-Erkennung / Type-Detector
- Datenpunkt-Zuordnungen

Die produktive Browser-Runtime bleibt weiterhin `www/smarthome-config.js`.

## Wichtige Regel

IDs von Räumen, Geräten, Funktionen und Seiten sind gespeicherte Vertragswerte. Sie dürfen nicht automatisch geändert werden, weil Timer, Szenen und die Kundenansicht diese IDs referenzieren.

## Neuer Check

```bash
npm run test:smarthome-config-runtime-typing
```

Der Check extrahiert den neuen Vertragsbereich aus dem TS-Spiegel und kompiliert ihn ohne `@ts-nocheck`.

## Keine Runtime-Änderung

Diese Version ändert keine produktive SmartHome-Konfigurationslogik. Sie bereitet nur die spätere TypeScript-Migration strukturiert vor.
