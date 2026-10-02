# Ladepunkte – regelmäßige Live-Status- und Messwertfrische (0.5.154)

## Ausgangslage

Ein inaktiver Ladepunkt kann über viele Stunden unverändert folgende Werte liefern:

```text
Leistung             0 W
Fahrzeug verbunden   false
Laden                 false
Status                verfügbar / bereit
```

Der Device-Adapter liest diese Werte weiterhin zyklisch. Bis einschließlich 0.5.153 hat der generische State-Cache jedoch identische Werte nicht erneut an ioBroker geschrieben. Dadurch blieb der ioBroker-Zeitstempel des Messwerts alt, obwohl der Ladepunkt alle fünf Sekunden korrekt antwortete. Eine übergeordnete Sicherheitsprüfung konnte das als veralteten Messwert interpretieren und `Messwert-Failsafe · safe-zero` aktivieren.

## Korrektur

Für alle Geräte der Alias-Contract-Klasse `evCharger` werden sicherheitsrelevante Rückmeldungen nach einem echten erfolgreichen Gerätesnapshot periodisch erneut mit `ack=true` bestätigt. Der Wert und der Änderungszeitpunkt (`lc`) bleiben unverändert; der Empfangs-/Aktualisierungszeitpunkt (`ts`) wird erneuert.

Standardmäßig erfolgt die Bestätigung alle fünf Sekunden. Sehr schnelle Geräte werden auf mindestens eine Sekunde und höchstens zehn Sekunden begrenzt; ein langsameres Gerät kann naturgemäß nur bei seinem tatsächlichen Empfangstakt frische Daten bestätigen.

Betroffen sind insbesondere:

```text
aliases.r.comm/online/offline
aliases.r.status/statusCode/statusText
aliases.r.available
aliases.r.vehicleConnected
aliases.r.charging
aliases.r.power/powerEstimated
aliases.r.currentA/currentL1/currentL2/currentL3
```

Dieselben Rückmeldungen werden auch unter `aliases.v1.*` aktuell gehalten.

## Sicherheitsgrenze

Die Wiederholung ist **kein künstlicher Timer-Heartbeat**. Sie wird nur ausgeführt, wenn der Adapter gerade einen echten erfolgreichen Poll beziehungsweise einen neuen Event-Snapshot vom Gerät verarbeitet hat.

Bei Timeout, Kommunikationsabbruch oder leerem Snapshot gilt deshalb:

- keine erneute Bestätigung von Leistung oder Status,
- `lastSeenMs` bleibt auf dem letzten echten Empfang,
- `online` fällt nach dem Heartbeat-Timeout auf `false`,
- vorhandene herstellerspezifische Failsafes bleiben aktiv.

## Lastbegrenzung

Nicht periodisch wiederholt werden:

- Firmware- und Gerätedaten,
- statische Metadaten,
- kumulierte Energiezähler,
- Sollwert- und Befehlsaliase,
- beliebige nicht sicherheitsrelevante Datenpunkte.

Damit bleibt die zusätzliche ioBroker-Last auf die wenigen für das Lademanagement benötigten Live-Rückmeldungen begrenzt.

## Kompatibilität

Die Änderung liegt ausschließlich in der generischen Laufzeitbehandlung der Ladepunkt-Rückmeldungen. Es wurden keine Herstellerregister, Datenpunkt-IDs, Datentypen, Einheiten, Legacy-Alias-Pfade oder Schreibumrechnungen verändert.

Sie gilt zentral für alle `EVCS`-/`EVSE`-Templates, unter anderem MENNEKES, ABL, Alfen, KEBA, Weidmüller, go-e, Webasto, Heidelberg, Spelsberg und Alpitronic.
