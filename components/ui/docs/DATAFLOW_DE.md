# NexoWatt UI – Datenflüsse

Diese Datei beschreibt, wie Werte durch den Adapter laufen. Sie hilft zu verstehen, warum eine Änderung an einem Datenpunkt oft mehrere Bereiche betrifft.

## 1. Allgemeiner Live-Datenfluss

```text
ioBroker Datenpunkt
  -> main.js stateCache
  -> EMS-Module ems/modules/*
  -> interne States / API-Snapshot
  -> /api/state und /events
  -> www/app.js
  -> Dashboard / Energiefluss / KPI / KI-Kachel
```

Wichtig:

- Ein State kann im Dashboard, in der History und im KI-Berater gleichzeitig verwendet werden.
- Deswegen darf die Bedeutung eines States nicht heimlich geändert werden.

## 2. Konfigurationsfluss aus dem App-Center

```text
www/ems-apps.html
  -> Eingabefeld / Checkbox / Select
  -> www/ems-apps.js sammelt Config
  -> main.js API speichert Config
  -> adapter.config
  -> EMS-Module lesen Config
  -> Runtime-States und Dashboard-Werte ändern sich
```

Typische Beispiele:

- Heizstab Speicherreserve.
- EVCS Ladepunktanzahl.
- Speicherfarm aktiv/inaktiv.
- KI-Berater Kategorien und Schwellenwerte.

Kritisch:

- UI-Feld-ID, JavaScript-Elementzuordnung und Config-Key müssen zusammenpassen.
- Wenn ein Feld im HTML ergänzt wird, muss `www/ems-apps.js` es lesen und speichern.
- Wenn ein Config-Key von einem EMS-Modul genutzt wird, braucht er einen Default in `main.js` oder im Modul.

## 3. Energiefluss

Energiefluss ist der kritischste Datenfluss.

```text
Mapping im App-Center
  -> main.js liest externe DPs
  -> core-limits.js berechnet zentrale Messbasis
  -> main.js veröffentlicht States
  -> www/app.js zeigt Energiefluss
  -> history.js nutzt historische Werte
```

### PV

PV kann aus einem einzelnen DP oder mehreren Erzeugern kommen.

Regel:

```text
PV-Werte sind positive Wattwerte.
```

### Netz

Netz kann signed oder getrennt kommen.

```text
signed Netz-DP:
  + / - je nach Systemsemantik, muss normalisiert werden

Split-DPs:
  Netzbezug positiv
  Netzeinspeisung positiv
```

### Speicher

Speicher muss drei Varianten unterstützen:

```text
A: getrennte DPs
   storageChargePower
   storageDischargePower

B: signed DP
   storagePower
   negatives Vorzeichen = Laden oder je nach Konfig normalisiert
   positives Vorzeichen = Entladen oder je nach Konfig normalisiert

C: kein DP
   rechnerischer Fallback nur bei belastbarer Bilanz
```

Harte Regel:

```text
0 W ist ein gültiger Messwert.
0 W darf nicht wegen altem Zeitstempel als fehlend gelten.
```

## 4. Speicher-Fallback

Fallback darf nur greifen, wenn keine echte Speicherquelle vorhanden ist.

Nicht erlaubt:

```text
Ein gemappter Speicher-DP ist vorhanden, liefert 0 W, und die Software überschreibt ihn rechnerisch.
```

Erlaubt:

```text
Kein Speicher-DP gemappt, aber PV, Netz, echter Verbrauch und SoC sind vorhanden.
Dann kann Speicherleistung aus Bilanz abgeleitet werden.
```

## 5. Heizstab

Heizstab nutzt:

- PV-Budget.
- Netzlimit.
- Speicherreserve.
- Speicher-SoC.
- Heizstab-Stufen.
- Freigaben/Sperren.

Datenfluss:

```text
App-Center Heizstab Config
  -> main.js Config
  -> core-limits.js Budget
  -> heating-rod-control.js Freigabe/Stufen
  -> States / Outputs
  -> Dashboard/Status
```

Kritisch:

- Speicherreserve muss als Eingabewert erhalten bleiben.
- PV-Budget darf nicht durch falsche Speicherwerte verfälscht werden.
- Heizstab darf nicht durch fehlerhafte Bilanzrechnung blockiert werden.

## 6. KI-Berater

Datenfluss:

```text
States + Config + Wetter + PV-Forecast + Tarif + Speicher + EVCS
  -> ems/modules/ai-advisor.js
  -> aiAdvisor.* States
  -> www/app.js KI-Kachel
```

Regeln:

- KI darf nichts automatisch schalten.
- KI darf nur beraten.
- Kundenschalter `settings.aiAdvisorEnabled` muss beachtet werden.
- Keine EVCS-Empfehlungen, wenn keine Wallbox vorhanden ist.
- Keine Speicherfarm-Empfehlungen, wenn keine Farm vorhanden ist.

## 7. Feature-Sichtbarkeit

EVCS, Speicherfarm und SmartHome dürfen nur angezeigt werden, wenn sie wirklich vorhanden/aktiv sind.

```text
Config + echte DP-/Gerätekonfiguration
  -> main.js / /config
  -> www/app.js oder jeweilige Seite
  -> UI zeigt oder versteckt Feature
```

Nicht erlaubt:

```text
Alte Default-States aktivieren EVCS oder Speicherfarm sichtbar.
```

## 8. Lizenzfluss

```text
Admin/License UI
  -> licenseKey in Config
  -> main.js Lizenzprüfung
  -> Feature-/UI-Freigaben
```

Regel:

```text
Maskierte Werte wie ******** dürfen niemals echten Lizenzschlüssel überschreiben.
```

## 9. info.connection

```text
Adapterstart
  -> Webserver läuft
  -> info.connection = true

Adapterstop/Webserverfehler
  -> info.connection = false
```

Optionaler Fehler nach Webserverstart darf die Verbindung nicht automatisch offline setzen.
