# 0.7.93 - SmartHome Runtime-Spiegel gezielt typisiert

## Ziel

Diese Version typisiert den TypeScript-Parallelspiegel der SmartHome-Kundenansicht:

```text
src-ts/runtime-mirrors/www/smarthome.ts
```

Die produktive Runtime bleibt weiterhin:

```text
www/smarthome.js
```

## Neue Verträge

Ergänzt wurden SmartHome-Verträge für:

- Geräte
- Zustände
- Datenpunktbindungen
- UI-Metadaten
- Räume
- Etagen
- Gebäudestruktur
- Filter
- Gruppen
- Kacheln
- Popover-Kontext
- API-Antworten
- Schreibbefehle

## Wichtig

Diese Version ändert keine produktive SmartHome-Logik. Sie bereitet nur die spätere TS-Migration vor und schützt die Datei vor blindem Mirror-Überschreiben.

## Prüfung

Neu:

```bash
npm run test:smarthome-runtime-typing
```

Der Check extrahiert den Vertragsbereich und kompiliert ihn ohne `@ts-nocheck`.
