# NexoWatt UI 0.8.187 RC62 – Validierungsbericht

**Stand:** 15.08.2026  
**Paket:** `iobroker.nexowatt-ui@0.8.187`  
**Ziel:** Cross-App-Stabilisierung für den letzten anlagenweiten Feldtest vor einer späteren Stable-Freigabe.

## Ergebnis

RC62 hat alle ausgeführten lokalen Release-, Typ-, Runtime-, Browser-, Sicherheits- und App-Regressionsprüfungen bestanden. Im Audit wurden mehrere reale Laufzeitfehler außerhalb der Lade-, Speicher- und Heizstab-Kernregelung gefunden und behoben. Für den automatisierten Prüfstand ist kein verbleibender deterministischer Tick- oder `ReferenceError` bekannt.

RC62 ist damit der **letzte anlagenweite Feldtestkandidat**, aber noch keine allgemeine Stable-Freigabe. Reale Feldgeräte, Herstellerfirmware, Netzwerke, externe APIs und Installationskonfigurationen müssen weiterhin an den vorgesehenen Anlagen geprüft werden.

## Behobene Stabilitätsfehler

### Lademanagement-Diagnose

Der TypeScript-Normalquellenpfad übergab dem finalen Diagnose-/Removal-Publisher einen lokalen Bezeichner `input`, der in dieser Funktion nicht existierte. Der Fehler lag in einem Catch-geschützten Diagnosepfad und konnte deshalb ohne sichtbaren Tickabbruch Diagnoseinformationen unterdrücken. RC62 übergibt jetzt einen expliziten, vollständig definierten Diagnosevertrag.

### EOS Mesh/Microgrid – Backend

Behoben wurden:

- Receiver-Allowlist aus einer nicht definierten `receiver`-Variable im Command-Receive-Pfad;
- fehlende Receiver-Konfiguration im POST- und GET-Feldtest;
- unvollständig initialisierte Peer-Ergebnisfelder;
- Fehlerklassen und Remote-Matrix vor der finalen Peer-Klassifizierung;
- doppelte bzw. widersprüchliche Roundtrip-Felder;
- doppelte Felder in der GET-Feldtestantwort.

### EOS Mesh/Microgrid – Frontend

Die Limitdarstellung verwendete außerhalb ihres Gültigkeitsbereichs liegende Variablen `fairness` und `g`. Der Grenzwert wird jetzt ausschließlich aus der aktuellen Tabellenzeile und ihren wirksamen Limitgründen abgeleitet.

### AppCenter – thermische Geräte und Heizstäbe

Mehr als 60 Bedienpfade riefen `setDirty()` auf, obwohl die Funktion nicht definiert war. Änderungen konnten dadurch die weitere UI-Verarbeitung abbrechen. RC62 enthält einen zentralen Dirty-State-Vertrag; Laden und erfolgreiches Speichern setzen den Status kontrolliert zurück.

### SmartHome-Konfiguration

Veraltete Funktionsnamen wurden auf die vorhandenen aktuellen Helfer umgestellt:

- `nwShTypeLabel` → `nwGetTypeLabel`
- `nwRunValidatorSoon` → `nwScheduleValidation`

Damit brechen Typanzeige und verzögerte Validierung nicht mehr durch fehlende Funktionen ab.

### SmartHome-Kundenansicht

Behoben wurden:

- fehlende Gerätetyp-Icon-Tabelle;
- nicht definierter verzögerter Geräte-Refresh nach Player-, Sender- und Playlistaktionen;
- fehlende Entprellung mehrerer kurz aufeinanderfolgender Refresh-Anforderungen.

### Release- und Spiegelkonsistenz

- manuell typisierte Runtime-Spiegel wurden auf den tatsächlichen Runtime-Stand synchronisiert;
- aktuelle OCPP-Startsemantiken wurden in die RC51-Regression übernommen;
- alte RC53/RC54-Observe-only-Annahmen wurden durch den aktuellen Betriebsstrategien-Feldtestvertrag ersetzt;
- Export-Guard- und Mesh-Prüfungen wurden auf den produktiven Diagnosevertrag aktualisiert;
- ein neuer fail-closed Cross-App-Audit prüft alle 109 ausführbaren Runtime-Quellen ohne den temporären `@ts-nocheck`-Schutz auf ungelöste TS2304-/TS2552-Bezeichner.

## App- und Funktionsbereiche

