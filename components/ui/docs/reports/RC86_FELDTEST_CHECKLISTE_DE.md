# RC86 Feldtest-Checkliste – NVP-Gate, Ladepunkt-Isolation und Stabilität

## Vorbedingungen

- Unter **AppCenter → Zuordnung → Allgemein** sind Netzanschlussleistung und signierter NVP-Datenpunkt korrekt zugeordnet.
- Vorzeichen kontrollieren: Netzbezug positiv, Netzeinspeisung negativ.
- Adapter nach dem Update vollständig neu starten und Browser mit `Strg + F5` aktualisieren.

## Gate A und NVP

- [ ] Bei 40 kW Netzanschlussleistung werden 40 kW Hard-Limit, 36 kW Soft-Schwelle und 4 kW Reserve angezeigt.
- [ ] Bei NVP −1,25 kW und 0 W EVCS-Istleistung liegt der Hard-Headroom ungefähr bei 41,25 kW.
- [ ] Bei 0 W Ladeanforderung steht Gate A auf **überwacht – kein Eingriff**, Binding = NEIN, Reduktion = 0 W.
- [ ] Zwischen 36 und 40 kW Netzbezug werden Erhöhungen weich gebremst; ein sofortiger Ladeabbruch erfolgt nicht.
- [ ] Bei 40 kW beziehungsweise darüber greift die Hard-Safety unmittelbar ein.
- [ ] Gate A, zentrales EMS-Budget und Energiefluss zeigen denselben signierten NVP beziehungsweise dieselbe kanonische Quelle.

## Ladepunkte

- [ ] Einen leeren Ladepunkt offline nehmen: Reserve bleibt 0 W, andere Ladepunkte bleiben freigegeben.
- [ ] Einen während aktiver Ladung laufenden Ladepunkt offline simulieren: letzte plausible Leistung wird reserviert.
- [ ] Der einzelne Ladepunkt erscheint gestört/offline, das gesamte EMS bleibt jedoch NORMAL beziehungsweise eingeschränkt statt global gestört.
- [ ] Strompreis-/Tarifwechsel erzeugt keinen kurzen 0-W-Zwischenbefehl.
- [ ] Bei mehreren Ladepunkten entsteht kein sekündliches Ein-/Ausschalten oder ständiges Tauschen der Freigabe.

## Stabilität

- [ ] „Letzter Regeltick“ bleibt aktuell.
- [ ] Ein nicht antwortender Ladepunkt blockiert den EMS-Regelzyklus nicht länger als das Watchdog-Zeitfenster.
- [ ] Keine neue Logflut durch wiederholte Watchdog-, Shadow- oder fehlende Objektwarnungen.
- [ ] Adapterprozess über mindestens einen vollständigen Tageszyklus beobachten; Heap/RAM darf nicht stetig wachsen.

## Speicher und Tarif

- [ ] Speicher lädt aus dem Netz nur bei frischem, gültigem Tarifstatus **günstig** und den weiteren konfigurierten Freigaben.
- [ ] Bei neutral, teuer, unbekannt oder veraltet wechselt der Speicher auf Eigenverbrauchsoptimierung; PV-Überschussladen bleibt möglich.
