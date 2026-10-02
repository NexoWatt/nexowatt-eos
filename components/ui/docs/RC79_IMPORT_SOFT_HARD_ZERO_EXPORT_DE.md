# RC79 – Import-Soft-/Hard-Limit und verbrauchsgeführte 0-Einspeisung

> **Hinweis für Version 0.8.205 / RC80:** Die in RC79 noch konfigurierbare beziehungsweise begrenzte Soft-Reserve wurde ersetzt. Aktuell gilt verbindlich: Reserve = exakt 10 % der wirksamen NVP-/Hard-Vorgabe und Soft-Limit = 90 %. Es gibt keinen Mindestwert, keinen Maximalwert und keine manuelle Übersteuerung. Maßgeblich ist `RC80_SOFT_LIMIT_FIXED_TEN_PERCENT_DE.md`.

## Ziel

RC79 trennt die Netzbezugsregelung in zwei Ebenen und erweitert die vorhandene 0-Einspeiseregelung um eine vorausschauende PV-Vorgabe. Die Konfiguration befindet sich im AppCenter unter **Netzlimits**.

Der Vorzeichenvertrag am Netzverknüpfungspunkt bleibt unverändert:

- positiver NVP: Netzbezug
- negativer NVP: Netzeinspeisung

Die Importgrenzen gelten ausschließlich für Netzbezug. Eine Einspeisung erhöht deshalb den verfügbaren Last-Headroom.

## Hard-Limit

Das Hard-Limit ist die absolute Bezugsgrenze der Anlage. Es wird aus der expliziten RC79-Konfiguration, andernfalls aus der Anschlussleistung und gegebenenfalls einer strengeren RLM-Grenze gebildet.

```text
Hard-Headroom = Hard-Limit − signierter NVP
```

Das Hard-Limit bleibt in Safety-Envelope und Final-Writer wirksam. §14a, Park-/EZA-Regler, Phasen-, Stations-, Geräte- und Kommunikationsgrenzen bleiben übergeordnet.

## Soft-Limit

Das Soft-Limit liegt unterhalb des Hard-Limits und wird für die vorausschauende Planung flexibler Lasten verwendet. Ab RC80 wird es verbindlich aus der wirksamen NVP-/Hard-Vorgabe berechnet:

```text
Soft-Reserve = Hard-Limit × 10 %
Soft-Limit   = Hard-Limit − Soft-Reserve
             = Hard-Limit × 90 %
```

Es gibt keinen Mindestwert, keinen Maximalwert und keine manuelle Übersteuerung. Eine dynamisch strengere RLM- oder Netzbetreibergrenze wird zunächst zum wirksamen Hard-Limit; anschließend werden daraus erneut 10 % Reserve und 90 % Soft-Limit berechnet.

```text
Soft-Headroom = Soft-Limit − signierter NVP
```

Hysterese und verzögerte Wiederfreigabe verhindern, dass Verbraucher bei kleinen Messschwankungen ständig auf- und abgeregelt werden. Die Diagnose veröffentlicht Stufe, Ursache, Reserve, Soft-/Hard-Headroom und erforderliche Reduktion.

## Beispiel

```text
Hard-Limit                         30,0 kW
Soft-Limit                         27,0 kW
NVP / Einspeisung                 −10,1 kW
------------------------------------------------
Soft-Headroom                      37,1 kW
Hard-Headroom                      40,1 kW
```

Flexible Lasten planen gegen 37,1 kW. Der finale Hardware-Write darf bis zur absoluten Grenze von 40,1 kW freigegeben werden, sofern keine strengere Schutzvorgabe bindet.

## Dynamische 0-Einspeisung

Bei aktivierter 0-Einspeisung richtet EOS die PV-Vorgabe nach der aktuell lokal nutzbaren Leistung aus. Grundlage sind:

- reale lokale Verbraucher;
- bestätigte beziehungsweise glaubwürdig vorweggenommene Speicherladung;
- im selben EMS-Zyklus akzeptierte Ladepunkt- und flexible Laständerungen;
- der signierte, frische NVP als abschließende Führungsgröße.

Die Feed-forward-Berechnung lautet:

```text
PV-Soll = PV-Ist + projizierter NVP − NVP-Ziel
```

Das NVP-Ziel ist bei echter Nulleinspeisung üblicherweise ein kleiner positiver Sicherheitsbezug, beispielsweise +50 W. Bei erlaubter Einspeisung wird der entsprechende negative Zielwert verwendet.

### Priorität

```text
lokale Verbraucher
→ Speicher laden
→ Ladepunkte und freigegebene flexible Lasten
→ erst danach verbleibenden PV-Überschuss abregeln
```

