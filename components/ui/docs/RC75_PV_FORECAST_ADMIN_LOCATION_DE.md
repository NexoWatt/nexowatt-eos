# RC75 – zentrale Standortquelle und belastbare Open-Meteo-PV-Prognose

## Ziel

RC75 beseitigt den Zustand, in dem die Kundenseite bereits „Prognose aktiv“ meldete, obwohl Standort, Prognosepunkte und Energiemengen noch fehlten oder 0 waren.

Der Endkunde pflegt keine separaten Forecast-Koordinaten mehr. EOS verwendet den Anlagenstandort zentral aus dem EOS Admin beziehungsweise aus `system.config`. Sind nur Ort oder Postleitzahl vorhanden, werden die Koordinaten über die Open-Meteo-Geocoding-API aufgelöst.

## Einfache PV-Flächenverwaltung

Die PV-Anlagendaten bleiben im Kundenbereich immer sichtbar und editierbar – auch bevor Open-Meteo eingeschaltet oder die verzögert geladene Settings-Checkbox hydriert wurde.

Pro PV-Fläche werden gepflegt:

- Bezeichnung;
- installierte Leistung in kWp;
- Modul-/Dachneigung;
- Ausrichtung als Nord, Nordost, Ost, Südost, Süd, Südwest, West oder Nordwest;
- Anlagenverluste;
- optionale Wechselrichtergrenze.

Mit **+ PV-Fläche hinzufügen** können weitere Dachausrichtungen ergänzt werden. Die Oberfläche speichert intern weiterhin den bestehenden Vertrag `settings.pvForecastArrays`; eine JSON-Eingabe ist für den Endkunden nicht sichtbar.

## Standortreihenfolge

1. Koordinaten aus EOS Admin beziehungsweise `system.config`;
2. Ort/Postleitzahl aus der Systemkonfiguration und Open-Meteo-Geocoding;
3. alte manuelle Forecast-Koordinaten ausschließlich als Migrationsfallback.

Die verwendete Quelle wird diagnostisch veröffentlicht.

## Prognosevalidierung

Open-Meteo gilt nur dann als nutzbare PV-Prognose, wenn eine zukünftige Kurve mit mindestens einem positiven Leistungspunkt vorhanden ist. Ein Providerstatus `valid=true` ohne Kurvenpunkte darf in der Kundenoberfläche nicht mehr als „Prognose aktiv“ erscheinen.

Veröffentlicht werden unter anderem:

- Quelle;
- Standort und Standortquelle;
- letzter Abrufversuch;
- letzter erfolgreicher Abruf;
- Prognosepunkte und positive Punkte;
- aktuelle Prognoseleistung;
- Energie für 6, 12 und 24 Stunden;
- verständlicher Fehlergrund.

## Aktualisierung

Nach dem Adapterstart und nach einer gespeicherten Forecast-/PV-Flächenänderung wird sofort eine neue Aktualisierung ausgelöst. Das konfigurierte Intervall gilt nur für die folgenden Wiederholungen.

## Zentrale EMS-Verknüpfung

Open-Meteo und die AppCenter-Datenpunktquelle werden auf denselben kanonischen Vertrag `adapter._pvForecast` beziehungsweise `forecast.pv.*` normalisiert. Dieser wird von Budget-/Gate-Logik, Auto-/Zeit-Ziel-Planer, Speicher-/Speicherfarm-Strategien, Heizstab-/Thermik-Entscheidungen, Betriebsstrategien und der EMS-Admin-Diagnose verwendet, sofern die jeweilige Funktion aktiv ist.

Die Prognose ist ausschließlich ein Optimierungsinput. Reale Messwerte sowie Netz-, Stations-, Phasen-, §14a-, Parkregler-, RFID- und Safety-Grenzen bleiben immer stärker.