| Bereich | Automatisierter Status | Schwerpunkt des letzten Feldtests |
|---|---|---|
| Lademanagement, Auto, PV, Min+PV, Zeit-Ziel, Tarif | bestanden | reale Alfen-/Modbus- und OCPP21-Ladevorgänge |
| Speicherregelung | bestanden | reale Vorzeichen, NVP-Ziel, Lade-/Entladerückmeldung |
| Speicherfarm | bestanden | Verteilung, Farm-Dispatch, Recovery und Neustart |
| FENECON, Sungrow, E3DC-Sonderpfade | bestanden | reale Herstellerantwort und Kommunikationsausfall |
| Heizstab | bestanden | PV-Auto tagsüber, Nachtsperre, Manual/Boost-Freigabe |
| Wärmepumpe/Klima und thermische Verbraucher | bestanden | Temperaturgrenzen, maximale Pause, Sensor-Fail-safe |
| §14a | bestanden | echtes Signal, 4,2-kW-Vertrag und Prioritätswirkung |
| Netzlimits, Export Guard, Peak-Shaving | bestanden | reale NVP-Messung, Vorzeichen und Grenzwertsprünge |
| Tarife | bestanden | echter Provider, Freshness, günstig/teuer und Ausfall |
| MultiUse | bestanden | reale SoC-Zonen und Isolation zu anderen Speicherregeln |
| Schwellwert-/Relaissteuerung | bestanden | reale Aktoren, Rückmeldung und sicherer Aus-Zustand |
| BHKW/Generator | generischer Aktorvertrag bestanden | konkrete Anlagen-DP und Herstellerfreigaben |
| KI-Energieberater | Typ-/Payloadvertrag bestanden | Datenqualität und rein beratende Wirkung prüfen |
| Energie-Wertkonto/Ledger | bestanden | Langzeitdaten und Tageswechsel |
| Energieherkunft/Ladebilanz | bestanden | reale Zählerstände und Bilanzgrenzen |
| Netzbetreiber-Schnittstelle | Foundation/read-only bestanden | realen Treiber erst nach Herstellerfreigabe testen |
| EOS Mesh/Microgrid | Backend-/Frontendtests bestanden | echter Zwei-Instanzen-/Tailscale-Test erforderlich |
| Betriebsstrategien | aktueller Feldtestvertrag bestanden | zuerst Observe, dann genau eine Ressource aktivieren |
| Energiefluss | bestanden | reale Messpunktzuordnung und 5-s-Aktualisierung |
| AppCenter | bestanden | Laden, Ändern, Speichern und Reload je Anlage |
| SmartHome/NexoLogic | bestanden | reale Kacheln, Szenen, Player und DP-Schreibrechte |

## Ausgeführte Release-Prüfungen

### Vollständiges Publish-Gate

```text
231 von 231 Schritten bestanden
Laufzeit: 52,2 Sekunden
Exit-Code: 0
```

Das Gate enthält unter anderem Typprüfung, Safety-Envelope, Aktor-Arbitrierung, Speicher-/Farmregressionen, Lademanagement, §14a, Tarife, thermische Regelung, Heizstab, AppCenter, SmartHome/NexoLogic, Betriebsstrategien und Paketstart.

### Gesamttest

```text
npm run test:all
Exit-Code: 0
```

### Struktur- und Runtime-Prüfung

```text
705 TypeScript-Quelldateien syntaktisch gültig
109 produktive Runtime-Quellen im Cross-App-Identifier-Audit
460 Runtime-TS-/TSX-Spiegel synchron
161 JS/MJS-Dateien im Paketstart-Smoke geprüft
relative require()-Pfade vollständig
main.js-/EMS-/§14a-Startkette konstruierbar
```

### Paketprüfung

```text
Release-Artefaktmanifest: 262 Produktdateien
npm-Paketdateien:         263
npm-Paketgröße:           7.317.523 Byte
ungepackte Größe:         16.540.467 Byte
npm pack --dry-run:       bestanden
publish:check:            bestanden
verify-publish.js:        bestanden
```

## Bewusste Restgrenzen

Die folgenden Punkte können nur im realen Anlagenbetrieb abschließend bewertet werden:

- Herstellerfirmware und Fahrzeugreaktion;
- Modbus-/OCPP-/Netzwerk-Latenzen und Kommunikationsabbrüche;
- echte Tarif-, Prognose- und Wetterprovider;
- reale Tailscale-/Mesh-Gegenstellen;
- kundenspezifische manuelle Datenpunktzuordnungen;
- Aktor-Rückmeldungen von BHKW, Generator, Relais und thermischen Geräten;
- Langzeitverhalten über mehrere Tage, Tageswechsel und Neustarts.

Ein falscher oder nicht schreibbarer Kundendatenpunkt kann durch Softwaretests nicht automatisch in einen korrekten Hardwarevertrag verwandelt werden. Schreibpfade müssen daher bei der Inbetriebnahme mit Rückmeldung geprüft werden.

## Freigabeempfehlung

RC62 kann an den vorgesehenen Anlagen kontrolliert getestet werden. Die Stable-Freigabe sollte erst erfolgen, wenn die beigefügte Feldtest-Checkliste einschließlich Neustart, Kommunikationsausfall, Safety-Stopp und mindestens mehrtägigem Dauerbetrieb ohne ungeklärten Fehler abgeschlossen ist.
