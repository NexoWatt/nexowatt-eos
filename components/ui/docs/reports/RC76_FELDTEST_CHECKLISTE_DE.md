# RC76-Feldtest-Checkliste – letzter Test vor 1.0.0 Stable

## Installation

- [ ] RC76 in einen neuen, leeren Projektordner entpacken und veröffentlichen.
- [ ] Adapter auf `0.8.201` aktualisieren und neu starten.
- [ ] Browser mit `Strg+F5` vollständig neu laden.
- [ ] Datenpunkte unter `forecast.openMeteoPv.*` und `forecast.pv.*` öffnen.

## PV-Flächenoberfläche

- [ ] Eine PV-Fläche: kein Löschknopf und keine leere Aktionsspalte.
- [ ] WR-Grenze überlappt kein anderes Element.
- [ ] Zweite PV-Fläche über `+ PV-Fläche hinzufügen` anlegen.
- [ ] Bei schmalem Fenster wechseln die Zeilen in einzelne Karten.
- [ ] Nord/Ost/Süd/West-Auswahl und gespeicherte Werte bleiben nach Neuladen erhalten.

## Standort

- [ ] Angezeigter Standortname entspricht der Wetter-App beziehungsweise EOS-Admin-Systemkonfiguration.
- [ ] Ort/PLZ ohne Koordinaten wird erfolgreich aufgelöst.
- [ ] Letzter Abrufversuch und letzte erfolgreiche Prognose erhalten Zeitwerte.

## Open-Meteo

- [ ] Prognosequelle `Automatisch` und Open-Meteo aktivieren.
- [ ] Mindestens eine PV-Fläche mit kWp, Neigung und Ausrichtung eintragen.
- [ ] Innerhalb weniger Sekunden erscheinen Prognosepunkte und Standortname.
- [ ] Tagsüber entstehen plausible positive Werte für 6/12/24 Stunden.
- [ ] Nachts bleibt die Kurve gültig und zeigt korrekt 0 W beziehungsweise 0 kWh.
- [ ] Abrufmodus wird angezeigt: 15-Minuten-GTI, stündliche GTI, GHI/DNI/DHI oder gemischter Fallback.

## Fallback

- [ ] 15-Minuten-Abruf gezielt blockieren oder simulieren: stündliche GTI übernimmt.
- [ ] GTI zusätzlich blockieren: GHI/DNI/DHI-Fallback übernimmt.
- [ ] Open-Meteo komplett unterbrechen: letzte gültige Kurve wird als veraltet gekennzeichnet.
- [ ] Bei aktivem AppCenter-Fallback wird dessen Prognose verwendet und der Open-Meteo-Fehler weiterhin erklärt.

## Zentrale EMS-Nutzung

- [ ] `forecast.pv.source`, `valid`, `curveJson` und Energiezustände passen zur Kundenanzeige.
- [ ] Zeit-Ziel aus: keine zukünftige Fahrzeugplanung.
- [ ] Zeit-Ziel an: PV-/Preisfenster werden verwendet, spätester Start bleibt sichtbar.
- [ ] Deadline-Override hebt nur wirtschaftliches Warten auf.
- [ ] Netz-, Stations-, Phasen-, §14a- und Safety-Grenzen bleiben bindend.

## Dauerbetrieb

- [ ] Mindestens ein Tageswechsel ohne ungeklärten Tick-/ReferenceError.
- [ ] Keine dauerhaft stehende Anzeige „Wird geladen …“.
- [ ] Keine hängenden Prognosewerte nach Standort- oder PV-Flächenänderung.
- [ ] Keine Speicher-, Lade- oder Safety-Regression.

## Stable-Kriterium

- [ ] Alle Punkte bestanden.
- [ ] Keine ungeklärte rote Diagnose.
- [ ] Danach Version `1.0.0` aus exakt diesem geprüften Quellstand ableiten.
