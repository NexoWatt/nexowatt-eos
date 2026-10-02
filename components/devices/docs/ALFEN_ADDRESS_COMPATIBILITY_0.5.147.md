# Alfen ACE – adaptive Schreibadressierung 0.5.147

## Ausgangslage

Die offizielle Alfen-Unterlage *Modbus for ACE – Configuration Guide*, Version 1.0 (05/2025), beschreibt für Socket 1/2:

- Unit-ID `1` beziehungsweise `2`
- Max Current als `FLOAT32` in Dokumentregistern `1210..1211`
- Modbus-Protokolladresse `1209` (Dokumentregister minus 1)
- FC16 mit beiden Registern in einer Anfrage
- Network Byte Order innerhalb jedes 16-Bit-Wortes
- Low-Word-First für 32-Bit-Werte

Diese dokumentierte Variante bleibt im Template unverändert der Standard.

Im Feldtest mit einer Eve Single NG910 und Controller-Firmware `6.6.2-4396` antwortete der Server auf

```text
UID1 FC16@1209 len=2
```

jedoch mit Modbus Exception 2 (`Illegal Data Address`). Da ein Teil bestehender Integrationen die direkte Tabellenadresse verwendet, ergänzt Version 0.5.147 eine eng begrenzte Laufzeit-Kompatibilitätsprüfung.

## Ablauf der neuen Erkennung

1. Der Adapter schreibt zuerst weiterhin die offizielle Variante:

   ```text
   UID1/2 FC16@1209 len=2, Low-Word-First
   ```

2. Nur bei **Modbus Exception 2** wird einmalig die direkte Tabellenadresse geprüft:

   ```text
   UID1/2 FC16@1210 len=2
   ```

3. Vor dem ersten Kompatibilitätsschreibzugriff liest der Adapter den konfigurierten Safe Current. Aus dem plausiblen Wert `1..80 A` wird erkannt, ob der konkrete Server 32-Bit-Werte Low-Word-First oder MSW-First bereitstellt.

4. Die funktionierende Variante wird pro Datenpunkt und Unit-ID im laufenden Treiber gespeichert. Weitere Sollwerte und der 5-s-Watchdog verwenden sofort die erkannte Variante.

5. Nur die dazugehörigen Alfen-Steuer-Rückmeldungen werden intern mit demselben Adressoffset und derselben 32-Bit-Wortreihenfolge gelesen.

6. Nach Adapter- oder Wallbox-Neustart beginnt die Prüfung bewusst wieder mit der offiziellen Variante. Es wird keine dauerhafte Migration in Datenpunkten oder Konfigurationsdateien gespeichert.

## Sicherheitsregeln

- Exception 3 (`Illegal Data Value`) löst **keinen** Adresswechsel aus.
- Transportfehler, Timeouts und beliebige andere Modbusfehler lösen ebenfalls keinen Adresswechsel aus.
- Template-Adressen, Unit-IDs, Aliase und vorhandene ioBroker-Datenpunkte bleiben unverändert.
- `aliases.*` bleibt die bisherige Produktionsschnittstelle.
- `aliases.v1.*` bleibt die additive standardisierte Schnittstelle für das NexoWatt UI.
- Keine vorhandenen Objekte oder Zustände werden gelöscht.

## Diagnose im Feldtest

Bei erfolgreicher Kompatibilitätserkennung erscheint einmalig eine Meldung ähnlich:

```text
Alfen ACE compatibility mode selected for sET_CHARGING_CURRENT:
UID1 FC16@1210, wordOrder=le, byteOrder=be.
Safe-current probe UID1@1212: LE=16, BE=<unplausibel>, selected=le.
```

Danach folgt die vorhandene Annahmebestätigung:

```text
Alfen Modbus write accepted:
sET_CHARGING_CURRENT UID1 FC16@1210 len=2 value=16 ...
```

Die endgültige Bestätigung, dass ACE den Sollwert nicht nur transportseitig angenommen, sondern in die Ladeberechnung übernommen hat, erfolgt weiterhin über:

```text
aliases.r.currentLimitValidTimeS
aliases.r.setpointAccountedFor
aliases.r.appliedCurrentLimitA
```

Werden sowohl `@1209` als auch `@1210` mit Exception 2 abgelehnt, nennt die Fehlermeldung ausdrücklich die ACE-Einstellungen unter **Advanced Settings**:

- Allow writing maximum currents
- Enable sockets (bei Socket-Modus)
- Active Load Balancing aktiviert
- Data Source = Energy Management System
- TCP/IP EMS Control Mode = Socket

## Rückwärtskompatibilität

Die Änderung liegt ausschließlich im Alfen-spezifischen Schreibtreiber. Die 181 Templates und sämtliche bisherigen Aliasdefinitionen bleiben bytegleich zur abgesicherten Produktionsbaseline. Dadurch erhalten funktionierende Bestandsanlagen weiterhin exakt das bisherige erste Telegramm auf `@1209`; die zusätzliche Variante wird dort nie ausgeführt, solange die Wallbox den offiziellen Schreibzugriff akzeptiert.
