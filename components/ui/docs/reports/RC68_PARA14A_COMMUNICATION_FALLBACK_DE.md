# RC68 – §14a-Kommunikationsfallback für Ladepunkte

## Ziel

Ein Ausfall oder ein veraltetes Signal der §14a-/CLS-/EEBUS-Verbindung darf eine
ordnungsgemäß konfigurierte Ladeanlage weder unbegrenzt freigeben noch pauschal
auf 0 W verriegeln. EOS wechselt deshalb in einen lokalen Mindestleistungs-
Fallback und führt die Ladepunkte weiterhin ausschließlich über den bestehenden
zentralen Single Writer.

## Zustandsmatrix

| Zustand | Verhalten |
|---|---|
| §14a deaktiviert | Keine §14a-Begrenzung |
| Signal frisch, inaktiv | Normale EOS-Regelung ohne §14a-Cap |
| Signal frisch, Dimmung aktiv | Gültigen Netzbetreiber-/EMS-Vertrag anwenden |
| Signal fehlt, ist ungültig oder veraltet | Lokaler Pmin,14a-Fallback |
| Separater EOS-Not-Aus / harter Safety-Stopp | 0 W |
| Netz-, Stations- oder Phasengrenze kleiner | Lokale Grenze ist immer vorrangig |

## Direktansteuerung

Im Direktmodus erhält jeder tatsächlich steuerbare Ladepunkt ein maximales
netzwirksames Fallback-Cap von 4.200 W. Das ist keine Mindestgarantie gegen die
physikalische Anlagenbegrenzung: Ist der verfügbare Netz- oder Phasen-Headroom
kleiner als die technische AC-Mindestleistung, setzt der bestehende Single
Writer den Ladepunkt sicher auf 0 W.

## EOS-/EMS-Ansteuerung

Im EMS-Modus berechnet EOS weiterhin das gemeinsame Pmin,14a-Budget einschließlich
Gleichzeitigkeitsfaktor. Bei zwei EVCS ergibt sich beispielsweise ein gemeinsames
Budget von 7.560 W. Jeder einzelne startbereite Ladepunkt darf innerhalb dieses
Gesamtbudgets bis zu 4.200 W erhalten. Nicht belegte Ladepunkte reservieren kein
starres 4,2-kW-Budget.

## Lokale PV-Leistung

Das §14a-Cap begrenzt den netzwirksamen Bezug. Physikalisch validierte lokale
PV-Leistung kann zusätzlich genutzt werden. Netzanschluss, Station, Phasen,
Gerätegrenzen und Safety bleiben weiterhin übergeordnet.

## Diagnose

Neu beziehungsweise verbindlich veröffentlicht werden:

- `para14a.communicationFallbackActive`
- `para14a.communicationFallbackReason`
- `para14a.fallbackEvcsCapW`
- `para14a.signalFresh`
- `para14a.signalStatus`
- `para14a.evcsTotalCapW`
- `para14a.totalCapW`

Der Safety-Envelope spiegelt den Kommunikationsfallback und dessen EVCS-Budget,
damit Lademanagement, Statusseite und Ereignislog denselben Regelgrund anzeigen.

## Migration

Die frühere Stale-Option `release` wird sicher auf `local-pmin` migriert. Eine
unterbrochene Kommunikation kann deshalb keine unbegrenzte Ladefreigabe mehr
auslösen. In der Oberfläche ist `Lokaler Pmin-Fallback` der Standard.

## Unveränderte Schutzebenen

- Netzanschlusslimit
- Stationslimit und Multi-Lademanagement
- Phasenlimit
- §14a-Frischsignal und gültiger Netzbetreibervertrag
- Parkregler-/Netzbetreiberbefehle
- Geräteschutz und Kommunikation
- Safety-Envelope
- zentraler Single Writer

## Stable-Freigabe

RC68 ist ein fokussierter Feldtestkandidat. Die Kennzeichnung `1.0.0 Stable`
erfolgt erst nach realen Tests mit Kommunikationsabbruch, Wiederverbindung,
mehreren Ladepunkten, §14a-Dimmung, Netz-/Stationsgrenzen und mindestens einem
mehrtägigen Dauerlauf ohne ungeklärten Regel- oder Tickfehler.
