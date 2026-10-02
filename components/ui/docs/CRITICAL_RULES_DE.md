# NexoWatt UI – Kritische Regeln

Diese Regeln dürfen bei Wartung, Refactoring oder TypeScript-Migration nicht gebrochen werden.

## 1. Speicher-DP-Regeln

Speicher muss immer drei Varianten unterstützen:

```text
1. getrennte Lade-/Entlade-DPs
2. signed Speicherleistungs-DP
3. rechnerischer Fallback, wenn kein DP existiert
```

Regeln:

- Gemappte DPs sind Quelle der Wahrheit.
- 0 W ist ein gültiger Wert.
- 0 W darf nicht wegen altem Zeitstempel ignoriert werden.
- Fallback nur, wenn wirklich kein echter Speicher-DP vorhanden ist.
- Speicherfarm-Werte nur bei aktiver Speicherfarm nutzen.

## 2. Netz-DP-Regeln

Netz kann signed oder getrennt kommen.

- Bezug immer positiv normalisieren.
- Einspeisung immer positiv normalisieren.
- Signed-Vorzeichen nicht ungeprüft übernehmen.
- Netzwerte beeinflussen Peak-Shaving, KI, Heizstab und History.

## 3. History-Regeln

History ist empfindlich, weil falsche Werte dauerhaft gespeichert werden können.

- Keine aggressiven Fallbacks in History-Werte schreiben.
- Keine falschen Speicherwerte ersetzen, wenn echte DPs vorhanden sind.
- Änderungen an Resolvern immer mit History prüfen.

## 4. Feature-Sichtbarkeit

EVCS, Speicherfarm, SmartHome und Installer-Funktionen dürfen nur sichtbar sein, wenn sie wirklich vorhanden/aktiv sind.

Nicht erlaubt:

- EVCS anzeigen, nur weil alte States existieren.
- Speicherfarm anzeigen, nur weil `storageFarm.*` States existieren.
- Installerbereich im Kundenfrontend vermischen.

## 5. Heizstab-Regeln

- Speicherreserve muss speicherbar bleiben.
- PV-Budget muss aus derselben Basis kommen wie Dashboard und Core-Limits.
- Netzbezug-/Speicherentlade-Flags müssen respektiert werden.
- Stufen-DPs dürfen nicht bei UI-Refresh auf Default springen.

## 6. KI-Regeln

- KI-Berater darf nur beraten.
- KI darf keine Geräte automatisch schalten.
- Kundenschalter `settings.aiAdvisorEnabled` muss respektiert werden.
- Keine EVCS-Empfehlungen ohne echte Wallbox.
- Keine Farm-Empfehlungen ohne echte Farm.
- Speicher-SoC muss aus normalem Speicher kommen, nicht aus Farm-Default.

## 7. Lizenz-Regeln

- Maskierte Werte wie `******` niemals als echten Key speichern.
- Lizenzprüfung darf keine UI-Platzhalter als gültig behandeln.
- Lizenzlogik immer isoliert testen.

## 8. info.connection Regeln

- `true`, wenn Webserver/API/SSE lauffähig sind.
- `false` bei unload, Webserverfehler oder Startfehler vor Webserverstart.
- Optionale Modulfehler nach Webserverstart dürfen nicht automatisch offline setzen.

## 9. TypeScript-Regeln

- Keine Big-Bang-Migration.
- Pro Änderung nur betroffene Datei/Teilbereich migrieren.
- Erst Typen definieren, dann Logik bewegen.
- Nach jeder Migration JS-/TS-Build und Regressionstest.

## 10. Kommentare

- Kommentare sollen fachliche Bedeutung erklären.
- Keine banalen Kommentare wie `i++` beschreiben.
- Immer Zusammenhang zu States/APIs/anderen Modulen nennen, wenn relevant.
