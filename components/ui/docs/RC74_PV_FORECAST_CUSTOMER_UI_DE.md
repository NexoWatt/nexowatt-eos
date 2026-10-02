# RC74 – Open-Meteo PV-Prognose und einfache PV-Flächenverwaltung

## Ziel

RC74 schließt die sichtbare und technische Lücke der in RC72/RC73 vorbereiteten PV-Prognose. Kunden können die Open-Meteo-PV-Prognose direkt unter **Einstellungen → Allgemein → Wetter → PV-Prognose** aktivieren, ohne JSON bearbeiten zu müssen.

## Behobene Ursachen

- Das Frontend lädt `forecast-settings.js` nun sicher über `/static/forecast-settings.js`.
- Die Prognosestatusanzeige liest sowohl die aufbereitete Quelle `forecast.pv.*` als auch die direkte Open-Meteo-Diagnose `forecast.openMeteoPv.*`.
- Änderungen an Standort, PV-Flächen, Quelle und Zeitintervall lösen im Backend sofort eine Aktualisierung aus; das eingestellte Intervall ist nur der spätere Wiederholungszyklus.
- Bei `0/0` werden zuerst die Koordinaten aus `system.config` genutzt. Sind dort nur Ort oder Postleitzahl vorhanden, wird der Standort über die Open-Meteo-Geocoding-API aufgelöst.

## Einfache Kundenoberfläche

Die frühere Experten-JSON-Eingabe wurde aus der normalen Kundenansicht entfernt. Stattdessen verwaltet eine Tabelle beliebig viele PV-Flächen.

Pro Fläche stehen zur Verfügung:

- Bezeichnung;
- installierte Leistung in kWp;
- Dachneigung;
- Ausrichtung als Nord, Nordost, Ost, Südost, Süd, Südwest, West oder Nordwest;
- Anlagenverluste;
- optionale Wechselrichtergrenze.

Mit **+ PV-Fläche hinzufügen** wird eine weitere Fläche ergänzt. Intern bleibt der bestehende `settings.pvForecastArrays`-Vertrag erhalten, damit Backend, AppCenter-Fallback und bestehende Installationen kompatibel bleiben.

## Quellen und Fallback

- **Automatisch:** Open-Meteo bevorzugen, vorhandene AppCenter-Datenpunktprognose bei Ausfall verwenden.
- **Nur Open-Meteo:** keine automatische Umschaltung auf AppCenter.
- **Nur AppCenter-Datenpunkte:** Open-Meteo wird nicht benötigt.
- **Deaktiviert:** keine zukünftige PV-Prognose; Echtzeit-PV-Regelung bleibt aktiv.

Fehlen alle Prognosequellen, bleibt Auto-/Zeit-Ziel-Laden funktionsfähig und arbeitet mit dem konservativen Latest-Start-Fallback.

## Aktualisierungsverhalten

Nach einer gespeicherten Einstellungsänderung wird sofort eine Forecast-Aktualisierung angestoßen. Anschließend läuft die Wiederholung im konfigurierten Intervall von mindestens fünf Minuten. Ein Wert von fünf Minuten bedeutet daher nicht, dass nach dem Speichern zunächst fünf Minuten gewartet werden muss.

## Sicherheit

Die Prognose ist ausschließlich ein Optimierungsinput. Sie besitzt keinen Hardware-Writer und kann Netz-, Stations-, Phasen-, §14a-, RFID- oder Safety-Grenzen nicht erhöhen oder umgehen.
