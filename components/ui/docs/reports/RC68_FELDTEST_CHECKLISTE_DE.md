# RC68-Feldtest-Checkliste – §14a-Kommunikationsfallback

## Vorbereitung

- [ ] NexoWatt UI 0.8.193 aus einem frischen Projektordner installieren.
- [ ] Konfiguration und vorherige Adapterversion sichern.
- [ ] §14a-App und gewählte Ansteuerungsart dokumentieren: Direkt oder EOS/EMS.
- [ ] Netzanschluss-, Stations-, Phasen- und Gerätegrenzen kontrollieren.
- [ ] Diagnosewerte und Lademanagement-Ereignislog öffnen.

## Test 1 – Normalbetrieb

- [ ] §14a-Signal frisch und inaktiv.
- [ ] `communicationFallbackActive = false`.
- [ ] Ladepunkt arbeitet nach normalem Auto-/PV-/Tarifmodus.
- [ ] Kein künstliches 4,2-kW-Cap aktiv.

## Test 2 – Frische Dimmung

- [ ] Gültigen §14a-Dimmbefehl auslösen.
- [ ] Wirksames Gesamt- und Gerätebudget prüfen.
- [ ] Netz-, Stations- und Phasenlimits bleiben stärker.
- [ ] Nach Rücknahme des Dimmbefehls kehrt EOS ohne Neustart in den Normalbetrieb zurück.

## Test 3 – Kommunikationsabbruch

- [ ] §14a-/CLS-/EEBUS-Verbindung unterbrechen oder Signal gezielt veralten lassen.
- [ ] `communicationFallbackActive = true`.
- [ ] `communicationFallbackReason` ist verständlich gesetzt.
- [ ] Eine direkt angesteuerte, startbereite Wallbox erhält maximal 4.200 W, sofern lokaler Headroom ausreicht.
- [ ] Es erfolgt keine unbegrenzte Freigabe.
- [ ] Es erfolgt kein pauschaler 0-W-Stopp allein wegen des fehlenden §14a-Signals.

## Test 4 – Lokale Anlagengrenze

- [ ] Gebäude-/Netzlast so erhöhen, dass weniger als 4.200 W EVCS-Headroom verbleiben.
- [ ] EOS reduziert unter Berücksichtigung von Netzanschluss und Phasen.
- [ ] Liegt die mögliche AC-Leistung unter der technischen Mindeststufe, stoppt der Single Writer sicher mit 0 W.
- [ ] Kein Überschreiten von Hauptsicherung, Stations- oder Phasengrenze.

## Test 5 – Mehrere Ladepunkte / EMS

- [ ] Mindestens zwei steuerbare Ladepunkte anschließen.
- [ ] Gemeinsames Pmin-/GZF-Budget prüfen.
- [ ] Nicht startbereite oder nicht belegte Ladepunkte blockieren kein starres 4,2-kW-Budget.
- [ ] Tatsächlich startbereite Ladepunkte werden innerhalb des gemeinsamen Gesamtbudgets verteilt.
- [ ] Stations- und Netzanschlussgrenzen bleiben eingehalten.

## Test 6 – Lokale PV-Erzeugung

- [ ] Während des Kommunikationsfallbacks reale PV-Leistung bereitstellen.
- [ ] Netzwirksamer §14a-Anteil bleibt begrenzt.
- [ ] Validierte lokale PV-Leistung kann zusätzlich genutzt werden.
- [ ] Keine doppelte PV-Anrechnung und kein Netzlimitverstoß.

## Test 7 – Wiederverbindung

- [ ] §14a-/EEBUS-Verbindung wiederherstellen.
- [ ] Frisches Signal wird erkannt.
- [ ] Fallback endet automatisch.
- [ ] Der aktuelle Netzbetreibervertrag wird ohne alten hängenden Sollwert übernommen.
- [ ] Ereignislog zeigt Wechsel und Grund nachvollziehbar.

## Stable-Kriterien

- [ ] 0 ungeklärte Tick- oder ReferenceErrors.
- [ ] 0 unbegrenzte Freigaben bei Kommunikationsverlust.
- [ ] 0 unnötige Vollsperren allein wegen §14a-Kommunikationsverlust.
- [ ] 0 Überschreitungen von Netz-, Stations- oder Phasenlimits.
- [ ] 0 hängende Lade-Sollwerte nach Wiederverbindung.
- [ ] Mehrtägiger Dauerbetrieb einschließlich mindestens eines Abbruch-/Reconnect-Tests bestanden.
