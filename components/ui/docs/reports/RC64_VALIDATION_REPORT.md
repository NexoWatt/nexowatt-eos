# RC64 – Validierungsbericht

## Artefakt

- Paket: `iobroker.nexowatt-ui`
- Version: `0.8.189`
- Release: `RC64 – Storage Grid Charge Policy`
- Basis: `0.8.188 RC63`
- Datum: `2026-08-16`

## Korrigierter Funktionsvertrag

Die Speicher-Netzladefreigabe besitzt jetzt zwei **alternative** wirtschaftliche Pfade:

1. **Zeitvariables Netzentgelt aktiviert**  
   Netzladen ist nur im aktuell aktiven, manuell konfigurierten NT-/Quartalsfenster erlaubt. Der dynamische Strompreis ist dabei keine zusätzliche Pflichtbedingung.

2. **Zeitvariables Netzentgelt deaktiviert**  
   Netzladen ist erlaubt, wenn der dynamische Tarif aktiv ist, der aktuelle Preis frisch ist und der Tarifzustand exakt `guenstig` lautet.

In beiden Fällen bleiben AppCenter-Freigabe, Speicherpriorität, beschreibbarer Writer, konfigurierte Ladeleistung sowie Netz-, SoC-, Geräte- und Safety-Grenzen zwingend.

## Geprüfte Freigabematrix

| Variables Netzentgelt | Zustand | Dynamischer Tarif | Erwartung |
|---|---|---|---:|
| An | konfiguriertes NT aktiv | beliebig, auch neutral/teuer/stale | erlaubt |
| An | Standard/HT | günstig | gesperrt |
| An | NT-Zeiten fehlen | beliebig | gesperrt |
| Aus | – | günstig und frisch | erlaubt |
| Aus | – | neutral/teuer | gesperrt |
| Aus | – | Preis fehlt/veraltet | gesperrt |
| Aus | – | dynamischer Tarif deaktiviert | gesperrt |

Zusätzlich wurden AppCenter-, Prioritäts-, Writer- und Leistungs-Sperren geprüft.

## Zeitfenster

Die Laufzeit verwendet ausschließlich die gespeicherten Einstellungen:

- einfaches Modell: `netFeeNtStart` / `netFeeNtEnd`
- Quartalsmodell: `netFeeQ1NtStart/End` bis `netFeeQ4NtStart/End`

Zeitfenster über Mitternacht werden unterstützt. Fehlende Start- oder Endzeiten sperren den NT-Pfad fail-closed. Es existieren keine versteckten Ersatzzeiten im Speicher-Netzladepfad.

## Unveränderte Regelbereiche

- PV-/NVP-basiertes Speicherladen bleibt möglich.
- Speicherentladung und Eigenverbrauchsoptimierung wurden nicht verändert.
- EVCS-, OCPP21-, RFID- und Availability-Korrekturen aus RC63 wurden nicht verändert.
- Single Writer, Speicherfarm-Dispatcher und finale Speicher-Writer-Firewall bleiben aktiv.

## Quell- und Typprüfung

- TypeScript-/TSX-Quellen syntaktisch geprüft: **707**
- produktive Runtimequellen synchron: **109**
- Runtime-TS-/TSX-Spiegel synchron: **462**
- TypeScript-Version: **5.8.3**
- `@ts-nocheck`-Budget: **60 Dateien / 160.341 Zeilen**, Maximum **160.344**
- vollständiger Projekt-Typecheck: bestanden
- Runtime-Identifier-Audit: bestanden
- Paket-Runtime-Startprüfung: bestanden

Die isolierte Testumgebung konnte `npm ci` nicht innerhalb ihres Netzwerk-Zeitlimits abschließen. Für die Prüfung wurde deshalb die bereits vorhandene, exakt passende TypeScript-Version 5.8.3 lokal eingebunden. Produktionsdateien und Release-Artefakt wurden dadurch nicht verändert.

## Release-Gate

Der Releaseplan enthält jetzt **233 Prüfungen**, einschließlich der RC63- und RC64-Regressionsprüfungen.

Wegen des maximalen Ausführungszeitfensters der Umgebung wurde der unveränderte Plan in zwei deterministischen Bereichen ausgeführt:

- Schritte **1–120**: bestanden
- Schritte **121–233**: bestanden

Ergebnis: **233/233 Prüfungen bestanden, 0 fehlgeschlagene Schritte**.

Zusätzlich bestanden:

- `npm run publish:check`
- `node scripts/verify-publish.js`
- `npm pack --dry-run`
- `test:rc63-availability-storage-grid-gate`
- `test:rc64-storage-grid-charge-policy`
- Tarif-Freshness und Tarif-/Speicher-Statuswahrheit
- Speicherfarm Auto-Dispatch und Dispatch-Recovery
- Speicherregelungs-Funktionssicherheit und Runtime-Szenarien
- NVP-Koordination Speicher/PV
- Wallbox-/RFID-/Availability-Regressionspfad aus RC63

## Paketdaten

- Release-Manifest: **264 geprüfte Produktdateien**
- npm-Paketinhalt: **265 Einträge**
- npm-Paketgröße: **7.323.319 Byte**
- ungepackte npm-Größe: **16.565.084 Byte**
- npm-Tarball-SHA1 aus Dry-Run: `8341231ebc3c6fac81b1c3b89f5c22d9c82dd934`

## Bewertung

Die vom Nutzer korrigierte Speicher-Netzladepolitik ist in der Runtime, der finalen Speicherfreigabe und den Regressionstests abgebildet. Das Paket ist versions- und manifestkonsistent sowie für `npm publish` vorbereitet. Reale Speicherhardware, Tarifprovider und kundenspezifische Zeitfenster müssen weiterhin im Anlagenfeldtest bestätigt werden; eine absolute Garantie für jede externe Hardware-/Firmwarekombination lässt sich durch automatisierte Tests allein nicht belegen.
