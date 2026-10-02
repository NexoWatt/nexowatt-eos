# NexoWatt EOS 1.0.18

Dies ist die offizielle Stable-Version 1.0.18 vom 24.09.2026.

## PV-Laden bei Nulleinspeisung

Der bisherige PV-Haltepfad konnte vom abschließenden PV-Guard auf 0 begrenzt
werden. Eine bereits laufende Ladung erhält jetzt bei einem kurzen Defizit eine
ausdrückliche, befristete Netzfreigabe. Sie gilt nur bei aktiver, freigegebener
lokaler Nulleinspeisung und im effektiven PV-Modus. Min+PV bleibt unverändert.

Unter **Netzlimits** lassen sich drei Werte einstellen:

| Einstellung | Standard | Bereich |
|---|---:|---:|
| Gemeinsame Netzüberbrückung aller PV-Ladepunkte | 600 W | 0–2.000 W |
| Maximale Überbrückungsdauer | 45 s | 0–120 s |
| Pause nach einem PV-Ladestopp | 180 s | 60–3.600 s |

Der vorhandene kleine Importbias bleibt separat. Die zusätzliche Netzüberbrückung
ist keine Solarleistung. Ihre Freigabe benötigt aktuelle PV-, NVP-, Batterie- und
Ladepunktmessungen sowie ein gültiges Schutzbudget. Sie hält nur das technisch
darstellbare Minimum einer bereits messbar laufenden Ladung. Batterieentladung
wird nicht als Überbrückungsquelle freigegeben. Das gesamte Haltebudget gilt
gemeinsam, nicht erneut für jeden Ladepunkt.

Beispiel: Einphasig benötigt der Ladepunkt 1.380 W, das PV-Budget fällt auf
1.200 W. Innerhalb der Grenzen können 180 W Netzleistung kurzfristig ergänzen.
Bleibt das Defizit bestehen, endet die Freigabe nach höchstens 45 s; die Ladung
pausiert. Sofort wiederkehrende Sonne hebt die 180-s-Wiederanlaufsperre nicht auf.
Nach Ablauf gelten die normalen Startbedingungen. Wiederholte Ticks verlängern
weder die Haltefrist noch die Pause. Kurze Erholungen setzen die Haltefrist erst
nach zehn Sekunden stabiler PV-Versorgung zurück.

0 W oder 0 s schaltet nur die Überbrückung aus; die Wiederanlaufsperre bleibt.
Große Defizite, fehlende Messungen oder Schutzgrenzen können früher stoppen.
Geplante Phasenwechsel folgen weiterhin ihrem Stop-/Schalt-/Einschwingablauf.
Die Zusatzfreigabe wird auch nach asynchronen Operationen unmittelbar vor dem
Schreibbefehl erneut geprüft. Diagnose: je LP `pvBridgePowerW` und
`pvRestartRemainingSec`, zentral `ems.zeroExportPv.evcsHoldW`.

## Boost-Obergrenze je Ladepunkt

Unter **Lademanagement → Ladepunkt → Erweitert / Boost** steht
**Maximale Boost-Leistung (W)**. Es ist eine feste Obergrenze für die gesamte
angeforderte Ladeleistung im Boost. PV oder Speicher heben sie nicht an; es ist
kein separater Netzanteil mit zusätzlicher PV-Aufstockung. So ist das genannte
3,7-kW-Beispiel konservativ begrenzt. Ein leerer Wert übernimmt das bisherige
Geräte-Maximum; eine ausdrückliche 0 sperrt Boost. Negative/ungültige gespeicherte
Werte werden sicher auf 0 begrenzt. Die Einstellung wird nur über die bereits
geschützte Installateur-/Admin-Konfiguration gepflegt.

- 3.700 W bei 230 V und 0,1-A-Schritten: einphasig maximal 16 A / 3.680 W.
- Dreiphasig erfordern übliche 6 A etwa 4.140 W. Mit 3.700 W bleibt dieser Betrieb
  gesperrt; es werden keine unzulässigen 5,36 A angefordert.
- Bei eingerichteter und freigegebener Phasenautomatik kann EOS für dieses Limit
  gezielt auf 1p wechseln. Stop vor Umschaltung, Sperrzeiten und Rückmeldungen
  bleiben wirksam. Fest konfigurierte Phasen werden nicht überschrieben.
- DC verwendet seine eigenen technischen Mindestwerte und Schritte, ohne
  AC-Phasenwechsel. Eine Grenze unter dem darstellbaren Minimum führt zu 0 W.
- Geräte-, Stations-, Netz-, Phasen- und §14a-Grenzen gelten zusätzlich.

Die Begrenzung wird von der gespeicherten LP-Konfiguration über die EMS-Engine
bis zur Allokation und abschließenden Hardware-Sicherheitsprüfung weitergegeben.
`boostMaxPowerW` je LP zeigt die wirksame Grenze. Bei Stromsteuerung beruhen
Watt-/Ampere-Umrechnung und Anzeige auf der hinterlegten Spannung; tatsächliche
Leistungsaufnahme und Aktorreaktionen sind bei der Inbetriebnahme zu messen.

## Prüfung und Quellen

`scripts/verify-stable-1.0.18-charging.cjs` prüft produktive Berechnungen, echte
Formularereignisse, Konfigurationsbrücke und simulierte Regelticks bis zum Writer:
Wolke, anhaltendes Defizit, sofortige Sonne, Gesamtbudget mehrerer Haltefreigaben,
Messausfall, Schutzsperre, geänderte Grenzen, AC/DC und Phasenwechsel.

Quellen: `src-ts/runtime-executables/ems/services/zero-export-pv-coordinator.ts`,
`ems/modules/charging-management.ts` unter demselben Quellbaum,
`src-ts/ems/charging-management/charging-allocation.ts` und
`charging-phase-selection.ts`, AppCenter, Adapter-Konfigurationsbrücke und EMS-Engine.
Deutsche Kommentare und typisierte Spiegel bleiben erhalten.

Automatisierte Tests ersetzen keine Prüfung der konkreten Wallbox-/Fahrzeug-/
Wechselrichterkombination. Software-Zeitgrenzen garantieren keine verzögerungsfreie
Hardware-Reaktion. Bei Kommunikationsverlust oder Schutzabschaltung hat die
sichere Leistungsrücknahme Vorrang. Die bestehende schnelle npm-Veröffentlichung
prüft fertig erzeugte Artefakte ohne automatischen Neubau beim Publish.
