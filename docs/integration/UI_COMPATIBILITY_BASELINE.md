# UI 1.0.21 – Integrations- und Funktionsbaseline

Stand: 30.09.2026. Gegenstand ist das vom Nutzer ausdrücklich als aktuell bezeichnete
ZIP `NexoWatt_UI_1.0.21_STABLE_FULL_REPOSITORY (1).zip`. SHA-256:
`90db619ecd754cab335dae92fdc123a48f62ceffb505a2a2b832e119d885eefe`.
`package.json` und `io-package.json` nennen 1.0.21. Ein zugehöriger Git-Commit ist
aus diesem ZIP nicht belegt. Die GitHub-Version ersetzt diese Nutzervorgabe nicht.

**Prüfstand:** Quellinventar mit vier ausgewählten vorhandenen Prüfskripten; kein
vollständiger Funktionserhalt-, Browser-, Anlagen- oder CRA-/IEC-Nachweis.
Produktdateien wurden nicht verändert: Der anschließende Bytevergleich bestätigte
alle 2.098 Dateien gegen das Originalarchiv, ohne Abweichung oder Zusatzdatei.
Dateihashes wichtiger Anker stehen in
`system/integration/ui-compatibility-observations.json`.

## Architekturfolge aus dem tatsächlichen Quellbestand

Der Adapter ist wesentlich mehr als eine Anzeige: `main.js` lädt die eingebettete
EMS-Engine (`ems/engine.js`), den Modulmanager und physisch wirksame
Lade-/Speicher-/Netzregelung. Das gemeinsame UI-Paket enthält außerdem Microgrid,
Historie, Tarif-/Prognosefunktionen und Gebäudesteuerung. Eine künftige Trennung von
Weboberfläche und EOS Core muss diese Abhängigkeiten gezielt auflösen. Alle Dateien
gemeinsam in einen neuen Prozess oder Container zu verpacken schafft diese
Sicherheitsgrenze nicht.

Die kanonischen Runtime-Quellen liegen laut `docs/AGENTS.md` in
`src-ts/runtime-executables/`. `npm run sync:ts-runtime-executables` erzeugt daraus
unter anderem `main.js`, `ems/`, `lib/` und Browser-JavaScript. Daneben existieren
gezielt typisierte Helfer, Verträge und Runtime-Spiegel. Teile der kanonischen
Quellen enthalten `@ts-nocheck`; die Dateiendung `.ts` ist deshalb kein Beleg einer
vollständigen Typprüfung oder strengen Laufzeitvalidierung. Ein späterer Umbau
muss an der kanonischen Quelle und am generierten Lieferartefakt geprüft werden.

| Grenze | Bestehender Einstieg / Vertrag | Bei Migration erhalten |
| --- | --- | --- |
| Browser | `www/`, `www/index.html`, CSS, Logos, DE/NL/EN-Sprachdateien | Design, Navigation, Anzeigen, Einheiten, Ladezustände und Fehlerdarstellung |
| Admin-Tab | `src-admin-tab/src/App.tsx`; Build nach `admin/react/` | Installer-/Lizenz-/Microgrid-/Benachrichtigungsseiten und rollenabhängige Bedienpfade |
| Laufzeit | `main.js` → `EmsEngine` → `ModuleManager` | Initialisierung, Abschaltung, Modulreihenfolge, Fehler- und Wiederanlaufsemantik |
| Datenpunkte | `ems/datapoints.js`, `src-ts/contracts/datapoints.ts`, `iobroker-states.ts` | IDs, Typen, W/A/kWh, Vorzeichen, `ack`, `ts`, `lc`, Qualität und Skalierung |
| Konfiguration | `io-package.json`, `admin/jsonConfig.json`, AppCenter-/Installer-Konfiguration | Mappings, Freigaben, Grenzwerte, vorhandene Installationen und Migrationspfade |

Das Admin-Tab-Unterpaket bezeichnet sich intern als 0.8.8. Dies ist kein Nachweis
einer anderen Produktversion; der Produktstand bleibt 1.0.21. Der Adapter deklariert
Node `>=22`, js-controller `>=6.0.11` und Admin `>=7.0.0`. Das sind Mindestbereiche,
keine festgestellten Installationsversionen und keine Freigabe jeder höheren
Version. Direkte Runtime-Abhängigkeiten sind `@iobroker/adapter-core ^3.4.1`,
`@iobroker/type-detector 5.0.10`, `express ^4.22.2`, `nodemailer 10.0.10`.

## Zu erhaltende Funktionsbereiche

