# RC77-Feldtest-Checkliste – PV-Prognose nach State-Cache-Korrektur

## Installation

- [ ] RC77 in einen frischen Projektordner entpacken und veröffentlichen.
- [ ] Adapter auf `0.8.202` aktualisieren und vollständig neu starten.
- [ ] Browser einmal mit `Strg+F5` neu laden.
- [ ] Unter den Objekten `forecast.openMeteoPv.*` und `forecast.pv.*` kontrollieren.

## Sofortdiagnose nach Neustart

- [ ] Innerhalb weniger Sekunden ist „Letzter Abrufversuch“ nicht mehr `—`.
- [ ] Abrufmodus und Abrufstatus werden angezeigt.
- [ ] Standort entspricht der Wetter-App beziehungsweise dem EOS-Systemstandort.
- [ ] Bei erfolgreichem Abruf steigen Prognosepunkte über `0`.
- [ ] Tagsüber erscheinen plausible 6-/12-/24-Stunden-Erträge; nachts ist eine gültige 0-W-Kurve erlaubt.

## Fehleranzeige

- [ ] Internet oder DNS kurz unterbrechen.
- [ ] Die Oberfläche zeigt einen konkreten Fehler statt dauerhaft nur `0.00 kWh` ohne Ursache.
- [ ] `requestStatus` wechselt auf `error` oder bei vorhandener letzter Kurve auf `stale-error`.
- [ ] „Letzter Abrufversuch“ wird trotz Fehler aktualisiert.
- [ ] Log wird nicht mit identischen Statewrite-Warnungen überfüllt.

## Neustart-Fallback

- [ ] Zuerst eine gültige Prognose laden lassen.
- [ ] Netzwerkverbindung trennen und Adapter innerhalb von zwei Stunden neu starten.
- [ ] Letzte gültige Kurve bleibt sichtbar und wird als veraltet/fehlerbehaftet gekennzeichnet.
- [ ] Nach Wiederherstellung des Netzes wird automatisch eine neue Kurve übernommen.
- [ ] Eine abgelaufene oder vollständig vergangene Kurve wird nicht als gültige Planung verwendet.

## EMS-Übernahme

- [ ] `forecast.pv.valid`, `source`, `points`, `lastSuccessAt` und `curveJson` passen zur Kundenanzeige.
- [ ] Ein unveränderter persistierter Wert ist nach einem Neustart trotzdem sofort in `/api/state` sichtbar.
- [ ] AppCenter-zugeordnete Datenpunkte behalten Vorrang; Open-Meteo bleibt automatischer Fallback.

## Regressionsschutz

- [ ] PV-Flächeneditor bleibt ohne Überlappungen.
- [ ] Wetter-App und übrige LIVE-/HISTORY-/SMARTHOME-Seiten laden normal.
- [ ] Speicher-, Lademanagement-, §14a-, Tarif-, Stations- und Safety-Regelungen bleiben unverändert.
- [ ] Mindestens ein Tageswechsel ohne hängende Prognose oder ungeklärten Fehler.
