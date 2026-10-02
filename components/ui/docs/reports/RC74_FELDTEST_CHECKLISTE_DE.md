# RC74 – kurze Feldtest-Checkliste

## Installation

1. RC74 in einen neuen Ordner entpacken und auf npm veröffentlichen.
2. Adapter auf `0.8.199` aktualisieren und neu starten.
3. Browser mit `Strg+F5` vollständig aktualisieren.

## Open-Meteo

1. Wetter-App aktivieren.
2. Prognosequelle **Automatisch** wählen.
3. Open-Meteo-PV-Prognose aktivieren.
4. Mindestens eine PV-Fläche mit kWp, Neigung und Richtung eintragen.
5. Status beobachten: Der erste Abruf startet sofort. Es muss nicht das eingestellte Intervall abgewartet werden.
6. Prüfen:
   - Quelle;
   - Standort;
   - letzte Aktualisierung;
   - Prognosepunkte;
   - Energie 6/12/24 h;
   - verständlicher Fehlertext bei fehlendem Standort.

## Mehrere Flächen

1. Mit `+ PV-Fläche hinzufügen` eine zweite Fläche anlegen.
2. Richtung beispielsweise **Ost** wählen.
3. Seite neu laden.
4. Prüfen, ob beide Zeilen unverändert wieder erscheinen.

## Datenpunkte

Unter `forecast.openMeteoPv.*` müssen Quelle, Standort, Status und Kurve erscheinen. Unter `forecast.pv.*` muss die für das EMS ausgewählte Quelle sichtbar werden.

## Fallback

1. Open-Meteo vorübergehend auf **Nur AppCenter-Datenpunkte** stellen.
2. Vorhandene AppCenter-Zuordnung prüfen.
3. Danach wieder auf **Automatisch** stellen.
4. Es darf zu keinem Adapterabsturz und zu keinem Hardware-Schreibfehler kommen.
