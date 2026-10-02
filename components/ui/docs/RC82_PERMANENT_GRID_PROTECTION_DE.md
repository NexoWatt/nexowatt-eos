# RC82 – Netzlimits als dauerhaft aktiver Kernschutz

## Ziel

Ab Version **0.8.207 / RC82** ist die Netzlimit-Regelung keine installierbare oder abschaltbare Komfort-App mehr, sondern ein **nicht abschaltbarer Kernschutz** des NexoWatt EOS. Ein alter AppCenter-Zustand, ein importiertes Backup, das Legacy-Feld `enableGridConstraints=false` oder ein ungültiger beziehungsweise vorübergehend nicht lesbarer Lizenzzustand darf den Schutz des Netzanschlusspunktes nicht deaktivieren.

## Verbindliche Quellen

Die beiden maßgeblichen Werte werden weiterhin ausschließlich unter **AppCenter → Zuordnung → Allgemein** festgelegt:

- **Netzanschlussleistung (W):** statisches Import-Hard-Limit am NVP.
- **Netzpunkt-Messung:** signierte Wirkleistung am NVP; Bezug ist positiv, Einspeisung negativ.

Unter **Netzlimits** existieren kein zweites Hard-Limit und kein zweiter NVP-Datenpunkt.

## Immer aktive Importgrenzen

Aus der wirksamen Netzanschlussleistung werden automatisch berechnet:

```text
Hard-Limit = 100 %
Soft-Limit =  90 %
Reserve    =  10 %
```

Beispiel bei 30.000 W Anschlussleistung:

```text
Hard-Limit  30.000 W
Soft-Limit  27.000 W
Reserve      3.000 W
```

Der Soft-Pfad stoppt oder reduziert Laststeigerungen vorausschauend. Der Hard-Pfad bleibt die absolute Safety-Grenze unmittelbar vor jedem Hardware-Write. Eine strengere RLM- oder Netzbetreibervorgabe darf das wirksame Hard-Limit nur absenken, niemals erhöhen oder ersetzen.

## AppCenter-Verhalten

Die App **Netzlimits** ist in Home und Pro enthalten und wird immer als installiert und aktiv normalisiert. Die bisherigen Installiert-/Aktiv-Schalter werden nicht mehr angezeigt. Stattdessen zeigt die Oberfläche:

```text
Netzschutz dauerhaft aktiv · nicht abschaltbar
```

Die alte Konfigurationsvariable bleibt ausschließlich zur Abwärtskompatibilität im Datenvertrag bestehen und wird aus dem gültigen Kern-/Lizenzzustand abgeleitet. Sie ist keine Abschaltmöglichkeit mehr.

## 0-Einspeisung bleibt optional

**0-Einspeisung bleibt optional** und standardmäßig ausgeschaltet. Sie wird weiterhin unter **Netzlimits** aktiviert und nutzt denselben signierten NVP aus **Zuordnung → Allgemein**.

Damit gilt die klare Trennung:

- Import-Soft-/Hard-Limit und NVP-Überwachung: immer aktiv.
- 0-Einspeisung, RLM und zusätzliche Netzbetreiber-/PV-Funktionen: separat konfigurierbar.

## Sichere Fehlerbehandlung

Bei einem fehlenden oder veralteten NVP-Wert dürfen keine neuen positiven Laststeigerungen freigegeben werden. Hysterese und Wiederfreigabeverzögerung bleiben aktiv. §14a, Park-/EZA-Regler, Phasen-, Stations-, Geräte- und finale Safety-Grenzen behalten ihre höhere Priorität.


## Bereinigte Core-Limits-Diagnose

Der bisher jede Minute wiederkehrende Warntext

```text
[core-limits-ts-shadow] JS/TS budget mismatch: total.effectiveW
```

stammte nicht aus der produktiven Netzregelung, sondern aus einem älteren Teil-Shadow der laufenden JavaScript→TypeScript-Migration. Seit RC78 verwendet das produktive Budget den vollständigen signed-NVP-Vertrag einschließlich bereits laufender geregelter Istlast. Der ältere Teil-Shadow kennt diesen erweiterten Vertrag nicht vollständig und konnte deshalb trotz korrektem produktivem Budget abweichen.

RC82 behandelt diesen alten Vergleich ausschließlich als interne Diagnose, sobald der vollständige `core-runtime-v2`-Snapshot seine Parität bestätigt hat. Die Abweichung bleibt bei Bedarf in `ems.budget.tsShadowJson` nachvollziehbar, erzeugt aber keine Betriebswarnung mehr und blockiert den Runtime-Gesamtstatus nicht. Unerwartete andere Shadow-Signaturen werden nur einmal pro Adapterlauf protokolliert statt im Minutentakt. Fällt der moderne Runtime-v2-Vertrag aus, bleibt der alte Vergleich fail-closed und darf bei einer Abweichung keine produktive Budgetübernahme auslösen.
