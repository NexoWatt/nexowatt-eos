# RC91 – Cross-App-Stabilität und AppCenter-Konsistenz

## Ziel

RC91 ist ein Stabilitätsstand vor der geplanten Stable-Version. Der Schwerpunkt liegt nicht auf neuen Regelungsfunktionen, sondern auf der Frage, ob **alle vorhandenen Apps ihre Konfiguration, Aktivierung und Sicherheitsverträge auch dann behalten, wenn ein anderer AppCenter-Reiter gespeichert, ein Backup eingelesen oder der Adapter neu gestartet wird**.

## Gefundene Fehler

### 1. Unterschiedliche App-Kataloge

Der NexoWatt-UI-Adapter führte den App-Katalog an drei Stellen:

1. sichtbarer Browser-Katalog im AppCenter,
2. Normalisierung beim Adapterstart,
3. Installer-HTTP-Katalog für Lesen, Speichern und Backup.

Diese Kataloge waren nicht vollständig gleich. `energyLedger` fehlte in beiden Backend-Katalogen, `meshMicrogrid` im HTTP-Roundtrip. `chargeKiosk` war beim Adapterstart bekannt, aber nicht in jedem Installer-Roundtrip enthalten.

Dadurch konnte das Speichern einer fachlich unabhängigen App den Installiert-/Aktiv-Zustand einer anderen App entfernen oder zurücksetzen.

### 2. Widersprüchliche Aktivschalter

Einige Apps besitzen parallel:

- den kanonischen `emsApps.apps.<id>.enabled`-Zustand,
- ein Legacy-Flag `enableXyz`,
- einen verschachtelten Modulschalter `<config>.enabled`.

Ohne gemeinsame Synchronisierung konnten UI, API und Modulmanager unterschiedliche Antworten liefern. RC91 synchronisiert diese drei Ebenen für Herkunftsjournal, DC-Stationsdisplay und Mesh/Microgrid, ohne die übrige Modulkonfiguration zu überschreiben.

### 3. Textstabile Runtime-Quelle

`src-ts/runtime-executables/main.ts` wird textstabil nach `main.js` kopiert. Deshalb darf diese Datei trotz der Endung `.ts` keine Syntax enthalten, die nur TypeScript versteht. Eine Assertion `this as any` hätte nach einer sauberen Regeneration eine nicht parsbare `main.js` erzeugt. RC91 entfernt diese Assertion und prüft die ausgelieferte Runtime ausdrücklich mit `node --check`.

### 4. Home-Lizenzfallback nicht synchron

Der Modulmanager besitzt zusätzlich zur zentralen Feature-Matrix einen lokalen Notfall-Fallback. Dieser Fallback war älter als `HOME_APP_IDS` und enthielt nicht alle inzwischen für Home freigegebenen Apps. Im Normalbetrieb wurde die zentrale Matrix verwendet; bei einem seltenen Ladefehler des Feature-Services hätten jedoch einzelne Home-Module unbemerkt gesperrt werden können. RC91 gleicht den Fallback mit Netzschutz, Energy Ledger und NL-P1 ab. Der Lizenztest vergleicht beide Mengen jetzt semantisch, statt eine veraltete Textzeile zu erwarten.

## Sicherheitsinvarianten

RC91 verändert keine Sollwertberechnung und keine Hardwareentscheidung. Unverändert bleiben insbesondere:

- signierter NVP und Import-Soft-/Hard-Limit,
- Export-Limit und 0-Einspeisung,
- §14a und finale Safety-Hülle,
- Ladeverteilung, Auto/PV/Min+PV/Boost/Zeit-Ziel,
- Speicher-, Speicherfarm- und MultiUse-Regelung,
- dynamische Tarife und PV-Prognose,
- Offline-Isolation einzelner Ladepunkte,
- SSE-/Heap-Härtung aus RC88 bis RC90.

## Kommentarstandard

Nicht offensichtliche Verträge werden direkt in der kanonischen Quelle kommentiert. Dazu zählen:

- Katalogparität zwischen Browser, Adapterstart und HTTP-Roundtrip,
- Erhaltung absichtlich verborgener Apps,
- Synchronisierung mehrerer Aktivierungsquellen,
- JavaScript-Kompatibilität textstabil generierter Runtime-Dateien,
- Watchdog-, Safety-, Vorzeichen- und Fail-closed-Verträge.

Triviale Syntax wird bewusst nicht kommentiert, damit sicherheitsrelevante Hinweise sichtbar bleiben.

## Stable-Bedingung

Der unveränderte RC91-Stand soll auf mindestens zwei unterschiedlichen Anlagen 24 bis 48 Stunden laufen. Für die Stable-Freigabe müssen gelten:

- kein kontinuierlicher Heap-Anstieg,
- keine SSE-Reconnect-/`resync-error`-Schleife,
- aktuelle EMS-Regelticks und Diagnose-Heartbeats,
- keine unbeabsichtigten App-Deaktivierungen nach Save, Neustart oder Backup,
- unveränderte sichere NVP-, Lade- und Speicherregelung.
