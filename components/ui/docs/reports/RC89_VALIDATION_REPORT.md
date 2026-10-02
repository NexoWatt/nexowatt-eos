# RC89 Validierungsbericht

**Adapter:** `iobroker.nexowatt-ui` 0.8.215  
**Release-Kandidat:** RC89  
**Stand:** 27.08.2026  
**Ziel:** Falsche Anzeige „Offline / veraltet“ beseitigen, ohne EMS-Regelentscheidungen oder Hardware-Sollwerte zu verändern.

## Bestätigte Ursache

Die bestehende EOS-Admin-Kachel bewertet einen Diagnose-Snapshot bereits nach 20 Sekunden als `stale` und verbindet diesen Zustand mit der Anzeige „Offline / veraltet“. Gleichzeitig konnte der read-only Admin-Overview-Publisher durch einen einzelnen nicht zurückkehrenden State-Lese- oder Schreibzugriff verzögert werden. Dadurch blieb der Diagnosezeitstempel stehen, obwohl `info.connection=true` und die eigentlichen EMS-Regelticks weiterhin aktuell waren.

## Technische Korrekturen

- Adapter-Erreichbarkeit, EMS-Tick-Aktualität und Diagnose-Publisher-Gesundheit werden getrennt modelliert.
- `info.adminOverview.updatedAt` wird als leichter Kompatibilitäts-Heartbeat am Beginn jedes Publisher-Zyklus bestätigt.
- Volatile Diagnose-States werden mit begrenzter Parallelität gelesen.
- State-Lese-, State-Schreib- und Objektoperationen besitzen feste Timeouts.
- Eine hängende Operation bleibt pro Kennung quarantänisiert und wird nicht zyklisch vervielfacht.
- Späte Promise-Ablehnungen werden konsumiert; die Publisher-Sperre wird nach jedem begrenzten Zyklus zuverlässig freigegeben.
- `lastTickStart` und `lastTickEnd` werden als kanonische Tickquellen berücksichtigt.
- Neue read-only Health-States veröffentlichen Heartbeat, letzten vollständigen Erfolg, Zyklusdauer, Timeoutzähler, offene Operationen und letzten Fehler.
- Diagnose-I/O-Probleme werden höchstens einmal pro Minute zusammengefasst protokolliert.
- Nicht offensichtliche Kompatibilitäts-, Timeout-, Fallback- und Sicherheitsinvarianten sind direkt in der kanonischen TypeScript-Quelle kommentiert.

## Regelungsinvarianz

Ein Bytevergleich gegen RC88 bestätigte **833 unveränderte kritische Dateien**. Unverändert sind insbesondere:

- `main.js`;
- alle EMS-Regelmodule und Consumer;
- alle übrigen EMS-Services;
- NVP-, Lade-, Speicher-, Tarif-, §14a-, Forecast-, Export- und Safety-Logik;
- SSE-/Heap-Härtung aus RC88;
- Kunden- und AppCenter-Regeloberflächen.

Geändert wurden ausschließlich der read-only Admin-Overview-Publisher, seine kanonische TypeScript-Quelle und Runtime-Spiegel, Versions-/Release-Metadaten, Regressionstest und Dokumentation.

## Durchgeführte Prüfungen

| Prüfung | Ergebnis |
|---|---:|
| RC89 Health-/Timeout-/Heartbeat-Regressionsvertrag | bestanden |
| RC73 Admin-Overview-Basisvertrag | bestanden |
| RC87 Monitoring-only-Anzeige | bestanden |
| RC88 SSE-/Heap-Stabilitätsvertrag | bestanden |
| OCPP21-/Speichersicherheit RC59 | bestanden |
| Auto-/PV-/Min+PV-/Zeit-Ziel-Verträge RC60 | bestanden |
| §14a-Kommunikationsfallback RC68 | bestanden |
| PV-Prognose-Statecache RC77 | bestanden |
| signed-NVP-/Import-only-Budget RC78 | bestanden |
| Soft-/Hard-/0-Einspeise-Vertrag RC79 | bestanden |
| feste 10-%-Reserve RC80 | bestanden |
| zentrale NVP-Zuordnung RC81 | bestanden |
| permanenter Netzschutz RC82 | bestanden |
| Speicher nur bei günstigem Tarif / Logobjekt RC83 | bestanden |
| Gate-A-/Offline-Isolation RC86 | bestanden |
| TypeScript-Typecheck | bestanden |
| TypeScript-Quellen syntaktisch gültig | 737 |
| produktive Runtime-Dateien synchron | 120 |
| Runtime-Spiegel synchron | 482 |
| Release-Artefaktprüfung | 310 Paketdateien |
| npm-Tarball | 311 Dateien |
| Runtime-Start-/Syntax-Smoke | 179 JS-/MJS-Dateien |
| `npm pack --dry-run` | bestanden |
| `npm publish --dry-run --ignore-scripts` | bestanden |
| frisch entpacktes npm-Paket: RC89 + Runtime-Syntax | bestanden |
| kritische Dateien bytegleich zu RC88 | 833 |

## Spezielle RC89-Szenarien

1. `info.connection=true`, EMS-Tick 45 Sekunden alt: Adapter bleibt online, Status wird als verzögerter EMS-Tick ausgewiesen.
2. `info.connection=false`, Tick aktuell: tatsächlicher Adapter-Offlinezustand bleibt Fehler.
3. Publisher-I/O verzögert, Adapter und Tick aktuell: Diagnosewarnung statt Offlineanzeige.
4. Hängender State-Read: Initialisierung und nächste Zyklen bleiben begrenzt; dieselbe Operation wird nur einmal gestartet.
5. Hängender `summaryJson`-Write: Heartbeat bleibt fortschreibbar; keine zweite identische offene Write-Promise.
6. Nur `lastTickEnd` vorhanden: EMS-Tick wird weiterhin korrekt als aktuell erkannt.
7. npm-Paket ohne `src-ts`: RC89-Regressionsprüfung läuft gegen die ausgelieferte JavaScript-Runtime.

## Build-Hinweis

Die vorgebauten Produkt-Runtimes sind Bestandteil des Release-Artefakts und wurden gegen ihre kanonischen TypeScript-Quellen geprüft. Eine vollständige Neuinstallation aller Entwicklungsabhängigkeiten war in der isolierten Build-Umgebung wegen einer zeitweisen DNS-Störung zum npm-Registry nicht erforderlich beziehungsweise nicht möglich; Typecheck, Runtime-Synchronisierung, Releaseprüfung, npm-Pack und Publish-Dry-Run wurden mit dem vorhandenen Lock- und Toolingstand erfolgreich ausgeführt.

## Feldfreigabe

Vor Stable sollte RC89 mindestens einen vollständigen Tageszyklus laufen. Entscheidend sind:

- kein falsches „Offline / veraltet“ bei aktuellem Adapter und Tick;
- fortlaufender Publisher-Heartbeat;
- keine Diagnose-Warnflut;
- unveränderte NVP-, Lade-, Speicher- und Safety-Sollwerte;
- stabiler Heap/RSS aus RC88.
