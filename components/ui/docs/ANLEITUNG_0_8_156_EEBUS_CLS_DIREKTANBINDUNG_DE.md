# NexoWatt UI 0.8.156 RC32 – direkte EEBUS-/CLS-Anbindung

## Ziel

NexoWatt EOS übernimmt §14a-LPC-Vorgaben aus dem NexoWatt-EEBUS-Adapter direkt über eine versionierte Adapter-API. Für die CLS-Box müssen im AppCenter keine Aktiv-, Grenzwert-, Heartbeat- oder Failsafe-Datenpunkte mehr manuell ausgewählt werden.

## Regelkette

```text
CLS-/Steuerbox
  -> EEBUS SHIP/SPINE IF_CLS_CTRL / LPC
  -> ioBroker.eebus 0.3.0
  -> direkte NexoWatt-API im Arbeitsspeicher
  -> zentraler §14a-Regler
  -> Core Limits und Verbraucherregler
  -> Ladepunkte, Speicher-Netzladung, Wärmepumpen und Klimageräte
```

Die 60/30/0-Erzeugerregelung der PV-Wechselrichter bleibt davon fachlich getrennt.

## Reaktionspfad

1. Der EEBUS-Adapter parst den LPC-Befehl vor allen Diagnose- und Rohdaten-Schreibvorgängen.
2. Der zeitkritische Befehl wird genau einmal per `sendTo` an die automatisch erkannte NexoWatt-UI-Instanz übertragen. Es gibt keinen automatischen Transport-Retry; echte Wiederholungen der CLS-/SPINE-Gegenstelle bleiben durch die stabile Command-ID idempotent – auch wenn eine Wiederholung bereits eintrifft, während die erste interne Annahmeantwort noch aussteht.
3. EOS legt den Befehl im Arbeitsspeicher ab und plant einen vollständigen EMS-Regelzyklus mit 0 ms Zusatzverzögerung.
4. Erst danach werden Diagnose-Datenpunkte geschrieben.
5. Nach Abschluss des vollständigen zentralen Regelzyklus erhält der EEBUS-Adapter die effektive Regler-Rückmeldung.

Ein bereits laufender EMS-Zyklus wird nicht parallel ausgeführt. Der neue §14a-Befehl bleibt vorgemerkt und startet unmittelbar nach dem laufenden Zyklus einen Folgetick.

## Direkte Regelung und abschließende Rückmeldung

- **Sofortiger interner Reglerpfad:** EOS bestätigt dem EEBUS-Adapter die Annahme im Arbeitsspeicher und startet den vollständigen EMS-Zyklus mit 0 ms Zusatzverzögerung.
- **Positive CLS-Rückmeldung erst nach Umsetzung:** Eine positive korrelierte SPINE-ResultData wird erst gesendet, wenn §14a, Core-Limits und die aktiven Verbraucher-/Schreibpfade den Befehl erfolgreich verarbeitet haben. Eine unmittelbare Ablehnung wird sofort negativ quittiert.
- **Effektiver Regler-Readback:** Nach der positiven ResultData wird die tatsächlich wirksame zentrale LoadControl-Grenze zurückgemeldet.

Meldet ein aktiver Geräte- oder Schreibpfad einen Fehler, wird eine abschließende negative ResultData gesendet und kein positiver LoadControl-Readback erzeugt. Eine reine EVCS-Istleistung wird nicht als vollständige Gesamtleistung aller steuerbaren Verbraucher ausgegeben.

## Feldtest-Zielzeiten

| Messpunkt | Standardziel |
|---|---:|
| CLS-Eingang bis EOS-Annahme | 250 ms |
| CLS-Eingang bis vollständiger zentraler Regel-/Schreibzyklus | 1.000 ms |
| CLS-Eingang bis erzeugter Umsetzungsrückmeldung | 1.500 ms |
| Maximale Wartezeit auf die Umsetzungsrückmeldung | 5.000 ms |

