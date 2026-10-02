# NexoWatt UI 0.8.186 RC61 – Anlagenweiter Feldtest und Heizstab-Nachtfreigabe

## Ziel

RC61 ist ein reines Stabilitäts- und Feldtest-Release. Es ergänzt keine zweite Geräteansteuerung. Ladepunkte, Speicher, Speicherfarm, Thermik und Heizstäbe bleiben über ihre vorhandenen Fachmodule und den bestehenden Single Writer geführt.

Die Schwerpunkte sind:

- gerätespezifische Sollwert-Keepalives für Ladepunkte,
- direkte Bestätigung der tatsächlich angeforderten und angewendeten OCPP21-Ladegrenze,
- explizite 0-W-Pause zusammen mit NexoWatt OCPP 0.4.1,
- Trennung lokaler EVCS-Startfehler vom globalen Speicher-/Safety-Betrieb,
- Heizstab-PV-Auto nachts nur nach manueller Freigabe.

## Heizstab: Nachtbetrieb

Die Heizstab-App besitzt unter **Auto – Budget & Speicher** folgende Einstellungen:

- **PV-Auto nachts sperren** – standardmäßig aktiv,
- **Nacht beginnt** – Standard `20:00`,
- **Nacht endet** – Standard `06:00`.

Das Zeitfenster verwendet die lokale Uhrzeit des EOS-Controllers und darf über Mitternacht laufen.

### Verhalten im Nachtfenster

PV-Auto darf keine Heizstab-Stufe selbstständig halten oder einschalten. Eine zuvor automatisch übernommene Stufe wird auf 0 gesetzt.

Zulässig bleiben ausschließlich ausdrückliche Freigaben:

- Manual 1,
- Manual 2,
- Manual 3,
- Boost,
- eindeutig erkannte externe manuelle KNX-/Relais-Schaltung.

§14a-, Netz-, Geräte- und Safety-Grenzen bleiben auch bei manueller Freigabe übergeordnet. Wird dieselbe Uhrzeit für Start und Ende eingetragen, behandelt das EOS dies fail-safe als ganztägige Handfreigabe-Pflicht.

### Diagnose

Unter `heatingRod.summary` stehen:

- `nightPvAutoBlockEnabled`,
- `nightWindowActive`,
- `nightStartTime`,
- `nightEndTime`,
- `nightManualOnly`,
- `nightBlockReason`.

Je Heizstab stehen zusätzlich:

- `nightWindowActive`,
- `nightPvAutoBlocked`,
- `nightManualReleaseAllowed`.

## Ladepunkt-Keepalives

Unveränderte Sollwerte werden abhängig vom Geräteprofil erneuert:

| Geräteprofil | Standard-Keepalive |
|---|---:|
| Alfen | 15 Sekunden |
| Modbus / NexoWatt Devices | 20 Sekunden |
| generische Zuordnung | 30 Sekunden |
| NexoWatt OCPP21 | 45 Sekunden |

Ein expliziter Installerwert `setpointKeepaliveSec` beziehungsweise ein kompatibler Refresh-Wert gewinnt. Damit bleibt insbesondere die externe Alfen-/Modbus-Vorgabe sicher unter typischen 60-Sekunden-Gültigkeiten.

## OCPP21-Befehlsbestätigung

NexoWatt UI liest direkt aus dem nativen OCPP21-Baum:

- `control.requestedChargeLimit`,
- `control.appliedChargeLimit`,
- `control.chargeLimitReason`,
- `control.chargeLimitClamped`,
- `control.lastSuccess`,
- `control.lastError`,
- `control.lastCommandAt`.

Die Diagnose unterscheidet dadurch zwischen:

- ioBroker-Datenpunkt geschrieben,
- OCPP-Befehl noch ausstehend,
- von der Station bestätigt,
- abgelehnt,
- angefordert, aber nicht angewendet,
- alter positiver Sollwert trotz 0-W-Anforderung gehalten.

Unter `chargingManagement.wallboxes.<Ladepunkt>` stehen unter anderem:

- `setpointRefreshMs`,
- `hardwareCommandConfirmed`,
- `hardwareCommandState`,
- `hardwareCommandAgeMs`,
- `ocppRequestedChargeLimitW`,
- `ocppAppliedChargeLimitW`,
- `ocppChargeLimitReason`,
- `ocppChargeLimitClamped`.

## OCPP-0-W-Pause

Für OCPP-Anlagen ist NexoWatt OCPP 0.4.1 vorgesehen. Dort ist `eosSafeZeroProfile` standardmäßig aktiv. Eine NexoWatt-EOS-Vorgabe von 0 W wird damit als explizites Null-Ladeprofil gesendet.

Wird die Kompatibilitätsoption deaktiviert und die Station hält stattdessen die letzte positive Grenze, erkennt NexoWatt UI dies als **nicht bestätigten Stopp**. Ein erforderlicher Sicherheitsstopp bleibt dann fail-closed.

## Safety-Domänen

Ein fehlgeschlagener positiver Start oder eine nicht ausgeführte Leistungserhöhung eines Ladepunkts bleibt in RC61 lokal in der EVCS-Domäne. Die Speicherfarm wird dadurch nicht global gestoppt.

Global fail-closed bleibt weiterhin:

- ein bereits laufender Ladepunkt soll aus einem Safety-Grund auf 0 W,
- der Stopp ist nicht erreichbar oder wird nicht bestätigt,
- Netz-, Phasen-, §14a-, Parkregler- oder Not-Aus-Grenzen verlangen den Stopp.

Damit gilt:

```text
EVCS-Startfehler → Ladepunkt lokal gestört, Speicherregelung darf gesund weiterarbeiten
EVCS-Pflichtstopp nicht bestätigt → globales Safety-Envelope ungültig
```

## Installationsreihenfolge

Für Anlagen mit NexoWatt OCPP21:

1. NexoWatt OCPP 0.4.1 installieren.
2. OCPP-Instanz neu starten.
3. Prüfen, dass `eosSafeZeroProfile` aktiv ist.
4. NexoWatt UI 0.8.186 RC61 installieren.
5. NexoWatt-UI-Instanz neu starten.
6. OCPP-Zuordnungen müssen direkt mit `ocpp21.<Instanz>.<Station>` beginnen.

Für reine Modbus-/NexoWatt-Devices-Anlagen genügt die Aktualisierung von NexoWatt UI.

## Verbindliche Feldprüfung pro Anlage

1. Systemstatus ohne Tickfehler prüfen.
2. Speicherfarm mit kleiner Be- und Entladevorgabe prüfen.
3. Wallbox ohne Fahrzeug prüfen.
4. Fahrzeug verbinden und Auto starten.
5. PV-Überschuss und Min+PV prüfen.
6. günstigen sowie teuren Tarif prüfen.
7. Zeit-Ziel-Laden prüfen.
8. Ladepunkt aus aktivem Betrieb sicher auf 0 W setzen.
9. Adapter-/Netzwerkunterbrechung prüfen.
10. §14a-, Netz- und Stationsbegrenzung prüfen.
11. Heizstab tagsüber im PV-Auto prüfen.
12. Heizstab im Nachtfenster prüfen: PV-Auto aus, Manual/Boost erlaubt.

RC61 ist als kontrollierter anlagenweiter Feldtestkandidat vorgesehen. Die Softwarepfade sind automatisiert geprüft; die konkrete Stations-, Fahrzeug-, Speicher- und Firmwarekombination bleibt vor einer Stable-Freigabe real abzunehmen.
