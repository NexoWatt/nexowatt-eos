# NexoWatt UI 0.8.20 – DC Station Display & Energie-Wertkonto

Diese Version erweitert das EOS DC Station Display und korrigiert die Preislogik des Energie-Wertkontos.

## 1. DC Station Display pro Ladestation

Jede angelegte Display-Station besitzt weiterhin eine eigene, isolierte Seite:

```text
/display/station/<TOKEN>
```

Diese Seite ist für das Display einer DC-Ladestation gedacht. Sie zeigt nur die LPs/Connectoren, die im Installer/App-Center dieser Station zugeordnet wurden.

## 2. Bedienung pro LP/Connector

Jede LP-Kachel kann jetzt direkt auf der Stationsseite bedient werden:

- Regelung Aus/An
- Modus Auto / Boost / Min+PV / PV
- Speicher schützen / Mitnutzen
- Ziel-Laden Aus/An
- Start Solar
- Start Schnellladen
- Stoppen

Die Bedienung läuft weiterhin über die sichere NexoWatt-Steuerkette. Die Display-Seite schreibt keine direkten OCPP- oder Herstellerbefehle.

```text
Display Button
→ Display API
→ Token- und Stationsprüfung
→ LP-Zuordnungsprüfung
→ herstellerneutraler NexoWatt-Ladeintent
→ Charging-Management / optionaler Command-State
→ Geräteadapter oder Herstellerintegration
```

## 3. AC-Phasenumschaltung nur bei AC

Die Schalter 1p / 3p / Auto PV erscheinen nur, wenn der jeweilige Ladepunkt als AC erkannt wurde und eine Phasenumschaltung vorhanden ist.

DC-Ladepunkte zeigen diesen Block nicht an. Damit bleibt die Bedienung fachlich korrekt.

## 4. Herstelleroffene Steuerung

NexoWatt bleibt nicht auf OCPP festgelegt. Die Display-Kommandos bleiben neutrale Ladeintents. Eine nachgelagerte Integration kann daraus OCPP-, Modbus-, MQTT-, REST-, NexoWatt-Devices- oder Herstellerbefehle machen.

Im Installer/App-Center bleibt pro Station die Steuerbrücke konfigurierbar:

- Herstelleroffen über NexoWatt EMS
- Generischer JSON-Command-State
- Nur Anzeige

## 5. Energie-Wertkonto mit dynamischem Tarif

Das Energie-Wertkonto nutzt jetzt den dynamischen Zeittarif, wenn dieser aktiv ist und ein aktueller Preis verfügbar ist.

Priorität:

1. Dynamischer Tarif aktiv und aktueller Preis vorhanden → aktueller dynamischer Preis
2. Kein dynamischer Preis verfügbar → fester Preis aus Nutzer-Einstellungen
3. Legacy-Fallback aus alter Installer-Konfiguration
4. Sicherheitsfallback

## 6. Preise liegen im Nutzerfrontend

Die Preisannahmen für das Energie-Wertkonto werden nicht mehr im Installer/App-Center gepflegt.

Der Nutzer stellt sie im Frontend ein:

```text
Einstellungen → Dynamische Zeittarife → Energie-Wertkonto Preise
```

Dort gibt es:

- Fester Netzstrompreis €/kWh
- Einspeisewert €/kWh
- Solar-Ladewert €/kWh

Das App-Center bleibt für Installer-Aufgaben zuständig:

- Datenpunkt-Verknüpfungen
- Landprofil
- Stations-/LP-Zuordnung
- Display-Token
- Steuerbrücken

## 7. Wichtige Tests nach Installation

Nach dem Update prüfen:

1. Adapter starten
2. Energie-Wertkonto öffnen
3. Dynamischen Tarif aktivieren und aktuellen Preis prüfen
4. Feste Preise unter Einstellungen ändern
5. DC Station Display öffnen
6. Pro LP Modus und Regelung testen
7. Prüfen, dass AC-Phasenumschaltung nur bei AC-Ladepunkten erscheint
8. Prüfen, dass DC-Ladepunkte keine 1p/3p-Schalter anzeigen