Die Zielzeiten sind konfigurierbare NexoWatt-Engineering-Ziele für Feldtests und Diagnose. Sie sind keine pauschalen gesetzlichen Fristen.

## Heartbeat und Failsafe

Heartbeat, Befehlslaufzeit und Failsafe werden autoritativ im EEBUS-Adapter überwacht. EOS erzeugt keine zweite, konkurrierende Ablauf- oder Failsafe-Logik.

- Ein Kommunikationsfehler darf die erlaubte Leistung niemals erhöhen.
- Ist ein Failsafe-Grenzwert konfiguriert, wird höchstens der strengere Wert aus bisheriger Grenze und Failsafe verwendet.
- Ohne Failsafe-Grenzwert bleibt die letzte restriktive Vorgabe erhalten.
- Ein wiederkehrender Heartbeat hebt den Failsafe nicht sofort automatisch auf. Ein neuer expliziter LPC-Befehl oder eine Freigabe der CLS-Box kann vorher einen neuen Zustand setzen.
- Ohne neuen Befehl bleibt ein konfigurierter Failsafe für die von der CLS-Box übertragene Dauer aktiv und wird danach über denselben direkten EOS-Regelpfad freigegeben. Diese lokale Folgetransaktion verwendet nicht die alte SPINE-Quittung erneut.
- Liefert die Gegenstelle keine gültige Failsafe-Dauer, bleibt als konservativer Feldtest-Fallback die letzte restriktive Vorgabe bis zu einem neuen expliziten LPC-Befehl oder Release aktiv.

## Inbetriebnahme

1. `ioBroker.eebus` 0.3.0 und `nexowatt-ui` 0.8.156 auf demselben ioBroker-System installieren.
2. Im EEBUS-Adapter **Direkte §14a-API zu NexoWatt EOS aktivieren** einschalten.
3. Zielinstanz auf `auto` belassen; bei mehreren EOS-Instanzen die gewünschte Instanz fest eintragen.
4. **CLS-Leistungsgrenzen automatisch anwenden** aktivieren.
5. §14a im NexoWatt AppCenter installieren und aktivieren.
6. EEBUS-Pairing mit der CLS-Box durchführen und die Gegenstelle ausdrücklich als vertrauenswürdig freigeben.
7. Vor dem Feldbetrieb `commandDryRun` nur dann deaktivieren, wenn SHIP-Datenaustausch, Pairing und Adressen geprüft wurden.

## Diagnose

Im EEBUS-Adapter:

```text
bridge.connected
bridge.readyForControl
bridge.status
bridge.lastAcceptanceLatencyMs
bridge.lastControlLatencyMs
bridge.lastFeedbackLatencyMs
bridge.timingAcceptanceOk
bridge.timingControlOk
bridge.timingFeedbackOk
cls.active
cls.limitW
cls.failsafeActive
cls.heartbeatHealthy
```

In NexoWatt UI:

```text
para14a.api.connected
para14a.api.status
para14a.api.requestedLimitW
para14a.api.effectiveLimitW
para14a.api.acceptanceLatencyMs
para14a.api.controlLatencyMs
para14a.api.feedbackLatencyMs
para14a.api.lastError
```

## Feldtestfälle

- Aktive LPC-Grenze mit 4.200 W
- Größerer externer EMS-Grenzwert
- Freigabe/Release
- Wiederholung derselben Command-ID
- Neuer Befehl während eines laufenden EMS-Zyklus
- Heartbeat-Ausfall mit und ohne Failsafe-Grenzwert
- Heartbeat-Wiederkehr ohne neuen LPC-Befehl
- Nicht vertrauenswürdige CLS-Gegenstelle
- Ausfall eines Ladepunkt-, Speicher- oder Thermik-Schreibpfads
- Neustart von EEBUS- und UI-Adapter in unterschiedlicher Reihenfolge

Vor einer Aussage zur vollständigen Interoperabilität ist ein Hardwaretest mit der konkret eingesetzten CLS-/Steuerbox erforderlich.