| Bereich | Wichtige vorhandene Module | Abnahmekriterien beim Umbau |
| --- | --- | --- |
| AC/DC-Laden | `charging-management`, EVCS-Mapping, Allokation, Phasenwahl | Modi, Zeit-Ziele, Min/Max, Netz-/PV-/Speicheranteile, Stationsgrenzen und Reservierung noch fließender Last |
| Speicher / Farm | `storage-control`, `storage-mapping`, `multi-use`, Farm-Aggregation | Vorzeichen, SOC-/Reservebereiche, Auswahl der Regelautorität, Lade-/Entladefreigaben, keine doppelte Leistungsanrechnung |
| Netz / PV | `grid-constraints`, `nvp-coordinator`, `core-limits`, `peak-shaving`, `safety-envelope` | NVP-Zuordnung, Soft-/Hardlimits, Null-Einspeisung, WR-Zuordnungen, Messalter, Prioritäten und Fehlerzustände |
| §14a / EEBUS | `para14a`, `para14a-eebus-api`, `netoperator-interface` | Annahme, Umsetzung und Rückmeldung getrennt halten; Signalalter und projektspezifischer Ausfallzustand |
| Microgrid | `mesh-coordinator*`, `mesh-microgrid`, Energiejournal | Autonomie, Lease-Ablauf, Teilnehmer-/Phasenlimits, Wiederanlauf und Trennung von Abrechnung und Steuerfreigabe |
| Gebäude / Apps | Heizstab, Thermal Control, Betriebsstrategien, NexoLogic, generische Verbraucher | Freigaben, Prioritäten, Smart-Home-Zuordnungen, Betriebsstrategien und sichere Wiederaufnahme |
| Historie / Anzeige | Historienabfragen, Energiefluss, Energy Ledger | Nullwerte, echte Messwerte, Skalierung, Zeitfenster sowie sichtbare Aktualität und Verfügbarkeit |

Die EMS-Engine setzt ihren konfigurierten Zyklus im Quellcode auf 250–1.000 ms;
Standard ist 1.000 ms. Dies ist eine Timerkonfiguration, keine gemessene
Echtzeit- oder Reaktionszeitgarantie auf dem Raspberry Pi. Eine spätere
Prozess-/Transporttrennung muss Jitter, Messalter und physische Befehlsbestätigung
unter Last zusätzlich messen.

## Schnittstellen und Controller-Abhängigkeit

Der **js-controller bleibt eine eigenständige Kernkomponente** des Lieferstands.
Das UI benutzt `@iobroker/adapter-core`, Fremd-State-Abonnements, Lese-/Schreibzugriffe
und `sendTo`. Die Verschlüsselung und Rechte des tatsächlich eingesetzten
Controller-/Objekt-/State-Transports lassen sich nicht aus dem UI-ZIP ableiten.
Es liegt kein Nachweis einer isolierten, gegenseitig authentifizierten Verbindung
für jede dieser Operationen vor.

| Datenfluss | Quellbeobachtung | Integrationsfolge |
| --- | --- | --- |
| Browser ↔ UI | Express-Listener; Standard `0.0.0.0:8188` | Geschützten Einstieg einführen und API-/SSE-/Navigationskompatibilität prüfen; HTTP-/Auth-Befunde gesondert bearbeiten |
| UI ↔ Devices | Explizite Installer-Zuordnungen und Kandidaten unter `devices.<id>.aliases.v1.r` / `.ctrl`, Legacy- und Rohpfade | Eine Gerätebasis pro Ladepunkt und die Vorrangregel expliziter Zuordnungen erhalten |
| UI ↔ OCPP21 | Eigener nativer Zweig `ocpp21.<Instanz>.<Station>` und Alias-Migrationspfad; Kennung `nexowatt-ocpp21-0.4-native` | Aktuellen OCPP21-Adapter gegen diese tatsächlichen Pfade und Semantik testen |
| EEBUS ↔ UI | `sendTo`: `nexowatt.para14a.hello.v1`, `.command.v1`, `.implementation.v1` | Gegenseitige Identität/Rechte ergänzen, fachlichen Vertrag und Rückmeldungen erhalten |
| UI ↔ Historienadapter | `sendTo(..., 'getHistory', ...)`; Default `influxdb.0` | Historienadapter und seine Version als Komponente aufnehmen; keine direkte DB-Portannahme aus dem UI ableiten |
| UI ↔ Netzbetreibergerät | Optionaler Modbus-TCP-Client, Standardport 502; standardmäßig deaktiviert/diagnostisch | Tatsächliches Feldprotokoll separat absichern und projektspezifisch in Betrieb nehmen |
| Mesh ↔ Mesh | Konfigurierte HTTP(S)-Adressen sowie lokaler Kommandostate; Legacy-Modul und Koordinator vorhanden | Koexistenz, Schlüssel-/Lease-Migration und Wiederanlauf prüfen; Namen „Tailscale“ nicht als Transportnachweis werten |

