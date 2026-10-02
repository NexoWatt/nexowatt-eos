# 0.7.92 – History Runtime-Spiegel gezielt typisiert

Diese Version typisiert den TypeScript-Parallelspiegel `src-ts/runtime-mirrors/www/history.ts`.

## Zweck

Die produktive History läuft weiterhin über `www/history.js`. Der TS-Spiegel erhält erste Verträge für Zeitreihen, Zeiträume, Preisintervalle, Feature-Flags und DOM-Referenzen. Dadurch können wir Chart-, Report- und Zeitraumlogik später kontrolliert auf TypeScript umstellen.

## Kritische Regeln

- 0 W, 0 kWh und 0 % sind gültige Werte.
- History darf keine Ersatzwerte anders interpretieren als LIVE-Dashboard und Backend.
- EVCS-/Farm-Reihen dürfen nur sichtbar sein, wenn `/config` diese Features bestätigt.
- Historische Werte dürfen nicht durch Test-/Shadow-Logik verfälscht werden.

## Neuer Check

```bash
npm run test:history-runtime-typing
```

Der Check entfernt temporär `@ts-nocheck` und kompiliert die History-Datei in einem gelockerten Browser-Migrationsmodus. So prüfen wir Syntax und erste Verträge, ohne die komplette DOM-Migration in einem Schritt zu erzwingen.