Steigt die lokale Aufnahme, wird die PV-Begrenzung schnell und nur in der benötigten Höhe freigegeben. Sinkt die Aufnahme, wird die PV-Vorgabe kontrolliert reduziert. Dadurch vermeidet EOS sowohl unnötigen Netzbezug als auch erneute Einspeisespitzen durch eine pauschale 100-%-Freigabe.

## Schutz vor widersprüchlicher Regelung

EOS erkennt den Konflikt „PV ist abgeregelt, während der Speicher entlädt“. In diesem Fall wird die PV-Begrenzung unmittelbar aufgehoben. Dadurch wird keine PV-Energie verworfen, während der Speicher gleichzeitig dieselbe lokale Last versorgt.

## Mehrere Wechselrichter

Die Gesamtvorgabe wird proportional zur installierten Leistung auf die konfigurierten Wechselrichtergruppen verteilt. Wechselrichterspezifische Watt-, Prozent- und Einspeiselimit-Datenpunkte bleiben herstellerneutral nutzbar. Reicht die steuerbare PV-Leistung nicht aus, zeigt die Export-Guard-Diagnose den verbleibenden Regelbedarf und das Write-Ergebnis.

## Sicheres Verhalten bei fehlenden Messwerten

Ein fehlender oder veralteter NVP verhindert neue positive Lastfreigaben. Bei aktiver 0-Einspeisung verwendet der vorhandene fail-closed Pfad die konfigurierte sichere PV-Abregelung. Der Diagnosemodus berechnet alle Werte, schreibt aber keine Hardware-Sollwerte.

## AppCenter

Unter **Netzlimits** befinden sich jetzt gemeinsam:

- NVP-/Netzpunktzuordnung;
- Import-Hard-Limit;
- automatisch berechnetes Import-Soft-Limit (90 %) und feste Reserve (10 %), jeweils nur lesend;
- Hysterese und Wiederfreigabeverzögerung;
- RLM;
- 0-Einspeisung beziehungsweise Einspeisebegrenzung;
- Export-Guard-Diagnose.

EVU-Relaisstufen und allgemeine PV-Abregelungsgruppen bleiben getrennt im Bereich EVU/PV, damit eine Netzbetreiberstufe nicht mit der lokalen 0-Einspeiseregelung verwechselt wird.

## Cold-Start-Warnungen

Deaktivierte sicherheitsrelevante Aktormodule führen beim Adapterstart weiterhin einen bestätigten Safe-Stop aus. RC79 initialisiert davor einmalig deren Objektstruktur. Dadurch werden unter anderem folgende States vor dem ersten Write angelegt:

- `thermal.summary.appliedTotalW`
- `thermal.summary.budgetUsedW`
- `thermal.summary.status`
- `threshold.rules.r1.active`
- `threshold.rules.r1.effectiveEnabled`
- `threshold.rules.r1.output`
- `threshold.rules.r1.lastWriteOk`
- `threshold.rules.r1.readbackOk`
- `threshold.rules.r1.lastChange`
- `threshold.rules.r1.status`

Der bisher fehlende variable Threshold-Ausgang besitzt nun einen `mixed`-State. Damit schreibt der Safe-Stop nicht mehr auf nicht vorhandene Objekte.

## Diagnose-States

RC79 ergänzt insbesondere:

```text
gridConstraints.importLimits.*
gridConstraints.control.maxImportW_planning
gridConstraints.zeroExport.pvActualW
gridConstraints.zeroExport.localAbsorptionW
gridConstraints.zeroExport.pvFeedForwardTargetW
gridConstraints.zeroExport.pvFeedbackCorrectionW
gridConstraints.zeroExport.storageActualW
gridConstraints.zeroExport.storageTargetW
gridConstraints.zeroExport.storageDischargeConflict
gridConstraints.zeroExport.estimatedCurtailmentW
gridConstraints.zeroExport.pvSetpointReason
ems.core.gridImportLimitW_planning
ems.core.gridImportSoftLimitW
ems.core.gridImportHardLimitW
ems.core.gridImportStage
ems.core.gridImportRequiredReductionW
```

## Regressionsschutz

Der RC79-/RC80-Testverbund prüft die signed-NVP-Berechnung, die feste 10-%-Reserve ohne Mindest-/Maximalgrenze, Soft-/Hard-Stufen, Hysterese, verzögerte Wiederfreigabe, dynamische PV-Vorgabe, Speicherentladekonflikt, AppCenter-Platzierung, Cold-Start-Objektinitialisierung sowie die Trennung von Soft-Planung und Hard-Safety.
