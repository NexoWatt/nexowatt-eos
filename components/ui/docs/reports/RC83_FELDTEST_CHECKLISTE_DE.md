# RC83 Feldtest-Checkliste – Tarif-Speicher und Logbereinigung

## Installation

- [ ] Version `0.8.208` aus einem frisch entpackten Repository-ZIP installieren.
- [ ] NexoWatt-UI-Instanz vollständig neu starten.
- [ ] Browser mit `Strg + F5` neu laden.
- [ ] Nur Logeinträge mit Zeitstempel nach dem Neustart bewerten.

## Speicher bei dynamischem Tarif

- [ ] Tarif `günstig`, Preis frisch, variables Netzentgelt aus: Netzladen ist gemäß Konfiguration möglich.
- [ ] Tarif `neutral`: Netzladen wird sofort beendet; Speicher arbeitet eigenverbrauchsoptimiert.
- [ ] Tarif `teuer`: Netzladen wird sofort beendet; Speicher arbeitet eigenverbrauchsoptimiert.
- [ ] Tarif `unbekannt` oder Tarif deaktiviert: kein Netzladen.
- [ ] Preis-Datenpunkt veraltet/unterbrochen: kein Netzladen.
- [ ] Variables Netzentgelt aktiv, Tarif günstig, aber außerhalb NT-/Quartalsfenster: kein Netzladen.
- [ ] Variables Netzentgelt aktiv, Tarif günstig und NT-/Quartalsfenster aktiv: Netzladen ist gemäß Konfiguration möglich.
- [ ] PV-Überschuss lädt den Speicher weiterhin unabhängig vom wirtschaftlichen Netzladegate.
- [ ] Ein zuvor laufender negativer Tarif-/Reserve-Sollwert wird beim Wechsel auf neutral/teuer tatsächlich auf 0 W beendet und nicht durch einen Hold-Pfad weitergeführt.

## Physikalischer PV-only-Test

- [ ] Bei neutral/teuer und gleichzeitigem NVP-Netzbezug wird die Speicherladung so weit reduziert, bis nur noch der lokale PV-Überschuss genutzt wird.
- [ ] Feldfall `NVP +3,8 kW`, Batterie `−9,5 kW`, NVP-Ziel etwa `+0,1 kW`: neuer Lade-Sollwert liegt ungefähr bei `−5,8 kW` und nicht mehr bei `−9,5 kW`.
- [ ] Nach dem nächsten Regelzyklus fällt der durch die Speicherladung verursachte Netzbezug gegen den eingestellten Sicherheitsbezug.
- [ ] Bei echtem PV-Überschuss und verzögertem Batterie-Istwert bleibt eine durch direkte, frische PV-/Lastmessungen bestätigte Ladung aktiv.
- [ ] Bei fehlendem oder veraltetem NVP wird keine neue negative Ladeleistung freigegeben.
- [ ] PV-Abregelung und Speicherentladung laufen nicht gleichzeitig gegeneinander.

## Diagnose

- [ ] `tarif.speicherNetzLadenErlaubt` ist nur im vollständigen günstigen Freigabefall `true`.
- [ ] `speicher.regelung.netzLadenErlaubt` stimmt mit der finalen Freigabe überein.
- [ ] `speicher.regelung.netzLadenSperrgrund` nennt bei neutral/teuer/stale den tatsächlichen Sperrgrund.
- [ ] Dashboard zeigt bei neutralem Tarif keine Speicherladung aus dem Netz mehr.
- [ ] NVP, Batterie-Istwert und finaler Speicher-Sollwert besitzen die erwarteten Vorzeichen.

## Log

- [ ] Der State `gridConstraints.exportLimit.sinkFieldProtocolJson` existiert nach dem Neustart als String/JSON-State.
- [ ] Keine neuen Warnungen `sinkFieldProtocolJson has no existing object`.
- [ ] Keine wiederkehrenden `[core-limits-ts-shadow] ... total.effectiveW`-Warnungen.
