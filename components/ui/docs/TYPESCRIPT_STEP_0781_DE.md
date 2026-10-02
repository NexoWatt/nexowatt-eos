# TypeScript-Migrationsschritt 0.7.81 – Energiefluss-Schaltmodus im App-Center

## Ziel

Der Energiefluss-TypeScript-Modus ist im App-Center sichtbar und speicherbar.

## Sicherheitsregel

Die produktive Energiefluss-Quelle bleibt JavaScript, solange nicht alle Bedingungen erfüllt sind:

- Modus `ts` ist gewählt.
- `energyFlowProductionAllowed` ist aktiv.
- Der Shadow-Vergleich meldet keine Blocker.

## Geänderte Bereiche

- `www/ems-apps.html` zeigt Modus, Freigabe und Status.
- `www/ems-apps.js` sammelt und speichert `tsMigration`.
- `main.js` gibt `tsMigration` über `/api/installer/config` zurück und erlaubt das Speichern.

## Nicht geändert

Energiefluss, Speicher-DP-Runtime, Core-Limits, Heizstab, KI, History und SmartHome wurden nicht fachlich geändert.
