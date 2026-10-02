# RC69 – Ladepunkt-Feedback im Dashboard-Systemstatus

## Ziel

RC69 ergänzt im LIVE-Dashboard unter **Systemstatus** eine kompakte, unmittelbar verständliche Ladepunktdiagnose. Betreiber und Kunden sehen damit ohne Wechsel in technische Datenpunkte, **warum ein Fahrzeug gerade lädt, begrenzt lädt, wartet oder gestoppt wurde**.

Die Erweiterung ist ausschließlich lesend. Sie verändert weder Ladeentscheidungen noch §14a-, Netz-, Stations-, Speicher-, Safety- oder Hardware-Writer-Pfade.

## Angezeigte Informationen

Für jeden aktuell konfigurierten und aktiven Ladepunkt werden angezeigt:

- Name und Betriebsmodus;
- Ist- beziehungsweise angeforderte Leistung;
- Laden, begrenzt laden, startbereit oder wartend;
- Fahrzeug nicht verbunden oder kein bestätigter Ladebedarf;
- PV-, Min+PV-, Tarif- oder Zeit-Ziel-Wartezustand;
- aktive Betriebsstrategie;
- §14a-Begrenzung oder lokaler §14a-Kommunikationsfallback;
- Netzanschluss-, Stations-, Phasen- und Peak-Shaving-Begrenzung;
- EOS-Safety-Stopp einschließlich verständlichem Grund;
- Ladepunkt offline, gestört oder nicht verfügbar;
- RFID-Sperre beziehungsweise manuelle Stationssperre;
- unvollständige Datenpunktzuordnung oder fehlender Sollwert;
- veraltete Messwerte;
- nicht bestätigter Hardwarebefehl.

## Systemweite Zusammenfassung

Der bestehende Systemstatus wird entsprechend verdichtet:

- **Alle Systeme normal**;
- Anzahl ladender Ladepunkte;
- Anzahl wartender beziehungsweise begrenzter Ladepunkte;
- Ladepunktfehler;
- **EOS Safety aktiv – Ladepunkte prüfen**.

Warnungen und Fehler färben die Systemstatuskarte gelb beziehungsweise rot. Über **Details** kann direkt das Lademanagement geöffnet werden.

## §14a-Verhalten

RC69 unterscheidet zwischen:

1. einem echten EOS-Safety-Stopp; und
2. dem in RC68 eingeführten lokalen §14a-Kommunikationsfallback.

Ein aktiver Fallback wird als Warnung mit dem wirksamen EVCS-Fallbackbudget angezeigt. Er wird nicht fälschlich als vollständiger Safety-Stopp dargestellt.

## Aktive Geräte

Es werden nur Ladepunkte dargestellt, die im aktuellen Lademanagement-Audit enthalten sind oder deren direkte Runtime-Konfiguration ausdrücklich `cfgEnabled=true` meldet. Deaktivierte, gelöschte und alte verbliebene Runtime-Datenpunkte erscheinen nicht im Kunden-Dashboard.

## Datenquellen

Die Darstellung verwendet ausschließlich bereits veröffentlichte Diagnose- und Runtimewerte, insbesondere:

```text
chargingManagement.audit.snapshotJson
chargingManagement.audit.safetyStage
chargingManagement.control.failsafeDetails
chargingManagement.wallboxes.<LP>.*
para14a.communicationFallbackActive
para14a.communicationFallbackReason
para14a.fallbackEvcsCapW
tarif.state
```

## Sicherheitsvertrag

```text
Lademanagement / Safety / §14a
        ↓
vorhandene Diagnosewerte
        ↓
RC69 Präsentationslogik
        ↓
Dashboard-Systemstatus
```

RC69 erzeugt keine Steuerintents und beschreibt keine Geräte- oder Konfigurationsdatenpunkte.

## Sprachen

Die kundenverständlichen Statusmeldungen stehen in Deutsch, Niederländisch und Englisch zur Verfügung.
