# TypeScript-Migrationsplan ab 0.7.58

## 0.7.58 – Build- und Testbasis

TypeScript-Struktur, Typ-Smoke-Test, Declaration-Build und Scaffold-Prüfung.

## 0.7.59 – kleine Helfer/Skripte

Risikoarme Utilities und Build-/Prüfskripte nach TypeScript migrieren.

## 0.7.60 – reine Resolver-Helfer

Reine Funktionen für Watt, Prozent, signed/split DP-Auflösung und Stale-Regeln typisieren.

## 0.7.61 – Energiefluss-/Speicher-Resolver

Kritische Speicher- und Netzauflösung mit Regression-Tests nach TypeScript migrieren.

## 0.7.62 – Core-Limits und Heizstab

EMS-Budget und Heizstabregelung auf typisierte Helfer umstellen.

## 0.7.63 – main.js API-/State-Helfer

API-, StateCache-, Lizenz- und Feature-Visibility-Helfer auslagern.

## 0.7.64+ – Frontend-Helfer, KI, History, SmartHome

Schrittweise Migration der großen UI- und Zusatzbereiche.

## 0.7.59 – erster kleiner Migrationsschritt mit Kommentaren

- Bereich: Wartungs-/Publish-Skripte, nicht produktive EMS-/VIS-Logik.
- TypeScript-Quelle: `src-ts/scripts/publish-check-rules.ts`.
- JavaScript-Spiegel: `scripts/publish-check-rules.js`, damit `publish:check` ohne TypeScript-Build läuft.
- Geänderte Nutzung: `scripts/verify-publish.js` ruft die ausgelagerten Regeln auf.
- Kommentarregel: Jede neue Regel hat einen deutschen Kommentar mit Zweck, Zusammenhang und TypeScript-Hinweis.
- Risiko: niedrig, weil Energiefluss, Speicher, Heizstab, KI, History und SmartHome nicht verändert wurden.

## Ergänzung ab 0.7.62: feste TS-Ordnerstruktur

Ab 0.7.62 werden neue TypeScript-Dateien nach fachlichen Bereichen abgelegt:

```text
src-ts/contracts/      Typverträge
src-ts/utils/          kleine neutrale Helfer
src-ts/resolvers/      übergreifende Resolver
src-ts/ems/<modul>/    EMS-Module wie Core-Limits, Heizstab, Peak-Shaving
src-ts/quality/        fachliche Regressionstabellen
src-ts/tests/          Smoke-/Runtime-Tests
```

Damit entsteht keine unübersichtliche Sammlung von TS-Dateien. Jede Datei muss fachlich
an ihrem Zielbereich liegen und deutsche Kommentare direkt an den Code-Teilen enthalten.

## 0.7.63 – Backend/API-State-Helfer

Neue Backend-nahe TS-Dateien liegen unter `src-ts/backend/`, weil sie später aus `main.js`
ausgelagert werden. Die Ordner bleiben fachlich getrennt:

```text
src-ts/backend/api-state/          /api/state und Response-Hüllen
src-ts/backend/connection/         info.connection / Webserverstatus
src-ts/backend/feature-visibility/ EVCS/Farm/SmartHome/Wetter/KI Sichtbarkeit
src-ts/backend/license/            Lizenz-Schutzlogik
```


## 0.7.65 – Frontend-Anzeigehelfer

Die Dateien unter `src-ts/frontend/` sind für browsernahe, aber noch DOM-freie Helfer gedacht. Reine Anzeigeformatierung und Sichtbarkeitsvorbereitung liegen dort; produktive DOM-Logik bleibt bis zur gezielten Migration in `www/*.js`.


## 0.7.66 – Build-Output und JS-Spiegelstrategie

- Erste reproduzierbare TS→JS-Spiegelung für `scripts/publish-check-rules.js`.
- TS-Quelle bleibt `src-ts/scripts/publish-check-rules.ts`.
- Keine produktive Runtime-Logik wird geändert.


## 0.7.66 – Build-/Spiegelregel

Ab 0.7.66 duerfen kleine, risikoarme Bereiche aus TypeScript nach JavaScript gespiegelt werden. Die Quelle liegt unter `src-ts/`, die Laufzeitdatei bleibt dort, wo Node/ioBroker sie erwartet. Produktive EMS-Logik wird erst migriert, wenn der jeweilige Bereich Regressionstests besitzt.

## Ergänzung 0.7.68: Backend-CJS-Spiegel

Ab 0.7.68 gibt es neben Script- und Frontend-Spiegeln auch backendnahe CommonJS-Spiegel unter:

```text
lib/ts-mirrors/backend/
```

Diese Spiegel sind für spätere `main.js`-Auslagerungen gedacht. Sie dürfen erst produktiv genutzt werden, wenn für den jeweiligen Bereich Regressionstests vorhanden sind und der bisherige JS-Code über mindestens eine Version im Vergleichs-/Schattenmodus geprüft wurde.
## Ergänzung 0.7.76 – EMS-Spiegel

- `src-ts/ems/core-limits/**` und `src-ts/ems/heating-rod/**` werden jetzt als CommonJS-Spiegel unter `lib/ts-mirrors/ems/**` gebaut.
- Produktiv bleibt weiterhin die bestehende JS-Runtime.
- Vor einer produktiven Umschaltung ist ein Shadow-/Vergleichsmodus Pflicht.

