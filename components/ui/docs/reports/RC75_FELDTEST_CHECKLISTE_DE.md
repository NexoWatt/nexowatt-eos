# RC75-Feldtest-Checkliste – Open-Meteo-PV-Prognose

## Installation

- [ ] Alte Projektkopie nicht weiterverwenden.
- [ ] RC75-ZIP in einen neuen, leeren Ordner entpacken.
- [ ] `npm ci` ausführen.
- [ ] `npm publish` ausführen.
- [ ] Adapter auf dem EOS-Controller auf `0.8.200` aktualisieren und neu starten.
- [ ] Browser mit `Strg+F5` vollständig neu laden.

## Standort

- [ ] Im EOS Admin ist ein Anlagenstandort beziehungsweise eine Postleitzahl hinterlegt.
- [ ] Im Kundenbereich wird dieser Standort angezeigt.
- [ ] Standortquelle ist EOS Admin/Systemkonfiguration oder Geocoding.
- [ ] Keine manuelle Forecast-Koordinate ist erforderlich.

## PV-Flächen

- [ ] PV-Flächentabelle ist sofort sichtbar.
- [ ] Mindestens eine Fläche mit Name, kWp, Neigung, Ausrichtung und Verlusten eintragen.
- [ ] Optional eine zweite Dachfläche über `+ PV-Fläche hinzufügen` anlegen.
- [ ] Himmelsrichtung aus der Auswahlliste wählen.
- [ ] Werte nach Seitenneuladen weiterhin vorhanden.

## Open-Meteo

- [ ] Wetter-App aktiv.
- [ ] Prognosequelle `Automatisch` oder `Open-Meteo`.
- [ ] Open-Meteo-PV-Prognose aktiv.
- [ ] Nach dem Speichern wird sofort ein Abruf ausgelöst.
- [ ] Danach erfolgt die zyklische Aktualisierung gemäß eingestelltem Intervall.
- [ ] Status zeigt Quelle, Standort, Aktualisierung und Prognosepunkte.
- [ ] Tagsüber sind positive Leistungs-/Energiewerte plausibel.
- [ ] Nachts darf die kurzfristige Energie korrekt `0 kWh` sein, während zukünftige Tagesfenster weiterhin Punkte enthalten.

## AppCenter-Fallback

- [ ] Bestehende PV-Forecast-Datenpunkte bleiben zugeordnet beziehungsweise verfügbar.
- [ ] Open-Meteo-Verbindung testweise unterbrechen.
- [ ] Bei aktivem Fallback wird AppCenter als Quelle verwendet.
- [ ] Ohne beide Quellen bleibt EMS aktiv und verwendet konservativen Latest-Start.

## Auto und Zeit-Ziel

- [ ] Zeit-Ziel aus: keine zukünftige Fahrzeugplanung.
- [ ] Zeit-Ziel an: eingestellte Zielzeit wird exakt verwendet.
- [ ] Prognostizierte PV-Fenster werden bevorzugt.
- [ ] Günstige Preisfenster werden berücksichtigt, sofern ein Tarifmodul vorhanden ist.
- [ ] Fehlendes Tarifmodul blockiert die Planung nicht.
- [ ] Spätester sicherer Start hebt nur wirtschaftliche Wartebedingungen auf.
- [ ] Netz, Station, Phasen, §14a, RFID und Safety bleiben immer stärker.

## Freigabekriterien

- [ ] Keine dauerhafte Meldung `Wird geladen …`.
- [ ] Keine falsche Meldung `Prognose aktiv` bei null Prognosepunkten.
- [ ] Kein ungeklärter ReferenceError oder Tickfehler.
- [ ] Keine Hardware-Sollwertüberschreitung.
- [ ] Kein hängender Lade- oder Speicher-Sollwert.
- [ ] Mindestens ein vollständiger Tageswechsel ohne ungeklärte Störung.
