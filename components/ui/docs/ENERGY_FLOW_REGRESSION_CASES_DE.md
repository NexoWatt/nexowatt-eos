# Energiefluss-Regressionen für die TypeScript-Migration

Dieses Dokument erklärt die Testfälle aus `src-ts/quality/energy-flow-regression-cases.ts` in einfachen Worten.

## Ziel

Die Energiefluss-Logik darf beim TypeScript-Umbau keine alten Fehler wiederholen. Besonders Speicherwerte beeinflussen viele Bereiche:

- LIVE-Energiefluss
- History
- Heizstab-Budget
- Core-Limits
- KI-Berater

## Regeln

### 1. 0 W ist gültig

Wenn ein Speicher-DP mit 0 W gemappt ist, bedeutet das: Der Speicher lädt oder entlädt gerade nicht. Das ist ein gültiger Zustand und darf nicht als fehlender Wert behandelt werden.

### 2. Split-DPs bleiben gültig

Wenn ein System getrennte DPs liefert:

```text
Speicher Laden
Speicher Entladen
```

müssen diese Werte direkt übernommen werden.

### 3. Signed DP bleibt gültig

Wenn ein System nur einen Batterie-Leistungs-DP liefert, muss das Vorzeichen korrekt interpretiert werden.

### 4. Rechenfallback nur ohne echten Speicher-DP

Eine Bilanzrechnung ist nur erlaubt, wenn kein echter Speicherleistungs-DP vorhanden ist.

### 5. History schützen

Falsche Ersatzwerte dürfen nicht in historische Daten geschrieben werden, weil sie später schwer zu reparieren sind.

## Nächster Migrationsschritt

Nach diesen Regressionen kann in einer späteren Version der produktive Speicher-/Netzresolver schrittweise nach TypeScript überführt werden. Vorher müssen diese Testfälle grün bleiben.
