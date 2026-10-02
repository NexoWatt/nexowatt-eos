# 0.7.98 – erste echte main.js-TypeScript-Helfer produktiv mit Fallback nutzen

Diese Version beginnt mit der vorsichtigen Auslagerung kleiner, risikoarmer Teile aus `main.js` in echte TypeScript-Helfer.

## Was ist neu?

Neue TypeScript-Quelle:

```text
src-ts/backend/main-runtime/main-runtime-helpers.ts
```

Generierter CommonJS-Spiegel für die Runtime:

```text
lib/ts-mirrors/backend/main-runtime/main-runtime-helpers.js
```

Dieser Spiegel wird von `main.js` geladen. Falls er fehlt oder fehlerhaft ist, nutzt `main.js` weiterhin die alte JavaScript-Fallbacklogik.

## Welche Code-Teile wurden ausgelagert?

In 0.7.98 wurden nur kleine, isolierte Helfer angebunden:

```text
Lizenz-Platzhalter erkennen
Lizenz-Eingabe für Speicherung normalisieren
info.connection-Schreibplan erstellen
einfache /api/set-Wertnormalisierung vorbereiten
```

## Warum genau diese Teile?

Diese Funktionen sind fachlich wichtig, aber klein genug für den ersten kontrollierten Runtime-Einsatz:

- Sie ändern keine EMS-Regelung.
- Sie verändern keinen Energiefluss.
- Sie verändern keine Heizstabentscheidung.
- Sie schreiben keine History-Werte.
- Sie haben klare Eingaben und Ausgaben.

Damit sind sie geeignet, um den ersten produktiven TS-Helfer mit Fallback einzusetzen.

## Sicherheitsregel

`main.js` nutzt den TS-Helfer nur so:

```text
TS-Helfer vorhanden und fehlerfrei → TS-Helfer nutzen
TS-Helfer fehlt/fehlerhaft        → alte JS-Fallbacklogik nutzen
```

Dadurch bleibt der Adapter lauffähig, selbst wenn der Mirror in einer Testumgebung fehlen sollte.

## Kritische Regeln

- Maskierte Lizenzwerte wie `********`, `protected`, `encrypted` dürfen niemals gespeichert werden.
- Echte `NW1`/`NW1T`-Lizenzwerte dürfen nicht als Maske behandelt werden.
- `info.connection` bleibt ein bestätigter `ack=true`-State.
- `0` und `false` bleiben bei Wertnormalisierung gültige Werte.

## Pflege-Regel

Wenn diese Helfer geändert werden:

```bash
npm run sync:ts-backend-mirrors
npm run test:main-runtime-helpers
npm run publish:check
```

## Nächster Schritt

Nach diesem ersten kleinen produktiven TS-Helfer kann als nächstes ein weiterer isolierter `main.js`-Bereich folgen, z. B. `/api/state`-Antwortaufbau oder `/api/set`-Settings-Schreibplan – weiterhin mit Fallback und ohne große Runtime-Umschaltung.
