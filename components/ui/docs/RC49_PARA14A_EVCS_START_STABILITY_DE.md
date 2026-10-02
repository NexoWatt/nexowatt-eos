# RC49 – §14a-/EVCS-Startstabilität (0.8.173)

## Ausgangsbasis

RC49 wurde bewusst **neu aus dem nachweislich startfähigen Stand 0.8.171** erstellt. Die verworfene Version 0.8.172 wurde nicht als Codebasis verwendet. Insbesondere enthält RC49 keinen neuen verzeichnisübergreifenden §14a-Runtime-Helfer.

## Änderungen

### Einzelne Wallbox ohne Station

Eine nicht konfigurierte optionale Stationsgrenze bleibt `nicht gesetzt`. Sie wird nicht mehr durch `Number(null) === 0` in eine harte 0-W-Grenze umgewandelt. Eine echte Stationsrestleistung von 0 W bleibt dagegen verbindlich.

### §14a-Mindestleistung

Bei einer normalen §14a-Steuerungsmaßnahme wird ein externer EMS-Gesamtwert unterhalb der berechneten Mindestleistung auf `Pmin,14a` geklemmt. Ein normaler externer Wert von 0 W ist kein EOS-Sicherheitsstopp. Ein echter technischer Safety-Stop bleibt separat im SafetyEnvelope möglich.

### Lokale PV-Leistung

Die §14a-Grenze wird als netzwirksames Bezugsbudget behandelt. Das zentral physikalisch validierte PV-Restbudget kann zusätzlich verwendet werden. Die finale Safety-Write-Firewall verteilt diese Zusatzfreigabe nur einmal über Gesamt-, App- und Gerätebudgets.

### EEBUS-/Heartbeat-Fallback

Bei abgelaufener Befehlsgültigkeit oder verlorenem Heartbeat wird der letzte verwendbare Grenzwert gehalten. Ist kein Grenzwert nutzbar, berechnet das zentrale §14a-Modul `Pmin,14a`. Ein Kommunikationsausfall erzeugt keinen normalen §14a-0-W-Befehl.

## Zusätzlicher Startschutz

Der Release-Test `verify-package-runtime-start-smoke.js` prüft:

1. Syntax aller ausgelieferten JavaScript-Dateien,
2. Auflösbarkeit aller statischen relativen `require()`-Pfade,
3. Laden von Constraint, EEBUS, SafetyEnvelope, §14a, Charging, Core-Limits, ModuleManager und EMS-Engine,
4. Konstruktion der `main.js`-Adapterinstanz mit neutralen Stubs ausschließlich für externe npm-Pakete.

Der Test wird zusätzlich gegen das **frisch entpackte finale npm-TGZ** ausgeführt.
