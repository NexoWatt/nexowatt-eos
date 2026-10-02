# RC82 Feldtest-Checkliste – dauerhafter Netzschutz

## Installation

- [ ] Version `0.8.207` aus einem frisch entpackten Repository-ZIP installieren.
- [ ] Adapterinstanz vollständig neu starten.
- [ ] Browser mit `Strg + F5` neu laden.
- [ ] Unter **Zuordnung → Allgemein** Netzanschlussleistung und signierten NVP-Datenpunkt prüfen.

## AppCenter und Persistenz

- [ ] Unter **Apps** zeigt Netzlimits keine Installiert-/Aktiv-Schalter mehr.
- [ ] Status „Netzschutz dauerhaft aktiv“ ist sichtbar.
- [ ] Unter **Netzlimits** erscheint „Netzschutz dauerhaft aktiv · nicht abschaltbar“.
- [ ] Nach Speichern, Adapterneustart und Browserneuladen bleibt Netzlimits aktiv.
- [ ] Ein altes Backup mit `enableGridConstraints=false` kann Netzlimits nicht deaktivieren.
- [ ] Netzlimits bleibt auch ohne gültige beziehungsweise während einer vorübergehend nicht lesbaren Lizenz aktiv.

## Grenzwerte

- [ ] Bei 30.000 W Netzanschlussleistung werden 30.000 W Hard, 27.000 W Soft und 3.000 W Reserve angezeigt.
- [ ] NVP-Bezug wird positiv, Einspeisung negativ angezeigt.
- [ ] Einspeisung erhöht den Headroom; Netzbezug reduziert ihn.
- [ ] Ab Soft-Limit werden Laststeigerungen sanft begrenzt.
- [ ] Am/über Hard-Limit greift die finale Safety-Regelung.
- [ ] RLM kann das Hard-Limit nur absenken.

## 0-Einspeisung

- [ ] 0-Einspeisung ist nach Upgrade nicht automatisch aktiviert.
- [ ] Bei deaktivierter 0-Einspeisung erfolgt keine PV-Abregelung allein durch diese Funktion.
- [ ] Bei aktivierter 0-Einspeisung nutzt EOS zuerst Verbraucher und zulässige Speicherladung und regelt erst den verbleibenden PV-Überschuss ab.
- [ ] PV-Abregelung und Speicherentladung laufen nicht gleichzeitig gegeneinander.

## Fehlerfälle und Logs

- [ ] Bei veraltetem NVP werden keine neuen positiven Laststeigerungen freigegeben.
- [ ] Nach Rückkehr eines frischen NVP erfolgt die Wiederfreigabe kontrolliert.
- [ ] Keine neuen Warnungen zu fehlenden `thermal.summary.*`- oder `threshold.rules.*`-Objekten.
- [ ] Keine wiederkehrenden `[core-limits-ts-shadow] ... total.effectiveW`-Warnungen.
- [ ] Der interne Shadow-Zustand bleibt über `ems.budget.tsShadowJson` diagnostizierbar.
