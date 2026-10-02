# Anleitung 0.8.17 – EOS DC Station Display

## Ziel

Mit dem EOS DC Station Display kann pro physischer DC-Ladestation eine separate Vollbildseite betrieben werden. Diese Seite läuft z. B. auf dem Touchdisplay der Ladestation und zeigt nur die im Installer zugeordneten LPs/Connectoren.

## Wichtiges Bedienkonzept

- Normales Frontend: nur Nutzeranzeige und Bedienung.
- Installer/App-Center: alle Einstellungen, Token und LP-Zuordnungen.
- Display-Seite: keine Navigation, keine Admin-Funktionen, keine Datenpunkt-Verknüpfungen.

## Einrichtung im Installerbereich

1. App-Center öffnen.
2. EOS-Lizenz aktivieren.
3. App **DC Station Display** installieren und aktivieren.
4. In der Karte **EOS DC Station Display** eine Station anlegen.
5. Stationsname vergeben, z. B. `DC Ladestation 01`.
6. Token erzeugen.
7. Zugeordnete LPs eintragen, z. B. `lp1, lp2`.
8. Solar laden / Schnell laden erlauben.
9. Optional Solarpreis und Schnellladepreis setzen.
10. Speichern.

## Display-URL

Nach dem Speichern ist die Seite erreichbar unter:

```text
/display/station/<token>
```

Beispiel:

```text
http://<iobroker-ip>:8188/display/station/ST-XXXX-XXXX
```

## Sicherheit

Die Display-Seite prüft:

- EOS-Lizenz vorhanden
- Token gültig
- Station aktiv
- LP der Station zugeordnet
- Modus erlaubt

Ein Display kann dadurch keine fremden Stationen oder andere LPs steuern.

## Unterstützte Aktionen

- Status anzeigen
- Solar laden starten
- Schnell laden starten
- Laden stoppen
- aktuelle Leistung anzeigen
- Session-kWh und Kosten anzeigen, soweit Daten vorhanden sind
- PV-Anteil anzeigen, soweit PV-Überschussdaten vorhanden sind

## Noch nicht enthalten

Diese Version enthält bewusst noch keine Payment-, Roaming-, Beleg- oder RFID-Pflichtlogik. Diese Themen gehören in spätere EOS-Schritte.
