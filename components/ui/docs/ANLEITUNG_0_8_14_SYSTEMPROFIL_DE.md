# Anleitung – NexoWatt UI 0.8.14 System- und Länderprofil

## Ziel

Diese Version legt das Fundament für Home/EOS-Trennung, Niederlande-Einsatz und automatische Sprachübernahme aus ioBroker.

## Was bleibt für Home gleich?

Die Home-/HEMS-Basis bleibt funktional unverändert. Bestehende Nutzerseiten bleiben weiterhin:

- LIVE
- History
- EVCS/Wallbox-Anzeige, falls konfiguriert
- SmartHome, falls aktiviert
- Speicher/Heizstab/Wärmepumpe, falls installiert

Neue komplexe EOS-Funktionen werden nicht automatisch im Home-Frontend sichtbar.

## Wo wird das Länderprofil eingestellt?

1. ioBroker Admin öffnen.
2. NexoWatt UI Adapter öffnen.
3. EMS App-Center / Installerbereich öffnen.
4. Reiter `Apps` öffnen.
5. Karte `System & Marktprofil` nutzen.
6. Länderprofil wählen:
   - `Deutschland`
   - `Niederlande`
7. Speichern mit `Speichern & EMS neu starten`.

## Wie wird die Sprache übernommen?

Die UI übernimmt die ioBroker-Systemsprache aus:

```text
system.config.common.language
```

Der Adapter veröffentlicht zusätzlich interne States:

```text
nexowatt-ui.0.system.language
nexowatt-ui.0.system.languageSource
```

Die Sprache ist bewusst keine Kundeneinstellung im Frontend. Sie wird systemgeführt, damit alle Nutzerseiten konsistent zur ioBroker-Installation bleiben.

## Welche States sind neu?

```text
nexowatt-ui.0.system.language
nexowatt-ui.0.system.languageSource
nexowatt-ui.0.countryProfile.country
nexowatt-ui.0.countryProfile.label
nexowatt-ui.0.countryProfile.currency
nexowatt-ui.0.countryProfile.gridImportLabel
nexowatt-ui.0.countryProfile.gridExportLabel
nexowatt-ui.0.countryProfile.selfConsumptionLabel
nexowatt-ui.0.countryProfile.supportsP1Dsmr
nexowatt-ui.0.countryProfile.supportsSalderingExit
nexowatt-ui.0.countryProfile.supportsEnergyHub
nexowatt-ui.0.countryProfile.supportsParagraph14a
nexowatt-ui.0.countryProfile.profileJson
```

## Wichtig für Entwickler

Fachliche Änderungen erfolgen weiterhin ausschließlich in:

```text
src-ts/runtime-executables/**
```

Danach ausführen:

```bash
npm run sync:ts-runtime-executables
npm run check:ts-runtime-executables
```

Runtime-JS-Dateien unter `main.js`, `ems/**` und `www/**` sind generierte Artefakte und werden nicht manuell bearbeitet.
