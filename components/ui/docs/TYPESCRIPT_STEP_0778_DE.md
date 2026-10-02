# 0.7.78 – Shadow-Diagnose im App-Center sichtbar machen

Diese Version zeigt die bereits vorhandenen TypeScript-Shadow-Vergleiche im App-Center unter **Status & Diagnose** lesbar an.

## Zweck

Installer sollen nicht mehr rohe JSON-States prüfen müssen. Die Oberfläche zeigt jetzt:

- Core-Limits / EMS-Budget: JS-Werte gegen TS-Spiegel
- Heizstab-Entscheidung: Zielstufe/Zielleistung gegen TS-Spiegel
- Energiefluss: Speicher/Netz/PV/Gebäude gegen TS-Spiegel

## Wichtig

Die Anzeige ist reine Diagnose. Es wird keine produktive Regelung umgestellt. Die JavaScript-Runtime bleibt weiterhin autoritativ.

## Nächster Schritt

Wenn diese Diagnose auf realen Anlagen sauber aussieht, kann 0.7.79 die Energiefluss-Shadow-Diagnose weiter auswertbar machen oder erste kontrollierte Umschaltung vorbereiten.
