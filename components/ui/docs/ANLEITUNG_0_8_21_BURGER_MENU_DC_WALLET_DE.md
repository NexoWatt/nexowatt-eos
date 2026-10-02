# Anleitung NexoWatt UI 0.8.21 – Burger-Menü, DC-Display und dynamisches Energie-Wertkonto

## Ziel der Version

Version 0.8.21 stabilisiert den 0.8.20-Funktionsstand und behebt das Burger-Menü im Frontend. Enthalten bleiben:

- DC Station Display mit eigener Bedienung je zugeordnetem Ladepunkt/Connector.
- AC-Phasenumschaltung nur bei AC-Ladepunkten mit konfigurierter Phasenumschaltung.
- Herstellerneutrale Steuerbrücke für OCPP, Modbus, MQTT, REST, Herstelleradapter oder NexoWatt-Devices.
- Energie-Wertkonto mit dynamischem Zeittarif.
- Feste Energie-Wertkonto-Preise im Nutzerfrontend unter Einstellungen.

## Burger-Menü prüfen

Nach Installation bitte prüfen:

1. LIVE öffnen.
2. Burger-Menü oben rechts öffnen.
3. Menü muss offen bleiben, bis ein Menüpunkt oder ein Bereich außerhalb des Menüs geklickt wird.
4. History öffnen und wiederholen.
5. EVCS öffnen und wiederholen.
6. Einstellungen öffnen und wiederholen.
7. Report-Seiten öffnen, falls genutzt.

Technisch verhindert ein gemeinsamer `nwMenuBound`-Guard, dass Seiten-Skripte und `nw-shell.js` denselben Button doppelt toggeln.

## DC Station Display prüfen

Für jede angelegte DC-Station gilt:

```text
/display/station/<TOKEN>
```

Auf dem Display werden nur die Ladepunkte/Connectoren angezeigt, die dieser Station im Installer/App-Center zugeordnet sind.

Pro LP/Connector sind vorgesehen:

- Regelung An/Aus
- Modus Auto / Boost / Min+PV / PV
- Speicher schützen / mitnutzen, wenn freigegeben
- Ziel-Laden An/Aus
- Solar laden
- Schnell laden
- Stoppen

Die AC-Phasenumschaltung erscheint nur, wenn der Ladepunkt als AC-Lader erkannt wird und eine Phasenumschaltung konfiguriert ist. DC-Ladepunkte zeigen keinen 1p/3p-Block.

## Herstellerneutrale Steuerung

Die Display-Seite schreibt keine OCPP- oder Herstellerbefehle direkt. Der Ablauf ist:

```text
Display Button
→ tokenisierte Display-API
→ Stations-/LP-Prüfung
→ neutraler NexoWatt-Ladeintent
→ Charging-Management oder generischer JSON-Command-State
→ OCPP / Modbus / MQTT / REST / Herstelleradapter / NexoWatt-Devices
```

Der optionale Command-State kann im Installer/App-Center pro Station gesetzt werden.

## Energie-Wertkonto und dynamische Tarife

Das Energie-Wertkonto nutzt:

1. bei aktivem dynamischem Zeittarif und gültigem aktuellem Preis den dynamischen Tarifpreis,
2. sonst den festen Netzstrompreis aus dem Nutzerfrontend unter Einstellungen.

Die festen Preise liegen im Nutzerfrontend, nicht im Installerbereich:

```text
Einstellungen → Dynamische Zeittarife / Energie-Wertkonto Preise
```

Dort kann der Betreiber pflegen:

- fester Netzstrompreis €/kWh
- Einspeise-/Rücklieferwert €/kWh
- Solar-Ladepunktwert €/kWh

Der Installerbereich bleibt für Datenpunkt-Verknüpfungen, Stationszuordnung und technische Freigaben zuständig.

## Abnahme

Eine Installation gilt als erfolgreich geprüft, wenn:

- Burger-Menü auf LIVE, History, EVCS und Einstellungen öffnet und stabil bleibt.
- DC-Display pro Station nur die zugeordneten LPs zeigt.
- AC-Phasenumschaltung nicht bei DC-Ladepunkten erscheint.
- Energie-Wertkonto bei aktivem dynamischem Tarif den aktuellen Tarifpreis nutzt.
- Feste Preise im Nutzerfrontend gespeichert und nach Reload wieder angezeigt werden.
