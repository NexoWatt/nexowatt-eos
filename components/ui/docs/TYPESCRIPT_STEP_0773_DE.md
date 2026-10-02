# 0.7.73 – Feature-Visibility Shadow-Hook

Diese Version führt den ersten sehr vorsichtigen Runtime-Kontakt zwischen vorhandenem Frontend-JavaScript und einem TypeScript-MJS-Spiegel ein.

## Ziel

Die produktive Anzeige bleibt unverändert. Der neue Hook vergleicht nur auf Wunsch die alte JS-Sichtbarkeitslogik mit dem TypeScript-Spiegel `customer-feature-visibility.mjs`.

## Aktivierung

Der Vergleich läuft nur mit:

```text
?nwTsFeatureVisibilityShadow=1
```

oder per Browserkonsole:

```js
localStorage.setItem('nwTsFeatureVisibilityShadow', '1')
```

## Wichtig

Der Shadow-Hook darf keine DOM-Anzeige ändern. Abweichungen werden nur in der Konsole protokolliert. Damit können wir später EVCS-/Speicherfarm-/SmartHome-Sichtbarkeit kontrolliert auf TypeScript umstellen, ohne wieder falsche Kundenfunktionen einzublenden.
