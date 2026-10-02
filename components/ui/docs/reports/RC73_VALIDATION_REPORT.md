# RC73-Validierungsbericht – NexoWatt UI 0.8.198

## Freigabeschwerpunkt

Version 0.8.198 RC73 ergänzt den ausschließlich lesenden Diagnosevertrag für die neue EMS-Live-Kachel des NexoWatt EOS Admin.

## Geprüfter Vertrag

- `info.adminOverview.*` wird als eigenes Diagnose-Channel angelegt.
- `summaryJson` verwendet `schemaVersion: 1`.
- Zentraler EMS-Tick, Safety, Gesamt-/Rest-/PV-Budget und bindende Grenze werden verdichtet.
- Ladepunkte liefern Soll, Ist, Reservierung, Modus, Limiter und verständlichen Grund.
- Speicher beziehungsweise Speicherfarm liefern Topologie, SoC, Soll/Ist, Write-Status und Regelgrund.
- §14a einschließlich Kommunikationsfallback, Tarif, PV-Prognose und Peak-Shaving werden optional aufgenommen.
- Inaktive oder nicht vorhandene Module werden nicht als Fehler gewertet.
- Höchstens acht Ereignisse werden an das Cockpit übergeben; der lokale Diagnosepuffer ist auf 60 verdichtete Einträge begrenzt.
- Aktualisierung höchstens alle fünf Sekunden; unveränderte States werden nicht erneut geschrieben.
- Der Dienst schreibt ausschließlich unter `info.adminOverview.*` und besitzt keinen Hardware-/Setpoint-Pfad.

## Durchgeführte Prüfungen

Der geordnete Releaseplan umfasst **243 Prüfungen**. Er wurde deterministisch in folgenden Bereichen ausgeführt:

- Schritte 1–60: bestanden
- Schritte 61–120: bestanden
- Schritte 121–190: bestanden
- Schritte 191–243: bestanden

Ergebnis:

```text
Bestanden:       243
Fehlgeschlagen:    0
```

Die neue RC73-Prüfung deckt zusätzlich ab:

- zentrale Budgetwerte und bindende §14a-Grenze;
- ein ladender und ein wartender Ladepunkt;
- Speicherfarm mit Soll-/Istwert und SoC;
- Tarif- und PV-Prognosestatus;
- §14a-Kommunikationsfallback;
- fehlende optionale Module;
- Publisher-Lifecycle und Shutdown;
- ausschließlich Diagnosewrites unter `info.adminOverview.*`;
- maximal acht an EOS Admin veröffentlichte Ereignisse.

## TypeScript und Runtime

```text
Produktive Runtime-Dateien: 117
Runtime-Spiegel:             479
TypeScript-Typecheck:        bestanden
Runtime-Synchronität:        bestanden
Paket-Runtime-Start:         169 JS/MJS-Dateien bestanden
```

## npm-Artefakt

```text
Paket:                       iobroker.nexowatt-ui
Version:                     0.8.198
Release-Manifest:            281 Produktdateien
npm-Tarball:                 282 Dateien einschließlich package.json
Paketgröße:                  7.566.171 Byte
Ungepackte Größe:           16.987.040 Byte
publish:check:               bestanden
verify-publish.js:           bestanden
npm pack --dry-run:          bestanden
```

## EOS-Admin-Teil

Der EOS-Admin-Anteil wird getrennt über das Merge-Paket integriert. Dafür wurden geprüft:

- read-only React-Komponente ohne ioBroker-Schreiboperation;
- Abfrage ausschließlich über `nexowatt-ui.*.info.adminOverview.*`;
- Aktualisierung alle fünf Sekunden nur bei sichtbarem Browserreiter;
- rollenreduzierte Endkundenansicht;
- Offline-/Stale-/fehlender-Adapter-Fallback;
- responsive CSS und idempotenter Merge in einem Quellstand-Fixture;
- TSX-Syntaxprüfung.

Ein vollständiger EOS-Admin-Build muss nach dem Merge im aktuellen EOS-Admin-Repository ausgeführt werden, weil dessen kompletter Quellbaum nicht Bestandteil des NexoWatt-UI-Pakets ist.
