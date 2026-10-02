# 0.7.58 - TypeScript Build- und Testbasis

Diese Version ist der erste operative Schritt nach dem TypeScript-Scaffold aus 0.7.56/0.7.57.

## Ziel

Die TypeScript-Prüfung wird in klare Bereiche getrennt:

- `contracts`: reine Typverträge
- `backend`: spätere Migration von `main.js` und `ems/modules/*`
- `frontend`: spätere Migration von `www/*.js`
- `shared`: nebenwirkungsfreie Helfer, die später Backend und Frontend teilen können

## Wichtig

Diese Version ändert keine produktive Adapterlogik.

Nicht verändert wurden:

- Energiefluss
- Speicher-DP-Resolver
- Heizstab-Regelung
- KI-Berater-Logik
- History-Berechnung
- SmartHome-Verhalten
- Lizenzlogik
- ioBroker-Verbindungslogik

## Neue npm-Skripte

```bash
npm run typecheck:contracts
npm run typecheck:backend
npm run typecheck:frontend
npm run typecheck
npm run build:types
npm run release:check
```

## Warum diese Trennung wichtig ist

Bei späteren Änderungen können wir gezielt prüfen, ob ein Fehler in den Verträgen,
im Backend-Kontext oder im Frontend-Kontext liegt. Das reduziert das Risiko, dass
kritische Logik wie Speicherfluss, Historie oder Heizstab versehentlich verändert wird.

## Nächster Schritt

0.7.59 sollte kleine, risikoarme Utilities/Skripte nach TypeScript migrieren. Kritische
EMS-Logik bleibt weiterhin unverändert, bis Tests und Verträge ausreichend stabil sind.


## Build-Ausgabe-Regel

`npm run build:ts` erzeugt ausschließlich TypeScript-Declaration-Dateien unter:

```text
build-ts/types
```

Diese Dateien sind Build-Artefakte und dürfen nicht von Hand bearbeitet werden.
Produktive Adapterlogik bleibt weiterhin in den vorhandenen JavaScript-Dateien.