EEBUS nennt im Code Zielzeiten für Annahme/Controller/Feedback von
250/1.000/1.500 ms. Auch diese Werte sind Zielgrößen, keine Messbelege. Die
zusätzlichen Feldadapter besitzen ihre eigenen Protokollports; deren vollständige
Netzwerkfreigaben werden aus ihren Quellen und der Zielkonfiguration ermittelt.

## Vorhandene Fixtures und tatsächlich ausgeführte Prüfungen

Vorhanden sind JSON-Fixtures unter `tests/fixtures/` und `tests/regression/`,
typisierte Fälle unter `src-ts/quality/`, Runtime-Tests unter `src-ts/tests/` und
zahlreiche Fach-/Release-Prüfskripte. Mehrere ältere JSON-Dateien bezeichnen sich
ausdrücklich als Plan beziehungsweise noch nicht produktiv verdrahtete Fälle.
Ihr Vorhandensein wurde deshalb nicht als bestandener Lauf gezählt. Ebenso ist
`ems/netoperator/acceptance-tests.json` ein Abnahmekatalog, kein Feldprüfbericht.

Gezielt ausgeführt am 30.09.2026 auf Linux x86_64 mit Node **24.19.0**:

| Befehl (`node scripts/…`) | Ergebnis | Reichweite |
| --- | --- | --- |
| `verify-stable-1.0.19-grid-share.cjs` | Bestanden, Exit 0 | Synthetische Netz-/PV-Anteile, 120 Mehr-LP-Variationen, Phasen, Zielplanung, injizierte Writer-Tests |
| `verify-stable-1.0.20-storage-allocation.cjs` | Bestanden, Exit 0 | Synthetische Quellentrennung, 240 Mehr-LP-Variationen, Speicherfreigaben, Min+PV und Phasenwahl |
| `verify-zero-export-inverter-mapping.cjs` | Bestanden, Exit 0 | 33 synthetische Konfigurations-, Konflikt-, Alias-, Totband- und Writer-Fälle |
| `verify-energy-flow-regression-cases.js` | Bestanden, Exit 0 | Ausschließlich Struktur/Anker der bestehenden Regressionseinbindung |

Rohbelege: `reports/integration/ui-existing-tests.json` und
`reports/integration/ui-existing-tests.log`. Die ersten drei Skripte prüfen
Fachlogik mit Testadaptern und künstlichen Messdaten. Wörter wie „reale Writer“
in ihrer Ausgabe bezeichnen den verwendeten produktiven Codepfad, keine
Schreibzugriffe auf Geräte. **Vier Skripte bestanden; die einzelnen Fallzahlen
werden nicht als unabhängige vollständige Produkttests addiert.**

Nicht ausgeführt: `test:all`, TypeScript-/Frontend-Neubuild, Publish-Gates,
Installation, Adapterstart mit js-controller, Mesh-Socket-Test, visuelle
Browserregression, Hardware, Backup/Restore und RPi-Lastmessung. Es wurden keine
Abhängigkeiten installiert und keine Produktartefakte neu generiert.

## Nächste konkrete Integrationsschritte

1. Das Nutzer-ZIP mit diesem Hash als Funktionsreferenz festhalten. Danach den
   gewählten GitHub-Zweig mit dieser Quelle vergleichen, bevor Änderungen
   übernommen werden. Das ZIP nicht still durch den Repository-HEAD ersetzen.
2. Tatsächliche Objekt-/State- und Instanzkonfiguration anonymisiert erfassen,
   einschließlich js-controller, Admin, Node, Feldadapter, Firmware und Historie.
   Rollenbezogene Screenshots und Bedienpfade ergänzen die Quellbaseline.
3. Sicherheitsgrenzen am Adapter-Core-/State-/EEBUS-Vertrag einführen. IDs,
   Einheiten, Prioritäten und Fehlerrückmeldungen durch Adapter oder explizite
   Migration erhalten. Physisch wirksame Funktionen nicht durch eine
   Kommunikations- oder Lizenzumstellung unbeabsichtigt freigeben/abschalten.
4. Erst lokal simulieren, dann die konkreten Raspberry-Pi-5-Profile mit 8 und
   16 GB RAM und SSD prüfen. „Linux 12 Lite“ ist bislang eine Nutzeraussage;
   Distribution, Image, Kernel und Architektur sind noch nicht technisch erfasst.
5. Funktionserhalt erst nach rollenbezogenen UI-Tests, Gerätetests sowie Update-,
   Rückfall- und Wiederherstellungstests als nachgewiesen markieren. Diese
   Baseline ist eine Grundlage für die Migration, keine Produktionsfreigabe.
